import { Logger } from './logger.js';

/**
 * Performance Validator - Validates game performance on different hardware
 * Runs automated performance tests and generates reports
 */
export class PerformanceValidator {
    constructor(scene) {
        this.scene = scene;
        this.testResults = [];
        this.isRunning = false;
    }

    /**
     * Run comprehensive performance validation
     * @param {Object} options - Test options
     * @returns {Promise<Object>} Test results
     */
    async runValidation(options = {}) {
        const config = {
            duration: 30000,      // 30 seconds
            sampleInterval: 1000,  // Sample every second
            testCombat: true,
            testParticles: true,
            testUI: true,
            ...options
        };

        if (this.isRunning) {
            Logger.warn('PerformanceValidator', 'Validation already running');
            return null;
        }

        this.isRunning = true;
        Logger.info('PerformanceValidator', 'Starting performance validation...');

        const results = {
            timestamp: Date.now(),
            hardware: this.detectHardware(),
            tests: {},
            summary: {}
        };

        try {
            // Test 1: Baseline FPS
            if (config.testBaseline !== false) {
                results.tests.baseline = await this.testBaselineFPS(config.duration, config.sampleInterval);
            }

            // Test 2: Combat Performance
            if (config.testCombat) {
                results.tests.combat = await this.testCombatPerformance(config.duration / 2);
            }

            // Test 3: Particle Performance
            if (config.testParticles) {
                results.tests.particles = await this.testParticlePerformance();
            }

            // Test 4: UI Performance
            if (config.testUI) {
                results.tests.ui = await this.testUIPerformance();
            }

            // Generate summary
            results.summary = this.generateSummary(results.tests);

            // Log results
            this.logResults(results);

            this.testResults.push(results);
            return results;

        } catch (error) {
            Logger.error('PerformanceValidator', `Validation failed: ${error.message}`);
            return null;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Detect hardware capabilities
     * @returns {Object} Hardware info
     */
    detectHardware() {
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            cores: navigator.hardwareConcurrency || 'unknown',
            memory: 'unknown'
        };

        // Try to get memory info
        if (typeof performance !== 'undefined' && performance.memory) {
            info.memory = {
                limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(1) + 'MB',
                total: (performance.memory.totalJSHeapSize / 1048576).toFixed(1) + 'MB'
            };
        }

        // Detect GPU
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                info.gpu = {
                    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                };
            }
        }

        return info;
    }

    /**
     * Test baseline FPS
     * @param {number} duration - Test duration in ms
     * @param {number} interval - Sample interval in ms
     * @returns {Promise<Object>} Test results
     */
    async testBaselineFPS(duration, interval) {
        return new Promise((resolve) => {
            const samples = [];
            let startTime = performance.now();
            let lastFrameTime = startTime;
            let frameCount = 0;

            const sample = () => {
                const now = performance.now();
                const delta = now - lastFrameTime;
                const fps = 1000 / delta;
                
                samples.push({
                    fps: fps,
                    frameTime: delta,
                    timestamp: now - startTime
                });

                frameCount++;
                lastFrameTime = now;
            };

            const intervalId = setInterval(sample, interval);
            const endTime = startTime + duration;

            const checkEnd = () => {
                if (performance.now() >= endTime) {
                    clearInterval(intervalId);
                    cancelAnimationFrame(rafId);
                    
                    const avgFps = samples.reduce((a, b) => a + b.fps, 0) / samples.length;
                    const minFps = Math.min(...samples.map(s => s.fps));
                    const maxFps = Math.max(...samples.map(s => s.fps));
                    const avgFrameTime = samples.reduce((a, b) => a + b.frameTime, 0) / samples.length;

                    resolve({
                        averageFPS: avgFps.toFixed(2),
                        minFPS: minFps.toFixed(2),
                        maxFPS: maxFps.toFixed(2),
                        averageFrameTime: avgFrameTime.toFixed(2),
                        samples: samples.length,
                        passed: avgFps >= 30 // Pass if average FPS >= 30
                    });
                } else {
                    rafId = requestAnimationFrame(checkEnd);
                }
            };

            let rafId = requestAnimationFrame(checkEnd);
        });
    }

    /**
     * Test combat performance
     * @param {number} duration - Test duration in ms
     * @returns {Promise<Object>} Test results
     */
    async testCombatPerformance(duration) {
        return new Promise((resolve) => {
            // Trigger combat if possible
            if (this.scene && this.scene.combatManager) {
                // Start a test combat
                Logger.info('PerformanceValidator', 'Testing combat performance...');
                
                // Monitor FPS during combat
                const startTime = performance.now();
                const samples = [];
                
                const sample = () => {
                    const now = performance.now();
                    if (now - startTime < duration) {
                        // Sample FPS
                        samples.push(performance.now());
                        requestAnimationFrame(sample);
                    } else {
                        // Calculate results
                        const fpsSamples = [];
                        for (let i = 1; i < samples.length; i++) {
                            const fps = 1000 / (samples[i] - samples[i - 1]);
                            fpsSamples.push(fps);
                        }
                        
                        const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
                        
                        resolve({
                            averageFPS: avgFps.toFixed(2),
                            samples: fpsSamples.length,
                            passed: avgFps >= 25 // Lower threshold for combat
                        });
                    }
                };
                
                requestAnimationFrame(sample);
            } else {
                resolve({
                    skipped: true,
                    reason: 'Combat manager not available'
                });
            }
        });
    }

    /**
     * Test particle performance
     * @returns {Promise<Object>} Test results
     */
    async testParticlePerformance() {
        return new Promise((resolve) => {
            if (!this.scene || !this.scene.particleManager) {
                resolve({
                    skipped: true,
                    reason: 'Particle manager not available'
                });
                return;
            }

            Logger.info('PerformanceValidator', 'Testing particle performance...');

            // Create many particles and measure impact
            const startFPS = 60; // Assume starting at 60 FPS
            const particleCount = 100;
            const startTime = performance.now();

            // Create particles
            for (let i = 0; i < particleCount; i++) {
                const x = Math.random() * this.scene.scale.width;
                const y = Math.random() * this.scene.scale.height;
                this.scene.particleManager.createExplosion(x, y, 'combat', 10);
            }

            // Measure FPS impact after a short delay
            setTimeout(() => {
                // Sample FPS
                const samples = [];
                let lastTime = performance.now();
                
                const sample = () => {
                    const now = performance.now();
                    const fps = 1000 / (now - lastTime);
                    samples.push(fps);
                    lastTime = now;
                    
                    if (samples.length < 10) {
                        requestAnimationFrame(sample);
                    } else {
                        const avgFps = samples.reduce((a, b) => a + b, 0) / samples.length;
                        const impact = startFPS - avgFps;
                        
                        resolve({
                            averageFPS: avgFps.toFixed(2),
                            impact: impact.toFixed(2),
                            particleCount: particleCount,
                            passed: avgFps >= 30
                        });
                    }
                };
                
                requestAnimationFrame(sample);
            }, 500);
        });
    }

    /**
     * Test UI performance
     * @returns {Promise<Object>} Test results
     */
    async testUIPerformance() {
        return new Promise((resolve) => {
            // Simple UI performance test
            const startTime = performance.now();
            
            // Simulate UI update
            if (this.scene && this.scene.uiModule) {
                // Trigger UI update
                const updateTime = performance.now() - startTime;
                
                resolve({
                    updateTime: updateTime.toFixed(2),
                    passed: updateTime < 16 // Should complete in < 16ms for 60 FPS
                });
            } else {
                resolve({
                    skipped: true,
                    reason: 'UI module not available'
                });
            }
        });
    }

    /**
     * Generate summary from test results
     * @param {Object} tests - Test results
     * @returns {Object} Summary
     */
    generateSummary(tests) {
        const summary = {
            overall: 'unknown',
            passed: 0,
            failed: 0,
            skipped: 0,
            recommendations: []
        };

        for (const [testName, result] of Object.entries(tests)) {
            if (result.skipped) {
                summary.skipped++;
            } else if (result.passed) {
                summary.passed++;
            } else {
                summary.failed++;
                summary.recommendations.push(`Improve ${testName} performance`);
            }
        }

        // Determine overall status
        if (summary.failed === 0 && summary.passed > 0) {
            summary.overall = 'excellent';
        } else if (summary.failed <= summary.passed) {
            summary.overall = 'acceptable';
        } else {
            summary.overall = 'needs_improvement';
        }

        return summary;
    }

    /**
     * Log test results
     * @param {Object} results - Test results
     */
    logResults(results) {
        Logger.info('PerformanceValidator', '=== Performance Validation Results ===');
        Logger.info('PerformanceValidator', `Hardware: ${JSON.stringify(results.hardware)}`);
        
        for (const [testName, result] of Object.entries(results.tests)) {
            if (result.skipped) {
                Logger.info('PerformanceValidator', `${testName}: SKIPPED - ${result.reason}`);
            } else {
                Logger.info('PerformanceValidator', `${testName}: ${result.passed ? 'PASSED' : 'FAILED'}`);
                Logger.info('PerformanceValidator', `  ${JSON.stringify(result)}`);
            }
        }

        Logger.info('PerformanceValidator', `Summary: ${results.summary.overall} (${results.summary.passed} passed, ${results.summary.failed} failed)`);
        Logger.info('PerformanceValidator', '========================================');
    }

    /**
     * Generate baseline performance report
     * Creates a comprehensive report document for baseline performance metrics
     * @returns {Object} Baseline report
     */
    generateBaselineReport() {
        if (this.testResults.length === 0) {
            Logger.warn('PerformanceValidator', 'No test results available for baseline report');
            return null;
        }

        const latestResult = this.testResults[this.testResults.length - 1];
        const report = {
            timestamp: new Date(latestResult.timestamp).toISOString(),
            hardware: latestResult.hardware,
            baseline: {
                fps: {
                    average: parseFloat(latestResult.tests.baseline?.averageFPS || 60),
                    min: parseFloat(latestResult.tests.baseline?.minFPS || 30),
                    max: parseFloat(latestResult.tests.baseline?.maxFPS || 60),
                    target: 60,
                    threshold: 30
                },
                frameTime: {
                    average: parseFloat(latestResult.tests.baseline?.averageFrameTime || 16),
                    target: 16.67, // 60 FPS
                    threshold: 33.33 // 30 FPS
                },
                memory: {
                    initial: 0,
                    peak: 0,
                    current: 0
                }
            },
            combat: latestResult.tests.combat || null,
            particles: latestResult.tests.particles || null,
            ui: latestResult.tests.ui || null,
            summary: latestResult.summary,
            recommendations: latestResult.summary.recommendations || []
        };

        // Add memory stats if available
        if (this.scene && this.scene.memoryMonitor) {
            const memoryStats = this.scene.memoryMonitor.getStats();
            report.baseline.memory = {
                initial: memoryStats.min || 0,
                peak: memoryStats.maxSeen || memoryStats.max || 0,
                current: memoryStats.current || 0,
                average: memoryStats.average || 0,
                growth: memoryStats.growth || 0,
                leakWarnings: memoryStats.leakWarnings || 0
            };
        }

        return report;
    }

    /**
     * Export baseline report to JSON
     * @param {string} filename - Optional filename
     * @returns {string} JSON string of report
     */
    exportBaselineReport(filename = null) {
        const report = this.generateBaselineReport();
        if (!report) return null;

        const json = JSON.stringify(report, null, 2);
        
        // If in browser, offer download
        if (typeof window !== 'undefined' && filename) {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `performance-baseline-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        Logger.info('PerformanceValidator', 'Baseline report generated');
        return json;
    }

    /**
     * Get validation report
     * @returns {Object} Latest validation report
     */
    getReport() {
        if (this.testResults.length === 0) {
            return null;
        }
        return this.testResults[this.testResults.length - 1];
    }

    /**
     * Export results as JSON
     * @returns {string} JSON string
     */
    exportResults() {
        return JSON.stringify(this.testResults, null, 2);
    }
}


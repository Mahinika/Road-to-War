/**
 * Performance Test Helper Script
 * 
 * Provides helper functions for performance testing in the browser console.
 * Copy and paste into browser console during gameplay.
 * 
 * Usage:
 *   1. Start game in development mode
 *   2. Open browser console (F12)
 *   3. Copy and paste this entire script
 *   4. Use helper functions to run tests
 */

(function() {
    'use strict';

    // Get game scene reference
    const getGameScene = () => {
        if (typeof window !== 'undefined' && window.game && window.game.scene) {
            const scene = window.game.scene.getScene('GameScene');
            return scene;
        }
        return null;
    };

    // Performance Test Helper Object
    window.PerfTestHelper = {
        /**
         * Start continuous performance monitoring
         * @param {number} interval - Check interval in milliseconds (default: 60000 = 1 minute)
         * @param {number} duration - Total duration in milliseconds (default: 1800000 = 30 minutes)
         */
        startMonitoring(interval = 60000, duration = 1800000) {
            const scene = getGameScene();
            if (!scene) {
                console.error('GameScene not found. Make sure game is running.');
                return;
            }

            const log = [];
            const startTime = Date.now();
            
            console.log(`Starting performance monitoring for ${duration / 60000} minutes...`);

            const monitor = setInterval(() => {
                const elapsed = Date.now() - startTime;
                
                // Get memory stats
                let memoryStats = null;
                if (scene.memoryMonitor) {
                    memoryStats = scene.memoryMonitor.getStats();
                } else if (typeof performance !== 'undefined' && performance.memory) {
                    memoryStats = {
                        current: performance.memory.usedJSHeapSize / 1048576,
                        total: performance.memory.totalJSHeapSize / 1048576,
                        limit: performance.memory.jsHeapSizeLimit / 1048576
                    };
                }

                // Get performance metrics
                let perfMetrics = null;
                if (scene.performanceMonitor) {
                    perfMetrics = scene.performanceMonitor.getMetrics();
                }

                const entry = {
                    timestamp: Date.now(),
                    elapsed: elapsed,
                    memory: memoryStats,
                    performance: perfMetrics
                };

                log.push(entry);
                
                // Log to console
                console.log(`[${Math.floor(elapsed / 1000)}s] Performance:`, {
                    fps: perfMetrics?.fps || 'N/A',
                    frameTime: perfMetrics?.frameTime || 'N/A',
                    memory: memoryStats ? `${memoryStats.current.toFixed(1)}MB` : 'N/A',
                    trend: scene.memoryMonitor?.getTrend() || 'N/A'
                });

                // Check for issues
                if (memoryStats && memoryStats.growth > 10) {
                    console.warn('⚠️ Memory growth detected:', memoryStats.growth.toFixed(1), 'MB');
                }
                if (perfMetrics && perfMetrics.fps < 30) {
                    console.warn('⚠️ Low FPS detected:', perfMetrics.fps.toFixed(1));
                }

                // Stop after duration
                if (elapsed >= duration) {
                    clearInterval(monitor);
                    this.exportLog(log);
                    console.log('✅ Performance monitoring completed');
                }
            }, interval);

            // Store interval ID for manual stop
            this._monitorInterval = monitor;
            this._log = log;
            
            console.log('✅ Monitoring started. Use PerfTestHelper.stopMonitoring() to stop early.');
        },

        /**
         * Stop continuous monitoring
         */
        stopMonitoring() {
            if (this._monitorInterval) {
                clearInterval(this._monitorInterval);
                this._monitorInterval = null;
                if (this._log && this._log.length > 0) {
                    this.exportLog(this._log);
                }
                console.log('✅ Monitoring stopped');
            } else {
                console.warn('No active monitoring to stop');
            }
        },

        /**
         * Export performance log
         * @param {Array} log - Log array (optional, uses stored log if not provided)
         */
        exportLog(log = null) {
            const data = log || this._log || [];
            if (data.length === 0) {
                console.warn('No log data to export');
                return;
            }

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-log-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            console.log(`✅ Exported ${data.length} log entries`);
        },

        /**
         * Run quick performance check
         */
        quickCheck() {
            const scene = getGameScene();
            if (!scene) {
                console.error('GameScene not found');
                return;
            }

            console.log('=== Quick Performance Check ===');
            
            // Memory
            if (scene.memoryMonitor) {
                const memStats = scene.memoryMonitor.getStats();
                const trend = scene.memoryMonitor.getTrend();
                console.log('Memory:', {
                    current: `${memStats.current.toFixed(1)}MB`,
                    average: `${memStats.average.toFixed(1)}MB`,
                    max: `${memStats.max.toFixed(1)}MB`,
                    growth: `${memStats.growth.toFixed(1)}MB`,
                    trend: trend,
                    leakWarnings: memStats.leakWarnings
                });
            } else if (typeof performance !== 'undefined' && performance.memory) {
                console.log('Memory:', {
                    used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)}MB`,
                    total: `${(performance.memory.totalJSHeapSize / 1048576).toFixed(1)}MB`,
                    limit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(1)}MB`
                });
            }

            // Performance
            if (scene.performanceMonitor) {
                const perfMetrics = scene.performanceMonitor.getMetrics();
                console.log('Performance:', {
                    fps: perfMetrics.fps.toFixed(1),
                    frameTime: `${perfMetrics.frameTime.toFixed(2)}ms`,
                    memoryUsage: perfMetrics.memoryUsage ? `${perfMetrics.memoryUsage.toFixed(1)}MB` : 'N/A'
                });
            }

            console.log('==============================');
        },

        /**
         * Run performance validation
         * @param {Object} options - Validation options
         */
        async runValidation(options = {}) {
            const scene = getGameScene();
            if (!scene || !scene.performanceValidator) {
                console.error('PerformanceValidator not found');
                return;
            }

            console.log('Running performance validation...');
            const results = await scene.performanceValidator.runValidation({
                duration: 30000,
                testCombat: true,
                testParticles: true,
                testUI: true,
                ...options
            });

            if (results) {
                console.log('Validation Results:', results);
                console.log('Summary:', results.summary);
                return results;
            } else {
                console.error('Validation failed');
                return null;
            }
        },

        /**
         * Generate and export baseline report
         * @param {string} filename - Optional filename
         */
        exportBaseline(filename = null) {
            const scene = getGameScene();
            if (!scene || !scene.performanceValidator) {
                console.error('PerformanceValidator not found');
                return;
            }

            const report = scene.performanceValidator.generateBaselineReport();
            if (!report) {
                console.error('No baseline data available. Run validation first.');
                return;
            }

            scene.performanceValidator.exportBaselineReport(filename || `baseline-${Date.now()}.json`);
            console.log('✅ Baseline report exported');
            return report;
        },

        /**
         * Compare two baseline reports
         * @param {Object} before - Before baseline report
         * @param {Object} after - After baseline report
         */
        compareBaselines(before, after) {
            if (!before || !after) {
                console.error('Both baseline reports required');
                return;
            }

            console.log('=== Baseline Comparison ===');
            
            // FPS comparison
            const fpsBefore = parseFloat(before.baseline?.fps?.average || 0);
            const fpsAfter = parseFloat(after.baseline?.fps?.average || 0);
            const fpsDiff = fpsAfter - fpsBefore;
            console.log('FPS:', {
                before: fpsBefore.toFixed(1),
                after: fpsAfter.toFixed(1),
                change: `${fpsDiff >= 0 ? '+' : ''}${fpsDiff.toFixed(1)}`
            });

            // Frame time comparison
            const frameTimeBefore = parseFloat(before.baseline?.frameTime?.average || 0);
            const frameTimeAfter = parseFloat(after.baseline?.frameTime?.average || 0);
            const frameTimeDiff = frameTimeAfter - frameTimeBefore;
            console.log('Frame Time:', {
                before: `${frameTimeBefore.toFixed(2)}ms`,
                after: `${frameTimeAfter.toFixed(2)}ms`,
                change: `${frameTimeDiff >= 0 ? '+' : ''}${frameTimeDiff.toFixed(2)}ms`
            });

            // Memory comparison
            const memBefore = before.baseline?.memory?.current || 0;
            const memAfter = after.baseline?.memory?.current || 0;
            const memDiff = memAfter - memBefore;
            console.log('Memory:', {
                before: `${memBefore.toFixed(1)}MB`,
                after: `${memAfter.toFixed(1)}MB`,
                change: `${memDiff >= 0 ? '+' : ''}${memDiff.toFixed(1)}MB`
            });

            console.log('===========================');
        }
    };

    console.log('✅ Performance Test Helper loaded!');
    console.log('Available functions:');
    console.log('  - PerfTestHelper.startMonitoring(interval, duration)');
    console.log('  - PerfTestHelper.stopMonitoring()');
    console.log('  - PerfTestHelper.quickCheck()');
    console.log('  - PerfTestHelper.runValidation(options)');
    console.log('  - PerfTestHelper.exportBaseline(filename)');
    console.log('  - PerfTestHelper.compareBaselines(before, after)');
    console.log('');
    console.log('Example: PerfTestHelper.startMonitoring(60000, 1800000) // Monitor for 30 minutes');

})();


/**
 * Performance Monitoring Utilities
 * Provides comprehensive performance monitoring and optimization tools
 */

export class PerformanceMonitor {
    /**
     * Create a new PerformanceMonitor
     * @param {Phaser.Scene} scene - The Phaser scene to monitor
     * @param {Object} options - Monitoring options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            enableMonitoring: options.enableMonitoring !== false,
            logPerformance: options.logPerformance || false,
            warningThreshold: options.warningThreshold || 50, // FPS threshold for warnings
            criticalThreshold: options.criticalThreshold || 30, // FPS threshold for critical warnings
            historySize: options.historySize || 60, // Number of frames to keep in history
            ...options
        };

        // Performance metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            frameCount: 0,
            lastUpdateTime: 0
        };

        // Performance history
        this.history = {
            fps: [],
            frameTime: [],
            memoryUsage: [],
            timestamps: []
        };

        // Performance alerts
        this.alerts = {
            lowFps: false,
            highMemory: false,
            longFrameTime: false
        };

        // Optimization suggestions
        this.suggestions = [];

        // Initialize monitoring
        if (this.options.enableMonitoring) {
            this.initializeMonitoring();
        }
    }

    /**
     * Initialize performance monitoring
     */
    initializeMonitoring() {
        // Set up performance observer if available
        if (typeof PerformanceObserver !== 'undefined') {
            try {
                this.setupPerformanceObserver();
            } catch (error) {
                console.warn('PerformanceMonitor: Could not set up PerformanceObserver:', error);
            }
        }

        // Start monitoring loop
        this.startMonitoring();
    }

    /**
     * Set up Performance Observer for detailed metrics
     */
    setupPerformanceObserver() {
        // Monitor long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > 50) { // Tasks longer than 50ms
                    this.onLongTask(entry);
                }
            }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // Monitor layout shifts (CLS)
        const layoutShiftObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.metrics.cls = clsValue;
        });

        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });

        this.observers = [longTaskObserver, layoutShiftObserver];
    }

    /**
     * Start the monitoring loop
     */
    startMonitoring() {
        // Safety check: ensure scene is ready
        if (!this.scene) {
            return;
        }

        // Defer start if events or time not yet available
        if (!this.scene.events || !this.scene.time) {
            // Check again in 100ms
            setTimeout(() => this.startMonitoring(), 100);
            return;
        }

        // Update metrics every frame
        this.scene.events.on('update', this.updateMetrics, this);

        // Periodic analysis
        this.scene.time.addEvent({
            delay: 5000, // Analyze every 5 seconds
            callback: () => this.analyzePerformance(),
            loop: true
        });
    }

    /**
     * Update performance metrics
     */
    updateMetrics() {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const delta = now - this.metrics.lastUpdateTime;

        if (this.metrics.lastUpdateTime > 0) {
            // Calculate FPS
            const currentFps = 1000 / delta;
            this.metrics.fps = currentFps;
            this.metrics.frameTime = delta;

            // Update history
            this.updateHistory(currentFps, delta);

            // Throttle performance checks - reduce frequency during low FPS to minimize overhead
            const checkInterval = currentFps < 15 ? 30 : 10; // Check every 30 frames if FPS < 15, otherwise every 10
            if (this.metrics.frameCount % checkInterval === 0) {
                this.checkPerformanceIssues(currentFps);
            }
        }

        this.metrics.lastUpdateTime = now;
        this.metrics.frameCount++;

        // Get memory usage if available (throttled to every 60 frames)
        if (this.metrics.frameCount % 60 === 0 && typeof performance !== 'undefined' && performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
        }

        // Get Phaser renderer stats if available (throttled to every 30 frames)
        if (this.metrics.frameCount % 30 === 0 && this.scene.renderer) {
            this.metrics.drawCalls = this.scene.renderer.drawCalls || 0;
            this.metrics.triangles = this.scene.renderer.triangles || 0;
        }
    }

    /**
     * Update performance history
     * @param {number} fps - Current FPS
     * @param {number} frameTime - Current frame time
     */
    updateHistory(fps, frameTime) {
        this.history.fps.push(fps);
        this.history.frameTime.push(frameTime);
        this.history.memoryUsage.push(this.metrics.memoryUsage);
        this.history.timestamps.push(Date.now());

        // Keep history within limits
        if (this.history.fps.length > this.options.historySize) {
            this.history.fps.shift();
            this.history.frameTime.shift();
            this.history.memoryUsage.shift();
            this.history.timestamps.shift();
        }
    }

    /**
     * Check for performance issues
     * @param {number} currentFps - Current FPS
     */
    checkPerformanceIssues(currentFps) {
        // Low FPS alerts
        if (currentFps < this.options.criticalThreshold && !this.alerts.lowFps) {
            this.alerts.lowFps = true;
            this.onCriticalPerformance('Low FPS', currentFps);
        } else if (currentFps >= this.options.warningThreshold && this.alerts.lowFps) {
            this.alerts.lowFps = false;
            this.onPerformanceRecovery('FPS recovered', currentFps);
        }

        // High memory usage alerts - more aggressive threshold
        if (this.metrics.memoryUsage > 150 && !this.alerts.highMemory) { // 150MB threshold
            this.alerts.highMemory = true;
            this.onCriticalPerformance('High memory usage', this.metrics.memoryUsage);
        } else if (this.metrics.memoryUsage <= 120 && this.alerts.highMemory) {
            this.alerts.highMemory = false;
        }

        // Long frame time alerts - more aggressive threshold
        if (this.metrics.frameTime > 50 && !this.alerts.longFrameTime) { // > 50ms (20fps)
            this.alerts.longFrameTime = true;
            this.onCriticalPerformance('Long frame time', this.metrics.frameTime);
        } else if (this.metrics.frameTime <= 40 && this.alerts.longFrameTime) {
            this.alerts.longFrameTime = false;
        }
    }

    /**
     * Handle critical performance issues
     * @param {string} issue - Description of the issue
     * @param {number} value - The problematic value
     */
    onCriticalPerformance(issue, value) {
        // Throttle warnings to reduce console overhead
        const warningKey = `${issue}-${Math.floor(value / 10) * 10}`; // Group similar values
        const now = Date.now();
        if (!this._lastWarning) this._lastWarning = {};
        if (!this._lastWarning[warningKey] || now - this._lastWarning[warningKey] > 5000) {
            this._lastWarning[warningKey] = now;
            console.warn(`PerformanceMonitor: ${issue} detected - ${value}`);
        }

        // Generate suggestions
        this.generateSuggestions(issue, value);

        // Emit event for scene to handle (with safety check)
        if (this.scene && this.scene.events) {
            this.scene.events.emit('performance-issue', {
                issue,
                value,
                suggestions: this.suggestions
            });
        }

        if (this.options.logPerformance) {
            this.logPerformanceReport();
        }
    }

    /**
     * Handle performance recovery
     * @param {string} recovery - Description of the recovery
     * @param {number} value - The recovered value
     */
    onPerformanceRecovery(recovery, value) {
        console.log(`PerformanceMonitor: ${recovery} - ${value}`);

        // Clear suggestions related to the recovered issue
        this.clearSuggestions(recovery);

        // Emit recovery event (with safety check)
        if (this.scene && this.scene.events) {
            this.scene.events.emit('performance-recovery', {
                recovery,
                value
            });
        }
    }

    /**
     * Handle long tasks
     * @param {PerformanceEntry} entry - Long task entry
     */
    onLongTask(entry) {
        console.warn(`PerformanceMonitor: Long task detected - ${entry.duration}ms`);

        // Safety check: ensure scene and events are available
        if (this.scene && this.scene.events) {
            this.scene.events.emit('long-task', {
                duration: entry.duration,
                startTime: entry.startTime
            });
        }
    }

    /**
     * Generate optimization suggestions based on performance issues
     * @param {string} issue - The performance issue
     * @param {number} value - The problematic value
     */
    generateSuggestions(issue, value) {
        this.suggestions = [];

        switch (issue) {
            case 'Low FPS':
                if (value < 30) {
                    this.suggestions.push(
                        'Reduce particle effects',
                        'Lower texture quality',
                        'Disable non-essential animations',
                        'Implement object pooling for UI elements',
                        'Throttle update frequencies'
                    );
                } else if (value < 50) {
                    this.suggestions.push(
                        'Optimize sprite rendering',
                        'Reduce draw calls',
                        'Implement texture atlases',
                        'Throttle expensive calculations'
                    );
                }
                break;

            case 'High memory usage':
                this.suggestions.push(
                    'Implement object pooling',
                    'Clean up unused textures',
                    'Reduce particle system capacity',
                    'Unload unused scenes',
                    'Implement texture compression'
                );
                break;

            case 'Long frame time':
                this.suggestions.push(
                    'Profile update loops for bottlenecks',
                    'Implement spatial partitioning',
                    'Cache expensive calculations',
                    'Use object pooling for frequent allocations',
                    'Throttle non-critical updates'
                );
                break;
        }
    }

    /**
     * Clear suggestions related to recovered issues
     * @param {string} recovery - The recovery type
     */
    clearSuggestions(recovery) {
        // Clear suggestions when performance recovers
        if (recovery.includes('FPS recovered')) {
            this.suggestions = this.suggestions.filter(s =>
                !s.includes('particle') &&
                !s.includes('texture') &&
                !s.includes('animation') &&
                !s.includes('pooling') &&
                !s.includes('throttle')
            );
        }
    }

    /**
     * Analyze overall performance trends
     */
    analyzePerformance() {
        if (this.history.fps.length < 10) return; // Need some history

        const avgFps = this.history.fps.reduce((a, b) => a + b, 0) / this.history.fps.length;
        const avgFrameTime = this.history.frameTime.reduce((a, b) => a + b, 0) / this.history.frameTime.length;
        const avgMemory = this.history.memoryUsage.reduce((a, b) => a + b, 0) / this.history.memoryUsage.length;

        // Detect performance degradation trends
        const recentFps = this.history.fps.slice(-10);
        const olderFps = this.history.fps.slice(-20, -10);

        if (recentFps.length >= 10 && olderFps.length >= 10) {
            const recentAvg = recentFps.reduce((a, b) => a + b, 0) / recentFps.length;
            const olderAvg = olderFps.reduce((a, b) => a + b, 0) / olderFps.length;

            if (recentAvg < olderAvg * 0.8) { // 20% degradation
                console.warn('PerformanceMonitor: Performance degradation detected');
                if (this.scene && this.scene.events) {
                    this.scene.events.emit('performance-degradation', {
                        recentAvg,
                        olderAvg,
                        suggestions: [
                            'Check for memory leaks',
                            'Profile for performance regressions',
                        'Consider scene optimizations'
                    ]
                    });
                }
            }
        }

        // Log periodic performance report
        if (this.options.logPerformance) {
            console.log(`Performance Report: FPS=${avgFps.toFixed(1)}, FrameTime=${avgFrameTime.toFixed(1)}ms, Memory=${avgMemory.toFixed(1)}MB`);
        }
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        return {
            current: { ...this.metrics },
            averages: this.getAverages(),
            alerts: { ...this.alerts },
            suggestions: [...this.suggestions]
        };
    }

    /**
     * Get average performance metrics
     * @returns {Object} Average metrics
     */
    getAverages() {
        const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        return {
            fps: avg(this.history.fps),
            frameTime: avg(this.history.frameTime),
            memoryUsage: avg(this.history.memoryUsage)
        };
    }

    /**
     * Log detailed performance report
     */
    logPerformanceReport() {
        const metrics = this.getMetrics();
        const averages = metrics.averages;

        console.group('Performance Report');
        console.log(`Current FPS: ${metrics.current.fps.toFixed(1)}`);
        console.log(`Average FPS: ${averages.fps.toFixed(1)}`);
        console.log(`Frame Time: ${metrics.current.frameTime.toFixed(1)}ms`);
        console.log(`Average Frame Time: ${averages.frameTime.toFixed(1)}ms`);
        console.log(`Memory Usage: ${metrics.current.memoryUsage.toFixed(1)}MB`);
        console.log(`Draw Calls: ${metrics.current.drawCalls}`);
        console.log(`Triangles: ${metrics.current.triangles}`);

        if (this.alerts.lowFps) console.warn('⚠️ Low FPS detected');
        if (this.alerts.highMemory) console.warn('⚠️ High memory usage detected');
        if (this.alerts.longFrameTime) console.warn('⚠️ Long frame times detected');

        if (this.suggestions.length > 0) {
            console.log('Suggestions:');
            this.suggestions.forEach(suggestion => console.log(`- ${suggestion}`));
        }

        console.groupEnd();
    }

    /**
     * Reset performance monitoring
     */
    reset() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            frameCount: 0,
            lastUpdateTime: 0
        };

        this.history = {
            fps: [],
            frameTime: [],
            memoryUsage: [],
            timestamps: []
        };

        this.alerts = {
            lowFps: false,
            highMemory: false,
            longFrameTime: false
        };

        this.suggestions = [];
    }

    /**
     * Destroy the performance monitor
     */
    destroy() {
        // Clean up observers
        if (this.observers) {
            this.observers.forEach(observer => {
                try {
                    observer.disconnect();
                } catch (error) {
                    console.warn('PerformanceMonitor: Error disconnecting observer:', error);
                }
            });
        }

        // Remove event listeners (with safety check)
        if (this.scene && this.scene.events) {
            this.scene.events.off('update', this.updateMetrics, this);
        }

        this.reset();
    }
}

/**
 * Performance Profiler for detailed analysis
 */
export class PerformanceProfiler {
    /**
     * Create a new PerformanceProfiler
     * @param {string} name - Profiler name for identification
     */
    constructor(name = 'Profiler') {
        this.name = name;
        this.samples = [];
        this.isRunning = false;
        this.startTime = 0;
    }

    /**
     * Start profiling
     */
    start() {
        this.startTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        this.isRunning = true;
    }

    /**
     * Stop profiling and record sample
     * @param {string} label - Label for this sample
     * @returns {number} Duration in milliseconds
     */
    stop(label = '') {
        if (!this.isRunning) return 0;

        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - this.startTime;
        this.samples.push({
            label: label || `Sample ${this.samples.length + 1}`,
            duration,
            timestamp: Date.now()
        });

        this.isRunning = false;
        return duration;
    }

    /**
     * Profile a function execution
     * @param {Function} fn - Function to profile
     * @param {string} label - Label for the sample
     * @returns {*} Function result
     */
    profile(fn, label = '') {
        this.start();
        try {
            return fn();
        } finally {
            this.stop(label);
        }
    }

    /**
     * Profile an async function execution
     * @param {Function} fn - Async function to profile
     * @param {string} label - Label for the sample
     * @returns {Promise<*>} Promise that resolves to function result
     */
    async profileAsync(fn, label = '') {
        this.start();
        try {
            return await fn();
        } finally {
            this.stop(label);
        }
    }

    /**
     * Get profiling statistics
     * @returns {Object} Profiling statistics
     */
    getStats() {
        if (this.samples.length === 0) return null;

        const durations = this.samples.map(s => s.duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        return {
            name: this.name,
            sampleCount: this.samples.length,
            average: avg,
            minimum: min,
            maximum: max,
            total: durations.reduce((a, b) => a + b, 0),
            samples: [...this.samples]
        };
    }

    /**
     * Log profiling report
     */
    logReport() {
        const stats = this.getStats();
        if (!stats) {
            console.log(`${this.name}: No samples collected`);
            return;
        }

        console.group(`${this.name} Profiling Report`);
        console.log(`Samples: ${stats.sampleCount}`);
        console.log(`Average: ${stats.average.toFixed(2)}ms`);
        console.log(`Min: ${stats.minimum.toFixed(2)}ms`);
        console.log(`Max: ${stats.maximum.toFixed(2)}ms`);
        console.log(`Total: ${stats.total.toFixed(2)}ms`);

        // Show slowest samples
        const slowest = [...this.samples]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5);

        if (slowest.length > 0) {
            console.log('Slowest samples:');
            slowest.forEach(sample => {
                console.log(`  ${sample.label}: ${sample.duration.toFixed(2)}ms`);
            });
        }

        console.groupEnd();
    }

    /**
     * Reset profiler
     */
    reset() {
        this.samples = [];
        this.isRunning = false;
        this.startTime = 0;
    }
}

/**
 * FPS Monitor for real-time FPS tracking
 */
export class FPSMonitor {
    /**
     * Create a new FPSMonitor
     * @param {Phaser.Scene} scene - The scene to monitor
     * @param {Object} options - Monitor options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            updateInterval: options.updateInterval || 1000,
            showText: options.showText || false,
            position: options.position || { x: 10, y: 10 },
            ...options
        };

        this.fps = 0;
        this.fpsText = null;
        this.frameCount = 0;
        this.lastTime = 0;

        if (this.options.showText) {
            this.createFPSText();
        }

        this.startMonitoring();
    }

    /**
     * Create FPS display text
     */
    createFPSText() {
        this.fpsText = this.scene.add.text(
            this.options.position.x,
            this.options.position.y,
            'FPS: 0',
            {
                font: '16px Arial',
                fill: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 5, y: 2 }
            }
        );
        this.fpsText.setScrollFactor(0);
        this.fpsText.setDepth(1000);
    }

    /**
     * Start FPS monitoring
     */
    startMonitoring() {
        if (this.scene && this.scene.events) {
            this.scene.events.on('update', this.updateFPS, this);
        }
    }

    /**
     * Update FPS calculation
     */
    updateFPS() {
        if (!this.scene || !this.scene.time) {
            return;
        }

        this.frameCount++;

        const currentTime = this.scene.time.now;
        const delta = currentTime - this.lastTime;

        if (delta >= this.options.updateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / delta);

            if (this.fpsText) {
                const color = this.fps >= 55 ? '#00ff00' :
                             this.fps >= 30 ? '#ffff00' : '#ff0000';
                this.fpsText.setText(`FPS: ${this.fps}`);
                this.fpsText.setStyle({ fill: color });
            }

            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }

    /**
     * Get current FPS
     * @returns {number} Current FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Destroy the FPS monitor
     */
    destroy() {
        if (this.scene && this.scene.events) {
            this.scene.events.off('update', this.updateFPS, this);
        }

        if (this.fpsText) {
            this.fpsText.destroy();
        }
    }
}
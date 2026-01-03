import { Logger } from './logger.js';

/**
 * Memory Monitor - Extended memory tracking and leak detection
 * Tracks memory usage over time and detects potential leaks
 */
export class MemoryMonitor {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            checkInterval: 60000, // Check every 60 seconds
            historySize: 100,     // Keep 100 data points (100 minutes)
            leakThreshold: 0.1,   // 10% growth per check = potential leak
            warningThreshold: 150, // Warn at 150MB
            criticalThreshold: 200, // Critical at 200MB
            enableLogging: true,
            ...options
        };

        this.history = [];
        this.startTime = Date.now();
        this.lastCheckTime = 0;
        this.leakWarnings = 0;
        this.maxMemorySeen = 0;
        
        // Asset loading tracking
        this.assetLoadTimes = [];
        this.poolUsageStats = {};
        
        // Performance tracking
        this.performanceMetrics = {
            assetLoads: 0,
            poolHits: 0,
            poolMisses: 0,
            textureCount: 0,
            spriteCount: 0
        };

        // Start monitoring
        this.start();
    }

    /**
     * Start memory monitoring
     */
    start() {
        if (typeof performance === 'undefined' || !performance.memory) {
            Logger.warn('MemoryMonitor', 'Performance.memory API not available - memory monitoring disabled');
            return;
        }

        // Initial memory reading
        this.checkMemory();

        // Schedule periodic checks
        this.checkInterval = setInterval(() => {
            this.checkMemory();
        }, this.options.checkInterval);

        Logger.info('MemoryMonitor', 'Memory monitoring started');
    }

    /**
     * Check current memory usage
     */
    checkMemory() {
        if (typeof performance === 'undefined' || !performance.memory) {
            return;
        }

        const memoryInfo = {
            used: performance.memory.usedJSHeapSize / 1048576, // MB
            total: performance.memory.totalJSHeapSize / 1048576, // MB
            limit: performance.memory.jsHeapSizeLimit / 1048576, // MB
            timestamp: Date.now(),
            elapsed: Date.now() - this.startTime
        };

        // Update max memory seen
        if (memoryInfo.used > this.maxMemorySeen) {
            this.maxMemorySeen = memoryInfo.used;
        }

        // Add to history
        this.history.push(memoryInfo);
        if (this.history.length > this.options.historySize) {
            this.history.shift();
        }

        // Check for leaks
        this.detectLeaks(memoryInfo);

        // Check thresholds
        this.checkThresholds(memoryInfo);

        // Log if enabled
        if (this.options.enableLogging && this.history.length % 10 === 0) {
            this.logMemoryReport();
        }

        this.lastCheckTime = Date.now();
    }

    /**
     * Detect potential memory leaks
     * @param {Object} currentMemory - Current memory info
     */
    detectLeaks(currentMemory) {
        if (this.history.length < 5) return; // Need at least 5 data points

        // Calculate average growth rate over last 5 checks
        const recent = this.history.slice(-5);
        const growthRates = [];
        for (let i = 1; i < recent.length; i++) {
            const growth = (recent[i].used - recent[i - 1].used) / recent[i - 1].used;
            growthRates.push(growth);
        }

        const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

        // Check if growth rate exceeds threshold
        if (avgGrowth > this.options.leakThreshold) {
            this.leakWarnings++;
            const message = `Potential memory leak detected: ${(avgGrowth * 100).toFixed(2)}% growth rate over last 5 checks`;
            Logger.warn('MemoryMonitor', message);

            // Emit event for scene to handle
            if (this.scene && this.scene.events) {
                this.scene.events.emit('memory-leak-detected', {
                    growthRate: avgGrowth,
                    currentMemory: currentMemory.used,
                    warnings: this.leakWarnings
                });
            }

            // Suggest cleanup actions
            this.suggestCleanup();
        }
    }

    /**
     * Check memory thresholds
     * @param {Object} memoryInfo - Current memory info
     */
    checkThresholds(memoryInfo) {
        if (memoryInfo.used >= this.options.criticalThreshold) {
            Logger.error('MemoryMonitor', `CRITICAL: Memory usage at ${memoryInfo.used.toFixed(1)}MB (threshold: ${this.options.criticalThreshold}MB)`);
            
            if (this.scene && this.scene.events) {
                this.scene.events.emit('memory-critical', {
                    used: memoryInfo.used,
                    threshold: this.options.criticalThreshold
                });
            }
        } else if (memoryInfo.used >= this.options.warningThreshold) {
            Logger.warn('MemoryMonitor', `WARNING: Memory usage at ${memoryInfo.used.toFixed(1)}MB (threshold: ${this.options.warningThreshold}MB)`);
            
            if (this.scene && this.scene.events) {
                this.scene.events.emit('memory-warning', {
                    used: memoryInfo.used,
                    threshold: this.options.warningThreshold
                });
            }
        }
    }

    /**
     * Suggest cleanup actions
     */
    suggestCleanup() {
        const suggestions = [
            'Clear unused textures from cache',
            'Release object pools',
            'Destroy inactive game objects',
            'Clear particle emitters',
            'Force garbage collection (if available)'
        ];

        Logger.info('MemoryMonitor', `Cleanup suggestions: ${suggestions.join(', ')}`);

        if (this.scene && this.scene.events) {
            this.scene.events.emit('memory-cleanup-suggested', { suggestions });
        }
    }

    /**
     * Log memory report
     */
    logMemoryReport() {
        if (this.history.length === 0) return;

        const current = this.history[this.history.length - 1];
        const initial = this.history[0];
        const growth = current.used - initial.used;
        const growthPercent = ((growth / initial.used) * 100).toFixed(2);

        Logger.info('MemoryMonitor', 
            `Memory Report: ${current.used.toFixed(1)}MB used (${growth >= 0 ? '+' : ''}${growth.toFixed(1)}MB, ${growthPercent}%) | ` +
            `Max: ${this.maxMemorySeen.toFixed(1)}MB | ` +
            `Leak warnings: ${this.leakWarnings}`
        );
    }

    /**
     * Get current memory info
     * @returns {Object|null} Current memory info or null
     */
    getCurrentMemory() {
        if (this.history.length === 0) return null;
        return this.history[this.history.length - 1];
    }

    /**
     * Track asset load time
     * @param {string} assetKey - Asset key
     * @param {number} loadTime - Load time in milliseconds
     */
    trackAssetLoad(assetKey, loadTime) {
        this.assetLoadTimes.push({ key: assetKey, time: loadTime });
        this.performanceMetrics.assetLoads++;
        
        // Keep only last 100 load times
        if (this.assetLoadTimes.length > 100) {
            this.assetLoadTimes.shift();
        }
    }

    /**
     * Track pool usage
     * @param {string} poolName - Pool name
     * @param {boolean} hit - Whether it was a cache hit
     */
    trackPoolUsage(poolName, hit) {
        if (!this.poolUsageStats[poolName]) {
            this.poolUsageStats[poolName] = { hits: 0, misses: 0 };
        }
        
        if (hit) {
            this.poolUsageStats[poolName].hits++;
            this.performanceMetrics.poolHits++;
        } else {
            this.poolUsageStats[poolName].misses++;
            this.performanceMetrics.poolMisses++;
        }
    }

    /**
     * Update performance metrics
     * @param {Object} metrics - Performance metrics to update
     */
    updatePerformanceMetrics(metrics) {
        Object.assign(this.performanceMetrics, metrics);
    }

    /**
     * Get memory statistics
     * @returns {Object} Memory statistics
     */
    getStats() {
        if (this.history.length === 0) {
            return {
                current: 0,
                average: 0,
                min: 0,
                max: 0,
                growth: 0,
                leakWarnings: this.leakWarnings,
                uptime: Date.now() - this.startTime,
                performance: this.performanceMetrics
            };
        }

        const current = this.history[this.history.length - 1];
        const initial = this.history[0];
        const values = this.history.map(h => h.used);
        const average = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const growth = current.used - initial.used;

        // Calculate average asset load time
        const avgLoadTime = this.assetLoadTimes.length > 0
            ? this.assetLoadTimes.reduce((sum, entry) => sum + entry.time, 0) / this.assetLoadTimes.length
            : 0;

        // Calculate pool efficiency
        const totalPoolOps = this.performanceMetrics.poolHits + this.performanceMetrics.poolMisses;
        const poolEfficiency = totalPoolOps > 0
            ? (this.performanceMetrics.poolHits / totalPoolOps) * 100
            : 0;

        return {
            current: current.used,
            average: average,
            min: min,
            max: max,
            growth: growth,
            growthPercent: ((growth / initial.used) * 100).toFixed(2),
            leakWarnings: this.leakWarnings,
            maxSeen: this.maxMemorySeen,
            uptime: Date.now() - this.startTime,
            dataPoints: this.history.length,
            performance: {
                ...this.performanceMetrics,
                averageAssetLoadTime: avgLoadTime.toFixed(2),
                poolEfficiency: poolEfficiency.toFixed(2) + '%',
                poolStats: this.poolUsageStats
            }
        };
    }

    /**
     * Get memory trend (increasing, decreasing, stable)
     * @returns {string} Trend description
     */
    getTrend() {
        if (this.history.length < 3) return 'insufficient_data';

        const recent = this.history.slice(-10);
        const first = recent[0].used;
        const last = recent[recent.length - 1].used;
        const change = last - first;
        const changePercent = (change / first) * 100;

        if (changePercent > 5) return 'increasing';
        if (changePercent < -5) return 'decreasing';
        return 'stable';
    }

    /**
     * Stop memory monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        Logger.info('MemoryMonitor', 'Memory monitoring stopped');
    }

    /**
     * Get asset loading statistics
     * @returns {Object} Asset loading stats
     */
    getAssetLoadStats() {
        if (this.assetLoadTimes.length === 0) {
            return { count: 0, average: 0, min: 0, max: 0 };
        }

        const times = this.assetLoadTimes.map(e => e.time);
        return {
            count: this.assetLoadTimes.length,
            average: times.reduce((a, b) => a + b, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times)
        };
    }

    /**
     * Get pool usage statistics
     * @returns {Object} Pool usage stats
     */
    getPoolUsageStats() {
        return { ...this.poolUsageStats };
    }

    /**
     * Detect performance regressions
     * @returns {Object|null} Regression info or null
     */
    detectPerformanceRegression() {
        if (this.assetLoadTimes.length < 10) return null;

        // Check if recent load times are significantly higher
        const recent = this.assetLoadTimes.slice(-10);
        const older = this.assetLoadTimes.slice(-20, -10);
        
        if (older.length === 0) return null;

        const recentAvg = recent.reduce((sum, e) => sum + e.time, 0) / recent.length;
        const olderAvg = older.reduce((sum, e) => sum + e.time, 0) / older.length;
        
        const regression = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (regression > 50) { // 50% slower
            return {
                type: 'asset_load_regression',
                regression: regression.toFixed(2) + '%',
                recentAvg: recentAvg.toFixed(2),
                olderAvg: olderAvg.toFixed(2)
            };
        }
        
        return null;
    }

    /**
     * Destroy the memory monitor
     */
    destroy() {
        this.stop();
        this.history = [];
        this.assetLoadTimes = [];
        this.poolUsageStats = {};
        this.scene = null;
    }
}


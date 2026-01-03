# Performance Monitoring Guide

## Overview

Road of War includes comprehensive performance monitoring tools to track FPS, frame times, memory usage, and detect performance issues in real-time.

## Components

### PerformanceMonitor

Located in `src/utils/performance-monitor.js`, this class provides:

- **Real-time FPS tracking**: Monitors frame rate with configurable thresholds
- **Frame time analysis**: Tracks frame rendering duration
- **Memory usage monitoring**: Tracks JavaScript heap size
- **Performance alerts**: Warns when thresholds are exceeded
- **Optimization suggestions**: Provides actionable recommendations

**Initialization**:
```javascript
this.performanceMonitor = new PerformanceMonitor(this, {
    enableMonitoring: process.env.NODE_ENV === 'development',
    logPerformance: false,
    warningThreshold: 50,  // FPS threshold for warnings
    criticalThreshold: 30  // FPS threshold for critical warnings
});
```

### MemoryMonitor

Located in `src/utils/memory-monitor.js`, this class provides:

- **Memory leak detection**: Identifies potential memory leaks
- **Memory trend analysis**: Tracks memory growth over time
- **Threshold warnings**: Alerts at configurable memory levels
- **Historical tracking**: Maintains memory usage history

**Initialization**:
```javascript
this.memoryMonitor = new MemoryMonitor(this, {
    checkInterval: 60000,      // Check every 60 seconds
    leakThreshold: 0.1,        // 10% growth = potential leak
    warningThreshold: 150,      // Warn at 150MB
    criticalThreshold: 200,     // Critical at 200MB
    enableLogging: true
});
```

### PerformanceValidator

Located in `src/utils/performance-validator.js`, this class provides:

- **Automated performance testing**: Runs comprehensive performance tests
- **Hardware detection**: Identifies system capabilities
- **Baseline reporting**: Generates performance baseline reports
- **Test suites**: Baseline FPS, combat, particles, UI performance

**Usage**:
```javascript
// Run validation
const results = await this.performanceValidator.runValidation({
    duration: 30000,        // 30 seconds
    testCombat: true,
    testParticles: true,
    testUI: true
});

// Generate baseline report
const report = this.performanceValidator.generateBaselineReport();

// Export report
this.performanceValidator.exportBaselineReport('baseline.json');
```

## Development UI

In development mode, a performance monitor is displayed in the bottom-left corner showing:

- **FPS**: Current frame rate (color-coded: green ≥55, yellow ≥30, red <30)
- **Frame Time**: Frame rendering duration in milliseconds
- **Memory**: Current JavaScript heap usage in MB

## Performance Warnings

When performance issues are detected, visual warnings are displayed:

- **Low FPS**: Yellow/red notification when FPS drops below thresholds
- **High Memory**: Warning when memory usage exceeds 150MB
- **Memory Leak**: Alert when consistent memory growth is detected

## Baseline Reports

### Generating a Baseline

1. **In-game console**:
```javascript
// Run validation
await window.performanceValidator.runValidation();

// Generate report
const report = window.generatePerformanceBaseline();

// Export to file
window.exportPerformanceBaseline('baseline-report.json');
```

2. **Report Structure**:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "hardware": {
    "platform": "Win32",
    "cores": 8,
    "memory": { "limit": "4096MB", "total": "512MB" },
    "gpu": { "vendor": "NVIDIA", "renderer": "GeForce RTX 3080" }
  },
  "baseline": {
    "fps": {
      "average": 58.5,
      "min": 45.2,
      "max": 60.0,
      "target": 60,
      "threshold": 30
    },
    "frameTime": {
      "average": 17.1,
      "target": 16.67,
      "threshold": 33.33
    },
    "memory": {
      "initial": 45.2,
      "peak": 78.5,
      "current": 52.3,
      "average": 58.1,
      "growth": 7.1,
      "leakWarnings": 0
    }
  },
  "combat": { "averageFPS": 52.3, "passed": true },
  "particles": { "averageFPS": 48.7, "passed": true },
  "ui": { "averageFPS": 57.2, "passed": true },
  "summary": {
    "overall": "passed",
    "passed": 4,
    "failed": 0,
    "recommendations": []
  }
}
```

### Performance Targets

- **FPS**: Target 60 FPS, minimum 30 FPS
- **Frame Time**: Target <16.67ms (60 FPS), threshold <33.33ms (30 FPS)
- **Memory**: Target <100MB, warning at 150MB, critical at 200MB
- **Memory Growth**: <10% per check interval (potential leak threshold)

## Performance Optimization

When performance issues are detected, the system automatically:

1. **Reduces update frequency**: Throttles non-critical updates
2. **Triggers memory cleanup**: Clears unused textures, object pools
3. **Optimizes rendering**: Reduces particle effects, shadows
4. **Suggests optimizations**: Provides actionable recommendations

## Monitoring Best Practices

1. **Regular Baseline Checks**: Run performance validation after major changes
2. **Extended Testing**: Monitor memory over 30+ minute sessions
3. **Combat Profiling**: Test performance during intensive combat scenarios
4. **UI Testing**: Verify performance with all panels open
5. **Hardware Variation**: Test on different hardware configurations

## Troubleshooting

### High Memory Usage

- Check for memory leaks using `MemoryMonitor.getStats()`
- Review object pooling implementation
- Verify texture cache cleanup
- Check for event listener leaks

### Low FPS

- Profile with browser DevTools Performance tab
- Check `PerformanceMonitor.getMetrics()` for frame time spikes
- Review particle system throttling
- Verify update loop optimization

### Memory Leaks

- Monitor `MemoryMonitor.getTrend()` for increasing trend
- Review `MemoryMonitor.getStats().leakWarnings`
- Check for unremoved event listeners
- Verify proper cleanup in scene shutdown

## Integration

Performance monitoring is automatically initialized in `GameScene`:

- **PerformanceMonitor**: Enabled in development mode
- **MemoryMonitor**: Enabled in development mode
- **PerformanceValidator**: Available via `window.performanceValidator`

All monitoring components are properly cleaned up during scene shutdown to prevent memory leaks.

## Performance Testing

For comprehensive performance testing procedures, see:
- **Performance Testing Guide**: `docs/PERFORMANCE_TESTING_GUIDE.md` - Step-by-step testing procedures
- **Performance Test Helper**: `scripts/performance-test-helper.js` - Browser console helper script

### Quick Testing

1. **Start monitoring** (in browser console):
   ```javascript
   // Load helper script
   // Then start monitoring
   PerfTestHelper.startMonitoring(60000, 1800000); // 30 minutes
   ```

2. **Quick check**:
   ```javascript
   PerfTestHelper.quickCheck();
   ```

3. **Run validation**:
   ```javascript
   await PerfTestHelper.runValidation();
   ```

4. **Export baseline**:
   ```javascript
   PerfTestHelper.exportBaseline('my-baseline.json');
   ```


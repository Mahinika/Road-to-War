# Performance Testing Guide

## Overview

This guide provides step-by-step instructions for conducting comprehensive performance testing of Road of War. These tests help identify performance bottlenecks, memory leaks, and optimization opportunities.

## Prerequisites

- Game running in development mode (`npm run dev` or `npm start`)
- Browser DevTools open (F12)
- Performance monitoring enabled (automatic in development mode)

## Test Categories

### 1. Extended Session Testing

**Purpose**: Identify memory leaks and performance degradation over time.

**Duration**: 30+ minutes of continuous gameplay

**Steps**:

1. **Start the game**:
   ```bash
   npm run dev  # Browser
   # OR
   npm start    # Electron
   ```

2. **Open browser console** (F12) and verify monitoring:
   ```javascript
   // Check if monitors are active
   console.log('Performance Monitor:', gameScene.performanceMonitor);
   console.log('Memory Monitor:', gameScene.memoryMonitor);
   ```

3. **Start baseline measurement**:
   ```javascript
   // Get initial memory stats
   const initialStats = gameScene.memoryMonitor.getStats();
   console.log('Initial Memory:', initialStats);
   
   // Run initial performance validation
   const baseline = await window.performanceValidator.runValidation({
       duration: 10000,  // 10 seconds
       testBaseline: true,
       testCombat: false,
       testParticles: false,
       testUI: false
   });
   console.log('Baseline Performance:', baseline);
   ```

4. **Play the game normally** for 30+ minutes:
   - Engage in combat
   - Collect loot
   - Level up heroes
   - Open/close UI panels
   - Navigate through miles

5. **Monitor memory every 5 minutes**:
   ```javascript
   // Check memory stats
   const stats = gameScene.memoryMonitor.getStats();
   console.log('Memory Stats:', {
       current: stats.current,
       average: stats.average,
       max: stats.max,
       growth: stats.growth,
       trend: gameScene.memoryMonitor.getTrend(),
       leakWarnings: stats.leakWarnings
   });
   ```

6. **After 30 minutes, run final validation**:
   ```javascript
   // Final performance check
   const final = await window.performanceValidator.runValidation({
       duration: 10000,
       testBaseline: true,
       testCombat: false,
       testParticles: false,
       testUI: false
   });
   console.log('Final Performance:', final);
   
   // Compare with baseline
   const fpsDiff = final.tests.baseline.averageFPS - baseline.tests.baseline.averageFPS;
   console.log('FPS Change:', fpsDiff);
   ```

7. **Generate baseline report**:
   ```javascript
   // Export performance baseline
   window.exportPerformanceBaseline('extended-session-baseline.json');
   ```

**What to Look For**:
- Memory growth > 10% per check interval (potential leak)
- FPS degradation > 10 FPS from baseline
- Memory warnings or critical alerts
- Increasing frame times

**Documentation**:
- Record memory stats every 5 minutes
- Note any performance warnings
- Document gameplay activities during testing
- Save baseline report JSON file

### 2. Combat Performance Profiling

**Purpose**: Identify performance bottlenecks during intensive combat scenarios.

**Duration**: 10-15 minutes of focused combat testing

**Steps**:

1. **Start the game** and create a party with 5 heroes

2. **Open browser DevTools Performance tab**:
   - Click "Record" button
   - Or press Ctrl+Shift+E (Chrome) / Cmd+Option+I (Mac)

3. **Trigger combat**:
   - Move party to encounter enemies
   - Engage in multiple combats
   - Test with different enemy types
   - Test boss encounters

4. **During combat, monitor**:
   ```javascript
   // Get real-time performance metrics
   const metrics = gameScene.performanceMonitor.getMetrics();
   console.log('Combat Performance:', {
       fps: metrics.fps,
       frameTime: metrics.frameTime,
       memoryUsage: metrics.memoryUsage
   });
   ```

5. **Stop recording** after 1-2 minutes of combat

6. **Analyze performance profile**:
   - Look for long tasks (>50ms)
   - Identify frame time spikes
   - Check for memory allocations during combat
   - Review call stack for bottlenecks

7. **Run combat-specific validation**:
   ```javascript
   // Combat performance test
   const combatResults = await window.performanceValidator.runValidation({
       duration: 30000,  // 30 seconds
       testBaseline: false,
       testCombat: true,
       testParticles: false,
       testUI: false
   });
   console.log('Combat Performance:', combatResults);
   ```

8. **Test different scenarios**:
   - Single enemy combat
   - Multiple enemy combat (if available)
   - Boss encounters
   - Full party (5 heroes) combat
   - Combat with all UI panels open

**What to Look For**:
- Frame time spikes during combat
- FPS drops below 30 during combat
- High memory allocation during combat
- Long-running JavaScript tasks
- Particle system performance impact

**Documentation**:
- Save performance profile files
- Record FPS during different combat scenarios
- Note frame time spikes and their causes
- Document combat-specific optimizations needed

### 3. UI Performance Testing

**Purpose**: Test UI responsiveness and performance with all panels open.

**Duration**: 10-15 minutes

**Steps**:

1. **Start the game** and create a party

2. **Open all UI panels**:
   - Party frames (always visible)
   - Player frame
   - Target frame
   - Action bar
   - Combat log
   - Progression panel (P key)
   - Party overview panel (if available)
   - Equipment panel (if available)
   - Talent panel (if available)

3. **Monitor performance with all panels open**:
   ```javascript
   // UI performance test
   const uiResults = await window.performanceValidator.runValidation({
       duration: 30000,
       testBaseline: false,
       testCombat: false,
       testParticles: false,
       testUI: true
   });
   console.log('UI Performance:', uiResults);
   ```

4. **Test UI interactions**:
   - Open/close panels rapidly
   - Hover over tooltips
   - Click buttons
   - Scroll combat log
   - Update party frames during combat

5. **Monitor frame times**:
   ```javascript
   // Check frame times during UI interactions
   const metrics = gameScene.performanceMonitor.getMetrics();
   if (metrics.frameTime > 33) {  // >33ms = <30 FPS
       console.warn('High frame time during UI:', metrics.frameTime);
   }
   ```

6. **Test particle effects with UI**:
   - Enable particle effects
   - Open all panels
   - Monitor performance impact

**What to Look For**:
- Frame drops when opening/closing panels
- Lag during UI interactions
- High frame times with all panels open
- Memory usage with multiple panels
- Tooltip performance impact

**Documentation**:
- Record FPS with different panel combinations
- Note UI interaction lag
- Document panel performance impact
- Save UI performance test results

## Automated Performance Monitoring

### Continuous Monitoring Script

Create a script to run in the browser console for continuous monitoring:

```javascript
// Performance monitoring script
(function() {
    const interval = 60000; // 1 minute
    const log = [];
    
    const monitor = setInterval(() => {
        const stats = gameScene.memoryMonitor.getStats();
        const metrics = gameScene.performanceMonitor.getMetrics();
        
        const entry = {
            timestamp: Date.now(),
            memory: {
                current: stats.current,
                average: stats.average,
                max: stats.max,
                growth: stats.growth,
                trend: gameScene.memoryMonitor.getTrend()
            },
            performance: {
                fps: metrics.fps,
                frameTime: metrics.frameTime,
                memoryUsage: metrics.memoryUsage
            }
        };
        
        log.push(entry);
        console.log('Performance Log:', entry);
        
        // Check for issues
        if (stats.growth > 10) {
            console.warn('Memory growth detected:', stats.growth);
        }
        if (metrics.fps < 30) {
            console.warn('Low FPS detected:', metrics.fps);
        }
    }, interval);
    
    // Export log after 30 minutes
    setTimeout(() => {
        clearInterval(monitor);
        const json = JSON.stringify(log, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-log-${Date.now()}.json`;
        a.click();
        console.log('Performance log exported');
    }, 1800000); // 30 minutes
    
    console.log('Performance monitoring started. Will export after 30 minutes.');
})();
```

## Performance Baseline Comparison

### Before/After Testing

When testing optimizations:

1. **Run baseline test** before changes:
   ```javascript
   const before = await window.performanceValidator.runValidation();
   window.exportPerformanceBaseline('before-optimization.json');
   ```

2. **Make optimizations**

3. **Run test after changes**:
   ```javascript
   const after = await window.performanceValidator.runValidation();
   window.exportPerformanceBaseline('after-optimization.json');
   ```

4. **Compare results**:
   ```javascript
   // Compare FPS
   const fpsImprovement = after.tests.baseline.averageFPS - before.tests.baseline.averageFPS;
   console.log('FPS Improvement:', fpsImprovement);
   
   // Compare memory
   const memoryReduction = before.baseline.memory.current - after.baseline.memory.current;
   console.log('Memory Reduction:', memoryReduction);
   ```

## Troubleshooting Performance Issues

### High Memory Usage

1. Check for memory leaks:
   ```javascript
   const trend = gameScene.memoryMonitor.getTrend();
   if (trend === 'increasing') {
       console.warn('Memory leak detected - increasing trend');
   }
   ```

2. Review memory stats:
   ```javascript
   const stats = gameScene.memoryMonitor.getStats();
   console.log('Memory Stats:', stats);
   ```

3. Trigger memory cleanup:
   ```javascript
   gameScene.triggerMemoryCleanup();
   ```

### Low FPS

1. Check frame times:
   ```javascript
   const metrics = gameScene.performanceMonitor.getMetrics();
   console.log('Frame Time:', metrics.frameTime);
   ```

2. Review performance suggestions:
   ```javascript
   const suggestions = gameScene.performanceMonitor.getSuggestions();
   console.log('Suggestions:', suggestions);
   ```

3. Enable critical performance mode (automatic when FPS < 10)

### Frame Time Spikes

1. Use browser Performance tab to identify long tasks
2. Check for particle system overload
3. Review update loop optimization
4. Check for excessive event emissions

## Reporting Results

### Performance Test Report Template

```markdown
# Performance Test Report

**Date**: [Date]
**Duration**: [Duration]
**Test Type**: [Extended Session / Combat / UI]

## Baseline Metrics
- Initial FPS: [FPS]
- Initial Memory: [MB]
- Initial Frame Time: [ms]

## Final Metrics
- Final FPS: [FPS]
- Final Memory: [MB]
- Final Frame Time: [ms]

## Changes
- FPS Change: [±FPS]
- Memory Change: [±MB]
- Frame Time Change: [±ms]

## Issues Found
- [Issue 1]
- [Issue 2]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

## Best Practices

1. **Test in consistent conditions**: Same hardware, same browser, same settings
2. **Run multiple tests**: Average results over 3-5 test runs
3. **Document everything**: Save all baseline reports and performance logs
4. **Compare before/after**: Always test optimizations against baseline
5. **Test edge cases**: Maximum load scenarios, all panels open, intensive combat

## Tools and Resources

- **Browser DevTools**: Performance tab, Memory tab, Console
- **Performance Validator**: `window.performanceValidator`
- **Memory Monitor**: `gameScene.memoryMonitor`
- **Performance Monitor**: `gameScene.performanceMonitor`
- **Baseline Reports**: `window.generatePerformanceBaseline()`

## Next Steps

After completing performance testing:

1. Document findings in performance reports
2. Prioritize optimizations based on impact
3. Implement optimizations
4. Re-test to verify improvements
5. Update performance documentation


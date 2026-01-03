# Animation System Documentation

## Overview

The Road of War animation system has been completely overhauled to provide a developer-friendly experience with visual tools, hot-reload, and simplified architecture.

## Architecture

### Core Components

1. **AnimationConfig** (`src/config/animation-config.js`) - Centralized configuration
2. **AnimationManager** (`src/managers/animation-manager.js`) - Animation lifecycle management
3. **RuntimePaladinGenerator** (`src/generators/runtime-paladin-generator.js`) - Runtime sprite generation
4. **KeyframeGenerator** (`src/config/keyframe-generator.js`) - Keyframe generation from configs
5. **AnimationDebugger** (`src/utils/animation-debugger.js`) - Debugging utilities
6. **AnimationValidator** (`src/utils/animation-validator.js`) - Validation utilities
7. **AnimationHotReload** (`src/managers/animation-hot-reload.js`) - Hot-reload system

### Data Flow

```
Animation Request
    ↓
AnimationManager.initializeAnimations()
    ↓
AssetGenerator.generateAnimations()
    ↓
RuntimePaladinGenerator.generateAnimationFrames()
    ↓
KeyframeGenerator.generateKeyframes() (from config)
    ↓
Frame Generation with Joint Transforms
    ↓
Texture Validation & Retry (simplified async/await)
    ↓
Phaser Animation Registration
    ↓
Shared Animation Pool
```

## Configuration

### Animation Config (`public/data/animation-config.json`)

Centralized configuration for all animation settings:

```json
{
  "frameCounts": {
    "walk": 16,
    "idle": 12,
    "attack": 12
  },
  "frameRates": {
    "walk": 14,
    "idle": 10,
    "attack": 14
  },
  "frameDimensions": {
    "width": 40,
    "height": 60
  }
}
```

### Keyframe Configs (`public/data/keyframe-configs.json`)

Animation keyframe definitions:

```json
{
  "walk": {
    "type": "walkCycle",
    "parameters": {
      "yOffsetAmplitude": 2,
      "kneeBendAmplitude": 0.5
    }
  }
}
```

## Development Tools

### 1. Animation Debugger (`tools/animation-debugger.html`)

Visual tool for inspecting animations:

- **Frame Viewer**: Grid view of all animation frames
- **Frame Inspection**: Click frames to see detailed information
- **Statistics**: Total animations, frames, memory usage
- **Error Detection**: Highlights invalid frames
- **Export**: Export animation data as JSON

**Usage:**
1. Start the game
2. Open `tools/animation-debugger.html` in browser
3. Select character type and animation
4. Inspect frames and view details

### 2. Animation Preview (`tools/animation-preview.html`)

Real-time animation preview:

- **Live Preview**: See animations play in real-time
- **Playback Controls**: Play, pause, stop
- **Speed Control**: Adjust playback speed
- **Timeline Scrubber**: Jump to specific frames
- **Frame-by-Frame**: Step through animation

**Usage:**
1. Start the game
2. Open `tools/animation-preview.html` in browser
3. Select animation to preview
4. Use controls to play/pause/scrub

### 3. Animation Editor (`tools/animation-editor.html`)

Visual keyframe editor:

- **Keyframe Editing**: Edit individual keyframes
- **Property Panel**: Adjust X, Y, rotation, scale
- **Real-time Preview**: See changes immediately
- **Export Config**: Export edited keyframes as JSON

**Usage:**
1. Start the game
2. Open `tools/animation-editor.html` in browser
3. Load an animation
4. Select keyframes to edit
5. Adjust properties and export

### 4. Animation Tester (`tools/animation-tester.html`)

Batch testing and validation:

- **Test All**: Validate all animations at once
- **Test by Type**: Test animations for specific character type
- **Results Table**: See validation results
- **Export Results**: Export test results as JSON

**Usage:**
1. Start the game
2. Open `tools/animation-tester.html` in browser
3. Click "Test All Animations" or select character type
4. Review results and export if needed

## Hot-Reload System

### Enabling Hot-Reload

```javascript
// In your scene
this.animationHotReload = new AnimationHotReload(this, this.animationManager);
this.animationHotReload.enable();
```

### How It Works

1. Polls config files every second for changes
2. Detects changes in `animation-config.json` or `keyframe-configs.json`
3. Automatically regenerates affected animations
4. Preserves animation state during reload
5. Notifies connected debugger/preview tools

### File Watcher

For development, use the file watcher:

```bash
node tools/animation-watcher.js
```

This watches config files and logs when changes are detected.

## Simplified Retry Logic

The complex retry mechanism has been replaced with clean async/await:

**Before:**
```javascript
const tryCreateAnimation = (retryCount = 0, maxRetries = 15) => {
    this.scene.time.delayedCall(64, () => {
        tryCreateAnimation(retryCount + 1, maxRetries);
    });
};
```

**After:**
```javascript
const frames = await validateFramesReady(scene, frames);
const created = await createAnimationWithRetry(scene, createFn, animKey);
```

## Keyframe System

Keyframes are now defined in JSON config files instead of hardcoded switch statements:

**Before:**
```javascript
switch (animationName) {
    case 'walk':
        // 50+ lines of hardcoded math
        break;
}
```

**After:**
```json
{
  "walk": {
    "type": "walkCycle",
    "parameters": {
      "yOffsetAmplitude": 2,
      "kneeBendAmplitude": 0.5
    }
  }
}
```

## Debugging

### Using AnimationDebugger

```javascript
// Enable debugger
const debugger = createAnimationDebugger(scene);
debugger.enable();

// Inspect animation
const inspection = debugger.inspectAnimation('paladin-shared-walk');
console.log(inspection);

// Validate texture
const validation = debugger.validateTexture('texture-key');
console.log(validation);

// Get statistics
const stats = debugger.getStatistics();
console.log(stats);
```

### Using AnimationValidator

```javascript
// Create validator
const validator = createAnimationValidator(scene);

// Validate single animation
const result = validator.validateAnimation('paladin-shared-walk');

// Validate all animations
const summary = validator.validateAllAnimations();

// Batch validate
const batchResult = validator.batchValidate(['anim1', 'anim2']);
```

## Performance Optimizations

1. **Shared Animation Pool**: One animation per character type (80-90% memory reduction)
2. **Frame Caching**: Generated frames are cached for reuse
3. **Lazy Loading**: Animations loaded on demand
4. **Texture Validation**: Efficient async texture checking

## Migration Guide

### Updating Existing Code

1. **Use Config System**: Replace hardcoded frame counts/rates with `getFrameCount()` and `getFrameRate()`
2. **Use Keyframe Generator**: Replace hardcoded keyframes with `generateKeyframes()`
3. **Use Texture Utils**: Replace complex retry logic with `waitForTexture()` and `validateFramesReady()`

### Example Migration

**Before:**
```javascript
const frameCount = animationName === 'walk' ? 16 : 12;
const frameRate = animationName === 'walk' ? 14 : 12;
```

**After:**
```javascript
import { getFrameCount, getFrameRate } from '../config/animation-config.js';
const frameCount = getFrameCount(animationName, scene);
const frameRate = getFrameRate(animationName, scene);
```

## Troubleshooting

### Animations Not Loading

1. Check config files exist: `public/data/animation-config.json`, `public/data/keyframe-configs.json`
2. Verify textures are being generated: Use Animation Debugger
3. Check console for errors: Look for texture validation errors

### Hot-Reload Not Working

1. Ensure hot-reload is enabled: `animationHotReload.enable()`
2. Check config files are being watched
3. Verify file changes are being detected (check console logs)

### Performance Issues

1. Check animation pool usage: Use debugger statistics
2. Verify frame caching is enabled
3. Use Animation Tester to identify problematic animations

## Best Practices

1. **Always use config files** for animation settings
2. **Use shared animation pool** for memory efficiency
3. **Validate animations** before using in production
4. **Use debugger tools** during development
5. **Test animations** with Animation Tester before release
6. **Enable hot-reload** during development for faster iteration

## API Reference

### AnimationConfig

- `getFrameCount(animationName, scene)` - Get frame count for animation
- `getFrameRate(animationName, scene, defaultRate)` - Get frame rate
- `getFrameDimensions(scene)` - Get frame dimensions
- `loadAnimationConfig(scene)` - Load config from JSON

### AnimationDebugger

- `enable()` - Enable debug mode
- `inspectAnimation(animKey)` - Inspect animation details
- `validateTexture(textureKey)` - Validate texture
- `getStatistics()` - Get animation statistics
- `exportAnimationData(animKey)` - Export animation data

### AnimationValidator

- `validateAnimation(animKey)` - Validate single animation
- `validateAllAnimations()` - Validate all animations
- `compareAnimations(animKey1, animKey2)` - Compare two animations
- `batchValidate(animKeys)` - Batch validate animations

### AnimationHotReload

- `enable()` - Enable hot-reload
- `disable()` - Disable hot-reload
- `manualReload()` - Manually trigger reload
- `onConfigChanged(configType, callback)` - Register change listener

## File Locations

- Config: `src/config/animation-config.js`, `public/data/animation-config.json`
- Keyframes: `src/config/keyframe-generator.js`, `public/data/keyframe-configs.json`
- Debugger: `src/utils/animation-debugger.js`, `tools/animation-debugger.html`
- Validator: `src/utils/animation-validator.js`, `tools/animation-tester.html`
- Preview: `tools/animation-preview.html`
- Editor: `tools/animation-editor.html`
- Hot-Reload: `src/managers/animation-hot-reload.js`
- Watcher: `tools/animation-watcher.js`


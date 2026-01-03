# Camera Scrolling Implementation

## Changes Made

### 1. Camera Setup (src/scenes/game-world.js)
- **Camera Bounds**: Set large world bounds (100,000px width) for horizontal scrolling
- **Camera Follow**: Camera now follows the primary hero (tank) with smooth interpolation
- **Deadzone**: 30% horizontal deadzone prevents camera jitter when hero stops
- **Initial Position**: Camera starts at hero's position

### 2. World Manager Updates (src/managers/world-manager.js)
- **Segment Generation**: Now based on camera position instead of hero position
- **Enemy Spawning**: Enemies spawn ahead of camera (3 segments ahead)
- **Cleanup**: Old segments behind camera are removed (2 segments behind)
- **Hero Movement**: Heroes move in world space, camera follows

### 3. How It Works
1. Heroes move forward at `scrollSpeed` (50px/s by default)
2. Camera follows the primary hero smoothly
3. Segments are generated based on camera position
4. Enemies spawn ahead of the camera view
5. Old segments are cleaned up behind the camera

## Benefits
- ✅ Enemies always spawn ahead of the party
- ✅ Camera stays locked on heroes (2D side-scroller style)
- ✅ Better performance (only visible segments loaded)
- ✅ Smooth scrolling experience
- ✅ No more "heroes moving out of view" issue

## Configuration
- Camera deadzone: 30% of screen width (adjustable)
- Segments ahead: 3 segments (spawns enemies ahead)
- Segments behind: 2 segments (cleanup buffer)
- World width: 100,000px (supports 100 miles of scrolling)


# Phaser 3 Best Practices

This document outlines best practices for using Phaser 3 in our game development.

## Performance Optimization

### Object Pooling with Groups
- Use Phaser Groups instead of arrays for managing game objects
- Groups provide automatic pooling via `getFirstDead()` method
- Kill sprites instead of destroying them to enable pooling
- Example:
```javascript
// Create Group
this.enemyGroup = this.scene.add.group({ maxSize: 50 });

// Get pooled sprite
let sprite = this.enemyGroup.getFirstDead(false);
if (!sprite) {
    sprite = this.scene.add.sprite(x, y, texture);
    this.enemyGroup.add(sprite);
} else {
    sprite.setTexture(texture);
    sprite.setPosition(x, y);
    sprite.setActive(true);
    sprite.setVisible(true);
}
```

### Camera Culling
- Always enable camera culling for large worlds
- Use `setCullPadding()` to control render distance
- Example:
```javascript
this.cameras.main.setCullPadding(200); // Only render objects within 200px
```

### Depth Management
- Use centralized depth layers from `src/utils/depth-layers.js`
- Avoid hardcoded depth values
- Use `setDepth()` helper function for consistency
- Example:
```javascript
import { DEPTH_LAYERS, setDepth } from '../utils/depth-layers.js';
setDepth(sprite, DEPTH_LAYERS.ENEMIES);
```

### Texture Atlases
- Combine related textures into atlases
- Reduces draw calls significantly
- Use `this.load.atlas()` for loading
- Access frames via `this.add.image(x, y, 'atlas-key', 'frame-name')`

## Code Patterns

### Manager Pattern
- Each major system has its own manager class
- Managers receive scene reference in constructor
- Managers handle their own initialization and cleanup
- Example structure:
```javascript
export class MyManager {
    constructor(scene, config = {}) {
        this.scene = scene;
        // Initialize
    }
    
    init() {
        // Setup after scene is ready
    }
    
    destroy() {
        // Cleanup
    }
}
```

### Event-Driven Communication
- Use Phaser's event system for loose coupling
- Define event constants in `src/utils/event-constants.js`
- Emit events instead of direct method calls
- Example:
```javascript
// Emit
this.scene.events.emit(GameEvents.COMBAT.START, { enemy });

// Listen
this.scene.events.on(GameEvents.COMBAT.START, (data) => {
    // Handle event
});
```

### Scene Data vs Registry
- Use `this.data` for scene-specific state
- Use `this.registry` for global/cross-scene data
- Example:
```javascript
// Scene-specific
this.data.set('currentMile', 0);

// Global
this.registry.set('playerName', 'Hero');
```

## Common Pitfalls

### Don't Destroy Sprites in Groups
- Use `setActive(false)` and `setVisible(false)` instead
- Allows Group pooling to work correctly
- Only destroy if sprite is not in a Group

### Don't Hardcode Depths
- Use `DEPTH_LAYERS` constants
- Makes depth management consistent
- Easier to adjust layering

### Don't Create Sprites Every Frame
- Use object pooling
- Reuse sprites from Groups
- Only create when pool is empty

### Don't Load Assets in Update Loop
- Load all assets in PreloadScene
- Use texture caching
- Check `textures.exists()` before using

## Performance Monitoring

- Use `PerformanceMonitor` utility for profiling
- Monitor expensive operations
- Example:
```javascript
PerformanceMonitor.start('MyOperation');
// ... code ...
PerformanceMonitor.end('MyOperation');
```

## Resources

- [Phaser 3 API Docs](https://docs.phaser.io)
- [Phaser Examples](https://github.com/phaserjs/phaser3-examples)
- [Performance Guide](https://docs.phaser.io/phaser/display/culling)


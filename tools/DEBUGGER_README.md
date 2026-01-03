# Hero Visibility Debugger

A comprehensive diagnostic tool for debugging hero sprite visibility issues in the Phaser game.

## Usage

### Option 1: Standalone HTML File

1. Open `tools/hero-visibility-debugger.html` in your browser
2. Make sure the game is running in another window/tab
3. The debugger will automatically connect to `window.gameScene`

### Option 2: Browser Console

The game automatically exposes `window.gameScene` when the GameScene is created. You can use the debug scripts directly in the browser console.

## Quick Diagnostic Commands

### Check if heroes are visible
```javascript
window.gameScene.partyMemberSprites.forEach((pm, i) => {
  console.log(`Hero ${i}:`, {
    visible: pm.sprite?.visible,
    active: pm.sprite?.active,
    position: { x: pm.sprite?.x, y: pm.sprite?.y }
  });
});
```

### Force all heroes visible
```javascript
window.gameScene.partyMemberSprites.forEach(pm => {
  pm.sprite.setVisible(true);
  pm.sprite.setActive(true);
  pm.sprite.setAlpha(1.0);
});
```

### Check camera bounds
```javascript
const camera = window.gameScene.cameras.main;
const viewport = {
  left: camera.scrollX,
  right: camera.scrollX + camera.width,
  top: camera.scrollY,
  bottom: camera.scrollY + camera.height
};
console.log('Viewport:', viewport);
```

### Check hero positions vs camera
```javascript
const camera = window.gameScene.cameras.main;
window.gameScene.partyMemberSprites.forEach((pm, i) => {
  const sprite = pm.sprite;
  const inView = sprite.x >= camera.scrollX && 
                 sprite.x <= camera.scrollX + camera.width &&
                 sprite.y >= camera.scrollY && 
                 sprite.y <= camera.scrollY + camera.height;
  console.log(`Hero ${i}: ${inView ? 'IN VIEW' : 'OFF-SCREEN'}`);
});
```

## Features

The debugger includes checks for:

1. **Off-Screen Positioning** - Verifies heroes are within camera bounds
2. **Depth Ordering** - Checks for sprite layering conflicts
3. **Texture/Tint Issues** - Detects invisible textures or white tints
4. **Camera Follow** - Validates camera positioning and follow target
5. **Update Loop** - Monitors visibility state over time
6. **Animation Loading** - Checks if animations are properly loaded

## Troubleshooting

If `window.gameScene` is undefined:

1. Make sure the game has started and GameScene has been created
2. Check browser console for any errors
3. Try accessing it after a few seconds: `setTimeout(() => console.log(window.gameScene), 2000)`

## Integration

The game automatically exposes the scene:
- `window.game` - The Phaser game instance
- `window.gameScene` - The GameScene instance (available after scene creation)

This allows the debugger to access:
- `window.gameScene.partyMemberSprites` - Array of hero sprites
- `window.gameScene.cameras.main` - Main camera
- `window.gameScene.textures` - Texture manager
- `window.gameScene.anims` - Animation manager


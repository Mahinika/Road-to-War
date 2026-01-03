# Debugging Guide - Road of War

This document explains the complete debugging system used in the Road of War game. Use this guide to replicate the debugging approach.

## Core Debugging Architecture

### Global Window Objects

The game automatically exposes critical objects to the browser's `window` object for debugging access:

**In `src/main.js`:**
```javascript
// Expose game instance
window.game = game;

// Expose GameScene when ready
game.events.once('ready', () => {
    const gameScene = game.scene.getScene('GameScene');
    if (gameScene) {
        window.gameScene = gameScene;
        console.log('GameScene exposed to window.gameScene for debugging');
    }
});
```

**Available Globals:**
- `window.game` - Phaser game instance
- `window.gameScene` - GameScene instance (available after scene creation)
- `window.gameLogs` - Array of captured console logs

### Key GameScene Properties for Debugging

Once `window.gameScene` is available, you can access:

- `window.gameScene.partyMemberSprites` - Array of hero sprites
- `window.gameScene.cameras.main` - Main camera
- `window.gameScene.textures` - Texture manager
- `window.gameScene.anims` - Animation manager
- `window.gameScene.cameraManager` - Camera manager instance
- `window.gameScene.hero` - Primary hero sprite

## Debugging Methods

### Method 1: Browser Console (Recommended)

**Steps:**
1. Start the game and wait for it to fully load
2. Open browser DevTools (F12) in the game tab
3. Run debug commands directly in the console

**Quick Diagnostic Commands:**

```javascript
// Check if scene exists
window.gameScene

// Count heroes
window.gameScene?.partyMemberSprites?.length

// Check hero visibility
window.gameScene?.partyMemberSprites?.forEach((pm, i) => {
  console.log(`Hero ${i}:`, {
    visible: pm.sprite?.visible,
    active: pm.sprite?.active,
    position: { x: pm.sprite?.x, y: pm.sprite?.y },
    tint: '0x' + (pm.sprite?.tintTopLeft || 0).toString(16),
    depth: pm.sprite?.depth
  });
});

// Force all heroes visible
window.gameScene?.partyMemberSprites?.forEach(pm => {
  pm.sprite.setVisible(true);
  pm.sprite.setActive(true);
  pm.sprite.setAlpha(1.0);
});

// Check camera
const camera = window.gameScene?.cameras?.main;
console.log('Camera:', {
  scrollX: camera?.scrollX,
  scrollY: camera?.scrollY,
  width: camera?.width,
  height: camera?.height,
  followTarget: camera?.followTarget
});
```

### Method 2: Inject Debug Panel

**Location:** `public/inject-now.js`

**Usage:**
1. Start the game
2. Open browser console (F12)
3. Inject the script:
```javascript
const script = document.createElement('script');
script.src = '/inject-now.js';
document.body.appendChild(script);
```

**Or paste directly:**
Copy the entire contents of `public/inject-now.js` and paste into console.

**Features:**
- Interactive debug panel in top-right corner
- Run diagnostics button
- Auto-refresh toggle (updates every 1 second)
- Visual overlays on game canvas (camera bounds, hero positions, deadzone)
- Force visibility controls
- Camera controls (reset follow, stop follow)
- Clear tints button
- Full state logging

### Method 3: Bookmarklet

**Location:** `tools/debugger-bookmarklet.js`

**Setup:**
1. Copy the entire code from `tools/debugger-bookmarklet.js`
2. Create a new browser bookmark
3. Paste code as the bookmark URL (starts with `javascript:`)
4. Click bookmark while game is running

**What it does:**
- Runs diagnostic checks
- Logs results to console
- Checks hero count, visibility, camera, positions
- Validates camera viewport vs hero positions

### Method 4: Standalone HTML Debugger

**Location:** `public/debug-panel.html` or `tools/hero-visibility-debugger.html`

**Usage:**
1. Start the game
2. Open debugger HTML file in browser
3. Note: May not work due to cross-origin restrictions
4. Better to use browser console in game tab directly

## Logging System

### File-Based Logging

**Log File:** `logs/game-output.log`

**How it works:**
- Console logs captured and written to file
- Electron mode: Logs sent via IPC to main process
- Browser mode: Logs stored in `window.gameLogs` array

### Checking Logs

**Method 1: Command Line**
```bash
# Show last 50 lines (default)
node check-logs.js

# Show last 100 lines
node check-logs.js 100

# Show all logs
node check-logs.js all
```

**Method 2: Browser Console**
```javascript
// View all captured logs
console.table(window.gameLogs);

// Export logs to file
window.exportGameLogs();

// Clear logs
window.clearGameLogs();
```

### Log Format

```
[2025-12-27T13:45:00.000Z] [Renderer INFO] HeroFactory initialized
[2025-12-27T13:45:01.000Z] [Main LOG] Game log file initialized
[2025-12-27T13:45:02.000Z] [IPC WARN] Low mana warning
```

**Log Levels:**
- `LOG` - General information
- `INFO` - Important events
- `WARN` - Warnings
- `ERROR` - Errors
- `DEBUG` - Debug information

## Common Debugging Tasks

### Check Hero Visibility Issues

```javascript
// Full diagnostic
if (window.gameScene && window.gameScene.partyMemberSprites) {
  window.gameScene.partyMemberSprites.forEach((pm, i) => {
    const sprite = pm.sprite;
    console.log(`Hero ${i} (${pm.hero?.id || 'unknown'}):`, {
      visible: sprite?.visible,
      active: sprite?.active,
      position: { x: sprite?.x, y: sprite?.y },
      tint: '0x' + (sprite?.tintTopLeft || 0).toString(16),
      depth: sprite?.depth,
      alpha: sprite?.alpha,
      texture: sprite.texture?.key || 'N/A'
    });
  });
}
```

### Check Camera vs Hero Positions

```javascript
const camera = window.gameScene.cameras.main;
const viewport = {
  left: camera.scrollX,
  right: camera.scrollX + camera.width,
  top: camera.scrollY,
  bottom: camera.scrollY + camera.height
};

window.gameScene.partyMemberSprites?.forEach((pm, i) => {
  const sprite = pm.sprite;
  const inView = sprite.x >= viewport.left && 
                 sprite.x <= viewport.right &&
                 sprite.y >= viewport.top && 
                 sprite.y <= viewport.bottom;
  console.log(`Hero ${i}: ${inView ? 'IN VIEW' : 'OFF-SCREEN'}`);
});
```

### Force Fix Visibility Issues

```javascript
// Force all heroes visible
window.gameScene.partyMemberSprites?.forEach(pm => {
  pm.sprite.setVisible(true);
  pm.sprite.setActive(true);
  pm.sprite.setAlpha(1.0);
  pm.sprite.clearTint();
});
```

### Check Camera Manager State

```javascript
const cameraManager = window.gameScene.cameraManager;
console.log('CameraManager:', {
  initialized: cameraManager?.initialized,
  primaryHero: cameraManager?.primaryHero,
  smoothLerp: cameraManager?.smoothLerp,
  deadzoneWidth: cameraManager?.deadzoneWidth,
  partyPadding: cameraManager?.partyPadding
});

// Check party bounds
const bounds = cameraManager?.calculatePartyBounds();
console.log('Party Bounds:', bounds);
```

### Reset Camera Follow

```javascript
const scene = window.gameScene;
if (scene.cameraManager && scene.hero) {
  scene.cameraManager.setFollowTarget(scene.hero);
  console.log('Camera follow reset');
}
```

### Stop Camera Follow

```javascript
const camera = window.gameScene.cameras.main;
if (camera) {
  camera.stopFollow();
  console.log('Camera follow stopped');
}
```

## Debug Panel Features (inject-now.js)

The injected debug panel provides:

1. **Diagnostic Button** - Runs comprehensive checks
2. **Auto-Refresh Toggle** - Updates diagnostics every 1 second
3. **Visual Overlays Toggle** - Draws on game canvas:
   - Blue rectangle: Camera viewport
   - Red rectangle: Camera deadzone
   - Yellow circle: Follow target marker
   - Green/Red circles: Hero positions (green=visible, red=hidden)
   - Cyan rectangle: Party bounds
4. **Force All Visible** - Makes all heroes visible
5. **Camera Controls** - Reset/Stop camera follow
6. **Log Full State** - Dumps complete game state to console
7. **Clear All Tints** - Removes color tints from heroes

## Key Files Reference

- `src/main.js` - Exposes window.game and window.gameScene
- `public/inject-now.js` - Enhanced debug panel injector
- `tools/debugger-bookmarklet.js` - Bookmarklet version
- `public/debug-panel.html` - Standalone debug panel HTML
- `tools/DEBUGGER_README.md` - Original debugger documentation
- `tools/DEBUGGER_USAGE.md` - Usage guide
- `LOGGING.md` - Logging system documentation
- `check-logs.js` - Command-line log viewer

## Implementation Checklist

To replicate this debugging system:

1. ✅ Expose game instance: `window.game = game`
2. ✅ Expose scene when ready: `window.gameScene = gameScene`
3. ✅ Create debug panel injection script (see `public/inject-now.js`)
4. ✅ Create bookmarklet version (see `tools/debugger-bookmarklet.js`)
5. ✅ Set up logging system (capture console logs)
6. ✅ Create log viewer utility (see `check-logs.js`)
7. ✅ Document common debugging commands
8. ✅ Provide visual overlay system for game canvas debugging

## Notes

- `window.gameScene` may not be available immediately - wait for scene creation
- Visual overlays use Phaser Graphics objects added to the scene
- Debug panel uses DOM manipulation to create UI overlay
- All debugging is non-intrusive and can be removed/closed at any time
- Logs persist across sessions (in Electron mode via file, browser mode via localStorage)






# Hero Visibility Debugger - Usage Guide

## Problem
The debugger tool shows "Game scene not found!" because it can't access `window.gameScene` from a different page context.

## Solutions

### Option 1: Use Browser Console (Recommended)
1. Start the game and wait for it to fully load
2. Open browser console (F12) in the game tab
3. Run these commands:

```javascript
// Quick check
console.log('Game scene:', window.gameScene);
console.log('Heroes:', window.gameScene?.partyMemberSprites?.length);

// Full diagnostic
if (window.gameScene && window.gameScene.partyMemberSprites) {
  window.gameScene.partyMemberSprites.forEach((pm, i) => {
    const sprite = pm.sprite;
    console.log(`Hero ${i} (${pm.hero?.id || 'unknown'}):`, {
      visible: sprite?.visible,
      active: sprite?.active,
      position: { x: sprite?.x, y: sprite?.y },
      tint: '0x' + (sprite?.tintTopLeft || 0).toString(16),
      depth: sprite?.depth
    });
  });
}

// Force all visible
window.gameScene.partyMemberSprites?.forEach(pm => {
  pm.sprite.setVisible(true);
  pm.sprite.setActive(true);
  pm.sprite.setAlpha(1.0);
});
```

### Option 2: Use Bookmarklet
1. Copy the code from `tools/debugger-bookmarklet.js`
2. Create a browser bookmark with the code as the URL
3. Click the bookmark while the game is running

### Option 3: Open Debugger in Same Window
1. Start the game and wait for it to load
2. In the game tab, open browser console (F12)
3. Type: `window.open('/hero-visibility-debugger.html', '_blank')`
4. This opens the debugger in a new tab that can access the game window

### Option 4: Inject Debugger into Game Page
Add this to the game page's console:

```javascript
// Inject debugger panel into game
const debugPanel = document.createElement('div');
debugPanel.id = 'hero-debugger-panel';
debugPanel.style.cssText = 'position:fixed;top:10px;right:10px;background:#1e293b;color:white;padding:20px;border:2px solid #3b82f6;border-radius:8px;z-index:10000;max-width:400px;max-height:80vh;overflow-y:auto;';
debugPanel.innerHTML = `
  <h3 style="margin-top:0;">Hero Debugger</h3>
  <button onclick="
    const scene = window.gameScene;
    if (!scene) { alert('Game scene not found!'); return; }
    console.log('Heroes:', scene.partyMemberSprites?.length);
    scene.partyMemberSprites?.forEach((pm,i) => {
      console.log(\`Hero \${i}:\`, pm.sprite?.visible, pm.sprite?.x, pm.sprite?.y);
    });
  ">Log Hero States</button>
  <button onclick="
    window.gameScene?.partyMemberSprites?.forEach(pm => {
      pm.sprite?.setVisible(true);
      pm.sprite?.setActive(true);
    });
    alert('Forced all visible!');
  ">Force All Visible</button>
`;
document.body.appendChild(debugPanel);
```

## Quick Commands Reference

```javascript
// Check if scene exists
window.gameScene

// Count heroes
window.gameScene?.partyMemberSprites?.length

// Check hero visibility
window.gameScene?.partyMemberSprites?.forEach((pm, i) => {
  console.log(`Hero ${i}:`, pm.sprite?.visible, pm.sprite?.x, pm.sprite?.y);
});

// Force all visible
window.gameScene?.partyMemberSprites?.forEach(pm => {
  pm.sprite?.setVisible(true);
  pm.sprite?.setActive(true);
});

// Check camera
const camera = window.gameScene?.cameras?.main;
console.log('Camera:', camera?.scrollX, camera?.scrollY);
```


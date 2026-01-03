# UI System Guide - Single Source of Truth

## Overview

This document explains how to adjust UI elements in the game. **All UI values come from a single configuration file** for easy adjustment.

## Single Source of Truth

**All UI dimensions, positions, colors, and styling come from:**

```
src/config/ui-config.js
```

This file contains:
- Party frame dimensions and positions
- Player frame dimensions and positions
- HUD bar dimensions and positions
- Action bar button sizes and positions
- Combat log dimensions and positions
- Minimap size and position
- Target frame dimensions and positions
- Font sizes
- Colors and themes
- Spacing and margins

## How to Adjust UI

### 1. Change UI Element Size

Edit `src/config/ui-config.js`:

```javascript
// Example: Change party frame width
PARTY_FRAMES: {
    FRAME_WIDTH: 413,  // Change this value
    FRAME_HEIGHT: 90,  // Change this value
    // ...
}
```

### 2. Change UI Element Position

Edit `src/config/ui-config.js`:

```javascript
// Example: Move party frames
PARTY_FRAMES: {
    LEFT_MARGIN: 28,   // Distance from left edge
    START_Y: 141,      // Distance from top
    // ...
}
```

### 3. Change Font Sizes

Edit `src/config/ui-config.js`:

```javascript
// Example: Change party frame name font size
PARTY_FRAMES: {
    NAME_FONT_SIZE: 25,  // Change this value
    // ...
}
```

### 4. Change Colors

Edit `src/config/ui-config.js`:

```javascript
// Example: Change HUD background color
HUD: {
    BACKGROUND_COLOR: 0x1a1a2e,  // Change this hex value
    // ...
}
```

## Base Resolution

The game is designed for **1920×1080** resolution. All UI values are scaled proportionally for other resolutions using `getScaledValue()`.

To change the base resolution, edit:
- `src/config/ui-config.js` → `SCALING.BASE_WIDTH` and `SCALING.BASE_HEIGHT`
- `src/config/scene-config.js` → `VIEWPORT.DEFAULT_WIDTH` and `VIEWPORT.DEFAULT_HEIGHT`
- `src/main.js` → Default width and height

## UI System Architecture

### Active System

**GameSceneUI** (`src/scenes/core/game-scene-ui.js`)
- ✅ Uses `UI_CONFIG` for all values
- ✅ Uses `getScaledValue()` for responsive scaling
- ✅ Single source of truth
- ✅ Easy to adjust

### Legacy Code (Not Used)

**GameUIManager** (`src/scenes/ui/game-ui-manager.js`)
- ⚠️ Legacy code with hardcoded values
- ⚠️ Not actively used
- ⚠️ Only referenced in archived `game-world.js`

## Key Files

### Configuration
- `src/config/ui-config.js` - **Main UI configuration (edit this!)**
- `src/config/scene-config.js` - Scene-level configuration

### Implementation
- `src/scenes/core/game-scene-ui.js` - Active UI system
- `src/scenes/core/game-scene-combat.js` - Combat UI (uses config)

### Utilities
- `src/utils/ui-config-integration.js` - Helper functions for config
- `src/config/ui-config.js` - Exports `getScaledValue()` function

## Common Adjustments

### Move Party Frames
```javascript
// In ui-config.js
PARTY_FRAMES: {
    LEFT_MARGIN: 28,    // Distance from left
    START_Y: 141,       // Distance from top
}
```

### Resize Action Bar Buttons
```javascript
// In ui-config.js
ACTION_BAR: {
    BUTTON_SIZE: 66,   // Button width/height
    BUTTON_SPACING: 8,  // Space between buttons
}
```

### Change HUD Height
```javascript
// In ui-config.js
HUD: {
    HEIGHT: 53,  // HUD bar height
}
```

### Adjust Combat Log
```javascript
// In ui-config.js
COMBAT_LOG: {
    WIDTH: 788,   // Log width
    HEIGHT: 225,  // Log height
}
```

## Best Practices

1. **Always edit `ui-config.js`** - Never hardcode values in implementation files
2. **Use `getScaledValue()`** - For responsive scaling in code
3. **Test at 1920×1080** - Base resolution for all values
4. **Keep values proportional** - When scaling, maintain aspect ratios

## Troubleshooting

### UI elements don't scale correctly
- Check that `getScaledValue()` is being used
- Verify `SCALING.BASE_WIDTH` and `SCALING.BASE_HEIGHT` are correct

### UI elements are in wrong position
- Check margin/offset values in `ui-config.js`
- Verify screen dimensions match base resolution

### Fonts are too small/large
- Adjust font sizes in `ui-config.js`
- Check that `getScaledValue()` is applied to font sizes

## Summary

**To adjust UI: Edit `src/config/ui-config.js`**

Everything else is handled automatically through the config system!








# UI Hardcoded Values Migration Plan

**Status**: Planning Phase  
**Created**: January 1, 2026  
**Priority**: High - Improves maintainability and resolution scaling

## Executive Summary

This document outlines a comprehensive plan to migrate all hardcoded UI values to the centralized `UI_CONFIG` system. The migration will improve maintainability, enable proper resolution scaling, and ensure consistent UI behavior across different screen sizes.

## Current State Analysis

### ✅ What's Already Using Config
- `src/scenes/core/game-scene-ui.js` - Main UI system uses `UI_CONFIG` properly
- `src/config/ui-config.js` - Comprehensive config system exists (1920×1080 base)
- `src/config/scene-config.js` - Scene-level config exists

### ⚠️ What Needs Migration

#### Priority 1: Combat UI (High Impact)
- `src/scenes/core/game-scene-combat.js` - Combat panels, buttons, indicators
- `src/scenes/ui/combat-ui-manager.js` - Tactics panel, threat display, damage numbers

#### Priority 2: Game Scene (Medium Impact)
- `src/scenes/game-scene.js` - Starting positions, intervals

#### Priority 3: Menu Scenes (Low Impact)
- Various menu scenes with hardcoded padding/spacing

## Migration Strategy

### Phase 1: Extend UI_CONFIG with Combat UI Sections

Add new configuration sections to `src/config/ui-config.js`:

```javascript
// Add to UI_CONFIG object
COMBAT_UI: {
    // Combat Indicator
    INDICATOR: {
        WIDTH: 375,              // Scaled for 1920x1080
        HEIGHT: 56,              // Scaled for 1920x1080
        Y_OFFSET: -141,           // From bottom (scaled)
        FONT_SIZE: 25,            // Scaled from 18
        STROKE_THICKNESS: 3,      // Scaled from 2
        BACKGROUND_COLOR: 0x440000,
        BORDER_COLOR: 0xff0000,
        BACKGROUND_ALPHA: 0.8
    },
    
    // Combat Tactics Panel
    TACTICS_PANEL: {
        WIDTH: 350,
        HEIGHT: 220,
        Y_OFFSET: -100,           // From center
        TITLE_Y_OFFSET: -85,
        TITLE_FONT_SIZE: 20,
        CURRENT_TEXT_Y_OFFSET: -45,
        CURRENT_TEXT_FONT_SIZE: 14,
        BUTTON_WIDTH: 100,
        BUTTON_HEIGHT: 35,
        BUTTON_SPACING: 110,      // Horizontal spacing between buttons
        BUTTON_Y_POSITION: 35,
        THREAT_BUTTON_Y_OFFSET: 85,
        THREAT_BUTTON_WIDTH: 200,
        THREAT_BUTTON_HEIGHT: 35,
        BACKGROUND_COLOR: 0x1a1a2e,
        BORDER_COLOR: 0xc9aa71,
        BORDER_WIDTH: 3
    },
    
    // Threat Display Panel
    THREAT_DISPLAY: {
        WIDTH: 180,
        HEIGHT: 160,
        X_OFFSET: -10,            // From right edge
        TITLE_Y_OFFSET: -65,      // From top (panelHeight/2 - 15)
        TITLE_FONT_SIZE: 14,
        BAR_Y_START: -35,
        BAR_SPACING: 24,
        BAR_HEIGHT: 18,
        BAR_WIDTH: 150
    },
    
    // Consumables Panel
    CONSUMABLES_PANEL: {
        WIDTH: 450,
        HEIGHT: 350,
        TITLE_Y_OFFSET: -80,
        ITEM_START_Y: -80,
        ITEM_SPACING: 60,
        ITEM_Y_OFFSET: -80,
        BUTTON_WIDTH: 60,
        BUTTON_HEIGHT: 30,
        BUTTON_FONT_SIZE: 12,
        CLOSE_BUTTON_WIDTH: 30,
        CLOSE_BUTTON_HEIGHT: 30,
        CLOSE_BUTTON_FONT_SIZE: 16
    },
    
    // Damage Numbers
    DAMAGE_NUMBERS: {
        FONT_SIZE: 24,
        DURATION: 1200,
        RISE_DISTANCE: 60,
        CRITICAL_SCALE: 1.5,
        CRITICAL_COLOR: '#ff6b6b'
    },
    
    // Combat Events
    COMBAT_EVENTS: {
        ABILITY_PROC: { color: '#ffd93d', scale: 1.2 },
        ENEMY_DEFEAT: { color: '#ff4757', scale: 1.4, duration: 800 },
        HERO_DEFEAT: { color: '#3742fa', scale: 1.1, duration: 600 },
        HEALING: { color: '#2ed573', scale: 1.1 }
    }
},

// Game Scene Settings
GAME_SCENE: {
    STARTING_POSITION: {
        X: 240,
        Y_OFFSET: 100            // From center
    },
    UPDATE_INTERVALS: {
        PERFORMANCE_CHECK: 60000,  // 60 seconds
        AUTO_SAVE: 30000,          // 30 seconds
        UI_UPDATE: 100,             // 100ms
        WORLD_UPDATE: 16,           // 16ms (60fps)
        COMBAT_UPDATE: 16          // 16ms (60fps)
    }
}
```

### Phase 2: Create Helper Functions

Add utility functions to `src/config/ui-config.js`:

```javascript
/**
 * Get combat UI config value with scaling
 * @param {string} path - Config path (e.g., 'TACTICS_PANEL.WIDTH')
 * @param {number} screenWidth - Current screen width
 * @param {string} type - Scaling type ('width', 'height', 'font')
 * @returns {number} Scaled value
 */
export function getCombatUIConfig(path, screenWidth, type = 'width') {
    const keys = path.split('.');
    let value = UI_CONFIG.COMBAT_UI;
    
    for (const key of keys) {
        value = value?.[key];
        if (value === undefined) return null;
    }
    
    if (typeof value === 'number') {
        return getScaledValue(value, screenWidth, type);
    }
    
    return value;
}

/**
 * Get game scene config value
 * @param {string} path - Config path
 * @returns {*} Config value
 */
export function getGameSceneConfig(path) {
    const keys = path.split('.');
    let value = UI_CONFIG.GAME_SCENE;
    
    for (const key of keys) {
        value = value?.[key];
        if (value === undefined) return null;
    }
    
    return value;
}
```

### Phase 3: Migration Steps by File

#### File 1: `src/scenes/core/game-scene-combat.js`

**Current Hardcoded Values:**
- Line 59-66: Combat indicator frame sizes (375, 56, 141)
- Line 76: Font size (25)
- Line 85: Stroke thickness (3)
- Line 247: Panel width (350)
- Line 291-315: Button sizes (100, 200, 30, 35)
- Line 373-374: Panel sizes (450, 350)
- Line 400-401: Item spacing (60, -80)
- Line 614: Strategy button (350, 40)

**Migration Steps:**

1. **Import config:**
```javascript
import { UI_CONFIG, getScaledValue, getCombatUIConfig } from '../../config/ui-config.js';
```

2. **Replace combat indicator:**
```javascript
// OLD:
const config = this.scene.uiModule?.scene?.scale ? {
    frameWidth: 375,
    frameHeight: 56,
    frameY: height - 141
} : {
    frameWidth: 200,
    frameHeight: 40,
    frameY: height - 100
};

// NEW:
const width = this.scene.scale.width;
const indicatorConfig = UI_CONFIG.COMBAT_UI.INDICATOR;
const frameWidth = getScaledValue(indicatorConfig.WIDTH, width);
const frameHeight = getScaledValue(indicatorConfig.HEIGHT, width, 'height');
const frameY = height + getScaledValue(indicatorConfig.Y_OFFSET, width, 'height');
```

3. **Replace font sizes:**
```javascript
// OLD:
const fontSize = getScaledValue(25, width);

// NEW:
const fontSize = getScaledValue(UI_CONFIG.COMBAT_UI.INDICATOR.FONT_SIZE, width, 'font');
```

4. **Replace panel sizes:**
```javascript
// OLD:
const panelWidth = 350;

// NEW:
const panelWidth = getScaledValue(UI_CONFIG.COMBAT_UI.TACTICS_PANEL.WIDTH, width);
```

#### File 2: `src/scenes/ui/combat-ui-manager.js`

**Current Hardcoded Values:**
- Line 38-49: Damage number settings
- Line 45-49: Combat event settings
- Line 62-65: Tactics panel (350, 220, -100)
- Line 81-86: Title positioning (-85, fontSize: 20)
- Line 98-100: Current text (-45, fontSize: 14)
- Line 109-110: Button sizes (100, 35)
- Line 118: Button spacing (110)
- Line 146-148: Threat button (85, 200, 35)
- Line 237-239: Threat display panel (180, 160, -10)

**Migration Steps:**

1. **Import config:**
```javascript
import { UI_CONFIG, getScaledValue, getCombatUIConfig } from '../../config/ui-config.js';
```

2. **Replace damage number settings:**
```javascript
// OLD:
this.damageNumberSettings = {
    fontSize: 24,
    duration: 1200,
    riseDistance: 60,
    criticalScale: 1.5,
    criticalColor: '#ff6b6b'
};

// NEW:
const width = this.scene.scale.width;
const damageConfig = UI_CONFIG.COMBAT_UI.DAMAGE_NUMBERS;
this.damageNumberSettings = {
    fontSize: getScaledValue(damageConfig.FONT_SIZE, width, 'font'),
    duration: damageConfig.DURATION,
    riseDistance: getScaledValue(damageConfig.RISE_DISTANCE, width, 'height'),
    criticalScale: damageConfig.CRITICAL_SCALE,
    criticalColor: damageConfig.CRITICAL_COLOR
};
```

3. **Replace combat event settings:**
```javascript
// OLD:
this.combatEventSettings = {
    abilityProc: { color: '#ffd93d', scale: 1.2 },
    enemyDefeat: { color: '#ff4757', scale: 1.4, duration: 800 },
    // ...
};

// NEW:
this.combatEventSettings = UI_CONFIG.COMBAT_UI.COMBAT_EVENTS;
```

4. **Replace tactics panel:**
```javascript
// OLD:
const panelWidth = 350;
const panelHeight = 220;
const panelY = height / 2 - 100;

// NEW:
const width = this.scene.cameras.main.width;
const tacticsConfig = UI_CONFIG.COMBAT_UI.TACTICS_PANEL;
const panelWidth = getScaledValue(tacticsConfig.WIDTH, width);
const panelHeight = getScaledValue(tacticsConfig.HEIGHT, width, 'height');
const panelY = height / 2 + getScaledValue(tacticsConfig.Y_OFFSET, width, 'height');
```

5. **Replace button sizes:**
```javascript
// OLD:
const buttonWidth = 100;
const buttonHeight = 35;

// NEW:
const buttonWidth = getScaledValue(tacticsConfig.BUTTON_WIDTH, width);
const buttonHeight = getScaledValue(tacticsConfig.BUTTON_HEIGHT, width, 'height');
```

#### File 3: `src/scenes/game-scene.js`

**Current Hardcoded Values:**
- Line 105: Starting position (x: 240, y: height/2 + 100)
- Line 142: Check interval (60000)
- Line 388: Delay (100)

**Migration Steps:**

1. **Import config:**
```javascript
import { UI_CONFIG, getGameSceneConfig } from '../config/ui-config.js';
```

2. **Replace starting position:**
```javascript
// OLD:
const startingPos = { x: 240, y: this.scale.height / 2 + 100 };

// NEW:
const startConfig = UI_CONFIG.GAME_SCENE.STARTING_POSITION;
const startingPos = {
    x: getScaledValue(startConfig.X, this.scale.width),
    y: this.scale.height / 2 + getScaledValue(startConfig.Y_OFFSET, this.scale.width, 'height')
};
```

3. **Replace intervals:**
```javascript
// OLD:
checkInterval: 60000,

// NEW:
checkInterval: getGameSceneConfig('UPDATE_INTERVALS.PERFORMANCE_CHECK'),
```

## Implementation Checklist

### Step 1: Extend UI_CONFIG (1-2 hours)
- [ ] Add `COMBAT_UI` section to `ui-config.js`
- [ ] Add `GAME_SCENE` section to `ui-config.js`
- [ ] Add helper functions (`getCombatUIConfig`, `getGameSceneConfig`)
- [ ] Test config loading

### Step 2: Migrate Combat UI (2-3 hours)
- [ ] Update `game-scene-combat.js` imports
- [ ] Replace combat indicator values
- [ ] Replace panel sizes
- [ ] Replace button sizes
- [ ] Replace font sizes
- [ ] Test combat UI at different resolutions

### Step 3: Migrate Combat UI Manager (2-3 hours)
- [ ] Update `combat-ui-manager.js` imports
- [ ] Replace damage number settings
- [ ] Replace combat event settings
- [ ] Replace tactics panel values
- [ ] Replace threat display values
- [ ] Replace consumables panel values
- [ ] Test all combat UI panels

### Step 4: Migrate Game Scene (1 hour)
- [ ] Update `game-scene.js` imports
- [ ] Replace starting position
- [ ] Replace update intervals
- [ ] Test game startup

### Step 5: Testing & Validation (2-3 hours)
- [ ] Test at 1920×1080 (base resolution)
- [ ] Test at 1280×720 (small)
- [ ] Test at 2560×1440 (large)
- [ ] Test windowed fullscreen
- [ ] Verify all UI elements scale properly
- [ ] Check for visual regressions

### Step 6: Documentation (1 hour)
- [ ] Update `docs/ui-system-guide.md`
- [ ] Document new config sections
- [ ] Add examples for future developers

## Testing Strategy

### Resolution Testing Matrix

| Resolution | Width | Height | Expected Behavior |
|------------|-------|--------|-------------------|
| Base | 1920 | 1080 | All UI elements at designed size |
| Small | 1280 | 720 | UI scales down proportionally |
| Medium | 1600 | 900 | UI scales proportionally |
| Large | 2560 | 1440 | UI scales up proportionally |
| Ultra-wide | 3440 | 1440 | UI scales width, maintains aspect |

### Test Cases

1. **Combat Indicator**
   - [ ] Appears at correct position
   - [ ] Scales with resolution
   - [ ] Text readable at all resolutions

2. **Combat Tactics Panel**
   - [ ] Panel size scales correctly
   - [ ] Buttons maintain spacing
   - [ ] Text readable
   - [ ] Centered properly

3. **Threat Display**
   - [ ] Panel positioned correctly
   - [ ] Bars scale properly
   - [ ] Text readable

4. **Damage Numbers**
   - [ ] Font size scales
   - [ ] Animation distance scales
   - [ ] Critical hits visible

5. **Game Scene**
   - [ ] Starting position scales
   - [ ] Update intervals work correctly

## Risk Assessment

### Low Risk
- Adding new config sections (non-breaking)
- Helper functions (additive only)

### Medium Risk
- Replacing hardcoded values (could break if config missing)
- Resolution scaling (could cause visual issues)

### Mitigation Strategies
1. **Backward Compatibility**: Keep fallback values in code
2. **Gradual Migration**: Migrate one file at a time
3. **Comprehensive Testing**: Test at multiple resolutions
4. **Code Review**: Review all changes before merging

## Success Criteria

✅ **Migration Complete When:**
- All hardcoded UI values moved to config
- All files use `getScaledValue()` or config helpers
- UI scales properly at all tested resolutions
- No visual regressions
- Code is maintainable and consistent

## Timeline Estimate

- **Phase 1** (Config Extension): 1-2 hours
- **Phase 2** (Combat UI Migration): 2-3 hours
- **Phase 3** (Combat UI Manager): 2-3 hours
- **Phase 4** (Game Scene): 1 hour
- **Phase 5** (Testing): 2-3 hours
- **Phase 6** (Documentation): 1 hour

**Total Estimated Time**: 9-13 hours

## Post-Migration Benefits

1. **Maintainability**: All UI values in one place
2. **Scalability**: Easy to adjust for different resolutions
3. **Consistency**: Uniform scaling across all UI elements
4. **Flexibility**: Easy to add new UI elements
5. **Testing**: Easier to test at different resolutions

## Future Enhancements

After migration, consider:
1. **Resolution Presets**: User-selectable resolution options
2. **UI Scale Slider**: User-adjustable UI scale (0.8x - 1.5x)
3. **Config Validation**: Runtime validation of config values
4. **Config Editor**: Visual tool to adjust UI config
5. **Responsive Breakpoints**: Different layouts for different screen sizes

## Notes

- All values in config are scaled for 1920×1080 base resolution
- Use `getScaledValue()` for all numeric values that need scaling
- Keep non-scaling values (colors, durations) as-is in config
- Document any special scaling considerations in code comments

---

**Next Steps**: Review this plan, then proceed with Phase 1 (Extend UI_CONFIG)














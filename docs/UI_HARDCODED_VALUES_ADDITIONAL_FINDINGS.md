# Additional Hardcoded UI Values Found

**Created:** January 1, 2026  
**Status:** Additional findings from comprehensive search

## Summary

After a comprehensive search for hardcoded UI values, I found and migrated many additional hardcoded values beyond the initial migration plan. This document tracks the additional findings and their migration status.

## Files Migrated (Phase 2)

### ✅ `src/scenes/ui/encounter-ui-manager.js`
**Status:** MIGRATED

**Hardcoded Values Found:**
- Resource panel: `400x220`, font sizes `20`, `14`, `16`, button sizes `120x40`, spacing `160`
- Exploration panel: `500x280`, font sizes `20`, `14`, `16`, button sizes `180x40`
- Choice panel: `600x350`, font sizes `22`, `14`, `16`, button sizes `240x60`, spacing `140`

**Migration:**
- Added `UI_CONFIG.ENCOUNTER_UI` section with `RESOURCE_PANEL`, `EXPLORATION_PANEL`, `CHOICE_PANEL`
- All panel dimensions, font sizes, button sizes, and spacing now use `getScaledValue()` with config

### ✅ `src/scenes/ui/consumables-ui-manager.js`
**Status:** MIGRATED

**Hardcoded Values Found:**
- Panel size: `400x350`
- Title font size: `20`
- Item spacing: `60`
- Icon sizes: `40x40`
- Font sizes: `24`, `14`, `11`, `12`

**Migration:**
- Uses existing `UI_CONFIG.COMBAT_UI.CONSUMABLES_PANEL` (already defined)
- Panel dimensions and spacing now use `getScaledValue()` with config

### ✅ `src/scenes/core/game-scene-ui.js`
**Status:** PARTIALLY MIGRATED

**Hardcoded Values Found:**
- Progression panel: `300x250`, font sizes `20`, `14`, `16`, close button `30x30`
- Help panel: `400x300`, font sizes `18`, `14`, `12`, spacing `22`, offsets `-170`, `-110`, `125`
- Progress bar: `300` width, `8` height

**Migration:**
- Added `UI_CONFIG.PROGRESSION_PANEL` section
- Added `UI_CONFIG.HELP_PANEL` section
- Added `UI_CONFIG.COMMON.PROGRESS_BAR` section
- All values now use `getScaledValue()` with config

### ✅ `src/scenes/core/game-scene-combat.js`
**Status:** MIGRATED

**Hardcoded Values Found:**
- Regeneration menu: `400x300`, font sizes `20`, `14`, `16`, button sizes `350x40`, spacing `50`, close button `30x30`

**Migration:**
- Added `UI_CONFIG.REGENERATION_MENU` section
- All values now use `getScaledValue()` with config

### ✅ `src/scenes/game-scene.js`
**Status:** MIGRATED

**Hardcoded Values Found:**
- Statistics update interval: `5000` (5 seconds)

**Migration:**
- Added `UI_CONFIG.GAME_SCENE.UPDATE_INTERVALS.STATISTICS_UPDATE`
- Now uses config value

## Files Still Needing Migration (Phase 3)

### ⏳ `src/scenes/main-menu.js`
**Hardcoded Values:**
- Base resolution: `1024x768` (conflicts with 1920x1080 base)
- Font sizes: `52`, `22`, `12` (scaled from base)
- Button positions: Percentage-based (`0.82`, `0.25`)
- Version text position: `width - 10, height - 10`

**Priority:** Medium (menu scenes are less critical for gameplay)

### ⏳ `src/scenes/character-creation.js`
**Hardcoded Values:**
- Font sizes: `42`, `16`, `18`, `14`, `12`, `13`
- Panel sizes: `180`, `440`
- Button sizes: `220x45`
- Button positions: Percentage-based
- Spacing: `100`, `20`, `10`, `30`

**Priority:** Medium (character creation is one-time use)

### ⏳ `src/scenes/talent-allocation.js`
**Hardcoded Values:**
- Talent size: `45`
- Talent spacing: `60`
- Max columns: `4`
- Font sizes: Calculated from height (`height / 32`)

**Priority:** Low (talent allocation is infrequent)

### ⏳ Menu Scenes (Options, Save/Load, Prestige, Statistics, Achievements, Credits)
**Hardcoded Values:**
- Padding: `{ x: 20, y: 10 }`, `{ x: 20, y: 8 }`, `{ x: 10, y: 5 }`
- Font sizes: `16px Arial`, `14px Arial`, `12px Arial`, `20px Arial`, `18px Arial`
- Spacing: `150`, `60`, `80`
- Section spacing: `height / 4.5`

**Priority:** Low (menu scenes are less critical)

## New UI_CONFIG Sections Added

1. **`UI_CONFIG.ENCOUNTER_UI`** - Resource, exploration, and choice encounter panels
2. **`UI_CONFIG.PROGRESSION_PANEL`** - Progression display panel
3. **`UI_CONFIG.HELP_PANEL`** - Keyboard shortcuts help panel
4. **`UI_CONFIG.REGENERATION_MENU`** - Regeneration strategy selection menu
5. **`UI_CONFIG.COMMON`** - Shared UI elements (close buttons, padding, progress bars)
6. **`UI_CONFIG.GAME_SCENE.UPDATE_INTERVALS.STATISTICS_UPDATE`** - Statistics update interval

## Migration Statistics

- **Files Migrated:** 5
- **New Config Sections:** 6
- **Hardcoded Values Removed:** ~50+
- **Remaining Files:** ~10 (mostly menu scenes)

## Next Steps

1. **Phase 3:** Migrate menu scenes (lower priority)
2. **Testing:** Verify all migrated UI scales correctly at different resolutions
3. **Documentation:** Update UI_CONFIG comments with scaling notes
4. **Review:** Check for any missed hardcoded values in utility functions

## Notes

- All migrated values now use `getScaledValue()` for proper resolution scaling
- Base resolution remains `1920x1080` as defined in `UI_CONFIG.SCALING`
- Menu scenes can be migrated incrementally as they are less critical for gameplay
- Some menu scenes use percentage-based positioning which is already responsive







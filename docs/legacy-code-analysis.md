# Legacy Code Analysis & Removal Plan

## Summary

This document identifies legacy code that can be safely removed to simplify the codebase.

## Confirmed Legacy Code (Safe to Remove)

### 1. ✅ `src/scenes/archive/game-world.js` (7775 lines)
**Status**: Archived, not used
**References**: Only self-references
**Action**: ✅ Safe to delete entire archive folder

**Verification**:
- No imports from `archive/` directory found
- Only referenced within itself
- Replaced by modular `GameScene` architecture

### 2. ⚠️ `src/scenes/ui/game-ui-manager.js` (1829 lines)
**Status**: Legacy UI system, replaced by `GameSceneUI`
**References**: 
- Only in `src/scenes/archive/game-world.js` (archived)
- One reference in `src/utils/gameplay-state-replay.js` (needs update)
**Action**: ⚠️ Remove after updating `gameplay-state-replay.js`

**Why it's legacy**:
- Replaced by `GameSceneUI` which uses `UI_CONFIG`
- Has hardcoded values instead of config
- Not used in active codebase

### 3. ⚠️ `src/controllers/game-ui-controller.js` (566 lines)
**Status**: Possibly unused abstraction layer
**References**: Only in `src/scenes/archive/game-world.js` (archived)
**Action**: ⚠️ Verify not used, then remove

**Why it might be legacy**:
- Only referenced in archived code
- `GameSceneUI` handles UI directly
- May be duplicate functionality

## Potentially Unused Code (Needs Verification)

### 4. `src/utils/gameplay-state-replay.js`
**Status**: Used in `GameSceneCore`
**References**: 
- `src/scenes/core/game-scene-core.js` (line 416)
- References `gameUIManager` which doesn't exist in active system
**Action**: ⚠️ Update to use `uiModule` instead of `gameUIManager`, or remove if not needed

**Issue**: References `this.scene.gameUIManager` which doesn't exist in active system

## Removal Plan

### Phase 1: Safe Removals (No Dependencies)
1. ✅ Delete `src/scenes/archive/` folder entirely
   - Contains only `game-world.js` (archived code)
   - No active references

### Phase 2: Update Dependencies
2. ⚠️ Update `src/utils/gameplay-state-replay.js`
   - Replace `this.scene.gameUIManager` with `this.scene.uiModule`
   - Or remove if replay system not needed

### Phase 3: Remove Legacy Files
3. ⚠️ Delete `src/scenes/ui/game-ui-manager.js`
   - After updating `gameplay-state-replay.js`
   - No other active references

4. ⚠️ Delete `src/controllers/game-ui-controller.js`
   - After verifying it's not used
   - Only referenced in archived code

## Files to Keep (Active)

### ✅ Active UI System
- `src/scenes/core/game-scene-ui.js` - Active UI system (uses UI_CONFIG)
- `src/scenes/core/game-scene-combat.js` - Combat UI (uses config)

### ✅ Active Scene System
- `src/scenes/game-scene.js` - Main game scene
- `src/scenes/core/game-scene-core.js` - Core scene logic
- `src/scenes/core/game-scene-update.js` - Update loop

## Impact Assessment

### Removing Archive Folder
- ✅ **No impact** - Not referenced anywhere
- ✅ **Reduces confusion** - Clear what's active
- ✅ **Reduces codebase size** - ~7775 lines removed

### Removing GameUIManager
- ⚠️ **Requires update** - `gameplay-state-replay.js` needs fix
- ✅ **No functional impact** - Not used in active code
- ✅ **Reduces confusion** - Single UI system
- ✅ **Reduces codebase size** - ~1829 lines removed

### Removing GameUIController
- ⚠️ **Needs verification** - Check if used anywhere
- ✅ **Likely no impact** - Only in archived code
- ✅ **Reduces codebase size** - ~566 lines removed

## Total Potential Reduction

- Archive folder: ~7775 lines
- GameUIManager: ~1829 lines
- GameUIController: ~566 lines
- **Total: ~10,170 lines** of legacy code

## Recommendations

1. **Immediate**: Delete `src/scenes/archive/` folder (safe, no dependencies)
2. **Next**: Update `gameplay-state-replay.js` to use `uiModule`
3. **Then**: Remove `game-ui-manager.js` after dependency update
4. **Finally**: Verify and remove `game-ui-controller.js` if unused

## Verification Commands

```bash
# Check for archive references
grep -r "archive" src/ --exclude-dir=archive

# Check for GameUIManager references
grep -r "GameUIManager\|game-ui-manager" src/ --exclude-dir=archive

# Check for GameUIController references
grep -r "GameUIController\|game-ui-controller" src/ --exclude-dir=archive
```








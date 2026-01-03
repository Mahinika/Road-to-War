# Hero Behavior Debug Analysis

## Date: 2025-12-29

## Potential Issues Identified

### 1. **Hero Sprite Creation and Positioning**

#### Issue: All heroes use the same texture
- **Location**: `game-world.js:4222-4232`
- **Problem**: All 5 heroes are using the same texture key `'paladin_dynamic_party'`
- **Impact**: Heroes look identical, making it hard to distinguish them
- **Fix Needed**: Each hero should use their own texture based on their class

```javascript
// Current code (line 4222):
const textureKey = 'paladin_dynamic_party';

// Should be:
const textureKey = `${classId}_dynamic_${hero.id}`;
```

#### Issue: Hero positioning might cause overlap
- **Location**: `game-world.js:4186-4196`
- **Problem**: Horizontal spacing is 120px, but with special offset for hero_3 (-20x, -20y)
- **Impact**: hero_3 might overlap with adjacent heroes
- **Current spacing**: 120px horizontal, 20px vertical alternating
- **Fix Needed**: Verify spacing is sufficient for all hero sizes (40x60)

### 2. **Hero Movement Issues**

#### Issue: Only tank (hero_0) has physics body
- **Location**: `game-world.js:4607-4610` in `setupPrimaryHeroAndCamera()`
- **Problem**: Only the primary hero (tank) gets a physics body
- **Impact**: Other heroes cannot move using physics, only via sprite position updates
- **Code**:
```javascript
// Add physics body to primary hero if it doesn't have one (required for movement)
if (!this.hero.body) {
    this.physics.add.existing(this.hero);
}
```
- **Fix Needed**: All heroes need physics bodies for proper movement

#### Issue: Movement manager might not be updating all heroes
- **Location**: `game-world.js:7363` in `_orphanedCodeBlock()`
- **Problem**: Movement logic is in an orphaned code block that's never called
- **Impact**: Heroes might not move at all or move incorrectly
- **Fix Needed**: Integrate orphaned movement code into proper update methods

### 3. **Hero Rendering and Visibility**

#### Issue: Depth ordering might hide heroes
- **Location**: `game-world.js:4317-4329`
- **Problem**: Complex depth calculation that might cause heroes to render behind each other
- **Current logic**:
  - Tank: depth 1050 (highest)
  - Center hero (hero_3): depth 1040
  - Other heroes: depth based on index (1010, 1020, 1030)
- **Impact**: Heroes might be hidden behind each other
- **Fix Needed**: Verify depth values don't cause occlusion

#### Issue: Sprite destroy protection might prevent cleanup
- **Location**: `game-world.js:4343-4359`
- **Problem**: Sprites are protected from destruction, which might cause memory leaks
- **Impact**: Old sprites might persist when they shouldn't
- **Fix Needed**: Review destroy protection logic

### 4. **Camera Follow Issues**

#### Issue: Camera follows wrong hero
- **Location**: `game-world.js:4614`
- **Problem**: Comment says "TEST: Following hero_1 sprite instead of tank sprite"
- **Code**:
```javascript
// TEST: Following hero_1 sprite instead of tank sprite
const followSprite = this.hero; // This is now hero_1, not tank
```
- **Impact**: Camera might not follow the intended hero
- **Fix Needed**: Clarify which hero should be followed and update accordingly

#### Issue: Multiple camera positioning attempts
- **Location**: `game-world.js:4461-4474, 4632-4644, 4593-4604`
- **Problem**: Camera position is set multiple times in different places
- **Impact**: Camera might jump around or not settle on correct position
- **Fix Needed**: Consolidate camera positioning logic

### 5. **Hero Data Initialization**

#### Issue: Hero data might be initialized multiple times
- **Location**: `game-world.js:4488-4510`
- **Problem**: Hero data is initialized in `setupPartyHeroesVertical()` after sprites are created
- **Impact**: Data might overwrite existing hero data from PartyManager
- **Fix Needed**: Verify hero data is only initialized once

### 6. **Animation Issues**

#### Issue: Animations might not play correctly
- **Location**: `game-world.js:4385-4404`
- **Problem**: Animations are initialized after texture is ready, but might fail if texture isn't ready
- **Impact**: Heroes might appear static or use wrong animations
- **Fix Needed**: Add better error handling for animation initialization

### 7. **Update Loop Issues**

#### Issue: Hero movement code is orphaned
- **Location**: `game-world.js:7101-7642` (`_orphanedCodeBlock()`)
- **Problem**: Critical hero movement and update logic is in an unused method
- **Impact**: Heroes don't move or update properly
- **Fix Needed**: **CRITICAL** - Move this code into the proper update method

#### Issue: No hero sprite position updates in main update loop
- **Location**: `game-world.js:6933-6984` (update method)
- **Problem**: Update method doesn't update hero sprite positions
- **Impact**: Heroes don't move even if movement manager calculates positions
- **Fix Needed**: Add hero position update logic to update method

## Critical Fixes Needed (Priority Order)

1. **CRITICAL**: Move orphaned hero movement code from `_orphanedCodeBlock()` into proper update methods
2. **CRITICAL**: Add physics bodies to all heroes, not just the tank
3. **HIGH**: Fix texture generation so each hero uses their own class-specific texture
4. **HIGH**: Add hero position update logic to main update loop
5. **MEDIUM**: Consolidate camera positioning logic
6. **MEDIUM**: Review and fix depth ordering to prevent occlusion
7. **LOW**: Add better error handling for animation initialization

## Testing Recommendations

1. Check if heroes are visible on screen
2. Check if heroes are moving (should move forward automatically)
3. Check if heroes maintain formation
4. Check if heroes can attack enemies
5. Check console for errors related to heroes
6. Check if camera follows the correct hero
7. Check if heroes respond to combat

## Next Steps

1. Examine the `_orphanedCodeBlock()` method to understand what hero update logic is missing
2. Integrate that logic into the proper update methods
3. Add physics bodies to all heroes
4. Fix texture generation for each hero class
5. Test hero movement and combat

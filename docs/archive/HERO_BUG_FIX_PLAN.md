# CRITICAL HERO BUG FIX PLAN

## Date: 2025-12-29

## ROOT CAUSE IDENTIFIED

### **CRITICAL BUG #1: Hero Movement Code is Never Executed**

**Location**: `game-world.js` lines 7106-7642

**Problem**: All hero movement logic is inside `_orphanedCodeBlock()` method which is NEVER CALLED anywhere in the code.

**Impact**: 
- Heroes don't move at all
- Heroes don't follow the tank in formation
- Heroes don't position themselves for combat
- Party formation doesn't work

**Evidence**:
```javascript
// Line 7106 - This method is never called!
_orphanedCodeBlock() {
    // ... 500+ lines of critical hero movement code ...
    
    // Line 7363 - Hero movement with MovementManager
    if (this.movementManager && this.partyManager && this.partyMemberSprites && this.partyMemberSprites.length > 0) {
        // ... movement logic ...
        const newPositions = this.movementManager.updatePartyPositions(
            party,
            leaderPosition,
            enemy,
            deltaTime
        );
        
        // Apply new positions to sprites
        for (const pos of newPositions) {
            // ... position application ...
        }
    }
}
```

**Fix**: Move this code into the `update()` method or create a proper `updateHeroMovement()` method that gets called from `update()`.

---

### **CRITICAL BUG #2: Only Tank Has Physics Body**

**Location**: `game-world.js` lines 4607-4610

**Problem**: Only the primary hero (tank) gets a physics body added. Other heroes are just sprites without physics.

**Code**:
```javascript
// setupPrimaryHeroAndCamera() - line 4607
// Add physics body to primary hero if it doesn't have one (required for movement)
if (!this.hero.body) {
    this.physics.add.existing(this.hero);
}
```

**Impact**:
- Other heroes can't use physics-based movement
- Collision detection doesn't work for other heroes
- Movement manager can't properly position heroes

**Fix**: Add physics bodies to ALL hero sprites when they're created in `setupPartyHeroesVertical()`.

---

### **HIGH PRIORITY BUG #3: All Heroes Use Same Texture**

**Location**: `game-world.js` lines 4222-4232

**Problem**: All heroes use the same texture key `'paladin_dynamic_party'` regardless of their class.

**Code**:
```javascript
// Line 4222
const textureKey = 'paladin_dynamic_party';

// Line 4225 - Only first hero generates texture
if (i === 0) {
    const generator = new RuntimePaladinGenerator(this);
    const equipment = this.equipmentManager?.getHeroEquipment(hero.id) || {};
    const itemsData = this.cache.json.get('items') || {};
    const generatedKey = generator.generate(equipment, itemsData, classColor, textureKey);
}
// All heroes (including first) will use the same texture key
```

**Impact**:
- All heroes look identical
- Can't visually distinguish between classes
- Warriors, paladins, priests all look the same

**Fix**: Generate unique texture for each hero based on their class:
```javascript
const textureKey = `${classId}_dynamic_${hero.id}`;
```

---

## IMMEDIATE FIX STEPS

### Step 1: Move Orphaned Hero Movement Code

**Action**: Extract hero movement logic from `_orphanedCodeBlock()` and integrate into `update()` method.

**Files to modify**:
- `src/scenes/game-world.js`

**Changes**:
1. Create new method `updateHeroMovement(time, delta)` 
2. Move lines 7107-7641 into this new method
3. Call `this.updateHeroMovement(time, delta)` from `update()` method (line 6933)
4. Remove `_orphanedCodeBlock()` method

### Step 2: Add Physics Bodies to All Heroes

**Action**: Add physics bodies to all hero sprites when created.

**Files to modify**:
- `src/scenes/game-world.js`

**Changes**:
In `setupPartyHeroesVertical()` method, after creating each sprite (around line 4242):
```javascript
const sprite = this.add.sprite(xPos, yPos, placeholderKey);

// ADD THIS:
// Add physics body to ALL heroes for proper movement
this.physics.add.existing(sprite);
if (sprite.body) {
    sprite.body.setCollideWorldBounds(false);
    sprite.body.setSize(40, 60); // Match sprite display size
}
```

### Step 3: Fix Hero Texture Generation

**Action**: Generate unique texture for each hero based on class.

**Files to modify**:
- `src/scenes/game-world.js`

**Changes**:
In `setupPartyHeroesVertical()` method (around line 4222):
```javascript
// OLD:
const textureKey = 'paladin_dynamic_party';

// NEW:
const textureKey = `${classId}_dynamic_${hero.id}`;

// Generate texture for EACH hero, not just first
const generator = new RuntimePaladinGenerator(this);
const equipment = this.equipmentManager?.getHeroEquipment(hero.id) || {};
const itemsData = this.cache.json.get('items') || {};
const generatedKey = generator.generate(equipment, itemsData, classColor, textureKey);
```

---

## TESTING PLAN

After applying fixes:

1. **Test Hero Visibility**
   - All 5 heroes should be visible on screen
   - Heroes should be spaced properly (not overlapping)

2. **Test Hero Movement**
   - Heroes should move forward automatically
   - Heroes should maintain formation behind tank
   - Heroes should not teleport or jump around

3. **Test Combat Positioning**
   - When combat starts, heroes should position themselves around enemy
   - Melee heroes (tank, warriors) should move closer
   - Ranged heroes (healers, casters) should stay back

4. **Test Visual Distinction**
   - Each hero should have unique appearance based on class
   - Warriors should look different from paladins
   - Healers should look different from DPS

5. **Test Physics**
   - Heroes should have collision detection
   - Heroes should not overlap each other
   - Heroes should maintain minimum spacing

---

## IMPLEMENTATION ORDER

1. **FIRST**: Fix orphaned movement code (most critical - heroes don't move without this)
2. **SECOND**: Add physics bodies to all heroes (required for movement to work)
3. **THIRD**: Fix texture generation (visual improvement)

---

## ESTIMATED TIME

- Step 1 (Movement code): 15 minutes
- Step 2 (Physics bodies): 5 minutes  
- Step 3 (Textures): 10 minutes
- Testing: 15 minutes

**Total**: ~45 minutes

---

## RISK ASSESSMENT

**Low Risk**: These are isolated changes that don't affect other systems.

**Rollback Plan**: If issues occur, can revert to current state where heroes are static.

**Dependencies**: None - these fixes are self-contained.

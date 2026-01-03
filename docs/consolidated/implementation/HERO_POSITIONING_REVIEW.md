# Hero Generation and Positioning Code Review

## Overview
This document reviews all code related to hero sprite creation, positioning, and management in the game.

## Key Components

### 1. Initial Setup (`create()` method)
- **Location**: `src/scenes/game-world.js:47-140`
- **Starting Position**: `{ x: 0, y: 0 }` - World coordinates
- **Flow**: 
  1. Gets party manager from registry
  2. Calls `setupPartyHeroesVertical()` with `startingPos = {x: 0, y: 0}`
  3. Calls `setupPrimaryHeroAndCamera()` after party creation
  4. Calls `initializeHeroData()` for hero stats

### 2. Formation Order (`getHeroesInFormationOrder()`)
- **Location**: `src/scenes/game-world.js:1601-1674`
- **Order**: [Healer(0), DPS1(1), DPS2(2), DPS3(3), Tank(4)]
- **Returns**: Array of 5 heroes in formation order
- **Issues Found**:
  - Complex fallback logic if role lookup fails
  - May return fewer than 5 heroes if roles are misidentified

### 3. Sprite Creation (`setupPartyHeroesVertical()`)
- **Location**: `src/scenes/game-world.js:1679-2015`
- **Key Variables**:
  - `horizontalSpacing = 120` (increased from 60)
  - `verticalOffset = 20`
  - `startX = startingPos.x` (0)
  - `startY = startingPos.y` (0)

#### Position Calculation (Lines 1743-1770)
```javascript
const centerIndex = (orderedHeroes.length - 1) / 2; // 2.0 for 5 heroes
const isCenterHero = i === Math.floor(centerIndex); // Index 2
let xOffset = (i - centerIndex) * horizontalSpacing;
let yOffset = (i % 2) * verticalOffset;

// SPECIAL CASE FOR HERO_3 (center hero)
if (isCenterHero) {
    xOffset -= 20; // Move left by 20
    yOffset -= 20; // Move up by 20
}

const xPos = startX + xOffset; // World position
const yPos = startY - yOffset; // World position
```

**Calculated Positions**:
- Hero 1 (Healer, i=0): xOffset = -240, xPos = -240, yPos = 0
- Hero 2 (DPS1, i=1): xOffset = -120, xPos = -120, yPos = -20
- Hero 3 (DPS2, i=2): xOffset = -20, xPos = -20, yPos = -20 ⚠️ SPECIAL OFFSET
- Hero 4 (DPS3, i=3): xOffset = 120, xPos = 120, yPos = 0
- Hero 5 (Tank, i=4): xOffset = 240, xPos = 240, yPos = -20

#### Sprite Creation (Lines 1791-1905)
- Creates `Phaser.GameObjects.Rectangle` at calculated position
- Size: 40x60 (except hero_3 which is 60x80 with scale 1.5 for debugging)
- Origin: (0.5, 0.5) - centered
- **All sprites use WORLD coordinates**

#### Depth Assignment (Lines 1817-1838)
- Base depth: 1000
- Depth increment: 10
- **Depth values**:
  - Hero 1 (Healer): 1000
  - Hero 2 (DPS1): 1010
  - Hero 3 (DPS2): 1040 ⚠️ Special depth (below tank)
  - Hero 4 (DPS3): 1030
  - Hero 5 (Tank): 1050 (highest - renders on top)

#### Protection System (Lines 1876-1894)
- All hero sprites have `destroy()` method overridden
- Protection flags: `isPartyMember`, `protected`, `heroId`, `heroIndex`
- Center hero has additional protection

#### Sprite Storage (Lines 1915-1920)
```javascript
this.partyMemberSprites.push({
    sprite: sprite,
    hero: hero,
    xOffset: xOffset,
    yOffset: yOffset
});
```

### 4. Camera Setup (`setupPrimaryHeroAndCamera()`)
- **Location**: `src/scenes/game-world.js:2017-2070`
- **Key Points**:
  - Sets `this.hero` to tank sprite (hero_0)
  - Camera follows tank sprite, NOT center hero
  - Uses offset to center party in viewport

### 5. Update Loop (`update()` method)
- **Location**: `src/scenes/game-world.js:3974-4020`
- **Checks**:
  - Forces visibility for all party members
  - Special handling for center hero (index 2)
  - Verifies protection flags
  - Checks camera view bounds

## Issues Identified

### 1. **Position Calculation Inconsistency**
- Hero_3 has special offset (-20, -20) applied AFTER base calculation
- This breaks the uniform spacing pattern
- Other heroes don't have this offset

### 2. **Depth Order Issue**
- Hero_3 depth (1040) is between Hero_4 (1030) and Tank (1050)
- This is correct, but may cause confusion
- Hero_3 should be visible if positioned correctly

### 3. **World vs Camera Coordinates**
- All heroes use WORLD coordinates (startX = 0, startY = 0)
- Camera follows tank at world position (240, -20)
- Hero_3 at world position (-20, -20) should be visible if camera is positioned correctly

### 4. **Sprite Size Inconsistency**
- Hero_3 is 60x80 with scale 1.5 (for debugging)
- Other heroes are 40x60 with scale 1.0
- This makes hero_3 much larger and should be very visible

### 5. **Potential Overlap**
- With spacing of 120, heroes should not overlap
- But hero_3's special offset (-20) might cause it to overlap with Hero_2 at (-120, -20)
- Distance between Hero_2 and Hero_3: 100 pixels (should be safe)

## Recommendations

### Immediate Fixes:
1. **Remove special offset for hero_3** - Use uniform spacing
2. **Ensure all heroes use same size** - Remove debugging size/scale
3. **Verify camera positioning** - Ensure camera shows all heroes
4. **Check for sprite culling** - Phaser may cull sprites outside viewport

### Debugging Steps:
1. Check console logs for hero_3 debug info
2. Verify sprite is in display list
3. Check camera scroll/viewport bounds
4. Verify sprite is not being destroyed
5. Check if sprite is behind camera or outside bounds

## Code Flow Summary

```
create()
  └─> setupPartyHeroesVertical(startingPos = {x:0, y:0})
      ├─> getHeroesInFormationOrder() → [healer, dps1, dps2, dps3, tank]
      ├─> For each hero (i = 0 to 4):
      │   ├─> Calculate xOffset = (i - 2) * 120
      │   ├─> Calculate yOffset = (i % 2) * 20
      │   ├─> If hero_3 (i=2): Apply -20 offset to both
      │   ├─> xPos = 0 + xOffset
      │   ├─> yPos = 0 - yOffset
      │   ├─> Create sprite at (xPos, yPos)
      │   ├─> Set depth based on role/index
      │   ├─> Add protection
      │   └─> Push to partyMemberSprites[]
      └─> verifyPartySprites()
  └─> setupPrimaryHeroAndCamera()
      └─> Camera follows tank sprite with offset
```

## Critical Questions

1. **Is hero_3 sprite actually being created?** ✓ (Logs confirm)
2. **Is hero_3 in the display list?** ✓ (Logs confirm)
3. **Is hero_3 visible/active?** ✓ (Logs confirm)
4. **Is hero_3 within camera bounds?** ❓ (Need to check)
5. **Is hero_3 being culled by Phaser?** ❓ (Possible)
6. **Is hero_3 overlapping with another sprite?** ❓ (Possible)

## Next Steps

1. Check camera bounds vs hero_3 position
2. Verify Phaser culling settings
3. Test with hero_3 at different positions
4. Check if other systems are moving/hiding sprites


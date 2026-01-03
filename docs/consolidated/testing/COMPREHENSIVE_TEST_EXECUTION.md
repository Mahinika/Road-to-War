# Comprehensive Test Execution Plan - 5-Man Team System

**Date**: December 2025  
**Status**: Ready for Execution  
**Test Environment**: Browser (Chrome/Edge) or Electron Desktop

## Pre-Test Verification

### Code Review Checklist ✅

- [x] Achievements loading bug fixed
- [x] Party combat triggering fixed
- [x] Combat end conditions fixed
- [x] Party members attacking fixed
- [x] Health bar updates implemented
- [x] Level-up system implemented
- [x] All files modified and linted
- [x] No syntax errors
- [x] Documentation updated

## Test Execution Instructions

### Setup

1. **Start the game**:
   ```bash
   npm run dev        # For browser testing
   # OR
   npm start          # For Electron desktop testing
   ```

2. **Open browser console** (F12) to monitor for errors

3. **Have test document open** to record results

---

## Test Suite 1: Achievements System ✅

### Test 1.1: Achievements Menu Loading
**Priority**: High  
**Estimated Time**: 2 minutes

**Steps**:
1. Start game (new or existing save)
2. Open Achievements menu (if available via UI)
3. Check browser console for errors

**Expected Results**:
- ✅ No `forEach is not a function` errors
- ✅ Achievements menu loads without errors
- ✅ No console errors related to achievements

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 1.2: Save/Load with Achievements
**Priority**: High  
**Estimated Time**: 3 minutes

**Steps**:
1. Create new game
2. Unlock an achievement (if possible)
3. Save game
4. Load game
5. Check achievements persist

**Expected Results**:
- ✅ Save completes without errors
- ✅ Load completes without errors
- ✅ Achievements data persists correctly

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 2: Party Creation Flow ✅

### Test 2.1: Character Creation Scene
**Priority**: Critical  
**Estimated Time**: 5 minutes

**Steps**:
1. Click "Start Game" from main menu
2. Verify Character Creation scene loads
3. Verify all UI elements visible:
   - 5 hero slots (Tank, Healer, DPS, DPS, DPS)
   - Class selection dropdowns
   - Specialization selection dropdowns
   - AUTO-GENERATE button
   - CONFIRM PARTY button

**Expected Results**:
- ✅ Scene loads without errors
- ✅ All UI elements visible
- ✅ No console errors

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 2.2: Class and Spec Selection
**Priority**: Critical  
**Estimated Time**: 5 minutes

**Steps**:
1. For each hero slot, test class selection:
   - Tank slot: Select each class (Paladin, Warrior)
   - Healer slot: Select each class (Priest, Druid, Paladin)
   - DPS slots: Select each class (Mage, Rogue, Warlock, etc.)
2. For each class, test specialization selection
3. Verify all 7 classes available
4. Verify all 21 specializations available

**Expected Results**:
- ✅ All 7 classes selectable
- ✅ All 21 specializations available
- ✅ Selections persist when switching between heroes

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 2.3: Role Validation
**Priority**: Critical  
**Estimated Time**: 3 minutes

**Steps**:
1. Try to confirm party with missing selections
2. Try to confirm party with wrong role assignments
3. Try to confirm party with valid selections

**Expected Results**:
- ✅ Validation prevents invalid party creation
- ✅ Error messages shown for invalid selections
- ✅ Valid party creation succeeds

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 2.4: AUTO-GENERATE Button
**Priority**: Medium  
**Estimated Time**: 2 minutes

**Steps**:
1. Click AUTO-GENERATE button
2. Verify party is auto-filled with valid composition
3. Verify all roles assigned correctly

**Expected Results**:
- ✅ Party auto-generated with 1 Tank, 1 Healer, 3 DPS
- ✅ All heroes have class and spec assigned
- ✅ Can still manually edit selections

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 2.5: Transition to GameScene
**Priority**: Critical  
**Estimated Time**: 2 minutes

**Steps**:
1. Create valid party
2. Click CONFIRM PARTY
3. Verify transition to GameScene
4. Check console for errors

**Expected Results**:
- ✅ Smooth transition to GameScene
- ✅ No console errors
- ✅ Party data available in GameScene

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 3: Combat System ✅

### Test 3.1: Party Combat Triggering
**Priority**: Critical  
**Estimated Time**: 3 minutes

**Steps**:
1. Start game with 5-hero party
2. Move hero/party to encounter enemy
3. Verify combat starts
4. Check console for `party_combat_start` event

**Expected Results**:
- ✅ Combat triggers when encountering enemy
- ✅ `party_combat_start` event emitted (check console)
- ✅ All 5 heroes visible in combat
- ✅ No single-hero combat event

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 3.2: All Heroes Attacking
**Priority**: Critical  
**Estimated Time**: 5 minutes

**Steps**:
1. Enter combat with party
2. Observe hero turn
3. Verify all 5 heroes attack
4. Check damage numbers appear for all heroes
5. Check console logs for each hero's attack

**Expected Results**:
- ✅ All 5 heroes attack during party turn
- ✅ Damage numbers visible for all heroes
- ✅ Console shows attack logs for each hero
- ✅ Enemy takes damage from all heroes

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 3.3: Threat System
**Priority**: High  
**Estimated Time**: 5 minutes

**Steps**:
1. Enter combat with party
2. Observe enemy targeting
3. Verify tank is primary target (should take most damage)
4. Check if DPS can pull aggro if threat too high
5. Monitor threat values in console (if logged)

**Expected Results**:
- ✅ Tank generates more threat (2x damage)
- ✅ Enemy primarily targets tank
- ✅ Threat system tracks correctly
- ✅ Aggro can shift if DPS threat too high

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 3.4: Combat End Conditions
**Priority**: Critical  
**Estimated Time**: 5 minutes

**Steps**:
1. Enter combat
2. Test victory: Defeat enemy
3. Verify combat ends correctly
4. Test defeat: Let all heroes die
5. Verify combat ends correctly

**Expected Results**:
- ✅ Combat ends when enemy defeated
- ✅ Combat ends when all heroes defeated
- ✅ Victory/defeat messages shown
- ✅ No infinite combat loops

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 3.5: XP Distribution
**Priority**: High  
**Estimated Time**: 3 minutes

**Steps**:
1. Enter combat with party
2. Defeat enemy
3. Check console for XP awards
4. Verify all 5 heroes receive XP
5. Check XP bars update

**Expected Results**:
- ✅ All 5 heroes receive XP
- ✅ XP bars update for all heroes
- ✅ Console shows XP awards for each hero
- ✅ XP values correct

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 4: Health Bar Updates ✅

### Test 4.1: Real-Time Health Bar Updates
**Priority**: High  
**Estimated Time**: 3 minutes

**Steps**:
1. Enter combat with party
2. Observe health bars in party display
3. Take damage (enemy attacks)
4. Verify health bars update in real-time
5. Verify mana bars update (if applicable)

**Expected Results**:
- ✅ Health bars update during combat
- ✅ Bars reflect current health accurately
- ✅ Mana bars update (if applicable)
- ✅ No lag or delayed updates

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 5: Level-Up System ✅

### Test 5.1: Party Member Level-Ups
**Priority**: High  
**Estimated Time**: 10 minutes

**Steps**:
1. Enter multiple combats to gain XP
2. Monitor XP bars for all heroes
3. When hero reaches level-up threshold:
   - Verify level-up effect triggers (particles, sound)
   - Verify level increases
   - Verify talent points awarded (if TalentManager exists)
   - Check console for level-up logs

**Expected Results**:
- ✅ Level-up effects trigger for each hero
- ✅ Level increases correctly
- ✅ Talent points awarded (3 per level after level 1)
- ✅ Console shows level-up logs
- ✅ All heroes can level up independently

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 6: Equipment Management ✅

### Test 6.1: Hero Selection
**Priority**: High  
**Estimated Time**: 3 minutes

**Steps**:
1. Click on different hero rows in party display
2. Verify hero details panel updates
3. Verify selected hero highlighted

**Expected Results**:
- ✅ Clicking hero row selects that hero
- ✅ Hero details panel shows correct hero
- ✅ Visual feedback for selection

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 6.2: Per-Hero Equipment
**Priority**: High  
**Estimated Time**: 5 minutes

**Steps**:
1. Select hero 1
2. Equip an item
3. Select hero 2
4. Equip different item in same slot
5. Switch back to hero 1
6. Verify equipment persists per hero

**Expected Results**:
- ✅ Equipment is per-hero (not shared)
- ✅ Switching heroes shows correct equipment
- ✅ Equipment persists when switching

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 6.3: Stat Calculations
**Priority**: Medium  
**Estimated Time**: 3 minutes

**Steps**:
1. Select hero
2. Note base stats
3. Equip item with stat bonuses
4. Verify stats update correctly
5. Switch to different hero
6. Verify stats are independent

**Expected Results**:
- ✅ Stats update when equipping items
- ✅ Stats calculated correctly (base + equipment)
- ✅ Stats independent per hero

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 7: Save/Load System ✅

### Test 7.1: Party Data Persistence
**Priority**: Critical  
**Estimated Time**: 5 minutes

**Steps**:
1. Create party and play for a bit
2. Equip items on different heroes
3. Gain some XP/levels
4. Save game
5. Load game
6. Verify party composition persists

**Expected Results**:
- ✅ All 5 heroes present after load
- ✅ Hero classes and specs persist
- ✅ Hero levels and XP persist
- ✅ Equipment per hero persists

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 7.2: Equipment Persistence
**Priority**: High  
**Estimated Time**: 3 minutes

**Steps**:
1. Equip items on multiple heroes
2. Save game
3. Load game
4. Verify equipment on each hero

**Expected Results**:
- ✅ Equipment persists for all heroes
- ✅ Equipment in correct slots
- ✅ No equipment loss or corruption

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 8: UI/UX ✅

### Test 8.1: Party Display
**Priority**: High  
**Estimated Time**: 3 minutes

**Steps**:
1. Start game with party
2. Verify party display shows all 5 heroes
3. Verify role color-coding:
   - Tank = blue border
   - Healer = green border
   - DPS = orange border
4. Verify health/mana bars visible
5. Verify level display visible

**Expected Results**:
- ✅ All 5 heroes visible in party display
- ✅ Role color-coding correct
- ✅ Health/mana bars visible
- ✅ Level display visible

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

### Test 8.2: Camera Tracking
**Priority**: Medium  
**Estimated Time**: 3 minutes

**Steps**:
1. Move party around
2. Verify camera keeps all party members visible
3. Verify camera adjusts dynamically

**Expected Results**:
- ✅ Camera tracks all party members
- ✅ All heroes stay visible
- ✅ Camera adjusts smoothly

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Suite 9: Integration Testing ✅

### Test 9.1: Full Flow
**Priority**: Critical  
**Estimated Time**: 15 minutes

**Steps**:
1. Main Menu → Start Game
2. Character Creation → Create Party
3. Game Start → Combat
4. Equipment Management → Equip Items
5. Level Up → Gain Talent Points
6. Save Game → Load Game
7. Verify all data persists

**Expected Results**:
- ✅ Full flow works seamlessly
- ✅ All systems integrate correctly
- ✅ No errors or crashes
- ✅ Data persists correctly

**Actual Results**: _________________________

**Status**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Test Results Summary

### Overall Status
- **Total Tests**: 25
- **Passed**: ___
- **Failed**: ___
- **Pending**: ___

### Critical Issues Found
1. _________________________________
2. _________________________________
3. _________________________________

### High Priority Issues Found
1. _________________________________
2. _________________________________
3. _________________________________

### Medium Priority Issues Found
1. _________________________________
2. _________________________________
3. _________________________________

### Notes
_________________________________
_________________________________
_________________________________

---

## Next Steps After Testing

1. **Document all issues found**
2. **Prioritize fixes** (Critical → High → Medium)
3. **Fix critical issues immediately**
4. **Re-test after fixes**
5. **Update memory bank with results**

---

**Test Execution Date**: _______________  
**Tester**: _______________  
**Environment**: Browser / Electron  
**Version**: _______________


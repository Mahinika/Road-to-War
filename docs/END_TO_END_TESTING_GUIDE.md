# End-to-End Testing Guide

**Date**: January 2026  
**Status**: Comprehensive Testing Framework Ready

## Overview

This guide covers end-to-end testing of the "Road of War" game systems. The test suite verifies that all systems work together correctly, from basic functionality to complex integration scenarios.

## Running Tests

### Option 1: Run TestSuite from Godot Editor

1. Open `road-to-war/project.godot` in Godot Editor
2. Open `road-to-war/tests/TestSuite.gd`
3. In the script editor, you can:
   - Add `run_all_tests()` to `_ready()` temporarily
   - Or call it from the debugger console
   - Or create a test scene that calls it

### Option 2: Run via GUT Framework (If Configured)

If GUT is properly configured:
1. Open Godot Editor
2. Go to Scene → Run Current Scene
3. GUT will automatically run tests

### Option 3: Manual Testing

Follow the checklist in `docs/GODOT_TESTING_CHECKLIST.md` for manual verification.

## Test Suite Coverage

### Core System Tests ✅

1. **DataManager** - JSON data loading
2. **PartyManager** - Hero management
3. **StatCalculator** - Stat calculations
4. **DamageCalculator** - Damage calculations
5. **SaveManager** - Save/load operations
6. **LootManager** - Item spawning and pickup
7. **Level Up System** - Experience and leveling
8. **AbilityManager** - Ability definitions and cooldowns
9. **StatusEffectsManager** - Status effect application
10. **ResourceManager** - Resource management
11. **ShopManager** - Shop operations
12. **AchievementManager** - Achievement tracking
13. **StatisticsManager** - Statistics tracking
14. **MovementManager** - Movement and formation
15. **ProceduralItemGenerator** - Item generation
16. **Combat Flow** - Basic combat lifecycle

### End-to-End Integration Tests ✅

1. **Save/Load Cycle** - Complete game state persistence
2. **Combat Flow** - Full combat from start to finish
3. **Level Progression** - Experience → Level Up → Stats → Talents
4. **Equipment System** - Equip → Stats → Save/Load

## Test Scenarios

### Scenario 1: Complete Save/Load Cycle

**Steps**:
1. Create party with 2+ heroes at different levels
2. Set world state (mile, distance)
3. Equip items
4. Allocate talents
5. Set gold/resources
6. Save game
7. Modify state in memory
8. Load game
9. Verify all data restored correctly

**Expected Results**:
- ✅ All hero data restored (name, level, stats)
- ✅ World state restored (mile, distance)
- ✅ Equipment restored
- ✅ Talents restored
- ✅ Gold/resources restored

### Scenario 2: Complete Combat Flow

**Steps**:
1. Create 5-hero party
2. Start combat with enemy group
3. Process multiple turns
4. Verify combat state
5. End combat
6. Verify rewards

**Expected Results**:
- ✅ Combat starts correctly
- ✅ All heroes participate
- ✅ Turns process correctly
- ✅ Combat ends correctly
- ✅ Rewards granted

### Scenario 3: Level Progression Chain

**Steps**:
1. Create hero at level 1
2. Gain experience to level up
3. Verify level increase
4. Verify talent point gained
5. Verify stat growth
6. Allocate talent point
7. Verify stat increase

**Expected Results**:
- ✅ Level increases correctly
- ✅ Talent points gained
- ✅ Stats increase
- ✅ Talent allocation works
- ✅ Stat recalculation works

### Scenario 4: Equipment Integration

**Steps**:
1. Create hero
2. Record initial stats
3. Equip item
4. Verify stat increase
5. Save game
6. Load game
7. Verify equipment persists
8. Unequip item
9. Verify stat decrease

**Expected Results**:
- ✅ Equipment affects stats
- ✅ Equipment saves/loads
- ✅ Unequip works correctly

## Manual Testing Checklist

### Critical Path Testing

- [ ] **Start Game** → Character Creation → World Scene
- [ ] **Combat** → Defeat Enemies → Rewards → Level Up
- [ ] **Save Game** → Exit → Load Game → Verify State
- [ ] **Equipment** → Equip → Stats Update → Save → Load → Verify
- [ ] **Talents** → Allocate → Stats Update → Save → Load → Verify
- [ ] **Prestige** → Reach Mile 100 → Prestige → Verify Bonuses

### Edge Cases

- [ ] Save with empty inventory
- [ ] Save with no equipment
- [ ] Load non-existent save
- [ ] Combat with party at level 1
- [ ] Combat with party at level 100
- [ ] Level up multiple heroes simultaneously
- [ ] Equip/unequip rapidly

### Stress Testing

- [ ] Long play session (1+ hour)
- [ ] Multiple save/load cycles
- [ ] Rapid combat encounters
- [ ] Many level-ups in sequence
- [ ] Large inventory management

## Test Results Template

```
=== TEST SESSION RESULTS ===
Date: ___________
Godot Version: ___________
Test Duration: ___________

Core System Tests:
- DataManager: [ ] PASS [ ] FAIL
- PartyManager: [ ] PASS [ ] FAIL
- SaveManager: [ ] PASS [ ] FAIL
- CombatManager: [ ] PASS [ ] FAIL
- EquipmentManager: [ ] PASS [ ] FAIL
- TalentManager: [ ] PASS [ ] FAIL

End-to-End Tests:
- Save/Load Cycle: [ ] PASS [ ] FAIL
- Combat Flow: [ ] PASS [ ] FAIL
- Level Progression: [ ] PASS [ ] FAIL
- Equipment System: [ ] PASS [ ] FAIL

Issues Found:
1. ___________
2. ___________
3. ___________

Overall Status: [ ] PASS [ ] FAIL [ ] NEEDS WORK
```

## Automated Test Execution

To run tests programmatically, add this to a test scene:

```gdscript
extends Node

func _ready():
	var test_suite = load("res://tests/TestSuite.gd").new()
	add_child(test_suite)
	test_suite.run_all_tests()
	# Optionally quit after tests
	await get_tree().create_timer(5.0).timeout
	get_tree().quit()
```

## Next Steps

1. **Run Test Suite** - Execute all automated tests
2. **Manual Testing** - Follow checklist for critical paths
3. **Document Results** - Record any issues found
4. **Fix Issues** - Address any failures
5. **Re-test** - Verify fixes work

## Summary

The test suite provides comprehensive coverage of:
- ✅ All core managers
- ✅ Integration scenarios
- ✅ End-to-end workflows
- ✅ Edge cases

Run the tests regularly to ensure system stability as development continues.


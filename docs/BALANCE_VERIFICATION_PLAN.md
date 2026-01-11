# Balance Verification Plan - Phase 1 Priority

**Date**: January 2026  
**Status**: Ready to Execute  
**Priority**: HIGH - Must complete before proceeding with feature work

---

## Overview

Balance adjustments have been applied (9 ability multipliers + healer AI weights). We need to verify these changes improved the balance as expected by re-running the balance audit.

---

## Previous Balance Issues (Before Fixes)

### Overperforming Classes (Level 80, Mile 0):
- **Warrior/Arms**: 527.08 DPS ⚠️ (+35% above average)
- **Paladin/Holy**: 481.30 DPS ⚠️ (Healer doing DPS - should be healing-focused)
- **Paladin/Retribution**: 479.80 DPS ⚠️ (+23% above average)
- **Warrior/Fury**: 472.36 DPS ⚠️ (+21% above average)

### Underperforming Classes (Level 80, Mile 0):
- **Warlock/Affliction**: 359.56 DPS ⚠️ (-8% below average) - Should be competitive
- **Druid/Feral**: 350.43 DPS ⚠️ (-10% below average) - Should be higher

**Average DPS**: ~390 DPS  
**Target Range**: 350-420 DPS (accounting for role differences)

---

## Fixes Applied

### Ability Multiplier Adjustments (`road-to-war/data/abilities.json`):

1. **Warrior/Arms** (was 527 DPS, target ~400):
   - Mortal Strike: `damageMultiplier` 2.2 → **1.9** (-14% damage)
   - Execute: `damageMultiplier` 2.5 → **2.2** (-12% damage)
   - **Expected Result**: ~420-440 DPS (down from 527)

2. **Paladin/Retribution** (was 480 DPS, target ~400):
   - Judgment: `damageMultiplier` 1.5 → **1.3** (-13% damage)
   - Crusader Strike: `damageMultiplier` 1.3 → **1.2** (-8% damage)
   - Divine Storm: `damageMultiplier` 1.1 → **1.0** (-9% damage)
   - **Expected Result**: ~430-450 DPS (down from 480)

3. **Warrior/Fury** (was 472 DPS, target ~420):
   - Bloodthirst: `damageMultiplier` 1.5 → **1.4** (-7% damage)
   - **Expected Result**: ~450-470 DPS (down from 472)

4. **Warlock/Affliction** (was 360 DPS, target ~380):
   - Corruption: Added `dotMultiplier` **0.4** (was defaulting to 0.3, +33% DoT damage)
   - Unstable Affliction: Added `dotMultiplier` **0.6** (was defaulting to 0.3, +100% DoT damage)
   - **Expected Result**: ~400-420 DPS (up from 360)

5. **Druid/Feral** (was 350 DPS, target ~380):
   - Mangle: `damageMultiplier` 1.3 → **1.5** (+15% damage)
   - Swipe: `damageMultiplier` 0.8 → **1.0** (+25% damage)
   - **Expected Result**: ~400-420 DPS (up from 350)

### Healer AI Improvements (`road-to-war/scripts/AbilityManager.gd`):

- **Reduced damage preference**: `W_DAMAGE_SAFE` 35.0 → **8.0** (-77% reduction)
- **Added healing preference**: `W_HEALING_PREFERENCE` 30.0 (new constant)
- **Result**: Healing abilities now score **29x higher** than damage abilities when party is safe (was 6x)
- **Expected Result**: Healer DPS should drop significantly in real party combat (from ~481 to ~150-200 range)
- **Note**: Balance audit tests heroes in isolation, so healer DPS will still appear high in audit (no party to heal). Need to test in actual party combat separately.

---

## How to Run Balance Audit

### Option 1: Using RunBalanceAudit Scene (Recommended)

1. **Open Godot Editor**
2. **Load Scene**: Open `road-to-war/scenes/RunBalanceAudit.tscn`
3. **Run Scene**: Press F6 (Run Current Scene) or click Play button
4. **Wait for Completion**: Scene will run audit and automatically quit
5. **Check Report**: Report saved to `user://stats_audit_report.json`
   - Windows: `%APPDATA%/Godot/app_userdata/Road to war/stats_audit_report.json`
   - Linux: `~/.local/share/godot/app_userdata/Road to war/stats_audit_report.json`
   - macOS: `~/Library/Application Support/Godot/app_userdata/Road to war/stats_audit_report.json`

### Option 2: Using Test Suite

1. **Open Godot Editor**
2. **Load Scene**: Open `road-to-war/scenes/TestRunner.tscn`
3. **Run Scene**: Press F6 (Run Current Scene)
4. **Review Output**: Check console for balance audit results
5. **Check Report**: Same location as Option 1

### Option 3: Command Line (If Godot is in PATH)

```bash
cd "C:\Users\Ropbe\Desktop\Road of war\road-to-war"
godot --headless --path . --script res://scripts/RunBalanceAudit.gd --quit
```

Then check report at `user://stats_audit_report.json`

---

## What to Look For in Results

### Success Criteria

**At Level 80, Mile 0:**

1. **Warrior/Arms**: Should be ~420-440 DPS (was 527) ✅ Target: ~400 ± 10%
2. **Paladin/Retribution**: Should be ~430-450 DPS (was 480) ✅ Target: ~400 ± 10%
3. **Warrior/Fury**: Should be ~450-470 DPS (was 472) ✅ Target: ~420 ± 10%
4. **Warlock/Affliction**: Should be ~400-420 DPS (was 360) ✅ Target: ~380 ± 10%
5. **Druid/Feral**: Should be ~400-420 DPS (was 350) ✅ Target: ~380 ± 10%
6. **All Classes**: Should be within 350-420 DPS range (accounting for role differences)

### Expected Changes

**DPS Reductions (Should See)**:
- Warrior/Arms: ~15-20% reduction
- Paladin/Retribution: ~10-15% reduction
- Warrior/Fury: ~5-10% reduction

**DPS Increases (Should See)**:
- Warlock/Affliction: ~15-20% increase
- Druid/Feral: ~15-20% increase

**Healer DPS (Audit Limitation)**:
- **Note**: Paladin/Holy will likely still show high DPS in audit (481) because audit tests heroes in isolation
- **Expected**: No party to heal = healer uses damage abilities = high DPS in audit
- **Solution**: Need to test healer behavior in **actual party combat** separately (see "Real Party Combat Testing" below)

---

## Real Party Combat Testing (Required)

### Why Needed

The balance audit tests heroes in isolation (single hero, no party). Healer AI considers party "safe" when no one needs healing, so healers use damage abilities in the audit. We need to verify healers prioritize healing in real combat scenarios.

### How to Test

1. **Create a 5-man party** (Character Creation scene)
2. **Start a new game** (World scene)
3. **Enter combat** (enemy encounter)
4. **Observe healer behavior**:
   - Does healer prioritize Holy Light/Flash Heal over Judgment?
   - Does healer heal party members when they take damage?
   - What is healer DPS in actual party combat?
5. **Measure results**:
   - Use DevStatMonitor (F8) to see real-time combat stats
   - Check combat log for healer ability usage
   - Verify healer DPS is lower than audit (target: 150-200 range)

### Expected Results

- **Healer Ability Priority**: Healing abilities (Holy Light, Flash Heal) should be used more frequently than damage abilities (Judgment)
- **Healer DPS**: Should be significantly lower in party combat (150-200 DPS) vs audit (481 DPS)
- **Party Survival**: Healers should successfully keep party alive through encounters

---

## Analysis Steps

### Step 1: Compare Audit Results

After running balance audit:

1. **Load previous audit report** (if available from `.cursor/balance_audit_summary.json`)
2. **Load new audit report** (`user://stats_audit_report.json`)
3. **Compare DPS values** at Level 80, Mile 0:
   - Calculate percentage changes
   - Verify classes moved toward target range (350-420 DPS)
   - Identify any classes still out of range

### Step 2: Verify Healer Behavior

1. **Run real party combat test** (see "Real Party Combat Testing" above)
2. **Measure healer DPS** in actual party scenarios
3. **Compare to audit** (should be much lower)
4. **Verify healing priority** (healers should heal, not DPS)

### Step 3: Fine-Tune if Needed

If results show imbalances:

1. **Adjust ability multipliers** in `abilities.json` (conservative 5-10% changes)
2. **Re-run audit** to verify improvements
3. **Iterate** until all classes within target range

---

## Next Steps After Verification

### If Balance is Good (✅ Within Target Range):

1. ✅ **Mark balance verification complete**
2. ✅ **Update memory bank** (mark as resolved)
3. ✅ **Proceed to next priority**:
   - Quest system UI integration
   - Shop encounter world integration
   - Prestige system polish

### If Balance Needs More Work (⚠️ Still Out of Range):

1. **Fine-tune multipliers** (smaller adjustments, 5-10%)
2. **Re-run audit** to verify
3. **Iterate** until balanced
4. **Document changes** in balance audit analysis

### If Healer Behavior is Wrong (⚠️ Not Prioritizing Healing):

1. **Review healer AI logic** in `AbilityManager.gd`
2. **Adjust weights** if needed (increase `W_HEALING_PREFERENCE` or decrease `W_DAMAGE_SAFE` further)
3. **Test in party combat** again
4. **Iterate** until healers prioritize healing

---

## Files to Review

### Balance Audit Report Location:
- **Report**: `user://stats_audit_report.json` (generated after running audit)
- **Previous Analysis**: `.cursor/BALANCE_AUDIT_ANALYSIS.md`
- **Balance Pass Summary**: `.cursor/BALANCE_PASS_COMPLETE.md`
- **Healer Fix**: `.cursor/HEALER_DPS_FIX.md`

### Modified Files (For Reference):
- `road-to-war/data/abilities.json` - 9 ability multipliers adjusted
- `road-to-war/scripts/AbilityManager.gd` - Healer AI weights adjusted

### Test Files:
- `road-to-war/scenes/RunBalanceAudit.tscn` - Balance audit scene
- `road-to-war/scripts/RunBalanceAudit.gd` - Balance audit script
- `road-to-war/tests/TestSuite.gd` - Test suite (includes `test_stats_audit()`)

---

## Success Criteria Summary

✅ **Balance Audit Passes**:
- All classes within 350-420 DPS range (Level 80, Mile 0)
- Overperforming classes reduced by expected amounts
- Underperforming classes increased by expected amounts

✅ **Healer Behavior Verified**:
- Healers prioritize healing in party combat
- Healer DPS significantly lower in party combat (150-200) vs audit (481)
- Party survives encounters with healer support

✅ **Double Scaling Verified** (Already Confirmed):
- HeroFactory creates level 1 base_stats (doesn't use level parameter)
- StatCalculator applies level gains only to final_stats
- No double-scaling occurring (code review confirmed)

---

**Status**: Ready to Execute  
**Priority**: HIGH - Must complete before proceeding with feature work  
**Estimated Time**: 1-2 hours (running audit + analysis + party combat testing)

**Next Action**: Run balance audit using `RunBalanceAudit.tscn` scene in Godot Editor

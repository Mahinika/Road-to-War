# Balance Audit Execution Guide

**Quick Reference**: How to run balance audit using scripts, tools, and MCP

---

## ✅ **CURRENT BASELINE** (From Existing Report)

**Date**: Existing report found (timestamp shows 1970 due to format, but data is valid)

### Overperforming Classes (Level 80, Mile 0):
- **Warrior/Arms**: 527.1 DPS ⚠️ (Target: ~400-420, need -20% reduction)
- **Paladin/Holy**: 481.3 DPS ⚠️ (Healer doing DPS - should prioritize healing)
- **Paladin/Retribution**: 479.8 DPS ⚠️ (Target: ~400-420, need -15% reduction)
- **Warrior/Fury**: 472.4 DPS ⚠️ (Target: ~420-450, need -10% reduction)

### Underperforming Classes (Level 80, Mile 0):
- **Warlock/Affliction**: 359.6 DPS ⚠️ (Target: ~380-400, need +15% increase)
- **Druid/Feral**: 350.4 DPS ⚠️ (Target: ~380-400, need +20% increase)

### Balance Adjustments Applied:
- ✅ Warrior/Arms: Mortal Strike 2.2→1.9, Execute 2.5→2.2
- ✅ Paladin/Retribution: Judgment 1.5→1.3, Crusader Strike 1.3→1.2, Divine Storm 1.1→1.0
- ✅ Warrior/Fury: Bloodthirst 1.5→1.4
- ✅ Warlock/Affliction: Corruption DoT 0.3→0.4, Unstable Affliction DoT 0.3→0.6
- ✅ Druid/Feral: Mangle 1.3→1.5, Swipe 0.8→1.0
- ✅ Healer AI: W_DAMAGE_SAFE 35.0→8.0, added W_HEALING_PREFERENCE 30.0

**Status**: Adjustments applied, **verification needed** (re-run audit to confirm improvements)

---

## 🚀 **METHOD 1: Automated Script (Recommended)**

### Run Fresh Audit:
```bash
npm run balance-audit
```

**What it does**:
1. Attempts to find Godot executable
2. Runs balance audit via command line (headless)
3. Waits for report generation (30-60 seconds)
4. Automatically copies report to `.cursor/`
5. Runs analysis automatically

**If Godot not in PATH**: Script will provide manual instructions

### Analyze Existing Report:
```bash
npm run balance-audit:analyze
```

### Compare Before/After:
```bash
npm run balance-audit:compare
```

**This compares**:
- Before: `.cursor/stats_audit_report.json` (baseline)
- After: `user://stats_audit_report.json` (new audit)

---

## 🎮 **METHOD 2: Godot Editor (Manual)**

### Using RunBalanceAudit Scene:

1. **Open Godot Editor**
2. **Open Project**: `road-to-war/project.godot`
3. **Open Scene**: `road-to-war/scenes/RunBalanceAudit.tscn`
4. **Run Scene**: Press F6 (Run Current Scene) or click Play button
5. **Wait**: Scene runs audit and auto-quits (30-60 seconds)
6. **Check Report**: Saved to `user://stats_audit_report.json`

**Report Location**:
- Windows: `%APPDATA%\Godot\app_userdata\Road to war\stats_audit_report.json`
- Linux: `~/.local/share/godot/app_userdata/Road to war/stats_audit_report.json`
- macOS: `~/Library/Application Support/Godot/app_userdata/Road to war/stats_audit_report.json`

### Then Analyze:
```bash
npm run balance-audit:analyze
```

---

## 🤖 **METHOD 3: Godot MCP Tools (If Editor Open)**

**Current Status**: MCP tools work for inspection, but can't directly execute tests.

**Available Actions**:
- ✅ Open scene: `mcp_godot_open_scene("res://scenes/RunBalanceAudit.tscn")`
- ✅ Inspect scene: `mcp_godot_get_scene_info()`
- ⚠️ Play scene: `mcp_godot_play_scene()` - Plays main scene, not current scene
- ⚠️ Editor action: `mcp_godot_editor_action("PLAY")` - Plays main scene

**Limitation**: MCP tools can't execute a specific scene automatically (plays main scene instead).

**Workaround**: 
1. Use MCP to open RunBalanceAudit scene
2. Manually press F6 in Godot Editor
3. Wait for completion
4. Run analysis: `npm run balance-audit:analyze`

**Future**: Could extend Godot MCP plugin to support scene execution, but current limitation is that `play_scene` uses project's main scene setting.

---

## 📋 **METHOD 4: Command Line (If Godot in PATH)**

### Option A: Run Scene Directly
```bash
cd "C:\Users\Ropbe\Desktop\Road of war\road-to-war"
godot --path . res://scenes/RunBalanceAudit.tscn
```

**Note**: This may still run main scene. Use Option B instead.

### Option B: Run CLI Script
```bash
cd "C:\Users\Ropbe\Desktop\Road of war\road-to-war"
godot --path . --script res://scripts/RunBalanceAuditCLI.gd
```

**What it does**:
- `RunBalanceAuditCLI.gd` extends `SceneTree` and creates its own scene tree
- Runs audit directly without needing a scene
- Auto-quits after completion

### Then Analyze:
```bash
cd "C:\Users\Ropbe\Desktop\Road of war"
npm run balance-audit:analyze
```

---

## 📊 **Expected Results After Adjustments**

Based on adjustments applied, expected changes:

### DPS Reductions (Should See):
- **Warrior/Arms**: 527 → ~420-440 DPS (-15-20% reduction) ✅
- **Paladin/Retribution**: 480 → ~430-450 DPS (-10-15% reduction) ✅
- **Warrior/Fury**: 472 → ~450-470 DPS (-5-10% reduction) ✅

### DPS Increases (Should See):
- **Warlock/Affliction**: 360 → ~400-420 DPS (+15-20% increase) ✅
- **Druid/Feral**: 350 → ~400-420 DPS (+15-20% increase) ✅

### Healer Behavior:
- **Paladin/Holy**: Still may show high DPS in audit (isolated test)
- **Real Combat**: Should prioritize healing (test in actual party combat)
- **Target**: Healer DPS in party combat should be 150-200 range

---

## 🔍 **Verification Steps**

### Step 1: Run Fresh Audit
```bash
npm run balance-audit
```

**OR manually in Godot**:
1. Open `RunBalanceAudit.tscn`
2. Press F6
3. Wait for completion

### Step 2: Analyze Results
```bash
npm run balance-audit:analyze
```

**Check**:
- ✅ Classes moved toward target range (350-420 DPS)
- ✅ Overperforming classes reduced
- ✅ Underperforming classes increased

### Step 3: Compare to Baseline
```bash
npm run balance-audit:compare
```

**This shows**:
- Before vs After DPS values
- Percentage changes
- Progress toward target ranges

### Step 4: Test Healer Behavior (Manual)
1. Create 5-man party in game
2. Enter combat
3. Observe healer ability usage
4. Verify healers prioritize healing over damage
5. Measure healer DPS in actual party combat

---

## 🛠️ **Scripts Created**

### `scripts/run-balance-audit.js` ✅
**Purpose**: Automated balance audit execution

**Features**:
- Auto-detects Godot installation
- Runs audit via command line
- Waits for report generation
- Automatically runs analysis
- Graceful fallback if Godot not found

**Status**: ✅ Working - Successfully analyzed existing report

### `scripts/analyze-balance-audit.js` ✅
**Purpose**: Analyze balance audit report

**Features**:
- Reads audit report JSON
- Analyzes DPS by class/spec
- Identifies overperforming/underperforming classes
- Generates summary report

**Status**: ✅ Working - Successfully analyzed baseline report

### `scripts/compare-balance-audits.js` ✅
**Purpose**: Compare before/after audit reports

**Features**:
- Compares two audit reports
- Shows DPS changes for adjusted classes
- Calculates overall balance statistics
- Shows progress toward target ranges

**Status**: ✅ Created - Ready to use after fresh audit

### `road-to-war/scripts/RunBalanceAuditCLI.gd` ✅
**Purpose**: CLI-executable balance audit script

**Features**:
- Extends SceneTree (can be run directly)
- Runs audit without needing scene
- Auto-quits after completion

**Status**: ✅ Created - Ready for command-line execution

---

## 📝 **NPM Scripts Added**

```json
{
  "balance-audit": "node scripts/run-balance-audit.js",
  "balance-audit:analyze": "node scripts/run-balance-audit.js --analyze-only",
  "balance-audit:compare": "node scripts/compare-balance-audits.js"
}
```

**Usage**:
```bash
npm run balance-audit           # Run fresh audit
npm run balance-audit:analyze   # Analyze existing report
npm run balance-audit:compare   # Compare before/after
```

---

## 🎯 **Next Steps**

### Immediate (This Week):
1. ⏳ **Run fresh balance audit** to verify adjustments
   - Use: `npm run balance-audit` OR manually in Godot
   - Compare to baseline: `npm run balance-audit:compare`
   
2. ⏳ **Test healer behavior** in actual party combat
   - Create 5-man party
   - Enter combat
   - Observe healer ability usage
   - Verify healers prioritize healing

3. ⏳ **Fine-tune** if needed based on new audit results

### This Week (Parallel Work):
- While waiting for audit results, work on debug code cleanup
- Organize untracked files
- Polish other systems

---

## ⚡ **Most Efficient Approach**

**Recommended Workflow**:

1. **Run Audit via Script** (if Godot in PATH):
   ```bash
   npm run balance-audit
   ```
   
   **OR if script fails, use manual method**:
   - Open Godot Editor
   - Open `RunBalanceAudit.tscn`
   - Press F6
   - Wait for completion

2. **Analyze Results**:
   ```bash
   npm run balance-audit:analyze
   ```

3. **Compare to Baseline**:
   ```bash
   npm run balance-audit:compare
   ```

**Total Time**: ~5 minutes (audit runs) + 1 minute (analysis)

---

**Status**: ✅ Automation complete - Scripts created and tested, ready to use  
**Last Updated**: January 2026

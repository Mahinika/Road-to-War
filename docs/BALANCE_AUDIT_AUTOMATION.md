# Balance Audit Automation Guide

**Purpose**: Automated balance audit execution and analysis for Road of War

---

## Quick Start

### Run Balance Audit
```bash
npm run balance-audit
```

This will:
1. Attempt to find and run Godot headless with the balance audit
2. Generate report at `user://stats_audit_report.json`
3. Copy report to `.cursor/stats_audit_report.json`
4. Automatically run analysis

### Analyze Existing Report
```bash
npm run balance-audit:analyze
```

### Compare Before/After Reports
```bash
npm run balance-audit:compare
```

---

## Methods Available

### Method 1: Automated Script (Recommended)

**Script**: `scripts/run-balance-audit.js`

**What it does**:
- Tries to find Godot executable automatically
- Runs balance audit via command line (headless mode)
- Waits for report generation
- Automatically runs analysis

**Requirements**:
- Godot executable in PATH, or installed in common locations
- OR Godot executable path specified in script

**Usage**:
```bash
node scripts/run-balance-audit.js
```

**Fallback**: If command line doesn't work, provides manual instructions

---

### Method 2: Godot MCP Tools (If Godot Editor Open)

**Status**: MCP tools work for inspection, but can't directly execute tests

**Available Tools**:
- `mcp_godot_open_scene` - Open RunBalanceAudit.tscn scene
- `mcp_godot_get_scene_info` - Inspect scene structure
- `mcp_godot_editor_action` - Execute editor commands (PLAY, STOP, SAVE)

**Limitation**: `play_scene` or `editor_action PLAY` plays the main scene, not the current scene. Needs manual intervention.

**Workaround**: If Godot Editor is open:
1. Manually open `res://scenes/RunBalanceAudit.tscn`
2. Press F6 to run current scene
3. Wait for completion
4. Run analysis: `npm run balance-audit:analyze`

---

### Method 3: Manual Execution (Fallback)

**Steps**:
1. Open Godot Editor
2. Open project: `road-to-war/project.godot`
3. Open scene: `road-to-war/scenes/RunBalanceAudit.tscn`
4. Press F6 (Run Current Scene) or click Play button
5. Wait for completion (scene auto-quits)
6. Run analysis: `npm run balance-audit:analyze`

**Report Location**:
- `user://stats_audit_report.json` (Godot app data directory)
- Windows: `%APPDATA%/Godot/app_userdata/Road to war/stats_audit_report.json`
- Linux: `~/.local/share/godot/app_userdata/Road to war/stats_audit_report.json`
- macOS: `~/Library/Application Support/Godot/app_userdata/Road to war/stats_audit_report.json`

---

## Scripts Available

### `scripts/run-balance-audit.js`
Main automation script that:
- Attempts to run Godot headless with balance audit
- Waits for report generation
- Automatically runs analysis
- Provides fallback instructions if needed

**Features**:
- Auto-detects Godot installation
- Handles multiple Godot installation locations
- Copies report from user:// to .cursor/ automatically
- Runs analysis automatically after audit

**Options**:
- `--analyze-only` or `-a`: Skip running audit, just analyze existing report

---

### `scripts/analyze-balance-audit.js`
Analysis script that:
- Reads balance audit report
- Analyzes DPS by class/spec at Level 80, Mile 0
- Identifies overperforming/underperforming classes
- Generates summary report

**Output**:
- Console analysis with rankings
- Summary JSON: `.cursor/balance_audit_summary.json`

---

### `scripts/compare-balance-audits.js`
Comparison script that:
- Compares before/after balance audit reports
- Shows DPS changes for adjusted classes
- Calculates overall balance statistics
- Shows progress toward target ranges

**Usage**:
```bash
# Compare default reports (before: .cursor/, after: user://)
node scripts/compare-balance-audits.js

# Compare specific reports
node scripts/compare-balance-audits.js <before_report> <after_report>
```

---

## CLI Script: RunBalanceAuditCLI.gd

**Location**: `road-to-war/scripts/RunBalanceAuditCLI.gd`

**Purpose**: Standalone GDScript that can be run via command line without a scene

**Usage**:
```bash
godot --path road-to-war --script res://scripts/RunBalanceAuditCLI.gd
```

**Note**: This extends `SceneTree` and creates its own scene tree, allowing command-line execution.

---

## Expected Workflow

### Step 1: Run Initial Audit (Baseline)
```bash
npm run balance-audit
# OR manually in Godot: RunBalanceAudit.tscn scene
```

### Step 2: Review Baseline Results
```bash
npm run balance-audit:analyze
```

Results saved to `.cursor/balance_audit_summary.json`

### Step 3: Apply Balance Adjustments
Edit `road-to-war/data/abilities.json` based on analysis

### Step 4: Run Fresh Audit (After Adjustments)
```bash
npm run balance-audit
```

### Step 5: Compare Results
```bash
npm run balance-audit:compare
```

This compares:
- `.cursor/stats_audit_report.json` (before)
- `user://stats_audit_report.json` (after)

Shows improvements from balance adjustments.

---

## Troubleshooting

### Godot Executable Not Found
**Solution**: The script tries common locations, but you may need to:
1. Add Godot to PATH
2. Or modify `GODOT_PATHS` array in `scripts/run-balance-audit.js`

### Report Not Generated
**Possible Causes**:
- Audit script failed (check Godot output)
- Report written to different location
- Permissions issue

**Solution**: 
1. Check Godot console output for errors
2. Manually check `user://stats_audit_report.json` location
3. Run audit manually in Godot Editor to see errors

### Analysis Script Fails
**Possible Causes**:
- Report path incorrect
- Report format changed
- Missing report data

**Solution**:
1. Verify report exists at expected location
2. Check report JSON structure matches expected format
3. Run manual analysis: `node scripts/analyze-balance-audit.js`

---

## Integration with MCP Tools

**Current Status**: Godot MCP tools work for inspection and editing, but can't directly execute tests.

**Workaround**:
- Use `scripts/run-balance-audit.js` for automation (command line approach)
- Or use MCP tools to open scene, then manually play (requires human interaction)

**Future Enhancement**: Could extend Godot MCP plugin to support script/scene execution for testing.

---

## Files Involved

### Scripts
- `scripts/run-balance-audit.js` - Main automation script
- `scripts/analyze-balance-audit.js` - Analysis script
- `scripts/compare-balance-audits.js` - Comparison script

### Godot Scripts
- `road-to-war/scripts/RunBalanceAudit.gd` - Scene-based audit script
- `road-to-war/scripts/RunBalanceAuditCLI.gd` - CLI-based audit script (NEW)
- `road-to-war/tests/TestSuite.gd` - Test suite with `test_stats_audit()` method

### Scenes
- `road-to-war/scenes/RunBalanceAudit.tscn` - Audit scene (runs and quits automatically)

### Reports
- `user://stats_audit_report.json` - Generated report (Godot app data)
- `.cursor/stats_audit_report.json` - Copied report (for analysis script)
- `.cursor/balance_audit_summary.json` - Analysis summary

---

## NPM Scripts Added

```json
{
  "balance-audit": "node scripts/run-balance-audit.js",
  "balance-audit:analyze": "node scripts/run-balance-audit.js --analyze-only",
  "balance-audit:compare": "node scripts/compare-balance-audits.js"
}
```

---

**Last Updated**: January 2026  
**Status**: Ready for use - automated script created, analysis working, comparison tool available

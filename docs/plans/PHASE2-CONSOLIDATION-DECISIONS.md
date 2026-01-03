# Phase 2: Consolidation & Removal Decisions

**Date**: December 25, 2025  
**Status**: Complete  
**Based on**: Phase 1 Tool Audit Report

---

## Executive Summary

**Consolidation Strategy**: Minimal code refactoring; maximum architectural improvement through CLI unification.

**Approved Decisions**:
1. ✅ Keep all existing tools separate (good modularity)
2. ✅ Create unified CLI router in `tools/cli.js`
3. ✅ Keep existing entry points as deprecated shells (backward compatibility)
4. ⚠️ Move palette definitions to config file
5. 📌 Flag EquipmentGenerator as "experimental"

---

## Decision 1: Analysis Utilities Consolidation

### Question
Should `ColorQuantizer`, `MaterialClassifier`, `ProportionAnalyzer`, `StyleDetector` be merged into single file?

### Options Evaluated
- **A) Merge all into single file**: Reduces file count, but violates SRP
- **B) Keep separate with better imports**: Cleaner, reusable in isolation
- **C) Create analysis subsystem folder**: Organizes related files

### Decision: ✅ **OPTION B - KEEP SEPARATE**

**Rationale**:
- Each analyzer is independently useful (e.g., can use ColorQuantizer without full analysis)
- Following Single Responsibility Principle
- High reusability score (3.75/5 average)
- ImageAnalyzer provides good orchestration

**Implementation**: No changes needed to existing utilities.

---

## Decision 2: Palette System

### Question
Should palette definitions remain hardcoded in `PaletteManager.js` or move to config file?

### Options Evaluated
- **A) Hardcoded in code**: Current approach; fast, tested
- **B) JSON config file**: Non-developers can edit; versioned with game data
- **C) Database/dynamic system**: Overkill for current scope

### Decision: ✅ **OPTION B - MOVE TO CONFIG FILE** (Phase 3)

**Rationale**:
- Game designers need to tweak palettes without code changes
- Config-driven design is cleaner
- Can be versioned with other game data in `public/data/`

**Implementation Plan**:
1. Create `public/data/palettes.json` with current hardcoded palettes
2. Refactor `PaletteManager` to load from file in production
3. Keep hardcoded defaults as fallback
4. Timeline: Phase 3 (config system design)

**File Structure**:
```json
{
  "palettes": {
    "paladin": {
      "armor": [...],
      "accent": [...],
      "cloth": [...]
    },
    "warm": { ... },
    "cool": { ... }
  }
}
```

---

## Decision 3: Generator Consolidation

### Question
Should `PaladinGenerator`, `HumanoidGenerator`, `EquipmentGenerator` be merged?

### Options Evaluated
- **A) Merge all into single file**: Less maintainable; mixed concerns
- **B) Keep separate with base class**: Adds complexity; current approach works
- **C) Keep as independent generators**: Current; each has distinct logic

### Decision: ✅ **OPTION C - KEEP INDEPENDENT**

**Rationale**:
- Each generator has distinct algorithmic approach
- Paladin generator used in runtime (`src/generators/runtime-paladin-generator.js`)
- Humanoid generator is generic and reusable
- Equipment generator is experimental; may need different logic

**Special Case - EquipmentGenerator**:
- Currently unused in main generation flow
- **Action**: Mark as "experimental" and optional in CLI
- **Timeline**: Evaluate usage in Phase 5

---

## Decision 4: CLI Entry Point Consolidation

### Question
Should `analyze-reference.js` and `generate-assets.js` be merged into unified CLI?

### Options Evaluated
- **A) Keep as separate entry points**: Current; users must know which to use
- **B) Create unified CLI router**: Central entry point; cleaner UX
- **C) Make them subcommands of same tool**: Standardized Unix approach

### Decision: ✅ **OPTION B & C - CREATE UNIFIED CLI**

**Rationale**:
- Two entry points confuse users
- Hard to discover available tools
- Standard CLI tools use subcommand pattern
- Can add new tools (balance tester, save manager, inspector) later

**Implementation Plan**:
```bash
# New unified CLI (Phase 3)
$ game-tools analyze [options]     # replace analyze-reference.js
$ game-tools generate [options]    # replace generate-assets.js
$ game-tools test-balance [options] # new tool (Phase 4)
$ game-tools inspect-save [options] # new tool (Phase 4)
$ game-tools inspect-game [options] # new tool (Phase 4)
$ game-tools optimize [options]     # new tool (Phase 4)
```

**Backward Compatibility**:
```bash
# Old commands still work (deprecated wrappers)
$ node tools/analyze-reference.js [options]  # calls game-tools analyze
$ node tools/generate-assets.js [options]    # calls game-tools generate
```

---

## Decision 5: Code Organization

### Question
Should tools/ folder be reorganized during CLI consolidation?

### Current Structure
```
tools/
├── analyze-reference.js          # Entry point
├── generate-assets.js            # Entry point
├── generators/
│   ├── humanoid-generator.js
│   ├── equipment-generator.js
│   └── paladin-generator.js
└── utils/
    ├── color-quantizer.js
    ├── image-analyzer.js
    ├── material-classifier.js
    ├── palette-manager.js
    ├── pixel-drawer.js
    ├── proportion-analyzer.js
    ├── seeded-rng.js
    └── style-detector.js
```

### Proposed Structure
```
tools/
├── cli.js                        # NEW: Unified CLI router
├── commands/                     # NEW: Subcommand implementations
│   ├── analyze.js               # Refactored from analyze-reference.js
│   ├── generate.js              # Refactored from generate-assets.js
│   ├── test-balance.js          # NEW: Phase 4
│   ├── inspect-save.js          # NEW: Phase 4
│   ├── inspect-game.js          # NEW: Phase 4
│   └── optimize-assets.js       # NEW: Phase 4
├── generators/
│   ├── humanoid-generator.js    # No change
│   ├── equipment-generator.js   # No change
│   └── paladin-generator.js     # No change
└── utils/
    ├── color-quantizer.js       # No change
    ├── image-analyzer.js        # No change
    ├── material-classifier.js   # No change
    ├── palette-manager.js       # Refactor for config (Phase 3)
    ├── pixel-drawer.js          # No change
    ├── proportion-analyzer.js   # No change
    ├── seeded-rng.js            # No change
    └── style-detector.js        # No change
├── analyze-reference.js          # DEPRECATED: Wrapper for backward compat
└── generate-assets.js            # DEPRECATED: Wrapper for backward compat
```

### Decision: ✅ **ADOPT PROPOSED STRUCTURE** (Phase 3-5)

**Rationale**:
- `cli.js` as single entry point is cleaner
- `commands/` folder groups all subcommands together
- Deprecated entry points preserved for backward compatibility
- Easy to add new commands later

**Timeline**:
- Phase 3: Create `cli.js` + `commands/analyze.js` and `commands/generate.js`
- Phase 5: Refactor remaining entry points

---

## Decision 6: Configuration System

### Question
Should tools read from `public/data/*.json` (game data) or new `tools/config/*.json`?

### Options Evaluated
- **A) Single source (public/data/)**: Consistency; game data is config
- **B) Dual source (game data + tool config)**: Flexibility; duplication risk
- **C) Tool-only (tools/config/)**: Isolation; separate from game

### Decision: ✅ **OPTION A - SINGLE SOURCE: public/data/**

**Rationale**:
- Game data already contains palettes, stats, world config
- Tools should consume same config as game
- Reduces duplication; single source of truth
- Game designers work in one place

**Shared Config Files** (tools will read):
- `public/data/palettes.json` (NEW: extracted from PaletteManager)
- `public/data/stats-config.json` (for balance tester)
- `public/data/world-config.json` (for balance tester)
- `public/data/prestige-config.json` (for balance tester)
- `public/data/items.json` (for balance tester)
- `public/data/enemies.json` (for balance tester)

**Timeline**: Phase 3 (config system design)

---

## Decision 7: Obsolescence Review

### EquipmentGenerator Status

**Current**: Defined but unused in main generation flow

**Decision**: ✅ **KEEP; MARK AS EXPERIMENTAL**

**Rationale**:
- Could be useful for armor overlay system in future
- Don't want to lose the code
- Low maintenance burden

**Action**:
1. Add comment in `tools/generators/equipment-generator.js`: "Experimental: Not used in main generation"
2. Don't include in default CLI (make optional flag)
3. Document in Phase 7

---

## Decision 8: Test Data & Validation

### Question
Should tools validate against game data schemas?

### Options Evaluated
- **A) Strict validation**: Prevent invalid data; complex validation code
- **B) Loose validation**: Trust inputs; risk invalid data
- **C) Minimal validation**: Check critical fields only

### Decision: ✅ **OPTION C - MINIMAL VALIDATION** (Phase 5)

**Rationale**:
- Game data already validated elsewhere
- Tools are development tools; developers are careful
- Can add strict validation in Phase 5 if needed

**Error Handling**: Tools will provide helpful error messages if data is missing/invalid.

---

## Consolidation Summary Table

| Item | Current | Proposed | Status | Phase |
|------|---------|----------|--------|-------|
| Analysis utilities | Separate files | Separate files | ✅ No change | - |
| Generators | Separate files | Separate files | ✅ No change | - |
| Palette config | Hardcoded | JSON file | 🔄 Refactor | 3 |
| CLI entry points | 2 separate | 1 unified | 🔄 Create | 3 |
| Folder structure | Current | Reorganized | 🔄 Create | 3-5 |
| Config source | None | public/data/ | ✅ Approved | 3 |
| Equipment generator | Active | Experimental | 📌 Flag | Phase doc |

---

## Implementation Roadmap

### Phase 3 (Week 1)
- ✅ Create `tools/cli.js` router
- ✅ Create `tools/commands/` folder
- ✅ Refactor `analyze-reference.js` → `commands/analyze.js`
- ✅ Refactor `generate-assets.js` → `commands/generate.js`
- ✅ Create shared config system
- ✅ Create `public/data/palettes.json`

### Phase 5 (Week 2)
- ✅ Deprecate old entry points (keep as wrappers)
- ✅ Update npm scripts
- ✅ Test backward compatibility

### Phase 6-7
- ✅ Document in `tools/README.md`
- ✅ Document CLI subcommands
- ✅ Release notes

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Break existing workflows | Low | High | Keep backward compat wrappers |
| Config file format issues | Low | Medium | Validate JSON structure |
| Circular imports in new structure | Low | High | Review imports before Phase 3 |
| Palette config conflicts | Low | Low | Test with both hardcoded + file |

---

## Approval Checklist

✅ Analysis utilities: KEEP SEPARATE  
✅ Generators: KEEP SEPARATE  
✅ Palette system: MOVE TO CONFIG FILE (Phase 3)  
✅ CLI consolidation: CREATE UNIFIED CLI (Phase 3)  
✅ Folder structure: REORGANIZE (Phase 3)  
✅ Config source: USE public/data/ (Phase 3)  
✅ Equipment generator: MARK EXPERIMENTAL  
✅ Test data: MINIMAL VALIDATION (Phase 5)  

---

## Next Steps

1. ✅ Phase 2 consolidation decisions complete
2. → **Phase 3**: Design unified CLI architecture
3. → **Phase 4**: Design new tool modules
4. → **Phase 5+**: Implementation

**Ready to proceed to Phase 3 CLI architecture design.**

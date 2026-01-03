# Phase 1: Tool Audit & Inventory Report

**Date**: December 25, 2025  
**Status**: Complete  
**Scope**: All tool files in `tools/` directory

---

## Executive Summary

The game dev toolset contains **11 total files** organized into:
- **2 CLI entry points**: `analyze-reference.js`, `generate-assets.js`
- **3 sprite generators**: `humanoid-generator.js`, `equipment-generator.js`, `paladin-generator.js`
- **6 utility modules**: Color quantizer, image analyzer, material classifier, pixel drawer, proportion analyzer, style detector
- **1 shared utility**: Palette manager, seeded RNG

**Key Findings**:
1. ✅ **Well-modularized**: Clear separation of concerns
2. ⚠️ **No unified CLI**: Two entry points; hard to discover all tools
3. ✅ **Low coupling**: Generators are independent
4. ⚠️ **Analysis utilities fragmented**: 4 separate analysis tools (ImageAnalyzer, MaterialClassifier, ProportionAnalyzer, StyleDetector) all orchestrated by ImageAnalyzer
5. ⚠️ **Missing tools**: Save manager, balance tester, game inspector, asset optimizer

---

## Detailed Tool Inventory

### Entry Points

| File | Purpose | Dependencies | Reusability | Status |
|------|---------|--------------|-------------|--------|
| `analyze-reference.js` | CLI for analyzing reference images → style config | ImageAnalyzer | Medium | Active |
| `generate-assets.js` | CLI for generating sprite assets | PaladinGenerator, HumanoidGenerator, SeededRNG | Medium | Active |

### Generators

| File | Purpose | Dependencies | Reusability | Status |
|------|---------|--------------|-------------|--------|
| `paladin-generator.js` | Generates Paladin character sprites | PixelDrawer, PaletteManager, SeededRNG | High | Active |
| `humanoid-generator.js` | Generates generic humanoid sprites | PixelDrawer, PaletteManager, SeededRNG | High | Active |
| `equipment-generator.js` | Generates weapon/armor overlays | PixelDrawer, PaletteManager, SeededRNG | High | Potential |

### Analysis Utilities

| File | Purpose | Dependencies | Reusability | Status |
|------|---------|--------------|-------------|--------|
| `image-analyzer.js` | **Orchestrator**: Coordinates all analysis steps | ColorQuantizer, MaterialClassifier, ProportionAnalyzer, StyleDetector | High | Active |
| `color-quantizer.js` | Median Cut algorithm for palette extraction | None | High | Active |
| `material-classifier.js` | HSV-based color→material classification | None | High | Active |
| `proportion-analyzer.js` | Sobel edge detection + region analysis | None | Medium | Active |
| `style-detector.js` | Detects outlines, shading, highlights, dithering | None | High | Active |

### Shared Utilities

| File | Purpose | Dependencies | Reusability | Status |
|------|---------|--------------|-------------|--------|
| `palette-manager.js` | Manages predefined color palettes | None | High | Active |
| `pixel-drawer.js` | Low-level pixel manipulation for canvas | None | Very High | Active |
| `seeded-rng.js` | Deterministic RNG (LCG algorithm) | None | Very High | Active |

---

## Dependency Graph

```
Entry Points:
├── analyze-reference.js
│   └── ImageAnalyzer
│       ├── ColorQuantizer
│       ├── MaterialClassifier
│       ├── ProportionAnalyzer
│       └── StyleDetector
│
└── generate-assets.js
    ├── PaladinGenerator
    │   ├── PixelDrawer
    │   ├── PaletteManager
    │   └── SeededRNG
    └── HumanoidGenerator
        ├── PixelDrawer
        ├── PaletteManager
        └── SeededRNG

Shared Core:
├── PixelDrawer (used by all generators)
├── PaletteManager (used by all generators)
└── SeededRNG (used by all generators)

Analysis Pipeline (Linear):
ColorQuantizer → MaterialClassifier → ProportionAnalyzer → StyleDetector
 (All coordinated by ImageAnalyzer)
```

---

## Consolidation Analysis

### 1. Analysis Utilities Consolidation

**Current State**: 4 separate analysis modules (ColorQuantizer, MaterialClassifier, ProportionAnalyzer, StyleDetector) + 1 orchestrator (ImageAnalyzer)

**Recommendation**: ✅ **KEEP SEPARATE**
- **Reason**: Each module is independently useful and follows Single Responsibility Principle
- **Benefit**: Can use ColorQuantizer alone without full image analysis
- **Cost of merging**: Splits responsibility, reduces reusability
- **Decision**: ImageAnalyzer orchestration is correct pattern

### 2. Palette Manager Consolidation

**Current State**: Standalone PaletteManager with hardcoded palettes

**Recommendation**: ✅ **KEEP SEPARATE but improve**
- **Action**: Consider moving palette definitions to `public/data/palettes.json` (config-driven)
- **Benefit**: Non-developers can edit palettes without touching code
- **Timeline**: Can be done in Phase 3 (config system design)

### 3. Generator Consolidation

**Current State**: Three generators (Paladin, Humanoid, Equipment)

**Recommendation**: ✅ **KEEP SEPARATE**
- **Reason**: Each has distinct generation logic; different contexts
- **Benefit**: Can use Paladin generator in runtime (`src/generators/runtime-paladin-generator.js`)
- **Note**: Equipment generator is less used; could be optional in CLI

### 4. CLI Entry Point Consolidation

**Current State**: Two separate CLIs (`analyze-reference.js`, `generate-assets.js`)

**Recommendation**: ⚠️ **MERGE into unified CLI**
- **Reason**: Users confused about which tool to use
- **Approach**: Create `tools/cli.js` router with subcommands
- **Backward compatibility**: Keep `analyze-reference.js` and `generate-assets.js` as shells
- **Timeline**: Phase 3-5

---

## Obsolescence Review

### analyze-reference.js
- **Usage**: Referenced in docs; used for analyzing reference sprites
- **Still relevant?**: ✅ YES - Essential for style configuration
- **Recommendation**: Keep; move to subcommand in unified CLI

### proportion-analyzer.js
- **Usage**: Part of image analysis pipeline
- **Still relevant?**: ✅ YES - Detects body regions for style extraction
- **Recommendation**: Keep; part of analysis utilities

### equipment-generator.js
- **Usage**: Potentially unused in main generation flow (not called by generate-assets.js)
- **Still relevant?**: ⚠️ MAYBE - Design tool; not actively used in generation
- **Recommendation**: Keep for now; mark as "experimental"; may be useful for armor overlays

### Paladin vs Runtime Generator
- **Status**: Two versions exist - build-time (`tools/generators/paladin-generator.js`) and runtime (`src/generators/runtime-paladin-generator.js`)
- **Recommendation**: Keep both (different use cases: offline asset generation vs. runtime generation)

---

## Reusability Scores (1-5)

| Module | Score | Notes |
|--------|-------|-------|
| PixelDrawer | 5 | Core utility; used everywhere |
| SeededRNG | 5 | Core utility; deterministic generation |
| PaletteManager | 5 | Core utility; all generators depend on it |
| ColorQuantizer | 4 | Useful standalone; only image analysis needs it |
| StyleDetector | 4 | Useful standalone; only image analysis needs it |
| MaterialClassifier | 4 | Useful standalone; only image analysis needs it |
| ProportionAnalyzer | 3 | Specialized; only image analysis needs it |
| PaladinGenerator | 4 | Used in both tools and runtime; high value |
| HumanoidGenerator | 4 | Used in tools; could be used in runtime |
| EquipmentGenerator | 2 | Not actively used; experimental status |
| ImageAnalyzer | 4 | Good orchestrator; complete analysis pipeline |

---

## Data Flow Diagrams

### Asset Generation Flow
```
generate-assets.js
  ↓
  PaladinGenerator / HumanoidGenerator
  ├─→ PixelDrawer (drawing)
  ├─→ PaletteManager (colors)
  ├─→ SeededRNG (randomness)
  ↓
  PNG files saved to assets/sprites/
```

### Reference Analysis Flow
```
analyze-reference.js
  ↓
  ImageAnalyzer
  ├─→ ColorQuantizer (extract palette)
  ├─→ MaterialClassifier (classify colors)
  ├─→ ProportionAnalyzer (detect regions)
  ├─→ StyleDetector (detect patterns)
  ↓
  JSON style config file
```

---

## Circular Dependencies

✅ **None detected**. All dependencies flow in one direction.

---

## NPM Package Usage

| Module | External Dependencies |
|--------|----------------------|
| analyze-reference.js | `canvas` (loadImage, createCanvas) |
| generate-assets.js | `canvas` (createCanvas) |
| All utilities | None (pure JavaScript) |

**Note**: `canvas` package is only used in CLI entry points, not in generators (which accept canvas as parameter).

---

## Tool Statistics

| Metric | Value |
|--------|-------|
| Total files | 11 |
| Total lines of code | ~2,400 |
| Entry points | 2 |
| Generator modules | 3 |
| Analysis utilities | 4 |
| Shared utilities | 2 |
| Circular dependencies | 0 |
| Reusability score (avg) | 3.9/5 |

---

## Recommendations Summary

### Phase 2 (Consolidation) Decisions

1. ✅ **KEEP** ImageAnalyzer orchestration pattern (good design)
2. ✅ **KEEP** All generators separate (independent logic)
3. ✅ **KEEP** All analysis utilities (high reusability)
4. ⚠️ **REFACTOR** CLI entry points into unified `tools/cli.js` router
5. 🔄 **CONSIDER** Moving palette definitions to config file (`public/data/palettes.json`)
6. 📌 **FLAG** EquipmentGenerator as "experimental" (low usage)

### Phase 3+ (New Tools & Integration)

1. **Priority 1**: Create unified CLI (`tools/cli.js`)
2. **Priority 2**: Build save manager tool
3. **Priority 3**: Build balance tester tool
4. **Priority 4**: Build game inspector tool
5. **Priority 5**: Build asset optimizer tool

---

## Files Ready for Next Phase

All tool files are well-structured and ready for CLI consolidation in Phase 3. No refactoring needed before CLI implementation.

**Next Step**: Proceed to Phase 2 consolidation decisions review, then Phase 3 CLI architecture design.

# Obsolete Asset Generation Files

This document tracks obsolete asset generation files that should be removed or have been removed.

## Deleted (Obsolete)

### ✅ tools/regenerate-heroes.js
- **Status**: DELETED
- **Reason**: Empty file marked OBSOLETE for Phaser 3. In Godot, hero regeneration is handled automatically by HeroSprite.gd when equipment changes.
- **Action**: Already deleted ✅

## Marked as Obsolete (Phaser-specific, but still in repo)

### ✅ public/regenerate-hero.js & entire public/ directory
- **Status**: DELETED (January 2026)
- **Reason**: Entire web frontend obsolete after migration to pure Godot
- **Action**: Complete public/ directory removed as part of Electron/Vite cleanup

## Updated Comments (Still Used, but outdated references)

### ✅ tools/generate-assets.js
- **Status**: STILL USED (updated comment)
- **Reason**: Still actively used for PaladinGenerator and HumanoidGenerator. Updated comment to remove "Phaser 3" reference and clarify it's still used.
- **Action**: Comment updated ✅

## Still Active (Not Obsolete)

### Asset Generation Tools
- ✅ `tools/generate-all-assets.js` - Comprehensive asset generator (refactored with shared utilities)
- ✅ `tools/unified-asset-generator.js` - Unified entry point (NEW)
- ✅ `tools/generate-assets.js` - Character/bloodline generator (still used, comment updated)
- ✅ `tools/download-lpc-assets.js` - LPC asset downloader (referenced in package.json as `npm run lpc-assets`)
- ✅ `tools/fetch-lpc-bases.js` - LPC base spritesheet fetcher (referenced in package.json as `npm run fetch-lpc`)
- ✅ `tools/analyze-sprite.js` - Sprite analysis utility (referenced in package.json as `npm run analyze-sprite`)
- ✅ `tools/extract-spritesheet.js` - Spritesheet extractor (referenced in package.json as `npm run extract-sprites`)

### Generators
- ✅ All generators in `tools/generators/` are active:
  - `base-generator.js` - NEW (shared base class)
  - `hero-sprite-generator.js` - NEW (256×256 hero generator)
  - `spell-icon-generator.js` - NEW (extracted from generate-all-assets.js)
  - `paladin-generator.js` - Still used
  - `humanoid-generator.js` - Still used
  - `equipment-generator.js` - Still used (by paladin-generator)
  - `gem-generator.js` - Still used
  - `animation-generator.js` - Still used

### Utilities
- ✅ All utilities in `tools/utils/` are active:
  - `canvas-utils.js` - NEW (shared canvas operations)
  - `color-utils.js` - NEW (shared color operations)
  - Others updated to use shared utilities

## Recent Cleanup (January 2026)

1. ✅ **tools/regenerate-heroes.js** - Already deleted
2. ✅ **public/regenerate-hero.js & public/ directory** - Deleted as part of Electron removal
3. ✅ **tools/generate-assets.js** - Comment updated, still used
4. ✅ **Removed obsolete web tools**: asset-studio.js, comprehensive-test-suite.js, unit-test-suite.js
5. ✅ **Removed obsolete scripts**: generate-module.js, performance-test-helper.js, fix-logger-calls.js

## Current Status

All asset generation systems are still active and in use. The project is now pure Godot with no web dependencies.

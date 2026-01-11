# Tools Directory

This directory contains development tools and utilities for the Road of War project.

## Active Tools

### Core Tools

- **`generate-assets.js`** - Build-time pixel-art asset generator (legacy)
  - Generates PNG sprite files offline for character/bloodline assets
  - Usage: `npm run generate-assets`
  - Output: `assets/sprites/` directory
  - Note: For comprehensive asset generation, use `generate-all-assets.js` or `unified-asset-generator.js`

- **`generate-all-assets.js`** - Comprehensive asset generator (refactored)
  - Generates ALL visual assets: spell icons, enemy sprites, item icons, projectiles, VFX
  - Uses shared utilities (canvas-utils.js, color-utils.js) for consistency
  - Usage: `node tools/generate-all-assets.js`
  - Output: `road-to-war/assets/` with JSON metadata

- **`unified-asset-generator.js`** - Unified entry point for all asset generation (NEW)
  - Single `generate(type, data, options)` method for all asset types
  - Orchestrates all specialized generators
  - This is the ONLY place to add new asset types - no new generators needed
  - Usage: `import { UnifiedAssetGenerator } from './unified-asset-generator.js'; const generator = new UnifiedAssetGenerator(); await generator.generate('hero', heroData, { heroId: 'hero_0' });`

- **`smart-game-navigator.js`** - Smart game navigation tool
  - Automated game navigation and testing

### Test Runner

- **`test-runner.js`** - Unified test runner (NEW)
  - Consolidates all test scripts into one tool
  - Supports multiple test modes
  - Usage: `npm test [--mode=<mode>]`
  
  **Modes:**
  - `5man` (default) - Test 5-man team system
  - `full` - Run full test suite (starts servers + runs tests)
  - `auto` - Run automated test (assumes servers running)

  **Examples:**
  ```bash
  npm test                    # Default: 5man mode
  npm test -- --mode=full     # Full test suite
  npm test -- --mode=auto     # Quick test
  ```

### Test Scripts

- **`test-5man-direct-methods.js`** - 5-man team test using direct method calls
  - Most reliable test method
  - Bypasses UI interaction
  - Used by test-runner in 5man and auto modes


- **`run-full-test.js`** - Full test suite orchestrator
  - Starts dev server automatically
  - Waits for everything to be ready
  - Runs automated tests
  - Used by test-runner in full mode

### Asset Generation System (Unified Architecture - January 2026)

**Unified Entry Point:**
- `unified-asset-generator.js` - **NEW** - Single entry point for all asset generation. Provides `generate(type, data, options)` method for all asset types. This is the ONLY place to add new asset types - no new generators needed.

**Core Asset Generator:**
- `generate-all-assets.js` - Comprehensive asset generator (refactored with shared utilities). Generates spell icons (176), enemy sprites (10), item icons, projectiles (8), VFX (8). Uses Canvas 2D API. Outputs to `road-to-war/assets/` with JSON metadata. Usage: `node tools/generate-all-assets.js`.

### Generators (`generators/`)

**Base Generator:**
- `base-generator.js` - **NEW** - Shared base class for all generators with common utilities (canvas operations, color operations)

**Hero Sprite Generator (NEW - January 2026):**
- `hero-sprite-generator.js` - **NEW** - 256×256 hero sprite generator with realistic proportions (14% head ratio, not chibi). Exports at 128×128 for runtime use. Supports facial expressions, clothing textures, 5-level cel shading. Design at high resolution for detail, export at manageable size for performance.

**Spell Icon Generator:**
- `spell-icon-generator.js` - **NEW** - Spell/ability icon generator with keyword-driven motifs. Extracted from generate-all-assets.js inline functions.

**Legacy Generators:**
- `paladin-generator.js` - Paladin sprite generation (still used, not deprecated)
- `humanoid-generator.js` - Humanoid sprite generation (legacy, may be replaced)
- `equipment-generator.js` - Equipment sprite generation (used by paladin-generator)
- `gem-generator.js` - Gem icon generation (still used)
- `animation-generator.js` - Animation strip generation (still used)

**Remaining Generators (To Be Extracted):**
- EnemySpriteGenerator - To be extracted from generate-all-assets.js
- ItemIconGenerator - To be extracted from generate-all-assets.js
- ProjectileGenerator - To be extracted from generate-all-assets.js
- VFXGenerator - To be extracted from generate-all-assets.js

### Utilities (`utils/`)

**Shared Utilities (NEW - January 2026):**
- `canvas-utils.js` - **NEW** - Shared canvas operations (setupCanvasContext, drawIconPlate, resolveResPathToDisk, isMeaningfulTexture)
- `color-utils.js` - **NEW** - Shared color operations (hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, getLuma, ensureVisibleFill, clamp, normalizeHex, hexToRgbArray, hexToRgbaArray)

**Updated Utilities (Now Use Shared Color Utils):**
- `color-quantizer.js` - Color quantization (updated to use color-utils.js)
- `pixel-drawer.js` - Pixel drawing utilities (updated to use color-utils.js)
- `material-classifier.js` - Material classification (updated to use color-utils.js)
- `glow-renderer.js` - Glow effect rendering (updated to use color-utils.js)

**Other Utilities:**
- `image-analyzer.js` - Image analysis
- `palette-manager.js` - Palette management
- `proportion-analyzer.js` - Proportion analysis
- `seeded-rng.js` - Seeded random number generation
- `style-detector.js` - Style detection
- `texture-generator.js` - Texture generation
- `qa-validator.js` - QA validation
- `variation-manager.js` - Variation management
- `export-manager.js` - Export management

## Archived Tools

Redundant test scripts have been archived to `tools/archive/test-scripts/`:

- Old test scripts (test-5man-*.js variants)
- Analysis scripts (analyze-*.js)
- Verification scripts (verify-*.js)
- Monitoring scripts (monitor-*.js)
- Navigation scripts (navigate-*.js)
- And other redundant utilities

These can be referenced if needed but are not actively maintained.

## Usage Examples

### Running Tests

```bash
# Run default test (5man mode)
npm test

# Run full test suite (starts everything)
npm test -- --mode=full

# Quick test (assumes servers running)
npm test -- --mode=auto

# Run automated tests
```

### Generating Assets

```bash
npm run generate-assets
```

### Running Tests

```bash
# Start development server first
# Run tests
npm test -- --mode=auto
```

## Development

When adding new tools:

1. Place in appropriate subdirectory (`generators/`, `utils/`, or root)
2. Update this README with tool description and usage
3. Add npm script to `package.json` if tool should be easily accessible
4. Document command-line arguments and options

## Notes

- All tools use ES Modules (import/export)
- Tools should be executable via `node tools/<script>.js`
- Test scripts work with the running development server
- Dev server should be running on port 3000 for tests



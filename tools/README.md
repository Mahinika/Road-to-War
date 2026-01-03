# Tools Directory

This directory contains development tools and utilities for the Road of War project.

## Active Tools

### Core Tools

- **`generate-assets.js`** - Build-time pixel-art asset generator
  - Generates PNG sprite files offline for use in Phaser 3
  - Usage: `npm run generate-assets`
  - Output: `assets/sprites/` directory

- **`agent-manager.js`** - Multi-agent workflow helper (Cursor-native, no paid APIs)
  - Generates per-lane prompt files you paste into multiple Cursor chats (gameplay/ui/infra)
  - Collects unified diff patches and applies them via `git apply`
  - Config: `tools/agent-manager.config.json`
  - Usage:
    - `npm run agent:prep -- --task "..."` (writes `agent-out/prompts/*.md`)
    - Save each agent response to `agent-out/patches/<lane>.patch`
    - `npm run agent:apply`
  - One-command wrapper:
    - `npm run manager -- --task "..." --open` (generates prompts and opens them)
    - Windows launcher: `Start Manager Tool.bat` (double-click)

- **MCP server (Cursor integration)**:
  - Run: `npm run mcp:manager`
  - Setup: `docs/MCP_MANAGER_SETUP.md`

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

### Generators (`generators/`)

Build-time asset generators used by `generate-assets.js`:

- `paladin-generator.js` - Paladin sprite generation
- `humanoid-generator.js` - Humanoid sprite generation
- `equipment-generator.js` - Equipment sprite generation

### Utilities (`utils/`)

Supporting utilities for generators:

- `color-quantizer.js` - Color quantization
- `image-analyzer.js` - Image analysis
- `material-classifier.js` - Material classification
- `palette-manager.js` - Palette management
- `pixel-drawer.js` - Pixel drawing utilities
- `proportion-analyzer.js` - Proportion analysis
- `seeded-rng.js` - Seeded random number generation
- `style-detector.js` - Style detection

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



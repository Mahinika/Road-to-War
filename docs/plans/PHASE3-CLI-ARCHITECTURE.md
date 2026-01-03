# Phase 3: Unified CLI Architecture Design

**Date**: December 25, 2025  
**Status**: Complete Design  
**Scope**: CLI router, command structure, shared infrastructure

---

## Executive Summary

**Objective**: Design unified CLI interface (`game-tools`) with:
1. Single entry point with subcommand routing
2. Shared config/logging infrastructure
3. Extensible architecture for future tools
4. Full backward compatibility with existing workflows

**CLI Command Structure**:
```bash
game-tools <command> [options]
  analyze        Analyze reference images → style config
  generate       Generate pixel-art assets
  test-balance   [NEW] Test progression/economy balance
  inspect-save   [NEW] Inspect and repair save files
  inspect-game   [NEW] Live game state viewer
  optimize       [NEW] Analyze asset generation performance
  --help, -h     Show help
  --version, -v  Show version
```

---

## Part 1: CLI Architecture

### 1.1 Entry Point Design

**File**: `tools/cli.js`

```javascript
#!/usr/bin/env node
/**
 * Unified Game Dev Tools CLI
 * Central router for all development tools
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
).version;

// Command registry
const COMMANDS = {
  analyze: () => import('./commands/analyze.js'),
  generate: () => import('./commands/generate.js'),
  'test-balance': () => import('./commands/test-balance.js'),
  'inspect-save': () => import('./commands/inspect-save.js'),
  'inspect-game': () => import('./commands/inspect-game.js'),
  optimize: () => import('./commands/optimize-assets.js')
};

// Global help text
const HELP_TEXT = `
Game Dev Tools CLI v${PKG_VERSION}

Usage: game-tools <command> [options]

Commands:
  analyze           Analyze reference images to extract style configuration
  generate          Generate pixel-art sprite assets from configuration
  test-balance      Test game progression curves and economy balance
  inspect-save      Inspect, validate, and repair save files
  inspect-game      Live view of game state during development
  optimize          Profile and optimize asset generation performance

Options:
  --help, -h        Show this help message
  --version, -v     Show CLI version
  --verbose         Enable verbose logging
  --quiet           Suppress non-error output

Examples:
  game-tools analyze --input ./reference-images/paladin.png
  game-tools generate --seed 12345 --count 10
  game-tools test-balance curves --output balance-report.csv
  game-tools inspect-save --file game-data/saves/slot1.json
  game-tools inspect-game start
  game-tools optimize profile

For command-specific help:
  game-tools <command> --help
`;

async function main() {
  const args = process.argv.slice(2);
  
  // Handle no arguments
  if (args.length === 0) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  
  const [command, ...commandArgs] = args;
  
  // Handle global options
  if (command === '--help' || command === '-h') {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  
  if (command === '--version' || command === '-v') {
    console.log(`game-tools v${PKG_VERSION}`);
    process.exit(0);
  }
  
  // Route to command
  if (!COMMANDS[command]) {
    console.error(`Error: Unknown command "${command}"`);
    console.error('Use --help for usage information\n');
    process.exit(1);
  }
  
  try {
    const module = await COMMANDS[command]();
    if (!module.execute) {
      throw new Error(`Command "${command}" missing execute function`);
    }
    
    await module.execute(commandArgs);
  } catch (error) {
    console.error(`Error executing command "${command}":`, error.message);
    process.exit(1);
  }
}

main();
```

---

### 1.2 Command Structure

Each command is a module with standardized interface:

**File Pattern**: `tools/commands/<command>.js`

```javascript
/**
 * Command Module Interface
 * All commands follow this pattern
 */

export async function execute(args) {
  // Parse arguments
  const options = parseArgs(args);
  
  // Validate options
  validateOptions(options);
  
  // Execute command
  const result = await runCommand(options);
  
  // Output results
  outputResults(result, options);
  
  // Exit with status code
  process.exit(result.success ? 0 : 1);
}

function parseArgs(args) {
  // Standard argument parsing with minimist or custom parser
  return { /* parsed options */ };
}

function validateOptions(options) {
  // Throw descriptive errors if options invalid
}

async function runCommand(options) {
  // Core command logic
  return { success: true, data: {...} };
}

function outputResults(result, options) {
  // Format output (JSON, human-readable, CSV, etc.)
  if (options.json) {
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log(result.message);
  }
}
```

---

### 1.3 Shared Infrastructure

#### A) Configuration System

**File**: `tools/config/game-config.js`

```javascript
/**
 * Unified configuration loader
 * Loads game config from public/data/ and provides to tools
 */

import fs from 'fs';
import path from 'path';

export class GameConfig {
  constructor() {
    this.config = {};
    this.configPath = path.join(__dirname, '../../public/data');
  }
  
  loadAll() {
    // Load all config files
    const files = [
      'palettes.json',
      'stats-config.json',
      'world-config.json',
      'items.json',
      'enemies.json',
      'prestige-config.json',
      'specializations.json',
      'classes.json'
    ];
    
    files.forEach(file => {
      const filePath = path.join(this.configPath, file);
      if (fs.existsSync(filePath)) {
        const name = file.replace('.json', '');
        this.config[name] = JSON.parse(
          fs.readFileSync(filePath, 'utf-8')
        );
      }
    });
    
    return this.config;
  }
  
  get(key, defaultValue = null) {
    return this.config[key] ?? defaultValue;
  }
}
```

#### B) Logging System

**File**: `tools/logging/logger.js`

```javascript
/**
 * Unified logging system
 * Consistent output format across all tools
 */

export class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
    this.logFile = options.logFile ?? null;
    this.startTime = Date.now();
  }
  
  info(message) {
    if (!this.quiet) console.log(`ℹ  ${message}`);
    this._writeLog(`INFO: ${message}`);
  }
  
  success(message) {
    if (!this.quiet) console.log(`✓ ${message}`);
    this._writeLog(`SUCCESS: ${message}`);
  }
  
  error(message) {
    console.error(`✘ ${message}`);
    this._writeLog(`ERROR: ${message}`);
  }
  
  warn(message) {
    console.warn(`⚠  ${message}`);
    this._writeLog(`WARN: ${message}`);
  }
  
  debug(message) {
    if (this.verbose) console.log(`🐛 ${message}`);
    this._writeLog(`DEBUG: ${message}`);
  }
  
  _writeLog(message) {
    if (this.logFile) {
      // Append to log file
      fs.appendFileSync(
        this.logFile,
        `[${new Date().toISOString()}] ${message}\n`
      );
    }
  }
  
  summary(title, data) {
    if (!this.quiet) {
      console.log(`\n${title}`);
      console.log('─'.repeat(title.length));
      Object.entries(data).forEach(([key, value]) => {
        console.log(`${key.padEnd(20)}: ${value}`);
      });
    }
  }
  
  elapsed() {
    const ms = Date.now() - this.startTime;
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  }
}
```

#### C) Error Handling

**File**: `tools/errors/cli-errors.js`

```javascript
/**
 * Standardized CLI error classes
 * All tools use these for consistent error handling
 */

export class CLIError extends Error {
  constructor(message, code = 1, suggestions = []) {
    super(message);
    this.code = code;
    this.suggestions = suggestions;
    this.name = this.constructor.name;
  }
  
  toString() {
    let output = `${this.name}: ${this.message}`;
    if (this.suggestions.length > 0) {
      output += '\n\nSuggestions:';
      this.suggestions.forEach(s => {
        output += `\n  • ${s}`;
      });
    }
    return output;
  }
}

export class ConfigError extends CLIError {
  constructor(message, suggestions = []) {
    super(message, 1, suggestions);
  }
}

export class ValidationError extends CLIError {
  constructor(message, suggestions = []) {
    super(message, 2, suggestions);
  }
}

export class GenerationError extends CLIError {
  constructor(message, suggestions = []) {
    super(message, 3, suggestions);
  }
}
```

#### D) Output Formatting

**File**: `tools/output/formatters.js`

```javascript
/**
 * Output formatting utilities
 * Support multiple formats: human-readable, JSON, CSV, HTML
 */

export class OutputFormatter {
  static human(data, title = '') {
    if (title) {
      console.log(`\n${title}`);
      console.log('─'.repeat(title.length));
    }
    
    if (Array.isArray(data)) {
      data.forEach(item => console.log(`  • ${item}`));
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log(`  ${data}`);
    }
  }
  
  static json(data) {
    return JSON.stringify(data, null, 2);
  }
  
  static csv(rows, headers) {
    let output = headers.join(',') + '\n';
    rows.forEach(row => {
      output += Object.values(row).join(',') + '\n';
    });
    return output;
  }
  
  static html(data, title = '') {
    // Generate simple HTML report
    return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial; margin: 20px; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <!-- Content here -->
</body>
</html>`;
  }
}
```

---

## Part 2: Command Specifications

### Command 1: Analyze

**File**: `tools/commands/analyze.js`

Refactored from `tools/analyze-reference.js` with enhanced error handling.

```javascript
/**
 * Analyze Reference Images Command
 * Extracts style configuration from reference images
 */

import { Logger } from '../logging/logger.js';
import { GameConfig } from '../config/game-config.js';
import { ImageAnalyzer } from '../utils/image-analyzer.js';
import { CLIError, ValidationError } from '../errors/cli-errors.js';

export async function execute(args) {
  const logger = new Logger({ verbose: args.includes('--verbose') });
  
  try {
    // Parse arguments
    const options = parseArgs(args);
    
    // Validate options
    if (!options.input) {
      throw new ValidationError(
        'Input image or directory is required',
        [
          'Use: game-tools analyze --input <path>',
          'Example: game-tools analyze --input ./reference-images/paladin.png'
        ]
      );
    }
    
    logger.info(`Analyzing reference image: ${options.input}`);
    
    // Load game config (for default palettes, etc.)
    const config = new GameConfig();
    config.loadAll();
    
    // Run analysis
    const analyzer = new ImageAnalyzer();
    const result = await analyzer.analyzeReference(options.input, {
      maxColors: options.maxColors
    });
    
    // Save output
    if (options.output) {
      fs.writeFileSync(
        options.output,
        JSON.stringify(result, null, 2)
      );
      logger.success(`Analysis saved to: ${options.output}`);
    } else {
      logger.info('Analysis result:');
      console.log(JSON.stringify(result, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    logger.error(error.toString());
    process.exit(error.code ?? 1);
  }
}

function parseArgs(args) {
  const options = {
    input: null,
    output: null,
    maxColors: 16
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') options.input = args[++i];
    else if (arg === '--output' || arg === '-o') options.output = args[++i];
    else if (arg === '--max-colors') options.maxColors = parseInt(args[++i], 10);
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Analyze Reference Images

Usage: game-tools analyze [options]

Options:
  --input, -i <path>      Input image file or directory (required)
  --output, -o <path>     Output JSON file (default: stdout)
  --max-colors <number>   Colors to extract (default: 16)
  --help, -h              Show this help

Examples:
  game-tools analyze --input ./reference/paladin.png --output style.json
  game-tools analyze -i ./reference/humanoid.png -o ./style-config.json
      `);
      process.exit(0);
    }
  }
  
  return options;
}
```

### Command 2: Generate

**File**: `tools/commands/generate.js`

Refactored from `tools/generate-assets.js` with improved error handling.

```javascript
/**
 * Generate Assets Command
 * Creates pixel-art sprites and sprite sheets
 */

import { Logger } from '../logging/logger.js';
import { GameConfig } from '../config/game-config.js';
import { PaladinGenerator } from '../generators/paladin-generator.js';
import { HumanoidGenerator } from '../generators/humanoid-generator.js';
import { SeededRNG } from '../utils/seeded-rng.js';
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

export async function execute(args) {
  const logger = new Logger({ verbose: args.includes('--verbose') });
  
  try {
    // Parse arguments
    const options = parseArgs(args);
    
    // Load game config
    const config = new GameConfig();
    config.loadAll();
    
    // Ensure output directory
    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output, { recursive: true });
      logger.info(`Created output directory: ${options.output}`);
    }
    
    logger.info(`Generating ${options.count} sprites with seed ${options.seed}`);
    
    // Create RNG instance
    const rng = new SeededRNG(options.seed);
    
    // Generate sprites
    let generated = 0;
    for (let i = 0; i < options.count; i++) {
      const canvas = createCanvas(48, 48);
      
      // Use specified generator
      const generator = options.generator === 'humanoid'
        ? new HumanoidGenerator(canvas, rng)
        : new PaladinGenerator(canvas, rng);
      
      generator.generate();
      
      // Save PNG
      const filename = `${options.generator}_${i}.png`;
      const filepath = path.join(options.output, filename);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filepath, buffer);
      
      generated++;
      if (options.verbose) {
        logger.debug(`Generated: ${filename}`);
      }
    }
    
    logger.success(`Generated ${generated} sprites`);
    logger.summary('Generation Summary', {
      'Sprites generated': generated,
      'Output directory': options.output,
      'Generator': options.generator,
      'Seed': options.seed,
      'Time elapsed': logger.elapsed()
    });
    
    process.exit(0);
  } catch (error) {
    logger.error(error.toString());
    process.exit(error.code ?? 1);
  }
}

function parseArgs(args) {
  const options = {
    count: 10,
    seed: 12345,
    output: path.join(process.cwd(), 'assets/sprites'),
    generator: 'paladin', // 'paladin' or 'humanoid'
    style: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--count') options.count = parseInt(args[++i], 10);
    else if (arg === '--seed') options.seed = parseInt(args[++i], 10);
    else if (arg === '--output' || arg === '-o') options.output = args[++i];
    else if (arg === '--generator' || arg === '-g') options.generator = args[++i];
    else if (arg === '--style') options.style = args[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Generate Pixel-Art Sprites

Usage: game-tools generate [options]

Options:
  --count <number>        Number of sprites (default: 10)
  --seed <number>         Random seed (default: 12345)
  --output, -o <path>     Output directory (default: assets/sprites)
  --generator, -g <type>  Generator type: paladin|humanoid (default: paladin)
  --style <path>          Style configuration JSON file
  --help, -h              Show this help

Examples:
  game-tools generate --count 50 --seed 54321
  game-tools generate -o ./output --generator humanoid --count 20
  game-tools generate --style ./style-config.json
      `);
      process.exit(0);
    }
  }
  
  return options;
}
```

---

## Part 3: Package.json Integration

### npm Script Updates

```json
{
  "scripts": {
    "game-tools": "node tools/cli.js",
    "generate-assets": "node tools/cli.js generate",
    "analyze-reference": "node tools/cli.js analyze",
    "test-balance": "node tools/cli.js test-balance",
    "inspect-save": "node tools/cli.js inspect-save",
    "inspect-game": "node tools/cli.js inspect-game",
    "optimize-assets": "node tools/cli.js optimize"
  },
  "bin": {
    "game-tools": "tools/cli.js"
  }
}
```

### Global Installation (Optional)

Users can install globally:
```bash
npm install -g .
game-tools analyze --input ./reference/paladin.png
```

---

## Part 4: Directory Structure (Final)

```
tools/
├── cli.js                          # Main entry point (#!/usr/bin/env node)
├── commands/
│   ├── analyze.js                 # Refactored analyze-reference.js
│   ├── generate.js                # Refactored generate-assets.js
│   ├── test-balance.js            # NEW: Phase 4
│   ├── inspect-save.js            # NEW: Phase 4
│   ├── inspect-game.js            # NEW: Phase 4
│   └── optimize-assets.js         # NEW: Phase 4
├── config/
│   └── game-config.js             # Unified config loader
├── logging/
│   └── logger.js                  # Shared logging system
├── errors/
│   └── cli-errors.js              # Standardized error classes
├── output/
│   └── formatters.js              # Output formatting utilities
├── generators/
│   ├── humanoid-generator.js      # No change
│   ├── equipment-generator.js     # No change (marked experimental)
│   └── paladin-generator.js       # No change
├── utils/
│   ├── color-quantizer.js         # No change
│   ├── image-analyzer.js          # No change
│   ├── material-classifier.js     # No change
│   ├── palette-manager.js         # Refactored for config (Phase 3+)
│   ├── pixel-drawer.js            # No change
│   ├── proportion-analyzer.js     # No change
│   ├── seeded-rng.js              # No change
│   └── style-detector.js          # No change
├── analyze-reference.js            # DEPRECATED: Wrapper → cli.js analyze
└── generate-assets.js              # DEPRECATED: Wrapper → cli.js generate

public/data/
├── palettes.json                  # NEW: Extracted from PaletteManager
├── stats-config.json              # Existing
├── world-config.json              # Existing
├── items.json                     # Existing
├── enemies.json                   # Existing
├── prestige-config.json           # Existing
├── specializations.json           # Existing
└── classes.json                   # Existing
```

---

## Part 5: Implementation Checklist

### Phase 3 (This Phase)

**Week 1 Tasks**:
- [ ] Create `tools/cli.js` router
- [ ] Create `tools/config/game-config.js`
- [ ] Create `tools/logging/logger.js`
- [ ] Create `tools/errors/cli-errors.js`
- [ ] Create `tools/output/formatters.js`
- [ ] Refactor `analyze-reference.js` → `commands/analyze.js`
- [ ] Refactor `generate-assets.js` → `commands/generate.js`
- [ ] Create `public/data/palettes.json` from PaletteManager
- [ ] Update `package.json` scripts
- [ ] Test backward compatibility

**Testing**:
```bash
# Old commands still work
npm run generate-assets
npm run analyze-reference

# New CLI commands work
npm run game-tools -- analyze --help
npm run game-tools -- generate --help
npm run game-tools -- --help
```

---

## Part 6: Design Decisions

### Decision A: Command Module Pattern

**Pattern**: Each command is async function in separate file

**Rationale**:
- Lazy loading: Only loaded when executed
- Easy to add/remove commands
- Isolated error handling per command
- Clear interface: All commands implement `execute(args)`

### Decision B: Configuration Loading

**Pattern**: Lazy-loaded on demand; cached after first load

**Rationale**:
- Not all tools need all config
- Avoid slow startup for simple commands
- Single source of truth: `public/data/`

### Decision C: Shared vs. Command-Specific Config

**Pattern**: Shared config in `tools/config/`; command-specific in command files

**Rationale**:
- Keeps core infrastructure separate
- Commands can add their own option parsing
- Easy to test commands independently

### Decision D: Error Handling

**Pattern**: Standardized error codes + helpful suggestions

**Rationale**:
- Scripts can check exit code
- Users get actionable error messages
- Consistent across all tools

---

## Part 7: Future Extensibility

### Adding New Tool Example

To add a new tool (e.g., `game-tools profile`):

1. Create `tools/commands/profile.js`:
```javascript
export async function execute(args) {
  // Implement command logic
}
```

2. Register in `tools/cli.js`:
```javascript
const COMMANDS = {
  // ... existing commands
  profile: () => import('./commands/profile.js')
};
```

3. Add help text to `HELP_TEXT` in `cli.js`

4. Test:
```bash
npm run game-tools -- profile --help
```

---

## Success Criteria

✅ Single CLI entry point with subcommands  
✅ Backward compatibility (old scripts still work)  
✅ Shared infrastructure (config, logging, errors)  
✅ Extensible command pattern  
✅ Clear error messages with suggestions  
✅ Consistent output formatting  
✅ All existing functionality preserved  

---

## Next Steps

1. ✅ Phase 3 architecture designed
2. → **Phase 4**: Design new tool modules (save-manager, balance-tester, inspector, optimizer)
3. → **Phase 5**: Implementation roadmap
4. → **Phase 6**: Integration decisions
5. → **Phase 7**: Documentation & release

**Ready to proceed to Phase 4 new tool design.**

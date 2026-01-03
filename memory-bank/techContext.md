# Technical Context: Incremental Prestige RPG

## Technology Stack

### Core Technologies
- **Engine**: Godot 4.x
- **Language**: GDScript
- **Architecture**: Manager Pattern with Singleton Autoloads
- **Build Tool**: Godot Export System
- **Desktop Framework**: Native Godot (Windows/macOS/Linux/Steam)
- **Package Manager**: npm (for development tools)
- **Version Control**: Git

### Development Environment
- **IDE**: Cursor (VS Code-based with AI assistance)
- **Engine**: Godot 4.x Editor (professional game development environment)
- **Language**: GDScript with full IntelliSense and debugging
- **Testing**: Godot's built-in testing framework + custom validation
- **Linting**: Godot's built-in code analysis
- **Version Control**: Git integration with Godot

## Godot 4.x Configuration

### Why Godot 4.x?
- **Professional Game Engine**: Industry-standard 2D/3D game development platform
- **Superior Performance**: Better rendering pipeline and memory management than Phaser
- **Native Desktop Support**: Direct compilation to Windows/macOS/Linux executables
- **Advanced Editor**: Professional development environment with visual tools
- **Modern Architecture**: Component-based design with powerful node system
- **Cross-Platform Deployment**: Steam-ready with excellent platform support
- **GDScript**: Python-like syntax that's beginner-friendly yet powerful

### Key Godot Features Used
- **Scene System**: Node-based scene organization (Main, World, HUD scenes)
- **Node Architecture**: Control nodes for UI, CharacterBody2D for movement
- **AnimationPlayer**: Advanced animation system with keyframe support
- **Input System**: Godot's input mapping and action system
- **RichTextLabel**: For combat log and formatted text display
- **Autoload Singletons**: Manager pattern implementation as global singletons
- **File System**: Built-in file I/O for save/load functionality

## Development Setup Requirements

### Godot 4.x Installation
- **Godot Version**: 4.x (latest stable)
- **Download**: From official Godot website
- **Why**: Professional game development environment with all tools included

### System Requirements
- **OS**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **GPU**: OpenGL 3.3+ compatible graphics card
- **Storage**: 2GB free space for Godot + project files

### Development Workflow
- **Editor**: Godot's built-in editor (professional IDE)
- **Project Files**: Direct editing of .tscn scenes and .gd scripts
- **Hot Reload**: Built-in scene/script reloading during development
- **Debugging**: Integrated debugger with breakpoints and variable inspection
- **Profiling**: Built-in performance monitoring and optimization tools

## Project Dependencies

### Core Dependencies
- **Godot Engine**: 4.x (all functionality built-in)
- **GDScript**: Python-like scripting language (built-in)
- **Node System**: Component-based architecture (built-in)

### Development Dependencies
- **Godot Editor**: Professional development environment
- **Git**: Version control system
- **Optional Tools**: Image editors, audio tools for asset creation

## UI System Architecture

### WoW WOTLK UI Implementation (December 2025)
**Complete UI redesign to match World of Warcraft Wrath of the Lich King aesthetic**

**UI Theme System:**
- **ui-theme.js**: Centralized theme tokens with WoW WOTLK color palette
  - Dark surfaces (0x0a0a0a to 0x1a1a2e)
  - Gold/bronze borders (0xc9aa71, 0x8b6914)
  - Class-specific accent colors
  - Texture simulation colors for gradient effects

**WoW UI Helpers:**
- **wow-ui-helper.js**: WoW-specific UI creation functions
  - `createWoWFrame()`: Unit/party frames with class-colored borders
  - `createWoWBar()`: Health/mana bars with textures, gradients, and class-colored borders
  - `createWoWButton()`: Action bar buttons with cooldown overlays and keybind indicators

**UI Components:**
- **Party Frames**: Left side, vertical stack, compact design with class-colored borders
- **Player Frame**: Bottom-left corner, larger than party frames
- **Target Frame**: Top-center, shows enemy information during combat
- **Action Bars**: Bottom of screen, 2 rows × 6 buttons = 12 slots
- **Top HUD**: Compact resource displays (Gold, Bag, Mana) with minimap placeholder
- **Chat System**: Bottom-left, scrollable text area with message type colors
- **Combat Log**: Enhanced with floating combat text and WoW-style damage/healing numbers
- **Minimap**: Top-right corner, circular design (120px diameter)

**Camera System:**
- **CameraManager**: Dynamic camera system that keeps all 5 party members visible
  - Calculates party bounding box (leftmost to rightmost hero)
  - Adjusts camera position/offset automatically
  - Smooth interpolation for camera movement
  - Dynamic deadzone adjustment based on party spread

## Build and Deployment

### Development Build
- **Method**: Open `road-to-war/project.godot` in Godot Editor
- **Features**: Live editing, instant scene/script updates, debugging
- **Purpose**: Active development and testing
- **Hot Reload**: Automatic when editing scenes/scripts

### Production Build
- **Method**: Godot Editor → Project → Export
- **Features**: Optimized binary compilation
- **Output**: Platform-specific executables
- **Platforms**: Windows, macOS, Linux, HTML5

### Desktop Deployment
- **Windows**: Direct .exe file generation
- **macOS**: .app bundle creation
- **Linux**: Binary executable
- **Steam**: Ready for Steam distribution
- **Size**: ~50-100MB (much smaller than Electron)
- **Requirements**: Zero external dependencies for end users

### Deployment Targets
- **Desktop**: Native executables (Windows/macOS/Linux) - primary
- **Web**: HTML5 export for browser play - secondary
- **Steam**: Direct Steam integration support

## Performance Considerations

### Desktop Optimization
- **Target**: 60 FPS on modern desktop hardware
- **Resolution**: 1920x1080 (scalable, optimized for desktop displays)
- **Memory**: Efficient texture management for desktop performance
- **Input**: Keyboard and mouse optimized controls

## Code Organization Standards

### Module Structure
- **ES Modules**: Import/export syntax
- **Single Responsibility**: Each module has one clear purpose
- **No Global Variables**: Avoid window pollution
- **Dependency Injection**: Pass dependencies explicitly

### Naming Conventions
- **Files**: kebab-case (example: game-manager.js)
- **Classes**: PascalCase (example: GameManager)
- **Functions**: camelCase (example: updateStats)
- **Constants**: UPPER_SNAKE_CASE (example: MAX_HEALTH)

### Error Handling
- **Try-Catch**: Wrap potentially failing operations
- **Graceful Degradation**: Fallbacks for missing features
- **Console Logging**: Standard console.log/error for development debugging
- **User Feedback**: Clear error messages for game-breaking issues

### Console Log Capture System
- **Electron**: Real-time capture via `webContents.on('console-message')` event
- **Browser**: Console method override with localStorage persistence
- **Log File**: `logs/game-output.log` (auto-updated in real-time)
- **Access**: Read `logs/game-output.log` file or use `window.gameLogs` in browser console
- **Verification**: `window.verifyConsoleCapture()` function available in console
- **Troubleshooting Workflow**: User says "check logs" → AI automatically reads full log file and fixes issues
- **Purpose**: Enable live debugging and log inspection during development

## Development Workflow

### Godot Editor Workflow
- **Scene Editing**: Visual scene composition with drag-and-drop node system
- **Script Editing**: GDScript with full IntelliSense and debugging
- **Live Testing**: F5 to run game, F6 to run current scene
- **Hot Reload**: Automatic updates when editing scenes/scripts
- **Version Control**: Git integration with automatic .gitignore for Godot files

### Code Review Process
- **Self-Review**: Test changes in Godot editor before committing
- **Godot Analysis**: Built-in code analysis and warnings
- **Scene Testing**: Run individual scenes to verify functionality
- **Documentation**: Update memory bank with significant changes
- **Debug Output**: Godot's console output for runtime debugging

## Asset Management Strategy

### Current Implementation
- **JSON Data Files**: Located in `road-to-war/data/` loaded by DataManager singleton
  - All configuration files migrated and loading correctly
  - items.json, enemies.json, world-config.json, classes.json, specializations.json
  - talents.json, stats-config.json, abilities.json, achievements.json, prestige-config.json
  - bloodlines.json, skill-gems.json, animation-config.json, keyframe-configs.json
- **Asset Organization**: Godot's resource system with .import files for optimization
  - Sprites in `assets/sprites/` with automatic import processing
  - Equipment sprites in `assets/sprites/equipment/` (referenced via JSON texture paths)
  - Audio placeholders in `assets/audio/` (ready for WAV/OGG files)
  - Icons in `assets/icons/` with gem variations
- **Data-Driven Architecture**: All gameplay values from JSON configuration
- **Save System**: Godot's FileAccess for cross-platform save/load functionality

### Hero Asset Creation Pipeline (SOP v3.0 - January 2026)
- **Modular Paper Doll System**: HeroSprite.gd uses layered Sprite2D nodes for equipment visualization
  - Layers: Body (base), Legs, Chest, Shoulder, Head, Weapon, Offhand
  - Pivot: Bottom-center alignment (Vector2(-32, -64) for 64×64 grid)
  - Transparency: SpriteTransparency.gdshader applied to all layers for pixel-perfect transparency
- **JSON-Driven Equipment Visuals**: Equipment items define visual properties in items.json:
  - `texture`: Direct sprite paths (e.g., "res://assets/sprites/equipment/paladin_sword_legendary.png")
  - `modulate`: HEX color strings with alpha (e.g., "#FFD70080" for legendary gold tint)
  - `glow_shader_param`: Float values (0.0-1.0) for glow intensity on high-tier items
  - `class_restriction`: Arrays of allowed classes (e.g., ["paladin", "warrior"])
- **Animation System**: Programmatic AnimationPlayer with SOP v3.0 compliant specifications
  - All animations use precise durations and frame counts as specified in SOP
  - Smooth transitions with sine wave interpolation for natural motion
  - Death animation integrates with ParticleManager for visual effects
- **Documentation**: Complete SOP v3.0 guide in `docs/HERO_ASSET_CREATION_GUIDE.md`
  - Art style guidelines (Dragumagu-inspired pixel-perfect chibi)
  - Technical implementation pipeline
  - Animation specifications table
  - File naming conventions
  - QA automation checklist

### Production Ready Tech (January 2026)
- **Audio Cross-fading Pipeline**: `AudioManager.gd` uses dual `AudioStreamPlayer` nodes to enable seamless cross-fading between "travel" and "combat" music tracks using `Tween` for volume linear-to-db transitions.
- **Upgrade-Aware Equipment System**: `EquipmentManager.gd` implements a weighted scoring algorithm (Stats + iLvl + Rarity) to automatically detect and equip best-in-slot items from the player's inventory.
- **High-Frequency Resource Management**: `ResourceManager.gd` is tuned for a 3-second combat cycle, with base regeneration rates increased (8 mana/sec, 10 energy/sec) and ability costs scaled proportionally in `abilities.json`.
- **Advanced VFX Tinting**: `ParticleManager.gd` utilizes `spec_color` parameters to modulate particle gradients, allowing class-specific visual signatures for all combat effects.
- **Atmospheric Modulators**: `World.gd` leverages `CanvasModulate` for high-speed atmospheric transitions during boss encounters, synchronized with `CameraManager` shake and zoom triggers.

**Resource Management System (December 2025):**
- **ResourceManager** (src/managers/resource-manager.js): Manages mana/energy/focus resources per hero
  - Per-hero resource pools with custom regeneration rates
  - Regeneration strategies (Passive 1.0x, Active 1.5x, Burst 2.0x for 3 seconds)
  - Consumable inventory system (Map<itemId, consumableData>)
  - Resource consumption and restoration methods
  - Temporary regeneration boost support
- **Consumables**: Defined in items.json under `consumables` section
  - Minor/Major Mana Potions, Health Potions, Energy Drinks
  - Mana Regeneration Potions (temporary boost)
  - Effects: restoreMana, restoreHealth, restoreEnergy, manaRegenBoost

### 5-Man Team Data Files (COMPLETE)
- **JSON Data Files** (✅ created and populated):
  - classes.json - 7 classes (Paladin, Warrior, Priest, Druid, Mage, Rogue, Warlock) with core abilities and available specs
  - specializations.json - 21 specializations across all classes with role assignments, abilities, and passive effects
  - talents.json - Complete TBC/WotLK-style talent trees (3 trees per class, ~3244 lines) with prerequisites and synergies
  - stats-config.json - Full WoW TBC/WotLK stat system with rating conversions, Defense Cap, all primary/secondary stats
  - items.json - Equipment items + consumables (potions, drinks, regeneration boosters) with effects and properties
  - animation-config.json - Animation settings (frame counts, frame rates, dimensions, texture settings, performance config)
  - keyframe-configs.json - Keyframe parameters for animation types (idle, walk, attack, defend, death) with formulas and descriptions
- **Programmatic Audio**: Web Audio API for sound generation
- **Programmatic Graphics**: Phaser graphics API for visual effects
- **Runtime Sprite Generation**: Dynamic sprite creation using Phaser Graphics API
  - `RuntimePaladinGenerator`: Generates hero sprites at runtime based on equipped items
  - Updates automatically when equipment changes via `equipment_changed` event
  - Uses Phaser Graphics API to draw sprites directly to texture
- **Build-Time Asset Generation**: Optional pre-generation system for static assets
  - `tools/generate-assets.js`: CLI tool for generating pixel-art sprites
  - `tools/generators/paladin-generator.js`: Build-time Paladin sprite generator
  - Currently used for reference/testing, hero sprite uses runtime generation
- **Data-Driven**: All gameplay values from JSON configuration
- **Save Files**: 
  - Browser: localStorage
  - Desktop: `%AppData%/RoadOfWar/saves/` via Electron IPC

### Sprite Generation Architecture
- **Runtime Generation**: Hero sprite generated dynamically using Phaser Graphics API
  - Location: `src/generators/runtime-paladin-generator.js`
  - Trigger: `equipment_changed` event from EquipmentManager
  - Output: Phaser texture key (`paladin_dynamic_party` - shared by all party members)
  - Size: 192x192 pixels (chibi pixel art style with detailed features)
- **Animation Frame Generation**: Animation frames generated from base runtime sprite
  - Method: `generateAnimationFrames(animationName, frameCount, baseTextureKey)`
  - Process: Creates transformed sprites using RenderTexture, applies keyframe transformations (position, rotation, scale)
  - API: Uses `RenderTexture.saveTexture()` (not `generateTexture()` - that's for Graphics objects)
  - Output: Array of texture keys for animation frames (`paladin_dynamic_party_{animName}_{frameIndex}`)
  - Integration: AnimationManager forces deletion of old animations and generates new ones from runtime sprite
  - Keyframes: Generated using `keyframe-generator.js` from `keyframe-configs.json` configuration

### Animation System Architecture (December 2025)
- **Configuration System**: Centralized animation settings
  - `src/config/animation-config.js` - Loads and provides animation configuration
  - `public/data/animation-config.json` - Frame counts, frame rates, dimensions, texture settings
  - Supports hot-reload for live updates during development
- **Keyframe Generation**: Procedural keyframe generation from configuration
  - `src/config/keyframe-generator.js` - Generates keyframes based on animation type
  - `public/data/keyframe-configs.json` - Animation parameters (breathing, walk cycle, attack phases, etc.)
  - Supports multiple animation types: breathing, walkCycle, phased, defensive, fall
- **Hot-Reload System**: Live animation updates
  - `src/managers/animation-hot-reload.js` - Watches config files and triggers reload
  - Enabled in development mode for instant feedback
  - Automatically regenerates animations when config files change
- **Texture Utilities**: Reliable texture handling
  - `src/utils/texture-utils.js` - Texture validation and retry logic
  - `waitForTextures()` - Polls for texture availability
  - `validateFramesReady()` - Validates frame data before animation creation
  - `createAnimationWithRetry()` - Retries animation creation with exponential backoff
- **Debugging Tools**: Comprehensive animation debugging
  - HTML-based tools in `public/` for visual inspection
  - Console-based debugger (`animation-debugger-console.js`) for in-game debugging
  - Animation validator (`animation-validator.js`) for detecting issues
- **Equipment Integration**: Visual properties mapped from item data
  - Weapon: Type, color, length, glow effects
  - Armor: Type (plate/leather), color, material properties
  - Fallback: Default visual properties for unequipped slots

### Placeholder Strategy
- **Colored Rectangles**: Visual placeholders for sprites (fallback only)
- **Text Labels**: UI element placeholders
- **Programmatic Audio**: Web Audio API generates sounds
- **Data-Driven**: Easy asset swapping without code changes

### Future Asset Integration
- **Standard Formats**: PNG for images, OGG for audio
- **Optimization**: Texture atlases, compression
- **Loading**: Progressive loading to avoid blocking
- **Caching**: Browser and in-game caching strategies

## Development Tools & Environment

### Godot Editor Tools
- **Scene Editor**: Visual node composition and scene hierarchy
- **Script Editor**: GDScript with syntax highlighting and debugging
- **Animation Editor**: Keyframe-based animation creation
- **TileMap Editor**: 2D level design (if needed)
- **Export System**: One-click platform deployment
- **Built-in Debugger**: Breakpoints, variable inspection, performance profiling

### Godot Development Workflow
- **F5**: Run project (full game)
- **F6**: Run current scene (focused testing)
- **F7**: Run custom scene (for specific testing)
- **Ctrl+S**: Save scene/script
- **F12**: Toggle debugger
- **Project → Export**: Build for target platforms

### Godot Project Verification
- **Verification Script**: `scripts/verify-godot-project.js` - Automated project structure verification
- **Command**: `npm run verify:godot` - Verifies all scenes, managers, data files, and Autoload definitions
- **Testing Checklist**: `docs/GODOT_TESTING_CHECKLIST.md` - Comprehensive manual testing procedures
- **Migration Summary**: `docs/GODOT_MIGRATION_SUMMARY.md` - Complete migration documentation

### Animation Development Tools (December 2025)
- **HTML Debugger Tools** (public/):
  - `animation-debugger.html` - Visual debugger for inspecting animation frames and properties
  - `animation-preview.html` - Real-time preview of animations
  - `animation-tester.html` - Automated testing and validation
  - `animation-editor.html` - Visual editor for animation keyframes
- **Console Tools** (public/):
  - `animation-debugger-console.js` - Console-based animation debugger (auto-loaded in development)
  - `regenerate-hero.js` - Hero regeneration tool for testing new animation system
- **Utility Tools** (tools/):
  - `html-to-png.js` - Converts HTML files to PNG images using Playwright
  - `animation-watcher.js` - Watches animation config files for changes (triggers hot-reload)
- **Electron DevTools**: Keyboard shortcuts (F12, Ctrl+Shift+I) to toggle DevTools in development mode

### Game Development Tools (tools/)
**Status**: Tools cleaned up - CursorPlay/Puppeteer tools removed, codebase optimized. Agent Manager system added.

**Efficiency Toolset (Dec 30, 2025)**:
- **`src/managers/gameplay-data-hot-reload.js`**: Watches and reloads JSON data files automatically.
- **`src/utils/data-validator.js`**: Schema-based validation for all JSON data.
- **`src/utils/dev-stat-monitor.js`**: Real-time F8 debugging panel.
- **`src/utils/combat-simulator.js`**: Headless rapid combat simulation for balancing.
- **`src/utils/gameplay-state-replay.js`**: F9/F10 state snapshot system.
- **`scripts/generate-module.js`**: CLI module scaffolder (`npm run generate:module`).

**Performance Monitoring & Optimization Tools (Dec 30, 2025)**:
- **`src/utils/memory-monitor.js`**: Extended memory tracking and leak detection system
  - Tracks memory usage over time (100 data points)
  - Detects memory leaks (10% growth threshold)
  - Warns at 150MB, critical at 200MB
  - Event-based notifications (`memory-leak-detected`, `memory-warning`, `memory-critical`)
  - Automatically enabled in development mode
- **`src/utils/performance-validator.js`**: Automated performance testing system
  - Hardware detection (CPU cores, GPU, memory)
  - Multiple test scenarios (baseline FPS, combat, particles, UI)
  - Generates comprehensive reports with pass/fail status
  - Available via `window.performanceValidator` in console
- **`docs/PERFORMANCE_OPTIMIZATIONS.md`**: Comprehensive documentation of all performance optimizations

**Active Tools** (15+ files):
- **`agent-manager.js`**: Multi-lane agent system for parallel development (prep/ingest/apply commands)
- **`agent-manager.config.json`**: Agent manager configuration (lanes: gameplay, ui, infra)
- **`mcp-manager/server.js`**: MCP server exposing agent manager as Cursor tools
- **`generate-assets.js`**: Asset generation CLI
- **`test-runner.js`**: Unified test runner (consolidates all test scripts)
- **`test-5man-direct-methods.js`**: 5-man team test (used by test-runner)
- **`run-full-test.js`**: Full test suite orchestrator (used by test-runner)
- **`smart-game-navigator.js`**: Smart game navigation tool
- **`generators/`**: Build-time asset generators (3 files)
- **`utils/`**: Tool utilities (8 files)

**Removed Tools (December 2025)**:
- **CursorPlay Tools**: Removed all 8+ CursorPlay test files (test-comprehensive.js, test-simple.js, etc.)
- **Puppeteer Tools**: Removed check-dev-logs.js, test-all-functions.js, get-console-logs.js
- **Batch Files**: Removed test-game-flow.bat and cursorplay batch files
- **Screenshots**: Removed cursorplay-screenshots/ directory


**Agent Manager System (December 2025)**:
- **Location**: `tools/agent-manager.js`, `tools/agent-manager.config.json`, `tools/mcp-manager/server.js`
- **Documentation**: `docs/MCP_MANAGER_SETUP.md` - Setup instructions for Cursor MCP server
- **Output Directory**: `agent-out/` (prompts/, patches/, summary.json)
- **Status**: Complete and operational
- **Purpose**: Enable parallel agent work on independent components (gameplay/ui/infra lanes)
- **MCP Tools**: Exposes agent manager workflow as Cursor-callable tools (no paid APIs)
- **Workflow**: Prep task → Generate lane prompts → Agents produce unified diff patches → Ingest patches → Apply with git apply safety checks

**Toolset Consolidation Project** (Planning Complete):
- **Location**: `docs/plans/PHASE1-TOOL-AUDIT.md` through `PHASE7-FINAL-DELIVERABLES.md`
- **Master Plan**: `docs/toolset/TOOLSET-CONSOLIDATION-MASTER-PLAN.md`
- **Index**: `docs/toolset/TOOLSET-INDEX.md`
- **Status**: Planning complete (31,000+ words), ready for implementation
- **Goal**: Unified `game-tools` CLI with 6 subcommands + 4 new tools
- **Timeline**: 4 weeks, 130 hours estimated

**Tool Generators** (`tools/generators/`):
- **`paladin-generator.js`**: Build-time Paladin sprite generator
- **`humanoid-generator.js`**: Humanoid sprite generation
- **`equipment-generator.js`**: Equipment sprite generation

**Tool Utilities** (`tools/utils/`):
- **`color-quantizer.js`**: Color quantization utilities
- **`image-analyzer.js`**: Image analysis utilities
- **`material-classifier.js`**: Material classification
- **`palette-manager.js`**: Palette management
- **`pixel-drawer.js`**: Pixel drawing utilities
- **`proportion-analyzer.js`**: Proportion analysis
- **`seeded-rng.js`**: Seeded random number generation
- **`style-detector.js`**: Style detection utilities

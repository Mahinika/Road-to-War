# PROJECT_INDEX.md

**Authoritative registry for Road of War project structure, entry points, and critical files.**

## Project Purpose

**Road of War** is an incremental prestige RPG with automatic progression and equipment-based advancement. The game features a 5-man party system with WoW TBC/WotLK-inspired classes, specializations, talents, and comprehensive stat systems.

**Core Gameplay**: 2D side-scrolling RPG where a 5-hero party moves automatically through a procedurally generated world ("Road to War" - 100 miles), fighting enemies, collecting loot, and managing equipment/talents per hero.

## Architecture Overview

**Pattern**: Event-driven modular architecture with Manager pattern
**Engine**: Godot 4.x
**Language**: GDScript
**Build**: Godot Editor (dev) + Godot Export (desktop)
**Module System**: Godot Autoloads (Singletons)

## Runtime Entry Points

### Godot Editor (Development)
- **Project File**: `road-to-war/project.godot` - Godot project configuration
- **Main Scene**: `road-to-war/scenes/Preload.tscn` - Entry point scene
- **Start Command**: Open project in Godot Editor → Press F5 (Play Project)
- **Export**: Project → Export → Select platform (Windows/Mac/Linux)

### Standalone Build
- **Export Template**: Godot export templates for target platform
- **Build Command**: Project → Export → Create executable
- **Output**: Standalone executable (no runtime required)

### Scene Flow
1. `Preload.tscn` - Asset loading and initialization
2. `MainMenu.tscn` - Main menu
3. `CharacterCreation.tscn` - 5-party creation (tank/healer/DPS selection)
4. `World.tscn` - Main gameplay loop
5. `TalentAllocation.tscn` - Talent management per hero
6. Other scenes: Options.tscn, Credits.tscn, SaveLoad.tscn, Statistics.tscn, Achievements.tscn, Prestige.tscn

## Critical Files

### Core Game Logic
- `road-to-war/project.godot` - Godot project configuration, Autoload definitions
- `road-to-war/scenes/Preload.tscn` - Initial loading scene
- `road-to-war/scenes/MainMenu.tscn` - Main menu scene
- `road-to-war/scenes/CharacterCreation.tscn` - Party creation UI
- `road-to-war/scenes/World.tscn` - Main gameplay scene
- `road-to-war/scenes/TalentAllocation.tscn` - Talent management UI
- `road-to-war/scripts/SceneManager.gd` - Scene transition management

### Manager System (road-to-war/scripts/ - Autoloads)
All managers are Godot Autoloads (Singletons) defined in `project.godot`:
- `PartyManager.gd` - 5-hero party management (1 tank, 1 healer, 3 DPS)
- `WorldManager.gd` - Procedural world generation, "Road to War" mile system (0-100)
- `CombatManager.gd` - Party combat with threat/aggro system, role-based AI
- `EquipmentManager.gd` - Per-hero equipment management (heroId → equipment Dictionary)
- `TalentManager.gd` - Talent point allocation per hero (TBC/WotLK-style trees)
- `CameraManager.gd` - Dynamic camera tracking all 5 party members
- `LootManager.gd` - Item drops and loot distribution
- `ShopManager.gd` - Shop encounters and purchasing (integrated with world encounters)
- `QuestManager.gd` - Quest system and meta-task tracking (kill-tasks, distance-tasks, rewards)
- `AbilityManager.gd` - Ability selection and execution per hero
- `StatusEffectsManager.gd` - Status effects system (stun, bleed, poison, etc.)
- `AudioManager.gd` - Sound effects and music (programmatic generation)
- `ParticleManager.gd` - Visual effects and particle systems
- `StatisticsManager.gd` - Player statistics tracking
- `AchievementManager.gd` - Achievement system
- `PrestigeManager.gd` - Prestige/meta-progression system
- `SaveManager.gd` - Game state persistence (Godot file system)
- `DataManager.gd` - JSON data loading and caching
- `GameManager.gd` - Core game state coordination
- `Logger.gd` - Logging system

### Utility System (road-to-war/scripts/)
- `StatCalculator.gd` - Final stat calculation with WoW TBC/WotLK rating conversions
- `Hero.gd` - Hero resource definition (class/spec/level/stats structure)
- `UITheme.gd` - UI theming with WoW WOTLK color palette
- `HeroSprite.gd` - Hero sprite rendering and animation
- `UnitFrame.gd` - Unit frame UI component
- `HUD.gd` - Main HUD display
- `QuestTracker.gd` - Quest UI component (displays active quests with WoW WotLK aesthetic)
- `CombatLog.gd` - Combat log display
- `FloatingText.gd` - Floating damage/healing text
- `RoadGenerator.gd` - Road segment generation
- `DamageCalculator.gd` - Damage calculation system
- `CombatActions.gd` - Combat action definitions
- `CombatAI.gd` - AI decision making for combat
- `AnimationManager.gd` - Animation system management

### Data Files
- **Location**: `road-to-war/data/` - JSON data files loaded by DataManager
- **Loading**: DataManager.gd loads all JSON files on game start
- Files: `classes.json`, `specializations.json`, `talents.json`, `stats-config.json`, `items.json`, `enemies.json`, `world-config.json`, `achievements.json`, `prestige-config.json`, `abilities.json`, `bloodlines.json`, `skill-gems.json`, `animation-config.json`, `keyframe-configs.json`, `quests.json`
- See `docs/consolidated/implementation/DATA_FILES_STRUCTURE.md` for details

## Folder Responsibilities

### `/road-to-war` - Godot Project Root
- `project.godot` - Godot project configuration file
- `scenes/` - Godot scene files (.tscn) - All game scenes
  - `Preload.tscn` - Initial loading scene
  - `MainMenu.tscn` - Main menu
  - `CharacterCreation.tscn` - Party creation
  - `World.tscn` - Main gameplay scene
  - `TalentAllocation.tscn` - Talent management
  - Other menu scenes: Options, Credits, SaveLoad, Statistics, Achievements, Prestige
- `scripts/` - GDScript files (.gd) - All game logic
  - Manager scripts (Autoloads)
  - Scene scripts
  - Utility scripts
- `data/` - JSON data files - Game configuration and content
- `assets/` - Game assets
  - `images/` - Image files (menu-background.jpg)
  - `sprites/` - Sprite files (JSON + PNG)
  - `icons/` - Icon files
  - `audio/` - Audio files (empty, uses programmatic generation)
  - `fonts/` - Font files (empty)
- `addons/` - Godot plugins
  - `godot_mcp/` - MCP plugin for Cursor integration

### `/src` - Legacy Phaser 3 Code
- **Status**: ✅ REMOVED (January 2026)
- **Reason**: Migration to Godot 4.x complete, Phaser code no longer needed
- **Note**: All functionality has been migrated to `road-to-war/scripts/`

### `/tools` - Development Tools
- **Active Tools**:
  - `generate-assets.js` - Asset generation CLI
  - `test-runner.js` - Unified test runner (consolidates all test scripts)
  - `test-5man-direct-methods.js` - 5-man team test (used by test-runner)
  - `run-full-test.js` - Full test suite orchestrator (used by test-runner)
  - `smart-game-navigator.js` - Smart game navigation tool
- **Generators**: `generators/` - Build-time asset generators (3 files)
- **Utilities**: `utils/` - Tool utilities (8 files)
- **Archived**: `archive/test-scripts/` - Redundant test scripts (33+ files)
- See `tools/README.md` for complete tool documentation

### `/scripts` - Utility & Build Scripts
- `check-logs.js` - Utility to check game logs
- `debug-enemies.js` - Enemy debugging script
- `expand-talents.js` - Talent expansion script

### `/logs` - Output & Results
- `logs/game-output.log` - Console log capture output
- `e2e-results.json` - E2E test results
- `e2e-screenshot.png` - E2E test screenshot
- `screenshots/` - Captured browser/game screenshots

### `/docs` - Documentation
- **`reference/`** - Core reference materials
  - `DEBUGGING_GUIDE.md` - Technical debugging procedures
  - `LOGGING.md` - Logging system documentation
  - `BODY_PART_CONNECTIONS.md` - Sprite assembly reference
  - `DESKTOP_AUTOMATION.md` - Desktop automation guide
- **`archive/`** - Historical implementation docs
  - `HERO_DEBUG_ANALYSIS.md`
  - `HERO_FIXES_APPLIED.md`
  - `SCENE_ISSUES_ANALYSIS.md`
- **`architecture/`** - Architecture documentation and diagrams
  - `animation_architecture.html` / `.png` - Animation system diagrams
- **`consolidated/`** - Grouped documentation by category
- **`research/`** - Research documents and analysis
- **`README.md`** - Documentation navigation guide

### `/memory-bank` - Project Memory
- `projectbrief.md` - Foundation document, core requirements
- `productContext.md` - Why project exists, problems it solves
- `activeContext.md` - Current work focus, recent changes, next steps
- `systemPatterns.md` - System architecture, design patterns, component relationships
- `techContext.md` - Technologies, development setup, dependencies
- `progress.md` - What works, what's left, current status, known issues
- `5-Man_Team_Design_Brainstorm.md` - 5-man team design specifications

### `/dist` - Build Output
- Generated by `npm run generate-assets`
- Contains bundled JS, copied assets, and data files
- **DO NOT EDIT** - Regenerated on each build

### `/node_modules` - Dependencies
- npm packages
- **DO NOT EDIT** - Managed by npm

## Generated / Low-Signal Files

### Build Artifacts (Auto-Generated)
- `/dist` - Entire directory regenerated on build
- `logs/game-output.log` - Console log capture output (auto-updated)

### Configuration Files (Rarely Modified)
- `package.json` - Dependencies and scripts (modify for new deps/scripts)
- `.gitignore` - Git ignore patterns

### Documentation Files (Reference Only)
- `README.md` - Project overview
- `PROJECT_INDEX.md` - This file (authoritative project structure)
- `Rules for Cline.md` - Development guidelines
- `memory-bank-rules.md` - Memory bank structure rules
- `docs/README.md` - Documentation navigation guide
- `docs/consolidated/` - Consolidated documentation (testing, implementation, guides)
- `docs/research/` - Research documents and analysis
- `docs/plans/` - Implementation plans and roadmaps
- `docs/architecture/` - Architecture documentation
- `docs/toolset/` - Toolset consolidation planning
- `memory-bank/` - Project memory bank (active context, progress, patterns)

## Files That Should Rarely or Never Be Modified

### Core Framework Files
- `road-to-war/project.godot` - Only modify for Autoload changes or project settings
- Godot engine files - Never modify (managed by Godot)

### Configuration Files
- `package.json` - Only modify for dependency/script changes

### Generated Files
- `/dist` - Never manually edit (regenerated on build)
- `logs/game-output.log` - Auto-generated, read-only

## Development Workflow

### Starting Development
1. **Godot Editor**: Open `road-to-war/project.godot` in Godot Editor
2. **Play Project**: Press F5 or click Play button → Runs game in editor
3. **Debug**: Use Godot's built-in debugger and inspector

### Building
1. **Export Project**: Project → Export → Select platform
2. **Export Templates**: Download export templates for target platform (Windows/Mac/Linux)
3. **Standalone EXE**: Export creates standalone executable (no runtime required)

### Testing Tools
1. **Balance Audit**: `npm run balance-audit` → Automated balance testing
2. **Log Analysis**: `npm run logs` → Check game logs for issues
3. **Status Check**: `npm run status` → Project status overview
4. See `tools/README.md` for complete tool documentation

## Testing Framework

### Testing Tools
- **Balance Audit**: Automated balance verification system
- **Log Analysis**: Game log checking and analysis tools
- **Status Monitoring**: Project health and dependency checking
- **Asset Validation**: Generated asset verification tools

### Manager Test Status
All 14 managers have comprehensive unit tests:
- ✅ AbilityManager, AchievementManager, CameraManager
- ✅ CombatManager, EquipmentManager, LootManager
- ✅ MovementManager, PrestigeManager, ResourceManager
- ✅ ShopManager, StatisticsManager, StatusEffectsManager
- ✅ TalentManager, WorldManager

### Integration Test Status
- ✅ Party → Combat → Loot → Equipment flow
- ✅ Equipment → Combat integration
- ✅ Talents → Combat integration
- ✅ World → Combat integration
- ✅ Prestige → All systems integration

### Documentation
- **Testing Guide**: `docs/consolidated/testing/TESTING_GUIDE.md`
- **Testing Patterns**: `docs/consolidated/testing/MANAGER_TESTING_PATTERNS.md`
- **Coverage Report**: `docs/consolidated/testing/TEST_COVERAGE_REPORT.md`
- **Code Quality**: `docs/CODE_QUALITY_STANDARDS.md`

## Key Architectural Decisions

### Manager Pattern
All game systems use Manager classes that coordinate specific functionality. Managers are initialized in GameScene and communicate via events.

### Event-Driven Communication
Systems communicate via events (combat_start, equipment_changed, etc.) to maintain loose coupling.

### Data-Driven Design
All gameplay values come from JSON files in `public/data/`. No hard-coded values in logic.

### Per-Hero Systems
Equipment, talents, and stats are managed per hero (heroId parameter). EquipmentManager uses Map<heroId, equipment> structure.

### 5-Man Party System
- Fixed group size: Always 5 heroes (1 tank, 1 healer, 3 DPS)
- PartyManager enforces role constraints
- CameraManager keeps all party members visible
- CombatManager handles party combat with threat/aggro system

### WoW WOTLK UI System
Complete UI redesign to match World of Warcraft Wrath of the Lich King aesthetic:
- WoW-style party frames, player frame, target frame
- Action bars (2 rows × 6 buttons)
- WoW color palette and texture simulation
- Helper functions: createWoWFrame, createWoWBar, createWoWButton

## Save System Architecture

## Console Log Capture System

### Godot
- Built-in logging via Logger singleton (Autoload)
- Logs written to `logs/game-output.log` file with timestamps
- Structured logging with log levels (INFO, WARN, ERROR, DEBUG)

## Current Project Status

**Godot Migration: COMPLETE** ✅
- Full migration from Phaser 3 to Godot 4.x completed
- All 25+ managers ported as Godot Autoloads (Singletons)
- All 11 scenes created and connected
- Complete game flow: Preload → MainMenu → CharacterCreation → World → Combat
- Save/Load system functional
- All menu scenes implemented
- WoW WOTLK UI recreated using Godot Control nodes
- Data-driven systems loading from JSON files

**5-Man Team System: COMPLETE** ✅
- All core systems implemented and integrated
- Party combat with threat/aggro system
- Per-hero equipment and talent management
- Dynamic camera tracking
- Complete scene flow

**Next Priority**: Comprehensive testing of full game flow in Godot Editor

---

**Last Updated**: January 3, 2026
**Maintainer**: Development follows Rules for Cline.md and memory-bank-rules.md

### Recent Enhancements (Mile 100 Roadmap)
- **Combat AI 2.0**: Implemented boss phases, ability cooldowns, and phase-specific targeting in `CombatAI.gd`.
- **Visual Clarity**: Added status effect icons and casting bars to all unit frames and world sprites.
- **World Variety**: Implemented 6 distinct biomes (Plains, Forest, Mountains, Desert, Undead, Arcane) with smooth background and ambient audio transitions.
- **World Map**: Added a progress visualization map for the 100-mile journey.
- **Itemization 2.0**: Implemented Item Sets and Skill Gem socketing logic in `EquipmentManager.gd`.
- **Meta-Progression**: Added a `QuestManager` and `quests.json` for meta-rewards, and a full Prestige Tree UI.
- **Endgame Juice**: Implemented "Boss Finisher" cinematic effects (slow-motion, screen shake, massive golden VFX).


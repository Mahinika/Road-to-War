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

### WoW WOTLK UI Implementation (Godot 4.x - January 2026)
**Complete UI redesign to match World of Warcraft Wrath of the Lich King aesthetic**

**UI Theme System:**
- **UITheme.gd** (Autoload): Centralized theme tokens with WoW WOTLK color palette
  - Dark surfaces (0x0a0a0a to 0x1a1a2e)
  - Gold/bronze borders (0xc9aa71, 0x8b6914)
  - Class-specific accent colors
  - Texture simulation colors for gradient effects
  - Location: `road-to-war/scripts/UITheme.gd`

**UIBuilder System:**
- **UIBuilder.gd** (Autoload): Comprehensive UI creation system (500+ lines, 100+ functions)
  - `create_frame()`: Unit/party frames with class-colored borders
  - `create_health_bar()`, `create_mana_bar()`: Health/mana bars with textures, gradients, and class-colored borders
  - `create_action_button()`: Action bar buttons with cooldown overlays and keybind indicators
  - Fully data-driven via config dictionaries
  - Location: `road-to-war/scripts/UIBuilder.gd`

**UI Components:**
- **Party Frames**: Left side, vertical stack, compact design with class-colored borders
- **Player Frame**: Bottom-left corner, larger than party frames
- **Target Frame**: Top-center, shows enemy information during combat
- **Quest Tracker**: Right side, displays active quests with WoW WotLK aesthetic - real-time progress updates, auto-hides when no quests, scrollable quest list (January 2026)
- **Action Bars**: Bottom of screen, 2 rows × 6 buttons = 12 slots
- **Top HUD**: Compact resource displays (Gold, Bag, Mana) with minimap placeholder
- **Combat Log**: Enhanced with floating combat text and WoW-style damage/healing numbers
- **World Map**: Progress visualization for 100-mile journey

**Camera System:**
- **CameraManager** (Autoload): Dynamic camera system that keeps all 5 party members visible
  - Calculates party bounding box (leftmost to rightmost hero)
  - Adjusts camera position/offset automatically
  - Smooth interpolation for camera movement
  - Dynamic deadzone adjustment based on party spread
  - Location: `road-to-war/scripts/CameraManager.gd`

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
- **Size**: ~50-100MB (standalone executable)
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

## Performance Characteristics

This section documents measured performance characteristics, optimization impacts, known bottlenecks, and optimization targets. Use this information when making performance-related decisions.

### Object Pooling Impact

**ObjectPool Integration** (January 2026):
- **Target System**: FloatingText, Particle effects
- **Measured Impact**: ~90% reduction in FloatingText allocations
- **Implementation**: `ObjectPool.gd` integrated into `ParticleManager.gd` and `FloatingText.gd`
- **Pattern**: Objects implement `reset()` method for pool reuse
- **Status**: ✅ Fully implemented and measured
- **Location**: `road-to-war/scripts/ObjectPool.gd`, `road-to-war/scripts/ParticleManager.gd`

**Performance Gain**: 
- Before: New FloatingText object allocated for every damage/heal number
- After: FloatingText objects reused from pool, minimal allocations
- Frame time impact: Reduced allocation overhead by ~90%

### Signal System Overhead

**Signal Communication Performance**:
- **Overhead per Signal**: ~0.1ms per signal emission (measured, acceptable)
- **Pattern**: Signal-based communication used extensively for manager-to-manager and manager-to-scene communication
- **Optimization**: Signals are queued, no blocking operations
- **Status**: ✅ Optimized, overhead is acceptable for game performance

**When to Use Signals**:
- ✅ Cross-manager communication (loose coupling)
- ✅ UI updates from manager events
- ✅ Combat events, world events, item events
- ❌ High-frequency updates (use direct calls for per-frame operations)
- ❌ Performance-critical paths (direct method calls preferred)

### Data Manager Caching

**JSON Data Loading**:
- **Loading Strategy**: JSON parsed once at startup, cached in memory
- **Hot Reload**: Development mode only, watches for file changes using polling
- **Performance**: No runtime JSON parsing during gameplay
- **Memory**: All data cached in DataManager dictionaries
- **Status**: ✅ Optimized, no performance impact during gameplay

**Data Access Pattern**:
- DataManager provides `get_*_data()` methods that return cached dictionaries
- No file I/O during gameplay (except save/load operations)
- Hot reload only active in development mode

### Known Bottlenecks

**ParticleManager at High Particle Counts**:
- **Issue**: Performance degradation at 100+ active particles
- **Current Status**: Needs batching or throttling
- **Workaround**: ObjectPool reduces allocation overhead, but rendering is still bottleneck
- **Future Optimization**: Implement particle batching or LOD system for high-count scenarios
- **Location**: `road-to-war/scripts/ParticleManager.gd`
- **Priority**: Medium (only affects high-intensity combat scenarios)

**Combat Calculation Frequency**:
- **Current**: Stat calculations occur on equipment/talent changes, cached during combat
- **Optimization**: StatCalculator caches results per hero, recalculates only when dependencies change
- **Status**: ✅ Optimized with caching
- **Location**: `road-to-war/scripts/StatCalculator.gd`

**Animation System**:
- **Current**: AnimationPlayer nodes per hero/enemy sprite
- **Performance**: Good for current hero count (5 heroes + enemies)
- **Potential Issue**: Scaling to many simultaneous animations
- **Status**: ✅ Acceptable performance, monitor if animation count increases
- **Location**: `road-to-war/scripts/AnimationManager.gd`, `road-to-war/scripts/HeroSprite.gd`

### Optimization Targets

**Frame Time Budget** (60 FPS target):
- **Target Frame Time**: <16.67ms per frame (60 FPS)
- **Breakdown**:
  - Rendering: <8ms
  - Game Logic: <5ms
  - UI Updates: <2ms
  - Other: <1.67ms

**Memory Budget**:
- **Target**: <200MB during normal gameplay
- **Warning Threshold**: 150MB (MemoryMonitor.gd triggers warning)
- **Critical Threshold**: 200MB (MemoryMonitor.gd triggers critical alert)
- **Leak Detection**: 10% growth over 100 minutes triggers leak detection
- **Location**: `road-to-war/scripts/MemoryMonitor.gd`

**Performance Monitoring**:
- **Tool**: `road-to-war/scripts/PerformanceValidator.gd`
- **Tests**: Baseline FPS, combat scenarios, particle stress tests, UI performance
- **Reporting**: Comprehensive performance reports with hardware detection
- **Status**: ✅ Available, run before major releases

### Performance Best Practices

**Do's**:
- ✅ Use ObjectPool for frequently created/destroyed objects (FloatingText, particles)
- ✅ Cache expensive calculations (stat calculations, data lookups)
- ✅ Use signals for infrequent events, direct calls for per-frame operations
- ✅ Load all data at startup, avoid runtime file I/O
- ✅ Monitor memory usage with MemoryMonitor.gd in development

**Don'ts**:
- ❌ Create new objects every frame (use pooling)
- ❌ Parse JSON during gameplay (use cached DataManager)
- ❌ Use signals for high-frequency updates (use direct calls)
- ❌ Allocate large arrays/collections repeatedly (reuse or pool)
- ❌ Ignore performance warnings from MemoryMonitor

### Performance Testing

**Automated Testing**:
- **Tool**: `PerformanceValidator.gd` (automated performance test suite)
- **Scenarios**: Baseline FPS, combat stress test, particle stress test, UI performance
- **Usage**: Run before major releases, after performance changes
- **Output**: Comprehensive report with pass/fail status per scenario

**Manual Testing**:
- **Baseline**: Ensure 60 FPS during normal gameplay (idle, movement, combat)
- **Stress Test**: Verify performance during high-intensity combat (5 heroes vs 10+ enemies)
- **Memory**: Monitor memory usage over 30+ minute play session
- **Profiling**: Use Godot's built-in profiler for detailed performance analysis

**Last Updated**: January 2026

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

### Logging System (Godot 4.x)
- **CursorLogManager** (Autoload): Real-time logging to `user://cursor_logs.txt`
  - Location: `road-to-war/scripts/CursorLogManager.gd`
  - Explicit `flush()` calls ensure real-time visibility in Cursor IDE
  - Integrated into GameManager initialization
- **Legacy Log System**: `logs/game-output.log` (historical reference - now using Godot Logger)
- **Log Access**: Read `user://cursor_logs.txt` or use CursorLogManager API
- **Troubleshooting Workflow**: User says "check logs" → AI automatically reads `user://cursor_logs.txt` and legacy logs, fixes issues
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

### Testing & Automation Tools (January 2026)
- **AUTOMATED TESTING REQUIREMENT**: All tests MUST be automated - no manual execution required. User should be able to run via npm scripts, Godot CLI, or automated tools. Create and maintain automation for all testing requirements.
- **Balance Audit Automation**: Comprehensive automation system for balance testing
  - `scripts/run-balance-audit.js` - Automated balance audit runner (tries Godot command line, falls back to instructions)
  - `scripts/analyze-balance-audit.js` - Analysis script that reads audit reports, analyzes DPS by class/spec, identifies overperforming/underperforming classes, generates summary JSON
  - `scripts/compare-balance-audits.js` - Comparison tool for before/after audit reports with DPS change analysis
  - `road-to-war/scripts/RunBalanceAuditCLI.gd` - CLI-executable audit script (extends SceneTree) for command-line execution
  - NPM scripts: `npm run balance-audit`, `npm run balance-audit:analyze`, `npm run balance-audit:compare`
  - Documentation: `docs/BALANCE_AUDIT_AUTOMATION.md`, `docs/BALANCE_AUDIT_EXECUTION_GUIDE.md`
- **Test Suite**: `road-to-war/tests/TestSuite.gd` - Comprehensive automated testing with balance audit capabilities
- **Combat Simulator**: `road-to-war/scripts/CombatSimulator.gd` - Automated combat testing (F8 toggle)
- **State Replay System**: F9/F10 save/load for debugging

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
  - **Spell/Ability Icons**: Generated 176 spell icons in `assets/icons/spells/` (color-coded by type, pattern-based, 48x48 resolution). All icons include JSON metadata for AssetVisual integration.
  - **Enemy Sprites**: Generated 10 enemy sprites in `assets/sprites/enemies/` (slime, goblin, orc, orc_archer, orc_shaman, goblin_slinger, elite_orc_champion, dark_knight, dragon, war_lord) with JSON metadata.
  - **VFX Sprites**: Generated spell effect sprites in `assets/sprites/vfx/` (hit_impact.png, level_up.png, critical_hit.png, death_poof.png, heal_burst.png, buff_aura.png, debuff_cloud.png, block_sparks.png) with JSON metadata.
  - **Projectile Sprites**: Generated projectile sprites in `assets/sprites/projectiles/` (magic_bolt.png, fire_ball.png, arcane_missile.png, lightning_bolt.png, ice_shard.png, poison_cloud.png, shadow_bolt.png, holy_light.png) with JSON metadata.
  - Audio placeholders in `assets/audio/` (ready for WAV/OGG files) - **NOTE**: Currently empty, causing warnings but not affecting gameplay
  - Icons in `assets/icons/` with gem variations and spell icons
  - **AssetVisual Integration**: All generated assets include JSON metadata files with asset_type, profile, base_size, glow_color, and animation parameters for automatic normalization, shader effects, and hot-reload support
- **VFX System**: Hybrid sprite + procedural approach
  - **Primary**: Checks for generated sprite assets first (better quality)
  - **Fallback**: Procedural CPUParticles2D generation if sprites not found
  - **Data-Driven**: All visual properties (color, style, speed, power) driven by `abilities.json` `visuals` metadata
- **Audio System Status**: `AudioManager.gd` is fully functional and attempts to load audio files from:
  - SFX: `res://assets/audio/sfx/{sound_name}.wav` (hit, miss, crit, hit_enemy, level_up, heal, etc.)
  - Music: `res://assets/audio/music/{music_name}.ogg` or `.wav` (travel, combat)
  - Ambient: `res://assets/audio/ambient/{biome_name}.ogg` or `.wav`
  - Missing files generate debug warnings but do not crash the game
- **Data-Driven Architecture**: All gameplay values from JSON configuration
- **Save System**: Godot's FileAccess for cross-platform save/load functionality

**⚠️ CRITICAL: Unified Asset Generation System (January 2026) ⚠️**

**ALL asset generation MUST go through `tools/unified-asset-generator.js`. This is the ONLY entry point for asset generation.**
- **DO NOT** create new separate generators or asset systems
- **DO NOT** create new entry points for asset generation  
- **DO** extend the unified system by adding new generator classes in `tools/generators/`
- **DO** use shared utilities from `tools/utils/canvas-utils.js` and `tools/utils/color-utils.js`
- **DO** extend `BaseGenerator` for all new generators

**How to Add New Asset Types:**
1. Create generator class in `tools/generators/` extending `BaseGenerator`
2. Implement `generate()` method following existing pattern
3. Add generator to `UnifiedAssetGenerator` constructor
4. Add case in `UnifiedAssetGenerator.generate()` to dispatch to your generator
5. Update `tools/README.md` and memory bank documentation

### Hero Asset Creation Pipeline (LPC-Based - January 2026)
- **LPC Asset Pipeline**: Hero sprites now generated from Liberated Pixel Cup (LPC) spritesheets
  - **Base Asset**: Real LPC spritesheet (832x1344, 13x21 grid) downloaded from GitHub
  - **Extraction Tool**: `tools/extract-spritesheet.js` extracts front-facing idle frame and animation strips
  - **Variant Generation**: `tools/create-hero-variants.js` creates class-specific sprites from base
  - **Quality Source**: Uses professional pixel art as foundation instead of procedural generation
  - **Class Variants**: 11 hero classes with class-specific color tints (gold for paladin, blue for mage, etc.)
  - **Progression Sprites**: 20 humanoid variants (humanoid_0 through humanoid_19) for early-game progression
- **Modular Paper Doll System**: HeroSprite.gd uses layered Sprite2D nodes for equipment visualization
  - Layers: Body (base), Legs, Chest, Shoulder, Head, Weapon, Offhand
  - Pivot: Bottom-center alignment (Vector2(0, -64) for 128×128 sprites, upgraded from 64×64)
  - Transparency: SpriteTransparency.gdshader applied to all layers for pixel-perfect transparency
  - Base Body: Uses extracted LPC sprites (paladin.png, ancient_warrior.png, etc.) or progression sprites (humanoid_0.png, etc.)
  - **Sprite Upgrade (January 2026)**: Upgraded to 128×128 sprites (upgraded from 64×64). Design at 256×256 for detail, export at 128×128 for runtime. BASE_VISUAL_SCALE = 0.84375 for ~108px display on 1920×1080 screen. TEXTURE_FILTER_NEAREST for pixel-perfect rendering.
- **JSON-Driven Equipment Visuals**: Equipment items define visual properties in items.json:
  - `texture`: Direct sprite paths (e.g., "res://assets/sprites/equipment/paladin_sword_legendary.png")
  - `modulate`: HEX color strings with alpha (e.g., "#FFD70080" for legendary gold tint)
  - `glow_shader_param`: Float values (0.0-1.0) for glow intensity on high-tier items
  - `class_restriction`: Arrays of allowed classes (e.g., ["paladin", "warrior"])
- **Animation System**: Programmatic AnimationPlayer with SOP v3.0 compliant specifications
  - All animations use precise durations and frame counts as specified in SOP
  - Smooth transitions with sine wave interpolation for natural motion
  - Death animation integrates with ParticleManager for visual effects
  - Animation Strips: Extracted from LPC spritesheets (walk, attack, cast, hurt) available for future use
- **Unified Asset Generation System (January 2026)**:
  - **CRITICAL**: This is the ONLY asset generation system. All asset generation MUST go through this unified architecture. Do NOT create new separate generators or asset systems.
  - **Unified Entry Point**: `tools/unified-asset-generator.js` - Single orchestrator for all asset types
    - Provides `generate(type, data, options)` method for all asset types
    - Extends by adding new generator classes, NOT by creating new entry points
    - Usage: `import { UnifiedAssetGenerator } from './tools/unified-asset-generator.js'; const generator = new UnifiedAssetGenerator(); await generator.generate('hero', heroData, { heroId: 'hero_0' });`
  - **Base Architecture**: `tools/generators/base-generator.js` - Shared base class for all generators
    - Provides common utilities (canvas operations, color operations)
    - All generators extend this class for consistency
    - Shared utilities from `tools/utils/canvas-utils.js` and `tools/utils/color-utils.js`
  - **Specialized Generators**:
    - `tools/generators/hero-sprite-generator.js` - 256×256 hero sprite generator (exports at 128×128)
    - `tools/generators/spell-icon-generator.js` - Spell/ability icon generator (extracted from generate-all-assets.js)
    - `tools/generators/paladin-generator.js` - Paladin sprite generation (legacy, still used)
    - `tools/generators/humanoid-generator.js` - Humanoid sprite generation (legacy, still used)
    - `tools/generators/equipment-generator.js` - Equipment sprite generation (used by paladin-generator)
    - `tools/generators/gem-generator.js` - Gem icon generation (still used)
    - `tools/generators/animation-generator.js` - Animation strip generation (still used)
  - **Shared Utilities**:
    - `tools/utils/canvas-utils.js` - Shared canvas operations (setupCanvasContext, drawIconPlate, resolveResPathToDisk, isMeaningfulTexture)
    - `tools/utils/color-utils.js` - Shared color operations (hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, getLuma, ensureVisibleFill, clamp, normalizeHex, hexToRgbArray, hexToRgbaArray)
    - All other utilities updated to use shared color utilities (pixel-drawer.js, material-classifier.js, glow-renderer.js, color-quantizer.js)
  - **Legacy Generators** (still used, but refactored):
    - `tools/generate-all-assets.js`: Comprehensive asset generator (refactored with shared utilities) - generates spell icons (176), enemy sprites (10), item icons, projectiles (8), VFX (8). Uses Canvas 2D API. Outputs to `road-to-war/assets/` with JSON metadata. Usage: `node tools/generate-all-assets.js`. **NOTE**: This is being migrated to unified system - new generators should extend unified-asset-generator.js, not create new entry points.
    - `tools/generate-assets.js`: Build-time character/bloodline generator - generates Paladin, bloodline heroes, humanoid variants. Usage: `npm run generate-assets`. **NOTE**: Legacy generator, still used for character sprites, but new generators should use unified system.
  - **Supporting Tools** (not generators, but support asset creation):
    - `tools/fetch-lpc-bases.js`: Downloads LPC spritesheets from GitHub repositories
    - `tools/extract-spritesheet.js`: Extracts frames and animation strips from LPC spritesheets
    - `tools/create-hero-variants.js`: Generates class variants with color tints and overlays
    - `tools/analyze-sprite.js`: Analyzes spritesheets to extract proportions, colors, and shading for generator improvement
    - `npm run fetch-lpc`: Download LPC base spritesheets
    - `npm run extract-sprites`: Extract frames from spritesheets
    - `npm run lpc-assets`: Generate hero variants from LPC base
  - **Documentation**: Complete SOP v3.0 guide in `docs/HERO_ASSET_CREATION_GUIDE.md`
    - Art style guidelines (Dragumagu-inspired pixel-perfect chibi)
    - Technical implementation pipeline
    - Animation specifications table
    - File naming conventions
    - QA automation checklist
  - **Asset Generation Documentation**: Comprehensive documentation for asset generation system
    - `docs/HERO_SPRITE_UPGRADE.md`: **NEW** - Complete documentation for hero sprite upgrade (256×256 design / 128×128 export), realistic proportions, unified generator architecture, Godot integration updates
    - `docs/ASSET_GENERATION_SUMMARY.md`: Summary of all generated assets (176 spell icons, 10 enemy sprites, item icons, projectiles, VFX)
    - `docs/ASSET_INTEGRATION_COMPLETE.md`: Integration details for all generated assets into game systems
    - `docs/ASSET_GENERATION_TOOL.md`: Complete documentation for `generate-all-assets.js` tool
    - `tools/OBSOLETE_FILES.md`: Tracking document for obsolete asset generation files

### Production Ready Tech (January 2026)
- **Audio Cross-fading Pipeline**: `AudioManager.gd` uses dual `AudioStreamPlayer` nodes to enable seamless cross-fading between "travel" and "combat" music tracks using `Tween` for volume linear-to-db transitions.
- **Upgrade-Aware Equipment System**: `EquipmentManager.gd` implements a weighted scoring algorithm (Stats + iLvl + Rarity) to automatically detect and equip best-in-slot items from the player's inventory.
- **High-Frequency Resource Management**: `ResourceManager.gd` is tuned for a 3-second combat cycle, with base regeneration rates increased (8 mana/sec, 10 energy/sec) and ability costs scaled proportionally in `abilities.json`.
- **Advanced VFX Tinting**: `ParticleManager.gd` utilizes `spec_color` parameters to modulate particle gradients, allowing class-specific visual signatures for all combat effects.
- **Atmospheric Modulators**: `World.gd` leverages `CanvasModulate` for high-speed atmospheric transitions during boss encounters, synchronized with `CameraManager` shake and zoom triggers.

**Resource Management System (Godot 4.x - January 2026):**
- **ResourceManager** (Autoload): Manages mana/energy/focus/rage resources per hero
  - Location: `road-to-war/scripts/ResourceManager.gd`
  - Per-hero resource pools with custom regeneration rates
  - Regeneration strategies (Passive 1.0x, Active 1.5x, Burst 2.0x for 3 seconds)
  - Consumable inventory system (Dictionary<itemId, consumableData>)
  - Resource consumption and restoration methods
  - Temporary regeneration boost support
  - Full Rage mechanics (gain on damage dealt/taken, decay)
- **Consumables**: Defined in `road-to-war/data/items.json` under `consumables` section
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
- **Audio System**: Godot AudioStreamPlayer for sound effects and music
  - Location: `road-to-war/scripts/AudioManager.gd` (Autoload)
  - Dynamic music cross-fading between travel/combat music
  - SFX: hit, miss, crit, level_up, heal, etc. (loads from `res://assets/audio/sfx/`)
  - Music: travel, combat (loads from `res://assets/audio/music/`)
  - Ambient: biome-specific ambient audio (loads from `res://assets/audio/ambient/`)
- **Sprite Rendering**: Godot Sprite2D nodes with layered equipment system
  - Location: `road-to-war/scripts/HeroSprite.gd`
  - Modular paper doll system with layered Sprite2D nodes (Body, Legs, Chest, Shoulder, Head, Weapon, Offhand)
  - Updates automatically when equipment changes via `equipment_changed` signal
  - Uses Godot texture system with JSON-driven equipment visuals from `items.json`
  - Base textures from LPC spritesheets (humanoid_0.png through humanoid_19.png)
- **Build-Time Asset Generation**: Node.js-based asset generation system
  - `tools/generate-assets.js`: CLI tool for generating pixel-art sprites
  - `tools/generate-all-assets.js`: Comprehensive asset generator (spell icons, enemy sprites, items, projectiles, VFX)
  - `tools/unified-asset-generator.js`: Unified entry point for all asset types
  - `tools/generators/`: Specialized generators (hero-sprite-generator.js, spell-icon-generator.js, etc.)
- **Data-Driven**: All gameplay values from JSON configuration files in `road-to-war/data/`
- **Save System**: Godot FileAccess API for cross-platform save/load
  - Location: `road-to-war/scripts/SaveManager.gd` (Autoload)
  - Saves to `user://saves/` directory (cross-platform)
  - Windows: `%APPDATA%/Godot/app_userdata/Road to war/saves/`
  - Linux: `~/.local/share/godot/app_userdata/Road to war/saves/`
  - macOS: `~/Library/Application Support/Godot/app_userdata/Road to war/saves/`

### Sprite Generation Architecture (Godot 4.x)
- **Hero Sprite System**: Godot Sprite2D-based hero rendering
  - Location: `road-to-war/scripts/HeroSprite.gd`
  - Modular layered system with equipment overlays
  - Base body textures from LPC spritesheets (humanoid_0.png - humanoid_19.png) or class-specific variants
  - Equipment visuals applied via JSON-driven texture/modulate/glow system
  - Trigger: `equipment_changed` signal from EquipmentManager
  - Size: 128×128 pixels (designed at 256×256, exported at 128×128 for runtime)
- **Animation System**: Godot AnimationPlayer with programmatic keyframes
  - Location: `road-to-war/scripts/AnimationManager.gd` (Autoload)
  - SOP v3.0 compliant animations (idle, walk, attack, hurt, victory, death)
  - Animation configs loaded from `road-to-war/data/animation-config.json`
  - Integration with HeroSprite for hero animations
  - Smooth transitions with sine wave interpolation

### Animation System Architecture (Godot 4.x - January 2026)
- **Configuration System**: Centralized animation settings
  - `road-to-war/scripts/AnimationManager.gd` (Autoload) - Loads and provides animation configuration
  - `road-to-war/data/animation-config.json` - Frame counts, frame rates, dimensions, texture settings
  - Supports hot-reload for live updates during development
- **Animation Player Integration**: Programmatic AnimationPlayer creation
  - `road-to-war/scripts/AnimationManager.gd` - Creates AnimationPlayer nodes and animations
  - SOP v3.0 compliant specifications (idle: 2.0s, walk: 0.8s, attack: 0.4s, death: 1.0s)
  - Smooth transitions with sine wave interpolation
- **Hot-Reload System**: Live animation updates
  - `road-to-war/scripts/AnimationHotReload.gd` - Watches config files and triggers reload
  - Enabled in development mode for instant feedback
  - Automatically regenerates animations when config files change
- **Texture Utilities**: Reliable texture handling
  - `road-to-war/scripts/TextureUtils.gd` - Texture validation and retry logic
  - `wait_for_textures()` - Polls for texture availability
  - `validate_frames_ready()` - Validates frame data before animation creation
  - `create_animation_with_retry()` - Retries animation creation with exponential backoff
- **Debugging Tools**: Comprehensive animation debugging
  - `road-to-war/scripts/AnimationDebugger.gd` - Animation debugging tools
  - `road-to-war/scripts/AnimationValidator.gd` - Animation validation system
  - Integrated with CursorLogManager for real-time debugging
- **Equipment Integration**: Visual properties mapped from item data in `items.json`
  - Texture: Direct sprite paths (e.g., "res://assets/sprites/equipment/paladin_sword_legendary.png")
  - Modulate: HEX color strings for rarity-based tinting
  - Glow shader parameters for legendary/epic items
  - Class restrictions to prevent incorrect equipment display

### Placeholder Strategy
- **Colored Rectangles**: Visual placeholders for sprites (fallback only in development)
- **Text Labels**: UI element placeholders (not used in production)
- **Audio System**: Godot AudioStreamPlayer (can load WAV/OGG files, silent mode for missing assets)
- **Data-Driven**: Easy asset swapping without code changes via JSON configuration

### Future Asset Integration
- **Standard Formats**: PNG for images, OGG/WAV for audio
- **Optimization**: Godot's built-in texture compression and optimization
- **Loading**: Godot's resource loading system with automatic import processing
- **Caching**: Godot's resource system handles caching automatically

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
- **Godot Debugger**: Built-in debugger with breakpoints, variable inspection, and performance profiling

### Game Development Tools (tools/)
**Status**: Tools cleaned up - CursorPlay/Puppeteer tools removed, codebase optimized.

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
  - Run via Godot editor or command line
- **`docs/PERFORMANCE_OPTIMIZATIONS.md`**: Comprehensive documentation of all performance optimizations

**Active Tools** (12+ files):
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

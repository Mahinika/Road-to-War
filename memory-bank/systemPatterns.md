# System Patterns: Incremental Prestige RPG

## System Architecture Overview
The game follows a modular, event-driven architecture with clear separation between game logic, data, and presentation.

## Development Principles
- **File Creation Policy**: **AVOID creating new files unless absolutely necessary** - The AI director/assistant decides if a new file is necessary. Always prefer editing existing files over creating new ones. Only create new files when:
  - The new functionality cannot be reasonably added to existing files without breaking organization
  - Creating a new file is required to avoid breaking the game or existing functionality
  - The new file serves a distinct, separate purpose that doesn't fit existing file structure
  - The user explicitly requests a new file

## Core Design Patterns

### 1. Manager Pattern
Central managers coordinate major game systems:

**Current System (Modularization Complete):**
- **BaseManager Pattern (January 2026)**: All managers now extend `BaseManager` for consistent initialization, dependency management, and lifecycle handling
  - **Location**: `src/managers/base-manager.js`
  - **Features**: 
    - Standardized `init()` async initialization pattern
    - Dependency injection via `getDependencies()` static method
    - Consistent scene and config access
    - DataService integration (optional, falls back to scene cache)
  - **Adoption**: EquipmentManager, CombatManager, AbilityManager, AnimationManager, AudioManager, CameraManager, BloodlineManager, InteractionManager, MovementManager, ParticleManager, ResourceManager, StatusEffectsManager, PrestigeManager, ShopManager, TalentManager, AchievementManager, LootManager, StatisticsManager, PartyManager, WorldManager all extend BaseManager
  - **Benefits**: Unified initialization order, dependency resolution, consistent error handling, easier testing
  - **Init Method Handling (Jan 1, 2026)**: ManagerRegistry now correctly handles async `init()` methods with optional parameters (e.g., `async init(partyManager = null)`). Old sync `init(parameter)` methods are deprecated and skipped during initialization. EquipmentManager's old `init(hero)` method renamed to `initWithHero()` to avoid conflicts.
- **Modular GameScene Architecture**: Complete transition from monolithic `game-world.js` to modular components:
  - `src/scenes/core/`: `GameSceneCore`, `game-scene-combat.js`, `game-scene-ui.js`, `game-scene-update.js`
  - `src/scenes/handlers/`: `combat-handler.js`, `event-handler.js`, `level-up-handler.js`, `save-load-handler.js`, `setup-handler.js` (all integrated)
  - `src/scenes/ui/`: `combat-ui-manager.js`, `consumables-ui-manager.js`, `encounter-ui-manager.js`, `game-ui-manager.js`
  - **Status**: All handlers properly initialized in GameSceneCore, event delegation working, cleanup implemented
- **PartyManager**: Manages array of 5 heroes with role constraints (1 tank, 1 healer, 3 DPS) - 199 lines
- **WorldManager**: World generation and progression, "Road to War" mile system (0-100), party combat triggering - Enhanced with milestone reward tracking (`checkMilestoneRewards()`, `claimMilestoneReward()`), endgame enemy selection
  - **Movement Responsibility**: Moves primary hero (tank) in **sprite-space** and applies to physics via `body.reset(newX, newY)` (avoid sprite/body coordinate mismatch jitter)
  - **Position Source**: `this.worldManager.hero.x/y` (sprite-space) is the authoritative position for leader calculations
- **CombatManager**: Party combat resolution with threat/aggro system, role-based AI, party attack execution
- **MovementManager**: Party movement coordination, hero positioning, target tracking
  - **Travel Mode**: Excludes tank from position updates (WorldManager handles tank via velocity)
  - **Formation Calculation**: Uses `this.worldManager.hero.x` for leader position (not `tank.sprite.x`)
- **CameraManager**: Dynamic camera system that keeps all 5 party members visible
- **AbilityManager**: Per-hero abilities, mana system, and ability selection
- **StatusEffectsManager**: Status effects system (stun, bleed, poison, shield, regeneration, buffs/debuffs)
- **LootManager**: Item drops and loot distribution
- **EquipmentManager**: Per-hero equipment management (heroId → equipment Map)
- **TalentManager**: Talent point allocation per hero (TBC/WotLK-style trees) - 235 lines
- **ShopManager**: Shop encounters and item purchasing
- **AudioManager**: Sound effects and audio management (programmatic generation)
- **ParticleManager**: Visual effects and particle systems - Enhanced with object pooling for floating text, particle throttling, comprehensive cleanup, emitter validation, and automatic emitter recreation
- **StatisticsManager**: Player statistics tracking
- **AchievementManager**: Achievement system and progress tracking
- **PrestigeManager**: Prestige system and meta-progression - Enhanced with gear/talent integration (`getItemQualityBonus()`, `getItemLevelBoost()`, `getGearEffectiveness()`, `getTalentCostReduction()`, `getPrestigeTalentPoints()`, `getCombatBonus()`)
- **ResourceManager**: Resource systems (mana/energy/focus), regeneration strategies, consumables
- **GameplayDataHotReload** (src/managers/gameplay-data-hot-reload.js): Live data update system
  - Watches `public/data/*.json` files for changes using polling
  - Triggers `reload*Data()` methods on affected managers
  - Enables instant balancing feedback loop
- **TooltipManager**: UI tooltips and item comparison - Enhanced with item level/tier display, set bonus previews (`isItemInSet()`, `getItemSetInfo()`)
- **SaveManager**: Game state persistence (singleton utility - browser localStorage + Electron IPC)
- **RuntimePaladinGenerator**: Dynamic sprite generation based on equipped items
  - Generates base sprite texture (`paladin_dynamic_party`)
  - Generates animation frames from base sprite using RenderTexture transformations
  - Uses `RenderTexture.saveTexture()` API (not `generateTexture()` - that's for Graphics objects)
- **AnimationManager**: Animation system with runtime sprite integration and centralized configuration
  - Forces deletion of old paladin animations when runtime sprite exists
  - Mandatory runtime sprite frame generation for paladin/hero characters (no fallback)
  - Scans and deletes animations using old frame textures
  - Uses centralized animation configuration (`animation-config.js`) for frame counts and frame rates
  - Integrates with keyframe generator (`keyframe-generator.js`) for animation parameters
  - Hot-reload support via `animation-hot-reload.js` for live development updates
  - Texture validation via `texture-utils.js` for reliable animation creation
- **AnimationConfig** (src/config/animation-config.js): Centralized animation configuration system
  - Loads from `public/data/animation-config.json` (frame counts, frame rates, dimensions, settings)
  - Provides `getFrameCount()` and `getFrameRate()` functions
  - Supports hot-reload for live updates during development
- **KeyframeGenerator** (src/config/keyframe-generator.js): Keyframe generation from configuration
  - Loads from `public/data/keyframe-configs.json` (animation parameters per type)
  - Generates keyframes for breathing, walk cycle, attack, defend, death animations
  - Supports multiple animation types with configurable parameters
- **AnimationHotReload** (src/managers/animation-hot-reload.js): Live animation updates
  - Watches for changes in animation config files
  - Automatically reloads configuration and regenerates animations
  - Enabled in development mode for instant feedback
- **TextureUtils** (src/utils/texture-utils.js): Texture validation and retry utilities
  - `waitForTextures()` - Polls for texture availability with timeout
  - `validateFramesReady()` - Validates frame data before animation creation
  - `createAnimationWithRetry()` - Retries animation creation with exponential backoff
- **AnimationDebugger** (src/utils/animation-debugger.js): Animation debugging tools
  - Logs animation state, validates animations, provides statistics
  - Console-based interface via `animation-debugger-console.js`
- **AnimationValidator** (src/utils/animation-validator.js): Animation validation system
  - Validates animation integrity, detects common issues
  - Provides health checks for animation system
- **DataValidator** (src/utils/data-validator.js): JSON data validation system
  - Uses schema-based checks for talents, items, stats, and configs
  - Runs during PreloadScene to catch data entry errors early
- **DevStatMonitor** (src/utils/dev-stat-monitor.js): Real-time debugging HUD
  - Displays party stats, combat threat, performance, and world state
  - Includes integrated CombatSimulator interface (F8 toggle)
- **CombatSimulator** (src/utils/combat-simulator.js): Headless combat simulation
  - Runs 100+ iterations in milliseconds to test balancing
  - Calculates win rates, avg DPS, survival probability
- **GameplayStateReplay** (src/utils/gameplay-state-replay.js): State snapshot system
  - Saves (F9) and restores (F10) full game state (party, equipment, world, combat)
  - Essential for bug reproduction and scenario testing
- **MemoryMonitor** (src/utils/memory-monitor.js): Extended memory tracking and leak detection
  - Tracks memory usage over time (100 data points = 100 minutes)
  - Detects memory leaks (10% growth threshold)
  - Warns at 150MB, critical at 200MB
  - Automatic cleanup suggestions and event-based notifications
  - Automatically enabled in development mode
- **Memory Cleanup System** (src/scenes/game-scene.js): Aggressive memory cleanup with safety
  - Deferred texture cleanup (100ms delay) to avoid rendering conflicts
  - Recursive texture usage detection (checks nested containers)
  - Particle texture protection (skips `particle-*` textures)
  - Automatic particle manager cleanup
  - Throttled to once per 10 seconds
- **PerformanceValidator** (src/utils/performance-validator.js): Automated performance testing
  - Hardware detection (CPU cores, GPU, memory)
  - Multiple test scenarios (baseline FPS, combat, particles, UI)
  - Generates comprehensive reports
  - Available via `window.performanceValidator` in console

**5-Man Team System (COMPLETE):**
- **PartyManager**: Manages array of 5 heroes with role constraints (1 tank, 1 healer, 3 DPS) - Enhanced with proper classId/specId save/load support
- **WorldManager**: Uses PartyManager, "Road to War" mile system (0-100), triggers party combat events
- **CombatManager**: Party combat with threat/aggro system, role-based AI, party attack execution
- **MovementManager**: Party movement coordination, hero positioning, target tracking
- **CameraManager**: Dynamic camera tracking all 5 party members
- **EquipmentManager**: Per-hero equipment management (heroId → equipment Map)
- **TalentManager**: Talent point allocation per hero (TBC/WotLK-style trees) - 235 lines
- **StatCalculator**: Calculates final stats with WoW TBC/WotLK rating conversions - 227 lines
- **HeroFactory**: Creates hero objects with class, specialization, level, and initial stats - 210 lines
- **CharacterCreationScene**: Full party creation UI (452 lines)
- **TalentAllocationScene**: Talent management UI (288 lines)
- **Party Display UI**: WoW-style party frames with class-colored borders (Graphics-based rendering)

### 2. Entity-Component-System (ECS) Pattern
Game objects use a lightweight ECS approach:
- **Entities**: Hero, enemies, items, encounters
- **Components**: Position, Stats, Equipment, Renderable
- **Systems**: Movement, Combat, Render, Input handling

### 3. Event-Driven Communication
Systems communicate via events to maintain loose coupling:
- **CombatEvents**: combat_start, combat_end, damage_dealt
- **WorldEvents**: segment_generated, encounter_spawned
- **ItemEvents**: item_dropped, equipment_changed
- **UIEvents**: button_clicked, menu_opened

### 4. Data-Driven Design
All gameplay values come from external data:
- Items defined in JSON files
- Enemy stats in data modules
- World generation parameters configurable
- No hard-coded values in logic

**Hero Asset Creation System (SOP v3.0 - January 2026):**
- **JSON-Driven Equipment Visuals**: Equipment items in `items.json` now include:
  - `texture`: Direct sprite paths for equipment visuals
  - `modulate`: HEX color strings for rarity-based tinting (supports alpha channel)
  - `glow_shader_param`: Float values (0.0-1.0) for glow intensity on legendary/epic items
  - `class_restriction`: Arrays of allowed classes for equipment (prevents incorrect class equipment display)
- **Modular Paper Doll System**: HeroSprite.gd uses layered Sprite2D nodes (Body, Legs, Chest, Shoulder, Head, Weapon, Offhand) with:
  - Bottom-center pivot alignment (Vector2(-32, -64) for 64×64 grid)
  - Dynamic texture loading from JSON
  - Rarity modulation via Color parsing from HEX strings
  - Glow shader parameter application for visual effects
  - Class restriction validation before visual application
- **Animation System**: Programmatic AnimationPlayer with SOP v3.0 compliant durations:
  - Idle: 2.0s loop, 4 frames, ±5px vertical bob
  - Walk: 0.8s loop, 8 frames, ±10px bob
  - Attack: 0.4s, 6 frames, 20px forward dash + squash/stretch
  - Jump: 0.6s, 4 frames, scale 0.8 → 1.2
  - Death: 1.0s, 5 frames, fade out + particle burst
- **Backward Compatibility**: Fallback texture system ensures items without new JSON fields still render correctly

**Production Finalization Patterns (January 2026):**
- **Weighted Item Scoring**: `EquipmentManager.gd` uses a score-based system (Stats + iLvl + Rarity) to identify "Best in Slot" upgrades from the inventory.
- **Inventory QoL Automation**:
  - `auto_equip_best_in_slot()`: Automates hero power progression by scanning bags for upgrades.
  - `sell_all_trash()`: Automates gold conversion for low-quality items.
  - **Category Filtering**: UI-level filtering (Armor, Weapon, Consumable) to manage high-speed loot drops.
- **Dynamic Audio Cross-fading**: `AudioManager.gd` uses dual `AudioStreamPlayer` nodes with `Tween`-based volume modulation to transition between exploration and combat music without abrupt cuts.
- **VFX Clarity Patterns**:
  - **Spec-Specific Tinting**: `ParticleManager.gd` accepts a `spec_color` to provide visual distinction between hero classes during chaotic combat.
  - **Floating Text Fan-Out**: Uses randomized spread and staggered rise velocities to ensure combat numbers remain readable during multi-enemy encounters.
- **Atmospheric Boss Transitions**: `World.gd` uses `CanvasModulate` and `CameraManager` triggers to create an "overwhelming" feeling when approaching boss milestones.

## Component Relationships

```
GameScene (Phaser Scene)
├── PartyManager (manages 5 heroes)
│   ├── Hero array management
│   ├── Role constraints (tank/healer/DPS)
│   └── Party utility methods
├── CameraManager (dynamic party tracking)
│   ├── Party bounds calculation
│   ├── Camera offset adjustment
│   └── Smooth interpolation
├── MovementManager (party movement coordination)
│   ├── Hero positioning
│   ├── Target tracking
│   └── Movement state management
├── WorldManager (uses PartyManager)
│   ├── SegmentGenerator (internal)
│   ├── EncounterManager (internal)
│   ├── ProgressionTracker (internal - mile system 0-100)
│   └── Party combat event triggering
├── CombatManager (party combat)
│   ├── AbilityManager (integrated - per hero)
│   ├── StatusEffectsManager (integrated - status effects on combatants)
│   ├── StatCalculator (uses StatCalculator utility)
│   ├── DamageResolver (internal)
│   ├── ThreatSystem (aggro tracking)
│   ├── PartyAttackExecutor (party attack coordination)
│   └── RoleAI (tank/healer/DPS decision making)
├── LootManager
│   ├── DropTableResolver (internal)
│   ├── ItemGenerator (internal)
│   └── EquipmentValidator (internal)
├── EquipmentManager (UPDATED - per hero)
│   ├── StatCalculator (uses new StatCalculator utility)
│   └── EquipmentValidator (internal)
│   └── HeroEquipment Map (heroId → equipmentSlots)
├── TalentManager (NEW)
│   ├── TalentTreeManager (internal)
│   ├── TalentPointAllocation (internal)
│   └── TalentBonusCalculator (internal)
├── ResourceManager (NEW)
│   ├── HeroResourcePools (internal - Map<heroId, resources>)
│   ├── ConsumableInventory (internal - Map<itemId, consumableData>)
│   ├── RegenerationStrategies (internal - passive/active/burst)
│   └── ResourceConsumption (internal - mana/energy/focus)
├── StatCalculator (NEW - utility)
│   ├── RatingToPercentageConverter (internal)
│   ├── DefenseCapChecker (internal)
│   └── DerivedStatCalculator (internal)
├── HeroFactory (NEW - utility)
│   └── HeroCreationLogic (internal)
├── LevelUpHandler (NEW - utility)
│   ├── ExperienceCalculation (internal - exponential scaling)
│   ├── StatGrowthCalculation (internal - per-level gains)
│   └── MilestoneBonusApplication (internal - level 20/40/60/80/100 bonuses)
├── ShopManager
│   └── ItemGenerator (internal)
├── AudioManager
│   └── AudioContext (internal)
├── ParticleManager
│   └── EffectGenerator (internal)
└── RuntimePaladinGenerator (UPDATED - per hero)
    ├── Equipment Visual Mapper (internal)
    └── Sprite Drawing Methods (internal)

SaveManager (Singleton Utility - UPDATED)
├── LocalStorage Interface (Browser)
├── Electron IPC Interface (Desktop)
└── Generic game data persistence (party data included in gameData object)

Electron Main Process
├── BrowserWindow Management
├── IPC Handlers (save/load operations)
└── File System Access (AppData saves)

Electron Preload Script
└── Secure API Bridge (electronAPI)

Console Log Capture System
├── Electron: webContents.on('console-message') → logs/game-output.log
├── Browser: Console override → localStorage + window.gameLogs
└── Real-time log file for debugging (logs/game-output.log)
```

## Data Flow Patterns

### 1. Game Loop Flow
1. Update phase: Process automatic systems (movement, combat)
2. Event phase: Handle system interactions
3. Render phase: Update visual representation
4. Input phase: Process user interactions

## Coordinate System Rule (Arcade Physics)
- **Authoritative position**: sprite-space (`sprite.x/y`, origin-based)
- **Physics body**: `body.x/y` is **top-left**, not directly comparable to `sprite.x/y`
- **Rule**: Do not “sync” sprite and body by setting both to the same numeric values. When adjusting tank position, prefer `body.reset(x, y)` using sprite-space targets to keep Phaser alignment stable.

### 2. Combat Resolution Flow

**Current Single-Hero System:**
1. CombatManager detects enemy encounter
2. AbilityManager selects appropriate ability based on hero state (health, mana)
3. AbilityManager executes ability (auto attack, defensive stance, heal)
4. StatCalculator compares hero vs enemy stats (with ability modifiers)
5. DamageResolver processes combat rounds
6. AbilityManager regenerates mana over time
7. LootManager handles post-combat rewards
8. UIManager displays results

**Planned 5-Man Team System:**
1. CombatManager detects enemy encounter
2. ThreatSystem tracks aggro per enemy per hero
3. Tank AI: Generates threat, uses defensive cooldowns, picks up loose adds
4. Healer AI: Targets lowest health % party members, selects healing spell type (emergency/sustained/AoE), manages mana
5. DPS AI: Attacks tank's target, executes ability rotation, uses offensive cooldowns, monitors threat
6. StatCalculator calculates final stats per hero (base + equipment + talents, rating conversions)
7. DamageResolver processes combat rounds for all heroes
8. AbilityManager regenerates resources (mana/energy/rage) per hero
9. XP distributed to all party members (with catch-up scaling for lower levels)
10. LootManager handles post-combat rewards
11. UIManager displays results (party health/mana bars, damage numbers, etc.)

### 3. Equipment System Flow

**Current Godot 4.x Implementation (SOP v3.0 - January 2026):**
1. Player selects hero (via hero selector in UI)
2. Player equips item via UI for selected hero
3. EquipmentManager validates slot, requirements, and armor proficiency for that hero
4. StatCalculator calculates final stats (base + equipment + talents) for that hero
5. EquipmentManager updates hero's equipment slots (stored in heroEquipment Dictionary)
6. EquipmentManager fires `equipment_changed` signal with heroId, slot, itemId, and oldItemId
7. HeroSprite.gd receives signal and calls `update_equipment_visuals()`
8. `apply_equipment()` parses items.json and checks class restrictions
9. `_apply_item_visual()` loads texture from JSON `texture` field (or falls back to old system)
10. Modulate color applied from JSON `modulate` field (or rarity-based fallback)
11. Glow shader parameter set from JSON `glow_shader_param` field (if shader supports it)
12. Layer nodes updated with new textures, colors, and effects
13. GameScene UI reflects changes via events (stats display, equipment panel)
14. SaveManager persists game state including party data (all 5 heroes with equipment) via Godot FileAccess

**Key Features:**
- **JSON-Driven Visuals**: Equipment textures, colors, and glow effects defined in items.json
- **Class Restrictions**: Equipment only displays for allowed classes (prevents visual mismatches)
- **Rarity Modulation**: HEX color strings with alpha channel support for visual feedback
- **Glow Effects**: Shader parameter support for legendary/epic item visual effects
- **Backward Compatibility**: Fallback system ensures old items without new fields still work

### 4. Save System Flow (Desktop)
1. SaveManager detects Electron environment
2. Calls window.electronAPI.saveGame() via preload bridge
3. Electron main process receives IPC message
4. Writes save file to AppData/RoadOfWar/saves/
5. Returns success/failure to renderer process

**Party Data Save/Load (December 2025):**
- **PartyManager.getSaveData()**: Saves `classId`/`specId` (preferred) with backward-compat fallbacks to `class`/`specialization`
- **PartyManager.loadData()**: Loads `classId`/`specId` (preferred) with backward-compat fallbacks for old save files
- **Critical Fix**: Previously saved `class`/`specialization` which didn't match `HeroFactory` output (`classId`/`specId`), causing all heroes to default to paladin
- **Impact**: Heroes now maintain correct class across save/load cycles

### 5. Console Log Capture Flow
1. Renderer process generates console.log/warn/error
2. Electron: webContents.on('console-message') captures in main process
3. Logs written to logs/game-output.log file with timestamps
4. Browser: Console override captures logs in memory/localStorage
5. Logs accessible via window.gameLogs or logs/game-output.log file

## Critical Implementation Paths

### Performance-Critical Paths
- World generation (must be seamless)
- Combat calculations (frequent operations)
- UI updates (60fps requirement for desktop)

### Data Integrity Paths
- Save/load operations
- Equipment validation
- Stat calculations
- Encounter generation

### Error Handling Patterns
- Graceful degradation for missing assets
- Safe defaults for corrupted data
- User-friendly error messages
- Automatic state recovery

## Memory Management Patterns
- Object pooling for frequently created/destroyed entities
- Lazy loading for world segments
- Efficient sprite and texture management
- Garbage collection awareness for desktop performance

## File Structure Patterns

### Electron Integration
- **electron/main.js**: Main Electron process, manages BrowserWindow and IPC handlers (save/load operations)
- **electron/preload.js**: Secure bridge between renderer and main process (uses CommonJS require syntax)
- **electron-builder.json**: Configuration for packaging Windows EXE
- **scripts/start-electron-dev.js**: Orchestrates Vite server + Electron startup

### Save System Architecture
- **Browser**: Uses localStorage API (synchronous)
- **Desktop**: Uses Electron IPC (asynchronous via preload bridge)
- **SaveManager**: Automatically detects environment and uses appropriate method
- **Save Location**: 
  - Browser: Browser's localStorage
  - Desktop: `%AppData%/RoadOfWar/saves/` directory

## Generator System

### Runtime Generators (src/generators/)
- **RuntimePaladinGenerator**: Dynamic hero sprite generation based on equipped items (Phaser Graphics API)
- **ProceduralItemGenerator**: Dynamic item generation with modifiers - Enhanced with `generateItemForMile()` method, tier calculation (`calculateTier()`), prestige integration, mile-based item level scaling
- **RuntimeEnemyGenerator**: Dynamic enemy sprite generation
- **AnimationGenerator**: Animation sequence generation
- **AssetGenerator**: General asset generation utilities
- **ItemIconGenerator**: Item icon generation
- **SpriteGenerator**: Sprite generation utilities
- **SpriteSheetGenerator**: Sprite sheet generation
- **TerrainGenerator**: Terrain/background generation
- **UIGenerator**: UI element generation

### Build-Time Generators (tools/generators/)
- **PaladinGenerator**: Build-time Paladin sprite generator (reference/testing)
- **HumanoidGenerator**: Humanoid sprite generation
- **EquipmentGenerator**: Equipment sprite generation

## Utility System (src/utils/)
- **async-helpers.js**: Async operation utilities
- **error-handler.js**: Error handling and reporting
- **event-constants.js**: Event name constants
- **event-tracker.js**: Event tracking utilities
- **event-validator.js**: Event validation
- **health-bar.js**: Health bar UI component
- **hero-factory.js**: Hero creation factory (210 lines)
- **logger.js**: Logging system (actively used throughout codebase)
- **object-pool.js**: Object pooling for performance
- **performance-monitor.js**: Performance monitoring utilities
- **placeholder-helper.js**: Placeholder asset utilities
- **save-manager.js**: Save/load system (browser + Electron)
- **stat-calculator.js**: Stat calculation utilities (227 lines)
- **texture-helper.js**: Texture management utilities
- **tooltip-manager.js**: Tooltip system - Enhanced with item level/tier display, set bonus previews (`isItemInSet()`, `getItemSetInfo()`), comparison functionality
- **type-validators.js**: Type validation utilities
- **ui-helper.js**: UI component helpers
- **ui-theme.js**: UI theming system (updated with WoW WOTLK color palette)
- **wow-ui-helper.js**: WoW-specific UI creation functions (createWoWFrame, createWoWBar, createWoWButton)

## Testing Framework

**Current Testing Architecture (December 30, 2025):**
- **Vitest Framework**: Modern unit testing framework with Phaser 3 mocks
  - Location: `tests/setup.js` - Phaser 3 scene mocks and test environment
  - Location: `tests/utils/test-helpers.js` - Test utilities (createMockScene, createMockHero, etc.)
  - Configuration: `vite.config.js` - Test environment (jsdom), coverage settings
  - Commands: `npm test`, `npm run test:ui`, `npm run test:coverage`, `npm run test:unit`, `npm run test:integration`
- **Unit Tests**: 
  - `tests/unit/managers/party-manager.test.js` - Comprehensive PartyManager tests (party creation, validation, hero management, save/load)
  - In Progress: Tests for remaining managers (CombatManager, EquipmentManager, TalentManager, etc.)
- **Legacy Testing Tools** (still available):
  - `test-runner.js`: Unified test runner consolidating all test scripts
  - `test-5man-direct-methods.js`: Direct method calls for 5-man team testing
  - `run-full-test.js`: Full test suite orchestrator
  - `test-specific-party.js`: Automated party creation testing

**Testing Features**:
- Modern unit testing with Vitest (target: 80%+ coverage)
- Phaser 3 scene and manager mocks for isolated testing
- Test utilities for creating mock scenes, heroes, and party managers
- Direct game state manipulation for reliable testing
- Automated game navigation and state verification
- Party creation and combat flow testing
- Equipment and talent system validation

## Desktop Performance Optimization Patterns

**Object Pooling Pattern:**
- **Location**: `src/utils/object-pool.js`, integrated into `ParticleManager`
- **Purpose**: Reuse frequently created/destroyed objects to reduce garbage collection pressure
- **Implementation**: 
  - Floating text uses object pooling (50 max pool size)
  - Objects are reset and returned to pool instead of being destroyed
  - Automatic cleanup on scene shutdown
- **Benefits**: Reduced memory allocations, smoother performance during particle-heavy scenes

**Performance Throttling Pattern:**
- **Location**: `src/managers/particle-manager.js`
- **Purpose**: Prevent excessive particle creation that causes frame time spikes
- **Implementation**:
  - Cooldown system per effect type (100-500ms intervals)
  - Configurable throttling prevents particle spam
  - Maintains visual quality while improving performance

**Critical Performance Mode Pattern:**
- **Location**: `src/scenes/core/game-scene-update.js`
- **Purpose**: Prevent total system collapse during performance degradation
- **Implementation**:
  - Automatically disables particle effects when FPS < 10
  - Reduces update frequencies dramatically
  - Re-enables systems when performance recovers
  - Thresholds: FPS < 10 (critical), FPS < 30 (reduced), FPS > 50 (normal)

**Memory Leak Detection Pattern:**
- **Location**: `src/utils/memory-monitor.js`
- **Purpose**: Track memory usage over time and detect potential leaks
- **Implementation**:
  - Periodic memory checks (every 60 seconds)
  - Growth rate calculation (10% threshold = potential leak)
  - Event-based notifications for scene handling
  - Automatic cleanup suggestions

## Validation Patterns (December 2025)

**Input Validation System:**
- **Location**: `src/utils/input-validation.js` (1471 lines)
- **ValidationBuilder**: Fluent API for building validation chains with automatic error collection
- **ManagerValidationMixin**: Provides `quickValidate()`, `validateSlot()`, `validateItemId()`, `validateHeroId()` convenience methods
- **Adoption Status**: 
  - ✅ EquipmentManager: Uses `ValidationBuilder` in `equipItem()` and `unequipItem()`
  - ✅ TalentManager: Uses `ValidationBuilder` in `allocateTalentPoint()`
  - ✅ CombatManager: Uses `ValidationBuilder` in `startPartyCombat()` and `validateCombatStart()`
- **Pattern**: All manager methods that handle user input or external data should use `ValidationBuilder` for consistent error handling

**Null Safety Patterns (December 2025):**
- **Array Operations**: All `heroes.map()`, `heroes.forEach()`, `heroes.reduce()`, `heroes.filter()` operations must check `Array.isArray(heroes)` first
- **Implementation**: Added defensive checks in CombatManager (8 locations) and EquipmentManager (1 location)
- **Pattern**: Always validate array existence before calling array methods to prevent "Cannot read property 'map' of undefined" errors

## Troubleshooting Pattern (December 2025)

**Automatic Log Analysis and Fix Workflow:**
- User command: **"check logs"**
- AI automatically reads full `logs/game-output.log` file
- Analyzes all errors, warnings, and issues
- Automatically fixes problems found:
  - Code errors (TypeErrors, undefined references)
  - Missing defensive guards and null checks
  - Initialization order issues
  - Error handling improvements
- Applies minimal, well-scoped fixes following senior engineer guidelines
- Provides summary of issues found and fixes applied

**Console Capture System Integration:**
- Logs captured in real-time to `logs/game-output.log` (Electron) and `window.gameLogs` (browser)
- Verification function: `window.verifyConsoleCapture()` available in console
- Enables rapid troubleshooting during development

**Runtime Evidence-Based Debugging (December 2025):**
- **Critical Pattern**: Always use runtime evidence from logs, never fix based on code analysis alone
- **Workflow**: Generate hypotheses → Instrument code with logs → Reproduce issue → Analyze logs → Fix with 100% confidence
- **Example**: Hero movement stopping issue
  - **Hypothesis**: Leader position calculation using stale sprite position
  - **Evidence**: Logs showed `velocityX: 50` (tank moving) but `leaderPosition` stuck at `{"x":240,"y":794.2265625}`
  - **Root Cause**: `tank.sprite.x` was stale; actual position is `this.worldManager.hero.x` (moved via physics velocity)
  - **Fix**: Use `this.worldManager.hero.x` for leader position calculation
- **Key Insight**: When multiple systems manage the same entity (WorldManager velocity + MovementManager positions), ensure position source is authoritative

## Development Workflow Patterns

### Agent Manager System (December 2025)
**Multi-lane parallel development workflow:**
- **Lane-Based Architecture**: Three independent development lanes (gameplay, ui, infra)
- **Agent Workflow**: Prep task → Generate lane-specific prompts → Agents produce unified diff patches → Ingest patches → Apply with git safety checks
- **MCP Integration**: Agent manager exposed as Cursor MCP tools for seamless integration
- **Patch Management**: Patches stored in `agent-out/patches/` with lane-based naming
- **Configuration**: `agent-manager.config.json` defines lane scopes and instructions
- **Context Management**: Includes PROJECT_INDEX.md and memory bank files in agent context

**Agent Manager Components:**
- `tools/agent-manager.js` - Core agent manager (prep/ingest/apply commands)
- `tools/agent-manager.config.json` - Lane configuration (gameplay, ui, infra)
- `tools/mcp-manager/server.js` - MCP server exposing tools to Cursor
- `agent-out/prompts/` - Generated per-lane prompts
- `agent-out/patches/` - Agent-produced unified diff patches
- `agent-out/summary.json` - Task summary and metadata

## Future Expansion Patterns
- Plugin architecture for new encounter types
- Configurable prestige system
- Modular skill system
- Extensible UI components

## Completed Systems (Endgame Completion Roadmap - December 2025)

### Implemented Systems (ALL COMPLETE) ✅

**Item Level & Scaling System:**
- ✅ `ProceduralItemGenerator.generateItemForMile()` method implemented
- ✅ Mile-based item level calculation (Mile 0 = Level 1, Mile 100 = Level 100)
- ✅ Quality scaling by mile (`itemQualityScaling` config in `world-config.json`)
- ✅ Dynamic item generation from templates with prestige bonuses

**Talent System Enhancements:**
- ✅ Talent point milestones at levels 20/40/60/80/100 (+1 point each)
- ✅ Capstone talents requiring 51 points invested in a tree (Divine Ascension, Immovable Object, Avatar of Vengeance)
- ✅ Total talent points: 95 max (90 from levels + 5 milestone bonuses)
- ✅ Prestige talent points that persist across resets
- ✅ `TalentManager.getTotalTreePoints()` method for prerequisite checking

**Endgame Content Systems:**
- ✅ Milestone boss encounters at miles 25/50/75/100
- ✅ Boss phase system with state machine (War Lord has 3 phases)
- ✅ Endgame enemy types (Elite Orc Champion miles 80-90, Dark Knight miles 90-100, War Lord mile 100)
- ✅ Enhanced enemy selection in `WorldManager.selectEnemyType()`

**Data Systems Integration (December 2025 - COMPLETE):**
- ✅ **Abilities System**: Fully integrated - AbilityManager loads from `abilities.json`, uses `getAbilityDefinition()` for all class abilities (mana costs, cooldowns, scaling, types)
- ✅ **Bloodline System**: Fully integrated - HeroFactory loads from `bloodlines.json`, StatCalculator applies stat bonuses and passive effects (enhanced to load from JSON if only `bloodlineId` provided)
- ✅ **Skill Gem System**: Fully integrated - EquipmentManager loads from `skill-gems.json`, has complete `socketGem()`/`unsocketGem()` methods with validation, stat application, and gem effect processing

**Gear Sets & Tier Progression:**
- ✅ Item set system with set detection (`calculateSetBonuses()`, `getActiveSets()` in `EquipmentManager`)
- ✅ Set bonuses scale with number of pieces equipped (2-piece, 3-piece bonuses)
- ✅ Tier progression: 5 tiers (Basic/Improved/Advanced/Elite/Legendary) mapped to mile ranges
- ✅ Visual distinction by tier (color coding in tooltips)

**Hero Level Cap System:**
- ✅ Level cap: 100 maximum (`maxLevel` in `world-config.json`)
- ✅ Experience scaling formula with configurable multiplier (`experienceScaling` config)
- ✅ Level-based stat gains (`leveling.statGrowth` config)
- ✅ Milestone bonuses at levels 20/40/60/80/100

**Prestige Integration:**
- ✅ Prestige upgrades: Better Loot, Item Level Boost, Gear Affinity, Talent Efficiency, Talent Mastery, Combat Mastery
- ✅ Prestige talent points system (`getPrestigeTalentPoints()`)
- ✅ Permanent bonuses: Gear Affinity, Talent Efficiency, Combat Mastery
- ✅ Integration with `ProceduralItemGenerator` and `TalentManager`

**Milestone Rewards System:**
- ✅ Mile milestone rewards at 25/50/75/100 (`checkMilestoneRewards()`, `claimMilestoneReward()` in `WorldManager`)
- ✅ Rewards include: talent points, items, respecs, prestige bonuses
- ✅ Endgame achievements: Mile 100 Champion, Fully Equipped, Talent Master, Set Collector, War Lord Slayer, Boss Hunter
- ✅ Achievement rewards: talent points, items, prestige bonuses

**UI Enhancement Systems:**
- ✅ Item comparison UI: item level/tier display, stat differences, set bonus previews (`TooltipManager` enhanced)
- ✅ Talent tree visualization: point requirements, available vs locked, synergies (`TalentManager.canAllocateTalent()` enhanced)
- ✅ Progression tracking UI: current mile, average item level, talent points, sets completed, next milestone (`GameUIManager.createProgressionPanel()`)

**Reference Documents:**
- Plan: `c:\Users\Ropbe\.cursor\plans\endgame_completion_roadmap_9988d6fb.plan.md`
- Research: `docs/endgame-implementation-research.md` (implementation complete)

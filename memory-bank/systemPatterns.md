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

**Current System (Godot 4.x - January 2026):**
- **Manager Pattern**: All managers are Godot Autoloads (Singletons) defined in `project.godot`
  - **Location**: `road-to-war/scripts/` - All manager scripts are `.gd` files
  - **Features**: 
    - Godot Autoload system provides singleton access via `/root/ManagerName`
    - Managers communicate via Signals (Godot's event system)
    - Consistent data access via `DataManager` singleton
    - Initialization handled in `_ready()` lifecycle method
  - **Adoption**: All managers are Autoloads: EquipmentManager, CombatManager, AbilityManager, AnimationManager, AudioManager, CameraManager, BloodlineManager, InteractionManager, MovementManager, ParticleManager, ResourceManager, StatusEffectsManager, PrestigeManager, ShopManager, TalentManager, AchievementManager, LootManager, StatisticsManager, PartyManager, WorldManager, QuestManager
  - **Benefits**: Automatic singleton access, Godot-native signal system, consistent lifecycle, easier scene integration
- **Scene Architecture**: Modular scene-based architecture:
  - `road-to-war/scenes/`: All game scenes (`.tscn` files)
  - `road-to-war/scripts/`: Scene scripts attached to scenes
  - **Status**: All scenes properly connected, signals working, cleanup implemented via `_exit_tree()`
- **PartyManager**: Manages array of 5 heroes with role constraints (1 tank, 1 healer, 3 DPS) - 199 lines
- **WorldManager**: World generation and progression, "Road to War" mile system (0-100), party combat triggering - Enhanced with milestone reward tracking (`check_milestone_rewards()`, `claim_milestone_reward()`), endgame enemy selection
  - **Movement Responsibility**: Manages party movement via Godot's Node2D position system
  - **Position Source**: Hero positions stored in `Hero` resource objects, accessed via `PartyManager`
- **CombatManager**: Party combat resolution with threat/aggro system, role-based AI, party attack execution
- **MovementManager**: Party movement coordination, hero positioning, target tracking
  - **Travel Mode**: Handles party formation and road-following
  - **Formation Calculation**: Uses `PartyManager` hero positions for formation calculations
- **CameraManager**: Dynamic camera system that keeps all 5 party members visible
- **AbilityManager**: Per-hero abilities, mana system, and ability selection - Enhanced with WotLK ability systems (Execute for Warriors, Combo Points for Rogues, Forms/Stances integration)
- **StatusEffectsManager**: Status effects system (stun, bleed, poison, shield, regeneration, buffs/debuffs)
- **ThreatSystem** (`road-to-war/scripts/ThreatSystem.gd`): Threat and aggro management - Enhanced with WotLK taunt system (Warriors: Taunt, Challenging Shout; Paladins: Righteous Defense, Hand of Reckoning), integrated into CombatActions
- **ComboPointSystem** (`road-to-war/scripts/ComboPointSystem.gd`): Rogue combo point system - Generates combo points from builders, finishers consume combo points, singleton Autoload
- **FormSystem** (`road-to-war/scripts/FormSystem.gd`): Form/stance system - Druid Forms (Bear, Cat, Moonkin, Tree of Life), Warrior Stances (Battle, Defensive, Berserker), Rogue Stealth, ability filtering based on form/stance, singleton Autoload
- **PetSystem** (`road-to-war/scripts/PetSystem.gd`): Pet management system - Hunter Pets (Wolf, Cat, Bear), Warlock Demons (Imp, Voidwalker, Succubus, Felhunter, Felguard), pet summoning, healing, damage tracking, singleton Autoload
- **PartyBuffSystem** (`road-to-war/scripts/PartyBuffSystem.gd`): Party-wide buff management - Arcane Intellect (Mage), Power Word: Fortitude (Priest), Devotion Aura/Retribution Aura (Paladin), Aspect of the Hawk/Cheetah (Hunter), integrated into StatCalculator
- **LootManager**: Item drops and loot distribution
- **EquipmentManager**: Per-hero equipment management (heroId → equipment Map)
- **TalentManager**: Talent point allocation per hero (TBC/WotLK-style trees) - 235 lines
- **ShopManager**: Shop encounters and item purchasing
- **QuestManager** (`road-to-war/scripts/QuestManager.gd`): Quest system and meta-task tracking - Handles kill-tasks and distance-tasks (reach_mile), tracks quest progress, grants rewards (gold, experience, talent points), connects to WorldManager (mile changes) and CombatManager (combat ended) for automatic progress updates
- **AudioManager**: Sound effects and audio management (programmatic generation)
- **ParticleManager**: Visual effects and particle systems - Enhanced with object pooling for floating text, particle throttling, comprehensive cleanup, emitter validation, automatic emitter recreation, and comprehensive spell VFX system (projectiles, beams, AOE, self-buffs) with sprite-based fallback support
- **StatisticsManager**: Player statistics tracking
- **AchievementManager**: Achievement system and progress tracking
- **PrestigeManager**: Prestige system and meta-progression - Enhanced with gear/talent integration (`getItemQualityBonus()`, `getItemLevelBoost()`, `getGearEffectiveness()`, `getTalentCostReduction()`, `getPrestigeTalentPoints()`, `getCombatBonus()`)
- **ResourceManager**: Resource systems (mana/energy/focus), regeneration strategies, consumables
- **GameplayDataHotReload** (`road-to-war/scripts/GameplayDataHotReload.gd`): Live data update system
  - Watches `road-to-war/data/*.json` files for changes using polling
  - Triggers `reload_*_data()` methods on affected managers
  - Enables instant balancing feedback loop
- **TooltipManager** (`road-to-war/scripts/TooltipManager.gd`): UI tooltips and item comparison - Enhanced with item level/tier display, set bonus previews (`is_item_in_set()`, `get_item_set_info()`)
- **SaveManager** (`road-to-war/scripts/SaveManager.gd`): Game state persistence using Godot FileAccess API
  - Saves to `user://saves/` directory (cross-platform)
  - JSON-based save format
- **HeroSprite** (`road-to-war/scripts/HeroSprite.gd`): Hero sprite rendering and animation
  - Uses Godot's Sprite2D nodes with layered equipment
  - AnimationPlayer for animations (idle, walk, attack, death)
  - Equipment visuals applied via texture modulation
  - **Visibility Enforcement (January 2026)**: Explicit `visible = true` and `modulate = Color.WHITE` in `_ready()` and `setup()` to ensure sprites are always visible
  - **Dynamic Texture Scaling**: `_set_layer_texture()` handles any texture size with calculated scale factors
  - **Marker2D Anatomy-Based Equipment Attachment (January 2026)**: Equipment layers attach to Marker2D nodes positioned dynamically based on hero body anatomy
    - `_update_attachment_markers()` calculates Marker2D positions from body sprite dimensions
    - Positions markers at anatomical locations (head, neck, shoulders, chest, legs, arms, hips)
    - Equipment layers reparent to markers for proper alignment during animations
    - Equipment centers on markers (offset 0,0) since markers are at anatomical centers
    - Markers update automatically when body sprite changes (tier evolution)
- **AnimationManager** (`road-to-war/scripts/AnimationManager.gd`): Animation system management
  - Uses Godot's AnimationPlayer nodes
  - Loads animation configs from `road-to-war/data/animation-config.json`
  - Integrates with HeroSprite for hero animations
- **AnimationHotReload** (`road-to-war/scripts/AnimationHotReload.gd`): Live animation updates
  - Watches for changes in animation config files
  - Automatically reloads configuration and regenerates animations
  - Enabled in development mode for instant feedback
- **TextureUtils** (`road-to-war/scripts/TextureUtils.gd`): Texture validation and retry utilities
  - `wait_for_textures()` - Polls for texture availability with timeout
  - `validate_frames_ready()` - Validates frame data before animation creation
  - `create_animation_with_retry()` - Retries animation creation with exponential backoff
- **AnimationDebugger** (`road-to-war/scripts/AnimationDebugger.gd`): Animation debugging tools
  - Logs animation state, validates animations, provides statistics
  - Integrated with CursorLogManager for real-time debugging
- **AnimationValidator** (`road-to-war/scripts/AnimationValidator.gd`): Animation validation system
  - Validates animation integrity, detects common issues
  - Provides health checks for animation system
- **DataValidator** (`road-to-war/scripts/DataValidator.gd`): JSON data validation system
  - Uses schema-based checks for talents, items, stats, and configs
  - Runs during Preload scene to catch data entry errors early
- **DevStatMonitor** (`road-to-war/scripts/DevStatMonitor.gd`): Real-time debugging HUD
  - Displays party stats, combat threat, performance, and world state
  - Includes integrated CombatSimulator interface (F8 toggle)
- **CombatSimulator** (`road-to-war/scripts/CombatSimulator.gd`): Headless combat simulation
  - Runs 100+ iterations in milliseconds to test balancing
  - Calculates win rates, avg DPS, survival probability
- **GameplayStateReplay** (`road-to-war/scripts/GameplayStateReplay.gd`): State snapshot system
  - Saves (F9) and restores (F10) full game state (party, equipment, world, combat)
  - Essential for bug reproduction and scenario testing
- **MemoryMonitor** (`road-to-war/scripts/MemoryMonitor.gd`): Extended memory tracking and leak detection
  - Tracks memory usage over time (100 data points = 100 minutes)
  - Detects memory leaks (10% growth threshold)
  - Warns at 150MB, critical at 200MB
  - Automatic cleanup suggestions and event-based notifications
  - Automatically enabled in development mode
- **PerformanceValidator** (`road-to-war/scripts/PerformanceValidator.gd`): Automated performance testing
  - Hardware detection (CPU cores, GPU, memory)
  - Multiple test scenarios (baseline FPS, combat, particles, UI)
  - Generates comprehensive reports

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
  - **Marker2D Attachment System (January 2026)**: Equipment layers attach to Marker2D nodes for anatomy-based positioning
    - 9 Marker2D nodes: WeaponAttachment, OffhandAttachment, ChestAttachment, HeadAttachment, LegsAttachment, ShoulderAttachment, NeckAttachment, RingAttachment, TrinketAttachment
    - Marker positions calculated dynamically in `_update_attachment_markers()` based on body sprite dimensions
    - Anatomical percentages: Head (-28%), Neck (-30%), Shoulders (-5%), Chest (0%), Legs (15%), Arms (±35%), Hips (±20%)
    - Equipment layers reparent to markers via `_apply_layer_pose()` for proper alignment
    - Equipment centers on markers (offset 0,0) since markers are positioned at anatomical centers
    - Markers update automatically when body sprite texture changes (tier evolution)
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
World Scene (road-to-war/scenes/World.tscn)
├── PartyManager (Autoload - manages 5 heroes)
│   ├── Hero array management (Array<Hero>)
│   ├── Role constraints (tank/healer/DPS)
│   └── Party utility methods
├── CameraManager (Autoload - dynamic party tracking)
│   ├── Party bounds calculation
│   ├── Camera2D offset adjustment
│   └── Smooth interpolation via Tween
├── MovementManager (Autoload - party movement coordination)
│   ├── Hero positioning
│   ├── Target tracking
│   └── Movement state management
├── WorldManager (Autoload - uses PartyManager)
│   ├── RoadGenerator (internal)
│   ├── EncounterManager (internal)
│   ├── ProgressionTracker (internal - mile system 0-100)
│   └── Party combat event triggering via Signals
├── CombatManager (Autoload - party combat)
│   ├── AbilityManager (Autoload - per hero)
│   ├── StatusEffectsManager (Autoload - status effects on combatants)
│   ├── StatCalculator (Autoload utility)
│   ├── DamageCalculator (internal)
│   ├── ThreatSystem (Autoload - aggro tracking)
│   ├── CombatAI (internal - party attack coordination)
│   └── RoleAI (internal - tank/healer/DPS decision making)
├── LootManager (Autoload)
│   ├── DropTableResolver (internal)
│   ├── ProceduralItemGenerator (Autoload)
│   └── EquipmentValidator (internal)
├── EquipmentManager (Autoload - per hero)
│   ├── StatCalculator (uses StatCalculator Autoload)
│   └── EquipmentValidator (internal)
│   └── HeroEquipment Dictionary (heroId → equipmentSlots)
├── TalentManager (Autoload)
│   ├── TalentTreeManager (internal)
│   ├── TalentPointAllocation (internal)
│   └── TalentBonusCalculator (internal)
├── ResourceManager (Autoload)
│   ├── HeroResourcePools (Dictionary<heroId, resources>)
│   ├── ConsumableInventory (Dictionary<itemId, consumableData>)
│   ├── RegenerationStrategies (internal - passive/active/burst)
│   └── ResourceConsumption (internal - mana/energy/focus)
├── StatCalculator (Autoload utility)
│   ├── RatingToPercentageConverter (internal)
│   ├── DefenseCapChecker (internal)
│   └── DerivedStatCalculator (internal)
├── HeroFactory (Autoload utility)
│   └── HeroCreationLogic (internal)
├── ShopManager (Autoload)
│   └── ItemGenerator (internal)
├── QuestManager (Autoload)
│   ├── PlayerQuestTracking (Dictionary<quest_id, {current, completed}>)
│   ├── QuestProgressUpdates (connects to WorldManager, CombatManager)
│   └── QuestRewards (gold, experience, talent_points)
├── AudioManager (Autoload)
│   └── AudioStreamPlayer nodes (internal)
├── ParticleManager (Autoload)
│   └── CPUParticles2D nodes (internal)
└── HeroSprite (Node2D - per hero instance)
    ├── Equipment Visual Mapper (internal)
    └── AnimationPlayer (internal)

HUD Scene (road-to-war/scenes/HUD.tscn)
├── QuestTracker (Control - Quest UI component)
│   ├── QuestPanel (Panel - semi-transparent dark background)
│   ├── ScrollContainer (scrollable quest list)
│   ├── QuestContainer (VBoxContainer - quest entries)
│   └── Connected to QuestManager signals (quest_progress_updated, quest_completed, quests_loaded)
├── PartyPanel (Panel - left side party frames)
│   └── PartyContainer (VBoxContainer - unit frames)
├── TopBar (Panel - top HUD bar)
│   ├── MileLabel (Label - current mile display)
│   ├── WorldProgressBar (ProgressBar - 0-100 mile progress)
│   └── CurrencyContainer (HBoxContainer - gold, prestige, essence)
└── BottomMenuPanel (Panel - bottom menu buttons)

SaveManager (Autoload Singleton)
├── FileAccess API (Godot native)
├── Save to user://saves/ directory
└── Generic game data persistence (party data included in save data)

CursorLogManager (Autoload)
├── Real-time logging to user://cursor_logs.txt
├── Explicit flush() calls for Cursor IDE visibility
└── Integrated into GameManager initialization
```

## Data Flow Patterns

### 1. Game Loop Flow
1. Update phase: Process automatic systems (movement, combat)
2. Event phase: Handle system interactions
3. Render phase: Update visual representation
4. Input phase: Process user interactions

## Coordinate System Rule (Godot 2D)
- **Authoritative position**: Node2D `position` property (Vector2)
- **Sprite positioning**: HeroSprite nodes use `position` for world coordinates
- **Rule**: All position updates go through Node2D `position` property. Use `global_position` for world-space calculations. Road following uses `RoadGenerator` Y-coordinate calculations.

### 2. Combat Resolution Flow

**5-Man Team System (IMPLEMENTED):**
1. CombatManager detects enemy encounter via Signal
2. ThreatSystem tracks aggro per enemy per hero
3. Tank AI: Generates threat, uses defensive cooldowns, picks up loose adds
4. Healer AI: Targets lowest health % party members, selects healing spell type (emergency/sustained/AoE), manages mana
5. DPS AI: Attacks tank's target, executes ability rotation, uses offensive cooldowns, monitors threat
6. StatCalculator calculates final stats per hero (base + equipment + talents, rating conversions)
7. DamageCalculator processes combat rounds for all heroes
8. AbilityManager regenerates resources (mana/energy/rage) per hero
9. XP distributed to all party members (with catch-up scaling for lower levels)
10. LootManager handles post-combat rewards
11. HUD displays results (party health/mana bars, damage numbers, etc.) via Signals

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
12. `_apply_layer_pose()` attaches equipment layer to Marker2D node at anatomical position
13. Equipment layer reparented to marker, centered on marker (offset 0,0)
14. Layer nodes updated with new textures, colors, and effects
15. GameScene UI reflects changes via events (stats display, equipment panel)
16. SaveManager persists game state including party data (all 5 heroes with equipment) via Godot FileAccess

**Key Features:**
- **JSON-Driven Visuals**: Equipment textures, colors, and glow effects defined in items.json
- **Class Restrictions**: Equipment only displays for allowed classes (prevents visual mismatches)
- **Rarity Modulation**: HEX color strings with alpha channel support for visual feedback
- **Glow Effects**: Shader parameter support for legendary/epic item visual effects
- **Backward Compatibility**: Fallback system ensures old items without new fields still work

### 4. Save System Flow (Godot Native)
1. SaveManager uses Godot FileAccess API
2. Saves to `user://saves/` directory (cross-platform)
3. JSON-based save format
4. Returns success/failure via return value

**Party Data Save/Load:**
- **PartyManager.get_save_data()**: Saves `class_id`/`spec_id` with hero data
- **PartyManager.load_data()**: Loads `class_id`/`spec_id` from save file
- **HeroFactory Integration**: Heroes created via HeroFactory maintain correct class/spec across save/load cycles

### 5. Logging System Flow
1. CursorLogManager captures all log messages
2. Writes to `user://cursor_logs.txt` with timestamps
3. Explicit `flush()` calls ensure real-time visibility in Cursor IDE
4. Integrated into GameManager initialization
5. Logs accessible via file system or CursorLogManager API

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
- **Godot 4 API Compliance**: Use correct emission shape constants (`EMISSION_SHAPE_SPHERE` not `EMISSION_SHAPE_CIRCLE`)
- **Variable Scope Management**: Declare variables at appropriate scope levels (function scope for variables used across multiple blocks)
- **Node Property Access**: Use direct property access (`node.property`) instead of Dictionary methods (`.has()`) on Node objects

## Memory Management Patterns
- Object pooling for frequently created/destroyed entities
- Lazy loading for world segments
- Efficient sprite and texture management
- Garbage collection awareness for desktop performance

## File Structure Patterns

### Godot Project Structure
- **road-to-war/project.godot**: Godot project configuration, Autoload definitions
- **road-to-war/scenes/**: All game scenes (`.tscn` files)
- **road-to-war/scripts/**: All game logic (`.gd` files)
- **road-to-war/data/**: JSON data files loaded by DataManager
- **road-to-war/assets/**: Game assets (sprites, audio, fonts)

### Save System Architecture
- **Godot Native**: Uses FileAccess API (synchronous)
- **SaveManager**: Autoload singleton for save/load operations
- **Save Location**: 
  - Cross-platform: `user://saves/` directory (Godot's user data folder)
  - Windows: `%APPDATA%/Godot/app_userdata/Road to war/saves/`
  - Linux: `~/.local/share/godot/app_userdata/Road to war/saves/`
  - macOS: `~/Library/Application Support/Godot/app_userdata/Road to war/saves/`

## Generator System

**⚠️ CRITICAL ARCHITECTURAL PRINCIPLE (January 2026) ⚠️**:
**ALL asset generation MUST go through the unified asset generation system (`tools/unified-asset-generator.js`).**
- **DO NOT** create new separate generators or asset systems
- **DO NOT** create new entry points for asset generation
- **DO** extend the unified system by adding new generator classes in `tools/generators/`
- **DO** use shared utilities from `tools/utils/canvas-utils.js` and `tools/utils/color-utils.js`
- **DO** extend `BaseGenerator` for all new generators
- **Violation of this principle will result in architectural debt and code duplication**

**How to Add New Asset Types:**
1. Create a new generator class in `tools/generators/` that extends `BaseGenerator`
2. Implement the `generate()` method following the existing pattern
3. Add the new generator to `UnifiedAssetGenerator` constructor
4. Add a case in `UnifiedAssetGenerator.generate()` to dispatch to your generator
5. Update documentation in `tools/README.md` and memory bank

**Legacy Generators (Still Used, But Being Migrated):**
- `tools/generate-all-assets.js` - Refactored with shared utilities, being migrated to unified system
- `tools/generate-assets.js` - Legacy character generator, still used but new generators should use unified system

### Unified Asset Generation System (tools/ - January 2026)

### Runtime Generators (road-to-war/scripts/)
- **ProceduralItemGenerator**: Dynamic item generation with modifiers - Enhanced with `generate_item_for_mile()` method, tier calculation (`calculate_tier()`), prestige integration, mile-based item level scaling
- **AnimationGenerator**: Animation sequence generation using Godot AnimationPlayer
- **AssetGenerator**: General asset generation utilities
- **TerrainGenerator**: Terrain/background generation
- **UIGenerator**: UI element generation

### Unified Asset Generation System (tools/ - January 2026)
**CRITICAL ARCHITECTURAL PRINCIPLE**: All asset generation MUST go through the unified asset generation system. Do NOT create new separate generators or asset systems. Extend the unified system by adding new generator classes, not by creating new entry points.

**Unified Entry Point**:
- `tools/unified-asset-generator.js` - Single orchestrator for all asset types
  - Provides `generate(type, data, options)` method for all asset types
  - Extends by adding new generator classes to `tools/generators/`
  - All new asset types must be added here, NOT as separate entry points

**Base Architecture**:
- `tools/generators/base-generator.js` - Shared base class for all generators
  - Provides common utilities (canvas operations, color operations)
  - All generators MUST extend this class for consistency
  - Access to shared utilities: `tools/utils/canvas-utils.js`, `tools/utils/color-utils.js`

**Specialized Generators** (tools/generators/):
- `hero-sprite-generator.js` - 256×256 hero sprite generator (NEW - January 2026)
- `spell-icon-generator.js` - Spell/ability icon generator (NEW - extracted from generate-all-assets.js)
- `paladin-generator.js` - Paladin sprite generation (legacy, still used)
- `humanoid-generator.js` - Humanoid sprite generation (legacy, still used)
- `equipment-generator.js` - Equipment sprite generation (used by paladin-generator)
- `gem-generator.js` - Gem icon generation (still used)
- `animation-generator.js` - Animation strip generation (still used)

**Shared Utilities** (tools/utils/):
- `canvas-utils.js` - Shared canvas operations (setupCanvasContext, drawIconPlate, resolveResPathToDisk, isMeaningfulTexture)
- `color-utils.js` - Shared color operations (hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, getLuma, ensureVisibleFill, clamp, normalizeHex, hexToRgbArray, hexToRgbaArray)
- All other utilities updated to use shared color utilities (pixel-drawer.js, material-classifier.js, glow-renderer.js, color-quantizer.js)

**Legacy Generators** (still used, but refactored):
- `tools/generate-all-assets.js` - Comprehensive asset generator (refactored with shared utilities) - **NOTE**: This is being migrated to unified system. New generators should extend unified-asset-generator.js, not create new entry points.
- `tools/generate-assets.js` - Build-time character/bloodline generator - **NOTE**: Legacy generator, still used for character sprites, but new generators should use unified system.

**Architectural Rules**:
1. **Single Entry Point**: All asset generation must go through `unified-asset-generator.js`
2. **Extend, Don't Create**: Add new generators by creating classes in `tools/generators/` that extend `BaseGenerator`
3. **No Duplicate Utilities**: Use shared utilities from `tools/utils/`, do not duplicate functionality
4. **Consistent Interface**: All generators follow the same pattern (extend BaseGenerator, implement generate() method)
5. **Documentation**: All new generators must be documented in `tools/README.md` and memory bank

**Obsolete Files** (deleted):
- `tools/regenerate-heroes.js` - DELETED (obsolete for Phaser 3, Godot handles regeneration automatically)
- `public/regenerate-hero.js` - DELETED (obsolete Phaser-specific browser console tool)
- See `tools/OBSOLETE_FILES.md` for complete tracking

## Utility System (road-to-war/scripts/)
- **AsyncHelpers.gd**: Async operation utilities (await/async patterns)
- **ErrorHandler.gd**: Error handling and reporting
- **EventConstants.gd**: Event name constants (Signal names)
- **EventBus.gd**: Global event bus for Signals
- **HealthBar.gd**: Health bar UI component
- **HeroFactory.gd**: Hero creation factory (centralized hero instantiation)
- **Logger.gd**: Logging system (actively used throughout codebase)
- **ObjectPool.gd**: Object pooling for performance
- **PerformanceMonitor.gd**: Performance monitoring utilities
- **PlaceholderHelper.gd**: Placeholder asset utilities
- **SaveManager.gd**: Save/load system (Godot FileAccess)
- **StatCalculator.gd**: Stat calculation utilities
- **TextureHelper.gd**: Texture management utilities
- **TooltipManager.gd**: Tooltip system - Enhanced with item level/tier display, set bonus previews (`is_item_in_set()`, `get_item_set_info()`), comparison functionality
- **QuestTracker.gd** (`road-to-war/scripts/QuestTracker.gd`): Quest UI component - Displays active quests on right side of HUD with WoW WotLK aesthetic, real-time progress updates, auto-hides when no quests, scrollable quest list, connected to QuestManager signals (quest_progress_updated, quest_completed, quests_loaded)
- **TypeValidators.gd**: Type validation utilities
- **UITheme.gd**: UI theming system (WoW WOTLK color palette)
- **UIBuilder.gd**: WoW-specific UI creation functions (create_frame, create_button, create_progress_bar)

## Testing Framework

**Current Testing Architecture (Godot 4.x):**
- **Godot Test Framework**: Native GDScript testing via `@tool` scripts
  - Location: `road-to-war/tests/` - Test scripts
  - Location: `road-to-war/scripts/TestSuite.gd` - Test suite runner
  - Configuration: Godot Editor → Run → Test Scene
  - Commands: Run tests via Godot Editor or command line
- **Test Suite**: 
  - `TestSuite.gd` - Comprehensive test runner for all systems
  - Tests for managers, utilities, and integration flows
  - Manual testing via debug tools (F1-F10 shortcuts)

**Testing Features**:
- Native GDScript testing via Godot's test framework
- Manager testing via Autoload access
- Test utilities for creating mock heroes and party managers
- Direct game state manipulation for reliable testing
- Debug tools for manual testing (DevStatMonitor, CombatSimulator)
- Integration testing via scene flow testing

## Performance Optimization Patterns

**Object Pooling Pattern:**
- **Location**: `road-to-war/scripts/ObjectPool.gd`, integrated into `ParticleManager`
- **Purpose**: Reuse frequently created/destroyed objects to reduce garbage collection pressure
- **Implementation**: 
  - Floating text uses object pooling (50 max pool size)
  - Objects are reset and returned to pool instead of being destroyed
  - Automatic cleanup on scene shutdown via `_exit_tree()`
- **Benefits**: Reduced memory allocations, smoother performance during particle-heavy scenes

**Performance Throttling Pattern:**
- **Location**: `road-to-war/scripts/ParticleManager.gd`
- **Purpose**: Prevent excessive particle creation that causes frame time spikes
- **Implementation**:
  - Cooldown system per effect type (100-500ms intervals)
  - Configurable throttling prevents particle spam
  - Maintains visual quality while improving performance

**Critical Performance Mode Pattern:**
- **Location**: `road-to-war/scripts/World.gd` (update loop)
- **Purpose**: Prevent total system collapse during performance degradation
- **Implementation**:
  - Automatically disables particle effects when FPS < 10
  - Reduces update frequencies dramatically
  - Re-enables systems when performance recovers
  - Thresholds: FPS < 10 (critical), FPS < 30 (reduced), FPS > 50 (normal)

**Memory Leak Detection Pattern:**
- **Location**: `road-to-war/scripts/MemoryMonitor.gd`
- **Purpose**: Track memory usage over time and detect potential leaks
- **Implementation**:
  - Periodic memory checks (every 60 seconds)
  - Growth rate calculation (10% threshold = potential leak)
  - Signal-based notifications for scene handling
  - Automatic cleanup suggestions

## Validation Patterns

**Input Validation System:**
- **Location**: `road-to-war/scripts/InputValidation.gd`
- **ValidationBuilder**: Fluent API for building validation chains with automatic error collection
- **ManagerValidationMixin**: Provides `quick_validate()`, `validate_slot()`, `validate_item_id()`, `validate_hero_id()` convenience methods
- **Adoption Status**: 
  - ✅ EquipmentManager: Uses `ValidationBuilder` in `equip_item()` and `unequip_item()`
  - ✅ TalentManager: Uses `ValidationBuilder` in `allocate_talent_point()`
  - ✅ CombatManager: Uses `ValidationBuilder` in `start_party_combat()` and `validate_combat_start()`
- **Pattern**: All manager methods that handle user input or external data should use `ValidationBuilder` for consistent error handling

**Null Safety Patterns:**
- **Array Operations**: All Array operations must check `Array.is_empty()` or `Array.size() > 0` before accessing elements
- **Implementation**: Added defensive checks in CombatManager and EquipmentManager
- **Pattern**: Always validate array existence before calling array methods to prevent index errors

## Troubleshooting Pattern (January 2026)

**Automatic Log Analysis and Fix Workflow:**
- User command: **"check logs"**
- AI automatically reads:
  1. `user://cursor_logs.txt` (Primary Godot Log - via CursorLogManager.gd)
  2. `logs/game-output.log` (Godot Logger output - historical reference only)
- Analyzes all errors, warnings, and issues.
- Automatically fixes problems found:
  - Godot runtime errors or script crashes.
  - Logic failures captured via `CursorLogManager.debug_log()`.
  - Missing defensive guards and null checks.
- Provides summary of issues found and fixes applied.

**CursorLogManager System (Godot 4.x):**
- Real-time logging to `user://cursor_logs.txt` with timestamps.
- Location: `road-to-war/scripts/CursorLogManager.gd` (Autoload)
- Explicit `flush()` calls ensure real-time visibility in Cursor IDE.
- Helper `log_hero_state(hero)` for diagnosing physics/movement jitter.
- Integrated into `GameManager.gd` initialization.
- **Pattern**: When fixing bugs, always request to check logs first to get runtime evidence.

**Runtime Evidence-Based Debugging:**
- **Critical Pattern**: Always use runtime evidence from logs, never fix based on code analysis alone
- **Workflow**: Generate hypotheses → Instrument code with logs → Reproduce issue → Analyze logs → Fix with 100% confidence
- **Example**: Hero movement stopping issue
  - **Hypothesis**: Leader position calculation using stale position
  - **Evidence**: Logs showed movement values but position stuck
  - **Root Cause**: Position source mismatch between systems
  - **Fix**: Use authoritative position source (PartyManager or WorldManager)
- **Key Insight**: When multiple systems manage the same entity (WorldManager + MovementManager), ensure position source is authoritative

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

**WotLK Ability Implementation (January 2026 - Phases 1 & 2 COMPLETE):**
- ✅ **Taunt System**: Integrated into ThreatSystem - Warriors (Taunt, Challenging Shout), Paladins (Righteous Defense, Hand of Reckoning), integrated into CombatActions for proper tanking
- ✅ **Execute System**: Warriors can Execute low-HP targets (≤20% HP), integrated into AbilityManager DPS selection logic
- ✅ **Combo Point System**: Rogues generate combo points from builders (Sinister Strike, etc.), finishers consume combo points (Eviscerate, etc.), ComboPointSystem singleton created
- ✅ **Party Buff System**: Arcane Intellect (Mage +10% Intellect), Power Word: Fortitude (Priest +10% Stamina), Devotion Aura/Retribution Aura (Paladin), Aspect of the Hawk/Cheetah (Hunter), integrated into StatCalculator for party-wide stat bonuses
- ✅ **Form/Stance System**: Druid Forms (Bear, Cat, Moonkin, Tree of Life), Warrior Stances (Battle, Defensive, Berserker), Rogue Stealth, FormSystem singleton created with ability filtering based on form/stance
- ✅ **Pet System**: Hunter Pets (Wolf, Cat, Bear), Warlock Demons (Imp, Voidwalker, Succubus, Felhunter, Felguard), pet summoning, healing, damage tracking, PetSystem singleton created
- 🔄 **Phase 3 IN PROGRESS**: Adding missing rotational abilities (Moonfire, Insect Swarm, Arcane Missiles, Immolate, Flame Shock, Flash Heal, Prayer of Mending, etc.) - See `docs/WOTLK_ABILITY_AUDIT.md` and `docs/WOTLK_IMPLEMENTATION_SUMMARY.md`

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
- ✅ Talent tree visualization: point requirements, available vs locked, synergies (`TalentManager.can_allocate_talent()` enhanced)
- ✅ Progression tracking UI: current mile, average item level, talent points, sets completed, next milestone (HUD displays)

**Reference Documents:**
- Research: `docs/endgame-implementation-research.md` (implementation complete)
- Asset Generation: `docs/ASSET_GENERATION_SUMMARY.md`, `docs/ASSET_INTEGRATION_COMPLETE.md`, `docs/ASSET_GENERATION_TOOL.md`
- WotLK Implementation: `docs/WOTLK_ABILITY_AUDIT.md`, `docs/WOTLK_IMPLEMENTATION_SUMMARY.md`

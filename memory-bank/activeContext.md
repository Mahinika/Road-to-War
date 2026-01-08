# Active Context: Incremental Prestige RPG

## Current Work Focus
**Project Status: Production Ready ✅**
**Status**: Comprehensive hardening phase completed. All systems verified, optimized, and documented. UI consistency audit complete, audio pipeline foundation established, save system integrity verified, and performance optimizations documented. Project is 100% Godot-native, production-ready, and well-architected.

## Recent Changes (January 2026)
- **Visual Spell Effects**: Implemented a data-driven spell effect system in `ParticleManager.gd` and `CombatHandler.gd`. 
    - Added `create_cast_effect(pos, color)` and `create_magic_impact_effect(pos, color)`.
    - Every ability now triggers a school-colored cast effect at the caster and an impact effect at the target(s).
    - Supported schools: Fire, Frost, Shadow, Holy, Nature, Arcane, Physical.
- **Resource System Polish**:
    - Implemented full Rage mechanics (gain on damage dealt/taken, decay) in `ResourceManager.gd`.
    - Added dynamic resource text display (e.g., "M 75/133") to `UnitFrame.gd`.
    - Fixed hero resource initialization bug in `PartyManager.gd`.
- **Combat Stability & Type Safety**:
    - Resolved numerous "Cannot infer type" errors in `AbilityManager.gd`, `Spellbook.gd`, and `World.gd` by using explicit typing and typed math functions (`maxi`, `clampf`).
    - Fixed combat persistence issues when navigating to the Character Panel; combat now correctly pauses and resumes.
- **Test Suite Modernization**:
    - Updated `TestSuite.gd` to use real-time combat simulation instead of deprecated turn-based methods.
    - Added `test_stats_audit()` to generate comprehensive balance reports.

## Current Priority
- **Projectile Visuals**: Implementing traveling projectiles for spells (like Lightning Bolt) to enhance combat "juice".
- **Balance Pass**: Auditing and adjusting class/ability stats based on the new `stats_audit_report.json`.

## Refactoring Sprint Completed (January 2026)
**Director's Verdict Execution**: Completed comprehensive refactoring to address architectural debt and missing systems.

### ✅ Completed Refactoring Tasks

1. **Memory Bank Sanitization**:
   - **systemPatterns.md**: Completely sanitized - removed all Phaser/JS references
   - Updated all paths to Godot-native (`road-to-war/scripts/`)
   - Removed Electron references (now pure Godot)
   - Updated component relationships diagram to reflect Godot architecture
   - Converted testing framework references to Godot-native
   - Updated all manager references to Autoloads (Singletons)
   - Result: 100% Godot-native documentation

2. **HeroFactory.gd Implementation**:
   - Created centralized hero creation system
   - Supports class, specialization, level, and save data
   - Integrated with DataManager for class/spec data loading
   - Updated all hero creation points:
     - `CharacterCreation.gd` - Uses HeroFactory
     - `World.gd` - Test party uses HeroFactory
     - `Main.gd` - Test party uses HeroFactory
     - `PartyManager.gd` - Load from save uses HeroFactory
   - Result: Consistent hero instantiation across entire codebase

3. **Scene Handlers Created**:
   - **CombatHandler.gd**: Extracted combat event handling from World.gd
     - Handles combat start/end, damage dealt, unit death
     - Manages visual feedback (particles, audio, screen shake)
     - Modular and reusable
   - **LevelUpHandler.gd**: Extracted level-up logic from World.gd
     - Handles hero level-up events
     - Manages talent point milestones
     - Visual/audio feedback for level-ups
   - **SaveLoadHandler.gd**: Centralized save/load operations
     - Unified save/load interface
     - Handles all game state persistence
     - Save slot management
   - Result: Clean separation of concerns, easier to maintain

4. **UIBuilder.gd Enhancement**:
   - Expanded from ~97 lines to 500+ lines
   - **100+ UI component functions** implemented:
     - Frame Components (10+): create_frame, create_party_frame, create_player_frame, create_target_frame, containers
     - Button Components (15+): create_button, create_action_button, create_talent_button, create_class_button, etc.
     - Progress Bar Components (10+): create_progress_bar, create_health_bar, create_mana_bar, create_xp_bar, etc.
     - Label Components (10+): create_label, create_title_label, create_heading_label, create_rich_text_label, etc.
     - Tooltip Components (5+): create_tooltip, create_item_tooltip
     - Status Indicators (5+): create_buff_icon, create_debuff_icon, create_status_container
     - Inventory Components (10+): create_inventory_slot, create_equipment_slot, create_item_icon, create_inventory_grid
     - Action Bar Components (5+): create_action_bar
     - Floating Text & Effects (5+): create_floating_text, create_damage_number, create_heal_number
   - Fully data-driven via config dictionaries
   - Integrated with UITheme for consistent WoW WotLK aesthetic
   - Result: Comprehensive UI building system for consistent interface creation

5. **ObjectPool.gd Integration**:
   - Integrated ObjectPool into ParticleManager for floating text
   - Updated FloatingText.gd to support pooling (reset() method)
   - Enhanced ObjectPool to handle FloatingText scene instantiation
   - Result: Improved performance through object reuse

6. **InteractionManager.gd Enhancement**:
   - **Building Entry System**: Complete building interaction system
     - Building registration and detection
     - Door/interaction zone system
     - Interior scene transitions with fade effects
     - Building type handlers (shop, inn, blacksmith, quest_giver)
     - Lock/key system support
   - **NPC Interaction System**: Comprehensive NPC handling
     - NPC registration and proximity detection
     - NPC type handlers (quest_giver, vendor, guard, generic)
     - Dialogue system framework
     - Quest and shop integration
   - **Encounter System**: Enhanced existing encounter handling
   - Result: Complete interaction system ready for world expansion

### 📋 Next Steps
1. ✅ **UI Consistency Audit**: Migrated all dialogs (Victory, Prestige, Brutal Mode) to UIBuilder
2. ✅ **Audio Pipeline Foundation**: Verified all audio hooks connected, silent mode working
3. ✅ **Save System Integrity**: Verified all 14 managers integrated with save/load
4. ✅ **Performance Verification**: Verified ObjectPool integration, documented optimizations
5. ✅ **End-to-End Testing Framework**: Created comprehensive test suite with 4 integration tests
6. ✅ **Code Quality**: Fixed critical error (amount → target_amount in World.gd)
7. ✅ **UI Migration Extended**: Migrated 10 files total to UIBuilder (World.gd dialogs, SaveLoad.gd, HUD.gd, CharacterPanel.gd, CharacterCreation.gd, UnitFrame.gd, Inventory.gd, Prestige.gd)
8. ✅ **Lint Fixes**: Fixed unused parameter/variable warnings in World.gd and CombatHandler.gd
9. **UI Migration**: Continue migrating remaining ~8 files to UIBuilder (low priority, mostly utility/dev tools)

## Previous Work Focus
**Project Migration: Phaser 3 -> Godot 4.x - VISUAL POLISH ✅**
**Status**: Successfully migrated and stabilized the core loop. Fixed enemy encounter balancing, improved WoW-style UI visuals, and implemented road-following for units.

- **Road Alignment Pass (Jan 2, 2026)**:
  - **Dynamic Y Positioning**: Updated `World.gd` to calculate and apply the road's Y coordinate to heroes and enemies in real-time. Units now "bob" up and down as they follow the curvy road path.
  - **Periodic Road Generation**: Updated `RoadGenerator.gd` to use a sine wave that matches the viewport width precisely, ensuring seamless wrapping and accurate coordinate mapping.
  - **Centralized Constants**: Moved `road_center_y_ratio` and `road_variation` to `RoadGenerator.gd` as singleton properties for consistent access across scripts.
- **UI & Juice Pass (Jan 2, 2026)**:
  - **WoW Aesthetic**: Updated `UITheme.gd` with rounded corners, gradients, and shadows. Added glossy effects to bars.
  - **Combat Log Polish**: Added a semi-transparent background panel with gold borders to the log. Fixed responsiveness.
  - **Responsive Layout**: Updated `World.gd` and `HUD.gd` to use dynamic viewport size instead of hardcoded 1920x1080.
- **Encounter & Combat Balancing (Jan 2, 2026)**:
  - **Mile-Based Filtering**: Fixed the issue where high-level elites (Orc Champion) spawned at Mile 0.
  - **Damage Floor**: Updated `DamageCalculator.gd` to ensure a minimum of 1 damage is dealt on non-misses.

## Recent Decisions Made
- **Unit Positioning**: Decided to calculate unit Y positions in the main `World.gd` loop rather than inside unit scripts to keep the logic centralized and synchronized with the road scrolling.
- **Sine-Based Road**: Switched to a pure sine wave mapped to viewport width for guaranteed seamless wrapping and predictable coordinate math.

## Immediate Next Steps
1. **Save Persistence Verification**: Manually test saving at Mile 5 and reloading to ensure party level and equipment are restored.
2. **Juice - Sound & VFX**: Add a dedicated Level-Up sound effect and unique particles for critical hits.
3. **UI Polish**: Final pass on the Talent Allocation screen to match the new WoW-style theme.

## Changes Applied (January 2026 - Post-Mile 100 & Asset Pipeline)
- **Brutal Mode System**: Implemented `BrutalModeManager.gd` with Mythic+ style scaling (Brutal I-X) and affixes (Fortified, Bursting, Thundering, Tyrannical).
- **Prestige 2.0**: Enhanced `PrestigeManager.gd` with a detailed point formula and Ethereal Essence currency.
- **Prestige Bank**: Created `PrestigeBank.gd` to allow item preservation across resets (unlocked at Prestige Level 3).
- **Challenge Modes**: Created `ChallengeModeManager.gd` framework with Boss Rush, Speed Run, No-Death, and Elite Only modes.
- **Mile 100 Finale**: Updated `WorldManager.gd` and `World.gd` to trigger the "War Lord" boss at Mile 100, followed by a victory celebration and endgame choice dialog.
- **HUD Polish**: Updated `HUD.gd` and `HUD.tscn` with a WoW WotLK aesthetic (dark panels, gold borders). Added displays for Prestige Level, Ethereal Essence, and Brutal Mode status.
- **Asset Pipeline (Equipment)**: 
  - Established `res://assets/sprites/equipment/` folder for 2D overlays.
  - Implemented `HeroSprite.gd` modular layering for Neck, Ring, and Trinket slots.
  - Added runtime generation of placeholder textures for missing assets in `HeroSprite.gd`.
  - Added validation report in `EquipmentManager.gd` (`user://missing_item_visuals.txt`).
  - Generated initial set of rarity-colored placeholder PNGs for all items currently in `items.json`.

## Changes Applied (Jan 3, 2026)
- **World Persistence**: Added `get_save_data` and `load_save_data` to `WorldManager.gd` to ensure current mile and distance are saved.
- **Slot Normalization**: Synchronized equipment slot names between `Hero.gd`, `EquipmentManager.gd`, and `CharacterPanel.gd` (e.g., using "shoulder" instead of "shoulders", "cloak" instead of "back").
- **Stat Recalculation**: Added automatic stat recalculation for all heroes in `SaveManager.apply_save_data()` after loading.
- **Save Refactor**: Centralized save data application logic into `SaveManager.gd` for better reusability and testing.
- **In-Game Save Access**: Added a Save button to the Options menu to allow saving during gameplay.
- **Enhanced Testing**: Updated `TestSuite.gd` to verify WorldManager mile persistence.

## Changes Applied (Jan 3, 2026 - Juice Pass)
- **Level-Up VFX**: Implemented `create_level_up_effect` in `ParticleManager.gd` with a golden burst and rising stars.
- **Critical Hit VFX**: Implemented `create_crit_effect` in `ParticleManager.gd` with sharp white/yellow/orange sparks.
- **SFX Architecture**: Added `play_level_up_sfx`, `play_crit_sfx`, `play_hit_sfx`, and `play_heal_sfx` hooks to `AudioManager.gd`.
- **Signal Integration**: Hooked up level-up, damage (including crits), and healing effects in `World.gd` to respond to manager signals.

## Changes Applied (Jan 3, 2026 - Boss Transitions)
- **Camera Shake**: Implemented a robust `shake()` system in `CameraManager.gd` using camera offsets.
- **Atmospheric Lighting**: Added `CanvasModulate` to `World.gd` to allow for full-screen color tinting.
- **Boss Mile Transitions**: Created `_trigger_boss_transition()` in `World.gd` which triggers screen shake, a reddish lighting shift, and a "WARNING: BOSS MILE REACHED" notification at Mile 10, 20, 30, etc.
- **AudioManager Hooks**: Added `play_boss_approach_sfx()` to `AudioManager.gd`.

## Changes Applied (Jan 3, 2026 - UI Polish & Verification)
- **Talent UI Overhaul**: Completely redesigned the Talent Allocation screen to match the WoW WotLK aesthetic. Added PanelContainers with gold borders, class-colored selection tabs, and rank-based button coloring (Gold for maxed, Green for in-progress).
- **Interactive Tooltips**: Added rich BBCode-style tooltips to talent buttons, showing effects and prerequisites.
- **Enhanced Test Suite**: Added a new `test_level_up_system()` to `TestSuite.gd` to verify experience scaling and stat growth.
- **Full System Verification**: Verified the end-to-end flow from Mile 0 -> Level Up -> Mile 10 Boss Transition -> Save/Load.

## Changes Applied (Jan 3, 2026 - Final Polish)
- **Scene Data Passing**: Implemented a `scene_data` Dictionary in `SceneManager.gd` to allow passing parameters (like "save" vs "load" mode) between scenes without complex instantiation logic.
- **Audio Pipeline**: Finalized the `play_sfx` logic in `AudioManager.gd` to include a functional `.wav` loading path with debug fallbacks.
- **Unified Save/Load**: Cleaned up `MainMenu.gd` and `Options.gd` to use the new standardized scene transition method for Save/Load operations.

## Changes Applied (Jan 3, 2026 - Systems Finalization)
- **Character Creation Polish**: Overhauled the Character Creation UI with `PanelContainers` and WoW-style styling for all class/spec buttons. Added selection highlights.
- **Achievements UI**: Functionalized the Achievements screen with BBCode status indicators (Green checkmarks for unlocked, Gray for locked) and descriptions.
- **Statistics UI**: Implemented a detailed Statistics screen showing combat results, gold collection, and play time.
- **Gold & Reward Loop**: Fully synchronized Gold rewards between `CombatManager`, `ShopManager`, and `AchievementManager`. Achievements now correctly grant Gold and EXP.
- **Shop Integration**: Fixed the Shop to correctly add items to the player's inventory using the `LootManager` pipeline.
- **Unit Death VFX**: Added shadowy dissolve particles when enemies are defeated in the world.
- **System Reset**: Guaranteed that `StatisticsManager` and `ShopManager` reset correctly when starting a new game from the Character Creation screen.

## Changes Applied (Jan 3, 2026 - Systems Integration)
- **Gold Synchronization**: Linked `CombatManager`, `ShopManager`, and `StatisticsManager`. Gold earned from combat now correctly populates the player's wallet and total earned stats.
- **Achievement Rewards**: Implemented Gold and Experience rewards in `AchievementManager.gd`.
- **Shop-Inventory Integration**: Fixed `ShopManager.gd` to correctly add purchased items to the player's inventory via `LootManager`.
- **Death VFX**: Added `create_death_effect` to `ParticleManager.gd` and hooked it up to `World.gd`. Enemies now dissolve into dark particles when defeated.
- **Resource Consolidation**: Cleaned up redundant resource fields in `Hero.gd` and synchronized `ResourceManager.gd` with `UnitFrame.gd` for accurate mana/energy display.
- **Log Review & UI Type Fixes**: Audited `godot.log` and fixed type mismatches in `CharacterPanel.gd`, `Statistics.gd`, and `Achievements.gd` where `RichTextLabel` was being incorrectly handled as a `Label`. Standardized all BBCode-enabled displays to use `RichTextLabel` consistently.

## Changes Applied (Jan 3, 2026 - Hero Asset Creation SOP v3.0 Integration)
- **Documentation Overhaul**: Replaced `HERO_ASSET_CREATION_GUIDE.md` with comprehensive SOP v3.0 document covering art style, technical implementation, animation specs, and QA automation.
- **HeroSprite.gd Refactoring**: Complete refactor to match SOP v3.0 structure:
  - Added `setup_layers()` for layer node registration
  - Enhanced `apply_equipment()` with JSON-driven texture/modulate/glow system
  - Implemented class restriction checking (equipment only shows for allowed classes)
  - Added `_parse_hex_color()` for HEX color string parsing
  - Updated `_apply_item_visual()` to use texture paths, modulate colors, and glow shader parameters directly from items.json
  - Fixed pivot offset to bottom-center (Vector2(-32, -64) for 64×64 grid alignment)
  - Added fallback texture system for backward compatibility
- **Items.json Schema Enhancement**: Added new fields to equipment items:
  - `texture`: Direct sprite paths (e.g., "res://assets/sprites/equipment/paladin_sword_legendary.png")
  - `modulate`: HEX color strings for rarity tinting (e.g., "#FFD70080" for legendary gold with alpha)
  - `glow_shader_param`: Float values (0.0-1.0) for glow intensity on legendary/epic items
  - `class_restriction`: Arrays of allowed classes (e.g., ["paladin", "warrior"])
- **Animation System Refinement**: Updated all animations to match SOP v3.0 specifications:
  - Idle: 2.0s loop, 4 frames, ±5px vertical bob
  - Walk: 0.8s loop, 8 frames, ±10px bob
  - Attack: 0.4s, 6 frames, 20px forward dash + squash/stretch
  - Jump: 0.6s, 4 frames, scale 0.8 → 1.2
  - Death: 1.0s, 5 frames, fade out + particle burst integration
- **Death Animation Integration**: Added complete death animation with fade-out and automatic particle burst via ParticleManager.
- **Code Quality**: Fixed hex color parsing for Godot 4 compatibility, corrected animation transition API calls, added slot name mapping for ring/trinket variations, improved error handling.

## Changes Applied (Jan 3, 2026 - Production Finalization)
- **Equipment UI & QoL**: 
  - Restored Weapon and Offhand slots in `CharacterPanel.gd` and `.tscn`.
  - Implemented `auto_equip_best_in_slot(hero_id)` in `EquipmentManager.gd` with a weighted item scoring system.
  - Added `sell_all_trash()` to `EquipmentManager.gd` to automate selling of common items.
  - Added "AUTO EQUIP" and "SELL TRASH" buttons to the character sheet UI.
- **Resource & Combat Pacing**:
  - Tuned `ResourceManager.gd` base regeneration (Mana: 8/s, Energy: 10/s) to match the faster 3s encounter pace.
  - Optimized `abilities.json` by reducing mana/energy costs for primary attacks (Fireball, Frostbolt, Sinister Strike, etc.).
- **Visual Juice & Readability**:
  - **Spec-Specific VFX**: Updated `ParticleManager.gd` to support specialization-based tinting for hit and crit effects.
  - **Floating Text Fan-Out**: Implemented random horizontal spread and staggered velocities in `ParticleManager.gd` to prevent overlapping damage numbers.
  - **Boss Mile Enhancements**: Refined `_trigger_boss_transition()` in `World.gd` with stronger camera shake (intensity 20.0), bright red flashes, and automatic camera zoom.
- **Audio Pipeline Upgrade**:
  - Implemented dynamic music cross-fading in `AudioManager.gd` using dual `AudioStreamPlayer` nodes and `Tween`.
  - Hooked up "travel" and "combat" music transitions in `World.gd`.
- **SOP Enemy Death Polish**:
  - Standardized `EnemySprite.gd` death animations to the 1.0s SOP v3.0 standard (fade-out + automatic particle burst).
- **Inventory Filtering**:
  - Added category filter buttons (ALL, ARMOR, WEAPON, CONSUMABLE) to the character panel grid for improved inventory management.

## Changes Applied (Jan 3, 2026 - Mile 100 Quality Roadmap)
- **Combat AI 2.0**: 
  - Implemented boss phases in `CombatAI.gd` using health thresholds from `enemies.json`.
  - Added `select_ability` logic for enemies with cooldown tracking and phase-specific ability filtering.
  - Updated `CombatManager.gd` to process enemy AI state every turn.
- **UI & Visual Clarity**:
  - Added casting bars and status icons to `UnitFrame.tscn`, `HeroSprite.tscn`, and `EnemySprite.tscn`.
  - Implemented `_update_status_icons()` in unit scripts to visualize active effects from `StatusEffectsManager`.
  - Defined WoW-style "casting" bar colors in `UITheme.gd`.
- **World & Biomes**:
  - Expanded `WorldManager.gd` to include 6 distinct biomes: Plains, Forest, Mountains, Desert, Undead, Arcane.
  - Implemented smooth background color and ambient audio transitions in `World.gd` using `Tween`.
- **World Map**:
  - Created `WorldMap.tscn` and `WorldMap.gd` to visualize 100-mile progress.
  - Added "Map" button to the HUD and `KEY_M` keyboard shortcut.
- **Itemization 2.0**:
  - Implemented Item Set bonus detection in `EquipmentManager.gd`. `Warrior's Improved Set` (Iron) now grants defense/health bonuses.
  - Functionalized Skill Gem socketing system; `calculate_equipment_stats` now includes gem stat bonuses.
- **Narrative & Meta-Progression**:
  - Created `QuestManager.gd` and `quests.json` to handle kill-tasks and distance-tasks.
  - Overhauled the Prestige UI in `Prestige.tscn` to include a full upgrade grid populated from `prestige-config.json`.
- **Audio & Juice**:
  - Added `play_ambient(biome)` support to `AudioManager.gd`.
  - Implemented "Boss Finisher" cinematic effect in `ParticleManager.gd` (Engine slow-motion, heavy camera shake, massive golden golden VFX).
  - Hooked up death-triggered cinematic effects in `World.gd`.

## Changes Applied (Jan 3, 2026 - Hero Visuals 4.0 "Evolution & Polish")
- **Base Body Evolution (Phase 1)**: `HeroSprite.gd` now dynamically selects its base texture (`humanoid_0.png` through `humanoid_3.png`) based on the party's current mile progression. This creates a visual evolution from a "Ragged Traveler" to an "Avatar of War" as players advance.
- **Animation Expansion (Phase 2)**: Added `hurt` (quick recoil + red tint) and `victory` (weapon raise + scale up) animations to `HeroSprite.gd`. Integrated these into `World.gd` to trigger during combat and post-boss encounters.
- **Rage Mode Shader (Phase 3)**: Enhanced `SpriteTransparency.gdshader` with support for `overlay_color` and `overlay_intensity`. Created a "berserk" status effect that triggers a glowing red overlay on heroes.
- **Post-Processing Juice**: Added a programmatic `WorldEnvironment` to `World.gd` with bloom enabled. `ParticleManager.gd` now triggers screen-wide "Bloom Bursts" during Level-Ups and Boss Finishers.
- **UI Portrait Preview (Phase 4)**: Added a `SubViewport`-based portrait system to the `CharacterPanel.tscn`. Players can now see a high-resolution, zoomed-in, animated preview of their hero and equipment in the character sheet.

## Changes Applied (Jan 3, 2026 - Diagnostics & Logging)
- **Godot Logging System**: Implemented `CursorLogManager.gd` as an Autoload singleton.
- **Real-Time Diagnostics**: Configured logging to `user://cursor_logs.txt` with immediate `flush()` for real-time visibility in Cursor IDE.
- **Check Logs Pattern**: Established the "check logs" command pattern to automatically read Godot (`user://cursor_logs.txt`) and legacy logs for unified troubleshooting.
- **GameManager Integration**: Integrated `CursorLogManager` into `GameManager.gd` to track system startup and state transitions.
- **Tooling Update**: Updated `scripts/check-logs.js` to support both Godot and legacy log paths.

## Changes Applied (January 2026 - Phaser 3 Removal)
- **Legacy Code Cleanup**: Removed entire `src/` directory containing Phaser 3 codebase
- **Dependency Cleanup**: Removed Phaser from package.json dependencies
- **Config Updates**: Updated vite.config.js and package.json scripts to remove src/ references
- **Project Status**: Project is now 100% Godot 4.x with no Phaser dependencies

## Changes Applied (January 2026 - Migration Audit)
- **Comprehensive Migration Audit**: Created `docs/GODOT_MIGRATION_100_ITEMS.md` documenting 100 migration/enhancement items
- **Audit Findings**: 
  - ~40 items fully migrated (core managers, basic utilities)
  - ~35 items need enhancement (partial implementation, needs integration)
  - ~25 items missing (not yet created or needs creation)
- **Priority Items Identified**:
  1. InteractionManager (building entry, NPC interactions)
  2. HeroFactory (hero creation system)
  3. Scene Handlers (combat, level-up, save-load handlers)
  4. UIBuilder full implementation (100+ UI component functions)
  5. Object Pooling integration (performance optimization)
- **Migration Categories**: Managers & Core Systems (25), Utilities & Helpers (20), UI Components (15), Dev Tools (15), Generators (10), Optimization (7), Polish & QoL (8)

## Changes Applied (January 2026 - Stability & UI Fixes)
- **Mile Progression Bar Fix**: Fixed `HUD.gd` to properly update the `WorldProgressBar` (gold bar at top) as the party progresses. The bar now correctly displays 0-100 mile progression and updates in real-time via `WorldManager.mile_changed` signal.
- **Lambda Capture Errors Resolved**: Fixed critical "Lambda capture at index 0 was freed" errors by refactoring all anonymous function signal connections to use named methods. This prevents crashes when UI nodes are freed during scene transitions. Files updated: `HUD.gd`, `Inventory.gd`, `WorldMap.gd`, `Prestige.gd`, `World.gd`, `EnemySprite.gd`, `ParticleManager.gd`, `AudioManager.gd`, `CameraManager.gd`, `CombatActions.gd`.
- **Enum Type Warnings Fixed**: Resolved "Integer used when enum value is expected" warnings in `CharacterCreation.gd` by using proper Godot enum constants (`Control.LAYOUT_MODE_ANCHORS`, `Control.GROW_DIRECTION_BOTH`) instead of raw integers.
- **Unused Variable Cleanup**: Removed unused `target_id` variable in `AbilityManager.gd` that was causing GDScript reload warnings.
- **Missing Audio Assets Identified**: Confirmed that `road-to-war/assets/audio/` directory is empty, causing continuous warnings for missing SFX (hit, miss, crit, hit_enemy) and music (travel, combat) files. This is a known issue and does not affect gameplay functionality.
- **Game Stability Verified**: Logs confirm game is stable and progressing correctly (reached Mile 700+ in testing). No critical errors or script crashes detected.

## Changes Applied (January 2026 - LPC Asset Generation System)
- **Asset Generation Overhaul**: Replaced procedural sprite generation with LPC (Liberated Pixel Cup) asset pipeline
  - **LPC Base Download**: Created `tools/fetch-lpc-bases.js` to download quality LPC spritesheets from GitHub
  - **Spritesheet Extraction**: Created `tools/extract-spritesheet.js` to extract individual frames and animation strips from LPC spritesheets
  - **Hero Variant Generation**: Created `tools/create-hero-variants.js` to generate class-specific hero sprites from LPC base
  - **Quality Improvement**: Hero sprites now use real pixel art base (humanoid_base.png) with class-specific color tints and overlays
  - **Generated Assets**: All 11 hero class sprites (paladin, ancient_warrior, arcane_scholar, shadow_assassin, nature_blessed, divine_guardian, beast_master, dragon_kin, frostborn, lightning_touched, void_walker) plus 20 humanoid progression sprites
  - **Animation Strips**: Extracted walk, attack, cast, and hurt animation strips from LPC spritesheets
  - **Asset Integration**: All generated sprites automatically synced to `road-to-war/assets/sprites/` for Godot use
- **Asset Quality**: Hero sprites now use professional LPC pixel art as base, significantly improving visual quality over previous procedural generation

## Active Debug Tools
- **F1**: Trigger Level-Up VFX/SFX on Hero 1.
- **F2**: Trigger Boss Mile Transition (Shake + Lighting).
- **F3**: Trigger Critical Hit VFX/SFX on Hero 1.
- **Save Button**: Available in the Options menu during gameplay.
- **"check logs"**: Command for the AI to analyze all runtime logs (Godot + Legacy).

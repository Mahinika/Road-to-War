# Active Context: Incremental Prestige RPG

## Current Work Focus
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

## Current Priority
Confirming that the game state (progress, loot, levels) persists correctly across sessions using the integrated Godot save system.

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

## Active Debug Tools
- **F1**: Trigger Level-Up VFX/SFX on Hero 1.
- **F2**: Trigger Boss Mile Transition (Shake + Lighting).
- **F3**: Trigger Critical Hit VFX/SFX on Hero 1.
- **Save Button**: Available in the Options menu during gameplay.

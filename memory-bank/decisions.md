# Architectural Decisions Log

This document captures key architectural decisions made during the development of Road of War, including rationale, alternatives considered, and impact. This prevents regression and enables better future decisions.

## Decision Format
Each decision includes:
- **Date**: When the decision was made
- **Decision**: What was decided
- **Rationale**: Why this approach was chosen
- **Alternatives Considered**: Other options evaluated
- **Status**: Current implementation status
- **Impact**: Consequences and affected systems

---

## 1. Manager Pattern as Godot Autoloads (Singletons)

**Date**: January 2026 (Godot Migration)

**Decision**: All game system managers are implemented as Godot Autoloads (Singletons) defined in `project.godot`, accessible via `/root/ManagerName`.

**Rationale**:
- Godot-native singleton pattern ensures automatic initialization order control
- Provides global access without passing references through scenes
- Consistent lifecycle management via `_ready()` method
- Native signal system integration for event-driven communication
- Easier scene integration (no manual dependency injection needed)

**Alternatives Considered**:
- Scene-based managers: Rejected due to lifecycle complexity and reference passing overhead
- Manual singleton pattern: Rejected as Godot Autoloads are more reliable and built-in
- Dependency injection: Rejected due to added complexity without significant benefit for this project size

**Status**: ✅ Fully Implemented - All 20+ managers are Autoloads (EquipmentManager, CombatManager, AbilityManager, AnimationManager, AudioManager, CameraManager, BloodlineManager, InteractionManager, MovementManager, ParticleManager, ResourceManager, StatusEffectsManager, PrestigeManager, ShopManager, TalentManager, AchievementManager, LootManager, StatisticsManager, PartyManager, WorldManager)

**Impact**:
- **Positive**: Simplified architecture, easier debugging, consistent access patterns
- **Constraints**: Must avoid circular dependencies (see Decision #2)
- **Affected Systems**: All game systems - managers, scenes, UI components

---

## 2. Signal-Based Communication Instead of Direct References

**Date**: January 2026 (Godot Migration)

**Decision**: Managers communicate via Godot's signal system rather than direct method calls or references.

**Rationale**:
- Loose coupling: Systems don't need direct knowledge of each other
- Event-driven architecture enables flexible system composition
- Decouples timing concerns (signals are queued, avoid order dependencies)
- Makes testing easier (can mock signal emissions)
- Aligns with Godot's recommended patterns

**Alternatives Considered**:
- Direct manager references: Rejected due to tight coupling and initialization order issues
- EventBus pattern: Considered but Godot signals provide same benefit natively
- Observer pattern: Rejected as signals are built-in observer pattern

**Status**: ✅ Fully Implemented - All manager-to-manager communication uses signals

**Impact**:
- **Positive**: Loose coupling, easier to extend and modify systems independently
- **Constraints**: Must properly disconnect signals to avoid memory leaks (see Error Patterns)
- **Affected Systems**: All manager interactions, combat flow, UI updates, world events

---

## 3. Data-Driven Design (JSON Configs)

**Date**: Project Inception

**Decision**: All gameplay values (items, abilities, stats, enemies, world config) come from JSON files in `road-to-war/data/`. No hard-coded values in logic.

**Rationale**:
- Enables rapid balancing without code changes
- Non-programmers can modify game content
- Version control friendly (easy to diff and review changes)
- Supports hot-reload during development (see Decision #8)
- Makes game data exportable/importable

**Alternatives Considered**:
- Hard-coded values: Rejected due to inflexibility
- Database (SQLite): Rejected as overkill for game config data
- Scriptable config language: Rejected due to complexity and JSON is sufficient

**Status**: ✅ Fully Implemented - All managers load from JSON via DataManager

**Impact**:
- **Positive**: Rapid iteration on balance, content changes don't require code deployment
- **Constraints**: Must validate JSON structure (handled by DataValidator)
- **Affected Systems**: All managers, balancing workflow, content creation pipeline

---

## 4. HeroFactory Centralization

**Date**: January 2026 (Refactoring Sprint)

**Decision**: Created centralized `HeroFactory.gd` for all hero creation, replacing scattered instantiation logic across multiple files.

**Rationale**:
- Single source of truth for hero creation logic
- Ensures consistency across all creation points (CharacterCreation, World test party, save loading)
- Easier to maintain and extend (new hero properties only need one place updated)
- Reduces duplication and potential for inconsistencies

**Alternatives Considered**:
- Keep scattered creation logic: Rejected due to maintenance burden and inconsistency risk
- Factory pattern in each manager: Rejected as unnecessary duplication

**Status**: ✅ Fully Implemented - All hero creation points updated (CharacterCreation.gd, World.gd, Main.gd, PartyManager.gd)

**Impact**:
- **Positive**: Consistent hero creation, easier to add new hero properties
- **Constraints**: Must maintain backward compatibility with save data
- **Affected Systems**: PartyManager, CharacterCreation, SaveManager, World scene

---

## 5. UIBuilder Expansion (100+ Component Functions)

**Date**: January 2026 (Refactoring Sprint)

**Decision**: Expanded `UIBuilder.gd` from ~97 lines to 500+ lines with 100+ UI component functions, fully data-driven via config dictionaries.

**Rationale**:
- Consistent UI creation across all scenes (WoW WotLK aesthetic)
- Reduces code duplication (previously each scene recreated similar UI elements)
- Easier to maintain and update UI theme globally
- Data-driven approach allows UI configuration without code changes
- Enables rapid UI prototyping

**Alternatives Considered**:
- Scene templates: Rejected due to inflexibility and Godot scene inheritance limitations
- Keep per-scene UI creation: Rejected due to duplication and inconsistency
- External UI framework: Rejected as overkill, Godot Control nodes are sufficient

**Status**: ✅ Fully Implemented - 10+ files migrated to use UIBuilder (World.gd dialogs, SaveLoad.gd, HUD.gd, CharacterPanel.gd, CharacterCreation.gd, UnitFrame.gd, Inventory.gd, Prestige.gd)

**Impact**:
- **Positive**: Consistent UI, faster development, easier theme changes
- **Constraints**: Must maintain backward compatibility during migration
- **Affected Systems**: All UI scenes, theme system, user experience

---

## 6. ObjectPool Integration Pattern

**Date**: January 2026 (Performance Optimization)

**Decision**: Integrated ObjectPool system for frequently created/destroyed objects (FloatingText, particles) to reduce allocation overhead.

**Rationale**:
- Performance: Reduces garbage collection pressure and allocation overhead
- Measured impact: ~90% reduction in FloatingText allocations
- Critical for real-time game performance (60 FPS target)
- Common pattern in game development for transient objects

**Alternatives Considered**:
- Continue allocating on-demand: Rejected due to performance impact at high combat speeds
- Manual object lifecycle management: Rejected as ObjectPool handles this more reliably

**Status**: ✅ Fully Implemented - Integrated into ParticleManager and FloatingText.gd

**Impact**:
- **Positive**: Significant performance improvement, smoother gameplay
- **Constraints**: Objects must implement reset() method for pool reuse
- **Affected Systems**: ParticleManager, FloatingText, combat visual feedback

---

## 7. Lambda Capture Fix Pattern (Named Methods)

**Date**: January 2026 (Bug Fix)

**Decision**: Always use named methods for signal connections instead of anonymous/lambda functions to prevent "Lambda capture at index 0 was freed" errors.

**Rationale**:
- Critical bug fix: Anonymous functions in signal connections caused crashes when UI nodes were freed during scene transitions
- Named methods are properly tracked by Godot's reference system
- More debuggable (can see method names in call stacks)
- Better for code readability

**Alternatives Considered**:
- Keep anonymous functions with workarounds: Rejected as fragile and error-prone
- Use Callable.bind(): Considered but named methods are simpler and more reliable

**Status**: ✅ Fully Fixed - All signal connections refactored (HUD.gd, Inventory.gd, WorldMap.gd, Prestige.gd, World.gd, EnemySprite.gd, ParticleManager.gd, AudioManager.gd, CameraManager.gd, CombatActions.gd)

**Impact**:
- **Positive**: Eliminated crashes, more stable scene transitions
- **Constraints**: Slightly more verbose code (acceptable trade-off)
- **Affected Systems**: All UI scenes, signal connections, scene lifecycle management

---

## 8. GameplayDataHotReload System

**Date**: January 2026 (Development Tooling)

**Decision**: Implemented live data update system that watches JSON files and triggers manager reload methods automatically during development.

**Rationale**:
- Rapid iteration: Balance changes take effect immediately without restarting game
- Faster development workflow: No need to restart Godot editor for data changes
- Reduces testing friction: Can tweak values and see results instantly
- Only enabled in development mode (no performance impact in release)

**Alternatives Considered**:
- Manual reload: Rejected due to workflow friction
- File system events: Considered but polling is simpler and more reliable across platforms

**Status**: ✅ Fully Implemented - GameplayDataHotReload.gd watches `road-to-war/data/*.json`

**Impact**:
- **Positive**: Significantly faster development iteration, better balancing workflow
- **Constraints**: Only works in development mode, requires manager reload methods
- **Affected Systems**: All data-driven managers, development workflow

---

## 9. Removed Strict Typing on Autoload References

**Date**: January 2026 (Circular Dependency Fix)

**Decision**: Removed strict type hints on Autoload manager references to allow Godot flexible loading order and prevent circular dependency issues.

**Rationale**:
- Fixed critical issue: Strict typing caused initialization order conflicts
- Godot's Autoload system works best with flexible typing
- Type safety maintained through runtime validation where needed
- Allows managers to reference each other without strict load order requirements

**Alternatives Considered**:
- Enforce strict load order: Rejected as fragile and difficult to maintain
- Dependency injection: Rejected due to added complexity

**Status**: ✅ Fully Implemented - All manager references use flexible typing

**Impact**:
- **Positive**: Eliminated circular dependency crashes, more flexible architecture
- **Constraints**: Less compile-time type checking (acceptable trade-off)
- **Affected Systems**: All managers, Autoload initialization

---

## 10. Scene Handlers Extraction Pattern

**Date**: January 2026 (Refactoring Sprint)

**Decision**: Extracted specialized handler classes (CombatHandler.gd, LevelUpHandler.gd, SaveLoadHandler.gd) from World.gd to improve separation of concerns.

**Rationale**:
- World.gd was becoming too large and handling too many responsibilities
- Better modularity: Each handler has single, clear responsibility
- Easier to test: Handlers can be tested independently
- Reusable: Handlers can be used by other scenes if needed
- Cleaner code organization

**Alternatives Considered**:
- Keep all logic in World.gd: Rejected due to file size and complexity
- Create manager for each concern: Rejected as over-engineering (handlers are scene-specific)

**Status**: ✅ Fully Implemented - CombatHandler, LevelUpHandler, SaveLoadHandler created and integrated

**Impact**:
- **Positive**: Cleaner code organization, easier maintenance, better testability
- **Constraints**: Must coordinate between handlers and World.gd (handled via signals)
- **Affected Systems**: World.gd, combat flow, level-up system, save/load system

---

## 11. Unified Asset Generation Architecture

**Date**: January 2026 (Asset Pipeline)

**Decision**: Created unified asset generation system with single entry point (`tools/unified-asset-generator.js`) and shared base architecture, replacing scattered generation scripts.

**Rationale**:
- Single source of truth: All asset generation goes through one system
- Consistency: Shared utilities ensure consistent output quality
- Maintainability: Changes to generation logic only need one place updated
- Prevents duplication: No need to recreate generation logic for new asset types

**Alternatives Considered**:
- Keep separate generators: Rejected due to duplication and inconsistency
- External asset pipeline: Rejected as overkill, Node.js tools are sufficient

**Status**: ✅ Fully Implemented - Unified architecture in place, all generators refactored

**Impact**:
- **Positive**: Consistent asset quality, easier to add new asset types, maintainable
- **Constraints**: Must maintain backward compatibility with existing assets
- **Affected Systems**: All asset generation tools, asset pipeline workflow

---

## 12. 5-Man Party System Architecture

**Date**: Project Design Phase

**Decision**: Fixed party size of 5 heroes with strict role constraints (1 tank, 1 healer, 3 DPS), enforced by PartyManager.

**Rationale**:
- WoW-inspired design: Familiar to target audience
- Balanced gameplay: Clear roles enable strategic gameplay
- Simpler balancing: Fixed party size means predictable combat scenarios
- Clear progression: Each role has distinct upgrade paths

**Alternatives Considered**:
- Variable party size: Rejected due to balancing complexity
- Different role distribution: Evaluated but 1-1-3 provides best balance

**Status**: ✅ Fully Implemented - PartyManager enforces constraints, all systems support party

**Impact**:
- **Positive**: Clear game design, easier balancing, familiar mechanics
- **Constraints**: Must design all content for 5-man party
- **Affected Systems**: All combat, UI (party frames), camera, progression systems

---

## Decision Review Process

When making new architectural decisions:
1. Document in this file with full rationale
2. Update affected systems documentation
3. Consider impact on existing decisions
4. Review during refactoring sprints

---

## Decision #13: Sprite Visibility Guarantee Pattern

**Date**: January 2026

**Decision**: Explicitly set `visible = true` and `modulate = Color.WHITE` at multiple points during sprite initialization to guarantee visibility, regardless of default states or texture loading timing.

**Rationale**:
- Godot nodes may have unexpected default visibility states
- Texture loading timing can affect when sprites become visible
- Race conditions in initialization order can cause visibility issues
- Explicit visibility enforcement prevents silent visual bugs
- Multiple enforcement points (setup, texture load, combat) provide redundancy

**Implementation Pattern**:
```gdscript
# In _ready()
visible = true
if visuals:
    visuals.visible = true
    visuals.modulate = Color.WHITE

# In setup() after texture loading
visible = true
if body_layer:
    body_layer.visible = true
    body_layer.modulate = Color.WHITE

# During combat (defensive)
if hero_group:
    for node in hero_group.get_children():
        node.visible = true
```

**Alternatives Considered**:
- Relying on scene defaults: Rejected - defaults may vary or be overridden
- Single point of enforcement: Rejected - timing issues can cause visibility to be lost
- Assuming texture load guarantees visibility: Rejected - visibility and texture loading are independent

**Status**: ✅ Implemented in `HeroSprite.gd` and `World.gd`

**Impact**:
- **Positive**: Guaranteed hero visibility, eliminates silent visual bugs
- **Pattern**: Established defensive visibility enforcement pattern for all sprite nodes
- **Affected Systems**: HeroSprite, World spawn system, combat visibility system

---

## Decision #14: Camera2D Anchor Mode and Positioning Method

**Date**: January 2026 (Critical Bug Fix)

**Decision**: All Camera2D instances must use `ANCHOR_MODE_DRAG_CENTER` and be positioned using the `position` property, not `global_position`.

**Rationale**:
- **ANCHOR_MODE_DRAG_CENTER**: Centers the camera viewport on the camera's position (standard game camera behavior)
- **position vs global_position**: Camera2D manages its own positioning system; using global_position can cause incorrect positioning
- **Critical Bug Fix**: Original code used `ANCHOR_MODE_FIXED_TOP_LEFT` and `global_position`, causing camera to appear "way below ground"
- **Godot Best Practice**: Follows Godot 4.x Camera2D documentation and common usage patterns

**Alternatives Considered**:
- Keep `ANCHOR_MODE_FIXED_TOP_LEFT`: Rejected - positions screen corner at target, not center
- Keep `global_position`: Rejected - can cause positioning inconsistencies with Camera2D
- Custom camera system: Rejected - Camera2D is the standard Godot solution

**Status**: ✅ Fully Implemented - All camera positioning updated (World.gd, CameraManager.gd)

**Impact**:
- **Positive**: Camera now correctly centers on tank hero, fixes "underground" positioning bug
- **Constraints**: Must use `position` property for all Camera2D positioning
- **Affected Systems**: Camera system, player viewport, visual feedback

---

---

## Decision #15: Unit Grounding and Positioning System

**Date**: January 2026 (Critical Positioning Fix)

**Decision**: All units (heroes, enemies) must be positioned with feet on road surface, accounting for actual Line2D road thickness and current sprite scaling.

**Rationale**:
- **Visual Immersion**: Units must appear grounded on surfaces, not hovering/flying
- **Scale Changes**: When sprite scaling changed from 2.5x to 1.0x, positioning calculations became incorrect
- **Road Thickness**: Line2D roads have width - surface position is center ± (width/2)
- **Hard-coded Values**: Scale adjustments became invalid when scaling system changed
- **Critical Bug Fix**: Units were positioned 80 pixels above road surface due to incorrect calculations

**Alternatives Considered**:
- Keep hard-coded scale adjustments: Rejected - breaks when scaling changes
- Ignore visual positioning: Rejected - breaks game immersion
- Custom positioning per unit type: Rejected - increases complexity unnecessarily

**Status**: ✅ Fully Implemented - All unit positioning updated (heroes, enemies, movement)

**Impact**:
- **Positive**: Units properly grounded on road surfaces for realistic positioning
- **Constraints**: Must recalculate positioning when road properties or sprite scales change
- **Affected Systems**: Unit spawning, movement, combat positioning, visual consistency

---

---

## Decision #16: Massive Enemy Roster Expansion

**Date**: January 2026 (Major Content Expansion)

**Decision**: Expand enemy roster from 10 to 54 enemies with comprehensive WoW WotLK-inspired creature variety.

**Rationale**:
- **Content Depth**: Original 10 enemies provided insufficient variety for 100-mile journey
- **Player Engagement**: Constant enemy repetition (slime spam) was boring
- **WoW WotLK Authenticity**: Game inspired by WoW WotLK deserves authentic creature roster
- **Progression Variety**: Different enemy types needed at different difficulty levels
- **Visual Storytelling**: Enemy variety helps tell the story of the world journey

**Alternatives Considered**:
- Keep original 10 enemies and focus on difficulty scaling: Rejected - too repetitive
- Add procedural enemy variations: Rejected - not authentic to WoW WotLK theme
- Limit to 20-25 enemies: Rejected - still insufficient for 100-mile journey

**Status**: ✅ Fully Implemented - 44 new enemies added, 54 total enemies

**Impact**:
- **Positive**: Incredible enemy variety, authentic WoW WotLK feel, engaging combat throughout journey
- **Technical**: Required sprite generator enhancements, comprehensive data structures
- **Content**: Transforms game from basic variety to rich enemy ecosystem
- **Affected Systems**: Enemy spawning, asset generation, combat balance, player experience

---

## Decision #17: Enemy Visual Enhancement Strategy

**Date**: January 2026 (Visual Content Expansion)

**Decision**: Implement comprehensive enemy visual system with 6+ body types and 128×128 detailed sprites.

**Rationale**:
- **Visual Quality**: 64×64 sprites were too small and basic for detailed enemy designs
- **Body Type Variety**: Different creature types needed distinct visual representations
- **WoW WotLK Aesthetics**: High-quality pixel art consistent with hero sprites
- **Scalability**: System must support future enemy additions easily
- **Technical Feasibility**: Godot and asset pipeline can handle enhanced sprites

**Alternatives Considered**:
- Keep 64×64 sprites with more variety: Rejected - quality too low for detailed designs
- Use 3D models: Rejected - game is 2D, would break consistency
- Procedural generation only: Rejected - not detailed enough for WoW WotLK authenticity

**Status**: ✅ Fully Implemented - 128×128 sprites, 6 body types, detailed rendering

**Impact**:
- **Positive**: Professional-quality enemy sprites, rich visual variety, WoW WotLK authenticity
- **Technical**: Enhanced asset generation pipeline, new rendering techniques
- **Content**: Enemies now have distinctive, memorable visual identities
- **Affected Systems**: Asset generation, enemy rendering, visual consistency

---

---

## Decision #19: Automated Testing Requirement

**Date**: January 2026

**Decision**: All tests we need to run MUST be automated via scripts or tools. User should never have to manually execute tests - they should be able to run via npm scripts, Godot CLI, or automated tools. Create and maintain automation for any testing requirements.

**Rationale**:
- **User Experience**: User should not have to manually run tests or remember complex procedures
- **Reliability**: Automated tests ensure consistent execution and reduce human error
- **Efficiency**: Saves time and prevents manual testing bottlenecks
- **Scalability**: As test suite grows, automation becomes increasingly important
- **Consistency**: Ensures tests are run the same way every time
- **Integration**: Fits with existing automation patterns (balance audit, asset generation)

**Alternatives Considered**:
- Manual testing with documentation: Rejected - prone to human error and inconsistent execution
- Partial automation: Rejected - creates confusion about what needs to be automated vs manual
- No automation requirement: Rejected - doesn't scale with project complexity

**Status**: ✅ Implemented - Added to .cursorrules, techContext.md, and systemPatterns.md as mandatory requirement

**Impact**:
- **Positive**: Ensures all testing is automated, improves reliability and user experience
- **Constraints**: Must create automation for any new testing requirements
- **Affected Systems**: All testing workflows, tool development, documentation

---

## Decision #18: Equipment Display System Implementation

**Date**: January 2026 (Visual Enhancement)

**Decision**: Implement starter equipment for heroes to display visually instead of appearing naked.

**Rationale**:
- **Visual Immersion**: Naked heroes looked unprofessional and broke immersion in the game world
- **Player Experience**: Equipment is core to RPG gameplay - players expect to see their gear
- **System Completeness**: Equipment system was functional but invisible to players
- **WoW WotLK Authenticity**: Heroes should appear properly equipped like in World of Warcraft

**Alternatives Considered**:
- No starter equipment - let players equip manually: Rejected - poor first impression
- Random equipment drops: Rejected - inconsistent and may confuse new players
- All classes same starter gear: Chosen - simple, consistent starter experience

**Status**: ✅ Fully Implemented - All hero classes get Rusty Sword + Leather Armor

**Impact**:
- **Positive**: Heroes now look properly equipped, much more immersive gameplay
- **Technical**: Leveraged existing equipment system without changes
- **Content**: Players can immediately see equipment effects on their heroes
- **Affected Systems**: HeroFactory, EquipmentManager, HeroSprite visual system

---

**Last Updated**: January 2026
**Total Decisions Documented**: 18
**Next Review**: When new major architectural decisions are made

# Strategic Development Plan 2026
**Game Director Vision & Implementation Roadmap**

**Date**: January 2026  
**Status**: Strategic Planning Phase  
**Purpose**: Comprehensive plan for High/Medium/Low priority items with player-focused design decisions

---

## Executive Summary

This plan addresses **9 strategic priorities** across three tiers, focusing on:
1. **Player-Facing Polish** (Audio, Post-100 Content, Interactions)
2. **Development Velocity** (UIBuilder, Object Pooling, Scene Handlers)
3. **Technical Debt** (HeroFactory, Migration Items)

**Estimated Timeline**: 6-8 weeks for High Priority, 4-6 weeks for Medium, 2-4 weeks for Low  
**Success Criteria**: Production-ready game with engaging endgame loop and polished UX

---

## HIGH PRIORITY: Player-Facing Features

### 1. Audio Assets Pipeline ⭐⭐⭐
**Player Impact**: HIGH - Completes the immersive experience  
**Technical Complexity**: LOW - Asset integration only  
**Dependencies**: None  
**Estimated Effort**: 1-2 weeks

#### Current State
- `AudioManager.gd` fully functional with proper loading paths
- Missing files: `road-to-war/assets/audio/` directory is empty
- Warnings logged but gameplay unaffected

#### Design Decisions Needed
**Q: What's the audio philosophy?**
- **Option A**: Minimal ambient sounds + key SFX (hit, crit, level-up, boss)
- **Option B**: Full soundscape (footsteps, UI clicks, ambient music per biome)
- **Recommendation**: Option A for MVP, expand to Option B post-launch

**Q: Music or no music?**
- **Option A**: Background music (travel/combat themes)
- **Option B**: Ambient only (no music, just SFX)
- **Recommendation**: Option A - Music adds significant atmosphere

#### Implementation Plan
1. **Phase 1: Core SFX (Week 1)**
   - Hit sounds (melee, ranged, magic)
   - Critical hit sound (distinctive)
   - Level-up fanfare
   - Boss approach warning
   - UI click/confirm sounds
   - **File Structure**: `assets/audio/sfx/hit.wav`, `crit.wav`, `level_up.wav`, etc.

2. **Phase 2: Music & Ambient (Week 2)**
   - Travel theme (looping, 2-3 minutes)
   - Combat theme (intense, 1-2 minutes)
   - Ambient tracks per biome (plains, forest, mountains, desert, undead, arcane)
   - **File Structure**: `assets/audio/music/travel.ogg`, `combat.ogg`
   - **File Structure**: `assets/audio/ambient/{biome}.ogg`

3. **Integration**
   - Verify `AudioManager.gd` paths match file structure
   - Test cross-fading between travel/combat music
   - Test ambient transitions per biome
   - Volume balancing pass

#### Success Criteria
- ✅ No audio warnings in logs
- ✅ Music transitions smoothly between travel/combat
- ✅ Ambient audio changes per biome
- ✅ All core SFX play correctly

#### Risks & Mitigation
- **Risk**: Audio files too large (affects download size)
- **Mitigation**: Use OGG Vorbis compression, target <50MB total
- **Risk**: Audio quality inconsistent
- **Mitigation**: Establish audio style guide, use royalty-free sources or commission

---

### 2. Post-Mile 100 Experience ⭐⭐⭐
**Player Impact**: CRITICAL - Defines endgame loop and replayability  
**Technical Complexity**: MEDIUM - Requires new systems  
**Dependencies**: PrestigeManager (exists but needs enhancement)  
**Estimated Effort**: 3-4 weeks

#### Current State
- Mile progression reaches 100+ in testing
- Prestige system exists but basic
- Achievements define "Mile 100 Champion" as endgame goal
- No clear post-100 content loop

#### Design Decisions Needed
**Q: What happens at Mile 100?**
- **Option A**: Prestige Reset (reset progress, keep meta-progression)
- **Option B**: Extended Content (Miles 101-200 with scaling difficulty)
- **Option C**: Challenge Modes (Boss Rush, Speed Runs, No-Death)
- **Recommendation**: **Hybrid Approach** - Prestige unlocks extended content + challenges

**Q: What's the prestige philosophy?**
- **Option A**: Full reset (lose everything, gain prestige points)
- **Option B**: Soft reset (keep equipment/talents, reset levels/miles)
- **Option C**: No reset (infinite scaling, prestige points from achievements)
- **Recommendation**: Option A with "Prestige Bank" - players can "store" favorite items/talents

#### Implementation Plan

**Phase 1: Prestige System Enhancement (Week 1-2)**
1. **Prestige Trigger**
   - Detect Mile 100 completion
   - Show "Prestige Available" notification
   - Add Prestige button to HUD (unlocked at Mile 100)
   - Prestige confirmation dialog with clear benefits

2. **Prestige Rewards**
   - Calculate prestige points based on:
     - Total levels across all heroes
     - Equipment quality collected
     - Talents unlocked
     - Achievements completed
   - Formula: `base_points + (total_levels / 10) + (epic_items * 2) + (legendary_items * 5)`

3. **Prestige Upgrades**
   - Enhance `prestige-config.json` with:
     - Gold multiplier (stacks)
     - Experience multiplier (stacks)
     - Starting item level boost
     - Talent point bonus
     - Prestige-exclusive upgrades (unlock at prestige level 5, 10, etc.)

**Phase 2: Post-100 Content Loop (Week 2-3)**
1. **Extended Miles (101-200)**
   - Infinite scaling difficulty
   - New enemy types (post-100 variants)
   - Prestige currency drops
   - Higher quality loot scaling

2. **Challenge Modes** (Unlocked at Prestige Level 1+)
   - **Boss Rush**: Fight all milestone bosses back-to-back
   - **Speed Run**: Complete 100 miles as fast as possible
   - **No-Death**: Complete without any hero dying
   - **Elite Only**: Only elite enemies spawn
   - Rewards: Prestige points, exclusive titles, cosmetic rewards

3. **Prestige Bank System**
   - Players can "store" 1 item per prestige
   - Stored items persist across resets
   - Unlocks at Prestige Level 3
   - Creates strategic decision: "What do I keep?"

**Phase 3: UI & Feedback (Week 3-4)**
1. **Prestige Screen Enhancement**
   - Show current prestige level prominently
   - Display available prestige points
   - Upgrade tree visualization
   - Prestige history (how many times reset)

2. **Post-100 HUD Updates**
   - Show "Mile 101+" instead of capping at 100
   - Display prestige level indicator
   - Challenge mode selector (if unlocked)

3. **Achievement Integration**
   - Prestige-specific achievements
   - "Prestige Master" - Reach prestige level 10
   - "Speed Demon" - Complete challenge mode in <X minutes
   - "Perfect Run" - Complete no-death challenge

#### Success Criteria
- ✅ Clear prestige trigger and confirmation flow
- ✅ Prestige points calculated correctly
- ✅ Post-100 content provides engaging loop
- ✅ Challenge modes add replayability
- ✅ Players understand prestige benefits

#### Risks & Mitigation
- **Risk**: Prestige feels like "losing progress"
- **Mitigation**: Clear communication of benefits, prestige bank system, visual feedback
- **Risk**: Post-100 content feels repetitive
- **Mitigation**: Challenge modes, scaling difficulty, new enemy types
- **Risk**: Players prestige too early/late
- **Mitigation**: Clear indicators of "good time to prestige", milestone rewards

---

### 3. InteractionManager - Building Entry & NPC Interactions ⭐⭐⭐
**Player Impact**: HIGH - Adds depth and world interactivity  
**Technical Complexity**: MEDIUM - Requires new UI systems  
**Dependencies**: SceneManager, UIBuilder (partial)  
**Estimated Effort**: 2-3 weeks

#### Current State
- `InteractionManager.gd` exists with basic encounter handling
- Handles shop/quest/treasure/NPC encounters
- Missing: Building entry system, NPC dialogue UI, interaction zones

#### Design Decisions Needed
**Q: What buildings exist in the world?**
- **Option A**: Shops only (already have shop encounters)
- **Option B**: Shops + Inns (rest/regeneration) + Training Grounds (XP boost)
- **Option C**: Full town system (multiple buildings per mile range)
- **Recommendation**: Option B - Adds depth without overwhelming complexity

**Q: How do players interact with buildings?**
- **Option A**: Automatic (party enters when nearby)
- **Option B**: Manual (player clicks building to enter)
- **Option C**: Hybrid (auto-detect, show prompt to enter)
- **Recommendation**: Option C - Best of both worlds

**Q: What do NPCs do?**
- **Option A**: Quest givers only
- **Option B**: Quest givers + Lore/Story + Hints
- **Option C**: Full dialogue system with choices
- **Recommendation**: Option B - Adds flavor without complex branching

#### Implementation Plan

**Phase 1: Building Entry System (Week 1)**
1. **Building Detection**
   - Add `Area2D` collision zones for buildings
   - Detect when party leader enters zone
   - Show "Press E to Enter" prompt
   - Visual indicator (glowing outline, icon)

2. **Building Types**
   - **Shop**: Existing shop system (enhance with building interior scene)
   - **Inn**: Restore party health/mana, save game
   - **Training Grounds**: Temporary XP boost (next 5 miles)
   - **Blacksmith**: Upgrade equipment (future feature, placeholder)

3. **Interior Scenes**
   - Create `BuildingInterior.tscn` scene
   - Generic interior that can be themed per building type
   - Exit button returns to world
   - Camera transition (fade/zoom)

**Phase 2: NPC Interaction System (Week 2)**
1. **NPC Spawning**
   - Add NPCs to world segments (random, mile-based)
   - NPC types: Quest Giver, Lore Keeper, Merchant, Trainer
   - Visual: Use existing sprite system with NPC variants

2. **Dialogue System**
   - Create `DialogueBox.tscn` UI component
   - WoW-style dialogue window (gold borders, dark background)
   - NPC portrait (left side)
   - Dialogue text (center)
   - Response buttons (bottom)
   - **Simple System**: Linear dialogue, no branching (for MVP)

3. **NPC Behaviors**
   - **Quest Giver**: Offers quests from `quests.json`
   - **Lore Keeper**: Provides world-building text (mile-based)
   - **Merchant**: Opens shop with special items
   - **Trainer**: Provides temporary buffs (XP, gold, etc.)

**Phase 3: Integration & Polish (Week 3)**
1. **World Integration**
   - Spawn buildings/NPCs in `WorldManager.generate_segment()`
   - Add interaction zones to world scene
   - Connect `InteractionManager` to world events

2. **UI Polish**
   - Dialogue animations (fade in, text typing effect)
   - Building entry transitions (camera zoom, fade)
   - Interaction prompts (keyboard hints, visual feedback)

3. **Content Creation**
   - Create NPC dialogue content (10-15 NPCs)
   - Define building spawn rates and mile ranges
   - Create building interior variations

#### Success Criteria
- ✅ Players can enter buildings via interaction prompt
- ✅ NPCs provide meaningful dialogue/quests
- ✅ Building interiors feel distinct from world
- ✅ Interaction system feels responsive and polished

#### Risks & Mitigation
- **Risk**: Too many interactions slow down progression
- **Mitigation**: Make interactions optional, quick to complete
- **Risk**: Dialogue system feels shallow
- **Mitigation**: Focus on quality over quantity, add personality to NPCs
- **Risk**: Building entry feels disconnected from world
- **Mitigation**: Smooth transitions, clear visual feedback

---

## MEDIUM PRIORITY: Quality of Life & Development Velocity

### 4. UIBuilder Full Implementation ⭐⭐
**Player Impact**: MEDIUM - Improves UI consistency and development speed  
**Technical Complexity**: MEDIUM - Requires comprehensive UI component library  
**Dependencies**: UITheme (exists)  
**Estimated Effort**: 2-3 weeks

#### Current State
- `UIBuilder.gd` exists with 4 basic functions (frame, button, label, progress_bar)
- Phaser version had 100+ UI component functions
- Missing: Tooltips, panels, containers, complex layouts, etc.

#### Design Decisions Needed
**Q: What UI components are most needed?**
- **Priority 1**: Tooltips, Panels, ScrollContainers, GridContainers
- **Priority 2**: Dropdowns, Checkboxes, RadioButtons, Sliders
- **Priority 3**: Complex layouts (tabs, accordions, modals)
- **Recommendation**: Focus on Priority 1 + 2 for MVP

#### Implementation Plan

**Phase 1: Core Components (Week 1)**
1. **Container Components**
   - `create_panel()` - Enhanced version of frame
   - `create_scroll_container()` - Scrollable content area
   - `create_grid_container()` - Grid layout
   - `create_vbox_container()` - Vertical layout
   - `create_hbox_container()` - Horizontal layout

2. **Input Components**
   - `create_text_input()` - Text field
   - `create_checkbox()` - Checkbox with label
   - `create_radio_button()` - Radio button group
   - `create_slider()` - Value slider with label

**Phase 2: Advanced Components (Week 2)**
1. **Complex UI**
   - `create_tooltip()` - Hover tooltip system
   - `create_dropdown()` - Selection dropdown
   - `create_modal()` - Popup modal dialog
   - `create_tab_container()` - Tabbed interface

2. **WoW-Style Specializations**
   - `create_unit_frame()` - Party frame component
   - `create_action_button()` - Action bar button with cooldown
   - `create_resource_bar()` - Health/mana bar with class colors
   - `create_talent_button()` - Talent tree button with prerequisites

**Phase 3: Integration & Documentation (Week 3)**
1. **Refactor Existing UI**
   - Update `CharacterPanel.gd` to use UIBuilder
   - Update `TalentAllocation.gd` to use UIBuilder
   - Update `Shop.gd` to use UIBuilder
   - Demonstrate consistency improvements

2. **Documentation**
   - Create `docs/UIBUILDER_API.md` with all functions
   - Add code examples for each component
   - Create UI style guide

#### Success Criteria
- ✅ 20+ UI component functions implemented
- ✅ All existing UI refactored to use UIBuilder
- ✅ Consistent WoW-style aesthetic across all UI
- ✅ Development velocity increased (faster UI creation)

#### Risks & Mitigation
- **Risk**: Over-engineering (too many functions)
- **Mitigation**: Focus on commonly used components, add as needed
- **Risk**: Breaking existing UI during refactor
- **Mitigation**: Incremental refactoring, test each component

---

### 5. Object Pooling Integration ⭐⭐
**Player Impact**: MEDIUM - Improves performance for long sessions  
**Technical Complexity**: MEDIUM - Requires careful memory management  
**Dependencies**: ParticleManager (exists), UIBuilder (partial)  
**Estimated Effort**: 1-2 weeks

#### Current State
- `ObjectPool.gd` exists but not integrated
- `ParticleManager.gd` creates/destroys objects frequently
- Floating text, damage numbers, particles created on-demand
- No pooling system in use

#### Design Decisions Needed
**Q: What should be pooled?**
- **Priority 1**: Floating text, damage numbers, particles
- **Priority 2**: UI elements (tooltips, buttons created dynamically)
- **Priority 3**: Enemy sprites, loot sprites
- **Recommendation**: Priority 1 + 2 for MVP

#### Implementation Plan

**Phase 1: Core Pooling (Week 1)**
1. **Enhance ObjectPool.gd**
   - Generic pooling system for any Node type
   - Pool size limits (configurable)
   - Automatic cleanup on scene change
   - Pool statistics (usage, hit rate)

2. **Integrate with ParticleManager**
   - Pool floating text labels
   - Pool damage number labels
   - Pool particle emitters (CPUParticles2D)
   - Reset objects before reuse

**Phase 2: UI Pooling (Week 2)**
1. **Integrate with UIBuilder**
   - Pool tooltips
   - Pool dynamically created buttons
   - Pool modal dialogs
   - Reset UI state before reuse

2. **Performance Testing**
   - Create stress test (1000+ objects)
   - Measure memory usage before/after
   - Measure FPS impact
   - Verify no memory leaks

#### Success Criteria
- ✅ ObjectPool integrated with ParticleManager
- ✅ Memory usage reduced by 20%+ in combat-heavy scenarios
- ✅ No performance degradation
- ✅ No memory leaks detected

#### Risks & Mitigation
- **Risk**: Pooled objects retain stale state
- **Mitigation**: Comprehensive reset logic, test thoroughly
- **Risk**: Pool size too small/large
- **Mitigation**: Configurable sizes, monitor usage statistics

---

### 6. Scene Handlers - Cleaner Architecture ⭐⭐
**Player Impact**: LOW - Internal improvement, enables future features  
**Technical Complexity**: MEDIUM - Requires refactoring existing code  
**Dependencies**: SceneManager (exists)  
**Estimated Effort**: 2 weeks

#### Current State
- Scene logic scattered across scene scripts
- No centralized handler pattern
- Phaser version had handlers (combat-handler.js, level-up-handler.js, etc.)

#### Design Decisions Needed
**Q: What handlers are needed?**
- **CombatHandler**: Combat start/end logic
- **LevelUpHandler**: Level-up notifications, stat recalculation
- **SaveLoadHandler**: Save/load UI and logic
- **EncounterHandler**: Encounter spawning and interaction
- **Recommendation**: All of the above for clean separation

#### Implementation Plan

**Phase 1: Handler Creation (Week 1)**
1. **Create Handler Base Class**
   - `BaseHandler.gd` - Common handler functionality
   - Signal connections
   - Cleanup methods
   - State management

2. **Implement Core Handlers**
   - `CombatHandler.gd` - Combat lifecycle
   - `LevelUpHandler.gd` - Level-up flow
   - `SaveLoadHandler.gd` - Save/load UI
   - `EncounterHandler.gd` - Encounter management

**Phase 2: Integration (Week 2)**
1. **Refactor Scene Scripts**
   - Move combat logic from `World.gd` to `CombatHandler`
   - Move level-up logic to `LevelUpHandler`
   - Move save/load UI to `SaveLoadHandler`
   - Move encounter logic to `EncounterHandler`

2. **Testing**
   - Verify all handlers work correctly
   - Test handler cleanup on scene change
   - Verify no broken functionality

#### Success Criteria
- ✅ All scene logic organized into handlers
- ✅ Handlers are reusable across scenes
- ✅ Code is more maintainable
- ✅ No functionality broken

#### Risks & Mitigation
- **Risk**: Breaking existing functionality during refactor
- **Mitigation**: Incremental refactoring, comprehensive testing
- **Risk**: Over-engineering (too many handlers)
- **Mitigation**: Keep handlers focused, combine related logic

---

## LOW PRIORITY: Technical Debt

### 7. HeroFactory Refactor ⭐
**Player Impact**: LOW - Internal improvement  
**Technical Complexity**: LOW - Code organization  
**Dependencies**: None  
**Estimated Effort**: 1 week

#### Current State
- Hero creation logic in `CharacterCreation.gd`
- No centralized factory pattern
- Phaser version had `HeroFactory` utility

#### Implementation Plan
1. Create `HeroFactory.gd` utility
2. Move hero creation logic from `CharacterCreation.gd`
3. Add factory methods: `create_hero()`, `create_random_hero()`, `create_hero_from_data()`
4. Update `CharacterCreation.gd` to use factory

#### Success Criteria
- ✅ Hero creation centralized in factory
- ✅ Factory methods reusable
- ✅ Code is cleaner and more maintainable

---

### 8. Remaining Migration Items ⭐
**Player Impact**: LOW - Incremental improvements  
**Technical Complexity**: VARIES  
**Dependencies**: Various  
**Estimated Effort**: 2-4 weeks (incremental)

#### Current State
- ~35 items need enhancement
- ~25 items missing
- All non-critical for MVP

#### Implementation Plan
1. **Prioritize by Impact**
   - Player-facing features first
   - Developer tools second
   - Internal improvements last

2. **Incremental Approach**
   - Address 2-3 items per sprint
   - Focus on high-impact items
   - Document as we go

3. **Key Items to Address**
   - AnimationHotReload (dev tool)
   - GameplayDataHotReload (dev tool)
   - ThreatSystem enhancements (combat depth)
   - BossMechanics integration (combat depth)

#### Success Criteria
- ✅ High-impact items addressed
- ✅ Development tools functional
- ✅ Technical debt reduced incrementally

---

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- ✅ Audio Assets Pipeline (Week 1-2)
- ✅ InteractionManager Building Entry (Week 1)
- ✅ UIBuilder Core Components (Week 1-2)

### Phase 2: Content & Polish (Weeks 3-5)
- ✅ Post-Mile 100 Experience (Week 3-4)
- ✅ InteractionManager NPC System (Week 2-3)
- ✅ Object Pooling Integration (Week 3)

### Phase 3: Architecture & Debt (Weeks 6-8)
- ✅ Scene Handlers (Week 6-7)
- ✅ UIBuilder Advanced Components (Week 7)
- ✅ HeroFactory Refactor (Week 8)
- ✅ Migration Items (Ongoing)

---

## Success Metrics

### Player-Facing
- ✅ Zero audio warnings in production
- ✅ Clear post-100 progression loop
- ✅ Engaging building/NPC interactions
- ✅ Player retention (measure playtime, return rate)

### Technical
- ✅ Development velocity increased (faster UI creation)
- ✅ Performance improved (memory usage, FPS)
- ✅ Code maintainability improved (handler pattern)
- ✅ Technical debt reduced

---

## Risk Management

### High-Risk Items
1. **Post-Mile 100 Experience** - Complex design decisions
   - **Mitigation**: Prototype early, get player feedback
2. **InteractionManager** - New UI systems required
   - **Mitigation**: Start simple, iterate based on feedback

### Medium-Risk Items
1. **UIBuilder** - Large scope
   - **Mitigation**: Focus on commonly used components first
2. **Object Pooling** - Memory management complexity
   - **Mitigation**: Thorough testing, incremental integration

---

## Next Steps

1. **Review & Approve Plan** - Game Director sign-off
2. **Prioritize Week 1 Tasks** - Audio assets + InteractionManager building entry
3. **Create Detailed Task Breakdown** - For each priority item
4. **Begin Implementation** - Start with High Priority items

---

**Document Status**: Strategic Planning Complete  
**Next Review**: After Week 2 implementation  
**Owner**: Game Director + Development Team


# Post-Mile 100 Experience Design Document
**Game Director: Strategic Design & Implementation Plan**

**Date**: January 2026  
**Status**: Design Phase  
**Priority**: HIGH - Critical for player retention and replayability

---

## Executive Summary

The Post-Mile 100 experience defines what happens after players complete the initial "Road to War" journey. This is **the most critical design decision** for long-term player engagement. We need to answer: **What keeps players coming back after Mile 100?**

**Current State**:
- Mile progression reaches 100+ in testing (no hard cap)
- Prestige system exists but basic (`PrestigeManager.gd`)
- Achievements define "Mile 100 Champion" as endgame goal
- No clear post-100 content loop or prestige trigger

**Design Goal**: Create an engaging, rewarding, and clear progression path that encourages replayability while respecting player investment.

**🎯 CRITICAL DESIGN DECISION: BRUTAL DIFFICULTY**

**Miles 101+ are BRUTAL** - like going from Normal dungeons straight to Mythic+ in WoW, with player choice to set difficulty even higher. This is **hardcore challenge content**, not casual continuation.

- **Miles 1-100**: Normal difficulty (learning curve)
- **Miles 101+**: **BRUTAL MODE** - Players select difficulty level (Brutal I-X)
- **Difficulty Scaling**: Exponential, not linear (Brutal X = 10x health/damage)
- **Enemy Modifications**: All enemies become elite, brutal affixes applied
- **Rewards**: Scale dramatically with difficulty choice
- **Player Choice**: Strategic difficulty selection (higher = better rewards but harder)

---

## Design Philosophy: The Three Pillars

### 1. **Respect Player Investment**
Players spent hours reaching Mile 100. The post-100 experience should:
- **Acknowledge achievement** - Celebrate the milestone
- **Preserve meaningful choices** - Don't invalidate all progress
- **Provide clear benefits** - Make prestige/reset feel rewarding, not punitive

### 2. **Enable Strategic Depth**
Post-100 should introduce new strategic considerations:
- **When to prestige?** - Too early = wasted potential, too late = diminishing returns
- **What to keep?** - Prestige Bank allows strategic item preservation
- **How to optimize?** - Challenge modes reward different playstyles

### 3. **Maintain Engagement**
The loop must feel fresh, not repetitive:
- **Extended content** - New challenges beyond Mile 100
- **Challenge modes** - Varied gameplay experiences
- **Prestige progression** - Visible power growth across resets

---

## Option Analysis: Three Approaches

### Option A: Prestige Reset (Full Reset)
**Concept**: At Mile 100, players can prestige to reset progress and gain permanent bonuses.

**Mechanics**:
- Reset: Mile → 0, Heroes → Level 1, Equipment → Lost, Talents → Reset
- Keep: Prestige Level, Prestige Points, Purchased Upgrades, Prestige Bank items
- Gain: Prestige Points based on total progress

**Pros**:
- ✅ Classic idle/incremental game loop
- ✅ Clear progression reset = fresh start feeling
- ✅ Prestige upgrades provide visible power growth
- ✅ Encourages optimization ("How fast can I reach 100 again?")

**Cons**:
- ❌ Feels like "losing progress" (psychological barrier)
- ❌ May discourage players who don't want to reset
- ❌ Requires careful balance (too weak = frustrating, too strong = trivial)

**Player Psychology**: 
- **Risk**: Players may quit rather than prestige ("I don't want to lose everything")
- **Mitigation**: Prestige Bank system, clear benefit communication, optional prestige

---

### Option B: Extended Content (No Reset)
**Concept**: Continue beyond Mile 100 with infinite scaling difficulty.

**Mechanics**:
- Continue: Mile 101+, infinite scaling
- Scaling: Enemy levels = Mile number, loot quality scales
- New Content: Post-100 enemy types, prestige currency drops
- Prestige: Optional, unlocked but not required

**Pros**:
- ✅ No progress loss = player-friendly
- ✅ Infinite content = long play sessions
- ✅ Prestige becomes optional optimization, not requirement
- ✅ Appeals to completionist players

**Cons**:
- ❌ May feel repetitive (same loop, bigger numbers)
- ❌ No "fresh start" feeling
- ❌ Prestige feels less impactful (optional vs. required)
- ❌ Risk of power creep (numbers get too large)

**Player Psychology**:
- **Risk**: Players may get bored of same loop
- **Mitigation**: Challenge modes, new enemy types, milestone rewards

---

### Option C: Hybrid Approach ⭐ **RECOMMENDED**
**Concept**: Combine prestige reset with extended content and challenge modes.

**Mechanics**:
- **At Mile 100**: Unlock prestige option + extended content
- **Extended Content**: Miles 101-200+ available immediately (no reset required)
- **Prestige**: Optional reset that unlocks challenge modes and prestige-exclusive upgrades
- **Challenge Modes**: Unlocked at Prestige Level 1+, provide alternative progression paths

**Pros**:
- ✅ Best of both worlds - choice for different player types
- ✅ Extended content for players who don't want to reset
- ✅ Prestige for players who want optimization challenge
- ✅ Challenge modes add variety and replayability
- ✅ Prestige Bank reduces "loss" feeling

**Cons**:
- ❌ More complex to implement
- ❌ Requires careful balance between paths
- ❌ More content to create and maintain

**Player Psychology**:
- **Benefit**: Appeals to both reset-lovers and reset-avoiders
- **Benefit**: Challenge modes provide variety without requiring reset

---

## Recommended Design: Hybrid Approach

### Phase 1: Mile 100 Arrival (The Celebration)

**When**: Player reaches Mile 100

**Events**:
1. **Boss Fight**: Final boss "War Lord" at Mile 100
2. **Victory Celebration**: 
   - Massive particle effects
   - Screen-wide "VICTORY!" message
   - Achievement unlock: "Mile 100 Champion"
   - Reward: 20,000 gold, 5 talent points, 20 prestige points
3. **Post-Victory Screen**:
   - "Congratulations! You've completed the Road to War!"
   - Two options presented:
     - **Continue Journey** (Extended Content) - "Explore beyond Mile 100"
     - **Prestige** - "Reset for greater power" (unlocks challenge modes)

**UI Elements**:
- Modal dialog with clear explanation
- Visual comparison: "What you keep" vs "What you gain"
- Prestige Bank preview (if unlocked)
- "Not Now" option (can prestige later from menu)

---

### Phase 2: Extended Content - BRUTAL MODE (Miles 101+)

**Unlocked**: Immediately after Mile 100 (no prestige required)

**Design Philosophy**: **BRUTAL DIFFICULTY JUMP**
- Miles 1-100 = Normal Dungeons (WoW)
- Miles 101+ = Mythic+ Keystone Levels (WoW)
- **Players CHOOSE their difficulty** - like selecting a Mythic+ keystone level
- This is **hardcore challenge content**, not casual continuation

**The Brutal Jump**:
- **Mile 100**: Final boss fight (normal difficulty)
- **Mile 101+**: Immediate difficulty spike - like going from Normal to Mythic+5
- **Enemy Scaling**: Not linear - **exponential** difficulty increase
  - Base enemy level = Mile number × Difficulty Multiplier
  - Health/Damage scale exponentially with difficulty level
  - Enemy abilities become more frequent and dangerous

**Difficulty Selection System (Mythic+ Style)**:

When players choose "Continue Journey" at Mile 100, they select a **Difficulty Level**:

```
┌─────────────────────────────────────┐
│   SELECT BRUTAL MODE DIFFICULTY     │
├─────────────────────────────────────┤
│                                     │
│   ⚠️ WARNING: BRUTAL DIFFICULTY     │
│   Miles 101+ are MUCH harder!       │
│                                     │
│   Difficulty Level:                 │
│   ┌───────────────────────────────┐ │
│   │ [1] Brutal I   (Recommended)  │ │
│   │ [2] Brutal II  (Hard)         │ │
│   │ [3] Brutal III (Very Hard)    │ │
│   │ [4] Brutal IV  (Extreme)      │ │
│   │ [5] Brutal V   (Nightmare)    │ │
│   │ [6] Brutal VI  (Hell)         │ │
│   │ [7] Brutal VII (Impossible)    │ │
│   │ [8] Brutal VIII (Beyond)      │ │
│   │ [9] Brutal IX  (Ascended)     │ │
│   │ [10] Brutal X  (Legendary)    │ │
│   └───────────────────────────────┘ │
│                                     │
│   Difficulty Multipliers:          │
│   • Brutal I:   2.0x health/damage │
│   • Brutal V:   5.0x health/damage │
│   • Brutal X:   10.0x health/damage│
│                                     │
│   Rewards Scale with Difficulty!    │
│                                     │
│   [Continue] [Prestige Instead]    │
└─────────────────────────────────────┘
```

**Difficulty Scaling Formula**:
```gdscript
func calculate_brutal_difficulty(mile: int, difficulty_level: int) -> Dictionary:
    # Base enemy level scales with mile
    var base_level = mile
    
    # Difficulty multiplier (exponential)
    var difficulty_multiplier = 1.0 + (difficulty_level * 0.5)  # Brutal I = 1.5x, Brutal X = 6.0x
    
    # Enemy stats scale exponentially
    var health_multiplier = difficulty_multiplier * (1.0 + (mile - 100) * 0.1)
    var damage_multiplier = difficulty_multiplier * (1.0 + (mile - 100) * 0.15)
    
    # Enemy level = base level × difficulty multiplier
    var enemy_level = int(base_level * difficulty_multiplier)
    
    return {
        "enemy_level": enemy_level,
        "health_multiplier": health_multiplier,
        "damage_multiplier": damage_multiplier,
        "difficulty_level": difficulty_level
    }
```

**Example Scaling**:
- **Mile 101, Brutal I**: Enemy Level 151, 2.0x health/damage
- **Mile 101, Brutal V**: Enemy Level 303, 5.0x health/damage  
- **Mile 101, Brutal X**: Enemy Level 606, 10.0x health/damage
- **Mile 150, Brutal V**: Enemy Level 450, 7.5x health/damage (scales with mile)

**Enemy Modifications at Brutal Difficulty**:
- **All enemies become Elite** (no regular enemies in Brutal mode)
- **Ability frequency increased**: 2x-3x more frequent special abilities
- **New Brutal Affixes** (like Mythic+ affixes):
  - **Brutal I-III**: "Fortified" (enemies have 20% more health)
  - **Brutal IV-VI**: "Fortified" + "Bursting" (enemies explode on death)
  - **Brutal VII-IX**: "Fortified" + "Bursting" + "Thundering" (periodic AoE damage)
  - **Brutal X**: All affixes + "Tyrannical" (bosses deal 30% more damage)

**Rewards Scale with Difficulty**:
- **Ethereal Essence**: Base drops × Difficulty Level
  - Brutal I: 1-2 essence per enemy
  - Brutal V: 5-10 essence per enemy
  - Brutal X: 10-20 essence per enemy
- **Loot Quality**: Higher difficulty = better loot
  - Brutal I-III: Epic+ guaranteed on elites
  - Brutal IV-VI: Legendary chance increased
  - Brutal VII-X: Legendary+ guaranteed on bosses
- **Item Level**: Scales with difficulty level
  - Brutal I: iLvl = Mile number
  - Brutal V: iLvl = Mile number + 20
  - Brutal X: iLvl = Mile number + 50

**New Enemy Types** (Brutal Mode Exclusive):
- **"Brutal" prefix enemies**: Enhanced versions with brutal affixes
- **"Ethereal" enemies**: Ghostly versions that phase in/out (Mile 120+)
- **"Ascended" bosses**: Boss variants with multiple phases (Mile 150+)
- **"Void" enemies**: New enemy types with void magic (Mile 200+)

**Milestones** (Brutal Mode):
- Mile 110: "Brutal Survivor" achievement
- Mile 125: "Brutal Veteran" achievement
- Mile 150: "Beyond the Veil" achievement
- Mile 200: "Ethereal Explorer" achievement
- Every 25 miles: Bonus prestige currency (scales with difficulty)

**Player Experience**:
- **Clear Warning**: Players know this is BRUTAL before entering
- **Choice Matters**: Difficulty selection is strategic (higher = better rewards but harder)
- **Skill Test**: Only players who mastered Mile 1-100 can survive Brutal I
- **Progression Path**: Players can increase difficulty as they get stronger
- **Prestige Currency**: Ethereal Essence provides new progression goal
- **Optional**: Players can prestige anytime instead of continuing

**Difficulty Recommendation System**:
- Game suggests difficulty based on:
  - Average hero level
  - Equipment quality
  - Previous brutal mode performance
  - Prestige level (if applicable)
- **Default**: Brutal I (recommended for first-time players)
- **Warning**: Selecting Brutal V+ without proper gear = instant death

---

### Phase 3: Prestige System (Enhanced)

**Unlocked**: At Mile 100 (optional, can be done anytime after)

**Prestige Calculation**:
```gdscript
func calculate_prestige_points() -> int:
    var base = 20  # Base points for reaching Mile 100
    var level_bonus = 0
    var equipment_bonus = 0
    var achievement_bonus = 0
    
    # Level bonus: 1 point per 10 total hero levels
    for hero in PartyManager.heroes:
        level_bonus += hero.level / 10
    
    # Equipment bonus: Points for high-quality items
    var epic_count = count_epic_items()
    var legendary_count = count_legendary_items()
    equipment_bonus = (epic_count * 2) + (legendary_count * 5)
    
    # Achievement bonus: 1 point per achievement
    achievement_bonus = AchievementManager.get_unlocked_count()
    
    # Ethereal Essence bonus (from extended content)
    var essence_bonus = get_ethereal_essence() / 10
    
    return base + level_bonus + equipment_bonus + achievement_bonus + essence_bonus
```

**What Resets**:
- ✅ Mile → 0
- ✅ Heroes → Level 1
- ✅ Equipment → Lost (except Prestige Bank items)
- ✅ Talents → Reset (except prestige talent points)
- ✅ Gold → 100 (starting amount)
- ✅ World state → Fresh

**What's Preserved**:
- ✅ Prestige Level (increases)
- ✅ Prestige Points (accumulated)
- ✅ Purchased Upgrades (permanent)
- ✅ Prestige Bank Items (1 item per prestige level)
- ✅ Achievements (permanent)
- ✅ Statistics (permanent record)
- ✅ Ethereal Essence (converted to prestige points)

**Prestige Bank System**:
- **Unlocked**: Prestige Level 3+
- **Mechanics**: Store 1 item per prestige level (max 10 items at Prestige Level 10+)
- **Usage**: Before prestiging, select items to "bank"
- **Effect**: Banked items persist across resets
- **Strategic Depth**: "Do I bank this legendary weapon or this epic chest piece?"

---

### Phase 4: Challenge Modes (Unlocked at Prestige Level 1+)

**Purpose**: Provide variety and alternative progression paths

**Challenge Mode Types**:

#### 1. Boss Rush Mode
- **Unlocked**: Prestige Level 1+
- **Mechanics**: Fight all milestone bosses (Miles 25, 50, 75, 100) back-to-back
- **Rewards**: 
  - Prestige Points: 10
  - Ethereal Essence: 50
  - Exclusive Title: "Boss Slayer"
- **Difficulty**: Bosses scaled to current prestige level
- **Time Limit**: None (but faster = better leaderboard position)

#### 2. Speed Run Mode
- **Unlocked**: Prestige Level 2+
- **Mechanics**: Complete Mile 100 as fast as possible
- **Rewards**:
  - Prestige Points: Based on time (faster = more points)
  - Ethereal Essence: 25
  - Exclusive Title: "Speed Demon" (if under 30 minutes)
- **Difficulty**: Standard enemies, but time pressure
- **Leaderboard**: Track best times per prestige level

#### 3. No-Death Challenge
- **Unlocked**: Prestige Level 3+
- **Mechanics**: Complete Mile 100 without any hero dying
- **Rewards**:
  - Prestige Points: 15
  - Ethereal Essence: 75
  - Exclusive Title: "Perfect Run"
- **Difficulty**: Standard enemies, but no mistakes allowed
- **Failure**: Any hero death = challenge failed, must restart

#### 4. Elite Only Mode
- **Unlocked**: Prestige Level 4+
- **Mechanics**: Only elite enemies spawn (no regular enemies)
- **Rewards**:
  - Prestige Points: 12
  - Ethereal Essence: 100
  - Exclusive Title: "Elite Hunter"
- **Difficulty**: Much harder (elites only), but better loot
- **Loot**: Guaranteed epic+ drops

#### 5. Prestige Rush Mode
- **Unlocked**: Prestige Level 5+
- **Mechanics**: Complete Mile 100 with maximum prestige efficiency
- **Rewards**:
  - Prestige Points: Based on efficiency score
  - Ethereal Essence: 150
  - Exclusive Title: "Prestige Master"
- **Difficulty**: Optimize for prestige points, not speed
- **Scoring**: Points based on total levels, equipment quality, achievements

**Challenge Mode Integration**:
- Accessible from main menu (new "Challenge Modes" button)
- Shows available challenges and requirements
- Tracks completion status and best scores
- Provides alternative progression path (don't need to prestige to access)

---

### Phase 5: Prestige Upgrades (Enhanced)

**Current System**: Basic upgrades exist in `prestige-config.json`

**Enhancements Needed**:

#### Tier 1: Early Prestige (Levels 1-5)
- Gold/XP multipliers (existing)
- Starting item level boost
- Prestige talent points

#### Tier 2: Mid Prestige (Levels 6-10)
- Gear effectiveness bonuses
- Talent cost reduction
- Combat mastery bonuses

#### Tier 3: Late Prestige (Levels 11-20)
- Prestige-exclusive upgrades:
  - **Ethereal Forge**: Upgrade items using Ethereal Essence
  - **Master Craftsman**: Create custom items
  - **Legendary Affinity**: Higher legendary drop chance
  - **Prestige Bank Expansion**: Store 2 items per prestige level

#### Tier 4: Endgame Prestige (Levels 21+)
- Prestige-exclusive content:
  - **Void Realm**: New area unlocked at Prestige Level 25
  - **Ascended Classes**: Prestige variants of classes
  - **Ethereal Equipment**: Prestige-exclusive item sets

**Upgrade Philosophy**:
- **Early**: Quick wins (feel powerful immediately)
- **Mid**: Strategic choices (meaningful decisions)
- **Late**: Long-term goals (aspirational content)

---

## Brutal Mode Implementation Details

### BrutalModeManager.gd (New Autoload)

**Purpose**: Manages brutal difficulty selection, scaling, and affixes

**Key Functions**:
```gdscript
# BrutalModeManager.gd
extends Node

signal brutal_mode_entered(difficulty_level)
signal difficulty_changed(old_level, new_level)

var current_difficulty_level: int = 0  # 0 = Normal (Miles 1-100), 1-10 = Brutal I-X
var brutal_affixes: Array = []

func _ready():
    _log_info("BrutalModeManager", "Initialized")

func select_brutal_difficulty(level: int) -> bool:
    # Validate difficulty level (1-10)
    if level < 1 or level > 10:
        return false
    
    var old_level = current_difficulty_level
    current_difficulty_level = level
    
    # Apply brutal affixes based on level
    brutal_affixes = _get_affixes_for_level(level)
    
    difficulty_changed.emit(old_level, level)
    _log_info("BrutalModeManager", "Brutal difficulty set to Level %d" % level)
    
    return true

func _get_affixes_for_level(level: int) -> Array:
    var affixes = []
    
    if level >= 1:
        affixes.append("Fortified")  # +20% health
    if level >= 4:
        affixes.append("Bursting")   # Explode on death
    if level >= 7:
        affixes.append("Thundering") # Periodic AoE
    if level >= 10:
        affixes.append("Tyrannical") # Bosses +30% damage
    
    return affixes

func calculate_brutal_multipliers(mile: int) -> Dictionary:
    if current_difficulty_level == 0:
        return {"health": 1.0, "damage": 1.0, "level": 1.0}
    
    # Base difficulty multiplier
    var base_multiplier = 1.0 + (current_difficulty_level * 0.5)
    
    # Mile scaling (exponential)
    var mile_scaling = 1.0 + ((mile - 100) * 0.1)
    
    # Health multiplier (higher scaling)
    var health_multiplier = base_multiplier * mile_scaling
    
    # Damage multiplier (slightly higher)
    var damage_multiplier = base_multiplier * (mile_scaling * 1.15)
    
    # Level multiplier
    var level_multiplier = base_multiplier
    
    # Apply affixes
    if brutal_affixes.has("Fortified"):
        health_multiplier *= 1.2
    if brutal_affixes.has("Tyrannical"):
        damage_multiplier *= 1.3  # Only for bosses
    
    return {
        "health": health_multiplier,
        "damage": damage_multiplier,
        "level": level_multiplier
    }

func get_ethereal_essence_drop_rate() -> Dictionary:
    # Returns min/max essence drops based on difficulty
    var base_min = current_difficulty_level
    var base_max = current_difficulty_level * 2
    
    return {
        "min": base_min,
        "max": base_max,
        "elite_min": base_min * 3,
        "elite_max": base_max * 5,
        "boss_min": base_min * 10,
        "boss_max": base_max * 15
    }

func is_brutal_mode() -> bool:
    return current_difficulty_level > 0

func get_difficulty_name(level: int) -> String:
    var names = ["Normal", "Brutal I", "Brutal II", "Brutal III", "Brutal IV", 
                "Brutal V", "Brutal VI", "Brutal VII", "Brutal VIII", "Brutal IX", "Brutal X"]
    if level >= 0 and level < names.size():
        return names[level]
    return "Unknown"
```

### Integration Points

**WorldManager.gd**:
- Check `BrutalModeManager.is_brutal_mode()` when generating enemies
- Apply brutal multipliers to enemy stats
- Force all enemies to elite status in brutal mode

**Enemy Generation**:
```gdscript
# In WorldManager.gd or EnemyGenerator.gd
func generate_enemy_for_mile(mile: int, enemy_data: Dictionary) -> Dictionary:
    var enemy = enemy_data.duplicate()
    
    # Apply brutal mode scaling
    if BrutalModeManager.is_brutal_mode() and mile > 100:
        var multipliers = BrutalModeManager.calculate_brutal_multipliers(mile)
        
        # Scale enemy level
        var base_level = enemy.get("level", 1)
        enemy["level"] = int(base_level * multipliers.level)
        
        # Scale stats
        if enemy.has("stats"):
            enemy["stats"]["health"] = int(enemy["stats"]["health"] * multipliers.health)
            enemy["stats"]["maxHealth"] = enemy["stats"]["health"]
            enemy["stats"]["attack"] = int(enemy["stats"]["attack"] * multipliers.damage)
        
        # Force elite status
        enemy["type"] = "elite"
        
        # Apply brutal affixes
        enemy["brutal_affixes"] = BrutalModeManager.brutal_affixes
    
    return enemy
```

**CombatManager.gd**:
- Check for brutal affixes when enemies die (Bursting)
- Apply periodic damage for Thundering affix
- Scale boss damage for Tyrannical affix

---

## Implementation Plan

### Week 1: Mile 100 Arrival & Prestige Trigger

**Day 1-2: Mile 100 Detection & Celebration**
- [ ] Add `check_mile_100_arrival()` to `WorldManager.gd`
- [ ] Create victory celebration in `World.gd`
- [ ] Trigger final boss fight (War Lord)
- [ ] Post-victory modal dialog

**Day 3-4: Prestige Trigger UI**
- [ ] Create `PrestigeConfirmationDialog.tscn`
- [ ] Show "What you keep" vs "What you gain"
- [ ] Prestige Bank preview (if unlocked)
- [ ] Integrate with `PrestigeManager.gd`

**Day 5: Prestige Calculation**
- [ ] Enhance `calculate_prestige_points()` with full formula
- [ ] Add Ethereal Essence conversion
- [ ] Test prestige point calculation

### Week 2: Extended Content - BRUTAL MODE (Miles 101+)

**Day 1-2: Difficulty Selection System**
- [ ] Create `BrutalModeManager.gd` (handles difficulty selection and scaling)
- [ ] Create `BrutalDifficultyDialog.tscn` (UI for difficulty selection)
- [ ] Implement difficulty level storage (1-10)
- [ ] Add difficulty recommendation system (based on player power)

**Day 2-3: Brutal Scaling System**
- [ ] Update `WorldManager.gd` to support miles > 100
- [ ] Implement `calculate_brutal_difficulty()` formula
- [ ] Modify enemy generation to apply brutal multipliers
- [ ] Update enemy selection: All enemies become elite in Brutal Mode
- [ ] Implement brutal affixes system (Fortified, Bursting, Thundering, Tyrannical)

**Day 4: Ethereal Essence System**
- [ ] Add Ethereal Essence currency to `PrestigeManager.gd`
- [ ] Drop Ethereal Essence from enemies (scales with difficulty level)
- [ ] Display Ethereal Essence in HUD (with difficulty level indicator)
- [ ] Conversion to prestige points on prestige

**Day 5: New Enemy Types & Polish**
- [ ] Create "Brutal" enemy variants in `enemies.json` (enhanced stats)
- [ ] Create "Ethereal" enemy variants (Mile 120+)
- [ ] Create "Ascended" boss variants (Mile 150+)
- [ ] Create "Void" enemy types (Mile 200+)
- [ ] Update `WorldMap.gd` to show "Mile 101+ (Brutal X)" instead of capping at 100
- [ ] Add difficulty change option (with warning)

### Week 3: Prestige Bank & Reset Logic

**Day 1-2: Prestige Bank System**
- [ ] Create `PrestigeBank.gd` manager
- [ ] UI for selecting items to bank
- [ ] Storage system (persist across resets)
- [ ] Integration with `EquipmentManager.gd`

**Day 3-4: Prestige Reset Logic**
- [ ] Implement full reset in `PrestigeManager.perform_prestige()`
- [ ] Reset `WorldManager` (mile → 0)
- [ ] Reset `PartyManager` (heroes → Level 1)
- [ ] Reset `EquipmentManager` (except banked items)
- [ ] Reset `TalentManager` (except prestige points)
- [ ] Preserve achievements and statistics

**Day 5: Testing & Polish**
- [ ] Test full prestige flow
- [ ] Verify banked items persist
- [ ] Test prestige point calculation
- [ ] UI polish and feedback

### Week 4: Challenge Modes

**Day 1-2: Challenge Mode Framework**
- [ ] Create `ChallengeModeManager.gd`
- [ ] Challenge mode selection UI
- [ ] Base challenge mode class

**Day 3-4: Implement Challenge Modes**
- [ ] Boss Rush Mode
- [ ] Speed Run Mode
- [ ] No-Death Challenge
- [ ] Elite Only Mode
- [ ] Prestige Rush Mode

**Day 5: Integration & Testing**
- [ ] Integrate challenge modes with main menu
- [ ] Test all challenge modes
- [ ] Leaderboard system (if time permits)
- [ ] Reward distribution

---

## Player Experience Flow

### First-Time Mile 100 Player

1. **Reaches Mile 100**
   - Final boss fight triggers
   - Victory celebration plays
   - Achievement unlocked: "Mile 100 Champion"
   - Reward: 20,000 gold, 5 talent points, 20 prestige points

2. **Post-Victory Screen**
   - Modal: "Congratulations! You've completed the Road to War!"
   - Options:
     - **Continue Journey** → Extended Content (Miles 101+)
     - **Prestige** → Reset with benefits
     - **Not Now** → Can prestige later

3. **If Continues Journey**:
   - **Difficulty Selection Screen** appears
   - Player chooses Brutal I-X difficulty level
   - **WARNING**: Clear communication that Miles 101+ are BRUTAL
   - Enters Brutal Mode with selected difficulty
   - All enemies become elite-level with brutal affixes
   - Ethereal Essence starts dropping (scales with difficulty)
   - Can prestige anytime from menu
   - Can change difficulty level between miles (with warning)

4. **If Prestiges**:
   - Confirmation dialog shows benefits
   - Select items for Prestige Bank (if unlocked)
   - Prestige performed
   - Returns to Mile 0 with prestige bonuses active
   - Challenge modes unlocked

### Returning Prestige Player

1. **Starts at Mile 0** (with prestige bonuses)
   - Faster progression (XP/gold multipliers)
   - Better starting items (item level boost)
   - Prestige talent points available

2. **Can Access Challenge Modes**
   - From main menu or in-game
   - Alternative progression path
   - Variety and replayability

3. **Optimization Loop**
   - "How fast can I reach 100 this time?"
   - "What's the best prestige point yield?"
   - "Can I complete challenge modes?"

---

## Balance Considerations

### Prestige Point Economy

**Goal**: Make prestige feel rewarding without being overpowered

**Formula** (Recommended):
```
Base Points: 20 (for reaching Mile 100)
+ Level Bonus: Total hero levels / 10
+ Equipment Bonus: (Epic items × 2) + (Legendary items × 5)
+ Achievement Bonus: Unlocked achievements × 1
+ Ethereal Essence: Essence / 10
+ Prestige Level Multiplier: Prestige Level × 1.5
```

**Example Calculations**:
- **First Prestige** (Mile 100, Level 50 heroes, 5 epics, 1 legendary, 10 achievements):
  - Base: 20
  - Levels: 250 / 10 = 25
  - Equipment: (5 × 2) + (1 × 5) = 15
  - Achievements: 10
  - **Total**: 70 points

- **Second Prestige** (with multipliers, faster progress):
  - Base: 20
  - Levels: 300 / 10 = 30 (faster with XP multiplier)
  - Equipment: (8 × 2) + (2 × 5) = 26
  - Achievements: 15
  - Prestige Multiplier: 1 × 1.5 = 1.5x
  - **Total**: 91 × 1.5 = 136 points

### Prestige Upgrade Costs

**Philosophy**: Early upgrades cheap (quick wins), late upgrades expensive (long-term goals)

**Tier 1** (Levels 1-5): 1-5 points per upgrade
**Tier 2** (Levels 6-10): 5-15 points per upgrade
**Tier 3** (Levels 11-20): 15-30 points per upgrade
**Tier 4** (Levels 21+): 30-50+ points per upgrade

### Extended Content Balance (Brutal Mode)

**Enemy Scaling**: 
- **Base Level**: Mile number × Difficulty Multiplier
- **Health/Damage**: Exponential scaling with difficulty level AND mile
- **Formula**: `health = base_health × (1.0 + difficulty_level × 0.5) × (1.0 + (mile - 100) × 0.1)`
- **Example**: Mile 101, Brutal V = 5.0x base health, Mile 150, Brutal V = 7.5x base health

**Ethereal Essence Drop Rate** (scales with difficulty):
- **Brutal I**: 1-2 essence per enemy, 5-10 per elite, 20-30 per boss
- **Brutal V**: 5-10 essence per enemy, 15-25 per elite, 50-75 per boss
- **Brutal X**: 10-20 essence per enemy, 30-50 per elite, 100-150 per boss
- **Mile Scaling**: Every 25 miles = +10% essence drops

**Loot Quality Scaling**:
- **Brutal I-III**: Epic+ guaranteed on elites, 10% legendary chance on bosses
- **Brutal IV-VI**: Legendary chance 25% on elites, 50% on bosses
- **Brutal VII-X**: Legendary guaranteed on elites, Legendary+ on bosses

**Item Level Scaling**:
- **Brutal I**: iLvl = Mile number
- **Brutal V**: iLvl = Mile number + 20
- **Brutal X**: iLvl = Mile number + 50

**Balance Philosophy**:
- **Brutal I**: Should be challenging but achievable for players who completed Mile 100
- **Brutal V**: Requires optimized gear and strategy
- **Brutal X**: Only for players with prestige bonuses and perfect gear
- **Risk/Reward**: Higher difficulty = exponentially better rewards, but exponentially harder enemies

---

## UI/UX Requirements

### Mile 100 Victory Screen

**Layout**:
```
┌─────────────────────────────────────┐
│   ⚔️ VICTORY! ⚔️                    │
├─────────────────────────────────────┤
│                                     │
│   You've completed the Road to War! │
│   Mile 100 Champion                 │
│                                     │
│   Rewards:                          │
│   • 20,000 Gold                     │
│   • 5 Talent Points                 │
│   • 20 Prestige Points              │
│                                     │
│   ┌───────────────────────────────┐ │
│   │ What's Next?                  │ │
│   │                               │ │
│   │ [Continue Journey]            │ │
│   │   ⚠️ BRUTAL MODE              │ │
│   │   Miles 101+ are MUCH harder  │ │
│   │                               │ │
│   │ [Prestige]                    │ │
│   │   Reset for greater power     │ │
│   │                               │ │
│   │ [Not Now]                     │ │
│   └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Brutal Difficulty Selection Dialog

**Layout**:
```
┌─────────────────────────────────────┐
│   ⚠️ BRUTAL MODE SELECTION          │
├─────────────────────────────────────┤
│                                     │
│   WARNING: Miles 101+ are BRUTAL!   │
│   Like going from Normal to         │
│   Mythic+ dungeons!                 │
│                                     │
│   Select Difficulty Level:          │
│   ┌───────────────────────────────┐ │
│   │ [1] Brutal I   ⭐ Recommended │ │
│   │     2.0x Health/Damage        │ │
│   │     All enemies become Elite  │ │
│   │                               │ │
│   │ [2] Brutal II  (Hard)         │ │
│   │ [3] Brutal III (Very Hard)    │ │
│   │ [4] Brutal IV  (Extreme)      │ │
│   │ [5] Brutal V   (Nightmare)    │ │
│   │                               │ │
│   │ [6] Brutal VI  (Hell)         │ │
│   │ [7] Brutal VII (Impossible)   │ │
│   │ [8] Brutal VIII (Beyond)       │ │
│   │ [9] Brutal IX  (Ascended)     │ │
│   │ [10] Brutal X  (Legendary)    │ │
│   └───────────────────────────────┘ │
│                                     │
│   Your Power Level: ████████░░ 80% │
│   Recommended: Brutal I-II         │
│                                     │
│   Rewards Scale with Difficulty!    │
│   • Brutal I:  1-2 Essence/enemy   │
│   • Brutal V:  5-10 Essence/enemy  │
│   • Brutal X:  10-20 Essence/enemy │
│                                     │
│   [Continue] [Prestige Instead]    │
│   [Back]                            │
└─────────────────────────────────────┘
```

### Prestige Confirmation Dialog

**Layout**:
```
┌─────────────────────────────────────┐
│   PRESTIGE AVAILABLE                │
├─────────────────────────────────────┤
│                                     │
│   You've reached Mile 100!          │
│                                     │
│   Prestige Points: 70               │
│   Prestige Level: 0 → 1             │
│                                     │
│   ┌─────────────┬─────────────────┐ │
│   │ YOU KEEP    │ YOU GAIN        │ │
│   ├─────────────┼─────────────────┤ │
│   │ • Prestige  │ • 70 Points     │ │
│   │   Level     │ • Prestige       │ │
│   │ • Upgrades  │   Upgrades       │ │
│   │ • Banked    │ • Challenge      │ │
│   │   Items     │   Modes          │ │
│   │ • Achievements│ • Faster       │ │
│   │ • Stats     │   Progress       │ │
│   └─────────────┴─────────────────┘ │
│                                     │
│   [Continue Journey] [Prestige]     │
│   [Not Now]                         │
└─────────────────────────────────────┘
```

### Prestige Bank UI

**Layout**:
```
┌─────────────────────────────────────┐
│   PRESTIGE BANK                     │
├─────────────────────────────────────┤
│                                     │
│   Select items to preserve:         │
│   (1 slot per prestige level)       │
│                                     │
│   ┌─────┐ ┌─────┐ ┌─────┐         │
│   │Item1│ │Item2│ │Item3│         │
│   └─────┘ └─────┘ └─────┘         │
│                                     │
│   [Confirm] [Cancel]                │
└─────────────────────────────────────┘
```

### Challenge Mode Selector

**Layout**:
```
┌─────────────────────────────────────┐
│   CHALLENGE MODES                   │
├─────────────────────────────────────┤
│                                     │
│   ┌───────────────────────────────┐ │
│   │ Boss Rush                     │ │
│   │ Fight all bosses back-to-back │ │
│   │ Reward: 10 PP, 50 Essence     │ │
│   │ [Start]                       │ │
│   └───────────────────────────────┘ │
│                                     │
│   ┌───────────────────────────────┐ │
│   │ Speed Run                     │ │
│   │ Complete Mile 100 fast        │ │
│   │ Reward: Based on time         │ │
│   │ [Start]                       │ │
│   └───────────────────────────────┘ │
│                                     │
│   [Back]                            │
└─────────────────────────────────────┘
```

---

## Success Metrics

### Player Engagement
- **Retention**: % of players who prestige vs. continue extended content
- **Return Rate**: % of players who return after first prestige
- **Challenge Mode Usage**: % of players who try challenge modes
- **Prestige Depth**: Average prestige level reached

### Balance Metrics
- **Prestige Timing**: Average mile when players prestige (target: 100-150)
- **Prestige Points**: Average points per prestige (target: 50-100)
- **Challenge Completion**: % of players completing each challenge mode
- **Extended Content Engagement**: Average miles reached in extended content

### Player Satisfaction
- **Feedback**: Player surveys on prestige system
- **Complaints**: Common issues reported
- **Optimization**: Are players optimizing prestige timing?

---

## Risks & Mitigation

### Risk 1: Players Don't Want to Prestige
**Mitigation**:
- Make extended content appealing (don't force prestige)
- Clear communication of benefits
- Prestige Bank reduces "loss" feeling
- Challenge modes provide alternative content

### Risk 2: Prestige Feels Too Weak/Strong
**Mitigation**:
- Extensive playtesting of prestige point calculations
- Adjust upgrade costs based on feedback
- Monitor player progression rates
- Iterate based on data

### Risk 3: Extended Content Feels Repetitive OR Too Hard
**Mitigation**:
- **Brutal Difficulty**: Makes it feel like NEW content, not just "more of the same"
- **Difficulty Choice**: Players can select their challenge level
- **New Enemy Types**: Every 25-50 miles introduces new variants
- **Brutal Affixes**: Change gameplay mechanics (not just bigger numbers)
- **Milestone Rewards**: Every 25 miles provides goals
- **Ethereal Essence**: Provides new progression goal
- **Challenge Modes**: Add variety for players who don't want brutal mode
- **Clear Communication**: Players know what they're getting into (brutal = hardcore)

### Risk 4: Challenge Modes Too Hard/Easy
**Mitigation**:
- Scale challenges with prestige level
- Provide difficulty options (if needed)
- Clear requirements and rewards
- Test extensively before launch

---

## Open Questions for Discussion

1. **Prestige Timing**: Should prestige be available before Mile 100, or only at/after?
   - **Recommendation**: Only at/after Mile 100 (preserves milestone feeling)

2. **Prestige Bank**: How many items should players be able to bank?
   - **Recommendation**: 1 per prestige level (max 10 at Prestige Level 10+)

3. **Challenge Mode Rewards**: Should challenge modes give prestige points or only Ethereal Essence?
   - **Recommendation**: Both - Essence for extended content players, points for prestige players

4. **Brutal Mode Difficulty Cap**: Should there be a maximum difficulty level, or can players go beyond Brutal X?
   - **Recommendation**: Start with Brutal X (10 levels), can expand later if needed

5. **Brutal Mode Entry Requirements**: Should players need to complete Mile 100 in a certain time or with certain achievements to unlock higher brutal levels?
   - **Recommendation**: No - all brutal levels available immediately, but game recommends based on power level

6. **Brutal Mode Death Penalty**: Should death in brutal mode have consequences (e.g., lose progress, reset to Mile 100)?
   - **Recommendation**: No - allow retry, but make it clear brutal mode is challenging

7. **Brutal Mode Difficulty Change**: Can players change difficulty mid-journey, or locked in?
   - **Recommendation**: Allow change between miles (with warning), but can't change mid-combat

8. **Prestige Requirements**: Should there be requirements beyond Mile 100?
   - **Recommendation**: No - Mile 100 is sufficient achievement

---

## Next Steps

1. **Review & Approve Design** - Game Director sign-off
2. **Prototype Prestige Flow** - Build basic prestige trigger and reset
3. **Test Prestige Point Calculation** - Verify formula feels rewarding
4. **Create Extended Content** - Implement Miles 101-200+ scaling
5. **Build Challenge Mode Framework** - Start with Boss Rush mode
6. **Iterate Based on Feedback** - Playtest and adjust

---

**Document Status**: Design Complete, Ready for Implementation  
**Next Review**: After Week 1 prototype  
**Owner**: Game Director + Systems Designer


# Dynamic Combat System Design Document

## Overview

This document outlines the design for the core combat mechanics in Road of War, incorporating the enemy types defined in `ENEMY_TYPE_SPECIFICATIONS.md`. The system will enhance the existing real-time combat framework with damage types, enemy archetypes, advanced AI behaviors, and dynamic combat states.

## Architecture Overview

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CombatManager │    │  DamageCalculator│    │ StatusEffects   │
│                 │    │                  │    │   Manager       │
│ - Combat Loop   │◄──►│ - Damage Types   │◄──►│ - Effects       │
│ - State Mgmt    │    │ - Resistances    │    │ - Stacking      │
│ - Turn Logic    │    │ - Calculations   │    │ - Duration      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CombatAI      │    │   EnemyType      │    │   Ability       │
│                 │    │   Manager        │    │   Manager       │
│ - AI Behaviors  │◄──►│ - Type Templates │◄──►│ - Activation    │
│ - Targeting     │    │ - Scaling        │    │ - Cooldowns     │
│ - Adaptation    │    │ - Abilities      │    │ - Effects       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Flow

1. **Combat Initiation**: CombatManager initializes combat with enemy group
2. **Enemy Type Loading**: EnemyTypeManager loads type templates and applies scaling
3. **Real-time Loop**: CombatManager processes attacks based on cooldowns
4. **Damage Calculation**: DamageCalculator applies damage types and resistances
5. **AI Decision Making**: CombatAI selects targets and abilities based on enemy type
6. **Effect Application**: StatusEffectsManager applies and processes effects
7. **State Updates**: Combat states update based on health thresholds and conditions

## 1. Damage Type System

### Damage Types

```gdscript
enum DamageType {
    PHYSICAL,
    MAGICAL,
    FIRE,
    COLD,
    LIGHTNING,
    POISON,
    HOLY,
    SHADOW,
    NATURE,
    EARTH
}
```

### Resistance System

Each combatant has resistance values (-1.0 to 1.0):
- **-1.0**: Takes 200% damage (extreme weakness)
- **0.0**: Normal damage
- **0.5**: Takes 50% damage (moderate resistance)
- **1.0**: Immune (0% damage)

### Damage Calculation Formula

```gdscript
final_damage = base_damage × (1.0 - resistance) × elemental_modifiers × status_modifiers
```

### Resistance Sources

1. **Base Resistances**: From enemy type templates
2. **Equipment**: Hero gear provides resistances
3. **Talents**: Hero talents grant resistances
4. **Status Effects**: Temporary resistance buffs/debuffs
5. **Environmental**: Terrain-based modifiers

## 2. Enemy Type System

### Type Architecture

```gdscript
class EnemyType:
    var id: String
    var name: String
    var base_stats: Dictionary
    var resistances: Dictionary  # DamageType -> float
    var abilities: Array
    var ai_behavior: Dictionary
    var environmental_modifiers: Dictionary
    var scaling_factors: Dictionary
```

### Enemy Types Implementation

#### Dragon Type
- **Core Attributes**: Fire breath, armored scales, winged flight, ancient wisdom
- **Resistances**: High fire resistance (0.8), moderate physical resistance (0.3)
- **AI Strategy**: Aggressive when healthy, defensive when wounded
- **Abilities**: Flame Breath (AoE fire), Wing Buffet (knockback), Dragon's Roar (fear)

#### Undead Type
- **Core Attributes**: Necrotic auras, skeletal minions, death immunity, dark regeneration
- **Resistances**: Immune to necrotic (1.0), weak to holy (-0.5), resistant to poison (0.9)
- **AI Strategy**: Swarm tactics, attrition warfare
- **Abilities**: Necrotic Touch (poison), Raise Dead (summon), Death's Embrace (healing debuff)

#### Demon Type
- **Core Attributes**: Infernal magic, teleportation, soul corruption, demonic resilience
- **Resistances**: High fire/shadow (0.7-0.8), weak to holy (-0.8)
- **AI Strategy**: Hit-and-run tactics, kiting
- **Abilities**: Hellfire Bolt (ranged fire), Shadow Step (teleport), Soul Rend (health debuff)

#### Elemental Type
- **Core Attributes**: Elemental resistances, elemental summoning, environmental adaptation
- **Resistances**: Immune to own element (1.0), weak to opposing element (-0.5)
- **AI Strategy**: Elemental manipulation, environmental control
- **Abilities**: Elemental Blast, Elemental Minion summon, Elemental Surge (buff)

#### Orc Type
- **Core Attributes**: Brute strength, war cries, tribal loyalty, savage combat
- **Resistances**: Moderate physical resistance (0.4), high fear resistance (0.9)
- **AI Strategy**: Aggressive melee, pack tactics
- **Abilities**: Brutal Strike (stun chance), Battle Cry (AoE buff), Savage Charge

#### Troll Type
- **Core Attributes**: Regeneration, voodoo curses, toxic blood, primal magic
- **Resistances**: High poison resistance (0.8), moderate regeneration rate
- **AI Strategy**: Attrition warfare, hit-and-heal tactics
- **Abilities**: Regenerative Strike (self-heal), Voodoo Curse (slow), Toxic Spray (AoE poison)

#### Tauren Type
- **Core Attributes**: Earth-shaking charges, shamanic totems, tribal strength, nature connection
- **Resistances**: Moderate earth/nature resistance (0.6-0.7)
- **AI Strategy**: Area control, positioning for charges
- **Abilities**: Earth Shaker (AoE stun), Totem of Strength (buff totem), Storm Call (lightning AoE)

### Scaling System

```gdscript
scaled_stats = base_stats × (1 + level × scaling_factor) × difficulty_multiplier
scaled_resistances = base_resistances × (1 + level × resistance_scaling)
```

## 3. Ability System Enhancements

### Ability Structure

```gdscript
class Ability:
    var id: String
    var name: String
    var type: AbilityType  # ATTACK, HEAL, BUFF, DEBUFF, SUMMON
    var damage_type: DamageType
    var base_damage: float
    var cooldown: float
    var range: float
    var effects: Array[Effect]
    var ai_hints: Dictionary  # Targeting preferences, usage conditions
```

### Cooldown Management

- **Global Cooldowns**: Prevent ability spam (1.5s base GCD)
- **Ability-specific Cooldowns**: Per ability timers
- **Reset Conditions**: Combat end, phase changes, special events

### Activation System

```gdscript
func can_activate_ability(ability: Ability, combatant: Dictionary) -> bool:
    # Check cooldown
    if get_cooldown_remaining(ability.id) > 0:
        return false
    
    # Check resource costs (mana, energy, etc.)
    if not has_required_resources(ability.resource_cost):
        return false
    
    # Check activation conditions (health %, target requirements, etc.)
    if not meets_activation_conditions(ability.conditions, combatant):
        return false
    
    return true
```

## 4. AI Behavior Patterns

### Behavior State Machine

```gdscript
enum CombatState {
    AGGRO,      # Actively attacking
    FLEEING,    # Running away
    KITING,     # Maintaining distance
    STALKING,   # Following at distance
    DEFENSIVE,  # Protecting self
    OFFENSIVE,  # Aggressive attack
    PASSIVE     # Waiting/idle
}
```

### Type-specific AI Logic

#### Dragon AI
```gdscript
func update_dragon_ai(dragon: Dictionary, combat_time: float):
    var health_pct = dragon.current_health / dragon.max_health
    
    if health_pct > 0.5:
        # Aggressive: Use flame breath, prioritize tank
        state = CombatState.OFFENSIVE
        preferred_ability = "flame_breath"
    elif health_pct > 0.25:
        # Defensive: Use wing buffet, reposition
        state = CombatState.DEFENSIVE
        preferred_ability = "wing_buffet"
    else:
        # Desperate: Use dragon's roar, flee if possible
        state = CombatState.FLEEING
        preferred_ability = "dragon_roar"
```

#### Undead AI
```gdscript
func update_undead_ai(undead: Dictionary, combat_time: float):
    # Always swarm tactics
    state = CombatState.AGGRO
    
    # Prioritize healer, then low health
    target_priority = ["healer", "low_health", "tank", "dps"]
    
    # Summon minions when health low or periodically
    if should_summon_minions(undead):
        preferred_ability = "raise_dead"
    else:
        preferred_ability = "necrotic_touch"
```

### Adaptive AI

- **Learning**: Track damage patterns, adapt targeting
- **Threat Response**: Switch targets based on threat levels
- **Environmental Awareness**: Modify behavior based on terrain
- **Phase Transitions**: Change behavior at health thresholds

## 5. Combat States System

### State Definitions

- **Aggro**: Actively engaged, high threat generation
- **Fleeing**: Moving away, low threat, may drop aggro
- **Kiting**: Maintaining distance, hit-and-run tactics
- **Stalking**: Following but not attacking immediately
- **Defensive**: Protecting self, using defensive abilities
- **Offensive**: Aggressive attack patterns
- **Passive**: Idle, waiting for conditions

### State Transitions

```gdscript
func evaluate_state_transition(combatant: Dictionary) -> CombatState:
    var health_pct = combatant.current_health / combatant.max_health
    var threat_level = get_threat_level(combatant.id)
    var distance_to_target = get_distance_to_target(combatant.id)
    
    match current_state:
        CombatState.AGGRO:
            if health_pct < 0.2:
                return CombatState.FLEEING
            elif distance_to_target > optimal_range * 1.5:
                return CombatState.STALKING
        
        CombatState.FLEEING:
            if health_pct > 0.5 and threat_level < 50:
                return CombatState.AGGRO
        
        # Additional transitions...
```

### State Effects

- **Aggro**: +50% threat generation, -20% damage taken from behind
- **Fleeing**: +100% movement speed, cannot attack, -80% threat generation
- **Kiting**: +30% attack speed, +50% movement speed, -20% damage taken
- **Defensive**: +50% resistances, -30% movement speed, +25% healing received

## 6. Integration with Player Mechanics

### Hero Ability Integration

- **Class-specific Abilities**: Warriors use physical, Mages use magical, etc.
- **Talent Synergies**: Talents enhance damage types or provide resistances
- **Equipment Effects**: Gear provides damage type bonuses and resistances

### Threat System Integration

```gdscript
func calculate_threat(damage: float, damage_type: DamageType, is_crit: bool) -> float:
    var base_threat = damage * threat_multiplier
    
    # Damage type modifiers
    match damage_type:
        DamageType.PHYSICAL: base_threat *= 1.2  # Tanks generate more threat
        DamageType.MAGICAL: base_threat *= 0.8   # Casters generate less threat
    
    # Critical hits generate more threat
    if is_crit:
        base_threat *= 1.5
    
    # Role modifiers
    if hero_role == "tank":
        base_threat *= 1.3
    
    return base_threat
```

### Combat Feedback

- **Visual Indicators**: Damage type colors, resistance indicators
- **Audio Cues**: Different sounds for damage types and combat states
- **UI Updates**: Real-time threat meters, ability cooldowns, combat state displays

## 7. Implementation Approach

### Phase 1: Core Systems
1. Extend DamageCalculator with damage types and resistances
2. Create EnemyTypeManager for type templates
3. Update StatusEffectsManager for type-specific effects

### Phase 2: AI and States
1. Enhance CombatAI with type-specific behaviors
2. Implement CombatState system
3. Add state transition logic

### Phase 3: Integration
1. Update CombatManager for new systems
2. Integrate with hero abilities and equipment
3. Add visual and audio feedback

### Phase 4: Balancing and Testing
1. Balance damage types and resistances
2. Test AI behaviors across all enemy types
3. Performance optimization

### Code Structure

```
road-to-war/scripts/
├── CombatManager.gd          # Enhanced combat loop
├── DamageCalculator.gd       # Damage types & resistances
├── StatusEffectsManager.gd   # Type-specific effects
├── CombatAI.gd              # Enhanced AI behaviors
├── EnemyTypeManager.gd      # NEW: Type templates & scaling
├── AbilityManager.gd         # Enhanced ability system
└── CombatStateManager.gd    # NEW: State management

road-to-war/data/
├── enemy-types.json         # NEW: Type definitions
├── damage-types.json        # NEW: Damage type configs
└── combat-states.json       # NEW: State configurations
```

### Data Schema Updates

#### enemy-types.json
```json
{
  "dragon": {
    "id": "dragon",
    "name": "Dragon",
    "base_stats": {...},
    "resistances": {
      "fire": 0.8,
      "physical": 0.3
    },
    "abilities": [...],
    "ai_behavior": {...},
    "scaling": {...}
  }
}
```

#### damage-types.json
```json
{
  "physical": {
    "name": "Physical",
    "color": "#FFFFFF",
    "icon": "physical_icon",
    "default_resistance": 0.0
  },
  "fire": {
    "name": "Fire",
    "color": "#FF4400",
    "icon": "fire_icon",
    "default_resistance": 0.0
  }
}
```

## 8. Performance Considerations

- **Enemy Type Caching**: Pre-load type templates
- **Resistance Calculations**: Cache computed resistance values
- **AI Updates**: Limit AI processing frequency for performance
- **State Transitions**: Batch state updates to reduce overhead

## 9. Testing Strategy

- **Unit Tests**: Individual system components
- **Integration Tests**: Combat scenarios with different enemy types
- **Balance Testing**: Damage type interactions, AI behaviors
- **Performance Tests**: Combat with multiple enemies

## 10. Future Extensions

- **Advanced AI**: Machine learning for adaptive behaviors
- **Dynamic Environments**: Real-time terrain effects on combat
- **Multiplayer Support**: Synchronized combat states
- **Mod Support**: Custom enemy types and abilities

---

This design provides a comprehensive framework for dynamic combat that scales with the game's progression while maintaining engaging, type-specific encounters.
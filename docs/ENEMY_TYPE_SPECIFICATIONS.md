# Enemy Type Specifications

This document defines the unique attributes, abilities, characteristics, health, damage types, AI behaviors, and environmental interactions for each enemy type in the Road of War combat system.

## Overview

Enemy types serve as archetypes that can be applied to individual enemy instances. Each type provides base stats, abilities, and behaviors that can be scaled by level and difficulty.

## Dragon Type

### Core Attributes
- **Fiery Breath**: Primary ranged attack dealing fire damage in a cone AoE
- **Armored Scales**: High physical defense with fire resistance
- **Winged Flight**: Can move quickly and avoid ground-based attacks
- **Ancient Wisdom**: High intelligence, adaptive AI behavior

### Stats Template (Level 1 Base)
```json
{
  "health": 200,
  "maxHealth": 200,
  "attack": 25,
  "defense": 15,
  "speed": 35,
  "fireResistance": 0.8,
  "physicalResistance": 0.3
}
```

### Abilities
1. **Flame Breath** (Cooldown: 5 turns)
   - Type: AoE Fire Damage
   - Damage: 150% attack power
   - Effect: Burn (10 damage/turn for 3 turns)
   - Range: Cone AoE (all heroes in front)

2. **Wing Buffet** (Cooldown: 8 turns)
   - Type: Physical Attack
   - Damage: 120% attack power
   - Effect: Knockback (pushes target back)
   - Range: Melee

3. **Dragon's Roar** (Cooldown: 12 turns)
   - Type: Debuff
   - Effect: Fear (50% chance to skip turn for 2 turns)
   - Targets: All heroes

### AI Behavior
- **Strategy**: Aggressive when healthy, defensive when wounded
- **Target Priority**: Tank > Healer > DPS > Low Health
- **Movement**: Prefers aerial positioning, uses flight to reposition
- **Adaptiveness**: High - learns from damage patterns

### Environmental Interactions
- **Volcanic Terrain**: +25% fire damage, +10% health regeneration
- **Mountainous Areas**: Can use terrain for ambush attacks
- **Water Areas**: -50% fire damage, increased vulnerability
- **Urban Areas**: Limited flight, prefers ground combat

## Undead Type

### Core Attributes
- **Necrotic Auras**: Constant damage over time effects
- **Skeletal Minions**: Can summon undead reinforcements
- **Death Immunity**: Cannot be killed by normal means, requires special destruction
- **Dark Regeneration**: Heals over time in dark/shadowy areas

### Stats Template (Level 1 Base)
```json
{
  "health": 150,
  "maxHealth": 150,
  "attack": 20,
  "defense": 10,
  "speed": 25,
  "necroticResistance": 1.0,
  "holyResistance": -0.5,
  "poisonResistance": 0.9
}
```

### Abilities
1. **Necrotic Touch** (Cooldown: 3 turns)
   - Type: Melee Attack
   - Damage: 100% attack power
   - Effect: Necrotic Poison (15 damage/turn for 4 turns)

2. **Raise Dead** (Cooldown: 10 turns)
   - Type: Summon
   - Effect: Creates 1-2 skeletal minions
   - Minions: 50% of undead's stats, melee attack only

3. **Death's Embrace** (Cooldown: 15 turns)
   - Type: Debuff
   - Effect: Reduces healing received by 75% for 3 turns
   - Targets: Single hero

### AI Behavior
- **Strategy**: Swarm tactics, attrition warfare
- **Target Priority**: Healer > Low Health > Tank > DPS
- **Movement**: Slow but relentless, ignores pain
- **Adaptiveness**: Medium - focuses on weakening support

### Environmental Interactions
- **Graveyards/Cemeteries**: +50% minion summoning chance, +20% necrotic damage
- **Holy Grounds**: -75% necrotic effects, takes holy damage over time
- **Dark Forests**: +30% regeneration, improved stealth
- **Sunlight**: -25% defense, increased holy vulnerability

## Demon Type

### Core Attributes
- **Infernal Magic**: Fire and shadow-based spellcasting
- **Teleportation**: Can instantly reposition in combat
- **Soul Corruption**: Debuffs that weaken heroes over time
- **Demonic Resilience**: High resistance to most damage types

### Stats Template (Level 1 Base)
```json
{
  "health": 180,
  "maxHealth": 180,
  "attack": 22,
  "defense": 12,
  "speed": 40,
  "fireResistance": 0.7,
  "shadowResistance": 0.8,
  "holyResistance": -0.8
}
```

### Abilities
1. **Hellfire Bolt** (Cooldown: 4 turns)
   - Type: Ranged Magic Attack
   - Damage: 130% attack power (fire)
   - Effect: Burn (8 damage/turn for 3 turns)

2. **Shadow Step** (Cooldown: 6 turns)
   - Type: Movement
   - Effect: Teleport behind target
   - Range: Any visible hero

3. **Soul Rend** (Cooldown: 8 turns)
   - Type: Debuff
   - Effect: Reduces max health by 15% for 5 turns
   - Targets: Single hero

### AI Behavior
- **Strategy**: Hit-and-run tactics, kiting
- **Target Priority**: Healer > DPS > Tank > Low Health
- **Movement**: Teleports frequently to avoid damage
- **Adaptiveness**: Very High - exploits hero weaknesses

### Environmental Interactions
- **Hellish Dimensions**: +100% teleport range, +25% fire damage
- **Sacred Temples**: -50% demonic abilities, takes holy damage
- **Chaotic Battlefields**: +20% critical hit chance
- **Orderly Areas**: -30% movement speed, reduced teleportation

## Elemental Type

### Core Attributes
- **Elemental Resistances**: Immune to their own element, weak to opposing elements
- **Elemental Summoning**: Can call forth elemental minions
- **Environmental Adaptation**: Stats change based on surroundings
- **Pure Elemental Form**: Takes reduced damage from physical attacks

### Stats Template (Level 1 Base)
```json
{
  "health": 160,
  "maxHealth": 160,
  "attack": 18,
  "defense": 8,
  "speed": 30,
  "elementalResistance": 1.0,
  "physicalResistance": 0.5,
  "opposingElementWeakness": -0.5
}
```

### Abilities
1. **Elemental Blast** (Cooldown: 4 turns)
   - Type: Ranged Elemental Attack
   - Damage: 120% attack power (elemental type)
   - Effect: Elemental debuff (varies by element)

2. **Elemental Minion** (Cooldown: 8 turns)
   - Type: Summon
   - Effect: Summons elemental creature
   - Minion: 60% of elemental's stats, elemental attacks

3. **Elemental Surge** (Cooldown: 12 turns)
   - Type: Buff
   - Effect: +50% elemental damage, +25% speed for 3 turns

### AI Behavior
- **Strategy**: Elemental manipulation, environmental control
- **Target Priority**: Based on elemental weaknesses
- **Movement**: Floats/glides, ignores terrain penalties
- **Adaptiveness**: High - adapts to environmental changes

### Environmental Interactions
- **Elemental Planes**: +100% elemental damage, immunity to environmental effects
- **Opposing Elemental Areas**: -75% effectiveness, takes damage over time
- **Neutral Terrain**: Standard performance
- **Chaotic Weather**: +30% elemental power, unpredictable effects

## Orc Type

### Core Attributes
- **Brute Strength**: High physical damage and defense
- **War Cries**: AoE buffs and debuffs
- **Tribal Loyalty**: Can rally nearby orcs
- **Savage Combat**: Prefers close-quarters fighting

### Stats Template (Level 1 Base)
```json
{
  "health": 140,
  "maxHealth": 140,
  "attack": 28,
  "defense": 14,
  "speed": 20,
  "physicalResistance": 0.4,
  "fearResistance": 0.9
}
```

### Abilities
1. **Brutal Strike** (Cooldown: 3 turns)
   - Type: Melee Attack
   - Damage: 150% attack power
   - Effect: 25% chance to stun for 1 turn

2. **Battle Cry** (Cooldown: 6 turns)
   - Type: AoE Buff
   - Effect: +20% attack for all nearby orcs for 3 turns
   - Range: All allies within 10 units

3. **Savage Charge** (Cooldown: 8 turns)
   - Type: Movement + Attack
   - Effect: Charges to target, dealing 200% damage on impact

### AI Behavior
- **Strategy**: Aggressive melee combat, pack tactics
- **Target Priority**: Tank > DPS > Healer > Low Health
- **Movement**: Direct and aggressive
- **Adaptiveness**: Medium - focuses on overwhelming with numbers

### Environmental Interactions
- **Tribal Lands**: +25% attack, +15% defense, can summon reinforcements
- **Civilized Areas**: -20% effectiveness, increased vulnerability to tactics
- **Forested Terrain**: +15% stealth, ambush capabilities
- **Open Plains**: +20% charge damage, improved movement

## Troll Type

### Core Attributes
- **Regeneration**: Heals over time, especially when damaged
- **Voodoo Curses**: Debuff-focused abilities
- **Toxic Blood**: Damages attackers when hit
- **Primal Magic**: Nature and curse-based spells

### Stats Template (Level 1 Base)
```json
{
  "health": 130,
  "maxHealth": 130,
  "attack": 16,
  "defense": 10,
  "speed": 28,
  "poisonResistance": 0.8,
  "regenerationRate": 5
}
```

### Abilities
1. **Regenerative Strike** (Cooldown: 4 turns)
   - Type: Melee Attack
   - Damage: 110% attack power
   - Effect: Heals self for 50% of damage dealt

2. **Voodoo Curse** (Cooldown: 6 turns)
   - Type: Debuff
   - Effect: Reduces attack speed by 50% for 3 turns
   - Targets: Single hero

3. **Toxic Spray** (Cooldown: 8 turns)
   - Type: AoE Poison
   - Damage: 80% attack power to all heroes
   - Effect: Poison (12 damage/turn for 3 turns)

### AI Behavior
- **Strategy**: Attrition warfare, hit-and-heal tactics
- **Target Priority**: Healer > DPS > Tank > Low Health
- **Movement**: Kiting when low health, aggressive when healthy
- **Adaptiveness**: High - uses regeneration to outlast opponents

### Environmental Interactions
- **Jungle/Swamp**: +40% regeneration, +20% poison damage, stealth bonuses
- **Desert/Arid**: -50% regeneration, increased vulnerability
- **Toxic Areas**: +30% poison effects, environmental synergy
- **Clean Environments**: -25% effectiveness, reduced regeneration

## Tauren Type

### Core Attributes
- **Earth-Shaking Charges**: Powerful charging attacks
- **Shamanic Totems**: Can place buffs and debuffs
- **Tribal Strength**: High health and defense
- **Nature Connection**: Earth and storm-based abilities

### Stats Template (Level 1 Base)
```json
{
  "health": 170,
  "maxHealth": 170,
  "attack": 24,
  "defense": 16,
  "speed": 22,
  "earthResistance": 0.6,
  "natureResistance": 0.7
}
```

### Abilities
1. **Earth Shaker** (Cooldown: 5 turns)
   - Type: Charge Attack
   - Damage: 180% attack power
   - Effect: Stuns all nearby heroes for 1 turn

2. **Totem of Strength** (Cooldown: 8 turns)
   - Type: Summon Buff Totem
   - Effect: +25% attack for all allies within 8 units for 4 turns
   - Duration: 4 turns

3. **Storm Call** (Cooldown: 10 turns)
   - Type: AoE Lightning
   - Damage: 140% attack power to all heroes
   - Effect: 30% chance to stun each target

### AI Behavior
- **Strategy**: Area control, positioning for charges
- **Target Priority**: Groups > Tank > DPS > Healer
- **Movement**: Strategic positioning for charge attacks
- **Adaptiveness**: Medium-High - uses totems to control battlefield

### Environmental Interactions
- **Plains/Steppes**: +30% charge damage, +20% movement speed
- **Mountainous Terrain**: +25% earth damage, totem bonuses
- **Stormy Weather**: +50% lightning damage, improved storm abilities
- **Urban/Confined**: -40% charge effectiveness, limited totem placement

## Implementation Notes

### Scaling Factors
- **Health**: Base * (1 + level * 0.5) * difficulty_multiplier
- **Attack**: Base * (1 + level * 0.3) * difficulty_multiplier
- **Defense**: Base * (1 + level * 0.2) * difficulty_multiplier
- **Speed**: Base * (1 + level * 0.1) (capped at reasonable maximums)

### Difficulty Multipliers
- **Normal**: 1.0
- **Hard**: 1.5
- **Brutal**: 2.0
- **Mythic**: 3.0

### AI Difficulty Scaling
- **Normal**: Standard behaviors
- **Hard**: +20% ability usage, improved targeting
- **Brutal**: Adaptive learning, combo abilities
- **Mythic**: Perfect prediction, environmental manipulation

### Environmental System Integration
Each enemy type should check current biome/terrain and apply modifiers:
- Damage multipliers
- Resistance changes
- Ability enhancements/reductions
- Special environmental abilities unlock

This specification provides a foundation for implementing diverse and engaging enemy encounters that feel unique and strategically interesting.
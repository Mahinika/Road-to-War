# WotLK Class Ability Audit - Road of War

**Date**: 2026-01-XX  
**Reference**: Wowhead WotLK Classic  
**Purpose**: Cross-reference our implemented abilities against WotLK to identify gaps and ensure authentic rotations

---

## Summary

- **Total Classes**: 9 (Paladin, Warrior, Priest, Mage, Rogue, Warlock, Hunter, Shaman, Druid)
- **Current Abilities**: ~140 total abilities across all classes
- **Status**: Core abilities present, but missing many rotational and utility spells

---

## Class-by-Class Analysis

### 🛡️ PALADIN

#### ✅ Currently Implemented (14 abilities)
- Judgment
- Consecration
- Lay on Hands
- Divine Shield
- Holy Shield
- Avenger's Shield
- Holy Light
- Holy Shock
- Crusader Strike
- Divine Storm
- Avenging Wrath
- Divine Favor
- Flash of Light
- Righteous Fury
- Seal of Vengeance

#### ❌ Missing Critical Abilities

**Protection (Tank):**
- **Hammer of Wrath** - Execute-style finisher, high threat
- **Righteous Defense** - Taunt ability (CRITICAL for tanking)
- **Hand of Reckoning** - Ranged taunt
- **Sacred Shield** - Absorb shield, key tank cooldown
- **Ardent Defender** - Passive damage reduction
- **Divine Protection** - 50% damage reduction (different from Divine Shield)

**Holy (Healer):**
- **Beacon of Light** - Transfers healing to beacon target (WotLK signature ability)
- **Sacred Shield** - Absorb shield with HoT component
- **Light of Dawn** - Cone heal (WotLK addition)
- **Divine Plea** - Mana regen cooldown
- **Aura Mastery** - Aura enhancement cooldown

**Retribution (DPS):**
- **Hammer of Wrath** - Execute finisher
- **Exorcism** - Undead/demon nuke
- **Seal of Light/Seal of Wisdom** - Resource generation seals
- **Repentance** - CC ability
- **Hand of Freedom** - Movement speed buff (utility)

**Core Missing:**
- **Seal System** - Seals should be toggleable buffs that modify Judgment
- **Aura System** - Auras should be persistent party buffs (Devotion Aura, Retribution Aura, etc.)

**Priority**: 🔴 HIGH - Missing taunts (Righteous Defense) breaks tanking. Beacon of Light is signature Holy ability.

---

### ⚔️ WARRIOR

#### ✅ Currently Implemented (17 abilities)
- Charge
- Rend
- Shield Slam
- Bloodthirst
- Mortal Strike
- Shield Block
- Thunder Clap
- Bladestorm
- Devastate
- Overpower
- Rampage
- Recklessness
- Revenge
- Shield Wall
- Sweeping Strikes
- Whirlwind

#### ❌ Missing Critical Abilities

**Protection (Tank):**
- **Taunt** - Basic taunt ability (CRITICAL)
- **Challenging Shout** - AoE taunt
- **Shockwave** - AoE stun (WotLK addition)
- **Spell Reflection** - Reflects next spell
- **Last Stand** - Emergency HP boost
- **Concussion Blow** - Stun + threat
- **Vigilance** - Threat transfer to another party member

**Arms (DPS):**
- **Execute** - Execute finisher (CRITICAL for rotation)
- **Slam** - Filler ability
- **Sweeping Strikes** - Already have, but needs proper cleave mechanics
- **Colossus Smash** - Armor debuff (WotLK addition, but may be Cata)
- **Rend** - Already have, but needs proper DoT refresh logic

**Fury (DPS):**
- **Execute** - Execute finisher
- **Heroic Strike** - Rage dump
- **Slam** - Filler
- **Cleave** - AoE rage dump
- **Berserker Rage** - Removes fear/sap, rage gen

**Core Missing:**
- **Stance System** - Battle/Defensive/Berserker stances should modify abilities
- **Rage Generation** - Needs proper auto-attack rage gen mechanics

**Priority**: 🔴 HIGH - Missing Execute breaks DPS rotations. Missing Taunt breaks tanking.

---

### ⚕️ PRIEST

#### ✅ Currently Implemented (15 abilities)
- Smite
- Holy Fire
- Greater Heal
- Renew
- Power Word: Shield
- Circle of Healing
- Divine Hymn
- Mind Blast
- Pain Suppression
- Penance
- Prayer of Healing
- Rapture
- Shadow Word: Pain
- Shadowform
- Vampiric Touch

#### ❌ Missing Critical Abilities

**Holy (Healer):**
- **Flash Heal** - Fast, efficient heal (different from Greater Heal)
- **Guardian Spirit** - Prevents death, increases healing received
- **Lightwell** - Placeable healing totem
- **Chakra** - Stance system (may be Cata, verify)
- **Binding Heal** - Heals caster + target
- **Desperate Prayer** - Self-heal cooldown

**Discipline (Healer):**
- **Power Word: Fortitude** - Stamina buff (CRITICAL party buff)
- **Inner Fire** - Armor buff
- **Prayer of Mending** - Bouncing heal (WotLK signature)
- **Pain Suppression** - Already have, but needs proper mechanics
- **Divine Aegis** - Absorb shield from crit heals
- **Rapture** - Already have, but needs proper mana return mechanics

**Shadow (DPS):**
- **Devouring Plague** - Shadow DoT with self-heal
- **Dispersion** - Damage reduction + mana regen cooldown
- **Mind Flay** - Channeled filler spell
- **Shadowfiend** - Summon pet for mana
- **Silence** - Interrupt ability

**Core Missing:**
- **Power Word: Fortitude** - Should be castable on party (party buff system)
- **Inner Fire** - Self-buff system
- **Prayer of Mending** - Bouncing heal mechanics

**Priority**: 🟡 MEDIUM - Missing some signature abilities but core rotation exists.

---

### 🔮 MAGE

#### ✅ Currently Implemented (16 abilities)
- Fireball
- Frostbolt
- Arcane Blast
- Counterspell
- Pyroblast
- Arcane Explosion
- Ice Block
- Arcane Barrage
- Arcane Power
- Combustion
- Deep Freeze
- Ice Lance
- Icy Veins
- Living Bomb
- Presence of Mind

#### ❌ Missing Critical Abilities

**Arcane (DPS):**
- **Arcane Missiles** - Channeled filler (CRITICAL for rotation)
- **Arcane Intellect** - Party buff (CRITICAL)
- **Mage Armor** - Self-buff
- **Evocation** - Mana regen cooldown
- **Mana Shield** - Absorb damage for mana
- **Slow Fall** - Utility

**Fire (DPS):**
- **Scorch** - Fast cast, applies debuff
- **Fire Blast** - Instant nuke
- **Blast Wave** - AoE with knockback
- **Dragon's Breath** - Cone AoE with disorient
- **Molten Armor** - Self-buff

**Frost (DPS):**
- **Blizzard** - Ground-targeted AoE
- **Frost Nova** - Root AoE
- **Frost Armor** - Self-buff
- **Cold Snap** - Resets cooldowns
- **Ice Barrier** - Absorb shield

**Core Missing:**
- **Arcane Intellect** - Party buff system
- **Armor Buffs** - Mage Armor/Frost Armor/Molten Armor should be toggleable
- **Polymorph** - CC ability (utility)

**Priority**: 🟡 MEDIUM - Missing Arcane Missiles hurts Arcane rotation. Missing party buffs.

---

### 🗡️ ROGUE

#### ✅ Currently Implemented (14 abilities)
- Sinister Strike
- Eviscerate
- Mutilate
- Kick
- Evasion
- Adrenaline Rush
- Backstab
- Envenom
- Hemorrhage
- Killing Spree
- Preparation
- Shadow Dance
- Vanish
- Vendetta

#### ❌ Missing Critical Abilities

**Assassination (DPS):**
- **Poison System** - Poisons should be applied to weapons (Deadly Poison, Instant Poison)
- **Garrote** - Stealth opener with silence
- **Ambush** - Stealth opener with high damage
- **Rupture** - Finisher DoT
- **Cold Blood** - Crit chance cooldown

**Combat (DPS):**
- **Blade Flurry** - Cleave ability
- **Adrenaline Rush** - Already have, but needs proper mechanics
- **Killing Spree** - Already have, but needs proper mechanics
- **Riposte** - Parry counter-attack
- **Sprint** - Movement speed

**Subtlety (DPS):**
- **Stealth** - Should be a toggleable state
- **Sap** - CC ability
- **Cheap Shot** - Stun opener
- **Shadowstep** - Teleport behind target
- **Premeditation** - Combo point generation

**Core Missing:**
- **Combo Point System** - Needs proper tracking and finisher mechanics
- **Stealth System** - Should be toggleable, affects opener abilities
- **Poison System** - Weapon poisons should be applied and proc
- **Energy Regeneration** - Needs proper energy tick system

**Priority**: 🔴 HIGH - Missing combo point system breaks core rotation. Missing stealth breaks Subtlety.

---

### 👹 WARLOCK

#### ✅ Currently Implemented (14 abilities)
- Shadow Bolt
- Corruption
- Seed of Corruption
- Unstable Affliction
- Chaos Bolt
- Demonbolt
- Drain Soul
- Hand of Guldan
- Haunt
- Havoc
- Incinerate
- Inferno
- Metamorphosis
- Summon Demon

#### ❌ Missing Critical Abilities

**Affliction (DPS):**
- **Drain Life** - Channeled self-heal
- **Drain Mana** - Channeled mana drain
- **Curse of Agony** - Curse DoT
- **Curse of Elements** - Debuff curse (party utility)
- **Dark Pact** - Mana from pet
- **Soul Swap** - Transfers DoTs (may be Cata)

**Demonology (DPS):**
- **Demonic Circle** - Teleport circle
- **Soul Link** - Damage sharing with pet
- **Felguard** - Pet summon (different from generic demon)
- **Demonic Empowerment** - Pet buff
- **Metamorphosis** - Already have, but needs proper form mechanics

**Destruction (DPS):**
- **Conflagrate** - Consumes Immolate, instant cast
- **Immolate** - Fire DoT (CRITICAL for Destro rotation)
- **Soul Fire** - Execute-style nuke
- **Shadowburn** - Execute finisher
- **Chaos Bolt** - Already have, but needs proper mechanics

**Core Missing:**
- **Pet System** - Warlocks should have persistent pets (Imp, Voidwalker, Succubus, Felhunter, Felguard)
- **Curse System** - Curses should be debuffs with different effects
- **Soul Shard System** - Some abilities should consume soul shards
- **Life Tap** - Convert HP to mana (signature ability)

**Priority**: 🔴 HIGH - Missing pet system breaks Demonology. Missing Immolate breaks Destruction rotation.

---

### 🏹 HUNTER

#### ✅ Currently Implemented (13 abilities)
- Aimed Shot
- Steady Shot
- Explosive Trap
- Beast Within
- Bestial Wrath
- Black Arrow
- Call Pet
- Chimera Shot
- Explosive Shot
- Kill Command
- Lock and Load
- Trueshot Aura
- Wyvern Sting

#### ❌ Missing Critical Abilities

**Beast Mastery (DPS):**
- **Kill Command** - Already have, but needs pet interaction
- **Bestial Wrath** - Already have, but needs pet interaction
- **Intimidation** - Pet stun
- **Beast Mastery** - Pet damage buff passive
- **Mend Pet** - Heal pet ability

**Marksmanship (DPS):**
- **Multi-Shot** - AoE shot
- **Aimed Shot** - Already have, but needs proper cast time mechanics
- **Trueshot Aura** - Already have, but needs party buff mechanics
- **Silencing Shot** - Interrupt
- **Readiness** - Resets cooldowns

**Survival (DPS):**
- **Explosive Shot** - Already have, but needs DoT component
- **Black Arrow** - Already have, but needs proper mechanics
- **Serpent Sting** - DoT ability
- **Wyvern Sting** - Already have, but needs CC mechanics
- **Trap Launcher** - Allows traps at range

**Core Missing:**
- **Pet System** - Hunters should have persistent pets with abilities
- **Aspect System** - Aspects should be toggleable buffs (Aspect of the Hawk, Aspect of the Cheetah, etc.)
- **Trap System** - Traps should be placeable ground effects
- **Ammunition System** - May not be needed, but was in WotLK

**Priority**: 🔴 HIGH - Missing pet system breaks Beast Mastery. Missing Aspect system breaks core gameplay.

---

### ⚡ SHAMAN

#### ✅ Currently Implemented (13 abilities)
- Lightning Bolt
- Lava Burst
- Earth Shock
- Chain Heal
- Chain Lightning
- Elemental Mastery
- Healing Wave
- Lava Lash
- Mana Tide Totem
- Riptide
- Shamanistic Rage
- Stormstrike
- Thunderstorm
- Windfury

#### ❌ Missing Critical Abilities

**Elemental (DPS):**
- **Flame Shock** - Fire DoT (CRITICAL for Lava Burst)
- **Frost Shock** - Slow + damage
- **Lightning Shield** - Self-buff, procs on melee hits
- **Thunderstorm** - Already have, but needs knockback mechanics
- **Elemental Mastery** - Already have, but needs proper mechanics

**Enhancement (DPS):**
- **Stormstrike** - Already have, but needs proper mechanics
- **Windfury Weapon** - Weapon enchant (CRITICAL)
- **Flametongue Weapon** - Weapon enchant
- **Earthliving Weapon** - Healing weapon enchant
- **Lava Lash** - Already have, but needs proper mechanics
- **Shamanistic Rage** - Already have, but needs mana return mechanics

**Restoration (Healer):**
- **Earth Shield** - Absorb shield on target
- **Riptide** - Already have, but needs HoT component
- **Healing Stream Totem** - Healing totem
- **Mana Spring Totem** - Mana regen totem
- **Nature's Swiftness** - Instant cast cooldown

**Core Missing:**
- **Totem System** - Shaman should place totems that provide persistent effects
- **Weapon Enchant System** - Windfury/Flametongue should be applied to weapons
- **Shock System** - Earth/Frost/Flame Shock should share cooldown
- **Maelstrom Weapon** - Stacking buff system

**Priority**: 🔴 HIGH - Missing totem system breaks core Shaman identity. Missing Flame Shock breaks Elemental rotation.

---

### 🌿 DRUID

#### ✅ Currently Implemented (12 abilities)
- Wrath
- Starfire
- Rejuvenation
- Feral Bite
- Eclipse
- Frenzied Regeneration
- Mangle
- Regrowth
- Starfall
- Survival Instincts
- Swipe
- Tranquility
- Wild Growth

#### ❌ Missing Critical Abilities

**Balance (DPS):**
- **Moonfire** - DoT ability (CRITICAL for rotation)
- **Insect Swarm** - DoT ability
- **Starfall** - Already have, but needs proper mechanics
- **Eclipse** - Already have, but needs proper proc mechanics
- **Hurricane** - Channeled AoE
- **Force of Nature** - Summon treants

**Feral (DPS/Tank):**
- **Shred** - Stealth/behind opener
- **Rake** - DoT opener
- **Rip** - Finisher DoT
- **Ferocious Bite** - Already have, but needs proper mechanics
- **Mangle** - Already have, but needs proper mechanics
- **Swipe** - Already have, but needs proper mechanics
- **Frenzied Regeneration** - Already have, but needs proper mechanics
- **Survival Instincts** - Already have, but needs proper mechanics
- **Lacerate** - Tank threat ability
- **Maul** - Tank threat ability

**Restoration (Healer):**
- **Lifebloom** - Stacking HoT (CRITICAL for WotLK)
- **Swiftmend** - Instant heal, consumes HoT
- **Nourish** - Efficient heal
- **Wild Growth** - Already have, but needs proper mechanics
- **Innervate** - Mana regen cooldown
- **Nature's Swiftness** - Instant cast cooldown

**Core Missing:**
- **Form System** - Druids should have forms (Bear, Cat, Moonkin, Tree of Life)
- **Shape-shifting** - Should be toggleable, affects available abilities
- **Lifebloom Stacking** - HoT stacking mechanics
- **Eclipse Procs** - Balance rotation depends on Eclipse procs

**Priority**: 🔴 HIGH - Missing form system breaks Druid identity. Missing Moonfire breaks Balance rotation.

---

## System-Level Gaps

### 🔴 CRITICAL Missing Systems

1. **Taunt System**
   - Warriors: Taunt, Challenging Shout
   - Paladins: Righteous Defense, Hand of Reckoning
   - Druids: Growl (pet ability)
   - **Impact**: Tanks cannot hold threat properly

2. **Pet System**
   - Hunters: Persistent pets with abilities
   - Warlocks: Demon pets (Imp, Voidwalker, Succubus, Felhunter, Felguard)
   - **Impact**: Breaks Beast Mastery Hunter and Demonology Warlock

3. **Form/Stance System**
   - Druids: Bear, Cat, Moonkin, Tree of Life forms
   - Warriors: Battle, Defensive, Berserker stances
   - Rogues: Stealth state
   - **Impact**: Breaks core class identity

4. **Party Buff System**
   - Mages: Arcane Intellect
   - Priests: Power Word: Fortitude
   - Paladins: Auras (Devotion, Retribution, etc.)
   - Hunters: Aspects (should affect party)
   - **Impact**: Missing core party utility

5. **Totem System** (Shaman)
   - Placeable totems with persistent effects
   - **Impact**: Breaks Shaman core identity

6. **Weapon Enchant System** (Shaman)
   - Windfury Weapon, Flametongue Weapon, etc.
   - **Impact**: Breaks Enhancement Shaman

7. **Combo Point System** (Rogue)
   - Proper combo point generation and finisher mechanics
   - **Impact**: Breaks Rogue rotation

8. **Curse System** (Warlock)
   - Curse of Agony, Curse of Elements, etc.
   - **Impact**: Missing utility and rotation elements

9. **Seal System** (Paladin)
   - Seals should modify Judgment
   - **Impact**: Missing Paladin core mechanic

10. **Execute System** (Warrior)
    - Execute finisher at low HP
    - **Impact**: Missing DPS rotation finisher

### 🟡 MEDIUM Priority Missing Systems

1. **DoT Refresh Logic**
   - Should not overwrite stronger DoTs
   - Should refresh duration if weaker
   - **Impact**: Affects all DoT classes

2. **Interrupt System**
   - Proper interrupt mechanics and cooldowns
   - **Impact**: Missing utility

3. **CC System**
   - Polymorph, Sap, Wyvern Sting, etc.
   - **Impact**: Missing utility

4. **Ground-Targeted Abilities**
   - Consecration, Blizzard, Explosive Trap placement
   - **Impact**: Some abilities need proper placement

---

## Recommended Implementation Priority

### Phase 1: Critical Systems (Blocks Core Gameplay)
1. ✅ Taunt System (Warrior, Paladin)
2. ✅ Execute System (Warrior)
3. ✅ Pet System (Hunter, Warlock)
4. ✅ Form/Stance System (Druid, Warrior, Rogue)
5. ✅ Combo Point System (Rogue)

### Phase 2: Core Class Identity (High Impact)
6. ✅ Totem System (Shaman)
7. ✅ Weapon Enchant System (Shaman)
8. ✅ Seal System (Paladin)
9. ✅ Party Buff System (All classes)
10. ✅ Curse System (Warlock)

### Phase 3: Rotation Completion (Medium Impact)
11. ✅ Missing rotational abilities (Moonfire, Immolate, Flame Shock, etc.)
12. ✅ DoT refresh logic
13. ✅ Ground-targeted abilities
14. ✅ CC system

### Phase 4: Polish (Low Impact)
15. ✅ Utility abilities (Sprint, Slow Fall, etc.)
16. ✅ Cosmetic/Flavor abilities

---

## Notes

- This audit is based on WotLK Classic abilities as documented on Wowhead
- Some abilities may have been added in later expansions (Cata, MoP) - verify before implementing
- Focus on abilities that affect **rotations** and **core gameplay** first
- Utility abilities can be added later without breaking gameplay

---

## Next Steps

1. **Verify** this list against actual Wowhead WotLK data
2. **Prioritize** based on current gameplay needs
3. **Implement** Phase 1 systems first (taunts, pets, forms)
4. **Test** rotations after each system implementation
5. **Iterate** based on gameplay feel

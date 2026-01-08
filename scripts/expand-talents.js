import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target the Godot data path
const talentsPath = path.join(__dirname, '../road-to-war/data/talents.json');
const data = JSON.parse(fs.readFileSync(talentsPath, 'utf8'));

// Expanded talent definitions for each tree
const expandedTalents = {
  paladin: {
    holy: [
      { id: "improved_healing_light", name: "Improved Healing Light", maxPoints: 3, row: 1, column: 3, effects: { healingBonus: 0.04 }, desc: "Increases healing done by spells by 4% per point" },
      { id: "divine_fury", name: "Divine Fury", maxPoints: 5, row: 2, column: 2, effects: { castTimeReduction: 0.1 }, desc: "Reduces cast time of Holy Light and Flash of Light by 10% per point" },
      { id: "holy_guidance", name: "Holy Guidance", maxPoints: 5, row: 3, column: 1, prereq: { talentId: "spiritual_focus", pointsRequired: 3 }, effects: { spellPowerBonus: 0.2 }, desc: "Increases spell power by 20% of your Intellect per point" },
      { id: "improved_lay_on_hands", name: "Improved Lay on Hands", maxPoints: 2, row: 3, column: 3, prereq: { talentId: "seals_of_the_pure", pointsRequired: 3 }, effects: { cooldownReduction: 300 }, desc: "Reduces cooldown of Lay on Hands by 5 minutes per point" },
      { id: "aura_mastery", name: "Aura Mastery", maxPoints: 1, row: 4, column: 2, prereq: { talentId: "illumination", pointsRequired: 5 }, effects: { auraEffectBonus: 2.0, duration: 6 }, desc: "Increases the effect of your auras by 100% for 6 seconds" },
      { id: "divine_illumination", name: "Divine Illumination", maxPoints: 1, row: 5, column: 1, prereq: { talentId: "blessed_life", pointsRequired: 3 }, effects: { manaCostReduction: 0.5, duration: 15 }, desc: "Reduces mana cost of spells by 50% for 15 seconds" },
      { id: "beacon_of_light", name: "Beacon of Light", maxPoints: 1, row: 6, column: 2, prereq: { talentId: "holy_power", pointsRequired: 5 }, effects: { healingTransfer: 1.0 }, desc: "Transfers 100% of healing done to the beacon target" },
      { id: "holy_shock", name: "Holy Shock", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "beacon_of_light", pointsRequired: 1 }, effects: { damage: 0.4, healing: 0.4 }, desc: "Instantly deals 40% spell power damage or healing" }
    ],
    protection: [
      { id: "improved_devotion_aura", name: "Improved Devotion Aura", maxPoints: 5, row: 1, column: 3, effects: { armorBonus: 0.1 }, desc: "Increases armor from Devotion Aura by 10% per point" },
      { id: "redoubt", name: "Redoubt", maxPoints: 3, row: 2, column: 1, prereq: { talentId: "anticipation", pointsRequired: 3 }, effects: { blockChanceBonus: 0.1 }, desc: "Increases block chance by 10% per point when struck" },
      { id: "one_handed_weapon_specialization", name: "One-Handed Weapon Specialization", maxPoints: 5, row: 3, column: 1, prereq: { talentId: "redoubt", pointsRequired: 3 }, effects: { damageBonus: 0.05 }, desc: "Increases damage with one-handed weapons by 5% per point" },
      { id: "ardent_defender", name: "Ardent Defender", maxPoints: 5, row: 5, column: 2, prereq: { talentId: "shield_of_the_templar", pointsRequired: 3 }, Proxy: { damageReduction: 0.3 }, desc: "Reduces damage taken by 30% when below 35% health per point" },
      { id: "improved_holy_shield", name: "Improved Holy Shield", maxPoints: 3, row: 6, column: 2, prereq: { talentId: "ardent_defender", pointsRequired: 5 }, effects: { blockChanceBonus: 0.1, damageBonus: 0.15 }, desc: "Increases block chance by 10% and damage by 15% per point for Holy Shield" },
      { id: "avenger_s_shield", name: "Avenger's Shield", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "improved_holy_shield", pointsRequired: 3 }, effects: { damage: 0.5, silenceDuration: 3 }, desc: "Hurls a shield dealing 50% spell power damage and silencing for 3 seconds" }
    ],
    retribution: [
      { id: "sanctified_retribution", name: "Sanctified Retribution", maxPoints: 2, row: 5, column: 3, effects: { damageBonus: 0.02 }, desc: "Increases damage done by 2% per point" },
      { id: "crusade", name: "Crusade", maxPoints: 3, row: 7, column: 2, effects: { damageBonus: 0.03 }, desc: "Increases damage done to Humanoids, Demons, and Undead by 3% per point" },
      { id: "divine_storm", name: "Divine Storm", maxPoints: 1, row: 9, column: 2, effects: { damage: 1.1, targets: 4, heal: 0.25 }, desc: "An instant weapon attack that deals 110% weapon damage to up to 4 enemies and heals up to 3 party members" }
    ]
  },
  warrior: {
    arms: [
      { id: "mortal_strike", name: "Mortal Strike", maxPoints: 1, row: 5, column: 2, effects: { damage: 1.1, healingReduction: 0.5 }, desc: "A strike that deals 110% weapon damage and reduces healing received by 50%" },
      { id: "sweeping_strikes", name: "Sweeping Strikes", maxPoints: 1, row: 6, column: 2, prereq: { talentId: "mortal_strike", pointsRequired: 1 }, effects: { extraTarget: 1, duration: 10 }, desc: "Your melee attacks strike an additional nearby opponent for 10 seconds" },
      { id: "blade_storm", name: "Bladestorm", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "improved_mortal_strike", pointsRequired: 2 }, effects: { damage: 1.5, radius: 8, duration: 6 }, desc: "Become an unstoppable whirlwind, dealing 150% weapon damage to all nearby enemies for 6 seconds" }
    ],
    fury: [
      { id: "death_wish", name: "Death Wish", maxPoints: 1, row: 5, column: 2, effects: { damageBonus: 0.2, damageTaken: 0.05, duration: 30 }, desc: "Increases damage by 20% and damage taken by 5% for 30 seconds" },
      { id: "rampage", name: "Rampage", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "flurry", pointsRequired: 5 }, effects: { attackPowerBonus: 0.1, duration: 10 }, desc: "Increases attack power by 10% for 10 seconds after killing an enemy" },
      { id: "titan_s_grip", name: "Titan's Grip", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "rampage", pointsRequired: 1 }, effects: { allowTwoHandInOneHand: true }, desc: "Allows you to equip two-handed axes, maces and swords in one hand" }
    ]
  },
  mage: {
    arcane: [
      { id: "arcane_impact", name: "Arcane Impact", maxPoints: 3, row: 2, column: 3, effects: { critChanceBonus: 0.02 }, desc: "Increases critical strike chance of Arcane Blast and Arcane Explosion by 2% per point" },
      { id: "arcane_meditation", name: "Arcane Meditation", maxPoints: 3, row: 3, column: 2, prereq: { talentId: "arcane_concentration", pointsRequired: 5 }, effects: { manaRegenBonus: 0.1 }, desc: "Allows 10% of mana regeneration to continue while casting per point" },
      { id: "presence_of_mind", name: "Presence of Mind", maxPoints: 1, row: 5, column: 2, prereq: { talentId: "arcane_meditation", pointsRequired: 3 }, effects: { instantCast: true, duration: 15 }, desc: "When activated, your next spell with a cast time less than 10 seconds becomes instant cast" },
      { id: "arcane_power", name: "Arcane Power", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "presence_of_mind", pointsRequired: 1 }, effects: { damageBonus: 0.3, manaCostIncrease: 0.3, duration: 15 }, desc: "When activated, you deal 30% more spell damage but all spells cost 30% more mana" }
    ],
    fire: [
      { id: "flame_throwing", name: "Flame Throwing", maxPoints: 2, row: 2, column: 1, effects: { rangeBonus: 3 }, desc: "Increases range of Fire spells by 3 yards per point" },
      { id: "pyroblast", name: "Pyroblast", maxPoints: 1, row: 5, column: 2, prereq: { talentId: "ignite", pointsRequired: 5 }, effects: { damage: 2.5, dotDamage: 0.4 }, desc: "Hurls an immense fiery boulder dealing massive damage and additional fire damage over 12 seconds" },
      { id: "blast_wave", name: "Blast Wave", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "pyroblast", pointsRequired: 1 }, effects: { damage: 0.6, slowAmount: 0.5, duration: 6 }, desc: "A wave of flame radiates from the caster, dealing fire damage and slowing enemies by 50% for 6 seconds" },
      { id: "combustion", name: "Combustion", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "blast_wave", pointsRequired: 1 }, effects: { critChanceIncreasePerSpell: 0.1 }, desc: "When activated, each fire damage spell you cast increases your critical strike chance with Fire spells by 10%" }
    ],
    frost: [
      { id: "piercing_ice", name: "Piercing Ice", maxPoints: 3, row: 2, column: 1, effects: { damageBonus: 0.02 }, desc: "Increases the damage of your Frost spells by 2% per point" },
      { id: "icy_veins", name: "Icy Veins", maxPoints: 1, row: 3, column: 1, prereq: { talentId: "improved_frostbolt", pointsRequired: 5 }, effects: { hasteBonus: 0.2, pushbackReduction: 1.0, duration: 20 }, desc: "Increases spell casting speed by 20% and prevents pushback for 20 seconds" },
      { id: "ice_block", name: "Ice Block", maxPoints: 1, row: 5, column: 2, prereq: { talentId: "icy_veins", pointsRequired: 1 }, effects: { immunity: true, duration: 10 }, desc: "You become encased in a block of ice, protecting you from all physical and spell damage for 10 seconds" },
      { id: "ice_barrier", name: "Ice Barrier", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "ice_block", pointsRequired: 1 }, effects: { absorbAmount: 0.5, duration: 60 }, desc: "Shields you from damage, absorbing a large amount of physical and spell damage" }
    ]
  },
  hunter: {
    beast_mastery: [
      { id: "unleashed_fury", name: "Unleashed Fury", maxPoints: 5, row: 2, column: 2, effects: { petDamage: 0.04 }, desc: "Increases the damage dealt by your pets by 4% per point" },
      { id: "ferocity", name: "Ferocity", maxPoints: 5, row: 3, column: 2, prereq: { talentId: "unleashed_fury", pointsRequired: 5 }, effects: { petCritChance: 0.02 }, desc: "Increases the critical strike chance of your pets by 2% per point" },
      { id: "intimidation", name: "Intimidation", maxPoints: 1, row: 5, column: 2, prereq: { talentId: "ferocity", pointsRequired: 5 }, effects: { petStun: true, duration: 3 }, desc: "Command your pet to intimidate the target, stunning it for 3 seconds" },
      { id: "bestial_wrath", name: "Bestial Wrath", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "intimidation", pointsRequired: 1 }, effects: { petDamage: 0.5, duration: 10 }, desc: "Send your pet into a rage, increasing damage by 50% for 10 seconds" }
    ],
    marksmanship: [
      { id: "mortal_shots", name: "Mortal Shots", maxPoints: 5, row: 3, column: 2, prereq: { talentId: "lethal_shots", pointsRequired: 5 }, effects: { rangedCritDamage: 0.06 }, desc: "Increases the critical strike damage bonus of your ranged weapons by 6% per point" },
      { id: "aimed_shot", name: "Aimed Shot", maxPoints: 1, row: 5, column: 2, prereq: { talentId: "mortal_shots", pointsRequired: 5 }, effects: { damage: 1.5, castTime: 3.0 }, desc: "An aimed shot that deals 150% ranged weapon damage" },
      { id: "trueshot_aura", name: "Trueshot Aura", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "aimed_shot", pointsRequired: 1 }, effects: { attackPowerBonus: 50 }, desc: "Increases the attack power of party members by 50" }
    ],
    survival: [
      { id: "surefooted", name: "Surefooted", maxPoints: 3, row: 2, column: 3, effects: { hitChance: 0.01, resistSnareChance: 0.05 }, desc: "Increases hit chance by 1% and chance to resist movement impairing effects by 5% per point" },
      { id: "deterrence", name: "Deterrence", maxPoints: 1, row: 3, column: 2, effects: { dodgeChance: 0.25, parryChance: 0.25, duration: 10 }, desc: "Increases your Dodge and Parry chance by 25% for 10 seconds" },
      { id: "wyvern_sting", name: "Wyvern Sting", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "deterrence", pointsRequired: 1 }, effects: { sleepDuration: 12, dotDamage: 0.2 }, desc: "Stings the target, putting it to sleep for 12 seconds. After the sleep, deals poison damage over 6 seconds" }
    ]
  },
  rogue: {
    assassination: [
      { id: "lethality", name: "Lethality", maxPoints: 5, row: 2, column: 3, prereq: { talentId: "malice", pointsRequired: 5 }, effects: { critDamageBonus: 0.06 }, desc: "Increases the critical strike damage bonus of your Sinister Strike, Backstab, and Mutilate by 6% per point" },
      { id: "cold_blood", name: "Cold Blood", maxPoints: 1, row: 5, column: 2, effects: { guaranteedCrit: true }, desc: "When activated, increases the critical strike chance of your next offensive ability by 100%" },
      { id: "mutilate", name: "Mutilate", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "cold_blood", pointsRequired: 1 }, effects: { damage: 1.2 }, desc: "Instantly attacks with both weapons, dealing 120% weapon damage" }
    ],
    combat: [
      { id: "riposte", name: "Riposte", maxPoints: 1, row: 3, column: 3, prereq: { talentId: "deflection", pointsRequired: 5 }, effects: { damage: 1.0, disarm: 6 }, desc: "A strike that deals 100% weapon damage and disarms the target for 6 seconds after parrying" },
      { id: "blade_flurry", name: "Blade Flurry", maxPoints: 1, row: 5, column: 2, effects: { attackSpeed: 0.2, extraTarget: 1, duration: 15 }, desc: "Increases attack speed by 20% and attacks strike an additional nearby opponent for 15 seconds" },
      { id: "adrenaline_rush", name: "Adrenaline Rush", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "blade_flurry", pointsRequired: 1 }, effects: { energyRegen: 1.0, duration: 15 }, desc: "Increases your Energy regeneration rate by 100% for 15 seconds" },
      { id: "killing_spree", name: "Killing Spree", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "adrenaline_rush", pointsRequired: 1 }, effects: { damage: 1.0, attacks: 5 }, desc: "Step through the shadows from enemy to enemy, attacking 5 times for 100% weapon damage" }
    ]
  },
  druid: {
    balance: [
      { id: "nature_s_grasp", name: "Nature's Grasp", maxPoints: 1, row: 1, column: 1, effects: { entangleChance: 1.0 }, desc: "Gives a 100% chance to entangle enemies that strike the caster" },
      { id: "improved_moonfire", name: "Improved Moonfire", maxPoints: 2, row: 2, column: 3, effects: { damageBonus: 0.1 }, desc: "Increases damage and critical strike chance of Moonfire by 10% per point" },
      { id: "moonfury", name: "Moonfury", maxPoints: 5, row: 5, column: 2, effects: { damageBonus: 0.1 }, desc: "Increases damage dealt by Starfire, Moonfire and Wrath by 10% per point" },
      { id: "moonkin_form", name: "Moonkin Form", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "moonfury", pointsRequired: 5 }, effects: { armorBonus: 4.0, spellCritBonus: 0.05 }, desc: "Transforms the Druid into Moonkin Form, increasing armor by 400% and spell critical strike chance by 5%" },
      { id: "starfall", name: "Starfall", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "moonkin_form", pointsRequired: 1 }, effects: { damage: 0.8, targets: 5, duration: 10 }, desc: "Calls down stars from the sky, dealing arcane damage to all nearby enemies over 10 seconds" }
    ],
    feral: [
      { id: "feral_instinct", name: "Feral Instinct", maxPoints: 3, row: 2, column: 1, effects: { threatBonus: 0.15 }, desc: "Increases threat generated in Bear form by 15% per point" },
      { id: "feral_swiftness", name: "Feral Instinct", maxPoints: 2, row: 3, column: 2, effects: { movementSpeed: 0.3 }, desc: "Increases movement speed in Cat form by 30%" },
      { id: "mangle", name: "Mangle", maxPoints: 1, row: 7, column: 2, effects: { damage: 1.15, bleedBonus: 0.3 }, desc: "Mangle the target for 115% weapon damage and increases bleed damage by 30%" }
    ],
    restoration: [
      { id: "improved_mark_of_the_wild", name: "Improved Mark of the Wild", maxPoints: 5, row: 1, column: 2, effects: { statBonus: 0.1 }, desc: "Increases effect of Mark of the Wild by 10% per point" },
      { id: "nature_s_swiftness", name: "Nature's Swiftness", maxPoints: 1, row: 5, column: 3, effects: { instantCast: true }, desc: "When activated, your next Nature spell becomes an instant cast" },
      { id: "tree_of_life", name: "Tree of Life", maxPoints: 1, row: 7, column: 2, effects: { healingBonus: 0.15, manaReduction: 0.2 }, desc: "Transforms the Druid into a Tree of Life, increasing healing by 15% and reducing mana cost by 20%" },
      { id: "wild_growth", name: "Wild Growth", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "tree_of_life", pointsRequired: 1 }, effects: { healing: 0.5, targets: 5 }, desc: "Heals up to 5 party members over 7 seconds" }
    ]
  },
  shaman: {
    elemental: [
      { id: "call_of_flame", name: "Call of Flame", maxPoints: 3, row: 3, column: 1, effects: { damageBonus: 0.15 }, desc: "Increases damage of Fire Totems and Fire spells by 15% per point" },
      { id: "elemental_mastery", name: "Elemental Mastery", maxPoints: 1, row: 5, column: 2, effects: { instantCast: true, critChance: 1.0 }, desc: "When activated, your next Fire, Frost, or Nature damage spell becomes instant and has a 100% crit chance" },
      { id: "thunderstorm", name: "Thunderstorm", maxPoints: 1, row: 9, column: 2, effects: { damage: 0.6, knockback: true, manaReturn: 0.08 }, desc: "Calls down a bolt of lightning, dealing damage, knocking back enemies and returning 8% mana" }
    ],
    enhancement: [
      { id: "flurry", name: "Flurry", maxPoints: 5, row: 4, column: 2, effects: { attackSpeed: 0.3 }, desc: "Increases attack speed by 30% for 3 swings after critical hit" },
      { id: "dual_wield", name: "Dual Wield", maxPoints: 1, row: 5, column: 2, effects: { allowOffhandWeapon: true }, desc: "Allows one-handed and off-hand weapons to be equipped in the off-hand slot" },
      { id: "feral_spirit", name: "Feral Spirit", maxPoints: 1, row: 9, column: 2, effects: { summonWolves: 2, duration: 30 }, desc: "Summons two Spirit Wolves to aid the Shaman for 30 seconds" }
    ],
    restoration: [
      { id: "healing_way", name: "Healing Way", maxPoints: 3, row: 3, column: 1, effects: { healingBonus: 0.25 }, desc: "Increases amount healed by Healing Wave by 25% per point" },
      { id: "mana_tide_totem", name: "Mana Tide Totem", maxPoints: 1, row: 5, column: 2, effects: { manaRegen: 0.06, duration: 12 }, desc: "Summons a Mana Tide Totem that restores 6% of total mana every 3 seconds to the party" },
      { id: "riptide", name: "Riptide", maxPoints: 1, row: 9, column: 2, effects: { healing: 0.4, hot: 0.6 }, desc: "Instantly heals the target and additional healing over 15 seconds" }
    ]
  },
  priest: {
    holy: [
      { id: "circle_of_healing", name: "Circle of Healing", maxPoints: 1, row: 8, column: 2, effects: { healAmount: 0.3 }, desc: "Heals up to 5 party members for 30% of spell power" },
      { id: "guardian_spirit", name: "Guardian Spirit", maxPoints: 1, row: 9, column: 2, effects: { healingBonus: 0.4, duration: 10 }, desc: "Increases healing received by 40% for 10 seconds, prevents death once" }
    ],
    discipline: [
      { id: "power_infusion", name: "Power Infusion", maxPoints: 1, row: 7, column: 2, effects: { hasteBonus: 0.2, manaCostReduction: 0.2, duration: 15 }, desc: "Increases haste by 20% and reduces mana cost by 20% for 15 seconds" },
      { id: "pain_suppression", name: "Pain Suppression", maxPoints: 1, row: 8, column: 2, effects: { damageReduction: 0.4, duration: 8 }, desc: "Reduces damage taken by 40% for 8 seconds" },
      { id: "penance", name: "Penance", maxPoints: 1, row: 9, column: 2, effects: { damage: 0.6, healing: 0.6 }, desc: "Channels 3 bolts dealing 60% spell power damage or healing" }
    ],
    shadow: [
      { id: "shadowform", name: "Shadowform", maxPoints: 1, row: 7, column: 3, effects: { shadowDamageBonus: 0.15, damageReduction: 0.15 }, desc: "Increases shadow damage by 15% and reduces damage taken by 15%" },
      { id: "vampiric_touch", name: "Vampiric Touch", maxPoints: 1, row: 9, column: 2, effects: { damage: 0.5, duration: 15, manaReturn: 0.05 }, desc: "Deals 50% spell power damage over 15 seconds and returns 5% mana" },
      { id: "dispersion", name: "Dispersion", maxPoints: 1, row: 10, column: 2, effects: { damageReduction: 0.9, manaRegenBonus: 0.06, duration: 6 }, desc: "Reduces damage by 90% and regenerates 6% mana per second for 6 seconds" }
    ]
  },
  warlock: {
    affliction: [
      { id: "improved_corruption", name: "Improved Corruption", maxPoints: 5, row: 1, column: 2, effects: { castTimeReduction: 0.4 }, desc: "Reduces cast time of Corruption by 0.4s per point" },
      { id: "siphon_life", name: "Siphon Life", maxPoints: 1, row: 4, column: 2, effects: { damage: 0.2, heal: 1.0 }, desc: "Transfers health from the enemy to the warlock every 3 seconds" },
      { id: "unstable_affliction", name: "Unstable Affliction", maxPoints: 1, row: 7, column: 2, effects: { damage: 0.6, dispelPenalty: 1.5 }, desc: "Shadow energy slowly destroys the target, dealing damage over 15 seconds. If dispelled, causes massive damage and silences" },
      { id: "haunt", name: "Haunt", maxPoints: 1, row: 9, column: 2, effects: { damage: 0.4, heal: 1.0, dotBonus: 0.2 }, desc: "Sends a ghost to haunt the target, dealing damage and increasing all DoT damage on the target by 20%" }
    ],
    demonology: [
      { id: "demonic_embrace", name: "Demonic Embrace", maxPoints: 5, row: 1, column: 3, effects: { staminaBonus: 0.03 }, desc: "Increases Stamina by 3% per point" },
      { id: "fel_guard", name: "Summon Felguard", maxPoints: 1, row: 7, column: 2, effects: { summonFelguard: true }, desc: "Summons a powerful Felguard to aid the Warlock" },
      { id: "metamorphosis", name: "Metamorphosis", maxPoints: 1, row: 9, column: 2, effects: { damageBonus: 0.2, armorBonus: 6.0, duration: 30 }, desc: "Transforms into a Demon for 30 seconds, increasing damage by 20% and armor by 600%" }
    ],
    destruction: [
      { id: "shadow_burn", name: "Shadowburn", maxPoints: 1, row: 3, column: 3, effects: { damage: 0.8 }, desc: "Instantly blasts the target for shadow damage" },
      { id: "conflagrate", name: "Conflagrate", maxPoints: 1, row: 7, column: 2, effects: { damage: 1.0 }, desc: "Ignites an Immolate or Unstable Affliction effect on the enemy, dealing instant fire damage" },
      { id: "chaos_bolt", name: "Chaos Bolt", maxPoints: 1, row: 9, column: 2, effects: { damage: 1.4, bypassResistance: true }, desc: "Sends a bolt of chaotic fire that deals massive damage and cannot be resisted" }
    ]
  }
};

// Function to add talents to a tree
function addTalentsToTree(tree, talents) {
  talents.forEach(talent => {
    const talentObj = {
      id: talent.id,
      name: talent.name,
      maxPoints: talent.maxPoints,
      row: talent.row,
      column: talent.column,
      prerequisite: talent.prereq || null,
      effects: talent.effects,
      description: talent.desc
    };
    tree.talents[talent.id] = talentObj;
  });
}

// Add expanded talents to each tree
Object.keys(expandedTalents).forEach(className => {
  Object.keys(expandedTalents[className]).forEach(treeName => {
    if (data[className] && data[className].trees && data[className].trees[treeName]) {
      addTalentsToTree(data[className].trees[treeName], expandedTalents[className][treeName]);
    } else {
      console.warn(`Could not find tree ${treeName} for class ${className}`);
    }
  });
});

// Write back to file
fs.writeFileSync(talentsPath, JSON.stringify(data, null, 2));

// Count total talents
let total = 0;
Object.keys(data).forEach(cls => {
  Object.keys(data[cls].trees).forEach(tree => {
    total += Object.keys(data[cls].trees[tree].talents).length;
  });
});

console.log(`Successfully expanded talents.json! Total talents across all classes: ${total}`);

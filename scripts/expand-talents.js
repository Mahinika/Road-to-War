const fs = require('fs');
const path = require('path');

const talentsPath = path.join(__dirname, '../public/data/talents.json');
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
      { id: "holy_shock", name: "Holy Shock", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "beacon_of_light", pointsRequired: 1 }, effects: { damage: 0.4, healing: 0.4 }, desc: "Instantly deals 40% spell power damage or healing" },
      { id: "light_s_grace", name: "Light's Grace", maxPoints: 3, row: 4, column: 3, prereq: { talentId: "illumination", pointsRequired: 3 }, effects: { castTimeReduction: 0.5 }, desc: "Reduces cast time of next Holy Light by 0.5 seconds per point after casting Flash of Light" },
      { id: "holy_light_mastery", name: "Holy Light Mastery", maxPoints: 5, row: 5, column: 3, prereq: { talentId: "holy_shock", pointsRequired: 1 }, effects: { critChanceBonus: 0.02 }, desc: "Increases critical strike chance of Holy Light by 2% per point" },
      { id: "purifying_power", name: "Purifying Power", maxPoints: 2, row: 6, column: 1, prereq: { talentId: "divine_illumination", pointsRequired: 1 }, effects: { cooldownReduction: 30 }, desc: "Reduces cooldown of Purify and Cleanse by 30 seconds per point" },
      { id: "infusion_of_light", name: "Infusion of Light", maxPoints: 2, row: 6, column: 3, prereq: { talentId: "beacon_of_light", pointsRequired: 1 }, effects: { castTimeReduction: 1.0 }, desc: "Reduces cast time of next Holy Light by 1 second per point after critical Flash of Light" },
      { id: "enlightened_judgments", name: "Enlightened Judgments", maxPoints: 2, row: 7, column: 1, prereq: { talentId: "holy_shock", pointsRequired: 1 }, effects: { rangeBonus: 10 }, desc: "Increases range of Judgment by 10 yards per point" },
      { id: "judgments_of_the_pure", name: "Judgments of the Pure", maxPoints: 3, row: 7, column: 3, prereq: { talentId: "holy_shock", pointsRequired: 1 }, effects: { hasteBonus: 0.15 }, desc: "Increases haste by 15% per point for 1 minute after using Judgment" },
      { id: "divine_sacrifice", name: "Divine Sacrifice", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "judgments_of_the_pure", pointsRequired: 3 }, effects: { damageTransfer: 0.3, duration: 10 }, desc: "Transfers 30% of damage taken by party to you for 10 seconds" }
    ],
    protection: [
      { id: "improved_devotion_aura", name: "Improved Devotion Aura", maxPoints: 5, row: 1, column: 3, effects: { armorBonus: 0.1 }, desc: "Increases armor from Devotion Aura by 10% per point" },
      { id: "redoubt", name: "Redoubt", maxPoints: 3, row: 2, column: 1, prereq: { talentId: "anticipation", pointsRequired: 3 }, effects: { blockChanceBonus: 0.1 }, desc: "Increases block chance by 10% per point when struck" },
      { id: "reckoning", name: "Reckoning", maxPoints: 5, row: 2, column: 3, prereq: { talentId: "toughness", pointsRequired: 2 }, effects: { extraAttackChance: 0.2 }, desc: "Gives 20% chance per point to gain an extra attack after being struck" },
      { id: "one_handed_weapon_specialization", name: "One-Handed Weapon Specialization", maxPoints: 5, row: 3, column: 1, prereq: { talentId: "redoubt", pointsRequired: 3 }, effects: { damageBonus: 0.05 }, desc: "Increases damage with one-handed weapons by 5% per point" },
      { id: "improved_righteous_fury", name: "Improved Righteous Fury", maxPoints: 3, row: 3, column: 3, prereq: { talentId: "blessing_of_sanctuary", pointsRequired: 1 }, effects: { threatBonus: 0.16 }, desc: "Increases threat generated by Righteous Fury by 16% per point" },
      { id: "shield_of_the_templar", name: "Shield of the Templar", maxPoints: 3, row: 4, column: 2, prereq: { talentId: "blessing_of_sanctuary", pointsRequired: 1 }, effects: { blockValueBonus: 0.1 }, desc: "Increases block value by 10% per point" },
      { id: "ardent_defender", name: "Ardent Defender", maxPoints: 5, row: 5, column: 2, prereq: { talentId: "shield_of_the_templar", pointsRequired: 3 }, effects: { damageReduction: 0.3 }, desc: "Reduces damage taken by 30% when below 35% health per point" },
      { id: "spell_warding", name: "Spell Warding", maxPoints: 5, row: 5, column: 1, prereq: { talentId: "one_handed_weapon_specialization", pointsRequired: 5 }, effects: { magicDamageReduction: 0.04 }, desc: "Reduces all spell damage taken by 4% per point" },
      { id: "blessed_hands", name: "Blessed Hands", maxPoints: 2, row: 5, column: 3, prereq: { talentId: "improved_righteous_fury", pointsRequired: 3 }, effects: { dispelChance: 0.1 }, desc: "Increases chance to dispel magic effects by 10% per point" },
      { id: "improved_holy_shield", name: "Improved Holy Shield", maxPoints: 3, row: 6, column: 2, prereq: { talentId: "ardent_defender", pointsRequired: 5 }, effects: { blockChanceBonus: 0.1, damageBonus: 0.15 }, desc: "Increases block chance by 10% and damage by 15% per point for Holy Shield" },
      { id: "combat_expertise", name: "Combat Expertise", maxPoints: 5, row: 6, column: 1, prereq: { talentId: "spell_warding", pointsRequired: 5 }, effects: { staminaBonus: 0.06, threatBonus: 0.02 }, desc: "Increases Stamina by 6% and threat by 2% per point" },
      { id: "touched_by_the_light", name: "Touched by the Light", maxPoints: 3, row: 6, column: 3, prereq: { talentId: "blessed_hands", pointsRequired: 2 }, effects: { spellPowerBonus: 0.3 }, desc: "Increases spell power by 30% of your Strength per point" },
      { id: "avenger_s_shield", name: "Avenger's Shield", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "improved_holy_shield", pointsRequired: 3 }, effects: { damage: 0.5, silenceDuration: 3 }, desc: "Hurls a shield dealing 50% spell power damage and silencing for 3 seconds" },
      { id: "guarded_by_the_light", name: "Guarded by the Light", maxPoints: 2, row: 7, column: 1, prereq: { talentId: "combat_expertise", pointsRequired: 5 }, effects: { manaRegenBonus: 0.1 }, desc: "Increases mana regeneration by 10% per point while in combat" },
      { id: "shield_of_righteousness", name: "Shield of Righteousness", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "avenger_s_shield", pointsRequired: 1 }, effects: { damage: 1.3 }, desc: "A powerful shield strike dealing 130% of shield block value as damage" }
    ],
    retribution: [
      { id: "deflection", name: "Deflection", maxPoints: 5, row: 1, column: 3, effects: { parryChanceBonus: 0.01 }, desc: "Increases parry chance by 1% per point" },
      { id: "benediction", name: "Benediction", maxPoints: 5, row: 2, column: 1, prereq: { talentId: "divine_strength", pointsRequired: 5 }, effects: { manaCostReduction: 0.1 }, desc: "Reduces mana cost of instant cast spells by 10% per point" },
      { id: "improved_seal_of_the_crusader", name: "Improved Seal of the Crusader", maxPoints: 5, row: 2, column: 3, prereq: { talentId: "deflection", pointsRequired: 3 }, effects: { attackPowerBonus: 0.1 }, desc: "Increases attack power bonus from Seal of the Crusader by 10% per point" },
      { id: "conviction", name: "Conviction", maxPoints: 5, row: 3, column: 1, prereq: { talentId: "benediction", pointsRequired: 5 }, effects: { critChanceBonus: 0.01 }, desc: "Increases chance to crit with weapons by 1% per point" },
      { id: "pursuit_of_justice", name: "Pursuit of Justice", maxPoints: 2, row: 3, column: 3, prereq: { talentId: "improved_seal_of_the_crusader", pointsRequired: 5 }, effects: { movementSpeedBonus: 0.15 }, desc: "Increases movement speed by 15% per point" },
      { id: "eye_for_an_eye", name: "Eye for an Eye", maxPoints: 2, row: 4, column: 1, prereq: { talentId: "conviction", pointsRequired: 5 }, effects: { reflectDamage: 0.1 }, desc: "Reflects 10% of spell damage taken back to attacker per point" },
      { id: "improved_retribution_aura", name: "Improved Retribution Aura", maxPoints: 2, row: 4, column: 3, prereq: { talentId: "pursuit_of_justice", pointsRequired: 2 }, effects: { damageBonus: 0.25 }, desc: "Increases damage from Retribution Aura by 25% per point" },
      { id: "two_handed_weapon_specialization", name: "Two-Handed Weapon Specialization", maxPoints: 3, row: 5, column: 1, prereq: { talentId: "eye_for_an_eye", pointsRequired: 2 }, effects: { damageBonus: 0.06 }, desc: "Increases damage with two-handed weapons by 6% per point" },
      { id: "sanctified_retribution", name: "Sanctified Retribution", maxPoints: 2, row: 5, column: 3, prereq: { talentId: "improved_retribution_aura", pointsRequired: 2 }, effects: { damageBonus: 0.02 }, desc: "Increases damage done by 2% per point" },
      { id: "vengeance", name: "Vengeance", maxPoints: 5, row: 6, column: 2, prereq: { talentId: "sanctity_aura", pointsRequired: 1 }, effects: { damageBonus: 0.03 }, desc: "Increases damage by 3% per point after dealing a critical strike" },
      { id: "sanctified_wrath", name: "Sanctified Wrath", maxPoints: 3, row: 6, column: 1, prereq: { talentId: "two_handed_weapon_specialization", pointsRequired: 3 }, effects: { critChanceBonus: 0.05 }, desc: "Increases critical strike chance by 5% per point during Avenging Wrath" },
      { id: "swift_retribution", name: "Swift Retribution", maxPoints: 1, row: 6, column: 3, prereq: { talentId: "sanctified_retribution", pointsRequired: 2 }, effects: { hasteBonus: 0.03 }, desc: "Increases haste by 3% for party members within 30 yards" },
      { id: "crusade", name: "Crusade", maxPoints: 3, row: 7, column: 2, prereq: { talentId: "vengeance", pointsRequired: 5 }, effects: { damageBonus: 0.03 }, desc: "Increases damage done to Humanoids, Demons, and Undead by 3% per point" },
      { id: "art_of_war", name: "Art of War", maxPoints: 2, row: 7, column: 1, prereq: { talentId: "sanctified_wrath", pointsRequired: 3 }, effects: { instantCastChance: 0.2 }, desc: "Gives 20% chance per point for Exorcism and Flash of Light to be instant cast after melee critical" },
      { id: "repentance", name: "Repentance", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "crusade", pointsRequired: 3 }, effects: { duration: 6 }, desc: "Puts enemy to sleep for 6 seconds" }
    ]
  },
  warrior: {
    arms: [
      { id: "deflection", name: "Deflection", maxPoints: 5, row: 1, column: 2, effects: { parryChanceBonus: 0.01 }, desc: "Increases parry chance by 1% per point" },
      { id: "improved_rend", name: "Improved Rend", maxPoints: 3, row: 1, column: 3, effects: { damageBonus: 0.15 }, desc: "Increases damage done by Rend by 15% per point" },
      { id: "improved_charge", name: "Improved Charge", maxPoints: 2, row: 2, column: 1, prereq: { talentId: "improved_heroic_strike", pointsRequired: 3 }, effects: { rageBonus: 5 }, desc: "Increases rage generated by Charge by 5 per point" },
      { id: "iron_will", name: "Iron Will", maxPoints: 5, row: 2, column: 3, prereq: { talentId: "improved_rend", pointsRequired: 3 }, effects: { resistChanceBonus: 0.03 }, desc: "Increases chance to resist stun and charm by 3% per point" },
      { id: "improved_thunder_clap", name: "Improved Thunder Clap", maxPoints: 3, row: 3, column: 1, prereq: { talentId: "improved_charge", pointsRequired: 2 }, effects: { slowBonus: 0.1 }, desc: "Increases slow effect of Thunder Clap by 10% per point" },
      { id: "improved_overpower", name: "Improved Overpower", maxPoints: 2, row: 3, column: 3, prereq: { talentId: "iron_will", pointsRequired: 3 }, effects: { critChanceBonus: 0.25 }, desc: "Increases critical strike chance of Overpower by 25% per point" },
      { id: "anger_management", name: "Anger Management", maxPoints: 1, row: 4, column: 2, prereq: { talentId: "tactical_mastery", pointsRequired: 3 }, effects: { rageGenBonus: 1 }, desc: "Generates 1 rage per 3 seconds" },
      { id: "deep_wounds", name: "Deep Wounds", maxPoints: 3, row: 4, column: 1, prereq: { talentId: "improved_thunder_clap", pointsRequired: 3 }, effects: { bleedDamage: 0.2 }, desc: "Causes 20% of weapon damage as bleed over 12 seconds per point" },
      { id: "two_handed_weapon_specialization", name: "Two-Handed Weapon Specialization", maxPoints: 5, row: 4, column: 3, prereq: { talentId: "improved_overpower", pointsRequired: 2 }, effects: { damageBonus: 0.05 }, desc: "Increases damage with two-handed weapons by 5% per point" },
      { id: "impale", name: "Impale", maxPoints: 2, row: 5, column: 1, prereq: { talentId: "deep_wounds", pointsRequired: 3 }, effects: { critDamageBonus: 0.1 }, desc: "Increases critical strike damage by 10% per point" },
      { id: "polearm_specialization", name: "Polearm Specialization", maxPoints: 5, row: 5, column: 3, prereq: { talentId: "two_handed_weapon_specialization", pointsRequired: 5 }, effects: { critChanceBonus: 0.01 }, desc: "Increases critical strike chance with polearms by 1% per point" },
      { id: "death_wish", name: "Death Wish", maxPoints: 1, row: 6, column: 2, prereq: { talentId: "mortal_strike", pointsRequired: 1 }, effects: { damageBonus: 0.2, damageTaken: 0.05, duration: 30 }, desc: "Increases damage by 20% and damage taken by 5% for 30 seconds" },
      { id: "mace_specialization", name: "Mace Specialization", maxPoints: 5, row: 6, column: 1, prereq: { talentId: "impale", pointsRequired: 2 }, effects: { stunChance: 0.06 }, desc: "Gives 6% chance per point to stun target for 3 seconds with mace attacks" },
      { id: "sword_specialization", name: "Sword Specialization", maxPoints: 5, row: 6, column: 3, prereq: { talentId: "polearm_specialization", pointsRequired: 5 }, effects: { extraAttackChance: 0.01 }, desc: "Gives 1% chance per point for extra attack with swords" },
      { id: "weapon_mastery", name: "Weapon Mastery", maxPoints: 5, row: 7, column: 2, prereq: { talentId: "death_wish", pointsRequired: 1 }, effects: { weaponSkillBonus: 5 }, desc: "Increases weapon skill by 5 per point" },
      { id: "improved_hamstring", name: "Improved Hamstring", maxPoints: 3, row: 7, column: 1, prereq: { talentId: "mace_specialization", pointsRequired: 5 }, effects: { immobilizeChance: 0.05 }, desc: "Gives 5% chance per point to immobilize target for 5 seconds" },
      { id: "blood_frenzy", name: "Blood Frenzy", maxPoints: 2, row: 7, column: 3, prereq: { talentId: "sword_specialization", pointsRequired: 5 }, effects: { attackSpeedBonus: 0.05 }, desc: "Increases attack speed by 5% per point" },
      { id: "improved_mortal_strike", name: "Improved Mortal Strike", maxPoints: 2, row: 8, column: 2, prereq: { talentId: "weapon_mastery", pointsRequired: 5 }, effects: { cooldownReduction: 1.0 }, desc: "Reduces cooldown of Mortal Strike by 1 second per point" },
      { id: "unrelenting_assault", name: "Unrelenting Assault", maxPoints: 2, row: 8, column: 1, prereq: { talentId: "improved_hamstring", pointsRequired: 3 }, effects: { damageBonus: 0.1 }, desc: "Increases damage by 10% per point when target is below 20% health" },
      { id: "sudden_death", name: "Sudden Death", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "improved_mortal_strike", pointsRequired: 2 }, effects: { executeChance: 0.03 }, desc: "Gives 3% chance for Execute to be usable on any target" }
    ],
    fury: [
      { id: "booming_voice", name: "Booming Voice", maxPoints: 5, row: 1, column: 1, effects: { shoutDurationBonus: 2 }, desc: "Increases duration of shouts by 2 seconds per point" },
      { id: "cruelty", name: "Cruelty", maxPoints: 5, row: 1, column: 3, effects: { critChanceBonus: 0.01 }, desc: "Increases chance to crit by 1% per point" },
      { id: "improved_demoralizing_shout", name: "Improved Demoralizing Shout", maxPoints: 5, row: 2, column: 1, prereq: { talentId: "booming_voice", pointsRequired: 5 }, effects: { attackPowerReduction: 0.08 }, desc: "Increases attack power reduction of Demoralizing Shout by 8% per point" },
      { id: "unbridled_wrath", name: "Unbridled Wrath", maxPoints: 5, row: 2, column: 3, prereq: { talentId: "cruelty", pointsRequired: 5 }, effects: { rageGenBonus: 0.08 }, desc: "Gives 8% chance per point to generate rage when dealing damage" },
      { id: "improved_cleave", name: "Improved Cleave", maxPoints: 3, row: 3, column: 1, prereq: { talentId: "improved_demoralizing_shout", pointsRequired: 5 }, effects: { damageBonus: 0.4 }, desc: "Increases damage of Cleave by 40% per point" },
      { id: "piercing_howl", name: "Piercing Howl", maxPoints: 1, row: 3, column: 3, prereq: { talentId: "unbridled_wrath", pointsRequired: 5 }, effects: { slowAmount: 0.5, duration: 6 }, desc: "Slows nearby enemies by 50% for 6 seconds" },
      { id: "blood_craze", name: "Blood Craze", maxPoints: 3, row: 4, column: 1, prereq: { talentId: "improved_cleave", pointsRequired: 3 }, effects: { healthRegenBonus: 0.03 }, desc: "Regenerates 3% health per point over 6 seconds after taking damage" },
      { id: "commanding_presence", name: "Commanding Presence", maxPoints: 5, row: 4, column: 3, prereq: { talentId: "piercing_howl", pointsRequired: 1 }, effects: { shoutEffectBonus: 0.08 }, desc: "Increases effect of shouts by 8% per point" },
      { id: "dual_wield_specialization", name: "Dual Wield Specialization", maxPoints: 5, row: 5, column: 1, prereq: { talentId: "blood_craze", pointsRequired: 3 }, effects: { damageBonus: 0.1 }, desc: "Increases damage with off-hand weapon by 10% per point" },
      { id: "improved_execute", name: "Improved Execute", maxPoints: 2, row: 5, column: 3, prereq: { talentId: "commanding_presence", pointsRequired: 5 }, effects: { rageCostReduction: 5 }, desc: "Reduces rage cost of Execute by 5 per point" },
      { id: "enrage", name: "Enrage", maxPoints: 5, row: 6, column: 2, prereq: { talentId: "bloodthirst", pointsRequired: 1 }, effects: { damageBonus: 0.05 }, desc: "Increases damage by 5% per point when enraged" },
      { id: "improved_slam", name: "Improved Slam", maxPoints: 5, row: 6, column: 1, prereq: { talentId: "dual_wield_specialization", pointsRequired: 5 }, effects: { castTimeReduction: 0.5 }, desc: "Reduces cast time of Slam by 0.5 seconds per point" },
      { id: "death_wish", name: "Death Wish", maxPoints: 1, row: 6, column: 3, prereq: { talentId: "improved_execute", pointsRequired: 2 }, effects: { damageBonus: 0.2, damageTaken: 0.05, duration: 30 }, desc: "Increases damage by 20% and damage taken by 5% for 30 seconds" },
      { id: "flurry", name: "Flurry", maxPoints: 5, row: 7, column: 2, prereq: { talentId: "enrage", pointsRequired: 5 }, effects: { attackSpeedBonus: 0.05 }, desc: "Increases attack speed by 5% per point after critical strike" },
      { id: "intensify_rage", name: "Intensify Rage", maxPoints: 2, row: 7, column: 1, prereq: { talentId: "improved_slam", pointsRequired: 5 }, effects: { cooldownReduction: 60 }, desc: "Reduces cooldown of Bloodrage, Berserker Rage, and Recklessness by 60 seconds per point" },
      { id: "improved_berserker_rage", name: "Improved Berserker Rage", maxPoints: 2, row: 7, column: 3, prereq: { talentId: "death_wish", pointsRequired: 1 }, effects: { rageGenBonus: 5 }, desc: "Increases rage generated by Berserker Rage by 5 per point" },
      { id: "rampage", name: "Rampage", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "flurry", pointsRequired: 5 }, effects: { attackPowerBonus: 0.1, duration: 10 }, desc: "Increases attack power by 10% for 10 seconds after killing an enemy" },
      { id: "bloodthirst", name: "Bloodthirst", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "rampage", pointsRequired: 1 }, effects: { damagePercent: 0.45 }, desc: "Instantly attack for 45% weapon damage and heal for 45% of damage dealt" }
    ],
    protection: [
      { id: "improved_bloodrage", name: "Improved Bloodrage", maxPoints: 2, row: 1, column: 1, effects: { rageGenBonus: 5 }, desc: "Increases rage generated by Bloodrage by 5 per point" },
      { id: "toughness", name: "Toughness", maxPoints: 5, row: 1, column: 3, effects: { armorBonus: 0.02 }, desc: "Increases armor by 2% per point" },
      { id: "iron_will", name: "Iron Will", maxPoints: 5, row: 2, column: 1, prereq: { talentId: "improved_bloodrage", pointsRequired: 2 }, effects: { resistChanceBonus: 0.03 }, desc: "Increases chance to resist stun and charm by 3% per point" },
      { id: "last_stand", name: "Last Stand", maxPoints: 1, row: 2, column: 3, prereq: { talentId: "toughness", pointsRequired: 5 }, effects: { healthBonus: 0.3, duration: 20 }, desc: "Increases health by 30% for 20 seconds" },
      { id: "improved_shield_block", name: "Improved Shield Block", maxPoints: 3, row: 3, column: 1, prereq: { talentId: "iron_will", pointsRequired: 5 }, effects: { blockChanceBonus: 0.15 }, desc: "Increases block chance by 15% per point for Shield Block" },
      { id: "improved_revenge", name: "Improved Revenge", maxPoints: 3, row: 3, column: 3, prereq: { talentId: "last_stand", pointsRequired: 1 }, effects: { stunChance: 0.15 }, desc: "Gives 15% chance per point to stun target for 3 seconds" },
      { id: "shield_mastery", name: "Shield Mastery", maxPoints: 3, row: 4, column: 1, prereq: { talentId: "improved_shield_block", pointsRequired: 3 }, effects: { blockValueBonus: 0.1 }, desc: "Increases block value by 10% per point" },
      { id: "anticipation", name: "Anticipation", maxPoints: 5, row: 4, column: 3, prereq: { talentId: "improved_revenge", pointsRequired: 3 }, effects: { defenseBonus: 4 }, desc: "Increases Defense by 4 per point" },
      { id: "improved_shield_wall", name: "Improved Shield Wall", maxPoints: 2, row: 5, column: 1, prereq: { talentId: "shield_mastery", pointsRequired: 3 }, effects: { durationBonus: 3 }, desc: "Increases duration of Shield Wall by 3 seconds per point" },
      { id: "concussion_blow", name: "Concussion Blow", maxPoints: 1, row: 5, column: 3, prereq: { talentId: "anticipation", pointsRequired: 5 }, effects: { stunDuration: 5 }, desc: "Stuns target for 5 seconds" },
      { id: "improved_disarm", name: "Improved Disarm", maxPoints: 3, row: 6, column: 1, prereq: { talentId: "improved_shield_wall", pointsRequired: 2 }, effects: { durationBonus: 3 }, desc: "Increases duration of Disarm by 3 seconds per point" },
      { id: "improved_taunt", name: "Improved Taunt", maxPoints: 2, row: 6, column: 3, prereq: { talentId: "concussion_blow", pointsRequired: 1 }, effects: { cooldownReduction: 2 }, desc: "Reduces cooldown of Taunt by 2 seconds per point" },
      { id: "shield_slam", name: "Shield Slam", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "improved_disarm", pointsRequired: 3 }, effects: { damage: 0.75, dispelChance: 0.5 }, desc: "Deals 75% shield block value as damage and 50% chance to dispel magic" },
      { id: "focused_rage", name: "Focused Rage", maxPoints: 3, row: 7, column: 1, prereq: { talentId: "improved_disarm", pointsRequired: 3 }, effects: { threatBonus: 0.15 }, desc: "Increases threat generated by abilities by 15% per point" },
      { id: "vitality", name: "Vitality", maxPoints: 5, row: 7, column: 3, prereq: { talentId: "improved_taunt", pointsRequired: 2 }, effects: { staminaBonus: 0.02, strengthBonus: 0.02 }, desc: "Increases Stamina and Strength by 2% per point" },
      { id: "devastate", name: "Devastate", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "shield_slam", pointsRequired: 1 }, effects: { damage: 1.0, sunderBonus: 1 }, desc: "Deals 100% weapon damage and applies Sunder Armor" },
      { id: "one_handed_weapon_specialization", name: "One-Handed Weapon Specialization", maxPoints: 5, row: 8, column: 1, prereq: { talentId: "focused_rage", pointsRequired: 3 }, effects: { damageBonus: 0.05 }, desc: "Increases damage with one-handed weapons by 5% per point" },
      { id: "improved_defensive_stance", name: "Improved Defensive Stance", maxPoints: 3, row: 8, column: 3, prereq: { talentId: "vitality", pointsRequired: 5 }, effects: { threatBonus: 0.15 }, desc: "Increases threat generated in Defensive Stance by 15% per point" },
      { id: "shield_mastery", name: "Shield Mastery", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "devastate", pointsRequired: 1 }, effects: { blockValueBonus: 0.3 }, desc: "Increases block value by 30%" }
    ]
  },
  priest: {
    discipline: [
      { id: "unbreakable_will", name: "Unbreakable Will", maxPoints: 5, row: 1, column: 1, effects: { resistChanceBonus: 0.03 }, desc: "Increases chance to resist stun, fear, and silence by 3% per point" },
      { id: "wand_specialization", name: "Wand Specialization", maxPoints: 5, row: 1, column: 3, effects: { damageBonus: 0.05 }, desc: "Increases damage with wands by 5% per point" },
      { id: "silent_resolve", name: "Silent Resolve", maxPoints: 5, row: 2, column: 1, prereq: { talentId: "unbreakable_will", pointsRequired: 5 }, effects: { threatReduction: 0.04 }, desc: "Reduces threat generated by spells by 4% per point" },
      { id: "improved_power_word_fortitude", name: "Improved Power Word: Fortitude", maxPoints: 2, row: 2, column: 3, prereq: { talentId: "wand_specialization", pointsRequired: 5 }, effects: { effectBonus: 0.15 }, desc: "Increases effect of Power Word: Fortitude by 15% per point" },
      { id: "martyrdom", name: "Martyrdom", maxPoints: 2, row: 3, column: 1, prereq: { talentId: "silent_resolve", pointsRequired: 5 }, effects: { interruptChance: 0.5 }, desc: "Gives 50% chance per point to avoid interruption when taking damage" },
      { id: "absolution", name: "Absolution", maxPoints: 3, row: 3, column: 3, prereq: { talentId: "improved_power_word_fortitude", pointsRequired: 2 }, effects: { manaCostReduction: 0.1 }, desc: "Reduces mana cost of Dispel Magic, Mass Dispel, and Abolish Disease by 10% per point" },
      { id: "inner_focus", name: "Inner Focus", maxPoints: 1, row: 4, column: 2, prereq: { talentId: "martyrdom", pointsRequired: 2 }, effects: { manaCostReduction: 1.0, critChanceBonus: 0.25, duration: 15 }, desc: "Reduces mana cost of next spell by 100% and increases crit chance by 25% for 15 seconds" },
      { id: "meditation", name: "Meditation", maxPoints: 3, row: 4, column: 1, prereq: { talentId: "martyrdom", pointsRequired: 2 }, effects: { manaRegenBonus: 0.15 }, desc: "Allows 15% of mana regeneration to continue while casting per point" },
      { id: "improved_inner_fire", name: "Improved Inner Fire", maxPoints: 3, row: 4, column: 3, prereq: { talentId: "absolution", pointsRequired: 3 }, effects: { armorBonus: 0.1 }, desc: "Increases armor bonus of Inner Fire by 10% per point" },
      { id: "mental_agility", name: "Mental Agility", maxPoints: 5, row: 5, column: 1, prereq: { talentId: "meditation", pointsRequired: 3 }, effects: { manaCostReduction: 0.04 }, desc: "Reduces mana cost of instant cast spells by 4% per point" },
      { id: "improved_mana_burn", name: "Improved Mana Burn", maxPoints: 2, row: 5, column: 3, prereq: { talentId: "improved_inner_fire", pointsRequired: 3 }, effects: { castTimeReduction: 0.5 }, desc: "Reduces cast time of Mana Burn by 0.5 seconds per point" },
      { id: "mental_strength", name: "Mental Strength", maxPoints: 5, row: 6, column: 2, prereq: { talentId: "inner_focus", pointsRequired: 1 }, effects: { intellectBonus: 0.05 }, desc: "Increases Intellect by 5% per point" },
      { id: "divine_spirit", name: "Divine Spirit", maxPoints: 1, row: 6, column: 1, prereq: { talentId: "mental_agility", pointsRequired: 5 }, effects: { spiritBonus: 0.1 }, desc: "Increases Spirit by 10%" },
      { id: "force_of_will", name: "Force of Will", maxPoints: 5, row: 6, column: 3, prereq: { talentId: "improved_mana_burn", pointsRequired: 2 }, effects: { spellDamageBonus: 0.02, critChanceBonus: 0.01 }, desc: "Increases spell damage by 2% and crit chance by 1% per point" },
      { id: "power_infusion", name: "Power Infusion", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "mental_strength", pointsRequired: 5 }, effects: { hasteBonus: 0.2, manaCostReduction: 0.2, duration: 15 }, desc: "Increases haste by 20% and reduces mana cost by 20% for 15 seconds" },
      { id: "reflective_shield", name: "Reflective Shield", maxPoints: 2, row: 7, column: 1, prereq: { talentId: "divine_spirit", pointsRequired: 1 }, effects: { reflectDamage: 0.05 }, desc: "Reflects 5% of damage taken back to attacker per point" },
      { id: "enlightenment", name: "Enlightenment", maxPoints: 5, row: 7, column: 3, prereq: { talentId: "force_of_will", pointsRequired: 5 }, effects: { intellectBonus: 0.03, spiritBonus: 0.03 }, desc: "Increases Intellect and Spirit by 3% per point" },
      { id: "pain_suppression", name: "Pain Suppression", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "power_infusion", pointsRequired: 1 }, effects: { damageReduction: 0.4, duration: 8 }, desc: "Reduces damage taken by 40% for 8 seconds" },
      { id: "improved_power_word_shield", name: "Improved Power Word: Shield", maxPoints: 3, row: 8, column: 1, prereq: { talentId: "reflective_shield", pointsRequired: 2 }, effects: { absorbBonus: 0.15 }, desc: "Increases damage absorbed by Power Word: Shield by 15% per point" },
      { id: "soul_warding", name: "Soul Warding", maxPoints: 2, row: 8, column: 3, prereq: { talentId: "enlightenment", pointsRequired: 5 }, effects: { cooldownReduction: 4 }, desc: "Reduces cooldown of Power Word: Shield by 4 seconds per point" },
      { id: "penance", name: "Penance", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "pain_suppression", pointsRequired: 1 }, effects: { damage: 0.6, healing: 0.6 }, desc: "Channels 3 bolts dealing 60% spell power damage or healing" }
    ],
    holy: [
      { id: "healing_focus", name: "Healing Focus", maxPoints: 2, row: 1, column: 1, effects: { interruptChance: 0.35 }, desc: "Gives 35% chance per point to avoid interruption when healing" },
      { id: "improved_renew", name: "Improved Renew", maxPoints: 3, row: 1, column: 3, effects: { healingBonus: 0.15 }, desc: "Increases healing from Renew by 15% per point" },
      { id: "holy_specialization", name: "Holy Specialization", maxPoints: 5, row: 2, column: 1, prereq: { talentId: "healing_focus", pointsRequired: 2 }, effects: { critChanceBonus: 0.01 }, desc: "Increases critical strike chance of holy spells by 1% per point" },
      { id: "spell_warding", name: "Spell Warding", maxPoints: 5, row: 2, column: 3, prereq: { talentId: "improved_renew", pointsRequired: 3 }, effects: { magicDamageReduction: 0.02 }, desc: "Reduces all spell damage taken by 2% per point" },
      { id: "divine_fury", name: "Divine Fury", maxPoints: 5, row: 3, column: 2, prereq: { talentId: "holy_specialization", pointsRequired: 5 }, effects: { castTimeReduction: 0.1 }, desc: "Reduces cast time of Smite, Holy Fire, and Heal by 10% per point" },
      { id: "holy_reach", name: "Holy Reach", maxPoints: 2, row: 3, column: 1, prereq: { talentId: "holy_specialization", pointsRequired: 5 }, effects: { rangeBonus: 20 }, desc: "Increases range of Smite and Holy Fire by 20% per point" },
      { id: "improved_healing", name: "Improved Healing", maxPoints: 3, row: 3, column: 3, prereq: { talentId: "spell_warding", pointsRequired: 5 }, effects: { manaCostReduction: 0.15 }, desc: "Reduces mana cost of Greater Heal and Heal by 15% per point" },
      { id: "searing_light", name: "Searing Light", maxPoints: 3, row: 4, column: 1, prereq: { talentId: "holy_reach", pointsRequired: 2 }, effects: { damageBonus: 0.05 }, desc: "Increases damage of Smite and Holy Fire by 5% per point" },
      { id: "healing_light", name: "Healing Light", maxPoints: 3, row: 4, column: 3, prereq: { talentId: "improved_healing", pointsRequired: 3 }, effects: { healingBonus: 0.12 }, desc: "Increases healing of Flash Heal, Heal, and Greater Heal by 12% per point" },
      { id: "improved_prayer_of_healing", name: "Improved Prayer of Healing", maxPoints: 2, row: 5, column: 2, prereq: { talentId: "divine_fury", pointsRequired: 5 }, effects: { healingBonus: 0.1 }, desc: "Increases healing of Prayer of Healing by 10% per point" },
      { id: "spirit_of_redemption", name: "Spirit of Redemption", maxPoints: 1, row: 5, column: 1, prereq: { talentId: "searing_light", pointsRequired: 3 }, effects: { duration: 15, healingBonus: 1.0 }, desc: "After death, become spirit for 15 seconds with 100% increased healing" },
      { id: "spiritual_guidance", name: "Spiritual Guidance", maxPoints: 5, row: 5, column: 3, prereq: { talentId: "healing_light", pointsRequired: 3 }, effects: { spellPowerBonus: 0.25 }, desc: "Increases spell power by 25% of your Spirit per point" },
      { id: "surge_of_light", name: "Surge of Light", maxPoints: 2, row: 6, column: 2, prereq: { talentId: "improved_prayer_of_healing", pointsRequired: 2 }, effects: { instantCastChance: 0.25 }, desc: "Gives 25% chance per point for next Smite or Flash Heal to be instant" },
      { id: "spiritual_healing", name: "Spiritual Healing", maxPoints: 5, row: 6, column: 1, prereq: { talentId: "spirit_of_redemption", pointsRequired: 1 }, effects: { healingBonus: 0.02 }, desc: "Increases healing done by spells by 2% per point" },
      { id: "holy_concentration", name: "Holy Concentration", maxPoints: 3, row: 6, column: 3, prereq: { talentId: "spiritual_guidance", pointsRequired: 5 }, effects: { manaRegenBonus: 0.5 }, desc: "Gives 50% chance per point to regenerate mana equal to spell cost after Flash Heal crit" },
      { id: "lightwell", name: "Lightwell", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "surge_of_light", pointsRequired: 2 }, effects: { healing: 0.4, charges: 10 }, desc: "Creates a Lightwell with 10 charges healing for 40% spell power" },
      { id: "blessed_resilience", name: "Blessed Resilience", maxPoints: 3, row: 7, column: 1, prereq: { talentId: "spiritual_healing", pointsRequired: 5 }, effects: { critReduction: 0.03 }, desc: "Reduces chance to be critically hit by 3% per point" },
      { id: "empowered_healing", name: "Empowered Healing", maxPoints: 5, row: 7, column: 3, prereq: { talentId: "holy_concentration", pointsRequired: 3 }, effects: { healingBonus: 0.04 }, desc: "Increases healing of Greater Heal and Flash Heal by 4% per point" },
      { id: "circle_of_healing", name: "Circle of Healing", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "lightwell", pointsRequired: 1 }, effects: { healAmount: 0.3 }, desc: "Heals up to 5 party members for 30% of spell power" },
      { id: "test_of_faith", name: "Test of Faith", maxPoints: 3, row: 8, column: 1, prereq: { talentId: "blessed_resilience", pointsRequired: 3 }, effects: { healingBonus: 0.12 }, desc: "Increases healing by 12% per point on targets below 50% health" },
      { id: "divine_providence", name: "Divine Providence", maxPoints: 5, row: 8, column: 3, prereq: { talentId: "empowered_healing", pointsRequired: 5 }, effects: { healingBonus: 0.02, rangeBonus: 0.1 }, desc: "Increases healing by 2% and range by 10% per point" },
      { id: "guardian_spirit", name: "Guardian Spirit", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "circle_of_healing", pointsRequired: 1 }, effects: { healingBonus: 0.4, duration: 10 }, desc: "Increases healing received by 40% for 10 seconds, prevents death once" }
    ],
    shadow: [
      { id: "spirit_tap", name: "Spirit Tap", maxPoints: 5, row: 1, column: 2, effects: { manaRegenBonus: 1.0, duration: 15 }, desc: "Increases mana regeneration by 100% for 15 seconds after killing a target" },
      { id: "blackout", name: "Blackout", maxPoints: 5, row: 2, column: 1, prereq: { talentId: "spirit_tap", pointsRequired: 5 }, effects: { stunChance: 0.03 }, desc: "Gives 3% chance per point to stun target for 3 seconds with shadow spells" },
      { id: "shadow_affinity", name: "Shadow Affinity", maxPoints: 3, row: 2, column: 3, prereq: { talentId: "spirit_tap", pointsRequired: 5 }, effects: { threatReduction: 0.08 }, desc: "Reduces threat generated by shadow spells by 8% per point" },
      { id: "improved_shadow_word_pain", name: "Improved Shadow Word: Pain", maxPoints: 2, row: 3, column: 1, prereq: { talentId: "blackout", pointsRequired: 5 }, effects: { durationBonus: 6 }, desc: "Increases duration of Shadow Word: Pain by 6 seconds per point" },
      { id: "shadow_weaving", name: "Shadow Weaving", maxPoints: 5, row: 3, column: 3, prereq: { talentId: "shadow_affinity", pointsRequired: 3 }, effects: { damageBonus: 0.02 }, desc: "Increases shadow damage by 2% per point, stacks up to 5 times" },
      { id: "improved_mind_blast", name: "Improved Mind Blast", maxPoints: 5, row: 4, column: 1, prereq: { talentId: "improved_shadow_word_pain", pointsRequired: 2 }, effects: { cooldownReduction: 0.5 }, desc: "Reduces cooldown of Mind Blast by 0.5 seconds per point" },
      { id: "mind_flay", name: "Mind Flay", maxPoints: 1, row: 4, column: 3, prereq: { talentId: "shadow_weaving", pointsRequired: 5 }, effects: { damage: 0.45, duration: 3 }, desc: "Channels shadow energy dealing 45% spell power damage over 3 seconds" },
      { id: "improved_fade", name: "Improved Fade", maxPoints: 2, row: 5, column: 1, prereq: { talentId: "improved_mind_blast", pointsRequired: 5 }, effects: { cooldownReduction: 60 }, desc: "Reduces cooldown of Fade by 60 seconds per point" },
      { id: "shadow_reach", name: "Shadow Reach", maxPoints: 3, row: 5, column: 3, prereq: { talentId: "mind_flay", pointsRequired: 1 }, effects: { rangeBonus: 0.2 }, desc: "Increases range of shadow spells by 20% per point" },
      { id: "shadow_power", name: "Shadow Power", maxPoints: 5, row: 6, column: 2, prereq: { talentId: "improved_fade", pointsRequired: 2 }, effects: { critChanceBonus: 0.01 }, desc: "Increases critical strike chance of shadow spells by 1% per point" },
      { id: "improved_shadow_word_pain", name: "Improved Shadow Word: Pain", maxPoints: 2, row: 6, column: 1, prereq: { talentId: "improved_fade", pointsRequired: 2 }, effects: { damageBonus: 0.06 }, desc: "Increases damage of Shadow Word: Pain by 6% per point" },
      { id: "misery", name: "Misery", maxPoints: 5, row: 6, column: 3, prereq: { talentId: "shadow_reach", pointsRequired: 3 }, effects: { spellHitBonus: 0.01 }, desc: "Increases chance to hit with spells by 1% per point" },
      { id: "vampiric_embrace", name: "Vampiric Embrace", maxPoints: 1, row: 7, column: 2, prereq: { talentId: "shadow_power", pointsRequired: 5 }, effects: { healingTransfer: 0.2, duration: 15 }, desc: "Transfers 20% of shadow damage as healing to party for 15 seconds" },
      { id: "darkness", name: "Darkness", maxPoints: 5, row: 7, column: 1, prereq: { talentId: "improved_shadow_word_pain", pointsRequired: 2 }, effects: { damageBonus: 0.02 }, desc: "Increases shadow damage by 2% per point" },
      { id: "shadowform", name: "Shadowform", maxPoints: 1, row: 7, column: 3, prereq: { talentId: "misery", pointsRequired: 5 }, effects: { shadowDamageBonus: 0.15, damageReduction: 0.15 }, desc: "Increases shadow damage by 15% and reduces damage taken by 15%" },
      { id: "shadowfiend", name: "Shadowfiend", maxPoints: 1, row: 8, column: 2, prereq: { talentId: "vampiric_embrace", pointsRequired: 1 }, effects: { duration: 15, manaReturn: 0.05 }, desc: "Summons shadowfiend for 15 seconds that returns 5% mana per attack" },
      { id: "improved_shadowform", name: "Improved Shadowform", maxPoints: 2, row: 8, column: 1, prereq: { talentId: "darkness", pointsRequired: 5 }, effects: { resistChanceBonus: 0.15 }, desc: "Increases chance to resist fear and silence by 15% per point in Shadowform" },
      { id: "mind_melt", name: "Mind Melt", maxPoints: 2, row: 8, column: 3, prereq: { talentId: "shadowform", pointsRequired: 1 }, effects: { castTimeReduction: 0.5 }, desc: "Reduces cast time of Mind Blast by 0.5 seconds per point after Shadow Word: Pain" },
      { id: "vampiric_touch", name: "Vampiric Touch", maxPoints: 1, row: 9, column: 2, prereq: { talentId: "shadowfiend", pointsRequired: 1 }, effects: { damage: 0.5, duration: 15, manaReturn: 0.05 }, desc: "Deals 50% spell power damage over 15 seconds and returns 5% mana" },
      { id: "pain_and_suffering", name: "Pain and Suffering", maxPoints: 3, row: 9, column: 1, prereq: { talentId: "improved_shadowform", pointsRequired: 2 }, effects: { damageBonus: 0.1 }, desc: "Increases damage of Shadow Word: Pain and Mind Flay by 10% per point" },
      { id: "twisted_faith", name: "Twisted Faith", maxPoints: 5, row: 9, column: 3, prereq: { talentId: "mind_melt", pointsRequired: 2 }, effects: { spellPowerBonus: 0.1 }, desc: "Increases spell power by 10% of your Spirit per point" },
      { id: "dispersion", name: "Dispersion", maxPoints: 1, row: 10, column: 2, prereq: { talentId: "vampiric_touch", pointsRequired: 1 }, effects: { damageReduction: 0.9, manaRegenBonus: 0.06, duration: 6 }, desc: "Reduces damage by 90% and regenerates 6% mana per second for 6 seconds" }
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



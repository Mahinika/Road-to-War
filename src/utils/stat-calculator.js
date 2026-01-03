import { Logger } from './logger.js';
import { ErrorHandler } from './error-handler.js';

/**
 * Stat Calculator - Calculates final stats with WoW TBC/WotLK rating conversions
 * Handles base stats, equipment stats, talent bonuses, and rating conversions
 */
export class StatCalculator {
    /**
     * Create a new StatCalculator
     * @param {Phaser.Scene} scene - Phaser scene instance
     */
    constructor(scene) {
        this.scene = scene;
        this.statsConfig = this.scene.cache.json.get('stats-config');
        
        if (!this.statsConfig) {
            this.statsConfig = this.getDefaultStatsConfig();
        }

        Logger.info('StatCalculator', 'Initialized');
    }

    /**
     * Reload stats config for hot-reload support
     * @async
     */
    async reloadStatsConfig() {
        try {
            Logger.info('StatCalculator', 'Reloading stats config...');

            // Reload the JSON data
            await this.scene.cache.json.remove('stats-config');
            this.scene.load.json('stats-config', '/data/stats-config.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-stats-config', resolve);
                this.scene.load.start();
            });

            // Update local reference
            this.statsConfig = this.scene.cache.json.get('stats-config');

            // Fallback to defaults if reload failed
            if (!this.statsConfig) {
                this.statsConfig = this.getDefaultStatsConfig();
                Logger.warn('StatCalculator', 'Using default stats config due to reload failure');
            }

            Logger.info('StatCalculator', 'Stats config reloaded successfully');

        } catch (error) {
            Logger.error('StatCalculator', 'Failed to reload stats config:', error);
            // Keep existing config as fallback
            throw error;
        }
    }

    /**
     * Calculates the final stats for a hero, incorporating base stats, bloodline bonuses,
     * equipment stats, derived stats, talent bonuses, and rating-to-percentage conversions.
     * @param {Object} hero - Hero object with baseStats, equipment, and talents.
     * @param {Object} [equipmentStats={}] - Accumulated stats from equipped items.
     * @param {Object} [talentBonuses={}] - Accumulated stat bonuses from talents.
     * @returns {Object} Final calculated stats object including resources.
     */
    calculateFinalStats(hero, equipmentStats = {}, talentBonuses = {}) {
        try {
            // Start with base stats
            const finalStats = {
                ...hero.baseStats
            };

            // Add bloodline bonuses (Phase 10: Bloodline System Integration)
            this.applyBloodlineBonuses(hero, finalStats);

            // Add equipment stats
            Object.keys(equipmentStats).forEach(stat => {
                if (typeof finalStats[stat] === 'number') {
                    finalStats[stat] += equipmentStats[stat] || 0;
                } else {
                    finalStats[stat] = equipmentStats[stat] || 0;
                }
            });

            // Calculate derived stats from primary stats (WotLK style)
            const derivedStats = this.calculateDerivedStats(hero.baseStats, equipmentStats, talentBonuses);
            Object.keys(derivedStats).forEach(stat => {
                if (stat === 'health') {
                    finalStats.maxHealth += derivedStats[stat];
                } else if (stat === 'attackPower') {
                    // 1 Attack Power = 1 Attack (simplified for this game)
                    finalStats.attack = (finalStats.attack || 0) + derivedStats[stat];
                } else if (stat === 'spellPower') {
                    finalStats.spellPower = (finalStats.spellPower || 0) + derivedStats[stat];
                } else if (typeof finalStats[stat] === 'number') {
                    finalStats[stat] += derivedStats[stat];
                } else {
                    finalStats[stat] = derivedStats[stat];
                }
            });

            // If hero is a caster, attack should also benefit from spellPower
            const classData = this.scene.cache.json.get('classes')?.[hero.classId];
            if (classData && (hero.classId === 'priest' || hero.classId === 'mage' || hero.classId === 'warlock')) {
                // Map spellPower to attack for casters so their spells do damage
                finalStats.attack = (finalStats.attack || 0) + (finalStats.spellPower || 0);
            }

            // Apply talent bonuses (percentage multipliers)
            Object.keys(talentBonuses).forEach(stat => {
                if (stat.endsWith('Bonus') && finalStats[stat.replace('Bonus', '')]) {
                    const baseStatName = stat.replace('Bonus', '');
                    const multiplier = 1 + (talentBonuses[stat] || 0);
                    finalStats[baseStatName] = Math.floor(finalStats[baseStatName] * multiplier);
                } else if (typeof finalStats[stat] === 'number') {
                    finalStats[stat] += talentBonuses[stat] || 0;
                }
            });

            // Convert ratings to percentages
            const ratings = {
                hitRating: equipmentStats.hitRating || 0,
                critRating: equipmentStats.critRating || 0,
                hasteRating: equipmentStats.hasteRating || 0,
                expertiseRating: equipmentStats.expertiseRating || 0,
                defenseRating: equipmentStats.defenseRating || 0,
                resilienceRating: equipmentStats.resilienceRating || 0,
                spellHitRating: equipmentStats.spellHitRating || 0,
                spellCritRating: equipmentStats.spellCritRating || 0,
                spellHasteRating: equipmentStats.spellHasteRating || 0
            };

            // Convert each rating to percentage
            finalStats.hitChance = this.convertRatingToPercentage(ratings.hitRating, 'hitRating');
            finalStats.critChance = this.convertRatingToPercentage(ratings.critRating, 'critRating');
            finalStats.hastePercent = this.convertRatingToPercentage(ratings.hasteRating, 'hasteRating');
            finalStats.expertisePercent = this.convertRatingToPercentage(ratings.expertiseRating, 'expertiseRating');
            finalStats.defenseSkill = this.convertRatingToPercentage(ratings.defenseRating, 'defenseRating');
            finalStats.resiliencePercent = this.convertRatingToPercentage(ratings.resilienceRating, 'resilienceRating');
            finalStats.spellHitChance = this.convertRatingToPercentage(ratings.spellHitRating, 'spellHitRating');
            finalStats.spellCritChance = this.convertRatingToPercentage(ratings.spellCritRating, 'spellCritRating');
            finalStats.spellHastePercent = this.convertRatingToPercentage(ratings.spellHasteRating, 'spellHasteRating');

            // Check Defense Cap
            finalStats.defenseCapReached = this.checkDefenseCap(hero.level, ratings.defenseRating);

            // Ensure health is properly initialized (if not set, use maxHealth)
            // Preserve current health if hero already has it, otherwise set to maxHealth
            if (hero.currentStats && hero.currentStats.health > 0) {
                finalStats.health = Math.min(hero.currentStats.health, finalStats.maxHealth);
            } else {
                finalStats.health = finalStats.maxHealth;
            }

            // Sync Resource Pool (Mana/Energy/Rage/Focus)
            const resourceType = hero.resourceType || 'mana';
            if (resourceType === 'mana') {
                // Mana is derived from mana stat (which comes from Intellect)
                finalStats.maxResource = finalStats.mana || 0;
                // Use hero's root currentResource if available
                const currentRes = hero.currentResource !== undefined ? hero.currentResource : (hero.currentStats?.currentResource || 0);
                
                if (currentRes > 0) {
                    finalStats.currentResource = Math.min(currentRes, finalStats.maxResource);
                } else {
                    finalStats.currentResource = finalStats.maxResource;
                }
            } else {
                // Energy, Rage, and Focus usually have a fixed max of 100
                finalStats.maxResource = hero.maxResource || 100;
                finalStats.currentResource = hero.currentResource !== undefined ? hero.currentResource : (hero.currentStats?.currentResource || (resourceType === 'rage' ? 0 : 100));
            }

            return finalStats;
        } catch (error) {
            ErrorHandler.handle(error, 'StatCalculator.calculateFinalStats');
            return hero.baseStats;
        }
    }

    /**
     * Applies bloodline-specific stat bonuses and passive effects to the final stats object.
     * @param {Object} hero - Hero object containing bloodline information.
     * @param {Object} finalStats - Stats object to be modified in-place.
     */
    applyBloodlineBonuses(hero, finalStats) {
        // Load bloodline from data if only bloodlineId is provided
        let bloodline = hero.bloodline;
        if (!bloodline && hero.bloodlineId) {
            const bloodlinesData = this.scene?.cache?.json?.get('bloodlines');
            if (bloodlinesData?.bloodlines?.[hero.bloodlineId]) {
                bloodline = bloodlinesData.bloodlines[hero.bloodlineId];
            }
        }
        
        if (!bloodline) return;

        try {

            // 1. Apply stat bonuses
            if (bloodline.statBonuses) {
                Object.entries(bloodline.statBonuses).forEach(([stat, value]) => {
                    if (typeof finalStats[stat] === 'number') {
                        finalStats[stat] += value;
                    } else {
                        finalStats[stat] = value;
                    }
                });
            }

            // 2. Apply passive effects
            if (bloodline.passiveEffects) {
                bloodline.passiveEffects.forEach(effect => {
                    switch (effect.type) {
                        case 'damage_reduction':
                            finalStats.damageReduction = (finalStats.damageReduction || 0) + effect.value;
                            break;
                        case 'mana_regen':
                            finalStats.manaRegen = (finalStats.manaRegen || 0) + effect.value;
                            break;
                        case 'movement_speed':
                            finalStats.movementSpeed = (finalStats.movementSpeed || 0) + effect.value;
                            break;
                        case 'health_regen':
                            finalStats.healthRegen = (finalStats.healthRegen || 0) + effect.value;
                            break;
                        case 'healing_bonus':
                            finalStats.healingBonus = (finalStats.healingBonus || 0) + effect.value;
                            break;
                        case 'life_steal':
                            finalStats.lifeSteal = (finalStats.lifeSteal || 0) + effect.value;
                            break;
                        case 'attack_speed':
                            finalStats.attackSpeed = (finalStats.attackSpeed || 0) + effect.value;
                            break;
                        case 'fire_resistance':
                        case 'cold_resistance':
                        case 'lightning_resistance':
                        case 'allResistance':
                            const resKey = effect.type.replace('_resistance', 'Resistance');
                            if (effect.type === 'allResistance') {
                                // Apply to all resistance types
                                finalStats.fireResistance = (finalStats.fireResistance || 0) + effect.value;
                                finalStats.coldResistance = (finalStats.coldResistance || 0) + effect.value;
                                finalStats.lightningResistance = (finalStats.lightningResistance || 0) + effect.value;
                            } else {
                                finalStats[resKey] = (finalStats[resKey] || 0) + effect.value;
                            }
                            break;
                        default:
                            Logger.debug('StatCalculator', `Unknown bloodline passive effect: ${effect.type}`);
                    }
                });
            }

            // 3. Store bloodline references for runtime effects
            finalStats.bloodlineId = hero.bloodlineId;
            finalStats.bloodlineUniqueAbility = bloodline.uniqueAbility;
            finalStats.bloodlinePassiveEffects = bloodline.passiveEffects;

        } catch (error) {
            ErrorHandler.handle(error, 'StatCalculator.applyBloodlineBonuses');
        }
    }

    /**
     * Converts a raw rating value into a percentage based on configured conversion rates.
     * @param {number} rating - Raw rating value.
     * @param {string} statType - The type of rating (e.g., 'hitRating', 'critRating').
     * @returns {number} The converted percentage value (0-100).
     */
    convertRatingToPercentage(rating, statType) {
        if (!rating || rating <= 0) return 0;

        const conversions = this.statsConfig.ratingConversions || {};
        const conversion = conversions[statType];
        
        if (!conversion || !conversion.perPercentage) {
            return 0;
        }

        const percentage = (rating / conversion.perPercentage);
        const maxPercentage = conversion.maxPercentage || 100;
        
        return Math.min(percentage, maxPercentage);
    }

    /**
     * Checks if a hero's defense rating meets the cap for their level (WotLK style).
     * @param {number} level - Hero's current level.
     * @param {number} defenseRating - Hero's current defense rating.
     * @returns {boolean} True if defense cap is reached.
     */
    checkDefenseCap(level, defenseRating) {
        try {
            const defenseCap = this.statsConfig.defenseCap || {};
            const perLevel = defenseCap.perLevel || {};
            
            // Calculate base defense for level
            const baseDefensePerLevel = perLevel.baseDefensePerLevel || 5;
            const baseDefense = baseDefensePerLevel * level;
            
            // Calculate defense cap for level
            const defenseCapPerLevel = perLevel.defenseCapPerLevel || 5;
            const defenseCapValue = baseDefense + (defenseCapPerLevel * (level - 1));
            
            // Calculate actual defense from rating
            const defenseFromRating = this.convertRatingToPercentage(defenseRating, 'defenseRating');
            const actualDefense = baseDefense + defenseFromRating;
            
            return actualDefense >= defenseCapValue;
        } catch (error) {
            ErrorHandler.handle(error, 'StatCalculator.checkDefenseCap');
            return false;
        }
    }

    /**
     * Calculates derived stats from primary stats (Strength, Agility, Intellect, Spirit, Stamina).
     * @param {Object} baseStats - Primary base stats.
     * @param {Object} [equipmentStats={}] - Stats from equipment.
     * @param {Object} [talentBonuses={}] - Bonuses from talents.
     * @returns {Object} Derived stats object.
     */
    calculateDerivedStats(baseStats, equipmentStats = {}, talentBonuses = {}) {
        const conversions = this.statsConfig.primaryStatConversions || {};
        const derived = {};

        // Calculate from Strength
        if (conversions.strength) {
            const strength = (baseStats.strength || 0) + (equipmentStats.strength || 0);
            derived.attackPower = (derived.attackPower || 0) + (strength * (conversions.strength.attackPower || 2.0));
            derived.blockValue = (derived.blockValue || 0) + (strength * (conversions.strength.blockValue || 2.0));
        }

        // Calculate from Agility
        if (conversions.agility) {
            const agility = (baseStats.agility || 0) + (equipmentStats.agility || 0);
            derived.attackPower = (derived.attackPower || 0) + (agility * (conversions.agility.attackPower || 1.0));
            derived.armor = (derived.armor || 0) + (agility * (conversions.agility.armor || 2.0));
            derived.critChance = (derived.critChance || 0) + (agility * (conversions.agility.critChance || 0.025));
            derived.dodgeChance = (derived.dodgeChance || 0) + (agility * (conversions.agility.dodgeChance || 0.025));
        }

        // Calculate from Intellect
        if (conversions.intellect) {
            const intellect = (baseStats.intellect || 0) + (equipmentStats.intellect || 0);
            derived.mana = (derived.mana || 0) + (intellect * (conversions.intellect.mana || 15.0));
            derived.spellCritChance = (derived.spellCritChance || 0) + (intellect * (conversions.intellect.spellCritChance || 0.0083));
            derived.spellPower = (derived.spellPower || 0) + (intellect * (conversions.intellect.spellPower || 0.5));
        }

        // Calculate from Spirit
        if (conversions.spirit) {
            const spirit = (baseStats.spirit || 0) + (equipmentStats.spirit || 0);
            derived.manaRegen = (derived.manaRegen || 0) + (spirit * (conversions.spirit.manaRegen || 0.1));
            derived.healthRegen = (derived.healthRegen || 0) + (spirit * (conversions.spirit.healthRegen || 0.05));
        }

        // Calculate from Stamina
        if (conversions.stamina) {
            const stamina = (baseStats.stamina || 0) + (equipmentStats.stamina || 0);
            derived.health = (derived.health || 0) + (stamina * (conversions.stamina.health || 10.0));
        }

        return derived;
    }

    /**
     * Get default stat conversion values if config load fails
     * @returns {Object} - Default stats configuration
     */
    getDefaultStatsConfig() {
        return {
            ratingConversions: {
                hitRating: { perPercentage: 15.77, maxPercentage: 17.0 },
                critRating: { perPercentage: 22.08, maxPercentage: 100.0 },
                hasteRating: { perPercentage: 15.77, maxPercentage: 100.0 },
                expertiseRating: { perPercentage: 3.94, maxPercentage: 26.0 },
                defenseRating: { perPercentage: 4.92, maxPercentage: 100.0 },
                resilienceRating: { perPercentage: 39.4, maxPercentage: 100.0 },
                spellHitRating: { perPercentage: 12.62, maxPercentage: 17.0 },
                spellCritRating: { perPercentage: 22.08, maxPercentage: 100.0 },
                spellHasteRating: { perPercentage: 15.77, maxPercentage: 100.0 }
            },
            defenseCap: {
                perLevel: {
                    baseDefensePerLevel: 5,
                    defenseCapPerLevel: 5,
                    critReductionPerDefense: 0.04
                }
            },
            primaryStatConversions: {
                strength: { attackPower: 2.0, blockValue: 2.0 },
                agility: { attackPower: 1.0, armor: 2.0, critChance: 0.025, dodgeChance: 0.025 },
                intellect: { mana: 15.0, spellCritChance: 0.0083 },
                spirit: { manaRegen: 0.1, healthRegen: 0.05 },
                stamina: { health: 10.0 }
            }
        };
    }
}


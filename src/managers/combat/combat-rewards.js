import { Logger } from '../../utils/logger.js';

/**
 * Combat Rewards - Handles reward calculation and loot generation
 * Extracted from CombatManager to improve separation of concerns
 */
export class CombatRewards {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.worldConfig = config.worldConfig || null;
        this.proceduralItemGenerator = config.proceduralItemGenerator || null;
        this.prestigeManager = config.prestigeManager || null;
        this.partyManager = config.partyManager || null;
        this.hero = config.hero || null;
    }

    /**
     * Calculate victory rewards
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} worldConfig - World configuration
     * @returns {Object} Rewards object with experience, gold, and loot array
     */
    calculateVictoryRewards(enemy, currentCombat, worldConfig) {
        if (!currentCombat || !enemy || !enemy.data) {
            return { experience: 0, gold: 0, loot: [] };
        }

        const enemyData = enemy.data;
        const baseExp = enemyData.rewards?.experience || 25;
        const baseGold = enemyData.rewards?.gold || 10;
        const isBoss = enemy?.isBoss || enemyData.type === 'boss';

        // Apply multipliers from world config
        const lootConfig = (worldConfig || this.worldConfig)?.loot || {};
        const expMultiplier = lootConfig.experienceMultiplier || 1.0;
        const goldMultiplier = lootConfig.goldDropMultiplier || 1.0;

        // Boss rewards are guaranteed higher
        const bossMultiplier = isBoss ? 1.5 : 1.0;

        // Calculate final rewards
        const experience = Math.floor(baseExp * expMultiplier * bossMultiplier * (1 + Math.random() * 0.5));
        const gold = Math.floor(baseGold * goldMultiplier * bossMultiplier * (1 + Math.random() * 0.3));

        return {
            experience: experience,
            gold: gold,
            loot: this.generateLoot(enemyData, isBoss, worldConfig)
        };
    }

    /**
     * Calculate defeat rewards
     * @returns {Object} Rewards for losing combat
     */
    calculateDefeatRewards() {
        // Reduced rewards for defeat
        return {
            experience: 5,
            gold: 2,
            loot: []
        };
    }

    /**
     * Generate loot drops
     * @param {Object} enemyData - Enemy data for drop calculation
     * @param {boolean} isBoss - Whether this is a boss enemy
     * @param {Object} worldConfig - World configuration
     * @returns {Array} Array of dropped items
     */
    generateLoot(enemyData, isBoss = false, worldConfig = null) {
        if (!enemyData) return [];

        const loot = [];
        const drops = enemyData.drops || [];
        const config = worldConfig || this.worldConfig || {};

        // Get current mile from WorldManager for item scaling
        const currentMile = this.scene.worldManager?.getCurrentMile() || 0;
        const qualityConfig = config.itemQualityScaling || {};

        // Get loot configuration
        const lootConfig = config.loot || {};
        const itemDropBonusPerLevel = lootConfig.itemDropBonusPerLevel || 0.02;
        const rareItemChanceBonus = lootConfig.rareItemChanceBonus || 0.01;

        // Get hero level for scaling (for drop chance bonuses)
        const heroLevel = this.hero?.data?.level || this.partyManager?.getTank()?.level || 1;
        const levelBonus = (heroLevel - 1) * itemDropBonusPerLevel;

        // Enhanced loot bonuses based on enemy type and loot quality
        let qualityBonus = 0;
        if (enemyData.lootQuality === 'rare') qualityBonus = 0.15;
        else if (enemyData.lootQuality === 'epic') qualityBonus = 0.3;

        // Bosses and elites have enhanced drop rates
        const bossBonus = isBoss ? 0.2 : 0;
        const eliteBonus = enemyData.isElite ? 0.1 : 0;

        const itemsData = this.scene.cache.json.get('items') || this.scene.dataService?.getItems();

        drops.forEach(drop => {
            // Calculate adjusted drop chance
            let adjustedChance = drop.chance;

            // Apply level bonus
            adjustedChance += levelBonus;

            // Apply quality bonus
            adjustedChance += qualityBonus;

            // Apply boss and elite bonuses
            adjustedChance += bossBonus;
            adjustedChance += eliteBonus;

            // Apply rare item chance bonus (check if item is rare)
            let isRare = false;
            let baseItemData = null;
            for (const category of ['weapons', 'armor', 'accessories', 'consumables']) {
                if (itemsData && itemsData[category] && itemsData[category][drop.item]) {
                    baseItemData = itemsData[category][drop.item];
                    isRare = baseItemData.rarity === 'rare' || baseItemData.rarity === 'legendary' || baseItemData.rarity === 'epic';
                    break;
                }
            }
            if (isRare) {
                adjustedChance += rareItemChanceBonus;
            }

            // Cap chance at 1.0
            adjustedChance = Math.min(1.0, adjustedChance);

            // Bosses and epic loot enemies have at least 50% chance for their drops
            if (isBoss || enemyData.lootQuality === 'epic') {
                adjustedChance = Math.max(0.5, adjustedChance);
            }

            if (Math.random() < adjustedChance) {
                // Generate item scaled to current mile
                let generatedItem = null;
                if (baseItemData && this.proceduralItemGenerator) {
                    // Determine quality based on mile and enemy type
                    let itemQuality = baseItemData.rarity || 'common';

                    // Bosses and elites have better quality chances
                    if (isBoss || enemyData.isElite) {
                        const qualityRoll = Math.random();
                        if (qualityRoll < 0.3) itemQuality = 'legendary';
                        else if (qualityRoll < 0.6) itemQuality = 'epic';
                        else if (qualityRoll < 0.85) itemQuality = 'rare';
                        else itemQuality = 'uncommon';
                    }

                    // Generate item scaled to mile (with prestige bonuses)
                    generatedItem = this.proceduralItemGenerator.generateItemForMile(
                        baseItemData,
                        currentMile,
                        baseItemData.slot,
                        itemQuality,
                        qualityConfig,
                        this.prestigeManager // Pass prestige manager for bonuses
                    );
                }

                // Add to loot with item data
                loot.push({
                    id: drop.item,
                    quantity: 1,
                    itemData: generatedItem || baseItemData,
                    itemLevel: generatedItem?.itemLevel || baseItemData?.level || 1,
                    quality: generatedItem?.rarity || baseItemData?.rarity || 'common',
                    mileGenerated: currentMile
                });
            }
        });

        // Bosses guarantee at least one drop if they have drops defined
        if (isBoss && drops.length > 0 && loot.length === 0) {
            // Force drop one random item
            const randomDrop = drops[Math.floor(Math.random() * drops.length)];
            let baseItemData = null;
            for (const category of ['weapons', 'armor', 'accessories']) {
                if (itemsData && itemsData[category] && itemsData[category][randomDrop.item]) {
                    baseItemData = itemsData[category][randomDrop.item];
                    break;
                }
            }

            // Generate guaranteed boss drop with high quality
            let generatedItem = null;
            if (baseItemData && this.proceduralItemGenerator) {
                const qualityRoll = Math.random();
                let itemQuality = 'epic';
                if (qualityRoll < 0.5) itemQuality = 'legendary';

                generatedItem = this.proceduralItemGenerator.generateItemForMile(
                    baseItemData,
                    currentMile,
                    baseItemData.slot,
                    itemQuality,
                    qualityConfig,
                    this.prestigeManager // Pass prestige manager for bonuses
                );
            }

            loot.push({
                id: randomDrop.item,
                quantity: 1,
                itemData: generatedItem || baseItemData,
                itemLevel: generatedItem?.itemLevel || baseItemData?.level || 1,
                quality: generatedItem?.rarity || baseItemData?.rarity || 'common',
                mileGenerated: currentMile
            });
        }

        // Add consumable drops
        this.addConsumableDrops(loot, enemyData, isBoss, heroLevel);

        // Add gem drops
        this.addGemDrops(loot, currentMile, isBoss, enemyData);

        return loot;
    }

    /**
     * Add skill gem drops to loot
     * @param {Array} loot - Current loot array to add to
     * @param {number} currentMile - Current mile for scaling
     * @param {boolean} isBoss - Whether enemy is a boss
     * @param {Object} enemyData - Enemy data
     */
    addGemDrops(loot, currentMile, isBoss, enemyData) {
        // Bosses have 80% chance, elites 30%, regular mobs 5%
        const gemChance = isBoss ? 0.8 : (enemyData.isElite ? 0.3 : 0.05);
        if (Math.random() < gemChance) {
            const skillGemsData = this.scene.cache.json.get('skillGems')?.skillGems || 
                                  this.scene.dataService?.getSkillGems();
            if (!skillGemsData) return;

            // Pick random category and gem
            const categories = Object.keys(skillGemsData);
            if (categories.length === 0) return;

            const category = categories[Math.floor(Math.random() * categories.length)];
            const gems = Object.keys(skillGemsData[category] || {});
            if (gems.length === 0) return;

            const gemId = gems[Math.floor(Math.random() * gems.length)];
            const baseGemData = skillGemsData[category][gemId];

            if (baseGemData) {
                // Generate unique gem instance with scaled value
                const gemInstance = JSON.parse(JSON.stringify(baseGemData));
                const tier = Math.min(5, Math.floor(currentMile / 20) + 1);
                const tierMultiplier = 1 + (tier - 1) * 0.3;
                
                // Random value between min/max scaled by tier
                const valueRange = baseGemData.maxValue - baseGemData.minValue;
                gemInstance.value = Math.floor((baseGemData.minValue + Math.random() * valueRange) * tierMultiplier);
                gemInstance.instanceId = `gem-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                gemInstance.itemLevel = tier * 10;
                gemInstance.isGem = true;

                loot.push({
                    id: gemId,
                    quantity: 1,
                    itemData: gemInstance,
                    itemLevel: gemInstance.itemLevel,
                    quality: gemInstance.rarity || 'common',
                    mileGenerated: currentMile
                });
                
                Logger.info('CombatRewards', `Dropped gem: ${gemInstance.name} (Value: ${gemInstance.value})`);
            }
        }
    }

    /**
     * Add consumable drops to loot
     * @param {Array} loot - Current loot array to add to
     * @param {Object} enemyData - Enemy data
     * @param {boolean} isBoss - Whether enemy is a boss
     * @param {number} heroLevel - Hero level for scaling
     */
    addConsumableDrops(loot, enemyData, isBoss, heroLevel) {
        // Base consumable drop chances
        let consumableChance = 0.15; // 15% base chance

        // Scale with hero level (slightly)
        consumableChance += (heroLevel - 1) * 0.005;

        // Bosses have higher consumable drop chance
        if (isBoss) {
            consumableChance += 0.3; // +30% for bosses
        }

        // Elite enemies have moderate bonus
        if (enemyData.isElite) {
            consumableChance += 0.15; // +15% for elites
        }

        // Cap at 50% chance
        consumableChance = Math.min(0.5, consumableChance);

        if (Math.random() < consumableChance) {
            // Select random consumable based on rarity
            const consumables = [
                { id: 'minor_mana_potion', weight: 40, rarity: 'common' },
                { id: 'health_potion', weight: 30, rarity: 'common' },
                { id: 'energy_drink', weight: 25, rarity: 'common' },
                { id: 'mana_potion', weight: 15, rarity: 'uncommon' },
                { id: 'superior_health_potion', weight: 10, rarity: 'uncommon' },
                { id: 'major_mana_potion', weight: 5, rarity: 'rare' },
                { id: 'mana_regeneration_potion', weight: 2, rarity: 'rare' }
            ];

            // Calculate total weight
            const totalWeight = consumables.reduce((sum, item) => sum + item.weight, 0);

            // Select weighted random consumable
            let random = Math.random() * totalWeight;
            let selectedConsumable = consumables[0];

            for (const consumable of consumables) {
                random -= consumable.weight;
                if (random <= 0) {
                    selectedConsumable = consumable;
                    break;
                }
            }

            // Determine quantity (1-3 for common, 1-2 for uncommon/rare)
            const maxQuantity = selectedConsumable.rarity === 'common' ? 3 : 2;
            const quantity = Math.floor(Math.random() * maxQuantity) + 1;

            loot.push({
                id: selectedConsumable.id,
                quantity: quantity,
                type: 'consumable'
            });
        }
    }
}







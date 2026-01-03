/**
 * Procedural Item Generator - Generates random items with modifiers
 * Inspired by Pixel Exile's procedural itemization system
 */

import { Logger } from '../utils/logger.js';

export class ProceduralItemGenerator {
    /**
     * Create a new ProceduralItemGenerator.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} [config={}] - Configuration options.
     */
    constructor(scene, config = {}) {
        this.scene = scene;
        this.itemsData = config.itemsData || this.scene.cache.json.get('items');
        
        // Modifier pools (WotLK style)
        this.statModifiers = [
            { type: 'strength', min: 1, max: 50, weight: 10 },
            { type: 'agility', min: 1, max: 50, weight: 10 },
            { type: 'stamina', min: 1, max: 60, weight: 15 }, // Stamina is king in WotLK
            { type: 'intellect', min: 1, max: 50, weight: 10 },
            { type: 'spirit', min: 1, max: 50, weight: 8 },
            { type: 'attack', min: 1, max: 100, weight: 12 },
            { type: 'defense', min: 1, max: 100, weight: 10 },
            { type: 'health', min: 10, max: 500, weight: 8 },
            { type: 'mana', min: 10, max: 500, weight: 8 },
            { type: 'critRating', min: 5, max: 40, weight: 12 },
            { type: 'hasteRating', min: 5, max: 40, weight: 10 },
            { type: 'hitRating', min: 5, max: 30, weight: 8 },
            { type: 'expertiseRating', min: 5, max: 30, weight: 6 },
            { type: 'defenseRating', min: 5, max: 40, weight: 8 },
            { type: 'spellPower', min: 5, max: 60, weight: 15 }
        ];
        
        this.specialEffectModifiers = [
            { type: 'lifeSteal', min: 0.5, max: 5, weight: 5 },
            { type: 'manaSteal', min: 0.5, max: 5, weight: 4 },
            { type: 'thorns', min: 1, max: 20, weight: 4 },
            { type: 'reflect', min: 1, max: 15, weight: 3 },
            { type: 'regen', min: 1, max: 10, weight: 6 },
            { type: 'manaRegen', min: 1, max: 10, weight: 6 },
            { type: 'healingBonus', min: 0.05, max: 0.2, weight: 5 }
        ];

        // Suffixes based on stat combinations (WoW Style)
        this.suffixes = [
            { name: 'of the Bear', stats: ['strength', 'stamina'] },
            { name: 'of the Tiger', stats: ['strength', 'agility'] },
            { name: 'of the Gorilla', stats: ['strength', 'intellect'] },
            { name: 'of the Monkey', stats: ['agility', 'stamina'] },
            { name: 'of the Falcon', stats: ['agility', 'intellect'] },
            { name: 'of the Wolf', stats: ['agility', 'spirit'] },
            { name: 'of the Eagle', stats: ['stamina', 'intellect'] },
            { name: 'of the Whale', stats: ['stamina', 'spirit'] },
            { name: 'of the Owl', stats: ['intellect', 'spirit'] },
            { name: 'of the Boar', stats: ['strength', 'spirit'] },
            { name: 'of Power', stats: ['attack'] },
            { name: 'of Magic', stats: ['spellPower'] },
            { name: 'of Defense', stats: ['defense', 'defenseRating'] },
            { name: 'of the Soldier', stats: ['strength', 'stamina', 'critRating'] },
            { name: 'of the Elder', stats: ['intellect', 'stamina', 'spellPower'] }
        ];
        
        Logger.info('ProceduralItemGenerator', 'Initialized');
    }
    
    /**
     * Generate a procedural item
     * @param {Object} baseItem - Base item template (from items.json)
     * @param {number} itemLevel - Item level for scaling
     * @param {string} rarity - Item rarity (common, uncommon, rare, epic, legendary)
     * @returns {Object} Generated item with modifiers
     */
    generateItem(baseItem, itemLevel = 1, rarity = 'common') {
        const item = JSON.parse(JSON.stringify(baseItem)); // Deep clone
        
        // Set base properties
        item.instanceId = `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        item.level = itemLevel;
        item.rarity = rarity;
        item.isProcedural = true;
        item.modifiers = [];
        
        // Determine number of modifiers based on rarity
        const modifierCount = this.getModifierCount(rarity);
        
        // Generate modifiers
        for (let i = 0; i < modifierCount; i++) {
            const modifier = this.generateModifier(itemLevel, rarity);
            if (modifier) {
                item.modifiers.push(modifier);
            }
        }
        
        // Apply modifiers to item stats
        this.applyModifiersToStats(item);
        
        // Generate sockets based on rarity and level
        item.sockets = this.generateSockets(rarity, itemLevel);
        item.socketedGems = new Array(item.sockets.length).fill(null);
        
        // Update item name with rarity prefix and suffix
        const rarityPrefix = this.getRarityPrefix(rarity);
        const suffix = this.getSuffixForItem(item);
        
        item.name = (rarityPrefix ? rarityPrefix + ' ' : '') + item.name + (suffix ? ' ' + suffix : '');
        
        // Scale sell value based on modifiers
        item.sellValue = this.calculateSellValue(item);
        
        Logger.debug('ProceduralItemGenerator', `Generated ${rarity} item: ${item.name} with ${item.modifiers.length} modifiers`);
        
        return item;
    }

    /**
     * Determine a suffix for the item based on its modifiers
     * @param {Object} item - Item object
     * @returns {string|null} Suffix string or null
     */
    getSuffixForItem(item) {
        if (!item.modifiers || item.modifiers.length === 0) return null;

        // Group modifiers by type
        const stats = item.modifiers.map(m => m.type);
        
        // Find best matching suffix
        let bestSuffix = null;
        let maxMatches = 0;

        for (const suffix of this.suffixes) {
            const matches = suffix.stats.filter(s => stats.includes(s)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestSuffix = suffix.name;
            }
        }

        return bestSuffix;
    }
    
    /**
     * Get number of modifiers based on rarity
     * @param {string} rarity - Item rarity
     * @returns {number} Number of modifiers
     */
    getModifierCount(rarity) {
        const counts = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5
        };
        return counts[rarity] || 1;
    }
    
    /**
     * Generate a random modifier
     * @param {number} itemLevel - Item level
     * @param {string} rarity - Item rarity
     * @returns {Object} Modifier object
     */
    generateModifier(itemLevel, rarity) {
        // Choose modifier pool (85% stat/rating, 15% special effect)
        const roll = Math.random();
        let pool;
        
        if (roll < 0.85) {
            pool = this.statModifiers;
        } else {
            pool = this.specialEffectModifiers;
        }
        
        // Weighted random selection
        const totalWeight = pool.reduce((sum, mod) => sum + mod.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedMod = null;
        
        for (const mod of pool) {
            random -= mod.weight;
            if (random <= 0) {
                selectedMod = mod;
                break;
            }
        }
        
        if (!selectedMod) {
            selectedMod = pool[0]; // Fallback
        }
        
        // Calculate value based on level and rarity
        const rarityMultiplier = this.getRarityMultiplier(rarity);
        const levelMultiplier = 1 + (itemLevel - 1) * 0.1;
        const baseValue = selectedMod.min + (selectedMod.max - selectedMod.min) * Math.random();
        const value = Math.floor(baseValue * rarityMultiplier * levelMultiplier);
        
        return {
            type: selectedMod.type,
            value: value,
            isPercentage: selectedMod.type.includes('Chance') || selectedMod.type.includes('Speed') || selectedMod.type.includes('Steal')
        };
    }
    
    /**
     * Get rarity multiplier for modifier values
     * @param {string} rarity - Item rarity
     * @returns {number} Multiplier
     */
    getRarityMultiplier(rarity) {
        const multipliers = {
            common: 1.0,
            uncommon: 1.2,
            rare: 1.5,
            epic: 2.0,
            legendary: 3.0
        };
        return multipliers[rarity] || 1.0;
    }
    
    /**
     * Apply modifiers to item stats
     * @param {Object} item - Item to modify
     */
    applyModifiersToStats(item) {
        if (!item.stats) {
            item.stats = {};
        }
        
        item.modifiers.forEach(modifier => {
            if (modifier.isPercentage) {
                // Percentage modifiers
                if (!item.stats[modifier.type]) {
                    item.stats[modifier.type] = 0;
                }
                item.stats[modifier.type] += modifier.value;
            } else {
                // Flat modifiers
                if (!item.stats[modifier.type]) {
                    item.stats[modifier.type] = 0;
                }
                item.stats[modifier.type] += modifier.value;
            }
        });
    }
    
    /**
     * Generate sockets for an item based on rarity and level
     * @param {string} rarity - Item rarity
     * @param {number} level - Item level
     * @returns {Array} Array of socket types
     */
    generateSockets(rarity, level) {
        const sockets = [];
        
        // No sockets for common items usually, or low chance
        let maxSockets = 0;
        let socketChance = 0;

        switch (rarity) {
            case 'common':
                maxSockets = 1;
                socketChance = 0.05;
                break;
            case 'uncommon':
                maxSockets = 1;
                socketChance = 0.2;
                break;
            case 'rare':
                maxSockets = 2;
                socketChance = 0.5;
                break;
            case 'epic':
                maxSockets = 3;
                socketChance = 0.8;
                break;
            case 'legendary':
                maxSockets = 3;
                socketChance = 1.0;
                break;
        }

        // Only generate sockets if we pass the chance roll
        if (Math.random() < socketChance) {
            const socketCount = Math.floor(Math.random() * maxSockets) + 1;
            const socketTypes = ['red', 'blue', 'yellow', 'meta'];
            
            for (let i = 0; i < socketCount; i++) {
                // Meta sockets only for head items and high rarity
                if (i === 0 && rarity === 'legendary' && Math.random() < 0.3) {
                    sockets.push('meta');
                } else {
                    // Random standard socket
                    sockets.push(socketTypes[Math.floor(Math.random() * 3)]); // red, blue, or yellow
                }
            }
        }

        return sockets;
    }

    /**
     * Get rarity prefix for item name
     * @param {string} rarity - Item rarity
     * @returns {string} Prefix
     */
    getRarityPrefix(rarity) {
        const prefixes = {
            common: '',
            uncommon: 'Fine',
            rare: 'Superior',
            epic: 'Epic',
            legendary: 'Legendary'
        };
        return prefixes[rarity] || '';
    }
    
    /**
     * Calculate sell value based on item properties
     * @param {Object} item - Item
     * @returns {number} Sell value
     */
    calculateSellValue(item) {
        const baseValue = item.sellValue || 10;
        const rarityMultiplier = this.getRarityMultiplier(item.rarity);
        const modifierBonus = item.modifiers.length * 5;
        const levelBonus = (item.level || 1) * 2;
        
        return Math.floor((baseValue + modifierBonus + levelBonus) * rarityMultiplier);
    }
    
    /**
     * Generate random rarity based on level
     * @param {number} itemLevel - Item level
     * @returns {string} Rarity
     */
    getRandomRarity(itemLevel) {
        const roll = Math.random();
        
        // Higher level = better chance for rare items
        const legendaryChance = Math.min(0.01 + (itemLevel * 0.001), 0.05);
        const epicChance = Math.min(0.05 + (itemLevel * 0.002), 0.15);
        const rareChance = Math.min(0.15 + (itemLevel * 0.003), 0.30);
        const uncommonChance = Math.min(0.30 + (itemLevel * 0.005), 0.50);
        
        if (roll < legendaryChance) return 'legendary';
        if (roll < epicChance) return 'epic';
        if (roll < rareChance) return 'rare';
        if (roll < uncommonChance) return 'uncommon';
        return 'common';
    }

    /**
     * Calculate item level from current mile
     * @param {number} mile - Current mile (0-100)
     * @returns {number} Item level (1-100)
     */
    calculateItemLevel(mile) {
        // Linear scaling: Mile 0 = Level 1, Mile 100 = Level 100
        return Math.floor(mile) + 1;
    }

    /**
     * Determine quality for mile based on world config
     * @param {number} mile - Current mile
     * @param {Object} qualityConfig - Quality scaling config from world-config.json
     * @returns {string} Rarity
     */
    determineQualityForMile(mile, qualityConfig) {
        if (!qualityConfig) {
            // Fallback to level-based rarity
            return this.getRandomRarity(this.calculateItemLevel(mile));
        }

        const roll = Math.random();
        let cumulativeChance = 0;

        // Calculate chances for each quality based on mile
        const qualities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
        
        for (const quality of qualities) {
            const config = qualityConfig[quality];
            if (!config || mile < config.minMile || mile > config.maxMile) {
                continue;
            }

            // Calculate chance for this quality at this mile
            let chance = config.baseChance || 0;
            if (config.chanceGrowth) {
                chance += (mile - config.minMile) * config.chanceGrowth;
            }
            if (config.chanceDecay) {
                chance -= (mile - config.minMile) * config.chanceDecay;
            }

            cumulativeChance += Math.max(0, Math.min(1, chance));
            
            if (roll < cumulativeChance) {
                return quality;
            }
        }

        return 'common'; // Fallback
    }

    /**
     * Generate item for specific mile with scaling
     * @param {Object} baseItem - Base item template (from items.json)
     * @param {number} currentMile - Current mile (0-100)
     * @param {string} slot - Item slot (optional)
     * @param {string} quality - Item quality (optional, will be determined if not provided)
     * @param {Object} qualityConfig - Quality scaling config (optional)
     * @param {Object} prestigeManager - Prestige manager instance (optional, Phase 6)
     * @returns {Object} Generated item scaled to mile
     */
    generateItemForMile(baseItem, currentMile, slot = null, quality = null, qualityConfig = null, prestigeManager = null) {
        // Calculate item level from mile
        let itemLevel = this.calculateItemLevel(currentMile);
        
        // Apply prestige item level boost (Phase 6: Prestige Gear Integration)
        if (prestigeManager) {
            itemLevel += prestigeManager.getItemLevelBoost();
        }
        
        // Determine quality if not provided
        if (!quality) {
            quality = this.determineQualityForMile(currentMile, qualityConfig);
            
            // Apply prestige quality bonus (Phase 6: Prestige Gear Integration)
            if (prestigeManager) {
                const qualityBonus = prestigeManager.getItemQualityBonus();
                if (qualityBonus > 0) {
                    // Increase quality chance based on prestige bonus
                    const roll = Math.random();
                    const qualityChances = {
                        'common': 0.5,
                        'uncommon': 0.3,
                        'rare': 0.15,
                        'epic': 0.05,
                        'legendary': 0.01
                    };
                    
                    // Shift quality distribution upward
                    if (roll < qualityBonus && quality === 'common') {
                        quality = 'uncommon';
                    } else if (roll < qualityBonus * 0.5 && quality === 'uncommon') {
                        quality = 'rare';
                    } else if (roll < qualityBonus * 0.3 && quality === 'rare') {
                        quality = 'epic';
                    } else if (roll < qualityBonus * 0.1 && quality === 'epic') {
                        quality = 'legendary';
                    }
                }
            }
        }
        
        // Generate base item with modifiers
        const item = this.generateItem(baseItem, itemLevel, quality);
        
        // Assign armor type for armor pieces (WotLK style)
        if (item.type === 'armor' && !item.armorType) {
            const armorTypes = ['cloth', 'leather', 'mail', 'plate'];
            // Distribute armor types by mile/tier if needed, but for now random or based on baseItem
            // If baseItem doesn't specify, we pick one randomly or based on some logic
            // Most armor items in items.json like 'leather_armor' already imply a type
            if (item.id.includes('leather')) item.armorType = 'leather';
            else if (item.id.includes('plate') || item.id.includes('iron')) item.armorType = 'plate';
            else if (item.id.includes('mail') || item.id.includes('chain')) item.armorType = 'mail';
            else if (item.id.includes('cloth') || item.id.includes('robe')) item.armorType = 'cloth';
            else {
                // Default to random based on mile? No, let's just pick one
                item.armorType = armorTypes[Math.floor(Math.random() * armorTypes.length)];
            }
        }
        
        // Apply mile-based stat scaling
        const statMultiplier = 1 + (currentMile * 0.1);
        if (item.stats) {
            Object.keys(item.stats).forEach(stat => {
                if (typeof item.stats[stat] === 'number') {
                    item.stats[stat] = Math.floor(item.stats[stat] * statMultiplier);
                }
            });
        }
        
        // Set itemLevel field explicitly (separate from level for clarity)
        item.itemLevel = itemLevel;
        item.mileGenerated = currentMile;
        
        // Calculate tier based on mile (Phase 4: Tier Progression System)
        item.tier = this.calculateTier(currentMile);
        
        // Ensure slot is set
        if (slot && !item.slot) {
            item.slot = slot;
        }
        
        Logger.debug('ProceduralItemGenerator', `Generated ${quality} item for mile ${currentMile}: ${item.name} (Level ${itemLevel}, Tier ${item.tier})`);
        
        return item;
    }

    /**
     * Generate item from template pool for a specific mile
     * @param {number} mile - Current mile
     * @param {string} slot - Item slot
     * @param {string} quality - Item quality (optional)
     * @param {Object} qualityConfig - Quality scaling config (optional)
     * @returns {Object|null} Generated item or null if no templates found
     */
    generateItemFromTemplate(mile, slot, quality = null, qualityConfig = null) {
        const templates = this.getTemplatesForSlot(slot);
        if (templates.length === 0) {
            Logger.warn('ProceduralItemGenerator', `No templates found for slot: ${slot}`);
            return null;
        }
        
        // Select random template
        const baseTemplate = templates[Math.floor(Math.random() * templates.length)];
        
        // Generate procedural item
        const item = this.generateItemForMile(baseTemplate, mile, slot, quality, qualityConfig);
        
        return item;
    }

    /**
     * Calculate tier based on mile (Phase 4: Tier Progression System)
     * @param {number} mile - Current mile (0-100)
     * @returns {number} Tier (1-5)
     */
    calculateTier(mile) {
        if (mile >= 81) return 5; // Legendary
        if (mile >= 61) return 4; // Elite
        if (mile >= 41) return 3; // Advanced
        if (mile >= 21) return 2; // Improved
        return 1; // Basic
    }

    /**
     * Get templates for a specific slot
     * @param {string} slot - Item slot
     * @returns {Array} Array of item templates
     */
    getTemplatesForSlot(slot) {
        const templates = [];
        
        if (!this.itemsData) {
            return templates;
        }
        
        // Search through all item categories
        for (const category of ['weapons', 'armor', 'accessories', 'consumables']) {
            if (this.itemsData[category]) {
                Object.values(this.itemsData[category]).forEach(item => {
                    if (item.slot === slot) {
                        templates.push(item);
                    }
                });
            }
        }
        
        return templates;
    }
}


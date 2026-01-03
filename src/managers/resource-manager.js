import Phaser from 'phaser';
import { Logger } from '../utils/logger.js';
import { BaseManager } from './base-manager.js';

/**
 * Resource Manager - Handles mana, energy, and other resource systems
 * Manages regeneration, consumption, and strategic resource allocation
 */
export class ResourceManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // ResourceManager has no dependencies
    }

    /**
     * Create a new ResourceManager
     * @param {Phaser.Scene} scene - Phaser scene instance
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        this.worldConfig = this.scene.cache.json.get('worldConfig');

        // Resource pools per hero
        this.heroResources = new Map(); // heroId -> resource data

        // Consumable inventory
        this.consumables = new Map(); // itemId -> {count, effects}

        // Regeneration strategies
        this.regenerationStrategies = {
            passive: { multiplier: 1.0, description: 'Standard regeneration' },
            active: { multiplier: 1.5, description: 'Enhanced regeneration (spend gold)' },
            burst: { multiplier: 2.0, duration: 3, description: 'Burst regeneration for short time' }
        };

        this.currentStrategy = 'passive';
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        Logger.info('ResourceManager', 'Initialized');
    }

    /**
     * Initialize resources for a hero
     * @param {string} heroId - Hero ID
     * @param {Object} heroStats - Hero stats including mana, energy, etc.
     */
    initializeHeroResources(heroId, heroStats) {
        if (!heroId || !heroStats) {
            Logger.warn('ResourceManager', 'Invalid hero data provided to initializeHeroResources');
            return;
        }

        const resources = {
            mana: {
                current: Math.max(0, heroStats.mana || heroStats.maxMana || 100),
                max: Math.max(1, heroStats.maxMana || 100),
                regenRate: Math.max(0, heroStats.manaRegen || 1),
                lastRegenTime: Date.now()
            },
            energy: {
                current: Math.max(0, heroStats.energy || heroStats.maxEnergy || 100),
                max: Math.max(1, heroStats.maxEnergy || 100),
                regenRate: Math.max(0, heroStats.energyRegen || 2),
                lastRegenTime: Date.now()
            },
            focus: {
                current: Math.max(0, heroStats.focus || heroStats.maxFocus || 100),
                max: Math.max(1, heroStats.maxFocus || 100),
                regenRate: Math.max(0, heroStats.focusRegen || 1),
                lastRegenTime: Date.now()
            },
            rage: {
                current: 0, // Rage starts at 0
                max: 100,
                regenRate: 0, // Rage usually doesn't regenerate passively
                decayRate: 2, // Rage decays at 2 per second out of combat
                lastRegenTime: Date.now()
            }
        };

        // Ensure current values don't exceed max
        Object.keys(resources).forEach(resourceType => {
            resources[resourceType].current = Math.min(resources[resourceType].current, resources[resourceType].max);
        });

        this.heroResources.set(heroId, resources);
        Logger.info('ResourceManager', `Initialized resources for hero ${heroId}`);
    }

    /**
     * Update resource regeneration
     * @param {number} deltaTime - Time elapsed in ms
     */
    updateRegeneration(deltaTime) {
        // Only regenerate once per second, not every frame
        if (!this.lastRegenUpdate) {
            this.lastRegenUpdate = Date.now();
            return;
        }

        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastRegenUpdate;

        if (timeSinceLastUpdate >= 1000) { // Regenerate every second
            const regenMultiplier = this.regenerationStrategies[this.currentStrategy].multiplier;
            const isInCombat = this.scene.combatManager?.isInCombat || false;

            this.heroResources.forEach((resources, heroId) => {
                const hero = this.scene.partyManager?.getHeroById(heroId);
                const bloodline = hero?.bloodline;

                // Update each resource type
                Object.keys(resources).forEach(resourceType => {
                    const resource = resources[resourceType];

                    if (resourceType === 'rage') {
                        if (isInCombat) {
                            // No passive regen or decay in combat for rage (gained via attacks)
                        } else {
                            // Decay rage out of combat
                            resource.current = Math.max(0, resource.current - (resource.decayRate || 2));
                        }
                    } else {
                        // Standard regen for Mana, Energy, Focus
                        let regenAmount = Math.floor(resource.regenRate * regenMultiplier);
                        
                        // Apply Bloodline Mana Regen (e.g., Arcane Scholar)
                        if (resourceType === 'mana' && bloodline?.passiveEffects) {
                            const manaRegenEffect = bloodline.passiveEffects.find(e => e.type === 'mana_regen');
                            if (manaRegenEffect) {
                                regenAmount += manaRegenEffect.value;
                            }
                        }

                        resource.current = Math.min(resource.max, resource.current + regenAmount);
                    }
                });

                // Apply Bloodline Health Regen (e.g., Beast Master)
                if (hero && hero.currentStats && bloodline) {
                    let hpRegen = 0;
                    
                    // 1. Flat health regen
                    const flatRegenEffect = bloodline.passiveEffects?.find(e => e.type === 'health_regen');
                    if (flatRegenEffect) {
                        hpRegen += flatRegenEffect.value;
                    }

                    // 2. Percentage health regen (Nature's Bond)
                    if (bloodline.uniqueAbility?.id === 'nature_bond') {
                        hpRegen += Math.floor(hero.currentStats.maxHealth * 0.02);
                    }

                    if (hpRegen > 0) {
                        hero.currentStats.health = Math.min(
                            hero.currentStats.maxHealth,
                            hero.currentStats.health + hpRegen
                        );
                    }
                }
            });

            this.lastRegenUpdate = now;
        }
    }

    /**
     * Consume resource from hero
     * @param {string} heroId - Hero ID
     * @param {string} resourceType - Resource type (mana, energy, focus)
     * @param {number} amount - Amount to consume
     * @returns {boolean} True if consumption successful
     */
    consumeResource(heroId, resourceType, amount) {
        const resources = this.heroResources.get(heroId);
        if (!resources || !resources[resourceType]) return false;

        if (resources[resourceType].current >= amount) {
            resources[resourceType].current -= amount;
            return true;
        }

        return false;
    }

    /**
     * Restore resource to hero
     * @param {string} heroId - Hero ID
     * @param {string} resourceType - Resource type
     * @param {number} amount - Amount to restore
     */
    restoreResource(heroId, resourceType, amount) {
        const resources = this.heroResources.get(heroId);
        if (!resources || !resources[resourceType]) return;

        resources[resourceType].current = Math.min(
            resources[resourceType].max,
            resources[resourceType].current + amount
        );
    }

    /**
     * Use a consumable item
     * @param {string} itemId - Consumable item ID
     * @param {string} heroId - Hero to apply effects to
     * @returns {boolean} True if used successfully
     */
    useConsumable(itemId, heroId) {
        const consumable = this.consumables.get(itemId);
        if (!consumable || consumable.count <= 0) return false;

        // Get item data from cache
        const itemsData = this.scene.cache.json.get('items');
        const itemData = itemsData?.consumables?.[itemId];
        if (!itemData) return false;

        // Apply consumable effects
        if (itemData.effects) {
            Object.entries(itemData.effects).forEach(([effectType, value]) => {
                switch (effectType) {
                    case 'restoreMana':
                        this.restoreResource(heroId, 'mana', value);
                        break;
                    case 'restoreEnergy':
                        this.restoreResource(heroId, 'energy', value);
                        break;
                    case 'restoreHealth':
                        // Apply to hero health
                        const hero = this.scene.partyManager?.getHeroById(heroId);
                        if (hero && hero.currentStats) {
                            hero.currentStats.health = Math.min(
                                hero.currentStats.maxHealth,
                                hero.currentStats.health + value
                            );
                        }
                        break;
                    case 'manaRegenBoost':
                        // Temporary regen boost
                        this.applyTemporaryRegenBoost(heroId, 'mana', value, itemData.duration || 30);
                        break;
                }
            });
        }

        consumable.count--;
        if (consumable.count <= 0) {
            this.consumables.delete(itemId);
        }

        return true;
    }

    /**
     * Apply temporary regeneration boost
     * @param {string} heroId - Hero ID
     * @param {string} resourceType - Resource type
     * @param {number} multiplier - Regen multiplier
     * @param {number} duration - Duration in seconds
     */
    applyTemporaryRegenBoost(heroId, resourceType, multiplier, duration) {
        const resources = this.heroResources.get(heroId);
        if (!resources || !resources[resourceType]) return;

        const originalRate = resources[resourceType].regenRate;
        resources[resourceType].regenRate *= multiplier;

        // Schedule restoration of original rate
        this.scene.time.delayedCall(duration * 1000, () => {
            if (resources[resourceType]) {
                resources[resourceType].regenRate = originalRate;
            }
        });
    }

    /**
     * Set regeneration strategy
     * @param {string} strategy - Strategy name (passive, active, burst)
     */
    setRegenerationStrategy(strategy) {
        if (this.regenerationStrategies[strategy]) {
            this.currentStrategy = strategy;

            if (strategy === 'burst') {
                // Schedule return to passive after burst duration
                this.scene.time.delayedCall(
                    this.regenerationStrategies.burst.duration * 1000,
                    () => {
                        this.currentStrategy = 'passive';
                    }
                );
            }

            Logger.info('ResourceManager', `Changed regeneration strategy to ${strategy}`);
        }
    }

    /**
     * Add consumable to inventory
     * @param {string} itemId - Item ID
     * @param {Object} consumableData - Consumable data
     */
    addConsumable(itemId, consumableData) {
        const existing = this.consumables.get(itemId);
        if (existing) {
            existing.count += consumableData.count || 1;
        } else {
            this.consumables.set(itemId, {
                ...consumableData,
                count: consumableData.count || 1
            });
        }
    }

    /**
     * Get resource data for hero
     * @param {string} heroId - Hero ID
     * @param {string} resourceType - Resource type
     * @returns {Object} Resource data
     */
    getResourceData(heroId, resourceType) {
        const resources = this.heroResources.get(heroId);
        return resources ? resources[resourceType] : null;
    }

    /**
     * Get all consumables
     * @returns {Map} Consumables inventory
     */
    getConsumables() {
        return new Map(this.consumables);
    }

    /**
     * Check if hero can afford resource cost
     * @param {string} heroId - Hero ID
     * @param {string} resourceType - Resource type
     * @param {number} cost - Cost amount
     * @returns {boolean} True if can afford
     */
    canAfford(heroId, resourceType, cost) {
        const resource = this.getResourceData(heroId, resourceType);
        return resource && resource.current >= cost;
    }

    /**
     * Better alias for canAfford used by AbilityManager
     * @param {string} heroId - Hero ID
     * @param {number} cost - Resource cost
     * @param {string} resourceType - Resource type
     * @returns {boolean} - True if hero has enough resources
     */
    hasResource(heroId, cost, resourceType) {
        return this.canAfford(heroId, resourceType, cost);
    }
}

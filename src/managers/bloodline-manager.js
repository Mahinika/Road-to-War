/**
 * Bloodline Manager - Handles bloodline unique abilities and passive effects
 * Manages runtime bloodline mechanics during gameplay
 */
import { Logger } from '../utils/logger.js';
import { ManagerValidationMixin } from '../utils/input-validation.js';
import { BaseManager } from './base-manager.js';

export class BloodlineManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // BloodlineManager has no dependencies
    }

    /**
     * Create a new BloodlineManager
     * @param {Phaser.Scene} scene - Phaser scene instance
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        // Apply validation mixin
        Object.assign(this, ManagerValidationMixin);
        this.bloodlinesData = this.scene.cache.json.get('bloodlines');

        // Track active bloodline effects
        this.activeEffects = new Map(); // Map<heroId, Map<effectId, effectData>>

        // Cooldown tracking for abilities
        this.cooldowns = new Map(); // Map<heroId_abilityId, {cooldown, maxCooldown}>
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        Logger.info('BloodlineManager', 'Initialized');
    }

    /**
     * Apply bloodline effects when hero takes damage
     * @param {Object} hero - Hero object
     * @param {number} damage - Damage amount
     * @param {Object} attacker - Attacking enemy
     * @returns {Object} Modified damage and effects
     */
    onHeroDamageTaken(hero, damage, attacker) {
        if (!hero.bloodlineId || !hero.bloodline) return { damage };

        const bloodline = hero.bloodline;
        const result = { damage, effects: [] };

        try {
            switch (bloodline.id) {
                case 'frostborn':
                    // Frost Armor: 25% chance to slow attacker by 50% for 3 seconds
                    if (Math.random() < 0.25) {
                        result.effects.push({
                            type: 'slow',
                            target: attacker,
                            amount: 0.5,
                            duration: 3000,
                            description: 'Frost Armor slow'
                        });
                        this.showBloodlineEffect(hero, 'Frost Armor triggered!', '#4fc3f7');
                    }
                    break;

                case 'void_walker': {
                    // Check for Void Step (emergency teleport)
                    const healthPercent = hero.currentStats.health / hero.currentStats.maxHealth;
                    if (healthPercent <= 0.1) { // Below 10% health
                        const cooldownKey = `${hero.id}_void_step`;
                        const cooldown = this.cooldowns.get(cooldownKey);

                        if (!cooldown || cooldown.cooldown <= 0) {
                            // Emergency teleport
                            result.damage = 0; // Prevent death
                            result.effects.push({
                                type: 'teleport',
                                target: hero,
                                distance: 200,
                                description: 'Void Step emergency teleport'
                            });
                            result.effects.push({
                                type: 'heal',
                                target: hero,
                                amount: 1, // Set to 1 health
                                description: 'Void Step health restoration'
                            });

                            // Set cooldown (60 seconds)
                            this.cooldowns.set(cooldownKey, { cooldown: 60000, maxCooldown: 60000 });

                            this.showBloodlineEffect(hero, 'Void Step activated!', '#800080');
                            Logger.info('BloodlineManager', `Void Step activated for ${hero.name}`);
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            Logger.error('BloodlineManager', `Error in onHeroDamageTaken: ${error.message}`);
        }

        return result;
    }

    /**
     * Apply bloodline effects when hero deals damage
     * @param {Object} hero - Hero object
     * @param {number} damage - Damage dealt
     * @param {Object} target - Target enemy
     * @param {boolean} isCritical - Whether it was a critical hit
     * @returns {Object} Modified damage and additional effects
     */
    onHeroDamageDealt(hero, damage, target, isCritical = false) {
        if (!hero.bloodlineId || !hero.bloodline) return { damage, additionalEffects: [] };

        const bloodline = hero.bloodline;
        const result = { damage, additionalEffects: [] };

        try {
            switch (bloodline.id) {
                case 'ancient_warrior': {
                    // Warrior's Rage: +25% damage when below 50% health
                    const healthPercent = hero.currentStats.health / hero.currentStats.maxHealth;
                    if (healthPercent < 0.5) {
                        const bonusDamage = Math.floor(damage * 0.25);
                        result.damage += bonusDamage;
                        result.additionalEffects.push({
                            type: 'damage_bonus',
                            amount: bonusDamage,
                            description: 'Warrior\'s Rage'
                        });
                    }
                    break;
                }

                case 'shadow_assassin':
                    // Shadow Strike: 30% chance for critical hits to deal double damage
                    if (isCritical && Math.random() < 0.3) {
                        const bonusDamage = damage; // Double the damage
                        result.damage += bonusDamage;
                        result.additionalEffects.push({
                            type: 'damage_bonus',
                            amount: bonusDamage,
                            description: 'Shadow Strike'
                        });
                        this.showBloodlineEffect(hero, 'Shadow Strike!', '#800080');
                    }
                    break;

                case 'dragon_kin':
                    // Dragon's Breath: 20% chance to deal fire damage equal to 50% of attack power
                    if (Math.random() < 0.2) {
                        const fireDamage = Math.floor((hero.currentStats.attack || 0) * 0.5);
                        result.additionalEffects.push({
                            type: 'additional_damage',
                            amount: fireDamage,
                            damageType: 'fire',
                            description: 'Dragon\'s Breath'
                        });
                        this.showBloodlineEffect(hero, 'Dragon\'s Breath!', '#ff6600');
                    }
                    break;

                case 'lightning_touched':
                    // Chain Lightning: 15% chance to chain to nearby enemies
                    if (Math.random() < 0.15) {
                        // Find nearby enemies (simplified - in a real implementation would check distance)
                        result.additionalEffects.push({
                            type: 'chain_damage',
                            baseDamage: Math.floor(damage * 0.5),
                            maxChains: 3,
                            description: 'Chain Lightning'
                        });
                        this.showBloodlineEffect(hero, 'Chain Lightning!', '#4fc3f7');
                    }
                    break;
            }
        } catch (error) {
            Logger.error('BloodlineManager', `Error in onHeroDamageDealt: ${error.message}`);
        }

        return result;
    }

    /**
     * Apply bloodline effects when hero casts a spell/ability
     * @param {Object} hero - Hero object
     * @param {string} abilityId - Ability ID
     * @param {number} manaCost - Original mana cost
     * @returns {Object} Modified costs and effects
     */
    onAbilityCast(hero, abilityId, manaCost) {
        if (!hero.bloodlineId || !hero.bloodline) return { manaCost };

        const bloodline = hero.bloodline;
        const result = { manaCost };

        try {
            switch (bloodline.id) {
                case 'arcane_scholar':
                    // Arcane Mastery: 20% mana cost reduction, 15% damage increase
                    result.manaCost = Math.floor(manaCost * 0.8);
                    result.damageMultiplier = 1.15;
                    break;
            }
        } catch (error) {
            Logger.error('BloodlineManager', `Error in onAbilityCast: ${error.message}`);
        }

        return result;
    }

    /**
     * Apply bloodline passive regeneration effects
     * @param {Object} hero - Hero object
     * @param {number} deltaTime - Time since last update in seconds
     */
    applyPassiveRegeneration(hero, deltaTime) {
        if (!hero.bloodlineId || !hero.bloodline) return;

        try {
            const bloodline = hero.bloodline;
            const effects = hero.currentStats?.bloodlinePassiveEffects || bloodline.passiveEffects;

            if (!effects) return;

            effects.forEach(effect => {
                switch (effect.type) {
                    case 'mana_regen': {
                        // +2 mana per second
                        const manaRegen = effect.value * deltaTime;
                        if (hero.currentStats.currentResource < hero.currentStats.maxResource) {
                            hero.currentStats.currentResource = Math.min(
                                hero.currentStats.maxResource,
                                hero.currentStats.currentResource + manaRegen
                            );
                        }
                        break;
                    }

                    case 'health_regen': {
                        // +5 health per second
                        const healthRegen = effect.value * deltaTime;
                        if (hero.currentStats.health < hero.currentStats.maxHealth) {
                            hero.currentStats.health = Math.min(
                                hero.currentStats.maxHealth,
                                hero.currentStats.health + healthRegen
                            );
                        }
                        break;
                    }
                }
            });
        } catch (error) {
            Logger.error('BloodlineManager', `Error in applyPassiveRegeneration: ${error.message}`);
        }
    }

    /**
     * Check for Divine Protection shield trigger
     * @param {Object} hero - Hero object
     * @param {number} damage - Incoming damage
     * @returns {Object} Shield effect if triggered
     */
    checkDivineProtection(hero, damage) {
        if (hero.bloodlineId !== 'divine_guardian') return null;

        const healthPercent = hero.currentStats.health / hero.currentStats.maxHealth;
        if (healthPercent > 0.3) return null; // Only triggers below 30%

        const cooldownKey = `${hero.id}_divine_protection`;
        const cooldown = this.cooldowns.get(cooldownKey);

        if (cooldown && cooldown.cooldown > 0) return null; // On cooldown

        // Create shield equal to 50% of max health
        const shieldAmount = Math.floor(hero.currentStats.maxHealth * 0.5);

        // Set cooldown (assume 5 minutes = 300 seconds)
        this.cooldowns.set(cooldownKey, { cooldown: 300000, maxCooldown: 300000 });

        this.showBloodlineEffect(hero, 'Divine Protection!', '#ffff00');

        return {
            type: 'shield',
            amount: shieldAmount,
            description: 'Divine Protection shield'
        };
    }

    /**
     * Update cooldowns
     * @param {number} deltaTime - Time elapsed in ms
     */
    updateCooldowns(deltaTime) {
        this.cooldowns.forEach((cooldownData, key) => {
            if (cooldownData.cooldown > 0) {
                cooldownData.cooldown = Math.max(0, cooldownData.cooldown - deltaTime);
            }
        });
    }

    /**
     * Show bloodline effect notification
     * @param {Object} hero - Hero object
     * @param {string} message - Effect message
     * @param {string} color - Text color
     */
    showBloodlineEffect(hero, message, color = '#ffffff') {
        if (this.scene.showTemporaryMessage) {
            this.scene.showTemporaryMessage(`${hero.name}: ${message}`, color);
        }

        // Could also emit an event for UI feedback
        this.scene.events.emit('bloodline_effect_triggered', {
            hero: hero,
            message: message,
            color: color
        });
    }

    /**
     * Get bloodline tooltip/description
     * @param {string} bloodlineId - Bloodline ID
     * @returns {string} Formatted description
     */
    getBloodlineDescription(bloodlineId) {
        if (!this.bloodlinesData?.bloodlines?.[bloodlineId]) return '';

        const bloodline = this.bloodlinesData.bloodlines[bloodlineId];

        let description = `${bloodline.name}\n${bloodline.description}\n\n`;

        // Stat bonuses
        if (bloodline.statBonuses && Object.keys(bloodline.statBonuses).length > 0) {
            description += 'Stat Bonuses:\n';
            Object.entries(bloodline.statBonuses).forEach(([stat, value]) => {
                description += `+${value} ${stat}\n`;
            });
            description += '\n';
        }

        // Unique Ability
        if (bloodline.uniqueAbility) {
            description += `Unique Ability: ${bloodline.uniqueAbility.name}\n`;
            description += `${bloodline.uniqueAbility.description}\n\n`;
        }

        // Passive Effects
        if (bloodline.passiveEffects && bloodline.passiveEffects.length > 0) {
            description += 'Passive Effects:\n';
            bloodline.passiveEffects.forEach(effect => {
                description += `${effect.description}\n`;
            });
        }

        return description;
    }
}

import Phaser from 'phaser';
import { Logger } from '../utils/logger.js';
import { BaseManager } from './base-manager.js';

/**
 * Status Effects Manager - Handles all status effects on combatants
 * Manages effects like stun, bleed, poison, shield, regeneration, buffs/debuffs
 */
export class StatusEffectsManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // StatusEffectsManager has no dependencies
    }

    /**
     * Create a new StatusEffectsManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        this.worldConfig = this.scene.cache.json.get('worldConfig');
        
        // Status effect definitions
        this.effectTypes = {
            stun: {
                name: 'Stun',
                duration: 1,
                icon: '⚡',
                color: '#ffff00',
                stackable: false
            },
            bleed: {
                name: 'Bleed',
                duration: 3,
                damagePerTurn: 5,
                icon: '🩸',
                color: '#ff0000',
                stackable: true
            },
            poison: {
                name: 'Poison',
                duration: 4,
                damagePerTurn: 3,
                icon: '☠',
                color: '#00ff00',
                stackable: true
            },
            shield: {
                name: 'Shield',
                duration: 3,
                absorbAmount: 20,
                icon: '🛡',
                color: '#0088ff',
                stackable: false
            },
            regeneration: {
                name: 'Regeneration',
                duration: 3,
                healPerTurn: 10,
                icon: '✨',
                color: '#00ff88',
                stackable: false
            },
            buff_attack: {
                name: 'Attack Buff',
                duration: 3,
                statModifier: 0.25,
                icon: '⚔',
                color: '#ff8800',
                stackable: false
            },
            buff_defense: {
                name: 'Defense Buff',
                duration: 3,
                statModifier: 0.25,
                icon: '🛡',
                color: '#0088ff',
                stackable: false
            },
            debuff_attack: {
                name: 'Attack Debuff',
                duration: 2,
                statModifier: -0.2,
                icon: '⚔',
                color: '#888888',
                stackable: false
            },
            debuff_defense: {
                name: 'Defense Debuff',
                duration: 2,
                statModifier: -0.2,
                icon: '🛡',
                color: '#888888',
                stackable: false
            }
        };
        
        Logger.info('StatusEffectsManager', 'Initialized');
    }

    /**
     * Apply a status effect to a combatant
     * @param {Object} combatant - Hero or enemy to apply effect to
     * @param {string} effectType - Type of effect (from effectTypes)
     * @param {number} duration - Duration in turns (optional, uses default if not provided)
     * @param {Object} customData - Custom effect data (damage, modifier, etc.)
     * @returns {boolean} - True if effect was applied
     */
    applyEffect(combatant, effectType, duration = null, customData = {}) {
        if (!combatant || !combatant.data) return false;
        
        const effectDef = this.effectTypes[effectType];
        if (!effectDef) {
            Logger.error('StatusEffectsManager', `Unknown effect type: ${effectType}`);
            return false;
        }
        
        // Initialize effects object if needed
        if (!combatant.data.statusEffects) {
            combatant.data.statusEffects = {};
        }
        
        const effects = combatant.data.statusEffects;
        const effectDuration = duration !== null ? duration : effectDef.duration;
        
        // Handle stackable vs non-stackable effects
        if (!effectDef.stackable && effects[effectType]) {
            // Refresh duration if effect already exists
            effects[effectType].turnsRemaining = Math.max(effects[effectType].turnsRemaining, effectDuration);
            effects[effectType].customData = { ...effects[effectType].customData, ...customData };
            
            // For shield effects, reset remainingAmount when refreshed
            if (effectType === 'shield' && effects[effectType].customData.remainingAmount !== undefined) {
                const baseAmount = effectDef.absorbAmount || effects[effectType].customData.absorbAmount || 20;
                effects[effectType].customData.remainingAmount = baseAmount;
            }
            
            return true;
        } else if (effectDef.stackable) {
            // For stackable effects, add a stack or increment stacks
            if (!effects[effectType]) {
                effects[effectType] = {
                    stacks: 1,
                    turnsRemaining: effectDuration,
                    customData: customData
                };
            } else {
                effects[effectType].stacks = (effects[effectType].stacks || 1) + 1;
                effects[effectType].turnsRemaining = effectDuration;
                effects[effectType].customData = { ...effects[effectType].customData, ...customData };
            }
        } else {
            // New non-stackable effect
            const newEffectData = {
                turnsRemaining: effectDuration,
                customData: customData
            };
            
            // For shield effects, initialize remainingAmount if not provided
            if (effectType === 'shield' && !customData.remainingAmount) {
                const effectDef = this.effectTypes.shield;
                const baseAmount = effectDef.absorbAmount || customData.absorbAmount || 20;
                newEffectData.customData.remainingAmount = baseAmount;
                if (!newEffectData.customData.absorbAmount) {
                    newEffectData.customData.absorbAmount = baseAmount;
                }
            }
            
            effects[effectType] = newEffectData;
        }
        
        // Create visual indicator
        this.createEffectIndicator(combatant, effectType);
        
        return true;
    }

    /**
     * Remove a status effect from a combatant
     * @param {Object} combatant - Hero or enemy
     * @param {string} effectType - Type of effect to remove
     */
    removeEffect(combatant, effectType) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) return;
        
        delete combatant.data.statusEffects[effectType];
        
        // Remove visual indicator
        this.removeEffectIndicator(combatant, effectType);
    }

    /**
     * Process status effects at the start of a turn
     * @param {Object} combatant - Hero or enemy
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Effects results (damage, healing, stat changes)
     */
    processEffects(combatant, combatState) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) {
            return { damage: 0, healing: 0, statChanges: {} };
        }
        
        const effects = combatant.data.statusEffects;
        const results = {
            damage: 0,
            healing: 0,
            statChanges: {},
            skipped: false
        };
        
        // Process each active effect
        for (const [effectType, effectData] of Object.entries(effects)) {
            const effectDef = this.effectTypes[effectType];
            if (!effectDef) continue;
            
            // Decrease duration
            effectData.turnsRemaining--;
            
            // Apply effect based on type
            switch (effectType) {
                case 'stun':
                    if (effectData.turnsRemaining >= 0) {
                        results.skipped = true;
                    }
                    break;
                    
                case 'bleed':
                case 'poison':
                    const stacks = effectData.stacks || 1;
                    const damagePerTurn = effectDef.damagePerTurn || effectData.customData.damagePerTurn || 5;
                    results.damage += damagePerTurn * stacks;
                    break;
                    
                case 'shield':
                    // Shield absorption is handled during damage calculation
                    break;
                    
                case 'regeneration':
                    const healPerTurn = effectDef.healPerTurn || effectData.customData.healPerTurn || 10;
                    results.healing += healPerTurn;
                    break;
                    
                case 'buff_attack':
                case 'buff_defense':
                case 'debuff_attack':
                case 'debuff_defense':
                    const statName = effectType.includes('attack') ? 'attack' : 'defense';
                    const modifier = effectDef.statModifier || effectData.customData.statModifier || 0;
                    if (!results.statChanges[statName]) {
                        results.statChanges[statName] = 0;
                    }
                    results.statChanges[statName] += modifier;
                    break;
            }
            
            // Remove effect if duration expired
            if (effectData.turnsRemaining < 0) {
                this.removeEffect(combatant, effectType);
            }
        }
        
        return results;
    }

    /**
     * Apply effect results to combatant
     * @param {Object} combatant - Hero or enemy
     * @param {Object} combatState - Current combat state
     * @param {Object} effectResults - Results from processEffects
     */
    applyEffectResults(combatant, combatState, effectResults) {
        if (!combatState || !combatState.hero || !combatState.enemy) return;
        
        // Determine if combatant is hero by checking combat state reference
        // Hero health is tracked in combatState.hero, enemy in combatState.enemy
        const isHero = combatant === this.scene.combatManager?.hero;
        const combatantData = isHero ? combatState.hero : combatState.enemy;
        
        // Apply damage
        if (effectResults.damage > 0) {
            combatantData.currentHealth = Math.max(0, combatantData.currentHealth - effectResults.damage);
            if (isHero && combatant.data.stats) {
                combatant.data.stats.health = combatantData.currentHealth;
            }
        }
        
        // Apply healing
        if (effectResults.healing > 0) {
            combatantData.currentHealth = Math.min(
                combatantData.maxHealth,
                combatantData.currentHealth + effectResults.healing
            );
            if (isHero && combatant.data.stats) {
                combatant.data.stats.health = combatantData.currentHealth;
            }
        }
        
        // Apply stat changes (calculated in getStatModifiers)
        // Stats are modified during combat calculation, not here
    }

    /**
     * Get stat modifiers from active effects
     * @param {Object} combatant - Hero or enemy
     * @returns {Object} - Stat modifiers { attack: 0, defense: 0 }
     */
    getStatModifiers(combatant) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) {
            return { attack: 0, defense: 0 };
        }
        
        const effects = combatant.data.statusEffects;
        const modifiers = { attack: 0, defense: 0 };
        
        for (const [effectType, effectData] of Object.entries(effects)) {
            const effectDef = this.effectTypes[effectType];
            if (!effectDef) continue;
            
            if (effectType === 'buff_attack' || effectType === 'debuff_attack') {
                const modifier = effectDef.statModifier || effectData.customData.statModifier || 0;
                modifiers.attack += modifier;
            } else if (effectType === 'buff_defense' || effectType === 'debuff_defense') {
                const modifier = effectDef.statModifier || effectData.customData.statModifier || 0;
                modifiers.defense += modifier;
            }
        }
        
        return modifiers;
    }

    /**
     * Get shield absorption amount
     * @param {Object} combatant - Hero or enemy
     * @returns {number} - Shield absorption amount remaining
     */
    getShieldAmount(combatant) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) {
            return 0;
        }
        
        const shieldEffect = combatant.data.statusEffects.shield;
        if (!shieldEffect) return 0;
        
        const effectDef = this.effectTypes.shield;
        const baseAmount = effectDef.absorbAmount || shieldEffect.customData?.absorbAmount || 20;
        
        // Check if shield has remaining absorption capacity
        const remainingAmount = shieldEffect.customData?.remainingAmount;
        if (remainingAmount !== undefined) {
            return Math.max(0, remainingAmount);
        }
        
        // If no remainingAmount tracked, assume full shield
        return baseAmount;
    }

    /**
     * Reduce shield amount when damage is absorbed
     * @param {Object} combatant - Hero or enemy
     * @param {number} damageAbsorbed - Amount of damage absorbed by shield
     */
    reduceShield(combatant, damageAbsorbed) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) {
            return;
        }
        
        const shieldEffect = combatant.data.statusEffects.shield;
        if (!shieldEffect) return;
        
        const effectDef = this.effectTypes.shield;
        const baseAmount = effectDef.absorbAmount || shieldEffect.customData?.absorbAmount || 20;
        
        // Initialize customData if needed
        if (!shieldEffect.customData) {
            shieldEffect.customData = { remainingAmount: baseAmount };
        }
        
        // Initialize remainingAmount if not set
        if (shieldEffect.customData.remainingAmount === undefined) {
            shieldEffect.customData.remainingAmount = baseAmount;
        }
        
        // Reduce shield amount
        shieldEffect.customData.remainingAmount -= damageAbsorbed;
        shieldEffect.customData.remainingAmount = Math.max(0, shieldEffect.customData.remainingAmount);
        
        // Remove shield effect if completely consumed
        if (shieldEffect.customData.remainingAmount <= 0) {
            this.removeEffect(combatant, 'shield');
        }
    }

    /**
     * Check if combatant is stunned
     * @param {Object} combatant - Hero or enemy
     * @returns {boolean} - True if stunned
     */
    isStunned(combatant) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) {
            return false;
        }
        
        return !!combatant.data.statusEffects.stun && combatant.data.statusEffects.stun.turnsRemaining >= 0;
    }

    /**
     * Create visual indicator for status effect
     * @param {Object} combatant - Hero or enemy
     * @param {string} effectType - Type of effect
     */
    createEffectIndicator(combatant, effectType) {
        // Visual indicators are handled in CombatManager
        // This method can be extended for custom visuals
    }

    /**
     * Remove visual indicator for status effect
     * @param {Object} combatant - Hero or enemy
     * @param {string} effectType - Type of effect
     */
    removeEffectIndicator(combatant, effectType) {
        // Visual indicators are handled in CombatManager
        // This method can be extended for custom visuals
    }

    /**
     * Clear all status effects from combatant
     * @param {Object} combatant - Hero or enemy
     */
    clearAllEffects(combatant) {
        if (!combatant || !combatant.data) return;
        
        combatant.data.statusEffects = {};
    }

    /**
     * Get effect definition
     * @param {string} effectType - Type of effect
     * @returns {Object|null} - Effect definition
     */
    getEffectDefinition(effectType) {
        return this.effectTypes[effectType] || null;
    }
}

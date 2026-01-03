/**
 * Damage Calculator - Handles all damage calculation and application logic
 * Extracted from CombatManager to improve separation of concerns
 */

import { GameEvents } from '../../utils/event-constants.js';
import { ErrorHandler } from '../../utils/error-handler.js';
import { PerformanceMonitor } from '../../utils/performance-monitor.js';

export class DamageCalculator {
    /**
     * Create a new DamageCalculator
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        this.scene = scene;
        this.worldConfig = config.worldConfig;
        this.statusEffectsManager = config.statusEffectsManager;
        this.damageNumberPool = null;
    }

    /**
     * Calculate damage dealt from attack to defense
     * @param {number} attack - Attack stat value
     * @param {number} defense - Defense stat value
     * @param {Object|null} attacker - Attacking entity (optional)
     * @param {Object|null} defender - Defending entity (optional)
     * @returns {number} Calculated damage
     */
    calculateDamage(attack, defense, attacker = null, defender = null) {
        // PerformanceMonitor.start('DamageCalculator.calculateDamage');

        try {
            // Validate worldConfig
            if (!this.worldConfig || !this.worldConfig.combat) {
                // PerformanceMonitor.end('DamageCalculator.calculateDamage');
                return 0;
            }

            // Apply stat modifiers from status effects
            if (attacker && this.statusEffectsManager) {
                const attackModifiers = this.statusEffectsManager.getStatModifiers(attacker);
                attack = Math.floor(attack * (1 + attackModifiers.attack));
            }
            if (defender && this.statusEffectsManager) {
                const defenseModifiers = this.statusEffectsManager.getStatModifiers(defender);
                defense = Math.floor(defense * (1 + defenseModifiers.defense));
            }

            // Helper to get position safely
            const getPosition = (combatant) => {
                if (!combatant) return { x: 0, y: 0 };
                return {
                    x: combatant?.sprite?.x ?? combatant?.x ?? 0,
                    y: combatant?.sprite?.y ?? combatant?.y ?? 0
                };
            };

            // Check for miss
            if (Math.random() < this.worldConfig.combat.missChance) {
                const targetPos = defender ? getPosition(defender) : getPosition(attacker);
                this.showFloatingText(targetPos.x, targetPos.y - 80, 'MISS!', '#ffff00');
                this.scene.events.emit(GameEvents.COMBAT.MISS);
                // PerformanceMonitor.end('DamageCalculator.calculateDamage');
                return 0;
            }

            // Base damage calculation
            let baseDamage = Math.max(1, attack - defense);

            // Apply Gem Elemental Damage Bonuses (Phase 9: Skill Gem Sockets)
            if (attacker && attacker.data?.stats) {
                const stats = attacker.data.stats;
                // Check for physical damage gem bonus (default type)
                if (stats.physicalDamagePercent) {
                    baseDamage *= (1 + stats.physicalDamagePercent / 100);
                }
                // Check for other elemental bonuses if the ability has an element
                // For now, apply fire/cold/lightning if they exist (simplification)
                if (stats.fireDamagePercent) baseDamage *= (1 + stats.fireDamagePercent / 100);
                if (stats.coldDamagePercent) baseDamage *= (1 + stats.coldDamagePercent / 100);
                if (stats.lightningDamagePercent) baseDamage *= (1 + stats.lightningDamagePercent / 100);
            }

            // Apply Bloodline Offensive Bonuses
            if (attacker && attacker.data?.bloodline) {
                const bloodline = attacker.data.bloodline;
                
                // 1. Generic stat bonuses (e.g., attack damage bonus)
                if (bloodline.statBonuses?.attack) {
                    // baseDamage += bloodline.statBonuses.attack; // Already handled in base stats
                }

                // 2. Conditional Bloodline Abilities (e.g., Warrior's Rage)
                if (bloodline.uniqueAbility?.id === 'warrior_rage') {
                    const hpPercent = (attacker.data.currentHealth || attacker.data.stats?.health) / (attacker.data.stats?.maxHealth || 100);
                    if (hpPercent < 0.5) {
                        baseDamage *= 1.25; // 25% increased damage
                    }
                }

                // 3. Arcane Mastery (if applicable to damage)
                if (bloodline.uniqueAbility?.id === 'arcane_mastery') {
                    baseDamage *= 1.15; // 15% more damage
                }
            }

            // Check for critical hit
            const isCritical = Math.random() < this.worldConfig.combat.criticalHitChance;
            if (isCritical) {
                let critMultiplier = this.worldConfig.combat.criticalHitMultiplier;
                
                // Apply Shadow Assassin bonus (30% chance for double crit damage)
                if (attacker && attacker.data?.bloodline?.uniqueAbility?.id === 'shadow_strike') {
                    if (Math.random() < 0.3) {
                        critMultiplier *= 2.0;
                        const attackerPos = getPosition(attacker);
                        this.showFloatingText(attackerPos.x, attackerPos.y - 100, 'SHADOW STRIKE!', '#ff0000');
                    }
                }

                baseDamage *= critMultiplier;
                const targetPos = defender ? getPosition(defender) : getPosition(attacker);
                this.showFloatingText(targetPos.x, targetPos.y - 80, 'CRITICAL!', '#ff00ff');
                this.scene.events.emit(GameEvents.COMBAT.CRITICAL_HIT);
            }

            // Apply damage variance
            const variance = this.worldConfig.combat.damageVariance;
            let finalDamage = Math.round(baseDamage * (1 + (Math.random() * 2 - 1) * variance));

            // Apply Bloodline Defensive Bonuses
            if (defender && defender.data?.bloodline) {
                const bloodline = defender.data.bloodline;
                
                // 1. Passive Damage Reduction
                const drEffect = bloodline.passiveEffects?.find(e => e.type === 'damage_reduction');
                if (drEffect) {
                    finalDamage = Math.floor(finalDamage * (1 - drEffect.value / 100));
                }

                // 2. Resistance bonuses (Simplified: reduction for all damage for now)
                const resEffect = bloodline.passiveEffects?.find(e => e.type.endsWith('_resistance'));
                if (resEffect) {
                    finalDamage = Math.floor(finalDamage * (1 - resEffect.value / 100));
                }
            }

            // Apply shield absorption
            if (defender && this.statusEffectsManager) {
                const shieldAmount = this.statusEffectsManager.getShieldAmount(defender);
                if (shieldAmount > 0) {
                    const absorbed = Math.min(shieldAmount, finalDamage);
                    finalDamage -= absorbed;
                    const defenderPos = getPosition(defender);
                    this.showFloatingText(defenderPos.x, defenderPos.y - 80, `SHIELD -${absorbed}`, '#0088ff');

                    // Reduce shield amount when damage is absorbed
                    this.statusEffectsManager.reduceShield(defender, absorbed);
                }
            }

            const result = Math.max(0, finalDamage);
            // PerformanceMonitor.end('DamageCalculator.calculateDamage');
            return result;
        } catch (error) {
            // PerformanceMonitor.end('DamageCalculator.calculateDamage');
            ErrorHandler.handle(error, 'DamageCalculator.calculateDamage', 'error');
            return 0;
        }
    }

    /**
     * Apply damage to a combatant
     * @param {Object} combatant - Hero or enemy to damage
     * @param {number} damage - Amount of damage to apply
     * @param {Object} currentCombat - Current combat state
     * @param {Object} hero - Hero reference for comparison
     */
    dealDamage(combatant, damage, currentCombat = null, hero = null) {
        if (!combatant || !combatant.data) return;

        // Check if this is an enemy before dealing damage
        const isEnemy = combatant === currentCombat?.enemy || (combatant.data && combatant !== hero);

        let previousHealth = 0;
        let wasAlive = true;

        // For hero, use combat state health
        if (combatant === hero && currentCombat) {
            previousHealth = currentCombat.hero.currentHealth;
            wasAlive = previousHealth > 0;

            currentCombat.hero.currentHealth -= damage;
            currentCombat.hero.currentHealth = Math.max(0, currentCombat.hero.currentHealth);

            // Update hero data stats
            if (combatant.data.stats) {
                combatant.data.stats.health = currentCombat.hero.currentHealth;
            }
        } else {
            // For enemy or other combatants - update both currentHealth and stats.health
            // IMPORTANT: Get previousHealth BEFORE any updates to detect death
            previousHealth = combatant.data.currentHealth !== undefined
                ? combatant.data.currentHealth
                : (combatant.data.stats?.health !== undefined ? combatant.data.stats.health : (combatant.data.stats?.maxHealth || 100));

            wasAlive = previousHealth > 0;

            // Don't apply damage if already dead
            if (!wasAlive) {
                return;
            }

            // Initialize currentHealth if not set
            if (combatant.data.currentHealth === undefined) {
                combatant.data.currentHealth = combatant.data.stats?.health || combatant.data.stats?.maxHealth || 100;
            }

            // Apply damage
            const potentialHealth = combatant.data.currentHealth - damage;

            // --- Bloodline Death Save Hook ---
            if (potentialHealth <= 0 && wasAlive) {
                // 1. Void Step (Bloodline Save)
                if (hero && hero.data?.bloodline?.uniqueAbility?.id === 'void_step') {
                    const now = Date.now();
                    const voidStepCd = hero.data.voidStepCooldown || 0;
                    
                    if (now > voidStepCd) {
                        combatant.data.currentHealth = 1;
                        hero.data.voidStepCooldown = now + 60000; // 60s cooldown
                        const pos = {
                            x: combatant.sprite?.x ?? combatant.x ?? 0,
                            y: combatant.sprite?.y ?? combatant.y ?? 0
                        };
                        this.showFloatingText(pos.x, pos.y - 120, 'VOID STEP!', '#800080');
                        this.scene.particleManager?.createExplosion(pos.x, pos.y, 'void', 20);
                        return; // Save successful, skip normal damage application
                    }
                }
            }

            combatant.data.currentHealth -= damage;
            combatant.data.currentHealth = Math.max(0, combatant.data.currentHealth);

            // Also update stats.health for consistency
            combatant.data.stats.health = combatant.data.currentHealth;

            // Sync with combat state if available
            if (currentCombat && isEnemy && currentCombat.enemy) {
                currentCombat.enemy.currentHealth = combatant.data.currentHealth;
            }

            // Check if enemy just died and emit event
            const isDead = combatant.data.currentHealth <= 0;
            if (isEnemy && wasAlive && isDead) {
                // Mark enemy as defeated
                combatant.defeated = true;
                combatant.active = false;

                // Emit death event - use DamageCalculator's scene reference
                if (this.scene && this.scene.events) {
                    this.scene.events.emit(GameEvents.COMBAT.ENEMY_DIED, {
                        enemyId: combatant.id || combatant.data?.id || 'unknown',
                        enemy: combatant,
                        x: combatant.sprite?.x || combatant.x || 0,
                        y: combatant.sprite?.y || combatant.y || 0
                    });

                    // Immediately check if combat should end
                    if (this.scene.combatManager && typeof this.scene.combatManager.checkCombatEnd === 'function') {
                        this.scene.combatManager.checkCombatEnd();
                    }
                }
            }
        }

        // Show damage number only if combatant was alive when damage was dealt
        if (wasAlive && this.scene) {
            const pos = {
                x: combatant.sprite?.x ?? combatant.x ?? 0,
                y: combatant.sprite?.y ?? combatant.y ?? 0
            };
            this.showDamageNumber(pos.x, pos.y - 50, damage, '#ff0000');

            // Apply Hit Flash (Phase 9: High Quality Animations)
            if (this.scene.particleManager) {
                this.scene.particleManager.applyHitFlash(combatant.sprite || combatant);
                
                // Show impact particles
                this.scene.particleManager.createExplosion(pos.x, pos.y, 'combat', 5);
            }

            // --- Bloodline Post-Damage Hooks ---
            if (hero && damage > 0) {
                // 1. Life Steal
                const lsEffect = hero.data?.bloodline?.passiveEffects?.find(e => e.type === 'life_steal');
                const lsGem = hero.data?.stats?.lifesteal || 0;
                const totalLS = (lsEffect ? lsEffect.value : 0) + lsGem;
                
                if (totalLS > 0) {
                    const healAmount = Math.ceil(damage * (totalLS / 100));
                    this.dealHealing(hero, healAmount, currentCombat, hero);
                }

                // 2. Gem Proc Effects (Stun, Slow, Bleed)
                const stats = hero.data.stats;
                if (stats) {
                    if (stats.stunChance && Math.random() < stats.stunChance / 100) {
                        this.scene.events.emit(GameEvents.COMBAT.APPLY_STUN, { target: combatant });
                        this.showFloatingText(pos.x, pos.y - 100, 'STUNNED!', '#ffff00');
                    }
                    if (stats.slowChance && Math.random() < stats.slowChance / 100) {
                        this.scene.events.emit(GameEvents.COMBAT.APPLY_SLOW, { target: combatant });
                        this.showFloatingText(pos.x, pos.y - 100, 'SLOWED!', '#00ffff');
                    }
                    if (stats.bleedChance && Math.random() < stats.bleedChance / 100) {
                        this.scene.events.emit(GameEvents.COMBAT.APPLY_BLEED, { target: combatant, damage: Math.ceil(damage * 0.2) });
                        this.showFloatingText(pos.x, pos.y - 100, 'BLEEDING!', '#ff0000');
                    }
                }

                // 3. Dragon's Breath (Proc extra fire damage)
                if (hero.data?.bloodline?.uniqueAbility?.id === 'dragon_breath') {
                    if (Math.random() < 0.2) {
                        const fireDamage = Math.floor(damage * 0.5);
                        const enemyPos = {
                            x: combatant.sprite?.x ?? combatant.x ?? 0,
                            y: combatant.sprite?.y ?? combatant.y ?? 0
                        };
                        this.showFloatingText(enemyPos.x, enemyPos.y - 120, 'DRAGON BREATH!', '#ffa500');
                        
                        // Phase 9: High Quality Fire Animation
                        if (this.scene.particleManager) {
                            this.scene.particleManager.createExplosion(enemyPos.x, enemyPos.y, 'fire', 15);
                        }
                        
                        this.dealDamage(combatant, fireDamage, currentCombat, hero);
                    }
                }

                // 3. Chain Lightning (Proc chain damage)
                if (hero.data?.bloodline?.uniqueAbility?.id === 'chain_lightning') {
                    if (Math.random() < 0.15) {
                        // Phase 9: High Quality Lightning Animation
                        if (this.scene.particleManager) {
                            const originPos = {
                                x: hero.sprite?.x ?? hero.x ?? 0,
                                y: hero.sprite?.y ?? hero.y ?? 0
                            };
                            const targetPos = {
                                x: combatant.sprite?.x ?? combatant.x ?? 0,
                                y: combatant.sprite?.y ?? combatant.y ?? 0
                            };
                            this.scene.particleManager.createExplosion(targetPos.x, targetPos.y, 'lightning', 10);
                        }

                        this.scene.events.emit(GameEvents.COMBAT.CHAIN_LIGHTNING, { 
                            source: hero, 
                            originTarget: combatant,
                            damage: Math.floor(damage * 0.5)
                        });
                    }
                }
            }

            // --- Bloodline Reactive Hooks (On Taking Damage) ---
            if (combatant === hero && damage > 0) {
                // 1. Divine Protection (Shield on low HP)
                if (hero.data?.bloodline?.uniqueAbility?.id === 'divine_protection') {
                    const hpPercent = (hero.data.currentHealth || hero.data.stats?.health) / (hero.data.stats?.maxHealth || 100);
                    if (hpPercent < 0.3) {
                        // Logic handled in StatusEffectsManager or similar
                        this.scene.events.emit(GameEvents.COMBAT.DIVINE_SHIELD_PROC, { hero });
                    }
                }

                // 2. Frost Armor (Slow attacker)
                if (hero.data?.bloodline?.uniqueAbility?.id === 'frost_armor') {
                    if (Math.random() < 0.25) {
                        this.scene.events.emit(GameEvents.COMBAT.APPLY_SLOW, { target: currentCombat?.enemy });
                    }
                }
            }
        }
    }

    /**
     * Apply healing to a combatant
     * @param {Object} combatant - Hero or enemy to heal
     * @param {number} healing - Amount of healing to apply
     * @param {Object} currentCombat - Current combat state
     * @param {Object} hero - Hero reference for comparison
     */
    dealHealing(combatant, healing, currentCombat = null, hero = null) {
        if (!combatant || !combatant.data) return;

        // Apply Bloodline Healing Bonus (e.g., Divine Guardian)
        if (combatant.data.bloodline) {
            const healingBonus = combatant.data.bloodline.passiveEffects?.find(e => e.type === 'healing_bonus');
            if (healingBonus) {
                healing = Math.floor(healing * (1 + healingBonus.value / 100));
            }
        }

        const maxHealth = combatant.data.stats.maxHealth || 100;
        let oldHealth = 0;

        // For hero, use combat state health
        if (combatant === hero && currentCombat) {
            oldHealth = currentCombat.hero.currentHealth;
            currentCombat.hero.currentHealth += healing;
            currentCombat.hero.currentHealth = Math.min(currentCombat.hero.currentHealth, maxHealth);

            // Update hero data stats
            if (combatant.data.stats) {
                combatant.data.stats.health = currentCombat.hero.currentHealth;
            }
        } else {
            // For enemy or other combatants - update both currentHealth and stats.health
            if (combatant.data.currentHealth === undefined) {
                combatant.data.currentHealth = combatant.data.stats?.health || maxHealth;
            }
            oldHealth = combatant.data.currentHealth;
            combatant.data.currentHealth += healing;
            combatant.data.currentHealth = Math.min(combatant.data.currentHealth, maxHealth);
            combatant.data.stats.health = combatant.data.currentHealth;
        }

        // Show healing number
        if (this.scene) {
            const pos = {
                x: combatant.sprite?.x ?? combatant.x ?? 0,
                y: combatant.sprite?.y ?? combatant.y ?? 0
            };
            const newHealth = combatant === hero && currentCombat
                ? currentCombat.hero.currentHealth
                : (combatant.data.currentHealth ?? combatant.data.stats.health);
            const actualHealing = newHealth - oldHealth;
            if (actualHealing > 0) {
                this.showDamageNumber(pos.x, pos.y - 50, actualHealing, '#00ff00');
                
                // Phase 9: High Quality Healing Animation
                if (this.scene.particleManager) {
                    const healType = combatant.data?.bloodlineId === 'nature_blessed' ? 'nature' : 'holy';
                    this.scene.particleManager.createExplosion(pos.x, pos.y, healType, 10);
                }
            }
        }
    }

    /**
     * Show a floating text effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text to display
     * @param {string} color - Text color
     */
    showFloatingText(x, y, text, color) {
        if (!this.scene) return;

        // Create temporary text object
        const floatingText = this.scene.add.text(x, y, text, {
            font: 'bold 24px Arial',
            fill: color,
            stroke: '#000000',
            strokeThickness: 2
        });
        floatingText.setOrigin(0.5, 0.5);
        floatingText.setScrollFactor(0);

        // Animate upward and fade out
        this.scene.tweens.add({
            targets: floatingText,
            y: y - 80,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                floatingText.destroy();
            }
        });
    }

    /**
     * Show a damage/healing number
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} amount - Damage/healing amount
     * @param {string} color - Number color
     */
    showDamageNumber(x, y, amount, color) {
        if (!this.scene) return;

        // Get text from object pool if available, otherwise create new
        let damageText;
        let isPooled = false;
        try {
            if (this.damageNumberPool) {
                damageText = this.damageNumberPool.acquire();
                isPooled = true;
            }
        } catch (error) {
            // Pool acquisition failed, will create new
            isPooled = false;
        }

        if (!damageText) {
            // Fallback to creating new text
            damageText = this.scene.add.text(0, 0, '', {
                font: 'bold 32px Arial', // Increased from 20px
                fill: color,
                backgroundColor: '#000000',
                padding: { x: 8, y: 4 }, // Increased padding
                stroke: '#000000',
                strokeThickness: 4 // Add stroke for better visibility
            });
        }

        damageText.setText(amount.toString());
        damageText.setPosition(x, y);
        damageText.setVisible(true);
        damageText.setActive(true);
        damageText.setAlpha(1);
        damageText.setDepth(400); // Very high depth to ensure visibility

        // Animate upward and fade out
        this.scene.tweens.add({
            targets: damageText,
            y: y - 80, // Increased distance
            alpha: 0,
            duration: 1500, // Increased duration from 1000ms
            ease: 'Power2',
            onComplete: () => {
                damageText.setVisible(false);
                damageText.setActive(false);
                if (isPooled && this.damageNumberPool) {
                    try {
                        this.damageNumberPool.release(damageText);
                    } catch (error) {
                        // If pooling fails, destroy the text object
                        if (damageText && damageText.destroy) {
                            damageText.destroy();
                        }
                    }
                } else {
                    // Not pooled, destroy it
                    if (damageText && damageText.destroy) {
                        damageText.destroy();
                    }
                }
            }
        });
    }

    /**
     * Set the damage number pool reference
     * @param {ObjectPool} pool - Object pool for damage numbers
     */
    setDamageNumberPool(pool) {
        this.damageNumberPool = pool;
    }
}


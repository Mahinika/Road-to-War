import { Logger } from '../../utils/logger.js';
import { GameEvents } from '../../utils/event-constants.js';

/**
 * Combat Actions - Handles all combat action execution
 * Extracted from CombatManager to improve separation of concerns
 */
export class CombatActions {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.damageCalculator = config.damageCalculator || null;
        this.abilityManager = config.abilityManager || null;
        this.statusEffectsManager = config.statusEffectsManager || null;
        this.combatAI = config.combatAI || null;
        this.combatVisuals = config.combatVisuals || null;
        this.threatSystem = config.threatSystem || null;
        this.partyManager = config.partyManager || null;
        this.bloodlineManager = config.bloodlineManager || null;
        this.enemyCombatStates = config.enemyCombatStates || new Map();
        this.enemyLastAbilities = config.enemyLastAbilities || new Map();
    }

    /**
     * Execute hero turn (single hero combat)
     * @param {Object} hero - Hero object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executeHeroTurn(hero, currentCombat, enemy) {
        if (!hero || !enemy || !currentCombat) return;

        // Update abilities (cooldowns, buff duration)
        if (this.abilityManager) {
            this.abilityManager.updateAbilities(hero);
            this.abilityManager.regenerateMana(hero);
        }

        // Select and execute ability
        this.executeHeroAbility(hero, currentCombat, enemy);
    }

    /**
     * Execute party turn (party combat)
     * @param {Object} partyManager - PartyManager instance
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executePartyTurn(partyManager, currentCombat, enemy) {
        if (!partyManager || !currentCombat || !enemy) return;
        this.executePartyAttack(partyManager, currentCombat, enemy);
    }

    /**
     * Execute enemy turn
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} partyManager - PartyManager instance (for party combat)
     */
    executeEnemyTurn(enemy, currentCombat, partyManager) {
        if (!enemy || !currentCombat) return;
        this.executeEnemyAttack(enemy, currentCombat, partyManager);
    }

    /**
     * Executes a combat action for the primary hero
     * @param {Object} hero - Hero object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executeHeroAbility(hero, currentCombat, enemy) {
        if (!hero || !enemy || !currentCombat) return;

        // Select ability based on hero state
        const abilityName = this.abilityManager?.selectAbility(hero, currentCombat);
        if (!abilityName) {
            this.executeAutoAttack(hero, currentCombat, enemy);
            return;
        }

        // Execute the selected ability
        const abilityResult = this.abilityManager?.executeAbility(abilityName, hero, currentCombat);
        if (!abilityResult) {
            // Fallback to auto attack if ability failed
            this.executeAutoAttack(hero, currentCombat, enemy);
            return;
        }

        // Handle ability-specific effects
        switch (abilityResult.ability) {
            case 'autoAttack':
                this.executeAutoAttack(hero, currentCombat, enemy);
                break;
            case 'defensive':
                this.executeDefensiveAbility(abilityResult, hero, currentCombat, enemy);
                break;
            case 'heal':
                this.executeHealAbility(abilityResult, hero, currentCombat, enemy);
                break;
        }

        Logger.debug('CombatActions', `Hero uses ${abilityResult.name}`);
    }

    /**
     * Executes a basic auto-attack from hero to enemy
     * @param {Object} hero - Hero object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executeAutoAttack(hero, currentCombat, enemy) {
        if (!hero || !enemy || !currentCombat) return;

        // Calculate damage (with status effect modifiers)
        const damage = this.damageCalculator?.calculateDamage(
            currentCombat.hero.attack,
            currentCombat.enemy.defense,
            hero,
            enemy
        ) || 0;

        // Apply damage to enemy
        this.damageCalculator?.dealDamage(enemy, damage, currentCombat, hero);

        // Emit statistics event
        if (damage > 0) {
            this.scene.events.emit(GameEvents.COMBAT.DAMAGE_DEALT, { amount: damage });
        }

        // Show damage number
        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;
        this.damageCalculator?.showDamageNumber(enemyX, enemyY - 50, damage);
    }

    /**
     * Executes a coordinated party attack where each hero uses an appropriate ability
     * @param {Object} partyManager - PartyManager instance
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executePartyAttack(partyManager, currentCombat, enemy) {
        if (!partyManager || !currentCombat || !enemy) return;

        const heroes = currentCombat.party?.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) return;

        const enemyId = enemy.data?.id || enemy.id;
        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;

        // Check if MovementManager is available for range checks
        const movementManager = this.scene?.movementManager;
        const enemyTarget = {
            x: enemyX,
            y: enemyY,
            sprite: enemy.sprite
        };

        // Coordinate party abilities to prevent all using same ability
        const abilityUsage = this.coordinatePartyAbilities(heroes, partyManager, currentCombat);

        // Each hero selects and executes ability based on role
        heroes.forEach((heroData, index) => {
            // Skip dead heroes
            if (heroData.currentHealth <= 0) return;

            // Get actual hero object from party manager
            const hero = partyManager.getHeroById(heroData.id);
            if (!hero) return;

            // Check if hero is in range before attacking
            const isMovingToTarget = movementManager?.isMovingToTarget?.(hero, enemyTarget);
            const extendedRange = isMovingToTarget ? 1.5 : 1.0;

            if (movementManager && !movementManager.isInRange(hero, enemyTarget, extendedRange)) {
                // Hero is out of range - skip attack this turn
                if (this.scene && this.scene.time && this.scene.time.now % 1000 < 16) {
                    Logger.debug('CombatActions', `${heroData.id} is out of range, moving to target`);
                }
                if (movementManager.heroAttackCooldowns) {
                    movementManager.heroAttackCooldowns.set(hero.id, Date.now());
                }
                return;
            }

            // Update abilities (cooldowns, buff duration)
            if (this.abilityManager) {
                this.abilityManager.updateAbilities(hero);
                this.abilityManager.regenerateMana(hero);
            }

            // Select ability based on role and combat state
            const combatStateForHero = {
                hero: heroData,
                enemy: currentCombat.enemy,
                party: currentCombat.party
            };

            let abilityName = this.abilityManager?.selectAbility(hero, combatStateForHero);

            // Check if too many heroes are using same ability
            if (abilityUsage[abilityName] > 2 && abilityName !== 'autoAttack') {
                abilityName = 'autoAttack';
            }

            // Execute ability
            const abilityResult = this.abilityManager?.executeAbility(
                abilityName,
                hero,
                combatStateForHero
            );

            // Handle ability-specific effects
            if (abilityResult) {
                this.executeHeroAbilityEffect(hero, abilityResult, heroData, index, enemyX, enemyY, currentCombat, enemy);
            } else {
                // Fallback to auto-attack
                this.executeHeroAutoAttack(hero, heroData, index, enemyX, enemyY, enemyId, currentCombat, enemy);
            }
        });

        // Update ability cooldowns for all heroes
        if (this.abilityManager) {
            this.abilityManager.updateCooldowns();
        }

        // Update health bars
        this.combatVisuals?.updateHealthBars();

        // Update threat display if enabled
        if (this.scene?.updateThreatDisplay) {
            this.scene.updateThreatDisplay(this.combatAI);
        }
    }

    /**
     * Execute defensive ability
     * @param {Object} abilityResult - Ability result from AbilityManager
     * @param {Object} hero - Hero object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executeDefensiveAbility(abilityResult, hero, currentCombat, enemy) {
        // Defensive buff is already applied by AbilityManager
        // Just show visual feedback
        const heroX = hero?.sprite?.x || hero?.x || 0;
        const heroY = hero?.sprite?.y || hero?.y || 0;
        this.damageCalculator?.showFloatingText(heroX, heroY - 80, 'DEFENSIVE STANCE!', '#00ffff');

        // Still perform a basic attack
        this.executeAutoAttack(hero, currentCombat, enemy);
    }

    /**
     * Execute heal ability
     * @param {Object} abilityResult - Ability result from AbilityManager
     * @param {Object} hero - Hero object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executeHealAbility(abilityResult, hero, currentCombat, enemy) {
        // Heal is already applied by AbilityManager
        // Show visual feedback
        const healAmount = abilityResult.effects?.amount || 0;
        const heroX = hero?.sprite?.x || hero?.x || 0;
        const heroY = hero?.sprite?.y || hero?.y || 0;
        this.damageCalculator?.showFloatingText(heroX, heroY - 80, `HEAL +${healAmount}`, '#00ff00');

        // Show heal effect
        this.scene.particleManager?.createExplosion(heroX, heroY, 'loot', 20);

        // Still perform a basic attack
        this.executeAutoAttack(hero, currentCombat, enemy);
    }

    /**
     * Execute enemy attack (may use abilities)
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} partyManager - PartyManager instance (for party combat)
     */
    executeEnemyAttack(enemy, currentCombat, partyManager) {
        if (!enemy || !currentCombat) return;

        // Check if enemy is incapacitated (stunned, etc.)
        if (this.combatAI && this.combatAI.isIncapacitated(enemy)) {
            Logger.debug('CombatActions', 'Enemy is incapacitated and cannot attack');
            this.executeAddsAttack(currentCombat, partyManager);
            return;
        }

        // Handle casting state
        if (enemy.isCasting) {
            // Casting is handled by orchestrator
            this.executeAddsAttack(currentCombat, partyManager);
            return;
        }

        // Try to use an ability if available
        const abilityResult = this.selectAndExecuteEnemyAbility(enemy, currentCombat);
        if (abilityResult && abilityResult.used) {
            this.executeAddsAttack(currentCombat, partyManager);
            return;
        }

        // Check if this is party combat
        const isPartyCombat = currentCombat.party && Array.isArray(currentCombat.party.heroes);

        if (isPartyCombat && partyManager) {
            // Party combat: enemy targets hero with highest threat
            const enemyId = enemy.data?.id || enemy.id;
            const targetHeroId = this.combatAI?.selectTarget(enemyId, enemy);

            if (!targetHeroId) {
                // Fallback to tank or first hero
                const tank = partyManager.getTank();
                const targetHero = tank || partyManager.getHeroByIndex(0);
                if (targetHero) {
                    this.executeEnemyAttackOnHero(targetHero, currentCombat, enemy, partyManager);
                }
            } else {
                const targetHero = partyManager.getHeroById(targetHeroId);
                if (targetHero) {
                    this.executeEnemyAttackOnHero(targetHero, currentCombat, enemy, partyManager);
                }
            }
        } else {
            // Single hero combat
            const hero = currentCombat.hero;
            if (!hero) return;

            // Apply enrage damage multiplier if enraged
            let enemyAttack = currentCombat.enemy.attack;
            const enemyId = enemy.data?.id || enemy.id;
            const combatState = this.enemyCombatStates.get(enemyId);
            if (combatState?.enraged && enemy.data?.enrageDamageMultiplier) {
                enemyAttack = Math.floor(enemyAttack * enemy.data.enrageDamageMultiplier);
            }

            // Calculate damage
            const damage = this.damageCalculator?.calculateDamage(
                enemyAttack,
                currentCombat.hero.defense,
                enemy,
                null // Single hero - no hero object reference
            ) || 0;

            // Apply damage
            this.damageCalculator?.dealDamage(null, damage, currentCombat, enemy);
            currentCombat.hero.currentHealth = Math.max(0, currentCombat.hero.currentHealth - damage);

            // Emit statistics event
            if (damage > 0) {
                this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: damage });
            }

            // Show damage number
            const heroX = hero?.sprite?.x || hero?.x || 0;
            const heroY = hero?.sprite?.y || hero?.y || 0;
            this.damageCalculator?.showDamageNumber(heroX, heroY - 50, damage);
        }

        // Execute attacks for all active adds
        this.executeAddsAttack(currentCombat, partyManager);
    }

    /**
     * Execute attacks for all active adds in combat
     * @param {Object} currentCombat - Current combat state
     * @param {Object} partyManager - PartyManager instance
     */
    executeAddsAttack(currentCombat, partyManager) {
        if (!currentCombat.adds || currentCombat.adds.length === 0) return;
        if (!partyManager) return;

        currentCombat.adds.forEach(add => {
            if (add.currentHealth <= 0) return;

            // Check if add is incapacitated
            if (this.combatAI && this.combatAI.isIncapacitated(add.instance)) {
                Logger.debug('CombatActions', `Add ${add.id} is incapacitated`);
                return;
            }

            // Adds target via threat as well
            const targetHeroId = this.combatAI?.selectTarget(add.id, add.instance);
            const targetHero = targetHeroId ? partyManager.getHeroById(targetHeroId) : partyManager.getTank();

            if (targetHero) {
                const heroData = currentCombat.party?.heroes?.find(h => h.id === targetHero.id);
                if (heroData && heroData.currentHealth > 0) {
                    const damage = this.damageCalculator?.calculateDamage(
                        add.attack,
                        heroData.defense,
                        add.instance,
                        targetHero
                    ) || 0;

                    heroData.currentHealth = Math.max(0, heroData.currentHealth - damage);
                    
                    const heroX = targetHero.sprite?.x || targetHero.x || 0;
                    const heroY = targetHero.sprite?.y || targetHero.y || 0;
                    this.damageCalculator?.showDamageNumber(heroX, heroY - 50, damage);
                    
                    Logger.debug('CombatActions', `Add ${add.id} attacks ${targetHero.id} for ${damage} damage`);
                }
            }
        });

        this.combatVisuals?.updateHealthBars();
    }

    /**
     * Execute enemy attack on a specific hero (for party combat)
     * @param {Object} targetHero - Hero to attack
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     * @param {Object} partyManager - PartyManager instance
     */
    executeEnemyAttackOnHero(targetHero, currentCombat, enemy, partyManager) {
        if (!targetHero || !currentCombat) return;

        // Find hero data in combat state
        const heroData = currentCombat.party?.heroes?.find(h => h.id === targetHero.id);
        if (!heroData || heroData.currentHealth <= 0) return;

        // Get tactical multipliers
        const heroRole = targetHero.role || heroData.role || 'dps';
        const tacticalMultipliers = this.getTacticalMultipliers(heroRole);
        const effectiveDefense = Math.floor(heroData.defense * tacticalMultipliers.defense);

        // Calculate base damage
        let damage = this.damageCalculator?.calculateDamage(
            currentCombat.enemy.attack,
            effectiveDefense,
            enemy,
            targetHero
        ) || 0;

        // Apply bloodline effects on damage taken
        if (this.bloodlineManager) {
            const bloodlineResult = this.bloodlineManager.onHeroDamageTaken(targetHero, damage, enemy);
            damage = bloodlineResult.damage;

            // Apply special effects
            if (bloodlineResult.effects && bloodlineResult.effects.length > 0) {
                bloodlineResult.effects.forEach(effect => {
                    if (effect.type === 'shield') {
                        const shieldAmount = Math.min(damage, effect.amount);
                        damage -= shieldAmount;
                        this.showBloodlineEffect(targetHero, `${effect.description} (+${shieldAmount} absorbed)`, '#ffff00');
                    } else if (effect.type === 'teleport') {
                        if (targetHero.sprite) {
                            targetHero.sprite.x += effect.distance;
                            this.showBloodlineEffect(targetHero, effect.description, '#800080');
                        }
                    }
                });
            }
        }

        // Apply damage to hero in combat state
        heroData.currentHealth -= damage;
        heroData.currentHealth = Math.max(0, heroData.currentHealth);

        // Update actual hero stats if available
        if (targetHero.currentStats) {
            targetHero.currentStats.health = heroData.currentHealth;
        }

        // Emit statistics event
        if (damage > 0) {
            this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: damage });
        }

        // Show damage number at hero position
        const heroX = targetHero.sprite?.x || targetHero.x || 0;
        const heroY = targetHero.sprite?.y || targetHero.y || 0;
        this.damageCalculator?.showDamageNumber(heroX, heroY - 50, damage);

        Logger.debug('CombatActions', `Enemy attacks ${targetHero.id} for ${damage} damage`);
    }

    /**
     * Select and execute an enemy ability
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     * @returns {Object|null} Ability result or null
     */
    selectAndExecuteEnemyAbility(enemy, currentCombat) {
        if (!enemy || !enemy.data || !currentCombat) return null;

        const enemyData = enemy.data;
        const abilities = Array.isArray(enemyData.abilities) ? enemyData.abilities : [];
        if (abilities.length === 0) return null;

        // Initialize ability cooldowns if needed
        if (!enemy.data.abilityCooldowns) {
            enemy.data.abilityCooldowns = {};
        }

        const cooldowns = enemy.data.abilityCooldowns;
        const enemyId = enemy.data?.id || enemy.id;
        const enemyHealthPercent = currentCombat.enemy.currentHealth / currentCombat.enemy.maxHealth;

        // Filter available abilities
        const availableAbilities = abilities.filter(ability => {
            if (!ability || !ability.name) return false;
            const cooldown = cooldowns[ability.name] || 0;
            if (cooldown > 0) return false;

            // Check phase requirements
            if (ability.phase === 'low' && enemyHealthPercent > 0.5) return false;
            if (ability.phase === 'high' && enemyHealthPercent <= 0.5) return false;

            // Check chance
            if (ability.chance && Math.random() > ability.chance) return false;

            return true;
        });

        if (availableAbilities.length === 0) return null;

        // Evaluate combat state for tactical selection
        const combatState = this.evaluateCombatState(currentCombat);

        // Score abilities based on current combat state
        const scoredAbilities = availableAbilities.map(ability => ({
            ability,
            score: this.scoreAbility(ability, combatState, enemyId)
        }));

        // Sort by score (highest first)
        scoredAbilities.sort((a, b) => b.score - a.score);

        // Top 2-3 abilities get weighted random selection
        const topCount = Math.min(3, scoredAbilities.length);
        const topAbilities = scoredAbilities.slice(0, topCount);
        const selected = this.weightedRandomSelect(topAbilities);

        // Track last used ability for combos
        if (selected && selected.ability) {
            this.enemyLastAbilities.set(enemyId, selected.ability.name);
        }

        // Execute the ability
        if (selected.ability.castTime && selected.ability.castTime > 0) {
            return this.startEnemyCast(selected.ability, enemy);
        }

        return this.executeEnemyAbility(selected.ability, enemy, currentCombat);
    }

    /**
     * Start enemy cast time
     * @param {Object} ability - Ability to cast
     * @param {Object} enemy - Enemy object
     * @returns {Object} Casting status
     */
    startEnemyCast(ability, enemy) {
        enemy.isCasting = true;
        enemy.castingAbility = ability;
        enemy.castRoundsRemaining = ability.castTime;

        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;
        
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, `CASTING: ${ability.name.toUpperCase()}`, '#ffaa00');
        
        Logger.info('CombatActions', `Enemy starts casting ${ability.name} (${ability.castTime} rounds)`);
        return { used: true, casting: true, ability: ability.name };
    }

    /**
     * Execute a specific enemy ability
     * @param {Object} ability - Ability definition
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     * @returns {Object} Ability result
     */
    executeEnemyAbility(ability, enemy, currentCombat) {
        if (!enemy || !ability) return { used: false };

        const result = { used: true, ability: ability.name };

        // Initialize cooldowns if needed
        if (!enemy.data.abilityCooldowns) {
            enemy.data.abilityCooldowns = {};
        }

        // Set cooldown
        enemy.data.abilityCooldowns[ability.name] = ability.cooldown || 0;

        switch (ability.type) {
            case 'attack':
                if (ability.isAoE) {
                    // AoE handled by boss mechanics
                    return result;
                } else {
                    this.executeEnemyAttackAbility(ability, enemy, currentCombat);
                }
                break;
            case 'debuff':
                this.executeEnemyDebuffAbility(ability, enemy, currentCombat);
                break;
            case 'heal':
                this.executeEnemyHealAbility(ability, enemy, currentCombat);
                break;
            case 'buff':
                this.executeEnemyBuffAbility(ability, enemy, currentCombat);
                break;
            default:
                result.used = false;
        }

        return result;
    }

    /**
     * Execute enemy heal ability
     * @param {Object} ability - Ability definition
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     */
    executeEnemyHealAbility(ability, enemy, currentCombat) {
        if (!currentCombat.enemy) return;

        const maxHealth = currentCombat.enemy.maxHealth;
        const healMultiplier = ability.healMultiplier || 0.15;
        const healAmount = Math.floor(maxHealth * healMultiplier);

        currentCombat.enemy.currentHealth = Math.min(
            maxHealth,
            currentCombat.enemy.currentHealth + healAmount
        );

        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;
        
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, `HEALED +${healAmount}`, '#00ff00');
        this.combatVisuals?.updateHealthBars();
        
        Logger.debug('CombatActions', `Enemy heals for ${healAmount}`);
    }

    /**
     * Execute enemy buff ability
     * @param {Object} ability - Ability definition
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     */
    executeEnemyBuffAbility(ability, enemy, currentCombat) {
        const effectType = ability.effect || 'buff_attack';
        const duration = ability.duration || 3;

        // Apply status effect to enemy
        this.statusEffectsManager?.applyEffect(enemy, effectType, duration);

        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;
        
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, 'EMPOWERED!', '#ffff00');
        
        Logger.debug('CombatActions', `Enemy uses buff ${effectType} for ${duration} rounds`);
    }

    /**
     * Execute enemy attack ability
     * @param {Object} ability - Ability definition
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     */
    executeEnemyAttackAbility(ability, enemy, currentCombat) {
        const baseAttack = currentCombat.enemy.attack;
        const multiplier = ability.damageMultiplier || 1.0;
        const damage = Math.floor(baseAttack * multiplier);

        // Check if this is party combat
        const isPartyCombat = currentCombat.party && Array.isArray(currentCombat.party.heroes);

        if (isPartyCombat && this.partyManager) {
            const enemyId = enemy.data?.id || enemy.id;
            const targetHeroId = this.combatAI?.selectTarget(enemyId, enemy);
            const targetHero = targetHeroId ? this.partyManager.getHeroById(targetHeroId) : this.partyManager.getTank();

            if (targetHero) {
                const heroData = currentCombat.party.heroes.find(h => h.id === targetHero.id);
                if (heroData) {
                    const finalDamage = this.damageCalculator?.calculateDamage(
                        damage,
                        heroData.defense,
                        enemy,
                        targetHero
                    ) || 0;

                    heroData.currentHealth = Math.max(0, heroData.currentHealth - finalDamage);
                    
                    const heroX = targetHero.sprite?.x || targetHero.x || 0;
                    const heroY = targetHero.sprite?.y || targetHero.y || 0;
                    this.damageCalculator?.showDamageNumber(heroX, heroY - 50, finalDamage);
                    
                    if (finalDamage > 0) {
                        this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: finalDamage });
                    }
                }
            }
        } else {
            // Single hero combat
            const finalDamage = this.damageCalculator?.calculateDamage(
                damage,
                currentCombat.hero.defense,
                enemy,
                null
            ) || 0;

            this.damageCalculator?.dealDamage(null, finalDamage, currentCombat, enemy);
            currentCombat.hero.currentHealth = Math.max(0, currentCombat.hero.currentHealth - finalDamage);
            
            if (finalDamage > 0) {
                this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: finalDamage });
            }
            
            const heroX = currentCombat.hero?.sprite?.x || currentCombat.hero?.x || 0;
            const heroY = currentCombat.hero?.sprite?.y || currentCombat.hero?.y || 0;
            this.damageCalculator?.showDamageNumber(heroX, heroY - 50, finalDamage);
        }

        // Show visual feedback
        const abilityName = ability.name.charAt(0).toUpperCase() + ability.name.slice(1);
        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;

        if (this.scene.uiManager?.combatUI?.showAbilityProcEffect) {
            this.scene.uiManager.combatUI.showAbilityProcEffect(
                enemyX, enemyY - 30, abilityName, 'damage'
            );
        } else {
            this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, `${abilityName}!`, '#ff0000');
        }

        Logger.debug('CombatActions', `Enemy uses ${ability.name} for ability attack`);
    }

    /**
     * Execute enemy debuff ability
     * @param {Object} ability - Ability definition
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     */
    executeEnemyDebuffAbility(ability, enemy, currentCombat) {
        const effectType = ability.effect || 'debuff_attack';
        const duration = ability.duration || 2;

        // Check if this is party combat
        const isPartyCombat = currentCombat.party && Array.isArray(currentCombat.party.heroes);

        if (isPartyCombat && this.partyManager) {
            const enemyId = enemy.data?.id || enemy.id;
            const targetHeroId = this.combatAI?.selectTarget(enemyId, enemy);
            const targetHero = targetHeroId ? this.partyManager.getHeroById(targetHeroId) : this.partyManager.getTank();

            if (targetHero) {
                this.statusEffectsManager?.applyEffect(targetHero, effectType, duration);
                
                const heroX = targetHero.sprite?.x || targetHero.x || 0;
                const heroY = targetHero.sprite?.y || targetHero.y || 0;
                this.damageCalculator?.showFloatingText(heroX, heroY - 80, 'CURSED!', '#880088');
            }
        } else {
            // Apply status effect to single hero (would need hero reference)
            // This is handled by the caller
        }

        // Show visual feedback
        const abilityName = ability.name.charAt(0).toUpperCase() + ability.name.slice(1);
        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, `${abilityName}!`, '#880088');

        // Update status effect indicators
        if (this.combatVisuals?.updateStatusEffectIndicators) {
            this.combatVisuals.updateStatusEffectIndicators();
        }

        Logger.debug('CombatActions', `Enemy uses ${ability.name}, applies ${effectType} for ${duration} rounds`);
    }

    /**
     * Execute hero ability effect in party combat
     * @param {Object} hero - Hero object
     * @param {Object} abilityResult - Ability result
     * @param {Object} heroData - Hero data from combat state
     * @param {number} index - Hero index for visual offset
     * @param {number} enemyX - Enemy X position
     * @param {number} enemyY - Enemy Y position
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executeHeroAbilityEffect(hero, abilityResult, heroData, index, enemyX, enemyY, currentCombat, enemy) {
        if (!abilityResult || !abilityResult.effects) return;

        // Get hero position for floating text
        const heroX = hero.x || hero.sprite?.x || 0;
        const heroY = hero.y || hero.sprite?.y || 0;

        // Trigger visuals via AbilityManager
        this.abilityManager?.useAbility(hero, abilityResult.ability, enemy);

        // Logic: Handle damage/healing/status effects
        const effects = abilityResult.effects;
        const heroRole = hero.role || heroData.role || 'dps';
        const tacticalMultipliers = this.getTacticalMultipliers(heroRole);

        // Check for interrupt
        if (effects.interrupt && enemy.isCasting) {
            this.interruptEnemy(enemy);
        }

        switch (abilityResult.ability) {
            case 'autoAttack':
                // Handle auto-attack damage
                const effectiveAttack = Math.floor(heroData.attack * tacticalMultipliers.damage);
                const damage = this.damageCalculator?.calculateDamage(
                    effectiveAttack,
                    currentCombat.enemy.defense,
                    hero,
                    enemy
                ) || 0;
                this.damageCalculator?.dealDamage(enemy, damage, currentCombat, hero);

                // Add threat
                const enemyId = enemy.data?.id || enemy.id;
                let threatMultiplier = 1.0;
                if (heroRole === 'tank') {
                    threatMultiplier = 2.0;
                } else if (heroRole === 'healer') {
                    threatMultiplier = 0.5;
                }
                threatMultiplier *= tacticalMultipliers.threat;
                
                this.threatSystem?.addThreat(enemyId, heroData.id, damage, threatMultiplier);

                // Show damage
                const offsetX = (index - (currentCombat.party.heroes.length / 2)) * 15;
                this.damageCalculator?.showDamageNumber(enemyX + offsetX, enemyY - 50 - (index * 10), damage);

                if (damage > 0) {
                    this.scene.events.emit(GameEvents.COMBAT.DAMAGE_DEALT, { amount: damage });
                }
                break;

            case 'heal':
                // Handle healing logic
                const healTarget = this.shouldHealAlly(hero, currentCombat.party);
                const targetId = healTarget || heroData.id;
                const targetHeroData = currentCombat.party.heroes.find(h => h.id === targetId);
                
                if (targetHeroData) {
                    const healAmount = effects.amount || Math.floor(targetHeroData.maxHealth * 0.2);
                    targetHeroData.currentHealth = Math.min(
                        targetHeroData.maxHealth,
                        targetHeroData.currentHealth + healAmount
                    );
                    
                    const targetHero = this.partyManager?.getHeroById(targetId);
                    if (targetHero) {
                        const targetX = targetHero.x || targetHero.sprite?.x || 0;
                        const targetY = targetHero.y || targetHero.sprite?.y || 0;
                        this.damageCalculator?.showFloatingText(targetX, targetY - 80, `HEAL +${healAmount}`, '#00ff00');
                    }
                }
                break;

            case 'defensive':
                // Defensive buff already applied by AbilityManager
                this.damageCalculator?.showFloatingText(heroX, heroY - 80, 'DEFENSIVE STANCE!', '#00ffff');
                break;

            case 'smite':
            case 'shieldBash':
                // Handle damage abilities
                const abilityDamage = effects.damage || heroData.attack;
                const finalDamage = this.damageCalculator?.calculateDamage(
                    abilityDamage,
                    currentCombat.enemy.defense,
                    hero,
                    enemy
                ) || 0;
                this.damageCalculator?.dealDamage(enemy, finalDamage, currentCombat, hero);

                // Add threat
                const abilityEnemyId = enemy.data?.id || enemy.id;
                let abilityThreatMultiplier = 1.0;
                if (heroRole === 'tank') {
                    abilityThreatMultiplier = 2.5;
                } else if (heroRole === 'healer') {
                    abilityThreatMultiplier = 0.5;
                }
                this.threatSystem?.addThreat(abilityEnemyId, heroData.id, finalDamage, abilityThreatMultiplier);

                // Show damage
                const abilityOffsetX = (index - (currentCombat.party.heroes.length / 2)) * 15;
                this.damageCalculator?.showDamageNumber(enemyX + abilityOffsetX, enemyY - 50 - (index * 10), finalDamage);

                // Show ability name
                this.damageCalculator?.showFloatingText(heroX, heroY - 80, abilityResult.name.toUpperCase() + '!', '#ff8800');

                if (finalDamage > 0) {
                    this.scene.events.emit(GameEvents.COMBAT.DAMAGE_DEALT, { amount: finalDamage });
                }

                // Handle stun if shield bash
                if (abilityResult.ability === 'shieldBash' && effects.stun) {
                    Logger.debug('CombatActions', `${heroData.id} stunned enemy with Shield Bash`);
                }
                break;

            case 'divineAura':
                // Buff already applied by AbilityManager
                this.damageCalculator?.showFloatingText(heroX, heroY - 80, 'DIVINE AURA!', '#ffff00');
                break;
        }

        Logger.debug('CombatActions', `${heroData.id} used ${abilityResult.name}`);
    }

    /**
     * Execute hero auto-attack (extracted for reuse)
     * @param {Object} hero - Hero object
     * @param {Object} heroData - Hero data
     * @param {number} index - Hero index
     * @param {number} enemyX - Enemy X position
     * @param {number} enemyY - Enemy Y position
     * @param {string} enemyId - Enemy ID
     * @param {Object} currentCombat - Current combat state
     * @param {Object} enemy - Enemy object
     */
    executeHeroAutoAttack(hero, heroData, index, enemyX, enemyY, enemyId, currentCombat, enemy) {
        // Apply tactical multipliers
        const heroRole = hero.role || heroData.role || 'dps';
        const tacticalMultipliers = this.getTacticalMultipliers(heroRole);
        const effectiveAttack = Math.floor(heroData.attack * tacticalMultipliers.damage);

        // Calculate base damage
        let damage = this.damageCalculator?.calculateDamage(
            effectiveAttack,
            currentCombat.enemy.defense,
            hero,
            enemy
        ) || 0;

        // Apply bloodline effects on damage dealt
        if (this.bloodlineManager) {
            const bloodlineResult = this.bloodlineManager.onHeroDamageDealt(hero, damage, enemy);
            damage = bloodlineResult.damage;

            // Apply additional effects
            if (bloodlineResult.additionalEffects && bloodlineResult.additionalEffects.length > 0) {
                bloodlineResult.additionalEffects.forEach(effect => {
                    if (effect.type === 'additional_damage') {
                        const additionalDamage = effect.amount;
                        this.damageCalculator?.dealDamage(enemy, additionalDamage, currentCombat, hero);
                        const offsetX = (index - (currentCombat.party.heroes.length / 2)) * 15;
                        this.damageCalculator?.showDamageNumber(enemyX + offsetX, enemyY - 80 - (index * 10), additionalDamage, effect.damageType || 'normal');
                    }
                });
            }
        }

        // Apply damage to enemy
        this.damageCalculator?.dealDamage(enemy, damage, currentCombat, hero);

        // Add threat for this hero
        let threatMultiplier = 1.0;
        if (heroRole === 'tank') {
            threatMultiplier = 2.0;
        } else if (heroRole === 'healer') {
            threatMultiplier = 0.5;
        }
        threatMultiplier *= tacticalMultipliers.threat;
        
        this.threatSystem?.addThreat(enemyId, heroData.id, damage, threatMultiplier);

        // Emit statistics event
        if (damage > 0) {
            this.scene.events.emit(GameEvents.COMBAT.DAMAGE_DEALT, { amount: damage });
        }

        // Show damage number
        const heroes = currentCombat.party.heroes || [];
        const offsetX = (index - heroes.length / 2) * 15;
        this.damageCalculator?.showDamageNumber(enemyX + offsetX, enemyY - 50 - (index * 10), damage);

        Logger.debug('CombatActions', `${heroData.id} auto-attacks for ${damage} damage`);
    }

    /**
     * Coordinate party abilities to prevent all using same ability
     * @param {Array} heroes - Array of hero data
     * @param {Object} partyManager - PartyManager instance
     * @param {Object} currentCombat - Current combat state
     * @returns {Object} Map of ability name to usage count
     */
    coordinatePartyAbilities(heroes, partyManager, currentCombat) {
        const abilityUsage = {};

        if (!Array.isArray(heroes) || heroes.length === 0) {
            return abilityUsage;
        }

        // Count planned ability usage (simulate selection)
        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return;

            const hero = partyManager?.getHeroById(heroData.id);
            if (!hero) return;

            const combatStateForHero = {
                hero: heroData,
                enemy: currentCombat.enemy,
                party: currentCombat.party
            };

            const abilityName = this.abilityManager?.selectAbility(hero, combatStateForHero);
            if (abilityName) {
                abilityUsage[abilityName] = (abilityUsage[abilityName] || 0) + 1;
            }
        });

        return abilityUsage;
    }

    /**
     * Get tactical multipliers based on current combat stance
     * @param {string} role - Hero role ('tank', 'healer', 'dps')
     * @returns {Object} Multipliers for damage, defense, and threat
     */
    getTacticalMultipliers(role) {
        const tactics = this.abilityManager?.getCombatTactics() || 'balanced';
        const multipliers = { damage: 1.0, defense: 1.0, threat: 1.0 };

        if (tactics === 'aggressive') {
            multipliers.damage = 1.15;
            multipliers.defense = 0.85;
            multipliers.threat = 1.20;
        } else if (tactics === 'defensive') {
            multipliers.damage = 0.85;
            multipliers.defense = 1.15;
            multipliers.threat = (role === 'tank') ? 1.10 : 0.80;
        }

        return multipliers;
    }

    /**
     * Determine if healer should heal an ally instead of self
     * @param {Object} healer - Healer hero object
     * @param {Object} party - Party combat state
     * @returns {string|null} Ally hero ID to heal, or null to heal self
     */
    shouldHealAlly(healer, party) {
        if (!party || !Array.isArray(party.heroes)) return null;

        const healerData = party.heroes.find(h => h.id === healer.id);
        if (!healerData) return null;

        const healerHealthPercent = healerData.currentHealth / healerData.maxHealth;

        // Find lowest health ally with tank bias
        let lowestHealthPercent = 1.0;
        let targetHeroId = null;
        let tankHeroId = null;
        let tankHealthPercent = 1.0;

        party.heroes.forEach(heroData => {
            if (heroData.id === healer.id || heroData.currentHealth <= 0) return;

            const healthPercent = heroData.currentHealth / heroData.maxHealth;

            if (heroData.role === 'tank') {
                tankHeroId = heroData.id;
                tankHealthPercent = healthPercent;
            }

            if (healthPercent < lowestHealthPercent && heroData.role !== 'tank') {
                lowestHealthPercent = healthPercent;
                targetHeroId = heroData.id;
            }
        });

        // Tank bias: Prioritize tank if tank health < 70%
        if (tankHeroId && tankHealthPercent < 0.7) {
            if (tankHealthPercent < healerHealthPercent || (tankHealthPercent < 0.7 && healerHealthPercent > 0.6)) {
                return tankHeroId;
            }
        }

        // Otherwise, heal lowest health ally if they're lower than healer and below 60%
        if (targetHeroId && lowestHealthPercent < healerHealthPercent && lowestHealthPercent < 0.6) {
            return targetHeroId;
        }

        return null;
    }

    /**
     * Evaluate current combat state for tactical decisions
     * @param {Object} currentCombat - Current combat state
     * @returns {Object} Combat state analysis
     */
    evaluateCombatState(currentCombat) {
        const state = {
            heroHealthPercent: 1.0,
            enemyHealthPercent: 1.0,
            hasHealer: false,
            hasDebuffs: false,
            hasStuns: false,
            partySize: 1,
            combatDuration: 0,
            averageHeroHealth: 1.0
        };

        // Check if party combat
        const isPartyCombat = currentCombat?.party && Array.isArray(currentCombat.party.heroes);

        if (isPartyCombat && this.partyManager) {
            const heroes = currentCombat.party.heroes || [];
            let totalHealth = 0;
            let maxTotalHealth = 0;

            heroes.forEach(heroData => {
                if (heroData.currentHealth <= 0) return;

                const hero = this.partyManager.getHeroById(heroData.id);
                if (hero) {
                    const role = hero.role || heroData.role || 'dps';
                    if (role === 'healer') state.hasHealer = true;
                }

                totalHealth += heroData.currentHealth;
                maxTotalHealth += heroData.maxHealth;
            });

            state.partySize = heroes.length;
            state.averageHeroHealth = maxTotalHealth > 0 ? totalHealth / maxTotalHealth : 1.0;
            state.heroHealthPercent = state.averageHeroHealth;
        } else {
            // Single hero combat
            if (currentCombat.hero) {
                state.heroHealthPercent = currentCombat.hero.currentHealth / currentCombat.hero.maxHealth;
            }
        }

        // Enemy health
        if (currentCombat.enemy) {
            state.enemyHealthPercent = currentCombat.enemy.currentHealth / currentCombat.enemy.maxHealth;
        }

        return state;
    }

    /**
     * Score an ability based on combat state
     * @param {Object} ability - Ability definition
     * @param {Object} combatState - Current combat state
     * @param {string} enemyId - Enemy ID
     * @returns {number} Ability score (0-100)
     */
    scoreAbility(ability, combatState, enemyId) {
        if (!ability) return 0;

        let score = 50; // Base score

        // Check for ability combos
        const lastAbility = this.enemyLastAbilities.get(enemyId);
        const comboBonus = this.checkAbilityCombo(ability, lastAbility);
        score += comboBonus;

        // Score based on ability type
        if (ability.type === 'attack') {
            if (combatState.hasDebuffs) score += 20;
            if (combatState.heroHealthPercent < 0.3) score += 30;
            else if (combatState.heroHealthPercent < 0.5) score += 15;
            if (ability.damageMultiplier && ability.damageMultiplier > 1.5 && combatState.enemyHealthPercent > 0.5) {
                score += 15;
            }
        } else if (ability.type === 'debuff') {
            if (!combatState.hasDebuffs) score += 25;
            if (combatState.hasHealer) score += 20;
            if (combatState.enemyHealthPercent > 0.75) score += 15;
        } else if (ability.type === 'heal' || ability.type === 'buff') {
            if (combatState.enemyHealthPercent < 0.5) score += 30;
            if (combatState.enemyHealthPercent < 0.25) score += 20;
        }

        // Adjust score based on enemy health phase
        if (ability.phase === 'low' && combatState.enemyHealthPercent <= 0.5) {
            score += 20;
        }

        // Adjust score based on party composition
        if (combatState.hasHealer && ability.type === 'attack' && ability.damageMultiplier > 1.0) {
            score += 10;
        }

        // Advanced AI Scoring
        if (combatState.hasHealer && (ability.type === 'debuff' || ability.type === 'stun')) {
            score += 25;
        }

        if (combatState.heroHealthPercent < 0.2 && ability.type === 'attack') {
            score += 40;
        }

        const combatStateAI = this.combatAI?.getAIState(enemyId);
        if (combatStateAI?.adaptationLevel > 1 && (ability.type === 'buff' || ability.type === 'defense')) {
            score += 30;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Check if ability combos with previous ability
     * @param {Object} ability - Current ability
     * @param {string} lastAbility - Last used ability name
     * @returns {number} Combo bonus score
     */
    checkAbilityCombo(ability, lastAbility) {
        if (!ability || !lastAbility) return 0;

        // Debuff → Damage combo
        if (lastAbility.includes('debuff') || lastAbility.includes('curse') || lastAbility.includes('poison')) {
            if (ability.type === 'attack') {
                return 25;
            }
        }

        // Stun → Heavy Attack combo
        if (lastAbility.includes('stun')) {
            if (ability.type === 'attack' && ability.damageMultiplier > 1.5) {
                return 30;
            }
        }

        // Damage → Finisher combo
        if (lastAbility.includes('attack') || lastAbility.includes('strike')) {
            if (ability.type === 'attack' && ability.damageMultiplier > 2.0) {
                return 20;
            }
        }

        return 0;
    }

    /**
     * Weighted random selection from top abilities
     * @param {Array} abilities - Array of {ability, score} objects
     * @returns {Object} Selected ability object
     */
    weightedRandomSelect(abilities) {
        if (!abilities || abilities.length === 0) return null;
        if (abilities.length === 1) return abilities[0];

        const totalWeight = abilities.reduce((sum, a) => sum + a.score, 0);
        if (totalWeight === 0) {
            return abilities[Math.floor(Math.random() * abilities.length)];
        }

        let random = Math.random() * totalWeight;
        for (const item of abilities) {
            random -= item.score;
            if (random <= 0) {
                return item;
            }
        }

        return abilities[abilities.length - 1];
    }

    /**
     * Interrupt enemy casting
     * @param {Object} enemy - Enemy object
     * @returns {boolean} True if successfully interrupted
     */
    interruptEnemy(enemy) {
        if (!enemy || !enemy.isCasting) return false;

        const abilityName = enemy.castingAbility?.name || 'Ability';
        enemy.isCasting = false;
        enemy.castingAbility = null;
        enemy.castRoundsRemaining = 0;

        const enemyX = enemy?.sprite?.x || enemy?.x || 0;
        const enemyY = enemy?.sprite?.y || enemy?.y || 0;
        
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, 'INTERRUPTED!', '#ff0000');
        
        // Put the interrupted ability on a longer cooldown
        if (!enemy.data.abilityCooldowns) enemy.data.abilityCooldowns = {};
        enemy.data.abilityCooldowns[abilityName] = 10; 

        Logger.info('CombatActions', `Enemy interrupted while casting ${abilityName}`);
        return true;
    }

    /**
     * Show bloodline effect visual
     * @param {Object} hero - Hero object
     * @param {string} text - Text to display
     * @param {string} color - Text color
     */
    showBloodlineEffect(hero, text, color) {
        const heroX = hero?.sprite?.x || hero?.x || 0;
        const heroY = hero?.sprite?.y || hero?.y || 0;
        this.damageCalculator?.showFloatingText(heroX, heroY - 100, text, color);
    }
}







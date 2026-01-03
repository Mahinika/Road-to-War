import { Logger } from '../../utils/logger.js';
import { GameEvents } from '../../utils/event-constants.js';

/**
 * Boss Mechanics - Handles boss-specific combat mechanics
 * Extracted from CombatManager to improve separation of concerns
 */
export class BossMechanics {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.damageCalculator = config.damageCalculator || null;
        this.statusEffectsManager = config.statusEffectsManager || null;
        this.combatAI = config.combatAI || null;
        this.combatVisuals = config.combatVisuals || null;
        this.partyManager = config.partyManager || null;
        this.worldManager = config.worldManager || null;
        this.threatSystem = config.threatSystem || null;
    }

    /**
     * Execute boss mechanic
     * @param {Object} enemy - Boss enemy object
     * @param {string} mechanic - Mechanic name
     * @param {Object} currentCombat - Current combat state
     * @param {Object} partyManager - PartyManager instance
     */
    executeMechanic(enemy, mechanic, currentCombat, partyManager) {
        if (!enemy || !mechanic) return;

        const enemyId = enemy.data?.id || enemy.id;

        switch (mechanic) {
            case 'aoe_attack':
            case 'aoe_breath':
                this.executeBossAoE(enemy, currentCombat, partyManager);
                break;
            case 'cleave':
            case 'massive_cleave':
                this.executeCleave(enemy, currentCombat, partyManager);
                break;
            case 'intimidating_shout':
                this.executeIntimidatingShout(enemy, currentCombat, partyManager);
                break;
            case 'summon_adds':
            case 'summon_guards':
                this.spawnAdds(enemy, 2, currentCombat);
                break;
            case 'environmental_hazards':
                // Placeholder for environmental hazards
                Logger.debug('BossMechanics', `Boss ${enemyId} creates environmental hazards`);
                const enemyX = enemy.x || enemy.sprite?.x || 0;
                const enemyY = enemy.y || enemy.sprite?.y || 0;
                this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, 'HAZARDS!', '#ffff00');
                break;
            default:
                Logger.debug('BossMechanics', `Unknown boss mechanic: ${mechanic}`);
        }
    }

    /**
     * Execute boss AoE attack
     * @param {Object} enemy - Boss enemy object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} partyManager - PartyManager instance
     */
    executeBossAoE(enemy, currentCombat, partyManager) {
        if (!partyManager || !currentCombat?.party?.heroes) return;

        const heroes = currentCombat.party?.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) return;

        const enemyAttack = currentCombat.enemy.attack || 10;
        // Boss AoE damage is usually a bit lower per target
        const aoeDamage = Math.floor(enemyAttack * 0.7);

        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return;

            const hero = partyManager.getHeroById(heroData.id);
            if (!hero) return;

            // Calculate final damage with defense
            const finalDamage = this.damageCalculator?.calculateDamage(
                aoeDamage,
                heroData.defense || 0,
                enemy,
                hero
            ) || 0;

            // Apply AoE damage
            heroData.currentHealth = Math.max(0, heroData.currentHealth - finalDamage);

            // Show damage number
            const heroX = hero.x || hero.sprite?.x || 0;
            const heroY = hero.y || hero.sprite?.y || 0;
            this.damageCalculator?.showDamageNumber(heroX, heroY - 50, finalDamage);
            
            // Emit damage taken event for stats
            if (finalDamage > 0) {
                this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: finalDamage });
            }
        });

        const enemyX = enemy.x || enemy.sprite?.x || 0;
        const enemyY = enemy.y || enemy.sprite?.y || 0;
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, 'AoE ATTACK!', '#ff8800');
        this.combatVisuals?.updateHealthBars();
    }

    /**
     * Execute a Cleave attack (hits tank and 2 nearby DPS)
     * @param {Object} enemy - Boss enemy object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} partyManager - PartyManager instance
     */
    executeCleave(enemy, currentCombat, partyManager) {
        if (!partyManager || !currentCombat?.party?.heroes) return;

        const heroes = currentCombat.party?.heroes || [];
        const tank = partyManager.getTank();
        
        // Target tank and up to 2 random alive non-tank heroes
        const targets = [];
        if (tank) {
            const tankData = heroes.find(h => h.id === tank.id);
            if (tankData && tankData.currentHealth > 0) targets.push(tankData);
        }

        const others = heroes.filter(h => h.id !== tank?.id && h.currentHealth > 0);
        const randomOthers = others.sort(() => 0.5 - Math.random()).slice(0, 2);
        targets.push(...randomOthers);

        const enemyAttack = currentCombat.enemy.attack || 10;
        const cleaveDamage = Math.floor(enemyAttack * 1.1); // Cleave is heavy

        targets.forEach(heroData => {
            const hero = partyManager.getHeroById(heroData.id);
            if (!hero) return;

            const finalDamage = this.damageCalculator?.calculateDamage(
                cleaveDamage,
                heroData.defense || 0,
                enemy,
                hero
            ) || 0;

            heroData.currentHealth = Math.max(0, heroData.currentHealth - finalDamage);
            
            const heroX = hero.x || hero.sprite?.x || 0;
            const heroY = hero.y || hero.sprite?.y || 0;
            this.damageCalculator?.showDamageNumber(heroX, heroY - 50, finalDamage);
        });

        const enemyX = enemy.x || enemy.sprite?.x || 0;
        const enemyY = enemy.y || enemy.sprite?.y || 0;
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, 'CLEAVE!', '#ff4400');
        this.combatVisuals?.updateHealthBars();
    }

    /**
     * Execute Intimidating Shout (debuffs all heroes)
     * @param {Object} enemy - Boss enemy object
     * @param {Object} currentCombat - Current combat state
     * @param {Object} partyManager - PartyManager instance
     */
    executeIntimidatingShout(enemy, currentCombat, partyManager) {
        if (!partyManager || !currentCombat?.party?.heroes) return;

        const heroes = currentCombat.party?.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) return;
        
        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return;
            const hero = partyManager.getHeroById(heroData.id);
            if (hero) {
                this.statusEffectsManager?.applyEffect(hero, 'debuff_attack', 4);
            }
        });

        const enemyX = enemy.x || enemy.sprite?.x || 0;
        const enemyY = enemy.y || enemy.sprite?.y || 0;
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, 'INTIMIDATING SHOUT!', '#888888');
        this.combatVisuals?.updateHealthBars();
    }

    /**
     * Spawn additional enemies for boss
     * @param {Object} enemy - Boss enemy object
     * @param {number} count - Number of adds to spawn
     * @param {Object} currentCombat - Current combat state
     */
    spawnAdds(enemy, count = 2, currentCombat) {
        if (!this.scene || !enemy || !this.worldManager) return;

        const enemyId = enemy.data?.id || enemy.id;
        Logger.info('BossMechanics', `Boss ${enemyId} summons ${count} adds!`);

        const enemyX = enemy.x || enemy.sprite?.x || 0;
        const enemyY = enemy.y || enemy.sprite?.y || 0;
        this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, `SUMMONS ${count} ADDS!`, '#ff00ff');

        // Initialize adds array in combat state if it doesn't exist
        if (!currentCombat.adds) {
            currentCombat.adds = [];
        }

        for (let i = 0; i < count; i++) {
            // Spawn a basic enemy (like a goblin or slime) as an add
            const add = this.worldManager.createEnemy(0, 0, false); 
            if (add) {
                add.id = `add_${Date.now()}_${i}`;
                add.isAdd = true;
                
                // Position around the boss
                add.x = enemyX + (Math.random() - 0.5) * 200;
                add.y = enemyY + (Math.random() - 0.5) * 100;

                // Create sprite
                this.worldManager.createEnemySprite(add);
                
                // Add to combat adds
                currentCombat.adds.push({
                    id: add.id,
                    instance: add,
                    maxHealth: add.data.stats.health,
                    currentHealth: add.data.stats.health,
                    attack: add.data.stats.attack,
                    defense: add.data.stats.defense
                });

                // Initialize threat for add
                if (this.combatAI && this.combatAI.initializeEnemyThreat) {
                    this.combatAI.initializeEnemyThreat(add);
                } else if (this.threatSystem && this.partyManager) {
                    // Fallback to threat system directly
                    const heroes = this.partyManager.getHeroes();
                    this.threatSystem.initializeEnemyThreat(add, heroes);
                }
            }
        }
    }

    /**
     * Get boss phase based on health percentage
     * @param {Object} enemy - Boss enemy object
     * @param {Object} currentCombat - Current combat state
     * @returns {string} Phase name (phase1, phase2, phase3, enrage)
     */
    getBossPhase(enemy, currentCombat) {
        if (!enemy || !currentCombat?.enemy) return 'phase1';

        const healthPercent = currentCombat.enemy.currentHealth / currentCombat.enemy.maxHealth;
        if (healthPercent > 0.75) return 'phase1';
        if (healthPercent > 0.50) return 'phase2';
        if (healthPercent > 0.25) return 'phase3';
        return 'enrage';
    }

    /**
     * Adapt enemy strategy based on combat state
     * This is a simplified version - full adaptation logic may be in CombatManager
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     * @returns {string} Adapted strategy name
     */
    adaptStrategy(enemy, currentCombat) {
        if (!enemy || !enemy.data) return 'defensive';

        const baseStrategy = enemy.data.aiStrategy || 'defensive';
        
        // Simple adaptation based on health
        if (currentCombat?.enemy) {
            const healthPercent = currentCombat.enemy.currentHealth / currentCombat.enemy.maxHealth;
            if (healthPercent < 0.25) {
                return 'aggressive'; // Desperate
            } else if (healthPercent < 0.5) {
                return 'tactical'; // Cautious
            }
        }

        return baseStrategy;
    }
}







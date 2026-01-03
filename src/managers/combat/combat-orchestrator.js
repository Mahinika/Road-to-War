import { Logger } from '../../utils/logger.js';
import { GameEvents } from '../../utils/event-constants.js';
import { BaseManager } from '../base-manager.js';

/**
 * Combat Orchestrator - Handles combat flow coordination
 * Manages combat state machine, turn management, and combat lifecycle
 * Now integrates with CombatActions for turn execution
 */
export class CombatOrchestrator extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return ['partyManager', 'damageCalculator', 'combatAI', 'combatVisuals', 'abilityManager', 'statusEffectsManager', 'threatSystem', 'combatActions'];
    }

    constructor(scene, config = {}) {
        super(scene, config);
        this.partyManager = config.partyManager || null;
        this.damageCalculator = config.damageCalculator || null;
        this.combatAI = config.combatAI || null;
        this.combatVisuals = config.combatVisuals || null;
        this.abilityManager = config.abilityManager || null;
        this.statusEffectsManager = config.statusEffectsManager || null;
        this.threatSystem = config.threatSystem || null;
        this.combatActions = config.combatActions || null;
        this.bossMechanics = config.bossMechanics || null;
        this.eventBus = config.eventBus || scene.eventBus || null;

        // Combat state
        this.inCombat = false;
        this.currentCombat = null;
        this.combatQueue = [];
        this.combatSpeed = config.combatSpeed || (this.scene.cache.json.get('worldConfig')?.combat?.baseCombatSpeed || 500);

        // Turn management
        this.currentTurn = 'hero'; // 'hero' or 'enemy'
        this.combatRound = 0;
        this._combatTimerPending = false;
        this._currentCombatTimer = null;
    }

    /**
     * Start a combat session
     * Note: Detailed combat state initialization is handled by CombatManager.
     * This method just sets up basic orchestrator state.
     * @param {Object} hero - Hero object (for single-hero combat)
     * @param {Object} enemy - Enemy object
     * @returns {boolean} True if combat started successfully
     */
    startCombat(hero, enemy) {
        if (this.inCombat) {
            Logger.warn('CombatOrchestrator', 'Cannot start combat: already in combat');
            return false;
        }

        if (!hero || !enemy) {
            Logger.warn('CombatOrchestrator', 'Cannot start combat: hero and enemy required');
            return false;
        }

        this.inCombat = true;
        // Basic state - detailed state will be set by CombatManager via setCurrentCombat
        this.currentCombat = {
            hero: hero,
            enemy: enemy,
            turn: 'hero',
            round: 1,
            startTime: Date.now(),
            phase: 'normal'
        };
        this.currentTurn = 'hero';
        this.combatRound = 1;

        Logger.info('CombatOrchestrator', `Combat started: hero vs ${enemy.data?.id || 'unknown'}`);
        return true;
    }

    /**
     * Start party combat
     * Note: Detailed combat state initialization is handled by CombatManager.
     * This method just sets up basic orchestrator state.
     * @param {Object} partyManager - PartyManager instance
     * @param {Object} enemy - Enemy object
     * @returns {boolean} True if combat started successfully
     */
    startPartyCombat(partyManager, enemy) {
        if (this.inCombat) {
            Logger.warn('CombatOrchestrator', 'Cannot start combat: already in combat');
            return false;
        }

        if (!partyManager || partyManager.getSize() === 0) {
            Logger.warn('CombatOrchestrator', 'Cannot start party combat: invalid party');
            return false;
        }

        if (!enemy) {
            Logger.warn('CombatOrchestrator', 'Cannot start party combat: enemy required');
            return false;
        }

        this.inCombat = true;
        this.partyManager = partyManager;
        
        // Initialize threat table for this enemy
        if (this.threatSystem) {
            const heroes = partyManager.getHeroes();
            this.threatSystem.initializeEnemyThreat(enemy, heroes);
        }
        
        // Basic state - detailed state will be set by CombatManager via setCurrentCombat
        this.currentCombat = {
            party: {
                heroes: [], // Will be populated by CombatManager's initializePartyCombatState
                totalHealth: 0
            },
            enemy: {
                maxHealth: enemy.data?.stats?.health || enemy.data?.stats?.maxHealth || 100,
                currentHealth: enemy.data?.currentHealth || enemy.data?.stats?.health || 100,
                attack: enemy.data?.stats?.attack || 10,
                defense: enemy.data?.stats?.defense || 5
            },
            turn: 'party',
            round: 1,
            startTime: Date.now(),
            phase: 'normal'
        };
        this.currentTurn = 'party';
        this.combatRound = 1;

        Logger.info('CombatOrchestrator', `Party combat started: ${partyManager.getSize()} heroes vs ${enemy.data?.id || 'unknown'}`);
        return true;
    }

    /**
     * End combat
     * @param {boolean} heroVictory - True if heroes won
     */
    endCombat(heroVictory) {
        if (!this.inCombat) {
            return;
        }

        this.inCombat = false;
        this._combatTimerPending = false;

        if (this._currentCombatTimer) {
            this._currentCombatTimer.remove();
            this._currentCombatTimer = null;
        }

        const combatDuration = Date.now() - (this.currentCombat?.startTime || Date.now());

        // Clear combat visuals
        this.combatVisuals?.clearCombatVisuals();

        // Emit combat end event
        if (this.eventBus) {
            this.eventBus.emit(GameEvents.COMBAT.END, {
                heroVictory: heroVictory,
                enemy: this.currentCombat?.enemy,
                party: this.currentCombat?.party?.heroes
            });
        }

        Logger.info('CombatOrchestrator', `Combat ended: ${heroVictory ? 'Victory' : 'Defeat'} (${combatDuration}ms, ${this.combatRound} rounds)`);

        // Clear combat state
        this.currentCombat = null;
        this.currentTurn = 'hero';
        this.combatRound = 0;
    }

    /**
     * Check if combat should end
     * @returns {Object|null} { ended: boolean, heroVictory: boolean } or null if combat continues
     */
    checkCombatEnd() {
        if (!this.inCombat || !this.currentCombat) {
            return null;
        }

        const isPartyCombat = this.currentCombat.party && Array.isArray(this.currentCombat.party.heroes);
        const enemyData = this.currentCombat.enemy;

        // Check if enemy is dead (use combat state data)
        const enemyDead = !enemyData || (enemyData.currentHealth !== undefined && enemyData.currentHealth <= 0);

        if (enemyDead) {
            return { ended: true, heroVictory: true };
        }

        // Check if all heroes are dead
        if (isPartyCombat && this.currentCombat.party.heroes) {
            const heroes = this.currentCombat.party.heroes;
            const allDead = heroes.every(heroData => {
                return !heroData || heroData.currentHealth <= 0;
            });

            if (allDead) {
                return { ended: true, heroVictory: false };
            }
        } else {
            // Single hero combat - check combat state data
            const heroData = this.currentCombat.hero;
            // Check if heroData is actual hero object or combat state data
            if (heroData && typeof heroData === 'object') {
                const heroHealth = heroData.currentHealth !== undefined ? heroData.currentHealth : 
                                  (heroData.data?.currentHealth !== undefined ? heroData.data.currentHealth : null);
                const heroDead = heroHealth === null || heroHealth <= 0;

                if (heroDead) {
                    return { ended: true, heroVictory: false };
                }
            }
        }

        return null; // Combat continues
    }

    /**
     * Schedule next combat action
     * Integrates with CombatActions for turn execution
     */
    scheduleNextCombatAction() {
        if (!this.inCombat || this._combatTimerPending) {
            return;
        }

        this._combatTimerPending = true;

        this._currentCombatTimer = this.scene.time.delayedCall(this.combatSpeed, async () => {
            this._combatTimerPending = false;

            if (!this.inCombat || !this.currentCombat) {
                return;
            }

            // Process status effects for all combatants at start of turn
            await this._processStatusEffects();

            // Check for combat end after status effects
            const endCheck = this.checkCombatEnd();
            if (endCheck && endCheck.ended) {
                this.endCombat(endCheck.heroVictory);
                return;
            }

            // Execute turn using CombatActions
            if (this.currentTurn === 'hero' || this.currentTurn === 'party') {
                await this._executeHeroTurn();
            } else {
                await this._executeEnemyTurn();
            }

            // Check for combat end after actions
            const endCheckAfter = this.checkCombatEnd();
            if (endCheckAfter && endCheckAfter.ended) {
                this.endCombat(endCheckAfter.heroVictory);
                return;
            }

            // Switch turns
            this.currentTurn = this.currentTurn === 'hero' || this.currentTurn === 'party' ? 'enemy' : 'party';
            this.combatRound++;
            if (this.currentCombat) {
                this.currentCombat.turn = this.currentTurn;
                this.currentCombat.round = this.combatRound;
            }

            // Update AI state
            if (this.currentCombat?.enemy && this.combatAI) {
                const enemyId = this.currentCombat.enemy.id || this.currentCombat.enemy.data?.id;
                if (enemyId) {
                    this.combatAI.updateAIState(enemyId, this.currentCombat.enemy, this.currentCombat);
                }
            }

            // Schedule next action
            this.scheduleNextCombatAction();
        });
    }

    /**
     * Process status effects for all active combatants
     * @private
     */
    async _processStatusEffects() {
        if (!this.statusEffectsManager || !this.currentCombat) return;

        const combatants = [];
        
        // Get actual hero/enemy objects (not just combat state data)
        // For single hero combat
        if (this.currentCombat.hero && typeof this.currentCombat.hero === 'object' && this.currentCombat.hero.data) {
            // This is the actual hero object
            combatants.push(this.currentCombat.hero);
        }
        
        // For party combat, get actual hero objects from partyManager
        if (this.currentCombat.party?.heroes && this.partyManager) {
            const heroDataArray = this.currentCombat.party.heroes;
            heroDataArray.forEach(heroData => {
                if (heroData && heroData.id) {
                    const hero = this.partyManager.getHeroById(heroData.id);
                    if (hero) combatants.push(hero);
                }
            });
        }
        
        // Get enemy object (enemy is stored in combat state, but we need the actual enemy object)
        // The enemy object should be available from the scene's combatManager or passed separately
        // For now, check if currentCombat.enemy is the actual enemy object or just data
        const enemy = this.currentCombat.enemy;
        if (enemy && (enemy.data || enemy.sprite)) {
            // This looks like the actual enemy object
            combatants.push(enemy);
        }

        for (const combatant of combatants) {
            if (!combatant || !combatant.data) continue;
            
            const effectResults = this.statusEffectsManager.processEffects(combatant, this.currentCombat);
            this.statusEffectsManager.applyEffectResults(combatant, this.currentCombat, effectResults);

            const combatantX = combatant?.sprite?.x ?? combatant?.x ?? 0;
            const combatantY = combatant?.sprite?.y ?? combatant?.y ?? 0;

            if (effectResults.damage > 0) {
                this.damageCalculator?.showDamageNumber(combatantX, combatantY - 50, effectResults.damage, '#ff0000');
                this.combatVisuals?.updateHealthBars();
            }
            if (effectResults.healing > 0) {
                this.damageCalculator?.showFloatingText(combatantX, combatantY - 80, `HEAL +${effectResults.healing}`, '#00ff00');
                this.combatVisuals?.updateHealthBars();
            }
            this.combatVisuals?.updateStatusEffectIndicators();
        }
    }

    /**
     * Execute hero turn (delegates to CombatActions)
     * @private
     */
    async _executeHeroTurn() {
        if (!this.combatActions || !this.currentCombat) return;

        const isPartyCombat = this.currentCombat.party && Array.isArray(this.currentCombat.party.heroes);

        if (isPartyCombat && this.partyManager) {
            // Party combat
            this.combatActions.executePartyTurn(this.partyManager, this.currentCombat, this.currentCombat.enemy);
        } else if (this.currentCombat.hero) {
            // Single hero combat
            this.combatActions.executeHeroTurn(this.currentCombat.hero, this.currentCombat, this.currentCombat.enemy);
        }
    }

    /**
     * Execute enemy turn (delegates to CombatActions)
     * @private
     */
    async _executeEnemyTurn() {
        if (!this.combatActions || !this.currentCombat) return;

        // Get enemy object - could be in currentCombat.enemy or need to get from scene
        let enemy = this.currentCombat.enemy;
        if (!enemy || !enemy.data) {
            // Try to get from scene's combatManager
            enemy = this.scene.combatManager?.enemy || null;
        }
        
        if (!enemy) return;

        // Check if enemy is stunned
        if (this.statusEffectsManager?.isStunned(enemy)) {
            const enemyX = enemy?.sprite?.x || enemy?.x || 0;
            const enemyY = enemy?.sprite?.y || enemy?.y || 0;
            this.damageCalculator?.showFloatingText(enemyX, enemyY - 80, 'STUNNED!', '#ffff00');
            return;
        }

        this.combatActions.executeEnemyTurn(
            enemy,
            this.currentCombat,
            this.partyManager
        );
    }

    /**
     * Get current combat state
     * @returns {Object} Combat state
     */
    getCombatState() {
        return {
            inCombat: this.inCombat,
            currentCombat: this.currentCombat,
            currentTurn: this.currentTurn,
            round: this.combatRound
        };
    }

    /**
     * Set current combat (for backward compatibility)
     * @param {Object} combat - Combat state object
     */
    setCurrentCombat(combat) {
        this.currentCombat = combat;
    }

    /**
     * Check if in combat
     * @returns {boolean} True if in combat
     */
    isInCombat() {
        return this.inCombat;
    }

    /**
     * Get current enemy
     * @returns {Object|null} Current enemy or null
     */
    getCurrentEnemy() {
        return this.currentCombat?.enemy || null;
    }

    /**
     * Get current party (if party combat)
     * @returns {Array|null} Party heroes or null
     */
    getCurrentParty() {
        return this.currentCombat?.party || null;
    }

    /**
     * Cleanup resources when the manager is destroyed
     */
    destroy() {
        super.destroy();
        if (this._currentCombatTimer) {
            this._currentCombatTimer.remove();
            this._currentCombatTimer = null;
        }
        this.currentCombat = null;
        Logger.info('CombatOrchestrator', 'Destroyed');
    }
}


/**
 * Combat AI - Handles enemy AI logic, targeting, and threat management
 * Extracted from CombatManager to improve separation of concerns
 */

export class CombatAI {
    /**
     * Create a new CombatAI
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        this.scene = scene;
        this.partyManager = config.partyManager;

        // Threat management
        this.threatTable = new Map(); // Map<enemyId, Map<heroId, threat>>

        // Enemy AI state tracking
        this.enemyCombatStates = new Map(); // Map<enemyId, {phase, adaptationLevel, lastTargetSwitch, lastUsedAbility}>
        this.enemyLastAbilities = new Map(); // Map<enemyId, abilityName> - track last used ability for combos
    }

    /**
     * Initialize threat table for an enemy
     * @param {Object} enemy - Enemy object
     */
    initializeEnemyThreat(enemy) {
        if (!enemy?.data?.id) return;

        const enemyId = enemy.data.id;

        // Initialize threat table for this enemy
        if (!this.threatTable.has(enemyId)) {
            this.threatTable.set(enemyId, new Map());
        }

        // Initialize enemy AI state
        if (!this.enemyCombatStates.has(enemyId)) {
            this.enemyCombatStates.set(enemyId, {
                phase: 'normal',
                adaptationLevel: 0,
                lastTargetSwitch: 0,
                lastUsedAbility: null,
                ignoreThreat: false,
                enraged: false
            });
        }

        // Reset threat for all heroes
        this.partyManager?.getHeroes().forEach(hero => {
            if (hero?.id) {
                this.threatTable.get(enemyId).set(hero.id, 0);
            }
        });
    }

    /**
     * Get threat level for a hero against an enemy
     * @param {string} enemyId - Enemy ID
     * @param {string} heroId - Hero ID
     * @returns {number} Threat level
     */
    getThreat(enemyId, heroId) {
        if (!this.threatTable.has(enemyId)) {
            this.threatTable.set(enemyId, new Map());
        }
        return this.threatTable.get(enemyId).get(heroId) || 0;
    }

    /**
     * Calculate threat bonus based on hero power (gems, equipment, bloodline)
     * @param {Object} hero - Hero object
     * @returns {number} Threat bonus
     */
    calculateHeroPowerThreat(hero) {
        if (!hero?.data?.stats) return 0;
        
        let powerThreat = 0;
        const stats = hero.data.stats;

        // 1. Gem Threat: Heroes with powerful gems attract more attention
        if (stats.lifesteal > 10) powerThreat += 50; // High lifesteal is dangerous
        if (stats.stunChance > 5) powerThreat += 30; // CC potential
        if (stats.fireDamagePercent > 20) powerThreat += 40; // High elemental damage

        // 2. Bloodline Threat: Certain bloodlines are higher priority targets
        if (hero.data.bloodlineId === 'arcane_scholar') powerThreat += 25;
        if (hero.data.bloodlineId === 'shadow_assassin') powerThreat += 35;

        // 3. Current Performance: Heroes doing more damage/healing
        // (This would ideally track recent damage/healing data)

        return powerThreat;
    }

    /**
     * Increase threat for a hero (when they damage enemy)
     * @param {string} enemyId - Enemy ID
     * @param {string} heroId - Hero ID
     * @param {number} threat - Threat amount
     * @param {number} multiplier - Threat multiplier (default 1.0)
     */
    addThreat(enemyId, heroId, threat = 0, multiplier = 1.0) {
        if (!this.threatTable.has(enemyId)) {
            this.threatTable.set(enemyId, new Map());
        }
        const finalThreat = Math.floor(threat * multiplier);
        const currentThreat = this.threatTable.get(enemyId).get(heroId) || 0;
        this.threatTable.get(enemyId).set(heroId, currentThreat + finalThreat);
    }

    /**
     * Reduce threat for a hero (threat drop ability)
     * @param {string} enemyId - Enemy ID
     * @param {string} heroId - Hero ID
     * @param {number} amount - Amount to reduce (percentage 0-1 or absolute value)
     * @param {boolean} isPercentage - If true, amount is percentage (0-1), else absolute
     */
    reduceThreat(enemyId, heroId, amount = 0, isPercentage = false) {
        if (!this.threatTable.has(enemyId)) return;

        const currentThreat = this.threatTable.get(enemyId).get(heroId) || 0;
        if (currentThreat <= 0) return;

        let newThreat;
        if (isPercentage) {
            newThreat = Math.floor(currentThreat * (1 - amount));
        } else {
            newThreat = Math.max(0, currentThreat - amount);
        }

        this.threatTable.get(enemyId).set(heroId, newThreat);
    }

    /**
     * Check if an enemy is currently incapacitated (stunned, etc.)
     * @param {Object} enemy - Enemy object
     * @returns {boolean} True if incapacitated
     */
    isIncapacitated(enemy) {
        if (!enemy?.data?.statusEffects) return false;
        
        // Check for stun effect
        if (enemy.data.statusEffects.stunned) return true;
        
        // Add other incapacitating effects here
        return false;
    }

    /**
     * Select which hero the enemy should target based on strategy
     * @param {string} enemyId - Enemy ID
     * @param {Object} enemy - Enemy object
     * @param {string} targetingStrategy - Override strategy (optional)
     * @returns {string} Hero ID to target
     */
    selectTarget(enemyId, enemy, targetingStrategy = null) {
        // ... (existing ignoreThreat check)
        const combatState = this.enemyCombatStates.get(enemyId);
        if (combatState?.ignoreThreat || combatState?.enraged) {
            return this.selectRandomTarget(enemyId);
        }

        // Get enemy personality/strategy from enemy data
        const strategy = targetingStrategy || enemy?.data?.aiStrategy || 'defensive';

        switch (strategy) {
            case 'aggressive':
                return this.selectLowHealthTarget(enemyId);
            case 'tactical':
                // Tactical enemies target healers first, then DPS, then tanks
                return this.selectPriorityTarget(enemyId, ['healer', 'dps', 'tank']);
            case 'disruptor':
                // Disruptors target the unit currently casting
                return this.selectCastingTarget(enemyId) || this.selectHighestThreat(enemyId);
            case 'anti_magic':
                // Anti-magic enemies target units with high mana
                return this.selectManaTarget(enemyId) || this.selectHighestThreat(enemyId);
            case 'synergy_breaker':
                // Targets heroes providing the most synergy (usually healers or supports)
                return this.selectSynergyTarget(enemyId) || this.selectPriorityTarget(enemyId, ['healer', 'dps', 'tank']);
            case 'predator':
                // Targets units with most buffs
                return this.selectBuffedTarget(enemyId) || this.selectHighestThreat(enemyId);
            case 'bloodline_hunter':
                // Specifically targets heroes based on their bloodline vulnerability
                return this.selectBloodlineCounterTarget(enemyId) || this.selectHighestThreat(enemyId);
            case 'defensive':
                return this.selectHighestThreat(enemyId); // Primary tank target
            case 'boss':
                return this.selectBossTarget(enemyId);
            default:
                return this.selectHighestThreat(enemyId);
        }
    }

    /**
     * Select hero with most mana
     */
    selectManaTarget(enemyId) {
        if (!this.partyManager) return null;
        const heroes = this.partyManager.getHeroes() || [];
        
        let mostMana = -1;
        let targetHeroId = null;

        heroes.forEach(hero => {
            if (!hero?.data?.stats || hero.data.stats.health <= 0) return;
            const mana = hero.data.mana || 0;
            if (mana > mostMana) {
                mostMana = mana;
                targetHeroId = hero.id;
            }
        });

        return targetHeroId;
    }

    /**
     * Select hero with most active buffs
     */
    selectBuffedTarget(enemyId) {
        if (!this.partyManager) return null;
        const heroes = this.partyManager.getHeroes() || [];
        
        let mostBuffs = -1;
        let targetHeroId = null;

        heroes.forEach(hero => {
            if (!hero?.data?.stats || hero.data.stats.health <= 0) return;
            const buffCount = hero.data.statusEffects ? Object.keys(hero.data.statusEffects).filter(k => !k.includes('debuff')).length : 0;
            if (buffCount > mostBuffs) {
                mostBuffs = buffCount;
                targetHeroId = hero.id;
            }
        });

        return targetHeroId;
    }

    /**
     * Select target based on bloodline counters
     */
    selectBloodlineCounterTarget(enemyId) {
        if (!this.partyManager) return null;
        const heroes = this.partyManager.getHeroes() || [];
        
        let highestPriority = -1;
        let targetHeroId = null;

        heroes.forEach(hero => {
            if (!hero?.data?.stats || hero.data.stats.health <= 0) return;
            
            let priority = 0;
            const bloodlineId = hero.data.bloodlineId;

            // 1. Arcane Scholar counter: prioritize if mana is high
            if (bloodlineId === 'arcane_scholar') {
                const manaPercent = (hero.data.mana || 0) / (hero.data.stats.maxMana || 100);
                priority += 30 + (manaPercent * 20);
            }

            // 2. Ancient Warrior counter: prioritize if they are low HP (to avoid Rage)
            // Actually, an AI might WANT to avoid them, but a 'hunter' targets them to finish them off
            if (bloodlineId === 'ancient_warrior') {
                const hpPercent = hero.data.stats.health / hero.data.stats.maxHealth;
                if (hpPercent < 0.4) priority += 40; // Finish the warrior before they rage too hard
            }

            // 3. Shadow Assassin counter: prioritize if they just used a big move
            if (bloodlineId === 'shadow_assassin') priority += 25;

            if (priority > highestPriority) {
                highestPriority = priority;
                targetHeroId = hero.id;
            }
        });

        return targetHeroId;
    }

    /**
     * Select target providing the most synergy or support
     */
    selectSynergyTarget(enemyId) {
        if (!this.partyManager) return null;
        const heroes = this.partyManager.getHeroes() || [];
        
        let highestSupportValue = -1;
        let targetHeroId = null;

        heroes.forEach(hero => {
            if (!hero?.data?.stats || hero.data.stats.health <= 0) return;
            
            let supportValue = 0;
            
            // 1. Role Value
            if (hero.role === 'healer') supportValue += 50;
            if (hero.role === 'support') supportValue += 40;

            // 2. Synergy Bonuses Provided
            if (hero.synergyBonuses) {
                supportValue += Object.keys(hero.synergyBonuses).length * 10;
            }

            // 3. Active Auras/Buffs (Bloodline based)
            if (hero.data.bloodlineId === 'nature_blessed') supportValue += 20;

            if (supportValue > highestSupportValue) {
                highestSupportValue = supportValue;
                targetHeroId = hero.id;
            }
        });

        return targetHeroId;
    }

    /**
     * Select a target that is currently casting an ability
     */
    selectCastingTarget(enemyId) {
        const party = this.scene.partyManager?.getParty() || [];
        const castingHero = party.find(hero => hero.isCasting || hero.data?.isCasting);
        return castingHero ? castingHero.id : null;
    }

    /**
     * Check if an enemy can be interrupted
     * Called by AbilityManager when deciding to use an interrupt ability
     */
    shouldInterrupt(enemy) {
        if (!enemy) return false;

        // Check if enemy is casting an interruptible spell
        const isCasting = enemy.isCasting || enemy.data?.isCasting;
        const interruptible = enemy.isInterruptible !== false; // Default true

        return isCasting && interruptible;
    }

    /**
     * Select hero with highest threat (default/defensive behavior)
     * @param {string} enemyId - Enemy ID
     * @returns {string|null} Hero ID with highest threat
     */
    selectHighestThreat(enemyId) {
        if (!this.threatTable.has(enemyId)) {
            return null;
        }

        let maxThreat = -1;
        let targetHeroId = null;

        this.threatTable.get(enemyId).forEach((baseThreat, heroId) => {
            const hero = this.partyManager?.getHeroById(heroId);
            if (!hero || hero.data?.stats?.health <= 0) return;

            // Combine base threat (from damage/healing) with power threat
            const powerThreat = this.calculateHeroPowerThreat(hero);
            const totalThreat = baseThreat + powerThreat;

            if (totalThreat > maxThreat) {
                maxThreat = totalThreat;
                targetHeroId = heroId;
            }
        });

        return targetHeroId;
    }

    /**
     * Select hero with lowest health percentage
     * @param {string} enemyId - Enemy ID
     * @returns {string|null} Hero ID with lowest health
     */
    selectLowHealthTarget(enemyId) {
        if (!this.partyManager) {
            return this.selectHighestThreat(enemyId); // Fallback
        }

        const heroes = this.partyManager.getHeroes() || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            return this.selectHighestThreat(enemyId);
        }

        let lowestHealthPercent = 1.0;
        let targetHeroId = null;

        heroes.forEach(hero => {
            if (!hero?.data?.stats || hero.data.stats.health <= 0) return; // Skip dead heroes

            const healthPercent = hero.data.stats.health / hero.data.stats.maxHealth;
            if (healthPercent < lowestHealthPercent) {
                lowestHealthPercent = healthPercent;
                targetHeroId = hero.id;
            }
        });

        return targetHeroId || this.selectHighestThreat(enemyId);
    }

    /**
     * Select target by role priority
     * @param {string} enemyId - Enemy ID
     * @param {Array<string>} priorityOrder - Array of roles in priority order ['healer', 'dps', 'tank']
     * @returns {string|null} Hero ID matching priority
     */
    selectPriorityTarget(enemyId, priorityOrder) {
        if (!this.partyManager) {
            return this.selectHighestThreat(enemyId); // Fallback
        }

        const heroes = this.partyManager.getHeroes() || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            return this.selectHighestThreat(enemyId);
        }

        // Find heroes by role priority
        for (const role of priorityOrder) {
            // Find first alive hero with this role
            const targetHero = heroes.find(hero => {
                if (!hero?.data?.stats || hero.data.stats.health <= 0) return false;

                // Check if hero has this role
                if (hero.role === role) return true;

                // Check specialization data if available
                if (hero.classId && hero.specId) {
                    const specKey = `${hero.classId}_${hero.specId}`;
                    const specData = this.scene?.cache?.json?.get('specializations')?.[specKey];
                    if (specData && specData.role === role) return true;
                }

                return false;
            });

            if (targetHero) {
                return targetHero.id;
            }
        }

        // Fallback to highest threat
        return this.selectHighestThreat(enemyId);
    }

    /**
     * Select random target (for enraged enemies)
     * @param {string} enemyId - Enemy ID
     * @returns {string|null} Random hero ID
     */
    selectRandomTarget(enemyId) {
        if (!this.partyManager) return null;

        const allHeroes = this.partyManager.getHeroes() || [];
        if (!Array.isArray(allHeroes) || allHeroes.length === 0) return null;

        const heroes = allHeroes.filter(hero =>
            hero?.data?.stats && hero.data.stats.health > 0
        );

        if (heroes.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * heroes.length);
        return heroes[randomIndex].id;
    }

    /**
     * Select boss target (prioritizes tank, then healer)
     * @param {string} enemyId - Enemy ID
     * @returns {string|null} Hero ID for boss targeting
     */
    selectBossTarget(enemyId) {
        // Bosses prioritize tanks, then healers
        return this.selectPriorityTarget(enemyId, ['tank', 'healer', 'dps']);
    }

    /**
     * Update enemy AI state based on combat progress
     * @param {string} enemyId - Enemy ID
     * @param {Object} enemy - Enemy object
     * @param {Object} currentCombat - Current combat state
     */
    updateAIState(enemyId, enemy, currentCombat) {
        const combatState = this.enemyCombatStates.get(enemyId);
        if (!combatState) return;

        // Update adaptation level based on combat duration
        const combatTime = Date.now() - (currentCombat?.startTime || Date.now());
        combatState.adaptationLevel = Math.floor(combatTime / 30000); // Increase every 30 seconds

        // Check for phase changes
        const enemyHealthPercent = enemy?.data?.stats?.health / enemy?.data?.stats?.maxHealth;
        if (enemyHealthPercent < 0.25 && combatState.phase !== 'enraged') {
            combatState.phase = 'enraged';
            combatState.enraged = true;
            combatState.ignoreThreat = true;
        }

        // --- NEW: CC Adaptation ---
        // If enemy is being CC'd frequently, it might change strategy
        if (enemy?.data?.statusEffects?.stunned || enemy?.data?.statusEffects?.slowed) {
            combatState.ccCount = (combatState.ccCount || 0) + 1;
            
            // If CC'd more than 3 times, become 'aggressive' or 'enraged' early
            if (combatState.ccCount > 3 && !combatState.enraged) {
                combatState.adaptationLevel += 1;
                if (Math.random() < 0.3) {
                    combatState.phase = 'adaptive';
                    combatState.ignoreThreat = true; // Start ignoring the tank
                    this.scene?.showFloatingText?.(enemy.x, enemy.y - 100, 'ADAPTING!', '#ffaa00');
                }
            }
        }
    }

    /**
     * Get available heroes for targeting
     * @returns {Array} Array of available hero objects
     */
    getAvailableTargets() {
        if (!this.partyManager) return [];

        const heroes = this.partyManager.getHeroes() || [];
        if (!Array.isArray(heroes)) return [];

        return heroes.filter(hero =>
            hero?.data?.stats && hero.data.stats.health > 0
        );
    }

    /**
     * Clear threat table for a specific enemy
     * @param {string} enemyId - Enemy ID
     */
    clearThreatTable(enemyId) {
        if (this.threatTable.has(enemyId)) {
            this.threatTable.get(enemyId).clear();
        }
    }

    /**
     * Get enemy AI state
     * @param {string} enemyId - Enemy ID
     * @returns {Object|null} AI state object
     */
    getAIState(enemyId) {
        return this.enemyCombatStates.get(enemyId) || null;
    }

    /**
     * Set enemy AI state property
     * @param {string} enemyId - Enemy ID
     * @param {string} property - Property name
     * @param {any} value - Property value
     */
    setAIState(enemyId, property, value) {
        if (!this.enemyCombatStates.has(enemyId)) {
            this.enemyCombatStates.set(enemyId, {
                phase: 'normal',
                adaptationLevel: 0,
                lastTargetSwitch: 0,
                lastUsedAbility: null,
                ignoreThreat: false,
                enraged: false
            });
        }

        this.enemyCombatStates.get(enemyId)[property] = value;
    }
}


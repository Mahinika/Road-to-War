
/**
 * Ability Manager - Handles Paladin abilities and mana system
 * Manages ability selection, mana costs, cooldowns, and effects
 */
import { Logger } from '../utils/logger.js';
import { BaseManager } from './base-manager.js';

export class AbilityManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // AbilityManager has no dependencies (resourceManager set post-init)
    }

    /**
     * Create a new AbilityManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        // Use DataService if available, fallback to direct cache access
        this.dataService = config.dataService || this.scene.dataService || null;
        this.worldConfig = this.dataService?.getWorldConfig() || this.scene.cache.json.get('worldConfig');
        this.classesData = this.dataService?.getClasses() || this.scene.cache.json.get('classes');
        this.specData = this.dataService?.getSpecializations() || this.scene.cache.json.get('specializations');
        this.abilitiesData = this.dataService?.getAbilities() || this.scene.cache.json.get('abilities');

        // Get reference to resource manager (prioritize hero-specific resource manager)
        this.resourceManager = this.scene.heroResourceManager || this.scene.resourceManager;

        // Cooldown tracking - Map<heroId, Map<abilityName, remainingCooldown>>
        this.cooldowns = new Map();

        // Ability usage history for rotation logic
        this.abilityHistory = new Map(); // Map<heroId, Array<{ability, timestamp}>>

        // Visual cooldown indicators
        this.cooldownIndicators = new Map(); // Map<heroId, Map<abilityName, indicator>>

        // Legacy support - will be phased out as everything moves to abilities.json
        this.abilities = this.abilitiesData?.general || {
            autoAttack: { name: 'Auto Attack', cost: 0, cooldown: 0, type: 'attack' }
        };
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        Logger.info('AbilityManager', 'Initialized with data-driven system');
    }

    /**
     * Initialize cooldown tracking for a hero
     * @param {string} heroId - Hero ID
     */
    initializeHeroCooldowns(heroId) {
        if (!this.cooldowns.has(heroId)) {
            this.cooldowns.set(heroId, new Map());
        }
        if (!this.abilityHistory.has(heroId)) {
            this.abilityHistory.set(heroId, []);
        }
    }

    /**
     * Update cooldowns for all heroes (called each combat round)
     */
    updateCooldowns() {
        this.cooldowns.forEach((heroCooldowns, heroId) => {
            heroCooldowns.forEach((cooldown, abilityName) => {
                if (cooldown > 0) {
                    heroCooldowns.set(abilityName, cooldown - 1);

                    // Update visual indicator if it exists
                    this.updateCooldownIndicator(heroId, abilityName, cooldown - 1);
                }
            });
        });
    }

    /**
     * Check if an ability is on cooldown
     * @param {string} heroId - Hero ID
     * @param {string} abilityName - Ability name
     * @returns {boolean} True if on cooldown
     */
    isOnCooldown(heroId, abilityName) {
        const heroCooldowns = this.cooldowns.get(heroId);
        if (!heroCooldowns) return false;

        const cooldown = heroCooldowns.get(abilityName) || 0;
        return cooldown > 0;
    }

    /**
     * Get remaining cooldown for an ability
     * @param {string} heroId - Hero ID
     * @param {string} abilityName - Ability name
     * @returns {number} Remaining cooldown turns
     */
    getCooldown(heroId, abilityName) {
        const heroCooldowns = this.cooldowns.get(heroId);
        if (!heroCooldowns) return 0;

        return heroCooldowns.get(abilityName) || 0;
    }

    /**
     * Put an ability on cooldown
     * @param {string} heroId - Hero ID
     * @param {string} abilityName - Ability name
     */
    setCooldown(heroId, abilityName) {
        const ability = this.abilities[abilityName];
        if (!ability || ability.cooldown <= 0) return;

        this.initializeHeroCooldowns(heroId);
        this.cooldowns.get(heroId).set(abilityName, ability.cooldown);

        // Record ability usage for rotation logic
        const history = this.abilityHistory.get(heroId);
        history.push({
            ability: abilityName,
            timestamp: Date.now()
        });

        // Keep only last 10 abilities for rotation analysis
        if (history.length > 10) {
            history.shift();
        }

        // Update visual indicator
        this.updateCooldownIndicator(heroId, abilityName, ability.cooldown);
    }

    /**
     * Get ability rotation recommendation based on history
     * @param {string} heroId - Hero ID
     * @param {Array} availableAbilities - List of available ability names
     * @returns {string} Recommended ability to use next
     */
    getRotationRecommendation(heroId, availableAbilities) {
        const history = this.abilityHistory.get(heroId) || [];

        // Simple rotation logic: prefer abilities that haven't been used recently
        const recentAbilities = history.slice(-5).map(entry => entry.ability);
        const leastUsed = availableAbilities.filter(ability =>
            !recentAbilities.includes(ability) || recentAbilities.filter(a => a === ability).length < 2
        );

        return leastUsed.length > 0 ? leastUsed[0] : availableAbilities[0];
    }

    /**
     * Create or update visual cooldown indicator
     * @param {string} heroId - Hero ID
     * @param {string} abilityName - Ability name
     * @param {number} cooldown - Current cooldown value
     */
    updateCooldownIndicator(heroId, abilityName, cooldown) {
        const indicatorKey = `${heroId}_${abilityName}`;

        if (!this.cooldownIndicators.has(heroId)) {
            this.cooldownIndicators.set(heroId, new Map());
        }

        const abilityDef = this.getAbilityDefinition(heroId, abilityName);
        const heroIndicators = this.cooldownIndicators.get(heroId);
        heroIndicators.set(abilityName, {
            cooldown: cooldown,
            maxCooldown: abilityDef?.cooldown || 0
        });

        // Emit event for UI updates
        this.scene.events.emit('ability_cooldown_updated', {
            heroId,
            abilityName,
            cooldown,
            maxCooldown: abilityDef?.cooldown || 0
        });
    }

    /**
     * Get ability definition for a specific hero
     * @param {string} heroId - Hero ID
     * @param {string} abilityName - Ability name
     * @returns {Object|null} Ability definition
     */
    getAbilityDefinition(heroId, abilityName) {
        // First check general abilities
        if (this.abilitiesData?.general?.[abilityName]) {
            return this.abilitiesData.general[abilityName];
        }

        // Check if hero belongs to a class and look up there
        const hero = this.getHeroById(heroId);
        if (hero && hero.classId && this.abilitiesData?.[hero.classId]?.[abilityName]) {
            return this.abilitiesData[hero.classId][abilityName];
        }

        return null;
    }

    /**
     * Helper to find a hero in the party by ID.
     * @param {string} heroId - ID of the hero to find.
     * @returns {Object|null} The hero object or null if not found.
     */
    getHeroById(heroId) {
        if (this.scene.partyManager) {
            return this.scene.partyManager.getHero(heroId);
        }
        return null;
    }

    /**
     * Get all cooldown states for a hero
     * @param {string} heroId - Hero ID
     * @returns {Object} Cooldown states by ability
     */
    getCooldownStates(heroId) {
        const heroCooldowns = this.cooldowns.get(heroId);
        if (!heroCooldowns) return {};

        const states = {};
        heroCooldowns.forEach((cooldown, abilityName) => {
            states[abilityName] = {
                current: cooldown,
                max: this.abilities[abilityName]?.cooldown || 0,
                isOnCooldown: cooldown > 0
            };
        });

        return states;
    }

    /**
     * Select which ability to use based on hero state
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {string} - Ability name to use
     */
    selectAbility(hero, combatState) {
        if (!hero || !hero.data || !combatState) return 'autoAttack';

        const heroId = hero.id || hero.data.id;
        this.initializeHeroCooldowns(heroId);

        // Get hero role (support both single hero and party combat)
        const heroData = combatState.hero || combatState.party?.heroes?.find(h => h.id === heroId);
        if (!heroData) return 'autoAttack';

        const role = hero.role || heroData.role || 'dps';

        // Evaluate combat state
        const combatAnalysis = this.evaluateCombatState(hero, combatState, heroData);

        // Get available abilities (not on cooldown and affordable)
        const availableAbilities = this.getAvailableAbilitiesForHero(hero, role);

        // Check for interrupt opportunity
        if (this.scene.combatAI && combatState.enemy) {
            const shouldInterrupt = this.scene.combatAI.shouldInterrupt(combatState.enemy);
            if (shouldInterrupt) {
                const interruptAbility = availableAbilities.find(name => {
                    const def = this.getAbilityDefinition(heroId, name);
                    return def && def.type === 'interrupt';
                });
                if (interruptAbility) return interruptAbility;
            }
        }

        // If no abilities available, use auto attack
        if (availableAbilities.length === 0) return 'autoAttack';

        // Role-based ability selection with cooldown awareness
        let selectedAbility;
        switch (role) {
            case 'tank':
                selectedAbility = this.selectTankAbility(hero, combatState, combatAnalysis, heroData, availableAbilities);
                break;
            case 'healer':
                selectedAbility = this.selectHealerAbility(hero, combatState, combatAnalysis, heroData, availableAbilities);
                break;
            case 'dps':
                selectedAbility = this.selectDPSAbility(hero, combatState, combatAnalysis, heroData, availableAbilities);
                break;
            default:
                selectedAbility = this.selectDPSAbility(hero, combatState, combatAnalysis, heroData, availableAbilities);
        }

        // Put selected ability on cooldown (if it has one)
        if (selectedAbility !== 'autoAttack') {
            this.setCooldown(heroId, selectedAbility);
        }

        return selectedAbility;
    }

    /**
     * Get abilities available for use (not on cooldown and affordable)
     * @param {Object} hero - Hero object
     * @param {string} role - Hero role
     * @returns {Array} Available ability names
     */
    getAvailableAbilitiesForHero(hero, role) {
        const heroId = hero.id || hero.data.id;
        const availableAbilities = [];

        // Get all abilities for this hero's class and spec
        const classId = hero.classId || hero.data?.classId;
        const specId = hero.specId || hero.data?.specId;

        const coreAbilities = this.classesData?.[classId]?.coreAbilities || [];
        const specKey = `${classId}_${specId}`;
        const specAbilities = this.specData?.[specKey]?.specAbilities || [];

        const allPossibleAbilities = [...new Set([...coreAbilities, ...specAbilities])];

        allPossibleAbilities.forEach(abilityName => {
            const abilityDef = this.getAbilityDefinition(heroId, abilityName);
            if (!abilityDef) return;

            // Check cooldown
            if (this.isOnCooldown(heroId, abilityName)) return;

            // Check resource cost using resource manager
            let cost = abilityDef.cost || 0;
            const resourceType = abilityDef.resourceType || this.classesData?.[classId]?.resourceType || 'mana';

            // Apply Bloodline Mana Efficiency (e.g., Arcane Scholar)
            if (resourceType === 'mana') {
                const efficiencyEffect = hero.data?.bloodline?.uniqueAbility?.id === 'arcane_mastery';
                if (efficiencyEffect) {
                    cost = Math.floor(cost * 0.8); // 20% less mana
                }
            }

            if (this.resourceManager && !this.resourceManager.hasResource(heroId, cost, resourceType)) {
                return;
            }

            availableAbilities.push(abilityName);
        });

        return availableAbilities;
    }

    /**
     * Gets default abilities for a role (Legacy support).
     * @param {string} role - Hero role.
     * @returns {Array<string>} List of ability names.
     */
    getRoleAbilities(role) {
        // Fallback for legacy calls
        return ['auto_attack'];
    }

    /**
     * Select ability for tank role
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @param {Object} combatAnalysis - Combat analysis
     * @param {Object} heroData - Hero data
     * @param {Array} availableAbilities - Abilities not on cooldown
     * @returns {string} - Ability name
     */
    selectTankAbility(hero, combatState, combatAnalysis, heroData, availableAbilities) {
        const mana = hero.data.mana || 0;
        const healthPercent = heroData.currentHealth / heroData.maxHealth;
        const defensiveActive = hero.data.abilities?.defensive?.active || false;
        const defensiveTurnsRemaining = hero.data.abilities?.defensive?.turnsRemaining || 0;

        const heroId = hero.id || hero.data.id;
        const canAffordMana = (cost) => {
            if (!this.resourceManager) {
                // Fallback to old mana check if resource manager not available
                return (hero.data.mana || 0) >= cost;
            }
            return this.resourceManager.canAfford(heroId, 'mana', cost);
        };

        // Priority 1: Defensive cooldown if health < 30% (critical threshold)
        if (healthPercent < 0.3 && !defensiveActive && defensiveTurnsRemaining <= 0) {
            if (availableAbilities.includes('defensive') && canAffordMana(this.abilities.defensive.manaCost)) {
                return 'defensive';
            }
        }

        // Priority 2: Shield Bash if available (threat-generating ability - damage + stun)
        // Tanks prioritize threat-generating abilities to maintain aggro
        if (availableAbilities.includes('shieldBash') && canAffordMana(this.abilities.shieldBash.manaCost)) {
            return 'shieldBash';
        }

        // Priority 3: Defensive if health < 70% and not active (sustained mitigation)
        if (healthPercent < 0.7 && !defensiveActive && defensiveTurnsRemaining <= 0) {
            if (availableAbilities.includes('defensive') && canAffordMana(this.abilities.defensive.manaCost)) {
                return 'defensive';
            }
        }

        // Priority 4: Divine Aura for sustained threat and mana regen
        if (availableAbilities.includes('divineAura') && canAffordMana(this.abilities.divineAura.manaCost)) {
            return 'divineAura';
        }

        // Use tactical rotation recommendation for remaining abilities
        const rotationAbility = this.getTacticalRotationRecommendation(hero.id || hero.data.id, availableAbilities, 'tank');
        if (rotationAbility && rotationAbility !== 'autoAttack') {
            return rotationAbility;
        }

        // Default: Auto Attack (tanks generate 2x threat on all attacks, already implemented in threat system)
        return 'autoAttack';
    }

    /**
     * Select ability for healer role
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @param {Object} combatAnalysis - Combat analysis
     * @param {Object} heroData - Hero data
     * @returns {string} - Ability name
     */
    selectHealerAbility(hero, combatState, combatAnalysis, heroData, availableAbilities) {
        const heroId = hero.id || hero.data.id;
        const healthPercent = heroData.currentHealth / heroData.maxHealth;

        const canAffordMana = (cost) => {
            if (!this.resourceManager) {
                return (hero.data.mana || 0) >= cost;
            }
            return this.resourceManager.canAfford(heroId, 'mana', cost);
        };

        const getManaPercent = () => {
            if (!this.resourceManager) {
                const mana = hero.data.mana || 0;
                const maxMana = hero.data.maxMana || 100;
                return mana / maxMana;
            }
            const manaData = this.resourceManager.getResourceData(heroId, 'mana');
            return manaData ? manaData.current / manaData.max : 0;
        };

        // Priority 1: Heal if any party member is below 60% health (emergency healing)
        if (combatAnalysis.partyNeedsHealing && combatAnalysis.lowestHealthPercent < 0.6) {
            if (availableAbilities.includes('heal') && canAffordMana(this.abilities.heal.manaCost)) {
                return 'heal';
            }
        }

        // Priority 2: Heal tank if tank health < 70% (tank bias)
        if (combatAnalysis.tankHealthPercent < 0.7 && combatAnalysis.tankHealthPercent < healthPercent) {
            if (availableAbilities.includes('heal') && canAffordMana(this.abilities.heal.manaCost)) {
                return 'heal';
            }
        }

        // Priority 3: Heal self if health < 40%
        if (healthPercent < 0.4) {
            if (availableAbilities.includes('heal') && canAffordMana(this.abilities.heal.manaCost)) {
                return 'heal';
            }
        }

        // Priority 4: Sustained healing if party below 80% (mana-efficient healing)
        if (combatAnalysis.lowestHealthPercent < 0.8 && canAffordMana(this.abilities.heal.manaCost * 0.3)) {
            if (availableAbilities.includes('heal')) {
                return 'heal';
            }
        }

        // Priority 5: Divine Aura if low on mana and not active (mana management)
        if (availableAbilities.includes('divineAura') && canAffordMana(this.abilities.divineAura.manaCost)) {
            const divineAuraActive = hero.data.abilities?.divineAura?.active || false;
            const manaPercent = getManaPercent();
            if (!divineAuraActive && manaPercent < 0.3) {
                return 'divineAura';
            }
        }

        // Use tactical rotation recommendation for remaining abilities
        const rotationAbility = this.getTacticalRotationRecommendation(heroId, availableAbilities, 'healer');
        if (rotationAbility && rotationAbility !== 'autoAttack') {
            return rotationAbility;
        }

        // Priority 6: Only attack if all party members are healthy (>80%) and mana is sufficient
        if (combatAnalysis.allPartyHealthy && this.resourceManager.canAfford(heroId, 'mana', 10)) {
            if (this.abilities.smite) {
                const smiteCooldown = hero.data.abilities?.smite?.cooldown || 0;
                if (smiteCooldown <= 0 && mana >= this.abilities.smite.manaCost) {
                    return 'smite';
                }
            }
        }

        // Default: Auto Attack (even healers need to do something when all healthy)
        return 'autoAttack';
    }

    /**
     * Select ability for DPS role
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @param {Object} combatAnalysis - Combat analysis
     * @param {Object} heroData - Hero data
     * @returns {string} - Ability name
     */
    selectDPSAbility(hero, combatState, combatAnalysis, heroData, availableAbilities) {
        const heroId = hero.id || hero.data.id;
        const healthPercent = heroData.currentHealth / heroData.maxHealth;

        const canAffordMana = (cost) => {
            if (!this.resourceManager) {
                return (hero.data.mana || 0) >= cost;
            }
            return this.resourceManager.canAfford(heroId, 'mana', cost);
        };

        // Priority 1: Smite if enemy is low on health (finisher)
        if (combatAnalysis.enemyLowHealth && availableAbilities.includes('smite') && canAffordMana(this.abilities.smite.manaCost)) {
            return 'smite';
        }

        // Priority 2: Shield Bash for stun if available
        if (availableAbilities.includes('shieldBash') && canAffordMana(this.abilities.shieldBash.manaCost)) {
            return 'shieldBash';
        }

        // Priority 3: Divine Aura for mana regeneration
        if (availableAbilities.includes('divineAura') && canAffordMana(this.abilities.divineAura.manaCost)) {
            return 'divineAura';
        }

        // Priority 4: Heal if health < 25%
        if (healthPercent < 0.25 && availableAbilities.includes('heal') && canAffordMana(this.abilities.heal.manaCost)) {
            return 'heal';
        }

        // Priority 5: Defensive if health < 60% and not active
        const defensiveActive = hero.data.abilities?.defensive?.active || false;
        const defensiveTurnsRemaining = hero.data.abilities?.defensive?.turnsRemaining || 0;
        if (healthPercent < 0.6 && !defensiveActive && defensiveTurnsRemaining <= 0 && availableAbilities.includes('defensive') && canAffordMana(this.abilities.defensive.manaCost)) {
            return 'defensive';
        }

        // Use tactical rotation recommendation for remaining abilities
        const rotationAbility = this.getTacticalRotationRecommendation(heroId, availableAbilities, 'dps');
        if (rotationAbility && rotationAbility !== 'autoAttack') {
            return rotationAbility;
        }

        // Default: Auto Attack
        return 'autoAttack';
    }

    /**
     * Evaluate combat state for tactical decisions
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @param {Object} heroData - Hero data
     * @returns {Object} - Combat analysis
     */
    evaluateCombatState(hero, combatState, heroData) {
        const analysis = {
            partyNeedsHealing: false,
            partyLowHealthCount: 0,
            lowestHealthPercent: 1.0,
            lowestHealthHero: null,
            tankHealthPercent: 1.0,
            allPartyHealthy: true,
            enemyLowHealth: false,
            enemyHealthPercent: 1.0,
            heroHealthPercent: heroData.currentHealth / heroData.maxHealth,
            hasDebuffs: false,
            hasBuffs: false
        };

        // Check if party combat
        if (combatState.party && Array.isArray(combatState.party.heroes)) {
            const heroes = combatState.party.heroes;
            let lowHealthCount = 0;
            let lowestHealth = 1.0;
            let lowestHero = null;
            let tankHealth = 1.0;
            let allHealthy = true;

            heroes.forEach(h => {
                if (h.currentHealth > 0) {
                    const healthPercent = h.currentHealth / h.maxHealth;

                    // Track lowest health hero
                    if (healthPercent < lowestHealth) {
                        lowestHealth = healthPercent;
                        lowestHero = h;
                    }

                    // Track tank health (tank bias for healers)
                    if (h.role === 'tank') {
                        tankHealth = healthPercent;
                    }

                    // Check if party member needs healing (<50%)
                    if (healthPercent < 0.5) {
                        lowHealthCount++;
                        allHealthy = false;
                    }

                    // Consider party unhealthy if anyone is below 80%
                    if (healthPercent < 0.8) {
                        allHealthy = false;
                    }
                }
            });

            analysis.partyLowHealthCount = lowHealthCount;
            analysis.partyNeedsHealing = lowHealthCount > 0;
            analysis.lowestHealthPercent = lowestHealth;
            analysis.lowestHealthHero = lowestHero;
            analysis.tankHealthPercent = tankHealth;
            analysis.allPartyHealthy = allHealthy;
        } else if (heroData) {
            // Single hero combat
            analysis.partyNeedsHealing = analysis.heroHealthPercent < 0.5;
            analysis.allPartyHealthy = analysis.heroHealthPercent >= 0.8;
        }

        // Check enemy health
        if (combatState.enemy) {
            analysis.enemyHealthPercent = combatState.enemy.currentHealth / combatState.enemy.maxHealth;
            analysis.enemyLowHealth = analysis.enemyHealthPercent < 0.3;
        }

        // Check status effects (if available)
        if (hero.data?.statusEffects) {
            const effects = Object.keys(hero.data.statusEffects);
            analysis.hasDebuffs = effects.some(e => e.includes('debuff') || e.includes('poison') || e.includes('bleed'));
            analysis.hasBuffs = effects.some(e => e.includes('buff') || e.includes('blessing'));
        }

        return analysis;
    }

    /**
     * Score an ability based on role, combat state, and combos
     * @param {Object} ability - Ability definition
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @param {Object} combatAnalysis - Combat analysis
     * @returns {number} - Ability score (0-100)
     */
    scoreAbility(ability, hero, combatState, combatAnalysis) {
        if (!ability) return 0;

        let score = 50; // Base score
        const role = hero.role || 'dps';

        // Role-based scoring
        if (role === 'tank' && ability.type === 'buff' && ability.defenseBonus) {
            score += 30; // Tanks prefer defensive abilities
        }
        if (role === 'healer' && ability.type === 'heal') {
            // Higher score if party members are low on health
            score += combatAnalysis.partyLowHealthCount * 20;
        }
        if (role === 'dps' && ability.type === 'attack' && ability.damageMultiplier > 1.0) {
            score += 25; // DPS prefer damage abilities
        }

        // Combat state scoring
        if (combatAnalysis.enemyLowHealth && ability.type === 'attack' && ability.damageMultiplier > 1.5) {
            score += 20; // Finisher abilities when enemy is low
        }
        if (combatAnalysis.partyNeedsHealing && ability.type === 'heal') {
            score += 30; // Healing when party needs it
        }

        // Ability combo scoring
        const lastAbility = hero.data?.lastUsedAbility;
        const comboBonus = this.checkAbilityCombo(ability, lastAbility);
        score += comboBonus;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Check if ability combos with previous ability
     * @param {Object} ability - Current ability
     * @param {string} lastAbility - Last used ability name
     * @returns {number} - Combo bonus score
     */
    checkAbilityCombo(ability, lastAbility) {
        if (!ability || !lastAbility) return 0;

        // Debuff → Damage combo
        if (lastAbility.includes('bash') || lastAbility.includes('stun')) {
            if (ability.type === 'attack' && ability.damageMultiplier > 1.5) {
                return 25; // High bonus for damage after stun
            }
        }

        // Buff → Attack combo
        if (lastAbility.includes('defensive') || lastAbility.includes('aura')) {
            if (ability.type === 'attack') {
                return 15; // Bonus damage after buffing
            }
        }

        // Attack → Finisher combo
        if (lastAbility.includes('attack') || lastAbility.includes('smite')) {
            if (ability.type === 'attack' && ability.damageMultiplier > 2.0) {
                return 20; // Finisher after regular attack
            }
        }

        return 0;
    }

    /**
     * Execute an ability
     * @param {string} abilityName - Name of ability to execute
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Ability result with effects
     */
    executeAbility(abilityName, hero, combatState) {
        if (!hero || !hero.data || !combatState) return null;

        const ability = this.abilities[abilityName];
        if (!ability) return null;

        // Check mana cost
        if (hero.data.mana < ability.manaCost) {
            Logger.warn('AbilityManager', `Not enough mana for ${ability.name}. Need ${ability.manaCost}, have ${hero.data.mana}`);
            return null;
        }

        // Check cooldown
        if (abilityName === 'heal') {
            const cooldown = hero.data.abilities?.heal?.cooldown || 0;
            if (cooldown > 0) {
                Logger.debug('AbilityManager', `${ability.name} is on cooldown. ${cooldown} turns remaining.`);
                return null;
            }
        }

        // Consume mana
        hero.data.mana = Math.max(0, hero.data.mana - ability.manaCost);

        // Track last used ability for combos
        if (!hero.data.lastUsedAbility) hero.data.lastUsedAbility = '';
        hero.data.lastUsedAbility = abilityName;

        const result = {
            ability: abilityName,
            name: ability.name,
            effects: {}
        };

        // Execute ability-specific logic
        switch (abilityName) {
            case 'autoAttack':
                result.effects = this.executeAutoAttack(hero, combatState);
                break;
            case 'defensive':
                result.effects = this.executeDefensive(hero, combatState);
                break;
            case 'heal':
                result.effects = this.executeHeal(hero, combatState);
                // Set cooldown
                if (!hero.data.abilities) hero.data.abilities = {};
                hero.data.abilities.heal = { cooldown: ability.cooldown };
                break;
            case 'smite':
                result.effects = this.executeSmite(hero, combatState);
                // Set cooldown
                if (!hero.data.abilities) hero.data.abilities = {};
                hero.data.abilities.smite = { cooldown: ability.cooldown };
                break;
            case 'shieldBash':
                result.effects = this.executeShieldBash(hero, combatState);
                // Set cooldown
                if (!hero.data.abilities) hero.data.abilities = {};
                hero.data.abilities.shieldBash = { cooldown: ability.cooldown };
                break;
            case 'divineAura':
                result.effects = this.executeDivineAura(hero, combatState);
                break;
        }

        return result;
    }

    /**
     * Execute auto attack ability
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Attack effects
     */
    executeAutoAttack(hero, combatState) {
        // Standard attack - damage calculation happens in CombatManager
        return {
            type: 'attack',
            damage: combatState.hero.attack
        };
    }

    /**
     * Execute defensive ability
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Defensive effects
     */
    executeDefensive(hero, combatState) {
        // Initialize abilities object if needed
        if (!hero.data.abilities) hero.data.abilities = {};

        // Get base defense (before any buffs)
        // We need to calculate from hero stats, not combat state which may already have buffs
        const baseDefense = hero.data.stats.defense;

        // Activate defensive buff
        hero.data.abilities.defensive = {
            active: true,
            turnsRemaining: this.abilities.defensive.duration,
            defenseBonus: this.abilities.defensive.defenseBonus
        };

        // Apply defense bonus to combat state
        const bonusDefense = Math.floor(baseDefense * this.abilities.defensive.defenseBonus);
        combatState.hero.defense = baseDefense + bonusDefense;

        return {
            type: 'buff',
            defenseBonus: bonusDefense,
            duration: this.abilities.defensive.duration
        };
    }

    /**
     * Execute heal ability
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Heal effects
     */
    executeHeal(hero, combatState) {
        const maxHealth = combatState.hero.maxHealth;
        const healAmount = Math.floor(maxHealth * this.abilities.heal.healPercent);
        const newHealth = Math.min(maxHealth, combatState.hero.currentHealth + healAmount);
        const actualHeal = newHealth - combatState.hero.currentHealth;

        combatState.hero.currentHealth = newHealth;

        // Update hero stats
        if (hero.data.stats) {
            hero.data.stats.health = newHealth;
        }

        return {
            type: 'heal',
            amount: actualHeal,
            newHealth: newHealth
        };
    }

    /**
     * Update ability cooldowns and defensive buff duration
     * @param {Object} hero - Hero character
     */
    updateAbilities(hero) {
        if (!hero || !hero.data || !hero.data.abilities) return;

        // Update heal cooldown
        if (hero.data.abilities.heal && hero.data.abilities.heal.cooldown > 0) {
            hero.data.abilities.heal.cooldown--;
        }

        // Update defensive buff
        if (hero.data.abilities.defensive && hero.data.abilities.defensive.active) {
            hero.data.abilities.defensive.turnsRemaining--;
            if (hero.data.abilities.defensive.turnsRemaining <= 0) {
                hero.data.abilities.defensive.active = false;
                hero.data.abilities.defensive.turnsRemaining = 0;
            }
        }
    }

    /**
     * Regenerate mana
     * @param {Object} hero - Hero character
     * @param {number} deltaTime - Time since last update in seconds
     */
    regenerateMana(hero) {
        if (!hero || !hero.data) return;

        let manaRegen = hero.data.manaRegen || this.paladinConfig.manaRegen || 10;
        const maxMana = hero.data.maxMana || this.paladinConfig.maxMana || 100;

        // Apply Divine Aura bonus if active
        if (hero.data.abilities?.divineAura?.active) {
            const bonus = this.abilities.divineAura.manaRegenBonus || 0.5;
            manaRegen = Math.floor(manaRegen * (1 + bonus));
        }

        // Regenerate mana (10 per second, but we call this per combat turn)
        // Combat speed is ~1 second, so regen 10 per turn
        hero.data.mana = Math.min(maxMana, (hero.data.mana || 0) + manaRegen);
    }

    /**
     * Get current defensive defense bonus
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {number} - Defense bonus amount
     */
    getDefenseBonus(hero, combatState) {
        if (!hero || !hero.data || !hero.data.abilities) return 0;

        const defensive = hero.data.abilities.defensive;
        if (!defensive || !defensive.active) return 0;

        const baseDefense = combatState.hero.defense - Math.floor(combatState.hero.defense / (1 + defensive.defenseBonus));
        return Math.floor(baseDefense * defensive.defenseBonus);
    }

    /**
     * Check if defensive buff is active
     * @param {Object} hero - Hero character
     * @returns {boolean} - True if defensive buff is active
     */
    isDefensiveActive(hero) {
        if (!hero || !hero.data || !hero.data.abilities) return false;
        return hero.data.abilities.defensive?.active || false;
    }

    /**
     * Execute smite ability - high damage attack
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Attack effects
     */
    executeSmite(hero, combatState) {
        const baseAttack = combatState.hero.attack;
        const damageMultiplier = this.abilities.smite.damageMultiplier || 2.0;
        const damage = Math.floor(baseAttack * damageMultiplier);

        return {
            type: 'attack',
            damage: damage,
            isSmite: true
        };
    }

    /**
     * Execute shield bash ability - damage + stun
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Attack effects with stun
     */
    executeShieldBash(hero, combatState) {
        const baseAttack = combatState.hero.attack;
        const damageMultiplier = this.abilities.shieldBash.damageMultiplier || 1.3;
        const damage = Math.floor(baseAttack * damageMultiplier);
        const stunDuration = this.abilities.shieldBash.stunDuration || 1;

        return {
            type: 'attack',
            damage: damage,
            stun: stunDuration,
            isShieldBash: true,
            interrupt: true
        };
    }

    /**
     * Execute divine aura ability - mana regeneration boost
     * @param {Object} hero - Hero character
     * @param {Object} combatState - Current combat state
     * @returns {Object} - Buff effects
     */
    executeDivineAura(hero, combatState) {
        // Initialize abilities object if needed
        if (!hero.data.abilities) hero.data.abilities = {};

        // Activate divine aura buff
        hero.data.abilities.divineAura = {
            active: true,
            turnsRemaining: this.abilities.divineAura.duration,
            manaRegenBonus: this.abilities.divineAura.manaRegenBonus
        };

        return {
            type: 'buff',
            duration: this.abilities.divineAura.duration,
            manaRegenBonus: this.abilities.divineAura.manaRegenBonus
        };
    }

    /**
     * Set combat tactics that influence ability selection
     * @param {string} tactics - Combat tactics ('balanced', 'aggressive', 'defensive')
     */
    setCombatTactics(tactics) {
        this.combatTactics = tactics;
    }

    /**
     * Get combat tactics
     * @returns {string} Current combat tactics
     */
    getCombatTactics() {
        return this.combatTactics || 'balanced';
    }

    /**
     * Enhanced rotation recommendation based on tactics
     * @param {string} heroId - Hero ID
     * @param {Array} availableAbilities - Abilities not on cooldown
     * @param {string} role - Hero role
     * @returns {string} Recommended ability to use next
     */
    getTacticalRotationRecommendation(heroId, availableAbilities, role) {
        const tactics = this.getCombatTactics();
        const history = this.abilityHistory.get(heroId) || [];

        // Base rotation logic
        const recentAbilities = history.slice(-5).map(entry => entry.ability);

        // Tactics influence ability priority
        const priorityAbilities = this.getTacticalAbilityPriority(availableAbilities, tactics, role);

        // Prefer high-priority abilities that haven't been used recently
        for (const ability of priorityAbilities) {
            if (!recentAbilities.includes(ability) || recentAbilities.filter(a => a === ability).length < 2) {
                return ability;
            }
        }

        // Fallback to least used available ability
        const leastUsed = availableAbilities.filter(ability =>
            !recentAbilities.includes(ability)
        );

        return leastUsed.length > 0 ? leastUsed[0] : availableAbilities[0];
    }

    /**
     * Use an ability (Enhanced Phase 9 Version)
     * Handles logic, animations, and particle effects
     * @param {Object} hero - Hero character
     * @param {string} abilityId - Ability ID
     * @param {Object} target - Target character
     */
    useAbility(hero, abilityId, target) {
        if (!hero || !hero.sprite || !abilityId) return false;

        const heroId = hero.id || hero.data?.id;
        const abilityDef = this.getAbilityDefinition(heroId, abilityId);
        
        if (!abilityDef) {
            Logger.warn('AbilityManager', `Unknown ability: ${abilityId}`);
            return false;
        }

        // 1. Logic: Check mana/resources (with bloodline modifications)
        let cost = abilityDef.cost || 0;
        const resourceType = abilityDef.resourceType || 'mana';
        let damageMultiplier = 1.0;

        // Apply bloodline effects on ability casting (Phase 10: Bloodline System Integration)
        if (this.scene.bloodlineManager?.onAbilityCast) {
            const bloodlineResult = this.scene.bloodlineManager.onAbilityCast(hero, abilityId, cost);
            cost = bloodlineResult.manaCost;
            damageMultiplier = bloodlineResult.damageMultiplier || 1.0;
        }

        if (this.resourceManager && !this.resourceManager.hasResource(heroId, cost, resourceType)) {
            this.scene.events.emit('floating_text', {
                x: hero.sprite.x,
                y: hero.sprite.y - 20,
                text: `Not enough ${resourceType}!`,
                color: '#ff0000'
            });
            return false;
        }

        // 2. Logic: Put on cooldown
        this.setCooldown(heroId, abilityId);
        
        // 3. Logic: Spend resource
        if (this.resourceManager) {
            this.resourceManager.spendResource(heroId, cost, resourceType);
        }

        // 4. Visuals: Play Animation
        const animName = abilityDef.animation || (abilityId.includes('heal') ? 'heal' : 'attack');
        if (this.scene.animationManager) {
            this.scene.animationManager.playAnimation(hero.sprite, hero.classId, heroId, animName, true);
        }

        // 5. Visuals: Particle Effects (High Quality)
        if (this.scene.particleManager) {
            const effectType = abilityDef.effectType || this.getEffectTypeForAbility(abilityId);
            
            // Create effect at target or hero position
            const effectX = (abilityDef.targetType === 'self' || !target) ? hero.sprite.x : (target.sprite?.x || target.x);
            const effectY = (abilityDef.targetType === 'self' || !target) ? hero.sprite.y : (target.sprite?.y || target.y);
            
            this.scene.particleManager.createExplosion(effectX, effectY, effectType, 30);
            
            // Special case: Projectiles or trails for ranged abilities
            if (abilityDef.isRanged && target) {
                this.scene.particleManager.createTrail(hero.sprite.x, hero.sprite.y, effectX, effectY, effectType);
            }
        }

        // 6. Visuals: Hit Flash on target
        if (target && target.sprite && !abilityId.includes('heal')) {
            this.scene.particleManager?.applyHitFlash(target.sprite);
        }

        Logger.info('AbilityManager', `${hero.name} used ${abilityDef.name} on ${target?.name || 'self'}`);
        return true;
    }

    /**
     * Get default effect type for an ability
     * @param {string} abilityId 
     * @returns {string}
     */
    getEffectTypeForAbility(abilityId) {
        if (abilityId.includes('fire')) return 'fire';
        if (abilityId.includes('frost') || abilityId.includes('ice')) return 'frost';
        if (abilityId.includes('shadow') || abilityId.includes('void')) return 'void';
        if (abilityId.includes('holy') || abilityId.includes('divine') || abilityId.includes('heal')) return 'holy';
        if (abilityId.includes('nature') || abilityId.includes('rejuvenation')) return 'nature';
        if (abilityId.includes('lightning') || abilityId.includes('arcane')) return 'lightning';
        return 'combat';
    }

    /**
     * Get ability priority based on tactics and role
     * @param {Array} availableAbilities - Available abilities
     * @param {string} tactics - Combat tactics
     * @param {string} role - Hero role
     * @returns {Array} Prioritized ability list
     */
    getTacticalAbilityPriority(availableAbilities, tactics, role) {
        const priorities = {
            tank: {
                aggressive: ['shieldBash', 'divineAura', 'defensive', 'autoAttack'],
                defensive: ['defensive', 'divineAura', 'shieldBash', 'autoAttack'],
                balanced: ['shieldBash', 'defensive', 'divineAura', 'autoAttack']
            },
            healer: {
                aggressive: ['heal', 'divineAura', 'autoAttack'],
                defensive: ['divineAura', 'heal', 'autoAttack'],
                balanced: ['heal', 'divineAura', 'autoAttack']
            },
            dps: {
                aggressive: ['smite', 'shieldBash', 'divineAura', 'autoAttack'],
                defensive: ['defensive', 'divineAura', 'shieldBash', 'autoAttack'],
                balanced: ['smite', 'shieldBash', 'defensive', 'divineAura', 'autoAttack']
            }
        };

        const rolePriorities = priorities[role] || priorities.dps;
        const tacticPriorities = rolePriorities[tactics] || rolePriorities.balanced;

        // Filter to only available abilities and maintain priority order
        return tacticPriorities.filter(ability => availableAbilities.includes(ability));
    }
}


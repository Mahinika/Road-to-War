import Phaser from 'phaser';
import { AbilityManager } from './ability-manager.js';
import { StatusEffectsManager } from './status-effects-manager.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { ObjectPool } from '../utils/object-pool.js';
import { GameEvents } from '../utils/event-constants.js';
import { DamageCalculator } from './combat/damage-calculator.js';
import { CombatAI } from './combat/combat-ai.js';
import { CombatVisuals } from './combat/combat-visuals.js';
import { CombatOrchestrator } from './combat/combat-orchestrator.js';
import { ThreatSystem } from './combat/threat-system.js';
import { CombatActions } from './combat/combat-actions.js';
import { CombatRewards } from './combat/combat-rewards.js';
import { BossMechanics } from './combat/boss-mechanics.js';
import { ProceduralItemGenerator } from '../generators/procedural-item-generator.js';
import { ManagerValidationMixin, ValidationBuilder } from '../utils/input-validation.js';
import { BaseManager } from './base-manager.js';

/**
 * Combat Manager - Handles all combat-related systems
 * Coordinates battle calculations, damage resolution, and combat flow
 */

export class CombatManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return ['partyManager', 'prestigeManager', 'abilityManager', 'statusEffectsManager', 'damageCalculator', 'combatAI', 'combatVisuals', 'threatSystem', 'combatOrchestrator'];
        // Note: equipmentManager is set post-initialization
    }

    /**
     * Create a new CombatManager
     * @param {Phaser.Scene} scene - Phaser scene instance
     * @param {Object} [config] - Optional configuration object for dependency injection
     * @param {Object} [config.worldConfig] - World configuration (defaults to scene cache)
     * @param {AbilityManager} [config.abilityManager] - Ability manager instance (optional)
     * @param {StatusEffectsManager} [config.statusEffectsManager] - Status effects manager (optional)
     */
    constructor(scene, config = {}) {
        super(scene, config);
        // Apply validation mixin
        Object.assign(this, ManagerValidationMixin);
        // Use DataService if available, fallback to direct cache access
        this.dataService = config.dataService || this.scene.dataService || null;
        this.worldConfig = config.worldConfig || this.dataService?.getWorldConfig() || this.scene.cache.json.get('worldConfig');

        // Combat participants
        this.partyManager = config.partyManager || null;
        this.equipmentManager = config.equipmentManager || null; // Equipment manager for stat calculations
        this.hero = null; // Keep for backward compatibility
        this.enemy = null;

        // Initialize combat subsystems
        this.orchestrator = new CombatOrchestrator(scene, {
            partyManager: this.partyManager,
            damageCalculator: null, // Will be set after damageCalculator is created
            combatAI: null, // Will be set after combatAI is created
            combatVisuals: null, // Will be set after combatVisuals is created
            abilityManager: this.abilityManager,
            statusEffectsManager: this.statusEffectsManager,
            combatSpeed: this.worldConfig?.combat?.baseCombatSpeed || 1000
        });

        this.threatSystem = new ThreatSystem(scene, {
            partyManager: this.partyManager
        });

        // Enemy AI state tracking
        this.enemyCombatStates = new Map(); // Map<enemyId, {phase, adaptationLevel, lastTargetSwitch, lastUsedAbility}>
        this.enemyLastAbilities = new Map(); // Map<enemyId, abilityName> - track last used ability for combos

        // Visual elements
        this.damageNumbers = [];
        this.healthBars = new Map();
        this.manaBar = null;
        this.statusEffectIndicators = new Map();

        // Object pool for damage numbers
        this.damageNumberPool = new ObjectPool(
            () => this.scene.add.text(0, 0, '', {
                font: 'bold 20px Arial',
                fill: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 5, y: 2 }
            }),
            (text) => {
                text.setVisible(false);
                text.setActive(false);
                text.setText('');
                text.setPosition(0, 0);
            },
            10
        );

        // Combat timing
        this.combatSpeed = this.worldConfig.combat.baseCombatSpeed;

        // Ability system (injectable for testing)
        this.abilityManager = config.abilityManager || new AbilityManager(scene);

        // Status effects system (injectable for testing)
        this.statusEffectsManager = config.statusEffectsManager || new StatusEffectsManager(scene);

        // Procedural item generator for mile-based item generation
        this.proceduralItemGenerator = config.proceduralItemGenerator || new ProceduralItemGenerator(scene, {
            itemsData: this.dataService?.getItems() || this.scene.cache.json.get('items')
        });

        // Prestige manager reference (Phase 6: Prestige Integration)
        this.prestigeManager = config.prestigeManager || this.scene.prestigeManager || null;

        // Bloodline manager reference (Phase 10: Bloodline System Integration)
        this.bloodlineManager = config.bloodlineManager || this.scene.bloodlineManager || null;

        // Initialize extracted combat modules (injected via config or created)
        this.damageCalculator = config.damageCalculator || new DamageCalculator(scene, {
            worldConfig: this.worldConfig,
            statusEffectsManager: this.statusEffectsManager
        });

        this.combatAI = config.combatAI || new CombatAI(scene, {
            partyManager: this.partyManager
        });

        this.combatVisuals = config.combatVisuals || new CombatVisuals(scene, {
            partyManager: this.partyManager
        });

        this.threatSystem = config.threatSystem || this.threatSystem || new ThreatSystem(scene, {
            partyManager: this.partyManager
        });

        this.combatOrchestrator = config.combatOrchestrator || this.orchestrator || new CombatOrchestrator(scene, {
            partyManager: this.partyManager,
            damageCalculator: this.damageCalculator,
            combatAI: this.combatAI,
            combatVisuals: this.combatVisuals,
            abilityManager: this.abilityManager,
            statusEffectsManager: this.statusEffectsManager,
            threatSystem: this.threatSystem,
            combatSpeed: this.worldConfig?.combat?.baseCombatSpeed || 1000
        });

        // Initialize new subsystems
        this.combatActions = config.combatActions || new CombatActions(scene, {
            damageCalculator: this.damageCalculator,
            abilityManager: this.abilityManager,
            statusEffectsManager: this.statusEffectsManager,
            combatAI: this.combatAI,
            combatVisuals: this.combatVisuals,
            threatSystem: this.threatSystem,
            partyManager: this.partyManager,
            bloodlineManager: this.bloodlineManager,
            enemyCombatStates: this.enemyCombatStates,
            enemyLastAbilities: this.enemyLastAbilities
        });

        this.combatRewards = config.combatRewards || new CombatRewards(scene, {
            worldConfig: this.worldConfig,
            proceduralItemGenerator: this.proceduralItemGenerator,
            prestigeManager: this.prestigeManager,
            partyManager: this.partyManager,
            hero: this.hero
        });

        this.bossMechanics = config.bossMechanics || new BossMechanics(scene, {
            damageCalculator: this.damageCalculator,
            statusEffectsManager: this.statusEffectsManager,
            combatAI: this.combatAI,
            combatVisuals: this.combatVisuals,
            partyManager: this.partyManager,
            worldManager: this.scene.worldManager,
            threatSystem: this.threatSystem
        });

        // Set damage number pool reference
        this.damageCalculator.setDamageNumberPool(this.damageNumberPool);
        this.combatVisuals.setDamageNumberPool(this.damageNumberPool);

        // Update orchestrator with subsystem references
        if (this.combatOrchestrator) {
            this.combatOrchestrator.damageCalculator = this.damageCalculator;
            this.combatOrchestrator.combatAI = this.combatAI;
            this.combatOrchestrator.combatVisuals = this.combatVisuals;
            this.combatOrchestrator.abilityManager = this.abilityManager;
            this.combatOrchestrator.statusEffectsManager = this.statusEffectsManager;
            this.combatOrchestrator.threatSystem = this.threatSystem;
            this.combatOrchestrator.combatActions = this.combatActions;
            this.combatOrchestrator.bossMechanics = this.bossMechanics;
            this.combatOrchestrator.partyManager = this.partyManager;
            this.combatOrchestrator.eventBus = this.eventBus;
        }

        // Keep backward compatibility reference
        this.orchestrator = this.combatOrchestrator;

        // Listen for equipment changes during combat
        this.setupEquipmentListeners();
    }

    /**
     * Initialize the manager
     * @param {Object} partyManager - PartyManager instance (for backward compatibility)
     * @returns {Promise<void>}
     */
    async init(partyManager = null) {
        await super.init();
        if (partyManager) {
            this.partyManager = partyManager;
            if (this.combatOrchestrator) {
                this.combatOrchestrator.partyManager = partyManager;
            }
            if (this.threatSystem) {
                this.threatSystem.partyManager = partyManager;
            }
        }
        Logger.info('CombatManager', 'Initialized with orchestrator and threat system');
    }

    /**
     * Check if in combat (delegate to orchestrator)
     * @returns {boolean} True if in combat
     */
    isInCombat() {
        return this.combatOrchestrator?.isInCombat() || false;
    }

    // Backward compatibility getters/setters
    get inCombat() {
        return this.combatOrchestrator?.isInCombat() || false;
    }

    get currentCombat() {
        return this.combatOrchestrator?.currentCombat || null;
    }

    set currentCombat(value) {
        // Allow setting for backward compatibility, but sync with orchestrator
        if (this.combatOrchestrator) {
            this.combatOrchestrator.setCurrentCombat(value);
        }
    }

    /**
     * Set up event listeners for equipment changes during combat
     * @private
     */
    setupEquipmentListeners() {
        this.scene.events.on(GameEvents.ITEM.EQUIPMENT_CHANGED, (data) => {
            if (this.inCombat && data.heroId) {
                // Update combat stats when equipment changes
                this.updateCombatStats(data.heroId);
            }
        });
    }

    /**
     * Update combat stats for a hero when equipment changes
     * @param {string} heroId - Hero ID whose equipment changed
     */
    updateCombatStats(heroId) {
        if (!this.inCombat || !this.currentCombat || !this.equipmentManager) return;

        // Check if this is party combat
        const isPartyCombat = this.currentCombat.party && Array.isArray(this.currentCombat.party.heroes);

        if (isPartyCombat) {
            // Update party combat stats
            const heroData = this.currentCombat.party.heroes.find(h => h.id === heroId);
            if (heroData) {
                const equipmentStats = this.equipmentManager.getHeroStats(heroId);
                if (equipmentStats) {
                    heroData.attack = equipmentStats.attack || heroData.attack;
                    heroData.defense = equipmentStats.defense || heroData.defense;
                    heroData.maxHealth = equipmentStats.maxHealth || heroData.maxHealth;
                    // Don't reduce current health if it's higher than new max
                    if (heroData.currentHealth > heroData.maxHealth) {
                        heroData.currentHealth = heroData.maxHealth;
                    }
                }
            }
        } else {
            // Single hero combat
            if (this.hero && this.hero.id === heroId) {
                const equipmentStats = this.equipmentManager.getHeroStats(heroId);
                if (equipmentStats && this.currentCombat.hero) {
                    this.currentCombat.hero.attack = equipmentStats.attack || this.currentCombat.hero.attack;
                    this.currentCombat.hero.defense = equipmentStats.defense || this.currentCombat.hero.defense;
                    this.currentCombat.hero.maxHealth = equipmentStats.maxHealth || this.currentCombat.hero.maxHealth;
                    if (this.currentCombat.hero.currentHealth > this.currentCombat.hero.maxHealth) {
                        this.currentCombat.hero.currentHealth = this.currentCombat.hero.maxHealth;
                    }
                }
            }
        }

        Logger.debug('CombatManager', `Updated combat stats for hero ${heroId}`);
    }

    /**
     * Initialize the CombatManager with a party manager.
     * @param {Object} partyManager - The PartyManager instance to use for combat coordination.
     */
    init(partyManager) {
        this.partyManager = partyManager;
        this.setupEventListeners();

        Logger.info('CombatManager', 'Initialized with party');
    }

    /**
     * Set up global event listeners for the combat system.
     */
    setupEventListeners() {
        // Listen for combat start events
        this.scene.events.on(GameEvents.COMBAT.START, (data) => {
            this.startCombat(data.hero, data.enemy);
        });

        // Listen for party combat start events
        this.scene.events.on('party_combat_start', (data) => {
            this.startPartyCombat(data.partyManager, data.enemy);
        });
    }

    /**
     * Starts a combat session for the entire party against an enemy.
     * Delegates to orchestrator for state management
     * @param {Object} partyManager - The PartyManager instance.
     * @param {Object} enemy - The enemy object (usually from WorldManager).
     * @returns {boolean} - True if combat started successfully, false otherwise.
     */
    startPartyCombat(partyManager, enemy) {
        try {
            // Use ValidationBuilder for clean validation
            if (!this.quickValidate(builder => builder
                .custom(() => {
                    if (!partyManager) {
                        throw new Error('partyManager is required');
                    }
                    if (partyManager.getSize() === 0) {
                        throw new Error('partyManager must have at least one hero');
                    }
                    if (!enemy) {
                        throw new Error('enemy is required');
                    }
                    if (this.combatOrchestrator?.isInCombat()) {
                        throw new Error('Cannot start combat while already in combat');
                    }
                })
                .execute(), 'CombatManager.startPartyCombat', Logger)) {
                return false;
            }

            // Use orchestrator to start party combat
            if (!this.combatOrchestrator?.startPartyCombat(partyManager, enemy)) {
                return false;
            }

            // Use primary hero (tank) for now, but track whole party
            const primaryHero = partyManager.getTank() || partyManager.getHeroByIndex(0);
            this.partyManager = partyManager;
            this.enemy = enemy;
            this.currentEnemy = enemy; // Ensure currentEnemy is set for integration tests

            // Initialize threat table for this enemy (use threatSystem)
            this.threatSystem.initializeEnemyThreat(enemy);
            // Also initialize in combatAI for backward compatibility
            if (this.combatAI) {
                this.combatAI.initializeEnemyThreat(enemy);
            }

            // Initialize enemy animations
            // Skip animation initialization for enemies - they use static sprites
            // Enemies don't need complex animations like heroes do
            if (enemy && enemy.sprite && enemy.sprite.anims) {
                // Just set a basic frame if the sprite exists
                // Enemy animations are handled differently than hero animations
                Logger.debug('CombatManager', `Enemy ${enemy.data?.id || 'unknown'} using static sprite (no animation initialization)`);
            }

            // Initialize combat with all party members
            this.initializePartyCombatState(partyManager, enemy);
            this.setupCombatVisuals();

            // CRITICAL FIX: Schedule camera reposition after heroes have been positioned
            // Heroes are positioned in the update loop, so we need to wait for that to happen
            this._combatCameraRepositionPending = true;
            // Store timestamp - will be compared against update() time parameter
            this._combatStartTime = Date.now();

            this.scheduleNextCombatAction();

            this.scene.events.emit(GameEvents.COMBAT.STARTED, {
                party: partyManager.getHeroes(),
                enemy: enemy
            });

            Logger.info('CombatManager', `Party combat started: ${partyManager.getSize()} heroes vs ${enemy.data.id}`);
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'CombatManager.startPartyCombat', 'error');
            return false;
        }
    }

    /**
     * Initializes the combat state for a party encounter.
     * Sets up hero and enemy data, calculates enhanced stats from equipment, and initializes threat tables.
     * @param {Object} partyManager - The PartyManager instance.
     * @param {Object} enemy - The enemy object.
     */
    initializePartyCombatState(partyManager, enemy) {
        if (!partyManager) {
            Logger.error('CombatManager', 'PartyManager is null in initializePartyCombatState');
            return;
        }

        const heroes = partyManager.getHeroes() || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            Logger.error('CombatManager', 'No heroes in party for combat');
            return;
        }

        const tankHero = partyManager.getTank() || heroes[0];

        // Track party combat state with equipment-enhanced stats
        this.currentCombat = {
            party: {
                heroes: heroes.map(hero => {
                    // Get equipment-enhanced stats if available
                    let heroStats = hero.currentStats || hero.baseStats || {};
                    if (this.equipmentManager && hero.id) {
                        const equipmentStats = this.equipmentManager.getHeroStats(hero.id);
                        if (equipmentStats) {
                            heroStats = equipmentStats;
                        }
                    }

                    // Ensure health is properly initialized (must be > 0)
                    const maxHealth = heroStats.maxHealth || hero.baseStats?.maxHealth || 100;
                    let currentHealth = heroStats.health || heroStats.currentHealth || hero.currentStats?.health;

                    // If health is 0 or undefined, set to maxHealth
                    if (!currentHealth || currentHealth <= 0) {
                        currentHealth = maxHealth;
                        // Also update the hero's currentStats if available
                        if (hero.currentStats) {
                            hero.currentStats.health = maxHealth;
                            hero.currentStats.maxHealth = maxHealth;
                        }
                    }
                    // Ensure current health doesn't exceed max health
                    currentHealth = Math.min(currentHealth, maxHealth);

                    return {
                        id: hero.id,
                        classId: hero.classId,
                        spec: hero.specId || hero.spec,
                        role: hero.role || 'dps', // Include role for threat calculations
                        maxHealth: maxHealth,
                        currentHealth: currentHealth,
                        attack: heroStats.attack || 10,
                        defense: heroStats.defense || 5,
                        threat: 0
                    };
                }),
                totalHealth: Array.isArray(heroes) ? heroes.reduce((sum, h) => {
                    if (!h) return sum;
                    let heroStats = h.currentStats || h.baseStats || {};
                    if (this.equipmentManager && h.id) {
                        const equipmentStats = this.equipmentManager.getHeroStats(h.id);
                        if (equipmentStats) {
                            heroStats = equipmentStats;
                        }
                    }
                    return sum + (heroStats.maxHealth || 100);
                }, 0) : 0
            },
            enemy: {
                maxHealth: enemy.data?.stats?.health || enemy.data?.stats?.maxHealth || 100,
                currentHealth: enemy.data?.currentHealth || enemy.data?.stats?.health || 100,
                attack: enemy.data?.stats?.attack || 10,
                defense: enemy.data?.stats?.defense || 5,
                threat: {}  // Track threat per hero
            },
            turn: 'party',
            round: 1,
            startTime: Date.now(),
            primaryTarget: tankHero  // Tank acts as primary damage recipient
        };

        // Initialize enemy combat state
        const enemyId = enemy.data?.id || enemy.id;
        if (!this.enemyCombatStates.has(enemyId)) {
            this.enemyCombatStates.set(enemyId, {
                phase: 'normal',
                adaptationLevel: 0,
                lastTargetSwitch: 0,
                startTime: Date.now()
            });
        }

        // Initialize threat values for each hero (use threatSystem)
        if (Array.isArray(heroes)) {
            heroes.forEach(hero => {
                if (hero && hero.id) {
                    this.currentCombat.enemy.threat[hero.id] = 0;
                    // Also initialize in threatSystem
                    this.threatSystem.setThreat(enemyId, hero.id, 0);
                }
            });
        }
    }

    /**
     * Gets the current threat level for a specific hero against a specific enemy.
     * Delegates to threatSystem
     * @param {string} enemyId - The ID of the enemy.
     * @param {string} heroId - The ID of the hero.
     * @returns {number} - The current threat level.
     */
    getThreat(enemyId, heroId) {
        return this.threatSystem.getThreat(enemyId, heroId);
    }

    /**
     * Increases the threat level for a hero against an enemy.
     * Delegates to threatSystem
     * Usually called when a hero deals damage or generates threat through abilities.
     * @param {string} enemyId - The ID of the enemy.
     * @param {string} heroId - The ID of the hero.
     * @param {number} [threat=0] - The amount of threat to add.
     * @param {number} [multiplier=1.0] - A multiplier to apply to the added threat (e.g., 2.0 for tanks).
     */
    addThreat(enemyId, heroId, threat = 0, multiplier = 1.0) {
        const finalThreat = Math.floor(threat * multiplier);
        this.threatSystem.addThreat(enemyId, heroId, finalThreat);
    }

    /**
     * Reduces the threat level for a hero against an enemy.
     * Used for threat-drop or "vanish" style abilities.
     * @param {string} enemyId - The ID of the enemy.
     * @param {string} heroId - The ID of the hero.
     * @param {number} [amount=0] - The amount to reduce.
     * @param {boolean} [isPercentage=false] - Whether the amount is a percentage (0-1) or a flat value.
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
     * Applies threat decay to a hero's threat against an enemy.
     * This is used to slowly lower threat over time.
     * @param {string} enemyId - The ID of the enemy.
     * @param {string} heroId - The ID of the hero.
     * @param {number} [decayRate=0.05] - The percentage of threat to lose per second (0.05 = 5%).
     */
    applyThreatDecay(enemyId, heroId, decayRate = 0.05) {
        if (!this.threatTable.has(enemyId)) return;

        const currentThreat = this.threatTable.get(enemyId).get(heroId) || 0;
        if (currentThreat <= 0) return;

        // Apply decay (reduces threat by decayRate per second)
        // Assuming ~60 updates per second, decay per frame = decayRate / 60
        const frameDecay = decayRate / 60;
        const newThreat = Math.max(0, Math.floor(currentThreat * (1 - frameDecay)));
        this.threatTable.get(enemyId).set(heroId, newThreat);
    }

    /**
     * Wipes the entire threat table for a specific enemy.
     * Useful for boss phase transitions or reset mechanics.
     * @param {string} enemyId - The ID of the enemy.
     */
    wipeThreatTable(enemyId) {
        if (!this.threatTable.has(enemyId)) return;

        // Clear all threat for this enemy
        this.threatTable.get(enemyId).clear();

        Logger.debug('CombatManager', `Threat table wiped for enemy ${enemyId}`);
    }

    /**
     * Selects which hero the enemy should target based on their AI strategy and the current threat table.
     * @param {string} enemyId - The ID of the enemy.
     * @param {string} [targetingStrategy=null] - An optional override for the targeting strategy.
     * @returns {string|null} - The ID of the hero to target, or null if no valid target is found.
     */
    selectEnemyTarget(enemyId, targetingStrategy = null) {
        // Check if enemy is enraged (ignores threat table)
        const combatState = this.enemyCombatStates.get(enemyId);
        if (combatState?.ignoreThreat || combatState?.enraged) {
            // Enraged enemies ignore threat and target randomly
            return this.selectRandomTarget(enemyId);
        }

        // Get enemy personality/strategy from enemy data
        const strategy = targetingStrategy || this.enemy?.data?.aiStrategy || 'defensive';

        switch (strategy) {
            case 'aggressive':
                return this.selectLowHealthTarget(enemyId);
            case 'tactical':
                return this.selectPriorityTarget(enemyId, ['healer', 'dps', 'tank']);
            case 'defensive':
                return this.selectHighestThreat(enemyId); // Current behavior
            case 'boss':
                return this.selectBossTarget(enemyId);
            default:
                return this.selectHighestThreat(enemyId);
        }
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
        let targetHero = null;

        this.threatTable.get(enemyId).forEach((threat, heroId) => {
            if (threat > maxThreat) {
                maxThreat = threat;
                targetHero = heroId;
            }
        });

        return targetHero;
    }

    /**
     * Select hero with lowest health percentage
     * @param {string} enemyId - Enemy ID
     * @returns {string|null} Hero ID with lowest health
     */
    selectLowHealthTarget(enemyId) {
        if (!this.partyManager || !this.currentCombat?.party?.heroes) {
            return this.selectHighestThreat(enemyId); // Fallback
        }

        const heroes = this.currentCombat.party.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            return this.selectHighestThreat(enemyId);
        }

        let lowestHealthPercent = 1.0;
        let targetHeroId = null;

        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return; // Skip dead heroes

            const healthPercent = heroData.currentHealth / heroData.maxHealth;
            if (healthPercent < lowestHealthPercent) {
                lowestHealthPercent = healthPercent;
                targetHeroId = heroData.id;
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
        if (!this.partyManager || !this.currentCombat?.party?.heroes) {
            return this.selectHighestThreat(enemyId); // Fallback
        }

        const heroes = this.currentCombat.party.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            return this.selectHighestThreat(enemyId);
        }

        // Find heroes by role priority
        for (const role of priorityOrder) {
            const heroWithRole = heroes.find(heroData => {
                if (heroData.currentHealth <= 0) return false;
                const hero = this.partyManager.getHeroById(heroData.id);
                return hero && (hero.role || heroData.role) === role;
            });

            if (heroWithRole) {
                return heroWithRole.id;
            }
        }

        // Fallback to highest threat if no priority target found
        return this.selectHighestThreat(enemyId);
    }

    /**
     * Select random target (for enrage/chaos mode)
     * @param {string} enemyId - Enemy ID
     * @returns {string|null} Random hero ID
     */
    selectRandomTarget(enemyId) {
        if (!this.partyManager || !this.currentCombat?.party?.heroes) {
            return this.selectHighestThreat(enemyId); // Fallback
        }

        const heroes = this.currentCombat.party.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            return null;
        }

        const aliveHeroes = heroes.filter(h => h.currentHealth > 0);
        if (aliveHeroes.length === 0) return null;

        const randomHero = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
        return randomHero.id;
    }

    /**
     * Select boss target based on phase
     * @param {string} enemyId - Enemy ID
     * @returns {string|null} Hero ID to target
     */
    selectBossTarget(enemyId) {
        if (!this.enemy) return this.selectHighestThreat(enemyId);

        const phase = this.getBossPhase(this.enemy);
        switch (phase) {
            case 'phase1':
                return this.selectHighestThreat(enemyId); // Focus tank
            case 'phase2':
                return this.selectPriorityTarget(enemyId, ['healer', 'dps']); // Target backline
            case 'phase3':
                return this.selectLowHealthTarget(enemyId); // Finish off weak
            case 'enrage':
                return this.selectRandomTarget(enemyId); // Chaos mode
            default:
                return this.selectHighestThreat(enemyId);
        }
    }

    /**
     * Evaluate target value for a given strategy
     * @param {Object} hero - Hero object
     * @param {string} enemyId - Enemy ID
     * @param {string} strategy - Targeting strategy
     * @returns {number} Target value score
     */
    evaluateTargetValue(hero, enemyId, strategy) {
        if (!hero || !this.currentCombat?.party?.heroes) return 0;

        const heroData = this.currentCombat.party.heroes.find(h => h.id === hero.id);
        if (!heroData || heroData.currentHealth <= 0) return 0;

        let score = 0;

        switch (strategy) {
            case 'aggressive': {
                // Prefer low health targets
                const healthPercent = heroData.currentHealth / heroData.maxHealth;
                score = (1 - healthPercent) * 100; // Lower health = higher score
                break;
            }
            case 'tactical': {
                // Prefer healers, then DPS
                const role = hero.role || heroData.role || 'dps';
                if (role === 'healer') score = 100;
                else if (role === 'dps') score = 50;
                else score = 10;
                break;
            }
            case 'defensive': {
                // Use threat value
                const threat = this.threatTable.get(enemyId)?.get(hero.id) || 0;
                score = threat;
                break;
            }
            default:
                score = 50;
        }

        return score;
    }

    /**
     * Start combat between hero and enemy
     * @param {Object} hero - Hero character
     * @param {Object} enemy - Enemy character
     */
    /**
     * Start combat between hero and enemy
     * Delegates to orchestrator for state management
     * @param {Object} hero - Hero character
     * @param {Object} enemy - Enemy character
     * @returns {boolean} True if combat started successfully
     */
    startCombat(hero, enemy) {
        try {
            if (!this.validateCombatStart(hero, enemy)) {
                return false;
            }

            // Use orchestrator to start combat
            if (!this.combatOrchestrator?.startCombat(hero, enemy)) {
                return false;
            }

            this.hero = hero;
            this.enemy = enemy;

            this.initializeCombatState(hero, enemy);
            this.setupCombatVisuals();
            this.scheduleNextCombatAction();

            this.scene.events.emit(GameEvents.COMBAT.STARTED, {
                hero: this.hero,
                enemy: this.enemy
            });

            Logger.info('CombatManager', `Combat started: Paladin vs ${this.enemy.data.id}`);
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'CombatManager.startCombat', 'error');
            return false;
        }
    }

    /**
     * Validate that combat can start
     * @param {Object} hero - Hero character
     * @param {Object} enemy - Enemy character
     * @returns {boolean} True if combat can start
     */
    validateCombatStart(hero, enemy) {
        if (this.inCombat) {
            Logger.warn('CombatManager', 'Attempted to start combat while already in combat');
            return false;
        }

        // Use ValidationBuilder for clean, data-driven validation (Refactored)
        // Support both old structure (hero.data.stats) and new structure (hero.currentStats/hero.baseStats)
        return this.quickValidate(builder => builder
            .custom(() => {
                if (!hero) throw new Error('Hero is null or undefined');
                // Check for new structure (currentStats/baseStats) or old structure (data.stats)
                const hasNewStructure = hero.currentStats || hero.baseStats;
                const hasOldStructure = hero.data && hero.data.stats;
                // Also check if hero has id and basic properties (might be a valid hero object)
                const hasBasicProperties = hero.id && (hero.name || hero.classId);
                
                if (!hasNewStructure && !hasOldStructure && !hasBasicProperties) {
                    // If hero has basic properties but no stats, try to initialize stats from partyManager
                    if (hero.id && this.partyManager) {
                        const partyHero = this.partyManager.getHeroById(hero.id);
                        if (partyHero && (partyHero.currentStats || partyHero.baseStats)) {
                            // Copy stats from party hero
                            hero.currentStats = partyHero.currentStats || partyHero.baseStats;
                            hero.baseStats = partyHero.baseStats || partyHero.currentStats;
                            Logger.debug('CombatManager', `Initialized hero stats from party for ${hero.id}`);
                            return; // Stats now available
                        }
                    }
                    throw new Error('Hero missing data or stats (expected currentStats/baseStats or data.stats)');
                }
            })
            .validateEnemy(enemy)
            .execute(), 'CombatManager.validateCombatStart', Logger);
    }

    /**
     * Initialize combat state
     * @param {Object} hero - Hero character
     * @param {Object} enemy - Enemy character
     */
    initializeCombatState(hero, enemy) {
        this.inCombat = true;
        this.hero = hero;
        this.enemy = enemy;

        // Get equipment-enhanced stats if equipment manager is available
        // Support both old structure (hero.data.stats) and new structure (hero.currentStats/hero.baseStats)
        let heroStats = hero.currentStats || hero.baseStats || hero.data?.stats || {};
        if (this.equipmentManager && hero.id) {
            const equipmentStats = this.equipmentManager.getHeroStats(hero.id);
            if (equipmentStats) {
                heroStats = { ...equipmentStats };
            }
        }

        // Get base defense (before defensive buff)
        let baseDefense = heroStats.defense || hero.currentStats?.defense || hero.baseStats?.defense || hero.data?.stats?.defense || 5;

        // Check if defensive buff is active and apply it
        // Note: Defensive buff will be applied by AbilityManager when ability is used
        // This is just for initial combat state if buff was already active
        // Support both old structure (hero.data.abilities) and new structure (hero.abilities)
        const heroAbilities = hero.abilities || hero.data?.abilities;
        if (heroAbilities && heroAbilities.defensive && heroAbilities.defensive.active) {
            const defenseBonus = Math.floor(baseDefense * heroAbilities.defensive.defenseBonus);
            baseDefense += defenseBonus;
        }

        // Initialize enemy ability cooldowns
        if (this.enemy.data && this.enemy.data.abilities && Array.isArray(this.enemy.data.abilities)) {
            this.enemy.data.abilityCooldowns = {};
            this.enemy.data.abilities.forEach(ability => {
                if (ability && ability.name) {
                    this.enemy.data.abilityCooldowns[ability.name] = 0;
                }
            });
        }

        // Ensure enemy has currentHealth
        if (!this.enemy.data.currentHealth) {
            this.enemy.data.currentHealth = this.enemy.data.stats?.health || this.enemy.data.stats?.maxHealth || 100;
        }

        // Create combat state with equipment-enhanced stats
        // Support both old structure (hero.data.stats) and new structure (hero.currentStats/hero.baseStats)
        const combatState = {
            hero: {
                maxHealth: heroStats.maxHealth || hero.currentStats?.maxHealth || hero.baseStats?.maxHealth || hero.data?.stats?.maxHealth || 100,
                currentHealth: heroStats.health || heroStats.currentHealth || hero.currentStats?.health || hero.baseStats?.health || hero.data?.stats?.health || 100,
                attack: heroStats.attack || hero.currentStats?.attack || hero.baseStats?.attack || hero.data?.stats?.attack || 10,
                defense: baseDefense
            },
            enemy: {
                maxHealth: this.enemy.data.stats?.health || this.enemy.data.stats?.maxHealth || this.enemy.data.currentHealth || 100,
                currentHealth: this.enemy.data.currentHealth,
                attack: this.enemy.data.stats?.attack || 10,
                defense: this.enemy.data.stats?.defense || 5
            },
            turn: 'hero',
            round: 1,
            startTime: Date.now(),
            phase: 'normal' // For boss phases
        };
        this.currentCombat = combatState; // This will sync with orchestrator via setter

        // Stop hero movement
        if (this.hero.body) {
            this.hero.body.setVelocityX(0);
        }

        // Stop all party member movement
        if (this.partyManager) {
            const heroes = this.partyManager.getHeroes() || [];
            if (Array.isArray(heroes)) {
            heroes.forEach(hero => {
                if (hero && hero.sprite && hero.sprite.body) {
                    hero.sprite.body.setVelocityX(0);
                }
            });
            }
        }

        // Stop enemy movement
        if (this.enemy.sprite && this.enemy.sprite.body) {
            this.enemy.sprite.body.setVelocityX(0);
        }
    }

    /**
     * Create visual elements for combat
     */
    /**
     * Setup combat visuals (wrapper for createCombatVisuals)
     */
    setupCombatVisuals() {
        this.combatVisuals.createCombatVisuals(this.enemy, this.hero, this.currentCombat);
    }

    createCombatVisuals() {
        if (!this.enemy) return;

        // For party combat, use primary hero (tank) or first hero
        let primaryHero = null;
        if (this.partyManager && typeof this.partyManager.getTank === 'function') {
            primaryHero = this.partyManager.getTank() || this.partyManager.getHeroByIndex(0);
        } else if (this.partyManager && typeof this.partyManager.getHeroByIndex === 'function') {
            primaryHero = this.partyManager.getHeroByIndex(0);
        }

        if (!primaryHero && !this.hero) return;

        const hero = primaryHero?.sprite || this.hero;
        const heroData = this.currentCombat?.hero || primaryHero?.data || this.hero?.data;
        const enemyData = this.currentCombat?.enemy || this.enemy?.data;

        if (!hero || !enemyData) return;

        // Create health bars
        if (hero) {
            this.createHealthBar(hero, heroData, 'hero');
        }
        if (this.enemy.sprite) {
            this.createHealthBar(this.enemy.sprite, enemyData, 'enemy');
        }

        // Create mana bar for primary hero
        if (hero) {
            this.createManaBar(hero);
        }

        // Initialize status effect indicators
        this.combatVisuals.updateStatusEffectIndicators();

        Logger.debug('CombatManager', 'Created combat visuals');
    }

    /**
     * Update status effect visual indicators
     */
    updateStatusEffectIndicators() {
        if (!this.inCombat) return;

        // Update hero status effects
        this.updateCombatantStatusEffects(this.hero, 'hero');

        // Update enemy status effects
        this.updateCombatantStatusEffects(this.enemy, 'enemy');
    }

    /**
     * Update status effect indicators for a combatant
     * @param {Object} combatant - Hero or enemy
     * @param {string} type - 'hero' or 'enemy'
     */
    updateCombatantStatusEffects(combatant, type) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) return;

        const key = `${type}_effects`;
        const existingIndicators = this.statusEffectIndicators.get(key) || [];

        // Remove old indicators
        existingIndicators.forEach(indicator => {
            if (indicator.text) indicator.text.destroy();
            if (indicator.icon) indicator.icon.destroy();
        });
        existingIndicators.length = 0;

        // Create new indicators
        const effects = combatant.data.statusEffects || {};
        const effectCount = Object.keys(effects).length;
        if (effectCount === 0) {
            this.statusEffectIndicators.set(key, []);
            return;
        }

        const baseY = type === 'hero' ? (this.hero?.y || 0) - 60 : (this.enemy?.sprite?.y || this.enemy?.y || 0) - 60;
        const combatantX = combatant?.sprite?.x || combatant?.x || 0;
        const startX = combatantX - (effectCount * 15) / 2;

        let index = 0;
        for (const [effectType, effectData] of Object.entries(effects)) {
            if (effectData.turnsRemaining < 0) continue;

            const effectDef = this.statusEffectsManager.getEffectDefinition(effectType);
            if (!effectDef) continue;

            const x = startX + (index * 15);

            // Create icon text
            const icon = this.scene.add.text(x, baseY, effectDef.icon || '?', {
                font: '14px Arial',
                fill: effectDef.color || '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            });
            icon.setOrigin(0.5);

            // Create turn counter
            const turnsText = this.scene.add.text(x, baseY + 12, `${effectData.turnsRemaining || ''}`, {
                font: '10px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            });
            turnsText.setOrigin(0.5);

            existingIndicators.push({ icon, text: turnsText, effectType });
            index++;
        }

        this.statusEffectIndicators.set(key, existingIndicators);
    }

    /**
     * Create a health bar for a combatant
     * @param {Object} combatant - Hero or enemy
     * @param {Object} data - Combatant stats
     * @param {string} type - 'hero' or 'enemy'
     */
    createHealthBar(combatant, data, type) {
        const width = 60;
        const height = 8;
        const combatantX = combatant?.sprite?.x || combatant?.x || 0;
        const combatantY = combatant?.sprite?.y || combatant?.y || 0;
        const y = combatantY - 40;

        // Background
        const bg = this.scene.add.rectangle(combatantX, y, width, height, 0x000000, 0.8);

        // Health bar
        const healthPercent = data.currentHealth / data.maxHealth;
        const healthWidth = (width - 4) * healthPercent;

        const healthBar = this.scene.add.rectangle(
            combatantX - width / 2 + 2,
            y,
            healthWidth,
            height,
            type === 'hero' ? 0x00ff00 : 0xff0000
        );

        // Border
        const border = this.scene.add.rectangle(
            combatantX - width / 2 + 2,
            y,
            width,
            height,
            0x000000,
            0
        ).setStrokeStyle(2, 0x333333);

        // Store reference for updates
        this.healthBars.set(type, { bg, healthBar, border, combatant });
    }

    /**
     * Create mana bar for hero
     * @param {Object} hero - Hero character
     */
    createManaBar(hero) {
        if (!hero || !hero.data) return;

        const width = 60;
        const height = 6;
        const y = hero.y - 50; // Below health bar

        // Background
        const bg = this.scene.add.rectangle(hero.x, y, width, height, 0x000000, 0.8);

        // Mana bar
        const manaPercent = (hero.data.mana || 0) / (hero.data.maxMana || 100);
        const manaWidth = (width - 4) * manaPercent;

        const manaBar = this.scene.add.rectangle(
            hero.x - width / 2 + 2,
            y,
            manaWidth,
            height,
            0x0088ff
        );

        // Border
        const border = this.scene.add.rectangle(
            hero.x - width / 2 + 2,
            y,
            width,
            height,
            0x000000,
            0
        ).setStrokeStyle(2, 0x333333);

        // Store reference
        this.manaBar = { bg, manaBar, border, hero };
    }

    /**
     * Update mana bar
     */
    updateManaBar() {
        if (!this.manaBar || !this.hero || !this.hero.data) return;

        const mana = this.hero.data.mana || 0;
        const maxMana = this.hero.data.maxMana || 100;
        const manaPercent = Math.max(0, Math.min(1, mana / maxMana));

        // Update mana bar width
        const newWidth = (60 - 4) * manaPercent;
        this.manaBar.manaBar.width = newWidth;

        // Update position to keep centered
        this.manaBar.manaBar.x = this.hero.x - 30 + 2;
    }

    /**
     * Update health bars during combat
     */
    /**
     * Update health bars for all combatants
     */
    updateHealthBars() {
        if (!this.inCombat || !this.currentCombat) return;

        // Delegate to combatVisuals
        if (this.combatVisuals) {
            this.combatVisuals.updateHealthBars();
        }

        // Also update internal trackers if still used
        this.updateHealthBar('hero');
        this.updateHealthBar('enemy');
    }

    /**
     * Update individual health bar
     * @param {string} type - 'hero' or 'enemy'
     */
    updateHealthBar(type) {
        // Delegate to combatVisuals
        if (this.combatVisuals) {
            this.combatVisuals.updateHealthBars(type);
        }

        const elements = this.healthBars.get(type);
        if (!elements) return;

        // Check if this is party combat and type is 'hero'
        const isPartyCombat = this.currentCombat?.party && Array.isArray(this.currentCombat.party.heroes);
        if (isPartyCombat && type === 'hero') {
            // Party combat: hero health bars are handled by GameScene
            return;
        }

        const data = type === 'hero' ? this.currentCombat?.hero : this.currentCombat?.enemy;
        if (!data) return;

        const healthPercent = Math.max(0, data.currentHealth / data.maxHealth);

        // Update health bar width
        const width = 60; // Match createHealthBar in this file
        const newWidth = (width - 4) * healthPercent;
        elements.healthBar.width = newWidth;

        // Remove health bar at 0 health
        if (data.currentHealth <= 0) {
            elements.healthBar.visible = false;
            if (elements.border) elements.border.visible = false;
        }
    }

    /**
     * Schedule next combat action
     * Delegates to CombatOrchestrator which handles turn execution via CombatActions
     */
    scheduleNextCombatAction() {
        if (!this.combatOrchestrator || !this.inCombat) return;
        
        // Sync current combat state with orchestrator
        if (this.currentCombat) {
            this.combatOrchestrator.setCurrentCombat(this.currentCombat);
        }
        
        // Delegate to orchestrator
        this.combatOrchestrator.scheduleNextCombatAction();
        
        // Adapt enemy strategy after turn (if needed)
        if (this.enemy && this.currentCombat && this.currentCombat.turn === 'enemy' && this.adaptEnemyStrategy) {
            this.adaptEnemyStrategy(this.enemy);
        }
    }

    /**
     * Executes a combat action for the primary hero.
     * Delegates to CombatActions subsystem.
     */
    executeHeroAbility() {
        if (!this.combatActions || !this.inCombat || !this.enemy || !this.hero) return;
        this.combatActions.executeHeroTurn(this.hero, this.currentCombat, this.enemy);
    }

    /**
     * Executes a basic auto-attack from the primary hero to the current enemy.
     * Delegates to CombatActions subsystem.
     */
    executeAutoAttack() {
        if (!this.combatActions || !this.inCombat || !this.enemy || !this.hero) return;
        this.combatActions.executeAutoAttack(this.hero, this.currentCombat, this.enemy);
    }

    /**
     * Executes a coordinated party attack where each hero uses an appropriate ability based on their role.
     * Delegates to CombatActions subsystem.
     */
    executePartyAttack() {
        if (!this.combatActions || !this.inCombat || !this.enemy || !this.partyManager || !this.currentCombat.party) return;
        this.combatActions.executePartyTurn(this.partyManager, this.currentCombat, this.enemy);
    }

    /**
     * Execute defensive ability
     * Delegates to CombatActions subsystem.
     * @param {Object} abilityResult - Ability result from AbilityManager
     */
    executeDefensiveAbility(abilityResult) {
        if (!this.combatActions || !this.hero) return;
        this.combatActions.executeDefensiveAbility(abilityResult, this.hero, this.currentCombat, this.enemy);
    }

    /**
     * Execute heal ability
     * Delegates to CombatActions subsystem.
     * @param {Object} abilityResult - Ability result from AbilityManager
     */
    executeHealAbility(abilityResult) {
        if (!this.combatActions || !this.hero) return;
        this.combatActions.executeHealAbility(abilityResult, this.hero, this.currentCombat, this.enemy);
    }

    /**
     * Execute enemy attack (may use abilities)
     */
    /**
     * Executes the enemy's attack turn.
     * Handles incapacitation checks, casting state, enrage conditions, boss mechanics, and target selection.
     */
    executeEnemyAttack() {
        if (!this.combatActions || !this.inCombat || !this.enemy) return;

        // Check for boss special mechanics before delegating
        if (this.enemy.data?.type === 'boss' && this.enemy.data?.bossMechanics?.specialAbilities && this.bossMechanics) {
            const phase = this.bossMechanics.getBossPhase(this.enemy, this.currentCombat);
            const specialAbilities = this.enemy.data.bossMechanics.specialAbilities;

            // Random chance to use special mechanic (10% per turn)
            if (Math.random() < 0.1 && specialAbilities.length > 0) {
                const mechanic = specialAbilities[Math.floor(Math.random() * specialAbilities.length)];
                this.bossMechanics.executeMechanic(this.enemy, mechanic, this.currentCombat, this.partyManager);
                // Adds attack even if boss uses special
                this.combatActions.executeAddsAttack(this.currentCombat, this.partyManager);
                return; // Special mechanic replaces normal attack
            }
        }

        // Check for enrage condition
        if (this.checkEnrageCondition && this.checkEnrageCondition(this.enemy)) {
            this.triggerEnrage(this.enemy);
        }

        // Delegate to CombatActions
        this.combatActions.executeEnemyTurn(this.enemy, this.currentCombat, this.partyManager);
    }

    /**
     * Execute attacks for all active adds in combat
     */
    executeAddsAttack() {
        if (!this.currentCombat.adds || this.currentCombat.adds.length === 0) return;

        this.currentCombat.adds.forEach(add => {
            if (add.currentHealth <= 0) return;

            // Check if add is incapacitated
            if (this.combatAI && this.combatAI.isIncapacitated(add.instance)) {
                Logger.debug('CombatManager', `Add ${add.id} is incapacitated`);
                return;
            }

            // Adds target via threat as well
            const targetHeroId = this.combatAI.selectTarget(add.id, add.instance);
            const targetHero = targetHeroId ? this.partyManager.getHeroById(targetHeroId) : this.partyManager.getTank();

            if (targetHero) {
                const heroData = this.currentCombat.party?.heroes?.find(h => h.id === targetHero.id);
                if (heroData && heroData.currentHealth > 0) {
                    const damage = this.damageCalculator.calculateDamage(
                        add.attack,
                        heroData.defense,
                        add.instance,
                        targetHero
                    );

                    heroData.currentHealth = Math.max(0, heroData.currentHealth - damage);
                    
                    const heroX = targetHero.sprite?.x || targetHero.x || 0;
                    const heroY = targetHero.sprite?.y || targetHero.y || 0;
                    this.damageCalculator.showDamageNumber(heroX, heroY - 50, damage);
                    
                    Logger.debug('CombatManager', `Add ${add.id} attacks ${targetHero.id} for ${damage} damage`);
                }
            }
        });

        this.updateHealthBars();
    }

    /**
     * Get tactical multipliers based on current combat stance
     * @param {string} role - Hero role ('tank', 'healer', 'dps')
     * @returns {Object} - Multipliers for damage, defense, and threat
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
            // Defensive stance reduces threat for everyone except the tank
            multipliers.threat = (role === 'tank') ? 1.10 : 0.80;
        }

        return multipliers;
    }

    /**
     * Execute enemy attack on a specific hero (for party combat)
     * @param {Object} targetHero - Hero to attack
     */
    executeEnemyAttackOnHero(targetHero) {
        if (!targetHero || !this.currentCombat) return;

        // Find hero data in combat state
        const heroData = this.currentCombat.party?.heroes?.find(h => h.id === targetHero.id);
        if (!heroData || heroData.currentHealth <= 0) return;

        // Apply tactical multipliers
        const heroRole = targetHero.role || heroData.role || 'dps';
        const tacticalMultipliers = this.getTacticalMultipliers(heroRole);
        const effectiveDefense = Math.floor(heroData.defense * tacticalMultipliers.defense);

        // Calculate base damage
        let damage = this.damageCalculator.calculateDamage(
            this.currentCombat.enemy.attack,
            effectiveDefense,
            this.enemy,
            targetHero
        );

        // Apply bloodline effects on damage taken (Phase 10: Bloodline System Integration)
        if (this.bloodlineManager) {
            const bloodlineResult = this.bloodlineManager.onHeroDamageTaken(targetHero, damage, this.enemy);
            damage = bloodlineResult.damage;

            // Apply special effects (like Divine Protection shield)
            if (bloodlineResult.effects && bloodlineResult.effects.length > 0) {
                bloodlineResult.effects.forEach(effect => {
                    if (effect.type === 'shield') {
                        // Create a shield that absorbs damage
                        const shieldAmount = Math.min(damage, effect.amount);
                        damage -= shieldAmount;
                        this.showBloodlineEffect(targetHero, `${effect.description} (+${shieldAmount} absorbed)`, '#ffff00');
                    } else if (effect.type === 'teleport') {
                        // Emergency teleport
                        if (targetHero.sprite) {
                            targetHero.sprite.x += effect.distance;
                            this.showBloodlineEffect(targetHero, effect.description, '#800080');
                        }
                        // Heal to 1 HP is handled by bloodline manager
                    }
                });
            }
        }

        // Apply damage to hero in combat state
        heroData.currentHealth -= damage;
        heroData.currentHealth = Math.max(0, heroData.currentHealth);

        // Update health bars
        this.updateHealthBars();

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
        this.damageCalculator.showDamageNumber(heroX, heroY - 50, damage);

        Logger.debug('CombatManager', `Enemy attacks ${targetHero.id} for ${damage} damage`);
    }

    /**
     * Select and execute an enemy ability
     * @returns {Object|null} - Ability result or null
     */
    /**
     * Selects and executes an enemy ability based on tactical evaluation.
     * @returns {Object} Object indicating if an ability was used and the result
     */
    selectAndExecuteEnemyAbility() {
        if (!this.enemy || !this.enemy.data || !this.inCombat) return null;

        const enemyData = this.enemy.data;
        const abilities = Array.isArray(enemyData.abilities) ? enemyData.abilities : [];
        if (abilities.length === 0) return null;

        // Initialize ability cooldowns if needed
        if (!this.enemy.data.abilityCooldowns) {
            this.enemy.data.abilityCooldowns = {};
        }

        const cooldowns = this.enemy.data.abilityCooldowns;
        const enemyId = this.enemy.data?.id || this.enemy.id;
        const enemyHealthPercent = this.currentCombat.enemy.currentHealth / this.currentCombat.enemy.maxHealth;

        // Filter available abilities (off cooldown and matching conditions)
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
        const combatState = this.evaluateCombatState();

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
            return this.startEnemyCast(selected.ability);
        }

        return this.executeEnemyAbility(selected.ability);
    }

    /**
     * Start enemy cast time
     * @param {Object} ability - Ability to cast
     * @returns {Object} - Casting status
     */
    startEnemyCast(ability) {
        this.enemy.isCasting = true;
        this.enemy.castingAbility = ability;
        this.enemy.castRoundsRemaining = ability.castTime;

        const enemyX = this.enemy?.sprite?.x || this.enemy?.x || 0;
        const enemyY = this.enemy?.sprite?.y || this.enemy?.y || 0;
        
        this.damageCalculator.showFloatingText(enemyX, enemyY - 80, `CASTING: ${ability.name.toUpperCase()}`, '#ffaa00');
        
        Logger.info('CombatManager', `Enemy starts casting ${ability.name} (${ability.castTime} rounds)`);
        return { used: true, casting: true, ability: ability.name };
    }

    /**
     * Update enemy casting progress
     */
    updateEnemyCast() {
        if (!this.enemy || !this.enemy.isCasting || !this.enemy.castingAbility) return;

        this.enemy.castRoundsRemaining--;

        const enemyX = this.enemy?.sprite?.x || this.enemy?.x || 0;
        const enemyY = this.enemy?.sprite?.y || this.enemy?.y || 0;

        if (this.enemy.castRoundsRemaining <= 0) {
            Logger.info('CombatManager', `Enemy completes casting ${this.enemy.castingAbility.name}`);
            const ability = this.enemy.castingAbility;
            this.enemy.isCasting = false;
            this.enemy.castingAbility = null;
            this.executeEnemyAbility(ability);
        } else {
            this.damageCalculator.showFloatingText(enemyX, enemyY - 80, `CASTING... (${this.enemy.castRoundsRemaining})`, '#ffaa00');
        }
    }

    /**
     * Interrupt enemy casting
     * @returns {boolean} - True if successfully interrupted
     */
    interruptEnemy() {
        if (!this.enemy || !this.enemy.isCasting) return false;

        const abilityName = this.enemy.castingAbility?.name || 'Ability';
        this.enemy.isCasting = false;
        this.enemy.castingAbility = null;
        this.enemy.castRoundsRemaining = 0;

        const enemyX = this.enemy?.sprite?.x || this.enemy?.x || 0;
        const enemyY = this.enemy?.sprite?.y || this.enemy?.y || 0;
        
        this.damageCalculator.showFloatingText(enemyX, enemyY - 80, 'INTERRUPTED!', '#ff0000');
        
        // Put the interrupted ability on a longer cooldown
        if (!this.enemy.data.abilityCooldowns) this.enemy.data.abilityCooldowns = {};
        this.enemy.data.abilityCooldowns[abilityName] = 10; 

        Logger.info('CombatManager', `Enemy interrupted while casting ${abilityName}`);
        return true;
    }

    /**
     * Evaluate current combat state for tactical decisions
     * @returns {Object} Combat state analysis
     */
    evaluateCombatState() {
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
        const isPartyCombat = this.currentCombat?.party && Array.isArray(this.currentCombat.party.heroes);

        if (isPartyCombat && this.partyManager) {
            const heroes = this.currentCombat.party?.heroes || [];
            if (!Array.isArray(heroes) || heroes.length === 0) {
                return state;
            }
            state.partySize = heroes.length;

            // Calculate average hero health
            let totalHealth = 0;
            let maxTotalHealth = 0;
            heroes.forEach(heroData => {
                if (heroData.currentHealth > 0) {
                    totalHealth += heroData.currentHealth;
                    maxTotalHealth += heroData.maxHealth;

                    // Check for healer
                    const hero = this.partyManager.getHeroById(heroData.id);
                    if (hero && (hero.role || heroData.role) === 'healer') {
                        state.hasHealer = true;
                    }

                    // Check status effects
                    if (hero && hero.data?.statusEffects) {
                        const effects = Object.keys(hero.data.statusEffects);
                        if (effects.some(e => e.includes('debuff') || e.includes('poison') || e.includes('bleed'))) {
                            state.hasDebuffs = true;
                        }
                        if (effects.some(e => e.includes('stun'))) {
                            state.hasStuns = true;
                        }
                    }
                }
            });

            state.averageHeroHealth = maxTotalHealth > 0 ? totalHealth / maxTotalHealth : 1.0;
            state.heroHealthPercent = state.averageHeroHealth;
        } else if (this.currentCombat?.hero) {
            state.heroHealthPercent = this.currentCombat.hero.currentHealth / this.currentCombat.hero.maxHealth;
        }

        if (this.currentCombat?.enemy) {
            state.enemyHealthPercent = this.currentCombat.enemy.currentHealth / this.currentCombat.enemy.maxHealth;
        }

        if (this.currentCombat?.startTime) {
            state.combatDuration = Date.now() - this.currentCombat.startTime;
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
            // Higher score if heroes are debuffed (combo potential)
            if (combatState.hasDebuffs) score += 20;

            // Higher score if heroes are low on health (finisher)
            if (combatState.heroHealthPercent < 0.3) score += 30;
            else if (combatState.heroHealthPercent < 0.5) score += 15;

            // Higher score for high damage abilities when enemy is healthy
            if (ability.damageMultiplier && ability.damageMultiplier > 1.5 && combatState.enemyHealthPercent > 0.5) {
                score += 15;
            }
        } else if (ability.type === 'debuff') {
            // Higher score if no debuffs present yet
            if (!combatState.hasDebuffs) score += 25;

            // Higher score if party has healer (debuff to reduce healing)
            if (combatState.hasHealer) score += 20;

            // Higher score early in fight
            if (combatState.enemyHealthPercent > 0.75) score += 15;
        } else if (ability.type === 'heal' || ability.type === 'buff') {
            // Higher score if enemy is low on health
            if (combatState.enemyHealthPercent < 0.5) score += 30;
            if (combatState.enemyHealthPercent < 0.25) score += 20;
        }

        // Adjust score based on enemy health phase
        if (ability.phase === 'low' && combatState.enemyHealthPercent <= 0.5) {
            score += 20; // Desperate abilities score higher when low
        }

        // Adjust score based on party composition
        if (combatState.hasHealer && ability.type === 'attack' && ability.damageMultiplier > 1.0) {
            score += 10; // Prioritize damage when healer present
        }

        // --- NEW: Advanced AI Scoring ---
        // 1. Synergy Breaking: Prioritize disruption if healers are active
        if (combatState.hasHealer && (ability.type === 'debuff' || ability.type === 'stun')) {
            score += 25;
        }

        // 2. Anti-Carry: If a hero is doing too much damage (high threat), focus on them
        // This is handled by targeting, but ability choice can also change
        if (combatState.heroHealthPercent < 0.2 && ability.type === 'attack') {
            score += 40; // High score for finishing moves
        }

        // 3. CC Counter: If enemy is under heavy CC pressure, prioritize buffs/defensive moves
        const combatStateAI = this.combatAI?.getAIState(enemyId);
        if (combatStateAI?.adaptationLevel > 1 && (ability.type === 'buff' || ability.type === 'defense')) {
            score += 30;
        }

        // Clamp score between 0 and 100
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
                return 25; // High bonus for damage after debuff
            }
        }

        // Stun → Heavy Attack combo
        if (lastAbility.includes('stun')) {
            if (ability.type === 'attack' && ability.damageMultiplier > 1.5) {
                return 30; // Guaranteed heavy hit after stun
            }
        }

        // Damage → Finisher combo
        if (lastAbility.includes('attack') || lastAbility.includes('strike')) {
            if (ability.type === 'attack' && ability.damageMultiplier > 2.0) {
                return 20; // Finisher after regular attack
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

        // Calculate total weight (sum of scores)
        const totalWeight = abilities.reduce((sum, a) => sum + a.score, 0);
        if (totalWeight === 0) {
            // If all scores are 0, use equal weights
            return abilities[Math.floor(Math.random() * abilities.length)];
        }

        // Weighted random selection
        let random = Math.random() * totalWeight;
        for (const item of abilities) {
            random -= item.score;
            if (random <= 0) {
                return item;
            }
        }

        // Fallback to last item
        return abilities[abilities.length - 1];
    }

    /**
     * Execute a specific enemy ability
     * @param {Object} ability - Ability definition
     * @returns {Object} - Ability result
     */
    /**
     * Executes a specific enemy ability.
     * @param {Object} ability - Ability configuration object
     */
    executeEnemyAbility(ability) {
        if (!this.enemy) return { used: false };

        const result = { used: true, ability: ability.name };

        // Initialize cooldowns if needed
        if (!this.enemy.data.abilityCooldowns) {
            this.enemy.data.abilityCooldowns = {};
        }

        // Set cooldown
        this.enemy.data.abilityCooldowns[ability.name] = ability.cooldown || 0;

        switch (ability.type) {
            case 'attack':
                if (ability.isAoE) {
                    this.executeBossAoE(this.enemy);
                } else {
                    this.executeEnemyAttackAbility(ability);
                }
                break;
            case 'debuff':
                this.executeEnemyDebuffAbility(ability);
                break;
            case 'heal':
                this.executeEnemyHealAbility(ability);
                break;
            case 'buff':
                this.executeEnemyBuffAbility(ability);
                break;
            default:
                result.used = false;
        }

        return result;
    }

    /**
     * Execute enemy heal ability
     * @param {Object} ability - Ability definition
     */
    executeEnemyHealAbility(ability) {
        if (!this.currentCombat.enemy) return;

        const maxHealth = this.currentCombat.enemy.maxHealth;
        const healMultiplier = ability.healMultiplier || 0.15;
        const healAmount = Math.floor(maxHealth * healMultiplier);

        this.currentCombat.enemy.currentHealth = Math.min(
            maxHealth,
            this.currentCombat.enemy.currentHealth + healAmount
        );

        const enemyX = this.enemy?.sprite?.x || this.enemy?.x || 0;
        const enemyY = this.enemy?.sprite?.y || this.enemy?.y || 0;
        
        this.damageCalculator.showFloatingText(enemyX, enemyY - 80, `HEALED +${healAmount}`, '#00ff00');
        this.combatVisuals.updateHealthBars();
        
        Logger.debug('CombatManager', `Enemy heals for ${healAmount}`);
    }

    /**
     * Execute enemy buff ability
     * @param {Object} ability - Ability definition
     */
    executeEnemyBuffAbility(ability) {
        const effectType = ability.effect || 'buff_attack';
        const duration = ability.duration || 3;

        // Apply status effect to enemy
        this.statusEffectsManager.applyEffect(this.enemy, effectType, duration);

        const enemyX = this.enemy?.sprite?.x || this.enemy?.x || 0;
        const enemyY = this.enemy?.sprite?.y || this.enemy?.y || 0;
        
        this.damageCalculator.showFloatingText(enemyX, enemyY - 80, 'EMPOWERED!', '#ffff00');
        
        Logger.debug('CombatManager', `Enemy uses buff ${effectType} for ${duration} rounds`);
    }

    /**
     * Execute enemy attack ability
     * @param {Object} ability - Ability definition
     */
    executeEnemyAttackAbility(ability) {
        const baseAttack = this.currentCombat.enemy.attack;
        const multiplier = ability.damageMultiplier || 1.0;
        const damage = Math.floor(baseAttack * multiplier);

        // Check if this is party combat
        const isPartyCombat = this.currentCombat.party && Array.isArray(this.currentCombat.party.heroes);

        if (isPartyCombat && this.partyManager) {
            const enemyId = this.enemy.data?.id || this.enemy.id;
            const targetHeroId = this.combatAI.selectTarget(enemyId, this.enemy);
            const targetHero = targetHeroId ? this.partyManager.getHeroById(targetHeroId) : this.partyManager.getTank();

            if (targetHero) {
                const heroData = this.currentCombat.party.heroes.find(h => h.id === targetHero.id);
                if (heroData) {
                    const finalDamage = this.damageCalculator.calculateDamage(
                        damage,
                        heroData.defense,
                        this.enemy,
                        targetHero
                    );

                    heroData.currentHealth = Math.max(0, heroData.currentHealth - finalDamage);
                    
                    const heroX = targetHero.sprite?.x || targetHero.x || 0;
                    const heroY = targetHero.sprite?.y || targetHero.y || 0;
                    this.damageCalculator.showDamageNumber(heroX, heroY - 50, finalDamage);
                    
                    if (finalDamage > 0) {
                        this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: finalDamage });
                    }
                }
            }
        } else if (this.hero) {
            // Single hero combat (fallback)
            const finalDamage = this.damageCalculator.calculateDamage(
                damage,
                this.currentCombat.hero.defense,
                this.enemy,
                this.hero
            );

            this.damageCalculator.dealDamage(this.hero, finalDamage, this.currentCombat, this.hero);
            
            if (finalDamage > 0) {
                this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: finalDamage });
            }
            
            this.damageCalculator.showDamageNumber(this.hero.x, this.hero.y - 50, finalDamage);
        }

        // Show visual feedback
        const abilityName = ability.name.charAt(0).toUpperCase() + ability.name.slice(1);
        const enemyX = this.enemy?.sprite?.x || this.enemy?.x || 0;
        const enemyY = this.enemy?.sprite?.y || this.enemy?.y || 0;

        // Enhanced ability proc effect
        if (this.scene.uiManager?.combatUI?.showAbilityProcEffect) {
            this.scene.uiManager.combatUI.showAbilityProcEffect(
                enemyX, enemyY - 30, abilityName, 'damage'
            );
        } else {
            // Fallback to basic floating text
            this.damageCalculator.showFloatingText(enemyX, enemyY - 80, `${abilityName}!`, '#ff0000');
        }

        Logger.debug('CombatManager', `Enemy uses ${ability.name} for ability attack`);
    }

    /**
     * Execute enemy debuff ability
     * @param {Object} ability - Ability definition
     */
    executeEnemyDebuffAbility(ability) {
        const effectType = ability.effect || 'debuff_attack';
        const duration = ability.duration || 2;

        // Check if this is party combat
        const isPartyCombat = this.currentCombat.party && Array.isArray(this.currentCombat.party.heroes);

        if (isPartyCombat && this.partyManager) {
            const enemyId = this.enemy.data?.id || this.enemy.id;
            const targetHeroId = this.combatAI.selectTarget(enemyId, this.enemy);
            const targetHero = targetHeroId ? this.partyManager.getHeroById(targetHeroId) : this.partyManager.getTank();

            if (targetHero) {
                this.statusEffectsManager.applyEffect(targetHero, effectType, duration);
                
                const heroX = targetHero.sprite?.x || targetHero.x || 0;
                const heroY = targetHero.sprite?.y || targetHero.y || 0;
                this.damageCalculator.showFloatingText(heroX, heroY - 80, 'CURSED!', '#880088');
            }
        } else if (this.hero) {
            // Apply status effect to single hero
            this.statusEffectsManager.applyEffect(this.hero, effectType, duration);
            this.damageCalculator.showFloatingText(this.hero.x, this.hero.y - 80, 'CURSED!', '#880088');
        }

        // Show visual feedback
        const abilityName = ability.name.charAt(0).toUpperCase() + ability.name.slice(1);
        const enemyX = this.enemy?.sprite?.x || this.enemy?.x || 0;
        const enemyY = this.enemy?.sprite?.y || this.enemy?.y || 0;
        this.damageCalculator.showFloatingText(enemyX, enemyY - 80, `${abilityName}!`, '#880088');

        // Update status effect indicators if method exists
        if (this.combatVisuals?.updateStatusEffectIndicators) {
            this.combatVisuals.updateStatusEffectIndicators();
        }

        Logger.debug('CombatManager', `Enemy uses ${ability.name}, applies ${effectType} for ${duration} rounds`);
    }

    /**
     * Calculate damage with critical hits and misses
     * @param {number} attack - Attack stat
     * @param {number} defense - Defense stat
     * @param {Object} attacker - Attacking combatant (for stat modifiers)
     * @param {Object} defender - Defending combatant (for shield)
     * @returns {number} - Calculated damage
     */
    /**
     * Calculate damage dealt from attacker to defender
     * @param {number} attack - Base attack value
     * @param {number} defense - Base defense value
     * @param {Object|null} attacker - Attacking entity (optional)
     * @param {Object|null} defender - Defending entity (optional)
     * @returns {number} Calculated damage
     */
    calculateDamage(attack, defense, attacker = null, defender = null) {
        // PerformanceMonitor.start('CombatManager.calculateDamage');

        try {
            // Apply stat modifiers from status effects
            if (attacker) {
                const attackModifiers = this.statusEffectsManager.getStatModifiers(attacker);
                attack = Math.floor(attack * (1 + attackModifiers.attack));
            }
            if (defender) {
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
                const targetPos = defender ? getPosition(defender) : getPosition(this.hero);
                this.damageCalculator.showFloatingText(targetPos.x, targetPos.y - 80, 'MISS!', '#ffff00');
                this.scene.events.emit(GameEvents.COMBAT.MISS);
                // PerformanceMonitor.end('CombatManager.calculateDamage');
                return 0;
            }

            // Base damage calculation
            let baseDamage = Math.max(1, attack - defense);

            // Check for critical hit
            const isCritical = Math.random() < this.worldConfig.combat.criticalHitChance;
            if (isCritical) {
                baseDamage *= this.worldConfig.combat.criticalHitMultiplier;
                const targetPos = defender ? getPosition(defender) : getPosition(this.hero);
                this.damageCalculator.showFloatingText(targetPos.x, targetPos.y - 80, 'CRITICAL!', '#ff00ff');
                this.scene.events.emit(GameEvents.COMBAT.CRITICAL_HIT);
            }

            // Apply damage variance
            const variance = this.worldConfig.combat.damageVariance;
            let finalDamage = Math.round(baseDamage * (1 + (Math.random() * 2 - 1) * variance));

            // Apply shield absorption
            if (defender) {
                const shieldAmount = this.statusEffectsManager.getShieldAmount(defender);
                if (shieldAmount > 0) {
                    const absorbed = Math.min(shieldAmount, finalDamage);
                    finalDamage -= absorbed;
                    const defenderPos = getPosition(defender);
                    this.damageCalculator.showFloatingText(defenderPos.x, defenderPos.y - 80, `SHIELD -${absorbed}`, '#0088ff');

                    // Reduce shield duration/amount (handled by status effects manager)
                }
            }

            const result = Math.max(0, finalDamage);
            // PerformanceMonitor.end('CombatManager.calculateDamage');
            return result;
        } catch (error) {
            // PerformanceMonitor.end('CombatManager.calculateDamage');
            ErrorHandler.handle(error, 'CombatManager.calculateDamage', 'error');
            return 0;
        }
    }

    /**
     * Apply damage to a combatant
     * @param {Object} combatant - Hero or enemy to damage
     * @param {number} damage - Amount of damage to apply
     */
    dealDamage(combatant, damage) {
        // Check if this is an enemy before dealing damage
        const isEnemy = combatant === this.enemy || (combatant.data && combatant !== this.hero);
        if (!combatant || !combatant.data) return;

        // For hero, use combat state health
        if (combatant === this.hero && this.currentCombat) {
            this.currentCombat.hero.currentHealth -= damage;
            this.currentCombat.hero.currentHealth = Math.max(0, this.currentCombat.hero.currentHealth);

            // Update hero data stats
            if (combatant.data.stats) {
                combatant.data.stats.health = this.currentCombat.hero.currentHealth;
            }
        } else {
            // For enemy, update both data and combat state
            const previousHealth = combatant.data.currentHealth || 0;
            combatant.data.currentHealth -= damage;
            combatant.data.currentHealth = Math.max(0, combatant.data.currentHealth);

            // Sync with combat state
            if (this.currentCombat && combatant === this.enemy) {
                this.currentCombat.enemy.currentHealth = combatant.data.currentHealth;
            }

            // Emit ENEMY_DIED event if enemy just died
            if (isEnemy && previousHealth > 0 && combatant.data.currentHealth <= 0) {
                const enemyId = combatant.id || combatant.data?.id || 'unknown';
                const enemyX = combatant.sprite?.x || combatant.x || 0;
                const enemyY = combatant.sprite?.y || combatant.y || 0;

                // Play death animation
                if (combatant.sprite && this.scene.animationManager) {
                    const characterType = combatant.data.id || 'goblin';
                    const characterId = combatant.id || combatant.data.id || 'enemy';
                    const deathKey = this.scene.animationManager.getAnimationKey(characterType, characterId, 'death');
                    if (combatant.sprite.anims && this.scene.anims.exists(deathKey)) {
                        combatant.sprite.play(deathKey);
                        combatant.sprite.once('animationcomplete', () => {
                            this.scene.tweens.add({
                                targets: combatant.sprite,
                                alpha: 0,
                                duration: 500
                            });
                        });
                    } else {
                        // Fallback: fade out immediately
                        this.scene.tweens.add({
                            targets: combatant.sprite,
                            alpha: 0,
                            duration: 500
                        });
                    }
                }

                this.scene.events.emit(GameEvents.COMBAT.ENEMY_DIED, {
                    enemyId: enemyId,
                    enemy: combatant,
                    x: enemyX,
                    y: enemyY
                });

                Logger.info('CombatManager', `Enemy ${enemyId} died at (${enemyX}, ${enemyY})`);
            }

            // Check for hero death (party combat)
            if (!isEnemy && this.currentCombat?.party) {
                const heroData = this.currentCombat.party.heroes?.find(h => h.id === combatant.id);
                if (heroData && previousHealth > 0 && heroData.currentHealth <= 0) {
                    // Play death animation for hero
                    if (combatant.sprite && this.scene.animationManager) {
                        const characterType = combatant.classId || combatant.data?.classId || 'paladin';
                        const characterId = combatant.id || 'hero';
                        const deathKey = this.scene.animationManager.getAnimationKey(characterType, characterId, 'death');
                        if (combatant.sprite.anims && this.scene.anims.exists(deathKey)) {
                            combatant.sprite.play(deathKey);
                            combatant.sprite.once('animationcomplete', () => {
                                this.scene.tweens.add({
                                    targets: combatant.sprite,
                                    alpha: 0,
                                    duration: 500
                                });
                            });
                        } else {
                            this.scene.tweens.add({
                                targets: combatant.sprite,
                                alpha: 0,
                                duration: 500
                            });
                        }
                    }
                }
            }
        }

        // Update health bar
        const type = combatant === this.hero ? 'hero' : 'enemy';
        this.updateHealthBar(type);

        // Show damage effects
        const combatantX = combatant?.sprite?.x || combatant?.x || 0;
        const combatantY = combatant?.sprite?.y || combatant?.y || 0;
        this.showDamageEffect(combatantX, combatantY - 20);

        // Flash combatant
        this.scene.tweens.add({
            targets: combatant,
            alpha: { from: 1, to: 0.5 },
            duration: 200,
            yoyo: true,
            ease: 'Linear'
        });
    }

    /**
     * Show damage number
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount
     * @param {string} color - Color hex string (optional)
     */
    /**
     * Show a floating damage number
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount to display
     * @param {string} color - Text color (default: '#ffffff')
     */
    showDamageNumber(x, y, damage, damageType = 'physical', isCritical = false) {
        // Use enhanced CombatUIManager for visual feedback if available
        if (this.scene.uiManager?.combatUI?.showDamageNumber) {
            this.scene.uiManager.combatUI.showDamageNumber(x, y, damage, isCritical, damageType);
            return;
        }

        // Fallback to basic implementation if CombatUIManager not available
        const color = this.getDamageColor(damageType, isCritical);
        const displayText = isCritical ? `${damage}!` : damage.toString();

        // Add critical hit effects for fallback
        if (isCritical && this.particleManager) {
            this.particleManager.createParticleBurst(x, y, 0xffd93d, 8, 300);
        }

        // Get text object from pool
        const damageText = this.damageNumberPool.acquire();
        damageText.setPosition(x, y);
        damageText.setText(displayText);
        damageText.setStyle({ fill: color });
        damageText.setOrigin(0.5, 0.5);
        damageText.setVisible(true);
        damageText.setActive(true);
        damageText.setAlpha(1);

        this.damageNumbers.push(damageText);

        // Animate damage number
        this.scene.tweens.add({
            targets: damageText,
            y: { from: y, to: y - 50 },
            alpha: { from: 1, to: 0 },
            duration: 1000,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // Return to pool instead of destroying
                const index = this.damageNumbers.indexOf(damageText);
                if (index > -1) {
                    this.damageNumbers.splice(index, 1);
                }
                this.damageNumberPool.release(damageText);
            }
        });
    }

    /**
     * Show floating text effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text to display
     * @param {string} color - Text color
     */
    showFloatingText(x, y, text, color = '#ffffff') {
        const floatingText = this.scene.add.text(x, y, text, {
            font: 'bold 16px Arial',
            fill: color,
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        });
        floatingText.setOrigin(0.5, 0.5);

        // Animate floating text
        this.scene.tweens.add({
            targets: floatingText,
            y: { from: y, to: y - 30 },
            alpha: { from: 1, to: 0 },
            duration: 1500,
            ease: 'Quad.easeOut'
        });

        // Remove after animation
        this.scene.time.delayedCall(1500, () => {
            floatingText.destroy();
        });
    }

    /**
     * Show damage effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showDamageEffect(x, y) {
        // Create impact effect
        const impact = this.scene.add.circle(x, y, 20, 0xff0000, 0.8);

        // Animate impact
        this.scene.tweens.add({
            targets: impact,
            scale: { from: 0, to: 2 },
            alpha: { from: 1, to: 0 },
            duration: 300,
            ease: 'Quad.easeOut'
        });

        // Remove after animation
        this.scene.time.delayedCall(300, () => {
            impact.destroy();
        });
    }

    /**
     * Check if combat should end
     * Delegates to orchestrator
     */
    /**
     * Check if combat should end
     * Delegates to CombatOrchestrator.
     * @returns {boolean} True if combat has ended
     */
    checkCombatEnd() {
        if (!this.combatOrchestrator || !this.inCombat) return false;
        const endCheck = this.combatOrchestrator.checkCombatEnd();
        if (endCheck && endCheck.ended) {
            this.endCombat(endCheck.heroVictory);
            return true;
        }
        return false;
    }

    /**
     * End combat and clean up
     * Delegates to orchestrator for state management
     * @param {boolean} heroVictory - True if hero won, false if defeated
     */
    endCombat(heroVictory) {
        if (!this.combatOrchestrator || !this.combatOrchestrator.isInCombat()) return;

        // Use orchestrator to end combat (handles visual cleanup)
        this.combatOrchestrator.endCombat(heroVictory);
        this._combatTimerPending = false;

        // Clear current combat timer if it exists
        if (this._currentCombatTimer) {
            this._currentCombatTimer.remove();
            this._currentCombatTimer = null;
        }

        // Resume hero movement
        const scrollSpeed = this.scene.worldManager?.scrollSpeed || 100;
        if (this.hero && this.hero.body) {
            this.hero.body.setVelocityX(scrollSpeed);
        }

        // Resume all party member movement
        if (this.partyManager) {
            const heroes = this.partyManager.getHeroes() || [];
            if (Array.isArray(heroes)) {
                heroes.forEach(hero => {
                    if (hero && hero.sprite && hero.sprite.body) {
                        hero.sprite.body.setVelocityX(scrollSpeed);
                    }
                });
            }
        }

        // Calculate rewards
        const rewards = heroVictory ? this.calculateVictoryRewards() : this.calculateDefeatRewards();

        // Emit combat end event (orchestrator already emits, but we emit with rewards)
        if (this.eventBus) {
            this.eventBus.emit(GameEvents.COMBAT.END, {
                hero: this.hero,
                enemy: this.enemy,
                victory: heroVictory,
                rewards: rewards
            });
        } else {
            this.scene.events.emit(GameEvents.COMBAT.END, {
                hero: this.hero,
                enemy: this.enemy,
                victory: heroVictory,
                rewards: rewards
            });
        }

        Logger.info('CombatManager', `Combat ended. Hero victory: ${heroVictory}`);
    }

    /**
     * Calculate victory rewards
     * Delegates to CombatRewards subsystem.
     * @returns {Object} Rewards object with experience, gold, and loot array
     */
    calculateVictoryRewards() {
        if (!this.combatRewards || !this.currentCombat || !this.enemy) {
            return { experience: 0, gold: 0, loot: [] };
        }
        return this.combatRewards.calculateVictoryRewards(this.enemy, this.currentCombat, this.worldConfig);
    }

    /**
     * Calculate defeat rewards
     * Delegates to CombatRewards subsystem.
     * @returns {Object} - Rewards for losing combat
     */
    calculateDefeatRewards() {
        if (!this.combatRewards) {
            return { experience: 5, gold: 2, loot: [] };
        }
        return this.combatRewards.calculateDefeatRewards();
    }

    /**
     * Generate loot drops
     * @param {Object} enemyData - Enemy data for drop calculation
     * @param {boolean} isBoss - Whether this is a boss enemy
     * @returns {Array} - Array of dropped items
     */
    generateLoot(enemyData, isBoss = false) {
        if (!this.combatRewards || !enemyData) return [];
        return this.combatRewards.generateLoot(enemyData, isBoss, this.worldConfig);
    }

    /**
     * Old generateLoot implementation - kept for reference
     * @deprecated Use CombatRewards.generateLoot instead
     */
    _generateLootOld(enemyData, isBoss = false) {
        if (!enemyData) return [];
        const loot = [];
        const drops = enemyData.drops || [];

        // Get current mile from WorldManager for item scaling
        const currentMile = this.scene.worldManager?.getCurrentMile() || 0;
        const qualityConfig = this.worldConfig.itemQualityScaling || {};

        // Get loot configuration
        const lootConfig = this.worldConfig.loot || {};
        const itemDropBonusPerLevel = lootConfig.itemDropBonusPerLevel || 0.02;
        const rareItemChanceBonus = lootConfig.rareItemChanceBonus || 0.01;

        // Get hero level for scaling (for drop chance bonuses)
        const heroLevel = this.hero?.data?.level || this.partyManager?.getTank()?.level || 1;
        const levelBonus = (heroLevel - 1) * itemDropBonusPerLevel;

        // Enhanced loot bonuses based on enemy type and loot quality
        let qualityBonus = 0;
        if (enemyData.lootQuality === 'rare') qualityBonus = 0.15;
        else if (enemyData.lootQuality === 'epic') qualityBonus = 0.3;

        // Bosses and elites have enhanced drop rates
        const bossBonus = isBoss ? 0.2 : 0;
        const eliteBonus = enemyData.isElite ? 0.1 : 0;

        const itemsData = this.scene.cache.json.get('items');

        drops.forEach(drop => {
            // Calculate adjusted drop chance
            let adjustedChance = drop.chance;

            // Apply level bonus
            adjustedChance += levelBonus;

            // Apply quality bonus
            adjustedChance += qualityBonus;

            // Apply boss and elite bonuses
            adjustedChance += bossBonus;
            adjustedChance += eliteBonus;

            // Apply rare item chance bonus (check if item is rare)
            let isRare = false;
            let baseItemData = null;
            for (const category of ['weapons', 'armor', 'accessories', 'consumables']) {
                if (itemsData[category] && itemsData[category][drop.item]) {
                    baseItemData = itemsData[category][drop.item];
                    isRare = baseItemData.rarity === 'rare' || baseItemData.rarity === 'legendary' || baseItemData.rarity === 'epic';
                    break;
                }
            }
            if (isRare) {
                adjustedChance += rareItemChanceBonus;
            }

            // Cap chance at 1.0
            adjustedChance = Math.min(1.0, adjustedChance);

            // Bosses and epic loot enemies have at least 50% chance for their drops
            if (isBoss || enemyData.lootQuality === 'epic') {
                adjustedChance = Math.max(0.5, adjustedChance);
            }

            if (Math.random() < adjustedChance) {
                // Generate item scaled to current mile
                let generatedItem = null;
                if (baseItemData && this.proceduralItemGenerator) {
                    // Determine quality based on mile and enemy type
                    let itemQuality = baseItemData.rarity || 'common';

                    // Bosses and elites have better quality chances
                    if (isBoss || enemyData.isElite) {
                        const qualityRoll = Math.random();
                        if (qualityRoll < 0.3) itemQuality = 'legendary';
                        else if (qualityRoll < 0.6) itemQuality = 'epic';
                        else if (qualityRoll < 0.85) itemQuality = 'rare';
                        else itemQuality = 'uncommon';
                    }

                    // Generate item scaled to mile (with prestige bonuses)
                    generatedItem = this.proceduralItemGenerator.generateItemForMile(
                        baseItemData,
                        currentMile,
                        baseItemData.slot,
                        itemQuality,
                        qualityConfig,
                        this.prestigeManager // Pass prestige manager for bonuses
                    );
                }

                // Add to loot with item data
                loot.push({
                    id: drop.item,
                    quantity: 1,
                    itemData: generatedItem || baseItemData, // Include generated item data
                    itemLevel: generatedItem?.itemLevel || baseItemData?.level || 1,
                    quality: generatedItem?.rarity || baseItemData?.rarity || 'common',
                    mileGenerated: currentMile
                });
            }
        });

        // Bosses guarantee at least one drop if they have drops defined
        if (isBoss && drops.length > 0 && loot.length === 0) {
            // Force drop one random item
            const randomDrop = drops[Math.floor(Math.random() * drops.length)];
            let baseItemData = null;
            for (const category of ['weapons', 'armor', 'accessories']) {
                if (itemsData[category] && itemsData[category][randomDrop.item]) {
                    baseItemData = itemsData[category][randomDrop.item];
                    break;
                }
            }

            // Generate guaranteed boss drop with high quality
            let generatedItem = null;
            if (baseItemData && this.proceduralItemGenerator) {
                const qualityRoll = Math.random();
                let itemQuality = 'epic';
                if (qualityRoll < 0.5) itemQuality = 'legendary';

                generatedItem = this.proceduralItemGenerator.generateItemForMile(
                    baseItemData,
                    currentMile,
                    baseItemData.slot,
                    itemQuality,
                    qualityConfig,
                    this.prestigeManager // Pass prestige manager for bonuses
                );
            }

            loot.push({
                id: randomDrop.item,
                quantity: 1,
                itemData: generatedItem || baseItemData,
                itemLevel: generatedItem?.itemLevel || baseItemData?.level || 1,
                quality: generatedItem?.rarity || baseItemData?.rarity || 'common',
                mileGenerated: currentMile
            });
        }

        // Add consumable drops (potions, etc.)
        this.addConsumableDrops(loot, enemyData, isBoss, heroLevel);

        // Add gem drops (Phase 9: Skill Gem Sockets)
        this.addGemDrops(loot, currentMile, isBoss, enemyData);

        return loot;
    }

    /**
     * Add skill gem drops to loot
     */
    addGemDrops(loot, currentMile, isBoss, enemyData) {
        // Bosses have 80% chance, elites 30%, regular mobs 5%
        const gemChance = isBoss ? 0.8 : (enemyData.isElite ? 0.3 : 0.05);
        if (Math.random() < gemChance) {
            const skillGemsData = this.scene.cache.json.get('skillGems')?.skillGems;
            if (!skillGemsData) return;

            // Pick random category and gem
            const categories = Object.keys(skillGemsData);
            const category = categories[Math.floor(Math.random() * categories.length)];
            const gems = Object.keys(skillGemsData[category]);
            const gemId = gems[Math.floor(Math.random() * gems.length)];
            const baseGemData = skillGemsData[category][gemId];

            if (baseGemData) {
                // Generate unique gem instance with scaled value
                const gemInstance = JSON.parse(JSON.stringify(baseGemData));
                const tier = Math.min(5, Math.floor(currentMile / 20) + 1);
                const tierMultiplier = 1 + (tier - 1) * 0.3;
                
                // Random value between min/max scaled by tier
                const valueRange = baseGemData.maxValue - baseGemData.minValue;
                gemInstance.value = Math.floor((baseGemData.minValue + Math.random() * valueRange) * tierMultiplier);
                gemInstance.instanceId = `gem-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                gemInstance.itemLevel = tier * 10;
                gemInstance.isGem = true;

                loot.push({
                    id: gemId,
                    quantity: 1,
                    itemData: gemInstance,
                    itemLevel: gemInstance.itemLevel,
                    quality: gemInstance.rarity || 'common',
                    mileGenerated: currentMile
                });
                
                Logger.info('CombatManager', `Dropped gem: ${gemInstance.name} (Value: ${gemInstance.value})`);
            }
        }
    }

    /**
     * Add consumable drops to loot
     * @param {Array} loot - Current loot array to add to
     * @param {Object} enemyData - Enemy data
     * @param {boolean} isBoss - Whether enemy is a boss
     * @param {number} heroLevel - Hero level for scaling
     */
    addConsumableDrops(loot, enemyData, isBoss, heroLevel) {
        // Base consumable drop chances
        let consumableChance = 0.15; // 15% base chance

        // Scale with hero level (slightly)
        consumableChance += (heroLevel - 1) * 0.005;

        // Bosses have higher consumable drop chance
        if (isBoss) {
            consumableChance += 0.3; // +30% for bosses
        }

        // Elite enemies have moderate bonus
        if (enemyData.isElite) {
            consumableChance += 0.15; // +15% for elites
        }

        // Cap at 50% chance
        consumableChance = Math.min(0.5, consumableChance);

        if (Math.random() < consumableChance) {
            // Select random consumable based on rarity
            const consumables = [
                { id: 'minor_mana_potion', weight: 40, rarity: 'common' },
                { id: 'health_potion', weight: 30, rarity: 'common' },
                { id: 'energy_drink', weight: 25, rarity: 'common' },
                { id: 'mana_potion', weight: 15, rarity: 'uncommon' },
                { id: 'superior_health_potion', weight: 10, rarity: 'uncommon' },
                { id: 'major_mana_potion', weight: 5, rarity: 'rare' },
                { id: 'mana_regeneration_potion', weight: 2, rarity: 'rare' }
            ];

            // Calculate total weight
            const totalWeight = consumables.reduce((sum, item) => sum + item.weight, 0);

            // Select weighted random consumable
            let random = Math.random() * totalWeight;
            let selectedConsumable = consumables[0];

            for (const consumable of consumables) {
                random -= consumable.weight;
                if (random <= 0) {
                    selectedConsumable = consumable;
                    break;
                }
            }

            // Determine quantity (1-3 for common, 1-2 for uncommon/rare)
            const maxQuantity = selectedConsumable.rarity === 'common' ? 3 : 2;
            const quantity = Math.floor(Math.random() * maxQuantity) + 1;

            loot.push({
                id: selectedConsumable.id,
                quantity: quantity,
                type: 'consumable'
            });
        }
    }

    /**
     * Clear all combat visual elements
     */
    clearCombatVisuals() {
        // Clear health bars
        this.healthBars.forEach(elements => {
            if (elements.bg) elements.bg.destroy();
            if (elements.healthBar) elements.healthBar.destroy();
            if (elements.border) elements.border.destroy();
        });
        this.healthBars.clear();

        // Clear mana bar
        if (this.manaBar) {
            if (this.manaBar.bg) this.manaBar.bg.destroy();
            if (this.manaBar.manaBar) this.manaBar.manaBar.destroy();
            if (this.manaBar.border) this.manaBar.border.destroy();
            this.manaBar = null;
        }

        // Clear damage numbers and return to pool
        this.damageNumbers.forEach(number => {
            this.damageNumberPool.release(number);
        });
        this.damageNumbers = [];

        // Clear status effect indicators
        this.statusEffectIndicators.forEach(indicators => {
            indicators.forEach(indicator => {
                if (indicator.text) indicator.text.destroy();
                if (indicator.icon) indicator.icon.destroy();
            });
        });
        this.statusEffectIndicators.clear();

        // Clear status effects from combatants
        if (this.hero && this.statusEffectsManager) {
            this.statusEffectsManager.clearAllEffects(this.hero);
        }
        if (this.enemy && this.statusEffectsManager) {
            this.statusEffectsManager.clearAllEffects(this.enemy);
        }

        // Clear combatants
        if (this.enemy && this.enemy.sprite) {
            this.enemy.sprite.setTint(0xffffff);
        }
        if (this.hero) {
            // this.hero might be a sprite or a hero object with a sprite property
            if (this.hero.setTint && typeof this.hero.setTint === 'function') {
                this.hero.setTint(0xffffff);
            } else if (this.hero.sprite && this.hero.sprite.setTint) {
                this.hero.sprite.setTint(0xffffff);
            }
        }
    }

    /**
     * Get current combat state
     * @returns {Object|null} - Current combat state or null
     */
    getCombatState() {
        return this.currentCombat;
    }

    /**
     * Check if currently in combat
     * @returns {boolean} - True if in combat
     */
    isInCombat() {
        return this.inCombat;
    }

    /**
     * Check if camera repositioning is pending (public interface to reduce coupling)
     * @returns {boolean} True if camera repositioning is pending
     */
    isCameraRepositionPending() {
        return this._combatCameraRepositionPending || false;
    }

    /**
     * Get combat start time (public interface to reduce coupling)
     * @returns {number} Combat start timestamp
     */
    getCombatStartTime() {
        return this._combatStartTime || 0;
    }

    /**
     * Clear camera repositioning pending flag (public interface to reduce coupling)
     */
    clearCameraRepositionPending() {
        this._combatCameraRepositionPending = false;
    }

    /**
     * Clean up combat manager
     */
    destroy() {
        // Remove event listeners
        this.scene.events.off(GameEvents.COMBAT.START);

        // Clear combat visuals
        this.clearCombatVisuals();

        // Remove all scheduled events
        this.scene.time.removeAllEvents();

        // Clear state
        this.inCombat = false;
        this.currentCombat = null;
        this.hero = null;
        this.enemy = null;

        // Clear collections and return objects to pool
        this.damageNumbers.forEach(number => {
            this.damageNumberPool.release(number);
        });
        this.damageNumbers = [];
        this.healthBars.clear();
        this.statusEffectIndicators.clear();
        this.manaBar = null;

        // Release all pooled objects
        if (this.damageNumberPool) {
            this.damageNumberPool.releaseAll();
        }

        Logger.debug('CombatManager', 'Destroyed');
    }

    /**
     * Adapt enemy strategy based on combat state
     * @param {Object} enemy - Enemy object
     */
    adaptEnemyStrategy(enemy) {
        if (!enemy || !enemy.data) return;

        const enemyId = enemy.data?.id || enemy.id;
        const combatState = this.enemyCombatStates.get(enemyId);
        if (!combatState) return;

        // Analyze party composition
        const partyAnalysis = this.analyzePartyComposition();

        // Check health threshold for phase change
        const newPhase = this.checkHealthThreshold(enemy);
        if (newPhase !== combatState.phase) {
            const oldPhase = combatState.phase;
            combatState.phase = newPhase;
            Logger.debug('CombatManager', `Enemy ${enemyId} phase changed from ${oldPhase} to ${newPhase}`);

            // Boss phase transitions trigger threat wipe
            if (enemy.data?.type === 'boss' && enemy.data?.bossMechanics?.phases) {
                this.wipeThreatTable(enemyId);
            }
        }

        // Increase adaptation level based on combat duration
        const combatDuration = Date.now() - combatState.startTime;
        if (combatDuration > 10000) { // After 10 seconds
            combatState.adaptationLevel = Math.min(3, Math.floor(combatDuration / 10000));
        }

        // Adapt strategy based on party composition
        const baseStrategy = enemy.data.aiStrategy || 'defensive';
        let adaptedStrategy = baseStrategy;

        if (partyAnalysis.hasHealer && baseStrategy !== 'tactical') {
            // If healer present and not already tactical, become more tactical
            if (combatState.adaptationLevel >= 1) {
                adaptedStrategy = 'tactical';
            }
        }

        if (partyAnalysis.allMelee && baseStrategy === 'aggressive') {
            // If all melee, focus on finishing off low health targets
            adaptedStrategy = 'aggressive';
        }

        // Store adapted strategy (can be used in targeting)
        combatState.adaptedStrategy = adaptedStrategy;
    }

    /**
     * Analyze party composition
     * @returns {Object} Party analysis
     */
    analyzePartyComposition() {
        const analysis = {
            hasHealer: false,
            hasTank: false,
            hasRanged: false,
            allMelee: false,
            partySize: 0
        };

        if (!this.partyManager || !this.currentCombat?.party?.heroes) {
            return analysis;
        }

        const heroes = this.currentCombat.party.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            return analysis;
        }

        analysis.partySize = heroes.length;

        let meleeCount = 0;
        let rangedCount = 0;

        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return;

            const hero = this.partyManager.getHeroById(heroData.id);
            if (!hero) return;

            const role = hero.role || heroData.role || 'dps';
            if (role === 'healer') analysis.hasHealer = true;
            if (role === 'tank') analysis.hasTank = true;

            // Check if melee or ranged (would need class data)
            // For now, assume all are melee unless specified
            meleeCount++;
        });

        analysis.allMelee = rangedCount === 0 && meleeCount > 0;

        return analysis;
    }

    /**
     * Check health threshold and determine phase
     * @param {Object} enemy - Enemy object
     * @returns {string} Phase name
     */
    checkHealthThreshold(enemy) {
        if (!enemy || !this.currentCombat?.enemy) return 'normal';

        const healthPercent = this.currentCombat.enemy.currentHealth / this.currentCombat.enemy.maxHealth;
        const enemyId = enemy.data?.id || enemy.id;
        const combatState = this.enemyCombatStates.get(enemyId);
        const currentPhase = combatState?.phase || 'normal';

        // Boss enemies use different phases
        if (enemy.data?.type === 'boss') {
            if (healthPercent <= 0.25) return 'enrage';
            if (healthPercent <= 0.50) return 'phase3';
            if (healthPercent <= 0.75) return 'phase2';
            return 'phase1';
        }

        // Regular enemies
        if (healthPercent <= 0.25) {
            return 'enrage';
        } else if (healthPercent <= 0.50) {
            return 'aggressive';
        } else if (healthPercent <= 0.75 && currentPhase === 'normal') {
            return 'defensive';
        }

        return currentPhase;
    }

    /**
     * Decide if enemy should switch targets
     * @param {Object} enemy - Enemy object
     * @param {string} currentTargetId - Current target hero ID
     * @returns {boolean} True if should switch
     */
    shouldSwitchTarget(enemy, currentTargetId) {
        if (!enemy || !currentTargetId) return false;

        const enemyId = enemy.data?.id || enemy.id;
        const combatState = this.enemyCombatStates.get(enemyId);
        if (!combatState) return false;

        // Prevent constant switching (cooldown of 3 seconds)
        const now = Date.now();
        if (now - combatState.lastTargetSwitch < 3000) {
            return false;
        }

        // Get enemy strategy
        const strategy = enemy.data?.aiStrategy || 'defensive';

        // Aggressive enemies switch more often to finish off low health targets
        if (strategy === 'aggressive') {
            const currentTarget = this.partyManager?.getHeroById(currentTargetId);
            if (currentTarget) {
                const heroData = this.currentCombat?.party?.heroes?.find(h => h.id === currentTargetId);
                if (heroData) {
                    const healthPercent = heroData.currentHealth / heroData.maxHealth;
                    // Switch if current target is healthy and another is low
                    if (healthPercent > 0.5) {
                        const lowHealthTarget = this.selectLowHealthTarget(enemyId);
                        if (lowHealthTarget && lowHealthTarget !== currentTargetId) {
                            combatState.lastTargetSwitch = now;
                            return true;
                        }
                    }
                }
            }
        }

        // Tactical enemies switch to prioritize healers
        if (strategy === 'tactical') {
            const priorityTarget = this.selectPriorityTarget(enemyId, ['healer', 'dps']);
            if (priorityTarget && priorityTarget !== currentTargetId) {
                combatState.lastTargetSwitch = now;
                return true;
            }
        }

        return false;
    }

    /**
     * Get boss phase based on health percentage
     * @param {Object} enemy - Enemy object
     * @returns {string} Phase name (phase1, phase2, phase3, enrage)
     */
    getBossPhase(enemy) {
        if (!this.bossMechanics || !enemy || !this.currentCombat) return 'phase1';
        return this.bossMechanics.getBossPhase(enemy, this.currentCombat);
    }

    /**
     * Check if boss should enrage
     * @param {Object} enemy - Enemy object
     * @returns {boolean} True if should enrage
     */
    checkEnrageCondition(enemy) {
        if (!enemy || !enemy.data || enemy.data.type !== 'boss') return false;

        const enemyId = enemy.data?.id || enemy.id;
        const combatState = this.enemyCombatStates.get(enemyId);
        if (!combatState) return false;

        // Check if already enraged
        if (combatState.phase === 'enrage') return false;

        const bossMechanics = enemy.data.bossMechanics;
        if (!bossMechanics || !bossMechanics.enrage) return false;

        const enrageConfig = bossMechanics.enrage;

        // Check health threshold
        if (this.currentCombat?.enemy) {
            const healthPercent = this.currentCombat.enemy.currentHealth / this.currentCombat.enemy.maxHealth;
            if (healthPercent <= enrageConfig.healthThreshold) {
                return true;
            }
        }

        // Check round threshold
        if (enrageConfig.roundThreshold && this.currentCombat?.round >= enrageConfig.roundThreshold) {
            return true;
        }

        return false;
    }

    /**
     * Trigger enrage effects on boss
     * @param {Object} enemy - Enemy object
     */
    triggerEnrage(enemy) {
        if (!enemy || !enemy.data) return;

        const enemyId = enemy.data?.id || enemy.id;
        const combatState = this.enemyCombatStates.get(enemyId);
        if (!combatState) return;

        const bossMechanics = enemy.data.bossMechanics;
        if (!bossMechanics || !bossMechanics.enrage) return;

        const enrageConfig = bossMechanics.enrage;

        // Set phase to enrage
        combatState.phase = 'enrage';
        combatState.enraged = true;

        // Apply stat boosts
        if (enrageConfig.attackSpeedMultiplier) {
            enemy.data.stats.speed = (enemy.data.stats.speed || 20) * enrageConfig.attackSpeedMultiplier;
        }

        if (enrageConfig.damageMultiplier) {
            enemy.data.enrageDamageMultiplier = enrageConfig.damageMultiplier;
        }

        // Visual feedback
        this.damageCalculator.showFloatingText(enemy.x || 0, (enemy.y || 0) - 80, 'ENRAGE!', '#ff0000');

        // Threat wipe (ignore threat table)
        combatState.ignoreThreat = true;
        this.wipeThreatTable(enemyId);

        Logger.info('CombatManager', `Boss ${enemyId} has ENRAGED!`);
    }

    /**
     * Execute boss special mechanic
     * Delegates to BossMechanics subsystem.
     * @param {Object} enemy - Enemy object
     * @param {string} mechanic - Mechanic name
     */
    executeBossSpecialMechanic(enemy, mechanic) {
        if (!this.bossMechanics || !enemy || !mechanic) return;
        this.bossMechanics.executeMechanic(enemy, mechanic, this.currentCombat, this.partyManager);
    }

    /**
     * Execute boss AoE attack
     * @param {Object} enemy - Enemy object
     */
    executeBossAoE(enemy) {
        if (!this.partyManager || !this.currentCombat?.party?.heroes) return;

        const heroes = this.currentCombat.party?.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) return;

        const enemyAttack = this.currentCombat.enemy.attack || 10;
        // Boss AoE damage is usually a bit lower per target
        const aoeDamage = Math.floor(enemyAttack * 0.7);

        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return;

            const hero = this.partyManager.getHeroById(heroData.id);
            if (!hero) return;

            // Calculate final damage with defense
            const finalDamage = this.damageCalculator.calculateDamage(
                aoeDamage,
                heroData.defense || 0,
                enemy,
                hero
            );

            // Apply AoE damage
            heroData.currentHealth = Math.max(0, heroData.currentHealth - finalDamage);

            // Show damage number
            const heroX = hero.x || hero.sprite?.x || 0;
            const heroY = hero.y || hero.sprite?.y || 0;
            this.damageCalculator.showDamageNumber(heroX, heroY - 50, finalDamage);
            
            // Emit damage taken event for stats
            if (finalDamage > 0) {
                this.scene.events.emit(GameEvents.COMBAT.DAMAGE_TAKEN, { amount: finalDamage });
            }
        });

        const enemyX = enemy.x || enemy.sprite?.x || 0;
        const enemyY = (enemy.y || enemy.sprite?.y || 0);
        this.damageCalculator.showFloatingText(enemyX, enemyY - 80, 'AoE ATTACK!', '#ff8800');
        this.combatVisuals.updateHealthBars();
    }

    /**
     * Execute a Cleave attack (hits tank and 2 nearby DPS)
     * Delegates to BossMechanics subsystem.
     * @param {Object} enemy - Enemy object
     */
    executeCleave(enemy) {
        if (!this.bossMechanics || !enemy) return;
        this.bossMechanics.executeCleave(enemy, this.currentCombat, this.partyManager);
    }

    /**
     * Execute Intimidating Shout (debuffs all heroes)
     * @param {Object} enemy - Enemy object
     */
    executeIntimidatingShout(enemy) {
        if (!this.partyManager || !this.currentCombat?.party?.heroes) return;

        const heroes = this.currentCombat.party?.heroes || [];
        if (!Array.isArray(heroes) || heroes.length === 0) return;
        
        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return;
            const hero = this.partyManager.getHeroById(heroData.id);
            if (hero) {
                this.statusEffectsManager.applyEffect(hero, 'debuff_attack', 4);
            }
        });

        const enemyX = enemy.x || enemy.sprite?.x || 0;
        const enemyY = enemy.y || enemy.sprite?.y || 0;
        this.damageCalculator.showFloatingText(enemyX, enemyY - 80, 'INTIMIDATING SHOUT!', '#888888');
        this.combatVisuals.updateHealthBars();
    }

    /**
     * Spawn additional enemies for boss
     * @param {Object} enemy - Boss enemy object
     * @param {number} count - Number of adds to spawn
     */
    spawnBossAdds(enemy, count = 2) {
        if (!this.scene || !enemy || !this.scene.worldManager) return;

        const enemyId = enemy.data?.id || enemy.id;
        Logger.info('CombatManager', `Boss ${enemyId} summons ${count} adds!`);

        this.damageCalculator.showFloatingText(enemy.x || 0, (enemy.y || 0) - 80, `SUMMONS ${count} ADDS!`, '#ff00ff');

        // Initialize adds array in combat state if it doesn't exist
        if (!this.currentCombat.adds) {
            this.currentCombat.adds = [];
        }

        for (let i = 0; i < count; i++) {
            // Spawn a basic enemy (like a goblin or slime) as an add
            const addType = Math.random() > 0.5 ? 'goblin' : 'slime';
            const add = this.scene.worldManager.createEnemy(0, 0, false); 
            if (add) {
                add.id = `add_${Date.now()}_${i}`;
                add.isAdd = true;
                
                // Position around the boss
                add.x = enemy.x + (Math.random() - 0.5) * 200;
                add.y = enemy.y + (Math.random() - 0.5) * 100;

                // Create sprite
                this.scene.worldManager.createEnemySprite(add);
                
                // Add to combat adds
                this.currentCombat.adds.push({
                    id: add.id,
                    instance: add,
                    maxHealth: add.data.stats.health,
                    currentHealth: add.data.stats.health,
                    attack: add.data.stats.attack,
                    defense: add.data.stats.defense
                });

                // Initialize threat for add
                this.combatAI.initializeEnemyThreat(add);
            }
        }
    }

    /**
     * Execute hero ability effect in party combat
     * @param {Object} hero - Hero object
     * @param {Object} abilityResult - Ability result
     * @param {Object} heroData - Hero data from combat state
     * @param {number} index - Hero index for visual offset
     * @param {number} enemyX - Enemy X position
     * @param {number} enemyY - Enemy Y position
     */
    executeHeroAbilityEffect(hero, abilityResult, heroData, index, enemyX, enemyY) {
        if (!abilityResult || !abilityResult.effects) return;

        // Get hero position for floating text
        const heroX = hero.x || hero.sprite?.x || 0;
        const heroY = hero.y || hero.sprite?.y || 0;

        // 1. Trigger high-quality visuals via AbilityManager (Enhanced Phase 9 Version)
        this.abilityManager.useAbility(hero, abilityResult.ability, this.enemy);

        // 2. Logic: Handle damage/healing/status effects
        const effects = abilityResult.effects;
        const heroRole = hero.role || heroData.role || 'dps';
        const tacticalMultipliers = this.getTacticalMultipliers(heroRole);

        // Check for interrupt
        if (effects.interrupt && this.enemy.isCasting) {
            this.interruptEnemy();
        }

        switch (abilityResult.ability) {
            case 'autoAttack':
                // Handle auto-attack damage (already handled in executeHeroAutoAttack, but if called from here)
                const effectiveAttack = Math.floor(heroData.attack * tacticalMultipliers.damage);

                const damage = this.damageCalculator.calculateDamage(
                    effectiveAttack,
                    this.currentCombat.enemy.defense,
                    hero,
                    this.enemy
                );
                this.damageCalculator.dealDamage(this.enemy, damage, this.currentCombat, this.hero);

                // Add threat
                const enemyId = this.enemy.data?.id || this.enemy.id;
                let threatMultiplier = 1.0;
                if (heroRole === 'tank') {
                    threatMultiplier = 2.0;
                } else if (heroRole === 'healer') {
                    threatMultiplier = 0.5;
                }
                
                // Apply tactical multiplier
                threatMultiplier *= tacticalMultipliers.threat;
                
                this.addThreat(enemyId, heroData.id, damage, threatMultiplier);

                // Show damage
                const offsetX = (index - (this.currentCombat.party.heroes.length / 2)) * 15;
                this.damageCalculator.showDamageNumber(enemyX + offsetX, enemyY - 50 - (index * 10), damage);

                if (damage > 0) {
                    this.scene.events.emit(GameEvents.COMBAT.DAMAGE_DEALT, { amount: damage });
                }
                break;

            case 'heal':
                // Handle healing logic (Enhanced Phase 9 Version)
                const healTarget = this.shouldHealAlly(hero, this.currentCombat.party);
                const targetId = healTarget || heroData.id;
                const targetHeroData = this.currentCombat.party.heroes.find(h => h.id === targetId);
                
                if (targetHeroData) {
                    const healAmount = effects.amount || Math.floor(targetHeroData.maxHealth * 0.2);
                    targetHeroData.currentHealth = Math.min(
                        targetHeroData.maxHealth,
                        targetHeroData.currentHealth + healAmount
                    );
                    
                    const targetHero = this.partyManager.getHeroById(targetId);
                    if (targetHero) {
                        const targetX = targetHero.x || targetHero.sprite?.x || 0;
                        const targetY = targetHero.y || targetHero.sprite?.y || 0;
                        this.damageCalculator.showFloatingText(targetX, targetY - 80, `HEAL +${healAmount}`, '#00ff00');
                    }
                }
                break;

            case 'defensive':
                // Defensive buff already applied by AbilityManager
                this.damageCalculator.showFloatingText(heroX, heroY - 80, 'DEFENSIVE STANCE!', '#00ffff');
                break;

            case 'smite':
            case 'shieldBash':
                // Handle damage abilities
                const abilityDamage = effects.damage || heroData.attack;
                const finalDamage = this.damageCalculator.calculateDamage(
                    abilityDamage,
                    this.currentCombat.enemy.defense,
                    hero,
                    this.enemy
                );
                this.damageCalculator.dealDamage(this.enemy, finalDamage, this.currentCombat, this.hero);

                // Add threat
                const abilityEnemyId = this.enemy.data?.id || this.enemy.id;
                let abilityThreatMultiplier = 1.0;
                if (heroRole === 'tank') {
                    abilityThreatMultiplier = 2.5; // Higher threat for tank abilities
                } else if (heroRole === 'healer') {
                    abilityThreatMultiplier = 0.5;
                }
                this.addThreat(abilityEnemyId, heroData.id, finalDamage, abilityThreatMultiplier);

                // Show damage
                const abilityOffsetX = (index - (this.currentCombat.party.heroes.length / 2)) * 15;
                this.damageCalculator.showDamageNumber(enemyX + abilityOffsetX, enemyY - 50 - (index * 10), finalDamage);

                // Show ability name
                this.damageCalculator.showFloatingText(heroX, heroY - 80, abilityResult.name.toUpperCase() + '!', '#ff8800');

                if (finalDamage > 0) {
                    this.scene.events.emit(GameEvents.COMBAT.DAMAGE_DEALT, { amount: finalDamage });
                }

                // Handle stun if shield bash
                if (abilityResult.ability === 'shieldBash' && effects.stun) {
                    // Apply stun to enemy (would need status effects manager)
                    Logger.debug('CombatManager', `${heroData.id} stunned enemy with Shield Bash`);
                }
                break;

            case 'divineAura':
                // Buff already applied by AbilityManager
                this.damageCalculator.showFloatingText(heroX, heroY - 80, 'DIVINE AURA!', '#ffff00');
                break;
        }

        Logger.debug('CombatManager', `${heroData.id} used ${abilityResult.name}`);
    }

    /**
     * Execute hero auto-attack (extracted for reuse)
     * @param {Object} hero - Hero object
     * @param {Object} heroData - Hero data
     * @param {number} index - Hero index
     * @param {number} enemyX - Enemy X position
     * @param {number} enemyY - Enemy Y position
     * @param {string} enemyId - Enemy ID
     */
    executeHeroAutoAttack(hero, heroData, index, enemyX, enemyY, enemyId) {
        // Apply tactical multipliers
        const heroRole = hero.role || heroData.role || 'dps';
        const tacticalMultipliers = this.getTacticalMultipliers(heroRole);
        const effectiveAttack = Math.floor(heroData.attack * tacticalMultipliers.damage);

        // Calculate base damage
        let damage = this.damageCalculator.calculateDamage(
            effectiveAttack,
            this.currentCombat.enemy.defense,
            hero,
            this.enemy
        );

        // Apply bloodline effects on damage dealt (Phase 10: Bloodline System Integration)
        if (this.bloodlineManager) {
            const bloodlineResult = this.bloodlineManager.onHeroDamageDealt(hero, damage, this.enemy);
            damage = bloodlineResult.damage;

            // Apply additional effects (like Dragon's Breath fire damage)
            if (bloodlineResult.additionalEffects && bloodlineResult.additionalEffects.length > 0) {
                bloodlineResult.additionalEffects.forEach(effect => {
                    if (effect.type === 'additional_damage') {
                        const additionalDamage = effect.amount;
                        this.damageCalculator.dealDamage(this.enemy, additionalDamage, this.currentCombat, hero);
                        this.damageCalculator.showDamageNumber(enemyX + offsetX, enemyY - 80 - (index * 10), additionalDamage, effect.damageType || 'normal');
                    }
                });
            }
        }

        // Apply damage to enemy
        this.damageCalculator.dealDamage(this.enemy, damage, this.currentCombat, this.hero);

        // Add threat for this hero
        let threatMultiplier = 1.0;
        if (heroRole === 'tank') {
            threatMultiplier = 2.0;
        } else if (heroRole === 'healer') {
            threatMultiplier = 0.5;
        }
        
        // Apply tactical threat multiplier
        threatMultiplier *= tacticalMultipliers.threat;
        
        this.addThreat(enemyId, heroData.id, damage, threatMultiplier);

        // Emit statistics event
        if (damage > 0) {
            this.scene.events.emit(GameEvents.COMBAT.DAMAGE_DEALT, { amount: damage });
        }

        // Show damage number
        const heroes = this.currentCombat.party.heroes || [];
        const offsetX = (index - heroes.length / 2) * 15;
        this.damageCalculator.showDamageNumber(enemyX + offsetX, enemyY - 50 - (index * 10), damage);

        Logger.debug('CombatManager', `${heroData.id} auto-attacks for ${damage} damage`);
    }

    /**
     * Coordinate party abilities to prevent all using same ability
     * @param {Array} heroes - Array of hero data
     * @returns {Object} - Map of ability name to usage count
     */
    coordinatePartyAbilities(heroes) {
        const abilityUsage = {};

        if (!Array.isArray(heroes) || heroes.length === 0) {
            return abilityUsage;
        }

        // Count planned ability usage (simulate selection)
        heroes.forEach(heroData => {
            if (heroData.currentHealth <= 0) return;

            const hero = this.partyManager?.getHeroById(heroData.id);
            if (!hero) return;

            const combatStateForHero = {
                hero: heroData,
                enemy: this.currentCombat.enemy,
                party: this.currentCombat.party
            };

            const abilityName = this.abilityManager.selectAbility(hero, combatStateForHero);
            abilityUsage[abilityName] = (abilityUsage[abilityName] || 0) + 1;
        });

        return abilityUsage;
    }

    /**
     * Determine if healer should heal an ally instead of self
     * @param {Object} healer - Healer hero object
     * @param {Object} party - Party combat state
     * @returns {string|null} - Ally hero ID to heal, or null to heal self
     */
    shouldHealAlly(healer, party) {
        if (!party || !Array.isArray(party.heroes)) return null;

        const healerData = party.heroes.find(h => h.id === healer.id);
        if (!healerData) return null;

        const healerHealthPercent = healerData.currentHealth / healerData.maxHealth;

        // Find lowest health ally with tank bias (excluding self)
        let lowestHealthPercent = 1.0;
        let targetHeroId = null;
        let tankHeroId = null;
        let tankHealthPercent = 1.0;

        party.heroes.forEach(heroData => {
            if (heroData.id === healer.id || heroData.currentHealth <= 0) return;

            const healthPercent = heroData.currentHealth / heroData.maxHealth;

            // Track tank separately for bias
            if (heroData.role === 'tank') {
                tankHeroId = heroData.id;
                tankHealthPercent = healthPercent;
            }

            // Find lowest health ally (for non-tank priority)
            if (healthPercent < lowestHealthPercent && heroData.role !== 'tank') {
                lowestHealthPercent = healthPercent;
                targetHeroId = heroData.id;
            }
        });

        // Tank bias: Prioritize tank if tank health < 70% (weighted priority for tank stability)
        if (tankHeroId && tankHealthPercent < 0.7) {
            // Heal tank if tank health is lower than healer OR if tank is below 70% and healer is above 60%
            if (tankHealthPercent < healerHealthPercent || (tankHealthPercent < 0.7 && healerHealthPercent > 0.6)) {
                return tankHeroId;
            }
        }

        // Otherwise, heal lowest health ally if they're lower than healer and below 60%
        if (targetHeroId && lowestHealthPercent < healerHealthPercent && lowestHealthPercent < 0.6) {
            return targetHeroId;
        }

        // Otherwise heal self
        return null;
    }

    /**
     * Select hero target based on role
     * @param {Object} hero - Hero object
     * @param {Object} enemy - Enemy object
     * @returns {Object} - Target (enemy or ally)
     */
    selectHeroTarget(hero, enemy) {
        const role = hero.role || 'dps';

        // Tanks always target enemy
        if (role === 'tank') {
            return { type: 'enemy', target: enemy };
        }

        // Healers can target allies for healing
        if (role === 'healer') {
            const healTarget = this.shouldHealAlly(hero, this.currentCombat.party);
            if (healTarget) {
                const targetHero = this.partyManager?.getHeroById(healTarget);
                if (targetHero) {
                    return { type: 'ally', target: targetHero };
                }
            }
        }

        // DPS always target enemy
        return { type: 'enemy', target: enemy };
    }

    /**
     * Get damage color based on type and critical status
     * @param {string} damageType - Type of damage
     * @param {boolean} isCritical - Whether critical
     * @returns {string} Color hex string
     */
    getDamageColor(damageType, isCritical) {
        if (isCritical) return '#ff6b6b';

        const colors = {
            physical: '#ff6b6b',
            magical: '#4ecdc4',
            healing: '#2ed573',
            default: '#ffffff'
        };

        return colors[damageType] || colors.default;
    }
}

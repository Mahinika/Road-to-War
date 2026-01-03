import Phaser from 'phaser';
import { ErrorHandler } from '../utils/error-handler.js';
import { Logger } from '../utils/logger.js';
import { TypeValidator } from '../utils/type-validators.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { GameEvents } from '../utils/event-constants.js';
import { getPlaceholderKey, ensurePlaceholderTexture } from '../utils/placeholder-helper.js';
import { ManagerValidationMixin, ValidationBuilder } from '../utils/input-validation.js';
import { BaseManager } from './base-manager.js';

/**
 * Equipment Manager - Handles hero equipment and stat modifications
 * Manages equipment slots, stat calculations, and equipment display
 */

export class EquipmentManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return ['partyManager'];
    }

    /**
     * Create a new EquipmentManager
     * @param {Phaser.Scene} scene - Phaser scene instance
     * @param {Object} [config] - Configuration object
     * @param {Object} [config.partyManager] - Party manager instance
     */
    constructor(scene, config = {}) {
        super(scene, config);
        // Apply validation mixin
        Object.assign(this, ManagerValidationMixin);
        // Use DataService if available, fallback to direct cache access
        this.dataService = config.dataService || this.scene.dataService || null;
        this.itemsData = this.dataService?.getItems() || this.scene.cache.json.get('items');
        this.worldConfig = this.dataService?.getWorldConfig() || this.scene.cache.json.get('worldConfig');
        this.skillGemsData = this.dataService?.getSkillGems()?.skillGems || this.scene.cache.json.get('skillGems')?.skillGems || {};
        this.partyManager = config.partyManager || null;

        Logger.info('EquipmentManager', 'Initialized');

        // Current hero being viewed (for single-hero backward compatibility)
        this.currentHeroId = null;

        // Per-hero equipment slots - Map<heroId, equipmentSlots>
        this.heroEquipment = new Map();

        // Registry for unique item instances (procedural items)
        this.itemInstances = new Map();

        // Equipment slot template
        this.equipmentSlotTemplate = {
            head: null,
            neck: null,
            shoulder: null,
            cloak: null,
            chest: null,
            shirt: null,
            tabard: null,
            bracer: null,
            hands: null,
            waist: null,
            legs: null,
            boots: null,
            ring1: null,
            ring2: null,
            trinket1: null,
            trinket2: null,
            weapon: null,
            offhand: null
        };

        // For backward compatibility, keep single-hero slots
        this.equipmentSlots = { ...this.equipmentSlotTemplate };

        // Base stats (without equipment) - loaded from world-config.json
        const startingStats = this.worldConfig.player.startingStats;
        this.baseStats = {
            health: startingStats.health,
            maxHealth: startingStats.maxHealth,
            attack: startingStats.attack,
            defense: startingStats.defense
        };

        // Per-hero current stats - Map<heroId, stats>
        this.heroStats = new Map();

        // Current stats (with equipment) - for backward compatibility
        this.currentStats = { ...this.baseStats };

        // Visual elements
        this.equipmentDisplay = null;
        this.statDisplay = null;

        // Events
        this.setupEventListeners();
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        
        // Ensure partyManager is available (it should be injected via config during construction)
        // If not in config, try to get it from scene or manager registry
        if (!this.partyManager) {
            if (this.scene && this.scene.partyManager) {
                this.partyManager = this.scene.partyManager;
            } else if (this.scene && this.scene.managerRegistry) {
                this.partyManager = this.scene.managerRegistry.get('partyManager');
            }
        }
        
        Logger.info('EquipmentManager', 'Initialized with party support:', this.partyManager ? 'yes' : 'no');
        
        // Initialize with first hero from party if available
        if (this.partyManager && typeof this.partyManager.getHeroes === 'function') {
            try {
                const heroes = this.partyManager.getHeroes();
                if (heroes && Array.isArray(heroes) && heroes.length > 0) {
                    const firstHero = heroes[0];
                    if (firstHero && firstHero.id) {
                        this.currentHeroId = firstHero.id;
                        this.hero = firstHero;
                        Logger.info('EquipmentManager', 'Auto-initialized with first party hero:', this.currentHeroId);
                    }
                }
            } catch (error) {
                Logger.warn('EquipmentManager', 'Could not auto-initialize with party hero:', error.message);
            }
        } else {
            Logger.warn('EquipmentManager', 'No partyManager available during init - will initialize later when party is created');
        }
    }

    /**
     * Reload item data for hot-reload support
     * @async
     */
    async reloadItemData() {
        try {
            Logger.info('EquipmentManager', 'Reloading item data...');

            // Reload items.json
            await this.scene.cache.json.remove('items');
            this.scene.load.json('items', '/data/items.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-items', resolve);
                this.scene.load.start();
            });

            // Reload skill-gems.json if it exists
            try {
                await this.scene.cache.json.remove('skillGems');
                this.scene.load.json('skillGems', '/data/skill-gems.json');
                await new Promise((resolve) => {
                    this.scene.load.once('filecomplete-json-skillGems', resolve);
                    this.scene.load.start();
                });
            } catch (error) {
                Logger.warn('EquipmentManager', 'skill-gems.json not available for reload');
            }

            // Update local references
            this.itemsData = this.scene.cache.json.get('items');
            this.skillGemsData = this.scene.cache.json.get('skillGems')?.skillGems || {};

            // Validate the reloaded data
            if (!this.itemsData) {
                throw new Error('Failed to reload items.json');
            }

            Logger.info('EquipmentManager', 'Item data reloaded successfully');

            // Recalculate stats for all heroes since item stats may have changed
            for (const [heroId, equipment] of this.heroEquipment) {
                this.calculateStats(heroId);
            }

            // Emit event for UI to refresh equipment displays
            this.scene.events.emit(GameEvents.EQUIPMENT_DATA_RELOADED);

        } catch (error) {
            Logger.error('EquipmentManager', 'Failed to reload item data:', error);
            throw error;
        }
    }

    /**
     * Sets up event listeners for equipment-related game events.
     * Handles item pickup, equip, and unequip requests.
     */
    setupEventListeners() {
        // Listen for item pickup events
        this.scene.events.on(GameEvents.ITEM.PICKED_UP, (data) => {
            this.handleItemPickup(data.item);
        });

        // Listen for equipment change requests
        this.scene.events.on('equip_item', (data) => {
            this.equipItem(data.itemId, data.slot);
        });

        this.scene.events.on('unequip_item', (data) => {
            this.unequipItem(data.slot);
        });
    }

    /**
     * Initializes the EquipmentManager with a primary hero.
     * @param {Object} hero - Hero character object to initialize with.
     * @deprecated Use initializeWithHero() instead. This method conflicts with BaseManager.init()
     */
    initWithHero(hero) {
        if (!hero) {
            Logger.warn('EquipmentManager', 'initWithHero called without hero, using party manager');
            // Try to get first hero from party manager
            if (this.partyManager && this.partyManager.getHeroes) {
                const heroes = this.partyManager.getHeroes();
                if (heroes && heroes.length > 0) {
                    hero = heroes[0];
                }
            }
        }
        
        if (hero) {
            this.hero = hero;
            this.currentHeroId = hero.id || 'main'; // Set current hero
            this.createEquipmentDisplay();
            this.updateStatDisplay();
            Logger.info('EquipmentManager', 'Initialized with hero:', this.currentHeroId);
        } else {
            Logger.warn('EquipmentManager', 'No hero available for initialization');
        }
    }

    /**
     * Gets equipment slots for a specific hero.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {Object} Equipment slots for the hero.
     */
    getHeroEquipment(heroId = null) {
        heroId = heroId || this.currentHeroId;
        if (!this.heroEquipment.has(heroId)) {
            this.heroEquipment.set(heroId, { ...this.equipmentSlotTemplate });
        }
        return this.heroEquipment.get(heroId);
    }

    /**
     * Gets current stats for a specific hero.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {Object} Current stats for the hero.
     */
    getHeroStats(heroId = null) {
        heroId = heroId || this.currentHeroId;
        if (!this.heroStats.has(heroId)) {
            this.heroStats.set(heroId, { ...this.baseStats });
        }
        return this.heroStats.get(heroId);
    }

    /**
     * Switches the current hero being managed by the EquipmentManager.
     * Updates internal references and UI displays.
     * @param {string} heroId - Hero ID to switch to.
     * @returns {boolean} True if switch successful.
     */
    switchHero(heroId) {
        if (!heroId) {
            Logger.error('EquipmentManager', 'Invalid heroId for switching');
            return false;
        }

        this.currentHeroId = heroId;
        // Update the equipmentSlots reference to current hero
        this.equipmentSlots = this.getHeroEquipment(heroId);
        // Update the currentStats reference to current hero
        this.currentStats = this.getHeroStats(heroId);

        this.updateEquipmentDisplay();
        this.updateStatDisplay();

        Logger.info('EquipmentManager', 'Switched to hero:', heroId);
        return true;
    }

    /**
     * Synchronizes internal equipment and stats references with the current hero ID.
     * Maintained for backward compatibility.
     */
    syncCurrentHero() {
        if (this.currentHeroId) {
            this.equipmentSlots = this.getHeroEquipment(this.currentHeroId);
            this.currentStats = this.getHeroStats(this.currentHeroId);
        }
    }

    /**
     * Handles item pickup events from the LootManager.
     * Auto-equips items if the slot is empty, otherwise suggests if the new item is better.
     * @param {Object} item - Picked up item object.
     */
    handleItemPickup(item) {
        // Auto-equip if it's better than current equipment and slot is empty
        const slot = item.data.slot;
        if (!this.equipmentSlots[slot]) {
            this.equipItem(item.id, slot);
        } else {
            // Compare stats and suggest equipment if better
            const currentItem = this.getItemData(this.equipmentSlots[slot]);
            if (this.isItemBetter(item.data, currentItem)) {
                this.showEquipmentSuggestion(item.data, slot);
            }
        }
    }

    /**
     * Equips an item to a specific slot for a hero.
     * Validates item existence, slot compatibility, role restrictions, and level requirements.
     * @param {string} itemId - ID of item to equip.
     * @param {string} slot - Equipment slot name.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {boolean} True if equipped successfully.
     */
    equipItem(itemId, slot, heroId = null) {
        try {
            // Use current hero if not specified
            heroId = heroId || this.currentHeroId;

            // Use ValidationBuilder for clean, data-driven validation (Refactored)
            if (!this.quickValidate(builder => builder
                .validateItemId(itemId, this.itemsData)
                .validateSlot(slot, this)
                .validateHeroId(heroId, this.partyManager)
                .execute(), 'EquipmentManager.equipItem', Logger)) {
                return false;
            }

            const itemData = this.getItemData(itemId);
            const heroEquipment = this.getHeroEquipment(heroId);

            // Check role restriction if item has one
            if (itemData.role && this.partyManager && heroId) {
                const hero = this.partyManager.getHeroById(heroId);
                if (hero && hero.role !== itemData.role) {
                    Logger.warn('EquipmentManager', `Item ${itemId} requires role ${itemData.role}, but hero is ${hero.role}`);
                    // Still allow equipping, but log warning
                }
            }

            // Check level requirement if item has one
            if (itemData.levelRequirement && this.partyManager && heroId) {
                const hero = this.partyManager.getHeroById(heroId);
                if (hero && (hero.level || 1) < itemData.levelRequirement) {
                    Logger.warn('EquipmentManager', `Item ${itemId} requires level ${itemData.levelRequirement}, but hero is level ${hero.level || 1}`);
                    // Block equipping if level is too low
                    if (this.scene && this.scene.showFloatingText) {
                        const heroX = hero.sprite?.x || hero.x || 0;
                        const heroY = hero.sprite?.y || hero.y || 0;
                        this.scene.showFloatingText(heroX, heroY - 100, `Requires Level ${itemData.levelRequirement}!`, '#ff0000');
                    }
                    return false;
                }
            }

            if (itemData.slot !== slot) {
                Logger.error('EquipmentManager', `Item ${itemId} cannot be equipped in slot ${slot}`);
                return false;
            }

            // Check armor proficiency (WotLK style)
            if (itemData.type === 'armor' && itemData.armorType && this.partyManager && heroId) {
                const hero = this.partyManager.getHeroById(heroId);
                if (hero && hero.classId) {
                    const classData = this.scene.cache.json.get('classes')?.[hero.classId];
                    if (classData && classData.armorProficiency) {
                        if (!classData.armorProficiency.includes(itemData.armorType)) {
                            const message = `Cannot wear ${itemData.armorType} armor!`;
                            Logger.warn('EquipmentManager', `Hero ${heroId} (${hero.classId}) ${message}`);
                            if (this.scene && this.scene.showFloatingText) {
                                const heroX = hero.sprite?.x || hero.x || 0;
                                const heroY = hero.sprite?.y || hero.y || 0;
                                this.scene.showFloatingText(heroX, heroY - 100, message, '#ff0000');
                            }
                            return false;
                        }
                    }
                }
            }

            // Unequip current item if any
            const oldItem = heroEquipment[slot];
            if (oldItem) {
                this.unequipItem(slot, false, heroId); // Don't update display yet
            }

            // Equip new item to hero
            heroEquipment[slot] = itemId;

            // Update stats for this hero
            this.calculateStats(heroId);

            // Update displays only if this is the current hero
            if (heroId === this.currentHeroId) {
                this.updateEquipmentDisplay();
                this.updateStatDisplay();
            }

            // Get stat differences for visual feedback
            const oldItemData = oldItem ? this.getItemData(oldItem) : null;
            const statDifferences = this.getStatDifference(itemData, oldItemData, heroId);

            // Show equip feedback with stat changes
            this.showEquipFeedback(itemData, true, statDifferences);

            // Show floating text with stat changes if significant
            if (Object.keys(statDifferences).length > 0 && this.scene && heroId === this.currentHeroId) {
                this.showStatChangeFeedback(statDifferences);
            }

            // Emit equipment change event
            this.scene.events.emit(GameEvents.ITEM.EQUIPMENT_CHANGED, {
                slot: slot,
                itemId: itemId,
                oldItemId: oldItem,
                heroId: heroId,
                stats: this.getHeroStats(heroId),
                statDifferences: statDifferences
            });

            Logger.info('EquipmentManager', `Equipped ${itemData.name} to ${slot}`);
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'EquipmentManager.equipItem');
            return false;
        }
    }

    /**
     * Unequips an item from a specific slot for a hero.
     * Updates stats and optionally updates UI displays.
     * @param {string} slot - Equipment slot name.
     * @param {boolean} [updateDisplay=true] - Whether to update UI displays.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {string|null} ID of unequipped item or null if slot was empty.
     */
    unequipItem(slot, updateDisplay = true, heroId = null) {
        heroId = heroId || this.currentHeroId;

        // Use ValidationBuilder for clean, data-driven validation (Refactored)
        if (!this.quickValidate(builder => builder
            .validateSlot(slot, this)
            .validateHeroId(heroId, this.partyManager)
            .execute(), 'EquipmentManager.unequipItem', Logger)) {
            return null;
        }

        const heroEquipment = this.getHeroEquipment(heroId);
        const itemId = heroEquipment[slot];
        if (!itemId) {
            return null; // Nothing to unequip
        }

        const itemData = this.getItemData(itemId);

        // Remove from equipment
        heroEquipment[slot] = null;

        // Update stats for this hero
        this.calculateStats(heroId);

        // Get stat differences for visual feedback
        const statDifferences = this.getStatDifference(null, itemData, heroId);

        // Update displays if requested and this is current hero
        if (updateDisplay && heroId === this.currentHeroId) {
            this.updateEquipmentDisplay();
            this.updateStatDisplay();
            this.showEquipFeedback(itemData, false, statDifferences);

            // Show floating text with stat changes if significant
            if (Object.keys(statDifferences).length > 0) {
                this.showStatChangeFeedback(statDifferences);
            }
        }

        // Emit equipment change event
        this.scene.events.emit(GameEvents.ITEM.EQUIPMENT_CHANGED, {
            slot: slot,
            itemId: null,
            oldItemId: itemId,
            heroId: heroId,
            stats: this.getHeroStats(heroId)
        });

        Logger.info('EquipmentManager', `Unequipped ${itemData.name} from ${slot} for hero ${heroId}`);
        return itemId;
    }

    /**
     * Gets base stats for a specific hero (before equipment).
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {Object} Base stats object.
     */
    getBaseStats(heroId = null) {
        heroId = heroId || this.currentHeroId;

        // Try to get base stats from hero object if party manager exists
        if (this.partyManager && heroId) {
            const hero = this.partyManager.getHeroById(heroId);
            if (hero && hero.baseStats) {
                return { ...hero.baseStats };
            }
        }

        // Fallback to default base stats
        return { ...this.baseStats };
    }

    /**
     * Get gem data by ID
     * @param {string} gemId - Gem ID
     * @returns {Object|null} - Gem data or null
     */
    /**
     * Get data for a specific skill gem
     * @param {string} gemId - Gem ID
     * @returns {Object|null} - Gem data or null
     */
    getGemData(gemId) {
        if (!gemId) return null;
        
        // Search through gem categories
        for (const category of Object.values(this.skillGemsData)) {
            if (category[gemId]) {
                return category[gemId];
            }
        }
        return null;
    }

    /**
     * Calculates current stats for a hero based on equipment, gems, sets, prestige bonuses, and specializations.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {Object} Calculated stats object.
     */
    calculateStats(heroId = null) {
        // PerformanceMonitor.start('EquipmentManager.calculateStats');
        try {
            heroId = heroId || this.currentHeroId;

            // Get base stats for this hero
            const baseStats = this.getBaseStats(heroId);
            const stats = { ...baseStats };

            // Track percentage modifiers separately (apply after flat bonuses)
            const percentageModifiers = {};

            // Get hero's equipment
            const heroEquipment = this.getHeroEquipment(heroId);

            // First pass: Apply flat bonuses and collect percentage modifiers
            for (const [slot, itemId] of Object.entries(heroEquipment)) {
                if (itemId) {
                    const itemData = this.getItemData(itemId);
                    if (itemData) {
                        // Apply base item stats
                        if (itemData.stats) {
                            for (const [stat, value] of Object.entries(itemData.stats)) {
                                this.applyStatBonus(stats, percentageModifiers, stat, value);
                            }
                        }

                        // Apply gem bonuses from sockets
                        if (itemData.socketedGems && Array.isArray(itemData.socketedGems)) {
                            itemData.socketedGems.forEach(gemId => {
                                if (gemId) {
                                    const gemData = this.getGemData(gemId);
                                    if (gemData) {
                                        this.applyGemBonus(stats, percentageModifiers, gemData);
                                    }
                                }
                            });
                        }
                    }
                }
            }

            // Second pass: Apply percentage modifiers
            for (const [baseStat, percentValue] of Object.entries(percentageModifiers)) {
                if (stats.hasOwnProperty(baseStat) && stats[baseStat] > 0) {
                    // Apply percentage bonus to the stat (after flat bonuses)
                    stats[baseStat] = Math.floor(stats[baseStat] * (1 + percentValue / 100));
                }
            }

            // Third pass: Apply set bonuses (Phase 4: Item Set System)
            const setBonuses = this.calculateSetBonuses(heroId);
            for (const [stat, value] of Object.entries(setBonuses)) {
                if (stats.hasOwnProperty(stat)) {
                    stats[stat] = (stats[stat] || 0) + value;
                } else {
                    stats[stat] = value;
                }
            }

            // Fourth pass: Apply prestige gear effectiveness (Phase 6: Prestige Gear Integration)
            if (this.scene.prestigeManager) {
                const gearEffectiveness = this.scene.prestigeManager.getGearEffectiveness();
                if (gearEffectiveness > 1.0) {
                    // Calculate equipment-only stats (before set bonuses)
                    const equipmentStatsOnly = {};
                    for (const [slot, itemId] of Object.entries(heroEquipment)) {
                        if (itemId) {
                            const itemData = this.getItemData(itemId);
                            if (itemData && itemData.stats) {
                                for (const [stat, value] of Object.entries(itemData.stats)) {
                                    if (!stat.endsWith('Percent') && !stat.endsWith('_percent')) {
                                        equipmentStatsOnly[stat] = (equipmentStatsOnly[stat] || 0) + value;
                                    }
                                }
                            }
                        }
                    }

                    // Apply effectiveness multiplier to equipment stats only
                    for (const [stat, value] of Object.entries(equipmentStatsOnly)) {
                        if (stats.hasOwnProperty(stat)) {
                            const baseValue = baseStats[stat] || 0;
                            const equipmentValue = value;
                            const effectiveEquipmentValue = equipmentValue * gearEffectiveness;
                            stats[stat] = baseValue + effectiveEquipmentValue;
                        }
                    }
                }
            }

            // Fifth pass: Apply specialization passives
            const hero = this.partyManager?.getHeroById(heroId);
            if (hero && hero.classId && hero.specId) {
                // ... existing spec logic ...
            }

            // Sixth pass: Apply Armor Specialization bonus (WotLK style)
            if (hero && hero.classId) {
                const classData = this.scene.cache.json.get('classes')?.[hero.classId];
                if (classData && classData.armorSpecialization) {
                    const majorArmorSlots = ['head', 'shoulder', 'chest', 'bracer', 'hands', 'waist', 'legs', 'boots'];
                    let allMatched = true;
                    let hasAllSlotsEquipped = true;

                    for (const slot of majorArmorSlots) {
                        const equippedId = heroEquipment[slot];
                        if (!equippedId) {
                            hasAllSlotsEquipped = false;
                            allMatched = false;
                            break;
                        }
                        const item = this.getItemData(equippedId);
                        if (!item || item.armorType !== classData.armorSpecialization) {
                            allMatched = false;
                            break;
                        }
                    }

                    if (allMatched && hasAllSlotsEquipped) {
                        const primaryStat = classData.primaryStat || 'strength';
                        if (stats.hasOwnProperty(primaryStat)) {
                            // Apply 5% bonus to primary stat
                            stats[primaryStat] = Math.floor(stats[primaryStat] * 1.05);
                            if (!stats.passives) stats.passives = {};
                            stats.passives.armorSpecialization = 0.05;
                            Logger.debug('EquipmentManager', `Applied Armor Specialization (5% ${primaryStat}) to hero ${heroId}`);
                        }
                    }
                }
            }

            // Ensure health doesn't exceed maxHealth
            if (stats.health > stats.maxHealth) {
                stats.health = stats.maxHealth;
            }

            // Ensure all numeric stats are integers
            for (const [stat, value] of Object.entries(stats)) {
                if (typeof value === 'number') {
                    stats[stat] = Math.floor(value);
                }
            }

            // Store stats for this hero
            this.heroStats.set(heroId, stats);

            // Update references if this is current hero
            if (heroId === this.currentHeroId) {
                this.currentStats = stats;
                // Update hero sprite stats if hero exists
                if (this.hero && this.hero.data) {
                    this.hero.data.stats = { ...this.currentStats };
                }
            }

            // PerformanceMonitor.end('EquipmentManager.calculateStats');
            return stats;
        } catch (error) {
            // PerformanceMonitor.end('EquipmentManager.calculateStats');
            ErrorHandler.handle(error, 'EquipmentManager.calculateStats', 'error');
            return this.getHeroStats(heroId);
        }
    }

    /**
     * Applies bonuses from a skill gem to the stat totals and percentage modifiers.
     * @param {Object} stats - Stats object to modify.
     * @param {Object} percentageModifiers - Map of percentage bonuses to apply later.
     * @param {Object} gemData - Gem data definition from configuration.
     */
    applyGemBonuses(stats, percentageModifiers, gemData) {
        if (!gemData || !gemData.effects) return;

        if (!Array.isArray(gemData.effects)) return;

        gemData.effects.forEach(effect => {
            if (effect && effect.type === 'stat_bonus' && effect.stat && effect.value) {
                this.applyStatBonus(stats, percentageModifiers, effect.stat, effect.value);
            }
            
            // Handle other gem effect types here (e.g., procs)
            if (effect.type === 'proc' && effect.stat && effect.value) {
                // Procs like 'lifesteal', 'stunChance', etc.
                if (stats.hasOwnProperty(effect.stat)) {
                    stats[effect.stat] = (stats[effect.stat] || 0) + effect.value;
                } else {
                    stats[effect.stat] = effect.value;
                }
            }
        });
    }

    /**
     * Applies a single stat bonus (flat or percentage) to stats and modifiers.
     * @param {Object} stats - Stats object to modify.
     * @param {Object} percentageModifiers - Map of percentage bonuses to apply later.
     * @param {string} stat - Name of the stat.
     * @param {number} value - Bonus value.
     */
    applyStatBonus(stats, percentageModifiers, stat, value) {
        if (stat.endsWith('Percent') || stat.endsWith('_percent')) {
            const baseStat = stat.replace(/Percent|_percent$/, '');
            if (!percentageModifiers[baseStat]) {
                percentageModifiers[baseStat] = 0;
            }
            percentageModifiers[baseStat] += value;
        } else {
            if (stats.hasOwnProperty(stat)) {
                stats[stat] = (stats[stat] || 0) + value;
            } else {
                stats[stat] = value;
            }
        }
    }

    /**
     * Applies all bonuses from a skill gem (wrapper for applyGemBonuses).
     * @param {Object} stats - Stats object to modify.
     * @param {Object} percentageModifiers - Map of percentage bonuses to apply later.
     * @param {Object} gemData - Gem data definition.
     */
    applyGemBonus(stats, percentageModifiers, gemData) {
        // Map gem properties to stats
        if (gemData.type === 'damage') {
            const statName = `${gemData.element}DamagePercent`;
            if (!percentageModifiers[statName]) {
                percentageModifiers[statName] = 0;
            }
            // Use mid value for now or specific instance value if we add it
            const val = gemData.value || (gemData.minValue + gemData.maxValue) / 2;
            percentageModifiers[statName] += val;
        } else if (gemData.type === 'utility') {
            const statName = `${gemData.effect}Chance`;
            const val = gemData.value || (gemData.minValue + gemData.maxValue) / 2;
            stats[statName] = (stats[statName] || 0) + val;
        } else if (gemData.type === 'support') {
            const statName = `${gemData.effect}BonusPercent`;
            if (!percentageModifiers[statName]) {
                percentageModifiers[statName] = 0;
            }
            const val = gemData.value || (gemData.minValue + gemData.maxValue) / 2;
            percentageModifiers[statName] += val;
        }
    }

    /**
     * Calculates active set bonuses for a hero based on equipped pieces.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {Object} Merged set bonus stats.
     */
    calculateSetBonuses(heroId = null) {
        heroId = heroId || this.currentHeroId;
        const setBonuses = {};

        if (!this.itemsData || !this.itemsData.sets) {
            return setBonuses;
        }

        const heroEquipment = this.getHeroEquipment(heroId);
        const equippedItemIds = Object.values(heroEquipment).filter(id => id !== null);

        // Check each set
        for (const [setId, setData] of Object.entries(this.itemsData.sets)) {
            if (!setData.pieces || !setData.bonuses) {
                continue;
            }

            // Count how many pieces of this set are equipped
            let equippedPieces = 0;
            for (const pieceId of setData.pieces) {
                if (equippedItemIds.includes(pieceId)) {
                    equippedPieces++;
                }
            }

            // Apply bonuses based on number of pieces equipped
            if (equippedPieces >= 2 && setData.bonuses['2']) {
                for (const [stat, value] of Object.entries(setData.bonuses['2'])) {
                    setBonuses[stat] = (setBonuses[stat] || 0) + value;
                }
            }
            if (equippedPieces >= 3 && setData.bonuses['3']) {
                for (const [stat, value] of Object.entries(setData.bonuses['3'])) {
                    setBonuses[stat] = (setBonuses[stat] || 0) + value;
                }
            }
            if (equippedPieces >= 4 && setData.bonuses['4']) {
                for (const [stat, value] of Object.entries(setData.bonuses['4'])) {
                    setBonuses[stat] = (setBonuses[stat] || 0) + value;
                }
            }
            if (equippedPieces >= 5 && setData.bonuses['5']) {
                for (const [stat, value] of Object.entries(setData.bonuses['5'])) {
                    setBonuses[stat] = (setBonuses[stat] || 0) + value;
                }
            }
        }

        return setBonuses;
    }

    /**
     * Identifies which equipment sets are currently active for a hero.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {Array<Object>} Array of active set objects with piece counts and metadata.
     */
    getActiveSets(heroId = null) {
        heroId = heroId || this.currentHeroId;
        const activeSets = [];

        if (!this.itemsData || !this.itemsData.sets) {
            return activeSets;
        }

        const heroEquipment = this.getHeroEquipment(heroId);
        const equippedItemIds = Object.values(heroEquipment).filter(id => id !== null);

        // Check each set
        for (const [setId, setData] of Object.entries(this.itemsData.sets)) {
            if (!setData.pieces) {
                continue;
            }

            // Count how many pieces of this set are equipped
            let equippedPieces = 0;
            for (const pieceId of setData.pieces) {
                if (equippedItemIds.includes(pieceId)) {
                    equippedPieces++;
                }
            }

            if (equippedPieces >= 2) {
                activeSets.push({
                    setId: setId,
                    name: setData.name,
                    equippedPieces: equippedPieces,
                    totalPieces: setData.pieces.length,
                    bonuses: setData.bonuses || {},
                    tier: setData.tier || 1
                });
            }
        }

        return activeSets;
    }

    /**
     * Recalculates stats for all heroes in the party.
     */
    recalculateAllHeroStats() {
        if (!this.partyManager) {
            // Single hero mode - just recalculate current
            this.calculateStats();
            return;
        }

        const heroes = this.partyManager?.getHeroes() || [];
        if (!Array.isArray(heroes) || heroes.length === 0) {
            Logger.warn('EquipmentManager', 'No heroes available for stat recalculation');
            return;
        }

        heroes.forEach(hero => {
            if (hero && hero.id) {
                this.calculateStats(hero.id);
            }
        });

        Logger.debug('EquipmentManager', `Recalculated stats for ${heroes.length} heroes`);
    }

    /**
     * Sockets a skill gem into an equipped item.
     * Validates item existence, socket availability, and gem compatibility.
     * @param {string} itemId - ID of item to socket into.
     * @param {number} socketIndex - Index of the socket (0-based).
     * @param {string} gemId - ID of gem to socket.
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {boolean} True if socketed successfully.
     */
    socketGem(itemId, socketIndex, gemId, heroId = null) {
        const item = this.getItemData(itemId);
        if (!item || !item.sockets || !item.socketedGems) {
            Logger.error('EquipmentManager', `Item ${itemId} does not support sockets`);
            return false;
        }

        if (socketIndex < 0 || socketIndex >= item.sockets.length) {
            Logger.error('EquipmentManager', `Invalid socket index ${socketIndex} for item ${itemId}`);
            return false;
        }

        const gemData = this.getGemData(gemId);
        if (!gemData) {
            Logger.error('EquipmentManager', `Gem ${gemId} not found`);
            return false;
        }

        // Check socket color compatibility (Meta gems only in meta sockets)
        const socketType = item.sockets[socketIndex];
        if (gemData.rarity === 'legendary' && socketType !== 'meta') {
            Logger.warn('EquipmentManager', `Legendary gem ${gemId} requires meta socket`);
            return false;
        }

        // Socket the gem
        item.socketedGems[socketIndex] = gemId;

        // Recalculate stats for the hero wearing this item
        heroId = heroId || this.currentHeroId;
        this.calculateStats(heroId);

        // Update displays if current hero
        if (heroId === this.currentHeroId) {
            this.updateStatDisplay();
            this.updateEquipmentDisplay();
        }

        Logger.info('EquipmentManager', `Socketed ${gemId} into ${item.name} slot ${socketIndex}`);
        return true;
    }

    /**
     * Unsockets a gem from an item.
     * @param {string} itemId - ID of item to unsocket from.
     * @param {number} socketIndex - Index of the socket (0-based).
     * @param {string} [heroId=null] - Hero ID (defaults to currentHeroId).
     * @returns {string|null} The unsocketed gem ID or null if none.
     */
    unsocketGem(itemId, socketIndex, heroId = null) {
        const item = this.getItemData(itemId);
        if (!item || !item.socketedGems) return null;

        if (socketIndex < 0 || socketIndex >= item.socketedGems.length) return null;

        const gemId = item.socketedGems[socketIndex];
        if (!gemId) return null;

        item.socketedGems[socketIndex] = null;

        // Recalculate stats
        heroId = heroId || this.currentHeroId;
        this.calculateStats(heroId);

        if (heroId === this.currentHeroId) {
            this.updateStatDisplay();
            this.updateEquipmentDisplay();
        }

        return gemId;
    }

    /**
     * Get item data by ID (checks both static data and instance registry)
     * @param {string} itemId - Item ID or Instance ID
     * @returns {Object|null} - Item data or null
     */
    getItemData(itemId) {
        if (!itemId) return null;

        // Check instance registry first (procedural items)
        if (this.itemInstances.has(itemId)) {
            return this.itemInstances.get(itemId);
        }

        // Check static item data
        for (const category of ['weapons', 'armor', 'accessories']) {
            if (this.itemsData[category] && this.itemsData[category][itemId]) {
                return this.itemsData[category][itemId];
            }
        }
        return null;
    }

    /**
     * Register a procedural item instance
     * @param {Object} itemData - The procedural item data
     * @returns {string} The instance ID
     */
    registerInstance(itemData) {
        if (!itemData.instanceId) {
            itemData.instanceId = `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        }
        this.itemInstances.set(itemData.instanceId, itemData);
        return itemData.instanceId;
    }

    /**
     * Get currently equipped item data for a slot
     * @param {string} slot - Equipment slot
     * @returns {Object|null} - Equipped item data or null
     */
    getEquippedItemData(slot) {
        const itemId = this.equipmentSlots[slot];
        if (!itemId) return null;
        return this.getItemData(itemId);
    }

    /**
     * Check if an item is better than current equipment
     * @param {Object} newItem - New item data
     * @param {Object} currentItem - Current item data
     * @returns {boolean} - True if new item is better
     */
    isItemBetter(newItem, currentItem) {
        if (!currentItem) return true;

        // Simple comparison: sum of stats
        const newStatSum = Object.values(newItem.stats || {}).reduce((sum, val) => sum + Math.abs(val), 0);
        const currentStatSum = Object.values(currentItem.stats || {}).reduce((sum, val) => sum + Math.abs(val), 0);

        return newStatSum > currentStatSum;
    }

    /**
     * Get stat difference between two items
     * @param {Object} newItem - New item data
     * @param {Object} currentItem - Current item data (can be null)
     * @param {string} heroId - Hero ID to calculate stats for (optional)
     * @returns {Object} Object with stat differences, e.g. { attack: 5, defense: -2, health: 10 }
     */
    getStatDifference(newItem, currentItem = null, heroId = null) {
        heroId = heroId || this.currentHeroId;

        const differences = {};

        // Get current stats with current item
        const currentStats = currentItem ? this.calculateStatsWithItem(currentItem, heroId) : this.getBaseStats(heroId);

        // Get stats with new item
        const newStats = this.calculateStatsWithItem(newItem, heroId);

        // Calculate differences
        const allStats = new Set([...Object.keys(currentStats), ...Object.keys(newStats)]);

        for (const stat of allStats) {
            const currentValue = currentStats[stat] || 0;
            const newValue = newStats[stat] || 0;
            const diff = newValue - currentValue;

            if (diff !== 0) {
                differences[stat] = diff;
            }
        }

        return differences;
    }

    /**
     * Calculate stats with a specific item equipped (for comparison)
     * @param {Object} item - Item data
     * @param {string} heroId - Hero ID
     * @returns {Object} Calculated stats
     */
    calculateStatsWithItem(item, heroId = null) {
        heroId = heroId || this.currentHeroId;
        const baseStats = this.getBaseStats(heroId);
        const stats = { ...baseStats };
        const percentageModifiers = {};

        if (item && item.stats) {
            for (const [stat, value] of Object.entries(item.stats)) {
                if (stat.endsWith('Percent') || stat.endsWith('_percent')) {
                    const baseStat = stat.replace(/Percent|_percent$/, '');
                    if (!percentageModifiers[baseStat]) {
                        percentageModifiers[baseStat] = 0;
                    }
                    percentageModifiers[baseStat] += value;
                } else {
                    if (stats.hasOwnProperty(stat)) {
                        stats[stat] = (stats[stat] || 0) + value;
                    } else {
                        stats[stat] = value;
                    }
                }
            }
        }

        // Apply percentage modifiers
        for (const [baseStat, percentValue] of Object.entries(percentageModifiers)) {
            if (stats.hasOwnProperty(baseStat) && stats[baseStat] > 0) {
                stats[baseStat] = Math.floor(stats[baseStat] * (1 + percentValue / 100));
            }
        }

        return stats;
    }

    /**
     * Create equipment display UI
     */
    createEquipmentDisplay() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Desktop-optimized positioning - center-left area
        const panelWidth = 420;
        const panelHeight = 580;
        const x = width / 2 - panelWidth / 2 - 50;
        const y = height / 2;

        // Background
        this.equipmentDisplay = this.scene.add.container(x, y);

        // Enhanced WoW-style background with border
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0a0a0a, 0.95);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 8);
        bg.lineStyle(3, 0xc9aa71, 1);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 8);
        this.equipmentDisplay.add(bg);

        // Title with enhanced styling
        const title = this.scene.add.text(0, -panelHeight/2 + 25, 'EQUIPMENT', {
            font: 'bold 18px Arial',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        });
        title.setOrigin(0.5);
        this.equipmentDisplay.add(title);

        // Hotkey hint
        const hotkeyHint = this.scene.add.text(panelWidth/2 - 15, -panelHeight/2 + 15, 'E', {
            font: 'bold 12px Arial',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 1
        });
        hotkeyHint.setOrigin(1, 0.5);
        this.equipmentDisplay.add(hotkeyHint);

        // Equipment slot categories for better organization
        const slotCategories = {
            'Weapons': ['mainhand', 'offhand', 'ranged'],
            'Armor': ['head', 'neck', 'shoulder', 'cloak', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet'],
            'Accessories': ['ring1', 'ring2', 'trinket1', 'trinket2']
        };

        this.slotDisplays = {};
        const slotSize = 48;
        const slotSpacing = 12;
        const categorySpacing = 25;
        let currentY = -panelHeight/2 + 70;

        // Create equipment slots by category
        Object.entries(slotCategories).forEach(([categoryName, slots]) => {
            // Category header
            const categoryHeader = this.scene.add.text(0, currentY, categoryName, {
                font: 'bold 14px Arial',
                fill: '#c9aa71',
                stroke: '#000000',
                strokeThickness: 1
            });
            categoryHeader.setOrigin(0.5);
            this.equipmentDisplay.add(categoryHeader);
            currentY += 25;

            // Calculate slots per row for this category
            const slotsPerRow = Math.min(slots.length, 4);
            const startX = -((slotsPerRow - 1) * (slotSize + slotSpacing)) / 2;

            slots.forEach((slot, index) => {
                const row = Math.floor(index / slotsPerRow);
                const col = index % slotsPerRow;

                const pos = {
                    x: startX + col * (slotSize + slotSpacing),
                    y: currentY + row * (slotSize + slotSpacing + 20)
                };
                // Enhanced slot background with WoW-style border
                const slotBg = this.scene.add.graphics();
                slotBg.fillStyle(0x1a1a1a, 1);
                slotBg.fillRoundedRect(pos.x - slotSize/2, pos.y - slotSize/2, slotSize, slotSize, 4);
                slotBg.lineStyle(2, 0x666666, 1);
                slotBg.strokeRoundedRect(pos.x - slotSize/2, pos.y - slotSize/2, slotSize, slotSize, 4);
                this.equipmentDisplay.add(slotBg);

                // Slot icon/label (use first letter capitalized)
                const slotIcon = slot.charAt(0).toUpperCase();
                const iconText = this.scene.add.text(pos.x, pos.y, slotIcon, {
                    font: 'bold 16px Arial',
                    fill: '#888888',
                    stroke: '#000000',
                    strokeThickness: 1
                });
                iconText.setOrigin(0.5);
                this.equipmentDisplay.add(iconText);

                // Item display area (smaller than slot background)
                const itemDisplay = this.scene.add.graphics();
                itemDisplay.fillStyle(0x000000, 0.8);
                itemDisplay.fillRoundedRect(pos.x - slotSize/2 + 4, pos.y - slotSize/2 + 4, slotSize - 8, slotSize - 8, 2);
                this.equipmentDisplay.add(itemDisplay);

                // Make item display interactive
                const hitArea = this.scene.add.zone(pos.x, pos.y, slotSize - 8, slotSize - 8);
                hitArea.setInteractive({ useHandCursor: true });
                this.equipmentDisplay.add(hitArea);

                // Enhanced tooltip support
                hitArea.on('pointerover', () => {
                    const currentItemId = this.equipmentSlots[slot];
                    if (currentItemId) {
                        const itemData = this.getItemData(currentItemId);
                        if (itemData && this.scene.tooltipManager) {
                            const worldX = this.equipmentDisplay.x + pos.x;
                            const worldY = this.equipmentDisplay.y + pos.y;
                            this.scene.tooltipManager.showItemTooltip(itemData, worldX, worldY);
                        }
                    } else {
                        // Show empty slot tooltip
                        if (this.scene.tooltipManager) {
                            const worldX = this.equipmentDisplay.x + pos.x;
                            const worldY = this.equipmentDisplay.y + pos.y;
                            this.scene.tooltipManager.showTooltip(worldX, worldY,
                                `${slot.charAt(0).toUpperCase() + slot.slice(1)} - Empty Slot`);
                        }
                    }

                    // Highlight slot on hover
                    slotBg.clear();
                    slotBg.fillStyle(0x2a2a2a, 1);
                    slotBg.fillRoundedRect(pos.x - slotSize/2, pos.y - slotSize/2, slotSize, slotSize, 4);
                    slotBg.lineStyle(2, 0xc9aa71, 1);
                    slotBg.strokeRoundedRect(pos.x - slotSize/2, pos.y - slotSize/2, slotSize, slotSize, 4);
                });

                hitArea.on('pointerout', () => {
                    if (this.scene.tooltipManager) {
                        this.scene.tooltipManager.hideTooltip();
                    }

                    // Remove highlight
                    slotBg.clear();
                    slotBg.fillStyle(0x1a1a1a, 1);
                    slotBg.fillRoundedRect(pos.x - slotSize/2, pos.y - slotSize/2, slotSize, slotSize, 4);
                    slotBg.lineStyle(2, 0x666666, 1);
                    slotBg.strokeRoundedRect(pos.x - slotSize/2, pos.y - slotSize/2, slotSize, slotSize, 4);
                });

                // Store slot display info
                this.slotDisplays[slot] = {
                    bg: slotBg,
                    icon: iconText,
                    item: itemDisplay,
                    hitArea: hitArea,
                    x: pos.x,
                    y: pos.y,
                    size: slotSize
                };
            });

            // Move to next category
            const rowsInCategory = Math.ceil(slots.length / slotsPerRow);
            currentY += rowsInCategory * (slotSize + slotSpacing + 20) + categorySpacing;
        });

        // Make equipment display fixed to camera
        this.equipmentDisplay.setScrollFactor(0);
        this.equipmentDisplay.setDepth(1600);

        // Start hidden - user must toggle to show
        this.equipmentDisplay.setVisible(false);

        this.updateEquipmentDisplay();
    }

    /**
     * Update equipment display with current items
     */
    updateEquipmentDisplay() {
        if (!this.slotDisplays || !this.equipmentSlots) {
            return;
        }

        for (const [slot, itemId] of Object.entries(this.equipmentSlots)) {
            const slotDisplay = this.slotDisplays[slot];
            if (!slotDisplay) continue;

            // Remove existing sprite if any
            if (slotDisplay.itemSprite) {
                slotDisplay.itemSprite.destroy();
                slotDisplay.itemSprite = null;
            }

            if (itemId) {
                const itemData = this.getItemData(itemId);
                if (itemData) {
                    // Hide the rectangle placeholder
                    slotDisplay.item.setVisible(false);

                    // Try to use generated item icon
                    const textureKey = `item-icon-${itemData.id}`;
                    if (this.scene.textures.exists(textureKey)) {
                        // Create sprite with generated icon
                        const sprite = this.scene.add.sprite(
                            slotDisplay.item.x,
                            slotDisplay.item.y,
                            textureKey
                        );
                        sprite.setOrigin(0.5);
                        // Responsive scale based on actual slot size
                        const slotSize = slotDisplay.item.width || 35;
                        sprite.setScale(slotSize / 64);
                        sprite.setInteractive({ useHandCursor: true });
                        this.equipmentDisplay.add(sprite);
                        slotDisplay.itemSprite = sprite;

                        // Add tooltip support for equipped item sprite
                        sprite.on('pointerover', () => {
                            if (itemData && this.scene.tooltipManager) {
                                const worldX = this.equipmentDisplay.x + slotDisplay.item.x;
                                const worldY = this.equipmentDisplay.y + slotDisplay.item.y;
                                this.scene.tooltipManager.showItemTooltip(itemData, worldX, worldY);
                            }
                        });

                        sprite.on('pointerout', () => {
                            if (this.scene.tooltipManager) {
                                this.scene.tooltipManager.hideTooltip();
                            }
                        });

                        // Add glow for rare items
                        if ((itemData.rarity === 'rare' || itemData.rarity === 'legendary' || itemData.rarity === 'epic') && 
                            sprite.postFX && typeof sprite.postFX.addGlow === 'function') {
                            sprite.postFX.addGlow(0xffffff, 1, 0, false, 0.1, 16);
                        }
                    } else {
                        // Fallback to generated placeholder if icon not generated
                        slotDisplay.item.setVisible(false);
                        const colors = {
                            common: 0x888888,
                            uncommon: 0x00ff00,
                            rare: 0x0088ff,
                            legendary: 0xff8800
                        };
                        const color = colors[itemData.rarity] || 0x888888;
                        const placeholderKey = getPlaceholderKey(this.scene, 'item');
                        const safeKey = ensurePlaceholderTexture(this.scene, {
                            key: placeholderKey,
                            width: 32,
                            height: 32,
                            color: 0x4a4a4a,
                            borderColor: 0xffffff,
                            crossColor: 0xdedede
                        });
                        const slotSize = slotDisplay.item.width || 35;
                        const sprite = this.scene.add.sprite(slotDisplay.item.x, slotDisplay.item.y, safeKey);
                        sprite.setOrigin(0.5);
                        sprite.setDisplaySize(slotSize * 0.875, slotSize * 0.875);
                        sprite.setTint(color);
                        this.equipmentDisplay.add(sprite);
                        slotDisplay.itemSprite = sprite;
                    }
                }
            } else {
                // Empty slot - show placeholder rectangle
                slotDisplay.item.setVisible(true);
                slotDisplay.item.setFillStyle(0x000000);
            }
        }
    }

    /**
     * Create stat display UI
     */
    createStatDisplay() {
        const x = 50;
        const y = 380;

        // Background
        this.statDisplay = this.scene.add.container(x, y);

        const bg = this.scene.add.rectangle(0, 0, 200, 120, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0x333333);
        this.statDisplay.add(bg);

        // Title
        const title = this.scene.add.text(0, -45, 'Stats', {
            font: 'bold 16px Arial',
            fill: '#ffffff'
        });
        title.setOrigin(0.5);
        this.statDisplay.add(title);

        // Stat text (will be updated)
        this.statText = this.scene.add.text(0, -20, '', {
            font: '12px Arial',
            fill: '#ffffff',
            align: 'left'
        });
        this.statText.setOrigin(0.5);
        this.statDisplay.add(this.statText);

        // Make stat display draggable
        this.statDisplay.setScrollFactor(0);
        this.statDisplay.setDepth(1601);

        // Start hidden - user must toggle equipment panel to show
        this.statDisplay.setVisible(false);

        this.updateStatDisplay();
    }

    /**
     * Update stat display with current stats
     */
    updateStatDisplay() {
        if (!this.statText) {
            this.createStatDisplay();
            return;
        }

        const stats = [
            `HP: ${this.currentStats.health || 0}/${this.currentStats.maxHealth || 0}`,
            `ATK: ${this.currentStats.attack || 0}`,
            `DEF: ${this.currentStats.defense || 0}`
        ];

        // Add additional stats if present
        if (this.currentStats.critChance) {
            stats.push(`Crit: ${this.currentStats.critChance}%`);
        }
        if (this.currentStats.lifesteal) {
            stats.push(`Lifesteal: ${this.currentStats.lifesteal}%`);
        }
        if (this.currentStats.manaRegen) {
            stats.push(`Mana Regen: ${this.currentStats.manaRegen}`);
        }

        this.statText.setText(stats.join('\n'));
    }

    /**
     * Show equipment suggestion to player
     * @param {Object} itemData - Item data to suggest
     * @param {string} slot - Equipment slot
     */
    showEquipmentSuggestion(itemData, slot) {
        const message = `New ${itemData.name} is better than current ${slot}!`;
        this.showFloatingText(this.hero.x, this.hero.y - 80, message, '#00ff00');
    }

    /**
     * Show equipment/unequipment feedback
     * @param {Object} itemData - Item data
     * @param {boolean} equipped - True if equipped, false if unequipped
     * @param {Object} statDifferences - Stat differences object (optional)
     */
    showEquipFeedback(itemData, equipped, statDifferences = null) {
        const action = equipped ? 'Equipped' : 'Unequipped';
        const color = equipped ? '#00ff00' : '#ffaa00';
        let message = `${action} ${itemData.name}`;

        // Add stat summary if provided
        if (statDifferences && Object.keys(statDifferences).length > 0) {
            const statLines = [];
            for (const [stat, diff] of Object.entries(statDifferences)) {
                if (diff !== 0) {
                    const sign = diff > 0 ? '+' : '';
                    const statName = stat.charAt(0).toUpperCase() + stat.slice(1);
                    statLines.push(`${sign}${diff} ${statName}`);
                }
            }
            if (statLines.length > 0) {
                message += '\n' + statLines.join(', ');
            }
        }

        // Get hero position for feedback
        let heroX = 0;
        let heroY = 0;

        if (this.hero) {
            heroX = this.hero.x || 0;
            heroY = this.hero.y || 0;
        } else if (this.partyManager && this.currentHeroId) {
            const hero = this.partyManager.getHeroById(this.currentHeroId);
            if (hero && hero.sprite) {
                heroX = hero.sprite.x || 0;
                heroY = hero.sprite.y || 0;
            }
        }

        this.showFloatingText(heroX, heroY - 60, message, color);
    }

    /**
     * Show stat change feedback with visual indicators
     * @param {Object} statDifferences - Object with stat differences
     */
    showStatChangeFeedback(statDifferences) {
        if (!this.scene) return;

        // Get hero position
        let heroX = 0;
        let heroY = 0;

        if (this.hero) {
            heroX = this.hero.x || 0;
            heroY = this.hero.y || 0;
        } else if (this.partyManager && this.currentHeroId) {
            const hero = this.partyManager.getHeroById(this.currentHeroId);
            if (hero && hero.sprite) {
                heroX = hero.sprite.x || 0;
                heroY = hero.sprite.y || 0;
            }
        }

        // Show individual stat changes
        let yOffset = -100;
        for (const [stat, diff] of Object.entries(statDifferences)) {
            if (diff !== 0) {
                const sign = diff > 0 ? '+' : '';
                const color = diff > 0 ? '#00ff00' : '#ff6666';
                const statName = this.formatStatName(stat);
                const message = `${sign}${diff} ${statName}`;

                this.showFloatingText(heroX, heroY + yOffset, message, color);
                yOffset -= 20;
            }
        }
    }

    /**
     * Format stat name for display
     * @param {string} stat - Stat key
     * @returns {string} Formatted stat name
     */
    formatStatName(stat) {
        const statNames = {
            attack: 'Attack',
            defense: 'Defense',
            health: 'Health',
            maxHealth: 'Max Health',
            critChance: 'Crit Chance',
            critDamage: 'Crit Damage',
            lifesteal: 'Lifesteal',
            manaRegen: 'Mana Regen',
            healingPower: 'Healing Power',
            threatPercent: 'Threat',
            attackPercent: 'Attack %',
            defensePercent: 'Defense %'
        };
        return statNames[stat] || stat.charAt(0).toUpperCase() + stat.slice(1);
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
            font: 'bold 14px Arial',
            fill: color,
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        floatingText.setOrigin(0.5, 0.5);

        // Animate floating text
        this.scene.tweens.add({
            targets: floatingText,
            y: { from: y, to: y - 40 },
            alpha: { from: 1, to: 0 },
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: () => {
                floatingText.destroy();
            }
        });
    }

    /**
     * Gets current equipment for the active hero.
     * @returns {Object} Equipment object for the current hero.
     */
    getEquipment() {
        if (this.currentHeroId) {
            return this.getHeroEquipment(this.currentHeroId);
        }
        return { ...this.equipmentSlots };
    }

    /**
     * Simulate full equipment for visualization/testing
     * Equips items to all available slots
     */
    simulateFullEquipment() {
        if (!this.itemsData) return;

        try {
            // Equip weapon (slot matches exactly)
            if (this.itemsData.weapons?.legendary_blade) {
                this.equipItem('legendary_blade', 'weapon');
            }

            // Equip chest armor (slot matches exactly)
            if (this.itemsData.armor?.iron_plate) {
                this.equipItem('iron_plate', 'chest');
            }

            // For accessories, directly set slots since they may not match exactly
            // Rings go to ring1 and ring2
            if (this.itemsData.accessories?.health_ring) {
                this.equipmentSlots.ring1 = 'health_ring';
                this.equipmentSlots.ring2 = 'health_ring';
            }

            // Amulet goes to neck slot
            if (this.itemsData.accessories?.power_amulet) {
                this.equipmentSlots.neck = 'power_amulet';
            }

            // Recalculate stats after direct slot assignments
            this.calculateStats();

            // Update displays
            this.updateEquipmentDisplay();
            this.updateStatDisplay();

            // Trigger equipment changed event for sprite regeneration
            this.scene.events.emit(GameEvents.ITEM.EQUIPMENT_CHANGED, {
                equipment: this.getEquipment()
            });

            Logger.debug('EquipmentManager', 'Full equipment simulated:', this.getEquipment());
        } catch (error) {
            Logger.error('EquipmentManager', 'Error simulating full equipment:', error);
        }
    }

    /**
     * Get current stats
     * @returns {Object} - Current stats
     */
    getStats() {
        return { ...this.currentStats };
    }

    /**
     * Get base stats
     * @returns {Object} - Base stats
     */
    getBaseStats() {
        return { ...this.baseStats };
    }

    /**
     * Set base stats (for level ups, etc.)
     * @param {Object} newBaseStats - New base stats
     */
    setBaseStats(newBaseStats) {
        this.baseStats = { ...newBaseStats };
        this.calculateStats();
        this.updateStatDisplay();
    }

    /**
     * Load equipment from save data
     * @param {Object} saveData - Save data with equipment
     */
    loadFromSaveData(saveData) {
        if (saveData.equipment) {
            this.equipmentSlots = { ...saveData.equipment };
            this.calculateStats();
            this.updateEquipmentDisplay();
            this.updateStatDisplay();
        }

        if (saveData.baseStats) {
            this.baseStats = { ...saveData.baseStats };
            this.calculateStats();
            this.updateStatDisplay();
        }
    }

    /**
     * Get save data for equipment
     * @returns {Object} - Save data
     */
    getSaveData() {
        // Save all heroes' equipment if using multi-hero system
        const allHeroEquipment = {};
        this.heroEquipment.forEach((equipment, heroId) => {
            allHeroEquipment[heroId] = { ...equipment };
        });

        const allHeroStats = {};
        this.heroStats.forEach((stats, heroId) => {
            allHeroStats[heroId] = { ...stats };
        });

        // Save all item instances
        const itemInstances = {};
        this.itemInstances.forEach((data, instanceId) => {
            itemInstances[instanceId] = data;
        });

        return {
            currentHeroId: this.currentHeroId,
            equipment: { ...this.equipmentSlots }, // Current hero for backward compatibility
            baseStats: { ...this.baseStats }, // Current hero for backward compatibility
            allHeroEquipment: allHeroEquipment, // All heroes
            allHeroStats: allHeroStats, // All heroes
            itemInstances: itemInstances // All item instances
        };
    }

    /**
     * Load equipment data from save
     * @param {Object} saveData - Saved equipment data
     */
    loadData(saveData) {
        try {
            if (!saveData) return false;

            // Restore current hero data (backward compatibility)
            if (saveData.equipment) {
                this.equipmentSlots = { ...saveData.equipment };
            }
            if (saveData.baseStats) {
                this.baseStats = { ...saveData.baseStats };
            }
            if (saveData.currentHeroId) {
                this.currentHeroId = saveData.currentHeroId;
            }

            // Restore all heroes' equipment
            if (saveData.allHeroEquipment) {
                this.heroEquipment.clear();
                Object.keys(saveData.allHeroEquipment).forEach(heroId => {
                    this.heroEquipment.set(heroId, { ...saveData.allHeroEquipment[heroId] });
                });
            }

            // Restore all heroes' stats
            if (saveData.allHeroStats) {
                this.heroStats.clear();
                Object.keys(saveData.allHeroStats).forEach(heroId => {
                    this.heroStats.set(heroId, { ...saveData.allHeroStats[heroId] });
                });
            }

            // Restore all item instances
            if (saveData.itemInstances) {
                this.itemInstances.clear();
                Object.keys(saveData.itemInstances).forEach(instanceId => {
                    this.itemInstances.set(instanceId, saveData.itemInstances[instanceId]);
                });
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clean up equipment manager
     */
    destroy() {
        if (this.equipmentDisplay) {
            this.equipmentDisplay.destroy();
        }
        if (this.statDisplay) {
            this.statDisplay.destroy();
        }

        this.equipmentSlots = {
            head: null,
            neck: null,
            shoulder: null,
            cloak: null,
            chest: null,
            shirt: null,
            tabard: null,
            bracer: null,
            hands: null,
            waist: null,
            legs: null,
            boots: null,
            ring1: null,
            ring2: null,
            trinket1: null,
            trinket2: null,
            weapon: null,
            offhand: null
        };

        // Remove event listeners
        this.scene.events.off('equip_item'); // Internal event, not in GameEvents
        this.scene.events.off('unequip_item'); // Internal event, not in GameEvents

        Logger.debug('EquipmentManager', 'Destroyed');
    }
}

import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { GameEvents } from '../utils/event-constants.js';
import { BaseManager } from './base-manager.js';

/**
 * Party Manager - Manages the 5-hero party system
 * Maintains party composition, role constraints, and provides utility methods
 */
export class PartyManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // PartyManager has no dependencies
    }

    /**
     * Initializes the PartyManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        this.heroes = [];
        this.maxPartySize = 5;
        this.requiredRoles = {
            tank: 1,
            healer: 1,
            dps: 3
        };
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        Logger.info('PartyManager', 'Initialized');
    }

    /**
     * Reloads class data from the server for hot-reload support.
     * @async
     * @returns {Promise<void>}
     */
    async reloadClassData() {
        try {
            Logger.info('PartyManager', 'Reloading class data...');

            // Reload the JSON data
            await this.scene.cache.json.remove('classes');
            this.scene.load.json('classes', '/data/classes.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-classes', resolve);
                this.scene.load.start();
            });

            Logger.info('PartyManager', 'Class data reloaded successfully');

        } catch (error) {
            Logger.error('PartyManager', 'Failed to reload class data:', error);
            throw error;
        }
    }

    /**
     * Reloads specialization data from the server for hot-reload support.
     * @async
     * @returns {Promise<void>}
     */
    async reloadSpecData() {
        try {
            Logger.info('PartyManager', 'Reloading specialization data...');

            // Reload the JSON data
            await this.scene.cache.json.remove('specializations');
            this.scene.load.json('specializations', '/data/specializations.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-specializations', resolve);
                this.scene.load.start();
            });

            Logger.info('PartyManager', 'Specialization data reloaded successfully');

        } catch (error) {
            Logger.error('PartyManager', 'Failed to reload specialization data:', error);
            throw error;
        }
    }

    /**
     * Adds a hero to the party.
     * Validates party size and hero ID uniqueness.
     * @param {Object} hero - Hero object to add.
     * @returns {boolean} True if hero was added successfully.
     */
    addHero(hero) {
        try {
            if (!hero || !hero.id) {
                Logger.error('PartyManager', 'Invalid hero object');
                return false;
            }

            if (this.heroes.length >= this.maxPartySize) {
                Logger.warn('PartyManager', 'Party is full');
                return false;
            }

            if (this.getHeroById(hero.id)) {
                Logger.warn('PartyManager', `Hero ${hero.id} already in party`);
                return false;
            }

            // Ensure hero stats are properly initialized
            if (hero.currentStats) {
                // Ensure health is set to maxHealth if not already set
                if (!hero.currentStats.health || hero.currentStats.health <= 0) {
                    hero.currentStats.health = hero.currentStats.maxHealth || hero.baseStats?.maxHealth || 100;
                }
                // Ensure maxHealth is set
                if (!hero.currentStats.maxHealth) {
                    hero.currentStats.maxHealth = hero.baseStats?.maxHealth || 100;
                }
            } else if (hero.baseStats) {
                // Initialize currentStats from baseStats if missing
                hero.currentStats = {
                    ...hero.baseStats,
                    health: hero.baseStats.health || hero.baseStats.maxHealth || 100,
                    maxHealth: hero.baseStats.maxHealth || 100
                };
            }

            this.heroes.push(hero);
            
            this.scene?.events.emit(GameEvents.PARTY.HERO_ADDED, { hero });
            Logger.info('PartyManager', `Added hero ${hero.id || hero.name || 'Unknown'} to party`);
            
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'PartyManager.addHero');
            return false;
        }
    }

    /**
     * Ensure all heroes have proper currentStats initialized
     * @param {StatCalculator} [statCalculator] - Optional StatCalculator to calculate final stats
     */
    initializeHeroStats(statCalculator = null) {
        this.heroes.forEach(hero => {
            if (!hero.currentStats) {
                hero.currentStats = { ...hero.baseStats };
            }

            // Ensure health is set
            if (!hero.currentStats.health || hero.currentStats.health <= 0) {
                hero.currentStats.health = hero.currentStats.maxHealth || hero.baseStats.maxHealth || 100;
            }

            // Calculate final stats if StatCalculator is available
            if (statCalculator && statCalculator.calculateFinalStats) {
                try {
                    hero.currentStats = statCalculator.calculateFinalStats(hero);
                } catch (error) {
                    Logger.warn('PartyManager', `Failed to calculate final stats for hero ${hero.id}:`, error);
                }
            }
        });

        Logger.info('PartyManager', `Initialized stats for ${this.heroes.length} heroes`);
    }

    /**
     * Removes a hero from the party by their ID.
     * @param {string} heroId - The unique identifier of the hero to remove.
     * @returns {boolean} True if hero was removed successfully.
     */
    removeHero(heroId) {
        try {
            const index = this.heroes.findIndex(h => h.id === heroId);
            if (index === -1) {
                Logger.warn('PartyManager', `Hero ${heroId} not found in party`);
                return false;
            }

            const hero = this.heroes[index];
            this.heroes.splice(index, 1);
            
            this.scene?.events.emit(GameEvents.PARTY.HERO_REMOVED, { heroId, hero });
            Logger.info('PartyManager', `Removed hero ${heroId} from party`);
            
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'PartyManager.removeHero');
            return false;
        }
    }

    /**
     * Gets a hero object by their ID.
     * @param {string} heroId - Hero ID to find.
     * @returns {Object|null} Hero object or null if not found.
     */
    getHeroById(heroId) {
        return this.heroes.find(h => h.id === heroId) || null;
    }

    /**
     * Gets a hero object by their index in the party.
     * @param {number} index - Index (0 to party size - 1).
     * @returns {Object|null} Hero object or null if index is out of bounds.
     */
    getHeroByIndex(index) {
        if (index < 0 || index >= this.heroes.length) {
            return null;
        }
        return this.heroes[index];
    }

    /**
     * Finds the hero designated as the tank in the current party.
     * @returns {Object|null} Tank hero or null if none present.
     */
    getTank() {
        return this.heroes.find(h => h.role === 'tank') || null;
    }

    /**
     * Finds the hero designated as the healer in the current party.
     * @returns {Object|null} Healer hero or null if none present.
     */
    getHealer() {
        return this.heroes.find(h => h.role === 'healer') || null;
    }

    /**
     * Gets all heroes designated as DPS in the current party.
     * @returns {Array<Object>} Array of DPS heroes.
     */
    getDPS() {
        return this.heroes.filter(h => h.role === 'dps');
    }

    /**
     * Validates if the current party composition meets requirements (1 Tank, 1 Healer, 3 DPS).
     * @returns {boolean} True if the composition is valid.
     */
    validatePartyComposition() {
        const roleCounts = {
            tank: 0,
            healer: 0,
            dps: 0
        };

        this.heroes.forEach(hero => {
            if (hero.role && roleCounts.hasOwnProperty(hero.role)) {
                roleCounts[hero.role]++;
            }
        });

        return roleCounts.tank === this.requiredRoles.tank &&
               roleCounts.healer === this.requiredRoles.healer &&
               roleCounts.dps === this.requiredRoles.dps;
    }

    /**
     * Calculates the party's level using the specified method.
     * @param {string} [method='average'] - Calculation method ('average' or 'highest').
     * @returns {number} Calculated party level.
     */
    getPartyLevel(method = 'average') {
        if (this.heroes.length === 0) return 1;

        if (method === 'highest') {
            return Math.max(...this.heroes.map(h => h.level || 1));
        }

        const totalLevel = this.heroes.reduce((sum, h) => sum + (h.level || 1), 0);
        return Math.round(totalLevel / this.heroes.length);
    }

    /**
     * Gets a shallow copy of the current heroes array.
     * @returns {Array<Object>} Array of all heroes in the party.
     */
    getAllHeroes() {
        return [...this.heroes];
    }

    /**
     * Alias for getAllHeroes.
     * @returns {Array<Object>} Array of all heroes in the party.
     */
    getHeroes() {
        return this.getAllHeroes();
    }

    /**
     * Checks if the party has reached its maximum size.
     * @returns {boolean} True if party is full.
     */
    isFull() {
        return this.heroes.length >= this.maxPartySize;
    }

    /**
     * Gets the current number of heroes in the party.
     * @returns {number} Current party size.
     */
    getSize() {
        return this.heroes.length;
    }

    /**
     * Serializes the current party state for saving.
     * @returns {Object} Save data object containing hero information.
     */
    getSaveData() {
        return {
            heroes: this.heroes.map(hero => ({
                id: hero.id,
                name: hero.name,
                classId: hero.classId || hero.class, // Use classId (preferred) or fallback to class
                specId: hero.specId || hero.specialization, // Use specId (preferred) or fallback to specialization
                class: hero.class || hero.classId, // Keep for backward compatibility
                specialization: hero.specialization || hero.specId, // Keep for backward compatibility
                role: hero.role,
                level: hero.level,
                experience: hero.experience,
                stats: { ...hero.stats },
                baseStats: { ...hero.baseStats },
                currentStats: hero.currentStats ? { ...hero.currentStats } : undefined,
                talentTree: hero.talentTree ? { ...hero.talentTree } : {},
                spentTalentPoints: hero.spentTalentPoints || 0,
                availableTalentPoints: hero.availableTalentPoints || 0,
                equipmentSlots: hero.equipmentSlots ? { ...hero.equipmentSlots } : undefined,
                abilities: hero.abilities ? [...hero.abilities] : undefined,
                resourceType: hero.resourceType,
                currentResource: hero.currentResource,
                maxResource: hero.maxResource
            }))
        };
    }

    /**
     * Loads party state from serialized save data.
     * @param {Object} saveData - The data object to load from.
     * @returns {boolean} True if loading was successful.
     */
    loadData(saveData, statCalculator = null) {
        try {
            if (!saveData || !saveData.heroes || !Array.isArray(saveData.heroes)) {
                Logger.warn('PartyManager', 'Invalid party save data');
                return false;
            }

            this.heroes = [];

            saveData.heroes.forEach(heroData => {
                // Recreate hero object from saved data
                const hero = {
                    id: heroData.id,
                    name: heroData.name,
                    classId: heroData.classId || heroData.class, // Use classId (preferred) or fallback to class
                    specId: heroData.specId || heroData.specialization, // Use specId (preferred) or fallback to specialization
                    class: heroData.class || heroData.classId, // Keep for backward compatibility
                    specialization: heroData.specialization || heroData.specId, // Keep for backward compatibility
                    role: heroData.role,
                    level: heroData.level || 1,
                    experience: heroData.experience || 0,
                    stats: heroData.stats ? { ...heroData.stats } : undefined,
                    baseStats: heroData.baseStats ? { ...heroData.baseStats } : undefined,
                    currentStats: heroData.currentStats ? { ...heroData.currentStats } : undefined,
                    talentTree: heroData.talentTree ? { ...heroData.talentTree } : {},
                    spentTalentPoints: heroData.spentTalentPoints || 0,
                    availableTalentPoints: heroData.availableTalentPoints || 0,
                    equipmentSlots: heroData.equipmentSlots ? { ...heroData.equipmentSlots } : undefined,
                    abilities: heroData.abilities ? [...heroData.abilities] : undefined,
                    resourceType: heroData.resourceType,
                    currentResource: heroData.currentResource,
                    maxResource: heroData.maxResource
                };

                this.heroes.push(hero);
            });

            // Initialize hero stats after loading
            this.initializeHeroStats(statCalculator);

            Logger.info('PartyManager', `Loaded party with ${this.heroes.length} heroes`);
            return true;
        } catch (error) {
            Logger.error('PartyManager', 'Error loading party data:', error);
            return false;
        }
    }
}


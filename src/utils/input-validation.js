/**
 * Input Validation Utilities
 * Provides comprehensive validation for scene parameters, user inputs, and data structures
 * Data-driven validation using world-config.json and manager patterns
 * 
 * @module InputValidation
 * 
 * ## Quick Start
 * 
 * ### Scene Validation
 * ```javascript
 * import { validateSceneTransition } from './utils/input-validation.js';
 * 
 * // In a scene method:
 * validateSceneTransition('GameScene', { partyManager: this.partyManager }, this);
 * ```
 * 
 * ### Manager Validation (Using Mixin)
 * ```javascript
 * import { ManagerValidationMixin } from './utils/input-validation.js';
 * 
 * // In manager constructor:
 * Object.assign(EquipmentManager.prototype, ManagerValidationMixin);
 * 
 * // In manager methods:
 * if (!this.validateSlot(slot)) {
 *     Logger.error('EquipmentManager', `Invalid slot: ${slot}`);
 *     return false;
 * }
 * ```
 * 
 * ### Manager Validation (Using Builder - Recommended)
 * ```javascript
 * import { ValidationBuilder } from './utils/input-validation.js';
 * 
 * // In manager methods:
 * const result = ValidationBuilder.create()
 *   .validateSlot(slot, this)
 *   .validateItemId(itemId, this.itemsData)
 *   .validateHeroId(heroId, this.partyManager)
 *   .execute();
 * 
 * if (!result.isValid) {
 *     Logger.error('EquipmentManager', result.errors.join(', '));
 *     return false;
 * }
 * ```
 * 
 * ### Manager Validation (Using Method Wrapper)
 * ```javascript
 * import { withValidation, ValidationBuilder } from './utils/input-validation.js';
 * 
 * // In constructor, wrap methods:
 * this.equipItem = withValidation(
 *   this.equipItem.bind(this),
 *   (itemId, slot, heroId) => ValidationBuilder.create()
 *     .validateItemId(itemId, this.itemsData)
 *     .validateSlot(slot, this)
 *     .execute(),
 *   'EquipmentManager.equipItem',
 *   Logger
 * );
 * ```
 * 
 * ### Manager Validation (Direct)
 * ```javascript
 * import { ManagerValidationHelpers } from './utils/input-validation.js';
 * 
 * try {
 *     ManagerValidationHelpers.validateEquipmentSlot(slot, this);
 *     ManagerValidationHelpers.validateItemId(itemId, this.itemsData);
 * } catch (error) {
 *     Logger.error('EquipmentManager', error.message);
 *     return false;
 * }
 * ```
 * 
 * ### Save Data Validation
 * ```javascript
 * import { DataStructureValidator } from './utils/input-validation.js';
 * 
 * const validator = new DataStructureValidator(this.scene);
 * try {
 *     validator.validateSaveData(saveData);
 * } catch (error) {
 *     Logger.error('SaveManager', error.message);
 * }
 * ```
 * 
 * ## Available Validators
 * 
 * - **SceneParameterValidator**: Validates scene transitions, heroes, party, equipment
 * - **UserInputValidator**: Validates text, numeric, and selection inputs
 * - **DataStructureValidator**: Validates save data, world data, configs
 * - **ManagerValidationHelpers**: Common validation patterns for managers
 * 
 * ## Validation Registry
 * 
 * ```javascript
 * import { ValidationRegistry } from './utils/input-validation.js';
 * 
 * // Get all validators
 * const validators = ValidationRegistry.getValidators();
 * 
 * // Get validation patterns
 * const patterns = ValidationRegistry.getPatterns();
 * ```
 * 
 * ## Refactoring Example
 * 
 * ### Before (Manual Validation):
 * ```javascript
 * equipItem(itemId, slot, heroId = null) {
 *     try {
 *         heroId = heroId || this.currentHeroId;
 *         
 *         // Manual validation
 *         if (!TypeValidator.isString(itemId, 1)) {
 *             Logger.error('EquipmentManager', `Invalid itemId: ${itemId}`);
 *             return false;
 *         }
 *         if (!TypeValidator.isString(slot, 1)) {
 *             Logger.error('EquipmentManager', `Invalid equipment slot: ${slot}`);
 *             return false;
 *         }
 *         if (!this.getHeroEquipment(heroId).hasOwnProperty(slot)) {
 *             Logger.error('EquipmentManager', `Invalid equipment slot: ${slot}`);
 *             return false;
 *         }
 *         
 *         // Actual logic...
 *     } catch (error) {
 *         Logger.error('EquipmentManager', error.message);
 *         return false;
 *     }
 * }
 * ```
 * 
 * ### After (Using ValidationBuilder):
 * ```javascript
 * equipItem(itemId, slot, heroId = null) {
 *     heroId = heroId || this.currentHeroId;
 *     
 *     // Clean validation chain
 *     const validation = ValidationBuilder.create()
 *         .validateItemId(itemId, this.itemsData)
 *         .validateSlot(slot, this)
 *         .validateHeroId(heroId, this.partyManager)
 *         .execute();
 *     
 *     if (!validation.isValid) {
 *         Logger.error('EquipmentManager', validation.errors.join(', '));
 *         return false;
 *     }
 *     
 *     // Actual logic...
 * }
 * ```
 * 
 * ### After (Using Mixin):
 * ```javascript
 * equipItem(itemId, slot, heroId = null) {
 *     heroId = heroId || this.currentHeroId;
 *     
 *     // Simple validation methods
 *     if (!this.validateItemId(itemId) || !this.validateSlot(slot) || !this.validateHeroId(heroId)) {
 *         return false; // Errors already logged via mixin
 *     }
 *     
 *     // Actual logic...
 * }
 * ```
 * 
 * ### After (Using Mixin + QuickValidate):
 * ```javascript
 * equipItem(itemId, slot, heroId = null) {
 *     heroId = heroId || this.currentHeroId;
 *     
 *     // One-line validation with automatic error handling
 *     if (!this.quickValidate(builder => builder
 *         .validateItemId(itemId, this.itemsData)
 *         .validateSlot(slot, this)
 *         .validateHeroId(heroId, this.partyManager)
 *         .execute(), 'EquipmentManager.equipItem')) {
 *         return false;
 *     }
 *     
 *     // Actual logic...
 * }
 * ```
 */

import { Validator } from './error-handling.js';
import { GameEvents } from './event-constants.js';

export class SceneParameterValidator {
    /**
     * Initialize validator with scene context for data-driven validation
     * @param {Object} scene - Phaser scene (optional, for accessing cache/config)
     */
    constructor(scene = null) {
        this.scene = scene;
        this.worldConfig = scene?.cache?.json?.get('worldConfig');
        this.itemsData = scene?.cache?.json?.get('items');
        this.maxLevel = this.worldConfig?.player?.experienceScaling?.maxLevel || 100;
        this.validRarities = this.extractRarities();
        this.equipmentSlots = this.getEquipmentSlots();
    }

    /**
     * Extract valid rarity values from items.json
     * @returns {Array} Array of valid rarity strings
     */
    extractRarities() {
        if (!this.itemsData) {
            return ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
        }

        const rarities = new Set();
        const categories = ['weapons', 'armor', 'accessories', 'consumables'];
        
        categories.forEach(category => {
            if (this.itemsData[category]) {
                Object.values(this.itemsData[category]).forEach(item => {
                    if (item.rarity) {
                        rarities.add(item.rarity);
                    }
                });
            }
        });

        return Array.from(rarities).length > 0 
            ? Array.from(rarities) 
            : ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
    }

    /**
     * Get equipment slots from EquipmentManager or use template
     * @returns {Array} Array of valid equipment slot names
     */
    getEquipmentSlots() {
        if (this.scene?.equipmentManager?.equipmentSlotTemplate) {
            return Object.keys(this.scene.equipmentManager.equipmentSlotTemplate);
        }
        return ['head', 'neck', 'shoulder', 'cloak', 'chest', 'shirt', 'tabard', 'bracer', 
                'hands', 'waist', 'legs', 'boots', 'ring1', 'ring2', 'trinket1', 'trinket2', 
                'weapon', 'offhand'];
    }

    /**
     * Emit validation error event
     * @param {string} message - Error message
     * @param {string} context - Validation context
     */
    emitValidationError(message, context = 'SceneParameterValidator') {
        if (this.scene?.events) {
            this.scene.events.emit(GameEvents.ERROR.OCCURRED, {
                type: 'validation',
                message,
                context,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Validate scene transition parameters
     * @param {string} targetScene - Target scene key
     * @param {Object} data - Scene data to pass
     * @throws {Error} If validation fails
     */
    validateSceneTransition(targetScene, data = {}) {
        Validator.isString(targetScene, 'targetScene');
        if (targetScene.trim().length === 0) {
            const error = new Error('targetScene cannot be empty');
            this.emitValidationError(error.message, 'validateSceneTransition');
            throw error;
        }

        if (data && typeof data !== 'object') {
            const error = new Error('scene data must be an object or undefined');
            this.emitValidationError(error.message, 'validateSceneTransition');
            throw error;
        }

        // Validate common scene data patterns
        this.validateCommonSceneData(data);
    }

    /**
     * Validate common scene data patterns
     * @param {Object} data - Scene data
     */
    validateCommonSceneData(data) {
        if (!data) return;

        // Validate party manager if present
        if (data.partyManager) {
            this.validatePartyManager(data.partyManager);
        }

        // Validate hero if present
        if (data.hero) {
            this.validateHero(data.hero);
        }

        // Validate return scene if present
        if (data.returnScene) {
            Validator.isString(data.returnScene, 'returnScene');
        }

        // Validate numeric parameters using data-driven maxLevel
        if (data.level !== undefined) {
            Validator.isNumber(data.level, 'level', 1, this.maxLevel);
        }

        if (data.experience !== undefined) {
            Validator.isNumber(data.experience, 'experience', 0);
        }
    }

    /**
     * Validate party manager object
     * @param {Object} partyManager - Party manager to validate
     * @throws {Error} If validation fails
     */
    validatePartyManager(partyManager) {
        Validator.notNull(partyManager, 'partyManager');
        Validator.isObject(partyManager, 'partyManager');

        if (!Array.isArray(partyManager.heroes)) {
            const error = new Error('partyManager.heroes must be an array');
            this.emitValidationError(error.message, 'validatePartyManager');
            throw error;
        }

        if (partyManager.heroes.length !== 5) {
            const error = new Error('partyManager must have exactly 5 heroes');
            this.emitValidationError(error.message, 'validatePartyManager');
            throw error;
        }

        // Use PartyManager's validatePartyComposition if available
        if (this.scene?.partyManager?.validatePartyComposition) {
            if (!partyManager.validatePartyComposition()) {
                const error = new Error('partyManager composition invalid: must have 1 tank, 1 healer, 3 DPS');
                this.emitValidationError(error.message, 'validatePartyManager');
                throw error;
            }
        }

        // Validate each hero
        partyManager.heroes.forEach((hero, index) => {
            try {
                this.validateHero(hero);
            } catch (error) {
                const wrappedError = new Error(`partyManager.heroes[${index}]: ${error.message}`);
                this.emitValidationError(wrappedError.message, 'validatePartyManager');
                throw wrappedError;
            }
        });
    }

    /**
     * Validate hero object
     * @param {Object} hero - Hero to validate
     * @throws {Error} If validation fails
     */
    validateHero(hero) {
        Validator.notNull(hero, 'hero');
        Validator.isObject(hero, 'hero');

        // Required hero properties
        Validator.isString(hero.id || hero.heroId, 'hero.id');
        Validator.isString(hero.classId || hero.class, 'hero.classId');
        Validator.isString(hero.specId || hero.specialization || hero.spec, 'hero.specId');
        Validator.isNumber(hero.level, 'hero.level', 1, this.maxLevel);

        // Optional but commonly expected properties
        if (hero.name && typeof hero.name !== 'string') {
            const error = new Error('hero.name must be a string if provided');
            this.emitValidationError(error.message, 'validateHero');
            throw error;
        }

        if (hero.experience !== undefined) {
            Validator.isNumber(hero.experience, 'hero.experience', 0);
        }

        if (hero.health !== undefined) {
            Validator.isNumber(hero.health, 'hero.health', 0);
        }

        if (hero.maxHealth !== undefined) {
            Validator.isNumber(hero.maxHealth, 'hero.maxHealth', 1);
        }

        if (hero.mana !== undefined) {
            Validator.isNumber(hero.mana, 'hero.mana', 0);
        }
    }

    /**
     * Validate equipment data
     * @param {Object} equipment - Equipment to validate
     * @throws {Error} If validation fails
     */
    validateEquipment(equipment) {
        if (!equipment || typeof equipment !== 'object') return;

        // Use data-driven equipment slots
        for (const slot of this.equipmentSlots) {
            if (equipment[slot]) {
                this.validateItem(equipment[slot], slot);
            }
        }
    }

    /**
     * Validate item object
     * @param {Object} item - Item to validate
     * @param {string} slot - Equipment slot (for context)
     * @throws {Error} If validation fails
     */
    validateItem(item, slot = 'unknown') {
        Validator.notNull(item, `item in slot ${slot}`);
        Validator.isObject(item, `item in slot ${slot}`);

        Validator.isString(item.id || item.itemId, `item.id in slot ${slot}`);
        Validator.isString(item.name, `item.name in slot ${slot}`);

        if (item.level !== undefined) {
            Validator.isNumber(item.level, `item.level in slot ${slot}`, 1, this.maxLevel);
        }

        // Validate rarity (items.json uses 'rarity', but support 'quality' for backward compat)
        const rarity = item.rarity || item.quality;
        if (rarity !== undefined) {
            if (!this.validRarities.includes(rarity)) {
                const error = new Error(`item.rarity in slot ${slot} must be one of: ${this.validRarities.join(', ')}`);
                this.emitValidationError(error.message, 'validateItem');
                throw error;
            }
        }

        if (item.stats && typeof item.stats !== 'object') {
            const error = new Error(`item.stats in slot ${slot} must be an object if provided`);
            this.emitValidationError(error.message, 'validateItem');
            throw error;
        }
    }
}

export class UserInputValidator {
    /**
     * Validate text input
     * @param {string} input - Input to validate
     * @param {Object} options - Validation options
     * @throws {Error} If validation fails
     */
    static validateTextInput(input, options = {}) {
        const {
            required = false,
            minLength = 0,
            maxLength = 1000,
            pattern = null,
            allowedChars = null
        } = options;

        if (required && (!input || input.trim().length === 0)) {
            throw new Error('Input is required');
        }

        if (input && input.length < minLength) {
            throw new Error(`Input must be at least ${minLength} characters long`);
        }

        if (input && input.length > maxLength) {
            throw new Error(`Input must be no more than ${maxLength} characters long`);
        }

        if (pattern && input && !pattern.test(input)) {
            throw new Error('Input format is invalid');
        }

        if (allowedChars && input) {
            const invalidChars = input.split('').filter(char => !allowedChars.includes(char));
            if (invalidChars.length > 0) {
                throw new Error(`Input contains invalid characters: ${invalidChars.join(', ')}`);
            }
        }
    }

    /**
     * Validate numeric input
     * @param {number|string} input - Input to validate
     * @param {Object} options - Validation options
     * @throws {Error} If validation fails
     */
    static validateNumericInput(input, options = {}) {
        const {
            required = false,
            min = -Infinity,
            max = Infinity,
            integer = false,
            positive = false
        } = options;

        let numValue;

        if (typeof input === 'string') {
            if (required && input.trim().length === 0) {
                throw new Error('Numeric input is required');
            }
            numValue = parseFloat(input);
        } else {
            numValue = input;
        }

        if (required && (numValue === null || numValue === undefined || isNaN(numValue))) {
            throw new Error('Valid numeric input is required');
        }

        if (!isNaN(numValue)) {
            if (integer && !Number.isInteger(numValue)) {
                throw new Error('Input must be a whole number');
            }

            if (positive && numValue <= 0) {
                throw new Error('Input must be positive');
            }

            if (numValue < min || numValue > max) {
                throw new Error(`Input must be between ${min} and ${max}`);
            }
        }
    }

    /**
     * Validate selection from predefined options
     * @param {*} input - Input to validate
     * @param {Array} validOptions - Array of valid options
     * @param {Object} options - Validation options
     * @throws {Error} If validation fails
     */
    static validateSelection(input, validOptions, options = {}) {
        const { required = true, caseSensitive = false } = options;

        if (required && (input === null || input === undefined)) {
            throw new Error('Selection is required');
        }

        if (input !== null && input !== undefined) {
            const normalizedInput = caseSensitive ? input : String(input).toLowerCase();
            const normalizedOptions = caseSensitive ? validOptions : validOptions.map(opt => String(opt).toLowerCase());

            if (!normalizedOptions.includes(normalizedInput)) {
                throw new Error(`Invalid selection. Valid options: ${validOptions.join(', ')}`);
            }
        }
    }

    /**
     * Validate talent allocation
     * @param {string} heroId - Hero ID
     * @param {string} treeId - Talent tree ID
     * @param {string} talentId - Talent ID
     * @param {Object} talentManager - TalentManager instance
     * @throws {Error} If validation fails
     */
    static validateTalentAllocation(heroId, treeId, talentId, talentManager) {
        if (!talentManager) {
            throw new Error('talentManager is required for talent validation');
        }

        Validator.isString(heroId, 'heroId');
        Validator.isString(treeId, 'treeId');
        Validator.isString(talentId, 'talentId');

        // Check if talent can be allocated using TalentManager
        if (!talentManager.canAllocateTalent(heroId, treeId, talentId)) {
            throw new Error(`Cannot allocate talent ${treeId}.${talentId} for hero ${heroId}`);
        }

        // Validate available talent points
        const availablePoints = talentManager.getAvailableTalentPoints(heroId);
        if (availablePoints <= 0) {
            throw new Error(`Hero ${heroId} has no available talent points`);
        }
    }

    /**
     * Validate ability usage
     * @param {string} heroId - Hero ID
     * @param {string} abilityId - Ability ID
     * @param {Object} abilityManager - AbilityManager instance
     * @throws {Error} If validation fails
     */
    static validateAbilityUsage(heroId, abilityId, abilityManager) {
        if (!abilityManager) {
            throw new Error('abilityManager is required for ability validation');
        }

        Validator.isString(heroId, 'heroId');
        Validator.isString(abilityId, 'abilityId');

        // Check if ability exists
        const ability = abilityManager.getAbility(heroId, abilityId);
        if (!ability) {
            throw new Error(`Ability ${abilityId} not found for hero ${heroId}`);
        }

        // Check cooldown
        if (abilityManager.isOnCooldown(heroId, abilityId)) {
            throw new Error(`Ability ${abilityId} is on cooldown for hero ${heroId}`);
        }

        // Check resource cost
        const hero = abilityManager.scene?.partyManager?.getHeroById(heroId);
        if (hero && ability.cost > 0) {
            const resourceType = ability.resourceType || 'mana';
            const currentResource = hero[resourceType] || 0;
            if (currentResource < ability.cost) {
                throw new Error(`Hero ${heroId} has insufficient ${resourceType} (${currentResource}/${ability.cost})`);
            }
        }
    }

    /**
     * Validate combat state
     * @param {Object} combatManager - CombatManager instance
     * @throws {Error} If validation fails
     */
    static validateCombatState(combatManager) {
        if (!combatManager) {
            throw new Error('combatManager is required for combat state validation');
        }

        // Validate party composition if in party combat
        if (combatManager.isPartyCombat && combatManager.scene?.partyManager) {
            const isValid = combatManager.scene.partyManager.validatePartyComposition();
            if (!isValid) {
                throw new Error('Invalid party composition: must have 1 tank, 1 healer, 3 DPS');
            }
        }

        // Validate combat participants
        if (combatManager.inCombat) {
            if (!combatManager.hero && !combatManager.party) {
                throw new Error('Combat state invalid: no hero or party');
            }
            if (!combatManager.enemy) {
                throw new Error('Combat state invalid: no enemy');
            }
        }
    }
}

export class DataStructureValidator {
    /**
     * Initialize validator with scene context
     * @param {Object} scene - Phaser scene (optional)
     */
    constructor(scene = null) {
        this.scene = scene;
        this.sceneValidator = new SceneParameterValidator(scene);
        this.worldConfig = scene?.cache?.json?.get('worldConfig');
        this.maxLevel = this.worldConfig?.player?.experienceScaling?.maxLevel || 100;
        this.maxMile = 100; // From world-config or hardcoded
    }

    /**
     * Emit validation error event
     * @param {string} message - Error message
     * @param {string} context - Validation context
     */
    emitValidationError(message, context = 'DataStructureValidator') {
        if (this.scene?.events) {
            this.scene.events.emit(GameEvents.ERROR.OCCURRED, {
                type: 'validation',
                message,
                context,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Validate save data structure (throws on error)
     * @param {Object} saveData - Save data to validate
     * @throws {Error} If validation fails
     */
    validateSaveData(saveData) {
        Validator.notNull(saveData, 'saveData');
        Validator.isObject(saveData, 'saveData');

        // Validate basic structure
        if (!saveData.version) {
            const error = new Error('saveData.version is required');
            this.emitValidationError(error.message, 'validateSaveData');
            throw error;
        }

        // Validate party data (5-man system)
        if (saveData.party && !Array.isArray(saveData.party)) {
            const error = new Error('saveData.party must be an array if provided');
            this.emitValidationError(error.message, 'validateSaveData');
            throw error;
        }

        if (saveData.party) {
            if (saveData.party.length !== 5) {
                const error = new Error(`saveData.party must have exactly 5 heroes, got ${saveData.party.length}`);
                this.emitValidationError(error.message, 'validateSaveData');
                throw error;
            }

            saveData.party.forEach((hero, index) => {
                try {
                    this.sceneValidator.validateHero(hero);
                } catch (error) {
                    const wrappedError = new Error(`saveData.party[${index}]: ${error.message}`);
                    this.emitValidationError(wrappedError.message, 'validateSaveData');
                    throw wrappedError;
                }
            });
        }

        // Validate legacy player data (backward compatibility)
        if (saveData.player && typeof saveData.player !== 'object') {
            const error = new Error('saveData.player must be an object if provided');
            this.emitValidationError(error.message, 'validateSaveData');
            throw error;
        }

        // Validate equipment data
        if (saveData.equipment && typeof saveData.equipment !== 'object') {
            const error = new Error('saveData.equipment must be an object if provided');
            this.emitValidationError(error.message, 'validateSaveData');
            throw error;
        }

        // Validate world data
        if (saveData.world) {
            this.validateWorldData(saveData.world);
        }

        // Validate inventory
        if (saveData.inventory && !Array.isArray(saveData.inventory)) {
            const error = new Error('saveData.inventory must be an array if provided');
            this.emitValidationError(error.message, 'validateSaveData');
            throw error;
        }

        // Validate settings
        if (saveData.settings && typeof saveData.settings !== 'object') {
            const error = new Error('saveData.settings must be an object if provided');
            this.emitValidationError(error.message, 'validateSaveData');
            throw error;
        }
    }

    /**
     * Validate save data structure (returns boolean, doesn't throw)
     * Useful for SaveManager compatibility
     * @param {Object} saveData - Save data to validate
     * @returns {boolean} - True if valid
     */
    validateSaveDataSafe(saveData) {
        try {
            this.validateSaveData(saveData);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate world data structure
     * @param {Object} worldData - World data to validate
     * @throws {Error} If validation fails
     */
    validateWorldData(worldData) {
        Validator.notNull(worldData, 'worldData');
        Validator.isObject(worldData, 'worldData');

        if (worldData.currentMile !== undefined) {
            Validator.isNumber(worldData.currentMile, 'worldData.currentMile', 0, this.maxMile);
        }

        if (worldData.progress !== undefined) {
            Validator.isNumber(worldData.progress, 'worldData.progress', 0, 100);
        }
    }

    /**
     * Validate configuration data
     * @param {Object} config - Configuration to validate
     * @throws {Error} If validation fails
     */
    validateConfig(config) {
        Validator.notNull(config, 'config');
        Validator.isObject(config, 'config');

        // Validate common config sections
        if (config.classes && !Array.isArray(config.classes)) {
            const error = new Error('config.classes must be an array if provided');
            this.emitValidationError(error.message, 'validateConfig');
            throw error;
        }

        if (config.specializations && !Array.isArray(config.specializations)) {
            const error = new Error('config.specializations must be an array if provided');
            this.emitValidationError(error.message, 'validateConfig');
            throw error;
        }

        if (config.stats && typeof config.stats !== 'object') {
            const error = new Error('config.stats must be an object if provided');
            this.emitValidationError(error.message, 'validateConfig');
            throw error;
        }

        if (config.world && typeof config.world !== 'object') {
            const error = new Error('config.world must be an object if provided');
            this.emitValidationError(error.message, 'validateConfig');
            throw error;
        }
    }

    /**
     * Validate game state for consistency
     * @param {Object} gameState - Game state to validate
     * @throws {Error} If validation fails
     */
    validateGameState(gameState) {
        if (!gameState || typeof gameState !== 'object') return;

        // Cross-reference validation
        if (gameState.partyManager && gameState.worldManager) {
            // Validate that party heroes are consistent with world expectations
            const party = gameState.partyManager;
            const world = gameState.worldManager;

            if (party.heroes && world.currentMile !== undefined) {
                party.heroes.forEach((hero) => {
                    if (hero.level > world.currentMile + 10) {
                        const warning = `Hero ${hero.id} level (${hero.level}) seems too high for mile ${world.currentMile}`;
                        console.warn(warning);
                        this.emitValidationError(warning, 'validateGameState');
                    }
                });
            }
        }
    }
}

/**
 * Manager Validation Helpers
 * Common validation patterns for managers
 */
export class ManagerValidationHelpers {
    /**
     * Validate equipment slot name
     * @param {string} slot - Slot name to validate
     * @param {Object} equipmentManager - EquipmentManager instance
     * @throws {Error} If slot is invalid
     */
    static validateEquipmentSlot(slot, equipmentManager) {
        if (!equipmentManager) {
            throw new Error('equipmentManager is required');
        }

        Validator.isString(slot, 'slot');

        const validSlots = Object.keys(equipmentManager.equipmentSlotTemplate || {});
        if (!validSlots.includes(slot)) {
            throw new Error(`Invalid equipment slot: ${slot}. Valid slots: ${validSlots.join(', ')}`);
        }
    }

    /**
     * Validate item ID exists in items data
     * @param {string} itemId - Item ID to validate
     * @param {Object} itemsData - Items data from cache
     * @throws {Error} If item ID is invalid
     */
    static validateItemId(itemId, itemsData) {
        Validator.isString(itemId, 'itemId');

        if (!itemsData) {
            throw new Error('itemsData is required');
        }

        // Check all categories
        const categories = ['weapons', 'armor', 'accessories', 'consumables'];
        let found = false;

        for (const category of categories) {
            if (itemsData[category] && itemsData[category][itemId]) {
                found = true;
                break;
            }
        }

        if (!found) {
            throw new Error(`Invalid itemId: ${itemId} not found in items data`);
        }
    }

    /**
     * Validate hero ID exists in party
     * @param {string} heroId - Hero ID to validate
     * @param {Object} partyManager - PartyManager instance
     * @throws {Error} If hero ID is invalid
     */
    static validateHeroId(heroId, partyManager) {
        if (!partyManager) {
            throw new Error('partyManager is required');
        }

        Validator.isString(heroId, 'heroId');

        const hero = partyManager.getHeroById(heroId);
        if (!hero) {
            throw new Error(`Invalid heroId: ${heroId} not found in party`);
        }
    }

    /**
     * Validate class ID exists in classes data
     * @param {string} classId - Class ID to validate
     * @param {Object} classesData - Classes data from cache
     * @throws {Error} If class ID is invalid
     */
    static validateClassId(classId, classesData) {
        Validator.isString(classId, 'classId');

        if (!classesData || !classesData.classes) {
            throw new Error('classesData is required');
        }

        const classExists = classesData.classes.some(cls => cls.id === classId);
        if (!classExists) {
            throw new Error(`Invalid classId: ${classId} not found in classes data`);
        }
    }

    /**
     * Validate specialization ID exists for a class
     * @param {string} specId - Specialization ID to validate
     * @param {string} classId - Class ID
     * @param {Object} specializationsData - Specializations data from cache
     * @throws {Error} If specialization ID is invalid
     */
    static validateSpecializationId(specId, classId, specializationsData) {
        Validator.isString(specId, 'specId');
        Validator.isString(classId, 'classId');

        if (!specializationsData || !specializationsData.specializations) {
            throw new Error('specializationsData is required');
        }

        const classSpecs = specializationsData.specializations[classId];
        if (!classSpecs) {
            throw new Error(`No specializations found for classId: ${classId}`);
        }

        const specExists = classSpecs.some(spec => spec.id === specId);
        if (!specExists) {
            throw new Error(`Invalid specId: ${specId} not found for classId: ${classId}`);
        }
    }

    /**
     * Validate enemy data structure
     * @param {Object} enemy - Enemy to validate
     * @throws {Error} If enemy is invalid
     */
    static validateEnemy(enemy) {
        Validator.notNull(enemy, 'enemy');
        Validator.isObject(enemy, 'enemy');

        if (!enemy.data) {
            throw new Error('enemy.data is required');
        }

        Validator.isObject(enemy.data, 'enemy.data');

        if (!enemy.data.id) {
            throw new Error('enemy.data.id is required');
        }

        if (!enemy.data.stats) {
            throw new Error('enemy.data.stats is required');
        }

        Validator.isObject(enemy.data.stats, 'enemy.data.stats');
    }
}

/**
 * Validation result utilities
 */
export class ValidationResult {
    /**
     * Create a new ValidationResult
     * @param {boolean} isValid - Whether validation passed
     * @param {Array} errors - Array of error messages
     * @param {Array} warnings - Array of warning messages
     */
    constructor(isValid = true, errors = [], warnings = []) {
        this.isValid = isValid;
        this.errors = errors;
        this.warnings = warnings;
    }

    /**
     * Add an error
     * @param {string} message - Error message
     */
    addError(message) {
        this.errors.push(message);
        this.isValid = false;
    }

    /**
     * Add a warning
     * @param {string} message - Warning message
     */
    addWarning(message) {
        this.warnings.push(message);
    }

    /**
     * Get all messages
     * @returns {Array} All error and warning messages
     */
    getAllMessages() {
        return [...this.errors, ...this.warnings];
    }

    /**
     * Throw if invalid
     * @throws {Error} If validation failed
     */
    throwIfInvalid() {
        if (!this.isValid) {
            throw new Error(`Validation failed: ${this.errors.join(', ')}`);
        }
    }
}

// Global validation helper (backward compatible, but prefers scene context)
export function validateSceneTransition(targetScene, data, scene = null) {
    try {
        const validator = new SceneParameterValidator(scene);
        validator.validateSceneTransition(targetScene, data);
        return new ValidationResult(true);
    } catch (error) {
        return new ValidationResult(false, [error.message]);
    }
}

// Static methods for backward compatibility (create instance internally)
SceneParameterValidator.validateSceneTransition = function(targetScene, data, scene = null) {
    const validator = new SceneParameterValidator(scene);
    return validator.validateSceneTransition(targetScene, data);
};

SceneParameterValidator.validateHero = function(hero, scene = null) {
    const validator = new SceneParameterValidator(scene);
    return validator.validateHero(hero);
};

SceneParameterValidator.validatePartyManager = function(partyManager, scene = null) {
    const validator = new SceneParameterValidator(scene);
    return validator.validatePartyManager(partyManager);
};

SceneParameterValidator.validateEquipment = function(equipment, scene = null) {
    const validator = new SceneParameterValidator(scene);
    return validator.validateEquipment(equipment);
};

SceneParameterValidator.validateItem = function(item, slot, scene = null) {
    const validator = new SceneParameterValidator(scene);
    return validator.validateItem(item, slot);
};

/**
 * Manager Validation Mixin
 * Provides easy-to-use validation methods for managers
 * Usage: Object.assign(YourManager.prototype, ManagerValidationMixin)
 */
export const ManagerValidationMixin = {
    /**
     * Get validator instance with scene context
     * @returns {SceneParameterValidator}
     */
    getValidator() {
        if (!this._validator) {
            this._validator = new SceneParameterValidator(this.scene);
        }
        return this._validator;
    },

    /**
     * Get manager validation helpers
     * @returns {typeof ManagerValidationHelpers}
     */
    getValidationHelpers() {
        return ManagerValidationHelpers;
    },

    /**
     * Validate equipment slot (convenience method)
     * @param {string} slot - Slot name
     * @returns {boolean} - True if valid
     */
    validateSlot(slot) {
        try {
            ManagerValidationHelpers.validateEquipmentSlot(slot, this);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate item ID (convenience method)
     * @param {string} itemId - Item ID
     * @returns {boolean} - True if valid
     */
    validateItemId(itemId) {
        try {
            const itemsData = this.scene?.cache?.json?.get('items') || this.itemsData;
            ManagerValidationHelpers.validateItemId(itemId, itemsData);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate hero ID (convenience method)
     * @param {string} heroId - Hero ID
     * @returns {boolean} - True if valid
     */
    validateHeroId(heroId) {
        try {
            const partyManager = this.partyManager || this.scene?.partyManager;
            ManagerValidationHelpers.validateHeroId(heroId, partyManager);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Validate and log error (convenience method)
     * @param {Function} validatorFn - Validation function that throws on error
     * @param {string} context - Context for logging
     * @param {Logger} logger - Logger instance (optional)
     * @returns {boolean} - True if valid
     */
    validateAndLog(validatorFn, context, logger = null) {
        try {
            validatorFn();
            return true;
        } catch (error) {
            if (logger) {
                logger.error(context, error.message);
            } else if (this.scene?.events) {
                this.scene.events.emit(GameEvents.ERROR.OCCURRED, {
                    type: 'validation',
                    message: error.message,
                    context,
                    timestamp: Date.now()
                });
            }
            return false;
        }
    },

    /**
     * Create a ValidationBuilder pre-configured with manager context
     * @returns {ValidationBuilder}
     */
    createValidator() {
        const builder = ValidationBuilder.create();
        // Store manager reference for convenience methods
        builder._manager = this;
        return builder;
    },

    /**
     * Quick validation chain with automatic error handling
     * @param {Function} builderFn - Function that receives ValidationBuilder and returns ValidationResult
     * @param {string} context - Context for logging
     * @param {Logger} logger - Logger instance (optional)
     * @returns {boolean} - True if valid
     */
    quickValidate(builderFn, context, logger = null) {
        const builder = this.createValidator();
        const result = builderFn(builder);
        
        if (!result.isValid) {
            const errorMsg = result.errors.join(', ');
            if (logger) {
                logger.error(context, errorMsg);
            } else if (this.scene?.events) {
                this.scene.events.emit(GameEvents.ERROR.OCCURRED, {
                    type: 'validation',
                    message: errorMsg,
                    context,
                    timestamp: Date.now()
                });
            }
        }
        
        return result.isValid;
    }
};

/**
 * Validation Builder
 * Fluent API for building validation chains
 * 
 * @example
 * const result = ValidationBuilder.create()
 *   .validateSlot(slot, equipmentManager)
 *   .validateItemId(itemId, itemsData)
 *   .validateHeroId(heroId, partyManager)
 *   .execute();
 * 
 * if (!result.isValid) {
 *     Logger.error('EquipmentManager', result.errors.join(', '));
 *     return false;
 * }
 */
export class ValidationBuilder {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Create a new validation builder
     * @returns {ValidationBuilder}
     */
    static create() {
        return new ValidationBuilder();
    }

    /**
     * Validate equipment slot
     * @param {string} slot - Slot name
     * @param {Object} equipmentManager - EquipmentManager instance
     * @returns {ValidationBuilder}
     */
    validateSlot(slot, equipmentManager) {
        try {
            ManagerValidationHelpers.validateEquipmentSlot(slot, equipmentManager);
        } catch (error) {
            this.errors.push(error.message);
        }
        return this;
    }

    /**
     * Validate item ID
     * @param {string} itemId - Item ID
     * @param {Object} itemsData - Items data
     * @returns {ValidationBuilder}
     */
    validateItemId(itemId, itemsData) {
        try {
            ManagerValidationHelpers.validateItemId(itemId, itemsData);
        } catch (error) {
            this.errors.push(error.message);
        }
        return this;
    }

    /**
     * Validate hero ID
     * @param {string} heroId - Hero ID
     * @param {Object} partyManager - PartyManager instance
     * @returns {ValidationBuilder}
     */
    validateHeroId(heroId, partyManager) {
        try {
            ManagerValidationHelpers.validateHeroId(heroId, partyManager);
        } catch (error) {
            this.errors.push(error.message);
        }
        return this;
    }

    /**
     * Validate class ID
     * @param {string} classId - Class ID
     * @param {Object} classesData - Classes data
     * @returns {ValidationBuilder}
     */
    validateClassId(classId, classesData) {
        try {
            ManagerValidationHelpers.validateClassId(classId, classesData);
        } catch (error) {
            this.errors.push(error.message);
        }
        return this;
    }

    /**
     * Validate enemy
     * @param {Object} enemy - Enemy object
     * @returns {ValidationBuilder}
     */
    validateEnemy(enemy) {
        try {
            ManagerValidationHelpers.validateEnemy(enemy);
        } catch (error) {
            this.errors.push(error.message);
        }
        return this;
    }

    /**
     * Custom validation
     * @param {Function} validatorFn - Validation function that throws on error
     * @param {string} errorMessage - Custom error message if validation fails
     * @returns {ValidationBuilder}
     */
    custom(validatorFn, errorMessage = null) {
        try {
            validatorFn();
        } catch (error) {
            this.errors.push(errorMessage || error.message);
        }
        return this;
    }

    /**
     * Execute validation chain
     * @returns {ValidationResult}
     */
    execute() {
        return new ValidationResult(
            this.errors.length === 0,
            this.errors,
            this.warnings
        );
    }

    /**
     * Throw if invalid
     * @throws {Error} If validation failed
     */
    throwIfInvalid() {
        if (this.errors.length > 0) {
            throw new Error(`Validation failed: ${this.errors.join(', ')}`);
        }
    }
}

/**
 * Method Validation Wrapper
 * Wraps manager methods with automatic validation
 * 
 * @example
 * class EquipmentManager {
 *   constructor(scene) {
 *     this.scene = scene;
 *     // Wrap methods with validation
 *     this.equipItem = withValidation(
 *       this.equipItem.bind(this),
 *       (itemId, slot, heroId) => {
 *         const builder = ValidationBuilder.create()
 *           .validateItemId(itemId, this.itemsData)
 *           .validateSlot(slot, this);
 *         return builder.execute();
 *       },
 *       'EquipmentManager.equipItem'
 *     );
 *   }
 * }
 */
export function withValidation(method, validatorFn, context, logger = null) {
    return function(...args) {
        const result = validatorFn(...args);
        
        if (!result.isValid) {
            const errorMsg = result.errors.join(', ');
            if (logger) {
                logger.error(context, errorMsg);
            } else if (this.scene?.events) {
                this.scene.events.emit(GameEvents.ERROR.OCCURRED, {
                    type: 'validation',
                    message: errorMsg,
                    context,
                    timestamp: Date.now()
                });
            }
            return false;
        }
        
        return method.apply(this, args);
    };
}

/**
 * Validation Registry
 * Central registry for discovering available validators
 */
export const ValidationRegistry = {
    /**
     * Get all available validators
     * @returns {Object} Map of validator names to classes
     */
    getValidators() {
        return {
            SceneParameterValidator,
            UserInputValidator,
            DataStructureValidator,
            ManagerValidationHelpers
        };
    },

    /**
     * Get validator by name
     * @param {string} name - Validator name
     * @returns {Function|null} Validator class or null
     */
    getValidator(name) {
        const validators = this.getValidators();
        return validators[name] || null;
    },

    /**
     * Get common validation patterns
     * @returns {Object} Map of pattern names to example usage
     */
    getPatterns() {
        return {
            'equipment-slot': {
                example: 'ManagerValidationHelpers.validateEquipmentSlot(slot, equipmentManager)',
                description: 'Validates equipment slot name against manager template'
            },
            'item-id': {
                example: 'ManagerValidationHelpers.validateItemId(itemId, itemsData)',
                description: 'Validates item ID exists in items data'
            },
            'hero-id': {
                example: 'ManagerValidationHelpers.validateHeroId(heroId, partyManager)',
                description: 'Validates hero ID exists in party'
            },
            'scene-transition': {
                example: 'validateSceneTransition(targetScene, data, scene)',
                description: 'Validates scene transition parameters'
            },
            'save-data': {
                example: 'new DataStructureValidator(scene).validateSaveData(saveData)',
                description: 'Validates save data structure'
            }
        };
    }
};


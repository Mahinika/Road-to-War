/**
 * Data Validator - Validates JSON data files against schemas
 * Provides immediate feedback on data structure errors during development
 */

import { Logger } from './logger.js';

export class DataValidator {
    constructor() {
        this.schemas = new Map();
        this.validationResults = new Map();
        this.errors = [];
        this.warnings = [];

        // Initialize schemas
        this.initializeSchemas();
    }

    /**
     * Initialize validation schemas for all data files
     */
    initializeSchemas() {
        // Talent schema
        this.schemas.set('talents', {
            required: true,
            type: 'object',
            properties: {
                paladin: { type: 'object', required: true },
                warrior: { type: 'object', required: true },
                hunter: { type: 'object', required: true },
                rogue: { type: 'object', required: true },
                shaman: { type: 'object', required: true },
                priest: { type: 'object', required: true },
                mage: { type: 'object', required: true },
                warlock: { type: 'object', required: true },
                druid: { type: 'object', required: true }
            },
            customValidators: [this.validateTalentTrees.bind(this)]
        });

        // Items schema
        this.schemas.set('items', {
            required: true,
            type: 'object',
            properties: {
                weapons: { type: 'object', required: true },
                armor: { type: 'object', required: true },
                accessories: { type: 'object', required: true },
                consumables: { type: 'object', required: true }
            },
            customValidators: [this.validateItems.bind(this)]
        });

        // Stats config schema
        this.schemas.set('stats-config', {
            required: true,
            type: 'object',
            properties: {
                ratingConversions: { type: 'object', required: true },
                defenseCap: { type: 'object', required: true },
                primaryStatConversions: { type: 'object', required: true },
                secondaryStatConversions: { type: 'object', required: true }
            },
            customValidators: [this.validateStatsConfig.bind(this)]
        });

        // Classes schema
        this.schemas.set('classes', {
            required: true,
            type: 'object',
            customValidators: [this.validateClasses.bind(this)]
        });

        // Specializations schema
        this.schemas.set('specializations', {
            required: true,
            type: 'object',
            customValidators: [this.validateSpecializations.bind(this)]
        });

        // World config schema
        this.schemas.set('worldConfig', {
            required: true,
            type: 'object',
            properties: {
                worldGeneration: { type: 'object', required: true },
                encounters: { type: 'object', required: true }
            },
            customValidators: [this.validateWorldConfig.bind(this)]
        });

        // Enemies schema
        this.schemas.set('enemies', {
            required: true,
            type: 'object',
            customValidators: [this.validateEnemies.bind(this)]
        });

        // Achievements schema
        this.schemas.set('achievements', {
            required: true,
            type: 'object',
            properties: {
                achievements: { type: 'array', required: true }
            },
            customValidators: [this.validateAchievements.bind(this)]
        });

        // Prestige config schema
        this.schemas.set('prestigeConfig', {
            required: true,
            type: 'object',
            properties: {
                upgrades: { type: 'array', required: true }
            },
            customValidators: [this.validatePrestigeConfig.bind(this)]
        });
    }

    /**
     * Validate a data file against its schema
     * @param {string} fileName - Name of the data file (without .json)
     * @param {Object} data - The data to validate
     * @returns {Object} Validation result
     */
    validateDataFile(fileName, data) {
        const schema = this.schemas.get(fileName);
        if (!schema) {
            Logger.warn('DataValidator', `No schema defined for ${fileName}`);
            return { valid: true, errors: [], warnings: [] };
        }

        this.errors = [];
        this.warnings = [];

        try {
            // Basic type validation
            this.validateBasicType(data, schema, fileName);

            // Property validation
            if (schema.properties) {
                this.validateProperties(data, schema.properties, fileName);
            }

            // Custom validators
            if (schema.customValidators) {
                for (const validator of schema.customValidators) {
                    validator(data, fileName);
                }
            }

        } catch (error) {
            this.addError(fileName, 'Validation failed', error.message);
        }

        const result = {
            valid: this.errors.length === 0,
            errors: [...this.errors],
            warnings: [...this.warnings]
        };

        this.validationResults.set(fileName, result);

        // Log results
        if (!result.valid) {
            Logger.error('DataValidator', `Validation failed for ${fileName}.json:`, result.errors);
        } else if (result.warnings.length > 0) {
            Logger.warn('DataValidator', `Validation warnings for ${fileName}.json:`, result.warnings);
        } else {
            Logger.info('DataValidator', `Validation passed for ${fileName}.json`);
        }

        return result;
    }

    /**
     * Validate basic type requirements
     */
    validateBasicType(data, schema, fileName) {
        if (schema.required && (data === null || data === undefined)) {
            this.addError(fileName, 'Required data', 'Data file is null or undefined');
            return;
        }

        if (schema.type) {
            const actualType = Array.isArray(data) ? 'array' : typeof data;
            if (actualType !== schema.type) {
                this.addError(fileName, 'Type mismatch', `Expected ${schema.type}, got ${actualType}`);
            }
        }
    }

    /**
     * Validate required properties
     */
    validateProperties(data, properties, fileName) {
        for (const [propName, propSchema] of Object.entries(properties)) {
            if (propSchema.required && !(propName in data)) {
                this.addError(fileName, 'Missing property', `Required property '${propName}' is missing`);
            }

            if (propName in data) {
                const value = data[propName];
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (propSchema.type && actualType !== propSchema.type) {
                    this.addError(fileName, 'Property type mismatch',
                        `Property '${propName}' expected ${propSchema.type}, got ${actualType}`);
                }
            }
        }
    }

    /**
     * Validate talent trees structure
     */
    validateTalentTrees(data, fileName) {
        for (const [className, classData] of Object.entries(data)) {
            if (!classData.trees) {
                this.addError(fileName, 'Invalid talent structure', `Class ${className} missing trees property`);
                continue;
            }

            for (const [treeName, treeData] of Object.entries(classData.trees)) {
                if (!treeData.talents) {
                    this.addError(fileName, 'Invalid talent tree', `Tree ${treeName} in class ${className} missing talents`);
                    continue;
                }

                for (const [talentId, talentData] of Object.entries(treeData.talents)) {
                    this.validateTalentStructure(talentId, talentData, fileName, className, treeName);
                }
            }
        }
    }

    /**
     * Validate individual talent structure
     */
    validateTalentStructure(talentId, talent, fileName, className, treeName) {
        const requiredFields = ['name', 'maxPoints', 'row', 'column'];
        for (const field of requiredFields) {
            if (!(field in talent)) {
                this.addError(fileName, 'Invalid talent', `Talent ${talentId} in ${className}/${treeName} missing ${field}`);
            }
        }

        if (talent.maxPoints && (talent.maxPoints < 1 || talent.maxPoints > 5)) {
            this.addWarning(fileName, 'Unusual max points', `Talent ${talentId} has maxPoints ${talent.maxPoints} (expected 1-5)`);
        }

        if (talent.row && (talent.row < 1 || talent.row > 14)) {
            this.addError(fileName, 'Invalid row', `Talent ${talentId} has invalid row ${talent.row} (expected 1-14)`);
        }

        if (talent.column && (talent.column < 1 || talent.column > 4)) {
            this.addError(fileName, 'Invalid column', `Talent ${talentId} has invalid column ${talent.column} (expected 1-4)`);
        }
    }

    /**
     * Validate items structure
     */
    validateItems(data, fileName) {
        const categories = ['weapons', 'armor', 'accessories', 'consumables'];

        for (const category of categories) {
            if (typeof data[category] !== 'object' || Array.isArray(data[category])) {
                this.addError(fileName, 'Invalid category', `Category ${category} is not an object`);
                continue;
            }

            for (const [itemId, item] of Object.entries(data[category])) {
                this.validateItemStructure(itemId, item, fileName, category);
            }
        }
    }

    /**
     * Validate individual item structure
     */
    validateItemStructure(itemId, item, fileName, category) {
        const requiredFields = ['id', 'name', 'rarity'];

        for (const field of requiredFields) {
            if (!(field in item)) {
                this.addError(fileName, 'Invalid item', `Item ${itemId} in ${category} missing ${field}`);
            }
        }

        if (item.stats && typeof item.stats !== 'object') {
            this.addError(fileName, 'Invalid item stats', `Item ${itemId} has invalid stats type`);
        }

        if (item.rarity && !['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(item.rarity)) {
            this.addWarning(fileName, 'Unusual rarity', `Item ${itemId} has rarity '${item.rarity}'`);
        }
    }

    /**
     * Validate stats config
     */
    validateStatsConfig(data, fileName) {
        if (!data.ratingConversions) {
            this.addError(fileName, 'Missing rating conversions', 'ratingConversions is required');
            return;
        }

        // Check for essential rating conversions
        const requiredRatings = ['critRating', 'hasteRating', 'defenseRating'];
        for (const rating of requiredRatings) {
            if (!data.ratingConversions[rating]) {
                this.addError(fileName, `Missing ${rating}`, `ratingConversions.${rating} is required`);
            }
        }

        if (!data.defenseCap) {
            this.addError(fileName, 'Missing defense cap', 'defenseCap is required');
        }

        if (!data.primaryStatConversions) {
            this.addError(fileName, 'Missing primary stat conversions', 'primaryStatConversions is required');
        }

        if (!data.secondaryStatConversions) {
            this.addError(fileName, 'Missing secondary stat conversions', 'secondaryStatConversions is required');
        }
    }

    /**
     * Validate classes array
     */
    validateClasses(data, fileName) {
        if (typeof data !== 'object' || Array.isArray(data)) {
            this.addError(fileName, 'Invalid format', 'Classes data should be an object');
            return;
        }

        for (const [classId, classData] of Object.entries(data)) {
            if (!classData.id || !classData.name) {
                this.addError(fileName, 'Invalid class', `Class ${classId} missing id or name`);
            }
        }
    }

    /**
     * Validate specializations
     */
    validateSpecializations(data, fileName) {
        for (const [specId, specData] of Object.entries(data)) {
            if (!specData.id || !specData.classId || !specData.name || !specData.role) {
                this.addError(fileName, 'Invalid specialization', `Specialization ${specId} missing required fields (id, classId, name, role)`);
            }

            if (!['tank', 'healer', 'dps'].includes(specData.role)) {
                this.addWarning(fileName, 'Unusual role', `Specialization ${specId} has role '${specData.role}'`);
            }
        }
    }

    /**
     * Validate world config
     */
    validateWorldConfig(data, fileName) {
        if (!data.worldGeneration?.scrollSpeed) {
            this.addError(fileName, 'Missing scroll speed', 'worldGeneration.scrollSpeed is required');
        }

        if (data.worldGeneration?.scrollSpeed && data.worldGeneration.scrollSpeed <= 0) {
            this.addError(fileName, 'Invalid scroll speed', 'Scroll speed must be positive');
        }
    }

    /**
     * Validate enemies
     */
    validateEnemies(data, fileName) {
        for (const [enemyId, enemyData] of Object.entries(data)) {
            if (!enemyData.name || !enemyData.stats) {
                this.addError(fileName, 'Invalid enemy', `Enemy ${enemyId} missing name or stats`);
            }

            if (enemyData.stats?.health && enemyData.stats.health <= 0) {
                this.addError(fileName, 'Invalid enemy health', `Enemy ${enemyId} has invalid health`);
            }
        }
    }

    /**
     * Validate achievements
     */
    validateAchievements(data, fileName) {
        if (!Array.isArray(data.achievements)) {
            this.addError(fileName, 'Invalid achievements', 'achievements should be an array');
            return;
        }

        for (const [index, achievement] of data.achievements.entries()) {
            if (!achievement.id || !achievement.name || !achievement.description) {
                this.addError(fileName, 'Invalid achievement', `Achievement ${index} missing required fields`);
            }
        }
    }

    /**
     * Validate prestige config
     */
    validatePrestigeConfig(data, fileName) {
        if (!Array.isArray(data.upgrades)) {
            this.addError(fileName, 'Invalid upgrades', 'upgrades should be an array');
            return;
        }

        for (const [index, upgrade] of data.upgrades.entries()) {
            if (!upgrade.id || !upgrade.name || typeof upgrade.cost !== 'number') {
                this.addError(fileName, 'Invalid upgrade', `Upgrade ${index} missing required fields`);
            }
        }
    }

    /**
     * Add an error to the current validation
     */
    addError(fileName, type, message) {
        this.errors.push({
            file: fileName,
            type,
            message,
            severity: 'error'
        });
    }

    /**
     * Add a warning to the current validation
     */
    addWarning(fileName, type, message) {
        this.warnings.push({
            file: fileName,
            type,
            message,
            severity: 'warning'
        });
    }

    /**
     * Get validation summary for all files
     */
    getValidationSummary() {
        const summary = {
            totalFiles: this.validationResults.size,
            validFiles: 0,
            invalidFiles: 0,
            totalErrors: 0,
            totalWarnings: 0,
            details: {}
        };

        for (const [fileName, result] of this.validationResults) {
            summary.details[fileName] = result;

            if (result.valid) {
                summary.validFiles++;
            } else {
                summary.invalidFiles++;
            }

            summary.totalErrors += result.errors.length;
            summary.totalWarnings += result.warnings.length;
        }

        return summary;
    }

    /**
     * Validate all loaded data files
     * @param {Phaser.Scene} scene - The Phaser scene with loaded cache
     */
    validateAllDataFiles(scene) {
        Logger.info('DataValidator', 'Starting validation of all data files...');

        const dataFiles = [
            'talents', 'items', 'stats-config', 'classes', 'specializations',
            'worldConfig', 'enemies', 'achievements', 'prestigeConfig'
        ];

        for (const fileName of dataFiles) {
            try {
                const data = scene.cache.json.get(fileName);
                if (data !== undefined) {
                    this.validateDataFile(fileName, data);
                } else {
                    Logger.warn('DataValidator', `Data file ${fileName} not loaded`);
                }
            } catch (error) {
                Logger.error('DataValidator', `Failed to validate ${fileName}:`, error);
            }
        }

        const summary = this.getValidationSummary();
        Logger.info('DataValidator', 'Validation complete:', summary);

        return summary;
    }
}

// Export singleton instance
export const dataValidator = new DataValidator();

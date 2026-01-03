import { Logger } from './logger.js';

/**
 * Save Migration System - Handles versioned save file migrations
 * Provides step-by-step migration paths with validation and rollback support
 */
export class SaveMigration {
    constructor() {
        // Version registry: Map<version, migration function>
        this.migrations = new Map();
        this.currentVersion = '1.0.0';
        this.migrationHistory = [];
        
        // Register migration handlers
        this.registerMigrations();
    }

    /**
     * Register all migration handlers
     */
    registerMigrations() {
        // v1.0.0 → v1.1.0: Add new fields with defaults
        this.migrations.set('1.0.0->1.1.0', (saveData) => {
            Logger.info('SaveMigration', 'Migrating from v1.0.0 to v1.1.0');
            
            // Add missing fields with defaults
            if (!saveData.settings) {
                saveData.settings = {
                    masterVolume: 0.8,
                    sfxVolume: 0.7,
                    musicVolume: 0.6,
                    autoSpeed: true,
                    showDamageNumbers: true,
                    fullscreen: false,
                    particleEffects: true
                };
            }

            if (!saveData.world) {
                saveData.world = {
                    currentSegment: 0,
                    currentMile: 0,
                    maxMileReached: 0,
                    enemiesDefeated: 0,
                    distanceTraveled: 0
                };
            } else {
                // Migration: If save has currentSegment but no currentMile, calculate from segment
                if (saveData.world.currentSegment !== undefined && saveData.world.currentMile === undefined) {
                    const segmentsPerMile = saveData?.world?.segmentsPerMile || 10;
                    saveData.world.currentMile = Math.floor(saveData.world.currentSegment / segmentsPerMile);
                    saveData.world.maxMileReached = saveData.world.currentMile;
                }
            }

            saveData.version = '1.1.0';
            return saveData;
        });

        // v1.1.0 → v1.2.0: Add party system support
        this.migrations.set('1.1.0->1.2.0', (saveData) => {
            Logger.info('SaveMigration', 'Migrating from v1.1.0 to v1.2.0');
            
            // Ensure party structure exists
            if (!saveData.party) {
                saveData.party = {
                    heroes: []
                };
            }

            // Migrate single hero to party if needed
            if (saveData.player && !saveData.party.heroes || saveData.party.heroes.length === 0) {
                // Convert single hero to party format
                saveData.party.heroes = [{
                    id: 'hero_0',
                    classId: 'paladin',
                    specId: 'protection',
                    level: saveData.player.level || 1,
                    experience: saveData.player.experience || 0,
                    stats: {
                        health: saveData.player.health || 100,
                        maxHealth: saveData.player.maxHealth || 100,
                        attack: saveData.player.attack || 10,
                        defense: saveData.player.defense || 5
                    }
                }];
            }

            saveData.version = '1.2.0';
            return saveData;
        });

        // Future migrations can be added here
        // Example: v1.2.0 -> v1.3.0
        // this.migrations.set('1.2.0->1.3.0', (saveData) => { ... });
    }

    /**
     * Get save version from save data
     * @param {Object} saveData - Save data object
     * @returns {string} Version string
     */
    getSaveVersion(saveData) {
        if (!saveData || !saveData.version) {
            return '1.0.0'; // Default to oldest version
        }
        return saveData.version;
    }

    /**
     * Migrate save data to latest version
     * @param {Object} saveData - Save data to migrate
     * @param {string} targetVersion - Target version (defaults to current)
     * @returns {Object} Migrated save data
     */
    migrateToLatest(saveData, targetVersion = this.currentVersion) {
        const currentVersion = this.getSaveVersion(saveData);
        
        if (currentVersion === targetVersion) {
            Logger.debug('SaveMigration', `Save already at version ${targetVersion}`);
            return saveData;
        }

        if (this.compareVersions(currentVersion, targetVersion) > 0) {
            Logger.warn('SaveMigration', `Save version ${currentVersion} is newer than target ${targetVersion}`);
            return saveData;
        }

        // Create backup
        const backup = JSON.parse(JSON.stringify(saveData));
        const migrationPath = [];

        try {
            // Step through migration path
            let version = currentVersion;
            while (this.compareVersions(version, targetVersion) < 0) {
                const nextVersion = this.getNextVersion(version);
                if (!nextVersion) {
                    Logger.warn('SaveMigration', `No migration path from ${version} to ${targetVersion}`);
                    break;
                }

                const migrationKey = `${version}->${nextVersion}`;
                const migration = this.migrations.get(migrationKey);

                if (!migration) {
                    Logger.warn('SaveMigration', `No migration handler for ${migrationKey}`);
                    break;
                }

                // Apply migration
                saveData = migration(saveData);
                version = nextVersion;
                migrationPath.push(migrationKey);

                Logger.info('SaveMigration', `Applied migration: ${migrationKey}`);
            }

            // Record migration history
            this.migrationHistory.push({
                fromVersion: currentVersion,
                toVersion: version,
                path: migrationPath,
                timestamp: Date.now()
            });

            // Validate migrated data
            if (!this.validateMigratedData(saveData)) {
                Logger.error('SaveMigration', 'Migration validation failed, restoring backup');
                return backup;
            }

            return saveData;
        } catch (error) {
            Logger.error('SaveMigration', 'Migration failed:', error);
            Logger.info('SaveMigration', 'Restoring backup');
            return backup;
        }
    }

    /**
     * Compare two version strings
     * @param {string} v1 - First version
     * @param {string} v2 - Second version
     * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     */
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        
        return 0;
    }

    /**
     * Get next version in migration path
     * @param {string} version - Current version
     * @returns {string|null} Next version or null if none
     */
    getNextVersion(version) {
        // Find migration that starts from this version
        for (const [key] of this.migrations) {
            const [fromVersion] = key.split('->');
            if (fromVersion === version) {
                return key.split('->')[1];
            }
        }
        return null;
    }

    /**
     * Validate migrated save data
     * @param {Object} saveData - Save data to validate
     * @returns {boolean} True if valid
     */
    validateMigratedData(saveData) {
        if (!saveData || typeof saveData !== 'object') {
            return false;
        }

        // Check required fields
        const requiredFields = ['version', 'player', 'equipment', 'inventory', 'world', 'settings'];
        for (const field of requiredFields) {
            if (!saveData.hasOwnProperty(field)) {
                Logger.warn('SaveMigration', `Missing required field: ${field}`);
                return false;
            }
        }

        // Validate version format
        if (!/^\d+\.\d+\.\d+$/.test(saveData.version)) {
            Logger.warn('SaveMigration', `Invalid version format: ${saveData.version}`);
            return false;
        }

        return true;
    }

    /**
     * Get migration history
     * @returns {Array} Migration history
     */
    getMigrationHistory() {
        return [...this.migrationHistory];
    }

    /**
     * Clear migration history
     */
    clearHistory() {
        this.migrationHistory = [];
    }
}

// Export singleton instance
export const saveMigration = new SaveMigration();






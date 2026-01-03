/**
 * Gameplay Data Hot-Reload Manager
 * Watches JSON data files and reloads managers when data changes
 * Enables rapid iteration on talents, items, stats, and other gameplay data
 */

import { Logger } from '../utils/logger.js';

export class GameplayDataHotReload {
    constructor(scene) {
        this.scene = scene;
        this.enabled = false;
        this.watchers = new Map();
        this.dataFiles = {
            'talents.json': {
                managers: ['talentManager'],
                reloadMethod: 'reloadTalentData'
            },
            'items.json': {
                managers: ['lootManager', 'equipmentManager'],
                reloadMethod: 'reloadItemData'
            },
            'stats-config.json': {
                managers: ['statCalculator'],
                reloadMethod: 'reloadStatsConfig'
            },
            'classes.json': {
                managers: ['partyManager', 'heroFactory'],
                reloadMethod: 'reloadClassData'
            },
            'specializations.json': {
                managers: ['partyManager', 'heroFactory'],
                reloadMethod: 'reloadSpecData'
            },
            'world-config.json': {
                managers: ['worldManager'],
                reloadMethod: 'reloadWorldConfig'
            },
            'enemies.json': {
                managers: ['worldManager'],
                reloadMethod: 'reloadEnemyData'
            },
            'achievements.json': {
                managers: ['achievementManager'],
                reloadMethod: 'reloadAchievements'
            },
            'prestige-config.json': {
                managers: ['prestigeManager'],
                reloadMethod: 'reloadPrestigeConfig'
            }
        };
        this.lastModifiedTimes = new Map();
        this.checkInterval = null;
        this.reloadQueue = [];
        this.reloading = false;
    }

    /**
     * Enable hot-reload for gameplay data
     */
    enable() {
        if (this.enabled) {
            return;
        }

        this.enabled = true;
        Logger.info('GameplayDataHotReload', 'Gameplay data hot-reload enabled');

        // Initialize last modified times for all data files
        this.initializeFileTracking();

        // Start polling for changes
        this.startPolling();

        // Add keyboard shortcut for manual reload (Ctrl+R)
        this.scene.input.keyboard.on('keydown-R', (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
                Logger.info('GameplayDataHotReload', 'Manual reload triggered (Ctrl+R)');
                this.forceReloadAll();
            }
        });
    }

    /**
     * Disable hot-reload
     */
    disable() {
        if (!this.enabled) {
            return;
        }

        this.enabled = false;
        this.stopPolling();
        Logger.info('GameplayDataHotReload', 'Gameplay data hot-reload disabled');
    }

    /**
     * Initialize tracking of file modification times
     */
    initializeFileTracking() {
        for (const [fileName, config] of Object.entries(this.dataFiles)) {
            const url = `/data/${fileName}`;
            this.lastModifiedTimes.set(fileName, null);

            // Initial fetch to establish baseline
            fetch(url, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        const lastModified = response.headers.get('last-modified');
                        this.lastModifiedTimes.set(fileName, lastModified);
                    }
                })
                .catch(error => {
                    Logger.warn('GameplayDataHotReload', `Failed to track ${fileName}:`, error);
                });
        }
    }

    /**
     * Start polling for file changes
     */
    startPolling() {
        this.checkInterval = setInterval(() => {
            this.checkForChanges();
        }, 1000); // Check every second
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Check for changes in data files
     */
    async checkForChanges() {
        for (const [fileName, config] of Object.entries(this.dataFiles)) {
            try {
                const url = `/data/${fileName}`;
                const response = await fetch(url, {
                    method: 'HEAD',
                    cache: 'no-cache'
                });

                if (!response.ok) continue;

                const lastModified = response.headers.get('last-modified');
                const previousTime = this.lastModifiedTimes.get(fileName);

                if (previousTime !== lastModified && previousTime !== null) {
                    Logger.info('GameplayDataHotReload', `Change detected in ${fileName}`);
                    this.lastModifiedTimes.set(fileName, lastModified);
                    this.queueReload(fileName, config);
                } else if (previousTime === null) {
                    // First time seeing this file
                    this.lastModifiedTimes.set(fileName, lastModified);
                }
            } catch (error) {
                // Silently ignore fetch errors during polling
            }
        }
    }

    /**
     * Queue a reload for a changed file
     */
    queueReload(fileName, config) {
        this.reloadQueue.push({ fileName, config });

        if (!this.reloading) {
            this.processReloadQueue();
        }
    }

    /**
     * Process the reload queue
     */
    async processReloadQueue() {
        if (this.reloading || this.reloadQueue.length === 0) {
            return;
        }

        this.reloading = true;

        try {
            // Group reloads by affected managers to avoid duplicate reloads
            const managerReloads = new Map();

            for (const { fileName, config } of this.reloadQueue) {
                for (const managerName of config.managers) {
                    if (!managerReloads.has(managerName)) {
                        managerReloads.set(managerName, []);
                    }
                    managerReloads.get(managerName).push({ fileName, config });
                }
            }

            // Reload each manager once with all its changed files
            for (const [managerName, changes] of managerReloads) {
                await this.reloadManager(managerName, changes);
            }

        } catch (error) {
            Logger.error('GameplayDataHotReload', 'Error during reload:', error);
        } finally {
            this.reloadQueue = [];
            this.reloading = false;
        }
    }

    /**
     * Reload a specific manager
     */
    async reloadManager(managerName, changes) {
        const manager = this.scene[managerName];
        if (!manager) {
            Logger.warn('GameplayDataHotReload', `Manager ${managerName} not found on scene`);
            return;
        }

        // Find the reload method (use first change's method as they're typically the same per manager)
        const reloadMethod = changes[0].config.reloadMethod;

        if (typeof manager[reloadMethod] === 'function') {
            try {
                Logger.info('GameplayDataHotReload', `Reloading ${managerName} via ${reloadMethod}`);

                // Call the manager's reload method
                await manager[reloadMethod]();

                // Emit event for other systems to react
                this.scene.events.emit('gameplay-data-reloaded', {
                    manager: managerName,
                    method: reloadMethod,
                    changes: changes.map(c => c.fileName)
                });

                Logger.info('GameplayDataHotReload', `Successfully reloaded ${managerName}`);

            } catch (error) {
                Logger.error('GameplayDataHotReload', `Failed to reload ${managerName}:`, error);
            }
        } else {
            Logger.warn('GameplayDataHotReload', `Manager ${managerName} missing reload method ${reloadMethod}`);
        }
    }

    /**
     * Force reload all data files (for manual trigger)
     */
    async forceReloadAll() {
        Logger.info('GameplayDataHotReload', 'Forcing reload of all gameplay data');

        const allChanges = Object.entries(this.dataFiles).map(([fileName, config]) => ({
            fileName,
            config
        }));

        // Group by manager like normal processing
        const managerReloads = new Map();
        for (const change of allChanges) {
            for (const managerName of change.config.managers) {
                if (!managerReloads.has(managerName)) {
                    managerReloads.set(managerName, []);
                }
                managerReloads.get(managerName).push(change);
            }
        }

        // Reload each manager
        for (const [managerName, changes] of managerReloads) {
            await this.reloadManager(managerName, changes);
        }
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            enabled: this.enabled,
            trackedFiles: Object.keys(this.dataFiles),
            reloading: this.reloading,
            queuedReloads: this.reloadQueue.length
        };
    }
}

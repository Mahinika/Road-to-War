/**
 * Gameplay State Replay System - Save and restore specific game states for testing
 * Allows developers to capture bug scenarios and replay them consistently
 * F9 to save state, F10 to load last saved state
 */

import { Logger } from './logger.js';
import { SaveManager } from './save-manager.js';

export class GameplayStateReplay {
    constructor(scene) {
        this.scene = scene;
        this.savedStates = new Map();
        this.currentReplayState = null;
        this.maxSavedStates = 5; // Keep last 5 states

        // Bind keyboard shortcuts
        this.scene.input.keyboard.on('keydown-F9', () => {
            this.saveCurrentState();
        });

        this.scene.input.keyboard.on('keydown-F10', () => {
            this.loadLastSavedState();
        });

        Logger.info('GameplayStateReplay', 'Initialized (F9 save, F10 load)');
    }

    /**
     * Save the current gameplay state
     * @param {string} [name] - Optional name for the state
     */
    saveCurrentState(name = null) {
        try {
            const stateName = name || `state_${Date.now()}`;
            const stateData = this.captureGameplayState();

            this.savedStates.set(stateName, {
                name: stateName,
                timestamp: Date.now(),
                data: stateData
            });

            // Limit saved states
            if (this.savedStates.size > this.maxSavedStates) {
                const oldestKey = Array.from(this.savedStates.keys())[0];
                this.savedStates.delete(oldestKey);
            }

            Logger.info('GameplayStateReplay', `State saved: ${stateName}`);
            this.showSaveNotification(`State saved: ${stateName}`);

        } catch (error) {
            Logger.error('GameplayStateReplay', 'Failed to save state:', error);
            this.showSaveNotification('Failed to save state', true);
        }
    }

    /**
     * Load the last saved gameplay state
     */
    loadLastSavedState() {
        try {
            const stateNames = Array.from(this.savedStates.keys());
            if (stateNames.length === 0) {
                Logger.warn('GameplayStateReplay', 'No saved states available');
                this.showSaveNotification('No saved states');
                return;
            }

            const lastStateName = stateNames[stateNames.length - 1];
            const state = this.savedStates.get(lastStateName);

            this.restoreGameplayState(state.data);
            this.currentReplayState = state.name;

            Logger.info('GameplayStateReplay', `State loaded: ${state.name}`);
            this.showSaveNotification(`State loaded: ${state.name}`);

        } catch (error) {
            Logger.error('GameplayStateReplay', 'Failed to load state:', error);
            this.showSaveNotification('Failed to load state', true);
        }
    }

    /**
     * Capture the current gameplay state
     */
    captureGameplayState() {
        const state = {
            timestamp: Date.now(),
            metadata: {
                description: 'Gameplay state snapshot'
            }
        };

        // Capture party state
        if (this.scene.partyManager) {
            state.party = this.scene.partyManager.getSaveData();
        }

        // Capture world state
        if (this.scene.worldManager) {
            state.world = {
                currentMile: this.scene.worldManager.currentMile,
                maxMileReached: this.scene.worldManager.maxMileReached,
                currentSegment: this.scene.worldManager.currentSegment,
                combatActive: this.scene.worldManager.combatActive,
                milestoneRewardsClaimed: Array.from(this.scene.worldManager.milestoneRewardsClaimed || [])
            };
        }

        // Capture equipment state
        if (this.scene.equipmentManager) {
            state.equipment = {};
            for (const [heroId, equipment] of this.scene.equipmentManager.heroEquipment) {
                state.equipment[heroId] = equipment;
            }
        }

        // Capture talent state
        if (this.scene.talentManager) {
            state.talents = {};
            for (const [heroId, heroTalents] of this.scene.talentManager.heroTalents) {
                state.talents[heroId] = heroTalents;
            }
        }

        // Capture combat state
        if (this.scene.combatManager) {
            state.combat = {
                combatActive: this.scene.combatManager.combatActive,
                currentTurn: this.scene.combatManager.currentTurn,
                combatTactics: this.scene.combatTactics,
                showThreatDisplay: this.scene.showThreatDisplay,
                enemies: this.scene.combatManager.enemies?.map(enemy => ({
                    id: enemy.id,
                    name: enemy.name,
                    level: enemy.level,
                    currentStats: enemy.currentStats,
                    baseStats: enemy.baseStats
                })) || []
            };
        }

        // Capture hero positions and sprites
        if (this.scene.hero && this.scene.partyMemberSprites) {
            state.positions = {
                hero: { x: this.scene.hero.x, y: this.scene.hero.y },
                partySprites: this.scene.partyMemberSprites.map((sprite, index) => ({
                    index,
                    x: sprite.x,
                    y: sprite.y,
                    visible: sprite.visible
                }))
            };
        }

        // Capture UI state
        state.ui = {
            combatTactics: this.scene.combatTactics,
            showThreatDisplay: this.scene.showThreatDisplay,
            uiPanels: { ...this.scene.uiPanels }
        };

        return state;
    }

    /**
     * Restore a gameplay state
     * @param {Object} stateData - The state data to restore
     */
    async restoreGameplayState(stateData) {
        try {
            Logger.info('GameplayStateReplay', 'Restoring gameplay state...');

            // Stop any active systems
            this.pauseActiveSystems();

            // Restore party state
            if (stateData.party && this.scene.partyManager) {
                const statCalculator = this.scene.statCalculator;
                await this.scene.partyManager.loadData(stateData.party, statCalculator);
                Logger.info('GameplayStateReplay', 'Party state restored');
            }

            // Restore equipment state
            if (stateData.equipment && this.scene.equipmentManager) {
                this.scene.equipmentManager.heroEquipment.clear();
                for (const [heroId, equipment] of Object.entries(stateData.equipment)) {
                    this.scene.equipmentManager.heroEquipment.set(heroId, equipment);
                }
                // Recalculate stats for all heroes
                for (const heroId of Object.keys(stateData.equipment)) {
                    this.scene.equipmentManager.calculateHeroStats(heroId);
                }
                Logger.info('GameplayStateReplay', 'Equipment state restored');
            }

            // Restore talent state
            if (stateData.talents && this.scene.talentManager) {
                this.scene.talentManager.heroTalents.clear();
                for (const [heroId, talents] of Object.entries(stateData.talents)) {
                    this.scene.talentManager.heroTalents.set(heroId, talents);
                }
                Logger.info('GameplayStateReplay', 'Talent state restored');
            }

            // Restore world state
            if (stateData.world && this.scene.worldManager) {
                Object.assign(this.scene.worldManager, {
                    currentMile: stateData.world.currentMile,
                    maxMileReached: stateData.world.maxMileReached,
                    currentSegment: stateData.world.currentSegment,
                    combatActive: stateData.world.combatActive,
                    milestoneRewardsClaimed: new Set(stateData.world.milestoneRewardsClaimed || [])
                });
                Logger.info('GameplayStateReplay', 'World state restored');
            }

            // Restore combat state
            if (stateData.combat && this.scene.combatManager) {
                this.scene.combatTactics = stateData.combat.combatTactics;
                this.scene.showThreatDisplay = stateData.combat.showThreatDisplay;

                if (stateData.combat.combatActive) {
                    // Recreate combat with saved enemies
                    this.scene.combatManager.enemies = stateData.combat.enemies.map(enemyData => ({
                        ...enemyData,
                        currentStats: { ...enemyData.currentStats },
                        baseStats: { ...enemyData.baseStats }
                    }));
                    this.scene.combatManager.combatActive = true;
                    this.scene.combatManager.currentTurn = stateData.combat.currentTurn;
                }
                Logger.info('GameplayStateReplay', 'Combat state restored');
            }

            // Restore positions
            if (stateData.positions && this.scene.hero) {
                this.scene.hero.setPosition(stateData.positions.hero.x, stateData.positions.hero.y);
                if (this.scene.partyMemberSprites && stateData.positions.partySprites) {
                    for (let i = 0; i < stateData.positions.partySprites.length; i++) {
                        const spriteData = stateData.positions.partySprites[i];
                        if (this.scene.partyMemberSprites[i]) {
                            this.scene.partyMemberSprites[i].setPosition(spriteData.x, spriteData.y);
                            this.scene.partyMemberSprites[i].setVisible(spriteData.visible);
                        }
                    }
                }
                Logger.info('GameplayStateReplay', 'Positions restored');
            }

            // Restore UI state
            if (stateData.ui) {
                this.scene.combatTactics = stateData.ui.combatTactics;
                this.scene.showThreatDisplay = stateData.ui.showThreatDisplay;
                Object.assign(this.scene.uiPanels, stateData.ui.uiPanels);
            }

            // Update UI and camera
            this.updateUIAfterRestore();

            // Resume systems
            this.resumeActiveSystems();

            Logger.info('GameplayStateReplay', 'Gameplay state restoration complete');

        } catch (error) {
            Logger.error('GameplayStateReplay', 'Failed to restore gameplay state:', error);
            throw error;
        }
    }

    /**
     * Pause active game systems during state restoration
     */
    pauseActiveSystems() {
        // Stop world movement
        if (this.scene.worldManager?.hero?.body) {
            this.scene.worldManager.hero.body.setVelocity(0, 0);
        }

        // Pause combat if active
        if (this.scene.combatManager?.combatActive) {
            // Combat will be restarted if it was active in the saved state
        }

        // Stop movement manager updates
        if (this.scene.movementManager) {
            // Movement will resume after restoration
        }
    }

    /**
     * Resume active systems after state restoration
     */
    resumeActiveSystems() {
        // Resume world movement if not in combat
        if (this.scene.worldManager && !this.scene.combatManager?.combatActive) {
            // World movement will resume naturally in the update loop
        }

        // Update camera to follow party
        if (this.scene.cameraManager) {
            this.scene.cameraManager.updateCameraPosition();
        }
    }

    /**
     * Update UI elements after state restoration
     */
    updateUIAfterRestore() {
        // Update party display
        if (this.scene.partyDisplay) {
            // Trigger party display update
            this.scene.events.emit('party-updated');
        }

        // Update combat UI if in combat
        // Combat UI is handled automatically by GameSceneCombat module
        // No manual update needed

        // Update stat displays
        // UI updates are handled automatically by GameSceneUI update loop
        // No manual update needed
    }

    /**
     * Show a temporary notification
     * @param {string} message - Message to show
     * @param {boolean} isError - Whether this is an error message
     */
    showSaveNotification(message, isError = false) {
        // Create notification text
        const notification = this.scene.add.text(
            this.scene.scale.gameSize.width / 2,
            this.scene.scale.gameSize.height - 100,
            message,
            {
                font: '16px Arial',
                fill: isError ? '#ff4444' : '#44ff44',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        notification.setOrigin(0.5, 0.5);

        // Fade out after 3 seconds
        this.scene.tweens.add({
            targets: notification,
            alpha: 0,
            duration: 3000,
            onComplete: () => notification.destroy()
        });
    }

    /**
     * Get list of saved states
     */
    getSavedStates() {
        return Array.from(this.savedStates.values()).map(state => ({
            name: state.name,
            timestamp: state.timestamp,
            description: state.data.metadata?.description || 'Gameplay state'
        }));
    }

    /**
     * Clear all saved states
     */
    clearSavedStates() {
        this.savedStates.clear();
        this.currentReplayState = null;
        Logger.info('GameplayStateReplay', 'All saved states cleared');
    }

    /**
     * Export current state to console (for debugging)
     */
    exportCurrentState() {
        const state = this.captureGameplayState();
        console.log('Current Gameplay State:', JSON.stringify(state, null, 2));
        Logger.info('GameplayStateReplay', 'Current state exported to console');
        this.showSaveNotification('State exported to console');
    }
}

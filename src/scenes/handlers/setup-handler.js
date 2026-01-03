/**
 * Setup Handler - Handles initialization and setup operations
 * Extracted from GameScene to improve separation of concerns
 */

import { GameEvents } from '../../utils/event-constants.js';
import { DEPTH_LAYERS, setDepth } from '../../utils/depth-layers.js';

export class SetupHandler {
    /**
     * Create a new SetupHandler
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.worldManager = managers.worldManager;
        this.statisticsManager = managers.statisticsManager;
        this.lootManager = managers.lootManager;
    }

    /**
     * Set up achievement notifications
     */
    setupAchievementNotifications() {
        this.scene.events.on('achievement_unlocked', (data) => {
            this.showAchievementNotification(data);
        });
    }

    /**
     * Show achievement unlocked notification
     * @param {Object} data - Achievement data
     */
    showAchievementNotification(data) {
        const width = this.scene.scale.gameSize.width;
        const notification = this.scene.add.container(width / 2, 100);
        notification.setScrollFactor(0);
        setDepth(notification, DEPTH_LAYERS.UI_OVERLAY);

        const bg = this.scene.add.rectangle(0, 0, 400, 80, 0x000000, 0.9);
        bg.setStrokeStyle(3, 0xffff00);
        notification.add(bg);

        const title = this.scene.add.text(0, -20, 'Achievement Unlocked!', {
            font: 'bold 18px Arial',
            fill: '#ffff00'
        });
        title.setOrigin(0.5, 0.5);
        notification.add(title);

        const name = this.scene.add.text(0, 10, data.name, {
            font: '16px Arial',
            fill: '#ffffff'
        });
        name.setOrigin(0.5, 0.5);
        notification.add(name);

        // Animate in
        notification.setAlpha(0);
        notification.setScale(0.8);

        this.scene.tweens.add({
            targets: notification,
            alpha: 1,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Auto-remove after 5 seconds
        this.scene.time.delayedCall(5000, () => {
            this.scene.tweens.add({
                targets: notification,
                alpha: 0,
                scale: 0.8,
                duration: 300,
                ease: 'Back.easeIn',
                onComplete: () => {
                    notification.destroy();
                }
            });
        });
    }

    /**
     * Set up statistics tracking
     */
    setupStatisticsTracking() {
        // Track distance traveled
        this.scene.events.on('segment_generated', () => {
            this.statisticsManager.stats.progression.segmentsVisited++;
        });

        // Track level ups
        this.scene.events.on('experience_gained', (_data) => {
            // Update XP bars will be handled by UI manager
        });

        this.scene.events.on('level_up', (data) => {
            // Update XP bars will be handled by UI manager
            this.statisticsManager.trackLevelUp(data);
        });

        // Track distance updates
        this.scene.time.addEvent({
            delay: 5000, // Every 5 seconds
            callback: () => {
                if (this.worldManager) {
                    const distance = this.worldManager.currentSegment * this.worldManager.segmentWidth;
                    this.statisticsManager.updateDistanceTraveled(distance - (this.statisticsManager.stats.progression.distanceTraveled || 0));
                }
            },
            loop: true
        });
    }

    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        // Equipment toggle (E)
        this.scene.input.keyboard.on('keydown-E', () => {
            if (this.scene.toggleEquipmentPanel) {
                this.scene.toggleEquipmentPanel();
            }
        });

        // Inventory toggle (I)
        this.scene.input.keyboard.on('keydown-I', () => {
            if (this.scene.toggleInventoryPanel) {
                this.scene.toggleInventoryPanel();
            }
        });

        // Shop toggle (S)
        this.scene.input.keyboard.on('keydown-S', () => {
            if (this.scene.toggleShop) {
                this.scene.toggleShop();
            }
        });

        // Pause/Menu (ESC) - close panels first, then return to menu
        let escCooldown = false;
        this.scene.input.keyboard.on('keydown-ESC', () => {
            if (escCooldown) return;
            escCooldown = true;

            // Close any open panels first
            if (this.scene.closeAllPanels && this.scene.closeAllPanels()) {
                this.scene.time.delayedCall(200, () => {
                    escCooldown = false;
                });
                return;
            }

            // No panels open, go to main menu with save
            if (this.scene.returnToMenu) {
                this.scene.returnToMenu();
            }
            escCooldown = false;
        });
    }

    /**
     * Set up window resize handler to update UI
     */
    setupResizeHandler() {
        this.scene.scale.on('resize', (gameSize) => {
            if (!gameSize) return;

            // Use the gameSize parameter which has the correct dimensions
            const width = gameSize.width;
            const height = gameSize.height;

            // Update camera viewport to match new size
            // CRITICAL: Do NOT call centerOn() or setScroll() here as it breaks camera follow
            // The camera manager will handle positioning via follow
            try {
                if (this.scene.cameras && this.scene.cameras.main) {
                    this.scene.cameras.main.setViewport(0, 0, width, height);
                    // Store references for resize handling
                    this.scene.cameras.main.setBounds(0, 0, width, height);
                }
            } catch (error) {
                // Handle resize errors silently
            }

            // Update UI elements that need repositioning
            this.updateUIForResize(width, height);
        });
    }

    /**
     * Update UI elements for window resize
     * @param {number} width - New width
     * @param {number} height - New height
     */
    updateUIForResize(width, height) {
        // This would be implemented to update UI positions
        // Currently handled by individual UI components
    }

    /**
     * Toggle equipment panel
     */
    toggleEquipmentPanel() {
        // Implementation would be in UI manager
    }

    /**
     * Toggle inventory panel
     */
    toggleInventoryPanel() {
        // Implementation would be in UI manager
    }

    /**
     * Toggle shop panel
     */
    toggleShop() {
        // Implementation would be in UI manager
    }

    /**
     * Save and exit to main menu
     */
    saveAndExit() {
        // Implementation would be in save/load handler
    }
}


import Phaser from 'phaser';
import { saveManager } from '../utils/save-manager.js';
import { PrestigeManager } from '../managers/prestige-manager.js';

/**
 * Prestige Menu Scene - Prestige system UI
 */
export class PrestigeMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PrestigeMenuScene' });
        this.prestigeManager = null;
    }

    create() {
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;
        
        // Ensure camera matches viewport
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.centerOn(width / 2, height / 2);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        const title = this.add.text(width / 2, height / 10, 'PRESTIGE', {
            font: 'bold 36px Arial',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3
        });
        title.setOrigin(0.5, 0.5);

        // Initialize prestige manager
        this.prestigeManager = new PrestigeManager(this);
        this.prestigeManager.loadPrestigeConfig();
        
        // Load prestige data from registry or save
        const prestigeData = this.registry.get('prestige');
        if (prestigeData) {
            this.prestigeManager.loadPrestige(prestigeData);
        } else {
            const recent = saveManager.getMostRecentSlot();
            if (recent) {
                const saveData = saveManager.loadGame(recent);
                if (saveData && saveData.prestige) {
                    this.prestigeManager.loadPrestige(saveData.prestige);
                }
            }
        }
        if (!this.prestigeManager) {
            // Create temporary manager for display
            const { PrestigeManager } = require('../managers/prestige-manager.js');
            this.prestigeManager = new PrestigeManager(this);
            this.prestigeManager.loadPrestigeConfig();
            
            // Load from save
            const recent = saveManager.getMostRecentSlot();
            if (recent) {
                const saveData = saveManager.loadGame(recent);
                if (saveData && saveData.prestige) {
                    this.prestigeManager.loadPrestige(saveData.prestige);
                }
            }
        }

        const state = this.prestigeManager.getState();

        // Prestige info
        const infoY = height / 5;
        const prestigeLevelText = this.add.text(width / 2, infoY, `Prestige Level: ${state.prestigeLevel}`, {
            font: 'bold 24px Arial',
            fill: '#ffff00'
        });
        prestigeLevelText.setOrigin(0.5, 0.5);

        const pointsText = this.add.text(width / 2, infoY + 40, `Prestige Points: ${state.prestigePoints}`, {
            font: '20px Arial',
            fill: '#ffffff'
        });
        pointsText.setOrigin(0.5, 0.5);

        // Prestige reset section
        const resetY = height / 3;
        const resetTitle = this.add.text(width / 2, resetY, 'Prestige Reset', {
            font: 'bold 20px Arial',
            fill: '#ff8800'
        });
        resetTitle.setOrigin(0.5, 0.5);

        const resetDesc = this.add.text(width / 2, resetY + 30, 'Reset your progress to earn prestige points', {
            font: '14px Arial',
            fill: '#aaaaaa',
            wordWrap: { width: width - 100 }
        });
        resetDesc.setOrigin(0.5, 0.5);

        // Calculate points that would be earned
        const recent = saveManager.getMostRecentSlot();
        let pointsPreview = 0;
        if (recent) {
            const saveData = saveManager.loadGame(recent);
            if (saveData) {
                pointsPreview = this.prestigeManager.calculatePrestigePoints(saveData);
            }
        }

        const pointsPreviewText = this.add.text(width / 2, resetY + 60, `You would earn: ${pointsPreview} prestige points`, {
            font: '16px Arial',
            fill: '#00ff00'
        });
        pointsPreviewText.setOrigin(0.5, 0.5);

        const resetButton = this.createButton(width / 2, resetY + 100, 'Prestige Reset', () => {
            this.showPrestigeConfirmation(pointsPreview);
        }, '#ff0000');

        // Prestige Roadmap section
        const roadmapY = height / 2 - 20;
        const roadmapTitle = this.add.text(width / 2, roadmapY, 'Prestige Roadmap', {
            font: 'bold 18px Arial',
            fill: '#ffff00'
        });
        roadmapTitle.setOrigin(0.5, 0.5);

        const roadmapDesc = this.add.text(width / 2, roadmapY + 25,
            'Prestige unlocks permanent bonuses that carry over to future runs.\nHigher prestige levels unlock more powerful upgrades!', {
            font: '12px Arial',
            fill: '#cccccc',
            align: 'center',
            wordWrap: { width: width - 100 }
        });
        roadmapDesc.setOrigin(0.5, 0.5);

        // Show prestige level benefits
        const benefitsY = roadmapY + 60;
        const benefitsText = this.add.text(width / 2, benefitsY,
            `Current Level: ${state.prestigeLevel}\n` +
            `Points Available: ${state.prestigePoints}\n` +
            `Total Earned: ${state.prestigePointsEarned}`, {
            font: '14px Arial',
            fill: '#ffffff',
            align: 'center',
            wordWrap: { width: width - 100 }
        });
        benefitsText.setOrigin(0.5, 0.5);

        // Upgrades section
        const upgradesY = height / 2 + 120;
        const upgradesTitle = this.add.text(width / 2, upgradesY, 'Available Upgrades', {
            font: 'bold 20px Arial',
            fill: '#00ff00'
        });
        upgradesTitle.setOrigin(0.5, 0.5);

        // Create upgrade list
        this.createUpgradeList(width, upgradesY + 40, state.availableUpgrades, state.purchasedUpgrades);

        // Back button
        const backButton = this.createButton(width / 2, height - 50, 'Back', () => {
            this.scene.start('MainScene');
        });
    }

    /**
     * Show prestige confirmation dialog
     */
    showPrestigeConfirmation(pointsPreview) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Dialog background
        const dialogBg = this.add.rectangle(width / 2, height / 2, 500, 300, 0x000000, 0.95);
        dialogBg.setStrokeStyle(3, 0xff0000);
        dialogBg.setScrollFactor(0);
        dialogBg.setDepth(3000);

        const dialog = this.add.container(width / 2, height / 2);
        dialog.setScrollFactor(0);
        dialog.setDepth(3000);
        dialog.add(dialogBg);

        // Title
        const title = this.add.text(0, -100, 'Confirm Prestige Reset', {
            font: 'bold 24px Arial',
            fill: '#ff0000'
        });
        title.setOrigin(0.5, 0.5);
        dialog.add(title);

        // Warning text
        const warning = this.add.text(0, -40, 'This will reset ALL progress!', {
            font: '18px Arial',
            fill: '#ffff00',
            wordWrap: { width: 450 }
        });
        warning.setOrigin(0.5, 0.5);
        dialog.add(warning);

        const pointsText = this.add.text(0, 0, `You will earn: ${pointsPreview} prestige points`, {
            font: '16px Arial',
            fill: '#00ff00'
        });
        pointsText.setOrigin(0.5, 0.5);
        dialog.add(pointsText);

        // Buttons
        const confirmButton = this.createButton(-100, 80, 'Confirm', () => {
            this.performPrestige();
            dialog.destroy();
        }, '#ff0000');
        confirmButton.setScrollFactor(0);
        confirmButton.setDepth(3001);
        dialog.add(confirmButton);

        const cancelButton = this.createButton(100, 80, 'Cancel', () => {
            dialog.destroy();
        });
        cancelButton.setScrollFactor(0);
        cancelButton.setDepth(3001);
        dialog.add(cancelButton);
    }

    /**
     * Perform prestige reset
     */
    performPrestige() {
        const recent = saveManager.getMostRecentSlot();
        if (!recent) {
            this.showNotification('No save data to reset!', '#ff0000');
            return;
        }

        const saveData = saveManager.loadGame(recent);
        if (!saveData) {
            this.showNotification('Failed to load save data!', '#ff0000');
            return;
        }

        const result = this.prestigeManager.performPrestige(saveData);
        
        if (result.success) {
            // Create new save with prestige data
            const worldConfig = this.cache.json.get('worldConfig');
            const newSaveData = saveManager.createDefaultSaveData(worldConfig);
            newSaveData.prestige = this.prestigeManager.getSaveData();
            
            // Save the reset
            saveManager.saveGame(newSaveData, recent);
            
            this.showNotification(`Prestige ${result.prestigeLevel} complete! Earned ${result.pointsEarned} points!`, '#00ff00');
            
            // Reload scene to update display
            this.time.delayedCall(2000, () => {
                this.scene.restart();
            });
        }
    }

    /**
     * Create upgrade list
     */
    createUpgradeList(x, y, availableUpgrades, purchasedUpgrades) {
        const width = this.cameras.main.width;
        const startX = width / 4;
        let currentY = y;
        const spacing = 60;

        // Show purchased upgrades first
        if (purchasedUpgrades.length > 0) {
            const purchasedTitle = this.add.text(startX, currentY, 'Purchased:', {
                font: 'bold 16px Arial',
                fill: '#00ff00'
            });
            currentY += 30;

            purchasedUpgrades.forEach(upgrade => {
                this.createUpgradeEntry(startX, currentY, upgrade, true);
                currentY += spacing;
            });
            currentY += 20;
        }

        // Show available upgrades
        if (availableUpgrades.length > 0) {
            const availableTitle = this.add.text(startX, currentY, 'Available:', {
                font: 'bold 16px Arial',
                fill: '#ffff00'
            });
            currentY += 30;

            availableUpgrades.forEach(upgrade => {
                this.createUpgradeEntry(startX, currentY, upgrade, false);
                currentY += spacing;
            });
        } else {
            const noUpgrades = this.add.text(startX, currentY, 'All upgrades purchased!', {
                font: '14px Arial',
                fill: '#aaaaaa'
            });
        }
    }

    /**
     * Create upgrade entry
     */
    createUpgradeEntry(x, y, upgrade, purchased) {
        const width = this.cameras.main.width;
        const entryWidth = width / 2;

        // Background
        const bgColor = purchased ? 0x00ff00 : 0x333333;
        const bg = this.add.rectangle(x + entryWidth / 2, y, entryWidth, 50, bgColor, 0.3);
        bg.setStrokeStyle(2, purchased ? 0x00ff00 : 0x666666);

        // Upgrade name
        const name = this.add.text(x + 10, y - 15, upgrade.name, {
            font: 'bold 14px Arial',
            fill: purchased ? '#ffffff' : '#ffffff'
        });

        // Description
        const desc = this.add.text(x + 10, y + 5, upgrade.description, {
            font: '12px Arial',
            fill: '#aaaaaa',
            wordWrap: { width: entryWidth - 100 }
        });

        // Cost or purchased indicator
        if (purchased) {
            const purchasedText = this.add.text(x + entryWidth - 10, y, 'PURCHASED', {
                font: 'bold 12px Arial',
                fill: '#00ff00'
            });
            purchasedText.setOrigin(1, 0.5);
        } else {
            const costText = this.add.text(x + entryWidth - 10, y, `Cost: ${upgrade.cost}`, {
                font: '14px Arial',
                fill: this.prestigeManager.prestigePoints >= upgrade.cost ? '#00ff00' : '#ff0000'
            });
            costText.setOrigin(1, 0.5);

            // Purchase button
            if (this.prestigeManager.prestigePoints >= upgrade.cost) {
                const buyButton = this.add.text(x + entryWidth - 80, y + 20, 'Buy', {
                    font: '12px Arial',
                    fill: '#ffffff',
                    backgroundColor: '#333333',
                    padding: { x: 10, y: 5 }
                });
                buyButton.setOrigin(0.5, 0.5);
                buyButton.setInteractive({ useHandCursor: true });

                buyButton.on('pointerover', () => {
                    buyButton.setStyle({ fill: '#ffff00' });
                });

                buyButton.on('pointerout', () => {
                    buyButton.setStyle({ fill: '#ffffff' });
                });

                buyButton.on('pointerdown', () => {
                    if (this.prestigeManager.purchaseUpgrade(upgrade.id)) {
                        // Save prestige data
                        const recent = saveManager.getMostRecentSlot();
                        if (recent) {
                            const saveData = saveManager.loadGame(recent) || saveManager.createDefaultSaveData(this.cache.json.get('worldConfig'));
                            saveData.prestige = this.prestigeManager.getSaveData();
                            saveManager.saveGame(saveData, recent);
                        }
                        this.scene.restart();
                    }
                });
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(text, color) {
        const width = this.cameras.main.width;
        const notification = this.add.text(width / 2, 50, text, {
            font: '18px Arial',
            fill: color,
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        notification.setOrigin(0.5, 0.5);
        notification.setScrollFactor(0);
        notification.setDepth(2000);

        this.tweens.add({
            targets: notification,
            alpha: 0,
            y: 20,
            duration: 2000,
            ease: 'Quad.easeOut',
            onComplete: () => {
                notification.destroy();
            }
        });
    }

    /**
     * Create button
     */
    createButton(x, y, text, callback, color = '#ffffff') {
        const button = this.add.text(x, y, text, {
            font: '20px Arial',
            fill: color,
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        });
        
        button.setOrigin(0.5, 0.5);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            button.setStyle({ fill: '#ffff00' });
        });

        button.on('pointerout', () => {
            button.setStyle({ fill: color });
        });

        button.on('pointerdown', callback);

        return button;
    }
}


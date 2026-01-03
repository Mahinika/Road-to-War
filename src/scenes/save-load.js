import Phaser from 'phaser';
import { saveManager } from '../utils/save-manager.js';

export class SaveLoadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SaveLoadScene' });
        this.selectedSlot = 1;
        this.mode = 'load'; // 'save' or 'load'
        this.saveSlots = [];
        this.slotElements = []; // Track slot UI elements for cleanup
    }

    async create() {
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;
        
        // Ensure camera matches viewport
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.centerOn(width / 2, height / 2);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Get mode from scene data (passed from main menu)
        this.mode = this.registry.get('saveLoadMode') || 'load';

        // Title
        const titleText = this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME';
        const title = this.add.text(width / 2, height / 8, titleText, {
            font: 'bold 36px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        title.setOrigin(0.5, 0.5);

        // Load save slots (async)
        await this.loadSaveSlots();

        // Action buttons
        const actionButtons = this.createActionButtons(width, height);

        // Back button
        const backButton = this.createButton(width / 2, height - 60, 'Back to Menu', () => {
            this.scene.start('MainScene');
        });

        // Store references for cleanup
        this.menuElements = [title, backButton, ...actionButtons];
    }

    async loadSaveSlots() {
        this.saveSlots = await saveManager.getSaveSlots();
        this.createSaveSlots(this.cameras.main.width, this.cameras.main.height);
    }

    createSaveSlots(width, height) {
        // Clear existing slot elements first
        this.clearSlots();
        
        const startX = width / 2 - 300;
        const startY = height / 3;
        const slotHeight = 120;

        this.saveSlots.forEach((slot, index) => {
            const y = startY + (index * slotHeight);
            const slotElements = this.createSingleSlot(startX, y, slot, width);
            this.slotElements.push(...slotElements);
        });
    }

    createSingleSlot(x, y, slotData, totalWidth) {
        const isSelected = slotData.slot === this.selectedSlot;
        const slotElements = [];
        
        // Slot background
        const bgColor = isSelected ? 0x2a2a3e : 0x16213e;
        const slotBg = this.add.rectangle(x, y, 600, 100, bgColor);
        slotElements.push(slotBg);
        
        // Slot number
        const slotNumber = this.add.text(x - 270, y, `SLOT ${slotData.slot}`, {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });
        slotNumber.setOrigin(0, 0.5);
        slotElements.push(slotNumber);

        // Slot information
        const infoX = x - 150;
        const infoY = y - 20;

        if (slotData.hasData) {
            const timeText = saveManager.formatTimestamp(slotData.timestamp);
            const versionText = `Version: ${slotData.version}`;
            
            const timeLabel = this.add.text(infoX, infoY, timeText, {
                font: '16px Arial',
                fill: '#ffffff'
            });
            timeLabel.setOrigin(0, 0.5);
            slotElements.push(timeLabel);

            const versionLabel = this.add.text(infoX, infoY + 25, versionText, {
                font: '14px Arial',
                fill: '#cccccc'
            });
            versionLabel.setOrigin(0, 0.5);
            slotElements.push(versionLabel);

            // Quick stats (would be expanded with actual save data)
            const statsText = this.getSlotStatsText(slotData.slot);
            const statsLabel = this.add.text(infoX, infoY + 50, statsText, {
                font: '14px Arial',
                fill: '#888888'
            });
            statsLabel.setOrigin(0, 0.5);
            slotElements.push(statsLabel);

            // Make interactive for load mode
            if (this.mode === 'load') {
                const hitArea = this.add.rectangle(x, y, 600, 100, 0x000000, 0);
                hitArea.setInteractive({ useHandCursor: true });

                hitArea.on('pointerover', () => {
                    this.selectedSlot = slotData.slot;
                    this.updateSlotSelection();
                });

                hitArea.on('pointerdown', () => {
                    this.loadSelectedSlot(slotData.slot);
                });
                slotElements.push(hitArea);
            }
        } else {
            const emptyText = this.add.text(infoX, y, 'Empty Slot', {
                font: '16px Arial',
                fill: '#666666'
            });
            emptyText.setOrigin(0, 0.5);
            slotElements.push(emptyText);

            const createAction = this.add.text(infoX, y + 30, 'Click to create new save', {
                font: '14px Arial',
                fill: '#888888'
            });
            createAction.setOrigin(0, 0.5);
            slotElements.push(createAction);
        }

        // Selection indicator
        if (isSelected) {
            const indicator = this.add.rectangle(x, y, 610, 110, 0x00ff00, 0);
            indicator.setStrokeStyle(3, 0xffff00);
            slotElements.push(indicator);
        }
        
        return slotElements;
    }

    async getSlotStatsText(slot) {
        const saveData = await saveManager.loadGame(slot);
        if (!saveData) return '';

        const player = saveData.player || {};
        const world = saveData.world || {};

        return `Level ${player.level || 1} | ${player.gold || 0} Gold | ${world.enemiesDefeated || 0} Enemies Defeated`;
    }

    createActionButtons(width, height) {
        const buttonY = height - 140;
        const spacing = 150;
        const centerX = width / 2;
        const buttons = [];

        if (this.mode === 'save') {
            // Save button
            const saveButton = this.createButton(centerX - spacing, buttonY, 'Save Game', () => {
                this.saveCurrentGame();
            });
            buttons.push(saveButton);
        } else {
            // Load button
            const loadButton = this.createButton(centerX - spacing, buttonY, 'Load Game', () => {
                this.loadSelectedSlot(this.selectedSlot);
            });
            buttons.push(loadButton);
        }

        // Delete button (for both modes)
        const deleteButton = this.createButton(centerX + spacing, buttonY, 'Delete', () => {
            this.deleteSelectedSlot();
        });
        buttons.push(deleteButton);
        
        return buttons;
    }

    async updateSlotSelection() {
        // Clear and recreate slots to update selection
        this.clearSlots();
        this.saveSlots = await saveManager.getSaveSlots();
        this.createSaveSlots(this.cameras.main.width, this.cameras.main.height);
    }

    clearSlots() {
        // Remove only slot-related elements, not all scene children
        if (this.slotElements && this.slotElements.length > 0) {
            this.slotElements.forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            this.slotElements = [];
        }
    }

    saveCurrentGame() {
        // Check if slot already has data
        const slotData = this.saveSlots.find(s => s.slot === this.selectedSlot);
        if (slotData && slotData.hasData) {
            // Show confirmation dialog
            this.showConfirmDialog(
                `Overwrite save slot ${this.selectedSlot}?`,
                'This will replace the existing save.',
                () => {
                    this.performSave();
                }
            );
        } else {
            this.performSave();
        }
    }

    /**
     * Perform the actual save operation
     */
    async performSave() {
        // Get current game data (would be from game state)
        const worldConfig = this.cache.json.get('worldConfig');
        const gameData = saveManager.createDefaultSaveData(worldConfig); // Placeholder
        
        const success = await saveManager.saveGame(gameData, this.selectedSlot);
        if (success) {
            this.showNotification('Game Saved!', '#00ff00');
            this.saveSlots = await saveManager.getSaveSlots();
            this.updateSlotSelection();
        } else {
            this.showNotification('Save Failed!', '#ff0000');
        }
    }

    async loadSelectedSlot(slot) {
        if (!slot) return;

        const saveData = await saveManager.loadGame(slot);
        if (saveData) {
            // Set game data in registry
            this.registry.set('gameData', saveData);
            this.showNotification('Game Loaded!', '#00ff00');
            
            // Start game after a short delay
            this.time.delayedCall(1000, () => {
                this.scene.start('GameScene');
            });
        } else {
            this.showNotification('Load Failed!', '#ff0000');
        }
    }

    deleteSelectedSlot() {
        if (!this.selectedSlot) return;

        const slotData = this.saveSlots.find(s => s.slot === this.selectedSlot);
        if (!slotData || !slotData.hasData) {
            this.showNotification('No save to delete!', '#ff0000');
            return;
        }

        // Show confirmation dialog
        this.showConfirmDialog(
            `Delete save slot ${this.selectedSlot}?`,
            'This action cannot be undone.',
            () => {
                this.performDelete();
            }
        );
    }

    /**
     * Perform the actual delete operation
     */
    async performDelete() {
        const success = await saveManager.deleteSave(this.selectedSlot);
        if (success) {
            this.showNotification('Save Deleted!', '#ffff00');
            this.saveSlots = await saveManager.getSaveSlots();
            this.updateSlotSelection();
        } else {
            this.showNotification('Delete Failed!', '#ff0000');
        }
    }

    /**
     * Show confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {Function} onConfirm - Callback when confirmed
     */
    showConfirmDialog(title, message, onConfirm) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Remove existing dialog if any
        if (this.confirmDialog) {
            this.confirmDialog.destroy();
        }

        // Create dialog background
        const bg = this.add.rectangle(width / 2, height / 2, 400, 200, 0x1a1a2e);
        bg.setStrokeStyle(2, 0xffff00);
        bg.setAlpha(0.95);

        // Title
        const titleText = this.add.text(width / 2, height / 2 - 60, title, {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });
        titleText.setOrigin(0.5, 0.5);

        // Message
        const messageText = this.add.text(width / 2, height / 2 - 20, message, {
            font: '16px Arial',
            fill: '#ffffff',
            wordWrap: { width: 350 }
        });
        messageText.setOrigin(0.5, 0.5);

        // Yes button
        const yesButton = this.add.text(width / 2 - 80, height / 2 + 50, 'Yes', {
            font: 'bold 18px Arial',
            fill: '#ffffff',
            backgroundColor: '#00aa00',
            padding: { x: 20, y: 8 }
        });
        yesButton.setOrigin(0.5, 0.5);
        yesButton.setInteractive({ useHandCursor: true });

        // No button
        const noButton = this.add.text(width / 2 + 80, height / 2 + 50, 'No', {
            font: 'bold 18px Arial',
            fill: '#ffffff',
            backgroundColor: '#aa0000',
            padding: { x: 20, y: 8 }
        });
        noButton.setOrigin(0.5, 0.5);
        noButton.setInteractive({ useHandCursor: true });

        // Button hover effects
        yesButton.on('pointerover', () => yesButton.setStyle({ fill: '#ffff00' }));
        yesButton.on('pointerout', () => yesButton.setStyle({ fill: '#ffffff' }));
        noButton.on('pointerover', () => noButton.setStyle({ fill: '#ffff00' }));
        noButton.on('pointerout', () => noButton.setStyle({ fill: '#ffffff' }));

        // Button actions
        yesButton.on('pointerdown', () => {
            this.confirmDialog.destroy();
            this.confirmDialog = null;
            if (onConfirm) onConfirm();
        });

        noButton.on('pointerdown', () => {
            this.confirmDialog.destroy();
            this.confirmDialog = null;
        });

        // Store dialog elements
        this.confirmDialog = this.add.container(0, 0, [bg, titleText, messageText, yesButton, noButton]);
    }

    showNotification(message, color = '#ffffff') {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const notification = this.add.text(width / 2, height / 2, message, {
            font: 'bold 24px Arial',
            fill: color,
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        });
        notification.setOrigin(0.5, 0.5);

        // Auto-remove after 2 seconds
        this.time.delayedCall(2000, () => {
            notification.destroy();
        });
    }

    createButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, {
            font: '20px Arial',
            fill: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        });
        
        button.setOrigin(0.5, 0.5);
        button.setInteractive({ useHandCursor: true });

        // Button hover effects
        button.on('pointerover', () => {
            button.setStyle({ fill: '#ffff00' });
        });

        button.on('pointerout', () => {
            button.setStyle({ fill: '#ffffff' });
        });

        button.on('pointerdown', callback);

        return button;
    }

    /**
     * Cleanup method for scene shutdown
     */
    shutdown() {
        // Clean up all menu elements
        if (this.menuElements) {
            this.menuElements.forEach(element => {
                if (element && element.destroy) element.destroy();
            });
            this.menuElements = [];
        }
        
        // Clean up slot elements
        this.clearSlots();
        
        // Clean up confirmation dialog
        if (this.confirmDialog) {
            this.confirmDialog.destroy();
            this.confirmDialog = null;
        }
    }
}

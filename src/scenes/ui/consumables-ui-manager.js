/**
 * Consumables UI Manager - Handles consumables selection panel
 * Extracted from GameScene to improve separation of concerns
 */

import { createWoWFrame, createModernButton, createModernText, UI_THEME } from '../../utils/ui-system.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';

export class ConsumablesUIManager {
    /**
     * Create a new ConsumablesUIManager
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.combatManager = managers.combatManager;
        this.partyManager = managers.partyManager;
        this.lootManager = managers.lootManager;
        this.resourceManager = managers.resourceManager;
        
        // UI panel reference
        this.consumablesPanel = null;
        
        // Callbacks for scene interactions
        this.onConsumableUse = null;
        this.onRegenerationMenu = null;
        this.onShowTemporaryMessage = null;
    }

    /**
     * Show consumables panel
     */
    showConsumablesPanel() {
        this.closeConsumablesPanel();
        
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Using UI_CONFIG for consumables panel
        const consumablesConfig = UI_CONFIG.COMBAT_UI.CONSUMABLES_PANEL;
        const panelWidth = getScaledValue(consumablesConfig.WIDTH, width);
        const panelHeight = getScaledValue(consumablesConfig.HEIGHT, width, 'height');
        const panelX = width / 2;
        const panelY = height / 2;

        const container = this.scene.add.container(panelX, panelY);
        container.setDepth(400);
        container.setScrollFactor(0);

        // WoW Style Background - Using UI_CONFIG
        const bg = createWoWFrame(this.scene, 0, 0, panelWidth, panelHeight, {
            backgroundColor: UI_THEME.surfaces.panel,
            borderColor: 0x00aa00,
            borderWidth: 3,
            shadow: true
        });
        container.add(bg);

        const titleY = getScaledValue(consumablesConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(20, width, 'font');
        const title = createModernText(this.scene, 0, titleY, '🧪 POTIONS & CONSUMABLES', {
            fontSize: titleFontSize,
            color: '#00ff00',
            strokeColor: '#000000',
            strokeThickness: 2,
            weight: 'bold'
        });
        title.setOrigin(0.5, 0.5);
        container.add(title);

        const consumables = this.resourceManager ? this.resourceManager.getConsumables() : new Map();
        const itemsData = this.scene.cache.json.get('items');

        const startY = getScaledValue(consumablesConfig.ITEM_START_Y, width, 'height');
        const itemSpacing = getScaledValue(consumablesConfig.ITEM_SPACING, width, 'height');
        let currentY = startY;
        let itemIndex = 0;

        consumables.forEach((consumableData, itemId) => {
            if (consumableData.count <= 0) return;

            const itemData = itemsData.consumables?.[itemId];
            if (!itemData) return;

            const itemX = -170;
            const itemY = currentY;

            // Icon background
            const iconBg = this.scene.add.rectangle(itemX, itemY, 40, 40, 0x000000, 0.5);
            iconBg.setStrokeStyle(1, 0x00ff00);
            container.add(iconBg);

            const icon = this.scene.add.text(itemX, itemY, itemData.icon || '❓', {
                font: '24px Arial',
                fill: '#ffffff'
            });
            icon.setOrigin(0.5, 0.5);
            container.add(icon);

            const nameText = createModernText(this.scene, itemX + 30, itemY - 12,
                `${itemData.name.toUpperCase()} (${consumableData.count})`, {
                fontSize: 14,
                color: '#ffffff',
                weight: 'bold',
                shadow: true
            });
            container.add(nameText);

            let effectDesc = itemData.description;
            if (itemData.effects) {
                const effects = [];
                Object.entries(itemData.effects).forEach(([effect, value]) => {
                    switch (effect) {
                        case 'restoreMana': effects.push(`+${value} MANA`); break;
                        case 'restoreHealth': effects.push(`+${value} HP`); break;
                        case 'restoreEnergy': effects.push(`+${value} ENERGY`); break;
                        case 'manaRegenBoost': effects.push(`${value}X REGEN`); break;
                    }
                });
                if (effects.length > 0) effectDesc = effects.join(', ');
            }

            const descText = createModernText(this.scene, itemX + 30, itemY + 10, effectDesc, {
                fontSize: 11,
                color: '#aaaaaa'
            });
            container.add(descText);

            const useButton = createModernButton(
                this.scene,
                130,
                itemY,
                80,
                30,
                'USE',
                {
                    backgroundColor: 0x1a2e1a,
                    hoverColor: 0x2a4e2a,
                    borderColor: 0x00ff00,
                    textColor: '#ffffff',
                    fontSize: 12,
                    onClick: () => {
                        const heroes = this.partyManager ? this.partyManager.getHeroes() : [];
                        if (heroes.length > 0) {
                            const success = this.resourceManager.useConsumable(itemId, heroes[0].id);
                            if (success) {
                                if (this.onShowTemporaryMessage) {
                                    this.onShowTemporaryMessage(`Used ${itemData.name}!`);
                                }
                                this.closeConsumablesPanel();
                                if (this.onConsumableUse) {
                                    this.onConsumableUse(itemId, heroes[0].id);
                                }
                                setTimeout(() => this.showConsumablesPanel(), 100);
                            }
                        }
                    }
                }
            );
            if (useButton) {
                container.add(useButton);
            }

            currentY += itemSpacing;
            itemIndex++;
        });

        if (itemIndex === 0) {
            const noItemsText = createModernText(this.scene, 0, 0,
                'NO CONSUMABLES IN INVENTORY\nVISIT A SHOP TO RESTOCK!', {
                fontSize: 14,
                color: '#888888',
                align: 'center'
            });
            noItemsText.setOrigin(0.5, 0.5);
            container.add(noItemsText);
        }

        const closeButton = createModernButton(
            this.scene,
            0,
            panelHeight / 2 - 40,
            120,
            35,
            'CLOSE',
            {
                backgroundColor: 0x2a2a2a,
                hoverColor: 0x3a3a3a,
                borderColor: 0x666666,
                textColor: '#ffffff',
                fontSize: 14,
                onClick: () => this.closeConsumablesPanel()
            }
        );
        if (closeButton) {
            container.add(closeButton);
        }

        this.consumablesPanel = {
            container: container,
            bg: bg,
            title: title,
            closeButton: closeButton
        };
    }

    /**
     * Close consumables panel
     */
    closeConsumablesPanel() {
        if (this.consumablesPanel) {
            if (this.consumablesPanel.container) {
                this.consumablesPanel.container.destroy();
            }
            this.consumablesPanel = null;
        }
    }

    /**
     * Cleanup all UI elements
     */
    destroy() {
        this.closeConsumablesPanel();
    }
}


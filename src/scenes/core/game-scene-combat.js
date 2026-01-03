/**
 * GameScene Combat Module
 * Contains combat-related functionality and state management
 * Extracted from GameScene to separate combat concerns
 */

import { SafeExecutor, globalErrorHandler } from '../../utils/error-handling.js';
import { SCENE_CONFIG } from '../../config/scene-config.js';
import { 
    UI_CONFIG,
    getScaledValue,
    getCombatUIConfig
} from '../../config/ui-config.js';
import { 
    UI_THEME, 
    createWoWFrame, 
    createWoWButton, 
    createModernButton 
} from '../../utils/ui-system.js';

export class GameSceneCombat {
    constructor(scene) {
        this.scene = scene;

        // Combat state
        this.combatTactics = 'balanced'; // balanced, aggressive, defensive
        this.showThreatDisplay = false;
        this.inCombat = false;
        this.currentEnemies = [];
        this.threatDisplay = null;

        // Combat UI elements
        this.combatIndicator = null;
        this.combatStatusDisplay = null;
        this.tacticsButton = null;
        this.consumablesButton = null;
        this.regenButton = null;
        this.logButton = null;
    }

    /**
     * Initialize combat-related UI elements
     */
    initializeCombatUI() {
        try {
            this.createCombatIndicator();
            this.createCombatButtons();
            this.createThreatDisplay();
        } catch (error) {
            globalErrorHandler.handle(error, 'GameSceneCombat.initializeCombatUI');
        }
    }

    /**
     * Create combat indicator (shows when in combat)
     */
    createCombatIndicator() {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        // Combat indicator frame (WoW style) - Using UI_CONFIG
        const indicatorConfig = UI_CONFIG.COMBAT_UI.INDICATOR;
        const frameWidth = getScaledValue(indicatorConfig.WIDTH, width);
        const frameHeight = getScaledValue(indicatorConfig.HEIGHT, width, 'height');
        const frameY = height + getScaledValue(indicatorConfig.Y_OFFSET, width, 'height');
        const frameX = width / 2;

        const indicatorFrame = createWoWFrame(this.scene, frameX, frameY, frameWidth, frameHeight, {
            backgroundColor: indicatorConfig.BACKGROUND_COLOR,
            borderColor: indicatorConfig.BORDER_COLOR,
            backgroundAlpha: indicatorConfig.BACKGROUND_ALPHA
        });

        // Combat indicator text - Using UI_CONFIG
        const fontSize = getScaledValue(indicatorConfig.FONT_SIZE, width, 'font');
        const strokeThickness = getScaledValue(indicatorConfig.STROKE_THICKNESS, width, 'font');
        const indicatorText = this.scene.uiBuilder.createText(
            frameX, frameY,
            '⚔️ IN COMBAT',
            {
                fill: '#ff0000',
                fontSize: fontSize,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: strokeThickness
            }
        );
        indicatorText.setOrigin(0.5, 0.5);

        this.combatIndicator = {
            frame: indicatorFrame,
            text: indicatorText,
            container: this.scene.add.container(0, 0, [indicatorFrame, indicatorText])
        };
        this.combatIndicator.container.setScrollFactor(0);
        this.combatIndicator.container.setDepth(1100);

        // Initially hide combat indicator
        this.setCombatIndicatorVisible(false);
    }

    /**
     * Create combat control buttons
     * NOTE: These tabs are hidden by default to match WoW WOTLK UI plan
     * They can be accessed via keyboard shortcuts or action bar buttons instead
     */
    createCombatButtons() {
        // Hide these tabs - they're not part of the WoW WOTLK UI plan
        // Functionality is accessible via keyboard shortcuts (T for Tactics, I for Items, etc.)
        // and can be triggered via action bar buttons if needed
        this.tacticsButton = null;
        this.consumablesButton = null;
        this.regenButton = null;
        this.logButton = null;
    }

    /**
     * Create threat display system
     */
    createThreatDisplay() {
        this.threatDisplay = {
            elements: [],
            visible: false
        };
    }

    /**
     * Set combat indicator visibility
     * @param {boolean} visible - Whether combat indicator should be visible
     */
    setCombatIndicatorVisible(visible) {
        if (this.combatIndicator?.container) {
            this.combatIndicator.container.setVisible(visible);
        }
    }

    /**
     * Update combat state
     * @param {boolean} inCombat - Whether currently in combat
     * @param {Array} enemies - Current enemies
     */
    updateCombatState(inCombat, enemies = []) {
        const wasInCombat = this.inCombat;
        this.inCombat = inCombat;
        this.currentEnemies = enemies || [];

        // Update combat indicator
        this.setCombatIndicatorVisible(inCombat);

        // Handle combat state change
        if (inCombat && !wasInCombat) {
            this.onCombatStart();
        } else if (!inCombat && wasInCombat) {
            this.onCombatEnd();
        }

        // Update threat display
        this.updateThreatDisplay();
    }

    /**
     * Handle combat start
     */
    onCombatStart() {
        SafeExecutor.execute(() => {
            // Add combat log message
            if (this.scene.uiModule?.addCombatLogMessage) {
                this.scene.uiModule.addCombatLogMessage('Combat started!', 'system');
            }

            // Play combat start sound
            if (this.scene.audioManager?.playSound) {
                this.scene.audioManager.playSound('combat_start');
            }

        }, null, 'GameSceneCombat.onCombatStart');
    }

    /**
     * Handle combat end
     */
    onCombatEnd() {
        SafeExecutor.execute(() => {
            // Add combat log message
            if (this.scene.uiModule?.addCombatLogMessage) {
                this.scene.uiModule.addCombatLogMessage('Combat ended.', 'system');
            }

            // Hide threat display
            this.setThreatDisplayVisible(false);

            // Clear combat state
            this.currentEnemies = [];
        }, null, 'GameSceneCombat.onCombatEnd');
    }

    /**
     * Update threat display
     */
    updateThreatDisplay() {
        if (!this.showThreatDisplay || !this.inCombat) {
            this.setThreatDisplayVisible(false);
            return;
        }

        SafeExecutor.execute(() => {
            this.setThreatDisplayVisible(true);
            // Update threat display with current threat values
            // Implementation would show threat bars for each party member
        }, null, 'GameSceneCombat.updateThreatDisplay');
    }

    /**
     * Set threat display visibility
     * @param {boolean} visible - Whether threat display should be visible
     */
    setThreatDisplayVisible(visible) {
        this.showThreatDisplay = visible;

        if (this.threatDisplay) {
            this.threatDisplay.visible = visible;
            // Show/hide threat display elements
            this.threatDisplay.elements.forEach(element => {
                if (element?.setVisible) {
                    element.setVisible(visible);
                }
            });
        }
    }

    /**
     * Show combat tactics menu
     */
    showCombatTacticsMenu() {
        SafeExecutor.execute(() => {
            const width = this.scene.scale.width;
            const height = this.scene.scale.height;

            // Create tactics selection menu
            const tactics = [
                { id: 'balanced', label: 'Balanced', color: '#00aa00' },
                { id: 'aggressive', label: 'Aggressive', color: '#aa0000' },
                { id: 'defensive', label: 'Defensive', color: '#0000aa' }
            ];

            // Use UI builder to create a panel - Using UI_CONFIG
            const tacticsConfig = UI_CONFIG.COMBAT_UI.TACTICS_PANEL;
            const panelWidth = getScaledValue(tacticsConfig.WIDTH, width);
            const panelHeight = getScaledValue(tacticsConfig.HEIGHT, width, 'height');
            const panelX = width / 2;
            const panelY = height / 2;

            const panel = this.scene.uiBuilder.createPanel(
                panelX, panelY,
                panelWidth, panelHeight,
                { backgroundColor: tacticsConfig.BACKGROUND_COLOR, borderColor: tacticsConfig.BORDER_COLOR }
            );

            const titleY = panelY + getScaledValue(tacticsConfig.TITLE_Y_OFFSET, width, 'height');
            const titleFontSize = getScaledValue(tacticsConfig.TITLE_FONT_SIZE, width, 'font');
            const title = this.scene.uiBuilder.createText(
                panelX, titleY,
                '⚔️ COMBAT TACTICS',
                { fontSize: titleFontSize, fill: '#ffaa00' }
            );
            title.setOrigin(0.5, 0.5);

            // Current tactics display
            const currentTactics = this.combatTactics || 'balanced';
            const tacticsDesc = {
                aggressive: 'Focus on damage, higher risk',
                defensive: 'Prioritize survival, lower risk',
                balanced: 'Standard combat behavior'
            };

            const currentTextY = panelY + getScaledValue(tacticsConfig.CURRENT_TEXT_Y_OFFSET, width, 'height');
            const currentTextFontSize = getScaledValue(tacticsConfig.CURRENT_TEXT_FONT_SIZE, width, 'font');
            const currentText = this.scene.uiBuilder.createText(
                panelX, currentTextY,
                `Current: ${currentTactics.toUpperCase()}\n${tacticsDesc[currentTactics]}`,
                { fontSize: currentTextFontSize, fill: '#ffffff', align: 'center' }
            );
            currentText.setOrigin(0.5, 0.5);

            // Tactics buttons - Using UI_CONFIG
            const buttonWidth = getScaledValue(tacticsConfig.BUTTON_WIDTH, width);
            const buttonHeight = getScaledValue(tacticsConfig.BUTTON_HEIGHT, width, 'height');
            const buttonSpacing = getScaledValue(tacticsConfig.BUTTON_SPACING, width);
            const buttonY = panelY + getScaledValue(tacticsConfig.BUTTON_Y_POSITION, width, 'height');
            const buttons = tactics.map((tactic, index) => {
                const buttonX = panelX + (index - 1) * buttonSpacing;
                return this.scene.uiBuilder.createButton(
                    buttonX, buttonY,
                    tactic.label,
                    () => {
                        this.setCombatTactics(tactic.id);
                        this.closeCombatTacticsMenu();
                    },
                    { 
                        width: buttonWidth, 
                        height: buttonHeight, 
                        color: tactic.color,
                        fontSize: getScaledValue(tacticsConfig.CURRENT_TEXT_FONT_SIZE, width, 'font')
                    }
                );
            });

            // Threat display toggle - Using UI_CONFIG
            const threatButtonY = panelY + getScaledValue(tacticsConfig.THREAT_BUTTON_Y_OFFSET, width, 'height');
            const threatButtonWidth = getScaledValue(tacticsConfig.THREAT_BUTTON_WIDTH, width);
            const threatButtonHeight = getScaledValue(tacticsConfig.THREAT_BUTTON_HEIGHT, width, 'height');
            const threatButton = this.scene.uiBuilder.createButton(
                panelX, threatButtonY,
                this.showThreatDisplay ? 'Hide Threat' : 'Show Threat',
                () => {
                    this.setThreatDisplayVisible(!this.showThreatDisplay);
                    this.closeCombatTacticsMenu();
                },
                { width: threatButtonWidth, height: threatButtonHeight, fontSize: getScaledValue(tacticsConfig.CURRENT_TEXT_FONT_SIZE, width, 'font') }
            );

            // Close button - Using UI_CONFIG
            const closeButtonSize = getScaledValue(30, width);
            const closeButton = this.scene.uiBuilder.createButton(
                panelX + panelWidth / 2 - 20, panelY - panelHeight / 2 + 20,
                'X',
                () => this.closeCombatTacticsMenu(),
                { width: closeButtonSize, height: closeButtonSize, fontSize: getScaledValue(16, width, 'font') }
            );

            this.combatTacticsPanel = {
                container: this.scene.add.container(0, 0, [panel, title, currentText, ...buttons, threatButton, closeButton]),
                elements: [panel, title, currentText, ...buttons, threatButton, closeButton]
            };
            
            this.combatTacticsPanel.container.setDepth(SCENE_CONFIG.DEPTH?.UI_PANEL || 1000);
            this.combatTacticsPanel.container.setScrollFactor(0);

        }, null, 'GameSceneCombat.showCombatTacticsMenu');
    }

    /**
     * Close combat tactics menu
     */
    closeCombatTacticsMenu() {
        if (this.combatTacticsPanel?.container) {
            this.combatTacticsPanel.container.destroy();
            this.combatTacticsPanel = null;
        }
    }

    /**
     * Set combat tactics
     * @param {string} tactics - New combat tactics
     */
    setCombatTactics(tactics) {
        if (['balanced', 'aggressive', 'defensive'].includes(tactics)) {
            this.combatTactics = tactics;

            // Update combat manager with new tactics
            if (this.scene.combatManager?.setTactics) {
                this.scene.combatManager.setTactics(tactics);
            }

            // Update UI
            if (this.tacticsButton) {
                // Update button text to show current tactics
            }

            // Add combat log message
            if (this.scene.uiModule?.addCombatLogMessage) {
                this.scene.uiModule.addCombatLogMessage(`Combat tactics set to: ${tactics}`, 'system');
            }
        }
    }

    /**
     * Show consumables panel
     */
    showConsumablesPanel() {
        SafeExecutor.execute(() => {
            const width = this.scene.scale.width;
            const height = this.scene.scale.height;

            // Create consumables panel - Using UI_CONFIG
            const consumablesConfig = UI_CONFIG.COMBAT_UI.CONSUMABLES_PANEL;
            const panelWidth = getScaledValue(consumablesConfig.WIDTH, width);
            const panelHeight = getScaledValue(consumablesConfig.HEIGHT, width, 'height');
            const panelX = width / 2;
            const panelY = height / 2;

            const panel = this.scene.uiBuilder.createPanel(
                panelX, panelY,
                panelWidth, panelHeight,
                { backgroundColor: 0x1a2e1a, borderColor: 0x00aa00 }
            );

            const title = this.scene.uiBuilder.createText(
                panelX, panelY - panelHeight / 2 + 30,
                '🧪 CONSUMABLES',
                { fontSize: 20, fill: '#00aa00' }
            );
            title.setOrigin(0.5, 0.5);

            // Get consumables from resource manager
            const heroResourceManager = this.scene.heroResourceManager;
            const consumables = heroResourceManager ? heroResourceManager.getConsumables() : new Map();
            const itemsData = this.scene.cache.json.get('items');

            const container = this.scene.add.container(0, 0, [panel, title]);
            const elements = [panel, title];

            // Display consumables in a list - Using UI_CONFIG
            const startY = panelY + getScaledValue(consumablesConfig.ITEM_START_Y, width, 'height');
            const itemSpacing = getScaledValue(consumablesConfig.ITEM_SPACING, width, 'height');
            let currentY = startY;
            let itemIndex = 0;

            consumables.forEach((consumableData, itemId) => {
                if (consumableData.count <= 0) return;

                const itemData = itemsData.consumables?.[itemId];
                if (!itemData) return;

                const width = this.scene.scale.width;
                const height = this.scene.scale.height;
                const itemX = panelX - getScaledValue(180, width);
                const itemY = currentY;

                // Item icon/text
                // Show floating loot text with item details
                const itemName = itemData.name || 'Unknown Item';
                const itemRarity = itemData.rarity || 'common';
                const rarityColors = {
                    'common': '#ffffff',
                    'uncommon': '#00ff00',
                    'rare': '#0088ff',
                    'epic': '#aa00ff',
                    'legendary': '#ff8800'
                };

                const fontSize = getScaledValue(UI_CONFIG.NOTIFICATIONS?.FONT_SIZE || 14, height, 'height');
                const lootText = this.scene.add.text(itemX, itemY - getScaledValue(25, height, 'height'), itemName, {
                    font: `bold ${fontSize}px Arial`,
                    fill: rarityColors[itemRarity] || '#ffffff',
                    stroke: '#000000',
                    strokeThickness: getScaledValue(2, height, 'height')
                });
                lootText.setOrigin(0.5, 0.5);
                lootText.setScrollFactor(0);
                lootText.setDepth(SCENE_CONFIG.DEPTH?.EFFECTS || 205);

                // Show gold amount if any
                if (data.rewards.gold > 0) {
                    const goldFontSize = getScaledValue(UI_CONFIG.NOTIFICATIONS?.FONT_SIZE || 16, height, 'height');
                    const goldText = this.scene.add.text(itemX, itemY - getScaledValue(45, height, 'height'), `+${data.rewards.gold} Gold`, {
                        font: `bold ${goldFontSize}px Arial`,
                        fill: '#ffd700',
                        stroke: '#000000',
                        strokeThickness: getScaledValue(2, height, 'height')
                    });
                    goldText.setOrigin(0.5, 0.5);
                    goldText.setScrollFactor(0);
                    goldText.setDepth(SCENE_CONFIG.DEPTH?.EFFECTS || 205);

                    // Animate gold text
                    this.scene.tweens.add({
                        targets: goldText,
                        y: itemY - getScaledValue(80, height, 'height'),
                        alpha: 0,
                        duration: UI_CONFIG.NOTIFICATIONS?.DISPLAY_DURATION || 2000,
                        ease: 'Quad.easeOut',
                        onComplete: () => goldText.destroy()
                    });
                }

                // Animate loot collection
                this.scene.tweens.add({
                    targets: lootText,
                    y: itemY - 70,
                    alpha: 0,
                    duration: 2000,
                    ease: 'Quad.easeOut',
                    onComplete: () => lootText.destroy()
                });

                // Item name and count
                const nameText = this.scene.uiBuilder.createText(
                    itemX + 30, itemY - 10,
                    `${itemData.name} (${consumableData.count})`,
                    { fontSize: 14, fill: '#ffffff' }
                );

                // Item effects description
                let effectDesc = itemData.description || '';
                if (itemData.effects) {
                    const effects = [];
                    Object.entries(itemData.effects).forEach(([effect, value]) => {
                        switch (effect) {
                            case 'restoreMana': effects.push(`+${value} Mana`); break;
                            case 'restoreHealth': effects.push(`+${value} Health`); break;
                            case 'restoreEnergy': effects.push(`+${value} Energy`); break;
                            case 'manaRegenBoost': effects.push(`${value}x Mana Regen`); break;
                        }
                    });
                    if (effects.length > 0) effectDesc = effects.join(', ');
                }

                const descText = this.scene.uiBuilder.createText(
                    itemX + 30, itemY + 10,
                    effectDesc,
                    { fontSize: 12, fill: '#cccccc' }
                );

                // Use button
                const useButton = this.scene.uiBuilder.createButton(
                    panelX + 150, itemY,
                    'Use',
                    () => {
                        const heroes = this.scene.partyManager ? this.scene.partyManager.getHeroes() : [];
                        if (heroes.length > 0) {
                            // Apply to first hero (tank) for now, or could show hero selector
                            const success = heroResourceManager.useConsumable(itemId, heroes[0].id);
                            if (success) {
                                if (this.scene.uiModule?.addCombatLogMessage) {
                                    this.scene.uiModule.addCombatLogMessage(`Used ${itemData.name}!`, 'system');
                                }
                                this.closeConsumablesPanel();
                                this.scene.time.delayedCall(100, () => this.showConsumablesPanel());
                            }
                        }
                    },
                    { width: 60, height: 30, fontSize: 12, color: '#00aa00' }
                );

                container.add([icon, nameText, descText, useButton]);
                elements.push(icon, nameText, descText, useButton);

                currentY += itemSpacing;
                itemIndex++;
            });

            if (itemIndex === 0) {
                const noItemsText = this.scene.uiBuilder.createText(
                    panelX, panelY,
                    'No consumables available.\nVisit shops to buy potions!',
                    { fontSize: 16, fill: '#888888', align: 'center' }
                );
                noItemsText.setOrigin(0.5, 0.5);
                container.add(noItemsText);
                elements.push(noItemsText);
            }

            // Close button
            const closeButton = this.scene.uiBuilder.createButton(
                panelX + panelWidth / 2 - 20, panelY - panelHeight / 2 + 20,
                'X',
                () => this.closeConsumablesPanel(),
                { width: 30, height: 30, fontSize: 16 }
            );
            container.add(closeButton);
            elements.push(closeButton);

            this.consumablesPanel = { container, elements };
            this.consumablesPanel.container.setDepth(SCENE_CONFIG.DEPTH?.UI_PANEL || 1000);
            this.consumablesPanel.container.setScrollFactor(0);

        }, null, 'GameSceneCombat.showConsumablesPanel');
    }

    /**
     * Close consumables panel
     */
    closeConsumablesPanel() {
        if (this.consumablesPanel?.container) {
            this.consumablesPanel.container.destroy();
            this.consumablesPanel = null;
        }
    }

    /**
     * Show regeneration menu
     */
    showRegenerationMenu() {
        SafeExecutor.execute(() => {
            const width = this.scene.scale.width;
            const height = this.scene.scale.height;

            // Create regeneration panel - Using UI_CONFIG
            const regenConfig = UI_CONFIG.REGENERATION_MENU;
            const panelWidth = getScaledValue(regenConfig.WIDTH, width);
            const panelHeight = getScaledValue(regenConfig.HEIGHT, width, 'height');
            const panelX = width / 2;
            const panelY = height / 2;

            const panel = this.scene.uiBuilder.createPanel(
                panelX, panelY,
                panelWidth, panelHeight,
                { backgroundColor: regenConfig.BACKGROUND_COLOR, borderColor: regenConfig.BORDER_COLOR }
            );

            const titleY = panelY + getScaledValue(regenConfig.TITLE_Y_OFFSET, width, 'height');
            const titleFontSize = getScaledValue(regenConfig.TITLE_FONT_SIZE, width, 'font');
            const title = this.scene.uiBuilder.createText(
                panelX, titleY,
                '⚡ REGENERATION STRATEGY',
                { fontSize: titleFontSize, fill: '#00aaff' }
            );
            title.setOrigin(0.5, 0.5);

            const container = this.scene.add.container(0, 0, [panel, title]);
            const elements = [panel, title];

            // Regeneration strategies
            const strategies = [
                { id: 'passive', label: 'Passive (Low Regen, High Combat Skill)', color: '#00aa00' },
                { id: 'active', label: 'Active (Medium Regen, Balanced)', color: '#aaaa00' },
                { id: 'burst', label: 'Burst (High Regen, Low Combat Skill)', color: '#aa0000' }
            ];

            const buttonStartY = panelY + getScaledValue(regenConfig.BUTTON_START_Y, width, 'height');
            const buttonSpacing = getScaledValue(regenConfig.BUTTON_SPACING, width, 'height');
            const buttonWidth = getScaledValue(regenConfig.BUTTON_WIDTH, width);
            const buttonHeight = getScaledValue(regenConfig.BUTTON_HEIGHT, width, 'height');
            const buttonFontSize = getScaledValue(regenConfig.BUTTON_FONT_SIZE, width, 'font');
            
            strategies.forEach((strategy, index) => {
                const buttonY = buttonStartY + (index * buttonSpacing);
                const button = this.scene.uiBuilder.createButton(
                    panelX, buttonY,
                    strategy.label,
                    () => {
                        if (this.scene.heroResourceManager?.setRegenStrategy) {
                            this.scene.heroResourceManager.setRegenStrategy(strategy.id);
                            if (this.scene.uiModule?.addCombatLogMessage) {
                                this.scene.uiModule.addCombatLogMessage(`Regen strategy set to: ${strategy.id}`, 'system');
                            }
                        }
                        this.closeRegenerationMenu();
                    },
                    { 
                        width: buttonWidth, 
                        height: buttonHeight, 
                        fontSize: buttonFontSize, 
                        color: strategy.color 
                    }
                );
                container.add(button);
                elements.push(button);
            });

            // Close button - Using UI_CONFIG
            const closeButtonSize = getScaledValue(regenConfig.CLOSE_BUTTON_SIZE, width);
            const closeButtonX = panelX + getScaledValue(regenConfig.CLOSE_BUTTON_X_OFFSET, width);
            const closeButtonY = panelY + getScaledValue(regenConfig.CLOSE_BUTTON_Y_OFFSET, width, 'height');
            const closeButtonFontSize = getScaledValue(regenConfig.CLOSE_BUTTON_FONT_SIZE, width, 'font');
            const closeButton = this.scene.uiBuilder.createButton(
                closeButtonX, closeButtonY,
                'X',
                () => this.closeRegenerationMenu(),
                { width: closeButtonSize, height: closeButtonSize, fontSize: closeButtonFontSize }
            );
            container.add(closeButton);
            elements.push(closeButton);

            this.regenPanel = { container, elements };
            this.regenPanel.container.setDepth(SCENE_CONFIG.DEPTH?.UI_PANEL || 1000);
            this.regenPanel.container.setScrollFactor(0);

        }, null, 'GameSceneCombat.showRegenerationMenu');
    }

    /**
     * Close regeneration menu
     */
    closeRegenerationMenu() {
        if (this.regenPanel?.container) {
            this.regenPanel.container.destroy();
            this.regenPanel = null;
        }
    }

    /**
     * Toggle combat log visibility
     */
    toggleCombatLog() {
        SafeExecutor.execute(() => {
            // Implementation would toggle combat log visibility
            if (this.scene.uiModule?.toggleCombatLog) {
                this.scene.uiModule.toggleCombatLog();
            }
        }, null, 'GameSceneCombat.toggleCombatLog');
    }

    /**
     * Handle damage dealt in combat
     * @param {Object} damageInfo - Information about damage dealt
     */
    onDamageDealt(damageInfo) {
        SafeExecutor.execute(() => {
            // Add to combat log
            if (this.scene.uiModule?.addCombatLogMessage) {
                const message = `${damageInfo.source} deals ${damageInfo.amount} damage to ${damageInfo.target}`;
                this.scene.uiModule.addCombatLogMessage(message, 'damage');
            }

            // Create damage number effect (disabled for performance)
            // try {
            //     if (this.scene.particleManager?.createDamageNumber) {
            //         this.scene.particleManager.createDamageNumber(
            //             damageInfo.targetX,
            //             damageInfo.targetY,
            //             damageInfo.amount,
            //             damageInfo.type
            //         );
            //     }
            // } catch (error) {
            //     // Particle effects failed, but don't break combat
            // }
        }, null, 'GameSceneCombat.onDamageDealt');
    }

    /**
     * Handle healing in combat
     * @param {Object} healInfo - Information about healing done
     */
    onHealingDone(healInfo) {
        SafeExecutor.execute(() => {
            // Add to combat log
            if (this.scene.uiModule?.addCombatLogMessage) {
                const message = `${healInfo.source} heals ${healInfo.target} for ${healInfo.amount}`;
                this.scene.uiModule.addCombatLogMessage(message, 'heal');
            }

            // Create healing effect (disabled for performance)
            // try {
            //     if (this.scene.particleManager?.createHealEffect) {
            //         this.scene.particleManager.createHealEffect(
            //             healInfo.targetX,
            //             healInfo.targetY,
            //             healInfo.amount
            //         );
            //     }
            // } catch (error) {
            //     // Particle effects failed, but don't break healing
            // }
        }, null, 'GameSceneCombat.onHealingDone');
    }

    /**
     * Handle enemy death
     * @param {Object} enemy - The enemy that died
     */
    onEnemyDeath(enemy) {
        SafeExecutor.execute(() => {
            // Add to combat log
            if (this.scene.uiModule?.addCombatLogMessage) {
                this.scene.uiModule.addCombatLogMessage(`${enemy.name} dies!`, 'death');
            }

            // Create death effect (disabled for performance)
            // try {
            //     if (this.scene.particleManager?.createExplosion) {
            //         this.scene.particleManager.createExplosion(
            //             enemy.x, enemy.y,
            //             'death', 30
            //         );
            //     }
            // } catch (error) {
            //     // Particle effects failed, but don't break enemy death
            // }

            // Remove from current enemies
            this.currentEnemies = this.currentEnemies.filter(e => e !== enemy);
        }, null, 'GameSceneCombat.onEnemyDeath');
    }

    /**
     * Handle ability cooldown updates
     * @param {Object} cooldownInfo - Cooldown information
     */
    onAbilityCooldownUpdate(cooldownInfo) {
        SafeExecutor.execute(() => {
            // Update action bar button cooldowns
            if (this.scene.uiModule?.updateActionBarCooldown) {
                this.scene.uiModule.updateActionBarCooldown(
                    cooldownInfo.abilityId,
                    cooldownInfo.remainingTime
                );
            }
        }, null, 'GameSceneCombat.onAbilityCooldownUpdate');
    }

    /**
     * Get combat statistics
     * @returns {Object} Combat statistics
     */
    getCombatStats() {
        return {
            inCombat: this.inCombat,
            tactics: this.combatTactics,
            showThreat: this.showThreatDisplay,
            enemyCount: this.currentEnemies.length,
            threatDisplayVisible: this.threatDisplay?.visible || false
        };
    }

    /**
     * Clean up combat-related elements
     */
    cleanup() {
        SafeExecutor.execute(() => {
            // Clean up combat indicator
            if (this.combatIndicator?.container) {
                this.combatIndicator.container.destroy();
            }

            // Clean up threat display
            if (this.threatDisplay?.elements) {
                this.threatDisplay.elements.forEach(element => {
                    if (element?.destroy) {
                        element.destroy();
                    }
                });
                this.threatDisplay.elements = [];
            }

            // Reset combat state
            this.inCombat = false;
            this.currentEnemies = [];
            this.showThreatDisplay = false;
        }, null, 'GameSceneCombat.cleanup');
    }

    /**
     * Show/hide combat indicator (compatibility method for combat-handler)
     * @param {boolean} visible - Whether to show combat indicator
     */
    showCombatIndicator(visible) {
        this.setCombatIndicatorVisible(visible);
    }

    /**
     * Show threat effect at position (compatibility method for combat-handler)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} type - Effect type ('taunt', 'threat', etc.)
     */
    showThreatEffect(x, y, type = 'taunt') {
        // Create visual effect for threat/taunt
        // Use 'combat' particle type (taunt/threat types not implemented in ParticleManager)
        if (this.scene.particleManager) {
            this.scene.particleManager.createExplosion(x, y, 'combat', 20);
        }
    }

    /**
     * Show enemy defeat effect (compatibility method for combat-handler)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} enemyName - Enemy name
     * @param {boolean} isBoss - Whether enemy is a boss
     */
    showEnemyDefeatEffect(x, y, enemyName, isBoss = false) {
        // Create visual effect for enemy defeat
        if (this.scene.particleManager) {
            // Use 'combat' particle type (enemy_defeat/boss_defeat not implemented)
            const intensity = isBoss ? 50 : 30;
            this.scene.particleManager.createExplosion(x, y, 'combat', intensity);
        }
    }
}

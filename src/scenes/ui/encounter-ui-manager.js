/**
 * Encounter UI Manager - Handles all encounter-related UI panels
 * Extracted from GameScene to improve separation of concerns
 */

import { createWoWFrame, createModernButton, createModernText, UI_THEME } from '../../utils/ui-system.js';
import { DEPTH_LAYERS, setDepth } from '../../utils/depth-layers.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';

export class EncounterUIManager {
    /**
     * Create a new EncounterUIManager
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.shopManager = managers.shopManager;
        this.particleManager = managers.particleManager;
        this.audioManager = managers.audioManager;
        
        // Panel references for cleanup
        this.resourcePanel = null;
        this.explorationPanel = null;
        this.choicePanel = null;
        this.mileSelectionPanel = null;
    }

    /**
     * Show resource gathering interface
     * @param {Object} encounter - Resource node encounter
     */
    showResourceGatheringInterface(encounter) {
        this.closeResourceInterface();
        
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        // Using UI_CONFIG for resource panel
        const resourceConfig = UI_CONFIG.ENCOUNTER_UI.RESOURCE_PANEL;
        const panelWidth = getScaledValue(resourceConfig.WIDTH, width);
        const panelHeight = getScaledValue(resourceConfig.HEIGHT, width, 'height');
        const panelX = width / 2;
        const panelY = height / 2;

        const container = this.scene.add.container(panelX, panelY);
        container.setDepth(DEPTH_LAYERS.UI_PANEL);
        container.setScrollFactor(0);

        // WoW Style Background - Using UI_CONFIG
        const bg = createWoWFrame(this.scene, 0, 0, panelWidth, panelHeight, {
            backgroundColor: resourceConfig.BACKGROUND_COLOR,
            borderColor: resourceConfig.BORDER_COLOR,
            borderWidth: resourceConfig.BORDER_WIDTH,
            shadow: true
        });
        container.add(bg);

        const titleY = getScaledValue(resourceConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(resourceConfig.TITLE_FONT_SIZE, width, 'font');
        const title = createModernText(this.scene, 0, titleY, '🪓 RESOURCE NODE', {
            fontSize: titleFontSize,
            color: '#00ff00',
            strokeColor: '#000000',
            strokeThickness: 2,
            weight: 'bold'
        });
        title.setOrigin(0.5, 0.5);
        container.add(title);

        const resourceType = encounter.resourceType;
        const yieldAmount = encounter.yield;
        const quality = encounter.quality;

        const contentY = getScaledValue(resourceConfig.CONTENT_Y_OFFSET, width, 'height');
        const contentFontSize = getScaledValue(resourceConfig.CONTENT_FONT_SIZE, width, 'font');
        const resourceText = createModernText(this.scene, 0, contentY,
            `YOU HAVE DISCOVERED A ${quality.toUpperCase()} ${resourceType.toUpperCase()} NODE!\nYIELD: ${yieldAmount} UNITS`, {
            fontSize: contentFontSize,
            color: '#ffffff',
            align: 'center',
            weight: 'bold'
        });
        resourceText.setOrigin(0.5, 0.5);
        container.add(resourceText);

        // Buttons - Using UI_CONFIG
        const buttonWidth = getScaledValue(resourceConfig.BUTTON_WIDTH, width);
        const buttonHeight = getScaledValue(resourceConfig.BUTTON_HEIGHT, width, 'height');
        const buttonY = getScaledValue(resourceConfig.BUTTON_Y_OFFSET, width, 'height');
        const buttonSpacing = getScaledValue(resourceConfig.BUTTON_SPACING, width);
        const buttonFontSize = getScaledValue(resourceConfig.BUTTON_FONT_SIZE, width, 'font');
        
        const gatherButton = createModernButton(
            this.scene,
            -buttonSpacing / 2,
            buttonY,
            buttonWidth,
            buttonHeight,
            'GATHER',
            {
                backgroundColor: 0x1a2e1a,
                hoverColor: 0x2a4e2a,
                borderColor: 0x00ff00,
                textColor: '#ffffff',
                fontSize: buttonFontSize,
                onClick: () => {
                    if (this.onGatherResources) {
                        this.onGatherResources(encounter);
                    }
                    this.closeResourceInterface();
                }
            }
        );
        if (gatherButton) {
            container.add(gatherButton);
        }

        const skipButton = createModernButton(
            this.scene,
            buttonSpacing / 2,
            buttonY,
            buttonWidth,
            buttonHeight,
            'SKIP',
            {
                backgroundColor: 0x2e1a1a,
                hoverColor: 0x4e2a2a,
                borderColor: 0xff4a4a,
                textColor: '#ffffff',
                fontSize: buttonFontSize,
                onClick: () => {
                    this.closeResourceInterface();
                }
            }
        );
        if (skipButton) {
            container.add(skipButton);
        }

        this.resourcePanel = {
            container: container,
            bg: bg,
            title: title,
            resourceText: resourceText,
            gatherButton: gatherButton,
            skipButton: skipButton
        };
    }

    /**
     * Close resource gathering interface
     */
    closeResourceInterface() {
        if (this.resourcePanel) {
            if (this.resourcePanel.container) {
                this.resourcePanel.container.destroy();
            }
            this.resourcePanel = null;
        }
        
        // Hide tooltips
        if (this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }
    }

    /**
     * Show exploration event interface
     * @param {Object} encounter - Exploration event encounter
     */
    showExplorationEventInterface(encounter) {
        this.closeExplorationInterface();
        
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        // Using UI_CONFIG for exploration panel
        const explorationConfig = UI_CONFIG.ENCOUNTER_UI.EXPLORATION_PANEL;
        const panelWidth = getScaledValue(explorationConfig.WIDTH, width);
        const panelHeight = getScaledValue(explorationConfig.HEIGHT, width, 'height');
        const panelX = width / 2;
        const panelY = height / 2;

        const container = this.scene.add.container(panelX, panelY);
        container.setDepth(DEPTH_LAYERS.UI_PANEL);
        container.setScrollFactor(0);

        // WoW Style Background - Using UI_CONFIG
        const bg = createWoWFrame(this.scene, 0, 0, panelWidth, panelHeight, {
            backgroundColor: 0x1a0d0d,
            borderColor: 0x8b4513,
            borderWidth: 3,
            shadow: true
        });
        container.add(bg);

        const titleY = getScaledValue(explorationConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(explorationConfig.TITLE_FONT_SIZE, width, 'font');
        const title = createModernText(this.scene, 0, titleY, '🔍 EXPLORATION EVENT', {
            fontSize: titleFontSize,
            color: '#8b4513',
            strokeColor: '#000000',
            strokeThickness: 2,
            weight: 'bold'
        });
        title.setOrigin(0.5, 0.5);
        container.add(title);

        const eventDescriptions = {
            ancient_ruins: 'YOU DISCOVER ANCIENT RUINS! HIDDEN TREASURES MIGHT AWAIT THE BRAVE EXPLORER.',
            mysterious_cave: 'A MYSTERIOUS CAVE ENTRANCE BECKONS. STRANGE SOUNDS ECHO FROM WITHIN.',
            abandoned_camp: 'AN ABANDONED CAMP WITH SCATTERED BELONGINGS. SOMEONE LEFT IN A HURRY.',
            magical_spring: 'A CRYSTAL-CLEAR SPRING WITH MAGICAL PROPERTIES. THE WATER SEEMS TO GLOW.',
            forgotten_tomb: 'A FORGOTTEN TOMB SEALED FOR CENTURIES. ANCIENT MAGIC PROTECTS ITS SECRETS.'
        };

        const eventDesc = eventDescriptions[encounter.eventType] || 'YOU DISCOVER SOMETHING MYSTERIOUS!';

        const descY = getScaledValue(explorationConfig.DESC_Y_OFFSET, width, 'height');
        const descFontSize = getScaledValue(explorationConfig.DESC_FONT_SIZE, width, 'font');
        const descText = createModernText(this.scene, 0, descY, eventDesc, {
            fontSize: descFontSize,
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: panelWidth - getScaledValue(60, width) }
        });
        descText.setOrigin(0.5, 0.5);
        container.add(descText);

        const rewards = [
            { type: 'gold', amount: 50 + Math.floor(Math.random() * 100), desc: 'GOLD COINS' },
            { type: 'experience', amount: 25 + Math.floor(Math.random() * 50), desc: 'EXPERIENCE' },
            { type: 'item', desc: 'A RARE ITEM' }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];

        const rewardFontSize = getScaledValue(explorationConfig.BUTTON_FONT_SIZE, width, 'font');
        const rewardText = createModernText(this.scene, 0, 10,
            `YOU FIND: ${reward.amount || 'A'} ${reward.desc}!`, {
            fontSize: rewardFontSize,
            color: '#00ff00',
            weight: 'bold'
        });
        rewardText.setOrigin(0.5, 0.5);
        container.add(rewardText);

        const buttonWidth = getScaledValue(explorationConfig.BUTTON_WIDTH, width);
        const buttonHeight = getScaledValue(explorationConfig.BUTTON_HEIGHT, width, 'height');
        const buttonY = getScaledValue(explorationConfig.BUTTON_Y_OFFSET, width, 'height');
        const claimButton = createModernButton(
            this.scene,
            0,
            buttonY,
            buttonWidth,
            buttonHeight,
            'CLAIM REWARD',
            {
                backgroundColor: 0x2a1a2e,
                hoverColor: 0x3a2a4e,
                borderColor: 0x8b4513,
                textColor: '#ffffff',
                fontSize: 16,
                onClick: () => {
                    if (this.onClaimExplorationReward) {
                        this.onClaimExplorationReward(encounter, reward);
                    }
                    this.closeExplorationInterface();
                }
            }
        );
        if (claimButton) {
            container.add(claimButton);
        }

        this.explorationPanel = {
            container: container,
            bg: bg,
            title: title,
            descText: descText,
            rewardText: rewardText,
            claimButton: claimButton
        };
    }

    /**
     * Close exploration interface
     */
    closeExplorationInterface() {
        if (this.explorationPanel) {
            if (this.explorationPanel.container) {
                this.explorationPanel.container.destroy();
            }
            this.explorationPanel = null;
        }
        
        // Hide tooltips
        if (this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }
    }

    /**
     * Show choice encounter interface
     * @param {Object} encounter - Choice encounter data
     */
    showChoiceEncounterInterface(encounter) {
        this.closeChoiceInterface();
        
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        // Using UI_CONFIG for choice panel
        const choiceConfig = UI_CONFIG.ENCOUNTER_UI.CHOICE_PANEL;
        const panelWidth = getScaledValue(choiceConfig.WIDTH, width);
        const panelHeight = getScaledValue(choiceConfig.HEIGHT, width, 'height');
        const panelX = width / 2;
        const panelY = height / 2;

        const container = this.scene.add.container(panelX, panelY);
        container.setDepth(DEPTH_LAYERS.UI_PANEL);
        container.setScrollFactor(0);

        // WoW Style Background - Using UI_CONFIG
        const bg = createWoWFrame(this.scene, 0, 0, panelWidth, panelHeight, {
            backgroundColor: UI_THEME.surfaces.panel,
            borderColor: 0xffaa00,
            borderWidth: 3,
            shadow: true
        });
        container.add(bg);

        const titleY = getScaledValue(choiceConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(choiceConfig.TITLE_FONT_SIZE, width, 'font');
        const title = createModernText(this.scene, 0, titleY, '⚖️ MORAL CHOICE', {
            fontSize: titleFontSize,
            color: '#ffaa00',
            strokeColor: '#000000',
            strokeThickness: 2,
            weight: 'bold'
        });
        title.setOrigin(0.5, 0.5);
        container.add(title);

        const choices = this.generateChoiceOptions ? this.generateChoiceOptions(encounter.choiceType) : {
            scenario: 'A CRITICAL CHOICE MUST BE MADE. YOUR DECISION WILL SHAPE THE PATH AHEAD.',
            optionA: { text: 'CHOOSE PATH A', consequences: {} },
            optionB: { text: 'CHOOSE PATH B', consequences: {} }
        };

        const descY = getScaledValue(choiceConfig.DESC_Y_OFFSET, width, 'height');
        const descFontSize = getScaledValue(choiceConfig.DESC_FONT_SIZE, width, 'font');
        const choiceText = createModernText(this.scene, 0, descY, choices.scenario, {
            fontSize: descFontSize,
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: panelWidth - getScaledValue(80, width) }
        });
        choiceText.setOrigin(0.5, 0.5);
        container.add(choiceText);

        // Option buttons - Using UI_CONFIG
        const optionSpacing = getScaledValue(choiceConfig.OPTION_SPACING, width, 'height');
        const optionFontSize = getScaledValue(choiceConfig.OPTION_FONT_SIZE, width, 'font');
        const buttonWidth = getScaledValue(choiceConfig.BUTTON_WIDTH, width);
        const buttonHeight = getScaledValue(choiceConfig.BUTTON_HEIGHT, width, 'height');
        const buttonY = getScaledValue(60, width, 'height');
        const buttonXOffset = getScaledValue(140, width);
        
        const optionAButton = createModernButton(
            this.scene,
            -buttonXOffset,
            buttonY,
            buttonWidth,
            buttonHeight,
            choices.optionA.text.toUpperCase(),
            {
                backgroundColor: 0x1a2e1a,
                hoverColor: 0x2a4e2a,
                borderColor: 0x00ff00,
                textColor: '#ffffff',
                fontSize: getScaledValue(choiceConfig.BUTTON_FONT_SIZE, width, 'font'),
                onClick: () => {
                    if (this.onMakeChoice) {
                        this.onMakeChoice(encounter, choices.optionA);
                    }
                    this.closeChoiceInterface();
                }
            }
        );
        if (optionAButton) {
            container.add(optionAButton);
        }

        const optionBButton = createModernButton(
            this.scene,
            buttonXOffset,
            buttonY,
            buttonWidth,
            buttonHeight,
            choices.optionB.text.toUpperCase(),
            {
                backgroundColor: 0x2e1a1a,
                hoverColor: 0x4e2a2a,
                borderColor: 0xff4a4a,
                textColor: '#ffffff',
                fontSize: 14,
                onClick: () => {
                    if (this.onMakeChoice) {
                        this.onMakeChoice(encounter, choices.optionB);
                    }
                    this.closeChoiceInterface();
                }
            }
        );
        if (optionBButton) {
            container.add(optionBButton);
        }

        this.choicePanel = {
            container: container,
            bg: bg,
            title: title,
            choiceText: choiceText,
            optionAButton: optionAButton,
            optionBButton: optionBButton
        };
    }

    /**
     * Close choice interface
     */
    closeChoiceInterface() {
        if (this.choicePanel) {
            if (this.choicePanel.container) {
                this.choicePanel.container.destroy();
            }
            this.choicePanel = null;
        }
        
        // Hide tooltips
        if (this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }
    }

    /**
     * Cleanup all panels
     */
    destroy() {
        this.closeResourceInterface();
        this.closeExplorationInterface();
        this.closeChoiceInterface();
        if (this.mileSelectionPanel) {
            if (this.mileSelectionPanel.bg) this.mileSelectionPanel.bg.destroy();
            if (this.mileSelectionPanel.title) this.mileSelectionPanel.title.destroy();
            if (this.mileSelectionPanel.closeButton) this.mileSelectionPanel.closeButton.destroy();
            this.mileSelectionPanel = null;
        }
    }
}

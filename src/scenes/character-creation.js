import Phaser from 'phaser';
import { HeroFactory } from '../utils/hero-factory.js';
import { PartyManager } from '../managers/party-manager.js';
import { StatCalculator } from '../utils/stat-calculator.js';
import { Logger } from '../utils/logger.js';

// New imports for fixing issues
import { SceneResourceManager } from '../utils/scene-event-cleanup.js';
import { SCENE_CONFIG } from '../config/scene-config.js';
import { getUIBuilder } from '../utils/ui-builder.js';
import { globalErrorHandler, SafeExecutor } from '../utils/error-handling.js';
import { validateSceneTransition } from '../utils/input-validation.js';
import { getPartyStateManager } from '../utils/party-state-manager.js';
import { UI_THEME, getClassColor, createWoWFrame, createModernButton, createModernText } from '../utils/ui-system.js';
import { UI_CONFIG, getScaledValue } from '../config/ui-config.js';

export class CharacterCreationScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterCreationScene' });
        this.selectedClasses = {}; // role -> classId mapping
        this.selectedSpecs = {}; // role -> specId mapping
        this.heroFactory = null;
        this.uiElements = [];

        // Initialize resource management (fixes memory leaks)
        this.resourceManager = new SceneResourceManager(this);
        // Defer UIBuilder initialization until create() to ensure scene is ready
        this.uiBuilder = null;
    }

    create() {
        // Initialize UIBuilder now that scene is ready (fixes object pool initialization errors)
        if (!this.uiBuilder) {
            this.uiBuilder = getUIBuilder(this);
        }
        // Initialize hero factory
        this.heroFactory = new HeroFactory(this);
        this.statCalculator = new StatCalculator(this);

        // Get viewport dimensions
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;

        // Set background with image and dark overlay
        if (this.textures.exists('menu-background')) {
            const bg = this.add.image(width / 2, height / 2, 'menu-background');
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale).setAlpha(0.6);
        } else {
            this.cameras.main.setBackgroundColor('#0a0e27');
        }

        // Dark overlay for readability
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(1);

        // Title - Using UI_CONFIG
        const charConfig = UI_CONFIG.CHARACTER_CREATION;
        const titleY = getScaledValue(charConfig.TITLE.Y, width, 'height');
        createModernText(this, width / 2, titleY, 'CHARACTER CREATION', {
            fontSize: getScaledValue(charConfig.TITLE.FONT_SIZE, width, 'font'),
            color: charConfig.TITLE.COLOR,
            shadow: true,
            align: 'center'
        }).setOrigin(0.5, 0).setDepth(10);

        // Instructions - Using UI_CONFIG
        const instructionsY = getScaledValue(charConfig.INSTRUCTIONS.Y, width, 'height');
        createModernText(this, width / 2, instructionsY, 'Select a class and specialization for each party role', {
            fontSize: getScaledValue(charConfig.INSTRUCTIONS.FONT_SIZE, width, 'font'),
            color: charConfig.INSTRUCTIONS.COLOR,
            shadow: true,
            align: 'center'
        }).setOrigin(0.5, 0).setDepth(10);

        // Get class and specialization data with error handling (fixed registry errors)
        const classesData = SafeExecutor.execute(
            () => this.cache.json.get('classes'),
            null,
            'CharacterCreationScene.getClassesData'
        );

        const specializationsData = SafeExecutor.execute(
            () => this.cache.json.get('specializations'),
            null,
            'CharacterCreationScene.getSpecializationsData'
        );

        if (!classesData || !specializationsData) {
            globalErrorHandler.handle(
                new Error('Failed to load classes or specializations data'),
                'CharacterCreationScene.create',
                { classesData: !!classesData, specializationsData: !!specializationsData }
            );
            return;
        }

        // Define party roles and their constraints - Using UI_CONFIG
        const rolePositions = charConfig.ROLE_POSITIONS;
        const roles = [
            { id: 'tank', name: 'Tank', x: width * rolePositions.TANK_X_PERCENT, color: 0x0066ff },
            { id: 'healer', name: 'Healer', x: width * rolePositions.HEALER_X_PERCENT, color: 0x00ff00 },
            { id: 'dps1', name: 'DPS #1', x: width * rolePositions.DPS1_X_PERCENT, color: 0xff6600 },
            { id: 'dps2', name: 'DPS #2', x: width * rolePositions.DPS2_X_PERCENT, color: 0xff6600 },
            { id: 'dps3', name: 'DPS #3', x: width * rolePositions.DPS3_X_PERCENT, color: 0xff6600 }
        ];

        const rolePanelConfig = charConfig.ROLE_PANEL;
        const roleY = getScaledValue(rolePanelConfig.Y, width, 'height');
        const panelWidth = Math.min(rolePanelConfig.MAX_WIDTH, width * rolePanelConfig.WIDTH_PERCENT);
        const panelHeight = getScaledValue(rolePanelConfig.HEIGHT, width, 'height');

        // Create selection panels with entrance animation
        roles.forEach((role, index) => {
            const panel = this.createRolePanel(
                role.id,
                role.name,
                role.x + (width * rolePanelConfig.X_OFFSET_PERCENT),
                roleY,
                panelWidth,
                panelHeight,
                classesData,
                specializationsData
            );

            // Subtle slide-in animation
            if (panel && panel.forEach) {
                // If createRolePanel returned something to animate
            }
        });

        // Create bottom buttons with modern style - Using UI_CONFIG
        const buttonConfig = charConfig.BUTTONS;
        const btnY = height + getScaledValue(buttonConfig.Y_OFFSET, width, 'height');
        const btnWidth = getScaledValue(buttonConfig.WIDTH, width);
        const btnHeight = getScaledValue(buttonConfig.HEIGHT, width, 'height');
        const btnSpacing = getScaledValue(buttonConfig.SPACING, width);

        // Confirm button
        const confirmButton = createModernButton(this, width / 2, btnY, btnWidth, btnHeight, 'CONFIRM PARTY', {
            backgroundColor: 0x2e7d32,
            hoverColor: 0x388e3c,
            borderColor: 0xffd700,
            fontSize: getScaledValue(buttonConfig.CONFIRM_FONT_SIZE, width, 'font'),
            onClick: () => this.confirmParty()
        }).setDepth(20);
        this.uiElements.push(confirmButton);

        // Auto-generate button
        const autoGenButton = createModernButton(this, width / 2 + btnWidth + btnSpacing, btnY, btnWidth - getScaledValue(40, width), btnHeight, 'AUTO-GENERATE', {
            backgroundColor: 0xbf360c,
            hoverColor: 0xd84315,
            borderColor: 0xffd700,
            fontSize: getScaledValue(buttonConfig.OTHER_FONT_SIZE, width, 'font'),
            onClick: () => this.autoGenerateParty(classesData, specializationsData, roles)
        }).setDepth(20);
        this.uiElements.push(autoGenButton);

        // Back button
        const backButton = createModernButton(this, width / 2 - btnWidth - btnSpacing, btnY, btnWidth - getScaledValue(40, width), btnHeight, 'BACK', {
            backgroundColor: 0x455a64,
            hoverColor: 0x546e7a,
            borderColor: 0x90a4ae,
            fontSize: getScaledValue(buttonConfig.OTHER_FONT_SIZE, width, 'font'),
            onClick: () => {
                validateSceneTransition('MainScene', {}, this);
                this.scene.start('MainScene');
            }
        }).setDepth(20);
        this.uiElements.push(backButton);
    }

    /**
     * Create a role selection panel
     */
    createRolePanel(roleId, roleName, x, y, width, height, classesData, specializationsData) {
        // Get UI config for role panel
        const rolePanelConfig = UI_CONFIG.CHARACTER_CREATION.ROLE_PANEL;
        const panelY = y;

        // Create a parent container for the entire role panel
        const roleContainer = this.add.container(x + width / 2, panelY + height / 2);
        roleContainer.setDepth(5);
        this.uiElements.push(roleContainer);

        // Panel background using WoW-style frame - Using UI_CONFIG
        const panel = createWoWFrame(this, 0, 0, width, height, {
            backgroundColor: rolePanelConfig.BACKGROUND_COLOR,
            borderColor: rolePanelConfig.BORDER_COLOR,
            borderWidth: rolePanelConfig.BORDER_WIDTH,
            shadow: true
        });
        roleContainer.add(panel);

        // Header background - Using UI_CONFIG
        const headerY = -height / 2 + getScaledValue(rolePanelConfig.HEADER_Y_OFFSET, width, 'height');
        const headerHeight = getScaledValue(rolePanelConfig.HEADER_HEIGHT, width, 'height');
        const headerBg = this.add.rectangle(0, headerY, width - 6, headerHeight, rolePanelConfig.HEADER_BG_COLOR, rolePanelConfig.HEADER_BG_ALPHA);
        roleContainer.add(headerBg);

        // Role name with shadow - Using UI_CONFIG
        const nameY = -height / 2 + getScaledValue(rolePanelConfig.NAME_Y_OFFSET, width, 'height');
        const nameText = createModernText(this, 0, nameY, roleName.toUpperCase(), {
            fontSize: getScaledValue(rolePanelConfig.NAME_FONT_SIZE, width, 'font'),
            color: rolePanelConfig.NAME_COLOR,
            shadow: true
        }).setOrigin(0.5, 0);
        roleContainer.add(nameText);

        // Get eligible classes for this role
        const eligibleClasses = this.getEligibleClassesForRole(roleId, classesData);

        // Class selection list
        let classRelY = -height / 2 + 50;
        const classButtons = [];
        eligibleClasses.forEach((classId, index) => {
            const className = classesData[classId].name;
            const classColor = getClassColor(classId);

            const classButton = this.createSmallButton(
                -width / 2 + 10,
                classRelY,
                width - 20,
                className,
                () => {
                    this.selectedClasses[roleId] = classId;
                    this.selectedSpecs[roleId] = null;

                    classButtons.forEach(btn => {
                        const bg = btn.background;
                        const defaultColor = btn._defaultColor || 0x1a3a52;
                        bg.setFillStyle(defaultColor);
                        bg.setAlpha(0.6);
                    });

                    if (classButton.background) {
                        classButton.background.setFillStyle(classColor);
                        classButton.background.setAlpha(1.0);
                    }

                    const specSectionRelY = height / 2 - 120;
                    this.updateSpecDropdown(roleId, 0, specSectionRelY, width, classesData, specializationsData, roleContainer);

                    Logger.info('CharacterCreationScene', `Selected class ${classId} for role ${roleId}`);
                },
                {
                    backgroundColor: classColor,
                    isClassButton: true,
                    isSelected: this.selectedClasses[roleId] === classId,
                    relativeToContainer: true
                }
            );

            classButton.selectedClass = classId;
            classButtons.push(classButton);
            roleContainer.add(classButton);
            classRelY += 32;
        });

        // Spec selection label
        const specLabelRelY = height / 2 - 150;
        const specLabel = createModernText(this, 0, specLabelRelY, 'SPECIALIZATION', {
            fontSize: 12,
            color: '#aaaaaa',
            shadow: true
        }).setOrigin(0.5, 0);
        roleContainer.add(specLabel);

        // Spec divider
        const divider = this.add.rectangle(0, specLabelRelY + 18, width - 30, 1, 0x444444);
        roleContainer.add(divider);

        // Spec dropdown area
        const specContainerRelY = specLabelRelY + 25;
        this.updateSpecDropdown(roleId, 0, specContainerRelY, width, classesData, specializationsData, roleContainer);

        // Entrance animation for the entire role container
        roleContainer.setAlpha(0);
        roleContainer.y += 30;
        this.tweens.add({
            targets: roleContainer,
            alpha: 1,
            y: panelY + height / 2,
            duration: 600,
            delay: 100 * (roleId.includes('dps') ? parseInt(roleId.replace('dps', '')) + 2 : (roleId === 'tank' ? 0 : 1)),
            ease: 'Back.easeOut'
        });

        return roleContainer;
    }

    /**
     * Update specialization dropdown for a specific role
     * @param {string} roleId - Role identifier
     * @param {number} x - X position (relative to container)
     * @param {number} y - Y position (relative to container)
     * @param {number} panelWidth - Panel width
     * @param {Object} classesData - Classes configuration
     * @param {Object} specializationsData - Specializations configuration
     * @param {Phaser.GameObjects.Container} parentContainer - Parent container to add buttons to
     */
    updateSpecDropdown(roleId, x, y, panelWidth, classesData, specializationsData, parentContainer) {
        // Remove old spec buttons from the specific parent container
        if (parentContainer) {
            parentContainer.list.forEach(el => {
                if (el && el._specRole === roleId) {
                    el.destroy();
                }
            });
        }

        const selectedClass = this.selectedClasses[roleId];
        if (!selectedClass || !classesData[selectedClass]) {
            return;
        }

        const classData = classesData[selectedClass];
        const availableSpecs = classData.availableSpecs || [];

        let specRelY = y;
        const specButtons = [];

        availableSpecs.forEach(specId => {
            const specKey = `${selectedClass}_${specId}`;
            const specData = specializationsData[specKey];

            if (specData) {
                const specName = specData.name;
                const specButton = this.createSmallButton(
                    x - panelWidth / 2 + 10,
                    specRelY,
                    panelWidth - 20,
                    specName,
                    () => {
                        this.selectedSpecs[roleId] = specId;

                        specButtons.forEach(btn => {
                            btn.background.setFillStyle(0x1a3a52);
                            btn._isSelected = false;
                        });
                        specButton.background.setFillStyle(0x4080ff);
                        specButton._isSelected = true;

                        Logger.info('CharacterCreationScene', `Selected spec ${specId} for role ${roleId}`);
                    },
                    {
                        backgroundColor: 0x1a3a52,
                        isSelected: this.selectedSpecs[roleId] === specId,
                        relativeToContainer: true
                    }
                );

                specButton._specRole = roleId;
                specButtons.push(specButton);
                if (parentContainer) {
                    parentContainer.add(specButton);
                } else {
                    this.uiElements.push(specButton); // Fallback
                }
                specRelY += 28;
            }
        });
    }

    /**
     * Get eligible classes for a role
     */
    /**
     * Get classes eligible for a specific role
     * @param {string} roleId - The role identifier (tank, dps, healer)
     * @param {Object} classesData - Classes configuration data
     * @returns {Array<string>} Array of eligible class IDs
     */
    getEligibleClassesForRole(roleId, classesData) {
        // Define which classes can fill which roles
        const roleClassMap = {
            tank: ['paladin', 'warrior', 'druid'],
            healer: ['priest', 'paladin', 'shaman', 'druid'],
            dps1: ['rogue', 'mage', 'warlock', 'hunter', 'warrior', 'paladin'],
            dps2: ['rogue', 'mage', 'warlock', 'hunter', 'warrior', 'paladin'],
            dps3: ['rogue', 'mage', 'warlock', 'hunter', 'warrior', 'paladin']
        };

        const baseRole = roleId.replace(/\d+/, ''); // Remove number from dps1, dps2, dps3
        const eligibleClasses = roleClassMap[baseRole] || Object.keys(classesData);

        return eligibleClasses.filter(classId => classesData[classId]);
    }

    /**
     * Create a small button
     */
    createSmallButton(x, y, width, text, callback, options = {}) {
        const {
            backgroundColor = 0x1a3a52,
            isClassButton = false,
            isSelected = false
        } = options;

        const container = this.add.container(x + width / 2, y + 12);

        // Use class color or default blue
        const finalColor = isClassButton ? backgroundColor : 0x1a3a52;
        const bgAlpha = isSelected ? 1.0 : 0.6;

        // Background rectangle
        const bg = this.add.rectangle(0, 0, width, 26, finalColor, bgAlpha).setDepth(10);
        bg.setInteractive({ useHandCursor: true });
        container.add(bg);

        // Border graphics
        const border = this.add.graphics().setDepth(11);
        border.lineStyle(1, 0x4080ff, 0.8);
        border.strokeRect(-width / 2, -13, width, 26);
        container.add(border);

        // Text
        const buttonText = createModernText(this, 0, 0, text, {
            fontSize: 13,
            color: '#ffffff',
            shadow: true
        }).setOrigin(0.5, 0.5).setDepth(12);
        container.add(buttonText);

        // Interactions
        bg.on('pointerover', () => {
            bg.setAlpha(1.0);
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 100,
                ease: 'Power1'
            });
        });

        bg.on('pointerout', () => {
            if (!container._isSelected && !isSelected) {
                bg.setAlpha(0.6);
            }
            this.tweens.add({
                targets: container,
                scale: 1.0,
                duration: 100,
                ease: 'Power1'
            });
        });

        bg.on('pointerdown', () => {
            if (callback) SafeExecutor.execute(callback, null, 'CharacterCreation.smallButtonCallback');

            // Pulse effect
            this.tweens.add({
                targets: container,
                scale: 0.95,
                duration: 50,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        });

        container.background = bg;
        container._defaultColor = finalColor;
        container._isSelected = isSelected;

        return container;
    }

    /**
     * Create a larger button
     */
    createButton(x, y, text, callback, color = '#4080ff') {
        const width = this.scale.width;
        const height = this.scale.height;
        const buttonWidth = getScaledValue(SCENE_CONFIG.BUTTONS.DEFAULT_WIDTH || 200, width);
        const buttonHeight = getScaledValue(SCENE_CONFIG.BUTTONS.DEFAULT_HEIGHT || 40, height, 'height');
        const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, color);
        button.setInteractive();
        button.setStrokeStyle(getScaledValue(2, height, 'height'), 0xffffff);

        const fontSize = getScaledValue(SCENE_CONFIG.FONT_SIZES.BODY_SMALL || 14, height, 'height');
        const buttonText = this.add.text(x, y, text, {
            font: `bold ${fontSize}px Arial`,
            fill: '#ffffff'
        }).setOrigin(0.5, 0.5);

        button.on('pointerover', () => {
            button.setScale(1.05);
            buttonText.setScale(1.05);
        });

        button.on('pointerout', () => {
            button.setScale(1);
            buttonText.setScale(1);
        });

        button.on('pointerdown', () => {
            callback();
        });

        return button;
    }

    /**
     * Auto-generate a balanced party composition
     */
    autoGenerateParty(classesData, specializationsData, roles) {
        // Mapping of roles to their best class options
        const roleClassMapping = {
            tank: ['paladin', 'warrior', 'druid'],
            healer: ['priest', 'shaman', 'druid'],
            dps: ['mage', 'rogue', 'warlock', 'hunter', 'shaman', 'warrior']
        };

        // Helper to get random element
        const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // Helper to get role-appropriate specialization for a class
        const getRoleSpecForClass = (classId, classData, role, specializationsData) => {
            const availableSpecs = classData.availableSpecs || [];
            if (availableSpecs.length === 0) return null;

            // Filter specs by their role field in spec data
            const roleType = role.id === 'tank' ? 'tank' : (role.id === 'healer' ? 'healer' : 'dps');
            const validSpecs = availableSpecs.filter(spec => {
                const specKey = `${classId}_${spec}`;
                const specData = specializationsData[specKey];
                return specData && specData.role === roleType;
            });

            if (validSpecs.length > 0) {
                return getRandomElement(validSpecs);
            }

            // Fallback to first available spec if no role match
            return availableSpecs[0];
        };

        // Generate selections for each role
        roles.forEach(role => {
            let eligibleClasses = [];

            if (role.id === 'tank') {
                eligibleClasses = roleClassMapping.tank.filter(c => classesData[c]);
            } else if (role.id === 'healer') {
                eligibleClasses = roleClassMapping.healer.filter(c => classesData[c]);
            } else {
                // DPS roles
                eligibleClasses = roleClassMapping.dps.filter(c => classesData[c]);
            }

            if (eligibleClasses.length === 0) {
                Logger.warn('CharacterCreationScene', `No eligible classes for role ${role.id}`);
                return;
            }

            // Pick a random class for this role
            const selectedClass = getRandomElement(eligibleClasses);
            const classData = classesData[selectedClass];

            // Pick a role-appropriate spec
            const selectedSpec = getRoleSpecForClass(selectedClass, classData, role, specializationsData);

            if (selectedSpec) {
                this.selectedClasses[role.id] = selectedClass;
                this.selectedSpecs[role.id] = selectedSpec;
                Logger.info('CharacterCreationScene', `Auto-generated: ${role.id} = ${selectedClass} (${selectedSpec})`);
            }
        });

        // Rebuild UI to show new selections
        this.rebuildCharacterCreationUI();
    }

    /**
     * Rebuild the character creation UI to show current selections
     */
    rebuildCharacterCreationUI() {
        // Destroy all current UI elements
        this.uiElements.forEach(el => {
            if (el && el.destroy) {
                el.destroy();
            }
        });
        this.uiElements = [];

        // Restart the scene to rebuild everything
        this.scene.restart();
    }

    /**
     * Confirm party composition and start game
     */
    confirmParty() {
        // Validate selections
        if (!this.selectedClasses.tank || !this.selectedSpecs.tank) {
            alert('Please select Tank class and specialization');
            return;
        }
        if (!this.selectedClasses.healer || !this.selectedSpecs.healer) {
            alert('Please select Healer class and specialization');
            return;
        }

        // Check DPS roles
        const dpsRoles = ['dps1', 'dps2', 'dps3'];
        for (const dpsRole of dpsRoles) {
            if (!this.selectedClasses[dpsRole] || !this.selectedSpecs[dpsRole]) {
                alert('Please select all DPS class and specializations');
                return;
            }
        }

        // Create party as save-data (so GameScene can instantiate its own PartyManager)
        const partyManager = new PartyManager(this);

        // Create heroes for each role
        const roleOrder = ['tank', 'healer', 'dps1', 'dps2', 'dps3'];
        roleOrder.forEach((roleId, index) => {
            const classId = this.selectedClasses[roleId];
            const specId = this.selectedSpecs[roleId];
            const hero = this.heroFactory.createHero(classId, specId, 1);
            partyManager.addHero(hero);
        });

        // Initialize hero stats properly
        if (this.statCalculator) {
            partyManager.initializeHeroStats(this.statCalculator);
        }

        // Store party data using standardized party state manager (FIXED: inconsistent state management)
        const partyStateManager = getPartyStateManager(this);
        partyStateManager.partyManager = partyManager; // Set the created party manager
        partyStateManager.isInitialized = true;
        partyStateManager.savePartyState(); // Save using standardized method

        Logger.info('CharacterCreationScene', `Party created with ${partyManager.getSize()} heroes at level ${partyManager.getPartyLevel()}`);

        // Start game (FIXED: Add input validation for scene transitions)
        validateSceneTransition('GameScene', {}, this);
        this.scene.start('GameScene');
    }

    /**
     * Shutdown event - clean up
     */
    shutdown() {
        // Use resource manager to clean up all tracked resources and event listeners (fixes memory leaks)
        SafeExecutor.execute(() => {
            if (this.resourceManager) {
                this.resourceManager.cleanup();
            }
        }, null, 'CharacterCreationScene.shutdown.resourceManager');

        // Clean up UI elements safely (removed fragile destroy() overrides)
        SafeExecutor.execute(() => {
            this.uiElements.forEach(el => {
                if (el && !el.destroyed) {
                    try {
                        // Remove from scene display list first
                        if (el.scene?.children) {
                            el.scene.children.remove(el);
                        }

                        // For problematic elements, fix data property safely
                        if (el.type === 'Rectangle' && el.data && typeof el.data.destroy !== 'function') {
                            el.data = null;
                        }

                        // Destroy safely
                        if (el.destroy && typeof el.destroy === 'function') {
                            el.destroy(true);
                        }
                    } catch (error) {
                        globalErrorHandler.handle(error, 'CharacterCreationScene.shutdown.uiElement', { type: el.type });
                    }
                }
            });
            this.uiElements = [];
        }, null, 'CharacterCreationScene.shutdown.uiElements');

        // Clean up remaining children safely (standardized error handling)
        SafeExecutor.execute(() => {
            const children = [...(this.children?.list || [])];
            children.forEach(child => {
                try {
                    if (child && !child.destroyed) {
                        if (child.type === 'Rectangle' && child.data && typeof child.data.destroy !== 'function') {
                            child.data = null;
                        }
                        if (child.destroy && typeof child.destroy === 'function') {
                            child.destroy(true);
                        }
                    }
                } catch (error) {
                    globalErrorHandler.handle(error, 'CharacterCreationScene.shutdown.child', { type: child?.type });
                }
            });
        }, null, 'CharacterCreationScene.shutdown.children');

        // Clean up UI builder resources
        SafeExecutor.execute(() => {
            if (this.uiBuilder) {
                // UI builder cleanup is handled by SceneUIFactory when scene is destroyed
            }
        }, null, 'CharacterCreationScene.shutdown.uiBuilder');

        // Clear references
        SafeExecutor.execute(() => {
            this.heroFactory = null;
            this.selectedClasses = {};
            this.selectedSpecs = {};
        }, null, 'CharacterCreationScene.shutdown.references');
    }
}

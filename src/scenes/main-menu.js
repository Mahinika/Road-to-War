import Phaser from 'phaser';
import { saveManager } from '../utils/save-manager.js';

// New imports for fixing issues
import { SceneResourceManager } from '../utils/scene-event-cleanup.js';
import { SCENE_CONFIG } from '../config/scene-config.js';
import { getUIBuilder } from '../utils/ui-builder.js';
import { globalErrorHandler, SafeExecutor } from '../utils/error-handling.js';
import { validateSceneTransition } from '../utils/input-validation.js';
import { UI_CONFIG, getScaledValue } from '../config/ui-config.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });

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
        this.children.removeAll();
        
        // Get actual viewport size - try multiple methods for reliability
        let width = this.scale.gameSize?.width || this.cameras.main.width || window.innerWidth || 1024;
        let height = this.scale.gameSize?.height || this.cameras.main.height || window.innerHeight || 768;
        
        
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.setSize(width, height);
        this.cameras.main.centerOn(width / 2, height / 2);
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);
        
        this.cameras.main.setBounds(0, 0, width, height);
        
        this.children.setAll('setScrollFactor', 0);

        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // FIXED: Add texture loading failure handling
        if (this.textures.exists('menu-background')) {
            const bg = this.add.image(width / 2, height / 2, 'menu-background');
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale);
            bg.setDepth(0);
        }

        // Calculate desktop-optimized font sizes based on viewport - Using UI_CONFIG
        const menuConfig = UI_CONFIG.MAIN_MENU;
        const baseWidth = menuConfig.BASE_WIDTH;
        const baseHeight = menuConfig.BASE_HEIGHT;
        const scaleFactor = Math.min(width / baseWidth, height / baseHeight);
        
        // Title - Using UI_CONFIG
        const titleConfig = menuConfig.TITLE;
        const titleSize = Math.max(titleConfig.MIN_SIZE, Math.min(titleConfig.MAX_SIZE, titleConfig.BASE_SIZE * scaleFactor));
        const titleX = width * titleConfig.X_PERCENT;
        const titleY = height * titleConfig.Y_PERCENT;
        const titleStroke = Math.max(titleConfig.STROKE_MIN, titleConfig.STROKE_BASE * scaleFactor);
        
        const title = this.add.text(titleX, titleY, 'ROAD OF WAR', {
            font: `bold ${titleSize}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: titleStroke
        });
        title.setOrigin(0, 0.5);
        title.setDepth(10);
        title.setShadow(2, 2, '#000000', 0, true, true);

        // Subtitle - Using UI_CONFIG
        const subtitleConfig = menuConfig.SUBTITLE;
        const subtitleSize = Math.max(subtitleConfig.MIN_SIZE, Math.min(subtitleConfig.MAX_SIZE, subtitleConfig.BASE_SIZE * scaleFactor));
        const subtitleY = titleY + (subtitleConfig.Y_OFFSET_BASE * scaleFactor);
        const subtitleStroke = Math.max(subtitleConfig.STROKE_MIN, subtitleConfig.STROKE_BASE * scaleFactor);
        
        const subtitle = this.add.text(titleX, subtitleY, 'Incremental Prestige RPG', {
            font: `${subtitleSize}px Arial`,
            fill: '#e0e0e0',
            stroke: '#000000',
            strokeThickness: subtitleStroke
        });
        subtitle.setOrigin(0, 0.5);
        subtitle.setDepth(10);
        subtitle.setShadow(1, 1, '#000000', 0, true, true);

        // Menu buttons - positioned on right side with smaller spacing - Using UI_CONFIG
        const buttonConfig = menuConfig.BUTTONS;
        const buttonX = width * buttonConfig.X_PERCENT;
        const numButtons = 9;
        const topMargin = height * buttonConfig.TOP_MARGIN_PERCENT;
        const bottomMargin = height * buttonConfig.BOTTOM_MARGIN_PERCENT;
        const availableHeight = height - topMargin - bottomMargin;
        const buttonSpacing = availableHeight / (numButtons - 1);

        const startButton = this.createButton(buttonX, topMargin + buttonSpacing * 0, 'Start Game', () => {
            // FIXED: Add input validation for scene transitions
            validateSceneTransition('CharacterCreationScene', {}, this);
            this.scene.start('CharacterCreationScene');
        });

        const optionsButton = this.createButton(buttonX, topMargin + buttonSpacing * 1, 'Options', () => {
            this.scene.start('OptionsScene');
        });

        const creditsButton = this.createButton(buttonX, topMargin + buttonSpacing * 2, 'Credits', () => {
            this.scene.start('CreditsScene');
        });

        const saveButton = this.createButton(buttonX, topMargin + buttonSpacing * 3, 'Save Game', () => {
            this.registry.set('saveLoadMode', 'save');
            this.scene.start('SaveLoadScene');
        });

        const loadButton = this.createButton(buttonX, topMargin + buttonSpacing * 4, 'Load Game', () => {
            this.registry.set('saveLoadMode', 'load');
            this.scene.start('SaveLoadScene');
        });

        const statisticsButton = this.createButton(buttonX, topMargin + buttonSpacing * 5, 'Statistics', async () => {
            // Load statistics from save and pass to scene with proper error handling (fixed async loading issues)
            SafeExecutor.executeAsync(async () => {
                const recent = await saveManager.getMostRecentSlot();
                if (recent) {
                    const saveData = await saveManager.loadGame(recent);
                    if (saveData && saveData.statistics) {
                        this.registry.set('statistics', saveData.statistics);
                    }
                }
                // FIXED: Add input validation for scene transitions
                validateSceneTransition('StatisticsMenuScene', {}, this);
                this.scene.start('StatisticsMenuScene');
            }, () => {
                // Fallback on error - just start the scene
                validateSceneTransition('StatisticsMenuScene', {}, this);
                this.scene.start('StatisticsMenuScene');
            }, 'MainScene.statisticsButton');
        });

        const achievementsButton = this.createButton(buttonX, topMargin + buttonSpacing * 6, 'Achievements', async () => {
            // FIXED: Add proper async error handling for achievements loading
            await SafeExecutor.executeAsync(async () => {
                // Load achievements from save and pass to scene
                const recent = await saveManager.getMostRecentSlot();
                if (recent) {
                    const saveData = await saveManager.loadGame(recent);
                    // FIXED: Add resource loading failure handling
                    const achievementsData = this.cache.json.get('achievements') || {};
                    if (achievementsData) {
                        this.registry.set('achievements', achievementsData);
                    }
                    if (saveData && saveData.achievements) {
                        this.registry.set('achievementsState', saveData.achievements);
                    }
                }
                // FIXED: Add input validation for scene transitions
                validateSceneTransition('AchievementsMenuScene', {}, this);
                this.scene.start('AchievementsMenuScene');
            }, null, 'MainMenu.achievementsButton');
        });

        const prestigeButton = this.createButton(buttonX, topMargin + buttonSpacing * 7, 'Prestige', async () => {
            // FIXED: Add proper async error handling for prestige loading
            await SafeExecutor.executeAsync(async () => {
                // Load prestige data from save and pass to scene
                const recent = await saveManager.getMostRecentSlot();
                if (recent) {
                    const saveData = await saveManager.loadGame(recent);
                    if (saveData && saveData.prestige) {
                        this.registry.set('prestige', saveData.prestige);
                    }
                }
                this.scene.start('PrestigeMenuScene');
            }, null, 'MainMenu.prestigeButton');
        }); // Button color will be updated by checkPrestigeAvailability()

        const quitButton = this.createButton(buttonX, topMargin + buttonSpacing * 8, 'Quit', () => {
            // In browser, this will just show a message
            // In desktop app, this would close the application
            if (confirm('Are you sure you want to quit?')) {
                window.close();
            }
        });

        // Version info - Using UI_CONFIG
        const versionConfig = menuConfig.VERSION;
        const versionX = width + getScaledValue(versionConfig.X_OFFSET, width);
        const versionY = height + getScaledValue(versionConfig.Y_OFFSET, width, 'height');
        const versionFontSize = getScaledValue(versionConfig.FONT_SIZE, width, 'font');
        
        const version = this.add.text(versionX, versionY, 'v1.0.0', {
            font: `${versionFontSize}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1
        });
        version.setOrigin(1, 1);
        version.setDepth(10);

        // Store references for cleanup
        this.menuElements = [title, subtitle, startButton, optionsButton, creditsButton, saveButton, loadButton, statisticsButton, achievementsButton, prestigeButton, quitButton, version];

        // Check prestige availability asynchronously
        this.checkPrestigeAvailability();
    }

    /**
     * Check if prestige is available and update button accordingly
     */
    async checkPrestigeAvailability() {
        // FIXED: Add proper async error handling
        return SafeExecutor.executeAsync(async () => {
            let prestigeAvailable = false;
            let prestigePoints = 0;

            const recent = await saveManager.getMostRecentSlot();
            if (recent) {
                const saveData = await saveManager.loadGame(recent);
                if (saveData) {
                    // Check if player reached max miles
                    // FIXED: Add resource loading failure handling
                    const worldConfig = this.cache.json.get('worldConfig') || { roadToWar: { maxMiles: 100 } };
                    const maxMiles = worldConfig?.roadToWar?.maxMiles || 100;
                    const playerMaxMile = saveData.world?.maxMileReached || 0;

                    if (playerMaxMile >= maxMiles) {
                        prestigeAvailable = true;

                        // Calculate potential prestige points
                        const { PrestigeManager } = await import('../managers/prestige-manager.js');
                        const tempPrestigeManager = new PrestigeManager(this);
                        tempPrestigeManager.loadPrestigeConfig();
                        if (saveData.prestige) {
                            tempPrestigeManager.loadPrestige(saveData.prestige);
                        }
                        prestigePoints = tempPrestigeManager.calculatePrestigePoints(saveData);
                    }
                }
            }

            // Update prestige button text and color if it exists
            if (this.children) {
                const prestigeButton = this.children.list.find(child =>
                    child.type === 'Container' &&
                    child.list &&
                    child.list.some(item => item.type === 'Text' && item.text && item.text.includes('Prestige'))
                );

                if (prestigeButton) {
                    // Find the text object in the button container
                    const textObject = prestigeButton.list.find(item => item.type === 'Text');
                    if (textObject) {
                        const buttonText = prestigeAvailable ? `🎉 Prestige (${prestigePoints} pts)` : 'Prestige';
                        textObject.setText(buttonText);

                        // Update button color if available
                        const bgRect = prestigeButton.list.find(item => item.type === 'Rectangle' && item.fillColor);
                        if (bgRect && prestigeAvailable) {
                            bgRect.setFillStyle(0x00aa00); // Green highlight
                        }
                    }
                }
            }
        }, null, 'MainMenu.checkPrestigeAvailability');
    }

    /**
     * Create a desktop-optimized button with proper scaling
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Button text
     * @param {Function} callback - Click callback function
     * @returns {Phaser.GameObjects.Container} Button container
     */
    createButton(x, y, text, callback) {
        // Calculate desktop-optimized button size - Using UI_CONFIG
        const buttonConfig = UI_CONFIG.MAIN_MENU.BUTTONS;
        const baseWidth = UI_CONFIG.MAIN_MENU.BASE_WIDTH;
        const baseHeight = UI_CONFIG.MAIN_MENU.BASE_HEIGHT;
        const scaleFactor = Math.min(this.scale.gameSize.width / baseWidth, this.scale.gameSize.height / baseHeight);
        
        // Create button background with pixel art style - Using UI_CONFIG
        const bgWidth = buttonConfig.BASE_WIDTH * scaleFactor;
        const bgHeight = buttonConfig.BASE_HEIGHT * scaleFactor;
        const bgGraphics = this.add.graphics();
        bgGraphics.fillStyle(buttonConfig.BACKGROUND_COLOR, buttonConfig.BACKGROUND_ALPHA);
        bgGraphics.fillRoundedRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, buttonConfig.BORDER_RADIUS);
        bgGraphics.lineStyle(buttonConfig.BORDER_WIDTH, buttonConfig.BORDER_COLOR, 1);
        bgGraphics.strokeRoundedRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, buttonConfig.BORDER_RADIUS);
        bgGraphics.setDepth(9);
        
        // Create button text with desktop-optimized font size - Using UI_CONFIG
        const buttonFontSize = Math.max(buttonConfig.MIN_FONT_SIZE, Math.min(buttonConfig.MAX_FONT_SIZE, buttonConfig.BASE_FONT_SIZE * scaleFactor));
        const buttonStroke = Math.max(buttonConfig.STROKE_MIN, buttonConfig.STROKE_BASE * scaleFactor);
        const button = this.add.text(x, y, text, {
            font: `bold ${buttonFontSize}px Arial`,
            fill: '#e0e0e0',
            stroke: '#000000',
            strokeThickness: buttonStroke
        });
        
        button.setOrigin(0.5, 0.5);
        button.setInteractive({ useHandCursor: true });
        button.setDepth(10);

        // Store graphics reference for hover effects
        button.bgGraphics = bgGraphics;

        // Button hover effects - orange/yellow glow matching the burning castle - Using UI_CONFIG
        button.on('pointerover', () => {
            button.setStyle({ fill: '#ffaa00', stroke: '#000000', strokeThickness: 3 });
            bgGraphics.clear();
            bgGraphics.fillStyle(buttonConfig.HOVER_BACKGROUND_COLOR, buttonConfig.HOVER_BACKGROUND_ALPHA);
            bgGraphics.fillRoundedRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, buttonConfig.BORDER_RADIUS);
            bgGraphics.lineStyle(buttonConfig.HOVER_BORDER_WIDTH, buttonConfig.HOVER_BORDER_COLOR, 1);
            bgGraphics.strokeRoundedRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, buttonConfig.BORDER_RADIUS);
        });

        button.on('pointerout', () => {
            button.setStyle({ fill: '#e0e0e0', stroke: '#000000', strokeThickness: buttonStroke });
            bgGraphics.clear();
            bgGraphics.fillStyle(buttonConfig.BACKGROUND_COLOR, buttonConfig.BACKGROUND_ALPHA);
            bgGraphics.fillRoundedRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, buttonConfig.BORDER_RADIUS);
            bgGraphics.lineStyle(buttonConfig.BORDER_WIDTH, buttonConfig.BORDER_COLOR, 1);
            bgGraphics.strokeRoundedRect(x - bgWidth / 2, y - bgHeight / 2, bgWidth, bgHeight, buttonConfig.BORDER_RADIUS);
        });

        button.on('pointerdown', callback);

        return button;
    }

    /**
     * Shutdown event - clean up all resources (fixed missing element cleanup)
     */
    shutdown() {
        // Use resource manager to clean up all tracked resources and event listeners (fixes memory leaks)
        SafeExecutor.execute(() => {
            if (this.resourceManager) {
                this.resourceManager.cleanup();
            }
        }, null, 'MainScene.shutdown.resourceManager');

        // Clean up UI builder resources
        SafeExecutor.execute(() => {
            if (this.uiBuilder) {
                // UI builder cleanup is handled by SceneUIFactory when scene is destroyed
            }
        }, null, 'MainScene.shutdown.uiBuilder');
    }
}

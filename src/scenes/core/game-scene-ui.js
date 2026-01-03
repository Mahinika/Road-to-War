/**
 * GameScene UI Module
 * Contains UI creation, management, and rendering logic
 * Extracted from GameScene to separate UI concerns from game logic
 */

import Phaser from 'phaser';
import { SafeExecutor, globalErrorHandler } from '../../utils/error-handling.js';
import { SCENE_CONFIG } from '../../config/scene-config.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';
import { 
    getHUDConfig, 
    getActionBarConfig,
    getCombatLogConfig,
    getMinimapConfig,
    isElementVisible,
    getUIDepth,
    getAccessibleFontSize
} from '../../utils/ui-config-integration.js';
import { 
    UI_THEME, 
    createWoWFrame, 
    createWoWBar, 
    createWoWButton, 
    getClassColor
} from '../../utils/ui-system.js';
import { PortraitGenerator } from '../../utils/portrait-generator.js';

export class GameSceneUI {
    constructor(scene) {
        this.scene = scene;

        // UI state
        this.uiElements = new Map();
        this.uiPanels = {
            equipment: false,
            inventory: false,
            shop: false
        };

        // Portrait generator for character portraits
        this.portraitGenerator = new PortraitGenerator(scene);

        // UI layout references
        this.uiLayout = null;
        this.actionBarButtons = null;
        this.playerFrame = null;
        this.targetFrame = null;
        this.combatLog = null;
        this.mileDisplay = null;
        this.goldDisplay = null;
        this.itemCountDisplay = null;
        this.inventoryDisplay = null;
        this.manaDisplay = null;
        this.partyOverviewButton = null;
        this.combatStatusDisplay = null;
        this.tacticsButton = null;
        this.consumablesButton = null;
        this.regenButton = null;
        this.logButton = null;
        
        // Combat UI compatibility layer (bridges to combatModule)
        // This allows combat-handler to access combat UI through uiManager
        this.combatUI = null; // Will be set after combatModule is initialized
        
        // Update timers
        this.updateInterval = null;
        this.lastUpdateTime = 0;
    }

    /**
     * Initialize UI layout and elements
     */
    initializeUI() {
        try {
            this.createWoWStyleUI();
            this.setupKeyboardShortcuts();
            this.createPerformanceMonitor();
            this.createProgressionPanel();
            this.startUIUpdateLoop();
            this.setupEquipmentChangeListener();
        } catch (error) {
            globalErrorHandler.handle(error, 'GameSceneUI.initializeUI');
        }
    }

    /**
     * Set up listener for equipment changes to refresh portraits
     */
    setupEquipmentChangeListener() {
        // Listen for equipment changes to refresh portraits
        this.scene.events.on('item.equipment.changed', () => {
            SafeExecutor.execute(() => {
                // Refresh portraits when equipment changes
                this.refreshPortraits();
            }, null, 'GameSceneUI.equipmentChange');
        });
    }

    /**
     * Start UI update loop for dynamic elements
     */
    startUIUpdateLoop() {
        // Update UI elements every 100ms for smooth animations
        this.updateInterval = this.scene.time.addEvent({
            delay: 100,
            callback: () => this.updateUI(),
            loop: true
        });
    }

    /**
     * Update dynamic UI elements (bars, status effects, etc.)
     */
    updateUI() {
        const currentTime = this.scene.time.now;
        
        // Throttle updates to every 100ms
        if (currentTime - this.lastUpdateTime < 100) return;
        this.lastUpdateTime = currentTime;

        // Update party frames
        this.updatePartyFrames();
        
        // Update player frame
        this.updatePlayerFrame();
        
        // Update HUD displays
        this.updateHUD();
    }

    /**
     * Update party frames with current hero data
     */
    updatePartyFrames() {
        if (!this.uiLayout?.party) return;

        this.uiLayout.party.forEach((frameData, index) => {
            const hero = this.scene.partyManager?.getHeroByIndex(index);
            if (!hero || !frameData) return;

            // Update portrait if hero exists and portrait sprite exists - using config
            if (frameData.portrait && hero) {
                const portraitSize = getScaledValue(UI_CONFIG.PARTY_FRAMES.PORTRAIT_SIZE, this.scene.scale.width);
                const portraitKey = this.portraitGenerator.getPortraitKey(hero.id, portraitSize);
                
                // Check if portrait needs regeneration (equipment might have changed)
                if (!this.scene.textures.exists(portraitKey) && frameData.portrait.texture) {
                    // Regenerate portrait
                    const newPortraitKey = this.portraitGenerator.generatePortrait(hero, portraitSize, portraitKey);
                    if (this.scene.textures.exists(newPortraitKey)) {
                        frameData.portrait.setTexture(newPortraitKey);
                    }
                }
            }

            // Update name and level
            if (frameData.nameText) {
                frameData.nameText.setText(hero.name || `Party Member ${index + 1}`);
            }
            if (frameData.levelText) {
                frameData.levelText.setText(`Lv${hero.level || 1}`);
            }

            // Update health bar - optimized with stored dimensions and smooth animation
            if (frameData.healthBar) {
                const currentHealth = hero.currentStats?.health || hero.baseStats?.health || 100;
                const maxHealth = hero.currentStats?.maxHealth || hero.baseStats?.maxHealth || 100;
                const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
                
                if (frameData.healthBar.fill) {
                    const barWidth = frameData.barWidth || frameData.healthBar.width || 136;
                    const targetWidth = barWidth * healthPercent;
                    
                    // Smooth animation for bar updates
                    this.scene.tweens.add({
                        targets: frameData.healthBar.fill,
                        width: targetWidth,
                        duration: 300,
                        ease: 'Power2'
                    });
                }
                
                // Update health text
                if (frameData.healthText) {
                    frameData.healthText.setText(`${Math.floor(currentHealth)}/${Math.floor(maxHealth)}`);
                    
                    // Color coding for low health
                    if (healthPercent < 0.3) {
                        frameData.healthText.setStyle({ fill: '#ff0000' }); // Red for low health
                    } else if (healthPercent < 0.6) {
                        frameData.healthText.setStyle({ fill: '#ffaa00' }); // Orange for medium health
                    } else {
                        frameData.healthText.setStyle({ fill: '#ffffff' }); // White for good health
                    }
                }
                
                // Pulse effect for critical health - using config
                const criticalThreshold = UI_CONFIG.PARTY_FRAMES.CRITICAL_HEALTH_THRESHOLD;
                if (healthPercent < criticalThreshold && frameData.frame) {
                    if (!frameData.lowHealthPulse) {
                        const pulseConfig = UI_CONFIG.PARTY_FRAMES;
                        frameData.lowHealthPulse = this.scene.tweens.add({
                            targets: frameData.frameGlow,
                            alpha: { from: pulseConfig.PULSE_ALPHA_MIN, to: pulseConfig.PULSE_ALPHA_MAX },
                            duration: pulseConfig.PULSE_DURATION,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                } else if (frameData.lowHealthPulse) {
                    frameData.lowHealthPulse.stop();
                    frameData.lowHealthPulse = null;
                    frameData.frameGlow.setAlpha(UI_CONFIG.PARTY_FRAMES.FRAME_GLOW_ALPHA);
                }
            }

            // Update mana/resource bar - optimized with stored dimensions and smooth animation
            if (frameData.manaBar) {
                const currentMana = hero.currentStats?.mana || hero.baseStats?.mana || hero.currentResource || 100;
                const maxMana = hero.currentStats?.maxMana || hero.baseStats?.maxMana || hero.maxResource || 100;
                const manaPercent = Math.max(0, Math.min(1, currentMana / maxMana));
                
                if (frameData.manaBar.fill) {
                    const barWidth = frameData.barWidth || frameData.manaBar.width || 136;
                    const targetWidth = barWidth * manaPercent;
                    
                    // Smooth animation for bar updates
                    this.scene.tweens.add({
                        targets: frameData.manaBar.fill,
                        width: targetWidth,
                        duration: 300,
                        ease: 'Power2'
                    });
                }
                
                // Update mana text
                if (frameData.manaText) {
                    frameData.manaText.setText(`${Math.floor(currentMana)}/${Math.floor(maxMana)}`);
                }
            }

            // Update XP bar - using same calculation as creation
            if (frameData.xpBar) {
                const currentXP = hero.experience || 0;
                const currentLevel = hero.level || 1;
                
                // Calculate XP requirements using same method as creation
                const worldConfig = this.scene.cache.json.get('worldConfig');
                const experienceToLevel = worldConfig?.player?.experienceToLevel || {};
                const xpForCurrentLevel = this.scene.calculateXPForLevel ?
                    this.scene.calculateXPForLevel(currentLevel, experienceToLevel, null) : currentLevel * 100;
                const xpForNextLevel = this.scene.calculateXPForLevel ?
                    this.scene.calculateXPForLevel(currentLevel + 1, experienceToLevel, null) : (currentLevel + 1) * 100;
                
                const xpProgress = Math.max(0, currentXP - xpForCurrentLevel);
                const xpRequired = xpForNextLevel - xpForCurrentLevel;
                const xpPercent = xpRequired > 0 ? Math.max(0, Math.min(1, xpProgress / xpRequired)) : 0;
                
                // Update XP bar fill
                if (frameData.xpBar.fill) {
                    const barWidth = frameData.barWidth || frameData.xpBar.width || 136;
                    const targetWidth = barWidth * xpPercent;
                    
                    // Smooth animation for bar updates
                    this.scene.tweens.add({
                        targets: frameData.xpBar.fill,
                        width: targetWidth,
                        duration: 300,
                        ease: 'Power2'
                    });
                }
                
                // Update XP text if it exists
                if (frameData.xpText) {
                    frameData.xpText.setText(`XP: ${Math.floor(xpProgress)}/${Math.floor(xpRequired)}`);
                }
            }

            // Update status effects
            this.updatePartyFrameStatusEffects(frameData, hero);
        });
    }

    /**
     * Update status effects display for a party frame
     * @param {Object} frameData - Party frame data
     * @param {Object} hero - Hero data
     */
    updatePartyFrameStatusEffects(frameData, hero) {
        if (!frameData.statusContainer) return;

        const statusEffects = hero.statusEffects || hero.data?.statusEffects || {};
        const statusEffectsManager = this.scene.statusEffectsManager;
        
        // Clear existing status effect icons
        frameData.statusContainer.removeAll(true);
        
        // Recreate status effect icons
        Object.entries(statusEffects).forEach(([effectType, effectData], index) => {
            if (!effectData || effectData.duration <= 0) return;
            
            const iconX = index * getScaledValue(UI_CONFIG.PARTY_FRAMES.STATUS_ICON_SPACING, this.scene.scale.width);
            const iconSize = getScaledValue(UI_CONFIG.PARTY_FRAMES.STATUS_ICON_SIZE, this.scene.scale.width);
            
            const effectDef = statusEffectsManager?.effectTypes?.[effectType] || {
                icon: '?',
                color: '#ffffff'
            };
            
            const iconBg = this.scene.add.circle(iconX, 0, iconSize / 2, 
                parseInt(effectDef.color.replace('#', ''), 16) || 0xffffff, 0.7);
            iconBg.setScrollFactor(0);
            iconBg.setDepth(1103);
            
            const iconText = this.scene.add.text(iconX, 0, effectDef.icon || '?', {
                font: `${iconSize - 4}px Arial`,
                fill: '#ffffff'
            });
            iconText.setOrigin(0.5, 0.5);
            iconText.setScrollFactor(0);
            iconText.setDepth(1104);
            
            const durationFontSize = getAccessibleFontSize(UI_CONFIG.PARTY_FRAMES.STATUS_DURATION_FONT_SIZE);
            const durationText = this.scene.add.text(iconX, iconSize / 2 - 2, 
                Math.ceil(effectData.duration || 0).toString(), {
                font: `${durationFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            });
            durationText.setOrigin(0.5, 0);
            durationText.setScrollFactor(0);
            durationText.setDepth(1104);
            
            frameData.statusContainer.add([iconBg, iconText, durationText]);
        });
    }

    /**
     * Update player frame with current hero data
     */
    updatePlayerFrame() {
        if (!this.playerFrame) return;

        const primaryHero = this.scene.partyManager?.getTank() || this.scene.partyManager?.getHeroByIndex(0);
        if (!primaryHero) return;

        // Update portrait if needed (equipment might have changed) - using config
        if (this.playerFrame.portrait && primaryHero) {
            const portraitSize = getScaledValue(UI_CONFIG.PLAYER_FRAME.PORTRAIT_SIZE, this.scene.scale.width);
            const portraitKey = this.portraitGenerator.getPortraitKey(primaryHero.id, portraitSize);
            
            // Check if portrait needs regeneration
            if (!this.scene.textures.exists(portraitKey) && this.playerFrame.portrait.texture) {
                // Regenerate portrait
                const newPortraitKey = this.portraitGenerator.generatePortrait(primaryHero, portraitSize, portraitKey);
                if (this.scene.textures.exists(newPortraitKey)) {
                    this.playerFrame.portrait.setTexture(newPortraitKey);
                }
            }
        }

        // Update name and level
        if (this.playerFrame.nameText) {
            this.playerFrame.nameText.setText((primaryHero.name || primaryHero.classId || 'Unknown').toUpperCase());
        }
        if (this.playerFrame.levelText) {
            this.playerFrame.levelText.setText(`Lv${primaryHero.level || 1}`);
        }

        // Update health bar
        if (this.playerFrame.healthBar) {
            const currentHealth = primaryHero.currentStats?.health || primaryHero.baseStats?.health || 100;
            const maxHealth = primaryHero.currentStats?.maxHealth || primaryHero.baseStats?.maxHealth || 100;
            const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
            
            if (this.playerFrame.healthBar.fill) {
                const barWidth = this.playerFrame.healthBar.width || 140;
                this.playerFrame.healthBar.fill.width = barWidth * healthPercent;
            }
        }

        // Update mana/resource bar
        if (this.playerFrame.manaBar) {
            const currentMana = primaryHero.currentStats?.mana || primaryHero.baseStats?.mana || primaryHero.currentResource || 100;
            const maxMana = primaryHero.currentStats?.maxMana || primaryHero.baseStats?.maxMana || primaryHero.maxResource || 100;
            const manaPercent = Math.max(0, Math.min(1, currentMana / maxMana));
            
            if (this.playerFrame.manaBar.fill) {
                const barWidth = this.playerFrame.manaBar.width || 140;
                this.playerFrame.manaBar.fill.width = barWidth * manaPercent;
            }
        }
    }

    /**
     * Update HUD displays (gold, mana, mile)
     */
    updateHUD() {
        // Update gold display
        // CRITICAL FIX: Gold is managed by shopManager, not resourceManager
        if (this.goldDisplay && this.scene.shopManager) {
            const gold = this.scene.shopManager.getPlayerGold() || 0;
            this.goldDisplay.setText(`Gold: ${gold.toLocaleString()}`);
        }

        // Update item count display
        if (this.itemCountDisplay && this.scene.lootManager) {
            const inventory = this.scene.lootManager.inventory || [];
            const itemCount = inventory.length;
            this.itemCountDisplay.setText(`Items: ${itemCount}`);
        }

        // Update resource display (primary hero) - supports mana, energy, rage, focus
        if (this.manaDisplay) {
            const primaryHero = this.scene.partyManager?.getTank() || this.scene.partyManager?.getHeroByIndex(0);
            if (primaryHero) {
                const resourceType = primaryHero.resourceType || 'mana';
                const currentResource = primaryHero.currentStats?.[resourceType] || 
                    primaryHero.baseStats?.[resourceType] || 
                    primaryHero.currentResource || 
                    100;
                const maxResource = primaryHero.currentStats?.[`max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`] || 
                    primaryHero.baseStats?.[`max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`] || 
                    primaryHero.maxResource || 
                    100;
                
                const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
                this.manaDisplay.setText(`${resourceName}: ${Math.floor(currentResource)}/${Math.floor(maxResource)}`);
                
                // Update color based on resource type
                const resourceColor = UI_THEME?.accents?.[resourceType]?.base || UI_THEME?.accents?.mana?.base || 0x4169E1;
                this.manaDisplay.setFill(`#${resourceColor.toString(16)}`);
            }
        }

        // Update mile display
        if (this.mileDisplay && this.scene.worldManager) {
            const currentMile = this.scene.worldManager.currentMile || 0;
            this.mileDisplay.setText(`Mile ${currentMile}`);
        }

        // Update minimap party indicators
        this.updateMinimapIndicators();
    }

    /**
     * Update minimap party member indicators
     */
    updateMinimapIndicators() {
        if (!this.uiLayout?.minimap?.partyIndicatorsList) return;

        this.uiLayout.minimap.partyIndicatorsList.forEach((indicatorData, index) => {
            const hero = this.scene.partyManager?.getHeroByIndex(index);
            
            // Update indicator visibility based on hero existence
            if (indicatorData.indicator) {
                indicatorData.indicator.setVisible(!!hero);
            }
            if (indicatorData.border) {
                indicatorData.border.setVisible(!!hero);
            }

            // Update indicator color if hero exists
            if (hero && indicatorData.indicator) {
                const classId = hero.classId || 'paladin';
                const classColor = getClassColor(classId);
                indicatorData.indicator.setFillStyle(classColor, 1.0);
            }
        });
    }

    /**
     * Create progression tracking panel
     */
    createProgressionPanel() {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        // Panel dimensions - Using UI_CONFIG
        const progressionConfig = UI_CONFIG.PROGRESSION_PANEL;
        const panelWidth = getScaledValue(progressionConfig.WIDTH, width);
        const panelHeight = getScaledValue(progressionConfig.HEIGHT, width, 'height');
        const panelX = width + getScaledValue(progressionConfig.X_OFFSET, width) - panelWidth / 2;
        const panelY = height / 2;

        const panel = this.scene.uiBuilder.createPanel(
            panelX, panelY,
            panelWidth, panelHeight,
            { backgroundColor: progressionConfig.BACKGROUND_COLOR, borderColor: progressionConfig.BORDER_COLOR }
        );

        const titleY = panelY + getScaledValue(progressionConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(progressionConfig.TITLE_FONT_SIZE, width, 'font');
        const title = this.scene.uiBuilder.createText(
            panelX, titleY,
            '📈 PROGRESSION',
            { fontSize: titleFontSize, fill: '#ffd700' }
        );
        title.setOrigin(0.5, 0.5);

        const contentFontSize = getScaledValue(progressionConfig.CONTENT_FONT_SIZE, width, 'font');
        this.progressionText = this.scene.uiBuilder.createText(
            panelX, panelY,
            'Loading progression data...',
            { fontSize: contentFontSize, fill: '#ffffff', align: 'center' }
        );
        this.progressionText.setOrigin(0.5, 0.5);

        // Close button - Using UI_CONFIG
        const closeButtonSize = getScaledValue(progressionConfig.CLOSE_BUTTON_SIZE, width);
        const closeButtonX = panelX + getScaledValue(progressionConfig.CLOSE_BUTTON_X_OFFSET, width);
        const closeButtonY = panelY + getScaledValue(progressionConfig.CLOSE_BUTTON_Y_OFFSET, width, 'height');
        const closeButtonFontSize = getScaledValue(progressionConfig.CLOSE_BUTTON_FONT_SIZE, width, 'font');
        const closeButton = this.scene.uiBuilder.createButton(
            closeButtonX, closeButtonY,
            'X',
            () => this.toggleProgressionPanel(),
            { width: closeButtonSize, height: closeButtonSize, fontSize: closeButtonFontSize }
        );

        this.progressionPanel = {
            container: this.scene.add.container(0, 0, [panel, title, this.progressionText, closeButton]),
            visible: false
        };
        
        this.progressionPanel.container.setDepth(SCENE_CONFIG.DEPTH?.UI_PANEL || 1000);
        this.progressionPanel.container.setScrollFactor(0);
        this.progressionPanel.container.setVisible(false);
    }

    /**
     * Create WoW-style UI layout
     */
    createWoWStyleUI() {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        // Create main UI layout container - WoW WOTLK style
        this.uiLayout = {
            hud: this.createHUD(width, height),
            minimap: this.createMinimap(width, height),
            combat: this.createCombatLog(width, height),
            actionBar: this.createActionBar(width, height),
            party: this.createPartyFrames(width, height),
            playerFrame: this.createPlayerFrame(width, height),
            targetFrame: this.createTargetFrame(width, height)
        };

        // Store UI elements for cleanup
        this.uiElements.set('uiLayout', this.uiLayout);
    }

    /**
     * Create HUD bar (top of screen)
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @returns {Object} HUD elements
     */
    createHUD(width, height) {
        if (!isElementVisible('HUD')) {
            return null;
        }
        
        const config = getHUDConfig(width, height);
        const hudY = config.height / 2 + config.yOffset;
        const uiDepth = getUIDepth('UI_BACKGROUND');
        const horizontalMargin = config.horizontalMargin;

        // Create HUD background (WoW-style dark textured surface with full width)
        // Enhanced with shadow and depth - using config values
        const hudShadow = this.scene.add.rectangle(
            width / 2 + config.shadowOffsetX, 
            hudY + config.shadowOffsetY, 
            width - (horizontalMargin * 2) + config.shadowBlur, 
            config.height + (config.shadowBlur * 2), 
            0x000000, 
            config.shadowAlpha
        );
        hudShadow.setScrollFactor(0);
        hudShadow.setDepth(uiDepth - 1);
        
        const hudBg = this.scene.add.rectangle(
            width / 2, 
            hudY, 
            width - (horizontalMargin * 2), 
            config.height, 
            config.backgroundColor, 
            config.backgroundAlpha
        );
        hudBg.setScrollFactor(0);
        hudBg.setDepth(uiDepth);
        
        // Top highlight gradient - using config
        const topHighlight = this.scene.add.rectangle(
            width / 2, 
            hudY - config.height / 2, 
            width - (horizontalMargin * 2), 
            config.topHighlightHeight, 
            0xffffff, 
            config.topHighlightAlpha
        );
        topHighlight.setScrollFactor(0);
        topHighlight.setDepth(uiDepth + 1);
        
        // Add gold border (top and bottom) - using config values
        const topBorder = this.scene.add.graphics();
        topBorder.lineStyle(config.borderWidth, config.borderColor, config.borderAlpha);
        topBorder.strokeLineShape(new Phaser.Geom.Line(
            horizontalMargin, 
            hudY - config.height / 2, 
            width - horizontalMargin, 
            hudY - config.height / 2
        ));
        topBorder.setScrollFactor(0);
        topBorder.setDepth(uiDepth + 2);

        const bottomBorder = this.scene.add.graphics();
        bottomBorder.lineStyle(config.borderWidth, config.borderColor, config.borderAlpha);
        bottomBorder.strokeLineShape(new Phaser.Geom.Line(
            horizontalMargin, 
            hudY + config.height / 2, 
            width - horizontalMargin, 
            hudY + config.height / 2
        ));
        bottomBorder.setScrollFactor(0);
        bottomBorder.setDepth(uiDepth + 2);

        // Inner highlight for texture effect - using config
        const highlight = this.scene.add.graphics();
        highlight.lineStyle(config.innerHighlightWidth, UI_THEME.textures.frameHighlight, config.innerHighlightAlpha);
        highlight.strokeLineShape(new Phaser.Geom.Line(
            horizontalMargin + config.innerHighlightOffset, 
            hudY - config.height / 2 + config.innerHighlightOffset, 
            width - horizontalMargin - config.innerHighlightOffset, 
            hudY - config.height / 2 + config.innerHighlightOffset
        ));
        highlight.setScrollFactor(0);
        highlight.setDepth(uiDepth + 2);

        // Mile display (top center) - WoW-style gold text - using config
        const mileX = config.mileXOffset === 0 ? width / 2 : width / 2 + getScaledValue(config.mileXOffset, width);
        const mileFontSize = getAccessibleFontSize(UI_THEME.typography.title);
        this.mileDisplay = this.scene.add.text(mileX, hudY + getScaledValue(config.mileYOffset, height, 'height'), 'Mile 0', {
            font: `bold ${mileFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: `#${(UI_THEME?.accents?.gold?.base || 0xFFD700).toString(16)}`,
            stroke: '#000000',
            strokeThickness: 2,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
        });
        this.mileDisplay.setOrigin(0.5, 0.5);
        this.mileDisplay.setScrollFactor(0);
        this.mileDisplay.setDepth(uiDepth + 2);

        // World progress bar (below mile display) - Using UI_CONFIG
        const progressBarWidth = getScaledValue(UI_CONFIG.COMMON.PROGRESS_BAR.WIDTH, width);
        const progressBarHeight = getScaledValue(UI_CONFIG.COMMON.PROGRESS_BAR.HEIGHT, width, 'height');
        const progressBarY = hudY + getScaledValue(config.mileYOffset, height, 'height') + 25;

        // Background bar
        const progressBg = this.scene.add.rectangle(mileX, progressBarY, progressBarWidth, progressBarHeight, 0x333333, 0.8);
        progressBg.setStrokeStyle(2, UI_THEME.accents.gold.base, 0.6);
        progressBg.setScrollFactor(0);
        progressBg.setDepth(uiDepth + 1);

        // Progress fill bar
        this.worldProgressBar = this.scene.add.rectangle(mileX - progressBarWidth/2, progressBarY, 0, progressBarHeight, UI_THEME.accents.gold.base, 1);
        this.worldProgressBar.setOrigin(0, 0.5);
        this.worldProgressBar.setScrollFactor(0);
        this.worldProgressBar.setDepth(uiDepth + 2);

        // Progress text
        this.worldProgressText = this.scene.add.text(mileX, progressBarY + 15, '0%', {
            font: `${getAccessibleFontSize(UI_THEME?.typography?.small || 12)}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: `#${(UI_THEME?.text?.primary || 0xFFFFFF).toString(16)}`,
            stroke: '#000000',
            strokeThickness: 1,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
        });
        this.worldProgressText.setOrigin(0.5, 0.5);
        this.worldProgressText.setScrollFactor(0);
        this.worldProgressText.setDepth(uiDepth + 2);

        // Initialize progress
        this.updateWorldProgressDisplay();

        // Listen for mile changes to update progress display
        if (this.scene.events) {
            this.scene.events.on('world.mile.changed', (_data) => {
                this.updateWorldProgressDisplay();
            });
        }

        // Gold display (top left) - WoW-style - using config
        const goldX = getScaledValue(config.goldXOffset, width);
        const goldFontSize = getAccessibleFontSize(UI_THEME.typography.body);
        this.goldDisplay = this.scene.add.text(goldX, hudY + getScaledValue(config.goldYOffset, height, 'height'), 'Gold: 0', {
            font: `${goldFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: `#${(UI_THEME?.accents?.gold?.base || 0xFFD700).toString(16)}`,
            stroke: '#000000',
            strokeThickness: 1,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
        });
        this.goldDisplay.setOrigin(0, 0.5);
        this.goldDisplay.setScrollFactor(0);
        this.goldDisplay.setDepth(uiDepth + 2);

        // Item count display (below gold) - WoW-style - using config
        const itemCountX = getScaledValue(config.itemCountXOffset || config.goldXOffset, width);
        const itemCountY = hudY + getScaledValue(config.itemCountYOffset || 20, height, 'height');
        const itemCountFontSize = getAccessibleFontSize(UI_THEME.typography.small);
        this.itemCountDisplay = this.scene.add.text(itemCountX, itemCountY, 'Items: 0', {
            font: `${itemCountFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: `#${(UI_THEME?.accents?.inventory?.base || 0x7bd389).toString(16)}`,
            stroke: '#000000',
            strokeThickness: 1,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
        });
        this.itemCountDisplay.setOrigin(0, 0.5);
        this.itemCountDisplay.setScrollFactor(0);
        this.itemCountDisplay.setDepth(uiDepth + 2);

        // Resource display (top right, before minimap) - WoW-style - using config
        // Shows mana, energy, rage, or focus based on primary hero's resource type
        const manaX = config.manaXOffset < 0 ? width + getScaledValue(config.manaXOffset, width) : getScaledValue(config.manaXOffset, width);
        const manaFontSize = getAccessibleFontSize(UI_THEME.typography.body);
        this.manaDisplay = this.scene.add.text(manaX, hudY + getScaledValue(config.manaYOffset, height, 'height'), 'Mana: 100/100', {
            font: `${manaFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: `#${(UI_THEME?.accents?.mana?.base || 0x4169E1).toString(16)}`,
            stroke: '#000000',
            strokeThickness: 1,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
        });
        this.manaDisplay.setOrigin(0, 0.5);
        this.manaDisplay.setScrollFactor(0);
        this.manaDisplay.setDepth(uiDepth + 2);
        
        // Add tooltip for resource display
        if (this.scene.tooltipManager) {
            this.manaDisplay.setInteractive({ useHandCursor: true });
            this.manaDisplay.on('pointerover', () => {
                const primaryHero = this.scene.partyManager?.getTank() || this.scene.partyManager?.getHeroByIndex(0);
                if (primaryHero) {
                    const resourceType = primaryHero.resourceType || 'mana';
                    const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
                    this.scene.tooltipManager.showTooltip(manaX, hudY - 20, `${resourceName} Resource`);
                }
            });
            this.manaDisplay.on('pointerout', () => {
                this.scene.tooltipManager.hideTooltip();
            });
        }

        // Party overview toggle button (left of minimap) - using config
        const partyOverviewX = width + getScaledValue(config.partyOverviewXOffset || -200, width);
        const partyOverviewButton = createWoWButton(this.scene, partyOverviewX, hudY, 24, {
            icon: '👥',
            tooltip: 'Party Overview',
            onClick: () => {
                SafeExecutor.execute(
                    () => this.togglePartyOverview(),
                    null,
                    'GameSceneUI.partyOverview'
                );
            }
        });
        partyOverviewButton.setScrollFactor(0);
        partyOverviewButton.setDepth(uiDepth + 2);
        this.partyOverviewButton = partyOverviewButton;

        // Help button (top right, after mana display)
        const helpX = manaX - 80;
        const helpButton = createWoWButton(this.scene, helpX, hudY, 20, {
            icon: '?',
            onClick: () => {
                SafeExecutor.execute(
                    () => this.showKeyboardHints(),
                    null,
                    'GameSceneUI.help'
                );
            }
        });
        helpButton.setScrollFactor(0);
        helpButton.setDepth(uiDepth + 2);

        return {
            shadow: hudShadow,
            bg: hudBg,
            topHighlight: topHighlight,
            topBorder: topBorder,
            bottomBorder: bottomBorder,
            highlight: highlight,
            mileDisplay: this.mileDisplay,
            goldDisplay: this.goldDisplay,
            manaDisplay: this.manaDisplay,
            helpButton: helpButton
        };
    }

    /**
     * Create minimap (top right) with party member indicators
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @returns {Object} Minimap elements
     */
    createMinimap(width, height) {
        if (!isElementVisible('MINIMAP')) {
            return null;
        }
        
        const config = getMinimapConfig(width, height);
        const minimapSize = getScaledValue(config.size, width);
        const minimapX = width - getScaledValue(config.rightMargin, width);
        const minimapY = getScaledValue(config.topMargin, height, 'height');
        const uiDepth = getUIDepth('UI_BACKGROUND');

        // Minimap shadow for depth - using config
        const minimapShadow = this.scene.add.graphics();
        minimapShadow.fillStyle(0x000000, config.shadowAlpha);
        minimapShadow.fillCircle(
            minimapX + getScaledValue(config.shadowOffsetX, width), 
            minimapY + getScaledValue(config.shadowOffsetY, height, 'height'), 
            minimapSize / 2 + getScaledValue(config.shadowBlur, width)
        );
        minimapShadow.setScrollFactor(0);
        minimapShadow.setDepth(uiDepth - 1);
        
        // Minimap background (circular) with enhanced styling - using config
        const minimapBg = this.scene.add.graphics();
        minimapBg.fillStyle(config.backgroundColor, config.backgroundAlpha);
        minimapBg.fillCircle(minimapX, minimapY, minimapSize / 2);
        minimapBg.lineStyle(config.outerBorderWidth, config.outerBorderColor, config.outerBorderAlpha);
        minimapBg.strokeCircle(minimapX, minimapY, minimapSize / 2);
        minimapBg.setScrollFactor(0);
        minimapBg.setDepth(uiDepth);

        // Enhanced minimap border - using config
        const minimapBorder = this.scene.add.graphics();
        minimapBorder.lineStyle(config.outerBorderWidth, config.outerBorderColor, config.outerBorderAlpha);
        minimapBorder.strokeCircle(minimapX, minimapY, minimapSize / 2);
        // Inner border - using config
        minimapBorder.lineStyle(
            UI_CONFIG.MINIMAP.INNER_BORDER_WIDTH, 
            0x000000, 
            UI_CONFIG.MINIMAP.INNER_BORDER_ALPHA
        );
        minimapBorder.strokeCircle(minimapX, minimapY, minimapSize / 2 - UI_CONFIG.MINIMAP.INNER_BORDER_OFFSET);
        minimapBorder.setScrollFactor(0);
        minimapBorder.setDepth(uiDepth + 1);
        
        // Minimap inner highlight - using config
        const minimapHighlight = this.scene.add.graphics();
        minimapHighlight.lineStyle(
            UI_CONFIG.MINIMAP.INNER_HIGHLIGHT_WIDTH, 
            0xffffff, 
            UI_CONFIG.MINIMAP.INNER_HIGHLIGHT_ALPHA
        );
        minimapHighlight.strokeCircle(
            minimapX, 
            minimapY, 
            minimapSize / 2 - UI_CONFIG.MINIMAP.INNER_HIGHLIGHT_OFFSET
        );
        minimapHighlight.setScrollFactor(0);
        minimapHighlight.setDepth(uiDepth + 1);

        // Minimap label - using config
        const labelFontSize = getAccessibleFontSize(UI_CONFIG.MINIMAP.LABEL_FONT_SIZE);
        const minimapLabel = this.scene.add.text(
            minimapX, 
            minimapY - minimapSize / 2 + getScaledValue(UI_CONFIG.MINIMAP.LABEL_Y_OFFSET, height, 'height'), 
            'World Map', 
            {
                font: `${labelFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: UI_CONFIG.MINIMAP.LABEL_STROKE_WIDTH,
                shadow: { 
                    offsetX: UI_CONFIG.MINIMAP.LABEL_SHADOW_OFFSET_X, 
                    offsetY: UI_CONFIG.MINIMAP.LABEL_SHADOW_OFFSET_Y, 
                    color: '#000000', 
                    blur: UI_CONFIG.MINIMAP.LABEL_SHADOW_BLUR, 
                    fill: true 
                }
            }
        );
        minimapLabel.setOrigin(0.5, 1);
        minimapLabel.setScrollFactor(0);
        minimapLabel.setDepth(uiDepth + 1);

        // Container for party member indicators
        const partyIndicators = this.scene.add.container(minimapX, minimapY);
        partyIndicators.setScrollFactor(0);
        partyIndicators.setDepth(uiDepth + 2);

        // Create party member indicators (small colored dots)
        const indicatorPositions = [
            { x: -30, y: -20 },  // Top-left
            { x: 0, y: -30 },   // Top
            { x: 30, y: -20 },  // Top-right
            { x: -20, y: 20 },   // Bottom-left
            { x: 20, y: 20 }     // Bottom-right
        ];

        const partyIndicatorsList = [];
        for (let i = 0; i < 5; i++) {
            const hero = this.scene.partyManager?.getHeroByIndex(i);
            const classId = hero?.classId || 'paladin';
            const classColor = getClassColor(classId);
            const pos = indicatorPositions[i] || { x: 0, y: 0 };

            // Small colored dot for party member
            const indicator = this.scene.add.circle(pos.x, pos.y, 4, classColor, 1.0);
            indicator.setScrollFactor(0);
            indicator.setDepth(uiDepth + 3);
            
            // Add border for visibility
            const indicatorBorder = this.scene.add.graphics();
            indicatorBorder.lineStyle(1, 0x000000, 1.0);
            indicatorBorder.strokeCircle(pos.x, pos.y, 4);
            indicatorBorder.setScrollFactor(0);
            indicatorBorder.setDepth(uiDepth + 4);

            partyIndicators.add([indicator, indicatorBorder]);
            partyIndicatorsList.push({
                indicator: indicator,
                border: indicatorBorder,
                heroId: hero?.id,
                heroIndex: i
            });
        }

        // Add tooltip on hover
        if (this.scene.tooltipManager) {
            minimapBg.setInteractive(new Phaser.Geom.Circle(minimapX, minimapY, minimapSize / 2), Phaser.Geom.Circle.Contains);
            minimapBg.on('pointerover', () => {
                const partySize = this.scene.partyManager?.getSize() || 0;
                this.scene.tooltipManager.showTooltip(minimapX, minimapY - minimapSize / 2 - 30, 
                    `Minimap\nParty Members: ${partySize}/5`);
            });
            minimapBg.on('pointerout', () => {
                this.scene.tooltipManager.hideTooltip();
            });
        }

        return {
            shadow: minimapShadow,
            bg: minimapBg,
            border: minimapBorder,
            highlight: minimapHighlight,
            label: minimapLabel,
            partyIndicators: partyIndicators,
            partyIndicatorsList: partyIndicatorsList,
            size: minimapSize,
            x: minimapX,
            y: minimapY
        };
    }

    /**
     * Create combat log area - WoW WOTLK style with enhanced design
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @returns {Object} Combat log elements
     */
    createCombatLog(width, height) {
        if (!isElementVisible('COMBAT_LOG')) {
            return null;
        }
        
        const config = getCombatLogConfig(width, height);
        const logX = config.centerX ? width / 2 : width / 2; // Always center for now
        const logY = height - config.height / 2 - config.bottomMargin;
        const uiDepth = getUIDepth('UI_BACKGROUND');

        // WoW-style combat log frame with enhanced styling - using config
        const logFrame = createWoWFrame(this.scene, logX, logY, config.width, config.height, {
            backgroundColor: config.frameBackgroundColor,
            backgroundAlpha: config.frameBackgroundAlpha,
            borderColor: config.frameBorderColor,
            borderWidth: config.frameBorderWidth,
            shadow: true
        });
        logFrame.setScrollFactor(0);
        logFrame.setDepth(uiDepth);

        // Enhanced title bar for combat log - using config
        const titleBar = this.scene.add.rectangle(
            logX, 
            logY - config.height / 2, 
            config.width, 
            config.titleBarHeight, 
            UI_CONFIG.COMBAT_LOG.TITLE_BAR_BACKGROUND_COLOR || 0x1a1a2e, 
            UI_CONFIG.COMBAT_LOG.TITLE_BAR_BACKGROUND_ALPHA || 0.98
        );
        titleBar.setScrollFactor(0);
        titleBar.setDepth(uiDepth + 1);
        
        // Title bar border - using config
        const titleBarBorder = this.scene.add.graphics();
        titleBarBorder.lineStyle(
            UI_CONFIG.COMBAT_LOG.TITLE_BAR_BORDER_WIDTH, 
            UI_THEME.borders.gold, 
            UI_CONFIG.COMBAT_LOG.TITLE_BAR_BORDER_ALPHA
        );
        titleBarBorder.strokeLineShape(new Phaser.Geom.Line(
            logX - config.width / 2, 
            logY - config.height / 2 + config.titleTextYOffset,
            logX + config.width / 2, 
            logY - config.height / 2 + config.titleTextYOffset
        ));
        titleBarBorder.setScrollFactor(0);
        titleBarBorder.setDepth(uiDepth + 2);

        const titleFontSize = getAccessibleFontSize(config.titleTextFontSize);
        const titleText = this.scene.add.text(logX, logY - config.height / 2 + config.titleTextYOffset, 'Combat Log', {
            font: `bold ${titleFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: `#${(UI_THEME?.accents?.gold?.base || 0xFFD700).toString(16)}`,
            stroke: '#000000',
            strokeThickness: UI_CONFIG.COMBAT_LOG.TITLE_TEXT_STROKE_WIDTH,
            shadow: { 
                offsetX: UI_CONFIG.COMBAT_LOG.TITLE_TEXT_SHADOW_OFFSET_X, 
                offsetY: UI_CONFIG.COMBAT_LOG.TITLE_TEXT_SHADOW_OFFSET_Y, 
                color: '#000000', 
                blur: UI_CONFIG.COMBAT_LOG.TITLE_TEXT_SHADOW_BLUR, 
                fill: true 
            }
        });
        titleText.setOrigin(0.5, 0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(uiDepth + 2);

        // Combat log text area (scrollable) with enhanced styling - using config
        const contentFontSize = getAccessibleFontSize(config.contentFontSize);
        const logText = this.scene.add.text(
            logX - config.width / 2 + config.contentPaddingX, 
            logY - config.height / 2 + config.contentPaddingY, 
            'Combat Log Initialized...\n', 
            {
                font: `${contentFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: UI_CONFIG.COMBAT_LOG.CONTENT_TEXT_COLOR || '#cccccc',
                wordWrap: { width: config.width - (config.contentPaddingX * 2) },
                lineSpacing: UI_CONFIG.COMBAT_LOG.CONTENT_LINE_SPACING,
                stroke: '#000000',
                strokeThickness: UI_CONFIG.COMBAT_LOG.CONTENT_STROKE_WIDTH,
                shadow: { 
                    offsetX: UI_CONFIG.COMBAT_LOG.CONTENT_SHADOW_OFFSET_X, 
                    offsetY: UI_CONFIG.COMBAT_LOG.CONTENT_SHADOW_OFFSET_Y, 
                    color: '#000000', 
                    blur: UI_CONFIG.COMBAT_LOG.CONTENT_SHADOW_BLUR, 
                    fill: true 
                }
            }
        );
        logText.setScrollFactor(0);
        logText.setDepth(uiDepth + 1);

        // Enhanced scrollbar indicator - using config
        const scrollbarWidth = UI_CONFIG.COMBAT_LOG.SCROLLBAR_WIDTH;
        const scrollbarX = logX + config.width / 2 + getScaledValue(UI_CONFIG.COMBAT_LOG.SCROLLBAR_X_OFFSET, width);
        const scrollbarHeight = config.height - (UI_CONFIG.COMBAT_LOG.SCROLLBAR_VERTICAL_PADDING * 2);
        const scrollbarBg = this.scene.add.rectangle(
            scrollbarX, 
            logY, 
            scrollbarWidth, 
            scrollbarHeight, 
            0x2a2a2a, 
            UI_CONFIG.COMBAT_LOG.SCROLLBAR_ALPHA
        );
        scrollbarBg.setScrollFactor(0);
        scrollbarBg.setDepth(uiDepth + 1);
        
        // Scrollbar border - using config
        const scrollbarBorder = this.scene.add.graphics();
        scrollbarBorder.lineStyle(
            UI_CONFIG.COMBAT_LOG.SCROLLBAR_BORDER_WIDTH, 
            0x666666, 
            UI_CONFIG.COMBAT_LOG.SCROLLBAR_BORDER_ALPHA
        );
        scrollbarBorder.strokeRect(
            scrollbarX - scrollbarWidth / 2, 
            logY - scrollbarHeight / 2, 
            scrollbarWidth, 
            scrollbarHeight
        );
        scrollbarBorder.setScrollFactor(0);
        scrollbarBorder.setDepth(uiDepth + 1);

        // Store reference for updates
        this.combatLog = {
            frame: logFrame,
            titleBar: titleBar,
            titleText: titleText,
            text: logText,
            scrollbarBg: scrollbarBg,
            container: logFrame, // For compatibility
            scrollTo: (position) => {
                // Simple scroll implementation
                const maxScroll = Math.max(0, logText.height - config.height + 50);
                const scrollPos = Math.max(0, Math.min(position, maxScroll));
                logText.setY(logY - config.height / 2 + config.contentPaddingY - scrollPos);
            },
            getScroll: () => 0,
            getMaxScroll: () => Math.max(0, logText.height - config.height + 50)
        };

        return this.combatLog;
    }

    /**
     * Update combat log with new message (compatibility method for combat-handler)
     * @param {string} message - Message to add
     * @param {string} type - Message type ('combat', 'damage', 'heal', etc.)
     */
    updateCombatLog(message, type = 'combat') {
        if (!this.combatLog || !this.combatLog.text) return;

        // Color coding based on type
        let color = '#cccccc'; // Default
        if (type === 'damage') color = '#ff6666';
        else if (type === 'heal') color = '#66ff66';
        else if (type === 'combat') color = '#ffaa00';
        else if (type === 'info') color = '#cccccc';

        // Append message with color
        const currentText = this.combatLog.text.text || '';
        const newLine = `[${type.toUpperCase()}] ${message}`;
        const updatedText = currentText + '\n' + newLine;
        
        // Update text (Phaser text doesn't support per-line colors easily, so we use a single color)
        this.combatLog.text.setText(updatedText);
        this.combatLog.text.setColor(color);

        // Auto-scroll to bottom
        if (this.combatLog.scrollTo) {
            const maxScroll = this.combatLog.getMaxScroll();
            this.combatLog.scrollTo(maxScroll);
        }
    }

    /**
     * Create action bar (bottom of screen) - WoW WOTLK style: 1 row × 6 buttons
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @returns {Array} Action bar buttons
     */
    createActionBar(width, height) {
        if (!isElementVisible('ACTION_BAR')) {
            return [];
        }
        
        const config = getActionBarConfig(width, height);
        const rows = config.rows;
        const cols = config.buttonCount;

        // Action bar container (centered at bottom) - using config values
        const actionBarWidth = (cols * config.buttonSize) + ((cols - 1) * config.buttonSpacing);
        const actionBarHeight = (rows * config.buttonSize) + ((rows - 1) * config.buttonSpacing);
        const actionBarX = config.centerX ? width / 2 : width / 2; // Always center for now
        const actionBarY = height - actionBarHeight / 2 - config.bottomMargin;

        // WoW-style action bar background plate with enhanced styling - using config
        const totalWidth = actionBarWidth + (config.barPaddingX * 2);
        const totalHeight = actionBarHeight + (config.barPaddingY * 2);
        
        // Shadow for action bar - using config
        const actionBarShadow = this.scene.add.rectangle(
            actionBarX + UI_CONFIG.ACTION_BAR.SHADOW_OFFSET_X, 
            actionBarY + UI_CONFIG.ACTION_BAR.SHADOW_OFFSET_Y, 
            totalWidth + UI_CONFIG.ACTION_BAR.SHADOW_BLUR, 
            totalHeight + UI_CONFIG.ACTION_BAR.SHADOW_BLUR, 
            0x000000, 
            UI_CONFIG.ACTION_BAR.SHADOW_ALPHA
        );
        actionBarShadow.setScrollFactor(0);
        actionBarShadow.setDepth(getUIDepth('UI_BACKGROUND') - 1);
        
        const actionBarBg = this.scene.add.rectangle(
            actionBarX, 
            actionBarY, 
            totalWidth, 
            totalHeight, 
            config.backgroundColor, 
            config.backgroundAlpha
        );
        actionBarBg.setStrokeStyle(config.borderWidth, config.borderColor, config.borderAlpha);
        actionBarBg.setScrollFactor(0);
        actionBarBg.setDepth(getUIDepth('UI_BACKGROUND'));

        // Inner border for depth - using config
        const innerBorder = this.scene.add.graphics();
        innerBorder.lineStyle(
            UI_CONFIG.ACTION_BAR.INNER_BORDER_WIDTH, 
            0x000000, 
            UI_CONFIG.ACTION_BAR.INNER_BORDER_ALPHA
        );
        innerBorder.strokeRect(
            actionBarX - totalWidth / 2 + UI_CONFIG.ACTION_BAR.INNER_BORDER_OFFSET, 
            actionBarY - totalHeight / 2 + UI_CONFIG.ACTION_BAR.INNER_BORDER_OFFSET, 
            totalWidth - (UI_CONFIG.ACTION_BAR.INNER_BORDER_OFFSET * 2), 
            totalHeight - (UI_CONFIG.ACTION_BAR.INNER_BORDER_OFFSET * 2)
        );
        innerBorder.setScrollFactor(0);
        innerBorder.setDepth(getUIDepth('UI_BACKGROUND') + 1);
        
        // Top highlight - using config
        const topHighlight = this.scene.add.graphics();
        topHighlight.lineStyle(
            UI_CONFIG.ACTION_BAR.TOP_HIGHLIGHT_WIDTH, 
            0xffffff, 
            UI_CONFIG.ACTION_BAR.TOP_HIGHLIGHT_ALPHA
        );
        topHighlight.strokeLineShape(new Phaser.Geom.Line(
            actionBarX - totalWidth / 2 + UI_CONFIG.ACTION_BAR.TOP_HIGHLIGHT_OFFSET,
            actionBarY - totalHeight / 2 + UI_CONFIG.ACTION_BAR.TOP_HIGHLIGHT_OFFSET,
            actionBarX + totalWidth / 2 - UI_CONFIG.ACTION_BAR.TOP_HIGHLIGHT_OFFSET,
            actionBarY - totalHeight / 2 + UI_CONFIG.ACTION_BAR.TOP_HIGHLIGHT_OFFSET
        ));
        topHighlight.setScrollFactor(0);
        topHighlight.setDepth(getUIDepth('UI_BACKGROUND') + 1);

        this.actionBarButtons = [];
        const keybinds = UI_CONFIG.KEYBINDS.ACTION_1 ? 
            [UI_CONFIG.KEYBINDS.ACTION_1, UI_CONFIG.KEYBINDS.ACTION_2, UI_CONFIG.KEYBINDS.ACTION_3, 
             UI_CONFIG.KEYBINDS.ACTION_4, UI_CONFIG.KEYBINDS.ACTION_5, UI_CONFIG.KEYBINDS.ACTION_6] :
            ['1', '2', '3', '4', '5', '6']; // Fallback

        // Create buttons - using config values
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col;
                const buttonX = actionBarX - actionBarWidth / 2 + config.buttonSize / 2 + col * (config.buttonSize + config.buttonSpacing);
                const buttonY = actionBarY - actionBarHeight / 2 + config.buttonSize / 2 + row * (config.buttonSize + config.buttonSpacing);

                // Get ability for this slot from primary hero
                const primaryHero = this.scene.partyManager?.getTank() || this.scene.partyManager?.getHeroByIndex(0);
                const abilities = primaryHero?.abilities || [];
                const ability = abilities[index];
                const abilityIcon = ability?.icon || (index < 3 ? '⚔️' : '?');
                const abilityName = ability?.name || `Ability ${index + 1}`;

                const button = createWoWButton(this.scene, buttonX, buttonY, config.buttonSize, {
                    icon: abilityIcon,
                    keybind: keybinds[index] || '',
                    onClick: () => this.onActionButtonClick(index)
                });

                if (button) {
                    button.setScrollFactor(0);
                    button.setDepth(1102);
                    
                    // Add tooltip on hover
                    // CRITICAL FIX: Containers need a hit area before setInteractive
                    // The createWoWButton already sets interactive on the bg child,
                    // so we'll use that for tooltip events instead of the container
                    if (this.scene.tooltipManager) {
                        // Find the background rectangle (first child) to attach tooltip events
                        // createWoWButton sets interactive on the bg, so we use that
                        const bg = button.list[0]; // First child is the background rectangle
                        if (bg && bg.input) {
                            bg.on('pointerover', () => {
                                const tooltipText = ability ? 
                                    `${abilityName}\n${ability.description || 'No description'}\nCooldown: ${ability.cooldown || 0}s` :
                                    `Empty Slot ${index + 1}\nPress ${keybinds[index] || 'N/A'}`;
                                this.scene.tooltipManager.showTooltip(buttonX, buttonY - config.buttonSize / 2 - 10, tooltipText);
                            });
                            bg.on('pointerout', () => {
                                this.scene.tooltipManager.hideTooltip();
                            });
                        } else {
                            // Fallback: Set hit area on container if bg not found
                            button.setSize(config.buttonSize, config.buttonSize);
                            button.setInteractive(new Phaser.Geom.Rectangle(-config.buttonSize / 2, -config.buttonSize / 2, config.buttonSize, config.buttonSize), Phaser.Geom.Rectangle.Contains);
                            button.on('pointerover', () => {
                                const tooltipText = ability ? 
                                    `${abilityName}\n${ability.description || 'No description'}\nCooldown: ${ability.cooldown || 0}s` :
                                    `Empty Slot ${index + 1}\nPress ${keybinds[index] || 'N/A'}`;
                                this.scene.tooltipManager.showTooltip(buttonX, buttonY - config.buttonSize / 2 - 10, tooltipText);
                            });
                            button.on('pointerout', () => {
                                this.scene.tooltipManager.hideTooltip();
                            });
                        }
                    }
                    
                    this.actionBarButtons.push({
                        button: button,
                        index: index,
                        ability: ability,
                        abilityName: abilityName
                    });
                }
            }
        }

        return this.actionBarButtons;
    }

    /**
     * Create party frames (left side)
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @returns {Array} Party frame elements
     */
    createPartyFrames(_width, _height) {
        const partyFrames = [];
        const config = UI_CONFIG.PARTY_FRAMES || {};
        const frameWidth = getScaledValue(config.FRAME_WIDTH || 200, _width);
        const frameHeight = getScaledValue(config.FRAME_HEIGHT || 60, _height);
        const startY = getScaledValue(config.START_Y || 100, _height, 'height');
        const leftMargin = getScaledValue(config.LEFT_MARGIN || 20, _width);
        const frameSpacing = getScaledValue(config.FRAME_SPACING || 10, _height, 'height');

        // Create frames for 5 party members
        for (let i = 0; i < 5; i++) {
            const frameX = leftMargin + frameWidth / 2;
            const frameY = startY + (i * (frameHeight + frameSpacing));

            // Get hero data if available to set class color
            const hero = this.scene.partyManager?.getHeroByIndex(i);
            const classId = hero?.classId || 'paladin';
            const classColor = getClassColor(classId) || 0xFFFFFF; // Ensure it's always a valid color
            const heroName = hero?.name || `Party Member ${i + 1}`;
            const heroLevel = hero?.level || 1;

            // Initialize frameData object to store all frame elements
            const frameData = {
                heroId: hero?.id,
                heroIndex: i,
                x: frameX,
                y: frameY,
                classColor: classColor,
                barWidth: getScaledValue(config.BAR_WIDTH, _width),
                barStartX: frameX - frameWidth / 2 + getScaledValue(config.BAR_START_X_OFFSET, _width)
            };

            // Use WoW-style frame helper with class-colored border
            // Enhanced background with better contrast - using config
            const frame = createWoWFrame(this.scene, frameX, frameY, frameWidth, frameHeight, {
                classColor: classColor,
                backgroundColor: config.FRAME_BACKGROUND_COLOR || 0x1a1a1a,
                backgroundAlpha: config.FRAME_BACKGROUND_ALPHA || 0.9,
                borderWidth: config.FRAME_BORDER_WIDTH || 2,
                shadow: true
            });
            frame.setScrollFactor(0);
            frame.setDepth(1100);
            
            // Make frame interactive for hover effects
            frame.setInteractive(new Phaser.Geom.Rectangle(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight), Phaser.Geom.Rectangle.Contains);
            frame.setSize(frameWidth, frameHeight);
            
            // Additional frame glow effect (subtle class-colored glow) - enhanced for hover - using config
            const frameGlow = this.scene.add.graphics();
            const glowWidth = config.FRAME_GLOW_WIDTH || 2;
            const glowAlpha = config.FRAME_GLOW_ALPHA || 0.5;
            const glowOffset = config.FRAME_GLOW_OFFSET || 2;
            frameGlow.lineStyle(glowWidth, classColor, glowAlpha);
            frameGlow.strokeRect(
                frameX - frameWidth / 2 - glowOffset, 
                frameY - frameHeight / 2 - glowOffset, 
                frameWidth + (glowOffset * 2), 
                frameHeight + (glowOffset * 2)
            );
            frameGlow.setScrollFactor(0);
            frameGlow.setDepth(getUIDepth('UI_BACKGROUND') - 1);
            
            // Hover effect - enhance glow on hover - using config
            frame.on('pointerover', () => {
                this.scene.tweens.add({
                    targets: frameGlow,
                    alpha: { from: config.HOVER_GLOW_ALPHA_MIN || 0.3, to: config.HOVER_GLOW_ALPHA_MAX || 0.7 },
                    duration: config.HOVER_ANIMATION_DURATION || 200,
                    ease: 'Quad.easeOut'
                });
                // Slight scale up for feedback
                this.scene.tweens.add({
                    targets: frame,
                    scaleX: { from: config.HOVER_SCALE_MIN || 1.0, to: config.HOVER_SCALE_MAX || 1.05 },
                    scaleY: { from: config.HOVER_SCALE_MIN || 1.0, to: config.HOVER_SCALE_MAX || 1.05 },
                    duration: config.HOVER_ANIMATION_DURATION || 200,
                    ease: 'Quad.easeOut'
                });
            });
            
            frame.on('pointerout', () => {
                this.scene.tweens.add({
                    targets: frameGlow,
                    alpha: { from: frameGlow.alpha, to: config.HOVER_GLOW_ALPHA_MIN || 0.3 },
                    duration: config.HOVER_ANIMATION_DURATION || 200,
                    ease: 'Quad.easeOut'
                });
                // Scale back down
                this.scene.tweens.add({
                    targets: frame,
                    scaleX: { from: frame.scaleX, to: config.HOVER_SCALE_MIN || 1.0 },
                    scaleY: { from: frame.scaleY, to: config.HOVER_SCALE_MIN || 1.0 },
                    duration: config.HOVER_ANIMATION_DURATION || 200,
                    ease: 'Quad.easeOut'
                });
            });
            
            // Click handler - could be used for targeting or selecting hero
            frame.on('pointerdown', () => {
                // Visual feedback on click
                this.scene.tweens.add({
                    targets: frame,
                    scaleX: { from: 1.02, to: 0.98, yoyo: true },
                    scaleY: { from: 1.02, to: 0.98, yoyo: true },
                    duration: 100,
                    ease: 'Quad.easeOut'
                });
            });

            // Character portrait (circular) - WoW-style - using config
            const portraitSize = getScaledValue(config.PORTRAIT_SIZE || 40, _width);
            const portraitX = frameX - frameWidth / 2 + getScaledValue(config.PORTRAIT_X_OFFSET || 25, _width);
            const portraitY = frameY + getScaledValue(config.PORTRAIT_Y_OFFSET || 0, _height, 'height');
            
            // Generate portrait texture key
            const portraitKey = hero ? 
                this.portraitGenerator.generatePortrait(hero, portraitSize, `portrait_${hero.id}_${portraitSize}`) :
                this.portraitGenerator.getPlaceholderPortrait(portraitSize);
            
            // Create portrait sprite
            let portraitSprite = null;
            if (this.scene.textures.exists(portraitKey)) {
                portraitSprite = this.scene.add.sprite(portraitX, portraitY, portraitKey);
            } else {
                // Fallback: show placeholder while portrait generates
                const placeholderKey = this.portraitGenerator.getPlaceholderPortrait(portraitSize);
                portraitSprite = this.scene.add.sprite(portraitX, portraitY, placeholderKey);
                
                // Try to update when portrait is ready
                const checkPortrait = () => {
                    if (this.scene.textures.exists(portraitKey)) {
                        portraitSprite.setTexture(portraitKey);
                    } else {
                        this.scene.time.delayedCall(100, checkPortrait);
                    }
                };
                this.scene.time.delayedCall(100, checkPortrait);
            }
            
            portraitSprite.setScrollFactor(0);
            portraitSprite.setDepth(1101);
            
            // Add enhanced circular border around portrait with depth - using config values
            const portraitBorder = this.scene.add.graphics();
            // Outer glow
            portraitBorder.lineStyle(config.PORTRAIT_BORDER_OUTER_WIDTH || 3, classColor, config.PORTRAIT_BORDER_OUTER_ALPHA || 0.8);
            portraitBorder.strokeCircle(portraitX, portraitY, portraitSize / 2 + (config.PORTRAIT_BORDER_GLOW_OFFSET || 2));
            // Main border
            portraitBorder.lineStyle(config.PORTRAIT_BORDER_MAIN_WIDTH || 2, classColor, config.PORTRAIT_BORDER_MAIN_ALPHA || 1.0);
            portraitBorder.strokeCircle(portraitX, portraitY, portraitSize / 2);
            // Inner shadow
            portraitBorder.lineStyle(config.PORTRAIT_BORDER_INNER_WIDTH || 1, 0x000000, config.PORTRAIT_BORDER_INNER_ALPHA || 0.5);
            portraitBorder.strokeCircle(portraitX, portraitY, portraitSize / 2 - 1);
            portraitBorder.setScrollFactor(0);
            portraitBorder.setDepth(1102);
            
            // Portrait shadow for depth - using config values
            const portraitShadow = this.scene.add.graphics();
            portraitShadow.fillStyle(0x000000, config.PORTRAIT_SHADOW_ALPHA || 0.3);
            portraitShadow.fillCircle(
                portraitX + getScaledValue(config.PORTRAIT_SHADOW_OFFSET_X || 2, _width),
                portraitY + getScaledValue(config.PORTRAIT_SHADOW_OFFSET_Y || 2, _height, 'height'),
                portraitSize / 2
            );
            portraitShadow.setScrollFactor(0);
            portraitShadow.setDepth(1100);

            // Role indicator icon - visual distinction for tank/healer/DPS
            if (config.ROLE_INDICATOR_ENABLED !== false) {
                const heroRole = hero?.role || 'dps';
                const roleIcon = heroRole === 'tank' ? config.ROLE_ICONS?.TANK || '🛡️' 
                    : heroRole === 'healer' ? config.ROLE_ICONS?.HEALER || '✨' 
                    : config.ROLE_ICONS?.DPS || '⚔️';
                const roleColor = heroRole === 'tank' ? config.ROLE_COLORS?.TANK || 0x3aa7ff
                    : heroRole === 'healer' ? config.ROLE_COLORS?.HEALER || 0x4cd964
                    : config.ROLE_COLORS?.DPS || 0xff9f43;
                
                const roleIndicatorX = frameX - frameWidth / 2 + getScaledValue(config.ROLE_INDICATOR_X_OFFSET, _width);
                const roleIndicatorY = frameY - frameHeight / 2 + getScaledValue(config.ROLE_INDICATOR_Y_OFFSET, _height, 'height');
                const indicatorSize = getScaledValue(config.ROLE_INDICATOR_SIZE, _width);
                const bgSize = getScaledValue(config.ROLE_INDICATOR_BG_SIZE, _width);
                
                // Background circle with role color
                const roleBg = this.scene.add.graphics();
                roleBg.fillStyle(roleColor, config.ROLE_INDICATOR_BG_ALPHA || 0.8);
                roleBg.fillCircle(roleIndicatorX, roleIndicatorY, bgSize / 2);
                roleBg.lineStyle(
                    getScaledValue(config.ROLE_INDICATOR_BORDER_WIDTH || 2, _width),
                    0xffffff,
                    1.0
                );
                roleBg.strokeCircle(roleIndicatorX, roleIndicatorY, bgSize / 2);
                roleBg.setScrollFactor(0);
                roleBg.setDepth(1103);
                
                // Role icon text
                const roleIconText = this.scene.add.text(roleIndicatorX, roleIndicatorY, roleIcon, {
                    font: `${indicatorSize}px Arial`,
                    align: 'center'
                });
                roleIconText.setOrigin(0.5, 0.5);
                roleIconText.setScrollFactor(0);
                roleIconText.setDepth(1104);
                
                // Store reference for updates
                frameData.roleIndicator = { bg: roleBg, icon: roleIconText };
            }

            // Name and Level Text (WoW-style) - using config
            const nameX = frameX - frameWidth / 2 + getScaledValue(config.NAME_X_OFFSET, _width);
            const nameY = frameY - frameHeight / 2 + getScaledValue(config.NAME_Y_OFFSET, _height, 'height');
            const nameFontSize = getAccessibleFontSize(config.NAME_FONT_SIZE);
            const nameText = this.scene.add.text(nameX, nameY, heroName, {
                font: `bold ${nameFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: config.NAME_STROKE_WIDTH,
                shadow: { 
                    offsetX: config.NAME_SHADOW_OFFSET_X, 
                    offsetY: config.NAME_SHADOW_OFFSET_Y, 
                    color: '#000000', 
                    blur: config.NAME_SHADOW_BLUR, 
                    fill: true 
                }
            });
            nameText.setScrollFactor(0);
            nameText.setDepth(getUIDepth('UI_TEXT'));

            // Level text with role indicator - using config
            const heroRole = hero?.role || 'dps';
            const roleIcon = heroRole === 'tank' ? '🛡️' : heroRole === 'healer' ? '✨' : '⚔️';
            const levelX = frameX + frameWidth / 2 + getScaledValue(config.LEVEL_X_OFFSET || -10, _width);
            const levelY = frameY - frameHeight / 2 + getScaledValue(config.LEVEL_Y_OFFSET || 5, _height, 'height');
            const levelFontSize = getAccessibleFontSize(config.LEVEL_FONT_SIZE || 14);
            const goldColor = UI_THEME?.accents?.gold?.base || 0xFFD700;
            const levelText = this.scene.add.text(levelX, levelY, `${roleIcon} Lv${heroLevel}`, {
                font: `bold ${levelFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: `#${goldColor.toString(16)}`,
                stroke: '#000000',
                strokeThickness: config.LEVEL_STROKE_WIDTH || 2,
                shadow: { 
                    offsetX: config.LEVEL_SHADOW_OFFSET_X || 1, 
                    offsetY: config.LEVEL_SHADOW_OFFSET_Y || 1, 
                    color: '#000000', 
                    blur: config.LEVEL_SHADOW_BLUR || 2, 
                    fill: true 
                }
            });
            levelText.setOrigin(1, 0);
            levelText.setScrollFactor(0);
            levelText.setDepth(getUIDepth('UI_TEXT'));

            // Health bar using WoW-style bar helper - using config
            const barStartX = frameX - frameWidth / 2 + getScaledValue(config.BAR_START_X_OFFSET, _width);
            const barWidth = getScaledValue(config.BAR_WIDTH, _width);
            
            const currentHealth = hero?.currentStats?.health || hero?.baseStats?.health || 100;
            const maxHealth = hero?.currentStats?.maxHealth || hero?.baseStats?.maxHealth || 100;
            const healthBarY = frameY - frameHeight / 2 + getScaledValue(config.HEALTH_BAR_Y_OFFSET, _height, 'height');
            const healthBarHeight = getScaledValue(config.HEALTH_BAR_HEIGHT, _height, 'height');
            
            const healthBar = createWoWBar(this.scene, barStartX, healthBarY, barWidth, healthBarHeight, {
                type: 'health',
                current: currentHealth,
                max: maxHealth,
                borderColor: classColor,
                borderWidth: config.BAR_BORDER_WIDTH
            });
            healthBar.setScrollFactor(0);
            healthBar.setDepth(getUIDepth('UI_BARS'));
            
            // Health text overlay (shows current/max) - using config
            const healthTextFontSize = getAccessibleFontSize(config.HEALTH_TEXT_FONT_SIZE);
            const healthText = this.scene.add.text(barStartX, healthBarY, 
                `${Math.floor(currentHealth)}/${Math.floor(maxHealth)}`, {
                font: `${healthTextFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: config.HEALTH_TEXT_STROKE_WIDTH,
                shadow: { 
                    offsetX: config.HEALTH_TEXT_SHADOW_OFFSET_X, 
                    offsetY: config.HEALTH_TEXT_SHADOW_OFFSET_Y, 
                    color: '#000000', 
                    blur: config.HEALTH_TEXT_SHADOW_BLUR, 
                    fill: true 
                }
            });
            healthText.setOrigin(0.5, 0.5);
            healthText.setScrollFactor(0);
            healthText.setDepth(getUIDepth('UI_TEXT'));

            // Mana/Resource bar (WoW-style) - using config
            const currentMana = hero?.currentStats?.mana || hero?.baseStats?.mana || hero?.currentResource || 100;
            const maxMana = hero?.currentStats?.maxMana || hero?.baseStats?.maxMana || hero?.maxResource || 100;
            const manaBarY = frameY - frameHeight / 2 + getScaledValue(config.MANA_BAR_Y_OFFSET, _height, 'height');
            const manaBarHeight = getScaledValue(config.MANA_BAR_HEIGHT, _height, 'height');
            
            const manaBar = createWoWBar(this.scene, barStartX, manaBarY, barWidth, manaBarHeight, {
                type: 'mana',
                current: currentMana,
                max: maxMana,
                borderColor: classColor,
                borderWidth: config.BAR_BORDER_WIDTH
            });
            manaBar.setScrollFactor(0);
            manaBar.setDepth(getUIDepth('UI_BARS'));
            
            // Mana text overlay (shows current/max) - using config
            const manaTextFontSize = getAccessibleFontSize(config.MANA_TEXT_FONT_SIZE);
            const manaText = this.scene.add.text(barStartX, manaBarY,
                `${Math.floor(currentMana)}/${Math.floor(maxMana)}`, {
                font: `${manaTextFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: config.MANA_TEXT_STROKE_WIDTH,
                shadow: { 
                    offsetX: config.MANA_TEXT_SHADOW_OFFSET_X, 
                    offsetY: config.MANA_TEXT_SHADOW_OFFSET_Y, 
                    color: '#000000', 
                    blur: config.MANA_TEXT_SHADOW_BLUR, 
                    fill: true 
                }
            });
            manaText.setOrigin(0.5, 0.5);
            manaText.setScrollFactor(0);
            manaText.setDepth(getUIDepth('UI_TEXT'));

            // XP Progress bar (below mana bar, compact) - using config
            const currentXP = hero?.experience || 0;
            const currentLevel = hero?.level || 1;
            const xpForCurrentLevel = this.scene.calculateXPForLevel ?
                this.scene.calculateXPForLevel(currentLevel, this.scene.cache.json.get('worldConfig')?.player?.experienceToLevel || {}, null) : currentLevel * 100;
            const xpForNextLevel = this.scene.calculateXPForLevel ?
                this.scene.calculateXPForLevel(currentLevel + 1, this.scene.cache.json.get('worldConfig')?.player?.experienceToLevel || {}, null) : (currentLevel + 1) * 100;
            const xpProgress = currentXP - xpForCurrentLevel;
            const xpRequired = xpForNextLevel - xpForCurrentLevel;
            const xpBarY = frameY - frameHeight / 2 + getScaledValue(config.XP_BAR_Y_OFFSET, _height, 'height');
            const xpBarHeight = getScaledValue(config.XP_BAR_HEIGHT, _height, 'height');
            const xpBar = createWoWBar(this.scene, barStartX, xpBarY, barWidth, xpBarHeight, {
                type: 'xp',
                current: xpProgress,
                max: xpRequired,
                fillColor: 0x00aaff, // Blue for XP
                borderColor: 0x0066aa,
                borderWidth: 1
            });
            xpBar.setScrollFactor(0);
            xpBar.setDepth(getUIDepth('UI_BARS'));

            // XP text below bar
            const xpText = this.scene.add.text(barStartX + barWidth / 2, xpBarY + xpBarHeight + 5,
                `XP: ${xpProgress}/${xpRequired}`, {
                font: `${getAccessibleFontSize(UI_THEME?.typography?.small || 12)}px ${UI_CONFIG.FONTS.PRIMARY}`,
                fill: `#${(UI_THEME?.text?.secondary || 0xCCCCCC).toString(16)}`,
                stroke: '#000000',
                strokeThickness: 1
            });
            xpText.setOrigin(0.5, 0);
            xpText.setScrollFactor(0);
            xpText.setDepth(getUIDepth('UI_TEXT'));

            // Buff/Debuff indicators (small icons on the right side of frame) - using config
            const statusContainerX = frameX + frameWidth / 2 + getScaledValue(config.STATUS_CONTAINER_X_OFFSET, _width);
            const statusContainerY = frameY - frameHeight / 2 + getScaledValue(config.STATUS_CONTAINER_Y_OFFSET, _height, 'height');
            const buffDebuffContainer = this.scene.add.container(statusContainerX, statusContainerY);
            buffDebuffContainer.setScrollFactor(0);
            buffDebuffContainer.setDepth(getUIDepth('UI_TEXT'));
            
            // Status effect icons will be added here dynamically
            const statusEffects = hero?.statusEffects || hero?.data?.statusEffects || {};
            const statusEffectIcons = [];
            
            // Create status effect icons - using config
            Object.entries(statusEffects).forEach(([effectType, effectData], index) => {
                if (!effectData || effectData.duration <= 0) return;
                
                const iconX = index * getScaledValue(config.STATUS_ICON_SPACING, _width);
                const iconSize = getScaledValue(config.STATUS_ICON_SIZE, _width);
                
                // Get effect definition from status effects manager if available
                const statusEffectsManager = this.scene.statusEffectsManager;
                const effectDef = statusEffectsManager?.effectTypes?.[effectType] || {
                    icon: '?',
                    color: '#ffffff'
                };
                
                // Icon background (colored circle)
                const iconBg = this.scene.add.circle(iconX, 0, iconSize / 2, 
                    parseInt(effectDef.color.replace('#', ''), 16) || 0xffffff, 0.7);
                iconBg.setScrollFactor(0);
                iconBg.setDepth(1103);
                
                // Icon text (emoji or symbol)
                const iconText = this.scene.add.text(iconX, 0, effectDef.icon || '?', {
                    font: `${iconSize - 4}px Arial`,
                    fill: '#ffffff'
                });
                iconText.setOrigin(0.5, 0.5);
                iconText.setScrollFactor(0);
                iconText.setDepth(1104);
                
                // Duration text (small number) - using config
                const durationFontSize = getAccessibleFontSize(config.STATUS_DURATION_FONT_SIZE);
                const durationText = this.scene.add.text(iconX, iconSize / 2 - 2, 
                    Math.ceil(effectData.duration || 0).toString(), {
                    font: `${durationFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 1
                });
                durationText.setOrigin(0.5, 0);
                durationText.setScrollFactor(0);
                durationText.setDepth(1104);
                
                buffDebuffContainer.add([iconBg, iconText, durationText]);
                
                statusEffectIcons.push({
                    type: effectType,
                    iconBg: iconBg,
                    iconText: iconText,
                    durationText: durationText,
                    container: buffDebuffContainer
                });
            });

            // Store all frame elements in frameData
            frameData.frame = frame;
            frameData.frameGlow = frameGlow;
            frameData.portrait = portraitSprite;
            frameData.portraitBorder = portraitBorder;
            frameData.portraitShadow = portraitShadow;
            frameData.nameText = nameText;
            frameData.levelText = levelText;
            frameData.healthBar = healthBar;
            frameData.healthText = healthText;
            frameData.manaBar = manaBar;
            frameData.manaText = manaText;
            frameData.xpBar = xpBar;
            frameData.xpText = xpText;
            frameData.statusEffects = statusEffectIcons;
            frameData.statusContainer = buffDebuffContainer;

            // Store frame data for efficient updates
            partyFrames.push(frameData);
        }

        return partyFrames;
    }

    /**
     * Create player frame (bottom-left) - WoW WOTLK style
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @returns {Object} Player frame elements
     */
    createPlayerFrame(width, height) {
        if (!isElementVisible('PLAYER_FRAME')) {
            return null;
        }
        
        if (!this.scene.partyManager) return null;

        const primaryHero = this.scene.partyManager.getTank() || this.scene.partyManager.getHeroByIndex(0);
        if (!primaryHero) return null;

        const config = UI_CONFIG.PLAYER_FRAME;
        const frameWidth = getScaledValue(config.FRAME_WIDTH, width);
        const frameHeight = getScaledValue(config.FRAME_HEIGHT, height, 'height');
        const frameX = getScaledValue(config.LEFT_MARGIN, width) + frameWidth / 2;
        const frameY = height - frameHeight / 2 - getScaledValue(config.BOTTOM_MARGIN, height, 'height');

        const classId = primaryHero.classId || 'paladin';
        const classColor = getClassColor(classId);

        // WoW-style player frame with enhanced styling - using config
        const frame = createWoWFrame(this.scene, frameX, frameY, frameWidth, frameHeight, {
            classColor: classColor,
            backgroundColor: config.FRAME_BACKGROUND_COLOR,
            backgroundAlpha: config.FRAME_BACKGROUND_ALPHA,
            borderWidth: config.FRAME_BORDER_WIDTH,
            shadow: true
        });
        frame.setScrollFactor(0);
        frame.setDepth(getUIDepth('UI_FRAMES'));
        
        // Additional frame glow for player frame - using config
        const frameGlow = this.scene.add.graphics();
        frameGlow.lineStyle(config.FRAME_GLOW_WIDTH, classColor, config.FRAME_GLOW_ALPHA);
        frameGlow.strokeRect(
            frameX - frameWidth / 2 - config.FRAME_GLOW_OFFSET, 
            frameY - frameHeight / 2 - config.FRAME_GLOW_OFFSET, 
            frameWidth + (config.FRAME_GLOW_OFFSET * 2), 
            frameHeight + (config.FRAME_GLOW_OFFSET * 2)
        );
        frameGlow.setScrollFactor(0);
        frameGlow.setDepth(getUIDepth('UI_BACKGROUND') - 1);

        // Character portrait (larger, for player frame) - WoW-style - using config
        const portraitSize = getScaledValue(config.PORTRAIT_SIZE, width);
        const portraitX = frameX - frameWidth / 2 + getScaledValue(config.PORTRAIT_X_OFFSET, width);
        const portraitY = frameY + getScaledValue(config.PORTRAIT_Y_OFFSET, height, 'height');
        
        // Generate portrait texture key
        const portraitKey = this.portraitGenerator.generatePortrait(primaryHero, portraitSize, `portrait_${primaryHero.id}_${portraitSize}`);
        
        // Create portrait sprite
        let portraitSprite = null;
        if (this.scene.textures.exists(portraitKey)) {
            portraitSprite = this.scene.add.sprite(portraitX, portraitY, portraitKey);
        } else {
            // Fallback: show placeholder while portrait generates
            const placeholderKey = this.portraitGenerator.getPlaceholderPortrait(portraitSize);
            portraitSprite = this.scene.add.sprite(portraitX, portraitY, placeholderKey);
            
            // Try to update when portrait is ready
            const checkPortrait = () => {
                if (this.scene.textures.exists(portraitKey)) {
                    portraitSprite.setTexture(portraitKey);
                } else {
                    this.scene.time.delayedCall(100, checkPortrait);
                }
            };
            this.scene.time.delayedCall(100, checkPortrait);
        }
        
        portraitSprite.setScrollFactor(0);
        portraitSprite.setDepth(1101);
        
        // Add enhanced circular border around portrait with depth - using config
        const portraitBorder = this.scene.add.graphics();
        // Outer glow
        portraitBorder.lineStyle(config.PORTRAIT_BORDER_OUTER_WIDTH, classColor, config.PORTRAIT_BORDER_OUTER_ALPHA);
        portraitBorder.strokeCircle(portraitX, portraitY, portraitSize / 2 + config.PORTRAIT_BORDER_GLOW_OFFSET);
        // Main border
        portraitBorder.lineStyle(config.PORTRAIT_BORDER_MAIN_WIDTH, classColor, config.PORTRAIT_BORDER_MAIN_ALPHA);
        portraitBorder.strokeCircle(portraitX, portraitY, portraitSize / 2);
        // Inner shadow
        portraitBorder.lineStyle(config.PORTRAIT_BORDER_INNER_WIDTH, 0x000000, config.PORTRAIT_BORDER_INNER_ALPHA);
        portraitBorder.strokeCircle(portraitX, portraitY, portraitSize / 2 - 1);
        portraitBorder.setScrollFactor(0);
        portraitBorder.setDepth(getUIDepth('UI_TEXT'));
        
        // Portrait shadow for depth - using config
        const portraitShadow = this.scene.add.graphics();
        portraitShadow.fillStyle(0x000000, config.PORTRAIT_SHADOW_ALPHA);
        portraitShadow.fillCircle(
            portraitX + getScaledValue(config.PORTRAIT_SHADOW_OFFSET_X, width),
            portraitY + getScaledValue(config.PORTRAIT_SHADOW_OFFSET_Y, height, 'height'),
            portraitSize / 2
        );
        portraitShadow.setScrollFactor(0);
        portraitShadow.setDepth(getUIDepth('UI_BACKGROUND'));

        // Name and level with enhanced styling - using config
        const heroName = primaryHero.name || classId;
        const heroLevel = primaryHero.level || 1;
        const nameX = frameX - frameWidth / 2 + getScaledValue(config.NAME_X_OFFSET, width);
        const nameY = frameY - frameHeight / 2 + getScaledValue(config.NAME_Y_OFFSET, height, 'height');
        const nameFontSize = getAccessibleFontSize(config.NAME_FONT_SIZE);
        const nameText = this.scene.add.text(nameX, nameY, heroName.toUpperCase(), {
            font: `bold ${nameFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: config.NAME_STROKE_WIDTH,
            shadow: { 
                offsetX: config.NAME_SHADOW_OFFSET_X, 
                offsetY: config.NAME_SHADOW_OFFSET_Y, 
                color: '#000000', 
                blur: config.NAME_SHADOW_BLUR, 
                fill: true 
            }
        });
        nameText.setScrollFactor(0);
        nameText.setDepth(getUIDepth('UI_TEXT'));

        const levelX = frameX + frameWidth / 2 + getScaledValue(config.LEVEL_X_OFFSET, width);
        const levelY = frameY - frameHeight / 2 + getScaledValue(config.LEVEL_Y_OFFSET, height, 'height');
        const levelFontSize = getAccessibleFontSize(config.LEVEL_FONT_SIZE);
        const levelText = this.scene.add.text(levelX, levelY, `Lv${heroLevel}`, {
            font: `bold ${levelFontSize}px ${UI_CONFIG.FONTS.PRIMARY}`,
            fill: `#${(UI_THEME?.accents?.gold?.base || 0xFFD700).toString(16)}`,
            stroke: '#000000',
            strokeThickness: config.LEVEL_STROKE_WIDTH,
            shadow: { 
                offsetX: config.LEVEL_SHADOW_OFFSET_X, 
                offsetY: config.LEVEL_SHADOW_OFFSET_Y, 
                color: '#000000', 
                blur: config.LEVEL_SHADOW_BLUR, 
                fill: true 
            }
        });
        levelText.setOrigin(1, 0);
        levelText.setScrollFactor(0);
        levelText.setDepth(getUIDepth('UI_TEXT'));

        // Health bar with enhanced styling - using config
        const barStartX = frameX - frameWidth / 2 + getScaledValue(config.BAR_START_X_OFFSET, width);
        const barWidth = getScaledValue(config.BAR_WIDTH, width);
        const healthBarY = frameY - frameHeight / 2 + getScaledValue(config.HEALTH_BAR_Y_OFFSET, height, 'height');
        const healthBarHeight = getScaledValue(config.HEALTH_BAR_HEIGHT, height, 'height');
        const healthBar = createWoWBar(this.scene, barStartX, healthBarY, barWidth, healthBarHeight, {
            type: 'health',
            current: primaryHero.currentStats?.health || primaryHero.baseStats?.health || 100,
            max: primaryHero.currentStats?.maxHealth || primaryHero.baseStats?.maxHealth || 100,
            borderColor: classColor,
            borderWidth: config.BAR_BORDER_WIDTH
        });
        healthBar.setScrollFactor(0);
        healthBar.setDepth(getUIDepth('UI_BARS'));

        // Mana/Resource bar with enhanced styling - using config
        const manaBarY = frameY - frameHeight / 2 + getScaledValue(config.MANA_BAR_Y_OFFSET, height, 'height');
        const manaBarHeight = getScaledValue(config.MANA_BAR_HEIGHT, height, 'height');
        const manaBar = createWoWBar(this.scene, barStartX, manaBarY, barWidth, manaBarHeight, {
            type: 'mana',
            current: primaryHero.currentStats?.mana || primaryHero.baseStats?.mana || primaryHero.currentResource || 100,
            max: primaryHero.currentStats?.maxMana || primaryHero.baseStats?.maxMana || primaryHero.maxResource || 100,
            borderColor: classColor,
            borderWidth: config.BAR_BORDER_WIDTH
        });
        manaBar.setScrollFactor(0);
        manaBar.setDepth(getUIDepth('UI_BARS'));

        this.playerFrame = {
            frame: frame,
            portrait: portraitSprite,
            portraitBorder: portraitBorder,
            nameText: nameText,
            levelText: levelText,
            healthBar: healthBar,
            manaBar: manaBar,
            heroId: primaryHero.id
        };

        return this.playerFrame;
    }

    /**
     * Create target frame (top-center) - WoW WOTLK style
     * @param {number} width - Screen width
     * @param {number} height - Screen height
     * @returns {Object} Target frame elements
     */
    createTargetFrame(width, height) {
        if (!isElementVisible('TARGET_FRAME')) {
            return null;
        }
        
        const config = UI_CONFIG.TARGET_FRAME;
        const frameWidth = getScaledValue(config.FRAME_WIDTH, width);
        const frameHeight = getScaledValue(config.FRAME_HEIGHT, height, 'height');
        const frameX = config.CENTER_X ? width / 2 : width / 2; // Always center for now
        const frameY = getScaledValue(config.TOP_MARGIN, height, 'height');

        // WoW-style target frame (hidden by default, shown when target exists) - using config
        const frame = createWoWFrame(this.scene, frameX, frameY, frameWidth, frameHeight, {
            borderColor: config.FRAME_BORDER_COLOR,
            backgroundColor: config.FRAME_BACKGROUND_COLOR,
            backgroundAlpha: config.FRAME_BACKGROUND_ALPHA,
            borderWidth: config.FRAME_BORDER_WIDTH,
            shadow: true
        });
        frame.setScrollFactor(0);
        frame.setDepth(getUIDepth('UI_FRAMES'));
        frame.setVisible(false); // Hidden until target is selected

        // Target name placeholder
        const nameText = this.scene.add.text(frameX, frameY - frameHeight / 2 + 15, 'No Target', {
            font: `bold ${UI_THEME.typography.frameBody}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        nameText.setOrigin(0.5, 0);
        nameText.setScrollFactor(0);
        nameText.setDepth(1101);

        // Target health bar
        const healthBar = createWoWBar(this.scene, frameX, frameY, frameWidth - 20, 20, {
            type: 'health',
            current: 100,
            max: 100,
            borderColor: UI_THEME.borders.gold,
            borderWidth: 1
        });
        healthBar.setScrollFactor(0);
        healthBar.setDepth(1101);

        this.targetFrame = {
            frame: frame,
            nameText: nameText,
            healthBar: healthBar
        };

        return this.targetFrame;
    }

    /**
     * Update target frame with enemy data
     * @param {Object} enemy - Enemy data or null to hide
     */
    updateTargetFrame(enemy) {
        if (!this.targetFrame) return;

        if (!enemy) {
            this.targetFrame.frame.setVisible(false);
            return;
        }

        this.targetFrame.frame.setVisible(true);
        this.targetFrame.nameText.setText(enemy.name || 'Unknown');
        
        if (this.targetFrame.healthBar && enemy.stats) {
            const healthPercent = (enemy.stats.health || 0) / (enemy.stats.maxHealth || 1);
            if (this.targetFrame.healthBar.fill) {
                const barWidth = this.targetFrame.healthBar.width || 180;
                this.targetFrame.healthBar.fill.width = barWidth * healthPercent;
            }
        }
    }

    /**
     * Set up keyboard shortcuts for UI
     */
    setupKeyboardShortcuts() {
        // Equipment panel toggle (E key)
        this.scene.input.keyboard.on('keydown-E', () => {
            SafeExecutor.execute(
                () => this.toggleEquipmentPanel(),
                null,
                'GameSceneUI.keyboard.E'
            );
        });

        // Inventory toggle (I key)
        this.scene.input.keyboard.on('keydown-I', () => {
            SafeExecutor.execute(
                () => this.toggleInventoryPanel(),
                null,
                'GameSceneUI.keyboard.I'
            );
        });

        // Shop panel toggle (S key)
        this.scene.input.keyboard.on('keydown-S', () => {
            SafeExecutor.execute(
                () => this.toggleShopPanel(),
                null,
                'GameSceneUI.keyboard.S'
            );
        });

        // Combat log toggle (L key)
        this.scene.input.keyboard.on('keydown-L', () => {
            SafeExecutor.execute(
                () => this.toggleCombatLog(),
                null,
                'GameSceneUI.keyboard.L'
            );
        });

        // Progression panel toggle (P key)
        this.scene.input.keyboard.on('keydown-P', () => {
            SafeExecutor.execute(
                () => this.toggleProgressionPanel(),
                null,
                'GameSceneUI.keyboard.P'
            );
        });

        // Talent panel toggle (T key)
        this.scene.input.keyboard.on('keydown-T', () => {
            SafeExecutor.execute(
                () => this.toggleTalentPanel(),
                null,
                'GameSceneUI.keyboard.T'
            );
        });

        // Hero details panel toggle (H key)
        this.scene.input.keyboard.on('keydown-H', () => {
            SafeExecutor.execute(
                () => this.toggleHeroDetailsPanel(),
                null,
                'GameSceneUI.keyboard.H'
            );
        });

        // Consumables panel toggle (C key)
        this.scene.input.keyboard.on('keydown-C', () => {
            SafeExecutor.execute(
                () => this.toggleConsumablesPanel(),
                null,
                'GameSceneUI.keyboard.C'
            );
        });

        // ESC key for closing panels
        this.scene.input.keyboard.on('keydown-ESC', () => {
            SafeExecutor.execute(
                () => this.closeAllPanels(),
                null,
                'GameSceneUI.keyboard.ESC'
            );
        });

        // F1 key for showing keyboard hints
        this.scene.input.keyboard.on('keydown-F1', () => {
            SafeExecutor.execute(
                () => this.showKeyboardHints(),
                null,
                'GameSceneUI.keyboard.F1'
            );
        });
    }

    /**
     * Update action bar button cooldown with visual feedback
     * @param {string} heroId - Hero ID
     * @param {string} abilityName - Ability name
     * @param {number} cooldown - Current cooldown
     * @param {number} maxCooldown - Maximum cooldown
     */
    updateActionBarCooldown(_heroId, abilityName, cooldown, maxCooldown) {
        if (!this.actionBarButtons || !Array.isArray(this.actionBarButtons)) return;

        // Find button by ability name
        const buttonData = this.actionBarButtons.find(b => 
            b.abilityName === abilityName || b.ability?.name === abilityName
        );

        if (!buttonData || !buttonData.button) return;

        // Calculate cooldown percent
        const cooldownPercent = maxCooldown > 0 ? Math.min(1, cooldown / maxCooldown) : 0;
        
        // Create or update cooldown overlay
        if (!buttonData.cooldownOverlay) {
            // Create cooldown overlay (darkened rectangle)
            const overlay = this.scene.add.rectangle(
                buttonData.button.x || 0,
                buttonData.button.y || 0,
                buttonData.button.width || 42,
                buttonData.button.height || 42,
                0x000000,
                0.7
            );
            overlay.setScrollFactor(0);
            overlay.setDepth(1103);
            buttonData.cooldownOverlay = overlay;
        }

        // Update cooldown overlay visibility and size
        if (cooldownPercent > 0) {
            buttonData.cooldownOverlay.setVisible(true);
            // Create a mask effect showing remaining cooldown
            const buttonSize = 42;
            const overlayHeight = buttonSize * cooldownPercent;
            buttonData.cooldownOverlay.setSize(buttonSize, overlayHeight);
            buttonData.cooldownOverlay.setY((buttonData.button.y || 0) - (buttonSize / 2) + (overlayHeight / 2));
        } else {
            buttonData.cooldownOverlay.setVisible(false);
        }

        // Update cooldown text if exists
        if (!buttonData.cooldownText && cooldown > 0) {
            buttonData.cooldownText = this.scene.add.text(
                buttonData.button.x || 0,
                buttonData.button.y || 0,
                Math.ceil(cooldown).toString(),
                {
                    font: 'bold 16px Arial',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            );
            buttonData.cooldownText.setOrigin(0.5, 0.5);
            buttonData.cooldownText.setScrollFactor(0);
            buttonData.cooldownText.setDepth(1104);
        } else if (buttonData.cooldownText) {
            if (cooldown > 0) {
                buttonData.cooldownText.setText(Math.ceil(cooldown).toString());
                buttonData.cooldownText.setVisible(true);
            } else {
                buttonData.cooldownText.setVisible(false);
            }
        }
    }

    /**
     * Handle action button clicks
     * @param {number} buttonIndex - Index of clicked button
     */
    onActionButtonClick(buttonIndex) {
        SafeExecutor.execute(() => {
            const combatManager = this.scene.combatManager;
            const partyManager = this.scene.partyManager;

            if (!combatManager || !partyManager) return;

            // Add button click juice (scale effect)
            const buttonData = this.actionBarButtons?.find(b => b.index === buttonIndex);
            if (buttonData?.button) {
                this.scene.tweens.add({
                    targets: buttonData.button,
                    scale: 0.9,
                    duration: 50,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });
            }

            // In this game, action bar buttons typically trigger abilities of the primary hero
            const primaryHero = partyManager.getTank() || partyManager.getHeroByIndex(0);
            if (!primaryHero) return;

            // Map button index to ability (simplified for now)
            const abilities = primaryHero.abilities || [];
            const ability = abilities[buttonIndex];

            if (ability && this.scene.abilityManager) {
                // Trigger ability through ability manager
                this.scene.abilityManager.useAbility(primaryHero, ability.id, combatManager.enemy);
                
                if (this.combatLog) {
                    // Fix 'undefined' ability name in log
                    const abilityName = ability.name || ability.id || 'Ability';
                    this.addCombatLogMessage(`Manual: ${primaryHero.name} uses ${abilityName}!`, 'system');
                }
            } else {
                console.log(`Action button ${buttonIndex + 1} clicked, but no ability assigned`);
            }
        }, null, 'GameSceneUI.onActionButtonClick');
    }

    /**
     * Toggle equipment panel
     */
    toggleEquipmentPanel() {
        if (!this.scene.equipmentManager) return;

        const manager = this.scene.equipmentManager;
        
        // Create display if it doesn't exist
        if (!manager.equipmentDisplay && manager.createEquipmentDisplay) {
            try {
                manager.createEquipmentDisplay();
            } catch (error) {
                console.error('Failed to create equipment display:', error);
                return;
            }
        }

        if (manager.equipmentDisplay) {
            const visible = manager.equipmentDisplay.visible;
            const nextVisible = !visible;
            manager.equipmentDisplay.setVisible(nextVisible);
            
            // Also toggle stats display
            if (manager.statDisplay) {
                manager.statDisplay.setVisible(nextVisible);
            }
            
            // Also hide tooltips when closing
            if (!nextVisible && this.scene.tooltipManager) {
                this.scene.tooltipManager.hideTooltip();
            }
            
            this.uiPanels.equipment = nextVisible;
        }
    }

    /**
     * Toggle inventory panel
     */
    toggleInventoryPanel() {
        if (!this.scene.lootManager) return;

        const manager = this.scene.lootManager;
        
        // Create display if it doesn't exist
        if (!manager.inventoryDisplay && manager.createInventoryDisplay) {
            try {
                manager.createInventoryDisplay();
            } catch (error) {
                console.error('Failed to create inventory display:', error);
                return;
            }
        }

        const visible = manager.toggleInventoryDisplay();
        this.uiPanels.inventory = visible;
        
        // Hide tooltips when closing
        if (!visible && this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }
    }

    /**
     * Toggle shop panel
     */
    toggleShopPanel() {
        if (!this.scene.shopManager) return;

        const manager = this.scene.shopManager;
        
        // Create display if it doesn't exist
        if (!manager.shopDisplay && manager.createShopDisplay) {
            try {
                manager.createShopDisplay();
            } catch (error) {
                console.error('Failed to create shop display:', error);
                return;
            }
        }

        if (manager.shopDisplay) {
            const visible = manager.shopDisplay.visible;
            const nextVisible = !visible;
            manager.shopDisplay.setVisible(nextVisible);
            
            this.uiPanels.shop = nextVisible;
        }
    }

    /**
     * Toggle combat log visibility
     */
    toggleCombatLog() {
        if (this.combatLog?.frame) {
            const visible = this.combatLog.frame.visible;
            this.combatLog.frame.setVisible(!visible);
            if (this.combatLog.text) {
                this.combatLog.text.setVisible(!visible);
            }
            if (this.combatLog.titleBar) {
                this.combatLog.titleBar.setVisible(!visible);
            }
            if (this.combatLog.titleBarBorder) {
                this.combatLog.titleBarBorder.setVisible(!visible);
            }
            if (this.combatLog.titleText) {
                this.combatLog.titleText.setVisible(!visible);
            }
            if (this.combatLog.scrollbarBg) {
                this.combatLog.scrollbarBg.setVisible(!visible);
            }
            if (this.combatLog.scrollbarBorder) {
                this.combatLog.scrollbarBorder.setVisible(!visible);
            }
        } else if (this.combatLog?.container) {
            const visible = this.combatLog.container.visible;
            this.combatLog.container.setVisible(!visible);
        }
    }

    /**
     * Toggle progression panel
     */
    toggleProgressionPanel() {
        if (!this.progressionPanel) return;

        const visible = !this.progressionPanel.visible;
        this.progressionPanel.visible = visible;
        this.progressionPanel.container.setVisible(visible);

        if (visible) {
            this.updateProgressionDisplay();
        } else if (this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }
    }

    /**
     * Update progression display with current data
     */
    updateProgressionDisplay() {
        if (!this.progressionText) return;

        const worldManager = this.scene.worldManager;
        const partyManager = this.scene.partyManager;
        
        const currentMile = worldManager?.currentMile || 0;
        const maxMileReached = worldManager?.maxMileReached || 0;
        
        let avgLevel = 0;

        if (partyManager) {
            const heroes = partyManager.getHeroes();
            if (heroes.length > 0) {
                avgLevel = heroes.reduce((sum, h) => sum + (h.level || 1), 0) / heroes.length;
            }
        }

        const statsText = [
            `Current Mile: ${currentMile}`,
            `Max Mile: ${maxMileReached}`,
            `Avg Hero Level: ${avgLevel.toFixed(1)}`,
            '',
            'Keep pushing forward!'
        ].join('\n');

        this.progressionText.setText(statsText);
    }

    /**
     * Close all open panels
     */
    closeAllPanels() {
        this.uiPanels.equipment = false;
        this.uiPanels.inventory = false;
        this.uiPanels.shop = false;
        
        // Ensure LootManager inventory is closed
        if (this.scene.lootManager && this.scene.lootManager.inventoryDisplay?.visible) {
            this.scene.lootManager.toggleInventoryDisplay();
        }
        
        this.updatePanelVisibility();
    }

    /**
     * Update panel visibility based on uiPanels state
     */
    updatePanelVisibility() {
        // Implementation would show/hide actual panel UI elements
        // This is a placeholder for the actual panel management logic
        console.log('Panel visibility updated:', this.uiPanels);
    }

    /**
     * Create performance monitor (FPS counter, frame time, memory)
     */
    createPerformanceMonitor() {
        // Only show in development
        if (process.env.NODE_ENV !== 'development') return;

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const fontSize = getScaledValue(SCENE_CONFIG.FONT_SIZES.CAPTION || 12, height, 'height');
        const x = getScaledValue(10, width);
        const y = height - getScaledValue(30, height, 'height');

        // FPS display
        this.performanceText = this.scene.add.text(x, y, 'FPS: 60', {
            fill: SCENE_CONFIG.COLORS.TEXT_ACCENT,
            fontSize: fontSize,
            stroke: '#000000',
            strokeThickness: 1
        });
        this.performanceText.setOrigin(0, 1);
        this.performanceText.setScrollFactor(0);
        this.performanceText.setDepth(9999);

        // Frame time display (below FPS)
        this.frameTimeText = this.scene.add.text(x, y - getScaledValue(18, height, 'height'), 'Frame: 16ms', {
            fill: SCENE_CONFIG.COLORS.TEXT_SECONDARY || 0xe0e0e0,
            fontSize: fontSize - 1,
            stroke: '#000000',
            strokeThickness: 1
        });
        this.frameTimeText.setOrigin(0, 1);
        this.frameTimeText.setScrollFactor(0);
        this.frameTimeText.setDepth(9999);

        // Memory display (below frame time)
        this.memoryText = this.scene.add.text(x, y - getScaledValue(36, height, 'height'), 'Memory: 0MB', {
            fill: SCENE_CONFIG.COLORS.TEXT_SECONDARY || 0xe0e0e0,
            fontSize: fontSize - 1,
            stroke: '#000000',
            strokeThickness: 1
        });
        this.memoryText.setOrigin(0, 1);
        this.memoryText.setScrollFactor(0);
        this.memoryText.setDepth(9999);
    }

    /**
     * Update performance monitor display
     * @param {Object} stats - Performance statistics
     */
    updatePerformanceMonitor(stats) {
        if (!stats) return;

        // Update FPS display
        if (this.performanceText) {
            const fps = stats.currentFps || stats.fps || 60;
            const color = fps >= 55 ? SCENE_CONFIG.COLORS.TEXT_ACCENT :
                fps >= 30 ? '#ffff00' : '#ff0000';

            this.performanceText.setText(`FPS: ${Math.round(fps)}`);
            this.performanceText.setFill(color);
        }

        // Update frame time display
        if (this.frameTimeText) {
            const frameTime = stats.frameTime || stats.delta || 16;
            const frameTimeColor = frameTime < 20 ? SCENE_CONFIG.COLORS.TEXT_SECONDARY || 0xe0e0e0 :
                frameTime < 33 ? '#ffff00' : '#ff0000';

            this.frameTimeText.setText(`Frame: ${Math.round(frameTime)}ms`);
            this.frameTimeText.setFill(frameTimeColor);
        }

        // Update memory display
        if (this.memoryText) {
            let usedMB = 0;
            if (this.scene.memoryMonitor) {
                const memoryInfo = this.scene.memoryMonitor.getCurrentMemory();
                if (memoryInfo) {
                    usedMB = memoryInfo.used || 0;
                }
            } else if (typeof performance !== 'undefined' && performance.memory) {
                // Fallback to performance.memory API
                usedMB = performance.memory.usedJSHeapSize / 1048576;
            }

            if (usedMB > 0) {
                const memoryColor = usedMB < 100 ? SCENE_CONFIG.COLORS.TEXT_SECONDARY || 0xe0e0e0 :
                    usedMB < 150 ? '#ffff00' : '#ff0000';

                this.memoryText.setText(`Memory: ${Math.round(usedMB)}MB`);
                this.memoryText.setFill(memoryColor);
            }
        }
    }

    /**
     * Add message to combat log with enhanced formatting
     * @param {string} message - Message to add
     * @param {string} type - Message type (damage, heal, system, etc.)
     */
    addCombatLogMessage(message, type = 'info') {
        if (!this.combatLog?.text) return;

        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = this.formatCombatMessage(message, type);

        // Add new message
        const currentText = this.combatLog.text.text || '';
        const newText = currentText + `[${timestamp}] ${formattedMessage}\n`;

        // Limit log length (keep last 150 lines for better history)
        const lines = newText.split('\n');
        if (lines.length > 150) {
            lines.splice(0, lines.length - 150);
        }

        // Update text with color styling
        this.combatLog.text.setText(lines.join('\n'));
        
        // Apply color based on type
        const color = this.getCombatLogColor(type);
        if (color && this.combatLog.text.style) {
            // Note: Phaser text doesn't support per-line colors easily
            // This is a simplified approach - full implementation would use BitmapText or multiple text objects
        }

        // Auto-scroll to bottom
        if (this.combatLog.getMaxScroll) {
            const maxScroll = this.combatLog.getMaxScroll();
            if (this.combatLog.scrollTo) {
                this.combatLog.scrollTo(maxScroll);
            }
        }
    }

    /**
     * Format combat message with type-specific prefixes
     * @param {string} message - Raw message
     * @param {string} type - Message type
     * @returns {string} Formatted message
     */
    formatCombatMessage(message, type) {
        const prefixes = {
            damage: '⚔',
            heal: '✨',
            buff: '⬆',
            debuff: '⬇',
            loot: '💰',
            system: 'ℹ',
            error: '⚠',
            info: ''
        };
        
        const prefix = prefixes[type] || '';
        return prefix ? `${prefix} ${message}` : message;
    }

    /**
     * Get color for combat log message type
     * @param {string} type - Message type
     * @returns {string} Hex color code
     */
    getCombatLogColor(type) {
        const colors = {
            damage: '#ff6b6b',      // Red for damage
            heal: '#51cf66',        // Green for healing
            buff: '#ffd43b',        // Yellow for buffs
            debuff: '#ff8787',      // Light red for debuffs
            loot: '#ffd700',        // Gold for loot
            system: '#74c0fc',      // Blue for system
            error: '#ff0000',        // Red for errors
            info: '#ffffff'          // White for info
        };
        return colors[type] || colors.info;
    }

    /**
     * Colorize combat message based on type - WoW WOTLK style
     * @param {string} message - Raw message
     * @param {string} type - Message type (damage, heal, system, etc.)
     * @returns {string} Colorized message with HTML-style color tags
     */
    colorizeCombatMessage(message, type) {
        // Enhanced formatting with type-specific styling
        return this.formatCombatMessage(message, type);
    }

    /**
     * Update UI layout for screen resize
     * @param {number} width - New width
     * @param {number} height - New height
     */
    onResize(width, height) {
        SafeExecutor.execute(() => {
            // Update UI builder viewport
            this.scene.uiBuilder.updateViewport(width, height);

            // Recreate or reposition UI elements
            // This would reposition all UI elements based on new dimensions
            console.log(`UI resized to ${width}x${height}`);
        }, null, 'GameSceneUI.onResize');
    }

    /**
     * Refresh portraits for all heroes (call when equipment changes)
     */
    refreshPortraits() {
        // Clear portrait cache to force regeneration
        if (this.portraitGenerator) {
            this.portraitGenerator.clearCache();
        }

        // Refresh party frame portraits
        if (this.uiLayout?.party) {
            this.uiLayout.party.forEach((frameData) => {
                if (frameData.portrait && frameData.heroId) {
                    const hero = this.scene.partyManager?.getHeroById(frameData.heroId);
                    if (hero) {
                        const portraitSize = getScaledValue(UI_CONFIG.PARTY_FRAMES.PORTRAIT_SIZE, this.scene.scale.width);
                        const portraitKey = this.portraitGenerator.generatePortrait(hero, portraitSize, `portrait_${hero.id}_${portraitSize}`);
                        // Update texture when ready
                        const checkPortrait = () => {
                            if (this.scene.textures.exists(portraitKey)) {
                                frameData.portrait.setTexture(portraitKey);
                            } else {
                                this.scene.time.delayedCall(100, checkPortrait);
                            }
                        };
                        this.scene.time.delayedCall(100, checkPortrait);
                    }
                }
            });
        }

        // Refresh player frame portrait
        if (this.playerFrame?.portrait && this.playerFrame.heroId) {
            const hero = this.scene.partyManager?.getHeroById(this.playerFrame.heroId);
            if (hero) {
                const portraitSize = getScaledValue(UI_CONFIG.PLAYER_FRAME.PORTRAIT_SIZE, this.scene.scale.width);
                const portraitKey = this.portraitGenerator.generatePortrait(hero, portraitSize, `portrait_${hero.id}_${portraitSize}`);
                // Update texture when ready
                const checkPortrait = () => {
                    if (this.scene.textures.exists(portraitKey)) {
                        this.playerFrame.portrait.setTexture(portraitKey);
                    } else {
                        this.scene.time.delayedCall(100, checkPortrait);
                    }
                };
                this.scene.time.delayedCall(100, checkPortrait);
            }
        }
    }

    /**
     * Clean up UI elements
     */
    cleanup() {
        // Stop update loop
        if (this.updateInterval) {
            this.updateInterval.remove();
            this.updateInterval = null;
        }

        // Clear portrait cache
        if (this.portraitGenerator) {
            this.portraitGenerator.clearCache();
        }

        // Clean up UI elements through resource manager
        this.uiElements.forEach((element, key) => {
            SafeExecutor.execute(() => {
                // Elements are cleaned up by the resource manager
                // Additional UI-specific cleanup can go here
            }, null, `GameSceneUI.cleanup.${key}`);
        });

        this.uiElements.clear();
    }

    /**
     * Update the world progress display bar and text
     */
    updateWorldProgressDisplay() {
        if (!this.worldProgressBar || !this.worldProgressText || !this.scene.worldManager) return;

        const currentMile = this.scene.worldManager.getCurrentMile() || 0;
        const maxMiles = this.scene.worldManager.worldConfig?.roadToWar?.maxMiles || 100;
        const progress = Math.min(currentMile / maxMiles, 1);

        // Update progress bar width (max width is 300)
        const progressBarWidth = 300 * progress;
        this.worldProgressBar.width = progressBarWidth;

        // Update progress text
        const progressPercent = Math.round(progress * 100);
        this.worldProgressText.setText(`${progressPercent}% Complete`);

        // Color code based on progress
        let barColor = UI_THEME.accents.gold.base;
        if (progress >= 0.75) {
            barColor = 0x00ff00; // Green for near completion
        } else if (progress >= 0.5) {
            barColor = 0xffff00; // Yellow for halfway
        } else if (progress >= 0.25) {
            barColor = 0xff8800; // Orange for quarter
        } else {
            barColor = 0xff4444; // Red for early game
        }
        this.worldProgressBar.setFillStyle(barColor);
    }

    /**
     * Get UI statistics
     * @returns {Object} UI statistics
     */
    getUIStats() {
        return {
            panels: { ...this.uiPanels },
            elements: this.uiElements.size,
            layout: !!this.uiLayout,
            actionBar: !!this.actionBarButtons,
            combatLog: !!this.combatLog
        };
    }

    /**
     * Toggle talent allocation panel
     */
    toggleTalentPanel() {
        if (!this.scene.talentManager) return;

        // Launch talent allocation scene
        this.scene.scene.launch('TalentAllocationScene', {
            hero: this.scene.partyManager?.getHeroes()?.[0], // Default to first hero
            onClose: () => {
                // Refresh UI when talent panel closes
                this.refreshUI();
            }
        });
    }

    /**
     * Toggle hero details panel
     */
    toggleHeroDetailsPanel() {
        if (!this.scene.uiManager) return;
        this.scene.uiManager.toggleHeroDetailsPanel();
    }

    /**
     * Toggle consumables panel
     */
    toggleConsumablesPanel() {
        if (!this.scene.uiManager?.consumablesUI) return;
        this.scene.uiManager.consumablesUI.toggleConsumablesPanel();
    }

    /**
     * Toggle party overview panel
     * Shows summary of all party members with key stats
     */
    togglePartyOverview() {
        if (!this.scene.partyManager) return;
        
        // Toggle party overview panel visibility
        if (this.uiPanels.partyOverview) {
            this.hidePartyOverview();
        } else {
            this.showPartyOverview();
        }
    }

    /**
     * Show party overview panel
     */
    showPartyOverview() {
        if (this.uiPanels.partyOverview) return;
        
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const panelWidth = getScaledValue(400, width);
        const panelHeight = getScaledValue(500, height, 'height');
        const panelX = width / 2;
        const panelY = height / 2;
        
        // Create panel container
        const panel = this.scene.add.container(panelX, panelY);
        panel.setScrollFactor(0);
        panel.setDepth(SCENE_CONFIG.DEPTH?.UI_PANEL || 1000);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(UI_CONFIG.PANELS.COMMON.BACKGROUND_COLOR || 0x1a1a2e, UI_CONFIG.PANELS.COMMON.BACKGROUND_ALPHA || 0.95);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, UI_CONFIG.PANELS.COMMON.CORNER_RADIUS || 12);
        bg.lineStyle(UI_CONFIG.PANELS.COMMON.BORDER_WIDTH || 3, UI_CONFIG.PANELS.COMMON.BORDER_COLOR || 0xffd700, 1.0);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, UI_CONFIG.PANELS.COMMON.CORNER_RADIUS || 12);
        panel.add(bg);
        
        // Title
        const titleFontSize = getScaledValue(UI_CONFIG.PANELS.COMMON.TITLE_FONT_SIZE || 24, height, 'height');
        const title = this.scene.add.text(0, -panelHeight/2 + getScaledValue(30, height, 'height'), 'Party Overview', {
            font: `bold ${titleFontSize}px Arial`,
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        });
        title.setOrigin(0.5, 0.5);
        panel.add(title);
        
        // Party members list
        const heroes = this.scene.partyManager.getHeroes();
        const startY = -panelHeight/2 + getScaledValue(80, height, 'height');
        const lineHeight = getScaledValue(80, height, 'height');
        const fontSize = getScaledValue(14, height, 'height');
        
        heroes.forEach((hero, index) => {
            const yPos = startY + (index * lineHeight);
            const heroName = hero.name || `Hero ${index + 1}`;
            const heroLevel = hero.level || 1;
            const heroRole = hero.role || 'dps';
            const currentHealth = hero.currentStats?.health || hero.baseStats?.health || 100;
            const maxHealth = hero.currentStats?.maxHealth || hero.baseStats?.maxHealth || 100;
            const healthPercent = Math.floor((currentHealth / maxHealth) * 100);
            
            const roleIcon = heroRole === 'tank' ? '🛡️' : heroRole === 'healer' ? '✨' : '⚔️';
            const roleColor = heroRole === 'tank' ? '#3aa7ff' : heroRole === 'healer' ? '#4cd964' : '#ff9f43';
            
            const heroText = this.scene.add.text(-panelWidth/2 + getScaledValue(20, width), yPos, 
                `${roleIcon} ${heroName} (Lv${heroLevel}) - HP: ${healthPercent}%`, {
                font: `${fontSize}px Arial`,
                fill: roleColor,
                stroke: '#000000',
                strokeThickness: 1
            });
            heroText.setOrigin(0, 0.5);
            panel.add(heroText);
        });
        
        // Close button
        const closeButton = createWoWButton(this.scene, panelWidth/2 - getScaledValue(30, width), -panelHeight/2 + getScaledValue(30, height, 'height'), 20, {
            icon: '×',
            onClick: () => {
                this.hidePartyOverview();
            }
        });
        panel.add(closeButton);
        
        // Store panel reference
        this.uiPanels.partyOverview = panel;
    }

    /**
     * Hide party overview panel
     */
    hidePartyOverview() {
        if (this.uiPanels.partyOverview) {
            this.uiPanels.partyOverview.destroy();
            this.uiPanels.partyOverview = null;
        }
    }

    /**
     * Show keyboard shortcut hints on UI elements
     */
    showKeyboardHints() {
        // Create a comprehensive help panel with all shortcuts
        this.showHelpPanel();
    }

    /**
     * Show comprehensive help panel with all keyboard shortcuts
     */
    showHelpPanel() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Create help panel - Using UI_CONFIG
        const helpConfig = UI_CONFIG.HELP_PANEL;
        const panelWidth = getScaledValue(helpConfig.WIDTH, width);
        const panelHeight = getScaledValue(helpConfig.HEIGHT, width, 'height');
        const x = width / 2;
        const y = height / 2;

        const helpPanel = this.scene.add.container(x, y);
        helpPanel.setDepth(3000);
        helpPanel.setScrollFactor(0);

        // Background - Using UI_CONFIG
        const bg = this.scene.add.graphics();
        bg.fillStyle(helpConfig.BACKGROUND_COLOR, helpConfig.BACKGROUND_ALPHA);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, helpConfig.BORDER_RADIUS);
        bg.lineStyle(helpConfig.BORDER_WIDTH, helpConfig.BORDER_COLOR, 1);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, helpConfig.BORDER_RADIUS);
        helpPanel.add(bg);

        // Title - Using UI_CONFIG
        const titleY = getScaledValue(helpConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(helpConfig.TITLE_FONT_SIZE, width, 'font');
        const title = this.scene.add.text(0, titleY, 'KEYBOARD SHORTCUTS', {
            font: `bold ${titleFontSize}px Arial`,
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        });
        title.setOrigin(0.5);
        helpPanel.add(title);

        // Shortcuts list
        const shortcuts = [
            { key: 'E', description: 'Equipment Panel' },
            { key: 'I', description: 'Inventory Panel' },
            { key: 'T', description: 'Talent Panel' },
            { key: 'H', description: 'Hero Details Panel' },
            { key: 'C', description: 'Consumables Panel' },
            { key: 'P', description: 'Progression Panel' },
            { key: 'S', description: 'Shop Panel' },
            { key: 'L', description: 'Combat Log' },
            { key: 'F1', description: 'Show This Help' },
            { key: 'ESC', description: 'Close All Panels' }
        ];

        let yOffset = getScaledValue(helpConfig.SHORTCUT_START_Y, width, 'height');
        const shortcutSpacing = getScaledValue(helpConfig.SHORTCUT_SPACING, width, 'height');
        const keyFontSize = getScaledValue(helpConfig.KEY_FONT_SIZE, width, 'font');
        const descFontSize = getScaledValue(helpConfig.DESC_FONT_SIZE, width, 'font');
        const keyX = getScaledValue(helpConfig.KEY_X_OFFSET, width);
        const descX = getScaledValue(helpConfig.DESC_X_OFFSET, width);
        
        shortcuts.forEach(shortcut => {
            // Key - Using UI_CONFIG
            const keyText = this.scene.add.text(keyX, yOffset, `[${shortcut.key}]`, {
                font: `bold ${keyFontSize}px Arial`,
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 1
            });
            helpPanel.add(keyText);

            // Description - Using UI_CONFIG
            const descText = this.scene.add.text(descX, yOffset, shortcut.description, {
                font: `${descFontSize}px Arial`,
                fill: '#ffffff'
            });
            helpPanel.add(descText);

            yOffset += shortcutSpacing;
        });

        // Close instructions - Using UI_CONFIG
        const closeTextY = getScaledValue(helpConfig.CLOSE_TEXT_Y_OFFSET, width, 'height');
        const closeTextFontSize = getScaledValue(helpConfig.CLOSE_TEXT_FONT_SIZE, width, 'font');
        const closeText = this.scene.add.text(0, closeTextY, 'Press ESC or click outside to close', {
            font: `${closeTextFontSize}px Arial`,
            fill: '#888888'
        });
        closeText.setOrigin(0.5);
        helpPanel.add(closeText);

        // Make panel interactive to close on click
        const hitArea = this.scene.add.zone(0, 0, panelWidth, panelHeight);
        hitArea.setInteractive();
        helpPanel.add(hitArea);

        hitArea.on('pointerdown', () => {
            helpPanel.destroy();
        });

        // Auto-close after 10 seconds
        this.scene.time.delayedCall(10000, () => {
            if (helpPanel && helpPanel.destroy) {
                helpPanel.destroy();
            }
        });
    }
}



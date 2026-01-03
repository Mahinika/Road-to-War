/**
 * Event Handler - Handles general event listeners and setup
 * Extracted from GameScene to improve separation of concerns
 */

import { GameEvents } from '../../utils/event-constants.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';
import { SCENE_CONFIG } from '../../config/scene-config.js';

export class EventHandler {
    /**
     * Create a new EventHandler
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.partyManager = managers.partyManager;
        this.equipmentManager = managers.equipmentManager;
        this.lootManager = managers.lootManager;
        this.shopManager = managers.shopManager;
        this.statisticsManager = managers.statisticsManager;
        this.achievementManager = managers.achievementManager;
        this.worldManager = managers.worldManager;
        this.audioManager = managers.audioManager;
        this.particleManager = managers.particleManager;
        this.heroRenderer = managers.heroRenderer;
        this.updateCombatLog = managers.updateCombatLog || (() => {});
        this.primaryHero = managers.primaryHero || null;
        this.mileDisplay = managers.mileDisplay || null;
    }

    /**
     * Set up world events and listeners
     */
    setupWorldEvents() {
        // Item pickup events
        this.scene.events.on(GameEvents.ITEM.PICKED_UP, (data) => {
            this.handleItemPickup(data);
        });

        // Equipment change events
        this.scene.events.on(GameEvents.ITEM.EQUIPMENT_CHANGED, (data) => {
            this.handleEquipmentChange(data);
        });

        // Item purchase events
        this.scene.events.on(GameEvents.ITEM.PURCHASED, (data) => {
            this.handleItemPurchase(data);
        });

        // Gold change events
        this.scene.events.on(GameEvents.ECONOMY.GOLD_CHANGED, (data) => {
            this.handleGoldChange(data);
        });
        
        // Mile change events
        this.scene.events.on(GameEvents.WORLD.MILE_CHANGED, (data) => {
            this.handleMileChange(data);
        });
    }

    /**
     * Handle item pickup event
     * @param {Object} data - Item pickup event data
     */
    handleItemPickup(data) {
        if (this.audioManager) {
            this.audioManager.playSound('loot_pickup', { volume: 0.6 });
        }
        
        if (data.item && data.item.x && data.item.y && this.particleManager) {
            this.particleManager.createExplosion(data.item.x, data.item.y, 'loot', 20);
            this.particleManager.createFloatingText(
                data.item.x, 
                data.item.y - 20, 
                data.item.data.name, 
                '#00ff00', 
                16
            );
        }
        
        if (this.lootManager && this.lootManager.inventoryDisplay && this.lootManager.inventoryDisplay.visible) {
            this.lootManager.updateInventoryDisplay();
        }
        
        this.updateCombatLog(`Found ${data.item.data.name}!`);
    }

    /**
     * Handle equipment change event
     * @param {Object} data - Equipment change event data
     */
    handleEquipmentChange(data) {
        if (this.primaryHero && this.primaryHero.x && this.primaryHero.y && this.particleManager) {
            const effectType = data.itemId ? 'loot' : 'gold';
            this.particleManager.createExplosion(this.primaryHero.x, this.primaryHero.y, effectType, 15);
            
            const action = data.itemId ? 'Equipped' : 'Unequipped';
            this.particleManager.createFloatingText(
                this.primaryHero.x, 
                this.primaryHero.y - 40, 
                `${data.slot}: ${action}`, 
                data.itemId ? '#00ff00' : '#ff9900', 
                14
            );
        }

        // Trigger sprite regeneration if heroRenderer is available
        if (this.heroRenderer && data.heroId) {
            const hero = this.partyManager?.getHeroById(data.heroId);
            if (hero) {
                this.heroRenderer.updateHeroSprite(hero);
            }
        }
        
        if (this.audioManager) {
            this.audioManager.playSound('equip_item', { volume: 0.5 });
        }
        
        if (this.lootManager && this.lootManager.inventoryDisplay && this.lootManager.inventoryDisplay.visible) {
            this.lootManager.updateInventoryDisplay();
        }
        
        this.updateCombatLog(`${data.slot} ${data.itemId ? 'equipped' : 'unequipped'}`);
    }

    /**
     * Handle item purchase event
     * @param {Object} data - Item purchase event data
     */
    handleItemPurchase(data) {
        if (this.audioManager) {
            this.audioManager.playSound('purchase', { volume: 0.7 });
        }
        
        if (this.particleManager && this.scene && this.scene.cameras) {
            const width = this.scene.cameras.main.width;
            const height = this.scene.cameras.main.height;
            this.particleManager.createExplosion(width / 2, height / 2, 'shop', 30);
            this.particleManager.createFloatingText(
                width / 2, 
                height / 2 - 40, 
                `Purchased ${data.item.data.name}!`, 
                '#00ffff', 
                18
            );
        }
        
        this.updateCombatLog(`Purchased ${data.item.data.name}!`);
        
        // Add purchased item to loot manager inventory
        if (this.lootManager && this.lootManager.inventory) {
            this.lootManager.inventory.push({
                ...data.item,
                pickedUpAt: Date.now()
            });
        }
    }

    /**
     * Handle gold change event
     * @param {Object} data - Gold change event data
     */
    handleGoldChange(data) {
        // Gold changes are handled by UI updates, no action needed here
    }

    /**
     * Handle mile change event
     * @param {Object} data - Mile change event data
     */
    handleMileChange(data) {
        if (this.mileDisplay && this.worldManager) {
            const maxMiles = this.worldManager.worldConfig?.roadToWar?.maxMiles || 100;
            this.mileDisplay.setText(`Mile ${data.currentMile}/${maxMiles}`);

            // Show milestone notifications
            if (data.currentMile > 0 && this.scene && this.scene.cameras) {
                const majorMilestones = [25, 50, 75, 100];
                const isMajorMilestone = majorMilestones.includes(data.currentMile);
                const isRegularMilestone = data.currentMile % 5 === 0;

                if (isMajorMilestone || isRegularMilestone) {
                    const config = UI_CONFIG.NOTIFICATIONS;
                    const typeConfig = isMajorMilestone ? config.TYPES.WARNING : config.TYPES.LOOT;
                    const width = this.scene.cameras.main.width;
                    const height = this.scene.cameras.main.height;
                    
                    const milestoneMessage = isMajorMilestone
                        ? `🏆 MAJOR MILESTONE: Mile ${data.currentMile} Reached! 🏆`
                        : `Mile ${data.currentMile} Reached!`;

                    // Create notification using UI_CONFIG
                    const notification = this.scene.add.container(width / 2, height / 2);
                    notification.setScrollFactor(0);
                    notification.setDepth(SCENE_CONFIG.DEPTH?.NOTIFICATIONS || 2000);

                    const panelWidth = getScaledValue(config.WIDTH, width);
                    const panelHeight = getScaledValue(config.HEIGHT, height, 'height');
                    const bg = this.scene.add.graphics();
                    bg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
                    bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
                    bg.lineStyle(config.BORDER_WIDTH, typeConfig.border, config.BORDER_ALPHA);
                    bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
                    notification.add(bg);

                    const fontSize = getScaledValue(isMajorMilestone ? config.FONT_SIZE + 8 : config.FONT_SIZE + 3, height, 'height');
                    const messageText = this.scene.add.text(0, 0, milestoneMessage, {
                        font: `bold ${fontSize}px Arial`,
                        fill: typeConfig.text,
                        stroke: '#000000',
                        strokeThickness: getScaledValue(config.STROKE_WIDTH, height, 'height')
                    });
                    messageText.setOrigin(0.5, 0.5);
                    notification.add(messageText);

                    // Animate in
                    notification.setAlpha(0);
                    notification.setScale(0.5);
                    notification.y = height / 2 - getScaledValue(config.SLIDE_DISTANCE, height, 'height');

                    this.scene.tweens.add({
                        targets: notification,
                        alpha: 1,
                        scale: 1,
                        y: height / 2,
                        duration: config.SLIDE_IN_DURATION,
                        ease: 'Back.easeOut'
                    });

                    // Show additional celebration for major milestones
                    if (isMajorMilestone) {
                        this.scene.time.delayedCall(500, () => {
                            const congratsNotification = this.scene.add.container(width / 2, height / 2 + getScaledValue(60, height, 'height'));
                            congratsNotification.setScrollFactor(0);
                            congratsNotification.setDepth(SCENE_CONFIG.DEPTH?.NOTIFICATIONS || 2000);

                            const congratsBg = this.scene.add.graphics();
                            congratsBg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
                            congratsBg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
                            congratsBg.lineStyle(config.BORDER_WIDTH, config.TYPES.SUCCESS.border, config.BORDER_ALPHA);
                            congratsBg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
                            congratsNotification.add(congratsBg);

                            const congratsFontSize = getScaledValue(config.FONT_SIZE + 3, height, 'height');
                            const congratsText = this.scene.add.text(0, 0, '🎉 Congratulations! 🎉', {
                                font: `bold ${congratsFontSize}px Arial`,
                                fill: config.TYPES.SUCCESS.text,
                                stroke: '#000000',
                                strokeThickness: getScaledValue(config.STROKE_WIDTH, height, 'height')
                            });
                            congratsText.setOrigin(0.5, 0.5);
                            congratsNotification.add(congratsText);

                            congratsNotification.setAlpha(0);
                            congratsNotification.setScale(0.5);

                            this.scene.tweens.add({
                                targets: congratsNotification,
                                alpha: 1,
                                scale: 1,
                                duration: config.SLIDE_IN_DURATION,
                                ease: 'Back.easeOut',
                                onComplete: () => {
                                    this.scene.time.delayedCall(config.DISPLAY_DURATION, () => {
                                        this.scene.tweens.add({
                                            targets: congratsNotification,
                                            alpha: 0,
                                            scale: 0.8,
                                            duration: config.FADE_OUT_DURATION,
                                            ease: 'Back.easeIn',
                                            onComplete: () => congratsNotification.destroy()
                                        });
                                    });
                                }
                            });
                        });
                    }

                    // Auto-remove after configured duration
                    this.scene.time.delayedCall(config.DISPLAY_DURATION, () => {
                        this.scene.tweens.add({
                            targets: notification,
                            alpha: 0,
                            scale: 0.8,
                            duration: config.FADE_OUT_DURATION,
                            ease: 'Back.easeIn',
                            onComplete: () => notification.destroy()
                        });
                    });

                    // Enhanced sound for major milestones
                    if (this.audioManager) {
                        const soundName = isMajorMilestone ? 'victory' : 'milestone';
                        const volume = isMajorMilestone ? 0.7 : 0.5;
                        this.audioManager.playSound(soundName, { volume });
                    }
                }

                // Special "Journey Complete" notification
                if (data.currentMile >= 100 && data.previousMile < 100) {
                    const config = UI_CONFIG.NOTIFICATIONS;
                    const width = this.scene.cameras.main.width;
                    const height = this.scene.cameras.main.height;
                    
                    this.scene.time.delayedCall(1000, () => {
                        const victoryNotification = this.scene.add.container(width / 2, height / 2);
                        victoryNotification.setScrollFactor(0);
                        victoryNotification.setDepth(SCENE_CONFIG.DEPTH?.NOTIFICATIONS || 2000);

                        const panelWidth = getScaledValue(config.WIDTH + 100, width);
                        const panelHeight = getScaledValue(config.HEIGHT + 20, height, 'height');
                        const bg = this.scene.add.graphics();
                        bg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
                        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
                        bg.lineStyle(config.BORDER_WIDTH + 2, config.TYPES.ERROR.border, config.BORDER_ALPHA);
                        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
                        victoryNotification.add(bg);

                        const victoryFontSize = getScaledValue(config.FONT_SIZE + 15, height, 'height');
                        const victoryText = this.scene.add.text(0, 0, '🎊 JOURNEY COMPLETE! 🎊', {
                            font: `bold ${victoryFontSize}px Arial`,
                            fill: config.TYPES.ERROR.text,
                            stroke: '#000000',
                            strokeThickness: getScaledValue(config.STROKE_WIDTH + 1, height, 'height')
                        });
                        victoryText.setOrigin(0.5, 0.5);
                        victoryNotification.add(victoryText);

                        // Enhanced animation
                        victoryNotification.setAlpha(0);
                        victoryNotification.setScale(0.3);

                        this.scene.tweens.add({
                            targets: victoryNotification,
                            alpha: 1,
                            scale: 1,
                            duration: config.SLIDE_IN_DURATION * 2,
                            ease: 'Elastic.easeOut'
                        });

                        // Add pulsing glow
                        const glow = this.scene.add.graphics();
                        glow.lineStyle(getScaledValue(6, width), config.TYPES.ERROR.border, 0.8);
                        glow.strokeRoundedRect(-panelWidth/2 - 10, -panelHeight/2 - 10, panelWidth + 20, panelHeight + 20, config.CORNER_RADIUS + 4);
                        victoryNotification.addAt(glow, 0);
                        
                        this.scene.tweens.add({
                            targets: glow,
                            alpha: { from: 0.8, to: 0.2 },
                            duration: 800,
                            yoyo: true,
                            repeat: 3
                        });

                        this.scene.time.delayedCall(config.DISPLAY_DURATION * 2, () => {
                            this.scene.tweens.add({
                                targets: victoryNotification,
                                alpha: 0,
                                scale: 0.8,
                                duration: config.FADE_OUT_DURATION,
                                ease: 'Back.easeIn',
                                onComplete: () => victoryNotification.destroy()
                            });
                        });
                    });

                    if (this.audioManager) {
                        this.audioManager.playSound('victory', { volume: 1.0 });
                    }
                }
            }

            // Prestige milestone notifications
            if (this.handlePrestigeMilestones) {
                this.handlePrestigeMilestones(data.currentMile, maxMiles);
            }

            // Show mile change in chat/log
            if (this.showTemporaryMessage) {
                const mileChangeMessage = `Reached Mile ${data.currentMile}`;
                this.showTemporaryMessage(mileChangeMessage);
            }

            // Check for biome change and update background
            if (this.scene.environmentBackground && this.worldManager.getCurrentBiomeType) {
                const currentBiome = this.worldManager.getCurrentBiomeType();
                if (currentBiome !== this.scene.environmentBackground.getCurrentBiome()) {
                    const width = this.scene.scale.width;
                    const height = this.scene.scale.height;
                    this.scene.environmentBackground.generateEnvironment(currentBiome, width, height, 0);
                    this.updateCombatLog(`Entering ${currentBiome}...`);
                }
            }
        }
    }

    /**
     * Handle world segment generation event
     * @param {Object} data - Segment data
     */
    handleWorldSegmentGenerated(data) {
        // Update mile display if available
        if (this.mileDisplay && data.mile !== undefined) {
            this.mileDisplay.setText(`Mile ${data.mile}`);
        }

        // Update statistics if available
        if (this.statisticsManager?.stats?.progression) {
            this.statisticsManager.stats.progression.segmentsVisited++;
        }
    }

    /**
     * Cleanup method for proper resource management
     */
    cleanup() {
        this.removeEventListeners();
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // World events
        this.scene.events.on(GameEvents.ITEM.PICKED_UP, this.handleItemPickup, this);
        this.scene.events.on(GameEvents.ITEM.EQUIPMENT_CHANGED, this.handleEquipmentChange, this);
        this.scene.events.on(GameEvents.ITEM.PURCHASED, this.handleItemPurchase, this);
        this.scene.events.on(GameEvents.ECONOMY.GOLD_CHANGED, this.handleGoldChange, this);
        this.scene.events.on(GameEvents.WORLD.MILE_CHANGED, this.handleMileChange, this);
    }

    /**
     * Remove all event listeners
     */
    removeEventListeners() {
        this.scene.events.off(GameEvents.ITEM.PICKED_UP, this.handleItemPickup, this);
        this.scene.events.off(GameEvents.ITEM.EQUIPMENT_CHANGED, this.handleEquipmentChange, this);
        this.scene.events.off(GameEvents.ITEM.PURCHASED, this.handleItemPurchase, this);
        this.scene.events.off(GameEvents.ECONOMY.GOLD_CHANGED, this.handleGoldChange, this);
        this.scene.events.off(GameEvents.WORLD.MILE_CHANGED, this.handleMileChange, this);
    }
}


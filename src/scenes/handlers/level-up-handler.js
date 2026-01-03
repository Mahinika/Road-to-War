/**
 * Level Up Handler - Handles hero leveling and progression logic
 * Extracted from GameScene to improve separation of concerns
 */

import { SCENE_CONFIG } from '../../config/scene-config.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';

export class LevelUpHandler {
    /**
     * Create a new LevelUpHandler
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.equipmentManager = managers.equipmentManager;
    }

    /**
     * Handle level up for a hero
     * @param {Object} hero - Hero object
     * @param {number} oldLevel - Previous level
     * @param {number} newLevel - New level
     */
    handleLevelUp(hero, oldLevel, newLevel) {
        // Respect level cap
        const worldConfig = this.scene.cache.json.get('worldConfig');
        const maxLevel = worldConfig?.experienceScaling?.maxLevel || 100;
        const cappedLevel = Math.min(newLevel, maxLevel);
        
        // Don't level up if already at cap
        if (hero.level >= maxLevel && cappedLevel >= maxLevel) {
            return;
        }
        
        hero.level = cappedLevel;

        // 1. Calculate new base stats
        const newBaseStats = this.calculateStatsForLevel(hero, newLevel);

        // 2. Store original starting stats if not already stored
        if (!hero.startingStats) {
            const worldConfig = this.scene.cache.json.get('worldConfig');
            hero.startingStats = { ...(worldConfig?.player?.startingStats || {}) };
        }

        // 3. Update hero baseStats
        const oldMaxHealth = hero.baseStats?.maxHealth || hero.currentStats?.maxHealth || 100;
        hero.baseStats = { ...newBaseStats };

        // 4. Adjust current health proportionally if max health increased
        if (hero.currentStats && hero.baseStats.maxHealth > oldMaxHealth) {
            const healthRatio = (hero.currentStats.health || oldMaxHealth) / oldMaxHealth;
            hero.currentStats.maxHealth = hero.baseStats.maxHealth;
            hero.currentStats.health = Math.floor(hero.baseStats.maxHealth * healthRatio);
        } else if (hero.currentStats) {
            // Update max health
            hero.currentStats.maxHealth = hero.baseStats.maxHealth;
            if (hero.currentStats.health > hero.currentStats.maxHealth) {
                hero.currentStats.health = hero.currentStats.maxHealth;
            }
        }

        // 5. Recalculate equipment-enhanced stats
        if (this.equipmentManager) {
            this.equipmentManager.recalculateAllHeroStats();
        }

        // 6. Check for milestone bonuses and apply them
        for (let level = oldLevel + 1; level <= newLevel; level++) {
            const milestoneBonus = this.getMilestoneBonus(level);
            if (milestoneBonus) {
                this.applyMilestoneBonus(hero, milestoneBonus);
                // Recalculate stats after milestone bonus
                if (this.equipmentManager) {
                    this.equipmentManager.recalculateAllHeroStats();
                }
            }
        }

        // 7. Show level up notification
        this.showLevelUpNotification(hero, newLevel);
    }

    /**
     * Calculate stats for a hero at a specific level
     * @param {Object} hero - Hero object
     * @param {number} level - Target level
     * @returns {Object} Calculated stats
     */
    calculateStatsForLevel(hero, level) {
        const worldConfig = this.scene.cache.json.get('worldConfig');
        const startingStats = worldConfig?.player?.startingStats || {
            health: 100,
            maxHealth: 100,
            attack: 10,
            defense: 5,
            speed: 50
        };
        const levelingConfig = worldConfig?.leveling || {};
        const statGrowth = levelingConfig?.statGrowth || {};
        const perLevel = statGrowth?.perLevel || {};
        const roleMultipliers = statGrowth?.roleMultipliers || {};
        
        // Get level-based stat gains from config
        const levelStatGains = worldConfig?.levelStatGains || {
            health: 10,
            attack: 2,
            defense: 1,
            mana: 5,
            energy: 5
        };

        // Start with starting stats
        const baseStats = { ...startingStats };

        // Apply per-level growth (level - 1 because level 1 uses starting stats)
        const levelsGained = level - 1;

        // Apply level-based stat gains (Phase 5: Level-Based Stat Scaling)
        for (const [stat, gain] of Object.entries(levelStatGains)) {
            const totalGain = gain * levelsGained;
            if (baseStats.hasOwnProperty(stat)) {
                baseStats[stat] = (baseStats[stat] || 0) + totalGain;
            } else {
                baseStats[stat] = totalGain;
            }
        }

        // Apply legacy per-level growth (if configured)
        for (const [stat, growth] of Object.entries(perLevel)) {
            if (baseStats.hasOwnProperty(stat)) {
                baseStats[stat] = (baseStats[stat] || 0) + (growth * levelsGained);
            } else {
                baseStats[stat] = growth * levelsGained;
            }
        }

        // Apply role-specific multipliers
        const heroRole = hero.role || 'dps';
        const roleMultiplier = roleMultipliers[heroRole] || {};

        for (const [stat, multiplier] of Object.entries(roleMultiplier)) {
            if (baseStats.hasOwnProperty(stat) && baseStats[stat] > 0) {
                // Only apply multiplier to the growth portion, not starting stats
                const startingValue = startingStats[stat] || 0;
                const growthValue = baseStats[stat] - startingValue;
                const multipliedGrowth = growthValue * (1 + multiplier);
                baseStats[stat] = startingValue + multipliedGrowth;
            }
        }

        // Round all stats to integers
        for (const stat in baseStats) {
            if (typeof baseStats[stat] === 'number') {
                baseStats[stat] = Math.floor(baseStats[stat]);
            }
        }

        return baseStats;
    }

    /**
     * Get milestone bonus for a level
     * @param {number} level - Level to check
     * @returns {Object|null} Milestone bonus or null
     */
    getMilestoneBonus(level) {
        const worldConfig = this.scene.cache.json.get('worldConfig');
        const levelingConfig = worldConfig?.leveling || {};
        const milestones = levelingConfig?.milestones || {};

        return milestones[level.toString()] || null;
    }

    /**
     * Apply milestone bonus to hero stats
     * @param {Object} hero - Hero object
     * @param {Object} milestoneBonus - Milestone bonus configuration
     */
    applyMilestoneBonus(hero, milestoneBonus) {
        if (!milestoneBonus?.statBonus) return;

        const statBonus = milestoneBonus.statBonus;

        // Apply "all" bonus to all stats
        if (statBonus.all !== undefined) {
            const multiplier = 1 + statBonus.all;
            if (hero.baseStats) {
                for (const [stat, value] of Object.entries(hero.baseStats)) {
                    if (typeof value === 'number' && value > 0) {
                        hero.baseStats[stat] = Math.floor(value * multiplier);
                    }
                }
            }
        }

        // Apply individual stat bonuses
        for (const [stat, bonus] of Object.entries(statBonus)) {
            if (stat !== 'all' && hero.baseStats && hero.baseStats.hasOwnProperty(stat)) {
                if (typeof bonus === 'number') {
                    hero.baseStats[stat] = Math.floor((hero.baseStats[stat] || 0) * (1 + bonus));
                }
            }
        }
    }

    /**
     * Show level up notification with enhanced animation
     * @param {Object} hero - Hero object
     * @param {number} newLevel - New level
     */
    showLevelUpNotification(hero, newLevel) {
        const { width, height } = this.scene.scale.gameSize;
        const config = UI_CONFIG.NOTIFICATIONS;
        const typeConfig = config.TYPES.SUCCESS;
        
        const notification = this.scene.add.container(width / 2, height / 2);
        notification.setScrollFactor(0);
        notification.setDepth(SCENE_CONFIG.DEPTH?.NOTIFICATIONS || 2000);

        // Create notification content using UI_CONFIG
        const panelWidth = getScaledValue(config.WIDTH, width);
        const panelHeight = getScaledValue(config.HEIGHT, height, 'height');
        const bg = this.scene.add.graphics();
        bg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
        bg.lineStyle(config.BORDER_WIDTH, typeConfig.border, config.BORDER_ALPHA);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
        notification.add(bg);

        const titleFontSize = getScaledValue(config.FONT_SIZE + 5, height, 'height');
        const title = this.scene.add.text(0, -getScaledValue(15, height, 'height'), 'LEVEL UP!', {
            font: `bold ${titleFontSize}px Arial`,
            fill: typeConfig.text,
            stroke: '#000000',
            strokeThickness: getScaledValue(config.STROKE_WIDTH, height, 'height')
        });
        title.setOrigin(0.5, 0.5);
        notification.add(title);

        const nameFontSize = getScaledValue(config.FONT_SIZE, height, 'height');
        const name = this.scene.add.text(0, getScaledValue(10, height, 'height'), `${hero.name || 'Hero'} Level ${newLevel}`, {
            font: `${nameFontSize}px Arial`,
            fill: config.TEXT_COLOR,
            stroke: '#000000',
            strokeThickness: getScaledValue(config.STROKE_WIDTH, height, 'height')
        });
        name.setOrigin(0.5, 0.5);
        notification.add(name);

        // Enhanced animation with particle effects
        notification.setAlpha(0);
        notification.setScale(0.5);

        // Slide in animation
        this.scene.tweens.add({
            targets: notification,
            alpha: 1,
            scale: 1,
            y: height / 2 - getScaledValue(config.SLIDE_DISTANCE, height, 'height'),
            duration: config.SLIDE_IN_DURATION,
            ease: 'Back.easeOut'
        });

        // Add glow effect
        const glow = this.scene.add.graphics();
        glow.lineStyle(getScaledValue(4, width), typeConfig.border, 0.6);
        glow.strokeRoundedRect(-panelWidth/2 - 5, -panelHeight/2 - 5, panelWidth + 10, panelHeight + 10, config.CORNER_RADIUS + 2);
        notification.addAt(glow, 0);
        
        this.scene.tweens.add({
            targets: glow,
            alpha: { from: 0.6, to: 0.2 },
            duration: 500,
            yoyo: true,
            repeat: 2
        });

        // Auto-remove after configured duration
        this.scene.time.delayedCall(config.DISPLAY_DURATION, () => {
            this.scene.tweens.add({
                targets: notification,
                alpha: 0,
                scale: 0.8,
                y: height / 2,
                duration: config.FADE_OUT_DURATION,
                ease: 'Back.easeIn',
                onComplete: () => {
                    notification.destroy();
                }
            });
        });
    }
}


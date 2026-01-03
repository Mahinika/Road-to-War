/**
 * Combat Handler - Handles combat-related events and logic
 * Extracted from GameScene to improve separation of concerns
 */

import { GameEvents } from '../../utils/event-constants.js';
import { Logger } from '../../utils/logger.js';
import { SafeExecutor } from '../../utils/error-handling.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';
import { SCENE_CONFIG } from '../../config/scene-config.js';

export class CombatHandler {
    /**
     * Create a new CombatHandler
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.combatManager = managers.combatManager;
        this.partyManager = managers.partyManager;
        this.worldManager = managers.worldManager;
        this.audioManager = managers.audioManager;
        this.particleManager = managers.particleManager;
        this.shopManager = managers.shopManager;
        this.uiManager = managers.uiManager;
        this.levelUpHandler = managers.levelUpHandler;
    }

    /**
     * Handle combat start event
     * @param {Object} data - Combat event data
     */
    handleCombatStart(data) {
        // Prevent duplicate handling if combat is already active
        if (this.combatManager && this.combatManager.isInCombat()) {
            return;
        }

        if (data.enemy && this.uiManager) {
            this.uiManager.updateTargetFrame(data.enemy);
        }

        // Update combat status display
        if (this.uiManager?.combatStatusDisplay) {
            this.uiManager.combatStatusDisplay.setText('IN COMBAT');
            this.uiManager.combatStatusDisplay.setFill('#ff4444');
        }

        // Add visual combat indicator
        if (this.uiManager?.combatUI) {
            this.uiManager.combatUI.showCombatIndicator(true);
        }

        // Add combat impact effect at enemy position
        if (data.enemy && data.enemy.x && data.enemy.y) {
            this.particleManager?.createExplosion(data.enemy.x, data.enemy.y, 'combat', 30);

            // Enhanced visual feedback through CombatUIManager
            if (this.uiManager?.combatUI?.showThreatEffect) {
                // Show initial threat/taunt effect for tank
                const tankHero = this.partyManager?.getHeroes()?.find(h => h.role === 'tank');
                if (tankHero) {
                    this.uiManager.combatUI.showThreatEffect(data.enemy.x, data.enemy.y - 50, 'taunt');
                }
            }
        }

        // Trigger Bloodline Auras for all heroes (Phase 9: High Quality Animations)
        if (this.partyManager && this.particleManager) {
            this.partyManager.getHeroes().forEach(hero => {
                if (hero.sprite && hero.bloodlineId) {
                    this.particleManager.createBloodlineAura(hero.sprite, hero.bloodlineId);
                }
            });
        }

        // Play combat start sound and music
        this.audioManager?.playSound('combat_hit', { volume: 0.8 });
        this.audioManager?.playMusic('combat');

        // Show combat notification
        this.scene.showTemporaryMessage?.(`Combat with ${data.enemy?.id || 'Unknown'}!`);
        
        Logger.info('CombatHandler', `Combat started with ${data.enemy?.id}`);
    }

    /**
     * Handle combat end event
     * @param {Object} data - Combat end data
     */
    handleCombatEnd(data) {
        // Hide combat indicator
        if (this.uiManager?.combatUI) {
            this.uiManager.combatUI.showCombatIndicator(false);
        }

        // Switch back to gameplay music
        this.audioManager?.playMusic('gameplay');

        if (data.victory) {
            this.handleVictory(data);
        } else {
            this.handleDefeat(data);
        }

        // Update UI status
        if (this.uiManager?.combatStatusDisplay) {
            this.uiManager.combatStatusDisplay.setText('Idle');
            this.uiManager.combatStatusDisplay.setFill('#00ff00');
        }

        // Clear target frame
        if (this.uiManager) {
            this.uiManager.updateTargetFrame(null);
        }
    }

    /**
     * Handle victory logic
     */
    handleVictory(data) {
        // Play victory sound
        this.audioManager?.playSound('victory', { volume: 0.7 });

        // Enhanced visual feedback for enemy defeat
        if (data.enemy && data.enemy.x && data.enemy.y) {
            const enemyName = data.enemy.name || 'Enemy';
            const isBoss = data.enemy.isBoss || data.enemy.type === 'boss' || enemyName.toLowerCase().includes('boss');

            // Show enemy defeat effect
            if (this.uiManager?.combatUI?.showEnemyDefeatEffect) {
                this.uiManager.combatUI.showEnemyDefeatEffect(
                    data.enemy.x, data.enemy.y, enemyName, isBoss
                );
            }

            // Add gold explosion and floating text
            if (data.rewards?.gold) {
                this.particleManager?.createExplosion(data.enemy.x, data.enemy.y, 'gold', 25);
                this.particleManager?.createFloatingText(
                    data.enemy.x,
                    data.enemy.y - 30,
                    `+${data.rewards.gold} Gold`,
                    '#ffd700',
                    18
                );
                this.audioManager?.playSound('gold_collect', { volume: 0.6 });
            }
        }

        // Add rewards
        if (data.rewards) {
            if (data.rewards.gold) {
                this.shopManager?.addGold(data.rewards.gold);
            }

            // Award experience
            if (data.rewards.experience > 0 && this.partyManager) {
                this.awardExperience(data.rewards.experience);
            }
        }

        // Show combat summary notification
        this.showCombatSummary(data);

        // Cleanup enemy
        if (data.enemy && data.enemy.sprite) {
            if (data.enemy.nameLabel) data.enemy.nameLabel.destroy();
            data.enemy.sprite.destroy();
            data.enemy.sprite = null;
        }
    }

    /**
     * Handle defeat logic
     */
    handleDefeat(data) {
        this.audioManager?.playSound('defeat', { volume: 0.7 });
        this.scene.showTemporaryMessage?.('Defeated! Returning to previous checkpoint...');
    }

    /**
     * Show combat summary notification with detailed results
     * @param {Object} data - Combat end data with rewards
     */
    showCombatSummary(data) {
        if (!data.victory || !data.rewards) return;

        const config = UI_CONFIG.NOTIFICATIONS;
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const typeConfig = config.TYPES.SUCCESS;
        
        const summary = this.scene.add.container(width / 2, height / 2 - getScaledValue(150, height, 'height'));
        summary.setScrollFactor(0);
        summary.setDepth(SCENE_CONFIG.DEPTH?.NOTIFICATIONS || 2000);

        const panelWidth = getScaledValue(config.WIDTH + 50, width);
        const panelHeight = getScaledValue(config.HEIGHT + 40, height, 'height');
        const bg = this.scene.add.graphics();
        bg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
        bg.lineStyle(config.BORDER_WIDTH, typeConfig.border, config.BORDER_ALPHA);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
        summary.add(bg);

        // Title
        const titleFontSize = getScaledValue(config.FONT_SIZE + 3, height, 'height');
        const title = this.scene.add.text(0, -getScaledValue(25, height, 'height'), '⚔️ Combat Summary ⚔️', {
            font: `bold ${titleFontSize}px Arial`,
            fill: typeConfig.text,
            stroke: '#000000',
            strokeThickness: getScaledValue(config.STROKE_WIDTH, height, 'height')
        });
        title.setOrigin(0.5, 0.5);
        summary.add(title);

        // Summary lines
        const lineFontSize = getScaledValue(config.FONT_SIZE - 1, height, 'height');
        const lineSpacing = getScaledValue(18, height, 'height');
        let yOffset = -getScaledValue(5, height, 'height');

        // Enemies defeated
        const enemiesDefeated = 1; // One enemy per combat
        const enemiesText = this.scene.add.text(0, yOffset, `Enemies Defeated: ${enemiesDefeated}`, {
            font: `${lineFontSize}px Arial`,
            fill: config.TEXT_COLOR,
            stroke: '#000000',
            strokeThickness: getScaledValue(config.STROKE_WIDTH - 0.5, height, 'height')
        });
        enemiesText.setOrigin(0.5, 0.5);
        summary.add(enemiesText);
        yOffset += lineSpacing;

        // XP gained
        if (data.rewards.experience > 0) {
            const xpText = this.scene.add.text(0, yOffset, `Experience: +${data.rewards.experience}`, {
                font: `${lineFontSize}px Arial`,
                fill: '#00aaff',
                stroke: '#000000',
                strokeThickness: getScaledValue(config.STROKE_WIDTH - 0.5, height, 'height')
            });
            xpText.setOrigin(0.5, 0.5);
            summary.add(xpText);
            yOffset += lineSpacing;
        }

        // Gold gained
        if (data.rewards.gold > 0) {
            const goldText = this.scene.add.text(0, yOffset, `Gold: +${data.rewards.gold}`, {
                font: `${lineFontSize}px Arial`,
                fill: '#ffd700',
                stroke: '#000000',
                strokeThickness: getScaledValue(config.STROKE_WIDTH - 0.5, height, 'height')
            });
            goldText.setOrigin(0.5, 0.5);
            summary.add(goldText);
            yOffset += lineSpacing;
        }

        // Items looted
        const lootCount = data.rewards?.loot ? data.rewards.loot.length : 0;
        if (lootCount > 0) {
            const lootText = this.scene.add.text(0, yOffset, `Items: ${lootCount}`, {
                font: `${lineFontSize}px Arial`,
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: getScaledValue(config.STROKE_WIDTH - 0.5, height, 'height')
            });
            lootText.setOrigin(0.5, 0.5);
            summary.add(lootText);
        }

        // Animate in
        summary.setAlpha(0);
        summary.setScale(0.8);

        this.scene.tweens.add({
            targets: summary,
            alpha: 1,
            scale: 1,
            duration: config.SLIDE_IN_DURATION,
            ease: 'Back.easeOut'
        });

        // Auto-remove after configured duration
        this.scene.time.delayedCall(config.DISPLAY_DURATION, () => {
            this.scene.tweens.add({
                targets: summary,
                alpha: 0,
                scale: 0.8,
                y: summary.y - getScaledValue(30, height, 'height'),
                duration: config.FADE_OUT_DURATION,
                ease: 'Back.easeIn',
                onComplete: () => summary.destroy()
            });
        });
    }

    /**
     * Award experience to party
     */
    awardExperience(amount) {
        const heroes = this.partyManager.getHeroes();
        const worldConfig = this.scene.cache.json.get('worldConfig');
        const experienceToLevel = worldConfig?.player?.experienceToLevel || {};
        const levelingConfig = worldConfig?.leveling || null;

        heroes.forEach(hero => {
            if (!hero.experience) hero.experience = 0;
            const oldLevel = hero.level || 1;

            let xpGained = amount;
            let bonusText = '';

            // 1. Bloodline/Fresh Hero Bonus
            if (hero.freshHeroBonus && hero.freshHeroBonus.appliedLevels < hero.freshHeroBonus.duration) {
                xpGained *= hero.freshHeroBonus.xpMultiplier;
                bonusText += ' 🎁';
            }

            // 2. Synergy Bonuses
            if (hero.synergyBonuses) {
                Object.values(hero.synergyBonuses).forEach(synergy => {
                    if (synergy.type === 'xp_boost') {
                        xpGained *= (1 + synergy.value);
                    }
                });
            }

            xpGained = Math.round(xpGained);
            hero.experience += xpGained;

            // Show Floating XP
            const heroX = hero.sprite?.x || hero.x || 0;
            const heroY = hero.sprite?.y || hero.y || 0;
            this.scene.showFloatingText?.(heroX, heroY - 100, `+${xpGained} XP${bonusText}`, '#9b59b6');

            // Level Up Check
            const newLevel = this.scene.calculateLevelFromXP ? 
                this.scene.calculateLevelFromXP(hero.experience, experienceToLevel, levelingConfig) : 
                oldLevel;

            if (newLevel > oldLevel) {
                this.levelUpHandler?.handleLevelUp(hero, oldLevel, newLevel);
            }
        });

        this.scene.events.emit('experience_gained', { amount });
    }

    /**
     * Update combat log display
     */
    updateCombatLog(message, type = 'combat') {
        if (this.uiManager) {
            this.uiManager.updateCombatLog(message, type);
        }
    }

    /**
     * Handle encounter trigger event
     */
    handleEncounterTrigger(data) {
        if (!data.encounter) return;

        const encounterType = data.encounter.type?.toLowerCase() || 'unknown';
        let effectColor = 'gold';
        let effectIntensity = 20;

        // 1. Visual Effects
        const primaryHero = this.partyManager?.getHeroByIndex(0);
        if (primaryHero && this.particleManager) {
            switch (encounterType) {
                case 'shop':
                    effectColor = 'shop';
                    effectIntensity = 25;
                    break;
                case 'treasure':
                    effectColor = 'gold';
                    effectIntensity = 35;
                    break;
                case 'elite_enemy':
                    effectColor = 'combat';
                    effectIntensity = 40;
                    break;
                case 'boss':
                    effectColor = 'combat';
                    effectIntensity = 60;
                    break;
                case 'resource_node':
                    effectColor = 'loot';
                    effectIntensity = 20;
                    break;
                case 'choice_encounter':
                    effectColor = 'gold';
                    effectIntensity = 30;
                    break;
            }

            const heroX = primaryHero.sprite?.x || primaryHero.x || 0;
            const heroY = primaryHero.sprite?.y || primaryHero.y || 0;
            this.particleManager.createExplosion(heroX, heroY, effectColor, effectIntensity);
        }

        // 2. Sound Effects
        this.audioManager?.playSound('encounter', { volume: 0.6 });

        // 3. UI and Logic Delegation
        this.handleEncounterInteraction(data.encounter);
        
        Logger.info('CombatHandler', `Encounter triggered: ${encounterType}`);
    }

    /**
     * Delegate encounter interaction to specific systems
     */
    handleEncounterInteraction(encounter) {
        const type = encounter.type?.toLowerCase();

        if (type === 'shop') {
            this.scene.toggleShop?.();
        } else if (type === 'treasure') {
            this.scene.lootManager?.generateTreasureLoot(encounter.rarity || 'common');
        } else if (type === 'resource_node' && this.uiManager?.encounterUI) {
            this.uiManager.encounterUI.showResourceGatheringInterface(encounter);
        } else if (type === 'exploration_event' && this.uiManager?.encounterUI) {
            this.uiManager.encounterUI.showExplorationEventInterface(encounter);
        } else if (type === 'choice_encounter' && this.uiManager?.encounterUI) {
            this.uiManager.encounterUI.showChoiceEncounterInterface(encounter);
        } else if (type === 'elite_enemy' || type === 'boss') {
            // Combat starting is handled by COMBAT.START event which 
            // should be emitted shortly after this trigger
        }
    }

    /**
     * Update combat logic (called every frame)
     * @param {number} time - Current time
     * @param {number} delta - Time delta
     */
    update(time, delta) {
        SafeExecutor.execute(() => {
            // 1. Update combat manager
            if (this.combatManager?.update) {
                this.combatManager.update(time, delta);
            }

            // 2. Handle combat-specific camera logic
            this.handleCombatCamera(time);

            // 3. Handle combat mode transitions for movement
            this.handleCombatMovementMode();

        }, null, 'CombatHandler.update');
    }

    /**
     * Handle combat-specific camera logic
     */
    handleCombatCamera(time) {
        if (this.combatManager && this.combatManager.isCameraRepositionPending() && this.combatManager.inCombat) {
            const combatStartTime = this.combatManager.getCombatStartTime();
            const currentTime = time || Date.now();

            // Small delay to let heroes position themselves before camera snap
            if (currentTime - combatStartTime >= 50) {
                const enemy = this.combatManager.enemy;
                if (enemy && enemy.sprite) {
                    // Signal camera manager to reposition
                    this.scene.events.emit('reposition_camera_for_combat', {
                        enemyX: enemy.sprite.x,
                        enemyY: enemy.sprite.y
                    });
                    this.combatManager.clearCameraRepositionPending();
                }
            }
        }
    }

    /**
     * Handle combat mode transitions for movement
     */
    handleCombatMovementMode() {
        if (!this.combatManager || !this.scene.movementManager) return;

        const isInCombat = this.combatManager.inCombat && this.combatManager.currentCombat;
        const currentMode = this.scene.movementManager.mode;

        if (isInCombat && currentMode !== 'combat') {
            Logger.info('CombatHandler', 'Entering combat mode');
            this.scene.movementManager.setMode('combat');
            
            if (this.worldManager && this.worldManager.enemies) {
                this.scene.movementManager.setAvailableEnemies(this.worldManager.enemies);
            }
        } else if (!isInCombat && currentMode === 'combat') {
            Logger.info('CombatHandler', 'Exiting combat mode');
            this.scene.movementManager.setMode('travel');
        }
    }

    /**
     * Get combat movement target (if in combat)
     * @returns {Object|null} Combat target position and metadata
     */
    getCombatMovementTarget() {
        if (!this.combatManager || !this.combatManager.inCombat) return null;

        const combatEnemy = this.combatManager.currentCombat?.enemy;
        if (combatEnemy && this.combatManager.enemy && this.combatManager.enemy.sprite) {
            return {
                x: this.combatManager.enemy.sprite.x || this.combatManager.enemy.x || 0,
                y: this.combatManager.enemy.sprite.y || this.combatManager.enemy.y || 0,
                id: this.combatManager.enemy.id || this.combatManager.enemy.data?.id,
                sprite: this.combatManager.enemy.sprite,
                data: this.combatManager.enemy.data
            };
        }
        return null;
    }

    /**
     * Set up combat-related event listeners
     */
    setupEventListeners() {
        // Combat events - use consistent method binding to avoid duplicates
        this.scene.events.on(GameEvents.COMBAT.START, this.handleCombatStart, this);
        this.scene.events.on('party_combat_start', this.handleCombatStart, this);
        this.scene.events.on(GameEvents.COMBAT.END, this.handleCombatEnd, this);
        this.scene.events.on(GameEvents.WORLD.ENCOUNTER_TRIGGER, this.handleEncounterTrigger, this);

        Logger.debug('CombatHandler', 'Event listeners set up');
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        // Remove all event listeners with proper cleanup
        this.scene.events.off(GameEvents.COMBAT.START, this.handleCombatStart, this);
        this.scene.events.off('party_combat_start', this.handleCombatStart, this);
        this.scene.events.off(GameEvents.COMBAT.END, this.handleCombatEnd, this);
        this.scene.events.off(GameEvents.WORLD.ENCOUNTER_TRIGGER, this.handleEncounterTrigger, this);

        Logger.debug('CombatHandler', 'Event listeners removed');
    }

    /**
     * Validate that all expected event listeners are properly registered
     * @returns {Object} Validation results
     */
    validateEventListeners() {
        const results = {
            combatStart: this.scene.events.listeners(GameEvents.COMBAT.START).length > 0,
            partyCombatStart: this.scene.events.listeners('party_combat_start').length > 0,
            combatEnd: this.scene.events.listeners(GameEvents.COMBAT.END).length > 0,
            encounterTrigger: this.scene.events.listeners(GameEvents.WORLD.ENCOUNTER_TRIGGER).length > 0
        };

        const missing = Object.entries(results).filter(([event, hasListener]) => !hasListener);
        if (missing.length > 0) {
            Logger.warn('CombatHandler', `Missing event listeners: ${missing.map(([event]) => event).join(', ')}`);
        }

        return results;
    }
}


/**
 * Combat UI Manager - Handles all combat-related UI panels
 * Extracted from GameScene to improve separation of concerns
 */

import { createWoWFrame, createWoWBar, createModernButton, createModernText, UI_THEME } from '../../utils/ui-system.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';

export class CombatUIManager {
    /**
     * Create a new CombatUIManager
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.combatManager = managers.combatManager;
        this.partyManager = managers.partyManager;
        this.audioManager = managers.audioManager;
        this.particleManager = managers.particleManager;
        
        // UI panel references
        this.combatTacticsPanel = null;
        this.threatDisplay = null;
        this.threatBars = null;
        this.combatIndicator = null;
        
        // State
        this.combatTactics = 'balanced';
        this.showThreatDisplay = false;
        
        // Callbacks for scene interactions
        this.onTacticsChange = null;
        this.onThreatToggle = null;
        this.onCombatIndicatorChange = null;

        // Visual feedback settings - Using UI_CONFIG
        const width = this.scene.cameras?.main?.width || 1920;
        const damageConfig = UI_CONFIG.COMBAT_UI.DAMAGE_NUMBERS;
        this.damageNumberSettings = {
            fontSize: getScaledValue(damageConfig.FONT_SIZE, width, 'font'),
            duration: damageConfig.DURATION,
            riseDistance: getScaledValue(damageConfig.RISE_DISTANCE, width, 'height'),
            criticalScale: damageConfig.CRITICAL_SCALE,
            criticalColor: damageConfig.CRITICAL_COLOR
        };

        this.combatEventSettings = UI_CONFIG.COMBAT_UI.COMBAT_EVENTS;
    }

    /**
     * Show combat tactics menu
     */
    showCombatTacticsMenu() {
        this.closeCombatTacticsMenu();
        
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Using UI_CONFIG for tactics panel
        const tacticsConfig = UI_CONFIG.COMBAT_UI.TACTICS_PANEL;
        const panelWidth = getScaledValue(tacticsConfig.WIDTH, width);
        const panelHeight = getScaledValue(tacticsConfig.HEIGHT, width, 'height');
        const panelX = width / 2;
        const panelY = height / 2 + getScaledValue(tacticsConfig.Y_OFFSET, width, 'height');

        // Container for easier positioning
        const container = this.scene.add.container(panelX, panelY);
        container.setDepth(400);
        container.setScrollFactor(0);

        // WoW Style Background - Using UI_CONFIG
        const bg = createWoWFrame(this.scene, 0, 0, panelWidth, panelHeight, {
            backgroundColor: tacticsConfig.BACKGROUND_COLOR,
            borderColor: tacticsConfig.BORDER_COLOR,
            borderWidth: tacticsConfig.BORDER_WIDTH,
            shadow: true
        });
        container.add(bg);

        const titleY = getScaledValue(tacticsConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(tacticsConfig.TITLE_FONT_SIZE, width, 'font');
        const title = createModernText(this.scene, 0, titleY, '⚔️ COMBAT TACTICS', {
            fontSize: titleFontSize,
            color: '#ffd700',
            strokeColor: '#000000',
            strokeThickness: 2,
            weight: 'bold'
        });
        title.setOrigin(0.5, 0.5);
        container.add(title);

        const currentTactics = this.combatTactics || 'balanced';
        const tacticsDesc = {
            aggressive: 'Focus on damage, higher risk',
            defensive: 'Prioritize survival, lower risk',
            balanced: 'Standard combat behavior'
        };

        const currentTextY = getScaledValue(tacticsConfig.CURRENT_TEXT_Y_OFFSET, width, 'height');
        const currentTextFontSize = getScaledValue(tacticsConfig.CURRENT_TEXT_FONT_SIZE, width, 'font');
        const currentText = createModernText(this.scene, 0, currentTextY,
            `Current: ${currentTactics.toUpperCase()}\n${tacticsDesc[currentTactics]}`, {
            fontSize: currentTextFontSize,
            color: '#ffffff',
            strokeColor: '#000000',
            strokeThickness: 1,
            align: 'center'
        });
        currentText.setOrigin(0.5, 0.5);
        container.add(currentText);

        // Buttons - Using UI_CONFIG
        const buttonWidth = getScaledValue(tacticsConfig.BUTTON_WIDTH, width);
        const buttonHeight = getScaledValue(tacticsConfig.BUTTON_HEIGHT, width, 'height');
        const buttonSpacing = getScaledValue(tacticsConfig.BUTTON_SPACING, width);
        const buttonY = getScaledValue(tacticsConfig.BUTTON_Y_POSITION, width, 'height');
        const tactics = [
            { id: 'balanced', label: 'Balanced', color: '#00ff00' },
            { id: 'aggressive', label: 'Aggressive', color: '#ff0000' },
            { id: 'defensive', label: 'Defensive', color: '#0088ff' }
        ];

        tactics.forEach((tactic, index) => {
            const buttonX = (index - 1) * buttonSpacing;
            const button = createModernButton(
                this.scene,
                buttonX,
                buttonY,
                buttonWidth,
                buttonHeight,
                tactic.label,
                {
                    backgroundColor: 0x1a1a2e,
                    hoverColor: 0x2a2a4e,
                    borderColor: tactic.color,
                    textColor: '#ffffff',
                    fontSize: currentTextFontSize,
                    onClick: () => {
                        this.setCombatTactics(tactic.id);
                        this.closeCombatTacticsMenu();
                    }
                }
            );
            if (button) {
                container.add(button);
            }
        });

        // Threat button - Using UI_CONFIG
        const threatButtonY = getScaledValue(tacticsConfig.THREAT_BUTTON_Y_OFFSET, width, 'height');
        const threatButtonWidth = getScaledValue(tacticsConfig.THREAT_BUTTON_WIDTH, width);
        const threatButtonHeight = getScaledValue(tacticsConfig.THREAT_BUTTON_HEIGHT, width, 'height');
        const threatButton = createModernButton(
            this.scene,
            0,
            threatButtonY,
            threatButtonWidth,
            threatButtonHeight,
            this.showThreatDisplay ? 'HIDE THREAT METER' : 'SHOW THREAT METER',
            {
                backgroundColor: 0x1a1a1a,
                hoverColor: 0x2a2a2a,
                borderColor: 0xcc0000,
                textColor: '#ffffff',
                fontSize: 14,
                onClick: () => {
                    this.toggleThreatDisplay();
                    this.closeCombatTacticsMenu();
                }
            }
        );
        if (threatButton) {
            container.add(threatButton);
        }

        this.combatTacticsPanel = {
            container: container,
            bg: bg,
            title: title,
            currentText: currentText,
            threatButton: threatButton
        };
    }

    /**
     * Close combat tactics menu
     */
    closeCombatTacticsMenu() {
        if (this.combatTacticsPanel) {
            if (this.combatTacticsPanel.container) {
                this.combatTacticsPanel.container.destroy();
            }
            this.combatTacticsPanel = null;
        }
    }

    /**
     * Set combat tactics
     * @param {string} tactics - Combat tactics ('balanced', 'aggressive', 'defensive')
     */
    setCombatTactics(tactics) {
        this.combatTactics = tactics;

        if (this.combatManager && this.combatManager.abilityManager) {
            this.combatManager.abilityManager.setCombatTactics(tactics);
        }

        if (this.onTacticsChange) {
            this.onTacticsChange(tactics);
        }
    }

    /**
     * Get current combat tactics
     * @returns {string} Current tactics
     */
    getCombatTactics() {
        return this.combatTactics;
    }

    /**
     * Toggle threat display visibility
     */
    toggleThreatDisplay() {
        this.showThreatDisplay = !this.showThreatDisplay;

        if (this.showThreatDisplay) {
            this.createThreatDisplay();
        } else {
            this.destroyThreatDisplay();
        }

        if (this.onThreatToggle) {
            this.onThreatToggle(this.showThreatDisplay);
        }
    }

    /**
     * Create threat display panel
     */
    createThreatDisplay() {
        if (this.threatDisplay) return;

        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Using UI_CONFIG for threat display
        const threatConfig = UI_CONFIG.COMBAT_UI.THREAT_DISPLAY;
        const panelWidth = getScaledValue(threatConfig.WIDTH, width);
        const panelHeight = getScaledValue(threatConfig.HEIGHT, width, 'height');
        const panelX = width + getScaledValue(threatConfig.X_OFFSET, width) - panelWidth / 2;
        const panelY = height / 2;

        const container = this.scene.add.container(panelX, panelY);
        container.setDepth(195);
        container.setScrollFactor(0);

        // WoW Style Background
        const bg = createWoWFrame(this.scene, 0, 0, panelWidth, panelHeight, {
            backgroundColor: UI_THEME.surfaces.frameDark,
            borderColor: 0xcc0000,
            borderWidth: 2,
            shadow: true
        });
        container.add(bg);

        const titleY = getScaledValue(threatConfig.TITLE_Y_OFFSET, width, 'height');
        const titleFontSize = getScaledValue(threatConfig.TITLE_FONT_SIZE, width, 'font');
        const title = createModernText(this.scene, 0, titleY, 'THREAT METER', {
            fontSize: titleFontSize,
            color: '#ff0000',
            strokeColor: '#000000',
            strokeThickness: 2,
            weight: 'bold'
        });
        title.setOrigin(0.5, 0.5);
        container.add(title);

        this.threatBars = [];
        const heroes = this.partyManager ? this.partyManager.getHeroes() : [];

        heroes.forEach((hero, index) => {
            const barY = getScaledValue(threatConfig.BAR_Y_START, width, 'height') + index * getScaledValue(threatConfig.BAR_SPACING, width, 'height');
            const barWidth = getScaledValue(threatConfig.BAR_WIDTH, width);
            const barHeight = getScaledValue(threatConfig.BAR_HEIGHT, width, 'height');
            const classColor = hero.classId ? (UI_THEME.accents.gold.base) : 0xffffff;

            const hpBar = createWoWBar(this.scene, 10, barY, barWidth, barHeight, {
                type: 'health',
                fillColor: 0xcc0000,
                percent: 0,
                showText: false
            });
            container.add(hpBar);

            const name = this.scene.add.text(-panelWidth / 2 + 10, barY, (hero.name || hero.id).substring(0, 8), {
                font: 'bold 11px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            });
            name.setOrigin(0, 0.5);
            container.add(name);

            this.threatBars.push({
                heroId: hero.id,
                bar: hpBar,
                name: name,
                maxWidth: barWidth
            });
        });

        this.threatDisplay = {
            container: container,
            bg: bg,
            title: title,
            bars: this.threatBars
        };
    }

    /**
     * Update threat display during combat
     * @param {Object} combatAI - Combat AI instance with threat data
     * @param {Object} enemy - Current enemy
     */
    updateThreatDisplay(combatAI, enemy) {
        if (!this.threatDisplay || !this.threatBars || !combatAI) return;

        const enemyId = enemy?.data?.id || enemy?.id;
        if (!enemyId || !combatAI.threatTable || !combatAI.threatTable.has(enemyId)) return;

        const threatTable = combatAI.threatTable.get(enemyId);
        const maxThreat = Math.max(...Array.from(threatTable.values()), 1);

        this.threatBars.forEach(barInfo => {
            const threat = threatTable.get(barInfo.heroId) || 0;
            const threatPercent = maxThreat > 0 ? threat / maxThreat : 0;
            
            if (barInfo.bar && barInfo.bar.fill) {
                barInfo.bar.fill.width = barInfo.maxWidth * threatPercent;
            }
        });
    }

    /**
     * Destroy threat display
     */
    destroyThreatDisplay() {
        if (this.threatDisplay) {
            if (this.threatDisplay.container) {
                this.threatDisplay.container.destroy();
            }
            this.threatDisplay = null;
            this.threatBars = null;
        }
    }

    /**
     * Show/hide combat indicator overlay
     * @param {boolean} show - Whether to show the indicator
     */
    showCombatIndicator(show) {
        if (show) {
            if (this.combatIndicator) {
                this.destroyCombatIndicator();
            }
            
            const width = this.scene.cameras.main.width;
            const height = this.scene.cameras.main.height;
            
            const borderOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0);
            if (!borderOverlay) {
                return;
            }
            borderOverlay.setScrollFactor(0);
            borderOverlay.setDepth(250);
            borderOverlay.setAlpha(0.1);
            
            this.scene.tweens.add({
                targets: borderOverlay,
                alpha: { from: 0.1, to: 0.3 },
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            const combatText = createModernText(this.scene, width / 2, 50, '⚔ IN COMBAT ⚔', {
                fontSize: 24,
                color: '#ff0000',
                strokeColor: '#000000',
                strokeThickness: 3,
                shadow: true
            });
            if (!combatText) {
                return;
            }
            combatText.setOrigin(0.5);
            combatText.setScrollFactor(0);
            combatText.setDepth(251);
            
            this.scene.tweens.add({
                targets: combatText,
                scale: { from: 1.0, to: 1.2 },
                alpha: { from: 0.8, to: 1.0 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            this.combatIndicator = { border: borderOverlay, text: combatText };
        } else {
            this.destroyCombatIndicator();
        }

        if (this.onCombatIndicatorChange) {
            this.onCombatIndicatorChange(show);
        }
    }

    /**
     * Destroy combat indicator
     */
    destroyCombatIndicator() {
        if (this.combatIndicator) {
            Object.values(this.combatIndicator).forEach(element => {
                if (element && element.destroy) {
                    element.destroy();
                }
            });
            this.combatIndicator = null;
        }
    }

    /**
     * Show damage number with floating text animation
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount
     * @param {boolean} isCritical - Whether this is a critical hit
     * @param {string} damageType - Type of damage ('physical', 'magical', 'healing')
     */
    showDamageNumber(x, y, damage, isCritical = false, damageType = 'physical') {
        if (!this.particleManager) return;

        const settings = this.damageNumberSettings;
        const color = this.getDamageColor(damageType, isCritical);
        const fontSize = isCritical ? settings.fontSize * settings.criticalScale : settings.fontSize;

        // Add damage type indicator
        const typeIndicator = this.getDamageTypeIndicator(damageType);
        const displayText = isCritical ? `${typeIndicator}${damage}!` : `${typeIndicator}${damage}`;

        // Create floating text with enhanced animation
        const floatingText = this.particleManager.createFloatingText(
            x, y, displayText, color, fontSize
        );

        if (floatingText) {
            // Enhanced animation for critical hits
            if (isCritical) {
                // Add extra particle burst for criticals
                if (this.particleManager.createParticleBurst) {
                    this.particleManager.createParticleBurst(x, y, 0xffd93d, 8, 300);
                }
            }

            // Add slight randomization to prevent overlapping
            const randomOffset = (Math.random() - 0.5) * 20;
            floatingText.setPosition(x + randomOffset, y);
        }
    }

    /**
     * Show ability proc effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} abilityName - Name of the ability
     * @param {string} procType - Type of proc ('damage', 'healing', 'buff', 'debuff')
     */
    showAbilityProcEffect(x, y, abilityName, procType = 'damage') {
        if (!this.particleManager) return;

        const settings = this.combatEventSettings.abilityProc;
        const procText = this.getProcText(abilityName, procType);

        // Create floating text
        const floatingText = this.particleManager.createFloatingText(
            x, y - 30, procText, settings.color, 18
        );

        if (floatingText) {
            // Add scale animation
            floatingText.setScale(settings.scale);
            this.scene.tweens.add({
                targets: floatingText,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 300,
                ease: 'Bounce.easeOut'
            });

            // Add particle effect
            if (this.particleManager.createParticleBurst) {
                this.particleManager.createParticleBurst(x, y, 0xFFD93D, 5, 200);
            }
        }
    }

    /**
     * Show enemy defeat animation
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} enemyName - Name of the defeated enemy
     * @param {boolean} isBoss - Whether this was a boss enemy
     */
    showEnemyDefeatEffect(x, y, enemyName, isBoss = false) {
        if (!this.particleManager) return;

        const settings = this.combatEventSettings.enemyDefeat;
        const defeatText = isBoss ? `${enemyName} DEFEATED!` : 'Defeated!';

        // Create floating text
        const floatingText = this.particleManager.createFloatingText(
            x, y - 40, defeatText, settings.color, isBoss ? 28 : 20
        );

        if (floatingText) {
            // Enhanced animation for bosses
            if (isBoss) {
                floatingText.setScale(settings.scale);

                // Add dramatic particle burst
                if (this.particleManager.createParticleBurst) {
                    this.particleManager.createParticleBurst(x, y, 0xFF4757, 15, 600);
                }

                // Add screen flash effect
                this.createScreenFlash(0xff4757, 0.3, 300);
            }
        }
    }

    /**
     * Show healing effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} healing - Amount of healing
     * @param {boolean} isCritical - Whether this is a critical heal
     */
    showHealingEffect(x, y, healing, isCritical = false) {
        if (!this.particleManager) return;

        const color = isCritical ? '#ff6b6b' : '#2ed573';
        const fontSize = isCritical ? 26 : 20;
        const healText = isCritical ? `+${healing}!` : `+${healing}`;

        const floatingText = this.particleManager.createFloatingText(
            x, y - 20, healText, color, fontSize
        );

        if (floatingText && isCritical) {
            // Add healing particle effect
            if (this.particleManager.createParticleBurst) {
                this.particleManager.createParticleBurst(x, y, 0x2ED573, 6, 250);
            }
        }
    }

    /**
     * Show threat/taunt effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} effectType - Type of threat effect ('taunt', 'threat', 'aggro')
     */
    showThreatEffect(x, y, effectType = 'taunt') {
        if (!this.particleManager) return;

        const threatText = effectType === 'taunt' ? 'TAUNT!' :
                          effectType === 'threat' ? 'THREAT!' : 'AGGRO!';

        const floatingText = this.particleManager.createFloatingText(
            x, y - 25, threatText, '#ffa502', 16
        );

        if (floatingText) {
            // Add taunt particle effect
            if (this.particleManager.createParticleBurst) {
                this.particleManager.createParticleBurst(x, y, 0xFFA502, 4, 150);
            }
        }
    }

    /**
     * Create screen flash effect
     * @param {number} color - Flash color
     * @param {number} alpha - Flash alpha
     * @param {number} duration - Flash duration in ms
     */
    createScreenFlash(color, alpha = 0.5, duration = 200) {
        const flash = this.scene.add.rectangle(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            color,
            0
        );
        flash.setScrollFactor(0);
        flash.setDepth(999);

        this.scene.tweens.add({
            targets: flash,
            alpha: alpha,
            duration: duration / 2,
            yoyo: true,
            onComplete: () => {
                flash.destroy();
            }
        });
    }

    /**
     * Get damage color based on type and critical status
     * @param {string} damageType - Type of damage
     * @param {boolean} isCritical - Whether critical
     * @returns {string} Color hex string
     */
    getDamageColor(damageType, isCritical) {
        if (isCritical) return this.damageNumberSettings.criticalColor;

        const colors = {
            physical: '#ff6b6b',
            magical: '#4ecdc4',
            healing: '#2ed573',
            default: '#ffffff'
        };

        return colors[damageType] || colors.default;
    }

    /**
     * Get damage type indicator
     * @param {string} damageType - Type of damage
     * @returns {string} Indicator symbol
     */
    getDamageTypeIndicator(damageType) {
        const indicators = {
            physical: '',
            magical: '✨',
            healing: '+',
            default: ''
        };

        return indicators[damageType] || indicators.default;
    }

    /**
     * Get proc text for ability effects
     * @param {string} abilityName - Name of the ability
     * @param {string} procType - Type of proc
     * @returns {string} Proc display text
     */
    getProcText(abilityName, procType) {
        const procTexts = {
            damage: `${abilityName}!`,
            healing: `${abilityName} Heal!`,
            buff: `${abilityName} Buff!`,
            debuff: `${abilityName} Debuff!`,
            default: `${abilityName}!`
        };

        return procTexts[procType] || procTexts.default;
    }

    /**
     * Cleanup all UI elements
     */
    destroy() {
        this.closeCombatTacticsMenu();
        this.destroyThreatDisplay();
        this.destroyCombatIndicator();
    }
}


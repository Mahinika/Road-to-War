/**
 * Combat Visuals - Handles combat visual effects and UI elements
 * Extracted from CombatManager to improve separation of concerns
 */

import { Logger } from '../../utils/logger.js';

export class CombatVisuals {
    /**
     * Create a new CombatVisuals
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        this.scene = scene;
        this.partyManager = config.partyManager;

        // Visual elements storage
        this.healthBars = new Map(); // Map<type, {bg, healthBar, border, combatant}>
        this.manaBars = new Map();
        this.damageNumbers = [];
        this.floatingTexts = [];
        this.statusEffectIndicators = new Map(); // Map<key, Array<{icon, text, effectType}>>
    }

    /**
     * Create visual elements for combat
     * @param {Object} enemy - Enemy object
     * @param {Object} hero - Hero object
     * @param {Object} currentCombat - Current combat state
     */
    createCombatVisuals(enemy, hero, currentCombat) {
        if (!enemy) return;

        // For party combat, use primary hero (tank) or first hero
        let primaryHero = null;
        if (this.partyManager && typeof this.partyManager.getTank === 'function') {
            primaryHero = this.partyManager.getTank() || this.partyManager.getHeroByIndex(0);
        } else if (this.partyManager && typeof this.partyManager.getHeroByIndex === 'function') {
            primaryHero = this.partyManager.getHeroByIndex(0);
        }

        if (!primaryHero && !hero) return;

        const heroSprite = primaryHero?.sprite || hero;

        // Robust health data extraction
        const getHealthData = (entity, combatData) => {
            if (combatData) return combatData;
            if (entity && entity.data) {
                return {
                    currentHealth: entity.data.currentHealth ?? entity.data.stats?.health ?? 100,
                    maxHealth: entity.data.stats?.maxHealth ?? 100
                };
            }
            return { currentHealth: 100, maxHealth: 100 };
        };

        const heroData = getHealthData(primaryHero || hero, currentCombat?.hero);
        const enemyData = getHealthData(enemy, currentCombat?.enemy);

        if (!heroSprite || !enemyData) return;

        // Create health bars
        if (heroSprite) {
            this.createHealthBar(primaryHero || hero, heroData, 'hero');
        }
        if (enemy.sprite) {
            this.createHealthBar(enemy, enemyData, 'enemy');
        }

        // Create mana bar for primary hero
        if (heroSprite) {
            this.createManaBar(heroSprite);
        }

        // Initialize status effect indicators
        this.updateStatusEffectIndicators();

        // Add visual combat indicator to enemy sprite (glow effect)
        if (enemy.sprite) {
            // Add red glow to indicate combat
            if (enemy.sprite.postFX && typeof enemy.sprite.postFX.addGlow === 'function') {
                enemy.sprite.postFX.addGlow(0xff0000, 4, 0, false, 0.3, 16);
            }
            // Also add a pulsing border effect
            this.scene.tweens.add({
                targets: enemy.sprite,
                scaleX: { from: 1.0, to: 1.1 },
                scaleY: { from: 1.0, to: 1.1 },
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        Logger.debug('CombatVisuals', 'Created combat visuals');
    }

    /**
     * Create health bar for combatant
     * @param {Object} combatant - Combatant sprite
     * @param {Object} data - Combatant data
     * @param {string} type - 'hero' or 'enemy'
     */
    createHealthBar(combatant, data, type) {
        const width = 100; // Increased from 80 for better visibility
        const height = 16; // Increased from 12 for better visibility
        const combatantX = combatant?.sprite?.x || combatant?.x || 0;
        const combatantY = combatant?.sprite?.y || combatant?.y || 0;
        const y = combatantY - 60; // Moved up more for better visibility

        // Safety check for data
        if (!data || typeof data.currentHealth === 'undefined' || typeof data.maxHealth === 'undefined') {
            Logger.warn('CombatVisuals', `Missing health data for ${type}`, data);
            return;
        }

        // Background with stronger opacity
        const bg = this.scene.add.rectangle(combatantX, y, width, height, 0x000000, 1.0);
        bg.setDepth(300); // High depth to ensure visibility

        // Health bar with brighter colors
        const maxHealth = Math.max(1, data.maxHealth); // Prevent division by zero
        const healthPercent = Math.max(0, Math.min(1, data.currentHealth / maxHealth));
        const healthWidth = (width - 4) * healthPercent;

        const healthBar = this.scene.add.rectangle(
            combatantX - width / 2 + 2,
            y,
            healthWidth,
            height - 2,
            type === 'hero' ? 0x00ff00 : 0xff0000
        );
        healthBar.setDepth(301); // Above background

        // Border with thicker, brighter stroke
        const border = this.scene.add.rectangle(
            combatantX - width / 2 + 2,
            y,
            width,
            height,
            0x000000,
            0
        ).setStrokeStyle(4, 0xffffff); // Thicker white border
        border.setDepth(302); // Above everything

        // Add health text for clarity
        const healthText = this.scene.add.text(
            combatantX,
            y,
            `${Math.ceil(data.currentHealth)}/${Math.ceil(data.maxHealth)}`,
            {
                font: 'bold 10px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        healthText.setOrigin(0.5, 0.5);
        healthText.setDepth(303); // Above everything

        // Store reference for updates
        this.healthBars.set(type, { bg, healthBar, border, combatant, healthText });
    }

    /**
     * Create mana bar for hero
     * @param {Object} hero - Hero sprite
     */
    createManaBar(hero) {
        if (!hero || !hero.data) return;

        const width = 60;
        const height = 6;
        const y = hero.y - 50; // Below health bar

        // Background
        const bg = this.scene.add.rectangle(hero.x, y, width, height, 0x000000, 0.8);

        // Mana bar (blue)
        const manaPercent = (hero.data.mana || 0) / (hero.data.maxMana || 100);
        const manaWidth = (width - 4) * manaPercent;

        const manaBar = this.scene.add.rectangle(
            hero.x - width / 2 + 2,
            y,
            manaWidth,
            height,
            0x0088ff
        );

        // Border
        const border = this.scene.add.rectangle(
            hero.x - width / 2 + 2,
            y,
            width,
            height,
            0x000000,
            0
        ).setStrokeStyle(1, 0x333333);

        // Store reference for updates
        this.manaBars.set('hero', { bg, manaBar, border, hero });
    }

    /**
     * Update health bars for all combatants or a specific type
     * @param {string|null} type - 'hero', 'enemy', or null for both
     */
    updateHealthBars(type = null) {
        // Update hero health bar
        if (type === 'hero' || type === null) {
            const heroBar = this.healthBars.get('hero');
            if (heroBar) {
                this.updateCombatantHealthBar(heroBar, 'hero');
            }
        }

        // Update enemy health bar
        if (type === 'enemy' || type === null) {
            const enemyBar = this.healthBars.get('enemy');
            if (enemyBar) {
                this.updateCombatantHealthBar(enemyBar, 'enemy');
            }
        }
    }

    /**
     * Update mana bars
     */
    updateManaBars() {
        const manaBar = this.manaBars.get('hero');
        if (manaBar && manaBar.hero?.data) {
            const width = 60;
            const manaPercent = (manaBar.hero.data.mana || 0) / (manaBar.hero.data.maxMana || 100);
            const manaWidth = (width - 4) * manaPercent;

            manaBar.manaBar.width = manaWidth;
            manaBar.manaBar.x = manaBar.hero.x - width / 2 + 2;
            manaBar.bg.x = manaBar.hero.x;
            manaBar.border.x = manaBar.hero.x - width / 2 + 2;
        }
    }

    /**
     * Update specific combatant health bar
     * @param {Object} barData - Bar data object
     * @param {string} type - 'hero' or 'enemy'
     */
    updateCombatantHealthBar(barData, type) {
        if (!barData.combatant) return;

        // Get health data from various possible locations
        let currentHealth = 0;
        let maxHealth = 100;
        let hasData = false;

        const combatant = barData.combatant;

        // 1. Try direct data properties (from our wrapper objects)
        if (combatant.data?.stats) {
            currentHealth = combatant.data.currentHealth ?? combatant.data.stats.health ?? 0;
            maxHealth = combatant.data.stats.maxHealth ?? 100;
            hasData = true;
        }
        // 2. Try sprite data manager (Phaser)
        else if (combatant.getData && combatant.getData('stats')) {
            const stats = combatant.getData('stats');
            currentHealth = combatant.getData('currentHealth') ?? stats.health ?? 0;
            maxHealth = stats.maxHealth ?? 100;
            hasData = true;
        }
        // 3. Try direct stats property
        else if (combatant.stats) {
            currentHealth = combatant.health ?? combatant.stats.health ?? 0;
            maxHealth = combatant.stats.maxHealth ?? 100;
            hasData = true;
        }

        if (!hasData) return;

        const combatantX = combatant?.sprite?.x || combatant?.x || 0;
        const combatantY = combatant?.sprite?.y || combatant?.y || 0;
        const width = 100; // Match createHealthBar
        const height = 16; // Match createHealthBar
        const y = combatantY - 60; // Match createHealthBar

        // Update positions
        barData.bg.setPosition(combatantX, y);
        barData.border.setPosition(combatantX - width / 2 + 2, y);

        // Update health bar
        const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));
        const healthWidth = (width - 4) * healthPercent;

        barData.healthBar.width = healthWidth;
        barData.healthBar.height = height - 2; // Match createHealthBar
        barData.healthBar.setPosition(combatantX - width / 2 + 2, y);
        barData.healthBar.fillColor = type === 'hero' ? 0x00ff00 : 0xff0000;

        // Ensure visibility
        barData.bg.setVisible(true);
        barData.healthBar.setVisible(true);
        barData.border.setVisible(true);

        // Update health text if it exists
        if (barData.healthText) {
            barData.healthText.setPosition(combatantX, y);
            barData.healthText.setText(`${Math.ceil(currentHealth)}/${Math.ceil(maxHealth)}`);
            barData.healthText.setVisible(true);
        }
    }

    /**
     * Show damage number effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount
     * @param {string} color - Text color
     */
    showDamageNumber(x, y, damage, color = '#ffffff') {
        // Get text object from pool
        const damageText = this.damageNumberPool.acquire();
        damageText.setPosition(x, y);
        damageText.setText(damage.toString());
        damageText.setStyle({ fill: color });
        damageText.setOrigin(0.5, 0.5);
        damageText.setVisible(true);
        damageText.setActive(true);
        damageText.setAlpha(1);

        this.damageNumbers.push(damageText);

        // Animate damage number
        this.scene.tweens.add({
            targets: damageText,
            y: { from: y, to: y - 50 },
            alpha: { from: 1, to: 0 },
            duration: 1000,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // Return to pool instead of destroying
                const index = this.damageNumbers.indexOf(damageText);
                if (index > -1) {
                    this.damageNumbers.splice(index, 1);
                }
                this.damageNumberPool.release(damageText);
            }
        });
    }

    /**
     * Show floating text effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text to display
     * @param {string} color - Text color
     */
    showFloatingText(x, y, text, color = '#ffffff') {
        const floatingText = this.scene.add.text(x, y, text, {
            font: 'bold 16px Arial',
            fill: color,
            backgroundColor: '#000000',
            padding: { x: 5, y: 2 }
        });
        floatingText.setOrigin(0.5, 0.5);

        this.floatingTexts.push(floatingText);

        // Animate floating text
        this.scene.tweens.add({
            targets: floatingText,
            y: { from: y, to: y - 80 },
            alpha: { from: 1, to: 0 },
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // Clean up
                const index = this.floatingTexts.indexOf(floatingText);
                if (index > -1) {
                    this.floatingTexts.splice(index, 1);
                }
                floatingText.destroy();
            }
        });
    }

    /**
     * Update status effect visual indicators for a combatant
     * @param {Object} combatant - Hero or enemy
     * @param {string} type - 'hero' or 'enemy'
     */
    updateCombatantStatusEffects(combatant, type) {
        if (!combatant || !combatant.data || !combatant.data.statusEffects) return;

        const key = `${type}_effects`;
        if (!this.statusEffectIndicators) {
            this.statusEffectIndicators = new Map();
        }
        const existingIndicators = this.statusEffectIndicators.get(key) || [];

        // Remove old indicators
        existingIndicators.forEach(indicator => {
            if (indicator.text) indicator.text.destroy();
            if (indicator.icon) indicator.icon.destroy();
        });
        existingIndicators.length = 0;

        // Create new indicators
        const effects = combatant.data.statusEffects || {};
        const effectCount = Object.keys(effects).length;
        if (effectCount === 0) {
            this.statusEffectIndicators.set(key, []);
            return;
        }

        const combatantX = combatant?.sprite?.x || combatant?.x || 0;
        const combatantY = combatant?.sprite?.y || combatant?.y || 0;
        const baseY = combatantY - 60;
        const startX = combatantX - (effectCount * 15) / 2;

        let index = 0;
        for (const [effectType, effectData] of Object.entries(effects)) {
            if (effectData.turnsRemaining < 0) continue;

            // Get effect definition from status effects manager if available
            const statusEffectsManager = this.scene.statusEffectsManager;
            const effectDef = statusEffectsManager?.getEffectDefinition?.(effectType) || {
                icon: '?',
                color: '#ffffff'
            };

            const x = startX + (index * 15);

            // Create icon text
            const icon = this.scene.add.text(x, baseY, effectDef.icon || '?', {
                font: '14px Arial',
                fill: effectDef.color || '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            });
            icon.setOrigin(0.5);
            icon.setDepth(310);

            // Create turn counter
            const turnsText = this.scene.add.text(x, baseY + 12, `${effectData.turnsRemaining || ''}`, {
                font: '10px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 1
            });
            turnsText.setOrigin(0.5);
            turnsText.setDepth(311);

            existingIndicators.push({ icon, text: turnsText, effectType });
            index++;
        }

        this.statusEffectIndicators.set(key, existingIndicators);
    }

    /**
     * Update status effect visual indicators for all combatants
     */
    updateStatusEffectIndicators() {
        // Update hero status effects if available
        if (this.healthBars.has('hero')) {
            const heroBar = this.healthBars.get('hero');
            if (heroBar.combatant) {
                this.updateCombatantStatusEffects(heroBar.combatant, 'hero');
            }
        }

        // Update enemy status effects if available
        if (this.healthBars.has('enemy')) {
            const enemyBar = this.healthBars.get('enemy');
            if (enemyBar.combatant) {
                this.updateCombatantStatusEffects(enemyBar.combatant, 'enemy');
            }
        }
    }

    /**
     * Clear all combat visuals
     */
    clearCombatVisuals() {
        // Destroy health bars
        this.healthBars.forEach(barData => {
            if (barData.bg) barData.bg.destroy();
            if (barData.healthBar) barData.healthBar.destroy();
            if (barData.border) barData.border.destroy();
            if (barData.healthText) barData.healthText.destroy();
        });
        this.healthBars.clear();

        // Destroy mana bars
        this.manaBars.forEach(barData => {
            if (barData.bg) barData.bg.destroy();
            if (barData.manaBar) barData.manaBar.destroy();
            if (barData.border) barData.border.destroy();
        });
        this.manaBars.clear();

        // Clean up status effect indicators
        if (this.statusEffectIndicators) {
            this.statusEffectIndicators.forEach(indicators => {
                indicators.forEach(indicator => {
                    if (indicator.icon) indicator.icon.destroy();
                    if (indicator.text) indicator.text.destroy();
                });
            });
            this.statusEffectIndicators.clear();
        }

        // Clean up active effects
        this.damageNumbers.forEach(text => {
            if (text && text.active) {
                this.scene.tweens.killTweensOf(text);
                text.destroy();
            }
        });
        this.damageNumbers = [];

        this.floatingTexts.forEach(text => {
            if (text && text.active) {
                this.scene.tweens.killTweensOf(text);
                text.destroy();
            }
        });
        this.floatingTexts = [];
    }

    /**
     * Set the damage number pool reference
     * @param {ObjectPool} pool - Object pool for damage numbers
     */
    setDamageNumberPool(pool) {
        this.damageNumberPool = pool;
    }

    /**
     * Update visual positions (called when combatants move)
     */
    updateVisualPositions() {
        this.updateHealthBars();
        this.updateManaBars();
    }

    /**
     * Show damage effect (visual impact)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showDamageEffect(x, y) {
        // Create impact effect
        const impact = this.scene.add.circle(x, y, 20, 0xff0000, 0.8);
        impact.setDepth(305);

        // Animate impact
        this.scene.tweens.add({
            targets: impact,
            scale: { from: 0, to: 2 },
            alpha: { from: 1, to: 0 },
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => {
                impact.destroy();
            }
        });
    }

    /**
     * Setup combat visuals for a combat encounter
     * @param {Object} currentCombat - Current combat state
     */
    setupCombatVisuals(currentCombat) {
        if (!currentCombat) return;

        // Initialize status effect indicators map if needed
        if (!this.statusEffectIndicators) {
            this.statusEffectIndicators = new Map();
        }

        // Create visuals for party combat
        if (currentCombat.party && Array.isArray(currentCombat.party.heroes)) {
            const primaryHero = this.partyManager?.getTank() || this.partyManager?.getHeroByIndex(0);
            if (primaryHero) {
                const heroData = currentCombat.party.heroes.find(h => h.id === primaryHero.id) || currentCombat.party.heroes[0];
                this.createHealthBar(primaryHero, heroData, 'hero');
                this.createManaBar(primaryHero.sprite || primaryHero);
            }
        } else if (currentCombat.hero) {
            // Single hero combat
            this.createHealthBar(currentCombat.hero, currentCombat.hero, 'hero');
            if (currentCombat.hero.sprite) {
                this.createManaBar(currentCombat.hero.sprite);
            }
        }

        // Create enemy visuals
        if (currentCombat.enemy) {
            const enemy = currentCombat.enemy;
            const enemySprite = enemy.sprite || enemy;
            this.createHealthBar(enemySprite, currentCombat.enemy, 'enemy');
        }

        // Initialize status effect indicators
        this.updateStatusEffectIndicators();
    }

    /**
     * Reposition camera for combat to keep all combatants in view
     * @param {Object} currentCombat - Current combat state
     */
    repositionCameraForCombat(currentCombat) {
        if (!this.scene.cameras || !currentCombat) return;

        const camera = this.scene.cameras.main;
        const combatants = [];

        // Collect all combatant positions
        if (currentCombat.party?.heroes) {
            currentCombat.party.heroes.forEach(heroData => {
                const hero = this.partyManager?.getHeroById(heroData.id);
                if (hero) {
                    const x = hero.sprite?.x || hero.x || 0;
                    const y = hero.sprite?.y || hero.y || 0;
                    combatants.push({ x, y });
                }
            });
        } else if (currentCombat.hero) {
            const hero = currentCombat.hero;
            const x = hero.sprite?.x || hero.x || 0;
            const y = hero.sprite?.y || hero.y || 0;
            combatants.push({ x, y });
        }

        if (currentCombat.enemy) {
            const enemy = currentCombat.enemy;
            const x = enemy.sprite?.x || enemy.x || 0;
            const y = enemy.sprite?.y || enemy.y || 0;
            combatants.push({ x, y });
        }

        if (combatants.length === 0) return;

        // Calculate center point
        const avgX = combatants.reduce((sum, c) => sum + c.x, 0) / combatants.length;
        const avgY = combatants.reduce((sum, c) => sum + c.y, 0) / combatants.length;

        // Smoothly pan camera to center
        this.scene.tweens.add({
            targets: camera,
            scrollX: avgX,
            scrollY: avgY,
            duration: 500,
            ease: 'Power2'
        });
    }
}


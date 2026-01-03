import { Logger } from '../utils/logger.js';
import { ObjectPool } from '../utils/object-pool.js';
import { BaseManager } from './base-manager.js';

/**
 * ParticleManager - Handles all visual effects and particle systems
 * Provides centralized visual feedback for game events
 */
export class ParticleManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // ParticleManager has no dependencies
    }

    constructor(scene, config = {}) {
        super(scene, config);
        this.particles = [];
        this.activeEffects = [];

        // Performance throttling - reduce particle effect frequency
        this.lastEffectTime = {};
        this.effectCooldowns = {
            'combat': 100,        // Combat effects every 100ms max
            'combat-shake': 200,  // Combat screen shake every 200ms max
            'loot': 200,          // Loot effects every 200ms max
            'equipment': 300,     // Equipment effects every 300ms max
            'hitflash': 150,      // Hit flash effects every 150ms max
            'levelup': 1000,      // Level up effects every 1s max
            'shop': 500           // Shop effects every 500ms max
        };

        // Object pooling for floating text (lazy initialization)
        this.floatingTextPool = null;
        this.activeFloatingTexts = new Set();
        
        // Auto-scale pool periodically
        this.poolAutoScaleInterval = null;
    }

    /**
     * Initialize the particle manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        // Create particle emitters cache
        this.emitters = {};
        this.setupEmitters();

        // Initialize floating text object pool (lazy - only when needed)
        this.initializeFloatingTextPool();
        
        // Start auto-scaling pool every 30 seconds
        if (this.floatingTextPool) {
            this.poolAutoScaleInterval = this.scene.time.addEvent({
                delay: 30000,
                callback: () => {
                    if (this.floatingTextPool) {
                        this.floatingTextPool.autoScale();
                    }
                },
                loop: true
            });
        }
    }

    /**
     * Initialize floating text object pool
     */
    initializeFloatingTextPool() {
        if (this.floatingTextPool) return; // Already initialized

        this.floatingTextPool = new ObjectPool(
            () => {
                if (!this.scene || !this.scene.add || typeof this.scene.add.text !== 'function') {
                    return null;
                }
                try {
                    const text = this.scene.add.text(0, 0, '', {
                        font: 'bold 20px Arial',
                        fill: '#ffff00',
                        backgroundColor: '#000000',
                        padding: { x: 8, y: 4 }
                    });
                    text.setOrigin(0.5, 0.5);
                    text.setVisible(false);
                    text.setActive(false);
                    return text;
                } catch (error) {
                    Logger.warn('ParticleManager', `Error creating floating text: ${error.message}`);
                    return null;
                }
            },
            (text) => {
                if (text && !text.destroyed) {
                    text.setText('');
                    text.setPosition(0, 0);
                    text.setAlpha(1);
                    text.setVisible(false);
                    text.setActive(false);
                    // Stop any active tweens
                    if (text._tween) {
                        this.scene.tweens.remove(text._tween);
                        text._tween = null;
                    }
                }
            },
            0,  // Lazy initialization
            50  // Max 50 floating texts
        );
    }

    /**
     * Check if an effect type can be played (throttling)
     * @param {string} effectType - The type of effect
     * @returns {boolean} - Whether the effect can be played
     */
    canPlayEffect(effectType) {
        const now = Date.now();
        const lastTime = this.lastEffectTime[effectType] || 0;
        const cooldown = this.effectCooldowns[effectType] || 0;

        if (now - lastTime >= cooldown) {
            this.lastEffectTime[effectType] = now;
            return true;
        }
        return false;
    }

    /**
     * Recreate a single emitter if it was destroyed
     * @param {string} type - Emitter type
     */
    recreateEmitter(type) {
        // Ensure textures exist
        if (!this.scene.textures.exists('particle-combat')) {
            this.createParticleTextures();
        }

        // Destroy old emitter if it exists
        if (this.emitters[type] && !this.emitters[type].destroyed) {
            try {
                this.emitters[type].destroy();
            } catch (error) {
                // Ignore destroy errors
            }
        }

        // Recreate based on type
        const emitterConfigs = {
            'combat': { texture: 'particle-combat', config: { scale: { start: 0.6, end: 0 }, speed: { min: 80, max: 200 }, lifespan: 600, emitting: false, blendMode: 'ADD' } },
            'loot': { texture: 'particle-sparkle', config: { scale: { start: 0.4, end: 0 }, speed: { min: 30, max: 120 }, lifespan: 1000, tint: 0x44ff44, emitting: false, blendMode: 'ADD' } },
            'gold': { texture: 'particle-sparkle', config: { scale: { start: 0.5, end: 0 }, speed: { min: 40, max: 150 }, lifespan: 900, tint: 0xffd700, emitting: false, blendMode: 'ADD' } },
            'shop': { texture: 'particle-sparkle', config: { scale: { start: 0.4, end: 0 }, speed: { min: 35, max: 130 }, lifespan: 1100, tint: 0x00ffff, emitting: false, blendMode: 'ADD' } },
            'fire': { texture: 'particle-flare', config: { scale: { start: 0.8, end: 0 }, speed: { min: 100, max: 250 }, angle: { min: 0, max: 360 }, lifespan: 800, tint: [0xff4400, 0xff8800, 0xffff00], emitting: false, blendMode: 'ADD' } },
            'frost': { texture: 'particle-snow', config: { scale: { start: 0.5, end: 0.1 }, speed: { min: 20, max: 100 }, alpha: { start: 1, end: 0 }, lifespan: 1200, tint: 0xaaddff, emitting: false, blendMode: 'ADD' } },
            'void': { texture: 'particle-smoke', config: { scale: { start: 0.2, end: 1.5 }, speed: { min: 10, max: 50 }, alpha: { start: 0.6, end: 0 }, lifespan: 1500, tint: 0x800080, emitting: false, blendMode: 'NORMAL' } },
            'holy': { texture: 'particle-flare', config: { scale: { start: 1.2, end: 0 }, speed: { min: 0, max: 40 }, alpha: { start: 1, end: 0 }, lifespan: 1000, tint: 0xffffaa, emitting: false, blendMode: 'ADD' } },
            'nature': { texture: 'particle-sparkle', config: { scale: { start: 0.6, end: 0 }, speed: { min: 50, max: 150 }, lifespan: 1000, tint: 0x88ff88, emitting: false, blendMode: 'ADD' } },
            'lightning': { texture: 'particle-flare', config: { scale: { start: 0.3, end: 1.2 }, speed: 0, alpha: { start: 1, end: 0 }, lifespan: 200, tint: 0xaaaaff, emitting: false, blendMode: 'ADD' } }
        };

        const emitterConfig = emitterConfigs[type];
        if (!emitterConfig) {
            Logger.warn('ParticleManager', `Unknown emitter type for recreation: ${type}`);
            return;
        }

        // Check if texture exists, create if not
        if (!this.scene.textures.exists(emitterConfig.texture)) {
            this.createParticleTextures();
        }

        try {
            this.emitters[type] = this.scene.add.particles(0, 0, emitterConfig.texture, emitterConfig.config);
        } catch (error) {
            Logger.warn('ParticleManager', `Failed to recreate emitter ${type}: ${error.message}`);
        }
    }

    /**
     * Set up common particle emitters
     */
    setupEmitters() {
        // Create simple particle textures programmatically
        this.createParticleTextures();

        // 1. Basic Emitters
        // Combat impact emitter (red/orange explosion)
        this.emitters.combat = this.scene.add.particles(0, 0, 'particle-combat', {
            scale: { start: 0.6, end: 0 },
            speed: { min: 80, max: 200 },
            lifespan: 600,
            emitting: false,
            blendMode: 'ADD'
        });

        // Loot collection emitter (green sparkle)
        this.emitters.loot = this.scene.add.particles(0, 0, 'particle-sparkle', {
            scale: { start: 0.4, end: 0 },
            speed: { min: 30, max: 120 },
            lifespan: 1000,
            tint: 0x44ff44,
            emitting: false,
            blendMode: 'ADD'
        });

        // Gold collection emitter (gold sparkle)
        this.emitters.gold = this.scene.add.particles(0, 0, 'particle-sparkle', {
            scale: { start: 0.5, end: 0 },
            speed: { min: 40, max: 150 },
            lifespan: 900,
            tint: 0xffd700,
            emitting: false,
            blendMode: 'ADD'
        });

        // Shop purchase emitter (blue sparkle)
        this.emitters.shop = this.scene.add.particles(0, 0, 'particle-sparkle', {
            scale: { start: 0.4, end: 0 },
            speed: { min: 35, max: 130 },
            lifespan: 1100,
            tint: 0x00ffff,
            emitting: false,
            blendMode: 'ADD'
        });

        // 2. Thematic Magic Emitters (Phase 9: High Quality Animations)
        
        // Fire / Dragon Breath
        this.emitters.fire = this.scene.add.particles(0, 0, 'particle-flare', {
            scale: { start: 0.8, end: 0 },
            speed: { min: 100, max: 250 },
            angle: { min: 0, max: 360 },
            lifespan: 800,
            tint: [0xff4400, 0xff8800, 0xffff00],
            emitting: false,
            blendMode: 'ADD'
        });

        // Frost / Cold
        this.emitters.frost = this.scene.add.particles(0, 0, 'particle-snow', {
            scale: { start: 0.5, end: 0.1 },
            speed: { min: 20, max: 100 },
            alpha: { start: 1, end: 0 },
            lifespan: 1200,
            tint: 0xaaddff,
            emitting: false,
            blendMode: 'ADD'
        });

        // Void / Shadow
        this.emitters.void = this.scene.add.particles(0, 0, 'particle-smoke', {
            scale: { start: 0.2, end: 1.5 },
            speed: { min: 10, max: 50 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 1500,
            tint: 0x800080,
            emitting: false,
            blendMode: 'NORMAL'
        });

        // Holy / Divine
        this.emitters.holy = this.scene.add.particles(0, 0, 'particle-flare', {
            scale: { start: 1.2, end: 0 },
            speed: { min: 0, max: 40 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            tint: 0xffffaa,
            emitting: false,
            blendMode: 'ADD'
        });

        // Nature / Healing
        this.emitters.nature = this.scene.add.particles(0, 0, 'particle-sparkle', {
            scale: { start: 0.6, end: 0 },
            speed: { min: 50, max: 150 },
            lifespan: 1000,
            tint: 0x88ff88,
            emitting: false,
            blendMode: 'ADD'
        });

        // Lightning
        this.emitters.lightning = this.scene.add.particles(0, 0, 'particle-flare', {
            scale: { start: 0.3, end: 1.2 },
            speed: 0,
            alpha: { start: 1, end: 0 },
            lifespan: 200,
            tint: 0xaaaaff,
            emitting: false,
            blendMode: 'ADD'
        });
    }

    /**
     * Create advanced particle textures programmatically
     */
    createParticleTextures() {
        const graphics = this.scene.add.graphics();

        // 1. Basic Combat Particle
        graphics.clear();
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(8, 8, 6);
        graphics.generateTexture('particle-combat', 16, 16);

        // 2. Sparkle (Star shape)
        graphics.clear();
        graphics.fillStyle(0xffffff);
        graphics.beginPath();
        graphics.moveTo(8, 0);
        graphics.lineTo(10, 6);
        graphics.lineTo(16, 8);
        graphics.lineTo(10, 10);
        graphics.lineTo(8, 16);
        graphics.lineTo(6, 10);
        graphics.lineTo(0, 8);
        graphics.lineTo(6, 6);
        graphics.closePath();
        graphics.fillPath();
        graphics.generateTexture('particle-sparkle', 16, 16);

        // 3. Flare (Soft glow)
        graphics.clear();
        for(let i = 8; i > 0; i--) {
            graphics.fillStyle(0xffffff, (8-i)/32);
            graphics.fillCircle(16, 16, i * 2);
        }
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(16, 16, 2);
        graphics.generateTexture('particle-flare', 32, 32);

        // 4. Smoke (Soft irregular blob)
        graphics.clear();
        graphics.fillStyle(0xffffff, 0.5);
        graphics.fillCircle(16, 16, 12);
        graphics.fillCircle(12, 12, 8);
        graphics.fillCircle(20, 14, 10);
        graphics.generateTexture('particle-smoke', 32, 32);

        // 5. Snow/Crystal
        graphics.clear();
        graphics.lineStyle(2, 0xffffff);
        graphics.strokeRect(4, 4, 8, 8);
        graphics.strokeLineShape(new Phaser.Geom.Line(0, 8, 16, 8));
        graphics.strokeLineShape(new Phaser.Geom.Line(8, 0, 8, 16));
        graphics.generateTexture('particle-snow', 16, 16);

        graphics.destroy();
    }

    /**
     * Create explosion effect at position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} type - Type of effect ('combat', 'loot', 'gold', 'shop')
     * @param {number} intensity - Number of particles (default: 20)
     */
    createExplosion(x, y, type = 'combat', intensity = 20) {
        // Performance throttling - skip if effect played too recently
        if (!this.canPlayEffect(type)) {
            return;
        }

        if (!this.emitters) {
            Logger.warn('ParticleManager', 'createExplosion called before init(); emitters not initialized');
            return;
        }

        let emitter = this.emitters[type];
        if (!emitter) {
            Logger.warn('ParticleManager', `Unknown particle type: ${type}`);
            return;
        }

        // Check if emitter is destroyed or texture is missing
        if (emitter.destroyed || !emitter.active) {
            // Recreate emitter if it was destroyed
            this.recreateEmitter(type);
            emitter = this.emitters[type];
            if (!emitter || emitter.destroyed) {
                Logger.warn('ParticleManager', `Failed to recreate emitter for type: ${type}`);
                return;
            }
        }

        // Check if emitter's texture exists and is valid
        const textureKey = emitter.texture?.key;
        if (textureKey && !this.scene.textures.exists(textureKey)) {
            // Texture was destroyed, recreate emitter
            this.recreateEmitter(type);
            emitter = this.emitters[type];
            if (!emitter || emitter.destroyed) {
                Logger.warn('ParticleManager', `Failed to recreate emitter after texture loss for type: ${type}`);
                return;
            }
        }

        // Safety check: ensure emitter has valid texture
        if (!emitter.texture || emitter.texture.destroyed) {
            Logger.warn('ParticleManager', `Emitter for type ${type} has invalid texture, recreating...`);
            this.recreateEmitter(type);
            emitter = this.emitters[type];
            if (!emitter || emitter.destroyed || !emitter.texture) {
                Logger.warn('ParticleManager', `Failed to recreate emitter with valid texture for type: ${type}`);
                return;
            }
        }

        try {
            // Position emitter at explosion point
            emitter.setPosition(x, y);

            // Emit particles
            emitter.explode(intensity);

        } catch (error) {
            Logger.warn('ParticleManager', `Error creating explosion for type ${type}: ${error.message}`);
            // Try to recreate emitter on error
            this.recreateEmitter(type);
        }
    }

    /**
     * Create flowing trail effect
     * @param {number} x - Starting X position
     * @param {number} y - Starting Y position
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {string} type - Type of trail ('loot', 'gold')
     */
    createTrail(x, y, targetX, targetY, type = 'loot') {
        if (!this.emitters) {
            Logger.warn('ParticleManager', 'createTrail called before init(); emitters not initialized');
            return;
        }

        const emitter = this.emitters[type];
        if (!emitter) {
            Logger.warn('ParticleManager', `Unknown trail type: ${type}`);
            return;
        }

        // Calculate direction
        const angle = Math.atan2(targetY - y, targetX - x);
        const distance = Math.sqrt((targetX - x) ** 2 + (targetY - y) ** 2);
        const duration = distance * 2; // Speed based on distance

        // Create moving particle effect
        const particle = this.scene.add.circle(x, y, 3, this.getTrailColor(type));
        this.scene.tweens.add({
            targets: particle,
            x: targetX,
            y: targetY,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                // Create small explosion at destination
                this.createExplosion(targetX, targetY, type, 10);
                particle.destroy();
            }
        });

        return particle;
    }

    /**
     * Get color for trail effect
     * @param {string} type - Trail type
     * @returns {number} Color value
     */
    getTrailColor(type) {
        const colors = {
            'loot': 0x00ff00,
            'gold': 0xffff00,
            'shop': 0x00ffff
        };
        return colors[type] || 0xffffff;
    }


    /**
     * Create floating text effect (using object pooling)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text to display
     * @param {string} color - Text color (default: '#ffff00')
     * @param {number} fontSize - Font size (default: 20)
     */
    createFloatingText(x, y, text, color = '#ffff00', fontSize = 20) {
        // Initialize pool if needed
        if (!this.floatingTextPool) {
            this.initializeFloatingTextPool();
        }

        // Get text from pool
        const floatingText = this.floatingTextPool.get();
        
        // Track pool usage for statistics
        if (floatingText && this.scene.memoryMonitor) {
            this.scene.memoryMonitor.trackPoolUsage('floatingText', true);
        } else if (!floatingText && this.scene.memoryMonitor) {
            this.scene.memoryMonitor.trackPoolUsage('floatingText', false);
        }
        if (!floatingText) {
            // Pool creation failed, fallback to direct creation
            Logger.warn('ParticleManager', 'Floating text pool unavailable, using direct creation');
            const fallbackText = this.scene.add.text(x, y, text, {
                font: `bold ${fontSize}px Arial`,
                fill: color,
                backgroundColor: '#000000',
                padding: { x: 8, y: 4 }
            });
            fallbackText.setOrigin(0.5, 0.5);
            this.scene.tweens.add({
                targets: fallbackText,
                y: y - 50,
                alpha: 0,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    fallbackText.destroy();
                }
            });
            return fallbackText;
        }

        // Configure pooled text
        floatingText.setText(text);
        floatingText.setPosition(x, y);
        floatingText.setStyle({
            font: `bold ${fontSize}px Arial`,
            fill: color
        });
        floatingText.setAlpha(1);
        floatingText.setVisible(true);
        floatingText.setActive(true);

        // Track active text
        this.activeFloatingTexts.add(floatingText);

        // Animate floating up and fade out
        const tween = this.scene.tweens.add({
            targets: floatingText,
            y: y - 50,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                // Return to pool instead of destroying
                this.activeFloatingTexts.delete(floatingText);
                if (this.floatingTextPool) {
                    this.floatingTextPool.release(floatingText);
                } else {
                    floatingText.destroy();
                }
            }
        });
        floatingText._tween = tween;

        return floatingText;
    }

    /**
     * Create damage number effect
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} damage - Damage amount
     * @param {boolean} isCritical - Whether this is critical damage
     */
    createDamageNumber(x, y, damage, isCritical = false) {
        const color = isCritical ? '#ff0000' : '#ffffff';
        const size = isCritical ? 28 : 20;
        const text = isCritical ? `${damage}!` : damage.toString();
        
        return this.createFloatingText(x, y, text, color, size);
    }

    /**
     * Create level up effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createLevelUpEffect(x, y) {
        // Create golden explosion
        this.createExplosion(x, y, 'gold', 50);
        
        // Create floating text
        this.createFloatingText(x, y - 30, 'LEVEL UP!', '#ffd700', 32);
        
        // Create additional sparkles
        for (let i = 0; i < 5; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const offsetX = (Math.random() - 0.5) * 100;
                const offsetY = (Math.random() - 0.5) * 100;
                this.createExplosion(x + offsetX, y + offsetY, 'gold', 20);
            });
        }
    }

    /**
     * Apply hit flash effect to a sprite
     * @param {Phaser.GameObjects.Sprite} target - Sprite to flash
     * @param {number} duration - Flash duration
     */
    applyHitFlash(target, duration = 150) {
        if (!target) return;

        // Performance throttling - skip if hit flash played too recently
        if (!this.canPlayEffect('hitflash')) {
            return;
        }

        // Use postFX or tint fallback
        // Note: addBrightness is not a standard Phaser 3.60+ method, using addColorMatrix instead
        if (target.postFX && typeof target.postFX.addColorMatrix === 'function') {
            const colorMatrix = target.postFX.addColorMatrix();
            if (!colorMatrix) return; // Safety check

            colorMatrix.brightness(2);

            // Create a proxy object to tween the brightness value
            const proxy = { value: 2 };
            const tween = this.scene.tweens.add({
                targets: proxy,
                value: 1,
                duration: duration,
                onUpdate: () => {
                    // Additional safety checks - colorMatrix might be invalidated
                    if (colorMatrix && typeof colorMatrix.brightness === 'function' && !colorMatrix._destroyed) {
                        try {
                            colorMatrix.brightness(proxy.value);
                        } catch (error) {
                            // Silently fail if colorMatrix is corrupted - no console spam
                            tween.stop();
                            // Mark as destroyed to prevent further attempts
                            if (colorMatrix) colorMatrix._destroyed = true;
                        }
                    } else if (colorMatrix) {
                        // If colorMatrix is invalid, stop tween
                        colorMatrix._destroyed = true;
                        tween.stop();
                    }
                },
                onComplete: () => {
                    // Safe cleanup with additional checks
                    if (target && target.postFX && colorMatrix && !colorMatrix._destroyed) {
                        try {
                            target.postFX.remove(colorMatrix);
                        } catch (error) {
                            // Silently fail if removal fails - no console spam
                        }
                    }
                    // Mark as destroyed
                    if (colorMatrix) colorMatrix._destroyed = true;
                }
            });
        } else {
            // Standard tint fallback for older Phaser versions or if FX fails
            if (typeof target.setTint === 'function') {
                target.setTint(0xffffff);
                this.scene.time.delayedCall(duration, () => {
                    if (target && typeof target.clearTint === 'function') {
                        target.clearTint();
                    }
                });
            }
        }
    }

    /**
     * Destroy the particle manager and clean up resources
     */
    /**
     * Cleanup method for memory optimization
     */
    cleanup() {
        // Clean up inactive floating texts
        if (this.activeFloatingTexts) {
            this.activeFloatingTexts.forEach(text => {
                if (text && !text.destroyed && text.alpha <= 0) {
                    this.activeFloatingTexts.delete(text);
                    if (this.floatingTextPool) {
                        this.floatingTextPool.release(text);
                    } else if (text.destroy) {
                        text.destroy();
                    }
                }
            });
        }

        // Clean up inactive emitters
        if (this.emitters) {
            Object.entries(this.emitters).forEach(([key, emitter]) => {
                if (emitter && typeof emitter.destroy === 'function') {
                    try {
                        emitter.destroy();
                    } catch (e) {
                        // Silently fail
                    }
                }
            });
        }
    }

    destroy() {
        // Clean up emitters
        if (this.emitters) {
            Object.values(this.emitters).forEach(emitter => {
                if (emitter && typeof emitter.destroy === 'function') {
                    emitter.destroy();
                }
            });
            this.emitters = {};
        }

        // Clean up weather emitter
        if (this.weatherEmitter) {
            this.weatherEmitter.destroy();
            this.weatherEmitter = null;
        }

        // Clean up floating text pool
        if (this.floatingTextPool) {
            // Return all active texts to pool first
            this.activeFloatingTexts.forEach(text => {
                if (text && !text.destroyed) {
                    if (text._tween) {
                        this.scene.tweens.remove(text._tween);
                    }
                    this.floatingTextPool.release(text);
                }
            });
            this.activeFloatingTexts.clear();
            this.floatingTextPool.clear();
            this.floatingTextPool = null;
        }

        // Clean up generated textures to prevent memory leaks
        const textureKeys = ['particle-combat', 'particle-sparkle', 'particle-flare', 'particle-smoke', 'particle-snow'];
        textureKeys.forEach(key => {
            if (this.scene && this.scene.textures && this.scene.textures.exists(key)) {
                this.scene.textures.remove(key);
            }
        });

        // Clear active effects array
        this.activeEffects = [];
    }

    /**
     * Create bloodline aura effect (Enhanced Phase 9 Version)
     * @param {Phaser.GameObjects.Sprite} target - Sprite to attach aura to
     * @param {string} bloodlineId - Bloodline ID
     * @param {number} duration - Duration in ms (0 for sustained)
     */
    createBloodlineAura(target, bloodlineId, duration = 3000) {
        if (!target) return;
        
        if (!this.emitters) {
            Logger.warn('ParticleManager', 'createBloodlineAura called before init(); emitters not initialized');
            return;
        }

        let color = 0xffffff;
        let type = 'holy';
        let particleConfig = {};

        switch (bloodlineId) {
            case 'ancient_warrior':
                color = 0xff4400;
                type = 'fire';
                particleConfig = { 
                    scale: { start: 0.4, end: 0 }, 
                    alpha: { start: 0.6, end: 0 },
                    speed: { min: 20, max: 50 },
                    lifespan: 800,
                    frequency: 50
                };
                break;
            case 'arcane_scholar':
                color = 0x0088ff;
                type = 'lightning';
                particleConfig = { 
                    scale: { start: 0.3, end: 0.8 }, 
                    alpha: { start: 0.8, end: 0 },
                    lifespan: 300,
                    frequency: 100
                };
                break;
            case 'shadow_assassin':
                color = 0x800080;
                type = 'void';
                particleConfig = { 
                    scale: { start: 0.1, end: 1.2 }, 
                    alpha: { start: 0.4, end: 0 },
                    speed: { min: 5, max: 20 },
                    lifespan: 1200,
                    frequency: 80
                };
                break;
            case 'dragon_born':
                color = 0xffa500;
                type = 'fire';
                particleConfig = { 
                    scale: { start: 0.5, end: 0 }, 
                    tint: [0xff4400, 0xffa500, 0xffff00],
                    lifespan: 1000,
                    frequency: 40
                };
                break;
            case 'nature_blessed':
                color = 0x44ff44;
                type = 'nature';
                particleConfig = { 
                    scale: { start: 0.4, end: 0 }, 
                    speed: { min: 30, max: 60 },
                    lifespan: 1500,
                    frequency: 60
                };
                break;
        }

        // 1. Initial burst
        const burstEmitter = this.emitters[type];
        if (burstEmitter) {
            burstEmitter.setPosition(target.x, target.y);
            burstEmitter.explode(25);
        }

        // 2. Sustained aura emitter
        const auraEmitter = this.scene.add.particles(0, 0, this.getParticleTexture(type), {
            ...particleConfig,
            follow: target,
            blendMode: type === 'void' ? 'NORMAL' : 'ADD'
        });
        auraEmitter.setDepth(target.depth - 1);

        // 3. PostFX Glow (High Quality)
        let glow;
        if (target.postFX && typeof target.postFX.addGlow === 'function') {
            glow = target.postFX.addGlow(color, 2, 0, false, 0.1, 8);
            
            // Pulsing glow effect
            this.scene.tweens.add({
                targets: glow,
                outerStrength: 4,
                innerStrength: 1,
                duration: 1000,
                yoyo: true,
                repeat: -1
            });
        }

        // 4. Cleanup
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                auraEmitter.stop();
                this.scene.time.delayedCall(2000, () => auraEmitter.destroy());
                if (glow && target.postFX) {
                    target.postFX.remove(glow);
                }
            });
        }

        return { emitter: auraEmitter, glow };
    }

    /**
     * Get particle texture name based on type
     * @param {string} type 
     * @returns {string}
     */
    getParticleTexture(type) {
        switch (type) {
            case 'fire': return 'particle-flare';
            case 'frost': return 'particle-snow';
            case 'void': return 'particle-smoke';
            case 'holy': return 'particle-flare';
            case 'nature': return 'particle-sparkle';
            case 'lightning': return 'particle-flare';
            default: return 'particle-combat';
        }
    }

    /**
     * Clean up all particle effects
     */
    /**
     * Set up world/environment particle systems (Rain, Snow, Embers)
     * @param {string} type - Weather type
     */
    setWeather(type = 'none') {
        if (this.weatherEmitter) {
            this.weatherEmitter.stop();
            this.weatherEmitter.destroy();
            this.weatherEmitter = null;
        }

        if (type === 'none') return;

        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        switch (type) {
            case 'rain':
                this.weatherEmitter = this.scene.add.particles(0, 0, 'particle-sparkle', {
                    x: { min: 0, max: width * 1.5 },
                    y: -50,
                    scale: { start: 0.1, end: 0.1 },
                    speedY: { min: 400, max: 700 },
                    speedX: { min: -100, max: -50 },
                    lifespan: 2000,
                    quantity: 4,
                    alpha: { start: 0.4, end: 0.1 },
                    tint: 0xaaccff,
                    blendMode: 'SCREEN'
                });
                break;
            case 'snow':
                this.weatherEmitter = this.scene.add.particles(0, 0, 'particle-sparkle', {
                    x: { min: 0, max: width * 1.5 },
                    y: -50,
                    scale: { start: 0.05, end: 0.3 },
                    speedY: { min: 40, max: 100 },
                    speedX: { min: -20, max: 20 },
                    lifespan: 5000,
                    quantity: 2,
                    alpha: { start: 0.7, end: 0.2 },
                    blendMode: 'ADD'
                });
                break;
            case 'embers':
                this.weatherEmitter = this.scene.add.particles(0, 0, 'particle-sparkle', {
                    x: { min: 0, max: width * 1.5 },
                    y: height + 50,
                    scale: { start: 0.2, end: 0 },
                    speedY: { min: -100, max: -40 },
                    speedX: { min: -40, max: 40 },
                    lifespan: 3000,
                    quantity: 1,
                    tint: [0xffaa00, 0xff4400, 0xffff00],
                    blendMode: 'ADD'
                });
                break;
        }

        if (this.weatherEmitter) {
            this.weatherEmitter.setScrollFactor(0);
            this.weatherEmitter.setDepth(2000); // Overlay level
        }
    }

    /**
     * Apply Bloom effect to the camera
     * This makes magic and lights 'pop' for a stunning look.
     */
    applyBloom(strength = 0.5, blur = 1) {
        try {
            if (this.scene.cameras.main.postFX) {
                this.scene.cameras.main.postFX.addBloom(0xffffff, strength, strength, blur, 1.1);
                Logger.info('ParticleManager', 'Bloom PostFX applied for stunning visuals');
            }
        } catch (error) {
            Logger.error('ParticleManager', 'Failed to apply Bloom PostFX', error);
        }
    }
}

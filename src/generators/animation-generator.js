/**
 * Animation Generator - Generates animation frames and sprite sheets
 * Creates frame sequences for character animations
 */

import { SpriteGenerator } from './sprite-generator.js';
import { TransformUtils } from './utils/transform-utils.js';

export class AnimationGenerator {
    /**
     * Create a new AnimationGenerator.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     */
    constructor(scene) {
        this.scene = scene;
        this.spriteGenerator = new SpriteGenerator(scene);
        this.frameWidth = 40;
        this.frameHeight = 60;
        this.framesPerAnimation = 8; // Standard for walk cycles
    }

    /**
     * Generate animation frames for a character
     * @param {string} characterType - Character type (paladin, warrior, etc.)
     * @param {string} animationName - Animation name (idle, walk, attack, etc.)
     * @param {number} frameCount - Number of frames to generate
     * @param {Object} options - Animation options
     * @returns {Array} Array of texture keys for frames
     */
    generateAnimationFrames(characterType, animationName, frameCount = 8, options = {}) {
        const frames = [];
        const textureKeyPrefix = `${characterType}-${animationName}`;

        // Get animation keyframes based on animation type
        const keyframes = this.getAnimationKeyframes(animationName, frameCount, options);

        for (let i = 0; i < frameCount; i++) {
            const textureKey = `${textureKeyPrefix}-${i}`;

            if (this.scene.textures.exists(textureKey)) {
                frames.push(textureKey);
                continue;
            }

            const graphics = this.scene.add.graphics();
            const centerX = this.frameWidth / 2;
            const centerY = this.frameHeight / 2;

            // Generate frame with transformations
            const keyframe = keyframes[i];
            this.generateFrame(graphics, characterType, animationName, keyframe, i, frameCount, options);

            // Generate texture
            graphics.generateTexture(textureKey, this.frameWidth, this.frameHeight);
            graphics.destroy();

            frames.push(textureKey);
        }

        return frames;
    }

    /**
     * Get animation keyframes for a specific animation type
     * @param {string} animationName - Animation name
     * @param {number} frameCount - Number of frames
     * @param {Object} options - Animation options
     * @returns {Array} Array of keyframe states
     */
    getAnimationKeyframes(animationName, frameCount, options = {}) {
        const keyframes = [];

        switch (animationName) {
            case 'idle':
                // Subtle breathing animation
                for (let i = 0; i < frameCount; i++) {
                    const t = i / frameCount;
                    const yOffset = Math.sin(t * Math.PI * 2) * 2; // Small vertical movement
                    keyframes.push({
                        x: 0,
                        y: yOffset,
                        rotation: 0,
                        scale: { x: 1, y: 1 }
                    });
                }
                break;

            case 'walk':
                // Walking cycle
                for (let i = 0; i < frameCount; i++) {
                    const t = i / frameCount;
                    const yOffset = Math.sin(t * Math.PI * 2) * 3; // Vertical bounce
                    const leftArmRotation = Math.sin(t * Math.PI * 2) * 30; // Arm swing
                    const rightArmRotation = -Math.sin(t * Math.PI * 2) * 30;
                    const leftLegRotation = -Math.sin(t * Math.PI * 2) * 20;
                    const rightLegRotation = Math.sin(t * Math.PI * 2) * 20;

                    keyframes.push({
                        x: 0,
                        y: yOffset,
                        rotation: 0,
                        scale: { x: 1, y: 1 },
                        components: {
                            armLeft: { rotation: leftArmRotation },
                            armRight: { rotation: rightArmRotation },
                            legLeft: { rotation: leftLegRotation },
                            legRight: { rotation: rightLegRotation }
                        }
                    });
                }
                break;

            case 'attack':
                // Attack animation
                for (let i = 0; i < frameCount; i++) {
                    const t = i / (frameCount - 1);
                    let armRotation = 0;
                    let weaponRotation = 0;

                    if (t < 0.3) {
                        // Wind up
                        armRotation = -t * 100;
                        weaponRotation = -t * 120;
                    } else if (t < 0.6) {
                        // Strike
                        const strikeT = (t - 0.3) / 0.3;
                        armRotation = -30 + strikeT * 150;
                        weaponRotation = -36 + strikeT * 180;
                    } else {
                        // Recovery
                        const recoveryT = (t - 0.6) / 0.4;
                        armRotation = 120 - recoveryT * 120;
                        weaponRotation = 144 - recoveryT * 144;
                    }

                    keyframes.push({
                        x: 0,
                        y: 0,
                        rotation: 0,
                        scale: { x: 1, y: 1 },
                        components: {
                            armRight: { rotation: armRotation },
                            weapon: { rotation: weaponRotation }
                        }
                    });
                }
                break;

            case 'defend':
                // Defensive stance animation
                for (let i = 0; i < frameCount; i++) {
                    const t = i / frameCount;
                    const shieldRotation = Math.sin(t * Math.PI * 2) * 5; // Subtle shield movement

                    keyframes.push({
                        x: 0,
                        y: 0,
                        rotation: 0,
                        scale: { x: 1, y: 1 },
                        components: {
                            shield: { rotation: shieldRotation },
                            armLeft: { rotation: 45 } // Shield arm raised
                        }
                    });
                }
                break;

            case 'heal':
                // Healing animation (casting pose)
                for (let i = 0; i < frameCount; i++) {
                    const t = i / frameCount;
                    const armRotation = Math.sin(t * Math.PI * 2) * 10; // Gentle arm movement
                    const glowIntensity = 0.5 + Math.sin(t * Math.PI * 2) * 0.3; // Pulsing glow

                    keyframes.push({
                        x: 0,
                        y: 0,
                        rotation: 0,
                        scale: { x: 1, y: 1 },
                        components: {
                            armRight: { rotation: -60 + armRotation }
                        },
                        effects: {
                            glow: glowIntensity
                        }
                    });
                }
                break;

            case 'death':
                // Death animation - fall and fade
                for (let i = 0; i < frameCount; i++) {
                    const t = i / (frameCount - 1);
                    const fallY = t * 10; // Fall down
                    const rotation = t * 90; // Rotate as falling
                    const scale = 1 - t * 0.3; // Shrink slightly

                    keyframes.push({
                        x: 0,
                        y: fallY,
                        rotation: rotation,
                        scale: { x: scale, y: scale }
                    });
                }
                break;

            default:
                // Default: static frames
                for (let i = 0; i < frameCount; i++) {
                    keyframes.push({
                        x: 0,
                        y: 0,
                        rotation: 0,
                        scale: { x: 1, y: 1 }
                    });
                }
        }

        return keyframes;
    }

    /**
     * Generate a single animation frame
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {string} characterType - Character type
     * @param {string} animationName - Animation name
     * @param {Object} keyframe - Keyframe state
     * @param {number} frameIndex - Current frame index
     * @param {number} totalFrames - Total frame count
     * @param {Object} options - Animation options
     */
    generateFrame(graphics, characterType, animationName, keyframe, frameIndex, totalFrames, options) {
        const centerX = this.frameWidth / 2;
        const centerY = this.frameHeight / 2;

        // For now, use the static sprite generator
        // In future, this will use modular components with transformations
        if (characterType === 'paladin') {
            // Generate base paladin sprite
            this.spriteGenerator.generateHeroSpriteLayered();
            const baseTexture = this.scene.textures.get('hero-sprite');

            if (!baseTexture || !baseTexture.source || !baseTexture.source[0]) {
                // Fallback: draw a colored rectangle if texture doesn't exist
                graphics.fillStyle(0xFFD700, 1);
                graphics.fillRect(0, 0, this.frameWidth, this.frameHeight);
                return;
            }

            // Get texture source canvas/image
            const source = baseTexture.source[0];
            const canvas = source.image || source.canvas;

            if (canvas && canvas.width && canvas.height) {
                // Draw the base sprite texture onto the graphics
                // Since Phaser Graphics doesn't support drawing textures directly,
                // we'll use the canvas context to copy pixels efficiently
                try {
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    const imageData = ctx.getImageData(0, 0, Math.min(this.frameWidth, canvas.width), Math.min(this.frameHeight, canvas.height));

                    // Draw pixels from the base texture
                    // Optimize: batch draw rectangles for same-colored pixels
                    let lastColor = null;
                    let lastAlpha = null;
                    for (let y = 0; y < imageData.height; y++) {
                        for (let x = 0; x < imageData.width; x++) {
                            const idx = (y * imageData.width + x) * 4;
                            const r = imageData.data[idx];
                            const g = imageData.data[idx + 1];
                            const b = imageData.data[idx + 2];
                            const a = imageData.data[idx + 3];

                            if (a > 0) {
                                const color = (r << 16) | (g << 8) | b;
                                const alpha = a / 255;

                                // Only change fill style if color/alpha changed
                                if (color !== lastColor || alpha !== lastAlpha) {
                                    graphics.fillStyle(color, alpha);
                                    lastColor = color;
                                    lastAlpha = alpha;
                                }

                                graphics.fillRect(x + (Math.round(keyframe.x) || 0), y + (Math.round(keyframe.y) || 0), 1, 1);
                            }
                        }
                    }
                } catch (e) {
                    // Fallback: draw a colored rectangle if pixel copying fails
                    graphics.fillStyle(0xFFD700, 1);
                    graphics.fillRect(0, 0, this.frameWidth, this.frameHeight);
                }
            } else {
                // Fallback: draw a colored rectangle if canvas is not available
                graphics.fillStyle(0xFFD700, 1);
                graphics.fillRect(0, 0, this.frameWidth, this.frameHeight);
            }

            // Note: Transformations (keyframe.x, keyframe.y) are now applied.
            // Rotation and Scale are planned for future animation improvements.
            // For now, frames use the base sprite with simple translation.
        }
    }

    /**
     * Generate walk cycle animation
     * @param {string} characterType - Character type
     * @returns {Array} Array of texture keys
     */
    generateWalkCycle(characterType) {
        return this.generateAnimationFrames(characterType, 'walk', this.framesPerAnimation);
    }

    /**
     * Generate idle animation
     * @param {string} characterType - Character type
     * @returns {Array} Array of texture keys
     */
    generateIdleAnimation(characterType) {
        return this.generateAnimationFrames(characterType, 'idle', this.framesPerAnimation);
    }

    /**
     * Generate attack animation
     * @param {string} characterType - Character type
     * @returns {Array} Array of texture keys
     */
    generateAttackAnimation(characterType) {
        return this.generateAnimationFrames(characterType, 'attack', 6); // Shorter attack animation
    }

    /**
     * Generate defend animation
     * @param {string} characterType - Character type
     * @returns {Array} Array of texture keys
     */
    generateDefendAnimation(characterType) {
        return this.generateAnimationFrames(characterType, 'defend', this.framesPerAnimation);
    }

    /**
     * Generate heal animation
     * @param {string} characterType - Character type
     * @returns {Array} Array of texture keys
     */
    generateHealAnimation(characterType) {
        return this.generateAnimationFrames(characterType, 'heal', this.framesPerAnimation);
    }

    /**
     * Create animation metadata
     * @param {string} characterType - Character type
     * @param {string} animationName - Animation name
     * @param {Array} frames - Array of frame texture keys
     * @param {number} frameRate - Frame rate for animation
     * @param {boolean} loop - Whether animation loops
     * @returns {Object} Animation metadata
     */
    createAnimationMetadata(characterType, animationName, frames, frameRate = 12, loop = true) {
        return {
            characterType,
            animationName,
            frames,
            frameRate,
            loop,
            duration: frames.length / frameRate
        };
    }
}


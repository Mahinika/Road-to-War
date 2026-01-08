/**
 * Animation Generator
 * Generates animation frames for sprites (idle, walk, attack, jump, death)
 * Based on Dragumagu-style pixel art animation specifications
 */

import { createCanvas } from 'canvas';
import { PixelDrawer } from '../utils/pixel-drawer.js';

export class AnimationGenerator {
    constructor() {
        // Animation specifications from style guide
        this.specs = {
            idle: { frames: 4, duration: 2.0, motion: 'vertical', amplitude: 5 },
            walk: { frames: 8, duration: 0.8, motion: 'vertical+legs', amplitude: 10 },
            attack: { frames: 6, duration: 0.4, motion: 'dash+squash', amplitude: 20 },
            jump: { frames: 4, duration: 0.6, motion: 'scale', amplitude: 0.4 },
            death: { frames: 5, duration: 1.0, motion: 'fade', amplitude: 0 }
        };
    }

    /**
     * Generate idle animation frames
     * @param {Object} baseSprite - Base sprite canvas or generator
     * @param {number} frameCount - Number of frames (default: 4)
     * @returns {Array<Object>} Array of frame objects { canvas, offsetX, offsetY, scale }
     */
    generateIdleFrames(baseSprite, frameCount = 4) {
        const frames = [];
        const { amplitude } = this.specs.idle;
        const width = baseSprite.width || 48;
        const height = baseSprite.height || 48;

        for (let i = 0; i < frameCount; i++) {
            const t = i / frameCount;
            // Vertical bob: ±5px over 2 seconds
            // Sine wave for smooth motion
            const offsetY = Math.sin(t * Math.PI * 2) * amplitude;
            
            const frame = {
                canvas: this.copyCanvas(baseSprite),
                offsetX: 0,
                offsetY: Math.round(offsetY),
                scale: 1.0,
                alpha: 1.0
            };
            
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Generate walk animation frames
     * @param {Object} baseSprite - Base sprite canvas or generator
     * @param {number} frameCount - Number of frames (default: 8)
     * @returns {Array<Object>} Array of frame objects
     */
    generateWalkFrames(baseSprite, frameCount = 8) {
        const frames = [];
        const { amplitude } = this.specs.walk;
        const width = baseSprite.width || 48;
        const height = baseSprite.height || 48;

        for (let i = 0; i < frameCount; i++) {
            const t = i / frameCount;
            // Vertical bob: ±10px
            const offsetY = Math.sin(t * Math.PI * 2) * amplitude;
            
            // Leg cycle: alternate leg positions
            const legCycle = Math.floor(i / 2) % 2;
            const offsetX = legCycle === 0 ? -2 : 2; // Slight horizontal movement
            
            const frame = {
                canvas: this.copyCanvas(baseSprite),
                offsetX: Math.round(offsetX),
                offsetY: Math.round(offsetY),
                scale: 1.0,
                alpha: 1.0,
                legCycle: legCycle
            };
            
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Generate attack animation frames
     * @param {Object} baseSprite - Base sprite canvas or generator
     * @param {number} frameCount - Number of frames (default: 6)
     * @returns {Array<Object>} Array of frame objects
     */
    generateAttackFrames(baseSprite, frameCount = 6) {
        const frames = [];
        const { amplitude } = this.specs.attack;
        const width = baseSprite.width || 48;
        const height = baseSprite.height || 48;

        for (let i = 0; i < frameCount; i++) {
            const t = i / (frameCount - 1); // 0 to 1
            
            // Forward dash: 20px forward
            const offsetX = t * amplitude;
            
            // Squash & stretch: compress horizontally, stretch vertically
            const squash = 1.0 - (t * 0.2); // Compress to 80%
            const stretch = 1.0 + (t * 0.1); // Stretch to 110%
            
            const frame = {
                canvas: this.copyCanvas(baseSprite),
                offsetX: Math.round(offsetX),
                offsetY: 0,
                scaleX: squash,
                scaleY: stretch,
                scale: 1.0,
                alpha: 1.0
            };
            
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Generate jump animation frames
     * @param {Object} baseSprite - Base sprite canvas or generator
     * @param {number} frameCount - Number of frames (default: 4)
     * @returns {Array<Object>} Array of frame objects
     */
    generateJumpFrames(baseSprite, frameCount = 4) {
        const frames = [];
        const { amplitude } = this.specs.jump;
        const width = baseSprite.width || 48;
        const height = baseSprite.height || 48;

        for (let i = 0; i < frameCount; i++) {
            const t = i / (frameCount - 1); // 0 to 1
            
            // Scale animation: 0.8 → 1.2 → 0.8
            let scale;
            if (t < 0.5) {
                // Going up: scale increases
                scale = 0.8 + (t * 2 * amplitude);
            } else {
                // Coming down: scale decreases
                scale = 1.2 - ((t - 0.5) * 2 * amplitude);
            }
            
            // Vertical movement
            const offsetY = -Math.sin(t * Math.PI) * 15; // Arc motion
            
            const frame = {
                canvas: this.copyCanvas(baseSprite),
                offsetX: 0,
                offsetY: Math.round(offsetY),
                scale: scale,
                alpha: 1.0
            };
            
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Generate death animation frames
     * @param {Object} baseSprite - Base sprite canvas or generator
     * @param {number} frameCount - Number of frames (default: 5)
     * @returns {Array<Object>} Array of frame objects
     */
    generateDeathFrames(baseSprite, frameCount = 5) {
        const frames = [];
        const width = baseSprite.width || 48;
        const height = baseSprite.height || 48;

        for (let i = 0; i < frameCount; i++) {
            const t = i / (frameCount - 1); // 0 to 1
            
            // Fade out: alpha goes from 1.0 to 0.0
            const alpha = 1.0 - t;
            
            // Slight rotation/fall
            const rotation = t * 15; // Rotate 15 degrees
            const offsetY = t * 5; // Fall down 5px
            
            const frame = {
                canvas: this.copyCanvas(baseSprite),
                offsetX: 0,
                offsetY: Math.round(offsetY),
                scale: 1.0,
                alpha: alpha,
                rotation: rotation
            };
            
            frames.push(frame);
        }

        return frames;
    }

    /**
     * Apply transform to a frame
     * @param {Object} frame - Frame object
     * @param {Object} transform - Transform object { offsetX, offsetY, scale, scaleX, scaleY, alpha, rotation }
     * @returns {Object} Transformed frame
     */
    applyTransform(frame, transform) {
        return {
            ...frame,
            offsetX: (frame.offsetX || 0) + (transform.offsetX || 0),
            offsetY: (frame.offsetY || 0) + (transform.offsetY || 0),
            scale: (frame.scale || 1.0) * (transform.scale || 1.0),
            scaleX: transform.scaleX !== undefined ? transform.scaleX : frame.scaleX,
            scaleY: transform.scaleY !== undefined ? transform.scaleY : frame.scaleY,
            alpha: transform.alpha !== undefined ? transform.alpha : frame.alpha,
            rotation: transform.rotation !== undefined ? transform.rotation : frame.rotation
        };
    }

    /**
     * Copy canvas to new canvas
     * @private
     * @param {Object} source - Source canvas or generator
     * @returns {Object} New canvas
     */
    copyCanvas(source) {
        if (source.canvas) {
            // If it's a generator with canvas property
            const width = source.width || source.canvas.width;
            const height = source.height || source.canvas.height;
            const newCanvas = createCanvas(width, height);
            const ctx = newCanvas.getContext('2d');
            ctx.drawImage(source.canvas, 0, 0);
            return newCanvas;
        } else if (source.getContext) {
            // If it's a canvas
            const width = source.width;
            const height = source.height;
            const newCanvas = createCanvas(width, height);
            const ctx = newCanvas.getContext('2d');
            ctx.drawImage(source, 0, 0);
            return newCanvas;
        }
        
        // Fallback: create empty canvas
        return createCanvas(48, 48);
    }

    /**
     * Generate animation data (JSON format)
     * @param {string} animationType - Animation type ('idle', 'walk', 'attack', 'jump', 'death')
     * @param {Array<Object>} frames - Array of frame objects
     * @returns {Object} Animation data object
     */
    generateAnimationData(animationType, frames) {
        const spec = this.specs[animationType] || this.specs.idle;
        const frameDuration = spec.duration / frames.length;
        
        return {
            type: animationType,
            frames: frames.length,
            duration: spec.duration,
            frameDuration: frameDuration,
            loop: animationType !== 'death',
            frames: frames.map((frame, index) => ({
                index: index,
                offsetX: frame.offsetX || 0,
                offsetY: frame.offsetY || 0,
                scale: frame.scale || 1.0,
                scaleX: frame.scaleX || 1.0,
                scaleY: frame.scaleY || 1.0,
                alpha: frame.alpha || 1.0,
                rotation: frame.rotation || 0,
                duration: frameDuration
            }))
        };
    }
}


/**
 * Variation Manager
 * Generates controlled sprite variations (color, size, equipment, pose)
 */

import { SeededRNG } from './seeded-rng.js';
import { MaterialShader } from './material-shader.js';
import { createCanvas } from 'canvas';

export class VariationManager {
    constructor(seed = 12345) {
        this.rng = new SeededRNG(seed);
        this.materialShader = new MaterialShader();
    }

    /**
     * Apply controlled variations to a base sprite
     * @param {Object} baseSprite - Base sprite generator or canvas
     * @param {Object} variationConfig - Variation configuration
     * @returns {Promise<Object>} Varied sprite
     */
    async applyVariation(baseSprite, variationConfig = {}) {
        const {
            colorVariation = 0.1,      // ±10% color shift
            sizeVariation = 0.05,      // ±5% size variation
            equipmentVariation = false, // Random equipment pieces
            poseVariation = false       // Slight pose changes
        } = variationConfig;

        // Clone base sprite
        const variedSprite = await this.cloneSprite(baseSprite);

        // Apply color variation
        if (colorVariation > 0) {
            this.applyColorVariation(variedSprite, colorVariation);
        }

        // Apply size variation
        if (sizeVariation > 0) {
            await this.applySizeVariation(variedSprite, sizeVariation);
        }

        // Apply equipment variation
        if (equipmentVariation) {
            this.applyEquipmentVariation(variedSprite);
        }

        // Apply pose variation
        if (poseVariation) {
            this.applyPoseVariation(variedSprite);
        }

        return variedSprite;
    }

    /**
     * Generate multiple variations
     * @param {Object} baseSprite - Base sprite
     * @param {number} count - Number of variations to generate
     * @param {Object} config - Variation configuration
     * @returns {Promise<Array<Object>>} Array of varied sprites
     */
    async generateVariations(baseSprite, count, config = {}) {
        const variations = [];
        
        for (let i = 0; i < count; i++) {
            // Use different seed for each variation
            const variationSeed = (config.seed || 12345) + i * 1000;
            this.rng.setSeed(variationSeed);
            
            const variation = await this.applyVariation(baseSprite, config);
            variations.push({
                sprite: variation,
                seed: variationSeed,
                index: i
            });
        }
        
        return variations;
    }

    /**
     * Validate that a variation is still valid
     * @param {Object} variation - Varied sprite
     * @returns {Object} { valid: boolean, issues: Array<string> }
     */
    validateVariation(variation) {
        const issues = [];
        
        // Check that sprite still has content
        if (!variation.canvas) {
            issues.push('Variation missing canvas');
        }
        
        // Check dimensions are reasonable
        if (variation.canvas) {
            const width = variation.canvas.width;
            const height = variation.canvas.height;
            
            if (width < 16 || width > 128) {
                issues.push(`Invalid width: ${width} (expected 16-128)`);
            }
            
            if (height < 16 || height > 128) {
                issues.push(`Invalid height: ${height} (expected 16-128)`);
            }
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Apply color variation
     * @private
     */
    applyColorVariation(sprite, variation) {
        const canvas = sprite.canvas || sprite;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            
            if (a > 0) {
                // Apply random color shift (±variation)
                const rShift = (this.rng.random() - 0.5) * 2 * variation;
                const gShift = (this.rng.random() - 0.5) * 2 * variation;
                const bShift = (this.rng.random() - 0.5) * 2 * variation;
                
                imageData.data[i] = Math.max(0, Math.min(255, Math.round(r * (1 + rShift))));
                imageData.data[i + 1] = Math.max(0, Math.min(255, Math.round(g * (1 + gShift))));
                imageData.data[i + 2] = Math.max(0, Math.min(255, Math.round(b * (1 + bShift))));
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Apply size variation
     * @private
     */
    applySizeVariation(sprite, variation) {
        const canvas = sprite.canvas || sprite;
        const sizeFactor = 1 + (this.rng.random() - 0.5) * 2 * variation;
        
        const newWidth = Math.round(canvas.width * sizeFactor);
        const newHeight = Math.round(canvas.height * sizeFactor);
        
        // Create new canvas with scaled size
        const newCanvas = createCanvas(newWidth, newHeight);
        const ctx = newCanvas.getContext('2d');
        
        // Draw scaled sprite (nearest neighbor for pixel-perfect scaling)
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
        
        sprite.canvas = newCanvas;
        sprite.width = newWidth;
        sprite.height = newHeight;
    }

    /**
     * Apply equipment variation
     * @private
     */
    applyEquipmentVariation(sprite) {
        // This would modify equipment layers
        // For now, it's a placeholder - would need access to generator's equipment methods
        // In a full implementation, this would randomly add/remove equipment pieces
    }

    /**
     * Apply pose variation
     * @private
     */
    applyPoseVariation(sprite) {
        // This would slightly adjust body part positions
        // For now, it's a placeholder - would need access to generator's drawing methods
        // In a full implementation, this would slightly shift limbs/head positions
    }

    /**
     * Clone sprite
     * @private
     */
    async cloneSprite(sprite) {
        const canvas = sprite.canvas || sprite;
        const newCanvas = createCanvas(canvas.width, canvas.height);
        const ctx = newCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        
        return {
            canvas: newCanvas,
            width: canvas.width,
            height: canvas.height,
            ...sprite
        };
    }

    /**
     * Set seed for deterministic variation generation
     * @param {number} seed - New seed value
     */
    setSeed(seed) {
        this.rng.setSeed(seed);
    }
}


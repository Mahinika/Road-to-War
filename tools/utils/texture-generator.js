/**
 * Texture Generator
 * Generates material-specific texture patterns for pixel art
 * Supports cloth weave, leather grain, and metal specular patterns
 */

import { SeededRNG } from './seeded-rng.js';

export class TextureGenerator {
    constructor(seed = 12345) {
        this.rng = new SeededRNG(seed);
    }

    /**
     * Apply cloth texture (weave pattern with dithering)
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} x - X coordinate (top-left)
     * @param {number} y - Y coordinate (top-left)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} baseColor - Base cloth color
     */
    applyClothTexture(drawer, x, y, width, height, baseColor) {
        // Weave pattern: alternating vertical and horizontal lines
        const weaveSize = 2; // 2px weave pattern
        
        // Get darker and lighter shades for weave
        const darker = this.darkenColor(baseColor, 0.15);
        const lighter = this.lightenColor(baseColor, 0.1);
        
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                const relX = px - x;
                const relY = py - y;
                
                // Vertical weave lines
                if (relX % (weaveSize * 2) < weaveSize) {
                    const currentPixel = drawer.getPixel(px, py);
                    if (currentPixel && currentPixel[3] > 0) {
                        drawer.setPixel(px, py, darker);
                    }
                }
                
                // Horizontal weave lines (every other row)
                if (relY % (weaveSize * 2) < weaveSize && relX % (weaveSize * 2) >= weaveSize) {
                    const currentPixel = drawer.getPixel(px, py);
                    if (currentPixel && currentPixel[3] > 0) {
                        drawer.setPixel(px, py, lighter);
                    }
                }
            }
        }
    }

    /**
     * Apply leather texture (grain pattern with noise)
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} x - X coordinate (top-left)
     * @param {number} y - Y coordinate (top-left)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} baseColor - Base leather color
     */
    applyLeatherTexture(drawer, x, y, width, height, baseColor) {
        // Grain pattern: random small dots and lines
        const grainDensity = 0.15; // 15% of pixels get grain
        const darker = this.darkenColor(baseColor, 0.2);
        const lighter = this.lightenColor(baseColor, 0.15);
        
        // Generate noise pattern
        const noisePattern = this.generateNoisePattern(width, height, grainDensity);
        
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                const relX = px - x;
                const relY = py - y;
                const currentPixel = drawer.getPixel(px, py);
                
                if (!currentPixel || currentPixel[3] === 0) continue;
                
                // Apply grain based on noise pattern
                if (noisePattern[relY * width + relX]) {
                    // Alternate between darker and lighter grain
                    const grainColor = (relX + relY) % 2 === 0 ? darker : lighter;
                    drawer.setPixel(px, py, grainColor);
                }
            }
        }
    }

    /**
     * Apply metal texture (specular highlights, reflective streaks)
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} x - X coordinate (top-left)
     * @param {number} y - Y coordinate (top-left)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} baseColor - Base metal color
     */
    applyMetalTexture(drawer, x, y, width, height, baseColor) {
        // Specular highlights: bright streaks from top-left
        const highlightColor = this.lightenColor(baseColor, 0.5);
        const streakColor = this.lightenColor(baseColor, 0.3);
        
        // Add vertical reflective streaks
        for (let px = x; px < x + width; px += 3) {
            const relX = px - x;
            const streakWidth = 1;
            
            for (let py = y; py < y + height; py++) {
                const currentPixel = drawer.getPixel(px, py);
                if (!currentPixel || currentPixel[3] === 0) continue;
                
                // Bright highlight streak
                if (relX % 6 === 0) {
                    drawer.setPixel(px, py, highlightColor);
                } else if (relX % 6 === 3) {
                    drawer.setPixel(px, py, streakColor);
                }
            }
        }
        
        // Add horizontal highlight at top (light source reflection)
        for (let px = x; px < x + width; px++) {
            const currentPixel = drawer.getPixel(px, y);
            if (currentPixel && currentPixel[3] > 0) {
                drawer.setPixel(px, y, highlightColor);
            }
        }
    }

    /**
     * Generate noise pattern for texture variation
     * @param {number} width - Pattern width
     * @param {number} height - Pattern height
     * @param {number} density - Noise density (0-1)
     * @returns {Array<boolean>} Boolean array indicating noise pixels
     */
    generateNoisePattern(width, height, density) {
        const pattern = [];
        const totalPixels = width * height;
        const noiseCount = Math.floor(totalPixels * density);
        
        // Initialize with false
        for (let i = 0; i < totalPixels; i++) {
            pattern[i] = false;
        }
        
        // Randomly set noise pixels
        for (let i = 0; i < noiseCount; i++) {
            const index = this.rng.randomInt(0, totalPixels - 1);
            pattern[index] = true;
        }
        
        return pattern;
    }

    /**
     * Darken a color
     * @private
     */
    darkenColor(color, factor) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        return (Math.max(0, Math.floor(r * (1 - factor))) << 16) |
               (Math.max(0, Math.floor(g * (1 - factor))) << 8) |
               Math.max(0, Math.floor(b * (1 - factor)));
    }

    /**
     * Lighten a color
     * @private
     */
    lightenColor(color, factor) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        return (Math.min(255, Math.floor(r + (255 - r) * factor)) << 16) |
               (Math.min(255, Math.floor(g + (255 - g) * factor)) << 8) |
               Math.min(255, Math.floor(b + (255 - b) * factor));
    }

    /**
     * Set seed for deterministic texture generation
     * @param {number} seed - New seed value
     */
    setSeed(seed) {
        this.rng = new SeededRNG(seed);
    }
}


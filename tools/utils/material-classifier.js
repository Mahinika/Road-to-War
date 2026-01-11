/**
 * Material Classifier
 * Classifies colors by material type using HSV color space analysis
 */

import { hexToRgbArray } from './color-utils.js';

export class MaterialClassifier {
    /**
     * Convert RGB to HSV
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {Object} {h, s, v} where h is 0-360, s and v are 0-1
     */
    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else {
                h = (r - g) / delta + 4;
            }
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : delta / max;
        const v = max;
        
        return { h, s, v };
    }
    
    /**
     * Classify color by material type
     * @param {number} hex - Hex color value
     * @returns {string} Material type: 'metal', 'cloth', 'skin', 'wood', 'glow', 'other'
     */
    classifyColor(hex) {
        const [r, g, b] = this.hexToRgb(hex);
        const { h, s, v } = this.rgbToHsv(r, g, b);
        
        // Metal/Armor: High Value (brightness), Low Saturation
        if (v > 0.7 && s < 0.3) {
            return 'metal';
        }
        
        // Glow/Effects: High Value, High Saturation, specific hues (yellow, cyan, etc.)
        if (v > 0.8 && s > 0.6 && (h >= 40 && h <= 80 || h >= 160 && h <= 200)) {
            return 'glow';
        }
        
        // Skin: Specific Hue range (15-35°), Medium Saturation, Medium-High Value
        if (h >= 15 && h <= 35 && s >= 0.3 && s <= 0.7 && v >= 0.5 && v <= 0.9) {
            return 'skin';
        }
        
        // Wood/Leather: Low-Medium Value, Medium Saturation, brown hues (15-45°)
        if (h >= 15 && h <= 45 && v >= 0.2 && v <= 0.6 && s >= 0.3 && s <= 0.7) {
            return 'wood';
        }
        
        // Cloth: Medium Value, Variable Saturation
        if (v >= 0.3 && v <= 0.7) {
            return 'cloth';
        }
        
        // Accent colors: High Saturation, any value
        if (s > 0.6) {
            return 'accent';
        }
        
        return 'other';
    }
    
    /**
     * Convert hex to RGB array
     * @param {number} hex - Hex color value
     * @returns {Array<number>} [r, g, b]
     */
    hexToRgb(hex) {
        return hexToRgbArray(hex);
    }
    
    /**
     * Group palette colors by material type
     * @param {Array<number>} palette - Array of hex color values
     * @returns {Object} Grouped colors by material type
     */
    groupByMaterial(palette) {
        const grouped = {
            metal: [],
            armor: [],
            cloth: [],
            skin: [],
            wood: [],
            glow: [],
            accent: [],
            other: []
        };
        
        palette.forEach(hex => {
            const material = this.classifyColor(hex);
            
            // Map metal to armor for consistency
            if (material === 'metal') {
                grouped.armor.push(hex);
                grouped.metal.push(hex);
            } else {
                grouped[material].push(hex);
            }
        });
        
        // Remove empty categories
        Object.keys(grouped).forEach(key => {
            if (grouped[key].length === 0) {
                delete grouped[key];
            }
        });
        
        return grouped;
    }
}


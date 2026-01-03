/**
 * Color Utilities - Centralized color palette management
 * Provides rarity colors, theme colors, and color manipulation functions
 */

export class ColorUtils {
    /**
     * Rarity color palette
     */
    static RARITY_COLORS = {
        common: 0x888888,      // Gray
        uncommon: 0x44ff44,   // Green
        rare: 0x4444ff,       // Blue
        epic: 0xff44ff,       // Purple
        legendary: 0xffaa00   // Gold/Orange
    };

    /**
     * Rarity color names (for debugging)
     */
    static RARITY_COLOR_NAMES = {
        common: '#888888',
        uncommon: '#44ff44',
        rare: '#4444ff',
        epic: '#ff44ff',
        legendary: '#ffaa00'
    };

    /**
     * Theme colors matching game's dark theme
     */
    static THEME_COLORS = {
        background: 0x1a1a2e,
        backgroundSecondary: 0x16213e,
        text: 0xffffff,
        textSecondary: 0xcccccc,
        accent: 0xffff00,
        success: 0x00ff00,
        error: 0xff0000
    };

    /**
     * Get color for a rarity level
     * @param {string} rarity - Rarity level (common, uncommon, rare, epic, legendary)
     * @returns {number} Color value
     */
    static getRarityColor(rarity) {
        return this.RARITY_COLORS[rarity] || this.RARITY_COLORS.common;
    }

    /**
     * Get color name for a rarity level
     * @param {string} rarity - Rarity level
     * @returns {string} Color hex string
     */
    static getRarityColorName(rarity) {
        return this.RARITY_COLOR_NAMES[rarity] || this.RARITY_COLOR_NAMES.common;
    }

    /**
     * Get a lighter shade of a color
     * @param {number} color - Base color value
     * @param {number} amount - Amount to lighten (0-1)
     * @returns {number} Lighter color value
     */
    static lighten(color, amount = 0.2) {
        const r = ((color >> 16) & 0xff) + Math.floor(255 * amount);
        const g = ((color >> 8) & 0xff) + Math.floor(255 * amount);
        const b = (color & 0xff) + Math.floor(255 * amount);
        
        return ((Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b));
    }

    /**
     * Get a darker shade of a color
     * @param {number} color - Base color value
     * @param {number} amount - Amount to darken (0-1)
     * @returns {number} Darker color value
     */
    static darken(color, amount = 0.2) {
        const r = Math.floor(((color >> 16) & 0xff) * (1 - amount));
        const g = Math.floor(((color >> 8) & 0xff) * (1 - amount));
        const b = Math.floor((color & 0xff) * (1 - amount));
        
        return ((r << 16) | (g << 8) | b);
    }

    /**
     * Get level-based color variation
     * Higher levels get brighter/more saturated colors
     * @param {number} baseColor - Base color value
     * @param {number} level - Item level
     * @param {number} maxLevel - Maximum level (default 10)
     * @returns {number} Adjusted color value
     */
    static getLevelColor(baseColor, level, maxLevel = 10) {
        const levelRatio = Math.min(level / maxLevel, 1);
        const saturation = 0.1 + (levelRatio * 0.3); // 10% to 40% saturation boost
        
        return this.lighten(baseColor, saturation);
    }

    /**
     * Convert color to RGB components
     * @param {number} color - Color value
     * @returns {Object} {r, g, b} components (0-255)
     */
    static toRGB(color) {
        return {
            r: (color >> 16) & 0xff,
            g: (color >> 8) & 0xff,
            b: color & 0xff
        };
    }

    /**
     * Convert RGB components to color value
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)
     * @param {number} b - Blue component (0-255)
     * @returns {number} Color value
     */
    static fromRGB(r, g, b) {
        return ((r << 16) | (g << 8) | b);
    }

    /**
     * Get glow color for rarity (lighter version for glow effects)
     * @param {string} rarity - Rarity level
     * @returns {number} Glow color value
     */
    static getRarityGlowColor(rarity) {
        const baseColor = this.getRarityColor(rarity);
        return this.lighten(baseColor, 0.4);
    }

    /**
     * Get border color for rarity (darker version for borders)
     * @param {string} rarity - Rarity level
     * @returns {number} Border color value
     */
    static getRarityBorderColor(rarity) {
        const baseColor = this.getRarityColor(rarity);
        return this.darken(baseColor, 0.3);
    }

    /**
     * Material color presets for different material types
     */
    static MATERIAL_COLORS = {
        metallic: {
            base: 0xc0c0c0,      // Silver
            highlight: 0xffffff, // White
            shadow: 0x808080     // Dark gray
        },
        cloth: {
            base: 0x8b4513,     // Brown
            highlight: 0xcd853f, // Light brown
            shadow: 0x654321     // Dark brown
        },
        leather: {
            base: 0x654321,      // Brown
            highlight: 0x8b6914, // Light brown
            shadow: 0x3d2817     // Dark brown
        },
        wood: {
            base: 0x8b4513,     // Brown
            highlight: 0xdaa520, // Goldenrod
            shadow: 0x5c3317     // Dark brown
        },
        gold: {
            base: 0xffd700,      // Gold
            highlight: 0xffff00, // Yellow
            shadow: 0xb8860b     // Dark goldenrod
        }
    };

    /**
     * Get material colors
     * @param {string} materialType - Material type (metallic, cloth, leather, wood, gold)
     * @returns {Object} Material color object with base, highlight, shadow
     */
    static getMaterialColors(materialType) {
        return this.MATERIAL_COLORS[materialType] || this.MATERIAL_COLORS.cloth;
    }

    /**
     * Convert HSL to RGB
     * @param {number} h - Hue (0-360)
     * @param {number} s - Saturation (0-1)
     * @param {number} l - Lightness (0-1)
     * @returns {Object} {r, g, b} components (0-255)
     */
    static hslToRgb(h, s, l) {
        h = h / 360;
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Convert RGB to HSL
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {Object} {h, s, l} components (h: 0-360, s: 0-1, l: 0-1)
     */
    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: h * 360,
            s: s,
            l: l
        };
    }

    /**
     * Blend two colors using a blending mode
     * @param {number} color1 - Base color value
     * @param {number} color2 - Blend color value
     * @param {string} mode - Blending mode (multiply, overlay, screen, soft-light)
     * @param {number} opacity - Blend opacity (0-1)
     * @returns {number} Blended color value
     */
    static blendColors(color1, color2, mode = 'multiply', opacity = 1.0) {
        const rgb1 = this.toRGB(color1);
        const rgb2 = this.toRGB(color2);
        let result = { r: 0, g: 0, b: 0 };

        const normalize = (val) => val / 255;

        switch (mode) {
            case 'multiply':
                result.r = Math.floor(rgb1.r * normalize(rgb2.r));
                result.g = Math.floor(rgb1.g * normalize(rgb2.g));
                result.b = Math.floor(rgb1.b * normalize(rgb2.b));
                break;
            case 'overlay':
                result.r = rgb1.r < 128 
                    ? Math.floor(2 * rgb1.r * normalize(rgb2.r))
                    : Math.floor(255 - 2 * (255 - rgb1.r) * (255 - rgb2.r) / 255);
                result.g = rgb1.g < 128 
                    ? Math.floor(2 * rgb1.g * normalize(rgb2.g))
                    : Math.floor(255 - 2 * (255 - rgb1.g) * (255 - rgb2.g) / 255);
                result.b = rgb1.b < 128 
                    ? Math.floor(2 * rgb1.b * normalize(rgb2.b))
                    : Math.floor(255 - 2 * (255 - rgb1.b) * (255 - rgb2.b) / 255);
                break;
            case 'screen':
                result.r = Math.floor(255 - (255 - rgb1.r) * (255 - rgb2.r) / 255);
                result.g = Math.floor(255 - (255 - rgb1.g) * (255 - rgb2.g) / 255);
                result.b = Math.floor(255 - (255 - rgb1.b) * (255 - rgb2.b) / 255);
                break;
            case 'soft-light':
                const blend = (a, b) => {
                    if (b < 128) {
                        return Math.floor(2 * a * normalize(b) + a * a * (255 - 2 * b) / 255 / 255);
                    } else {
                        return Math.floor(Math.sqrt(a) * (2 * b - 255) + 2 * a * (255 - b) / 255);
                    }
                };
                result.r = blend(rgb1.r, rgb2.r);
                result.g = blend(rgb1.g, rgb2.g);
                result.b = blend(rgb1.b, rgb2.b);
                break;
            default:
                result = rgb1;
        }

        // Apply opacity
        if (opacity < 1.0) {
            result.r = Math.floor(rgb1.r * (1 - opacity) + result.r * opacity);
            result.g = Math.floor(rgb1.g * (1 - opacity) + result.g * opacity);
            result.b = Math.floor(rgb1.b * (1 - opacity) + result.b * opacity);
        }

        return this.fromRGB(
            Math.max(0, Math.min(255, result.r)),
            Math.max(0, Math.min(255, result.g)),
            Math.max(0, Math.min(255, result.b))
        );
    }

    /**
     * Create a linear gradient color stop array
     * @param {Array} stops - Array of {color, position} objects (position: 0-1)
     * @returns {Array} Gradient stops for use with graphics
     */
    static createGradientStops(stops) {
        return stops.map(stop => ({
            color: typeof stop.color === 'number' ? stop.color : parseInt(stop.color.replace('#', ''), 16),
            position: stop.position
        }));
    }

    /**
     * Add procedural noise to graphics for texture variation
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width of noise area
     * @param {number} height - Height of noise area
     * @param {number} intensity - Noise intensity (0-1, default 0.1)
     * @param {number} color - Base color for noise
     */
    static addNoise(graphics, x, y, width, height, intensity = 0.1, color = 0xffffff) {
        const pixelCount = Math.floor(width * height * intensity);
        const rgb = this.toRGB(color);
        
        for (let i = 0; i < pixelCount; i++) {
            const px = x + Math.random() * width;
            const py = y + Math.random() * height;
            const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
            const alpha = Math.random() * 0.5;
            
            const noiseColor = this.fromRGB(
                Math.max(0, Math.min(255, rgb.r + variation * 255)),
                Math.max(0, Math.min(255, rgb.g + variation * 255)),
                Math.max(0, Math.min(255, rgb.b + variation * 255))
            );
            
            graphics.fillStyle(noiseColor, alpha);
            graphics.fillRect(px, py, 1, 1);
        }
    }

    /**
     * Adjust color saturation
     * @param {number} color - Base color value
     * @param {number} amount - Saturation adjustment (-1 to 1)
     * @returns {number} Adjusted color value
     */
    static adjustSaturation(color, amount) {
        const rgb = this.toRGB(color);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.s = Math.max(0, Math.min(1, hsl.s + amount));
        const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.fromRGB(newRgb.r, newRgb.g, newRgb.b);
    }

    /**
     * Adjust color hue
     * @param {number} color - Base color value
     * @param {number} amount - Hue shift in degrees (-360 to 360)
     * @returns {number} Adjusted color value
     */
    static adjustHue(color, amount) {
        const rgb = this.toRGB(color);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.h = (hsl.h + amount + 360) % 360;
        const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.fromRGB(newRgb.r, newRgb.g, newRgb.b);
    }
}


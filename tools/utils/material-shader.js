/**
 * Material Shader Utility
 * Implements 5-level cel-shading system for different material types
 * Based on Dragumagu-style pixel art specifications
 */

export class MaterialShader {
    constructor() {
        // Material shading rules from style guide - Increased contrast
        this.MATERIAL_RULES = {
            metal: { highlight: 0.6, shadow: 0.5, contrast: 'high' },
            cloth: { highlight: 0.3, shadow: 0.4, contrast: 'medium' },
            leather: { highlight: 0.25, shadow: 0.35, contrast: 'medium' },
            skin: { highlight: 0.35, shadow: 0.3, contrast: 'low' }
        };
    }

    /**
     * Generate 5-level cel-shade palette for a material
     * @param {number} baseColor - Base hex color
     * @param {string} materialType - 'metal', 'cloth', 'leather', 'skin'
     * @returns {Object} { light2, light1, base, dark1, dark2 }
     */
    generatePalette(baseColor, materialType) {
        const rule = this.MATERIAL_RULES[materialType] || this.MATERIAL_RULES.cloth;
        
        return {
            light2: this.lighten(baseColor, rule.highlight * 1.5),
            light1: this.lighten(baseColor, rule.highlight),
            base: baseColor,
            dark1: this.darken(baseColor, rule.shadow),
            dark2: this.darken(baseColor, rule.shadow * 1.5)
        };
    }

    /**
     * Calculate light factor based on position relative to light source
     * Light source is top-left (0, 0)
     * @param {number} x - X coordinate relative to shape
     * @param {number} y - Y coordinate relative to shape
     * @param {number} width - Shape width
     * @param {number} height - Shape height
     * @param {string} lightDirection - 'top-left' (default), 'top', 'left', 'center'
     * @returns {number} Light factor (0-1, where 1 is brightest)
     */
    calculateLightFactor(x, y, width, height, lightDirection = 'top-left') {
        let lightX, lightY;
        
        switch (lightDirection) {
            case 'top-left':
                lightX = 0;
                lightY = 0;
                break;
            case 'top':
                lightX = width / 2;
                lightY = 0;
                break;
            case 'left':
                lightX = 0;
                lightY = height / 2;
                break;
            case 'center':
                lightX = width / 2;
                lightY = height / 2;
                break;
            default:
                lightX = 0;
                lightY = 0;
        }

        // Calculate distance from light source (normalized)
        const dx = (x - lightX) / width;
        const dy = (y - lightY) / height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize to 0-1 range (closer to light = higher value)
        const maxDistance = Math.sqrt(2); // Maximum distance (corner to corner)
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        
        // Invert so closer = brighter
        return 1 - normalizedDistance;
    }

    /**
     * Apply cel-shading to a rectangle based on light direction
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} x - X coordinate (top-left)
     * @param {number} y - Y coordinate (top-left)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {Object} palette - 5-level palette {light2, light1, base, dark1, dark2}
     * @param {string} lightDirection - Light direction (default: 'top-left')
     */
    applyCelShade(drawer, x, y, width, height, palette, lightDirection = 'top-left') {
        // Calculate thresholds for each shading level
        // Top-left area gets light2, edges get light1, center gets base, edges get dark1, bottom-right gets dark2
        
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                const relX = px - x;
                const relY = py - y;
                const lightFactor = this.calculateLightFactor(relX, relY, width, height, lightDirection);
                
                let color;
                if (lightFactor > 0.7) {
                    // Brightest area (top-left corner)
                    color = palette.light2;
                } else if (lightFactor > 0.5) {
                    // Bright area (top/left edges)
                    color = palette.light1;
                } else if (lightFactor > 0.3) {
                    // Base color (center)
                    color = palette.base;
                } else if (lightFactor > 0.15) {
                    // Dark area (bottom/right edges)
                    color = palette.dark1;
                } else {
                    // Darkest area (bottom-right corner)
                    color = palette.dark2;
                }
                
                drawer.setPixel(px, py, color);
            }
        }
    }

    /**
     * Apply cel-shading to a circle
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} centerX - Center X
     * @param {number} centerY - Center Y
     * @param {number} radius - Radius
     * @param {Object} palette - 5-level palette
     * @param {string} lightDirection - Light direction
     */
    applyCelShadeCircle(drawer, centerX, centerY, radius, palette, lightDirection = 'top-left') {
        const r2 = radius * radius;
        
        for (let py = -radius; py <= radius; py++) {
            for (let px = -radius; px <= radius; px++) {
                if (px * px + py * py <= r2) {
                    const x = centerX + px;
                    const y = centerY + py;
                    
                    // Calculate relative position (0-1)
                    const relX = (px + radius) / (radius * 2);
                    const relY = (py + radius) / (radius * 2);
                    
                    // Light comes from top-left
                    const lightFactor = this.calculateLightFactor(
                        relX * radius * 2,
                        relY * radius * 2,
                        radius * 2,
                        radius * 2,
                        lightDirection
                    );
                    
                    let color;
                    if (lightFactor > 0.7) {
                        color = palette.light2;
                    } else if (lightFactor > 0.5) {
                        color = palette.light1;
                    } else if (lightFactor > 0.3) {
                        color = palette.base;
                    } else if (lightFactor > 0.15) {
                        color = palette.dark1;
                    } else {
                        color = palette.dark2;
                    }
                    
                    drawer.setPixel(x, y, color);
                }
            }
        }
    }

    /**
     * Lighten a color by a factor
     * @param {number} color - Hex color
     * @param {number} factor - Lightening factor (0-1)
     * @returns {number} Lightened hex color
     */
    lighten(color, factor) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        return (Math.min(255, Math.floor(r + (255 - r) * factor)) << 16) |
               (Math.min(255, Math.floor(g + (255 - g) * factor)) << 8) |
               Math.min(255, Math.floor(b + (255 - b) * factor));
    }

    /**
     * Darken a color by a factor
     * @param {number} color - Hex color
     * @param {number} factor - Darkening factor (0-1)
     * @returns {number} Darkened hex color
     */
    darken(color, factor) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        return (Math.max(0, Math.floor(r * (1 - factor))) << 16) |
               (Math.max(0, Math.floor(g * (1 - factor))) << 8) |
               Math.max(0, Math.floor(b * (1 - factor)));
    }

    /**
     * Get material type rules
     * @param {string} materialType - Material type
     * @returns {Object} Material rules
     */
    getMaterialRules(materialType) {
        return this.MATERIAL_RULES[materialType] || this.MATERIAL_RULES.cloth;
    }
}


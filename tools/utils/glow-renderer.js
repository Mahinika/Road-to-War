/**
 * Glow Renderer
 * Renders multi-layer glow effects for class-specific glows and weapon effects
 * Based on Dragumagu-style pixel art specifications
 */

export class GlowRenderer {
    constructor() {
        // Class-specific glow colors from style guide
        this.classGlows = {
            paladin: { color: 0xFFFF00, intensity: 0.8 }, // Holy yellow
            mage: { color: 0x00FFFF, intensity: 0.6 }, // Arcane cyan
            warlock: { color: 0xFF00FF, intensity: 1.0 }, // Fel purple
            priest: { color: 0xFFFF00, intensity: 0.8 }, // Holy white-gold
            death_knight: { color: 0xFF0000, intensity: 0.9 }, // Blood red
            shaman: { color: 0x00CED1, intensity: 0.7 }, // Frost teal
            hunter: { color: 0x228B22, intensity: 0.6 }, // Forest green
            rogue: { color: 0x9370DB, intensity: 0.7 }, // Purple
            warrior: { color: 0x8B0000, intensity: 0.8 }, // Dark red
            default: { color: 0xFFFFFF, intensity: 0.5 }
        };
    }

    /**
     * Render multi-layer glow
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} x - X coordinate (center)
     * @param {number} y - Y coordinate (center)
     * @param {number} radius - Glow radius
     * @param {number} color - Glow color
     * @param {number} intensity - Glow intensity (0-1, default: 0.8)
     */
    renderGlow(drawer, x, y, radius, color, intensity = 0.8) {
        // Multi-layer glow: core, outer, soft edge
        const coreRadius = Math.floor(radius * 0.3);
        const outerRadius = Math.floor(radius * 0.7);
        const softRadius = radius;

        // Layer 1: Core (solid, bright)
        const coreColor = color;
        this.renderGlowLayer(drawer, x, y, coreRadius, coreColor, 1.0);

        // Layer 2: Outer glow (semi-transparent)
        const outerAlpha = intensity * 0.6;
        this.renderGlowLayer(drawer, x, y, outerRadius, color, outerAlpha);

        // Layer 3: Soft edge (very transparent)
        const softAlpha = intensity * 0.3;
        this.renderGlowLayer(drawer, x, y, softRadius, color, softAlpha);
    }

    /**
     * Render a single glow layer
     * @private
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} x - X coordinate (center)
     * @param {number} y - Y coordinate (center)
     * @param {number} radius - Layer radius
     * @param {number} color - Glow color
     * @param {number} alpha - Alpha value (0-1)
     */
    renderGlowLayer(drawer, x, y, radius, color, alpha) {
        const r2 = radius * radius;
        const [r, g, b] = this.hexToRgb(color);

        for (let py = -radius; py <= radius; py++) {
            for (let px = -radius; px <= radius; px++) {
                const distance2 = px * px + py * py;
                
                if (distance2 <= r2) {
                    const distance = Math.sqrt(distance2);
                    const normalizedDistance = distance / radius;
                    
                    // Calculate alpha falloff (closer to center = higher alpha)
                    const distanceAlpha = this.calculateGlowAlpha(normalizedDistance, alpha);
                    
                    if (distanceAlpha > 0.1) { // Only draw if visible
                        const pixelX = x + px;
                        const pixelY = y + py;
                        const existingPixel = drawer.getPixel(pixelX, pixelY);
                        
                        if (existingPixel) {
                            // Blend with existing pixel
                            const blendedColor = this.blendColors(
                                existingPixel[0], existingPixel[1], existingPixel[2],
                                r, g, b, distanceAlpha
                            );
                            drawer.setPixel(pixelX, pixelY, blendedColor);
                        } else {
                            // Set new pixel with alpha
                            const alphaColor = (r << 16) | (g << 8) | b;
                            drawer.setPixel(pixelX, pixelY, alphaColor);
                        }
                    }
                }
            }
        }
    }

    /**
     * Render weapon glow that follows weapon shape
     * @param {Object} drawer - PixelDrawer instance
     * @param {Array<{x: number, y: number}>} weaponPath - Array of points defining weapon shape
     * @param {number} glowColor - Glow color
     * @param {number} intensity - Glow intensity (0-1)
     */
    renderWeaponGlow(drawer, weaponPath, glowColor, intensity = 0.8) {
        if (!weaponPath || weaponPath.length === 0) return;

        const glowRadius = 3; // Glow extends 3px from weapon edge

        // Render glow along weapon path
        for (let i = 0; i < weaponPath.length; i++) {
            const point = weaponPath[i];
            this.renderGlow(drawer, point.x, point.y, glowRadius, glowColor, intensity);
        }

        // Render glow at weapon tip (stronger)
        if (weaponPath.length > 0) {
            const tip = weaponPath[weaponPath.length - 1];
            this.renderGlow(drawer, tip.x, tip.y, glowRadius * 1.5, glowColor, intensity * 1.2);
        }
    }

    /**
     * Calculate glow alpha based on distance
     * @param {number} distance - Normalized distance (0-1)
     * @param {number} maxAlpha - Maximum alpha value
     * @returns {number} Calculated alpha value
     */
    calculateGlowAlpha(distance, maxAlpha) {
        // Smooth falloff using cosine curve
        const falloff = Math.cos(distance * Math.PI / 2);
        return maxAlpha * falloff;
    }

    /**
     * Get class-specific glow color
     * @param {string} className - Class name
     * @returns {Object} { color, intensity }
     */
    getClassGlow(className) {
        return this.classGlows[className.toLowerCase()] || this.classGlows.default;
    }

    /**
     * Render class-specific glow
     * @param {Object} drawer - PixelDrawer instance
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} radius - Glow radius
     * @param {string} className - Class name
     */
    renderClassGlow(drawer, x, y, radius, className) {
        const glow = this.getClassGlow(className);
        this.renderGlow(drawer, x, y, radius, glow.color, glow.intensity);
    }

    /**
     * Convert hex color to RGB
     * @private
     */
    hexToRgb(hex) {
        return [
            (hex >> 16) & 0xFF,
            (hex >> 8) & 0xFF,
            hex & 0xFF
        ];
    }

    /**
     * Blend two colors with alpha
     * @private
     */
    blendColors(r1, g1, b1, r2, g2, b2, alpha) {
        const r = Math.round(r1 * (1 - alpha) + r2 * alpha);
        const g = Math.round(g1 * (1 - alpha) + g2 * alpha);
        const b = Math.round(b1 * (1 - alpha) + b2 * alpha);
        return (r << 16) | (g << 8) | b;
    }
}


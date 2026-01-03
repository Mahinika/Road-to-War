/**
 * Skill Gem Generator
 * Generates pixel-art icons for skill gems
 */

import { PixelDrawer } from '../utils/pixel-drawer.js';
import { PaletteManager } from '../utils/palette-manager.js';

export class GemGenerator {
    constructor(canvas, rng) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rng = rng;
        this.paletteManager = new PaletteManager();
        this.width = 32;
        this.height = 32;
        this.drawer = new PixelDrawer(this.ctx, this.width, this.height);
    }

    /**
     * Generate a gem icon
     * @param {Object} gemData - Data for the gem from skill-gems.json
     * @returns {Object} Generated gem icon data
     */
    generate(gemData) {
        this.drawer.clear(0x00000000);

        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        const size = 12;

        const colors = this.getGemColors(gemData);
        const shape = this.getGemShape(gemData);

        // Draw the gem shape
        this.drawShape(centerX, centerY, size, shape, colors);

        // Apply outline
        this.drawer.drawOutline(0x000000, 1);

        // Apply to canvas
        this.drawer.apply();

        return {
            width: this.width,
            height: this.height,
            id: gemData.id
        };
    }

    /**
     * Get colors for the gem based on type/element
     */
    getGemColors(gemData) {
        const type = gemData.type;
        const element = gemData.element || gemData.effect;

        let primary, secondary, glow;

        switch (element) {
            case 'fire':
                primary = 0xFF3D00; // Bright orange-red
                secondary = 0xB71C1C; // Deep red
                glow = 0xFFFF00; // Yellow glow
                break;
            case 'cold':
                primary = 0x00E5FF; // Arcane cyan
                secondary = 0x1A237E; // Deep blue
                glow = 0xFFFFFF; // White shimmer
                break;
            case 'lightning':
                primary = 0xAA00FF; // Deep purple
                secondary = 0x4A148C; // Dark purple
                glow = 0xFFFF80; // Pale yellow spark
                break;
            case 'physical':
                primary = 0x9E9E9E; // Gray
                secondary = 0x424242; // Dark gray
                glow = 0xE0E0E0; // Light gray reflection
                break;
            case 'stun':
                primary = 0xFFD600; // Gold
                secondary = 0xF57F17; // Amber
                glow = 0xFFFFFF;
                break;
            case 'slow':
                primary = 0x1B5E20; // Deep forest green
                secondary = 0x004D40; // Teal-green
                glow = 0x76FF03; // Lime glow
                break;
            case 'bleed':
                primary = 0xD50000; // Blood red
                secondary = 0x311B92; // Bruise purple
                glow = 0xFF5252;
                break;
            case 'area':
                primary = 0x0091EA; // Bright blue
                secondary = 0x01579B; // Navy blue
                glow = 0xB3E5FC;
                break;
            case 'cooldown':
                primary = 0x00C853; // Bright green
                secondary = 0x1B5E20; // Dark green
                glow = 0xB9F6CA;
                break;
            case 'duration':
                primary = 0xFFAB00; // Orange-gold
                secondary = 0xFF6D00; // Deep orange
                glow = 0xFFE57F;
                break;
            default:
                primary = 0x607D8B; // Slate gray
                secondary = 0x263238;
                glow = 0xCFD8DC;
        }

        return { primary, secondary, glow };
    }

    /**
     * Determine shape based on gem type
     */
    getGemShape(gemData) {
        if (gemData.type === 'damage') return 'octagon';
        if (gemData.type === 'utility') return 'circle';
        if (gemData.type === 'support') return 'diamond';
        return 'diamond';
    }

    /**
     * Draw the specific shape
     */
    drawShape(x, y, size, shape, colors) {
        const half = Math.floor(size / 2);

        if (shape === 'octagon') {
            // Main body
            this.drawer.drawRect(x - half, y - half, size, size, colors.primary);
            // Corners (clip to make octagon)
            this.drawer.setPixel(x - half, y - half, 0x00000000);
            this.drawer.setPixel(x + half - 1, y - half, 0x00000000);
            this.drawer.setPixel(x - half, y + half - 1, 0x00000000);
            this.drawer.setPixel(x + half - 1, y + half - 1, 0x00000000);
            
            // Facets
            this.drawer.drawRect(x - half + 2, y - half + 2, size - 4, size - 4, colors.secondary);
            this.drawer.setPixel(x - 1, y - 1, colors.glow);
        } else if (shape === 'circle') {
            this.drawer.drawCircle(x, y, half, colors.primary);
            this.drawer.drawCircle(x, y, half - 2, colors.secondary);
            this.drawer.setPixel(x - 1, y - 1, colors.glow);
        } else if (shape === 'diamond') {
            // Draw diamond using lines
            for (let i = 0; i <= half; i++) {
                this.drawer.drawLine(x - i, y - half + i, x + i, y - half + i, colors.primary);
                this.drawer.drawLine(x - i, y + half - i, x + i, y + half - i, colors.primary);
            }
            // Inner facet
            const inner = half - 3;
            for (let i = 0; i <= inner; i++) {
                this.drawer.drawLine(x - i, y - inner + i, x + i, y - inner + i, colors.secondary);
                this.drawer.drawLine(x - i, y + inner - i, x + i, y + inner - i, colors.secondary);
            }
            this.drawer.setPixel(x, y - 2, colors.glow);
        }
    }
}


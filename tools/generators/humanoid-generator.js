/**
 * Humanoid Generator
 * Generates symmetrical humanoid sprites with body regions
 */

import { PixelDrawer } from '../utils/pixel-drawer.js';
import { PaletteManager } from '../utils/palette-manager.js';

export class HumanoidGenerator {
    constructor(canvas, rng, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rng = rng;
        this.paletteManager = new PaletteManager();
        
        // Options: paletteName, bloodline, classId
        this.paletteName = options.paletteName || 'warm';
        this.bloodline = options.bloodline || null;
        
        // If bloodline is provided, use its palette
        if (this.bloodline) {
            this.paletteName = this.bloodline;
        }
        
        this.palette = this.paletteManager.getPalette(this.paletteName) || this.paletteManager.getPalette('warm');
        
        // Match Paladin generator size: 48×48 pixels
        this.width = 48;
        this.height = 48;
        this.drawer = new PixelDrawer(this.ctx, this.width, this.height);
    }

    /**
     * Generate a humanoid sprite
     * @returns {Object} Generated sprite data
     */
    generate() {
        this.drawer.clear(0x00000000); // Clear with transparency

        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        // Draw basic body
        this.drawLegs(centerX, centerY);
        this.drawTorso(centerX, centerY);
        this.drawArms(centerX, centerY);
        this.drawHead(centerX, centerY);

        // Draw Bloodline Enhancements
        if (this.bloodline) {
            this.drawBloodlineDetails(centerX, centerY);
        }

        // Apply symmetry
        this.drawer.mirrorHorizontal(centerX);

        // Apply outline (thicker for important characters)
        const outlineColor = 0x000000;
        this.drawer.drawOutline(outlineColor, 1);

        // Final application to canvas
        this.drawer.apply();

        return {
            width: this.width,
            height: this.height,
            centerX,
            centerY,
            palette: this.paletteName,
            bloodline: this.bloodline
        };
    }

    /**
     * Draw bloodline-specific visual details
     */
    drawBloodlineDetails(centerX, centerY) {
        const glowColor = this.paletteManager.getColor(this.paletteName, 'glow', this.rng);
        const armorColor = this.paletteManager.getColor(this.paletteName, 'armor', this.rng);
        const accentColor = this.paletteManager.getColor(this.paletteName, 'accent', this.rng);

        switch (this.bloodline) {
            case 'ancient_warrior':
                // Golden pauldrons and heavier armor
                this.drawer.drawRect(centerX - 10, centerY - 14, 6, 6, armorColor); // Pauldron
                this.drawer.drawRect(centerX - 4, centerY - 10, 8, 12, armorColor); // Chestplate
                // Gold crown/halo
                this.drawer.drawCircle(centerX, centerY - 24, 2, glowColor);
                break;

            case 'arcane_scholar':
                // Floating magical orbs
                this.drawer.setPixel(centerX - 14, centerY - 18, glowColor);
                this.drawer.setPixel(centerX + 14, centerY - 18, glowColor);
                // Magical aura/rune on chest
                this.drawer.drawRect(centerX - 2, centerY - 6, 4, 4, glowColor);
                break;

            case 'shadow_assassin':
                // Mask and void eyes
                const voidColor = 0xAA00FF;
                this.drawer.setPixel(centerX - 2, centerY - 21, voidColor);
                this.drawer.setPixel(centerX + 2, centerY - 21, voidColor);
                // Cloak trim
                this.drawer.drawRect(centerX - 8, centerY - 12, 2, 16, accentColor);
                break;

            case 'dragon_born':
                // Scaly armor patterns
                this.drawer.setPixel(centerX - 3, centerY - 8, accentColor);
                this.drawer.setPixel(centerX + 3, centerY - 4, accentColor);
                // Fiery eyes
                this.drawer.setPixel(centerX - 2, centerY - 21, 0xFF3D00);
                this.drawer.setPixel(centerX + 2, centerY - 21, 0xFF3D00);
                break;

            case 'nature_blessed':
                // Leafy cloak and vine wraps
                this.drawer.drawRect(centerX - 9, centerY - 10, 4, 12, armorColor);
                this.drawer.setPixel(centerX - 5, centerY + 8, accentColor); // Vine
                this.drawer.setPixel(centerX + 5, centerY + 12, accentColor); // Vine
                break;
        }
    }

    /**
     * Draw head
     */
    drawHead(centerX, centerY) {
        const headY = centerY - 20;
        const headSize = 8;
        const skinColor = this.paletteManager.getColor('warm', 'skin', this.rng);

        // Head circle
        this.drawer.drawCircle(centerX, headY, headSize / 2, skinColor);

        // Eyes (default)
        const eyeY = headY - 1;
        this.drawer.setPixel(centerX - 2, eyeY, 0x000000);
        this.drawer.setPixel(centerX + 2, eyeY, 0x000000);
    }

    /**
     * Draw torso
     */
    drawTorso(centerX, centerY) {
        const torsoY = centerY - 5;
        const torsoWidth = 14;
        const torsoHeight = 18;
        const clothColor = this.palette.cloth ? this.rng.randomChoice(this.palette.cloth) : this.paletteManager.getColor('warm', 'cloth', this.rng);

        this.drawer.drawRect(
            centerX - torsoWidth / 2,
            torsoY - torsoHeight / 2,
            torsoWidth,
            torsoHeight,
            clothColor
        );
    }

    /**
     * Draw arms
     */
    drawArms(centerX, centerY) {
        const armY = centerY - 2;
        const armLength = 14;
        const armWidth = 4;
        const skinColor = this.paletteManager.getColor('warm', 'skin', this.rng);

        // Arms (simplified for mirroring)
        this.drawer.drawRect(
            centerX - 10,
            armY - armLength / 2,
            armWidth,
            armLength,
            skinColor
        );
    }

    /**
     * Draw legs
     */
    drawLegs(centerX, centerY) {
        const legY = centerY + 12;
        const legLength = 14;
        const legWidth = 6;
        const clothColor = this.palette.cloth ? this.rng.randomChoice(this.palette.cloth) : this.paletteManager.getColor('warm', 'cloth', this.rng);

        // Legs (simplified for mirroring)
        this.drawer.drawRect(
            centerX - 6,
            legY - legLength / 2,
            legWidth,
            legLength,
            clothColor
        );
    }
}


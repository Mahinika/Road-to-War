/**
 * Equipment Generator
 * Generates weapon and armor overlays for sprites
 */

import { PixelDrawer } from '../utils/pixel-drawer.js';
import { PaletteManager } from '../utils/palette-manager.js';

export class EquipmentGenerator {
    constructor(canvas, rng, paletteName = 'metallic') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rng = rng;
        this.paletteManager = new PaletteManager();
        this.palette = this.paletteManager.getPalette(paletteName);
        this.width = 64;
        this.height = 64;
        this.drawer = new PixelDrawer(this.ctx, this.width, this.height);
    }

    /**
     * Draw a sword with optional bloodline infusion
     */
    drawSword(x, y, length, metalColor, bloodline = null) {
        const bladeWidth = 2;
        const hiltLength = 4;
        const guardWidth = 6;
        
        let finalMetalColor = metalColor;
        let glowColor = null;

        // Bloodline Infusion
        if (bloodline === 'ancient_warrior') {
            finalMetalColor = 0xFFD700; // Gold blade
            glowColor = 0xFFFFFF; // White-gold glow
        } else if (bloodline === 'shadow_assassin') {
            finalMetalColor = 0x121212; // Dark blade
            glowColor = 0xAA00FF; // Void purple glow
        } else if (bloodline === 'dragon_born') {
            glowColor = 0xFF3D00; // Fiery glow
        }

        // Blade
        this.drawer.drawRect(
            x - bladeWidth / 2,
            y,
            bladeWidth,
            length - hiltLength,
            finalMetalColor
        );

        // Glow effect (on blade edges)
        if (glowColor) {
            this.drawer.setPixel(x - bladeWidth / 2, y + 2, glowColor);
            this.drawer.setPixel(x + bladeWidth / 2, y + length / 2, glowColor);
        }

        // Guard (cross guard)
        this.drawer.drawRect(
            x - guardWidth / 2,
            y + length - hiltLength - 2,
            guardWidth,
            2,
            finalMetalColor
        );

        // Hilt
        const hiltColor = 0x8B4513; // Brown
        this.drawer.drawRect(
            x - bladeWidth / 2,
            y + length - hiltLength,
            bladeWidth,
            hiltLength,
            hiltColor
        );

        // Pommel
        this.drawer.drawCircle(x, y + length, 2, finalMetalColor);
    }

    /**
     * Draw a magical staff
     */
    drawStaff(x, y, length, color, bloodline = null) {
        const staffWidth = 2;
        let finalColor = color;
        let crystalColor = 0xFFFFFF;

        if (bloodline === 'arcane_scholar') {
            finalColor = 0x3949AB;
            crystalColor = 0x00E5FF; // Arcane cyan
        } else if (bloodline === 'nature_blessed') {
            finalColor = 0x795548; // Bark brown
            crystalColor = 0x76FF03; // Living green
        }

        this.drawer.drawRect(
            x - staffWidth / 2,
            y,
            staffWidth,
            length,
            finalColor
        );

        // Top ornament (Crystal/Orb)
        this.drawer.drawCircle(x, y, 4, crystalColor);
        
        // Secondary glow
        this.drawer.setPixel(x - 1, y - 1, 0xFFFFFF);
    }

    /**
     * Draw a shield
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Shield size
     * @param {number} metalColor - Metal color
     */
    drawShield(x, y, size, metalColor) {
        // Shield shape (rounded rectangle)
        const shieldWidth = size;
        const shieldHeight = size * 1.2;

        // Main shield body
        this.drawer.drawRect(
            x - shieldWidth / 2,
            y - shieldHeight / 2,
            shieldWidth,
            shieldHeight,
            metalColor
        );

        // Shield outline
        this.drawer.drawRectOutline(
            x - shieldWidth / 2,
            y - shieldHeight / 2,
            shieldWidth,
            shieldHeight,
            0x000000
        );

        // Shield emblem (simple cross)
        const emblemColor = 0xFFD700; // Gold
        this.drawer.drawLine(x, y - shieldHeight / 2 + 2, x, y + shieldHeight / 2 - 2, emblemColor);
        this.drawer.drawLine(x - shieldWidth / 2 + 2, y, x + shieldWidth / 2 - 2, y, emblemColor);
    }

    /**
     * Draw helmet
     * @param {number} x - X position (center)
     * @param {number} y - Y position (top of head)
     * @param {number} size - Head size
     * @param {number} metalColor - Metal color
     */
    drawHelmet(x, y, size, metalColor) {
        const helmetHeight = size + 2;
        const helmetWidth = size + 1;

        // Helmet base
        this.drawer.drawRect(
            x - helmetWidth / 2,
            y,
            helmetWidth,
            helmetHeight,
            metalColor
        );

        // Visor
        const visorY = y + helmetHeight / 2;
        this.drawer.drawRect(
            x - helmetWidth / 2,
            visorY,
            helmetWidth,
            2,
            0x000000
        );

        // Helmet crest/plume (optional)
        if (this.rng.random() > 0.5) {
            this.drawer.drawRect(
                x - 1,
                y - 3,
                2,
                3,
                0xFF0000 // Red plume
            );
        }
    }

    /**
     * Draw chest armor
     * @param {number} x - X position (center)
     * @param {number} y - Y position (center of torso)
     * @param {number} width - Torso width
     * @param {number} height - Torso height
     * @param {number} metalColor - Metal color
     */
    drawChestArmor(x, y, width, height, metalColor) {
        // Chest plate
        this.drawer.drawRect(
            x - width / 2,
            y - height / 2,
            width,
            height,
            metalColor
        );

        // Armor outline
        this.drawer.drawRectOutline(
            x - width / 2,
            y - height / 2,
            width,
            height,
            0x000000
        );

        // Chest plate details (vertical lines)
        this.drawer.drawLine(x, y - height / 2, x, y + height / 2, 0x000000);
    }

    /**
     * Draw shoulder pads
     * @param {number} x - X position (center)
     * @param {number} y - Y position (shoulder level)
     * @param {number} size - Shoulder pad size
     * @param {number} metalColor - Metal color
     */
    drawShoulderPads(x, y, size, metalColor) {
        // Left shoulder (will be mirrored)
        this.drawer.drawCircle(x - 8, y, size, metalColor);
        // Right shoulder (will be mirrored)
        this.drawer.drawCircle(x + 8, y, size, metalColor);
    }

    /**
     * Apply equipment to existing sprite
     * @param {ImageData} existingImageData - Existing sprite image data
     */
    applyToSprite(existingImageData) {
        // Copy existing image data
        this.drawer.imageData = existingImageData;
        this.drawer.apply();
    }
}


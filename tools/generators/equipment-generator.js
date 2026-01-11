/**
 * Equipment Generator
 * Generates weapon and armor overlays for sprites
 */

import { PixelDrawer } from '../utils/pixel-drawer.js';
import { PaletteManager } from '../utils/palette-manager.js';
import { TextureGenerator } from '../utils/texture-generator.js';

export class EquipmentGenerator {
    constructor(canvas, rng, paletteName = 'metallic') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rng = rng;
        this.paletteManager = new PaletteManager();
        this.palette = this.paletteManager.getPalette(paletteName);
        this.width = 128;  // Updated to match hero sprite size (128x128)
        this.height = 128; // Updated to match hero sprite size (128x128)
        this.drawer = new PixelDrawer(this.ctx, this.width, this.height);
        
        // Initialize TextureGenerator
        const seed = rng ? rng.seed || 12345 : 12345;
        this.textureGenerator = new TextureGenerator(seed);
    }

    /**
     * Draw a sword with optional bloodline infusion
     */
    drawSword(x, y, length, metalColor, bloodline = null) {
        const bladeWidth = 4;  // Scaled up for 128x128 canvas
        const hiltLength = 8;  // Scaled up for 128x128 canvas
        const guardWidth = 12; // Scaled up for 128x128 canvas
        
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
            this.drawer.setPixel(x - bladeWidth / 2, y + 4, glowColor); // Scaled up
            this.drawer.setPixel(x + bladeWidth / 2, y + length / 2, glowColor);
        }

        // Guard (cross guard)
        this.drawer.drawRect(
            x - guardWidth / 2,
            y + length - hiltLength - 4, // Scaled up from -2
            guardWidth,
            4, // Scaled up from 2
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
        this.drawer.drawCircle(x, y + length, 4, finalMetalColor); // Scaled up from 2
    }

    /**
     * Draw a magical staff
     */
    drawStaff(x, y, length, color, bloodline = null) {
        const staffWidth = 4; // Scaled up for 128x128 canvas
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
        this.drawer.drawCircle(x, y, 8, crystalColor); // Scaled up from 4

        // Secondary glow
        this.drawer.setPixel(x - 2, y - 2, 0xFFFFFF); // Scaled up from -1
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
        this.drawer.drawLine(x, y - shieldHeight / 2 + 4, x, y + shieldHeight / 2 - 4, emblemColor); // Scaled up from 2
        this.drawer.drawLine(x - shieldWidth / 2 + 4, y, x + shieldWidth / 2 - 4, y, emblemColor); // Scaled up from 2
    }

    /**
     * Draw helmet
     * @param {number} x - X position (center)
     * @param {number} y - Y position (top of head)
     * @param {number} size - Head size
     * @param {number} metalColor - Metal color
     */
    drawHelmet(x, y, size, metalColor) {
        const helmetHeight = size + 4; // Scaled up from +2
        const helmetWidth = size + 2;  // Scaled up from +1

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
            4, // Scaled up from 2
            0x000000
        );

        // Helmet crest/plume (optional)
        if (this.rng.random() > 0.5) {
            this.drawer.drawRect(
                x - 2, // Scaled up from -1
                y - 6, // Scaled up from -3
                4,     // Scaled up from 2
                6,     // Scaled up from 3
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

        // Apply metal texture
        this.textureGenerator.applyMetalTexture(
            this.drawer,
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
     * Draw detailed chest armor with segmentation lines, buckles, and engravings
     * @param {number} x - X position (center)
     * @param {number} y - Y position (center of torso)
     * @param {number} width - Torso width
     * @param {number} height - Torso height
     * @param {number} metalColor - Metal color
     * @param {Object} details - Detail configuration
     */
    drawDetailedChestArmor(x, y, width, height, metalColor, details = {}) {
        // Base chest plate
        this.drawer.drawRect(
            x - width / 2,
            y - height / 2,
            width,
            height,
            metalColor
        );

        // Apply metal texture
        this.textureGenerator.applyMetalTexture(
            this.drawer,
            x - width / 2,
            y - height / 2,
            width,
            height,
            metalColor
        );

        // Segmentation lines (if enabled)
        if (details.segmentation !== false) {
            this.drawSegmentationLines(x, y, width, height, details.segments || 3);
        }

        // Buckle/emblem (if enabled)
        if (details.buckle !== false) {
            const buckleSize = details.buckleSize || 8; // Scaled up from 4
            this.drawBuckle(x, y + height / 2 - 4, buckleSize, details.buckleColor || 0xFFD700); // Scaled up from -2
        }

        // Engravings (if enabled)
        if (details.engravings) {
            this.drawEngravings(x, y, width, height, details.pattern || 'simple');
        }

        // Armor outline
        this.drawer.drawRectOutline(
            x - width / 2,
            y - height / 2,
            width,
            height,
            0x000000
        );
    }

    /**
     * Draw segmentation lines for plate armor
     * @param {number} x - X position (center)
     * @param {number} y - Y position (center)
     * @param {number} width - Armor width
     * @param {number} height - Armor height
     * @param {number} segments - Number of segments (default: 3)
     */
    drawSegmentationLines(x, y, width, height, segments = 3) {
        const segmentWidth = width / segments;
        
        // Vertical segmentation lines
        for (let i = 1; i < segments; i++) {
            const lineX = x - width / 2 + segmentWidth * i;
            this.drawer.drawLine(
                lineX,
                y - height / 2,
                lineX,
                y + height / 2,
                0x000000 // Black outline
            );
        }
        
        // Horizontal segmentation line (middle)
        this.drawer.drawLine(
            x - width / 2,
            y,
            x + width / 2,
            y,
            0x000000
        );
    }

    /**
     * Draw buckle or emblem
     * @param {number} x - X position (center)
     * @param {number} y - Y position
     * @param {number} size - Buckle size
     * @param {number} color - Buckle color (default: gold)
     */
    drawBuckle(x, y, size, color = 0xFFD700) {
        // Main buckle body
        this.drawer.drawRect(
            x - size / 2,
            y - size / 2,
            size,
            size,
            color
        );

        // Buckle highlight
        const highlightColor = this.lightenColor(color, 0.3);
        this.drawer.drawRect(
            x - size / 2 + 2, // Scaled up from +1
            y - size / 2 + 2, // Scaled up from +1
            size - 4,         // Scaled up from -2
            2,                // Scaled up from 1
            highlightColor
        );

        // Buckle outline
        this.drawer.drawRectOutline(
            x - size / 2,
            y - size / 2,
            size,
            size,
            0x000000
        );
    }

    /**
     * Draw engravings/decorative patterns
     * @param {number} x - X position (center)
     * @param {number} y - Y position (center)
     * @param {number} width - Armor width
     * @param {number} height - Armor height
     * @param {string} pattern - Pattern type ('simple', 'ornate', 'runic')
     */
    drawEngravings(x, y, width, height, pattern = 'simple') {
        const engravingColor = 0x000000; // Black engravings
        
        switch (pattern) {
            case 'simple':
                // Simple cross pattern
                this.drawer.drawLine(x - 4, y - 4, x + 4, y + 4, engravingColor); // Scaled up from ±2
                this.drawer.drawLine(x - 4, y + 4, x + 4, y - 4, engravingColor); // Scaled up from ±2
                break;

            case 'ornate':
                // Ornate decorative lines
                // Vertical center line with decorative elements
                this.drawer.drawLine(x, y - height / 2 + 4, x, y + height / 2 - 4, engravingColor); // Scaled up from ±2
                // Decorative curves at top and bottom
                this.drawer.setPixel(x - 2, y - height / 2 + 4, engravingColor); // Scaled up from ±1, ±2
                this.drawer.setPixel(x + 2, y - height / 2 + 4, engravingColor); // Scaled up from ±1, ±2
                this.drawer.setPixel(x - 2, y + height / 2 - 4, engravingColor); // Scaled up from ±1, ±2
                this.drawer.setPixel(x + 2, y + height / 2 - 4, engravingColor); // Scaled up from ±1, ±2
                break;

            case 'runic':
                // Runic symbols (simplified)
                // Top rune
                this.drawer.setPixel(x - 2, y - height / 2 + 4, engravingColor); // Scaled up from ±1, ±2
                this.drawer.setPixel(x, y - height / 2 + 6, engravingColor);     // Scaled up from ±3
                this.drawer.setPixel(x + 2, y - height / 2 + 4, engravingColor); // Scaled up from ±1, ±2
                // Bottom rune
                this.drawer.setPixel(x - 2, y + height / 2 - 4, engravingColor); // Scaled up from ±1, ±2
                this.drawer.setPixel(x, y + height / 2 - 6, engravingColor);     // Scaled up from ±3
                this.drawer.setPixel(x + 2, y + height / 2 - 4, engravingColor); // Scaled up from ±1, ±2
                break;
        }
    }

    /**
     * Draw emblem (more detailed than buckle)
     * @param {number} x - X position (center)
     * @param {number} y - Y position
     * @param {number} size - Emblem size
     * @param {number} color - Emblem color
     * @param {string} shape - Emblem shape ('circle', 'shield', 'star')
     */
    drawEmblem(x, y, size, color = 0xFFD700, shape = 'circle') {
        switch (shape) {
            case 'circle':
                this.drawer.drawCircle(x, y, size / 2, color);
                this.drawer.drawCircle(x, y, size / 2 - 2, 0x000000); // Outline - scaled up from -1
                break;

            case 'shield':
                // Shield-shaped emblem
                const shieldWidth = size;
                const shieldHeight = size * 1.2;
                this.drawer.drawRect(
                    x - shieldWidth / 2,
                    y - shieldHeight / 2,
                    shieldWidth,
                    shieldHeight,
                    color
                );
                this.drawer.drawRectOutline(
                    x - shieldWidth / 2,
                    y - shieldHeight / 2,
                    shieldWidth,
                    shieldHeight,
                    0x000000
                );
                break;

            case 'star':
                // Star-shaped emblem (simplified)
                const points = [
                    { x: x, y: y - size / 2 },
                    { x: x + size / 4, y: y - size / 4 },
                    { x: x + size / 2, y: y },
                    { x: x + size / 4, y: y + size / 4 },
                    { x: x, y: y + size / 2 },
                    { x: x - size / 4, y: y + size / 4 },
                    { x: x - size / 2, y: y },
                    { x: x - size / 4, y: y - size / 4 }
                ];
                this.drawer.drawPolygon(points, color);
                break;
        }
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
     * Draw shoulder pads
     * @param {number} x - X position (center)
     * @param {number} y - Y position (shoulder level)
     * @param {number} size - Shoulder pad size
     * @param {number} metalColor - Metal color
     */
    drawShoulderPads(x, y, size, metalColor) {
        // Left shoulder (will be mirrored)
        this.drawer.drawCircle(x - 16, y, size, metalColor); // Scaled up from -8
        // Right shoulder (will be mirrored)
        this.drawer.drawCircle(x + 16, y, size, metalColor); // Scaled up from +8
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


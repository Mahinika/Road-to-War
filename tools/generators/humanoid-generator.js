/**
 * Humanoid Generator
 * Generates symmetrical humanoid sprites with body regions
 */

import { PixelDrawer } from '../utils/pixel-drawer.js';
import { PaletteManager } from '../utils/palette-manager.js';
import { MaterialShader } from '../utils/material-shader.js';
import { ProportionManager } from '../utils/proportion-manager.js';

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
        
        // Initialize MaterialShader for 5-level cel-shading
        this.materialShader = new MaterialShader();
        
        // Match Paladin generator size: 48×48 pixels
        this.width = 48;
        this.height = 48;
        
        // Initialize ProportionManager for strict chibi proportions
        this.proportionManager = new ProportionManager(this.height);
        
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

        // Draw basic body - Order matters for layering
        this.drawLegs(centerX, centerY);
        this.drawArms(centerX, centerY);
        this.drawTorso(centerX, centerY);
        this.drawHead(centerX, centerY);

        // Apply symmetry
        this.drawer.mirrorHorizontal(centerX);

        // Draw Bloodline Enhancements (some may need to be after mirror)
        if (this.bloodline) {
            this.drawBloodlineDetails(centerX, centerY);
        }

        // Apply outline (stronger 2px outline for main characters)
        const outlineColor = 0x000000;
        this.drawer.drawOutline(outlineColor, 2);

        // Final application to canvas
        this.drawer.apply();

        return {
            width: this.width,
            height: this.height,
            centerX,
            centerY,
            palette: this.paletteName,
            bloodline: this.bloodline,
            canvas: this.canvas // Ensure canvas is returned
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
        // Use ProportionManager for head bounds
        const headBounds = this.proportionManager.getHeadBounds(centerX, centerY);
        const headRadius = Math.floor(headBounds.width / 2);
        const skinColor = this.paletteManager.getColor('warm', 'skin', this.rng);

        // Use MaterialShader for 5-level cel-shading on skin
        const skinPalette = this.materialShader.generatePalette(skinColor, 'skin');
        this.materialShader.applyCelShadeCircle(
            this.drawer,
            headBounds.centerX,
            headBounds.centerY,
            headRadius,
            skinPalette,
            'top-left'
        );

        // Eyes (default)
        const eyeY = headBounds.centerY - 1;
        this.drawer.setPixel(centerX - 2, eyeY, 0x000000);
        this.drawer.setPixel(centerX + 2, eyeY, 0x000000);
    }

    /**
     * Draw torso
     */
    drawTorso(centerX, centerY) {
        // Use ProportionManager for torso bounds
        const torsoBounds = this.proportionManager.getTorsoBounds(centerX, centerY);
        const clothColor = this.palette.cloth ? this.rng.randomChoice(this.palette.cloth) : this.paletteManager.getColor('warm', 'cloth', this.rng);

        // Use MaterialShader for 5-level cel-shading on cloth
        const clothPalette = this.materialShader.generatePalette(clothColor, 'cloth');
        this.materialShader.applyCelShade(
            this.drawer,
            torsoBounds.x,
            torsoBounds.y,
            torsoBounds.width,
            torsoBounds.height,
            clothPalette,
            'top-left'
        );
    }

    /**
     * Draw arms
     */
    drawArms(centerX, centerY) {
        // Use ProportionManager for arm bounds (left side only, will be mirrored)
        const armBounds = this.proportionManager.getArmBounds(centerX, centerY, 'left');
        const skinColor = this.paletteManager.getColor('warm', 'skin', this.rng);

        // Use MaterialShader for 5-level cel-shading on skin
        const skinPalette = this.materialShader.generatePalette(skinColor, 'skin');
        this.materialShader.applyCelShade(
            this.drawer,
            armBounds.x,
            armBounds.y,
            armBounds.width,
            armBounds.height,
            skinPalette,
            'top-left'
        );
    }

    /**
     * Draw legs
     */
    drawLegs(centerX, centerY) {
        // Use ProportionManager for leg bounds (left side only, will be mirrored)
        const legBounds = this.proportionManager.getLegBounds(centerX, centerY, 'left');
        const clothColor = this.palette.cloth ? this.rng.randomChoice(this.palette.cloth) : this.paletteManager.getColor('warm', 'cloth', this.rng);

        // Use MaterialShader for 5-level cel-shading on cloth
        const clothPalette = this.materialShader.generatePalette(clothColor, 'cloth');
        this.materialShader.applyCelShade(
            this.drawer,
            legBounds.x,
            legBounds.y,
            legBounds.width,
            legBounds.height,
            clothPalette,
            'top-left'
        );
    }
}


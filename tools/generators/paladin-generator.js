/**
 * Paladin Generator
 * Generates Paladin sprite with specific design (silver armor, helmet, sword, holy effects)
 */

import { createCanvas } from 'canvas';
import { HumanoidGenerator } from './humanoid-generator.js';
import { EquipmentGenerator } from './equipment-generator.js';
import { PixelDrawer } from '../utils/pixel-drawer.js';
import { PaletteManager } from '../utils/palette-manager.js';
import { SeededRNG } from '../utils/seeded-rng.js';
import { MaterialShader } from '../utils/material-shader.js';
import { ProportionManager } from '../utils/proportion-manager.js';

export class PaladinGenerator {
    constructor(seed = 12345, styleConfig = null) {
        this.seed = seed;
        this.rng = new SeededRNG(seed);
        this.styleConfig = styleConfig;
        
        // ALWAYS use exact ChatGPT spec proportions (unconditional)
        // Professional game-ready pixel art proportions (per ChatGPT spec)
        this.proportions = {
            headSize: 6,   // ~6px diameter (per spec)
            headY: 9,      // Positioned around Y≈9 (per spec)
            torsoWidth: 9, // ~9px wide (per spec)
            torsoHeight: 12, // ~12px tall (per spec)
            torsoY: 21,    // Centered around Y≈21 (per spec)
            armLength: 9,  // ~9px long (per spec)
            armWidth: 3,   // ~3px wide (per spec)
            legLength: 9,  // ~9px long (per spec)
            legWidth: 4,   // ~4px wide (per spec)
            centerX: 24,
            centerY: 24
        };
        
        // Use style config for colors only (not proportions)
        if (styleConfig) {
            this.palette = styleConfig.palette || {};
            this.style = styleConfig.style || {};
        } else {
            this.paletteManager = new PaletteManager();
            this.palette = this.paletteManager.getPalette('paladin');
            this.style = {};
        }
        
        // Default style if not provided
        if (!this.style.outlineColor) this.style.outlineColor = 0x000000;
        if (!this.style.outlineThickness) this.style.outlineThickness = 2; // 1-3px per spec
        
        // Initialize MaterialShader for 5-level cel-shading
        this.materialShader = new MaterialShader();
        
        // Recommended size: 48×48 pixels (optimal balance of detail and performance)
        this.width = 48;
        this.height = 48;
        
        // Initialize ProportionManager for strict chibi proportions
        this.proportionManager = new ProportionManager(this.height);
        
        this.canvas = createCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Generate Paladin sprite
     * @returns {Object} Canvas and metadata
     */
    generate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Use ProportionManager for consistent proportions
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        const drawer = new PixelDrawer(this.ctx, this.width, this.height);
        drawer.clear(0x00000000); // Transparent background

        // Get Paladin colors (from style config or defaults)
        // Add variation by slightly modifying colors based on seed
        const getColor = (category, defaultColor) => {
            let color = defaultColor;
            
            if (this.styleConfig && this.palette[category] && this.palette[category].length > 0) {
                color = this.rng.randomChoice(this.palette[category]);
                
                // Reduced variation for better color accuracy (±10-15% instead of ±30%)
                const variation = (this.rng.random() - 0.5) * 0.12; // ±12% variation (reduced from 30%)
                const r = (color >> 16) & 0xFF;
                const g = (color >> 8) & 0xFF;
                const b = color & 0xFF;
                
                const newR = Math.max(0, Math.min(255, Math.round(r * (1 + variation))));
                const newG = Math.max(0, Math.min(255, Math.round(g * (1 + variation))));
                const newB = Math.max(0, Math.min(255, Math.round(b * (1 + variation))));
                
                color = (newR << 16) | (newG << 8) | newB;
            } else if (!this.styleConfig && this.paletteManager) {
                color = this.paletteManager.getColor('paladin', category, this.rng);
            }
            
            return color;
        };
        
        // Professional game-ready color palette (per ChatGPT spec)
        // ALWAYS use exact spec colors - style config only affects accents/glow
        // Armor: #FFFFFF (highlight), #D0D0D0 (mid), #A0A0A0 (shadow)
        const armorColor = 0xD0D0D0; // ALWAYS mid-tone silver (per spec) - ignore style config
        const accentColor = getColor('accent', 0x2C3E50); // Dark blue (can use style config)
        const clothColor = 0x4169E1; // ALWAYS dark blue under-armor (per spec) - ignore style config
        const skinColor = getColor('skin', 0xFFDBAC);
        const goldColor = getColor('gold', 0xFFD700);
        // Glow: white core with yellow outer pixels (per spec)
        const glowColorCore = 0xFFFFFF; // White core
        const glowColorOuter = 0xFFFF00; // Yellow outer
        
        // Debug: Log colors being used
        if (this.styleConfig) {
        }

        // Draw only left half, then mirror for symmetry
        // Layer 1: Base body (legs and torso base) - left side only
        this.drawLegsLeft(drawer, centerX, centerY, clothColor);
        this.drawTorsoBase(drawer, centerX, centerY, clothColor);

        // Layer 2: Chest armor with detailed segmentation and decorations
        const torsoBounds = this.proportionManager.getTorsoBounds(centerX, centerY);
        this.drawDetailedChestArmor(
            drawer,
            torsoBounds.centerX,
            torsoBounds.centerY,
            torsoBounds.width - 1,
            torsoBounds.height - 1,
            armorColor,
            accentColor
        );

        // Layer 3: Shoulder pads - left side only (scaled for 48×48)
        this.drawShoulderPadLeft(drawer, centerX, centerY - 6, armorColor, accentColor);

        // Layer 4: Arms - left side only
        this.drawArmLeft(drawer, centerX, centerY, clothColor, armorColor);

        // Layer 5: Head and helmet (use ProportionManager)
        const headBounds = this.proportionManager.getHeadBounds(centerX, centerY);
        this.drawHead(drawer, centerX, centerY, skinColor);
        this.drawHelmet(drawer, headBounds.centerX, headBounds.centerY, armorColor, accentColor);

        // Layer 6: Holy light effects (eye glow is in helmet, this is for additional effects)
        // Note: Eye glow is handled in drawHelmet, so this is for additional effects if needed
        // this.drawHolyEffects(drawer, centerX, headY, glowColorOuter);

        // Apply symmetry to mirror left side to right
        drawer.mirrorHorizontal(centerX);

        // Layer 7: Weapon (sword) - draw after mirroring, on RIGHT side (per spec)
        // Sword held on RIGHT side, angled upward diagonally (per spec)
        // Longer, more elegant sword
        this.drawSword(drawer, centerX + 10, centerY - 4, 20, armorColor);

        // Apply outline last (strong black silhouette, 1-3px per spec)
        const outlineColor = this.style.outlineColor !== undefined ? this.style.outlineColor : 0x000000;
        const outlineThickness = this.style.outlineThickness !== undefined ? this.style.outlineThickness : 2; // Default 2px (1-3px per spec)
        drawer.drawOutline(outlineColor, outlineThickness);

        // Apply to canvas
        drawer.apply();

        return {
            canvas: this.canvas,
            metadata: {
                seed: this.seed,
                type: 'paladin',
                palette: 'paladin',
                equipment: {
                    weapon: 'sword',
                    armor: 'plate',
                    helmet: true
                },
                generatedAt: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }

    /**
     * Draw legs (left side only, will be mirrored)
     */
    drawLegsLeft(drawer, centerX, centerY, clothColor) {
        // Use ProportionManager for leg bounds
        const legBounds = this.proportionManager.getLegBounds(centerX, centerY, 'left');

        // Use MaterialShader for 5-level cel-shading on cloth
        const clothPalette = this.materialShader.generatePalette(clothColor, 'cloth');
        this.materialShader.applyCelShade(
            drawer,
            legBounds.x,
            legBounds.y,
            legBounds.width,
            legBounds.height,
            clothPalette,
            'top-left'
        );
    }

    /**
     * Draw base torso
     */
    drawTorsoBase(drawer, centerX, centerY, clothColor) {
        // Use ProportionManager for torso bounds
        const torsoBounds = this.proportionManager.getTorsoBounds(centerX, centerY);
        
        // Use MaterialShader for 5-level cel-shading on cloth
        const clothPalette = this.materialShader.generatePalette(clothColor, 'cloth');
        this.materialShader.applyCelShade(
            drawer,
            torsoBounds.x,
            torsoBounds.y,
            torsoBounds.width,
            torsoBounds.height,
            clothPalette,
            'top-left'
        );
    }

    /**
     * Draw detailed chest armor with segmentation, buckles, and engravings
     */
    drawDetailedChestArmor(drawer, centerX, centerY, width, height, armorColor, accentColor) {
        // Use MaterialShader for 5-level cel-shading on metal armor
        const metalPalette = this.materialShader.generatePalette(armorColor, 'metal');
        this.materialShader.applyCelShade(
            drawer,
            centerX - width / 2,
            centerY - height / 2,
            width,
            height,
            metalPalette,
            'top-left'
        );

        // Create EquipmentGenerator for detailed methods
        const equipmentGen = new EquipmentGenerator(this.canvas, this.rng, 'metallic');
        equipmentGen.drawer = drawer; // Use existing drawer

        // Draw detailed chest armor with all features
        equipmentGen.drawDetailedChestArmor(
            centerX,
            centerY,
            width,
            height,
            armorColor,
            {
                segmentation: true,
                segments: 3,
                buckle: true,
                buckleSize: 4,
                buckleColor: this.styleConfig && this.palette.gold && this.palette.gold.length > 0
                    ? this.palette.gold[0]
                    : 0xFFD700,
                engravings: true,
                pattern: 'ornate'
            }
        );

        // Vertical decorative stripe down center (per spec)
        drawer.drawLine(centerX, centerY - height / 2, centerX, centerY + height / 2, accentColor);
    }

    /**
     * Draw shoulder pad (left side only, will be mirrored)
     */
    drawShoulderPadLeft(drawer, centerX, centerY, armorColor, accentColor) {
        // Large segmented plate pauldrons visible from front (per spec)
        const padWidth = 6; // Large pauldrons
        const padHeight = 5;
        const padX = centerX - 6;
        const padY = centerY - 2; // Slightly above center

        // Use MaterialShader for 5-level cel-shading on metal armor
        const metalPalette = this.materialShader.generatePalette(armorColor, 'metal');
        this.materialShader.applyCelShade(
            drawer,
            padX - padWidth / 2,
            padY - padHeight / 2,
            padWidth,
            padHeight,
            metalPalette,
            'top-left'
        );

        // Segmented plate divisions (internal outlines per spec)
        drawer.drawLine(padX - padWidth / 2 + 2, padY - padHeight / 2, padX - padWidth / 2 + 2, padY + padHeight / 2, 0x000000);
        drawer.drawLine(padX + padWidth / 2 - 2, padY - padHeight / 2, padX + padWidth / 2 - 2, padY + padHeight / 2, 0x000000);
    }

    /**
     * Draw arm (left side only, will be mirrored)
     */
    drawArmLeft(drawer, centerX, centerY, clothColor, armorColor) {
        // Use ProportionManager for arm bounds
        const armBounds = this.proportionManager.getArmBounds(centerX, centerY, 'left');

        // Left arm (cloth base) with MaterialShader
        const clothPalette = this.materialShader.generatePalette(clothColor, 'cloth');
        this.materialShader.applyCelShade(
            drawer,
            armBounds.x,
            armBounds.y,
            armBounds.width,
            armBounds.height,
            clothPalette,
            'top-left'
        );

        // Left arm armor (gauntlet) with MaterialShader
        const metalPalette = this.materialShader.generatePalette(armorColor, 'metal');
        const gauntletHeight = Math.floor(armBounds.height * 0.3); // 30% of arm length
        this.materialShader.applyCelShade(
            drawer,
            armBounds.x,
            armBounds.y,
            armBounds.width,
            gauntletHeight,
            metalPalette,
            'top-left'
        );
    }

    /**
     * Draw head
     */
    drawHead(drawer, centerX, centerY, skinColor) {
        // Use ProportionManager for head bounds
        const headBounds = this.proportionManager.getHeadBounds(centerX, centerY);
        const headRadius = Math.floor(headBounds.width / 2);
        
        // Use MaterialShader for 5-level cel-shading on skin
        const skinPalette = this.materialShader.generatePalette(skinColor, 'skin');
        this.materialShader.applyCelShadeCircle(
            drawer,
            headBounds.centerX,
            headBounds.centerY,
            headRadius,
            skinPalette,
            'top-left'
        );
    }

    /**
     * Draw helmet (draws over head)
     */
    drawHelmet(drawer, centerX, centerY, armorColor, accentColor) {
        // Use ProportionManager for head bounds to size helmet
        const headBounds = this.proportionManager.getHeadBounds(centerX, centerY);
        const headSize = headBounds.width;
        const headY = headBounds.centerY;
        const helmetHeight = headSize + 2; // Tighter knight helmet
        const helmetWidth = headSize + 2;
        
        // Use MaterialShader for 5-level cel-shading on metal helmet
        const metalPalette = this.materialShader.generatePalette(armorColor, 'metal');
        
        // Draw rectangular body with cel-shading
        this.materialShader.applyCelShade(
            drawer,
            centerX - helmetWidth / 2,
            headY - headSize / 2,
            helmetWidth,
            helmetHeight,
            metalPalette,
            'top-left'
        );

        // T-shaped visor opening (proper cutout, not just black rectangles)
        const visorY = headY - 1;
        // Carve out horizontal slit (remove pixels to create opening)
        for (let x = centerX - helmetWidth / 2 + 1; x < centerX + helmetWidth / 2; x++) {
            drawer.setPixel(x, visorY, 0x000000); // Black interior
        }
        // Carve out vertical slit (center of T)
        drawer.setPixel(centerX, visorY + 1, 0x000000);
        drawer.setPixel(centerX, visorY + 2, 0x000000);

        // Eye glow: white core with yellow outer pixels (per spec)
        // White core (restrained and readable, not overpowering)
        drawer.setPixel(centerX - 2, visorY, 0xFFFFFF); // White core
        drawer.setPixel(centerX + 2, visorY, 0xFFFFFF); // White core
        // Yellow outer pixels (subtle glow)
        drawer.setPixel(centerX - 2, visorY - 1, 0xFFFF00); // Yellow outer
        drawer.setPixel(centerX + 2, visorY - 1, 0xFFFF00); // Yellow outer
    }

    /**
     * Draw sword
     */
    drawSword(drawer, x, y, length, metalColor) {
        // Longer, elegant sword angled upward diagonally (per spec)
        const bladeWidth = 2; // 2px blade width
        const bladeLength = length - 6; // Longer blade
        const hiltLength = 4;
        const guardWidth = 5; // Cross-guard (per spec)

        // Blade (longer, elegant, angled upward - per spec)
        // Draw blade with slight angle (upward diagonal)
        for (let i = 0; i < bladeLength; i++) {
            const offsetX = Math.floor(i * 0.15); // Slight diagonal angle upward
            const bladeX = x + offsetX;
            const bladeY = y + i;
            
            // Draw blade width (2px)
            drawer.setPixel(bladeX, bladeY, 0xD0D0D0); // Mid-tone silver
            drawer.setPixel(bladeX - 1, bladeY, 0xD0D0D0); // Second pixel for width
            
            // Blade highlight (subtle highlight down center per spec) - only on center pixel
            if (i % 2 === 0) { // Every other pixel for subtle highlight
                drawer.setPixel(bladeX, bladeY, 0xFFFFFF); // Highlight on center
            }
        }

        // Grip (per spec: sword includes visible grip)
        const gripColor = 0x8B4513; // Brown grip
        const gripX = x + Math.floor(bladeLength * 0.15); // Align with blade end
        drawer.drawRect(
            gripX - 1,
            y + bladeLength,
            2,
            hiltLength,
            gripColor
        );

        // Cross-guard (dark, T-shaped per spec)
        drawer.drawRect(
            gripX - guardWidth / 2,
            y + bladeLength,
            guardWidth,
            2,
            0x000000 // Dark cross-guard
        );
        // Vertical part of crossguard
        drawer.drawRect(
            gripX - 1,
            y + bladeLength - 1,
            2,
            2,
            0x000000
        );
    }

    /**
     * Draw holy light effects (eye glow)
     */
    drawHolyEffects(drawer, centerX, centerY, glowColor) {
        // Eyes are drawn in the helmet visor, so this is for additional glow effects
        // The main eye glow is handled in drawHelmet()
        // This can add subtle aura or additional effects if needed
    }

    /**
     * Darken a color by a factor (0-1)
     */
    darkenColor(color, factor) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        return (
            (Math.max(0, Math.round(r * (1 - factor))) << 16) |
            (Math.max(0, Math.round(g * (1 - factor))) << 8) |
            Math.max(0, Math.round(b * (1 - factor)))
        );
    }

    /**
     * Lighten a color by a factor (0-1)
     */
    lightenColor(color, factor) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        return (
            (Math.min(255, Math.round(r + (255 - r) * factor)) << 16) |
            (Math.min(255, Math.round(g + (255 - g) * factor)) << 8) |
            Math.min(255, Math.round(b + (255 - b) * factor))
        );
    }
}


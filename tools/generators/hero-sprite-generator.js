/**
 * Hero Sprite Generator (REDESIGNED - Enhanced Detail)
 * Generates 256x256 hero sprites with realistic proportions, proper cel shading, and class-specific details
 * Exports at 256x256 for larger hero display
 * 
 * Improvements over previous version:
 * - Proper 5-level cel shading using MaterialShader
 * - Distinct limbs with joints (arms, forearms, hands, thighs, shins, feet)
 * - Class-specific equipment and clothing
 * - Better facial features and expressions
 * - Selective outlining (selout) instead of pure black
 * - Improved shading with proper light source
 * - More personality and detail
 */

import { createCanvas } from 'canvas';
import { BaseGenerator } from './base-generator.js';
import { setupCanvasContext } from '../utils/canvas-utils.js';
import { PixelDrawer } from '../utils/pixel-drawer.js';
import { MaterialShader } from '../utils/material-shader.js';
import { PaletteManager } from '../utils/palette-manager.js';
import { clamp, hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, ensureVisibleFill, hexToRgbArray } from '../utils/color-utils.js';

// Hero sprite configuration with realistic proportions
const HERO_SPRITE_CONFIG = {
    design_size: 256,      // Design at high resolution for detail
    export_size: 256,      // Export at full size for 100% larger heroes
    proportions: {
        head_ratio: 0.14,    // 14% of height (realistic, not chibi) = ~36px
        torso_ratio: 0.28,   // 28% of height = ~72px
        leg_ratio: 0.36,     // 36% of height = ~92px
        arm_ratio: 0.22      // 22% of height = ~56px
    },
    shading: {
        levels: 5,           // Light2, Light1, Base, Dark1, Dark2
        style: 'cel',        // Cel shading with gradients
        light_source: { x: 0.3, y: -0.3 } // Top-left light
    },
    details: {
        facial_expressions: true,
        clothing_textures: true,
        armor_segmentation: true,
        subtle_gradients: true,
        selout: true          // Selective outlining
    }
};

// Class-specific equipment and appearance
const CLASS_STYLES = {
    paladin: {
        armorColor: '#C0C0C0',      // Silver
        clothColor: '#2C3E50',      // Dark blue-gray
        accentColor: '#4169E1',     // Royal blue
        hasHelmet: true,
        weapon: 'sword',
        armorStyle: 'plate'
    },
    warrior: {
        armorColor: '#8B4513',      // Brown leather
        clothColor: '#4A4A4A',      // Dark gray
        accentColor: '#A0522D',     // Sienna
        hasHelmet: false,
        weapon: 'axe',
        armorStyle: 'leather'
    },
    mage: {
        armorColor: '#1A237E',      // Dark blue
        clothColor: '#3949AB',      // Indigo
        accentColor: '#5C6BC0',     // Light indigo
        hasHelmet: false,
        weapon: 'staff',
        armorStyle: 'robe'
    },
    rogue: {
        armorColor: '#2C2C2C',      // Very dark gray
        clothColor: '#424242',      // Dark gray
        accentColor: '#616161',     // Medium gray
        hasHelmet: false,
        weapon: 'dagger',
        armorStyle: 'leather'
    },
    druid: {
        armorColor: '#2E7D32',      // Forest green
        clothColor: '#4CAF50',      // Green
        accentColor: '#66BB6A',     // Light green
        hasHelmet: false,
        weapon: 'staff',
        armorStyle: 'cloth'
    },
    priest: {
        armorColor: '#FFFFFF',      // White
        clothColor: '#F5F5F5',      // Off-white
        accentColor: '#FFD700',     // Gold accents
        hasHelmet: false,
        weapon: 'staff',
        armorStyle: 'robe'
    },
    warlock: {
        armorColor: '#4A148C',      // Deep purple
        clothColor: '#6A1B9A',      // Purple
        accentColor: '#9C27B0',     // Bright purple
        hasHelmet: false,
        weapon: 'staff',
        armorStyle: 'robe'
    },
    hunter: {
        armorColor: '#8B7355',      // Brown leather (mail-like)
        clothColor: '#6B8E23',      // Olive drab
        accentColor: '#9ACD32',     // Yellow-green
        hasHelmet: false,
        weapon: 'axe',              // Could also be bow/staff, but axe works for now
        armorStyle: 'leather'
    },
    shaman: {
        armorColor: '#4682B4',      // Steel blue (mail)
        clothColor: '#2F4F4F',      // Dark slate gray
        accentColor: '#00CED1',     // Dark turquoise
        hasHelmet: false,
        weapon: 'staff',
        armorStyle: 'robe'
    }
};

export class HeroSpriteGenerator extends BaseGenerator {
    constructor(config = {}) {
        super();
        this.config = { ...HERO_SPRITE_CONFIG, ...config };
        this.materialShader = new MaterialShader();
        this.paletteManager = new PaletteManager();
    }

    /**
     * Generate a hero sprite at design resolution (256x256)
     * @param {Object} heroData - Hero appearance data
     * @param {string} heroId - Hero identifier (used to determine class)
     * @returns {HTMLCanvasElement} Canvas with hero sprite
     */
    generate(heroData, heroId) {
        const size = this.config.design_size;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        setupCanvasContext(ctx, size);
        
        const drawer = new PixelDrawer(ctx, size, size);
        drawer.clear(0x00000000); // Transparent background

        const appearance = heroData?.appearance || {};
        const heroClass = appearance.class || heroId?.split('_')[0] || 'paladin';
        const classStyle = CLASS_STYLES[heroClass] || CLASS_STYLES.paladin;
        
        const proportions = this.config.proportions;
        const centerX = size / 2;

        // Calculate body parts positions and sizes (realistic proportions)
        const totalHeight = size * 0.85; // Use 85% of canvas height for body
        const headHeight = Math.round(totalHeight * proportions.head_ratio);      // ~36px
        const torsoHeight = Math.round(totalHeight * proportions.torso_ratio);    // ~72px
        const legHeight = Math.round(totalHeight * proportions.leg_ratio);        // ~92px
        const armLength = Math.round(totalHeight * proportions.arm_ratio);        // ~56px
        
        // Position calculations (bottom-aligned sprite)
        const groundY = size - 16; // Leave space at bottom for feet
        const legY = groundY - legHeight;
        const torsoY = legY - torsoHeight;
        const headY = torsoY - headHeight;
        
        // Colors
        const skinColor = ensureVisibleFill(appearance.skinColor || '#FFDBAC');
        const hairColor = appearance.hairColor || '#8B4513';
        const eyeColor = appearance.eyeColor || '#4A90E2';
        const armorColor = classStyle.armorColor;
        const clothColor = classStyle.clothColor;
        const accentColor = classStyle.accentColor;

        // Draw from bottom to top for proper layering
        // 1. Legs and feet
        this.drawLegsDetailed(ctx, drawer, centerX, legY, legHeight, skinColor, clothColor, classStyle);
        
        // 2. Torso base
        this.drawTorsoDetailed(ctx, drawer, centerX, torsoY, torsoHeight, skinColor, classStyle);
        
        // 3. Clothing/armor layers
        this.drawClothingDetailed(ctx, drawer, centerX, torsoY, torsoHeight, legY, legHeight, classStyle);
        
        // 4. Arms with hands
        this.drawArmsDetailed(ctx, drawer, centerX, torsoY, armLength, skinColor, classStyle);
        
        // 5. Head with features
        this.drawHeadDetailed(ctx, drawer, centerX, headY, headHeight, skinColor, hairColor, eyeColor, appearance, classStyle);
        
        // 6. Class-specific equipment (weapons, accessories)
        this.drawEquipment(ctx, drawer, centerX, torsoY, armLength, classStyle);
        
        // 7. Apply selective outlining (selout) instead of black outlines
        if (this.config.details.selout) {
            this.applySelectiveOutline(ctx, drawer, size);
        }

        return canvas;
    }

    /**
     * Draw detailed legs with thighs, shins, and feet
     * @private
     */
    drawLegsDetailed(ctx, drawer, centerX, y, height, skinColor, clothColor, classStyle) {
        const thighHeight = Math.round(height * 0.5);
        const shinHeight = Math.round(height * 0.4);
        const footHeight = Math.round(height * 0.1);
        const thighWidth = Math.round(height * 0.25);
        const shinWidth = Math.round(height * 0.2);
        const footWidth = Math.round(height * 0.3);
        
        const thighY = y;
        const shinY = thighY + thighHeight;
        const footY = shinY + shinHeight;
        
        // Generate cel-shade palette for skin (convert hex string to number)
        const skinColorNum = parseInt(skinColor.replace('#', ''), 16);
        const skinPalette = this.materialShader.generatePalette(skinColorNum, 'skin');
        
        // Left leg
        this.drawCelShadedRect(ctx, drawer, centerX - thighWidth - 8, thighY, thighWidth, thighHeight, skinPalette, 'left');
        this.drawCelShadedRect(ctx, drawer, centerX - shinWidth - 6, shinY, shinWidth, shinHeight, skinPalette, 'left');
        this.drawFoot(ctx, drawer, centerX - footWidth - 4, footY, footWidth, footHeight, skinPalette);
        
        // Right leg
        this.drawCelShadedRect(ctx, drawer, centerX + 8, thighY, thighWidth, thighHeight, skinPalette, 'right');
        this.drawCelShadedRect(ctx, drawer, centerX + 6, shinY, shinWidth, shinHeight, skinPalette, 'right');
        this.drawFoot(ctx, drawer, centerX + 4, footY, footWidth, footHeight, skinPalette);
        
        // Pants/leg armor if applicable
        if (classStyle.armorStyle === 'leather' || classStyle.armorStyle === 'plate') {
            const clothColorNum = parseInt(clothColor.replace('#', ''), 16);
            const pantsPalette = this.materialShader.generatePalette(clothColorNum, 'cloth');
            this.drawCelShadedRect(ctx, drawer, centerX - thighWidth - 7, thighY + 2, thighWidth - 2, thighHeight - 2, pantsPalette, 'left');
            this.drawCelShadedRect(ctx, drawer, centerX + 9, thighY + 2, thighWidth - 2, thighHeight - 2, pantsPalette, 'right');
        }
    }

    /**
     * Draw detailed torso with chest, waist, and proper shaping
     * @private
     */
    drawTorsoDetailed(ctx, drawer, centerX, y, height, skinColor, classStyle) {
        const chestWidth = Math.round(height * 0.65);
        const waistWidth = Math.round(height * 0.55);
        const chestHeight = Math.round(height * 0.5);
        const waistHeight = height - chestHeight;
        
        // Generate cel-shade palette for skin (convert hex string to number)
        const skinColorNum = parseInt(skinColor.replace('#', ''), 16);
        const skinPalette = this.materialShader.generatePalette(skinColorNum, 'skin');
        
        // Chest (top half, wider)
        this.drawCelShadedTrapezoid(ctx, drawer, centerX, y, chestWidth, chestHeight, skinPalette);
        
        // Waist (bottom half, narrower - tapers down)
        this.drawCelShadedTrapezoid(ctx, drawer, centerX, y + chestHeight, waistWidth, waistHeight, skinPalette, true);
        
        // Add subtle chest/pectoral lines for definition
        ctx.strokeStyle = darkenHex(skinColor, 0.15);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - chestWidth * 0.25, y + chestHeight * 0.3);
        ctx.lineTo(centerX - chestWidth * 0.1, y + chestHeight * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX + chestWidth * 0.25, y + chestHeight * 0.3);
        ctx.lineTo(centerX + chestWidth * 0.1, y + chestHeight * 0.5);
        ctx.stroke();
    }

    /**
     * Draw detailed arms with upper arm, forearm, and hands
     * @private
     */
    drawArmsDetailed(ctx, drawer, centerX, torsoY, length, skinColor, classStyle) {
        const upperArmLength = Math.round(length * 0.5);
        const forearmLength = Math.round(length * 0.4);
        const handLength = Math.round(length * 0.1);
        const upperArmWidth = Math.round(length * 0.3);
        const forearmWidth = Math.round(length * 0.25);
        
        const upperArmY = torsoY + 10;
        const forearmY = upperArmY + upperArmLength;
        const handY = forearmY + forearmLength;
        
        // Generate cel-shade palette for skin (convert hex string to number)
        const skinColorNum = parseInt(skinColor.replace('#', ''), 16);
        const skinPalette = this.materialShader.generatePalette(skinColorNum, 'skin');
        
        // Calculate arm positions based on torso width (not hardcoded)
        const torsoWidth = Math.round(length * 0.7); // Approximate torso width
        const leftArmX = centerX - torsoWidth / 2 - upperArmWidth / 2;
        const rightArmX = centerX + torsoWidth / 2 + upperArmWidth / 2;
        
        // Left arm (character's right, screen left)
        this.drawCelShadedRect(ctx, drawer, leftArmX, upperArmY, upperArmWidth, upperArmLength, skinPalette, 'left');
        this.drawCelShadedRect(ctx, drawer, leftArmX + 2, forearmY, forearmWidth, forearmLength, skinPalette, 'left');
        this.drawHand(ctx, drawer, leftArmX + 4, handY, forearmWidth, handLength, skinPalette, 'left');
        
        // Right arm (character's left, screen right)
        this.drawCelShadedRect(ctx, drawer, rightArmX - upperArmWidth, upperArmY, upperArmWidth, upperArmLength, skinPalette, 'right');
        this.drawCelShadedRect(ctx, drawer, rightArmX - forearmWidth - 2, forearmY, forearmWidth, forearmLength, skinPalette, 'right');
        this.drawHand(ctx, drawer, rightArmX - forearmWidth - 4, handY, forearmWidth, handLength, skinPalette, 'right');
    }

    /**
     * Draw detailed head with better facial features
     * @private
     */
    drawHeadDetailed(ctx, drawer, centerX, y, height, skinColor, hairColor, eyeColor, appearance, classStyle) {
        const width = Math.round(height * 0.75); // Head width (realistic proportions)
        
        // Generate cel-shade palette for skin (convert hex string to number)
        const skinColorNum = parseInt(skinColor.replace('#', ''), 16);
        const skinPalette = this.materialShader.generatePalette(skinColorNum, 'skin');
        
        // Head shape (more oval, less round) with cel shading
        this.drawCelShadedEllipse(ctx, drawer, centerX, y + height / 2, width / 2, height / 2, skinPalette);
        
        // Hair (if not wearing helmet)
        if (!classStyle.hasHelmet) {
            const hairColorNum = parseInt(hairColor.replace('#', ''), 16);
            const hairPalette = this.materialShader.generatePalette(hairColorNum, 'cloth');
            // Hair covers top 2/3 of head
            ctx.fillStyle = hairColor;
            ctx.beginPath();
            ctx.ellipse(centerX, y + height * 0.25, width / 2.2, height * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Hair shading (lighter highlight on top)
            ctx.fillStyle = lightenHex(hairColor, 0.2);
            ctx.beginPath();
            ctx.ellipse(centerX, y + height * 0.15, width / 2.5, height * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Hair texture (simple strands)
            ctx.strokeStyle = darkenHex(hairColor, 0.2);
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const offsetX = (i - 2) * (width / 8);
                ctx.beginPath();
                ctx.moveTo(centerX + offsetX, y + height * 0.25);
                ctx.lineTo(centerX + offsetX, y + height * 0.35);
                ctx.stroke();
            }
        } else {
            // Helmet
            this.drawHelmet(ctx, drawer, centerX, y, height, width, classStyle);
        }

        // Facial features (more detailed for 256px design)
        // Eyebrows
        ctx.fillStyle = darkenHex(hairColor, 0.3);
        ctx.fillRect(centerX - width * 0.25, y + height * 0.35, width * 0.15, 2);
        ctx.fillRect(centerX + width * 0.1, y + height * 0.35, width * 0.15, 2);
        
        // Eyes (larger, more expressive)
        const eyeSize = 8;
        const eyeY = y + height * 0.45;
        const eyeSpacing = width * 0.25;
        
        // Eye whites
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(centerX - eyeSpacing, eyeY, eyeSize / 2, eyeSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + eyeSpacing, eyeY, eyeSize / 2, eyeSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupils with highlight
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(centerX - eyeSpacing, eyeY, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + eyeSpacing, eyeY, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye highlight (small white dot)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX - eyeSpacing - 1, eyeY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + eyeSpacing - 1, eyeY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Nose (more defined)
        const noseY = y + height * 0.6;
        ctx.fillStyle = darkenHex(skinColor, 0.2);
        ctx.fillRect(centerX - 2, noseY, 4, 3);
        // Nose highlight
        ctx.fillStyle = lightenHex(skinColor, 0.15);
        ctx.fillRect(centerX - 1, noseY, 2, 1);

        // Mouth (with expression)
        const expression = appearance.expression || 'neutral';
        const mouthY = y + height * 0.7;
        ctx.fillStyle = '#8B0000';
        if (expression === 'smile') {
            // Smiling mouth (curved upward)
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, mouthY, 5, 0.2 * Math.PI, 0.8 * Math.PI, false);
            ctx.stroke();
        } else if (expression === 'frown') {
            // Frowning mouth (curved downward)
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, mouthY + 3, 5, 1.2 * Math.PI, 1.8 * Math.PI, false);
            ctx.stroke();
        } else {
            // Neutral line
            ctx.fillRect(centerX - 4, mouthY, 8, 2);
        }
        
        // Chin shadow (adds definition)
        ctx.fillStyle = darkenHex(skinColor, 0.25);
        ctx.beginPath();
        ctx.ellipse(centerX, y + height * 0.85, width * 0.25, height * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw detailed clothing/armor with proper segmentation and class styles
     * @private
     */
    drawClothingDetailed(ctx, drawer, centerX, torsoY, torsoHeight, legY, legHeight, classStyle) {
        const armorColor = classStyle.armorColor;
        const clothColor = classStyle.clothColor;
        const accentColor = classStyle.accentColor;
        const materialType = classStyle.armorStyle === 'plate' ? 'metal' : 
                            classStyle.armorStyle === 'leather' ? 'leather' : 'cloth';
        
        const baseColorHex = materialType === 'metal' ? armorColor : clothColor;
        const baseColorNum = parseInt(baseColorHex.replace('#', ''), 16);
        const clothingPalette = this.materialShader.generatePalette(baseColorNum, materialType);
        
        if (classStyle.armorStyle === 'plate') {
            // Plate armor with segmentation
            this.drawPlateArmor(ctx, drawer, centerX, torsoY, torsoHeight, clothingPalette, accentColor);
        } else if (classStyle.armorStyle === 'robe') {
            // Robe with flowing texture
            this.drawRobe(ctx, drawer, centerX, torsoY, torsoHeight, legY, legHeight, clothingPalette, accentColor);
        } else {
            // Leather/cloth armor
            this.drawLeatherArmor(ctx, drawer, centerX, torsoY, torsoHeight, clothingPalette, accentColor);
        }
    }

    /**
     * Draw plate armor with segmentation and details
     * @private
     */
    drawPlateArmor(ctx, drawer, centerX, torsoY, torsoHeight, palette, accentColor) {
        const chestWidth = Math.round(torsoHeight * 0.6);
        const plateHeight = Math.round(torsoHeight / 3);
        
        // Draw 3 segmented plates
        for (let i = 0; i < 3; i++) {
            const plateY = torsoY + i * plateHeight;
            this.drawCelShadedRect(ctx, drawer, centerX - chestWidth / 2, plateY, chestWidth, plateHeight - 2, palette, 'center');
            
            // Plate separation lines
            if (i < 2) {
                ctx.strokeStyle = darkenHex(palette.base, 0.3);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(centerX - chestWidth / 2, plateY + plateHeight - 2);
                ctx.lineTo(centerX + chestWidth / 2, plateY + plateHeight - 2);
                ctx.stroke();
            }
            
            // Chest plate emblem/decoration (top plate only)
            if (i === 0) {
                ctx.fillStyle = accentColor;
                ctx.beginPath();
                ctx.ellipse(centerX, plateY + plateHeight / 2, chestWidth * 0.15, chestWidth * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Shoulder pads
        const shoulderPadSize = plateHeight * 0.6;
        this.drawShoulderPad(ctx, drawer, centerX - chestWidth / 2 - 5, torsoY, shoulderPadSize, palette, accentColor, 'left');
        this.drawShoulderPad(ctx, drawer, centerX + chestWidth / 2 + 5, torsoY, shoulderPadSize, palette, accentColor, 'right');
    }

    /**
     * Draw robe with flowing texture
     * @private
     */
    drawRobe(ctx, drawer, centerX, torsoY, torsoHeight, legY, legHeight, palette, accentColor) {
        const robeWidth = Math.round(torsoHeight * 0.7);
        const robeHeight = torsoHeight + legHeight * 0.5; // Robe extends partway down legs
        
        // Main robe body
        this.drawCelShadedTrapezoid(ctx, drawer, centerX, torsoY, robeWidth, robeHeight, palette, false);
        
        // Robe texture (vertical folds)
        ctx.strokeStyle = darkenHex(palette.base, 0.2);
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const foldX = centerX - robeWidth / 2 + (i * robeWidth / 4);
            ctx.beginPath();
            ctx.moveTo(foldX, torsoY);
            ctx.lineTo(foldX, torsoY + robeHeight);
            ctx.stroke();
        }
        
        // Belt/sash
        ctx.fillStyle = accentColor;
        const beltY = torsoY + torsoHeight * 0.7;
        ctx.fillRect(centerX - robeWidth * 0.4, beltY, robeWidth * 0.8, 4);
    }

    /**
     * Draw leather armor
     * @private
     */
    drawLeatherArmor(ctx, drawer, centerX, torsoY, torsoHeight, palette, accentColor) {
        const chestWidth = Math.round(torsoHeight * 0.55);
        
        // Chest piece
        this.drawCelShadedRect(ctx, drawer, centerX - chestWidth / 2, torsoY, chestWidth, torsoHeight * 0.6, palette, 'center');
        
        // Leather texture (cross-hatching pattern)
        ctx.strokeStyle = darkenHex(palette.base, 0.15);
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const y = torsoY + (i * torsoHeight / 3);
            ctx.beginPath();
            ctx.moveTo(centerX - chestWidth / 2, y);
            ctx.lineTo(centerX + chestWidth / 2, y);
            ctx.stroke();
        }
        
        // Leather straps/buckles
        ctx.fillStyle = accentColor;
        ctx.fillRect(centerX - chestWidth / 2 + 4, torsoY + 8, chestWidth - 8, 2);
        ctx.fillRect(centerX - chestWidth / 2 + 4, torsoY + 16, chestWidth - 8, 2);
    }

    /**
     * Draw class-specific equipment (weapons, accessories)
     * @private
     */
    drawEquipment(ctx, drawer, centerX, torsoY, armLength, classStyle) {
        const weaponType = classStyle.weapon;
        const handY = torsoY + armLength;
        
        // Calculate weapon position based on arm position (right hand side)
        const torsoWidth = Math.round(armLength * 0.7); // Approximate torso width
        const rightHandX = centerX + torsoWidth / 2 + Math.round(armLength * 0.3) / 2 + 4;
        const leftHandX = centerX - torsoWidth / 2 - Math.round(armLength * 0.3) / 2 - 4;
        
        if (weaponType === 'sword') {
            this.drawSword(ctx, drawer, rightHandX, handY - 10, armLength * 0.9, classStyle);
        } else if (weaponType === 'staff') {
            this.drawStaff(ctx, drawer, leftHandX, handY - 10, armLength * 1.5, classStyle);
        } else if (weaponType === 'axe') {
            this.drawAxe(ctx, drawer, rightHandX, handY - 8, armLength * 0.8, classStyle);
        } else if (weaponType === 'dagger') {
            this.drawDagger(ctx, drawer, rightHandX, handY - 5, armLength * 0.6, classStyle);
        }
    }

    /**
     * Draw sword weapon
     * @private
     */
    drawSword(ctx, drawer, x, y, length, classStyle) {
        // Convert palette colors (numbers) to hex strings for canvas
        const toHex = (num) => {
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        const bladeWidth = 3;
        const handleLength = Math.round(length * 0.3);
        
        // Blade (silver/steel)
        const bladePalette = this.materialShader.generatePalette(0xC0C0C0, 'metal');
        this.drawCelShadedRect(ctx, drawer, x - bladeWidth / 2, y - length, bladeWidth, length - handleLength, bladePalette, 'center');
        
        // Blade tip
        ctx.fillStyle = toHex(bladePalette.light1);
        ctx.beginPath();
        ctx.moveTo(x - bladeWidth / 2, y - length);
        ctx.lineTo(x + bladeWidth / 2, y - length);
        ctx.lineTo(x, y - length - 4);
        ctx.closePath();
        ctx.fill();
        
        // Crossguard
        ctx.fillStyle = classStyle.accentColor;
        ctx.fillRect(x - 6, y - handleLength, 12, 3);
        
        // Handle
        const handlePalette = this.materialShader.generatePalette(0x8B4513, 'leather');
        this.drawCelShadedRect(ctx, drawer, x - 2, y - handleLength, 4, handleLength, handlePalette, 'center');
        
        // Pommel
        ctx.fillStyle = classStyle.accentColor;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw staff weapon
     * @private
     */
    drawStaff(ctx, drawer, x, y, length, classStyle) {
        const staffWidth = 2;
        
        // Staff shaft (wood/bone)
        const woodPalette = this.materialShader.generatePalette(0x8B4513, 'leather');
        this.drawCelShadedRect(ctx, drawer, x - staffWidth / 2, y - length, staffWidth, length, woodPalette, 'center');
        
        // Staff orb/crystal (top)
        const orbSize = 8;
        const accentColorNum = parseInt(classStyle.accentColor.replace('#', ''), 16);
        const orbPalette = this.materialShader.generatePalette(accentColorNum, 'metal');
        this.drawCelShadedEllipse(ctx, drawer, x, y - length, orbSize / 2, orbSize / 2, orbPalette);
        
        // Orb glow effect
        ctx.fillStyle = lightenHex(classStyle.accentColor, 0.4);
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(x, y - length, orbSize / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw axe weapon
     * @private
     */
    drawAxe(ctx, drawer, x, y, length, classStyle) {
        // Convert palette colors (numbers) to hex strings for canvas
        const toHex = (num) => {
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        const handleLength = length * 0.7;
        const axeHeadSize = length * 0.3;
        
        // Handle
        const handlePalette = this.materialShader.generatePalette(0x8B4513, 'leather');
        this.drawCelShadedRect(ctx, drawer, x - 2, y - handleLength, 4, handleLength, handlePalette, 'center');
        
        // Axe head (metal)
        const metalPalette = this.materialShader.generatePalette(0xA0A0A0, 'metal');
        ctx.fillStyle = toHex(metalPalette.base);
        ctx.beginPath();
        ctx.moveTo(x - axeHeadSize, y - handleLength);
        ctx.lineTo(x + axeHeadSize, y - handleLength);
        ctx.lineTo(x + axeHeadSize * 0.3, y - handleLength - axeHeadSize);
        ctx.lineTo(x - axeHeadSize * 0.3, y - handleLength - axeHeadSize);
        ctx.closePath();
        ctx.fill();
        
        // Axe edge highlight
        ctx.fillStyle = toHex(metalPalette.light1);
        ctx.fillRect(x - axeHeadSize * 0.3, y - handleLength - axeHeadSize, axeHeadSize * 0.6, 2);
    }

    /**
     * Draw dagger weapon
     * @private
     */
    drawDagger(ctx, drawer, x, y, length, classStyle) {
        const bladeWidth = 2;
        const bladeLength = length * 0.7;
        const handleLength = length * 0.3;
        
        // Blade (dark steel)
        const bladePalette = this.materialShader.generatePalette(0x404040, 'metal');
        this.drawCelShadedRect(ctx, drawer, x - bladeWidth / 2, y - bladeLength, bladeWidth, bladeLength, bladePalette, 'center');
        
        // Handle (wrapped)
        const handlePalette = this.materialShader.generatePalette(0x2C2C2C, 'leather');
        this.drawCelShadedRect(ctx, drawer, x - 2, y - handleLength, 4, handleLength, handlePalette, 'center');
        
        // Handle wrap texture
        ctx.strokeStyle = darkenHex(handlePalette.base, 0.2);
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x - 2, y - handleLength + (i * handleLength / 3));
            ctx.lineTo(x + 2, y - handleLength + (i * handleLength / 3));
            ctx.stroke();
        }
    }

    /**
     * Draw helmet
     * @private
     */
    drawHelmet(ctx, drawer, centerX, headY, headHeight, headWidth, classStyle) {
        const armorColorNum = parseInt(classStyle.armorColor.replace('#', ''), 16);
        const helmetPalette = this.materialShader.generatePalette(armorColorNum, 'metal');
        
        // Helmet base (covers most of head)
        this.drawCelShadedEllipse(ctx, drawer, centerX, headY + headHeight * 0.3, headWidth / 2.2, headHeight * 0.5, helmetPalette);
        
        // Visor (horizontal slit)
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX - headWidth * 0.3, headY + headHeight * 0.45, headWidth * 0.6, 2);
        
        // Helmet crest/plume (optional, for paladins)
        if (classStyle.accentColor) {
            ctx.fillStyle = classStyle.accentColor;
            ctx.fillRect(centerX - 2, headY - 4, 4, 8);
        }
    }

    /**
     * Draw shoulder pad
     * @private
     */
    drawShoulderPad(ctx, drawer, x, y, size, palette, accentColor, side) {
        // Rounded shoulder pad
        ctx.fillStyle = palette.base;
        ctx.beginPath();
        ctx.ellipse(x, y, size / 2, size / 2, side === 'left' ? -0.3 : 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = palette.light1;
        ctx.beginPath();
        ctx.ellipse(x - size * 0.15, y - size * 0.15, size * 0.3, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Accent stripe
        ctx.fillStyle = accentColor;
        ctx.fillRect(x - size * 0.2, y, size * 0.4, 2);
    }

    /**
     * Draw foot
     * @private
     */
    drawFoot(ctx, drawer, x, y, width, height, palette) {
        // Convert palette colors (numbers) to hex strings for canvas
        const toHex = (num) => {
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        // Foot shape (rounded rectangle, wider at front)
        ctx.fillStyle = toHex(palette.base);
        ctx.beginPath();
        ctx.ellipse(Math.round(x + width / 2), Math.round(y), Math.round(width / 2), Math.round(height / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Foot shading
        ctx.fillStyle = toHex(palette.dark1);
        ctx.fillRect(Math.round(x), Math.round(y + height / 2), Math.round(width), Math.round(height / 2));
    }

    /**
     * Draw hand
     * @private
     */
    drawHand(ctx, drawer, x, y, width, height, palette, side) {
        // Convert palette colors (numbers) to hex strings for canvas
        const toHex = (num) => {
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        // Hand shape (rounded, wider at knuckles)
        const handWidth = Math.round(width * 1.2);
        ctx.fillStyle = toHex(palette.base);
        ctx.beginPath();
        ctx.ellipse(Math.round(x + handWidth / 2), Math.round(y), Math.round(handWidth / 2), Math.round(height / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Fingers (simple representation)
        ctx.fillStyle = toHex(palette.dark1);
        for (let i = 0; i < 4; i++) {
            const fingerX = Math.round(x + (i * handWidth / 5));
            ctx.fillRect(fingerX, Math.round(y - height / 2), 2, Math.round(height));
        }
    }

    /**
     * Draw cel-shaded rectangle with proper shading
     * @private
     */
    drawCelShadedRect(ctx, drawer, x, y, width, height, palette, lightSide = 'center') {
        // Convert palette colors (numbers) to hex strings for canvas
        const toHex = (num) => {
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        // Simplified cel shading - divide into regions
        // Top-left: light2, top: light1, center: base, bottom: dark1, bottom-right: dark2
        
        const thirdW = Math.round(width / 3);
        const thirdH = Math.round(height / 3);
        
        // Top-left corner (brightest)
        ctx.fillStyle = toHex(palette.light2);
        ctx.fillRect(Math.round(x), Math.round(y), thirdW, thirdH);
        
        // Top region (light)
        ctx.fillStyle = toHex(palette.light1);
        ctx.fillRect(Math.round(x + thirdW), Math.round(y), thirdW, thirdH);
        
        // Center region (base)
        ctx.fillStyle = toHex(palette.base);
        ctx.fillRect(Math.round(x), Math.round(y + thirdH), Math.round(width), thirdH);
        
        // Bottom-left region (dark)
        ctx.fillStyle = toHex(palette.dark1);
        ctx.fillRect(Math.round(x), Math.round(y + thirdH * 2), thirdW, thirdH);
        
        // Bottom-right corner (darkest)
        ctx.fillStyle = toHex(palette.dark2);
        ctx.fillRect(Math.round(x + thirdW * 2), Math.round(y + thirdH * 2), thirdW, thirdH);
        
        // Right side (intermediate shading)
        ctx.fillStyle = toHex(palette.dark1);
        ctx.fillRect(Math.round(x + thirdW * 2), Math.round(y + thirdH), thirdW, thirdH);
    }

    /**
     * Draw cel-shaded ellipse
     * @private
     */
    drawCelShadedEllipse(ctx, drawer, centerX, centerY, radiusX, radiusY, palette) {
        // Convert palette colors (numbers) to hex strings for canvas
        const toHex = (num) => {
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        // Create gradient for smooth shading
        const gradient = ctx.createRadialGradient(
            centerX - radiusX * 0.3, centerY - radiusY * 0.3, 0,
            centerX, centerY, Math.max(radiusX, radiusY)
        );
        
        gradient.addColorStop(0, toHex(palette.light2));
        gradient.addColorStop(0.3, toHex(palette.light1));
        gradient.addColorStop(0.5, toHex(palette.base));
        gradient.addColorStop(0.7, toHex(palette.dark1));
        gradient.addColorStop(1, toHex(palette.dark2));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(Math.round(centerX), Math.round(centerY), Math.round(radiusX), Math.round(radiusY), 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw cel-shaded trapezoid (for torso/robe tapering)
     * @private
     */
    drawCelShadedTrapezoid(ctx, drawer, centerX, y, topWidth, height, palette, taperDown = false) {
        // Convert palette colors (numbers) to hex strings for canvas
        const toHex = (num) => {
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        
        const bottomWidth = taperDown ? topWidth * 0.85 : topWidth * 0.95;
        
        // Create path for trapezoid
        ctx.beginPath();
        ctx.moveTo(Math.round(centerX - topWidth / 2), Math.round(y));
        ctx.lineTo(Math.round(centerX + topWidth / 2), Math.round(y));
        ctx.lineTo(Math.round(centerX + bottomWidth / 2), Math.round(y + height));
        ctx.lineTo(Math.round(centerX - bottomWidth / 2), Math.round(y + height));
        ctx.closePath();
        
        // Fill with gradient for shading
        const gradient = ctx.createLinearGradient(
            Math.round(centerX - topWidth / 2), Math.round(y),
            Math.round(centerX + topWidth / 2), Math.round(y + height)
        );
        
        gradient.addColorStop(0, toHex(palette.light1));
        gradient.addColorStop(0.5, toHex(palette.base));
        gradient.addColorStop(1, toHex(palette.dark1));
        
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    /**
     * Apply selective outlining (selout) - use darker shades instead of pure black
     * Simplified version for performance - only adds outline to transparent edges
     * @private
     */
    applySelectiveOutline(ctx, drawer, size) {
        // Get image data
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);
        
        // For each pixel, check if it's on an edge (adjacent to transparent)
        // Only add outline if neighbor is transparent (performance optimization)
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                const idx = (y * size + x) * 4;
                const alpha = data[idx + 3];
                
                if (alpha > 0) {
                    // Check 4 neighbors for transparency
                    const checkNeighbor = (nx, ny) => {
                        if (nx < 0 || nx >= size || ny < 0 || ny >= size) return false;
                        const nIdx = (ny * size + nx) * 4;
                        return data[nIdx + 3] === 0; // Transparent
                    };
                    
                    // If any neighbor is transparent, add darker outline pixel
                    if (checkNeighbor(x - 1, y)) {
                        const nIdx = (y * size + (x - 1)) * 4;
                        newData[nIdx] = Math.max(0, data[idx] * 0.5);
                        newData[nIdx + 1] = Math.max(0, data[idx + 1] * 0.5);
                        newData[nIdx + 2] = Math.max(0, data[idx + 2] * 0.5);
                        newData[nIdx + 3] = 200;
                    }
                    if (checkNeighbor(x + 1, y)) {
                        const nIdx = (y * size + (x + 1)) * 4;
                        newData[nIdx] = Math.max(0, data[idx] * 0.5);
                        newData[nIdx + 1] = Math.max(0, data[idx + 1] * 0.5);
                        newData[nIdx + 2] = Math.max(0, data[idx + 2] * 0.5);
                        newData[nIdx + 3] = 200;
                    }
                    if (checkNeighbor(x, y - 1)) {
                        const nIdx = ((y - 1) * size + x) * 4;
                        newData[nIdx] = Math.max(0, data[idx] * 0.5);
                        newData[nIdx + 1] = Math.max(0, data[idx + 1] * 0.5);
                        newData[nIdx + 2] = Math.max(0, data[idx + 2] * 0.5);
                        newData[nIdx + 3] = 200;
                    }
                    if (checkNeighbor(x, y + 1)) {
                        const nIdx = ((y + 1) * size + x) * 4;
                        newData[nIdx] = Math.max(0, data[idx] * 0.5);
                        newData[nIdx + 1] = Math.max(0, data[idx + 1] * 0.5);
                        newData[nIdx + 2] = Math.max(0, data[idx + 2] * 0.5);
                        newData[nIdx + 3] = 200;
                    }
                }
            }
        }
        
        // Create new ImageData using canvas context (Node.js canvas compatibility)
        const newImageData = ctx.createImageData(size, size);
        newImageData.data.set(newData);
        ctx.putImageData(newImageData, 0, 0);
    }

    /**
     * Export sprite at runtime resolution (256x256)
     * @param {HTMLCanvasElement} designCanvas - Canvas at design resolution (256x256)
     * @returns {HTMLCanvasElement} Canvas at export resolution (256x256)
     */
    exportSprite(designCanvas) {
        const exportSize = this.config.export_size;
        const exportCanvas = createCanvas(exportSize, exportSize);
        const exportCtx = exportCanvas.getContext('2d');
        
        // Use nearest-neighbor scaling for pixel-perfect downscale
        exportCtx.imageSmoothingEnabled = false;
        exportCtx.drawImage(designCanvas, 0, 0, exportSize, exportSize);
        
        return exportCanvas;
    }

    /**
     * Generate animation frame for a specific animation and direction
     * @param {string} animation - Animation name (idle, walk, attack, cast, hurt, death, victory)
     * @param {string} direction - Direction (front, back, side)
     * @param {number} frame - Frame number (0-based)
     * @param {Object} heroData - Hero appearance data
     * @param {string} heroId - Hero identifier
     * @returns {HTMLCanvasElement} Canvas with animation frame
     */
    generateAnimationFrame(animation, direction, frame, heroData, heroId) {
        // Generate base sprite first
        const baseCanvas = this.generate(heroData, heroId);
        const ctx = baseCanvas.getContext('2d');
        
        // Animation-specific modifications
        // For now, return base sprite - full animation implementation would modify body part positions
        // Example: walk animation would adjust leg positions based on frame
        
        return baseCanvas;
    }
}

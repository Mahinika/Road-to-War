/**
 * Equipment Sprite Generator
 * Generates full-size equipment sprites (128x128) for layering on hero sprites
 * Unlike ItemIconGenerator (48x48 icons), this creates actual equipment overlays
 */

import { createCanvas } from 'canvas';
import { BaseGenerator } from './base-generator.js';
import { setupCanvasContext } from '../utils/canvas-utils.js';
import { EquipmentGenerator } from './equipment-generator.js';

const RARITY_COLORS = {
    common: { base: '#C0C0C0', accent: '#FFFFFF' },
    uncommon: { base: '#1EFF00', accent: '#FFFFFF' },
    rare: { base: '#0070DD', accent: '#88CCFF' },
    epic: { base: '#A335EE', accent: '#FF88FF' },
    legendary: { base: '#FF8000', accent: '#FFFF00' }
};

export class EquipmentSpriteGenerator extends BaseGenerator {
    constructor(config = {}) {
        super();
        this.config = {
            size: config.size || 256, // Match hero sprite size for anatomical overlay
            ...config
        };
        this.equipmentGenerator = new EquipmentGenerator(
            createCanvas(this.config.size, this.config.size),
            null,
            'metallic'
        );
    }

    /**
     * Generate a full-size equipment sprite
     * @param {Object} itemData - Item data from items.json
     * @param {string} itemId - Item identifier
     * @returns {HTMLCanvasElement} Canvas with equipment sprite
     */
    generate(itemData, itemId) {
        const size = this.config.size;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const { centerX, centerY } = setupCanvasContext(ctx, size);

        const itemType = itemData.type || 'weapon';
        const rarity = itemData.rarity || 'common';

        // Clear canvas with transparency
        ctx.clearRect(0, 0, size, size);

        // Generate equipment based on type and slot
        this._generateEquipmentSprite(ctx, centerX, centerY, size, itemData, itemId);

        return canvas;
    }

    /**
     * Generate the actual equipment sprite content
     * Equipment is positioned in anatomical locations on 256x256 canvas to overlay hero
     */
    _generateEquipmentSprite(ctx, centerX, centerY, size, itemData, itemId) {
        const slot = itemData.slot || '';
        const itemType = itemData.type || 'weapon';
        const weaponType = itemData.weapon_type || '';

        // Position equipment in correct anatomical locations for 256x256 hero overlay
        let x = centerX;
        let y = centerY;

        // Position equipment anatomically within 256x256 sprite for perfect overlay
        // Equipment overlays at (0,0) so content must align with hero anatomy
        // Convert from hero-relative positions to sprite-relative positions

        switch (slot) {
            case 'weapon':
                x = 128 + 48; // Hero center (128) + right hand offset (48)
                y = 128 - 16; // Hero center (128) - hand level offset (16)
                break;
            case 'offhand':
            case 'shield':
                x = 128 - 48; // Hero center (128) - left hand offset (48)
                y = 128 - 16; // Hero center (128) - hand level offset (16)
                break;
            case 'chest':
                x = 128; // Hero center
                y = 128 + 32; // Hero center + chest offset down
                break;
            case 'head':
            case 'helmet':
                x = 128; // Hero center
                y = 128 - 80; // Hero center - head offset up
                break;
            case 'legs':
                x = 128; // Hero center
                y = 128 + 64; // Hero center + leg offset down
                break;
            case 'shoulder':
                x = 128; // Hero center
                y = 128 + 16; // Hero center + shoulder offset down
                break;
            case 'neck':
            case 'amulet':
                x = 128; // Hero center
                y = 128 - 32; // Hero center - neck offset up
                break;
            case 'ring':
            case 'ring1':
            case 'ring2':
                x = 128 + 32; // Hero center + right hip offset
                y = 128 + 8; // Hero center + hip level
                break;
            case 'trinket':
            case 'trinket1':
            case 'trinket2':
                x = 128 - 32; // Hero center - left hip offset
                y = 128 + 8; // Hero center + hip level
                break;
        }

        // Scale equipment to fit anatomical area proportionally
        let scale = 1.0;

        switch (slot) {
            case 'weapon':
            case 'offhand':
            case 'shield':
                scale = 1.5; // Weapons need to be visible
                break;
            case 'chest':
                scale = 2.0; // Chest armor covers body area
                break;
            case 'head':
            case 'helmet':
                scale = 1.5; // Helmets cover head area
                break;
            case 'legs':
                scale = 1.8; // Leg armor covers leg area
                break;
            case 'shoulder':
                scale = 1.2; // Shoulders are smaller
                break;
            case 'neck':
            case 'amulet':
                scale = 0.8; // Amulets are smaller accessories
                break;
            case 'ring':
            case 'ring1':
            case 'ring2':
            case 'trinket':
            case 'trinket1':
            case 'trinket2':
                scale = 0.6; // Jewelry is small
                break;
        }

        // Apply centering and scaling for layered sprite approach
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Generate equipment using the existing EquipmentGenerator
        this._drawEquipment(ctx, itemData, itemId, 0, 0);

        ctx.restore();
    }

    /**
     * Draw equipment using the EquipmentGenerator
     */
    _drawEquipment(ctx, itemData, itemId, offsetX, offsetY) {
        const tempCanvas = createCanvas(64, 64);
        const tempCtx = tempCanvas.getContext('2d');

        // Create a temporary EquipmentGenerator instance
        const tempGenerator = new EquipmentGenerator(tempCanvas, null, 'metallic');

        // Generate the equipment on the temp canvas
        this._generateEquipmentOnCanvas(tempCtx, itemData, itemId);

        // Draw the temp canvas onto our main canvas
        ctx.drawImage(tempCanvas, offsetX, offsetY);
    }

    /**
     * Generate equipment on a canvas using EquipmentGenerator methods
     */
    _generateEquipmentOnCanvas(ctx, itemData, itemId) {
        const slot = itemData.slot || '';
        const itemType = itemData.type || 'weapon';
        const weaponType = itemData.weapon_type || '';

        const centerX = 32;
        const centerY = 32;
        const size = 64;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Generate based on item type
        if (itemType === 'weapon') {
            if (weaponType === 'sword' || !weaponType) {
                this.equipmentGenerator.drawSword(centerX + 8, centerY, 24, 0xC0C0C0);
            } else if (weaponType === 'staff' || weaponType === 'wand') {
                this.equipmentGenerator.drawStaff(centerX, centerY, 28, 0x8B4513);
            } else if (weaponType === 'shield') {
                this.equipmentGenerator.drawShield(centerX, centerY, 16, 0x8B7355);
            }
        } else if (itemType === 'armor') {
            if (slot === 'chest') {
                this.equipmentGenerator.drawChestArmor(centerX, centerY, 20, 24, 0x8B7355);
            } else if (slot === 'head' || slot === 'helmet') {
                this.equipmentGenerator.drawHelmet(centerX, centerY - 8, 12, 0x8B7355);
            } else if (slot === 'legs') {
                // Simple leg armor representation
                ctx.fillStyle = '#8B7355';
                ctx.fillRect(centerX - 6, centerY - 8, 12, 16);
                ctx.fillRect(centerX - 10, centerY - 8, 20, 6);
            }
        } else if (itemType === 'accessory') {
            if (slot === 'neck' || slot === 'amulet') {
                // Simple amulet
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(centerX - 2, centerY - 6, 4, 8);
                ctx.beginPath();
                ctx.arc(centerX, centerY + 2, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (slot.startsWith('ring')) {
                // Simple ring
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
                ctx.stroke();
            } else if (slot.startsWith('trinket')) {
                // Simple trinket
                ctx.fillStyle = '#9370DB';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
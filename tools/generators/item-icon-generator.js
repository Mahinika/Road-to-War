/**
 * Item Icon Generator
 * Generates item icons with rarity-based coloring
 * Extracted from generate-all-assets.js
 */

import { createCanvas, loadImage } from 'canvas';
import { BaseGenerator } from './base-generator.js';
import { setupCanvasContext, drawIconPlate, resolveResPathToDisk, isMeaningfulTexture } from '../utils/canvas-utils.js';

const RARITY_COLORS = {
    common: { base: '#C0C0C0', accent: '#FFFFFF' },
    uncommon: { base: '#1EFF00', accent: '#FFFFFF' },
    rare: { base: '#0070DD', accent: '#88CCFF' },
    epic: { base: '#A335EE', accent: '#FF88FF' },
    legendary: { base: '#FF8000', accent: '#FFFF00' }
};

export class ItemIconGenerator extends BaseGenerator {
    constructor(config = {}) {
        super();
        this.config = {
            size: config.size || 48,
            ...config
        };
    }

    /**
     * Generate an item icon
     * @param {Object} itemData - Item data from items.json
     * @param {string} itemId - Item identifier
     * @param {Object} options - Options { texturePath, canUseTexture }
     * @returns {Promise<HTMLCanvasElement>} Canvas with item icon
     */
    async generate(itemData, itemId, options = {}) {
        const size = this.config.size;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const { centerX, centerY } = setupCanvasContext(ctx, size);
        
        const itemType = itemData.type || 'weapon';
        const rarity = itemData.rarity || 'common';
        const weaponType = itemData.weapon_type || '';
        
        const colors = RARITY_COLORS[rarity] || RARITY_COLORS.common;
        
        // Background plate + rarity rim (keeps silhouette readable)
        drawIconPlate(ctx, size, colors.base);
        
        // Try to use existing texture if available
        if (options.canUseTexture && options.texturePath) {
            try {
                const img = await loadImage(options.texturePath);
                ctx.imageSmoothingEnabled = false;
                const pad = 6;
                const maxW = size - pad * 2;
                const maxH = size - pad * 2;
                const scale = Math.min(maxW / img.width, maxH / img.height);
                const w = Math.max(1, Math.floor(img.width * scale));
                const h = Math.max(1, Math.floor(img.height * scale));
                const x = Math.floor((size - w) / 2);
                const y = Math.floor((size - h) / 2);
                ctx.drawImage(img, x, y, w, h);
                return canvas; // Return early if texture was loaded
            } catch (error) {
                // Fall through to procedural generation if texture load fails
                console.warn(`Failed to load texture for ${itemId}:`, error.message);
            }
        }
        
        if (itemType === 'weapon') {
            const weaponLength = size * 0.7;
            
            if (weaponType === 'sword' || !weaponType) {
                // sword silhouette
                ctx.fillStyle = '#e2e2e2';
                ctx.fillRect(centerX - 2, centerY - weaponLength/2, 4, weaponLength * 0.7);
                // tip
                ctx.beginPath();
                ctx.moveTo(centerX - 2, centerY - weaponLength / 2);
                ctx.lineTo(centerX + 2, centerY - weaponLength / 2);
                ctx.lineTo(centerX, centerY - weaponLength / 2 - 6);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX - 3, centerY + weaponLength * 0.15, 6, weaponLength * 0.25);
                ctx.fillStyle = colors.accent;
                ctx.fillRect(centerX - 10, centerY + weaponLength * 0.12, 20, 3);
                // pommel gem for higher rarities
                if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
                    ctx.fillStyle = colors.base;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY + weaponLength * 0.40, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            } else if (weaponType === 'axe') {
                ctx.fillStyle = '#e2e2e2';
                ctx.fillRect(centerX - 2, centerY - weaponLength/2, 4, weaponLength * 0.7);
                ctx.fillStyle = colors.accent;
                ctx.fillRect(centerX - 8, centerY - weaponLength/2 - 4, 16, 4);
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX - 3, centerY + weaponLength * 0.15, 6, weaponLength * 0.25);
                // outline
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(centerX - 2, centerY - weaponLength/2, 4, weaponLength * 0.7);
            } else if (weaponType === 'mace') {
                ctx.fillStyle = '#e2e2e2';
                ctx.fillRect(centerX - 3, centerY - weaponLength/2, 6, weaponLength * 0.5);
                ctx.beginPath();
                ctx.arc(centerX, centerY - weaponLength/2, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX - 3, centerY + weaponLength * 0.15, 6, weaponLength * 0.25);
                // outline
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(centerX - 3, centerY - weaponLength/2, 6, weaponLength * 0.5);
                ctx.beginPath();
                ctx.arc(centerX, centerY - weaponLength/2, 6, 0, Math.PI * 2);
                ctx.stroke();
            } else if (weaponType === 'staff' || weaponType === 'wand') {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX - 1, centerY - weaponLength/2, 2, weaponLength);
                ctx.fillStyle = colors.base;
                ctx.beginPath();
                ctx.arc(centerX, centerY - weaponLength/2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = colors.accent;
                ctx.beginPath();
                ctx.arc(centerX, centerY - weaponLength/2, 2, 0, Math.PI * 2);
                ctx.fill();
                // outline
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(centerX - 1, centerY - weaponLength/2, 2, weaponLength);
                ctx.beginPath();
                ctx.arc(centerX, centerY - weaponLength/2, 4, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // outline for sword
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(centerX - 2, centerY - weaponLength/2, 4, weaponLength * 0.7);
            }
        } else if (itemType === 'armor') {
            const armorWidth = size * 0.6;
            const armorHeight = size * 0.7;
            ctx.fillStyle = '#cfcfcf';
            ctx.fillRect(centerX - armorWidth/2, centerY - armorHeight/2, armorWidth, armorHeight);
            ctx.fillStyle = colors.accent;
            ctx.fillRect(centerX - armorWidth/2, centerY - armorHeight/2, armorWidth, 4);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - armorWidth/2, centerY - armorHeight/2, armorWidth, armorHeight);
        } else {
            // accessories
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size * 0.22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size * 0.18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(centerX + size * 0.12, centerY - size * 0.10, size * 0.05, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return canvas;
    }
}

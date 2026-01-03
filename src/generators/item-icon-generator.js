/**
 * Item Icon Generator - Generates procedural item icons
 * Creates unique icons for weapons, armor, and accessories based on item data
 */

import { ColorUtils } from './utils/color-utils.js';
import { ShapeUtils } from './utils/shape-utils.js';

export class ItemIconGenerator {
    constructor(scene) {
        this.scene = scene;
        this.iconSize = 64; // Standard icon size
    }

    /**
     * Generate an icon for an item
     * @param {Object} item - Item data from items.json
     * @returns {string} Texture key for the generated icon
     */
    generateIcon(item) {
        const textureKey = `item-icon-${item.id}`;
        
        // Skip if already generated
        if (this.scene.textures.exists(textureKey)) {
            return textureKey;
        }

        const graphics = this.scene.add.graphics();
        const centerX = this.iconSize / 2;
        const centerY = this.iconSize / 2;

        // Get base color from rarity
        const baseColor = ColorUtils.getRarityColor(item.rarity);
        const levelColor = ColorUtils.getLevelColor(baseColor, item.level || 1);
        const glowColor = ColorUtils.getRarityGlowColor(item.rarity);
        const borderColor = ColorUtils.getRarityBorderColor(item.rarity);

        // Draw background with rarity glow
        const glowIntensity = this.getGlowIntensity(item.rarity, item.level || 1);
        if (glowIntensity > 0) {
            graphics.fillStyle(glowColor, glowIntensity * 0.3);
            graphics.fillCircle(centerX, centerY, this.iconSize / 2 + 2);
        }

        // Draw item shape based on type and slot
        this.drawItemShape(graphics, centerX, centerY, item, levelColor);

        // Draw rarity border
        const borderWidth = this.getBorderWidth(item.rarity, item.level || 1);
        if (borderWidth > 0) {
            graphics.lineStyle(borderWidth, borderColor, 1);
            graphics.strokeCircle(centerX, centerY, this.iconSize / 2 - 1);
        }

        // Generate texture
        graphics.generateTexture(textureKey, this.iconSize, this.iconSize);
        graphics.destroy();

        return textureKey;
    }

    /**
     * Draw the appropriate shape for an item
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} item - Item data
     * @param {number} color - Color value
     */
    drawItemShape(graphics, x, y, item, color) {
        const slot = item.slot || item.type;
        const itemName = item.name.toLowerCase();
        const itemId = item.id.toLowerCase();

        // Determine weapon type from name/id
        if (slot === 'weapon' || item.type === 'weapon') {
            if (itemId.includes('sword') || itemId.includes('blade')) {
                ShapeUtils.drawSword(graphics, x, y, this.iconSize * 0.8, this.iconSize * 0.8, color);
            } else if (itemId.includes('axe')) {
                ShapeUtils.drawAxe(graphics, x, y, this.iconSize * 0.8, this.iconSize * 0.8, color);
            } else if (itemId.includes('staff') || itemId.includes('wand')) {
                ShapeUtils.drawStaff(graphics, x, y, this.iconSize * 0.8, this.iconSize * 0.8, color);
            } else {
                // Default weapon: sword
                ShapeUtils.drawSword(graphics, x, y, this.iconSize * 0.8, this.iconSize * 0.8, color);
            }
        } else if (slot === 'chest' || (item.type === 'armor' && slot === 'chest')) {
            ShapeUtils.drawChestArmor(graphics, x, y, this.iconSize * 0.7, this.iconSize * 0.7, color);
        } else if (slot === 'ring') {
            ShapeUtils.drawRing(graphics, x, y, this.iconSize * 0.6, color);
        } else if (slot === 'amulet') {
            ShapeUtils.drawAmulet(graphics, x, y, this.iconSize * 0.7, this.iconSize * 0.7, color);
        } else {
            // Default: simple circle
            graphics.fillStyle(color);
            graphics.fillCircle(x, y, this.iconSize * 0.3);
        }
    }

    /**
     * Get glow intensity based on rarity and level
     * @param {string} rarity - Rarity level
     * @param {number} level - Item level
     * @returns {number} Glow intensity (0-1)
     */
    getGlowIntensity(rarity, level) {
        const rarityGlow = {
            common: 0,
            uncommon: 0.2,
            rare: 0.4,
            epic: 0.6,
            legendary: 0.8
        };

        const baseGlow = rarityGlow[rarity] || 0;
        const levelBoost = Math.min(level / 10, 0.2); // Up to 20% boost from level

        return Math.min(baseGlow + levelBoost, 1);
    }

    /**
     * Get border width based on rarity and level
     * @param {string} rarity - Rarity level
     * @param {number} level - Item level
     * @returns {number} Border width in pixels
     */
    getBorderWidth(rarity, level) {
        const rarityBorder = {
            common: 1,
            uncommon: 2,
            rare: 3,
            epic: 4,
            legendary: 5
        };

        const baseBorder = rarityBorder[rarity] || 1;
        const levelBoost = level >= 5 ? 1 : 0; // Extra border for high level items

        return baseBorder + levelBoost;
    }

    /**
     * Generate icons for all items in a category
     * @param {Object} items - Items object from items.json
     * @param {string} category - Category name (weapons, armor, accessories)
     */
    generateCategoryIcons(items, category) {
        if (!items[category]) return;

        for (const itemId in items[category]) {
            const item = items[category][itemId];
            this.generateIcon(item);
        }
    }

    /**
     * Generate icons for all items
     * @param {Object} itemsData - Complete items.json data
     */
    generateAllIcons(itemsData) {
        if (!itemsData) return;

        const categories = ['weapons', 'armor', 'accessories'];
        for (const category of categories) {
            this.generateCategoryIcons(itemsData, category);
        }
    }
}


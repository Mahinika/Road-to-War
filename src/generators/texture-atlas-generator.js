/**
 * Texture Atlas Generator - Creates texture atlases from individual textures
 * Combines multiple textures into a single atlas for better performance
 */

import { Logger } from '../utils/logger.js';

export class TextureAtlasGenerator {
    constructor(scene) {
        this.scene = scene;
        this.atlasSize = 2048; // Atlas texture size (power of 2)
        this.iconSize = 64; // Individual icon size
        this.iconsPerRow = Math.floor(this.atlasSize / this.iconSize); // 32 icons per row
        this.maxIcons = this.iconsPerRow * this.iconsPerRow; // 1024 icons max
    }
    
    /**
     * Create texture atlas from individual item icons
     * @param {Object} itemsData - Items data from items.json
     * @param {ItemIconGenerator} iconGenerator - Icon generator instance
     * @returns {Object} Atlas data with texture key and frame definitions
     */
    createItemIconAtlas(itemsData, iconGenerator) {
        const atlasKey = 'item-icons-atlas';
        
        // Generate all item icons first
        const itemIcons = [];
        const categories = ['weapons', 'armor', 'accessories'];
        
        for (const category of categories) {
            if (!itemsData[category]) continue;
            
            for (const itemId in itemsData[category]) {
                const item = itemsData[category][itemId];
                const textureKey = iconGenerator.generateIcon(item);
                
                if (this.scene.textures.exists(textureKey)) {
                    itemIcons.push({
                        itemId: item.id,
                        textureKey: textureKey,
                        item: item
                    });
                }
            }
        }
        
        if (itemIcons.length === 0) {
            Logger.warn('TextureAtlasGenerator', 'No item icons to combine into atlas');
            return null;
        }
        
        // Limit to max icons
        const iconsToUse = itemIcons.slice(0, this.maxIcons);
        
        // Create render texture for atlas
        const renderTexture = this.scene.add.renderTexture(0, 0, this.atlasSize, this.atlasSize);
        renderTexture.setOrigin(0, 0);
        
        // Draw each icon to render texture
        iconsToUse.forEach((iconData, index) => {
            const row = Math.floor(index / this.iconsPerRow);
            const col = index % this.iconsPerRow;
            const x = col * this.iconSize + this.iconSize / 2;
            const y = row * this.iconSize + this.iconSize / 2;
            
            // Create temporary sprite to draw
            if (this.scene.textures.exists(iconData.textureKey)) {
                const tempSprite = this.scene.add.sprite(0, 0, iconData.textureKey);
                tempSprite.setOrigin(0.5);
                renderTexture.draw(tempSprite, x, y);
                tempSprite.destroy();
            }
        });
        
        // Save render texture as atlas
        renderTexture.saveTexture(atlasKey);
        renderTexture.destroy();
        
        // Create frame definitions
        const frameDefinitions = {};
        iconsToUse.forEach((iconData, index) => {
            const row = Math.floor(index / this.iconsPerRow);
            const col = index % this.iconsPerRow;
            const x = col * this.iconSize;
            const y = row * this.iconSize;
            
            // Add frame to atlas texture
            this.scene.textures.get(atlasKey).add(iconData.itemId, 0, x, y, this.iconSize, this.iconSize);
            
            frameDefinitions[iconData.itemId] = {
                x: x,
                y: y,
                width: this.iconSize,
                height: this.iconSize
            };
        });
        
        // Store frame definitions in cache
        this.scene.cache.json.add('item-icons-atlas-frames', frameDefinitions);
        
        Logger.info('TextureAtlasGenerator', `Created item icon atlas with ${iconsToUse.length} icons`);
        
        return {
            atlasKey: atlasKey,
            frameDefinitions: frameDefinitions,
            iconCount: iconsToUse.length
        };
    }
    
    /**
     * Get frame name for item in atlas
     * @param {string} itemId - Item ID
     * @returns {string} Frame name (same as itemId)
     */
    getFrameName(itemId) {
        return itemId;
    }
    
    /**
     * Check if atlas exists
     * @returns {boolean} True if atlas exists
     */
    atlasExists() {
        return this.scene.textures.exists('item-icons-atlas');
    }
    
    /**
     * Get sprite from atlas
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} itemId - Item ID
     * @returns {Phaser.GameObjects.Image} Image from atlas
     */
    createSpriteFromAtlas(x, y, itemId) {
        if (!this.atlasExists()) {
            Logger.warn('TextureAtlasGenerator', 'Atlas does not exist, falling back to individual texture');
            const fallbackKey = `item-icon-${itemId}`;
            if (this.scene.textures.exists(fallbackKey)) {
                return this.scene.add.image(x, y, fallbackKey);
            }
            return null;
        }
        
        return this.scene.add.image(x, y, 'item-icons-atlas', itemId);
    }
}


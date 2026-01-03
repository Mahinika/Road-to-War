/**
 * Portrait Generator - Creates circular character portraits for UI frames
 * Uses RuntimePaladinGenerator to create base sprites, then crops to circular portraits
 */

import { RuntimePaladinGenerator } from '../generators/runtime-paladin-generator.js';
import { getClassColor } from './ui-system.js';
import { Logger } from './logger.js';

export class PortraitGenerator {
    /**
     * Create a new PortraitGenerator
     * @param {Phaser.Scene} scene - Phaser scene instance
     */
    constructor(scene) {
        this.scene = scene;
        this.portraitCache = new Map(); // Cache generated portraits
    }

    /**
     * Generate a circular portrait from a hero
     * @param {Object} hero - Hero object with id, classId, equipment, etc.
     * @param {number} size - Portrait diameter in pixels
     * @param {string} portraitKey - Optional texture key (auto-generated if not provided)
     * @returns {string} Texture key for the generated portrait
     */
    generatePortrait(hero, size = 48, portraitKey = null) {
        if (!hero || !hero.id) {
            Logger.warn('PortraitGenerator', 'Invalid hero data provided');
            return this.getPlaceholderPortrait(size);
        }

        // Generate cache key
        const cacheKey = portraitKey || this.getPortraitKey(hero.id, size);
        
        // Check cache first
        if (this.portraitCache.has(cacheKey) && this.scene.textures.exists(cacheKey)) {
            return cacheKey;
        }

        try {
            // Get hero equipment and class info
            const classId = hero.classId || 'paladin';
            const classColor = getClassColor(classId);
            const equipment = this.scene.equipmentManager?.getHeroEquipment(hero.id) || {};
            const itemsData = this.scene.cache.json.get('items') || {};

            // Generate base sprite using RuntimePaladinGenerator
            const baseGenerator = new RuntimePaladinGenerator(this.scene);
            const baseTextureKey = `portrait_base_${hero.id}_${Date.now()}`;
            
            // Generate full sprite (192x192)
            baseGenerator.generate(equipment, itemsData, classColor, classId, baseTextureKey);

            // Wait for texture to be ready, then create portrait
            this.createPortraitFromBase(baseTextureKey, cacheKey, size);

            // Cache the portrait key
            this.portraitCache.set(cacheKey, true);

            return cacheKey;
        } catch (error) {
            Logger.error('PortraitGenerator', `Failed to generate portrait: ${error.message}`);
            return this.getPlaceholderPortrait(size);
        }
    }

    /**
     * Create circular portrait from base sprite texture
     * @param {string} baseTextureKey - Key of the base sprite texture
     * @param {string} portraitKey - Key for the portrait texture
     * @param {number} size - Portrait diameter
     */
    createPortraitFromBase(baseTextureKey, portraitKey, size) {
        // Wait for base texture to be ready
        const checkTexture = () => {
            if (!this.scene.textures.exists(baseTextureKey)) {
                // Texture not ready yet, try again
                this.scene.time.delayedCall(50, checkTexture);
                return;
            }

            try {
                // Remove existing portrait if it exists
                if (this.scene.textures.exists(portraitKey)) {
                    this.scene.textures.remove(portraitKey);
                }

                // Use RenderTexture for better quality portrait
                this.createPortraitWithRenderTexture(baseTextureKey, portraitKey, size);
            } catch (error) {
                Logger.error('PortraitGenerator', `Error creating portrait: ${error.message}`);
                this.getPlaceholderPortrait(size);
            }
        };

        checkTexture();
    }

    /**
     * Create portrait using RenderTexture for better quality
     * @param {string} baseTextureKey - Base texture key
     * @param {string} portraitKey - Portrait texture key
     * @param {number} size - Portrait size
     */
    createPortraitWithRenderTexture(baseTextureKey, portraitKey, size) {
        try {
            // Wait a frame to ensure base texture is fully loaded
            this.scene.time.delayedCall(50, () => {
                try {
                    if (!this.scene.textures.exists(baseTextureKey)) {
                        Logger.warn('PortraitGenerator', `Base texture ${baseTextureKey} not found, using placeholder`);
                        this.createSimplePortrait(baseTextureKey, portraitKey, size);
                        return;
                    }

                    // Create render texture
                    const renderTexture = this.scene.add.renderTexture(0, 0, size, size);
                    renderTexture.setVisible(false);
                    renderTexture.setActive(false);

                    // Create a temporary sprite from base texture
                    const tempSprite = this.scene.add.sprite(0, 0, baseTextureKey);
                    tempSprite.setVisible(false);
                    tempSprite.setActive(false);

                    // Calculate scale to focus on head/upper body (crop top 60% of 192px sprite)
                    // Base sprite is 192x192, we want to focus on upper portion
                    const sourceHeight = 192;
                    const cropHeight = sourceHeight * 0.65; // Upper 65% (head and upper torso)
                    const scale = size / cropHeight;
                    tempSprite.setScale(scale);
                    
                    // Position to center the upper body area (focus on head)
                    // Base sprite center is at (96, 96), we want to show head area around y=40-100
                    const offsetY = (cropHeight / 2 - 70) * scale; // Focus on head area

                    // Draw to render texture (centered horizontally, offset vertically to show head)
                    renderTexture.draw(tempSprite, size / 2, size / 2 - offsetY);
                    
                    // Create circular mask using graphics
                    const maskGraphics = this.scene.add.graphics();
                    maskGraphics.fillStyle(0xffffff);
                    maskGraphics.fillCircle(size / 2, size / 2, size / 2);
                    const mask = maskGraphics.createGeometryMask();
                    
                    // Apply mask to render texture
                    renderTexture.setMask(mask);

                    // Generate texture from render texture
                    renderTexture.saveTexture(portraitKey);
                    
                    // Cleanup
                    tempSprite.destroy();
                    renderTexture.destroy();
                    maskGraphics.destroy();
                } catch (error) {
                    Logger.error('PortraitGenerator', `Error creating render texture portrait: ${error.message}`);
                    // Fallback: create simple circular portrait
                    this.createSimplePortrait(baseTextureKey, portraitKey, size);
                }
            });
        } catch (error) {
            Logger.error('PortraitGenerator', `Error setting up render texture portrait: ${error.message}`);
            // Fallback: create simple circular portrait
            this.createSimplePortrait(baseTextureKey, portraitKey, size);
        }
    }

    /**
     * Create a simple circular portrait (fallback method)
     * @param {string} baseTextureKey - Base texture key
     * @param {string} portraitKey - Portrait texture key
     * @param {number} size - Portrait size
     */
    createSimplePortrait(baseTextureKey, portraitKey, size) {
        try {
            const graphics = this.scene.add.graphics();
            graphics.clear();
            graphics.setVisible(false);
            graphics.setActive(false);

            const radius = size / 2;
            const centerX = size / 2;
            const centerY = size / 2;

            // Draw circular background
            graphics.fillStyle(0x1a1f2e, 1);
            graphics.fillCircle(centerX, centerY, radius);

            // Draw border
            graphics.lineStyle(2, 0xc9aa71, 1);
            graphics.strokeCircle(centerX, centerY, radius);

            // Generate texture
            graphics.generateTexture(portraitKey, size, size);
            graphics.destroy();

            Logger.warn('PortraitGenerator', `Created simple placeholder portrait: ${portraitKey}`);
        } catch (error) {
            Logger.error('PortraitGenerator', `Error creating simple portrait: ${error.message}`);
        }
    }

    /**
     * Get placeholder portrait (fallback when generation fails)
     * @param {number} size - Portrait size
     * @returns {string} Placeholder texture key
     */
    getPlaceholderPortrait(size) {
        const placeholderKey = `portrait_placeholder_${size}`;
        
        if (!this.scene.textures.exists(placeholderKey)) {
            // CRITICAL FIX: Graphics objects don't support text rendering
            // Use RenderTexture to combine graphics (circle) and text (question mark)
            const renderTexture = this.scene.add.renderTexture(0, 0, size, size);
            renderTexture.setVisible(false);
            
            const radius = size / 2;
            const centerX = size / 2;
            const centerY = size / 2;

            // Draw circular background using graphics
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0x2a2a2a, 1);
            graphics.fillCircle(centerX, centerY, radius);

            // Draw border
            graphics.lineStyle(2, 0x666666, 1);
            graphics.strokeCircle(centerX, centerY, radius);

            // Draw graphics onto render texture
            renderTexture.draw(graphics, 0, 0);
            graphics.destroy();

            // Create text object for question mark
            const fontSize = size * 0.4;
            const text = this.scene.add.text(centerX, centerY, '?', {
                font: `bold ${fontSize}px Arial`,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            });
            text.setOrigin(0.5, 0.5);
            text.setVisible(false);

            // Draw text onto render texture
            renderTexture.draw(text, 0, 0);
            text.destroy();

            // Generate final texture from render texture
            renderTexture.saveTexture(placeholderKey);
            renderTexture.destroy();
        }

        return placeholderKey;
    }

    /**
     * Generate cache key for portrait
     * @param {string} heroId - Hero ID
     * @param {number} size - Portrait size
     * @returns {string} Cache key
     */
    getPortraitKey(heroId, size) {
        return `portrait_${heroId}_${size}`;
    }

    /**
     * Clear portrait cache
     * @param {string} heroId - Optional hero ID to clear specific portraits
     */
    clearCache(heroId = null) {
        if (heroId) {
            // Clear specific hero's portraits
            for (const key of this.portraitCache.keys()) {
                if (key.includes(`portrait_${heroId}_`)) {
                    if (this.scene.textures.exists(key)) {
                        this.scene.textures.remove(key);
                    }
                    this.portraitCache.delete(key);
                }
            }
        } else {
            // Clear all portraits
            for (const key of this.portraitCache.keys()) {
                if (this.scene.textures.exists(key)) {
                    this.scene.textures.remove(key);
                }
            }
            this.portraitCache.clear();
        }
    }
}


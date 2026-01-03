/**
 * Runtime Enemy Sprite Generator
 * Generates enemy sprites with body-part-based rendering similar to heroes
 * Supports multiple body types: humanoid, blob, dragon
 */

import { getPlaceholderKey, ensurePlaceholderTexture } from '../utils/placeholder-helper.js';
import { Logger } from '../utils/logger.js';
import { PixelArtRenderer } from './utils/pixel-art-renderer.js';
import { JointTransform } from './joint-transform.js';
import { ColorUtils } from './utils/color-utils.js';
import { DRAGUMAGU_STYLE, generateDragumaguPalette } from '../config/dragumagu-style-guide.js';

export class RuntimeEnemyGenerator {
    /**
     * Create a new RuntimeEnemyGenerator.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     */
    constructor(scene) {
        this.scene = scene;
        this.pixelArtRenderer = new PixelArtRenderer(scene);
        this.style = DRAGUMAGU_STYLE;
    }

    /**
     * Get size based on enemy size category
     * @param {string} sizeCategory - Size category (small, medium, large, extra_large, gigantic)
     * @returns {number} Sprite dimension (width/height)
     */
    getSize(sizeCategory) {
        const sizes = {
            small: 64,
            medium: 96,
            large: 128,
            extra_large: 160,
            gigantic: 192
        };
        return sizes[sizeCategory] || sizes.medium;
    }

    /**
     * Generate sprite texture based on enemy data
     * @param {Object} enemyData - Enemy data from enemies.json
     * @param {string} enemyId - Unique identifier for texture key
     * @returns {string} Texture key
     */
    generate(enemyData, enemyId) {
        const placeholderKey = getPlaceholderKey(this.scene, 'enemy');
        try {
            const appearance = enemyData.appearance || {};
            const size = this.getSize(appearance.size || 'medium');
            const bodyType = this.getBodyType(enemyData, appearance);
            const colorHex = appearance.color || '#ff0000';
            const parsedColor = parseInt(String(colorHex).replace('#', ''), 16);
            const baseColor = Number.isFinite(parsedColor) ? parsedColor : 0xff0000;

            const graphics = this.scene.add.graphics();
            graphics.clear();
            // Graphics needs to be in scene for texture generation, but we can hide it
            graphics.setVisible(false);
            graphics.setActive(false);
            graphics.x = 0;
            graphics.y = 0;

            // Get character props for body-part rendering
            const props = this.getCharacterProps(bodyType, size, enemyData);
            
            if (!props) {
                Logger.error('RuntimeEnemyGenerator', `Failed to get props for bodyType: ${bodyType}`);
                graphics.destroy();
                return placeholderKey;
            }

            // Draw based on body type
            try {
                switch (bodyType) {
                    case 'humanoid':
                        this.drawHumanoidEnemy(graphics, props, enemyData, baseColor);
                        break;
                    case 'blob':
                        this.drawBlobEnemy(graphics, props, enemyData, baseColor);
                        break;
                    case 'dragon':
                        this.drawDragonEnemy(graphics, props, enemyData, baseColor);
                        break;
                    default:
                        this.drawHumanoidEnemy(graphics, props, enemyData, baseColor);
                        break;
                }
            } catch (drawError) {
                Logger.error('RuntimeEnemyGenerator', `Error drawing enemy ${enemyId}:`, drawError);
                graphics.destroy();
                return placeholderKey;
            }

            // Generate texture
            const textureKey = `enemy_${enemyId}`;
            
            try {
                // Temporarily make graphics visible for texture generation
                graphics.setVisible(true);
                graphics.setActive(true);
                
                // Ensure graphics is in the scene's display list
                if (!graphics.scene) {
                    this.scene.add.existing(graphics);
                }
                
                // Force a render update to ensure graphics is drawn
                this.scene.sys.displayList.add(graphics);
                
                // Generate texture - Phaser may need a frame to register it
                graphics.generateTexture(textureKey, size, size);
                Logger.debug('RuntimeEnemyGenerator', `Generated texture ${textureKey} for ${enemyId}`);
            } catch (texError) {
                Logger.error('RuntimeEnemyGenerator', `Error generating texture for ${enemyId}:`, texError);
                graphics.destroy();
                return placeholderKey;
            } finally {
                // Clean up graphics after a small delay to ensure texture is captured
                this.scene.time.delayedCall(0, () => {
                    if (graphics && !graphics.destroyed) {
                        graphics.destroy();
                    }
                });
            }

            // Return the texture key - waitForTextureReady will handle if it's not ready yet
            return textureKey;
        } catch (error) {
            Logger.error('RuntimeEnemyGenerator', 'Error generating sprite:', error);
            ensurePlaceholderTexture(this.scene, {
                key: placeholderKey,
                width: 48,
                height: 48,
                color: 0x993333,
                borderColor: 0xffffff,
                crossColor: 0xffc0c0
            });
            return placeholderKey;
        }
    }

    /**
     * Detect body type from enemy data
     * @param {Object} enemyData - Enemy data
     * @param {Object} appearance - Appearance data
     * @returns {string} Body type (humanoid, blob, dragon)
     */
    getBodyType(enemyData, appearance) {
        // Check explicit bodyType first
        if (appearance.bodyType) {
            return appearance.bodyType;
        }

        // Infer from enemy ID
        const enemyId = enemyData.id || '';
        if (enemyId === 'slime') {
            return 'blob';
        }
        if (enemyId === 'dragon') {
            return 'dragon';
        }

        // Infer from shape
        const shape = appearance.shape || 'rectangle';
        if (shape === 'circle') {
            return 'blob';
        }
        if (shape === 'custom' && enemyId.includes('dragon')) {
            return 'dragon';
        }

        // Default to humanoid for goblins, orcs, knights, etc.
        return 'humanoid';
    }

    /**
     * Get character props based on body type and size
     * @param {string} bodyType - Body type
     * @param {number} size - Sprite size
     * @param {Object} enemyData - Enemy data
     * @returns {Object} Character properties
     */
    getCharacterProps(bodyType, size, enemyData) {
        const centerX = size / 2;
        const centerY = size / 2;
        const scale = size / 96; // Base scale from medium (96px)

        if (bodyType === 'humanoid') {
            // Humanoid proportions (similar to heroes but enemy-styled)
            const headSize = Math.floor(24 * scale);
            const headY = Math.floor(centerY - size * 0.35);
            const torsoWidth = Math.floor(26 * scale);
            const torsoHeight = Math.floor(19 * scale);
            const torsoY = headY + headSize / 2 + Math.floor(3 * scale);
            const legWidth = Math.floor(12 * scale);
            const legLen = Math.floor(20 * scale);
            const armWidth = Math.floor(11 * scale);
            const armLen = Math.floor(12 * scale);

            return {
                centerX,
                centerY,
                headSize,
                headY,
                torsoWidth,
                torsoHeight,
                torsoY,
                legWidth,
                legLen,
                legTop: torsoY + torsoHeight / 2 + Math.floor(5 * scale),
                leftLegX: centerX - Math.floor(8 * scale),
                rightLegX: centerX + Math.floor(8 * scale),
                armWidth,
                armLen,
                leftArmX: centerX - Math.floor(14 * scale),
                rightArmX: centerX + Math.floor(14 * scale),
                armY: torsoY - Math.floor(2 * scale),
                enemyId: enemyData.id,
                enemyType: enemyData.type
            };
        } else if (bodyType === 'blob') {
            // Blob proportions (amorphous)
            const radius = Math.floor(size * 0.4);
            return {
                centerX,
                centerY,
                radius,
                enemyId: enemyData.id
            };
        } else if (bodyType === 'dragon') {
            // Dragon proportions (large, winged)
            const bodyWidth = Math.floor(size * 0.6);
            const bodyHeight = Math.floor(size * 0.4);
            const headSize = Math.floor(size * 0.3);
            const wingSize = Math.floor(size * 0.25);
            return {
                centerX,
                centerY,
                bodyWidth,
                bodyHeight,
                headSize,
                wingSize,
                enemyId: enemyData.id
            };
        }

        return { centerX, centerY };
    }

    /**
     * Draw humanoid enemy with body parts (Enhanced)
     */
    drawHumanoidEnemy(graphics, props, enemyData, baseColor) {
        const palette = this.generatePalette(baseColor, enemyData);
        
        // Draw in layer order
        this.drawEnhancedLegs(graphics, props, palette);
        this.drawEnhancedTorso(graphics, props, palette, enemyData);
        this.drawEnhancedArms(graphics, props, palette);
        this.drawEnhancedHead(graphics, props, palette, enemyData);
        this.drawEnhancedWeapon(graphics, props, palette, enemyData);
    }

    drawEnhancedLegs(graphics, props, palette) {
        const { leftLegX, rightLegX, legTop, legLen, legWidth } = props;
        const skin = palette.skin;

        // Left Leg
        graphics.fillStyle(skin.base);
        graphics.fillRect(leftLegX - legWidth/2, legTop, legWidth, legLen);
        graphics.fillStyle(skin.dark1);
        graphics.fillRect(leftLegX + legWidth/4, legTop + 5, legWidth/4, legLen - 10);
        this.drawOutline(graphics, leftLegX - legWidth/2, legTop, legWidth, legLen);

        // Right Leg
        graphics.fillStyle(skin.base);
        graphics.fillRect(rightLegX - legWidth/2, legTop, legWidth, legLen);
        graphics.fillStyle(skin.dark1);
        graphics.fillRect(rightLegX + legWidth/4, legTop + 5, legWidth/4, legLen - 10);
        this.drawOutline(graphics, rightLegX - legWidth/2, legTop, legWidth, legLen);
    }

    drawEnhancedTorso(graphics, props, palette, enemyData) {
        const { centerX, torsoY, torsoWidth, torsoHeight } = props;
        const skin = palette.skin;

        graphics.fillStyle(skin.base);
        graphics.fillRect(centerX - torsoWidth/2, torsoY - torsoHeight/2, torsoWidth, torsoHeight);

        // Muscular striations for orcs/warriors
        if (enemyData.id === 'orc' || enemyData.id === 'dark_knight') {
            graphics.fillStyle(skin.dark1);
            for(let i=0; i<3; i++) {
                graphics.fillRect(centerX - torsoWidth/2 + 4, torsoY - torsoHeight/2 + 4 + (i*5), torsoWidth - 8, 2);
            }
        }

        this.drawOutline(graphics, centerX - torsoWidth/2, torsoY - torsoHeight/2, torsoWidth, torsoHeight);
    }

    drawEnhancedArms(graphics, props, palette) {
        const { leftArmX, rightArmX, armY, armLen, armWidth } = props;
        const skin = palette.skin;

        // Left Arm (Back)
        graphics.fillStyle(skin.dark1);
        graphics.fillRect(leftArmX - armWidth/2, armY, armWidth, armLen);
        this.drawOutline(graphics, leftArmX - armWidth/2, armY, armWidth, armLen);

        // Right Arm (Front)
        graphics.fillStyle(skin.base);
        graphics.fillRect(rightArmX - armWidth/2, armY, armWidth, armLen);
        this.drawOutline(graphics, rightArmX - armWidth/2, armY, armWidth, armLen);
    }

    drawEnhancedHead(graphics, props, palette, enemyData) {
        const { centerX, headY, headSize } = props;
        const skin = palette.skin;

        graphics.fillStyle(skin.base);
        graphics.fillCircle(centerX, headY, headSize/2);
        
        // Face Shadow
        graphics.fillStyle(skin.dark1);
        graphics.fillEllipse(centerX + headSize/4, headY + headSize/4, headSize/3, headSize/4);

        // Eyes (Glowing)
        graphics.fillStyle(palette.eyes.base);
        graphics.fillCircle(centerX - 4, headY - 2, 3);
        graphics.fillCircle(centerX + 4, headY - 2, 3);

        graphics.lineStyle(1, 0x000000);
        graphics.strokeCircle(centerX, headY, headSize/2);
    }

    drawEnhancedWeapon(graphics, props, palette, enemyData) {
        const { rightArmX, armY, armLen } = props;
        
        if (enemyData.id === 'orc') {
            // Jagged Axe
            graphics.fillStyle(0x654321); // Wood
            graphics.fillRect(rightArmX + 2, armY - 5, 4, armLen + 15);
            graphics.fillStyle(0x888888); // Iron
            graphics.fillTriangle(rightArmX + 4, armY - 5, rightArmX + 20, armY - 10, rightArmX + 4, armY + 15);
        }
    }

    /**
     * Draw blob enemy (slime-type) - Enhanced
     */
    drawBlobEnemy(graphics, props, enemyData, baseColor) {
        const { centerX, centerY, radius } = props;
        const skin = {
            base: baseColor,
            light: ColorUtils.lighten(baseColor, 0.3),
            dark: ColorUtils.darken(baseColor, 0.3)
        };

        // Outer translucent body
        graphics.fillStyle(skin.base, 0.6);
        graphics.fillCircle(centerX, centerY, radius);

        // Darker inner core
        graphics.fillStyle(skin.dark, 0.8);
        graphics.fillCircle(centerX, centerY + 5, radius * 0.6);

        // Core highlight
        graphics.fillStyle(skin.light, 0.4);
        graphics.fillCircle(centerX - 5, centerY - 5, radius * 0.3);

        // Surface shine (Pixel art look)
        graphics.fillStyle(0xffffff, 0.3);
        graphics.fillEllipse(centerX - radius * 0.4, centerY - radius * 0.4, radius * 0.4, radius * 0.2);

        // Eyes
        graphics.fillStyle(0x000000);
        graphics.fillCircle(centerX - 10, centerY - 2, 4);
        graphics.fillCircle(centerX + 10, centerY - 2, 4);
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(centerX - 11, centerY - 3, 1.5);
        graphics.fillCircle(centerX + 9, centerY - 3, 1.5);

        // Outline
        graphics.lineStyle(2, 0x000000, 0.8);
        graphics.strokeCircle(centerX, centerY, radius);
    }

    /**
     * Draw dragon enemy - Enhanced
     */
    drawDragonEnemy(graphics, props, enemyData, baseColor) {
        const { centerX, centerY, bodyWidth, bodyHeight, headSize, wingSize } = props;
        const skin = {
            base: baseColor,
            light: ColorUtils.lighten(baseColor, 0.2),
            dark: ColorUtils.darken(baseColor, 0.2),
            dark2: ColorUtils.darken(baseColor, 0.4)
        };

        // Layer order: back wing, tail, body, front wing, head

        // Back Wing
        this.drawDragonWing(graphics, centerX - bodyWidth / 4, centerY - bodyHeight / 4, wingSize, skin.dark2, true);

        // Tail
        graphics.fillStyle(skin.dark);
        graphics.beginPath();
        graphics.moveTo(centerX - bodyWidth / 2, centerY);
        graphics.quadraticCurveTo(centerX - bodyWidth, centerY + 20, centerX - bodyWidth * 0.8, centerY + 40);
        graphics.lineTo(centerX - bodyWidth * 0.6, centerY + 10);
        graphics.closePath();
        graphics.fillPath();

        // Body (Chest area)
        graphics.fillStyle(skin.base);
        graphics.fillEllipse(centerX, centerY, bodyWidth, bodyHeight);
        
        // Underbelly scales
        graphics.fillStyle(skin.light, 0.3);
        graphics.fillEllipse(centerX, centerY + bodyHeight / 4, bodyWidth * 0.8, bodyHeight / 2);

        // Front Wing
        this.drawDragonWing(graphics, centerX + bodyWidth / 4, centerY - bodyHeight / 4, wingSize, skin.dark, false);

        // Head
        graphics.fillStyle(skin.base);
        const headX = centerX + bodyWidth * 0.4;
        const headY = centerY - bodyHeight * 0.4;
        graphics.fillCircle(headX, headY, headSize / 2);
        
        // Dragon Horns
        graphics.fillStyle(skin.dark2);
        graphics.fillTriangle(headX, headY - headSize/4, headX - 15, headY - 20, headX - 5, headY - 10);

        // Glowing Eye
        graphics.fillStyle(0xffff00);
        graphics.fillCircle(headX + 5, headY - 2, 3);

        // Outline Body
        graphics.lineStyle(2, 0x000000, 0.8);
        graphics.strokeEllipse(centerX, centerY, bodyWidth, bodyHeight);
    }

    drawDragonWing(graphics, x, y, size, color, isBack) {
        graphics.fillStyle(color, isBack ? 0.7 : 1.0);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(x - size, y - size);
        graphics.quadraticCurveTo(x - size * 1.5, y, x - size, y + size / 2);
        graphics.lineTo(x, y);
        graphics.closePath();
        graphics.fillPath();
        
        // Wing bones
        graphics.lineStyle(2, ColorUtils.darken(color, 0.3), 0.8);
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(x - size, y - size);
        graphics.strokePath();
    }

    /**
     * Generate color palette from base color (Dragumagu-style 5-level shading)
     * @param {number} baseColor - Base color
     * @param {Object} enemyData - Enemy data
     * @returns {Object} Color palette
     */
    generatePalette(baseColor, enemyData) {
        // Humanoid skin tones (WoW-inspired)
        let skinBase = baseColor;
        if (enemyData.id === 'orc') skinBase = 0x4A7023; // Classic Orc Green
        if (enemyData.id === 'goblin') skinBase = 0x8DA343; // Yellowish Green
        if (enemyData.id === 'dark_knight') skinBase = 0x2A2A2A; // Undead gray
        
        const skinPalette = generateDragumaguPalette(skinBase, 'skin');
        const armorPalette = generateDragumaguPalette(0x4A4A4A, 'metal');
        
        return {
            skin: skinPalette,
            armor: armorPalette,
            eyes: { base: 0xff0000, highlight: 0xffffff },
            outline: { color: DRAGUMAGU_STYLE.outline.color, thickness: DRAGUMAGU_STYLE.outline.thickness }
        };
    }

    /**
     * Lightens a color by a specified amount.
     * @param {number} color - Original color in hex.
     * @param {number} amount - Amount to lighten (0 to 1).
     * @returns {number} Lightened color in hex.
     */
    lightenColor(color, amount) {
        const r = Math.min(255, ((color >> 16) & 0xFF) + Math.round(255 * amount));
        const g = Math.min(255, ((color >> 8) & 0xFF) + Math.round(255 * amount));
        const b = Math.min(255, (color & 0xFF) + Math.round(255 * amount));
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Darkens a color by a specified amount.
     * @param {number} color - Original color in hex.
     * @param {number} amount - Amount to darken (0 to 1).
     * @returns {number} Darkened color in hex.
     */
    darkenColor(color, amount) {
        const r = Math.max(0, ((color >> 16) & 0xFF) - Math.round(255 * amount));
        const g = Math.max(0, ((color >> 8) & 0xFF) - Math.round(255 * amount));
        const b = Math.max(0, (color & 0xFF) - Math.round(255 * amount));
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Draws an outline around a rectangular area (Dragumagu-style: bold 2-3px)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} w - Width.
     * @param {number} h - Height.
     * @param {number} [thick=null] - Outline thickness (defaults to style guide).
     */
    drawOutline(graphics, x, y, w, h, thick = null) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const pw = Math.floor(w);
        const ph = Math.floor(h);
        const outlineThick = thick !== null ? thick : this.style.outline.thickness;
        graphics.fillStyle(this.style.outline.color);
        // Top & bottom (bold)
        graphics.fillRect(px, py, pw, outlineThick);
        graphics.fillRect(px, py + ph - outlineThick, pw, outlineThick);
        // Sides
        graphics.fillRect(px, py + outlineThick, outlineThick, ph - 2 * outlineThick);
        graphics.fillRect(px + pw - outlineThick, py + outlineThick, outlineThick, ph - 2 * outlineThick);
    }
}

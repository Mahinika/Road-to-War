/**
 * Sprite Generator - Generates procedural character sprites
 * Creates hero and enemy sprites based on game data
 */

import { ColorUtils } from './utils/color-utils.js';
import { ShapeUtils } from './utils/shape-utils.js';
import { CharacterComponents } from './components/character-components.js';

export class SpriteGenerator {
    constructor(scene) {
        this.scene = scene;
        this.heroSize = { width: 40, height: 60 };
        this.enemySizes = {
            small: { width: 30, height: 30 },
            medium: { width: 40, height: 40 },
            large: { width: 50, height: 50 },
            extra_large: { width: 60, height: 60 },
            gigantic: { width: 80, height: 80 }
        };
    }

    /**
     * Generate hero sprite with AAA-quality layered rendering
     * @param {boolean} forceRegenerate - Force regeneration even if texture exists
     * @returns {string} Texture key for the generated sprite
     */
    generateHeroSprite(forceRegenerate = false) {
        const textureKey = 'hero-sprite';
        
        // Skip if already generated (unless forcing regeneration)
        if (!forceRegenerate && this.scene.textures.exists(textureKey)) {
            return textureKey;
        }

        // Remove existing texture if forcing regeneration
        if (forceRegenerate && this.scene.textures.exists(textureKey)) {
            this.scene.textures.remove(textureKey);
        }

        // Use layered rendering for Paladin
        return this.generateHeroSpriteLayered();
    }

    /**
     * Generate hero sprite with layered rendering system
     * @returns {string} Texture key for the generated sprite
     */
    generateHeroSpriteLayered() {
        const textureKey = 'hero-sprite';
        
        const graphics = this.scene.add.graphics();
        const centerX = this.heroSize.width / 2;
        const centerY = this.heroSize.height / 2;

        // Paladin color scheme
        const skinColor = 0xffdbac;
        const armorColor = 0xc0c0c0; // Silver
        const armorAccent = 0x4169e1; // Royal blue
        const clothColor = 0x2c3e50; // Dark blue-gray

        // === LAYER 1: SHADOWS (drawn first, behind everything) ===
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillEllipse(centerX, centerY + this.heroSize.height * 0.4, 
                             this.heroSize.width * 0.5, this.heroSize.height * 0.15);

        // === LAYER 2: BASE BODY ===
        // Legs (behind armor)
        const legColor = ColorUtils.darken(clothColor, 0.2);
        graphics.fillStyle(legColor);
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.2, 
                                centerY + this.heroSize.height * 0.25, 
                                this.heroSize.width * 0.15, 
                                this.heroSize.height * 0.25, 2);
        graphics.fillRoundedRect(centerX + this.heroSize.width * 0.05, 
                                centerY + this.heroSize.height * 0.25, 
                                this.heroSize.width * 0.15, 
                                this.heroSize.height * 0.25, 2);

        // Torso base
        graphics.fillStyle(clothColor);
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.25, 
                                centerY - this.heroSize.height * 0.1, 
                                this.heroSize.width * 0.5, 
                                this.heroSize.height * 0.4, 3);

        // === LAYER 3: ARMOR ===
        // Chest plate with gradient effect (simulated with highlights)
        graphics.fillStyle(armorColor);
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.22, 
                                centerY - this.heroSize.height * 0.08, 
                                this.heroSize.width * 0.44, 
                                this.heroSize.height * 0.35, 4);
        
        // Armor highlight (top-left light source)
        const highlightColor = ColorUtils.lighten(armorColor, 0.4);
        graphics.fillStyle(highlightColor, 0.6);
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.18, 
                                centerY - this.heroSize.height * 0.05, 
                                this.heroSize.width * 0.25, 
                                this.heroSize.height * 0.2, 3);
        
        // Armor shadow (bottom-right)
        const shadowColor = ColorUtils.darken(armorColor, 0.3);
        graphics.fillStyle(shadowColor, 0.5);
        graphics.fillRoundedRect(centerX + this.heroSize.width * 0.05, 
                                centerY + this.heroSize.height * 0.1, 
                                this.heroSize.width * 0.25, 
                                this.heroSize.height * 0.2, 3);
        
        // Shoulder pads
        graphics.fillStyle(armorColor);
        const shoulderWidth = this.heroSize.width * 0.2;
        const shoulderHeight = this.heroSize.height * 0.15;
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.35, 
                                centerY - this.heroSize.height * 0.15, 
                                shoulderWidth, shoulderHeight, 5);
        graphics.fillRoundedRect(centerX + this.heroSize.width * 0.15, 
                                centerY - this.heroSize.height * 0.15, 
                                shoulderWidth, shoulderHeight, 5);
        
        // Shoulder pad highlights
        graphics.fillStyle(highlightColor, 0.7);
        graphics.fillCircle(centerX - this.heroSize.width * 0.25, 
                           centerY - this.heroSize.height * 0.08, 
                           this.heroSize.width * 0.08);
        graphics.fillCircle(centerX + this.heroSize.width * 0.25, 
                           centerY - this.heroSize.height * 0.08, 
                           this.heroSize.width * 0.08);

        // === LAYER 4: HEAD AND HELMET ===
        // Head base
        graphics.fillStyle(skinColor);
        graphics.fillCircle(centerX, centerY - this.heroSize.height * 0.3, 
                           this.heroSize.width * 0.18);
        
        // Helmet
        graphics.fillStyle(armorColor);
        const helmetSize = this.heroSize.width * 0.44;
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.22, 
                                centerY - this.heroSize.height * 0.4, 
                                helmetSize, 
                                this.heroSize.height * 0.2, 8);
        
        // Helmet visor (with gradient effect)
        graphics.fillStyle(armorAccent, 0.6);
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.15, 
                                centerY - this.heroSize.height * 0.35, 
                                this.heroSize.width * 0.3, 
                                this.heroSize.height * 0.12, 4);
        
        // Helmet highlight
        graphics.fillStyle(highlightColor, 0.5);
        graphics.fillRoundedRect(centerX - this.heroSize.width * 0.18, 
                                centerY - this.heroSize.height * 0.38, 
                                this.heroSize.width * 0.25, 
                                this.heroSize.height * 0.08, 4);

        // === LAYER 5: WEAPON (Sword) ===
        // Sword blade
        const swordColor = 0xe0e0e0;
        graphics.fillStyle(swordColor);
        graphics.fillRect(centerX + this.heroSize.width * 0.25, 
                         centerY - this.heroSize.height * 0.2, 
                         this.heroSize.width * 0.08, 
                         this.heroSize.height * 0.4);
        
        // Sword highlight
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillRect(centerX + this.heroSize.width * 0.26, 
                         centerY - this.heroSize.height * 0.18, 
                         this.heroSize.width * 0.03, 
                         this.heroSize.height * 0.35);
        
        // Sword guard
        graphics.fillStyle(0x8b4513); // Brown
        graphics.fillRect(centerX + this.heroSize.width * 0.2, 
                         centerY + this.heroSize.height * 0.05, 
                         this.heroSize.width * 0.2, 
                         this.heroSize.height * 0.08);
        
        // Sword hilt
        graphics.fillStyle(0x654321); // Dark brown
        graphics.fillRect(centerX + this.heroSize.width * 0.22, 
                         centerY + this.heroSize.height * 0.13, 
                         this.heroSize.width * 0.12, 
                         this.heroSize.height * 0.15);

        // === LAYER 6: DETAILS AND EFFECTS ===
        // Armor details (engravings/patterns)
        graphics.lineStyle(1, armorAccent, 0.5);
        graphics.strokeRoundedRect(centerX - this.heroSize.width * 0.2, 
                                  centerY - this.heroSize.height * 0.06, 
                                  this.heroSize.width * 0.4, 
                                  this.heroSize.height * 0.3, 4);
        
        // Eye glow (paladin holy light)
        graphics.fillStyle(0xffff00, 0.8);
        graphics.fillCircle(centerX - this.heroSize.width * 0.08, 
                           centerY - this.heroSize.height * 0.32, 
                           this.heroSize.width * 0.04);
        graphics.fillCircle(centerX + this.heroSize.width * 0.08, 
                           centerY - this.heroSize.height * 0.32, 
                           this.heroSize.width * 0.04);

        // === LAYER 7: OUTLINE (final layer for definition) ===
        graphics.lineStyle(2, 0x000000, 0.8);
        graphics.strokeCircle(centerX, centerY - this.heroSize.height * 0.3, 
                             this.heroSize.width * 0.18);
        graphics.strokeRoundedRect(centerX - this.heroSize.width * 0.22, 
                                  centerY - this.heroSize.height * 0.08, 
                                  this.heroSize.width * 0.44, 
                                  this.heroSize.height * 0.35, 4);

        // Generate texture
        graphics.generateTexture(textureKey, this.heroSize.width, this.heroSize.height);
        graphics.destroy();

        return textureKey;
    }

    /**
     * Generate a component sprite (for animation system)
     * @param {string} componentType - Component type (HEAD, TORSO, ARM_LEFT, etc.)
     * @param {string} variant - Component variant
     * @param {number} color - Component color
     * @param {Object} options - Additional options
     * @returns {Object} {textureKey, metadata}
     */
    generateComponentSprite(componentType, variant, color, options = {}) {
        const textureKey = `component-${componentType}-${variant}`;
        
        if (this.scene.textures.exists(textureKey)) {
            return { textureKey, metadata: null };
        }

        const graphics = this.scene.add.graphics();
        const centerX = this.heroSize.width / 2;
        const centerY = this.heroSize.height / 2;
        
        let metadata = null;

        // Generate component based on type
        switch (componentType) {
            case 'HEAD':
                metadata = CharacterComponents.generateHead(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    variant, color, options
                );
                break;
            case 'TORSO':
                metadata = CharacterComponents.generateTorso(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    variant, color, options
                );
                break;
            case 'ARM_LEFT':
                metadata = CharacterComponents.generateArm(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    'left', variant, color, options
                );
                break;
            case 'ARM_RIGHT':
                metadata = CharacterComponents.generateArm(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    'right', variant, color, options
                );
                break;
            case 'LEG_LEFT':
                metadata = CharacterComponents.generateLeg(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    'left', variant, color, options
                );
                break;
            case 'LEG_RIGHT':
                metadata = CharacterComponents.generateLeg(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    'right', variant, color, options
                );
                break;
            case 'WEAPON':
                metadata = CharacterComponents.generateWeapon(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    variant, color, options
                );
                break;
            case 'SHIELD':
                metadata = CharacterComponents.generateShield(
                    graphics, centerX, centerY, 
                    this.heroSize.width, this.heroSize.height, 
                    variant, color, options
                );
                break;
        }

        // Generate texture for component
        if (metadata) {
            const componentWidth = metadata.size.width || metadata.size || this.heroSize.width;
            const componentHeight = metadata.size.height || metadata.size || this.heroSize.height;
            graphics.generateTexture(textureKey, componentWidth, componentHeight);
        } else {
            graphics.generateTexture(textureKey, this.heroSize.width, this.heroSize.height);
        }
        
        graphics.destroy();

        return { textureKey, metadata };
    }

    /**
     * Generate enemy sprite
     * @param {Object} enemyData - Enemy data from enemies.json
     * @returns {string} Texture key for the generated sprite
     */
    generateEnemySprite(enemyData) {
        const textureKey = `enemy-sprite-${enemyData.id}`;
        
        // Skip if already generated
        if (this.scene.textures.exists(textureKey)) {
            return textureKey;
        }

        const graphics = this.scene.add.graphics();
        
        // Get size from enemy appearance data
        const sizeKey = enemyData.appearance?.size || 'medium';
        const size = this.enemySizes[sizeKey] || this.enemySizes.medium;
        
        const centerX = size.width / 2;
        const centerY = size.height / 2;

        // Get color from enemy appearance or use default based on type
        let enemyColor = 0xff0000; // Default red
        if (enemyData.appearance?.color) {
            // Convert hex string to number
            const hexColor = enemyData.appearance.color.replace('#', '');
            enemyColor = parseInt(hexColor, 16);
        } else {
            // Use type-based colors
            const typeColors = {
                basic: 0xff0000,
                elite: 0xff8800,
                boss: 0x8800ff
            };
            enemyColor = typeColors[enemyData.type] || 0xff0000;
        }

        const enemyDarkColor = ColorUtils.darken(enemyColor, 0.2);

        // Draw enemy based on appearance shape
        const shape = enemyData.appearance?.shape || 'rectangle';
        
        switch (shape) {
            case 'circle':
                // Round enemy (like slime)
                graphics.fillStyle(enemyColor);
                graphics.fillCircle(centerX, centerY, Math.min(size.width, size.height) / 2);
                // Add highlight
                graphics.fillStyle(ColorUtils.lighten(enemyColor, 0.3));
                graphics.fillCircle(centerX - size.width * 0.1, centerY - size.height * 0.1, size.width * 0.2);
                break;
                
            case 'custom':
                // Custom shape for special enemies (like dragon)
                if (enemyData.id === 'dragon') {
                    this.drawDragonShape(graphics, centerX, centerY, size, enemyColor);
                } else {
                    // Default to rectangle
                    graphics.fillStyle(enemyColor);
                    graphics.fillRoundedRect(0, 0, size.width, size.height, 5);
                }
                break;
                
            default:
                // Rectangle shape (default)
                graphics.fillStyle(enemyColor);
                graphics.fillRoundedRect(0, 0, size.width, size.height, 5);
                
                // Add details based on enemy type
                if (enemyData.type === 'boss') {
                    // Add crown or special marking for bosses
                    graphics.fillStyle(0xffff00); // Gold
                    graphics.fillTriangle(
                        centerX, centerY - size.height / 2,
                        centerX - size.width * 0.2, centerY - size.height / 2 + size.height * 0.2,
                        centerX + size.width * 0.2, centerY - size.height / 2 + size.height * 0.2
                    );
                }
                
                // Add eyes
                graphics.fillStyle(0x000000);
                graphics.fillCircle(centerX - size.width * 0.15, centerY - size.height * 0.1, size.width * 0.1);
                graphics.fillCircle(centerX + size.width * 0.15, centerY - size.height * 0.1, size.width * 0.1);
        }

        // Generate texture
        graphics.generateTexture(textureKey, size.width, size.height);
        graphics.destroy();

        return textureKey;
    }

    /**
     * Draw dragon shape (special case)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} size - Size object
     * @param {number} color - Color value
     */
    drawDragonShape(graphics, x, y, size, color) {
        // Dragon body (elongated oval)
        graphics.fillStyle(color);
        graphics.fillEllipse(x, y, size.width * 0.8, size.height * 0.6);
        
        // Dragon head
        graphics.fillEllipse(x - size.width * 0.3, y, size.width * 0.4, size.height * 0.4);
        
        // Wings
        const wingColor = ColorUtils.darken(color, 0.2);
        graphics.fillStyle(wingColor);
        graphics.fillTriangle(
            x + size.width * 0.2, y - size.height * 0.2,
            x + size.width * 0.4, y - size.height * 0.4,
            x + size.width * 0.3, y
        );
        graphics.fillTriangle(
            x + size.width * 0.2, y + size.height * 0.2,
            x + size.width * 0.4, y + size.height * 0.4,
            x + size.width * 0.3, y
        );
        
        // Eyes
        graphics.fillStyle(0xff0000); // Red eyes
        graphics.fillCircle(x - size.width * 0.35, y - size.height * 0.1, size.width * 0.08);
        graphics.fillCircle(x - size.width * 0.25, y - size.height * 0.1, size.width * 0.08);
    }
}


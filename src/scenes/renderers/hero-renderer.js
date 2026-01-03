/**
 * Hero Renderer - Handles hero sprite creation and rendering
 * Extracted from GameScene to improve separation of concerns
 */

import { RuntimePaladinGenerator } from '../../generators/runtime-paladin-generator.js';
import { SpriteGenerator } from '../../generators/sprite-generator.js';
import { getClassColor } from '../../utils/ui-system.js';
import { DEPTH_LAYERS, setDepth } from '../../utils/depth-layers.js';
import { waitForTextureReady } from '../../utils/texture-helper.js';
import { getPlaceholderKey, ensurePlaceholderTexture } from '../../utils/placeholder-helper.js';
import { Logger } from '../../utils/logger.js';
import { UI_CONFIG, getScaledValue } from '../../config/ui-config.js';

export class HeroRenderer {
    /**
     * Create a new HeroRenderer
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.partyManager = managers.partyManager;
        this.equipmentManager = managers.equipmentManager;
        this.spriteGenerator = new SpriteGenerator(scene);
        this.partyMemberSprites = [];
    }

    /**
     * Setup all party heroes in a compact formation
     * @param {Object} startingPos - Starting position {x, y}
     * @param {Object} startingStats - Base hero stats
     * @param {Object} worldConfig - World configuration
     */
    setupPartyHeroesVertical(startingPos, startingStats, worldConfig) {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        const horizontalSpacing = getScaledValue(UI_CONFIG.FORMATION.INITIAL_HORIZONTAL_SPACING, width);
        const verticalOffset = getScaledValue(UI_CONFIG.FORMATION.INITIAL_VERTICAL_OFFSET, height, 'height');
        const startX = startingPos.x;
        const startY = startingPos.y;

        const partyManager = this.partyManager || this.scene?.partyManager;
        if (!partyManager) {
            Logger.warn('HeroRenderer', 'No party manager found for setup');
            return;
        }

        // Destroy existing sprites
        this.partyMemberSprites.forEach(pm => {
            if (pm.sprite) pm.sprite.destroy();
        });
        this.partyMemberSprites = [];

        const orderedHeroes = this.getHeroesInFormationOrder();
        if (orderedHeroes.length === 0) {
            Logger.warn('HeroRenderer', 'No heroes found in party');
            return;
        }

        const centerIndex = (orderedHeroes.length - 1) / 2;

        for (let i = 0; i < orderedHeroes.length; i++) {
            const hero = orderedHeroes[i];
            if (!hero) continue;

            const isCenterHero = hero.id === 'hero_3';
            let xOffset = (i - centerIndex) * horizontalSpacing;
            let yOffset = (i % 2) * verticalOffset;

            if (isCenterHero) {
                xOffset -= getScaledValue(UI_CONFIG.FORMATION.CENTER_HERO_X_OFFSET, width);
                yOffset -= getScaledValue(UI_CONFIG.FORMATION.CENTER_HERO_Y_OFFSET, height, 'height');
            }

            const xPos = startX + xOffset;
            const yPos = startY - yOffset;

            const classId = hero.classId || 'paladin';
            const classColor = getClassColor(classId);
            const textureKey = `${classId}_dynamic_${hero.id}`;

            // Force remove existing texture to regenerate with new Dragumagu style
            if (this.scene.textures.exists(textureKey)) {
                try {
                    this.scene.textures.remove(textureKey);
                } catch (e) {
                    Logger.debug('HeroRenderer', `Could not remove texture ${textureKey}: ${e.message}`);
                }
            }

            // Generate texture with Dragumagu-style
            const generator = new RuntimePaladinGenerator(this.scene);
            const equipment = this.equipmentManager?.getHeroEquipment(hero.id) || {};
            const itemsData = this.scene.cache.json.get('items') || {};
            generator.generate(equipment, itemsData, classColor, classId, textureKey);

            // Create sprite with placeholder
            const placeholderKey = getPlaceholderKey(this.scene, 'hero');
            ensurePlaceholderTexture(this.scene, {
                key: placeholderKey,
                width: 48, height: 48, color: 0x1f4b99,
                borderColor: 0xffffff, crossColor: 0xb4d0ff
            });

            const sprite = this.scene.add.sprite(xPos, yPos, placeholderKey);
            
            // Ensure sprite is visible and active
            sprite.setVisible(true);
            sprite.setActive(true);
            sprite.setAlpha(1.0);
            
            // Add physics body for movement
            if (this.scene.physics) {
                this.scene.physics.add.existing(sprite);
                if (sprite.body) {
                    sprite.body.setAllowGravity(false);
                    sprite.body.setImmovable(true);
                }
            }
            
            // Set depth and metadata
            const isTank = hero.role === 'tank';
            const isLast = i === orderedHeroes.length - 1;
            const baseDepth = DEPTH_LAYERS.PLAYER || 1000;
            const depthIncrement = 10;
            
            let depth;
            if (isTank || isLast) {
                depth = baseDepth + (orderedHeroes.length * depthIncrement);
            } else if (isCenterHero) {
                depth = baseDepth + ((orderedHeroes.length - 1) * depthIncrement);
            } else {
                depth = baseDepth + (i * depthIncrement);
            }
            
            sprite.setDepth(depth);
            sprite.setData('isPartyMember', true);
            sprite.setData('heroId', hero.id);
            sprite.setData('heroIndex', i);
            sprite.setData('protected', true);
            sprite.setTint(classColor);

            // Protection from accidental destruction
            const originalDestroy = sprite.destroy;
            sprite.destroy = (...args) => {
                Logger.debug('HeroRenderer', `Protected hero sprite ${hero.id} destroy attempt blocked`);
                // If destruction is really needed, the scene should clear partyMemberSprites first
            };

            // Link sprite to hero
            hero.sprite = sprite;
            hero.x = xPos;
            hero.y = yPos;
            hero.xOffset = xOffset;
            hero.yOffset = yOffset;

            // Create hero name label above sprite
            this.createHeroNameLabel(hero, sprite, classColor);

            // Wait for texture
            waitForTextureReady(this.scene, textureKey, () => {
                if (this.scene.textures.exists(textureKey) && sprite && !sprite.destroyed) {
                    sprite.setTexture(textureKey);
                    if (sprite.anims) sprite.anims.stop();
                    
                    // Initialize animations
                    if (this.scene.animationManager) {
                        const characterType = classId || 'paladin';
                        this.scene.animationManager.initializeAnimations(characterType, hero.id).then(() => {
                            const idleKey = this.scene.animationManager.getAnimationKey(characterType, hero.id, 'idle');
                            if (idleKey && this.scene.anims.exists(idleKey) && sprite.anims) {
                                sprite.play(idleKey);
                            }
                        });
                    }
                }
            });

            this.partyMemberSprites.push({
                sprite: sprite,
                hero: hero,
                originalDestroy: originalDestroy
            });
        }

        // Set the "main" hero reference on the scene for legacy system support
        const tank = orderedHeroes.find(h => h.role === 'tank') || orderedHeroes[orderedHeroes.length - 1];
        if (tank && tank.sprite) {
            this.scene.hero = tank.sprite;
            if (this.scene.worldManager) {
                this.scene.worldManager.hero = tank.sprite;
            }
        }

        return this.partyMemberSprites;
    }

    /**
     * Get heroes in formation order: Tank → DPS → DPS → DPS → Healer
     * @returns {Array} Ordered hero array
     */
    getHeroesInFormationOrder() {
        const partyManager = this.partyManager || this.scene?.partyManager;
        if (!partyManager) return [];

        const allHeroes = partyManager.getHeroes();
        if (allHeroes.length === 0) return [];
        if (allHeroes.length !== 5) return allHeroes;

        const tank = partyManager.getTank();
        const dpsHeroes = partyManager.getDPS();
        const healer = partyManager.getHealer();

        // Formation order: Healer(0) → DPS(1) → DPS(2) → DPS(3) → Tank(4)
        return [healer, ...dpsHeroes, tank].filter(Boolean);
    }

    /**
     * Update all hero sprites based on current equipment
     * @param {boolean} forceRegenerate - Force remove and regenerate textures
     */
    updateAllHeroSprites(forceRegenerate = false) {
        const partyManager = this.partyManager || this.scene?.partyManager;
        if (!partyManager) return;

        partyManager.getHeroes().forEach(hero => {
            this.updateHeroSprite(hero, forceRegenerate);
        });
    }

    /**
     * Update a specific hero's sprite
     * @param {Object} hero - The hero to update
     * @param {boolean} forceRegenerate - Force remove and regenerate texture
     */
    updateHeroSprite(hero, forceRegenerate = true) {
        if (!hero || !hero.id) return;

        const classId = hero.classId || 'paladin';
        const classColor = getClassColor(classId);
        const textureKey = `${classId}_dynamic_${hero.id}`;

        // Force remove existing texture to regenerate with new detailed mage style
        if (forceRegenerate && this.scene.textures.exists(textureKey)) {
            try {
                this.scene.textures.remove(textureKey);
                Logger.debug('HeroRenderer', `Removed texture for regeneration: ${textureKey}`);
            } catch (e) {
                Logger.debug('HeroRenderer', `Could not remove texture ${textureKey}: ${e.message}`);
            }
        }

        const generator = new RuntimePaladinGenerator(this.scene);
        const equipment = this.equipmentManager?.getHeroEquipment(hero.id) || {};
        const itemsData = this.scene.cache.json.get('items') || {};
        
        generator.generate(equipment, itemsData, classColor, classId, textureKey);

        if (hero.sprite && !hero.sprite.destroyed) {
            waitForTextureReady(this.scene, textureKey, () => {
                if (this.scene.textures.exists(textureKey)) {
                    hero.sprite.setTexture(textureKey);
                    Logger.debug('HeroRenderer', `Updated sprite texture for ${hero.id}`);
                }
            });
        }
    }

    /**
     * Create hero name label above/below sprite
     * @param {Object} hero - Hero object
     * @param {Phaser.GameObjects.Sprite} sprite - Hero sprite
     * @param {number} classColor - Class color hex value
     */
    createHeroNameLabel(hero, sprite, classColor) {
        const config = UI_CONFIG.HERO_LABELS;
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;
        
        // Remove existing label if present
        if (hero.nameLabel) {
            hero.nameLabel.destroy();
        }

        const heroName = hero.name || `Hero ${hero.id}`;
        const labelY = config.SHOW_ABOVE 
            ? sprite.y + getScaledValue(config.Y_OFFSET, height, 'height')
            : sprite.y - getScaledValue(config.Y_OFFSET, height, 'height');

        // Create label container
        const labelContainer = this.scene.add.container(sprite.x, labelY);
        labelContainer.setDepth(sprite.depth + 1);
        labelContainer.setScrollFactor(0); // Follow camera

        // Background (optional)
        if (config.SHOW_BACKGROUND) {
            const fontSize = getScaledValue(config.FONT_SIZE, height, 'height');
            const paddingX = getScaledValue(config.BACKGROUND_PADDING_X, width);
            const paddingY = getScaledValue(config.BACKGROUND_PADDING_Y, height, 'height');
            
            // Estimate text width (approximate)
            const estimatedWidth = heroName.length * (fontSize * 0.6) + paddingX * 2;
            const bgHeight = fontSize + paddingY * 2;
            
            const bg = this.scene.add.graphics();
            bg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
            bg.fillRoundedRect(
                -estimatedWidth / 2, 
                -bgHeight / 2, 
                estimatedWidth, 
                bgHeight, 
                config.BACKGROUND_CORNER_RADIUS
            );
            labelContainer.add(bg);
        }

        // Name text with class color
        const fontSize = getScaledValue(config.FONT_SIZE, height, 'height');
        const colorHex = `#${classColor.toString(16).padStart(6, '0')}`;
        const nameText = this.scene.add.text(0, 0, heroName, {
            font: `bold ${fontSize}px Arial`,
            fill: colorHex,
            stroke: config.STROKE_COLOR,
            strokeThickness: getScaledValue(config.STROKE_WIDTH, height, 'height'),
            shadow: {
                offsetX: getScaledValue(config.SHADOW_OFFSET_X, width),
                offsetY: getScaledValue(config.SHADOW_OFFSET_Y, height, 'height'),
                color: config.SHADOW_COLOR,
                blur: getScaledValue(config.SHADOW_BLUR, width),
                fill: true
            }
        });
        nameText.setOrigin(0.5, 0.5);
        labelContainer.add(nameText);

        // Update background size based on actual text width
        if (config.SHOW_BACKGROUND && labelContainer.list[0]) {
            const textWidth = nameText.width;
            const paddingX = getScaledValue(config.BACKGROUND_PADDING_X, width);
            const paddingY = getScaledValue(config.BACKGROUND_PADDING_Y, height, 'height');
            const bgWidth = textWidth + paddingX * 2;
            const bgHeight = fontSize + paddingY * 2;
            
            labelContainer.list[0].clear();
            labelContainer.list[0].fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
            labelContainer.list[0].fillRoundedRect(
                -bgWidth / 2, 
                -bgHeight / 2, 
                bgWidth, 
                bgHeight, 
                config.BACKGROUND_CORNER_RADIUS
            );
        }

        // Fade in animation
        labelContainer.setAlpha(0);
        this.scene.tweens.add({
            targets: labelContainer,
            alpha: 1,
            duration: config.FADE_IN_DURATION,
            ease: 'Power2'
        });

        // Store label reference
        hero.nameLabel = labelContainer;
        sprite.nameLabel = labelContainer;

        // Update label position when sprite moves (if enabled)
        if (config.FOLLOW_SPRITE) {
            const updateLabelPosition = () => {
                if (labelContainer && sprite && !sprite.destroyed) {
                    labelContainer.x = sprite.x;
                    labelContainer.y = config.SHOW_ABOVE 
                        ? sprite.y + getScaledValue(config.Y_OFFSET, height, 'height')
                        : sprite.y - getScaledValue(config.Y_OFFSET, height, 'height');
                }
            };
            
            // Update on sprite position changes
            sprite.on('changedata', updateLabelPosition);
            
            // Also update periodically (fallback)
            this.scene.time.addEvent({
                delay: 100,
                callback: updateLabelPosition,
                loop: true
            });
        }
    }

    /**
     * Clean up all hero sprites
     */
    destroy() {
        this.partyMemberSprites.forEach(pm => {
            if (pm.sprite) {
                // Destroy name label
                if (pm.hero?.nameLabel) {
                    pm.hero.nameLabel.destroy();
                    pm.hero.nameLabel = null;
                }
                
                // Use original destroy method to bypass protection
                if (pm.originalDestroy) {
                    pm.originalDestroy.call(pm.sprite);
                } else {
                    pm.sprite.destroy();
                }
            }
        });
        this.partyMemberSprites = [];
    }
}

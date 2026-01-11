/**
 * Unified Asset Generator
 * Orchestrator that provides a single generate() method for all asset types
 * This is the ONLY place to add new asset types - no new generators needed
 */

import { createCanvas } from 'canvas';
import { BaseGenerator } from './generators/base-generator.js';
import { HeroSpriteGenerator } from './generators/hero-sprite-generator.js';
import { SpellIconGenerator } from './generators/spell-icon-generator.js';
import { EnemySpriteGenerator } from './generators/enemy-sprite-generator.js';
import { ItemIconGenerator } from './generators/item-icon-generator.js';
import { ProjectileGenerator } from './generators/projectile-generator.js';
import { VFXGenerator } from './generators/vfx-generator.js';
import { AnimationGenerator } from './generators/animation-generator.js';
import { EquipmentSpriteGenerator } from './generators/equipment-sprite-generator.js';
import { setupCanvasContext } from './utils/canvas-utils.js';
import { ensureVisibleFill } from './utils/color-utils.js';

export class UnifiedAssetGenerator {
    constructor(config = {}) {
        // Specialized generators (class-based) - ALL INTEGRATED
        this.heroGenerator = new HeroSpriteGenerator(config.hero || {});
        this.spellIconGenerator = new SpellIconGenerator();
        this.enemyGenerator = new EnemySpriteGenerator(config.enemy || { size: 128 });
        this.itemIconGenerator = new ItemIconGenerator(config.itemIcon || { size: 48 });
        this.projectileGenerator = new ProjectileGenerator(config.projectile || { size: 32 });
        this.vfxGenerator = new VFXGenerator(config.vfx || { size: 64 });
        this.equipmentGenerator = new EquipmentSpriteGenerator(config.equipment || { size: 128 });
        this.animationGenerator = new AnimationGenerator();
    }
    
    /**
     * Generate an asset of the specified type
     * @param {string} type - Asset type ('hero', 'spell_icon', 'enemy', 'item_icon', 'projectile', 'vfx', 'equipment', 'animation')
     * @param {Object} data - Asset data
     * @param {Object} options - Generation options (size, heroId, enemyId, etc.)
     * @returns {Promise<HTMLCanvasElement>} Generated asset canvas
     */
    async generate(type, data, options = {}) {
        switch(type) {
            case 'hero':
                return this.heroGenerator.generate(data, options.heroId || 'hero_0');
                
            case 'spell_icon':
                return this.spellIconGenerator.generate(data, options.abilityId || 'ability_0', options.size || 48);
                
            case 'enemy':
                return this.enemyGenerator.generate(data, options.enemyId || 'enemy_0');
                
            case 'item_icon':
                const itemId = options.itemId || data.id || 'item_0';
                return await this.itemIconGenerator.generate(data, itemId, {
                    texturePath: options.texturePath || null,
                    canUseTexture: options.canUseTexture || false
                });
                
            case 'projectile':
                return this.projectileGenerator.generate(data);
                
            case 'vfx':
                return this.vfxGenerator.generate(data);

            case 'equipment':
                return this.equipmentGenerator.generate(data, options.itemId || 'equipment_0');

            case 'animation_frame':
                // Generate a single animation frame using HeroSpriteGenerator
                const animationName = options.animation || 'idle';
                const frameNum = options.frame || 0;
                const dir = options.direction || 'front';
                const heroId = options.heroId || 'hero_0';
                return this.heroGenerator.generateAnimationFrame(animationName, dir, frameNum, data, heroId);
                
            case 'animation':
                // Animation generation from base sprite
                const baseSprite = options.baseSprite || null;
                const animation = options.animation || 'idle';
                const frameCount = options.frameCount || 4;
                
                if (!baseSprite) {
                    throw new Error('Animation generation requires baseSprite');
                }
                
                switch(animation) {
                    case 'idle':
                        return this.animationGenerator.generateIdleFrames(baseSprite, frameCount);
                    case 'walk':
                        return this.animationGenerator.generateWalkFrames(baseSprite, frameCount);
                    case 'attack':
                        return this.animationGenerator.generateAttackFrames(baseSprite, frameCount);
                    case 'jump':
                        return this.animationGenerator.generateJumpFrames(baseSprite, frameCount);
                    case 'death':
                        return this.animationGenerator.generateDeathFrames(baseSprite, frameCount);
                    default:
                        return this.animationGenerator.generateIdleFrames(baseSprite, frameCount);
                }
                
            default:
                throw new Error(`Unknown asset type: ${type}`);
        }
    }
    
    /**
     * Generate all assets (orchestrates all generation)
     * @param {Object} config - Configuration for all asset types
     * @returns {Promise<Object>} Results object with all generated assets
     */
    async generateAll(config = {}) {
        const results = {
            heroes: [],
            spell_icons: [],
            enemies: [],
            item_icons: [],
            projectiles: [],
            vfx: []
        };
        
        // Generate heroes
        if (config.heroes) {
            for (const hero of config.heroes) {
                const canvas = await this.generate('hero', hero.data, { heroId: hero.id });
                results.heroes.push({ id: hero.id, canvas });
            }
        }
        
        // Generate spell icons
        if (config.spellIcons) {
            for (const spell of config.spellIcons) {
                const canvas = await this.generate('spell_icon', spell.data, { abilityId: spell.id, size: config.iconSize || 48 });
                results.spell_icons.push({ id: spell.id, canvas });
            }
        }
        
        // Generate enemies
        if (config.enemies) {
            for (const enemy of config.enemies) {
                const canvas = await this.generate('enemy', enemy.data, { enemyId: enemy.id, size: config.enemySize || 64 });
                results.enemies.push({ id: enemy.id, canvas });
            }
        }
        
        // Generate item icons
        if (config.itemIcons) {
            for (const item of config.itemIcons) {
                const canvas = await this.generate('item_icon', item.data, { itemId: item.id, size: config.itemIconSize || 48 });
                results.item_icons.push({ id: item.id, canvas });
            }
        }
        
        // Generate projectiles
        if (config.projectiles) {
            for (const projectile of config.projectiles) {
                const canvas = await this.generate('projectile', projectile.data, { projectileId: projectile.id, size: config.projectileSize || 32 });
                results.projectiles.push({ id: projectile.id, canvas });
            }
        }
        
        // Generate VFX
        if (config.vfx) {
            for (const vfx of config.vfx) {
                const canvas = await this.generate('vfx', vfx.data, { vfxId: vfx.id, size: config.vfxSize || 64 });
                results.vfx.push({ id: vfx.id, canvas });
            }
        }
        
        return results;
    }
}

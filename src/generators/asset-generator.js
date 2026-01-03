/**
 * Asset Generator - Main coordinator for procedural asset generation
 * Generates all visual game assets programmatically using Canvas API and Phaser Graphics
 */

import { ItemIconGenerator } from './item-icon-generator.js';
import { SpriteGenerator } from './sprite-generator.js';
import { TerrainGenerator } from './terrain-generator.js';
import { UIGenerator } from './ui-generator.js';
import { AnimationGenerator } from './animation-generator.js';
import { Logger } from '../utils/logger.js';
import { SpriteSheetGenerator } from './sprite-sheet-generator.js';
import { TextureAtlasGenerator } from './texture-atlas-generator.js';

export class AssetGenerator {
    constructor(scene) {
        this.scene = scene;
        this.itemIconGenerator = null;
        this.spriteGenerator = null;
        this.terrainGenerator = null;
        this.uiGenerator = null;
        this.animationGenerator = null;
        this.spriteSheetGenerator = null;
        this.textureAtlasGenerator = null;
        
        this.generatedAssets = new Set();
        this.animationMetadata = {}; // Store animation metadata
    }

    /**
     * Initialize all generators
     */
    init() {
        this.itemIconGenerator = new ItemIconGenerator(this.scene);
        this.spriteGenerator = new SpriteGenerator(this.scene);
        this.terrainGenerator = new TerrainGenerator(this.scene);
        this.uiGenerator = new UIGenerator(this.scene);
        this.animationGenerator = new AnimationGenerator(this.scene);
        this.spriteSheetGenerator = new SpriteSheetGenerator(this.scene);
        this.textureAtlasGenerator = new TextureAtlasGenerator(this.scene);
    }

    /**
     * Generate all assets during preload
     * @param {Function} progressCallback - Optional callback for progress updates
     */
    async generateAllAssets(progressCallback = null) {
        if (!this.itemIconGenerator) {
            this.init();
        }

        const totalSteps = 5;
        let currentStep = 0;

        // Generate item icons
        if (progressCallback) {
            progressCallback(currentStep / totalSteps, 'Generating item icons...');
        }
        await this.generateItemIcons();
        currentStep++;

        // Create texture atlas from item icons
        if (progressCallback) {
            progressCallback(currentStep / totalSteps, 'Creating texture atlas...');
        }
        await this.createItemIconAtlas();
        currentStep++;

        // Generate character sprites
        if (progressCallback) {
            progressCallback(currentStep / totalSteps, 'Generating sprites...');
        }
        await this.generateSprites();
        currentStep++;

        // Generate terrain tiles
        if (progressCallback) {
            progressCallback(currentStep / totalSteps, 'Generating terrain...');
        }
        await this.generateTerrain();
        currentStep++;

        // Generate UI elements
        if (progressCallback) {
            progressCallback(currentStep / totalSteps, 'Generating UI elements...');
        }
        await this.generateUI();
        currentStep++;

        if (progressCallback) {
            progressCallback(1.0, 'Assets generated!');
        }
    }

    /**
     * Generate all item icons from items.json
     */
    async generateItemIcons() {
        if (!this.itemIconGenerator) {
            this.itemIconGenerator = new ItemIconGenerator(this.scene);
        }

        const itemsData = this.scene.cache.json.get('items');
        if (!itemsData) {
            Logger.warn('AssetGenerator', 'Items data not loaded yet');
            return;
        }

        // Generate icons for all item categories
        const categories = ['weapons', 'armor', 'accessories'];
        
        for (const category of categories) {
            if (itemsData[category]) {
                for (const itemId in itemsData[category]) {
                    const item = itemsData[category][itemId];
                    const textureKey = `item-icon-${item.id}`;
                    
                    if (!this.scene.textures.exists(textureKey)) {
                        this.itemIconGenerator.generateIcon(item);
                        this.generatedAssets.add(textureKey);
                    }
                }
            }
        }
    }

    /**
     * Create texture atlas from generated item icons
     */
    async createItemIconAtlas() {
        if (!this.textureAtlasGenerator) {
            this.textureAtlasGenerator = new TextureAtlasGenerator(this.scene);
        }

        const itemsData = this.scene.cache.json.get('items');
        if (!itemsData) {
            Logger.warn('AssetGenerator', 'Items data not loaded yet');
            return;
        }

        const atlasData = this.textureAtlasGenerator.createItemIconAtlas(itemsData, this.itemIconGenerator);
        if (atlasData) {
            Logger.info('AssetGenerator', `Created item icon atlas with ${atlasData.iconCount} icons`);
        }
    }

    /**
     * Generate character sprites
     */
    async generateSprites() {
        if (!this.spriteGenerator) {
            this.spriteGenerator = new SpriteGenerator(this.scene);
        }

        // Generate hero sprite (force regeneration to use new AAA-quality system)
        this.spriteGenerator.generateHeroSprite(true); // Force regenerate with new layered system
        this.generatedAssets.add('hero-sprite');

        // Generate enemy sprites
        const enemiesData = this.scene.cache.json.get('enemies');
        if (enemiesData) {
            for (const enemyId in enemiesData) {
                const enemy = enemiesData[enemyId];
                const textureKey = `enemy-sprite-${enemy.id}`;
                
                if (!this.scene.textures.exists(textureKey)) {
                    this.spriteGenerator.generateEnemySprite(enemy);
                    this.generatedAssets.add(textureKey);
                }
            }
        }
    }

    /**
     * Generate terrain tiles
     */
    async generateTerrain() {
        if (!this.terrainGenerator) {
            this.terrainGenerator = new TerrainGenerator(this.scene);
        }

        this.terrainGenerator.generateTerrainTiles();
    }

    /**
     * Generate UI elements
     */
    async generateUI() {
        if (!this.uiGenerator) {
            this.uiGenerator = new UIGenerator(this.scene);
        }

        this.uiGenerator.generateUIElements();
    }

    /**
     * Get texture key for an item icon
     * @param {string} itemId - Item ID
     * @returns {string} Texture key
     */
    getItemIconKey(itemId) {
        return `item-icon-${itemId}`;
    }

    /**
     * Check if an asset has been generated
     * @param {string} textureKey - Texture key to check
     * @returns {boolean} True if generated
     */
    isAssetGenerated(textureKey) {
        return this.generatedAssets.has(textureKey) || 
               this.scene.textures.exists(textureKey);
    }

    /**
     * Generate animations for a character
     * @param {string} characterType - Character type (paladin, warrior, etc.)
     * @param {Array} animationNames - Array of animation names to generate
     * @returns {Promise<Object>} Animation metadata
     */
    async generateAnimations(characterType, animationNames = ['idle', 'walk', 'attack', 'defend', 'heal']) {
        if (!this.animationGenerator) {
            this.animationGenerator = new AnimationGenerator(this.scene);
        }

        const animations = {};
        
        for (const animName of animationNames) {
            // Generate frames
            const frames = this.animationGenerator.generateAnimationFrames(characterType, animName);
            
            // Create sprite sheet
            const { atlasKey, metadata } = this.spriteSheetGenerator.createOptimizedAtlas(
                frames,
                `${characterType}-${animName}`,
                { frameWidth: 40, frameHeight: 60 }
            );
            
            // Create animation metadata
            const animMetadata = this.animationGenerator.createAnimationMetadata(
                characterType,
                animName,
                frames,
                animName === 'attack' ? 15 : 12, // Faster frame rate for attack
                animName !== 'attack' // Loop all except attack
            );
            
            animations[animName] = {
                ...animMetadata,
                atlas: atlasKey,
                frameMetadata: metadata
            };
        }

        // Store metadata
        this.animationMetadata[characterType] = animations;
        
        return animations;
    }

    /**
     * Generate character with animations
     * @param {string} characterType - Character type
     * @param {Array} animationNames - Animation names to generate
     * @returns {Promise<Object>} Complete character asset set
     */
    async generateCharacterWithAnimations(characterType, animationNames = ['idle', 'walk', 'attack', 'defend', 'heal']) {
        // Generate static sprite first
        if (characterType === 'paladin' || characterType === 'hero') {
            this.spriteGenerator.generateHeroSprite();
        }
        
        // Generate animations
        const animations = await this.generateAnimations(characterType, animationNames);
        
        return {
            staticSprite: characterType === 'paladin' || characterType === 'hero' ? 'hero-sprite' : null,
            animations: animations,
            metadata: this.animationMetadata[characterType]
        };
    }

    /**
     * Get animation metadata for a character
     * @param {string} characterType - Character type
     * @returns {Object|null} Animation metadata or null
     */
    getAnimationMetadata(characterType) {
        return this.animationMetadata[characterType] || null;
    }
}


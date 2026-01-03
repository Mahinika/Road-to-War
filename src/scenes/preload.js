import Phaser from 'phaser';
import { Logger } from '../utils/logger.js';
import { registerDefaultPlaceholders, backfillMissingAsset, ensurePlaceholderTexture } from '../utils/placeholder-helper.js';
import { dataValidator } from '../utils/data-validator.js';
import { AssetLoader } from '../utils/asset-loader.js';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
        this.missingAssets = [];
        this.placeholderKeys = null;
    }

    preload() {
        // Generate placeholder textures up front so any load errors have safe fallbacks
        this.placeholderKeys = registerDefaultPlaceholders(this);

        // Create enhanced loading screen
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;
        
        // Ensure camera matches viewport
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.centerOn(width / 2, height / 2);
        
        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // Game title
        const title = this.add.text(width / 2, height / 2 - 150, 'Road of War', {
            font: 'bold 48px Arial',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4
        });
        title.setOrigin(0.5, 0.5);
        
        // Loading text
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px Arial',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // Progress percentage text
        const percentText = this.make.text({
            x: width / 2,
            y: height / 2 + 60,
            text: '0%',
            style: {
                font: '16px Arial',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        // Create progress bar background
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 50);
        progressBox.lineStyle(2, 0xffff00);
        progressBox.strokeRect(width / 2 - 160, height / 2, 320, 50);

        // Listen to progress events
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 + 10, 300 * value, 30);
            
            // Update percentage
            percentText.setText(Math.round(value * 100) + '%');
        });

        // Capture load errors and backfill missing assets with placeholders
        this.load.on('loaderror', (fileObj) => {
            const entry = {
                key: fileObj?.key,
                type: fileObj?.type,
                src: fileObj?.src
            };
            this.missingAssets.push(entry);
            Logger.warn('PreloadScene', 'Asset failed to load; generating placeholder', entry);
            if (fileObj?.key) {
                backfillMissingAsset(this, fileObj.key, 64);
            }
        });

        this.load.on('complete', () => {
            // Validate all loaded data files
            Logger.info('PreloadScene', 'Validating loaded data files...');
            const validationSummary = dataValidator.validateAllDataFiles(this);

            // Log validation summary
            if (validationSummary.invalidFiles > 0) {
                Logger.error('PreloadScene', `Data validation failed: ${validationSummary.invalidFiles} invalid files, ${validationSummary.totalErrors} errors`);
            } else {
                Logger.info('PreloadScene', `Data validation passed: ${validationSummary.validFiles} valid files`);
            }

            // Ensure fallback textures exist for keys we know we need
            ensurePlaceholderTexture(this, { key: 'paladin', width: 48, height: 48, color: 0x1f4b99 });
            ensurePlaceholderTexture(this, { key: 'paladin_dynamic', width: 48, height: 48, color: 0x1f4b99 });

            // Persist placeholder mapping for all other scenes
            if (this.placeholderKeys) {
                this.registry.set('placeholderTextures', this.placeholderKeys);
            }

            if (this.missingAssets.length > 0) {
                Logger.warn('PreloadScene', 'Some assets failed to load; placeholders applied', this.missingAssets);
            }

            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            
            // Fade out transition
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('MainScene');
            });
        });

        // Check if running in Electron or browser
        const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
        const assetPath = isElectron ? './assets/sprites/' : '/assets/sprites/';
        const imagePath = isElectron ? './assets/images/' : '/assets/images/';
        const dataPath = isElectron ? './data/' : '/data/';
        
        // CRITICAL ASSETS - Load immediately (required for game to start)
        // All JSON data files are critical - needed by managers immediately
        this.load.json('items', dataPath + 'items.json');
        this.load.json('enemies', dataPath + 'enemies.json');
        this.load.json('worldConfig', dataPath + 'world-config.json');
        this.load.json('achievements', dataPath + 'achievements.json');
        this.load.json('prestigeConfig', dataPath + 'prestige-config.json');
        
        // Load 5-man team system data files
        this.load.json('classes', dataPath + 'classes.json');
        this.load.json('specializations', dataPath + 'specializations.json');
        this.load.json('talents', dataPath + 'talents.json');
        this.load.json('stats-config', dataPath + 'stats-config.json');
        
        // Load Pixel Exile-inspired systems
        this.load.json('bloodlines', dataPath + 'bloodlines.json');
        this.load.json('skillGems', dataPath + 'skill-gems.json');
        
        // Load animation configuration files
        this.load.json('animation-config', dataPath + 'animation-config.json');
        this.load.json('keyframe-configs', dataPath + 'keyframe-configs.json');
        
        // Essential sprites for main menu
        this.load.image('menu-background', imagePath + 'menu-background.jpg');
        this.load.image('paladin', assetPath + 'paladin.png');
        
        // Store asset paths for lazy loading (will be used by AssetLoader)
        this.registry.set('assetPaths', {
            assetPath,
            imagePath,
            dataPath,
            isElectron
        });
    }

    create() {
        // Initialize AssetLoader for lazy loading
        const assetLoader = new AssetLoader(this);
        this.registry.set('assetLoader', assetLoader);
        
        // Assets are pre-generated at build time, so we can go straight to main menu
        this.scene.start('MainScene');
    }
}

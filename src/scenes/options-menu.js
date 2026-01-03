import Phaser from 'phaser';
import { AudioManager } from '../managers/audio-manager.js';
import { saveManager } from '../utils/save-manager.js';
import { Logger } from '../utils/logger.js';

export class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
    }

    async create() {
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;
        
        // Ensure camera matches viewport
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.centerOn(width / 2, height / 2);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Initialize AudioManager for this scene
        this.audioManager = new AudioManager(this);
        this.audioManager.init();

        // Load current settings
        await this.loadSettings();

        // Initialize menu elements array first
        this.menuElements = [];
        this.sliders = {};
        this.toggles = {};

        // Title
        const title = this.add.text(width / 2, height / 6, 'OPTIONS', {
            font: 'bold 36px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        title.setOrigin(0.5, 0.5);
        this.menuElements.push(title);

        // Options sections
        this.createAudioSection(width, height);
        this.createGameplaySection(width, height);
        this.createVideoSection(width, height);

        // Back button
        const backButton = this.createButton(width / 2, height - 80, 'Back to Menu', async () => {
            await this.saveSettings();
            this.audioManager.destroy();
            this.scene.start('MainScene');
        });
        this.menuElements.push(backButton);

    }

    /**
     * Cleanup method for scene shutdown
     */
    shutdown() {
        // Clean up all menu elements
        if (this.menuElements) {
            this.menuElements.forEach(element => {
                if (element && element.destroy) element.destroy();
            });
            this.menuElements = [];
        }
        
        // Clean up sliders
        if (this.sliders) {
            Object.values(this.sliders).forEach(slider => {
                if (slider) {
                    if (slider.track && slider.track.destroy) slider.track.destroy();
                    if (slider.handle && slider.handle.destroy) slider.handle.destroy();
                    if (slider.valueText && slider.valueText.destroy) slider.valueText.destroy();
                }
            });
            this.sliders = {};
        }
        
        // Clean up toggles
        if (this.toggles) {
            Object.values(this.toggles).forEach(toggle => {
                if (toggle && toggle.destroy) toggle.destroy();
            });
            this.toggles = {};
        }
        
        // Clean up audio manager
        if (this.audioManager) {
            this.audioManager.destroy();
        }
    }

    /**
     * Load current settings from save
     */
    async loadSettings() {
        try {
            const recent = await saveManager.getMostRecentSlot();
            if (recent) {
                const saveData = await saveManager.loadGame(recent);
                if (saveData && saveData.settings) {
                    this.settings = { ...saveData.settings };
                } else {
                    this.settings = this.getDefaultSettings();
                }
            } else {
                this.settings = this.getDefaultSettings();
            }
        } catch (error) {
            Logger.warn('OptionsMenu', 'Failed to load settings:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            masterVolume: 0.8,
            sfxVolume: 0.7,
            musicVolume: 0.6,
            autoSpeed: true,
            showDamageNumbers: true,
            fullscreen: false,
            particleEffects: true
        };
    }

    /**
     * Save settings to save file
     */
    async saveSettings() {
        try {
            const recent = (await saveManager.getMostRecentSlot()) || 1;
            const worldConfig = this.cache.json.get('worldConfig');
            let saveData = await saveManager.loadGame(recent);
            
            if (!saveData) {
                saveData = saveManager.createDefaultSaveData(worldConfig);
            }
            
            if (!saveData.settings) {
                saveData.settings = {};
            }
            
            Object.assign(saveData.settings, this.settings);
            await saveManager.saveGame(saveData, recent);
        } catch (error) {
            Logger.warn('OptionsMenu', 'Failed to save settings:', error);
        }
    }

    createAudioSection(width, height) {
        const startX = width / 4;
        const startY = height / 4;

        // Section title
        const audioTitle = this.add.text(startX, startY, 'Audio', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        // Master Volume
        const masterLabel = this.add.text(startX, startY + 30, 'Master Volume:', {
            font: '16px Arial',
            fill: '#ffffff'
        });

        const masterValue = this.settings.masterVolume || 0.8;
        const masterSlider = this.createSlider(
            startX + 150, 
            startY + 30, 
            200, 
            masterValue,
            (value) => {
                this.settings.masterVolume = value;
                this.audioManager.setMasterVolume(value);
            }
        );
        
        // Sound Effects Volume
        const sfxLabel = this.add.text(startX, startY + 50, 'Sound Effects:', {
            font: '16px Arial',
            fill: '#ffffff'
        });

        const sfxValue = this.settings.sfxVolume || 0.7;
        const sfxSlider = this.createSlider(
            startX + 150, 
            startY + 50, 
            200, 
            sfxValue,
            (value) => {
                this.settings.sfxVolume = value;
                this.audioManager.setSFXVolume(value);
            }
        );

        // Music Volume
        const musicLabel = this.add.text(startX, startY + 70, 'Music Volume:', {
            font: '16px Arial',
            fill: '#ffffff'
        });

        const musicValue = this.settings.musicVolume || 0.6;
        const musicSlider = this.createSlider(
            startX + 150, 
            startY + 70, 
            200, 
            musicValue,
            (value) => {
                this.settings.musicVolume = value;
                this.audioManager.setMusicVolume(value);
            }
        );

        this.menuElements.push(audioTitle, masterLabel, sfxLabel, musicLabel);
        this.sliders.master = masterSlider;
        this.sliders.sfx = sfxSlider;
        this.sliders.music = musicSlider;
    }

    createGameplaySection(width, height) {
        const startX = width / 4;
        const startY = height / 2.5;
        const sectionHeight = 80;

        // Section title
        const gameplayTitle = this.add.text(startX, startY, 'Gameplay', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        // Auto-speed toggle
        const autoSpeedLabel = this.add.text(startX, startY + 30, 'Auto-Speed:', {
            font: '16px Arial',
            fill: '#ffffff'
        });

        const autoSpeedToggle = this.createToggle(
            startX + 150, 
            startY + 30, 
            this.settings.autoSpeed !== undefined ? this.settings.autoSpeed : true, 
            (enabled) => {
                this.settings.autoSpeed = enabled;
                Logger.debug('OptionsMenu', 'Auto-speed:', enabled);
            }
        );
        this.toggles.autoSpeed = autoSpeedToggle;
        this.menuElements.push(autoSpeedToggle);

        // Show damage numbers
        const damageLabel = this.add.text(startX, startY + 50, 'Damage Numbers:', {
            font: '16px Arial',
            fill: '#ffffff'
        });

        const damageToggle = this.createToggle(
            startX + 150, 
            startY + 50, 
            this.settings.showDamageNumbers !== undefined ? this.settings.showDamageNumbers : true, 
            (enabled) => {
                this.settings.showDamageNumbers = enabled;
                Logger.debug('OptionsMenu', 'Damage numbers:', enabled);
            }
        );
        this.toggles.showDamageNumbers = damageToggle;
        this.menuElements.push(damageToggle);

        this.menuElements.push(gameplayTitle, autoSpeedLabel, damageLabel);
    }

    createVideoSection(width, height) {
        const startX = width / 4;
        const startY = height / 1.7;
        const sectionHeight = 80;

        // Section title
        const videoTitle = this.add.text(startX, startY, 'Video', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        // Fullscreen toggle
        const fullscreenLabel = this.add.text(startX, startY + 30, 'Fullscreen:', {
            font: '16px Arial',
            fill: '#ffffff'
        });

        const fullscreenToggle = this.createToggle(
            startX + 150, 
            startY + 30, 
            this.settings.fullscreen !== undefined ? this.settings.fullscreen : false, 
            (enabled) => {
                if (enabled) {
                    this.scale.startFullscreen();
                } else {
                    this.scale.stopFullscreen();
                }
                this.settings.fullscreen = enabled;
            }
        );
        this.toggles.fullscreen = fullscreenToggle;
        this.menuElements.push(fullscreenToggle);

        // Particle effects toggle
        const particlesLabel = this.add.text(startX, startY + 50, 'Particle Effects:', {
            font: '16px Arial',
            fill: '#ffffff'
        });

        const particlesToggle = this.createToggle(
            startX + 150, 
            startY + 50, 
            this.settings.particleEffects !== undefined ? this.settings.particleEffects : true, 
            (enabled) => {
                this.settings.particleEffects = enabled;
                Logger.debug('OptionsMenu', 'Particle effects:', enabled);
            }
        );
        this.toggles.particleEffects = particlesToggle;
        this.menuElements.push(particlesToggle);

        this.menuElements.push(videoTitle, fullscreenLabel, particlesLabel);
    }


    createSlider(x, y, width, defaultValue, onChange) {
        // Background track
        const track = this.add.rectangle(x, y, width, 8, 0x333333);
        
        // Slider handle
        const handleX = x - (width / 2) + (width * defaultValue);
        const handle = this.add.circle(handleX, y, 12, 0x00ff00);
        handle.setInteractive({ useHandCursor: true, draggable: true });

        // Value text display
        const valueText = this.add.text(x + width / 2 + 30, y, Math.round(defaultValue * 100) + '%', {
            font: '14px Arial',
            fill: '#ffffff'
        });
        valueText.setOrigin(0, 0.5);

        // Handle dragging
        const updateValue = (dragX) => {
            const clampedX = Phaser.Math.Clamp(dragX, x - (width / 2), x + (width / 2));
            handle.x = clampedX;
            
            // Calculate value (0 to 1)
            const value = Math.max(0, Math.min(1, (clampedX - (x - width / 2)) / width));
            
            // Update display
            valueText.setText(Math.round(value * 100) + '%');
            
            // Call onChange callback
            if (onChange) {
                onChange(value);
            }
        };

        handle.on('drag', (pointer, dragX) => {
            updateValue(dragX);
        });

        // Also allow clicking on track
        track.setInteractive({ useHandCursor: true });
        track.on('pointerdown', (pointer) => {
            const localX = pointer.x - track.x;
            updateValue(track.x - (width / 2) + localX);
        });

        // Visual feedback
        handle.on('pointerover', () => {
            handle.setFillStyle(0xffff00);
        });

        handle.on('pointerout', () => {
            handle.setFillStyle(0x00ff00);
        });

        return { track, handle, valueText };
    }

    createToggle(x, y, defaultValue, callback) {
        const toggleGroup = this.add.container(x, y);
        
        // Toggle background
        const bg = this.add.rectangle(0, 0, 60, 30, defaultValue ? 0x00ff00 : 0xff0000);
        
        // Toggle text
        const text = this.add.text(0, 0, defaultValue ? 'ON' : 'OFF', {
            font: 'bold 14px Arial',
            fill: '#ffffff'
        });
        text.setOrigin(0.5, 0.5);

        // Make interactive
        const hitArea = this.add.rectangle(0, 0, 60, 30, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });

        let isOn = defaultValue;

        hitArea.on('pointerdown', () => {
            isOn = !isOn;
            bg.setFillStyle(isOn ? 0x00ff00 : 0xff0000);
            text.setText(isOn ? 'ON' : 'OFF');
            callback(isOn);
        });

        // Visual feedback
        hitArea.on('pointerover', () => {
            bg.setAlpha(0.8);
        });

        hitArea.on('pointerout', () => {
            bg.setAlpha(1.0);
        });

        toggleGroup.add([bg, text, hitArea]);
        
        return toggleGroup;
    }

    createButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, {
            font: '20px Arial',
            fill: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        });
        
        button.setOrigin(0.5, 0.5);
        button.setInteractive({ useHandCursor: true });

        // Button hover effects
        button.on('pointerover', () => {
            button.setStyle({ fill: '#ffff00' });
        });

        button.on('pointerout', () => {
            button.setStyle({ fill: '#ffffff' });
        });

        button.on('pointerdown', callback);

        return button;
    }
}

/**
 * Terrain Generator - Generates procedural terrain tiles and backgrounds
 * Creates ground tiles, background elements, and encounter markers
 */

import { ColorUtils } from './utils/color-utils.js';

export class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.tileSize = 64; // Standard tile size
    }

    /**
     * Generate terrain tiles
     */
    generateTerrainTiles() {
        // Generate ground tile
        this.generateGroundTile();
        
        // Generate background tiles
        this.generateBackgroundTiles();
        
        // Generate encounter markers
        this.generateEncounterMarkers();
    }

    /**
     * Generate ground tile
     */
    generateGroundTile() {
        const textureKey = 'terrain-ground';
        
        if (this.scene.textures.exists(textureKey)) {
            return textureKey;
        }

        const graphics = this.scene.add.graphics();
        const width = this.tileSize;
        const height = this.tileSize;

        // Base ground color (dark brown/gray)
        const groundColor = 0x16213e; // Matching game's ground color
        
        // Draw base ground
        graphics.fillStyle(groundColor);
        graphics.fillRect(0, 0, width, height);
        
        // Add texture pattern (simple noise/dots)
        graphics.fillStyle(ColorUtils.lighten(groundColor, 0.1));
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            graphics.fillCircle(x, y, 2);
        }
        
        // Add border
        graphics.lineStyle(1, ColorUtils.darken(groundColor, 0.2));
        graphics.strokeRect(0, 0, width, height);

        graphics.generateTexture(textureKey, width, height);
        graphics.destroy();

        return textureKey;
    }

    /**
     * Generate background tiles for different segment types
     */
    generateBackgroundTiles() {
        const segmentTypes = ['plains', 'forest', 'dungeon', 'desert'];
        
        segmentTypes.forEach(type => {
            const textureKey = `terrain-background-${type}`;
            
            if (this.scene.textures.exists(textureKey)) {
                return;
            }

            const graphics = this.scene.add.graphics();
            const width = this.tileSize * 2;
            const height = this.tileSize * 2;

            // Base color based on segment type
            let baseColor = 0x1a1a2e; // Default dark blue
            switch (type) {
                case 'plains':
                    baseColor = 0x2a3a2a; // Dark green
                    break;
                case 'forest':
                    baseColor = 0x1a2a1a; // Darker green
                    break;
                case 'dungeon':
                    baseColor = 0x1a1a1a; // Dark gray
                    break;
                case 'desert':
                    baseColor = 0x3a2a1a; // Dark brown
                    break;
            }

            // Draw base background
            graphics.fillStyle(baseColor);
            graphics.fillRect(0, 0, width, height);
            
            // Add pattern based on type
            this.addBackgroundPattern(graphics, type, width, height, baseColor);

            graphics.generateTexture(textureKey, width, height);
            graphics.destroy();
        });
    }

    /**
     * Add pattern to background based on segment type
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {string} type - Segment type
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} baseColor - Base color
     */
    addBackgroundPattern(graphics, type, width, height, baseColor) {
        switch (type) {
            case 'forest':
                // Add tree-like shapes
                graphics.fillStyle(ColorUtils.darken(baseColor, 0.3));
                for (let i = 0; i < 3; i++) {
                    const x = (width / 4) * (i + 1);
                    graphics.fillRect(x, 0, 10, height * 0.6);
                }
                break;
            case 'dungeon':
                // Add stone/brick pattern
                graphics.lineStyle(1, ColorUtils.darken(baseColor, 0.2));
                for (let y = 0; y < height; y += 20) {
                    for (let x = 0; x < width; x += 20) {
                        graphics.strokeRect(x, y, 20, 20);
                    }
                }
                break;
            case 'desert':
                // Add sand dunes
                graphics.fillStyle(ColorUtils.lighten(baseColor, 0.1));
                for (let i = 0; i < 4; i++) {
                    const x = (width / 5) * (i + 1);
                    graphics.fillEllipse(x, height * 0.7, 30, 15);
                }
                break;
            default:
                // Plains: simple grass pattern
                graphics.fillStyle(ColorUtils.lighten(baseColor, 0.05));
                for (let i = 0; i < 10; i++) {
                    const x = Math.random() * width;
                    const y = Math.random() * height;
                    graphics.fillCircle(x, y, 1);
                }
        }
    }

    /**
     * Generate encounter markers (shop, treasure, quest)
     */
    generateEncounterMarkers() {
        const encounterTypes = [
            { type: 'shop', color: 0x4444ff, shape: 'circle' },
            { type: 'treasure', color: 0xffff44, shape: 'diamond' },
            { type: 'quest', color: 0x44ff44, shape: 'star' }
        ];

        encounterTypes.forEach(encounter => {
            const textureKey = `encounter-${encounter.type}`;
            
            if (this.scene.textures.exists(textureKey)) {
                return;
            }

            const graphics = this.scene.add.graphics();
            const size = 32;

            // Draw encounter marker based on shape
            switch (encounter.shape) {
                case 'circle':
                    graphics.fillStyle(encounter.color);
                    graphics.fillCircle(size / 2, size / 2, size / 2);
                    graphics.lineStyle(2, ColorUtils.lighten(encounter.color, 0.3));
                    graphics.strokeCircle(size / 2, size / 2, size / 2);
                    break;
                case 'diamond':
                    graphics.fillStyle(encounter.color);
                    graphics.fillTriangle(
                        size / 2, 0,
                        0, size / 2,
                        size / 2, size
                    );
                    graphics.fillTriangle(
                        size / 2, 0,
                        size, size / 2,
                        size / 2, size
                    );
                    break;
                case 'star':
                    // Simple star shape
                    graphics.fillStyle(encounter.color);
                    const centerX = size / 2;
                    const centerY = size / 2;
                    const outerRadius = size / 2;
                    const innerRadius = size / 4;
                    const points = 5;
                    
                    for (let i = 0; i < points * 2; i++) {
                        const angle = (Math.PI * i) / points;
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const x = centerX + Math.cos(angle) * radius;
                        const y = centerY + Math.sin(angle) * radius;
                        
                        if (i === 0) {
                            graphics.moveTo(x, y);
                        } else {
                            graphics.lineTo(x, y);
                        }
                    }
                    graphics.closePath();
                    graphics.fillPath();
                    break;
            }

            graphics.generateTexture(textureKey, size, size);
            graphics.destroy();
        });
    }

    /**
     * Get texture key for a segment type background
     * @param {string} segmentType - Segment type
     * @returns {string} Texture key
     */
    getBackgroundKey(segmentType) {
        return `terrain-background-${segmentType}`;
    }

    /**
     * Get texture key for an encounter type
     * @param {string} encounterType - Encounter type
     * @returns {string} Texture key
     */
    getEncounterKey(encounterType) {
        return `encounter-${encounterType}`;
    }
}


/**
 * Advanced Environment Background Generator
 * Generates layered, parallax-scrolling backgrounds for different biomes
 * Supports: plains, forest, mountains, dark_lands, dungeon, desert
 */

import { ColorUtils } from './utils/color-utils.js';
import { DEPTH_LAYERS } from '../utils/depth-layers.js';
import { RoadGenerator } from './road-generator.js';
import { TownBiomeGenerator } from './biomes/town-biome-generator.js';
import { CityBiomeGenerator } from './biomes/city-biome-generator.js';
import { NPCGenerator } from './npc-generator.js';
import { PixelArtRenderer } from './utils/pixel-art-renderer.js';

export class EnvironmentBackgroundGenerator {
    constructor(scene) {
        this.scene = scene;
        this.layers = new Map(); // Store background layers
        this.currentBiome = null;
        this.roadGenerator = new RoadGenerator(scene);
        this.townGenerator = new TownBiomeGenerator(scene);
        this.cityGenerator = new CityBiomeGenerator(scene);
        this.npcGenerator = new NPCGenerator(scene);
        this.pixelArtRenderer = new PixelArtRenderer(scene);
        this.currentRoad = null;
        this.currentBuildings = [];
        this.currentNPCs = [];
        this.currentAtmosphere = null;
        this.landmarkInterval = 1500; // Pixels between landmarks
        
        // Biome color palettes
        this.biomePalettes = {
            plains: {
                sky: { top: 0x4a5a7a, bottom: 0x2a3a5a },
                distant: { base: 0x1a2a3a, accent: 0x2a3a4a },
                mid: { base: 0x2a3a2a, accent: 0x3a4a3a },
                ground: { base: 0x16213e, accent: 0x1a2a2e },
                atmosphere: { tint: 0xffffff, alpha: 0.1, particle: 'dust' }
            },
            forest: {
                sky: { top: 0x1a2a1a, bottom: 0x0a1a0a },
                distant: { base: 0x0a1a0a, accent: 0x1a2a1a },
                mid: { base: 0x1a2a1a, accent: 0x2a3a2a },
                ground: { base: 0x0a1a0a, accent: 0x1a2a1a },
                atmosphere: { tint: 0x44ff44, alpha: 0.15, particle: 'leaf' }
            },
            mountains: {
                sky: { top: 0x5a6a8a, bottom: 0x3a4a6a },
                distant: { base: 0x2a2a3a, accent: 0x3a3a4a },
                mid: { base: 0x3a3a4a, accent: 0x4a4a5a },
                ground: { base: 0x1a1a2e, accent: 0x2a2a3e },
                atmosphere: { tint: 0xccccff, alpha: 0.2, particle: 'snow' }
            },
            dark_lands: {
                sky: { top: 0x1a0a0a, bottom: 0x000000 },
                distant: { base: 0x0a0a0a, accent: 0x1a0a0a },
                mid: { base: 0x1a0a0a, accent: 0x2a1a1a },
                ground: { base: 0x000000, accent: 0x1a0a0a },
                atmosphere: { tint: 0xff0000, alpha: 0.25, particle: 'ember' }
            },
            dungeon: {
                sky: { top: 0x0a0a0a, bottom: 0x000000 },
                distant: { base: 0x1a1a1a, accent: 0x2a2a2a },
                mid: { base: 0x1a1a1a, accent: 0x2a2a2a },
                ground: { base: 0x0a0a0a, accent: 0x1a1a1a },
                atmosphere: { tint: 0x00ff00, alpha: 0.1, particle: 'bubble' }
            }
        };
    }

    /**
     * Generate complete environment background for a biome
     * @param {string} biomeType - Type of biome (plains, forest, mountains, etc.)
     * @param {number} width - Viewport width
     * @param {number} height - Viewport height
     * @param {number} worldX - World X position for parallax
     */
    generateEnvironment(biomeType, width, height, worldX = 0) {
        this.currentBiome = biomeType;
        const palette = this.biomePalettes[biomeType] || this.biomePalettes.plains;

        // Clear existing layers
        this.clearLayers();
        this.cleanupBiomeData();

        // Generate layers with parallax (further = slower scroll)
        this.generateSkyLayer(palette, width, height, worldX);
        this.generateDistantLayer(palette, biomeType, width, height, worldX);
        this.generateMidLayer(palette, biomeType, width, height, worldX);
        this.generateGroundLayer(palette, width, height, worldX);
        this.generateForegroundLayer(palette, biomeType, width, height, worldX);
        
        // Generate atmosphere (lighting and particles)
        this.generateAtmosphere(palette, width, height);
        
        // Generate roads and buildings for town/city biomes
        if (biomeType === 'forest_town' || biomeType === 'city') {
            this.generateTownContent(biomeType, width, height, worldX);
        } else {
            // Generate roads for other biomes (except dark_lands which has corrupted paths)
            if (biomeType !== 'dark_lands') {
                this.generateRoadLayer(biomeType, width, height, worldX);
            }
        }
    }

    /**
     * Generate town/city content (buildings, roads, NPCs)
     */
    generateTownContent(biomeType, width, height, worldX) {
        const groundY = height * 0.65;
        
        if (biomeType === 'forest_town') {
            const townData = this.townGenerator.generateForestTown(width, height, groundY);
            this.currentRoad = townData.road;
            this.currentBuildings = townData.buildings;
            this.currentNPCs = this.npcGenerator.generateTownNPCs(townData.road, townData.buildings, width, height);
            
            // Render road
            this.renderRoadLayer(townData.road, width, height);
        } else if (biomeType === 'city') {
            const cityData = this.cityGenerator.generateCity(width, height, groundY);
            this.currentRoad = cityData.road;
            this.currentBuildings = cityData.buildings;
            this.currentNPCs = this.npcGenerator.generateTownNPCs(cityData.road, cityData.buildings, width, height);
            
            // Render road
            this.renderRoadLayer(cityData.road, width, height);
        }
    }

    /**
     * Generate road layer for non-town biomes
     */
    generateRoadLayer(biomeType, width, height, worldX) {
        const groundY = height * 0.65;
        const road = this.roadGenerator.generateRoadPath(biomeType, width, height, groundY);
        this.currentRoad = road;
        this.renderRoadLayer(road, width, height);
    }

    /**
     * Render road onto a background layer
     */
    renderRoadLayer(road, width, height) {
        if (!road || !road.points || road.points.length < 2) {
            return;
        }
        
        const textureKey = `road-layer-${this.currentBiome}`;
        
        if (this.scene.textures.exists(textureKey)) {
            // Use existing texture
            const roadLayer = this.scene.add.image(0, 0, textureKey);
            roadLayer.setOrigin(0, 0);
            roadLayer.setScrollFactor(1.0, 0); // Roads move with camera
            roadLayer.setDepth(DEPTH_LAYERS.BACKGROUND + 2.5); // Between mid and ground
            this.layers.set('road', roadLayer);
            return;
        }
        
        // Generate road texture
        const graphics = this.scene.add.graphics();
        const texWidth = Math.max(width * 2, 4096);
        const texHeight = height;
        
        // Render road onto graphics
        this.roadGenerator.renderRoad(graphics, road, texWidth, texHeight);
        
        graphics.generateTexture(textureKey, texWidth, texHeight);
        graphics.destroy();
        
        // Create road layer sprite
        const roadLayer = this.scene.add.tileSprite(0, 0, width * 3, height, textureKey);
        roadLayer.setOrigin(0, 0);
        roadLayer.setScrollFactor(1.0, 0);
        roadLayer.setDepth(DEPTH_LAYERS.BACKGROUND + 2.5);
        this.layers.set('road', roadLayer);
    }

    /**
     * Clean up biome-specific data (buildings, NPCs)
     */
    cleanupBiomeData() {
        // Clean up buildings
        this.currentBuildings.forEach(building => {
            if (building.sprite && !building.sprite.destroyed) {
                building.sprite.destroy();
            }
            if (building.doorZone && !building.doorZone.destroyed) {
                building.doorZone.destroy();
            }
            if (building.sign && !building.sign.destroyed) {
                building.sign.destroy();
            }
            if (building.shopText && !building.shopText.destroyed) {
                building.shopText.destroy();
            }
        });
        this.currentBuildings = [];
        
        // Clean up NPCs
        this.npcGenerator.cleanup();
        this.currentNPCs = [];
        
        // Clean up town/city generators
        this.townGenerator.cleanup();
        this.cityGenerator.cleanup();
    }

    /**
     * Get road Y position at X (for movement manager)
     */
    getRoadYAtX(x) {
        if (!this.currentRoad) return null;
        
        const width = this.scene.scale.gameSize.width;
        const height = this.scene.scale.gameSize.height;
        return this.roadGenerator.getRoadYAtX(this.currentBiome, x, width, height);
    }

    /**
     * Check if position is on road
     */
    isOnRoad(x, y) {
        if (!this.currentRoad) return false;
        
        const width = this.scene.scale.gameSize.width;
        const height = this.scene.scale.gameSize.height;
        return this.roadGenerator.isOnRoad(this.currentBiome, x, y, width, height);
    }

    /**
     * Generate sky layer (no parallax, always visible)
     */
    generateSkyLayer(palette, width, height, worldX) {
        const textureKey = `env-sky-${this.currentBiome}`;
        
        if (!this.scene.textures.exists(textureKey)) {
            const graphics = this.scene.add.graphics();
            const texWidth = Math.max(width, 2048); // Wide enough to tile
            
            // Sky gradient
            const gradientSteps = 30;
            for (let i = 0; i < gradientSteps; i++) {
                const t = i / gradientSteps;
                const y = (height / gradientSteps) * i;
                const stepHeight = height / gradientSteps;
                
                const color1 = ColorUtils.toRGB(palette.sky.top);
                const color2 = ColorUtils.toRGB(palette.sky.bottom);
                const r = Math.floor(color1.r + (color2.r - color1.r) * t);
                const g = Math.floor(color1.g + (color2.g - color1.g) * t);
                const b = Math.floor(color1.b + (color2.b - color1.b) * t);
                const gradientColor = ColorUtils.fromRGB(r, g, b);
                
                graphics.fillStyle(gradientColor);
                graphics.fillRect(0, y, texWidth, stepHeight);
            }

            // Add clouds for non-dark biomes
            if (this.currentBiome !== 'dark_lands' && this.currentBiome !== 'dungeon') {
                graphics.fillStyle(0xffffff, 0.15);
                for (let i = 0; i < 12; i++) {
                    const x = Math.random() * texWidth;
                    const y = Math.random() * (height * 0.4);
                    const size = Math.random() * 60 + 40;
                    graphics.fillCircle(x, y, size);
                    graphics.fillCircle(x + size * 0.6, y, size * 0.8);
                    graphics.fillCircle(x - size * 0.4, y, size * 0.7);
                }
            }

            graphics.generateTexture(textureKey, texWidth, height);
            graphics.destroy();
        }

        const sky = this.scene.add.tileSprite(0, 0, width * 2, height, textureKey);
        sky.setOrigin(0, 0);
        sky.setScrollFactor(0); // Sky doesn't scroll
        sky.setDepth(DEPTH_LAYERS.BACKGROUND);
        this.layers.set('sky', sky);
    }

    /**
     * Generate distant background layer (mountains, far hills, etc.) - slow parallax
     */
    generateDistantLayer(palette, biomeType, width, height, worldX) {
        const textureKey = `env-distant-${this.currentBiome}`;
        
        if (!this.scene.textures.exists(textureKey)) {
            const graphics = this.scene.add.graphics();
            const layerHeight = height * 0.6; // Top 60% of screen
            const texWidth = Math.max(width * 2, 4096); // Wide enough to tile with parallax
            
            // Base distant background
            graphics.fillStyle(palette.distant.base);
            graphics.fillRect(0, 0, texWidth, layerHeight);

            // Add biome-specific distant elements (repeat pattern for tiling)
            const patternWidth = width;
            for (let patternX = 0; patternX < texWidth; patternX += patternWidth) {
                // Draw pattern at offset position
                switch (biomeType) {
                    case 'mountains':
                        this.drawDistantMountains(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'forest':
                        this.drawDistantForest(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'dark_lands':
                        this.drawDarkLandsDistant(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'desert':
                        this.drawDesertDunes(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'forest_town':
                        this.drawDistantForest(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'city':
                        this.drawDistantMountains(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    default:
                        this.drawDistantHills(graphics, palette, patternWidth, layerHeight, patternX);
                }
            }

            graphics.generateTexture(textureKey, texWidth, layerHeight);
            graphics.destroy();
        }

        const distant = this.scene.add.tileSprite(0, 0, width * 3, height * 0.6, textureKey);
        distant.setOrigin(0, 0);
        distant.setScrollFactor(0.2, 0); // Slow parallax
        distant.setDepth(DEPTH_LAYERS.BACKGROUND + 1);
        this.layers.set('distant', distant);
    }

    /**
     * Generate foreground layer - fastest parallax (blur effect)
     */
    generateForegroundLayer(palette, biomeType, width, height, worldX) {
        const textureKey = `env-foreground-${this.currentBiome}`;
        const fgHeight = height * 0.2; // Bottom 20%
        const fgY = height * 0.8;
        
        if (!this.scene.textures.exists(textureKey)) {
            const graphics = this.scene.add.graphics();
            const texWidth = Math.max(width * 2, 4096);
            
            const fgColor = ColorUtils.darken(palette.ground.base, 0.3);
            
            for (let patternX = 0; patternX < texWidth; patternX += 800) {
                // Large blurred grass tufts
                graphics.fillStyle(fgColor, 0.6);
                for (let i = 0; i < 5; i++) {
                    const x = patternX + Math.random() * 800;
                    const y = Math.random() * fgHeight;
                    const size = Math.random() * 40 + 20;
                    graphics.fillEllipse(x, y, size, size * 2);
                }
                
                // Large blurred rocks
                graphics.fillStyle(ColorUtils.darken(fgColor, 0.2), 0.5);
                for (let i = 0; i < 2; i++) {
                    const x = patternX + Math.random() * 800;
                    const y = Math.random() * fgHeight;
                    const size = Math.random() * 60 + 40;
                    graphics.fillCircle(x, y, size);
                }
            }

            graphics.generateTexture(textureKey, texWidth, fgHeight);
            graphics.destroy();
        }

        const foreground = this.scene.add.tileSprite(0, fgY, width * 3, fgHeight, textureKey);
        foreground.setOrigin(0, 0);
        foreground.setScrollFactor(1.4, 0); // Faster than ground for "close" feel
        foreground.setDepth(DEPTH_LAYERS.WORLD + 50); // In front of objects
        foreground.setAlpha(0.7);
        this.layers.set('foreground', foreground);
    }

    /**
     * Generate atmospheric effects (lighting overlay and particles)
     */
    generateAtmosphere(palette, width, height) {
        const atmosphere = palette.atmosphere || { tint: 0xffffff, alpha: 0.1 };
        
        // Lighting Overlay
        const overlay = this.scene.add.rectangle(0, 0, width, height, atmosphere.tint);
        overlay.setOrigin(0, 0);
        overlay.setScrollFactor(0);
        overlay.setDepth(DEPTH_LAYERS.UI_BACKGROUND - 1);
        overlay.setAlpha(atmosphere.alpha);
        overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
        this.layers.set('overlay', overlay);
        
        // Particles would go here, using a simpler implementation for now
        // since full particle systems might be heavy for backgrounds
    }

    /**
     * Generate mid-ground layer (trees, structures, etc.) - medium parallax
     */
    generateMidLayer(palette, biomeType, width, height, worldX) {
        const textureKey = `env-mid-${this.currentBiome}`;
        
        if (!this.scene.textures.exists(textureKey)) {
            const graphics = this.scene.add.graphics();
            const layerHeight = height * 0.7;
            const texWidth = Math.max(width * 2, 4096); // Wide enough to tile
            
            // Base mid background
            graphics.fillStyle(palette.mid.base, 0.8);
            graphics.fillRect(0, 0, texWidth, layerHeight);

            // Add biome-specific mid elements (repeat pattern for tiling)
            const patternWidth = 1024;
            for (let patternX = 0; patternX < texWidth; patternX += patternWidth) {
                // Draw pattern at offset position
                switch (biomeType) {
                    case 'forest':
                        this.drawMidForest(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'mountains':
                        this.drawMidMountains(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'dark_lands':
                        this.drawDarkLandsMid(graphics, palette, patternWidth, layerHeight, patternX);
                        this.drawLandmarkRuins(graphics, palette, layerHeight, patternX + 500);
                        break;
                    case 'desert':
                        this.drawDesertMid(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    case 'dungeon':
                        this.drawDungeonMid(graphics, palette, patternWidth, layerHeight, patternX);
                        break;
                    default:
                        this.drawMidPlains(graphics, palette, patternWidth, layerHeight, patternX);
                        // Occasional landmark in plains
                        if (patternX % 2048 === 0) {
                            this.drawLandmarkRuins(graphics, palette, layerHeight, patternX + 300);
                        }
                }
            }

            graphics.generateTexture(textureKey, texWidth, layerHeight);
            graphics.destroy();
        }

        const mid = this.scene.add.tileSprite(0, height * 0.3, width * 3, height * 0.7, textureKey);
        mid.setOrigin(0, 0);
        mid.setScrollFactor(0.5, 0); // Medium parallax
        mid.setDepth(DEPTH_LAYERS.BACKGROUND + 2);
        this.layers.set('mid', mid);
    }

    /**
     * Draw Landmark Ruins (Environmental Storytelling)
     */
    drawLandmarkRuins(graphics, palette, height, x) {
        const baseColor = ColorUtils.darken(palette.mid.accent, 0.5);
        const detailColor = ColorUtils.darken(baseColor, 0.3);
        
        // Broken Pillar
        graphics.fillStyle(baseColor);
        graphics.fillRect(x, height - 120, 30, 120);
        graphics.fillStyle(detailColor);
        graphics.fillRect(x + 5, height - 120, 5, 120); // Fluting detail
        
        // Crumbling Wall
        graphics.fillStyle(baseColor);
        graphics.fillRect(x - 100, height - 40, 80, 40);
        graphics.fillRect(x - 80, height - 60, 40, 20);
        
        // Cracks
        graphics.lineStyle(2, detailColor, 0.8);
        graphics.beginPath();
        graphics.moveTo(x + 10, height - 100);
        graphics.lineTo(x + 25, height - 80);
        graphics.strokePath();
    }

    /**
     * Generate ground layer - fast parallax
     */
    generateGroundLayer(palette, width, height, worldX) {
        const textureKey = `env-ground-${this.currentBiome}`;
        const groundHeight = height * 0.4; // Bottom 40%
        const groundY = height * 0.6; // Start at 60% from top
        
        if (!this.scene.textures.exists(textureKey)) {
            const graphics = this.scene.add.graphics();
            const texWidth = Math.max(width * 2, 4096); // Wide enough to tile
            
            // Ground base with subtle gradient
            const groundLight = ColorUtils.lighten(palette.ground.base, 0.05);
            const groundDark = ColorUtils.darken(palette.ground.base, 0.05);
            
            // Vertical gradient (lighter at top, darker at bottom)
            for (let gy = 0; gy < groundHeight; gy++) {
                const t = gy / groundHeight;
                const color1 = ColorUtils.toRGB(groundLight);
                const color2 = ColorUtils.toRGB(groundDark);
                const r = Math.floor(color1.r + (color2.r - color1.r) * t);
                const g = Math.floor(color1.g + (color2.g - color1.g) * t);
                const b = Math.floor(color1.b + (color2.b - color1.b) * t);
                const gradientColor = ColorUtils.fromRGB(r, g, b);
                graphics.fillStyle(gradientColor);
                graphics.fillRect(0, gy, texWidth, 1);
            }

            // Enhanced ground texture pattern (repeat for tiling)
            const accentColor = palette.ground.accent;
            const accentLight = ColorUtils.lighten(accentColor, 0.1);
            const accentDark = ColorUtils.darken(accentColor, 0.1);
            
            for (let patternX = 0; patternX < texWidth; patternX += width) {
                // Larger variation spots
                for (let i = 0; i < 60; i++) {
                    const x = patternX + Math.random() * width;
                    const y = Math.random() * groundHeight;
                    const size = Math.random() * 5 + 2;
                    const shade = Math.random() > 0.5 ? accentLight : accentDark;
                    graphics.fillStyle(shade, 0.4);
                    graphics.fillCircle(x, y, size);
                }
                
                // Small detail dots
                for (let i = 0; i < 80; i++) {
                    const x = patternX + Math.random() * width;
                    const y = Math.random() * groundHeight;
                    const size = Math.random() * 2 + 1;
                    graphics.fillStyle(accentColor, 0.5);
                    graphics.fillCircle(x, y, size);
                }
            }

            // Enhanced horizontal ground lines (terrain layers)
            graphics.lineStyle(1, accentColor, 0.25);
            for (let y = 0; y < groundHeight; y += 16) {
                graphics.beginPath();
                graphics.moveTo(0, y);
                graphics.lineTo(texWidth, y);
                graphics.strokePath();
            }
            
            // Add subtle vertical texture lines
            graphics.lineStyle(1, accentColor, 0.1);
            for (let x = 0; x < texWidth; x += 32) {
                graphics.beginPath();
                graphics.moveTo(x, 0);
                graphics.lineTo(x, groundHeight);
                graphics.strokePath();
            }

            graphics.generateTexture(textureKey, texWidth, groundHeight);
            graphics.destroy();
        }

        const ground = this.scene.add.tileSprite(0, groundY, width * 3, groundHeight, textureKey);
        ground.setOrigin(0, 0);
        ground.setScrollFactor(1.0, 0); // Full parallax (moves with camera)
        ground.setDepth(DEPTH_LAYERS.BACKGROUND + 3);
        this.layers.set('ground', ground);
    }

    // Biome-specific drawing methods
    // Note: offsetX parameter allows patterns to be drawn at different positions for tiling

    drawDistantMountains(graphics, palette, width, height, offsetX = 0) {
        const peaks = 3;
        const peakWidth = width / peaks;
        const baseColor = palette.distant.accent;
        const lightColor = ColorUtils.lighten(baseColor, 0.15);
        const darkColor = ColorUtils.darken(baseColor, 0.15);
        
        for (let i = 0; i < peaks; i++) {
            const x = offsetX + peakWidth * i + (Math.random() * 100);
            const peakHeight = height * (0.4 + Math.random() * 0.5);
            const pWidth = peakWidth * (0.8 + Math.random() * 0.4);
            
            // Jagged mountain silhouette
            graphics.fillStyle(darkColor);
            graphics.beginPath();
            graphics.moveTo(x, height);
            
            // Create jagged edges
            const steps = 6;
            for (let j = 1; j <= steps; j++) {
                const tx = x + (pWidth / 2) * (j / steps);
                const ty = height - (peakHeight * (j / steps)) + (Math.random() * 20 - 10);
                graphics.lineTo(tx, ty);
            }
            for (let j = steps - 1; j >= 0; j--) {
                const tx = x + pWidth - (pWidth / 2) * (j / steps);
                const ty = height - (peakHeight * (j / steps)) + (Math.random() * 20 - 10);
                graphics.lineTo(tx, ty);
            }
            
            graphics.lineTo(x + pWidth, height);
            graphics.closePath();
            graphics.fillPath();
            
            // Snow cap / light side
            graphics.fillStyle(lightColor, 0.4);
            graphics.beginPath();
            graphics.moveTo(x + pWidth * 0.25, height - peakHeight * 0.5);
            graphics.lineTo(x + pWidth / 2, height - peakHeight);
            graphics.lineTo(x + pWidth * 0.4, height - peakHeight * 0.6);
            graphics.closePath();
            graphics.fillPath();
        }
    }

    drawDistantHills(graphics, palette, width, height, offsetX = 0) {
        const hills = 4;
        const hillWidth = width / hills;
        const baseColor = palette.distant.accent;
        const lightColor = ColorUtils.lighten(baseColor, 0.12);
        const darkColor = ColorUtils.darken(baseColor, 0.12);
        
        for (let i = 0; i < hills; i++) {
            const x = offsetX + hillWidth * i;
            const hillHeight = height * (0.2 + Math.random() * 0.2);
            const centerX = x + hillWidth / 2;
            const centerY = height - hillHeight / 2;
            
            // Base hill
            graphics.fillStyle(baseColor);
            graphics.fillEllipse(centerX, centerY, hillWidth * 1.2, hillHeight);
            
            // Hill highlight (top)
            graphics.fillStyle(lightColor, 0.5);
            graphics.fillEllipse(centerX, centerY - hillHeight * 0.2, hillWidth * 1.0, hillHeight * 0.6);
            
            // Hill shadow (bottom)
            graphics.fillStyle(darkColor, 0.4);
            graphics.fillEllipse(centerX, centerY + hillHeight * 0.2, hillWidth * 1.0, hillHeight * 0.6);
            
            // Hill outline
            graphics.lineStyle(1, ColorUtils.darken(baseColor, 0.2), 0.6);
            graphics.strokeEllipse(centerX, centerY, hillWidth * 1.2, hillHeight);
        }
    }

    drawDistantForest(graphics, palette, width, height, offsetX = 0) {
        const baseColor = palette.distant.accent;
        const darkColor = ColorUtils.darken(baseColor, 0.2);
        
        const trees = 12;
        const treeSpacing = width / trees;
        
        for (let i = 0; i < trees; i++) {
            const x = offsetX + treeSpacing * i + (Math.random() * treeSpacing);
            const treeHeight = height * (0.2 + Math.random() * 0.4);
            const treeWidth = 20 + Math.random() * 30;
            
            // Pine tree silhouette
            graphics.fillStyle(darkColor);
            graphics.beginPath();
            graphics.moveTo(x, height - treeHeight);
            graphics.lineTo(x - treeWidth / 2, height - treeHeight * 0.6);
            graphics.lineTo(x - treeWidth / 4, height - treeHeight * 0.65);
            graphics.lineTo(x - treeWidth * 0.7, height - treeHeight * 0.3);
            graphics.lineTo(x - treeWidth / 3, height - treeHeight * 0.35);
            graphics.lineTo(x - treeWidth, height);
            graphics.lineTo(x + treeWidth, height);
            graphics.lineTo(x + treeWidth / 3, height - treeHeight * 0.35);
            graphics.lineTo(x + treeWidth * 0.7, height - treeHeight * 0.3);
            graphics.lineTo(x + treeWidth / 4, height - treeHeight * 0.65);
            graphics.lineTo(x + treeWidth / 2, height - treeHeight * 0.6);
            graphics.closePath();
            graphics.fillPath();
        }
    }

    drawDesertDunes(graphics, palette, width, height, offsetX = 0) {
        graphics.fillStyle(palette.distant.accent);
        const dunes = 5;
        const duneWidth = width / dunes;
        
        for (let i = 0; i < dunes; i++) {
            const x = offsetX + duneWidth * i;
            const duneHeight = height * (0.15 + Math.random() * 0.15);
            graphics.fillEllipse(x + duneWidth / 2, height - duneHeight / 2, duneWidth * 1.5, duneHeight);
        }
    }

    drawDarkLandsDistant(graphics, palette, width, height, offsetX = 0) {
        graphics.fillStyle(palette.distant.accent, 0.5);
        // Dark spires
        const spires = 4;
        const spireSpacing = width / spires;
        
        for (let i = 0; i < spires; i++) {
            const x = offsetX + spireSpacing * (i + 0.5);
            const spireHeight = height * (0.4 + Math.random() * 0.3);
            graphics.fillRect(x - 10, height - spireHeight, 20, spireHeight);
        }
    }

    drawMidForest(graphics, palette, width, height, offsetX = 0) {
        const trees = 6;
        const treeSpacing = width / trees;
        const trunkColor = ColorUtils.darken(palette.mid.accent, 0.4);
        const foliageBase = palette.mid.accent;
        const foliageLight = ColorUtils.lighten(foliageBase, 0.15);
        const foliageDark = ColorUtils.darken(foliageBase, 0.15);
        
        for (let i = 0; i < trees; i++) {
            const x = offsetX + treeSpacing * i + (Math.random() * 50);
            const treeHeight = height * (0.5 + Math.random() * 0.3);
            const treeWidth = 80 + Math.random() * 60;
            const trunkWidth = 15 + Math.random() * 10;
            const trunkTop = height - treeHeight;
            
            // Detailed Trunk
            graphics.fillStyle(trunkColor);
            graphics.fillRect(x - trunkWidth/2, trunkTop, trunkWidth, treeHeight);
            graphics.fillStyle(ColorUtils.darken(trunkColor, 0.2));
            graphics.fillRect(x + trunkWidth/4, trunkTop, trunkWidth/4, treeHeight); // Trunk shadow
            
            // Layered Foliage (3 levels)
            const levels = 3;
            for (let l = 0; l < levels; l++) {
                const levelY = trunkTop + (l * (treeHeight * 0.2));
                const levelWidth = treeWidth * (1 - (l * 0.2));
                const levelHeight = treeHeight * 0.3;
                
                // Base level
                graphics.fillStyle(foliageDark, 0.9);
                graphics.fillEllipse(x, levelY, levelWidth, levelHeight);
                
                // Highlight clumps
                graphics.fillStyle(l === 0 ? foliageLight : foliageBase, 0.8);
                graphics.fillCircle(x - levelWidth/4, levelY - 5, levelWidth/4);
                graphics.fillCircle(x + levelWidth/4, levelY - 5, levelWidth/4);
                graphics.fillCircle(x, levelY - 10, levelWidth/3);
            }
            
            // Root flares
            graphics.fillStyle(trunkColor);
            graphics.fillTriangle(x - trunkWidth/2, height, x - trunkWidth, height, x - trunkWidth/2, height - 20);
            graphics.fillTriangle(x + trunkWidth/2, height, x + trunkWidth, height, x + trunkWidth/2, height - 20);
        }
    }

    drawMidMountains(graphics, palette, width, height, offsetX = 0) {
        graphics.fillStyle(palette.mid.accent);
        const peaks = 6;
        const peakWidth = width / (peaks + 1);
        
        for (let i = 0; i < peaks; i++) {
            const x = offsetX + peakWidth * (i + 1);
            const peakHeight = height * (0.4 + Math.random() * 0.4);
            const peakWidthVar = peakWidth * (0.7 + Math.random() * 0.3);
            
            graphics.beginPath();
            graphics.moveTo(x - peakWidthVar / 2, height);
            graphics.lineTo(x, height - peakHeight);
            graphics.lineTo(x + peakWidthVar / 2, height);
            graphics.closePath();
            graphics.fillPath();
        }
    }

    drawDarkLandsMid(graphics, palette, width, height, offsetX = 0) {
        graphics.fillStyle(palette.mid.accent, 0.6);
        const elements = 8;
        const spacing = width / elements;
        
        for (let i = 0; i < elements; i++) {
            const x = offsetX + spacing * i + (Math.random() * spacing);
            const rand = Math.random();
            
            if (rand > 0.6) {
                // Gnarly dead tree
                const treeHeight = height * (0.4 + Math.random() * 0.3);
                graphics.lineStyle(4, palette.mid.accent, 0.8);
                graphics.beginPath();
                graphics.moveTo(x, height);
                graphics.lineTo(x + (Math.random() * 40 - 20), height - treeHeight);
                // Branches
                for (let b = 0; b < 3; b++) {
                    const bx = x + (Math.random() * 20 - 10);
                    const by = height - (treeHeight * (0.3 + b * 0.2));
                    graphics.moveTo(bx, by);
                    graphics.lineTo(bx + (Math.random() * 60 - 30), by - 30);
                }
                graphics.strokePath();
            } else if (rand > 0.3) {
                // Jagged obsidian-like spire
                const spireHeight = height * (0.3 + Math.random() * 0.5);
                graphics.fillStyle(ColorUtils.darken(palette.mid.base, 0.4));
                graphics.beginPath();
                graphics.moveTo(x - 20, height);
                graphics.lineTo(x, height - spireHeight);
                graphics.lineTo(x + 5, height - spireHeight * 0.8);
                graphics.lineTo(x + 20, height);
                graphics.closePath();
                graphics.fillPath();
            } else {
                // Giant ribcage bone
                const boneHeight = 60 + Math.random() * 40;
                graphics.lineStyle(6, 0xdddddd, 0.4);
                graphics.beginPath();
                graphics.arc(x, height, boneHeight, Math.PI, Math.PI * 1.5);
                graphics.strokePath();
            }
        }
    }

    drawDesertMid(graphics, palette, width, height, offsetX = 0) {
        graphics.fillStyle(palette.mid.accent);
        // Cacti
        const cacti = 5;
        const spacing = width / cacti;
        
        for (let i = 0; i < cacti; i++) {
            const x = offsetX + spacing * (i + 0.5);
            const cactusHeight = height * (0.3 + Math.random() * 0.3);
            // Main body
            graphics.fillRect(x - 8, height - cactusHeight, 16, cactusHeight);
            // Arms
            if (Math.random() > 0.5) {
                graphics.fillRect(x - 8, height - cactusHeight * 0.6, 12, 12);
            }
        }
    }

    drawDungeonMid(graphics, palette, width, height, offsetX = 0) {
        graphics.fillStyle(palette.mid.accent);
        // Stone columns
        const columns = 8;
        const spacing = width / columns;
        
        for (let i = 0; i < columns; i++) {
            const x = offsetX + spacing * (i + 0.5);
            const columnHeight = height * (0.4 + Math.random() * 0.3);
            graphics.fillRect(x - 8, height - columnHeight, 16, columnHeight);
        }
        
        // Brick pattern
        graphics.lineStyle(1, palette.mid.accent, 0.3);
        for (let y = height * 0.5; y < height; y += 15) {
            for (let x = 0; x < width; x += 30) {
                graphics.strokeRect(offsetX + x, y, 30, 15);
            }
        }
    }

    drawMidPlains(graphics, palette, width, height, offsetX = 0) {
        const grassColor = palette.mid.accent;
        const grassLight = ColorUtils.lighten(grassColor, 0.1);
        const grassDark = ColorUtils.darken(grassColor, 0.1);
        
        // Draw grass clumps with detail
        for (let i = 0; i < 30; i++) {
            const x = offsetX + Math.random() * width;
            const y = height * (0.6 + Math.random() * 0.4);
            const size = Math.random() * 8 + 4;
            
            // Grass clump base (dark)
            graphics.fillStyle(grassDark, 0.5);
            graphics.fillCircle(x, y, size);
            
            // Grass clump highlight (light)
            graphics.fillStyle(grassLight, 0.4);
            graphics.fillCircle(x - size * 0.3, y - size * 0.3, size * 0.6);
            
            // Individual grass blades (small lines)
            graphics.lineStyle(1, grassDark, 0.6);
            for (let j = 0; j < 3; j++) {
                const bladeX = x + (Math.random() - 0.5) * size;
                const bladeY = y + (Math.random() - 0.5) * size;
                graphics.beginPath();
                graphics.moveTo(bladeX, bladeY);
                graphics.lineTo(bladeX + (Math.random() - 0.5) * 2, bladeY - size * 0.5);
                graphics.strokePath();
            }
        }
        
        // Add some stones/rocks
        graphics.fillStyle(ColorUtils.darken(grassColor, 0.3), 0.6);
        for (let i = 0; i < 8; i++) {
            const x = offsetX + Math.random() * width;
            const y = height * (0.65 + Math.random() * 0.35);
            const size = Math.random() * 4 + 2;
            graphics.fillCircle(x, y, size);
        }
    }

    /**
     * Update background layers based on camera position
     * @param {number} cameraX - Current camera X position
     */
    updateParallax(cameraX) {
        // Layers update automatically via scrollFactor, but we can adjust here if needed
        // Sky layer doesn't need updating (scrollFactor 0)
    }

    /**
     * Clear all background layers
     */
    clearLayers() {
        this.layers.forEach(layer => {
            if (layer && !layer.destroyed) {
                layer.destroy();
            }
        });
        this.layers.clear();
        this.cleanupBiomeData();
    }

    /**
     * Get current biome type
     */
    getCurrentBiome() {
        return this.currentBiome;
    }
}


/**
 * Road Generator - Procedural road path generation
 * Creates roads through biomes that heroes can follow
 */

import { PixelArtRenderer } from './utils/pixel-art-renderer.js';
import { ColorUtils } from './utils/color-utils.js';

export class RoadGenerator {
    constructor(scene) {
        this.scene = scene;
        this.pixelRenderer = new PixelArtRenderer(scene);
        this.roadData = new Map(); // Store road path data for queries
        
        // Road types per biome
        this.roadTypes = {
            plains: 'dirt',
            forest: 'dirt',
            forest_town: 'dirt',
            mountains: 'stone',
            dark_lands: 'corrupted',
            dungeon: 'stone',
            desert: 'dirt',
            city: 'cobblestone'
        };
        
        // Road properties
        this.roadWidths = {
            dirt: 100,
            stone: 120,
            cobblestone: 120,
            corrupted: 80
        };
        
        // Road colors (chibi palette)
        this.roadColors = {
            dirt: {
                base: 0x8D6E63,
                light: 0xA68E83,
                dark: 0x6D4C41,
                outline: 0x5D4037
            },
            stone: {
                base: 0x757575,
                light: 0x9E9E9E,
                dark: 0x616161,
                outline: 0x424242
            },
                cobblestone: {
                base: 0x757575,
                light: 0x9E9E9E,
                dark: 0x616161,
                outline: 0x424242
            },
            corrupted: {
                base: 0x4A2A2A,
                light: 0x6A3A3A,
                dark: 0x2A1A1A,
                outline: 0x1A0A0A
            }
        };
    }

    /**
     * Generate a road path through a biome
     * @param {string} biomeType - Type of biome
     * @param {number} width - World width
     * @param {number} height - World height
     * @param {number} startY - Starting Y position (road center)
     * @param {Object} options - Generation options
     * @returns {Object} Road path data {points: Array, type: string, width: number}
     */
    generateRoadPath(biomeType, width, height, startY = null, options = {}) {
        const roadType = this.roadTypes[biomeType] || 'dirt';
        const roadWidth = this.roadWidths[roadType] || 100;
        
        // Use provided startY or calculate default (lower 2/3 of screen for ground level)
        const defaultStartY = startY !== null ? startY : height * 0.65;
        const roadCenterY = defaultStartY;
        
        // Generate road path points
        const points = [];
        const segmentLength = 200; // Generate point every 200 pixels
        const numSegments = Math.ceil(width / segmentLength);
        
        let currentY = roadCenterY;
        let currentX = 0;
        
        // Add some variation to road (gentle curves, hills)
        const maxVariation = 30; // Max vertical variation
        const variationFrequency = 0.02; // How often road changes direction
        
        for (let i = 0; i <= numSegments; i++) {
            currentX = i * segmentLength;
            
            // Add gentle curves based on sine wave with some randomness
            const variation = Math.sin(currentX * variationFrequency) * maxVariation * 0.5;
            const randomVariation = (Math.random() - 0.5) * maxVariation * 0.3;
            currentY = roadCenterY + variation + randomVariation;
            
            // Clamp to reasonable bounds (not too high or low)
            const minY = height * 0.4;
            const maxY = height * 0.85;
            currentY = Math.max(minY, Math.min(maxY, currentY));
            
            points.push({ x: currentX, y: currentY });
        }
        
        // Store road data for queries
        const roadKey = `${biomeType}_${width}_${height}`;
        this.roadData.set(roadKey, {
            points,
            type: roadType,
            width: roadWidth,
            biome: biomeType
        });
        
        return {
            points,
            type: roadType,
            width: roadWidth,
            key: roadKey
        };
    }

    /**
     * Get road Y position at a given X coordinate
     * @param {string} biomeType - Biome type
     * @param {number} x - X coordinate
     * @param {number} width - World width (to find matching road)
     * @param {number} height - World height
     * @returns {number|null} Y position of road center, or null if no road
     */
    getRoadYAtX(biomeType, x, width, height) {
        const roadKey = `${biomeType}_${width}_${height}`;
        const roadData = this.roadData.get(roadKey);
        
        if (!roadData || !roadData.points || roadData.points.length < 2) {
            return null;
        }
        
        // Find the two points that bracket this X position
        const points = roadData.points;
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            if (x >= p1.x && x <= p2.x) {
                // Linear interpolation between points
                const t = (x - p1.x) / (p2.x - p1.x);
                return p1.y + (p2.y - p1.y) * t;
            }
        }
        
        // If X is beyond last point, use last point's Y
        if (x > points[points.length - 1].x) {
            return points[points.length - 1].y;
        }
        
        // If X is before first point, use first point's Y
        return points[0].y;
    }

    /**
     * Check if a position is on the road
     * @param {string} biomeType - Biome type
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - World width
     * @param {number} height - World height
     * @returns {boolean} True if position is on road
     */
    isOnRoad(biomeType, x, y, width, height) {
        const roadY = this.getRoadYAtX(biomeType, x, width, height);
        if (roadY === null) return false;
        
        const roadKey = `${biomeType}_${width}_${height}`;
        const roadData = this.roadData.get(roadKey);
        if (!roadData) return false;
        
        const roadHalfWidth = roadData.width / 2;
        return Math.abs(y - roadY) <= roadHalfWidth;
    }

    /**
     * Create road segment texture
     * @param {string} roadType - Type of road
     * @param {number} width - Segment width
     * @param {number} height - Road height
     * @returns {string} Texture key
     */
    createRoadSegmentTexture(roadType, width, height) {
        const textureKey = `road-${roadType}-${width}x${height}`;
        
        if (this.scene.textures.exists(textureKey)) {
            return textureKey;
        }
        
        const graphics = this.scene.add.graphics();
        const colors = this.roadColors[roadType] || this.roadColors.dirt;
        
        // Draw road base
        graphics.fillStyle(colors.base);
        graphics.fillRect(0, 0, width, height);
        
        // Draw road texture based on type
        switch (roadType) {
            case 'dirt':
                this.drawDirtRoadTexture(graphics, width, height, colors);
                break;
            case 'stone':
                this.drawStoneRoadTexture(graphics, width, height, colors);
                break;
            case 'cobblestone':
                this.drawCobblestoneRoadTexture(graphics, width, height, colors);
                break;
            case 'corrupted':
                this.drawCorruptedRoadTexture(graphics, width, height, colors);
                break;
        }
        
        // Draw road outline
        graphics.lineStyle(2, colors.outline);
        graphics.strokeRect(0, 0, width, height);
        
        graphics.generateTexture(textureKey, width, height);
        graphics.destroy();
        
        return textureKey;
    }

    /**
     * Draw dirt road texture with high-quality detail
     */
    drawDirtRoadTexture(graphics, width, height, colors) {
        // Base texture variation (darker patches)
        graphics.fillStyle(colors.dark, 0.4);
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 6 + 3;
            graphics.fillCircle(x, y, size);
        }
        
        // Lighter highlights (compacted areas)
        graphics.fillStyle(colors.light, 0.3);
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 5 + 2;
            graphics.fillCircle(x, y, size);
        }
        
        // Add horizontal wheel tracks (if wide enough)
        if (width > 80) {
            const trackY1 = height * 0.3;
            const trackY2 = height * 0.7;
            graphics.fillStyle(colors.dark, 0.5);
            graphics.fillRect(0, trackY1, width, 2);
            graphics.fillRect(0, trackY2, width, 2);
            
            // Track highlights (compacted center)
            graphics.fillStyle(colors.light, 0.2);
            graphics.fillRect(0, trackY1, width, 1);
            graphics.fillRect(0, trackY2, width, 1);
        }
        
        // Small stones/pebbles
        graphics.fillStyle(colors.outline, 0.6);
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2 + 1;
            graphics.fillCircle(x, y, size);
        }
    }

    /**
     * Draw stone road texture with detailed tiles
     */
    drawStoneRoadTexture(graphics, width, height, colors) {
        // Draw stone tiles (24x24 for better detail)
        const tileSize = 24;
        graphics.lineStyle(1, colors.outline, 0.7);
        
        for (let y = 0; y < height; y += tileSize) {
            for (let x = 0; x < width; x += tileSize) {
                // Alternate tile shading with slight variation
                const baseShade = ((x / tileSize) + (y / tileSize)) % 2 === 0;
                const shade = baseShade ? colors.light : colors.dark;
                const variation = Math.random() * 0.15;
                const finalShade = baseShade 
                    ? ColorUtils.lighten(shade, variation)
                    : ColorUtils.darken(shade, variation);
                
                graphics.fillStyle(finalShade, 0.5);
                graphics.fillRect(x, y, tileSize, tileSize);
                
                // Tile 3D effect - shadow on right/bottom
                graphics.fillStyle(colors.outline, 0.3);
                graphics.fillRect(x + tileSize - 2, y, 2, tileSize); // Right shadow
                graphics.fillRect(x, y + tileSize - 2, tileSize, 2); // Bottom shadow
                
                // Tile highlight on top/left
                graphics.fillStyle(colors.light, 0.2);
                graphics.fillRect(x, y, tileSize, 1); // Top highlight
                graphics.fillRect(x, y, 1, tileSize); // Left highlight
                
                // Draw tile border
                graphics.strokeRect(x, y, tileSize, tileSize);
                
                // Add subtle cracks/weathering
                if (Math.random() < 0.1) {
                    graphics.lineStyle(1, colors.outline, 0.3);
                    graphics.beginPath();
                    graphics.moveTo(x + Math.random() * tileSize, y + Math.random() * tileSize);
                    graphics.lineTo(x + Math.random() * tileSize, y + Math.random() * tileSize);
                    graphics.strokePath();
                    graphics.lineStyle(1, colors.outline, 0.7); // Reset
                }
            }
        }
    }

    /**
     * Draw cobblestone road texture with detailed irregular stones
     */
    drawCobblestoneRoadTexture(graphics, width, height, colors) {
        // Draw irregular cobblestones with better detail
        const baseStoneSize = 20;
        graphics.lineStyle(1.5, colors.outline, 0.8);
        
        for (let y = 0; y < height; y += baseStoneSize) {
            for (let x = 0; x < width; x += baseStoneSize) {
                // Random offset and size for natural irregularity
                const offsetX = (Math.random() - 0.5) * 6;
                const offsetY = (Math.random() - 0.5) * 6;
                const sizeVar = (Math.random() - 0.5) * 6;
                const size = baseStoneSize + sizeVar;
                const centerX = x + baseStoneSize/2 + offsetX;
                const centerY = y + baseStoneSize/2 + offsetY;
                
                // Shade variation (more variation for realism)
                const shadeRand = Math.random();
                let shade;
                if (shadeRand < 0.3) {
                    shade = ColorUtils.lighten(colors.light, 0.1);
                } else if (shadeRand < 0.6) {
                    shade = colors.light;
                } else if (shadeRand < 0.85) {
                    shade = colors.base;
                } else {
                    shade = colors.dark;
                }
                
                // Draw cobblestone with 3D effect
                graphics.fillStyle(shade, 0.6);
                graphics.fillCircle(centerX, centerY, size/2);
                
                // Stone highlight (top-left)
                const highlightSize = size * 0.3;
                graphics.fillStyle(ColorUtils.lighten(shade, 0.2), 0.5);
                graphics.fillEllipse(centerX - size/6, centerY - size/6, highlightSize, highlightSize);
                
                // Stone shadow (bottom-right)
                graphics.fillStyle(ColorUtils.darken(shade, 0.2), 0.4);
                graphics.fillEllipse(centerX + size/6, centerY + size/6, highlightSize, highlightSize);
                
                // Stone outline
                graphics.strokeCircle(centerX, centerY, size/2);
                
                // Add moss/weathering detail (occasional)
                if (Math.random() < 0.15) {
                    graphics.fillStyle(ColorUtils.darken(shade, 0.3), 0.5);
                    graphics.fillEllipse(centerX + (Math.random() - 0.5) * size/3, 
                                       centerY + (Math.random() - 0.5) * size/3,
                                       size/4, size/4);
                }
            }
        }
        
        // Add mortar lines between stones
        graphics.lineStyle(1, colors.outline, 0.4);
        for (let y = 0; y < height; y += baseStoneSize) {
            for (let x = 0; x < width; x += baseStoneSize) {
                // Occasional mortar crack lines
                if (Math.random() < 0.05) {
                    graphics.beginPath();
                    graphics.moveTo(x, y);
                    graphics.lineTo(x + baseStoneSize, y + baseStoneSize);
                    graphics.strokePath();
                }
            }
        }
    }

    /**
     * Draw corrupted road texture
     */
    drawCorruptedRoadTexture(graphics, width, height, colors) {
        // Dark, corrupted appearance with cracks
        graphics.fillStyle(colors.dark, 0.5);
        graphics.fillRect(0, 0, width, height);
        
        // Draw cracks
        graphics.lineStyle(2, colors.outline, 0.8);
        for (let i = 0; i < 5; i++) {
            graphics.beginPath();
            graphics.moveTo(Math.random() * width, 0);
            for (let j = 0; j < 3; j++) {
                graphics.lineTo(Math.random() * width, (j + 1) * (height / 3));
            }
            graphics.strokePath();
        }
        
        // Add dark spots
        graphics.fillStyle(0x000000, 0.4);
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 10 + 5;
            graphics.fillCircle(x, y, size);
        }
    }

    /**
     * Render road onto a graphics object (for background layer)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Object} roadPath - Road path data from generateRoadPath
     * @param {number} viewportWidth - Viewport width
     * @param {number} viewportHeight - Viewport height
     */
    renderRoad(graphics, roadPath, viewportWidth, viewportHeight) {
        if (!roadPath || !roadPath.points || roadPath.points.length < 2) {
            return;
        }
        
        const colors = this.roadColors[roadPath.type] || this.roadColors.dirt;
        const roadWidth = roadPath.width;
        const segmentLength = 50; // Render road in segments
        
        // Draw road segments
        for (let i = 0; i < roadPath.points.length - 1; i++) {
            const p1 = roadPath.points[i];
            const p2 = roadPath.points[i + 1];
            
            // Calculate road segment polygon
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            
            // Perpendicular vector for road width
            const perpX = -Math.sin(angle) * (roadWidth / 2);
            const perpY = Math.cos(angle) * (roadWidth / 2);
            
            // Create road segment quad
            graphics.fillStyle(colors.base);
            graphics.beginPath();
            graphics.moveTo(p1.x + perpX, p1.y + perpY);
            graphics.lineTo(p1.x - perpX, p1.y - perpY);
            graphics.lineTo(p2.x - perpX, p2.y - perpY);
            graphics.lineTo(p2.x + perpX, p2.y + perpY);
            graphics.closePath();
            graphics.fillPath();
            
            // Draw road outline
            graphics.lineStyle(2, colors.outline);
            graphics.beginPath();
            graphics.moveTo(p1.x + perpX, p1.y + perpY);
            graphics.lineTo(p2.x + perpX, p2.y + perpY);
            graphics.strokePath();
            
            graphics.beginPath();
            graphics.moveTo(p1.x - perpX, p1.y - perpY);
            graphics.lineTo(p2.x - perpX, p2.y - perpY);
            graphics.strokePath();
        }
    }

    /**
     * Clear road data for a biome (cleanup)
     */
    clearRoadData(biomeType, width, height) {
        const roadKey = `${biomeType}_${width}_${height}`;
        this.roadData.delete(roadKey);
    }
}


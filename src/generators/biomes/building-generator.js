/**
 * Building Generator - Procedural building generation in chibi pixel art style
 * Creates enterable structures for towns and cities
 */

import { PixelArtRenderer } from '../utils/pixel-art-renderer.js';
import { ColorUtils } from '../utils/color-utils.js';

export class BuildingGenerator {
    constructor(scene) {
        this.scene = scene;
        this.pixelRenderer = new PixelArtRenderer(scene);
        
        // Building types
        this.buildingTypes = {
            residential: {
                colors: { wall: 0xD4A574, roof: 0x8B4513, door: 0x654321, window: 0x87CEEB },
                minWidth: 64,
                maxWidth: 96,
                minHeight: 80,
                maxHeight: 120
            },
            commercial: {
                colors: { wall: 0xC85A4D, roof: 0xA83A2D, door: 0x654321, window: 0xFFD700 },
                minWidth: 80,
                maxWidth: 128,
                minHeight: 96,
                maxHeight: 140
            },
            civic: {
                colors: { wall: 0x9E9E9E, roof: 0x757575, door: 0x654321, window: 0xE0E0E0 },
                minWidth: 96,
                maxWidth: 160,
                minHeight: 120,
                maxHeight: 180
            },
            defensive: {
                colors: { wall: 0x616161, roof: 0x424242, door: 0x2A2A2A, window: 0x4A4A4A },
                minWidth: 80,
                maxWidth: 120,
                minHeight: 140,
                maxHeight: 200
            }
        };
    }

    /**
     * Generate a building
     * @param {string} type - Building type
     * @param {number} x - X position
     * @param {number} y - Y position (bottom of building)
     * @param {Object} options - Building options
     * @returns {Object} Building data {sprite, doorZone, enterable, type}
     */
    generateBuilding(type, x, y, options = {}) {
        const buildingConfig = this.buildingTypes[type] || this.buildingTypes.residential;
        
        const {
            width = buildingConfig.minWidth + Math.random() * (buildingConfig.maxWidth - buildingConfig.minWidth),
            height = buildingConfig.minHeight + Math.random() * (buildingConfig.maxHeight - buildingConfig.minHeight),
            enterable = true
        } = options;
        
        const buildingWidth = Math.floor(width);
        const buildingHeight = Math.floor(height);
        const textureKey = `building-${type}-${buildingWidth}x${buildingHeight}-${Date.now()}`;
        
        // Generate building texture
        const graphics = this.scene.add.graphics();
        
        // Draw building body
        this.drawBuildingBody(graphics, buildingWidth, buildingHeight, buildingConfig.colors);
        
        // Draw roof
        this.drawRoof(graphics, buildingWidth, buildingHeight, buildingConfig.colors);
        
        // Draw windows
        this.drawWindows(graphics, buildingWidth, buildingHeight, buildingConfig.colors);
        
        // Draw door
        const doorData = this.drawDoor(graphics, buildingWidth, buildingHeight, buildingConfig.colors, enterable);
        
        // Add outline
        graphics.lineStyle(2, 0x000000);
        graphics.strokeRect(0, 0, buildingWidth, buildingHeight);
        
        graphics.generateTexture(textureKey, buildingWidth, buildingHeight);
        graphics.destroy();
        
        // Create building sprite
        const buildingSprite = this.scene.add.image(x, y - buildingHeight / 2, textureKey);
        buildingSprite.setOrigin(0.5, 1); // Anchor at bottom center
        buildingSprite.setDepth(100); // Above ground, below heroes
        
        // Create door interaction zone if enterable
        let doorZone = null;
        if (enterable && doorData) {
            doorZone = this.scene.add.zone(x + doorData.x - buildingWidth / 2, y - doorData.y, doorData.width, doorData.height);
            doorZone.setInteractive();
            doorZone.buildingType = type;
            doorZone.enterable = true;
        }
        
        return {
            sprite: buildingSprite,
            doorZone: doorZone,
            enterable: enterable,
            type: type,
            width: buildingWidth,
            height: buildingHeight
        };
    }

    /**
     * Draw building body (walls) with high-quality texture
     */
    drawBuildingBody(graphics, width, height, colors) {
        // Determine texture type based on building type
        const textureType = this.getTextureTypeForColor(colors.wall);
        
        // Use high-quality textured rectangle
        this.pixelRenderer.drawTexturedRect(
            graphics, 0, 0, width, height, colors.wall, textureType, {
                tileSize: 8,
                outline: false
            }
        );
        
        // Add enhanced shading with 5-level gradient
        const highlight = ColorUtils.lighten(colors.wall, 0.25);
        const light = ColorUtils.lighten(colors.wall, 0.12);
        const base = colors.wall;
        const dark = ColorUtils.darken(colors.wall, 0.12);
        const shadow = ColorUtils.darken(colors.wall, 0.25);
        
        // Left edge shadow (stronger)
        this.pixelRenderer.drawPixelGradient(
            graphics, 0, 0, 6, height,
            shadow, dark, 'horizontal', 6, false
        );
        
        // Right edge shadow (stronger)
        this.pixelRenderer.drawPixelGradient(
            graphics, width - 6, 0, 6, height,
            dark, shadow, 'horizontal', 6, false
        );
        
        // Top highlight (subtle)
        this.pixelRenderer.drawPixelGradient(
            graphics, 0, 0, width, 8,
            highlight, light, 'vertical', 4, false
        );
        
        // Add vertical structural elements (pillars/corners)
        graphics.fillStyle(ColorUtils.darken(colors.wall, 0.2), 0.4);
        graphics.fillRect(0, 0, 3, height); // Left corner
        graphics.fillRect(width - 3, 0, 3, height); // Right corner
        
        graphics.fillStyle(ColorUtils.lighten(colors.wall, 0.1), 0.3);
        graphics.fillRect(1, 0, 1, height); // Left highlight
        graphics.fillRect(width - 2, 0, 1, height); // Right highlight
    }

    /**
     * Get texture type based on color (determines material)
     */
    getTextureTypeForColor(color) {
        // Simple heuristic based on color ranges
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        // Wood colors (brown/tan range)
        if (r > 180 && g > 140 && b < 150) return 'wood';
        // Brick colors (red range)
        if (r > 150 && g < 100 && b < 100) return 'brick';
        // Stone colors (gray range)
        if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return 'stone';
        // Default to plank
        return 'plank';
    }

    /**
     * Draw roof with detailed shingle pattern
     */
    drawRoof(graphics, width, height, colors) {
        const roofHeight = Math.min(32, height * 0.25);
        const roofOverhang = 12;
        const roofTopY = height - roofHeight - roofHeight;
        
        // Create roof gradient (darker at bottom, lighter at top)
        const roofLight = ColorUtils.lighten(colors.roof, 0.15);
        const roofDark = ColorUtils.darken(colors.roof, 0.15);
        
        // Draw roof base with gradient
        graphics.beginPath();
        graphics.moveTo(-roofOverhang, height - roofHeight);
        graphics.lineTo(width / 2, roofTopY);
        graphics.lineTo(width + roofOverhang, height - roofHeight);
        graphics.lineTo(width + roofOverhang, height);
        graphics.lineTo(-roofOverhang, height);
        graphics.closePath();
        
        // Fill with gradient (manual gradient fill)
        const gradientSteps = 15;
        for (let i = 0; i < gradientSteps; i++) {
            const t = i / (gradientSteps - 1);
            const blendColor = this.pixelRenderer.blendColors(roofLight, roofDark, t);
            const y1 = height - roofHeight + (roofHeight * t);
            const y2 = height - roofHeight + (roofHeight * (t + 1/gradientSteps));
            
            if (y2 > height) break;
            
            const x1 = this.getRoofXAtY(y1, width, height, roofHeight, roofTopY, roofOverhang);
            const x2 = this.getRoofXAtY(y2, width, height, roofHeight, roofTopY, roofOverhang);
            const x1Right = width + roofOverhang - (x1 - (-roofOverhang));
            const x2Right = width + roofOverhang - (x2 - (-roofOverhang));
            
            graphics.fillStyle(blendColor);
            graphics.fillRect(x1, y1, x2 - x1, y2 - y1);
            graphics.fillRect(x1Right - (x2 - x1), y1, x2 - x1, y2 - y1);
        }
        
        // Draw detailed shingle pattern
        graphics.lineStyle(1, ColorUtils.darken(colors.roof, 0.25), 0.6);
        const shingleHeight = 6;
        for (let sy = height - roofHeight; sy <= height; sy += shingleHeight) {
            const shingleY = sy;
            const shingleX1 = this.getRoofXAtY(shingleY, width, height, roofHeight, roofTopY, roofOverhang);
            const shingleX2 = width + roofOverhang - (shingleX1 - (-roofOverhang));
            const shingleWidth = shingleX2 - shingleX1;
            
            // Draw individual shingles
            const shingleWidth_single = 14;
            for (let sx = shingleX1; sx < shingleX2; sx += shingleWidth_single) {
                // Alternate shingle offset for realistic pattern
                const offset = ((sy - (height - roofHeight)) / shingleHeight) % 2 === 0 ? 0 : shingleWidth_single / 2;
                const actualX = sx + offset;
                
                if (actualX < shingleX2) {
                    // Shingle highlight (top edge)
                    graphics.fillStyle(ColorUtils.lighten(colors.roof, 0.1), 0.4);
                    graphics.fillRect(actualX, shingleY, shingleWidth_single, 1);
                    
                    // Shingle shadow (bottom edge)
                    graphics.fillStyle(ColorUtils.darken(colors.roof, 0.15), 0.4);
                    graphics.fillRect(actualX, shingleY + shingleHeight - 1, shingleWidth_single, 1);
                    
                    // Shingle separator line
                    graphics.beginPath();
                    graphics.moveTo(actualX, shingleY);
                    graphics.lineTo(actualX, shingleY + shingleHeight);
                    graphics.strokePath();
                }
            }
            
            // Draw horizontal shingle row separator
            graphics.beginPath();
            graphics.moveTo(shingleX1, shingleY);
            graphics.lineTo(shingleX2, shingleY);
            graphics.strokePath();
        }
        
        // Roof outline with double line for depth
        graphics.lineStyle(3, 0x000000, 0.6);
        graphics.beginPath();
        graphics.moveTo(-roofOverhang, height - roofHeight);
        graphics.lineTo(width / 2, roofTopY);
        graphics.lineTo(width + roofOverhang, height - roofHeight);
        graphics.strokePath();
        
        graphics.lineStyle(2, 0x000000, 1.0);
        graphics.beginPath();
        graphics.moveTo(-roofOverhang, height - roofHeight);
        graphics.lineTo(width / 2, roofTopY);
        graphics.lineTo(width + roofOverhang, height - roofHeight);
        graphics.strokePath();
        
        // Roof edge shadow
        graphics.fillStyle(0x000000, 0.2);
        graphics.fillRect(-roofOverhang, height - roofHeight, width + roofOverhang * 2, 2);
    }

    /**
     * Calculate roof X position at given Y (for gradient drawing)
     */
    getRoofXAtY(y, width, height, roofHeight, roofTopY, roofOverhang) {
        if (y >= height - roofHeight) {
            return -roofOverhang;
        }
        
        const t = (y - (height - roofHeight)) / (roofTopY - (height - roofHeight));
        if (t < 0) return -roofOverhang;
        if (t > 1) return width / 2;
        
        return -roofOverhang + (width / 2 + roofOverhang) * (1 - t);
    }

    /**
     * Draw windows with enhanced details
     */
    drawWindows(graphics, width, height, colors) {
        const windowSize = 14;
        const windowSpacing = 18;
        const numWindows = Math.max(1, Math.floor((width - windowSpacing) / (windowSize + windowSpacing)));
        
        // Calculate window positions (symmetrical)
        const startX = (width - (numWindows * (windowSize + windowSpacing) - windowSpacing)) / 2;
        const windowRow1Y = height * 0.25; // First row
        const windowRow2Y = height * 0.45; // Second row (if building is tall enough)
        const hasSecondRow = height > 100;
        
        const windowRows = hasSecondRow ? [windowRow1Y, windowRow2Y] : [windowRow1Y];
        
        windowRows.forEach(windowY => {
            for (let i = 0; i < numWindows; i++) {
                const windowX = startX + i * (windowSize + windowSpacing);
                
                // Window frame (3D effect)
                // Outer frame shadow
                graphics.fillStyle(0x2A1A0A);
                graphics.fillRect(windowX - 3, windowY - 3, windowSize + 6, windowSize + 6);
                
                // Frame (wood/brown)
                graphics.fillStyle(0x654321);
                graphics.fillRect(windowX - 2, windowY - 2, windowSize + 4, windowSize + 4);
                
                // Frame highlight (top and left)
                graphics.fillStyle(0x8B6B4A, 0.6);
                graphics.fillRect(windowX - 2, windowY - 2, windowSize + 4, 2); // Top
                graphics.fillRect(windowX - 2, windowY - 2, 2, windowSize + 4); // Left
                
                // Frame shadow (bottom and right)
                graphics.fillStyle(0x3A2A1A, 0.6);
                graphics.fillRect(windowX - 2, windowY + windowSize, windowSize + 4, 2); // Bottom
                graphics.fillRect(windowX + windowSize, windowY - 2, 2, windowSize + 4); // Right
                
                // Window glass with gradient (lighter at top, darker at bottom)
                const windowLight = ColorUtils.lighten(colors.window, 0.2);
                const windowDark = ColorUtils.darken(colors.window, 0.1);
                this.pixelRenderer.drawPixelGradient(
                    graphics, windowX, windowY, windowSize, windowSize,
                    windowLight, windowDark, 'vertical', 8, false
                );
                
                // Window reflection highlight (top-left corner)
                graphics.fillStyle(0xFFFFFF, 0.3);
                graphics.fillRect(windowX + 1, windowY + 1, windowSize / 3, windowSize / 3);
                
                // Window panes (cross pattern)
                graphics.lineStyle(2, 0x000000, 0.7);
                graphics.beginPath();
                graphics.moveTo(windowX + windowSize / 2, windowY);
                graphics.lineTo(windowX + windowSize / 2, windowY + windowSize);
                graphics.moveTo(windowX, windowY + windowSize / 2);
                graphics.lineTo(windowX + windowSize, windowY + windowSize / 2);
                graphics.strokePath();
                
                // Window sill (bottom ledge)
                graphics.fillStyle(0x5A4A3A);
                graphics.fillRect(windowX - 2, windowY + windowSize + 2, windowSize + 4, 3);
                
                // Sill highlight
                graphics.fillStyle(0x7A6A5A, 0.5);
                graphics.fillRect(windowX - 2, windowY + windowSize + 2, windowSize + 4, 1);
            }
        });
    }

    /**
     * Draw door with enhanced details and 3D effect
     */
    drawDoor(graphics, width, height, colors, enterable) {
        const doorWidth = 18;
        const doorHeight = 28;
        const doorX = width / 2 - doorWidth / 2;
        const doorY = height - doorHeight - 6;
        
        // Door frame (3D effect)
        // Outer shadow
        graphics.fillStyle(0x2A1A0A);
        graphics.fillRect(doorX - 4, doorY - 4, doorWidth + 8, doorHeight + 8);
        
        // Frame
        graphics.fillStyle(0x654321);
        graphics.fillRect(doorX - 2, doorY - 2, doorWidth + 4, doorHeight + 4);
        
        // Frame highlight
        graphics.fillStyle(0x8B6B4A, 0.6);
        graphics.fillRect(doorX - 2, doorY - 2, doorWidth + 4, 2); // Top
        graphics.fillRect(doorX - 2, doorY - 2, 2, doorHeight + 4); // Left
        
        // Frame shadow
        graphics.fillStyle(0x3A2A1A, 0.6);
        graphics.fillRect(doorX - 2, doorY + doorHeight, doorWidth + 4, 2); // Bottom
        graphics.fillRect(doorX + doorWidth, doorY - 2, 2, doorHeight + 4); // Right
        
        // Door panel with texture
        this.pixelRenderer.drawTexturedRect(
            graphics, doorX, doorY, doorWidth, doorHeight, colors.door, 'plank', {
                tileSize: 4,
                outline: false
            }
        );
        
        // Door shading (darker on left, lighter on right for depth)
        this.pixelRenderer.drawPixelGradient(
            graphics, doorX, doorY, doorWidth, doorHeight,
            ColorUtils.darken(colors.door, 0.1), ColorUtils.lighten(colors.door, 0.05),
            'horizontal', 6, false
        );
        
        // Door panels (vertical divisions for paneled door)
        graphics.lineStyle(2, ColorUtils.darken(colors.door, 0.2), 0.8);
        graphics.beginPath();
        graphics.moveTo(doorX + doorWidth / 3, doorY);
        graphics.lineTo(doorX + doorWidth / 3, doorY + doorHeight);
        graphics.moveTo(doorX + doorWidth * 2 / 3, doorY);
        graphics.lineTo(doorX + doorWidth * 2 / 3, doorY + doorHeight);
        graphics.strokePath();
        
        // Horizontal panel divider
        graphics.beginPath();
        graphics.moveTo(doorX, doorY + doorHeight / 2);
        graphics.lineTo(doorX + doorWidth, doorY + doorHeight / 2);
        graphics.strokePath();
        
        // Door handle (if enterable)
        if (enterable) {
            const handleX = doorX + doorWidth - 5;
            const handleY = doorY + doorHeight / 2;
            
            // Handle shadow
            graphics.fillStyle(0x8B7500);
            graphics.fillCircle(handleX, handleY + 1, 3);
            
            // Handle (gold)
            graphics.fillStyle(0xFFD700);
            graphics.fillCircle(handleX, handleY, 3);
            
            // Handle highlight
            graphics.fillStyle(0xFFFFAA, 0.6);
            graphics.fillCircle(handleX - 1, handleY - 1, 1.5);
            
            // Handle outline
            graphics.lineStyle(1, 0x000000, 0.8);
            graphics.strokeCircle(handleX, handleY, 3);
            
            // Glow effect to indicate interactivity
            graphics.fillStyle(0xFFD700, 0.2);
            graphics.fillCircle(handleX, handleY, 5);
        }
        
        // Door outline
        graphics.lineStyle(2, 0x000000, 0.9);
        graphics.strokeRect(doorX, doorY, doorWidth, doorHeight);
        
        // Door threshold (bottom step)
        graphics.fillStyle(0x5A4A3A);
        graphics.fillRect(doorX - 2, doorY + doorHeight, doorWidth + 4, 4);
        
        return {
            x: doorX,
            y: doorY,
            width: doorWidth,
            height: doorHeight
        };
    }

    /**
     * Generate a shop building (commercial type with high-quality shop sign)
     */
    generateShopBuilding(x, y, shopType = 'general') {
        const building = this.generateBuilding('commercial', x, y, {
            enterable: true,
            width: 100,
            height: 130
        });
        
        // Create high-quality shop sign with texture
        const signWidth = 70;
        const signHeight = 20;
        const signY = building.sprite.y - building.height + 25;
        const signTextureKey = `shop-sign-${Date.now()}`;
        
        // Generate sign texture
        const signGraphics = this.scene.add.graphics();
        
        // Sign background (wooden board)
        this.pixelRenderer.drawTexturedRect(
            signGraphics, 0, 0, signWidth, signHeight, 0x8B6B4A, 'wood', {
                tileSize: 6,
                outline: true,
                outlineColor: 0x654321
            }
        );
        
        // Sign border/decorative frame
        signGraphics.fillStyle(0x654321);
        signGraphics.fillRect(0, 0, signWidth, 3); // Top
        signGraphics.fillRect(0, signHeight - 3, signWidth, 3); // Bottom
        signGraphics.fillRect(0, 0, 3, signHeight); // Left
        signGraphics.fillRect(signWidth - 3, 0, 3, signHeight); // Right
        
        // Sign highlight (top edge)
        signGraphics.fillStyle(0xA58B6A, 0.6);
        signGraphics.fillRect(0, 0, signWidth, 1);
        
        // Sign shadow (bottom edge)
        signGraphics.fillStyle(0x5A4A3A, 0.6);
        signGraphics.fillRect(0, signHeight - 1, signWidth, 1);
        
        signGraphics.generateTexture(signTextureKey, signWidth, signHeight);
        signGraphics.destroy();
        
        // Create sign sprite
        const sign = this.scene.add.image(building.sprite.x, signY, signTextureKey);
        sign.setDepth(building.sprite.depth + 1);
        
        // Shop text with better styling
        const shopText = this.scene.add.text(building.sprite.x, signY, 'SHOP', {
            fontSize: '12px',
            fill: '#FFD700',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        shopText.setOrigin(0.5, 0.5);
        shopText.setDepth(sign.depth + 1);
        
        // Add hanging chains/ropes
        const chainColor = 0x8B7355;
        const leftChain = this.scene.add.rectangle(building.sprite.x - signWidth/2 - 2, signY - signHeight/2, 3, 8, chainColor);
        leftChain.setDepth(sign.depth);
        const rightChain = this.scene.add.rectangle(building.sprite.x + signWidth/2 + 2, signY - signHeight/2, 3, 8, chainColor);
        rightChain.setDepth(sign.depth);
        
        building.shopType = shopType;
        building.sign = sign;
        building.shopText = shopText;
        building.chains = [leftChain, rightChain];
        
        return building;
    }
}


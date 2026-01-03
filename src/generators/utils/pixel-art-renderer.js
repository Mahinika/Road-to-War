/**
 * Pixel Art Renderer - High-quality pixel art rendering utilities
 * Designed for chibi-style pixel art matching the game's hero aesthetic
 * Supports tile-based rendering, dithering, and chibi color palettes
 */

import { ColorUtils } from './color-utils.js';

export class PixelArtRenderer {
    constructor(scene) {
        this.scene = scene;
        
        // Standard tile sizes for pixel art
        this.tileSizes = {
            small: 16,
            medium: 32,
            large: 64
        };
        
        // Chibi color palettes for different elements
        this.chibiPalettes = {
            // Sky gradients
            sky: {
                light: [0x6B9BD2, 0x5A8BC2, 0x497BB2],
                dark: [0x2A4A6A, 0x1A3A5A, 0x0A2A4A],
                sunset: [0xFFB347, 0xFF8C42, 0xFF6B35]
            },
            // Ground/terrain
            ground: {
                grass: [0x7CB342, 0x689F38, 0x558B2F],
                dirt: [0x8D6E63, 0x6D4C41, 0x5D4037],
                stone: [0x9E9E9E, 0x757575, 0x616161],
                cobblestone: [0x757575, 0x616161, 0x424242]
            },
            // Building materials
            building: {
                wood: [0xD4A574, 0xC49464, 0xB48454],
                stone: [0x9E9E9E, 0x757575, 0x616161],
                brick: [0xC85A4D, 0xB84A3D, 0xA83A2D],
                roof: [0x8B4513, 0x6B3413, 0x4B2413]
            },
            // Roads
            road: {
                dirt: [0x8D6E63, 0x6D4C41, 0x5D4037],
                stone: [0x757575, 0x616161, 0x424242],
                cobblestone: [0x757575, 0x616161, 0x424242]
            }
        };
    }

    /**
     * Draw a pixel-perfect tile at coordinates
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - X position (will be snapped to pixel grid)
     * @param {number} y - Y position (will be snapped to pixel grid)
     * @param {number} tileSize - Size of the tile
     * @param {number} color - Fill color
     * @param {Object} options - Drawing options
     */
    drawPixelTile(graphics, x, y, tileSize, color, options = {}) {
        const {
            outline = true,
            outlineColor = 0x000000,
            outlineWidth = 1,
            alpha = 1.0
        } = options;

        // Snap to pixel grid for crisp rendering
        const snappedX = Math.floor(x);
        const snappedY = Math.floor(y);

        // Draw fill
        graphics.fillStyle(color, alpha);
        graphics.fillRect(snappedX, snappedY, tileSize, tileSize);

        // Draw outline
        if (outline) {
            graphics.lineStyle(outlineWidth, outlineColor, alpha);
            graphics.strokeRect(snappedX, snappedY, tileSize, tileSize);
        }
    }

    /**
     * Draw a dithered rectangle for smooth color transitions
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {Array<number>} colors - Array of colors for dithering
     * @param {Object} options - Drawing options
     */
    drawDitheredRect(graphics, x, y, width, height, colors, options = {}) {
        const {
            pattern = 'checkerboard', // 'checkerboard', 'vertical', 'horizontal', 'random'
            tileSize = 2,
            outline = false,
            outlineColor = 0x000000
        } = options;

        const snappedX = Math.floor(x);
        const snappedY = Math.floor(y);
        const tilesWide = Math.ceil(width / tileSize);
        const tilesHigh = Math.ceil(height / tileSize);

        for (let ty = 0; ty < tilesHigh; ty++) {
            for (let tx = 0; tx < tilesWide; tx++) {
                let colorIndex = 0;

                switch (pattern) {
                    case 'checkerboard':
                        colorIndex = (tx + ty) % colors.length;
                        break;
                    case 'vertical':
                        colorIndex = ty % colors.length;
                        break;
                    case 'horizontal':
                        colorIndex = tx % colors.length;
                        break;
                    case 'random':
                        colorIndex = Math.floor(Math.random() * colors.length);
                        break;
                }

                const tileX = snappedX + (tx * tileSize);
                const tileY = snappedY + (ty * tileSize);
                const tileW = Math.min(tileSize, snappedX + width - tileX);
                const tileH = Math.min(tileSize, snappedY + height - tileY);

                graphics.fillStyle(colors[colorIndex]);
                graphics.fillRect(tileX, tileY, tileW, tileH);
            }
        }

        if (outline) {
            graphics.lineStyle(1, outlineColor);
            graphics.strokeRect(snappedX, snappedY, width, height);
        }
    }

    /**
     * Draw a shape with chibi-style shading (5-level shading for high quality)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} shapeDrawer - Function that draws the shape
     * @param {Array<number>} colors - [highlight, light, base, dark, shadow] color array
     * @param {Object} options - Shading options
     */
    drawShadedShape(graphics, shapeDrawer, colors, options = {}) {
        const {
            highlightPosition = 0.2, // Position of highlight (0-1, top = 0)
            shadowPosition = 0.8,    // Position of shadow (0-1, bottom = 1)
            outline = true,
            outlineColor = 0x000000,
            outlineWidth = 1,
            gradientSteps = 5
        } = options;

        // Support both 3-color and 5-color shading
        const [highlight, light, base, dark, shadow] = colors.length >= 5 
            ? colors 
            : [colors[0], colors[0], colors[1] || colors[0], colors[2] || colors[0], colors[2] || colors[0]];

        // Draw base color
        graphics.fillStyle(base);
        shapeDrawer(graphics);

        // Draw multi-level shading for smooth transitions
        const steps = gradientSteps;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            
            // Top portion (highlight to light)
            if (t <= highlightPosition) {
                const blendT = t / highlightPosition;
                const shadeColor = this.blendColors(highlight, light, blendT);
                graphics.fillStyle(shadeColor, 0.15);
                shapeDrawer(graphics);
            }
            // Bottom portion (dark to shadow)
            else if (t >= shadowPosition) {
                const blendT = (t - shadowPosition) / (1 - shadowPosition);
                const shadeColor = this.blendColors(dark, shadow, blendT);
                graphics.fillStyle(shadeColor, 0.2);
                shapeDrawer(graphics);
            }
        }

        // Draw outline with anti-aliasing effect (double outline)
        if (outline) {
            // Outer outline (softer)
            graphics.lineStyle(outlineWidth + 1, outlineColor, 0.3);
            shapeDrawer(graphics, true);
            // Inner outline (sharp)
            graphics.lineStyle(outlineWidth, outlineColor, 1.0);
            shapeDrawer(graphics, true);
        }
    }

    /**
     * Draw pixel-perfect circle with chibi style
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Radius
     * @param {number} color - Fill color
     * @param {Object} options - Drawing options
     */
    drawPixelCircle(graphics, x, y, radius, color, options = {}) {
        const {
            outline = true,
            outlineColor = 0x000000,
            outlineWidth = 1,
            alpha = 1.0
        } = options;

        const snappedX = Math.floor(x);
        const snappedY = Math.floor(y);
        const snappedRadius = Math.floor(radius);

        graphics.fillStyle(color, alpha);
        graphics.fillCircle(snappedX, snappedY, snappedRadius);

        if (outline) {
            graphics.lineStyle(outlineWidth, outlineColor, alpha);
            graphics.strokeCircle(snappedX, snappedY, snappedRadius);
        }
    }

    /**
     * Draw pixel-perfect line (1px wide, snapped to grid)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} color - Line color
     * @param {number} width - Line width (default 1)
     */
    drawPixelLine(graphics, x1, y1, x2, y2, color, width = 1) {
        const snappedX1 = Math.floor(x1);
        const snappedY1 = Math.floor(y1);
        const snappedX2 = Math.floor(x2);
        const snappedY2 = Math.floor(y2);

        graphics.lineStyle(width, color);
        graphics.beginPath();
        graphics.moveTo(snappedX1, snappedY1);
        graphics.lineTo(snappedX2, snappedY2);
        graphics.strokePath();
    }

    /**
     * Draw a tile-based pattern (useful for roads, paths, etc.)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} width - Pattern width
     * @param {number} height - Pattern height
     * @param {number} tileSize - Size of each tile
     * @param {Function} tileDrawer - Function(x, y, tileIndex) that draws each tile
     */
    drawTilePattern(graphics, x, y, width, height, tileSize, tileDrawer) {
        const tilesWide = Math.ceil(width / tileSize);
        const tilesHigh = Math.ceil(height / tileSize);

        for (let ty = 0; ty < tilesHigh; ty++) {
            for (let tx = 0; tx < tilesWide; tx++) {
                const tileX = Math.floor(x) + (tx * tileSize);
                const tileY = Math.floor(y) + (ty * tileSize);
                const tileIndex = (ty * tilesWide) + tx;
                tileDrawer(graphics, tileX, tileY, tileIndex);
            }
        }
    }

    /**
     * Get chibi color palette by name
     * @param {string} paletteName - Name of palette
     * @param {string} variant - Variant within palette
     * @returns {Array<number>} Array of colors
     */
    getChibiPalette(paletteName, variant = 'base') {
        const palette = this.chibiPalettes[paletteName];
        if (!palette) {
            return [0x808080]; // Default gray
        }

        if (Array.isArray(palette)) {
            return palette;
        }

        const variantColors = palette[variant] || palette[Object.keys(palette)[0]];
        return Array.isArray(variantColors) ? variantColors : [variantColors];
    }

    /**
     * Blend two colors (useful for gradients)
     * @param {number} color1 - First color
     * @param {number} color2 - Second color
     * @param {number} t - Blend factor (0-1, 0 = color1, 1 = color2)
     * @returns {number} Blended color
     */
    blendColors(color1, color2, t) {
        const c1 = ColorUtils.toRGB(color1);
        const c2 = ColorUtils.toRGB(color2);
        
        const r = Math.floor(c1.r + (c2.r - c1.r) * t);
        const g = Math.floor(c1.g + (c2.g - c1.g) * t);
        const b = Math.floor(c1.b + (c2.b - c1.b) * t);
        
        return ColorUtils.fromRGB(r, g, b);
    }

    /**
     * Draw a pixel-art style gradient with dithering for smoother transitions
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} color1 - Start color
     * @param {number} color2 - End color
     * @param {string} direction - 'vertical' or 'horizontal'
     * @param {number} steps - Number of gradient steps
     * @param {boolean} useDither - Use dithering for smoother transitions
     */
    drawPixelGradient(graphics, x, y, width, height, color1, color2, direction = 'vertical', steps = 20, useDither = true) {
        const isVertical = direction === 'vertical';
        const stepSize = isVertical ? (height / steps) : (width / steps);

        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            const blendColor = this.blendColors(color1, color2, t);

            if (isVertical) {
                const stepY = Math.floor(y + (i * stepSize));
                const stepH = Math.ceil(stepSize);
                
                if (useDither && i < steps - 1) {
                    // Add dithering between steps
                    const nextColor = this.blendColors(color1, color2, (i + 1) / (steps - 1));
                    this.drawDitheredRect(graphics, x, stepY, width, stepH, [blendColor, nextColor], {
                        pattern: 'checkerboard',
                        tileSize: 2
                    });
                } else {
                    graphics.fillStyle(blendColor);
                    graphics.fillRect(Math.floor(x), stepY, width, stepH);
                }
            } else {
                const stepX = Math.floor(x + (i * stepSize));
                const stepW = Math.ceil(stepSize);
                
                if (useDither && i < steps - 1) {
                    const nextColor = this.blendColors(color1, color2, (i + 1) / (steps - 1));
                    this.drawDitheredRect(graphics, stepX, y, stepW, height, [blendColor, nextColor], {
                        pattern: 'checkerboard',
                        tileSize: 2
                    });
                } else {
                    graphics.fillStyle(blendColor);
                    graphics.fillRect(stepX, Math.floor(y), stepW, height);
                }
            }
        }
    }

    /**
     * Draw a textured rectangle with pixel-perfect patterns
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} baseColor - Base color
     * @param {string} textureType - Type of texture ('wood', 'brick', 'stone', 'plank')
     * @param {Object} options - Texture options
     */
    drawTexturedRect(graphics, x, y, width, height, baseColor, textureType = 'plank', options = {}) {
        const {
            tileSize = 8,
            outline = true,
            outlineColor = 0x000000
        } = options;

        const snappedX = Math.floor(x);
        const snappedY = Math.floor(y);
        const snappedW = Math.floor(width);
        const snappedH = Math.floor(height);

        // Draw base
        graphics.fillStyle(baseColor);
        graphics.fillRect(snappedX, snappedY, snappedW, snappedH);

        // Add texture based on type
        switch (textureType) {
            case 'wood':
                this.drawWoodTexture(graphics, snappedX, snappedY, snappedW, snappedH, baseColor, tileSize);
                break;
            case 'brick':
                this.drawBrickTexture(graphics, snappedX, snappedY, snappedW, snappedH, baseColor, tileSize);
                break;
            case 'stone':
                this.drawStoneTexture(graphics, snappedX, snappedY, snappedW, snappedH, baseColor, tileSize);
                break;
            case 'plank':
            default:
                this.drawPlankTexture(graphics, snappedX, snappedY, snappedW, snappedH, baseColor, tileSize);
                break;
        }

        if (outline) {
            graphics.lineStyle(1, outlineColor);
            graphics.strokeRect(snappedX, snappedY, snappedW, snappedH);
        }
    }

    /**
     * Draw wood grain texture
     */
    drawWoodTexture(graphics, x, y, width, height, baseColor, tileSize) {
        const lightColor = ColorUtils.lighten(baseColor, 0.15);
        const darkColor = ColorUtils.darken(baseColor, 0.15);
        
        graphics.lineStyle(1, darkColor, 0.4);
        for (let wy = y; wy < y + height; wy += tileSize) {
            graphics.beginPath();
            graphics.moveTo(x, wy);
            // Add wave pattern for wood grain
            for (let wx = x; wx < x + width; wx += 4) {
                const wave = Math.sin((wx - x) * 0.1) * 1;
                graphics.lineTo(wx, wy + wave);
            }
            graphics.strokePath();
        }
        
        // Add horizontal lines for planks
        for (let wy = y; wy < y + height; wy += tileSize * 2) {
            graphics.lineStyle(1, darkColor, 0.6);
            graphics.beginPath();
            graphics.moveTo(x, wy);
            graphics.lineTo(x + width, wy);
            graphics.strokePath();
        }
    }

    /**
     * Draw brick pattern texture
     */
    drawBrickTexture(graphics, x, y, width, height, baseColor, tileSize) {
        const lightColor = ColorUtils.lighten(baseColor, 0.1);
        const darkColor = ColorUtils.darken(baseColor, 0.2);
        const brickWidth = tileSize * 3;
        const brickHeight = tileSize;
        const offset = brickWidth / 2; // Staggered pattern
        
        graphics.lineStyle(1, darkColor, 0.8);
        
        for (let by = y; by < y + height; by += brickHeight) {
            const rowOffset = ((by - y) / brickHeight) % 2 === 0 ? 0 : offset;
            
            for (let bx = x - rowOffset; bx < x + width; bx += brickWidth) {
                // Brick shadow (right and bottom)
                graphics.fillStyle(darkColor, 0.3);
                graphics.fillRect(bx + brickWidth - 2, by, 2, brickHeight);
                graphics.fillRect(bx, by + brickHeight - 2, brickWidth, 2);
                
                // Brick highlight (top-left)
                graphics.fillStyle(lightColor, 0.2);
                graphics.fillRect(bx, by, 2, brickHeight);
                graphics.fillRect(bx, by, brickWidth, 2);
                
                // Brick outline
                graphics.strokeRect(bx, by, brickWidth, brickHeight);
            }
        }
    }

    /**
     * Draw stone texture
     */
    drawStoneTexture(graphics, x, y, width, height, baseColor, tileSize) {
        const lightColor = ColorUtils.lighten(baseColor, 0.15);
        const darkColor = ColorUtils.darken(baseColor, 0.15);
        
        for (let sy = y; sy < y + height; sy += tileSize) {
            for (let sx = x; sx < x + width; sx += tileSize) {
                // Irregular stone shape
                const offsetX = (Math.random() - 0.5) * 2;
                const offsetY = (Math.random() - 0.5) * 2;
                const stoneSize = tileSize + (Math.random() - 0.5) * 2;
                
                // Shade variation
                const shade = Math.random() > 0.5 ? lightColor : darkColor;
                graphics.fillStyle(shade, 0.3);
                graphics.fillCircle(sx + tileSize/2 + offsetX, sy + tileSize/2 + offsetY, stoneSize/2);
                
                // Stone outline
                graphics.lineStyle(1, darkColor, 0.5);
                graphics.strokeCircle(sx + tileSize/2 + offsetX, sy + tileSize/2 + offsetY, stoneSize/2);
            }
        }
    }

    /**
     * Draw plank texture
     */
    drawPlankTexture(graphics, x, y, width, height, baseColor, tileSize) {
        const lightColor = ColorUtils.lighten(baseColor, 0.1);
        const darkColor = ColorUtils.darken(baseColor, 0.1);
        
        // Draw horizontal planks
        for (let py = y; py < y + height; py += tileSize) {
            // Plank base
            graphics.fillStyle(baseColor);
            graphics.fillRect(x, py, width, tileSize);
            
            // Plank highlight (top edge)
            graphics.fillStyle(lightColor, 0.4);
            graphics.fillRect(x, py, width, 1);
            
            // Plank shadow (bottom edge)
            graphics.fillStyle(darkColor, 0.4);
            graphics.fillRect(x, py + tileSize - 1, width, 1);
            
            // Wood grain lines
            graphics.lineStyle(1, darkColor, 0.2);
            for (let px = x; px < x + width; px += tileSize / 2) {
                graphics.beginPath();
                graphics.moveTo(px, py);
                graphics.lineTo(px, py + tileSize);
                graphics.strokePath();
            }
        }
    }
}


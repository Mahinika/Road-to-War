/**
 * Export Manager
 * Handles exporting sprites in multiple formats: sprite sheets, multiple sizes, animation data, atlas
 */

import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';

export class ExportManager {
    constructor() {
        this.formats = ['png', 'json', 'atlas'];
    }

    /**
     * Export sprite sheet (multiple frames in one image)
     * @param {Array<Object>} frames - Array of frame objects with canvas property
     * @param {Object} options - Export options
     * @returns {Object} { pngPath, jsonPath, metadata }
     */
    exportSpriteSheet(frames, options = {}) {
        const {
            outputPath = 'sprite_sheet.png',
            frameWidth = 48,
            frameHeight = 48,
            columns = null,
            spacing = 0,
            padding = 0
        } = options;

        if (!frames || frames.length === 0) {
            throw new Error('No frames provided for sprite sheet');
        }

        // Calculate layout
        const cols = columns || Math.ceil(Math.sqrt(frames.length));
        const rows = Math.ceil(frames.length / cols);
        
        const sheetWidth = cols * (frameWidth + spacing) - spacing + (padding * 2);
        const sheetHeight = rows * (frameHeight + spacing) - spacing + (padding * 2);
        
        const sheetCanvas = createCanvas(sheetWidth, sheetHeight);
        const ctx = sheetCanvas.getContext('2d');
        
        // Clear with transparency
        ctx.clearRect(0, 0, sheetWidth, sheetHeight);
        
        // Draw frames
        const frameData = [];
        for (let i = 0; i < frames.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const x = padding + col * (frameWidth + spacing);
            const y = padding + row * (frameHeight + spacing);
            
            const frame = frames[i];
            const frameCanvas = frame.canvas || frame;
            
            ctx.drawImage(frameCanvas, x, y, frameWidth, frameHeight);
            
            frameData.push({
                index: i,
                x: x,
                y: y,
                width: frameWidth,
                height: frameHeight,
                offsetX: frame.offsetX || 0,
                offsetY: frame.offsetY || 0
            });
        }
        
        // Save PNG
        const buffer = sheetCanvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        // Save metadata JSON
        const jsonPath = outputPath.replace('.png', '.json');
        const metadata = {
            width: sheetWidth,
            height: sheetHeight,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            frames: frameData,
            columns: cols,
            rows: rows
        };
        fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
        
        return {
            pngPath: outputPath,
            jsonPath: jsonPath,
            metadata: metadata
        };
    }

    /**
     * Export animation data (JSON with frame timing)
     * @param {Object} animation - Animation object
     * @param {Object} options - Export options
     * @returns {string} Path to exported JSON file
     */
    exportAnimationData(animation, options = {}) {
        const {
            outputPath = 'animation.json',
            format = 'json'
        } = options;

        const animationData = {
            type: animation.type,
            frames: animation.frames,
            duration: animation.duration,
            frameDuration: animation.frameDuration,
            loop: animation.loop !== false,
            ...animation
        };

        fs.writeFileSync(outputPath, JSON.stringify(animationData, null, 2));
        return outputPath;
    }

    /**
     * Export sprite at multiple sizes
     * @param {Object} sprite - Sprite object with canvas
     * @param {Array<number>} sizes - Array of sizes to export (e.g., [32, 48, 64])
     * @param {Object} options - Export options
     * @returns {Array<Object>} Array of export results { size, path }
     */
    exportMultipleSizes(sprite, sizes, options = {}) {
        const {
            basePath = 'sprite',
            format = 'png'
        } = options;

        const results = [];
        const canvas = sprite.canvas || sprite;
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        for (const size of sizes) {
            const newCanvas = createCanvas(size, size);
            const ctx = newCanvas.getContext('2d');
            
            // Use nearest neighbor for pixel-perfect scaling
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(canvas, 0, 0, size, size);
            
            const outputPath = `${basePath}_${size}x${size}.${format}`;
            const buffer = newCanvas.toBuffer(`image/${format}`);
            fs.writeFileSync(outputPath, buffer);
            
            results.push({
                size: size,
                path: outputPath,
                width: size,
                height: size
            });
        }

        return results;
    }

    /**
     * Generate texture atlas (for game engines)
     * @param {Array<Object>} sprites - Array of sprite objects
     * @param {Object} options - Atlas options
     * @returns {Object} { pngPath, jsonPath, metadata }
     */
    generateAtlas(sprites, options = {}) {
        const {
            outputPath = 'atlas.png',
            maxWidth = 512,
            maxHeight = 512,
            padding = 2
        } = options;

        // Simple packing algorithm (top-left, row by row)
        const packedSprites = [];
        let currentX = padding;
        let currentY = padding;
        let rowHeight = 0;
        let atlasWidth = 0;
        let atlasHeight = 0;

        for (const sprite of sprites) {
            const canvas = sprite.canvas || sprite;
            const width = canvas.width;
            const height = canvas.height;
            const name = sprite.name || `sprite_${packedSprites.length}`;

            // Check if sprite fits in current row
            if (currentX + width + padding > maxWidth) {
                // Move to next row
                currentX = padding;
                currentY += rowHeight + padding;
                rowHeight = 0;
            }

            // Check if we need to expand atlas
            if (currentX + width + padding > atlasWidth) {
                atlasWidth = Math.min(currentX + width + padding, maxWidth);
            }
            if (currentY + height + padding > atlasHeight) {
                atlasHeight = Math.min(currentY + height + padding, maxHeight);
            }

            packedSprites.push({
                name: name,
                x: currentX,
                y: currentY,
                width: width,
                height: height,
                sprite: sprite
            });

            rowHeight = Math.max(rowHeight, height);
            currentX += width + padding;
        }

        // Create atlas canvas
        const atlasCanvas = createCanvas(atlasWidth, atlasHeight);
        const ctx = atlasCanvas.getContext('2d');
        ctx.clearRect(0, 0, atlasWidth, atlasHeight);

        // Draw sprites
        const frameData = {};
        for (const packed of packedSprites) {
            ctx.drawImage(packed.sprite.canvas || packed.sprite, packed.x, packed.y);
            
            frameData[packed.name] = {
                x: packed.x,
                y: packed.y,
                width: packed.width,
                height: packed.height
            };
        }

        // Save atlas PNG
        const buffer = atlasCanvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);

        // Save atlas JSON
        const jsonPath = outputPath.replace('.png', '.json');
        const atlasData = {
            meta: {
                image: path.basename(outputPath),
                size: { w: atlasWidth, h: atlasHeight },
                format: 'RGBA8888',
                scale: 1
            },
            frames: frameData
        };
        fs.writeFileSync(jsonPath, JSON.stringify(atlasData, null, 2));

        return {
            pngPath: outputPath,
            jsonPath: jsonPath,
            metadata: atlasData,
            sprites: packedSprites
        };
    }

    /**
     * Export comprehensive sprite data (all formats)
     * @param {Object} sprite - Sprite object
     * @param {Object} options - Export options
     * @returns {Object} Export results
     */
    exportComprehensive(sprite, options = {}) {
        const {
            basePath = 'sprite',
            sizes = [32, 48, 64],
            generateAtlas = false,
            generateSheet = false
        } = options;

        const results = {
            base: null,
            sizes: [],
            atlas: null,
            sheet: null
        };

        // Export base sprite
        const canvas = sprite.canvas || sprite;
        const basePath_png = `${basePath}.png`;
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(basePath_png, buffer);
        results.base = basePath_png;

        // Export multiple sizes
        if (sizes && sizes.length > 0) {
            results.sizes = this.exportMultipleSizes(sprite, sizes, { basePath });
        }

        // Generate atlas if requested
        if (generateAtlas) {
            results.atlas = this.generateAtlas([sprite], {
                outputPath: `${basePath}_atlas.png`
            });
        }

        return results;
    }
}


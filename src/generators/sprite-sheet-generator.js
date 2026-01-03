/**
 * Sprite Sheet Generator - Combines frames into texture atlases
 * Creates optimized sprite sheets with metadata for Phaser 3 animations
 */

export class SpriteSheetGenerator {
    constructor(scene) {
        this.scene = scene;
        this.padding = 2; // Padding between frames to prevent bleeding
    }

    /**
     * Create a texture atlas from animation frames
     * @param {Array} frames - Array of texture keys for frames
     * @param {string} atlasName - Name for the atlas texture
     * @param {Object} options - Options {frameWidth, frameHeight, framesPerRow}
     * @returns {Object} {atlasKey, metadata}
     */
    createAtlas(frames, atlasName, options = {}) {
        const frameWidth = options.frameWidth || 40;
        const frameHeight = options.frameHeight || 60;
        const framesPerRow = options.framesPerRow || Math.ceil(Math.sqrt(frames.length));
        
        const atlasKey = `atlas-${atlasName}`;
        
        if (this.scene.textures.exists(atlasKey)) {
            return { atlasKey, metadata: this.getAtlasMetadata(atlasKey, frames, frameWidth, frameHeight, framesPerRow) };
        }

        // Calculate atlas dimensions
        const rows = Math.ceil(frames.length / framesPerRow);
        const atlasWidth = (frameWidth + this.padding * 2) * framesPerRow;
        const atlasHeight = (frameHeight + this.padding * 2) * rows;

        // Create graphics for atlas
        const graphics = this.scene.add.graphics();
        
        // Fill background (transparent)
        graphics.fillStyle(0x000000, 0);
        graphics.fillRect(0, 0, atlasWidth, atlasHeight);

        // Copy frames into atlas
        // Note: Phaser Graphics doesn't support copying textures directly
        // For now, create placeholder rectangles
        // Future: Use Canvas API or Phaser's texture copying methods
        let frameIndex = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < framesPerRow && frameIndex < frames.length; col++) {
                const frameKey = frames[frameIndex];
                const x = col * (frameWidth + this.padding * 2) + this.padding;
                const y = row * (frameHeight + this.padding * 2) + this.padding;
                
                if (this.scene.textures.exists(frameKey)) {
                    // Placeholder: Draw a colored rectangle
                    // In production, would copy actual texture using Canvas API
                    graphics.fillStyle(0x888888, 0.5);
                    graphics.fillRect(x, y, frameWidth, frameHeight);
                    graphics.lineStyle(1, 0xffffff, 0.3);
                    graphics.strokeRect(x, y, frameWidth, frameHeight);
                }
                
                frameIndex++;
            }
        }

        // Generate atlas texture
        graphics.generateTexture(atlasKey, atlasWidth, atlasHeight);
        graphics.destroy();

        // Generate metadata
        const metadata = this.generateFrameMetadata(atlasKey, frames, frameWidth, frameHeight, framesPerRow, rows);

        return { atlasKey, metadata };
    }

    /**
     * Generate frame metadata for Phaser 3 animations
     * @param {string} atlasKey - Atlas texture key
     * @param {Array} frames - Array of frame texture keys
     * @param {number} frameWidth - Width of each frame
     * @param {number} frameHeight - Height of each frame
     * @param {number} framesPerRow - Frames per row in atlas
     * @param {number} rows - Number of rows in atlas
     * @returns {Object} Frame metadata
     */
    generateFrameMetadata(atlasKey, frames, frameWidth, frameHeight, framesPerRow, rows) {
        const frameData = {};
        
        let frameIndex = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < framesPerRow && frameIndex < frames.length; col++) {
                const frameKey = frames[frameIndex];
                const x = col * (frameWidth + this.padding * 2) + this.padding;
                const y = row * (frameHeight + this.padding * 2) + this.padding;
                
                frameData[frameKey] = {
                    x: x,
                    y: y,
                    width: frameWidth,
                    height: frameHeight,
                    frame: frameIndex
                };
                
                frameIndex++;
            }
        }

        return {
            atlas: atlasKey,
            frames: frameData,
            frameWidth,
            frameHeight,
            totalFrames: frames.length
        };
    }

    /**
     * Get atlas metadata if it exists
     * @param {string} atlasKey - Atlas texture key
     * @param {Array} frames - Array of frame texture keys
     * @param {number} frameWidth - Width of each frame
     * @param {number} frameHeight - Height of each frame
     * @param {number} framesPerRow - Frames per row
     * @returns {Object} Frame metadata
     */
    getAtlasMetadata(atlasKey, frames, frameWidth, frameHeight, framesPerRow) {
        const rows = Math.ceil(frames.length / framesPerRow);
        return this.generateFrameMetadata(atlasKey, frames, frameWidth, frameHeight, framesPerRow, rows);
    }

    /**
     * Create optimized sprite sheet (power-of-2 dimensions)
     * @param {Array} frames - Array of texture keys
     * @param {string} atlasName - Atlas name
     * @param {Object} options - Options
     * @returns {Object} {atlasKey, metadata}
     */
    createOptimizedAtlas(frames, atlasName, options = {}) {
        const frameWidth = options.frameWidth || 40;
        const frameHeight = options.frameHeight || 60;
        
        // Calculate optimal layout
        const framesPerRow = this.calculateOptimalLayout(frames.length, frameWidth, frameHeight);
        
        // Ensure power-of-2 dimensions
        const rows = Math.ceil(frames.length / framesPerRow);
        let atlasWidth = (frameWidth + this.padding * 2) * framesPerRow;
        let atlasHeight = (frameHeight + this.padding * 2) * rows;
        
        // Round up to nearest power of 2
        atlasWidth = Math.pow(2, Math.ceil(Math.log2(atlasWidth)));
        atlasHeight = Math.pow(2, Math.ceil(Math.log2(atlasHeight)));
        
        return this.createAtlas(frames, atlasName, {
            ...options,
            frameWidth,
            frameHeight,
            framesPerRow,
            atlasWidth,
            atlasHeight
        });
    }

    /**
     * Calculate optimal layout for frames
     * @param {number} frameCount - Number of frames
     * @param {number} frameWidth - Frame width
     * @param {number} frameHeight - Frame height
     * @returns {number} Optimal frames per row
     */
    calculateOptimalLayout(frameCount, frameWidth, frameHeight) {
        // Try to create a roughly square layout
        const aspectRatio = frameWidth / frameHeight;
        const totalArea = frameCount * frameWidth * frameHeight;
        const sideLength = Math.sqrt(totalArea);
        
        let framesPerRow = Math.ceil(sideLength / frameWidth);
        
        // Ensure we don't have too many rows
        const rows = Math.ceil(frameCount / framesPerRow);
        if (rows > framesPerRow * 2) {
            framesPerRow = Math.ceil(Math.sqrt(frameCount));
        }
        
        return framesPerRow;
    }
}


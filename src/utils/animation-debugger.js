/**
 * Animation Debugger Utilities
 * Helper functions for debugging and inspecting animations
 */

import { getAnimationConfig, getFrameCount, getFrameRate } from '../config/animation-config.js';
import { Logger } from './logger.js';

export class AnimationDebugger {
    constructor(scene) {
        this.scene = scene;
        this.debugMode = false;
        this.frameInspector = null;
    }

    /**
     * Enable debug mode
     */
    enable() {
        this.debugMode = true;
        Logger.info('AnimationDebugger', 'Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disable() {
        this.debugMode = false;
        Logger.info('AnimationDebugger', 'Debug mode disabled');
    }

    /**
     * Wait for texture to be available
     * @param {string} textureKey - Texture key to wait for
     * @param {number} maxWait - Maximum wait time in ms
     * @returns {Promise<boolean>} True if texture exists
     */
    async waitForTexture(textureKey, maxWait = 2000) {
        const config = getAnimationConfig(this.scene);
        const settings = config.textureSettings;
        const start = Date.now();
        const pollInterval = settings.pollInterval || 50;
        const timeout = maxWait || settings.waitTimeout || 2000;

        while (!this.scene.textures.exists(textureKey) && (Date.now() - start) < timeout) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        const exists = this.scene.textures.exists(textureKey);
        if (this.debugMode && !exists) {
            Logger.debug('AnimationDebugger', `Texture ${textureKey} not available after ${Date.now() - start}ms`);
        }
        return exists;
    }

    /**
     * Validate texture and frame data
     * @param {string} textureKey - Texture key to validate
     * @returns {Object} Validation result
     */
    validateTexture(textureKey) {
        const result = {
            valid: false,
            textureKey,
            errors: [],
            warnings: [],
            info: {}
        };

        if (!this.scene.textures.exists(textureKey)) {
            result.errors.push('Texture does not exist');
            return result;
        }

        const texture = this.scene.textures.get(textureKey);
        if (!texture) {
            result.errors.push('Could not get texture object');
            return result;
        }

        result.info.width = texture.width || 0;
        result.info.height = texture.height || 0;
        result.info.sourceCount = texture.source ? texture.source.length : 0;

        // Check frame data
        if (texture.frames) {
            const frameKeys = Object.keys(texture.frames);
            result.info.frameCount = frameKeys.length;
            
            if (frameKeys.length > 0) {
                const firstFrame = texture.frames[frameKeys[0]];
                if (firstFrame) {
                    result.info.frameWidth = firstFrame.width || 0;
                    result.info.frameHeight = firstFrame.height || 0;
                    
                    // Check for sourceSize (critical for Phaser animations)
                    if (!firstFrame.sourceSize) {
                        result.warnings.push('Frame missing sourceSize (may cause animation errors)');
                    }
                }
            }
        } else {
            result.info.frameCount = 0;
            result.warnings.push('Texture has no frames collection (single-frame texture)');
        }

        // Check source
        if (texture.source && texture.source.length > 0) {
            const source = texture.source[0];
            if (source) {
                result.info.hasImage = !!source.image;
                result.info.hasCanvas = !!source.canvas;
                result.info.hasGLTexture = !!source.glTexture;
                
                if (!source.image && !source.canvas) {
                    result.warnings.push('Texture source has no image or canvas');
                }
            }
        } else {
            result.warnings.push('Texture has no source');
        }

        result.valid = result.errors.length === 0;
        return result;
    }

    /**
     * Inspect animation frames
     * @param {string} animKey - Animation key
     * @returns {Object} Frame inspection data
     */
    inspectAnimation(animKey) {
        const result = {
            animKey,
            exists: false,
            frameCount: 0,
            frameRate: 0,
            loop: false,
            frames: [],
            errors: [],
            warnings: []
        };

        if (!this.scene.anims.exists(animKey)) {
            result.errors.push('Animation does not exist');
            return result;
        }

        const anim = this.scene.anims.get(animKey);
        result.exists = true;
        result.frameCount = anim.frames ? anim.frames.length : 0;
        result.frameRate = anim.frameRate || 0;
        result.loop = anim.repeat !== undefined && anim.repeat !== 0;

        if (anim.frames) {
            for (let i = 0; i < anim.frames.length; i++) {
                const frame = anim.frames[i];
                const frameInfo = {
                    index: i,
                    textureKey: frame.textureKey || frame.key || 'unknown',
                    valid: false,
                    errors: []
                };

                // Validate frame
                const textureKey = frameInfo.textureKey;
                if (textureKey && textureKey !== 'unknown') {
                    const textureValidation = this.validateTexture(textureKey);
                    frameInfo.valid = textureValidation.valid;
                    frameInfo.errors = textureValidation.errors;
                    frameInfo.warnings = textureValidation.warnings;
                    frameInfo.info = textureValidation.info;
                } else {
                    frameInfo.errors.push('Frame has no texture key');
                }

                result.frames.push(frameInfo);
            }
        }

        // Check for invalid frames
        const invalidFrames = result.frames.filter(f => !f.valid);
        if (invalidFrames.length > 0) {
            result.warnings.push(`${invalidFrames.length} invalid frames found`);
        }

        return result;
    }

    /**
     * Get all animations for a character type
     * @param {string} characterType - Character type
     * @returns {Array} Array of animation keys
     */
    getCharacterAnimations(characterType) {
        const animations = [];
        const allAnims = this.scene.anims.anims.entries;

        for (const [key, anim] of Object.entries(allAnims)) {
            if (key.startsWith(`${characterType}-`)) {
                animations.push({
                    key,
                    frameCount: anim.frames ? anim.frames.length : 0,
                    frameRate: anim.frameRate || 0
                });
            }
        }

        return animations;
    }

    /**
     * Get animation statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const allAnims = this.scene.anims.anims.entries;
        const stats = {
            totalAnimations: Object.keys(allAnims).length,
            totalFrames: 0,
            totalTextures: 0,
            animationsByType: {},
            memoryEstimate: 0
        };

        const config = getAnimationConfig(this.scene);
        const frameDims = config.frameDimensions;
        const bytesPerPixel = 4; // RGBA

        for (const [key, anim] of Object.entries(allAnims)) {
            const frameCount = anim.frames ? anim.frames.length : 0;
            stats.totalFrames += frameCount;

            // Estimate memory (rough calculation)
            const frameMemory = frameDims.width * frameDims.height * bytesPerPixel;
            stats.memoryEstimate += frameCount * frameMemory;

            // Group by character type
            const parts = key.split('-');
            if (parts.length >= 2) {
                const type = parts[0];
                if (!stats.animationsByType[type]) {
                    stats.animationsByType[type] = 0;
                }
                stats.animationsByType[type]++;
            }
        }

        stats.totalTextures = Object.keys(this.scene.textures.list).length;
        stats.memoryEstimateMB = (stats.memoryEstimate / 1024 / 1024).toFixed(2);

        return stats;
    }

    /**
     * Export animation data for debugging
     * @param {string} animKey - Animation key
     * @returns {Object} Exportable animation data
     */
    exportAnimationData(animKey) {
        const inspection = this.inspectAnimation(animKey);
        const anim = this.scene.anims.get(animKey);

        return {
            animKey,
            frameCount: inspection.frameCount,
            frameRate: inspection.frameRate,
            loop: inspection.loop,
            frames: inspection.frames.map(f => ({
                index: f.index,
                textureKey: f.textureKey,
                valid: f.valid
            })),
            errors: inspection.errors,
            warnings: inspection.warnings,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Compare two animations
     * @param {string} animKey1 - First animation key
     * @param {string} animKey2 - Second animation key
     * @returns {Object} Comparison result
     */
    compareAnimations(animKey1, animKey2) {
        const anim1 = this.inspectAnimation(animKey1);
        const anim2 = this.inspectAnimation(animKey2);

        return {
            anim1: {
                key: animKey1,
                frameCount: anim1.frameCount,
                frameRate: anim1.frameRate,
                valid: anim1.errors.length === 0
            },
            anim2: {
                key: animKey2,
                frameCount: anim2.frameCount,
                frameRate: anim2.frameRate,
                valid: anim2.errors.length === 0
            },
            differences: {
                frameCount: anim1.frameCount !== anim2.frameCount,
                frameRate: anim1.frameRate !== anim2.frameRate,
                frameCountDiff: anim1.frameCount - anim2.frameCount,
                frameRateDiff: anim1.frameRate - anim2.frameRate
            }
        };
    }

    /**
     * Log animation information
     * @param {string} animKey - Animation key
     */
    logAnimationInfo(animKey) {
        const inspection = this.inspectAnimation(animKey);
        
        Logger.info('AnimationDebugger', `Animation: ${animKey}`);
        Logger.info('AnimationDebugger', `  Frame Count: ${inspection.frameCount}`);
        Logger.info('AnimationDebugger', `  Frame Rate: ${inspection.frameRate} fps`);
        Logger.info('AnimationDebugger', `  Loop: ${inspection.loop}`);

        if (inspection.errors.length > 0) {
            Logger.error('AnimationDebugger', `  Errors: ${inspection.errors.join(', ')}`);
        }

        if (inspection.warnings.length > 0) {
            Logger.warn('AnimationDebugger', `  Warnings: ${inspection.warnings.join(', ')}`);
        }

        const invalidFrames = inspection.frames.filter(f => !f.valid);
        if (invalidFrames.length > 0) {
            Logger.warn('AnimationDebugger', `  Invalid Frames: ${invalidFrames.length}/${inspection.frames.length}`);
        }
    }
}

/**
 * Create a debugger instance
 * @param {Phaser.Scene} scene - Phaser scene
 * @returns {AnimationDebugger} Debugger instance
 */
export function createAnimationDebugger(scene) {
    return new AnimationDebugger(scene);
}


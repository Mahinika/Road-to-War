/**
 * Animation Validator
 * Validates animations and provides testing utilities
 */

import { Logger } from './logger.js';
import { getFrameCount, getFrameRate } from '../config/animation-config.js';

export class AnimationValidator {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Validate an animation
     * @param {string} animKey - Animation key
     * @returns {Object} Validation result
     */
    validateAnimation(animKey) {
        const result = {
            animKey,
            valid: false,
            errors: [],
            warnings: [],
            info: {}
        };

        if (!this.scene.anims.exists(animKey)) {
            result.errors.push('Animation does not exist');
            return result;
        }

        const anim = this.scene.anims.get(animKey);
        result.info.frameCount = anim.frames ? anim.frames.length : 0;
        result.info.frameRate = anim.frameRate || 0;
        result.info.loop = anim.repeat !== undefined && anim.repeat !== 0;

        // Check frame count
        if (result.info.frameCount === 0) {
            result.errors.push('Animation has no frames');
        }

        // Check frame rate
        if (result.info.frameRate === 0) {
            result.warnings.push('Animation has zero frame rate');
        }

        // Validate each frame
        if (anim.frames) {
            let invalidFrameCount = 0;
            for (let i = 0; i < anim.frames.length; i++) {
                const frame = anim.frames[i];
                if (!frame) {
                    invalidFrameCount++;
                    continue;
                }

                const textureKey = frame.textureKey || frame.key;
                if (!textureKey) {
                    invalidFrameCount++;
                    continue;
                }

                if (!this.scene.textures.exists(textureKey)) {
                    invalidFrameCount++;
                    result.warnings.push(`Frame ${i} texture ${textureKey} does not exist`);
                }
            }

            if (invalidFrameCount > 0) {
                result.errors.push(`${invalidFrameCount} invalid frames found`);
            }
        }

        result.valid = result.errors.length === 0;
        return result;
    }

    /**
     * Validate all animations for a character type
     * @param {string} characterType - Character type
     * @returns {Array} Array of validation results
     */
    validateCharacterAnimations(characterType) {
        const results = [];
        const allAnims = this.scene.anims.anims.entries;

        for (const [key, anim] of Object.entries(allAnims)) {
            if (key.startsWith(`${characterType}-`)) {
                results.push(this.validateAnimation(key));
            }
        }

        return results;
    }

    /**
     * Validate all animations
     * @returns {Object} Validation summary
     */
    validateAllAnimations() {
        const allAnims = this.scene.anims.anims.entries;
        const results = [];
        const summary = {
            total: 0,
            valid: 0,
            invalid: 0,
            errors: 0,
            warnings: 0,
            byCharacterType: {}
        };

        for (const key of Object.keys(allAnims)) {
            const result = this.validateAnimation(key);
            results.push(result);

            summary.total++;
            if (result.valid) {
                summary.valid++;
            } else {
                summary.invalid++;
            }
            summary.errors += result.errors.length;
            summary.warnings += result.warnings.length;

            // Group by character type
            const parts = key.split('-');
            if (parts.length >= 2) {
                const type = parts[0];
                if (!summary.byCharacterType[type]) {
                    summary.byCharacterType[type] = { total: 0, valid: 0, invalid: 0 };
                }
                summary.byCharacterType[type].total++;
                if (result.valid) {
                    summary.byCharacterType[type].valid++;
                } else {
                    summary.byCharacterType[type].invalid++;
                }
            }
        }

        summary.results = results;
        return summary;
    }

    /**
     * Compare two animations
     * @param {string} animKey1 - First animation key
     * @param {string} animKey2 - Second animation key
     * @returns {Object} Comparison result
     */
    compareAnimations(animKey1, animKey2) {
        const result1 = this.validateAnimation(animKey1);
        const result2 = this.validateAnimation(animKey2);

        return {
            anim1: {
                key: animKey1,
                valid: result1.valid,
                frameCount: result1.info.frameCount,
                frameRate: result1.info.frameRate
            },
            anim2: {
                key: animKey2,
                valid: result2.valid,
                frameCount: result2.info.frameCount,
                frameRate: result2.info.frameRate
            },
            differences: {
                frameCount: result1.info.frameCount !== result2.info.frameCount,
                frameRate: result1.info.frameRate !== result2.info.frameRate,
                frameCountDiff: result1.info.frameCount - result2.info.frameCount,
                frameRateDiff: result1.info.frameRate - result2.info.frameRate,
                bothValid: result1.valid && result2.valid
            }
        };
    }

    /**
     * Check if animation matches expected configuration
     * @param {string} animKey - Animation key
     * @param {string} expectedAnimationName - Expected animation name (e.g., 'walk', 'idle')
     * @returns {Object} Match result
     */
    checkAnimationConfig(animKey, expectedAnimationName) {
        const result = {
            animKey,
            expectedAnimationName,
            matches: false,
            differences: {}
        };

        if (!this.scene.anims.exists(animKey)) {
            result.differences.exists = false;
            return result;
        }

        const anim = this.scene.anims.get(animKey);
        const expectedFrameCount = getFrameCount(expectedAnimationName, this.scene);
        const expectedFrameRate = getFrameRate(expectedAnimationName, this.scene);

        const actualFrameCount = anim.frames ? anim.frames.length : 0;
        const actualFrameRate = anim.frameRate || 0;

        result.differences.frameCount = {
            expected: expectedFrameCount,
            actual: actualFrameCount,
            matches: expectedFrameCount === actualFrameCount
        };

        result.differences.frameRate = {
            expected: expectedFrameRate,
            actual: actualFrameRate,
            matches: expectedFrameRate === actualFrameRate
        };

        result.matches = result.differences.frameCount.matches && result.differences.frameRate.matches;
        return result;
    }

    /**
     * Get performance metrics for an animation
     * @param {string} animKey - Animation key
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics(animKey) {
        if (!this.scene.anims.exists(animKey)) {
            return null;
        }

        const anim = this.scene.anims.get(animKey);
        const frameCount = anim.frames ? anim.frames.length : 0;
        const frameRate = anim.frameRate || 0;
        const duration = frameCount / frameRate;

        // Estimate memory (rough calculation)
        const frameWidth = 40;
        const frameHeight = 60;
        const bytesPerPixel = 4; // RGBA
        const memoryEstimate = frameCount * frameWidth * frameHeight * bytesPerPixel;

        return {
            animKey,
            frameCount,
            frameRate,
            duration: duration.toFixed(2),
            memoryEstimate,
            memoryEstimateMB: (memoryEstimate / 1024 / 1024).toFixed(2)
        };
    }

    /**
     * Run batch validation
     * @param {Array<string>} animKeys - Array of animation keys to validate
     * @returns {Object} Batch validation result
     */
    batchValidate(animKeys) {
        const results = [];
        const summary = {
            total: animKeys.length,
            valid: 0,
            invalid: 0,
            errors: 0,
            warnings: 0
        };

        for (const animKey of animKeys) {
            const result = this.validateAnimation(animKey);
            results.push(result);

            if (result.valid) {
                summary.valid++;
            } else {
                summary.invalid++;
            }
            summary.errors += result.errors.length;
            summary.warnings += result.warnings.length;
        }

        return {
            summary,
            results
        };
    }
}

/**
 * Create a validator instance
 * @param {Phaser.Scene} scene - Phaser scene
 * @returns {AnimationValidator} Validator instance
 */
export function createAnimationValidator(scene) {
    return new AnimationValidator(scene);
}


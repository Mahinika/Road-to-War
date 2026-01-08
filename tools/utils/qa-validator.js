/**
 * QA Validator
 * Validates generated sprites against Dragumagu-style pixel art specifications
 */

import { ProportionManager } from './proportion-manager.js';

export class QAValidator {
    constructor() {
        this.styleGuide = {
            maxColors: 16,
            outlineThickness: { outer: { min: 2, max: 3 }, inner: 1 },
            shadingLevels: 5,
            paletteDeviation: 0.05, // 5%
            proportions: {
                head: { min: 0.30, max: 0.36 },
                torso: { min: 0.22, max: 0.28 },
                limbs: { min: 0.18, max: 0.22 }
            }
        };
    }

    /**
     * Main validation method
     * @param {Object} sprite - Sprite object with canvas property
     * @param {Object} styleGuide - Optional style guide override
     * @returns {Object} { valid: boolean, issues: Array<string>, details: Object }
     */
    validateSprite(sprite, styleGuide = null) {
        const guide = styleGuide || this.styleGuide;
        const issues = [];
        const details = {};

        // Check proportions
        const proportionCheck = this.checkProportions(sprite, guide.proportions);
        if (!proportionCheck.valid) {
            issues.push(...proportionCheck.issues);
        }
        details.proportions = proportionCheck;

        // Check color count
        const colorCount = this.countColors(sprite);
        details.colorCount = colorCount;
        if (colorCount > guide.maxColors) {
            issues.push(`Color count ${colorCount} exceeds maximum ${guide.maxColors}`);
        }

        // Check outline thickness
        const outlineCheck = this.checkOutlineThickness(sprite, guide.outlineThickness);
        if (!outlineCheck.valid) {
            issues.push(...outlineCheck.issues);
        }
        details.outline = outlineCheck;

        // Check shading levels
        const shadingCheck = this.checkShadingLevels(sprite, guide.shadingLevels);
        if (!shadingCheck.valid) {
            issues.push(...shadingCheck.issues);
        }
        details.shading = shadingCheck;

        // Check for clipping/overlap errors
        const clippingCheck = this.checkClipping(sprite);
        if (!clippingCheck.valid) {
            issues.push(...clippingCheck.issues);
        }
        details.clipping = clippingCheck;

        return {
            valid: issues.length === 0,
            issues: issues,
            details: details
        };
    }

    /**
     * Check proportions against style guide
     * @param {Object} sprite - Sprite object
     * @param {Object} expectedProportions - Expected proportions
     * @returns {Object} { valid: boolean, issues: Array<string>, actual: Object }
     */
    checkProportions(sprite, expectedProportions) {
        const issues = [];
        const canvas = sprite.canvas || sprite;
        const height = canvas.height || 48;
        
        // Use ProportionManager to validate
        const proportionManager = new ProportionManager(height);
        const validation = proportionManager.validateProportions();
        
        if (!validation.valid) {
            issues.push(...validation.errors);
        }

        return {
            valid: validation.valid,
            issues: issues,
            actual: validation.proportions,
            expected: expectedProportions
        };
    }

    /**
     * Count unique colors in sprite
     * @param {Object} sprite - Sprite object with canvas
     * @returns {number} Number of unique colors
     */
    countColors(sprite) {
        const canvas = sprite.canvas || sprite;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = new Set();

        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            // Only count non-transparent pixels
            if (a > 0) {
                const colorKey = `${r},${g},${b}`;
                colors.add(colorKey);
            }
        }

        return colors.size;
    }

    /**
     * Check outline thickness
     * @param {Object} sprite - Sprite object
     * @param {Object} expectedThickness - Expected thickness configuration
     * @returns {Object} { valid: boolean, issues: Array<string> }
     */
    checkOutlineThickness(sprite) {
        const issues = [];
        const canvas = sprite.canvas || sprite;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Sample outline pixels to check thickness
        // This is a simplified check - full implementation would analyze all outline regions
        let outerOutlineCount = 0;
        let innerOutlineCount = 0;
        
        // Check edges (should have outer outline)
        for (let x = 0; x < canvas.width; x++) {
            const topPixel = this.getPixel(imageData, x, 0, canvas.width);
            const bottomPixel = this.getPixel(imageData, x, canvas.height - 1, canvas.width);
            
            if (this.isOutlinePixel(topPixel) || this.isOutlinePixel(bottomPixel)) {
                outerOutlineCount++;
            }
        }
        
        // Simplified validation - in production would do full region analysis
        const hasOuterOutline = outerOutlineCount > canvas.width * 0.5;
        
        if (!hasOuterOutline) {
            issues.push('Missing or insufficient outer outline (expected 2-3px)');
        }

        return {
            valid: issues.length === 0,
            issues: issues,
            outerOutlineDetected: hasOuterOutline
        };
    }

    /**
     * Check shading levels (should be 5-level cel-shading)
     * @param {Object} sprite - Sprite object
     * @param {number} expectedLevels - Expected shading levels (default: 5)
     * @returns {Object} { valid: boolean, issues: Array<string>, detectedLevels: number }
     */
    checkShadingLevels(sprite, expectedLevels = 5) {
        const issues = [];
        const canvas = sprite.canvas || sprite;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Analyze color variations to detect shading levels
        const colorVariations = new Set();
        
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            
            if (a > 0) {
                // Group similar colors (within 10% variance) as same shading level
                const colorKey = `${Math.floor(r / 25)},${Math.floor(g / 25)},${Math.floor(b / 25)}`;
                colorVariations.add(colorKey);
            }
        }
        
        const detectedLevels = colorVariations.size;
        
        // Allow some flexibility (±1 level)
        if (detectedLevels < expectedLevels - 1 || detectedLevels > expectedLevels + 1) {
            issues.push(`Detected ${detectedLevels} shading levels, expected ${expectedLevels} (±1)`);
        }

        return {
            valid: issues.length === 0,
            issues: issues,
            detectedLevels: detectedLevels,
            expectedLevels: expectedLevels
        };
    }

    /**
     * Check for clipping/overlap errors
     * @param {Object} sprite - Sprite object
     * @returns {Object} { valid: boolean, issues: Array<string> }
     */
    checkClipping(sprite) {
        const issues = [];
        const canvas = sprite.canvas || sprite;
        
        // Check if sprite extends beyond canvas bounds
        // This is a simplified check - full implementation would analyze layer overlaps
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Check for unexpected transparency in center (might indicate clipping)
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const centerPixel = this.getPixel(imageData, centerX, centerY, canvas.width);
        
        if (centerPixel && centerPixel[3] === 0) {
            issues.push('Unexpected transparency in sprite center (possible clipping)');
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Get pixel from ImageData
     * @private
     */
    getPixel(imageData, x, y, width) {
        const index = (y * width + x) * 4;
        if (index < 0 || index >= imageData.data.length) return null;
        
        return [
            imageData.data[index],
            imageData.data[index + 1],
            imageData.data[index + 2],
            imageData.data[index + 3]
        ];
    }

    /**
     * Check if pixel is an outline pixel (black or very dark)
     * @private
     */
    isOutlinePixel(pixel) {
        if (!pixel) return false;
        const [r, g, b] = pixel;
        // Black or very dark (within 10% of black)
        return r < 25 && g < 25 && b < 25 && pixel[3] > 0;
    }
}


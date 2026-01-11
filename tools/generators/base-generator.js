/**
 * Base Generator
 * Shared base class for all asset generators
 */

import { setupCanvasContext } from '../utils/canvas-utils.js';
import { clamp, hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, getLuma, ensureVisibleFill } from '../utils/color-utils.js';

export class BaseGenerator {
    constructor(canvasUtils, colorUtils, config = {}) {
        this.canvasUtils = canvasUtils || { setupCanvasContext };
        this.colorUtils = colorUtils || { clamp, hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, getLuma, ensureVisibleFill };
        this.config = config;
    }

    /**
     * Setup canvas with pixel-perfect rendering
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} size - Canvas size
     * @returns {Object} Canvas info (centerX, centerY, radius)
     */
    setupCanvas(ctx, size) {
        return this.canvasUtils.setupCanvasContext(ctx, size);
    }

    /**
     * Clamp a number between min and max
     * @param {number} n - Number to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp(n, min, max) {
        return this.colorUtils.clamp(n, min, max);
    }

    /**
     * Lighten a hex color
     * @param {string} hex - Hex color
     * @param {number} amount - Lightening amount (0-1)
     * @returns {string} Lightened hex color
     */
    lightenHex(hex, amount = 0.35) {
        return this.colorUtils.lightenHex(hex, amount);
    }

    /**
     * Darken a hex color
     * @param {string} hex - Hex color
     * @param {number} amount - Darkening amount (0-1)
     * @returns {string} Darkened hex color
     */
    darkenHex(hex, amount = 0.35) {
        return this.colorUtils.darkenHex(hex, amount);
    }

    /**
     * Ensure a color is visible (lighten if too dark)
     * @param {string} hex - Hex color
     * @returns {string} Lightened hex color if too dark
     */
    ensureVisible(hex) {
        return this.colorUtils.ensureVisibleFill(hex);
    }
}

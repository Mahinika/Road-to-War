/**
 * Canvas Utilities
 * Shared canvas operations for asset generation
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { lightenHex, darkenHex } from './color-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup canvas context with pixel-perfect rendering
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} size - Canvas size
 * @returns {Object} Canvas center coordinates and radius
 */
export function setupCanvasContext(ctx, size) {
    ctx.imageSmoothingEnabled = false;
    return {
        centerX: size / 2,
        centerY: size / 2,
        radius: Math.floor(size * 0.35)
    };
}

/**
 * Resolve Godot res:// path to disk path
 * @param {string} resPath - Godot resource path (e.g., "res://assets/sprites/hero.png")
 * @returns {string|null} Disk path or null if invalid
 */
export function resolveResPathToDisk(resPath) {
    if (!resPath || typeof resPath !== 'string') return null;
    if (!resPath.startsWith('res://')) return null;
    const rel = resPath.replace('res://', '').replace(/\//g, path.sep);
    return path.join(__dirname, '..', 'road-to-war', rel);
}

/**
 * Check if a texture file is meaningful (not just a placeholder)
 * @param {string} diskPath - Path to texture file
 * @returns {Promise<boolean>} True if texture is meaningful
 */
export async function isMeaningfulTexture(diskPath) {
    try {
        const img = await loadImage(diskPath);
        const s = 32;
        const c = createCanvas(s, s);
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, s, s);
        ctx.drawImage(img, 0, 0, s, s);
        const data = ctx.getImageData(0, 0, s, s).data;

        const colorKey = (r, g, b) => `${r},${g},${b}`;
        const centerColors = new Set();
        const borderColors = new Set();

        for (let y = 0; y < s; y++) {
            for (let x = 0; x < s; x++) {
                const i = (y * s + x) * 4;
                const a = data[i + 3];
                if (a < 10) continue;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const key = colorKey(r, g, b);

                const isBorder = x < 4 || x >= s - 4 || y < 4 || y >= s - 4;
                const isCenter = x >= 8 && x < s - 8 && y >= 8 && y < s - 8;
                if (isBorder) borderColors.add(key);
                if (isCenter) centerColors.add(key);
            }
        }

        // If the texture has almost no color variety in the center but does on the border,
        // it's probably just a frame/placeholder.
        if (centerColors.size <= 3 && borderColors.size >= 3) return false;
        // If it's extremely flat overall, also treat as placeholder.
        if (centerColors.size <= 2 && borderColors.size <= 4) return false;
        return true;
    } catch {
        return false;
    }
}

/**
 * Draw an icon plate (background with bevel and rim)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} size - Canvas size
 * @param {string} baseColor - Base color for the plate
 */
export function drawIconPlate(ctx, size, baseColor) {
    const bg = darkenHex(baseColor, 0.35);
    const rim = lightenHex(baseColor, 0.35);

    // background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // inner bevel
    ctx.fillStyle = darkenHex(baseColor, 0.55);
    ctx.fillRect(3, 3, size - 6, size - 6);

    // rim
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    ctx.strokeStyle = rim;
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, size - 6, size - 6);
}

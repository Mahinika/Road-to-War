/**
 * Color Utilities
 * Shared color manipulation functions for asset generation
 */

/**
 * Clamp a number between min and max
 * @param {number} n - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

/**
 * Normalize hex color string to standard format
 * @param {string} hex - Hex color string (e.g., "FF0000", "#FF0000", "F00")
 * @returns {string} Normalized hex string with # prefix
 */
export function normalizeHex(hex) {
    if (typeof hex !== 'string') return '#888888';
    if (!hex.startsWith('#')) return `#${hex}`;
    return hex;
}

/**
 * Convert hex color string to RGB object
 * @param {string} hex - Hex color string (e.g., "#FF0000" or "#F00")
 * @returns {Object} RGB object {r, g, b}
 */
export function hexToRgb(hex) {
    const h = normalizeHex(hex).replace('#', '');
    if (h.length === 3) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        return { r, g, b };
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
}

/**
 * Convert hex color (number or string) to RGB array
 * Supports both string ("#FF0000") and number (0xFF0000) formats
 * @param {string|number} hex - Hex color
 * @returns {Array<number>} [r, g, b]
 */
export function hexToRgbArray(hex) {
    if (typeof hex === 'number') {
        return [
            (hex >> 16) & 0xFF,
            (hex >> 8) & 0xFF,
            hex & 0xFF
        ];
    }
    const rgb = hexToRgb(hex);
    return [rgb.r, rgb.g, rgb.b];
}

/**
 * Convert hex color (number or string) to RGBA array with alpha
 * @param {string|number} hex - Hex color
 * @param {number} alpha - Alpha value (0-255, default 255)
 * @returns {Array<number>} [r, g, b, a]
 */
export function hexToRgbaArray(hex, alpha = 255) {
    const rgb = typeof hex === 'number' ? hexToRgbArray(hex) : hexToRgbArray(hex);
    return [...rgb, alpha];
}

/**
 * Convert RGB object to hex color string
 * @param {Object} rgb - RGB object {r, g, b}
 * @returns {string} Hex color string (e.g., "#ff0000")
 */
export function rgbToHex({ r, g, b }) {
    const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
    const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
    const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
    return `#${rr}${gg}${bb}`;
}

/**
 * Mix two hex colors by a given amount
 * @param {string} a - First hex color
 * @param {string} b - Second hex color
 * @param {number} t - Mix amount (0-1, 0 = all a, 1 = all b)
 * @returns {string} Mixed hex color
 */
export function mixHex(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return rgbToHex({
        r: A.r + (B.r - A.r) * t,
        g: A.g + (B.g - A.g) * t,
        b: A.b + (B.b - A.b) * t
    });
}

/**
 * Lighten a hex color by mixing with white
 * @param {string} hex - Hex color string
 * @param {number} amount - Lightening amount (0-1, default 0.35)
 * @returns {string} Lightened hex color
 */
export function lightenHex(hex, amount = 0.35) {
    return mixHex(hex, '#ffffff', clamp(amount, 0, 1));
}

/**
 * Darken a hex color by mixing with black
 * @param {string} hex - Hex color string
 * @param {number} amount - Darkening amount (0-1, default 0.35)
 * @returns {string} Darkened hex color
 */
export function darkenHex(hex, amount = 0.35) {
    return mixHex(hex, '#000000', clamp(amount, 0, 1));
}

/**
 * Calculate perceived luminance of a hex color
 * @param {string} hex - Hex color string
 * @returns {number} Luminance value (0-255)
 */
export function getLuma(hex) {
    const { r, g, b } = hexToRgb(hex);
    // Perceived luminance formula (sRGB-ish)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Ensure a color is visible by lightening if too dark
 * @param {string} hex - Hex color string
 * @returns {string} Lightened hex color if too dark, original otherwise
 */
export function ensureVisibleFill(hex) {
    // If the body color is too dark, lift it so it doesn't disappear on transparent.
    // This was a big reason some enemies read as "just eyes".
    return getLuma(hex) < 40 ? lightenHex(hex, 0.6) : hex;
}

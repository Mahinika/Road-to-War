/**
 * Palette Manager
 * Manages color palettes for pixel-art style sprites
 */

export class PaletteManager {
    constructor() {
        this.palettes = {
            // Paladin palette
            paladin: {
                armor: [0xC0C0C0, 0xE0E0E0, 0xA0A0A0, 0x808080], // Silver armor
                accent: [0x4169E1, 0x5A7FFF, 0x2E4DB8], // Royal blue
                cloth: [0x2C3E50, 0x34495E, 0x1A252F], // Dark blue-gray
                skin: [0xFFDBAC, 0xF4C2A1, 0xE8B896], // Light skin tones
                metal: [0xE0E0E0, 0xC0C0C0, 0xA0A0A0, 0x808080], // Metallic
                gold: [0xFFD700, 0xFFA500, 0xFF8C00], // Gold accents
                glow: [0xFFFF00, 0xFFFA00, 0xFFF500] // Holy light
            },
            // Generic humanoid palettes
            warm: {
                skin: [0xFFDBAC, 0xF4C2A1, 0xE8B896],
                cloth: [0x8B4513, 0xA0522D, 0xCD853F],
                metal: [0xC0C0C0, 0xA0A0A0, 0x808080]
            },
            cool: {
                skin: [0xFFDBAC, 0xF4C2A1, 0xE8B896],
                cloth: [0x2C3E50, 0x34495E, 0x1A252F],
                metal: [0x708090, 0x778899, 0x5F7F8F]
            },
            metallic: {
                armor: [0xC0C0C0, 0xE0E0E0, 0xA0A0A0, 0x808080],
                metal: [0xD3D3D3, 0xC0C0C0, 0xA9A9A9]
            },
            // Bloodline Specific Palettes
            ancient_warrior: {
                armor: [0xFFD700, 0xDAA520, 0xB8860B], // Golden/Brass armor
                accent: [0xC0C0C0, 0x808080, 0x404040], // Steel highlights
                cloth: [0x800000, 0x600000, 0x400000], // Royal red
                glow: [0xFFFF80, 0xFFFFCC, 0xFFFFFF] // White-gold light
            },
            arcane_scholar: {
                armor: [0x1A237E, 0x283593, 0x3949AB], // Deep blue arcane armor
                accent: [0x7E57C2, 0x9575CD, 0xB39DDB], // Lavender magical runes
                cloth: [0x4A148C, 0x6A1B9A, 0x8E24AA], // Purple robes
                glow: [0x00E5FF, 0x18FFFF, 0x84FFFF] // Cyan arcane energy
            },
            shadow_assassin: {
                armor: [0x212121, 0x424242, 0x616161], // Midnight black armor
                accent: [0x4A148C, 0x000000, 0x311B92], // Void purple highlights
                cloth: [0x000000, 0x121212, 0x1A1A1B], // Stealth black
                glow: [0xAA00FF, 0xD500F9, 0xE1F5FE] // Eerie void light
            },
            dragon_born: {
                armor: [0xB71C1C, 0xD32F2F, 0xE53935], // Crimson dragon scales
                accent: [0xFF6F00, 0xFFA000, 0xFFC107], // Ember highlights
                cloth: [0x3E2723, 0x4E342E, 0x5D4037], // Scorched earth
                glow: [0xFF3D00, 0xFF9100, 0xFFFF00] // Fire glow
            },
            nature_blessed: {
                armor: [0x1B5E20, 0x2E7D32, 0x388E3C], // Emerald/Leaf armor
                accent: [0x795548, 0x8D6E63, 0xA1887F], // Bark brown
                cloth: [0xDCEDC8, 0xC5E1A5, 0xAED581], // Pale green vines
                glow: [0x76FF03, 0xB2FF59, 0xCCFF90] // Living light
            }
        };
    }

    /**
     * Get a palette by name
     * @param {string} name - Palette name
     * @returns {Object|null} Palette object or null
     */
    getPalette(name) {
        return this.palettes[name] || null;
    }

    /**
     * Get a random color from a palette category
     * @param {string} paletteName - Palette name
     * @param {string} category - Category (e.g., 'armor', 'skin')
     * @param {Object} rng - SeededRNG instance
     * @returns {number} Hex color value
     */
    getColor(paletteName, category, rng) {
        const palette = this.getPalette(paletteName);
        if (!palette || !palette[category]) {
            return 0xFFFFFF; // Default white
        }
        return rng.randomChoice(palette[category]);
    }

    /**
     * Get a color with variation (slightly lighter/darker)
     * @param {number} baseColor - Base hex color
     * @param {Object} rng - SeededRNG instance
     * @param {number} variation - Variation amount (0-1)
     * @returns {number} Varied hex color
     */
    getVariedColor(baseColor, rng, variation = 0.1) {
        const r = (baseColor >> 16) & 0xFF;
        const g = (baseColor >> 8) & 0xFF;
        const b = baseColor & 0xFF;

        const factor = 1 + (rng.random() - 0.5) * 2 * variation;
        const newR = Math.max(0, Math.min(255, Math.floor(r * factor)));
        const newG = Math.max(0, Math.min(255, Math.floor(g * factor)));
        const newB = Math.max(0, Math.min(255, Math.floor(b * factor)));

        return (newR << 16) | (newG << 8) | newB;
    }

    /**
     * Get a darker shade of a color
     * @param {number} color - Base hex color
     * @param {number} factor - Darkening factor (0-1)
     * @returns {number} Darker hex color
     */
    darken(color, factor = 0.3) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        return ((r * (1 - factor)) << 16) | 
               ((g * (1 - factor)) << 8) | 
               (b * (1 - factor));
    }

    /**
     * Get a lighter shade of a color
     * @param {number} color - Base hex color
     * @param {number} factor - Lightening factor (0-1)
     * @returns {number} Lighter hex color
     */
    lighten(color, factor = 0.3) {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        return (Math.min(255, r + (255 - r) * factor) << 16) | 
               (Math.min(255, g + (255 - g) * factor) << 8) | 
               Math.min(255, b + (255 - b) * factor);
    }
}


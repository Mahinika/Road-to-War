/**
 * Dragumagu-Style Pixel Art Guide
 * Based on analysis of dragumagu's WoW pixel art content
 * 
 * Key Characteristics:
 * - High-detail chibi WoW characters
 * - Bold, clean outlines (2-3px)
 * - Vibrant WoW color palettes
 * - Equipment-heavy detail
 * - Expressive, dynamic poses
 * - Cel-shading with 5-level gradients
 */

export const DRAGUMAGU_STYLE = {
    // Outline System
    outline: {
        thickness: 3, // 2-3px for main forms (using 3px for bold Dragumagu look)
        color: 0x000000,
        internalThickness: 1, // 1px for details
        useSelectiveOutline: true, // Thicker on outer edges, thinner on internal details
    },

    // Shading System (5-level cel-shading)
    shading: {
        levels: 5, // light2, light1, base, dark1, dark2
        lightSource: 'top-left', // Consistent top-left lighting
        contrast: 'high', // Bold contrast for WoW aesthetic
        materialBased: true, // Different shading for metal vs cloth
    },

    // Color Palettes (WoW-inspired)
    palettes: {
        // WoW Class Colors
        paladin: {
            armor: [0xE0E0E0, 0xC0C0C0, 0xA0A0A0, 0x808080], // Silver plate
            cloth: [0x4169E1, 0x2E4DB8, 0x1E3A8A], // Royal blue
            gold: [0xFFD700, 0xFFA500, 0xFF8C00], // Bright gold
            glow: [0xFFFF00, 0xFFFA00], // Holy yellow
        },
        warrior: {
            armor: [0x8B7355, 0x6B5B4F, 0x4A3A2F], // Brown plate
            cloth: [0x8B0000, 0x6B0000, 0x4A0000], // Dark red
            metal: [0xC0C0C0, 0xA0A0A0, 0x808080], // Steel
        },
        mage: {
            cloth: [0x4169E1, 0x1E90FF, 0x00BFFF], // Arcane blue
            trim: [0xFFD700, 0xFFA500], // Gold trim
            glow: [0x00FFFF, 0x00E5E5], // Arcane cyan
        },
        rogue: {
            leather: [0x2F2F2F, 0x1F1F1F, 0x0F0F0F], // Dark leather
            accent: [0xFFD700, 0xFFA500], // Gold daggers
            shadow: [0x4B0082, 0x2E0052], // Purple shadow
        },
        hunter: {
            leather: [0x8B4513, 0x6B3413, 0x4A2413], // Brown leather
            cloth: [0x228B22, 0x006400], // Forest green
            metal: [0xC0C0C0, 0xA0A0A0], // Silver
        },
        warlock: {
            cloth: [0x4B0082, 0x2E0052, 0x1A0033], // Dark purple
            trim: [0xFF0000, 0xCC0000], // Red trim
            glow: [0xFF00FF, 0xCC00CC], // Fel purple
        },
        shaman: {
            mail: [0x00CED1, 0x008B8B, 0x006666], // Teal mail
            cloth: [0x2F4F4F, 0x1F2F2F], // Dark slate
            totem: [0xFFD700, 0xFFA500], // Gold totems
        },
        priest: {
            cloth: [0xFFFFFF, 0xE0E0E0, 0xC0C0C0], // White/light
            trim: [0xFFD700, 0xFFA500], // Gold trim
            glow: [0xFFFF00, 0xFFFA00], // Holy white-gold
        },
        deathKnight: {
            plate: [0x2F2F2F, 0x1F1F1F, 0x0F0F0F], // Dark plate
            runes: [0x00CED1, 0x008B8B], // Frost blue
            glow: [0xFF0000, 0xCC0000], // Blood red
        },
    },

    // Proportions (Chibi WoW Style)
    proportions: {
        headRatio: 0.33, // Head is 1/3 of total height (very chibi)
        torsoRatio: 0.25, // Compact torso
        limbRatio: 0.20, // Short, stout limbs
        equipmentScale: 1.2, // Equipment slightly oversized for detail
    },

    // Equipment Detail System
    equipment: {
        // Armor pieces get extra detail layers
        detailLayers: {
            plate: 3, // Base, highlight, shadow
            cloth: 2, // Base, shadow
            leather: 2, // Base, texture
            mail: 3, // Base, ring pattern, shadow
        },
        // Equipment-specific features
        features: {
            helmet: ['visor', 'plume', 'detailLines'],
            chest: ['segmentation', 'buckle', 'shoulderPads'],
            legs: ['kneeGuards', 'segmentation'],
            boots: ['toeCap', 'straps', 'sole'],
            gloves: ['fingers', 'wristGuard'],
            weapon: ['hilt', 'blade', 'glow', 'detail'],
        },
    },

    // Animation Principles
    animation: {
        frameCount: 8, // Standard 8-frame cycles
        frameRate: 12, // 12fps for pixel art
        squashStretch: true, // Exaggerated movement
        anticipation: true, // Wind-up before actions
        followThrough: true, // Equipment trails movement
    },

    // Material Shading Rules
    materials: {
        metal: {
            highlight: 0.4, // 40% lighter
            shadow: 0.4, // 40% darker
            contrast: 'high',
            reflection: true, // Bright specular highlights
        },
        cloth: {
            highlight: 0.2, // 20% lighter
            shadow: 0.3, // 30% darker
            contrast: 'medium',
            texture: true, // Subtle texture patterns
        },
        leather: {
            highlight: 0.15, // 15% lighter
            shadow: 0.25, // 25% darker
            contrast: 'medium',
            grain: true, // Leather grain pattern
        },
        skin: {
            highlight: 0.25, // 25% lighter
            shadow: 0.2, // 20% darker
            contrast: 'low',
            smooth: true, // Smooth gradients
        },
    },

    // WoW-Specific Aesthetic
    wowAesthetic: {
        // Class-specific glow colors
        classGlows: {
            paladin: 0xFFFF00, // Holy yellow
            mage: 0x00FFFF, // Arcane cyan
            warlock: 0xFF00FF, // Fel purple
            priest: 0xFFFFFF, // Holy white
            shaman: 0x00CED1, // Elemental teal
            deathKnight: 0xFF0000, // Blood red
        },
        // Equipment tier colors
        tierColors: {
            common: 0x9D9D9D, // Gray
            uncommon: 0x1EFF00, // Green
            rare: 0x0070DD, // Blue
            epic: 0xA335EE, // Purple
            legendary: 0xFF8000, // Orange
        },
        // Particle effects
        particles: {
            holy: { color: 0xFFFF00, intensity: 0.8 },
            arcane: { color: 0x00FFFF, intensity: 0.6 },
            fel: { color: 0xFF00FF, intensity: 1.0 },
            frost: { color: 0x00CED1, intensity: 0.7 },
            fire: { color: 0xFF4500, intensity: 0.9 },
        },
    },
};

/**
 * Generate a 5-level color palette from a base color
 * @param {number} baseColor - Base color in hex
 * @param {string} material - Material type (metal, cloth, leather, skin)
 * @returns {Object} 5-level palette
 */
export function generateDragumaguPalette(baseColor, material = 'cloth') {
    const materialRules = DRAGUMAGU_STYLE.materials[material] || DRAGUMAGU_STYLE.materials.cloth;
    
    const r = (baseColor >> 16) & 0xFF;
    const g = (baseColor >> 8) & 0xFF;
    const b = baseColor & 0xFF;

    const light2 = lightenColor(baseColor, materialRules.highlight * 1.5);
    const light1 = lightenColor(baseColor, materialRules.highlight);
    const dark1 = darkenColor(baseColor, materialRules.shadow);
    const dark2 = darkenColor(baseColor, materialRules.shadow * 1.5);

    return {
        light2,
        light1,
        base: baseColor,
        dark1,
        dark2,
        outline: DRAGUMAGU_STYLE.outline.color,
    };
}

/**
 * Lighten a color
 */
function lightenColor(color, amount) {
    const r = Math.min(255, ((color >> 16) & 0xFF) + Math.round(255 * amount));
    const g = Math.min(255, ((color >> 8) & 0xFF) + Math.round(255 * amount));
    const b = Math.min(255, (color & 0xFF) + Math.round(255 * amount));
    return (r << 16) | (g << 8) | b;
}

/**
 * Darken a color
 */
function darkenColor(color, amount) {
    const r = Math.max(0, ((color >> 16) & 0xFF) - Math.round(255 * amount));
    const g = Math.max(0, ((color >> 8) & 0xFF) - Math.round(255 * amount));
    const b = Math.max(0, (color & 0xFF) - Math.round(255 * amount));
    return (r << 16) | (g << 8) | b;
}

/**
 * Get class-specific palette
 * @param {string} className - WoW class name
 * @returns {Object} Class palette
 */
export function getClassPalette(className) {
    return DRAGUMAGU_STYLE.palettes[className.toLowerCase()] || DRAGUMAGU_STYLE.palettes.paladin;
}

/**
 * Get class glow color
 * @param {string} className - WoW class name
 * @returns {number} Glow color in hex
 */
export function getClassGlow(className) {
    return DRAGUMAGU_STYLE.wowAesthetic.classGlows[className.toLowerCase()] || 0xFFFFFF;
}


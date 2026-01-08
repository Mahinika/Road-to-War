/**
 * Create Hero Variants from LPC Base
 * Takes extracted LPC base sprite and creates colored variants for each class
 * 
 * Usage: node tools/create-hero-variants.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, '..', 'assets', 'sprites');
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sprites');
const GODOT_OUTPUT_DIR = path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites');

// Hero class definitions with colors and overlays
const HERO_CLASSES = {
    paladin: {
        name: 'Paladin',
        bodyTint: null, // No tint, natural skin
        armorColor: { r: 255, g: 215, b: 0 },     // Gold
        accentColor: { r: 255, g: 255, b: 255 },  // White/silver
        glowColor: { r: 255, g: 223, b: 128, a: 0.3 }, // Holy glow
    },
    ancient_warrior: {
        name: 'Ancient Warrior',
        bodyTint: null,
        armorColor: { r: 139, g: 69, b: 19 },     // Saddle brown (leather/iron)
        accentColor: { r: 178, g: 34, b: 34 },    // Firebrick red
        glowColor: null,
    },
    arcane_scholar: {
        name: 'Arcane Scholar',
        bodyTint: null,
        armorColor: { r: 65, g: 105, b: 225 },    // Royal blue (robe)
        accentColor: { r: 138, g: 43, b: 226 },   // Blue violet
        glowColor: { r: 100, g: 149, b: 237, a: 0.25 }, // Arcane glow
    },
    shadow_assassin: {
        name: 'Shadow Assassin',
        bodyTint: { r: 0.9, g: 0.85, b: 0.85 },   // Slightly pale
        armorColor: { r: 47, g: 47, b: 47 },      // Dark gray
        accentColor: { r: 128, g: 0, b: 128 },    // Purple
        glowColor: { r: 75, g: 0, b: 130, a: 0.2 }, // Shadow glow
    },
    nature_blessed: {
        name: 'Nature Blessed',
        bodyTint: null,
        armorColor: { r: 34, g: 139, b: 34 },     // Forest green
        accentColor: { r: 139, g: 90, b: 43 },    // Brown (wood)
        glowColor: { r: 144, g: 238, b: 144, a: 0.2 }, // Nature glow
    },
    divine_guardian: {
        name: 'Divine Guardian',
        bodyTint: null,
        armorColor: { r: 192, g: 192, b: 192 },   // Silver
        accentColor: { r: 255, g: 215, b: 0 },    // Gold
        glowColor: { r: 255, g: 255, b: 224, a: 0.25 }, // Divine glow
    },
    beast_master: {
        name: 'Beast Master',
        bodyTint: { r: 1.05, g: 0.95, b: 0.85 },  // Tan
        armorColor: { r: 139, g: 90, b: 43 },     // Brown leather
        accentColor: { r: 85, g: 107, b: 47 },    // Dark olive
        glowColor: null,
    },
    dragon_kin: {
        name: 'Dragon Kin',
        bodyTint: { r: 1.1, g: 0.85, b: 0.75 },   // Reddish tint
        armorColor: { r: 178, g: 34, b: 34 },     // Firebrick
        accentColor: { r: 255, g: 140, b: 0 },    // Dark orange
        glowColor: { r: 255, g: 100, b: 0, a: 0.25 }, // Fire glow
    },
    frostborn: {
        name: 'Frostborn',
        bodyTint: { r: 0.9, g: 0.95, b: 1.1 },    // Bluish pale
        armorColor: { r: 135, g: 206, b: 250 },   // Light sky blue
        accentColor: { r: 255, g: 255, b: 255 },  // White
        glowColor: { r: 173, g: 216, b: 230, a: 0.3 }, // Frost glow
    },
    lightning_touched: {
        name: 'Lightning Touched',
        bodyTint: null,
        armorColor: { r: 75, g: 0, b: 130 },      // Indigo
        accentColor: { r: 255, g: 255, b: 0 },    // Yellow
        glowColor: { r: 255, g: 255, b: 100, a: 0.3 }, // Electric glow
    },
    void_walker: {
        name: 'Void Walker',
        bodyTint: { r: 0.85, g: 0.8, b: 0.9 },    // Pale purple
        armorColor: { r: 48, g: 25, b: 52 },      // Dark purple
        accentColor: { r: 138, g: 43, b: 226 },   // Blue violet
        glowColor: { r: 75, g: 0, b: 130, a: 0.3 }, // Void glow
    }
};

// Humanoid progression tiers
const HUMANOID_TIERS = [
    { tier: 0, tint: { r: 0.7, g: 0.7, b: 0.7 }, name: 'Ragged' },      // Grayish (dirty)
    { tier: 1, tint: { r: 0.85, g: 0.75, b: 0.65 }, name: 'Traveler' }, // Tan
    { tier: 2, tint: { r: 0.9, g: 0.85, b: 0.8 }, name: 'Adventurer' }, // Light tan
    { tier: 3, tint: { r: 1.0, g: 0.9, b: 0.85 }, name: 'Veteran' },    // Normal
];

/**
 * Apply color tint to an image
 */
function applyTint(ctx, width, height, tint) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // Only non-transparent pixels
            data[i] = Math.min(255, Math.floor(data[i] * tint.r));     // R
            data[i + 1] = Math.min(255, Math.floor(data[i + 1] * tint.g)); // G
            data[i + 2] = Math.min(255, Math.floor(data[i + 2] * tint.b)); // B
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Add armor/clothing color overlay to non-skin areas
 */
function applyArmorOverlay(ctx, width, height, armorColor, intensity = 0.4) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Detect non-skin pixels (darker or less saturated areas)
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            const isSkin = r > 180 && g > 120 && b > 80 && r > g && g > b * 0.8;
            
            if (!isSkin && luminance < 200) {
                // Blend with armor color
                data[i] = Math.floor(r * (1 - intensity) + armorColor.r * intensity);
                data[i + 1] = Math.floor(g * (1 - intensity) + armorColor.g * intensity);
                data[i + 2] = Math.floor(b * (1 - intensity) + armorColor.b * intensity);
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Add glow effect around sprite
 */
function addGlow(ctx, width, height, glowColor) {
    if (!glowColor) return;
    
    // Create glow by drawing a larger, blurred version behind
    const tempCanvas = createCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    
    // Copy current content
    tempCtx.drawImage(ctx.canvas, 0, 0);
    
    // Clear and draw glow
    ctx.clearRect(0, 0, width, height);
    
    // Draw glow layers (larger to smaller)
    ctx.globalAlpha = glowColor.a || 0.3;
    ctx.filter = 'blur(3px)';
    
    // Tint the glow
    ctx.fillStyle = `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 1)`;
    
    // Draw expanded versions for glow
    for (let offset = 3; offset >= 1; offset--) {
        ctx.globalAlpha = (glowColor.a || 0.3) * (1 - offset * 0.25);
        ctx.drawImage(tempCanvas, -offset, -offset, width + offset * 2, height + offset * 2);
    }
    
    // Reset and draw original on top
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
    ctx.drawImage(tempCanvas, 0, 0);
}

/**
 * Create a hero variant from an image
 */
async function createHeroVariant(baseImage, classId, config) {
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(baseImage, 0, 0);
    
    // Apply body tint if specified
    if (config.bodyTint) {
        applyTint(ctx, baseImage.width, baseImage.height, config.bodyTint);
    }
    
    // Apply armor color overlay
    if (config.armorColor) {
        applyArmorOverlay(ctx, baseImage.width, baseImage.height, config.armorColor, 0.35);
    }
    
    // Add glow effect
    if (config.glowColor) {
        addGlow(ctx, baseImage.width, baseImage.height, config.glowColor);
    }
    
    return canvas;
}

/**
 * Create humanoid progression variant
 */
async function createHumanoidVariant(baseImage, tierConfig, index) {
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(baseImage, 0, 0);
    
    // Apply tier-based tint
    applyTint(ctx, baseImage.width, baseImage.height, tierConfig.tint);
    
    return canvas;
}

/**
 * Save canvas to PNG
 */
function saveCanvas(canvas, filename) {
    const buffer = canvas.toBuffer('image/png');
    
    // Save to both directories
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), buffer);
    fs.writeFileSync(path.join(GODOT_OUTPUT_DIR, filename), buffer);
    
    return filename;
}

/**
 * Main execution
 */
async function main() {
    console.log('🎨 Creating Hero Variants from LPC Full Sheets');
    console.log('=' .repeat(50) + '\n');
    
    // Ensure output directories exist
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    if (!fs.existsSync(GODOT_OUTPUT_DIR)) fs.mkdirSync(GODOT_OUTPUT_DIR, { recursive: true });

    // Look for the full base sheets
    const baseFiles = ['base_body_male.png', 'base_body_female.png'];
    
    for (const baseFile of baseFiles) {
        const basePath = path.join(__dirname, '..', 'assets', 'raw_sprites', baseFile);
        if (!fs.existsSync(basePath)) continue;

        const baseImage = await loadImage(basePath);
        console.log(`📦 Processing Full Sheet: ${baseFile}`);

        // Create hero class variants for the full sheet
        for (const [classId, config] of Object.entries(HERO_CLASSES)) {
            // For now, let's map all classes to male base for simplicity, 
            // but we could support gender in HERO_CLASSES later
            const canvas = await createHeroVariant(baseImage, classId, config);
            const filename = `${classId}_sheet.png`;
            saveCanvas(canvas, filename);
            console.log(`   ✓ ${config.name} Sheet → ${filename}`);
        }
    }

    // Keep the single-frame humanoids for progression (legacy support)
    const staticBase = path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites', 'humanoid_base.png');
    if (fs.existsSync(staticBase)) {
        const baseImage = await loadImage(staticBase);
        console.log('\n👤 Creating humanoid progression sprites...\n');
        for (let i = 0; i < 20; i++) {
            const tierIndex = Math.floor(i / 5);
            const tierConfig = HUMANOID_TIERS[Math.min(tierIndex, HUMANOID_TIERS.length - 1)];
            const canvas = await createHumanoidVariant(baseImage, tierConfig, i);
            const filename = `humanoid_${i}.png`;
            saveCanvas(canvas, filename);
            if (i % 5 === 0) console.log(`   ✓ Tier ${tierIndex} (${tierConfig.name}): humanoid_${i}.png`);
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Full spritesheets created!');
    console.log(`\n📁 Output: ${GODOT_OUTPUT_DIR}`);
    console.log('\n🎮 Assets are ready for Godot!');
}

main().catch(console.error);


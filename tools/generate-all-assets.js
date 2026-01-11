#!/usr/bin/env node
/**
 * Comprehensive Asset Generator (OPTIMIZED)
 * Generates ALL visual assets with proper pixel-art quality and consistency
 * - Characters & Bloodlines
 * - Enemies (with proper pixel-art styling)
 * - Spell/Ability Icons (visually distinct per ability)
 * - Item Icons (detailed equipment sprites)
 * - Projectiles (animated-style projectiles)
 * - VFX (proper effect sprites)
 * 
 * OPTIMIZATIONS:
 * - Uses Canvas 2D API directly (faster than pixel-by-pixel)
 * - Batched file operations
 * - Cached color calculations
 * - Better progress reporting with file names
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { setupCanvasContext, drawIconPlate, resolveResPathToDisk, isMeaningfulTexture } from './utils/canvas-utils.js';
import { lightenHex, darkenHex, ensureVisibleFill } from './utils/color-utils.js';
import { EnemySpriteGenerator } from './generators/enemy-sprite-generator.js';
import { ItemIconGenerator } from './generators/item-icon-generator.js';
import { EquipmentSpriteGenerator } from './generators/equipment-sprite-generator.js';
import { ProjectileGenerator } from './generators/projectile-generator.js';
import { VFXGenerator } from './generators/vfx-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    OUTPUT_DIR: path.join(__dirname, '..', 'road-to-war', 'assets'),
    SEED: Date.now(),
    // Standardized sizes (all multiples of 16 for clean scaling)
    ICON_SIZE: 48,        // Spell/ability icons
    ITEM_ICON_SIZE: 48,   // Equipment icons
    ENEMY_SIZE: 128,      // Enemy sprites (upgraded to 128x128 for better detail)
    PROJECTILE_SIZE: 32,  // Projectiles
    VFX_SIZE: 64          // VFX sprites
};

// Cache color schemes to avoid recalculation
const COLOR_CACHE = {
    spellTypes: {
        'attack': { primary: '#FF4444', secondary: '#FF8888', accent: '#FFFFFF' },
        'heal': { primary: '#44FF44', secondary: '#88FF88', accent: '#FFFFFF' },
        'buff': { primary: '#4444FF', secondary: '#8888FF', accent: '#FFFFFF' },
        'debuff': { primary: '#FF44FF', secondary: '#FF88FF', accent: '#FFFFFF' },
        'aoe': { primary: '#FFAA44', secondary: '#FFCC88', accent: '#FFFFFF' },
        'dot': { primary: '#AA44FF', secondary: '#CC88FF', accent: '#FFFFFF' }
    },
    rarity: {
        'common': { base: '#C0C0C0', accent: '#FFFFFF' },
        'uncommon': { base: '#1EFF00', accent: '#FFFFFF' },
        'rare': { base: '#0070DD', accent: '#88CCFF' },
        'epic': { base: '#A335EE', accent: '#FF88FF' },
        'legendary': { base: '#FF8000', accent: '#FFFF00' }
    }
};

// All utility functions have been moved to shared modules:
// - tools/utils/canvas-utils.js: setupCanvasContext, drawIconPlate, resolveResPathToDisk, isMeaningfulTexture
// - tools/utils/color-utils.js: clamp, normalizeHex, hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, getLuma, ensureVisibleFill

function pickSpellMotif(abilityId, abilityData) {
    const id = String(abilityId || '').toLowerCase();
    const name = String(abilityData?.name || '').toLowerCase();
    const hay = `${id} ${name}`;

    // Priority motifs
    if (/(shield|barrier|block|ward|aegis)/.test(hay)) return 'shield';
    if (/(heal|renew|rejuvenation|regrowth|hymn|prayer|lay_on_hands|light)\b/.test(hay) || abilityData?.type === 'heal' || abilityData?.type === 'aoe_heal') return 'heal';
    if (/(moonkin_form|eclipse|starfall|starfire|moonfire)/.test(hay)) return 'moon';
    if (/(lightning|thunder|storm|chain_lightning)/.test(hay)) return 'lightning';
    if (/(fire|flame|pyro|combust|immolate|lava|inferno)/.test(hay)) return 'fire';
    if (/(frost|ice|cold|freeze|blizzard|icy|snow)/.test(hay)) return 'frost';
    if (/(shadow|curse|agony|corruption|drain|haunt|vamp|affliction)/.test(hay)) return 'shadow';
    if (/(backstab|stab|dagger|mutilate|eviscerate|envenom|sinister|shred|rip|rend|bleed)/.test(hay)) return 'dagger';
    if (/(shot|arrow|aimed|steady|explosive_shot|chimera|wyvern)/.test(hay)) return 'arrow';
    if (/(tree_of_life)/.test(hay)) return 'tree';
    if (/(bear_form|cat_form|metamorphosis)/.test(hay)) return 'form';
    if (/(totem|shamanistic)/.test(hay)) return 'totem';
    if (/(charge|kick|taunt|slam|strike|smite|judgment|crusader)/.test(hay)) return 'sword';

    // fallback by type
    const t = abilityData?.type;
    if (t === 'buff') return 'shield';
    if (t === 'debuff' || t === 'dot') return 'shadow';
    if (t === 'aoe') return 'burst';
    return 'spark';
}

function drawGlyph(ctx, size, motif, colors) {
    const cx = size / 2;
    const cy = size / 2;

    // High-contrast glyph color
    const glyph = '#ffffff';
    const glyphShadow = '#000000';

    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';

    const stroke = (drawFn) => {
        // shadow/outline stroke
        ctx.save();
        ctx.strokeStyle = glyphShadow;
        ctx.lineWidth = 5;
        drawFn();
        ctx.stroke();
        ctx.restore();

        // fill
        ctx.save();
        ctx.fillStyle = glyph;
        drawFn();
        ctx.fill();
        ctx.restore();
    };

    const strokeOnly = (drawFn) => {
        ctx.save();
        ctx.strokeStyle = glyphShadow;
        ctx.lineWidth = 6;
        drawFn();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = glyph;
        ctx.lineWidth = 3;
        drawFn();
        ctx.stroke();
        ctx.restore();
    };

    switch (motif) {
        case 'shield': {
            const w = size * 0.42;
            const h = size * 0.52;
            stroke(() => {
                ctx.beginPath();
                ctx.moveTo(cx, cy - h / 2);
                ctx.lineTo(cx + w / 2, cy - h * 0.1);
                ctx.lineTo(cx + w * 0.35, cy + h * 0.35);
                ctx.lineTo(cx, cy + h / 2);
                ctx.lineTo(cx - w * 0.35, cy + h * 0.35);
                ctx.lineTo(cx - w / 2, cy - h * 0.1);
                ctx.closePath();
            });
            // inner cross line
            ctx.strokeStyle = colors?.accent || '#ffffcc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy - h / 3);
            ctx.lineTo(cx, cy + h / 3);
            ctx.stroke();
            break;
        }
        case 'heal': {
            const s = size * 0.18;
            stroke(() => {
                ctx.beginPath();
                ctx.rect(cx - s, cy - s * 3, s * 2, s * 6);
                ctx.rect(cx - s * 3, cy - s, s * 6, s * 2);
            });
            break;
        }
        case 'lightning': {
            stroke(() => {
                ctx.beginPath();
                ctx.moveTo(cx + size * 0.08, cy - size * 0.28);
                ctx.lineTo(cx - size * 0.06, cy - size * 0.02);
                ctx.lineTo(cx + size * 0.04, cy - size * 0.02);
                ctx.lineTo(cx - size * 0.10, cy + size * 0.28);
                ctx.lineTo(cx + size * 0.12, cy + size * 0.02);
                ctx.lineTo(cx + size * 0.00, cy + size * 0.02);
                ctx.closePath();
            });
            break;
        }
        case 'fire': {
            stroke(() => {
                ctx.beginPath();
                ctx.moveTo(cx, cy + size * 0.30);
                ctx.bezierCurveTo(cx - size * 0.18, cy + size * 0.10, cx - size * 0.20, cy - size * 0.10, cx, cy - size * 0.30);
                ctx.bezierCurveTo(cx + size * 0.18, cy - size * 0.12, cx + size * 0.22, cy + size * 0.10, cx, cy + size * 0.30);
                ctx.closePath();
            });
            // ember
            ctx.fillStyle = colors?.accent || '#ffcc88';
            ctx.beginPath();
            ctx.arc(cx + size * 0.10, cy - size * 0.05, size * 0.04, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'frost': {
            strokeOnly(() => {
                ctx.beginPath();
                const r = size * 0.22;
                for (let i = 0; i < 6; i++) {
                    const a = (i * Math.PI) / 3;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                }
            });
            break;
        }
        case 'shadow': {
            stroke(() => {
                ctx.beginPath();
                ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
            });
            // eyes
            ctx.fillStyle = colors?.accent || '#ff88ff';
            ctx.beginPath();
            ctx.arc(cx - size * 0.08, cy - size * 0.04, size * 0.03, 0, Math.PI * 2);
            ctx.arc(cx + size * 0.08, cy - size * 0.04, size * 0.03, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        case 'dagger': {
            stroke(() => {
                ctx.beginPath();
                // blade
                ctx.moveTo(cx + size * 0.18, cy - size * 0.22);
                ctx.lineTo(cx - size * 0.02, cy - size * 0.02);
                ctx.lineTo(cx + size * 0.02, cy + size * 0.02);
                ctx.lineTo(cx + size * 0.22, cy - size * 0.18);
                ctx.closePath();
                // handle
                ctx.rect(cx - size * 0.12, cy + size * 0.10, size * 0.18, size * 0.08);
            });
            break;
        }
        case 'arrow': {
            strokeOnly(() => {
                ctx.beginPath();
                ctx.moveTo(cx - size * 0.20, cy + size * 0.16);
                ctx.lineTo(cx + size * 0.18, cy - size * 0.18);
                // arrow head
                ctx.moveTo(cx + size * 0.18, cy - size * 0.18);
                ctx.lineTo(cx + size * 0.08, cy - size * 0.18);
                ctx.moveTo(cx + size * 0.18, cy - size * 0.18);
                ctx.lineTo(cx + size * 0.18, cy - size * 0.08);
            });
            break;
        }
        case 'sword': {
            stroke(() => {
                ctx.beginPath();
                // blade
                ctx.moveTo(cx, cy - size * 0.26);
                ctx.lineTo(cx + size * 0.06, cy - size * 0.06);
                ctx.lineTo(cx - size * 0.06, cy - size * 0.06);
                ctx.closePath();
                ctx.rect(cx - size * 0.04, cy - size * 0.06, size * 0.08, size * 0.30);
                // guard + pommel
                ctx.rect(cx - size * 0.14, cy + size * 0.18, size * 0.28, size * 0.04);
                ctx.rect(cx - size * 0.04, cy + size * 0.22, size * 0.08, size * 0.10);
            });
            break;
        }
        case 'totem': {
            stroke(() => {
                ctx.beginPath();
                ctx.rect(cx - size * 0.08, cy - size * 0.22, size * 0.16, size * 0.44);
                ctx.rect(cx - size * 0.14, cy + size * 0.10, size * 0.28, size * 0.08);
            });
            break;
        }
        case 'form': {
            // Generic shapeshift motif: paw print
            const r = size * 0.07;
            const baseY = cy + size * 0.10;
            stroke(() => {
                ctx.beginPath();
                // pad
                ctx.arc(cx, baseY, size * 0.12, 0, Math.PI * 2);
                // toes
                ctx.arc(cx - size * 0.12, baseY - size * 0.14, r, 0, Math.PI * 2);
                ctx.arc(cx - size * 0.04, baseY - size * 0.18, r, 0, Math.PI * 2);
                ctx.arc(cx + size * 0.04, baseY - size * 0.18, r, 0, Math.PI * 2);
                ctx.arc(cx + size * 0.12, baseY - size * 0.14, r, 0, Math.PI * 2);
            });
            break;
        }
        case 'tree': {
            // Tree of Life motif: trunk + canopy
            stroke(() => {
                ctx.beginPath();
                // canopy
                ctx.arc(cx, cy - size * 0.08, size * 0.16, 0, Math.PI * 2);
                ctx.arc(cx - size * 0.14, cy - size * 0.02, size * 0.12, 0, Math.PI * 2);
                ctx.arc(cx + size * 0.14, cy - size * 0.02, size * 0.12, 0, Math.PI * 2);
                // trunk
                ctx.rect(cx - size * 0.05, cy + size * 0.08, size * 0.10, size * 0.18);
            });
            break;
        }
        case 'moon': {
            // Moon motif: crescent (draw + carve)
            const r = size * 0.18;
            const bgCut = darkenHex(colors?.primary || '#444444', 0.55);

            // outer moon
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.restore();

            // carve out to make crescent
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx + r * 0.55, cy - r * 0.10, r, 0, Math.PI * 2);
            ctx.fillStyle = bgCut;
            ctx.fill();
            ctx.restore();

            // small star
            ctx.fillStyle = colors?.accent || '#ffffcc';
            ctx.fillRect(cx - r * 0.95, cy - r * 0.75, 2, 2);
            break;
        }
        case 'burst': {
            strokeOnly(() => {
                ctx.beginPath();
                const r = size * 0.26;
                for (let i = 0; i < 10; i++) {
                    const a = (i * Math.PI * 2) / 10;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                }
            });
            break;
        }
        case 'spark':
        default: {
            stroke(() => {
                ctx.beginPath();
                ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
            });
            break;
        }
    }
}

// isMeaningfulTexture moved to tools/utils/canvas-utils.js

/**
 * Generate a high-quality spell icon (OPTIMIZED - Canvas 2D API)
 */
function generateSpellIcon(size, abilityData, abilityId) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    setupCanvasContext(ctx, size);
    
    const type = abilityData.type || 'attack';
    const colors = COLOR_CACHE.spellTypes[type] || COLOR_CACHE.spellTypes.attack;
    
    // Background plate makes icons readable even for dark colors.
    drawIconPlate(ctx, size, colors.primary);

    // Foreground glyph is keyword-driven so “bear_form” actually looks like a form,
    // “chain_lightning” looks like lightning, etc.
    const motif = pickSpellMotif(abilityId, abilityData);
    drawGlyph(ctx, size, motif, colors);
    
    return canvas;
}

/**
 * Generate enemy sprite (OPTIMIZED - Canvas 2D API)
 * @deprecated Use EnemySpriteGenerator class instead - kept for backward compatibility
 */
function generateEnemySprite(size, enemyData, enemyId) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const { centerX, centerY } = setupCanvasContext(ctx, size);
    
        const appearance = enemyData.appearance || {};
        const colorHex = ensureVisibleFill(appearance.color || '#888888');
        const sizeType = appearance.size || 'medium';
        const bodyType = appearance.bodyType || 'creature';
    
    let spriteScale = 1.0;
    if (sizeType === 'small') spriteScale = 0.6;
    else if (sizeType === 'large') spriteScale = 1.3;
    
    const baseRadius = size * 0.25 * spriteScale;
    
    // Soft shadow so dark bodies still show up.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + baseRadius * 0.75, baseRadius * 0.9, baseRadius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main body (simple but readable silhouettes)
    if (bodyType === 'blob' || enemyId === 'slime') {
        // Slime: squishy blob with wavy bottom
        const r = baseRadius * 1.05;
        ctx.fillStyle = colorHex;
        ctx.beginPath();
        ctx.moveTo(centerX - r, centerY);
        ctx.quadraticCurveTo(centerX - r, centerY - r, centerX, centerY - r);
        ctx.quadraticCurveTo(centerX + r, centerY - r, centerX + r, centerY);
        // wavy bottom
        ctx.quadraticCurveTo(centerX + r * 0.6, centerY + r * 0.9, centerX, centerY + r * 0.75);
        ctx.quadraticCurveTo(centerX - r * 0.6, centerY + r * 0.9, centerX - r, centerY);
        ctx.closePath();
        ctx.fill();

        // outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // highlight
        ctx.fillStyle = lightenHex(colorHex, 0.45);
        ctx.beginPath();
        ctx.ellipse(centerX - r * 0.25, centerY - r * 0.25, r * 0.35, r * 0.25, -0.4, 0, Math.PI * 2);
        ctx.fill();
    } else if (bodyType === 'dragon' || enemyId === 'dragon') {
        // Dragon: wings + head + body
        const r = baseRadius * 1.1;
        ctx.fillStyle = colorHex;

        // wings
        ctx.beginPath();
        ctx.moveTo(centerX - r * 1.2, centerY - r * 0.2);
        ctx.lineTo(centerX - r * 0.2, centerY - r * 0.6);
        ctx.lineTo(centerX - r * 0.4, centerY + r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(centerX + r * 1.2, centerY - r * 0.2);
        ctx.lineTo(centerX + r * 0.2, centerY - r * 0.6);
        ctx.lineTo(centerX + r * 0.4, centerY + r * 0.2);
        ctx.closePath();
        ctx.fill();

        // body
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + r * 0.15, r * 0.7, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // head
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - r * 0.45, r * 0.35, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // belly highlight
        ctx.fillStyle = lightenHex(colorHex, 0.55);
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + r * 0.2, r * 0.35, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (bodyType === 'humanoid') {
        // Humanoid: head + torso + arms; add distinguishing bits by id
        const r = baseRadius;
        const headR = r * 0.35;
        const torsoW = r * 0.85;
        const torsoH = r * 0.95;
        const armW = r * 0.22;
        const armH = r * 0.65;

        // torso
        ctx.fillStyle = colorHex;
        ctx.fillRect(centerX - torsoW / 2, centerY - torsoH / 4, torsoW, torsoH);
        // head
        ctx.beginPath();
        ctx.arc(centerX, centerY - torsoH / 2, headR, 0, Math.PI * 2);
        ctx.fill();
        // arms
        ctx.fillRect(centerX - torsoW / 2 - armW, centerY - torsoH / 8, armW, armH);
        ctx.fillRect(centerX + torsoW / 2, centerY - torsoH / 8, armW, armH);

        // accents
        if (enemyId.includes('goblin')) {
            // ears
            ctx.fillStyle = darkenHex(colorHex, 0.15);
            ctx.beginPath();
            ctx.moveTo(centerX - headR, centerY - torsoH / 2);
            ctx.lineTo(centerX - headR * 2.0, centerY - torsoH / 2 - headR * 0.2);
            ctx.lineTo(centerX - headR, centerY - torsoH / 2 + headR * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(centerX + headR, centerY - torsoH / 2);
            ctx.lineTo(centerX + headR * 2.0, centerY - torsoH / 2 - headR * 0.2);
            ctx.lineTo(centerX + headR, centerY - torsoH / 2 + headR * 0.2);
            ctx.closePath();
            ctx.fill();
        }
        if (enemyId.includes('orc') || enemyId.includes('war_lord') || enemyId.includes('champion')) {
            // tusks / jaw
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(centerX - headR * 0.45, centerY - torsoH / 2 + headR * 0.25, headR * 0.18, headR * 0.25);
            ctx.fillRect(centerX + headR * 0.27, centerY - torsoH / 2 + headR * 0.25, headR * 0.18, headR * 0.25);
        }
        if (enemyId.includes('dark_knight')) {
            // helmet + sword
            ctx.fillStyle = darkenHex(colorHex, 0.35);
            ctx.fillRect(centerX - headR, centerY - torsoH / 2 - headR * 0.2, headR * 2, headR * 1.2);
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(centerX + torsoW / 2 + armW * 0.2, centerY - torsoH / 8, armW * 0.35, r * 1.1);
        }

        // outline silhouette
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - torsoW / 2, centerY - torsoH / 4, torsoW, torsoH);
        ctx.beginPath();
        ctx.arc(centerX, centerY - torsoH / 2, headR, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        // fallback: creature blob/circle
        ctx.fillStyle = colorHex;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Add eyes for creatures
    if (bodyType !== 'inanimate') {
        const eyeSize = Math.max(2, baseRadius * 0.15);
        const eyeOffsetX = baseRadius * 0.4;
        const eyeOffsetY = -baseRadius * 0.2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX - eyeOffsetX, centerY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX - eyeOffsetX, centerY + eyeOffsetY, eyeSize * 0.6, 0, Math.PI * 2);
        ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, eyeSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return canvas;
}

/**
 * Generate item icon (OPTIMIZED - Canvas 2D API)
 * @deprecated Use ItemIconGenerator class instead - kept for backward compatibility
 */
function generateItemIcon(size, itemData, _itemId) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const { centerX, centerY } = setupCanvasContext(ctx, size);
    
    const itemType = itemData.type || 'weapon';
    const rarity = itemData.rarity || 'common';
    const weaponType = itemData.weapon_type || '';
    
    const colors = COLOR_CACHE.rarity[rarity] || COLOR_CACHE.rarity.common;
    
    // Background plate + rarity rim (keeps silhouette readable)
    drawIconPlate(ctx, size, colors.base);
    
    if (itemType === 'weapon') {
        const weaponLength = size * 0.7;
        
        if (weaponType === 'sword' || !weaponType) {
            // sword silhouette
            ctx.fillStyle = '#e2e2e2';
            ctx.fillRect(centerX - 2, centerY - weaponLength/2, 4, weaponLength * 0.7);
            // tip
            ctx.beginPath();
            ctx.moveTo(centerX - 2, centerY - weaponLength / 2);
            ctx.lineTo(centerX + 2, centerY - weaponLength / 2);
            ctx.lineTo(centerX, centerY - weaponLength / 2 - 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(centerX - 3, centerY + weaponLength * 0.15, 6, weaponLength * 0.25);
            ctx.fillStyle = colors.accent;
            ctx.fillRect(centerX - 10, centerY + weaponLength * 0.12, 20, 3);
            // pommel gem for higher rarities
            if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary') {
                ctx.fillStyle = colors.base;
                ctx.beginPath();
                ctx.arc(centerX, centerY + weaponLength * 0.40, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            // outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - 2, centerY - weaponLength/2, 4, weaponLength * 0.7);
        } else if (weaponType === 'staff' || weaponType === 'wand') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(centerX - 1, centerY - weaponLength/2, 2, weaponLength);
            ctx.fillStyle = colors.base;
            ctx.beginPath();
            ctx.arc(centerX, centerY - weaponLength/2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(centerX, centerY - weaponLength/2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (itemType === 'armor') {
        const armorWidth = size * 0.6;
        const armorHeight = size * 0.7;
        ctx.fillStyle = '#cfcfcf';
        ctx.fillRect(centerX - armorWidth/2, centerY - armorHeight/2, armorWidth, armorHeight);
        ctx.fillStyle = colors.accent;
        ctx.fillRect(centerX - armorWidth/2, centerY - armorHeight/2, armorWidth, 4);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - armorWidth/2, centerY - armorHeight/2, armorWidth, armorHeight);
    } else {
        // accessories
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(centerX + size * 0.12, centerY - size * 0.10, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return canvas;
}

/**
 * Generate projectile sprite (OPTIMIZED - Canvas 2D API)
 * @deprecated Use ProjectileGenerator class instead - kept for backward compatibility
 */
function generateProjectileSprite(_size, proj) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const { centerX, centerY } = setupCanvasContext(ctx, size);
    
    const radius = size * 0.3;
    const color = '#' + proj.color.toString(16).padStart(6, '0');
    
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    if (proj.style === 'orb') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    } else if (proj.style === 'bolt' || proj.style === 'missile') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    } else if (proj.style === 'shard') {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX + radius, centerY);
        ctx.lineTo(centerX, centerY + radius);
        ctx.lineTo(centerX - radius, centerY);
        ctx.closePath();
        ctx.fill();
    } else if (proj.style === 'lightning') {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(centerX - 2, centerY);
        ctx.lineTo(centerX + 2, centerY + radius);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (proj.style === 'cloud') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.arc(centerX - radius * 0.5, centerY, radius * 0.6, 0, Math.PI * 2);
        ctx.arc(centerX + radius * 0.5, centerY, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return canvas;
}

/**
 * Generate VFX sprite (OPTIMIZED - Canvas 2D API)
 * @deprecated Use VFXGenerator class instead - kept for backward compatibility
 */
function generateVFXSprite(_size, vfx) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const { centerX, centerY } = setupCanvasContext(ctx, size);
    
    const radius = size * 0.4;
    const color = '#' + vfx.color.toString(16).padStart(6, '0');
    
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    if (vfx.style === 'burst') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(angle) * radius * 1.2, centerY + Math.sin(angle) * radius * 1.2);
            ctx.stroke();
        }
    } else if (vfx.style === 'star') {
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    } else if (vfx.style === 'ring') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
    } else if (vfx.style === 'cloud') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.arc(centerX - radius * 0.5, centerY, radius * 0.7, 0, Math.PI * 2);
        ctx.arc(centerX + radius * 0.5, centerY, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    } else if (vfx.style === 'sparks') {
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2) / 12;
            const x = centerX + Math.cos(angle) * radius * 0.7;
            const y = centerY + Math.sin(angle) * radius * 0.7;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    return canvas;
}

/**
 * Batch write files for better performance
 */
function writeAssetFiles(outputDir, assets) {
    for (const asset of assets) {
        // Write PNG
        const buffer = asset.canvas.toBuffer('image/png');
        fs.writeFileSync(asset.pngPath, buffer);
        
        // Write metadata JSON
        fs.writeFileSync(asset.jsonPath, JSON.stringify(asset.metadata, null, 2));
    }
}

/**
 * Generate spell/ability icons (OPTIMIZED)
 */
async function generateSpellIcons() {
    const abilitiesPath = path.join(__dirname, '..', 'road-to-war', 'data', 'abilities.json');
    if (!fs.existsSync(abilitiesPath)) {
        console.warn('abilities.json not found');
        return;
    }
    
    const abilities = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));
    const outputDir = path.join(CONFIG.OUTPUT_DIR, 'icons', 'spells');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    let total = 0;
    for (const classAbilities of Object.values(abilities)) {
        total += Object.keys(classAbilities).length;
    }
    
    console.log(`   Generating ${total} spell icons...`);
    
    const assets = [];
    let progress = 0;
    
    for (const [, classAbilities] of Object.entries(abilities)) {
        for (const [abilityId, abilityData] of Object.entries(classAbilities)) {
            try {
                const canvas = generateSpellIcon(CONFIG.ICON_SIZE, abilityData, abilityId);
                
                const type = abilityData.type || 'attack';
                const typeColors = COLOR_CACHE.spellTypes[type] || COLOR_CACHE.spellTypes.attack;
                
                assets.push({
                    canvas,
                    pngPath: path.join(outputDir, `${abilityId}.png`),
                    jsonPath: path.join(outputDir, `${abilityId}.json`),
                    metadata: {
                        asset_type: 'spell_icon',
                        profile: 'spell_icon',
                        base_size: [CONFIG.ICON_SIZE, CONFIG.ICON_SIZE],
                        glow_color: typeColors.primary,
                        cooldown_style: 'radial',
                        outline: true
                    }
                });
                
                progress++;
                if (progress % 20 === 0 || progress === total) {
                    process.stdout.write(`   ${progress}/${total} (${Math.round(progress/total*100)}%) - Creating: ${abilityId.substring(0, 20)}...\r`);
                }
            } catch (error) {
                console.error(`\n   Error generating icon for ${abilityId}:`, error.message);
            }
        }
    }
    
    console.log(`\n   Writing ${assets.length} files...`);
    writeAssetFiles(outputDir, assets);
    console.log(`   ✓ Generated ${assets.length} spell icons`);
}

/**
 * Generate enemy sprites (OPTIMIZED)
 */
async function generateEnemySprites() {
    const enemiesPath = path.join(__dirname, '..', 'road-to-war', 'data', 'enemies.json');
    if (!fs.existsSync(enemiesPath)) {
        console.warn('enemies.json not found');
        return;
    }
    
    const enemies = JSON.parse(fs.readFileSync(enemiesPath, 'utf8'));
    const outputDir = path.join(CONFIG.OUTPUT_DIR, 'sprites', 'enemies');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const assets = [];
    const total = Object.keys(enemies).length;
    let progress = 0;
    
    console.log(`   Generating ${total} enemy sprites...`);
    
    const enemyGenerator = new EnemySpriteGenerator({ size: CONFIG.ENEMY_SIZE });
    
    for (const [enemyId, enemyData] of Object.entries(enemies)) {
        const canvas = enemyGenerator.generate(enemyData, enemyId);
        const appearance = enemyData.appearance || {};
        const color = appearance.color || '#888888';
        
        assets.push({
            canvas,
            pngPath: path.join(outputDir, `${enemyId}.png`),
            jsonPath: path.join(outputDir, `${enemyId}.json`),
            metadata: {
                asset_type: 'enemy_creature',
                profile: 'character_humanoid',
                base_size: [CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE],
                glow_color: color,
                outline: true
            }
        });
        
        progress++;
        if (progress % 5 === 0 || progress === total) {
            process.stdout.write(`   ${progress}/${total} (${Math.round(progress/total*100)}%) - Creating: ${enemyId}...\r`);
        }
    }
    
    console.log(`\n   Writing ${assets.length} files...`);
    writeAssetFiles(outputDir, assets);
    console.log(`   ✓ Generated ${assets.length} enemy sprites`);
}

/**
 * Generate item icons (OPTIMIZED)
 */
async function generateItemIcons() {
    const itemsPath = path.join(__dirname, '..', 'road-to-war', 'data', 'items.json');
    if (!fs.existsSync(itemsPath)) {
        console.warn('items.json not found');
        return;
    }
    
    const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
    const outputDir = path.join(CONFIG.OUTPUT_DIR, 'sprites', 'equipment');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const assets = [];
    let total = 0;
    const categories = ['weapons', 'armor', 'accessories'];
    
    for (const category of categories) {
        if (items[category]) {
            total += Object.keys(items[category]).length;
        }
    }
    
    console.log(`   Generating up to ${total} item icons (skipping existing)...`);
    let progress = 0;
    let skipped = 0;
    
    for (const category of categories) {
        if (!items[category]) continue;
        
        for (const [itemId, itemData] of Object.entries(items[category])) {
            const existingPath = path.join(outputDir, itemId + '.png');
            const srcTex = resolveResPathToDisk(itemData.texture);
            const canUseTexture = srcTex && fs.existsSync(srcTex) && (await isMeaningfulTexture(srcTex));

            // For equipment sprites, always regenerate to ensure correct 128x128 size
            const isEquipment = itemData.type === 'weapon' || itemData.type === 'armor' ||
                              (itemData.type === 'accessory' && itemData.slot !== 'inventory');

            // keep the old "skip if looks like a real image" logic only for non-equipment items
            if (!isEquipment && !canUseTexture && fs.existsSync(existingPath)) {
                const stats = fs.statSync(existingPath);
                if (stats.size > 500) {
                    skipped++;
                    continue;
                }
            }

            // Use EquipmentSpriteGenerator for full equipment sprites (128x128)
            // Use ItemIconGenerator only for inventory icons
            // (isEquipment already declared above)
            const generatorSize = isEquipment ? 128 : CONFIG.ITEM_ICON_SIZE;
            const GeneratorClass = isEquipment ? EquipmentSpriteGenerator : ItemIconGenerator;

            const generator = new GeneratorClass({ size: generatorSize });
            const canvas = isEquipment ?
                generator.generate(itemData, itemId) :
                await generator.generate(itemData, itemId, {
                    texturePath: srcTex,
                    canUseTexture: canUseTexture
                });

            const rarity = itemData.rarity || 'common';
            const colors = COLOR_CACHE.rarity[rarity] || COLOR_CACHE.rarity.common;
            const assetType = isEquipment ? 'equipment_sprite' : 'item_icon';
            const profile = isEquipment ? 'equipment_overlay' : 'item_icon';
            const baseSize = isEquipment ? [128, 128] : [CONFIG.ITEM_ICON_SIZE, CONFIG.ITEM_ICON_SIZE];

            assets.push({
                canvas,
                pngPath: existingPath,
                jsonPath: path.join(outputDir, itemId + '.json'),
                metadata: {
                    asset_type: assetType,
                    profile: profile,
                    base_size: baseSize,
                    glow_color: colors.base,
                    rarity: rarity,
                    outline: true
                }
            });
            
            progress++;
            if (progress % 5 === 0) {
                process.stdout.write(`   ${progress} new icons created, ${skipped} skipped - Latest: ${itemId.substring(0, 20)}...\r`);
            }
        }
    }
    
    if (assets.length > 0) {
        console.log(`\n   Writing ${assets.length} new files...`);
        writeAssetFiles(outputDir, assets);
    }
    console.log(`   ✓ Generated ${assets.length} new item icons (${skipped} skipped)`);
}

/**
 * Generate projectile sprites (OPTIMIZED)
 */
async function generateProjectileSprites() {
    const outputDir = path.join(CONFIG.OUTPUT_DIR, 'sprites', 'projectiles');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const projectileTypes = [
        { id: 'magic_bolt', color: 0x00FFFF, style: 'bolt' },
        { id: 'fire_ball', color: 0xFF4400, style: 'orb' },
        { id: 'ice_shard', color: 0x00AAFF, style: 'shard' },
        { id: 'lightning_bolt', color: 0xFFFF00, style: 'lightning' },
        { id: 'shadow_bolt', color: 0x6600AA, style: 'bolt' },
        { id: 'holy_light', color: 0xFFFFAA, style: 'orb' },
        { id: 'poison_cloud', color: 0xAA00AA, style: 'cloud' },
        { id: 'arcane_missile', color: 0xFF00FF, style: 'missile' }
    ];
    
    console.log(`   Generating ${projectileTypes.length} projectile sprites...`);
    const assets = [];
    const projectileGenerator = new ProjectileGenerator({ size: CONFIG.PROJECTILE_SIZE });
    
    for (const proj of projectileTypes) {
        const canvas = projectileGenerator.generate(proj);
        assets.push({
            canvas,
            pngPath: path.join(outputDir, `${proj.id}.png`),
            jsonPath: path.join(outputDir, `${proj.id}.json`),
            metadata: {
                asset_type: 'projectile_magic',
                profile: 'projectile_magic',
                base_size: [CONFIG.PROJECTILE_SIZE, CONFIG.PROJECTILE_SIZE],
                glow_color: '#' + proj.color.toString(16).padStart(6, '0'),
                pulse_strength: 0.2,
                outline: false
            }
        });
        process.stdout.write(`   Creating: ${proj.id}...\r`);
    }
    
    console.log(`\n   Writing ${assets.length} files...`);
    writeAssetFiles(outputDir, assets);
    console.log(`   ✓ Generated ${assets.length} projectile sprites`);
}

/**
 * Generate VFX sprites (OPTIMIZED)
 */
async function generateVFXSprites() {
    const outputDir = path.join(CONFIG.OUTPUT_DIR, 'sprites', 'vfx');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const vfxTypes = [
        { id: 'hit_impact', color: 0xFFFFFF, style: 'burst' },
        { id: 'heal_burst', color: 0x44FF44, style: 'burst' },
        { id: 'death_poof', color: 0x444444, style: 'cloud' },
        { id: 'level_up', color: 0xFFD700, style: 'star' },
        { id: 'buff_aura', color: 0x4444FF, style: 'ring' },
        { id: 'debuff_cloud', color: 0xAA00AA, style: 'cloud' },
        { id: 'critical_hit', color: 0xFF0000, style: 'burst' },
        { id: 'block_sparks', color: 0xCCCCCC, style: 'sparks' }
    ];
    
    console.log(`   Generating ${vfxTypes.length} VFX sprites...`);
    const assets = [];
    const vfxGenerator = new VFXGenerator({ size: CONFIG.VFX_SIZE });
    
    for (const vfx of vfxTypes) {
        const canvas = vfxGenerator.generate(vfx);
        assets.push({
            canvas,
            pngPath: path.join(outputDir, `${vfx.id}.png`),
            jsonPath: path.join(outputDir, `${vfx.id}.json`),
            metadata: {
                asset_type: 'impact_fx',
                profile: 'projectile_magic',
                base_size: [CONFIG.VFX_SIZE, CONFIG.VFX_SIZE],
                glow_color: '#' + vfx.color.toString(16).padStart(6, '0'),
                pulse_strength: 0.15,
                outline: false
            }
        });
        process.stdout.write(`   Creating: ${vfx.id}...\r`);
    }
    
    console.log(`\n   Writing ${assets.length} files...`);
    writeAssetFiles(outputDir, assets);
    console.log(`   ✓ Generated ${assets.length} VFX sprites`);
}

/**
 * Main function
 */
async function main() {
    const startTime = Date.now();
    console.log('🚀 Generating ALL game assets (OPTIMIZED VERSION)...\n');
    
    try {
        // Generate base character assets
        console.log('📦 Generating characters and bloodlines...');
        const { main: generateBaseAssets } = await import('./generate-assets.js');
        await generateBaseAssets();
        console.log('✓ Characters generated\n');
        
        // Generate all other assets in parallel-ready structure
        await generateEnemySprites();
        console.log('');
        
        await generateSpellIcons();
        console.log('');
        
        await generateItemIcons();
        console.log('');
        
        await generateProjectileSprites();
        console.log('');
        
        await generateVFXSprites();
        console.log('');
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log('✅ All assets generated successfully!');
        console.log(`📁 Assets location: ${CONFIG.OUTPUT_DIR}`);
        console.log(`⏱️  Total time: ${elapsed}s\n`);
        
    } catch (error) {
        console.error('❌ Generation failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Always run main when script is executed
main();

export { main };

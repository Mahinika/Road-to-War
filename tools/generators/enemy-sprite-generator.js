/**
 * Enemy Sprite Generator
 * Generates enemy sprites with pixel-art styling
 * Extracted from generate-all-assets.js
 */

import { createCanvas } from 'canvas';
import { BaseGenerator } from './base-generator.js';
import { setupCanvasContext } from '../utils/canvas-utils.js';
import { lightenHex, darkenHex, ensureVisibleFill } from '../utils/color-utils.js';

export class EnemySpriteGenerator extends BaseGenerator {
    constructor(config = {}) {
        super();
        this.config = {
            size: config.size || 128, // Upgraded from 64 to 128 for better detail
            ...config
        };
    }

    /**
     * Generate an enemy sprite
     * @param {Object} enemyData - Enemy data from enemies.json
     * @param {string} enemyId - Enemy identifier
     * @returns {HTMLCanvasElement} Canvas with enemy sprite
     */
    generate(enemyData, enemyId) {
        const size = this.config.size;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const { centerX, centerY } = setupCanvasContext(ctx, size);

        const appearance = enemyData.appearance || {};
        const colorHex = ensureVisibleFill(appearance.color || '#888888');
        const shape = appearance.shape || 'circle';
        const sizeType = appearance.size || 'medium';
        const bodyType = appearance.bodyType || 'creature';
        
        let spriteScale = 1.0;
        if (sizeType === 'small') spriteScale = 0.6;
        else if (sizeType === 'large') spriteScale = 1.3;
        
        const baseRadius = size * 0.25 * spriteScale;
        
        // Soft shadow so dark bodies still show up
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
        } else if (bodyType === 'elemental') {
            // Elemental: flowing energy forms
            const r = baseRadius;
            const energyR = r * 1.2;

            // Core energy
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, energyR);
            gradient.addColorStop(0, lightenHex(colorHex, 0.4));
            gradient.addColorStop(0.7, colorHex);
            gradient.addColorStop(1, darkenHex(colorHex, 0.3));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, energyR, 0, Math.PI * 2);
            ctx.fill();

            // Energy tendrils
            ctx.strokeStyle = lightenHex(colorHex, 0.2);
            ctx.lineWidth = 3;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6;
                const startX = centerX + Math.cos(angle) * r * 0.8;
                const startY = centerY + Math.sin(angle) * r * 0.8;
                const endX = centerX + Math.cos(angle) * r * 1.4;
                const endY = centerY + Math.sin(angle) * r * 1.4;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (bodyType === 'insectoid') {
            // Insectoid: multi-legged creatures
            const r = baseRadius;
            const bodyW = r * 1.8;
            const bodyH = r * 0.8;

            // Main body
            ctx.fillStyle = colorHex;
            ctx.fillRect(centerX - bodyW / 2, centerY - bodyH / 2, bodyW, bodyH);

            // Legs
            ctx.fillStyle = darkenHex(colorHex, 0.2);
            for (let i = 0; i < 6; i++) {
                const legX = centerX - bodyW / 2 + (i * bodyW / 5);
                const legY = centerY + bodyH / 2;
                ctx.fillRect(legX - 2, legY, 4, r * 0.6);
            }

            // Head
            ctx.fillStyle = colorHex;
            ctx.beginPath();
            ctx.arc(centerX - bodyW / 2, centerY, r * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - bodyW / 2, centerY - bodyH / 2, bodyW, bodyH);
            ctx.stroke();
        } else if (bodyType === 'beast') {
            // Beast: four-legged animal-like creatures
            const r = baseRadius;

            // Body
            ctx.fillStyle = colorHex;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + r * 0.2, r * 1.2, r * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Legs
            for (let i = 0; i < 4; i++) {
                const legX = centerX + (i % 2 === 0 ? -r * 0.6 : r * 0.6);
                const legY = centerY + r * 0.8;
                ctx.fillRect(legX - 3, legY, 6, r * 0.5);
            }

            // Head
            ctx.beginPath();
            ctx.arc(centerX, centerY - r * 0.3, r * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Ears/Tails
            if (enemyId.includes('wendigo')) {
                // Antlers for wendigo
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX - r * 0.2, centerY - r * 0.8, 4, r * 0.4);
                ctx.fillRect(centerX + r * 0.2, centerY - r * 0.8, 4, r * 0.4);
            }

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (bodyType === 'undead') {
            // Undead: decaying, spectral forms
            const r = baseRadius;

            // Main form (slightly transparent)
            ctx.fillStyle = colorHex;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Skeletal features for some undead
            if (enemyId.includes('lich') || enemyId.includes('death_knight')) {
                // Armor outline
                ctx.strokeStyle = '#696969';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (enemyId.includes('ghost') || enemyId.includes('banshee')) {
                // Wispy edges
                ctx.strokeStyle = lightenHex(colorHex, 0.3);
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2) / 8;
                    const startX = centerX + Math.cos(angle) * r * 0.9;
                    const startY = centerY + Math.sin(angle) * r * 0.9;
                    const endX = centerX + Math.cos(angle) * r * 1.1;
                    const endY = centerY + Math.sin(angle) * r * 1.1;

                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            }

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (bodyType === 'mechanical') {
            // Mechanical: robotic/construct forms
            const r = baseRadius;

            // Main structure
            ctx.fillStyle = colorHex;
            ctx.fillRect(centerX - r, centerY - r, r * 2, r * 2);

            // Mechanical details
            ctx.fillStyle = darkenHex(colorHex, 0.3);
            // Joints/circuits
            ctx.fillRect(centerX - r * 0.8, centerY - r * 0.8, r * 0.3, r * 0.3);
            ctx.fillRect(centerX + r * 0.5, centerY - r * 0.8, r * 0.3, r * 0.3);
            ctx.fillRect(centerX - r * 0.8, centerY + r * 0.5, r * 0.3, r * 0.3);
            ctx.fillRect(centerX + r * 0.5, centerY + r * 0.5, r * 0.3, r * 0.3);

            // Central core
            ctx.fillStyle = lightenHex(colorHex, 0.4);
            ctx.beginPath();
            ctx.arc(centerX, centerY, r * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - r, centerY - r, r * 2, r * 2);
            ctx.stroke();
        } else if (bodyType === 'humanoid') {
            // Enhanced humanoid rendering with better proportions and details
            const r = baseRadius;
            const headR = r * 0.4; // Slightly larger head for better proportions
            const torsoW = r * 0.8;
            const torsoH = r * 0.9;
            const armW = r * 0.25;
            const armH = r * 0.6;
            const legW = r * 0.3;
            const legH = r * 0.7;

            // Skin tone variation
            const skinTone = appearance.skinTone || lightenHex(colorHex, 0.3);
            const armorColor = appearance.armorColor || darkenHex(colorHex, 0.2);

            // Legs (behind torso)
            ctx.fillStyle = armorColor;
            ctx.fillRect(centerX - legW / 2, centerY + torsoH / 2, legW, legH);
            ctx.fillRect(centerX + torsoW / 2 - legW, centerY + torsoH / 2, legW, legH);

            // Torso
            ctx.fillStyle = armorColor;
            ctx.fillRect(centerX - torsoW / 2, centerY - torsoH / 4, torsoW, torsoH);

            // Arms
            ctx.fillRect(centerX - torsoW / 2 - armW, centerY - torsoH / 8, armW, armH);
            ctx.fillRect(centerX + torsoW / 2, centerY - torsoH / 8, armW, armH);

            // Head
            ctx.fillStyle = skinTone;
            ctx.beginPath();
            ctx.arc(centerX, centerY - torsoH / 2, headR, 0, Math.PI * 2);
            ctx.fill();

            // Enhanced features based on enemy type
            if (enemyId.includes('goblin')) {
                // Large pointed ears
                ctx.fillStyle = skinTone;
                ctx.beginPath();
                ctx.moveTo(centerX - headR, centerY - torsoH / 2);
                ctx.lineTo(centerX - headR * 2.2, centerY - torsoH / 2 - headR * 0.3);
                ctx.lineTo(centerX - headR, centerY - torsoH / 2 + headR * 0.3);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(centerX + headR, centerY - torsoH / 2);
                ctx.lineTo(centerX + headR * 2.2, centerY - torsoH / 2 - headR * 0.3);
                ctx.lineTo(centerX + headR, centerY - torsoH / 2 + headR * 0.3);
                ctx.closePath();
                ctx.fill();

                // Goblin nose
                ctx.fillStyle = darkenHex(skinTone, 0.2);
                ctx.beginPath();
                ctx.ellipse(centerX, centerY - torsoH / 2 + headR * 0.1, headR * 0.15, headR * 0.1, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            if (enemyId.includes('orc') || enemyId.includes('war_lord') || enemyId.includes('champion')) {
                // Orc tusks and jaw
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(centerX - headR * 0.4, centerY - torsoH / 2 + headR * 0.2, headR * 0.2, headR * 0.3);
                ctx.fillRect(centerX + headR * 0.2, centerY - torsoH / 2 + headR * 0.2, headR * 0.2, headR * 0.3);

                // Orc brow
                ctx.fillStyle = darkenHex(skinTone, 0.3);
                ctx.fillRect(centerX - headR * 0.8, centerY - torsoH / 2 - headR * 0.3, headR * 1.6, headR * 0.2);
            }

            if (enemyId.includes('dark_knight')) {
                // Full helmet
                ctx.fillStyle = darkenHex(armorColor, 0.3);
                ctx.fillRect(centerX - headR * 1.1, centerY - torsoH / 2 - headR * 0.4, headR * 2.2, headR * 1.4);

                // Helmet visor slit
                ctx.fillStyle = '#000000';
                ctx.fillRect(centerX - headR * 0.3, centerY - torsoH / 2 - headR * 0.1, headR * 0.6, headR * 0.15);

                // Sword
                ctx.fillStyle = '#cccccc';
                ctx.fillRect(centerX + torsoW / 2 + armW * 0.2, centerY - torsoH / 8, armW * 0.4, r * 1.2);
                // Sword hilt
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX + torsoW / 2 + armW * 0.2, centerY + r * 0.8, armW * 0.4, r * 0.2);
            }

            if (enemyId.includes('archer') || enemyId.includes('slinger')) {
                // Bow
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX + torsoW / 2, centerY - torsoH / 8, armW * 0.3, r * 1.0);
                // Bow string
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(centerX + torsoW / 2, centerY - torsoH / 8);
                ctx.lineTo(centerX + torsoW / 2 + armW * 0.3, centerY - torsoH / 8 + r * 1.0);
                ctx.stroke();
            }

            if (enemyId.includes('shaman')) {
                // Staff
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(centerX + torsoW / 2, centerY - torsoH / 8, armW * 0.2, r * 1.3);
                // Magical glow effect
                ctx.fillStyle = lightenHex(colorHex, 0.5);
                ctx.beginPath();
                ctx.arc(centerX + torsoW / 2 + armW * 0.1, centerY - torsoH / 8, headR * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Outline all shapes
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            // Legs
            ctx.strokeRect(centerX - legW / 2, centerY + torsoH / 2, legW, legH);
            ctx.strokeRect(centerX + torsoW / 2 - legW, centerY + torsoH / 2, legW, legH);
            // Torso
            ctx.strokeRect(centerX - torsoW / 2, centerY - torsoH / 4, torsoW, torsoH);
            // Arms
            ctx.strokeRect(centerX - torsoW / 2 - armW, centerY - torsoH / 8, armW, armH);
            ctx.strokeRect(centerX + torsoW / 2, centerY - torsoH / 8, armW, armH);
            // Head
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
        if (bodyType !== 'inanimate' && bodyType !== 'blob') {
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
}

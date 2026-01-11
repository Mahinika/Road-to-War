/**
 * Projectile Generator
 * Generates projectile sprites for magic spells
 * Extracted from generate-all-assets.js
 */

import { createCanvas } from 'canvas';
import { BaseGenerator } from './base-generator.js';
import { setupCanvasContext } from '../utils/canvas-utils.js';

export class ProjectileGenerator extends BaseGenerator {
    constructor(config = {}) {
        super();
        this.config = {
            size: config.size || 32,
            ...config
        };
    }

    /**
     * Generate a projectile sprite
     * @param {Object} projData - Projectile data { id, color, style }
     * @returns {HTMLCanvasElement} Canvas with projectile sprite
     */
    generate(projData) {
        const size = this.config.size;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const { centerX, centerY } = setupCanvasContext(ctx, size);
        
        const radius = size * 0.3;
        const color = '#' + projData.color.toString(16).padStart(6, '0');
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        if (projData.style === 'orb') {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (projData.style === 'bolt' || projData.style === 'missile') {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (projData.style === 'shard') {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - radius);
            ctx.lineTo(centerX + radius, centerY);
            ctx.lineTo(centerX, centerY + radius);
            ctx.lineTo(centerX - radius, centerY);
            ctx.closePath();
            ctx.fill();
        } else if (projData.style === 'lightning') {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - radius);
            ctx.lineTo(centerX - 2, centerY);
            ctx.lineTo(centerX + 2, centerY + radius);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (projData.style === 'cloud') {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.arc(centerX - radius * 0.5, centerY, radius * 0.6, 0, Math.PI * 2);
            ctx.arc(centerX + radius * 0.5, centerY, radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return canvas;
    }
}

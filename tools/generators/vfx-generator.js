/**
 * VFX Generator
 * Generates visual effect sprites for combat events
 * Extracted from generate-all-assets.js
 */

import { createCanvas } from 'canvas';
import { BaseGenerator } from './base-generator.js';
import { setupCanvasContext } from '../utils/canvas-utils.js';

export class VFXGenerator extends BaseGenerator {
    constructor(config = {}) {
        super();
        this.config = {
            size: config.size || 64,
            ...config
        };
    }

    /**
     * Generate a VFX sprite
     * @param {Object} vfxData - VFX data { id, color, style }
     * @returns {HTMLCanvasElement} Canvas with VFX sprite
     */
    generate(vfxData) {
        const size = this.config.size;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const { centerX, centerY } = setupCanvasContext(ctx, size);
        
        const radius = size * 0.4;
        const color = '#' + vfxData.color.toString(16).padStart(6, '0');
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        if (vfxData.style === 'burst') {
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
        } else if (vfxData.style === 'star') {
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
        } else if (vfxData.style === 'ring') {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        } else if (vfxData.style === 'cloud') {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.arc(centerX - radius * 0.5, centerY, radius * 0.7, 0, Math.PI * 2);
            ctx.arc(centerX + radius * 0.5, centerY, radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        } else if (vfxData.style === 'sparks') {
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
}

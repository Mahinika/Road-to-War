#!/usr/bin/env node
/**
 * Inspect a generated sprite to see its actual colors
 */

import { loadImage, createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectSprite(spritePath) {
    try {
        const img = await loadImage(spritePath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const centerX = Math.floor(img.width / 2);
        const centerY = Math.floor(img.height / 2);
        
        // Sample colors from different regions
        const regions = {
            'head (top-center)': { x: centerX, y: centerY - 15, size: 3 },
            'torso (center)': { x: centerX, y: centerY, size: 3 },
            'legs (bottom-center)': { x: centerX, y: centerY + 15, size: 3 },
            'left side': { x: centerX - 10, y: centerY, size: 3 },
            'right side': { x: centerX + 10, y: centerY, size: 3 }
        };
        
        console.log(`\nInspecting: ${spritePath}`);
        console.log(`Size: ${img.width}x${img.height}\n`);
        
        for (const [name, region] of Object.entries(regions)) {
            const imageData = ctx.getImageData(region.x - region.size, region.y - region.size, region.size * 2, region.size * 2);
            const pixels = imageData.data;
            const colors = new Map(); // Use Map to count occurrences
            
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                if (a > 128) { // Only count visible pixels
                    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    colors.set(hex, (colors.get(hex) || 0) + 1);
                }
            }
            
            if (colors.size > 0) {
                // Sort by frequency and show most common colors
                const sorted = Array.from(colors.entries()).sort((a, b) => b[1] - a[1]);
                const topColors = sorted.slice(0, 3).map(([color, count]) => `${color} (${count})`).join(', ');
                console.log(`${name}: ${topColors}`);
            } else {
                console.log(`${name}: (transparent)`);
            }
        }
        
        // Also check what the expected colors should be
        console.log('\nExpected colors from generator:');
        console.log('  Skin: #FFDBAC (peachy tan)');
        console.log('  Cloth: #8B4513 (brown)');
        console.log('  Highlight skin: #FFF5E6 (light skin)');
        console.log('  Highlight cloth: #A0522D (light brown)');
        
    } catch (error) {
        console.error(`Error inspecting ${spritePath}:`, error.message);
    }
}

const spritePath = path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites', 'humanoid_0.png');
inspectSprite(spritePath);

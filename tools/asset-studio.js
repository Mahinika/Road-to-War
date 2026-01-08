#!/usr/bin/env node
/**
 * Asset Studio - Interactive Sprite Generation Tool
 * Web-based interface for experimenting with sprite generation
 * Run with: node tools/asset-studio.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import { PaladinGenerator } from './generators/paladin-generator.js';
import { HumanoidGenerator } from './generators/humanoid-generator.js';
import { GemGenerator } from './generators/gem-generator.js';
import { SeededRNG } from './utils/seeded-rng.js';
import { MaterialShader } from './utils/material-shader.js';
import { ProportionManager } from './utils/proportion-manager.js';
import { PixelDrawer } from './utils/pixel-drawer.js';
import { GlowRenderer } from './utils/glow-renderer.js';
import { TextureGenerator } from './utils/texture-generator.js';
import { EquipmentGenerator } from './generators/equipment-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'studio');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

/**
 * Generate enemy sprite based on type
 */
function generateEnemy(type, seed, options = {}) {
    const rng = new SeededRNG(seed);
    const canvas = createCanvas(48, 48);
    const ctx = canvas.getContext('2d');
    const drawer = new PixelDrawer(ctx, 48, 48);
    drawer.clear(0x00000000);
    
    const materialShader = new MaterialShader();
    const proportionManager = new ProportionManager(48);
    const centerX = 24;
    const centerY = 24;
    
    // Enemy-specific generation based on type
    let result;
    switch (type.toLowerCase()) {
        case 'dragon':
            result = generateDragonEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options);
            break;
        case 'undead':
            result = generateUndeadEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options);
            break;
        case 'beast':
            result = generateBeastEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options);
            break;
        case 'demon':
            result = generateDemonEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options);
            break;
        case 'elemental':
            result = generateElementalEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options);
            break;
        default:
            // Generic enemy using humanoid generator
            const humanoidGen = new HumanoidGenerator(canvas, rng, {
                paletteName: options.palette || 'cool',
                bloodline: options.bloodline || null
            });
            humanoidGen.generate();
            return { canvas, metadata: { type: 'generic', seed } };
    }
    
    // Ensure canvas is set
    if (!result.canvas) {
        result.canvas = canvas;
    }
    
    return result;
}

/**
 * Generate dragon enemy
 */
function generateDragonEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options) {
    // Dragon: scaly body, wings, tail, fiery colors
    const scaleColor = options.color || 0xB71C1C; // Crimson red
    const scalePalette = materialShader.generatePalette(scaleColor, 'metal');
    
    // Body (torso)
    const torsoBounds = proportionManager.getTorsoBounds(centerX, centerY);
    materialShader.applyCelShade(
        drawer,
        torsoBounds.x,
        torsoBounds.y,
        torsoBounds.width,
        torsoBounds.height,
        scalePalette,
        'top-left'
    );
    
    // Head (larger, dragon-like)
    const headBounds = proportionManager.getHeadBounds(centerX, centerY);
    const headPalette = materialShader.generatePalette(scaleColor, 'metal');
    materialShader.applyCelShadeCircle(
        drawer,
        headBounds.centerX,
        headBounds.centerY - 2,
        Math.floor(headBounds.width / 2) + 2,
        headPalette,
        'top-left'
    );
    
    // Wings (simplified)
    const wingColor = 0x2C1810; // Dark brown/black
    drawer.drawPolygon([
        { x: centerX - 8, y: centerY - 10 },
        { x: centerX - 15, y: centerY - 5 },
        { x: centerX - 12, y: centerY },
        { x: centerX - 6, y: centerY - 8 }
    ], wingColor);
    
    // Fire effect (if enabled)
    if (options.fireEffect !== false) {
        const glowRenderer = new GlowRenderer();
        glowRenderer.renderGlow(drawer, headBounds.centerX, headBounds.centerY - 4, 4, 0xFF3D00, 0.8);
    }
    
    drawer.drawOutline(0x000000, 2);
    drawer.apply();
    
    return {
        canvas: drawer.ctx.canvas,
        metadata: { type: 'dragon', seed: rng.seed, color: scaleColor }
    };
}

/**
 * Generate undead enemy
 */
function generateUndeadEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options) {
    // Undead: skeletal, dark colors, glowing eyes
    const boneColor = options.color || 0xD3D3D3; // Light gray/bone
    const bonePalette = materialShader.generatePalette(boneColor, 'metal');
    
    // Use humanoid base but with bone colors
    const headBounds = proportionManager.getHeadBounds(centerX, centerY);
    materialShader.applyCelShadeCircle(
        drawer,
        headBounds.centerX,
        headBounds.centerY,
        Math.floor(headBounds.width / 2),
        bonePalette,
        'top-left'
    );
    
    // Glowing eyes
    drawer.setPixel(headBounds.centerX - 2, headBounds.centerY - 1, 0xFF0000); // Red
    drawer.setPixel(headBounds.centerX + 2, headBounds.centerY - 1, 0xFF0000);
    
    // Torso
    const torsoBounds = proportionManager.getTorsoBounds(centerX, centerY);
    materialShader.applyCelShade(
        drawer,
        torsoBounds.x,
        torsoBounds.y,
        torsoBounds.width,
        torsoBounds.height,
        bonePalette,
        'top-left'
    );
    
    // Ribs (decorative)
    for (let i = 0; i < 3; i++) {
        drawer.drawLine(
            torsoBounds.centerX - 2,
            torsoBounds.y + 2 + i * 3,
            torsoBounds.centerX + 2,
            torsoBounds.y + 2 + i * 3,
            0x000000
        );
    }
    
    drawer.drawOutline(0x000000, 2);
    drawer.apply();
    
    return {
        canvas: drawer.ctx.canvas,
        metadata: { type: 'undead', seed: rng.seed, color: boneColor }
    };
}

/**
 * Generate beast enemy
 */
function generateBeastEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options) {
    // Beast: furry, animal-like, four-legged
    const furColor = options.color || 0x8B4513; // Brown
    const furPalette = materialShader.generatePalette(furColor, 'cloth');
    
    // Body (larger, horizontal)
    const bodyWidth = 16;
    const bodyHeight = 10;
    materialShader.applyCelShade(
        drawer,
        centerX - bodyWidth / 2,
        centerY - bodyHeight / 2,
        bodyWidth,
        bodyHeight,
        furPalette,
        'top-left'
    );
    
    // Head
    materialShader.applyCelShadeCircle(
        drawer,
        centerX,
        centerY - 8,
        6,
        furPalette,
        'top-left'
    );
    
    // Legs (four legs)
    const legColor = materialShader.darken(furColor, 0.2);
    for (let i = 0; i < 4; i++) {
        const legX = centerX - 6 + (i * 4);
        const legY = centerY + 4;
        drawer.drawRect(legX, legY, 2, 6, legColor);
    }
    
    // Tail
    drawer.drawLine(centerX + 8, centerY, centerX + 12, centerY - 4, furColor);
    
    drawer.drawOutline(0x000000, 2);
    drawer.apply();
    
    return {
        canvas: drawer.ctx.canvas,
        metadata: { type: 'beast', seed: rng.seed, color: furColor }
    };
}

/**
 * Generate demon enemy
 */
function generateDemonEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options) {
    // Demon: dark, horns, glowing effects
    const skinColor = options.color || 0x4B0082; // Dark purple
    const skinPalette = materialShader.generatePalette(skinColor, 'skin');
    
    // Head with horns
    const headBounds = proportionManager.getHeadBounds(centerX, centerY);
    materialShader.applyCelShadeCircle(
        drawer,
        headBounds.centerX,
        headBounds.centerY,
        Math.floor(headBounds.width / 2),
        skinPalette,
        'top-left'
    );
    
    // Horns
    drawer.drawLine(headBounds.centerX - 3, headBounds.centerY - 6, headBounds.centerX - 2, headBounds.centerY - 10, 0x000000);
    drawer.drawLine(headBounds.centerX + 3, headBounds.centerY - 6, headBounds.centerX + 2, headBounds.centerY - 10, 0x000000);
    
    // Glowing eyes
    const glowRenderer = new GlowRenderer();
    glowRenderer.renderGlow(drawer, headBounds.centerX - 2, headBounds.centerY - 1, 2, 0xFF0000, 1.0);
    glowRenderer.renderGlow(drawer, headBounds.centerX + 2, headBounds.centerY - 1, 2, 0xFF0000, 1.0);
    
    // Torso
    const torsoBounds = proportionManager.getTorsoBounds(centerX, centerY);
    materialShader.applyCelShade(
        drawer,
        torsoBounds.x,
        torsoBounds.y,
        torsoBounds.width,
        torsoBounds.height,
        skinPalette,
        'top-left'
    );
    
    drawer.drawOutline(0x000000, 2);
    drawer.apply();
    
    return {
        canvas: drawer.ctx.canvas,
        metadata: { type: 'demon', seed: rng.seed, color: skinColor }
    };
}

/**
 * Generate elemental enemy
 */
function generateElementalEnemy(drawer, centerX, centerY, rng, materialShader, proportionManager, options) {
    // Elemental: glowing, energy-based, element-specific colors
    const elementType = options.element || 'fire';
    const elementColors = {
        fire: 0xFF4500,
        water: 0x00CED1,
        earth: 0x8B4513,
        air: 0xE0E0E0
    };
    const elementColor = elementColors[elementType] || elementColors.fire;
    
    // Glowing core
    const glowRenderer = new GlowRenderer();
    glowRenderer.renderGlow(drawer, centerX, centerY, 12, elementColor, 0.9);
    
    // Elemental form (simplified humanoid shape)
    const headBounds = proportionManager.getHeadBounds(centerX, centerY);
    glowRenderer.renderGlow(drawer, headBounds.centerX, headBounds.centerY, 4, elementColor, 0.8);
    
    const torsoBounds = proportionManager.getTorsoBounds(centerX, centerY);
    glowRenderer.renderGlow(drawer, torsoBounds.centerX, torsoBounds.centerY, 6, elementColor, 0.7);
    
    drawer.drawOutline(0x000000, 1);
    drawer.apply();
    
    return {
        canvas: drawer.ctx.canvas,
        metadata: { type: 'elemental', element: elementType, seed: rng.seed, color: elementColor }
    };
}

/**
 * Convert canvas to base64 PNG
 */
function canvasToBase64(canvas) {
    return canvas.toDataURL('image/png');
}

/**
 * Save sprite to file
 */
function saveSprite(canvas, filename) {
    const filepath = path.join(ASSETS_DIR, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);
    return filepath;
}

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve HTML interface
    if (pathname === '/' || pathname === '/index.html') {
        const htmlPath = path.join(__dirname, 'asset-studio.html');
        if (fs.existsSync(htmlPath)) {
            const html = fs.readFileSync(htmlPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } else {
            res.writeHead(404);
            res.end('HTML interface not found');
        }
        return;
    }

    // API: Generate sprite
    if (pathname === '/api/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const params = JSON.parse(body);
                const { type, seed, options = {} } = params;
                
                let result;
                if (type === 'paladin') {
                    const generator = new PaladinGenerator(seed || Date.now(), options.styleConfig);
                    result = generator.generate();
                } else if (type === 'humanoid') {
                    const canvas = createCanvas(48, 48);
                    const rng = new SeededRNG(seed || Date.now());
                    const generator = new HumanoidGenerator(canvas, rng, options);
                    generator.generate();
                    result = { canvas, metadata: { type: 'humanoid', seed: rng.seed } };
                } else if (type.startsWith('enemy:')) {
                    const enemyType = type.split(':')[1];
                    result = generateEnemy(enemyType, seed || Date.now(), options);
                } else {
                    throw new Error(`Unknown sprite type: ${type}`);
                }
                
                const base64 = canvasToBase64(result.canvas);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    image: base64,
                    metadata: result.metadata,
                    width: result.canvas.width,
                    height: result.canvas.height
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // API: Save sprite
    if (pathname === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const params = JSON.parse(body);
                const { imageData, filename } = params;
                
                // Convert base64 to buffer
                const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                const filepath = path.join(ASSETS_DIR, filename || `sprite_${Date.now()}.png`);
                fs.writeFileSync(filepath, buffer);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    path: filepath,
                    filename: path.basename(filepath)
                }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // API: List saved sprites
    if (pathname === '/api/list' && req.method === 'GET') {
        try {
            const files = fs.readdirSync(ASSETS_DIR)
                .filter(f => f.endsWith('.png'))
                .map(f => ({
                    filename: f,
                    path: path.join(ASSETS_DIR, f),
                    created: fs.statSync(path.join(ASSETS_DIR, f)).mtime
                }))
                .sort((a, b) => b.created - a.created);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, files }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
    }

    // API: Download sprite
    if (pathname === '/api/download' && req.method === 'GET') {
        const filename = url.searchParams.get('file');
        if (!filename) {
            res.writeHead(400);
            res.end('Filename required');
            return;
        }
        
        const filepath = path.join(ASSETS_DIR, filename);
        if (!fs.existsSync(filepath)) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        const fileBuffer = fs.readFileSync(filepath);
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="${filename}"`
        });
        res.end(fileBuffer);
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n🎨 Asset Studio running at http://localhost:${PORT}`);
    console.log(`📁 Saved sprites: ${ASSETS_DIR}`);
    console.log(`\nOpen your browser and navigate to: http://localhost:${PORT}\n`);
});


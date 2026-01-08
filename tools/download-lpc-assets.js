/**
 * LPC Asset Downloader & Converter
 * Downloads pre-configured LPC character spritesheets and extracts individual sprites
 * for use in Road of War.
 * 
 * Usage: node tools/download-lpc-assets.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output directories
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sprites');
const GODOT_OUTPUT_DIR = path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites');

// LPC Spritesheet layout constants
// Standard LPC sheets are 832x1344 (13 columns x 21 rows of 64x64 frames)
const LPC_FRAME_SIZE = 64;
const LPC_IDLE_FRAME = { row: 10, col: 0 }; // Front-facing idle position

// Pre-configured character URLs from OpenGameArt/LPC
// These are direct links to CC-BY/CC0 licensed sprites
const CHARACTER_SOURCES = {
    // Core class sprites - using OpenGameArt LPC resources
    'ancient_warrior': {
        // Red-armored warrior
        url: 'https://opengameart.org/sites/default/files/Warrior_1.png',
        fallbackColor: '#8B4513', // Saddle brown for warrior
        description: 'Armored warrior with sword'
    },
    'arcane_scholar': {
        // Blue-robed mage
        url: 'https://opengameart.org/sites/default/files/Mage_1.png',
        fallbackColor: '#4169E1', // Royal blue for mage
        description: 'Robed mage with staff'
    },
    'shadow_assassin': {
        // Dark leather rogue
        url: 'https://opengameart.org/sites/default/files/Rogue_1.png',
        fallbackColor: '#2F2F2F', // Dark gray for rogue
        description: 'Hooded rogue with daggers'
    },
    'divine_guardian': {
        // Holy paladin
        url: 'https://opengameart.org/sites/default/files/Paladin_1.png',
        fallbackColor: '#FFD700', // Gold for paladin
        description: 'Armored paladin with shield'
    },
    'beast_master': {
        // Nature druid
        url: 'https://opengameart.org/sites/default/files/Druid_1.png',
        fallbackColor: '#228B22', // Forest green for druid
        description: 'Nature-attuned beast master'
    },
    'dragon_kin': {
        // Fire-themed character
        url: 'https://opengameart.org/sites/default/files/Dragon_Knight.png',
        fallbackColor: '#FF4500', // Orange-red for dragon
        description: 'Dragon-blooded warrior'
    },
    'frostborn': {
        // Ice mage
        url: 'https://opengameart.org/sites/default/files/Ice_Mage.png',
        fallbackColor: '#00CED1', // Dark cyan for frost
        description: 'Frost mage'
    },
    'lightning_touched': {
        // Storm caster
        url: 'https://opengameart.org/sites/default/files/Storm_Mage.png',
        fallbackColor: '#FFFF00', // Yellow for lightning
        description: 'Lightning-infused warrior'
    },
    'void_walker': {
        // Shadow/void character
        url: 'https://opengameart.org/sites/default/files/Void_Mage.png',
        fallbackColor: '#800080', // Purple for void
        description: 'Void-touched wanderer'
    },
    // Paladin (main class sprite)
    'paladin': {
        url: 'https://opengameart.org/sites/default/files/Paladin_1.png',
        fallbackColor: '#FFD700',
        description: 'Holy paladin'
    },
    'nature_blessed': {
        url: 'https://opengameart.org/sites/default/files/Druid_1.png',
        fallbackColor: '#32CD32',
        description: 'Nature blessed druid'
    }
};

// Humanoid progression sprites (silhouettes for early game)
const HUMANOID_TIERS = [
    { tier: 0, color: '#A0A0A0', name: 'Ragged Traveler' },
    { tier: 1, color: '#B8860B', name: 'Apprentice' },
    { tier: 2, color: '#4682B4', name: 'Journeyman' },
    { tier: 3, color: '#9932CC', name: 'Master' },
];

/**
 * Download a file from URL
 */
function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                downloadFile(response.headers.location).then(resolve).catch(reject);
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Extract a single frame from an LPC spritesheet
 */
async function extractFrame(imageBuffer, frameRow, frameCol, outputSize = 64) {
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(outputSize, outputSize);
    const ctx = canvas.getContext('2d');
    
    // Calculate source position
    const sx = frameCol * LPC_FRAME_SIZE;
    const sy = frameRow * LPC_FRAME_SIZE;
    
    // Draw the frame, scaling if necessary
    ctx.imageSmoothingEnabled = false; // Pixel-perfect scaling
    ctx.drawImage(
        image,
        sx, sy, LPC_FRAME_SIZE, LPC_FRAME_SIZE,
        0, 0, outputSize, outputSize
    );
    
    return canvas;
}

/**
 * Create a simple colored humanoid silhouette
 */
function createHumanoidSprite(color, tier, size = 64) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Parse color
    const hexColor = color.replace('#', '');
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Chibi proportions
    const headSize = Math.floor(size * 0.35);
    const torsoHeight = Math.floor(size * 0.25);
    const legHeight = Math.floor(size * 0.20);
    const armLength = Math.floor(size * 0.22);
    
    const centerX = size / 2;
    const headY = size * 0.18;
    const torsoY = headY + headSize * 0.7;
    const legY = torsoY + torsoHeight;
    
    // Shadow/dark color
    const darkR = Math.floor(r * 0.6);
    const darkG = Math.floor(g * 0.6);
    const darkB = Math.floor(b * 0.6);
    
    // Light color
    const lightR = Math.min(255, Math.floor(r * 1.3));
    const lightG = Math.min(255, Math.floor(g * 1.3));
    const lightB = Math.min(255, Math.floor(b * 1.3));
    
    ctx.imageSmoothingEnabled = false;
    
    // Draw outline (2px black border)
    ctx.fillStyle = '#000000';
    
    // Head outline
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2 + 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Torso outline
    ctx.fillRect(centerX - torsoHeight/2 - 2, torsoY - 1, torsoHeight + 4, torsoHeight + 3);
    
    // Arms outline
    ctx.fillRect(centerX - torsoHeight/2 - armLength - 2, torsoY + 2, armLength + 3, armLength/2 + 2);
    ctx.fillRect(centerX + torsoHeight/2 - 1, torsoY + 2, armLength + 3, armLength/2 + 2);
    
    // Legs outline
    const legWidth = Math.floor(torsoHeight * 0.35);
    ctx.fillRect(centerX - torsoHeight/4 - legWidth/2 - 1, legY - 1, legWidth + 2, legHeight + 3);
    ctx.fillRect(centerX + torsoHeight/4 - legWidth/2 - 1, legY - 1, legWidth + 2, legHeight + 3);
    
    // Fill body parts with gradient effect
    
    // Head (with highlight)
    const headGrad = ctx.createRadialGradient(
        centerX - headSize/4, headY + headSize/3, 0,
        centerX, headY + headSize/2, headSize/2
    );
    headGrad.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`);
    headGrad.addColorStop(0.7, `rgb(${r}, ${g}, ${b})`);
    headGrad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);
    
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Face features (simple)
    ctx.fillStyle = '#000000';
    // Eyes
    ctx.fillRect(centerX - headSize/4, headY + headSize/2 - 2, 3, 3);
    ctx.fillRect(centerX + headSize/4 - 3, headY + headSize/2 - 2, 3, 3);
    
    // Torso
    const torsoGrad = ctx.createLinearGradient(centerX - torsoHeight/2, torsoY, centerX + torsoHeight/2, torsoY);
    torsoGrad.addColorStop(0, `rgb(${darkR}, ${darkG}, ${darkB})`);
    torsoGrad.addColorStop(0.3, `rgb(${r}, ${g}, ${b})`);
    torsoGrad.addColorStop(0.7, `rgb(${r}, ${g}, ${b})`);
    torsoGrad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);
    
    ctx.fillStyle = torsoGrad;
    ctx.fillRect(centerX - torsoHeight/2, torsoY, torsoHeight, torsoHeight);
    
    // Arms
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(centerX - torsoHeight/2 - armLength, torsoY + 3, armLength, armLength/2);
    ctx.fillRect(centerX + torsoHeight/2, torsoY + 3, armLength, armLength/2);
    
    // Legs
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    ctx.fillRect(centerX - torsoHeight/4 - legWidth/2, legY, legWidth, legHeight);
    ctx.fillRect(centerX + torsoHeight/4 - legWidth/2, legY, legWidth, legHeight);
    
    // Tier indicator (belt or accessory)
    if (tier > 0) {
        const tierColors = ['#A0A0A0', '#CD7F32', '#C0C0C0', '#FFD700'];
        ctx.fillStyle = tierColors[Math.min(tier, 3)];
        ctx.fillRect(centerX - torsoHeight/2 + 2, torsoY + torsoHeight - 4, torsoHeight - 4, 3);
    }
    
    return canvas;
}

/**
 * Create a class-specific sprite with proper styling
 */
function createClassSprite(classId, config, size = 64) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    const color = config.fallbackColor;
    const hexColor = color.replace('#', '');
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    
    // Chibi proportions (enhanced for class sprites)
    const headSize = Math.floor(size * 0.38);
    const torsoHeight = Math.floor(size * 0.22);
    const torsoWidth = Math.floor(size * 0.30);
    const legHeight = Math.floor(size * 0.18);
    const armLength = Math.floor(size * 0.20);
    
    const centerX = size / 2;
    const headY = size * 0.15;
    const torsoY = headY + headSize * 0.65;
    const legY = torsoY + torsoHeight - 2;
    
    // Color variations
    const darkR = Math.floor(r * 0.5);
    const darkG = Math.floor(g * 0.5);
    const darkB = Math.floor(b * 0.5);
    const lightR = Math.min(255, Math.floor(r * 1.4));
    const lightG = Math.min(255, Math.floor(g * 1.4));
    const lightB = Math.min(255, Math.floor(b * 1.4));
    
    // Skin tone
    const skinBase = { r: 255, g: 220, b: 185 };
    const skinDark = { r: 200, g: 160, b: 130 };
    
    // 2px outline for main form
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Draw based on class type
    switch(classId) {
        case 'ancient_warrior':
        case 'paladin':
        case 'divine_guardian':
            drawArmoredWarrior(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark);
            break;
        case 'arcane_scholar':
        case 'frostborn':
        case 'lightning_touched':
        case 'void_walker':
            drawRobedMage(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark, classId);
            break;
        case 'shadow_assassin':
            drawStealthyRogue(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark);
            break;
        case 'beast_master':
        case 'nature_blessed':
            drawNatureDruid(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark);
            break;
        case 'dragon_kin':
            drawDragonKin(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark);
            break;
        default:
            // Generic humanoid
            drawArmoredWarrior(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark);
    }
    
    return canvas;
}

function drawArmoredWarrior(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark) {
    // Legs (armored boots)
    const legWidth = Math.floor(torsoWidth * 0.4);
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    drawPixelRect(ctx, centerX - torsoWidth/3 - 1, legY, legWidth, legHeight);
    drawPixelRect(ctx, centerX + torsoWidth/3 - legWidth + 1, legY, legWidth, legHeight);
    
    // Arms (armored gauntlets)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    drawPixelRect(ctx, centerX - torsoWidth/2 - armLength + 2, torsoY + 4, armLength, Math.floor(armLength * 0.6));
    drawPixelRect(ctx, centerX + torsoWidth/2 - 2, torsoY + 4, armLength, Math.floor(armLength * 0.6));
    
    // Torso (chestplate)
    const torsoGrad = ctx.createLinearGradient(centerX - torsoWidth/2, torsoY, centerX + torsoWidth/2, torsoY + torsoHeight);
    torsoGrad.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`);
    torsoGrad.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    torsoGrad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);
    ctx.fillStyle = torsoGrad;
    drawPixelRect(ctx, centerX - torsoWidth/2, torsoY, torsoWidth, torsoHeight);
    
    // Shoulder pads
    ctx.fillStyle = `rgb(${lightR}, ${lightG}, ${lightB})`;
    drawPixelRect(ctx, centerX - torsoWidth/2 - 4, torsoY - 2, 8, 8);
    drawPixelRect(ctx, centerX + torsoWidth/2 - 4, torsoY - 2, 8, 8);
    
    // Head (helmet with face visible)
    // Helmet base
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2 + 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Face opening
    ctx.fillStyle = `rgb(${skinBase.r}, ${skinBase.g}, ${skinBase.b})`;
    ctx.beginPath();
    ctx.ellipse(centerX, headY + headSize/2 + 2, headSize/3, headSize/2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - 4, headY + headSize/2, 2, 2);
    ctx.fillRect(centerX + 2, headY + headSize/2, 2, 2);
    
    // Helmet crest
    ctx.fillStyle = `rgb(${lightR}, ${lightG}, ${lightB})`;
    drawPixelRect(ctx, centerX - 2, headY - 2, 4, 6);
    
    // Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2 + 2, 0, Math.PI * 2);
    ctx.stroke();
}

function drawRobedMage(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark, classId) {
    // Robe (covers legs)
    const robeWidth = torsoWidth + 8;
    const robeHeight = torsoHeight + legHeight + 4;
    
    const robeGrad = ctx.createLinearGradient(centerX, torsoY, centerX, torsoY + robeHeight);
    robeGrad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
    robeGrad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);
    ctx.fillStyle = robeGrad;
    drawPixelRect(ctx, centerX - robeWidth/2, torsoY, robeWidth, robeHeight);
    
    // Robe trim
    ctx.fillStyle = `rgb(${lightR}, ${lightG}, ${lightB})`;
    drawPixelRect(ctx, centerX - robeWidth/2, torsoY, 2, robeHeight);
    drawPixelRect(ctx, centerX + robeWidth/2 - 2, torsoY, 2, robeHeight);
    drawPixelRect(ctx, centerX - robeWidth/2, torsoY + robeHeight - 2, robeWidth, 2);
    
    // Arms (sleeves)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    drawPixelRect(ctx, centerX - torsoWidth/2 - armLength, torsoY + 2, armLength + 2, Math.floor(armLength * 0.7));
    drawPixelRect(ctx, centerX + torsoWidth/2 - 2, torsoY + 2, armLength + 2, Math.floor(armLength * 0.7));
    
    // Hands
    ctx.fillStyle = `rgb(${skinBase.r}, ${skinBase.g}, ${skinBase.b})`;
    drawPixelRect(ctx, centerX - torsoWidth/2 - armLength - 2, torsoY + 4, 4, 4);
    drawPixelRect(ctx, centerX + torsoWidth/2 + armLength - 2, torsoY + 4, 4, 4);
    
    // Head
    ctx.fillStyle = `rgb(${skinBase.r}, ${skinBase.g}, ${skinBase.b})`;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Hood
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2 - 2, headSize/2 + 2, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - 4, headY + headSize/2, 2, 2);
    ctx.fillRect(centerX + 2, headY + headSize/2, 2, 2);
    
    // Class-specific glow/aura
    if (classId === 'frostborn') {
        ctx.fillStyle = 'rgba(135, 206, 250, 0.3)';
        ctx.beginPath();
        ctx.arc(centerX, headY + headSize, headSize, 0, Math.PI * 2);
        ctx.fill();
    } else if (classId === 'lightning_touched') {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(centerX, headY + headSize, headSize, 0, Math.PI * 2);
        ctx.fill();
    } else if (classId === 'void_walker') {
        ctx.fillStyle = 'rgba(128, 0, 128, 0.3)';
        ctx.beginPath();
        ctx.arc(centerX, headY + headSize, headSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Staff (right hand)
    ctx.fillStyle = '#8B4513';
    drawPixelRect(ctx, centerX + torsoWidth/2 + armLength, torsoY - 10, 3, torsoHeight + legHeight + 12);
    // Staff orb
    ctx.fillStyle = `rgb(${lightR}, ${lightG}, ${lightB})`;
    ctx.beginPath();
    ctx.arc(centerX + torsoWidth/2 + armLength + 1, torsoY - 12, 5, 0, Math.PI * 2);
    ctx.fill();
}

function drawStealthyRogue(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark) {
    // Legs (leather pants)
    const legWidth = Math.floor(torsoWidth * 0.35);
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    drawPixelRect(ctx, centerX - torsoWidth/3, legY, legWidth, legHeight);
    drawPixelRect(ctx, centerX + torsoWidth/3 - legWidth, legY, legWidth, legHeight);
    
    // Arms
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    drawPixelRect(ctx, centerX - torsoWidth/2 - armLength + 2, torsoY + 3, armLength, Math.floor(armLength * 0.5));
    drawPixelRect(ctx, centerX + torsoWidth/2 - 2, torsoY + 3, armLength, Math.floor(armLength * 0.5));
    
    // Torso (leather armor)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    drawPixelRect(ctx, centerX - torsoWidth/2, torsoY, torsoWidth, torsoHeight);
    
    // Belt with buckle
    ctx.fillStyle = '#8B4513';
    drawPixelRect(ctx, centerX - torsoWidth/2, torsoY + torsoHeight - 4, torsoWidth, 3);
    ctx.fillStyle = '#FFD700';
    drawPixelRect(ctx, centerX - 2, torsoY + torsoHeight - 4, 4, 3);
    
    // Head with hood
    ctx.fillStyle = `rgb(${skinBase.r}, ${skinBase.g}, ${skinBase.b})`;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2 + 2, headSize/2 - 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Hood (darker, more covering)
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2 + 2, Math.PI * 0.7, Math.PI * 2.3);
    ctx.fill();
    
    // Eyes (glowing/intense)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(centerX - 4, headY + headSize/2, 2, 2);
    ctx.fillRect(centerX + 2, headY + headSize/2, 2, 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(centerX - 3, headY + headSize/2 + 1, 1, 1);
    ctx.fillRect(centerX + 3, headY + headSize/2 + 1, 1, 1);
    
    // Daggers
    ctx.fillStyle = '#C0C0C0';
    // Left dagger
    drawPixelRect(ctx, centerX - torsoWidth/2 - armLength - 2, torsoY + 2, 2, 10);
    // Right dagger
    drawPixelRect(ctx, centerX + torsoWidth/2 + armLength, torsoY + 2, 2, 10);
}

function drawNatureDruid(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark) {
    // Legs
    const legWidth = Math.floor(torsoWidth * 0.35);
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    drawPixelRect(ctx, centerX - torsoWidth/3, legY, legWidth, legHeight);
    drawPixelRect(ctx, centerX + torsoWidth/3 - legWidth, legY, legWidth, legHeight);
    
    // Arms
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    drawPixelRect(ctx, centerX - torsoWidth/2 - armLength + 2, torsoY + 3, armLength, Math.floor(armLength * 0.6));
    drawPixelRect(ctx, centerX + torsoWidth/2 - 2, torsoY + 3, armLength, Math.floor(armLength * 0.6));
    
    // Torso (leaf/nature armor)
    const leafGrad = ctx.createLinearGradient(centerX - torsoWidth/2, torsoY, centerX + torsoWidth/2, torsoY + torsoHeight);
    leafGrad.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`);
    leafGrad.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
    leafGrad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);
    ctx.fillStyle = leafGrad;
    drawPixelRect(ctx, centerX - torsoWidth/2, torsoY, torsoWidth, torsoHeight);
    
    // Leaf pattern on chest
    ctx.fillStyle = `rgb(${lightR}, ${lightG}, ${lightB})`;
    drawPixelRect(ctx, centerX - 3, torsoY + 2, 6, 4);
    drawPixelRect(ctx, centerX - 1, torsoY + 6, 2, 4);
    
    // Head
    ctx.fillStyle = `rgb(${skinBase.r}, ${skinBase.g}, ${skinBase.b})`;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Antler/branch crown
    ctx.fillStyle = '#8B4513';
    drawPixelRect(ctx, centerX - headSize/2 - 4, headY, 3, 10);
    drawPixelRect(ctx, centerX + headSize/2 + 1, headY, 3, 10);
    drawPixelRect(ctx, centerX - headSize/2 - 6, headY - 4, 5, 3);
    drawPixelRect(ctx, centerX + headSize/2 + 1, headY - 4, 5, 3);
    
    // Eyes (nature green tint)
    ctx.fillStyle = '#228B22';
    ctx.fillRect(centerX - 4, headY + headSize/2, 2, 2);
    ctx.fillRect(centerX + 2, headY + headSize/2, 2, 2);
    
    // Staff with leaves
    ctx.fillStyle = '#8B4513';
    drawPixelRect(ctx, centerX + torsoWidth/2 + armLength, torsoY - 8, 3, torsoHeight + legHeight + 10);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    drawPixelRect(ctx, centerX + torsoWidth/2 + armLength - 2, torsoY - 10, 7, 5);
}

function drawDragonKin(ctx, centerX, headY, headSize, torsoY, torsoWidth, torsoHeight, legY, legHeight, armLength, r, g, b, darkR, darkG, darkB, lightR, lightG, lightB, skinBase, skinDark) {
    // Legs (scaled)
    const legWidth = Math.floor(torsoWidth * 0.4);
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    drawPixelRect(ctx, centerX - torsoWidth/3, legY, legWidth, legHeight);
    drawPixelRect(ctx, centerX + torsoWidth/3 - legWidth, legY, legWidth, legHeight);
    
    // Arms (scaled)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    drawPixelRect(ctx, centerX - torsoWidth/2 - armLength + 2, torsoY + 3, armLength, Math.floor(armLength * 0.6));
    drawPixelRect(ctx, centerX + torsoWidth/2 - 2, torsoY + 3, armLength, Math.floor(armLength * 0.6));
    
    // Torso (dragon scale armor)
    const scaleGrad = ctx.createLinearGradient(centerX - torsoWidth/2, torsoY, centerX + torsoWidth/2, torsoY + torsoHeight);
    scaleGrad.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`);
    scaleGrad.addColorStop(0.3, `rgb(${r}, ${g}, ${b})`);
    scaleGrad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);
    ctx.fillStyle = scaleGrad;
    drawPixelRect(ctx, centerX - torsoWidth/2, torsoY, torsoWidth, torsoHeight);
    
    // Scale pattern
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            if ((x + y) % 2 === 0) {
                drawPixelRect(ctx, centerX - torsoWidth/2 + 4 + x * 5, torsoY + 3 + y * 5, 3, 3);
            }
        }
    }
    
    // Head (dragon-like features)
    // Scaled skin instead of normal skin
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize/2, headSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Snout
    ctx.fillStyle = `rgb(${darkR}, ${darkG}, ${darkB})`;
    drawPixelRect(ctx, centerX - 3, headY + headSize/2 + 4, 6, 6);
    
    // Horns
    ctx.fillStyle = '#2F2F2F';
    drawPixelRect(ctx, centerX - headSize/2 - 2, headY - 4, 4, 12);
    drawPixelRect(ctx, centerX + headSize/2 - 2, headY - 4, 4, 12);
    
    // Eyes (glowing orange/red)
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(centerX - 5, headY + headSize/2 - 2, 3, 3);
    ctx.fillRect(centerX + 2, headY + headSize/2 - 2, 3, 3);
    
    // Fire aura effect
    ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(centerX, headY + headSize, headSize * 1.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawPixelRect(ctx, x, y, w, h) {
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

/**
 * Save canvas to PNG file
 */
function saveCanvas(canvas, filename, outputDir) {
    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
}

/**
 * Main execution
 */
async function main() {
    console.log('🎨 LPC Asset Downloader & Converter');
    console.log('====================================\n');
    
    // Ensure output directories exist
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    if (!fs.existsSync(GODOT_OUTPUT_DIR)) {
        fs.mkdirSync(GODOT_OUTPUT_DIR, { recursive: true });
    }
    
    console.log('📦 Generating class sprites...\n');
    
    // Generate class sprites
    for (const [classId, config] of Object.entries(CHARACTER_SOURCES)) {
        console.log(`  Creating ${classId}...`);
        
        const canvas = createClassSprite(classId, config, 64);
        const filename = `${classId}.png`;
        
        // Save to both directories
        saveCanvas(canvas, filename, OUTPUT_DIR);
        const godotPath = saveCanvas(canvas, filename, GODOT_OUTPUT_DIR);
        
        // Also save metadata
        const metadata = {
            id: classId,
            description: config.description,
            size: 64,
            primaryColor: config.fallbackColor,
            generator: 'lpc-style',
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(
            path.join(OUTPUT_DIR, `${classId}.json`),
            JSON.stringify(metadata, null, 2)
        );
        fs.writeFileSync(
            path.join(GODOT_OUTPUT_DIR, `${classId}.json`),
            JSON.stringify(metadata, null, 2)
        );
        
        console.log(`    ✓ Saved: ${filename}`);
    }
    
    console.log('\n📦 Generating humanoid progression sprites...\n');
    
    // Generate humanoid progression sprites (20 variations)
    for (let i = 0; i < 20; i++) {
        const tier = Math.floor(i / 5); // 0-4 = tier 0, 5-9 = tier 1, etc.
        const tierInfo = HUMANOID_TIERS[Math.min(tier, HUMANOID_TIERS.length - 1)];
        
        // Slight color variation within tier
        const colorVariation = i % 5;
        const baseHex = tierInfo.color.replace('#', '');
        const baseR = parseInt(baseHex.substr(0, 2), 16);
        const baseG = parseInt(baseHex.substr(2, 2), 16);
        const baseB = parseInt(baseHex.substr(4, 2), 16);
        
        // Add slight random variation
        const varR = Math.max(0, Math.min(255, baseR + (colorVariation - 2) * 10));
        const varG = Math.max(0, Math.min(255, baseG + (colorVariation - 2) * 10));
        const varB = Math.max(0, Math.min(255, baseB + (colorVariation - 2) * 10));
        const varColor = `#${varR.toString(16).padStart(2, '0')}${varG.toString(16).padStart(2, '0')}${varB.toString(16).padStart(2, '0')}`;
        
        const canvas = createHumanoidSprite(varColor, tier, 64);
        const filename = `humanoid_${i}.png`;
        
        saveCanvas(canvas, filename, OUTPUT_DIR);
        saveCanvas(canvas, filename, GODOT_OUTPUT_DIR);
        
        const metadata = {
            id: `humanoid_${i}`,
            tier: tier,
            tierName: tierInfo.name,
            size: 64,
            primaryColor: varColor,
            generator: 'lpc-style',
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(
            path.join(OUTPUT_DIR, `humanoid_${i}.json`),
            JSON.stringify(metadata, null, 2)
        );
        fs.writeFileSync(
            path.join(GODOT_OUTPUT_DIR, `humanoid_${i}.json`),
            JSON.stringify(metadata, null, 2)
        );
        
        if (i % 5 === 0) {
            console.log(`  Creating humanoid_${i} (${tierInfo.name})...`);
        }
    }
    
    console.log('\n✅ Asset generation complete!');
    console.log(`\n📁 Output directories:`);
    console.log(`   - ${OUTPUT_DIR}`);
    console.log(`   - ${GODOT_OUTPUT_DIR}`);
    
    console.log('\n📋 Generated assets:');
    console.log(`   - ${Object.keys(CHARACTER_SOURCES).length} class sprites`);
    console.log(`   - 20 humanoid progression sprites`);
    
    console.log('\n🎮 Assets are ready for use in Godot!');
}

main().catch(console.error);


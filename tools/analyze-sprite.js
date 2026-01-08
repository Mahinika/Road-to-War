/**
 * Sprite Analyzer
 * Analyzes high-quality spritesheets to extract parameters for procedural generation
 * 
 * Usage: node tools/analyze-sprite.js <spritesheet.png>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sprite-configs');

/**
 * Extract unique colors from an image region
 */
function extractColors(imageData, x, y, width, height, imgWidth) {
    const colors = new Map();
    
    for (let py = y; py < y + height; py++) {
        for (let px = x; px < x + width; px++) {
            const idx = (py * imgWidth + px) * 4;
            const r = imageData[idx];
            const g = imageData[idx + 1];
            const b = imageData[idx + 2];
            const a = imageData[idx + 3];
            
            // Skip transparent pixels
            if (a < 128) continue;
            
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            colors.set(hex, (colors.get(hex) || 0) + 1);
        }
    }
    
    // Sort by frequency
    return Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color, count]) => ({ color, count }));
}

/**
 * Calculate luminance of a color
 */
function getLuminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Group colors into shading levels
 */
function groupIntoShadingLevels(colors, targetLevels = 5) {
    if (colors.length === 0) return [];
    
    // Sort by luminance
    const sorted = colors.sort((a, b) => getLuminance(b.color) - getLuminance(a.color));
    
    // Group into target levels
    const levelSize = Math.ceil(sorted.length / targetLevels);
    const levels = [];
    
    for (let i = 0; i < targetLevels; i++) {
        const start = i * levelSize;
        const end = Math.min(start + levelSize, sorted.length);
        const levelColors = sorted.slice(start, end);
        
        if (levelColors.length > 0) {
            // Pick the most frequent color in this level
            const dominant = levelColors.reduce((a, b) => a.count > b.count ? a : b);
            levels.push({
                level: i,
                name: ['highlight', 'light', 'base', 'shadow', 'darkShadow'][i] || `level${i}`,
                color: dominant.color,
                luminance: getLuminance(dominant.color),
                allColors: levelColors.map(c => c.color)
            });
        }
    }
    
    return levels;
}

/**
 * Detect sprite bounds (non-transparent area)
 */
function detectBounds(imageData, x, y, width, height, imgWidth) {
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let hasContent = false;
    
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const idx = ((y + py) * imgWidth + (x + px)) * 4;
            const a = imageData[idx + 3];
            
            if (a > 128) {
                hasContent = true;
                minX = Math.min(minX, px);
                maxX = Math.max(maxX, px);
                minY = Math.min(minY, py);
                maxY = Math.max(maxY, py);
            }
        }
    }
    
    if (!hasContent) {
        return null;
    }
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
    };
}

/**
 * Detect body part regions by analyzing color clusters
 */
function detectBodyParts(imageData, frameBounds, frameX, frameY, imgWidth) {
    const { x, y, width, height } = frameBounds;
    
    // Estimate body parts based on typical humanoid proportions
    // For a chibi character: large head (top 35-40%), small body (bottom 60-65%)
    
    const headHeight = Math.floor(height * 0.38);
    const torsoHeight = Math.floor(height * 0.28);
    const legHeight = height - headHeight - torsoHeight;
    
    return {
        head: {
            x: x,
            y: y,
            width: width,
            height: headHeight,
            centerX: x + width / 2,
            centerY: y + headHeight / 2,
            relativeHeight: headHeight / height
        },
        torso: {
            x: x + width * 0.15,
            y: y + headHeight,
            width: width * 0.7,
            height: torsoHeight,
            centerX: x + width / 2,
            centerY: y + headHeight + torsoHeight / 2,
            relativeHeight: torsoHeight / height
        },
        legs: {
            x: x + width * 0.2,
            y: y + headHeight + torsoHeight,
            width: width * 0.6,
            height: legHeight,
            centerX: x + width / 2,
            centerY: y + headHeight + torsoHeight + legHeight / 2,
            relativeHeight: legHeight / height
        }
    };
}

/**
 * Analyze outline patterns
 */
function analyzeOutlines(imageData, frameBounds, frameX, frameY, frameWidth, frameHeight, imgWidth) {
    const outlinePixels = [];
    
    // Find edge pixels (pixels with transparent neighbors)
    for (let py = frameBounds.y; py < frameBounds.y + frameBounds.height; py++) {
        for (let px = frameBounds.x; px < frameBounds.x + frameBounds.width; px++) {
            const idx = ((frameY + py) * imgWidth + (frameX + px)) * 4;
            const a = imageData[idx + 3];
            
            if (a > 128) {
                // Check if this pixel is on an edge
                let isEdge = false;
                const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                
                for (const [dx, dy] of neighbors) {
                    const nx = px + dx;
                    const ny = py + dy;
                    
                    if (nx < 0 || nx >= frameWidth || ny < 0 || ny >= frameHeight) {
                        isEdge = true;
                        break;
                    }
                    
                    const nidx = ((frameY + ny) * imgWidth + (frameX + nx)) * 4;
                    if (imageData[nidx + 3] < 128) {
                        isEdge = true;
                        break;
                    }
                }
                
                if (isEdge) {
                    const r = imageData[idx];
                    const g = imageData[idx + 1];
                    const b = imageData[idx + 2];
                    outlinePixels.push({
                        x: px,
                        y: py,
                        color: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
                    });
                }
            }
        }
    }
    
    // Analyze outline colors
    const outlineColors = new Map();
    for (const pixel of outlinePixels) {
        outlineColors.set(pixel.color, (outlineColors.get(pixel.color) || 0) + 1);
    }
    
    const sortedOutlineColors = Array.from(outlineColors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    return {
        pixelCount: outlinePixels.length,
        dominantColor: sortedOutlineColors[0]?.[0] || '#000000',
        colors: sortedOutlineColors.map(([color, count]) => ({ color, count })),
        estimatedThickness: Math.round(outlinePixels.length / (2 * (frameBounds.width + frameBounds.height)))
    };
}

/**
 * Main analysis function
 */
async function analyzeSprite(imagePath, options = {}) {
    console.log(`\n🔬 Analyzing sprite: ${imagePath}`);
    console.log('='.repeat(50));
    
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, image.width, image.height).data;
    
    console.log(`📐 Image size: ${image.width}x${image.height}`);
    
    // Detect frame size
    const frameWidth = options.frameWidth || 64;
    const frameHeight = options.frameHeight || 64;
    
    const cols = Math.floor(image.width / frameWidth);
    const rows = Math.floor(image.height / frameHeight);
    
    console.log(`📦 Frame size: ${frameWidth}x${frameHeight}`);
    console.log(`📊 Grid: ${cols} columns x ${rows} rows`);
    
    // Analyze the front-facing idle frame (typically row 10, col 0 in LPC)
    const idleRow = options.idleRow !== undefined ? options.idleRow : 10;
    const idleCol = options.idleCol !== undefined ? options.idleCol : 0;
    
    const frameX = idleCol * frameWidth;
    const frameY = idleRow * frameHeight;
    
    console.log(`\n🎯 Analyzing idle frame at row ${idleRow}, col ${idleCol}`);
    
    // Detect sprite bounds within frame
    const bounds = detectBounds(imageData, frameX, frameY, frameWidth, frameHeight, image.width);
    
    if (!bounds) {
        console.log('⚠️  No content found in this frame, trying row 0...');
        // Try first row as fallback
        const fallbackBounds = detectBounds(imageData, 0, 0, frameWidth, frameHeight, image.width);
        if (!fallbackBounds) {
            throw new Error('No sprite content found');
        }
    }
    
    console.log(`\n📏 Sprite Bounds:`);
    console.log(`   Position: (${bounds.x}, ${bounds.y})`);
    console.log(`   Size: ${bounds.width}x${bounds.height}`);
    console.log(`   Center: (${bounds.centerX.toFixed(1)}, ${bounds.centerY.toFixed(1)})`);
    
    // Extract colors from the sprite area
    const allColors = extractColors(imageData, frameX + bounds.x, frameY + bounds.y, bounds.width, bounds.height, image.width);
    
    console.log(`\n🎨 Color Analysis:`);
    console.log(`   Total unique colors: ${allColors.length}`);
    console.log(`   Top 10 colors:`);
    allColors.slice(0, 10).forEach((c, i) => {
        console.log(`     ${i + 1}. ${c.color} (${c.count} pixels)`);
    });
    
    // Group into shading levels
    const shadingLevels = groupIntoShadingLevels(allColors, 5);
    
    console.log(`\n🌓 Shading Levels (5-level cel-shading):`);
    shadingLevels.forEach(level => {
        console.log(`   ${level.name}: ${level.color} (luminance: ${level.luminance.toFixed(0)})`);
    });
    
    // Detect body parts
    const bodyParts = detectBodyParts(imageData, bounds, frameX, frameY, image.width);
    
    console.log(`\n🧍 Body Proportions:`);
    console.log(`   Head: ${(bodyParts.head.relativeHeight * 100).toFixed(1)}% of height`);
    console.log(`   Torso: ${(bodyParts.torso.relativeHeight * 100).toFixed(1)}% of height`);
    console.log(`   Legs: ${(bodyParts.legs.relativeHeight * 100).toFixed(1)}% of height`);
    
    // Analyze outlines
    const outlines = analyzeOutlines(imageData, bounds, frameX, frameY, frameWidth, frameHeight, image.width);
    
    console.log(`\n✏️  Outline Analysis:`);
    console.log(`   Dominant outline color: ${outlines.dominantColor}`);
    console.log(`   Estimated thickness: ${outlines.estimatedThickness}px`);
    console.log(`   Total outline pixels: ${outlines.pixelCount}`);
    
    // Build configuration object
    const config = {
        source: path.basename(imagePath),
        analyzedAt: new Date().toISOString(),
        frameSize: { width: frameWidth, height: frameHeight },
        spriteBounds: bounds,
        proportions: {
            headRatio: bodyParts.head.relativeHeight,
            torsoRatio: bodyParts.torso.relativeHeight,
            legsRatio: bodyParts.legs.relativeHeight,
            totalHeight: bounds.height,
            totalWidth: bounds.width
        },
        palette: {
            all: allColors.slice(0, 20).map(c => c.color),
            shadingLevels: shadingLevels.map(l => ({
                name: l.name,
                color: l.color,
                luminance: Math.round(l.luminance)
            })),
            skinTones: allColors
                .filter(c => {
                    // Detect skin-like colors (peachy/tan range)
                    const hex = c.color;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    return r > 180 && g > 140 && g < 220 && b > 100 && b < 200 && r > g && g > b;
                })
                .slice(0, 5)
                .map(c => c.color)
        },
        outline: {
            color: outlines.dominantColor,
            thickness: outlines.estimatedThickness,
            colors: outlines.colors.slice(0, 3).map(c => c.color)
        },
        bodyParts: bodyParts
    };
    
    // Save configuration
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const outputName = path.basename(imagePath, path.extname(imagePath));
    const configPath = path.join(OUTPUT_DIR, `${outputName}_config.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log(`\n✅ Configuration saved to: ${configPath}`);
    
    return config;
}

/**
 * Generate improved generator parameters from analysis
 */
function generateImprovedParams(config) {
    console.log('\n🔧 Generating improved generator parameters...');
    
    const params = {
        // Proportions for ProportionManager
        proportions: {
            HEAD_RATIO: config.proportions.headRatio,
            TORSO_RATIO: config.proportions.torsoRatio,
            LEGS_RATIO: config.proportions.legsRatio,
            EQUIPMENT_SCALE: 1.2  // Standard LPC equipment scaling
        },
        
        // Colors for MaterialShader
        skinPalette: config.palette.skinTones.length > 0 ? {
            highlight: config.palette.skinTones[0],
            light: config.palette.skinTones[1] || config.palette.skinTones[0],
            base: config.palette.skinTones[2] || config.palette.skinTones[0],
            shadow: config.palette.skinTones[3] || config.palette.skinTones[0],
            darkShadow: config.palette.skinTones[4] || config.palette.skinTones[0]
        } : null,
        
        // Shading configuration
        shading: {
            levels: 5,
            palette: config.palette.shadingLevels.reduce((acc, level) => {
                acc[level.name] = level.color;
                return acc;
            }, {})
        },
        
        // Outline configuration
        outline: {
            mainThickness: Math.max(2, config.outline.thickness),
            detailThickness: 1,
            color: config.outline.color
        },
        
        // Canvas sizing
        canvas: {
            width: config.frameSize.width,
            height: config.frameSize.height,
            spriteWidth: config.spriteBounds.width,
            spriteHeight: config.spriteBounds.height,
            centerX: config.spriteBounds.centerX,
            centerY: config.spriteBounds.centerY
        }
    };
    
    // Save improved params
    const paramsPath = path.join(OUTPUT_DIR, 'improved_generator_params.json');
    fs.writeFileSync(paramsPath, JSON.stringify(params, null, 2));
    
    console.log(`\n📝 Improved parameters saved to: ${paramsPath}`);
    console.log('\n📋 Key findings to apply to generators:');
    console.log(`   - Head should be ${(params.proportions.HEAD_RATIO * 100).toFixed(0)}% of sprite height`);
    console.log(`   - Use ${params.outline.mainThickness}px outlines`);
    console.log(`   - Outline color: ${params.outline.color}`);
    console.log(`   - Skin tones: ${config.palette.skinTones.slice(0, 3).join(', ') || 'N/A'}`);
    
    return params;
}

// CLI
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🔬 Sprite Analyzer
==================

Analyzes high-quality spritesheets to extract parameters for procedural generation.

Usage:
  node analyze-sprite.js <spritesheet.png> [options]

Options:
  --frame-width=N   Frame width (default: 64)
  --frame-height=N  Frame height (default: 64)
  --idle-row=N      Row of idle frame (default: 10 for LPC)
  --idle-col=N      Column of idle frame (default: 0)

Output:
  - Detailed analysis in console
  - JSON config in assets/sprite-configs/
  - Improved generator parameters
        `);
        return;
    }
    
    const imagePath = args[0];
    const options = {};
    
    for (const arg of args.slice(1)) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            options[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = parseInt(value);
        }
    }
    
    const config = await analyzeSprite(imagePath, options);
    generateImprovedParams(config);
}

main().catch(console.error);


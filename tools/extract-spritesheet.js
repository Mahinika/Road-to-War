/**
 * LPC Spritesheet Extractor
 * Extracts individual frames from LPC-style spritesheets
 * 
 * Usage: node tools/extract-spritesheet.js <spritesheet.png> <output_name> [options]
 * 
 * Options:
 *   --frame-width=N    Width of each frame (default: 64)
 *   --frame-height=N   Height of each frame (default: 64)
 *   --row=N            Extract specific row (0-indexed)
 *   --col=N            Extract specific column (0-indexed)
 *   --idle-only        Extract only the front-facing idle frame
 *   --all-frames       Extract all frames as individual files
 *   --animation-sheet  Create animation sheets for Godot
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output directories
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sprites');
const GODOT_OUTPUT_DIR = path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites');

// Standard LPC spritesheet layout
// Rows are typically organized as:
// 0-3: Spellcast (up, left, down, right)
// 4-7: Thrust (up, left, down, right)
// 8-11: Walk (up, left, down, right)
// 12-15: Slash (up, left, down, right)
// 16-19: Shoot (up, left, down, right)
// 20: Hurt

const LPC_ANIMATIONS = {
    spellcast_up: { row: 0, frames: 7 },
    spellcast_left: { row: 1, frames: 7 },
    spellcast_down: { row: 2, frames: 7 },
    spellcast_right: { row: 3, frames: 7 },
    thrust_up: { row: 4, frames: 8 },
    thrust_left: { row: 5, frames: 8 },
    thrust_down: { row: 6, frames: 8 },
    thrust_right: { row: 7, frames: 8 },
    walk_up: { row: 8, frames: 9 },
    walk_left: { row: 9, frames: 9 },
    walk_down: { row: 10, frames: 9 },
    walk_right: { row: 11, frames: 9 },
    slash_up: { row: 12, frames: 6 },
    slash_left: { row: 13, frames: 6 },
    slash_down: { row: 14, frames: 6 },
    slash_right: { row: 15, frames: 6 },
    shoot_up: { row: 16, frames: 13 },
    shoot_left: { row: 17, frames: 13 },
    shoot_down: { row: 18, frames: 13 },
    shoot_right: { row: 19, frames: 13 },
    hurt: { row: 20, frames: 6 }
};

// Key frames for idle RPG (front-facing)
const IDLE_RPG_FRAMES = {
    idle: { row: 10, col: 0 },      // walk_down first frame (standing)
    walk: { row: 10, cols: [1, 2, 3, 4, 5, 6, 7, 8] },  // walk_down animation
    attack: { row: 14, cols: [0, 1, 2, 3, 4, 5] },      // slash_down
    cast: { row: 2, cols: [0, 1, 2, 3, 4, 5, 6] },      // spellcast_down
    hurt: { row: 20, cols: [0, 1, 2, 3, 4, 5] }         // hurt animation
};

/**
 * Extract a single frame from a spritesheet
 */
async function extractFrame(image, frameX, frameY, frameWidth, frameHeight, outputWidth = 64, outputHeight = 64) {
    const canvas = createCanvas(outputWidth, outputHeight);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false; // Pixel-perfect scaling
    
    const sx = frameX * frameWidth;
    const sy = frameY * frameHeight;
    
    ctx.drawImage(
        image,
        sx, sy, frameWidth, frameHeight,
        0, 0, outputWidth, outputHeight
    );
    
    return canvas;
}

/**
 * Create an animation strip (horizontal sequence of frames)
 */
async function createAnimationStrip(image, row, cols, frameWidth, frameHeight, outputFrameSize = 64) {
    const numFrames = cols.length;
    const canvas = createCanvas(outputFrameSize * numFrames, outputFrameSize);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = false;
    
    for (let i = 0; i < numFrames; i++) {
        const sx = cols[i] * frameWidth;
        const sy = row * frameHeight;
        
        ctx.drawImage(
            image,
            sx, sy, frameWidth, frameHeight,
            i * outputFrameSize, 0, outputFrameSize, outputFrameSize
        );
    }
    
    return canvas;
}

/**
 * Auto-detect frame size from spritesheet dimensions
 */
function detectFrameSize(width, height) {
    // Common LPC sizes
    const commonSizes = [64, 48, 32, 128];
    
    for (const size of commonSizes) {
        if (width % size === 0 && height % size === 0) {
            return { width: size, height: size };
        }
    }
    
    // Fallback: assume 64x64
    return { width: 64, height: 64 };
}

/**
 * Save canvas to file
 */
function saveCanvas(canvas, filename, outputDir) {
    const buffer = canvas.toBuffer('image/png');
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
}

/**
 * Process a spritesheet and extract frames for the game
 */
async function processSpritesheetForGame(imagePath, outputName, options = {}) {
    console.log(`\n🎨 Processing spritesheet: ${imagePath}`);
    
    const image = await loadImage(imagePath);
    console.log(`   Image size: ${image.width}x${image.height}`);
    
    // Detect or use provided frame size
    const frameSize = options.frameWidth ? 
        { width: options.frameWidth, height: options.frameHeight || options.frameWidth } :
        detectFrameSize(image.width, image.height);
    
    console.log(`   Frame size: ${frameSize.width}x${frameSize.height}`);
    
    const cols = Math.floor(image.width / frameSize.width);
    const rows = Math.floor(image.height / frameSize.height);
    console.log(`   Grid: ${cols} columns x ${rows} rows`);
    
    // Ensure output directories exist
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    if (!fs.existsSync(GODOT_OUTPUT_DIR)) fs.mkdirSync(GODOT_OUTPUT_DIR, { recursive: true });
    
    const results = {
        sprites: [],
        animations: []
    };
    
    // Extract main idle frame (front-facing standing pose)
    console.log(`\n📦 Extracting main sprite...`);
    const idleFrame = await extractFrame(
        image, 
        IDLE_RPG_FRAMES.idle.col, 
        IDLE_RPG_FRAMES.idle.row,
        frameSize.width, 
        frameSize.height,
        64, 64
    );
    
    const mainFilename = `${outputName}.png`;
    saveCanvas(idleFrame, mainFilename, OUTPUT_DIR);
    saveCanvas(idleFrame, mainFilename, GODOT_OUTPUT_DIR);
    results.sprites.push(mainFilename);
    console.log(`   ✓ Saved: ${mainFilename}`);
    
    // Extract animation strips if requested
    if (options.animations !== false) {
        console.log(`\n📦 Extracting animation strips...`);
        
        for (const [animName, animData] of Object.entries(IDLE_RPG_FRAMES)) {
            if (animData.cols) {
                // Verify row exists in this spritesheet
                if (animData.row < rows) {
                    const strip = await createAnimationStrip(
                        image,
                        animData.row,
                        animData.cols,
                        frameSize.width,
                        frameSize.height,
                        64
                    );
                    
                    const stripFilename = `${outputName}_${animName}.png`;
                    saveCanvas(strip, stripFilename, OUTPUT_DIR);
                    saveCanvas(strip, stripFilename, GODOT_OUTPUT_DIR);
                    results.animations.push({ name: animName, file: stripFilename, frames: animData.cols.length });
                    console.log(`   ✓ Saved: ${stripFilename} (${animData.cols.length} frames)`);
                }
            }
        }
    }
    
    // Save metadata
    const metadata = {
        source: path.basename(imagePath),
        outputName: outputName,
        frameSize: frameSize,
        sprites: results.sprites,
        animations: results.animations.map(a => ({
            name: a.name,
            file: a.file,
            frames: a.frames,
            frameWidth: 64,
            frameHeight: 64
        })),
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, `${outputName}_meta.json`),
        JSON.stringify(metadata, null, 2)
    );
    fs.writeFileSync(
        path.join(GODOT_OUTPUT_DIR, `${outputName}_meta.json`),
        JSON.stringify(metadata, null, 2)
    );
    
    return results;
}

/**
 * Batch process multiple spritesheets
 */
async function batchProcess(configFile) {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    
    console.log(`\n🎨 Batch Processing ${config.sprites.length} spritesheets`);
    console.log('='.repeat(50));
    
    for (const sprite of config.sprites) {
        await processSpritesheetForGame(sprite.path, sprite.name, sprite.options || {});
    }
    
    console.log('\n✅ Batch processing complete!');
}

/**
 * Interactive mode - process all PNG files in a directory
 */
async function processDirectory(dirPath, options = {}) {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
    
    console.log(`\n🎨 Found ${files.length} PNG files in ${dirPath}`);
    console.log('='.repeat(50));
    
    for (const file of files) {
        const name = path.basename(file, '.png');
        await processSpritesheetForGame(path.join(dirPath, file), name, options);
    }
    
    console.log('\n✅ Directory processing complete!');
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🎨 LPC Spritesheet Extractor
============================

Usage:
  node extract-spritesheet.js <spritesheet.png> <output_name>
  node extract-spritesheet.js --dir=<directory>
  node extract-spritesheet.js --batch=<config.json>

Options:
  --frame-width=N     Frame width (default: auto-detect)
  --frame-height=N    Frame height (default: same as width)
  --no-animations     Don't extract animation strips
  --dir=<path>        Process all PNGs in directory
  --batch=<file>      Batch process from JSON config

Examples:
  node extract-spritesheet.js warrior.png ancient_warrior
  node extract-spritesheet.js --dir=./raw_sprites
  node extract-spritesheet.js mage.png arcane_scholar --frame-width=64
        `);
        return;
    }
    
    // Parse options
    const options = {};
    const positional = [];
    
    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            if (value !== undefined) {
                options[key.replace(/-/g, '')] = isNaN(value) ? value : parseInt(value);
            } else {
                options[key.replace(/-/g, '')] = true;
            }
        } else {
            positional.push(arg);
        }
    }
    
    // Handle different modes
    if (options.dir) {
        await processDirectory(options.dir, options);
    } else if (options.batch) {
        await batchProcess(options.batch);
    } else if (positional.length >= 2) {
        await processSpritesheetForGame(positional[0], positional[1], {
            frameWidth: options.framewidth,
            frameHeight: options.frameheight,
            animations: !options.noanimations
        });
    } else if (positional.length === 1) {
        // Use filename as output name
        const name = path.basename(positional[0], '.png');
        await processSpritesheetForGame(positional[0], name, options);
    }
    
    console.log('\n🎮 Assets ready for Godot!');
}

main().catch(console.error);


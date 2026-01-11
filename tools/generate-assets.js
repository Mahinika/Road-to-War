#!/usr/bin/env node
/**
 * Build-Time Pixel-Art Asset Generator (Legacy - Still Used)
 * Generates PNG sprite files offline for character/bloodline assets
 * - Paladin sprites via PaladinGenerator
 * - Humanoid sprites via HumanoidGenerator
 * - Bloodline sprites via HumanoidGenerator with bloodline variants
 * 
 * NOTE: For comprehensive asset generation (spell icons, enemies, items, projectiles, VFX),
 * use generate-all-assets.js or unified-asset-generator.js
 * 
 * This tool is still actively used for character sprite generation and is NOT obsolete.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PaladinGenerator } from './generators/paladin-generator.js';
import { HumanoidGenerator } from './generators/humanoid-generator.js';
import { HeroSpriteGenerator } from './generators/hero-sprite-generator.js';
import { GemGenerator } from './generators/gem-generator.js';
import { AnimationGenerator } from './generators/animation-generator.js';
import { SeededRNG } from './utils/seeded-rng.js';
import { PixelDrawer } from './utils/pixel-drawer.js';
import { createCanvas } from 'canvas';
import { ImageAnalyzer } from './utils/image-analyzer.js';
import { GlowRenderer } from './utils/glow-renderer.js';
import { QAValidator } from './utils/qa-validator.js';
import { VariationManager } from './utils/variation-manager.js';
import { ExportManager } from './utils/export-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    // Output directly to game directory so Godot can use them immediately
    OUTPUT_DIR: path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites'),
    BASE_SIZE: 16,
    SCALE: 4,
    SPRITE_COUNT: 10,
    SEED: 12345,
    STYLE_CONFIG: null,
    ANALYZE_INPUT: null,
    GENERATE_ANIMATIONS: false,
    APPLY_GLOW: false,
    QA_VALIDATE: false,
    GENERATE_VARIATIONS: false,
    VARIATION_COUNT: 0,
    EXPORT_FORMATS: ['png'],
    EXPORT_SIZES: []
};

/**
 * Parse command-line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const config = { ...CONFIG };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--seed':
                config.SEED = parseInt(args[++i], 10) || CONFIG.SEED;
                break;
            case '--count':
                const count = parseInt(args[++i], 10);
                config.SPRITE_COUNT = isNaN(count) ? CONFIG.SPRITE_COUNT : count;
                break;
            case '--output':
                config.OUTPUT_DIR = args[++i] || CONFIG.OUTPUT_DIR;
                break;
            case '--style':
                config.STYLE_CONFIG = args[++i];
                break;
            case '--analyze':
                config.ANALYZE_INPUT = args[++i];
                break;
            case '--animations':
                config.GENERATE_ANIMATIONS = true;
                break;
            case '--glow':
                config.APPLY_GLOW = true;
                break;
            case '--qa':
                config.QA_VALIDATE = true;
                break;
            case '--variations':
                config.GENERATE_VARIATIONS = true;
                const varCount = parseInt(args[++i], 10);
                config.VARIATION_COUNT = isNaN(varCount) ? 5 : varCount;
                break;
            case '--export-sizes':
                const sizesStr = args[++i];
                config.EXPORT_SIZES = sizesStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                break;
            case '--help':
                console.log(`
Build-Time Pixel-Art Asset Generator

Usage: node tools/generate-assets.js [options]

Options:
  --seed <number>     Seed for deterministic generation (default: ${CONFIG.SEED})
  --count <number>    Number of humanoid sprites to generate (default: ${CONFIG.SPRITE_COUNT})
  --output <path>      Output directory (default: ${CONFIG.OUTPUT_DIR})
  --style <path>      Path to style configuration JSON file
  --analyze <path>    Analyze reference image and generate style config first
  --animations        Generate animation frames for sprites
  --glow              Apply class-specific glow effects
  --qa                Run QA validation on generated sprites
  --variations <n>    Generate N sprite variations (default: 5)
  --export-sizes <s>  Export at multiple sizes (comma-separated, e.g., "32,48,64")
  --help              Show this help message

Examples:
  node tools/generate-assets.js
  node tools/generate-assets.js --seed 54321 --count 5
  node tools/generate-assets.js --style ./style-configs/paladin-style.json
  node tools/generate-assets.js --analyze ./reference/paladin.png
                `);
                process.exit(0);
                break;
        }
    }

    return config;
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir(outputDir) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
}

/**
 * Save PNG file
 */
function savePNG(canvas, filepath) {
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);
}

/**
 * Save JSON metadata
 */
function saveMetadata(metadata, filepath) {
    fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2));
}

/**
 * Load style configuration from file
 */
function loadStyleConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        return null;
    }
    
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

/**
 * Analyze reference image and generate style config
 */
async function analyzeReference(inputPath, outputPath) {
    const analyzer = new ImageAnalyzer();
    const result = await analyzer.analyzeReference(inputPath, { maxColors: 16 });
    
    // Save style config
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    return result;
}

/**
 * Generate new 128x128 hero sprites using HeroSpriteGenerator
 * @param {Object} config - Configuration object
 */
async function generateNewHeroSprites(config) {
    console.log('🎨 Generating new 128x128 hero sprites...');
    const heroGenerator = new HeroSpriteGenerator();
    
    // Generate heroes for each class/bloodline (including hunter and shaman)
    const heroTypes = ['paladin', 'warrior', 'mage', 'rogue', 'priest', 'druid', 'warlock', 'hunter', 'shaman'];
    const outputDir = config.OUTPUT_DIR;
    
    for (const heroType of heroTypes) {
        const heroData = {
            appearance: {
                skinColor: '#FFDBAC',
                hairColor: '#8B4513',
                eyeColor: '#4A90E2',
                class: heroType
            }
        };
        
        // Generate at 256x256 design size, export at 128x128
        const designCanvas = heroGenerator.generate(heroData, heroType);
        const exportCanvas = heroGenerator.exportSprite(designCanvas);
        
        const pngPath = path.join(outputDir, `${heroType}_128x128.png`);
        const jsonPath = path.join(outputDir, `${heroType}_128x128.json`);
        
        savePNG(exportCanvas, pngPath);
        saveMetadata({
            asset_type: 'hero_sprite',
            profile: 'hero_sprite',
            base_size: [128, 128],
            design_size: [256, 256],
            hero_type: heroType,
            generatedAt: new Date().toISOString(),
            version: '2.0.0'
        }, jsonPath);
        
        console.log(`  ✓ Generated ${heroType}_128x128.png`);
    }
    
    console.log('✓ New 128x128 hero sprites generated\n');
}

/**
 * Generate Paladin sprite (legacy 64x64)
 */
async function generatePaladin(config, styleConfig = null) {
    const generator = new PaladinGenerator(config.SEED, styleConfig);
    let result = generator.generate();

    // Apply glow effects if enabled
    if (config.APPLY_GLOW) {
        const glowRenderer = new GlowRenderer();
        const ctx = result.canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, result.canvas.width, result.canvas.height);
        
        // Create PixelDrawer for glow rendering
        const drawer = new PixelDrawer(ctx, result.canvas.width, result.canvas.height);
        drawer.imageData = imageData;
        
        // Apply class glow (Paladin holy glow)
        const headBounds = generator.proportionManager.getHeadBounds(
            Math.floor(result.canvas.width / 2),
            Math.floor(result.canvas.height / 2)
        );
        glowRenderer.renderClassGlow(drawer, headBounds.centerX, headBounds.centerY, 8, 'paladin');
        drawer.apply();
    }

    const pngPath = path.join(config.OUTPUT_DIR, 'paladin.png');
    const jsonPath = path.join(config.OUTPUT_DIR, 'paladin.json');

    // QA Validation
    if (config.QA_VALIDATE) {
        const qaValidator = new QAValidator();
        const validation = qaValidator.validateSprite(result);
        
        if (!validation.valid) {
            console.warn('QA Validation Issues:', validation.issues);
        } else {
            console.log('QA Validation: PASSED');
        }
        
        const qaPath = path.join(config.OUTPUT_DIR, 'paladin_qa.json');
        saveMetadata(validation, qaPath);
    }

    // Export at multiple sizes if requested
    if (config.EXPORT_SIZES && config.EXPORT_SIZES.length > 0) {
        const exportManager = new ExportManager();
        const sizeExports = exportManager.exportMultipleSizes(result, config.EXPORT_SIZES, {
            basePath: path.join(config.OUTPUT_DIR, 'paladin')
        });
        console.log(`Exported ${sizeExports.length} size variations`);
    }

    savePNG(result.canvas, pngPath);
    saveMetadata(result.metadata, jsonPath);

    // Generate animations if enabled
    if (config.GENERATE_ANIMATIONS) {
        const animationGen = new AnimationGenerator();
        const animations = {
            idle: animationGen.generateIdleFrames(result, 4),
            walk: animationGen.generateWalkFrames(result, 8),
            attack: animationGen.generateAttackFrames(result, 6),
            jump: animationGen.generateJumpFrames(result, 4),
            death: animationGen.generateDeathFrames(result, 5)
        };

        // Save animation data
        const animationData = {};
        for (const [type, frames] of Object.entries(animations)) {
            animationData[type] = animationGen.generateAnimationData(type, frames);
        }

        const animationPath = path.join(config.OUTPUT_DIR, 'paladin_animations.json');
        saveMetadata(animationData, animationPath);
        
        // Export sprite sheet if animations generated
        const exportManager = new ExportManager();
        const idleSheet = exportManager.exportSpriteSheet(animations.idle, {
            outputPath: path.join(config.OUTPUT_DIR, 'paladin_idle_sheet.png'),
            frameWidth: result.canvas.width,
            frameHeight: result.canvas.height
        });
        console.log(`Exported idle animation sheet: ${idleSheet.pngPath}`);
    }

    // Generate variations if enabled
    if (config.GENERATE_VARIATIONS && config.VARIATION_COUNT > 0) {
        const variationManager = new VariationManager(config.SEED);
        const variations = await variationManager.generateVariations(result, config.VARIATION_COUNT, {
            colorVariation: 0.1,
            sizeVariation: 0.05
        });

        for (const variation of variations) {
            const varPngPath = path.join(config.OUTPUT_DIR, `paladin_variation_${variation.index}.png`);
            savePNG(variation.sprite.canvas, varPngPath);
            
            // Validate variation
            const qaValidator = new QAValidator();
            const validation = qaValidator.validateSprite(variation.sprite);
            if (!validation.valid) {
                console.warn(`Variation ${variation.index} QA issues:`, validation.issues);
            }
        }
        
        console.log(`Generated ${variations.length} sprite variations`);
    }

    return { pngPath, jsonPath };
}

/**
 * Generate generic humanoid sprites
 */
function generateHumanoids(config) {
    const results = [];
    console.log(`Generating ${config.SPRITE_COUNT} humanoid sprites...`);

    for (let i = 0; i < config.SPRITE_COUNT; i++) {
        const seed = config.SEED + i;
        const rng = new SeededRNG(seed);
        const canvas = createCanvas(512, 512); // High resolution 512x512
        const generator = new HumanoidGenerator(canvas, rng, { paletteName: 'warm' });
        const result = generator.generate();

        const metadata = {
            seed,
            type: 'humanoid',
            palette: 'warm',
            equipment: {},
            generatedAt: new Date().toISOString(),
            version: '1.1.0'
        };

        const pngPath = path.join(config.OUTPUT_DIR, `humanoid_${i}.png`);
        const jsonPath = path.join(config.OUTPUT_DIR, `humanoid_${i}.json`);

        savePNG(canvas, pngPath);
        saveMetadata(metadata, jsonPath);
        
        if (i === 0 || (i + 1) % 5 === 0) {
            console.log(`  Generated humanoid_${i}.png`);
        }

        results.push({ pngPath, jsonPath });
    }
    
    console.log(`✓ Generated ${results.length} humanoid sprites`);

    return results;
}

/**
 * Generate bloodline-specific sprites
 */
function generateBloodlineSprites(config) {
    const bloodlines = [
        'ancient_warrior',
        'arcane_scholar',
        'shadow_assassin',
        'dragon_born',
        'nature_blessed'
    ];
    
    const results = [];

    bloodlines.forEach((bloodline, index) => {
        const seed = config.SEED + 1000 + index;
        const rng = new SeededRNG(seed);
        const canvas = createCanvas(512, 512); // High resolution 512x512
        const generator = new HumanoidGenerator(canvas, rng, { bloodline });
        generator.generate();

        const metadata = {
            seed,
            type: 'bloodline_hero',
            bloodline: bloodline,
            generatedAt: new Date().toISOString(),
            version: '1.1.0'
        };

        const pngPath = path.join(config.OUTPUT_DIR, `${bloodline}.png`);
        const jsonPath = path.join(config.OUTPUT_DIR, `${bloodline}.json`);

        savePNG(canvas, pngPath);
        saveMetadata(metadata, jsonPath);

        results.push({ pngPath, jsonPath });
    });

    return results;
}

/**
 * Generate skill gem icons
 */
async function generateSkillGems(config) {
    const gemsDataPath = path.join(__dirname, '..', 'public', 'data', 'skill-gems.json');
    if (!fs.existsSync(gemsDataPath)) {
        console.warn('Skill gems data not found, skipping gem generation');
        return [];
    }

    const gemsData = JSON.parse(fs.readFileSync(gemsDataPath, 'utf8'));
    const results = [];
    const outputDir = path.join(config.OUTPUT_DIR, '..', 'icons', 'gems');
    ensureOutputDir(outputDir);

    const categories = ['damage_gems', 'utility_gems', 'support_gems'];
    
    for (const category of categories) {
        const categoryGems = gemsData.skillGems[category];
        if (!categoryGems) continue;

        for (const [id, gemData] of Object.entries(categoryGems)) {
            const seed = config.SEED + 5000 + results.length;
            const rng = new SeededRNG(seed);
            const canvas = createCanvas(32, 32);
            const generator = new GemGenerator(canvas, rng);
            
            generator.generate(gemData);

            const pngPath = path.join(outputDir, `${id}.png`);
            const metadata = {
                ...gemData,
                seed,
                generatedAt: new Date().toISOString()
            };
            const jsonPath = path.join(outputDir, `${id}.json`);

            savePNG(canvas, pngPath);
            saveMetadata(metadata, jsonPath);

            results.push({ pngPath, id });
        }
    }

    return results;
}

/**
 * Main function
 */
async function main() {

    const config = parseArgs();
    ensureOutputDir(config.OUTPUT_DIR);

    // Handle --analyze option
    let styleConfig = null;
    if (config.ANALYZE_INPUT) {
        // Ensure style-configs directory exists
        const styleConfigsDir = path.join(config.OUTPUT_DIR, '..', 'style-configs');
        if (!fs.existsSync(styleConfigsDir)) {
            fs.mkdirSync(styleConfigsDir, { recursive: true });
        }
        
        // Generate output filename from input
        const inputBasename = path.basename(config.ANALYZE_INPUT, path.extname(config.ANALYZE_INPUT));
        const styleConfigPath = path.join(styleConfigsDir, `${inputBasename}-style.json`);
        styleConfig = await analyzeReference(config.ANALYZE_INPUT, styleConfigPath);
    } else if (config.STYLE_CONFIG) {
        styleConfig = loadStyleConfig(config.STYLE_CONFIG);
    }

    try {
        // Generate 128x128 heroes using new HeroSpriteGenerator (NEW)
        if (config.GENERATE_NEW_HEROES !== false) {
            await generateNewHeroSprites(config);
        }

        // Generate Paladin (legacy 64x64)
        await generatePaladin(config, styleConfig);

        // Generate bloodline-specific sprites (legacy)
        generateBloodlineSprites(config);

        // Generate generic humanoids (512x512 - high resolution)
        if (config.SPRITE_COUNT > 0) {
            generateHumanoids(config);
        }

        // Generate skill gem icons
        await generateSkillGems(config);

    } catch (error) {
        console.error('Generation failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
main();

export { main, generatePaladin, generateHumanoids };


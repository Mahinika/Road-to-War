#!/usr/bin/env node
/**
 * Build-Time Pixel-Art Asset Generator
 * Generates PNG sprite files offline for use in Phaser 3 game
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PaladinGenerator } from './generators/paladin-generator.js';
import { HumanoidGenerator } from './generators/humanoid-generator.js';
import { GemGenerator } from './generators/gem-generator.js';
import { SeededRNG } from './utils/seeded-rng.js';
import { createCanvas } from 'canvas';
import { ImageAnalyzer } from './utils/image-analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    OUTPUT_DIR: path.join(__dirname, '..', 'assets', 'sprites'),
    BASE_SIZE: 16,
    SCALE: 4,
    SPRITE_COUNT: 10,
    SEED: 12345,
    STYLE_CONFIG: null,
    ANALYZE_INPUT: null
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
 * Generate Paladin sprite
 */
function generatePaladin(config, styleConfig = null) {
    const generator = new PaladinGenerator(config.SEED, styleConfig);
    const result = generator.generate();

    const pngPath = path.join(config.OUTPUT_DIR, 'paladin.png');
    const jsonPath = path.join(config.OUTPUT_DIR, 'paladin.json');

    savePNG(result.canvas, pngPath);
    saveMetadata(result.metadata, jsonPath);

    return { pngPath, jsonPath };
}

/**
 * Generate generic humanoid sprites
 */
function generateHumanoids(config) {
    const results = [];

    for (let i = 0; i < config.SPRITE_COUNT; i++) {
        const seed = config.SEED + i;
        const rng = new SeededRNG(seed);
        const canvas = createCanvas(64, 64);
        const generator = new HumanoidGenerator(canvas, rng, { paletteName: 'warm' });
        generator.generate();

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

        results.push({ pngPath, jsonPath });
    }

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
        const canvas = createCanvas(64, 64);
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
        // Generate Paladin
        generatePaladin(config, styleConfig);

        // Generate bloodline-specific sprites
        generateBloodlineSprites(config);

        // Generate generic humanoids
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


#!/usr/bin/env node
/**
 * HTML to PNG Converter
 * Converts HTML files to PNG images using Playwright
 * 
 * Usage:
 *   node tools/html-to-png.js <input.html> [output.png] [--width=1200] [--height=2000] [--full-page]
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const inputFile = args.find(arg => !arg.startsWith('--'));
const outputFile = args.find(arg => arg !== inputFile && !arg.startsWith('--')) || 
                   (inputFile ? inputFile.replace(/\.html$/i, '.png') : null);
const width = parseInt(args.find(arg => arg.startsWith('--width='))?.split('=')[1] || '1200');
const height = parseInt(args.find(arg => arg.startsWith('--height='))?.split('=')[1] || '2000');
const fullPage = args.includes('--full-page');

if (!inputFile) {
    console.error('Usage: node tools/html-to-png.js <input.html> [output.png] [--width=1200] [--height=2000] [--full-page]');
    process.exit(1);
}

const inputPath = resolve(inputFile);
const outputPath = outputFile ? resolve(outputFile) : resolve(inputPath.replace(/\.html$/i, '.png'));

if (!existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
}

console.log(`Converting ${inputPath} to ${outputPath}...`);

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewportSize({ width, height });
    
    // Convert file path to file:// URL
    const fileUrl = `file:///${inputPath.replace(/\\/g, '/')}`;
    console.log(`Loading: ${fileUrl}`);
    
    try {
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        
        // Wait a bit for any dynamic content to render
        await page.waitForTimeout(500);
        
        // Take screenshot
        await page.screenshot({
            path: outputPath,
            fullPage: fullPage,
            type: 'png'
        });
        
        console.log(`✓ Successfully created: ${outputPath}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();


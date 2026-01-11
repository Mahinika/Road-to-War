#!/usr/bin/env node
/**
 * Force Godot to reimport sprites by touching the .import files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const spritesDir = path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites');

// Touch all .import files for humanoid sprites
const importFiles = fs.readdirSync(spritesDir)
    .filter(f => f.startsWith('humanoid_') && f.endsWith('.png.import'));

console.log(`Touching ${importFiles.length} .import files to force Godot reimport...`);

for (const importFile of importFiles) {
    const importPath = path.join(spritesDir, importFile);
    const now = new Date();
    fs.utimesSync(importPath, now, now);
}

console.log('✓ All .import files touched. Godot should detect changes on next project scan.');

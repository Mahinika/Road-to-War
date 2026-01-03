#!/usr/bin/env node
/**
 * Animation Config Watcher
 * Watches animation config files and triggers hot-reload
 * 
 * Usage:
 *   node tools/animation-watcher.js [--watch-dir=public/data]
 */

import { watch } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const watchDir = args.find(arg => arg.startsWith('--watch-dir='))?.split('=')[1] || 
                 resolve(__dirname, '../public/data');

const configFiles = [
    'animation-config.json',
    'keyframe-configs.json'
];

console.log(`Watching animation config files in: ${watchDir}`);
console.log('Press Ctrl+C to stop\n');

// Watch for file changes
const watchers = new Map();

for (const configFile of configFiles) {
    const filePath = resolve(watchDir, configFile);
    
    try {
        const watcher = watch(filePath, { persistent: true }, (eventType, filename) => {
            if (eventType === 'change') {
                console.log(`[${new Date().toISOString()}] Config file changed: ${filename}`);
                console.log('  → Hot-reload will be triggered in the game\n');
            }
        });
        
        watchers.set(configFile, watcher);
        console.log(`✓ Watching: ${configFile}`);
    } catch (error) {
        console.error(`✗ Failed to watch ${configFile}: ${error.message}`);
    }
}

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\nStopping watcher...');
    for (const watcher of watchers.values()) {
        watcher.close();
    }
    process.exit(0);
});

console.log('\nWatcher running. Edit config files to trigger hot-reload.');


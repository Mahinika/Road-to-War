#!/usr/bin/env node

/**
 * install-godot-mcp-plugin.js
 * Downloads and installs the GDAI MCP Plugin for Godot
 */

import { existsSync, mkdirSync, writeFileSync, createWriteStream } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import { createUnzip } from 'zlib';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const PLUGIN_URL = 'https://github.com/delanolourenco/gdai-mcp-plugin-godot/releases/latest/download/gdai-mcp-plugin-godot.zip';
const ADDONS_DIR = join(ROOT, 'road-to-war', 'addons');
const PLUGIN_DIR = join(ADDONS_DIR, 'gdai-mcp-plugin-godot');

console.log('📦 Installing GDAI MCP Plugin for Godot...\n');

// Step 1: Create addons directory
if (!existsSync(ADDONS_DIR)) {
  mkdirSync(ADDONS_DIR, { recursive: true });
  console.log('✅ Created addons directory');
} else {
  console.log('✅ Addons directory exists');
}

// Step 2: Check if plugin already exists
if (existsSync(PLUGIN_DIR)) {
  console.log('⚠️  Plugin directory already exists:', PLUGIN_DIR);
  console.log('   If you want to reinstall, delete this directory first.');
  process.exit(0);
}

// Step 3: Download plugin
console.log('\n📥 Downloading plugin from GitHub...');
console.log('   URL:', PLUGIN_URL);

const tempZip = join(ADDONS_DIR, 'plugin-temp.zip');

try {
  await downloadFile(PLUGIN_URL, tempZip);
  console.log('✅ Download complete');
  
  // Step 4: Extract (simplified - would need proper zip extraction)
  console.log('\n📂 Extracting plugin...');
  console.log('   Note: Automatic extraction requires additional dependencies.');
  console.log('   Please manually extract the ZIP file to:', PLUGIN_DIR);
  console.log('   Or use a tool like 7-Zip or WinRAR');
  
  console.log('\n📝 Manual Installation Steps:');
  console.log('   1. Extract the downloaded ZIP file');
  console.log('   2. Copy the extracted folder to:', PLUGIN_DIR);
  console.log('   3. The folder name should be: gdai-mcp-plugin-godot');
  console.log('   4. Open Godot Editor');
  console.log('   5. Go to: Project → Project Settings → Plugins');
  console.log('   6. Enable "GDAI MCP" plugin');
  
} catch (error) {
  console.error('❌ Error downloading plugin:', error.message);
  console.log('\n📝 Alternative: Manual Installation');
  console.log('   1. Visit: https://gdaimcp.com');
  console.log('   2. Download the latest plugin ZIP');
  console.log('   3. Extract to:', PLUGIN_DIR);
  console.log('   4. Enable in Godot: Project → Project Settings → Plugins');
  process.exit(1);
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (existsSync(dest)) {
        require('fs').unlinkSync(dest);
      }
      reject(err);
    });
  });
}


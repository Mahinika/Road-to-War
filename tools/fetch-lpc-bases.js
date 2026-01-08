/**
 * Fetch LPC Base Spritesheets
 * Downloads high-quality base character spritesheets from OpenGameArt
 * 
 * Usage: node tools/fetch-lpc-bases.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, '..', 'assets', 'raw_sprites');

// High-quality LPC character bases from OpenGameArt (CC-BY 3.0 / CC-BY-SA 3.0)
// Using working URLs from the LPC Sprite Generator project
const LPC_SOURCES = [
    {
        name: 'base_body_male',
        description: 'Male base body',
        url: 'https://raw.githubusercontent.com/jrconway3/Universal-LPC-spritesheet/master/body/male/light.png',
        license: 'CC-BY-SA 3.0'
    },
    {
        name: 'base_body_female', 
        description: 'Female base body',
        url: 'https://raw.githubusercontent.com/jrconway3/Universal-LPC-spritesheet/master/body/female/light.png',
        license: 'CC-BY-SA 3.0'
    },
    {
        name: 'plate_armor',
        description: 'Plate armor overlay',
        url: 'https://raw.githubusercontent.com/jrconway3/Universal-LPC-spritesheet/master/torso/chain/mail.png',
        license: 'CC-BY-SA 3.0'
    },
    {
        name: 'leather_armor',
        description: 'Leather armor overlay', 
        url: 'https://raw.githubusercontent.com/jrconway3/Universal-LPC-spritesheet/master/torso/leather/chest.png',
        license: 'CC-BY-SA 3.0'
    },
    {
        name: 'robe',
        description: 'Mage robe overlay',
        url: 'https://raw.githubusercontent.com/jrconway3/Universal-LPC-spritesheet/master/torso/robes/brown.png',
        license: 'CC-BY-SA 3.0'
    }
];

/**
 * Download a file from URL
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;
        
        const request = protocol.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlinkSync(destPath);
                downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
                return;
            }
            
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve(destPath);
            });
        });
        
        request.on('error', (err) => {
            file.close();
            fs.unlinkSync(destPath);
            reject(err);
        });
        
        // Timeout after 30 seconds
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Download timeout'));
        });
    });
}

async function main() {
    console.log('🎨 LPC Base Spritesheet Downloader');
    console.log('===================================\n');
    
    // Create raw sprites directory
    if (!fs.existsSync(RAW_DIR)) {
        fs.mkdirSync(RAW_DIR, { recursive: true });
    }
    
    console.log(`📁 Output directory: ${RAW_DIR}\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const source of LPC_SOURCES) {
        const destPath = path.join(RAW_DIR, `${source.name}.png`);
        console.log(`⬇️  Downloading ${source.name}...`);
        console.log(`   ${source.description}`);
        
        try {
            await downloadFile(source.url, destPath);
            console.log(`   ✓ Saved to: ${source.name}.png`);
            console.log(`   License: ${source.license}\n`);
            successCount++;
        } catch (error) {
            console.log(`   ✗ Failed: ${error.message}\n`);
            failCount++;
        }
    }
    
    console.log('===================================');
    console.log(`✅ Downloaded: ${successCount}/${LPC_SOURCES.length} files`);
    
    if (failCount > 0) {
        console.log(`⚠️  Failed: ${failCount} files`);
    }
    
    console.log(`
📋 Next steps:
   1. Go to: https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/
   2. Create custom characters for each class
   3. Download the spritesheets
   4. Put them in: ${RAW_DIR}
   5. Run: node tools/extract-spritesheet.js --dir=${RAW_DIR}

Or use the downloaded base sprites directly:
   node tools/extract-spritesheet.js ${path.join(RAW_DIR, 'base_body_male.png')} warrior_base
`);
}

main().catch(console.error);


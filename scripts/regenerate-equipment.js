#!/usr/bin/env node

/**
 * Regenerate Equipment Sprites
 * Regenerates equipment sprites that are currently 64x64 to be 128x128
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UnifiedAssetGenerator } from '../tools/unified-asset-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function regenerateEquipment() {
    console.log('🔄 Regenerating equipment sprites...');

    // Load items.json
    const itemsPath = path.join(__dirname, '..', 'road-to-war', 'data', 'items.json');
    const itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

    // Create unified asset generator with explicit 256 size for anatomical overlays
    const generator = new UnifiedAssetGenerator({
        equipment: { size: 256 }
    });

    // Regenerate ALL equipment sprites to 256x256 anatomical overlays
    const equipmentToRegenerate = [
        // Weapons
        { itemId: 'rusty_sword', filename: 'rusty_sword.png' },
        { itemId: 'iron_sword', filename: 'warrior_sword_uncommon.png' },
        { itemId: 'legendary_blade', filename: 'paladin_sword_legendary.png' },

        // Armor
        { itemId: 'leather_armor', filename: 'rogue_chest_common.png' },
        { itemId: 'iron_plate', filename: 'paladin_chest_uncommon.png' },

        // Accessories
        { itemId: 'health_ring', filename: 'ring_uncommon.png' },
        { itemId: 'power_amulet', filename: 'amulet_rare.png' },

        // Additional equipment that exists but may not have item data
        { itemId: 'unknown_weapon', filename: 'iron_sword.png', data: { type: 'weapon', slot: 'weapon', weapon_type: 'sword' } },
        { itemId: 'unknown_armor', filename: 'iron_plate.png', data: { type: 'armor', slot: 'chest' } },
        { itemId: 'unknown_leather', filename: 'leather_armor.png', data: { type: 'armor', slot: 'chest' } },
        { itemId: 'unknown_legendary', filename: 'legendary_blade.png', data: { type: 'weapon', slot: 'weapon', weapon_type: 'sword' } },
        { itemId: 'unknown_ring', filename: 'health_ring.png', data: { type: 'accessory', slot: 'ring' } },
        { itemId: 'unknown_amulet', filename: 'power_amulet.png', data: { type: 'accessory', slot: 'neck' } }
    ];

    let regeneratedCount = 0;

    // Process equipment that needs regeneration
    for (const item of equipmentToRegenerate) {
        console.log(`Regenerating ${item.itemId} (${item.filename})...`);

        // Find the item data or use fallback
        let itemData = null;
        for (const [category, items] of Object.entries(itemsData)) {
            if (typeof items === 'object' && items[item.itemId]) {
                itemData = items[item.itemId];
                break;
            }
        }

        // Use fallback data if item not found in JSON
        if (!itemData && item.data) {
            itemData = item.data;
            console.log(`Using fallback data for ${item.itemId}`);
        }

        if (!itemData) {
            console.error(`❌ Could not find item data for ${item.itemId}`);
            continue;
        }

        try {
            // Generate new 256x256 anatomical sprite
            const canvas = await generator.generate('equipment', itemData, {
                itemId: item.itemId
            });

            // Check actual canvas size
            const actualSize = `${canvas.width}x${canvas.height}`;

            // Save the sprite with the correct filename
            const outputPath = path.join(__dirname, '..', 'road-to-war', 'assets', 'sprites', 'equipment', item.filename);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);

            console.log(`✅ Regenerated ${item.filename} (${actualSize})`);
            regeneratedCount++;

        } catch (error) {
            console.error(`❌ Failed to regenerate ${item.itemId}:`, error.message);
        }
    }

    console.log(`\n🎉 Regenerated ${regeneratedCount} equipment sprites from 64x64 to 128x128!`);
    console.log('All equipment now has consistent 128x128 sizing for proper scaling on 256x256 heroes.');
}

// Run the regeneration
regenerateEquipment().catch(console.error);
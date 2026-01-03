/**
 * Force Hero Texture Regeneration Utility
 * Removes all cached hero textures to force regeneration with new Dragumagu style
 */

import { Logger } from './logger.js';
import { RuntimePaladinGenerator } from '../generators/runtime-paladin-generator.js';
import { getClassColor } from './ui-system.js';

/**
 * Force regenerate all hero textures with new Dragumagu style
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @param {Object} partyManager - Party manager instance
 * @param {Object} equipmentManager - Equipment manager instance
 */
export function forceRegenerateAllHeroTextures(scene, partyManager, equipmentManager) {
    if (!scene || !partyManager) {
        Logger.warn('forceRegenerateAllHeroTextures', 'Missing required managers');
        return;
    }

    const heroes = partyManager.getHeroes();
    const itemsData = scene.cache.json.get('items') || {};
    
    Logger.info('forceRegenerateAllHeroTextures', `Regenerating ${heroes.length} hero textures with Dragumagu style`);

    heroes.forEach(hero => {
        const classId = hero.classId || 'paladin';
        const classColor = getClassColor(classId);
        const textureKey = `${classId}_dynamic_${hero.id}`;

        // Remove existing texture
        if (scene.textures.exists(textureKey)) {
            try {
                scene.textures.remove(textureKey);
                Logger.debug('forceRegenerateAllHeroTextures', `Removed texture: ${textureKey}`);
            } catch (e) {
                Logger.warn('forceRegenerateAllHeroTextures', `Could not remove texture ${textureKey}: ${e.message}`);
            }
        }

        // Generate new texture with Dragumagu style
        const generator = new RuntimePaladinGenerator(scene);
        const equipment = equipmentManager?.getHeroEquipment(hero.id) || {};
        
        generator.generate(equipment, itemsData, classColor, classId, textureKey);
        
        // Update sprite if it exists
        if (hero.sprite && !hero.sprite.destroyed) {
            // Wait a bit for texture to be ready, then update
            scene.time.delayedCall(100, () => {
                if (scene.textures.exists(textureKey) && hero.sprite && !hero.sprite.destroyed) {
                    hero.sprite.setTexture(textureKey);
                    Logger.debug('forceRegenerateAllHeroTextures', `Updated sprite for ${hero.id}`);
                }
            });
        }
    });

    Logger.info('forceRegenerateAllHeroTextures', 'Hero texture regeneration complete');
}

/**
 * Force regenerate a single hero texture
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @param {Object} hero - Hero object
 * @param {Object} equipmentManager - Equipment manager instance
 */
export function forceRegenerateHeroTexture(scene, hero, equipmentManager) {
    if (!scene || !hero) {
        Logger.warn('forceRegenerateHeroTexture', 'Missing scene or hero');
        return;
    }

    const classId = hero.classId || 'paladin';
    const classColor = getClassColor(classId);
    const textureKey = `${classId}_dynamic_${hero.id}`;
    const itemsData = scene.cache.json.get('items') || {};

    // Remove existing texture
    if (scene.textures.exists(textureKey)) {
        try {
            scene.textures.remove(textureKey);
            Logger.debug('forceRegenerateHeroTexture', `Removed texture: ${textureKey}`);
        } catch (e) {
            Logger.warn('forceRegenerateHeroTexture', `Could not remove texture ${textureKey}: ${e.message}`);
        }
    }

    // Generate new texture with Dragumagu style
    const generator = new RuntimePaladinGenerator(scene);
    const equipment = equipmentManager?.getHeroEquipment(hero.id) || {};
    
    generator.generate(equipment, itemsData, classColor, classId, textureKey);
    
    // Update sprite if it exists
    if (hero.sprite && !hero.sprite.destroyed) {
        scene.time.delayedCall(100, () => {
            if (scene.textures.exists(textureKey) && hero.sprite && !hero.sprite.destroyed) {
                hero.sprite.setTexture(textureKey);
                Logger.debug('forceRegenerateHeroTexture', `Updated sprite for ${hero.id}`);
            }
        });
    }
}


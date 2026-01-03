/**
 * Hero Texture Regeneration Script
 * Run this in the browser console to regenerate all hero textures
 */

// Usage: Copy and paste this into browser console when game is running

if (typeof window !== 'undefined' && window.gameScene) {
    const scene = window.gameScene;
    const partyManager = scene.partyManager;
    const equipmentManager = scene.equipmentManager;
    
    if (partyManager && equipmentManager) {
        console.log('Regenerating hero textures with new detailed mage style...');
        
        // Import and use the regeneration utility
        import('../src/utils/force-hero-regeneration.js').then(({ forceRegenerateAllHeroTextures }) => {
            forceRegenerateAllHeroTextures(scene, partyManager, equipmentManager);
            console.log('Hero texture regeneration complete!');
        }).catch(err => {
            console.error('Error regenerating heroes:', err);
        });
    } else {
        console.error('PartyManager or EquipmentManager not found. Make sure the game is fully loaded.');
    }
} else {
    console.log('Game scene not found. Make sure the game is running.');
    console.log('Alternative: Use window.forceRegenerateAllHeroTextures(scene, partyManager, equipmentManager)');
}


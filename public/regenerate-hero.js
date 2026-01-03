/**
 * Hero Regeneration Tool
 * Regenerates all hero sprites using the current RuntimePaladinGenerator settings
 * Run this in the browser console while the game is running at localhost:3000
 */

(function() {
    'use strict';
    
    // Helper to get GameScene - returns null if not ready (no errors)
    function getGameScene() {
        if (!window.gameScene || !window.gameScene.animationManager) {
            return null;
        }
        return window.gameScene;
    }

    // Create global regenerator (lazy-initialized)
    // Methods will check for GameScene when called

    // Create global regenerator
    window.regenerateHero = {
        /**
         * Regenerate a single hero sprite
         * @param {string} heroId - Hero ID (e.g., 'hero_0', 'hero_1')
         */
        regenerateHero: async function(heroId) {
            const scene = getGameScene();
            if (!scene) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            
            if (!scene.partyMemberSprites || scene.partyMemberSprites.length === 0) {
                console.error('❌ No party members found');
                return;
            }

            const partyMember = scene.partyMemberSprites.find(pm => pm.hero?.id === heroId);
            if (!partyMember) {
                console.error(`❌ Hero ${heroId} not found`);
                return;
            }

            const hero = partyMember.hero;
            const sprite = partyMember.sprite;
            const classId = hero.classId || 'paladin';
            const classColor = window.getClassColor ? window.getClassColor(classId) : 0x4a90e2;
            const textureKey = 'paladin_dynamic_party';

            console.group(`🔄 Regenerating Hero: ${heroId}`);
            console.log('Class:', classId);
            console.log('Texture Key:', textureKey);

            try {
                // Remove existing texture to force regeneration
                if (scene.textures.exists(textureKey)) {
                    scene.textures.remove(textureKey);
                    console.log('✅ Removed existing texture');
                }

                // Generate new texture using RuntimePaladinGenerator
                if (!window.RuntimePaladinGenerator) {
                    throw new Error('RuntimePaladinGenerator not available. Make sure game is fully loaded.');
                }
                const generator = new window.RuntimePaladinGenerator(scene);
                const equipment = scene.equipmentManager?.getHeroEquipment(hero.id) || {};
                const itemsData = scene.cache?.json?.get('items') || {};
                
                const generatedKey = generator.generate(equipment, itemsData, classColor, textureKey);
                console.log('✅ Texture generated:', generatedKey);

                // Wait for texture to be ready
                const waitForTexture = (key, maxRetries = 20) => {
                    return new Promise((resolve, reject) => {
                        let retries = 0;
                        const check = () => {
                            if (scene.textures.exists(key)) {
                                const texture = scene.textures.get(key);
                                if (texture && texture.source && texture.source.length > 0) {
                                    resolve(texture);
                                } else if (retries < maxRetries) {
                                    retries++;
                                    setTimeout(check, 100);
                                } else {
                                    reject(new Error(`Texture ${key} not ready after ${maxRetries} retries`));
                                }
                            } else if (retries < maxRetries) {
                                retries++;
                                setTimeout(check, 100);
                            } else {
                                reject(new Error(`Texture ${key} does not exist`));
                            }
                        };
                        check();
                    });
                };

                await waitForTexture(generatedKey);
                console.log('✅ Texture ready');

                // Update sprite texture
                if (sprite && !sprite.destroyed) {
                    sprite.setTexture(generatedKey);
                    console.log('✅ Sprite texture updated');

                    // Reinitialize animations
                    const animMgr = scene.animationManager;
                    console.log('Reinitializing animations...');
                    await animMgr.initializeAnimations(classId, hero.id);
                    console.log('✅ Animations reinitialized');

                    // Play idle animation
                    const idleKey = animMgr.getAnimationKey(classId, hero.id, 'idle');
                    if (scene.anims.exists(idleKey) && sprite.anims) {
                        sprite.play(idleKey);
                        console.log('✅ Playing idle animation');
                    }
                }

                console.groupEnd();
                return { success: true, heroId, textureKey: generatedKey };
            } catch (error) {
                console.error('❌ Error regenerating hero:', error);
                console.groupEnd();
                throw error;
            }
        },

        /**
         * Regenerate all hero sprites
         */
        regenerateAll: async function() {
            const scene = getGameScene();
            if (!scene) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            
            if (!scene.partyMemberSprites || scene.partyMemberSprites.length === 0) {
                console.error('❌ No party members found');
                return;
            }

            console.group('🔄 Regenerating All Heroes');
            const results = [];

            for (const partyMember of scene.partyMemberSprites) {
                if (partyMember.hero && partyMember.hero.id) {
                    try {
                        const result = await this.regenerateHero(partyMember.hero.id);
                        results.push(result);
                        // Small delay between regenerations
                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch (error) {
                        console.error(`❌ Failed to regenerate ${partyMember.hero.id}:`, error);
                        results.push({ success: false, heroId: partyMember.hero.id, error: error.message });
                    }
                }
            }

            console.log('✅ Regeneration complete');
            console.table(results);
            console.groupEnd();
            return results;
        },

        /**
         * Regenerate base texture only (affects all heroes using shared texture)
         */
        regenerateBaseTexture: async function() {
            const scene = getGameScene();
            if (!scene) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            
            const textureKey = 'paladin_dynamic_party';
            const classId = 'paladin';
            const classColor = window.getClassColor ? window.getClassColor(classId) : 0x4a90e2;

            console.group('🔄 Regenerating Base Texture');
            console.log('Texture Key:', textureKey);

            try {
                // Remove existing texture
                if (scene.textures.exists(textureKey)) {
                    scene.textures.remove(textureKey);
                    console.log('✅ Removed existing texture');
                }

                // Generate new texture
                if (!window.RuntimePaladinGenerator) {
                    throw new Error('RuntimePaladinGenerator not available. Make sure game is fully loaded.');
                }
                const generator = new window.RuntimePaladinGenerator(scene);
                const equipment = {};
                const itemsData = scene.cache?.json?.get('items') || {};
                
                const generatedKey = generator.generate(equipment, itemsData, classColor, textureKey);
                console.log('✅ Texture generated:', generatedKey);

                // Wait for texture
                const waitForTexture = (key, maxRetries = 20) => {
                    return new Promise((resolve, reject) => {
                        let retries = 0;
                        const check = () => {
                            if (scene.textures.exists(key)) {
                                const texture = scene.textures.get(key);
                                if (texture && texture.source && texture.source.length > 0) {
                                    resolve(texture);
                                } else if (retries < maxRetries) {
                                    retries++;
                                    setTimeout(check, 100);
                                } else {
                                    reject(new Error(`Texture not ready after ${maxRetries} retries`));
                                }
                            } else if (retries < maxRetries) {
                                retries++;
                                setTimeout(check, 100);
                            } else {
                                reject(new Error(`Texture does not exist`));
                            }
                        };
                        check();
                    });
                };

                await waitForTexture(generatedKey);
                console.log('✅ Texture ready');

                // Update all sprites using this texture
                if (scene.partyMemberSprites) {
                    let updatedCount = 0;
                    for (const partyMember of scene.partyMemberSprites) {
                        if (partyMember.sprite && !partyMember.sprite.destroyed) {
                            partyMember.sprite.setTexture(generatedKey);
                            updatedCount++;
                        }
                    }
                    console.log(`✅ Updated ${updatedCount} sprites`);
                }

                console.groupEnd();
                return { success: true, textureKey: generatedKey };
            } catch (error) {
                console.error('❌ Error regenerating base texture:', error);
                console.groupEnd();
                throw error;
            }
        },

        /**
         * Export texture as PNG file (downloads to browser)
         */
        exportTexture: function(textureKey = 'paladin_dynamic_party') {
            const scene = getGameScene();
            if (!scene) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            
            if (!scene.textures.exists(textureKey)) {
                console.error(`❌ Texture ${textureKey} not found`);
                return;
            }

            const texture = scene.textures.get(textureKey);
            if (!texture || !texture.source || texture.source.length === 0) {
                console.error(`❌ Texture ${textureKey} has no source data`);
                return;
            }

            try {
                // Get the canvas from the texture
                const source = texture.source[0];
                const canvas = source.image || source.canvas;
                
                if (!canvas) {
                    console.error(`❌ Could not get canvas from texture ${textureKey}`);
                    return;
                }

                // Convert canvas to blob and download
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${textureKey}-${Date.now()}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    console.log(`✅ Exported ${textureKey} as PNG`);
                }, 'image/png');
            } catch (error) {
                console.error(`❌ Error exporting texture:`, error);
            }
        },

        /**
         * Help
         */
        help: function() {
            console.log(`
%c🔄 Hero Regenerator Commands%c

%cRegenerate Single Hero: %c
  regenerateHero.regenerateHero('hero_0')     - Regenerate specific hero

%cRegenerate All Heroes: %c
  regenerateHero.regenerateAll()               - Regenerate all party heroes

%cRegenerate Base Texture: %c
  regenerateHero.regenerateBaseTexture()      - Regenerate shared base texture (affects all heroes)

%cExport: %c
  regenerateHero.exportTexture()              - Export current texture as PNG file

%cExamples: %c
  regenerateHero.regenerateBaseTexture()      - Quick regeneration for all heroes
  regenerateHero.regenerateAll()              - Full regeneration with animations
  regenerateHero.regenerateHero('hero_2')    - Regenerate specific hero
  regenerateHero.exportTexture()              - Save texture as PNG file
            `, 
            'color: #4CAF50; font-weight: bold; font-size: 16px',
            '',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0'
            );
        }
    };

    // Only show loaded message if GameScene is ready, otherwise wait silently
    if (getGameScene()) {
        console.log('%c✅ Hero Regenerator Loaded!', 'color: #4CAF50; font-weight: bold; font-size: 16px');
        console.log('%cType regenerateHero.help() for commands', 'color: #bbb; font-size: 12px');
        regenerateHero.help();
    } else {
        // Silently loaded - will work once GameScene is ready
        console.log('%c✅ Hero Regenerator Ready (waiting for GameScene)', 'color: #888; font-size: 12px');
    }
})();


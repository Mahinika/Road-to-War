/**
 * Animation Migration Utility
 * Handles migration from old animations to new joint-based animations
 */
export class AnimationMigration {
    constructor(scene, animationManager) {
        this.scene = scene;
        this.animationManager = animationManager;
    }

    /**
     * Get all sprites currently using a specific animation
     * @param {string} animKey - Animation key
     * @returns {Array} Array of sprites using the animation
     */
    getSpritesUsingAnimation(animKey) {
        const sprites = [];
        // Search through all game objects in the scene
        this.scene.children.list.forEach(child => {
            if (child.anims && child.anims.currentAnim && child.anims.currentAnim.key === animKey) {
                sprites.push(child);
            }
        });
        return sprites;
    }

    /**
     * Get old animation keys for a character type
     * @param {string} characterType - Character type (paladin, hero, etc.)
     * @param {string} characterId - Character ID
     * @returns {Array} Array of old animation keys
     */
    getOldAnimationKeys(characterType, characterId) {
        const oldKeys = [];
        const allAnims = this.scene.anims.anims.entries;
        
        for (const [key, anim] of Object.entries(allAnims)) {
            // Check if animation matches character type/ID pattern
            if (key.startsWith(`${characterType}-`) || key.startsWith(`${characterId}-`)) {
                // Check if it uses old frame textures (not from runtime sprite)
                const firstFrame = anim.frames?.[0];
                const frameKey = firstFrame?.textureKey || firstFrame?.key;
                if (frameKey && !frameKey.includes('paladin_dynamic_party')) {
                    oldKeys.push(key);
                }
            }
        }
        
        return oldKeys;
    }

    /**
     * Generate new animation key
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} animName - Animation name
     * @returns {string} New animation key
     */
    getNewAnimationKey(characterType, characterId, animName) {
        // Use versioned key for new animations
        return `${characterType}-${characterId}-${animName}-v2`;
    }

    /**
     * Cleanup old textures
     * @param {string} characterType - Character type
     */
    cleanupOldTextures(characterType) {
        const texturesToRemove = [];
        
        // Find old texture keys
        this.scene.textures.list.forEach((texture, key) => {
            // Remove old animation frame textures that don't use the new system
            if (key.includes(`${characterType}-`) && 
                !key.includes('paladin_dynamic_party') && 
                !key.includes('_v2_')) {
                texturesToRemove.push(key);
            }
        });
        
        // Remove textures
        texturesToRemove.forEach(key => {
            try {
                this.scene.textures.remove(key);
            } catch (error) {
                // Ignore errors for textures that might be in use
                console.warn(`[AnimationMigration] Could not remove texture ${key}:`, error);
            }
        });
    }

    /**
     * Migrate animations for a character
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {Array} animationNames - Animation names to migrate
     * @returns {Promise<void>}
     */
    async migrateAnimations(characterType, characterId, animationNames = ['idle', 'walk', 'attack', 'defend', 'heal', 'death']) {
        const oldAnimKeys = this.getOldAnimationKeys(characterType, characterId);
        
        for (const oldKey of oldAnimKeys) {
            // Extract animation name from old key
            const animNameMatch = oldKey.match(/-([^-]+)$/);
            const animName = animNameMatch ? animNameMatch[1] : oldKey.split('-').pop();
            
            if (!animationNames.includes(animName)) {
                continue; // Skip if not in the list to migrate
            }
            
            // Save state if sprite is using this animation
            const spritesUsingAnim = this.getSpritesUsingAnimation(oldKey);
            const savedStates = spritesUsingAnim.map(sprite => ({
                sprite,
                currentFrame: sprite.anims.currentFrame?.index || 0,
                progress: sprite.anims.currentAnim?.progress || 0,
                isPlaying: sprite.anims.isPlaying
            }));
            
            // Remove old animation (Context7: this.scene.anims.remove(key))
            if (this.scene.anims.exists(oldKey)) {
                this.scene.anims.remove(oldKey);
            }
            
            // Generate new animation frames with joint system
            // This will be handled by AnimationManager.initializeAnimations
            // which will use the new joint system automatically
            
            // Restore sprite states to new animation
            const newKey = this.getNewAnimationKey(characterType, characterId, animName);
            if (this.scene.anims.exists(newKey)) {
                savedStates.forEach(({ sprite, currentFrame, progress, isPlaying }) => {
                    if (isPlaying) {
                        sprite.play(newKey);
                        // Try to restore frame position if possible
                        if (currentFrame > 0 && sprite.anims.currentAnim) {
                            const targetFrame = sprite.anims.currentAnim.frames[currentFrame];
                            if (targetFrame) {
                                sprite.anims.setCurrentFrame(targetFrame);
                            }
                        }
                    }
                });
            }
        }
        
        // Cleanup old textures
        this.cleanupOldTextures(characterType);
    }
}


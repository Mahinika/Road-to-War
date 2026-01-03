/**
 * Texture Helper Utilities
 * Helper functions for managing Phaser textures, especially generated textures
 * that need to wait for WebGL upload
 */

/**
 * Check if a texture exists in the cache
 * Simplified check - just verify texture is in cache
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {string} textureKey - The texture key to check
 * @returns {boolean} - True if texture exists, false otherwise
 */
export function textureExists(scene, textureKey) {
    try {
        return scene.textures.exists(textureKey);
    } catch (error) {
        return false;
    }
}

/**
 * Wait for texture to be ready by waiting for render frames
 * Uses a retry mechanism with max attempts to avoid infinite recursion
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {string} textureKey - The texture key to wait for
 * @param {Function} callback - Callback to execute when texture should be ready
 * @param {number} frameCount - Number of render frames to wait (default: 3)
 * @param {number} maxRetries - Maximum number of retries if texture doesn't exist (default: 5)
 * @param {number} retryCount - Current retry count (internal use)
 */
export function waitForTextureReady(scene, textureKey, callback, frameCount = 3, maxRetries = 5, retryCount = 0) {
    // Check if texture exists in cache
    const exists = textureExists(scene, textureKey);
    
    if (!exists) {
        // Texture not in cache yet - retry with exponential backoff
        if (retryCount < maxRetries) {
            const delay = Math.min(16 * (retryCount + 1), 100); // 16ms, 32ms, 48ms, 64ms, 80ms
            scene.time.delayedCall(delay, () => {
                waitForTextureReady(scene, textureKey, callback, frameCount, maxRetries, retryCount + 1);
            });
            return;
        } else {
            // Max retries reached - texture generation likely failed
            callback();
            return;
        }
    }
    
    // Texture exists in cache - wait for GPU upload
    // Use a simpler approach: call callback after a short delay instead of waiting for postupdate events
    // postupdate events may not fire reliably, especially if scene is paused or not updating
    // Call callback after a delay (frameCount * 16ms per frame) to ensure GPU upload
    // This is more reliable than waiting for postupdate events
    const totalDelay = frameCount * 16; // 3 frames * 16ms = 48ms default
    scene.time.delayedCall(totalDelay, () => {
        callback();
    });
}

/**
 * Generate texture and wait for it to be ready
 * This is a wrapper around generateTexture that ensures the texture is ready
 * @param {Phaser.GameObjects.Graphics} graphics - The graphics object
 * @param {string} textureKey - The texture key
 * @param {number} width - Texture width
 * @param {number} height - Texture height
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Function} callback - Callback when texture is ready (receives textureKey)
 */
export function generateTextureAndWait(graphics, textureKey, width, height, scene, callback) {
    // Remove existing texture if it exists
    if (scene.textures.exists(textureKey)) {
        scene.textures.remove(textureKey);
    }
    
    // Generate the texture
    graphics.generateTexture(textureKey, width, height);
    
    // Destroy graphics after a frame (let Phaser process the texture first)
    scene.time.delayedCall(0, () => {
        if (graphics && graphics.destroy) {
            graphics.destroy();
        }
    });
    
    // Wait for texture to be ready
    waitForTextureReady(scene, textureKey, () => {
        callback(textureKey);
    });
}


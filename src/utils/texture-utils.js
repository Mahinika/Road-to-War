/**
 * Texture Utilities
 * Simplified async/await helpers for texture operations
 */

import { getTextureSettings } from '../config/animation-config.js';
import { Logger } from './logger.js';

/**
 * Wait for texture to be available with async/await
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {string} textureKey - Texture key to wait for
 * @param {number} maxWait - Maximum wait time in ms (optional, uses config default)
 * @returns {Promise<boolean>} True if texture exists
 */
export async function waitForTexture(scene, textureKey, maxWait = null) {
    const config = getTextureSettings(scene);
    const timeout = maxWait || config.waitTimeout || 2000;
    const pollInterval = config.pollInterval || 50;
    const start = Date.now();

    while (!scene.textures.exists(textureKey) && (Date.now() - start) < timeout) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    const exists = scene.textures.exists(textureKey);
    if (!exists) {
        Logger.debug('TextureUtils', `Texture ${textureKey} not available after ${Date.now() - start}ms`);
    }
    return exists;
}

/**
 * Wait for multiple textures to be available
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {Array<string>} textureKeys - Array of texture keys
 * @param {number} maxWait - Maximum wait time in ms
 * @returns {Promise<Array<boolean>>} Array of booleans indicating which textures exist
 */
export async function waitForTextures(scene, textureKeys, maxWait = null) {
    const results = await Promise.all(
        textureKeys.map(key => waitForTexture(scene, key, maxWait))
    );
    return results;
}

/**
 * Validate texture is ready for use in animations
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {string} textureKey - Texture key to validate
 * @returns {Promise<boolean>} True if texture is valid
 */
export async function validateTextureReady(scene, textureKey) {
    // First wait for texture to exist
    const exists = await waitForTexture(scene, textureKey);
    if (!exists) {
        return false;
    }

    // Check texture has source
    const texture = scene.textures.get(textureKey);
    if (!texture || !texture.source || texture.source.length === 0) {
        return false;
    }

    // For RenderTextures, Phaser creates frames lazily
    // We can't reliably check sourceSize before Phaser processes it
    // Just verify texture exists and has source - Phaser will handle the rest
    return true;
}

/**
 * Validate all frames in an array are ready
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {Array<Object>} frames - Array of frame objects with 'key' property
 * @param {number} maxWait - Maximum wait time per texture
 * @returns {Promise<Array<Object>>} Array of valid frames
 */
export async function validateFramesReady(scene, frames, maxWait = null) {
    const validFrames = [];

    for (const frame of frames) {
        const frameKey = frame?.key;
        if (!frameKey) {
            continue;
        }

        const isValid = await validateTextureReady(scene, frameKey);
        if (isValid) {
            validFrames.push(frame);
        } else {
            Logger.debug('TextureUtils', `Frame ${frameKey} not ready, skipping`);
        }
    }

    return validFrames;
}

/**
 * Create animation with retry logic (simplified)
 * @param {Phaser.Scene} scene - Phaser scene
 * @param {Function} createFn - Function that creates the animation (returns boolean)
 * @param {string} animKey - Animation key for logging
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<boolean>} True if animation was created successfully
 */
export async function createAnimationWithRetry(scene, createFn, animKey, maxRetries = 5, retryDelay = 100) {
    const config = getTextureSettings(scene);
    const maxRetriesConfig = config.maxRetries || 5;
    const retryDelayConfig = config.retryDelay || 100;
    
    const effectiveMaxRetries = maxRetries || maxRetriesConfig;
    const effectiveRetryDelay = retryDelay || retryDelayConfig;

    for (let attempt = 0; attempt < effectiveMaxRetries; attempt++) {
        try {
            const success = createFn();
            if (success) {
                if (attempt > 0) {
                    Logger.debug('TextureUtils', `Animation ${animKey} created on attempt ${attempt + 1}`);
                }
                return true;
            }
        } catch (error) {
            // Check if error is related to texture not being ready
            const isTextureError = error.message && (
                error.message.includes('sourceSize') ||
                error.message.includes('glTexture') ||
                error.message.includes('Cannot read properties of null')
            );

            if (isTextureError && attempt < effectiveMaxRetries - 1) {
                Logger.debug('TextureUtils', `Animation ${animKey} creation failed (texture not ready), retrying... (${attempt + 1}/${effectiveMaxRetries})`);
                await new Promise(resolve => setTimeout(resolve, effectiveRetryDelay));
                continue;
            } else {
                Logger.error('TextureUtils', `Animation ${animKey} creation failed: ${error.message}`);
                throw error;
            }
        }

        // If createFn returned false but didn't throw, wait and retry
        if (attempt < effectiveMaxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, effectiveRetryDelay));
        }
    }

    // Suppress warning - creation failures are handled by AnimationManager (caching, retries, etc.)
    // Use debug instead to avoid console spam
    Logger.debug('TextureUtils', `Animation ${animKey} creation failed after ${effectiveMaxRetries} attempts (handled)`);
    return false;
}


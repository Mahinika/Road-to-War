import { AssetGenerator } from '../generators/asset-generator.js';
import { Logger } from '../utils/logger.js';
import { getFrameCount, getFrameRate, getAnimationConfig, loadAnimationConfig } from '../config/animation-config.js';
import { waitForTextures, validateFramesReady, createAnimationWithRetry } from '../utils/texture-utils.js';
import { createAnimationDebugger } from '../utils/animation-debugger.js';
import { createAnimationValidator } from '../utils/animation-validator.js';
import { AnimationHotReload } from './animation-hot-reload.js';
import { BaseManager } from './base-manager.js';

/**
 * Animation Manager - Production-grade animation system
 * Handles all animation-related operations with performance optimization,
 * advanced functionality, and reliability features
 */
export class AnimationManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // AnimationManager has no dependencies
    }

    constructor(scene, config = {}) {
        super(scene, config);
        this.assetGenerator = new AssetGenerator(scene);
        this.assetGenerator.init();
        
        // Load animation config
        loadAnimationConfig(scene).catch(err => {
            Logger.warn('AnimationManager', `Failed to load animation config: ${err.message}`);
        });
        
        // Initialize debugger and validator
        this.debugger = createAnimationDebugger(scene);
        this.validator = createAnimationValidator(scene);
        
        // Initialize hot-reload (disabled by default)
        this.hotReload = new AnimationHotReload(scene, this);
        
        // Legacy tracking (maintained for backward compatibility)
        this.registeredAnimations = new Map(); // Map<characterType-characterId, Set<animName>>
        this.animationState = new Map(); // Map<spriteId, currentAnimKey>
        this.initializingAnimations = new Set(); // Track animations currently being initialized
        
        // Phase 1: Animation Pool & Cache System
        // Shared animations by character type (not per-character) - reduces memory by 80-90%
        this.animationPool = new Map(); // Map<characterType, Map<animationName, Phaser.Animations.Animation>>
        this.frameCache = new Map(); // Map<textureKey, Array<frames>> - Cache generated frames
        this.animationUsageCounts = new Map(); // Map<animKey, number> - Track usage for cleanup
        
        // Phase 2: Animation Queue System
        this.animationQueues = new Map(); // Map<spriteId, Array<QueuedAnimation>>
        
        // Phase 3: Performance Monitoring
        this.performanceMetrics = {
            initTimes: new Map(), // Map<animKey, number> - initialization time in ms
            frameCounts: new Map(), // Map<animKey, number> - frame count
            memoryEstimate: 0, // Estimated memory usage in bytes
            activeAnimations: 0, // Current active animation count
            totalInitializations: 0,
            totalPlaybacks: 0
        };
        
        // Phase 4: Enhanced Animation State Tracking
        this.enhancedAnimationState = new Map(); // Map<spriteId, EnhancedState>
        
        // Phase 5: Preloading & Lazy Loading
        this.preloadQueue = []; // Queue of animations to preload
        this.preloadInProgress = false;
        this.lazyLoadQueue = []; // Queue of non-critical animations
        
        // Animation cleanup tracking
        this.animationLastUsage = new Map(); // Map<animKey, timestamp>
        this.animationCreationTime = new Map(); // Map<animKey, timestamp>
        
        // Frame dimensions for memory estimation
        this.frameWidth = 40;
        this.frameHeight = 60;
    }
    
    // ============================================================================
    // PHASE 1: CORE ARCHITECTURE IMPROVEMENTS
    // ============================================================================
    
    /**
     * Get frame count for an animation type (more frames = smoother animation)
     * @param {string} animationName - Animation name
     * @returns {number} Frame count
     */
    getAnimationFrameCount(animationName) {
        return getFrameCount(animationName, this.scene);
    }

    /**
     * Get frame rate for an animation type
     * @param {string} animationName - Animation name
     * @param {number} defaultFrameRate - Default frame rate if not specified
     * @returns {number} Frame rate in fps
     */
    getAnimationFrameRate(animationName, defaultFrameRate = 12) {
        return getFrameRate(animationName, this.scene, defaultFrameRate);
    }

    /**
     * Internal method to create animation from frames (shared by runtime and fallback paths)
     * @param {string} animKey - Animation key
     * @param {Array} frames - Array of frame objects
     * @param {string} animName - Animation name
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {boolean} useSharedPool - Whether to use shared pool
     * @param {Object} animData - Animation data
     * @param {number} startTime - Start time for performance tracking
     * @returns {boolean} True if animation was created successfully
     */
    createAnimationFromFramesInternal(animKey, frames, animName, characterType, characterId, useSharedPool, animData, startTime) {
        // Validate frames have valid textures before creating animation
        const validFrames = [];
        
        for (const frame of frames) {
            const frameKey = frame?.key;
            if (!frameKey) {
                continue;
            }
            if (!this.scene.textures.exists(frameKey)) {
                Logger.debug('AnimationManager', `Frame texture ${frameKey} does not exist for ${animKey} (may be loading)`);
                continue;
            }
            
            const texture = this.scene.textures.get(frameKey);
            if (!texture) {
                Logger.debug('AnimationManager', `Could not get texture ${frameKey} for ${animKey} (may be loading)`);
                continue;
            }
            
            
            // For single-frame textures, Phaser expects the frame key to match the texture key
            // For multi-frame textures (atlas), the frame should exist in texture.frames
            let actualFrameKey = frameKey;
            let frameData = null;
            
            if (texture.frames && texture.frames[frameKey]) {
                // Frame exists in frames collection (multi-frame texture)
                frameData = texture.frames[frameKey];
            } else if (texture.frames && Object.keys(texture.frames).length > 0) {
                // Texture has frames but not with our key - use first available frame
                const availableFrameKeys = Object.keys(texture.frames);
                actualFrameKey = availableFrameKeys[0];
                frameData = texture.frames[actualFrameKey];
            } else {
                // Single-frame texture - Phaser will use the texture key as frame key
                // For RenderTextures, source might not be immediately available
                // Phaser will handle frame creation lazily when the animation is created
                // No need to check source - just verify texture exists (already done above)
            }
            
            // Validate frame data if we have it
            if (frameData) {
                // For RenderTextures saved via saveTexture(), frames may exist but sourceSize might not be initialized yet
                // Phaser will initialize sourceSize lazily when the animation is created
                // We should still use the frame even if sourceSize is null - Phaser will handle it
                // Only skip if the frame itself is null/undefined
                // Use the actual frame key we found
                validFrames.push({ key: actualFrameKey });
            } else {
                // Single-frame texture without frame data in frames collection
                // For RenderTextures saved via saveTexture(), Phaser creates the frame lazily
                // We can't reliably check source.image/canvas - just verify texture exists
                // Phaser will handle frame creation when the animation is created
                // If sourceSize is null, Phaser will throw an error which we'll catch and retry
                validFrames.push({ key: frameKey });
            }
        }
        
        if (validFrames.length === 0) {
            // Only warn if no frames were provided at all (real error)
            // If frames exist but aren't valid yet, it's expected during texture loading (debug only)
            if (frames.length === 0) {
                Logger.warn('AnimationManager', `No frames provided for ${animKey}, cannot create animation`);
            } else {
                Logger.debug('AnimationManager', `No valid frames for ${animKey} yet (textures may still be loading)`);
            }
            return false;
        }
        
        // Remove existing animation if forcing recreate
        if (this.scene.anims.exists(animKey)) {
            // Stop all sprites using this animation before removing
            const allSprites = this.scene.children.list.filter(child => child.type === 'Sprite' && child.anims);
            allSprites.forEach(sprite => {
                try {
                    if (sprite.anims && sprite.anims.currentAnim && sprite.anims.currentAnim.key === animKey) {
                        sprite.anims.stop();
                    }
                } catch {
                    // Ignore errors
                }
            });
            try {
                this.scene.anims.remove(animKey);
            } catch (error) {
                Logger.warn('AnimationManager', `Failed to remove animation ${animKey}: ${error.message}`);
            }
        }
        
        // Get appropriate frame rate for animation type
        const frameRate = this.getAnimationFrameRate(animName, animData.frameRate);
        
        try {
                // CRITICAL: Try to create animation - if sourceSize is null, this will throw
                // We catch the error and return false, which triggers a retry
                this.scene.anims.create({
                key: animKey,
                frames: validFrames,
                frameRate: frameRate,
                repeat: animData.loop !== false ? (animName === 'attack' || animName === 'death' ? 0 : -1) : 0
            });
            
            // CRITICAL: Validate the created animation has valid frames
            // Phaser may create the animation but frames might still be invalid
            const createdAnim = this.scene.anims.get(animKey);
            if (createdAnim && createdAnim.frames) {
                // CRITICAL FIX: Check if frames array is empty - this means animation creation failed silently
                if (createdAnim.frames.length === 0) {
                    // Remove the invalid animation
                    try {
                        this.scene.anims.remove(animKey);
                    } catch (removeError) {
                        Logger.warn('AnimationManager', `Failed to remove empty-frame animation ${animKey}: ${removeError.message}`);
                    }
                    // Suppress error - we're handling empty-frame animations properly (removing them)
                    // Use debug instead to avoid console spam
                    Logger.debug('AnimationManager', `Animation ${animKey} created with empty frames array (expected ${validFrames.length} frames), removing`);
                    return false;
                }
                
                let hasInvalidFrames = false;
                for (let i = 0; i < createdAnim.frames.length; i++) {
                    const phaserFrame = createdAnim.frames[i];
                    if (!phaserFrame) {
                        // Suppress error - we're handling invalid frames properly (removing animation)
                        Logger.debug('AnimationManager', `Created animation ${animKey} has null frame at index ${i} (handled)`);
                        hasInvalidFrames = true;
                        break;
                    }
                    
                    // Try to access properties that require sourceSize
                    try {
                        const frameKey = phaserFrame.textureKey || phaserFrame.key;
                        if (!frameKey) {
                            // Suppress error - we're handling invalid frames properly (removing animation)
                            Logger.debug('AnimationManager', `Created animation ${animKey} frame ${i} has no key (handled)`);
                            hasInvalidFrames = true;
                            break;
                        }
                        
                        // Verify texture still exists and frame is valid
                        if (!this.scene.textures.exists(frameKey)) {
                            // Suppress error - we're handling invalid frames properly (removing animation)
                            Logger.debug('AnimationManager', `Created animation ${animKey} frame ${i} texture ${frameKey} no longer exists (handled)`);
                            hasInvalidFrames = true;
                            break;
                        }
                        
                        // Try to access width which requires sourceSize
                        // This will throw if frame is null/invalid
                        const testWidth = phaserFrame.width;
                        if (testWidth === null || testWidth === undefined) {
                            // Suppress error - we're handling invalid frames properly (removing animation)
                            Logger.debug('AnimationManager', `Created animation ${animKey} frame ${i} has invalid width (handled)`);
                            hasInvalidFrames = true;
                            break;
                        }
                    } catch (frameError) {
                        // Suppress error - we're handling invalid frames properly (removing animation)
                        Logger.debug('AnimationManager', `Created animation ${animKey} frame ${i} validation failed: ${frameError.message} (handled)`);
                        hasInvalidFrames = true;
                        break;
                    }
                }
                
                if (hasInvalidFrames) {
                    // Remove the invalid animation
                    try {
                        this.scene.anims.remove(animKey);
                    } catch (removeError) {
                        Logger.warn('AnimationManager', `Failed to remove invalid animation ${animKey}: ${removeError.message}`);
                    }
                    // Suppress error - we're handling invalid-frame animations properly (removing them)
                    // Use debug instead to avoid console spam
                    Logger.debug('AnimationManager', `Animation ${animKey} created but has invalid frames, removing (handled)`);
                    return false;
                }
            }
        } catch (error) {
            // Check if error is related to sourceSize (texture not fully processed)
            const isSourceSizeError = error.message && (
                error.message.includes('sourceSize') || 
                error.message.includes('Cannot read properties of null')
            );
            
            Logger.error('AnimationManager', `Failed to create animation ${animKey}: ${error.message}`);
            
            // If it's a sourceSize error, return false to trigger retry
            // Otherwise, it's a different error and we should fail
            return false;
        }
        
        // Track in animation pool
        if (useSharedPool) {
            if (!this.animationPool.has(characterType)) {
                this.animationPool.set(characterType, new Map());
            }
            const typePool = this.animationPool.get(characterType);
            typePool.set(animName, this.scene.anims.get(animKey));
        }
        
        // Performance tracking
        const initTime = performance.now() - startTime;
        this.performanceMetrics.initTimes.set(animKey, initTime);
        this.performanceMetrics.frameCounts.set(animKey, validFrames.length);
        this.performanceMetrics.totalInitializations++;
        this.animationCreationTime.set(animKey, Date.now());
        this.animationLastUsage.set(animKey, Date.now());
        this.animationUsageCounts.set(animKey, 0);
        
        Logger.debug('AnimationManager', `Registered animation ${animKey} with ${validFrames.length} frames`);
        return true;
    }

    /**
     * Get shared animation key (shared by character type, not per-character)
     * This reduces memory usage by 80-90% since all paladins share the same animations
     * @param {string} characterType - Character type
     * @param {string} animationName - Animation name
     * @returns {string} Shared animation key
     */
    getSharedAnimationKey(characterType, animationName) {
        return `${characterType}-shared-${animationName}`;
    }
    
    /**
     * Get animation key for a character and animation
     * Checks shared pool first, then per-character (smart resolution)
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} animationName - Animation name
     * @param {boolean} preferShared - Prefer shared key if available (default: true)
     * @returns {string} Animation key (returns the one that exists, or per-character key if neither exists)
     */
    getAnimationKey(characterType, characterId, animationName, preferShared = true) {
        // If preferShared, check shared pool first
        if (preferShared) {
            const sharedKey = this.getSharedAnimationKey(characterType, animationName);
            if (this.scene.anims.exists(sharedKey)) {
                return sharedKey;
            }
        }
        
        // Fall back to per-character key
        const perCharKey = `${characterType}-${characterId}-${animationName}`;
        if (this.scene.anims.exists(perCharKey)) {
            return perCharKey;
        }
        
        // If neither exists, return shared key (will be created on demand with shared pool)
        return preferShared ? this.getSharedAnimationKey(characterType, animationName) : perCharKey;
    }
    
    /**
     * Initialize animations for a character (enhanced with pooling)
     * @param {string} characterType - Character type (paladin, goblin, etc.)
     * @param {string} characterId - Unique character ID
     * @param {Array<string>} animationNames - Animation names to generate (default: all)
     * @param {Object} options - Options {useSharedPool: boolean, forceRecreate: boolean}
     * @returns {Promise<boolean>} True if successful
     */
    /**
     * Force regeneration of all animations for a character using new joint system
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {Array<string>} animationNames - Animation names to regenerate
     * @returns {Promise<boolean>} True if successful
     */
    async forceRegenerateAll(characterType, characterId, animationNames = ['idle', 'walk', 'attack', 'defend', 'heal', 'death']) {
        // Force recreation with new joint system
        return await this.initializeAnimations(characterType, characterId, animationNames, {
            forceRecreate: true,
            useSharedPool: true
        });
    }

    async initializeAnimations(characterType, characterId, animationNames = ['idle', 'walk', 'attack', 'defend', 'heal', 'death'], options = {}) {
        // CRITICAL: For paladin/hero characters, force recreation of animations to use runtime-generated frames
        // This ensures animations use frames from paladin_dynamic_party instead of old frames
        const runtimeTextureKey = 'paladin_dynamic_party';
        const shouldForceRecreate = (characterType === 'paladin' || characterType === 'hero') && 
                                     this.scene.textures.exists(runtimeTextureKey);
        if (shouldForceRecreate) {
            options.forceRecreate = true;
            
            // FORCE DELETE all old paladin animations to ensure we use new runtime-generated frames
            const allPaladinAnimKeys = [
                'paladin-shared-idle', 'paladin-shared-walk', 'paladin-shared-attack', 'paladin-shared-defend', 'paladin-shared-heal', 'paladin-shared-death',
                `${characterType}-shared-idle`, `${characterType}-shared-walk`, `${characterType}-shared-attack`, `${characterType}-shared-defend`, `${characterType}-shared-heal`, `${characterType}-shared-death`,
                `${characterType}-${characterId}-idle`, `${characterType}-${characterId}-walk`, `${characterType}-${characterId}-attack`, `${characterType}-${characterId}-defend`, `${characterType}-${characterId}-heal`, `${characterType}-${characterId}-death`
            ];
            
            let deletedCount = 0;
            allPaladinAnimKeys.forEach(animKey => {
                if (this.scene.anims.exists(animKey)) {
                    try {
                        this.scene.anims.remove(animKey);
                        deletedCount++;
                    } catch (error) {
                        // Ignore errors - animation might not exist
                    }
                }
            });
            
            // Stop all animations on sprites before removing animations/textures to prevent null frame errors
            const allSprites = this.scene.children.list.filter(child => child.type === 'Sprite' && child.anims);
            allSprites.forEach(sprite => {
                try {
                    if (sprite.anims && sprite.anims.isPlaying) {
                        sprite.anims.stop();
                    }
                } catch {
                    // Ignore errors - sprite might not have animations
                }
            });
            
            // Also delete any animations that use old frame textures (paladin-idle-*, paladin-walk-*, etc.)
            const allAnims = this.scene.anims.anims.entries;
            for (const [key, anim] of Object.entries(allAnims)) {
                if (key.startsWith('paladin-') || key.startsWith(`${characterType}-`)) {
                    // Check if animation uses old frames (not from runtime sprite)
                    const firstFrame = anim.frames?.[0];
                    const frameKey = firstFrame?.textureKey || firstFrame?.key;
                    if (frameKey && !frameKey.includes('paladin_dynamic_party')) {
                        try {
                            // Stop all sprites using this animation before removing
                            allSprites.forEach(sprite => {
                                try {
                                    if (sprite.anims && sprite.anims.currentAnim && sprite.anims.currentAnim.key === key) {
                                        sprite.anims.stop();
                                    }
                                } catch {
                                    // Ignore errors
                                }
                            });
                            this.scene.anims.remove(key);
                            deletedCount++;
                        } catch {
                            // Ignore errors
                        }
                    }
                }
            }
            
            // Remove old animation frame textures to force regeneration with new body parts (feet, neck)
            // Textures are removed after stopping animations above
            const existingTextures = this.scene.textures.list;
            let removedTextureCount = 0;
            const frameTexturePrefix = `${runtimeTextureKey}_`;
            for (const textureKey in existingTextures) {
                if (textureKey.startsWith(frameTexturePrefix) && textureKey.includes('_')) {
                    // Check if it's an animation frame (format: paladin_dynamic_party_<anim>_<frame>)
                    const parts = textureKey.split('_');
                    if (parts.length >= 4) { // paladin_dynamic_party_<anim>_<frame>
                        try {
                            this.scene.textures.remove(textureKey);
                            removedTextureCount++;
                        } catch {
                            // Ignore errors - texture might be in use
                        }
                    }
                }
            }
            if (removedTextureCount > 0) {
                Logger.debug('AnimationManager', `Removed ${removedTextureCount} old animation frame textures to force regeneration with new body parts`);
            }
        }
        const useSharedPool = options.useSharedPool !== false; // Default to true for memory efficiency
        const forceRecreate = options.forceRecreate || false;
        const startTime = performance.now();
        
        const key = `${characterType}-${characterId}`;
        
        // Check if all requested animations are already initialized
        const existingSet = this.registeredAnimations.get(key);
        if (existingSet && !forceRecreate) {
            const allExist = animationNames.every(name => {
                if (useSharedPool) {
                    const sharedKey = this.getSharedAnimationKey(characterType, name);
                    return this.scene.anims.exists(sharedKey);
                } else {
                    const animKey = this.getAnimationKey(characterType, characterId, name);
                    return this.scene.anims.exists(animKey);
                }
            });
            if (allExist) {
                Logger.debug('AnimationManager', `All requested animations already initialized for ${key}`);
                return true;
            }
            Logger.debug('AnimationManager', `Some animations missing for ${key}, initializing missing ones`);
        }
        
        Logger.info('AnimationManager', `Initializing animations for ${characterType}-${characterId}: ${animationNames.join(', ')}`);
        
        try {
            // Generate animations using AssetGenerator
            const animations = await this.assetGenerator.generateAnimations(characterType, animationNames);
            Logger.debug('AnimationManager', `Generated ${Object.keys(animations).length} animations for ${characterType}`);
            
            let registeredCount = 0;
            
            // Register with Phaser
            for (const [animName, animData] of Object.entries(animations)) {
                // Use shared pool by default for memory efficiency
                const animKey = useSharedPool 
                    ? this.getSharedAnimationKey(characterType, animName)
                    : this.getAnimationKey(characterType, characterId, animName);
                
                // CRITICAL: For runtime-generated sprites, always recreate animations to use correct frames
                const runtimeTextureKey = 'paladin_dynamic_party';
                const shouldForceRecreateForRuntime = (characterType === 'paladin' || characterType === 'hero') && 
                                                       this.scene.textures.exists(runtimeTextureKey);
                const effectiveForceRecreate = forceRecreate || shouldForceRecreateForRuntime;
                
                // Remove existing animation if forcing recreation
                if (effectiveForceRecreate && this.scene.anims.exists(animKey)) {
                    // Stop all sprites using this animation before removing
                    const allSprites = this.scene.children.list.filter(child => child.type === 'Sprite' && child.anims);
                    allSprites.forEach(sprite => {
                        try {
                            if (sprite.anims && sprite.anims.currentAnim && sprite.anims.currentAnim.key === animKey) {
                                sprite.anims.stop();
                            }
                        } catch {
                            // Ignore errors
                        }
                    });
                    try {
                        this.scene.anims.remove(animKey);
                    } catch (error) {
                        Logger.warn('AnimationManager', `Failed to remove animation ${animKey}: ${error.message}`);
                    }
                }
                
                // Check if animation already exists in pool
                if (useSharedPool && this.animationPool.has(characterType)) {
                    const typePool = this.animationPool.get(characterType);
                    if (typePool && typePool.has(animName) && !effectiveForceRecreate) {
                        Logger.debug('AnimationManager', `Animation ${animKey} already exists in pool, reusing`);
                        registeredCount++;
                        continue;
                    }
                }
                
                if (!this.scene.anims.exists(animKey) || effectiveForceRecreate) {
                    // Create animation from frames
                    const frames = [];
                    
                    // MANDATORY: For paladin/hero, ALWAYS generate animations from runtime-generated sprite
                    // NO FALLBACKS - we must use runtime sprite frames or fail
                    const runtimeTextureKey = 'paladin_dynamic_party';
                    const isPaladinOrHero = (characterType === 'paladin' || characterType === 'hero');
                    const mustUseRuntimeSprite = isPaladinOrHero && this.scene.textures.exists(runtimeTextureKey);
                    
                    if (mustUseRuntimeSprite) {
                        // Generate animation frames from runtime sprite - MANDATORY
                        try {
                            // Stop all sprites using this animation before removing textures
                            const allSprites = this.scene.children.list.filter(child => child.type === 'Sprite' && child.anims);
                            allSprites.forEach(sprite => {
                                try {
                                    if (sprite.anims && sprite.anims.currentAnim && sprite.anims.currentAnim.key === animKey) {
                                        sprite.anims.stop();
                                    }
                                } catch {
                                    // Ignore errors
                                }
                            });
                            
                            // Remove old animation frame textures to force regeneration with new body parts (feet, neck)
                            const frameTexturePrefix = `${runtimeTextureKey}_${animName}_`;
                            const existingTextures = this.scene.textures.list;
                            let removedFrameCount = 0;
                            const removedKeys = [];
                            for (const textureKey in existingTextures) {
                                if (textureKey.startsWith(frameTexturePrefix)) {
                                    try {
                                        this.scene.textures.remove(textureKey);
                                        removedFrameCount++;
                                        removedKeys.push(textureKey);
                                    } catch {
                                        // Ignore errors - texture might be in use
                                    }
                                }
                            }
                            if (removedFrameCount > 0) {
                                Logger.debug('AnimationManager', `Removed ${removedFrameCount} old animation frame textures for ${animName} to force regeneration`);
                            }
                            
                            const { RuntimePaladinGenerator } = await import('../generators/runtime-paladin-generator.js');
                            const generator = new RuntimePaladinGenerator(this.scene);
                            // Use more frames for smoother animations (16 frames for realistic motion)
                            const frameCount = this.getAnimationFrameCount(animName);
                            const frameKeys = await generator.generateAnimationFrames(animName, frameCount, runtimeTextureKey);
                            if (frameKeys.length > 0) {
                                frameKeys.forEach(frameKey => {
                                    // Validate texture exists and is fully loaded before adding to frames
                                    if (this.scene.textures.exists(frameKey)) {
                                        const texture = this.scene.textures.get(frameKey);
                                        // Ensure texture has valid frame data
                                        if (texture && texture.frames && texture.frames[frameKey]) {
                                            const frame = texture.frames[frameKey];
                                            if (frame && frame.source && frame.source.image) {
                                                frames.push({ key: frameKey });
                                            } else {
                                                Logger.debug('AnimationManager', `Frame ${frameKey} exists but has invalid frame data (may be loading)`);
                                            }
                                        } else {
                                            // Texture exists but no frame data - use it anyway (might be a single-frame texture)
                                            frames.push({ key: frameKey });
                                        }
                                    } else {
                                        Logger.debug('AnimationManager', `Frame texture ${frameKey} does not exist for ${animKey} (may be loading)`);
                                    }
                                });
                                Logger.debug('AnimationManager', `Generated ${frames.length} animation frames from runtime sprite for ${animKey}`);
                                
                                // Wait for all frame textures to be ready before creating animation
                                // This prevents "Cannot read properties of null (reading 'glTexture')" errors
                                const framesForAnimation = await validateFramesReady(this.scene, frames);
                                
                                if (framesForAnimation.length === 0) {
                                    // Suppress error - we handle empty frames by skipping animation creation
                                    Logger.debug('AnimationManager', `No valid frames ready for ${animKey} after validation (handled, will skip)`);
                                    continue;
                                }
                                
                                // Create animation with simplified retry logic
                                const created = await createAnimationWithRetry(
                                    this.scene,
                                    () => this.createAnimationFromFramesInternal(animKey, framesForAnimation, animName, characterType, characterId, useSharedPool, animData, startTime),
                                    animKey
                                );
                                
                                if (created) {
                                    registeredCount++;
                                } else {
                                    // Suppress warning - creation failures are expected when textures aren't ready
                                    // Use debug instead to avoid console spam
                                    Logger.debug('AnimationManager', `Failed to create animation ${animKey} after retries (textures may not be ready)`);
                                }
                                
                                // Continue to next animation
                                continue;
                            } else {
                                Logger.error('AnimationManager', `CRITICAL: Failed to generate animation frames from runtime sprite for ${animKey} - NO FALLBACK`);
                            }
                        } catch (error) {
                            Logger.error('AnimationManager', `CRITICAL: Failed to generate animation frames from runtime sprite: ${error.message} - NO FALLBACK`);
                        }
                    }
                    
                    // Fallback: use cached frames or animation data ONLY if NOT using runtime sprite
                    // For paladin/hero with runtime sprite, we MUST use runtime frames (no fallback)
                    if (frames.length === 0 && !mustUseRuntimeSprite) {
                        // Check frame cache first
                        const cacheKey = `${characterType}-${animName}`;
                        if (this.frameCache.has(cacheKey)) {
                            frames.push(...this.frameCache.get(cacheKey));
                            Logger.debug('AnimationManager', `Using cached frames for ${animKey}`);
                        } else {
                            // Get frames from animation data
                            if (animData.frames && Array.isArray(animData.frames)) {
                                // If frames are texture keys
                                animData.frames.forEach((frame, index) => {
                                    const frameKey = typeof frame === 'string' ? frame : frame.key || frame;
                                    if (this.scene.textures.exists(frameKey)) {
                                        frames.push({ key: frameKey });
                                    }
                                });
                            } else if (animData.atlas) {
                                // If using sprite sheet atlas
                                const atlasKey = animData.atlas;
                                if (this.scene.textures.exists(atlasKey)) {
                                    const frameCount = animData.frameMetadata?.frameCount || 8;
                                    for (let i = 0; i < frameCount; i++) {
                                        frames.push({ key: atlasKey, frame: i });
                                    }
                                }
                            }
                            
                            // Cache frames for future use
                            if (frames.length > 0) {
                                this.frameCache.set(cacheKey, frames);
                            }
                        }
                    }
                    
                    
                    // Final fallback: use static sprite if still no frames available
                    if (frames.length === 0) {
                        const staticKey = characterType === 'paladin' || characterType === 'hero' 
                            ? 'hero-sprite' 
                            : `enemy-sprite-${characterType}`;
                        if (this.scene.textures.exists(staticKey)) {
                            frames.push({ key: staticKey });
                            Logger.debug('AnimationManager', `Using fallback static sprite for ${animKey}`);
                        }
                    }
                    
                    // Final validation: ensure we have valid frames before creating animation
                    if (frames.length > 0) {
                        // Additional check: verify at least one frame texture actually exists
                        const hasValidFrame = frames.some(frame => {
                            const frameKey = typeof frame === 'string' ? frame : frame.key;
                            return frameKey && this.scene.textures.exists(frameKey);
                        });
                        
                        if (hasValidFrame) {
                            // Create animation from frames (shared logic for both runtime and fallback paths)
                            if (this.createAnimationFromFramesInternal(animKey, frames, animName, characterType, characterId, useSharedPool, animData, startTime)) {
                                registeredCount++;
                            }
                        } else {
                            Logger.warn('AnimationManager', `No valid frame textures exist for ${animKey}, skipping registration`);
                        }
                    } else {
                        Logger.warn('AnimationManager', `No frames available for ${animKey}, skipping registration`);
                    }
                } else {
                    Logger.debug('AnimationManager', `Animation ${animKey} already exists, skipping`);
                    registeredCount++;
                }
            }
            
            // Track registered animations
            const existingSet = this.registeredAnimations.get(key) || new Set();
            animationNames.forEach(name => {
                const animKey = useSharedPool 
                    ? this.getSharedAnimationKey(characterType, name)
                    : this.getAnimationKey(characterType, characterId, name);
                if (this.scene.anims.exists(animKey)) {
                    existingSet.add(name);
                }
            });
            this.registeredAnimations.set(key, existingSet);
            
            const totalTime = performance.now() - startTime;
            Logger.info('AnimationManager', `Successfully initialized ${registeredCount}/${animationNames.length} animations for ${key} in ${totalTime.toFixed(2)}ms`);
            return registeredCount > 0;
        } catch (error) {
            Logger.error('AnimationManager', `Failed to initialize animations for ${characterType}-${characterId}:`, error);
            return false;
        }
    }
    
    /**
     * Batch initialize animations for multiple characters
     * @param {Array<Object>} configs - Array of {characterType, characterId, animationNames, options}
     * @param {Function} progressCallback - Optional callback for progress updates (current, total, config)
     * @returns {Promise<Array>} Array of results {success: boolean, config: Object, error?: Error}
     */
    async batchInitializeAnimations(configs, progressCallback = null) {
        const results = [];
        const total = configs.length;
        
        Logger.info('AnimationManager', `Batch initializing animations for ${total} characters`);
        
        for (let i = 0; i < configs.length; i++) {
            const config = configs[i];
            try {
                if (progressCallback) {
                    progressCallback(i + 1, total, config);
                }
                
                const success = await this.initializeAnimations(
                    config.characterType,
                    config.characterId,
                    config.animationNames || ['idle', 'walk', 'attack', 'defend', 'heal', 'death'],
                    config.options || {}
                );
                
                results.push({ success, config });
            } catch (error) {
                Logger.error('AnimationManager', `Error in batch initialization for ${config.characterType}-${config.characterId}:`, error);
                results.push({ success: false, config, error });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        Logger.info('AnimationManager', `Batch initialization complete: ${successCount}/${total} successful`);
        
        return results;
    }
    
    /**
     * Play animation with callbacks (Phase 1.3: Animation Event System)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to animate
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} animationName - Animation name
     * @param {Object} callbacks - Callback functions {onStart, onComplete, onRepeat, onUpdate}
     * @param {boolean} forceRestart - Force restart if already playing
     * @param {Object} options - Additional options {useSharedPool: boolean, speed: number}
     * @returns {boolean} True if animation was played
     */
    playAnimationWithCallbacks(sprite, characterType, characterId, animationName, callbacks = {}, forceRestart = false, options = {}) {
        if (!sprite || !sprite.anims) {
            Logger.debug('AnimationManager', `Cannot play animation ${animationName}: sprite or anims missing`);
            return false;
        }
        
        const useSharedPool = options.useSharedPool !== false;
        const animKey = useSharedPool
            ? this.getSharedAnimationKey(characterType, animationName)
            : this.getAnimationKey(characterType, characterId, animationName);
        
        // Check if animation exists
        if (!this.scene.anims.exists(animKey)) {
            Logger.debug('AnimationManager', `Animation ${animKey} does not exist, initializing...`);
            const initKey = `${characterType}-${characterId}-${animationName}`;
            if (this.initializingAnimations && this.initializingAnimations.has(initKey)) {
                Logger.debug('AnimationManager', `Animation ${animKey} is already being initialized, skipping`);
                return false;
            }
            
            if (!this.initializingAnimations) {
                this.initializingAnimations = new Set();
            }
            this.initializingAnimations.add(initKey);
            
            this.initializeAnimations(characterType, characterId, [animationName], options).then(() => {
                this.initializingAnimations?.delete(initKey);
                // Animation creation may still be in progress via delayed callbacks (retry mechanism)
                // Check after a short delay to allow delayed callbacks to complete
                this.scene.time.delayedCall(150, () => {
                    if (this.scene.anims.exists(animKey)) {
                        this._playAnimationWithCallbacksInternal(sprite, animKey, callbacks, forceRestart, options);
                    } else {
                        // Animation may still be loading via delayed callbacks - only warn if it persists
                        Logger.debug('AnimationManager', `Animation ${animKey} not yet available after initialization (may still be loading via retry mechanism)`);
                    }
                });
            }).catch((error) => {
                this.initializingAnimations?.delete(initKey);
                Logger.error('AnimationManager', `Error initializing animation ${animKey}:`, error);
            });
            return false;
        }
        
        return this._playAnimationWithCallbacksInternal(sprite, animKey, callbacks, forceRestart, options);
    }
    
    /**
     * Internal method to play animation with callbacks
     * @private
     */
    _playAnimationWithCallbacksInternal(sprite, animKey, callbacks, forceRestart, options) {
        // Remove existing listeners to prevent duplicates
        // Note: sprite is the EventEmitter, not sprite.anims
        if (sprite && typeof sprite.off === 'function') {
            sprite.off('animationstart');
            sprite.off('animationcomplete');
            sprite.off('animationrepeat');
            sprite.off('animationupdate');
        }
        
        // Set up callbacks
        if (callbacks.onStart) {
            sprite.once('animationstart', (animation, frame) => {
                if (animation.key === animKey) {
                    callbacks.onStart(animation, frame);
                }
            });
        }
        
        if (callbacks.onComplete) {
            sprite.once('animationcomplete', (animation, frame) => {
                if (animation.key === animKey) {
                    callbacks.onComplete(animation, frame);
                }
            });
        }
        
        if (callbacks.onRepeat) {
            sprite.on('animationrepeat', (animation, frame) => {
                if (animation.key === animKey) {
                    callbacks.onRepeat(animation, frame);
                }
            });
        }
        
        if (callbacks.onUpdate) {
            sprite.on('animationupdate', (animation, frame) => {
                if (animation.key === animKey) {
                    callbacks.onUpdate(animation, frame);
                }
            });
        }
        
        // Validate animation exists and has frames
        const anim = this.scene.anims.get(animKey);
        if (!anim) {
            Logger.debug('AnimationManager', `Animation ${animKey} not found, cannot play`);
            return false;
        }
        
        if (!anim.frames || anim.frames.length === 0) {
            // Remove empty-frame animation and suppress warning (we're handling it)
            if (this.scene.anims.exists(animKey)) {
                try {
                    this.scene.anims.remove(animKey);
                    Logger.debug('AnimationManager', `Removed empty-frame animation ${animKey} from playAnimationWithCallbacks`);
                } catch (removeError) {
                    // Ignore removal errors
                }
            }
            Logger.debug('AnimationManager', `Animation ${animKey} has no frames, cannot play (handled)`);
            return false;
        }
        
        // CRITICAL: Validate all frames have valid structure before playing
        // This prevents "Cannot read properties of null (reading 'sourceSize')" errors
        const invalidFrames = [];
        for (let i = 0; i < anim.frames.length; i++) {
            const frame = anim.frames[i];
            if (!frame) {
                invalidFrames.push(i);
                continue;
            }
            
            // Check if frame has required properties
            const frameKey = frame.textureKey || frame.key;
            if (!frameKey) {
                invalidFrames.push(i);
                continue;
            }
            
            // Verify texture exists
            if (!this.scene.textures.exists(frameKey)) {
                invalidFrames.push(i);
                continue;
            }
            
            // Verify frame structure - Phaser needs frame.sourceSize to be valid
            try {
                // Access properties that Phaser will access during playback
                const texture = this.scene.textures.get(frameKey);
                if (!texture) {
                    invalidFrames.push(i);
                    continue;
                }
                
                // For frames in texture.frames collection, validate sourceSize
                if (texture.frames && texture.frames[frameKey]) {
                    const frameData = texture.frames[frameKey];
                    if (!frameData || !frameData.sourceSize) {
                        invalidFrames.push(i);
                        continue;
                    }
                }
                
                // Try to access the frame's width/height which requires sourceSize
                // This will throw if frame is invalid
                if (frame.realWidth === undefined || frame.realHeight === undefined) {
                    // Frame might not be fully initialized, but check if we can access it
                    const testAccess = frame.width || frame.height;
                    if (testAccess === undefined || testAccess === null) {
                        invalidFrames.push(i);
                    }
                }
            } catch (frameError) {
                Logger.warn('AnimationManager', `Frame ${i} in animation ${animKey} is invalid: ${frameError.message}`);
                invalidFrames.push(i);
            }
        }
        
        // If we have invalid frames, remove the animation and return false
        if (invalidFrames.length > 0) {
            // Suppress error - we're handling invalid-frame animations properly (removing them)
            // Use debug instead to avoid console spam
            Logger.debug('AnimationManager', `Animation ${animKey} has ${invalidFrames.length} invalid frames (indices: ${invalidFrames.join(', ')}), removing animation (handled)`);
            try {
                // Stop all sprites using this animation
                const allSprites = this.scene.children.list.filter(child => child.type === 'Sprite' && child.anims);
                allSprites.forEach(spriteToStop => {
                    try {
                        if (spriteToStop.anims && spriteToStop.anims.currentAnim && spriteToStop.anims.currentAnim.key === animKey) {
                            spriteToStop.anims.stop();
                        }
                    } catch {
                        // Ignore errors
                    }
                });
                this.scene.anims.remove(animKey);
            } catch (removeError) {
                Logger.warn('AnimationManager', `Failed to remove invalid animation ${animKey}: ${removeError.message}`);
            }
            return false;
        }
        
        // Set animation speed if provided
        if (options.speed !== undefined) {
            anim.frameRate = (anim.frameRate || 12) * options.speed;
        }
        
        // Play animation with error handling for glTexture and frame issues
        try {
            sprite.play(animKey, forceRestart);
            this.animationState.set(sprite.id || sprite, animKey);
        } catch (error) {
            // Handle null frame errors (sourceSize access on null)
            if (error.message && (error.message.includes('sourceSize') || error.message.includes('Cannot read properties of null'))) {
                // Suppress error - we're handling broken animations properly (removing and reinitializing)
                // Use debug instead to avoid console spam
                Logger.debug('AnimationManager', `Animation ${animKey} has invalid frames (null sourceSize), removing and reinitializing (handled)`);
                // Remove the broken animation
                try {
                    this.scene.anims.remove(animKey);
                } catch (removeError) {
                    Logger.warn('AnimationManager', `Failed to remove broken animation ${animKey}: ${removeError.message}`);
                }
                // Don't retry - the animation needs to be recreated with valid frames
                return false;
            }
            
            // If error is related to glTexture, wait and retry
            if (error.message && error.message.includes('glTexture')) {
                // Wait 32ms (2 frames) and retry
                this.scene.time.delayedCall(32, () => {
                    try {
                        sprite.play(animKey, forceRestart);
                        this.animationState.set(sprite.id || sprite, animKey);
                    } catch (retryError) {
                        Logger.warn('AnimationManager', `Failed to play animation ${animKey} after retry: ${retryError.message}`);
                    }
                });
                return;
            }
            // Re-throw if it's not a handled error
            Logger.error('AnimationManager', `Unexpected error playing animation ${animKey}: ${error.message}`);
            throw error;
        }
        
        if (anim && anim.frames && anim.frames.length > 0) {
            const firstFrame = anim.frames[0];
            const frameTextureKey = firstFrame.textureKey || firstFrame.key;
            const frameTexture = this.scene.textures.get(frameTextureKey);
            let framePixelData = null;
            let frameIsWhite = false;
            if (frameTexture && frameTexture.source && frameTexture.source[0]) {
                const source = frameTexture.source[0];
                const canvas = source.image || source.canvas;
                if (canvas && canvas.getContext) {
                    try {
                        const ctx = canvas.getContext('2d');
                        const imageData = ctx.getImageData(0, 0, Math.min(40, canvas.width), Math.min(60, canvas.height));
                        const pixels = imageData.data;
                        let nonWhitePixels = 0;
                        for (let i = 0; i < pixels.length; i += 4) {
                            const r = pixels[i];
                            const g = pixels[i + 1];
                            const b = pixels[i + 2];
                            const a = pixels[i + 3];
                            if (!(r === 255 && g === 255 && b === 255 && a === 255)) nonWhitePixels++;
                        }
                        framePixelData = { totalPixels: pixels.length / 4, nonWhitePixels, isAllWhite: nonWhitePixels === 0 };
                        frameIsWhite = nonWhitePixels === 0;
                    } catch (e) {
                        framePixelData = { error: e.message };
                    }
                }
            }
        }
        
        // Update usage tracking
        this.animationLastUsage.set(animKey, Date.now());
        const currentCount = this.animationUsageCounts.get(animKey) || 0;
        this.animationUsageCounts.set(animKey, currentCount + 1);
        this.performanceMetrics.totalPlaybacks++;
        
        // Update enhanced state
        const spriteId = sprite.id || sprite;
        if (!this.enhancedAnimationState.has(spriteId)) {
            this.enhancedAnimationState.set(spriteId, {
                currentAnim: animKey,
                speed: options.speed || 1.0,
                direction: 1,
                paused: false,
                queue: []
            });
        } else {
            const state = this.enhancedAnimationState.get(spriteId);
            state.currentAnim = animKey;
            state.speed = options.speed || 1.0;
        }
        
        return true;
    }
    
    // ============================================================================
    // PHASE 2: ADVANCED FUNCTIONALITY
    // ============================================================================
    
    /**
     * Queue animation for a sprite (Phase 2.1: Animation Queue System)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to animate
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} animationName - Animation name
     * @param {Object} options - Options {priority: number, interrupt: boolean, speed: number, callbacks: Object}
     * @returns {void}
     */
    queueAnimation(sprite, characterType, characterId, animationName, options = {}) {
        if (!sprite || !sprite.anims) {
            Logger.warn('AnimationManager', `Cannot queue animation: sprite or anims missing`);
            return;
        }
        
        const spriteId = sprite.id || sprite;
        const priority = options.priority || 0; // Higher = more priority
        const interrupt = options.interrupt !== false; // Default to true
        const useSharedPool = options.useSharedPool !== false;
        
        const queuedAnim = {
            characterType,
            characterId,
            animationName,
            callbacks: options.callbacks || {},
            priority,
            interrupt,
            speed: options.speed || 1.0,
            useSharedPool,
            timestamp: Date.now()
        };
        
        if (!this.animationQueues.has(spriteId)) {
            this.animationQueues.set(spriteId, []);
        }
        
        const queue = this.animationQueues.get(spriteId);
        
        // Insert based on priority (higher priority first)
        let insertIndex = queue.length;
        for (let i = 0; i < queue.length; i++) {
            if (priority > queue[i].priority) {
                insertIndex = i;
                break;
            }
        }
        queue.splice(insertIndex, 0, queuedAnim);
        
        // If queue was empty or interrupt is true, play immediately
        if (queue.length === 1 || interrupt) {
            this._processAnimationQueue(sprite, spriteId);
        }
        
        Logger.debug('AnimationManager', `Queued animation ${animationName} for sprite ${spriteId} (priority: ${priority})`);
    }
    
    /**
     * Process animation queue for a sprite
     * @private
     */
    _processAnimationQueue(sprite, spriteId) {
        const queue = this.animationQueues.get(spriteId);
        if (!queue || queue.length === 0) {
            return;
        }
        
        const queuedAnim = queue[0];
        const animKey = queuedAnim.useSharedPool
            ? this.getSharedAnimationKey(queuedAnim.characterType, queuedAnim.animationName)
            : this.getAnimationKey(queuedAnim.characterType, queuedAnim.characterId, queuedAnim.animationName);
        
        // Enhanced callbacks to auto-advance queue
        const enhancedCallbacks = {
            ...queuedAnim.callbacks,
            onComplete: (animation, frame) => {
                if (queuedAnim.callbacks.onComplete) {
                    queuedAnim.callbacks.onComplete(animation, frame);
                }
                // Remove completed animation from queue
                queue.shift();
                // Process next in queue
                if (queue.length > 0) {
                    this._processAnimationQueue(sprite, spriteId);
                } else {
                    this.animationQueues.delete(spriteId);
                }
            }
        };
        
        this.playAnimationWithCallbacks(
            sprite,
            queuedAnim.characterType,
            queuedAnim.characterId,
            queuedAnim.animationName,
            enhancedCallbacks,
            queuedAnim.interrupt,
            { useSharedPool: queuedAnim.useSharedPool, speed: queuedAnim.speed }
        );
    }
    
    /**
     * Clear animation queue for a sprite
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to clear queue for
     */
    clearAnimationQueue(sprite) {
        const spriteId = sprite?.id || sprite;
        if (this.animationQueues.has(spriteId)) {
            this.animationQueues.delete(spriteId);
            Logger.debug('AnimationManager', `Cleared animation queue for sprite ${spriteId}`);
        }
    }
    
    /**
     * Play animation chain (Phase 2.2: Animation Chains & Sequences)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to animate
     * @param {Array<Object>} chain - Chain config [{anim: string, wait: 'complete'|'time'|number, callbacks: Object}, ...]
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {Object} options - Options {useSharedPool: boolean}
     * @returns {void}
     */
    playAnimationChain(sprite, chain, characterType, characterId, options = {}) {
        if (!sprite || !sprite.anims || !chain || chain.length === 0) {
            Logger.warn('AnimationManager', `Cannot play animation chain: invalid parameters`);
            return;
        }
        
        // Clear existing queue
        this.clearAnimationQueue(sprite);
        
        // Queue all animations in chain
        chain.forEach((chainItem, index) => {
            const isLast = index === chain.length - 1;
            const callbacks = chainItem.callbacks || {};
            
            // If wait is 'complete', chain will auto-advance via queue system
            // If wait is 'time' or number, we need to handle timing
            if (chainItem.wait === 'time' || typeof chainItem.wait === 'number') {
                const waitTime = typeof chainItem.wait === 'number' ? chainItem.wait : 0;
                const originalOnComplete = callbacks.onComplete;
                callbacks.onComplete = (animation, frame) => {
                    if (originalOnComplete) originalOnComplete(animation, frame);
                    // Wait before next animation
                    this.scene.time.delayedCall(waitTime, () => {
                        // Queue will auto-advance
                    });
                };
            }
            
            this.queueAnimation(sprite, characterType, characterId, chainItem.anim, {
                priority: chainItem.priority || 0,
                interrupt: index === 0, // Only first animation interrupts
                speed: chainItem.speed || 1.0,
                callbacks,
                useSharedPool: options.useSharedPool !== false
            });
        });
        
        Logger.debug('AnimationManager', `Playing animation chain with ${chain.length} animations`);
    }
    
    /**
     * Set animation speed (Phase 2.4: Animation Speed & Direction Control)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to modify
     * @param {number} speedMultiplier - Speed multiplier (1.0 = normal, 2.0 = 2x speed, 0.5 = half speed)
     * @returns {boolean} True if successful
     */
    setAnimationSpeed(sprite, speedMultiplier) {
        if (!sprite || !sprite.anims || !sprite.anims.currentAnim) {
            return false;
        }
        
        const anim = sprite.anims.currentAnim;
        const originalFrameRate = anim.frameRate || 12;
        anim.frameRate = originalFrameRate * speedMultiplier;
        
        // Update enhanced state
        const spriteId = sprite.id || sprite;
        if (this.enhancedAnimationState.has(spriteId)) {
            this.enhancedAnimationState.get(spriteId).speed = speedMultiplier;
        }
        
        Logger.debug('AnimationManager', `Set animation speed to ${speedMultiplier}x for sprite ${spriteId}`);
        return true;
    }
    
    /**
     * Pause animation
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to pause
     * @returns {boolean} True if successful
     */
    pauseAnimation(sprite) {
        if (!sprite || !sprite.anims) {
            return false;
        }
        
        sprite.anims.pause();
        
        const spriteId = sprite.id || sprite;
        if (this.enhancedAnimationState.has(spriteId)) {
            this.enhancedAnimationState.get(spriteId).paused = true;
        }
        
        return true;
    }
    
    /**
     * Resume animation
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to resume
     * @returns {boolean} True if successful
     */
    resumeAnimation(sprite) {
        if (!sprite || !sprite.anims) {
            return false;
        }
        
        sprite.anims.resume();
        
        const spriteId = sprite.id || sprite;
        if (this.enhancedAnimationState.has(spriteId)) {
            this.enhancedAnimationState.get(spriteId).paused = false;
        }
        
        return true;
    }
    
    // ============================================================================
    // PHASE 3: PERFORMANCE & OPTIMIZATION
    // ============================================================================
    
    /**
     * Get performance metrics (Phase 3.1: Performance Monitoring)
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        // Calculate active animations
        let activeCount = 0;
        this.enhancedAnimationState.forEach(state => {
            if (state.currentAnim && !state.paused) {
                activeCount++;
            }
        });
        this.performanceMetrics.activeAnimations = activeCount;
        
        // Estimate memory usage (rough calculation)
        let memoryEstimate = 0;
        this.frameCache.forEach((frames, key) => {
            // Rough estimate: 4 bytes per pixel per frame
            frames.forEach(frame => {
                memoryEstimate += (this.frameWidth || 40) * (this.frameHeight || 60) * 4;
            });
        });
        this.performanceMetrics.memoryEstimate = memoryEstimate;
        
        return {
            ...this.performanceMetrics,
            animationPoolSize: this.animationPool.size,
            frameCacheSize: this.frameCache.size,
            queueCount: this.animationQueues.size,
            registeredAnimationCount: this.registeredAnimations.size
        };
    }
    
    /**
     * Preload animations (Phase 3.2: Lazy Loading & Preloading)
     * @param {Array<string>} characterTypes - Character types to preload
     * @param {Array<string>} animationNames - Animation names to preload (default: combat animations)
     * @param {Function} progressCallback - Optional progress callback
     * @returns {Promise<void>}
     */
    async preloadAnimations(characterTypes, animationNames = ['idle', 'walk', 'attack', 'defend'], progressCallback = null) {
        if (this.preloadInProgress) {
            Logger.warn('AnimationManager', 'Preload already in progress');
            return;
        }
        
        this.preloadInProgress = true;
        Logger.info('AnimationManager', `Preloading animations for ${characterTypes.length} character types`);
        
        const configs = [];
        characterTypes.forEach(characterType => {
            // Use a placeholder ID for preloading (shared pool)
            configs.push({
                characterType,
                characterId: 'preload',
                animationNames,
                options: { useSharedPool: true }
            });
        });
        
        await this.batchInitializeAnimations(configs, progressCallback);
        
        this.preloadInProgress = false;
        Logger.info('AnimationManager', 'Preload complete');
    }
    
    /**
     * Cleanup unused animations (Phase 3.3: Memory Management & Cleanup)
     * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
     * @param {number} minUsageCount - Minimum usage count to keep (default: 0)
     * @returns {number} Number of animations cleaned up
     */
    cleanupUnusedAnimations(maxAge = 300000, minUsageCount = 0) {
        const now = Date.now();
        let cleanedCount = 0;
        
        // Clean up animations that haven't been used recently
        this.animationLastUsage.forEach((lastUsage, animKey) => {
            const age = now - lastUsage;
            const usageCount = this.animationUsageCounts.get(animKey) || 0;
            
            if (age > maxAge && usageCount <= minUsageCount) {
                // Check if animation is currently playing
                let isActive = false;
                this.enhancedAnimationState.forEach(state => {
                    if (state.currentAnim === animKey) {
                        isActive = true;
                    }
                });
                
                if (!isActive && this.scene.anims.exists(animKey)) {
                    try {
                        this.scene.anims.remove(animKey);
                        this.animationLastUsage.delete(animKey);
                        this.animationUsageCounts.delete(animKey);
                        this.animationCreationTime.delete(animKey);
                        this.performanceMetrics.initTimes.delete(animKey);
                        this.performanceMetrics.frameCounts.delete(animKey);
                        cleanedCount++;
                    } catch (error) {
                        Logger.warn('AnimationManager', `Error removing animation ${animKey}:`, error);
                    }
                }
            }
        });
        
        if (cleanedCount > 0) {
            Logger.info('AnimationManager', `Cleaned up ${cleanedCount} unused animations`);
        }
        
        return cleanedCount;
    }
    
    // ============================================================================
    // PHASE 4: RELIABILITY & STATE MANAGEMENT
    // ============================================================================
    
    /**
     * Save animation state (Phase 4.2: Animation State Persistence)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to save state for
     * @returns {Object|null} Saved state or null
     */
    saveAnimationState(sprite) {
        if (!sprite || !sprite.anims) {
            return null;
        }
        
        const spriteId = sprite.id || sprite;
        const currentAnim = sprite.anims.currentAnim;
        const enhancedState = this.enhancedAnimationState.get(spriteId);
        
        return {
            spriteId,
            currentAnimKey: currentAnim?.key || null,
            currentFrame: currentAnim?.currentFrame?.index || 0,
            speed: enhancedState?.speed || 1.0,
            direction: enhancedState?.direction || 1,
            paused: enhancedState?.paused || false,
            timestamp: Date.now()
        };
    }
    
    /**
     * Restore animation state
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to restore state for
     * @param {Object} state - Saved state
     * @returns {boolean} True if successful
     */
    restoreAnimationState(sprite, state) {
        if (!sprite || !sprite.anims || !state) {
            return false;
        }
        
        if (state.currentAnimKey && this.scene.anims.exists(state.currentAnimKey)) {
            sprite.play(state.currentAnimKey);
            if (state.currentFrame !== undefined) {
                sprite.anims.setCurrentFrame(state.currentFrame);
            }
            
            if (state.speed !== undefined) {
                this.setAnimationSpeed(sprite, state.speed);
            }
            
            if (state.paused) {
                this.pauseAnimation(sprite);
            }
            
            Logger.debug('AnimationManager', `Restored animation state for sprite ${state.spriteId}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Validate animation exists and sprite is valid (Phase 4.3: Animation Validation & Health Checks)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to validate
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} animationName - Animation name
     * @param {boolean} useSharedPool - Use shared pool
     * @returns {Object} Validation result {valid: boolean, errors: Array<string>}
     */
    validateAnimation(sprite, characterType, characterId, animationName, useSharedPool = true) {
        const errors = [];
        
        if (!sprite) {
            errors.push('Sprite is null or undefined');
        } else if (!sprite.anims) {
            errors.push('Sprite does not have anims property');
        }
        
        if (!characterType) {
            errors.push('Character type is required');
        }
        
        if (!animationName) {
            errors.push('Animation name is required');
        }
        
        const animKey = useSharedPool
            ? this.getSharedAnimationKey(characterType, animationName)
            : this.getAnimationKey(characterType, characterId, animationName);
        
        if (!this.scene.anims.exists(animKey)) {
            errors.push(`Animation ${animKey} does not exist`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            animKey
        };
    }
    
    /**
     * Health check for debugging
     * @returns {Object} Health check results
     */
    healthCheck() {
        const metrics = this.getPerformanceMetrics();
        const issues = [];
        
        // Check for potential memory leaks
        if (metrics.registeredAnimationCount > 1000) {
            issues.push(`High number of registered animations: ${metrics.registeredAnimationCount}`);
        }
        
        if (metrics.memoryEstimate > 100 * 1024 * 1024) { // 100MB
            issues.push(`High memory estimate: ${(metrics.memoryEstimate / 1024 / 1024).toFixed(2)}MB`);
        }
        
        // Check for stuck queues
        this.animationQueues.forEach((queue, spriteId) => {
            if (queue.length > 10) {
                issues.push(`Long animation queue for sprite ${spriteId}: ${queue.length} items`);
            }
        });
        
        return {
            healthy: issues.length === 0,
            issues,
            metrics
        };
    }
    
    /**
     * Play animation variant (Phase 4.4: Animation Variants Support)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to animate
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} baseName - Base animation name (e.g., 'attack')
     * @param {string|number} variant - Variant identifier (e.g., '1', '2', '3' or 'heavy', 'light')
     * @param {Object} options - Options
     * @returns {boolean} True if successful
     */
    playAnimationVariant(sprite, characterType, characterId, baseName, variant, options = {}) {
        // Try variant name first (e.g., 'attack_1', 'attack_heavy')
        const variantName = `${baseName}_${variant}`;
        const useSharedPool = options.useSharedPool !== false;
        
        let animKey = useSharedPool
            ? this.getSharedAnimationKey(characterType, variantName)
            : this.getAnimationKey(characterType, characterId, variantName);
        
        // If variant doesn't exist, try base name
        if (!this.scene.anims.exists(animKey)) {
            animKey = useSharedPool
                ? this.getSharedAnimationKey(characterType, baseName)
                : this.getAnimationKey(characterType, characterId, baseName);
        }
        
        // Play animation
        return this.playAnimation(sprite, characterType, characterId, baseName, options.forceRestart || false);
    }
    
    // ============================================================================
    // PHASE 5: INTEGRATION & API IMPROVEMENTS
    // ============================================================================
    
    /**
     * Convenience methods (Phase 5.1: Simplified API Methods)
     */
    playIdle(sprite, characterType, characterId, options = {}) {
        return this.playAnimation(sprite, characterType, characterId, 'idle', false, options);
    }
    
    playWalk(sprite, characterType, characterId, options = {}) {
        return this.playAnimation(sprite, characterType, characterId, 'walk', false, options);
    }
    
    playAttack(sprite, characterType, characterId, options = {}) {
        return this.playAnimation(sprite, characterType, characterId, 'attack', true, options);
    }
    
    playDefend(sprite, characterType, characterId, options = {}) {
        return this.playAnimation(sprite, characterType, characterId, 'defend', false, options);
    }
    
    playHeal(sprite, characterType, characterId, options = {}) {
        return this.playAnimation(sprite, characterType, characterId, 'heal', false, options);
    }
    
    playDeath(sprite, characterType, characterId, options = {}) {
        return this.playAnimation(sprite, characterType, characterId, 'death', true, options);
    }
    
    /**
     * Sync animations across multiple sprites (Phase 5.2: Animation Synchronization)
     * @param {Array<Phaser.GameObjects.Sprite>} sprites - Sprites to sync
     * @param {string} animationName - Animation name to sync
     * @param {string} characterType - Character type (assumed same for all)
     * @param {Array<string>} characterIds - Character IDs for each sprite
     * @param {Object} options - Options
     * @returns {boolean} True if successful
     */
    syncAnimations(sprites, animationName, characterType, characterIds, options = {}) {
        if (!sprites || sprites.length === 0 || !characterIds || characterIds.length !== sprites.length) {
            Logger.warn('AnimationManager', 'Cannot sync animations: invalid parameters');
            return false;
        }
        
        const useSharedPool = options.useSharedPool !== false;
        const animKey = useSharedPool
            ? this.getSharedAnimationKey(characterType, animationName)
            : null; // Will be per-sprite if not using shared pool
        
        // Play animation on all sprites simultaneously
        sprites.forEach((sprite, index) => {
            if (useSharedPool) {
                if (this.scene.anims.exists(animKey)) {
                    sprite.play(animKey, options.forceRestart || false);
                }
            } else {
                this.playAnimation(sprite, characterType, characterIds[index], animationName, options.forceRestart || false, options);
            }
        });
        
        Logger.debug('AnimationManager', `Synced ${animationName} animation across ${sprites.length} sprites`);
        return true;
    }
    
    // ============================================================================
    // LEGACY METHODS (Backward Compatibility)
    // ============================================================================
    
    /**
     * Play animation on a sprite (legacy method - maintained for backward compatibility)
     * Tries shared pool first, falls back to per-character if needed
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to animate
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} animationName - Animation name
     * @param {boolean} forceRestart - Force restart if already playing
     * @returns {boolean} True if animation was played
     */
    playAnimation(sprite, characterType, characterId, animationName, forceRestart = false) {
        if (!sprite || !sprite.anims) {
            Logger.debug('AnimationManager', `Cannot play animation ${animationName}: sprite or anims missing`);
            return false;
        }
        
        // NOTE: Runtime-generated sprites (paladin_dynamic_party) now have animations generated from them
        // No need to block animations - they will use the generated animation frames
        
        // Try shared pool first (memory efficient)
        const sharedKey = this.getSharedAnimationKey(characterType, animationName);
        const perCharKey = this.getAnimationKey(characterType, characterId, animationName);
        
        // Check which key exists
        let animKey = null;
        let useShared = false;
        
        if (this.scene.anims.exists(sharedKey)) {
            animKey = sharedKey;
            useShared = true;
        } else if (this.scene.anims.exists(perCharKey)) {
            animKey = perCharKey;
            useShared = false;
        } else {
            // Neither exists, initialize with shared pool (memory efficient)
            return this.playAnimationWithCallbacks(sprite, characterType, characterId, animationName, {}, forceRestart, { useSharedPool: true });
        }
        
        // Check if already playing this animation
        const currentAnim = sprite.anims.currentAnim;
        if (currentAnim && currentAnim.key === animKey && !forceRestart) {
            Logger.debug('AnimationManager', `Animation ${animKey} already playing, skipping`);
            return true;
        }
        
        // Validate animation exists and has frames before playing
        if (!this.scene.anims.exists(animKey)) {
            // Suppress warning - playAnimationWithCallbacks handles initialization, and we cache failures
            Logger.debug('AnimationManager', `Cannot play animation ${animKey}: animation does not exist (will initialize if needed)`);
            return false;
        }
        
        const anim = this.scene.anims.get(animKey);
        if (!anim || !anim.frames || anim.frames.length === 0) {
            // CRITICAL FIX: If animation exists but has no frames, remove it to prevent repeated warnings
            // Suppress warning since we're handling it properly (removal + cache prevents spam)
            if (anim && this.scene.anims.exists(animKey)) {
                try {
                    this.scene.anims.remove(animKey);
                    Logger.debug('AnimationManager', `Removed empty-frame animation ${animKey} to prevent spam`);
                } catch (removeError) {
                    // Ignore removal errors
                }
            }
            // Use debug instead of warn - we're handling empty-frame animations properly
            // (removing them and caching failures), so no need to spam console with warnings
            Logger.debug('AnimationManager', `Cannot play animation ${animKey}: animation has no valid frames (handled)`);
            return false;
        }
        
        // Final validation right before playing - ensure animation is still valid
        // (it might have been removed between validation and play)
        if (!this.scene.anims.exists(animKey)) {
            Logger.debug('AnimationManager', `Animation ${animKey} no longer exists before play, skipping`);
            return false;
        }
        const finalAnim = this.scene.anims.get(animKey);
        if (!finalAnim || !finalAnim.frames || finalAnim.frames.length === 0) {
            Logger.debug('AnimationManager', `Animation ${animKey} has no frames before play, skipping`);
            return false;
        }
        
        // Play animation - wrap in try-catch to suppress Phaser warnings for invalid animations
        try {
            sprite.play(animKey, forceRestart);
            this.animationState.set(sprite.id || sprite, animKey);
        } catch (playError) {
            // Phaser might throw or log warnings for invalid animations - suppress them
            // since we've already validated the animation exists and has frames
            Logger.debug('AnimationManager', `Error playing animation ${animKey}: ${playError.message}`);
            return false;
        }
        
        // Update usage tracking
        this.animationLastUsage.set(animKey, Date.now());
        const currentCount = this.animationUsageCounts.get(animKey) || 0;
        this.animationUsageCounts.set(animKey, currentCount + 1);
        this.performanceMetrics.totalPlaybacks++;
        
        return true;
    }
    
    /**
     * Register animations for a hero (legacy method)
     * @param {Object} hero - Hero object
     * @returns {Promise<boolean>} True if successful
     */
    async registerHeroAnimations(hero) {
        if (!hero || !hero.id) {
            Logger.warn('AnimationManager', 'Cannot register hero animations: hero or hero.id missing');
            return false;
        }
        
        const characterType = hero.classId || hero.class || 'paladin';
        Logger.debug('AnimationManager', `Registering animations for hero ${hero.id} (${characterType})`);
        return await this.initializeAnimations(characterType, hero.id, undefined, { useSharedPool: true });
    }
    
    /**
     * Register animations for an enemy (legacy method)
     * @param {Object} enemy - Enemy object
     * @returns {Promise<boolean>} True if successful
     */
    async registerEnemyAnimations(enemy) {
        if (!enemy || !enemy.data) {
            Logger.warn('AnimationManager', 'Cannot register enemy animations: enemy or enemy.data missing');
            return false;
        }
        
        const characterType = enemy.data.id || enemy.id || 'goblin';
        const characterId = enemy.id || enemy.data.id || 'enemy';
        Logger.debug('AnimationManager', `Registering animations for enemy ${characterId} (${characterType})`);
        return await this.initializeAnimations(characterType, characterId, undefined, { useSharedPool: true });
    }
    
    /**
     * Get current animation for a sprite (legacy method)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to check
     * @returns {string|null} Current animation key or null
     */
    getCurrentAnimation(sprite) {
        if (!sprite || !sprite.anims) return null;
        return sprite.anims.currentAnim?.key || this.animationState.get(sprite.id || sprite) || null;
    }
    
    /**
     * Check if animation is playing (legacy method)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to check
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     * @param {string} animationName - Animation name
     * @returns {boolean} True if animation is playing
     */
    isAnimationPlaying(sprite, characterType, characterId, animationName) {
        if (!sprite || !sprite.anims) return false;
        
        // Check both shared and per-character keys
        const sharedKey = this.getSharedAnimationKey(characterType, animationName);
        const perCharKey = this.getAnimationKey(characterType, characterId, animationName);
        const currentAnim = sprite.anims.currentAnim;
        
        return currentAnim && (currentAnim.key === sharedKey || currentAnim.key === perCharKey);
    }
    
    /**
     * Stop current animation and return to idle (legacy method)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite to stop
     * @param {string} characterType - Character type
     * @param {string} characterId - Character ID
     */
    stopAndReturnToIdle(sprite, characterType, characterId) {
        if (!sprite || !sprite.anims) return;
        
        // Try shared pool first
        const sharedIdleKey = this.getSharedAnimationKey(characterType, 'idle');
        const perCharIdleKey = this.getAnimationKey(characterType, characterId, 'idle');
        
        if (this.scene.anims.exists(sharedIdleKey)) {
            sprite.play(sharedIdleKey);
            this.animationState.set(sprite.id || sprite, sharedIdleKey);
        } else if (this.scene.anims.exists(perCharIdleKey)) {
            sprite.play(perCharIdleKey);
            this.animationState.set(sprite.id || sprite, perCharIdleKey);
        }
    }
}

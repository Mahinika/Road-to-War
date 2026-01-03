import { Logger } from '../utils/logger.js';
import { BaseManager } from './base-manager.js';

/**
 * Camera Manager - Dynamic camera system for party tracking
 * Ensures all party members remain visible by adjusting camera position and offset
 */
export class CameraManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // CameraManager has no dependencies (hero references set externally)
    }

    constructor(scene, primaryHero = null, partyMemberSprites = [], config = {}) {
        super(scene, config);
        this.camera = scene.cameras.main;
        this.primaryHero = primaryHero || null;
        this.partyMemberSprites = partyMemberSprites || [];
        
        // Camera settings
        this.smoothLerp = 0.1; // Smooth following interpolation
        this.deadzoneWidth = 0.2; // 20% of viewport width
        this.partyPadding = 40; // Extra padding around party for visibility
        
        // State
        this.initialized = false;
        this._destroyListener = null;
    }
    
    /**
     * Initialize camera system (positioning, bounds, etc.)
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        const width = this.camera.width;
        const height = this.camera.height;
        
        // Set initial camera position if primaryHero exists and camera not following
        if (!this.camera.followTarget && this.primaryHero) {
            const bounds = this.calculatePartyBounds();
            if (bounds && bounds.centerX !== undefined && bounds.centerY !== undefined) {
                const targetScrollX = bounds.centerX - width / 2;
                const targetScrollY = bounds.centerY - height / 2;
                this.camera.setScroll(targetScrollX, targetScrollY);
            } else if (this.primaryHero && typeof this.primaryHero.x === 'number' && typeof this.primaryHero.y === 'number') {
                const heroX = this.primaryHero.x;
                const heroY = this.primaryHero.y;
                if (heroX !== 0 || heroY !== 0) {
                    this.camera.setScroll(heroX - width / 2, heroY - height / 2);
                }
            }
        }
        
        // Set deadzone
        this.camera.setDeadzone(width * this.deadzoneWidth, height);
        
        this.initialized = true;
        Logger.info('CameraManager', 'Camera system initialized');
    }

    /**
     * Set camera targets (primary hero and party sprites)
     * @param {Phaser.GameObjects.GameObject} primaryHero - The primary hero to follow
     * @param {Array} partyMemberSprites - All party member sprites
     */
    setTargets(primaryHero, partyMemberSprites) {
        this.primaryHero = primaryHero;
        this.partyMemberSprites = partyMemberSprites || [];
        
        if (this.primaryHero) {
            // Initialize if not already done
            if (!this.initialized) {
                this.init();
            }
            // Set follow target (this will start camera following)
            this.setFollowTarget(this.primaryHero);
        } else {
            Logger.warn('CameraManager', 'No primary hero provided to setTargets');
        }
    }
    
    /**
     * Calculate party bounding box (2D bounds including X and Y spread)
     * Includes enemy position during combat to ensure camera shows combat area
     * @returns {Object} Bounds object with minX, maxX, minY, maxY, centerX, centerY, width, height
     */
    calculatePartyBounds() {
        // If no primary hero, return default bounds at origin
        if (!this.primaryHero) {
            return {
                minX: -this.partyPadding,
                maxX: this.partyPadding,
                minY: -this.partyPadding,
                maxY: this.partyPadding,
                centerX: 0,
                centerY: 0,
                width: this.partyPadding * 2,
                height: this.partyPadding * 2
            };
        }
        
        // Get all hero positions (both X and Y)
        const xPositions = [];
        const yPositions = [];
        
        // Add primary hero
        if (this.primaryHero && this.primaryHero.x !== undefined) {
            xPositions.push(this.primaryHero.x);
        }
        if (this.primaryHero && this.primaryHero.y !== undefined) {
            yPositions.push(this.primaryHero.y);
        }
        
        // Add all party member sprites
        if (this.partyMemberSprites && this.partyMemberSprites.length > 0) {
            this.partyMemberSprites.forEach(partyMember => {
                if (partyMember?.sprite?.x !== undefined) {
                    xPositions.push(partyMember.sprite.x);
                }
                if (partyMember?.sprite?.y !== undefined) {
                    yPositions.push(partyMember.sprite.y);
                }
            });
        }
        
        // Include enemy position during combat so camera shows combat area
        const combatManager = this.scene?.combatManager;
        if (combatManager && combatManager.inCombat && combatManager.enemy) {
            const enemy = combatManager.enemy;
            const enemyX = enemy.sprite?.x ?? enemy.x;
            const enemyY = enemy.sprite?.y ?? enemy.y;
            if (enemyX !== undefined && !isNaN(enemyX)) {
                xPositions.push(enemyX);
            }
            if (enemyY !== undefined && !isNaN(enemyY)) {
                yPositions.push(enemyY);
            }
        }
        
        if (xPositions.length === 0 || yPositions.length === 0) {
            const heroX = this.primaryHero?.x || 0;
            const heroY = this.primaryHero?.y || 0;
            return {
                minX: heroX - this.partyPadding,
                maxX: heroX + this.partyPadding,
                minY: heroY - this.partyPadding,
                maxY: heroY + this.partyPadding,
                centerX: heroX,
                centerY: heroY,
                width: this.partyPadding * 2,
                height: this.partyPadding * 2
            };
        }
        
        // Calculate 2D bounds including enemy if in combat
        const minX = Math.min(...xPositions) - this.partyPadding;
        const maxX = Math.max(...xPositions) + this.partyPadding;
        const minY = Math.min(...yPositions) - this.partyPadding;
        const maxY = Math.max(...yPositions) + this.partyPadding;
        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        return { minX, maxX, minY, maxY, centerX, centerY, width, height };
    }
    
    /**
     * Validate target is safe to follow
     * @param {Phaser.GameObjects.Sprite} target - Target to validate
     * @returns {boolean} True if target is valid and safe to follow
     */
    isValidTarget(target) {
        if (!target) return false;
        if (target.destroyed) return false;
        if (!target.scene) return false;
        if (!target.active) return false;
        if (typeof target.x !== 'number' || typeof target.y !== 'number') {
            return false;
        }
        return true;
    }
    
    /**
     * Update camera position (called every frame)
     * Adjusts follow offset to keep all party members visible
     */
    update() {
        if (!this.initialized) {
            return;
        }
        
        // Basic validation - but don't stop follow if hero temporarily has invalid values
        // Only stop if hero is actually destroyed or missing scene
        if (!this.primaryHero || !this.primaryHero.scene) {
            if (this.camera.followTarget) {
                this.camera.stopFollow();
            }
            return;
        }
        
        // If hero has invalid position, wait for it to be valid rather than stopping follow
        if (typeof this.primaryHero.x !== 'number' || typeof this.primaryHero.y !== 'number') {
            return; // Skip this frame but keep follow active
        }
        
        // Only adjust offset if camera is already following
        // Don't start follow here - that should only happen via setFollowTarget()
        if (!this.camera.followTarget) {
            return;
        }
        
        // Calculate party bounds
        const bounds = this.calculatePartyBounds();
        const viewportWidth = this.camera.width;
        
        // Calculate desired followOffset to keep the party centered around the primary hero
        // Note: followOffset is applied relative to the follow target, so using the
        // viewport width as a base offset pushes the camera far left. Use the
        // difference between party center and hero position directly.
        const partyCenterX = bounds.centerX;
        const partyCenterY = bounds.centerY;
        const offsetFromHeroX = partyCenterX - this.primaryHero.x;
        const offsetFromHeroY = partyCenterY - this.primaryHero.y;

        // Do not apply an extra viewport-based offset here. The follow offset
        // should be the pixel difference between the party center and the hero.
        const baseOffsetX = 0;
        const desiredOffsetX = baseOffsetX + offsetFromHeroX;
        const desiredOffsetY = offsetFromHeroY;
        
        // Smoothly lerp to desired offset
        const currentOffsetX = this.camera.followOffset?.x || 0;
        const currentOffsetY = this.camera.followOffset?.y || 0;
        const lerpFactor = 0.2; // Smooth adjustment
        
        const lerpedOffsetX = Phaser.Math.Linear(currentOffsetX, desiredOffsetX, lerpFactor);
        const lerpedOffsetY = Phaser.Math.Linear(currentOffsetY, desiredOffsetY, lerpFactor);
        
        this.camera.setFollowOffset(lerpedOffsetX, lerpedOffsetY);
    }
    
    /**
     * Set follow target - call this when target is ready
     * @param {Phaser.GameObjects.Sprite} target - Sprite to follow
     */
    setFollowTarget(target) {
        // Basic validation
        if (!target || !target.scene || 
            typeof target.x !== 'number' || typeof target.y !== 'number') {
            Logger.error('CameraManager', 'Cannot set follow target - target is invalid');
            return;
        }
        
        // Stop any existing follow first
        if (this.camera.followTarget) {
            this.camera.stopFollow();
        }
        
        // Remove old destroy listener if exists
        if (this.primaryHero && this._destroyListener) {
            this.primaryHero.off('destroy', this._destroyListener);
        }
        
        // Update reference
        this.primaryHero = target;

        // If static camera mode is enabled in the scene registry, skip follow
        // and center the camera on the party immediately. This lets us test a
        // non-following camera without changing call sites.
        try {
            const cameraStatic = this.scene?.registry?.get('camera_static');
            if (cameraStatic) {
                if (this.camera.followTarget) {
                    this.camera.stopFollow();
                }
                // Remove any previous destroy listener
                if (this._destroyListener && this.primaryHero && this.primaryHero.off) {
                    try { this.primaryHero.off('destroy', this._destroyListener); } catch (e) {}
                }

                // Compute party center and immediately set camera scroll to it
                const bounds = this.calculatePartyBounds();
                const centerX = (bounds && typeof bounds.centerX === 'number') ? bounds.centerX : (this.primaryHero.x || 0);
                const centerY = (bounds && typeof bounds.centerY === 'number') ? bounds.centerY : (this.primaryHero.y || 0);
                const camW = this.camera.width || (this.scene.scale && this.scene.scale.width) || 800;
                const camH = this.camera.height || (this.scene.scale && this.scene.scale.height) || 600;
                this.camera.setFollowOffset(0, 0);
                this.camera.setDeadzone(this.camera.width * this.deadzoneWidth, this.camera.height);
                this.camera.setScroll(centerX - camW / 2, centerY - camH / 2);
                Logger.info('CameraManager', 'Camera static mode active - centered on party');
                return;
            }
        } catch (err) {
            Logger.warn('CameraManager', 'Error checking camera_static flag', err?.message || err);
        }

        // Set up destroy listener
        this._destroyListener = () => {
            if (this.camera.followTarget === this.primaryHero) {
                this.camera.stopFollow();
            }
        };
        this.primaryHero.once('destroy', this._destroyListener);
        
        // Start follow - ensure sprite is ready
        // Phaser's startFollow() requires the sprite to be in the scene's display list and active
        if (!this.primaryHero.active) {
            this.primaryHero.setActive(true);
        }
        if (!this.primaryHero.visible) {
            this.primaryHero.setVisible(true);
        }
        
        // Ensure sprite is in display list (required for startFollow)
        if (!this.scene.children.list.includes(this.primaryHero)) {
            Logger.warn('CameraManager', 'Sprite not in display list, adding it');
            this.scene.add.existing(this.primaryHero);
        }
        
        // Reset camera follow state before starting
        if (this.camera.followTarget) {
            this.camera.stopFollow();
        }
        
        Logger.info('CameraManager', `Setting camera follow target at (${this.primaryHero.x}, ${this.primaryHero.y})`);
        
        // Set deadzone BEFORE starting follow (order might matter)
        this.camera.setDeadzone(this.camera.width * this.deadzoneWidth, this.camera.height);
        
        // Start follow with roundPixels=false for smooth movement
        this.camera.startFollow(this.primaryHero, true, this.smoothLerp, this.smoothLerp);
        // Immediately compute and apply follow offset so the camera doesn't jump far left
        try {
            const bounds = this.calculatePartyBounds();
            if (bounds && typeof bounds.centerX === 'number' && typeof bounds.centerY === 'number') {
                const offsetFromHeroX = bounds.centerX - this.primaryHero.x;
                const offsetFromHeroY = bounds.centerY - this.primaryHero.y;
                // Apply offset immediately (no lerp) to ensure initial visibility
                this.camera.setFollowOffset(offsetFromHeroX, offsetFromHeroY);

                // DON'T call setScroll() here - it cancels camera follow!
                // The camera will automatically position itself based on the follow target and offset
            }
        } catch (err) {
            // Don't break follow if bounds calculation fails
            Logger.warn('CameraManager', 'Failed to apply immediate follow offset', err.message);
        }
    }
    
    /**
     * Handle sprite reference update (e.g., when sprite is recreated)
     * @param {Phaser.GameObjects.Sprite} newSprite - New sprite reference
     */
    updatePrimaryHero(newSprite) {
        this.setFollowTarget(newSprite);
    }
    
    /**
     * Update party member sprites reference
     * @param {Array} partyMemberSprites - New party member sprites array
     */
    updatePartySprites(partyMemberSprites) {
        this.partyMemberSprites = partyMemberSprites || [];
    }
    
    /**
     * Stop camera follow (for scene transitions or cleanup)
     */
    stop() {
        // Remove destroy listener
        if (this.primaryHero && this._destroyListener) {
            this.primaryHero.off('destroy', this._destroyListener);
            this._destroyListener = null;
        }
        
        if (this.camera && this.camera.followTarget) {
            this.camera.stopFollow();
            Logger.info('CameraManager', 'Camera follow stopped');
        }
    }
}


/**
 * Party Manager Helper - Helper methods for party management
 * Extracted from GameScene to improve separation of concerns
 */

export class PartyManagerHelper {
    /**
     * Create a new PartyManagerHelper
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.lastVerificationLog = 0;
    }

    /**
     * Verify and fix party sprite states
     * Ensures all party sprites are visible, active, and properly positioned
     */
    verifyPartySprites() {
        if (!this.scene.partyMemberSprites || this.scene.partyMemberSprites.length === 0) {
            return; // Silently return if no sprites yet
        }

        // Throttle verification logging - only log every 5 seconds if all is well
        const now = Date.now();
        if (!this.lastVerificationLog || now - this.lastVerificationLog > 5000) {
            this.lastVerificationLog = now;
        } else {
            // Skip detailed logging if we just logged recently and everything is fine
            // But still perform the fixes silently
        }

        const cameraBounds = {
            x: this.scene.cameras.main.scrollX,
            y: this.scene.cameras.main.scrollY,
            width: this.scene.cameras.main.width,
            height: this.scene.cameras.main.height
        };

        const visibleSprites = [];
        const hiddenSprites = [];
        const offScreenSprites = [];

        this.scene.partyMemberSprites.forEach((pm, idx) => {
            const sprite = pm.sprite;
            const hero = pm.hero;

            if (!sprite) {
                return;
            }

            if (!hero) {
                return;
            }

            const isVisible = sprite.visible && sprite.active && !sprite.destroyed;
            const isInCamera = (
                sprite.x >= cameraBounds.x - 100 &&
                sprite.x <= cameraBounds.x + cameraBounds.width + 100 &&
                sprite.y >= cameraBounds.y - 100 &&
                sprite.y <= cameraBounds.y + cameraBounds.height + 100
            );

            if (!isVisible) {
                hiddenSprites.push({ idx, hero, sprite });
                // Force visibility immediately
                sprite.setVisible(true);
                sprite.setActive(true);
            }

            if (!isInCamera) {
                offScreenSprites.push({ idx, hero, sprite });
                // Fix positioning - move sprite to camera center
                const centerX = cameraBounds.x + cameraBounds.width / 2;
                const centerY = cameraBounds.y + cameraBounds.height / 2;
                sprite.setPosition(centerX, centerY);
            }

            if (isVisible && isInCamera) {
                visibleSprites.push({ idx, hero, sprite });
            }
        });

        // Log summary if we logged recently
        if (this.lastVerificationLog === now) {
            if (hiddenSprites.length > 0 || offScreenSprites.length > 0) {
                // Only log if there were issues
                if (hiddenSprites.length > 0) {
                }
                if (offScreenSprites.length > 0) {
                }
            }
        }

        // Ensure we have the expected number of visible sprites
        if (visibleSprites.length !== 5 && this.lastVerificationLog === now) {
        }

        // Debug: optionally draw visible markers for each party sprite to help
        // diagnose rendering/layering issues. Enable by setting
        // `this.scene.registry.set('debug_show_heroes', true)` at runtime.
        try {
            const showDebug = this.scene.registry?.get('debug_show_heroes');
            // Remove old markers
            if (this.scene.debugHeroMarkers && Array.isArray(this.scene.debugHeroMarkers)) {
                this.scene.debugHeroMarkers.forEach(m => { if (m && m.destroy) m.destroy(); });
            }
            this.scene.debugHeroMarkers = [];
            if (showDebug) {
                this.scene.partyMemberSprites.forEach((pm, idx) => {
                    const sprite = pm.sprite;
                    if (!sprite) return;
                    const marker = this.scene.add.rectangle(sprite.x, sprite.y, 16, 16, 0xff00ff, 0.9);
                    marker.setOrigin(0.5, 0.5);
                    marker.setDepth(5000);
                    marker.setScrollFactor(1);
                    this.scene.debugHeroMarkers.push(marker);
                });
            }
        } catch (err) {
            // ignore debug drawing failures
        }
    }

    /**
     * Get party sprite statistics
     * @returns {Object} Statistics about party sprites
     */
    getPartySpriteStats() {
        if (!this.scene.partyMemberSprites) {
            return { total: 0, visible: 0, active: 0, inScene: 0 };
        }

        const stats = {
            total: this.scene.partyMemberSprites.length,
            visible: 0,
            active: 0,
            inScene: 0,
            valid: 0
        };

        this.scene.partyMemberSprites.forEach(pm => {
            if (pm.sprite) {
                if (pm.sprite.visible) stats.visible++;
                if (pm.sprite.active) stats.active++;
                if (pm.sprite.scene) stats.inScene++;
                if (pm.sprite.visible && pm.sprite.active && !pm.sprite.destroyed) {
                    stats.valid++;
                }
            }
        });

        return stats;
    }

    /**
     * Validate party formation
     * @returns {Object} Validation results
     */
    validatePartyFormation() {
        const result = {
            isValid: true,
            issues: [],
            stats: this.getPartySpriteStats()
        };

        if (!this.scene.partyManager) {
            result.isValid = false;
            result.issues.push('No party manager');
            return result;
        }

        const partySize = this.scene.partyManager.getSize();
        if (partySize !== 5) {
            result.isValid = false;
            result.issues.push(`Party has ${partySize} members, expected 5`);
        }

        if (result.stats.total !== 5) {
            result.isValid = false;
            result.issues.push(`Found ${result.stats.total} party sprites, expected 5`);
        }

        if (result.stats.valid !== 5) {
            result.isValid = false;
            result.issues.push(`Only ${result.stats.valid} sprites are valid (visible, active, not destroyed)`);
        }

        return result;
    }
}


/**
 * GameScene Update Module
 * Contains optimized update loop logic with performance monitoring
 * Extracted from GameScene to improve maintainability and performance
 */

import { SafeExecutor, globalErrorHandler } from '../../utils/error-handling.js';

export class GameSceneUpdate {
    constructor(scene) {
        this.scene = scene;

        // Performance monitoring
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fpsUpdateInterval = 1000; // Update FPS every second
        this.performanceMetrics = {
            averageFrameTime: 0,
            frameTimeHistory: [],
            maxFrameHistory: 60, // Keep 60 frames of history
            updateStartTime: 0
        };

        // Update optimization
        this.updateThrottle = {
            uiUpdate: { lastUpdate: 0, interval: 100 }, // UI updates every 100ms
            worldUpdate: { lastUpdate: 0, interval: 16 }, // World updates every frame (60fps)
            combatUpdate: { lastUpdate: 0, interval: 16 }, // Combat updates every frame
            cameraUpdate: { lastUpdate: 0, interval: 16 } // Camera updates every frame
        };
    }

    /**
     * Main update loop with performance monitoring and optimization
     * @param {number} time - Current time
     * @param {number} delta - Time delta since last update
     */
    update(time, delta) {
        // Start performance monitoring
        const updateStartTime = performance.now();

        try {
            this.frameCount++;

            // Update performance metrics
            this.updatePerformanceMetrics(delta);

            // Throttled updates for performance
            this.updateWorld(time);
            this.updateCombat(time);
            this.updateCamera(time);
            this.updateUI(time);

            // Update animation manager
            if (this.scene.animationManager?.update) {
                SafeExecutor.execute(
                    () => this.scene.animationManager.update(time, delta),
                    null,
                    'GameSceneUpdate.animationManager'
                );
            }

            // Update particle manager
            if (this.scene.particleManager?.update) {
                SafeExecutor.execute(
                    () => this.scene.particleManager.update(time, delta),
                    null,
                    'GameSceneUpdate.particleManager'
                );
            }

        } catch (error) {
            globalErrorHandler.handle(error, 'GameSceneUpdate.main', { time, delta });
        }

        // End performance monitoring
        const updateEndTime = performance.now();
        const frameTime = updateEndTime - updateStartTime;
        this.recordFrameTime(frameTime);
    }

    /**
     * Update world systems with throttling
     * @param {number} time - Current time
     */
    updateWorld(time) {
        if (!this.shouldUpdate('worldUpdate', time)) return;

        SafeExecutor.execute(() => {
            // Update world manager
            if (this.scene.worldManager?.update) {
                this.scene.worldManager.update();
            }

            // Sync world manager tracking variable
            if (this.scene.worldManager && this.scene.hero) {
                this.scene.worldManager.hero = this.scene.hero;
            }

            // Update movement manager
            if (this.scene.movementManager?.update) {
                this.scene.movementManager.update(this.scene.time.now, this.scene.time.delta);
            }
        }, null, 'GameSceneUpdate.world');
    }

    /**
     * Update combat systems
     * @param {number} time - Current time
     */
    updateCombat(time) {
        if (!this.shouldUpdate('combatUpdate', time)) return;

        SafeExecutor.execute(() => {
            // Update combat handler (modularized combat logic)
            if (this.scene.combatHandler?.update) {
                this.scene.combatHandler.update(time, this.scene.time.delta);
            } else {
                // Fallback to legacy combat manager update if handler not available
                if (this.scene.combatManager?.update) {
                    this.scene.combatManager.update(time, this.scene.time.delta);
                }
            }

            // Update hero resource manager
            if (this.scene.heroResourceManager?.update) {
                this.scene.heroResourceManager.update(time, this.scene.time.delta);
            }

            // Update ability manager cooldowns
            if (this.scene.abilityManager?.updateCooldowns) {
                this.scene.abilityManager.updateCooldowns();
            }

            // Update bloodline manager (Phase 10: Bloodline System Integration)
            if (this.scene.bloodlineManager?.updateCooldowns) {
                this.scene.bloodlineManager.updateCooldowns(this.scene.time.deltaMS);
            }
            if (this.scene.bloodlineManager?.applyPassiveRegeneration) {
                // Apply passive regeneration to all heroes
                if (this.scene.partyManager) {
                    this.scene.partyManager.getHeroes().forEach(hero => {
                        this.scene.bloodlineManager.applyPassiveRegeneration(hero, this.scene.time.delta / 1000);
                    });
                }
            }
        }, null, 'GameSceneUpdate.combat');
    }

    /**
     * Update camera systems
     * @param {number} time - Current time
     */
    updateCamera(time) {
        if (!this.shouldUpdate('cameraUpdate', time)) return;

        SafeExecutor.execute(() => {
            // Update camera manager
            if (this.scene.cameraManager?.update) {
                this.scene.cameraManager.update();
            }
        }, null, 'GameSceneUpdate.camera');
    }

    /**
     * Update UI systems with throttling
     * @param {number} time - Current time
     */
    updateUI(time) {
        if (!this.shouldUpdate('uiUpdate', time)) return;

        SafeExecutor.execute(() => {
            // Update UI manager
            if (this.scene.uiManager?.update) {
                this.scene.uiManager.update(time, this.scene.time.delta);
            }

            // Update tooltip manager
            if (this.scene.tooltipManager?.update) {
                this.scene.tooltipManager.update();
            }

            // Update achievement manager
            if (this.scene.achievementManager?.update) {
                this.scene.achievementManager.update();
            }
        }, null, 'GameSceneUpdate.ui');
    }

    /**
     * Check if a system should update based on throttling
     * @param {string} systemName - Name of the system to check
     * @param {number} currentTime - Current time
     * @returns {boolean} True if system should update
     */
    shouldUpdate(systemName, currentTime) {
        const throttle = this.updateThrottle[systemName];
        if (!throttle) return true;

        if (currentTime - throttle.lastUpdate >= throttle.interval) {
            throttle.lastUpdate = currentTime;
            return true;
        }

        return false;
    }

    /**
     * Update performance metrics
     * @param {number} delta - Time delta
     */
    updatePerformanceMetrics(delta) {
        // Update FPS display periodically
        if (this.frameCount - this.lastFpsUpdate >= 60) { // Update every ~1 second at 60fps
            this.lastFpsUpdate = this.frameCount;

            // Could emit FPS update event here for UI display
            const fps = Math.round(1000 / delta);
            if (fps < 30) {
                console.warn(`Low FPS detected: ${fps}`);
            }
        }
    }

    /**
     * Record frame time for performance monitoring
     * @param {number} frameTime - Time taken for this frame
     */
    recordFrameTime(frameTime) {
        this.performanceMetrics.frameTimeHistory.push(frameTime);

        // Keep only recent history
        if (this.performanceMetrics.frameTimeHistory.length > this.performanceMetrics.maxFrameHistory) {
            this.performanceMetrics.frameTimeHistory.shift();
        }

        // Update average
        const sum = this.performanceMetrics.frameTimeHistory.reduce((a, b) => a + b, 0);
        this.performanceMetrics.averageFrameTime = sum / this.performanceMetrics.frameTimeHistory.length;
    }

    /**
     * Get performance statistics
     * @returns {Object} Performance metrics
     */
    getPerformanceStats() {
        const currentFps = this.scene.game?.loop?.actualFps || 0;
        const targetFps = this.scene.game?.loop?.targetFps || 60;

        return {
            currentFps: Math.round(currentFps),
            targetFps: targetFps,
            averageFrameTime: Math.round(this.performanceMetrics.averageFrameTime * 100) / 100,
            frameTimeHistory: this.performanceMetrics.frameTimeHistory.length,
            updateThrottle: { ...this.updateThrottle },
            frameCount: this.frameCount
        };
    }

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.performanceMetrics.frameTimeHistory = [];
        this.performanceMetrics.averageFrameTime = 0;

        // Reset throttle timers
        Object.keys(this.updateThrottle).forEach(key => {
            this.updateThrottle[key].lastUpdate = 0;
        });
    }

    /**
     * Optimize update loop for current performance conditions
     * @param {number} currentFps - Current FPS
     */
    optimizeForPerformance(currentFps) {
        // More aggressive optimization thresholds
        if (currentFps < 15) {
            // CRITICAL PERFORMANCE MODE: Disable heavy systems
            this.updateThrottle.uiUpdate.interval = 1000; // UI updates every 1 second
            this.updateThrottle.worldUpdate.interval = 120; // World updates every 2 seconds
            this.updateThrottle.combatUpdate.interval = 60; // Combat updates every 1 second
            this.updateThrottle.cameraUpdate.interval = 30; // Camera updates every 0.5 seconds

            // Disable particle effects entirely
            if (this.particleManager) {
                if (!this.particleManager._originalCreateExplosion) {
                    this.particleManager._originalCreateExplosion = this.particleManager.createExplosion;
                }
                this.particleManager.createExplosion = () => {}; // Disabled
                
                // Also disable other particle effects
                if (!this.particleManager._originalCreateFloatingText) {
                    this.particleManager._originalCreateFloatingText = this.particleManager.createFloatingText;
                }
                this.particleManager.createFloatingText = () => {}; // Disabled
            }
        } else if (currentFps < 25) {
            // REDUCED PERFORMANCE MODE: Significantly reduce updates
            this.updateThrottle.uiUpdate.interval = 500; // UI updates every 500ms
            this.updateThrottle.worldUpdate.interval = 60; // World updates every 1 second
            this.updateThrottle.combatUpdate.interval = 32; // Combat updates every 0.5 seconds
            this.updateThrottle.cameraUpdate.interval = 16; // Camera updates every frame

            // Reduce particle effects
            if (this.particleManager && this.particleManager._originalCreateExplosion) {
                this.particleManager.createExplosion = this.particleManager._originalCreateExplosion;
                this.particleManager._originalCreateExplosion = null;
            }
            if (this.particleManager && this.particleManager._originalCreateFloatingText) {
                this.particleManager.createFloatingText = this.particleManager._originalCreateFloatingText;
                this.particleManager._originalCreateFloatingText = null;
            }
        } else if (currentFps < 40) {
            // MODERATE PERFORMANCE MODE: Slightly reduce updates
            this.updateThrottle.uiUpdate.interval = 200; // UI updates every 200ms
            this.updateThrottle.worldUpdate.interval = 32; // World updates every 0.5 seconds
            this.updateThrottle.combatUpdate.interval = 16; // Combat updates every frame
            this.updateThrottle.cameraUpdate.interval = 16; // Camera updates every frame

            // Ensure particle effects are enabled
            if (this.particleManager && this.particleManager._originalCreateExplosion) {
                this.particleManager.createExplosion = this.particleManager._originalCreateExplosion;
                this.particleManager._originalCreateExplosion = null;
            }
            if (this.particleManager && this.particleManager._originalCreateFloatingText) {
                this.particleManager.createFloatingText = this.particleManager._originalCreateFloatingText;
                this.particleManager._originalCreateFloatingText = null;
            }
        } else {
            // NORMAL PERFORMANCE MODE: Full updates
            this.updateThrottle.uiUpdate.interval = 100;
            this.updateThrottle.worldUpdate.interval = 16;
            this.updateThrottle.combatUpdate.interval = 16;
            this.updateThrottle.cameraUpdate.interval = 16;

            // Ensure particle effects are enabled
            if (this.particleManager && this.particleManager._originalCreateExplosion) {
                this.particleManager.createExplosion = this.particleManager._originalCreateExplosion;
                this.particleManager._originalCreateExplosion = null;
            }
            if (this.particleManager && this.particleManager._originalCreateFloatingText) {
                this.particleManager.createFloatingText = this.particleManager._originalCreateFloatingText;
                this.particleManager._originalCreateFloatingText = null;
            }
        }
    }
}



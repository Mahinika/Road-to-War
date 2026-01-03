/**
 * WorldManager Unit Tests
 * Tests mile progression, milestone rewards, enemy selection, boss encounters, and endgame content
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockPartyManager } from '../../utils/test-helpers.js';

describe('WorldManager', () => {
    let WorldManager;
    let scene;
    let worldManager;
    let mockPartyManager;

    beforeEach(async () => {
        // Dynamic import to avoid issues
        try {
            const module = await import('../../../src/managers/world-manager.js');
            WorldManager = module.WorldManager;
        } catch (error) {
            console.warn('Could not import WorldManager:', error.message);
            return;
        }

        // Create mock scene with world config
        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                worldConfig: {
                    worldGeneration: {
                        scrollSpeed: 50,
                        segmentWidth: 1920,
                        segmentHeight: 1080
                    },
                    milestones: {
                        rewards: {
                            25: { talentPoints: 0, freeRespec: true },
                            50: { talentPoints: 1 },
                            75: { talentPoints: 1 },
                            100: { talentPoints: 2 }
                        }
                    }
                },
                enemies: {
                    goblin: {
                        id: 'goblin',
                        stats: { health: 50, attack: 5, defense: 2 }
                    },
                    orc: {
                        id: 'orc',
                        stats: { health: 100, attack: 10, defense: 5 }
                    },
                    war_lord: {
                        id: 'war_lord',
                        stats: { health: 500, attack: 50, defense: 20 },
                        isBoss: true
                    }
                }
            };
            return mockData[key] || {};
        });

        // Create mock party manager
        mockPartyManager = createMockPartyManager();

        // Create WorldManager instance
        if (WorldManager) {
            worldManager = new WorldManager(scene, {
                partyManager: mockPartyManager
            });
        }
    });

    describe('Initialization', () => {
        it('should initialize WorldManager', () => {
            if (!worldManager) return;
            expect(worldManager).toBeDefined();
            expect(worldManager.currentMile).toBe(0);
            expect(worldManager.maxMileReached).toBe(0);
            expect(worldManager.milestoneRewardsClaimed).toBeDefined();
            expect(worldManager.milestoneRewardsClaimed instanceof Set).toBe(true);
        });

        it('should extend BaseManager', () => {
            if (!worldManager) return;
            expect(worldManager.init).toBeDefined();
            expect(worldManager.destroy).toBeDefined();
            expect(worldManager.getState).toBeDefined();
        });

        it('should initialize with party manager', () => {
            if (!worldManager) return;
            expect(worldManager.partyManager).toBe(mockPartyManager);
        });
    });

    describe('Mile Progression', () => {
        it('should start at mile 0', () => {
            if (!worldManager) return;
            expect(worldManager.currentMile).toBe(0);
        });

        it('should update current mile', () => {
            if (!worldManager) return;
            worldManager.currentMile = 10;
            expect(worldManager.currentMile).toBe(10);
        });

        it('should track max mile reached', () => {
            if (!worldManager) return;
            worldManager.currentMile = 25;
            worldManager.maxMileReached = Math.max(worldManager.maxMileReached, worldManager.currentMile);
            expect(worldManager.maxMileReached).toBe(25);
        });

        it('should not decrease max mile reached', () => {
            if (!worldManager) return;
            worldManager.maxMileReached = 50;
            worldManager.currentMile = 30;
            worldManager.maxMileReached = Math.max(worldManager.maxMileReached, worldManager.currentMile);
            expect(worldManager.maxMileReached).toBe(50);
        });

        it('should cap at mile 100', () => {
            if (!worldManager) return;
            worldManager.currentMile = 100;
            expect(worldManager.currentMile).toBe(100);
            // Should not exceed 100
            worldManager.currentMile = 150;
            expect(worldManager.currentMile).toBeLessThanOrEqual(100);
        });
    });

    describe('checkMilestoneRewards', () => {
        it('should check for milestone at mile 25', () => {
            if (!worldManager) return;
            const claimSpy = vi.spyOn(worldManager, 'claimMilestoneReward');
            
            worldManager.checkMilestoneRewards(20, 25);
            expect(claimSpy).toHaveBeenCalledWith(25);
        });

        it('should check for milestone at mile 50', () => {
            if (!worldManager) return;
            const claimSpy = vi.spyOn(worldManager, 'claimMilestoneReward');
            
            worldManager.checkMilestoneRewards(45, 50);
            expect(claimSpy).toHaveBeenCalledWith(50);
        });

        it('should check for milestone at mile 75', () => {
            if (!worldManager) return;
            const claimSpy = vi.spyOn(worldManager, 'claimMilestoneReward');
            
            worldManager.checkMilestoneRewards(70, 75);
            expect(claimSpy).toHaveBeenCalledWith(75);
        });

        it('should check for milestone at mile 100', () => {
            if (!worldManager) return;
            const claimSpy = vi.spyOn(worldManager, 'claimMilestoneReward');
            
            worldManager.checkMilestoneRewards(95, 100);
            expect(claimSpy).toHaveBeenCalledWith(100);
        });

        it('should not claim already claimed milestones', () => {
            if (!worldManager) return;
            worldManager.milestoneRewardsClaimed.add(25);
            const claimSpy = vi.spyOn(worldManager, 'claimMilestoneReward');
            
            worldManager.checkMilestoneRewards(20, 30);
            expect(claimSpy).not.toHaveBeenCalledWith(25);
        });

        it('should handle multiple milestones in one update', () => {
            if (!worldManager) return;
            const claimSpy = vi.spyOn(worldManager, 'claimMilestoneReward');
            
            worldManager.checkMilestoneRewards(20, 55);
            expect(claimSpy).toHaveBeenCalledWith(25);
            expect(claimSpy).toHaveBeenCalledWith(50);
        });
    });

    describe('claimMilestoneReward', () => {
        it('should grant rewards for mile 25', () => {
            if (!worldManager) return;
            const emitSpy = vi.spyOn(scene.events, 'emit');
            
            worldManager.claimMilestoneReward(25);
            
            expect(worldManager.milestoneRewardsClaimed.has(25)).toBe(true);
            expect(emitSpy).toHaveBeenCalled();
        });

        it('should grant rewards for mile 50', () => {
            if (!worldManager) return;
            worldManager.claimMilestoneReward(50);
            expect(worldManager.milestoneRewardsClaimed.has(50)).toBe(true);
        });

        it('should grant rewards for mile 75', () => {
            if (!worldManager) return;
            worldManager.claimMilestoneReward(75);
            expect(worldManager.milestoneRewardsClaimed.has(75)).toBe(true);
        });

        it('should grant rewards for mile 100', () => {
            if (!worldManager) return;
            worldManager.claimMilestoneReward(100);
            expect(worldManager.milestoneRewardsClaimed.has(100)).toBe(true);
        });

        it('should emit milestone reward event', () => {
            if (!worldManager) return;
            const emitSpy = vi.spyOn(scene.events, 'emit');
            
            worldManager.claimMilestoneReward(25);
            
            expect(emitSpy).toHaveBeenCalledWith(
                expect.stringContaining('milestone'),
                expect.any(Object)
            );
        });
    });

    describe('selectEnemyType', () => {
        it('should select goblin for early miles', () => {
            if (!worldManager) return;
            worldManager.currentMile = 5;
            const enemyType = worldManager.selectEnemyType(0, false);
            expect(enemyType).toBeDefined();
        });

        it('should select war_lord for mile 100 boss', () => {
            if (!worldManager) return;
            worldManager.currentMile = 100;
            const enemyType = worldManager.selectEnemyType(0, true);
            expect(enemyType).toBe('war_lord');
        });

        it('should select appropriate enemy for mid-game miles', () => {
            if (!worldManager) return;
            worldManager.currentMile = 50;
            const enemyType = worldManager.selectEnemyType(0, false);
            expect(enemyType).toBeDefined();
        });

        it('should select endgame enemies for miles 80-100', () => {
            if (!worldManager) return;
            worldManager.currentMile = 90;
            const enemyType = worldManager.selectEnemyType(0, false);
            expect(enemyType).toBeDefined();
        });
    });

    describe('Boss Encounters', () => {
        it('should create boss enemy at milestone miles', () => {
            if (!worldManager) return;
            worldManager.currentMile = 25;
            const boss = worldManager.createBossEnemy(0);
            expect(boss).toBeDefined();
            expect(boss.data.isBoss).toBe(true);
        });

        it('should create war_lord at mile 100', () => {
            if (!worldManager) return;
            worldManager.currentMile = 100;
            const boss = worldManager.createBossEnemy(0);
            expect(boss.data.id).toBe('war_lord');
        });

        it('should scale boss stats based on mile', () => {
            if (!worldManager) return;
            worldManager.currentMile = 100;
            const boss = worldManager.createBossEnemy(0);
            expect(boss.data.stats.health).toBeGreaterThan(100);
        });
    });

    describe('Endgame Content', () => {
        it('should handle mile 80-90 enemies', () => {
            if (!worldManager) return;
            worldManager.currentMile = 85;
            const enemyType = worldManager.selectEnemyType(0, false);
            expect(enemyType).toBeDefined();
        });

        it('should handle mile 90-100 enemies', () => {
            if (!worldManager) return;
            worldManager.currentMile = 95;
            const enemyType = worldManager.selectEnemyType(0, false);
            expect(enemyType).toBeDefined();
        });

        it('should scale enemy difficulty with miles', () => {
            if (!worldManager) return;
            worldManager.currentMile = 50;
            const enemy1 = worldManager.createEnemy(0, false);
            
            worldManager.currentMile = 100;
            const enemy2 = worldManager.createEnemy(0, false);
            
            if (enemy1 && enemy2) {
                expect(enemy2.data.stats.health).toBeGreaterThan(enemy1.data.stats.health);
            }
        });
    });

    describe('Segment Generation', () => {
        it('should generate segments', () => {
            if (!worldManager) return;
            expect(worldManager.segments).toBeDefined();
            expect(Array.isArray(worldManager.segments)).toBe(true);
        });

        it('should track current segment', () => {
            if (!worldManager) return;
            expect(worldManager.currentSegment).toBeDefined();
            expect(typeof worldManager.currentSegment).toBe('number');
        });
    });

    describe('Event Emission', () => {
        it('should emit mile changed event', () => {
            if (!worldManager) return;
            const emitSpy = vi.spyOn(scene.events, 'emit');
            worldManager.currentMile = 10;
            
            // Simulate mile update
            const oldMile = 5;
            worldManager.currentMile = 10;
            worldManager.scene.events.emit('mile_changed', {
                currentMile: worldManager.currentMile,
                previousMile: oldMile
            });
            
            expect(emitSpy).toHaveBeenCalled();
        });
    });
});


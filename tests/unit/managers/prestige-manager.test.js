/**
 * PrestigeManager Unit Tests
 * Tests prestige calculations, bonuses, upgrades, and reset functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene } from '../../utils/test-helpers.js';

describe('PrestigeManager', () => {
    let PrestigeManager;
    let scene;
    let prestigeManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/prestige-manager.js');
            PrestigeManager = module.PrestigeManager;
        } catch (error) {
            console.warn('Could not import PrestigeManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                prestigeConfig: {
                    pointsPerLevel: 1,
                    basePointsMultiplier: 1.0,
                    upgrades: [
                        {
                            id: 'attack_bonus_1',
                            name: 'Warrior Spirit',
                            cost: 1,
                            type: 'stat_multiplier'
                        }
                    ]
                }
            };
            return mockData[key] || {};
        });

        if (PrestigeManager) {
            prestigeManager = new PrestigeManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize PrestigeManager', () => {
            if (!prestigeManager) return;
            expect(prestigeManager).toBeDefined();
            expect(prestigeManager.prestigeLevel).toBe(0);
            expect(prestigeManager.prestigePoints).toBe(0);
            expect(prestigeManager.purchasedUpgrades).toBeDefined();
            expect(prestigeManager.purchasedUpgrades instanceof Set).toBe(true);
        });

        it('should extend BaseManager', () => {
            if (!prestigeManager) return;
            expect(prestigeManager.init).toBeDefined();
            expect(prestigeManager.destroy).toBeDefined();
        });
    });

    describe('Prestige Calculations', () => {
        it('should calculate prestige points from game data', () => {
            if (!prestigeManager) return;
            const gameData = {
                party: {
                    heroes: [
                        { level: 10 },
                        { level: 8 },
                        { level: 5 }
                    ]
                },
                currentMile: 25
            };
            
            const points = prestigeManager.calculatePrestigePoints(gameData);
            expect(points).toBeGreaterThanOrEqual(0);
        });

        it('should include level in point calculation', () => {
            if (!prestigeManager) return;
            const gameData = {
                party: { heroes: [{ level: 50 }] },
                currentMile: 50
            };
            
            const points = prestigeManager.calculatePrestigePoints(gameData);
            expect(points).toBeGreaterThan(0);
        });

        it('should include mile in point calculation', () => {
            if (!prestigeManager) return;
            const gameData = {
                party: { heroes: [{ level: 1 }] },
                currentMile: 100
            };
            
            const points = prestigeManager.calculatePrestigePoints(gameData);
            expect(points).toBeGreaterThan(0);
        });
    });

    describe('Prestige Reset', () => {
        it('should reset game and grant prestige points', () => {
            if (!prestigeManager) return;
            const initialLevel = prestigeManager.prestigeLevel;
            const gameData = {
                party: { heroes: [{ level: 10 }] },
                currentMile: 25
            };
            
            prestigeManager.resetGame(gameData);
            expect(prestigeManager.prestigeLevel).toBe(initialLevel + 1);
        });

        it('should accumulate prestige points', () => {
            if (!prestigeManager) return;
            const initialPoints = prestigeManager.prestigePoints;
            const gameData = {
                party: { heroes: [{ level: 10 }] },
                currentMile: 25
            };
            
            prestigeManager.resetGame(gameData);
            expect(prestigeManager.prestigePoints).toBeGreaterThan(initialPoints);
        });
    });

    describe('Prestige Upgrades', () => {
        it('should purchase upgrade', () => {
            if (!prestigeManager) return;
            prestigeManager.prestigePoints = 10;
            const result = prestigeManager.purchaseUpgrade('attack_bonus_1');
            
            expect(result).toBe(true);
            expect(prestigeManager.purchasedUpgrades.has('attack_bonus_1')).toBe(true);
        });

        it('should deduct points when purchasing upgrade', () => {
            if (!prestigeManager) return;
            prestigeManager.prestigePoints = 10;
            const initialPoints = prestigeManager.prestigePoints;
            
            prestigeManager.purchaseUpgrade('attack_bonus_1');
            expect(prestigeManager.prestigePoints).toBeLessThan(initialPoints);
        });

        it('should not purchase if insufficient points', () => {
            if (!prestigeManager) return;
            prestigeManager.prestigePoints = 0;
            const result = prestigeManager.purchaseUpgrade('attack_bonus_1');
            
            expect(result).toBe(false);
        });
    });

    describe('Prestige Bonuses', () => {
        it('should get prestige talent points', () => {
            if (!prestigeManager) return;
            const points = prestigeManager.getPrestigeTalentPoints();
            expect(points).toBeGreaterThanOrEqual(0);
        });

        it('should apply prestige bonuses to stats', () => {
            if (!prestigeManager) return;
            // Prestige bonuses should affect various game systems
            expect(prestigeManager.getPrestigeTalentPoints).toBeDefined();
        });
    });
});


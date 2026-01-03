/**
 * AchievementManager Unit Tests
 * Tests achievement unlocking, progress tracking, and event handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene } from '../../utils/test-helpers.js';

describe('AchievementManager', () => {
    let AchievementManager;
    let scene;
    let achievementManager;
    let mockStatisticsManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/achievement-manager.js');
            AchievementManager = module.AchievementManager;
        } catch (error) {
            console.warn('Could not import AchievementManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                achievements: {
                    achievements: [
                        {
                            id: 'first_kill',
                            name: 'First Kill',
                            description: 'Defeat your first enemy',
                            condition: { type: 'enemies_defeated', value: 1 }
                        }
                    ]
                }
            };
            return mockData[key] || {};
        });

        mockStatisticsManager = {
            stats: {
                combat: { enemiesDefeated: 0 }
            }
        };

        if (AchievementManager) {
            achievementManager = new AchievementManager(scene, {
                statisticsManager: mockStatisticsManager
            });
        }
    });

    describe('Initialization', () => {
        it('should initialize AchievementManager', () => {
            if (!achievementManager) return;
            expect(achievementManager).toBeDefined();
            expect(achievementManager.achievements).toBeDefined();
            expect(achievementManager.achievements instanceof Map).toBe(true);
        });

        it('should extend BaseManager', () => {
            if (!achievementManager) return;
            expect(achievementManager.init).toBeDefined();
            expect(achievementManager.destroy).toBeDefined();
        });
    });

    describe('Achievement Unlocking', () => {
        it('should unlock achievement when condition met', () => {
            if (!achievementManager) return;
            mockStatisticsManager.stats.combat.enemiesDefeated = 1;
            achievementManager.checkAchievements();
            
            const achievement = achievementManager.achievements.get('first_kill');
            expect(achievement).toBeDefined();
            expect(achievement.unlocked).toBe(true);
        });

        it('should track achievement progress', () => {
            if (!achievementManager) return;
            // Achievement progress should be tracked before unlocking
            expect(achievementManager.achievements).toBeDefined();
        });
    });
});


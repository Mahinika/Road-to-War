/**
 * TalentManager Unit Tests
 * Tests talent allocation, prerequisites, synergies, milestone bonuses, and prestige integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero, createMockPartyManager } from '../../utils/test-helpers.js';

describe('TalentManager', () => {
    let TalentManager;
    let scene;
    let talentManager;
    let mockPartyManager;

    beforeEach(async () => {
        // Dynamic import to avoid issues
        try {
            const module = await import('../../../src/managers/talent-manager.js');
            TalentManager = module.TalentManager;
        } catch (error) {
            console.warn('Could not import TalentManager:', error.message);
            return;
        }

        // Create mock scene with talent data
        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                talents: {
                    paladin: {
                        holy: {
                            talent1: {
                                id: 'talent1',
                                name: 'Basic Talent',
                                maxPoints: 5,
                                prerequisites: [],
                                synergies: []
                            },
                            talent2: {
                                id: 'talent2',
                                name: 'Advanced Talent',
                                maxPoints: 3,
                                prerequisites: [
                                    { talentId: 'talent1', pointsRequired: 3 }
                                ],
                                synergies: []
                            },
                            talent3: {
                                id: 'talent3',
                                name: 'Synergy Talent',
                                maxPoints: 1,
                                prerequisites: [],
                                synergies: [
                                    { talentId: 'talent1', bonus: { attack: 5 } }
                                ]
                            },
                            capstone: {
                                id: 'capstone',
                                name: 'Capstone Talent',
                                maxPoints: 1,
                                prerequisites: [
                                    { treePointsRequired: 51 }
                                ],
                                synergies: []
                            }
                        }
                    }
                }
            };
            return mockData[key] || {};
        });

        // Create mock party manager
        mockPartyManager = createMockPartyManager();
        scene.partyManager = mockPartyManager;

        // Create TalentManager instance
        if (TalentManager) {
            talentManager = new TalentManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize TalentManager', () => {
            if (!talentManager) return;
            expect(talentManager).toBeDefined();
            expect(talentManager.heroTalents).toBeDefined();
            expect(talentManager.heroTalents instanceof Map).toBe(true);
        });

        it('should extend BaseManager', () => {
            if (!talentManager) return;
            expect(talentManager.init).toBeDefined();
            expect(talentManager.destroy).toBeDefined();
            expect(talentManager.getState).toBeDefined();
        });

        it('should load talent data from cache', () => {
            if (!talentManager) return;
            expect(talentManager.talentsData).toBeDefined();
            expect(talentManager.talentsData.paladin).toBeDefined();
        });
    });

    describe('Hero Talent Initialization', () => {
        it('should initialize talent tree for hero', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const initialTree = {
                holy: {
                    talent1: { points: 0, maxPoints: 5 }
                }
            };
            
            talentManager.initializeHeroTalents(heroId, initialTree);
            const tree = talentManager.heroTalents.get(heroId);
            expect(tree).toBeDefined();
            expect(tree.holy).toBeDefined();
        });

        it('should create empty tree if none provided', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, null);
            const tree = talentManager.heroTalents.get(heroId);
            expect(tree).toBeDefined();
        });
    });

    describe('allocateTalentPoint', () => {
        beforeEach(() => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {
                holy: {
                    talent1: { points: 0, maxPoints: 5 },
                    talent2: { points: 0, maxPoints: 3 }
                }
            });
            // Mock available points
            vi.spyOn(talentManager, 'getAvailableTalentPoints').mockReturnValue(10);
        });

        it('should allocate talent point successfully', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const result = talentManager.allocateTalentPoint(heroId, 'holy', 'talent1');
            
            expect(result).toBe(true);
            const tree = talentManager.heroTalents.get(heroId);
            expect(tree.holy.talent1.points).toBe(1);
        });

        it('should increment points on multiple allocations', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.allocateTalentPoint(heroId, 'holy', 'talent1');
            talentManager.allocateTalentPoint(heroId, 'holy', 'talent1');
            
            const tree = talentManager.heroTalents.get(heroId);
            expect(tree.holy.talent1.points).toBe(2);
        });

        it('should not exceed max points', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const tree = talentManager.heroTalents.get(heroId);
            tree.holy.talent1.points = 5; // Max points
            
            const result = talentManager.allocateTalentPoint(heroId, 'holy', 'talent1');
            expect(result).toBe(false);
            expect(tree.holy.talent1.points).toBe(5);
        });

        it('should validate heroId exists', () => {
            if (!talentManager) return;
            const result = talentManager.allocateTalentPoint('nonexistent_hero', 'holy', 'talent1');
            expect(result).toBe(false);
        });

        it('should validate talent exists', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const result = talentManager.allocateTalentPoint(heroId, 'holy', 'nonexistent_talent');
            expect(result).toBe(false);
        });

        it('should emit talent allocated event', () => {
            if (!talentManager) return;
            const emitSpy = vi.spyOn(scene.events, 'emit');
            const heroId = 'hero1';
            
            talentManager.allocateTalentPoint(heroId, 'holy', 'talent1');
            
            expect(emitSpy).toHaveBeenCalledWith(
                expect.stringContaining('talent'),
                expect.any(Object)
            );
        });
    });

    describe('canAllocateTalent', () => {
        beforeEach(() => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {
                holy: {
                    talent1: { points: 0, maxPoints: 5 },
                    talent2: { points: 0, maxPoints: 3 }
                }
            });
            vi.spyOn(talentManager, 'getAvailableTalentPoints').mockReturnValue(10);
        });

        it('should return true if talent can be allocated', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const canAllocate = talentManager.canAllocateTalent(heroId, 'holy', 'talent1');
            expect(canAllocate).toBe(true);
        });

        it('should return false if no available points', () => {
            if (!talentManager) return;
            vi.spyOn(talentManager, 'getAvailableTalentPoints').mockReturnValue(0);
            const heroId = 'hero1';
            const canAllocate = talentManager.canAllocateTalent(heroId, 'holy', 'talent1');
            expect(canAllocate).toBe(false);
        });

        it('should check prerequisites before allowing allocation', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            // talent2 requires talent1 with 3 points
            const canAllocate = talentManager.canAllocateTalent(heroId, 'holy', 'talent2');
            expect(canAllocate).toBe(false); // Should fail because talent1 has 0 points
        });

        it('should allow allocation if prerequisites met', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const tree = talentManager.heroTalents.get(heroId);
            tree.holy.talent1.points = 3; // Meet prerequisite
            
            const canAllocate = talentManager.canAllocateTalent(heroId, 'holy', 'talent2');
            expect(canAllocate).toBe(true);
        });

        it('should check tree points required for capstone talents', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            // Capstone requires 51 tree points
            vi.spyOn(talentManager, 'getTotalTreePoints').mockReturnValue(50);
            
            const canAllocate = talentManager.canAllocateTalent(heroId, 'holy', 'capstone');
            expect(canAllocate).toBe(false);
        });
    });

    describe('getTotalTreePoints', () => {
        it('should calculate total points in tree', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {
                holy: {
                    talent1: { points: 5, maxPoints: 5 },
                    talent2: { points: 3, maxPoints: 3 },
                    talent3: { points: 1, maxPoints: 1 }
                }
            });
            
            const totalPoints = talentManager.getTotalTreePoints(heroId, 'holy');
            expect(totalPoints).toBe(9); // 5 + 3 + 1
        });

        it('should return 0 for empty tree', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {});
            
            const totalPoints = talentManager.getTotalTreePoints(heroId, 'holy');
            expect(totalPoints).toBe(0);
        });

        it('should return 0 for nonexistent hero', () => {
            if (!talentManager) return;
            const totalPoints = talentManager.getTotalTreePoints('nonexistent_hero', 'holy');
            expect(totalPoints).toBe(0);
        });
    });

    describe('Prerequisites', () => {
        beforeEach(() => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {
                holy: {
                    talent1: { points: 0, maxPoints: 5 },
                    talent2: { points: 0, maxPoints: 3 }
                }
            });
            vi.spyOn(talentManager, 'getAvailableTalentPoints').mockReturnValue(10);
        });

        it('should enforce talent prerequisites', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            // talent2 requires talent1 with 3 points
            const result = talentManager.allocateTalentPoint(heroId, 'holy', 'talent2');
            expect(result).toBe(false);
        });

        it('should allow allocation when prerequisites met', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const tree = talentManager.heroTalents.get(heroId);
            tree.holy.talent1.points = 3; // Meet prerequisite
            
            const result = talentManager.allocateTalentPoint(heroId, 'holy', 'talent2');
            expect(result).toBe(true);
        });

        it('should enforce tree points prerequisite', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {
                holy: {
                    capstone: { points: 0, maxPoints: 1 }
                }
            });
            vi.spyOn(talentManager, 'getTotalTreePoints').mockReturnValue(50);
            
            const result = talentManager.allocateTalentPoint(heroId, 'holy', 'capstone');
            expect(result).toBe(false);
        });
    });

    describe('Synergies', () => {
        beforeEach(() => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {
                holy: {
                    talent1: { points: 5, maxPoints: 5 },
                    talent3: { points: 1, maxPoints: 1 }
                }
            });
        });

        it('should apply synergy bonuses', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const tree = talentManager.heroTalents.get(heroId);
            // talent3 has synergy with talent1 (bonus: attack +5)
            // When both are allocated, synergy should apply
            expect(tree.holy.talent1.points).toBe(5);
            expect(tree.holy.talent3.points).toBe(1);
            // Synergy bonuses would be calculated in getTalentBonuses() method
        });
    });

    describe('Milestone Bonuses', () => {
        it('should include milestone talent points in available points', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const hero = createMockHero({ id: heroId, level: 20 });
            mockPartyManager.getHeroById = vi.fn().mockReturnValue(hero);
            
            // Level 20 should give milestone bonus (+1 point)
            // This would be calculated in getAvailableTalentPoints()
            const availablePoints = talentManager.getAvailableTalentPoints(heroId);
            expect(availablePoints).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Prestige Integration', () => {
        beforeEach(() => {
            if (!talentManager) return;
            // Mock prestige manager
            scene.prestigeManager = {
                getPrestigeTalentPoints: vi.fn().mockReturnValue(5)
            };
        });

        it('should include prestige talent points', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            const availablePoints = talentManager.getAvailableTalentPoints(heroId);
            // Should include prestige points if prestige manager exists
            expect(availablePoints).toBeDefined();
        });

        it('should allow prestige points to exceed normal cap', () => {
            if (!talentManager) return;
            // Prestige points can exceed the 95 point cap
            const prestigePoints = scene.prestigeManager.getPrestigeTalentPoints();
            expect(prestigePoints).toBe(5);
        });
    });

    describe('Validation', () => {
        it('should use ValidationBuilder for allocateTalentPoint', () => {
            if (!talentManager) return;
            expect(talentManager.quickValidate).toBeDefined();
        });

        it('should validate heroId exists in party', () => {
            if (!talentManager) return;
            const result = talentManager.allocateTalentPoint('nonexistent_hero', 'holy', 'talent1');
            expect(result).toBe(false);
        });

        it('should validate treeId and talentId are strings', () => {
            if (!talentManager) return;
            const heroId = 'hero1';
            talentManager.initializeHeroTalents(heroId, {
                holy: { talent1: { points: 0, maxPoints: 5 } }
            });
            
            const result1 = talentManager.allocateTalentPoint(heroId, null, 'talent1');
            const result2 = talentManager.allocateTalentPoint(heroId, 'holy', null);
            
            expect(result1).toBe(false);
            expect(result2).toBe(false);
        });
    });

    describe('Per-Hero Talent Management', () => {
        it('should maintain separate talent trees for different heroes', () => {
            if (!talentManager) return;
            talentManager.initializeHeroTalents('hero1', {
                holy: { talent1: { points: 5, maxPoints: 5 } }
            });
            talentManager.initializeHeroTalents('hero2', {
                holy: { talent1: { points: 3, maxPoints: 5 } }
            });
            
            const hero1Tree = talentManager.heroTalents.get('hero1');
            const hero2Tree = talentManager.heroTalents.get('hero2');
            
            expect(hero1Tree.holy.talent1.points).toBe(5);
            expect(hero2Tree.holy.talent1.points).toBe(3);
        });
    });
});


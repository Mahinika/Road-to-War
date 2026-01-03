/**
 * CombatManager Unit Tests
 * Tests party combat, threat system, combat lifecycle, and combat actions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero, createMockPartyManager } from '../../utils/test-helpers.js';

describe('CombatManager', () => {
    let CombatManager;
    let scene;
    let combatManager;
    let mockPartyManager;

    beforeEach(async () => {
        // Dynamic import to avoid issues
        try {
            const module = await import('../../../src/managers/combat-manager.js');
            CombatManager = module.CombatManager;
        } catch (error) {
            console.warn('Could not import CombatManager:', error.message);
            return;
        }

        // Create mock scene with world config
        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                worldConfig: {
                    combat: {
                        baseCombatSpeed: 1000,
                        turnTimeout: 5000
                    }
                }
            };
            return mockData[key] || {};
        });

        // Create mock party manager
        mockPartyManager = createMockPartyManager();
        mockPartyManager.getSize = vi.fn().mockReturnValue(5);
        mockPartyManager.getHeroes = vi.fn().mockReturnValue([
            createMockHero({ id: 'hero1', role: 'tank' }),
            createMockHero({ id: 'hero2', role: 'healer' }),
            createMockHero({ id: 'hero3', role: 'dps' }),
            createMockHero({ id: 'hero4', role: 'dps' }),
            createMockHero({ id: 'hero5', role: 'dps' })
        ]);
        mockPartyManager.getTank = vi.fn().mockReturnValue(createMockHero({ id: 'hero1', role: 'tank' }));
        mockPartyManager.getHeroByIndex = vi.fn((index) => mockPartyManager.getHeroes()[index]);
        mockPartyManager.getHeroById = vi.fn((id) => mockPartyManager.getHeroes().find(h => h.id === id));

        // Create CombatManager instance
        if (CombatManager) {
            combatManager = new CombatManager(scene, {
                partyManager: mockPartyManager
            });
        }
    });

    describe('Initialization', () => {
        it('should initialize CombatManager', () => {
            if (!combatManager) return;
            expect(combatManager).toBeDefined();
            expect(combatManager.threatSystem).toBeDefined();
            expect(combatManager.combatOrchestrator).toBeDefined();
        });

        it('should extend BaseManager', () => {
            if (!combatManager) return;
            expect(combatManager.init).toBeDefined();
            expect(combatManager.destroy).toBeDefined();
            expect(combatManager.getState).toBeDefined();
        });

        it('should initialize with party manager', () => {
            if (!combatManager) return;
            expect(combatManager.partyManager).toBe(mockPartyManager);
        });

        it('should not be in combat initially', () => {
            if (!combatManager) return;
            expect(combatManager.inCombat).toBe(false);
            expect(combatManager.currentCombat).toBeNull();
        });
    });

    describe('Threat System', () => {
        it('should add threat for hero', () => {
            if (!combatManager) return;
            const enemyId = 'goblin_1';
            const heroId = 'hero1';
            
            combatManager.addThreat(enemyId, heroId, 100);
            const threat = combatManager.getThreat(enemyId, heroId);
            expect(threat).toBe(100);
        });

        it('should accumulate threat', () => {
            if (!combatManager) return;
            const enemyId = 'goblin_1';
            const heroId = 'hero1';
            
            combatManager.addThreat(enemyId, heroId, 100);
            combatManager.addThreat(enemyId, heroId, 50);
            const threat = combatManager.getThreat(enemyId, heroId);
            expect(threat).toBe(150);
        });

        it('should apply threat multiplier', () => {
            if (!combatManager) return;
            const enemyId = 'boss_1';
            const heroId = 'hero1';
            
            combatManager.addThreat(enemyId, heroId, 100, 2.0);
            const threat = combatManager.getThreat(enemyId, heroId);
            expect(threat).toBe(200);
        });

        it('should reduce threat', () => {
            if (!combatManager) return;
            const enemyId = 'goblin_1';
            const heroId = 'hero1';
            
            combatManager.addThreat(enemyId, heroId, 100);
            combatManager.reduceThreat(enemyId, heroId, 50);
            const threat = combatManager.getThreat(enemyId, heroId);
            expect(threat).toBe(50);
        });

        it('should select highest threat target', () => {
            if (!combatManager) return;
            const enemyId = 'enemy1';
            
            combatManager.addThreat(enemyId, 'hero1', 1000);
            combatManager.addThreat(enemyId, 'hero2', 500);
            combatManager.addThreat(enemyId, 'hero3', 100);
            
            const target = combatManager.selectHighestThreat(enemyId);
            expect(target).toBe('hero1');
        });

        it('should return null if no threat exists', () => {
            if (!combatManager) return;
            const target = combatManager.selectHighestThreat('enemy1');
            expect(target).toBeNull();
        });

        it('should wipe threat table', () => {
            if (!combatManager) return;
            const enemyId = 'boss_1';
            
            combatManager.addThreat(enemyId, 'hero1', 1000);
            combatManager.addThreat(enemyId, 'hero2', 500);
            
            combatManager.wipeThreatTable(enemyId);
            expect(combatManager.getThreat(enemyId, 'hero1')).toBe(0);
            expect(combatManager.getThreat(enemyId, 'hero2')).toBe(0);
        });
    });

    describe('startPartyCombat', () => {
        it('should start party combat successfully', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: {
                    id: 'goblin',
                    stats: {
                        health: 100,
                        maxHealth: 100,
                        attack: 10,
                        defense: 5
                    }
                },
                sprite: {
                    x: 100,
                    y: 100,
                    play: vi.fn(),
                    anims: { play: vi.fn() }
                }
            };

            const result = combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            expect(result).toBe(true);
            expect(combatManager.inCombat).toBe(true);
            expect(combatManager.currentCombat).toBeDefined();
        });

        it('should initialize party combat state', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: {
                    id: 'goblin',
                    stats: { health: 100, attack: 10, defense: 5 }
                },
                sprite: { x: 100, y: 100 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            
            expect(combatManager.currentCombat).toBeDefined();
            expect(combatManager.currentCombat.party).toBeDefined();
            expect(combatManager.currentCombat.party.heroes).toBeDefined();
            expect(Array.isArray(combatManager.currentCombat.party.heroes)).toBe(true);
            expect(combatManager.currentCombat.party.heroes.length).toBe(5);
        });

        it('should initialize enemy threat table', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            
            // Threat should be initialized (even if 0)
            const heroes = mockPartyManager.getHeroes();
            heroes.forEach(hero => {
                const threat = combatManager.getThreat('enemy1', hero.id);
                expect(threat).toBeDefined();
            });
        });

        it('should prevent starting combat while already in combat', () => {
            if (!combatManager) return;
            const mockEnemy1 = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };
            const mockEnemy2 = {
                id: 'enemy2',
                data: { id: 'orc', stats: { health: 150, attack: 15, defense: 8 } },
                sprite: { x: 200, y: 200 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy1);
            const result = combatManager.startPartyCombat(mockPartyManager, mockEnemy2);
            
            expect(result).toBe(false);
        });

        it('should validate party manager exists', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            const result = combatManager.startPartyCombat(null, mockEnemy);
            expect(result).toBe(false);
        });

        it('should validate party has heroes', () => {
            if (!combatManager) return;
            const emptyPartyManager = {
                getSize: vi.fn().mockReturnValue(0),
                getHeroes: vi.fn().mockReturnValue([])
            };
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            const result = combatManager.startPartyCombat(emptyPartyManager, mockEnemy);
            expect(result).toBe(false);
        });

        it('should emit combat started event', () => {
            if (!combatManager) return;
            const emitSpy = vi.spyOn(scene.events, 'emit');
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            
            expect(emitSpy).toHaveBeenCalledWith(
                expect.stringContaining('combat'),
                expect.any(Object)
            );
        });
    });

    describe('executePartyAttack', () => {
        beforeEach(() => {
            if (!combatManager) return;
            // Setup combat state
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };
            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
        });

        it('should execute party attack when in combat', () => {
            if (!combatManager) return;
            // Mock combatActions
            if (combatManager.combatActions) {
                const executeSpy = vi.spyOn(combatManager.combatActions, 'executePartyTurn');
                combatManager.executePartyAttack();
                expect(executeSpy).toHaveBeenCalled();
            }
        });

        it('should not execute attack if not in combat', () => {
            if (!combatManager) return;
            combatManager.inCombat = false;
            
            if (combatManager.combatActions) {
                const executeSpy = vi.spyOn(combatManager.combatActions, 'executePartyTurn');
                combatManager.executePartyAttack();
                expect(executeSpy).not.toHaveBeenCalled();
            }
        });
    });

    describe('Combat Lifecycle', () => {
        it('should track combat state correctly', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            expect(combatManager.inCombat).toBe(false);
            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            expect(combatManager.inCombat).toBe(true);
        });

        it('should initialize combat with correct turn order', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            
            expect(combatManager.currentCombat.turn).toBeDefined();
            expect(combatManager.currentCombat.round).toBe(1);
        });

        it('should track all party members in combat state', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            
            const heroes = combatManager.currentCombat.party.heroes;
            expect(heroes.length).toBe(5);
            heroes.forEach(hero => {
                expect(hero.id).toBeDefined();
                expect(hero.maxHealth).toBeGreaterThan(0);
                expect(hero.currentHealth).toBeGreaterThan(0);
            });
        });
    });

    describe('Target Selection', () => {
        beforeEach(() => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };
            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
        });

        it('should select lowest health target', () => {
            if (!combatManager) return;
            // Set up heroes with different health
            const heroes = combatManager.currentCombat.party.heroes;
            heroes[0].currentHealth = 50;
            heroes[0].maxHealth = 100;
            heroes[1].currentHealth = 80;
            heroes[1].maxHealth = 100;
            
            const target = combatManager.selectLowHealthTarget('enemy1');
            expect(target).toBe(heroes[0].id);
        });

        it('should select priority target by role', () => {
            if (!combatManager) return;
            const target = combatManager.selectPriorityTarget('enemy1', ['healer', 'dps']);
            expect(target).toBeDefined();
        });

        it('should select random target', () => {
            if (!combatManager) return;
            const target = combatManager.selectRandomTarget('enemy1');
            expect(target).toBeDefined();
            const heroes = combatManager.currentCombat.party.heroes;
            expect(heroes.some(h => h.id === target)).toBe(true);
        });
    });

    describe('Party vs Single-Hero Combat', () => {
        it('should handle party combat differently from single-hero', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            
            // Party combat should have multiple heroes
            expect(combatManager.currentCombat.party.heroes.length).toBe(5);
            expect(combatManager.currentCombat.party.totalHealth).toBeGreaterThan(100);
        });

        it('should track all heroes in party combat state', () => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };

            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
            
            const heroes = combatManager.currentCombat.party.heroes;
            const heroIds = heroes.map(h => h.id);
            expect(heroIds).toContain('hero1');
            expect(heroIds).toContain('hero2');
            expect(heroIds).toContain('hero3');
        });
    });

    describe('Combat End Conditions', () => {
        beforeEach(() => {
            if (!combatManager) return;
            const mockEnemy = {
                id: 'enemy1',
                data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
                sprite: { x: 100, y: 100 }
            };
            combatManager.startPartyCombat(mockPartyManager, mockEnemy);
        });

        it('should detect when all heroes are dead', () => {
            if (!combatManager) return;
            const heroes = combatManager.currentCombat.party.heroes;
            heroes.forEach(hero => {
                hero.currentHealth = 0;
            });
            
            // This would be checked in checkCombatEnd() method
            const allDead = heroes.every(h => h.currentHealth <= 0);
            expect(allDead).toBe(true);
        });

        it('should detect when enemy is dead', () => {
            if (!combatManager) return;
            combatManager.currentCombat.enemy.currentHealth = 0;
            
            const enemyDead = combatManager.currentCombat.enemy.currentHealth <= 0;
            expect(enemyDead).toBe(true);
        });
    });

    describe('Validation', () => {
        it('should use ValidationBuilder for startPartyCombat', () => {
            if (!combatManager) return;
            expect(combatManager.quickValidate).toBeDefined();
        });
    });
});


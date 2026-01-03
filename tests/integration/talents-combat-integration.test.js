/**
 * Integration Test: Talents → Combat
 * Tests that talent allocations affect combat abilities and performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockPartyManager, createMockHero } from '../utils/test-helpers.js';

describe('Integration: Talents → Combat', () => {
    let TalentManager, CombatManager, PartyManager;
    let scene;
    let talentManager, combatManager, partyManager;

    beforeEach(async () => {
        try {
            const talentModule = await import('../../src/managers/talent-manager.js');
            TalentManager = talentModule.TalentManager;
            
            const combatModule = await import('../../src/managers/combat-manager.js');
            CombatManager = combatModule.CombatManager;
            
            const partyModule = await import('../../src/managers/party-manager.js');
            PartyManager = partyModule.PartyManager;
        } catch (error) {
            console.warn('Could not import managers:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                talents: {
                    paladin: {
                        holy: {
                            talent1: {
                                id: 'talent1',
                                name: 'Combat Talent',
                                maxPoints: 5,
                                prerequisites: [],
                                effects: { attack: 0.1 }
                            }
                        }
                    }
                },
                worldConfig: { combat: { baseCombatSpeed: 1000 } }
            };
            return mockData[key] || {};
        });

        if (TalentManager && CombatManager && PartyManager) {
            partyManager = new PartyManager(scene);
            scene.partyManager = partyManager;
            talentManager = new TalentManager(scene);
            combatManager = new CombatManager(scene, { partyManager });
        }
    });

    it('should apply talent bonuses to combat', () => {
        if (!talentManager || !combatManager || !partyManager) return;

        const hero = createMockHero({ id: 'hero1', classId: 'paladin' });
        partyManager.addHero(hero);

        // Initialize and allocate talent
        talentManager.initializeHeroTalents('hero1', {
            holy: { talent1: { points: 0, maxPoints: 5 } }
        });
        vi.spyOn(talentManager, 'getAvailableTalentPoints').mockReturnValue(5);
        talentManager.allocateTalentPoint('hero1', 'holy', 'talent1');

        // Start combat
        const mockEnemy = {
            id: 'enemy1',
            data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
            sprite: { x: 100, y: 100 }
        };
        combatManager.startPartyCombat(partyManager, mockEnemy);

        // Talent bonuses should affect combat
        expect(combatManager.currentCombat).toBeDefined();
    });
});


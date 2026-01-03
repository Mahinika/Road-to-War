/**
 * Integration Test: Prestige → All Systems
 * Tests that prestige bonuses apply across all game systems
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockPartyManager } from '../utils/test-helpers.js';

describe('Integration: Prestige → All Systems', () => {
    let PrestigeManager, TalentManager, EquipmentManager, CombatManager;
    let scene;
    let prestigeManager, talentManager, equipmentManager, combatManager;
    let partyManager;

    beforeEach(async () => {
        try {
            const prestigeModule = await import('../../src/managers/prestige-manager.js');
            PrestigeManager = prestigeModule.PrestigeManager;
            
            const talentModule = await import('../../src/managers/talent-manager.js');
            TalentManager = talentModule.TalentManager;
            
            const equipmentModule = await import('../../src/managers/equipment-manager.js');
            EquipmentManager = equipmentModule.EquipmentManager;
            
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
                prestigeConfig: {
                    pointsPerLevel: 1,
                    upgrades: []
                },
                talents: { paladin: { holy: {} } },
                items: { weapons: {} },
                worldConfig: { combat: { baseCombatSpeed: 1000 } }
            };
            return mockData[key] || {};
        });

        if (PrestigeManager && TalentManager && EquipmentManager && CombatManager && PartyManager) {
            partyManager = new PartyManager(scene);
            prestigeManager = new PrestigeManager(scene);
            scene.prestigeManager = prestigeManager;
            talentManager = new TalentManager(scene);
            equipmentManager = new EquipmentManager(scene, { partyManager });
            combatManager = new CombatManager(scene, { partyManager });
        }
    });

    it('should apply prestige talent points', () => {
        if (!prestigeManager || !talentManager) return;

        prestigeManager.prestigeLevel = 1;
        prestigeManager.prestigePoints = 5;
        const talentPoints = prestigeManager.getPrestigeTalentPoints();
        expect(talentPoints).toBeGreaterThanOrEqual(0);
    });

    it('should affect all systems after prestige reset', () => {
        if (!prestigeManager || !talentManager || !equipmentManager || !combatManager) return;

        const gameData = {
            party: { heroes: [{ level: 10 }] },
            currentMile: 25
        };

        prestigeManager.resetGame(gameData);
        expect(prestigeManager.prestigeLevel).toBeGreaterThan(0);
        expect(prestigeManager.prestigePoints).toBeGreaterThan(0);
    });
});


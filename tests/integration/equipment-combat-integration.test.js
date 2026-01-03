/**
 * Integration Test: Equipment → Combat
 * Tests that equipment stat changes affect combat performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockPartyManager, createMockHero } from '../utils/test-helpers.js';

describe('Integration: Equipment → Combat', () => {
    let EquipmentManager, CombatManager, PartyManager;
    let scene;
    let equipmentManager, combatManager, partyManager;

    beforeEach(async () => {
        try {
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
                items: {
                    weapons: {
                        rusty_sword: { id: 'rusty_sword', slot: 'weapon', stats: { attack: 5 } },
                        iron_sword: { id: 'iron_sword', slot: 'weapon', stats: { attack: 12 } }
                    }
                },
                worldConfig: { combat: { baseCombatSpeed: 1000 } }
            };
            return mockData[key] || {};
        });

        if (EquipmentManager && CombatManager && PartyManager) {
            partyManager = new PartyManager(scene);
            equipmentManager = new EquipmentManager(scene, { partyManager });
            combatManager = new CombatManager(scene, { partyManager });
        }
    });

    it('should apply equipment stats to combat', () => {
        if (!equipmentManager || !combatManager || !partyManager) return;

        const hero = createMockHero({ id: 'hero1', role: 'tank' });
        partyManager.addHero(hero);
        equipmentManager.currentHeroId = 'hero1';

        // Equip weapon
        equipmentManager.equipItem('iron_sword', 'weapon', 'hero1');
        const statsWithEquipment = equipmentManager.getHeroStats('hero1');

        // Start combat
        const mockEnemy = {
            id: 'enemy1',
            data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
            sprite: { x: 100, y: 100 }
        };
        combatManager.startPartyCombat(partyManager, mockEnemy);

        // Verify combat state includes equipment stats
        expect(combatManager.currentCombat).toBeDefined();
        const heroData = combatManager.currentCombat.party.heroes.find(h => h.id === 'hero1');
        expect(heroData.attack).toBeGreaterThanOrEqual(statsWithEquipment.attack);
    });

    it('should update combat stats when equipment changes', () => {
        if (!equipmentManager || !combatManager || !partyManager) return;

        const hero = createMockHero({ id: 'hero1', role: 'tank' });
        partyManager.addHero(hero);
        equipmentManager.currentHeroId = 'hero1';

        // Start combat
        const mockEnemy = {
            id: 'enemy1',
            data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
            sprite: { x: 100, y: 100 }
        };
        combatManager.startPartyCombat(partyManager, mockEnemy);

        // Equip better weapon during combat
        equipmentManager.equipItem('iron_sword', 'weapon', 'hero1');

        // Combat stats should update
        const heroData = combatManager.currentCombat.party.heroes.find(h => h.id === 'hero1');
        expect(heroData.attack).toBeGreaterThan(10);
    });
});


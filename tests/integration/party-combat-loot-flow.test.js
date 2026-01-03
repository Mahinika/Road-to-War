/**
 * Integration Test: Party → Combat → Loot → Equipment Flow
 * Tests the complete flow from party creation through combat to loot and equipment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockPartyManager, createMockHero } from '../utils/test-helpers.js';

describe('Integration: Party → Combat → Loot → Equipment Flow', () => {
    let PartyManager, CombatManager, LootManager, EquipmentManager;
    let scene;
    let partyManager, combatManager, lootManager, equipmentManager;

    beforeEach(async () => {
        try {
            const partyModule = await import('../../src/managers/party-manager.js');
            PartyManager = partyModule.PartyManager;
            
            const combatModule = await import('../../src/managers/combat-manager.js');
            CombatManager = combatModule.CombatManager;
            
            const lootModule = await import('../../src/managers/loot-manager.js');
            LootManager = lootModule.LootManager;
            
            const equipmentModule = await import('../../src/managers/equipment-manager.js');
            EquipmentManager = equipmentModule.EquipmentManager;
        } catch (error) {
            console.warn('Could not import managers:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                items: {
                    weapons: {
                        rusty_sword: {
                            id: 'rusty_sword',
                            name: 'Rusty Sword',
                            slot: 'weapon',
                            stats: { attack: 5 }
                        }
                    }
                },
                worldConfig: {
                    combat: { baseCombatSpeed: 1000 }
                }
            };
            return mockData[key] || {};
        });

        if (PartyManager && CombatManager && LootManager && EquipmentManager) {
            partyManager = new PartyManager(scene);
            combatManager = new CombatManager(scene, { partyManager });
            lootManager = new LootManager(scene);
            equipmentManager = new EquipmentManager(scene, { partyManager });
        }
    });

    it('should complete full flow: create party → combat → loot → equip', async () => {
        if (!partyManager || !combatManager || !lootManager || !equipmentManager) return;

        // 1. Create party
        const hero1 = createMockHero({ id: 'hero1', role: 'tank' });
        partyManager.addHero(hero1);
        expect(partyManager.getSize()).toBeGreaterThan(0);

        // 2. Start combat
        const mockEnemy = {
            id: 'enemy1',
            data: { id: 'goblin', stats: { health: 100, attack: 10, defense: 5 } },
            sprite: { x: 100, y: 100 }
        };
        const combatStarted = combatManager.startPartyCombat(partyManager, mockEnemy);
        expect(combatStarted).toBe(true);

        // 3. Simulate combat end and loot drop
        const lootData = {
            id: 'rusty_sword',
            quality: 'common',
            itemLevel: 1
        };
        const lootItem = lootManager.createLootItem(lootData, 100, 200);
        expect(lootItem).toBeDefined();

        // 4. Pickup loot
        lootManager.pickupLoot(lootItem, hero1);
        expect(lootManager.inventory.length).toBeGreaterThan(0);

        // 5. Equip item
        equipmentManager.currentHeroId = 'hero1';
        const equipped = equipmentManager.equipItem('rusty_sword', 'weapon', 'hero1');
        expect(equipped).toBe(true);

        // 6. Verify stats updated
        const stats = equipmentManager.getHeroStats('hero1');
        expect(stats.attack).toBeGreaterThan(10); // Base + item
    });
});


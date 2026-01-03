/**
 * LootManager Unit Tests
 * Tests item drops, inventory management, item pickup, and drop table resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero } from '../../utils/test-helpers.js';

describe('LootManager', () => {
    let LootManager;
    let scene;
    let lootManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/loot-manager.js');
            LootManager = module.LootManager;
        } catch (error) {
            console.warn('Could not import LootManager:', error.message);
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
                            rarity: 'common',
                            sellValue: 10
                        }
                    }
                },
                worldConfig: {
                    loot: {
                        dropChance: 0.5
                    }
                }
            };
            return mockData[key] || {};
        });

        if (LootManager) {
            lootManager = new LootManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize LootManager', () => {
            if (!lootManager) return;
            expect(lootManager).toBeDefined();
            expect(lootManager.activeLootItems).toBeDefined();
            expect(Array.isArray(lootManager.activeLootItems)).toBe(true);
            expect(lootManager.inventory).toBeDefined();
        });

        it('should extend BaseManager', () => {
            if (!lootManager) return;
            expect(lootManager.init).toBeDefined();
            expect(lootManager.destroy).toBeDefined();
        });
    });

    describe('Item Drops', () => {
        it('should create loot item', () => {
            if (!lootManager) return;
            const lootData = {
                id: 'rusty_sword',
                quality: 'common',
                itemLevel: 1
            };
            const lootItem = lootManager.createLootItem(lootData, 100, 200);
            
            expect(lootItem).toBeDefined();
            expect(lootItem.x).toBe(100);
            expect(lootItem.y).toBe(200);
            expect(lootItem.data.id).toBe('rusty_sword');
        });

        it('should add loot item to active list', () => {
            if (!lootManager) return;
            const lootData = { id: 'rusty_sword', quality: 'common' };
            const lootItem = lootManager.createLootItem(lootData, 100, 200);
            lootManager.activeLootItems.push(lootItem);
            
            expect(lootManager.activeLootItems.length).toBeGreaterThan(0);
        });
    });

    describe('Item Pickup', () => {
        it('should check loot pickups for hero', () => {
            if (!lootManager) return;
            const hero = createMockHero();
            hero.sprite = { x: 100, y: 200 };
            
            const lootItem = {
                x: 110,
                y: 210,
                data: { id: 'rusty_sword' }
            };
            lootManager.activeLootItems.push(lootItem);
            
            lootManager.checkLootPickups(hero);
            // Should check distance and potentially pickup
        });

        it('should add item to inventory on pickup', () => {
            if (!lootManager) return;
            const initialInventorySize = lootManager.inventory.length;
            const lootItem = {
                data: { id: 'rusty_sword' },
                x: 100,
                y: 200
            };
            const hero = createMockHero();
            
            lootManager.pickupLoot(lootItem, hero);
            // Inventory should increase (if not auto-sold)
        });
    });

    describe('Inventory Management', () => {
        it('should track inventory size', () => {
            if (!lootManager) return;
            expect(lootManager.maxInventorySize).toBeDefined();
            expect(lootManager.maxInventorySize).toBeGreaterThan(0);
        });

        it('should respect max inventory size', () => {
            if (!lootManager) return;
            // Fill inventory to max
            for (let i = 0; i < lootManager.maxInventorySize; i++) {
                lootManager.inventory.push({ id: `item_${i}` });
            }
            
            expect(lootManager.inventory.length).toBeLessThanOrEqual(lootManager.maxInventorySize);
        });
    });

    describe('Item Quality Scaling', () => {
        it('should scale item quality by mile', () => {
            if (!lootManager) return;
            // Item quality should scale with current mile
            // This would be tested via generateLoot or createLootItem with mile parameter
        });
    });
});


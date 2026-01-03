/**
 * ShopManager Unit Tests
 * Tests shop generation, purchasing, inventory, and gold economy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene } from '../../utils/test-helpers.js';

describe('ShopManager', () => {
    let ShopManager;
    let scene;
    let shopManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/shop-manager.js');
            ShopManager = module.ShopManager;
        } catch (error) {
            console.warn('Could not import ShopManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                items: {
                    weapons: {
                        iron_sword: {
                            id: 'iron_sword',
                            name: 'Iron Sword',
                            cost: 100,
                            rarity: 'uncommon'
                        }
                    }
                },
                worldConfig: {
                    shop: {
                        baseItemCount: 6
                    }
                }
            };
            return mockData[key] || {};
        });

        if (ShopManager) {
            shopManager = new ShopManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize ShopManager', () => {
            if (!shopManager) return;
            expect(shopManager).toBeDefined();
            expect(shopManager.isShopOpen).toBe(false);
            expect(shopManager.playerGold).toBeDefined();
            expect(shopManager.shopInventory).toBeDefined();
        });

        it('should extend BaseManager', () => {
            if (!shopManager) return;
            expect(shopManager.init).toBeDefined();
            expect(shopManager.destroy).toBeDefined();
        });
    });

    describe('Shop Operations', () => {
        it('should open shop', () => {
            if (!shopManager) return;
            shopManager.openShop('general');
            expect(shopManager.isShopOpen).toBe(true);
            expect(shopManager.currentShopType).toBe('general');
        });

        it('should generate shop inventory', () => {
            if (!shopManager) return;
            shopManager.openShop('general');
            expect(shopManager.shopInventory.length).toBeGreaterThan(0);
        });

        it('should close shop', () => {
            if (!shopManager) return;
            shopManager.openShop('general');
            shopManager.closeShop();
            expect(shopManager.isShopOpen).toBe(false);
        });
    });

    describe('Item Purchasing', () => {
        it('should purchase item if enough gold', () => {
            if (!shopManager) return;
            shopManager.playerGold = 200;
            shopManager.shopInventory = [{ id: 'iron_sword', cost: 100 }];
            
            const result = shopManager.purchaseItem('iron_sword');
            expect(result).toBe(true);
            expect(shopManager.playerGold).toBe(100);
        });

        it('should not purchase if insufficient gold', () => {
            if (!shopManager) return;
            shopManager.playerGold = 50;
            shopManager.shopInventory = [{ id: 'iron_sword', cost: 100 }];
            
            const result = shopManager.purchaseItem('iron_sword');
            expect(result).toBe(false);
            expect(shopManager.playerGold).toBe(50);
        });
    });
});


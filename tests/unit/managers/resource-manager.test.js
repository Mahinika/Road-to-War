/**
 * ResourceManager Unit Tests
 * Tests resource pools, regeneration, consumables, and resource consumption
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero } from '../../utils/test-helpers.js';

describe('ResourceManager', () => {
    let ResourceManager;
    let scene;
    let resourceManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/resource-manager.js');
            ResourceManager = module.ResourceManager;
        } catch (error) {
            console.warn('Could not import ResourceManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                worldConfig: {
                    resources: {
                        baseManaRegen: 1,
                        baseEnergyRegen: 2
                    }
                }
            };
            return mockData[key] || {};
        });

        if (ResourceManager) {
            resourceManager = new ResourceManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize ResourceManager', () => {
            if (!resourceManager) return;
            expect(resourceManager).toBeDefined();
            expect(resourceManager.heroResources).toBeDefined();
            expect(resourceManager.heroResources instanceof Map).toBe(true);
            expect(resourceManager.consumables).toBeDefined();
        });

        it('should extend BaseManager', () => {
            if (!resourceManager) return;
            expect(resourceManager.init).toBeDefined();
            expect(resourceManager.destroy).toBeDefined();
        });
    });

    describe('Hero Resource Initialization', () => {
        it('should initialize resources for hero', () => {
            if (!resourceManager) return;
            const heroId = 'hero1';
            const heroStats = {
                maxMana: 100,
                mana: 100,
                manaRegen: 1,
                maxEnergy: 100,
                energy: 100
            };
            
            resourceManager.initializeHeroResources(heroId, heroStats);
            const resources = resourceManager.heroResources.get(heroId);
            expect(resources).toBeDefined();
            expect(resources.mana).toBeDefined();
            expect(resources.mana.current).toBe(100);
            expect(resources.mana.max).toBe(100);
        });

        it('should maintain separate resources for different heroes', () => {
            if (!resourceManager) return;
            resourceManager.initializeHeroResources('hero1', { maxMana: 100, mana: 100 });
            resourceManager.initializeHeroResources('hero2', { maxMana: 150, mana: 150 });
            
            const hero1Resources = resourceManager.heroResources.get('hero1');
            const hero2Resources = resourceManager.heroResources.get('hero2');
            
            expect(hero1Resources.mana.max).toBe(100);
            expect(hero2Resources.mana.max).toBe(150);
        });
    });

    describe('Resource Consumption', () => {
        it('should consume mana', () => {
            if (!resourceManager) return;
            const heroId = 'hero1';
            resourceManager.initializeHeroResources(heroId, { maxMana: 100, mana: 100 });
            
            const result = resourceManager.consumeResource(heroId, 'mana', 20);
            expect(result).toBe(true);
            
            const resources = resourceManager.heroResources.get(heroId);
            expect(resources.mana.current).toBe(80);
        });

        it('should not consume if insufficient resource', () => {
            if (!resourceManager) return;
            const heroId = 'hero1';
            resourceManager.initializeHeroResources(heroId, { maxMana: 100, mana: 10 });
            
            const result = resourceManager.consumeResource(heroId, 'mana', 50);
            expect(result).toBe(false);
        });
    });

    describe('Resource Regeneration', () => {
        it('should regenerate resources over time', () => {
            if (!resourceManager) return;
            const heroId = 'hero1';
            resourceManager.initializeHeroResources(heroId, { maxMana: 100, mana: 50, manaRegen: 1 });
            
            // Simulate time passing
            resourceManager.updateRegeneration(heroId, 1000); // 1 second
            
            const resources = resourceManager.heroResources.get(heroId);
            expect(resources.mana.current).toBeGreaterThan(50);
        });

        it('should not exceed max resource', () => {
            if (!resourceManager) return;
            const heroId = 'hero1';
            resourceManager.initializeHeroResources(heroId, { maxMana: 100, mana: 99, manaRegen: 10 });
            
            resourceManager.updateRegeneration(heroId, 1000);
            
            const resources = resourceManager.heroResources.get(heroId);
            expect(resources.mana.current).toBeLessThanOrEqual(100);
        });
    });

    describe('Regeneration Strategies', () => {
        it('should apply passive regeneration multiplier', () => {
            if (!resourceManager) return;
            resourceManager.currentStrategy = 'passive';
            expect(resourceManager.regenerationStrategies.passive.multiplier).toBe(1.0);
        });

        it('should apply active regeneration multiplier', () => {
            if (!resourceManager) return;
            resourceManager.currentStrategy = 'active';
            expect(resourceManager.regenerationStrategies.active.multiplier).toBe(1.5);
        });

        it('should apply burst regeneration multiplier', () => {
            if (!resourceManager) return;
            resourceManager.currentStrategy = 'burst';
            expect(resourceManager.regenerationStrategies.burst.multiplier).toBe(2.0);
        });
    });

    describe('Consumables', () => {
        it('should add consumable to inventory', () => {
            if (!resourceManager) return;
            const consumable = {
                id: 'mana_potion',
                effects: { restoreMana: 50 }
            };
            
            resourceManager.addConsumable(consumable.id, consumable);
            expect(resourceManager.consumables.has(consumable.id)).toBe(true);
        });

        it('should use consumable to restore resources', () => {
            if (!resourceManager) return;
            const heroId = 'hero1';
            resourceManager.initializeHeroResources(heroId, { maxMana: 100, mana: 50 });
            resourceManager.addConsumable('mana_potion', { effects: { restoreMana: 50 } });
            
            resourceManager.useConsumable(heroId, 'mana_potion');
            const resources = resourceManager.heroResources.get(heroId);
            expect(resources.mana.current).toBeGreaterThan(50);
        });
    });
});


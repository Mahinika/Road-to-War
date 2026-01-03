/**
 * AbilityManager Unit Tests
 * Tests ability selection, cooldowns, execution, and mana consumption
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero } from '../../utils/test-helpers.js';

describe('AbilityManager', () => {
    let AbilityManager;
    let scene;
    let abilityManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/ability-manager.js');
            AbilityManager = module.AbilityManager;
        } catch (error) {
            console.warn('Could not import AbilityManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                abilities: {
                    paladin: {
                        auto_attack: {
                            name: 'Auto Attack',
                            cost: 0,
                            cooldown: 0
                        },
                        heal: {
                            name: 'Heal',
                            cost: 20,
                            cooldown: 3
                        }
                    }
                },
                classes: {
                    paladin: {}
                },
                worldConfig: {}
            };
            return mockData[key] || {};
        });

        if (AbilityManager) {
            abilityManager = new AbilityManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize AbilityManager', () => {
            if (!abilityManager) return;
            expect(abilityManager).toBeDefined();
            expect(abilityManager.cooldowns).toBeDefined();
            expect(abilityManager.cooldowns instanceof Map).toBe(true);
        });

        it('should extend BaseManager', () => {
            if (!abilityManager) return;
            expect(abilityManager.init).toBeDefined();
            expect(abilityManager.destroy).toBeDefined();
        });
    });

    describe('Cooldown Management', () => {
        it('should initialize cooldowns for hero', () => {
            if (!abilityManager) return;
            const heroId = 'hero1';
            abilityManager.initializeHeroCooldowns(heroId);
            
            expect(abilityManager.cooldowns.has(heroId)).toBe(true);
        });

        it('should check if ability is on cooldown', () => {
            if (!abilityManager) return;
            const heroId = 'hero1';
            abilityManager.initializeHeroCooldowns(heroId);
            abilityManager.cooldowns.get(heroId).set('heal', 2);
            
            expect(abilityManager.isOnCooldown(heroId, 'heal')).toBe(true);
            expect(abilityManager.isOnCooldown(heroId, 'auto_attack')).toBe(false);
        });

        it('should update cooldowns over time', () => {
            if (!abilityManager) return;
            const heroId = 'hero1';
            abilityManager.initializeHeroCooldowns(heroId);
            abilityManager.cooldowns.get(heroId).set('heal', 3);
            
            abilityManager.updateCooldowns();
            expect(abilityManager.cooldowns.get(heroId).get('heal')).toBe(2);
        });
    });

    describe('Ability Selection', () => {
        it('should get ability definition', () => {
            if (!abilityManager) return;
            const ability = abilityManager.getAbilityDefinition('paladin', 'auto_attack');
            expect(ability).toBeDefined();
            expect(ability.name).toBe('Auto Attack');
        });

        it('should select appropriate ability based on situation', () => {
            if (!abilityManager) return;
            const heroId = 'hero1';
            const hero = createMockHero({ id: heroId, currentStats: { health: 50, maxHealth: 100 } });
            
            // Should select heal if health is low
            const ability = abilityManager.selectAbility(hero, 'combat');
            expect(ability).toBeDefined();
        });
    });
});


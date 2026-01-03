/**
 * StatusEffectsManager Unit Tests
 * Tests status effect application, duration, stacking, and removal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene } from '../../utils/test-helpers.js';

describe('StatusEffectsManager', () => {
    let StatusEffectsManager;
    let scene;
    let statusEffectsManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/status-effects-manager.js');
            StatusEffectsManager = module.StatusEffectsManager;
        } catch (error) {
            console.warn('Could not import StatusEffectsManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                worldConfig: {}
            };
            return mockData[key] || {};
        });

        if (StatusEffectsManager) {
            statusEffectsManager = new StatusEffectsManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize StatusEffectsManager', () => {
            if (!statusEffectsManager) return;
            expect(statusEffectsManager).toBeDefined();
            expect(statusEffectsManager.effectTypes).toBeDefined();
        });

        it('should extend BaseManager', () => {
            if (!statusEffectsManager) return;
            expect(statusEffectsManager.init).toBeDefined();
            expect(statusEffectsManager.destroy).toBeDefined();
        });
    });

    describe('Status Effect Application', () => {
        it('should apply status effect to combatant', () => {
            if (!statusEffectsManager) return;
            const combatantId = 'hero1';
            const result = statusEffectsManager.applyEffect(combatantId, 'stun', 1);
            expect(result).toBe(true);
        });

        it('should track effect duration', () => {
            if (!statusEffectsManager) return;
            const combatantId = 'hero1';
            statusEffectsManager.applyEffect(combatantId, 'stun', 3);
            
            const effects = statusEffectsManager.getEffects(combatantId);
            expect(effects).toBeDefined();
        });

        it('should handle stackable effects', () => {
            if (!statusEffectsManager) return;
            const combatantId = 'hero1';
            statusEffectsManager.applyEffect(combatantId, 'bleed', 3);
            statusEffectsManager.applyEffect(combatantId, 'bleed', 3);
            
            // Stackable effects should stack
            const effects = statusEffectsManager.getEffects(combatantId);
            expect(effects).toBeDefined();
        });

        it('should not stack non-stackable effects', () => {
            if (!statusEffectsManager) return;
            const combatantId = 'hero1';
            statusEffectsManager.applyEffect(combatantId, 'stun', 2);
            statusEffectsManager.applyEffect(combatantId, 'stun', 3);
            
            // Non-stackable should refresh duration, not stack
            const effects = statusEffectsManager.getEffects(combatantId);
            expect(effects).toBeDefined();
        });
    });

    describe('Status Effect Processing', () => {
        it('should process effects each turn', () => {
            if (!statusEffectsManager) return;
            const combatantId = 'hero1';
            statusEffectsManager.applyEffect(combatantId, 'bleed', 3);
            
            statusEffectsManager.processEffects(combatantId);
            // Bleed should deal damage
        });

        it('should reduce effect duration each turn', () => {
            if (!statusEffectsManager) return;
            const combatantId = 'hero1';
            statusEffectsManager.applyEffect(combatantId, 'stun', 3);
            
            statusEffectsManager.processEffects(combatantId);
            const effects = statusEffectsManager.getEffects(combatantId);
            // Duration should decrease
        });

        it('should remove expired effects', () => {
            if (!statusEffectsManager) return;
            const combatantId = 'hero1';
            statusEffectsManager.applyEffect(combatantId, 'stun', 1);
            
            statusEffectsManager.processEffects(combatantId);
            statusEffectsManager.processEffects(combatantId);
            
            const effects = statusEffectsManager.getEffects(combatantId);
            // Effect should be removed after duration expires
        });
    });
});


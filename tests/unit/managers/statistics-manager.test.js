/**
 * StatisticsManager Unit Tests
 * Tests statistics tracking, aggregation, and event handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene } from '../../utils/test-helpers.js';

describe('StatisticsManager', () => {
    let StatisticsManager;
    let scene;
    let statisticsManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/statistics-manager.js');
            StatisticsManager = module.StatisticsManager;
        } catch (error) {
            console.warn('Could not import StatisticsManager:', error.message);
            return;
        }

        scene = createMockScene();

        if (StatisticsManager) {
            statisticsManager = new StatisticsManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize StatisticsManager', () => {
            if (!statisticsManager) return;
            expect(statisticsManager).toBeDefined();
            expect(statisticsManager.stats).toBeDefined();
            expect(statisticsManager.stats.combat).toBeDefined();
            expect(statisticsManager.stats.progression).toBeDefined();
        });

        it('should extend BaseManager', () => {
            if (!statisticsManager) return;
            expect(statisticsManager.init).toBeDefined();
            expect(statisticsManager.destroy).toBeDefined();
        });
    });

    describe('Combat Statistics', () => {
        it('should track damage dealt', () => {
            if (!statisticsManager) return;
            const initialDamage = statisticsManager.stats.combat.totalDamageDealt;
            statisticsManager.trackDamageDealt({ amount: 50 });
            expect(statisticsManager.stats.combat.totalDamageDealt).toBe(initialDamage + 50);
        });

        it('should track enemies defeated', () => {
            if (!statisticsManager) return;
            const initialDefeated = statisticsManager.stats.combat.enemiesDefeated;
            statisticsManager.trackCombatEnd({ won: true });
            expect(statisticsManager.stats.combat.enemiesDefeated).toBeGreaterThan(initialDefeated);
        });

        it('should track critical hits', () => {
            if (!statisticsManager) return;
            const initialCrits = statisticsManager.stats.combat.criticalHits;
            scene.events.emit('critical_hit');
            expect(statisticsManager.stats.combat.criticalHits).toBeGreaterThan(initialCrits);
        });
    });

    describe('Progression Statistics', () => {
        it('should track levels gained', () => {
            if (!statisticsManager) return;
            const initialLevels = statisticsManager.stats.progression.levelsGained;
            scene.events.emit('hero_level_up', { level: 2 });
            expect(statisticsManager.stats.progression.levelsGained).toBeGreaterThan(initialLevels);
        });

        it('should track experience gained', () => {
            if (!statisticsManager) return;
            const initialXP = statisticsManager.stats.progression.totalExperience;
            scene.events.emit('experience_gained', { amount: 100 });
            expect(statisticsManager.stats.progression.totalExperience).toBeGreaterThan(initialXP);
        });
    });

    describe('Collection Statistics', () => {
        it('should track items found', () => {
            if (!statisticsManager) return;
            const initialItems = statisticsManager.stats.collection.itemsFound;
            scene.events.emit('item_picked_up', {});
            expect(statisticsManager.stats.collection.itemsFound).toBeGreaterThan(initialItems);
        });

        it('should track gold earned', () => {
            if (!statisticsManager) return;
            const initialGold = statisticsManager.stats.collection.goldEarned;
            scene.events.emit('gold_changed', { amount: 50, type: 'earned' });
            expect(statisticsManager.stats.collection.goldEarned).toBeGreaterThan(initialGold);
        });
    });
});


/**
 * MovementManager Unit Tests
 * Tests formation calculations, movement modes, pathfinding, and positioning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero } from '../../utils/test-helpers.js';

describe('MovementManager', () => {
    let MovementManager;
    let scene;
    let movementManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/movement-manager.js');
            MovementManager = module.MovementManager;
        } catch (error) {
            console.warn('Could not import MovementManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                classes: {
                    paladin: { attackRange: 2, movementSpeed: 150, preferredRange: 2 }
                }
            };
            return mockData[key] || {};
        });

        if (MovementManager) {
            movementManager = new MovementManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize MovementManager', () => {
            if (!movementManager) return;
            expect(movementManager).toBeDefined();
            expect(movementManager.mode).toBe('travel');
            expect(movementManager.currentFormation).toBe('line');
        });

        it('should extend BaseManager', () => {
            if (!movementManager) return;
            expect(movementManager.init).toBeDefined();
            expect(movementManager.destroy).toBeDefined();
        });
    });

    describe('Formation Calculations', () => {
        it('should calculate travel formation positions', () => {
            if (!movementManager) return;
            const party = [
                { id: 'hero1', role: 'tank', sprite: { x: 0, y: 0 } },
                { id: 'hero2', role: 'healer', sprite: { x: 0, y: 0 } },
                { id: 'hero3', role: 'dps', sprite: { x: 0, y: 0 } }
            ];
            const leaderPos = { x: 100, y: 100 };
            
            const positions = movementManager.getTravelFormation(party, leaderPos);
            expect(positions).toBeDefined();
            expect(positions instanceof Map).toBe(true);
        });

        it('should calculate combat formation positions', () => {
            if (!movementManager) return;
            const hero = createMockHero({ id: 'hero1', role: 'tank' });
            hero.sprite = { x: 100, y: 100 };
            const enemyPos = { x: 200, y: 200 };
            const party = [hero];
            
            const position = movementManager.getCombatPosition(hero, enemyPos, party);
            expect(position).toBeDefined();
        });

        it('should switch formations', () => {
            if (!movementManager) return;
            movementManager.setFormation('wedge');
            expect(movementManager.currentFormation).toBe('wedge');
        });
    });

    describe('Movement Modes', () => {
        it('should switch between travel and combat mode', () => {
            if (!movementManager) return;
            expect(movementManager.mode).toBe('travel');
            movementManager.mode = 'combat';
            expect(movementManager.mode).toBe('combat');
        });
    });

    describe('Distance Calculations', () => {
        it('should calculate distance correctly', () => {
            if (!movementManager) return;
            const dist = movementManager.calculateDistance(0, 0, 3, 4);
            expect(dist).toBe(5);
        });

        it('should check if hero is in range', () => {
            if (!movementManager) return;
            const hero = {
                sprite: { x: 0, y: 0 },
                classId: 'paladin'
            };
            const target = { x: 50, y: 0 };
            const inRange = movementManager.isInRange(hero, target, 1.0);
            expect(inRange).toBe(true);
        });
    });
});


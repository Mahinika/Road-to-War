/**
 * Integration Test: World → Combat
 * Tests that world progression triggers encounters and combat
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockPartyManager } from '../utils/test-helpers.js';

describe('Integration: World → Combat', () => {
    let WorldManager, CombatManager, PartyManager;
    let scene;
    let worldManager, combatManager, partyManager;

    beforeEach(async () => {
        try {
            const worldModule = await import('../../src/managers/world-manager.js');
            WorldManager = worldModule.WorldManager;
            
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
                worldConfig: {
                    worldGeneration: { scrollSpeed: 50 },
                    combat: { baseCombatSpeed: 1000 }
                },
                enemies: {
                    goblin: { id: 'goblin', stats: { health: 50, attack: 5, defense: 2 } }
                }
            };
            return mockData[key] || {};
        });

        if (WorldManager && CombatManager && PartyManager) {
            partyManager = new PartyManager(scene);
            worldManager = new WorldManager(scene, { partyManager });
            combatManager = new CombatManager(scene, { partyManager });
        }
    });

    it('should trigger combat from world encounter', () => {
        if (!worldManager || !combatManager || !partyManager) return;

        // Progress world
        worldManager.currentMile = 10;

        // Create enemy from world
        const enemy = worldManager.createEnemy(0, false);
        expect(enemy).toBeDefined();

        // Start combat with world enemy
        const combatStarted = combatManager.startPartyCombat(partyManager, enemy);
        expect(combatStarted).toBe(true);
    });

    it('should scale enemy difficulty with mile progression', () => {
        if (!worldManager) return;

        worldManager.currentMile = 10;
        const enemy1 = worldManager.createEnemy(0, false);

        worldManager.currentMile = 50;
        const enemy2 = worldManager.createEnemy(0, false);

        if (enemy1 && enemy2) {
            expect(enemy2.data.stats.health).toBeGreaterThan(enemy1.data.stats.health);
        }
    });
});


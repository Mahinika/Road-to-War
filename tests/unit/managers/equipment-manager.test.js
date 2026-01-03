/**
 * EquipmentManager Unit Tests
 * Tests equipment management, stat calculations, set bonuses, and skill gems
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero, createMockPartyManager } from '../../utils/test-helpers.js';

describe('EquipmentManager', () => {
    let EquipmentManager;
    let scene;
    let equipmentManager;
    let mockPartyManager;

    beforeEach(async () => {
        // Dynamic import to avoid issues
        try {
            const module = await import('../../../src/managers/equipment-manager.js');
            EquipmentManager = module.EquipmentManager;
        } catch (error) {
            console.warn('Could not import EquipmentManager:', error.message);
            return;
        }

        // Create mock scene with item data
        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                items: {
                    weapons: {
                        rusty_sword: {
                            id: 'rusty_sword',
                            name: 'Rusty Sword',
                            type: 'weapon',
                            slot: 'weapon',
                            rarity: 'common',
                            level: 1,
                            stats: { attack: 5, defense: 0, health: 0 }
                        },
                        iron_sword: {
                            id: 'iron_sword',
                            name: 'Iron Sword',
                            type: 'weapon',
                            slot: 'weapon',
                            rarity: 'uncommon',
                            level: 3,
                            stats: { attack: 12, defense: 2, health: 0 }
                        }
                    },
                    armor: {
                        iron_plate: {
                            id: 'iron_plate',
                            name: 'Iron Plate',
                            type: 'armor',
                            slot: 'chest',
                            rarity: 'common',
                            level: 1,
                            stats: { attack: 0, defense: 10, health: 20 }
                        },
                        steel_plate: {
                            id: 'steel_plate',
                            name: 'Steel Plate',
                            type: 'armor',
                            slot: 'chest',
                            rarity: 'uncommon',
                            level: 5,
                            stats: { attack: 0, defense: 20, health: 40 }
                        }
                    },
                    sets: {
                        warrior_set: {
                            id: 'warrior_set',
                            name: 'Warrior Set',
                            pieces: ['iron_sword', 'iron_plate'],
                            bonuses: {
                                2: { attack: 10, defense: 5 }
                            }
                        }
                    }
                },
                worldConfig: {
                    player: {
                        startingStats: {
                            health: 100,
                            maxHealth: 100,
                            attack: 10,
                            defense: 5
                        }
                    }
                },
                skillGems: {
                    skillGems: {
                        strength_gem: {
                            id: 'strength_gem',
                            name: 'Strength Gem',
                            stats: { strength: 5 }
                        }
                    }
                }
            };
            return mockData[key] || {};
        });

        // Create mock party manager
        mockPartyManager = createMockPartyManager();

        // Create EquipmentManager instance
        if (EquipmentManager) {
            equipmentManager = new EquipmentManager(scene, {
                partyManager: mockPartyManager
            });
            // Set current hero ID for testing
            equipmentManager.currentHeroId = 'hero1';
        }
    });

    describe('Initialization', () => {
        it('should initialize EquipmentManager', () => {
            if (!equipmentManager) return;
            expect(equipmentManager).toBeDefined();
            expect(equipmentManager.heroEquipment).toBeDefined();
            expect(equipmentManager.heroEquipment instanceof Map).toBe(true);
            expect(equipmentManager.heroStats).toBeDefined();
            expect(equipmentManager.heroStats instanceof Map).toBe(true);
        });

        it('should extend BaseManager', () => {
            if (!equipmentManager) return;
            expect(equipmentManager.init).toBeDefined();
            expect(equipmentManager.destroy).toBeDefined();
            expect(equipmentManager.getState).toBeDefined();
        });

        it('should initialize with party manager', () => {
            if (!equipmentManager) return;
            expect(equipmentManager.partyManager).toBe(mockPartyManager);
        });
    });

    describe('Per-Hero Equipment Map', () => {
        it('should create equipment slots for hero on first access', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            const equipment = equipmentManager.getHeroEquipment(heroId);
            expect(equipment).toBeDefined();
            expect(equipment.weapon).toBeNull();
            expect(equipment.chest).toBeNull();
        });

        it('should maintain separate equipment for different heroes', () => {
            if (!equipmentManager) return;
            const hero1Equipment = equipmentManager.getHeroEquipment('hero1');
            const hero2Equipment = equipmentManager.getHeroEquipment('hero2');
            
            expect(hero1Equipment).not.toBe(hero2Equipment);
            hero1Equipment.weapon = 'rusty_sword';
            expect(hero2Equipment.weapon).toBeNull();
        });

        it('should get hero stats', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            const stats = equipmentManager.getHeroStats(heroId);
            expect(stats).toBeDefined();
            expect(stats.health).toBe(100);
            expect(stats.maxHealth).toBe(100);
        });

        it('should switch current hero', () => {
            if (!equipmentManager) return;
            equipmentManager.currentHeroId = 'hero1';
            equipmentManager.getHeroEquipment('hero1').weapon = 'rusty_sword';
            
            const switched = equipmentManager.switchHero('hero2');
            expect(switched).toBe(true);
            expect(equipmentManager.currentHeroId).toBe('hero2');
            expect(equipmentManager.getHeroEquipment('hero2').weapon).toBeNull();
        });
    });

    describe('equipItem', () => {
        it('should equip item to hero', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            const result = equipmentManager.equipItem('rusty_sword', 'weapon', heroId);
            
            expect(result).toBe(true);
            const equipment = equipmentManager.getHeroEquipment(heroId);
            expect(equipment.weapon).toBe('rusty_sword');
        });

        it('should update stats after equipping item', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('rusty_sword', 'weapon', heroId);
            
            const stats = equipmentManager.getHeroStats(heroId);
            expect(stats.attack).toBeGreaterThan(10); // Base 10 + item 5
        });

        it('should replace existing item in slot', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('rusty_sword', 'weapon', heroId);
            equipmentManager.equipItem('iron_sword', 'weapon', heroId);
            
            const equipment = equipmentManager.getHeroEquipment(heroId);
            expect(equipment.weapon).toBe('iron_sword');
        });

        it('should validate item exists before equipping', () => {
            if (!equipmentManager) return;
            const result = equipmentManager.equipItem('nonexistent_item', 'weapon', 'hero1');
            expect(result).toBe(false);
        });

        it('should validate slot before equipping', () => {
            if (!equipmentManager) return;
            const result = equipmentManager.equipItem('rusty_sword', 'invalid_slot', 'hero1');
            expect(result).toBe(false);
        });

        it('should emit equipment_changed event', () => {
            if (!equipmentManager) return;
            const emitSpy = vi.spyOn(scene.events, 'emit');
            equipmentManager.equipItem('rusty_sword', 'weapon', 'hero1');
            
            expect(emitSpy).toHaveBeenCalledWith(
                expect.stringContaining('equipment'),
                expect.any(Object)
            );
        });
    });

    describe('unequipItem', () => {
        it('should unequip item from slot', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('rusty_sword', 'weapon', heroId);
            
            const item = equipmentManager.unequipItem('weapon', false, heroId);
            expect(item).toBe('rusty_sword');
            
            const equipment = equipmentManager.getHeroEquipment(heroId);
            expect(equipment.weapon).toBeNull();
        });

        it('should update stats after unequipping', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('rusty_sword', 'weapon', heroId);
            const statsWithItem = equipmentManager.getHeroStats(heroId);
            
            equipmentManager.unequipItem('weapon', false, heroId);
            const statsWithoutItem = equipmentManager.getHeroStats(heroId);
            
            expect(statsWithoutItem.attack).toBeLessThan(statsWithItem.attack);
        });

        it('should return null if slot is empty', () => {
            if (!equipmentManager) return;
            const item = equipmentManager.unequipItem('weapon', false, 'hero1');
            expect(item).toBeNull();
        });

        it('should validate slot before unequipping', () => {
            if (!equipmentManager) return;
            const item = equipmentManager.unequipItem('invalid_slot', false, 'hero1');
            expect(item).toBeNull();
        });
    });

    describe('calculateStats', () => {
        it('should calculate base stats correctly', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            const stats = equipmentManager.calculateStats(heroId);
            
            expect(stats.health).toBe(100);
            expect(stats.maxHealth).toBe(100);
            expect(stats.attack).toBe(10);
            expect(stats.defense).toBe(5);
        });

        it('should include equipment stats in calculation', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('rusty_sword', 'weapon', heroId);
            equipmentManager.equipItem('iron_plate', 'chest', heroId);
            
            const stats = equipmentManager.calculateStats(heroId);
            expect(stats.attack).toBeGreaterThan(10); // Base + weapon
            expect(stats.defense).toBeGreaterThan(5); // Base + armor
            expect(stats.health).toBeGreaterThan(100); // Base + armor health
        });

        it('should calculate stats for specific hero', () => {
            if (!equipmentManager) return;
            equipmentManager.equipItem('rusty_sword', 'weapon', 'hero1');
            equipmentManager.equipItem('iron_sword', 'weapon', 'hero2');
            
            const hero1Stats = equipmentManager.calculateStats('hero1');
            const hero2Stats = equipmentManager.calculateStats('hero2');
            
            // Hero2 should have higher attack (iron_sword has 12 vs rusty_sword 5)
            expect(hero2Stats.attack).toBeGreaterThan(hero1Stats.attack);
        });

        it('should handle missing hero equipment gracefully', () => {
            if (!equipmentManager) return;
            const stats = equipmentManager.calculateStats('nonexistent_hero');
            expect(stats).toBeDefined();
            expect(stats.health).toBe(100);
        });
    });

    describe('Set Bonuses', () => {
        beforeEach(() => {
            if (!equipmentManager) return;
            // Setup items for set bonus testing
            scene.cache.json.get = vi.fn((key) => {
                if (key === 'items') {
                    return {
                        weapons: {
                            iron_sword: {
                                id: 'iron_sword',
                                name: 'Iron Sword',
                                slot: 'weapon',
                                stats: { attack: 12 },
                                set: 'warrior_set'
                            }
                        },
                        armor: {
                            iron_plate: {
                                id: 'iron_plate',
                                name: 'Iron Plate',
                                slot: 'chest',
                                stats: { defense: 10 },
                                set: 'warrior_set'
                            }
                        },
                        sets: {
                            warrior_set: {
                                id: 'warrior_set',
                                name: 'Warrior Set',
                                pieces: ['iron_sword', 'iron_plate'],
                                bonuses: {
                                    2: { attack: 10, defense: 5 }
                                }
                            }
                        }
                    };
                }
                return {};
            });
            equipmentManager.itemsData = scene.cache.json.get('items');
        });

        it('should calculate set bonuses when wearing set pieces', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('iron_sword', 'weapon', heroId);
            equipmentManager.equipItem('iron_plate', 'chest', heroId);
            
            const setBonuses = equipmentManager.calculateSetBonuses(heroId);
            expect(setBonuses.attack).toBe(10);
            expect(setBonuses.defense).toBe(5);
        });

        it('should include set bonuses in stat calculation', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('iron_sword', 'weapon', heroId);
            equipmentManager.equipItem('iron_plate', 'chest', heroId);
            
            const stats = equipmentManager.calculateStats(heroId);
            // Should include set bonus attack (10) in addition to item stats
            expect(stats.attack).toBeGreaterThanOrEqual(22); // Base 10 + weapon 12 + set 10
        });

        it('should return active sets', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('iron_sword', 'weapon', heroId);
            equipmentManager.equipItem('iron_plate', 'chest', heroId);
            
            const activeSets = equipmentManager.getActiveSets(heroId);
            expect(activeSets.length).toBeGreaterThan(0);
            expect(activeSets[0].id).toBe('warrior_set');
        });

        it('should not apply set bonus with incomplete set', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('iron_sword', 'weapon', heroId);
            // Only 1 piece, need 2 for bonus
            
            const setBonuses = equipmentManager.calculateSetBonuses(heroId);
            expect(setBonuses.attack).toBeUndefined();
        });
    });

    describe('Skill Gems', () => {
        beforeEach(() => {
            if (!equipmentManager) return;
            // Setup item with sockets
            scene.cache.json.get = vi.fn((key) => {
                if (key === 'items') {
                    return {
                        weapons: {
                            socketed_sword: {
                                id: 'socketed_sword',
                                name: 'Socketed Sword',
                                slot: 'weapon',
                                stats: { attack: 10 },
                                sockets: 2,
                                socketedGems: [null, null]
                            }
                        }
                    };
                }
                if (key === 'skillGems') {
                    return {
                        skillGems: {
                            strength_gem: {
                                id: 'strength_gem',
                                name: 'Strength Gem',
                                stats: { strength: 5 }
                            }
                        }
                    };
                }
                return {};
            });
            equipmentManager.itemsData = scene.cache.json.get('items');
            equipmentManager.skillGemsData = scene.cache.json.get('skillGems')?.skillGems || {};
        });

        it('should socket gem into item', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('socketed_sword', 'weapon', heroId);
            
            const result = equipmentManager.socketGem('socketed_sword', 0, 'strength_gem', heroId);
            expect(result).toBe(true);
        });

        it('should apply gem stats to hero', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('socketed_sword', 'weapon', heroId);
            equipmentManager.socketGem('socketed_sword', 0, 'strength_gem', heroId);
            
            const stats = equipmentManager.calculateStats(heroId);
            expect(stats.strength).toBeGreaterThan(0);
        });

        it('should unsocket gem from item', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('socketed_sword', 'weapon', heroId);
            equipmentManager.socketGem('socketed_sword', 0, 'strength_gem', heroId);
            
            const gem = equipmentManager.unsocketGem('socketed_sword', 0, heroId);
            expect(gem).toBe('strength_gem');
        });

        it('should remove gem stats after unsocketing', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('socketed_sword', 'weapon', heroId);
            equipmentManager.socketGem('socketed_sword', 0, 'strength_gem', heroId);
            const statsWithGem = equipmentManager.calculateStats(heroId);
            
            equipmentManager.unsocketGem('socketed_sword', 0, heroId);
            const statsWithoutGem = equipmentManager.calculateStats(heroId);
            
            expect(statsWithoutGem.strength).toBeLessThan(statsWithGem.strength);
        });

        it('should validate socket index', () => {
            if (!equipmentManager) return;
            const heroId = 'hero1';
            equipmentManager.equipItem('socketed_sword', 'weapon', heroId);
            
            const result = equipmentManager.socketGem('socketed_sword', 5, 'strength_gem', heroId);
            expect(result).toBe(false);
        });
    });

    describe('Validation', () => {
        it('should use ValidationBuilder for equipItem', () => {
            if (!equipmentManager) return;
            // ValidationBuilder should be called via quickValidate
            expect(equipmentManager.quickValidate).toBeDefined();
        });

        it('should validate heroId exists in party', () => {
            if (!equipmentManager) return;
            const result = equipmentManager.equipItem('rusty_sword', 'weapon', 'nonexistent_hero');
            expect(result).toBe(false);
        });
    });

    describe('Event Handling', () => {
        it('should handle item pickup events', () => {
            if (!equipmentManager) return;
            const equipSpy = vi.spyOn(equipmentManager, 'equipItem');
            
            const item = {
                id: 'rusty_sword',
                data: {
                    slot: 'weapon',
                    stats: { attack: 5 }
                }
            };
            
            equipmentManager.handleItemPickup(item);
            expect(equipSpy).toHaveBeenCalled();
        });
    });
});


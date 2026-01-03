# Manager Testing Patterns

## Overview

This document outlines standardized testing patterns for all Manager classes in Road of War. All managers extend `BaseManager` and follow consistent patterns that should be reflected in their tests.

## Testing Framework

- **Framework**: Vitest
- **Test Location**: `tests/unit/managers/`
- **Helpers**: `tests/utils/test-helpers.js`
- **Mock System**: Phaser 3 scene mocks

## BaseManager Testing Pattern

All managers extend `BaseManager`, which provides:

- `init()` - Initialization hook
- `update(time, delta)` - Update loop
- `getState()` - State retrieval
- `destroy()` - Cleanup
- `static getDependencies()` - Dependency declaration

### Standard Test Structure

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene, createMockHero, createMockPartyManager } from '../../utils/test-helpers.js';

describe('ManagerName', () => {
    let ManagerName;
    let scene;
    let manager;
    let mockDependencies;

    beforeEach(async () => {
        // Dynamic import
        try {
            const module = await import('../../../src/managers/manager-name.js');
            ManagerName = module.ManagerName;
        } catch (error) {
            console.warn('Could not import ManagerName:', error.message);
            return;
        }

        // Create mock scene with required data
        scene = createMockScene();
        scene.cache.json.get = vi.fn((key) => {
            const mockData = {
                // Required data for manager
            };
            return mockData[key] || {};
        });

        // Create mock dependencies
        mockDependencies = {
            partyManager: createMockPartyManager(),
            // Other dependencies
        };

        // Create manager instance
        if (ManagerName) {
            manager = new ManagerName(scene, mockDependencies);
        }
    });

    describe('Initialization', () => {
        it('should initialize manager', () => {
            if (!manager) return;
            expect(manager).toBeDefined();
            expect(manager.scene).toBe(scene);
        });

        it('should extend BaseManager', () => {
            if (!manager) return;
            expect(manager.init).toBeDefined();
            expect(manager.destroy).toBeDefined();
            expect(manager.getState).toBeDefined();
        });

        it('should initialize with dependencies', () => {
            if (!manager) return;
            expect(manager.partyManager).toBe(mockDependencies.partyManager);
        });
    });

    describe('Core Functionality', () => {
        // Manager-specific tests
    });

    describe('State Management', () => {
        it('should provide state via getState()', () => {
            if (!manager) return;
            const state = manager.getState();
            expect(state).toBeDefined();
            expect(state.initialized).toBeDefined();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup on destroy()', () => {
            if (!manager) return;
            manager.destroy();
            expect(manager.initialized).toBe(false);
        });
    });
});
```

## Common Testing Patterns

### 1. Initialization Tests

Every manager should test:
- Manager instance creation
- BaseManager extension
- Dependency injection
- Initial state

```javascript
describe('Initialization', () => {
    it('should initialize manager', () => {
        expect(manager).toBeDefined();
        expect(manager.scene).toBe(scene);
    });

    it('should extend BaseManager', () => {
        expect(manager.init).toBeDefined();
        expect(manager.destroy).toBeDefined();
        expect(manager.getState).toBeDefined();
    });

    it('should initialize with correct dependencies', () => {
        expect(manager.partyManager).toBe(mockPartyManager);
    });

    it('should have correct initial state', () => {
        expect(manager.inCombat).toBe(false);
        expect(manager.currentCombat).toBeNull();
    });
});
```

### 2. Dependency Injection Tests

Test that dependencies are correctly injected and used:

```javascript
describe('Dependency Injection', () => {
    it('should use party manager for hero access', () => {
        manager.getHeroes();
        expect(mockPartyManager.getHeroes).toHaveBeenCalled();
    });

    it('should handle missing dependencies gracefully', () => {
        const managerWithoutDep = new ManagerName(scene, {});
        expect(() => managerWithoutDep.someMethod()).not.toThrow();
    });
```

### 3. Event System Tests

Managers emit events via `scene.events.emit()`. Test event emission:

```javascript
describe('Event Emission', () => {
    it('should emit event on action', () => {
        manager.performAction();
        expect(scene.events.emit).toHaveBeenCalledWith(
            'expected-event-name',
            expect.objectContaining({
                // Expected event data
            })
        );
    });

    it('should emit event with correct data', () => {
        const result = manager.performAction();
        expect(scene.events.emit).toHaveBeenCalledWith(
            'expected-event-name',
            expect.objectContaining({
                result: result,
                timestamp: expect.any(Number)
            })
        );
    });
});
```

### 4. State Management Tests

Test state changes and retrieval:

```javascript
describe('State Management', () => {
    it('should update state on action', () => {
        manager.performAction();
        const state = manager.getState();
        expect(state.someProperty).toBe(expectedValue);
    });

    it('should maintain state consistency', () => {
        manager.performAction1();
        manager.performAction2();
        const state = manager.getState();
        expect(state).toMatchObject({
            property1: expect.any(Number),
            property2: expect.any(String)
        });
    });
});
```

### 5. Error Handling Tests

Test error handling and edge cases:

```javascript
describe('Error Handling', () => {
    it('should handle invalid input gracefully', () => {
        expect(() => manager.method(null)).not.toThrow();
        expect(() => manager.method(undefined)).not.toThrow();
        expect(() => manager.method({})).not.toThrow();
    });

    it('should validate input before processing', () => {
        const result = manager.method(invalidInput);
        expect(result).toBeNull();
        // Or expect error event
        expect(scene.events.emit).toHaveBeenCalledWith(
            'error',
            expect.objectContaining({
                message: expect.stringContaining('Invalid')
            })
        );
    });
});
```

### 6. Data-Driven Tests

Test with various data configurations:

```javascript
describe('Data-Driven Tests', () => {
    const testCases = [
        { input: 'case1', expected: 'result1' },
        { input: 'case2', expected: 'result2' },
        { input: 'case3', expected: 'result3' }
    ];

    testCases.forEach(({ input, expected }) => {
        it(`should handle ${input} correctly`, () => {
            const result = manager.method(input);
            expect(result).toBe(expected);
        });
    });
});
```

## Manager-Specific Patterns

### CombatManager Testing

```javascript
describe('CombatManager', () => {
    describe('Combat Lifecycle', () => {
        it('should start combat', () => {
            combatManager.startCombat(enemy);
            expect(combatManager.inCombat).toBe(true);
            expect(combatManager.currentCombat).toBeDefined();
        });

        it('should end combat', () => {
            combatManager.startCombat(enemy);
            combatManager.endCombat();
            expect(combatManager.inCombat).toBe(false);
            expect(combatManager.currentCombat).toBeNull();
        });
    });

    describe('Threat System', () => {
        it('should add threat', () => {
            combatManager.addThreat(enemyId, heroId, 100);
            expect(combatManager.getThreat(enemyId, heroId)).toBe(100);
        });
    });
});
```

### EquipmentManager Testing

```javascript
describe('EquipmentManager', () => {
    describe('Equipment Operations', () => {
        it('should equip item', () => {
            const result = equipmentManager.equipItem(hero, item);
            expect(result).toBe(true);
            expect(hero.equipment[item.slot]).toBe(item);
        });

        it('should calculate stats with equipment', () => {
            equipmentManager.equipItem(hero, item);
            const stats = equipmentManager.calculateStats(hero);
            expect(stats.attack).toBeGreaterThan(hero.baseStats.attack);
        });
    });
});
```

### PartyManager Testing

```javascript
describe('PartyManager', () => {
    describe('Party Creation', () => {
        it('should create party with 5 heroes', () => {
            partyManager.createParty(partyData);
            expect(partyManager.getSize()).toBe(5);
        });

        it('should validate party composition', () => {
            const result = partyManager.createParty(invalidPartyData);
            expect(result).toBe(false);
        });
    });
});
```

## Mock Data Patterns

### Scene Mock Setup

```javascript
scene = createMockScene();
scene.cache.json.get = vi.fn((key) => {
    const mockData = {
        classes: {
            paladin: { /* class data */ },
            warrior: { /* class data */ }
        },
        items: {
            weapons: { /* weapon data */ },
            armor: { /* armor data */ }
        },
        worldConfig: {
            combat: { baseCombatSpeed: 1000 },
            player: { startingStats: {} }
        }
    };
    return mockData[key] || {};
});
```

### Hero Mock Setup

```javascript
const hero = createMockHero({
    id: 'hero1',
    classId: 'paladin',
    level: 10,
    baseStats: {
        strength: 50,
        health: 200
    }
});
```

### Party Manager Mock Setup

```javascript
const mockPartyManager = createMockPartyManager();
mockPartyManager.getHeroes = vi.fn().mockReturnValue([
    createMockHero({ id: 'hero1', role: 'tank' }),
    createMockHero({ id: 'hero2', role: 'healer' }),
    createMockHero({ id: 'hero3', role: 'dps' })
]);
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Critical Paths**: 100% coverage
- **Edge Cases**: All identified edge cases tested
- **Error Handling**: All error paths tested

## Best Practices

1. **Use Dynamic Imports**: Avoid import-time errors
2. **Guard Clauses**: Use `if (!manager) return;` for optional tests
3. **Descriptive Names**: Test names should clearly describe what they test
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Mock External Dependencies**: Don't test Phaser, test your code
6. **Test Behavior, Not Implementation**: Test what the manager does, not how
7. **Isolate Tests**: Each test should be independent
8. **Use Test Helpers**: Reuse `createMockScene()`, `createMockHero()`, etc.

## Running Tests

```bash
# Run all manager tests
npm run test:unit

# Run specific manager tests
npm run test:unit -- equipment-manager

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Test File Naming

- Format: `{manager-name}.test.js`
- Location: `tests/unit/managers/`
- Example: `equipment-manager.test.js`

## Common Test Categories

1. **Initialization** - Manager setup and configuration
2. **Core Functionality** - Main manager operations
3. **State Management** - State changes and retrieval
4. **Event System** - Event emission and handling
5. **Error Handling** - Edge cases and error paths
6. **Integration** - Interaction with other managers
7. **Cleanup** - Resource cleanup and destruction

## Example: Complete Test File

See `tests/unit/managers/equipment-manager.test.js` and `tests/unit/managers/combat-manager.test.js` for complete examples of manager testing patterns.


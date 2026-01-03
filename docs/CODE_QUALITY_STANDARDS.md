# Code Quality Standards

## Overview

This document defines the code quality standards and best practices for Road of War. All code should adhere to these standards to ensure maintainability, reliability, and consistency.

## Core Principles

1. **Correctness** - Code must work correctly
2. **Maintainability** - Code must be easy to understand and modify
3. **Minimal, Well-Scoped Change** - Changes should be focused and reversible
4. **Cleanliness** - Codebase should be cleaner after changes

## Architecture Patterns

### Manager Pattern

All game systems use the Manager pattern, extending `BaseManager`:

```javascript
import { BaseManager } from './base-manager.js';

export class MyManager extends BaseManager {
    static getDependencies() {
        return ['partyManager', 'combatManager'];
    }

    async init() {
        // Initialization logic
        await super.init();
    }

    destroy() {
        // Cleanup logic
        super.destroy();
    }
}
```

**Requirements**:
- ✅ Extend `BaseManager`
- ✅ Implement `getDependencies()` if dependencies exist
- ✅ Override `init()` for initialization
- ✅ Override `destroy()` for cleanup
- ✅ Use `getState()` for debugging/testing

### Event-Driven Communication

All inter-manager communication uses events:

```javascript
// Emit event
this.scene.events.emit('item.equipment.changed', {
    heroId: hero.id,
    item: item,
    slot: slot
});

// Listen for event
this.scene.events.on('item.equipment.changed', (data) => {
    // Handle event
});
```

**Requirements**:
- ✅ Use `GameEvents` constants from `src/utils/event-constants.js`
- ✅ Include relevant data in event payload
- ✅ Remove event listeners in `destroy()`

### Data-Driven Design

All gameplay values come from JSON data files:

```javascript
// ✅ Good - Data-driven
const itemData = this.scene.cache.json.get('items');
const item = itemData.weapons.rusty_sword;

// ❌ Bad - Hardcoded
const item = { attack: 10, defense: 5 };
```

**Requirements**:
- ✅ No hardcoded gameplay values
- ✅ All values in `public/data/*.json`
- ✅ Use `scene.cache.json.get()` to access data

## Code Organization

### File Structure

- **Managers**: `src/managers/{manager-name}.js`
- **Utils**: `src/utils/{utility-name}.js`
- **Scenes**: `src/scenes/{scene-name}.js`
- **Generators**: `src/generators/{generator-name}.js`
- **Data**: `public/data/{data-name}.json`

### Naming Conventions

- **Classes**: PascalCase (`EquipmentManager`)
- **Functions**: camelCase (`equipItem`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PARTY_SIZE`)
- **Files**: kebab-case (`equipment-manager.js`)
- **Events**: dot.notation (`item.equipment.changed`)

### Import Organization

```javascript
// 1. External dependencies
import { Phaser } from 'phaser';

// 2. Internal utilities
import { Logger } from '../utils/logger.js';
import { BaseManager } from './base-manager.js';

// 3. Constants
import { GameEvents } from '../utils/event-constants.js';

// 4. Types (if using TypeScript)
// import type { Hero } from '../types/hero.js';
```

## Code Quality Standards

### Null Safety

Always check for null/undefined:

```javascript
// ✅ Good
if (!hero || !item) {
    Logger.warn('EquipmentManager', 'Invalid hero or item');
    return false;
}

// ❌ Bad
const result = hero.equipment[slot].id; // May throw if undefined
```

**Requirements**:
- ✅ Validate inputs at function entry
- ✅ Use optional chaining (`?.`) when appropriate
- ✅ Provide default values where safe
- ✅ Log warnings for invalid inputs

### Array Safety

Always validate arrays:

```javascript
// ✅ Good
if (!Array.isArray(heroes) || heroes.length === 0) {
    return [];
}

// ❌ Bad
heroes.forEach(hero => { // May throw if not array
    // ...
});
```

**Requirements**:
- ✅ Use `Array.isArray()` checks
- ✅ Check length before iteration
- ✅ Handle empty arrays gracefully

### Error Handling

Use consistent error handling:

```javascript
// ✅ Good
try {
    const result = riskyOperation();
    return result;
} catch (error) {
    Logger.error('ManagerName', `Operation failed: ${error.message}`);
    return null; // Or appropriate default
}

// ❌ Bad
const result = riskyOperation(); // May throw unhandled
```

**Requirements**:
- ✅ Use try-catch for risky operations
- ✅ Log errors with context
- ✅ Return safe defaults
- ✅ Use `SafeExecutor` for critical paths

### Validation

Use `ValidationBuilder` for complex validation:

```javascript
// ✅ Good
const validation = new ValidationBuilder()
    .require(hero, 'Hero is required')
    .require(item, 'Item is required')
    .validate(() => hero.level >= item.level, 'Hero level too low')
    .build();

if (!validation.isValid) {
    Logger.warn('EquipmentManager', validation.error);
    return false;
}

// ❌ Bad
if (!hero || !item || hero.level < item.level) {
    return false; // Unclear error
}
```

**Requirements**:
- ✅ Use `ValidationBuilder` for complex validation
- ✅ Provide clear error messages
- ✅ Validate early, fail fast

## UI Standards

### UI_CONFIG Usage

All UI values must use `UI_CONFIG`:

```javascript
// ✅ Good
import { UI_CONFIG, getScaledValue } from '../config/ui-config.js';

const fontSize = getScaledValue(UI_CONFIG.FONTS.SIZES.BODY, height, 'height');
const color = UI_CONFIG.COLORS.TEXT_PRIMARY;

// ❌ Bad
const fontSize = 16; // Hardcoded
const color = '#ffffff'; // Hardcoded
```

**Requirements**:
- ✅ No hardcoded UI values
- ✅ Use `getScaledValue()` for responsive scaling
- ✅ Use `UI_CONFIG` for all styling
- ✅ Follow `SCENE_CONFIG` for scene-specific values

### Responsive Design

All UI must be responsive:

```javascript
// ✅ Good
const width = this.scene.scale.width;
const height = this.scene.scale.height;
const panelWidth = getScaledValue(400, width);
const panelHeight = getScaledValue(300, height, 'height');

// ❌ Bad
const panelWidth = 400; // Fixed size
const panelHeight = 300; // Fixed size
```

**Requirements**:
- ✅ Use `getScaledValue()` for all dimensions
- ✅ Base scaling on screen dimensions
- ✅ Test at different resolutions

## Performance Standards

### Memory Management

- ✅ Clean up resources in `destroy()`
- ✅ Remove event listeners
- ✅ Clear object pools
- ✅ Destroy Phaser objects properly

### Update Loop Optimization

- ✅ Throttle expensive operations
- ✅ Use object pooling for frequently created objects
- ✅ Cache expensive calculations
- ✅ Skip updates when not needed

### Performance Monitoring

- ✅ Monitor FPS in development
- ✅ Track memory usage
- ✅ Profile critical paths
- ✅ Use `PerformanceMonitor` for tracking

## Testing Standards

### Unit Tests

All managers must have unit tests:

```javascript
// ✅ Good
describe('EquipmentManager', () => {
    it('should equip item', () => {
        const result = equipmentManager.equipItem(hero, item);
        expect(result).toBe(true);
        expect(hero.equipment[item.slot]).toBe(item);
    });
});
```

**Requirements**:
- ✅ Test all public methods
- ✅ Test error cases
- ✅ Test edge cases
- ✅ Use mocks for dependencies

### Test Coverage

- **Target**: 80%+ coverage
- **Critical Paths**: 100% coverage
- **Edge Cases**: All identified cases tested

## Documentation Standards

### Code Comments

```javascript
/**
 * Equip an item to a hero
 * @param {Object} hero - Hero object
 * @param {Object} item - Item object
 * @returns {boolean} True if successful
 */
equipItem(hero, item) {
    // Implementation
}
```

**Requirements**:
- ✅ Document public methods
- ✅ Include parameter types
- ✅ Include return types
- ✅ Explain non-obvious logic

### File Headers

```javascript
/**
 * Equipment Manager
 * Manages equipment for all heroes in the party
 * Handles equipping, unequipping, stat calculations, set bonuses
 */
```

## Self-Healing Rules

When modifying code, you must:

1. **Remove unused imports, variables, and functions**
2. **Fix formatting inconsistencies you touched**
3. **Ensure naming matches nearby conventions**
4. **Delete temporary/debug code**

If you introduce:
- A workaround
- A hack
- A temporary assumption

You must either:
- Resolve it fully, OR
- Clearly justify it with an intentional comment

## Scope Discipline

- ✅ Do not refactor unrelated code
- ✅ Only refactor if it directly blocks work
- ✅ If larger refactor needed, ask before proceeding

## Post-Change Review

Before finalizing changes:

1. Review changes as a strict code reviewer
2. Ask: what could break, confuse, or fail?
3. Fix obvious issues
4. Remove dead code, debug logs, artifacts

## Tools and Automation

### Linting

- **ESLint**: Configured for JavaScript
- **Run**: `npm run lint`
- **Fix**: `npm run lint:fix`

### Formatting

- **Prettier**: Code formatting (if configured)
- **Consistency**: Follow existing code style

### Testing

- **Vitest**: Unit testing framework
- **Run**: `npm run test:unit`
- **Coverage**: `npm run test:coverage`

## Code Review Checklist

Before submitting code:

- [ ] Code follows Manager pattern
- [ ] Events use GameEvents constants
- [ ] No hardcoded values (data-driven)
- [ ] Null/undefined checks in place
- [ ] Array validation in place
- [ ] Error handling implemented
- [ ] UI uses UI_CONFIG
- [ ] Responsive design applied
- [ ] Memory cleanup in destroy()
- [ ] Unit tests written
- [ ] Documentation updated
- [ ] No unused code
- [ ] No debug logs
- [ ] Linting passes

## Conclusion

Following these standards ensures:
- **Maintainability**: Code is easy to understand and modify
- **Reliability**: Code handles edge cases and errors
- **Consistency**: Code follows established patterns
- **Performance**: Code is optimized and monitored
- **Testability**: Code is testable and tested

**Remember**: Leave the codebase cleaner than you found it.


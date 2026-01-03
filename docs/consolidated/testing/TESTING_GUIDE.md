# Testing Guide - 5-Man Team System

## Quick Start

### Option 1: Automated Testing (Recommended)

```bash
npm run test:full
```

This single command starts everything and runs the full test suite.

### Option 2: Manual Testing

1. Start the game:
   ```bash
   npm run dev        # For browser testing
   # OR
   npm start          # For Electron desktop testing
   ```

2. Open browser console (F12) to monitor for errors

3. Follow the comprehensive test plan in `COMPREHENSIVE_TEST_EXECUTION.md`

## Test Priority

### 🔴 Critical (Test First - 20 minutes)

1. **Party Creation** (Test Suite 2)
   - Can you create a party?
   - Do all heroes appear?

2. **Combat System** (Test Suite 3)
   - Does combat trigger?
   - Do all 5 heroes attack?
   - Does combat end correctly?

3. **Integration** (Test Suite 9)
   - Does the full flow work?

### 🟡 High Priority (Test Next - 30 minutes)

4. **Health Bar Updates** (Test Suite 4)
5. **Level-Up System** (Test Suite 5)
6. **Save/Load** (Test Suite 7)

### 🟢 Medium Priority (Test Last - 20 minutes)

7. **Equipment Management** (Test Suite 6)
8. **UI/UX** (Test Suite 8)
9. **Achievements** (Test Suite 1)

## What to Look For

### ✅ Success Indicators

- **Console shows**: `party_combat_start` event
- **Console shows**: Attack logs for all 5 heroes
- **Visual**: All 5 heroes attack during combat
- **Visual**: Health bars update in real-time
- **Visual**: Level-up effects when heroes gain XP
- **No errors**: Console should be clean (no red errors)

### ❌ Failure Indicators

- **Console errors**: Any red errors
- **Missing events**: No `party_combat_start` event
- **Only 1 hero attacks**: Party attack not working
- **Combat doesn't end**: End condition bug
- **Health bars don't update**: Update system not working

## Critical Tests (Must Pass)

- ✅ Test 2.1-2.5: Party Creation
- ✅ Test 3.1-3.5: Combat System
- ✅ Test 9.1: Integration

## Console Commands to Watch

- `party_combat_start` - Party combat triggered
- Attack logs for each hero
- XP distribution logs
- Level-up logs

## Red Flags

- ❌ Only 1 hero attacks (should be 5)
- ❌ Combat doesn't end
- ❌ Health bars don't update
- ❌ Party data lost on save/load

## Reporting Issues

When you find an issue:

1. **Note the test case** (e.g., "Test 3.2: All Heroes Attacking")
2. **Check console** for errors
3. **Take screenshot** if visual issue
4. **Document steps** to reproduce
5. **Record in test document**

## Expected Test Results

### Best Case Scenario ✅
- All 25 tests pass
- No critical bugs
- Minor polish issues only

### Realistic Scenario ⚠️
- Most tests pass
- 1-3 minor bugs found
- Some edge cases need work

### Worst Case Scenario ❌
- Critical bugs found
- Core features broken
- Needs immediate fixes

## After Testing

1. **Document Results**: Fill in `COMPREHENSIVE_TEST_EXECUTION.md`
2. **Report Issues**: List all bugs found
3. **Prioritize Fixes**: Critical → High → Medium
4. **Update Memory Bank**: Document findings

## Need Help?

- **Game won't start?** Check `package.json` scripts
- **Console errors?** Check browser compatibility
- **Tests unclear?** Read `COMPREHENSIVE_TEST_EXECUTION.md`
- **Code questions?** Check `TEST_READINESS_REPORT.md`

## Testing Patterns

For detailed testing patterns and best practices, see:
- **Manager Testing Patterns**: `MANAGER_TESTING_PATTERNS.md` - Standardized patterns for testing Manager classes
- **Test Coverage Report**: `TEST_COVERAGE_REPORT.md` - Current test coverage status

### Quick Reference

**Unit Testing**:
- Location: `tests/unit/managers/`
- Framework: Vitest
- Helpers: `tests/utils/test-helpers.js`
- Pattern: See `MANAGER_TESTING_PATTERNS.md`

**Integration Testing**:
- Location: `tests/integration/`
- Tests: System-to-system interactions
- Examples: `party-combat-loot-flow.test.js`, `equipment-combat-integration.test.js`

**E2E Testing**:
- Location: `tests/ultimate-test-suite.js`
- Framework: Playwright
- Command: `npm run test:ultimate`

---

**Ready to test?** Start with **Test Suite 2: Party Creation Flow** in `COMPREHENSIVE_TEST_EXECUTION.md`

**Good luck! 🎮**





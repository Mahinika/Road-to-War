# Comprehensive Testing Guide - Road of War

## Overview

This guide covers all automated testing options for Road of War, including unit tests, integration tests, and comprehensive end-to-end tests.

## Quick Start

### Run All Tests
```bash
npm run test:all
```

This runs both unit tests and comprehensive browser tests.

### Run Individual Test Suites

**Unit Tests** (Fast, no browser required):
```bash
npm run test:unit
```

**Comprehensive Tests** (Browser automation, requires dev server):
```bash
# Start dev server first
npm run dev

# In another terminal, run tests
npm run test:comprehensive
```

**With Options**:
```bash
# Run in headless mode (no browser window)
npm run test:comprehensive -- --headless

# Run with specific browser
npm run test:comprehensive -- --browser=firefox
npm run test:comprehensive -- --browser=webkit
```

## Test Suites

### 1. Unit Test Suite (`tools/unit-test-suite.js`)

**What it tests:**
- Data file integrity (JSON files exist and are valid)
- File structure (required files exist)
- Code analysis (methods exist in code)

**Advantages:**
- Fast execution (< 1 second)
- No browser/server required
- Can run in CI/CD pipelines
- Tests code structure and data files

**Test Coverage:**
- ✅ Data files (items.json, enemies.json, world-config.json, etc.)
- ✅ File structure (managers, generators, handlers)
- ✅ Method existence (generateItemForMile, calculateSetBonuses, etc.)

**Example Output:**
```
🧪 Unit Test Suite for Road of War
============================================================

📁 Testing Data Files...
  ✅ items.json exists and is valid
  ✅ items.json has sets defined
  ✅ world-config.json exists and has endgame config
  ...

📊 TEST RESULTS SUMMARY
============================================================
Total Tests: 15
✅ Passed: 15
❌ Failed: 0
⏱️  Duration: 0.45s
```

### 2. Comprehensive Test Suite (`tools/comprehensive-test-suite.js`)

**What it tests:**
- Core game systems (party creation, combat, equipment, talents)
- Endgame systems (item level, milestones, prestige, sets)
- Integration tests (full game flow, save/load)
- Performance tests (load time, memory usage)

**Requirements:**
- Dev server running (`npm run dev`)
- Playwright installed (already in devDependencies)

**Test Coverage:**

#### Core Systems
- ✅ Party Creation
- ✅ Combat System
- ✅ Equipment System
- ✅ Talent System

#### Endgame Systems
- ✅ Item Level Scaling
- ✅ Milestone Rewards
- ✅ Prestige Integration
- ✅ Gear Sets System
- ✅ Level Cap System

#### Integration Tests
- ✅ Full Game Flow
- ✅ Save/Load System

#### Performance Tests
- ✅ Page Load Time
- ✅ Memory Usage

**Example Output:**
```
🧪 Comprehensive Test Suite for Road of War

Browser: chromium
Headless: true
Base URL: http://localhost:3000

Running test suites...

📦 Core Systems
──────────────────────────────────────────────────
  ✅ Party Creation
  ✅ Combat System
  ✅ Equipment System
  ✅ Talent System

📦 Endgame Systems
──────────────────────────────────────────────────
  ✅ Item Level Scaling
  ✅ Milestone Rewards
  ✅ Prestige Integration
  ✅ Gear Sets System
  ✅ Level Cap System

📊 TEST RESULTS SUMMARY
============================================================
Total Tests: 11
✅ Passed: 11
❌ Failed: 0
⏱️  Duration: 45.23s
```

## Test Reports

Both test suites generate JSON reports:

- **Unit Tests**: `tools/unit-test-results.json`
- **Comprehensive Tests**: `tools/test-results.json`

Reports include:
- Test results (passed/failed)
- Error messages
- Duration metrics
- Configuration used

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit

  comprehensive-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm install -g playwright
      - run: npx playwright install chromium
      - run: npm run dev &
      - run: sleep 5
      - run: npm run test:comprehensive -- --headless
```

## Manual Testing

For manual testing, see:
- `docs/consolidated/testing/COMPREHENSIVE_TEST_EXECUTION.md`
- `docs/consolidated/testing/TESTING_CHECKLIST.md`

## Troubleshooting

### Tests Fail with "Connection Refused"
- Ensure dev server is running: `npm run dev`
- Check that server is on `http://localhost:3000`

### Playwright Browser Not Found
```bash
npx playwright install chromium
```

### Tests Timeout
- Increase timeout in test file: `config.testTimeout`
- Check that game loads properly in browser

### Unit Tests Fail
- Check that all data files exist in `public/data/`
- Verify file paths are correct
- Check JSON syntax in data files

## Adding New Tests

### Adding Unit Tests

Edit `tools/unit-test-suite.js`:

```javascript
test('My new test', () => {
    assert(condition, 'Error message if fails');
});
```

### Adding Comprehensive Tests

Edit `tools/comprehensive-test-suite.js`:

```javascript
async testMyNewFeature() {
    const testName = 'My New Feature';
    try {
        // Test code here
        testResults.passed.push({ test: testName });
        return { passed: true, test: testName };
    } catch (error) {
        testResults.failed.push({ test: testName, error: error.message });
        return { passed: false, test: testName, error: error.message };
    }
}
```

Then add to test suite:
```javascript
{ name: 'My Suite', tests: [
    () => myTests.testMyNewFeature()
]}
```

## Best Practices

1. **Run unit tests first** - Fast feedback on code structure
2. **Run comprehensive tests before commits** - Catch integration issues
3. **Check test reports** - Review JSON files for detailed results
4. **Fix failing tests immediately** - Don't let tests accumulate failures
5. **Add tests for new features** - Maintain test coverage

## Test Coverage Goals

- ✅ All data files validated
- ✅ All managers have required methods
- ✅ Core game flow works
- ✅ Endgame systems functional
- ✅ Performance within acceptable limits

## Next Steps

- [ ] Add more unit tests for individual manager methods
- [ ] Add visual regression tests
- [ ] Add performance benchmarks
- [ ] Add accessibility tests
- [ ] Integrate with CI/CD pipeline


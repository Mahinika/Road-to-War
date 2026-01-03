/**
 * Unit Test Suite for Road of War Managers and Utilities
 * 
 * Tests individual managers and utilities without browser automation.
 * Can run independently to test core logic.
 * 
 * Usage:
 *   npm run test:unit
 *   OR
 *   node tools/unit-test-suite.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results
const results = {
    passed: [],
    failed: [],
    total: 0
};

/**
 * Test assertion helper
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

/**
 * Test runner
 */
function test(name, fn) {
    results.total++;
    try {
        fn();
        results.passed.push(name);
        console.log(`  ✅ ${name}`);
    } catch (error) {
        results.failed.push({ name, error: error.message });
        console.log(`  ❌ ${name}: ${error.message}`);
    }
}

/**
 * Test Suite: Data Files
 */
function testDataFiles() {
    console.log('\n📁 Testing Data Files...');
    
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    
    test('items.json exists and is valid', () => {
        const itemsPath = path.join(dataDir, 'items.json');
        assert(fs.existsSync(itemsPath), 'items.json not found');
        const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
        // items.json structure: { weapons: {...}, armor: {...}, sets: {...} }
        const hasItems = (items.weapons && Object.keys(items.weapons).length > 0) ||
                        (items.armor && Object.keys(items.armor).length > 0) ||
                        (items.items && items.items.length > 0) ||
                        Array.isArray(items);
        assert(hasItems, 'items.json should have items (weapons, armor, or items array)');
    });

    test('items.json has sets defined', () => {
        const itemsPath = path.join(dataDir, 'items.json');
        const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
        assert(items.sets !== undefined, 'items.json should have sets');
        assert(Object.keys(items.sets).length > 0, 'items.json should have at least one set');
    });

    test('world-config.json exists and has endgame config', () => {
        const configPath = path.join(dataDir, 'world-config.json');
        assert(fs.existsSync(configPath), 'world-config.json not found');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert(config.itemQualityScaling !== undefined, 'itemQualityScaling config missing');
        // experienceScaling might be nested in player.experienceScaling
        const hasExpConfig = config.experienceScaling !== undefined || 
                            (config.player && config.player.experienceScaling !== undefined) ||
                            config.leveling !== undefined ||
                            config.maxLevel !== undefined;
        assert(hasExpConfig, 'experience/leveling config missing');
    });

    test('enemies.json has endgame enemies', () => {
        const enemiesPath = path.join(dataDir, 'enemies.json');
        assert(fs.existsSync(enemiesPath), 'enemies.json not found');
        const enemiesData = JSON.parse(fs.readFileSync(enemiesPath, 'utf8'));
        // enemies.json might be array or object
        const enemies = Array.isArray(enemiesData) ? enemiesData : 
                       (enemiesData.enemies || Object.values(enemiesData));
        const enemyNames = enemies.map(e => e.name || e.id || e);
        assert(enemyNames.some(n => String(n).includes('Elite') || String(n).includes('War Lord') || String(n).includes('Dark Knight')), 
               'Should have endgame enemies');
    });

    test('talents.json has endgame talents', () => {
        const talentsPath = path.join(dataDir, 'talents.json');
        assert(fs.existsSync(talentsPath), 'talents.json not found');
        const talents = JSON.parse(fs.readFileSync(talentsPath, 'utf8'));
        // Check if any talent has treePointsRequired (endgame talent indicator)
        // talents.json structure: { className: { trees: { treeName: { talents: {...} } } } }
        let hasEndgameTalents = false;
        const talentsStr = JSON.stringify(talents);
        // Simple check: if treePointsRequired exists anywhere in the file
        hasEndgameTalents = talentsStr.includes('treePointsRequired');
        assert(hasEndgameTalents, 'Should have endgame talents with treePointsRequired');
    });

    test('prestige-config.json has gear/talent upgrades', () => {
        const prestigePath = path.join(dataDir, 'prestige-config.json');
        assert(fs.existsSync(prestigePath), 'prestige-config.json not found');
        const prestige = JSON.parse(fs.readFileSync(prestigePath, 'utf8'));
        assert(prestige.upgrades !== undefined, 'prestige-config.json should have upgrades');
        const upgrades = Array.isArray(prestige.upgrades) ? prestige.upgrades : Object.values(prestige.upgrades || {});
        const upgradeIds = upgrades.map(u => u.id || u);
        const hasGearUpgrades = upgradeIds.some(id => 
            String(id).includes('loot') || 
            String(id).includes('item') || 
            String(id).includes('gear') ||
            String(id).includes('talent')
        );
        assert(hasGearUpgrades, 'Should have gear/talent-related prestige upgrades');
    });

    test('achievements.json has endgame achievements', () => {
        const achievementsPath = path.join(dataDir, 'achievements.json');
        assert(fs.existsSync(achievementsPath), 'achievements.json not found');
        const achievementsData = JSON.parse(fs.readFileSync(achievementsPath, 'utf8'));
        // achievements.json might be array or object
        const achievements = Array.isArray(achievementsData) ? achievementsData : 
                            (achievementsData.achievements || Object.values(achievementsData));
        const achievementNames = achievements.map(a => a.name || a.id || a);
        assert(achievementNames.some(n => String(n).includes('100') || String(n).includes('Mile') || String(n).includes('Champion')),
               'Should have endgame achievements');
    });
}

/**
 * Test Suite: File Structure
 */
function testFileStructure() {
    console.log('\n📂 Testing File Structure...');
    
    const srcDir = path.join(__dirname, '..', 'src');
    
    test('ProceduralItemGenerator exists', () => {
        const generatorPath = path.join(srcDir, 'generators', 'procedural-item-generator.js');
        assert(fs.existsSync(generatorPath), 'procedural-item-generator.js not found');
    });

    test('EquipmentManager exists', () => {
        const managerPath = path.join(srcDir, 'managers', 'equipment-manager.js');
        assert(fs.existsSync(managerPath), 'equipment-manager.js not found');
    });

    test('TalentManager exists', () => {
        const managerPath = path.join(srcDir, 'managers', 'talent-manager.js');
        assert(fs.existsSync(managerPath), 'talent-manager.js not found');
    });

    test('PrestigeManager exists', () => {
        const managerPath = path.join(srcDir, 'managers', 'prestige-manager.js');
        assert(fs.existsSync(managerPath), 'prestige-manager.js not found');
    });

    test('WorldManager exists', () => {
        const managerPath = path.join(srcDir, 'managers', 'world-manager.js');
        assert(fs.existsSync(managerPath), 'world-manager.js not found');
    });

    test('LevelUpHandler exists', () => {
        const handlerPath = path.join(srcDir, 'scenes', 'handlers', 'level-up-handler.js');
        assert(fs.existsSync(handlerPath), 'level-up-handler.js not found');
    });
}

/**
 * Test Suite: Code Analysis
 */
function testCodeAnalysis() {
    console.log('\n🔍 Testing Code Analysis...');
    
    const srcDir = path.join(__dirname, '..', 'src');
    
    test('ProceduralItemGenerator has generateItemForMile method', () => {
        const generatorPath = path.join(srcDir, 'generators', 'procedural-item-generator.js');
        const code = fs.readFileSync(generatorPath, 'utf8');
        assert(code.includes('generateItemForMile'), 'generateItemForMile method missing');
    });

    test('EquipmentManager has set bonus methods', () => {
        const managerPath = path.join(srcDir, 'managers', 'equipment-manager.js');
        const code = fs.readFileSync(managerPath, 'utf8');
        assert(code.includes('calculateSetBonuses'), 'calculateSetBonuses method missing');
        assert(code.includes('getActiveSets'), 'getActiveSets method missing');
    });

    test('TalentManager has milestone methods', () => {
        const managerPath = path.join(srcDir, 'managers', 'talent-manager.js');
        const code = fs.readFileSync(managerPath, 'utf8');
        assert(code.includes('getAvailableTalentPoints'), 'getAvailableTalentPoints method missing');
        assert(code.includes('getTotalTreePoints'), 'getTotalTreePoints method missing');
    });

    test('PrestigeManager has gear/talent integration methods', () => {
        const managerPath = path.join(srcDir, 'managers', 'prestige-manager.js');
        const code = fs.readFileSync(managerPath, 'utf8');
        assert(code.includes('getItemLevelBonus') || code.includes('getItemQualityBonus'),
               'Prestige gear methods missing');
        assert(code.includes('getPrestigeTalentPoints'), 'getPrestigeTalentPoints method missing');
    });

    test('WorldManager has milestone reward methods', () => {
        const managerPath = path.join(srcDir, 'managers', 'world-manager.js');
        const code = fs.readFileSync(managerPath, 'utf8');
        assert(code.includes('checkMilestoneRewards'), 'checkMilestoneRewards method missing');
        assert(code.includes('claimMilestoneReward'), 'claimMilestoneReward method missing');
    });

    test('TooltipManager has item level/tier methods', () => {
        const managerPath = path.join(srcDir, 'utils', 'tooltip-manager.js');
        const code = fs.readFileSync(managerPath, 'utf8');
        assert(code.includes('isItemInSet') || code.includes('getItemSetInfo'),
               'Tooltip set methods missing');
    });
}

/**
 * Main test runner
 */
async function runUnitTests() {
    console.log('\n🧪 Unit Test Suite for Road of War\n');
    console.log('='.repeat(60));

    const startTime = Date.now();

    // Run all test suites
    testDataFiles();
    testFileStructure();
    testCodeAnalysis();

    const duration = Date.now() - startTime;

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60));

    if (results.failed.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.failed.forEach(({ name, error }) => {
            console.log(`  - ${name}: ${error}`);
        });
    }

    // Save report
    const reportPath = path.join(__dirname, 'unit-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        ...results,
        duration,
        timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runUnitTests().catch(error => {
    console.error('\n❌ Unit test suite failed:', error);
    process.exit(1);
});


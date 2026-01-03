/**
 * Test script for Hero Visibility Debugger
 * Run with: node tools/test-debugger.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Hero Visibility Debugger...\n');

// Test 1: File exists
const htmlPath = path.join(__dirname, 'hero-visibility-debugger.html');
if (!fs.existsSync(htmlPath)) {
    console.error('❌ HTML file not found!');
    process.exit(1);
}
console.log('✅ HTML file exists');

// Test 2: Read and validate HTML structure
const html = fs.readFileSync(htmlPath, 'utf8');

// Test 3: Check for required functions
const requiredFunctions = [
    'getGameScene',
    'runFullDiagnostic',
    'forceAllVisible',
    'logHeroStates',
    'checkCameraBounds',
    'runPositionCheck',
    'runDepthCheck',
    'runTextureCheck',
    'runCameraCheck',
    'runUpdateCheck',
    'runAnimationCheck',
    'clearAllTints',
    'toggleIssue',
    'copyToClipboard'
];

console.log('\n📋 Checking required functions:');
let allFunctionsPresent = true;
requiredFunctions.forEach(func => {
    const found = html.includes(`function ${func}`) || html.includes(`${func}()`);
    if (found) {
        console.log(`  ✅ ${func}`);
    } else {
        console.log(`  ❌ ${func} - MISSING`);
        allFunctionsPresent = false;
    }
});

// Test 4: Check for issue categories
const requiredIssues = ['positioning', 'depth', 'texture', 'camera', 'update', 'async'];
console.log('\n📋 Checking issue categories:');
let allIssuesPresent = true;
requiredIssues.forEach(issue => {
    const found = html.includes(`issue-${issue}`) && html.includes(`toggleIssue('${issue}')`);
    if (found) {
        console.log(`  ✅ ${issue}`);
    } else {
        console.log(`  ❌ ${issue} - MISSING`);
        allIssuesPresent = false;
    }
});

// Test 5: Check for window.gameScene references
console.log('\n📋 Checking window.gameScene integration:');
const hasWindowGameScene = html.includes('window.gameScene');
if (hasWindowGameScene) {
    console.log('  ✅ window.gameScene references found');
} else {
    console.log('  ❌ window.gameScene references missing');
    allFunctionsPresent = false;
}

// Test 6: Check for error handling
console.log('\n📋 Checking error handling:');
const hasErrorHandling = html.includes('Game scene not found') && html.includes('getGameScene()');
if (hasErrorHandling) {
    console.log('  ✅ Error handling present');
} else {
    console.log('  ⚠️  Error handling may be incomplete');
}

// Test 7: Check HTML structure
console.log('\n📋 Checking HTML structure:');
const hasDoctype = html.includes('<!DOCTYPE html>');
const hasHead = html.includes('<head>');
const hasBody = html.includes('<body');
const hasScript = html.includes('<script>');

if (hasDoctype && hasHead && hasBody && hasScript) {
    console.log('  ✅ Valid HTML structure');
} else {
    console.log('  ❌ Invalid HTML structure');
    allFunctionsPresent = false;
}

// Test 8: Check for external dependencies
console.log('\n📋 Checking external dependencies:');
const hasTailwind = html.includes('cdn.tailwindcss.com');
const hasLucide = html.includes('unpkg.com/lucide');

if (hasTailwind) {
    console.log('  ✅ Tailwind CSS CDN');
} else {
    console.log('  ⚠️  Tailwind CSS CDN missing');
}

if (hasLucide) {
    console.log('  ✅ Lucide icons CDN');
} else {
    console.log('  ⚠️  Lucide icons CDN missing');
}

// Test 9: Check for diagnostic checks
console.log('\n📋 Checking diagnostic checks:');
const diagnosticChecks = [
    'Positioning',
    'Visibility',
    'Texture',
    'Tint'
];

let allChecksPresent = true;
diagnosticChecks.forEach(check => {
    const found = html.includes(check);
    if (found) {
        console.log(`  ✅ ${check} check`);
    } else {
        console.log(`  ❌ ${check} check - MISSING`);
        allChecksPresent = false;
    }
});

// Final summary
console.log('\n' + '='.repeat(50));
if (allFunctionsPresent && allIssuesPresent && hasWindowGameScene) {
    console.log('✅ All tests passed! Debugger is ready to use.');
    console.log('\n📝 Usage:');
    console.log('  1. Open tools/hero-visibility-debugger.html in a browser');
    console.log('  2. Make sure the game is running');
    console.log('  3. Click "Run Full Diagnostic" to check hero visibility');
    process.exit(0);
} else {
    console.log('❌ Some tests failed. Please review the output above.');
    process.exit(1);
}


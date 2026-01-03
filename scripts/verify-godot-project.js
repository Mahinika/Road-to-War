#!/usr/bin/env node

/**
 * verify-godot-project.js
 * 
 * Verifies the Godot project structure:
 * - All required scene files exist
 * - All manager scripts exist
 * - All data JSON files exist
 * - Autoload definitions match script files
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const godotProjectRoot = join(projectRoot, 'road-to-war');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Expected scenes
const expectedScenes = [
  'Preload.tscn',
  'MainMenu.tscn',
  'CharacterCreation.tscn',
  'World.tscn',
  'TalentAllocation.tscn',
  'SaveLoad.tscn',
  'Options.tscn',
  'Statistics.tscn',
  'Achievements.tscn',
  'Prestige.tscn',
  'Credits.tscn',
  'HUD.tscn',
  'CombatLog.tscn',
  'UnitFrame.tscn',
  'HeroSprite.tscn',
  'FloatingText.tscn',
  'Main.tscn',
];

// Expected managers (from project.godot Autoload section)
const expectedManagers = [
  'Logger',
  'DataManager',
  'SceneManager',
  'GameManager',
  'PartyManager',
  'WorldManager',
  'StatCalculator',
  'AbilityManager',
  'EquipmentManager',
  'TalentManager',
  'CombatManager',
  'CombatAI',
  'CombatActions',
  'StatusEffectsManager',
  'BloodlineManager',
  'StatisticsManager',
  'AchievementManager',
  'AnimationManager',
  'AudioManager',
  'ParticleManager',
  'CameraManager',
  'UITheme',
  'LootManager',
  'ShopManager',
  'PrestigeManager',
  'ResourceManager',
  'MovementManager',
  'SaveManager',
  'DamageCalculator',
];

// Expected data files (from DataManager.gd)
const expectedDataFiles = [
  'abilities.json',
  'achievements.json',
  'animation-config.json',
  'bloodlines.json',
  'classes.json',
  'enemies.json',
  'items.json',
  'keyframe-configs.json',
  'prestige-config.json',
  'skill-gems.json',
  'specializations.json',
  'stats-config.json',
  'talents.json',
  'world-config.json',
];

function checkFileExists(filePath, description) {
  if (existsSync(filePath)) {
    logSuccess(`${description}: ${filePath}`);
    return true;
  } else {
    logError(`${description} NOT FOUND: ${filePath}`);
    return false;
  }
}

function parseProjectGodot() {
  const projectGodotPath = join(godotProjectRoot, 'project.godot');
  
  if (!existsSync(projectGodotPath)) {
    logError('project.godot not found!');
    return null;
  }
  
  const content = readFileSync(projectGodotPath, 'utf-8');
  const autoloads = {};
  const mainScene = content.match(/run\/main_scene="([^"]+)"/);
  
  // Parse Autoload section
  const autoloadSection = content.match(/\[autoload\]([\s\S]*?)(?=\[|$)/);
  if (autoloadSection) {
    const autoloadLines = autoloadSection[1].split('\n');
    for (const line of autoloadLines) {
      const match = line.match(/(\w+)="\*res:\/\/scripts\/(\w+\.gd)"/);
      if (match) {
        const [, name, scriptFile] = match;
        autoloads[name] = scriptFile;
      }
    }
  }
  
  return {
    mainScene: mainScene ? mainScene[1] : null,
    autoloads,
  };
}

function verifyScenes() {
  logInfo('\n=== Verifying Scene Files ===');
  const scenesDir = join(godotProjectRoot, 'scenes');
  let allExist = true;
  
  for (const scene of expectedScenes) {
    const scenePath = join(scenesDir, scene);
    if (!checkFileExists(scenePath, `Scene`)) {
      allExist = false;
    }
  }
  
  return allExist;
}

function verifyManagers(projectConfig) {
  logInfo('\n=== Verifying Manager Scripts ===');
  const scriptsDir = join(godotProjectRoot, 'scripts');
  let allExist = true;
  const missingManagers = [];
  
  for (const managerName of expectedManagers) {
    const scriptFile = projectConfig?.autoloads[managerName] || `${managerName}.gd`;
    const scriptPath = join(scriptsDir, scriptFile);
    
    if (!checkFileExists(scriptPath, `Manager script`)) {
      allExist = false;
      missingManagers.push(managerName);
    }
  }
  
  // Check for managers in Autoload that aren't in expected list
  if (projectConfig) {
    for (const [name, script] of Object.entries(projectConfig.autoloads)) {
      if (!expectedManagers.includes(name)) {
        logWarning(`Unexpected Autoload found: ${name} (${script})`);
      }
    }
  }
  
  return { allExist, missingManagers };
}

function verifyAutoloads(projectConfig) {
  logInfo('\n=== Verifying Autoload Definitions ===');
  
  if (!projectConfig) {
    logError('Cannot verify Autoloads - project.godot not parsed');
    return false;
  }
  
  let allMatch = true;
  
  for (const managerName of expectedManagers) {
    if (!projectConfig.autoloads[managerName]) {
      logError(`Autoload missing in project.godot: ${managerName}`);
      allMatch = false;
    } else {
      const expectedScript = `${managerName}.gd`;
      const actualScript = projectConfig.autoloads[managerName];
      if (actualScript !== expectedScript) {
        logWarning(`Autoload script mismatch for ${managerName}: expected ${expectedScript}, found ${actualScript}`);
      } else {
        logSuccess(`Autoload defined: ${managerName} → ${actualScript}`);
      }
    }
  }
  
  return allMatch;
}

function verifyDataFiles() {
  logInfo('\n=== Verifying Data JSON Files ===');
  const dataDir = join(godotProjectRoot, 'data');
  let allExist = true;
  
  for (const dataFile of expectedDataFiles) {
    const dataPath = join(dataDir, dataFile);
    if (!checkFileExists(dataPath, `Data file`)) {
      allExist = false;
    }
  }
  
  return allExist;
}

function verifyMainScene(projectConfig) {
  logInfo('\n=== Verifying Main Scene ===');
  
  if (!projectConfig) {
    logError('Cannot verify main scene - project.godot not parsed');
    return false;
  }
  
  const expectedMainScene = 'res://scenes/Preload.tscn';
  if (projectConfig.mainScene === expectedMainScene) {
    logSuccess(`Main scene correctly set to: ${expectedMainScene}`);
    return true;
  } else {
    logError(`Main scene mismatch: expected ${expectedMainScene}, found ${projectConfig.mainScene || 'none'}`);
    return false;
  }
}

function generateReport(results) {
  logInfo('\n=== Verification Report ===');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(r => r === true).length;
  const failedChecks = totalChecks - passedChecks;
  
  logInfo(`Total checks: ${totalChecks}`);
  logSuccess(`Passed: ${passedChecks}`);
  if (failedChecks > 0) {
    logError(`Failed: ${failedChecks}`);
  }
  
  logInfo('\n=== Summary ===');
  for (const [check, result] of Object.entries(results)) {
    if (result === true) {
      logSuccess(`${check}: PASS`);
    } else {
      logError(`${check}: FAIL`);
    }
  }
  
  return failedChecks === 0;
}

// Main execution
function main() {
  log('\n🔍 Godot Project Verification\n', 'blue');
  
  // Check if project root exists
  if (!existsSync(godotProjectRoot)) {
    logError(`Godot project directory not found: ${godotProjectRoot}`);
    process.exit(1);
  }
  
  // Parse project.godot
  const projectConfig = parseProjectGodot();
  if (!projectConfig) {
    logError('Failed to parse project.godot');
    process.exit(1);
  }
  
  logSuccess('project.godot parsed successfully');
  logInfo(`Found ${Object.keys(projectConfig.autoloads).length} Autoload definitions`);
  
  // Run all verifications
  const results = {
    'Scenes': verifyScenes(),
    'Manager Scripts': verifyManagers(projectConfig).allExist,
    'Autoload Definitions': verifyAutoloads(projectConfig),
    'Data Files': verifyDataFiles(),
    'Main Scene': verifyMainScene(projectConfig),
  };
  
  // Generate report
  const allPassed = generateReport(results);
  
  if (allPassed) {
    log('\n✅ All verifications passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ Some verifications failed. Please review the errors above.', 'red');
    process.exit(1);
  }
}

main();


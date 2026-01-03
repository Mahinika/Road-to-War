#!/usr/bin/env node

/**
 * verify-godot-mcp.js
 * Verifies Godot MCP setup and connection
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

console.log('🔍 Verifying Godot MCP Setup...\n');

// Check 1: Godot project exists
const godotProjectPath = join(ROOT, 'road-to-war', 'project.godot');
console.log('1. Checking Godot project...');
if (existsSync(godotProjectPath)) {
  console.log('   ✅ Godot project found:', godotProjectPath);
} else {
  console.log('   ❌ Godot project not found:', godotProjectPath);
}

// Check 2: Check for GDAI plugin
const pluginPath = join(ROOT, 'road-to-war', 'addons', 'gdai-mcp-plugin-godot');
console.log('\n2. Checking for GDAI MCP Plugin...');
if (existsSync(pluginPath)) {
  console.log('   ✅ GDAI MCP Plugin found:', pluginPath);
} else {
  console.log('   ⚠️  GDAI MCP Plugin not found (optional - built-in MCP may work)');
  console.log('   📝 To install: Download from https://gdaimcp.com');
  console.log('   📝 Extract to: road-to-war/addons/gdai-mcp-plugin-godot/');
}

// Check 3: Verify project structure
console.log('\n3. Verifying project structure...');
const requiredPaths = [
  'road-to-war/scenes',
  'road-to-war/scripts',
  'road-to-war/data',
  'road-to-war/assets'
];

let allPathsExist = true;
for (const relPath of requiredPaths) {
  const fullPath = join(ROOT, relPath);
  if (existsSync(fullPath)) {
    console.log(`   ✅ ${relPath}`);
  } else {
    console.log(`   ❌ ${relPath} - MISSING`);
    allPathsExist = false;
  }
}

// Check 4: Check for main scene
const mainScene = join(ROOT, 'road-to-war', 'scenes', 'Preload.tscn');
console.log('\n4. Checking main scene...');
if (existsSync(mainScene)) {
  console.log('   ✅ Main scene (Preload.tscn) found');
} else {
  console.log('   ❌ Main scene not found');
}

// Summary
console.log('\n📊 Summary:');
console.log('─'.repeat(50));

if (existsSync(godotProjectPath) && allPathsExist) {
  console.log('✅ Godot project structure is valid');
  console.log('\n📝 Next Steps:');
  console.log('   1. Open Godot Editor with: road-to-war/project.godot');
  console.log('   2. Verify MCP tools are available in Cursor');
  console.log('   3. Test with: "Get current scene info"');
  
  if (!existsSync(pluginPath)) {
    console.log('\n   Optional: Install GDAI MCP Plugin for enhanced features');
  }
} else {
  console.log('❌ Some issues found - please fix before using MCP');
}

console.log('\n💡 Tip: MCP tools should be available automatically in Cursor');
console.log('   if Godot Editor is running with the project open.\n');


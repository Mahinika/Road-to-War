#!/usr/bin/env node

/**
 * fix-logger-calls.js
 * 
 * Fixes all Logger.info/warn/error/debug calls in Godot scripts
 * to use get_node("/root/Logger") pattern to avoid parser errors
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const scriptsDir = join(projectRoot, 'road-to-war', 'scripts');

// Helper function pattern to add to each file
const helperFunctions = `
func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_warn(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.warn(source, message)
	else:
		print("[%s] [WARN] %s" % [source, message])

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])
`;

function fixFile(filePath) {
	let content = readFileSync(filePath, 'utf-8');
	let modified = false;
	
	// Check if file already has helper functions
	if (content.includes('func _get_logger()')) {
		return false; // Already fixed
	}
	
	// Count Logger calls
	const loggerCalls = (content.match(/Logger\.(info|warn|error|debug)\(/g) || []).length;
	if (loggerCalls === 0) {
		return false; // No Logger calls
	}
	
	// Add helper functions after the first function or after extends/class_name
	let insertPoint = content.indexOf('\nfunc ');
	if (insertPoint === -1) {
		insertPoint = content.indexOf('\nclass_name ');
	}
	if (insertPoint === -1) {
		insertPoint = content.indexOf('\n@onready ');
	}
	if (insertPoint === -1) {
		insertPoint = content.indexOf('\nvar ');
	}
	if (insertPoint === -1) {
		insertPoint = content.indexOf('\nsignal ');
	}
	if (insertPoint === -1) {
		insertPoint = content.length;
	}
	
	// Find the line after extends/class_name
	const extendsMatch = content.match(/^(extends\s+\w+)/m);
	if (extendsMatch) {
		const afterExtends = content.indexOf('\n', extendsMatch.index + extendsMatch[0].length);
		if (afterExtends !== -1 && afterExtends < insertPoint) {
			insertPoint = afterExtends;
		}
	}
	
	// Insert helper functions
	content = content.slice(0, insertPoint + 1) + helperFunctions + content.slice(insertPoint + 1);
	
	// Replace Logger calls
	content = content.replace(/Logger\.info\(/g, '_log_info(');
	content = content.replace(/Logger\.warn\(/g, '_log_warn(');
	content = content.replace(/Logger\.error\(/g, '_log_error(');
	content = content.replace(/Logger\.debug\(/g, '_log_debug(');
	
	writeFileSync(filePath, content, 'utf-8');
	return true;
}

function processDirectory(dir) {
	const files = readdirSync(dir);
	let fixedCount = 0;
	
	for (const file of files) {
		if (file.endsWith('.gd')) {
			const filePath = join(dir, file);
			if (fixFile(filePath)) {
				console.log(`Fixed: ${file}`);
				fixedCount++;
			}
		}
	}
	
	return fixedCount;
}

// Main execution
console.log('Fixing Logger calls in Godot scripts...\n');
const fixed = processDirectory(scriptsDir);
console.log(`\nFixed ${fixed} files.`);


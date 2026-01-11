#!/usr/bin/env node
/**
 * Run Balance Audit - Automated Balance Testing Script
 * 
 * This script attempts to run the Godot balance audit programmatically.
 * It tries multiple methods and provides fallback instructions if needed.
 * 
 * Usage:
 *   node scripts/run-balance-audit.js
 *   npm run balance-audit (if added to package.json)
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Report paths (check both locations)
const USER_REPORT_PATH = path.join(
    process.env.APPDATA || process.env.HOME || process.env.USERPROFILE || '',
    'Godot', 'app_userdata', 'Road to war', 'stats_audit_report.json'
);
const CURSOR_REPORT_PATH = path.join(ROOT, '.cursor', 'stats_audit_report.json');
const GODOT_PROJECT_PATH = path.join(ROOT, 'road-to-war', 'project.godot');
const RUN_AUDIT_SCENE = path.join(ROOT, 'road-to-war', 'scenes', 'RunBalanceAudit.tscn');

// Common Godot executable locations (Windows)
const GODOT_PATHS = [
    'godot', // In PATH
    'godot.exe', // In PATH
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Godot', 'Godot.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Godot', 'Godot.exe'),
    path.join(process.env.USERPROFILE || '', 'Desktop', 'Godot.exe'),
];

console.log('═══════════════════════════════════════════════════════════');
console.log('        ROAD OF WAR - BALANCE AUDIT RUNNER');
console.log('═══════════════════════════════════════════════════════════\n');

/**
 * Find Godot executable
 */
function findGodotExecutable() {
    for (const godotPath of GODOT_PATHS) {
        try {
            // Check if it's in PATH
            if (godotPath === 'godot' || godotPath === 'godot.exe') {
                try {
                    execSync(`"${godotPath}" --version`, { stdio: 'ignore', timeout: 5000 });
                    return godotPath;
                } catch (e) {
                    continue;
                }
            }
            // Check if file exists
            if (fs.existsSync(godotPath)) {
                return godotPath;
            }
        } catch (e) {
            continue;
        }
    }
    return null;
}

/**
 * Wait for report file to be generated (with timeout)
 */
function waitForReport(timeoutMs = 60000, pollIntervalMs = 1000) {
    const startTime = Date.now();
    const checkPaths = [CURSOR_REPORT_PATH, USER_REPORT_PATH];
    
    return new Promise((resolve, reject) => {
        const check = setInterval(() => {
            // Check both possible locations
            for (const reportPath of checkPaths) {
                if (fs.existsSync(reportPath)) {
                    clearInterval(check);
                    resolve(reportPath);
                    return;
                }
            }
            
            // Timeout check
            if (Date.now() - startTime > timeoutMs) {
                clearInterval(check);
                reject(new Error(`Report not generated within ${timeoutMs}ms timeout`));
            }
        }, pollIntervalMs);
    });
}

/**
 * Try to run audit using Godot command line
 */
async function runAuditCommandLine() {
    console.log('🔍 Attempting to run audit via Godot command line...\n');
    
    const godotExe = findGodotExecutable();
    if (!godotExe) {
        console.log('❌ Godot executable not found in common locations\n');
        return false;
    }
    
    console.log(`✅ Found Godot: ${godotExe}\n`);
    
    // Check if project file exists
    if (!fs.existsSync(GODOT_PROJECT_PATH)) {
        console.error(`❌ Project file not found: ${GODOT_PROJECT_PATH}`);
        return false;
    }
    
    // Change to project directory
    const projectDir = path.dirname(GODOT_PROJECT_PATH);
    const scenePath = path.relative(projectDir, RUN_AUDIT_SCENE).replace(/\\/g, '/');
    
    // Remove existing report if it exists (to ensure fresh audit)
    for (const reportPath of [CURSOR_REPORT_PATH, USER_REPORT_PATH]) {
        if (fs.existsSync(reportPath)) {
            try {
                fs.unlinkSync(reportPath);
                console.log(`🗑️  Removed existing report: ${reportPath}`);
            } catch (e) {
                // Ignore errors
            }
        }
    }
    
    console.log(`🚀 Running balance audit...\n`);
    console.log(`   Project: ${GODOT_PROJECT_PATH}`);
    console.log(`   Scene: res://scenes/RunBalanceAudit.tscn\n`);
    
    return new Promise((resolve) => {
        // Try multiple approaches: scene or CLI script
        // Approach 1: Run via CLI script (extends SceneTree, creates its own tree)
        const cliScript = path.join(projectDir, 'scripts', 'RunBalanceAuditCLI.gd').replace(/\\/g, '/');
        
        // Check if CLI script exists, otherwise use scene approach
        let scriptPath = cliScript;
        let useScene = false;
        
        if (!fs.existsSync(cliScript.replace(/res:\/\//, projectDir + '/').replace(/\//g, path.sep))) {
            // Fallback: Use scene approach
            scriptPath = 'res://scenes/RunBalanceAudit.tscn';
            useScene = true;
        }
        
        const cmd = useScene 
            ? `"${godotExe}" --path "${projectDir}" "${scriptPath}"`
            : `"${godotExe}" --path "${projectDir}" --script "${scriptPath}"`;
        
        console.log(`📋 Command: ${cmd.replace(/"/g, '')}\n`);
        console.log('⏳ Running audit (this may take 30-60 seconds)...\n');
        
        const args = useScene
            ? ['--path', projectDir, scriptPath]
            : ['--path', projectDir, '--script', scriptPath];
        
        const child = spawn(godotExe, args, {
            cwd: projectDir,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
            process.stdout.write(data);
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
            process.stderr.write(data);
        });
        
        child.on('close', (code) => {
            console.log(`\n\n📊 Godot process exited with code: ${code}`);
            
            // Wait a moment for file to be written
            setTimeout(async () => {
                try {
                    const reportPath = await waitForReport(5000, 500);
                    console.log(`\n✅ Report generated: ${reportPath}\n`);
                    resolve(true);
                } catch (e) {
                    // Try non-headless mode
                    console.log('\n⚠️  Headless mode may not have worked. Trying alternative approach...\n');
                    resolve(false);
                }
            }, 1000);
        });
        
        child.on('error', (err) => {
            console.error(`\n❌ Error running Godot: ${err.message}\n`);
            resolve(false);
        });
    });
}

/**
 * Try alternative: Run scene directly (may require Godot Editor to be open)
 */
function provideInstructions() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ALTERNATIVE: Manual Balance Audit Instructions');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('To run the balance audit manually:\n');
    console.log('  1. Open Godot Editor');
    console.log(`  2. Open project: ${GODOT_PROJECT_PATH}`);
    console.log(`  3. Open scene: ${RUN_AUDIT_SCENE}`);
    console.log('  4. Press F6 (Run Current Scene) or click Play button');
    console.log('  5. Wait for completion (scene will auto-quit)');
    console.log('  6. Report will be saved to: user://stats_audit_report.json\n');
    console.log('Then run: node scripts/analyze-balance-audit.js\n');
}

/**
 * Copy report from user:// location to .cursor/ for analysis script
 */
function copyReportIfNeeded() {
    // Check if report exists in user location but not in .cursor
    if (fs.existsSync(USER_REPORT_PATH) && !fs.existsSync(CURSOR_REPORT_PATH)) {
        console.log(`📋 Copying report from user:// to .cursor/...`);
        
        // Ensure .cursor directory exists
        const cursorDir = path.dirname(CURSOR_REPORT_PATH);
        if (!fs.existsSync(cursorDir)) {
            fs.mkdirSync(cursorDir, { recursive: true });
        }
        
        // Copy the report
        try {
            fs.copyFileSync(USER_REPORT_PATH, CURSOR_REPORT_PATH);
            console.log(`✅ Copied report to: ${CURSOR_REPORT_PATH}\n`);
        } catch (e) {
            console.error(`❌ Failed to copy report: ${e.message}\n`);
        }
    } else if (fs.existsSync(USER_REPORT_PATH)) {
        // Report exists in user location, use it for analysis
        console.log(`📋 Found report at: ${USER_REPORT_PATH}`);
        console.log(`   (Will use this for analysis)\n`);
        
        // Still copy to .cursor for consistency
        try {
            const cursorDir = path.dirname(CURSOR_REPORT_PATH);
            if (!fs.existsSync(cursorDir)) {
                fs.mkdirSync(cursorDir, { recursive: true });
            }
            fs.copyFileSync(USER_REPORT_PATH, CURSOR_REPORT_PATH);
        } catch (e) {
            // Ignore errors
        }
    }
}

/**
 * Run analysis on existing report
 */
async function runAnalysis() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ANALYZING BALANCE AUDIT REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // First, copy report if needed
    copyReportIfNeeded();
    
    // Check if report exists
    const reportExists = fs.existsSync(CURSOR_REPORT_PATH) || fs.existsSync(USER_REPORT_PATH);
    
    if (!reportExists) {
        console.error('❌ No audit report found. Please run the audit first.\n');
        provideInstructions();
        process.exit(1);
    }
    
    // Run the analysis script as a child process
    const analyzeScript = path.join(ROOT, 'scripts', 'analyze-balance-audit.js');
    
    if (!fs.existsSync(analyzeScript)) {
        console.error(`❌ Analysis script not found: ${analyzeScript}`);
        process.exit(1);
    }
    
    console.log('Running analysis...\n');
    
    try {
        // Spawn analysis script as child process
        execSync(`node "${analyzeScript}"`, {
            cwd: ROOT,
            stdio: 'inherit',
            encoding: 'utf8'
        });
        console.log('\n✅ Analysis complete!\n');
    } catch (e) {
        console.error(`❌ Error running analysis: ${e.message}`);
        process.exit(1);
    }
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Check if user just wants to analyze existing report
    if (args.includes('--analyze-only') || args.includes('-a')) {
        await runAnalysis();
        return;
    }
    
    // Try to run audit via command line
    const success = await runAuditCommandLine();
    
    if (!success) {
        // If command line didn't work, provide instructions
        provideInstructions();
        
        // Check if report already exists
        if (fs.existsSync(CURSOR_REPORT_PATH) || fs.existsSync(USER_REPORT_PATH)) {
            console.log('\n✅ Found existing report! Running analysis...\n');
            await runAnalysis();
        } else {
            console.log('\n💡 Tip: Once you run the audit manually, run this script again with --analyze-only to analyze the results.\n');
            console.log('   Or run: npm run balance-audit:analyze\n');
        }
        return;
    }
    
    // If audit ran successfully, wait for report and analyze
    console.log('\n⏳ Waiting for audit to complete...');
    
    try {
        const reportPath = await waitForReport(30000, 1000);
        console.log(`\n✅ Audit complete! Report: ${reportPath}\n`);
        
        // Copy to .cursor if needed
        copyReportIfNeeded();
        
        // Run analysis
        runAnalysis();
        
    } catch (e) {
        console.error(`\n❌ ${e.message}`);
        console.log('\nThe audit may still be running. Check Godot output or run manually.\n');
        provideInstructions();
        process.exit(1);
    }
}

// Run main function
main().catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});

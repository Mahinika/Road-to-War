#!/usr/bin/env node

/**
 * Simple utility to check game logs
 * Usage: node check-logs.js [lines]
 * Examples:
 *   node check-logs.js        # Show last 50 lines
 *   node check-logs.js 100    # Show last 100 lines
 *   node check-logs.js all    # Show all logs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Paths to check for logs
const logPaths = [
    join(process.cwd(), 'logs/game-output.log'),
    join(homedir(), 'AppData/Roaming/Godot/app_userdata/Road to war/cursor_logs.txt'),
    join(homedir(), 'AppData/Roaming/Godot/app_userdata/Road to war/logs/godot.log')
];

const linesToShow = process.argv[2] || 50;

function showLogs() {
    let logsFound = false;

    logPaths.forEach(logPath => {
        if (existsSync(logPath)) {
            logsFound = true;
            console.log(`--- Reading log file: ${logPath} ---`);
            try {
                const logContent = readFileSync(logPath, 'utf8');
                const lines = logContent.trim().split('\n').filter(line => line.trim());

                if (lines.length === 0) {
                    console.log('Log file is empty.');
                    return;
                }

                let linesToDisplay = lines;

                if (linesToShow !== 'all' && !isNaN(linesToShow)) {
                    const numLines = parseInt(linesToShow);
                    linesToDisplay = lines.slice(-numLines);
                    console.log(`Showing last ${numLines} lines of ${lines.length} total lines:\n`);
                } else {
                    console.log(`Showing all ${lines.length} lines:\n`);
                }

                linesToDisplay.forEach((line) => {
                    // Remove ANSI color codes for cleaner output
                    const cleanLine = line.replace(/\x1B\[[0-9;]*[mG]/g, '');
                    console.log(cleanLine);
                });
                console.log('\n');

            } catch (error) {
                console.error(`Error reading log file ${logPath}:`, error.message);
            }
        }
    });

    if (!logsFound) {
        console.log('No log files found. Expected paths:');
        logPaths.forEach(p => console.log(`  - ${p}`));
    }
}

showLogs();

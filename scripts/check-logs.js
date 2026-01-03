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

const logFilePath = join(process.cwd(), 'logs/game-output.log');
const linesToShow = process.argv[2] || 50;

function showLogs() {
    if (!existsSync(logFilePath)) {
        console.log('No logs/game-output.log file found. Run the game first to generate logs.');
        return;
    }

    try {
        const logContent = readFileSync(logFilePath, 'utf8');
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

        linesToDisplay.forEach((line, index) => {
            // Remove ANSI color codes for cleaner output
            const cleanLine = line.replace(/\x1B\[[0-9;]*[mG]/g, '');
            console.log(cleanLine);
        });

    } catch (error) {
        console.error('Error reading log file:', error.message);
    }
}

showLogs();

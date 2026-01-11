#!/usr/bin/env node
/**
 * Compare Balance Audits - Compare Before/After Balance Adjustments
 * 
 * Compares two balance audit reports to show improvements from balance adjustments.
 * 
 * Usage:
 *   node scripts/compare-balance-audits.js [before_report] [after_report]
 *   
 * If reports not specified, uses:
 *   - Before: .cursor/stats_audit_report.json (if exists)
 *   - After: user://stats_audit_report.json (most recent)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Default report paths
const BEFORE_REPORT = path.join(ROOT, '.cursor', 'stats_audit_report.json');
const USER_REPORT = path.join(
    process.env.APPDATA || process.env.HOME || process.env.USERPROFILE || '',
    'Godot', 'app_userdata', 'Road to war', 'stats_audit_report.json'
);

function loadReport(reportPath) {
    if (!fs.existsSync(reportPath)) {
        return null;
    }
    
    try {
        const content = fs.readFileSync(reportPath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        console.error(`❌ Failed to load report: ${reportPath}`);
        console.error(`   Error: ${e.message}`);
        return null;
    }
}

function getDPS(report, classId, specId, level = 80, mile = 0) {
    try {
        const classData = report.classes[classId];
        if (!classData) return null;

        const specData = classData.specs[specId];
        if (!specData) return null;

        const levelData = specData.levels?.[String(level)];
        if (!levelData) return null;

        const mileData = levelData.dps_by_mile?.[String(mile)];
        if (!mileData) return null;

        // Use ability DPS if available, otherwise fall back to auto-attack
        let dps = mileData.auto_attack?.dps || mileData.dps || 0;

        // For classes with key abilities, use the highest ability DPS
        if (mileData.abilities) {
            const abilityDPS = Object.values(mileData.abilities)
                .map(ability => ability.dps)
                .filter(d => d > 0);

            if (abilityDPS.length > 0) {
                // Use average of top abilities (weighted toward the highest)
                const sortedDPS = abilityDPS.sort((a, b) => b - a);
                dps = sortedDPS.slice(0, Math.min(2, sortedDPS.length))
                    .reduce((sum, d) => sum + d, 0) / Math.min(2, sortedDPS.length);
            }
        }

        return dps;
    } catch (e) {
        return null;
    }
}

function compareReports(beforeReport, afterReport) {
    if (!beforeReport || !afterReport) {
        console.error('❌ Cannot compare: One or both reports missing');
        return;
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('        BALANCE AUDIT COMPARISON');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Key classes to track (the ones we adjusted)
    const keyClasses = [
        { class: 'warrior', spec: 'arms', name: 'Warrior/Arms' },
        { class: 'paladin', spec: 'retribution', name: 'Paladin/Retribution' },
        { class: 'warrior', spec: 'fury', name: 'Warrior/Fury' },
        { class: 'warlock', spec: 'affliction', name: 'Warlock/Affliction' },
        { class: 'druid', spec: 'feral', name: 'Druid/Feral' },
        { class: 'paladin', spec: 'holy', name: 'Paladin/Holy (Healer)' },
    ];
    
    console.log('📊 Key Class Changes (Level 80, Mile 0):\n');
    
    const changes = [];
    
    for (const { class: classId, spec: specId, name } of keyClasses) {
        const beforeDPS = getDPS(beforeReport, classId, specId, 80, 0);
        const afterDPS = getDPS(afterReport, classId, specId, 80, 0);
        
        if (beforeDPS === null || afterDPS === null) {
            console.log(`   ${name.padEnd(30)} ❓ Missing data`);
            continue;
        }
        
        const change = afterDPS - beforeDPS;
        const changePercent = ((change / beforeDPS) * 100).toFixed(1);
        const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
        const color = change > 0 ? (specId === 'affliction' || specId === 'feral' ? '🟢' : '🔴') : 
                     change < 0 ? (specId === 'arms' || specId === 'retribution' || specId === 'fury' ? '🟢' : '🔴') : '⚪';
        
        changes.push({
            name,
            before: beforeDPS,
            after: afterDPS,
            change,
            changePercent,
            arrow,
            color,
            target: specId === 'holy' ? 'N/A (healer)' : specId === 'arms' ? '~400' : specId === 'retribution' ? '~400' : specId === 'fury' ? '~420' : specId === 'affliction' ? '~380' : '~380'
        });
    }
    
    // Sort by absolute change (biggest changes first)
    changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    
    for (const c of changes) {
        const status = c.target === 'N/A (healer)' ? ' (verify in party combat)' :
                      Math.abs(c.after - parseFloat(c.target.replace('~', ''))) < 50 ? ' ✅' : ' ⚠️';
        
        console.log(`   ${c.color} ${c.name.padEnd(30)} ${c.before.toFixed(1).padStart(7)} → ${c.after.toFixed(1).padStart(7)} ${c.arrow} ${c.changePercent.padStart(6)}% ${status}`);
        if (c.target !== 'N/A (healer)') {
            console.log(`      Target: ${c.target} DPS`);
        }
    }
    
    // Overall statistics
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📈 Overall Balance Statistics\n');
    
    // Count classes in target range (350-420 DPS)
    let beforeInRange = 0;
    let afterInRange = 0;
    let totalClasses = 0;
    
    for (const classId in afterReport.classes) {
        for (const specId in afterReport.classes[classId].specs) {
            const beforeDPS = getDPS(beforeReport, classId, specId, 80, 0);
            const afterDPS = getDPS(afterReport, classId, specId, 80, 0);
            
            if (beforeDPS !== null && afterDPS !== null) {
                totalClasses++;
                if (beforeDPS >= 350 && beforeDPS <= 420) beforeInRange++;
                if (afterDPS >= 350 && afterDPS <= 420) afterInRange++;
            }
        }
    }
    
    const beforePercent = ((beforeInRange / totalClasses) * 100).toFixed(1);
    const afterPercent = ((afterInRange / totalClasses) * 100).toFixed(1);
    
    console.log(`   Classes in target range (350-420 DPS):`);
    console.log(`   Before: ${beforeInRange}/${totalClasses} (${beforePercent}%)`);
    console.log(`   After:  ${afterInRange}/${totalClasses} (${afterPercent}%)`);
    
    if (afterInRange > beforeInRange) {
        console.log(`   🟢 Improvement: +${afterInRange - beforeInRange} classes (+${(afterPercent - beforePercent).toFixed(1)}%)`);
    } else if (afterInRange < beforeInRange) {
        console.log(`   🔴 Regression: ${afterInRange - beforeInRange} classes (${(afterPercent - beforePercent).toFixed(1)}%)`);
    } else {
        console.log(`   ⚪ No change in range count`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
}

async function main() {
    const args = process.argv.slice(2);
    
    let beforePath = BEFORE_REPORT;
    let afterPath = USER_REPORT;
    
    if (args.length >= 1) {
        beforePath = args[0];
    }
    if (args.length >= 2) {
        afterPath = args[1];
    }
    
    console.log('🔍 Loading reports...\n');
    console.log(`   Before: ${beforePath}`);
    console.log(`   After:  ${afterPath}\n`);
    
    const beforeReport = loadReport(beforePath);
    const afterReport = loadReport(afterPath);
    
    if (!beforeReport) {
        console.error(`❌ Before report not found: ${beforePath}`);
        console.log('\n💡 Run a balance audit first, or specify report paths:');
        console.log('   node scripts/compare-balance-audits.js <before> <after>\n');
        process.exit(1);
    }
    
    if (!afterReport) {
        console.error(`❌ After report not found: ${afterPath}`);
        console.log('\n💡 Run a fresh balance audit first:');
        console.log('   node scripts/run-balance-audit.js');
        console.log('   OR manually in Godot: RunBalanceAudit.tscn scene\n');
        process.exit(1);
    }
    
    // Show report timestamps
    const beforeTime = beforeReport.generated_at_ms ? new Date(beforeReport.generated_at_ms).toLocaleString() : 'Unknown';
    const afterTime = afterReport.generated_at_ms ? new Date(afterReport.generated_at_ms).toLocaleString() : 'Unknown';
    
    console.log(`   Before generated: ${beforeTime}`);
    console.log(`   After generated:  ${afterTime}\n`);
    
    compareReports(beforeReport, afterReport);
}

main().catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});

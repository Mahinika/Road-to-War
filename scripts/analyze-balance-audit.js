import fs from 'fs';
import path from 'path';

const reportPath = path.join(process.cwd(), '.cursor', 'stats_audit_report.json');

if (!fs.existsSync(reportPath)) {
    console.error('❌ Audit report not found at:', reportPath);
    console.log('\nTo generate a fresh audit:');
    console.log('  1. Open Godot');
    console.log('  2. Load project: road-to-war/project.godot');
    console.log('  3. Open scene: road-to-war/scenes/TestRunner.tscn');
    console.log('  4. Press F5 to run');
    process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('\n═══════════════════════════════════════════════════════════');
console.log('        ROAD OF WAR - BALANCE AUDIT ANALYSIS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`📊 Report Generated: ${new Date(report.generated_at_ms).toLocaleString()}\n`);
console.log(`⚠️  Anomalies Detected: ${report.anomalies.length}\n`);

// Analyze DPS at Level 80, Mile 0 (baseline)
console.log('═══════════════════════════════════════════════════════════');
console.log('📈 DPS ANALYSIS - Level 80, Mile 0 (Baseline Combat)');
console.log('═══════════════════════════════════════════════════════════\n');

const dpsData = [];
const targetDPS = 400; // Target DPS range
const tolerance = 50;

for (const [classId, classData] of Object.entries(report.classes)) {
    for (const [specId, specData] of Object.entries(classData.specs)) {
        const level80 = specData.levels?.['80'];
        if (level80 && level80.dps_by_mile?.['0']) {
            const dps = level80.dps_by_mile['0'].dps;
            const role = specData.role || 'dps';
            dpsData.push({
                class: classId,
                spec: specId,
                role,
                dps,
                attack: level80.final.attack,
                spellPower: level80.final.spellPower,
                critChance: level80.final.critChance,
                maxHealth: level80.final.maxHealth
            });
        }
    }
}

// Sort by DPS
dpsData.sort((a, b) => b.dps - a.dps);

// Group by role
const byRole = { dps: [], healer: [], tank: [] };
dpsData.forEach(data => {
    const role = data.role === 'healer' ? 'healer' : data.role === 'tank' ? 'tank' : 'dps';
    byRole[role].push(data);
});

// Print DPS rankings
console.log('🔴 OVERPERFORMING (>450 DPS):');
byRole.dps.filter(d => d.dps > 450).forEach(d => {
    console.log(`   ${d.class.padEnd(12)}/${d.spec.padEnd(15)}  ${d.dps.toFixed(1).padStart(7)} DPS`);
});
console.log('\n🟢 BALANCED (350-450 DPS):');
byRole.dps.filter(d => d.dps >= 350 && d.dps <= 450).forEach(d => {
    console.log(`   ${d.class.padEnd(12)}/${d.spec.padEnd(15)}  ${d.dps.toFixed(1).padStart(7)} DPS`);
});
console.log('\n🔵 UNDERPERFORMING (<350 DPS):');
byRole.dps.filter(d => d.dps < 350).forEach(d => {
    console.log(`   ${d.class.padEnd(12)}/${d.spec.padEnd(15)}  ${d.dps.toFixed(1).padStart(7)} DPS`);
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🛡️  TANKS & HEALERS');
console.log('═══════════════════════════════════════════════════════════\n');

if (byRole.tank.length > 0) {
    console.log('Tanks:');
    byRole.tank.forEach(d => {
        console.log(`   ${d.class.padEnd(12)}/${d.spec.padEnd(15)}  ${d.dps.toFixed(1).padStart(7)} DPS  HP: ${d.maxHealth}`);
    });
}

if (byRole.healer.length > 0) {
    console.log('\nHealers:');
    byRole.healer.forEach(d => {
        console.log(`   ${d.class.padEnd(12)}/${d.spec.padEnd(15)}  ${d.dps.toFixed(1).padStart(7)} DPS  SP: ${d.spellPower}`);
    });
}

// Scaling analysis
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 SCALING ANALYSIS (DPS Growth: Level 1 → 80, Mile 0)');
console.log('═══════════════════════════════════════════════════════════\n');

const scalingData = [];
for (const [classId, classData] of Object.entries(report.classes)) {
    for (const [specId, specData] of Object.entries(classData.specs)) {
        const l1 = specData.levels?.['1']?.dps_by_mile?.['0']?.dps;
        const l80 = specData.levels?.['80']?.dps_by_mile?.['0']?.dps;
        if (l1 && l80 && l1 > 0) {
            const multiplier = l80 / l1;
            scalingData.push({ class: classId, spec: specId, l1, l80, multiplier });
        }
    }
}

scalingData.sort((a, b) => b.multiplier - a.multiplier);
console.log('Top Scaling Classes:');
scalingData.slice(0, 5).forEach(d => {
    console.log(`   ${(d.class + '/' + d.spec).padEnd(30)}  ${d.l1.toFixed(1)} → ${d.l80.toFixed(1)}  (${d.multiplier.toFixed(1)}x)`);
});

// Anomalies summary
if (report.anomalies.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('⚠️  ANOMALIES');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total: ${report.anomalies.length} anomalies detected`);
    const doubleScaling = report.anomalies.filter(a => a.includes('DOUBLE SCALING')).length;
    console.log(`Double-scaling warnings: ${doubleScaling} (may be false positives)`);
}

// Save summary
const summary = {
    generated_at: new Date(report.generated_at_ms).toISOString(),
    total_anomalies: report.anomalies.length,
    dps_rankings: dpsData.map(d => ({
        class: d.class,
        spec: d.spec,
        role: d.role,
        dps: Math.round(d.dps * 10) / 10,
        status: d.dps > 450 ? 'overperforming' : d.dps < 350 ? 'underperforming' : 'balanced'
    })),
    scaling: scalingData.map(d => ({
        class: d.class,
        spec: d.spec,
        multiplier: Math.round(d.multiplier * 10) / 10
    }))
};

fs.writeFileSync(
    path.join(process.cwd(), '.cursor', 'balance_audit_summary.json'),
    JSON.stringify(summary, null, 2)
);

console.log('\n✅ Summary saved to: .cursor/balance_audit_summary.json\n');

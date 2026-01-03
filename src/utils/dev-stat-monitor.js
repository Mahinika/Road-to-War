/**
 * Development Stat Monitor - Real-time debugging panel for gameplay stats
 * Shows live hero stats, party state, combat info, and performance metrics
 * Toggle with F8 key during development
 */

import { Logger } from './logger.js';
import { createModernPanel, createModernText, UI_THEME } from './ui-system.js';
import { CombatSimulator } from './combat-simulator.js';

export class DevStatMonitor {
    constructor(scene) {
        this.scene = scene;
        this.panel = null;
        this.isVisible = false;
        this.updateInterval = null;
        this.displayMode = 'party'; // party, combat, performance, world, sim
        this.statTexts = new Map();
        this.simulator = new CombatSimulator(scene);
        this.lastSimResult = null;

        // Bind keyboard shortcut
        this.scene.input.keyboard.on('keydown-F8', () => {
            this.toggle();
        });

        Logger.info('DevStatMonitor', 'Initialized (F8 to toggle)');
    }

    /**
     * Toggle the stat monitor visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show the stat monitor
     */
    show() {
        if (this.isVisible) return;

        this.isVisible = true;
        this.createPanel();
        this.startUpdates();

        Logger.info('DevStatMonitor', 'Panel shown');
    }

    /**
     * Hide the stat monitor
     */
    hide() {
        if (!this.isVisible) return;

        this.isVisible = false;
        this.destroyPanel();
        this.stopUpdates();

        Logger.info('DevStatMonitor', 'Panel hidden');
    }

    /**
     * Create the monitor panel
     */
    createPanel() {
        const width = 400;
        const height = 600;
        const x = this.scene.scale.gameSize.width - width - 10;
        const y = 10;

        // Create panel background
        this.panel = createModernPanel(this.scene, x, y, width, height, 'Development Monitor');

        // Create mode selector buttons
        this.createModeButtons(x, y);

        // Create stat display area
        this.createStatDisplay(x + 10, y + 80, width - 20, height - 120);
    }

    /**
     * Create mode selection buttons
     */
    createModeButtons(x, y) {
        const buttonY = y + 40;
        const modes = [
            { key: 'party', label: 'Party', x: x + 15 },
            { key: 'combat', label: 'Combat', x: x + 80 },
            { key: 'performance', label: 'Perf', x: x + 145 },
            { key: 'world', label: 'World', x: x + 210 },
            { key: 'sim', label: 'Sim', x: x + 275 }
        ];

        this.modeButtons = [];

        for (const mode of modes) {
            const button = createModernPanel(this.scene, mode.x, buttonY, 60, 25);
            button.setInteractive();

            const text = createModernText(this.scene, mode.x + 30, buttonY + 12, mode.label, {
                fontSize: '12px',
                color: this.displayMode === mode.key ? UI_THEME.colors.gold : UI_THEME.colors.text
            });
            text.setOrigin(0.5, 0.5);

            button.on('pointerdown', () => {
                if (mode.key === 'sim' && this.displayMode === 'sim') {
                    this.runQuickSim();
                }
                this.setDisplayMode(mode.key);
                this.refreshDisplay();
            });

            this.modeButtons.push({ button, text, mode: mode.key });
        }
    }

    /**
     * Set the display mode
     */
    setDisplayMode(mode) {
        this.displayMode = mode;

        // Update button colors
        for (const { text, mode: buttonMode } of this.modeButtons) {
            text.setColor(buttonMode === mode ? UI_THEME.colors.gold : UI_THEME.colors.text);
        }
    }

    /**
     * Create stat display area
     */
    createStatDisplay(x, y, width, height) {
        this.statContainer = this.scene.add.container(x, y);

        // Create a scrollable text area background
        const bg = this.scene.add.rectangle(0, 0, width, height, UI_THEME.colors.panelBg, 0.9);
        bg.setStrokeStyle(2, UI_THEME.colors.border);
        bg.setOrigin(0, 0);
        this.statContainer.add(bg);

        // Create stat text objects
        this.createStatTexts(width, height);
    }

    /**
     * Create stat text objects
     */
    createStatTexts(width, height) {
        const lineHeight = 16;
        const maxLines = Math.floor((height - 20) / lineHeight);
        const startY = 15;

        for (let i = 0; i < maxLines; i++) {
            const text = createModernText(this.scene, 10, startY + (i * lineHeight), '', {
                fontSize: '11px',
                color: UI_THEME.colors.text,
                align: 'left'
            });
            text.setOrigin(0, 0);
            text.setWordWrapWidth(width - 20);

            this.statContainer.add(text);
            this.statTexts.set(i, text);
        }
    }

    /**
     * Start periodic updates
     */
    startUpdates() {
        this.updateInterval = setInterval(() => {
            this.refreshDisplay();
        }, 500); // Update 2x per second

        // Initial update
        this.refreshDisplay();
    }

    /**
     * Stop periodic updates
     */
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Refresh the display with current data
     */
    refreshDisplay() {
        if (!this.isVisible) return;

        const stats = this.getCurrentStats();
        this.updateStatTexts(stats);
    }

    /**
     * Run a quick combat simulation
     */
    async runQuickSim() {
        if (!this.scene.partyManager?.heroes) return;

        this.lastSimResult = "Running simulation...";
        this.refreshDisplay();

        const config = {
            iterations: 100,
            party: this.scene.partyManager.heroes.map(hero => ({
                id: hero.id,
                name: hero.name,
                role: hero.role || (hero.id === 'tank' ? 'tank' : hero.id === 'healer' ? 'healer' : 'dps'),
                classId: hero.classId,
                baseStats: hero.baseStats,
                equipmentStats: this.scene.equipmentManager?.getHeroEquipmentStats ? this.scene.equipmentManager.getHeroEquipmentStats(hero.id) : {},
                talentBonuses: this.scene.talentManager?.getHeroTalentBonuses ? this.scene.talentManager.getHeroTalentBonuses(hero.id) : {}
            })),
            enemies: [
                { id: 'test_boss', name: 'Sim Boss', level: 50, stats: { health: 10000, maxHealth: 10000, attack: 40, defense: 20 } }
            ],
            tactics: this.scene.combatTactics || 'balanced'
        };

        try {
            this.lastSimResult = await this.simulator.runSimulation(config);
            this.refreshDisplay();
        } catch (error) {
            this.lastSimResult = "Simulation failed: " + error.message;
            this.refreshDisplay();
        }
    }

    /**
     * Get simulation stats
     */
    getSimStats() {
        const stats = ['COMBAT SIMULATION'];
        
        if (!this.lastSimResult) {
            stats.push('Press SIM button again to start');
            stats.push('a 100-iteration battle vs Sim Boss.');
            return stats;
        }

        if (typeof this.lastSimResult === 'string') {
            stats.push(this.lastSimResult);
            return stats;
        }

        const r = this.lastSimResult;
        stats.push(`Win Rate: ${r.winRate.toFixed(1)}%`);
        stats.push(`Avg Rounds: ${r.avgRounds.toFixed(1)}`);
        stats.push(`Avg Duration: ${r.avgDuration.toFixed(1)}s`);
        stats.push(`Avg DPS: ${r.avgDPS.toFixed(1)}`);
        stats.push(`Avg HPS: ${r.avgHPS.toFixed(1)}`);
        stats.push(`Avg Survivors: ${r.avgSurvivors.toFixed(1)}`);
        stats.push(`Execution: ${r.executionTimeMs.toFixed(1)}ms`);
        
        stats.push('');
        stats.push('USE FOR BALANCING:');
        stats.push('Tweak items/talents and re-run');
        stats.push('to see impact on DPS/Survival.');

        return stats;
    }

    /**
     * Get current stats based on display mode
     */
    getCurrentStats() {
        switch (this.displayMode) {
            case 'party':
                return this.getPartyStats();
            case 'combat':
                return this.getCombatStats();
            case 'performance':
                return this.getPerformanceStats();
            case 'world':
                return this.getWorldStats();
            case 'sim':
                return this.getSimStats();
            default:
                return ['Unknown mode'];
        }
    }

    /**
     * Get party stats
     */
    getPartyStats() {
        const stats = ['PARTY STATS'];

        if (!this.scene.partyManager?.heroes) {
            stats.push('No party data');
            return stats;
        }

        for (let i = 0; i < this.scene.partyManager.heroes.length; i++) {
            const hero = this.scene.partyManager.heroes[i];
            if (!hero) continue;

            stats.push(`Hero ${i + 1}: ${hero.name || 'Unknown'}`);
            stats.push(`  Class: ${hero.classId || 'none'} (${hero.specId || 'none'})`);
            stats.push(`  Level: ${hero.level || 1} (${hero.experience || 0} XP)`);

            if (hero.currentStats) {
                const cs = hero.currentStats;
                stats.push(`  Health: ${Math.round(cs.health || 0)}/${Math.round(cs.maxHealth || 0)}`);
                stats.push(`  Mana: ${Math.round(cs.mana || 0)}/${Math.round(cs.maxMana || 0)}`);
                stats.push(`  Attack: ${Math.round(cs.attack || 0)}`);
                stats.push(`  Defense: ${Math.round(cs.defense || 0)}`);
            }

            if (hero.talents) {
                const talentCount = Object.values(hero.talents).reduce((sum, tree) =>
                    sum + Object.values(tree).reduce((treeSum, points) => treeSum + points, 0), 0);
                stats.push(`  Talents: ${talentCount} points allocated`);
            }

            stats.push(''); // Empty line between heroes
        }

        return stats;
    }

    /**
     * Get combat stats
     */
    getCombatStats() {
        const stats = ['COMBAT STATS'];

        if (!this.scene.combatManager) {
            stats.push('No combat manager');
            return stats;
        }

        const cm = this.scene.combatManager;
        stats.push(`Active: ${cm.combatActive ? 'YES' : 'NO'}`);
        stats.push(`Turn: ${cm.currentTurn || 'N/A'}`);
        stats.push(`Tactic: ${this.scene.combatTactics || 'balanced'}`);
        stats.push(`Threat Display: ${this.scene.showThreatDisplay ? 'ON' : 'OFF'}`);

        if (cm.enemies && cm.enemies.length > 0) {
            stats.push('');
            stats.push('ENEMIES:');
            for (const enemy of cm.enemies) {
                if (enemy && enemy.currentStats) {
                    const healthPercent = enemy.currentStats.maxHealth ?
                        Math.round((enemy.currentStats.health / enemy.currentStats.maxHealth) * 100) : 0;
                    stats.push(`  ${enemy.name || 'Enemy'}: ${healthPercent}% HP`);
                }
            }
        }

        if (cm.threatTable && cm.threatTable.size > 0) {
            stats.push('');
            stats.push('THREAT TABLE:');
            const sortedThreat = Array.from(cm.threatTable.entries())
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5); // Top 5

            for (const [heroId, threat] of sortedThreat) {
                const hero = this.scene.partyManager?.heroes?.find(h => h.id === heroId);
                stats.push(`  ${hero?.name || heroId}: ${Math.round(threat)}`);
            }
        }

        return stats;
    }

    /**
     * Get performance stats
     */
    getPerformanceStats() {
        const stats = ['PERFORMANCE STATS'];

        // FPS
        stats.push(`FPS: ${Math.round(this.scene.game.loop.actualFps)}`);

        // Memory (if available)
        if (performance.memory) {
            const mem = performance.memory;
            stats.push(`Memory: ${Math.round(mem.usedJSHeapSize / 1024 / 1024)}MB used`);
            stats.push(`  Total: ${Math.round(mem.totalJSHeapSize / 1024 / 1024)}MB`);
            stats.push(`  Limit: ${Math.round(mem.jsHeapSizeLimit / 1024 / 1024)}MB`);
        }

        // Scene objects
        const sceneObjects = this.scene.children.length;
        stats.push(`Scene Objects: ${sceneObjects}`);

        // Managers
        const managers = [
            'partyManager', 'worldManager', 'combatManager', 'equipmentManager',
            'talentManager', 'cameraManager', 'lootManager', 'shopManager'
        ];

        stats.push('');
        stats.push('MANAGER STATUS:');
        for (const managerName of managers) {
            const exists = this.scene[managerName] ? 'OK' : 'MISSING';
            stats.push(`  ${managerName}: ${exists}`);
        }

        // Cache sizes
        const jsonCache = this.scene.cache.json.entries.size;
        const textureCache = this.scene.textures.list.size;
        stats.push('');
        stats.push('CACHE SIZES:');
        stats.push(`  JSON: ${jsonCache} files`);
        stats.push(`  Textures: ${textureCache} textures`);

        return stats;
    }

    /**
     * Get world stats
     */
    getWorldStats() {
        const stats = ['WORLD STATS'];

        if (!this.scene.worldManager) {
            stats.push('No world manager');
            return stats;
        }

        const wm = this.scene.worldManager;
        stats.push(`Current Mile: ${wm.currentMile || 0}`);
        stats.push(`Max Mile Reached: ${wm.maxMileReached || 0}`);
        stats.push(`Current Segment: ${wm.currentSegment || 0}`);
        stats.push(`Scroll Speed: ${wm.scrollSpeed || 0}`);
        stats.push(`Combat Active: ${wm.combatActive ? 'YES' : 'NO'}`);

        // Party position
        if (this.scene.hero) {
            stats.push(`Party X: ${Math.round(this.scene.hero.x)}`);
            stats.push(`Party Y: ${Math.round(this.scene.hero.y)}`);
        }

        // Enemies
        if (wm.enemies) {
            stats.push(`Active Enemies: ${wm.enemies.length}`);
        }

        // Encounters
        if (wm.encounters) {
            stats.push(`Active Encounters: ${wm.encounters.length}`);
        }

        // Milestone rewards
        if (wm.milestoneRewardsClaimed) {
            stats.push(`Claimed Rewards: ${wm.milestoneRewardsClaimed.size}`);
        }

        return stats;
    }

    /**
     * Update stat text objects
     */
    updateStatTexts(stats) {
        // Clear all text first
        for (const text of this.statTexts.values()) {
            text.setText('');
        }

        // Set new text
        for (let i = 0; i < stats.length && i < this.statTexts.size; i++) {
            this.statTexts.get(i).setText(stats[i]);
        }
    }

    /**
     * Destroy the panel
     */
    destroyPanel() {
        if (this.panel) {
            this.panel.destroy();
            this.panel = null;
        }

        if (this.statContainer) {
            this.statContainer.destroy();
            this.statContainer = null;
        }

        if (this.modeButtons) {
            for (const { button, text } of this.modeButtons) {
                button.destroy();
                text.destroy();
            }
            this.modeButtons = null;
        }

        this.statTexts.clear();
    }

    /**
     * Get monitor status
     */
    getStatus() {
        return {
            visible: this.isVisible,
            mode: this.displayMode,
            updating: this.updateInterval !== null
        };
    }
}

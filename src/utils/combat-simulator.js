/**
 * Combat Simulator - Headless combat simulation for balancing
 * Allows running thousands of combat rounds to test DPS, TTK, and survival
 * Used by developers to verify balance changes without manual playtesting
 */

import { Logger } from './logger.js';
import { StatCalculator } from './stat-calculator.js';

export class CombatSimulator {
    constructor(scene) {
        this.scene = scene;
        this.statCalculator = new StatCalculator(scene);
        this.results = [];
    }

    /**
     * Run a simulation batch
     * @param {Object} config - Simulation configuration
     * @param {number} config.iterations - Number of iterations to run
     * @param {Array} config.party - Party members configuration
     * @param {Array} config.enemies - Enemy configurations
     * @param {Object} config.tactics - Combat tactics to use
     */
    async runSimulation(config) {
        const { iterations = 100, party, enemies, tactics = 'balanced' } = config;
        
        Logger.info('CombatSimulator', `Starting simulation: ${iterations} iterations`);
        this.results = [];

        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
            const iterationResult = this.simulateCombat(party, enemies, tactics);
            this.results.push(iterationResult);
        }

        const endTime = performance.now();
        const summary = this.generateSummary(startTime, endTime);
        
        Logger.info('CombatSimulator', 'Simulation complete', summary);
        return summary;
    }

    /**
     * Simulate a single combat encounter
     */
    simulateCombat(partyData, enemiesData, tactics) {
        // Initialize combatants
        const heroes = partyData.map(h => this.initializeHero(h));
        const enemies = enemiesData.map(e => this.initializeEnemy(e));
        
        let rounds = 0;
        let combatLog = [];
        let totalDamageDealt = 0;
        let totalDamageTaken = 0;
        let totalHealingDone = 0;
        const maxRounds = 1000; // Safety cap

        // Threat table
        const threatTable = new Map();
        heroes.forEach(h => threatTable.set(h.id, 0));

        while (this.isPartyAlive(heroes) && this.isEnemiesAlive(enemies) && rounds < maxRounds) {
            rounds++;
            
            // 1. Hero turn
            for (const hero of heroes) {
                if (hero.currentStats.health <= 0) continue;

                // Simple AI logic based on role
                const action = this.decideHeroAction(hero, heroes, enemies, tactics);
                const result = this.executeAction(hero, action, heroes, enemies, threatTable);
                
                totalDamageDealt += result.damage || 0;
                totalHealingDone += result.healing || 0;
            }

            // 2. Enemy turn
            for (const enemy of enemies) {
                if (enemy.currentStats.health <= 0) continue;

                // Target based on threat
                const target = this.selectEnemyTarget(enemy, heroes, threatTable);
                if (target) {
                    const result = this.executeEnemyAttack(enemy, target);
                    totalDamageTaken += result.damage || 0;
                }
            }

            // 3. Regeneration and cooldowns (simplified)
            this.processEndOfRound(heroes, enemies);
        }

        const partyWon = this.isEnemiesAlive(enemies) === false;
        const duration = rounds * 0.5; // Assume 0.5s per round for calculation

        return {
            partyWon,
            rounds,
            duration,
            totalDamageDealt,
            totalDamageTaken,
            totalHealingDone,
            dps: totalDamageDealt / duration,
            hps: totalHealingDone / duration,
            survivingHeroes: heroes.filter(h => h.currentStats.health > 0).length
        };
    }

    /**
     * Initialize a hero for simulation
     */
    initializeHero(heroData) {
        const baseStats = heroData.baseStats || { health: 100, maxHealth: 100, mana: 100, maxMana: 100, attack: 10, defense: 5 };
        const equipmentStats = heroData.equipmentStats || {};
        const talentBonuses = heroData.talentBonuses || {};
        
        const finalStats = this.statCalculator.calculateFinalStats(
            { baseStats },
            equipmentStats,
            talentBonuses
        );

        return {
            id: heroData.id,
            name: heroData.name,
            role: heroData.role || 'dps',
            classId: heroData.classId,
            currentStats: { ...finalStats, health: finalStats.maxHealth, mana: finalStats.maxMana },
            baseStats: { ...finalStats }
        };
    }

    /**
     * Initialize an enemy for simulation
     */
    initializeEnemy(enemyData) {
        return {
            id: enemyData.id,
            name: enemyData.name,
            level: enemyData.level || 1,
            currentStats: { ...enemyData.stats },
            baseStats: { ...enemyData.stats }
        };
    }

    /**
     * Simple Hero AI decision making
     */
    decideHeroAction(hero, heroes, enemies, tactics) {
        if (hero.role === 'healer') {
            const lowHealthHero = heroes.find(h => h.currentStats.health > 0 && (h.currentStats.health / h.currentStats.maxHealth) < 0.7);
            if (lowHealthHero) return { type: 'heal', target: lowHealthHero };
        }
        
        if (hero.role === 'tank' && tactics === 'defensive') {
            return { type: 'defend', target: enemies[0] };
        }

        return { type: 'attack', target: enemies.find(e => e.currentStats.health > 0) };
    }

    /**
     * Execute a hero action
     */
    executeAction(hero, action, heroes, enemies, threatTable) {
        if (!action.target) return {};

        if (action.type === 'attack') {
            const damage = Math.max(1, hero.currentStats.attack - (action.target.currentStats.defense || 0));
            action.target.currentStats.health -= damage;
            
            // Update threat
            const threatMultiplier = hero.role === 'tank' ? 2.0 : 1.0;
            const currentThreat = threatTable.get(hero.id) || 0;
            threatTable.set(hero.id, currentThreat + (damage * threatMultiplier));
            
            return { damage };
        }

        if (action.type === 'heal') {
            const healing = hero.currentStats.intellect ? hero.currentStats.intellect * 2 : 20;
            action.target.currentStats.health = Math.min(action.target.currentStats.maxHealth, action.target.currentStats.health + healing);
            
            // Healers generate threat for healing
            const currentThreat = threatTable.get(hero.id) || 0;
            threatTable.set(hero.id, currentThreat + (healing * 0.5));
            
            return { healing };
        }

        return {};
    }

    /**
     * Select target for enemy based on threat
     */
    selectEnemyTarget(enemy, heroes, threatTable) {
        const aliveHeroes = heroes.filter(h => h.currentStats.health > 0);
        if (aliveHeroes.length === 0) return null;

        // Find hero with highest threat
        let topHero = aliveHeroes[0];
        let maxThreat = -1;

        for (const hero of aliveHeroes) {
            const threat = threatTable.get(hero.id) || 0;
            if (threat > maxThreat) {
                maxThreat = threat;
                topHero = hero;
            }
        }

        return topHero;
    }

    /**
     * Execute enemy attack
     */
    executeEnemyAttack(enemy, target) {
        const damage = Math.max(1, (enemy.currentStats.attack || 10) - (target.currentStats.defense || 0));
        target.currentStats.health -= damage;
        return { damage };
    }

    /**
     * Process end of round logic
     */
    processEndOfRound(heroes, enemies) {
        // Simple mana regeneration
        heroes.forEach(h => {
            if (h.currentStats.health > 0 && h.currentStats.maxMana) {
                h.currentStats.mana = Math.min(h.currentStats.maxMana, h.currentStats.mana + 5);
            }
        });
    }

    isPartyAlive(heroes) {
        return heroes.some(h => h.currentStats.health > 0);
    }

    isEnemiesAlive(enemies) {
        return enemies.some(e => e.currentStats.health > 0);
    }

    /**
     * Generate summary from simulation results
     */
    generateSummary(startTime, endTime) {
        const iterations = this.results.length;
        const wins = this.results.filter(r => r.partyWon).length;
        
        const avg = (key) => this.results.reduce((sum, r) => sum + r[key], 0) / iterations;

        return {
            iterations,
            winRate: (wins / iterations) * 100,
            avgRounds: avg('rounds'),
            avgDuration: avg('duration'),
            avgDPS: avg('dps'),
            avgHPS: avg('hps'),
            avgSurvivors: avg('survivingHeroes'),
            executionTimeMs: endTime - startTime
        };
    }
}

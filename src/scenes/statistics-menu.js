import Phaser from 'phaser';

/**
 * Statistics Menu Scene - Displays comprehensive player statistics
 */
export class StatisticsMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StatisticsMenuScene' });
    }

    create() {
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;
        
        // Ensure camera matches viewport
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.centerOn(width / 2, height / 2);

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        const title = this.add.text(width / 2, height / 10, 'STATISTICS', {
            font: 'bold 36px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        title.setOrigin(0.5, 0.5);

        // Get statistics from registry or create default
        const statistics = this.registry.get('statistics') || this.getDefaultStatistics();

        // Create statistics sections
        const startY = height / 6;
        const sectionSpacing = height / 4.5;
        
        this.createCombatSection(width, startY, statistics.combat);
        this.createProgressionSection(width, startY + sectionSpacing, statistics.progression);
        this.createCollectionSection(width, startY + sectionSpacing * 2, statistics.collection);
        this.createTimeSection(width, startY + sectionSpacing * 3, statistics.time);
        this.createWorldSection(width, startY + sectionSpacing * 4, statistics.world);

        // Back button
        const backButton = this.createButton(width / 2, height - 50, 'Back', () => {
            this.scene.start('MainScene');
        });
    }

    /**
     * Get default statistics structure
     */
    getDefaultStatistics() {
        return {
            combat: {},
            progression: {},
            collection: {},
            time: {},
            world: {}
        };
    }

    /**
     * Create combat statistics section
     */
    createCombatSection(x, y, stats) {
        const sectionTitle = this.add.text(x / 4, y, 'Combat', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        const statsList = [
            { label: 'Enemies Defeated:', value: stats.enemiesDefeated || 0 },
            { label: 'Combats Won:', value: stats.combatsWon || 0 },
            { label: 'Combats Lost:', value: stats.combatsLost || 0 },
            { label: 'Total Damage Dealt:', value: this.formatNumber(stats.totalDamageDealt || 0) },
            { label: 'Critical Hits:', value: stats.criticalHits || 0 },
            { label: 'Hit Accuracy:', value: this.calculateAccuracy(stats) }
        ];

        this.createStatList(x / 4, y + 30, statsList);
    }

    /**
     * Create progression statistics section
     */
    createProgressionSection(x, y, stats) {
        const sectionTitle = this.add.text(x / 4, y, 'Progression', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        const statsList = [
            { label: 'Current Level:', value: stats.currentLevel || 1 },
            { label: 'Max Level Reached:', value: stats.maxLevelReached || 1 },
            { label: 'Total Experience:', value: this.formatNumber(stats.totalExperience || 0) },
            { label: 'Segments Visited:', value: stats.segmentsVisited || 0 },
            { label: 'Distance Traveled:', value: this.formatDistance(stats.distanceTraveled || 0) }
        ];

        this.createStatList(x / 4, y + 30, statsList);
    }

    /**
     * Create collection statistics section
     */
    createCollectionSection(x, y, stats) {
        const sectionTitle = this.add.text(x / 4, y, 'Collection', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        const uniqueCount = Array.isArray(stats.uniqueItemsFound) 
            ? stats.uniqueItemsFound.length 
            : (stats.uniqueItemsFound?.size || 0);

        const statsList = [
            { label: 'Items Found:', value: stats.itemsFound || 0 },
            { label: 'Unique Items:', value: uniqueCount },
            { label: 'Legendary Items:', value: stats.legendaryItemsFound || 0 },
            { label: 'Gold Earned:', value: this.formatNumber(stats.goldEarned || 0) },
            { label: 'Gold Spent:', value: this.formatNumber(stats.goldSpent || 0) }
        ];

        this.createStatList(x / 4, y + 30, statsList);
    }

    /**
     * Create time statistics section
     */
    createTimeSection(x, y, stats) {
        const sectionTitle = this.add.text(x / 4, y, 'Time', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        const statsList = [
            { label: 'Total Play Time:', value: this.formatTime(stats.totalPlayTime || 0) },
            { label: 'Longest Session:', value: this.formatTime(stats.longestSession || 0) },
            { label: 'Sessions:', value: stats.sessionsCount || 0 }
        ];

        this.createStatList(x / 4, y + 30, statsList);
    }

    /**
     * Create world statistics section
     */
    createWorldSection(x, y, stats) {
        const sectionTitle = this.add.text(x / 4, y, 'World', {
            font: 'bold 20px Arial',
            fill: '#ffff00'
        });

        const statsList = [
            { label: 'Encounters:', value: stats.encountersTriggered || 0 },
            { label: 'Shops Visited:', value: stats.shopsVisited || 0 },
            { label: 'Treasures Found:', value: stats.treasuresFound || 0 },
            { label: 'Quests Completed:', value: stats.questsCompleted || 0 }
        ];

        this.createStatList(x / 4, y + 30, statsList);
    }

    /**
     * Create a list of statistics
     */
    createStatList(x, y, statsList) {
        statsList.forEach((stat, index) => {
            const label = this.add.text(x, y + index * 20, stat.label, {
                font: '14px Arial',
                fill: '#aaaaaa'
            });

            const value = this.add.text(x + 200, y + index * 20, stat.value.toString(), {
                font: '14px Arial',
                fill: '#ffffff'
            });
        });
    }

    /**
     * Format large numbers
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        return num.toString();
    }

    /**
     * Format distance
     */
    formatDistance(distance) {
        return this.formatNumber(distance) + ' units';
    }

    /**
     * Format time duration
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Calculate hit accuracy
     */
    calculateAccuracy(stats) {
        const total = (stats.totalHits || 0) + (stats.misses || 0);
        if (total === 0) return '0%';
        const accuracy = ((stats.totalHits || 0) / total) * 100;
        return accuracy.toFixed(1) + '%';
    }

    /**
     * Create button
     */
    createButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, {
            font: '20px Arial',
            fill: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        });
        
        button.setOrigin(0.5, 0.5);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            button.setStyle({ fill: '#ffff00' });
        });

        button.on('pointerout', () => {
            button.setStyle({ fill: '#ffffff' });
        });

        button.on('pointerdown', callback);

        return button;
    }
}


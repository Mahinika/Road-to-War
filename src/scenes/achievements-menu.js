import Phaser from 'phaser';

/**
 * Achievements Menu Scene - Displays player achievements
 */
export class AchievementsMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AchievementsMenuScene' });
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
        const title = this.add.text(width / 2, height / 10, 'ACHIEVEMENTS', {
            font: 'bold 36px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        title.setOrigin(0.5, 0.5);

        // Get achievements from registry
        const achievementsData = this.registry.get('achievements') || { achievements: [] };
        const achievementsState = this.registry.get('achievementsState') || {};

        // Progress text
        const unlockedCount = Object.values(achievementsState).filter(a => a?.unlocked).length;
        const totalCount = achievementsData.achievements?.length || 0;
        const progressText = this.add.text(width / 2, height / 6, `${unlockedCount} / ${totalCount} Unlocked`, {
            font: '20px Arial',
            fill: '#ffff00'
        });
        progressText.setOrigin(0.5, 0.5);

        // Create scrollable achievement list
        this.createAchievementList(width, height / 4, achievementsData, achievementsState);

        // Back button
        const backButton = this.createButton(width / 2, height - 50, 'Back', () => {
            this.scene.start('MainScene');
        });
    }

    /**
     * Create scrollable achievement list
     */
    createAchievementList(x, y, achievementsData, achievementsState) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const listHeight = height - y - 150;
        
        if (!achievementsData.achievements || achievementsData.achievements.length === 0) {
            const noAchievements = this.add.text(width / 2, height / 2, 'No achievements available', {
                font: '18px Arial',
                fill: '#aaaaaa'
            });
            noAchievements.setOrigin(0.5, 0.5);
            return;
        }

        // Group achievements by category
        const categories = {
            combat: [],
            progression: [],
            collection: [],
            world: []
        };

        achievementsData.achievements.forEach(achievement => {
            const category = achievement.category || 'other';
            if (categories[category]) {
                categories[category].push(achievement);
            }
        });

        let currentY = y;
        const spacing = 80;

        // Display achievements by category
        Object.keys(categories).forEach(category => {
            if (categories[category].length === 0) return;

            // Category header
            const categoryTitle = this.add.text(x / 4, currentY, category.toUpperCase(), {
                font: 'bold 18px Arial',
                fill: '#ffff00'
            });
            currentY += 30;

            // Category achievements
            categories[category].forEach(achievement => {
                const state = achievementsState[achievement.id] || { unlocked: false, progress: 0 };
                this.createAchievementEntry(x / 4, currentY, achievement, state);
                currentY += spacing;
            });

            currentY += 20; // Extra spacing between categories
        });
    }

    /**
     * Create individual achievement entry
     */
    createAchievementEntry(x, y, achievement, state) {
        const width = this.cameras.main.width;
        const entryWidth = width / 2;
        
        // Background
        const bgColor = state.unlocked ? 0x00ff00 : 0x333333;
        const bg = this.add.rectangle(x + entryWidth / 2, y, entryWidth, 70, bgColor, 0.3);
        bg.setStrokeStyle(2, state.unlocked ? 0x00ff00 : 0x666666);

        // Achievement icon (placeholder)
        const icon = this.add.circle(x + 30, y, 20, state.unlocked ? 0xffff00 : 0x666666);
        if (state.unlocked) {
            const checkmark = this.add.text(x + 30, y, '✓', {
                font: 'bold 20px Arial',
                fill: '#000000'
            });
            checkmark.setOrigin(0.5, 0.5);
        }

        // Achievement name
        const nameColor = state.unlocked ? '#ffffff' : '#aaaaaa';
        const name = this.add.text(x + 60, y - 15, achievement.name || achievement.id, {
            font: 'bold 16px Arial',
            fill: nameColor
        });

        // Achievement description
        const desc = this.add.text(x + 60, y + 5, achievement.description || '', {
            font: '12px Arial',
            fill: '#cccccc',
            wordWrap: { width: entryWidth - 100 }
        });

        // Progress bar
        const requirement = achievement.requirement || 1;
        const progress = Math.min(state.progress || 0, requirement);
        const progressPercent = requirement > 0 ? (progress / requirement) : 0;

        const progressBg = this.add.rectangle(x + 60, y + 25, entryWidth - 120, 8, 0x000000, 0.5);
        const progressBar = this.add.rectangle(
            x + 60 + (entryWidth - 120) * progressPercent / 2,
            y + 25,
            (entryWidth - 120) * progressPercent,
            8,
            state.unlocked ? 0x00ff00 : 0xffff00
        );

        // Progress text
        const progressText = this.add.text(x + entryWidth - 60, y + 25, `${progress} / ${requirement}`, {
            font: '10px Arial',
            fill: '#ffffff'
        });
        progressText.setOrigin(1, 0.5);

        // Reward info
        if (achievement.reward) {
            const rewardText = [];
            if (achievement.reward.gold) {
                rewardText.push(`${achievement.reward.gold} gold`);
            }
            if (achievement.reward.experience) {
                rewardText.push(`${achievement.reward.experience} XP`);
            }
            if (rewardText.length > 0) {
                const reward = this.add.text(x + 60, y + 35, `Reward: ${rewardText.join(', ')}`, {
                    font: '10px Arial',
                    fill: '#ffff00'
                });
            }
        }
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


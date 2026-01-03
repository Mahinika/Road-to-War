import Phaser from 'phaser';

export class CreditsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CreditsScene' });
    }

    create() {
        const width = this.scale.gameSize.width;
        const height = this.scale.gameSize.height;
        
        // Ensure camera matches viewport
        this.cameras.main.setViewport(0, 0, width, height);
        this.cameras.main.centerOn(width / 2, height / 2);

        // Initialize menu elements array first
        this.menuElements = [];

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x0f0f0f);

        // Title
        const title = this.add.text(width / 2, height / 8, 'ROAD OF WAR', {
            font: 'bold 42px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        title.setOrigin(0.5, 0.5);

        // Subtitle
        const subtitle = this.add.text(width / 2, height / 8 + 60, 'Incremental Prestige RPG', {
            font: '20px Arial',
            fill: '#cccccc'
        });
        subtitle.setOrigin(0.5, 0.5);

        // Credits sections
        this.createDevelopmentCredits(width, height);
        this.createSpecialThanks(width, height);
        this.createTechnologies(width, height);

        // Back button
        const backButton = this.createButton(width / 2, height - 60, 'Back to Menu', () => {
            this.scene.start('MainScene');
        });

        // Add subtle animation
        this.addAnimations(title, subtitle);

        // Store references for cleanup
        this.menuElements.push(title, subtitle, backButton);
    }

    createDevelopmentCredits(width, height) {
        const startY = height / 3;
        
        // Development team
        const devTitle = this.add.text(width / 2, startY, 'DEVELOPMENT', {
            font: 'bold 24px Arial',
            fill: '#ffff00'
        });
        devTitle.setOrigin(0.5, 0.5);

        const devTeam = this.add.text(width / 2, startY + 40, 
            'Lead Developer: Road of War Team\n' +
            'Game Design: Community Inspired\n' +
            'Architecture: Mentorship Driven', {
            font: '18px Arial',
            fill: '#ffffff',
            align: 'center'
        });
        devTeam.setOrigin(0.5, 0.5);

        this.menuElements.push(devTitle, devTeam);
    }

    createSpecialThanks(width, height) {
        const startY = height / 2;
        
        // Special thanks
        const thanksTitle = this.add.text(width / 2, startY, 'SPECIAL THANKS', {
            font: 'bold 24px Arial',
            fill: '#ffff00'
        });
        thanksTitle.setOrigin(0.5, 0.5);

        const thanksList = this.add.text(width / 2, startY + 40,
            'The Incremental Gaming Community\n' +
            'Open Source Contributors\n' +
            'Game Development Mentors\n' +
            'Alpha Testers Everywhere', {
            font: '18px Arial',
            fill: '#ffffff',
            align: 'center'
        });
        thanksList.setOrigin(0.5, 0.5);

        this.menuElements.push(thanksTitle, thanksList);
    }

    createTechnologies(width, height) {
        const startY = height / 1.5;
        
        // Technologies used
        const techTitle = this.add.text(width / 2, startY, 'TECHNOLOGIES', {
            font: 'bold 24px Arial',
            fill: '#ffff00'
        });
        techTitle.setOrigin(0.5, 0.5);

        const techList = this.add.text(width / 2, startY + 40,
            'Phaser 3 - Game Engine\n' +
            'JavaScript - Programming Language\n' +
            'Vite - Build Tool\n' +
            'ES Modules - Code Organization', {
            font: '18px Arial',
            fill: '#ffffff',
            align: 'center'
        });
        techList.setOrigin(0.5, 0.5);

        this.menuElements.push(techTitle, techList);
    }

    createButton(x, y, text, callback) {
        const button = this.add.text(x, y, text, {
            font: '20px Arial',
            fill: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 20, y: 10 }
        });
        
        button.setOrigin(0.5, 0.5);
        button.setInteractive({ useHandCursor: true });

        // Button hover effects
        button.on('pointerover', () => {
            button.setStyle({ fill: '#ffff00' });
        });

        button.on('pointerout', () => {
            button.setStyle({ fill: '#ffffff' });
        });

        button.on('pointerdown', callback);

        return button;
    }

    addAnimations(title, subtitle) {
        // Title glow effect
        this.tweens.add({
            targets: title,
            alpha: { from: 0.8, to: 1 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Subtitle fade in
        this.tweens.add({
            targets: subtitle,
            alpha: { from: 0, to: 1 },
            duration: 1500,
            ease: 'Linear'
        });

        // Create floating particles for visual interest
        this.createParticles();
    }

    createParticles() {
        // Create a simple particle texture if it doesn't exist
        if (!this.textures.exists('particle')) {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(0, 0, 2);
            graphics.generateTexture('particle', 4, 4);
            graphics.destroy();
        }
        
        // Create particle emitter using Phaser 3.90 API
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        
        // Create emit zone for random x positions across bottom of screen
        const emitZone = {
            source: new Phaser.Geom.Rectangle(100, height + 50, width - 200, 0),
            type: 'edge',
            quantity: 1
        };
        
        // Create particles manager with emitter config
        const particles = this.add.particles(0, 0, 'particle', {
            emitZone: emitZone,
            scale: { start: 0.1, end: 0.3 },
            speedY: { min: -100, max: -50 },
            speedX: { min: -20, max: 20 },
            lifespan: 4000,
            frequency: 500,
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            tint: colors
        });
    }
}

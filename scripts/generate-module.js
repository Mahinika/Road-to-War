/**
 * Module Generator - Scaffold new managers, scenes, or utilities
 * Usage: node scripts/generate-module.js <type> <name>
 * Types: manager, scene, utility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const type = process.argv[2];
const name = process.argv[3];

if (!type || !name) {
    console.log('Usage: node scripts/generate-module.js <type> <name>');
    console.log('Types: manager, scene, utility');
    process.exit(1);
}

const templates = {
    manager: {
        dir: 'src/managers',
        suffix: '-manager.js',
        content: (className, fileName) => `import { Logger } from '../utils/logger.js';
import { GameEvents } from '../utils/event-constants.js';

/**
 * ${className} Manager
 * Responsible for ...
 */
export class ${className}Manager {
    constructor(scene) {
        this.scene = scene;
        Logger.info('${className}Manager', 'Initialized');
    }

    /**
     * Initialize the manager
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // this.scene.events.on(GameEvents.COMBAT.START, this.handleCombatStart, this);
    }

    /**
     * Clean up resources
     */
    destroy() {
        // this.scene.events.off(GameEvents.COMBAT.START, this.handleCombatStart, this);
    }
}
`
    },
    scene: {
        dir: 'src/scenes',
        suffix: '-scene.js',
        content: (className, fileName) => `import Phaser from 'phaser';
import { Logger } from '../utils/logger.js';

/**
 * ${className} Scene
 */
export class ${className}Scene extends Phaser.Scene {
    constructor() {
        super({ key: '${className}Scene' });
    }

    init(data) {
        Logger.info('${className}Scene', 'Init', data);
    }

    preload() {
        // Load assets specific to this scene
    }

    create() {
        Logger.info('${className}Scene', 'Create');
        
        // Add UI elements
        this.add.text(400, 300, '${className} Scene', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        // Add back button
        const backButton = this.add.text(50, 50, 'Back', { fontSize: '20px', fill: '#fff' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('MainScene'));
    }

    update(time, delta) {
        // Scene update loop
    }
}
`
    },
    utility: {
        dir: 'src/utils',
        suffix: '-helper.js',
        content: (className, fileName) => `/**
 * ${className} Utility
 * Collection of helper functions for ...
 */

export const ${className}Helper = {
    /**
     * Helper function example
     */
    doSomething: (param) => {
        return param;
    }
};
`
    }
};

const template = templates[type];
if (!template) {
    console.log(`Unknown type: ${type}. Available types: ${Object.keys(templates).join(', ')}`);
    process.exit(1);
}

// Format name: kebab-case for filename, PascalCase for class
const kebabName = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const pascalName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());

const fileName = `${kebabName}${template.suffix}`;
const filePath = path.join(__dirname, '..', template.dir, fileName);

if (fs.existsSync(filePath)) {
    console.log(`Error: File already exists at ${filePath}`);
    process.exit(1);
}

const content = template.content(pascalName, fileName);

try {
    fs.writeFileSync(filePath, content);
    console.log(`Successfully created ${type} at ${filePath}`);
    
    // Suggest next steps
    if (type === 'manager') {
        console.log(`Next step: Register your manager in src/scenes/core/game-scene-core.js`);
    } else if (type === 'scene') {
        console.log(`Next step: Register your scene in src/main.js`);
    }
} catch (error) {
    console.error(`Failed to write file: ${error.message}`);
}


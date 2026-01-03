/**
 * UI Generator - Generates decorative UI elements
 * Creates button styles, panel backgrounds, and icon sets
 */

import { ColorUtils } from './utils/color-utils.js';

export class UIGenerator {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Generate UI elements
     */
    generateUIElements() {
        // Generate button backgrounds
        this.generateButtonStyles();
        
        // Generate panel backgrounds
        this.generatePanelBackgrounds();
        
        // Generate progress bar styles
        this.generateProgressBarStyles();
    }

    /**
     * Generate button style textures
     */
    generateButtonStyles() {
        const buttonStyles = [
            { key: 'button-normal', color: 0x333333, hoverColor: 0x444444 },
            { key: 'button-primary', color: 0x4444ff, hoverColor: 0x5555ff },
            { key: 'button-success', color: 0x44ff44, hoverColor: 0x55ff55 },
            { key: 'button-danger', color: 0xff4444, hoverColor: 0xff5555 }
        ];

        buttonStyles.forEach(style => {
            if (this.scene.textures.exists(style.key)) {
                return;
            }

            const graphics = this.scene.add.graphics();
            const width = 200;
            const height = 50;

            // Base button
            graphics.fillStyle(style.color);
            graphics.fillRoundedRect(0, 0, width, height, 5);
            
            // Border
            graphics.lineStyle(2, ColorUtils.lighten(style.color, 0.2));
            graphics.strokeRoundedRect(0, 0, width, height, 5);
            
            // Highlight (top edge)
            graphics.lineStyle(1, ColorUtils.lighten(style.color, 0.3));
            graphics.beginPath();
            graphics.moveTo(5, 5);
            graphics.lineTo(width - 5, 5);
            graphics.strokePath();

            graphics.generateTexture(style.key, width, height);
            graphics.destroy();
        });
    }

    /**
     * Generate panel background textures
     */
    generatePanelBackgrounds() {
        const panelStyles = [
            { key: 'panel-default', color: 0x1a1a2e, alpha: 0.9 },
            { key: 'panel-dark', color: 0x000000, alpha: 0.95 },
            { key: 'panel-light', color: 0x2a2a3e, alpha: 0.8 }
        ];

        panelStyles.forEach(style => {
            if (this.scene.textures.exists(style.key)) {
                return;
            }

            const graphics = this.scene.add.graphics();
            const width = 400;
            const height = 300;

            // Base panel
            graphics.fillStyle(style.color, style.alpha);
            graphics.fillRoundedRect(0, 0, width, height, 10);
            
            // Border
            graphics.lineStyle(2, ColorUtils.lighten(style.color, 0.1));
            graphics.strokeRoundedRect(0, 0, width, height, 10);
            
            // Inner shadow effect
            graphics.lineStyle(1, ColorUtils.darken(style.color, 0.2));
            graphics.strokeRoundedRect(2, 2, width - 4, height - 4, 8);

            graphics.generateTexture(style.key, width, height);
            graphics.destroy();
        });
    }

    /**
     * Generate progress bar style textures
     */
    generateProgressBarStyles() {
        const progressStyles = [
            { key: 'progress-bar-bg', color: 0x222222 },
            { key: 'progress-bar-fill', color: 0x00ff00 }
        ];

        progressStyles.forEach(style => {
            if (this.scene.textures.exists(style.key)) {
                return;
            }

            const graphics = this.scene.add.graphics();
            const width = style.key.includes('bg') ? 300 : 300;
            const height = 20;

            // Base
            graphics.fillStyle(style.color);
            graphics.fillRoundedRect(0, 0, width, height, 5);
            
            if (style.key.includes('fill')) {
                // Add gradient effect (simulated with lines)
                graphics.lineStyle(2, ColorUtils.lighten(style.color, 0.3));
                graphics.beginPath();
                graphics.moveTo(5, 5);
                graphics.lineTo(width - 5, 5);
                graphics.strokePath();
            } else {
                // Border for background
                graphics.lineStyle(1, ColorUtils.darken(style.color, 0.2));
                graphics.strokeRoundedRect(0, 0, width, height, 5);
            }

            graphics.generateTexture(style.key, width, height);
            graphics.destroy();
        });
    }

    /**
     * Get texture key for a button style
     * @param {string} style - Button style name
     * @returns {string} Texture key
     */
    getButtonKey(style = 'normal') {
        return `button-${style}`;
    }

    /**
     * Get texture key for a panel style
     * @param {string} style - Panel style name
     * @returns {string} Texture key
     */
    getPanelKey(style = 'default') {
        return `panel-${style}`;
    }
}


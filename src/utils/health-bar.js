import { Logger } from './logger.js';

/**
 * Health Bar Utility
 * Creates and manages health bars for game entities
 */

export class HealthBar {
    constructor(scene, entity, options = {}) {
        this.scene = scene;
        this.entity = entity;
        this.options = {
            width: options.width || 60,
            height: options.height || 10,
            offsetY: options.offsetY || -50,
            showText: options.showText !== false,
            backgroundColor: options.backgroundColor || 0x000000,
            borderColor: options.borderColor || 0xffffff,
            healthColor: options.healthColor || 0x00ff00,
            lowHealthColor: options.lowHealthColor || 0xff0000,
            lowHealthThreshold: options.lowHealthThreshold || 0.3,
            ...options
        };

        this.backgroundBar = null;
        this.healthBar = null;
        this.borderBar = null;
        this.textLabel = null;
        this.container = null;

        this.create();
    }

    create() {
        const width = this.options.width;
        const height = this.options.height;
        const offsetY = this.options.offsetY;

        // Create container to group health bar elements
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(20); // Above enemies and hero

        // Background (black) - only show if health bar will be visible
        this.backgroundBar = this.scene.add.rectangle(0, offsetY, width, height, this.options.backgroundColor);
        this.backgroundBar.setOrigin(0.5, 0.5);
        this.container.add(this.backgroundBar);
        // Initially hide until we confirm stats exist
        this.backgroundBar.setVisible(false);

        // Health fill (green/red)
        this.healthBar = this.scene.add.rectangle(0, offsetY, width, height, this.options.healthColor);
        this.healthBar.setOrigin(0.5, 0.5);
        this.container.add(this.healthBar);

        // Border (white outline)
        this.borderBar = this.scene.add.graphics();
        this.borderBar.lineStyle(1, this.options.borderColor);
        this.borderBar.strokeRect(-width / 2, offsetY - height / 2, width, height);
        this.container.add(this.borderBar);

        // Health text (optional)
        if (this.options.showText) {
            this.textLabel = this.scene.add.text(0, offsetY, '', {
                font: '12px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            });
            this.textLabel.setOrigin(0.5, 0.5);
            this.container.add(this.textLabel);
        }

        // Initial update
        this.update();
    }

    update() {
        if (!this.entity || !this.container) {
            return;
        }

        // Get health values
        let currentHealth = 0;
        let maxHealth = 1;

        try {
            if (this.entity.data && this.entity.data.stats) {
                currentHealth = this.entity.data.stats.health || 0;
                maxHealth = this.entity.data.stats.maxHealth || 1;
            } else if (this.entity.stats) {
                currentHealth = this.entity.stats.health || 0;
                maxHealth = this.entity.stats.maxHealth || 1;
            }
            
            // If no stats found, hide the health bar
            if (maxHealth <= 0) {
                if (this.backgroundBar) this.backgroundBar.setVisible(false);
                if (this.healthBar) this.healthBar.setVisible(false);
                if (this.borderBar) this.borderBar.setVisible(false);
                if (this.textLabel) this.textLabel.setVisible(false);
                return;
            }
            
            // Show background bar now that we have valid stats
            if (this.backgroundBar) {
                this.backgroundBar.setVisible(true);
            }
        } catch (error) {
            Logger.warn('HealthBar', 'Error reading stats:', error);
            // Hide health bar on error instead of showing empty
            this.setVisible(false);
            return;
        }

        // Calculate health percentage
        const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));

        // Update health bar width
        const barWidth = Math.max(1, this.options.width * healthPercent); // Minimum 1px so it's visible
        this.healthBar.setSize(barWidth, this.options.height);
        this.healthBar.setPosition(-this.options.width / 2 + barWidth / 2, this.options.offsetY);
        
        // Ensure health bar is visible
        if (this.healthBar) {
            this.healthBar.setVisible(true);
            this.healthBar.setAlpha(1);
        }

        // Change color based on health
        if (healthPercent <= this.options.lowHealthThreshold) {
            this.healthBar.setFillStyle(this.options.lowHealthColor);
        } else {
            this.healthBar.setFillStyle(this.options.healthColor);
        }

        // Update text
        if (this.textLabel) {
            this.textLabel.setText(`${Math.ceil(currentHealth)}/${Math.ceil(maxHealth)}`);
        }

        // Update position to follow entity
        try {
            if (this.entity.sprite && this.entity.sprite.x !== undefined && this.entity.sprite.y !== undefined) {
                this.container.setPosition(this.entity.sprite.x, this.entity.sprite.y);
            } else if (this.entity.x !== undefined && this.entity.y !== undefined) {
                this.container.setPosition(this.entity.x, this.entity.y);
            }
        } catch (error) {
            Logger.warn('HealthBar', 'Error updating position:', error);
        }
    }

    destroy() {
        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }
        this.backgroundBar = null;
        this.healthBar = null;
        this.borderBar = null;
        this.textLabel = null;
    }

    setVisible(visible) {
        if (this.container) {
            this.container.setVisible(visible);
        }
    }
}


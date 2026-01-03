/**
 * Shared UI Builder Utilities
 * Provides reusable UI creation functions to reduce code duplication across scenes
 */

import { SCENE_CONFIG, getResponsiveFontSize } from '../config/scene-config.js';
import { poolManager } from './object-pool.js';
import { SafeExecutor } from './error-handling.js';

export class UIBuilder {
    /**
     * Create a new UIBuilder
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.pools = poolManager.getScenePools(scene);
    }

    /**
     * Create a text object with desktop-optimized sizing
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text content
     * @param {Object} style - Text style overrides
     * @param {number} fontSize - Base font size (desktop-optimized)
     * @returns {Phaser.GameObjects.Text} Text object
     */
    createText(x, y, text, style = {}, fontSize = SCENE_CONFIG.FONT_SIZES.BODY_MEDIUM, usePool = true) {
        if (usePool && this.pools) {
            // Use pooled text object for better performance
            return this.createPooledText(x, y, text, style, fontSize);
        }

        const responsiveSize = getResponsiveFontSize(fontSize, this.scene.scale.width, this.scene.scale.height);

        const defaultStyle = {
            font: `${responsiveSize}px Arial`,
            fill: SCENE_CONFIG.COLORS.TEXT_PRIMARY,
            ...style
        };

        return SafeExecutor.execute(
            () => this.scene.add.text(x, y, text, defaultStyle),
            null,
            'UIBuilder.createText'
        );
    }

    /**
     * Create a pooled text object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Text content
     * @param {Object} style - Text style overrides
     * @returns {Phaser.GameObjects.Text} Pooled text object
     */
    createPooledText(x, y, text, style = {}) {
        const textObj = this.pools.get('text');
        if (!textObj) return this.createText(x, y, text, style); // Fallback

        textObj.setPosition(x, y);
        textObj.setText(text);
        textObj.setStyle({
            font: '16px Arial',
            fill: '#ffffff',
            ...style
        });
        textObj.setVisible(true);
        textObj.setActive(true);

        return textObj;
    }

    /**
     * Create a button with consistent styling
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} text - Button text
     * @param {Function} callback - Click callback
     * @param {Object} options - Button options
     * @returns {Phaser.GameObjects.Container} Button container
     */
    createButton(x, y, text, callback, options = {}) {
        const {
            width = SCENE_CONFIG.BUTTONS.DEFAULT_WIDTH,
            height = SCENE_CONFIG.BUTTONS.DEFAULT_HEIGHT,
            color = SCENE_CONFIG.COLORS.BUTTON_NORMAL,
            hoverColor = SCENE_CONFIG.COLORS.BUTTON_HOVER,
            textColor = SCENE_CONFIG.COLORS.TEXT_PRIMARY,
            fontSize = SCENE_CONFIG.FONT_SIZES.BODY_MEDIUM,
            disabled = false
        } = options;

        const container = this.scene.add.container(x, y);

        // Background
        const bg = this.createPooledText(0, 0, '', {
            backgroundColor: color,
            padding: { x: 10, y: 5 }
        });
        bg.setVisible(false); // Hide text bg, we'll use rectangle

        const rect = this.pools.get('rectangle');
        if (rect) {
            rect.setPosition(0, 0);
            rect.setSize(width, height);
            const fillColor = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
            rect.setFillStyle(fillColor);
            rect.setVisible(true);
            rect.setActive(true);
            container.add(rect);
        }

        // Text
        const buttonText = this.createText(0, 0, text, {
            fill: textColor,
            font: `${getResponsiveFontSize(fontSize)}px Arial`
        });
        buttonText.setOrigin(0.5, 0.5);
        container.add(buttonText);

        // Interactions
        if (!disabled) {
            const interactiveObj = rect || container;
            interactiveObj.setInteractive();

            interactiveObj.on('pointerover', () => {
                if (rect) {
                    const hoverFillColor = typeof hoverColor === 'string' ? parseInt(hoverColor.replace('#', ''), 16) : hoverColor;
                    rect.setFillStyle(hoverFillColor);
                }
            });

            interactiveObj.on('pointerout', () => {
                if (rect) {
                    const fillColor = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
                    rect.setFillStyle(fillColor);
                }
            });

            interactiveObj.on('pointerdown', () => {
                if (callback) SafeExecutor.execute(callback, null, 'UIBuilder.buttonCallback');
            });
        }

        return container;
    }

    /**
     * Create a panel with background and border
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Panel width
     * @param {number} height - Panel height
     * @param {Object} options - Panel options
     * @returns {Phaser.GameObjects.Container} Panel container
     */
    createPanel(x, y, width, height, options = {}) {
        const {
            backgroundColor = SCENE_CONFIG.COLORS.BACKGROUND_DARK,
            borderColor = SCENE_CONFIG.COLORS.BORDER_GOLD,
            borderWidth = 2,
            alpha = 1
        } = options;

        const container = this.scene.add.container(x, y);

        // Background
        const bg = this.pools.get('rectangle');
        if (bg) {
            bg.setPosition(0, 0);
            bg.setSize(width, height);
            const bgFillColor = typeof backgroundColor === 'string' ? parseInt(backgroundColor.replace('#', ''), 16) : backgroundColor;
            bg.setFillStyle(bgFillColor);
            bg.setAlpha(alpha);
            bg.setVisible(true);
            bg.setActive(true);
            container.add(bg);
        }

        // Border (using graphics - FIXED: proper border rendering for Phaser 3)
        const graphics = this.pools.get('graphics');
        if (graphics) {
            graphics.clear();
            const borderFillColor = typeof borderColor === 'string' ? parseInt(borderColor.replace('#', ''), 16) : borderColor;
            graphics.lineStyle(borderWidth, borderFillColor, 1);
            graphics.strokeRect(-width / 2, -height / 2, width, height);
            graphics.setVisible(true);
            container.add(graphics);
        }

        return container;
    }

    /**
     * Create a bordered rectangle (FIXED: replaces setStrokeStyle misuse)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @param {Object} options - Rectangle options
     * @returns {Phaser.GameObjects.Container} Rectangle with border
     */
    createBorderedRectangle(x, y, width, height, options = {}) {
        const {
            fillColor = SCENE_CONFIG.COLORS.BACKGROUND_DARK,
            borderColor = SCENE_CONFIG.COLORS.BORDER_GOLD,
            borderWidth = 2,
            alpha = 1
        } = options;

        const container = this.scene.add.container(x, y);

        // Background rectangle
        const bg = this.pools.get('rectangle');
        if (bg) {
            bg.setPosition(0, 0);
            bg.setSize(width, height);
            bg.setFillStyle(typeof fillColor === 'string' ? parseInt(fillColor.replace('#', ''), 16) : fillColor);
            bg.setAlpha(alpha);
            bg.setVisible(true);
            bg.setActive(true);
            container.add(bg);
        }

        // Border using graphics (FIXED: proper Phaser 3 border rendering)
        const borderGraphics = this.pools.get('graphics');
        if (borderGraphics) {
            borderGraphics.clear();
            borderGraphics.lineStyle(borderWidth, typeof borderColor === 'string' ? parseInt(borderColor.replace('#', ''), 16) : borderColor, 1);
            borderGraphics.strokeRect(-width / 2, -height / 2, width, height);
            borderGraphics.setVisible(true);
            container.add(borderGraphics);
        }

        return container;
    }

    /**
     * Create a health bar
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Bar width
     * @param {number} height - Bar height
     * @param {number} current - Current value
     * @param {number} max - Maximum value
     * @param {Object} colors - Bar colors
     * @returns {Phaser.GameObjects.Container} Health bar container
     */
    createHealthBar(x, y, width, height, current, max, colors = {}) {
        const {
            background = 0x000000,
            fill = 0x00ff00,
            border = 0xffffff
        } = colors;

        const container = this.scene.add.container(x, y);
        const percent = Math.max(0, Math.min(1, current / max));

        // Background
        const bgRect = this.pools.get('rectangle');
        if (bgRect) {
            bgRect.setPosition(0, 0);
            bgRect.setSize(width, height);
            bgRect.setFillStyle(background);
            container.add(bgRect);
        }

        // Fill
        const fillRect = this.pools.get('rectangle');
        if (fillRect) {
            fillRect.setPosition(-width / 2, -height / 2);
            fillRect.setSize(width * percent, height);
            fillRect.setFillStyle(fill);
            container.add(fillRect);
        }

        // Border
        const borderGraphics = this.pools.get('graphics');
        if (borderGraphics) {
            borderGraphics.clear();
            borderGraphics.lineStyle(1, border, 1);
            borderGraphics.strokeRect(-width / 2, -height / 2, width, height);
            container.add(borderGraphics);
        }

        return container;
    }

    /**
     * Create a scrollable text area
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Area width
     * @param {number} height - Area height
     * @param {string} content - Text content
     * @param {Object} options - Text area options
     * @returns {Object} Scrollable text area object
     */
    createScrollableText(x, y, width, height, content, options = {}) {
        const {
            fontSize = SCENE_CONFIG.FONT_SIZES.BODY_SMALL,
            textColor = SCENE_CONFIG.COLORS.TEXT_PRIMARY,
            backgroundColor = SCENE_CONFIG.COLORS.BACKGROUND_DARK,
            padding = 10
        } = options;

        const container = this.scene.add.container(x, y);

        // Background
        const bg = this.createPanel(0, 0, width, height, { backgroundColor });
        container.add(bg);

        // Text
        const textObj = this.createText(-width / 2 + padding, -height / 2 + padding, content, {
            font: `${getResponsiveFontSize(fontSize)}px Arial`,
            fill: textColor,
            wordWrap: { width: width - padding * 2 }
        });
        textObj.setOrigin(0, 0);
        container.add(textObj);

        // Scroll handling
        let scrollY = 0;
        const maxScroll = Math.max(0, textObj.height - height + padding * 2);

        const updateScroll = () => {
            textObj.setY(-height / 2 + padding - scrollY);
        };

        // Mouse wheel scrolling
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
        container.on('wheel', (pointer, deltaX, deltaY, _deltaZ) => {
            scrollY = Math.max(0, Math.min(maxScroll, scrollY + deltaY * 0.5));
            updateScroll();
        });

        return {
            container,
            text: textObj,
            scrollTo: (y) => {
                scrollY = Math.max(0, Math.min(maxScroll, y));
                updateScroll();
            },
            getScroll: () => scrollY,
            getMaxScroll: () => maxScroll
        };
    }

    /**
     * Create a notification popup
     * @param {string} message - Notification message
     * @param {Object} options - Notification options
     * @returns {Phaser.GameObjects.Container} Notification container
     */
    createNotification(message, options = {}) {
        const {
            duration = SCENE_CONFIG.TIMINGS.NOTIFICATION_DURATION,
            color = SCENE_CONFIG.COLORS.TEXT_ACCENT,
            backgroundColor = SCENE_CONFIG.COLORS.BACKGROUND_DARK,
            x = this.scene.scale.width / 2,
            y = this.scene.scale.height / 2
        } = options;

        const container = this.scene.add.container(x, y);

        // Background panel
        const panel = this.createPanel(0, 0, 300, 100, { backgroundColor });
        container.add(panel);

        // Message text
        const text = this.createText(0, 0, message, {
            fill: color,
            font: `${getResponsiveFontSize(SCENE_CONFIG.FONT_SIZES.BODY_MEDIUM)}px Arial`,
            align: 'center',
            wordWrap: { width: 280 }
        });
        text.setOrigin(0.5, 0.5);
        container.add(text);

        // Auto-remove after duration
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                this.destroyContainer(container);
            });
        }

        return container;
    }

    /**
     * Safely destroy a container and its children
     * @param {Phaser.GameObjects.Container} container - Container to destroy
     */
    destroyContainer(container) {
        if (!container) return;

        SafeExecutor.execute(() => {
            // Return pooled objects to pools
            container.list.forEach(child => {
                if (child.type === 'Text' && child._isPooled) {
                    this.pools.release('text', child);
                } else if (child.type === 'Rectangle' && child._isPooled) {
                    this.pools.release('rectangle', child);
                } else if (child.type === 'Graphics' && child._isPooled) {
                    this.pools.release('graphics', child);
                }
            });

            container.destroy();
        }, null, 'UIBuilder.destroyContainer');
    }

    /**
     * Create a loading spinner
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Spinner radius
     * @returns {Phaser.GameObjects.Graphics} Spinner graphics
     */
    createSpinner(x, y, radius = 20) {
        const graphics = this.pools.get('graphics');
        if (!graphics) return null;

        graphics.setPosition(x, y);
        graphics.clear();

        // Draw spinning circle segments
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const alpha = (i + 1) / segments;
            graphics.fillStyle(0xffffff, alpha);
            graphics.slice(radius * 0.5, radius * 0.8, angle, angle + Math.PI / segments, false);
            graphics.fillPath();
        }

        // Add rotation animation
        this.scene.tweens.add({
            targets: graphics,
            angle: 360,
            duration: 1000,
            repeat: -1,
            ease: 'Linear'
        });

        return graphics;
    }

    /**
     * Update viewport dimensions for desktop optimization
     * @param {number} width - New width
     * @param {number} height - New height
     */
    updateViewport(width, height) {
        // Update any cached responsive calculations
        this.scene.scale.setGameSize(width, height);
    }
}

/**
 * Scene UI Factory - Creates UI builders for scenes
 */
export class SceneUIFactory {
    static #builders = new WeakMap();

    /**
     * Get or create a UI builder for a scene
     * @param {Phaser.Scene} scene - The Phaser scene
     * @returns {UIBuilder} UI builder instance
     */
    static getBuilder(scene) {
        if (!this.#builders.has(scene)) {
            this.#builders.set(scene, new UIBuilder(scene));
        }
        return this.#builders.get(scene);
    }

    /**
     * Clean up UI builder for a scene
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    static cleanup(scene) {
        const builder = this.#builders.get(scene);
        if (builder) {
            // Clean up any resources
            builder.pools.clear();
            this.#builders.delete(scene);
        }
    }
}

// Convenience function for getting UI builder
export function getUIBuilder(scene) {
    return SceneUIFactory.getBuilder(scene);
}

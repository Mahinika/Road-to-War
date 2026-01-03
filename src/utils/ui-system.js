/**
 * UI System - Unified UI utilities for the game
 * Combines modern UI helpers, WoW-style UI components, and theme constants
 */

// ============================================================================
// THEME CONSTANTS AND UTILITIES
// ============================================================================

// Centralized UI theme tokens for GameScene overlays
// WoW WOTLK-inspired color scheme and styling
export const UI_THEME = {
    // WoW WOTLK dark surfaces - textured dark backgrounds
    surfaces: {
        hud: 0x0a0a0a,           // Very dark background for HUD
        panel: 0x0a0a0a,         // Dark panel background (WoW style)
        panelAlt: 0x1a1a2e,       // Slightly lighter panel variant
        overlay: 0x0a0a0a,       // Overlay background
        frame: 0x1a1f2e,          // Unit frame background
        frameDark: 0x0a0a0a       // Darker frame variant
    },
    // WoW WOTLK text colors
    text: {
        primary: '#ffffff',       // White primary text
        muted: '#cccccc',         // Light gray muted text
        inverse: '#000000',       // Black for light backgrounds
        warning: '#ffd700',       // Gold warning text
        system: '#ffff00',        // Yellow system messages
        combat: '#ffffff',        // White combat text
        loot: '#00ff00',          // Green loot messages
        error: '#ff0000'          // Red error messages
    },
    // WoW WOTLK accent colors - gold/bronze borders
    accents: {
        gold: { base: 0xffd700, border: 0xc9aa71 },      // Gold accents
        bronze: { base: 0x8b6914, border: 0x6b5010 },    // Bronze accents
        inventory: { base: 0x7bd389, border: 0x5ba369 },
        health: {
            safe: 0x00ff00,       // Green full health
            warn: 0xffaa00,       // Orange low health
            danger: 0xff0000      // Red critical health
        },
        mana: { base: 0x0088ff, border: 0x0066cc },      // Blue mana
        energy: { base: 0xffff00, border: 0xccaa00 },    // Yellow energy
        rage: { base: 0xff0000, border: 0xaa0000 },      // Red rage
        focus: { base: 0xff8800, border: 0xcc6600 },     // Orange focus
        combat: { base: 0xff8a5c, border: 0xff6a3c },
        header: { base: 0xc9aa71, border: 0x8b6914 }    // Gold header
    },
    // Role colors (unchanged, already good)
    roles: {
        tank: { border: 0x3aa7ff, glow: 0x7bc4ff },
        healer: { border: 0x4cd964, glow: 0x8cf19e },
        dps: { border: 0xff9f43, glow: 0xffc58a }
    },
    // WoW WOTLK spacing
    spacing: {
        gutter: 10,
        hudHeight: 44,
        panelPadding: 12,
        frameSpacing: 2,          // Spacing between party frames
        frameHeight: 70            // Height of each party frame
    },
    // Typography
    typography: {
        title: 18,
        body: 14,
        small: 12,
        frameTitle: 16,           // Party frame title
        frameBody: 11              // Party frame body text
    },
    // WoW WOTLK border colors
    borders: {
        gold: 0xc9aa71,            // Gold border (WoW classic)
        bronze: 0x8b6914,          // Bronze border
        dark: 0x2a2a2a,            // Dark border
        class: null                // Will use class color
    },
    // Texture simulation colors (for gradient effects)
    textures: {
        frameHighlight: 0xffffff, // White highlight (low alpha)
        frameShadow: 0x000000,     // Black shadow (low alpha)
        barGradientTop: 0xffffff,  // Bar gradient top
        barGradientBottom: 0x000000 // Bar gradient bottom
    }
};

export function getRoleColors(role = 'dps') {
    return UI_THEME.roles[role] || UI_THEME.roles.dps;
}

// World of Warcraft class colors
export const CLASS_COLORS = {
    paladin: 0xF58CBA,    // Pink
    warrior: 0xC79C6E,    // Brown/Tan
    priest: 0xF0F0F0,     // Light Gray (changed from white to avoid invisible sprites)
    mage: 0x69CCF0,       // Light Blue
    rogue: 0xFFF569,      // Yellow
    warlock: 0x9482C9,    // Purple
    hunter: 0xABD473,     // Green
    shaman: 0x0070DE,     // Blue
    druid: 0xFF7D0A       // Orange
};

export function getClassColor(classId) {
    return CLASS_COLORS[classId] || 0xFFFFFF; // Default to white if class not found
}

// ============================================================================
// ANIMATION UTILITIES (Phase 9: High Quality Animations)
// ============================================================================

/**
 * Apply a pulsing scale effect to a game object
 * @param {Phaser.Scene} scene 
 * @param {Phaser.GameObjects.GameObject} target 
 * @param {number} scale 
 * @param {number} duration 
 */
export function applyPulseEffect(scene, target, scale = 1.05, duration = 800) {
    if (!scene || !target) return null;
    return scene.tweens.add({
        targets: target,
        scaleX: scale,
        scaleY: scale,
        duration: duration,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
}

/**
 * Apply a subtle "shine" or "glint" effect using a mask or graphics
 * @param {Phaser.Scene} scene 
 * @param {Phaser.GameObjects.Container} container 
 */
export function applyShineEffect(scene, container) {
    if (!scene || !container) return;
    
    // Get container bounds or dimensions
    const width = container.width || 100;
    const height = container.height || 40;
    
    const shine = scene.add.graphics();
    shine.fillStyle(0xffffff, 0.3);
    shine.beginPath();
    shine.moveTo(-width, -height);
    shine.lineTo(-width/2, -height);
    shine.lineTo(width/2, height);
    shine.lineTo(0, height);
    shine.closePath();
    shine.fillPath();
    
    container.add(shine);
    shine.setAlpha(0);
    
    scene.tweens.add({
        targets: shine,
        x: width * 2,
        alpha: { from: 0, to: 0.5, yoyo: true },
        duration: 1000,
        delay: 2000,
        repeat: -1,
        repeatDelay: 3000
    });
}

/**
 * Apply a "bounce" effect when appearing
 * @param {Phaser.Scene} scene 
 * @param {Phaser.GameObjects.GameObject} target 
 */
export function applyBounceIn(scene, target) {
    if (!scene || !target) return;
    target.setScale(0.5);
    target.setAlpha(0);
    scene.tweens.add({
        targets: target,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 400,
        ease: 'Back.easeOut'
    });
}

// ============================================================================
// MODERN UI COMPONENTS (from ui-helper.js)
// ============================================================================

/**
 * Create a modern panel with gradient background and shadow
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Panel width
 * @param {number} height - Panel height
 * @param {Object} options - Styling options
 * @returns {Phaser.GameObjects.Container} Panel container
 */
export function createModernPanel(scene, x, y, width, height, options = {}) {
    // Validate inputs
    if (!scene) {
        return null;
    }
    if (!scene.add) {
        return null;
    }
    if (typeof scene.add.container !== 'function') {
        return null;
    }

    const {
        backgroundColor = 0x0d0e13,
        backgroundAlpha = 0.95,
        borderColor = 0xb8960f,
        borderWidth = 3,
        innerBorderColor = 0x4a90e2,
        innerBorderWidth = 1,
        shadow = true,
        shadowColor = 0x000000,
        shadowAlpha = 0.5
    } = options;

    let container;
    try {
        container = scene.add.container(x, y);
        if (!container) {
            return null;
        }
    } catch {
        return null;
    }

    // Shadow layer (behind everything)
    if (shadow) {
        const shadowRect = scene.add.rectangle(0, 0, width + 6, height + 6, shadowColor, shadowAlpha);
        shadowRect.setBlendMode(Phaser.BlendModes.MULTIPLY);
        container.add(shadowRect);
    }

    // Main background with gradient effect (simulated with layered rectangles)
    const bgMain = scene.add.rectangle(0, 0, width, height, backgroundColor, backgroundAlpha);
    container.add(bgMain);

    // Top highlight gradient (simulated)
    const topHighlight = scene.add.rectangle(0, -height / 2, width, height * 0.1, 0xffffff, 0.05);
    container.add(topHighlight);

    // Bottom shadow gradient (simulated)
    const bottomShadow = scene.add.rectangle(0, height / 2, width, height * 0.1, 0x000000, 0.2);
    container.add(bottomShadow);

    // Outer border
    const outerBorder = scene.add.graphics();
    outerBorder.lineStyle(borderWidth, borderColor);
    outerBorder.strokeRect(-width / 2, -height / 2, width, height);
    container.add(outerBorder);

    // Inner border (inset)
    const innerBorder = scene.add.graphics();
    innerBorder.lineStyle(innerBorderWidth, innerBorderColor);
    innerBorder.strokeRect(-width / 2 + borderWidth / 2, -height / 2 + borderWidth / 2, width - borderWidth, height - borderWidth);
    container.add(innerBorder);

    // Store references for potential updates
    container.background = bgMain;
    container.borders = { outer: outerBorder, inner: innerBorder };

    // Apply bounce in effect (Phase 9)
    applyBounceIn(scene, container);

    return container;
}

/**
 * Create a modern button with hover effects and sound
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Button width
 * @param {number} height - Button height
 * @param {string} text - Button text
 * @param {Object} options - Styling options
 * @returns {Phaser.GameObjects.Container} Button container
 */
export function createModernButton(scene, x, y, width, height, text, options = {}) {
    // Validate inputs
    if (!scene) {
        return null;
    }
    if (!scene.add) {
        return null;
    }
    if (typeof scene.add.container !== 'function') {
        return null;
    }

    const {
        backgroundColor = 0x2a2a2a,
        backgroundAlpha = 0.9,
        hoverColor = 0x4a4a4a,
        borderColor = 0x666666,
        borderWidth = 2,
        textColor = '#ffffff',
        fontSize = 16,
        onClick = null
    } = options;

    let container;
    try {
        container = scene.add.container(x, y);
        if (!container) {
            return null;
        }
    } catch (error) {
        console.error('createModernButton: Failed to create container:', error);
        return null;
    }

    // Background
    const bg = scene.add.rectangle(0, 0, width, height, backgroundColor, backgroundAlpha);
    container.add(bg);

    // Border
    const border = scene.add.graphics();
    border.lineStyle(borderWidth, borderColor);
    border.strokeRect(-width / 2, -height / 2, width, height);
    container.add(border);

    // Text
    const textObj = scene.add.text(0, 0, text, {
        font: `${fontSize}px Arial`,
        fill: textColor,
        align: 'center'
    });
    textObj.setOrigin(0.5, 0.5);
    container.add(textObj);

    // Interactive behavior - make the container interactive, not just the background
    // This ensures the entire button area is clickable even when inside containers
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height) });

    container.on('pointerover', () => {
        bg.setFillStyle(hoverColor);
        if (scene.game && scene.game.canvas) {
            scene.game.canvas.style.cursor = 'pointer';
        }
    });

    container.on('pointerout', () => {
        bg.setFillStyle(backgroundColor);
        if (scene.game && scene.game.canvas) {
            scene.game.canvas.style.cursor = 'default';
        }
    });

    container.on('pointerdown', () => {
        if (onClick) onClick();
    });

    // Store references
    container.background = bg;
    container.border = border;
    container.text = textObj;

    // Apply shine effect for buttons (Phase 9)
    applyShineEffect(scene, container);

    return container;
}

/**
 * Create a modern progress bar
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Bar width
 * @param {number} height - Bar height
 * @param {number} percent - Fill percentage (0-1)
 * @param {Object} options - Styling options
 * @returns {Phaser.GameObjects.Container} Progress bar container
 */
export function createModernProgressBar(scene, x, y, width, height, percent, options = {}) {
    const {
        backgroundColor = 0x333333,
        fillColor = 0x00ff00,
        borderColor = 0x666666,
        borderWidth = 1
    } = options;

    const container = scene.add.container(x, y);

    // Background
    const bg = scene.add.rectangle(0, 0, width, height, backgroundColor);
    container.add(bg);

    // Fill
    const fillWidth = Math.max(0, Math.min(width, width * percent));
    const fill = scene.add.rectangle(-width / 2, 0, fillWidth, height, fillColor);
    fill.setOrigin(0, 0.5);
    container.add(fill);

    // Border
    const border = scene.add.graphics();
    border.lineStyle(borderWidth, borderColor);
    border.strokeRect(-width / 2, -height / 2, width, height);
    container.add(border);

    // Store references for updates
    container.background = bg;
    container.fill = fill;
    container.border = border;

    return container;
}

/**
 * Create modern-styled text with shadow
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} text - Text content
 * @param {Object} options - Styling options
 * @returns {Phaser.GameObjects.Text} Text object
 */
export function createModernText(scene, x, y, text, options = {}) {
    // Validate inputs
    if (!scene) {
        console.error('createModernText: scene is required');
        return null;
    }
    if (!scene.add) {
        console.error('createModernText: scene.add is not available');
        return null;
    }
    if (typeof scene.add.text !== 'function') {
        console.error('createModernText: scene.add.text is not a function');
        return null;
    }

    const {
        fontSize = 16,
        color = '#ffffff',
        align = 'left',
        shadow = true,
        shadowColor = '#000000',
        shadowOffsetX = 1,
        shadowOffsetY = 1
    } = options;

    let textObj;
    try {
        textObj = scene.add.text(x, y, text, {
            font: `${fontSize}px Arial`,
            fill: color,
            align: align
        });
        if (!textObj) {
            console.error('createModernText: scene.add.text returned null/undefined');
            return null;
        }

        if (shadow) {
            textObj.setShadow(shadowOffsetX, shadowOffsetY, shadowColor, 0, true, true);
        }

        return textObj;
    } catch (error) {
        console.error('createModernText: Failed to create text:', error);
        return null;
    }
}

// ============================================================================
// WOW-STYLE UI COMPONENTS (from wow-ui-helper.js)
// ============================================================================

/**
 * Create a WoW-style unit/party frame
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Frame width
 * @param {number} height - Frame height
 * @param {Object} options - Styling options
 * @returns {Phaser.GameObjects.Container} Frame container
 */
export function createWoWFrame(scene, x, y, width, height, options = {}) {
    const {
        backgroundColor = UI_THEME.surfaces.frame,
        backgroundAlpha = 0.95,
        borderColor = UI_THEME.borders.gold,
        borderWidth = 2,
        classColor = null, // If provided, use class color for border
        shadow = true
    } = options;

    const container = scene.add.container(x, y);

    // Enhanced shadow with offset for depth
    if (shadow) {
        const shadowOffset = 2;
        const shadowRect = scene.add.rectangle(shadowOffset, shadowOffset, width + 4, height + 4, 0x000000, 0.5);
        container.add(shadowRect);
        
        // Additional soft shadow layer
        const softShadow = scene.add.rectangle(shadowOffset / 2, shadowOffset / 2, width + 6, height + 6, 0x000000, 0.2);
        container.add(softShadow);
    }

    // Background with gradient effect (simulated with layered rectangles)
    const bg = scene.add.rectangle(0, 0, width, height, backgroundColor, backgroundAlpha);
    container.add(bg);
    
    // Top highlight gradient (simulated)
    const topHighlight = scene.add.rectangle(0, -height / 2, width, 2, 0xffffff, 0.15);
    container.add(topHighlight);
    
    // Bottom shadow gradient (simulated)
    const bottomShadow = scene.add.rectangle(0, height / 2, width, 2, 0x000000, 0.3);
    container.add(bottomShadow);

    // Outer border with class color or gold (thicker, more prominent)
    const finalBorderColor = classColor || borderColor;
    const border = scene.add.graphics();
    border.lineStyle(borderWidth, finalBorderColor, 1.0);
    border.strokeRect(-width / 2, -height / 2, width, height);
    container.add(border);
    
    // Inner border for depth (darker)
    const innerBorder = scene.add.graphics();
    innerBorder.lineStyle(1, 0x000000, 0.4);
    innerBorder.strokeRect(-width / 2 + borderWidth, -height / 2 + borderWidth, width - borderWidth * 2, height - borderWidth * 2);
    container.add(innerBorder);

    // Inner highlight (WoW-style) - more visible
    const highlight = scene.add.graphics();
    highlight.lineStyle(1, UI_THEME.textures.frameHighlight, 0.25);
    highlight.strokeRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6);
    container.add(highlight);
    
    // Corner highlights for extra polish
    const cornerSize = 4;
    const cornerAlpha = 0.2;
    const cornerHighlight = scene.add.graphics();
    cornerHighlight.fillStyle(0xffffff, cornerAlpha);
    // Top-left corner
    cornerHighlight.fillRect(-width / 2 + 2, -height / 2 + 2, cornerSize, cornerSize);
    // Top-right corner
    cornerHighlight.fillRect(width / 2 - cornerSize - 2, -height / 2 + 2, cornerSize, cornerSize);
    container.add(cornerHighlight);

    return container;
}

/**
 * Create a WoW-style status bar (health/mana)
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Bar width
 * @param {number} height - Bar height
 * @param {Object} options - Styling options
 * @returns {Phaser.GameObjects.Container} Bar container
 */
export function createWoWBar(scene, x, y, width, height, options = {}) {
    // Validate inputs
    if (!scene) {
        console.error('createWoWBar: scene is required');
        return null;
    }
    if (!scene.add) {
        console.error('createWoWBar: scene.add is not available');
        return null;
    }
    if (typeof scene.add.container !== 'function') {
        console.error('createWoWBar: scene.add.container is not a function');
        return null;
    }

    const {
        backgroundColor = UI_THEME.surfaces.frameDark,
        fillColor = UI_THEME.accents.health.safe,
        borderColor = UI_THEME.borders.dark,
        borderWidth = 1,
        percent = null, // If null, calculate from current/max
        current = null,
        max = null,
        type = 'health', // 'health' or 'mana'
        classColor = null
    } = options;

    // Calculate percent from current/max if provided, otherwise use percent option
    let fillPercent = percent;
    if (fillPercent === null || fillPercent === undefined) {
        if (current !== null && max !== null && max > 0) {
            fillPercent = Math.max(0, Math.min(1, current / max));
        } else {
            fillPercent = 1.0;
        }
    }

    // Determine fill color based on type if not explicitly provided
    let finalFillColor = fillColor;
    if (type === 'health' && !options.fillColor) {
        // Health bar color based on percentage
        if (fillPercent > 0.6) {
            finalFillColor = UI_THEME.accents.health.safe || 0x00ff00;
        } else if (fillPercent > 0.3) {
            finalFillColor = UI_THEME.accents.health.warn || 0xffaa00;
        } else {
            finalFillColor = UI_THEME.accents.health.danger || 0xff0000;
        }
    } else if (type === 'mana' && !options.fillColor) {
        finalFillColor = UI_THEME.accents.mana.base || 0x0088ff;
    } else if (type === 'energy' && !options.fillColor) {
        finalFillColor = UI_THEME.accents.energy?.base || 0xffff00;
    } else if (type === 'rage' && !options.fillColor) {
        finalFillColor = UI_THEME.accents.rage?.base || 0xff0000;
    } else if (type === 'focus' && !options.fillColor) {
        finalFillColor = UI_THEME.accents.focus?.base || 0xff8800;
    }

    // Use class color for border if provided
    const finalBorderColor = classColor || borderColor;

    let container;
    try {
        container = scene.add.container(x, y);
        if (!container) {
            console.error('createWoWBar: scene.add.container returned null/undefined');
            return null;
        }
    } catch (error) {
        console.error('createWoWBar: Failed to create container:', error);
        return null;
    }

    // Background with depth
    try {
        const bg = scene.add.rectangle(0, 0, width, height, backgroundColor);
        if (!bg) {
            console.error('createWoWBar: Failed to create background rectangle');
            container.destroy();
            return null;
        }
        container.add(bg);
        
        // Background inner shadow for depth
        const bgShadow = scene.add.graphics();
        bgShadow.fillStyle(0x000000, 0.3);
        bgShadow.fillRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2);
        container.add(bgShadow);

        // Fill with gradient effect (simulated with highlight)
        const fillWidth = width * fillPercent;
        const fill = scene.add.rectangle(-width / 2, 0, fillWidth, height, finalFillColor);
        if (!fill) {
            console.error('createWoWBar: Failed to create fill rectangle');
            container.destroy();
            return null;
        }
        fill.setOrigin(0, 0.5);
        container.add(fill);
        
        // Top highlight on fill for shine effect
        if (fillPercent > 0) {
            const fillHighlight = scene.add.rectangle(-width / 2, -height / 2, fillWidth, Math.max(1, height * 0.3), 0xffffff, 0.2);
            fillHighlight.setOrigin(0, 0);
            container.add(fillHighlight);
        }

        // Outer border
        const border = scene.add.graphics();
        if (!border) {
            console.error('createWoWBar: Failed to create border graphics');
            container.destroy();
            return null;
        }
        border.lineStyle(borderWidth, finalBorderColor, 1.0);
        border.strokeRect(-width / 2, -height / 2, width, height);
        container.add(border);
        
        // Inner border for depth
        const innerBorder = scene.add.graphics();
        innerBorder.lineStyle(1, 0x000000, 0.5);
        innerBorder.strokeRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2);
        container.add(innerBorder);

        // Store references
        container.background = bg;
        container.fill = fill;
        container.border = border;

        return container;
    } catch (error) {
        console.error('createWoWBar: Error creating bar elements:', error);
        if (container) {
            container.destroy();
        }
        return null;
    }
}

/**
 * Create a WoW-style button
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Button size (square)
 * @param {Object} options - Styling options
 * @returns {Phaser.GameObjects.Container} Button container
 */
export function createWoWButton(scene, x, y, size, options = {}) {
    const {
        backgroundColor = UI_THEME.surfaces.frame,
        borderColor = UI_THEME.borders.gold,
        // iconColor = 0xffffff, // Unused
        icon = '?',
        keybind = '',
        onClick = null,
        cooldown = 0,
        maxCooldown = 0
    } = options;

    const container = scene.add.container(x, y);

    // Shadow for button depth
    const shadow = scene.add.rectangle(1, 1, size + 2, size + 2, 0x000000, 0.4);
    shadow.setOrigin(0.5, 0.5);
    container.add(shadow);
    
    // Background with enhanced styling
    const bg = scene.add.rectangle(0, 0, size, size, backgroundColor, 0.95);
    container.add(bg);
    
    // Top highlight for shine effect
    const topHighlight = scene.add.rectangle(0, -size / 2, size, 2, 0xffffff, 0.2);
    container.add(topHighlight);

    // Enhanced border with multiple layers
    const border = scene.add.graphics();
    border.lineStyle(3, borderColor, 1.0); // Thicker border
    border.strokeRect(-size / 2, -size / 2, size, size);
    container.add(border);
    
    // Inner border for depth
    const innerBorder = scene.add.graphics();
    innerBorder.lineStyle(1, 0x000000, 0.5);
    innerBorder.strokeRect(-size / 2 + 1, -size / 2 + 1, size - 2, size - 2);
    container.add(innerBorder);

    // Icon (text-based for now) with enhanced styling
    const iconText = scene.add.text(0, 0, icon, {
        font: `bold ${size * 0.42}px Arial`, // Slightly larger and bold
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3, // Thicker stroke
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
    });
    iconText.setOrigin(0.5, 0.5);
    container.add(iconText);

    // Keybind indicator (bottom-right corner) with enhanced styling
    if (keybind) {
        const keybindText = scene.add.text(size * 0.35, size * 0.35, keybind, {
            font: `bold ${size * 0.22}px Arial`, // Slightly larger and bold
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2, // Thicker stroke
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 1, fill: true }
        });
        keybindText.setOrigin(1, 1);
        container.add(keybindText);
    }

    // Cooldown overlay (semi-transparent dark circle that fills based on cooldown)
    const cooldownOverlay = scene.add.graphics();
    cooldownOverlay.setPosition(0, 0);
    container.add(cooldownOverlay);

    // Cooldown text (shows remaining cooldown)
    const cooldownText = scene.add.text(0, 0, '', {
        font: `bold ${size * 0.3}px Arial`,
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2
    });
    cooldownText.setOrigin(0.5, 0.5);
    container.add(cooldownText);

    // Interactive
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
        if (cooldown <= 0) { // Only highlight if not on cooldown
            bg.setAlpha(1.0);
            // Add glow effect on hover
            scene.tweens.add({
                targets: border,
                alpha: { from: 1.0, to: 1.5 },
                duration: 150,
                ease: 'Quad.easeOut'
            });
            // Slight scale up for feedback
            scene.tweens.add({
                targets: container,
                scale: { from: 1.0, to: 1.05 },
                duration: 150,
                ease: 'Quad.easeOut'
            });
        }
    });

    bg.on('pointerout', () => {
        bg.setAlpha(0.95);
        // Remove glow effect
        scene.tweens.add({
            targets: border,
            alpha: { from: border.alpha, to: 1.0 },
            duration: 150,
            ease: 'Quad.easeOut'
        });
        // Scale back down
        scene.tweens.add({
            targets: container,
            scale: { from: container.scaleX, to: 1.0 },
            duration: 150,
            ease: 'Quad.easeOut'
        });
    });

    bg.on('pointerdown', () => {
        if (cooldown <= 0 && onClick) { // Only allow click if not on cooldown
            onClick();
        }
    });

    // Method to update cooldown visual
    container.updateCooldown = (currentCooldown, maxCd) => {
        cooldownOverlay.clear();

        if (currentCooldown > 0 && maxCd > 0) {
            // Draw cooldown overlay (dark semi-circle from bottom)
            const progress = currentCooldown / maxCd;
            const startAngle = Math.PI * 1.5; // Start from bottom
            const endAngle = startAngle + (progress * Math.PI * 2);

            cooldownOverlay.fillStyle(0x000000, 0.8);
            cooldownOverlay.beginPath();
            cooldownOverlay.moveTo(0, 0);
            cooldownOverlay.arc(0, 0, size / 2, startAngle, endAngle, false);
            cooldownOverlay.closePath();
            cooldownOverlay.fillPath();

            // Update cooldown text
            cooldownText.setText(Math.ceil(currentCooldown));
            cooldownText.setVisible(true);

            // Make button appear disabled
            bg.setAlpha(0.5);
        } else {
            // Clear cooldown overlay
            cooldownText.setVisible(false);
            bg.setAlpha(0.9);
        }
    };

    // Initialize cooldown display
    container.updateCooldown(cooldown, maxCooldown);

    return container;
}


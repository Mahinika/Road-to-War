/**
 * UI Config Integration - Helper functions to integrate UI_CONFIG into UI creation
 * Provides wrapper functions that use UI_CONFIG values
 */

import { UI_CONFIG, getScaledValue, getRelativePosition, getCenteredPosition } from '../config/ui-config.js';
import { getConfigValue, getResponsiveValue } from './ui-config-utils.js';

/**
 * Get party frame config optimized for desktop display
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {Object} Desktop-optimized party frame config
 */
export function getPartyFrameConfig(screenWidth, screenHeight) {
    const config = UI_CONFIG.PARTY_FRAMES;
    
    return {
        frameWidth: getScaledValue(config.FRAME_WIDTH, screenWidth),
        frameHeight: getScaledValue(config.FRAME_HEIGHT, screenHeight, 'height'),
        frameSpacing: getScaledValue(config.FRAME_SPACING, screenHeight, 'height'),
        leftMargin: getScaledValue(config.LEFT_MARGIN, screenWidth),
        startY: getScaledValue(config.START_Y, screenHeight, 'height'),
        portraitSize: getScaledValue(config.PORTRAIT_SIZE, screenWidth),
        portraitXOffset: getScaledValue(config.PORTRAIT_X_OFFSET, screenWidth),
        portraitYOffset: getScaledValue(config.PORTRAIT_Y_OFFSET, screenHeight, 'height'),
        nameXOffset: getScaledValue(config.NAME_X_OFFSET, screenWidth),
        nameYOffset: getScaledValue(config.NAME_Y_OFFSET, screenHeight, 'height'),
        levelXOffset: getScaledValue(config.LEVEL_X_OFFSET, screenWidth),
        levelYOffset: getScaledValue(config.LEVEL_Y_OFFSET, screenHeight, 'height'),
        barStartXOffset: getScaledValue(config.BAR_START_X_OFFSET, screenWidth),
        barWidth: getScaledValue(config.BAR_WIDTH, screenWidth),
        healthBarHeight: getScaledValue(config.HEALTH_BAR_HEIGHT, screenHeight, 'height'),
        manaBarHeight: getScaledValue(config.MANA_BAR_HEIGHT, screenHeight, 'height'),
        xpBarHeight: getScaledValue(config.XP_BAR_HEIGHT, screenHeight, 'height'),
        // Non-scaled values
        frameBackgroundColor: config.FRAME_BACKGROUND_COLOR,
        frameBackgroundAlpha: config.FRAME_BACKGROUND_ALPHA,
        frameBorderWidth: config.FRAME_BORDER_WIDTH,
        frameGlowWidth: config.FRAME_GLOW_WIDTH,
        frameGlowAlpha: config.FRAME_GLOW_ALPHA,
        nameFontSize: config.NAME_FONT_SIZE,
        levelFontSize: config.LEVEL_FONT_SIZE
    };
}

/**
 * Get HUD config optimized for desktop display
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {Object} Desktop-optimized HUD config
 */
export function getHUDConfig(screenWidth, screenHeight) {
    const config = UI_CONFIG.HUD;
    
    return {
        height: getScaledValue(config.HEIGHT, screenHeight, 'height'),
        horizontalMargin: getScaledValue(config.HORIZONTAL_MARGIN, screenWidth),
        yOffset: getScaledValue(config.Y_OFFSET, screenHeight, 'height'),
        shadowOffsetX: getScaledValue(config.SHADOW_OFFSET_X || 2, screenWidth),
        shadowOffsetY: getScaledValue(config.SHADOW_OFFSET_Y || 2, screenHeight, 'height'),
        shadowBlur: config.SHADOW_BLUR || 4,
        shadowAlpha: config.SHADOW_ALPHA || 0.5,
        backgroundColor: config.BACKGROUND_COLOR,
        backgroundAlpha: config.BACKGROUND_ALPHA,
        borderWidth: config.BORDER_WIDTH,
        borderColor: config.BORDER_COLOR,
        borderAlpha: config.BORDER_ALPHA,
        topHighlightHeight: config.TOP_HIGHLIGHT_HEIGHT || 2,
        topHighlightAlpha: config.TOP_HIGHLIGHT_ALPHA || 0.15,
        innerHighlightWidth: config.INNER_HIGHLIGHT_WIDTH || 2,
        innerHighlightAlpha: config.INNER_HIGHLIGHT_ALPHA || 0.4,
        innerHighlightOffset: config.INNER_HIGHLIGHT_OFFSET || 2,
        goldXOffset: getScaledValue(config.GOLD_X_OFFSET, screenWidth),
        goldYOffset: getScaledValue(config.GOLD_Y_OFFSET, screenHeight, 'height'),
        mileXOffset: config.MILE_X_OFFSET === 0 ? 0 : getScaledValue(config.MILE_X_OFFSET, screenWidth),
        mileYOffset: getScaledValue(config.MILE_Y_OFFSET, screenHeight, 'height'),
        manaXOffset: getScaledValue(config.MANA_X_OFFSET, screenWidth),
        manaYOffset: getScaledValue(config.MANA_Y_OFFSET, screenHeight, 'height')
    };
}

/**
 * Get action bar config optimized for desktop display
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {Object} Desktop-optimized action bar config
 */
export function getActionBarConfig(screenWidth, screenHeight) {
    const config = UI_CONFIG.ACTION_BAR;
    
    return {
        buttonSize: getScaledValue(config.BUTTON_SIZE, screenWidth),
        buttonSpacing: getScaledValue(config.BUTTON_SPACING, screenWidth),
        buttonCount: config.BUTTON_COUNT,
        rows: config.ROWS,
        barPaddingX: getScaledValue(config.BAR_PADDING_X, screenWidth),
        barPaddingY: getScaledValue(config.BAR_PADDING_Y, screenHeight, 'height'),
        bottomMargin: getScaledValue(config.BOTTOM_MARGIN, screenHeight, 'height'),
        centerX: config.CENTER_X,
        backgroundColor: config.BACKGROUND_COLOR,
        backgroundAlpha: config.BACKGROUND_ALPHA,
        borderWidth: config.BORDER_WIDTH,
        borderColor: config.BORDER_COLOR,
        borderAlpha: config.BORDER_ALPHA
    };
}

/**
 * Get combat log config optimized for desktop display
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {Object} Desktop-optimized combat log config
 */
export function getCombatLogConfig(screenWidth, screenHeight) {
    const config = UI_CONFIG.COMBAT_LOG;
    
    return {
        width: getScaledValue(config.WIDTH, screenWidth),
        height: getScaledValue(config.HEIGHT, screenHeight, 'height'),
        centerX: config.CENTER_X,
        bottomMargin: getScaledValue(config.BOTTOM_MARGIN, screenHeight, 'height'),
        titleBarHeight: getScaledValue(config.TITLE_BAR_HEIGHT, screenHeight, 'height'),
        titleTextYOffset: config.TITLE_TEXT_Y_OFFSET,
        titleTextFontSize: getScaledValue(config.TITLE_TEXT_FONT_SIZE, screenWidth, 'font'),
        contentPaddingX: getScaledValue(config.CONTENT_PADDING_X, screenWidth),
        contentPaddingY: getScaledValue(config.CONTENT_PADDING_Y, screenHeight, 'height'),
        contentFontSize: getScaledValue(config.CONTENT_FONT_SIZE, screenWidth, 'font'),
        frameBackgroundColor: config.FRAME_BACKGROUND_COLOR,
        frameBackgroundAlpha: config.FRAME_BACKGROUND_ALPHA,
        frameBorderWidth: config.FRAME_BORDER_WIDTH,
        frameBorderColor: config.FRAME_BORDER_COLOR,
        frameBorderAlpha: config.FRAME_BORDER_ALPHA
    };
}

/**
 * Get minimap config optimized for desktop display
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {Object} Desktop-optimized minimap config
 */
export function getMinimapConfig(screenWidth, screenHeight) {
    const config = UI_CONFIG.MINIMAP;
    
    return {
        size: getScaledValue(config.SIZE, screenWidth),
        topMargin: getScaledValue(config.TOP_MARGIN, screenHeight, 'height'),
        rightMargin: getScaledValue(config.RIGHT_MARGIN, screenWidth),
        backgroundColor: config.BACKGROUND_COLOR,
        backgroundAlpha: config.BACKGROUND_ALPHA,
        outerBorderWidth: config.OUTER_BORDER_WIDTH,
        outerBorderColor: config.OUTER_BORDER_COLOR,
        outerBorderAlpha: config.OUTER_BORDER_ALPHA,
        shadowOffsetX: getScaledValue(config.SHADOW_OFFSET_X || 2, screenWidth),
        shadowOffsetY: getScaledValue(config.SHADOW_OFFSET_Y || 2, screenHeight, 'height'),
        shadowAlpha: config.SHADOW_ALPHA || 0.6,
        shadowBlur: config.SHADOW_BLUR || 2
    };
}

/**
 * Get tooltip config
 * @returns {Object} Tooltip config
 */
export function getTooltipConfig() {
    return UI_CONFIG.TOOLTIPS;
}

/**
 * Get panel config
 * @param {string} panelName - Panel name ('EQUIPMENT', 'INVENTORY', 'SHOP', etc.)
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @returns {Object} Scaled panel config
 */
export function getPanelConfig(panelName, screenWidth, screenHeight) {
    const config = UI_CONFIG.PANELS[panelName];
    if (!config) {
        console.warn(`Panel config not found: ${panelName}`);
        return null;
    }
    
    const common = UI_CONFIG.PANELS.COMMON;
    
    return {
        width: getScaledValue(config.WIDTH, screenWidth),
        height: getScaledValue(config.HEIGHT, screenHeight, 'height'),
        xOffset: config.X_OFFSET === 0 ? 0 : getScaledValue(config.X_OFFSET, screenWidth),
        yOffset: config.Y_OFFSET === 0 ? 0 : getScaledValue(config.Y_OFFSET, screenHeight, 'height'),
        backgroundColor: config.BACKGROUND_COLOR,
        backgroundAlpha: config.BACKGROUND_ALPHA,
        borderWidth: config.BORDER_WIDTH,
        borderColor: config.BORDER_COLOR,
        borderAlpha: config.BORDER_ALPHA,
        padding: getScaledValue(config.PADDING, screenWidth),
        titleFontSize: getScaledValue(config.TITLE_FONT_SIZE, screenWidth, 'font'),
        // Common settings
        fadeInDuration: common.FADE_IN_DURATION,
        fadeOutDuration: common.FADE_OUT_DURATION,
        cornerRadius: common.CORNER_RADIUS,
        shadowOffsetX: common.SHADOW_OFFSET_X,
        shadowOffsetY: common.SHADOW_OFFSET_Y,
        shadowAlpha: common.SHADOW_ALPHA,
        shadowBlur: common.SHADOW_BLUR
    };
}

/**
 * Check if UI element should be visible
 * @param {string} elementName - Element name from UI_CONFIG.VISIBILITY
 * @returns {boolean} True if visible
 */
export function isElementVisible(elementName) {
    return UI_CONFIG.VISIBILITY[elementName] !== false;
}

/**
 * Get depth value for UI layer
 * @param {string} layerName - Layer name from UI_CONFIG.DEPTH
 * @returns {number} Depth value
 */
export function getUIDepth(layerName) {
    return UI_CONFIG.DEPTH[layerName] || UI_CONFIG.DEPTH.UI_BACKGROUND;
}

/**
 * Get animation duration (respects reduced motion)
 * @param {string} animationType - Animation type ('HOVER', 'FADE', etc.)
 * @param {number} defaultDuration - Default duration in ms
 * @returns {number} Adjusted duration
 */
export function getAnimationDuration(animationType, defaultDuration) {
    if (UI_CONFIG.ACCESSIBILITY.REDUCED_MOTION) {
        return 0; // Disable animations
    }
    
    // Check for specific animation config
    const animConfig = UI_CONFIG.ANIMATIONS[animationType];
    if (animConfig) {
        return animConfig;
    }
    
    return defaultDuration;
}

/**
 * Get font size with accessibility scaling
 * @param {number} baseSize - Base font size
 * @returns {number} Scaled font size
 */
export function getAccessibleFontSize(baseSize) {
    return Math.round(baseSize * UI_CONFIG.ACCESSIBILITY.FONT_SCALE);
}

/**
 * Get color with accessibility adjustments
 * @param {number} baseColor - Base color value
 * @param {string} elementType - Element type for context
 * @returns {number} Adjusted color
 */
export function getAccessibleColor(baseColor, elementType) {
    if (!UI_CONFIG.ACCESSIBILITY.HIGH_CONTRAST) {
        return baseColor;
    }
    
    // Increase contrast for high contrast mode
    // Simple implementation - could be more sophisticated
    const multiplier = UI_CONFIG.ACCESSIBILITY.HIGH_CONTRAST_MULTIPLIER;
    
    // Extract RGB components
    const r = (baseColor >> 16) & 0xFF;
    const g = (baseColor >> 8) & 0xFF;
    const b = baseColor & 0xFF;
    
    // Adjust towards extremes (darker or lighter)
    const avg = (r + g + b) / 3;
    const isLight = avg > 128;
    
    const adjust = (component) => {
        if (isLight) {
            return Math.min(255, component * multiplier);
        } else {
            return Math.max(0, component / multiplier);
        }
    };
    
    const newR = Math.round(adjust(r));
    const newG = Math.round(adjust(g));
    const newB = Math.round(adjust(b));
    
    return (newR << 16) | (newG << 8) | newB;
}


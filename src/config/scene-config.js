/**
 * Scene Configuration Constants
 * Centralized configuration for all scene-related values to replace hardcoded numbers
 */

export const SCENE_CONFIG = {
    // Viewport and sizing
    VIEWPORT: {
        DEFAULT_WIDTH: 1920,
        DEFAULT_HEIGHT: 1080,
        MIN_WIDTH: 1280,
        MIN_HEIGHT: 720,
        MAX_WIDTH: 3840,
        MAX_HEIGHT: 2160
    },

    // Font sizes (desktop-optimized) - Scaled for 1920x1080
    FONT_SIZES: {
        TITLE_LARGE: 101,      // Scaled from 72 (72 * 1.406)
        TITLE_MEDIUM: 73,      // Scaled from 52 (52 * 1.406)
        TITLE_SMALL: 51,       // Scaled from 36 (36 * 1.406)
        SUBTITLE: 39,          // Scaled from 28 (28 * 1.406)
        BODY_LARGE: 34,        // Scaled from 24 (24 * 1.406)
        BODY_MEDIUM: 25,       // Scaled from 18 (18 * 1.406)
        BODY_SMALL: 20,        // Scaled from 14 (14 * 1.406)
        CAPTION: 17,           // Scaled from 12 (12 * 1.406)
        TALENT_MIN: 14,        // Scaled from 10 (10 * 1.406)
        TALENT_MAX: 17,        // Scaled from 12 (12 * 1.406)
        BUTTON_MEDIUM: 23      // Scaled from 16 (16 * 1.406)
    },

    // UI spacing and positioning
    SPACING: {
        TITLE_MARGIN_TOP: 50,
        SUBTITLE_MARGIN_TOP: 65,
        CONTENT_MARGIN_TOP: 100,
        BUTTON_MARGIN_BOTTOM: 80,
        BUTTON_SPACING: 50,
        PANEL_PADDING: 20,
        ELEMENT_SPACING: 30,
        INSTRUCTIONS_Y_MIN: 30,
        INSTRUCTIONS_Y_MAX: 80,
        INSTRUCTIONS_Y_SCALE: 0.07,
        PANEL_HEIGHT_REDUCTION: 250,
        FONT_SIZE_DIVISOR: 64
    },

    // Colors (WoW WOTLK theme)
    COLORS: {
        BACKGROUND_DARK: 0x1a1a2e,
        BACKGROUND_DARKER: 0x0f0f1f,
        TEXT_PRIMARY: 0xffffff,
        TEXT_SECONDARY: 0xe0e0e0,
        TEXT_ACCENT: 0x00ff00,
        BORDER_GOLD: 0xc9aa71,
        BORDER_BRONZE: 0x8b6914,
        BUTTON_NORMAL: 0x336633,
        BUTTON_HOVER: 0x44aa44,
        BUTTON_DISABLED: 0x666666,
        PANEL_INSTRUCTIONS: 0x0a0a0a,
        PANEL_TALENT_BG: 0x000000,
        PANEL_TALENT_BORDER: 0x0066ff,
        COMBAT_INDICATOR_BG: 0x8B0000,
        COMBAT_INDICATOR_BORDER: 0xFF0000
    },

    // Panel dimensions
    PANELS: {
        PARTY_FRAME_WIDTH: 160,
        PARTY_FRAME_HEIGHT: 350,
        EQUIPMENT_PANEL_WIDTH: 400,
        EQUIPMENT_PANEL_HEIGHT: 500,
        SHOP_PANEL_WIDTH: 600,
        SHOP_PANEL_HEIGHT: 400,
        TALENT_PANEL_WIDTH: 800,
        TALENT_PANEL_HEIGHT: 600,
        INSTRUCTIONS_WIDTH_SCALE: 0.6,
        INSTRUCTIONS_HEIGHT: 26,
        TALENT_PANEL_MAX_HEIGHT: 400
    },

    // Button dimensions
    BUTTONS: {
        DEFAULT_WIDTH: 200,
        DEFAULT_HEIGHT: 50,
        SMALL_WIDTH: 120,
        SMALL_HEIGHT: 40,
        ICON_SIZE: 32
    },

    // Animation timings (in milliseconds)
    TIMINGS: {
        FADE_IN: 300,
        FADE_OUT: 200,
        TRANSITION_DELAY: 100,
        NOTIFICATION_DURATION: 3000,
        TOOLTIP_DELAY: 500
    },

    // Alpha/transparency values
    ALPHA: {
        PANEL_BACKGROUND: 0.95,
        HUD_BACKGROUND: 0.9,
        INSTRUCTIONS_BACKGROUND: 0.7,
        BUTTON_BACKGROUND: 0.8,
        OVERLAY_BACKGROUND: 0.85,
        BORDER_BACKGROUND: 0.9,
        NOTIFICATION_BACKGROUND: 0.9,
        TOOLTIP_BACKGROUND: 0.95,
        COMBAT_INDICATOR: 0.8,
        MINIMAP_BACKGROUND: 0.95,
        SCROLLBAR_BACKGROUND: 0.8
    },

    // Performance settings
    PERFORMANCE: {
        MAX_UI_ELEMENTS: 100,
        CLEANUP_INTERVAL: 5000,
        EVENT_THROTTLE_MS: 16,
        MAX_TEXTURES_PER_FRAME: 5
    },

    // Input settings
    INPUT: {
        DOUBLE_CLICK_THRESHOLD: 300,
        DRAG_THRESHOLD: 5,
        SCROLL_SPEED: 20
    },

    // HUD positioning
    HUD: {
        GOLD_X: 10,
        GOLD_Y: 10,
        INVENTORY_X: 10,
        INVENTORY_Y: 40,
        PARTY_LEVEL_X: 10,
        PARTY_LEVEL_Y: 100,
        PARTY_LEVEL_SPACING: 20
    },

    // Action bar settings
    ACTION_BAR: {
        X: 512,
        Y: 700,
        WIDTH: 600,
        HEIGHT: 60,
        BUTTON_WIDTH: 100,
        BUTTON_HEIGHT: 40,
        BUTTON_SPACING: 120
    },

    // Minimap settings
    MINIMAP: {
        X: 900,
        Y: 10,
        SIZE: 120
    },

    // Notifications
    NOTIFICATIONS: {
        Y_OFFSET: 100
    }
};

/**
 * Get desktop-optimized font size based on viewport
 * @param {number} baseSize - Base font size
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 * @returns {number} Desktop-optimized font size
 */
export function getResponsiveFontSize(baseSize, width = SCENE_CONFIG.VIEWPORT.DEFAULT_WIDTH, height = SCENE_CONFIG.VIEWPORT.DEFAULT_HEIGHT) {
    // Base resolution is now 1920x1080
    const scaleFactor = Math.min(width / SCENE_CONFIG.VIEWPORT.DEFAULT_WIDTH, height / SCENE_CONFIG.VIEWPORT.DEFAULT_HEIGHT);
    return Math.max(baseSize * scaleFactor, baseSize * 0.5);
}

/**
 * Get responsive spacing based on viewport
 * @param {number} baseSpacing - Base spacing value
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 * @returns {number} Responsive spacing
 */
export function getResponsiveSpacing(baseSpacing, width = SCENE_CONFIG.VIEWPORT.DEFAULT_WIDTH, height = SCENE_CONFIG.VIEWPORT.DEFAULT_HEIGHT) {
    // Base resolution is now 1920x1080
    const scaleFactor = Math.min(width / SCENE_CONFIG.VIEWPORT.DEFAULT_WIDTH, height / SCENE_CONFIG.VIEWPORT.DEFAULT_HEIGHT);
    return Math.max(baseSpacing * scaleFactor, baseSpacing * 0.5);
}

/**
 * Validate scene configuration values
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if valid
 */
export function validateSceneConfig(config) {
    if (!config || typeof config !== 'object') {
        console.error('Invalid scene configuration: must be an object');
        return false;
    }

    // Validate viewport dimensions
    if (config.width && (config.width < SCENE_CONFIG.VIEWPORT.MIN_WIDTH || config.width > SCENE_CONFIG.VIEWPORT.MAX_WIDTH)) {
        console.warn(`Viewport width ${config.width} outside recommended range`);
    }

    if (config.height && (config.height < SCENE_CONFIG.VIEWPORT.MIN_HEIGHT || config.height > SCENE_CONFIG.VIEWPORT.MAX_HEIGHT)) {
        console.warn(`Viewport height ${config.height} outside recommended range`);
    }

    return true;
}

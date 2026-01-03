/**
 * UI Configuration - Comprehensive UI Redesign
 * Optimized for visual balance, information hierarchy, and WoW WOTLK aesthetic
 * Base resolution: 1920x1080 (Full HD)
 *
 * Design Principles:
 * - Native 1920x1080 design (not scaled from smaller resolution)
 * - More compact party frames for better screen usage
 * - Better visual hierarchy with size/proportion relationships
 * - Consistent spacing and alignment optimized for Full HD
 * - Improved information density without clutter
 * - Enhanced readability at 1920x1080 resolution
 * - All values designed specifically for 1920x1080 and scale down/up as needed
 */

export const UI_CONFIG = {
    // ============================================================================
    // PARTY FRAMES (Left Side) - Optimized for 5-member party
    // ============================================================================
    PARTY_FRAMES: {
        // Frame dimensions (balanced for visibility and space efficiency) - Scaled for 1920x1080
        FRAME_WIDTH: 413,                  // Scaled from 220 (220 * 1.875)
        FRAME_HEIGHT: 90,                 // Scaled from 64 (64 * 1.406)
        FRAME_SPACING: 7,                 // Scaled from 5 (5 * 1.406)
        
        // Positioning (from left edge, top) - Scaled for 1920x1080
        LEFT_MARGIN: 30,                  // Scaled from 16 (16 * 1.875)
        START_Y: 141,                     // Scaled from 100 (100 * 1.406)
        
        // Portrait settings (prominent as shown in reference) - Scaled for 1920x1080
        PORTRAIT_SIZE: 73,                // Scaled from 52 (52 * 1.406)
        PORTRAIT_X_OFFSET: 56,            // Scaled from 30 (30 * 1.875)
        PORTRAIT_Y_OFFSET: 0,             // Vertically centered
        
        // Portrait border (enhanced depth - matching reference)
        PORTRAIT_BORDER_OUTER_WIDTH: 3,   // Prominent outer glow
        PORTRAIT_BORDER_OUTER_ALPHA: 0.85,
        PORTRAIT_BORDER_MAIN_WIDTH: 2,    // Clear main border
        PORTRAIT_BORDER_MAIN_ALPHA: 1.0,
        PORTRAIT_BORDER_INNER_WIDTH: 1,   // Subtle inner shadow
        PORTRAIT_BORDER_INNER_ALPHA: 0.6,
        PORTRAIT_BORDER_GLOW_OFFSET: 2,   // Visible glow effect
        
        // Portrait shadow (enhanced depth)
        PORTRAIT_SHADOW_OFFSET_X: 1,
        PORTRAIT_SHADOW_OFFSET_Y: 1,
        PORTRAIT_SHADOW_ALPHA: 0.4,
        
        // Text positioning (optimized for 1920x1080 layout)
        NAME_X_OFFSET: 130,                 // Native 1920x1080 offset - right of portrait
        NAME_Y_OFFSET: 12,                  // Native 1920x1080 offset - top of frame
        LEVEL_X_OFFSET: -18,                // Native 1920x1080 offset - right edge of frame
        LEVEL_Y_OFFSET: 12,                 // Native 1920x1080 offset - aligned with name
        
        // Text styling (bold and readable at 1920x1080)
        NAME_FONT_SIZE: 19,                 // Native 1920x1080 size - clear and readable
        NAME_STROKE_WIDTH: 4,               // Native 1920x1080 stroke - good contrast
        NAME_SHADOW_OFFSET_X: 3,            // Native 1920x1080 shadow - subtle depth
        NAME_SHADOW_OFFSET_Y: 3,            // Native 1920x1080 shadow
        NAME_SHADOW_BLUR: 3,                // Native 1920x1080 blur
        LEVEL_FONT_SIZE: 18,                // Native 1920x1080 size - slightly smaller than name
        LEVEL_STROKE_WIDTH: 3,              // Native 1920x1080 stroke
        LEVEL_SHADOW_OFFSET_X: 1,           // Native 1920x1080 shadow
        LEVEL_SHADOW_OFFSET_Y: 1,           // Native 1920x1080 shadow
        LEVEL_SHADOW_BLUR: 1,               // Native 1920x1080 blur
        
        // Bar positioning (optimized proportions for 1920x1080)
        BAR_START_X_OFFSET: 130,            // Native 1920x1080 offset - aligned with text
        BAR_WIDTH: 250,                     // Native 1920x1080 width - comfortable for numbers
        HEALTH_BAR_Y_OFFSET: 40,            // Native 1920x1080 offset - below name
        HEALTH_BAR_HEIGHT: 24,              // Native 1920x1080 height - clear and visible
        MANA_BAR_Y_OFFSET: 66,              // Native 1920x1080 offset - below health
        MANA_BAR_HEIGHT: 21,                // Native 1920x1080 height - slightly smaller than health
        XP_BAR_Y_OFFSET: 89,                // Native 1920x1080 offset - bottom of frame
        XP_BAR_HEIGHT: 4,                   // Native 1920x1080 height - thin progress indicator
        BAR_BORDER_WIDTH: 1,                // Subtle border
        
        // Health/Mana text overlays (centered on bars at 1920x1080)
        HEALTH_TEXT_Y_OFFSET: 40,           // Native 1920x1080 offset - centered on health bar
        HEALTH_TEXT_FONT_SIZE: 14,          // Native 1920x1080 size - readable on bar
        HEALTH_TEXT_STROKE_WIDTH: 1,        // Subtle stroke
        HEALTH_TEXT_SHADOW_OFFSET_X: 1,     // Subtle shadow
        HEALTH_TEXT_SHADOW_OFFSET_Y: 1,     // Subtle shadow
        HEALTH_TEXT_SHADOW_BLUR: 1,         // Subtle blur
        MANA_TEXT_Y_OFFSET: 66,             // Native 1920x1080 offset - centered on mana bar
        MANA_TEXT_FONT_SIZE: 14,            // Native 1920x1080 size - readable on bar
        MANA_TEXT_STROKE_WIDTH: 1,          // Subtle stroke
        MANA_TEXT_SHADOW_OFFSET_X: 1,       // Subtle shadow
        MANA_TEXT_SHADOW_OFFSET_Y: 1,       // Subtle shadow
        MANA_TEXT_SHADOW_BLUR: 1,           // Subtle blur
        
        // Role indicators - visual distinction for tank/healer/DPS
        ROLE_INDICATOR_ENABLED: true,
        ROLE_INDICATOR_X_OFFSET: 20,         // Native 1920x1080 offset - left of portrait
        ROLE_INDICATOR_Y_OFFSET: -30,        // Native 1920x1080 offset - above portrait
        ROLE_INDICATOR_SIZE: 24,             // Native 1920x1080 size - clear visibility
        ROLE_INDICATOR_BG_SIZE: 28,          // Native 1920x1080 size - background circle
        ROLE_INDICATOR_BG_ALPHA: 0.8,
        ROLE_INDICATOR_BORDER_WIDTH: 2,
        ROLE_ICONS: {
            TANK: '🛡️',
            HEALER: '✨',
            DPS: '⚔️'
        },
        ROLE_COLORS: {
            TANK: 0x3aa7ff,      // Blue
            HEALER: 0x4cd964,    // Green
            DPS: 0xff9f43        // Orange
        },
        
        // Status effects (buffs/debuffs) - optimized for 1920x1080
        STATUS_CONTAINER_X_OFFSET: -36,      // Native 1920x1080 offset - left of portrait
        STATUS_CONTAINER_Y_OFFSET: 12,      // Native 1920x1080 offset - aligned with name
        STATUS_ICON_SIZE: 18,               // Native 1920x1080 size - clear icon visibility
        STATUS_ICON_SPACING: 22,            // Native 1920x1080 spacing - comfortable gap
        STATUS_DURATION_FONT_SIZE: 11,      // Native 1920x1080 size - readable duration text
        
        // Frame styling (matching reference appearance)
        FRAME_BACKGROUND_COLOR: 0x1a1f2e,  // Dark blue-gray
        FRAME_BACKGROUND_ALPHA: 0.96,
        FRAME_BORDER_WIDTH: 2,            // Visible but not overwhelming
        FRAME_GLOW_WIDTH: 2,              // Subtle glow
        FRAME_GLOW_ALPHA: 0.3,
        FRAME_GLOW_OFFSET: 1,
        
        // Hover effects (smooth interactions)
        HOVER_GLOW_ALPHA_MIN: 0.35,
        HOVER_GLOW_ALPHA_MAX: 0.75,
        HOVER_SCALE_MIN: 1.0,
        HOVER_SCALE_MAX: 1.03,            // Subtle scale increase
        HOVER_ANIMATION_DURATION: 200,
        
        // Critical health pulse (attention-grabbing)
        CRITICAL_HEALTH_THRESHOLD: 0.25,   // 25% health
        PULSE_ALPHA_MIN: 0.4,
        PULSE_ALPHA_MAX: 0.95,
        PULSE_DURATION: 600
    },
    
    // ============================================================================
    // PLAYER FRAME (Bottom Left) - Larger and more prominent
    // ============================================================================
    PLAYER_FRAME: {
        // Frame dimensions (larger than party frames - optimized for 1920x1080)
        FRAME_WIDTH: 420,                   // Native 1920x1080 width - matches party frame width
        FRAME_HEIGHT: 120,                  // Native 1920x1080 height - larger for player prominence
        
        // Positioning (optimized for 1920x1080)
        LEFT_MARGIN: 32,                    // Native 1920x1080 margin - matches party frames
        BOTTOM_MARGIN: 200,                 // Native 1920x1080 margin - above action bar
        
        // Portrait settings (larger for player at 1920x1080)
        PORTRAIT_SIZE: 95,                  // Native 1920x1080 size - prominent player portrait
        PORTRAIT_X_OFFSET: 75,             // Scaled from 40 (40 * 1.875)
        PORTRAIT_Y_OFFSET: 0,
        
        // Portrait border (enhanced for player frame)
        PORTRAIT_BORDER_OUTER_WIDTH: 5,
        PORTRAIT_BORDER_OUTER_ALPHA: 0.8,
        PORTRAIT_BORDER_MAIN_WIDTH: 4,
        PORTRAIT_BORDER_MAIN_ALPHA: 1.0,
        PORTRAIT_BORDER_INNER_WIDTH: 2,
        PORTRAIT_BORDER_INNER_ALPHA: 0.7,
        PORTRAIT_BORDER_GLOW_OFFSET: 3,
        
        // Portrait shadow
        PORTRAIT_SHADOW_OFFSET_X: 3,
        PORTRAIT_SHADOW_OFFSET_Y: 3,
        PORTRAIT_SHADOW_ALPHA: 0.6,
        
        // Text positioning (optimized for 1920x1080)
        NAME_X_OFFSET: 195,                 // Native 1920x1080 offset - right of portrait
        NAME_Y_OFFSET: 22,                  // Native 1920x1080 offset - top of frame
        LEVEL_X_OFFSET: -20,                // Native 1920x1080 offset - right edge
        LEVEL_Y_OFFSET: 22,                 // Native 1920x1080 offset - aligned with name
        
        // Text styling (larger for player at 1920x1080)
        NAME_FONT_SIZE: 26,                 // Native 1920x1080 size - prominent player name
        NAME_STROKE_WIDTH: 6,                // Native 1920x1080 stroke - strong contrast
        NAME_SHADOW_OFFSET_X: 3,             // Native 1920x1080 shadow
        NAME_SHADOW_OFFSET_Y: 3,             // Native 1920x1080 shadow
        NAME_SHADOW_BLUR: 4,                 // Native 1920x1080 blur
        LEVEL_FONT_SIZE: 21,                 // Native 1920x1080 size - clear level display
        LEVEL_STROKE_WIDTH: 3,               // Native 1920x1080 stroke
        LEVEL_SHADOW_OFFSET_X: 1,
        LEVEL_SHADOW_OFFSET_Y: 1,
        LEVEL_SHADOW_BLUR: 1,
        
        // Bar positioning (optimized for 1920x1080)
        BAR_START_X_OFFSET: 195,            // Native 1920x1080 offset - aligned with text
        BAR_WIDTH: 270,                     // Native 1920x1080 width - wider for player
        HEALTH_BAR_Y_OFFSET: 28,             // Native 1920x1080 offset - below name
        HEALTH_BAR_HEIGHT: 26,               // Native 1920x1080 height - prominent health bar
        MANA_BAR_Y_OFFSET: 62,               // Native 1920x1080 offset - below health
        MANA_BAR_HEIGHT: 22,                 // Native 1920x1080 height - clear mana bar
        BAR_BORDER_WIDTH: 3,                 // Native 1920x1080 width - clear bar borders
        
        // Frame styling (optimized for 1920x1080)
        FRAME_BACKGROUND_COLOR: 0x1a1f2e,
        FRAME_BACKGROUND_ALPHA: 0.98,
        FRAME_BORDER_WIDTH: 4,               // Native 1920x1080 width - thicker for prominence
        FRAME_GLOW_WIDTH: 3,
        FRAME_GLOW_ALPHA: 0.45,
        FRAME_GLOW_OFFSET: 3
    },
    
    // ============================================================================
    // HUD BAR (Top of Screen) - Information display
    // ============================================================================
    HUD: {
        // Dimensions (optimized for 1920x1080)
        HEIGHT: 58,                         // Native 1920x1080 height - matches HUD_BAR
        HORIZONTAL_MARGIN: 24,              // Native 1920x1080 margin - comfortable edge spacing
        
        // Positioning (optimized for 1920x1080)
        Y_OFFSET: 12,                       // Native 1920x1080 offset - slight top margin
        
        // Shadow (enhanced depth at 1920x1080)
        SHADOW_OFFSET_X: 6,                  // Native 1920x1080 offset - subtle depth
        SHADOW_OFFSET_Y: 5,                  // Native 1920x1080 offset
        SHADOW_ALPHA: 0.6,
        SHADOW_BLUR: 8,                      // Native 1920x1080 blur - soft shadow
        
        // Background
        BACKGROUND_COLOR: 0x1a1a2e,
        BACKGROUND_ALPHA: 0.98,
        
        // Borders (prominent gold borders at 1920x1080)
        BORDER_WIDTH: 4,                   // Native 1920x1080 width - clear and visible
        BORDER_COLOR: 0xc9aa71,            // WoW gold
        BORDER_ALPHA: 1.0,
        
        // Highlights (subtle shine effect at 1920x1080)
        TOP_HIGHLIGHT_HEIGHT: 4,           // Native 1920x1080 height - subtle top glow
        TOP_HIGHLIGHT_ALPHA: 0.2,
        INNER_HIGHLIGHT_WIDTH: 3,          // Native 1920x1080 width - inner shine
        INNER_HIGHLIGHT_ALPHA: 0.45,
        INNER_HIGHLIGHT_OFFSET: 4,          // Native 1920x1080 offset - proper inset
        
        // Text positioning (optimized layout for 1920x1080)
        GOLD_X_OFFSET: 48,                  // Native 1920x1080 offset - left side of HUD
        GOLD_Y_OFFSET: 0,                   // Centered vertically
        ITEM_COUNT_X_OFFSET: 48,            // Native 1920x1080 offset - below gold
        ITEM_COUNT_Y_OFFSET: 20,            // Native 1920x1080 offset - below gold
        MILE_X_OFFSET: 0,                   // Center (0 = centered)
        MILE_Y_OFFSET: 0,
        MANA_X_OFFSET: -48,                 // Native 1920x1080 offset - right side of HUD
        MANA_Y_OFFSET: 0,
        PARTY_OVERVIEW_X_OFFSET: -200,      // Native 1920x1080 offset - left of minimap
        PARTY_OVERVIEW_Y_OFFSET: 0          // Centered vertically
    },
    
    // ============================================================================
    // ACTION BAR (Bottom Center) - Ability buttons
    // ============================================================================
    ACTION_BAR: {
        // Button settings (optimized for 1920x1080)
        BUTTON_SIZE: 68,                    // Native 1920x1080 size - comfortable click target
        BUTTON_SPACING: 14,                  // Native 1920x1080 spacing - clear separation
        BUTTON_COUNT: 6,
        ROWS: 1,
        
        // Bar dimensions (optimized for 1920x1080)
        BAR_PADDING_X: 32,                  // Native 1920x1080 padding - comfortable edge spacing
        BAR_PADDING_Y: 18,                  // Native 1920x1080 padding - vertical breathing room
        
        // Positioning (optimized for 1920x1080)
        BOTTOM_MARGIN: 28,                  // Native 1920x1080 margin - above screen edge
        CENTER_X: true,
        
        // Shadow (optimized for 1920x1080 depth)
        SHADOW_OFFSET_X: 6,                  // Native 1920x1080 offset - subtle depth
        SHADOW_OFFSET_Y: 5,                  // Native 1920x1080 offset
        SHADOW_ALPHA: 0.5,
        SHADOW_BLUR: 8,                      // Native 1920x1080 blur - soft shadow
        
        // Background
        BACKGROUND_COLOR: 0x1a1a2e,
        BACKGROUND_ALPHA: 0.96,
        
        // Borders (optimized for 1920x1080)
        BORDER_WIDTH: 6,                    // Native 1920x1080 width - prominent gold border
        BORDER_COLOR: 0xc9aa71,
        BORDER_ALPHA: 1.0,
        INNER_BORDER_WIDTH: 3,              // Native 1920x1080 width - inner detail
        INNER_BORDER_ALPHA: 0.65,
        INNER_BORDER_OFFSET: 6,              // Native 1920x1080 offset - proper inset
        
        // Highlights (optimized for 1920x1080)
        TOP_HIGHLIGHT_WIDTH: 3,              // Native 1920x1080 width - subtle shine
        TOP_HIGHLIGHT_ALPHA: 0.25,
        TOP_HIGHLIGHT_OFFSET: 6              // Native 1920x1080 offset
    },
    
    // ============================================================================
    // COMBAT LOG (Bottom Center, Above Action Bar)
    // ============================================================================
    COMBAT_LOG: {
        // Dimensions (optimized for 1920x1080 readability)
        WIDTH: 800,                         // Native 1920x1080 width - comfortable reading width
        HEIGHT: 230,                        // Native 1920x1080 height - good line count
        
        // Positioning (optimized for 1920x1080)
        CENTER_X: true,
        BOTTOM_MARGIN: 120,                 // Native 1920x1080 margin - above action bar
        
        // Title bar (optimized for 1920x1080)
        TITLE_BAR_HEIGHT: 32,                // Native 1920x1080 height - clear header
        TITLE_TEXT_Y_OFFSET: 21,            // Native 1920x1080 offset - centered in title bar
        TITLE_TEXT_FONT_SIZE: 18,            // Native 1920x1080 size - clear title text
        TITLE_TEXT_STROKE_WIDTH: 3,         // Native 1920x1080 stroke - good contrast
        TITLE_TEXT_SHADOW_OFFSET_X: 1,       // Subtle shadow
        TITLE_TEXT_SHADOW_OFFSET_Y: 1,       // Subtle shadow
        TITLE_TEXT_SHADOW_BLUR: 1,           // Subtle blur
        TITLE_BAR_BORDER_WIDTH: 3,           // Native 1920x1080 width - clear border
        TITLE_BAR_BORDER_ALPHA: 1.0,
        TITLE_BAR_BACKGROUND_COLOR: 0x1a1a2e,
        TITLE_BAR_BACKGROUND_ALPHA: 0.98,
        
        // Content area (optimized for 1920x1080)
        CONTENT_PADDING_X: 24,               // Native 1920x1080 padding - comfortable margins
        CONTENT_PADDING_Y: 44,               // Native 1920x1080 padding - below title bar
        CONTENT_FONT_SIZE: 18,               // Native 1920x1080 size - readable log text
        CONTENT_LINE_SPACING: 8,             // Native 1920x1080 spacing - clear line separation
        CONTENT_STROKE_WIDTH: 1,
        CONTENT_SHADOW_OFFSET_X: 1,
        CONTENT_SHADOW_OFFSET_Y: 1,
        CONTENT_SHADOW_BLUR: 1,
        CONTENT_TEXT_COLOR: '#cccccc',
        
        // Scrollbar (optimized for 1920x1080)
        SCROLLBAR_WIDTH: 12,                 // Native 1920x1080 width - easy to grab
        SCROLLBAR_X_OFFSET: -20,             // Native 1920x1080 offset - right edge inset
        SCROLLBAR_ALPHA: 0.85,
        SCROLLBAR_BORDER_WIDTH: 1,
        SCROLLBAR_BORDER_ALPHA: 0.7,
        SCROLLBAR_VERTICAL_PADDING: 40,      // Native 1920x1080 padding - top/bottom spacing
        
        // Frame styling (optimized for 1920x1080)
        FRAME_BACKGROUND_COLOR: 0x0a0a0a,
        FRAME_BACKGROUND_ALPHA: 0.96,
        FRAME_BORDER_WIDTH: 6,               // Native 1920x1080 width - prominent gold border
        FRAME_BORDER_COLOR: 0xc9aa71,
        FRAME_BORDER_ALPHA: 1.0
    },
    
    // ============================================================================
    // MINIMAP (Top Right) - World overview
    // ============================================================================
    MINIMAP: {
        // Dimensions (optimized for 1920x1080)
        SIZE: 160,                          // Native 1920x1080 size - clear map visibility
        
        // Positioning (optimized for 1920x1080)
        TOP_MARGIN: 80,                     // Native 1920x1080 margin - below HUD bar
        RIGHT_MARGIN: 36,                   // Native 1920x1080 margin - comfortable edge spacing
        
        // Shadow (optimized for 1920x1080 depth)
        SHADOW_OFFSET_X: 6,                  // Native 1920x1080 offset - subtle depth
        SHADOW_OFFSET_Y: 5,                  // Native 1920x1080 offset
        SHADOW_ALPHA: 0.65,
        SHADOW_BLUR: 7,                      // Native 1920x1080 blur - soft shadow
        
        // Background
        BACKGROUND_COLOR: 0x0a0a0a,
        BACKGROUND_ALPHA: 0.96,
        
        // Borders (prominent bronze border at 1920x1080)
        OUTER_BORDER_WIDTH: 4,               // Native 1920x1080 width - clear border
        OUTER_BORDER_COLOR: 0x8b6914,        // WoW bronze
        OUTER_BORDER_ALPHA: 1.0,
        INNER_BORDER_WIDTH: 3,               // Native 1920x1080 width - inner detail
        INNER_BORDER_ALPHA: 0.6,
        INNER_BORDER_OFFSET: 4,              // Native 1920x1080 offset - proper inset
        
        // Highlights (optimized for 1920x1080)
        INNER_HIGHLIGHT_WIDTH: 3,            // Native 1920x1080 width - subtle shine
        INNER_HIGHLIGHT_ALPHA: 0.25,
        INNER_HIGHLIGHT_OFFSET: 6,           // Native 1920x1080 offset - proper inset
        
        // Label (optimized for 1920x1080)
        LABEL_Y_OFFSET: -12,                 // Native 1920x1080 offset - above minimap
        LABEL_FONT_SIZE: 19,                 // Native 1920x1080 size - clear label text
        LABEL_STROKE_WIDTH: 1,
        LABEL_SHADOW_OFFSET_X: 1,
        LABEL_SHADOW_OFFSET_Y: 1,
        LABEL_SHADOW_BLUR: 1
    },
    
    // ============================================================================
    // TARGET FRAME (Top Center/Left) - Enemy/ally target
    // ============================================================================
    TARGET_FRAME: {
        // Frame dimensions (optimized for 1920x1080)
        FRAME_WIDTH: 380,                    // Native 1920x1080 width - comfortable target info
        FRAME_HEIGHT: 95,                    // Native 1920x1080 height - matches party frame style
        
        // Positioning (optimized for 1920x1080)
        TOP_MARGIN: 75,                     // Native 1920x1080 margin - below HUD bar
        CENTER_X: true,
        
        // Frame styling (optimized for 1920x1080)
        FRAME_BACKGROUND_COLOR: 0x1a1f2e,
        FRAME_BACKGROUND_ALPHA: 0.95,
        FRAME_BORDER_WIDTH: 4,               // Native 1920x1080 width - prominent border
        FRAME_BORDER_COLOR: 0xff0000,        // Red for enemy
        FRAME_BORDER_ALPHA: 1.0
    },
    
    // ============================================================================
    // ANIMATION TIMINGS (Milliseconds)
    // ============================================================================
    ANIMATIONS: {
        BAR_UPDATE_DURATION: 250,           // Smooth bar updates
        BAR_UPDATE_EASE: 'Power2',
        HOVER_GLOW_DURATION: 200,
        HOVER_SCALE_DURATION: 200,
        HOVER_EASE: 'Quad.easeOut',
        CLICK_FEEDBACK_DURATION: 100,
        CLICK_FEEDBACK_SCALE: 0.97,
        PORTRAIT_GENERATION_DELAY: 50,
        PORTRAIT_CHECK_INTERVAL: 100
    },
    
    // ============================================================================
    // COLOR THRESHOLDS (For dynamic color changes)
    // ============================================================================
    COLOR_THRESHOLDS: {
        HEALTH_SAFE: 0.6,                   // Above 60% = white text
        HEALTH_WARN: 0.3,                   // 30-60% = orange text
        HEALTH_DANGER: 0.0,                 // Below 30% = red text
        CRITICAL_HEALTH: 0.25                // Below 25% = pulse effect
    },
    
    // ============================================================================
    // RESPONSIVE SCALING
    // ============================================================================
    SCALING: {
        // Base resolution (1920x1080 - Full HD windowed fullscreen)
        BASE_WIDTH: 1920,
        BASE_HEIGHT: 1080,
        
        // Scale factors
        SCALE_FACTOR_X: 1.0,
        SCALE_FACTOR_Y: 1.0,
        
        // Minimum sizes (prevents UI from becoming too small)
        MIN_FONT_SIZE: 13,      // Scaled from 9 (9 * 1.406)
        MIN_BUTTON_SIZE: 54,   // Scaled from 36 (36 * 1.5)
        MIN_FRAME_HEIGHT: 77,  // Scaled from 55 (55 * 1.406)
        
        // Responsive breakpoints
        BREAKPOINTS: {
            SMALL: { width: 1280, height: 720 },
            MEDIUM: { width: 1600, height: 900 },
            LARGE: { width: 1920, height: 1080 }
        }
    },
    
    // ============================================================================
    // PANELS (Equipment, Inventory, Shop, etc.)
    // ============================================================================
    PANELS: {
        // Equipment Panel
        EQUIPMENT: {
            WIDTH: 450,
            HEIGHT: 550,
            X_OFFSET: 0,
            Y_OFFSET: 0,
            BACKGROUND_COLOR: 0x1a1a2e,
            BACKGROUND_ALPHA: 0.97,
            BORDER_WIDTH: 4,
            BORDER_COLOR: 0xc9aa71,
            BORDER_ALPHA: 1.0,
            PADDING: 24,
            TITLE_FONT_SIZE: 22,
            TITLE_Y_OFFSET: -260,
            CLOSE_BUTTON_SIZE: 32,
            CLOSE_BUTTON_X_OFFSET: 205,
            CLOSE_BUTTON_Y_OFFSET: -260
        },
        
        // Inventory Panel
        INVENTORY: {
            WIDTH: 550,
            HEIGHT: 450,
            X_OFFSET: 0,
            Y_OFFSET: 0,
            BACKGROUND_COLOR: 0x1a1a1a,
            BACKGROUND_ALPHA: 0.97,
            BORDER_WIDTH: 4,
            BORDER_COLOR: 0x4a4a6e,
            BORDER_ALPHA: 1.0,
            PADDING: 24,
            TITLE_FONT_SIZE: 20,
            TITLE_Y_OFFSET: -210,
            SLOT_SIZE: 54,
            SLOT_SPACING: 10,
            LEFT_SLOTS_X: -190,
            RIGHT_SLOTS_X: 190,
            SLOTS_START_Y: -120,
            GRID_COLUMNS: 8,
            GRID_ROWS: 6,
            GRID_START_X: -220,
            GRID_START_Y: 60
        },
        
        // Shop Panel
        SHOP: {
            WIDTH: 650,
            HEIGHT: 450,
            X_OFFSET: 0,
            Y_OFFSET: 0,
            BACKGROUND_COLOR: 0x1a1a2e,
            BACKGROUND_ALPHA: 0.97,
            BORDER_WIDTH: 4,
            BORDER_COLOR: 0xffd700,
            BORDER_ALPHA: 1.0,
            PADDING: 24,
            TITLE_FONT_SIZE: 24,
            TITLE_Y_OFFSET: -210,
            ITEM_SLOT_SIZE: 64,
            ITEM_SLOT_SPACING: 12,
            ITEM_GRID_COLUMNS: 6,
            ITEM_GRID_ROWS: 4,
            ITEM_GRID_START_X: -300,
            ITEM_GRID_START_Y: -100
        },
        
        // Progression Panel
        PROGRESSION: {
            WIDTH: 350,
            HEIGHT: 280,
            X_OFFSET: -337,
            Y_OFFSET: 0,
            BACKGROUND_COLOR: 0x1a1a2e,
            BACKGROUND_ALPHA: 0.97,
            BORDER_WIDTH: 3,
            BORDER_COLOR: 0xffd700,
            BORDER_ALPHA: 1.0,
            PADDING: 18,
            TITLE_FONT_SIZE: 20,
            TITLE_Y_OFFSET: -130
        },
        
        // Talent Panel
        TALENT: {
            WIDTH: 850,
            HEIGHT: 650,
            X_OFFSET: 0,
            Y_OFFSET: 0,
            BACKGROUND_COLOR: 0x0a0a0a,
            BACKGROUND_ALPHA: 0.98,
            BORDER_WIDTH: 4,
            BORDER_COLOR: 0x0066ff,
            BORDER_ALPHA: 1.0,
            PADDING: 28,
            TITLE_FONT_SIZE: 26,
            TITLE_Y_OFFSET: -310,
            TREE_SPACING: 280,
            TALENT_SIZE: 44,
            TALENT_SPACING: 55
        },
        
        // Common panel settings
        COMMON: {
            FADE_IN_DURATION: 300,
            FADE_OUT_DURATION: 200,
            SHADOW_OFFSET_X: 3,
            SHADOW_OFFSET_Y: 3,
            SHADOW_ALPHA: 0.6,
            SHADOW_BLUR: 5,
            CORNER_RADIUS: 12,
            INNER_BORDER_WIDTH: 2,
            INNER_BORDER_ALPHA: 0.35,
            INNER_BORDER_OFFSET: 3
        }
    },
    
    // ============================================================================
    // TOOLTIPS
    // ============================================================================
    TOOLTIPS: {
        // Positioning
        OFFSET_X: 12,
        OFFSET_Y: -12,
        MAX_WIDTH: 320,
        MIN_WIDTH: 220,
        
        // Styling
        BACKGROUND_COLOR: 0x1a1a1a,
        BACKGROUND_ALPHA: 0.97,
        BORDER_WIDTH: 3,
        BORDER_COLOR: 0xffd700,
        BORDER_ALPHA: 1.0,
        PADDING: 12,
        CORNER_RADIUS: 6,
        
        // Text
        TITLE_FONT_SIZE: 15,
        TITLE_COLOR: '#ffd700',
        TITLE_STROKE_WIDTH: 1,
        BODY_FONT_SIZE: 13,
        BODY_COLOR: '#ffffff',
        BODY_STROKE_WIDTH: 1,
        LINE_SPACING: 5,
        
        // Animation
        FADE_IN_DURATION: 200,
        FADE_OUT_DURATION: 150,
        SHOW_DELAY: 500,
        HIDE_DELAY: 100,
        
        // Shadow
        SHADOW_OFFSET_X: 3,
        SHADOW_OFFSET_Y: 3,
        SHADOW_ALPHA: 0.6,
        SHADOW_BLUR: 5
    },
    
    // ============================================================================
    // NOTIFICATIONS & MESSAGES
    // ============================================================================
    NOTIFICATIONS: {
        // Positioning
        DEFAULT_X: 0,
        DEFAULT_Y: -320,
        SPACING: 70,
        
        // Dimensions
        WIDTH: 450,
        HEIGHT: 60,
        
        // Styling
        BACKGROUND_COLOR: 0x1a1a1a,
        BACKGROUND_ALPHA: 0.92,
        BORDER_WIDTH: 3,
        BORDER_COLOR: 0xffd700,
        BORDER_ALPHA: 1.0,
        CORNER_RADIUS: 6,
        PADDING: 12,
        
        // Text
        FONT_SIZE: 15,
        TEXT_COLOR: '#ffffff',
        STROKE_WIDTH: 1,
        
        // Animation
        SLIDE_IN_DURATION: 300,
        FADE_OUT_DURATION: 500,
        DISPLAY_DURATION: 3500,
        SLIDE_DISTANCE: 120,
        
        // Types (color coding)
        TYPES: {
            INFO: { border: 0x0088ff, text: '#00aaff' },
            SUCCESS: { border: 0x00ff00, text: '#00ff88' },
            WARNING: { border: 0xffaa00, text: '#ffcc00' },
            ERROR: { border: 0xff0000, text: '#ff4444' },
            LOOT: { border: 0xffd700, text: '#ffff00' }
        }
    },
    
    // ============================================================================
    // FONTS & TYPOGRAPHY
    // ============================================================================
    FONTS: {
        // Font families
        PRIMARY: 'Arial, sans-serif',
        SECONDARY: 'Verdana, sans-serif',
        MONOSPACE: 'Courier New, monospace',
        
        // Font weights
        WEIGHTS: {
            NORMAL: 'normal',
            BOLD: 'bold',
            LIGHT: '300'
        },
        
        // Font sizes
        SIZES: {
            TINY: 9,
            SMALL: 11,
            BODY: 13,
            MEDIUM: 15,
            LARGE: 18,
            TITLE: 20,
            HEADING: 24,
            DISPLAY: 28
        },
        
        // Line heights
        LINE_HEIGHTS: {
            TIGHT: 1.0,
            NORMAL: 1.2,
            RELAXED: 1.5,
            LOOSE: 2.0
        }
    },
    
    // ============================================================================
    // COLORS & THEMES
    // ============================================================================
    THEMES: {
        // Preset color themes
        PRESETS: {
            WOW_CLASSIC: {
                name: 'WoW Classic',
                gold: 0xc9aa71,
                bronze: 0x8b6914,
                background: 0x1a1a2e,
                text: 0xffffff
            },
            WOW_TBC: {
                name: 'WoW TBC',
                gold: 0xffd700,
                bronze: 0xcd7f32,
                background: 0x0a0a0a,
                text: 0xffffff
            },
            DARK: {
                name: 'Dark',
                gold: 0x888888,
                bronze: 0x666666,
                background: 0x000000,
                text: 0xffffff
            },
            LIGHT: {
                name: 'Light',
                gold: 0x333333,
                bronze: 0x222222,
                background: 0xf0f0f0,
                text: 0x000000
            }
        },
        
        // Current theme
        CURRENT: 'WOW_CLASSIC'
    },
    
    // ============================================================================
    // BORDERS & SHADOWS
    // ============================================================================
    BORDERS: {
        // Border radius
        RADIUS: {
            NONE: 0,
            SMALL: 3,
            MEDIUM: 6,
            LARGE: 12,
            ROUND: 999
        },
        
        // Shadow presets
        SHADOWS: {
            NONE: { offsetX: 0, offsetY: 0, blur: 0, alpha: 0 },
            SMALL: { offsetX: 2, offsetY: 2, blur: 3, alpha: 0.4 },
            MEDIUM: { offsetX: 3, offsetY: 3, blur: 5, alpha: 0.6 },
            LARGE: { offsetX: 4, offsetY: 4, blur: 7, alpha: 0.75 },
            GLOW: { offsetX: 0, offsetY: 0, blur: 10, alpha: 0.85 }
        }
    },
    
    // ============================================================================
    // GRADIENTS
    // ============================================================================
    GRADIENTS: {
        ENABLED: true,
        STEPS: 24,
        
        // Common gradients
        PRESETS: {
            HEALTH_BAR: {
                top: 0x88ff88,
                bottom: 0x00aa00,
                direction: 'vertical'
            },
            MANA_BAR: {
                top: 0x88aaff,
                bottom: 0x0066aa,
                direction: 'vertical'
            },
            FRAME_BACKGROUND: {
                top: 0x2a2a3e,
                bottom: 0x1a1a2e,
                direction: 'vertical'
            }
        }
    },
    
    // ============================================================================
    // Z-INDEX / DEPTH LAYERING
    // ============================================================================
    DEPTH: {
        BACKGROUND: 1000,
        GAME_WORLD: 500,
        UI_BACKGROUND: 1100,
        UI_FRAMES: 1101,
        UI_BARS: 1101,
        UI_TEXT: 1102,
        UI_BUTTONS: 1102,
        UI_TOOLTIPS: 2000,
        UI_PANELS: 2000,
        UI_NOTIFICATIONS: 2100,
        UI_MODALS: 3000,
        UI_DEBUG: 9999
    },
    
    // ============================================================================
    // ACCESSIBILITY
    // ============================================================================
    ACCESSIBILITY: {
        FONT_SCALE: 1.0,
        COLOR_BLIND_MODE: false,
        COLOR_BLIND_PRESETS: {
            PROTANOPIA: 'protanopia',
            DEUTERANOPIA: 'deuteranopia',
            TRITANOPIA: 'tritanopia'
        },
        HIGH_CONTRAST: false,
        HIGH_CONTRAST_MULTIPLIER: 1.5,
        REDUCED_MOTION: false,
        SCREEN_READER: false,
        ARIA_LABELS: true
    },
    
    // ============================================================================
    // PERFORMANCE SETTINGS
    // ============================================================================
    PERFORMANCE: {
        UI_UPDATE_INTERVAL: 100,
        BAR_UPDATE_INTERVAL: 50,
        TEXT_UPDATE_INTERVAL: 200,
        EVENT_THROTTLE_MS: 16,
        RENDER_THROTTLE_MS: 16,
        ENABLE_TEXTURE_CACHE: true,
        MAX_CACHED_TEXTURES: 100,
        CACHE_CLEANUP_INTERVAL: 60000,
        LAZY_LOAD_PANELS: true,
        LAZY_LOAD_TOOLTIPS: true,
        BATCH_RENDER: true,
        REDUCE_SHADOWS: false,
        REDUCE_GRADIENTS: false
    },
    
    // ============================================================================
    // LAYOUT PRESETS
    // ============================================================================
    LAYOUTS: {
        PRESETS: {
            DEFAULT: {
                name: 'Default',
                partyFrames: 'left',
                actionBar: 'bottom-center',
                minimap: 'top-right',
                playerFrame: 'bottom-left'
            },
            COMPACT: {
                name: 'Compact',
                partyFrames: 'left',
                actionBar: 'bottom-center',
                minimap: 'top-right',
                playerFrame: 'bottom-left',
                scale: 0.9
            },
            CENTERED: {
                name: 'Centered',
                partyFrames: 'left',
                actionBar: 'center',
                minimap: 'top-right',
                playerFrame: 'center-left'
            },
            MINIMAL: {
                name: 'Minimal',
                partyFrames: 'hidden',
                actionBar: 'bottom-center',
                minimap: 'top-right',
                playerFrame: 'bottom-left'
            }
        },
        CURRENT: 'DEFAULT'
    },
    
    // ============================================================================
    // VISIBILITY TOGGLES
    // ============================================================================
    VISIBILITY: {
        PARTY_FRAMES: true,
        PLAYER_FRAME: true,
        TARGET_FRAME: true,
        ACTION_BAR: true,
        COMBAT_LOG: true,
        MINIMAP: true,
        HUD: true,
        TOOLTIPS: true,
        NOTIFICATIONS: true,
        HEALTH_BARS: true,
        MANA_BARS: true,
        XP_BARS: true,
        PORTRAITS: true,
        STATUS_EFFECTS: true,
        ROLE_ICONS: true,
        LEVEL_TEXT: true
    },
    
    // ============================================================================
    // KEYBINDS & SHORTCUTS
    // ============================================================================
    KEYBINDS: {
        TOGGLE_EQUIPMENT: 'E',
        TOGGLE_INVENTORY: 'I',
        TOGGLE_SHOP: 'S',
        TOGGLE_TALENTS: 'T',
        TOGGLE_COMBAT_LOG: 'L',
        TOGGLE_PROGRESSION: 'P',
        TOGGLE_UI: 'F12',
        HIDE_UI: 'F11',
        SCREENSHOT: 'F10',
        ACTION_1: '1',
        ACTION_2: '2',
        ACTION_3: '3',
        ACTION_4: '4',
        ACTION_5: '5',
        ACTION_6: '6',
        MODIFIER_ALT: 'ALT',
        MODIFIER_CTRL: 'CTRL',
        MODIFIER_SHIFT: 'SHIFT'
    },
    
    // ============================================================================
    // DEBUG & DEVELOPMENT
    // ============================================================================
    DEBUG: {
        ENABLED: false,
        SHOW_FPS: false,
        SHOW_COORDINATES: false,
        SHOW_BOUNDS: false,
        SHOW_DEPTH: false,
        BOUNDS_COLOR: 0xff0000,
        BOUNDS_ALPHA: 0.5,
        SHOW_PERFORMANCE: false,
        LOG_UI_UPDATES: false,
        LOG_TEXTURE_GENERATION: false
    },
    
    // ============================================================================
    // COMBAT UI (Combat panels, indicators, damage numbers)
    // ============================================================================
    COMBAT_UI: {
        // Combat Indicator
        INDICATOR: {
            WIDTH: 375,              // Scaled for 1920x1080 (from 200)
            HEIGHT: 56,              // Scaled for 1920x1080 (from 40)
            Y_OFFSET: -141,           // From bottom (scaled from -100)
            FONT_SIZE: 25,            // Scaled from 18
            STROKE_THICKNESS: 3,      // Scaled from 2
            BACKGROUND_COLOR: 0x440000,
            BORDER_COLOR: 0xff0000,
            BACKGROUND_ALPHA: 0.8
        },
        
        // Combat Tactics Panel
        TACTICS_PANEL: {
            WIDTH: 350,
            HEIGHT: 220,
            Y_OFFSET: -100,           // From center
            TITLE_Y_OFFSET: -85,
            TITLE_FONT_SIZE: 20,
            CURRENT_TEXT_Y_OFFSET: -45,
            CURRENT_TEXT_FONT_SIZE: 14,
            BUTTON_WIDTH: 100,
            BUTTON_HEIGHT: 35,
            BUTTON_SPACING: 110,      // Horizontal spacing between buttons
            BUTTON_Y_POSITION: 35,
            THREAT_BUTTON_Y_OFFSET: 85,
            THREAT_BUTTON_WIDTH: 200,
            THREAT_BUTTON_HEIGHT: 35,
            BACKGROUND_COLOR: 0x1a1a2e,
            BORDER_COLOR: 0xc9aa71,
            BORDER_WIDTH: 3
        },
        
        // Threat Display Panel
        THREAT_DISPLAY: {
            WIDTH: 180,
            HEIGHT: 160,
            X_OFFSET: -10,            // From right edge
            TITLE_Y_OFFSET: -65,      // From top (panelHeight/2 - 15)
            TITLE_FONT_SIZE: 14,
            BAR_Y_START: -35,
            BAR_SPACING: 24,
            BAR_HEIGHT: 18,
            BAR_WIDTH: 150
        },
        
        // Consumables Panel
        CONSUMABLES_PANEL: {
            WIDTH: 450,
            HEIGHT: 350,
            TITLE_Y_OFFSET: -80,
            ITEM_START_Y: -80,
            ITEM_SPACING: 60,
            ITEM_Y_OFFSET: -80,
            BUTTON_WIDTH: 60,
            BUTTON_HEIGHT: 30,
            BUTTON_FONT_SIZE: 12,
            CLOSE_BUTTON_WIDTH: 30,
            CLOSE_BUTTON_HEIGHT: 30,
            CLOSE_BUTTON_FONT_SIZE: 16
        },
        
        // Damage Numbers
        DAMAGE_NUMBERS: {
            FONT_SIZE: 24,
            DURATION: 1200,
            RISE_DISTANCE: 60,
            CRITICAL_SCALE: 1.5,
            CRITICAL_COLOR: '#ff6b6b'
        },
        
        // Combat Events
        COMBAT_EVENTS: {
            ABILITY_PROC: { color: '#ffd93d', scale: 1.2 },
            ENEMY_DEFEAT: { color: '#ff4757', scale: 1.4, duration: 800 },
            HERO_DEFEAT: { color: '#3742fa', scale: 1.1, duration: 600 },
            HEALING: { color: '#2ed573', scale: 1.1 }
        }
    },
    
    // ============================================================================
    // GAME SCENE SETTINGS
    // ============================================================================
    GAME_SCENE: {
        STARTING_POSITION: {
            X: 240,
            Y_OFFSET: 100            // From center
        },
        UPDATE_INTERVALS: {
            PERFORMANCE_CHECK: 60000,  // 60 seconds
            AUTO_SAVE: 30000,          // 30 seconds
            UI_UPDATE: 100,             // 100ms
            WORLD_UPDATE: 16,           // 16ms (60fps)
            COMBAT_UPDATE: 16,          // 16ms (60fps)
            STATISTICS_UPDATE: 5000     // 5 seconds
        }
    },
    
    // ============================================================================
    // ENCOUNTER UI (Resource nodes, exploration, choices)
    // ============================================================================
    ENCOUNTER_UI: {
        RESOURCE_PANEL: {
            WIDTH: 400,
            HEIGHT: 220,
            TITLE_Y_OFFSET: -85,      // From top (panelHeight/2 - 25)
            TITLE_FONT_SIZE: 20,
            CONTENT_Y_OFFSET: -20,
            CONTENT_FONT_SIZE: 14,
            BUTTON_WIDTH: 120,
            BUTTON_HEIGHT: 40,
            BUTTON_Y_OFFSET: 60,
            BUTTON_SPACING: 160,
            BUTTON_FONT_SIZE: 16,
            BACKGROUND_COLOR: 0x0d1a0d,
            BORDER_COLOR: 0x00ff00,
            BORDER_WIDTH: 3
        },
        EXPLORATION_PANEL: {
            WIDTH: 500,
            HEIGHT: 280,
            TITLE_Y_OFFSET: -115,
            TITLE_FONT_SIZE: 20,
            DESC_Y_OFFSET: -50,
            DESC_FONT_SIZE: 14,
            BUTTON_WIDTH: 150,
            BUTTON_HEIGHT: 40,
            BUTTON_Y_OFFSET: 80,
            BUTTON_SPACING: 180,
            BUTTON_FONT_SIZE: 16
        },
        CHOICE_PANEL: {
            WIDTH: 600,
            HEIGHT: 350,
            TITLE_Y_OFFSET: -150,
            TITLE_FONT_SIZE: 22,
            DESC_Y_OFFSET: -80,
            DESC_FONT_SIZE: 14,
            OPTION_SPACING: 50,
            OPTION_FONT_SIZE: 16,
            BUTTON_WIDTH: 200,
            BUTTON_HEIGHT: 40,
            BUTTON_FONT_SIZE: 14
        }
    },
    
    // ============================================================================
    // PROGRESSION PANEL
    // ============================================================================
    PROGRESSION_PANEL: {
        WIDTH: 300,
        HEIGHT: 250,
        X_OFFSET: -20,              // From right edge
        TITLE_Y_OFFSET: -95,        // From top (panelHeight/2 - 30)
        TITLE_FONT_SIZE: 20,
        CONTENT_FONT_SIZE: 14,
        CLOSE_BUTTON_SIZE: 30,
        CLOSE_BUTTON_X_OFFSET: 130, // From panel center
        CLOSE_BUTTON_Y_OFFSET: -105,
        CLOSE_BUTTON_FONT_SIZE: 16,
        BACKGROUND_COLOR: 0x1a1a2e,
        BORDER_COLOR: 0xffd700
    },
    
    // ============================================================================
    // HELP PANEL (Keyboard Shortcuts)
    // ============================================================================
    HELP_PANEL: {
        WIDTH: 400,
        HEIGHT: 300,
        TITLE_Y_OFFSET: -125,       // From top (panelHeight/2 - 25)
        TITLE_FONT_SIZE: 18,
        SHORTCUT_START_Y: -90,      // From top (panelHeight/2 - 60)
        SHORTCUT_SPACING: 22,
        KEY_FONT_SIZE: 14,
        KEY_X_OFFSET: -170,         // From left (panelWidth/2 - 30)
        DESC_X_OFFSET: -110,        // From left (panelWidth/2 - 90)
        DESC_FONT_SIZE: 14,
        CLOSE_TEXT_Y_OFFSET: 125,  // From top (panelHeight/2 - 25)
        CLOSE_TEXT_FONT_SIZE: 12,
        BACKGROUND_COLOR: 0x0a0a0a,
        BACKGROUND_ALPHA: 0.95,
        BORDER_COLOR: 0xc9aa71,
        BORDER_WIDTH: 3,
        BORDER_RADIUS: 8
    },
    
    // ============================================================================
    // REGENERATION MENU
    // ============================================================================
    REGENERATION_MENU: {
        WIDTH: 400,
        HEIGHT: 300,
        TITLE_Y_OFFSET: -120,       // From top (panelHeight/2 - 30)
        TITLE_FONT_SIZE: 20,
        BUTTON_START_Y: -40,
        BUTTON_SPACING: 50,
        BUTTON_WIDTH: 350,
        BUTTON_HEIGHT: 40,
        BUTTON_FONT_SIZE: 14,
        CLOSE_BUTTON_SIZE: 30,
        CLOSE_BUTTON_X_OFFSET: 180,
        CLOSE_BUTTON_Y_OFFSET: -130,
        CLOSE_BUTTON_FONT_SIZE: 16,
        BACKGROUND_COLOR: 0x1a1a3e,
        BORDER_COLOR: 0x00aaff
    },
    
    // ============================================================================
    // COMMON UI ELEMENTS (Used across multiple panels)
    // ============================================================================
    COMMON: {
        CLOSE_BUTTON: {
            SIZE: 30,
            FONT_SIZE: 16,
            X_OFFSET: 20,            // From panel edge
            Y_OFFSET: 20             // From panel edge
        },
        PANEL_PADDING: {
            X: 20,
            Y: 10
        },
        TEXT_PADDING: {
            X: 20,
            Y: 8
        },
        PROGRESS_BAR: {
            WIDTH: 300,
            HEIGHT: 8              // World progress bar height
        }
    },
    
    // ============================================================================
    // MENU SCENES
    // ============================================================================
    MAIN_MENU: {
        BASE_WIDTH: 1024,          // Legacy base resolution (for scaling)
        BASE_HEIGHT: 768,           // Legacy base resolution (for scaling)
        TITLE: {
            X_PERCENT: 0.15,        // 15% from left
            Y_PERCENT: 0.25,        // 25% from top (height / 4)
            BASE_SIZE: 52,
            MIN_SIZE: 36,
            MAX_SIZE: 72,
            STROKE_BASE: 5,
            STROKE_MIN: 3
        },
        SUBTITLE: {
            Y_OFFSET_BASE: 65,      // From title (scaled)
            BASE_SIZE: 22,
            MIN_SIZE: 16,
            MAX_SIZE: 28,
            STROKE_BASE: 3,
            STROKE_MIN: 2
        },
        BUTTONS: {
            X_PERCENT: 0.82,        // 82% from left (right side)
            TOP_MARGIN_PERCENT: 0.25,  // 25% from top
            BOTTOM_MARGIN_PERCENT: 0.25, // 25% from bottom
            BASE_WIDTH: 200,
            BASE_HEIGHT: 40,
            BASE_FONT_SIZE: 22,
            MIN_FONT_SIZE: 16,
            MAX_FONT_SIZE: 28,
            STROKE_BASE: 3,
            STROKE_MIN: 2,
            BACKGROUND_COLOR: 0x1a1a3e,
            BACKGROUND_ALPHA: 0.85,
            BORDER_COLOR: 0x4a4a6e,
            BORDER_WIDTH: 2,
            HOVER_BACKGROUND_COLOR: 0x2a2a4e,
            HOVER_BACKGROUND_ALPHA: 0.95,
            HOVER_BORDER_COLOR: 0xff8800,
            HOVER_BORDER_WIDTH: 3,
            BORDER_RADIUS: 2
        },
        VERSION: {
            X_OFFSET: -10,          // From right edge
            Y_OFFSET: -10,          // From bottom edge
            FONT_SIZE: 12
        }
    },
    
    CHARACTER_CREATION: {
        TITLE: {
            Y: 50,
            FONT_SIZE: 42,
            COLOR: '#dbba12'
        },
        INSTRUCTIONS: {
            Y: 105,
            FONT_SIZE: 16,
            COLOR: '#cccccc'
        },
        ROLE_PANEL: {
            Y: 160,
            WIDTH_PERCENT: 0.15,   // 15% of width, max 180
            MAX_WIDTH: 180,
            HEIGHT: 440,
            X_OFFSET_PERCENT: 0.04, // 4% offset from role position
            HEADER_HEIGHT: 30,
            HEADER_Y_OFFSET: 20,
            NAME_Y_OFFSET: 12,
            NAME_FONT_SIZE: 16,
            NAME_COLOR: '#ffd700',
            BACKGROUND_COLOR: 0x0a0a0a,
            BORDER_COLOR: 0xc9aa71,
            BORDER_WIDTH: 3,
            HEADER_BG_COLOR: 0x1a1f2e,
            HEADER_BG_ALPHA: 0.8
        },
        BUTTONS: {
            Y_OFFSET: -100,         // From bottom
            WIDTH: 220,
            HEIGHT: 45,
            SPACING: 20,
            CONFIRM_FONT_SIZE: 18,
            OTHER_FONT_SIZE: 14
        },
        ROLE_POSITIONS: {
            TANK_X_PERCENT: 0.1,
            HEALER_X_PERCENT: 0.28,
            DPS1_X_PERCENT: 0.46,
            DPS2_X_PERCENT: 0.64,
            DPS3_X_PERCENT: 0.82
        }
    },
    
    TALENT_ALLOCATION: {
        TALENT_GRID: {
            SIZE: 45,
            SPACING: 60,
            MAX_COLUMNS: 4,
            START_Y_OFFSET: 40
        },
        TREE_PANEL: {
            TITLE_Y_OFFSET: 10,
            TITLE_FONT_OFFSET: 2,   // fontSize + 2
            TITLE_COLOR: '#0066ff'
        }
    },
    
    MENU_COMMON: {
        PADDING: {
            SMALL: { x: 10, y: 5 },
            MEDIUM: { x: 20, y: 8 },
            LARGE: { x: 20, y: 10 }
        },
        FONT_SIZES: {
            TINY: 10,
            SMALL: 12,
            MEDIUM: 14,
            LARGE: 16,
            XLARGE: 18,
            XXLARGE: 20
        },
        SPACING: {
            TIGHT: 60,
            NORMAL: 80,
            WIDE: 150
        }
    },
    
    // ============================================================================
    // HERO LABELS (Above/Below Hero Sprites)
    // ============================================================================
    HERO_LABELS: {
        // Positioning
        Y_OFFSET: -35,              // Above sprite (negative = above)
        SHOW_ABOVE: true,           // Show above sprite (false = below)
        
        // Text styling
        FONT_SIZE: 14,
        STROKE_WIDTH: 2,
        STROKE_COLOR: '#000000',
        SHADOW_OFFSET_X: 2,
        SHADOW_OFFSET_Y: 2,
        SHADOW_BLUR: 3,
        SHADOW_COLOR: '#000000',
        SHADOW_ALPHA: 0.8,
        
        // Background (optional)
        SHOW_BACKGROUND: true,
        BACKGROUND_COLOR: 0x000000,
        BACKGROUND_ALPHA: 0.6,
        BACKGROUND_PADDING_X: 6,
        BACKGROUND_PADDING_Y: 3,
        BACKGROUND_CORNER_RADIUS: 4,
        
        // Animation
        FADE_IN_DURATION: 300,
        FOLLOW_SPRITE: true          // Update position when sprite moves
    },
    
    // ============================================================================
    // FORMATION SPACING
    // ============================================================================
    FORMATION: {
        // Initial hero setup spacing (in hero-renderer.js)
        INITIAL_HORIZONTAL_SPACING: 150,    // Increased from 120 for better visibility
        INITIAL_VERTICAL_OFFSET: 30,        // Increased from 20 for better visibility
        CENTER_HERO_X_OFFSET: -20,
        CENTER_HERO_Y_OFFSET: -20,
        
        // Movement formation spacing (in movement-manager.js)
        FORMATIONS: {
            LINE: { spacingX: 80, spacingY: 30 },        // Increased from 60/20
            WEDGE: { spacingX: 70, spacingY: 50 },      // Increased from 50/40
            WALL: { spacingX: 40, spacingY: 0 },         // Increased from 30/0
            SPREAD: { spacingX: 120, spacingY: 100 }     // Increased from 100/80
        },
        
        // Minimum spacing between heroes
        MIN_SPACING: 40,              // Increased from 35
        SEPARATION_STRENGTH: 0.3
    }
};

/**
 * Get scaled value based on screen size
 * @param {number} baseValue - Base value at BASE_WIDTH
 * @param {number} screenWidth - Current screen width
 * @param {string} type - 'width', 'height', 'font', 'button', or 'frame'
 * @returns {number} Scaled value
 */
export function getScaledValue(baseValue, screenWidth, type = 'width') {
    const scaleFactor = screenWidth / UI_CONFIG.SCALING.BASE_WIDTH;
    return Math.max(
        baseValue * scaleFactor,
        type === 'font' ? UI_CONFIG.SCALING.MIN_FONT_SIZE :
        type === 'button' ? UI_CONFIG.SCALING.MIN_BUTTON_SIZE :
        type === 'frame' ? UI_CONFIG.SCALING.MIN_FRAME_HEIGHT :
        baseValue * 0.8
    );
}

/**
 * Get position relative to screen edge
 * @param {number} offset - Offset from edge (positive = from left/top, negative = from right/bottom)
 * @param {number} screenSize - Screen width or height
 * @returns {number} Absolute position
 */
export function getRelativePosition(offset, screenSize) {
    if (offset < 0) {
        return screenSize + offset;
    }
    return offset;
}

/**
 * Get centered position
 * @param {number} screenSize - Screen width or height
 * @returns {number} Center position
 */
export function getCenteredPosition(screenSize) {
    return screenSize / 2;
}

/**
 * Get combat UI config value with scaling
 * @param {string} path - Config path (e.g., 'TACTICS_PANEL.WIDTH')
 * @param {number} screenWidth - Current screen width
 * @param {string} type - Scaling type ('width', 'height', 'font')
 * @returns {number} Scaled value or original value if not a number
 */
export function getCombatUIConfig(path, screenWidth, type = 'width') {
    const keys = path.split('.');
    let value = UI_CONFIG.COMBAT_UI;
    
    for (const key of keys) {
        value = value?.[key];
        if (value === undefined) return null;
    }
    
    if (typeof value === 'number') {
        return getScaledValue(value, screenWidth, type);
    }
    
    return value;
}

/**
 * Get game scene config value
 * @param {string} path - Config path (e.g., 'STARTING_POSITION.X')
 * @param {number} screenWidth - Optional screen width for scaling
 * @param {string} type - Optional scaling type
 * @returns {*} Config value (scaled if number and screenWidth provided)
 */
export function getGameSceneConfig(path, screenWidth = null, type = 'width') {
    const keys = path.split('.');
    let value = UI_CONFIG.GAME_SCENE;
    
    for (const key of keys) {
        value = value?.[key];
        if (value === undefined) return null;
    }
    
    if (typeof value === 'number' && screenWidth !== null) {
        return getScaledValue(value, screenWidth, type);
    }
    
    return value;
}

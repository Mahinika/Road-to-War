/**
 * UI Config Utilities - Helper functions for working with UI_CONFIG
 * Provides validation, preset management, and runtime updates
 */

import { UI_CONFIG } from '../config/ui-config.js';
import { Logger } from './logger.js';

/**
 * Validate UI config values
 * @param {Object} config - Config object to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validateUIConfig(config = UI_CONFIG) {
    const errors = [];
    
    // Validate numeric values are positive
    const validatePositive = (value, path) => {
        if (typeof value === 'number' && value < 0) {
            errors.push(`${path}: must be positive, got ${value}`);
        }
    };
    
    // Validate color values are valid hex
    const validateColor = (value, path) => {
        if (typeof value === 'number' && (value < 0 || value > 0xffffff)) {
            errors.push(`${path}: invalid color value, got ${value}`);
        }
    };
    
    // Validate alpha values are 0-1
    const validateAlpha = (value, path) => {
        if (typeof value === 'number' && (value < 0 || value > 1)) {
            errors.push(`${path}: alpha must be 0-1, got ${value}`);
        }
    };
    
    // Recursively validate config object
    const validateObject = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (value === null || value === undefined) {
                continue; // Allow null/undefined
            }
            
            if (typeof value === 'object' && !Array.isArray(value)) {
                validateObject(value, currentPath);
            } else if (typeof value === 'number') {
                // Check if it's a color (large number)
                if (value > 1 && value <= 0xffffff) {
                    validateColor(value, currentPath);
                } else if (key.toLowerCase().includes('alpha') || key.toLowerCase().includes('opacity')) {
                    validateAlpha(value, currentPath);
                } else {
                    validatePositive(value, currentPath);
                }
            }
        }
    };
    
    validateObject(config);
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Get config value by path (e.g., 'PARTY_FRAMES.FRAME_WIDTH')
 * @param {string} path - Dot-separated path to config value
 * @param {Object} config - Config object (defaults to UI_CONFIG)
 * @returns {*} Config value or undefined
 */
export function getConfigValue(path, config = UI_CONFIG) {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return undefined;
        }
    }
    
    return value;
}

/**
 * Set config value by path
 * @param {string} path - Dot-separated path to config value
 * @param {*} value - Value to set
 * @param {Object} config - Config object (defaults to UI_CONFIG)
 * @returns {boolean} Success
 */
export function setConfigValue(path, value, config = UI_CONFIG) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = config;
    
    for (const key of keys) {
        if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
        }
        target = target[key];
    }
    
    target[lastKey] = value;
    return true;
}

/**
 * Apply a theme preset
 * @param {string} themeName - Theme name from UI_CONFIG.THEMES.PRESETS
 * @returns {boolean} Success
 */
export function applyTheme(themeName) {
    const theme = UI_CONFIG.THEMES.PRESETS[themeName];
    if (!theme) {
        Logger.warn('UIConfigUtils', `Theme "${themeName}" not found`);
        return false;
    }
    
    // Apply theme colors to UI_THEME
    // Note: This would need to update UI_THEME if it's mutable
    UI_CONFIG.THEMES.CURRENT = themeName;
    
    Logger.info('UIConfigUtils', `Applied theme: ${theme.name}`);
    return true;
}

/**
 * Apply a layout preset
 * @param {string} layoutName - Layout name from UI_CONFIG.LAYOUTS.PRESETS
 * @returns {boolean} Success
 */
export function applyLayout(layoutName) {
    const layout = UI_CONFIG.LAYOUTS.PRESETS[layoutName];
    if (!layout) {
        Logger.warn('UIConfigUtils', `Layout "${layoutName}" not found`);
        return false;
    }
    
    UI_CONFIG.LAYOUTS.CURRENT = layoutName;
    
    Logger.info('UIConfigUtils', `Applied layout: ${layout.name}`);
    return true;
}

/**
 * Export current config as JSON string
 * @param {Object} config - Config to export (defaults to UI_CONFIG)
 * @returns {string} JSON string
 */
export function exportConfig(config = UI_CONFIG) {
    try {
        return JSON.stringify(config, null, 2);
    } catch (error) {
        Logger.error('UIConfigUtils', `Failed to export config: ${error.message}`);
        return null;
    }
}

/**
 * Import config from JSON string
 * @param {string} jsonString - JSON string to import
 * @param {Object} targetConfig - Target config object (defaults to UI_CONFIG)
 * @returns {boolean} Success
 */
export function importConfig(jsonString, targetConfig = UI_CONFIG) {
    try {
        const imported = JSON.parse(jsonString);
        
        // Merge imported config into target
        Object.assign(targetConfig, imported);
        
        // Validate imported config
        const validation = validateUIConfig(targetConfig);
        if (!validation.valid) {
            Logger.warn('UIConfigUtils', 'Imported config has validation errors:', validation.errors);
        }
        
        Logger.info('UIConfigUtils', 'Config imported successfully');
        return true;
    } catch (error) {
        Logger.error('UIConfigUtils', `Failed to import config: ${error.message}`);
        return false;
    }
}

/**
 * Create a config preset (save current state)
 * @param {string} presetName - Name for the preset
 * @param {Object} config - Config to save (defaults to UI_CONFIG)
 * @returns {Object} Preset object
 */
export function createPreset(presetName, config = UI_CONFIG) {
    return {
        name: presetName,
        timestamp: Date.now(),
        config: JSON.parse(JSON.stringify(config)) // Deep copy
    };
}

/**
 * Reset config to defaults
 * @param {Object} targetConfig - Config to reset (defaults to UI_CONFIG)
 * @returns {boolean} Success
 */
export function resetToDefaults(targetConfig = UI_CONFIG) {
    // This would require storing original defaults
    // For now, just log a warning
    Logger.warn('UIConfigUtils', 'resetToDefaults: Original defaults not stored. Reload page to reset.');
    return false;
}

/**
 * Get desktop-optimized value based on screen size
 * @param {string} configPath - Path to config value
 * @param {number} screenWidth - Current screen width
 * @param {string} type - Type of value ('width', 'height', 'font', 'button', 'frame')
 * @returns {number} Desktop-optimized value
 */
export function getResponsiveValue(configPath, screenWidth, type = 'width') {
    const baseValue = getConfigValue(configPath);
    if (baseValue === undefined) {
        Logger.warn('UIConfigUtils', `Config path not found: ${configPath}`);
        return 0;
    }
    
    const baseWidth = UI_CONFIG.SCALING.BASE_WIDTH;
    const scaleFactor = screenWidth / baseWidth;
    
    // Get minimum value based on type
    const minValue = type === 'font' ? UI_CONFIG.SCALING.MIN_FONT_SIZE :
                    type === 'button' ? UI_CONFIG.SCALING.MIN_BUTTON_SIZE :
                    type === 'frame' ? UI_CONFIG.SCALING.MIN_FRAME_HEIGHT :
                    baseValue * 0.8;
    
    return Math.max(baseValue * scaleFactor, minValue);
}

/**
 * Apply accessibility settings
 * @param {Object} settings - Accessibility settings
 */
export function applyAccessibility(settings) {
    if (settings.fontScale !== undefined) {
        UI_CONFIG.ACCESSIBILITY.FONT_SCALE = settings.fontScale;
    }
    if (settings.colorBlindMode !== undefined) {
        UI_CONFIG.ACCESSIBILITY.COLOR_BLIND_MODE = settings.colorBlindMode;
    }
    if (settings.highContrast !== undefined) {
        UI_CONFIG.ACCESSIBILITY.HIGH_CONTRAST = settings.highContrast;
    }
    if (settings.reducedMotion !== undefined) {
        UI_CONFIG.ACCESSIBILITY.REDUCED_MOTION = settings.reducedMotion;
    }
    
    Logger.info('UIConfigUtils', 'Accessibility settings applied');
}

/**
 * Get all configurable paths (for UI editor)
 * @param {Object} config - Config object (defaults to UI_CONFIG)
 * @param {string} prefix - Path prefix
 * @returns {Array} Array of config paths
 */
export function getAllConfigPaths(config = UI_CONFIG, prefix = '') {
    const paths = [];
    
    for (const [key, value] of Object.entries(config)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
            continue;
        }
        
        if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
            // Recursively get paths from nested objects
            paths.push(...getAllConfigPaths(value, currentPath));
        } else {
            // Leaf value
            paths.push({
                path: currentPath,
                value: value,
                type: typeof value
            });
        }
    }
    
    return paths;
}

/**
 * Batch update config values
 * @param {Object} updates - Object with path: value pairs
 * @param {Object} targetConfig - Target config (defaults to UI_CONFIG)
 * @returns {Object} Results { success: Array, failed: Array }
 */
export function batchUpdateConfig(updates, targetConfig = UI_CONFIG) {
    const results = {
        success: [],
        failed: []
    };
    
    for (const [path, value] of Object.entries(updates)) {
        try {
            setConfigValue(path, value, targetConfig);
            results.success.push(path);
        } catch (error) {
            results.failed.push({ path, error: error.message });
        }
    }
    
    return results;
}

/**
 * Get config diff (what changed between two configs)
 * @param {Object} oldConfig - Old config
 * @param {Object} newConfig - New config
 * @returns {Array} Array of changes { path, oldValue, newValue }
 */
export function getConfigDiff(oldConfig, newConfig) {
    const changes = [];
    const allPaths = getAllConfigPaths(newConfig);
    
    for (const { path } of allPaths) {
        const oldValue = getConfigValue(path, oldConfig);
        const newValue = getConfigValue(path, newConfig);
        
        if (oldValue !== newValue) {
            changes.push({
                path,
                oldValue,
                newValue
            });
        }
    }
    
    return changes;
}

/**
 * Check if config needs UI refresh
 * @param {Array} changes - Array of config changes
 * @returns {boolean} True if UI needs refresh
 */
export function needsUIRefresh(changes) {
    // Check if any changes affect visual elements
    const visualPaths = [
        'PARTY_FRAMES',
        'PLAYER_FRAME',
        'HUD',
        'ACTION_BAR',
        'COMBAT_LOG',
        'MINIMAP',
        'PANELS',
        'TOOLTIPS',
        'THEMES',
        'VISIBILITY'
    ];
    
    return changes.some(change => 
        visualPaths.some(path => change.path.startsWith(path))
    );
}


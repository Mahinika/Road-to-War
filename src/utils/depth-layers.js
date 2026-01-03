/**
 * Depth Layers - Centralized depth management for Phaser game objects
 * Provides consistent depth ordering across the game
 */

export const DEPTH_LAYERS = {
    BACKGROUND: 0,
    WORLD: 100,
    ENEMIES: 200,
    HEROES: 300,
    EFFECTS: 400,
    UI_BACKGROUND: 1000,
    UI_CONTENT: 1100,
    UI_OVERLAY: 2000
};

/**
 * Set depth for a game object using depth layer constants
 * @param {Phaser.GameObjects.GameObject} gameObject - Game object to set depth for
 * @param {string|number} layer - Depth layer name or numeric depth value
 */
export function setDepth(gameObject, layer) {
    if (typeof layer === 'string') {
        gameObject.setDepth(DEPTH_LAYERS[layer] || DEPTH_LAYERS.WORLD);
    } else {
        gameObject.setDepth(layer);
    }
}

/**
 * Get depth value for a layer
 * @param {string} layer - Depth layer name
 * @returns {number} - Depth value
 */
export function getDepth(layer) {
    return DEPTH_LAYERS[layer] || DEPTH_LAYERS.WORLD;
}


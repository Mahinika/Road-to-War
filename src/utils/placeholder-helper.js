/**
 * Placeholder Helper - provides simple generated textures to cover missing assets.
 * Use these helpers to ensure the game keeps running even when art files are absent.
 */

/**
 * Ensure a placeholder texture exists in the texture cache.
 * @param {Phaser.Scene} scene - Phaser scene.
 * @param {Object} options - Placeholder options.
 * @param {string} options.key - Texture key to create.
 * @param {number} [options.width=48] - Width of the placeholder.
 * @param {number} [options.height=48] - Height of the placeholder.
 * @param {number} [options.color=0x444444] - Fill color.
 * @param {number} [options.borderColor=0xffffff] - Border color.
 * @param {number} [options.crossColor=0xffffff] - Cross/mark color.
 * @returns {string} Texture key that exists in the cache.
 */
export function ensurePlaceholderTexture(scene, options) {
    if (!scene || !scene.textures || !scene.add) return options?.key;

    const {
        key,
        width = 48,
        height = 48,
        color = 0x444444,
        borderColor = 0xffffff,
        crossColor = 0xffffff
    } = options || {};

    if (!key) return key;
    if (scene.textures.exists(key)) return key;

    const graphics = scene.add.graphics({ x: 0, y: 0 });
    graphics.setVisible(false);

    // Base block
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);

    // Border
    graphics.lineStyle(2, borderColor, 1);
    graphics.strokeRect(0, 0, width, height);

    // Simple cross/mark to make it visually distinct
    graphics.lineStyle(1, crossColor, 0.5);
    graphics.beginPath();
    graphics.moveTo(4, 4);
    graphics.lineTo(width - 4, height - 4);
    graphics.moveTo(width - 4, 4);
    graphics.lineTo(4, height - 4);
    graphics.strokePath();

    graphics.generateTexture(key, width, height);
    graphics.destroy();

    return key;
}

/**
 * Register and generate default placeholder textures for common asset types.
 * @param {Phaser.Scene} scene - Phaser scene.
 * @returns {Object} Map of placeholder keys.
 */
export function registerDefaultPlaceholders(scene) {
    const placeholders = {
        hero: 'hero_placeholder',
        enemy: 'enemy_placeholder',
        item: 'item_placeholder',
        uiButton: 'ui_button_placeholder',
        uiPanel: 'ui_panel_placeholder'
    };

    ensurePlaceholderTexture(scene, {
        key: placeholders.hero,
        width: 48,
        height: 48,
        color: 0x1f4b99,
        borderColor: 0xffffff,
        crossColor: 0xb4d0ff
    });

    ensurePlaceholderTexture(scene, {
        key: placeholders.enemy,
        width: 48,
        height: 48,
        color: 0x993333,
        borderColor: 0xffffff,
        crossColor: 0xffc0c0
    });

    ensurePlaceholderTexture(scene, {
        key: placeholders.item,
        width: 32,
        height: 32,
        color: 0x4a4a4a,
        borderColor: 0xffffff,
        crossColor: 0xdedede
    });

    ensurePlaceholderTexture(scene, {
        key: placeholders.uiButton,
        width: 160,
        height: 40,
        color: 0x2e2e2e,
        borderColor: 0xffffff,
        crossColor: 0x999999
    });

    ensurePlaceholderTexture(scene, {
        key: placeholders.uiPanel,
        width: 200,
        height: 120,
        color: 0x1a1a1a,
        borderColor: 0x666666,
        crossColor: 0x999999
    });

    if (scene && scene.registry) {
        scene.registry.set('placeholderTextures', placeholders);
    }

    return placeholders;
}

/**
 * Get a placeholder texture key for a given type.
 * Falls back to a generic key name if registry data is missing.
 * @param {Phaser.Scene} scene - Phaser scene.
 * @param {string} type - Placeholder type (hero, enemy, item, uiButton, uiPanel).
 * @returns {string} Texture key to use.
 */
export function getPlaceholderKey(scene, type) {
    if (scene?.registry?.has('placeholderTextures')) {
        const map = scene.registry.get('placeholderTextures');
        if (map && map[type]) {
            return map[type];
        }
    }
    return `placeholder_${type}`;
}

/**
 * Ensure a placeholder exists for an arbitrary missing asset key.
 * Useful when a file fails to load and we want to preserve the expected key.
 * @param {Phaser.Scene} scene - Phaser scene.
 * @param {string} key - Texture key to backfill.
 * @param {number} [size=64] - Size of the generated block.
 * @returns {string} Texture key that now exists.
 */
export function backfillMissingAsset(scene, key, size = 64) {
    return ensurePlaceholderTexture(scene, {
        key,
        width: size,
        height: size,
        color: 0x663333,
        borderColor: 0xffffff,
        crossColor: 0xffdddd
    });
}

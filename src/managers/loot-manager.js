import Phaser from 'phaser';
import { RuntimePaladinGenerator } from '../generators/runtime-paladin-generator.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { GameEvents } from '../utils/event-constants.js';
import { getPlaceholderKey, ensurePlaceholderTexture } from '../utils/placeholder-helper.js';
import { waitForTexture } from '../utils/texture-utils.js';
import { BaseManager } from './base-manager.js';

/**
 * Loot Manager - Handles item drops, pickups, and inventory management
 * Coordinates loot generation from combat and manages item collection
 */

export class LootManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // LootManager has no dependencies
    }

    /**
     * Initializes the LootManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} [config={}] - Optional configuration for dependency injection.
     */
    constructor(scene, config = {}) {
        super(scene, config);
        this.itemsData = config.itemsData || this.scene.cache.json.get('items');
        this.worldConfig = config.worldConfig || this.scene.cache.json.get('worldConfig');

        // Loot state
        this.activeLootItems = [];
        this.inventory = [];
        this.maxInventorySize = 20;

        // Loot settings
        this.lootFilter = 'common'; // Minimum rarity to pick up
        this.autoSellRarity = 'none'; // Automatically sell items of this rarity or lower
        this.luckStat = 0; // Bonus to drop quality

        // Visual elements
        this.lootSprites = new Map(); // Maps lootItem -> sprite (for data lookup)
        this.lootSpriteGroup = null; // Phaser Group for sprite pooling
        this.pickupRange = 50;
        this.inventoryDisplay = null;

        // Initialize Groups if scene is ready
        if (this.scene && this.scene.add) {
            this.initializeGroups();
            this.createInventoryDisplay();
        }
    }

    /**
     * Reloads item data from the scene cache for hot-reload support.
     * @async
     * @returns {Promise<void>}
     */
    async reloadItemData() {
        try {
            // Reload items data from scene cache
            this.itemsData = this.scene.cache.json.get('items');
            Logger.info('LootManager', 'Reloaded item data for hot-reload');
        } catch (error) {
            Logger.error('LootManager', 'Failed to reload item data:', error);
        }

        // Events
        this.setupEventListeners();
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        if (this.initializeGroups) {
            this.initializeGroups();
        }
        if (this.createInventoryDisplay) {
            this.createInventoryDisplay();
        }
        Logger.info('LootManager', 'Initialized');
    }

    /**
     * Initializes Phaser sprite groups for performance-optimized loot rendering.
     */
    initializeGroups() {
        if (!this.scene || !this.scene.add) {
            Logger.warn('LootManager', 'Cannot initialize Groups: scene not available');
            return;
        }

        // Create Group with pooling support
        this.lootSpriteGroup = this.scene.add.group({
            maxSize: 30,
            createCallback: (sprite) => {
                // Sprite will be created when needed
            },
            removeCallback: (sprite) => {
                // Cleanup when sprite is removed
                if (sprite) {
                    sprite.setActive(false);
                    sprite.setVisible(false);
                }
            }
        });

        Logger.info('LootManager', 'Phaser Groups initialized');
    }

    /**
     * Configures event listeners for combat rewards and hero movement.
     */
    setupEventListeners() {
        // Listen for combat end events to spawn loot
        this.scene.events.on(GameEvents.COMBAT.END, (data) => {
            if (data.victory && data.rewards.loot) {
                this.spawnLoot(data.enemy, data.rewards.loot);
            }
        });

        // Listen for hero movement to check for pickups
        this.scene.events.on('hero_moved', (hero) => {
            this.checkLootPickups(hero);
        });
    }

    /**
     * Spawns physical loot items in the world at an enemy's death location.
     * @param {Object} enemy - The enemy object that was defeated.
     * @param {Array<Object>} lootItems - List of item definitions to drop.
     */
    spawnLoot(enemy, lootItems) {
        // PerformanceMonitor.start('LootManager.spawnLoot');
        try {
            if (!lootItems || lootItems.length === 0) {
                // PerformanceMonitor.end('LootManager.spawnLoot');
                return;
            }

            // Get enemy position safely (use sprite position if available, otherwise use direct x/y)
            const enemyX = enemy?.sprite?.x ?? enemy?.x ?? 0;
            const enemyY = enemy?.sprite?.y ?? enemy?.y ?? 0;

            lootItems.forEach(lootData => {
                const item = this.createLootItem(lootData, enemyX, enemyY);
                this.activeLootItems.push(item);
                this.createLootSprite(item);
            });

            Logger.info('LootManager', `Spawned ${lootItems.length} loot items`);
            // PerformanceMonitor.end('LootManager.spawnLoot');
        } catch (error) {
            // PerformanceMonitor.end('LootManager.spawnLoot');
            ErrorHandler.handle(error, 'LootManager.spawnLoot', 'error');
        }
    }

    /**
     * Creates a logical loot item object with randomized positioning.
     * @param {Object} lootData - Raw item data.
     * @param {number} x - Base X coordinate.
     * @param {number} y - Base Y coordinate.
     * @returns {Object} Initialized loot item state.
     */
    createLootItem(lootData, x, y) {
        // Use generated item data if available (mile-scaled), otherwise fall back to base item
        let itemData = lootData.itemData || this.getItemData(lootData.id);

        // Safety check: if itemData is still null, create a minimal fallback to prevent crash
        if (!itemData) {
            Logger.warn('LootManager', `Unknown item ID spawned: ${lootData.id}`);
            itemData = {
                id: lootData.id || 'unknown',
                name: lootData.name || 'Unknown Item',
                sellValue: 0,
                rarity: 'common',
                level: 1
            };
        }

        // Ensure itemLevel is set (from generated item or base item)
        if (itemData && !itemData.itemLevel) {
            itemData.itemLevel = lootData.itemLevel || itemData.level || 1;
        }

        return {
            id: lootData.id,
            x: x + (Math.random() - 0.5) * 40, // Random offset
            y: y + (Math.random() - 0.5) * 40,
            data: itemData,
            quantity: lootData.quantity || 1,
            value: itemData.sellValue || 0,
            itemLevel: itemData.itemLevel || lootData.itemLevel || itemData.level || 1,
            quality: lootData.quality || itemData.rarity || 'common',
            mileGenerated: lootData.mileGenerated || null,
            spawnedAt: Date.now(),
            lifetime: 30000 // 30 seconds before disappearing
        };
    }

    /**
     * Retrieves item definition data from the master items registry.
     * @param {string} itemId - Unique identifier for the item.
     * @returns {Object|null} Item data or null if not found.
     */
    getItemData(itemId) {
        // Search through all item categories
        for (const category of ['weapons', 'armor', 'accessories', 'consumables']) {
            if (this.itemsData[category] && this.itemsData[category][itemId]) {
                return this.itemsData[category][itemId];
            }
        }
        return null;
    }

    /**
     * Creates the visual representation (sprite and label) for a loot item.
     * @param {Object} lootItem - Logical loot item state.
     */
    createLootSprite(lootItem) {
        // Try to get a dead sprite from Group for pooling, or create new one
        let sprite = null;
        let poolHit = false;
        if (this.lootSpriteGroup) {
            sprite = this.lootSpriteGroup.getFirstDead(false);
            if (sprite) {
                poolHit = true;
                // Track pool usage for statistics
                if (this.scene.memoryMonitor) {
                    this.scene.memoryMonitor.trackPoolUsage('lootSprites', true);
                }
            } else {
                if (this.scene.memoryMonitor) {
                    this.scene.memoryMonitor.trackPoolUsage('lootSprites', false);
                }
            }
        }

        // Try to use texture atlas first (better performance)
        const atlasKey = 'item-icons-atlas';
        const itemId = lootItem.data.id;
        const textureKey = `item-icon-${itemId}`;

        if (this.scene.textures.exists(atlasKey) && this.scene.textures.get(atlasKey).has(itemId)) {
            // Use atlas
            if (!sprite) {
                sprite = this.scene.add.image(lootItem.x, lootItem.y, atlasKey, itemId);
            } else {
                sprite.setTexture(atlasKey, itemId);
                sprite.setPosition(lootItem.x, lootItem.y);
                sprite.setActive(true);
                sprite.setVisible(true);
            }
            sprite.setOrigin(0.5);
            sprite.setScale(20 / 64); // Scale to 20x20 for loot display
        } else if (this.scene.textures.exists(textureKey)) {
            // Fallback to individual texture
            if (!sprite) {
                sprite = this.scene.add.sprite(lootItem.x, lootItem.y, textureKey);
            } else {
                sprite.setTexture(textureKey);
                sprite.setPosition(lootItem.x, lootItem.y);
                sprite.setActive(true);
                sprite.setVisible(true);
            }
            sprite.setOrigin(0.5);
            sprite.setScale(20 / 64); // Scale to 20x20 for loot display
        } else {
            // No texture available - create visible colored circle based on rarity
            const rarityColors = {
                common: 0x888888,
                uncommon: 0x00ff00,
                rare: 0x0088ff,
                epic: 0x9900ff,
                legendary: 0xffaa00
            };

            const color = rarityColors[lootItem.quality] || rarityColors.common;

            if (!sprite) {
                sprite = this.scene.add.circle(lootItem.x, lootItem.y, 12, color, 1);
                sprite.setStrokeStyle(2, 0xffffff, 0.8);
            } else {
                // Reuse existing sprite
                sprite.setPosition(lootItem.x, lootItem.y);
                sprite.setFillStyle(color, 1);
                sprite.setStrokeStyle(2, 0xffffff, 0.8);
                sprite.setActive(true);
                sprite.setVisible(true);
            }
            sprite.setOrigin(0.5);
            sprite.setScale(20 / 64); // Scale to 20x20 for loot display
        }

        // Set depth using depth layer constant
        sprite.setDepth(250); // DEPTH_LAYERS.EFFECTS

        // Add to Group if not already added
        if (this.lootSpriteGroup && !this.lootSpriteGroup.contains(sprite)) {
            this.lootSpriteGroup.add(sprite);
        }

        // Add glow effect for rare items
        if ((lootItem.data.rarity === 'rare' || lootItem.data.rarity === 'legendary' || lootItem.data.rarity === 'epic') && 
            sprite.postFX && typeof sprite.postFX.addGlow === 'function') {
            sprite.postFX.addGlow(0xffffff, 2, 0, false, 0.1, 32);
        }

        // Add floating animation
        this.scene.tweens.add({
            targets: sprite,
            y: { from: lootItem.y, to: lootItem.y - 10 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Store sprite reference
        this.lootSprites.set(lootItem, sprite);

        // Create item name label
        const label = this.scene.add.text(lootItem.x, lootItem.y - 25, lootItem.data.name, {
            font: '12px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        label.setOrigin(0.5);
        label.visible = false; // Only show on hover/proximity
        label.setDepth(251); // Slightly above sprite

        // Store label with sprite
        sprite.label = label;
    }

    /**
     * Checks if any heroes are within pickup range of active world loot.
     * @param {Object} hero - The hero attempting to pick up loot.
     */
    checkLootPickups(hero) {
        if (!hero) return;

        // Get hero position (support both sprite and direct position)
        const heroX = hero.sprite?.x ?? hero.x ?? 0;
        const heroY = hero.sprite?.y ?? hero.y ?? 0;

        // Iterate backwards to safely remove items
        for (let i = this.activeLootItems.length - 1; i >= 0; i--) {
            const lootItem = this.activeLootItems[i];
            if (!lootItem) continue;

            const distance = Phaser.Math.Distance.Between(
                heroX, heroY,
                lootItem.x, lootItem.y
            );

            if (distance <= this.pickupRange) {
                this.pickupLoot(lootItem, hero);
                // Remove from active items
                this.activeLootItems.splice(i, 1);
            }
        }
    }

    /**
     * Main update loop for the LootManager.
     * Manages loot pickup checks, expiration, and visual visibility updates.
     * @param {Object} [partyManager=null] - PartyManager instance for multi-hero pickup checks.
     * @param {Object} [hero=null] - Single hero reference for backward compatibility.
     */
    update(partyManager = null, hero = null) {
        // Initialize update count if needed
        this._updateCount = (this._updateCount || 0) + 1;

        // Check for loot pickups - can be done every frame for responsiveness
        // or throttled if performance is an issue. Let's keep it every frame for now
        // as distance checks are relatively cheap for few items.
        if (partyManager) {
            const heroes = partyManager.getHeroes() || [];
            heroes.forEach(h => {
                this.checkLootPickups(h);
            });
        } else if (hero) {
            // Single hero (backward compatibility)
            this.checkLootPickups(hero);
        }

        // Throttle other checks for performance (every 10 frames ≈ 6 times per second)
        if (this._updateCount % 10 === 0) {
            const now = Date.now();
            
            // Clean up expired loot items
            for (let i = this.activeLootItems.length - 1; i >= 0; i--) {
                const lootItem = this.activeLootItems[i];
                if (lootItem.spawnedAt && (now - lootItem.spawnedAt) > lootItem.lifetime) {
                    this.removeLootSprite(lootItem);
                    this.showFloatingText(lootItem.x, lootItem.y, 'Expired', '#888888');
                    this.activeLootItems.splice(i, 1);
                }
            }

            // Update loot sprites for hero proximity (tooltips/highlights)
            this.updateLootVisibility();
        }
    }

    /**
     * Processes the logic for a hero picking up a specific loot item.
     * Handles filtering, auto-selling, consumable routing, and inventory addition.
     * @param {Object} lootItem - Logical loot item to pick up.
     * @param {Object} hero - Hero performing the pickup.
     */
    pickupLoot(lootItem, hero) {
        const itemRarity = lootItem.quality || lootItem.data?.rarity || 'common';
        
        // Check loot filter
        if (this.shouldFilterItem(itemRarity)) {
            this.showFloatingText(lootItem.x, lootItem.y, 'Filtered', '#888888');
            this.removeLootSprite(lootItem);
            return;
        }

        // Handle auto-sell
        if (this.shouldAutoSell(itemRarity)) {
            const sellValue = lootItem.value || lootItem.data?.sellValue || 0;
            if (this.scene.statisticsManager) {
                this.scene.statisticsManager.addGold(sellValue);
            }
            this.showFloatingText(lootItem.x, lootItem.y, `+${sellValue}g (Auto-sold)`, '#ffff00');
            this.removeLootSprite(lootItem);
            return;
        }

        // Handle consumables differently - add to resource manager
        if (lootItem.type === 'consumable' && this.scene.resourceManager) {
            // Get item data from cache for proper display
            const itemsData = this.scene.cache.json.get('items');
            const itemData = itemsData?.consumables?.[lootItem.id];

            this.scene.resourceManager.addConsumable(lootItem.id, {
                count: lootItem.quantity || 1,
                effects: itemData?.effects
            });

            // Show pickup feedback
            const itemName = itemData?.name || lootItem.data?.name || lootItem.id;
            this.showPickupEffect(lootItem);
            this.showFloatingText(lootItem.x, lootItem.y, `+${lootItem.quantity || 1} ${itemName}`, '#00aaff');

            // Remove visual elements
            this.removeLootSprite(lootItem);

            // Emit pickup event
            this.scene.events.emit(GameEvents.ITEM.PICKED_UP, {
                item: lootItem,
                type: 'consumable'
            });

            Logger.info('LootManager', `Picked up consumable: ${lootItem.quantity || 1}x ${itemName}`);
            return;
        }

        // Check inventory space for regular items
        if (this.inventory.length >= this.maxInventorySize) {
            this.showFloatingText(lootItem.x, lootItem.y, 'Inventory Full!', '#ff0000');
            return;
        }

        // Add to inventory
        const itemData = lootItem.data || lootItem;
        if (itemData.instanceId && this.scene.equipmentManager) {
            this.scene.equipmentManager.registerInstance(itemData);
        }

        this.inventory.push({
            ...lootItem,
            pickedUpAt: Date.now()
        });

        // Show pickup feedback
        this.showPickupEffect(lootItem);
        this.showFloatingText(lootItem.x, lootItem.y, `+${lootItem.data.name}`, '#00ff00');

        // Remove visual elements
        this.removeLootSprite(lootItem);

        // Emit pickup event
        this.scene.events.emit(GameEvents.ITEM.PICKED_UP, {
            item: lootItem,
            inventory: this.inventory
        });

        Logger.info('LootManager', `Picked up: ${lootItem.data.name}`);
    }

    /**
     * Triggers visual feedback effects (scaling, particles) when an item is picked up.
     * @param {Object} lootItem - The item being collected.
     */
    showPickupEffect(lootItem) {
        const sprite = this.lootSprites.get(lootItem);
        if (!sprite) return;

        // Add a glow effect before pickup
        const originalTint = sprite.tint || 0xffffff;
        sprite.setTint(0xffff88); // Golden glow

        // Animate sprite shrinking and fading with glow
        this.scene.tweens.add({
            targets: sprite,
            scale: { from: 1.2, to: 0 },
            alpha: { from: 1, to: 0 },
            duration: 400,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.removeLootSprite(lootItem);
            }
        });

        // Create pickup particles
        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.circle(lootItem.x, lootItem.y, 3, 0xffff00);
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 30;

            this.scene.tweens.add({
                targets: particle,
                x: lootItem.x + Math.cos(angle) * distance,
                y: lootItem.y + Math.sin(angle) * distance,
                alpha: { from: 1, to: 0 },
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    /**
     * Cleans up visual elements (sprite, label) associated with a loot item.
     * @param {Object} lootItem - The logical loot item object.
     */
    removeLootSprite(lootItem) {
        const sprite = this.lootSprites.get(lootItem);
        if (sprite) {
            if (sprite.label) {
                sprite.label.destroy();
            }

            // Kill sprite instead of destroying (makes it available for Group pooling)
            if (this.lootSpriteGroup && this.lootSpriteGroup.contains(sprite)) {
                sprite.setActive(false);
                sprite.setVisible(false);
                // Sprite is now "dead" and can be reused via getFirstDead()
            } else {
                // Not in group, destroy it
                sprite.destroy();
            }

            this.lootSprites.delete(lootItem);
        }
    }

    /**
     * Displays transient floating text at a world position.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {string} text - Message to display.
     * @param {string} [color='#ffffff'] - Hex color for the text.
     */
    showFloatingText(x, y, text, color = '#ffffff') {
        const floatingText = this.scene.add.text(x, y, text, {
            font: 'bold 14px Arial',
            fill: color,
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        floatingText.setOrigin(0.5, 0.5);

        // Animate floating text
        this.scene.tweens.add({
            targets: floatingText,
            y: { from: y, to: y - 40 },
            alpha: { from: 1, to: 0 },
            duration: 1500,
            ease: 'Quad.easeOut',
            onComplete: () => {
                floatingText.destroy();
            }
        });
    }

    /**
     * Updates highlights and labels for loot items based on their distance to the hero.
     */
    updateLootVisibility() {
        const hero = this.scene.hero;
        if (!hero) return;

        // Get hero position (support both sprite and direct position)
        const heroX = hero.sprite?.x ?? hero.x ?? 0;
        const heroY = hero.sprite?.y ?? hero.y ?? 0;

        this.activeLootItems.forEach(lootItem => {
            const sprite = this.lootSprites.get(lootItem);
            if (!sprite) return;

            const distance = Phaser.Math.Distance.Between(
                heroX, heroY,
                lootItem.x, lootItem.y
            );

            // Show label when hero is close
            if (sprite.label) {
                sprite.label.visible = distance <= this.pickupRange * 2;
            }

            // Highlight when in pickup range
            // FIXED: Sprites do not have setStrokeStyle (that is for Shapes)
            // Use setTint or setAlpha for highlighting sprites
            if (distance <= this.pickupRange) {
                if (sprite.setTint) sprite.setTint(0xffff00);
                sprite.setAlpha(1.0);
            } else {
                if (sprite.clearTint) sprite.clearTint();
                // If it's a placeholder, it might have had a rarity tint - restore if needed
                // For now, simple clearTint is safer than crashing
                sprite.setAlpha(0.9);
            }
        });
    }

    /**
     * Gets a copy of the current player inventory.
     * @returns {Array<Object>} List of inventory item objects.
     */
    getInventory() {
        return [...this.inventory];
    }

    /**
     * Removes a specified quantity of an item from the inventory.
     * @param {string} itemId - ID of the item to remove.
     * @param {number} [quantity=1] - Amount to remove.
     * @returns {boolean} True if removal was successful.
     */
    removeFromInventory(itemId, quantity = 1) {
        const index = this.inventory.findIndex(item => item.id === itemId);
        if (index === -1) return false;

        const item = this.inventory[index];
        if (item.quantity > quantity) {
            item.quantity -= quantity;
        } else {
            this.inventory.splice(index, 1);
        }

        return true;
    }

    /**
     * Determines if an item should be ignored based on the current loot filter.
     * @param {string} rarity - The rarity of the item.
     * @returns {boolean} True if the item should be filtered out.
     */
    shouldFilterItem(rarity) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const filterIndex = rarityOrder.indexOf(this.lootFilter);
        const itemIndex = rarityOrder.indexOf(rarity);
        return itemIndex < filterIndex;
    }

    /**
     * Determines if an item should be automatically sold upon pickup.
     * @param {string} rarity - The rarity of the item.
     * @returns {boolean} True if the item should be auto-sold.
     */
    shouldAutoSell(rarity) {
        if (this.autoSellRarity === 'none') return false;
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const autoSellIndex = rarityOrder.indexOf(this.autoSellRarity);
        const itemIndex = rarityOrder.indexOf(rarity);
        return itemIndex <= autoSellIndex;
    }

    /**
     * Sells all items in the inventory that match or are below a specified rarity.
     * @param {string} maxRarity - The highest rarity tier to sell.
     */
    sellAllByRarity(maxRarity) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const maxIndex = rarityOrder.indexOf(maxRarity);
        
        let totalGold = 0;
        let itemsSold = 0;

        for (let i = this.inventory.length - 1; i >= 0; i--) {
            const item = this.inventory[i];
            const itemRarity = item.quality || item.data?.rarity || 'common';
            const itemIndex = rarityOrder.indexOf(itemRarity);

            if (itemIndex <= maxIndex) {
                totalGold += item.value || item.data?.sellValue || 0;
                this.inventory.splice(i, 1);
                itemsSold++;
            }
        }

        if (itemsSold > 0) {
            if (this.scene.statisticsManager) {
                this.scene.statisticsManager.addGold(totalGold);
            }
            Logger.info('LootManager', `Sold ${itemsSold} items for ${totalGold} gold`);
            this.updateInventoryDisplay();
        }
    }

    /**
     * Scraps all items in the inventory that match or are below a specified rarity.
     * Scraping typically yields higher gold or crafting materials.
     * @param {string} maxRarity - The highest rarity tier to scrap.
     */
    scrapAllByRarity(maxRarity) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const maxIndex = rarityOrder.indexOf(maxRarity);
        
        let totalGold = 0;
        let itemsScrapped = 0;

        for (let i = this.inventory.length - 1; i >= 0; i--) {
            const item = this.inventory[i];
            const itemRarity = item.quality || item.data?.rarity || 'common';
            const itemIndex = rarityOrder.indexOf(itemRarity);

            if (itemIndex <= maxIndex) {
                // Scraping gives 1.5x sell value
                totalGold += Math.floor((item.value || item.data?.sellValue || 0) * 1.5);
                this.inventory.splice(i, 1);
                itemsScrapped++;
            }
        }

        if (itemsScrapped > 0) {
            if (this.scene.statisticsManager) {
                this.scene.statisticsManager.addGold(totalGold);
            }
            Logger.info('LootManager', `Scrapped ${itemsScrapped} items for ${totalGold} gold`);
            this.updateInventoryDisplay();
        }
    }

    /**
     * Updates the minimum rarity required for an item to be picked up.
     * @param {string} rarity - Rarity threshold (e.g., 'rare').
     */
    setLootFilter(rarity) {
        this.lootFilter = rarity;
        Logger.info('LootManager', `Loot filter set to: ${rarity}`);
    }

    /**
     * Updates the rarity threshold for automatic item selling.
     * @param {string} rarity - Rarity threshold or 'none'.
     */
    setAutoSell(rarity) {
        this.autoSellRarity = rarity;
        Logger.info('LootManager', `Auto-sell set to: ${rarity}`);
    }

    /**
     * Gets the current number of items in the inventory.
     * @returns {number} Item count.
     */
    getInventorySize() {
        return this.inventory.length;
    }

    /**
     * Checks if the inventory has reached its maximum capacity.
     * @returns {boolean} True if full.
     */
    isInventoryFull() {
        return this.inventory.length >= this.maxInventorySize;
    }

    /**
     * Removes and cleans up all active loot items from the world.
     */
    clearActiveLoot() {
        this.activeLootItems.forEach(lootItem => {
            this.removeLootSprite(lootItem);
        });
        this.activeLootItems = [];
    }

    /**
     * Initializes the character sheet and inventory grid UI.
     */
    createInventoryDisplay() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Desktop-optimized positioning - right side of screen
        const panelWidth = 480;
        const panelHeight = 600;
        const x = width - panelWidth / 2 - 20;
        const y = height / 2;
        const slotSize = 50;

        // Main container
        this.inventoryDisplay = this.scene.add.container(x, y);
        this.inventoryDisplay.setDepth(2000);

        // Enhanced WoW-style background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0a0a0a, 0.98);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 8);
        bg.lineStyle(3, 0xc9aa71, 1);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 8);
        this.inventoryDisplay.add(bg);

        // Title with enhanced styling
        const title = this.scene.add.text(0, -panelHeight/2 + 25, 'INVENTORY', {
            font: 'bold 18px Arial',
            fill: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        });
        title.setOrigin(0.5);
        this.inventoryDisplay.add(title);

        // Hotkey hint
        const hotkeyHint = this.scene.add.text(panelWidth/2 - 15, -panelHeight/2 + 15, 'I', {
            font: 'bold 12px Arial',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 1
        });
        hotkeyHint.setOrigin(1, 0.5);
        this.inventoryDisplay.add(hotkeyHint);

        // Create tab system for inventory organization
        this.createInventoryTabs(panelWidth, panelHeight);

        // Search and filter controls
        this.createInventoryControls(panelWidth, panelHeight);
        const leftX = -(panelWidth / 2) + 80;
        const rightX = (panelWidth / 2) - 80;
        const slotSpacing = slotSize + 8;
        const labelFontSize = 9; // Font size for slot labels

        // Start slots from near the top of the panel
        const startY = -(panelHeight / 2) + 80;

        this.equipmentSlots = {};

        // Left side slots (top to bottom) - starting from top
        const leftSlots = ['head', 'neck', 'shoulder', 'cloak', 'chest', 'shirt', 'tabard', 'bracer'];
        leftSlots.forEach((slot, index) => {
            const y = startY + (index * slotSpacing);
            const pos = { x: leftX, y: y };

            // Slot background
            const slotBg = this.scene.add.rectangle(pos.x, pos.y, slotSize, slotSize, 0x2a2a2a);
            slotBg.setStrokeStyle(2, 0x555555);
            this.inventoryDisplay.add(slotBg);

            // Slot label - inside the slot at the bottom
            const labelText = slot.charAt(0).toUpperCase() + slot.slice(1).replace(/([A-Z])/g, ' $1');
            const label = this.scene.add.text(pos.x, pos.y + (slotSize / 2) - (labelFontSize + 2), labelText, {
                font: `${labelFontSize}px Arial`,
                fill: '#aaaaaa'
            });
            label.setOrigin(0.5, 0);
            this.inventoryDisplay.add(label);

            // Item display container
            const itemDisplay = this.scene.add.container(pos.x, pos.y);
            this.inventoryDisplay.add(itemDisplay);

            // Sockets container
            const socketsContainer = this.scene.add.container(pos.x, pos.y + (slotSize / 2) + 12);
            this.inventoryDisplay.add(socketsContainer);

            this.equipmentSlots[slot] = {
                bg: slotBg,
                display: itemDisplay,
                socketsContainer: socketsContainer,
                label: label
            };
        });

        // Right side slots (top to bottom) - starting from top
        const rightSlots = ['hands', 'waist', 'legs', 'boots', 'ring1', 'ring2', 'trinket1', 'trinket2'];
        rightSlots.forEach((slot, index) => {
            const y = startY + (index * slotSpacing);
            const pos = { x: rightX, y: y };

            // Slot background
            const slotBg = this.scene.add.rectangle(pos.x, pos.y, slotSize, slotSize, 0x2a2a2a);
            slotBg.setStrokeStyle(2, 0x555555);
            this.inventoryDisplay.add(slotBg);

            // Slot label - inside the slot at the bottom
            const labelText = slot.charAt(0).toUpperCase() + slot.slice(1).replace(/([A-Z])/g, ' $1');
            const label = this.scene.add.text(pos.x, pos.y + (slotSize / 2) - (labelFontSize + 2), labelText, {
                font: `${labelFontSize}px Arial`,
                fill: '#aaaaaa'
            });
            label.setOrigin(0.5, 0);
            this.inventoryDisplay.add(label);

            // Item display container
            const itemDisplay = this.scene.add.container(pos.x, pos.y);
            this.inventoryDisplay.add(itemDisplay);

            // Sockets container
            const socketsContainer = this.scene.add.container(pos.x, pos.y + (slotSize / 2) + 12);
            this.inventoryDisplay.add(socketsContainer);

            this.equipmentSlots[slot] = {
                bg: slotBg,
                display: itemDisplay,
                socketsContainer: socketsContainer,
                label: label
            };
        });

        // Character model area (center) - positioned between equipment slots
        const charModelSize = Math.max(120, Math.min(160, panelWidth * 0.25));
        const charModelY = startY + (leftSlots.length * slotSpacing) / 2 - slotSpacing / 2;
        const charModelArea = this.scene.add.rectangle(0, charModelY, charModelSize, charModelSize * 1.2, 0x0a0a0a, 0.5);
        charModelArea.setStrokeStyle(2, 0x333333);
        this.inventoryDisplay.add(charModelArea);

        // Initialize inventory state
        this.currentTab = 'all';
        this.searchFilter = '';
        this.itemGrid = null;
        this.itemSlots = [];

        // Create initial item grid
        this.updateInventoryGrid();
    }

    /**
     * Opens a selection menu for inserting a gem into an item socket.
     * @param {string} itemId - ID of the item being socketed.
     * @param {number} socketIndex - Index of the target socket.
     * @param {string} socketType - Rarity/type of the socket.
     */
    openSocketMenu(itemId, socketIndex, socketType) {
        // Find gems in inventory
        const gems = this.inventory.filter(item => {
            const itemData = item.data || item;
            return itemData.isGem === true || itemData.type === 'damage' || itemData.type === 'utility' || itemData.type === 'support';
        });

        if (gems.length === 0) {
            this.showFloatingText(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY, 'No Gems in Inventory!', '#ff6666');
            return;
        }

        // Create a simple menu
        const menuWidth = 200;
        const menuHeight = Math.min(300, 40 + (gems.length * 40));
        const menuX = this.scene.cameras.main.centerX;
        const menuY = this.scene.cameras.main.centerY;

        const menuContainer = this.scene.add.container(menuX, menuY);
        menuContainer.setDepth(3000);

        const bg = this.scene.add.rectangle(0, 0, menuWidth, menuHeight, 0x000000, 0.9);
        bg.setStrokeStyle(2, 0xffff00);
        menuContainer.add(bg);

        const title = this.scene.add.text(0, -menuHeight / 2 + 15, `Select Gem for ${socketType.toUpperCase()}`, {
            font: 'bold 12px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        menuContainer.add(title);

        gems.forEach((gem, i) => {
            const gemData = gem.data || gem;
            const y = -menuHeight / 2 + 50 + (i * 40);
            
            const itemBtn = this.scene.add.rectangle(0, y, menuWidth - 20, 35, 0x333333);
            itemBtn.setInteractive({ useHandCursor: true });
            menuContainer.add(itemBtn);

            const gemText = this.scene.add.text(-menuWidth / 2 + 20, y, gemData.name, {
                font: '12px Arial',
                fill: '#ffffff'
            }).setOrigin(0, 0.5);
            menuContainer.add(gemText);

            itemBtn.on('pointerdown', () => {
                const success = this.scene.equipmentManager.socketGem(itemId, socketIndex, gemData.id);
                if (success) {
                    // Remove gem from inventory
                    this.removeFromInventory(gemData.id, 1);
                    this.updateInventoryDisplay();
                }
                menuContainer.destroy();
            });

            itemBtn.on('pointerover', () => itemBtn.setFillStyle(0x444444));
            itemBtn.on('pointerout', () => itemBtn.setFillStyle(0x333333));
        });

        // Close on click outside
        bg.setInteractive();
        const closeText = this.scene.add.text(0, menuHeight / 2 - 15, 'Cancel', { font: '10px Arial', fill: '#aaaaaa' }).setOrigin(0.5);
        closeText.setInteractive({ useHandCursor: true });
        closeText.on('pointerdown', () => menuContainer.destroy());
        menuContainer.add(closeText);
    }

    /**
     * Create tab system for inventory organization
     */
    createInventoryTabs(panelWidth, panelHeight) {
        const tabY = -panelHeight/2 + 60;
        const tabHeight = 30;
        const tabWidth = 80;
        const tabSpacing = 5;

        const tabs = [
            { id: 'all', label: 'All', color: 0xffffff },
            { id: 'weapons', label: 'Weapons', color: 0xff6b6b },
            { id: 'armor', label: 'Armor', color: 0x4ecdc4 },
            { id: 'consumables', label: 'Consumables', color: 0x45b7d1 }
        ];

        this.tabButtons = [];
        const startX = -((tabs.length - 1) * (tabWidth + tabSpacing)) / 2;

        tabs.forEach((tab, index) => {
            const tabX = startX + index * (tabWidth + tabSpacing);

            // Tab background
            const tabBg = this.scene.add.graphics();
            const isActive = tab.id === this.currentTab;
            tabBg.fillStyle(isActive ? 0x2a2a2a : 0x1a1a1a, 1);
            tabBg.fillRoundedRect(tabX - tabWidth/2, tabY - tabHeight/2, tabWidth, tabHeight, 4);
            tabBg.lineStyle(2, isActive ? 0xc9aa71 : 0x666666, 1);
            tabBg.strokeRoundedRect(tabX - tabWidth/2, tabY - tabHeight/2, tabWidth, tabHeight, 4);
            this.inventoryDisplay.add(tabBg);

            // Tab label
            const tabLabel = this.scene.add.text(tabX, tabY, tab.label, {
                font: 'bold 12px Arial',
                fill: `#${tab.color.toString(16).padStart(6, '0')}`,
                stroke: '#000000',
                strokeThickness: 1
            });
            tabLabel.setOrigin(0.5);
            this.inventoryDisplay.add(tabLabel);

            // Make tab interactive
            const hitArea = this.scene.add.zone(tabX, tabY, tabWidth, tabHeight);
            hitArea.setInteractive({ useHandCursor: true });
            this.inventoryDisplay.add(hitArea);

            hitArea.on('pointerdown', () => {
                this.switchTab(tab.id);
            });

            this.tabButtons.push({ bg: tabBg, label: tabLabel, hitArea: hitArea, tabId: tab.id });
        });
    }

    /**
     * Create search and filter controls
     */
    createInventoryControls(panelWidth, panelHeight) {
        const controlsY = -panelHeight/2 + 100;

        // Search box
        const searchBg = this.scene.add.graphics();
        searchBg.fillStyle(0x1a1a1a, 1);
        searchBg.fillRoundedRect(-panelWidth/2 + 20, controlsY - 15, panelWidth - 40, 30, 4);
        searchBg.lineStyle(1, 0x666666, 1);
        searchBg.strokeRoundedRect(-panelWidth/2 + 20, controlsY - 15, panelWidth - 40, 30, 4);
        this.inventoryDisplay.add(searchBg);

        // Search icon
        const searchIcon = this.scene.add.text(-panelWidth/2 + 35, controlsY, '🔍', {
            font: '16px Arial'
        });
        this.inventoryDisplay.add(searchIcon);

        // Search input text (placeholder)
        this.searchText = this.scene.add.text(-panelWidth/2 + 60, controlsY, 'Search items...', {
            font: '14px Arial',
            fill: '#888888'
        });
        this.inventoryDisplay.add(this.searchText);

        // Make search area interactive for focus
        const searchHitArea = this.scene.add.zone(-panelWidth/2 + panelWidth/2, controlsY, panelWidth - 40, 30);
        searchHitArea.setInteractive({ useHandCursor: true });
        this.inventoryDisplay.add(searchHitArea);

        searchHitArea.on('pointerdown', () => {
            // In a real implementation, this would focus a text input
            // For now, just show visual feedback
            searchBg.clear();
            searchBg.fillStyle(0x2a2a2a, 1);
            searchBg.fillRoundedRect(-panelWidth/2 + 20, controlsY - 15, panelWidth - 40, 30, 4);
            searchBg.lineStyle(2, 0xc9aa71, 1);
            searchBg.strokeRoundedRect(-panelWidth/2 + 20, controlsY - 15, panelWidth - 40, 30, 4);

            this.scene.time.delayedCall(200, () => {
                searchBg.clear();
                searchBg.fillStyle(0x1a1a1a, 1);
                searchBg.fillRoundedRect(-panelWidth/2 + 20, controlsY - 15, panelWidth - 40, 30, 4);
                searchBg.lineStyle(1, 0x666666, 1);
                searchBg.strokeRoundedRect(-panelWidth/2 + 20, controlsY - 15, panelWidth - 40, 30, 4);
            });
        });

        // Item counter
        this.itemCounter = this.scene.add.text(panelWidth/2 - 20, controlsY, '0/50 items', {
            font: '12px Arial',
            fill: '#aaaaaa'
        });
        this.itemCounter.setOrigin(1, 0.5);
        this.inventoryDisplay.add(this.itemCounter);
    }

    /**
     * Switch to a different inventory tab
     */
    switchTab(tabId) {
        this.currentTab = tabId;

        // Update tab appearances
        this.tabButtons.forEach(button => {
            const isActive = button.tabId === tabId;
            button.bg.clear();
            button.bg.fillStyle(isActive ? 0x2a2a2a : 0x1a1a1a, 1);
            button.bg.fillRoundedRect(button.bg.x - 40, button.bg.y - 15, 80, 30, 4);
            button.bg.lineStyle(2, isActive ? 0xc9aa71 : 0x666666, 1);
            button.bg.strokeRoundedRect(button.bg.x - 40, button.bg.y - 15, 80, 30, 4);
        });

        // Refresh item display
        this.updateInventoryGrid();
    }

    /**
     * Create or update the inventory item grid
     */
    updateInventoryGrid() {
        // Clear existing grid
        if (this.itemGrid) {
            this.itemGrid.removeAll(true);
        }

        const panelWidth = 480;
        const panelHeight = 600;
        const gridStartY = -panelHeight/2 + 140;
        const itemSize = 48;
        const itemsPerRow = 6;
        const itemSpacing = 8;

        this.itemGrid = this.scene.add.container(0, gridStartY);
        this.inventoryDisplay.add(this.itemGrid);

        // Filter items based on current tab and search
        let filteredItems = this.inventory;

        // Apply tab filter
        if (this.currentTab !== 'all') {
            const tabFilters = {
                'weapons': ['mainhand', 'offhand', 'ranged'],
                'armor': ['head', 'neck', 'shoulder', 'cloak', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet'],
                'consumables': ['consumable', 'potion', 'drink']
            };

            const allowedTypes = tabFilters[this.currentTab] || [];
            filteredItems = filteredItems.filter(item => {
                if (!item || !item.type) return false;
                return allowedTypes.some(type => item.type.toLowerCase().includes(type.toLowerCase()));
            });
        }

        // Apply search filter
        if (this.searchFilter) {
            filteredItems = filteredItems.filter(item =>
                item && item.name && item.name.toLowerCase().includes(this.searchFilter.toLowerCase())
            );
        }

        // Update counter
        if (this.itemCounter) {
            this.itemCounter.setText(`${filteredItems.length}/${this.inventory.length} items`);
        }

        // Create item slots
        const maxRows = 6;
        const maxItems = itemsPerRow * maxRows;

        for (let i = 0; i < maxItems; i++) {
            const row = Math.floor(i / itemsPerRow);
            const col = i % itemsPerRow;

            const itemX = -((itemsPerRow - 1) * (itemSize + itemSpacing)) / 2 + col * (itemSize + itemSpacing);
            const itemY = row * (itemSize + itemSpacing);

            // Item slot background
            const slotBg = this.scene.add.graphics();
            slotBg.fillStyle(0x1a1a1a, 1);
            slotBg.fillRoundedRect(itemX - itemSize/2, itemY - itemSize/2, itemSize, itemSize, 3);
            slotBg.lineStyle(1, 0x444444, 1);
            slotBg.strokeRoundedRect(itemX - itemSize/2, itemY - itemSize/2, itemSize, itemSize, 3);
            this.itemGrid.add(slotBg);

            const item = filteredItems[i];
            if (item) {
                // Item icon (placeholder - would use actual item sprite)
                const itemIcon = this.scene.add.text(itemX, itemY, this.getItemIcon(item), {
                    font: '24px Arial'
                });
                this.itemGrid.add(itemIcon);

                // Make item interactive
                const hitArea = this.scene.add.zone(itemX, itemY, itemSize, itemSize);
                hitArea.setInteractive({ useHandCursor: true });
                this.itemGrid.add(hitArea);

                // Tooltip on hover
                hitArea.on('pointerover', () => {
                    if (this.scene.tooltipManager) {
                        this.scene.tooltipManager.showItemTooltip(item, this.inventoryDisplay.x + itemX, this.inventoryDisplay.y + gridStartY + itemY);
                    }
                });

                hitArea.on('pointerout', () => {
                    if (this.scene.tooltipManager) {
                        this.scene.tooltipManager.hideTooltip();
                    }
                });

                // Right-click context menu
                hitArea.on('pointerdown', (pointer) => {
                    if (pointer.rightButtonDown()) {
                        this.showItemContextMenu(item, itemX, gridStartY + itemY);
                    }
                });
            }
        }
    }

    /**
     * Get icon representation for an item
     */
    getItemIcon(item) {
        if (!item || !item.type) return '?';

        const iconMap = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'consumable': '🧪',
            'potion': '🧪',
            'drink': '🥤',
            'mainhand': '⚔️',
            'offhand': '🛡️',
            'ranged': '🏹',
            'head': '⛑️',
            'chest': '👕',
            'legs': '👖',
            'feet': '👢'
        };

        return iconMap[item.type.toLowerCase()] || '📦';
    }

    /**
     * Show context menu for an item
     */
    showItemContextMenu(item, x, y) {
        // Simple context menu options
        const options = ['Use', 'Equip', 'Drop', 'Info'];

        // For now, just log the action - in a full implementation this would show a menu
        console.log(`Context menu for ${item.name}:`, options);
    }

    /**
     * Updates the preview character model in the character sheet using dynamic texture generation.
     * @returns {Promise<void>}
     */
    async updateHeroModelDisplay() {
        if (!this.inventoryDisplay) return;

        // Remove old hero sprite if exists
        if (this.heroModelSprite) {
            this.heroModelSprite.destroy();
            this.heroModelSprite = null;
        }

        // Get current equipment and generate hero sprite
        if (this.scene.equipmentManager) {
            const equipment = this.scene.equipmentManager.getEquipment();
            const itemsData = this.scene.cache.json.get('items');

            // Generate sprite using RuntimePaladinGenerator
            try {
                const generator = new RuntimePaladinGenerator(this.scene);
                const textureKey = generator.generate(equipment, itemsData);

                // Wait for texture to be ready to avoid glTexture errors
                const isReady = await waitForTexture(this.scene, textureKey);

                // Safety check: is panel still visible and valid?
                if (!this.inventoryDisplay || !this.inventoryDisplay.visible) {
                    return;
                }

                if (isReady) {
                    const charModelSize = Math.max(120, Math.min(160, this.scene.cameras.main.width * 0.25));

                    const heroSprite = this.scene.add.sprite(0, 0, textureKey);

                    // Scale to fit constraints while maintaining aspect ratio
                    const scale = charModelSize / Math.max(heroSprite.width, heroSprite.height);
                    heroSprite.setScale(scale);

                    this.inventoryDisplay.add(heroSprite);
                    this.heroModelSprite = heroSprite;
                } else {
                    throw new Error('Texture timeout');
                }
            } catch (error) {
                Logger.error('LootManager', 'Error generating hero model:', error);
                // Fallback placeholder
                const charModelSize = Math.max(120, Math.min(160, this.scene.cameras.main.width * 0.25));
                const placeholder = this.scene.add.text(0, 0, '⚔', {
                    font: `${charModelSize}px Arial`,
                    fill: '#666666'
                });
                placeholder.setOrigin(0.5);
                this.inventoryDisplay.add(placeholder);
                this.heroModelSprite = placeholder;
            }
        }
    }

    /**
     * Refreshes the inventory grid and equipment slots in the character sheet.
     */
    updateInventoryDisplay() {
        if (!this.inventoryDisplay) {
            this.createInventoryDisplay();
            return;
        }

        // Update the modern tabbed inventory grid
        this.updateInventoryGrid();
    }

    /**
     * Legacy updateInventoryDisplay method - replaced by modern version above
     */
    _oldUpdateInventoryDisplay() {
        if (!this.inventoryDisplay) {
            this.createInventoryDisplay();
            return;
        }

        // Update inventory title
        if (this.inventoryTitle) {
            this.inventoryTitle.setText(`Inventory (${this.inventory.length}/${this.maxInventorySize})`);
        }

        // Update hero model display
        this.updateHeroModelDisplay();

        // Update equipment slots with currently equipped items
        if (this.equipmentSlots && this.scene.equipmentManager) {
            const equipment = this.scene.equipmentManager.getEquipment();

            for (const [slot, slotDisplay] of Object.entries(this.equipmentSlots)) {
                // Clear existing item and sockets
                slotDisplay.display.removeAll(true);
                if (slotDisplay.socketsContainer) {
                    slotDisplay.socketsContainer.removeAll(true);
                }

                const itemId = equipment[slot];
                if (itemId) {
                    const itemData = this.getItemData(itemId);
                    if (itemData) {
                        // ... existing item sprite logic ...
                        const textureKey = `item-icon-${itemData.id}`;
                        let itemSprite;

                        if (this.scene.textures.exists(textureKey)) {
                            itemSprite = this.scene.add.sprite(0, 0, textureKey);
                            itemSprite.setScale(0.8);
                        } else {
                            // Fallback to placeholder icon
                            const colors = {
                                common: 0x888888,
                                uncommon: 0x00ff00,
                                rare: 0x0088ff,
                                legendary: 0xff8800
                            };
                            const color = colors[itemData.rarity] || 0x888888;
                            const placeholderKey = getPlaceholderKey(this.scene, 'item');
                            const safeKey = ensurePlaceholderTexture(this.scene, {
                                key: placeholderKey,
                                width: 32,
                                height: 32,
                                color: 0x4a4a4a,
                                borderColor: 0xffffff,
                                crossColor: 0xdedede
                            });
                            itemSprite = this.scene.add.sprite(0, 0, safeKey);
                            itemSprite.setDisplaySize(40, 40);
                            itemSprite.setTint(color);
                        }

                        slotDisplay.display.add(itemSprite);

                        // Item level text
                        if (itemData.level) {
                            const levelText = this.scene.add.text(0, 18, itemData.level.toString(), {
                                font: 'bold 10px Arial',
                                fill: '#ffff00',
                                stroke: '#000000',
                                strokeThickness: 1
                            });
                            levelText.setOrigin(0.5);
                            slotDisplay.display.add(levelText);
                        }

                        // Display Sockets
                        if (itemData.sockets && slotDisplay.socketsContainer) {
                            const socketSize = 10;
                            const socketSpacing = 12;
                            const totalWidth = (itemData.sockets.length - 1) * socketSpacing;
                            const startX = -totalWidth / 2;

                            const socketColors = {
                                red: 0xff0000,
                                blue: 0x0088ff,
                                yellow: 0xffff00,
                                meta: 0xffffff
                            };

                            itemData.sockets.forEach((socketType, i) => {
                                const gemId = itemData.socketedGems ? itemData.socketedGems[i] : null;
                                const color = socketColors[socketType] || 0x888888;
                                const x = startX + (i * socketSpacing);

                                // Outer ring (socket)
                                const socketRing = this.scene.add.arc(x, 0, socketSize / 2, 0, 360, false, 0x000000);
                                socketRing.setStrokeStyle(1, color);
                                slotDisplay.socketsContainer.add(socketRing);

                                if (gemId) {
                                    // Gem inside socket
                                    const gemGlow = this.scene.add.arc(x, 0, socketSize / 3, 0, 360, false, color, 0.8);
                                    slotDisplay.socketsContainer.add(gemGlow);
                                }

                                // Make socket interactive
                                socketRing.setInteractive({ useHandCursor: true });
                                socketRing.on('pointerdown', (pointer) => {
                                    pointer.event.stopPropagation();
                                    this.openSocketMenu(itemId, i, socketType);
                                });
                            });
                        }
                    }
                }
            }
        }

        // Update stats
        if (this.statsTexts && this.scene.equipmentManager) {
            const stats = this.scene.equipmentManager.getStats();
            if (this.statsTexts.hp) this.statsTexts.hp.setText(`${stats.health}/${stats.maxHealth}`);
            if (this.statsTexts.atk) this.statsTexts.atk.setText(stats.attack.toString());
            if (this.statsTexts.def) this.statsTexts.def.setText(stats.defense.toString());
        }

        // Clear all inventory slots
        if (this.inventorySlots) {
            this.inventorySlots.forEach(slot => {
                slot.display.removeAll(true);
                slot.item = null;
            });

            // Populate slots with inventory items
            this.inventory.forEach((item, index) => {
                if (index >= this.inventorySlots.length) return;

            const slot = this.inventorySlots[index];
            slot.item = item;

            // Clear display
            slot.display.removeAll(true);

            // Create item icon
            const itemData = item.data || item;
            const itemId = itemData.id;
            if (!itemId) return;

            const textureKey = `item-icon-${itemId}`;
            let itemSprite;

            if (this.scene.textures.exists(textureKey)) {
                itemSprite = this.scene.add.sprite(0, 0, textureKey);
                itemSprite.setScale(0.7);
            } else {
                // Fallback to placeholder icon
                const colors = {
                    common: 0x888888,
                    uncommon: 0x00ff00,
                    rare: 0x0088ff,
                    epic: 0xa335ee, // Standard purple for epic
                    legendary: 0xff8800
                };
                const rarity = itemData.rarity || item.quality || 'common';
                const color = colors[rarity] || 0x888888;
                const placeholderKey = getPlaceholderKey(this.scene, 'item');
                const safeKey = ensurePlaceholderTexture(this.scene, {
                    key: placeholderKey,
                    width: 32,
                    height: 32,
                    color: 0x4a4a4a,
                    borderColor: 0xffffff,
                    crossColor: 0xdedede
                });
                itemSprite = this.scene.add.sprite(0, 0, safeKey);
                itemSprite.setDisplaySize(28, 28);
                itemSprite.setTint(color);
            }

            slot.display.add(itemSprite);

            // Item level text - added this
            if (itemData.level || itemData.itemLevel) {
                const ilvl = itemData.itemLevel || itemData.level;
                const ilvlText = this.scene.add.text(-12, -12, ilvl.toString(), {
                    font: 'bold 9px Arial',
                    fill: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 2
                });
                ilvlText.setOrigin(0, 0);
                slot.display.add(ilvlText);
            }

            // Quantity text if > 1
            if (item.quantity > 1) {
                const qtyText = this.scene.add.text(12, 12, item.quantity.toString(), {
                    font: 'bold 9px Arial',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                });
                qtyText.setOrigin(1, 1);
                slot.display.add(qtyText);
            }

            // Make slot interactive for tooltip/equip
            slot.bg.setInteractive({ useHandCursor: true });
            
            // Add click-to-equip functionality
            slot.bg.on('pointerdown', () => {
                if (itemData.slot && this.scene.equipmentManager) {
                    const idToEquip = itemData.instanceId || itemId;
                    this.scene.equipmentManager.equipItem(idToEquip, itemData.slot);
                    // Remove from inventory after equipping
                    this.removeFromInventory(itemId, 1);
                    this.updateInventoryDisplay();
                }
            });

            slot.bg.on('pointerover', () => {
                slot.bg.setStrokeStyle(2, 0xffff00);
                if (this.scene.tooltipManager) {
                    // Calculate absolute position for tooltip
                    const worldX = this.inventoryContainer.x + slot.bg.x;
                    const worldY = this.inventoryContainer.y + slot.bg.y;
                    this.scene.tooltipManager.showItemTooltip(itemData, worldX, worldY);
                }
            });
            slot.bg.on('pointerout', () => {
                slot.bg.setStrokeStyle(1, 0x444444);
                if (this.scene.tooltipManager) {
                    this.scene.tooltipManager.hideTooltip();
                }
            });
        });
        }
    }

    /**
     * Toggles the visibility of the inventory and character sheet panels.
     * @returns {boolean} The new visibility state.
     */
    toggleInventoryDisplay() {
        if (!this.inventoryDisplay) {
            this.createInventoryDisplay();
        }

        if (!this.inventoryDisplay) {
            Logger.warn('LootManager', 'inventoryDisplay does not exist even after creation');
            return false;
        }

        const currentVisible = this.inventoryDisplay.visible;
        const newVisible = !currentVisible;

        // Set visibility on the container
        this.inventoryDisplay.setVisible(newVisible);

        // Also hide tooltips when closing
        if (!newVisible && this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }

        // Also toggle stats display and inventory container
        if (this.statsDisplay) {
            this.statsDisplay.setVisible(newVisible);
        }
        if (this.inventoryContainer) {
            this.inventoryContainer.setVisible(newVisible);
        }

        // Only update display when opening, not when closing
        if (newVisible) {
            // Use a small delay to ensure visibility is set before updating
            this.scene.time.delayedCall(10, () => {
                if (this.inventoryDisplay && this.inventoryDisplay.visible) {
                    this.updateInventoryDisplay();
                }
            });
        }

        return newVisible;
    }

    /**
     * Cleans up the LootManager and its associated UI elements and sprites.
     */
    destroy() {
        this.clearActiveLoot();
        this.inventory = [];

        // Clean up sprites using Group pooling
        this.lootSprites.forEach((sprite, lootItem) => {
            if (sprite.label) {
                sprite.label.destroy();
            }

            // Kill sprite instead of destroying (makes it available for Group pooling)
            if (this.lootSpriteGroup && this.lootSpriteGroup.contains(sprite)) {
                sprite.setActive(false);
                sprite.setVisible(false);
            } else {
                sprite.destroy();
            }
        });

        this.lootSprites.clear();

        // Clear Group
        if (this.lootSpriteGroup) {
            this.lootSpriteGroup.clear(true, true);
            this.lootSpriteGroup = null;
        }

        if (this.inventoryDisplay) {
            this.inventoryDisplay.destroy();
            this.inventoryDisplay = null;
        }

        if (this.statsDisplay) {
            this.statsDisplay.destroy();
            this.statsDisplay = null;
        }

        if (this.inventoryContainer) {
            this.inventoryContainer.destroy();
            this.inventoryContainer = null;
        }

        // Remove event listeners
        this.scene.events.off(GameEvents.ITEM.DROPPED);
        this.scene.events.off(GameEvents.COMBAT.END);

        Logger.debug('LootManager', 'Destroyed');
    }
}

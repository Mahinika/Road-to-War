import Phaser from 'phaser';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { GameEvents } from '../utils/event-constants.js';
import { BaseManager } from './base-manager.js';

/**
 * Shop Manager - Handles merchant encounters and item purchasing
 * Manages shop interface, gold economy, and item transactions
 */

export class ShopManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // ShopManager has no dependencies
    }

    constructor(scene, config = {}) {
        super(scene, config);
        this.itemsData = this.scene.cache.json.get('items');
        this.worldConfig = this.scene.cache.json.get('worldConfig');
        
        // Shop state
        this.isShopOpen = false;
        this.currentShopType = null;
        this.playerGold = 100; // Starting gold
        this.shopInventory = [];
        
        // UI elements
        this.shopContainer = null;
        this.itemButtons = [];
        this.selectedItem = null;
        
        // Events
        this.setupEventListeners();
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        Logger.info('ShopManager', 'Initialized');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for shop encounter events
        this.scene.events.on('shop_encounter', (data) => {
            this.openShop(data.shopType || 'general');
        });

        // Listen for gold changes
        this.scene.events.on(GameEvents.ECONOMY.GOLD_CHANGED, (data) => {
            this.updateGoldDisplay(data.gold);
        });
    }

    /**
     * Open shop with specified type
     * @param {string} shopType - Type of shop ('general', 'weapons', 'armor', 'accessories')
     */
    openShop(shopType = 'general') {
        if (this.isShopOpen) return;
        
        this.isShopOpen = true;
        this.currentShopType = shopType;
        
        // Generate shop inventory
        this.generateShopInventory(shopType);
        
        // Create shop UI
        this.createShopUI();
        
        // Pause game
        this.scene.scene.pause();
        
        Logger.info('ShopManager', `Opened ${shopType} shop`);
    }

    /**
     * Close shop
     */
    closeShop() {
        if (!this.isShopOpen) return;
        
        this.isShopOpen = false;
        this.currentShopType = null;
        this.selectedItem = null;
        
        // Hide tooltips
        if (this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }
        
        // Clean up UI
        this.cleanupShopUI();
        
        // Resume game
        this.scene.scene.resume();
        
        Logger.info('ShopManager', 'Closed shop');
    }

    /**
     * Generate shop inventory based on type
     * @param {string} shopType - Type of shop
     */
    generateShopInventory(shopType) {
        this.shopInventory = [];
        
        // Get items based on shop type
        let availableItems = [];
        
        switch (shopType) {
            case 'weapons':
                availableItems = Object.values(this.itemsData.weapons || {});
                break;
            case 'armor':
                availableItems = Object.values(this.itemsData.armor || {});
                break;
            case 'accessories':
                availableItems = Object.values(this.itemsData.accessories || {});
                break;
            case 'general':
            default:
                // Mix of all items
                availableItems = [
                    ...Object.values(this.itemsData.weapons || {}),
                    ...Object.values(this.itemsData.armor || {}),
                    ...Object.values(this.itemsData.accessories || {})
                ];
                break;
        }
        
        // Select random items for shop (5-8 items)
        const shopSize = Phaser.Math.Between(5, 8);
        const shuffled = availableItems.sort(() => Math.random() - 0.5);
        this.shopInventory = shuffled.slice(0, shopSize).map(item => ({
            ...item,
            shopPrice: Math.floor(item.sellValue * 1.5), // 50% markup
            stock: Phaser.Math.Between(1, 3) // Random stock
        }));
    }

    /**
     * Create shop UI
     */
    createShopUI() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Responsive sizing - adapts to window size
        const shopWidth = Math.max(500, Math.min(700, width * 0.7));
        const shopHeight = Math.max(350, Math.min(500, height * 0.65));
        
        // Responsive font sizes
        const titleFontSize = Math.max(18, Math.min(24, height / 32));
        const bodyFontSize = Math.max(14, Math.min(18, height / 43));
        const buttonFontSize = Math.max(16, Math.min(20, height / 38));
        
        // Main container
        this.shopContainer = this.scene.add.container(centerX, centerY);
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, shopWidth, shopHeight, 0x1a1a1a, 0.95);
        bg.setStrokeStyle(3, 0x444444);
        this.shopContainer.add(bg);
        
        // Title - desktop positioning
        const titleY = -(shopHeight / 2) + (titleFontSize + 10);
        const titleText = this.scene.add.text(0, titleY, `Shop - ${this.currentShopType.charAt(0).toUpperCase() + this.currentShopType.slice(1)}`, {
            font: `bold ${titleFontSize}px Arial`,
            fill: '#ffffff'
        });
        titleText.setOrigin(0.5);
        this.shopContainer.add(titleText);
        
        // Gold display - desktop positioning
        const goldX = shopWidth * 0.3;
        this.goldDisplay = this.scene.add.text(goldX, titleY, `Gold: ${this.playerGold}`, {
            font: `bold ${bodyFontSize}px Arial`,
            fill: '#ffff00'
        });
        this.goldDisplay.setOrigin(0.5);
        this.shopContainer.add(this.goldDisplay);
        
        // Close button - desktop positioning
        const closeX = (shopWidth / 2) - 30;
        const closeButton = this.scene.add.text(closeX, titleY, 'X', {
            font: `bold ${buttonFontSize}px Arial`,
            fill: '#ff6666'
        });
        closeButton.setOrigin(0.5);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => this.closeShop());
        this.shopContainer.add(closeButton);
        
        // Store desktop-optimized values for item list creation
        this.shopUIProps = {
            shopWidth,
            shopHeight,
            titleFontSize,
            bodyFontSize,
            buttonFontSize,
            titleY
        };
        
        // Item list area
        this.createItemList();
        
        // Item details area
        this.createItemDetails();
        
        // Make container fixed to camera
        this.shopContainer.setScrollFactor(0);
    }

    /**
     * Create item list in shop
     */
    createItemList() {
        if (!this.shopUIProps) {
            // Fallback to defaults if props not set
            this.shopUIProps = {
                shopWidth: 600,
                shopHeight: 400,
                titleFontSize: 24,
                bodyFontSize: 18,
                buttonFontSize: 20,
                titleY: -170
            };
        }
        
        const { shopWidth, shopHeight, titleFontSize, bodyFontSize, titleY } = this.shopUIProps;
        
        // Responsive positioning
        const listWidth = shopWidth * 0.4;
        const listHeight = shopHeight * 0.75;
        const startX = -(shopWidth / 2) + (listWidth / 2) + 20;
        const startY = titleY + titleFontSize + 30;
        const itemHeight = Math.max(30, Math.min(40, shopHeight / 12));
        
        // Item list background
        const listBg = this.scene.add.rectangle(startX, startY + (listHeight / 2), listWidth, listHeight, 0x2a2a2a);
        listBg.setStrokeStyle(2, 0x333333);
        this.shopContainer.add(listBg);
        
        // Create item buttons
        this.shopInventory.forEach((item, index) => {
            const y = startY + index * itemHeight + itemHeight;
            
            // Item button
            const buttonWidth = listWidth - 20;
            const button = this.scene.add.rectangle(startX, y, buttonWidth, itemHeight * 0.875, 0x444444);
            button.setStrokeStyle(1, 0x666666);
            button.setInteractive({ useHandCursor: true });
            
            // Item text
            const rarityColors = {
                common: '#888888',
                uncommon: '#00ff00',
                rare: '#0088ff',
                legendary: '#ff8800'
            };
            
            const itemTextSize = Math.max(11, Math.min(14, bodyFontSize * 0.75));
            const itemText = this.scene.add.text(startX - (buttonWidth / 2) + 10, y, `${item.name} - ${item.shopPrice}g`, {
                font: `${itemTextSize}px Arial`,
                fill: rarityColors[item.rarity] || '#ffffff'
            });
            itemText.setOrigin(0, 0.5);
            
            // Stock indicator
            const stockTextSize = Math.max(10, Math.min(12, bodyFontSize * 0.65));
            const stockText = this.scene.add.text(startX + (buttonWidth / 2) - 10, y, `x${item.stock}`, {
                font: `${stockTextSize}px Arial`,
                fill: '#aaaaaa'
            });
            stockText.setOrigin(1, 0.5);
            
            // Button interactions
            button.on('pointerover', () => {
                button.setFillStyle(0x555555);
                this.showItemDetails(item);
            });
            
            button.on('pointerout', () => {
                button.setFillStyle(0x444444);
            });
            
            button.on('pointerdown', () => {
                this.selectItem(item);
            });
            
            // Store references
            this.itemButtons.push({
                button: button,
                text: itemText,
                stockText: stockText,
                item: item
            });
            
            this.shopContainer.add(button);
            this.shopContainer.add(itemText);
            this.shopContainer.add(stockText);
        });
    }

    /**
     * Create item details display area
     */
    createItemDetails() {
        if (!this.shopUIProps) {
            // Fallback to defaults
            this.shopUIProps = {
                shopWidth: 600,
                shopHeight: 400,
                titleFontSize: 24,
                bodyFontSize: 18,
                buttonFontSize: 20,
                titleY: -170
            };
        }
        
        const { shopWidth, shopHeight, titleFontSize, bodyFontSize, buttonFontSize, titleY } = this.shopUIProps;
        
        // Responsive positioning - right side of shop
        const detailsWidth = shopWidth * 0.45;
        const detailsHeight = shopHeight * 0.75;
        const x = (shopWidth / 2) - (detailsWidth / 2) - 20;
        const y = titleY + titleFontSize + 30;
        const centerX = x + (detailsWidth / 2);
        
        // Details background
        const detailsBg = this.scene.add.rectangle(centerX, y + (detailsHeight / 2), detailsWidth, detailsHeight, 0x2a2a2a);
        detailsBg.setStrokeStyle(2, 0x333333);
        this.shopContainer.add(detailsBg);
        
        // Item name
        const nameY = y + (bodyFontSize + 10);
        this.itemNameText = this.scene.add.text(centerX, nameY, 'Select an item', {
            font: `bold ${bodyFontSize}px Arial`,
            fill: '#ffffff'
        });
        this.itemNameText.setOrigin(0.5);
        this.shopContainer.add(this.itemNameText);
        
        // Item stats
        const statsY = nameY + (bodyFontSize + 20);
        const statsFontSize = Math.max(11, Math.min(14, bodyFontSize * 0.8));
        this.itemStatsText = this.scene.add.text(centerX - (detailsWidth / 2) + 15, statsY, '', {
            font: `${statsFontSize}px Arial`,
            fill: '#aaaaaa'
        });
        this.itemStatsText.setOrigin(0, 0);
        this.shopContainer.add(this.itemStatsText);
        
        // Item description
        const descY = statsY + 80;
        const descFontSize = Math.max(10, Math.min(12, bodyFontSize * 0.7));
        const descWidth = detailsWidth - 30;
        this.itemDescText = this.scene.add.text(centerX - (detailsWidth / 2) + 15, descY, '', {
            font: `${descFontSize}px Arial`,
            fill: '#888888',
            wordWrap: { width: descWidth }
        });
        this.itemDescText.setOrigin(0, 0);
        this.shopContainer.add(this.itemDescText);
        
        // Buy button
        const buyButtonY = y + detailsHeight - 50;
        const buyButtonWidth = Math.max(100, Math.min(150, detailsWidth * 0.5));
        const buyButtonHeight = Math.max(35, Math.min(45, shopHeight * 0.1));
        this.buyButton = this.scene.add.rectangle(centerX, buyButtonY, buyButtonWidth, buyButtonHeight, 0x006600);
        this.buyButton.setStrokeStyle(2, 0x00aa00);
        this.buyButton.setInteractive({ useHandCursor: true });
        
        const buyButtonTextSize = Math.max(14, Math.min(16, buttonFontSize * 0.85));
        this.buyButtonText = this.scene.add.text(centerX, buyButtonY, 'Buy', {
            font: `bold ${buyButtonTextSize}px Arial`,
            fill: '#ffffff'
        });
        this.buyButtonText.setOrigin(0.5);
        
        this.buyButton.on('pointerdown', () => {
            this.buySelectedItem();
        });
        
        this.buyButton.on('pointerover', () => {
            this.buyButton.setFillStyle(0x008800);
        });
        
        this.buyButton.on('pointerout', () => {
            this.buyButton.setFillStyle(0x006600);
        });
        
        this.shopContainer.add(this.buyButton);
        this.shopContainer.add(this.buyButtonText);
        
        // Initially disable buy button
        this.updateBuyButton(false);
    }

    /**
     * Show item details in the details panel
     * @param {Object} item - Item to show details for
     */
    showItemDetails(item) {
        this.itemNameText.setText(item.name);
        
        // Format stats
        const stats = [];
        if (item.stats.attack > 0) stats.push(`ATK: +${item.stats.attack}`);
        if (item.stats.defense > 0) stats.push(`DEF: +${item.stats.defense}`);
        if (item.stats.health > 0) stats.push(`HP: +${item.stats.health}`);
        
        const statsText = stats.length > 0 ? stats.join(', ') : 'No stats';
        this.itemStatsText.setText(`Stats: ${statsText}`);
        
        // Description
        this.itemDescText.setText(item.description || 'No description available');
    }

    /**
     * Select an item for purchase
     * @param {Object} item - Item to select
     */
    selectItem(item) {
        this.selectedItem = item;
        this.showItemDetails(item);
        this.updateBuyButton(true);
    }

    /**
     * Update buy button state
     * @param {boolean} hasSelection - Whether an item is selected
     */
    updateBuyButton(hasSelection) {
        if (!hasSelection || !this.selectedItem) {
            this.buyButton.setFillStyle(0x444444);
            this.buyButton.setStrokeStyle(2, 0x666666);
            this.buyButtonText.setText('Select Item');
            this.buyButton.disableInteractive();
            return;
        }
        
        const canAfford = this.playerGold >= this.selectedItem.shopPrice;
        const hasStock = this.selectedItem.stock > 0;
        
        if (canAfford && hasStock) {
            this.buyButton.setFillStyle(0x006600);
            this.buyButton.setStrokeStyle(2, 0x00aa00);
            this.buyButtonText.setText(`Buy (${this.selectedItem.shopPrice}g)`);
            this.buyButton.setInteractive();
        } else {
            this.buyButton.setFillStyle(0x664444);
            this.buyButton.setStrokeStyle(2, 0x886666);
            
            if (!canAfford) {
                this.buyButtonText.setText('Not Enough Gold');
            } else if (!hasStock) {
                this.buyButtonText.setText('Out of Stock');
            }
            
            this.buyButton.disableInteractive();
        }
    }

    /**
     * Buy selected item
     */
    buySelectedItem() {
        if (!this.selectedItem) return;
        
        const item = this.selectedItem;
        const price = item.shopPrice;
        
        // Check if player can afford
        if (this.playerGold < price) {
            this.showShopMessage('Not enough gold!', '#ff6666');
            return;
        }
        
        // Check stock
        if (item.stock <= 0) {
            this.showShopMessage('Item out of stock!', '#ff6666');
            return;
        }
        
        // Process purchase
        this.playerGold -= price;
        item.stock--;
        
        // Add to inventory (emit event to loot manager)
        this.scene.events.emit(GameEvents.ITEM.PURCHASED, {
            item: {
                id: item.id,
                data: item,
                quantity: 1
            }
        });
        
        // Update displays
        this.updateGoldDisplay(this.playerGold);
        this.updateBuyButton(true);
        this.updateStockDisplay();
        
        // Show success message
        this.showShopMessage(`Purchased ${item.name}!`, '#00ff00');
        
        // Emit gold change event
        this.scene.events.emit(GameEvents.ECONOMY.GOLD_CHANGED, { gold: this.playerGold });
        
        Logger.info('ShopManager', `Purchased ${item.name} for ${price} gold`);
    }

    /**
     * Update gold display
     * @param {number} gold - New gold amount
     */
    updateGoldDisplay(gold) {
        this.playerGold = gold;
        if (this.goldDisplay) {
            this.goldDisplay.setText(`Gold: ${gold}`);
        }
    }

    /**
     * Update stock display for all items
     */
    updateStockDisplay() {
        this.itemButtons.forEach(buttonData => {
            if (buttonData.item) {
                buttonData.stockText.setText(`x${buttonData.item.stock}`);
            }
        });
    }

    /**
     * Show shop message
     * @param {string} message - Message to show
     * @param {string} color - Message color
     */
    showShopMessage(message, color = '#ffffff') {
        const messageText = this.scene.add.text(0, 150, message, {
            font: 'bold 16px Arial',
            fill: color,
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        messageText.setOrigin(0.5);
        this.shopContainer.add(messageText);
        
        // Animate and remove
        this.scene.tweens.add({
            targets: messageText,
            alpha: { from: 1, to: 0 },
            duration: 2000,
            ease: 'Quad.easeOut',
            onComplete: () => {
                messageText.destroy();
            }
        });
    }

    /**
     * Clean up shop UI
     */
    cleanupShopUI() {
        if (this.shopContainer) {
            this.shopContainer.destroy();
            this.shopContainer = null;
        }
        
        this.itemButtons = [];
        this.selectedItem = null;
    }

    /**
     * Get current player gold
     * @returns {number} - Current gold amount
     */
    getPlayerGold() {
        return this.playerGold;
    }

    /**
     * Set player gold
     * @param {number} gold - Gold amount to set
     */
    setPlayerGold(gold) {
        this.playerGold = gold;
        if (this.goldDisplay) {
            this.updateGoldDisplay(gold);
        }
    }

    /**
     * Add gold to player
     * @param {number} amount - Amount of gold to add
     */
    addGold(amount) {
        this.playerGold += amount;
        this.updateGoldDisplay(this.playerGold);
        this.scene.events.emit(GameEvents.ECONOMY.GOLD_CHANGED, { gold: this.playerGold });
    }

    /**
     * Check if shop is open
     * @returns {boolean} - True if shop is open
     */
    isShopOpenStatus() {
        return this.isShopOpen;
    }

    /**
     * Load shop data from save
     * @param {Object} saveData - Save data
     */
    loadFromSaveData(saveData) {
        if (saveData.gold !== undefined) {
            this.setPlayerGold(saveData.gold);
        }
    }

    /**
     * Get save data for shop
     * @returns {Object} - Save data
     */
    getSaveData() {
        return {
            gold: this.playerGold
        };
    }

    /**
     * Clean up shop manager
     */
    destroy() {
        this.closeShop();
        
        // Remove event listeners
        this.scene.events.off(GameEvents.WORLD.ENCOUNTER_TRIGGER);
        
        Logger.debug('ShopManager', 'Destroyed');
    }
}

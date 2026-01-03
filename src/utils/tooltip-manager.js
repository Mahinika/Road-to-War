import { createWoWFrame, UI_THEME } from './ui-system.js';

export class TooltipManager {
    constructor(scene) {
        this.scene = scene;
        this.currentTooltip = null;
    }

    /**
     * Show tooltip for an item
     * @param {Object} itemData - Item data
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showItemTooltip(itemData, x, y) {
        this.hideTooltip();

        const rarityColors = {
            common: '#888888',
            uncommon: '#00ff00',
            rare: '#0088ff',
            legendary: '#ff8800'
        };

        const rarityColor = rarityColors[itemData.rarity] || '#ffffff';

        // Build tooltip content (Phase 8: Item Comparison UI)
        const lines = [
            { text: itemData.name, style: { font: 'bold 16px Arial', fill: rarityColor } },
            { text: `Rarity: ${itemData.rarity}`, style: { font: '12px Arial', fill: '#aaaaaa' } }
        ];
        
        // Add item level (Phase 8: Item Comparison UI)
        if (itemData.itemLevel) {
            lines.push({ text: `Item Level: ${itemData.itemLevel}`, style: { font: '12px Arial', fill: '#4a90e2' } });
        } else if (itemData.level) {
            lines.push({ text: `Level: ${itemData.level}`, style: { font: '12px Arial', fill: '#aaaaaa' } });
        }
        
        // Add tier (Phase 8: Item Comparison UI)
        if (itemData.tier) {
            const tierNames = { 1: 'Basic', 2: 'Improved', 3: 'Advanced', 4: 'Elite', 5: 'Legendary' };
            const tierColors = { 1: '#ffffff', 2: '#1eff00', 3: '#0070dd', 4: '#a335ee', 5: '#ff8000' };
            const tierName = tierNames[itemData.tier] || `Tier ${itemData.tier}`;
            lines.push({ text: `Tier: ${tierName}`, style: { font: '12px Arial', fill: tierColors[itemData.tier] || '#ffffff' } });
        }
        
        lines.push({ text: itemData.description || 'No description', style: { font: '12px Arial', fill: '#ffffff' } });

        // Add stats
        if (itemData.stats) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            
            // Format all stats (including new stat types)
            const statOrder = ['attack', 'defense', 'health', 'maxHealth', 'critChance', 'critDamage', 'lifesteal', 'manaRegen', 'healingPower', 'threatPercent'];
            const statColors = {
                attack: '#ff6666',
                defense: '#6666ff',
                health: '#66ff66',
                maxHealth: '#66ff66',
                critChance: '#ff66ff',
                critDamage: '#ff66ff',
                lifesteal: '#ff0000',
                manaRegen: '#66ffff',
                healingPower: '#00ff00',
                threatPercent: '#ffff00'
            };
            
            // Show stats in order
            for (const stat of statOrder) {
                if (itemData.stats[stat] !== undefined && itemData.stats[stat] !== 0) {
                    const value = itemData.stats[stat];
                    const sign = value > 0 ? '+' : '';
                    let displayValue = `${sign}${value}`;
                    
                    // Handle percentage stats
                    if (stat.endsWith('Percent') || stat.endsWith('_percent')) {
                        displayValue = `${sign}${value}%`;
                    } else if (stat === 'critChance' || stat === 'critDamage' || stat === 'lifesteal' || stat === 'threatPercent') {
                        displayValue = `${sign}${value}%`;
                    }
                    
                    const statName = this.formatStatName(stat);
                    const color = statColors[stat] || '#ffffff';
                    lines.push({ text: `${statName}: ${displayValue}`, style: { font: '12px Arial', fill: color } });
                }
            }
            
            // Show any other stats not in the standard list
            for (const [stat, value] of Object.entries(itemData.stats)) {
                if (!statOrder.includes(stat) && value !== 0) {
                    const sign = value > 0 ? '+' : '';
                    const statName = this.formatStatName(stat);
                    lines.push({ text: `${statName}: ${sign}${value}`, style: { font: '12px Arial', fill: '#ffffff' } });
                }
            }
        }
        
        // Show role restriction if any
        if (itemData.role) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            lines.push({ text: `Requires: ${itemData.role.toUpperCase()}`, style: { font: '12px Arial', fill: '#ffaa00' } });
        }
        
        // Show set bonus if part of a set
        if (itemData.set) {
            lines.push({ text: `Set: ${itemData.set}`, style: { font: '12px Arial', fill: '#ffd700' } });
        }

        // Show sockets and gems
        if (itemData.sockets && Array.isArray(itemData.sockets)) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            lines.push({ text: 'Sockets:', style: { font: 'bold 12px Arial', fill: '#ffffff' } });
            
            const socketColors = {
                red: '#ff0000',
                blue: '#0088ff',
                yellow: '#ffff00',
                meta: '#ffffff'
            };

            itemData.sockets.forEach((socketType, index) => {
                const gemId = itemData.socketedGems ? itemData.socketedGems[index] : null;
                const socketColor = socketColors[socketType] || '#888888';
                
                if (gemId) {
                    // Try to get gem data from scene's equipment manager
                    let gemName = gemId;
                    let gemDescription = '';
                    if (this.scene.equipmentManager) {
                        const gemData = this.scene.equipmentManager.getGemData(gemId);
                        if (gemData) {
                            gemName = gemData.name;
                            gemDescription = gemData.description;
                        }
                    }
                    lines.push({ text: `[${socketType.toUpperCase()}] ${gemName}`, style: { font: '12px Arial', fill: socketColor } });
                    if (gemDescription) {
                        lines.push({ text: `  ${gemDescription}`, style: { font: 'italic 10px Arial', fill: '#aaaaaa' } });
                    }
                } else {
                    lines.push({ text: `[${socketType.toUpperCase()}] Empty Socket`, style: { font: '12px Arial', fill: '#888888' } });
                }
            });
        }

        this.createTooltip(lines, x, y);
    }

    /**
     * Show item tooltip with stat comparison
     * @param {Object} itemData - Item data
     * @param {Object} currentItem - Currently equipped item (optional)
     * @param {Object} statDifferences - Stat differences object (optional)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showItemTooltipWithComparison(itemData, currentItem = null, statDifferences = null, x, y) {
        this.hideTooltip();

        const rarityColors = {
            common: '#888888',
            uncommon: '#00ff00',
            rare: '#0088ff',
            epic: '#aa00ff',
            legendary: '#ff8800'
        };

        const rarityColor = rarityColors[itemData.rarity] || '#ffffff';

        // Build tooltip content
        const lines = [
            { text: itemData.name, style: { font: 'bold 16px Arial', fill: rarityColor } },
            { text: `Rarity: ${itemData.rarity}`, style: { font: '12px Arial', fill: '#aaaaaa' } },
            { text: `Item Level: ${itemData.level}`, style: { font: '12px Arial', fill: '#aaaaaa' } }
        ];
        
        // Add level requirement if present
        if (itemData.levelRequirement) {
            lines.push({ text: `Requires Level: ${itemData.levelRequirement}`, style: { font: '12px Arial', fill: '#ffaa00' } });
        }
        
        lines.push({ text: itemData.description || 'No description', style: { font: '12px Arial', fill: '#ffffff' } });

        // Add stats with comparison if available
        if (itemData.stats) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            lines.push({ text: 'Stats:', style: { font: 'bold 12px Arial', fill: '#ffffff' } });
            
            const statOrder = ['attack', 'defense', 'health', 'maxHealth', 'critChance', 'critDamage', 'lifesteal', 'manaRegen', 'healingPower', 'threatPercent'];
            const statColors = {
                attack: '#ff6666',
                defense: '#6666ff',
                health: '#66ff66',
                maxHealth: '#66ff66',
                critChance: '#ff66ff',
                critDamage: '#ff66ff',
                lifesteal: '#ff0000',
                manaRegen: '#66ffff',
                healingPower: '#00ff00',
                threatPercent: '#ffff00'
            };
            
            for (const stat of statOrder) {
                if (itemData.stats[stat] !== undefined && itemData.stats[stat] !== 0) {
                    const value = itemData.stats[stat];
                    const sign = value > 0 ? '+' : '';
                    let displayValue = `${sign}${value}`;
                    
                    if (stat.endsWith('Percent') || stat.endsWith('_percent') || 
                        stat === 'critChance' || stat === 'critDamage' || stat === 'lifesteal' || stat === 'threatPercent') {
                        displayValue = `${sign}${value}%`;
                    }
                    
                    const statName = this.formatStatName(stat);
                    const color = statColors[stat] || '#ffffff';
                    
                    // Add comparison if available
                    let statLine = `${statName}: ${displayValue}`;
                    if (statDifferences && statDifferences[stat] !== undefined) {
                        const diff = statDifferences[stat];
                        if (diff !== 0) {
                            const diffSign = diff > 0 ? '+' : '';
                            const diffColor = diff > 0 ? '#00ff00' : '#ff6666';
                            statLine += ` (${diffSign}${diff}${stat.includes('Percent') || stat === 'critChance' || stat === 'critDamage' || stat === 'lifesteal' || stat === 'threatPercent' ? '%' : ''})`;
                            lines.push({ 
                                text: statLine, 
                                style: { font: '12px Arial', fill: diff > 0 ? '#00ff00' : '#ff6666' } 
                            });
                            continue;
                        }
                    }
                    
                    lines.push({ text: statLine, style: { font: '12px Arial', fill: color } });
                }
            }
            
            // Show any other stats
            for (const [stat, value] of Object.entries(itemData.stats)) {
                if (!statOrder.includes(stat) && value !== 0) {
                    const sign = value > 0 ? '+' : '';
                    const statName = this.formatStatName(stat);
                    lines.push({ text: `${statName}: ${sign}${value}`, style: { font: '12px Arial', fill: '#ffffff' } });
                }
            }
        }
        
        // Show role restriction if any
        if (itemData.role) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            lines.push({ text: `Requires: ${itemData.role.toUpperCase()}`, style: { font: '12px Arial', fill: '#ffaa00' } });
        }
        
        // Show set bonus if part of a set
        if (itemData.set) {
            lines.push({ text: `Set: ${itemData.set}`, style: { font: '12px Arial', fill: '#ffd700' } });
        }

        // Show sockets and gems
        if (itemData.sockets && Array.isArray(itemData.sockets)) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            lines.push({ text: 'Sockets:', style: { font: 'bold 12px Arial', fill: '#ffffff' } });
            
            const socketColors = {
                red: '#ff0000',
                blue: '#0088ff',
                yellow: '#ffff00',
                meta: '#ffffff'
            };

            itemData.sockets.forEach((socketType, index) => {
                const gemId = itemData.socketedGems ? itemData.socketedGems[index] : null;
                const socketColor = socketColors[socketType] || '#888888';
                
                if (gemId) {
                    let gemName = gemId;
                    let gemDescription = '';
                    if (this.scene.equipmentManager) {
                        const gemData = this.scene.equipmentManager.getGemData(gemId);
                        if (gemData) {
                            gemName = gemData.name;
                            gemDescription = gemData.description;
                        }
                    }
                    lines.push({ text: `[${socketType.toUpperCase()}] ${gemName}`, style: { font: '12px Arial', fill: socketColor } });
                    if (gemDescription) {
                        lines.push({ text: `  ${gemDescription}`, style: { font: 'italic 10px Arial', fill: '#aaaaaa' } });
                    }
                } else {
                    lines.push({ text: `[${socketType.toUpperCase()}] Empty Socket`, style: { font: '12px Arial', fill: '#888888' } });
                }
            });
        }

        this.createTooltip(lines, x, y);
    }

    /**
     * Format stat name for display
     * @param {string} stat - Stat key
     * @returns {string} Formatted stat name
     */
    formatStatName(stat) {
        const statNames = {
            attack: 'Attack',
            defense: 'Defense',
            health: 'Health',
            maxHealth: 'Max Health',
            critChance: 'Crit Chance',
            critDamage: 'Crit Damage',
            lifesteal: 'Lifesteal',
            manaRegen: 'Mana Regen',
            healingPower: 'Healing Power',
            threatPercent: 'Threat',
            attackPercent: 'Attack %',
            defensePercent: 'Defense %'
        };
        return statNames[stat] || stat.charAt(0).toUpperCase() + stat.slice(1);
    }

    /**
     * Show tooltip for a stat
     * @param {string} statName - Stat name
     * @param {string} description - Stat description
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showStatTooltip(statName, description, x, y) {
        this.hideTooltip();

        const lines = [
            { text: statName, style: { font: 'bold 14px Arial', fill: '#ffff00' } },
            { text: description, style: { font: '12px Arial', fill: '#ffffff' } }
        ];

        this.createTooltip(lines, x, y);
    }

    /**
     * Create tooltip with lines
     * @param {Array} lines - Array of {text, style} objects
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createTooltip(lines, x, y) {
        // Use UI_CONFIG for tooltip styling
        const tooltipConfig = this.scene.uiConfig?.TOOLTIPS || {
            PADDING: 12,
            LINE_SPACING: 4,
            MAX_WIDTH: 280,
            MIN_WIDTH: 200,
            BACKGROUND_COLOR: 0x0a0a0a,
            BACKGROUND_ALPHA: 0.95,
            BORDER_WIDTH: 1,
            BORDER_COLOR: 0xffd700
        };
        
        const padding = tooltipConfig.PADDING || 12;
        const lineHeight = 18;
        const maxWidth = tooltipConfig.MAX_WIDTH || 280;

        // Calculate tooltip dimensions
        let maxTextWidth = 0;
        lines.forEach(line => {
            const textWidth = this.scene.add.text(0, 0, line.text, line.style).width;
            maxTextWidth = Math.max(maxTextWidth, textWidth);
        });

        const tooltipWidth = Math.min(maxTextWidth + padding * 2, maxWidth);
        const tooltipHeight = lines.length * lineHeight + padding * 2;

        // Create tooltip container
        const tooltip = this.scene.add.container(x, y);

        // Background (WoW Style)
        const bg = createWoWFrame(this.scene, 0, 0, tooltipWidth, tooltipHeight, {
            backgroundColor: 0x0a0a0a,
            borderColor: UI_THEME.borders.gold,
            borderWidth: 1,
            shadow: true
        });
        tooltip.add(bg);

        // Add text lines
        let currentY = -tooltipHeight / 2 + padding;
        lines.forEach((line, index) => {
            if (line.text === '---') {
                // Separator line
                const separator = this.scene.add.rectangle(0, currentY + lineHeight / 2, tooltipWidth - padding * 2, 1, 0x444444);
                tooltip.add(separator);
            } else {
                const text = this.scene.add.text(-tooltipWidth / 2 + padding, currentY, line.text, line.style);
                text.setWordWrapWidth(maxWidth - padding * 2);
                tooltip.add(text);
            }
            currentY += lineHeight;
        });

        // Position tooltip (offset to avoid cursor)
        // Ensure tooltip stays on screen
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        let finalX = x + 20;
        let finalY = y - 20;

        if (finalX + tooltipWidth > screenWidth) {
            finalX = x - tooltipWidth - 20;
        }
        if (finalY + tooltipHeight > screenHeight) {
            finalY = screenHeight - tooltipHeight - 10;
        }
        if (finalY < 0) {
            finalY = 10;
        }

        tooltip.setPosition(finalX + tooltipWidth / 2, finalY + tooltipHeight / 2);
        tooltip.setScrollFactor(0);
        tooltip.setDepth(2000);

        this.currentTooltip = tooltip;
    }

    /**
     * Show item comparison tooltip
     * @param {Object} itemData - Item data to compare
     * @param {Object} equippedItemData - Currently equipped item data (can be null)
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    showItemComparisonTooltip(itemData, equippedItemData, x, y) {
        this.hideTooltip();

        const rarityColors = {
            common: '#888888',
            uncommon: '#00ff00',
            rare: '#0088ff',
            legendary: '#ff8800'
        };

        const rarityColor = rarityColors[itemData.rarity] || '#ffffff';

        // Build tooltip content
        const lines = [
            { text: itemData.name, style: { font: 'bold 16px Arial', fill: rarityColor } },
            { text: `Rarity: ${itemData.rarity}`, style: { font: '12px Arial', fill: '#aaaaaa' } },
            { text: `Item Level: ${itemData.level}`, style: { font: '12px Arial', fill: '#aaaaaa' } }
        ];
        
        // Add level requirement if present
        if (itemData.levelRequirement) {
            lines.push({ text: `Requires Level: ${itemData.levelRequirement}`, style: { font: '12px Arial', fill: '#ffaa00' } });
        }
        
        lines.push({ text: itemData.description || 'No description', style: { font: '12px Arial', fill: '#ffffff' } });

        // Add comparison section
        if (equippedItemData) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            lines.push({ text: 'Comparison:', style: { font: 'bold 12px Arial', fill: '#ffff00' } });
        }

        // Add stats with comparison
        if (itemData.stats) {
            if (!equippedItemData) {
                lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            }
            
            if (itemData.stats.attack) {
                const equippedAttack = equippedItemData?.stats?.attack || 0;
                const diff = itemData.stats.attack - equippedAttack;
                const diffText = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : '';
                const color = diff > 0 ? '#00ff00' : diff < 0 ? '#ff0000' : '#ffffff';
                lines.push({ 
                    text: `Attack: +${itemData.stats.attack}${diffText}`, 
                    style: { font: '12px Arial', fill: color } 
                });
            }
            if (itemData.stats.defense) {
                const equippedDefense = equippedItemData?.stats?.defense || 0;
                const diff = itemData.stats.defense - equippedDefense;
                const diffText = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : '';
                const color = diff > 0 ? '#00ff00' : diff < 0 ? '#ff0000' : '#ffffff';
                lines.push({ 
                    text: `Defense: +${itemData.stats.defense}${diffText}`, 
                    style: { font: '12px Arial', fill: color } 
                });
            }
            if (itemData.stats.health) {
                const equippedHealth = equippedItemData?.stats?.health || 0;
                const diff = itemData.stats.health - equippedHealth;
                const diffText = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : '';
                const color = diff > 0 ? '#00ff00' : diff < 0 ? '#ff0000' : '#ffffff';
                lines.push({ 
                    text: `Health: +${itemData.stats.health}${diffText}`, 
                    style: { font: '12px Arial', fill: color } 
                });
            }
        } else if (equippedItemData) {
            // Item has no stats, show equipped item stats for comparison
            lines.push({ text: 'No stats', style: { font: '12px Arial', fill: '#ff0000' } });
        }

        // Show sockets and gems
        if (itemData.sockets && Array.isArray(itemData.sockets)) {
            lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
            lines.push({ text: 'Sockets:', style: { font: 'bold 12px Arial', fill: '#ffffff' } });
            
            const socketColors = {
                red: '#ff0000',
                blue: '#0088ff',
                yellow: '#ffff00',
                meta: '#ffffff'
            };

            itemData.sockets.forEach((socketType, index) => {
                const gemId = itemData.socketedGems ? itemData.socketedGems[index] : null;
                const socketColor = socketColors[socketType] || '#888888';
                
                if (gemId) {
                    let gemName = gemId;
                    let gemDescription = '';
                    if (this.scene.equipmentManager) {
                        const gemData = this.scene.equipmentManager.getGemData(gemId);
                        if (gemData) {
                            gemName = gemData.name;
                            gemDescription = gemData.description;
                        }
                    }
                    lines.push({ text: `[${socketType.toUpperCase()}] ${gemName}`, style: { font: '12px Arial', fill: socketColor } });
                    if (gemDescription) {
                        lines.push({ text: `  ${gemDescription}`, style: { font: 'italic 10px Arial', fill: '#aaaaaa' } });
                    }
                } else {
                    lines.push({ text: `[${socketType.toUpperCase()}] Empty Socket`, style: { font: '12px Arial', fill: '#888888' } });
                }
            });
        }

        this.createTooltip(lines, x, y);
    }

    /**
     * Check if item is part of a set (Phase 8: Item Comparison UI)
     * @param {Object} itemData - Item data
     * @returns {boolean} True if item is in a set
     */
    isItemInSet(itemData) {
        if (!this.scene || !this.scene.cache) return false;
        const itemsData = this.scene.cache.json.get('items');
        if (!itemsData || !itemsData.sets) return false;
        
        for (const [setId, setData] of Object.entries(itemsData.sets)) {
            if (setData.pieces && setData.pieces.includes(itemData.id)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get set information for an item (Phase 8: Item Comparison UI)
     * @param {Object} itemData - Item data
     * @returns {Object|null} Set information or null
     */
    getItemSetInfo(itemData) {
        if (!this.scene || !this.scene.cache) return null;
        const itemsData = this.scene.cache.json.get('items');
        if (!itemsData || !itemsData.sets) return null;
        
        // Find which set this item belongs to
        for (const [setId, setData] of Object.entries(itemsData.sets)) {
            if (setData.pieces && setData.pieces.includes(itemData.id)) {
                // Count equipped pieces (if equipment manager available)
                let equippedPieces = 0;
                if (this.scene.equipmentManager && this.scene.partyManager) {
                    const heroes = this.scene.partyManager.getHeroes() || [];
                    heroes.forEach(hero => {
                        const equipment = this.scene.equipmentManager.getHeroEquipment(hero.id);
                        setData.pieces.forEach(pieceId => {
                            if (Object.values(equipment).includes(pieceId)) {
                                equippedPieces++;
                            }
                        });
                    });
                }
                
                return {
                    setId: setId,
                    name: setData.name,
                    equippedPieces: equippedPieces,
                    totalPieces: setData.pieces.length,
                    bonuses: setData.bonuses || {}
                };
            }
        }
        return null;
    }

    /**
     * Show a simple tooltip with title, description, and optional color
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string|Object} content - Tooltip content (string or object with title/description/color)
     * @param {Object} options - Additional options (fadeIn, duration, etc.)
     */
    showTooltip(x, y, content, options = {}) {
        this.hideTooltip();

        let title = '';
        let description = '';
        let color = UI_THEME.accents.gold.base;

        // Handle different content formats
        if (typeof content === 'string') {
            title = content;
        } else if (typeof content === 'object') {
            title = content.title || '';
            description = content.description || '';
            color = content.color || color;
        }

        const lines = [];
        if (title) {
            lines.push({ text: title, style: { font: 'bold 14px Arial', fill: `#${color.toString(16).padStart(6, '0')}` } });
        }
        if (description) {
            // Split description by newlines if present
            const descLines = description.split('\n');
            descLines.forEach(line => {
                lines.push({ text: line, style: { font: '12px Arial', fill: '#ffffff' } });
            });
        }

        if (lines.length > 0) {
            this.createTooltip(lines, x, y, options);
        }
    }

    /**
     * Enhanced createTooltip with better positioning and animations
     * @param {Array} lines - Array of {text, style} objects
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Animation and styling options
     */
    createTooltip(lines, x, y, options = {}) {
        // Enhanced tooltip configuration
        const tooltipConfig = {
            PADDING: 12,
            LINE_SPACING: 6,
            MAX_WIDTH: 320,
            MIN_WIDTH: 200,
            BACKGROUND_COLOR: UI_THEME.surfaces.panel,
            BACKGROUND_ALPHA: 0.98,
            BORDER_WIDTH: 2,
            BORDER_COLOR: UI_THEME.borders.gold,
            SHADOW_COLOR: 0x000000,
            SHADOW_ALPHA: 0.5,
            CORNER_RADIUS: 4,
            FADE_IN_DURATION: options.fadeIn !== false ? 200 : 0,
            SCALE_IN: options.scaleIn !== false,
            ...options
        };

        const padding = tooltipConfig.PADDING;
        const lineHeight = 18;
        const maxWidth = tooltipConfig.MAX_WIDTH;

        // Calculate tooltip dimensions with better text measurement
        let maxTextWidth = 0;
        const tempTexts = [];
        lines.forEach(line => {
            const tempText = this.scene.add.text(0, 0, line.text, line.style);
            tempTexts.push(tempText);
            maxTextWidth = Math.max(maxTextWidth, tempText.width);
        });

        // Clean up temp texts
        tempTexts.forEach(text => text.destroy());

        const tooltipWidth = Math.min(Math.max(maxTextWidth + padding * 2, tooltipConfig.MIN_WIDTH), maxWidth);
        const tooltipHeight = (lines.length * lineHeight) + (lines.length - 1) * tooltipConfig.LINE_SPACING + padding * 2;

        // Enhanced positioning with better collision detection
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        const margin = 10;

        let finalX = x + 25; // Default offset from cursor
        let finalY = y - 25;

        // Check horizontal bounds
        if (finalX + tooltipWidth > screenWidth - margin) {
            finalX = x - tooltipWidth - 25; // Try left side
            if (finalX < margin) {
                finalX = Math.max(margin, Math.min(x - tooltipWidth / 2, screenWidth - tooltipWidth - margin)); // Center if needed
            }
        }

        // Check vertical bounds
        if (finalY + tooltipHeight > screenHeight - margin) {
            finalY = y - tooltipHeight - 25; // Try above
            if (finalY < margin) {
                finalY = Math.max(margin, Math.min(y - tooltipHeight / 2, screenHeight - tooltipHeight - margin)); // Center if needed
            }
        }

        // Ensure tooltip stays within bounds
        finalX = Math.max(margin, Math.min(finalX, screenWidth - tooltipWidth - margin));
        finalY = Math.max(margin, Math.min(finalY, screenHeight - tooltipHeight - margin));

        // Create tooltip container
        const tooltip = this.scene.add.container(finalX + tooltipWidth / 2, finalY + tooltipHeight / 2);
        tooltip.setScrollFactor(0);
        tooltip.setDepth(2000);

        // Background with rounded corners and shadow
        const bg = this.scene.add.graphics();
        bg.fillStyle(tooltipConfig.BACKGROUND_COLOR, tooltipConfig.BACKGROUND_ALPHA);

        // Add shadow effect
        bg.fillRoundedRect(-tooltipWidth/2 + 2, -tooltipHeight/2 + 2, tooltipWidth, tooltipHeight, tooltipConfig.CORNER_RADIUS);
        bg.fillStyle(tooltipConfig.SHADOW_COLOR, tooltipConfig.SHADOW_ALPHA);

        // Main background
        bg.fillStyle(tooltipConfig.BACKGROUND_COLOR, tooltipConfig.BACKGROUND_ALPHA);
        bg.fillRoundedRect(-tooltipWidth/2, -tooltipHeight/2, tooltipWidth, tooltipHeight, tooltipConfig.CORNER_RADIUS);

        // Border
        bg.lineStyle(tooltipConfig.BORDER_WIDTH, tooltipConfig.BORDER_COLOR);
        bg.strokeRoundedRect(-tooltipWidth/2, -tooltipHeight/2, tooltipWidth, tooltipHeight, tooltipConfig.CORNER_RADIUS);

        tooltip.add(bg);

        // Add text lines with better positioning
        let currentY = -tooltipHeight / 2 + padding + lineHeight / 2;
        lines.forEach((line, index) => {
            const text = this.scene.add.text(0, currentY, line.text, line.style);
            text.setOrigin(0.5);
            tooltip.add(text);
            currentY += lineHeight + tooltipConfig.LINE_SPACING;
        });

        // Animation effects
        if (tooltipConfig.SCALE_IN) {
            tooltip.setScale(0.8);
            tooltip.setAlpha(0);

            this.scene.tweens.add({
                targets: tooltip,
                scaleX: 1.0,
                scaleY: 1.0,
                alpha: 1.0,
                duration: tooltipConfig.FADE_IN_DURATION,
                ease: 'Back.easeOut'
            });
        } else if (tooltipConfig.FADE_IN_DURATION > 0) {
            tooltip.setAlpha(0);
            this.scene.tweens.add({
                targets: tooltip,
                alpha: 1.0,
                duration: tooltipConfig.FADE_IN_DURATION,
                ease: 'Power2'
            });
        }

        this.currentTooltip = tooltip;
    }

    /**
     * Hide current tooltip with animation
     */
    hideTooltip() {
        if (this.currentTooltip) {
            // Animate out before destroying
            this.scene.tweens.add({
                targets: this.currentTooltip,
                alpha: 0,
                scaleX: 0.9,
                scaleY: 0.9,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    if (this.currentTooltip) {
                        this.currentTooltip.destroy();
                        this.currentTooltip = null;
                    }
                }
            });
        }
    }
}


/**
 * NPC Generator - Generate NPCs for towns and cities
 * Creates simple chibi-style NPCs that populate towns
 */

export class NPCGenerator {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
        
        // NPC types
        this.npcTypes = {
            villager: {
                color: 0x87CEEB,
                size: 24,
                speed: 20
            },
            shopkeeper: {
                color: 0xFFD700,
                size: 24,
                speed: 0 // Stationary
            },
            guard: {
                color: 0x808080,
                size: 28,
                speed: 15
            },
            quest_giver: {
                color: 0x9370DB,
                size: 26,
                speed: 10
            }
        };
    }

    /**
     * Generate an NPC with high-quality pixel art sprite
     * @param {string} type - NPC type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - NPC options
     * @returns {Object} NPC data {sprite, type, interactive}
     */
    generateNPC(type, x, y, options = {}) {
        const npcConfig = this.npcTypes[type] || this.npcTypes.villager;
        
        const {
            interactive = true,
            name = null,
            dialogue = null
        } = options;
        
        const size = npcConfig.size;
        const textureKey = `npc-${type}-${size}-${Date.now()}`;
        
        // Generate high-quality NPC sprite texture
        const graphics = this.scene.add.graphics();
        const npcWidth = size;
        const npcHeight = size * 1.2; // Slightly taller for chibi proportions
        
        // Body (main color)
        const bodyColor = npcConfig.color;
        const bodyLight = this.lightenColor(bodyColor, 0.2);
        const bodyDark = this.darkenColor(bodyColor, 0.2);
        
        // Draw body with shading
        graphics.fillStyle(bodyColor);
        graphics.fillEllipse(npcWidth / 2, npcHeight * 0.6, npcWidth * 0.7, npcHeight * 0.6);
        
        // Body highlight (top-left)
        graphics.fillStyle(bodyLight, 0.5);
        graphics.fillEllipse(npcWidth / 2 - npcWidth * 0.15, npcHeight * 0.55, npcWidth * 0.4, npcHeight * 0.4);
        
        // Body shadow (bottom-right)
        graphics.fillStyle(bodyDark, 0.4);
        graphics.fillEllipse(npcWidth / 2 + npcWidth * 0.15, npcHeight * 0.65, npcWidth * 0.4, npcHeight * 0.4);
        
        // Head (chibi style - large head)
        const headSize = npcWidth * 0.5;
        const headY = npcHeight * 0.25;
        graphics.fillStyle(0xFFDBAC); // Skin tone
        graphics.fillCircle(npcWidth / 2, headY, headSize / 2);
        
        // Head highlight
        graphics.fillStyle(0xFFF5E6, 0.5);
        graphics.fillCircle(npcWidth / 2 - headSize * 0.2, headY - headSize * 0.2, headSize * 0.3);
        
        // Head shadow
        graphics.fillStyle(0xE6C9A0, 0.4);
        graphics.fillCircle(npcWidth / 2 + headSize * 0.2, headY + headSize * 0.2, headSize * 0.3);
        
        // Eyes (simple dots)
        graphics.fillStyle(0x000000);
        graphics.fillCircle(npcWidth / 2 - headSize * 0.15, headY, headSize * 0.08);
        graphics.fillCircle(npcWidth / 2 + headSize * 0.15, headY, headSize * 0.08);
        
        // Eye highlights
        graphics.fillStyle(0xFFFFFF);
        graphics.fillCircle(npcWidth / 2 - headSize * 0.12, headY - headSize * 0.03, headSize * 0.04);
        graphics.fillCircle(npcWidth / 2 + headSize * 0.18, headY - headSize * 0.03, headSize * 0.04);
        
        // Type-specific accessories
        if (type === 'shopkeeper') {
            // Gold coin or bag icon
            graphics.fillStyle(0xFFD700);
            graphics.fillCircle(npcWidth / 2, npcHeight * 0.75, npcWidth * 0.15);
            graphics.lineStyle(2, 0x000000);
            graphics.strokeCircle(npcWidth / 2, npcHeight * 0.75, npcWidth * 0.15);
        } else if (type === 'guard') {
            // Shield icon
            graphics.fillStyle(0x808080);
            graphics.fillRect(npcWidth / 2 - npcWidth * 0.15, npcHeight * 0.7, npcWidth * 0.3, npcHeight * 0.25);
            graphics.lineStyle(2, 0x000000);
            graphics.strokeRect(npcWidth / 2 - npcWidth * 0.15, npcHeight * 0.7, npcWidth * 0.3, npcHeight * 0.25);
        } else if (type === 'quest_giver') {
            // Exclamation mark
            graphics.fillStyle(0x9370DB);
            graphics.fillCircle(npcWidth / 2, npcHeight * 0.75, npcWidth * 0.12);
            graphics.fillStyle(0xFFFFFF);
            graphics.fillRect(npcWidth / 2 - 2, npcHeight * 0.68, 4, 8);
            graphics.fillCircle(npcWidth / 2, npcHeight * 0.78, 3);
        }
        
        // Outline (bold chibi style)
        graphics.lineStyle(2, 0x000000, 1.0);
        graphics.strokeEllipse(npcWidth / 2, npcHeight * 0.6, npcWidth * 0.7, npcHeight * 0.6);
        graphics.strokeCircle(npcWidth / 2, headY, headSize / 2);
        
        // Ground shadow
        graphics.fillStyle(0x000000, 0.3);
        graphics.fillEllipse(npcWidth / 2, npcHeight - 4, npcWidth * 0.6, 8);
        
        graphics.generateTexture(textureKey, npcWidth, npcHeight);
        graphics.destroy();
        
        // Create NPC sprite
        const npcSprite = this.scene.add.image(x, y, textureKey);
        npcSprite.setOrigin(0.5, 1); // Anchor at bottom center
        npcSprite.setDepth(200); // Above ground, below heroes
        
        // Add name label if provided
        let nameText = null;
        if (name) {
            nameText = this.scene.add.text(x, y - npcHeight - 8, name, {
                fontSize: '11px',
                fill: '#FFFFFF',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 3,
                fontStyle: 'bold'
            });
            nameText.setOrigin(0.5, 0.5);
            nameText.setDepth(npcSprite.depth + 1);
        }
        
        // Make interactive if needed
        if (interactive) {
            npcSprite.setInteractive();
            npcSprite.npcType = type;
            npcSprite.npcName = name;
            npcSprite.dialogue = dialogue;
        }
        
        const npc = {
            sprite: npcSprite,
            nameText: nameText,
            type: type,
            interactive: interactive,
            config: npcConfig,
            x: x,
            y: y
        };
        
        this.npcs.push(npc);
        return npc;
    }

    /**
     * Helper: Lighten color
     */
    lightenColor(color, amount) {
        const r = Math.min(255, ((color >> 16) & 0xFF) + Math.floor(255 * amount));
        const g = Math.min(255, ((color >> 8) & 0xFF) + Math.floor(255 * amount));
        const b = Math.min(255, (color & 0xFF) + Math.floor(255 * amount));
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Helper: Darken color
     */
    darkenColor(color, amount) {
        const r = Math.floor(((color >> 16) & 0xFF) * (1 - amount));
        const g = Math.floor(((color >> 8) & 0xFF) * (1 - amount));
        const b = Math.floor((color & 0xFF) * (1 - amount));
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Generate NPCs for a town/city
     * @param {Object} road - Road data
     * @param {Array} buildings - Building array
     * @param {number} width - World width
     * @param {number} height - World height
     * @returns {Array} Array of NPCs
     */
    generateTownNPCs(road, buildings, width, height) {
        const npcs = [];
        
        // Generate shopkeeper NPCs (one per shop)
        buildings.forEach(building => {
            if (building.shopType) {
                const shopkeeper = this.generateNPC('shopkeeper', 
                    building.sprite.x,
                    building.sprite.y - building.height + 40,
                    {
                        name: 'Shopkeeper',
                        interactive: true
                    }
                );
                npcs.push(shopkeeper);
            }
        });
        
        // Generate villagers (random placement)
        const numVillagers = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numVillagers; i++) {
            const x = 100 + Math.random() * (width - 200);
            const roadY = this.getRoadYAtX(x, road);
            if (roadY !== null) {
                const villager = this.generateNPC('villager',
                    x,
                    roadY - 20,
                    {
                        name: `Villager ${i + 1}`,
                        interactive: true
                    }
                );
                npcs.push(villager);
            }
        }
        
        // Generate guard NPCs
        const numGuards = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numGuards; i++) {
            const x = 150 + Math.random() * (width - 300);
            const roadY = this.getRoadYAtX(x, road);
            if (roadY !== null) {
                const guard = this.generateNPC('guard',
                    x,
                    roadY - 20,
                    {
                        name: 'Guard',
                        interactive: true
                    }
                );
                npcs.push(guard);
            }
        }
        
        return npcs;
    }

    /**
     * Get road Y at X (helper method)
     */
    getRoadYAtX(x, road) {
        if (!road || !road.points || road.points.length < 2) {
            return null;
        }
        
        for (let i = 0; i < road.points.length - 1; i++) {
            const p1 = road.points[i];
            const p2 = road.points[i + 1];
            
            if (x >= p1.x && x <= p2.x) {
                const t = (x - p1.x) / (p2.x - p1.x);
                return p1.y + (p2.y - p1.y) * t;
            }
        }
        
        return road.points[road.points.length - 1]?.y || null;
    }

    /**
     * Clean up NPCs
     */
    cleanup() {
        this.npcs.forEach(npc => {
            if (npc.sprite && !npc.sprite.destroyed) {
                npc.sprite.destroy();
            }
            if (npc.nameText && !npc.nameText.destroyed) {
                npc.nameText.destroy();
            }
        });
        this.npcs = [];
    }
}


/**
 * Interaction Manager - Handles building entry and NPC interactions
 * Manages door detection, building entry, and NPC conversations
 */

import { Logger } from '../utils/logger.js';
import { BaseManager } from './base-manager.js';

export class InteractionManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // InteractionManager has no dependencies
    }

    constructor(scene, config = {}) {
        super(scene, config);
        this.currentBuilding = null;
        this.nearbyNPCs = new Map();
        
        // Setup input handlers
        this.setupInputHandlers();
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
    }

    /**
     * Setup input handlers for interactions
     */
    setupInputHandlers() {
        // Listen for pointer/click events on interactive objects
        this.scene.input.on('pointerdown', (pointer) => {
            this.handleInteraction(pointer);
        });
        
        // Listen for key press (E key for interact)
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown-E', () => {
                this.handleKeyInteraction();
            });
        }
    }

    /**
     * Handle interaction click
     */
    handleInteraction(pointer) {
        // Check if clicking on an interactive object
        const clickedObjects = this.scene.input.hitTestPointer(pointer);
        
        for (const obj of clickedObjects) {
            // Check for building door zones
            if (obj.buildingType && obj.enterable) {
                this.enterBuilding(obj);
                return;
            }
            
            // Check for NPC interactions
            if (obj.npcType) {
                this.interactWithNPC(obj);
                return;
            }
        }
    }

    /**
     * Handle key-based interaction (E key)
     */
    handleKeyInteraction() {
        // Find nearest interactive object to party leader
        if (!this.scene.partyManager) return;
        
        const heroes = this.scene.partyManager.getHeroes();
        if (!heroes || heroes.length === 0) return;
        
        const leader = heroes[0];
        const leaderX = leader.sprite?.x || leader.x || 0;
        const leaderY = leader.sprite?.y || leader.y || 0;
        const interactionRange = 80;
        
        // Check for nearby buildings
        const nearbyBuilding = this.findNearbyBuilding(leaderX, leaderY, interactionRange);
        if (nearbyBuilding) {
            this.enterBuilding(nearbyBuilding);
            return;
        }
        
        // Check for nearby NPCs
        const nearbyNPC = this.findNearbyNPC(leaderX, leaderY, interactionRange);
        if (nearbyNPC) {
            this.interactWithNPC(nearbyNPC);
            return;
        }
    }

    /**
     * Find nearby building
     */
    findNearbyBuilding(x, y, range) {
        // Check all children in scene for door zones
        const children = this.scene.children.list;
        for (const child of children) {
            if (child.buildingType && child.enterable) {
                const distance = Phaser.Math.Distance.Between(x, y, child.x, child.y);
                if (distance <= range) {
                    return child;
                }
            }
        }
        return null;
    }

    /**
     * Find nearby NPC
     */
    findNearbyNPC(x, y, range) {
        const children = this.scene.children.list;
        for (const child of children) {
            if (child.npcType && child.interactive) {
                const distance = Phaser.Math.Distance.Between(x, y, child.x, child.y);
                if (distance <= range) {
                    return child;
                }
            }
        }
        return null;
    }

    /**
     * Enter a building
     */
    enterBuilding(doorZone) {
        if (!doorZone || !doorZone.buildingType) {
            Logger.warn('InteractionManager', 'Invalid building door zone');
            return;
        }
        
        Logger.info('InteractionManager', `Entering ${doorZone.buildingType} building`);
        
        // Check if it's a shop
        if (doorZone.buildingType === 'commercial' || doorZone.shopType) {
            this.enterShop(doorZone);
        } else {
            // Generic building entry
            this.enterGenericBuilding(doorZone);
        }
    }

    /**
     * Enter a shop building
     */
    enterShop(doorZone) {
        if (this.scene.shopManager) {
            // Trigger shop UI
            this.scene.shopManager.openShop();
            Logger.info('InteractionManager', 'Shop opened');
        } else {
            Logger.warn('InteractionManager', 'ShopManager not available');
        }
    }

    /**
     * Enter a generic building
     */
    enterGenericBuilding(doorZone) {
        // For now, just log - can be extended for other building types
        Logger.info('InteractionManager', `Entered ${doorZone.buildingType} building`);
        
        // Future: Could trigger building-specific UI or scenes
        // Examples: Inn (rest/heal), Town Hall (quests), etc.
    }

    /**
     * Interact with an NPC
     */
    interactWithNPC(npcSprite) {
        if (!npcSprite || !npcSprite.npcType) {
            Logger.warn('InteractionManager', 'Invalid NPC');
            return;
        }
        
        Logger.info('InteractionManager', `Interacting with ${npcSprite.npcType}: ${npcSprite.npcName || 'Unnamed'}`);
        
        // Handle different NPC types
        switch (npcSprite.npcType) {
            case 'shopkeeper':
                // Shopkeepers open shop
                if (this.scene.shopManager) {
                    this.scene.shopManager.openShop();
                }
                break;
            case 'quest_giver':
                // Quest givers show dialogue/quest UI (placeholder)
                this.showNPCDialogue(npcSprite);
                break;
            case 'guard':
            case 'villager':
            default:
                // Generic NPC dialogue
                this.showNPCDialogue(npcSprite);
                break;
        }
    }

    /**
     * Show NPC dialogue (placeholder for future dialogue system)
     */
    showNPCDialogue(npcSprite) {
        const dialogue = npcSprite.dialogue || `${npcSprite.npcName || 'NPC'} says: "Hello, traveler!"`;
        
        // Create simple dialogue text (can be replaced with proper dialogue UI later)
        if (this.scene.uiManager) {
            // Use UI manager if available
            Logger.info('InteractionManager', `Dialogue: ${dialogue}`);
        } else {
            // Fallback: console log
            Logger.info('InteractionManager', `Dialogue: ${dialogue}`);
        }
    }

    /**
     * Exit current building
     */
    exitBuilding() {
        if (this.currentBuilding) {
            Logger.info('InteractionManager', 'Exiting building');
            this.currentBuilding = null;
        }
    }

    /**
     * Clean up
     */
    destroy() {
        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown-E');
        }
        this.scene.input.off('pointerdown');
        this.nearbyNPCs.clear();
    }
}


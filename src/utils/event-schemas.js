import { GameEvents } from './event-constants.js';

/**
 * Event Schemas - Payload validation schemas for all game events
 * Defines expected structure and types for event payloads
 */
export const EventSchemas = {
    // Combat Events
    [GameEvents.COMBAT.START]: {
        required: ['enemy'],
        fields: {
            enemy: 'object',
            party: 'array'
        }
    },
    [GameEvents.COMBAT.STARTED]: {
        required: [],
        fields: {
            combatId: 'string',
            enemy: 'object',
            party: 'array'
        }
    },
    [GameEvents.COMBAT.END]: {
        required: [],
        fields: {
            won: 'boolean',
            enemy: 'object'
        }
    },
    [GameEvents.COMBAT.ENEMY_DIED]: {
        required: ['enemy'],
        fields: {
            enemy: 'object',
            killer: 'object'
        }
    },
    [GameEvents.COMBAT.DAMAGE_DEALT]: {
        required: ['damage', 'target'],
        fields: {
            damage: 'number',
            target: 'object',
            attacker: 'object',
            isCritical: 'boolean'
        }
    },
    [GameEvents.COMBAT.DAMAGE_TAKEN]: {
        required: ['damage', 'target'],
        fields: {
            damage: 'number',
            target: 'object',
            attacker: 'object'
        }
    },
    [GameEvents.COMBAT.MISS]: {
        required: ['attacker', 'target'],
        fields: {
            attacker: 'object',
            target: 'object'
        }
    },
    [GameEvents.COMBAT.CRITICAL_HIT]: {
        required: ['damage', 'attacker', 'target'],
        fields: {
            damage: 'number',
            attacker: 'object',
            target: 'object'
        }
    },

    // World Events
    [GameEvents.WORLD.SEGMENT_GENERATED]: {
        required: ['segment'],
        fields: {
            segment: 'object',
            segmentIndex: 'number'
        }
    },
    [GameEvents.WORLD.ENCOUNTER_SPAWNED]: {
        required: ['encounter'],
        fields: {
            encounter: 'object',
            position: 'object'
        }
    },
    [GameEvents.WORLD.ENCOUNTER_TRIGGER]: {
        required: ['encounter'],
        fields: {
            encounter: 'object'
        }
    },
    [GameEvents.WORLD.ENCOUNTER_COMPLETE]: {
        required: ['encounter'],
        fields: {
            encounter: 'object',
            result: 'string'
        }
    },
    [GameEvents.WORLD.MILE_CHANGED]: {
        required: ['mile'],
        fields: {
            mile: 'number',
            previousMile: 'number'
        }
    },

    // Item Events
    [GameEvents.ITEM.DROPPED]: {
        required: ['item'],
        fields: {
            item: 'object',
            position: 'object'
        }
    },
    [GameEvents.ITEM.PICKED_UP]: {
        required: ['item'],
        fields: {
            item: 'object',
            heroId: 'string'
        }
    },
    [GameEvents.ITEM.EQUIPMENT_CHANGED]: {
        required: ['heroId', 'slot'],
        fields: {
            heroId: 'string',
            slot: 'string',
            item: 'object',
            previousItem: 'object'
        }
    },
    [GameEvents.ITEM.PURCHASED]: {
        required: ['item', 'cost'],
        fields: {
            item: 'object',
            cost: 'number',
            heroId: 'string'
        }
    },

    // Economy Events
    [GameEvents.ECONOMY.GOLD_CHANGED]: {
        required: ['gold'],
        fields: {
            gold: 'number',
            change: 'number',
            reason: 'string'
        }
    },

    // UI Events
    [GameEvents.UI.BUTTON_CLICKED]: {
        required: ['buttonId'],
        fields: {
            buttonId: 'string',
            data: 'object'
        }
    },
    [GameEvents.UI.MENU_OPENED]: {
        required: ['menuId'],
        fields: {
            menuId: 'string'
        }
    },
    [GameEvents.UI.MENU_CLOSED]: {
        required: ['menuId'],
        fields: {
            menuId: 'string'
        }
    },
    [GameEvents.UI.PANEL_OPENED]: {
        required: ['panelId'],
        fields: {
            panelId: 'string'
        }
    },
    [GameEvents.UI.PANEL_CLOSED]: {
        required: ['panelId'],
        fields: {
            panelId: 'string'
        }
    },

    // Party Events
    [GameEvents.PARTY.HERO_ADDED]: {
        required: ['hero'],
        fields: {
            hero: 'object',
            partySize: 'number'
        }
    },
    [GameEvents.PARTY.HERO_REMOVED]: {
        required: ['heroId'],
        fields: {
            heroId: 'string',
            partySize: 'number'
        }
    },
    [GameEvents.PARTY.HERO_LEVEL_UP]: {
        required: ['hero', 'newLevel'],
        fields: {
            hero: 'object',
            newLevel: 'number',
            previousLevel: 'number'
        }
    },
    [GameEvents.PARTY.COMPOSITION_CHANGED]: {
        required: ['party'],
        fields: {
            party: 'array'
        }
    },

    // Talent Events
    [GameEvents.TALENT.POINT_ALLOCATED]: {
        required: ['heroId', 'talentId'],
        fields: {
            heroId: 'string',
            talentId: 'string',
            treeId: 'string',
            pointsSpent: 'number'
        }
    },
    [GameEvents.TALENT.RESPEC]: {
        required: ['heroId'],
        fields: {
            heroId: 'string',
            pointsRefunded: 'number'
        }
    },
    [GameEvents.TALENT.DATA_RELOADED]: {
        required: [],
        fields: {
            timestamp: 'number'
        }
    },

    // Audio Events
    [GameEvents.AUDIO.MUSIC_STARTED]: {
        required: ['trackId'],
        fields: {
            trackId: 'string'
        }
    },
    [GameEvents.AUDIO.MUSIC_STOPPED]: {
        required: [],
        fields: {
            trackId: 'string'
        }
    },
    [GameEvents.AUDIO.SOUND_PLAYED]: {
        required: ['soundId'],
        fields: {
            soundId: 'string',
            volume: 'number'
        }
    },

    // Achievement Events
    [GameEvents.ACHIEVEMENT.UNLOCKED]: {
        required: ['achievementId'],
        fields: {
            achievementId: 'string',
            achievement: 'object'
        }
    },
    [GameEvents.ACHIEVEMENT.PROGRESS_MADE]: {
        required: ['achievementId', 'progress'],
        fields: {
            achievementId: 'string',
            progress: 'number',
            maxProgress: 'number'
        }
    },

    // Save Events
    [GameEvents.SAVE.GAME_SAVED]: {
        required: [],
        fields: {
            saveSlot: 'string',
            timestamp: 'number'
        }
    },
    [GameEvents.SAVE.GAME_LOADED]: {
        required: [],
        fields: {
            saveSlot: 'string',
            timestamp: 'number'
        }
    },

    // Error Events
    [GameEvents.ERROR.OCCURRED]: {
        required: ['error'],
        fields: {
            error: 'object',
            message: 'string',
            source: 'string'
        }
    }
};


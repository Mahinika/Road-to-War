/**
 * Event Constants - Centralized event name definitions
 * Prevents typos and provides autocomplete support
 */

export const GameEvents = {
    COMBAT: {
        START: 'combat.start',
        STARTED: 'combat.started',
        END: 'combat.end',
        ENEMY_DIED: 'combat.enemy.died',
        DAMAGE_DEALT: 'combat.damage.dealt',
        DAMAGE_TAKEN: 'combat.damage.taken',
        MISS: 'combat.miss',
        CRITICAL_HIT: 'combat.critical.hit'
    },
    WORLD: {
        SEGMENT_GENERATED: 'world.segment.generated',
        ENCOUNTER_SPAWNED: 'world.encounter.spawned',
        ENCOUNTER_TRIGGER: 'world.encounter.trigger',
        ENCOUNTER_COMPLETE: 'world.encounter.complete',
        MILE_CHANGED: 'world.mile.changed'
    },
    ITEM: {
        DROPPED: 'item.dropped',
        PICKED_UP: 'item.picked.up',
        EQUIPMENT_CHANGED: 'item.equipment.changed',
        PURCHASED: 'item.purchased'
    },
    ECONOMY: {
        GOLD_CHANGED: 'economy.gold.changed'
    },
    UI: {
        BUTTON_CLICKED: 'ui.button.clicked',
        MENU_OPENED: 'ui.menu.opened',
        MENU_CLOSED: 'ui.menu.closed',
        PANEL_OPENED: 'ui.panel.opened',
        PANEL_CLOSED: 'ui.panel.closed'
    },
    ERROR: {
        OCCURRED: 'error.occurred'
    },
    PARTY: {
        HERO_ADDED: 'party.hero.added',
        HERO_REMOVED: 'party.hero.removed',
        HERO_LEVEL_UP: 'party.hero.level.up',
        COMPOSITION_CHANGED: 'party.composition.changed'
    },
    TALENT: {
        POINT_ALLOCATED: 'talent.point.allocated',
        RESPEC: 'talent.respec',
        DATA_RELOADED: 'talent.data.reloaded'
    },
    AUDIO: {
        MUSIC_STARTED: 'audio.music.started',
        MUSIC_STOPPED: 'audio.music.stopped',
        SOUND_PLAYED: 'audio.sound.played'
    },
    ACHIEVEMENT: {
        UNLOCKED: 'achievement.unlocked',
        PROGRESS_MADE: 'achievement.progress.made'
    },
    SAVE: {
        GAME_SAVED: 'save.game.saved',
        GAME_LOADED: 'save.game.loaded'
    }
};


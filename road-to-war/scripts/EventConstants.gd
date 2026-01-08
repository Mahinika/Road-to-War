extends Node

# EventConstants.gd - Event name constants
# Migrated from src/utils/event-constants.js

# Combat events
const COMBAT_STARTED = "combat_started"
const COMBAT_ENDED = "combat_ended"
const DAMAGE_DEALT = "damage_dealt"
const DAMAGE_TAKEN = "damage_taken"
const HEALING_APPLIED = "healing_applied"
const ABILITY_USED = "ability_used"
const STATUS_EFFECT_APPLIED = "status_effect_applied"
const STATUS_EFFECT_REMOVED = "status_effect_removed"

# World events
const SEGMENT_GENERATED = "segment_generated"
const ENCOUNTER_SPAWNED = "encounter_spawned"
const MILE_REACHED = "mile_reached"
const BOSS_MILE_REACHED = "boss_mile_reached"

# Item events
const ITEM_DROPPED = "item_dropped"
const ITEM_PICKED_UP = "item_picked_up"
const EQUIPMENT_CHANGED = "equipment_changed"
const ITEM_SOLD = "item_sold"

# UI events
const BUTTON_CLICKED = "button_clicked"
const MENU_OPENED = "menu_opened"
const MENU_CLOSED = "menu_closed"
const TOOLTIP_SHOWN = "tooltip_shown"
const TOOLTIP_HIDDEN = "tooltip_hidden"

# Party events
const HERO_LEVEL_UP = "hero_level_up"
const PARTY_CREATED = "party_created"
const HERO_DIED = "hero_died"
const HERO_REVIVED = "hero_revived"

# Talent events
const TALENT_ALLOCATED = "talent_allocated"
const TALENT_RESET = "talent_reset"

# Achievement events
const ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
const STATISTIC_UPDATED = "statistic_updated"

# Prestige events
const PRESTIGE_ACTIVATED = "prestige_activated"
const PRESTIGE_UPGRADE_PURCHASED = "prestige_upgrade_purchased"

# Save/Load events
const GAME_SAVED = "game_saved"
const GAME_LOADED = "game_loaded"

# Shop events
const ITEM_PURCHASED = "item_purchased"
const SHOP_ENCOUNTERED = "shop_encountered"

# Quest events
const QUEST_COMPLETED = "quest_completed"
const QUEST_PROGRESS_UPDATED = "quest_progress_updated"


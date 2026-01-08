extends Node

# DepthLayers.gd - Z-index depth management
# Migrated from src/utils/depth-layers.js

# Depth layer constants for consistent Z-index management
const BACKGROUND = -100
const TERRAIN = -50
const ROAD = -40
const BUILDINGS = -30
const NPC = -20
const ENEMIES = -10
const HEROES = 0
const PROJECTILES = 10
const PARTICLES = 20
const UI_BACKGROUND = 100
const UI_ELEMENTS = 200
const UI_OVERLAY = 300
const HEALTH_BARS = 301
const HEALTH_BAR_BORDER = 302
const HEALTH_TEXT = 303
const DAMAGE_NUMBERS = 304
const FLOATING_TEXT = 305
const STATUS_EFFECTS = 310
const STATUS_EFFECT_TEXT = 311
const DEBUG_OVERLAY = 500

# Get depth for a layer type
static func get_depth(layer: String) -> int:
	match layer:
		"background": return BACKGROUND
		"terrain": return TERRAIN
		"road": return ROAD
		"buildings": return BUILDINGS
		"npc": return NPC
		"enemies": return ENEMIES
		"heroes": return HEROES
		"projectiles": return PROJECTILES
		"particles": return PARTICLES
		"ui_background": return UI_BACKGROUND
		"ui_elements": return UI_ELEMENTS
		"ui_overlay": return UI_OVERLAY
		"health_bars": return HEALTH_BARS
		"health_bar_border": return HEALTH_BAR_BORDER
		"health_text": return HEALTH_TEXT
		"damage_numbers": return DAMAGE_NUMBERS
		"floating_text": return FLOATING_TEXT
		"status_effects": return STATUS_EFFECTS
		"status_effect_text": return STATUS_EFFECT_TEXT
		"debug_overlay": return DEBUG_OVERLAY
		_: return 0


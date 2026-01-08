extends Node

# UISystem.gd - Unified UI utilities and WoW WOTLK theme constants
# Migrated from src/utils/ui-system.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

# WoW WOTLK theme constants
const THEME_COLORS = {
	"background": Color(0.1, 0.1, 0.15),
	"background_secondary": Color(0.08, 0.13, 0.24),
	"border": Color(0.85, 0.72, 0.0),  # Gold
	"border_highlight": Color(1.0, 0.84, 0.0),
	"text": Color(1.0, 0.98, 0.82),
	"text_secondary": Color(0.8, 0.78, 0.66),
	"accent": Color(1.0, 0.84, 0.0),
	"success": Color(0.0, 1.0, 0.0),
	"error": Color(1.0, 0.0, 0.0)
}

# Class colors
const CLASS_COLORS = {
	"paladin": Color(0.96, 0.55, 0.73),
	"warrior": Color(0.78, 0.61, 0.43),
	"hunter": Color(0.67, 0.83, 0.45),
	"rogue": Color(1.0, 0.96, 0.41),
	"shaman": Color(0.0, 0.44, 0.87),
	"priest": Color(1.0, 1.0, 1.0),
	"mage": Color(0.25, 0.78, 0.92),
	"warlock": Color(0.53, 0.53, 0.93),
	"druid": Color(1.0, 0.49, 0.04)
}

# Rarity colors
const RARITY_COLORS = {
	"common": Color(0.53, 0.53, 0.53),
	"uncommon": Color(0.27, 1.0, 0.27),
	"rare": Color(0.27, 0.27, 1.0),
	"epic": Color(1.0, 0.27, 1.0),
	"legendary": Color(1.0, 0.67, 0.0)
}

func _ready():
	_log_info("UISystem", "Initialized")

# Get class color
static func get_class_color(class_id: String) -> Color:
	return CLASS_COLORS.get(class_id, Color.WHITE)

# Get rarity color
static func get_rarity_color(rarity: String) -> Color:
	return RARITY_COLORS.get(rarity, Color.WHITE)

# Get theme color
static func get_theme_color(color_name: String) -> Color:
	return THEME_COLORS.get(color_name, Color.WHITE)

# Create WoW-style panel
func create_wow_panel(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> Panel:
	var panel = Panel.new()
	panel.custom_minimum_size = size
	panel.position = position
	parent.add_child(panel)
	
	# Apply WoW styling
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = THEME_COLORS["background"]
	style_box.border_color = THEME_COLORS["border"]
	style_box.border_width_left = 2
	style_box.border_width_right = 2
	style_box.border_width_top = 2
	style_box.border_width_bottom = 2
	style_box.corner_radius_top_left = 4
	style_box.corner_radius_top_right = 4
	style_box.corner_radius_bottom_left = 4
	style_box.corner_radius_bottom_right = 4
	
	panel.add_theme_stylebox_override("panel", style_box)
	
	return panel


extends Node

# UITheme.gd - Godot version of ui-theme.js and ui-system.js colors

const COLORS = {
	"frame": Color(0.1, 0.12, 0.18, 0.95),      # Unit frame background
	"frame_dark": Color(0.04, 0.04, 0.04, 1.0), # Darker frame variant
	"gold": Color(1.0, 0.84, 0.0, 1.0),         # Gold accents
	"gold_border": Color(0.79, 0.67, 0.44, 1.0),# Bronze/Gold border
	"mana": Color(0.0, 0.53, 1.0, 1.0),         # Blue mana
	"health": Color(0.3, 1.0, 0.3, 1.0),        # Green health
	"energy": Color(1.0, 1.0, 0.0, 1.0),        # Yellow energy
	"rage": Color(1.0, 0.0, 0.0, 1.0),          # Red rage
	"xp": Color(0.58, 0.0, 0.83, 1.0),          # Purple XP
	"casting": Color(1.0, 0.7, 0.0, 1.0),       # Orange/Gold casting
	"tank": Color(0.23, 0.65, 1.0, 1.0),        # Blue tank border
	
	# Biome Background Colors
	"biome_plains": Color(0.05, 0.1, 0.05),     # Dark Greenish
	"biome_forest": Color(0.02, 0.08, 0.02),    # Deep Forest Green
	"biome_mountains": Color(0.05, 0.05, 0.1),  # Dark Blueish
	"biome_desert": Color(0.15, 0.1, 0.05),     # Sandy Brown
	"biome_undead": Color(0.08, 0.05, 0.08),    # Dark Purple/Grey
	"biome_arcane": Color(0.1, 0.05, 0.15),     # Deep Arcane Purple
	"healer": Color(0.3, 0.85, 0.39, 1.0),      # Green healer border
	"dps": Color(1.0, 0.62, 0.26, 1.0)          # Orange dps border
}

const SPEC_COLORS = {
	"paladin": Color(0.96, 0.55, 0.73), # Pink
	"warrior": Color(0.78, 0.61, 0.43), # Tan
	"rogue": Color(1.0, 0.96, 0.41),    # Yellow
	"mage": Color(0.25, 0.78, 0.92),    # Light Blue
	"priest": Color(1.0, 1.0, 1.0),     # White
	"hunter": Color(0.67, 0.83, 0.45),  # Green
	"shaman": Color(0.0, 0.44, 0.87),   # Blue
	"warlock": Color(0.53, 0.53, 0.93), # Purple
	"druid": Color(1.0, 0.49, 0.04)     # Orange
}

func get_spec_color(hero_class: String) -> Color:
	return SPEC_COLORS.get(hero_class.to_lower(), Color.WHITE)

func get_stylebox_panel(p_bg_color: Color = COLORS["frame"], p_border_color: Color = COLORS["gold_border"], p_border_width: int = 2) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = p_bg_color
	# WoW Gradient Effect
	sb.bg_color.a = 0.9
	
	sb.border_width_left = p_border_width
	sb.border_width_top = p_border_width
	sb.border_width_right = p_border_width
	sb.border_width_bottom = p_border_width
	sb.border_color = p_border_color
	
	# Rounded WoW edges
	sb.corner_radius_top_left = 4
	sb.corner_radius_top_right = 4
	sb.corner_radius_bottom_right = 4
	sb.corner_radius_bottom_left = 4
	
	# Add a slight shadow/glow
	sb.shadow_size = 2
	sb.shadow_color = Color(0, 0, 0, 0.5)
	return sb

func get_stylebox_bar(p_bg_color: Color, p_border_color: Color = Color(0, 0, 0, 0.8)) -> StyleBoxFlat:
	var sb = StyleBoxFlat.new()
	sb.bg_color = p_bg_color
	
	# Glossy look for bars
	sb.border_width_left = 1
	sb.border_width_top = 1
	sb.border_width_right = 1
	sb.border_width_bottom = 1
	sb.border_color = p_border_color
	
	# Slight rounding for the inner bars
	sb.corner_radius_top_left = 2
	sb.corner_radius_bottom_left = 2
	return sb


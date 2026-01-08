extends Node

# ColorUtils.gd - Color manipulation utilities
# Migrated from src/generators/utils/color-utils.js

# Lighten a color
static func lighten(color: Color, amount: float) -> Color:
	return color.lerp(Color.WHITE, amount)

# Darken a color
static func darken(color: Color, amount: float) -> Color:
	return color.lerp(Color.BLACK, amount)

# Convert hex string to Color
static func hex_to_color(hex: String) -> Color:
	hex = hex.replace("#", "")
	if hex.length() == 6:
		var r = hex.substr(0, 2).hex_to_int()
		var g = hex.substr(2, 2).hex_to_int()
		var b = hex.substr(4, 2).hex_to_int()
		return Color(r / 255.0, g / 255.0, b / 255.0)
	elif hex.length() == 8:
		var r = hex.substr(0, 2).hex_to_int()
		var g = hex.substr(2, 2).hex_to_int()
		var b = hex.substr(4, 2).hex_to_int()
		var a = hex.substr(6, 2).hex_to_int()
		return Color(r / 255.0, g / 255.0, b / 255.0, a / 255.0)
	return Color.WHITE

# Convert Color to hex string
static func color_to_hex(color: Color) -> String:
	var r = int(color.r * 255)
	var g = int(color.g * 255)
	var b = int(color.b * 255)
	var a = int(color.a * 255)
	return "#%02X%02X%02X%02X" % [r, g, b, a]

# Blend two colors
static func blend(color1: Color, color2: Color, amount: float) -> Color:
	return color1.lerp(color2, amount)

# Get palette colors for a biome
static func get_biome_palette(biome_type: String) -> Dictionary:
	match biome_type:
		"plains": return {
			"sky": Color(0.29, 0.35, 0.48),
			"ground": Color(0.09, 0.16, 0.24),
			"accent": Color(0.16, 0.23, 0.18)
		}
		"forest": return {
			"sky": Color(0.10, 0.16, 0.10),
			"ground": Color(0.04, 0.10, 0.04),
			"accent": Color(0.10, 0.16, 0.10)
		}
		"desert": return {
			"sky": Color(0.93, 0.84, 0.72),
			"ground": Color(0.76, 0.70, 0.50),
			"accent": Color(0.85, 0.65, 0.13)
		}
		"mountains": return {
			"sky": Color(0.35, 0.42, 0.54),
			"ground": Color(0.16, 0.16, 0.23),
			"accent": Color(0.23, 0.23, 0.27)
		}
		_: return {
			"sky": Color(0.29, 0.35, 0.48),
			"ground": Color(0.09, 0.16, 0.24),
			"accent": Color(0.16, 0.23, 0.18)
		}


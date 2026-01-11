extends Node

# EnvironmentBackgroundGenerator.gd - Layered parallax backgrounds for different biomes
# Migrated from src/generators/environment-background-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var layers: Dictionary = {}
var current_biome: String = ""
var road_generator: Node = null
var town_generator: Node = null
var city_generator: Node = null
var npc_generator: Node = null
var current_road: Dictionary = {}
var current_buildings: Array = []
var current_npcs: Array = []
var current_atmosphere: Dictionary = {}
var landmark_interval: int = 1500

# Biome color palettes
var biome_palettes: Dictionary = {
	"plains": {
		"sky": {"top": Color(0.29, 0.35, 0.48), "bottom": Color(0.16, 0.23, 0.35)},
		"distant": {"base": Color(0.10, 0.16, 0.23), "accent": Color(0.16, 0.23, 0.27)},
		"mid": {"base": Color(0.16, 0.23, 0.16), "accent": Color(0.23, 0.29, 0.23)},
		"ground": {"base": Color(0.09, 0.16, 0.24), "accent": Color(0.10, 0.16, 0.18)},
		"atmosphere": {"tint": Color.WHITE, "alpha": 0.1, "particle": "dust"}
	},
	"forest": {
		"sky": {"top": Color(0.10, 0.16, 0.10), "bottom": Color(0.04, 0.10, 0.04)},
		"distant": {"base": Color(0.04, 0.10, 0.04), "accent": Color(0.10, 0.16, 0.10)},
		"mid": {"base": Color(0.10, 0.16, 0.10), "accent": Color(0.16, 0.23, 0.16)},
		"ground": {"base": Color(0.04, 0.10, 0.04), "accent": Color(0.10, 0.16, 0.10)},
		"atmosphere": {"tint": Color(0.27, 1.0, 0.27), "alpha": 0.15, "particle": "leaf"}
	},
	"mountains": {
		"sky": {"top": Color(0.35, 0.42, 0.54), "bottom": Color(0.23, 0.29, 0.42)},
		"distant": {"base": Color(0.16, 0.16, 0.23), "accent": Color(0.23, 0.23, 0.27)},
		"mid": {"base": Color(0.23, 0.23, 0.27), "accent": Color(0.29, 0.29, 0.35)},
		"ground": {"base": Color(0.16, 0.16, 0.23), "accent": Color(0.20, 0.20, 0.27)},
		"atmosphere": {"tint": Color.WHITE, "alpha": 0.1, "particle": "snow"}
	},
	"desert": {
		"sky": {"top": Color(0.93, 0.84, 0.72), "bottom": Color(0.85, 0.75, 0.60)},
		"distant": {"base": Color(0.76, 0.70, 0.50), "accent": Color(0.80, 0.74, 0.54)},
		"mid": {"base": Color(0.80, 0.74, 0.54), "accent": Color(0.85, 0.78, 0.58)},
		"ground": {"base": Color(0.76, 0.70, 0.50), "accent": Color(0.78, 0.72, 0.52)},
		"atmosphere": {"tint": Color(0.85, 0.65, 0.13), "alpha": 0.2, "particle": "sand"}
	},
	"undead": {
		"sky": {"top": Color(0.20, 0.15, 0.20), "bottom": Color(0.10, 0.08, 0.10)},
		"distant": {"base": Color(0.10, 0.08, 0.10), "accent": Color(0.15, 0.12, 0.15)},
		"mid": {"base": Color(0.15, 0.12, 0.15), "accent": Color(0.20, 0.16, 0.20)},
		"ground": {"base": Color(0.10, 0.08, 0.10), "accent": Color(0.12, 0.10, 0.12)},
		"atmosphere": {"tint": Color(0.5, 0.3, 0.5), "alpha": 0.25, "particle": "mist"}
	},
	"arcane": {
		"sky": {"top": Color(0.15, 0.10, 0.25), "bottom": Color(0.08, 0.05, 0.15)},
		"distant": {"base": Color(0.08, 0.05, 0.15), "accent": Color(0.12, 0.08, 0.20)},
		"mid": {"base": Color(0.12, 0.08, 0.20), "accent": Color(0.16, 0.11, 0.25)},
		"ground": {"base": Color(0.08, 0.05, 0.15), "accent": Color(0.10, 0.07, 0.18)},
		"atmosphere": {"tint": Color(0.5, 0.3, 1.0), "alpha": 0.3, "particle": "sparkles"}
	}
}

func _ready():
	road_generator = get_node_or_null("/root/RoadGenerator")
	town_generator = get_node_or_null("/root/TownBiomeGenerator")
	city_generator = get_node_or_null("/root/CityBiomeGenerator")
	npc_generator = get_node_or_null("/root/NPCGenerator")
	_log_info("EnvironmentBackgroundGenerator", "Initialized")

# Generate environment background for a biome
func generate_background(biome_type: String, width: int, height: int, ground_y: float) -> Dictionary:
	current_biome = biome_type
	var palette = biome_palettes.get(biome_type, biome_palettes["plains"])
	
	# Generate road
	if road_generator and road_generator.has_method("generate_road_path"):
		current_road = road_generator.generate_road_path(biome_type, width, height, ground_y)
	
	# Generate buildings and NPCs based on biome type
	if biome_type == "city" and city_generator:
		var city_data = city_generator.generate_city(width, height, ground_y)
		current_buildings = city_data.get("buildings", [])
		current_npcs = city_data.get("npcs", [])
	elif biome_type == "forest_town" and town_generator:
		var town_data = town_generator.generate_forest_town(width, height, ground_y)
		current_buildings = town_data.get("buildings", [])
		current_npcs = town_data.get("npcs", [])
	else:
		# Generate NPCs for other biomes
		if npc_generator:
			current_npcs = npc_generator.generate_npcs(biome_type, width, height, ground_y)
	
	# Set atmosphere
	current_atmosphere = palette.get("atmosphere", {})
	
	return {
		"biome": biome_type,
		"palette": palette,
		"road": current_road,
		"buildings": current_buildings,
		"npcs": current_npcs,
		"atmosphere": current_atmosphere
	}

# Get background layers for parallax scrolling
func get_background_layers(biome_type: String) -> Array:
	var palette = biome_palettes.get(biome_type, biome_palettes["plains"])
	return [
		{"name": "sky", "color": palette.get("sky", {}), "speed": 0.1},
		{"name": "distant", "color": palette.get("distant", {}), "speed": 0.3},
		{"name": "mid", "color": palette.get("mid", {}), "speed": 0.6},
		{"name": "ground", "color": palette.get("ground", {}), "speed": 1.0}
	]

# Place landmarks along the road
func place_landmarks(road: Dictionary, width: int) -> Array:
	var landmarks = []
	var current_x = landmark_interval
	
	while current_x < width:
		var landmark_type = _get_landmark_type_for_biome(current_biome)
		landmarks.append({
			"type": landmark_type,
			"x": current_x,
			"y": road.get("y", 0) if road.has("y") else 0
		})
		current_x += landmark_interval
	
	return landmarks

func _get_landmark_type_for_biome(biome_type: String) -> String:
	match biome_type:
		"plains": return "tree"
		"forest": return "large_tree"
		"desert": return "cactus"
		"mountains": return "rock_formation"
		"undead": return "tombstone"
		"arcane": return "crystal"
		_: return "tree"


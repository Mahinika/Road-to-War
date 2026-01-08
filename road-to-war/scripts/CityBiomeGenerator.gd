extends Node

# CityBiomeGenerator.gd - Urban areas with cobblestone roads and stone buildings
# Migrated from src/generators/biomes/city-biome-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var road_generator: Node = null
var building_generator: Node = null
var buildings: Array = []

func _ready():
	road_generator = get_node_or_null("/root/RoadGenerator")
	building_generator = get_node_or_null("/root/BuildingGenerator")
	_log_info("CityBiomeGenerator", "Initialized")

# Generate a city biome
func generate_city(width: int, height: int, ground_y: float) -> Dictionary:
	# Generate cobblestone road through city
	var road = {}
	if road_generator and road_generator.has_method("generate_road_path"):
		road = road_generator.generate_road_path("city", width, height, ground_y)
	
	# Place buildings (more densely packed than towns)
	var buildings = place_buildings(road, width, height, ground_y)
	
	# Place NPCs
	var npcs = place_npcs(road, width, height, ground_y)
	
	return {
		"road": road,
		"buildings": buildings,
		"npcs": npcs,
		"type": "city"
	}

# Place buildings in city (denser than towns)
func place_buildings(road: Dictionary, width: int, height: int, ground_y: float) -> Array:
	var buildings = []
	var building_spacing = 120  # Closer spacing than towns
	var num_buildings = int(width / building_spacing)
	
	# More commercial buildings in cities
	for i in range(num_buildings):
		var x = i * building_spacing
		var y = ground_y
		
		# Random building type (more commercial in cities)
		var building_type = "commercial" if randf() < 0.6 else "residential"
		
		if building_generator and building_generator.has_method("create_building"):
			var building = building_generator.create_building(building_type, x, y)
			if building:
				buildings.append(building)
	
	return buildings

# Place NPCs in city
func place_npcs(road: Dictionary, width: int, height: int, ground_y: float) -> Array:
	var npcs = []
	var npc_spacing = 200
	var num_npcs = int(width / npc_spacing)
	
	for i in range(num_npcs):
		var x = i * npc_spacing + randf_range(-20, 20)
		var y = ground_y
		npcs.append({"x": x, "y": y, "type": "citizen"})
	
	return npcs


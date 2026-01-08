extends Node

# TownBiomeGenerator.gd - Forest towns with roads and buildings
# Migrated from src/generators/biomes/town-biome-generator.js

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
	_log_info("TownBiomeGenerator", "Initialized")

# Generate a forest town biome
func generate_forest_town(width: int, height: int, ground_y: float) -> Dictionary:
	# Generate road through town
	var road = {}
	if road_generator and road_generator.has_method("generate_road_path"):
		road = road_generator.generate_road_path("forest_town", width, height, ground_y)
	
	# Place buildings along the road
	var buildings = place_buildings_along_road(road, width, height, ground_y)
	
	# Place NPCs in town
	var npcs = place_npcs(road, width, height, ground_y)
	
	return {
		"road": road,
		"buildings": buildings,
		"npcs": npcs,
		"type": "forest_town"
	}

# Place buildings along the road
func place_buildings_along_road(road: Dictionary, width: int, height: int, ground_y: float) -> Array:
	var buildings = []
	var building_spacing = 150  # Space between buildings
	var num_buildings = int(width / building_spacing)
	
	# Building types to place
	var building_types = ["residential", "shop", "inn"]
	
	for i in range(num_buildings):
		var x = i * building_spacing
		var y = ground_y
		
		# Random building type
		var building_type = building_types[randi() % building_types.size()]
		
		if building_generator and building_generator.has_method("create_building"):
			var building = building_generator.create_building(building_type, x, y)
			if building:
				buildings.append(building)
	
	return buildings

# Place NPCs in town
func place_npcs(road: Dictionary, width: int, height: int, ground_y: float) -> Array:
	var npcs = []
	var npc_spacing = 250
	var num_npcs = int(width / npc_spacing)
	
	for i in range(num_npcs):
		var x = i * npc_spacing + randf_range(-30, 30)
		var y = ground_y
		npcs.append({"x": x, "y": y, "type": "villager"})
	
	return npcs


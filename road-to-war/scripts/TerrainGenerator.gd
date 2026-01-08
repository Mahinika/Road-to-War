extends Node

# TerrainGenerator.gd - Terrain tile generation
# Migrated from src/generators/terrain-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("TerrainGenerator", "Initialized")

# Generate terrain for a biome
func generate_terrain(biome_type: String, width: int, height: int) -> Array:
	var terrain_tiles = []
	var tile_size = 64
	var num_tiles = int(width / tile_size)
	
	for i in range(num_tiles):
		var tile = _create_terrain_tile(biome_type, i * tile_size, height)
		terrain_tiles.append(tile)
	
	return terrain_tiles

# Create a terrain tile
func _create_terrain_tile(biome_type: String, x: float, height: int) -> Dictionary:
	var tile_type = _get_tile_type_for_biome(biome_type)
	
	return {
		"type": tile_type,
		"x": x,
		"y": height - 64,  # Ground level
		"width": 64,
		"height": 64
	}

# Get tile type for a biome
func _get_tile_type_for_biome(biome_type: String) -> String:
	match biome_type:
		"plains": return "grass"
		"forest": return "forest_floor"
		"desert": return "sand"
		"mountains": return "stone"
		"undead": return "bone"
		"arcane": return "magic"
		_: return "grass"


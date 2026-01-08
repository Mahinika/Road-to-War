extends Node

# NPCGenerator.gd - NPC placement in biomes
# Migrated from src/generators/npc-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("NPCGenerator", "Initialized")

# Generate NPCs for a biome
func generate_npcs(biome_type: String, width: int, height: int, ground_y: float) -> Array:
	var npcs = []
	var npc_count = _get_npc_count_for_biome(biome_type, width)
	
	for i in range(npc_count):
		var npc = _create_npc(biome_type, width, ground_y)
		npcs.append(npc)
	
	return npcs

# Get NPC count based on biome type
func _get_npc_count_for_biome(biome_type: String, width: int) -> int:
	match biome_type:
		"city": return int(width / 150)  # More NPCs in cities
		"forest_town": return int(width / 200)  # Fewer NPCs in towns
		_: return int(width / 250)  # Default

# Create a single NPC
func _create_npc(biome_type: String, width: int, ground_y: float) -> Dictionary:
	var npc_types = _get_npc_types_for_biome(biome_type)
	var npc_type = npc_types[randi() % npc_types.size()]
	
	return {
		"type": npc_type,
		"x": randf_range(100, width - 100),
		"y": ground_y,
		"id": "npc_%d" % Time.get_ticks_msec()
	}

# Get NPC types for a biome
func _get_npc_types_for_biome(biome_type: String) -> Array:
	match biome_type:
		"city": return ["citizen", "merchant", "guard", "noble"]
		"forest_town": return ["villager", "farmer", "merchant"]
		_: return ["villager"]


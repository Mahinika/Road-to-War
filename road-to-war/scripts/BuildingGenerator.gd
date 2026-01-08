extends Node

# BuildingGenerator.gd - Procedural building generation
# Migrated from src/generators/biomes/building-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("BuildingGenerator", "Initialized")

# Create a building
func create_building(type: String, x: float, y: float) -> Dictionary:
	var building = {
		"type": type,
		"x": x,
		"y": y,
		"width": _get_building_width(type),
		"height": _get_building_height(type),
		"style": _get_building_style(type)
	}
	
	return building

# Get building width based on type
func _get_building_width(type: String) -> int:
	match type:
		"residential": return 80
		"commercial": return 100
		"shop": return 90
		"inn": return 120
		_: return 80

# Get building height based on type
func _get_building_height(type: String) -> int:
	match type:
		"residential": return 100
		"commercial": return 120
		"shop": return 110
		"inn": return 130
		_: return 100

# Get building style based on type
func _get_building_style(type: String) -> String:
	match type:
		"residential": return "wooden"
		"commercial": return "stone"
		"shop": return "wooden"
		"inn": return "wooden"
		_: return "wooden"


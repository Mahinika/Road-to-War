extends Node

# CharacterComponents.gd - Character part assembly system
# Migrated from src/generators/components/character-components.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("CharacterComponents", "Initialized")

# Component types
const COMPONENT_TYPES = {
	"head": {"layer": 0, "offset": Vector2(0, -20)},
	"body": {"layer": 1, "offset": Vector2(0, 0)},
	"weapon": {"layer": 2, "offset": Vector2(10, -10)},
	"shield": {"layer": 3, "offset": Vector2(-10, -10)},
	"legs": {"layer": 4, "offset": Vector2(0, 10)},
	"feet": {"layer": 5, "offset": Vector2(0, 20)}
}

# Assemble character from components
func assemble_character(components: Dictionary) -> Node2D:
	var character = Node2D.new()
	
	# Sort components by layer
	var sorted_components = []
	for component_type in COMPONENT_TYPES.keys():
		if components.has(component_type):
			sorted_components.append({
				"type": component_type,
				"texture": components[component_type],
				"layer": COMPONENT_TYPES[component_type]["layer"],
				"offset": COMPONENT_TYPES[component_type]["offset"]
			})
	
	sorted_components.sort_custom(func(a, b): return a["layer"] < b["layer"])
	
	# Create sprites for each component
	for comp_data in sorted_components:
		var sprite = Sprite2D.new()
		sprite.texture = comp_data["texture"]
		sprite.position = comp_data["offset"]
		character.add_child(sprite)
	
	return character

# Get component layer
static func get_component_layer(component_type: String) -> int:
	return COMPONENT_TYPES.get(component_type, {}).get("layer", 0)

# Get component offset
static func get_component_offset(component_type: String) -> Vector2:
	return COMPONENT_TYPES.get(component_type, {}).get("offset", Vector2.ZERO)


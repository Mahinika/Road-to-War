extends Node

# TypeValidators.gd - Type checking utilities
# Migrated from src/utils/type-validators.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("TypeValidators", "Initialized")

# Validate type at runtime
static func validate_type(value: Variant, expected_type: String, context: String = "") -> bool:
	var actual_type = typeof(value)
	
	match expected_type:
		"int", "integer":
			return actual_type == TYPE_INT
		"float", "real":
			return actual_type == TYPE_FLOAT or actual_type == TYPE_INT
		"string":
			return actual_type == TYPE_STRING
		"bool", "boolean":
			return actual_type == TYPE_BOOL
		"array":
			return actual_type == TYPE_ARRAY
		"dictionary":
			return actual_type == TYPE_DICTIONARY
		"node":
			return value is Node
		"texture":
			return value is Texture2D
		"color":
			return value is Color
		"vector2":
			return value is Vector2
		_:
			return false

# Validate array contains only specific type
static func validate_array_type(array: Array, element_type: String) -> bool:
	if not array is Array:
		return false
	
	for element in array:
		if not validate_type(element, element_type):
			return false
	
	return true

# Validate dictionary has required keys
static func validate_dict_keys(dict: Dictionary, required_keys: Array) -> bool:
	if not dict is Dictionary:
		return false
	
	for key in required_keys:
		if not dict.has(key):
			return false
	
	return true

# Validate dictionary values match types
static func validate_dict_types(dict: Dictionary, type_map: Dictionary) -> bool:
	if not dict is Dictionary:
		return false
	
	for key in type_map.keys():
		if dict.has(key):
			var expected_type = type_map[key]
			if not validate_type(dict[key], expected_type):
				return false
	
	return true


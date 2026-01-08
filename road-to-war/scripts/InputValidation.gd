extends Node

# InputValidation.gd - ValidationBuilder fluent API
# Migrated from src/utils/input-validation.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("InputValidation", "Initialized")

# ValidationBuilder - Fluent API for building validation chains
class ValidationBuilder:
	var errors: Array = []
	var context: String = ""
	var type_validator_script = null
	
	func _init(ctx: String):
		context = ctx
		type_validator_script = load("res://scripts/TypeValidators.gd")
	
	# Validate not null/empty
	func not_null(value: Variant, field_name: String) -> ValidationBuilder:
		if value == null:
			errors.append("%s: %s cannot be null" % [context, field_name])
		return self
	
	# Validate not empty (for strings/arrays)
	func not_empty(value: Variant, field_name: String) -> ValidationBuilder:
		if value == null:
			errors.append("%s: %s cannot be null" % [context, field_name])
		elif value is String and value.is_empty():
			errors.append("%s: %s cannot be empty" % [context, field_name])
		elif value is Array and value.is_empty():
			errors.append("%s: %s cannot be empty" % [context, field_name])
		return self
	
	# Validate type
	func is_type(value: Variant, expected_type: String, field_name: String) -> ValidationBuilder:
		if not type_validator_script:
			type_validator_script = load("res://scripts/TypeValidators.gd")
		if not type_validator_script.validate_type(value, expected_type):
			errors.append("%s: %s must be of type %s" % [context, field_name, expected_type])
		return self
	
	# Validate range
	func in_range(value: float, min_val: float, max_val: float, field_name: String) -> ValidationBuilder:
		if value < min_val or value > max_val:
			errors.append("%s: %s must be between %f and %f" % [context, field_name, min_val, max_val])
		return self
	
	# Validate array size
	func array_size(array: Array, min_size: int, max_size: int, field_name: String) -> ValidationBuilder:
		if not array is Array:
			errors.append("%s: %s must be an array" % [context, field_name])
		elif array.size() < min_size or array.size() > max_size:
			errors.append("%s: %s must have between %d and %d elements" % [context, field_name, min_size, max_size])
		return self
	
	# Validate dictionary has key
	func has_key(dict: Dictionary, key: String, field_name: String) -> ValidationBuilder:
		if not dict is Dictionary:
			errors.append("%s: %s must be a dictionary" % [context, field_name])
		elif not dict.has(key):
			errors.append("%s: %s must have key '%s'" % [context, field_name, key])
		return self
	
	# Get validation result
	func build() -> Dictionary:
		return {
			"valid": errors.is_empty(),
			"errors": errors.duplicate()
		}

# Create a new ValidationBuilder
static func create(context: String) -> ValidationBuilder:
	return ValidationBuilder.new(context)

# Quick validation helpers
static func validate_hero_id(hero_id: String) -> bool:
	return hero_id != null and hero_id is String and not hero_id.is_empty()

static func validate_item_id(item_id: String) -> bool:
	return item_id != null and item_id is String and not item_id.is_empty()

static func validate_slot(slot: String) -> bool:
	var valid_slots = ["head", "neck", "shoulder", "chest", "waist", "legs", "feet", "wrist", "hands", "finger", "trinket", "back", "mainhand", "offhand"]
	return slot in valid_slots


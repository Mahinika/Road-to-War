extends Node

# EventSchemas.gd - Event data schemas
# Migrated from src/utils/event-schemas.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var schemas: Dictionary = {}
var type_validator_script = null

func _ready():
	type_validator_script = load("res://scripts/TypeValidators.gd")
	_initialize_schemas()
	_log_info("EventSchemas", "Initialized")

func _initialize_schemas():
	# Combat event schemas
	schemas["combat_started"] = {
		"required": ["enemies"],
		"fields": {
			"enemies": "array"
		}
	}
	
	schemas["combat_ended"] = {
		"required": ["victory"],
		"fields": {
			"victory": "bool"
		}
	}
	
	schemas["damage_dealt"] = {
		"required": ["source", "target", "amount"],
		"fields": {
			"source": "string",
			"target": "string",
			"amount": "int",
			"is_crit": "bool"
		}
	}
	
	# Item event schemas
	schemas["item_picked_up"] = {
		"required": ["item"],
		"fields": {
			"item": "dictionary"
		}
	}
	
	schemas["equipment_changed"] = {
		"required": ["hero_id", "slot", "item"],
		"fields": {
			"hero_id": "string",
			"slot": "string",
			"item": "dictionary"
		}
	}

# Validate event data against schema
func validate_event(event_name: String, data: Dictionary) -> Dictionary:
	if not schemas.has(event_name):
		return {"valid": true, "errors": []}  # No schema = no validation
	
	var schema = schemas[event_name]
	var errors = []
	
	# Check required fields
	if schema.has("required"):
		for field in schema["required"]:
			if not data.has(field):
				errors.append("Missing required field: %s" % field)
	
	# Check field types
	if schema.has("fields"):
		if not type_validator_script:
			type_validator_script = load("res://scripts/TypeValidators.gd")
		for field in schema["fields"].keys():
			if data.has(field):
				var expected_type = schema["fields"][field]
				if not type_validator_script.validate_type(data[field], expected_type):
					errors.append("Field %s: expected %s, got %s" % [field, expected_type, typeof(data[field])])
	
	return {"valid": errors.is_empty(), "errors": errors}

# Register a new event schema
func register_schema(event_name: String, schema: Dictionary):
	schemas[event_name] = schema


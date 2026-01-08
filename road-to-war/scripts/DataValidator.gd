extends Node

# DataValidator.gd - JSON schema validation
# Migrated from src/utils/data-validator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

func _ready():
	_log_info("DataValidator", "Initialized")

# Validate talents data
func validate_talents(talents_data: Dictionary) -> Dictionary:
	var errors = []
	
	if not talents_data.has("talents"):
		errors.append("Missing 'talents' key")
		return {"valid": false, "errors": errors}
	
	var talents = talents_data["talents"]
	if not talents is Dictionary:
		errors.append("'talents' must be a dictionary")
		return {"valid": false, "errors": errors}
	
	for talent_id in talents.keys():
		var talent = talents[talent_id]
		if not talent is Dictionary:
			errors.append("Talent %s must be a dictionary" % talent_id)
			continue
		
		# Validate required fields
		if not talent.has("name"):
			errors.append("Talent %s missing 'name'" % talent_id)
		if not talent.has("description"):
			errors.append("Talent %s missing 'description'" % talent_id)
		if not talent.has("max_ranks"):
			errors.append("Talent %s missing 'max_ranks'" % talent_id)
	
	return {"valid": errors.is_empty(), "errors": errors}

# Validate items data
func validate_items(items_data: Dictionary) -> Dictionary:
	var errors = []
	
	var categories = ["weapons", "armor", "accessories", "consumables"]
	for category in categories:
		if not items_data.has(category):
			errors.append("Missing category '%s'" % category)
			continue
		
		var category_data = items_data[category]
		if not category_data is Dictionary:
			errors.append("Category '%s' must be a dictionary" % category)
			continue
		
		for item_id in category_data.keys():
			var item = category_data[item_id]
			if not item is Dictionary:
				errors.append("Item %s in %s must be a dictionary" % [item_id, category])
				continue
			
			# Validate required fields
			if not item.has("name"):
				errors.append("Item %s missing 'name'" % item_id)
			if not item.has("slot"):
				errors.append("Item %s missing 'slot'" % item_id)
	
	return {"valid": errors.is_empty(), "errors": errors}

# Validate stats config
func validate_stats_config(stats_data: Dictionary) -> Dictionary:
	var errors = []
	
	if not stats_data.has("stats"):
		errors.append("Missing 'stats' key")
		return {"valid": false, "errors": errors}
	
	var stats = stats_data["stats"]
	if not stats is Dictionary:
		errors.append("'stats' must be a dictionary")
		return {"valid": false, "errors": errors}
	
	# Validate stat definitions
	for stat_name in stats.keys():
		var stat_def = stats[stat_name]
		if not stat_def is Dictionary:
			errors.append("Stat %s must be a dictionary" % stat_name)
			continue
		
		if not stat_def.has("base_value"):
			errors.append("Stat %s missing 'base_value'" % stat_name)
	
	return {"valid": errors.is_empty(), "errors": errors}

# Validate all data files
func validate_all_data() -> Dictionary:
	var errors = []
	var dm = get_node_or_null("/root/DataManager")
	if not dm:
		return {"valid": false, "errors": ["DataManager not found"]}
	
	# Validate talents
	var talents_data = dm.get_data("talents") if dm.has_method("get_data") else {}
	if not talents_data.is_empty():
		var result = validate_talents(talents_data)
		if not result["valid"]:
			errors.append_array(result["errors"])
	
	# Validate items
	var items_data = dm.get_data("items") if dm.has_method("get_data") else {}
	if not items_data.is_empty():
		var result = validate_items(items_data)
		if not result["valid"]:
			errors.append_array(result["errors"])
	
	# Validate stats config
	var stats_data = dm.get_data("stats-config") if dm.has_method("get_data") else {}
	if not stats_data.is_empty():
		var result = validate_stats_config(stats_data)
		if not result["valid"]:
			errors.append_array(result["errors"])
	
	if errors.size() > 0:
		_log_error("DataValidator", "Validation errors found: %s" % str(errors))
	
	return {"valid": errors.is_empty(), "errors": errors}


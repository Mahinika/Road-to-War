extends Node

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_warn(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.warn(source, message)
	else:
		print("[%s] [WARN] %s" % [source, message])

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

# BrutalModeManager.gd - Manages brutal difficulty selection, scaling, and affixes
# Handles the Mythic+-style difficulty system for Miles 101+

signal brutal_mode_entered(difficulty_level)
signal difficulty_changed(old_level, new_level)

var current_difficulty_level: int = 0  # 0 = Normal (Miles 1-100), 1-10 = Brutal I-X
var brutal_affixes: Array = []

func _ready():
	_log_info("BrutalModeManager", "Initialized")

func select_brutal_difficulty(level: int) -> bool:
	# Validate difficulty level (1-10)
	if level < 1 or level > 10:
		_log_error("BrutalModeManager", "Invalid difficulty level: %d (must be 1-10)" % level)
		return false
	
	var old_level = current_difficulty_level
	current_difficulty_level = level
	
	# Apply brutal affixes based on level
	brutal_affixes = _get_affixes_for_level(level)
	
	difficulty_changed.emit(old_level, level)
	brutal_mode_entered.emit(level)
	_log_info("BrutalModeManager", "Brutal difficulty set to Level %d (%s)" % [level, get_difficulty_name(level)])
	
	return true

func _get_affixes_for_level(level: int) -> Array:
	var affixes = []
	
	if level >= 1:
		affixes.append("Fortified")  # +20% health
	if level >= 4:
		affixes.append("Bursting")   # Explode on death
	if level >= 7:
		affixes.append("Thundering") # Periodic AoE
	if level >= 10:
		affixes.append("Tyrannical") # Bosses +30% damage
	
	return affixes

func calculate_brutal_multipliers(mile: int) -> Dictionary:
	if current_difficulty_level == 0:
		return {"health": 1.0, "damage": 1.0, "level": 1.0}
	
	# Base difficulty multiplier
	var base_multiplier = 1.0 + (current_difficulty_level * 0.5)
	
	# Mile scaling (exponential)
	var mile_scaling = 1.0 + ((mile - 100) * 0.1)
	
	# Health multiplier (higher scaling)
	var health_multiplier = base_multiplier * mile_scaling
	
	# Damage multiplier (slightly higher)
	var damage_multiplier = base_multiplier * (mile_scaling * 1.15)
	
	# Level multiplier
	var level_multiplier = base_multiplier
	
	# Apply affixes
	if brutal_affixes.has("Fortified"):
		health_multiplier *= 1.2
	if brutal_affixes.has("Tyrannical"):
		damage_multiplier *= 1.3  # Only for bosses
	
	return {
		"health": health_multiplier,
		"damage": damage_multiplier,
		"level": level_multiplier
	}

func get_ethereal_essence_drop_rate() -> Dictionary:
	# Returns min/max essence drops based on difficulty
	var base_min = current_difficulty_level
	var base_max = current_difficulty_level * 2
	
	return {
		"min": base_min,
		"max": base_max,
		"elite_min": base_min * 3,
		"elite_max": base_max * 5,
		"boss_min": base_min * 10,
		"boss_max": base_max * 15
	}

func is_brutal_mode() -> bool:
	return current_difficulty_level > 0

func get_difficulty_name(level: int) -> String:
	var names = ["Normal", "Brutal I", "Brutal II", "Brutal III", "Brutal IV", 
				"Brutal V", "Brutal VI", "Brutal VII", "Brutal VIII", "Brutal IX", "Brutal X"]
	if level >= 0 and level < names.size():
		return names[level]
	return "Unknown"

func get_recommended_difficulty() -> int:
	# Calculate recommended difficulty based on player power
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return 1  # Default to Brutal I
	
	# Calculate average hero level
	var total_level = 0
	for hero in pm.heroes:
		total_level += hero.level
	var avg_level = total_level / pm.heroes.size() if pm.heroes.size() > 0 else 1
	
	# Calculate equipment quality
	var em = get_node_or_null("/root/EquipmentManager")
	var epic_count = 0
	var legendary_count = 0
	if em:
		for hero in pm.heroes:
			var equipment = em.get_hero_equipment(hero.id)
			for slot in equipment:
				var item_id = equipment[slot]
				if item_id:
					var item_data = em.get_item_data(item_id)
					if item_data:
						var quality = item_data.get("quality", "").to_lower()
						if quality == "epic":
							epic_count += 1
						elif quality == "legendary":
							legendary_count += 1
	
	# Recommend based on power level
	# Level 50+ heroes with epic+ gear = Brutal III+
	# Level 40+ heroes with some epics = Brutal II
	# Otherwise = Brutal I
	if avg_level >= 50 and legendary_count >= 3:
		return 5  # Brutal V
	elif avg_level >= 50 and epic_count >= 10:
		return 3  # Brutal III
	elif avg_level >= 40 and epic_count >= 5:
		return 2  # Brutal II
	else:
		return 1  # Brutal I

func get_save_data() -> Dictionary:
	return {
		"current_difficulty_level": current_difficulty_level,
		"brutal_affixes": brutal_affixes
	}

func load_save_data(save_data: Dictionary):
	current_difficulty_level = save_data.get("current_difficulty_level", 0)
	brutal_affixes = save_data.get("brutal_affixes", [])
	if current_difficulty_level > 0:
		_log_info("BrutalModeManager", "Loaded brutal mode: Level %d" % current_difficulty_level)


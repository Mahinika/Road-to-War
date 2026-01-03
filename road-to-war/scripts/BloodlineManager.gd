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

# BloodlineManager.gd - Handles bloodline unique abilities and passive effects

signal bloodline_effect_triggered(hero_id, message, color)

# Map<hero_id_ability_id, {cooldown: float, max_cooldown: float}>
var cooldowns: Dictionary = {}

func _ready():
	_log_info("BloodlineManager", "Initialized")

func _process(delta):
	# Update cooldowns
	for key in cooldowns.keys():
		if cooldowns[key]["cooldown"] > 0:
			cooldowns[key]["cooldown"] -= delta * 1000

func _get_hero_prop(hero, prop: String, default_val):
	if hero is Dictionary:
		return hero.get(prop, default_val)
	elif hero is Object:
		var val = hero.get(prop)
		return val if val != null else default_val
	return default_val

func on_hero_damage_taken(hero, damage: float, _attacker: Dictionary) -> Dictionary:
	var bloodline_id = _get_hero_prop(hero, "bloodline_id", "")
	if bloodline_id == "": return {"damage": damage, "effects": []}
	
	var result = {"damage": damage, "effects": []}
	var hero_id = _get_hero_prop(hero, "id", "unknown")
	var current_stats = _get_hero_prop(hero, "current_stats", {})
	
	match bloodline_id:
		"frostborn":
			if randf() < 0.25:
				result["effects"].append({"type": "slow", "amount": 0.5, "duration": 3.0})
				bloodline_effect_triggered.emit(hero_id, "Frost Armor!", "4fc3f7")
		"void_walker":
			var health = float(current_stats.get("health", 0))
			var max_health = float(current_stats.get("maxHealth", 100))
			var hp_percent = health / max_health
			if hp_percent <= 0.1:
				var cd_key = hero_id + "_void_step"
				if not cooldowns.has(cd_key) or cooldowns[cd_key]["cooldown"] <= 0:
					result["damage"] = 0
					result["effects"].append({"type": "heal", "amount": 1})
					cooldowns[cd_key] = {"cooldown": 60000.0, "max_cooldown": 60000.0}
					bloodline_effect_triggered.emit(hero_id, "Void Step!", "800080")
					
	return result

func on_hero_damage_dealt(hero, damage: float, _target: Dictionary, is_crit: bool = false) -> Dictionary:
	var bloodline_id = _get_hero_prop(hero, "bloodline_id", "")
	if bloodline_id == "": return {"damage": damage, "effects": []}
	
	var result = {"damage": damage, "effects": []}
	var hero_id = _get_hero_prop(hero, "id", "unknown")
	var current_stats = _get_hero_prop(hero, "current_stats", {})
	
	match bloodline_id:
		"ancient_warrior":
			var health = float(current_stats.get("health", 0))
			var max_health = float(current_stats.get("maxHealth", 100))
			var hp_percent = health / max_health
			if hp_percent < 0.5:
				result["damage"] += damage * 0.25
		"shadow_assassin":
			if is_crit and randf() < 0.3:
				result["damage"] += damage
				bloodline_effect_triggered.emit(hero_id, "Shadow Strike!", "800080")
				
	return result

func on_ability_cast(hero, _ability_id: String, mana_cost: float) -> Dictionary:
	var bloodline_id = _get_hero_prop(hero, "bloodline_id", "")
	if bloodline_id == "": return {"mana_cost": mana_cost}
	
	var result = {"mana_cost": mana_cost, "damage_mult": 1.0}
	
	match bloodline_id:
		"arcane_scholar":
			result["mana_cost"] = mana_cost * 0.8
			result["damage_mult"] = 1.15
			
	return result

func get_save_data() -> Dictionary:
	return {
		"cooldowns": cooldowns
	}

func load_save_data(save_data: Dictionary):
	cooldowns = save_data.get("cooldowns", {})

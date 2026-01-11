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

# DamageCalculator.gd - Handles all damage calculation and application logic

signal damage_applied(attacker, target, damage, is_crit)
signal healing_applied(healer, target, amount)

func _ready():
	_log_info("DamageCalculator", "Initialized")

func calculate_damage(attacker_stats: Dictionary, target_stats: Dictionary, attacker = null, target = null) -> Dictionary:
	var world_config = DataManager.get_data("world-config")
	var combat_config = world_config.get("combat", {}) if world_config else {}
	
	var attack = attacker_stats.get("attack", 10)
	var defense = target_stats.get("defense", 5)
	
	# Status effects modifiers
	var attacker_id = ""
	if attacker:
		if attacker is Dictionary:
			attacker_id = attacker.get("id", "")
		else:
			# For Resource types like Hero, try to get id property
			var id_prop = attacker.get("id") if attacker.has_method("get") else null
			if id_prop == null and "id" in attacker:
				id_prop = attacker.id
			attacker_id = str(id_prop) if id_prop != null else ""
	
	var target_id = ""
	if target:
		if target is Dictionary:
			target_id = target.get("id", "")
		else:
			# For Resource types like Hero, try to get id property
			var id_prop = target.get("id") if target.has_method("get") else null
			if id_prop == null and "id" in target:
				id_prop = target.id
			target_id = str(id_prop) if id_prop != null else ""
	
	if attacker_id != "":
		var mods = StatusEffectsManager.process_turn(attacker_id)
		attack *= (1.0 + mods["stat_mods"].get("attack", 0.0))
		
	if target_id != "":
		var mods = StatusEffectsManager.process_turn(target_id)
		defense *= (1.0 + mods["stat_mods"].get("defense", 0.0))

	# Miss check
	var miss_chance = combat_config.get("missChance", 0.05)
	if randf() < miss_chance:
		return {"damage": 0, "is_crit": false, "miss": true}
		
	# Base damage
	var base_damage = max(1, attack - defense)
	
	# Elemental bonuses (simplified)
	base_damage *= (1.0 + attacker_stats.get("physicalDamagePercent", 0) / 100.0)
	
	# Crit check
	var crit_chance = combat_config.get("criticalHitChance", 0.05) + (attacker_stats.get("critChance", 0) / 100.0)
	var is_crit = randf() < crit_chance
	if is_crit:
		base_damage *= combat_config.get("criticalHitMultiplier", 2.0)
		
	# Variance
	var variance = combat_config.get("damageVariance", 0.1)
	var final_damage = base_damage * (1.0 + randf_range(-variance, variance))
	
	# Shield absorption
	if target_id != "":
		var shield = StatusEffectsManager.get_shield_amount(target_id)
		if shield > 0:
			var absorbed = min(shield, final_damage)
			final_damage -= absorbed
			
	var damage_val = floor(final_damage)
	# Minimum 1 damage if not missed
	if damage_val <= 0:
		damage_val = 1
		
	return {"damage": damage_val, "is_crit": is_crit, "miss": false}

func deal_damage(attacker, target, damage: float, is_crit: bool):
	# Get IDs and health values for logging
	var target_health_before = 0
	var target_id_str = "unknown"
	if target is Dictionary:
		target_health_before = target.get("current_health", target.get("health", 100))
		target_id_str = target.get("instance_id", target.get("id", "unknown"))
	elif target is Object and "current_stats" in target:
		target_health_before = target.current_stats.get("health", target.current_stats.get("current_health", 100))
		target_id_str = target.get("id") if target.has_method("get") and target.get("id") else (target.id if "id" in target else "unknown")
	
	var attacker_id_str = "unknown"
	if attacker is Dictionary:
		attacker_id_str = attacker.get("id", "unknown")
	elif attacker is Object:
		attacker_id_str = attacker.get("id") if attacker.has_method("get") and attacker.get("id") else (attacker.id if "id" in attacker else "unknown")
	
	# Structured logging via CursorLogManager (get once for reuse in function)
	var log_manager = get_node_or_null("/root/CursorLogManager")
	
	if target is Dictionary:
		var key = "current_health" if "current_health" in target else "health"
		target[key] = max(0, target.get(key, 100) - damage)
	elif target is Object and "current_stats" in target:
		var key = "health" if "health" in target.current_stats else "current_health"
		var health_before = target.current_stats.get(key, 100)
		target.current_stats[key] = max(0, health_before - damage)
		
		# Structured logging via CursorLogManager (hero took damage)
		if log_manager:
			log_manager.log_structured(
				"DamageCalculator.gd:136",
				"Hero took damage",
				{"hero_id": target_id_str, "damage": damage, "health_before": health_before, "health_after": target.current_stats[key], "is_dead": target.current_stats[key] <= 0},
				"debug-session",
				"Q,R"
			)
	
	# Get target health after damage
	var target_health_after = 0
	if target is Dictionary:
		target_health_after = target.get("current_health", target.get("health", 0))
	elif target is Object and "current_stats" in target:
		target_health_after = target.current_stats.get("health", target.current_stats.get("current_health", 0))
	
	# Structured logging via CursorLogManager (damage dealt - reuse log_manager from above)
	if log_manager:
		log_manager.log_structured(
			"DamageCalculator.gd:117",
			"Damage dealt",
			{"attacker": attacker_id_str, "target": target_id_str, "damage": damage, "is_crit": is_crit, "health_before": target_health_before, "health_after": target_health_after, "killed": target_health_after <= 0},
			"debug-session",
			"M,N,O"
		)
		
		# Structured logging via CursorLogManager (emitting signal - reuse log_manager from above)
		log_manager.log_structured(
			"DamageCalculator.gd:156",
			"EMITTING damage_applied",
			{"attacker": attacker_id_str, "target": target_id_str, "damage": damage, "is_crit": is_crit},
			"debug-session",
			"I,M"
		)
		
	damage_applied.emit(attacker, target, damage, is_crit)
	
	# Statistics
	var attacker_id = ""
	if attacker is Dictionary:
		attacker_id = attacker.get("id", "")
	elif attacker is Object:
		attacker_id = attacker.get("id") if attacker.get("id") else ""
		
	if attacker_id.begins_with("hero"):
		StatisticsManager.increment_stat("combat", "totalDamageDealt", damage)
	else:
		StatisticsManager.increment_stat("combat", "totalDamageTaken", damage)

func deal_healing(healer, target, amount: float):
	if target is Dictionary:
		var max_hp = target.get("max_health", 100)
		target["current_health"] = min(max_hp, target.get("current_health", 0) + amount)
	elif target is Object and "current_stats" in target:
		var max_hp = target.current_stats.get("maxHealth", 100)
		target.current_stats["health"] = min(max_hp, target.current_stats.get("health", 0) + amount)
		
	healing_applied.emit(healer, target, amount)


extends Node

# DoTManager.gd - Manages Damage Over Time effects with refresh logic

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

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

signal dot_applied(target_id: String, dot_id: String, caster_id: String)
signal dot_removed(target_id: String, dot_id: String)
signal dot_ticked(target_id: String, dot_id: String, damage: float)

# Map<target_id, Map<dot_id, {caster_id, damage_per_tick, duration, remaining_ticks, total_damage, applied_at}>>
var active_dots: Dictionary = {}

# DoT definitions from abilities.json
# Map<dot_id, {name, school, tick_interval, max_duration}>
var dot_definitions: Dictionary = {}

func _ready():
	_log_info("DoTManager", "Initialized")
	_load_dot_definitions()
	
	# Connect DoT tick damage to combat system
	dot_ticked.connect(_on_dot_ticked)

func _load_dot_definitions():
	"""Load DoT definitions from abilities.json"""
	var abilities_data = DataManager.get_data("abilities")
	if not abilities_data:
		_log_warn("DoTManager", "Could not load abilities.json")
		return
	
	# Scan all class abilities for DoT types
	for class_id in abilities_data.keys():
		if class_id == "general":
			continue
		var class_abilities = abilities_data.get(class_id, {})
		for ability_id in class_abilities.keys():
			var ability = class_abilities[ability_id]
			var ability_type = ability.get("type", "")
			
			# Check if this is a DoT ability
			if ability_type in ["dot", "dot_attack", "dot_heal"]:
				var dot_id = ability_id
				var duration = float(ability.get("duration", 12))
				var tick_interval = 1.0  # Default 1 second per tick
				
				# Some DoTs might have custom tick intervals
				if ability.has("tickInterval"):
					tick_interval = float(ability.get("tickInterval", 1.0))
				
				dot_definitions[dot_id] = {
					"name": ability.get("name", dot_id),
					"school": ability.get("school", "physical"),
					"tick_interval": tick_interval,
					"max_duration": duration,
					"type": ability_type
				}
	
	_log_info("DoTManager", "Loaded %d DoT definitions" % dot_definitions.size())

func apply_dot(target_id: String, dot_id: String, caster_id: String, damage_per_tick: float, duration: float = -1.0, total_damage: float = 0.0):
	"""
	Apply a DoT to a target with refresh logic.
	
	Refresh Rules (WoW-style):
	- If no DoT exists, apply it
	- If a weaker DoT exists (lower damage_per_tick), refresh duration only (don't overwrite)
	- If a stronger DoT exists (higher damage_per_tick), replace it
	- If equal damage_per_tick, refresh duration and update if new one is stronger due to stats
	"""
	if not dot_definitions.has(dot_id):
		_log_warn("DoTManager", "Unknown DoT ID: %s" % dot_id)
		return false
	
	var dot_def = dot_definitions[dot_id]
	var final_duration = duration if duration >= 0.0 else dot_def["max_duration"]
	var tick_interval = dot_def["tick_interval"]
	var ticks = int(final_duration / tick_interval)
	
	if not active_dots.has(target_id):
		active_dots[target_id] = {}
	
	var target_dots = active_dots[target_id]
	
	# Check if this DoT already exists on the target
	if target_dots.has(dot_id):
		var existing_dot = target_dots[dot_id]
		var existing_damage = existing_dot["damage_per_tick"]
		
		# Refresh logic: Only refresh if new DoT is stronger or equal
		if damage_per_tick > existing_damage:
			# Stronger DoT - replace it
			_log_debug("DoTManager", "%s: Replacing weaker %s (%.1f -> %.1f dmg/tick)" % [target_id, dot_id, existing_damage, damage_per_tick])
			target_dots[dot_id] = {
				"caster_id": caster_id,
				"damage_per_tick": damage_per_tick,
				"duration": final_duration,
				"remaining_ticks": ticks,
				"total_damage": total_damage,
				"applied_at": Time.get_ticks_msec() / 1000.0,
				"tick_interval": tick_interval,
				"last_tick_time": Time.get_ticks_msec() / 1000.0
			}
			dot_applied.emit(target_id, dot_id, caster_id)
			return true
		elif damage_per_tick == existing_damage:
			# Equal damage - refresh duration only (extend if longer)
			var existing_ticks = existing_dot["remaining_ticks"]
			var new_ticks = ticks
			if new_ticks > existing_ticks:
				_log_debug("DoTManager", "%s: Refreshing %s duration (%d -> %d ticks)" % [target_id, dot_id, existing_ticks, new_ticks])
				existing_dot["remaining_ticks"] = new_ticks
				existing_dot["duration"] = final_duration
				existing_dot["applied_at"] = Time.get_ticks_msec() / 1000.0
				dot_applied.emit(target_id, dot_id, caster_id)
				return true
			else:
				_log_debug("DoTManager", "%s: %s already active with equal or longer duration, skipping" % [target_id, dot_id])
				return false
		else:
			# Weaker DoT - don't apply (prevent overwriting stronger DoT)
			_log_debug("DoTManager", "%s: %s already active with stronger DoT (%.1f > %.1f), skipping" % [target_id, dot_id, existing_damage, damage_per_tick])
			return false
	else:
		# New DoT - apply it
		target_dots[dot_id] = {
			"caster_id": caster_id,
			"damage_per_tick": damage_per_tick,
			"duration": final_duration,
			"remaining_ticks": ticks,
			"total_damage": total_damage,
			"applied_at": Time.get_ticks_msec() / 1000.0,
			"tick_interval": tick_interval,
			"last_tick_time": Time.get_ticks_msec() / 1000.0
		}
		dot_applied.emit(target_id, dot_id, caster_id)
		_log_debug("DoTManager", "%s: Applied %s (%.1f dmg/tick, %d ticks)" % [target_id, dot_id, damage_per_tick, ticks])
		return true

func process_dots(_delta: float):
	"""Process all active DoTs and apply tick damage"""
	var current_time = Time.get_ticks_msec() / 1000.0
	var to_remove: Array = []
	
	for target_id in active_dots.keys():
		var target_dots = active_dots[target_id]
		var dots_to_remove: Array = []
		
		for dot_id in target_dots.keys():
			var dot_data = target_dots[dot_id]
			var time_since_last_tick = current_time - dot_data["last_tick_time"]
			
			# Check if it's time for a tick
			if time_since_last_tick >= dot_data["tick_interval"]:
				# Apply tick damage
				var damage = dot_data["damage_per_tick"]
				dot_ticked.emit(target_id, dot_id, damage)
				
				# Update tick tracking
				dot_data["remaining_ticks"] -= 1
				dot_data["last_tick_time"] = current_time
				
				# Check if DoT expired
				if dot_data["remaining_ticks"] <= 0:
					dots_to_remove.append(dot_id)
		
		# Remove expired DoTs
		for dot_id in dots_to_remove:
			target_dots.erase(dot_id)
			dot_removed.emit(target_id, dot_id)
			_log_debug("DoTManager", "%s: %s expired" % [target_id, dot_id])
		
		# Remove target entry if no DoTs remain
		if target_dots.is_empty():
			to_remove.append(target_id)
	
	# Clean up empty target entries
	for target_id in to_remove:
		active_dots.erase(target_id)

func has_dot(target_id: String, dot_id: String) -> bool:
	"""Check if target has a specific DoT"""
	if not active_dots.has(target_id):
		return false
	return active_dots[target_id].has(dot_id)

func get_dot_damage(target_id: String, dot_id: String) -> float:
	"""Get the damage per tick of a specific DoT"""
	if not has_dot(target_id, dot_id):
		return 0.0
	return active_dots[target_id][dot_id]["damage_per_tick"]

func remove_dot(target_id: String, dot_id: String):
	"""Manually remove a DoT (e.g., dispel)"""
	if not active_dots.has(target_id):
		return
	if active_dots[target_id].has(dot_id):
		active_dots[target_id].erase(dot_id)
		dot_removed.emit(target_id, dot_id)
		_log_debug("DoTManager", "%s: Removed %s" % [target_id, dot_id])
		
		# Clean up empty target entry
		if active_dots[target_id].is_empty():
			active_dots.erase(target_id)

func clear_target_dots(target_id: String):
	"""Clear all DoTs from a target (e.g., on death)"""
	if active_dots.has(target_id):
		for dot_id in active_dots[target_id].keys():
			dot_removed.emit(target_id, dot_id)
		active_dots.erase(target_id)

func get_active_dots(target_id: String) -> Dictionary:
	"""Get all active DoTs on a target"""
	return active_dots.get(target_id, {}).duplicate()

func _on_dot_ticked(target_id: String, dot_id: String, damage: float):
	"""Handle DoT tick damage - apply to target"""
	var dc = get_node_or_null("/root/DamageCalculator")
	if not dc:
		return
	
	# Determine if target is hero or enemy
	var target: Variant = null
	if target_id.begins_with("hero"):
		var pm = get_node_or_null("/root/PartyManager")
		if pm:
			target = pm.get_hero_by_id(target_id)
	else:
		# Enemy - find in current combat
		var cm = get_node_or_null("/root/CombatManager")
		if cm and cm.current_combat.has("enemies"):
			var enemies = cm.current_combat["enemies"]
			for enemy in enemies:
				if enemy.get("instance_id", "") == target_id:
					target = enemy
					break
	
	if not target:
		return
	
	# Get DoT info for caster tracking
	var dot_data = null
	if active_dots.has(target_id) and active_dots[target_id].has(dot_id):
		dot_data = active_dots[target_id][dot_id]
	
	# Apply DoT tick damage
	if target is Dictionary:
		# Enemy
		var current_health = target.get("current_health", 0)
		target["current_health"] = max(0, current_health - damage)
		dc.damage_applied.emit(
			dot_data["caster_id"] if dot_data else "dot",
			target,
			damage,
			false
		)
	elif target is Object and "current_stats" in target:
		# Hero
		var current_health = target.current_stats.get("health", 0)
		target.current_stats["health"] = max(0, current_health - damage)
		dc.damage_applied.emit(
			dot_data["caster_id"] if dot_data else "dot",
			target,
			damage,
			false
		)
	
	# Visual feedback
	var pm = get_node_or_null("/root/ParticleManager")
	if pm:
		var world = get_node_or_null("/root/World")
		if world and world.has_method("_find_unit_node"):
			var target_node = world._find_unit_node(target_id)
			if target_node:
				pm.create_floating_text(target_node.global_position + Vector2(0, -30), str(int(damage)), Color.ORANGE)

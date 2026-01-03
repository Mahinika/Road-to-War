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

# CombatAI.gd - Handles enemy AI logic, targeting, and threat management

# Map<enemy_id, Map<hero_id, threat>>
var threat_table: Dictionary = {}
# Map<enemy_id, Dictionary>
var enemy_states: Dictionary = {}
# Map<enemy_id, Map<ability_name, cooldown_end_ms>>
var enemy_cooldowns: Dictionary = {}

func _ready():
	_log_info("CombatAI", "Initialized")

func initialize_enemy(enemy_id: String):
	threat_table[enemy_id] = {}
	enemy_states[enemy_id] = {
		"phase": "normal",
		"adaptation_level": 0,
		"ignore_threat": false,
		"enraged": false,
		"current_phase_index": -1
	}
	enemy_cooldowns[enemy_id] = {}
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			threat_table[enemy_id][hero.id] = 0.0

func add_threat(enemy_id: String, hero_id: String, amount: float, multiplier: float = 1.0):
	if not threat_table.has(enemy_id): initialize_enemy(enemy_id)
	var final_amount = amount * multiplier
	threat_table[enemy_id][hero_id] = threat_table[enemy_id].get(hero_id, 0.0) + final_amount

func select_target(enemy_id: String, enemy_data: Dictionary) -> String:
	if not enemy_states.has(enemy_id): initialize_enemy(enemy_id)
	var state = enemy_states[enemy_id]
	
	if state["ignore_threat"] or state["enraged"]:
		return _select_random_target()
		
	var strategy = enemy_data.get("ai_strategy", "defensive")
	if enemy_data.get("type") == "boss":
		strategy = "boss"
		
	match strategy:
		"aggressive": return _select_low_health_target()
		"tactical": return _select_priority_target(["healer", "dps", "tank"])
		"defensive": return _select_highest_threat(enemy_id)
		"boss": return _select_priority_target(["tank", "healer", "dps"])
		
	return _select_highest_threat(enemy_id)

func select_ability(enemy_id: String, enemy_data: Dictionary) -> Dictionary:
	"""Select the best available ability for an enemy based on its current state and phase"""
	if not enemy_states.has(enemy_id): initialize_enemy(enemy_id)
	var state = enemy_states[enemy_id]
	
	var available_abilities = enemy_data.get("abilities", [])
	if available_abilities.is_empty():
		return {"name": "Auto Attack", "type": "attack", "damageMultiplier": 1.0}
		
	# Filter abilities by phase if it's a boss
	var enemies_data = DataManager.get_data("enemies")
	var static_data = enemies_data.get(enemy_data.get("id"), {})
	
	var current_phase_abilities = []
	if state["current_phase_index"] != -1:
		var phases = static_data.get("bossMechanics", {}).get("phases", [])
		var phase_info = phases[state["current_phase_index"]]
		var allowed_names = phase_info.get("specialAbilities", [])
		
		for ability in available_abilities:
			# If the ability name or a simplified version matches the allowed list
			var ability_name = ability.get("name", "").to_lower()
			var match_found = false
			for allowed in allowed_names:
				if allowed.to_lower() in ability_name:
					match_found = true
					break
			if match_found:
				current_phase_abilities.append(ability)
	
	# If no phase-specific abilities, use all available
	var pool = current_phase_abilities if not current_phase_abilities.is_empty() else available_abilities
	
	# Check cooldowns
	var now = Time.get_ticks_msec()
	var off_cooldown = []
	for ability in pool:
		var cooldown_end = enemy_cooldowns[enemy_id].get(ability.get("name", ""), 0)
		if now >= cooldown_end:
			off_cooldown.append(ability)
			
	if off_cooldown.is_empty():
		# Fallback to first ability if all on cooldown, or just a generic auto-attack
		return pool[0] if not pool.is_empty() else {"name": "Auto Attack", "type": "attack", "damageMultiplier": 1.0}
		
	# Select based on chance or priority
	# For now, simple random from off-cooldown
	var selected = off_cooldown[randi() % off_cooldown.size()]
	
	# Set cooldown
	var cd_time = selected.get("cooldown", 2.0) * 1000.0
	enemy_cooldowns[enemy_id][selected.get("name", "")] = now + cd_time
	
	return selected

func _select_highest_threat(enemy_id: String) -> String:
	var max_threat = -1.0
	var target_id = ""
	var threats = threat_table.get(enemy_id, {})
	
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			if hero.current_stats.get("health", 0) <= 0: continue
			var t = threats.get(hero.id, 0.0)
			# Add "power threat" (simplified)
			if hero.role == "tank": t += 50.0
			
			if t > max_threat:
				max_threat = t
				target_id = hero.id
			
	return target_id

func _select_low_health_target() -> String:
	var lowest_hp_pct = 1.1
	var target_id = ""
	
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			if hero.current_stats.get("health", 0) <= 0: continue
			var pct = float(hero.current_stats["health"]) / hero.current_stats["maxHealth"]
			if pct < lowest_hp_pct:
				lowest_hp_pct = pct
				target_id = hero.id
			
	return target_id

func _select_priority_target(priority_order: Array) -> String:
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for role in priority_order:
			for hero in pm.heroes:
				if hero.current_stats.get("health", 0) <= 0: continue
				if hero.role == role:
					return hero.id
	return _select_random_target()

func _select_random_target() -> String:
	var alive = []
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			if hero.current_stats.get("health", 0) > 0:
				alive.append(hero.id)
	if alive.is_empty(): return ""
	return alive[randi() % alive.size()]

func update_ai_state(enemy_id: String, enemy_data: Dictionary, combat_time_ms: int):
	if not enemy_states.has(enemy_id): initialize_enemy(enemy_id)
	var state = enemy_states[enemy_id]
	
	state["adaptation_level"] = int(float(combat_time_ms) / 30000.0) # Every 30s
	
	var current_hp = enemy_data.get("current_health", 100)
	var max_hp = enemy_data.get("max_health", 100)
	var hp_pct = float(current_hp) / max_hp
	
	# Handle boss phases if they exist in enemy data
	var enemies_data = DataManager.get_data("enemies")
	var static_data = enemies_data.get(enemy_data.get("id"), {})
	
	if static_data.has("bossMechanics") and static_data["bossMechanics"].has("phases"):
		var phases = static_data["bossMechanics"]["phases"]
		var current_phase_index = -1
		
		# Find the current phase based on health threshold
		for i in range(phases.size()):
			if hp_pct <= phases[i].get("healthThreshold", 0):
				current_phase_index = i
		
		if current_phase_index != -1 and current_phase_index != state["current_phase_index"]:
			state["current_phase_index"] = current_phase_index
			var phase_info = phases[current_phase_index]
			var phase_name = phase_info.get("name", "Phase %d" % (current_phase_index + 1))
			
			if state["phase"] != phase_name:
				state["phase"] = phase_name
				_log_info("CombatAI", "Enemy %s entering %s" % [enemy_id, phase_name])
				
				# Trigger visual feedback for phase change
				var pm = get_node_or_null("/root/ParticleManager")
				if pm:
					var world = get_node_or_null("/root/World")
					if world:
						var enemy_node = world._find_unit_node(enemy_id)
						if enemy_node:
							pm.create_floating_text(enemy_node.global_position + Vector2(0, -60), phase_name, Color.RED)
	
	# Handle generic enrage
	if hp_pct < 0.25 and not state["enraged"]:
		state["enraged"] = true
		state["ignore_threat"] = true
		if state["phase"] == "normal":
			state["phase"] = "enraged"
		_log_info("CombatAI", "Enemy %s is ENRAGED!" % enemy_id)

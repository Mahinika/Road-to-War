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

# CombatManager.gd - Central coordinator for combat sessions (Multi-Enemy Support)

signal combat_started(enemies)
signal combat_ended(victory)
signal damage_dealt(source, target, amount, is_crit)
signal healing_applied(healer, target, amount)

var in_combat: bool = false
var current_combat: Dictionary = {}
var combat_round: int = 0
var current_turn: String = "party" # "party" or "enemy"

func _ready():
	_log_info("CombatManager", "Initialized with Multi-Enemy support")
	
	# Connect sub-module signals
	DamageCalculator.damage_applied.connect(_on_damage_applied)
	DamageCalculator.healing_applied.connect(_on_healing_applied)

func _on_damage_applied(attacker, target, amount, is_crit):
	var attacker_id = "unknown"
	if attacker is Dictionary:
		attacker_id = attacker.get("instance_id", attacker.get("id", "unknown"))
	elif attacker is Object:
		attacker_id = attacker.get("id") if attacker.get("id") else "unknown"
		
	var target_id = "unknown"
	if target is Dictionary:
		target_id = target.get("instance_id", target.get("id", "unknown"))
	elif target is Object:
		target_id = target.get("id") if target.get("id") else "unknown"
		
	damage_dealt.emit(attacker_id, target_id, amount, is_crit)

func _on_healing_applied(healer, target, amount):
	var healer_id = "unknown"
	if healer is Dictionary:
		healer_id = healer.get("instance_id", healer.get("id", "unknown"))
	elif healer is Object:
		healer_id = healer.get("id") if healer.get("id") else "unknown"
		
	var target_id = "unknown"
	if target is Dictionary:
		target_id = target.get("instance_id", target.get("id", "unknown"))
	elif target is Object:
		target_id = target.get("id") if target.get("id") else "unknown"
		
	healing_applied.emit(healer_id, target_id, amount)

func start_party_combat(enemy_group: Array):
	_log_info("CombatManager", "start_party_combat called with %d enemies" % enemy_group.size())
	
	if in_combat: 
		_log_warn("CombatManager", "Already in combat, ignoring")
		return
	
	if enemy_group.is_empty():
		_log_error("CombatManager", "Enemy group is empty!")
		return
	
	in_combat = true
	combat_round = 1
	current_turn = "party"
	
	# Initialize each enemy
	for enemy in enemy_group:
		var instance_id = enemy.get("instance_id", enemy.get("id", "enemy_1"))
		enemy["instance_id"] = instance_id
	
		# Fix enemy health structure
		if enemy.has("stats"):
			var stats = enemy["stats"]
			if stats.has("health"):
				enemy["current_health"] = stats["health"]
				enemy["max_health"] = stats.get("maxHealth", stats["health"])
		else:
			enemy["current_health"] = enemy.get("current_health", 100)
			enemy["max_health"] = enemy.get("max_health", enemy.get("current_health", 100))
	
		if has_node("/root/CombatAI"):
			CombatAI.initialize_enemy(instance_id)
	
	current_combat = {
		"enemies": enemy_group,
		"start_time": Time.get_ticks_msec()
	}
	
	_log_info("CombatManager", "Emitting combat_started signal for group")
	combat_started.emit(enemy_group)
	
	_schedule_next_action()

func _schedule_next_action():
	if not in_combat: return
	get_tree().create_timer(0.4).timeout.connect(_process_turn) # Faster combat pace

func _process_turn():
	if not in_combat: return
	
	var combat_time = Time.get_ticks_msec() - current_combat.get("start_time", 0)
	
	# Start-of-turn status effect processing and AI updates
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			_process_status_effects(hero.id)
	
	for enemy in current_combat["enemies"]:
		if enemy.get("current_health", 0) > 0:
			_process_status_effects(enemy["instance_id"])
			if has_node("/root/CombatAI"):
				CombatAI.update_ai_state(enemy["instance_id"], enemy, combat_time)
	
	if current_turn == "party":
		# Currently heroes act as a group turn
		CombatActions.execute_party_turn(current_combat["enemies"])
		current_turn = "enemy"
	else:
		# Enemies act as a group turn
		CombatActions.execute_enemy_turn(current_combat["enemies"])
		current_turn = "party"
		combat_round += 1
		AbilityManager.update_cooldowns()
		
	# Check if combat ended
	var status = _check_combat_end()
	if status["ended"]:
		_end_combat(status["victory"])
	else:
		_schedule_next_action()

func _process_status_effects(combatant_id: String):
	var res = StatusEffectsManager.process_turn(combatant_id)
	if res["damage"] > 0:
		var combatant = _get_combatant_by_id(combatant_id)
		if not combatant.is_empty():
			DamageCalculator.deal_damage({"id": "status_effect"}, combatant, res["damage"], false)

func _get_combatant_by_id(id: String) -> Dictionary:
	# Check enemies first
	for enemy in current_combat.get("enemies", []):
		if enemy.get("instance_id") == id: return enemy
		
	# Check heroes
	var hero = PartyManager.get_hero_by_id(id)
	if hero: return hero.get_stats_dict()
	
	return {}

func _check_combat_end() -> Dictionary:
	var enemies = current_combat.get("enemies", [])
	var all_enemies_dead = true
	for enemy in enemies:
		if enemy.get("current_health", 0) > 0:
			all_enemies_dead = false
			break
			
	if all_enemies_dead:
		return {"ended": true, "victory": true}
		
	var all_heroes_dead = true
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			if hero.current_stats.get("health", 0) > 0:
				all_heroes_dead = false
				break
			
	if all_heroes_dead:
		return {"ended": true, "victory": false}
		
	return {"ended": false, "victory": false}

func _end_combat(victory: bool):
	in_combat = false
	var enemies = current_combat.get("enemies", [])
	
	if victory:
		_distribute_group_rewards(enemies)
		
	current_combat = {}
	combat_ended.emit(victory)
	_log_info("CombatManager", "Combat ended. Victory: %s" % str(victory))

func _distribute_group_rewards(defeated_enemies: Array):
	var total_exp = 0
	var total_gold = 0
	var all_loot_drops = []
	
	for enemy_data in defeated_enemies:
		var rewards = enemy_data.get("rewards", {})
		total_exp += rewards.get("experience", 0)
		total_gold += rewards.get("gold", 0)
		
		var drops = enemy_data.get("drops", [])
		for drop in drops:
			if randf() < drop.get("chance", 0):
				all_loot_drops.append({"id": drop.get("item"), "quantity": 1})
	
	# Add bonuses from world config
	var dm = get_node_or_null("/root/DataManager")
	var world_config = dm.get_data("world-config") if dm else {}
	var exp_mult = 1.0
	if world_config and world_config.has("loot"):
		exp_mult = world_config["loot"].get("experienceMultiplier", 1.0)
	
	total_exp = int(total_exp * exp_mult)
	
	_log_info("CombatManager", "Distributing group rewards: %d EXP, %d Gold" % [total_exp, total_gold])
	
	# Give EXP to all party members
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			hero.gain_experience(total_exp)
		
	# Give Gold
	if has_node("/root/ShopManager"):
		ShopManager.add_gold(total_gold)
	
	if has_node("/root/StatisticsManager"):
		StatisticsManager.increment_stat("collection", "goldEarned", total_gold)
	
	# Spawn Loot
	if not all_loot_drops.is_empty() and has_node("/root/LootManager"):
		# Just use the first enemy's position for collective loot spawn for now, 
		# or refine this to spawn at each enemy's death spot later.
		LootManager.spawn_loot(defeated_enemies[0], all_loot_drops)

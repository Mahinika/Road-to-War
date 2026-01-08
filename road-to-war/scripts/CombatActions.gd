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

# CombatActions.gd - Handles all combat action execution (Multi-Target & Range Support)

signal unit_acting(id)

func _ready():
	_log_info("CombatActions", "Initialized with Multi-Target and Range support")

func execute_party_turn(enemies: Array):
	var party_state = []
	for h in PartyManager.heroes:
		party_state.append({
			"id": h.id,
			"current_health": h.current_stats.get("health", 0),
			"max_health": h.current_stats.get("maxHealth", 100)
		})
		
	for hero in PartyManager.heroes:
		if hero.current_stats.get("health", 0) <= 0: continue
		
		var target_enemy = _select_optimal_target(enemies)
		if target_enemy.is_empty(): break
		
		var context = {
			"enemies": enemies, 
			"target": target_enemy,
			"party_state": party_state
		}
		
		var ability_name = AbilityManager.select_ability(hero, context)
		_execute_hero_action(hero, ability_name, target_enemy)

func _execute_hero_action(hero, ability_name: String, enemy: Dictionary):
	var ability_def = AbilityManager.get_ability_definition(hero.id, ability_name)
	var ability_range = ability_def.get("range", 120)
	var enemy_instance_id = enemy.get("instance_id", "enemy_1")
	
	unit_acting.emit(hero.id)
	
	var world = get_node_or_null("/root/World")
	if not world: return
	
	var hero_node = world._find_unit_node(hero.id)
	var enemy_node = world._find_unit_node(enemy_instance_id)
	
	if not hero_node or not enemy_node:
		_execute_hero_ability_logic(hero, ability_name, enemy)
		return
	
	var distance = hero_node.global_position.distance_to(enemy_node.global_position)
	
	# #region agent log
	var log_file = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
	if log_file: log_file.seek_end(); log_file.store_line(JSON.stringify({"location":"CombatActions.gd:82","message":"Hero action distance check","data":{"hero_id":hero.id,"distance":distance,"ability_range":ability_range,"will_charge":distance > ability_range},"timestamp":Time.get_ticks_msec(),"sessionId":"debug-session","hypothesisId":"L"})); log_file.close()
	# #endregion
	
	if distance > ability_range:
		# Melee Charge
		var original_pos = hero_node.position
		var charge_pos = original_pos + (enemy_node.position - hero_node.position).normalized() * (distance - 60)
		
		var tween = get_tree().create_tween().set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_OUT)
		tween.tween_property(hero_node, "position", charge_pos, 0.3)
		tween.tween_callback(_execute_hero_ability_logic.bind(hero, ability_name, enemy))
		tween.tween_interval(0.2)
		tween.tween_property(hero_node, "position", original_pos, 0.3)
	else:
		# Already in range (Ranged or already close)
		_execute_hero_ability_logic(hero, ability_name, enemy)

func _execute_hero_ability_logic(hero, ability_name: String, enemy: Dictionary):
	var ability_def = AbilityManager.get_ability_definition(hero.id, ability_name)
	var enemy_instance_id = enemy.get("instance_id", "enemy_1")
	
	# #region agent log
	var log_file = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
	if log_file: log_file.seek_end(); log_file.store_line(JSON.stringify({"location":"CombatActions.gd:99","message":"Hero attacking","data":{"hero_id":hero.id,"hero_name":hero.name,"hero_attack":hero.current_stats.get("attack",0),"ability":ability_name,"enemy_id":enemy_instance_id,"enemy_health_before":enemy.get("current_health",0),"enemy_max_health":enemy.get("stats",{}).get("maxHealth",0),"enemy_defense":enemy.get("stats",{}).get("defense",0)},"timestamp":Time.get_ticks_msec(),"sessionId":"debug-session","hypothesisId":"M,N"})); log_file.close()
	# #endregion
	
	# Resource Consumption
	var rm = get_node_or_null("/root/ResourceManager")
	if rm and ability_name != "auto_attack":
		var cost = ability_def.get("cost", 0)
		var type = ability_def.get("resourceType", "mana") # Fixed key name
		rm.consume_resource(hero.id, type, cost)
		
		# Show Ability Text
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			var world = get_node_or_null("/root/World")
			if world:
				var hero_node = world._find_unit_node(hero.id)
				if hero_node:
					pm.create_floating_text(hero_node.global_position + Vector2(0, -20), ability_name.capitalize() + "!", Color.CYAN)

	var result = DamageCalculator.calculate_damage(hero.current_stats, enemy.get("stats", {}), hero, enemy)
	
	# #region agent log
	var log_file2 = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
	if log_file2: log_file2.seek_end(); log_file2.store_line(JSON.stringify({"location":"CombatActions.gd:119","message":"Damage calculated","data":{"damage":result.get("damage",0),"is_crit":result.get("is_crit",false),"miss":result.get("miss",false)},"timestamp":Time.get_ticks_msec(),"sessionId":"debug-session","hypothesisId":"M"})); log_file2.close()
	# #endregion
	
	if not result.get("miss", false):
		# CRITICAL FIX: Pass the hero object directly as attacker for correct statistics tracking
		DamageCalculator.deal_damage(hero, enemy, result.get("damage", 0.0), result.get("is_crit", false))
		
		# #region agent log
		var log_file3 = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
		if log_file3: log_file3.seek_end(); log_file3.store_line(JSON.stringify({"location":"CombatActions.gd:122","message":"Damage dealt","data":{"enemy_health_after":enemy.get("current_health",0),"enemy_killed":enemy.get("current_health",0) <= 0},"timestamp":Time.get_ticks_msec(),"sessionId":"debug-session","hypothesisId":"N"})); log_file3.close()
		# #endregion
		
		if result.get("is_crit", false):
			AudioManager.play_crit_sfx()
		else:
			AudioManager.play_hit_sfx()
		
		var threat_mult = 2.0 if hero.role == "tank" else 1.0
		CombatAI.add_threat(enemy_instance_id, hero.id, result["damage"], threat_mult)
		AbilityManager.set_cooldown(hero.id, ability_name)
	else:
		_log_debug("CombatActions", "%s MISSED %s!" % [hero.name, enemy_instance_id])

func execute_enemy_turn(enemies: Array):
	# #region agent log
	var alive_count = 0
	for e in enemies:
		if e.get("current_health", 0) > 0: alive_count += 1
	var log_file = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
	if log_file: log_file.seek_end(); log_file.store_line(JSON.stringify({"location":"CombatActions.gd:134","message":"Enemy turn starting","data":{"total_enemies":enemies.size(),"alive_enemies":alive_count},"timestamp":Time.get_ticks_msec(),"sessionId":"debug-session","hypothesisId":"O,P"})); log_file.close()
	# #endregion
	
	for enemy in enemies:
		if enemy.get("current_health", 0) <= 0: continue
		_execute_enemy_action(enemy)

func _execute_enemy_action(enemy: Dictionary):
	var enemy_instance_id = enemy["instance_id"]
	
	unit_acting.emit(enemy_instance_id)
	
	var target_id = CombatAI.select_target(enemy_instance_id, enemy)
	if target_id == "": return
	
	var target_hero = PartyManager.get_hero_by_id(target_id)
	if not target_hero: return
	
	var ability_data = CombatAI.select_ability(enemy_instance_id, enemy)
	
	var world = get_node_or_null("/root/World")
	if not world: return
	
	var enemy_node = world._find_unit_node(enemy_instance_id)
	var hero_node = world._find_unit_node(target_id)
	
	if not enemy_node or not hero_node:
		_execute_enemy_ability_logic(enemy, target_hero, ability_data)
		return
	
	var ability_range = ability_data.get("range", 120)
	var distance = enemy_node.global_position.distance_to(hero_node.global_position)
	
	if distance > ability_range:
		var original_pos = enemy_node.position
		var charge_pos = original_pos + (hero_node.position - enemy_node.position).normalized() * (distance - 60)
		
		var tween = get_tree().create_tween().set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_OUT)
		tween.tween_property(enemy_node, "position", charge_pos, 0.3)
		tween.tween_callback(_execute_enemy_ability_logic.bind(enemy, target_hero, ability_data))
		tween.tween_interval(0.2)
		tween.tween_property(enemy_node, "position", original_pos, 0.3)
	else:
		_execute_enemy_ability_logic(enemy, target_hero, ability_data)

func _execute_enemy_ability_logic(enemy: Dictionary, target_hero, ability_data: Dictionary):
	var result = DamageCalculator.calculate_damage(enemy.get("stats", {}), target_hero.current_stats, enemy, target_hero)
	
	# Apply ability multiplier if present
	var dmg_mult = ability_data.get("damageMultiplier", 1.0)
	if result.has("damage"):
		result["damage"] *= dmg_mult
	
	if not result.get("miss", false):
		# CRITICAL FIX: Pass the hero object directly as target so stats are updated on the object, not a copy
		DamageCalculator.deal_damage(enemy, target_hero, result.get("damage", 0.0), result.get("is_crit", false))
		AudioManager.play_sfx("hit_enemy")
		
		# Visual ability feedback for enemies
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			var world = get_node_or_null("/root/World")
			if world:
				var enemy_node = world._find_unit_node(enemy["instance_id"])
				if enemy_node:
					pm.create_floating_text(enemy_node.global_position + Vector2(0, -40), ability_data.get("name", "Attack"), Color.ORANGE)
	else:
		_log_debug("CombatActions", "Enemy %s MISSED!" % enemy["instance_id"])
		AudioManager.play_sfx("miss")

func _select_optimal_target(enemies: Array) -> Dictionary:
	var alive_enemies = enemies.filter(func(e): return e.get("current_health", 0) > 0)
	if alive_enemies.is_empty(): return {}
	
	var target = alive_enemies[0]
	for i in range(1, alive_enemies.size()):
		if alive_enemies[i]["current_health"] < target["current_health"]:
			target = alive_enemies[i]
			
	return target

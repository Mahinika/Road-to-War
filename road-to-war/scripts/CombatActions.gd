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
	
	# Structured logging via CursorLogManager
	var log_manager = get_node_or_null("/root/CursorLogManager")
	if log_manager:
		log_manager.log_structured(
			"CombatActions.gd:82",
			"Hero action distance check",
			{"hero_id": hero.id, "distance": distance, "ability_range": ability_range, "will_charge": distance > ability_range},
			"debug-session",
			"L"
		)
	
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
	
	# Structured logging via CursorLogManager (get once for reuse in function)
	var log_manager = get_node_or_null("/root/CursorLogManager")
	if log_manager:
		log_manager.log_structured(
			"CombatActions.gd:99",
			"Hero attacking",
			{
				"hero_id": hero.id,
				"hero_name": hero.name,
				"hero_attack": hero.current_stats.get("attack", 0),
				"ability": ability_name,
				"enemy_id": enemy_instance_id,
				"enemy_health_before": enemy.get("current_health", 0),
				"enemy_max_health": enemy.get("stats", {}).get("maxHealth", 0),
				"enemy_defense": enemy.get("stats", {}).get("defense", 0)
			},
			"debug-session",
			"M,N"
		)
	
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

	# Handle taunt abilities (no damage, just threat manipulation)
	var ability_type = ability_def.get("type", "attack")
	
	# Handle pet summoning (Hunter pets, Warlock demons)
	if ability_type == "summon_pet":
		var pet_type = ability_def.get("petType", "")
		if pet_type != "":
			var ps = get_node_or_null("/root/PetSystem")
			if ps:
				if ps.summon_pet(hero.id, pet_type):
					# Show visual feedback
					var pm = get_node_or_null("/root/ParticleManager")
					if pm:
						var world = get_node_or_null("/root/World")
						if world:
							var hero_node = world._find_unit_node(hero.id)
							if hero_node:
								pm.create_floating_text(hero_node.global_position + Vector2(0, -20), "Summoned!", Color.GREEN)
		
		AbilityManager.set_cooldown(hero.id, ability_name)
		return
	
	# Handle form/stance changes (Druid forms, Warrior stances, Rogue stealth)
	if ability_type == "form" or ability_type == "stance":
		var form_id = ability_def.get("formId", "")
		if form_id != "":
			var fs = get_node_or_null("/root/FormSystem")
			if fs:
				var current_form = fs.get_form(hero.id)
				if current_form == form_id:
					# Already in this form, exit form
					fs.set_form(hero.id, "")
					_log_info("CombatActions", "%s exited %s" % [hero.name, ability_def.get("name", "form")])
				else:
					# Enter new form
					if fs.set_form(hero.id, form_id):
						# Show visual feedback
						var pm = get_node_or_null("/root/ParticleManager")
						if pm:
							var world = get_node_or_null("/root/World")
							if world:
								var hero_node = world._find_unit_node(hero.id)
								if hero_node:
									pm.create_floating_text(hero_node.global_position + Vector2(0, -20), ability_def.get("name", "Form") + "!", Color.MAGENTA)
						
						# Recalculate stats after form change
						var sc = get_node_or_null("/root/StatCalculator")
						if sc:
							sc.recalculate_hero_stats(hero)
		
		AbilityManager.set_cooldown(hero.id, ability_name)
		return
	
	# Handle party buffs (Arcane Intellect, Power Word: Fortitude, Auras, Aspects)
	if ability_type == "party_buff":
		var buff_id = ability_def.get("buffId", "")
		if buff_id != "":
			var pbs = get_node_or_null("/root/PartyBuffSystem")
			if pbs:
				var is_toggleable = ability_def.get("toggleable", false)
				if is_toggleable and pbs.has_buff(buff_id):
					# Toggle off if already active
					pbs.remove_party_buff(buff_id)
					_log_info("CombatActions", "%s toggled off %s" % [hero.name, ability_def.get("name", buff_id)])
				else:
					# Apply buff (or toggle on)
					if is_toggleable:
						# Remove other buffs of same category (e.g., remove other auras when applying new aura)
						var buff_name = ability_def.get("name", "").to_lower()
						if "aura" in buff_name:
							pbs.remove_party_buff("devotion_aura")
							pbs.remove_party_buff("retribution_aura")
						elif "aspect" in buff_name:
							pbs.remove_party_buff("aspect_of_the_hawk")
							pbs.remove_party_buff("aspect_of_the_cheetah")
					
					pbs.apply_party_buff(buff_id, hero.id)
					
					# Show visual feedback
					var pm = get_node_or_null("/root/ParticleManager")
					if pm:
						var world = get_node_or_null("/root/World")
						if world:
							var hero_node = world._find_unit_node(hero.id)
							if hero_node:
								pm.create_floating_text(hero_node.global_position + Vector2(0, -20), ability_def.get("name", "Buff") + "!", Color.CYAN)
		
		AbilityManager.set_cooldown(hero.id, ability_name)
		return
	
	if ability_type == "taunt":
		var threat_bonus = ability_def.get("threatBonus", 1000)
		var is_aoe = ability_def.get("aoe", false)
		var aoe_radius = ability_def.get("aoeRadius", 0.0)
		
		var ts = get_node_or_null("/root/ThreatSystem")
		if ts:
			if is_aoe:
				ts.taunt(enemy_instance_id, hero.id, threat_bonus, true, aoe_radius)
			else:
				ts.taunt(enemy_instance_id, hero.id, threat_bonus, false, 0.0)
		
		# Show taunt visual feedback
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			var world = get_node_or_null("/root/World")
			if world:
				var hero_node = world._find_unit_node(hero.id)
				var enemy_node = world._find_unit_node(enemy_instance_id)
				if hero_node and enemy_node:
					pm.create_floating_text(enemy_node.global_position + Vector2(0, -30), "TAUNTED!", Color.YELLOW)
		
		AbilityManager.set_cooldown(hero.id, ability_name)
		return
	
	# Handle DoT abilities (apply DoT, may also do initial damage)
	if ability_type in ["dot", "dot_attack", "dot_heal"]:
		var dot_id = ability_name
		var dot_mult = float(ability_def.get("dotMultiplier", 0.3))
		var duration = float(ability_def.get("duration", 12))
		
		# Calculate DoT damage per tick based on hero stats
		var base_damage = DamageCalculator.calculate_damage(hero.current_stats, enemy.get("stats", {}), hero, enemy)
		var dot_damage_per_tick = base_damage.get("damage", 0.0) * dot_mult
		var initial_damage = 0.0
		
		# dot_attack does initial damage + DoT
		if ability_type == "dot_attack":
			initial_damage = base_damage.get("damage", 0.0) * float(ability_def.get("damageMultiplier", 1.0))
		
		# Apply DoT with refresh logic
		var dot_mgr = get_node_or_null("/root/DoTManager")
		if dot_mgr:
			var total_damage = dot_damage_per_tick * (duration / 1.0)  # Estimate total DoT damage
			dot_mgr.apply_dot(enemy_instance_id, dot_id, hero.id, dot_damage_per_tick, duration, total_damage)
		
		# Apply initial damage if dot_attack
		if ability_type == "dot_attack" and initial_damage > 0:
			if not base_damage.get("miss", false):
				DamageCalculator.deal_damage(hero, enemy, initial_damage, base_damage.get("is_crit", false))
				if base_damage.get("is_crit", false):
					AudioManager.play_crit_sfx()
				else:
					AudioManager.play_hit_sfx()
				
				var threat_mult = 2.0 if hero.role == "tank" else 1.0
				CombatAI.add_threat(enemy_instance_id, hero.id, initial_damage, threat_mult)
		
		AbilityManager.set_cooldown(hero.id, ability_name)
		return
	
	var result = DamageCalculator.calculate_damage(hero.current_stats, enemy.get("stats", {}), hero, enemy)
	
	# Structured logging via CursorLogManager (reuse log_manager from above)
	if log_manager:
		log_manager.log_structured(
			"CombatActions.gd:119",
			"Damage calculated",
			{"damage": result.get("damage", 0), "is_crit": result.get("is_crit", false), "miss": result.get("miss", false)},
			"debug-session",
			"M"
		)
	
	if not result.get("miss", false):
		# CRITICAL FIX: Pass the hero object directly as attacker for correct statistics tracking
		DamageCalculator.deal_damage(hero, enemy, result.get("damage", 0.0), result.get("is_crit", false))
		
		# Structured logging via CursorLogManager (reuse log_manager from above)
		if log_manager:
			log_manager.log_structured(
				"CombatActions.gd:122",
				"Damage dealt",
				{"enemy_health_after": enemy.get("current_health", 0), "enemy_killed": enemy.get("current_health", 0) <= 0},
				"debug-session",
				"N"
			)
		
		if result.get("is_crit", false):
			AudioManager.play_crit_sfx()
		else:
			AudioManager.play_hit_sfx()
		
		var threat_mult = 2.0 if hero.role == "tank" else 1.0
		CombatAI.add_threat(enemy_instance_id, hero.id, result["damage"], threat_mult)
		
		# Handle combo points for Rogues
		if hero.class_id == "rogue":
			var cps = get_node_or_null("/root/ComboPointSystem")
			if cps:
				var combo_points_gained = ability_def.get("comboPoints", 0)
				var is_finisher = ability_type == "finisher"
				
				if is_finisher:
					# Consume combo points for finisher
					var consumed = cps.consume_combo_points(hero.id, 5)
					# Finisher damage scales with combo points consumed (could apply multiplier here)
					if consumed > 0:
						_log_debug("CombatActions", "%s used finisher with %d combo points" % [hero.name, consumed])
				elif combo_points_gained > 0:
					# Add combo points from builder
					cps.add_combo_points(hero.id, combo_points_gained)
			
			# Check if ability requires stealth
			var requires_stealth = ability_def.get("requiresStealth", false)
			if requires_stealth:
				var fs = get_node_or_null("/root/FormSystem")
				if fs and not fs.is_in_form(hero.id, "stealth"):
					_log_warn("CombatActions", "%s tried to use %s but is not in stealth!" % [hero.name, ability_name])
					return  # Can't use stealth-only abilities when not stealthed
				
				# Stealth abilities break stealth
				if fs:
					fs.set_form(hero.id, "")
					_log_debug("CombatActions", "%s broke stealth" % hero.name)
		
		AbilityManager.set_cooldown(hero.id, ability_name)
	else:
		_log_debug("CombatActions", "%s MISSED %s!" % [hero.name, enemy_instance_id])

func execute_enemy_turn(enemies: Array):
	# Structured logging via CursorLogManager
	var alive_count = 0
	for e in enemies:
		if e.get("current_health", 0) > 0: alive_count += 1
	var log_manager = get_node_or_null("/root/CursorLogManager")
	if log_manager:
		log_manager.log_structured(
			"CombatActions.gd:134",
			"Enemy turn starting",
			{"total_enemies": enemies.size(), "alive_enemies": alive_count},
			"debug-session",
			"O,P"
		)
	
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

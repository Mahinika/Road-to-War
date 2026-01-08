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
signal combat_action_executed(data)  # Real-time combat action events
signal damage_dealt(source, target, amount, is_crit)
signal healing_applied(healer, target, amount)

var in_combat: bool = false
var current_combat: Dictionary = {}
var combat_round: int = 0
var current_turn: String = "party" # "party" or "enemy"
var combat_paused: bool = false # paused when player opens menu scenes (inventory, talents, etc.)

# Real-time combat tracking
var hero_attack_cooldowns: Dictionary = {}  # hero_id -> time_until_next_attack
var enemy_attack_cooldowns: Dictionary = {}  # enemy_instance_id -> time_until_next_attack
var combat_delta_accumulator: float = 0.0

# RuneScape-style targeting: units keep attacking the same target until it dies.
var hero_target_lock: Dictionary = {}   # hero_id -> enemy_instance_id
var enemy_target_lock: Dictionary = {}  # enemy_instance_id -> hero_id

func _ready():
	_log_info("CombatManager", "Initialized with Real-Time Multi-Enemy combat")
	
	# Connect sub-module signals
	var dc = get_node_or_null("/root/DamageCalculator")
	if dc:
		dc.damage_applied.connect(_on_damage_applied)
		dc.healing_applied.connect(_on_healing_applied)

func _process(delta):
	if not in_combat:
		return
	if combat_paused:
		return
	
	# Real-time combat processing
	combat_delta_accumulator += delta
	
	# Update attack cooldowns
	for hero_id in hero_attack_cooldowns.keys():
		hero_attack_cooldowns[hero_id] = max(0, hero_attack_cooldowns[hero_id] - delta)
	
	for enemy_id in enemy_attack_cooldowns.keys():
		enemy_attack_cooldowns[enemy_id] = max(0, enemy_attack_cooldowns[enemy_id] - delta)
	
	# #region agent log - Removed health log to reduce noise
	# #endregion
	
	# Process combat actions (heroes and enemies attack when ready)
	_process_realtime_combat(delta)
	
	# Check if combat ended every frame
	var status = _check_combat_end()
	if status["ended"]:
		_end_combat(status["victory"])

func set_combat_paused(paused: bool) -> void:
	combat_paused = paused

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
	hero_target_lock.clear()
	enemy_target_lock.clear()
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
	
	# Initialize combat cooldowns for all participants
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			hero_attack_cooldowns[hero.id] = 0.0  # Start ready to attack
	
	for enemy in enemy_group:
		enemy_attack_cooldowns[enemy["instance_id"]] = 0.5  # Small delay before first enemy attack
	
	_log_info("CombatManager", "Emitting combat_started signal for group")
	combat_started.emit(enemy_group)

func _process_realtime_combat(_delta: float):
	"""Real-time combat: heroes and enemies attack when cooldowns ready"""
	if not in_combat: 
		return
	
	var combat_time = Time.get_ticks_msec() - current_combat.get("start_time", 0)
	var pm = get_node_or_null("/root/PartyManager")
	
	# Process status effects periodically (every ~1 second)
	if int(combat_delta_accumulator * 10) % 10 == 0:
		if pm:
			for hero in pm.heroes:
				_process_status_effects(hero.id)
		
		for enemy in current_combat["enemies"]:
			if enemy.get("current_health", 0) > 0:
				_process_status_effects(enemy["instance_id"])
				if has_node("/root/CombatAI"):
					CombatAI.update_ai_state(enemy["instance_id"], enemy, combat_time)
	
	# Heroes attack when cooldown ready
	if pm:
		for hero in pm.heroes:
			if hero.current_stats.get("health", 0) > 0:
				if hero_attack_cooldowns.get(hero.id, 999) <= 0:
					_execute_hero_attack(hero)
	
	# Enemies attack when cooldown ready
	for enemy in current_combat["enemies"]:
		if enemy.get("current_health", 0) > 0:
			if enemy_attack_cooldowns.get(enemy["instance_id"], 999) <= 0:
				_execute_enemy_attack(enemy)

func _execute_hero_attack(hero):
	"""Execute a single hero's attack in real-time combat"""
	# #region agent log
	var h_hp = hero.current_stats.get("health", 0)
	var log_file_att = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.READ_WRITE)
	if log_file_att:
		log_file_att.seek_end()
		log_file_att.store_line(JSON.stringify({
			"location": "CombatManager.gd:213",
			"message": "HERO ATTACKING",
			"data": {
				"hero_id": hero.id,
				"hp": h_hp,
				"is_dead": h_hp <= 0
			},
			"timestamp": Time.get_ticks_msec(),
			"sessionId": "debug-session",
			"hypothesisId": "BB,G"
		}))
		log_file_att.close()
	# #endregion
	# Build alive enemy list
	var alive_enemies: Array = []
	for enemy in current_combat.get("enemies", []):
		if enemy.get("current_health", 0) > 0:
			alive_enemies.append(enemy)
	if alive_enemies.is_empty():
		return
	
	# Ability selection (WotLK-style ability kits; data-driven via classes/specs/abilities.json)
	var am = get_node_or_null("/root/AbilityManager")
	var dc = get_node_or_null("/root/DamageCalculator")
	if not am or not dc:
		return
	
	# Party state for healers/utility selection
	var party_state: Array = []
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for h in pm.heroes:
			party_state.append({
				"id": h.id,
				"current_health": h.current_stats.get("health", 0),
				"max_health": h.current_stats.get("maxHealth", 100)
			})
	
	# Target lock: keep current target until dead
	var target_enemy: Dictionary = {}
	var locked_id = str(hero_target_lock.get(hero.id, ""))
	if locked_id != "":
		for e in alive_enemies:
			if str(e.get("instance_id", "")) == locked_id:
				target_enemy = e
				break
	
	if target_enemy.is_empty():
		# Pick a stable target (lowest HP feels more "focused" like OSRS)
		target_enemy = alive_enemies[0]
		for e in alive_enemies:
			if int(e.get("current_health", 0)) < int(target_enemy.get("current_health", 0)):
				target_enemy = e
		hero_target_lock[hero.id] = str(target_enemy.get("instance_id", ""))
	var context = {
		"enemies": alive_enemies,
		"target": target_enemy,
		"party_state": party_state
	}
	
	var ability_name: String = am.select_ability(hero, context)
	if ability_name == "":
		ability_name = "auto_attack"
	
	var ability_def: Dictionary = am.get_ability_definition(hero.id, ability_name)
	if ability_def.is_empty():
		ability_name = "auto_attack"
		ability_def = am.get_ability_definition(hero.id, ability_name)
	
	# Resource consumption
	var rm = get_node_or_null("/root/ResourceManager")
	if rm and ability_name != "auto_attack":
		var cost = int(ability_def.get("cost", 0))
		var res_type = str(ability_def.get("resourceType", "mana"))
		if cost > 0:
			rm.consume_resource(hero.id, res_type, cost)
	
	var ability_type: String = str(ability_def.get("type", "attack"))
	
	# Heal targeting (for heal / heal_attack)
	if ability_type in ["heal", "aoe_heal", "heal_attack"]:
		var chosen_target = hero
		var lowest_pct = 1.1
		if pm:
			for h in pm.heroes:
				var max_hp = float(h.current_stats.get("maxHealth", 100))
				var hp = float(h.current_stats.get("health", 0))
				var pct = hp / max(1.0, max_hp)
				if pct < lowest_pct:
					lowest_pct = pct
					chosen_target = h
		
		# heal_attack: only heal if someone is wounded, otherwise treat as attack
		if ability_type == "heal_attack" and lowest_pct >= 0.85:
			ability_type = "attack"
		else:
			var amount = 0.0
			var heal_percent = float(ability_def.get("healPercent", 0.0))
			if heal_percent > 0.0:
				amount = float(chosen_target.current_stats.get("maxHealth", 100)) * heal_percent
			else:
				var heal_mult = float(ability_def.get("healMultiplier", 1.5))
				var base_power = float(hero.current_stats.get("spellPower", hero.current_stats.get("attack", 10)))
				amount = base_power * heal_mult
			
			dc.deal_healing(hero, chosen_target, amount)
			am.set_cooldown(hero.id, ability_name)
			combat_action_executed.emit({
				"actor": hero.id,
				"action": ability_name,
				"target": chosen_target.id,
				"healing": amount
			})
			# GCD / attack pacing (keep existing attack_speed pacing)
			var attack_speed = hero.current_stats.get("attackSpeed", 1.5)
			hero_attack_cooldowns[hero.id] = attack_speed
			return
	
	# Damage targeting
	if ability_type == "aoe":
		var dmg_mult = float(ability_def.get("damageMultiplier", 1.0))
		for enemy in alive_enemies:
			if enemy.get("current_health", 0) <= 0:
				continue
			var result = dc.calculate_damage(hero.current_stats, enemy.get("stats", {}), hero, enemy)
			if result.get("miss", false):
				continue
			var dmg = float(result.get("damage", 0)) * dmg_mult
			dc.deal_damage(hero, enemy, dmg, bool(result.get("is_crit", false)))
		am.set_cooldown(hero.id, ability_name)
		combat_action_executed.emit({
			"actor": hero.id,
			"action": ability_name,
			"target": "aoe",
			"damageMultiplier": dmg_mult
		})
	else:
		# Single target damage (attack/dot/buff fallback treated as attack for now)
		var dmg_mult = float(ability_def.get("damageMultiplier", 1.0))
		var result = dc.calculate_damage(hero.current_stats, target_enemy.get("stats", {}), hero, target_enemy)
		if not result.get("miss", false):
			var dmg = float(result.get("damage", 0)) * dmg_mult
			dc.deal_damage(hero, target_enemy, dmg, bool(result.get("is_crit", false)))
			am.set_cooldown(hero.id, ability_name)
			combat_action_executed.emit({
				"actor": hero.id,
				"action": ability_name,
				"target": target_enemy.get("instance_id", ""),
				"damage": dmg,
				"is_crit": result.get("is_crit", false)
			})
	
	# Reset cooldown based on attack speed
	var attack_speed = hero.current_stats.get("attackSpeed", 1.5)  # seconds between attacks
	hero_attack_cooldowns[hero.id] = attack_speed

func _execute_enemy_attack(enemy: Dictionary):
	"""Execute a single enemy's attack in real-time combat"""
	var pm = get_node_or_null("/root/PartyManager")
	if not pm or pm.heroes.is_empty():
		return
	
	# Find an alive hero to attack (target lock)
	var alive_heroes = []
	for hero in pm.heroes:
		if hero.current_stats.get("health", 0) > 0:
			alive_heroes.append(hero)
	
	# #region agent log
	var hero_healths = []
	for hero in pm.heroes:
		hero_healths.append(hero.current_stats.get("health", 0))
	var log_file = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
	if log_file: log_file.seek_end(); log_file.store_line(JSON.stringify({"location":"CombatManager.gd:238","message":"Enemy attacking - hero status","data":{"total_heroes":pm.heroes.size(),"alive_heroes":alive_heroes.size(),"hero_healths":hero_healths},"timestamp":Time.get_ticks_msec(),"sessionId":"debug-session","hypothesisId":"Q"})); log_file.close()
	# #endregion
	
	if alive_heroes.is_empty():
		return
	
	var target = null
	var locked_id = str(enemy_target_lock.get(enemy.get("instance_id", ""), ""))
	if locked_id != "":
		for h in alive_heroes:
			if h.id == locked_id:
				target = h
				break
	if target == null:
		target = alive_heroes[randi() % alive_heroes.size()]
		enemy_target_lock[enemy.get("instance_id", "")] = target.id
	
	# Execute attack using DamageCalculator
	var dc = get_node_or_null("/root/DamageCalculator")
	if dc:
		var damage = enemy.get("stats", {}).get("attack", 10)
		var crit_chance = enemy.get("stats", {}).get("critChance", 0.05)
		var is_crit = randf() < crit_chance
		if is_crit:
			damage *= enemy.get("stats", {}).get("critMultiplier", 1.5)
		
		# CRITICAL FIX: Pass the hero object directly to deal_damage so stats are updated on the object, not a copy
		dc.deal_damage(enemy, target, int(damage), is_crit)
		
		# Trigger attack animation
		combat_action_executed.emit({
			"actor": enemy["instance_id"],
			"action": "attack",
			"target": target.id,
			"damage": damage,
			"is_crit": is_crit
		})
	
	# Reset cooldown based on attack speed
	var attack_speed = enemy.get("stats", {}).get("attackSpeed", 2.0)
	enemy_attack_cooldowns[enemy["instance_id"]] = attack_speed

func _process_status_effects(combatant_id: String):
	var sem = get_node_or_null("/root/StatusEffectsManager")
	var dc = get_node_or_null("/root/DamageCalculator")
	if not sem or not dc: return
	
	var res = sem.process_turn(combatant_id)
	if res["damage"] > 0:
		# Find the actual combatant object/dictionary to update
		var target = null
		
		# Check enemies
		for enemy in current_combat.get("enemies", []):
			if enemy.get("instance_id") == combatant_id:
				target = enemy
				break
		
		# Check heroes if not found in enemies
		if not target:
			var pm = get_node_or_null("/root/PartyManager")
			target = pm.get_hero_by_id(combatant_id) if pm else null
		
		if target:
			dc.deal_damage({"id": "status_effect"}, target, res["damage"], false)

func _get_combatant_by_id(id: String) -> Dictionary:
	# Check enemies first
	for enemy in current_combat.get("enemies", []):
		if enemy.get("instance_id") == id: return enemy
		
	# Check heroes
	var pm = get_node_or_null("/root/PartyManager")
	var hero = pm.get_hero_by_id(id) if pm else null
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
		# #region agent log
		var log_file_end = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.READ_WRITE)
		if log_file_end:
			log_file_end.seek_end()
			log_file_end.store_line(JSON.stringify({
				"location": "CombatManager.gd:350",
				"message": "COMBAT END CHECK - ALL ENEMIES DEAD",
				"data": {
					"all_enemies_dead": true,
					"all_heroes_dead": false # Implicit
				},
				"timestamp": Time.get_ticks_msec(),
				"sessionId": "debug-session",
				"hypothesisId": "J,K"
			}))
			log_file_end.close()
		# #endregion
		return {"ended": true, "victory": true}
		
	var all_heroes_dead = true
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			if hero.current_stats.get("health", 0) > 0:
				all_heroes_dead = false
				break
			
	if all_heroes_dead:
		# #region agent log
		var log_file_end = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.READ_WRITE)
		if log_file_end:
			log_file_end.seek_end()
			log_file_end.store_line(JSON.stringify({
				"location": "CombatManager.gd:361",
				"message": "COMBAT END CHECK - ALL HEROES DEAD",
				"data": {
					"all_enemies_dead": false,
					"all_heroes_dead": true
				},
				"timestamp": Time.get_ticks_msec(),
				"sessionId": "debug-session",
				"hypothesisId": "J,K"
			}))
			log_file_end.close()
		# #endregion
		return {"ended": true, "victory": false}
		
	return {"ended": false, "victory": false}

func _end_combat(victory: bool):
	in_combat = false
	var enemies = current_combat.get("enemies", [])
	
	# #region agent log
	var log_file_ec = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.READ_WRITE)
	if log_file_ec:
		log_file_ec.seek_end()
		log_file_ec.store_line(JSON.stringify({
			"location": "CombatManager.gd:367",
			"message": "COMBAT ENDED",
			"data": {
				"victory": victory
			},
			"timestamp": Time.get_ticks_msec(),
			"sessionId": "debug-session",
			"hypothesisId": "K"
		}))
		log_file_ec.close()
	# #endregion
	
	# REVIVE/HEAL HEROES: Ensure heroes aren't left at 0 HP
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			var max_hp = hero.current_stats.get("maxHealth", 100)
			var current_hp = hero.current_stats.get("health", 0)
			
			# If victorious, heal 25% of max HP. If lost, heal to 10% (revival).
			var heal_amount = max_hp * (0.25 if victory else 0.10)
			hero.current_stats["health"] = clamp(current_hp + heal_amount, 1.0, max_hp)
			
			_log_debug("CombatManager", "Hero %s revived/healed to %d HP" % [hero.name, hero.current_stats["health"]])
	
	# Check for challenge mode updates
	_update_challenge_modes(victory, enemies)
	
	if victory:
		_distribute_group_rewards(enemies)
		
	current_combat = {}
	combat_ended.emit(victory)
	_log_info("CombatManager", "Combat ended. Victory: %s" % str(victory))

func _update_challenge_modes(victory: bool, enemies: Array):
	var cm = get_node_or_null("/root/ChallengeModeManager")
	if not cm or cm.active_challenge == cm.ChallengeType.NONE:
		return
	
	match cm.active_challenge:
		cm.ChallengeType.BOSS_RUSH:
			if victory:
				for enemy in enemies:
					if enemy.get("type", "") == "boss":
						cm.challenge_data["bosses_defeated"] = cm.challenge_data.get("bosses_defeated", 0) + 1
						if cm.challenge_data["bosses_defeated"] >= cm.challenge_data["total_bosses"]:
							cm.end_challenge(true, cm.challenge_data["bosses_defeated"])
		cm.ChallengeType.NO_DEATH:
			# Check for hero deaths
			var pm = get_node_or_null("/root/PartyManager")
			if pm:
				for hero in pm.heroes:
					if hero.current_stats.get("health", 0) <= 0:
						cm.challenge_data["deaths"] = cm.challenge_data.get("deaths", 0) + 1
						cm.end_challenge(false, 0)
						return
		cm.ChallengeType.ELITE_ONLY:
			if victory:
				for enemy in enemies:
					if enemy.get("type", "") == "elite":
						cm.challenge_data["elite_count"] = cm.challenge_data.get("elite_count", 0) + 1
					else:
						cm.challenge_data["regular_count"] = cm.challenge_data.get("regular_count", 0) + 1

func _distribute_group_rewards(defeated_enemies: Array):
	var total_exp = 0
	var total_gold = 0
	var all_loot_drops = []
	
	for enemy_data in defeated_enemies:
		# Handle Bursting affix (explode on death)
		_handle_bursting_affix(enemy_data)
		
		# Drop Ethereal Essence in brutal mode (Mile 101+)
		_drop_ethereal_essence(enemy_data)
		
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
	var shm = get_node_or_null("/root/ShopManager")
	if shm:
		shm.add_gold(total_gold)
	
	var stm = get_node_or_null("/root/StatisticsManager")
	if stm:
		stm.increment_stat("collection", "goldEarned", total_gold)
	
	# Spawn Loot
	var lm = get_node_or_null("/root/LootManager")
	_log_debug("CombatManager", "Attempting loot spawn. LM: %s, Enemies: %d" % [str(lm != null), defeated_enemies.size()])
	if lm and not defeated_enemies.is_empty():
		# Always call spawn_loot to trigger the 10-item procedural drop logic
		_log_debug("CombatManager", "Calling spawn_loot for 10-item test")
		lm.spawn_loot(defeated_enemies[0], all_loot_drops)

func _handle_bursting_affix(enemy_data: Dictionary):
	# Bursting: Enemies explode on death, dealing damage to nearby heroes
	var affixes = enemy_data.get("brutal_affixes", [])
	if not affixes.has("Bursting"):
		return
	
	_log_info("CombatManager", "Bursting affix triggered! Enemy explodes on death")
	
	var pm = get_node_or_null("/root/PartyManager")
	var dc = get_node_or_null("/root/DamageCalculator")
	if not pm or not dc:
		return
	
	# Deal damage to all heroes
	var burst_damage = enemy_data.get("stats", {}).get("attack", 10) * 0.5  # 50% of attack as burst damage
	for hero in pm.heroes:
		if hero.current_stats.get("health", 0) > 0:
			# CRITICAL FIX: Pass the hero object directly, not a copy
			dc.deal_damage({"id": "bursting_explosion"}, hero, int(burst_damage), false)
			_log_info("CombatManager", "Bursting damage dealt to %s: %d" % [hero.name, int(burst_damage)])
	
	# Visual effect
	var part_m = get_node_or_null("/root/ParticleManager")
	if part_m:
		# Create explosion effect at enemy position (approximate center)
		part_m.create_hit_effect(Vector2(960, 540), Color.ORANGE_RED)

func _handle_thundering_affix(combatant_id: String):
	# Thundering: Periodic AoE damage to all heroes
	var combatant = _get_combatant_by_id(combatant_id)
	if combatant.is_empty():
		return
	
	# Only enemies can have Thundering affix
	var is_enemy = false
	for enemy in current_combat.get("enemies", []):
		if enemy.get("instance_id") == combatant_id:
			is_enemy = true
			break
	
	if not is_enemy:
		return
	
	var affixes = combatant.get("brutal_affixes", [])
	if not affixes.has("Thundering"):
		return
	
	# Thundering triggers every 3 combat rounds
	if combat_round % 3 != 0:
		return
	
	_log_info("CombatManager", "Thundering affix triggered! AoE damage to all heroes")
	
	var pm = get_node_or_null("/root/PartyManager")
	var dc = get_node_or_null("/root/DamageCalculator")
	if not pm or not dc:
		return
	
	# Deal AoE damage to all heroes
	var thunder_damage = combatant.get("stats", {}).get("attack", 10) * 0.3  # 30% of attack as thunder damage
	for hero in pm.heroes:
		if hero.current_stats.get("health", 0) > 0:
			# CRITICAL FIX: Pass the hero object directly, not a copy
			dc.deal_damage({"id": "thundering_aoe"}, hero, int(thunder_damage), false)
			_log_info("CombatManager", "Thundering damage dealt to %s: %d" % [hero.name, int(thunder_damage)])
	
	# Visual effect
	var part_m = get_node_or_null("/root/ParticleManager")
	if part_m:
		part_m.create_floating_text(Vector2(960, 400), "THUNDERING!", Color.YELLOW)

func _drop_ethereal_essence(enemy_data: Dictionary):
	# Drop Ethereal Essence in brutal mode (Mile 101+)
	var wm = get_node_or_null("/root/WorldManager")
	var bm = get_node_or_null("/root/BrutalModeManager")
	if not wm or not bm or not bm.is_brutal_mode() or wm.current_mile <= 100:
		return
	
	var drop_rates = bm.get_ethereal_essence_drop_rate()
	var enemy_type = enemy_data.get("type", "basic")
	var is_boss = enemy_type == "boss"
	var is_elite = enemy_type == "elite"
	
	var essence_amount = 0
	if is_boss:
		essence_amount = randi_range(drop_rates["boss_min"], drop_rates["boss_max"])
	elif is_elite:
		essence_amount = randi_range(drop_rates["elite_min"], drop_rates["elite_max"])
	else:
		essence_amount = randi_range(drop_rates["min"], drop_rates["max"])
	
	if essence_amount > 0:
		var prestige_m = get_node_or_null("/root/PrestigeManager")
		if prestige_m:
			prestige_m.add_ethereal_essence(essence_amount)
			_log_info("CombatManager", "Dropped %d Ethereal Essence from %s" % [essence_amount, enemy_data.get("name", "enemy")])
		
		# Visual feedback
		var part_m = get_node_or_null("/root/ParticleManager")
		if part_m:
			part_m.create_floating_text(Vector2(960, 500), "+%d Ethereal Essence" % essence_amount, Color.CYAN)

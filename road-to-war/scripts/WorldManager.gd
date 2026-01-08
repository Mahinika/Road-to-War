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

# WorldManager.gd - Handles procedural generation, hero movement, and encounters

signal mile_changed(current_mile, max_mile_reached, previous_mile)
signal combat_triggered(enemy)
signal mile_100_arrived()
signal victory_achieved()

var current_segment: int = 0
var current_mile: int = 0
var max_mile_reached: int = 0
var distance_traveled: float = 0.0
var segments: Dictionary = {}
var enemies: Array = []
var encounters: Array = []
var combat_active: bool = false
var claimed_milestones: Array = []
var encounter_cooldown: float = 0.0 # Time in seconds until next possible encounter
var awaiting_final_boss_victory: bool = false

var scroll_speed: float = 200.0
var segment_width: float = 800.0
var segment_height: float = 1080.0

func _ready():
	_log_info("WorldManager", "Initialized")
	
	# Safe connect
	var cm = get_node_or_null("/root/CombatManager")
	if cm:
		cm.combat_ended.connect(handle_combat_end)
	
	# Safe data fetch
	var enemies_data = {}
	var dm = get_node_or_null("/root/DataManager")
	if dm:
		enemies_data = dm.get_data("enemies")
	
	if enemies_data:
		_log_info("WorldManager", "Enemies data loaded: %d enemies available" % enemies_data.size())
	else:
		_log_error("WorldManager", "Enemies data NOT loaded!")

func update_world(delta: float):
	if combat_active: return
	
	if encounter_cooldown > 0:
		encounter_cooldown -= delta
	
	update_movement(delta)
	check_segment_generation()

func update_movement(delta: float):
	var distance_in_frame = scroll_speed * delta
	distance_traveled += distance_in_frame
	
	var new_segment = int(distance_traveled / segment_width)
	if new_segment > current_segment:
		current_segment = new_segment
		update_current_mile()
		_log_debug("WorldManager", "Reached segment %d" % current_segment)
		
		if encounter_cooldown <= 0:
			_trigger_random_encounter()

func _trigger_random_encounter():
	_log_info("WorldManager", "Attempting to trigger random encounter...")
	
	var group_size = randi_range(1, 2)
	if current_mile >= 20: group_size = randi_range(4, 6)
	elif current_mile >= 10: group_size = randi_range(3, 5)
	elif current_mile >= 5: group_size = randi_range(2, 4)
	
	var enemy_group = []
	var roles_needed = []
	
	if group_size > 1:
		roles_needed.append("melee") # At least one melee
		if group_size >= 3:
			roles_needed.append("ranged")
		if group_size >= 4:
			roles_needed.append("healer")
	
	for i in range(group_size):
		var preferred_role = roles_needed[i] if i < roles_needed.size() else ""
		var enemy = _get_random_enemy(preferred_role)
		if not enemy.is_empty():
			var enemy_instance = enemy.duplicate(true)
			# Ensure unique instance ID for combat logic
			enemy_instance["instance_id"] = "%s_%d_%d" % [enemy_instance["id"], current_mile, i]
			enemy_group.append(enemy_instance)
	
	if not enemy_group.is_empty():
		trigger_combat(enemy_group)
		encounter_cooldown = 3.0 # Significantly reduced downtime between fights

func _get_random_enemy(preferred_role: String = "") -> Dictionary:
	var enemies_data = {}
	var dm = get_node_or_null("/root/DataManager")
	if dm:
		enemies_data = dm.get_data("enemies")
		
	if not enemies_data or enemies_data.is_empty():
		_log_error("WorldManager", "Cannot select random enemy: No data!")
		return {}
	
	var possible_enemies = []
	var role_matches = []
	var mile = current_mile
	
	for key in enemies_data:
		var enemy_info = enemies_data[key]
		var enemy_level = enemy_info.get("level", 1)
		var enemy_type = enemy_info.get("type", "basic")
		var enemy_role = enemy_info.get("role", "melee")
		
		# Define level thresholds for miles
		var min_mile = 0
		if enemy_level >= 50: min_mile = 20
		elif enemy_level >= 15: min_mile = 10
		elif enemy_level >= 5: min_mile = 5
		elif enemy_level >= 2: min_mile = 2
		
		# Skip if mile too low for level
		if mile < min_mile:
			continue
			
		# Special handling for bosses
		if enemy_type == "boss":
			# Only spawn bosses on exactly mile 10, 20, 30...
			if mile == 0 or mile % 10 != 0:
				continue
		
		possible_enemies.append(key)
		if preferred_role != "" and enemy_role == preferred_role:
			role_matches.append(key)
	
	# Fallback if no enemies match (should at least have level 1 basic enemies)
	if possible_enemies.is_empty():
		_log_warn("WorldManager", "No possible enemies for mile %d! Fallback to slime." % mile)
		if enemies_data.has("slime"):
			return _apply_brutal_scaling(enemies_data["slime"].duplicate(), mile)
		else:
			return _apply_brutal_scaling(enemies_data[enemies_data.keys()[0]].duplicate(), mile)
	
	var pool = role_matches if not role_matches.is_empty() else possible_enemies
	var random_key = pool[randi() % pool.size()]
	var enemy = enemies_data[random_key].duplicate()
	
	if not enemy.has("id"):
		enemy["id"] = random_key
	
	# Apply brutal mode scaling if in brutal mode
	enemy = _apply_brutal_scaling(enemy, mile)
	
	# Make enemies tankier for better real-time combat visibility
	# Apply a health multiplier based on mile to make combat last longer
	if enemy.has("stats"):
		var stats = enemy["stats"]
		var base_health = stats.get("health", 100)
		var health_multiplier = 3.0 + (mile * 0.5)  # 3.5x at mile 1, scales up
		stats["health"] = int(base_health * health_multiplier)
		stats["maxHealth"] = stats["health"]
		
		# Also reduce hero damage effectiveness by boosting enemy defense
		var base_defense = stats.get("defense", 0)
		stats["defense"] = base_defense + (mile * 2)
	
	_log_info("WorldManager", "Selected random enemy: %s (Lv %d %s %s) for mile %d. Pool size: %d. HP: %d" % [random_key, enemy.get("level", 1), enemy.get("type", "basic"), enemy.get("role", "melee"), mile, pool.size(), enemy.get("stats", {}).get("health", 0)])
	return enemy

func _apply_brutal_scaling(enemy: Dictionary, mile: int) -> Dictionary:
	# Apply brutal mode scaling if in brutal mode and mile > 100
	var bm = get_node_or_null("/root/BrutalModeManager")
	if not bm or not bm.is_brutal_mode() or mile <= 100:
		return enemy
	
	var multipliers = bm.calculate_brutal_multipliers(mile)
	
	# Scale enemy level
	var base_level = enemy.get("level", 1)
	enemy["level"] = int(base_level * multipliers.level)
	
	# Scale stats
	if enemy.has("stats"):
		var stats = enemy["stats"]
		var base_health = stats.get("health", 100)
		var base_max_health = stats.get("maxHealth", base_health)
		var base_attack = stats.get("attack", 10)
		
		stats["health"] = int(base_health * multipliers.health)
		stats["maxHealth"] = int(base_max_health * multipliers.health)
		stats["attack"] = int(base_attack * multipliers.damage)
		
		# Apply Tyrannical affix for bosses
		if enemy.get("type", "") == "boss" and bm.brutal_affixes.has("Tyrannical"):
			stats["attack"] = int(stats["attack"] * 1.3)
	
	# Force elite status in brutal mode
	if enemy.get("type", "") != "boss":
		enemy["type"] = "elite"
	
	# Apply brutal affixes
	enemy["brutal_affixes"] = bm.brutal_affixes.duplicate()
	
	return enemy

func check_segment_generation():
	if not segments.has(current_segment + 1):
		generate_segment(current_segment + 1)

func segment_to_mile(p_segment_index: int) -> int:
	return int(floor(p_segment_index / 5.0))

func update_current_mile():
	var new_mile = segment_to_mile(current_segment)
	if new_mile != current_mile:
		var old_mile = current_mile
		current_mile = new_mile
		if current_mile > max_mile_reached:
			max_mile_reached = current_mile
		
		mile_changed.emit(current_mile, max_mile_reached, old_mile)
		_log_info("WorldManager", "Mile updated: %d -> %d" % [old_mile, current_mile])
		
		check_milestone_rewards()
		
		# Check for Mile 100 arrival (special handling)
		if current_mile == 100 and old_mile < 100:
			check_mile_100_arrival()

func check_milestone_rewards():
	var milestones = [25, 50, 75, 100]
	for m in milestones:
		if current_mile >= m and not claimed_milestones.has(m):
			_grant_milestone_reward(m)
			claimed_milestones.append(m)

func _grant_milestone_reward(mile: int):
	_log_info("WorldManager", "Granting milestone reward for Mile %d!" % mile)
	
	# Give rewards to all heroes
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			hero.available_talent_points += 2
			_log_info("WorldManager", "Hero %s received 2 bonus talent points!" % hero.name)
	
	# Global message via floating text (approximate center)
	var part_m = get_node_or_null("/root/ParticleManager")
	if part_m:
		part_m.create_floating_text(Vector2(960, 540), "MILE %d MILESTONE REACHED!" % mile, Color.GOLD)

func check_mile_100_arrival():
	_log_info("WorldManager", "Mile 100 arrived! Triggering final boss fight and victory celebration")
	mile_100_arrived.emit()
	awaiting_final_boss_victory = true
	
	# Trigger final boss fight (War Lord)
	_trigger_final_boss_fight()

func _trigger_final_boss_fight():
	_log_info("WorldManager", "Triggering final boss fight: War Lord")
	
	# Get War Lord boss enemy data
	var enemies_data = {}
	var dm = get_node_or_null("/root/DataManager")
	if dm:
		enemies_data = dm.get_data("enemies")
	
	var war_lord_data = {}
	if enemies_data.has("war_lord"):
		war_lord_data = enemies_data["war_lord"].duplicate(true)
	else:
		# Create War Lord boss if it doesn't exist
		war_lord_data = {
			"id": "war_lord",
			"name": "War Lord",
			"level": 100,
			"type": "boss",
			"stats": {
				"health": 50000,
				"maxHealth": 50000,
				"attack": 500,
				"defense": 200,
				"speed": 30
			},
			"abilities": [
				{
					"name": "Devastating Strike",
					"type": "damage",
					"damage_multiplier": 3.0,
					"cooldown": 5,
					"description": "Deals massive damage to all heroes"
				}
			],
			"rewards": {
				"experience": 10000,
				"gold": 20000
			}
		}
	
	# Ensure unique instance ID
	war_lord_data["instance_id"] = "war_lord_final_%d" % current_mile
	
	# Create boss group (single boss)
	var boss_group = [war_lord_data]
	
	# Trigger combat
	trigger_combat(boss_group)

func generate_segment(p_segment_index: int):
	var segment = {
		"index": p_segment_index,
		"x": p_segment_index * segment_width,
		"type": determine_segment_type(p_segment_index)
	}
	segments[p_segment_index] = segment
	return segment

func determine_segment_type(p_segment_index: int) -> String:
	var mile = segment_to_mile(p_segment_index)
	if mile < 15: return "plains"
	if mile < 35: return "forest"
	if mile < 55: return "mountains"
	if mile < 75: return "desert"
	if mile < 90: return "undead"
	return "arcane"

func trigger_combat(p_enemy_group: Array):
	if combat_active: return
	
	# Check for Elite Only challenge mode
	var cm = get_node_or_null("/root/ChallengeModeManager")
	if cm and cm.active_challenge == cm.ChallengeType.ELITE_ONLY:
		# Filter to only elite enemies
		var elite_group = []
		for enemy in p_enemy_group:
			if enemy.get("type", "") == "elite" or enemy.get("type", "") == "boss":
				elite_group.append(enemy)
		if elite_group.is_empty():
			# No elites, skip this encounter
			_log_info("WorldManager", "Elite Only mode: Skipping non-elite encounter")
			return
		p_enemy_group = elite_group
	
	combat_active = true
	_log_info("WorldManager", "Triggering combat with group of %d enemies" % p_enemy_group.size())
	combat_triggered.emit(p_enemy_group)

func handle_combat_end(victory: bool):
	combat_active = false
	_log_info("WorldManager", "Combat ended. Victory: " + str(victory))
	if awaiting_final_boss_victory and victory:
		awaiting_final_boss_victory = false
		victory_achieved.emit()

func initialize_world():
	current_segment = 0
	current_mile = 0
	distance_traveled = 0.0
	combat_active = false
	segments.clear()
	generate_segment(0)
	_log_info("WorldManager", "World initialized at mile 0")

func get_save_data() -> Dictionary:
	return {
		"current_segment": current_segment,
		"current_mile": current_mile,
		"max_mile_reached": max_mile_reached,
		"distance_traveled": distance_traveled,
		"claimed_milestones": claimed_milestones
	}

func load_save_data(save_data: Dictionary):
	current_segment = save_data.get("current_segment", 0)
	current_mile = save_data.get("current_mile", 0)
	max_mile_reached = save_data.get("max_mile_reached", 0)
	distance_traveled = save_data.get("distance_traveled", 0.0)
	claimed_milestones = save_data.get("claimed_milestones", [])
	
	# Regenerate segments around the current position
	segments.clear()
	generate_segment(current_segment)
	generate_segment(current_segment + 1)
	
	_log_info("WorldManager", "World state loaded: Mile %d" % current_mile)

func _update_challenge_mile_progress(mile: int):
	var cm = get_node_or_null("/root/ChallengeModeManager")
	if not cm or cm.active_challenge == cm.ChallengeType.NONE:
		return
	
	match cm.active_challenge:
		cm.ChallengeType.SPEED_RUN:
			if mile >= cm.challenge_data.get("target_mile", 100):
				var time_elapsed = cm.get_challenge_time()
				var score = int(time_elapsed)  # Score = seconds elapsed (lower is better)
				cm.end_challenge(true, score)
		cm.ChallengeType.NO_DEATH:
			if mile >= cm.challenge_data.get("target_mile", 100):
				cm.end_challenge(true, 100)  # Perfect score
		cm.ChallengeType.PRESTIGE_RUSH:
			# Update prestige rush stats
			var pm = get_node_or_null("/root/PartyManager")
			if pm:
				var total_levels = 0
				for hero in pm.heroes:
					total_levels += hero.level
				cm.challenge_data["total_levels"] = total_levels
			
			if mile >= 100:
				# Calculate efficiency score
				var efficiency = _calculate_prestige_efficiency()
				cm.end_challenge(true, efficiency)

func _calculate_prestige_efficiency() -> int:
	# Calculate prestige efficiency score based on levels, equipment, achievements
	var pm = get_node_or_null("/root/PartyManager")
	var em = get_node_or_null("/root/EquipmentManager")
	var am = get_node_or_null("/root/AchievementManager")
	
	if not pm:
		return 0
	
	var score = 0
	
	# Level contribution
	for hero in pm.heroes:
		score += hero.level * 10
	
	# Equipment contribution
	if em:
		var epic_count = 0
		var legendary_count = 0
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
		score += (epic_count * 20) + (legendary_count * 50)
	
	# Achievement contribution
	if am and am.has_method("get_unlocked_count"):
		score += am.get_unlocked_count() * 10
	
	return score

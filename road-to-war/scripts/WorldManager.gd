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
			return enemies_data["slime"].duplicate()
		else:
			return enemies_data[enemies_data.keys()[0]].duplicate()
	
	var pool = role_matches if not role_matches.is_empty() else possible_enemies
	var random_key = pool[randi() % pool.size()]
	var enemy = enemies_data[random_key].duplicate()
	
	if not enemy.has("id"):
		enemy["id"] = random_key
	
	_log_info("WorldManager", "Selected random enemy: %s (Lv %d %s %s) for mile %d. Pool size: %d" % [random_key, enemy.get("level", 1), enemy.get("type", "basic"), enemy.get("role", "melee"), mile, pool.size()])
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
	
	combat_active = true
	_log_info("WorldManager", "Triggering combat with group of %d enemies" % p_enemy_group.size())
	combat_triggered.emit(p_enemy_group)

func handle_combat_end(victory: bool):
	combat_active = false
	_log_info("WorldManager", "Combat ended. Victory: " + str(victory))

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

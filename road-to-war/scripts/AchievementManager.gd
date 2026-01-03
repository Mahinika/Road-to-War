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

# AchievementManager.gd - Tracks and validates player achievements

signal achievement_unlocked(achievement_id, name, description)

# Map<achievement_id, { unlocked: bool, progress: float, unlocked_at: int }>
var achievements: Dictionary = {}

func _ready():
	_log_info("AchievementManager", "Initialized")
	call_deferred("_initialize_achievements")
	
	# Periodic check
	var timer = Timer.new()
	timer.wait_time = 5.0
	timer.autostart = true
	timer.timeout.connect(check_all_achievements)
	add_child(timer)

func _initialize_achievements():
	var data = DataManager.get_data("achievements")
	if not data or not data.has("achievements"): return
	
	for ach in data["achievements"]:
		if not achievements.has(ach["id"]):
			achievements[ach["id"]] = {
				"unlocked": false,
				"progress": 0.0,
				"unlocked_at": 0
			}

func check_all_achievements():
	var data = DataManager.get_data("achievements")
	if not data or not data.has("achievements"): return
	
	for ach in data["achievements"]:
		var id = ach["id"]
		if achievements[id]["unlocked"]: continue
		
		# Simple logic: map achievement IDs to stats
		var is_met = false
		match id:
			"defeat_10_enemies": is_met = StatisticsManager.get_stat("combat", "enemiesDefeated") >= 10
			"defeat_100_enemies": is_met = StatisticsManager.get_stat("combat", "enemiesDefeated") >= 100
			"reach_level_10": is_met = StatisticsManager.get_stat("progression", "currentLevel") >= 10
			# Add more as needed
			
		if is_met:
			unlock_achievement(id)

func unlock_achievement(id: String):
	if not achievements.has(id):
		_log_warn("AchievementManager", "Cannot unlock unknown achievement: " + id)
		return
	if achievements[id]["unlocked"]: return
	
	achievements[id]["unlocked"] = true
	achievements[id]["unlocked_at"] = Time.get_ticks_msec()
	
	var data = DataManager.get_data("achievements")
	var ach_data = {}
	for ach in data["achievements"]:
		if ach["id"] == id:
			ach_data = ach
			break
			
	achievement_unlocked.emit(id, ach_data.get("name", id), ach_data.get("description", ""))
	_log_info("AchievementManager", "Unlocked: " + ach_data.get("name", id))
	
	# Apply rewards
	var reward = ach_data.get("reward")
	if reward:
		if reward.has("gold"):
			var gold_amt = reward["gold"]
			if has_node("/root/ShopManager"):
				ShopManager.add_gold(gold_amt)
			if has_node("/root/StatisticsManager"):
				StatisticsManager.increment_stat("collection", "goldEarned", gold_amt)
				
		if reward.has("experience"):
			var exp_amt = reward["experience"]
			for hero in PartyManager.heroes:
				hero.gain_experience(exp_amt)

func is_unlocked(id: String) -> bool:
	return achievements.has(id) and achievements[id]["unlocked"]

func get_all_achievements() -> Dictionary:
	"""Return achievements combined with data for UI"""
	var data = DataManager.get_data("achievements")
	var result = {}
	
	if not data or not data.has("achievements"):
		return achievements
		
	for ach in data["achievements"]:
		var id = ach["id"]
		var entry = achievements.get(id, {
			"unlocked": false,
			"progress": 0.0,
			"unlocked_at": 0
		}).duplicate()
		entry["name"] = ach.get("name", id)
		entry["description"] = ach.get("description", "")
		result[id] = entry
		
	return result

func get_save_data() -> Dictionary:
	return achievements

func load_save_data(p_ach: Dictionary):
	for id in p_ach:
		if achievements.has(id):
			achievements[id] = p_ach[id]

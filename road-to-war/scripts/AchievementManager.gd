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
	var dm = get_node_or_null("/root/DataManager")
	var data = dm.get_data("achievements") if dm else null
	if not data or not data.has("achievements"): return
	
	for ach in data["achievements"]:
		if not achievements.has(ach["id"]):
			achievements[ach["id"]] = {
				"unlocked": false,
				"progress": 0.0,
				"unlocked_at": 0
			}

func check_all_achievements():
	var dm = get_node_or_null("/root/DataManager")
	var data = dm.get_data("achievements") if dm else null
	if not data or not data.has("achievements"): return
	
	var stm = get_node_or_null("/root/StatisticsManager")
	if not stm: return
	
	var pm = get_node_or_null("/root/PartyManager")
	var wm = get_node_or_null("/root/WorldManager")
	var em = get_node_or_null("/root/EquipmentManager")
	var qm = get_node_or_null("/root/QuestManager")
	
	for ach in data["achievements"]:
		var id = ach["id"]
		var requirement = ach.get("requirement", 0)
		
		if not achievements.has(id):
			achievements[id] = {
				"unlocked": false,
				"progress": 0.0,
				"unlocked_at": 0
			}
		
		if achievements[id]["unlocked"]: continue
		
		# Check achievement requirements
		var is_met = false
		var current_value = 0.0
		
		match id:
			# Combat achievements
			"defeat_10_enemies", "defeat_100_enemies", "defeat_1000_enemies":
				current_value = float(stm.get_stat("combat", "enemiesDefeated")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"win_10_combats", "win_100_combats":
				current_value = float(stm.get_stat("combat", "combatsWon")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"critical_hit_10", "critical_hit_100":
				current_value = float(stm.get_stat("combat", "criticalHits")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			
			# Progression achievements
			"reach_level_5", "reach_level_10", "reach_level_20", "reach_level_50", "reach_level_100":
				if pm and pm.heroes.size() > 0:
					var max_level = 0
					for hero in pm.heroes:
						max_level = max(max_level, hero.level)
					current_value = float(max_level)
					is_met = current_value >= requirement
			"visit_10_segments", "visit_100_segments":
				current_value = float(stm.get_stat("world", "segmentsVisited")) if stm.has_method("get_stat") else 0.0
				if wm:
					current_value = float(wm.current_segment + 1)  # Segments are 0-indexed
				is_met = current_value >= requirement
			
			# Collection achievements
			"collect_10_items", "collect_50_items", "collect_100_items":
				current_value = float(stm.get_stat("collection", "itemsCollected")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"earn_1000_gold", "earn_10000_gold":
				current_value = float(stm.get_stat("collection", "goldEarned")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"equip_10_items", "equip_50_items":
				current_value = float(stm.get_stat("collection", "itemsEquipped")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"find_legendary_item":
				# Check if any hero has legendary equipment
				var legendary_count = 0
				if pm and em:
					for hero in pm.heroes:
						var equipment = em.get_hero_equipment(hero.id)
						for slot in equipment:
							var item_id = equipment.get(slot)
							if item_id:
								var item_data = em.get_item_data(item_id)
								if item_data and item_data.get("rarity", "").to_lower() == "legendary":
									legendary_count += 1
				current_value = float(legendary_count)
				is_met = current_value >= requirement
			
			# World achievements
			"visit_10_shops":
				current_value = float(stm.get_stat("world", "shopsVisited")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"find_10_treasures":
				current_value = float(stm.get_stat("world", "treasuresFound")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"complete_10_quests":
				current_value = float(stm.get_stat("world", "questsCompleted")) if stm.has_method("get_stat") else 0.0
				if qm:
					var completed_count = 0
					for quest_id in qm.player_quests:
						if qm.player_quests[quest_id].get("completed", false):
							completed_count += 1
					current_value = float(completed_count)
				is_met = current_value >= requirement
			
			# Endgame achievements
			"reach_mile_100":
				current_value = float(wm.current_mile) if wm else 0.0
				is_met = current_value >= requirement
			"defeat_war_lord":
				# Check if mile 100 boss was defeated
				current_value = float(stm.get_stat("endgame", "warLordDefeated")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"defeat_milestone_bosses":
				current_value = float(stm.get_stat("endgame", "milestoneBossesDefeated")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
			"fully_epic_gear":
				# Check if all 5 heroes have epic+ gear in all slots
				var epic_slots = 0
				if pm and em:
					for hero in pm.heroes:
						var equipment = em.get_hero_equipment(hero.id)
						for slot in equipment:
							var item_id = equipment.get(slot)
							if item_id:
								var item_data = em.get_item_data(item_id)
								var rarity = item_data.get("rarity", "").to_lower() if item_data else ""
								if rarity == "epic" or rarity == "legendary":
									epic_slots += 1
					current_value = float(epic_slots)
					is_met = epic_slots >= requirement * 5  # 5 heroes
			"maxed_talent_tree":
				# Check if any hero has 51 talent points spent
				var max_talents = 0
				if pm:
					for hero in pm.heroes:
						var talents_spent = 51 - hero.available_talent_points  # Assume 51 max
						max_talents = max(max_talents, talents_spent)
				current_value = float(max_talents)
				is_met = current_value >= requirement
			"complete_3_sets":
				# Check if player has completed 3 item sets
				current_value = float(stm.get_stat("collection", "setsCompleted")) if stm.has_method("get_stat") else 0.0
				is_met = current_value >= requirement
		
		# Update progress tracking
		if not achievements[id].has("progress") or achievements[id]["progress"] < current_value:
			achievements[id]["progress"] = current_value
		
		# Unlock if requirement met
		if is_met:
			unlock_achievement(id)

func unlock_achievement(id: String):
	if not achievements.has(id):
		_log_warn("AchievementManager", "Cannot unlock unknown achievement: " + id)
		return
	if achievements[id]["unlocked"]: return
	
	achievements[id]["unlocked"] = true
	achievements[id]["unlocked_at"] = Time.get_ticks_msec()
	
	var dm = get_node_or_null("/root/DataManager")
	var data = dm.get_data("achievements") if dm else null
	if not data: return
	
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
			var shm = get_node_or_null("/root/ShopManager")
			if shm:
				shm.add_gold(gold_amt)
			var stm = get_node_or_null("/root/StatisticsManager")
			if stm:
				stm.increment_stat("collection", "goldEarned", gold_amt)
				
		if reward.has("experience"):
			var exp_amt = reward["experience"]
			var pm = get_node_or_null("/root/PartyManager")
			if pm:
				for hero in pm.heroes:
					if hero.has_method("gain_experience"):
						hero.gain_experience(exp_amt)

func is_unlocked(id: String) -> bool:
	return achievements.has(id) and achievements[id]["unlocked"]

func get_unlocked_count() -> int:
	var count = 0
	for id in achievements:
		if achievements[id]["unlocked"]:
			count += 1
	return count

func get_all_achievements() -> Dictionary:
	"""Return achievements combined with data for UI"""
	var dm = get_node_or_null("/root/DataManager")
	var data = dm.get_data("achievements") if dm else null
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

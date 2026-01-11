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

# PrestigeManager.gd - Handles prestige/reset system for meta-progression
# Manages prestige levels, prestige points, and permanent upgrades

signal prestige_performed(new_level, points_gained)
signal upgrade_purchased(upgrade_id, cost)

var prestige_level: int = 0
var prestige_points: int = 0
var prestige_points_earned: int = 0
var ethereal_essence: int = 0  # Prestige currency from brutal mode

var purchased_upgrades: Array = []

var prestige_config: Dictionary = {}

func _ready():
	_log_info("PrestigeManager", "Initialized")
	load_prestige_config()

func load_prestige_config():
	var dm = get_node_or_null("/root/DataManager")
	if dm:
		prestige_config = dm.get_data("prestige-config") if dm.has_method("get_data") else {}
	
	if prestige_config.is_empty():
		prestige_config = get_default_config()
	else:
		# Normalize upgrades to Dictionary format (config may have array)
		_normalize_upgrades_format()

func _normalize_upgrades_format():
	# Convert upgrades array to Dictionary format if needed
	var upgrades = prestige_config.get("upgrades", [])
	if upgrades is Array:
		var upgrades_dict = {}
		for upgrade in upgrades:
			var upgrade_id = upgrade.get("id", "")
			if upgrade_id != "":
				upgrades_dict[upgrade_id] = upgrade
		prestige_config["upgrades"] = upgrades_dict
		_log_info("PrestigeManager", "Normalized upgrades format: Array → Dictionary (%d upgrades)" % upgrades_dict.size())

func get_default_config() -> Dictionary:
	return {
		"basePrestigePoints": 1,
		"prestigeMultiplier": 1.5,
		"upgrades": {
			"goldMultiplier": {
				"id": "goldMultiplier",
				"name": "Gold Multiplier",
				"description": "Increase gold earned by 10%",
				"cost": 1,
				"type": "gold_multiplier",
				"value": 0.1
			},
			"experienceMultiplier": {
				"id": "experienceMultiplier",
				"name": "Experience Multiplier",
				"description": "Increase experience earned by 10%",
				"cost": 1,
				"type": "xp_multiplier",
				"value": 0.1
			}
		}
	}

func can_prestige() -> bool:
	# Simple check - in a real game this would check requirements
	return true

func perform_prestige() -> bool:
	if not can_prestige():
		return false
	
	# Convert Ethereal Essence to prestige points before calculating
	var essence_points = convert_essence_to_prestige_points()
	
	var points_gained = calculate_prestige_points()
	prestige_level += 1
	prestige_points += points_gained
	prestige_points_earned += points_gained
	
	prestige_performed.emit(prestige_level, points_gained)
	
	_log_info("PrestigeManager", "Prestige performed! Level: %d, Points gained: %d (including %d from essence)" % [prestige_level, points_gained, essence_points])
	
	# Reset game state (will be fully implemented in Week 3)
	_reset_game_state()
	
	return true

func _reset_game_state():
	_log_info("PrestigeManager", "Resetting game state for prestige")
	
	# Restore banked items before resetting equipment
	var bank = get_node_or_null("/root/PrestigeBank")
	if bank:
		bank.restore_banked_items()
	
	# Reset WorldManager (mile → 0)
	_reset_world_manager()
	
	# Reset PartyManager (heroes → Level 1)
	_reset_party_manager()
	
	# Reset EquipmentManager (except banked items)
	_reset_equipment_manager()
	
	# Reset TalentManager (except prestige points)
	_reset_talent_manager()
	
	# Reset BrutalModeManager (exit brutal mode)
	_reset_brutal_mode()
	
	_log_info("PrestigeManager", "Game state reset complete")

func _reset_world_manager():
	var wm = get_node_or_null("/root/WorldManager")
	if wm:
		wm.initialize_world()
		_log_info("PrestigeManager", "WorldManager reset: Mile → 0")

func _reset_party_manager():
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return
	
	for hero in pm.heroes:
		# Reset hero to Level 1
		hero.level = 1
		hero.experience = 0
		
		# Reset stats to base
		if hero.has_method("reset_to_base_stats"):
			hero.reset_to_base_stats()
		else:
			# Fallback: Reset current_stats to base_stats
			hero.current_stats = hero.base_stats.duplicate()
		
		# Reset talent points (except prestige talent points)
		var prestige_talent_points = hero.get("prestige_talent_points")
		if prestige_talent_points == null: prestige_talent_points = 0
		hero.available_talent_points = prestige_talent_points
		
		_log_info("PrestigeManager", "Hero %s reset to Level 1" % hero.name)
	
	_log_info("PrestigeManager", "PartyManager reset: All heroes → Level 1")

func _reset_equipment_manager():
	var em = get_node_or_null("/root/EquipmentManager")
	var pm = get_node_or_null("/root/PartyManager")
	if not em or not pm:
		return
	
	# Get banked items to preserve
	var bank = get_node_or_null("/root/PrestigeBank")
	var banked_item_ids = []
	if bank:
		var banked_items = bank.get_banked_items()
		for item_id in banked_items:
			banked_item_ids.append(item_id)
	
	# Remove all equipment except banked items
	for hero in pm.heroes:
		var equipment = em.get_hero_equipment(hero.id)
		for slot in equipment:
			var item_id = equipment[slot]
			if item_id and not banked_item_ids.has(item_id):
				em.unequip_item(hero.id, slot)
	
	_log_info("PrestigeManager", "EquipmentManager reset: All equipment removed (except %d banked items)" % banked_item_ids.size())

func _reset_talent_manager():
	var tm = get_node_or_null("/root/TalentManager")
	var pm = get_node_or_null("/root/PartyManager")
	if not tm or not pm:
		return
	
	# Reset all talents except prestige talent points
	for hero in pm.heroes:
		var prestige_talent_points = hero.get("prestige_talent_points")
		if prestige_talent_points == null: prestige_talent_points = 0
		
		# Reset talent tree (keep structure, reset points spent)
		if tm.has_method("reset_hero_talents"):
			tm.reset_hero_talents(hero.id)
		
		# Restore prestige talent points
		hero.available_talent_points = prestige_talent_points
		
		_log_info("PrestigeManager", "Hero %s talents reset (kept %d prestige points)" % [hero.name, prestige_talent_points])
	
	_log_info("PrestigeManager", "TalentManager reset: All talents reset (prestige points preserved)")

func _reset_brutal_mode():
	var bm = get_node_or_null("/root/BrutalModeManager")
	if bm:
		bm.select_brutal_difficulty(0)  # Exit brutal mode
		_log_info("PrestigeManager", "BrutalModeManager reset: Exited brutal mode")

func calculate_prestige_points() -> int:
	# Base points for reaching Mile 100
	var base = 20
	
	# Level bonus: 1 point per 10 total hero levels
	var level_bonus = 0
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			level_bonus += int(hero.level / 10.0)
	
	# Equipment bonus: Points for high-quality items
	var equipment_bonus = 0
	var epic_count = _count_epic_items()
	var legendary_count = _count_legendary_items()
	equipment_bonus = (epic_count * 2) + (legendary_count * 5)
	
	# Achievement bonus: 1 point per achievement
	var achievement_bonus = 0
	var am = get_node_or_null("/root/AchievementManager")
	if am and am.has_method("get_unlocked_count"):
		achievement_bonus = am.get_unlocked_count()
	
	# Ethereal Essence bonus (from extended content)
	var essence_bonus = int(ethereal_essence / 10.0)
	
	# Mile bonus: Additional points for mile progression
	var mile_bonus = 0
	var wm = get_node_or_null("/root/WorldManager")
	if wm and wm.has_method("get_current_mile"):
		var current_mile = wm.get_current_mile()
		mile_bonus = int(current_mile / 10.0)  # 1 point per 10 miles
	
	# Prestige Level Multiplier (for subsequent prestiges)
	var prestige_multiplier = 1.0 + (prestige_level * 0.5)
	
	var total = base + level_bonus + equipment_bonus + achievement_bonus + essence_bonus + mile_bonus
	var final_points = int(total * prestige_multiplier)
	
	_log_info("PrestigeManager", "Calculating prestige points: Base=%d, Levels=%d, Equipment=%d, Achievements=%d, Essence=%d, Miles=%d, Multiplier=%.2f, Total=%d" % [base, level_bonus, equipment_bonus, achievement_bonus, essence_bonus, mile_bonus, prestige_multiplier, final_points])
	
	return final_points

func get_pending_prestige_points_breakdown() -> Dictionary:
	# Returns breakdown of pending prestige points (for UI display)
	var base = 20
	var level_bonus = 0
	var equipment_bonus = 0
	var achievement_bonus = 0
	var essence_bonus = int(ethereal_essence / 10.0)
	var mile_bonus = 0
	
	var pm = get_node_or_null("/root/PartyManager")
	if pm:
		for hero in pm.heroes:
			level_bonus += int(hero.level / 10.0)
	
	var epic_count = _count_epic_items()
	var legendary_count = _count_legendary_items()
	equipment_bonus = (epic_count * 2) + (legendary_count * 5)
	
	var am = get_node_or_null("/root/AchievementManager")
	if am and am.has_method("get_unlocked_count"):
		achievement_bonus = am.get_unlocked_count()
	
	var wm = get_node_or_null("/root/WorldManager")
	if wm and wm.has_method("get_current_mile"):
		var current_mile = wm.get_current_mile()
		mile_bonus = int(current_mile / 10.0)
	
	var prestige_multiplier = 1.0 + (prestige_level * 0.5)
	var subtotal = base + level_bonus + equipment_bonus + achievement_bonus + essence_bonus + mile_bonus
	var total = int(subtotal * prestige_multiplier)
	
	return {
		"base": base,
		"level_bonus": level_bonus,
		"equipment_bonus": equipment_bonus,
		"achievement_bonus": achievement_bonus,
		"essence_bonus": essence_bonus,
		"mile_bonus": mile_bonus,
		"subtotal": subtotal,
		"multiplier": prestige_multiplier,
		"total": total
	}

func _count_epic_items() -> int:
	var count = 0
	var em = get_node_or_null("/root/EquipmentManager")
	if not em:
		return 0
	
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return 0
	
	for hero in pm.heroes:
		var equipment = em.get_hero_equipment(hero.id)
		for slot in equipment:
			var item_id = equipment[slot]
			if item_id:
				var item_data = em.get_item_data(item_id)
				if item_data and item_data.get("quality", "").to_lower() == "epic":
					count += 1
	
	return count

func _count_legendary_items() -> int:
	var count = 0
	var em = get_node_or_null("/root/EquipmentManager")
	if not em:
		return 0
	
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return 0
	
	for hero in pm.heroes:
		var equipment = em.get_hero_equipment(hero.id)
		for slot in equipment:
			var item_id = equipment[slot]
			if item_id:
				var item_data = em.get_item_data(item_id)
				if item_data and item_data.get("quality", "").to_lower() == "legendary":
					count += 1
	
	return count

func add_ethereal_essence(amount: int):
	ethereal_essence += amount
	_log_info("PrestigeManager", "Added %d Ethereal Essence (Total: %d)" % [amount, ethereal_essence])

func get_ethereal_essence() -> int:
	return ethereal_essence

func convert_essence_to_prestige_points() -> int:
	# Convert essence to prestige points (10 essence = 1 point)
	var points = int(ethereal_essence / 10.0)
	ethereal_essence = 0
	_log_info("PrestigeManager", "Converted Ethereal Essence to %d prestige points" % points)
	return points

func purchase_upgrade(upgrade_id: String) -> bool:
	if purchased_upgrades.has(upgrade_id):
		return false
	
	var upgrade_data = prestige_config.get("upgrades", {}).get(upgrade_id, {})
	var cost = upgrade_data.get("cost", 0)
	
	if prestige_points < cost:
		return false
	
	prestige_points -= cost
	purchased_upgrades.append(upgrade_id)
	
	upgrade_purchased.emit(upgrade_id, cost)
	
	_log_info("PrestigeManager", "Purchased upgrade: %s" % upgrade_id)
	return true

func get_upgrade_data(upgrade_id: String) -> Dictionary:
	# Returns full upgrade data from config
	return prestige_config.get("upgrades", {}).get(upgrade_id, {})

func get_upgrade_effect(upgrade_id: String) -> Dictionary:
	# Returns upgrade effect (for backward compatibility)
	var upgrade_data = get_upgrade_data(upgrade_id)
	if upgrade_data.has("effect"):
		return upgrade_data.get("effect", {})
	# If no effect field, construct from type/value fields
	var effect_type = upgrade_data.get("type", "")
	var effect_value = upgrade_data.get("value", 0)
	if effect_type != "":
		return {"type": effect_type, "value": effect_value}
	return {}

func get_prestige_level() -> int:
	return prestige_level

func get_prestige_points() -> int:
	return prestige_points

func has_upgrade(upgrade_id: String) -> bool:
	return purchased_upgrades.has(upgrade_id)

func get_available_upgrades() -> Array:
	var available = []
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in upgrades:
		if not purchased_upgrades.has(upgrade_id):
			var upgrade_data = upgrades[upgrade_id].duplicate()
			upgrade_data["id"] = upgrade_id  # Ensure ID is present
			available.append(upgrade_data)
	
	return available

func get_all_upgrades() -> Array:
	# Returns all upgrades (purchased and available) with their status
	var all_upgrades = []
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in upgrades:
		var upgrade_data = upgrades[upgrade_id].duplicate()
		upgrade_data["id"] = upgrade_id
		upgrade_data["purchased"] = purchased_upgrades.has(upgrade_id)
		upgrade_data["can_afford"] = prestige_points >= upgrade_data.get("cost", 0)
		all_upgrades.append(upgrade_data)
	
	return all_upgrades

func get_save_data() -> Dictionary:
	return {
		"prestige_level": prestige_level,
		"prestige_points": prestige_points,
		"prestige_points_earned": prestige_points_earned,
		"ethereal_essence": ethereal_essence,
		"purchased_upgrades": purchased_upgrades
	}

func load_save_data(save_data: Dictionary):
	prestige_level = save_data.get("prestige_level", 0)
	prestige_points = save_data.get("prestige_points", 0)
	prestige_points_earned = save_data.get("prestige_points_earned", 0)
	ethereal_essence = save_data.get("ethereal_essence", 0)
	purchased_upgrades = save_data.get("purchased_upgrades", [])

# Prestige Bonus Calculation Methods
# These methods calculate bonuses from purchased upgrades that can be used by other systems

func get_stat_multiplier(stat_name: String) -> float:
	"""Returns multiplier bonus for a specific stat from purchased upgrades"""
	var multiplier = 1.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_stat = upgrade_data.get("stat", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "stat_multiplier" and upgrade_stat == stat_name:
			multiplier += upgrade_value  # Stack additively
	
	return multiplier

func get_gold_multiplier() -> float:
	"""Returns gold gain multiplier from purchased upgrades"""
	var multiplier = 1.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "gold_multiplier":
			multiplier += upgrade_value  # Stack additively
	
	return multiplier

func get_xp_multiplier() -> float:
	"""Returns experience gain multiplier from purchased upgrades"""
	var multiplier = 1.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "xp_multiplier":
			multiplier += upgrade_value  # Stack additively
	
	return multiplier

func get_loot_multiplier() -> float:
	"""Returns loot drop chance multiplier from purchased upgrades"""
	var multiplier = 1.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "loot_multiplier":
			multiplier += upgrade_value  # Stack additively
	
	return multiplier

func get_item_quality_bonus() -> float:
	"""Returns item quality chance bonus (scales with prestige level)"""
	var bonus = 0.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "item_quality_bonus":
			# Scale with prestige level
			bonus += upgrade_value * prestige_level
	
	return bonus

func get_item_level_boost() -> int:
	"""Returns item level boost (scales with prestige level)"""
	var boost = 0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0)
		
		if upgrade_type == "item_level_boost":
			# Scale with prestige level
			boost += int(upgrade_value * prestige_level)
	
	return boost

func get_gear_effectiveness_multiplier() -> float:
	"""Returns gear stat effectiveness multiplier from purchased upgrades"""
	var multiplier = 1.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "gear_effectiveness":
			multiplier += upgrade_value  # Stack additively
	
	return multiplier

func get_combat_bonus() -> float:
	"""Returns damage/healing bonus from purchased upgrades"""
	var bonus = 0.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "combat_bonus":
			bonus += upgrade_value  # Stack additively
	
	return bonus

func get_prestige_talent_points() -> int:
	"""Returns additional talent points from prestige upgrades"""
	var points = 0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0)
		
		if upgrade_type == "prestige_talent_points":
			# Scale with prestige level
			points += int(upgrade_value * prestige_level)
	
	return points

func get_talent_cost_reduction() -> float:
	"""Returns talent point cost reduction multiplier (0.9 = 10% reduction)"""
	var reduction = 0.0
	var upgrades = prestige_config.get("upgrades", {})
	
	for upgrade_id in purchased_upgrades:
		var upgrade_data = upgrades.get(upgrade_id, {})
		if upgrade_data.is_empty():
			continue
		
		var upgrade_type = upgrade_data.get("type", "")
		var upgrade_value = upgrade_data.get("value", 0.0)
		
		if upgrade_type == "talent_cost_reduction":
			reduction += upgrade_value  # Stack additively
	
	return max(0.1, 1.0 - reduction)  # Minimum 10% cost, maximum 90% reduction

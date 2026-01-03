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

var purchased_upgrades: Array = []

var prestige_config: Dictionary = {}

func _ready():
	_log_info("PrestigeManager", "Initialized")
	load_prestige_config()

func load_prestige_config():
	prestige_config = DataManager.get_data("prestige-config")
	if prestige_config.is_empty():
		prestige_config = get_default_config()

func get_default_config() -> Dictionary:
	return {
		"basePrestigePoints": 1,
		"prestigeMultiplier": 1.5,
		"upgrades": {
			"goldMultiplier": {
				"name": "Gold Multiplier",
				"description": "Increase gold earned by 10%",
				"cost": 1,
				"effect": {"type": "multiplier", "stat": "gold", "value": 1.1}
			},
			"experienceMultiplier": {
				"name": "Experience Multiplier",
				"description": "Increase experience earned by 10%",
				"cost": 1,
				"effect": {"type": "multiplier", "stat": "experience", "value": 1.1}
			}
		}
	}

func can_prestige() -> bool:
	# Simple check - in a real game this would check requirements
	return true

func perform_prestige() -> bool:
	if not can_prestige():
		return false
	
	var points_gained = calculate_prestige_points()
	prestige_level += 1
	prestige_points += points_gained
	prestige_points_earned += points_gained
	
	prestige_performed.emit(prestige_level, points_gained)
	
	_log_info("PrestigeManager", "Prestige performed! Level: %d, Points gained: %d" % [prestige_level, points_gained])
	
	# Reset game state (would integrate with other managers)
	return true

func calculate_prestige_points() -> int:
	return prestige_config.get("basePrestigePoints", 1) + (prestige_level * prestige_config.get("prestigeMultiplier", 1.5))

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

func get_upgrade_effect(upgrade_id: String) -> Dictionary:
	var upgrade_data = prestige_config.get("upgrades", {}).get(upgrade_id, {})
	return upgrade_data.get("effect", {})

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
			available.append(upgrades[upgrade_id])
	
	return available

func get_save_data() -> Dictionary:
	return {
		"prestige_level": prestige_level,
		"prestige_points": prestige_points,
		"prestige_points_earned": prestige_points_earned,
		"purchased_upgrades": purchased_upgrades
	}

func load_save_data(save_data: Dictionary):
	prestige_level = save_data.get("prestige_level", 0)
	prestige_points = save_data.get("prestige_points", 0)
	prestige_points_earned = save_data.get("prestige_points_earned", 0)
	purchased_upgrades = save_data.get("purchased_upgrades", [])


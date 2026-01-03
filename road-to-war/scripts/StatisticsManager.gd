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

# StatisticsManager.gd - Tracks comprehensive player statistics

signal stat_updated(category, stat_name, value)

var stats = {
	"combat": {
		"totalDamageDealt": 0,
		"totalDamageTaken": 0,
		"enemiesDefeated": 0,
		"combatsWon": 0,
		"combatsLost": 0,
		"criticalHits": 0,
		"totalHits": 0,
		"misses": 0
	},
	"progression": {
		"levelsGained": 0,
		"currentLevel": 1,
		"totalExperience": 0,
		"segmentsVisited": 0,
		"distanceTraveled": 0,
		"maxLevelReached": 1
	},
	"collection": {
		"itemsFound": 0,
		"itemsEquipped": 0,
		"goldEarned": 0,
		"goldSpent": 0,
		"legendaryItemsFound": 0,
		"uniqueItemsFound": [] # Array of IDs
	},
	"time": {
		"totalPlayTime": 0,
		"sessionStartTime": 0,
		"longestSession": 0,
		"sessionsCount": 0
	},
	"world": {
		"encountersTriggered": 0,
		"shopsVisited": 0,
		"treasuresFound": 0,
		"questsCompleted": 0
	}
}

func _ready():
	_log_info("StatisticsManager", "Initialized")
	stats["time"]["sessionStartTime"] = Time.get_ticks_msec()
	
	# Connect to global signals if they exist
	if CombatManager.has_signal("damage_dealt"):
		CombatManager.damage_dealt.connect(_on_damage_dealt)
	if CombatManager.has_signal("combat_end"):
		CombatManager.combat_end.connect(_on_combat_end)

func _on_damage_dealt(source, _target, amount, _is_crit):
	if source != "enemy":
		increment_stat("combat", "totalDamageDealt", amount)
		increment_stat("combat", "totalHits", 1)
	else:
		increment_stat("combat", "totalDamageTaken", amount)

func _on_combat_end(victory: bool):
	if victory:
		increment_stat("combat", "combatsWon", 1)
		increment_stat("combat", "enemiesDefeated", 1)
	else:
		increment_stat("combat", "combatsLost", 1)

func increment_stat(category: String, stat_name: String, amount: float = 1.0):
	if stats.has(category) and stats[category].has(stat_name):
		stats[category][stat_name] += amount
		stat_updated.emit(category, stat_name, stats[category][stat_name])

func get_stat(category: String, stat_name: String):
	return stats.get(category, {}).get(stat_name, 0)

func get_all_stats() -> Dictionary:
	"""Return a flat dictionary of all important stats for UI"""
	return {
		"enemies_defeated": get_stat("combat", "enemiesDefeated"),
		"combats_won": get_stat("combat", "combatsWon"),
		"combats_lost": get_stat("combat", "combatsLost"),
		"total_damage_dealt": get_stat("combat", "totalDamageDealt"),
		"total_damage_taken": get_stat("combat", "totalDamageTaken"),
		"gold_earned": get_stat("collection", "goldEarned"),
		"gold_spent": get_stat("collection", "goldSpent"),
		"items_found": get_stat("collection", "itemsFound"),
		"items_collected": get_stat("collection", "itemsFound"), # Alias
		"play_time": stats["time"]["totalPlayTime"] / 1000, # In seconds
		"sessions": stats["time"]["sessionsCount"]
	}

func get_save_data() -> Dictionary:
	# Update play time
	var now = Time.get_ticks_msec()
	var session_time = now - stats["time"]["sessionStartTime"]
	stats["time"]["totalPlayTime"] += session_time
	stats["time"]["sessionStartTime"] = now
	return stats

func load_save_data(p_stats: Dictionary):
	for cat in p_stats:
		if stats.has(cat):
			for sname in p_stats[cat]:
				if stats[cat].has(sname):
					stats[cat][sname] = p_stats[cat][sname]
	stats["time"]["sessionStartTime"] = Time.get_ticks_msec()


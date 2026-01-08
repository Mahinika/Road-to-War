extends Node

# CombatSimulator.gd - Headless combat simulation for balance testing
# Migrated from src/utils/combat-simulator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var party_manager: Node = null
var combat_manager: Node = null
var damage_calculator: Node = null

func _ready():
	party_manager = get_node_or_null("/root/PartyManager")
	combat_manager = get_node_or_null("/root/CombatManager")
	damage_calculator = get_node_or_null("/root/DamageCalculator")
	_log_info("CombatSimulator", "Initialized")

# Run combat simulation
func simulate_combat(enemy_data: Dictionary, iterations: int = 100) -> Dictionary:
	var results = {
		"wins": 0,
		"losses": 0,
		"total_damage": 0.0,
		"total_time": 0.0,
		"dps": 0.0,
		"ttk": 0.0
	}
	
	for i in range(iterations):
		var combat_result = _run_single_combat(enemy_data)
		if combat_result["victory"]:
			results["wins"] += 1
		else:
			results["losses"] += 1
		
		results["total_damage"] += combat_result.get("damage", 0.0)
		results["total_time"] += combat_result.get("time", 0.0)
	
	# Calculate averages
	if iterations > 0:
		results["dps"] = results["total_damage"] / results["total_time"] if results["total_time"] > 0 else 0.0
		results["ttk"] = results["total_time"] / iterations
		results["win_rate"] = float(results["wins"]) / float(iterations)
	
	return results

# Run a single combat simulation
func _run_single_combat(enemy_data: Dictionary) -> Dictionary:
	# Simplified combat simulation (would need full combat logic)
	var start_time = Time.get_ticks_msec()
	var total_damage = 0.0
	var victory = false
	
	# Simulate combat rounds
	var enemy_health = enemy_data.get("stats", {}).get("health", 100)
	var party_dps = _calculate_party_dps()
	
	# Calculate time to kill
	var time_to_kill = enemy_health / party_dps if party_dps > 0 else 999.0
	
	# Assume victory if time to kill is reasonable
	victory = time_to_kill < 60.0  # 60 seconds max
	
	var end_time = Time.get_ticks_msec()
	
	return {
		"victory": victory,
		"damage": enemy_health,
		"time": (end_time - start_time) / 1000.0
	}

# Calculate party DPS
func _calculate_party_dps() -> float:
	if not party_manager:
		return 0.0
	
	var total_dps = 0.0
	if party_manager.has("heroes"):
		for hero in party_manager.heroes:
			var attack = hero.get("current_stats", {}).get("attack", 10)
			total_dps += attack * 1.0  # Simplified DPS calculation
	
	return total_dps


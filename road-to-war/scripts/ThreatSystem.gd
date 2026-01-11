extends Node

# ThreatSystem.gd - Handles threat/aggro management
# Migrated from src/managers/combat/threat-system.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

var party_manager: Node = null
var threat_table: Dictionary = {}  # Dictionary<enemyId, Dictionary<heroId, threat>>
var threat_decay_rate: float = 0.95  # 5% decay per second
var threat_decay_interval: int = 1000  # Decay every second
var last_decay_time: int = 0

func _ready():
	party_manager = get_node_or_null("/root/PartyManager")
	_log_info("ThreatSystem", "Initialized")

# Initialize threat table for an enemy
func initialize_enemy_threat(enemy: Dictionary):
	if enemy.is_empty() or not enemy.has("id"):
		_log_info("ThreatSystem", "Cannot initialize threat: invalid enemy")
		return
	
	var enemy_id = enemy["id"]
	
	if not threat_table.has(enemy_id):
		threat_table[enemy_id] = {}
	
	# Initialize threat for all heroes
	if party_manager:
		var heroes = party_manager.heroes if party_manager.has("heroes") else []
		for hero in heroes:
			if hero.has("id"):
				threat_table[enemy_id][hero["id"]] = 0
	
	_log_debug("ThreatSystem", "Initialized threat table for enemy %s" % enemy_id)

# Get threat level for a hero against an enemy
func get_threat(enemy_id: String, hero_id: String) -> int:
	if not threat_table.has(enemy_id):
		threat_table[enemy_id] = {}
	return threat_table[enemy_id].get(hero_id, 0)

# Add threat for a hero
func add_threat(enemy_id: String, hero_id: String, amount: int):
	if not threat_table.has(enemy_id):
		threat_table[enemy_id] = {}
	
	var current_threat = threat_table[enemy_id].get(hero_id, 0)
	var new_threat = max(0, current_threat + amount)
	threat_table[enemy_id][hero_id] = new_threat
	
	_log_debug("ThreatSystem", "Added %d threat for hero %s vs enemy %s (total: %d)" % [amount, hero_id, enemy_id, new_threat])

# Set threat for a hero (absolute value)
func set_threat(enemy_id: String, hero_id: String, amount: int):
	if not threat_table.has(enemy_id):
		threat_table[enemy_id] = {}
	
	threat_table[enemy_id][hero_id] = max(0, amount)

# Get hero with highest threat for an enemy
func get_highest_threat_hero(enemy_id: String) -> Dictionary:
	if not threat_table.has(enemy_id) or not party_manager:
		return {}
	
	var threat_map = threat_table[enemy_id]
	var max_threat = -1
	var highest_threat_hero_id = ""
	
	for hero_id in threat_map.keys():
		var threat = threat_map[hero_id]
		if threat > max_threat:
			max_threat = threat
			highest_threat_hero_id = hero_id
	
	if highest_threat_hero_id != "" and party_manager.has_method("get_hero_by_id"):
		var hero = party_manager.get_hero_by_id(highest_threat_hero_id)
		return hero if hero else {}
	
	return {}

# Get all threat levels for an enemy
func get_all_threats(enemy_id: String) -> Dictionary:
	if not threat_table.has(enemy_id):
		return {}
	return threat_table[enemy_id].duplicate()

# Apply threat decay (called periodically)
func update_threat_decay(current_time: int):
	if current_time - last_decay_time < threat_decay_interval:
		return
	
	last_decay_time = current_time
	
	for enemy_id in threat_table.keys():
		var threat_map = threat_table[enemy_id]
		for hero_id in threat_map.keys():
			var threat = threat_map[hero_id]
			var decayed_threat = int(threat * threat_decay_rate)
			threat_map[hero_id] = decayed_threat

# Clear threat table for an enemy
func clear_enemy_threat(enemy_id: String):
	threat_table.erase(enemy_id)

# Reduce threat for a hero
func reduce_threat(enemy_id: String, hero_id: String, amount: int = 0, is_percentage: bool = false):
	if not threat_table.has(enemy_id):
		return
	
	var current_threat = get_threat(enemy_id, hero_id)
	if current_threat <= 0:
		return
	
	var new_threat: int
	if is_percentage:
		new_threat = int(current_threat * (1.0 - amount))
	else:
		new_threat = max(0, current_threat - amount)
	
	set_threat(enemy_id, hero_id, new_threat)

# Clear all threat tables
func clear_all_threats():
	threat_table.clear()

# Taunt: Forces enemy to target the taunting hero by setting threat to highest + buffer
func taunt(enemy_id: String, hero_id: String, threat_bonus: int = 1000, aoe: bool = false, aoe_radius: float = 0.0):
	"""
	Taunt an enemy (or multiple enemies if AoE) to force them to target the taunting hero.
	
	Args:
		enemy_id: The enemy to taunt (or first enemy if AoE)
		hero_id: The hero performing the taunt
		threat_bonus: Amount of threat to add (default 1000, should be higher than current max)
		aoe: If true, taunt all enemies within aoe_radius
		aoe_radius: Radius for AoE taunt (in pixels)
	"""
	if aoe and aoe_radius > 0.0:
		# AoE taunt: Find all enemies within radius
		var world = get_node_or_null("/root/World")
		if not world:
			_log_debug("ThreatSystem", "Cannot perform AoE taunt: World not found")
			return
		
		var hero_node = world._find_unit_node(hero_id)
		if not hero_node:
			_log_debug("ThreatSystem", "Cannot perform AoE taunt: Hero node not found")
			return
		
		# Get all enemies from current combat
		var cm = get_node_or_null("/root/CombatManager")
		if not cm or not cm.has("current_combat"):
			_log_debug("ThreatSystem", "Cannot perform AoE taunt: Not in combat")
			return
		
		var enemies = cm.current_combat.get("enemies", [])
		for enemy in enemies:
			if enemy.get("current_health", 0) <= 0:
				continue
			
			var enemy_instance_id = enemy.get("instance_id", enemy.get("id", ""))
			var enemy_node = world._find_unit_node(enemy_instance_id)
			if not enemy_node:
				continue
			
			var distance = hero_node.global_position.distance_to(enemy_node.global_position)
			if distance <= aoe_radius:
				_apply_taunt(enemy_instance_id, hero_id, threat_bonus)
	else:
		# Single-target taunt
		_apply_taunt(enemy_id, hero_id, threat_bonus)

func _apply_taunt(enemy_id: String, hero_id: String, threat_bonus: int):
	"""
	Internal helper to apply taunt threat to a single enemy.
	Sets the hero's threat to highest threat + threat_bonus.
	"""
	if not threat_table.has(enemy_id):
		threat_table[enemy_id] = {}
	
	# Find current highest threat
	var max_threat = 0
	for other_hero_id in threat_table[enemy_id].keys():
		var threat = threat_table[enemy_id][other_hero_id]
		if threat > max_threat:
			max_threat = threat
	
	# Set taunting hero's threat to highest + bonus
	var new_threat = max_threat + threat_bonus
	set_threat(enemy_id, hero_id, new_threat)
	
	_log_info("ThreatSystem", "Taunt applied: %s taunted %s (threat set to %d)" % [hero_id, enemy_id, new_threat])

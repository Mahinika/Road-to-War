extends Node

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

# MovementManager.gd - Handles individual unit formation and movement (Role-Based)

var hero_positions: Dictionary = {} # hero_id -> Vector2
var enemy_positions: Dictionary = {} # instance_id -> Vector2

var party_center: Vector2 = Vector2(400, 600)
var enemy_center: Vector2 = Vector2(1400, 600)

var movement_speed: float = 200.0

# Formation offsets relative to group center
const OFFSETS = {
	"tank": [Vector2(50, 0)], # Front center
	"melee": [Vector2(20, -60), Vector2(20, 60)], # Flanking the tank
	"ranged": [Vector2(-60, -40), Vector2(-60, 40)], # Behind melee
	"healer": [Vector2(-120, 0)] # Far back
}

func _ready():
	_log_info("MovementManager", "Initialized with Role-Based formations")

func update_party_formation():
	var heroes = PartyManager.heroes
	var role_counts = {"tank": 0, "melee": 0, "ranged": 0, "healer": 0}
	
	for hero in heroes:
		var role = hero.role
		# Map class to melee/ranged if role is just 'dps' or empty
		if role == "dps" or role == "":
			role = _get_dps_type(hero.class_id)
			
		if not role_counts.has(role):
			role = "melee" # Fallback
			
		var role_list = OFFSETS.get(role, OFFSETS["melee"])
		var idx = role_counts[role] % role_list.size()
		var offset = role_list[idx]
		
		# If we have multiple of the same role beyond the predefined offsets, 
		# add a slight additional offset
		if role_counts[role] >= role_list.size():
			offset += Vector2(-20 * (role_counts[role] / role_list.size()), 0)
			
		hero_positions[hero.id] = party_center + offset
		role_counts[role] += 1

func update_enemy_formation(enemies: Array):
	var role_counts = {"tank": 0, "melee": 0, "ranged": 0, "healer": 0}
	
	for enemy in enemies:
		var role = enemy.get("role", "melee") # Enemies default to melee
		var instance_id = enemy.get("instance_id", enemy.get("id"))
		
		var role_list = OFFSETS.get(role, OFFSETS["melee"])
		var idx = role_counts[role] % role_list.size()
		var offset = role_list[idx]
		
		# Enemies face left, so we flip X offsets
		var flipped_offset = Vector2(-offset.x, offset.y)
		
		if role_counts[role] >= role_list.size():
			flipped_offset += Vector2(20 * (role_counts[role] / role_list.size()), 0)
			
		enemy_positions[instance_id] = enemy_center + flipped_offset
		role_counts[role] += 1

func get_target_position(unit_id: String, is_hero: bool = true) -> Vector2:
	if is_hero:
		return hero_positions.get(unit_id, party_center)
	else:
		return enemy_positions.get(unit_id, enemy_center)

func _get_dps_type(class_id: String) -> String:
	match class_id:
		"rogue", "warrior", "paladin": return "melee"
		"mage", "warlock", "hunter": return "ranged"
	return "ranged"

func move_unit_to_formation(unit_node: Node2D, unit_id: String, is_hero: bool, delta: float):
	var target_pos = get_target_position(unit_id, is_hero)
	
	# We only care about X movement for formation during travel; 
	# Y is handled by the RoadGenerator in World.gd _process
	var current_x = unit_node.position.x
	var dx = target_pos.x - current_x
	
	if abs(dx) > 2.0:
		unit_node.position.x += sign(dx) * movement_speed * delta

# Helper for melee "Charge" tweening (used by CombatActions)
func get_charge_position(attacker_pos: Vector2, target_pos: Vector2) -> Vector2:
	var dir = (target_pos - attacker_pos).normalized()
	return target_pos - (dir * 60.0) # Stop 60px away from target

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

# PartyManager.gd - Manages the 5-hero party system

signal hero_added(hero)
signal hero_removed(hero_id)

var heroes: Array = []
var max_party_size: int = 5
var required_roles = {
	"tank": 1,
	"healer": 1,
	"dps": 3
}

func _ready():
	_log_info("PartyManager", "Initialized")

func add_hero(hero) -> bool:
	if not hero or not "id" in hero or hero.id == "":
		_log_error("PartyManager", "Invalid hero object")
		return false

	if heroes.size() >= max_party_size:
		_log_warn("PartyManager", "Party is full")
		return false

	if get_hero_by_id(hero.id):
		_log_warn("PartyManager", "Hero %s already in party" % hero.id)
		return false

	heroes.append(hero)
	
	# Initialize sub-systems for this hero
	var tm = get_node_or_null("/root/TalentManager")
	if tm: tm.initialize_hero_talents(hero.id, hero.talent_tree)
	
	var eq = get_node_or_null("/root/EquipmentManager")
	if eq: eq.calculate_stats(hero.id)
	
	var ability_m = get_node_or_null("/root/AbilityManager")
	if ability_m: ability_m.initialize_hero_cooldowns(hero.id)
	
	hero_added.emit(hero)
	_log_info("PartyManager", "Added hero %s to party" % hero.id)
	return true

func remove_hero(hero_id: String) -> bool:
	for i in range(heroes.size()):
		if heroes[i].id == hero_id:
			heroes.remove_at(i)
			hero_removed.emit(hero_id)
			_log_info("PartyManager", "Removed hero %s from party" % hero_id)
			return true
	
	_log_warn("PartyManager", "Hero %s not found in party" % hero_id)
	return false

func get_hero_by_id(hero_id: String):
	for hero in heroes:
		if hero.id == hero_id:
			return hero
	return null

func get_hero_by_index(index: int):
	if index < 0 or index >= heroes.size():
		return null
	return heroes[index]

func get_heroes() -> Array:
	return heroes

func get_tank():
	for hero in heroes:
		if "role" in hero and hero.role == "tank":
			return hero
	return null

func get_healer():
	for hero in heroes:
		if "role" in hero and hero.role == "healer":
			return hero
	return null

func get_dps() -> Array:
	var dps_list: Array = []
	for hero in heroes:
		if "role" in hero and hero.role == "dps":
			dps_list.append(hero)
	return dps_list

func validate_party_composition() -> bool:
	var role_counts = {"tank": 0, "healer": 0, "dps": 0}
	for hero in heroes:
		if "role" in hero and role_counts.has(hero.role):
			role_counts[hero.role] += 1
	
	return role_counts.tank == required_roles.tank and \
		   role_counts.healer == required_roles.healer and \
		   role_counts.dps == required_roles.dps

func get_party_level(method: String = "average") -> int:
	if heroes.is_empty(): return 1
	
	if method == "highest":
		var max_lv = 0
		for h in heroes:
			max_lv = max(max_lv, h.level)
		return max_lv
		
	var total_level = 0
	for h in heroes:
		total_level += h.level
	return int(round(float(total_level) / float(heroes.size())))

func get_save_data() -> Dictionary:
	var heroes_data = []
	for hero in heroes:
		heroes_data.append({
			"id": hero.id,
			"name": hero.name,
			"class_id": hero.class_id,
			"spec_id": hero.spec_id,
			"bloodline_id": hero.bloodline_id if "bloodline_id" in hero else "",
			"role": hero.role,
			"level": hero.level,
			"experience": hero.experience,
			"stats": hero.stats,
			"base_stats": hero.base_stats,
			"current_stats": hero.current_stats,
			"talent_tree": hero.talent_tree,
			"spent_talent_points": hero.spent_talent_points,
			"available_talent_points": hero.available_talent_points,
			"equipment_slots": hero.equipment_slots,
			"abilities": hero.abilities
		})
	return {"heroes": heroes_data}

func load_save_data(save_data: Dictionary) -> bool:
	return load_data(save_data)

func load_data(save_data: Dictionary) -> bool:
	if not save_data.has("heroes") or not save_data["heroes"] is Array:
		_log_warn("PartyManager", "Invalid party save data")
		return false
		
	heroes.clear()
	for h_data in save_data["heroes"]:
		# Use ClassDB to instantiate or just create the script
		var hero = load("res://scripts/Hero.gd").new()
		hero.id = h_data.get("id", "")
		hero.name = h_data.get("name", "")
		hero.class_id = h_data.get("class_id", h_data.get("class", ""))
		hero.spec_id = h_data.get("spec_id", h_data.get("specialization", ""))
		hero.bloodline_id = h_data.get("bloodline_id", "")
		hero.role = h_data.get("role", "")
		hero.level = h_data.get("level", 1)
		hero.experience = h_data.get("experience", 0)
		hero.stats = h_data.get("stats", {})
		hero.base_stats = h_data.get("base_stats", {})
		hero.current_stats = h_data.get("current_stats", {})
		hero.talent_tree = h_data.get("talent_tree", {})
		hero.spent_talent_points = h_data.get("spent_talent_points", 0)
		hero.available_talent_points = h_data.get("available_talent_points", 0)
		hero.equipment_slots = h_data.get("equipment_slots", {})
		hero.abilities = h_data.get("abilities", [])
		heroes.append(hero)
		
		# Ensure Resource Manager initializes this hero
		if has_node("/root/ResourceManager"):
			ResourceManager.initialize_hero_resources(hero.id)
		
	_log_info("PartyManager", "Loaded party with %d heroes" % heroes.size())
	return true

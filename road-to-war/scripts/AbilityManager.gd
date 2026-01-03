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

# AbilityManager.gd - Handles hero abilities, cooldowns, and selection

signal ability_cooldown_updated(hero_id, ability_name, cooldown, max_cooldown)

# Map<hero_id, Map<ability_name, current_cooldown>>
var cooldowns: Dictionary = {}
# Map<hero_id, Array<ability_name>> usage history
var ability_history: Dictionary = {}

func _ready():
	_log_info("AbilityManager", "Initialized")

func initialize_hero_cooldowns(hero_id: String):
	if not cooldowns.has(hero_id):
		cooldowns[hero_id] = {}
	if not ability_history.has(hero_id):
		ability_history[hero_id] = []

func update_cooldowns():
	for hero_id in cooldowns:
		var hero_cooldowns = cooldowns[hero_id]
		for ability_name in hero_cooldowns.keys():
			if hero_cooldowns[ability_name] > 0:
				hero_cooldowns[ability_name] -= 1
				var ability_def = get_ability_definition(hero_id, ability_name)
				ability_cooldown_updated.emit(hero_id, ability_name, hero_cooldowns[ability_name], ability_def.get("cooldown", 0))

func is_on_cooldown(hero_id: String, ability_name: String) -> bool:
	if not cooldowns.has(hero_id): return false
	return cooldowns[hero_id].get(ability_name, 0) > 0

func set_cooldown(hero_id: String, ability_name: String):
	var ability_def = get_ability_definition(hero_id, ability_name)
	if not ability_def or ability_def.get("cooldown", 0) <= 0: return
	
	initialize_hero_cooldowns(hero_id)
	cooldowns[hero_id][ability_name] = ability_def["cooldown"]
	
	# Update history
	var history = ability_history[hero_id]
	history.append(ability_name)
	if history.size() > 10:
		history.remove_at(0)
		
	ability_cooldown_updated.emit(hero_id, ability_name, ability_def["cooldown"], ability_def["cooldown"])

func get_ability_definition(hero_id: String, ability_name: String) -> Dictionary:
	var abilities_data = DataManager.get_data("abilities")
	if not abilities_data: return {}
	
	# Check general
	if abilities_data.get("general", {}).has(ability_name):
		return abilities_data["general"][ability_name]
		
	# Check class
	var hero = PartyManager.get_hero_by_id(hero_id)
	if hero and abilities_data.has(hero.class_id) and abilities_data[hero.class_id].has(ability_name):
		return abilities_data[hero.class_id][ability_name]
		
	return {}

func select_ability(hero, combat_state: Dictionary) -> String:
	var role = hero.role
	var available = get_available_abilities(hero)
	
	if available.is_empty():
		return "auto_attack"
		
	# Tactical selection with Resource check
	var rm = get_node_or_null("/root/ResourceManager")
	
	if role == "tank":
		if available.has("shield_slam"): 
			if _can_afford(hero.id, "shield_slam", rm): return "shield_slam"
		if available.has("holy_shield"): 
			if _can_afford(hero.id, "holy_shield", rm): return "holy_shield"
	elif role == "healer":
		# Check if anyone needs healing
		var needs_heal = false
		for h_state in combat_state.get("party_state", []):
			if h_state["current_health"] < h_state["max_health"] * 0.7:
				needs_heal = true
				break
		if needs_heal and available.has("holy_light"):
			if _can_afford(hero.id, "holy_light", rm): return "holy_light"
	elif role == "dps":
		if available.has("fireball"): 
			if _can_afford(hero.id, "fireball", rm): return "fireball"
		if available.has("sinister_strike"):
			if _can_afford(hero.id, "sinister_strike", rm): return "sinister_strike"
		
	return available[0] if not available.is_empty() else "auto_attack"

func _can_afford(hero_id: String, ability_name: String, rm) -> bool:
	if not rm: return true # Fallback if no resource manager
	var def = get_ability_definition(hero_id, ability_name)
	var cost = def.get("cost", 0)
	var type = def.get("resourceType", "mana") # Fixed key name from resource_type to resourceType
	return rm.get_resource(hero_id, type) >= cost

func get_available_abilities(hero) -> Array:
	var available = []
	var class_data = DataManager.get_data("classes")
	if not class_data or not class_data.has(hero.class_id):
		return ["auto_attack"]
		
	var core_abilities = class_data[hero.class_id].get("coreAbilities", [])
	
	for ability_name in core_abilities:
		if not is_on_cooldown(hero.id, ability_name):
			available.append(ability_name)
			
	return available

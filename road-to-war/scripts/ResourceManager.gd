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

# ResourceManager.gd - Handles mana, energy, and consumable resources
# Manages regeneration, consumption, and strategic resource allocation

signal resource_updated(hero_id, resource_type, current, max_value)
signal consumable_used(hero_id, item_id, effects)

var hero_resources: Dictionary = {} # hero_id -> { mana: int, max_mana: int, energy: int, max_energy: int }
var consumables: Dictionary = {} # item_id -> { count: int, effects: Dictionary }

var current_strategy: String = "passive"

func _ready():
	_log_info("ResourceManager", "Initialized")

func initialize_hero_resources(hero_id: String):
	var hero = PartyManager.get_hero_by_id(hero_id)
	var max_mana = 100
	var max_energy = 100
	
	if hero:
		var stats = hero.current_stats
		if stats.has("intellect"):
			max_mana = 100 + (stats["intellect"] * 15)
	
	hero_resources[hero_id] = {
		"mana": max_mana,
		"max_mana": max_mana,
		"energy": max_energy,
		"max_energy": max_energy
	}

func get_resource_type(hero_id: String) -> String:
	var hero = PartyManager.get_hero_by_id(hero_id)
	if not hero: return "mana"
	
	match hero.class_id:
		"warrior": return "rage"
		"rogue": return "energy"
		_: return "mana"

func update_resources(delta: float):
	for hero_id in hero_resources:
		regenerate_resources(hero_id, delta)

func regenerate_resources(hero_id: String, delta: float):
	if not hero_resources.has(hero_id):
		return
	
	var resources = hero_resources[hero_id]
	var multiplier = get_regeneration_multiplier(current_strategy)
	
	# Mana regeneration
	if resources.mana < resources.max_mana:
		var mana_regen = 8 * multiplier * delta # Increased base mana per second
		resources.mana = min(resources.max_mana, resources.mana + mana_regen)
		resource_updated.emit(hero_id, "mana", resources.mana, resources.max_mana)
	
	# Energy regeneration
	if resources.energy < resources.max_energy:
		var energy_regen = 10 * multiplier * delta # Increased base energy per second
		resources.energy = min(resources.max_energy, resources.energy + energy_regen)
		resource_updated.emit(hero_id, "energy", resources.energy, resources.max_energy)

func consume_resource(hero_id: String, resource_type: String, amount: float) -> bool:
	if not hero_resources.has(hero_id):
		return false
	
	var resources = hero_resources[hero_id]
	if not resources.has(resource_type):
		return false
	
	if resources[resource_type] >= amount:
		resources[resource_type] -= amount
		resource_updated.emit(hero_id, resource_type, resources[resource_type], resources["max_" + resource_type])
		return true
	
	return false

func get_resource(hero_id: String, resource_type: String) -> float:
	if hero_resources.has(hero_id):
		return hero_resources[hero_id].get(resource_type, 0.0)
	return 0.0

func add_consumable(item_id: String, count: int = 1, effects: Dictionary = {}):
	if consumables.has(item_id):
		consumables[item_id].count += count
	else:
		consumables[item_id] = { "count": count, "effects": effects }

func use_consumable(hero_id: String, item_id: String) -> bool:
	if not consumables.has(item_id) or consumables[item_id].count <= 0:
		return false
	
	var effects = consumables[item_id].effects
	consumables[item_id].count -= 1
	
	apply_consumable_effects(hero_id, effects)
	consumable_used.emit(hero_id, item_id, effects)
	
	_log_info("ResourceManager", "Used consumable %s for hero %s" % [item_id, hero_id])
	return true

func apply_consumable_effects(hero_id: String, effects: Dictionary):
	for effect_type in effects:
		match effect_type:
			"restore_mana":
				var amount = effects[effect_type]
				if hero_resources.has(hero_id):
					var resources = hero_resources[hero_id]
					resources.mana = min(resources.max_mana, resources.mana + amount)
					resource_updated.emit(hero_id, "mana", resources.mana, resources.max_mana)
			
			"restore_health":
				var hero = PartyManager.get_hero_by_id(hero_id)
				if hero:
					var amount = effects[effect_type]
					hero.current_stats.health = min(hero.current_stats.maxHealth, hero.current_stats.health + amount)

func get_consumable_count(item_id: String) -> int:
	if consumables.has(item_id):
		return consumables[item_id].count
	return 0

func get_regeneration_multiplier(strategy: String) -> float:
	match strategy:
		"passive":
			return 1.0
		"active":
			return 1.5
		"burst":
			return 2.0
		_:
			return 1.0

func set_regeneration_strategy(strategy: String):
	current_strategy = strategy
	_log_info("ResourceManager", "Regeneration strategy set to: %s" % strategy)

func get_save_data() -> Dictionary:
	return {
		"hero_resources": hero_resources,
		"consumables": consumables,
		"current_strategy": current_strategy
	}

func load_save_data(save_data: Dictionary):
	hero_resources = save_data.get("hero_resources", {})
	consumables = save_data.get("consumables", {})
	current_strategy = save_data.get("current_strategy", "passive")


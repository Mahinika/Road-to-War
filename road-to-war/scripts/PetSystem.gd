extends Node

# PetSystem.gd - Manages pets for Hunters and Warlocks
# Hunters: Beast pets (Wolf, Cat, Bear, etc.)
# Warlocks: Demon pets (Imp, Voidwalker, Succubus, Felhunter, Felguard)

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

# Map<hero_id, {pet_id: String, pet_type: String, pet_stats: Dictionary, pet_abilities: Array}>
var active_pets: Dictionary = {}

# Pet definitions
var pet_definitions: Dictionary = {
	# Hunter Pets
	"wolf": {
		"name": "Wolf",
		"class": "hunter",
		"role": "dps",
		"base_stats": {
			"health": 500,
			"attack": 50,
			"defense": 20,
			"attack_speed": 2.0
		},
		"abilities": ["bite", "howl"],
		"icon": "🐺",
		"color": "808080"
	},
	"cat": {
		"name": "Cat",
		"class": "hunter",
		"role": "dps",
		"base_stats": {
			"health": 400,
			"attack": 60,
			"defense": 15,
			"attack_speed": 1.5
		},
		"abilities": ["claw", "prowl"],
		"icon": "🐱",
		"color": "ffa500"
	},
	"bear": {
		"name": "Bear",
		"class": "hunter",
		"role": "tank",
		"base_stats": {
			"health": 800,
			"attack": 40,
			"defense": 40,
			"attack_speed": 2.5
		},
		"abilities": ["growl", "maul"],
		"icon": "🐻",
		"color": "8b4513"
	},
	# Warlock Demons
	"imp": {
		"name": "Imp",
		"class": "warlock",
		"role": "dps",
		"base_stats": {
			"health": 300,
			"attack": 30,
			"defense": 10,
			"attack_speed": 2.0,
			"spell_power": 40
		},
		"abilities": ["firebolt", "fire_shield"],
		"icon": "👹",
		"color": "ff6600"
	},
	"voidwalker": {
		"name": "Voidwalker",
		"class": "warlock",
		"role": "tank",
		"base_stats": {
			"health": 1000,
			"attack": 35,
			"defense": 50,
			"attack_speed": 2.5
		},
		"abilities": ["torment", "sacrifice"],
		"icon": "👻",
		"color": "4b0082"
	},
	"succubus": {
		"name": "Succubus",
		"class": "warlock",
		"role": "dps",
		"base_stats": {
			"health": 400,
			"attack": 55,
			"defense": 15,
			"attack_speed": 1.8
		},
		"abilities": ["lash_of_pain", "seduction"],
		"icon": "😈",
		"color": "ff1493"
	},
	"felhunter": {
		"name": "Felhunter",
		"class": "warlock",
		"role": "dps",
		"base_stats": {
			"health": 500,
			"attack": 50,
			"defense": 25,
			"attack_speed": 2.0
		},
		"abilities": ["shadow_bite", "devour_magic"],
		"icon": "🐕",
		"color": "00ff00"
	},
	"felguard": {
		"name": "Felguard",
		"class": "warlock",
		"role": "tank",
		"base_stats": {
			"health": 1200,
			"attack": 60,
			"defense": 60,
			"attack_speed": 2.2
		},
		"abilities": ["cleave", "intercept"],
		"icon": "⚔",
		"color": "ff0000"
	}
}

func _ready():
	_log_info("PetSystem", "Initialized")

# Summon a pet for a hero
func summon_pet(hero_id: String, pet_type: String) -> bool:
	if not pet_definitions.has(pet_type):
		_log_warn("PetSystem", "Unknown pet type: %s" % pet_type)
		return false
	
	var pet_def = pet_definitions[pet_type]
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return false
	
	var hero = pm.get_hero_by_id(hero_id)
	if not hero:
		return false
	
	# Verify class matches
	if hero.class_id != pet_def["class"]:
		_log_warn("PetSystem", "%s cannot summon %s (wrong class)" % [hero_id, pet_def["name"]])
		return false
	
	# Dismiss existing pet if any
	if active_pets.has(hero_id):
		dismiss_pet(hero_id)
	
	# Create pet instance
	var pet_id = "%s_pet_%d" % [hero_id, Time.get_ticks_msec()]
	var pet_stats = pet_def["base_stats"].duplicate()
	
	# Scale pet stats with hero level
	var hero_level = hero.level if "level" in hero else 1
	var level_multiplier = 1.0 + (hero_level - 1) * 0.1  # 10% per level
	for stat in pet_stats.keys():
		if typeof(pet_stats[stat]) == TYPE_FLOAT or typeof(pet_stats[stat]) == TYPE_INT:
			pet_stats[stat] = int(pet_stats[stat] * level_multiplier)
	
	active_pets[hero_id] = {
		"pet_id": pet_id,
		"pet_type": pet_type,
		"pet_stats": pet_stats,
		"pet_abilities": pet_def["abilities"].duplicate(),
		"current_health": pet_stats["health"],
		"max_health": pet_stats["health"],
		"summoned_at": Time.get_ticks_msec() / 1000.0
	}
	
	_log_info("PetSystem", "%s summoned %s" % [hero_id, pet_def["name"]])
	pet_summoned.emit(hero_id, pet_type, pet_id)
	
	return true

# Dismiss a pet
func dismiss_pet(hero_id: String):
	if not active_pets.has(hero_id):
		return
	
	var pet_data = active_pets[hero_id]
	var pet_type = pet_data["pet_type"]
	var pet_name = pet_definitions.get(pet_type, {}).get("name", pet_type)
	
	active_pets.erase(hero_id)
	_log_info("PetSystem", "%s dismissed %s" % [hero_id, pet_name])
	pet_dismissed.emit(hero_id)

# Get pet for a hero
func get_pet(hero_id: String) -> Dictionary:
	return active_pets.get(hero_id, {})

# Check if hero has an active pet
func has_pet(hero_id: String) -> bool:
	return active_pets.has(hero_id)

# Get pet stats
func get_pet_stats(hero_id: String) -> Dictionary:
	var pet = get_pet(hero_id)
	if pet.is_empty():
		return {}
	return pet.get("pet_stats", {})

# Pet takes damage
func pet_take_damage(hero_id: String, damage: float):
	if not active_pets.has(hero_id):
		return
	
	var pet = active_pets[hero_id]
	var current_hp = pet.get("current_health", 0)
	var new_hp = max(0, current_hp - damage)
	pet["current_health"] = new_hp
	
	if new_hp <= 0:
		_log_info("PetSystem", "%s's pet died" % hero_id)
		dismiss_pet(hero_id)
		pet_died.emit(hero_id)
	else:
		pet_damaged.emit(hero_id, new_hp, pet.get("max_health", 1))

# Pet heals
func pet_heal(hero_id: String, amount: float):
	if not active_pets.has(hero_id):
		return
	
	var pet = active_pets[hero_id]
	var current_hp = pet.get("current_health", 0)
	var max_hp = pet.get("max_health", 1)
	var new_hp = min(max_hp, current_hp + amount)
	pet["current_health"] = new_hp
	pet_healed.emit(hero_id, new_hp, max_hp)

# Clear all pets (e.g., when combat ends or party resets)
func clear_all_pets():
	var hero_ids = active_pets.keys()
	active_pets.clear()
	for hero_id in hero_ids:
		pet_dismissed.emit(hero_id)
	_log_info("PetSystem", "Cleared all pets")

signal pet_summoned(hero_id: String, pet_type: String, pet_id: String)
signal pet_dismissed(hero_id: String)
signal pet_died(hero_id: String)
signal pet_damaged(hero_id: String, current_health: float, max_health: float)
signal pet_healed(hero_id: String, current_health: float, max_health: float)

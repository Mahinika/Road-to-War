extends Node

# FormSystem.gd - Manages forms, stances, and stealth states for classes
# Druids: Bear, Cat, Moonkin, Tree of Life
# Warriors: Battle Stance, Defensive Stance, Berserker Stance
# Rogues: Stealth

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

# Map<hero_id, current_form>
var hero_forms: Dictionary = {}

# Form definitions with stat modifiers and ability restrictions
var form_definitions: Dictionary = {
	# Druid Forms
	"bear_form": {
		"name": "Bear Form",
		"class": "druid",
		"stat_modifiers": {
			"armor": 3.0,  # 300% armor bonus
			"health": 1.25,  # 25% health bonus
			"attack": 0.8  # Reduced attack (tank form)
		},
		"allowed_abilities": ["mangle", "lacerate", "maul", "swipe", "frenzied_regeneration", "survival_instincts"],
		"blocks_abilities": ["wrath", "starfire", "moonfire", "rejuvenation", "regrowth"],
		"icon": "🐻",
		"color": "8b4513"
	},
	"cat_form": {
		"name": "Cat Form",
		"class": "druid",
		"stat_modifiers": {
			"attack_speed": 1.3,  # 30% faster attacks
			"movement_speed": 1.3,  # 30% faster movement
			"attack": 1.1  # 10% attack bonus
		},
		"allowed_abilities": ["shred", "rake", "rip", "feral_bite", "mangle", "swipe"],
		"blocks_abilities": ["wrath", "starfire", "moonfire", "rejuvenation", "regrowth"],
		"icon": "🐱",
		"color": "ffa500"
	},
	"moonkin_form": {
		"name": "Moonkin Form",
		"class": "druid",
		"stat_modifiers": {
			"spell_power": 1.15,  # 15% spell power bonus
			"armor": 4.0,  # 400% armor bonus (caster form)
			"movement_speed": 0.7  # 30% slower movement
		},
		"allowed_abilities": ["wrath", "starfire", "moonfire", "starfall", "hurricane"],
		"blocks_abilities": ["mangle", "swipe", "feral_bite", "shred", "rake"],
		"icon": "🦉",
		"color": "9370db"
	},
	"tree_of_life": {
		"name": "Tree of Life",
		"class": "druid",
		"stat_modifiers": {
			"healing": 1.15,  # 15% healing bonus
			"armor": 3.0,  # 300% armor bonus
			"movement_speed": 0.5  # 50% slower movement
		},
		"allowed_abilities": ["rejuvenation", "regrowth", "wild_growth", "tranquility", "lifebloom"],
		"blocks_abilities": ["wrath", "starfire", "mangle", "swipe", "feral_bite"],
		"icon": "🌳",
		"color": "228b22"
	},
	# Warrior Stances
	"battle_stance": {
		"name": "Battle Stance",
		"class": "warrior",
		"stat_modifiers": {
			"threat": 0.8  # 20% threat reduction
		},
		"allowed_abilities": ["charge", "mortal_strike", "overpower", "rend", "whirlwind"],
		"blocks_abilities": [],
		"icon": "⚔",
		"color": "ff6600"
	},
	"defensive_stance": {
		"name": "Defensive Stance",
		"class": "warrior",
		"stat_modifiers": {
			"threat": 1.3,  # 30% threat bonus
			"damage_taken": 0.9  # 10% damage reduction
		},
		"allowed_abilities": ["taunt", "shield_slam", "revenge", "devastate", "shield_block", "shield_wall"],
		"blocks_abilities": ["charge", "mortal_strike"],
		"icon": "🛡",
		"color": "0088ff"
	},
	"berserker_stance": {
		"name": "Berserker Stance",
		"class": "warrior",
		"stat_modifiers": {
			"threat": 0.8,  # 20% threat reduction
			"crit_chance": 0.03  # 3% crit chance bonus
		},
		"allowed_abilities": ["bloodthirst", "whirlwind", "recklessness", "rampage"],
		"blocks_abilities": ["taunt", "shield_slam", "revenge"],
		"icon": "💢",
		"color": "ff0000"
	},
	# Rogue Stealth
	"stealth": {
		"name": "Stealth",
		"class": "rogue",
		"stat_modifiers": {
			"movement_speed": 0.7  # 30% slower movement
		},
		"allowed_abilities": ["ambush", "garrote", "cheap_shot", "sap", "backstab"],
		"blocks_abilities": [],
		"icon": "👤",
		"color": "808080"
	}
}

func _ready():
	_log_info("FormSystem", "Initialized")

# Get current form/stance for a hero
func get_form(hero_id: String) -> String:
	return hero_forms.get(hero_id, "")

# Set form/stance for a hero
func set_form(hero_id: String, form_id: String) -> bool:
	var old_form = hero_forms.get(hero_id, "")
	if form_id == "":
		# Remove form
		if hero_forms.has(hero_id):
			hero_forms.erase(hero_id)
			_log_info("FormSystem", "%s left %s" % [hero_id, form_definitions.get(old_form, {}).get("name", old_form)])
			form_changed.emit(hero_id, "", old_form)
		return true
	
	if not form_definitions.has(form_id):
		_log_warn("FormSystem", "Unknown form ID: %s" % form_id)
		return false
	
	var form_def = form_definitions[form_id]
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return false
	
	var hero = pm.get_hero_by_id(hero_id)
	if not hero:
		return false
	
	# Verify class matches
	if hero.class_id != form_def["class"]:
		_log_warn("FormSystem", "%s cannot use %s (wrong class)" % [hero_id, form_def["name"]])
		return false
	
	old_form = hero_forms.get(hero_id, "")
	hero_forms[hero_id] = form_id
	
	_log_info("FormSystem", "%s entered %s" % [hero_id, form_def["name"]])
	form_changed.emit(hero_id, form_id, old_form)
	
	return true

# Check if hero is in a specific form
func is_in_form(hero_id: String, form_id: String) -> bool:
	return hero_forms.get(hero_id, "") == form_id

# Get stat modifiers for a hero's current form
func get_stat_modifiers(hero_id: String) -> Dictionary:
	var form_id = get_form(hero_id)
	if form_id == "" or not form_definitions.has(form_id):
		return {}
	
	return form_definitions[form_id]["stat_modifiers"].duplicate()

# Check if an ability is allowed in current form
func is_ability_allowed(hero_id: String, ability_name: String) -> bool:
	var form_id = get_form(hero_id)
	if form_id == "":
		return true  # No form restrictions
	
	if not form_definitions.has(form_id):
		return true
	
	var form_def = form_definitions[form_id]
	
	# Check if ability is explicitly blocked
	if ability_name in form_def["blocks_abilities"]:
		return false
	
	# If form has allowed_abilities list, check if ability is in it
	if not form_def["allowed_abilities"].is_empty():
		return ability_name in form_def["allowed_abilities"]
	
	# No restrictions
	return true

# Clear form for a hero (e.g., when combat ends or hero dies)
func clear_form(hero_id: String):
	if hero_forms.has(hero_id):
		var form_id = hero_forms[hero_id]
		hero_forms.erase(hero_id)
		_log_debug("FormSystem", "%s form cleared" % hero_id)
		form_changed.emit(hero_id, "", form_id)

# Clear all forms (e.g., when combat ends)
func clear_all_forms():
	var hero_ids = hero_forms.keys()
	hero_forms.clear()
	for hero_id in hero_ids:
		form_changed.emit(hero_id, "", "")
	_log_info("FormSystem", "Cleared all forms")

signal form_changed(hero_id: String, new_form: String, old_form: String)

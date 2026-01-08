extends Node

# HeroFactory.gd - Centralized hero creation system
# Provides consistent hero instantiation with proper initialization

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

var data_manager: Node = null

func _ready():
	data_manager = get_node_or_null("/root/DataManager")
	_log_info("HeroFactory", "Initialized")

# Create a hero with class, specialization, level, and initial stats
func create_hero(class_id: String, spec_id: String, level: int = 1, hero_id: String = "", hero_name: String = "", role: String = "") -> Hero:
	if not data_manager:
		_log_error("HeroFactory", "DataManager not found")
		return null
	
	var classes_data = data_manager.get_data("classes")
	var specs_data = data_manager.get_data("specializations")
	
	if not classes_data or not classes_data.has(class_id):
		_log_error("HeroFactory", "Invalid class_id: %s" % class_id)
		return null
	
	if not specs_data or not specs_data.has("%s_%s" % [class_id, spec_id]):
		_log_error("HeroFactory", "Invalid spec_id: %s for class: %s" % [spec_id, class_id])
		return null
	
	var class_data = classes_data[class_id]
	var spec_key = "%s_%s" % [class_id, spec_id]
	var spec_data = specs_data[spec_key]
	
	# Generate hero ID if not provided
	if hero_id == "":
		hero_id = "hero_%d" % Time.get_ticks_msec()
	
	# Generate name if not provided
	if name == "":
		name = "%s %s" % [class_data.get("name", class_id.capitalize()), spec_data.get("name", spec_id.capitalize())]
	
	# Determine role if not provided
	if role == "":
		role = spec_data.get("role", "dps")
	
	# Create hero resource
	var hero = Hero.new()
	hero.id = hero_id
	hero.name = hero_name
	hero.class_id = class_id
	hero.spec_id = spec_id
	hero.role = role
	hero.level = level
	hero.experience = 0
	
	# Load bloodline if available
	var bloodlines_data = data_manager.get_data("bloodlines")
	if bloodlines_data and bloodlines_data.size() > 0:
		# Assign random bloodline for now (can be made configurable)
		var bloodline_keys = bloodlines_data.keys()
		if bloodline_keys.size() > 0:
			hero.bloodline_id = bloodline_keys[randi() % bloodline_keys.size()]
	
	# Initialize base stats based on class and specialization
	hero.base_stats = _calculate_base_stats(class_data, spec_data, level)
	hero.current_stats = hero.base_stats.duplicate()
	hero.stats = hero.base_stats.duplicate()
	
	# Initialize talent tree
	hero.talent_tree = {}
	hero.spent_talent_points = 0
	hero.available_talent_points = level - 1  # Start with points based on level
	
	# Initialize abilities from class and spec
	hero.abilities = []
	if class_data.has("coreAbilities"):
		for ability_id in class_data.coreAbilities:
			hero.abilities.append(ability_id)
	if spec_data.has("specAbilities"):
		for ability_id in spec_data.specAbilities:
			if not ability_id in hero.abilities:
				hero.abilities.append(ability_id)
	
	# Initialize equipment slots (all empty)
	hero.equipment_slots = {
		"head": null,
		"neck": null,
		"shoulder": null,
		"cloak": null,
		"chest": null,
		"shirt": null,
		"tabard": null,
		"bracer": null,
		"hands": null,
		"waist": null,
		"legs": null,
		"boots": null,
		"ring1": null,
		"ring2": null,
		"trinket1": null,
		"trinket2": null,
		"weapon": null,
		"offhand": null
	}
	
	_log_info("HeroFactory", "Created hero: %s (%s %s, Level %d)" % [hero.name, class_id, spec_id, level])
	return hero

# Calculate base stats for a hero based on class, spec, and level
func _calculate_base_stats(class_data: Dictionary, spec_data: Dictionary, level: int) -> Dictionary:
	var base_stats = {
		"stamina": 10,
		"strength": 10,
		"intellect": 10,
		"agility": 10,
		"spirit": 10,
		"maxHealth": 100,
		"maxMana": 100,
		"attack": 10,
		"defense": 5,
		"critChance": 0.05,
		"hitChance": 1.0,
		"haste": 1.0
	}
	
	# Apply class-based stat bonuses
	var primary_stat = class_data.get("primaryStat", "strength")
	match primary_stat:
		"strength":
			base_stats.strength += 5
		"intellect":
			base_stats.intellect += 5
		"agility":
			base_stats.agility += 5
	
	# Apply specialization bonuses
	if spec_data.has("passiveEffects"):
		var passives = spec_data.passiveEffects
		if passives.has("healthBonus"):
			base_stats.maxHealth = int(base_stats.maxHealth * (1.0 + passives.healthBonus))
		if passives.has("defenseBonus"):
			base_stats.defense = int(base_stats.defense * (1.0 + passives.defenseBonus))
		if passives.has("strengthBonus"):
			base_stats.strength = int(base_stats.strength * (1.0 + passives.strengthBonus))
		if passives.has("intellectBonus"):
			base_stats.intellect = int(base_stats.intellect * (1.0 + passives.intellectBonus))
	
	# Apply level scaling
	var level_multiplier = 1.0 + (level - 1) * 0.1
	base_stats.stamina = int(base_stats.stamina * level_multiplier)
	base_stats.strength = int(base_stats.strength * level_multiplier)
	base_stats.intellect = int(base_stats.intellect * level_multiplier)
	base_stats.agility = int(base_stats.agility * level_multiplier)
	base_stats.spirit = int(base_stats.spirit * level_multiplier)
	base_stats.maxHealth = int(base_stats.maxHealth * level_multiplier)
	base_stats.maxMana = int(base_stats.maxMana * level_multiplier)
	base_stats.attack = int(base_stats.attack * level_multiplier)
	base_stats.defense = int(base_stats.defense * level_multiplier)
	
	return base_stats

# Create a hero from save data
func create_hero_from_save(save_data: Dictionary) -> Hero:
	if not save_data.has("class_id") or not save_data.has("spec_id"):
		_log_error("HeroFactory", "Invalid save data: missing class_id or spec_id")
		return null
	
	var hero = create_hero(
		save_data.get("class_id", ""),
		save_data.get("spec_id", ""),
		save_data.get("level", 1),
		save_data.get("id", ""),
		save_data.get("name", ""),
		save_data.get("role", "")
	)
	
	if not hero:
		return null
	
	# Restore additional save data
	if save_data.has("experience"):
		hero.experience = save_data.experience
	if save_data.has("talent_tree"):
		hero.talent_tree = save_data.talent_tree
	if save_data.has("spent_talent_points"):
		hero.spent_talent_points = save_data.spent_talent_points
	if save_data.has("available_talent_points"):
		hero.available_talent_points = save_data.available_talent_points
	if save_data.has("equipment_slots"):
		hero.equipment_slots = save_data.equipment_slots
	if save_data.has("bloodline_id"):
		hero.bloodline_id = save_data.bloodline_id
	
	return hero

# Get default equipment for a hero (starter gear)
func get_default_equipment(_hero: Hero) -> Dictionary:
	# Return empty equipment dictionary
	# Equipment can be added via EquipmentManager
	return {}


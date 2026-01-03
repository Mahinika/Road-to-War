extends Resource
class_name Hero

# Hero.gd - Data structure for a single hero

@export var id: String = ""
@export var name: String = ""
@export var class_id: String = ""
@export var spec_id: String = ""
@export var role: String = "" # tank, healer, dps
@export var bloodline_id: String = ""
@export var level: int = 1
@export var experience: int = 0

@export var stats: Dictionary = {}
@export var base_stats: Dictionary = {}
@export var current_stats: Dictionary = {}

@export var talent_tree: Dictionary = {}
@export var spent_talent_points: int = 0
@export var available_talent_points: int = 0

@export var equipment_slots: Dictionary = {
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

@export var abilities: Array = []

signal level_up(new_level)

func initialize_stats(p_base_stats: Dictionary):
	base_stats = p_base_stats.duplicate()
	if current_stats.is_empty():
		current_stats = base_stats.duplicate()
		current_stats["health"] = current_stats.get("maxHealth", 100)
		current_stats["maxHealth"] = current_stats.get("maxHealth", 100)

func gain_experience(amount: int):
	experience += amount
	var exp_needed = get_experience_needed()
	while experience >= exp_needed and level < 100:
		experience -= exp_needed
		level += 1
		available_talent_points += 1
		
		# Milestone talent points
		if level in [20, 40, 60, 80, 100]:
			available_talent_points += 1
			
		level_up.emit(level)
		exp_needed = get_experience_needed()

func get_experience_needed() -> int:
	var world_config = DataManager.get_data("world-config")
	var base = 100
	var mult = 1.15
	
	if world_config and world_config.has("progression"):
		var prog = world_config["progression"]
		base = prog.get("baseExperience", 100)
		mult = prog.get("experienceMultiplier", 1.15)
	
	return int(base * pow(mult, level - 1))

func get_stats_dict() -> Dictionary:
	# Returns a dictionary representation of the hero for the combat system
	# This ensures compatibility with enemy data which are also dictionaries
	var data = current_stats.duplicate()
	data["id"] = id
	data["name"] = name
	data["role"] = role
	data["class_id"] = class_id
	data["level"] = level
	return data


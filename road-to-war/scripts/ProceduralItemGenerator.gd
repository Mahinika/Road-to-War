extends Node

# ProceduralItemGenerator.gd - Generates scaled loot with WoW-style archetypes

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger: logger.info(source, message)
	else: print("[%s] [INFO] %s" % [source, message])

# Constants for scaling
const STAT_SCALING_BASE = 5.0
const STAT_SCALING_PER_ILVL = 1.2
const RARITY_MULTIPLIERS = {
	"common": 1.0,
	"uncommon": 1.25,
	"rare": 1.6,
	"epic": 2.1,
	"legendary": 3.0
}

# Armor archetypes
const ARMOR_TYPES = {
	"cloth": {
		"weights": {"intellect": 1.0, "spirit": 0.8, "stamina": 0.4, "defense": 0.2},
		"description": "Lightweight cloth favored by casters."
	},
	"leather": {
		"weights": {"agility": 1.0, "stamina": 0.7, "defense": 0.5, "intellect": 0.3},
		"description": "Flexible leather for agile fighters."
	},
	"mail": {
		"weights": {"agility": 0.8, "stamina": 0.9, "defense": 0.8, "intellect": 0.4, "strength": 0.4},
		"description": "Reinforced chainmail for hybrid combatants."
	},
	"plate": {
		"weights": {"strength": 1.0, "stamina": 1.2, "defense": 1.5},
		"description": "Heavy plate armor for frontline tanks."
	}
}

# Weapon types
const WEAPON_TYPES = {
	"1h_sword": {"weights": {"strength": 0.8, "agility": 0.4, "attack": 1.0}, "slot": "weapon", "name": "1H Sword"},
	"1h_axe": {"weights": {"strength": 1.0, "attack": 1.1}, "slot": "weapon", "name": "1H Axe"},
	"wand": {"weights": {"intellect": 1.0, "spirit": 0.5, "attack": 0.3}, "slot": "weapon", "name": "Wand"},
	"staff": {"weights": {"intellect": 1.2, "spirit": 1.0, "attack": 0.5}, "slot": "weapon", "name": "Staff"},
	"bow": {"weights": {"agility": 1.2, "attack": 1.0}, "slot": "weapon", "name": "Bow"},
	"crossbow": {"weights": {"agility": 1.5, "attack": 0.8}, "slot": "weapon", "name": "Crossbow"},
	"shield": {"weights": {"stamina": 1.0, "defense": 2.0}, "slot": "offhand", "name": "Shield"},
	"offhand_frill": {"weights": {"intellect": 1.0, "spirit": 0.8}, "slot": "offhand", "name": "Offhand"}
}

func generate_random_item(ilvl: int, rarity: String = "") -> Dictionary:
	"""Generate a completely random piece of loot"""
	if rarity == "":
		rarity = _roll_rarity()
	
	var categories = ["weapon", "armor", "accessory"]
	var category = categories[randi() % categories.size()]
	
	match category:
		"weapon":
			var types = WEAPON_TYPES.keys()
			return generate_weapon(ilvl, types[randi() % types.size()], rarity)
		"armor":
			var types = ARMOR_TYPES.keys()
			var slots = ["head", "shoulder", "chest", "bracer", "hands", "waist", "legs", "boots"]
			return generate_armor(ilvl, slots[randi() % slots.size()], types[randi() % types.size()], rarity)
		"accessory":
			var slots = ["neck", "ring", "trinket", "cloak"]
			return generate_accessory(ilvl, slots[randi() % slots.size()], rarity)
	
	return {}

func generate_armor(ilvl: int, slot: String, armor_type: String, rarity: String) -> Dictionary:
	var archetype = ARMOR_TYPES.get(armor_type, ARMOR_TYPES["cloth"])
	var stats = _calculate_stats(ilvl, rarity, archetype["weights"])
	
	var item_id = "proc_armor_%d" % Time.get_ticks_usec()
	var item_name = "%s %s of the %s" % [rarity.capitalize(), armor_type.capitalize(), slot.capitalize()]
	
	# Icon mapping
	var icon_path = "res://assets/icons/gems/increased_area.png"
	match armor_type:
		"plate": icon_path = "res://assets/icons/gems/physical_damage.png"
		"mail": icon_path = "res://assets/icons/gems/increased_duration.png"
		"leather": icon_path = "res://assets/icons/gems/increased_area.png"
		"cloth": icon_path = "res://assets/icons/gems/reduced_cooldown.png"

	return {
		"id": item_id,
		"name": item_name,
		"type": "armor",
		"slot": slot,
		"armor_type": armor_type,
		"rarity": rarity,
		"level": ilvl,
		"stats": stats,
		"icon": icon_path,
		"description": archetype["description"],
		"sellValue": _calculate_value(ilvl, rarity)
	}

func generate_weapon(ilvl: int, weapon_type: String, rarity: String) -> Dictionary:
	var archetype = WEAPON_TYPES.get(weapon_type, WEAPON_TYPES["1h_sword"])
	var stats = _calculate_stats(ilvl, rarity, archetype["weights"])
	
	var item_id = "proc_weapon_%d" % Time.get_ticks_usec()
	var item_name = "%s %s" % [rarity.capitalize(), archetype["name"]]
	
	# Icon mapping
	var icon_path = "res://assets/icons/gems/physical_damage.png"
	match weapon_type:
		"bow", "crossbow": icon_path = "res://assets/icons/gems/bleed.png"
		"staff", "wand": icon_path = "res://assets/icons/gems/fire_damage.png"
		"shield": icon_path = "res://assets/icons/gems/stun.png"
		"offhand_frill": icon_path = "res://assets/icons/gems/cold_damage.png"

	return {
		"id": item_id,
		"name": item_name,
		"type": "weapon",
		"slot": archetype["slot"],
		"weapon_type": weapon_type,
		"rarity": rarity,
		"level": ilvl,
		"stats": stats,
		"icon": icon_path,
		"description": "A procedurally generated weapon.",
		"sellValue": _calculate_value(ilvl, rarity)
	}

func generate_accessory(ilvl: int, slot: String, rarity: String) -> Dictionary:
	# Accessories pick a random stat focus
	var possible_focus = [
		{"intellect": 1.0, "spirit": 0.5},
		{"agility": 1.0, "stamina": 0.5},
		{"strength": 1.0, "stamina": 0.5},
		{"stamina": 1.0, "defense": 0.5}
	]
	var weights = possible_focus[randi() % possible_focus.size()]
	var stats = _calculate_stats(ilvl, rarity, weights)
	
	var item_id = "proc_acc_%d" % Time.get_ticks_usec()
	var item_name = "%s %s" % [rarity.capitalize(), slot.capitalize()]
	
	return {
		"id": item_id,
		"name": item_name,
		"type": "accessory",
		"slot": slot,
		"rarity": rarity,
		"level": ilvl,
		"stats": stats,
		"description": "A finely crafted accessory.",
		"sellValue": _calculate_value(ilvl, rarity)
	}

func _calculate_stats(ilvl: int, rarity: String, weights: Dictionary) -> Dictionary:
	var stats = {}
	var multiplier = RARITY_MULTIPLIERS.get(rarity, 1.0)
	var budget = (STAT_SCALING_BASE + (ilvl * STAT_SCALING_PER_ILVL)) * multiplier
	
	for stat in weights:
		var val = int(budget * weights[stat])
		if val > 0:
			stats[stat] = val
			
	return stats

func _calculate_value(ilvl: int, rarity: String) -> int:
	var base = 10 + (ilvl * 5)
	var multiplier = RARITY_MULTIPLIERS.get(rarity, 1.0)
	return int(base * multiplier)

func _roll_rarity() -> String:
	var roll = randf()
	if roll < 0.01: return "legendary"
	if roll < 0.05: return "epic"
	if roll < 0.15: return "rare"
	if roll < 0.40: return "uncommon"
	return "common"


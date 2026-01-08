extends Node

# StatCalculator.gd - Calculates final stats with WoW TBC/WotLK rating conversions

var stats_config = {}

func _ready():
	print("StatCalculator: Initialized")
	var dm = get_node_or_null("/root/DataManager")
	if dm:
		stats_config = dm.get_data("stats-config")
	
	if not stats_config or stats_config.is_empty():
		stats_config = get_default_stats_config()

func recalculate_hero_stats(hero):
	if not hero: return
	
	var hero_id = ""
	if hero is Dictionary:
		hero_id = hero.get("id", "")
	else:
		hero_id = hero.id if "id" in hero else ""
		
	if hero_id == "": return
	
	var eq = get_node_or_null("/root/EquipmentManager")
	var equip_stats = {}
	if eq: equip_stats = eq.calculate_equipment_stats(hero_id)
	
	var tm = get_node_or_null("/root/TalentManager")
	var talent_bonuses = {}
	if tm: talent_bonuses = tm.get_talent_bonuses(hero_id)
	
	var final_stats = calculate_final_stats(hero, equip_stats, talent_bonuses)
	
	if hero is Dictionary:
		hero["current_stats"] = final_stats
	else:
		hero.current_stats = final_stats

func calculate_final_stats(hero, equipment_stats: Dictionary = {}, talent_bonuses: Dictionary = {}) -> Dictionary:
	var final_stats = {}
	var base_stats = {}
	
	if hero is Dictionary:
		base_stats = hero.get("base_stats", {})
	else:
		if "base_stats" in hero:
			base_stats = hero.base_stats
		else:
			base_stats = {}
		
	if base_stats is Dictionary and not base_stats.is_empty():
		final_stats = base_stats.duplicate()
	
	if final_stats.is_empty():
		final_stats = {
			"stamina": 10,
			"strength": 10,
			"intellect": 10,
			"agility": 10,
			"spirit": 10,
			"maxHealth": 100,
			"attack": 10,
			"defense": 5
		}

	# Level based growth
	var level = 1
	if hero is Dictionary:
		level = hero.get("level", 1)
	else:
		if "level" in hero:
			level = hero.level
	
	var dm = get_node_or_null("/root/DataManager")
	var world_config = dm.get_data("world-config") if dm else {}
	if world_config and world_config.has("player"):
		var level_gains = world_config["player"].get("levelStatGains", {})
		for stat in level_gains:
			if final_stats.has(stat):
				final_stats[stat] += level_gains[stat] * (level - 1)
			else:
				final_stats[stat] = level_gains[stat] * (level - 1)

	for stat in equipment_stats:
		if final_stats.has(stat):
			final_stats[stat] += equipment_stats[stat]
		else:
			final_stats[stat] = equipment_stats[stat]
			
	for stat in talent_bonuses:
		if final_stats.has(stat):
			final_stats[stat] += talent_bonuses[stat]
		else:
			final_stats[stat] = talent_bonuses[stat]

	var derived = calculate_derived_stats(final_stats, equipment_stats, talent_bonuses)
	for stat in derived:
		if stat == "health":
			final_stats["maxHealth"] = final_stats.get("maxHealth", 100) + derived[stat]
		elif stat == "attackPower":
			final_stats["attack"] = final_stats.get("attack", 0) + derived[stat]
		elif final_stats.has(stat):
			final_stats[stat] += derived[stat]
		else:
			final_stats[stat] = derived[stat]
			
	final_stats["hitChance"] = convert_rating_to_percentage(final_stats.get("hitRating", 0), "hitRating")
	final_stats["critChance"] = convert_rating_to_percentage(final_stats.get("critRating", 0), "critRating")
	
	var hero_current_stats = {}
	if hero is Dictionary:
		hero_current_stats = hero.get("current_stats", {})
	else:
		if "current_stats" in hero:
			hero_current_stats = hero.current_stats
		else:
			hero_current_stats = {}
		
	if hero_current_stats.is_empty():
		final_stats["health"] = final_stats.get("maxHealth", 100)
	else:
		if hero_current_stats.has("health") and hero_current_stats["health"] > 0:
			final_stats["health"] = min(hero_current_stats["health"], final_stats.get("maxHealth", 100))
		else:
			final_stats["health"] = final_stats.get("maxHealth", 100)
		
	return final_stats

func calculate_derived_stats(stats: Dictionary, _equip_stats: Dictionary, _talent_bonuses: Dictionary) -> Dictionary:
	var conversions = stats_config.get("primaryStatConversions", {})
	var derived = {}
	
	var stamina = stats.get("stamina", 0)
	var stamina_conversion = conversions.get("stamina", {})
	derived["health"] = stamina * stamina_conversion.get("health", 10.0)
	
	var strength = stats.get("strength", 0)
	var strength_conversion = conversions.get("strength", {})
	derived["attackPower"] = strength * strength_conversion.get("attackPower", 2.0)
	
	var agility = stats.get("agility", 0)
	derived["critRating"] = agility * 0.5
	derived["hasteRating"] = agility * 0.3
	
	var intellect = stats.get("intellect", 0)
	derived["maxMana"] = intellect * 15.0
	derived["spellPower"] = intellect * 1.0
	
	return derived

func convert_rating_to_percentage(rating: float, stat_type: String) -> float:
	if rating <= 0: return 0.0
	var conversions = stats_config.get("ratingConversions", {})
	var conversion = conversions.get(stat_type, {})
	var per_percent = conversion.get("perPercentage", 15.77)
	return min(rating / per_percent, conversion.get("maxPercentage", 100.0))

func get_default_stats_config() -> Dictionary:
	return {
		"ratingConversions": {
			"hitRating": {"perPercentage": 15.77, "maxPercentage": 17.0},
			"critRating": {"perPercentage": 22.08, "maxPercentage": 100.0}
		},
		"primaryStatConversions": {
			"stamina": {"health": 10.0},
			"strength": {"attackPower": 2.0}
		}
	}

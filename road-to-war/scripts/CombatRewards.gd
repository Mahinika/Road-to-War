extends Node

# CombatRewards.gd - Handles reward calculation and loot generation
# Godot 4.x combat reward calculation system

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var world_config: Dictionary = {}
var procedural_item_generator: Node = null
var prestige_manager: Node = null
var party_manager: Node = null

func _ready():
	var dm = get_node_or_null("/root/DataManager")
	if dm:
		world_config = dm.get_data("world-config") if dm.has_method("get_data") else {}
	procedural_item_generator = get_node_or_null("/root/ProceduralItemGenerator")
	prestige_manager = get_node_or_null("/root/PrestigeManager")
	party_manager = get_node_or_null("/root/PartyManager")
	_log_info("CombatRewards", "Initialized")

# Calculate victory rewards
func calculate_victory_rewards(enemy: Dictionary, current_combat: Dictionary, world_config_override: Dictionary = {}) -> Dictionary:
	if current_combat.is_empty() or enemy.is_empty():
		return {"experience": 0, "gold": 0, "loot": []}
	
	var enemy_data = enemy.get("data", enemy)
	var base_exp = enemy_data.get("rewards", {}).get("experience", 25)
	var base_gold = enemy_data.get("rewards", {}).get("gold", 10)
	var is_boss = enemy.get("is_boss", false) or enemy_data.get("type", "") == "boss"
	
	# Apply multipliers from world config
	var config = world_config_override if not world_config_override.is_empty() else world_config
	var loot_config = config.get("loot", {})
	var exp_multiplier = loot_config.get("experienceMultiplier", 1.0)
	var gold_multiplier = loot_config.get("goldDropMultiplier", 1.0)
	
	# Boss rewards are guaranteed higher
	var boss_multiplier = 1.5 if is_boss else 1.0
	
	# Calculate final rewards
	var experience = int(base_exp * exp_multiplier * boss_multiplier * (1 + randf() * 0.5))
	var gold = int(base_gold * gold_multiplier * boss_multiplier * (1 + randf() * 0.3))
	
	return {
		"experience": experience,
		"gold": gold,
		"loot": generate_loot(enemy_data, is_boss, config)
	}

# Calculate defeat rewards
func calculate_defeat_rewards() -> Dictionary:
	# Reduced rewards for defeat
	return {
		"experience": 5,
		"gold": 2,
		"loot": []
	}

# Generate loot drops
func generate_loot(enemy_data: Dictionary, is_boss: bool = false, world_config_override: Dictionary = {}) -> Array:
	if enemy_data.is_empty():
		return []
	
	var loot = []
	var drops = enemy_data.get("drops", [])
	var config = world_config_override if not world_config_override.is_empty() else world_config
	
	# Get current mile from WorldManager for item scaling
	var wm = get_node_or_null("/root/WorldManager")
	var current_mile = wm.get_current_mile() if wm and wm.has_method("get_current_mile") else 0
	var quality_config = config.get("itemQualityScaling", {})
	
	# Get loot configuration
	var loot_config = config.get("loot", {})
	var item_drop_bonus_per_level = loot_config.get("itemDropBonusPerLevel", 0.02)
	var rare_item_chance_bonus = loot_config.get("rareItemChanceBonus", 0.01)
	
	# Get hero level for scaling
	var hero_level = 1
	if party_manager:
		var tank = party_manager.get_tank() if party_manager.has_method("get_tank") else null
		if tank:
			hero_level = tank.get("level", 1) if tank is Dictionary else 1
	var level_bonus = (hero_level - 1) * item_drop_bonus_per_level
	
	# Enhanced loot bonuses based on enemy type and loot quality
	var quality_bonus = 0.0
	if enemy_data.get("lootQuality", "") == "rare":
		quality_bonus = 0.15
	elif enemy_data.get("lootQuality", "") == "epic":
		quality_bonus = 0.3
	
	# Bosses and elites have enhanced drop rates
	var boss_bonus = 0.2 if is_boss else 0.0
	var elite_bonus = 0.1 if enemy_data.get("isElite", false) else 0.0
	
	# Get items data
	var dm = get_node_or_null("/root/DataManager")
	var items_data = dm.get_data("items") if dm and dm.has_method("get_data") else {}
	
	for drop in drops:
		# Calculate adjusted drop chance
		var adjusted_chance = drop.get("chance", 0.0)
		
		# Apply level bonus
		adjusted_chance += level_bonus
		
		# Apply quality bonus
		adjusted_chance += quality_bonus
		
		# Apply boss and elite bonuses
		adjusted_chance += boss_bonus
		adjusted_chance += elite_bonus
		
		# Apply rare item chance bonus (check if item is rare)
		var is_rare = false
		var base_item_data = null
		for category in ["weapons", "armor", "accessories", "consumables"]:
			if items_data.has(category) and items_data[category].has(drop.get("item", "")):
				base_item_data = items_data[category][drop.get("item", "")]
				var rarity = base_item_data.get("rarity", "")
				is_rare = rarity == "rare" or rarity == "legendary" or rarity == "epic"
				break
		
		if is_rare:
			adjusted_chance += rare_item_chance_bonus
		
		# Cap chance at 1.0
		adjusted_chance = min(1.0, adjusted_chance)
		
		# Bosses and epic loot enemies have at least 50% chance for their drops
		if is_boss or enemy_data.get("lootQuality", "") == "epic":
			adjusted_chance = max(0.5, adjusted_chance)
		
		if randf() < adjusted_chance:
			# Generate item scaled to current mile
			var generated_item = null
			if base_item_data and procedural_item_generator:
				# Determine quality based on mile and enemy type
				var item_quality = base_item_data.get("rarity", "common")
				
				# Bosses and elites have better quality chances
				if is_boss or enemy_data.get("isElite", false):
					var quality_roll = randf()
					if quality_roll < 0.3:
						item_quality = "legendary"
					elif quality_roll < 0.6:
						item_quality = "epic"
					elif quality_roll < 0.85:
						item_quality = "rare"
					else:
						item_quality = "uncommon"
				
				# Generate item scaled to mile (with prestige bonuses)
				if procedural_item_generator.has_method("generate_item_for_mile"):
					generated_item = procedural_item_generator.generate_item_for_mile(
						base_item_data,
						current_mile,
						base_item_data.get("slot", ""),
						item_quality,
						quality_config,
						prestige_manager
					)
			
			# Add to loot with item data
			loot.append({
				"id": drop.get("item", ""),
				"quantity": 1,
				"item_data": generated_item if generated_item else base_item_data,
				"item_level": generated_item.get("itemLevel", base_item_data.get("level", 1)) if generated_item else base_item_data.get("level", 1) if base_item_data else 1,
				"quality": generated_item.get("rarity", base_item_data.get("rarity", "common")) if generated_item else base_item_data.get("rarity", "common") if base_item_data else "common",
				"mile_generated": current_mile
			})
	
	# Bosses guarantee at least one drop if they have drops defined
	if is_boss and drops.size() > 0 and loot.is_empty():
		# Force drop one random item
		var random_drop = drops[randi() % drops.size()]
		var base_item_data = null
		for category in ["weapons", "armor", "accessories"]:
			if items_data.has(category) and items_data[category].has(random_drop.get("item", "")):
				base_item_data = items_data[category][random_drop.get("item", "")]
				break
		
		# Generate guaranteed boss drop with high quality
		var generated_item = null
		if base_item_data and procedural_item_generator:
			var quality_roll = randf()
			var item_quality = "epic"
			if quality_roll < 0.5:
				item_quality = "legendary"
			
			if procedural_item_generator.has_method("generate_item_for_mile"):
				generated_item = procedural_item_generator.generate_item_for_mile(
					base_item_data,
					current_mile,
					base_item_data.get("slot", ""),
					item_quality,
					quality_config,
					prestige_manager
				)
		
		loot.append({
			"id": random_drop.get("item", ""),
			"quantity": 1,
			"item_data": generated_item if generated_item else base_item_data,
			"item_level": generated_item.get("itemLevel", base_item_data.get("level", 1)) if generated_item else base_item_data.get("level", 1) if base_item_data else 1,
			"quality": generated_item.get("rarity", base_item_data.get("rarity", "common")) if generated_item else base_item_data.get("rarity", "common") if base_item_data else "common",
			"mile_generated": current_mile
		})
	
	# Add consumable drops
	add_consumable_drops(loot, enemy_data, is_boss, hero_level)
	
	# Add gem drops
	add_gem_drops(loot, current_mile, is_boss, enemy_data)
	
	return loot

# Add skill gem drops to loot
func add_gem_drops(loot: Array, current_mile: int, is_boss: bool, enemy_data: Dictionary):
	# Bosses have 80% chance, elites 30%, regular mobs 5%
	var gem_chance = 0.8 if is_boss else (0.3 if enemy_data.get("isElite", false) else 0.05)
	if randf() < gem_chance:
		var dm = get_node_or_null("/root/DataManager")
		var skill_gems_data = dm.get_data("skill-gems") if dm and dm.has_method("get_data") else {}
		if skill_gems_data.is_empty():
			return
		
		# Pick random category and gem
		var categories = skill_gems_data.keys()
		if categories.is_empty():
			return
		
		var category = categories[randi() % categories.size()]
		var gems = skill_gems_data[category].keys() if skill_gems_data.has(category) else []
		if gems.is_empty():
			return
		
		var gem_id = gems[randi() % gems.size()]
		var base_gem_data = skill_gems_data[category][gem_id]
		
		if base_gem_data:
			# Generate unique gem instance with scaled value
			var gem_instance = base_gem_data.duplicate(true)
			var tier = min(5, int(current_mile / 20) + 1)
			var tier_multiplier = 1.0 + (tier - 1) * 0.3
			
			# Random value between min/max scaled by tier
			var value_range = base_gem_data.get("maxValue", 10) - base_gem_data.get("minValue", 1)
			gem_instance["value"] = int((base_gem_data.get("minValue", 1) + randf() * value_range) * tier_multiplier)
			gem_instance["instanceId"] = "gem_%d_%d" % [Time.get_ticks_msec(), randi() % 10000]
			gem_instance["itemLevel"] = tier * 10
			gem_instance["isGem"] = true
			
			loot.append({
				"id": gem_id,
				"quantity": 1,
				"item_data": gem_instance,
				"item_level": gem_instance["itemLevel"],
				"quality": gem_instance.get("rarity", "common"),
				"mile_generated": current_mile
			})
			
			_log_info("CombatRewards", "Dropped gem: %s (Value: %d)" % [gem_instance.get("name", "Unknown"), gem_instance["value"]])

# Add consumable drops to loot
func add_consumable_drops(loot: Array, enemy_data: Dictionary, is_boss: bool, hero_level: int):
	# Base consumable drop chances
	var consumable_chance = 0.15  # 15% base chance
	
	# Scale with hero level (slightly)
	consumable_chance += (hero_level - 1) * 0.005
	
	# Bosses have higher consumable drop chance
	if is_boss:
		consumable_chance += 0.3  # +30% for bosses
	
	# Elite enemies have moderate bonus
	if enemy_data.get("isElite", false):
		consumable_chance += 0.15  # +15% for elites
	
	# Cap at 50% chance
	consumable_chance = min(0.5, consumable_chance)
	
	if randf() < consumable_chance:
		# Select random consumable based on rarity
		var consumables = [
			{"id": "minor_mana_potion", "weight": 40, "rarity": "common"},
			{"id": "health_potion", "weight": 30, "rarity": "common"},
			{"id": "energy_drink", "weight": 25, "rarity": "common"},
			{"id": "mana_potion", "weight": 15, "rarity": "uncommon"},
			{"id": "superior_health_potion", "weight": 10, "rarity": "uncommon"},
			{"id": "major_mana_potion", "weight": 5, "rarity": "rare"},
			{"id": "mana_regeneration_potion", "weight": 2, "rarity": "rare"}
		]
		
		# Calculate total weight
		var total_weight = 0
		for consumable in consumables:
			total_weight += consumable["weight"]
		
		# Select weighted random consumable
		var random = randf() * total_weight
		var selected_consumable = consumables[0]
		
		for consumable in consumables:
			random -= consumable["weight"]
			if random <= 0:
				selected_consumable = consumable
				break
		
		# Determine quantity (1-3 for common, 1-2 for uncommon/rare)
		var max_quantity = 3 if selected_consumable["rarity"] == "common" else 2
		var quantity = randi() % max_quantity + 1
		
		loot.append({
			"id": selected_consumable["id"],
			"quantity": quantity,
			"type": "consumable"
		})


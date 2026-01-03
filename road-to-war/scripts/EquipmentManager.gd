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

# EquipmentManager.gd - Handles hero equipment and stat modifications

signal equipment_changed(hero_id, slot, item_id, old_item_id)

# Map<hero_id, Map<slot_name, item_id>>
var hero_equipment: Dictionary = {}
# Registry for procedural items
var item_instances: Dictionary = {}

var equipment_slots = [
	"head", "neck", "shoulder", "cloak", "chest", "shirt", "tabard", 
	"bracer", "hands", "waist", "legs", "boots", 
	"ring1", "ring2", "trinket1", "trinket2", 
	"weapon", "offhand"
]

func _ready():
	_log_info("EquipmentManager", "Initialized")

func get_hero_equipment(hero_id: String) -> Dictionary:
	if not hero_equipment.has(hero_id):
		var slots = {}
		for slot in equipment_slots:
			slots[slot] = null
		hero_equipment[hero_id] = slots
	return hero_equipment[hero_id]

func equip_item(hero_id: String, item_id: String, slot: String) -> bool:
	var item_data = get_item_data(item_id)
	if not item_data:
		_log_error("EquipmentManager", "Item %s not found" % item_id)
		return false
		
	var pm = get_node_or_null("/root/PartyManager")
	if not pm: return false
	var hero = pm.get_hero_by_id(hero_id)
	if not hero: return false

	# 1. Check slot compatibility
	var item_slot = item_data.get("slot", "")
	if item_slot != slot:
		# Flexibility for multi-slot items
		if item_slot == "ring" and (slot == "ring1" or slot == "ring2"):
			pass
		elif item_slot == "trinket" and (slot == "trinket1" or slot == "trinket2"):
			pass
		else:
			_log_warn("EquipmentManager", "Item %s belongs in %s, not %s" % [item_id, item_slot, slot])
			return false

	# 2. Check Armor Proficiency (WoW style)
	if item_data.get("type") == "armor":
		var armor_type = item_data.get("armor_type", "cloth")
		var dm = get_node_or_null("/root/DataManager")
		var class_data = dm.get_data("classes").get(hero.class_id, {}) if dm else {}
		var proficiencies = class_data.get("armorProficiency", ["cloth"])
		if not armor_type in proficiencies:
			_log_warn("EquipmentManager", "Hero %s cannot wear %s armor" % [hero.name, armor_type])
			return false

	var equipment = get_hero_equipment(hero_id)
	var old_item_id = equipment[slot]
	
	equipment[slot] = item_id
	
	# Recalculate hero stats
	var sc = get_node_or_null("/root/StatCalculator")
	if sc: sc.recalculate_hero_stats(hero)
		
	equipment_changed.emit(hero_id, slot, item_id, old_item_id)
	_log_info("EquipmentManager", "Hero %s equipped %s in %s" % [hero_id, item_id, slot])
	return true

func unequip_item(hero_id: String, slot: String) -> String:
	var equipment = get_hero_equipment(hero_id)
	var old_item_id = equipment[slot]
	if not old_item_id: return ""
	
	equipment[slot] = null
	
	var pm = get_node_or_null("/root/PartyManager")
	var sc = get_node_or_null("/root/StatCalculator")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if hero and sc:
		sc.recalculate_hero_stats(hero)
		
	equipment_changed.emit(hero_id, slot, null, old_item_id)
	return old_item_id

func get_item_data(item_id: String) -> Dictionary:
	if item_instances.has(item_id):
		return item_instances[item_id]
		
	var dm = get_node_or_null("/root/DataManager")
	var items_data = dm.get_data("items") if dm else null
	if not items_data: return {}
	
	for category in ["weapons", "armor", "accessories"]:
		if items_data.get(category, {}).has(item_id):
			return items_data[category][item_id]
			
	return {}

func calculate_equipment_stats(hero_id: String) -> Dictionary:
	var total_stats = {}
	var equipment = get_hero_equipment(hero_id)
	
	for slot in equipment:
		var item_id = equipment[slot]
		if item_id:
			var item_data = get_item_data(item_id)
			var item_stats = item_data.get("stats", {})
			for stat in item_stats:
				total_stats[stat] = total_stats.get(stat, 0.0) + item_stats[stat]
			
			# Add Gem Bonuses
			var sockets = item_data.get("sockets", [])
			for gem_id in sockets:
				if gem_id:
					var gem_data = get_gem_data(gem_id)
					_apply_gem_stats(total_stats, gem_data)
				
	# Add Set Bonuses
	var set_bonuses = get_active_set_bonuses(hero_id)
	for stat in set_bonuses:
		total_stats[stat] = total_stats.get(stat, 0.0) + set_bonuses[stat]
				
	return total_stats

func get_gem_data(gem_id: String) -> Dictionary:
	var dm = get_node_or_null("/root/DataManager")
	var gems_json = dm.get_data("skill-gems") if dm else null
	if not gems_json: return {}
	
	for cat in gems_json.get("skillGems", {}):
		if gems_json["skillGems"][cat].has(gem_id):
			return gems_json["skillGems"][cat][gem_id]
	return {}

func _apply_gem_stats(stats: Dictionary, gem_data: Dictionary):
	if gem_data.is_empty(): return
	
	# Gems currently have minValue/maxValue, we'll use an average or a specific rolled value if we implement rolling
	var val = (gem_data.get("minValue", 0) + gem_data.get("maxValue", 0)) / 2.0
	var type = gem_data.get("type", "")
	var _element = gem_data.get("element", "")
	
	if type == "damage":
		# Add element-specific damage if we have that stat, otherwise just generic attack
		stats["attack"] = stats.get("attack", 0.0) + val
	elif type == "utility":
		var effect = gem_data.get("effect", "")
		# Add to utility stats (crit, haste, etc)
		if effect == "stun": stats["critRating"] = stats.get("critRating", 0.0) + val

func get_active_set_bonuses(hero_id: String) -> Dictionary:
	var active_bonuses = {}
	var equipment = get_hero_equipment(hero_id)
	var item_ids = []
	for slot in equipment:
		if equipment[slot]: item_ids.append(equipment[slot])
		
	var dm = get_node_or_null("/root/DataManager")
	var items_json = dm.get_data("items") if dm else null
	if not items_json or not items_json.has("sets"): return active_bonuses
	
	var sets = items_json["sets"]
	for set_id in sets:
		var set_def = sets[set_id]
		var pieces = set_def.get("pieces", [])
		var equipped_count = 0
		for piece_id in pieces:
			if piece_id in item_ids:
				equipped_count += 1
		
		# Apply bonuses based on equipped_count
		var bonuses = set_def.get("bonuses", {})
		for threshold_str in bonuses:
			var threshold = int(threshold_str)
			if equipped_count >= threshold:
				var bonus_stats = bonuses[threshold_str]
				for stat in bonus_stats:
					active_bonuses[stat] = active_bonuses.get(stat, 0.0) + bonus_stats[stat]
					
	return active_bonuses

func calculate_stats(hero_id: String):
	# Alias for compatibility with PartyManager
	var pm = get_node_or_null("/root/PartyManager")
	var sc = get_node_or_null("/root/StatCalculator")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if hero and sc:
		sc.recalculate_hero_stats(hero)

func get_save_data(hero_id: String = "all") -> Dictionary:
	if hero_id == "all":
		return hero_equipment.duplicate(true)
	else:
		return {hero_id: get_hero_equipment(hero_id)}

func calculate_item_score(item_data: Dictionary) -> int:
	"""Calculate a numerical score for an item to determine if it's an upgrade"""
	var score = 0
	var stats = item_data.get("stats", {})
	for stat_name in stats:
		score += stats[stat_name]
	# Weight item level heavily
	score += item_data.get("level", 1) * 5
	# Weight rarity
	var rarity_bonus = {
		"common": 0,
		"uncommon": 10,
		"rare": 25,
		"epic": 50,
		"legendary": 100
	}
	score += rarity_bonus.get(item_data.get("rarity", "common"), 0)
	return score

func auto_equip_best_in_slot(hero_id: String):
	"""Scan inventory and equip the highest scoring compatible items for a hero"""
	var pm = get_node_or_null("/root/PartyManager")
	var lm = get_node_or_null("/root/LootManager")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if not hero or not lm: return
	
	var inventory = lm.get_inventory()
	var equipment = get_hero_equipment(hero_id)
	
	# We'll do multiple passes to ensure we don't skip items if indices change
	var upgrades_found = true
	while upgrades_found:
		upgrades_found = false
		inventory = lm.get_inventory()
		
		var best_upgrade = null # {slot, item, index, score}
		
		for i in range(inventory.size()):
			var item = inventory[i]
			var data = item.get("data", {})
			var slot = data.get("slot", "")
			if not slot: continue
			
			# Multi-slot handling (rings/trinkets)
			var target_slots = [slot]
			if slot == "ring": target_slots = ["ring1", "ring2"]
			if slot == "trinket": target_slots = ["trinket1", "trinket2"]
			
			# Check proficiency
			if data.get("type") == "armor":
				var armor_type = data.get("armor_type", "cloth")
				var dm = get_node_or_null("/root/DataManager")
				var class_data = dm.get_data("classes").get(hero.class_id, {}) if dm else {}
				var proficiencies = class_data.get("armorProficiency", ["cloth"])
				if not armor_type in proficiencies:
					continue
			
			# Check class restriction
			var restrictions = data.get("class_restriction", [])
			if not restrictions.is_empty() and not hero.class_id in restrictions:
				continue
			
			var score = calculate_item_score(data)
			
			for s in target_slots:
				var current_item_id = equipment.get(s)
				var current_score = -1
				if current_item_id:
					current_score = calculate_item_score(get_item_data(current_item_id))
				
				if score > current_score:
					if best_upgrade == null or score > best_upgrade.score:
						best_upgrade = {"slot": s, "item": item, "index": i, "score": score}
		
		if best_upgrade:
			var item_id = best_upgrade.item.id
			var slot = best_upgrade.slot
			
			# Unequip old
			var old_item_id = unequip_item(hero_id, slot)
			
			# Equip new
			equip_item(hero_id, item_id, slot)
			
			# Remove from inventory
			lm.inventory.remove_at(best_upgrade.index)
			
			# Add old back to inventory
			if old_item_id:
				var old_data = get_item_data(old_item_id)
				lm.pickup_loot({
					"id": old_item_id, 
					"data": old_data, 
					"quality": old_data.get("rarity", "common")
				})
			
			upgrades_found = true
			_log_info("EquipmentManager", "Auto-equipped %s for %s" % [item_id, hero.name])

func sell_all_trash():
	"""Sell all 'common' quality items in the inventory"""
	var lm = get_node_or_null("/root/LootManager")
	var shm = get_node_or_null("/root/ShopManager")
	if not lm: return
	
	var inventory = lm.get_inventory()
	var total_gold = 0
	var sold_count = 0
	
	for i in range(inventory.size() - 1, -1, -1):
		var item = inventory[i]
		var quality = item.get("quality", "common")
		if quality == "common":
			var val = item.get("data", {}).get("sellValue", 5)
			total_gold += val
			sold_count += 1
			lm.inventory.remove_at(i)
	
	if total_gold > 0 and shm:
		shm.add_gold(total_gold)
		_log_info("EquipmentManager", "Sold %d trash items for %d gold" % [sold_count, total_gold])
		var part_m = get_node_or_null("/root/ParticleManager")
		if part_m:
			part_m.create_floating_text(Vector2(960, 540), "Trash Sold: +%dg" % total_gold, Color.YELLOW)

func load_save_data(save_data: Dictionary):
	hero_equipment = save_data.duplicate(true)
	_log_info("EquipmentManager", "Loaded equipment for %d heroes" % hero_equipment.size())

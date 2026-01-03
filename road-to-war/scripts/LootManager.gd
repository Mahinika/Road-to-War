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

# LootManager.gd - Handles item drops, pickups, and inventory management
# Adapted from the Phaser 3 LootManager

signal item_picked_up(item)
signal loot_spawned(loot_items)

var active_loot_items: Array = []
var inventory: Array = []
var max_inventory_size: int = 20

var loot_filter: String = "common" # Minimum rarity to pick up
var auto_sell_rarity: String = "none" # Automatically sell items of this rarity or lower

var pickup_range: float = 50.0

func _ready():
	_log_info("LootManager", "Initialized")

func spawn_loot(enemy: Dictionary, loot_items: Array):
	var enemy_x = enemy.get("x", 0)
	var enemy_y = enemy.get("y", 0)
	var enemy_level = enemy.get("level", 1)
	
	var spawned_items = []
	
	# Handle static drops
	for loot_data in loot_items:
		var item = create_loot_item(loot_data, enemy_x, enemy_y)
		active_loot_items.append(item)
		spawned_items.append(item)
	
	# Handle procedural drops based on enemy type/level
	var proc_chance = 0.2 # 20% base chance for a procedural item
	if enemy.get("type") == "elite": proc_chance = 0.5
	if enemy.get("type") == "boss": proc_chance = 1.0
	
	if randf() < proc_chance:
		var proc_item = roll_procedural_loot(enemy_level, enemy_x, enemy_y)
		active_loot_items.append(proc_item)
		spawned_items.append(proc_item)
	
	if not spawned_items.is_empty():
		loot_spawned.emit(spawned_items)
		_log_info("LootManager", "Spawned %d loot items" % spawned_items.size())

func roll_procedural_loot(level: int, x: float, y: float) -> Dictionary:
	var pig = get_node_or_null("/root/ProceduralItemGenerator")
	var item_data = pig.generate_random_item(level) if pig else {"id": "fallback", "name": "Broken Item"}
	
	# Register the instance so EquipmentManager can find it
	var eq = get_node_or_null("/root/EquipmentManager")
	if eq:
		eq.item_instances[item_data.id] = item_data
	
	return {
		"id": item_data.id,
		"x": x + randf_range(-20, 20),
		"y": y + randf_range(-20, 20),
		"data": item_data,
		"quantity": 1,
		"value": item_data.get("sellValue", 0),
		"quality": item_data.get("rarity", "common"),
		"spawned_at": Time.get_ticks_msec(),
		"lifetime": 30000
	}

func create_loot_item(loot_data: Dictionary, x: float, y: float) -> Dictionary:
	var dm = get_node_or_null("/root/DataManager")
	var items_json = dm.get_data("items") if dm else {}
	var item_id = loot_data.get("id", "")
	var item_data = {}
	
	if items_json:
		# Search through categories
		for category in ["weapons", "armor", "accessories", "consumables"]:
			if items_json.has(category) and items_json[category].has(item_id):
				item_data = items_json[category][item_id]
				break
	
	return {
		"id": item_id if item_id != "" else "unknown",
		"x": x + randf_range(-20, 20),
		"y": y + randf_range(-20, 20),
		"data": item_data,
		"quantity": loot_data.get("quantity", 1),
		"value": item_data.get("sellValue", 0),
		"quality": loot_data.get("quality", item_data.get("rarity", "common")),
		"spawned_at": Time.get_ticks_msec(),
		"lifetime": 30000 # 30 seconds
	}

func check_loot_pickups(hero_position: Vector2) -> Array:
	var picked_up_items = []
	
	for i in range(active_loot_items.size() - 1, -1, -1):
		var loot_item = active_loot_items[i]
		var loot_pos = Vector2(loot_item.x, loot_item.y)
		
		if hero_position.distance_to(loot_pos) <= pickup_range:
			if pickup_loot(loot_item):
				picked_up_items.append(loot_item)
				active_loot_items.remove_at(i)
	
	return picked_up_items

func pickup_loot(loot_item: Dictionary) -> bool:
	var item_rarity = loot_item.get("quality", "common")
	var pm_node = get_node_or_null("/root/ParticleManager")
	
	# Check loot filter
	if should_filter_item(item_rarity):
		if loot_item.has("x") and loot_item.has("y") and pm_node:
			pm_node.create_floating_text(Vector2(loot_item.x, loot_item.y), "Filtered", Color.GRAY)
		return true
	
	# Check inventory space
	if inventory.size() >= max_inventory_size:
		if loot_item.has("x") and loot_item.has("y") and pm_node:
			pm_node.create_floating_text(Vector2(loot_item.x, loot_item.y), "Inventory Full!", Color.RED)
		return false
	
	# Add to inventory
	inventory.append(loot_item)
	item_picked_up.emit(loot_item)
	
	if loot_item.has("x") and loot_item.has("y") and pm_node:
		var item_name = "Item"
		if loot_item.has("data"):
			item_name = loot_item.data.get("name", "Item")
		pm_node.create_floating_text(Vector2(loot_item.x, loot_item.y), "+" + item_name, Color.GREEN)
	
	_log_info("LootManager", "Picked up: %s" % loot_item.data.get("name", "Unknown"))
	return true

func should_filter_item(rarity: String) -> bool:
	var rarity_order = ["common", "uncommon", "rare", "epic", "legendary"]
	var filter_index = rarity_order.find(loot_filter)
	var item_index = rarity_order.find(rarity)
	return item_index < filter_index

func get_inventory() -> Array:
	return inventory.duplicate()

func remove_from_inventory(item_id: String, _quantity: int = 1) -> bool:
	for i in range(inventory.size()):
		if inventory[i].id == item_id:
			inventory.remove_at(i)
			return true
	return false

func use_consumable(item_id: String, hero_id: String) -> bool:
	var item_data = {}
	var dm = get_node_or_null("/root/DataManager")
	var items_json = dm.get_data("items") if dm else {}
	if items_json and items_json.has("consumables"):
		item_data = items_json["consumables"].get(item_id, {})
		
	if item_data.is_empty(): return false
	
	var pm = get_node_or_null("/root/PartyManager")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if not hero: return false
	
	var effects = item_data.get("effects", {})
	var used = false
	
	for effect_type in effects:
		match effect_type:
			"restoreHealth":
				var amount = effects[effect_type]
				hero.current_stats["health"] = min(hero.current_stats.get("health", 0) + amount, hero.current_stats.get("maxHealth", 100))
				used = true
			"restoreMana":
				var res_m = get_node_or_null("/root/ResourceManager")
				if res_m:
					res_m.add_consumable(item_id, 1, effects)
					res_m.use_consumable(hero_id, item_id)
				used = true
				
	if used:
		remove_from_inventory(item_id, 1)
		_log_info("LootManager", "Hero %s used %s" % [hero_id, item_id])
		return true
		
	return false

func clear_expired_loot():
	var current_time = Time.get_ticks_msec()
	
	for i in range(active_loot_items.size() - 1, -1, -1):
		var loot_item = active_loot_items[i]
		if current_time - loot_item.spawned_at > loot_item.lifetime:
			active_loot_items.remove_at(i)

func get_inventory_size() -> int:
	return inventory.size()

func is_inventory_full() -> bool:
	return inventory.size() >= max_inventory_size

func clear_active_loot():
	active_loot_items.clear()

func get_save_data() -> Dictionary:
	return {
		"inventory": inventory,
		"loot_filter": loot_filter,
		"auto_sell_rarity": auto_sell_rarity
	}

func load_save_data(save_data: Dictionary):
	inventory = save_data.get("inventory", [])
	loot_filter = save_data.get("loot_filter", "common")
	auto_sell_rarity = save_data.get("auto_sell_rarity", "none")
	_log_info("LootManager", "Loaded inventory with %d items" % inventory.size())

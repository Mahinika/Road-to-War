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
# Godot 4.x loot and inventory management system

signal item_picked_up(item)
signal loot_spawned(loot_items)

var active_loot_items: Array = []
var inventory: Array = []
var max_inventory_size: int = 100 # Increased for testing drops

var loot_filter: String = "common" # Minimum rarity to pick up
var auto_sell_rarity: String = "none" # Automatically sell items of this rarity or lower

var pickup_range: float = 200.0 # Reasonable range

var _last_full_message_time: int = 0
var _last_filtered_message_time: int = 0
const FULL_MESSAGE_COOLDOWN: int = 2000 # 2 seconds
const FILTER_MESSAGE_COOLDOWN: int = 1000 # 1 second

func _ready():
	_log_info("LootManager", "Initialized")
	max_inventory_size = 100 # Force 100 for testing

func spawn_loot(enemy: Dictionary, loot_items: Array):
	_log_info("LootManager", "spawn_loot called with %d items from enemy %s" % [loot_items.size(), enemy.get("id", "unknown")])
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
	# DEBUG: Every enemy drops 10 items for testing
	for i in range(10):
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
		eq.item_instances[item_data["id"]] = item_data
	
	var spawned_at_distance = 0.0
	var wm = get_node_or_null("/root/WorldManager")
	if wm: spawned_at_distance = wm.distance_traveled
	
	return {
		"id": item_data["id"],
		"x": x + randf_range(-20, 20),
		"y": y + randf_range(-20, 20),
		"spawn_distance": spawned_at_distance,
		"data": item_data,
		"quantity": 1,
		"value": item_data.get("sellValue", 0),
		"quality": item_data.get("rarity", "common"),
		"spawned_at": Time.get_ticks_msec(),
		"lifetime": 30000
	}

func create_loot_item(loot_data: Dictionary, x: float, y: float) -> Dictionary:
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return {}
	
	var items_json = dm.get_data("items")
	var item_id = loot_data.get("id", "")
	var item_data = {}
	
	if items_json:
		# Search through categories
		for category in ["weapons", "armor", "accessories", "consumables"]:
			if items_json.has(category) and items_json[category].has(item_id):
				item_data = items_json[category][item_id]
				break
	
	var spawned_at_distance = 0.0
	var wm = get_node_or_null("/root/WorldManager")
	if wm: spawned_at_distance = wm.distance_traveled
	
	return {
		"id": item_id if item_id != "" else "unknown",
		"x": x + randf_range(-20, 20),
		"y": y + randf_range(-20, 20),
		"spawn_distance": spawned_at_distance,
		"data": item_data,
		"quantity": loot_data.get("quantity", 1),
		"value": item_data.get("sellValue", 0),
		"quality": loot_data.get("quality", item_data.get("rarity", "common")),
		"spawned_at": Time.get_ticks_msec(),
		"lifetime": 30000 # 30 seconds
	}

func check_loot_pickups(hero_position: Vector2) -> Array:
	var picked_up_items = []
	var wm = get_node_or_null("/root/WorldManager")
	var current_dist = wm.distance_traveled if wm else 0.0
	
	var inv_full = inventory.size() >= max_inventory_size
	
	for i in range(active_loot_items.size() - 1, -1, -1):
		var loot_item = active_loot_items[i]
		
		# If inventory is full, we can only "pick up" filtered items (to clear them)
		# but if it's not filtered and inv is full, skip range check to save CPU
		var item_rarity = loot_item.get("quality", "common")
		var is_filtered = should_filter_item(item_rarity)
		
		if inv_full and not is_filtered:
			# Still need to show the "Full" message occasionally if they are standing on loot
			# but we'll do that inside pickup_loot if we decide to call it.
			# For now, let's just do the range check and let pickup_loot handle the message cooldown.
			pass
		
		# Calculate current screen X position based on travel
		var spawn_dist = loot_item.get("spawn_distance", 0.0)
		var lx = loot_item.get("x", 0.0)
		var ly = loot_item.get("y", 0.0)
		var current_x = lx - (current_dist - spawn_dist)
		
		var loot_pos = Vector2(current_x, ly)
		
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
		var current_time = Time.get_ticks_msec()
		if current_time - _last_filtered_message_time > FILTER_MESSAGE_COOLDOWN:
			if loot_item.has("x") and loot_item.has("y") and pm_node:
				var lx = loot_item.get("x", 0.0)
				var ly = loot_item.get("y", 0.0)
				pm_node.create_floating_text(Vector2(lx, ly), "Filtered", Color.GRAY)
			_last_filtered_message_time = current_time
		return true
	
	# Check inventory space
	if inventory.size() >= max_inventory_size:
		var current_time = Time.get_ticks_msec()
		if current_time - _last_full_message_time > FULL_MESSAGE_COOLDOWN:
			if loot_item.has("x") and loot_item.has("y") and pm_node:
				var lx = loot_item.get("x", 0.0)
				var ly = loot_item.get("y", 0.0)
				pm_node.create_floating_text(Vector2(lx, ly), "Inventory Full!", Color.RED)
			_last_full_message_time = current_time
		return false
	
	# Add to inventory
	inventory.append(loot_item)
	item_picked_up.emit(loot_item)
	
	if loot_item.has("x") and loot_item.has("y") and pm_node:
		var item_name = "Item"
		var item_data = loot_item.get("data", {})
		if not item_data.is_empty():
			item_name = item_data.get("name", "Item")
		var lx = loot_item.get("x", 0.0)
		var ly = loot_item.get("y", 0.0)
		pm_node.create_floating_text(Vector2(lx, ly), "+" + item_name, Color.GREEN)
	
	var final_item_name = "Unknown"
	if loot_item.get("data"):
		final_item_name = loot_item.get("data").get("name", "Unknown")
		
	_log_debug("LootManager", "Picked up: %s" % final_item_name)
	return true

func should_filter_item(rarity: String) -> bool:
	var rarity_order = ["common", "uncommon", "rare", "epic", "legendary"]
	var filter_index = rarity_order.find(loot_filter)
	var item_index = rarity_order.find(rarity)
	return item_index < filter_index

func get_inventory() -> Array:
	return inventory.duplicate()

func add_to_inventory(item_data: Variant) -> bool:
	"""
	Add an item directly to inventory without requiring position data.
	Accepts either an item ID string, a simple item dictionary, or a full loot item dictionary.
	"""
	# Check inventory space
	if inventory.size() >= max_inventory_size:
		_log_warn("LootManager", "Inventory full, cannot add item")
		return false
	
	var loot_item: Dictionary
	
	# Handle different input formats
	if item_data is String:
		# If it's just an item ID string, create a loot item from it
		var dm = get_node_or_null("/root/DataManager")
		var item_dict = {}
		if dm:
			var items_json = dm.get_data("items")
			if items_json:
				# Search through categories
				for category in ["weapons", "armor", "accessories", "consumables"]:
					if items_json.has(category) and items_json[category].has(item_data):
						item_dict = items_json[category][item_data]
						break
		
		loot_item = {
			"id": item_data,
			"data": item_dict,
			"quantity": 1,
			"value": item_dict.get("sellValue", 0),
			"quality": item_dict.get("rarity", "common")
		}
	elif item_data is Dictionary:
		# Check if it's already a full loot item (has position/spawn data) or simple item data
		if item_data.has("x") or item_data.has("spawn_distance"):
			# Already formatted as a full loot item (has position data)
			loot_item = item_data
		elif item_data.has("id") and item_data.has("data"):
			# Already formatted as a loot item but without position data - use as-is
			loot_item = item_data
		else:
			# Simple item data dictionary - wrap it into loot item format
			var item_id = item_data.get("id", "")
			if item_id == "":
				_log_warn("LootManager", "Item dictionary missing 'id' field")
				return false
			
			loot_item = {
				"id": item_id,
				"data": item_data,
				"quantity": item_data.get("quantity", 1),
				"value": item_data.get("sellValue", item_data.get("value", 0)),
				"quality": item_data.get("rarity", item_data.get("quality", "common"))
			}
	else:
		_log_warn("LootManager", "Invalid item data type for add_to_inventory: %s" % typeof(item_data))
		return false
	
	# Add to inventory
	inventory.append(loot_item)
	item_picked_up.emit(loot_item)
	
	var item_name = "Item"
	if loot_item.has("data") and loot_item["data"] is Dictionary and not loot_item["data"].is_empty():
		item_name = loot_item["data"].get("name", "Item")
	elif loot_item.has("id"):
		item_name = loot_item["id"]
	
	_log_info("LootManager", "Added to inventory: %s" % item_name)
	return true

func award_item_to_party(item_data: Variant) -> bool:
	"""
	Alias for add_to_inventory for backwards compatibility.
	Awards an item directly to the party inventory.
	"""
	return add_to_inventory(item_data)

func remove_from_inventory(item_id: String, _quantity: int = 1) -> bool:
	for i in range(inventory.size()):
		if inventory[i].get("id") == item_id:
			inventory.remove_at(i)
			return true
	return false

func use_consumable(item_id: String, hero_id: String) -> bool:
	var item_data = {}
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return false
	
	var items_json = dm.get_data("items")
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
		var spawned_at = loot_item.get("spawned_at", 0)
		var lifetime = loot_item.get("lifetime", 30000)
		if current_time - spawned_at > lifetime:
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

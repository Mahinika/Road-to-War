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

# ShopManager.gd - Handles merchant encounters and item purchasing
# Manages shop interface, gold economy, and item transactions

signal shop_opened(shop_type, items)
signal shop_closed
signal item_purchased(item, cost)
signal item_sold(item, value)

var is_shop_open: bool = false
var current_shop_type: String = ""
var player_gold: int = 100

var shop_inventory: Array = []

func _ready():
	_log_info("ShopManager", "Initialized")

func open_shop(shop_type: String, items: Array):
	if is_shop_open:
		return
	
	is_shop_open = true
	current_shop_type = shop_type
	shop_inventory = items
	
	shop_opened.emit(shop_type, items)
	_log_info("ShopManager", "Opened %s shop with %d items" % [shop_type, items.size()])

func close_shop():
	if not is_shop_open:
		return
	
	is_shop_open = false
	current_shop_type = ""
	shop_inventory.clear()
	
	shop_closed.emit()
	_log_info("ShopManager", "Closed shop")

func purchase_item(item_id: String, quantity: int = 1) -> bool:
	if not is_shop_open:
		return false
	
	var item_data = get_item_from_shop(item_id)
	if not item_data:
		return false
	
	var cost = item_data.get("buyPrice", item_data.get("sellValue", 0) * 2) * quantity
	if player_gold < cost:
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			pm.create_floating_text(Vector2(400, 300), "Not enough gold!", Color.RED)
		return false
	
	player_gold -= cost
	var stm = get_node_or_null("/root/StatisticsManager")
	if stm:
		stm.increment_stat("collection", "goldSpent", cost)
	
	# Add to inventory
	var lm = get_node_or_null("/root/LootManager")
	if lm:
		var loot_item = {
			"id": item_id,
			"data": item_data,
			"quality": item_data.get("rarity", "common"),
			"quantity": quantity,
			"spawned_at": Time.get_ticks_msec(),
			"lifetime": 30000
		}
		lm.pickup_loot(loot_item)
	
	item_purchased.emit(item_data, cost)
	
	var part_m = get_node_or_null("/root/ParticleManager")
	if part_m:
		part_m.create_floating_text(Vector2(400, 300), "Purchased!", Color.GREEN)
	_log_info("ShopManager", "Purchased %s for %d gold" % [item_data.get("name", "item"), cost])
	
	return true

func sell_item(item_id: String, quantity: int = 1) -> bool:
	var items_json = DataManager.get_data("items")
	var item_data = {}
	
	if items_json:
		for category in ["weapons", "armor", "accessories", "consumables"]:
			if items_json.has(category) and items_json[category].has(item_id):
				item_data = items_json[category][item_id]
				break
				
	if item_data.is_empty():
		return false
	
	var value = item_data.get("sellValue", 0) * quantity
	player_gold += value
	
	# Remove from inventory (would integrate with LootManager)
	item_sold.emit(item_data, value)
	
	ParticleManager.create_floating_text(Vector2(400, 300), "+" + str(value) + "g", Color.YELLOW)
	_log_info("ShopManager", "Sold %s for %d gold" % [item_data.get("name", "item"), value])
	
	return true

func get_item_from_shop(item_id: String) -> Dictionary:
	for item in shop_inventory:
		if item.get("id") == item_id:
			return item
	return {}

func get_player_gold() -> int:
	return player_gold

func add_gold(amount: int):
	player_gold += amount
	_log_debug("ShopManager", "Added %d gold, total: %d" % [amount, player_gold])

func spend_gold(amount: int) -> bool:
	if player_gold >= amount:
		player_gold -= amount
		_log_debug("ShopManager", "Spent %d gold, remaining: %d" % [amount, player_gold])
		return true
	return false

func get_save_data() -> Dictionary:
	return {
		"player_gold": player_gold
	}

func load_save_data(save_data: Dictionary):
	player_gold = save_data.get("player_gold", 100)


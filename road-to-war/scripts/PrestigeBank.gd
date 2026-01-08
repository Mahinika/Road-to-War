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

# PrestigeBank.gd - Manages items stored across prestige resets
# Players can "bank" items to preserve them through prestige

signal item_banked(item_id, slot)
signal item_unbanked(item_id)

# Map<item_id, { hero_id, slot, item_data }>
var banked_items: Dictionary = {}
var max_bank_slots: int = 0  # Increases with prestige level

func _ready():
	_log_info("PrestigeBank", "Initialized")
	_update_max_slots()
	
	# Connect to prestige performed signal
	var prestige_m = get_node_or_null("/root/PrestigeManager")
	if prestige_m:
		if not prestige_m.prestige_performed.is_connected(_on_prestige_performed):
			prestige_m.prestige_performed.connect(_on_prestige_performed)

func _update_max_slots():
	# Max slots = 1 per prestige level (max 10 at Prestige Level 10+)
	var prestige_m = get_node_or_null("/root/PrestigeManager")
	if prestige_m:
		var prestige_level = prestige_m.get_prestige_level()
		max_bank_slots = min(prestige_level, 10)  # Cap at 10 slots
		# Unlocked at Prestige Level 3+
		if prestige_level < 3:
			max_bank_slots = 0
	else:
		max_bank_slots = 0
	
func _on_prestige_performed(_new_level, _points_gained):
	_update_max_slots()

func is_unlocked() -> bool:
	return max_bank_slots > 0

func can_bank_item() -> bool:
	return is_unlocked() and banked_items.size() < max_bank_slots

func bank_item(item_id: String, hero_id: String, slot: String) -> bool:
	if not can_bank_item():
		_log_warn("PrestigeBank", "Cannot bank item: Bank full or not unlocked")
		return false
	
	if banked_items.has(item_id):
		_log_warn("PrestigeBank", "Item %s already banked" % item_id)
		return false
	
	var em = get_node_or_null("/root/EquipmentManager")
	if not em:
		_log_error("PrestigeBank", "EquipmentManager not found")
		return false
	
	var item_data = em.get_item_data(item_id)
	if item_data.is_empty():
		_log_error("PrestigeBank", "Item %s not found" % item_id)
		return false
	
	banked_items[item_id] = {
		"hero_id": hero_id,
		"slot": slot,
		"item_data": item_data.duplicate(true)
	}
	
	item_banked.emit(item_id, slot)
	_log_info("PrestigeBank", "Banked item: %s (Hero: %s, Slot: %s)" % [item_id, hero_id, slot])
	return true

func unbank_item(item_id: String) -> bool:
	if not banked_items.has(item_id):
		return false
	
	banked_items.erase(item_id)
	item_unbanked.emit(item_id)
	_log_info("PrestigeBank", "Unbanked item: %s" % item_id)
	return true

func get_banked_items() -> Dictionary:
	return banked_items.duplicate()

func get_banked_item_count() -> int:
	return banked_items.size()

func get_available_slots() -> int:
	return max_bank_slots - banked_items.size()

func restore_banked_items():
	# Restore banked items after prestige reset
	_log_info("PrestigeBank", "Restoring %d banked items" % banked_items.size())
	
	var em = get_node_or_null("/root/EquipmentManager")
	var pm = get_node_or_null("/root/PartyManager")
	if not em or not pm:
		_log_error("PrestigeBank", "Managers not found for restoration")
		return
	
	for item_id in banked_items:
		var bank_data = banked_items[item_id]
		var hero_id = bank_data["hero_id"]
		var slot = bank_data["slot"]
		
		# Find hero (may have been reset, so find by ID or recreate)
		var hero = pm.get_hero_by_id(hero_id)
		if not hero:
			_log_warn("PrestigeBank", "Hero %s not found, skipping item %s" % [hero_id, item_id])
			continue
		
		# Equip the banked item
		if em.equip_item(hero_id, item_id, slot):
			_log_info("PrestigeBank", "Restored item %s to %s (%s)" % [item_id, hero.name, slot])
		else:
			_log_warn("PrestigeBank", "Failed to restore item %s" % item_id)

func clear_bank():
	banked_items.clear()
	_log_info("PrestigeBank", "Bank cleared")

func get_save_data() -> Dictionary:
	return {
		"banked_items": banked_items,
		"max_bank_slots": max_bank_slots
	}

func load_save_data(save_data: Dictionary):
	banked_items = save_data.get("banked_items", {})
	max_bank_slots = save_data.get("max_bank_slots", 0)
	_update_max_slots()  # Recalculate based on current prestige level
	_log_info("PrestigeBank", "Loaded %d banked items" % banked_items.size())


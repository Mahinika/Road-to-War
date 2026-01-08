extends Node

# SaveLoadHandler.gd - Handles save and load operations
# Provides centralized save/load logic for the World scene

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

var save_manager: Node = null
var world_manager: Node = null
var party_manager: Node = null

func _ready():
	_log_info("SaveLoadHandler", "Initialized as Autoload")
	save_manager = get_node_or_null("/root/SaveManager")
	world_manager = get_node_or_null("/root/WorldManager")
	party_manager = get_node_or_null("/root/PartyManager")

func initialize():
	# Legacy method for scene-based initialization (kept for compatibility)
	# As Autoload, initialization happens in _ready()
	pass

# Save game state
# slot: int (1-based slot number, matches SaveManager interface)
func save_game(slot: int = -1) -> bool:
	if not save_manager:
		_log_error("SaveLoadHandler", "SaveManager not found")
		return false
	
	# SaveManager handles save_data collection internally
	# We just need to call it with the slot number
	var success = save_manager.save_game(slot)
	if success:
		_log_info("SaveLoadHandler", "Game saved to slot: %d" % slot)
	else:
		_log_error("SaveLoadHandler", "Failed to save game")
	
	return success

# Load game state
# slot: int (1-based slot number, matches SaveManager interface)
func load_game(slot: int = -1) -> bool:
	if not save_manager:
		_log_error("SaveLoadHandler", "SaveManager not found")
		return false
	
	var save_data = save_manager.load_game(slot)
	if save_data.is_empty():
		_log_error("SaveLoadHandler", "Failed to load save data")
		return false
	
	# Apply loaded data to all managers
	save_manager.apply_save_data(save_data)
	
	_log_info("SaveLoadHandler", "Game loaded from slot: %d" % slot)
	return true

# Get list of available save slots
func get_save_slots() -> Array:
	if not save_manager:
		return []
	return save_manager.get_save_slots()

# Delete a save slot
func delete_save(slot: int) -> bool:
	if not save_manager:
		return false
	var success = save_manager.delete_save(slot)
	if success:
		_log_info("SaveLoadHandler", "Save slot %d deleted." % slot)
		save_manager.load_save_slots() # Refresh slots
	else:
		_log_error("SaveLoadHandler", "Failed to delete save slot %d." % slot)
	return success


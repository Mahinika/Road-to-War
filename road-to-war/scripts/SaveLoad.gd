extends Control

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

# SaveLoad.gd - Save/Load game scene
# Handles saving and loading game state

var mode: String = "save"  # "save" or "load"
var save_slots: Array = []
var selected_slot: int = -1

@onready var title_label: Label = $VBoxContainer/TitleLabel
@onready var slots_container: GridContainer = $VBoxContainer/SlotsContainer
@onready var action_button: Button = $VBoxContainer/ActionButton
@onready var back_button: Button = $VBoxContainer/BackButton
@onready var info_label: Label = $VBoxContainer/InfoLabel

func _ready():
	_log_info("SaveLoad", "Scene initialized")
	
	# Check for passed mode from SceneManager
	if SceneManager.scene_data.has("mode"):
		mode = SceneManager.scene_data["mode"]
		_log_info("SaveLoad", "Mode set from scene_data: %s" % mode)
		SceneManager.scene_data.erase("mode") # Clear for next time
	
	# Connect buttons
	action_button.pressed.connect(_on_action_pressed)
	back_button.pressed.connect(_on_back_pressed)
	
	# Load save slots
	_load_save_slots()
	
	# Update UI based on mode
	_update_ui()

func _load_save_slots():
	"""Load available save slots"""
	save_slots.clear()
	
	# Get save slots from SaveManager
	SaveManager.load_save_slots()
	var manager_slots = SaveManager.get_save_slots()
	
	for i in range(manager_slots.size()):
		var slot_data = manager_slots[i]
		var slot_num = slot_data.get("slot", i + 1)
		save_slots.append({
			"slot": i,  # 0-based for UI
			"exists": slot_data.get("has_data", false),
			"timestamp": SaveManager.format_timestamp(slot_data.get("timestamp", 0)) if slot_data.get("has_data", false) else "",
			"party_size": slot_data.get("party_size", 0),
			"level": slot_data.get("level", 1)
		})
	
	_create_slot_buttons()

func _create_slot_buttons():
	"""Create buttons for each save slot"""
	# Clear existing buttons
	for child in slots_container.get_children():
		child.queue_free()
	
	# Create slot buttons
	for slot_data in save_slots:
		var slot_button = _create_slot_button(slot_data)
		slots_container.add_child(slot_button)

func _create_slot_button(slot_data: Dictionary) -> Button:
	"""Create a button for a save slot"""
	var button = Button.new()
	button.custom_minimum_size = Vector2(200, 80)
	
	var slot_num = slot_data.slot
	var text = "Slot %d" % (slot_num + 1)
	
	if slot_data.exists:
		text += "\n%s" % slot_data.timestamp
		text += "\nParty: %d | Level: %d" % [slot_data.party_size, slot_data.level]
		button.modulate = Color(1, 1, 1, 1)  # Normal color
	else:
		text += "\n(Empty)"
		button.modulate = Color(0.7, 0.7, 0.7, 1)  # Grayed out
	
	button.text = text
	button.pressed.connect(_on_slot_selected.bind(slot_num))
	
	return button

func _on_slot_selected(slot: int):
	"""Handle slot selection"""
	selected_slot = slot
	info_label.text = "Selected: Slot %d" % (slot + 1)
	
	# Update button states
	for i in range(slots_container.get_child_count()):
		var button = slots_container.get_child(i)
		if i == slot:
			button.modulate = Color(1, 1, 0.5, 1)  # Highlight selected
		else:
			var slot_data = save_slots[i]
			if slot_data.exists:
				button.modulate = Color(1, 1, 1, 1)
			else:
				button.modulate = Color(0.7, 0.7, 0.7, 1)

func _update_ui():
	"""Update UI based on mode"""
	if mode == "save":
		title_label.text = "SAVE GAME"
		action_button.text = "SAVE"
		info_label.text = "Select a slot to save your game"
	else:
		title_label.text = "LOAD GAME"
		action_button.text = "LOAD"
		info_label.text = "Select a slot to load your game"
	
	# Disable action button until slot selected
	action_button.disabled = true

func _on_action_pressed():
	"""Handle save/load action"""
	if selected_slot < 0:
		_log_warn("SaveLoad", "No slot selected")
		return
	
	if mode == "save":
		_save_game()
	else:
		_load_game()

func _save_game():
	"""Save game to selected slot"""
	if selected_slot < 0:
		return
	
	_log_info("SaveLoad", "Saving game to slot %d" % selected_slot)
	
	var success = SaveManager.save_game(selected_slot + 1)  # SaveManager uses 1-based slots
	
	if success:
		info_label.text = "Game saved to Slot %d!" % (selected_slot + 1)
		_log_info("SaveLoad", "Save successful")
		
		# Reload slots to show updated info
		_load_save_slots()
		
		# Return to main menu after a delay
		await get_tree().create_timer(1.5).timeout
		SceneManager.change_scene("res://scenes/MainMenu.tscn")
	else:
		info_label.text = "Save failed!"
		_log_error("SaveLoad", "Save failed")

func _load_game():
	"""Load game from selected slot"""
	if selected_slot < 0:
		return
	
	var slot_data = save_slots[selected_slot]
	if not slot_data.exists:
		info_label.text = "Slot is empty!"
		return
	
	_log_info("SaveLoad", "Loading game from slot %d" % selected_slot)
	
	var save_data = SaveManager.load_game(selected_slot + 1)  # SaveManager uses 1-based slots
	
	if not save_data.is_empty():
		info_label.text = "Game loaded from Slot %d!" % (selected_slot + 1)
		_log_info("SaveLoad", "Load successful")
		
		# Apply loaded data to managers
		SaveManager.apply_save_data(save_data)
		
		# Transition to game scene after a delay
		await get_tree().create_timer(1.5).timeout
		SceneManager.change_scene("res://scenes/World.tscn")
	else:
		info_label.text = "Load failed!"
		_log_error("SaveLoad", "Load failed")

func _on_back_pressed():
	"""Return to main menu"""
	SceneManager.change_scene("res://scenes/MainMenu.tscn")

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

@onready var main_panel: Panel = $MainPanel
@onready var title_label: Label = $MainPanel/TitleLabel
@onready var slots_container: GridContainer = $MainPanel/ScrollContainer/SlotsContainer
@onready var action_button: Button = $MainPanel/ButtonsContainer/ActionButton
@onready var back_button: Button = $MainPanel/ButtonsContainer/BackButton
@onready var info_label: Label = $MainPanel/InfoLabel

var ui_theme: Node = null

func _ready():
	_log_info("SaveLoad", "Scene initialized")
	
	ui_theme = get_node_or_null("/root/UITheme")
	
	# Apply WoW styling
	_apply_wow_styling()
	
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

func _apply_wow_styling():
	"""Apply WoW WotLK styling to SaveLoad UI"""
	if not ui_theme: return
	
	# Style main panel
	if main_panel:
		main_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			ui_theme.COLORS["frame_dark"],
			ui_theme.COLORS["gold_border"],
			2
		))
	
	# Style title
	if title_label:
		title_label.add_theme_color_override("font_color", Color.GOLD)
		title_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		title_label.add_theme_constant_override("outline_size", 2)
	
	# Style info label
	if info_label:
		info_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		info_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		info_label.add_theme_constant_override("outline_size", 1)
		info_label.add_theme_font_size_override("font_size", 14)
	
	# Style buttons
	if action_button and ui_theme:
		var normal_sb = ui_theme.get_stylebox_panel(
			Color(0.2, 0.5, 0.2, 0.95),
			Color.GREEN,
			1
		)
		var hover_sb = ui_theme.get_stylebox_panel(
			Color(0.3, 0.6, 0.3, 0.95),
			Color(0.5, 1.0, 0.5),
			2
		)
		action_button.add_theme_stylebox_override("normal", normal_sb)
		action_button.add_theme_stylebox_override("hover", hover_sb)
		action_button.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		action_button.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		action_button.add_theme_constant_override("outline_size", 1)
	
	if back_button and ui_theme:
		var normal_sb = ui_theme.get_stylebox_panel(
			ui_theme.COLORS["frame_dark"],
			ui_theme.COLORS["gold_border"],
			1
		)
		var hover_sb = ui_theme.get_stylebox_panel(
			Color(0.15, 0.15, 0.18, 0.95),
			ui_theme.COLORS["gold"],
			1
		)
		back_button.add_theme_stylebox_override("normal", normal_sb)
		back_button.add_theme_stylebox_override("hover", hover_sb)
		back_button.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		back_button.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		back_button.add_theme_constant_override("outline_size", 1)

func _load_save_slots():
	"""Load available save slots"""
	save_slots.clear()
	
	# Get save slots from SaveLoadHandler (which wraps SaveManager)
	var handler = get_node_or_null("/root/SaveLoadHandler")
	var manager_slots: Array = []
	if handler:
		manager_slots = handler.get_save_slots()
	else:
		# Fallback to SaveManager if handler not available
		SaveManager.load_save_slots()
		manager_slots = SaveManager.get_save_slots()
	
	for i in range(manager_slots.size()):
		var slot_data = manager_slots[i]
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
		_create_slot_button(slot_data)  # Button is added to container inside the function

func _create_slot_button(slot_data: Dictionary) -> Button:
	"""Create a WoW-style save slot button"""
	var slot_num = slot_data.slot + 1  # 1-based for display
	
	# Create slot button panel
	var button = Button.new()
	button.custom_minimum_size = Vector2(250, 120)
	
	# Style slot button with WoW styling
	var border_color = Color.GOLD if slot_data.exists else Color(0.5, 0.5, 0.5)
	var bg_color = Color(0.1, 0.1, 0.1, 0.9) if slot_data.exists else Color(0.05, 0.05, 0.05, 0.8)
	
	if ui_theme:
		var normal_sb = ui_theme.get_stylebox_panel(
			bg_color,
			border_color,
			2
		)
		button.add_theme_stylebox_override("normal", normal_sb)
		var hover_sb = ui_theme.get_stylebox_panel(
			Color(bg_color.r + 0.05, bg_color.g + 0.05, bg_color.b + 0.05, bg_color.a),
			Color.GOLD,
			3
		)
		button.add_theme_stylebox_override("hover", hover_sb)
	
	# Create text label with slot info
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("offset_left", 10)
	vbox.add_theme_constant_override("offset_top", 10)
	vbox.add_theme_constant_override("offset_right", -10)
	vbox.add_theme_constant_override("offset_bottom", -10)
	vbox.add_theme_constant_override("separation", 5)
	button.add_child(vbox)
	
	# Slot number
	var slot_label = Label.new()
	slot_label.text = "SLOT %d" % slot_num
	slot_label.add_theme_color_override("font_color", Color.GOLD if slot_data.exists else Color(0.7, 0.7, 0.7))
	slot_label.add_theme_font_size_override("font_size", 18)
	slot_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	slot_label.add_theme_constant_override("outline_size", 1)
	slot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(slot_label)
	
	if slot_data.exists:
		# Timestamp
		var time_label = Label.new()
		time_label.text = slot_data.timestamp
		time_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
		time_label.add_theme_font_size_override("font_size", 12)
		time_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(time_label)
		
		# Party info
		var party_info_label = Label.new()
		party_info_label.text = "Party: %d | Level: %d" % [slot_data.party_size, slot_data.level]
		party_info_label.add_theme_color_override("font_color", Color(0.75, 0.75, 0.75))
		party_info_label.add_theme_font_size_override("font_size", 11)
		party_info_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(party_info_label)
	else:
		# Empty slot
		var empty_label_text = Label.new()
		empty_label_text.text = "(Empty)"
		empty_label_text.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
		empty_label_text.add_theme_font_size_override("font_size", 14)
		empty_label_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty_label_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		vbox.add_child(empty_label_text)
	
	button.pressed.connect(_on_slot_selected.bind(slot_data.slot))
	slots_container.add_child(button)
	
	return button

func _on_slot_selected(slot: int):
	"""Handle slot selection"""
	selected_slot = slot
	info_label.text = "Selected: Slot %d" % (slot + 1)
	action_button.disabled = false
	
	# Update button states with WoW styling
	for i in range(slots_container.get_child_count()):
		var button = slots_container.get_child(i)
		var slot_data = save_slots[i]
		
		if i == slot:
			# Selected slot - gold border, brighter background
			if ui_theme:
				var selected_sb = ui_theme.get_stylebox_panel(
					Color(0.2, 0.15, 0.1, 0.95),
					Color.GOLD,
					3
				)
				button.add_theme_stylebox_override("normal", selected_sb)
		else:
			# Unselected slot - normal styling
			var border_color = Color.GOLD if slot_data.exists else Color(0.5, 0.5, 0.5)
			var bg_color = Color(0.1, 0.1, 0.1, 0.9) if slot_data.exists else Color(0.05, 0.05, 0.05, 0.8)
			
			if ui_theme:
				var normal_sb = ui_theme.get_stylebox_panel(
					bg_color,
					border_color,
					2
				)
				button.add_theme_stylebox_override("normal", normal_sb)

func _update_ui():
	"""Update UI based on mode"""
	if mode == "save":
		title_label.text = "SAVE GAME"
		action_button.text = "SAVE"
		info_label.text = "Select a slot to save your game"
		# Style save button as green
		if action_button and ui_theme:
			var normal_sb = ui_theme.get_stylebox_panel(
				Color(0.2, 0.5, 0.2, 0.95),
				Color.GREEN,
				1
			)
			var hover_sb = ui_theme.get_stylebox_panel(
				Color(0.3, 0.6, 0.3, 0.95),
				Color(0.5, 1.0, 0.5),
				2
			)
			action_button.add_theme_stylebox_override("normal", normal_sb)
			action_button.add_theme_stylebox_override("hover", hover_sb)
	else:
		title_label.text = "LOAD GAME"
		action_button.text = "LOAD"
		info_label.text = "Select a slot to load your game"
		# Style load button as blue
		if action_button and ui_theme:
			var normal_sb = ui_theme.get_stylebox_panel(
				Color(0.2, 0.3, 0.5, 0.95),
				Color(0.0, 0.44, 0.87),
				1
			)
			var hover_sb = ui_theme.get_stylebox_panel(
				Color(0.3, 0.4, 0.6, 0.95),
				Color(0.2, 0.6, 1.0),
				2
			)
			action_button.add_theme_stylebox_override("normal", normal_sb)
			action_button.add_theme_stylebox_override("hover", hover_sb)
	
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
	
	# Use SaveLoadHandler (which wraps SaveManager)
	var handler = get_node_or_null("/root/SaveLoadHandler")
	var slot_num = selected_slot + 1  # Convert to 1-based
	
	var success = false
	if handler:
		success = handler.save_game(slot_num)
	else:
		# Fallback to SaveManager if handler not available
		success = SaveManager.save_game(slot_num)
	
	if success:
		info_label.text = "Game saved to Slot %d!" % slot_num
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
	
	# Use SaveLoadHandler (which wraps SaveManager and applies data)
	var handler = get_node_or_null("/root/SaveLoadHandler")
	var slot_num = selected_slot + 1  # Convert to 1-based
	
	var success = false
	if handler:
		success = handler.load_game(slot_num)
	else:
		# Fallback to SaveManager if handler not available
		var save_data = SaveManager.load_game(slot_num)
		if not save_data.is_empty():
			SaveManager.apply_save_data(save_data)
			success = true
	
	if success:
		info_label.text = "Game loaded from Slot %d!" % slot_num
		_log_info("SaveLoad", "Load successful")
		
		# Transition to game scene after a delay
		await get_tree().create_timer(1.5).timeout
		SceneManager.change_scene("res://scenes/World.tscn")
	else:
		info_label.text = "Load failed!"
		_log_error("SaveLoad", "Load failed")

func _on_back_pressed():
	"""Return to main menu"""
	SceneManager.change_scene("res://scenes/MainMenu.tscn")

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

# Options.gd - Game options/settings menu with WoW WotLK styling

@onready var main_panel: Panel = $MainPanel
@onready var category_tabs: HBoxContainer = $MainPanel/CategoryTabs
@onready var settings_container: VBoxContainer = $MainPanel/ScrollContainer/SettingsContainer
@onready var back_button: Button = $MainPanel/BackButton

var ui_theme: Node = null
var current_category: String = "gameplay"
var category_buttons: Dictionary = {}

func _ready():
	_log_info("Options", "Scene initialized")
	
	ui_theme = get_node_or_null("/root/UITheme")
	
	# Apply WoW styling
	_apply_wow_styling()
	
	# Setup category tabs
	_setup_category_tabs()
	
	# Connect signals
	back_button.pressed.connect(_on_back_pressed)
	
	# Initial display
	_update_settings()

func _apply_wow_styling():
	"""Apply WoW WotLK styling to Options UI"""
	if not ui_theme: return
	
	# Style main panel
	if main_panel:
		main_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			ui_theme.COLORS["frame_dark"],
			ui_theme.COLORS["gold_border"],
			2
		))
	
	# Style title
	var title = get_node_or_null("MainPanel/TitleLabel")
	if title:
		title.add_theme_color_override("font_color", Color.GOLD)
		title.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		title.add_theme_constant_override("outline_size", 2)
	
	# Style back button
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

func _setup_category_tabs():
	"""Create category filter tabs (Gameplay, Audio, Video, Controls)"""
	if not category_tabs: return
	
	# Clear existing tabs
	for child in category_tabs.get_children():
		child.queue_free()
	category_buttons.clear()
	
	var categories = ["gameplay", "audio", "video", "controls"]
	var category_names = {
		"gameplay": "GAMEPLAY",
		"audio": "AUDIO",
		"video": "VIDEO",
		"controls": "CONTROLS"
	}
	
	if not ui_theme: return
	
	for category in categories:
		var btn = Button.new()
		btn.custom_minimum_size = Vector2(90, 30)
		btn.text = category_names.get(category, category.to_upper())
		btn.pressed.connect(_on_category_selected.bind(category))
		
		# Style tab button
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
		btn.add_theme_stylebox_override("normal", normal_sb)
		btn.add_theme_stylebox_override("hover", hover_sb)
		btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		btn.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		btn.add_theme_constant_override("outline_size", 1)
		btn.add_theme_font_size_override("font_size", 12)
		
		category_tabs.add_child(btn)
		category_buttons[category] = btn
	
	# Set initial selection (Gameplay)
	_on_category_selected("gameplay")

func _on_category_selected(category: String):
	"""Handle category tab selection"""
	current_category = category
	
	# Update button styles (selected = gold border, others = normal)
	for cat in category_buttons:
		var btn = category_buttons[cat]
		if not btn: continue
		
		if cat == category:
			# Selected category - gold border, brighter background
			if ui_theme:
				var selected_sb = ui_theme.get_stylebox_panel(
					Color(0.2, 0.15, 0.1, 0.95),
					Color.GOLD,
					2
				)
				btn.add_theme_stylebox_override("normal", selected_sb)
				btn.add_theme_color_override("font_color", Color.GOLD)
		else:
			# Unselected category - normal styling
			if ui_theme:
				var normal_sb = ui_theme.get_stylebox_panel(
					ui_theme.COLORS["frame_dark"],
					ui_theme.COLORS["gold_border"],
					1
				)
				btn.add_theme_stylebox_override("normal", normal_sb)
				btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
	
	# Update settings display for selected category
	_update_settings()

func _update_settings():
	"""Update settings display with category filtering"""
	# Clear existing settings
	for child in settings_container.get_children():
		child.queue_free()
	
	# Create settings based on category
	var settings_list = _get_settings_for_category(current_category)
	
	# Create setting cards for each setting
	for setting_entry in settings_list:
		_create_setting_card(setting_entry)

func _get_settings_for_category(category: String) -> Array:
	"""Get settings for a specific category"""
	var settings_list = []
	
	match category:
		"gameplay":
			settings_list = [
				{"name": "Auto-Loot", "description": "Automatically pick up items after combat", "type": "checkbox", "value": true},
				{"name": "Combat Speed", "description": "Speed of combat animations", "type": "slider", "value": 1.0, "min": 0.5, "max": 2.0},
				{"name": "Show Floating Damage", "description": "Display damage numbers during combat", "type": "checkbox", "value": true},
				{"name": "Auto-Pause on Level Up", "description": "Pause game when a hero levels up", "type": "checkbox", "value": false}
			]
		"audio":
			settings_list = [
				{"name": "Master Volume", "description": "Overall game volume", "type": "slider", "value": 0.8, "min": 0.0, "max": 1.0},
				{"name": "Music Volume", "description": "Background music volume", "type": "slider", "value": 0.7, "min": 0.0, "max": 1.0},
				{"name": "SFX Volume", "description": "Sound effects volume", "type": "slider", "value": 0.9, "min": 0.0, "max": 1.0},
				{"name": "Enable Music", "description": "Play background music", "type": "checkbox", "value": true}
			]
		"video":
			settings_list = [
				{"name": "Fullscreen", "description": "Enable fullscreen mode", "type": "checkbox", "value": false},
				{"name": "VSync", "description": "Enable vertical sync", "type": "checkbox", "value": true},
				{"name": "Particle Effects", "description": "Show combat particle effects", "type": "checkbox", "value": true},
				{"name": "UI Scale", "description": "Scale the user interface", "type": "slider", "value": 1.0, "min": 0.8, "max": 1.5}
			]
		"controls":
			settings_list = [
				{"name": "Open Inventory", "description": "Key: I", "type": "keybind", "value": "I"},
				{"name": "Open Character Panel", "description": "Key: C", "type": "keybind", "value": "C"},
				{"name": "Open Spellbook", "description": "Key: K", "type": "keybind", "value": "K"},
				{"name": "Open Map", "description": "Key: M", "type": "keybind", "value": "M"}
			]
	
	return settings_list

func _create_setting_card(setting_entry: Dictionary):
	"""Create a WoW-style setting card panel"""
	var setting_name = setting_entry.get("name", "Unknown")
	var description = setting_entry.get("description", "")
	var setting_type = setting_entry.get("type", "checkbox")
	var value = setting_entry.get("value", false)
	
	# Create setting panel
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(700, 60)
	
	if ui_theme:
		panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			Color(0.1, 0.1, 0.1, 0.8),
			ui_theme.COLORS["gold_border"],
			1
		))
	
	settings_container.add_child(panel)
	
	# Create content container
	var hbox = HBoxContainer.new()
	hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 15)
	hbox.add_theme_constant_override("offset_left", 15)
	hbox.add_theme_constant_override("offset_top", 8)
	hbox.add_theme_constant_override("offset_right", -15)
	hbox.add_theme_constant_override("offset_bottom", -8)
	panel.add_child(hbox)
	
	# Setting info (name, description)
	var vbox_info = VBoxContainer.new()
	vbox_info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox_info.add_theme_constant_override("separation", 5)
	hbox.add_child(vbox_info)
	
	# Name label
	var name_label = Label.new()
	name_label.text = setting_name
	name_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	name_label.add_theme_constant_override("outline_size", 1)
	vbox_info.add_child(name_label)
	
	# Description label
	var desc_label = Label.new()
	desc_label.text = description
	desc_label.add_theme_color_override("font_color", Color(0.75, 0.75, 0.75))
	desc_label.add_theme_font_size_override("font_size", 12)
	vbox_info.add_child(desc_label)
	
	# Setting control (checkbox, slider, etc.)
	var control: Control = null
	
	match setting_type:
		"checkbox":
			var checkbox = CheckBox.new()
			checkbox.button_pressed = value
			# Style checkbox
			checkbox.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
			control = checkbox
		"slider":
			var slider = HSlider.new()
			var min_val = setting_entry.get("min", 0.0)
			var max_val = setting_entry.get("max", 1.0)
			slider.min_value = min_val
			slider.max_value = max_val
			slider.value = value
			slider.custom_minimum_size = Vector2(150, 20)
			control = slider
		"keybind":
			var keybind_btn = Button.new()
			keybind_btn.text = str(value)
			keybind_btn.custom_minimum_size = Vector2(80, 30)
			if ui_theme:
				var normal_sb = ui_theme.get_stylebox_panel(
					ui_theme.COLORS["frame_dark"],
					ui_theme.COLORS["gold_border"],
					1
				)
				keybind_btn.add_theme_stylebox_override("normal", normal_sb)
			keybind_btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
			control = keybind_btn
	
	if control:
		control.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		hbox.add_child(control)

func _on_back_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm:
		var is_in_game = sm.has_method("get_is_in_game") and sm.get_is_in_game() if sm.has_method("get_is_in_game") else false
		if is_in_game or sm.has_method("is_in_game") and sm.is_in_game:
			sm.change_scene("res://scenes/World.tscn")
		else:
			sm.change_scene("res://scenes/MainMenu.tscn")

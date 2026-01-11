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

# Statistics.gd - Game statistics display with WoW WotLK styling

@onready var main_panel: Panel = $MainPanel
@onready var category_tabs: HBoxContainer = $MainPanel/CategoryTabs
@onready var stats_container: VBoxContainer = $MainPanel/ScrollContainer/StatsContainer
@onready var back_button: Button = $MainPanel/BackButton

var ui_theme: Node = null
var current_category: String = "combat"
var category_buttons: Dictionary = {}

func _ready():
	_log_info("Statistics", "Scene initialized")
	
	ui_theme = get_node_or_null("/root/UITheme")
	
	# Apply WoW styling
	_apply_wow_styling()
	
	# Setup category tabs
	_setup_category_tabs()
	
	# Connect signals
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
	
	# Initial display
	_update_stats()

func _apply_wow_styling():
	"""Apply WoW WotLK styling to Statistics UI"""
	if not ui_theme: return
	
	# Style main panel
	if main_panel:
		main_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			ui_theme.COLORS["frame_dark"],
			ui_theme.COLORS["gold_border"],
			2
		))
	
	# Style title
	var title = get_node_or_null("MainPanel/Title")
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
	"""Create category filter tabs (Combat, Progression, Collection, World, Time)"""
	if not category_tabs: return
	
	# Clear existing tabs
	for child in category_tabs.get_children():
		child.queue_free()
	category_buttons.clear()
	
	var categories = ["combat", "progression", "collection", "world", "time"]
	var category_names = {
		"combat": "COMBAT",
		"progression": "PROGRESSION",
		"collection": "COLLECTION",
		"world": "WORLD",
		"time": "TIME"
	}
	
	if not ui_theme: return
	
	for category in categories:
		var btn = Button.new()
		btn.custom_minimum_size = Vector2(100, 30)
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
	
	# Set initial selection (Combat)
	_on_category_selected("combat")

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
	
	# Update stats display for selected category
	_update_stats()

func _update_stats():
	"""Update statistics display with category filtering"""
	# Clear existing stat cards
	for child in stats_container.get_children():
		child.queue_free()
	
	var stm = get_node_or_null("/root/StatisticsManager")
	if not stm: return
	
	# Get stats based on category
	var stats_to_display = _get_stats_for_category(current_category, stm)
	
	# Create stat cards for each stat
	for stat_entry in stats_to_display:
		_create_stat_card(stat_entry)

func _get_stats_for_category(category: String, stm: Node) -> Array:
	"""Get stats for a specific category"""
	var stats_list = []
	
	match category:
		"combat":
			stats_list = [
				{"name": "Enemies Defeated", "value": stm.get_stat("combat", "enemiesDefeated"), "icon": "⚔"},
				{"name": "Combats Won", "value": stm.get_stat("combat", "combatsWon"), "icon": "✓"},
				{"name": "Combats Lost", "value": stm.get_stat("combat", "combatsLost"), "icon": "✗"},
				{"name": "Damage Dealt", "value": stm.get_stat("combat", "totalDamageDealt"), "icon": "⚡"},
				{"name": "Damage Taken", "value": stm.get_stat("combat", "totalDamageTaken"), "icon": "🛡"},
				{"name": "Critical Hits", "value": stm.get_stat("combat", "criticalHits"), "icon": "💥"},
				{"name": "Total Hits", "value": stm.get_stat("combat", "totalHits"), "icon": "🎯"},
				{"name": "Misses", "value": stm.get_stat("combat", "misses"), "icon": "❌"}
			]
		"progression":
			stats_list = [
				{"name": "Levels Gained", "value": stm.get_stat("progression", "levelsGained"), "icon": "⬆"},
				{"name": "Current Level", "value": stm.get_stat("progression", "currentLevel"), "icon": "⭐"},
				{"name": "Max Level Reached", "value": stm.get_stat("progression", "maxLevelReached"), "icon": "🌟"},
				{"name": "Total Experience", "value": stm.get_stat("progression", "totalExperience"), "icon": "📊"},
				{"name": "Segments Visited", "value": stm.get_stat("progression", "segmentsVisited"), "icon": "🗺"},
				{"name": "Distance Traveled", "value": stm.get_stat("progression", "distanceTraveled"), "icon": "👣"}
			]
		"collection":
			stats_list = [
				{"name": "Items Found", "value": stm.get_stat("collection", "itemsFound"), "icon": "📦"},
				{"name": "Items Equipped", "value": stm.get_stat("collection", "itemsEquipped"), "icon": "🎒"},
				{"name": "Gold Earned", "value": stm.get_stat("collection", "goldEarned"), "icon": "💰"},
				{"name": "Gold Spent", "value": stm.get_stat("collection", "goldSpent"), "icon": "💸"},
				{"name": "Legendary Items Found", "value": stm.get_stat("collection", "legendaryItemsFound"), "icon": "✨"},
				{"name": "Unique Items Found", "value": stm.get_stat("collection", "uniqueItemsFound") if stm.get_stat("collection", "uniqueItemsFound") is Array else 0, "icon": "💎"}
			]
			if stats_list[5]["value"] is Array:
				stats_list[5]["value"] = stats_list[5]["value"].size()
		"world":
			stats_list = [
				{"name": "Encounters Triggered", "value": stm.get_stat("world", "encountersTriggered"), "icon": "⚔"},
				{"name": "Shops Visited", "value": stm.get_stat("world", "shopsVisited"), "icon": "🏪"},
				{"name": "Treasures Found", "value": stm.get_stat("world", "treasuresFound"), "icon": "💎"},
				{"name": "Quests Completed", "value": stm.get_stat("world", "questsCompleted"), "icon": "📜"}
			]
		"time":
			var total_play_time = stm.get_stat("time", "totalPlayTime") / 1000.0  # Convert to seconds
			var session_start = stm.get_stat("time", "sessionStartTime")
			var now = Time.get_ticks_msec()
			var current_session = (now - session_start) / 1000.0
			total_play_time += current_session
			
			var hours = int(total_play_time / 3600)
			var minutes = int((total_play_time - hours * 3600) / 60)
			var seconds = int(total_play_time - hours * 3600 - minutes * 60)
			
			var longest_session = stm.get_stat("time", "longestSession") / 1000.0
			var longest_hours = int(longest_session / 3600)
			var longest_minutes = int((longest_session - longest_hours * 3600) / 60)
			
			stats_list = [
				{"name": "Total Play Time", "value": "%d:%02d:%02d" % [hours, minutes, seconds], "icon": "⏱", "is_time": true},
				{"name": "Current Session", "value": "%d:%02d" % [int(current_session / 60), int(current_session) % 60], "icon": "⏰", "is_time": true},
				{"name": "Longest Session", "value": "%d:%02d" % [longest_hours, longest_minutes], "icon": "⏳", "is_time": true},
				{"name": "Sessions Count", "value": stm.get_stat("time", "sessionsCount"), "icon": "📅"}
			]
	
	return stats_list

func _create_stat_card(stat_entry: Dictionary):
	"""Create a WoW-style stat card panel"""
	var stat_name = stat_entry.get("name", "Unknown")
	var stat_value = stat_entry.get("value", 0)
	var stat_icon = stat_entry.get("icon", "•")
	var is_time = stat_entry.get("is_time", false)
	
	# Create stat panel
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(800, 50)
	
	if ui_theme:
		panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			Color(0.1, 0.1, 0.1, 0.8),
			ui_theme.COLORS["gold_border"],
			1
		))
	
	stats_container.add_child(panel)
	
	# Create content container
	var hbox = HBoxContainer.new()
	hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 15)
	hbox.add_theme_constant_override("offset_left", 15)
	hbox.add_theme_constant_override("offset_top", 8)
	hbox.add_theme_constant_override("offset_right", -15)
	hbox.add_theme_constant_override("offset_bottom", -8)
	panel.add_child(hbox)
	
	# Icon label
	var icon_label = Label.new()
	icon_label.custom_minimum_size = Vector2(40, 40)
	icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	icon_label.text = stat_icon
	icon_label.add_theme_font_size_override("font_size", 24)
	icon_label.add_theme_color_override("font_color", Color.GOLD)
	hbox.add_child(icon_label)
	
	# Stat name label
	var name_label = Label.new()
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name_label.text = stat_name
	name_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	name_label.add_theme_constant_override("outline_size", 1)
	hbox.add_child(name_label)
	
	# Stat value label
	var value_label = Label.new()
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	if is_time:
		value_label.text = str(stat_value)
	else:
		value_label.text = _format_number(stat_value)
	value_label.add_theme_color_override("font_color", Color.GOLD)
	value_label.add_theme_font_size_override("font_size", 18)
	value_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	value_label.add_theme_constant_override("outline_size", 1)
	hbox.add_child(value_label)

func _format_number(value) -> String:
	"""Format number with commas for readability"""
	if value is int or value is float:
		var str_value = str(int(value))
		var formatted = ""
		var count = 0
		for i in range(str_value.length() - 1, -1, -1):
			if count > 0 and count % 3 == 0:
				formatted = "," + formatted
			formatted = str_value[i] + formatted
			count += 1
		return formatted
	return str(value)

func _on_back_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm:
		var is_in_game = sm.has_method("get_is_in_game") and sm.get_is_in_game() if sm.has_method("get_is_in_game") else false
		if is_in_game or sm.has_method("is_in_game") and sm.is_in_game:
			sm.change_scene("res://scenes/World.tscn")
		else:
			sm.change_scene("res://scenes/MainMenu.tscn")

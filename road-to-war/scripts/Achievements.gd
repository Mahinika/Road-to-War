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

# Achievements.gd - Achievements display with WoW WotLK styling

@onready var main_panel: Panel = $MainPanel
@onready var category_tabs: HBoxContainer = $MainPanel/CategoryTabs
@onready var achievements_scroll: ScrollContainer = $MainPanel/ScrollContainer
@onready var achievements_container: VBoxContainer = $MainPanel/ScrollContainer/AchievementsContainer
@onready var stats_label: RichTextLabel = $MainPanel/StatsPanel/StatsLabel
@onready var back_button: Button = $MainPanel/BackButton

var ui_theme: Node = null
var current_category: String = "all"
var category_buttons: Dictionary = {}

func _ready():
	_log_info("Achievements", "Scene initialized")
	
	ui_theme = get_node_or_null("/root/UITheme")
	
	# Apply WoW styling
	_apply_wow_styling()
	
	# Setup category tabs
	_setup_category_tabs()
	
	# Connect signals
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
	
	# Connect to achievement manager signals
	var am = get_node_or_null("/root/AchievementManager")
	if am:
		if not am.achievement_unlocked.is_connected(_on_achievement_unlocked):
			am.achievement_unlocked.connect(_on_achievement_unlocked)
	
	# Initial display
	_update_achievements()

func _apply_wow_styling():
	"""Apply WoW WotLK styling to Achievement UI"""
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
	
	# Style stats panel
	var stats_panel = get_node_or_null("MainPanel/StatsPanel")
	if stats_panel and ui_theme:
		stats_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			Color(0.05, 0.05, 0.05, 0.9),
			ui_theme.COLORS["gold_border"],
			1
		))
	
	if stats_label:
		stats_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		stats_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		stats_label.add_theme_constant_override("outline_size", 1)
		stats_label.add_theme_font_size_override("font_size", 14)
	
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
	"""Create category filter tabs (ALL, Combat, Progression, Collection, World, Endgame)"""
	if not category_tabs: return
	
	# Clear existing tabs
	for child in category_tabs.get_children():
		child.queue_free()
	category_buttons.clear()
	
	var categories = ["all", "combat", "progression", "collection", "world", "endgame"]
	var category_names = {
		"all": "ALL",
		"combat": "COMBAT",
		"progression": "PROGRESSION",
		"collection": "COLLECTION",
		"world": "WORLD",
		"endgame": "ENDGAME"
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
	
	# Set initial selection (ALL)
	_on_category_selected("all")

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
	
	# Update achievement display for selected category
	_update_achievements()

func _update_achievements():
	"""Update achievements display with category filtering"""
	# Clear existing achievement cards
	for child in achievements_container.get_children():
		child.queue_free()
	
	var am = get_node_or_null("/root/AchievementManager")
	var dm = get_node_or_null("/root/DataManager")
	if not am or not dm: return
	
	# Get all achievements data
	var achievements_data = am.get_all_achievements()
	var achievements_json = dm.get_data("achievements")
	if not achievements_json or not achievements_json.has("achievements"):
		return
	
	# Get statistics for progress tracking
	var stm = get_node_or_null("/root/StatisticsManager")
	
	# Filter by category
	var filtered_achievements = []
	for ach_json in achievements_json["achievements"]:
		var ach_category = ach_json.get("category", "combat")
		if current_category == "all" or ach_category == current_category:
			var achievement_id = ach_json.get("id", "")
			var achievement_data = achievements_data.get(achievement_id, {})
			if achievement_data.is_empty():
				achievement_data = {
					"unlocked": false,
					"progress": 0.0,
					"unlocked_at": 0
				}
			
			# Get current progress for locked achievements
			var current_progress = _get_achievement_progress(achievement_id, stm, ach_json)
			achievement_data["current_progress"] = current_progress
			achievement_data["requirement"] = ach_json.get("requirement", 0)
			achievement_data["category"] = ach_category
			achievement_data["reward"] = ach_json.get("reward", {})
			
			filtered_achievements.append({
				"id": achievement_id,
				"data": achievement_data,
				"json": ach_json
			})
	
	# Sort: unlocked first, then by progress (descending)
	filtered_achievements.sort_custom(_sort_achievements)
	
	# Create achievement cards
	for achievement_entry in filtered_achievements:
		_create_achievement_card(achievement_entry)
	
	# Update stats display
	_update_stats_display()

func _sort_achievements(a: Dictionary, b: Dictionary) -> bool:
	"""Sort achievements: unlocked first, then by progress (highest first)"""
	var a_unlocked = a.data.get("unlocked", false)
	var b_unlocked = b.data.get("unlocked", false)
	
	if a_unlocked != b_unlocked:
		return a_unlocked  # Unlocked first
	
	# Both same unlocked status, sort by progress (descending)
	var a_progress = a.data.get("current_progress", 0.0)
	var b_progress = b.data.get("current_progress", 0.0)
	return a_progress > b_progress

func _get_achievement_progress(achievement_id: String, stm: Node, ach_json: Dictionary) -> float:
	"""Get current progress for an achievement"""
	if not stm: return 0.0
	
	var requirement = ach_json.get("requirement", 0)
	
	# Map achievement IDs to stats
	match achievement_id:
		"defeat_10_enemies", "defeat_100_enemies", "defeat_1000_enemies":
			return float(stm.get_stat("combat", "enemiesDefeated")) if stm.has_method("get_stat") else 0.0
		"win_10_combats", "win_100_combats":
			return float(stm.get_stat("combat", "combatsWon")) if stm.has_method("get_stat") else 0.0
		"critical_hit_10", "critical_hit_100":
			return float(stm.get_stat("combat", "criticalHits")) if stm.has_method("get_stat") else 0.0
		"reach_level_5", "reach_level_10", "reach_level_20", "reach_level_50", "reach_level_100":
			var pm = get_node_or_null("/root/PartyManager")
			if pm and pm.heroes.size() > 0:
				var max_level = 0
				for hero in pm.heroes:
					max_level = max(max_level, hero.level)
				return float(max_level)
			return 0.0
		"reach_mile_100":
			var wm = get_node_or_null("/root/WorldManager")
			return float(wm.current_mile) if wm else 0.0
		"collect_10_items", "collect_50_items", "collect_100_items":
			return float(stm.get_stat("collection", "itemsCollected")) if stm.has_method("get_stat") else 0.0
		"earn_1000_gold", "earn_10000_gold":
			return float(stm.get_stat("collection", "goldEarned")) if stm.has_method("get_stat") else 0.0
		_:
			# Default: check if unlocked
			var am = get_node_or_null("/root/AchievementManager")
			if am and am.is_unlocked(achievement_id):
				return float(requirement)
			return 0.0

func _create_achievement_card(achievement_entry: Dictionary):
	"""Create a WoW-style achievement card panel"""
	var achievement_id = achievement_entry.get("id", "")
	var achievement_data = achievement_entry.get("data", {})
	var ach_json = achievement_entry.get("json", {})
	
	var is_unlocked = achievement_data.get("unlocked", false)
	var current_progress = achievement_data.get("current_progress", 0.0)
	var requirement = achievement_data.get("requirement", 0)
	var achievement_name = ach_json.get("name", achievement_id)
	var description = ach_json.get("description", "")
	var reward = achievement_data.get("reward", {})
	
	# Create achievement panel
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(540, 80)
	
	# Determine colors based on unlocked status
	var bg_color: Color
	var border_color: Color
	var border_width: int
	
	if is_unlocked:
		bg_color = Color(0.1, 0.3, 0.1, 0.9)  # Dark green background
		border_color = Color.GREEN
		border_width = 2
	else:
		bg_color = ui_theme.COLORS["frame_dark"] if ui_theme else Color(0.1, 0.1, 0.1, 0.8)
		border_color = ui_theme.COLORS["gold_border"] if ui_theme else Color(0.8, 0.7, 0.4)
		border_width = 1
	
	if ui_theme:
		panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(bg_color, border_color, border_width))
	
	achievements_container.add_child(panel)
	
	# Create content container
	var hbox = HBoxContainer.new()
	hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 15)
	hbox.add_theme_constant_override("offset_left", 12)
	hbox.add_theme_constant_override("offset_top", 8)
	hbox.add_theme_constant_override("offset_right", -12)
	hbox.add_theme_constant_override("offset_bottom", -8)
	panel.add_child(hbox)
	
	# Status indicator (checkmark or X)
	var status_label = Label.new()
	status_label.custom_minimum_size = Vector2(30, 30)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	if is_unlocked:
		status_label.text = "✓"
		status_label.add_theme_color_override("font_color", Color.GREEN)
	else:
		status_label.text = "○"
		status_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
	status_label.add_theme_font_size_override("font_size", 20)
	status_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	status_label.add_theme_constant_override("outline_size", 1)
	hbox.add_child(status_label)
	
	# Achievement info (name, description, progress)
	var vbox_info = VBoxContainer.new()
	vbox_info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox_info.add_theme_constant_override("separation", 5)
	hbox.add_child(vbox_info)
	
	# Name label
	var name_label = Label.new()
	if is_unlocked:
		name_label.add_theme_color_override("font_color", Color.GREEN)
	else:
		name_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
	name_label.add_theme_font_size_override("font_size", 15)
	name_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	name_label.add_theme_constant_override("outline_size", 1)
	name_label.text = achievement_name
	vbox_info.add_child(name_label)
	
	# Description label
	var desc_label = Label.new()
	desc_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	desc_label.add_theme_font_size_override("font_size", 12)
	desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc_label.text = description
	vbox_info.add_child(desc_label)
	
	# Progress bar for locked achievements
	if not is_unlocked and requirement > 0:
		var progress_container = HBoxContainer.new()
		progress_container.add_theme_constant_override("separation", 10)
		vbox_info.add_child(progress_container)
		
		# Progress bar
		var progress_bar = ProgressBar.new()
		progress_bar.custom_minimum_size = Vector2(200, 18)
		progress_bar.min_value = 0
		progress_bar.max_value = requirement
		progress_bar.value = min(current_progress, requirement)
		progress_bar.show_percentage = false
		progress_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		
		# Style progress bar
		if ui_theme:
			var fill_color = Color.GOLD if current_progress > 0 else Color(0.3, 0.3, 0.3)
			progress_bar.add_theme_stylebox_override("fill", ui_theme.get_stylebox_bar(fill_color))
			progress_bar.add_theme_stylebox_override("background", ui_theme.get_stylebox_panel(
				Color(0.05, 0.05, 0.05, 0.9),
				Color(0.3, 0.3, 0.3),
				1
			))
		
		progress_container.add_child(progress_bar)
		
		# Progress text (X / Y)
		var progress_text = Label.new()
		progress_text.text = "%d / %d" % [int(current_progress), requirement]
		progress_text.add_theme_color_override("font_color", Color(0.8, 0.8, 0.6))
		progress_text.add_theme_font_size_override("font_size", 11)
		progress_text.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		progress_text.add_theme_constant_override("outline_size", 1)
		progress_container.add_child(progress_text)
	
	# Reward info (right side)
	var reward_label = Label.new()
	var reward_text = ""
	if reward.has("gold"):
		reward_text += "[color=#FFD700]%dg[/color] " % reward.get("gold", 0)
	if reward.has("experience"):
		reward_text += "[color=#00FF00]+%d XP[/color] " % reward.get("experience", 0)
	if reward.has("talentPoints"):
		reward_text += "[color=#00BFFF]+%d TP[/color] " % reward.get("talentPoints", 0)
	if reward.has("prestigePoints"):
		reward_text += "[color=#FFA500]+%d PP[/color]" % reward.get("prestigePoints", 0)
	
	if reward_text != "":
		reward_label.text = reward_text.strip_edges()
		reward_label.add_theme_font_size_override("font_size", 11)
		reward_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		reward_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		reward_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		
		# Use RichTextLabel for color coding if available
		var reward_rich = RichTextLabel.new()
		reward_rich.bbcode_enabled = true
		reward_rich.text = reward_text.strip_edges()
		reward_rich.fit_content = true
		reward_rich.scroll_active = false
		reward_rich.add_theme_font_size_override("normal_font_size", 11)
		reward_rich.add_theme_color_override("default_color", Color.WHITE)
		reward_rich.custom_minimum_size = Vector2(120, 40)
		reward_rich.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		hbox.add_child(reward_rich)
	else:
		reward_label.text = ""
		hbox.add_child(reward_label)

func _update_stats_display():
	"""Update statistics display showing unlocked count"""
	var am = get_node_or_null("/root/AchievementManager")
	var dm = get_node_or_null("/root/DataManager")
	if not am or not dm: return
	
	var achievements_json = dm.get_data("achievements")
	if not achievements_json or not achievements_json.has("achievements"):
		return
	
	# Count unlocked in current category
	var total_in_category = 0
	var unlocked_in_category = 0
	
	for ach_json in achievements_json["achievements"]:
		var category = ach_json.get("category", "combat")
		if current_category == "all" or category == current_category:
			total_in_category += 1
			var achievement_id = ach_json.get("id", "")
			if am.is_unlocked(achievement_id):
				unlocked_in_category += 1
	
	# Total unlocked across all categories
	var total_unlocked = am.get_unlocked_count()
	var total_achievements = achievements_json["achievements"].size()
	
	if stats_label:
		var stats_text = "[color=#FFD700]Category: %d/%d[/color]\n" % [unlocked_in_category, total_in_category]
		stats_text += "[color=#FFD700]Total: %d/%d[/color]" % [total_unlocked, total_achievements]
		stats_label.bbcode_enabled = true
		stats_label.text = stats_text

func _on_achievement_unlocked(_achievement_id: String, achievement_name: String, _description: String):
	"""Handle achievement unlock notification"""
	# Show floating notification
	var pm = get_node_or_null("/root/ParticleManager")
	if pm:
		var viewport_size = get_viewport().get_visible_rect().size
		var notification_pos = Vector2(viewport_size.x * 0.5, viewport_size.y * 0.2)
		pm.create_floating_text(notification_pos, "ACHIEVEMENT UNLOCKED: %s!" % achievement_name, Color.GOLD)
	
	# Refresh display if achievements scene is visible
	if visible:
		_update_achievements()

func _on_back_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm:
		var is_in_game = sm.has_method("get_is_in_game") and sm.get_is_in_game() if sm.has_method("get_is_in_game") else false
		if is_in_game or sm.has_method("is_in_game") and sm.is_in_game:
			sm.change_scene("res://scenes/World.tscn")
		else:
			sm.change_scene("res://scenes/MainMenu.tscn")

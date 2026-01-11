extends Control

# QuestTracker.gd - WoW WotLK-style quest tracker UI
# Displays active quests on the right side of the screen

@onready var quest_container: VBoxContainer = $QuestPanel/ScrollContainer/QuestContainer
@onready var quest_panel: Panel = $QuestPanel

var quest_manager: Node = null
var data_manager: Node = null
var ui_theme: Node = null
var ui_builder: Node = null

# Track quest UI elements by quest_id
var quest_ui_elements: Dictionary = {} # quest_id -> {panel, name_label, progress_label, objective_labels}

func _ready():
	quest_manager = get_node_or_null("/root/QuestManager")
	data_manager = get_node_or_null("/root/DataManager")
	ui_theme = get_node_or_null("/root/UITheme")
	ui_builder = get_node_or_null("/root/UIBuilder")
	
	# Apply WoW WotLK styling
	_apply_wow_styling()
	
	# Wait for managers to be ready before connecting signals
	# Use call_deferred to ensure all Autoloads are initialized
	call_deferred("_initialize_quest_tracker")

func _initialize_quest_tracker():
	# Connect to QuestManager signals
	if quest_manager:
		if quest_manager.has_signal("quest_progress_updated") and not quest_manager.quest_progress_updated.is_connected(_on_quest_progress_updated):
			quest_manager.quest_progress_updated.connect(_on_quest_progress_updated)
		if quest_manager.has_signal("quest_completed") and not quest_manager.quest_completed.is_connected(_on_quest_completed):
			quest_manager.quest_completed.connect(_on_quest_completed)
		if quest_manager.has_signal("quests_loaded") and not quest_manager.quests_loaded.is_connected(_on_quests_loaded):
			quest_manager.quests_loaded.connect(_on_quests_loaded)
	
	# Initial quest display (deferred to ensure QuestManager has loaded quests)
	call_deferred("refresh_quest_display")

func _on_quests_loaded():
	# Refresh display when quests are initially loaded
	refresh_quest_display()

func _apply_wow_styling():
	# Style the main quest panel
	if quest_panel and ui_theme:
		quest_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			Color(0.05, 0.05, 0.05, 0.85),  # Semi-transparent dark
			ui_theme.COLORS["gold_border"],
			2
		))

func refresh_quest_display():
	# Clear existing quest UI
	_clear_quest_ui()
	
	if not quest_manager or not data_manager:
		return
	
	# Get active quests from QuestManager
	var player_quests = quest_manager.player_quests
	if player_quests.is_empty():
		# Hide tracker if no active quests
		visible = false
		return
	
	# Get quest data from DataManager
	var quest_data = data_manager.get_data("quests")
	if not quest_data:
		return
	
	var active_quests = quest_data.get("active_quests", {})
	
	# Display each active quest
	for quest_id in player_quests:
		if player_quests[quest_id].completed:
			continue  # Skip completed quests
		
		var quest_info = player_quests[quest_id]
		var quest_def = active_quests.get(quest_id, {})
		
		if quest_def.is_empty():
			continue
		
		_create_quest_entry(quest_id, quest_def, quest_info)
	
	# Show tracker if we have quests
	visible = quest_container.get_child_count() > 0

func _clear_quest_ui():
	# Clear all quest UI elements
	for child in quest_container.get_children():
		child.queue_free()
	quest_ui_elements.clear()

func _create_quest_entry(quest_id: String, quest_def: Dictionary, quest_info: Dictionary):
	# Create quest entry panel
	var quest_panel_instance = Panel.new()
	quest_panel_instance.custom_minimum_size = Vector2(260, 0)  # Auto-height
	quest_panel_instance.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	quest_container.add_child(quest_panel_instance)
	
	# Apply WoW-style styling to quest panel
	if ui_theme:
		quest_panel_instance.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			Color(0.08, 0.08, 0.12, 0.9),  # Slightly lighter than background
			ui_theme.COLORS["gold_border"],
			1
		))
	
	# Create margin container for padding
	var margin_container = MarginContainer.new()
	margin_container.add_theme_constant_override("margin_left", 8)
	margin_container.add_theme_constant_override("margin_top", 8)
	margin_container.add_theme_constant_override("margin_right", 8)
	margin_container.add_theme_constant_override("margin_bottom", 8)
	quest_panel_instance.add_child(margin_container)
	
	# Create vertical container for quest content
	var quest_content = VBoxContainer.new()
	quest_content.add_theme_constant_override("separation", 4)
	margin_container.add_child(quest_content)
	
	# Quest name (bold, colored by quest type)
	var quest_name_label = Label.new()
	quest_name_label.text = quest_def.get("name", "Unknown Quest")
	quest_name_label.add_theme_color_override("font_color", ui_theme.COLORS["gold"] if ui_theme else Color.GOLD)
	quest_name_label.add_theme_font_size_override("font_size", 14)
	quest_name_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	quest_name_label.add_theme_constant_override("outline_size", 1)
	quest_content.add_child(quest_name_label)
	
	# Quest description
	var quest_desc_label = Label.new()
	quest_desc_label.text = quest_def.get("description", "")
	quest_desc_label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	quest_desc_label.add_theme_font_size_override("font_size", 11)
	quest_desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	quest_desc_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	quest_desc_label.add_theme_constant_override("outline_size", 1)
	quest_content.add_child(quest_desc_label)
	
	# Quest progress
	var quest_type = quest_def.get("type", "")
	var current = quest_info.get("current", 0)
	var target = 1
	
	if quest_type == "kill":
		target = quest_def.get("target_count", 1)
	elif quest_type == "reach_mile":
		target = quest_def.get("target_mile", 1)
		current = quest_info.get("current", 0)
	
	# Progress container with progress bar and text
	var progress_container = HBoxContainer.new()
	progress_container.add_theme_constant_override("separation", 8)
	quest_content.add_child(progress_container)
	
	# Progress bar for visual feedback
	var progress_bar = ProgressBar.new()
	progress_bar.custom_minimum_size = Vector2(150, 14)
	progress_bar.min_value = 0
	progress_bar.max_value = target
	progress_bar.value = min(current, target)
	progress_bar.show_percentage = false
	progress_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	
	# Style progress bar with WoW aesthetic
	if ui_theme:
		var fill_color = Color.GREEN if current >= target else ui_theme.COLORS["gold"]
		progress_bar.add_theme_stylebox_override("fill", ui_theme.get_stylebox_bar(fill_color))
		# Add dark background for progress bar
		var bg_sb = StyleBoxFlat.new()
		bg_sb.bg_color = Color(0.1, 0.1, 0.1, 0.9)
		bg_sb.border_width_left = 1
		bg_sb.border_width_top = 1
		bg_sb.border_width_right = 1
		bg_sb.border_width_bottom = 1
		bg_sb.border_color = Color(0, 0, 0, 0.8)
		bg_sb.corner_radius_top_left = 2
		bg_sb.corner_radius_bottom_left = 2
		progress_bar.add_theme_stylebox_override("background", bg_sb)
	
	progress_container.add_child(progress_bar)
	
	# Progress text label with X/Y format (use RichTextLabel for BBCode support)
	var progress_label = RichTextLabel.new()
	var progress_text = "%d / %d" % [current, target]
	if current >= target:
		progress_text = "[color=#00ff00]%s[/color]" % progress_text  # Green when complete
	else:
		progress_text = "[color=#ffd700]%s[/color]" % progress_text  # Gold when in progress
	
	progress_label.bbcode_enabled = true
	progress_label.text = progress_text
	progress_label.fit_content = true
	progress_label.scroll_active = false
	progress_label.custom_minimum_size = Vector2(60, 14)
	progress_label.add_theme_font_size_override("normal_font_size", 11)
	progress_label.add_theme_color_override("default_color", Color.WHITE)
	progress_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	progress_container.add_child(progress_label)
	
	# Store quest UI elements for updates
	quest_ui_elements[quest_id] = {
		"panel": quest_panel_instance,
		"name_label": quest_name_label,
		"progress_label": progress_label,
		"progress_bar": progress_bar,
		"quest_type": quest_type,
		"target": target
	}

func _on_quest_progress_updated(quest_id: String, current: int, target: int):
	# Update quest progress display
	if not quest_ui_elements.has(quest_id):
		# Quest not in UI yet, refresh display
		refresh_quest_display()
		return
	
	var quest_ui = quest_ui_elements[quest_id]
	var progress_label = quest_ui.get("progress_label")
	var progress_bar = quest_ui.get("progress_bar")
	
	# Update progress bar
	if progress_bar and progress_bar is ProgressBar:
		progress_bar.max_value = target
		progress_bar.value = min(current, target)
		# Update progress bar color
		if ui_theme:
			var fill_color = Color.GREEN if current >= target else ui_theme.COLORS["gold"]
			progress_bar.add_theme_stylebox_override("fill", ui_theme.get_stylebox_bar(fill_color))
	
	# Update progress text
	if progress_label and progress_label is RichTextLabel:
		var progress_text = "%d / %d" % [current, target]
		if current >= target:
			progress_text = "[color=#00ff00]%s[/color]" % progress_text  # Green when complete
		else:
			progress_text = "[color=#ffd700]%s[/color]" % progress_text  # Gold when in progress
		
		progress_label.text = progress_text

func _on_quest_completed(quest_id: String):
	# Remove completed quest from display
	if quest_ui_elements.has(quest_id):
		var quest_ui = quest_ui_elements[quest_id]
		var panel = quest_ui.get("panel")
		if panel:
			panel.queue_free()
		quest_ui_elements.erase(quest_id)
	
	# Refresh display to update visibility
	call_deferred("refresh_quest_display")
	
	# Visual feedback for quest completion is handled by QuestManager via ParticleManager

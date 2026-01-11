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

# Prestige.gd - Prestige system menu

@onready var prestige_label: RichTextLabel = $MainPanel/StatsPanel/PrestigeLabel
@onready var prestige_progress: ProgressBar = $MainPanel/StatsPanel/PrestigeProgress
@onready var upgrade_grid: GridContainer = $MainPanel/ScrollContainer/UpgradeGrid
@onready var prestige_button: Button = $MainPanel/PrestigeButton
@onready var back_button: Button = $MainPanel/BackButton

# Tooltip system
var tooltip_panel: Panel = null
var tooltip_label: RichTextLabel = null
var current_tooltip_upgrade: Dictionary = {}

func _ready():
	_log_info("Prestige", "Scene initialized")

	var ut = get_node_or_null("/root/UITheme")
	if not ut: return

	# Apply WoW Style
	$MainPanel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame"], ut.COLORS["gold_border"], 2))
	$MainPanel/StatsPanel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold_border"], 1))

	prestige_button.add_theme_stylebox_override("normal", ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold"], 2))
	back_button.add_theme_stylebox_override("normal", ut.get_stylebox_panel(ut.COLORS["frame"], ut.COLORS["gold_border"], 1))

	# Style progress bar
	if prestige_progress:
		prestige_progress.add_theme_stylebox_override("fill", ut.get_stylebox_panel(Color(0.8, 0.6, 0.2, 0.8), Color.GOLD, 1))
		prestige_progress.add_theme_stylebox_override("background", ut.get_stylebox_panel(Color(0.2, 0.2, 0.2, 0.5), Color(0.5, 0.5, 0.5), 1))

	prestige_button.pressed.connect(_on_prestige_pressed)
	back_button.pressed.connect(_on_back_pressed)

	# Create tooltip system
	_create_tooltip_panel()

	_populate_upgrades()
	_update_display()

func _populate_upgrades():
	for child in upgrade_grid.get_children():
		child.queue_free()
		
	var prem = get_node_or_null("/root/PrestigeManager")
	var ut = get_node_or_null("/root/UITheme")
	
	if not prem or not ut: return
	
	# Get all upgrades with their status
	var all_upgrades = prem.get_all_upgrades()
	
	for up_data in all_upgrades:
		var up_id = up_data.get("id", "")
		if up_id == "":
			continue
		
		var is_purchased = up_data.get("purchased", false)
		var can_afford = up_data.get("can_afford", false)
		var cost = up_data.get("cost", 0)
		var upgrade_name = up_data.get("name", "Unknown")
		var description = up_data.get("description", "")
		
		# Create upgrade panel with WoW styling
		var panel = Panel.new()
		panel.custom_minimum_size = Vector2(280, 120)
		
		# Determine colors based on state
		var bg_color: Color
		var border_color: Color
		var border_width: int
		
		if is_purchased:
			bg_color = Color(0.1, 0.3, 0.1, 0.9)  # Dark green background
			border_color = Color.GREEN
			border_width = 2
		elif can_afford:
			bg_color = ut.COLORS["frame_dark"]
			border_color = ut.COLORS["gold"]
			border_width = 2
		else:
			bg_color = Color(0.1, 0.1, 0.1, 0.7)  # Very dark background
			border_color = Color(0.3, 0.3, 0.3)  # Gray border
			border_width = 1
		
		panel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(bg_color, border_color, border_width))
		upgrade_grid.add_child(panel)
		
		# Create content container
		var vbox = VBoxContainer.new()
		vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
		vbox.add_theme_constant_override("separation", 5)
		vbox.add_theme_constant_override("offset_left", 8)
		vbox.add_theme_constant_override("offset_top", 8)
		vbox.add_theme_constant_override("offset_right", -8)
		vbox.add_theme_constant_override("offset_bottom", -8)
		panel.add_child(vbox)
		
		# Name label (bold, gold if can afford)
		var name_label = Label.new()
		if can_afford and not is_purchased:
			name_label.add_theme_color_override("font_color", Color.GOLD)
		elif is_purchased:
			name_label.add_theme_color_override("font_color", Color.GREEN)
		else:
			name_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
		name_label.add_theme_font_size_override("font_size", 14)
		name_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		name_label.add_theme_constant_override("outline_size", 1)
		name_label.text = upgrade_name
		vbox.add_child(name_label)
		
		# Cost label
		var cost_label = Label.new()
		if can_afford and not is_purchased:
			cost_label.add_theme_color_override("font_color", Color.GOLD)
		else:
			cost_label.add_theme_color_override("font_color", Color(0.8, 0.6, 0.2))
		cost_label.add_theme_font_size_override("font_size", 12)
		cost_label.text = "Cost: %d Points" % cost
		vbox.add_child(cost_label)
		
		# Description label (shortened for grid view)
		var desc_label = Label.new()
		desc_label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9))
		desc_label.add_theme_font_size_override("font_size", 11)
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

		# Show only first line in grid, full description in tooltip
		var desc_lines = description.split("\n")
		desc_label.text = desc_lines[0] + (desc_lines.size() > 1 ? "..." : "")
		desc_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(desc_label)
		
		# Status indicator
		if is_purchased:
			var status_label = Label.new()
			status_label.add_theme_color_override("font_color", Color.GREEN)
			status_label.add_theme_font_size_override("font_size", 12)
			status_label.text = "✓ PURCHASED"
			vbox.add_child(status_label)
		
		# Make panel clickable if not purchased
		if not is_purchased:
			var btn = Button.new()
			btn.set_anchors_preset(Control.PRESET_FULL_RECT)
			btn.flat = true
			btn.mouse_filter = Control.MOUSE_FILTER_PASS  # Allow clicks to pass through
			panel.add_child(btn)
			btn.pressed.connect(_on_upgrade_button_pressed.bind(up_id))

			# Add tooltip hover functionality
			btn.mouse_entered.connect(_on_upgrade_hover.bind(up_data, panel))
			btn.mouse_exited.connect(_on_upgrade_unhover)

func _on_upgrade_button_pressed(upgrade_id: String):
	_on_upgrade_purchased(upgrade_id)

func _update_display():
	"""Update prestige display"""
	var prem = get_node_or_null("/root/PrestigeManager")
	if not prem: return
	
	var points = prem.get_prestige_points()
	var prestige_level = prem.get_prestige_level()
	
	# Get detailed pending points breakdown
	var breakdown = prem.get_pending_prestige_points_breakdown()
	
	var text = "[color=#FFD700]Available Points: %d[/color]\n" % points
	text += "[color=#FFD700]Prestige Level: %d[/color]\n" % prestige_level

	# Add prestige milestone indicators
	text += "\n[color=#87CEEB]Prestige Milestones:[/color]\n"
	var milestones = [1, 5, 10, 25, 50, 100]
	for milestone in milestones:
		var achieved = prestige_level >= milestone
		var marker = "[color=#00FF00]✓[/color]" if achieved else "[color=#666666]○[/color]"
		text += "%s Level %d " % [marker, milestone]
		if milestone < milestones.back():
			text += " "
	text += "\n\n[color=#00FF00]Next Prestige Rewards:[/color]\n"
	text += "  Base: %d\n" % breakdown.get("base", 0)
	if breakdown.get("level_bonus", 0) > 0:
		text += "  Level Bonus: +%d\n" % breakdown.get("level_bonus", 0)
	if breakdown.get("equipment_bonus", 0) > 0:
		text += "  Equipment: +%d\n" % breakdown.get("equipment_bonus", 0)
	if breakdown.get("achievement_bonus", 0) > 0:
		text += "  Achievements: +%d\n" % breakdown.get("achievement_bonus", 0)
	if breakdown.get("essence_bonus", 0) > 0:
		text += "  Essence: +%d\n" % breakdown.get("essence_bonus", 0)
	if breakdown.get("mile_bonus", 0) > 0:
		text += "  Miles: +%d\n" % breakdown.get("mile_bonus", 0)
	
	var multiplier = breakdown.get("multiplier", 1.0)
	if multiplier > 1.0:
		text += "  [color=#FFA500]Multiplier: %.2fx[/color]\n" % multiplier
	
	text += "[color=#FFD700]Total: +%d Points[/color]" % breakdown.get("total", 0)

	if prestige_label:
		prestige_label.bbcode_enabled = true
		prestige_label.text = text

	# Update prestige progress bar (visual indicator of prestige level)
	if prestige_progress:
		# Show prestige level as a percentage of progress (cycles every 10 levels for visual feedback)
		var visual_progress = fmod(prestige_level, 10) / 10.0 * 100.0
		prestige_progress.value = visual_progress
		prestige_progress.tooltip_text = "Prestige Level %d" % prestige_level
	
	# Enable/disable prestige button based on availability and requirements
	var can_prestige = prem.can_prestige() and breakdown.get("total", 0) > 0
	if prestige_button:
		prestige_button.disabled = !can_prestige

func _calculate_pending_points() -> int:
	# Use PrestigeManager's full calculation
	var prem = get_node_or_null("/root/PrestigeManager")
	if not prem: return 0
	var breakdown = prem.get_pending_prestige_points_breakdown()
	return breakdown.get("total", 0)

func _on_upgrade_purchased(upgrade_id: String):
	var prem = get_node_or_null("/root/PrestigeManager")
	var am = get_node_or_null("/root/AudioManager")
	
	if prem and prem.purchase_upgrade(upgrade_id):
		_populate_upgrades()
		_update_display()
		if am: am.play_sfx("buy_item")

func _on_prestige_pressed():
	"""Handle prestige reset with confirmation dialog"""
	_log_info("Prestige", "Prestige reset requested")
	var prem = get_node_or_null("/root/PrestigeManager")
	if not prem: return
	
	var breakdown = prem.get_pending_prestige_points_breakdown()
	var pending_points = breakdown.get("total", 0)
	
	if pending_points <= 0:
		_log_warn("Prestige", "Cannot prestige - no points pending")
		return
	
	# Show confirmation dialog
	_show_prestige_confirmation_dialog(pending_points, breakdown)

func _show_prestige_confirmation_dialog(pending_points: int, breakdown: Dictionary):
	"""Show WoW-style confirmation dialog for prestige"""
	var ui_builder = get_node_or_null("/root/UIBuilder")
	var ui_theme = get_node_or_null("/root/UITheme")
	if not ui_builder or not ui_theme:
		# Fallback: Direct prestige without dialog
		_confirm_prestige()
		return
	
	# Create confirmation dialog panel
	var dialog_panel = Panel.new()
	dialog_panel.set_anchors_preset(Control.PRESET_CENTER)
	dialog_panel.custom_minimum_size = Vector2(500, 350)
	dialog_panel.position = Vector2(-250, -175)
	dialog_panel.z_index = 1000
	dialog_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
		ui_theme.COLORS["frame_dark"],
		ui_theme.COLORS["gold_border"],
		3
	))
	add_child(dialog_panel)
	
	# Title
	var title = Label.new()
	title.set_anchors_preset(Control.PRESET_TOP_WIDE)
	title.offset_top = 20
	title.offset_left = 20
	title.offset_right = -20
	title.offset_bottom = 60
	title.add_theme_color_override("font_color", Color.GOLD)
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	title.add_theme_constant_override("outline_size", 2)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.text = "PRESTIGE CONFIRMATION"
	dialog_panel.add_child(title)
	
	# Message with breakdown
	var message = RichTextLabel.new()
	message.set_anchors_preset(Control.PRESET_FULL_RECT)
	message.offset_left = 30
	message.offset_top = 70
	message.offset_right = -30
	message.offset_bottom = -100
	message.bbcode_enabled = true
	message.fit_content = true
	message.scroll_active = true
	
	var msg_text = "[color=#FFFFFF]Are you sure you want to Prestige?\n\n[/color]"
	msg_text += "[color=#FFD700]You will gain:[/color]\n"
	msg_text += "  [color=#00FF00]+%d Prestige Points[/color]\n" % pending_points
	msg_text += "\n[color=#FFA500]Breakdown:[/color]\n"
	msg_text += "  Base: %d\n" % breakdown.get("base", 0)
	if breakdown.get("level_bonus", 0) > 0:
		msg_text += "  Level Bonus: +%d\n" % breakdown.get("level_bonus", 0)
	if breakdown.get("equipment_bonus", 0) > 0:
		msg_text += "  Equipment: +%d\n" % breakdown.get("equipment_bonus", 0)
	if breakdown.get("achievement_bonus", 0) > 0:
		msg_text += "  Achievements: +%d\n" % breakdown.get("achievement_bonus", 0)
	if breakdown.get("essence_bonus", 0) > 0:
		msg_text += "  Essence: +%d\n" % breakdown.get("essence_bonus", 0)
	if breakdown.get("mile_bonus", 0) > 0:
		msg_text += "  Miles: +%d\n" % breakdown.get("mile_bonus", 0)
	var multiplier = breakdown.get("multiplier", 1.0)
	if multiplier > 1.0:
		msg_text += "  [color=#FFA500]Multiplier: %.2fx[/color]\n" % multiplier
	msg_text += "\n[color=#FF0000]All progress will reset![/color]"
	
	message.text = msg_text
	dialog_panel.add_child(message)
	
	# Buttons
	var button_container = HBoxContainer.new()
	button_container.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	button_container.offset_left = 30
	button_container.offset_right = -30
	button_container.offset_bottom = -20
	button_container.offset_top = -80
	button_container.add_theme_constant_override("separation", 20)
	button_container.alignment = BoxContainer.ALIGNMENT_CENTER
	dialog_panel.add_child(button_container)
	
	# Confirm button
	var confirm_btn = Button.new()
	confirm_btn.custom_minimum_size = Vector2(150, 40)
	confirm_btn.text = "CONFIRM"
	confirm_btn.add_theme_stylebox_override("normal", ui_theme.get_stylebox_panel(
		Color(0.2, 0.6, 0.2, 0.9),
		Color.GREEN,
		2
	))
	confirm_btn.add_theme_stylebox_override("hover", ui_theme.get_stylebox_panel(
		Color(0.3, 0.7, 0.3, 0.9),
		Color.GREEN,
		2
	))
	confirm_btn.add_theme_color_override("font_color", Color.WHITE)
	confirm_btn.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	confirm_btn.add_theme_constant_override("outline_size", 1)
	confirm_btn.pressed.connect(_confirm_prestige.bind(dialog_panel))
	button_container.add_child(confirm_btn)
	
	# Cancel button
	var cancel_btn = Button.new()
	cancel_btn.custom_minimum_size = Vector2(150, 40)
	cancel_btn.text = "CANCEL"
	cancel_btn.add_theme_stylebox_override("normal", ui_theme.get_stylebox_panel(
		ui_theme.COLORS["frame_dark"],
		ui_theme.COLORS["gold_border"],
		1
	))
	cancel_btn.add_theme_stylebox_override("hover", ui_theme.get_stylebox_panel(
		Color(0.15, 0.15, 0.18, 0.95),
		ui_theme.COLORS["gold"],
		1
	))
	cancel_btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
	cancel_btn.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	cancel_btn.add_theme_constant_override("outline_size", 1)
	cancel_btn.pressed.connect(dialog_panel.queue_free)
	button_container.add_child(cancel_btn)

func _confirm_prestige(dialog_panel: Node = null):
	"""Actually perform prestige reset"""
	if dialog_panel:
		dialog_panel.queue_free()
	
	var prem = get_node_or_null("/root/PrestigeManager")
	var sm = get_node_or_null("/root/SceneManager")
	
	if prem and prem.can_prestige():
		prem.perform_prestige()
		_update_display()
		_populate_upgrades()
		# Return to main menu or restart game loop
		if sm: sm.change_scene("res://scenes/MainMenu.tscn")

func _on_back_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/MainMenu.tscn")

func _create_tooltip_panel():
	"""Create the tooltip panel for upgrade details"""
	var ut = get_node_or_null("/root/UITheme")
	if not ut: return

	tooltip_panel = Panel.new()
	tooltip_panel.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	tooltip_panel.custom_minimum_size = Vector2(400, 250)
	tooltip_panel.position = Vector2(-420, -270)  # Position near bottom right
	tooltip_panel.z_index = 100
	tooltip_panel.visible = false
	tooltip_panel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(
		ut.COLORS["frame_dark"],
		ut.COLORS["gold_border"],
		2
	))
	add_child(tooltip_panel)

	# Create tooltip content
	var vbox = VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 8)
	vbox.add_theme_constant_override("offset_left", 15)
	vbox.add_theme_constant_override("offset_top", 15)
	vbox.add_theme_constant_override("offset_right", -15)
	vbox.add_theme_constant_override("offset_bottom", -15)
	tooltip_panel.add_child(vbox)

	# Title
	var title_label = Label.new()
	title_label.add_theme_color_override("font_color", Color.GOLD)
	title_label.add_theme_font_size_override("font_size", 16)
	title_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	title_label.add_theme_constant_override("outline_size", 1)
	vbox.add_child(title_label)

	# Separator
	var separator = HSeparator.new()
	vbox.add_child(separator)

	# Content
	tooltip_label = RichTextLabel.new()
	tooltip_label.bbcode_enabled = true
	tooltip_label.fit_content = true
	tooltip_label.scroll_active = true
	tooltip_label.add_theme_color_override("default_color", Color(0.95, 0.95, 0.95))
	tooltip_label.add_theme_font_size_override("normal_font_size", 12)
	tooltip_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(tooltip_label)

func _on_upgrade_hover(upgrade_data: Dictionary, panel: Panel):
	"""Show tooltip when hovering over upgrade"""
	if not tooltip_panel or not tooltip_label: return

	var upgrade_name = upgrade_data.get("name", "Unknown")
	var description = upgrade_data.get("description", "")
	var cost = upgrade_data.get("cost", 0)
	var is_purchased = upgrade_data.get("purchased", false)
	var can_afford = upgrade_data.get("can_afford", false)
	var upgrade_type = upgrade_data.get("type", "unknown")

	# Update tooltip title
	var title_node = tooltip_panel.get_child(0).get_child(0)  # VBox -> Title
	if title_node:
		title_node.text = upgrade_name

	# Build detailed tooltip content
	var tooltip_text = ""

	# Full description
	tooltip_text += description + "\n\n"

	# Cost and status
	if is_purchased:
		tooltip_text += "[color=#00FF00]✓ PURCHASED[/color]\n"
	else:
		tooltip_text += "[color=#FFD700]Cost: %d Prestige Points[/color]\n" % cost
		if can_afford:
			tooltip_text += "[color=#00FF00]Can Afford[/color]\n"
		else:
			tooltip_text += "[color=#FF6B6B]Cannot Afford[/color]\n"

	# Current effect if applicable
	var prem = get_node_or_null("/root/PrestigeManager")
	if prem and upgrade_type in ["stat_multiplier", "gold_multiplier", "xp_multiplier", "gear_effectiveness", "combat_bonus"]:
		var current_effect = prem.get_upgrade_current_effect(upgrade_data.get("id", ""))
		if current_effect > 0:
			var effect_desc = ""
			match upgrade_type:
				"stat_multiplier":
					var stat = upgrade_data.get("stat", "unknown")
					effect_desc = "+%.0f%% %s" % [current_effect * 100, stat.capitalize()]
				"gold_multiplier":
					effect_desc = "+%.0f%% gold gain" % [current_effect * 100]
				"xp_multiplier":
					effect_desc = "+%.0f%% experience gain" % [current_effect * 100]
				"gear_effectiveness":
					effect_desc = "+%.0f%% gear effectiveness" % [current_effect * 100]
				"combat_bonus":
					effect_desc = "+%.0f%% damage and healing" % [current_effect * 100]

			if effect_desc != "":
				tooltip_text += "\n[color=#87CEEB]Current Effect: %s[/color]" % effect_desc

	# Update tooltip content
	tooltip_label.text = tooltip_text

	# Position tooltip near the hovered panel
	var panel_global_pos = panel.get_global_rect()
	tooltip_panel.position = Vector2(
		clamp(panel_global_pos.position.x + panel_global_pos.size.x + 10, 10, get_viewport_rect().size.x - 410),
		clamp(panel_global_pos.position.y, 10, get_viewport_rect().size.y - 260)
	)

	tooltip_panel.visible = true
	current_tooltip_upgrade = upgrade_data

func _on_upgrade_unhover():
	"""Hide tooltip when not hovering"""
	if tooltip_panel:
		tooltip_panel.visible = false
	current_tooltip_upgrade = {}

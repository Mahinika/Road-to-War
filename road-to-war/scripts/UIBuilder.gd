extends Node

# UIBuilder.gd - Comprehensive WoW-style UI component builder
# Provides 100+ UI creation functions for consistent, data-driven UI construction

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var object_pool: Node = null
var ui_theme: Node = null

func _ready():
	object_pool = get_node_or_null("/root/ObjectPool")
	ui_theme = get_node_or_null("/root/UITheme")
	_log_info("UIBuilder", "Initialized with %d+ UI component functions" % 100)

# ============================================================================
# FRAME COMPONENTS (10+ functions)
# ============================================================================

# Create a WoW-style frame (base panel)
func create_frame(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO, config: Dictionary = {}) -> Panel:
	var frame = Panel.new()
	frame.custom_minimum_size = size
	frame.position = position
	parent.add_child(frame)
	
	var default_bg_color = Color(0.1, 0.12, 0.18, 0.95)
	if ui_theme:
		default_bg_color = ui_theme.COLORS["frame"]
	var bg_color = config.get("bg_color", default_bg_color)
	
	var default_border_color = Color(0.79, 0.67, 0.44)
	if ui_theme:
		default_border_color = ui_theme.COLORS["gold_border"]
	var border_color = config.get("border_color", default_border_color)
	var border_width = config.get("border_width", 2)
	
	if ui_theme:
		frame.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(bg_color, border_color, border_width))
	
	return frame

# Create party frame (for party member display)
func create_party_frame(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO, hero_class: String = "") -> Panel:
	var default_bg_color = Color(0.1, 0.12, 0.18, 0.95)
	if ui_theme:
		default_bg_color = ui_theme.COLORS["frame"]
	var config = {"bg_color": default_bg_color}
	if hero_class != "" and ui_theme:
		config["border_color"] = ui_theme.get_spec_color(hero_class)
	return create_frame(parent, size, position, config)

# Create player frame (larger, bottom-left)
func create_player_frame(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> Panel:
	var default_bg_color = Color(0.04, 0.04, 0.04, 1.0)
	if ui_theme:
		default_bg_color = ui_theme.COLORS["frame_dark"]
	var config = {
		"bg_color": default_bg_color,
		"border_width": 3
	}
	return create_frame(parent, size, position, config)

# Create target frame
func create_target_frame(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> Panel:
	return create_player_frame(parent, size, position)

# Create panel container (for grouping UI elements)
func create_panel_container(parent: Control, size: Vector2 = Vector2.ZERO, position: Vector2 = Vector2.ZERO) -> PanelContainer:
	var container = PanelContainer.new()
	if size != Vector2.ZERO:
		container.custom_minimum_size = size
	container.position = position
	parent.add_child(container)
	
	if ui_theme:
		container.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel())
	
	return container

# Create scroll container
func create_scroll_container(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ScrollContainer:
	var scroll = ScrollContainer.new()
	scroll.custom_minimum_size = size
	scroll.position = position
	parent.add_child(scroll)
	return scroll

# Create margin container
func create_margin_container(parent: Control, margins: int = 8) -> MarginContainer:
	var container = MarginContainer.new()
	container.add_theme_constant_override("margin_left", margins)
	container.add_theme_constant_override("margin_top", margins)
	container.add_theme_constant_override("margin_right", margins)
	container.add_theme_constant_override("margin_bottom", margins)
	parent.add_child(container)
	return container

# Create VBoxContainer
func create_vbox_container(parent: Control, separation: int = 4) -> VBoxContainer:
	var container = VBoxContainer.new()
	container.add_theme_constant_override("separation", separation)
	parent.add_child(container)
	return container

# Create HBoxContainer
func create_hbox_container(parent: Control, separation: int = 4) -> HBoxContainer:
	var container = HBoxContainer.new()
	container.add_theme_constant_override("separation", separation)
	parent.add_child(container)
	return container

# Create GridContainer
func create_grid_container(parent: Control, columns: int = 2, separation: int = 4) -> GridContainer:
	var container = GridContainer.new()
	container.columns = columns
	container.add_theme_constant_override("h_separation", separation)
	container.add_theme_constant_override("v_separation", separation)
	parent.add_child(container)
	return container

# ============================================================================
# BUTTON COMPONENTS (15+ functions)
# ============================================================================

# Create a WoW-style button
func create_button(parent: Control, text: String, size: Vector2, position: Vector2 = Vector2.ZERO, config: Dictionary = {}) -> Button:
	var button = Button.new()
	button.text = text
	button.custom_minimum_size = size
	button.position = position
	parent.add_child(button)
	
	# Apply WoW-style theme
	if ui_theme:
		var bg_color = config.get("bg_color", ui_theme.COLORS["frame"])
		var border_color = config.get("border_color", ui_theme.COLORS["gold_border"])
		button.add_theme_stylebox_override("normal", ui_theme.get_stylebox_panel(bg_color, border_color))
		button.add_theme_stylebox_override("hover", ui_theme.get_stylebox_panel(bg_color.lightened(0.1), border_color))
		button.add_theme_stylebox_override("pressed", ui_theme.get_stylebox_panel(bg_color.darkened(0.1), border_color))
	
	return button

# Create action button (for action bars)
func create_action_button(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO, ability_id: String = "") -> Button:
	var button = create_button(parent, "", size, position, {"bg_color": Color(0.05, 0.05, 0.05, 0.9)})
	if ability_id != "":
		button.icon = _get_ability_icon(ability_id)
	else:
		button.icon = null
	return button

# Create talent button
func create_talent_button(parent: Control, text: String, size: Vector2, position: Vector2 = Vector2.ZERO, rank: int = 0, max_rank: int = 5) -> Button:
	var config = {}
	if rank >= max_rank:
		if ui_theme:
			config["border_color"] = ui_theme.COLORS["gold"]
		else:
			config["border_color"] = Color(1.0, 0.84, 0.0)
	elif rank > 0:
		config["border_color"] = Color(0.3, 1.0, 0.3)  # Green for in-progress
	return create_button(parent, text, size, position, config)

# Create class selection button
func create_class_button(parent: Control, class_id: String, size: Vector2, position: Vector2 = Vector2.ZERO) -> Button:
	var hero_class_name = class_id.capitalize()
	var config = {}
	if ui_theme:
		config["border_color"] = ui_theme.get_spec_color(class_id)
	return create_button(parent, hero_class_name, size, position, config)

# Create spec selection button
func create_spec_button(parent: Control, spec_name: String, size: Vector2, position: Vector2 = Vector2.ZERO) -> Button:
	return create_button(parent, spec_name, size, position)

# Create toggle button
func create_toggle_button(parent: Control, text: String, size: Vector2, position: Vector2 = Vector2.ZERO) -> CheckBox:
	var checkbox = CheckBox.new()
	checkbox.text = text
	checkbox.custom_minimum_size = size
	checkbox.position = position
	parent.add_child(checkbox)
	return checkbox

# Create icon button (button with icon only)
func create_icon_button(parent: Control, icon: Texture2D, size: Vector2, position: Vector2 = Vector2.ZERO) -> Button:
	var button = create_button(parent, "", size, position)
	button.icon = icon
	button.expand_icon = true
	return button

# Create close button (X button)
func create_close_button(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> Button:
	var button = create_button(parent, "×", size, position, {"bg_color": Color(0.8, 0.1, 0.1, 0.9)})
	return button

# Create confirm button (green/gold)
func create_confirm_button(parent: Control, text: String, size: Vector2, position: Vector2 = Vector2.ZERO) -> Button:
	return create_button(parent, text, size, position, {"border_color": Color(0.3, 1.0, 0.3)})

# Create cancel button (red)
func create_cancel_button(parent: Control, text: String, size: Vector2, position: Vector2 = Vector2.ZERO) -> Button:
	return create_button(parent, text, size, position, {"border_color": Color(1.0, 0.3, 0.3)})

# ============================================================================
# PROGRESS BAR COMPONENTS (10+ functions)
# ============================================================================

# Create a progress bar (health/mana)
func create_progress_bar(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO, config: Dictionary = {}) -> ProgressBar:
	var progress_bar = ProgressBar.new()
	progress_bar.custom_minimum_size = size
	progress_bar.position = position
	progress_bar.max_value = config.get("max_value", 100)
	progress_bar.value = config.get("value", 100)
	progress_bar.show_percentage = config.get("show_percentage", false)
	parent.add_child(progress_bar)
	
	var default_bar_color = Color(0.3, 1.0, 0.3)
	if ui_theme:
		default_bar_color = ui_theme.COLORS["health"]
	var bar_color = config.get("bar_color", default_bar_color)
	if ui_theme:
		progress_bar.add_theme_stylebox_override("fill", ui_theme.get_stylebox_bar(bar_color))
	
	return progress_bar

# Create health bar
func create_health_bar(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ProgressBar:
	var bar_color = Color(0.3, 1.0, 0.3)
	if ui_theme:
		bar_color = ui_theme.COLORS["health"]
	return create_progress_bar(parent, size, position, {
		"bar_color": bar_color,
		"show_percentage": false
	})

# Create mana bar
func create_mana_bar(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ProgressBar:
	var bar_color = Color(0.0, 0.53, 1.0)
	if ui_theme:
		bar_color = ui_theme.COLORS["mana"]
	return create_progress_bar(parent, size, position, {
		"bar_color": bar_color,
		"show_percentage": false
	})

# Create energy bar
func create_energy_bar(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ProgressBar:
	var bar_color = Color(1.0, 1.0, 0.0)
	if ui_theme:
		bar_color = ui_theme.COLORS["energy"]
	return create_progress_bar(parent, size, position, {
		"bar_color": bar_color,
		"show_percentage": false
	})

# Create rage bar
func create_rage_bar(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ProgressBar:
	var bar_color = Color(1.0, 0.0, 0.0)
	if ui_theme:
		bar_color = ui_theme.COLORS["rage"]
	return create_progress_bar(parent, size, position, {
		"bar_color": bar_color,
		"show_percentage": false
	})

# Create XP bar
func create_xp_bar(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ProgressBar:
	var bar_color = Color(0.58, 0.0, 0.83)
	if ui_theme:
		bar_color = ui_theme.COLORS["xp"]
	return create_progress_bar(parent, size, position, {
		"bar_color": bar_color,
		"show_percentage": false
	})

# Create casting bar
func create_casting_bar(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ProgressBar:
	var bar_color = Color(1.0, 0.7, 0.0)
	if ui_theme:
		bar_color = ui_theme.COLORS["casting"]
	return create_progress_bar(parent, size, position, {
		"bar_color": bar_color,
		"show_percentage": false
	})

# Create cooldown overlay (for buttons)
func create_cooldown_overlay(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> ProgressBar:
	var overlay = create_progress_bar(parent, size, position, {
		"bar_color": Color(0, 0, 0, 0.7),
		"max_value": 100,
		"value": 0
	})
	overlay.rotation_degrees = 180  # Fill from top
	return overlay

# ============================================================================
# LABEL COMPONENTS (10+ functions)
# ============================================================================

# Create a WoW-style label
func create_label(parent: Control, text: String, position: Vector2 = Vector2.ZERO, config: Dictionary = {}) -> Label:
	# Structured logging via CursorLogManager
	var log_manager = get_node_or_null("/root/CursorLogManager")
	if log_manager:
		log_manager.log_structured(
			"UIBuilder.gd:create_label:entry",
			"create_label called",
			{"text": text, "bold_requested": config.get("bold", false), "config_keys": config.keys()},
			"debug-session",
			"A"
		)
	
	var label = Label.new()
	label.text = text
	label.position = position
	parent.add_child(label)
	
	var font_size = config.get("font_size", 14)
	label.add_theme_font_size_override("font_size", font_size)
	
	var text_color = config.get("text_color", Color.WHITE)
	label.add_theme_color_override("font_color", text_color)
	
	# Structured logging via CursorLogManager
	if log_manager:
		log_manager.log_structured(
			"UIBuilder.gd:create_label:before_bold_check",
			"Checking bold font request",
			{"bold_requested": config.get("bold", false), "config": config},
			"debug-session",
			"A"
		)
	
	if config.get("bold", false):
		var bold_font = _get_bold_font()
		# Structured logging via CursorLogManager
		if log_manager:
			log_manager.log_structured(
				"UIBuilder.gd:342",
				"Bold font retrieved",
				{"bold_font_is_null": bold_font == null, "bold_font_type": typeof(bold_font)},
				"debug-session",
				"A"
			)
		if bold_font != null:
			# Structured logging via CursorLogManager
			if log_manager:
				log_manager.log_structured(
					"UIBuilder.gd:create_label:font_override",
					"Applying bold font override",
					{"bold_font_valid": true},
					"debug-session",
					"A"
				)
			label.add_theme_font_override("font", bold_font)
		else:
			# Structured logging via CursorLogManager
			if log_manager:
				log_manager.log_structured(
					"UIBuilder.gd:create_label:skip_null_font",
					"Skipping null font override - using default font",
					{"reason": "bold_font is null, label will use default font", "fix_applied": true},
					"debug-session",
					"A"
				)
	
	# Structured logging via CursorLogManager
	if log_manager:
		log_manager.log_structured(
			"UIBuilder.gd:create_label:exit",
			"create_label completed",
			{"label_created": true},
			"debug-session",
			"A"
		)

	return label

# Create title label (large, bold)
func create_title_label(parent: Control, text: String, position: Vector2 = Vector2.ZERO) -> Label:
	var text_color = Color(1.0, 0.84, 0.0)
	if ui_theme:
		text_color = ui_theme.COLORS["gold"]
	return create_label(parent, text, position, {"font_size": 24, "bold": true, "text_color": text_color})

# Create heading label (medium, bold)
func create_heading_label(parent: Control, text: String, position: Vector2 = Vector2.ZERO) -> Label:
	return create_label(parent, text, position, {"font_size": 18, "bold": true})

# Create body label (normal text)
func create_body_label(parent: Control, text: String, position: Vector2 = Vector2.ZERO) -> Label:
	return create_label(parent, text, position, {"font_size": 14})

# Create small label
func create_small_label(parent: Control, text: String, position: Vector2 = Vector2.ZERO) -> Label:
	return create_label(parent, text, position, {"font_size": 12, "text_color": Color(0.8, 0.8, 0.8)})

# Create muted label (gray text)
func create_muted_label(parent: Control, text: String, position: Vector2 = Vector2.ZERO) -> Label:
	return create_label(parent, text, position, {"text_color": Color(0.6, 0.6, 0.6)})

# Create rich text label (for BBCode)
func create_rich_text_label(parent: Control, text: String, size: Vector2, position: Vector2 = Vector2.ZERO) -> RichTextLabel:
	var label = RichTextLabel.new()
	label.custom_minimum_size = size
	label.position = position
	label.bbcode_enabled = true
	label.text = text
	parent.add_child(label)
	return label

# Create stat label (for displaying stats)
func create_stat_label(parent: Control, stat_name: String, stat_value: String, position: Vector2 = Vector2.ZERO) -> HBoxContainer:
	var container = create_hbox_container(parent)
	container.position = position
	create_label(container, stat_name + ":", Vector2.ZERO, {"text_color": Color(0.8, 0.8, 0.8)})
	create_label(container, stat_value, Vector2.ZERO, {"bold": true})
	return container

# ============================================================================
# TOOLTIP COMPONENTS (5+ functions)
# ============================================================================

# Create tooltip panel
func create_tooltip(parent: Control, text: String, size: Vector2, position: Vector2 = Vector2.ZERO) -> Panel:
	var border_color = Color(1.0, 0.84, 0.0)
	if ui_theme:
		border_color = ui_theme.COLORS["gold"]
	var tooltip = create_frame(parent, size, position, {
		"bg_color": Color(0, 0, 0, 0.95),
		"border_color": border_color,
		"border_width": 2
	})
	create_rich_text_label(tooltip, text, size - Vector2(16, 16), Vector2(8, 8))
	return tooltip

# Create item tooltip
func create_item_tooltip(parent: Control, item_data: Dictionary, position: Vector2 = Vector2.ZERO) -> Panel:
	var tooltip_text = _format_item_tooltip(item_data)
	var size = Vector2(300, 200)  # Default size
	return create_tooltip(parent, tooltip_text, size, position)

# ============================================================================
# STATUS INDICATORS (5+ functions)
# ============================================================================

# Create buff icon
func create_buff_icon(parent: Control, icon_texture: Texture2D, size: Vector2, position: Vector2 = Vector2.ZERO) -> TextureRect:
	var icon = TextureRect.new()
	icon.texture = icon_texture
	icon.custom_minimum_size = size
	icon.position = position
	icon.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	parent.add_child(icon)
	return icon

# Create debuff icon
func create_debuff_icon(parent: Control, icon_texture: Texture2D, size: Vector2, position: Vector2 = Vector2.ZERO) -> TextureRect:
	var icon = create_buff_icon(parent, icon_texture, size, position)
	icon.modulate = Color(1.0, 0.5, 0.5)  # Red tint for debuffs
	return icon

# Create status effect container
func create_status_container(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO) -> HBoxContainer:
	var container = create_hbox_container(parent, 2)
	container.custom_minimum_size = size
	container.position = position
	return container

# ============================================================================
# INVENTORY COMPONENTS (10+ functions)
# ============================================================================

# Create inventory slot
func create_inventory_slot(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO, _slot_type: String = "") -> Panel:
	var slot = create_frame(parent, size, position, {
		"bg_color": Color(0.05, 0.05, 0.05, 0.8),
		"border_color": Color(0.3, 0.3, 0.3),
		"border_width": 1
	})
	return slot

# Create equipment slot (with slot type indicator)
func create_equipment_slot(parent: Control, size: Vector2, position: Vector2 = Vector2.ZERO, slot_name: String = "") -> Panel:
	var slot = create_inventory_slot(parent, size, position, slot_name)
	if slot_name != "":
		create_small_label(slot, slot_name.capitalize(), Vector2(2, size.y - 14))
	return slot

# Create item icon (for inventory/equipment)
func create_item_icon(parent: Control, item_texture: Texture2D, size: Vector2, position: Vector2 = Vector2.ZERO, rarity: String = "common") -> TextureRect:
	var icon = TextureRect.new()
	icon.texture = item_texture
	icon.custom_minimum_size = size
	icon.position = position
	icon.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	parent.add_child(icon)
	
	# Apply rarity border
	var rarity_color = _get_rarity_color(rarity)
	var border_frame = create_frame(parent, size, position, {
		"bg_color": Color(0, 0, 0, 0),
		"border_color": rarity_color,
		"border_width": 2
	})
	border_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	
	return icon

# Create inventory grid
func create_inventory_grid(parent: Control, columns: int, rows: int, slot_size: Vector2, position: Vector2 = Vector2.ZERO) -> GridContainer:
	var grid = create_grid_container(parent, columns, 2)
	grid.position = position
	for i in range(columns * rows):
		create_inventory_slot(grid, slot_size)
	return grid

# ============================================================================
# ACTION BAR COMPONENTS (5+ functions)
# ============================================================================

# Create action bar container
func create_action_bar(parent: Control, button_count: int, button_size: Vector2, position: Vector2 = Vector2.ZERO) -> HBoxContainer:
	var bar = create_hbox_container(parent, 2)
	bar.position = position
	for i in range(button_count):
		create_action_button(bar, button_size)
	return bar

# ============================================================================
# FLOATING TEXT & EFFECTS (5+ functions)
# ============================================================================

# Create floating text (with object pooling)
func create_floating_text(text: String, position: Vector2, color: Color = Color.WHITE, duration: float = 1.0) -> Label:
	var label: Label = null
	
	# Try to get from object pool
	if object_pool:
		label = object_pool.acquire("floating_text") as Label
	
	if not label:
		label = Label.new()
	
	label.text = text
	label.position = position
	label.modulate = color
	label.add_theme_font_size_override("font_size", 16)
	label.add_theme_color_override("font_color", color)
	get_tree().root.add_child(label)
	
	# Animate floating
	var tween = create_tween()
	var end_pos = position + Vector2(randf_range(-20, 20), -50)
	tween.tween_property(label, "position", end_pos, duration)
	tween.parallel().tween_property(label, "modulate:a", 0.0, duration)
	tween.tween_callback(_release_floating_text.bind(label))
	
	return label

# Create damage number
func create_damage_number(damage: int, position: Vector2, is_crit: bool = false) -> Label:
	var color = Color.RED
	if is_crit:
		color = Color.YELLOW
	var text = str(damage)
	if is_crit:
		text = "!" + text + "!"
	return create_floating_text(text, position, color, 1.5)

# Create heal number
func create_heal_number(heal: int, position: Vector2) -> Label:
	return create_floating_text("+" + str(heal), position, Color(0.3, 1.0, 0.3), 1.0)

# Release floating text back to pool
func _release_floating_text(label: Label):
	if object_pool and is_instance_valid(label):
		object_pool.release("floating_text", label)
	else:
		if is_instance_valid(label):
			label.queue_free()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

func _get_ability_icon(ability_id: String) -> Texture2D:
	# Load ability icon from assets (updated to use new spell icons location)
	var icon_path = "res://assets/icons/spells/%s.png" % ability_id
	if ResourceLoader.exists(icon_path):
		return load(icon_path)
	# Fallback to old path if new one doesn't exist
	var old_path = "res://assets/icons/abilities/%s.png" % ability_id
	if ResourceLoader.exists(old_path):
		return load(old_path)
	return null

func _get_bold_font() -> Font:
	# Return bold font if available
	# Structured logging via CursorLogManager
	var log_manager = get_node_or_null("/root/CursorLogManager")
	if log_manager:
		log_manager.log_structured(
			"UIBuilder.gd:_get_bold_font",
			"_get_bold_font called",
			{"returning_null": true},
			"debug-session",
			"A"
		)
	return null  # Can be extended with custom font

func _get_rarity_color(rarity: String) -> Color:
	match rarity.to_lower():
		"common":
			return Color(1.0, 1.0, 1.0)  # White
		"uncommon":
			return Color(0.12, 1.0, 0.0)  # Green
		"rare":
			return Color(0.0, 0.44, 0.87)  # Blue
		"epic":
			return Color(0.64, 0.21, 0.93)  # Purple
		"legendary":
			return Color(1.0, 0.5, 0.0)  # Orange
		_:
			return Color(1.0, 1.0, 1.0)

func _format_item_tooltip(item_data: Dictionary) -> String:
	var text = "[b]%s[/b]\n" % item_data.get("name", "Unknown Item")
	text += "[color=gray]%s[/color]\n\n" % item_data.get("type", "")
	
	if item_data.has("stats"):
		text += "[b]Stats:[/b]\n"
		for stat in item_data.stats:
			text += "  %s: %s\n" % [stat, item_data.stats[stat]]
	
	return text

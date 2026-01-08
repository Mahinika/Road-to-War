extends Control

# Spellbook.gd - WoW-style spellbook panel to inspect unlocked/locked abilities and unlock levels

var _ui_builder: Node = null
var _ui_theme: Node = null
var _party_manager: Node = null
var _ability_manager: Node = null

var _selected_hero_id: String = ""
var _last_seen_level: Dictionary = {} # hero_id -> int

# UI refs
var _tabs_container: HBoxContainer = null
var _header_label: Label = null
var _list_container: VBoxContainer = null

func _ready() -> void:
	# Godot 4: use process_mode. We want the spellbook to keep processing input while the game is paused.
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP

	_ui_builder = get_node_or_null("/root/UIBuilder")
	_ui_theme = get_node_or_null("/root/UITheme")
	_party_manager = get_node_or_null("/root/PartyManager")
	_ability_manager = get_node_or_null("/root/AbilityManager")

	_build_ui()
	refresh()

func _build_ui() -> void:
	# Dim background
	var dim = ColorRect.new()
	dim.color = Color(0, 0, 0, 0.55)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(dim)

	var view_size := get_viewport_rect().size
	var frame_size := Vector2(760, 520)
	var frame_pos := Vector2((view_size.x - frame_size.x) * 0.5, (view_size.y - frame_size.y) * 0.5)

	var frame: Panel = null
	if _ui_builder:
		frame = _ui_builder.create_frame(self, frame_size, frame_pos, {
			"bg_color": Color(0.06, 0.06, 0.08, 0.95),
			"border_color": Color(0.8, 0.7, 0.2),
			"border_width": 3
		})
	else:
		frame = Panel.new()
		frame.custom_minimum_size = frame_size
		frame.position = frame_pos
		add_child(frame)

	var root = VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 12
	root.offset_top = 12
	root.offset_right = -12
	root.offset_bottom = -12
	root.add_theme_constant_override("separation", 10)
	frame.add_child(root)

	# Header row
	var header_row = HBoxContainer.new()
	header_row.add_theme_constant_override("separation", 8)
	root.add_child(header_row)

	_header_label = Label.new()
	_header_label.text = "Spellbook"
	_header_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_header_label.add_theme_font_size_override("font_size", 26)
	_header_label.add_theme_color_override("font_color", Color(1, 0.85, 0.2))
	_header_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	_header_label.add_theme_constant_override("outline_size", 2)
	header_row.add_child(_header_label)

	var close_btn: Button = null
	if _ui_builder:
		close_btn = _ui_builder.create_button(header_row, "X", Vector2(36, 32), Vector2.ZERO, {
			"bg_color": Color(0.12, 0.12, 0.14, 0.95),
			"border_color": Color(0.8, 0.7, 0.2)
		})
	else:
		close_btn = Button.new()
		close_btn.text = "X"
		close_btn.custom_minimum_size = Vector2(36, 32)
		header_row.add_child(close_btn)
	close_btn.pressed.connect(_on_close_pressed)

	# Tabs row
	_tabs_container = HBoxContainer.new()
	_tabs_container.add_theme_constant_override("separation", 6)
	root.add_child(_tabs_container)

	# Scroll list
	var scroll: ScrollContainer = null
	if _ui_builder:
		scroll = _ui_builder.create_scroll_container(root, Vector2(0, 0), Vector2.ZERO)
	else:
		scroll = ScrollContainer.new()
		root.add_child(scroll)
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	_list_container = VBoxContainer.new()
	_list_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list_container.add_theme_constant_override("separation", 6)
	scroll.add_child(_list_container)

func refresh() -> void:
	if not _party_manager:
		return

	if _selected_hero_id == "" and not _party_manager.heroes.is_empty():
		_selected_hero_id = _party_manager.heroes[0].id

	_rebuild_tabs()
	_rebuild_list()

func mark_levels_seen() -> void:
	# Called by HUD when opening the spellbook to clear "new spells" badge logic.
	if not _party_manager:
		return
	for hero in _party_manager.heroes:
		_last_seen_level[hero.id] = hero.level

func _rebuild_tabs() -> void:
	if not _tabs_container:
		return

	for c in _tabs_container.get_children():
		c.queue_free()

	for hero in _party_manager.heroes:
		var label = hero.name
		if hero.id == _selected_hero_id:
			label = "[%s]" % label

		var btn: Button = null
		if _ui_builder:
			btn = _ui_builder.create_button(_tabs_container, label, Vector2(0, 30), Vector2.ZERO, {
				"bg_color": Color(0.1, 0.1, 0.12, 0.95),
				"border_color": (_ui_theme.get_spec_color(hero.class_id) if _ui_theme else Color(0.8, 0.7, 0.2))
			})
		else:
			btn = Button.new()
			btn.text = label
			_tabs_container.add_child(btn)

		btn.pressed.connect(_on_hero_tab_pressed.bind(hero.id))

func _rebuild_list() -> void:
	if not _list_container:
		return
	for c in _list_container.get_children():
		c.queue_free()

	var hero = _party_manager.get_hero_by_id(_selected_hero_id)
	if not hero:
		return

	_header_label.text = "Spellbook — %s (Lv %d) — %s / %s" % [
		hero.name, hero.level, hero.class_id.capitalize(), hero.spec_id.capitalize()
	]

	if not _ability_manager or not _ability_manager.has_method("get_all_ability_names"):
		var warn = Label.new()
		warn.text = "AbilityManager missing helper: get_all_ability_names()"
		_list_container.add_child(warn)
		return

	var all_names: Array = _ability_manager.get_all_ability_names(hero)
	var entries: Array = []
	for ability_id in all_names:
		var def: Dictionary = _ability_manager.get_ability_definition(hero.id, ability_id)
		var min_level: int = int(def.get("minLevel")) if (not def.is_empty() and def.has("minLevel")) else 1
		var display_name: String = str(def.get("name")) if (not def.is_empty() and def.has("name")) else ""
		if display_name == "":
			display_name = String(ability_id).replace("_", " ").capitalize()
		entries.append({
			"id": ability_id,
			"name": display_name,
			"min_level": min_level,
			"type": (def.get("type", "attack") if not def.is_empty() else "attack"),
			"cost": (def.get("cost", 0) if not def.is_empty() else 0),
			"cooldown": (def.get("cooldown", 0) if not def.is_empty() else 0)
		})

	entries.sort_custom(func(a, b):
		if a["min_level"] == b["min_level"]:
			return String(a["name"]) < String(b["name"])
		return int(a["min_level"]) < int(b["min_level"])
	)

	var old_level := int(_last_seen_level.get(hero.id, hero.level))

	for e in entries:
		var row = HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)
		row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		_list_container.add_child(row)

		var min_level: int = int(e["min_level"])
		var unlocked: bool = hero.level >= min_level
		var just_unlocked: bool = (min_level > old_level and min_level <= hero.level)

		var left = Label.new()
		left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var prefix = "NEW  " if just_unlocked else ""
		left.text = "%s%s" % [prefix, e["name"]]
		left.add_theme_font_size_override("font_size", 18)
		if not unlocked:
			left.add_theme_color_override("font_color", Color(0.65, 0.65, 0.65))
		else:
			left.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		row.add_child(left)

		var right = Label.new()
		right.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		right.text = "Lv %d • %s • CD %ds" % [min_level, String(e["type"]).capitalize(), int(e["cooldown"])]
		right.add_theme_font_size_override("font_size", 14)
		right.add_theme_color_override("font_color", Color(0.8, 0.78, 0.7))
		row.add_child(right)

	_last_seen_level[hero.id] = hero.level

func _on_hero_tab_pressed(hero_id: String) -> void:
	_selected_hero_id = hero_id
	refresh()

func _on_close_pressed() -> void:
	visible = false
	get_tree().paused = false

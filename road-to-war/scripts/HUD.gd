extends Control

# HUD.gd - Manages the main game HUD

@onready var party_container: VBoxContainer = $PartyPanel/PartyContainer
@onready var mile_label: Label = get_node_or_null("TopBar/MileLabel")
@onready var world_progress_bar: ProgressBar = get_node_or_null("TopBar/WorldProgressBar")

var unit_frame_scene = preload("res://scenes/UnitFrame.tscn")
var spellbook_scene = preload("res://scenes/Spellbook.tscn")

var _spellbook_has_new: bool = false
var _last_level_by_hero: Dictionary = {} # hero_id -> int

func _ready():
	# Ensure HUD is full screen and responsive
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	var pm = get_node_or_null("/root/PartyManager")
	var wm = get_node_or_null("/root/WorldManager")
	var sm = get_node_or_null("/root/SceneManager")
	
	# Wait for PartyManager to be ready or heroes to be loaded
	call_deferred("refresh_party_ui")
	if pm:
		pm.hero_added.connect(_on_hero_added)
		pm.hero_removed.connect(_on_hero_removed)
	
	if wm:
		if wm.mile_changed.is_connected(_on_mile_changed):
			wm.mile_changed.disconnect(_on_mile_changed)
		wm.mile_changed.connect(_on_mile_changed)
		
		# Initial update
		_update_mile_display(wm.current_mile)
	
	# Apply theme to progress bar
	_apply_wow_hud_style()
	
	# Ensure BottomMenu is anchored correctly
	var bottom_menu_panel = get_node_or_null("BottomMenuPanel")
	var bottom_menu = get_node_or_null("BottomMenuPanel/BottomMenu")
	if bottom_menu:
		if bottom_menu_panel:
			bottom_menu_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
			bottom_menu_panel.position.y = get_viewport_rect().size.y - bottom_menu_panel.size.y
	
	# Update currency displays periodically
	_update_gold_display()
	_update_prestige_display()
	# Set up timer to update currency displays
	var timer = Timer.new()
	timer.wait_time = 0.5  # Update every 0.5 seconds
	timer.timeout.connect(_update_gold_display)
	timer.timeout.connect(_update_prestige_display)
	timer.autostart = true
	add_child(timer)
	
	# Connect buttons
	var char_btn = get_node_or_null("BottomMenuPanel/BottomMenu/CharacterButton")
	if char_btn and sm: char_btn.pressed.connect(_on_character_pressed)
	
	var inv_btn = get_node_or_null("BottomMenuPanel/BottomMenu/InventoryButton")
	if inv_btn and sm: inv_btn.pressed.connect(_on_inventory_pressed)
	
	var talent_btn = get_node_or_null("BottomMenuPanel/BottomMenu/TalentsButton")
	if talent_btn and sm: talent_btn.pressed.connect(_on_talents_pressed)

	var spellbook_btn = get_node_or_null("BottomMenuPanel/BottomMenu/SpellbookButton")
	if spellbook_btn: spellbook_btn.pressed.connect(_toggle_spellbook)
	
	var stats_btn = get_node_or_null("BottomMenuPanel/BottomMenu/StatsButton")
	if stats_btn and sm: stats_btn.pressed.connect(_on_stats_pressed)
	
	var ach_btn = get_node_or_null("BottomMenuPanel/BottomMenu/AchievementsButton")
	if ach_btn and sm: ach_btn.pressed.connect(_on_achievements_pressed)
	
	var map_btn = get_node_or_null("BottomMenuPanel/BottomMenu/MapButton")
	if map_btn: map_btn.pressed.connect(_toggle_map)
	
	var opt_btn = get_node_or_null("BottomMenuPanel/BottomMenu/OptionsButton")
	if opt_btn and sm: opt_btn.pressed.connect(_on_options_pressed)

func _apply_wow_hud_style():
	var ut = get_node_or_null("/root/UITheme")
	if not ut:
		return
	
	# Top bar panel
	var top_bar = get_node_or_null("TopBar")
	if top_bar and top_bar is Panel:
		top_bar.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold_border"], 2))
	
	# Party panel
	var party_panel = get_node_or_null("PartyPanel")
	if party_panel and party_panel is Panel:
		party_panel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame"], ut.COLORS["gold_border"], 2))
	
	# Bottom menu panel
	var bottom_menu_panel = get_node_or_null("BottomMenuPanel")
	if bottom_menu_panel and bottom_menu_panel is Panel:
		bottom_menu_panel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold_border"], 2))
	
	# Mile label readability
	if mile_label:
		mile_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		mile_label.add_theme_constant_override("outline_size", 2)
	
	# Currency labels with better styling and formatting
	var gold_label: Label = get_node_or_null("TopBar/CurrencyContainer/GoldLabel")
	if gold_label:
		gold_label.add_theme_color_override("font_color", ut.COLORS["gold"])  # Gold color
		gold_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		gold_label.add_theme_constant_override("outline_size", 1)
		gold_label.add_theme_font_size_override("font_size", 16)
		gold_label.text = "Gold: 0"  # Will be updated in _update_currency_display
	
	var pp_label: Label = get_node_or_null("TopBar/CurrencyContainer/PrestigeLabel")
	if pp_label:
		pp_label.add_theme_color_override("font_color", Color(0, 1, 1))  # Cyan for prestige
		pp_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		pp_label.add_theme_constant_override("outline_size", 1)
		pp_label.add_theme_font_size_override("font_size", 16)
		pp_label.text = "PP: 0"  # Will be updated in _update_currency_display
	
	# Progress bar styling with better WoW aesthetic
	if world_progress_bar:
		var sb_bg = StyleBoxFlat.new()
		sb_bg.bg_color = Color(0.05, 0.05, 0.05, 0.85)
		sb_bg.border_color = Color(0, 0, 0, 0.9)
		sb_bg.border_width_left = 2
		sb_bg.border_width_top = 2
		sb_bg.border_width_right = 2
		sb_bg.border_width_bottom = 2
		sb_bg.corner_radius_top_left = 3
		sb_bg.corner_radius_top_right = 3
		sb_bg.corner_radius_bottom_right = 3
		sb_bg.corner_radius_bottom_left = 3
		sb_bg.shadow_size = 1
		sb_bg.shadow_color = Color(0, 0, 0, 0.5)
		world_progress_bar.add_theme_stylebox_override("background", sb_bg)
		world_progress_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(ut.COLORS["gold"]))
	
	# Style CombatLog panel
	var combat_log = get_node_or_null("CombatLog")
	if combat_log and combat_log is Control:
		var combat_log_panel = combat_log.get_node_or_null("Panel")
		if not combat_log_panel:
			# Create panel for CombatLog if it doesn't exist
			combat_log_panel = Panel.new()
			combat_log_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
			combat_log.add_child(combat_log_panel)
			combat_log.move_child(combat_log_panel, 0)  # Move to front
		
		if combat_log_panel and combat_log_panel is Panel:
			combat_log_panel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(
				Color(0.05, 0.05, 0.05, 0.85),
				Color(0.2, 0.5, 1.0),  # Blue border for combat log
				2
			))
	
	# Bottom menu buttons: WoW-ish framed buttons
	var bottom_menu = get_node_or_null("BottomMenuPanel/BottomMenu")
	if bottom_menu:
		for child in bottom_menu.get_children():
			if child is Button:
				var btn := child as Button
				btn.add_theme_font_size_override("font_size", 14)
				btn.custom_minimum_size = Vector2(90, 32)
				
				var normal_sb = ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold_border"], 1)
				var hover_sb = ut.get_stylebox_panel(Color(0.15, 0.15, 0.18, 0.95), ut.COLORS["gold"], 1)
				var pressed_sb = ut.get_stylebox_panel(Color(0.08, 0.08, 0.10, 0.95), ut.COLORS["gold"], 2)
				
				btn.add_theme_stylebox_override("normal", normal_sb)
				btn.add_theme_stylebox_override("hover", hover_sb)
				btn.add_theme_stylebox_override("pressed", pressed_sb)
				btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
				btn.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
				btn.add_theme_constant_override("outline_size", 1)

func _on_hero_added(_hero):
	refresh_party_ui()

func _on_hero_removed(_hero_id):
	refresh_party_ui()

func _on_character_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/CharacterPanel.tscn")

func _on_inventory_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/CharacterPanel.tscn")

func _on_talents_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/TalentAllocation.tscn")

func _on_stats_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/Statistics.tscn")

func _on_achievements_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/Achievements.tscn")

func _on_options_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/Options.tscn")

func _input(event):
	if event is InputEventKey and event.pressed:
		var sm = get_node_or_null("/root/SceneManager")
		if not sm: return
		
		match event.keycode:
			KEY_I, KEY_C:
				sm.change_scene("res://scenes/CharacterPanel.tscn")
			KEY_M:
				_toggle_map()
			KEY_B:
				_toggle_spellbook()
			KEY_N:
				sm.change_scene("res://scenes/TalentAllocation.tscn")
			KEY_S:
				sm.change_scene("res://scenes/Statistics.tscn")
			KEY_A:
				sm.change_scene("res://scenes/Achievements.tscn")
			KEY_O:
				sm.change_scene("res://scenes/Options.tscn")

func _toggle_map():
	var map = get_node_or_null("WorldMap")
	if not map:
		var map_scene = load("res://scenes/WorldMap.tscn")
		if map_scene:
			map = map_scene.instantiate()
			map.name = "WorldMap"
			add_child(map)
	
	map.visible = !map.visible
	get_tree().paused = map.visible

func _toggle_spellbook():
	var book = get_node_or_null("Spellbook")
	if not book:
		if spellbook_scene:
			book = spellbook_scene.instantiate()
			book.name = "Spellbook"
			add_child(book)
		else:
			return
	
	book.visible = !book.visible
	get_tree().paused = book.visible
	
	# Clear "new spells" badge when opening
	if book.visible:
		_spellbook_has_new = false
		_update_spellbook_button_badge()
		if book.has_method("mark_levels_seen"):
			book.mark_levels_seen()

func _on_mile_changed(mile, _max, _old):
	_update_mile_display(mile)
	_update_prestige_display()
	_update_brutal_mode_display()

func _update_mile_display(mile):
	var bm = get_node_or_null("/root/BrutalModeManager")
	
	if mile_label:
		if mile <= 100:
			mile_label.text = "Mile %d / 100" % mile
		else:
			if bm and bm.is_brutal_mode():
				mile_label.text = "Mile %d+ (%s)" % [mile, bm.get_difficulty_name(bm.current_difficulty_level)]
			else:
				mile_label.text = "Mile %d+" % mile
	
	if world_progress_bar:
		# Journey is 100 miles
		world_progress_bar.max_value = 100
		var progress = mile
		if mile > 100:
			# Extend progress beyond 100% visually
			progress = 100 + ((mile - 100) / 100.0 * 100)  # Can go up to 200% (Mile 200)
			progress = min(progress, 200)
		world_progress_bar.value = progress

func _update_prestige_display():
	# Add prestige level and ethereal essence to HUD if not already present
	var prestige_m = get_node_or_null("/root/PrestigeManager")
	if not prestige_m:
		return
	
	var prestige_label: Label = get_node_or_null("TopBar/CurrencyContainer/PrestigeLabel")
	if prestige_label:
		var prestige_level = prestige_m.get_prestige_level()
		prestige_label.text = "PP: %s" % _format_number(prestige_level)
	
	# Find or create essence label inside the currency container
	var currency_container: HBoxContainer = get_node_or_null("TopBar/CurrencyContainer")
	if not currency_container:
		return
	
	var essence_label: Label = get_node_or_null("TopBar/CurrencyContainer/EssenceLabel")
	if not essence_label:
		var ui_builder = get_node_or_null("/root/UIBuilder")
		if ui_builder:
			essence_label = ui_builder.create_label(currency_container, "", Vector2.ZERO, {
				"font_color": Color(0.4, 1.0, 1.0),
				"font_size": 16
			})
			essence_label.name = "EssenceLabel"
		else:
			# Fallback to manual creation
			essence_label = Label.new()
			essence_label.name = "EssenceLabel"
			essence_label.add_theme_color_override("font_color", Color(0.4, 1.0, 1.0))
			currency_container.add_child(essence_label)
	
	if essence_label:
		var essence = prestige_m.get_ethereal_essence()
		essence_label.text = "Ess: %d" % essence
		essence_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		essence_label.add_theme_constant_override("outline_size", 1)
		essence_label.add_theme_font_size_override("font_size", 16)
	
	# Update gold display
	_update_gold_display()

func _update_gold_display():
	var shop_m = get_node_or_null("/root/ShopManager")
	var gold_label: Label = get_node_or_null("TopBar/CurrencyContainer/GoldLabel")
	if gold_label and shop_m:
		var gold = shop_m.get_gold() if shop_m.has_method("get_gold") else 0
		gold_label.text = "Gold: %s" % _format_number(gold)

func _format_number(num: int) -> String:
	# Format number with commas for readability (e.g., 1234567 -> "1,234,567")
	var str_num = str(num)
	var formatted = ""
	var count = 0
	for i in range(str_num.length() - 1, -1, -1):
		if count > 0 and count % 3 == 0:
			formatted = "," + formatted
		formatted = str_num[i] + formatted
		count += 1
	return formatted

func _update_brutal_mode_display():
	# Add brutal mode indicator to HUD
	var bm = get_node_or_null("/root/BrutalModeManager")
	var brutal_label = get_node_or_null("TopBar/CurrencyContainer/BrutalLabel")
	if not bm or not bm.is_brutal_mode():
		# Hide brutal label if exists
		if brutal_label:
			brutal_label.text = ""
		return
	
	# Find or create brutal mode label
	if not brutal_label:
		var currency_container: HBoxContainer = get_node_or_null("TopBar/CurrencyContainer")
		if currency_container:
			var ui_builder = get_node_or_null("/root/UIBuilder")
			if ui_builder:
				brutal_label = ui_builder.create_label(currency_container, "", Vector2.ZERO, {
					"font_color": Color(1.0, 0.4, 0.4),
					"font_size": 16
				})
				brutal_label.name = "BrutalLabel"
			else:
				# Fallback to manual creation
				brutal_label = Label.new()
				brutal_label.name = "BrutalLabel"
				brutal_label.add_theme_color_override("font_color", Color(1.0, 0.4, 0.4))
				currency_container.add_child(brutal_label)
	
	if brutal_label:
		brutal_label.text = "Brutal: %s" % bm.get_difficulty_name(bm.current_difficulty_level)
		brutal_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		brutal_label.add_theme_constant_override("outline_size", 1)
		brutal_label.add_theme_font_size_override("font_size", 16)

func refresh_party_ui():
	# Clear existing frames
	for child in party_container.get_children():
		child.queue_free()
		
	# Create new frames for each party member
	var pm = get_node_or_null("/root/PartyManager")
	if not pm: return
	
	for hero in pm.heroes:
		var frame = unit_frame_scene.instantiate()
		party_container.add_child(frame)
		frame.setup(hero.id)
	
	_ensure_levelup_connections()

func _ensure_levelup_connections():
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return
	for hero in pm.heroes:
		_last_level_by_hero[hero.id] = int(_last_level_by_hero.get(hero.id, hero.level))
		var cb := Callable(self, "_on_hero_level_up").bind(hero.id)
		if not hero.level_up.is_connected(cb):
			hero.level_up.connect(cb)

func _on_hero_level_up(new_level: int, hero_id: String):
	var pm = get_node_or_null("/root/PartyManager")
	var am = get_node_or_null("/root/AbilityManager")
	if not pm or not am:
		_last_level_by_hero[hero_id] = new_level
		return
	
	var hero = pm.get_hero_by_id(hero_id)
	if not hero:
		_last_level_by_hero[hero_id] = new_level
		return
	
	var old_level := int(_last_level_by_hero.get(hero_id, new_level))
	_last_level_by_hero[hero_id] = new_level
	
	# Detect newly unlocked abilities (old < minLevel <= new)
	var all_names: Array = am.get_all_ability_names(hero) if am.has_method("get_all_ability_names") else []
	var newly_unlocked := 0
	for ability_id in all_names:
		var def: Dictionary = am.get_ability_definition(hero_id, ability_id)
		if def.is_empty():
			continue
		var min_level := int(def.get("minLevel", 1))
		if min_level > old_level and min_level <= new_level:
			newly_unlocked += 1
	
	if newly_unlocked > 0:
		_spellbook_has_new = true
		_update_spellbook_button_badge()

func _update_spellbook_button_badge():
	var spellbook_btn: Button = get_node_or_null("BottomMenuPanel/BottomMenu/SpellbookButton")
	if not spellbook_btn:
		return
	spellbook_btn.text = "Spellbook *" if _spellbook_has_new else "Spellbook"

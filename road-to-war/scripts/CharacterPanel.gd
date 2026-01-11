extends Control

# CharacterPanel.gd - Unified panel for Character Sheet and Inventory (WoW Style)

const TooltipButton = preload("res://scripts/TooltipButton.gd")

@onready var main_panel = get_node_or_null("MainPanel")
@onready var hero_name_label = get_node_or_null("MainPanel/CharacterSection/Header/HeroName")
@onready var stats_label = get_node_or_null("MainPanel/Sidebar/StatsPanel/StatsLabel")
@onready var equipment_left = get_node_or_null("MainPanel/CharacterSection/EquipmentLayout/LeftSlots")
@onready var equipment_right = get_node_or_null("MainPanel/CharacterSection/EquipmentLayout/RightSlots")
@onready var equipment_bottom = get_node_or_null("MainPanel/CharacterSection/BottomSlots")
@onready var hero_select_container = get_node_or_null("MainPanel/Sidebar/TabContainer")
@onready var inventory_grid = get_node_or_null("MainPanel/InventorySection/ScrollContainer/GridContainer")
@onready var inventory_info = get_node_or_null("MainPanel/InventorySection/InfoLabel")
@onready var auto_equip_button = get_node_or_null("MainPanel/InventorySection/InventoryButtons/AutoEquipButton")
@onready var sell_trash_button = get_node_or_null("MainPanel/InventorySection/InventoryButtons/SellTrashButton")
@onready var back_button = get_node_or_null("BackButton")

var current_hero_id: String = ""
var hero_sprite_preview = null
var portrait_viewport = null
var current_filter: String = "all"

# Slot definitions for WoW-style layout
var left_slots = ["head", "neck", "shoulder", "cloak", "chest", "shirt", "tabard", "bracer"]
var right_slots = ["hands", "waist", "legs", "boots", "ring1", "ring2", "trinket1", "trinket2"]
var bottom_slots = ["weapon", "offhand"]

func _ready():
	print("[CharacterPanel] _ready() started")
	if back_button: back_button.pressed.connect(_on_back_pressed)
	
	# Use call_deferred for safer initialization
	call_deferred("_initialize_ui")

func _initialize_ui():
	print("[CharacterPanel] Starting deferred initialization...")
	
	# Initial setup
	_setup_hero_tabs()
	
	if stats_label:
		stats_label.bbcode_enabled = true
	
	var pm = get_node_or_null("/root/PartyManager")
	if pm and not pm.heroes.is_empty():
		_display_hero(pm.heroes[0].id)
	
	# Connect signals
	var lm = get_node_or_null("/root/LootManager")
	if lm and lm.has_signal("item_picked_up"):
		if not lm.item_picked_up.is_connected(_on_item_picked_up):
			lm.item_picked_up.connect(_on_item_picked_up)
	
	if auto_equip_button:
		auto_equip_button.pressed.connect(_on_auto_equip_pressed)
	
	if sell_trash_button:
		sell_trash_button.pressed.connect(_on_sell_trash_pressed)
	
	# Connect filters
	var filters = get_node_or_null("MainPanel/InventorySection/FilterButtons")
	if filters:
		for btn in filters.get_children():
			if btn is Button:
				var filter_name = btn.name.replace("Filter", "").to_lower()
				btn.pressed.connect(_on_filter_pressed.bind(filter_name))
	
	_update_tab_highlights()
	_setup_portrait_preview()
	print("[CharacterPanel] Initialization complete")

func _setup_portrait_preview():
	var middle_area = get_node_or_null("MainPanel/CharacterSection/EquipmentLayout/MiddleArea")
	if not middle_area: return
	
	# Create SubViewportContainer
	var container = SubViewportContainer.new()
	container.name = "PortraitContainer"
	container.stretch = true
	container.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	middle_area.add_child(container)
	
	# Create SubViewport
	portrait_viewport = SubViewport.new()
	portrait_viewport.transparent_bg = true
	portrait_viewport.handle_input_locally = false
	portrait_viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	container.add_child(portrait_viewport)
	
	# Add Camera
	var cam = Camera2D.new()
	cam.position = Vector2(0, -40) # Center on hero body
	cam.zoom = Vector2(3.0, 3.0) # Zoom in for portrait
	portrait_viewport.add_child(cam)
	
	# Add HeroSprite
	var hero_scene = load("res://scenes/HeroSprite.tscn")
	if hero_scene:
		hero_sprite_preview = hero_scene.instantiate()
		portrait_viewport.add_child(hero_sprite_preview)
	
	# Initial display if hero exists
	if current_hero_id != "":
		var pm = get_node_or_null("/root/PartyManager")
		var hero = pm.get_hero_by_id(current_hero_id) if pm else null
		if hero:
			hero_sprite_preview.setup(hero)
			hero_sprite_preview.play_animation("idle")

func _on_filter_pressed(filter: String):
	current_filter = filter
	_refresh_inventory()

func _on_auto_equip_pressed():
	if current_hero_id:
		var eq = get_node_or_null("/root/EquipmentManager")
		if eq:
			eq.auto_equip_best_in_slot(current_hero_id)
		_display_hero(current_hero_id)

func _on_sell_trash_pressed():
	var eq = get_node_or_null("/root/EquipmentManager")
	if eq:
		eq.sell_all_trash()
	_refresh_inventory()

func _on_item_picked_up(_item):
	_refresh_inventory()

func _setup_hero_tabs():
	if not hero_select_container: return
	for child in hero_select_container.get_children():
		if is_instance_valid(child):
			child.queue_free()
	
	var pm = get_node_or_null("/root/PartyManager")
	var ut = get_node_or_null("/root/UITheme")
	if not pm: return
	
	var ui_builder = get_node_or_null("/root/UIBuilder")
	for hero in pm.heroes:
		var btn: Button
		var class_color = ut.COLORS.get(hero.role, ut.COLORS["gold_border"]) if ut else Color.WHITE
		
		if ui_builder:
			# Use UIBuilder with custom config for class-colored buttons
			btn = ui_builder.create_button(hero_select_container, hero.name, Vector2(120, 40), Vector2.ZERO, {
				"bg_color": Color(0.1, 0.1, 0.1),
				"border_color": class_color
			})
		else:
			# Fallback to manual creation
			btn = Button.new()
			btn.text = hero.name
			btn.custom_minimum_size = Vector2(120, 40)
			if ut:
				btn.add_theme_stylebox_override("normal", ut.get_stylebox_panel(Color(0.1, 0.1, 0.1), class_color, 1))
			hero_select_container.add_child(btn)
		
		btn.pressed.connect(_display_hero.bind(hero.id))

func _update_tab_highlights():
	if not hero_select_container: return
	var children = hero_select_container.get_children()
	
	var pm = get_node_or_null("/root/PartyManager")
	var ut = get_node_or_null("/root/UITheme")
	if not pm: return
	
	for i in range(children.size()):
		var btn = children[i]
		if i >= pm.heroes.size(): continue
		
		var hero = pm.heroes[i]
		var class_color = ut.COLORS.get(hero.role, ut.COLORS["gold_border"]) if ut else Color.WHITE
		if ut:
			if hero.id == current_hero_id:
				btn.add_theme_stylebox_override("normal", ut.get_stylebox_panel(Color(0.3, 0.3, 0.3), class_color, 3))
			else:
				btn.add_theme_stylebox_override("normal", ut.get_stylebox_panel(Color(0.1, 0.1, 0.1), class_color, 1))

func _display_hero(hero_id: String):
	current_hero_id = hero_id
	_update_tab_highlights()
	
	var pm = get_node_or_null("/root/PartyManager")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if not hero: return
	if hero_name_label: hero_name_label.text = "%s (Level %d %s)" % [hero.name, hero.level, hero.class_id.capitalize()]
	_update_stats_display(hero)
	_update_equipment_display(hero_id)
	_refresh_inventory()
	
	# Update portrait preview
	if hero_sprite_preview:
		hero_sprite_preview.setup(hero)
		hero_sprite_preview.play_animation("idle")

func _update_stats_display(hero):
	if not stats_label: 
		return
		
	var stats = hero.current_stats
	if stats.is_empty():
		stats_label.clear()
		stats_label.append_text("[center][color=gray]Loading stats...[/color][/center]")
		return
		
	var text = "[center][color=gold][b]CHARACTER STATS[/b][/color][/center]\n\n"
	text += "[color=gold][b]Core Attributes[/b][/color]\n"
	text += "[table=2]"
	text += "[cell][color=#ccc]HP:[/color][/cell] [cell][b]%d/%d[/b][/cell]" % [stats.get("health", 0), stats.get("maxHealth", 100)]
	text += "[cell][color=#ccc]Strength:[/color][/cell] [cell]%d[/cell]" % stats.get("strength", 0)
	text += "[cell][color=#ccc]Agility:[/color][/cell] [cell]%d[/cell]" % stats.get("agility", 0)
	text += "[cell][color=#ccc]Intellect:[/color][/cell] [cell]%d[/cell]" % stats.get("intellect", 0)
	text += "[cell][color=#ccc]Stamina:[/color][/cell] [cell]%d[/cell]" % stats.get("stamina", 0)
	text += "[cell][color=#ccc]Spirit:[/color][/cell] [cell]%d[/cell]" % stats.get("spirit", 0)
	text += "[/table]\n"
	text += "[color=gold][b]Combat Stats[/b][/color]\n"
	text += "[table=2]"
	text += "[cell][color=#ccc]AP:[/color][/cell] [cell]%d[/cell]" % stats.get("attack", 0)
	text += "[cell][color=#ccc]Def:[/color][/cell] [cell]%d[/cell]" % stats.get("defense", 0)
	text += "[cell][color=#ccc]Crit:[/color][/cell] [cell]%.1f%%[/cell]" % stats.get("critChance", 0.0)
	text += "[cell][color=#ccc]Hit:[/color][/cell] [cell]%.1f%%[/cell]" % stats.get("hitChance", 0.0)
	text += "[/table]"
	
	# Use set_text instead of clear + append_text to avoid BBCode parser state issues
	stats_label.text = text

func _update_equipment_display(hero_id: String):
	if not equipment_left or not equipment_right: return
	for child in equipment_left.get_children():
		if is_instance_valid(child):
			child.queue_free()
	for child in equipment_right.get_children():
		if is_instance_valid(child):
			child.queue_free()
	if equipment_bottom:
		for child in equipment_bottom.get_children():
			if is_instance_valid(child):
				child.queue_free()
		
	var eq = get_node_or_null("/root/EquipmentManager")
	if not eq: return
	
	var equipment = eq.get_hero_equipment(hero_id)
	for slot_name in left_slots: _create_slot_button(equipment_left, slot_name, equipment.get(slot_name))
	for slot_name in right_slots: _create_slot_button(equipment_right, slot_name, equipment.get(slot_name))
	
	if equipment_bottom:
		for slot_name in bottom_slots: _create_slot_button(equipment_bottom, slot_name, equipment.get(slot_name))

func _create_slot_button(container: Control, slot_name: String, item_id):
	var btn_container = PanelContainer.new()
	var slot_style = StyleBoxFlat.new()
	slot_style.bg_color = Color(0.1, 0.1, 0.1, 0.9)
	slot_style.set_border_width_all(1)
	slot_style.border_color = Color(0.3, 0.3, 0.3, 1.0)
	slot_style.set_corner_radius_all(4)
	btn_container.add_theme_stylebox_override("panel", slot_style)
	
	# Use UIBuilder for button creation (equipment slots need special handling)
	var ui_builder = get_node_or_null("/root/UIBuilder")
	var btn: Button
	if ui_builder:
		btn = ui_builder.create_button(btn_container, "", Vector2(64, 64), Vector2.ZERO, {
			"bg_color": Color(0.05, 0.05, 0.05, 0.8),
			"border_color": Color(0.3, 0.3, 0.3)
		})
		btn.flat = true
	else:
		# Fallback to manual creation
		btn = Button.new()
		btn.custom_minimum_size = Vector2(64, 64)
		btn.flat = true
		btn_container.add_child(btn)
	
	btn.set_script(TooltipButton)
	if item_id:
		var eq = get_node_or_null("/root/EquipmentManager")
		var item_data = eq.get_item_data(item_id) if eq else {}
		
		# Try to load item icon from new location
		var icon_path = "res://assets/sprites/equipment/%s.png" % item_id
		var icon_tex: Texture2D = null
		if ResourceLoader.exists(icon_path):
			icon_tex = load(icon_path)
		# Fallback to old icon field if exists
		elif item_data.has("icon"):
			icon_tex = load(item_data["icon"]) if ResourceLoader.exists(item_data["icon"]) else null
		# Fallback to texture field
		elif item_data.has("texture"):
			icon_tex = load(item_data["texture"]) if ResourceLoader.exists(item_data["texture"]) else null
		
		if icon_tex:
			btn.icon = icon_tex
			btn.expand_icon = true
		else:
			btn.text = item_data.get("name", item_id).left(2)
		btn.tooltip_text = _get_equipment_tooltip(slot_name, item_data)
		slot_style.border_color = _get_rarity_color(item_data.get("rarity", "common"))
		slot_style.set_border_width_all(2)
		btn.pressed.connect(_on_slot_pressed.bind(slot_name))
	else:
		btn.text = ""
		btn.tooltip_text = "Empty " + slot_name.capitalize()
		
		# Use UIBuilder for empty slot label (reuse ui_builder from above)
		var label: Label
		if ui_builder:
			label = ui_builder.create_label(btn, slot_name.left(3).to_upper(), Vector2.ZERO, {
				"font_size": 12,
				"text_color": Color(0.6, 0.6, 0.6, 0.6)
			})
		else:
			# Fallback to manual creation
			label = Label.new()
			label.text = slot_name.left(3).to_upper()
			label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			label.modulate = Color(0.6, 0.6, 0.6, 0.6)
			label.add_theme_font_size_override("font_size", 12)
			btn.add_child(label)
		
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	# UIBuilder.create_button() already adds the button to btn_container.
	# Only add manually if it has no parent (fallback path safety).
	if btn.get_parent() == null:
		btn_container.add_child(btn)
	container.add_child(btn_container)

func _get_equipment_tooltip(slot_name: String, item_data: Dictionary) -> String:
	var name_color = _get_rarity_color_hex(item_data.get("rarity", "common"))
	var tooltip = "[color=%s]%s[/color]\n" % [name_color, item_data.get("name", "Unknown Item")]
	tooltip += "Slot: %s\n" % slot_name.capitalize()
	if item_data.has("level"): tooltip += "iLvl: %d\n" % item_data["level"]
	var stats = item_data.get("stats", {})
	if not stats.is_empty():
		tooltip += "\n[color=lime]Stats:[/color]\n"
		for stat in stats: tooltip += "  %s: +%d\n" % [stat.capitalize(), stats[stat]]
	return tooltip

func _refresh_inventory():
	if not inventory_grid or not inventory_info: return
	for child in inventory_grid.get_children():
		if is_instance_valid(child):
			child.queue_free()
	
	var lm = get_node_or_null("/root/LootManager")
	if not lm: return
	
	var inventory = lm.get_inventory()
	
	# Apply filter
	var filtered_inventory = []
	for item in inventory:
		var data = item.get("data", {})
		var item_type = data.get("type", "unknown")
		
		if current_filter == "all":
			filtered_inventory.append(item)
		elif current_filter == "armor" and item_type == "armor":
			filtered_inventory.append(item)
		elif current_filter == "weapon" and item_type == "weapon":
			filtered_inventory.append(item)
		elif current_filter == "consumable" and item_type == "consumable":
			filtered_inventory.append(item)

	inventory_info.text = "Bags: %d/%d (Filter: %s)" % [inventory.size(), lm.max_inventory_size, current_filter.capitalize()]
	
	var ui_builder = get_node_or_null("/root/UIBuilder")
	for i in range(filtered_inventory.size()):
		var item = filtered_inventory[i]
		var item_id = item.get("id", "")
		var data = item.get("data", {})
		var item_btn: Button
		
		if ui_builder:
			# Use UIBuilder for inventory item buttons
			item_btn = ui_builder.create_button(inventory_grid, "", Vector2(50, 50), Vector2.ZERO, {
				"bg_color": Color(0.05, 0.05, 0.05, 0.8),
				"border_color": Color(0.3, 0.3, 0.3)
			})
		else:
			# Fallback to manual creation
			item_btn = Button.new()
			item_btn.custom_minimum_size = Vector2(50, 50)
			inventory_grid.add_child(item_btn)
		
		# Try to load item icon from new location
		var icon_path = "res://assets/sprites/equipment/%s.png" % item_id
		var icon_tex: Texture2D = null
		if ResourceLoader.exists(icon_path):
			icon_tex = load(icon_path)
		# Fallback to old texture field
		elif data.has("texture") and ResourceLoader.exists(data["texture"]):
			icon_tex = load(data["texture"])
		
		if icon_tex:
			item_btn.icon = icon_tex
			item_btn.expand_icon = true
		else:
			# Fallback to text
			item_btn.text = data.get("name", item_id).left(2)
		
		item_btn.set_script(TooltipButton)
		item_btn.tooltip_text = _get_item_tooltip(item)
		item_btn.modulate = Color.WHITE  # Reset modulate so icon colors show correctly
		item_btn.pressed.connect(_on_item_pressed.bind(item, i))
		# Button is already added to grid by UIBuilder.create_button() or in fallback path

func _get_item_tooltip(item: Dictionary) -> String:
	var data = item.get("data", {})
	var name_color = _get_rarity_color_hex(item.get("quality", "common"))
	var tooltip = "[color=%s]%s[/color]\n" % [name_color, data.get("name", "Unknown Item")]
	tooltip += "Rarity: %s\n" % item.get("quality", "common").capitalize()
	tooltip += "Slot: %s\n" % data.get("slot", "None").capitalize()
	if data.has("armor_type"): tooltip += "Type: [color=cyan]%s[/color]\n" % data["armor_type"].capitalize()
	elif data.has("weapon_type"): tooltip += "Type: [color=cyan]%s[/color]\n" % data["weapon_type"].capitalize()
	if data.has("level"): tooltip += "iLvl: %d\n" % data["level"]
	var stats = data.get("stats", {})
	if not stats.is_empty():
		tooltip += "\n[color=lime]Stats:[/color]\n"
		for stat in stats: tooltip += "  %s: +%d\n" % [stat.capitalize(), stats[stat]]
	return tooltip

func _get_rarity_color_hex(rarity: String) -> String:
	match rarity.to_lower():
		"uncommon": return "#1eff00"
		"rare": return "#0070dd"
		"epic": return "#a335ee"
		"legendary": return "#ff8000"
		_: return "#ffffff"

func _get_rarity_color(rarity: String) -> Color:
	match rarity.to_lower():
		"uncommon": return Color(0.12, 1.0, 0.0)
		"rare": return Color(0.0, 0.44, 0.87)
		"epic": return Color(0.64, 0.21, 0.93)
		"legendary": return Color(1.0, 0.5, 0.0)
		_: return Color.WHITE

func _on_item_pressed(item: Dictionary, _index: int):
	var data = item.get("data", {})
	var item_id = item.get("id")
	
	var lm = get_node_or_null("/root/LootManager")
	var eq = get_node_or_null("/root/EquipmentManager")
	
	if data.get("type") == "consumable":
		if lm and lm.use_consumable(item_id, current_hero_id): _display_hero(current_hero_id)
	else:
		var slot = data.get("slot")
		if slot:
			if eq and eq.equip_item(current_hero_id, item_id, slot):
				if lm: lm.remove_from_inventory(item_id, 1)
				_display_hero(current_hero_id)

func _on_slot_pressed(slot_name: String):
	var eq = get_node_or_null("/root/EquipmentManager")
	var lm = get_node_or_null("/root/LootManager")
	if not eq or not lm: return
	
	var item_id = eq.unequip_item(current_hero_id, slot_name)
	if item_id:
		var item_data = eq.get_item_data(item_id)
		var loot_item = {
			"id": item_id, 
			"data": item_data, 
			"quality": item_data.get("rarity", "common"), 
			"quantity": 1, 
			"spawned_at": Time.get_ticks_msec(), 
			"lifetime": 30000
		}
		lm.pickup_loot(loot_item)
		_display_hero(current_hero_id)

func _on_back_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/World.tscn")

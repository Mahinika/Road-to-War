extends Control

# CharacterPanel.gd - Unified panel for Character Sheet and Inventory (WoW Style)

@onready var main_panel = get_node_or_null("MainPanel")
@onready var hero_name_label = get_node_or_null("MainPanel/CharacterSection/Header/HeroName")
@onready var stats_label = get_node_or_null("MainPanel/CharacterSection/StatsPanel/StatsLabel")
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
	
	if not PartyManager.heroes.is_empty():
		_display_hero(PartyManager.heroes[0].id)
	
	# Connect signals
	if LootManager.has_signal("item_picked_up"):
		LootManager.item_picked_up.connect(func(_item): _refresh_inventory())
	
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
	print("[CharacterPanel] Initialization complete")

func _on_filter_pressed(filter: String):
	current_filter = filter
	_refresh_inventory()

func _on_auto_equip_pressed():
	if current_hero_id:
		EquipmentManager.auto_equip_best_in_slot(current_hero_id)
		_display_hero(current_hero_id)

func _on_sell_trash_pressed():
	EquipmentManager.sell_all_trash()
	_refresh_inventory()

func _setup_hero_tabs():
	if not hero_select_container: return
	for child in hero_select_container.get_children(): child.queue_free()
	for hero in PartyManager.heroes:
		var btn = Button.new()
		btn.text = hero.name
		btn.custom_minimum_size = Vector2(120, 40)
		var class_color = UITheme.COLORS.get(hero.role, UITheme.COLORS["gold_border"])
		btn.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(Color(0.1, 0.1, 0.1), class_color, 1))
		btn.pressed.connect(_display_hero.bind(hero.id))
		hero_select_container.add_child(btn)

func _update_tab_highlights():
	if not hero_select_container: return
	for i in range(hero_select_container.get_child_count()):
		var btn = hero_select_container.get_child(i)
		var hero = PartyManager.heroes[i]
		var class_color = UITheme.COLORS.get(hero.role, UITheme.COLORS["gold_border"])
		if hero.id == current_hero_id:
			btn.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(Color(0.3, 0.3, 0.3), class_color, 3))
		else:
			btn.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(Color(0.1, 0.1, 0.1), class_color, 1))

const TooltipButton = preload("res://scripts/TooltipButton.gd")

func _display_hero(hero_id: String):
	current_hero_id = hero_id
	_update_tab_highlights()
	var hero = PartyManager.get_hero_by_id(hero_id)
	if not hero: return
	if hero_name_label: hero_name_label.text = "%s (Level %d %s)" % [hero.name, hero.level, hero.class_id.capitalize()]
	_update_stats_display(hero)
	_update_equipment_display(hero_id)
	_refresh_inventory()

func _update_stats_display(hero):
	if not stats_label: return
	var stats = hero.current_stats
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
	text += "[cell][color=#ccc]Attack Power:[/color][/cell] [cell]%d[/cell]" % stats.get("attack", 0)
	text += "[cell][color=#ccc]Defense:[/color][/cell] [cell]%d[/cell]" % stats.get("defense", 0)
	text += "[cell][color=#ccc]Crit Chance:[/color][/cell] [cell]%.1f%%[/cell]" % stats.get("critChance", 0.0)
	text += "[cell][color=#ccc]Hit Chance:[/color][/cell] [cell]%.1f%%[/cell]" % stats.get("hitChance", 0.0)
	text += "[/table]"
	stats_label.text = text

func _update_equipment_display(hero_id: String):
	if not equipment_left or not equipment_right: return
	for child in equipment_left.get_children(): child.queue_free()
	for child in equipment_right.get_children(): child.queue_free()
	if equipment_bottom:
		for child in equipment_bottom.get_children(): child.queue_free()
		
	var equipment = EquipmentManager.get_hero_equipment(hero_id)
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
	var btn = Button.new()
	btn.set_script(TooltipButton)
	btn.custom_minimum_size = Vector2(64, 64)
	btn.flat = true
	if item_id:
		var item_data = EquipmentManager.get_item_data(item_id)
		if item_data.has("icon"):
			var icon_tex = load(item_data["icon"])
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
		var label = Label.new()
		label.text = slot_name.left(3).to_upper()
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.modulate = Color(0.6, 0.6, 0.6, 0.6)
		label.add_theme_font_size_override("font_size", 12)
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		btn.add_child(label)
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
	for child in inventory_grid.get_children(): child.queue_free()
	
	var inventory = LootManager.get_inventory()
	
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

	inventory_info.text = "Bags: %d/%d (Filter: %s)" % [inventory.size(), LootManager.max_inventory_size, current_filter.capitalize()]
	
	for i in range(filtered_inventory.size()):
		var item = filtered_inventory[i]
		var item_btn = Button.new()
		item_btn.set_script(TooltipButton)
		item_btn.custom_minimum_size = Vector2(50, 50)
		var item_data = item.get("data", {})
		if item_data.has("icon"):
			var icon_tex = load(item_data["icon"])
			if icon_tex:
				item_btn.icon = icon_tex
				item_btn.expand_icon = true
		else:
			item_btn.text = item_data.get("name", "Item").left(2)
		item_btn.tooltip_text = _get_item_tooltip(item)
		item_btn.modulate = _get_rarity_color(item.get("quality", "common"))
		item_btn.pressed.connect(_on_item_pressed.bind(item, i))
		inventory_grid.add_child(item_btn)

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
	if data.get("type") == "consumable":
		if LootManager.use_consumable(item_id, current_hero_id): _display_hero(current_hero_id)
	else:
		var slot = data.get("slot")
		if slot:
			if EquipmentManager.equip_item(current_hero_id, item_id, slot):
				LootManager.remove_from_inventory(item_id, 1)
				_display_hero(current_hero_id)

func _on_slot_pressed(slot_name: String):
	var item_id = EquipmentManager.unequip_item(current_hero_id, slot_name)
	if item_id:
		var item_data = EquipmentManager.get_item_data(item_id)
		var loot_item = {"id": item_id, "data": item_data, "quality": item_data.get("rarity", "common"), "quantity": 1, "spawned_at": Time.get_ticks_msec(), "lifetime": 30000}
		LootManager.pickup_loot(loot_item)
		_display_hero(current_hero_id)

func _on_back_pressed():
	SceneManager.change_scene("res://scenes/World.tscn")

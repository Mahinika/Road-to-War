extends Control

# Inventory.gd - Logic for displaying and managing inventory items with WoW WotLK styling

@onready var main_panel: Panel = $MainPanel
@onready var category_tabs: HBoxContainer = $MainPanel/CategoryTabs
@onready var grid_container: GridContainer = $MainPanel/ScrollContainer/GridContainer
@onready var info_label: Label = $MainPanel/InfoPanel/InfoLabel
@onready var back_button: Button = $MainPanel/BackButton

var ui_theme: Node = null
var current_category: String = "all"
var category_buttons: Dictionary = {}

func _ready():
	ui_theme = get_node_or_null("/root/UITheme")
	
	# Apply WoW styling
	_apply_wow_styling()
	
	# Setup category tabs
	_setup_category_tabs()
	
	# Connect signals
	back_button.pressed.connect(_on_back_pressed)
	refresh_inventory()
	
	# Connect to loot manager signals if any
	if LootManager.has_signal("item_picked_up"):
		LootManager.item_picked_up.connect(_on_item_picked_up)

func _apply_wow_styling():
	"""Apply WoW WotLK styling to Inventory UI"""
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
	
	# Style info panel
	var info_panel = get_node_or_null("MainPanel/InfoPanel")
	if info_panel and ui_theme:
		info_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			Color(0.05, 0.05, 0.05, 0.9),
			ui_theme.COLORS["gold_border"],
			1
		))
	
	if info_label:
		info_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		info_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		info_label.add_theme_constant_override("outline_size", 1)
		info_label.add_theme_font_size_override("font_size", 14)
	
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
	"""Create category filter tabs (ALL, Weapons, Armor, Accessories, Consumables)"""
	if not category_tabs: return
	
	# Clear existing tabs
	for child in category_tabs.get_children():
		child.queue_free()
	category_buttons.clear()
	
	var categories = ["all", "weapons", "armor", "accessories", "consumables"]
	var category_names = {
		"all": "ALL",
		"weapons": "WEAPONS",
		"armor": "ARMOR",
		"accessories": "ACCESSORIES",
		"consumables": "CONSUMABLES"
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
	
	# Refresh inventory display for selected category
	refresh_inventory()

func _on_item_picked_up(_item):
	refresh_inventory()

func refresh_inventory():
	# Clear grid
	for child in grid_container.get_children():
		if is_instance_valid(child):
			child.queue_free()
		
	var inventory = LootManager.get_inventory()
	
	# Filter by category
	var filtered_inventory = []
	for item in inventory:
		var item_data = item.get("data", {})
		var item_type = item_data.get("type", "").to_lower()
		var item_slot = item_data.get("slot", "").to_lower()
		
		if current_category == "all":
			filtered_inventory.append(item)
		elif current_category == "weapons" and item_type == "weapon":
			filtered_inventory.append(item)
		elif current_category == "armor" and item_slot in ["chest", "helmet", "boots", "gloves"]:
			filtered_inventory.append(item)
		elif current_category == "accessories" and item_slot in ["ring", "amulet"]:
			filtered_inventory.append(item)
		elif current_category == "consumables" and item_type == "consumable":
			filtered_inventory.append(item)
	
	info_label.text = "Items: %d/%d" % [filtered_inventory.size(), LootManager.max_inventory_size]
	
	for i in range(filtered_inventory.size()):
		var item = filtered_inventory[i]
		var item_id = item.get("id", "")
		var item_data = item.get("data", {})
		var rarity = item.get("quality", "common")
		
		# Create inventory item button with WoW styling
		var item_btn: Button = Button.new()
		item_btn.custom_minimum_size = Vector2(80, 80)
		
		# Style item button with rarity border
		var rarity_color = _get_rarity_color(rarity)
		if ui_theme:
			var item_sb = ui_theme.get_stylebox_panel(
				Color(0.1, 0.1, 0.1, 0.9),
				rarity_color,
				2
			)
			item_btn.add_theme_stylebox_override("normal", item_sb)
			var hover_sb = ui_theme.get_stylebox_panel(
				Color(0.15, 0.15, 0.18, 0.95),
				rarity_color,
				3
			)
			item_btn.add_theme_stylebox_override("hover", hover_sb)
		
		grid_container.add_child(item_btn)
		
		# Try to load item icon from new location
		var icon_path = "res://assets/sprites/equipment/%s.png" % item_id
		var icon_tex: Texture2D = null
		if ResourceLoader.exists(icon_path):
			icon_tex = load(icon_path)
		# Fallback to old texture field
		elif item_data.has("texture") and ResourceLoader.exists(item_data["texture"]):
			icon_tex = load(item_data["texture"])
		
		if icon_tex:
			item_btn.icon = icon_tex
			item_btn.expand_icon = true
		else:
			# Fallback to text
			item_btn.text = item_data.get("name", item_id).left(2)
			item_btn.add_theme_font_size_override("font_size", 12)
			item_btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		
		item_btn.tooltip_text = _get_item_tooltip(item)
		item_btn.modulate = Color.WHITE  # Reset modulate so icon colors show correctly
		item_btn.pressed.connect(_on_item_pressed.bind(item, i))

func _get_item_tooltip(item: Dictionary) -> String:
	var data = item.get("data", {})
	var tooltip = "[%s]\n" % data.get("name", "Unknown")
	tooltip += "Rarity: %s\n" % item.get("quality", "common").capitalize()
	tooltip += "Type: %s\n" % data.get("type", "Unknown").capitalize()
	
	var stats = data.get("stats", {})
	if not stats.is_empty():
		tooltip += "\nStats:\n"
		for stat in stats:
			tooltip += "  %s: +%d\n" % [stat.capitalize(), stats[stat]]
			
	tooltip += "\n%s" % data.get("description", "")
	return tooltip

func _get_rarity_color(rarity: String) -> Color:
	match rarity.to_lower():
		"uncommon": return Color(0.12, 1.0, 0.0) # Green
		"rare": return Color(0.0, 0.44, 0.87) # Blue
		"epic": return Color(0.64, 0.21, 0.93) # Purple
		"legendary": return Color(1.0, 0.5, 0.0) # Orange
		_: return Color.WHITE

func _on_item_pressed(item: Dictionary, index: int):
	# Show a simple hero selection to equip the item
	var data = item.get("data", {})
	if data.get("type") == "consumable":
		# Use consumable
		_use_consumable(item, index)
	else:
		# Show hero selection list
		_show_hero_selection(item, index)

func _use_consumable(item: Dictionary, _index: int):
	# Potion logic here
	var item_id = item.get("id")
	
	# Open hero selection to use potion
	var popup = VBoxContainer.new()
	popup.name = "UsePopup"
	add_child(popup)
	popup.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	
	# Use UIBuilder for popup label
	var ui_builder = get_node_or_null("/root/UIBuilder")
	var label: Label
	if ui_builder:
		label = ui_builder.create_heading_label(popup, "Use %s on:" % item.get("data", {}).get("name", "Item"))
	else:
		# Fallback to manual creation
		label = Label.new()
		label.text = "Use %s on:" % item.get("data", {}).get("name", "Item")
		popup.add_child(label)
	
	for hero in PartyManager.heroes:
		# Use UIBuilder for hero selection buttons
		var btn: Button
		if ui_builder:
			btn = ui_builder.create_button(popup, hero.name, Vector2(0, 40), Vector2.ZERO)
		else:
			# Fallback to manual creation
			btn = Button.new()
			btn.text = hero.name
			popup.add_child(btn)
		
		btn.pressed.connect(_on_use_on_hero.bind(popup, item_id, hero.id))
		
	# Use UIBuilder for cancel button
	var cancel: Button
	if ui_builder:
		cancel = ui_builder.create_cancel_button(popup, "Cancel", Vector2(0, 40), Vector2.ZERO)
	else:
		# Fallback to manual creation
		cancel = Button.new()
		cancel.text = "Cancel"
		popup.add_child(cancel)
	
	cancel.pressed.connect(_on_cancel_popup.bind(popup))

func _on_use_on_hero(popup: Node, item_id: String, hero_id: String):
	if LootManager.use_consumable(item_id, hero_id):
		print("Used %s on %s" % [item_id, hero_id])
	if is_instance_valid(popup):
		popup.queue_free()
	refresh_inventory()

func _on_cancel_popup(popup: Node):
	if is_instance_valid(popup):
		popup.queue_free()

func _show_hero_selection(item: Dictionary, _index: int):
	# Use UIBuilder for popup panel
	var ui_builder = get_node_or_null("/root/UIBuilder")
	var popup_panel: Panel
	if ui_builder:
		popup_panel = ui_builder.create_frame(self, Vector2(300, 400), Vector2.ZERO, {
			"bg_color": Color(0, 0, 0, 0.9),
			"border_color": UITheme.COLORS["gold_border"],
			"border_width": 2
		})
		popup_panel.name = "EquipPopup"
		popup_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	else:
		# Fallback to manual creation
		popup_panel = Panel.new()
		popup_panel.name = "EquipPopup"
		add_child(popup_panel)
		popup_panel.custom_minimum_size = Vector2(300, 400)
		popup_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
		popup_panel.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(Color(0, 0, 0, 0.9), UITheme.COLORS["gold_border"]))
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 10)
	popup_panel.add_child(vbox)
	
	# Use UIBuilder for equip label
	var label: Label
	if ui_builder:
		label = ui_builder.create_heading_label(vbox, "Equip %s on:" % item.get("data", {}).get("name", "Item"))
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	else:
		# Fallback to manual creation
		label = Label.new()
		label.text = "Equip %s on:" % item.get("data", {}).get("name", "Item")
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vbox.add_child(label)
	
	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	vbox.add_child(spacer)
	
	for hero in PartyManager.heroes:
		# Use UIBuilder for hero equip buttons
		var btn: Button
		if ui_builder:
			btn = ui_builder.create_button(vbox, hero.name, Vector2(0, 40), Vector2.ZERO)
		else:
			# Fallback to manual creation
			btn = Button.new()
			btn.text = hero.name
			btn.custom_minimum_size = Vector2(0, 40)
			vbox.add_child(btn)
		
		# Add class color border if possible
		var class_color = UITheme.COLORS.get(hero.role, UITheme.COLORS["gold_border"])
		btn.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(Color(0.2, 0.2, 0.2), class_color, 1))
		
		btn.pressed.connect(_equip_on_hero.bind(hero.id, item))
		vbox.add_child(btn)
		
	var cancel = Button.new()
	cancel.text = "Cancel"
	cancel.custom_minimum_size = Vector2(0, 40)
	cancel.pressed.connect(_on_cancel_popup.bind(popup_panel))
	vbox.add_child(cancel)

func _equip_on_hero(hero_id: String, item: Dictionary):
	var item_id = item.get("id")
	var slot = item.get("data", {}).get("slot")
	
	if slot:
		if EquipmentManager.equip_item(hero_id, item_id, slot):
			LootManager.remove_from_inventory(item_id, 1)
			print("Equipped %s on %s" % [item_id, hero_id])
			
	if has_node("EquipPopup"):
		var popup = get_node("EquipPopup")
		if is_instance_valid(popup):
			popup.queue_free()
		
	refresh_inventory()

func _on_back_pressed():
	SceneManager.change_scene("res://scenes/World.tscn")

func open_character_panel():
	SceneManager.change_scene("res://scenes/CharacterPanel.tscn")


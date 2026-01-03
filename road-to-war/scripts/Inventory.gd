extends Control

# Inventory.gd - Logic for displaying and managing inventory items

@onready var grid_container: GridContainer = $VBoxContainer/ScrollContainer/GridContainer
@onready var info_label: Label = $VBoxContainer/InfoLabel
@onready var back_button: Button = $VBoxContainer/BackButton

func _ready():
	back_button.pressed.connect(_on_back_pressed)
	refresh_inventory()
	
	# Connect to loot manager signals if any
	if LootManager.has_signal("item_picked_up"):
		LootManager.item_picked_up.connect(func(_item): refresh_inventory())

func refresh_inventory():
	# Clear grid
	for child in grid_container.get_children():
		child.queue_free()
		
	var inventory = LootManager.get_inventory()
	info_label.text = "Inventory: %d/%d" % [inventory.size(), LootManager.max_inventory_size]
	
	for i in range(inventory.size()):
		var item = inventory[i]
		var item_btn = Button.new()
		item_btn.custom_minimum_size = Vector2(80, 80)
		
		var item_data = item.get("data", {})
		item_btn.text = item_data.get("name", "Unknown")
		item_btn.tooltip_text = _get_item_tooltip(item)
		
		# Set color based on rarity
		var rarity = item.get("quality", "common")
		item_btn.modulate = _get_rarity_color(rarity)
		
		item_btn.pressed.connect(_on_item_pressed.bind(item, i))
		grid_container.add_child(item_btn)

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
	
	var label = Label.new()
	label.text = "Use %s on:" % item.get("data", {}).get("name", "Item")
	popup.add_child(label)
	
	for hero in PartyManager.heroes:
		var btn = Button.new()
		btn.text = hero.name
		btn.pressed.connect(func():
			if LootManager.use_consumable(item_id, hero.id):
				print("Used %s on %s" % [item_id, hero.id])
			popup.queue_free()
			refresh_inventory()
		)
		popup.add_child(btn)
		
	var cancel = Button.new()
	cancel.text = "Cancel"
	cancel.pressed.connect(func(): popup.queue_free())
	popup.add_child(cancel)

func _show_hero_selection(item: Dictionary, _index: int):
	# Create a WoW-style popup panel
	var popup_panel = Panel.new()
	popup_panel.name = "EquipPopup"
	add_child(popup_panel)
	
	# Size and center the panel
	popup_panel.custom_minimum_size = Vector2(300, 400)
	popup_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	
	# Apply WoW theme
	popup_panel.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(Color(0, 0, 0, 0.9), UITheme.COLORS["gold_border"]))
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.add_theme_constant_override("separation", 10)
	popup_panel.add_child(vbox)
	
	var label = Label.new()
	label.text = "Equip %s on:" % item.get("data", {}).get("name", "Item")
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(label)
	
	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	vbox.add_child(spacer)
	
	for hero in PartyManager.heroes:
		var btn = Button.new()
		btn.text = hero.name
		btn.custom_minimum_size = Vector2(0, 40)
		
		# Add class color border if possible
		var class_color = UITheme.COLORS.get(hero.role, UITheme.COLORS["gold_border"])
		btn.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(Color(0.2, 0.2, 0.2), class_color, 1))
		
		btn.pressed.connect(_equip_on_hero.bind(hero.id, item))
		vbox.add_child(btn)
		
	var cancel = Button.new()
	cancel.text = "Cancel"
	cancel.custom_minimum_size = Vector2(0, 40)
	cancel.pressed.connect(func(): popup_panel.queue_free())
	vbox.add_child(cancel)

func _equip_on_hero(hero_id: String, item: Dictionary):
	var item_id = item.get("id")
	var slot = item.get("data", {}).get("slot")
	
	if slot:
		if EquipmentManager.equip_item(hero_id, item_id, slot):
			LootManager.remove_from_inventory(item_id, 1)
			print("Equipped %s on %s" % [item_id, hero_id])
			
	if has_node("EquipPopup"):
		get_node("EquipPopup").queue_free()
		
	refresh_inventory()

func _on_back_pressed():
	SceneManager.change_scene("res://scenes/World.tscn")

func open_character_panel():
	SceneManager.change_scene("res://scenes/CharacterPanel.tscn")


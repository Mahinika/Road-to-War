extends Control

# CharacterSheet.gd - Hero stats and equipment display

@onready var hero_name_label: Label = $VBoxContainer/Header/HeroName
@onready var stats_label: Label = $VBoxContainer/Content/StatsPanel/StatsLabel
@onready var slots_container: GridContainer = $VBoxContainer/Content/EquipmentPanel/SlotsContainer
@onready var hero_select_container: HBoxContainer = $VBoxContainer/HeroSelect
@onready var back_button: Button = $VBoxContainer/BackButton

var current_hero_id: String = ""

func _ready():
	back_button.pressed.connect(_on_back_pressed)
	_setup_hero_selection()
	
	if not PartyManager.heroes.is_empty():
		_display_hero(PartyManager.heroes[0].id)

func _setup_hero_selection():
	for child in hero_select_container.get_children():
		child.queue_free()
		
	for hero in PartyManager.heroes:
		var btn = Button.new()
		btn.text = hero.name
		btn.pressed.connect(_display_hero.bind(hero.id))
		hero_select_container.add_child(btn)

func _display_hero(hero_id: String):
	current_hero_id = hero_id
	var hero = PartyManager.get_hero_by_id(hero_id)
	if not hero: return
	
	hero_name_label.text = "%s (Level %d %s %s)" % [hero.name, hero.level, hero.class_id.capitalize(), hero.spec_id.capitalize()]
	
	_update_stats_display(hero)
	_update_equipment_display(hero_id)

func _update_stats_display(hero):
	var stats = hero.current_stats
	var text = "PRIMARY STATS\n"
	text += "Health: %d/%d\n" % [stats.get("health", 0), stats.get("maxHealth", 100)]
	text += "Stamina: %d\n" % stats.get("stamina", 0)
	text += "Strength: %d\n" % stats.get("strength", 0)
	text += "Agility: %d\n" % stats.get("agility", 0)
	text += "Intellect: %d\n" % stats.get("intellect", 0)
	text += "Spirit: %d\n\n" % stats.get("spirit", 0)
	
	text += "COMBAT STATS\n"
	text += "Attack: %d\n" % stats.get("attack", 0)
	text += "Defense: %d\n" % stats.get("defense", 0)
	text += "Crit: %.1f%%\n" % stats.get("critChance", 0.0)
	text += "Hit: %.1f%%\n" % stats.get("hitChance", 0.0)
	
	stats_label.text = text

func _update_equipment_display(hero_id: String):
	for child in slots_container.get_children():
		child.queue_free()
		
	var equipment = EquipmentManager.get_hero_equipment(hero_id)
	
	for slot_name in EquipmentManager.equipment_slots:
		var slot_btn = Button.new()
		slot_btn.custom_minimum_size = Vector2(80, 80)
		
		var item_id = equipment.get(slot_name)
		if item_id:
			var item_data = EquipmentManager.get_item_data(item_id)
			slot_btn.text = item_data.get("name", item_id)
			slot_btn.tooltip_text = slot_name.capitalize() + ": " + item_data.get("name", item_id) + "\n(Click to unequip)"
			
			var rarity = item_data.get("rarity", "common")
			slot_btn.modulate = _get_rarity_color(rarity)
			slot_btn.pressed.connect(_on_slot_pressed.bind(hero_id, slot_name))
		else:
			slot_btn.text = slot_name.capitalize()
			slot_btn.tooltip_text = "Empty " + slot_name.capitalize() + " Slot"
			slot_btn.modulate = Color(0.5, 0.5, 0.5, 0.5)
			
		slots_container.add_child(slot_btn)

func _on_slot_pressed(hero_id: String, slot_name: String):
	var item_id = EquipmentManager.unequip_item(hero_id, slot_name)
	if item_id:
		# Add back to inventory
		var item_data = EquipmentManager.get_item_data(item_id)
		var loot_item = {
			"id": item_id,
			"data": item_data,
			"quality": item_data.get("rarity", "common"),
			"quantity": 1,
			"spawned_at": Time.get_ticks_msec(),
			"lifetime": 30000
		}
		LootManager.pickup_loot(loot_item)
		_display_hero(hero_id)

func _get_rarity_color(rarity: String) -> Color:
	match rarity.to_lower():
		"uncommon": return Color(0.12, 1.0, 0.0)
		"rare": return Color(0.0, 0.44, 0.87)
		"epic": return Color(0.64, 0.21, 0.93)
		"legendary": return Color(1.0, 0.5, 0.0)
		_: return Color.WHITE

func _on_back_pressed():
	SceneManager.change_scene("res://scenes/World.tscn")


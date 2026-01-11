extends Control

# ActionBar.gd - Visual representation of party abilities and cooldowns

@onready var ability_container: HBoxContainer = $HBoxContainer
var ability_slots: Dictionary = {} # (hero_id, ability_name) -> ProgressBar/TextureRect

func _ready():
	# Connect to AbilityManager signals
	AbilityManager.ability_cooldown_updated.connect(_on_cooldown_updated)
	
	# Initial setup
	refresh_abilities()

func refresh_abilities():
	# Clear existing
	for child in ability_container.get_children():
		if is_instance_valid(child):
			child.queue_free()
	ability_slots.clear()
	
	# Create slots for each hero in party
	for hero in PartyManager.heroes:
		_create_hero_abilities(hero)

func _create_hero_abilities(hero: Hero):
	var hero_box = VBoxContainer.new()
	hero_box.add_theme_constant_override("separation", 2)
	ability_container.add_child(hero_box)
	
	# Hero Name (Small)
	var name_label = Label.new()
	name_label.text = hero.name.substr(0, 8)
	name_label.add_theme_font_size_override("font_size", 10)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero_box.add_child(name_label)
	
	var hbox = HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 5)
	hero_box.add_child(hbox)
	
	var class_data = DataManager.get_data("classes")
	if not class_data or not class_data.has(hero.class_id): return
	
	var core_abilities = class_data[hero.class_id].get("coreAbilities", [])
	
	for ability_name in core_abilities:
		var slot = _create_ability_slot(hero.id, ability_name)
		hbox.add_child(slot)
		ability_slots[{ "id": hero.id, "ability": ability_name }] = slot

func _create_ability_slot(hero_id: String, ability_name: String) -> Control:
	var container = Control.new()
	container.custom_minimum_size = Vector2(40, 40)
	
	# Background/Border
	var panel = Panel.new()
	panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	var hero = PartyManager.get_hero_by_id(hero_id)
	var color = UITheme.COLORS.get(hero.role, Color.GRAY) if hero else Color.GRAY
	panel.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(UITheme.COLORS["frame_dark"], color, 1))
	container.add_child(panel)
	
	# Load ability icon (use new spell icons)
	var icon_path = "res://assets/icons/spells/%s.png" % ability_name
	var icon_texture: Texture2D = null
	if ResourceLoader.exists(icon_path):
		icon_texture = load(icon_path)
	
	# Icon (TextureRect if available, otherwise fallback to text)
	if icon_texture:
		var icon_rect = TextureRect.new()
		icon_rect.texture = icon_texture
		icon_rect.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
		icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		container.add_child(icon_rect)
	else:
		# Fallback to text if icon not found
		var label = Label.new()
		label.text = ability_name.left(1).to_upper()
		label.set_anchors_preset(Control.PRESET_FULL_RECT)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_size_override("font_size", 12)
		container.add_child(label)
	
	# Cooldown Overlay
	var cooldown_bar = ProgressBar.new()
	cooldown_bar.set_anchors_preset(Control.PRESET_FULL_RECT)
	cooldown_bar.fill_mode = ProgressBar.FILL_BOTTOM_TO_TOP
	cooldown_bar.show_percentage = false
	cooldown_bar.modulate = Color(0, 0, 0, 0.7)
	cooldown_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cooldown_bar.value = 0
	container.add_child(cooldown_bar)
	
	container.set_meta("cooldown_bar", cooldown_bar)
	return container

func _on_cooldown_updated(hero_id: String, ability_name: String, cooldown: float, max_cooldown: float):
	for key in ability_slots:
		if key.id == hero_id and key.ability == ability_name:
			var slot = ability_slots[key]
			var bar = slot.get_meta("cooldown_bar")
			if max_cooldown > 0:
				bar.max_value = max_cooldown
				bar.value = cooldown
			else:
				bar.value = 0


extends Control

# UnitFrame.gd - WoW-style party member unit frame

@onready var name_label: Label = $Panel/NameLabel
@onready var level_label: Label = $Panel/LevelLabel
@onready var health_bar: ProgressBar = $Panel/HealthBar
@onready var resource_bar: ProgressBar = $Panel/ResourceBar
@onready var xp_bar: ProgressBar = $Panel/XPBar
@onready var status_container: HBoxContainer = $Panel/StatusContainer
@onready var casting_bar: ProgressBar = $Panel/CastingBar
@onready var portrait: TextureRect = $Panel/Portrait

# var transparency_material = preload("res://scripts/SpriteTransparency.gdshader")
var hero_id: String = ""

func setup(p_hero_id: String):
	hero_id = p_hero_id
	var hero = PartyManager.get_hero_by_id(hero_id)
	if not hero: return
	
	if portrait:
		var shader_path = "res://scripts/SpriteTransparency.gdshader"
		if ResourceLoader.exists(shader_path):
			var shader = load(shader_path)
			if shader:
				var shader_mat = ShaderMaterial.new()
				shader_mat.shader = shader
				portrait.material = shader_mat
	
	if name_label:
		name_label.text = hero.name
	
	# Apply WoW styling from UITheme
	if has_node("Panel"):
		var class_color = UITheme.COLORS.get(hero.role, UITheme.COLORS["gold_border"])
		$Panel.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(UITheme.COLORS["frame"], class_color))
	
	if health_bar:
		health_bar.add_theme_stylebox_override("fill", UITheme.get_stylebox_bar(UITheme.COLORS["health"]))
	if resource_bar:
		var type = "mana"
		var rm = get_node_or_null("/root/ResourceManager")
		if rm: type = rm.get_resource_type(hero_id)
		var res_color = UITheme.COLORS.get(type, UITheme.COLORS["mana"])
		resource_bar.add_theme_stylebox_override("fill", UITheme.get_stylebox_bar(res_color))
	if xp_bar:
		xp_bar.add_theme_stylebox_override("fill", UITheme.get_stylebox_bar(UITheme.COLORS["xp"]))
	if casting_bar:
		casting_bar.add_theme_stylebox_override("fill", UITheme.get_stylebox_bar(UITheme.COLORS["casting"]))

func _ready():
	if hero_id != "":
		setup(hero_id)

func _process(_delta):
	var hero = PartyManager.get_hero_by_id(hero_id)
	if not hero: return
	
	var stats = hero.current_stats
	var hp = stats.get("health", 0)
	var max_hp = stats.get("maxHealth", 100)
	health_bar.max_value = max_hp
	health_bar.value = hp
	
	if level_label:
		level_label.text = "Lv %d" % hero.level
	
	if xp_bar:
		xp_bar.max_value = hero.get_experience_needed()
		xp_bar.value = hero.experience
	
	# Update tooltip with detailed stats
	var tooltip = "%s (%s %s)\n" % [hero.name, hero.class_id.capitalize(), hero.spec_id.capitalize()]
	tooltip += "Health: %d/%d\n" % [hp, max_hp]
	tooltip += "Attack: %d | Defense: %d\n" % [stats.get("attack", 0), stats.get("defense", 0)]
	if stats.has("critRating"):
		tooltip += "Crit: %.1f%%\n" % (stats.get("critRating", 0) / 14.0)
	if stats.has("hasteRating"):
		tooltip += "Haste: %.1f%%\n" % (stats.get("hasteRating", 0) / 10.0)
	
	self.tooltip_text = tooltip
	
	# Resource (mana/energy)
	var rm = get_node_or_null("/root/ResourceManager")
	if rm:
		var type = rm.get_resource_type(hero_id)
		var current = rm.get_resource(hero_id, type)
		var max_res = 100.0
		if rm.hero_resources.has(hero_id):
			max_res = rm.hero_resources[hero_id].get("max_" + type, 100.0)
		
		resource_bar.max_value = max_res
		resource_bar.value = current
		
		# Change color based on type
		var color = UITheme.COLORS.get(type, UITheme.COLORS["mana"])
		resource_bar.add_theme_stylebox_override("fill", UITheme.get_stylebox_bar(color))
	
	_update_status_icons()
	_update_casting_bar()

func _update_status_icons():
	if not status_container: return
	
	# Only update every few frames or on signal for performance? 
	# For now, clear and rebuild if count changed or every 0.5s
	var active = StatusEffectsManager.get_active_effects(hero_id)
	
	# Simple clear and rebuild for now
	for child in status_container.get_children():
		child.queue_free()
		
	for type in active:
		var data = active[type]
		var def = StatusEffectsManager.effect_types.get(type, {})
		
		var icon_rect = ColorRect.new()
		icon_rect.custom_minimum_size = Vector2(14, 14)
		icon_rect.color = Color.from_string(def.get("color", "ffffff"), Color.WHITE)
		
		var label = Label.new()
		label.text = def.get("icon", "?")
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_size_override("font_size", 10)
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		icon_rect.add_child(label)
		
		status_container.add_child(icon_rect)

func _update_casting_bar():
	if not casting_bar: return
	
	# Check if hero is currently casting (we'll need to implement this in AbilityManager/CombatActions)
	var cm = get_node_or_null("/root/CombatManager")
	if not cm or not cm.in_combat:
		casting_bar.visible = false
		return
		
	# Placeholder: logic to check if unit has a "cast_end_ms" property
	# For now, just hide it
	casting_bar.visible = false

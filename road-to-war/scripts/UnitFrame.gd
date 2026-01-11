extends Control

# UnitFrame.gd - WoW-style party member unit frame

@onready var name_label: Label = $Panel/NameLabel
@onready var level_label: Label = $Panel/LevelLabel
@onready var health_bar: ProgressBar = $Panel/HealthBar
@onready var resource_bar: ProgressBar = $Panel/ResourceBar
@onready var resource_text: Label = $Panel/ResourceBar/ResourceText
@onready var xp_bar: ProgressBar = $Panel/XPBar
@onready var status_container: HBoxContainer = $Panel/StatusContainer
@onready var casting_bar: ProgressBar = $Panel/CastingBar
@onready var portrait: TextureRect = $Panel/Portrait

# var transparency_material = preload("res://scripts/SpriteTransparency.gdshader")
var hero_id: String = ""

func setup(p_hero_id: String):
	hero_id = p_hero_id
	var pm = get_node_or_null("/root/PartyManager")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if not hero: return
	
	if portrait:
		var shader_path = "res://scripts/SpriteTransparency.gdshader"
		if ResourceLoader.exists(shader_path):
			var shader = load(shader_path)
			if shader:
				var shader_mat = ShaderMaterial.new()
				shader_mat.shader = shader
				portrait.material = shader_mat
	
	# Apply WoW styling from UITheme
	var ut = get_node_or_null("/root/UITheme")
	if not ut: return
	
	# Style panel with role-based border color
	if has_node("Panel"):
		var role_color = ut.COLORS.get(hero.role, ut.COLORS["gold_border"])
		$Panel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame"], role_color, 2))
	
	# Style name label with better typography
	if name_label:
		name_label.text = hero.name
		name_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		name_label.add_theme_font_size_override("font_size", 13)
		name_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		name_label.add_theme_constant_override("outline_size", 1)
	
	# Style level label
	if level_label:
		level_label.add_theme_color_override("font_color", Color(1.0, 0.84, 0.0))  # Gold
		level_label.add_theme_font_size_override("font_size", 11)
		level_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		level_label.add_theme_constant_override("outline_size", 1)
	
	# Style health bar with background
	if health_bar:
		health_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(ut.COLORS["health"]))
		# Add dark background for health bar
		var bg_sb = StyleBoxFlat.new()
		bg_sb.bg_color = Color(0.1, 0.1, 0.1, 0.9)
		bg_sb.border_width_left = 1
		bg_sb.border_width_top = 1
		bg_sb.border_width_right = 1
		bg_sb.border_width_bottom = 1
		bg_sb.border_color = Color(0, 0, 0, 0.8)
		bg_sb.corner_radius_top_left = 2
		bg_sb.corner_radius_bottom_left = 2
		health_bar.add_theme_stylebox_override("background", bg_sb)
	
	# Style resource bar with background
	if resource_bar:
		var type = "mana"
		var rm = get_node_or_null("/root/ResourceManager")
		if rm: type = rm.get_resource_type(hero_id)
		var res_color = ut.COLORS.get(type, ut.COLORS["mana"])
		resource_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(res_color))
		# Add dark background for resource bar
		var bg_sb = StyleBoxFlat.new()
		bg_sb.bg_color = Color(0.1, 0.1, 0.1, 0.9)
		bg_sb.border_width_left = 1
		bg_sb.border_width_top = 1
		bg_sb.border_width_right = 1
		bg_sb.border_width_bottom = 1
		bg_sb.border_color = Color(0, 0, 0, 0.8)
		bg_sb.corner_radius_top_left = 2
		bg_sb.corner_radius_bottom_left = 2
		resource_bar.add_theme_stylebox_override("background", bg_sb)
	
	# Style XP bar with background
	if xp_bar:
		xp_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(ut.COLORS["xp"]))
		# Add dark background for XP bar
		var bg_sb = StyleBoxFlat.new()
		bg_sb.bg_color = Color(0.05, 0.05, 0.1, 0.9)
		bg_sb.border_width_left = 1
		bg_sb.border_width_top = 1
		bg_sb.border_width_right = 1
		bg_sb.border_width_bottom = 1
		bg_sb.border_color = Color(0, 0, 0, 0.8)
		bg_sb.corner_radius_top_left = 1
		bg_sb.corner_radius_bottom_left = 1
		xp_bar.add_theme_stylebox_override("background", bg_sb)
	
	# Style casting bar with background
	if casting_bar:
		casting_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(ut.COLORS["casting"]))
		# Add dark background for casting bar
		var bg_sb = StyleBoxFlat.new()
		bg_sb.bg_color = Color(0.1, 0.05, 0.0, 0.9)
		bg_sb.border_width_left = 1
		bg_sb.border_width_top = 1
		bg_sb.border_width_right = 1
		bg_sb.border_width_bottom = 1
		bg_sb.border_color = Color(0, 0, 0, 0.8)
		bg_sb.corner_radius_top_left = 2
		bg_sb.corner_radius_bottom_left = 2
		casting_bar.add_theme_stylebox_override("background", bg_sb)

func _ready():
	if hero_id != "":
		setup(hero_id)

func _process(_delta):
	var pm = get_node_or_null("/root/PartyManager")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if not hero: return
	
	var stats = hero.current_stats
	var hp = stats.get("health", 0)
	var max_hp = stats.get("maxHealth", 100)
	
	# Removed structured logging from _process to prevent output overflow
	# Logging should only occur on significant events, not every frame
	
	if health_bar:
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
		var type: String = rm.get_resource_type(hero_id)
		var current: float = float(rm.get_resource(hero_id, type))
		var max_res = 100.0
		if rm.hero_resources.has(hero_id):
			max_res = float(rm.hero_resources[hero_id].get("max_" + type, 100.0))
		
		resource_bar.max_value = max_res
		resource_bar.value = current
		
		# Change color based on type
		var ut = get_node_or_null("/root/UITheme")
		if ut:
			var color = ut.COLORS.get(type, ut.COLORS["mana"])
			resource_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(color))
		
		# Visual text overlay (quick readability: RuneScape-like numbers)
		if resource_text:
			var short = "M"
			if type == "energy":
				short = "E"
			elif type == "rage":
				short = "R"
			resource_text.text = "%s %d/%d" % [short, int(current), int(max_res)]
			resource_text.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
			resource_text.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
			resource_text.add_theme_constant_override("outline_size", 1)
	
	_update_status_icons()
	_update_casting_bar()

func _update_status_icons():
	if not status_container: return
	
	# Only update every few frames or on signal for performance? 
	# For now, clear and rebuild if count changed or every 0.5s
	var sem = get_node_or_null("/root/StatusEffectsManager")
	if not sem: return
	
	var active = sem.get_active_effects(hero_id)
	
	# Simple clear and rebuild for now
	for child in status_container.get_children():
		child.queue_free()
		
	for type in active:
		var _data = active[type]
		var def = sem.effect_types.get(type, {})
		
		var icon_rect = ColorRect.new()
		icon_rect.custom_minimum_size = Vector2(14, 14)
		icon_rect.color = Color.from_string(def.get("color", "ffffff"), Color.WHITE)
		
		# Use UIBuilder for status effect label
		var ui_builder = get_node_or_null("/root/UIBuilder")
		var label: Label
		if ui_builder:
			label = ui_builder.create_label(icon_rect, def.get("icon", "?"), Vector2.ZERO, {
				"font_size": 10
			})
		else:
			# Fallback to manual creation
			label = Label.new()
			label.text = def.get("icon", "?")
			label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			label.add_theme_font_size_override("font_size", 10)
			icon_rect.add_child(label)
		
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		
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

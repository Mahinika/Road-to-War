extends CharacterBody2D

# HeroSprite.gd - Modular "Paper Doll" visual representation (SOP v3.0)
# 
# Features:
# - JSON-driven equipment system (texture/modulate/glow_shader_param from items.json)
# - Class restrictions (equipment only shows for allowed classes)
# - Rarity modulation via HEX color strings
# - Glow shader parameter support for legendary/epic items
# - SOP v3.0 compliant animations (Idle: 2.0s, Walk: 0.8s, Attack: 0.4s, Jump: 0.6s, Death: 1.0s)
# - Death animation with particle burst integration
# - Backward compatibility with fallback texture system
#
# Layers: Body, Legs, Chest, Shoulder, Head, Weapon, Offhand
# Pivot: Bottom-center (64×64 grid aligned)

var hero_data
var name_label
var health_bar
var anim_player: AnimationPlayer
var class_type: String = ""
var layer_nodes: Dictionary = {}

@onready var visuals = $Visuals
@onready var body_layer = $Visuals/Body
@onready var legs_layer = $Visuals/Legs
@onready var chest_layer = $Visuals/Chest
@onready var shoulder_layer = $Visuals/Shoulder
@onready var head_layer = $Visuals/Head
@onready var weapon_layer = $Visuals/Weapon
@onready var offhand_layer = $Visuals/Offhand

@onready var status_container = get_node_or_null("StatusContainer")
@onready var casting_bar = get_node_or_null("CastingBar")

# var transparency_material = preload("res://scripts/SpriteTransparency.gdshader")

func _ready():
	name_label = get_node_or_null("NameLabel")
	health_bar = get_node_or_null("HealthBar")
	
	# Setup layer nodes dictionary
	setup_layers()
	
	var ut = get_node_or_null("/root/UITheme")
	if casting_bar and ut:
		casting_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(ut.COLORS["casting"]))
	
	# Apply transparency shader to all layers
	var shader_path = "res://scripts/SpriteTransparency.gdshader"
	if ResourceLoader.exists(shader_path):
		var shader = load(shader_path)
		if shader:
			var shader_mat = ShaderMaterial.new()
			shader_mat.shader = shader
			for layer in layer_nodes.values():
				if layer:
					layer.material = shader_mat
	
	# Programmatic AnimationPlayer
	anim_player = AnimationPlayer.new()
	add_child(anim_player)
	_setup_animations()
	
	if hero_data:
		setup(hero_data)
	
	# Connect to equipment changes
	var eq = get_node_or_null("/root/EquipmentManager")
	if eq:
		eq.equipment_changed.connect(_on_equipment_changed)

func setup_layers():
	"""Pre-create and register all layer nodes (SOP v3.0 structure)"""
	layer_nodes = {
		"body": body_layer,
		"legs": legs_layer,
		"chest": chest_layer,
		"shoulder": shoulder_layer,
		"head": head_layer,
		"weapon": weapon_layer,
		"offhand": offhand_layer
	}
	
	# Ensure pivot offset matches SOP spec (bottom-center, 64×64 grid aligned)
	# For bottom-center pivot: offset moves sprite so its bottom-center is at node position
	# For 64×64 sprite: offset = (-32, -64) to move top-left to correct position
	for layer in layer_nodes.values():
		if layer:
			layer.centered = false
			layer.offset = Vector2(-32, -64)  # Bottom-center pivot for 64×64 grid

func _setup_animations():
	"""Setup animations matching SOP v3.0 specifications"""
	var library = AnimationLibrary.new()
	
	# Idle: 2.0s loop, 4 frames, ±5px vertical bob
	var idle_anim = Animation.new()
	idle_anim.length = 2.0
	var idle_track = idle_anim.add_track(Animation.TYPE_VALUE)
	idle_anim.track_set_path(idle_track, "Visuals:position:y")
	idle_anim.track_insert_key(idle_track, 0.0, 0.0)
	idle_anim.track_insert_key(idle_track, 0.5, -5.0)
	idle_anim.track_insert_key(idle_track, 1.0, 0.0)
	idle_anim.track_insert_key(idle_track, 1.5, 5.0)
	idle_anim.track_insert_key(idle_track, 2.0, 0.0)
	# Set transitions for smooth sine wave motion
	idle_anim.track_set_interpolation_type(idle_track, Animation.INTERPOLATION_LINEAR)
	idle_anim.loop_mode = Animation.LOOP_LINEAR
	library.add_animation("idle", idle_anim)
	
	# Walk: 0.8s loop, 8 frames, ±10px bob + leg cycle
	var walk_anim = Animation.new()
	walk_anim.length = 0.8
	var walk_track = walk_anim.add_track(Animation.TYPE_VALUE)
	walk_anim.track_set_path(walk_track, "Visuals:position:y")
	walk_anim.track_insert_key(walk_track, 0.0, 0.0)
	walk_anim.track_insert_key(walk_track, 0.1, -10.0)
	walk_anim.track_insert_key(walk_track, 0.2, 0.0)
	walk_anim.track_insert_key(walk_track, 0.3, 10.0)
	walk_anim.track_insert_key(walk_track, 0.4, 0.0)
	walk_anim.track_insert_key(walk_track, 0.5, -10.0)
	walk_anim.track_insert_key(walk_track, 0.6, 0.0)
	walk_anim.track_insert_key(walk_track, 0.7, 10.0)
	walk_anim.track_insert_key(walk_track, 0.8, 0.0)
	walk_anim.track_set_interpolation_type(walk_track, Animation.INTERPOLATION_LINEAR)
	walk_anim.loop_mode = Animation.LOOP_LINEAR
	library.add_animation("walk", walk_anim)
	
	# Attack: 0.4s, 6 frames, 20px forward dash + squash/stretch
	var attack_anim = Animation.new()
	attack_anim.length = 0.4
	var attack_x_track = attack_anim.add_track(Animation.TYPE_VALUE)
	var attack_scale_track = attack_anim.add_track(Animation.TYPE_VALUE)
	
	# X position dash
	attack_anim.track_set_path(attack_x_track, "Visuals:position:x")
	attack_anim.track_insert_key(attack_x_track, 0.0, 0.0)
	attack_anim.track_insert_key(attack_x_track, 0.1, 20.0)
	attack_anim.track_insert_key(attack_x_track, 0.3, 0.0)
	attack_anim.track_insert_key(attack_x_track, 0.4, 0.0)
	
	# Scale squash/stretch
	attack_anim.track_set_path(attack_scale_track, "Visuals:scale")
	attack_anim.track_insert_key(attack_scale_track, 0.0, Vector2(1.0, 1.0))
	attack_anim.track_insert_key(attack_scale_track, 0.1, Vector2(1.2, 0.8))  # Stretch forward
	attack_anim.track_insert_key(attack_scale_track, 0.3, Vector2(1.0, 1.0))
	attack_anim.track_insert_key(attack_scale_track, 0.4, Vector2(1.0, 1.0))
	
	library.add_animation("attack", attack_anim)
	
	# Jump: 0.6s, 4 frames, scale 0.8 → 1.2
	var jump_anim = Animation.new()
	jump_anim.length = 0.6
	var jump_scale_track = jump_anim.add_track(Animation.TYPE_VALUE)
	jump_anim.track_set_path(jump_scale_track, "Visuals:scale")
	jump_anim.track_insert_key(jump_scale_track, 0.0, Vector2(1.0, 1.0))
	jump_anim.track_insert_key(jump_scale_track, 0.15, Vector2(0.8, 1.2))  # Squash down
	jump_anim.track_insert_key(jump_scale_track, 0.3, Vector2(1.2, 0.8))   # Stretch up
	jump_anim.track_insert_key(jump_scale_track, 0.6, Vector2(1.0, 1.0))  # Return
	library.add_animation("jump", jump_anim)
	
	# Death: 1.0s, 5 frames, fade out + particle burst
	var death_anim = Animation.new()
	death_anim.length = 1.0
	var death_modulate_track = death_anim.add_track(Animation.TYPE_VALUE)
	death_anim.track_set_path(death_modulate_track, "Visuals:modulate")
	death_anim.track_insert_key(death_modulate_track, 0.0, Color.WHITE)
	death_anim.track_insert_key(death_modulate_track, 0.2, Color(1.0, 1.0, 1.0, 0.8))
	death_anim.track_insert_key(death_modulate_track, 0.4, Color(1.0, 1.0, 1.0, 0.6))
	death_anim.track_insert_key(death_modulate_track, 0.6, Color(1.0, 1.0, 1.0, 0.3))
	death_anim.track_insert_key(death_modulate_track, 1.0, Color(1.0, 1.0, 1.0, 0.0))
	death_anim.track_set_interpolation_type(death_modulate_track, Animation.INTERPOLATION_LINEAR)
	library.add_animation("death", death_anim)
	
	anim_player.add_animation_library("", library)

func play_animation(anim_name: String):
	"""Play animation by name, with special handling for death animation"""
	if anim_player and anim_player.has_animation(anim_name):
		anim_player.play(anim_name)
		
		# Special handling for death animation - trigger particle burst
		if anim_name == "death":
			anim_player.animation_finished.connect(_on_death_animation_finished, ConnectFlags.CONNECT_ONE_SHOT)
			_trigger_death_particles()

func _on_death_animation_finished(anim_name: String):
	"""Called when death animation finishes"""
	if anim_name == "death":
		# Ensure fully faded out
		visuals.modulate = Color(1.0, 1.0, 1.0, 0.0)

func _trigger_death_particles():
	"""Trigger particle burst effect for death animation"""
	var pm = get_node_or_null("/root/ParticleManager")
	if pm and pm.has_method("create_death_effect"):
		pm.create_death_effect(global_position)

func setup(p_hero_data):
	hero_data = p_hero_data
	
	# Extract class type for class restriction checking (SOP v3.0)
	if hero_data:
		if hero_data is Dictionary:
			class_type = hero_data.get("class_id", "")
			if name_label and hero_data.has("name"):
				name_label.text = hero_data["name"]
		else:
			# Hero is a Resource (Hero.gd)
			if "class_id" in hero_data:
				class_type = hero_data.class_id
			if name_label and "name" in hero_data:
				name_label.text = hero_data.name
	
	if health_bar:
		var sb_bg = StyleBoxFlat.new()
		sb_bg.bg_color = Color(0.1, 0.1, 0.1, 0.8)
		health_bar.add_theme_stylebox_override("background", sb_bg)
		
		var sb_fill = StyleBoxFlat.new()
		sb_fill.bg_color = Color(0.3, 1.0, 0.3, 1.0)
		health_bar.add_theme_stylebox_override("fill", sb_fill)
	
	update_appearance()

func update_equipment_visuals():
	"""Apply equipment visuals using JSON-driven system (SOP v3.0)"""
	if not hero_data: return
	
	var hero_id = ""
	if hero_data is Dictionary:
		hero_id = hero_data.get("id", "")
	else:
		hero_id = hero_data.id
		
	if hero_id == "": return
	
	var eq = get_node_or_null("/root/EquipmentManager")
	var equipment = eq.get_hero_equipment(hero_id) if eq else {}
	
	# Reset all equipment layers (except body)
	for slot in ["legs", "chest", "shoulder", "head", "weapon", "offhand"]:
		var layer = layer_nodes.get(slot)
		if layer:
			layer.texture = null
			layer.modulate = Color.WHITE
	
	# Apply visuals for equipped items
	apply_equipment(equipment)

func apply_equipment(equipment: Dictionary):
	"""Parse JSON and apply textures/modulates with class restrictions (SOP v3.0)"""
	var eq = get_node_or_null("/root/EquipmentManager")
	for slot in equipment:
		var item_id = equipment[slot]
		if not item_id: continue
		
		var item_data = eq.get_item_data(item_id) if eq else null
		if not item_data or item_data.is_empty(): continue
		
		# Check class restriction (SOP v3.0 feature)
		if item_data.has("class_restriction"):
			var restrictions = item_data["class_restriction"]
			if restrictions is Array:
				if class_type != "" and not restrictions.has(class_type):
					continue  # Skip this item if class doesn't match
			elif restrictions is String:
				if class_type != "" and restrictions != class_type:
					continue
		
		_apply_item_visual(slot, item_data)

func update_appearance():
	# 1. Apply Base Body (Naked State)
	_apply_base_body()
	
	# 2. Apply Equipment Overlays
	update_equipment_visuals()

func _apply_base_body():
	# Use a basic humanoid silhouette as the "naked" state
	var body_tex = "humanoid_0.png"
	_set_layer_texture(body_layer, body_tex)
	# Skin tone modulation (optional)
	body_layer.modulate = Color(1.0, 0.8, 0.7) # Generic skin tone

func _apply_item_visual(slot: String, item_data: Dictionary):
	"""Apply item visual using texture/modulate/glow from JSON (SOP v3.0)"""
	# Map slots to layers (handle slot name variations)
	var mapped_slot = slot
	# Handle ring/trinket slot variations
	if slot.begins_with("ring"):
		mapped_slot = "ring"  # Use generic ring slot for visual
	elif slot.begins_with("trinket"):
		mapped_slot = "trinket"  # Use generic trinket slot for visual
	elif slot == "mainhand" or slot == "weapon":
		mapped_slot = "weapon"
	elif slot == "offhand" or slot == "shield":
		mapped_slot = "offhand"
	
	var layer = layer_nodes.get(mapped_slot)
	if not layer:
		# Try direct slot name as fallback
		layer = layer_nodes.get(slot)
		if not layer:
			return  # Slot not supported
	
	var item_type = item_data.get("type", "")
	var rarity = item_data.get("rarity", "common")
	
	# Use texture path directly from JSON if available (SOP v3.0)
	if item_data.has("texture"):
		var texture_path = item_data["texture"]
		if texture_path != "" and ResourceLoader.exists(texture_path):
			var loaded_texture = load(texture_path)
			if loaded_texture:
				layer.texture = loaded_texture
			else:
				# Fallback if load fails
				_apply_fallback_texture(layer, item_data)
		else:
			# Fallback to old system if texture path doesn't exist
			_apply_fallback_texture(layer, item_data)
	else:
		# Fallback to old texture mapping system for backward compatibility
		_apply_fallback_texture(layer, item_data)
	
	# Apply modulate from JSON if specified (SOP v3.0)
	if item_data.has("modulate"):
		var hex_color = item_data["modulate"]
		# Parse HEX color (supports #RRGGBB and #RRGGBBAA)
		layer.modulate = _parse_hex_color(hex_color)
	else:
		# Fallback to rarity-based modulation
		layer.modulate = _get_rarity_modulate(rarity)
	
	# Apply glow shader parameter if specified (SOP v3.0)
	if item_data.has("glow_shader_param"):
		var glow_intensity = float(item_data["glow_shader_param"])
		if layer.material and layer.material is ShaderMaterial:
			var shader_mat = layer.material as ShaderMaterial
			if shader_mat.shader:
				# Check if shader has the parameter before setting
				var param_list = shader_mat.shader.get_shader_parameter_list()
				for param in param_list:
					if param.name == "glow_intensity":
						shader_mat.set_shader_parameter("glow_intensity", glow_intensity)
						break
	
	# Scale based on item type (shoulders scale up to 120% per SOP)
	if slot == "shoulder":
		layer.scale = Vector2(1.2, 1.2)
	elif item_type == "armor":
		layer.scale = Vector2(1.1, 1.1)
	elif item_type == "weapon":
		layer.scale = Vector2(0.8, 0.8)
	else:
		layer.scale = Vector2(1.0, 1.0)

func _apply_fallback_texture(layer: Sprite2D, item_data: Dictionary):
	"""Fallback texture mapping for backward compatibility"""
	var tex_name = ""
	var item_type = item_data.get("type", "")
	var weapon_type = item_data.get("weapon_type", "")
	
	if item_type == "weapon":
		match weapon_type:
			"bow", "crossbow": tex_name = "humanoid_1.png"
			"staff", "wand": tex_name = "arcane_scholar.png"
			"shield": tex_name = "paladin.png"
			_: tex_name = "ancient_warrior.png"
	elif item_type == "armor":
		var armor_type = item_data.get("armor_type", "cloth")
		match armor_type:
			"plate": tex_name = "paladin.png"
			"mail": tex_name = "humanoid_5.png"
			"leather": tex_name = "shadow_assassin.png"
			"cloth": tex_name = "humanoid_2.png"
	
	if tex_name != "":
		_set_layer_texture(layer, tex_name)

func _parse_hex_color(hex: String) -> Color:
	"""Parse HEX color string (#RRGGBB or #RRGGBBAA) to Color"""
	if hex.is_empty():
		return Color.WHITE
		
	# Remove # if present
	hex = hex.replace("#", "")
	
	# Ensure we have valid hex string (6 or 8 chars)
	if hex.length() < 6:
		return Color.WHITE
	
	# Use Godot's built-in hex string to color conversion
	# Supports RRGGBB and RRGGBBAA
	return Color.from_string(hex, Color.WHITE)

func _set_layer_texture(layer: Sprite2D, tex_file: String):
	var full_path = "res://assets/sprites/" + tex_file
	if FileAccess.file_exists(full_path):
		var tex = load(full_path)
		if tex:
			layer.texture = tex
			if tex.get_width() > tex.get_height():
				layer.hframes = int(tex.get_width() / tex.get_height())
				layer.frame = 0
			
			var current_size = tex.get_height()
			if current_size < 32:
				layer.scale = Vector2(3, 3)
			elif current_size < 64:
				layer.scale = Vector2(2, 2)

func _get_rarity_modulate(rarity: String) -> Color:
	match rarity:
		"uncommon": return Color(0.5, 1.0, 0.5) # Greenish
		"rare": return Color(0.5, 0.5, 1.0) # Blueish
		"epic": return Color(0.8, 0.4, 1.0) # Purpleish
		"legendary": return Color(1.0, 0.8, 0.2) # Goldish
		_: return Color.WHITE

func _on_equipment_changed(p_hero_id, _slot, _item_id, _old_item_id):
	if not hero_data: return
	
	var current_id = ""
	if hero_data is Dictionary:
		current_id = hero_data.get("id", "")
	else:
		current_id = hero_data.id
		
	if current_id == p_hero_id:
		update_equipment_visuals()

func _process(_delta):
	_update_status_icons()
	_update_casting_bar()

func _update_status_icons():
	if not status_container or not hero_data: return
	
	var sem = get_node_or_null("/root/StatusEffectsManager")
	if not sem: return
	
	var hero_id = hero_data.get("id", "") if hero_data is Dictionary else hero_data.id
	var active = sem.get_active_effects(hero_id)
	
	for child in status_container.get_children():
		child.queue_free()
		
	for type in active:
		var def = sem.effect_types.get(type, {})
		var icon_rect = ColorRect.new()
		icon_rect.custom_minimum_size = Vector2(10, 10)
		icon_rect.color = Color.from_string(def.get("color", "ffffff"), Color.WHITE)
		status_container.add_child(icon_rect)

func _update_casting_bar():
	if not casting_bar: return
	# Placeholder for future implementation
	casting_bar.visible = false

func play_hit_flash():
	var tween = create_tween()
	visuals.modulate = Color(5, 5, 5, 1) # Bright white flash
	tween.tween_property(visuals, "modulate", Color.WHITE, 0.1)
	
	# Hit stop effect (micro-pause)
	var original_speed = anim_player.speed_scale if anim_player else 1.0
	if anim_player:
		anim_player.speed_scale = 0.0
		get_tree().create_timer(0.05).timeout.connect(func(): anim_player.speed_scale = original_speed)
	
	play_squash_and_stretch(0.8, 1.2, 0.1)

func play_squash_and_stretch(sx: float, sy: float, duration: float):
	var tween = create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(visuals, "scale", Vector2(sx, sy), duration)
	tween.tween_property(visuals, "scale", Vector2(1.0, 1.0), duration)

func play_jump_tween(target_pos: Vector2, duration: float):
	var original_pos = position
	var tween = create_tween().set_parallel(true)
	
	# Horizontal movement
	tween.tween_property(self, "position:x", target_pos.x, duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	
	# Arc movement (Y)
	var arc_tween = create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	arc_tween.tween_property(self, "position:y", position.y - 100, duration/2)
	arc_tween.tween_property(self, "position:y", target_pos.y, duration/2).set_ease(Tween.EASE_IN)
	
	# Squash and stretch during jump
	play_squash_and_stretch(1.2, 0.8, duration/4)

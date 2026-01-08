extends CharacterBody2D

# Logging helpers
func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

func _log_warn(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.warn(source, message)
	else:
		print("[%s] [WARN] %s" % [source, message])

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

# EnemySprite.gd - Visual representation of an enemy

var enemy_data
var sprite
var name_label
var health_bar
var status_container
var casting_bar
var fallback_shape
var anim_player: AnimationPlayer
var _death_animation_played: bool = false

# var transparency_material = preload("res://scripts/SpriteTransparency.gdshader")

func _ready():
	sprite = get_node_or_null("Sprite2D")
	name_label = get_node_or_null("NameLabel")
	health_bar = get_node_or_null("HealthBar")
	status_container = get_node_or_null("StatusContainer")
	casting_bar = get_node_or_null("CastingBar")
	
	if casting_bar:
		var ut = get_node_or_null("/root/UITheme")
		if ut:
			casting_bar.add_theme_stylebox_override("fill", ut.get_stylebox_bar(ut.COLORS["casting"]))
	
	if sprite:
		var shader_path = "res://scripts/SpriteTransparency.gdshader"
		if ResourceLoader.exists(shader_path):
			var shader = load(shader_path)
			if shader:
				var shader_mat = ShaderMaterial.new()
				shader_mat.shader = shader
				sprite.material = shader_mat
	
	# Programmatic AnimationPlayer
	anim_player = AnimationPlayer.new()
	add_child(anim_player)
	_setup_animations()
	
	# Fallback shape setup (hidden by default, only shown if sprite load fails)
	# fallback_shape = ColorRect.new()
	# ...
	
	# Pulsing animation for the fallback (optional)
	# var tween = create_tween().set_loops()
	# ...

func _setup_animations():
	var library = AnimationLibrary.new()
	
	# Idle animation
	var idle_anim = Animation.new()
	var track_index = idle_anim.add_track(Animation.TYPE_VALUE)
	idle_anim.track_set_path(track_index, "Sprite2D:position:y")
	idle_anim.track_insert_key(track_index, 0.0, 0.0)
	idle_anim.track_insert_key(track_index, 1.5, -3.0)
	idle_anim.track_insert_key(track_index, 3.0, 0.0)
	idle_anim.loop_mode = Animation.LOOP_LINEAR
	library.add_animation("idle", idle_anim)
	
	# Attack animation (lunging left since enemy is on right)
	var attack_anim = Animation.new()
	var attack_track = attack_anim.add_track(Animation.TYPE_VALUE)
	attack_anim.track_set_path(attack_track, "Sprite2D:position:x")
	attack_anim.track_insert_key(attack_track, 0.0, 0.0)
	attack_anim.track_insert_key(attack_track, 0.1, -30.0)
	attack_anim.track_insert_key(attack_track, 0.3, 0.0)
	library.add_animation("attack", attack_anim)
	
	# Death animation (SOP v3.0 standard)
	var death_anim = Animation.new()
	death_anim.length = 1.0
	var death_mod_track = death_anim.add_track(Animation.TYPE_VALUE)
	death_anim.track_set_path(death_mod_track, "Sprite2D:modulate")
	death_anim.track_insert_key(death_mod_track, 0.0, Color.WHITE)
	death_anim.track_insert_key(death_mod_track, 1.0, Color(1.0, 1.0, 1.0, 0.0))
	death_anim.track_set_interpolation_type(death_mod_track, Animation.INTERPOLATION_LINEAR)
	
	# Trigger particles via method call
	var method_track = death_anim.add_track(Animation.TYPE_METHOD)
	death_anim.track_set_path(method_track, ".")
	death_anim.track_insert_key(method_track, 0.0, {"method": "call_deferred", "args": ["_trigger_death_particles"]})
	library.add_animation("death", death_anim)
	
	anim_player.add_animation_library("", library)

func _trigger_death_particles():
	var pm = get_node_or_null("/root/ParticleManager")
	if pm:
		pm.create_death_effect(global_position)

func play_animation(anim_name: String):
	if anim_name == "death" and _death_animation_played:
		return
		
	if anim_player and anim_player.has_animation(anim_name):
		anim_player.play(anim_name)
		if anim_name == "death":
			_death_animation_played = true

func setup(p_enemy_data):
	enemy_data = p_enemy_data
	
	if name_label and enemy_data and "name" in enemy_data:
		name_label.text = enemy_data.name
	
	if health_bar:
		var sb_bg = StyleBoxFlat.new()
		sb_bg.bg_color = Color(0.1, 0.1, 0.1, 0.8)
		health_bar.add_theme_stylebox_override("background", sb_bg)
		
		var sb_fill = StyleBoxFlat.new()
		sb_fill.bg_color = Color(0.8, 0.2, 0.2) # Red
		health_bar.add_theme_stylebox_override("fill", sb_fill)
	
	_apply_visual_style()

func _apply_visual_style():
	if not sprite: return
	
	var texture_file = "humanoid_9.png" # Default enemy
	
	if enemy_data and "id" in enemy_data:
		var type_id = str(enemy_data.id).to_lower()
		if "orc" in type_id: texture_file = "humanoid_8.png"
		elif "wolf" in type_id: texture_file = "humanoid_7.png"
		elif "boss" in type_id: texture_file = "humanoid_6.png"
		
	var full_path = "res://assets/sprites/" + texture_file
	
	if FileAccess.file_exists(full_path):
		var tex = load(full_path)
		if tex:
			sprite.texture = tex
			sprite.centered = true
			sprite.offset = Vector2(0, -tex.get_height() / 2.0)
			sprite.scale = Vector2(1, 1) # Consistent scale of 1
			sprite.flip_h = true
			
			# Temporary: Disable outlines to debug solid boxes issue
			if false and sprite.material and sprite.material is ShaderMaterial:
				var mat = sprite.material as ShaderMaterial
				mat.set_shader_parameter("outline_color", Color(0.8, 0.2, 0.2)) # Enemy Red
				mat.set_shader_parameter("outline_width", 1.0)
	else:
		_log_warn("EnemySprite", "Texture file not found: " + full_path)

func _process(_delta):
	if enemy_data and health_bar:
		var current_hp = enemy_data.get("current_health", 0)
		var max_hp = enemy_data.get("max_health", 100)
		health_bar.max_value = max_hp
		health_bar.value = current_hp
	
	_update_status_icons()
	_update_casting_bar()

var _last_effects: Dictionary = {}

func _update_status_icons():
	if not status_container or not enemy_data: return
	
	var sem = get_node_or_null("/root/StatusEffectsManager")
	if not sem: return
	
	var instance_id = enemy_data.get("instance_id", "")
	var active = sem.get_active_effects(instance_id)
	
	# Only update if effects changed (Dictionary comparison)
	if active.hash() == _last_effects.hash():
		return
	
	_last_effects = active.duplicate(true)
	
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
	# Placeholder
	casting_bar.visible = false

func play_hit_flash():
	var tween = create_tween()
	var target_node = sprite
	if not target_node: return
	
	var original_color = target_node.modulate
	target_node.modulate = Color(5, 5, 5, 1)
	tween.tween_property(target_node, "modulate", original_color, 0.1)
		
	# Hit stop effect
	var original_speed = anim_player.speed_scale if anim_player else 1.0
	if anim_player:
		anim_player.speed_scale = 0.0
		get_tree().create_timer(0.05).timeout.connect(_reset_anim_speed.bind(original_speed))
	
	# play_squash_and_stretch() disabled - maintaining consistent scale of 1

func _reset_anim_speed(speed: float):
	if is_instance_valid(anim_player):
		anim_player.speed_scale = speed

func play_squash_and_stretch(_sx: float, _sy: float, _duration: float):
	var node_to_scale = sprite
	if not node_to_scale: return
	
	# DISABLED: Maintaining consistent scale of 1 throughout combat
	# var tween = create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	# tween.tween_property(node_to_scale, "scale", Vector2(sx, sy), duration)

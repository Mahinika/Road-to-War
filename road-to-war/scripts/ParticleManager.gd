extends Node

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

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

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

# ParticleManager.gd - Handles floating text and visual effects
# Godot 4.x particle effects system

const SCHOOL_COLORS := {
	"arcane": Color(0.6, 0.4, 1.0),
	"fire": Color(1.0, 0.4, 0.1),
	"frost": Color(0.4, 0.85, 1.0),
	"shadow": Color(0.6, 0.0, 0.9),
	"holy": Color(1.0, 0.9, 0.4),
	"nature": Color(0.2, 1.0, 0.4),
	"physical": Color(0.9, 0.9, 0.9)
}

var floating_text_scene = preload("res://scenes/FloatingText.tscn")
var object_pool: Node = null

func _ready():
	object_pool = get_node_or_null("/root/ObjectPool")
	_log_info("ParticleManager", "Initialized")

func create_floating_text(pos: Vector2, text: String, color: Color = Color.WHITE):
	var instance = null
	
	# Try to get from object pool first (performance optimization)
	if object_pool:
		instance = object_pool.acquire("floating_text")
	
	# Fallback to instantiation if pool doesn't have one
	if not instance:
		instance = floating_text_scene.instantiate()
		get_tree().root.add_child(instance)
	else:
		# Re-parent if needed (pooled instances are removed from tree)
		if instance.get_parent():
			instance.get_parent().remove_child(instance)
		get_tree().root.add_child(instance)
		# Reset state when acquiring from pool (ensures clean state)
		if instance.has_method("reset"):
			instance.reset()
	
	# Fan-out logic to prevent overlapping text
	var spread_x = randf_range(-40, 40)
	var spread_y = randf_range(-20, 0)
	var final_pos = pos + Vector2(spread_x, spread_y)
	
	instance.setup(final_pos, text, color)
	
	# Slightly randomize rise speed for "fanning" effect
	if "velocity" in instance:
		instance.velocity = Vector2(spread_x * 0.5, randf_range(-70, -40))

func create_hit_effect(pos: Vector2, spec_color: Color = Color.WHITE):
	_log_debug("ParticleManager", "Hit effect at %s" % str(pos))
	
	# Try to use generated hit impact sprite if available
	var vfx_path = "res://assets/sprites/vfx/hit_impact.png"
	if ResourceLoader.exists(vfx_path):
		var sprite = Sprite2D.new()
		sprite.texture = load(vfx_path)
		sprite.modulate = spec_color
		sprite.position = pos
		sprite.z_index = 500
		sprite.z_as_relative = false
		get_tree().root.add_child(sprite)
		
		# Animate and fade out
		var tween = get_tree().create_tween()
		tween.parallel().tween_property(sprite, "scale", Vector2(1.5, 1.5), 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(sprite, "modulate:a", 0.0, 0.3).set_trans(Tween.TRANS_LINEAR)
		tween.tween_callback(sprite.queue_free)
		return
	
	# Fallback to procedural particles
	# Impact sparks (Sharp, fast)
	var sparks = CPUParticles2D.new()
	get_tree().root.add_child(sparks)
	sparks.position = pos
	sparks.amount = 12
	sparks.one_shot = true
	sparks.explosiveness = 1.0
	sparks.spread = 180.0
	sparks.gravity = Vector2(0, 400)
	sparks.initial_velocity_min = 100.0
	sparks.initial_velocity_max = 200.0
	sparks.scale_amount_min = 3.0
	sparks.scale_amount_max = 6.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, Color.WHITE) # Always start white for flash
	gradient.add_point(0.2, spec_color) # Primary spec color
	
	# Blend spec color with red for blood/impact feel
	var impact_color = spec_color.lerp(Color.RED, 0.4)
	gradient.add_point(0.6, impact_color)
	gradient.set_color(1, Color(impact_color.r, impact_color.g, impact_color.b, 0))
	sparks.color_ramp = gradient
	
	sparks.emitting = true
	get_tree().create_timer(1.0).timeout.connect(sparks.queue_free)
	
	# Subtle dust cloud
	var dust = CPUParticles2D.new()
	get_tree().root.add_child(dust)
	dust.position = pos
	dust.amount = 6
	dust.lifetime = 0.5
	dust.one_shot = true
	dust.explosiveness = 0.9
	dust.spread = 180.0
	dust.gravity = Vector2(0, -50)
	dust.initial_velocity_min = 20.0
	dust.initial_velocity_max = 40.0
	dust.scale_amount_min = 10.0
	dust.scale_amount_max = 20.0
	dust.color = Color(0.5, 0.5, 0.5, 0.3)
	dust.emitting = true
	get_tree().create_timer(0.6).timeout.connect(dust.queue_free)

func create_heal_effect(pos: Vector2):
	_log_debug("ParticleManager", "Heal effect at %s" % str(pos))
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	
	particles.position = pos
	particles.amount = 12
	particles.one_shot = true
	particles.explosiveness = 0.5
	particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 20.0
	particles.direction = Vector2(0, -1)
	particles.gravity = Vector2(0, -100) # Float up
	particles.initial_velocity_min = 20.0
	particles.initial_velocity_max = 40.0
	particles.scale_amount_min = 1.0
	particles.scale_amount_max = 3.0
	particles.color = Color(0.2, 1, 0.2, 1) # Green for heal
	
	particles.emitting = true
	
	# Cleanup after 1.5 seconds
	get_tree().create_timer(1.5).timeout.connect(particles.queue_free)

func create_level_up_effect(pos: Vector2):
	_log_info("ParticleManager", "Level-up effect at %s" % str(pos))
	
	# Trigger screen bloom via World scene if possible
	var world = get_tree().current_scene
	if world and world.has_method("trigger_bloom"):
		world.trigger_bloom(1.0, 1.5)
	
	# Try to use generated level_up VFX sprite
	var vfx_path = "res://assets/sprites/vfx/level_up.png"
	if ResourceLoader.exists(vfx_path):
		var sprite = Sprite2D.new()
		sprite.texture = load(vfx_path)
		sprite.position = pos
		sprite.z_index = 1000
		sprite.z_as_relative = false
		get_tree().root.add_child(sprite)
		
		# Animate: scale up and rotate
		var tween = get_tree().create_tween()
		tween.parallel().tween_property(sprite, "scale", Vector2(2.5, 2.5), 0.5).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(sprite, "rotation", PI * 2, 0.5).set_trans(Tween.TRANS_LINEAR)
		tween.parallel().tween_property(sprite, "modulate:a", 0.0, 0.8).set_delay(0.3)
		tween.tween_callback(sprite.queue_free)
		return
	
	# Fallback to procedural particles
	# 1. Main burst
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 30
	particles.one_shot = true
	particles.explosiveness = 0.8
	particles.spread = 180.0
	particles.gravity = Vector2(0, -50)
	particles.initial_velocity_min = 100.0
	particles.initial_velocity_max = 200.0
	particles.scale_amount_min = 3.0
	particles.scale_amount_max = 6.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, Color.YELLOW)
	gradient.add_point(0.5, Color.GOLD)
	gradient.set_color(1, Color(1, 0.8, 0, 0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(2.0).timeout.connect(particles.queue_free)
	
	# 2. Rising stars
	var stars = CPUParticles2D.new()
	get_tree().root.add_child(stars)
	stars.position = pos + Vector2(0, 20)
	stars.amount = 15
	stars.lifetime = 2.0
	stars.one_shot = true
	stars.explosiveness = 0.2
	stars.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	stars.emission_rect_extents = Vector2(30, 5)
	stars.direction = Vector2(0, -1)
	stars.spread = 20.0
	stars.gravity = Vector2(0, -100)
	stars.initial_velocity_min = 40.0
	stars.initial_velocity_max = 80.0
	stars.scale_amount_min = 2.0
	stars.scale_amount_max = 4.0
	stars.color = Color.WHITE
	stars.emitting = true
	get_tree().create_timer(2.5).timeout.connect(stars.queue_free)

func create_combat_start_effect():
	# Compatibility hook: called by CombatHandler
	# Keep it asset-free and safe; create a subtle flash/burst near screen center.
	var view_size := get_viewport().get_visible_rect().size
	var pos := view_size * 0.5
	
	_log_debug("ParticleManager", "Combat start effect")
	
	var particles := CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 20
	particles.lifetime = 0.6
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.spread = 180.0
	particles.gravity = Vector2(0, 50)
	particles.initial_velocity_min = 80.0
	particles.initial_velocity_max = 140.0
	particles.scale_amount_min = 4.0
	particles.scale_amount_max = 10.0
	
	var gradient := Gradient.new()
	gradient.set_color(0, Color.WHITE)
	gradient.add_point(0.3, Color(1.0, 0.9, 0.6, 1.0))
	gradient.set_color(1, Color(1.0, 0.9, 0.6, 0.0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(1.0).timeout.connect(particles.queue_free)

func create_victory_effect():
	# Compatibility hook: called by CombatHandler when combat ends in victory.
	var view_size := get_viewport().get_visible_rect().size
	var pos := view_size * 0.5 + Vector2(0, -60)
	
	_log_info("ParticleManager", "Victory effect")
	create_floating_text(pos, "VICTORY!", Color.GOLD)
	
	var particles := CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 35
	particles.lifetime = 1.0
	particles.one_shot = true
	particles.explosiveness = 0.9
	particles.spread = 180.0
	particles.gravity = Vector2(0, 120)
	particles.initial_velocity_min = 120.0
	particles.initial_velocity_max = 260.0
	particles.scale_amount_min = 6.0
	particles.scale_amount_max = 14.0
	
	var gradient := Gradient.new()
	gradient.set_color(0, Color.WHITE)
	gradient.add_point(0.2, Color.GOLD)
	gradient.add_point(0.7, Color.ORANGE)
	gradient.set_color(1, Color(1, 0.8, 0, 0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(1.6).timeout.connect(particles.queue_free)

func create_crit_effect(pos: Vector2, spec_color: Color = Color.WHITE):
	_log_debug("ParticleManager", "Crit effect at %s" % str(pos))
	
	# Declare variables at function level to avoid scope warnings
	var crit_color: Color = spec_color.lerp(Color.GOLD, 0.6)
	var tween: Tween = null
	
	# Try to use generated critical hit VFX sprite
	var vfx_path = "res://assets/sprites/vfx/critical_hit.png"
	if ResourceLoader.exists(vfx_path):
		var sprite = Sprite2D.new()
		sprite.texture = load(vfx_path)
		# Mix gold with spec color for crits
		crit_color = spec_color.lerp(Color.GOLD, 0.6)
		sprite.modulate = crit_color
		sprite.position = pos
		sprite.z_index = 500
		sprite.z_as_relative = false
		get_tree().root.add_child(sprite)
		
		# Animate and fade out
		tween = get_tree().create_tween()
		tween.parallel().tween_property(sprite, "scale", Vector2(2.0, 2.0), 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(sprite, "modulate:a", 0.0, 0.5).set_trans(Tween.TRANS_LINEAR)
		tween.tween_callback(sprite.queue_free)
		return
	
	# Fallback to procedural particles
	# Sharp burst with spec-specific highlights
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 16
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.spread = 180.0
	particles.gravity = Vector2(0, 300)
	particles.initial_velocity_min = 150.0
	particles.initial_velocity_max = 250.0
	particles.scale_amount_min = 4.0
	particles.scale_amount_max = 8.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, Color.WHITE)
	
	# Mix gold with spec color for crits (use function-level variable)
	crit_color = spec_color.lerp(Color.GOLD, 0.6)
	gradient.add_point(0.3, crit_color)
	gradient.add_point(0.7, crit_color.lerp(Color.ORANGE_RED, 0.5))
	gradient.set_color(1, Color(1, 0, 0, 0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(1.0).timeout.connect(particles.queue_free)

func create_death_effect(pos: Vector2):
	_log_debug("ParticleManager", "Death effect at %s" % str(pos))
	
	# Try to use generated death_poof VFX sprite
	var vfx_path = "res://assets/sprites/vfx/death_poof.png"
	if ResourceLoader.exists(vfx_path):
		var sprite = Sprite2D.new()
		sprite.texture = load(vfx_path)
		sprite.position = pos
		sprite.z_index = 500
		sprite.z_as_relative = false
		get_tree().root.add_child(sprite)
		
		# Animate: scale up and fade out
		var tween = get_tree().create_tween()
		tween.parallel().tween_property(sprite, "scale", Vector2(1.8, 1.8), 1.0).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(sprite, "position:y", pos.y - 20, 1.0).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(sprite, "modulate:a", 0.0, 1.2).set_trans(Tween.TRANS_LINEAR)
		tween.tween_callback(sprite.queue_free)
		return
	
	# Fallback to procedural particles
	# Dark/Shadowy dissolve effect
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 20
	particles.lifetime = 1.2
	particles.one_shot = true
	particles.explosiveness = 0.9
	particles.spread = 180.0
	particles.gravity = Vector2(0, -40) # Slowly float up
	particles.initial_velocity_min = 40.0
	particles.initial_velocity_max = 80.0
	particles.scale_amount_min = 4.0
	particles.scale_amount_max = 8.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, Color(0.1, 0.1, 0.1, 1)) # Dark base
	gradient.add_point(0.5, Color(0.3, 0.3, 0.3, 0.8))
	gradient.set_color(1, Color(0, 0, 0, 0)) # Fade to nothing
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(1.5).timeout.connect(particles.queue_free)

func create_poison_effect(pos: Vector2):
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 15
	particles.lifetime = 1.5
	particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 15.0
	particles.gravity = Vector2(0, -20)
	particles.initial_velocity_min = 5.0
	particles.initial_velocity_max = 15.0
	particles.scale_amount_min = 2.0
	particles.scale_amount_max = 5.0
	particles.color = Color(0.5, 0.0, 0.5, 0.6) # Purple poison cloud
	particles.emitting = true
	get_tree().create_timer(2.0).timeout.connect(particles.queue_free)

func create_stun_effect(pos: Vector2):
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos + Vector2(0, -30)
	particles.amount = 6
	particles.lifetime = 1.0
	particles.spread = 180.0
	particles.gravity = Vector2(0, 0)
	particles.initial_velocity_min = 30.0
	particles.initial_velocity_max = 40.0
	particles.orbit_velocity_min = 2.0
	particles.orbit_velocity_max = 3.0
	particles.color = Color(1.0, 1.0, 0.2, 1) # Yellow stun stars
	particles.emitting = true
	get_tree().create_timer(1.2).timeout.connect(particles.queue_free)

func create_cast_effect(pos: Vector2, color: Color = Color.CYAN):
	# Quick "cast" burst around the caster (school-colored).
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos + Vector2(0, -20)
	particles.amount = 10
	particles.lifetime = 0.55
	particles.one_shot = true
	particles.explosiveness = 0.8
	particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 10.0
	particles.direction = Vector2(0, -1)
	particles.spread = 45.0
	particles.gravity = Vector2(0, -60)
	particles.initial_velocity_min = 30.0
	particles.initial_velocity_max = 70.0
	particles.scale_amount_min = 2.0
	particles.scale_amount_max = 5.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, Color.WHITE)
	gradient.add_point(0.25, color)
	gradient.set_color(1, Color(color.r, color.g, color.b, 0.0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(0.9).timeout.connect(particles.queue_free)

func create_magic_impact_effect(pos: Vector2, color: Color = Color.CYAN):
	# Quick impact burst (school-colored). Avoid the red/blood bias of create_hit_effect().
	# Try to use generated VFX sprite if available
	var vfx_path = "res://assets/sprites/vfx/heal_burst.png"
	if color.r < 0.5 and color.g > 0.7: # Green = heal
		vfx_path = "res://assets/sprites/vfx/heal_burst.png"
	else: # Other colors = magic impact
		vfx_path = "res://assets/sprites/vfx/hit_impact.png"
	
	if ResourceLoader.exists(vfx_path):
		var sprite = Sprite2D.new()
		sprite.texture = load(vfx_path)
		sprite.modulate = color
		sprite.position = pos
		sprite.z_index = 500
		sprite.z_as_relative = false
		get_tree().root.add_child(sprite)
		
		# Animate and fade out
		var tween = get_tree().create_tween()
		tween.parallel().tween_property(sprite, "scale", Vector2(1.8, 1.8), 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(sprite, "modulate:a", 0.0, 0.4).set_trans(Tween.TRANS_LINEAR)
		tween.tween_callback(sprite.queue_free)
		return
	
	# Fallback to procedural particles
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 12
	particles.lifetime = 0.6
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.spread = 180.0
	particles.gravity = Vector2(0, 180)
	particles.initial_velocity_min = 80.0
	particles.initial_velocity_max = 160.0
	particles.scale_amount_min = 3.0
	particles.scale_amount_max = 7.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, Color.WHITE)
	gradient.add_point(0.2, color)
	gradient.set_color(1, Color(color.r, color.g, color.b, 0.0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(1.0).timeout.connect(particles.queue_free)

func create_spell_projectile(from_pos: Vector2, to_pos: Vector2, color: Color = Color.CYAN, style: String = "bolt", speed: float = 1200.0, on_arrived: Callable = Callable()) -> Node2D:
	# Enhanced spell projectile VFX with optional sprite-based rendering.
	# - style "bolt": lightning-like jagged line + glow, OR uses magic_bolt.png sprite
	# - style "orb": small glowing orb with trailing particles, OR uses fire_ball.png sprite
	# - Supports generated projectile sprites from res://assets/sprites/projectiles/
	var projectile := Node2D.new()
	# Prefer current scene so Z-ordering matches the world canvas; fallback to root for safety.
	var parent: Node = get_tree().current_scene if get_tree() else null
	if not parent:
		parent = get_tree().root
	parent.add_child(projectile)
	projectile.global_position = from_pos
	projectile.z_index = 1000
	projectile.z_as_relative = false
	
	var dist: float = from_pos.distance_to(to_pos)
	var duration: float = 0.12
	if speed > 1.0:
		duration = clamp(dist / speed, 0.08, 0.6)
	
	projectile.look_at(to_pos)
	
	# Try to use generated projectile sprite if available
	var sprite_style_map = {
		"bolt": "magic_bolt",
		"orb": "fire_ball",
		"missile": "arcane_missile",
		"lightning": "lightning_bolt",
		"shard": "ice_shard",
		"cloud": "poison_cloud"
	}
	var sprite_name = sprite_style_map.get(style, "magic_bolt")
	var sprite_path = "res://assets/sprites/projectiles/%s.png" % sprite_name
	if ResourceLoader.exists(sprite_path):
		var sprite = Sprite2D.new()
		sprite.texture = load(sprite_path)
		sprite.modulate = color
		projectile.add_child(sprite)
		# Animate sprite (pulse/rotate) - continuous animation with infinite loops
		var pulse_tween = get_tree().create_tween()
		pulse_tween.set_loops(-1)  # -1 = infinite loops (explicit, prevents detection error)
		pulse_tween.tween_property(sprite, "scale", Vector2(1.2, 1.2), 0.3).set_trans(Tween.TRANS_SINE)
		pulse_tween.tween_property(sprite, "scale", Vector2(1.0, 1.0), 0.3).set_trans(Tween.TRANS_SINE)
		
		# Move projectile
		var move_tween := get_tree().create_tween()
		move_tween.tween_property(projectile, "global_position", to_pos, duration).set_trans(Tween.TRANS_LINEAR).set_ease(Tween.EASE_IN_OUT)
		move_tween.finished.connect(func():
			# Validate captured references before use
			if is_instance_valid(projectile):
				if on_arrived.is_valid():
					on_arrived.call()
				projectile.queue_free()
		)
		return projectile
	
	# Fallback to procedural rendering (original code)
	
	if style == "orb":
		var trail := CPUParticles2D.new()
		projectile.add_child(trail)
		trail.amount = 20
		trail.lifetime = 0.25
		trail.emitting = true
		trail.one_shot = false
		trail.explosiveness = 0.0
		trail.spread = 30.0
		trail.gravity = Vector2.ZERO
		trail.initial_velocity_min = 10.0
		trail.initial_velocity_max = 30.0
		trail.scale_amount_min = 2.0
		trail.scale_amount_max = 4.0
		
		var grad := Gradient.new()
		grad.set_color(0, Color(color.r, color.g, color.b, 0.9))
		grad.set_color(1, Color(color.r, color.g, color.b, 0.0))
		trail.color_ramp = grad
		
		# Simple "orb" using a short bright line + glow (cheap, no textures)
		var core := Line2D.new()
		projectile.add_child(core)
		core.width = 6.0
		core.default_color = Color(color.r, color.g, color.b, 0.95)
		core.points = PackedVector2Array([Vector2.ZERO, Vector2(-10, 0)])
		
		var glow := Line2D.new()
		projectile.add_child(glow)
		glow.width = 14.0
		glow.default_color = Color(color.r, color.g, color.b, 0.25)
		glow.points = PackedVector2Array([Vector2.ZERO, Vector2(-10, 0)])
	else:
		# "bolt": jagged lightning segment + soft glow, regenerated a few times while traveling
		var bolt_len: float = clamp(dist * 0.15, 30.0, 90.0)
		
		var glow := Line2D.new()
		projectile.add_child(glow)
		glow.width = 14.0
		glow.default_color = Color(color.r, color.g, color.b, 0.22)
		glow.antialiased = true
		
		var core := Line2D.new()
		projectile.add_child(core)
		core.width = 5.0
		core.default_color = Color(1, 1, 1, 0.95)
		core.antialiased = true
		
		var tint := Line2D.new()
		projectile.add_child(tint)
		tint.width = 3.0
		tint.default_color = Color(color.r, color.g, color.b, 0.85)
		tint.antialiased = true
		
		var regen_bolt_points: Callable = func() -> void:
			# Validate captured nodes before accessing them
			if not is_instance_valid(projectile) or not is_instance_valid(glow) or not is_instance_valid(core) or not is_instance_valid(tint):
				return
			var p0 := Vector2.ZERO
			var p3 := Vector2(-bolt_len, 0)
			var jitter: float = max(4.0, bolt_len * 0.18)
			var p1 := Vector2(-bolt_len * 0.33, randf_range(-jitter, jitter))
			var p2 := Vector2(-bolt_len * 0.66, randf_range(-jitter, jitter))
			var pts := PackedVector2Array([p0, p1, p2, p3])
			if is_instance_valid(glow):
				glow.points = pts
			if is_instance_valid(core):
				core.points = pts
			if is_instance_valid(tint):
				tint.points = pts
		
		regen_bolt_points.call()
		# Flicker a few times to feel alive (timers are short; safe to let them die when node frees)
		for i in range(3):
			get_tree().create_timer(duration * (0.25 + float(i) * 0.2)).timeout.connect(regen_bolt_points)
	
	# Move procedural projectile
	var tween := get_tree().create_tween()
	tween.tween_property(projectile, "global_position", to_pos, duration).set_trans(Tween.TRANS_LINEAR).set_ease(Tween.EASE_IN_OUT)
	tween.finished.connect(func():
		# Validate captured references before use
		if is_instance_valid(projectile):
			if on_arrived.is_valid():
				on_arrived.call()
			projectile.queue_free()
	)
	
	return projectile

func create_projectile(from_pos: Vector2, to_pos: Vector2, color: Color, visuals: Dictionary = {}):
	# Visual spell projectiles (travel from caster to target).
	var style = str(visuals.get("style", "generic"))
	var speed = float(visuals.get("speed", 1000.0))
	
	var projectile = Node2D.new()
	get_tree().root.add_child(projectile)
	projectile.global_position = from_pos
	
	# 1. Primary Glow/Ball
	var main_glow = CPUParticles2D.new()
	projectile.add_child(main_glow)
	main_glow.amount = 15
	main_glow.lifetime = 0.3
	main_glow.explosiveness = 0.1
	main_glow.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	main_glow.emission_sphere_radius = 8.0
	main_glow.gravity = Vector2.ZERO
	main_glow.scale_amount_min = 4.0
	main_glow.scale_amount_max = 8.0
	main_glow.color = Color.WHITE
	
	# 2. Trail (School Colored)
	var trail = CPUParticles2D.new()
	projectile.add_child(trail)
	trail.amount = 30
	trail.lifetime = 0.4
	trail.local_coords = false # Particles stay in world space
	trail.gravity = Vector2.ZERO
	trail.initial_velocity_min = 0.0
	trail.initial_velocity_max = 5.0
	trail.scale_amount_min = 3.0
	trail.scale_amount_max = 6.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, color)
	gradient.set_color(1, Color(color.r, color.g, color.b, 0.0))
	trail.color_ramp = gradient
	
	# Apply style-specific tweaks
	if style == "lightning":
		trail.amount = 50
		trail.lifetime = 0.2
		trail.spread = 180.0
		trail.initial_velocity_min = 20.0
		trail.initial_velocity_max = 50.0
		main_glow.scale_amount_max = 12.0 # Bigger flash
	elif style == "fire" or style == "lava":
		trail.gravity = Vector2(0, -100) # Smoke/fire rises
		trail.scale_amount_max = 10.0
	
	main_glow.emitting = true
	trail.emitting = true
	
	# 3. Movement
	var distance = from_pos.distance_to(to_pos)
	var duration = distance / speed
	
	var tween = get_tree().create_tween()
	tween.tween_property(projectile, "global_position", to_pos, duration).set_trans(Tween.TRANS_LINEAR)
	
	# Rotate to face target
	projectile.look_at(to_pos)
	
	# Store values to avoid capturing nodes
	var impact_pos = to_pos
	var impact_color = color
	tween.finished.connect(func():
		# Validate before accessing captured references
		if is_instance_valid(projectile):
			create_magic_impact_effect(impact_pos, impact_color)
			projectile.queue_free()
	)

# ============================================
# PROCEDURAL SPELL VFX SYSTEM (Data-Driven)
# ============================================
# Generates spell visuals from data, not hand-crafted assets
# Supports: Projectile, Beam, Ground AOE, Self-Buff, Impact

func create_spell_vfx(spell_data: Dictionary, caster_pos: Vector2, target_pos: Vector2 = Vector2.ZERO):
	"""
	Main entry point for procedural spell VFX generation.
	
	spell_data should contain:
	- "element": "fire", "frost", "shadow", "holy", "nature", "arcane", "physical"
	- "delivery": "projectile", "beam", "instant", "ground_aoe", "self_buff"
	- "style": "bolt", "orb", "beam", "explosion", "aura"
	- "power": 1-5 (affects size/intensity)
	- "speed": float (for projectiles/beams)
	- "duration": float (for beams/channeled)
	- "aoe_radius": float (for ground AOE)
	"""
	var element = str(spell_data.get("element", "arcane"))
	var delivery = str(spell_data.get("delivery", "instant"))
	var style = str(spell_data.get("style", "orb"))
	var power = float(spell_data.get("power", 2))
	var speed = float(spell_data.get("speed", 1200.0))
	
	var school_color: Color = SCHOOL_COLORS.get(element, Color.CYAN)
	
	match delivery:
		"projectile":
			create_spell_projectile(caster_pos, target_pos, school_color, style, speed)
		"beam":
			var duration = float(spell_data.get("duration", 3.0))
			create_spell_beam(caster_pos, target_pos, school_color, style, duration, power)
		"ground_aoe":
			var radius = float(spell_data.get("aoe_radius", 200.0))
			var duration = float(spell_data.get("duration", 5.0))
			create_ground_aoe_effect(target_pos, school_color, radius, duration, element)
		"self_buff":
			create_self_buff_effect(caster_pos, school_color, style, power)
		"instant", _:
			create_magic_impact_effect(target_pos, school_color)

func create_spell_beam(from_pos: Vector2, to_pos: Vector2, color: Color, _style: String = "beam", duration: float = 3.0, power: float = 2.0):
	"""
	Create a channeled beam effect (e.g., Arcane Missiles, Mind Flay).
	Beam continuously connects caster to target for duration.
	"""
	var beam := Node2D.new()
	var parent: Node = get_tree().current_scene if get_tree() else null
	if not parent:
		parent = get_tree().root
	parent.add_child(beam)
	beam.global_position = from_pos
	beam.z_index = 1000
	beam.z_as_relative = false
	
	# Beam core (bright line)
	var core := Line2D.new()
	beam.add_child(core)
	core.width = 4.0 + (power * 2.0)
	core.default_color = Color(1, 1, 1, 0.9)
	core.antialiased = true
	
	# Beam glow (wider, softer)
	var glow := Line2D.new()
	beam.add_child(glow)
	glow.width = 12.0 + (power * 4.0)
	glow.default_color = Color(color.r, color.g, color.b, 0.3)
	glow.antialiased = true
	
	# Update beam points continuously
	var update_beam: Callable = func() -> void:
		# Validate captured node references before use
		if not is_instance_valid(beam):
			return
		# Core and glow are children of beam, so if beam is valid, check they still exist
		if not beam.get_child_count() >= 2:
			return
		var core_node = beam.get_child(0) if beam.get_child_count() > 0 else null
		var glow_node = beam.get_child(1) if beam.get_child_count() > 1 else null
		if not (is_instance_valid(core_node) and is_instance_valid(glow_node)):
			return
		
		var current_to = to_pos
		# Allow target to move (for dynamic beams) - re-fetch to avoid stale scene reference
		if beam.has_meta("target_id"):
			var current_scene = get_tree().current_scene
			if current_scene and current_scene.has_method("_find_unit_node"):
				var target_node = current_scene._find_unit_node(str(beam.get_meta("target_id")))
				if target_node and is_instance_valid(target_node):
					current_to = target_node.global_position + Vector2(0, -40)
		
		var points := PackedVector2Array([Vector2.ZERO, beam.to_local(current_to)])
		core_node.points = points
		glow_node.points = points
	
	# Particles along beam
	var particles := CPUParticles2D.new()
	beam.add_child(particles)
	particles.amount = int(20 + power * 10)
	particles.lifetime = 0.3
	particles.emitting = true
	particles.one_shot = false
	particles.local_coords = false
	particles.gravity = Vector2.ZERO
	particles.initial_velocity_min = 50.0
	particles.initial_velocity_max = 150.0
	particles.spread = 15.0
	particles.scale_amount_min = 2.0
	particles.scale_amount_max = 4.0 + power
	
	var grad := Gradient.new()
	grad.set_color(0, color)
	grad.set_color(1, Color(color.r, color.g, color.b, 0.0))
	particles.color_ramp = grad
	
	# Update beam continuously using a timer-based approach instead of infinite tween
	# (infinite tween loops with callbacks can cause issues, so use a timer)
	var update_timer := Timer.new()
	update_timer.wait_time = 0.016  # ~60fps updates
	update_timer.autostart = true
	update_timer.timeout.connect(update_beam)
	beam.add_child(update_timer)
	
	# Clean up after duration - store references to avoid capture issues
	var beam_ref = beam
	var timer_ref = update_timer
	get_tree().create_timer(duration).timeout.connect(func():
		# Validate captured references before use
		if is_instance_valid(timer_ref):
			timer_ref.queue_free()
		if is_instance_valid(beam_ref):
			beam_ref.queue_free()
	)
	
	update_beam.call()

func create_ground_aoe_effect(center_pos: Vector2, color: Color, radius: float, duration: float, element: String):
	"""
	Create a ground-based AOE effect (e.g., Blizzard, Rain of Fire, Consecration).
	Persistent effect at a location for duration.
	"""
	var aoe := Node2D.new()
	var parent: Node = get_tree().current_scene if get_tree() else null
	if not parent:
		parent = get_tree().root
	parent.add_child(aoe)
	aoe.global_position = center_pos
	aoe.z_index = 0  # Ground level
	aoe.z_as_relative = false
	
	# Ground particles (falling/rising based on element)
	var ground_particles := CPUParticles2D.new()
	aoe.add_child(ground_particles)
	ground_particles.amount = int(30 + radius * 0.1)
	ground_particles.lifetime = 1.0
	ground_particles.emitting = true
	ground_particles.one_shot = false
	ground_particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	ground_particles.emission_sphere_radius = radius
	ground_particles.spread = 360.0
	
	# Element-specific behavior
	match element:
		"frost":
			ground_particles.gravity = Vector2(0, 200)  # Snow falls
			ground_particles.initial_velocity_min = 20.0
			ground_particles.initial_velocity_max = 60.0
		"fire":
			ground_particles.gravity = Vector2(0, -50)  # Fire/smoke rises
			ground_particles.initial_velocity_min = 30.0
			ground_particles.initial_velocity_max = 80.0
		"shadow", "arcane":
			ground_particles.gravity = Vector2.ZERO  # Floating particles
			ground_particles.initial_velocity_min = 10.0
			ground_particles.initial_velocity_max = 30.0
		_:
			ground_particles.gravity = Vector2(0, 100)
			ground_particles.initial_velocity_min = 20.0
			ground_particles.initial_velocity_max = 50.0
	
	ground_particles.scale_amount_min = 3.0
	ground_particles.scale_amount_max = 6.0
	
	var grad := Gradient.new()
	grad.set_color(0, color)
	grad.set_color(1, Color(color.r, color.g, color.b, 0.0))
	ground_particles.color_ramp = grad
	
	# Ground circle indicator (subtle)
	var circle := Line2D.new()
	aoe.add_child(circle)
	circle.width = 2.0
	circle.default_color = Color(color.r, color.g, color.b, 0.4)
	circle.antialiased = true
	
	# Generate circle points
	var circle_points := PackedVector2Array()
	var segments = 32
	for i in range(segments + 1):
		var angle = (float(i) / float(segments)) * TAU
		circle_points.append(Vector2(cos(angle) * radius, sin(angle) * radius))
	circle.points = circle_points
	
	# Clean up after duration - store reference to avoid capture issues
	var aoe_ref = aoe
	get_tree().create_timer(duration).timeout.connect(func():
		# Validate captured reference before use
		if is_instance_valid(aoe_ref):
			aoe_ref.queue_free()
	)

func create_self_buff_effect(pos: Vector2, color: Color, _style: String = "aura", power: float = 2.0):
	"""
	Create a self-buff visual effect (e.g., Power Word: Shield, Ice Barrier, buffs).
	Glowing aura around the caster.
	"""
	var buff := Node2D.new()
	var parent: Node = get_tree().current_scene if get_tree() else null
	if not parent:
		parent = get_tree().root
	parent.add_child(buff)
	buff.global_position = pos + Vector2(0, -40)
	buff.z_index = 500
	buff.z_as_relative = false
	
	# Orbiting particles
	var particles := CPUParticles2D.new()
	buff.add_child(particles)
	particles.amount = int(15 + power * 5)
	particles.lifetime = 2.0
	particles.emitting = true
	particles.one_shot = false
	particles.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 20.0 + (power * 5.0)
	particles.spread = 360.0
	particles.gravity = Vector2.ZERO
	particles.initial_velocity_min = 10.0
	particles.initial_velocity_max = 30.0
	particles.scale_amount_min = 2.0
	particles.scale_amount_max = 4.0 + power
	
	var grad := Gradient.new()
	grad.set_color(0, color)
	grad.set_color(1, Color(color.r, color.g, color.b, 0.0))
	particles.color_ramp = grad
	
	# Pulsing glow ring
	var ring := Line2D.new()
	buff.add_child(ring)
	ring.width = 3.0 + power
	ring.default_color = Color(color.r, color.g, color.b, 0.6)
	ring.antialiased = true
	
	var ring_radius = 25.0 + (power * 5.0)
	var ring_points := PackedVector2Array()
	var segments = 24
	for i in range(segments + 1):
		var angle = (float(i) / float(segments)) * TAU
		ring_points.append(Vector2(cos(angle) * ring_radius, sin(angle) * ring_radius))
	ring.points = ring_points
	
	# Pulse animation - use tween_method to safely tween alpha component
	var pulse_tween := get_tree().create_tween()
	pulse_tween.set_loops(-1)  # -1 = infinite loops for continuous pulse animation (explicit, prevents detection error)
	var base_color = ring.default_color
	# Tween alpha from 0.2 to 0.6 and back
	pulse_tween.tween_method(func(alpha: float):
		ring.default_color = Color(base_color.r, base_color.g, base_color.b, alpha)
	, 0.2, 0.6, 0.5).set_ease(Tween.EASE_IN_OUT)
	pulse_tween.tween_method(func(alpha: float):
		ring.default_color = Color(base_color.r, base_color.g, base_color.b, alpha)
	, 0.6, 0.2, 0.5).set_ease(Tween.EASE_IN_OUT)
	
	# Store reference so it can be removed when buff expires
	buff.set_meta("is_buff_effect", true)
	return buff

func create_boss_finisher_effect(pos: Vector2):
	_log_info("ParticleManager", "BOSS FINISHER at %s" % str(pos))
	
	# Trigger screen bloom
	var world = get_tree().current_scene
	if world and world.has_method("trigger_bloom"):
		world.trigger_bloom(2.0, 3.0)
	
	# Heavy slow motion (Engine.time_scale)
	Engine.time_scale = 0.2
	get_tree().create_timer(0.5, true, false, true).timeout.connect(_reset_time_scale)
	
	# Massive golden explosion
	var particles = CPUParticles2D.new()
	get_tree().root.add_child(particles)
	particles.position = pos
	particles.amount = 100
	particles.one_shot = true
	particles.explosiveness = 1.0
	particles.spread = 180.0
	particles.gravity = Vector2(0, 0)
	particles.initial_velocity_min = 300.0
	particles.initial_velocity_max = 800.0
	particles.scale_amount_min = 10.0
	particles.scale_amount_max = 30.0
	
	var gradient = Gradient.new()
	gradient.set_color(0, Color.WHITE)
	gradient.add_point(0.2, Color.GOLD)
	gradient.add_point(0.6, Color.ORANGE)
	gradient.set_color(1, Color(1, 0, 0, 0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(4.0, true).timeout.connect(particles.queue_free)
	
	# Shake camera heavily
	var cam = get_node_or_null("/root/CameraManager")
	if cam:
		cam.shake(30.0, 1.5)
	
func _reset_time_scale():
	Engine.time_scale = 1.0

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
# Ported from the Phaser 3 implementation

var floating_text_scene = preload("res://scenes/FloatingText.tscn")

func _ready():
	_log_info("ParticleManager", "Initialized")

func create_floating_text(pos: Vector2, text: String, color: Color = Color.WHITE):
	var instance = floating_text_scene.instantiate()
	get_tree().root.add_child(instance)
	
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

func create_crit_effect(pos: Vector2, spec_color: Color = Color.WHITE):
	_log_debug("ParticleManager", "Crit effect at %s" % str(pos))
	
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
	
	# Mix gold with spec color for crits
	var crit_color = spec_color.lerp(Color.GOLD, 0.6)
	gradient.add_point(0.3, crit_color)
	gradient.add_point(0.7, crit_color.lerp(Color.ORANGE_RED, 0.5))
	gradient.set_color(1, Color(1, 0, 0, 0))
	particles.color_ramp = gradient
	
	particles.emitting = true
	get_tree().create_timer(1.0).timeout.connect(particles.queue_free)

func create_death_effect(pos: Vector2):
	_log_debug("ParticleManager", "Death effect at %s" % str(pos))
	
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

func create_boss_finisher_effect(pos: Vector2):
	_log_info("ParticleManager", "BOSS FINISHER at %s" % str(pos))
	
	# Heavy slow motion (Engine.time_scale)
	Engine.time_scale = 0.2
	get_tree().create_timer(0.5, true, false, true).timeout.connect(func(): Engine.time_scale = 1.0)
	
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

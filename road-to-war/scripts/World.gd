extends Node2D

# World.gd - Visual world and hero management (Multi-Enemy Support)

# Logging helpers
func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var hero_group
var enemy_group
var parallax_bg
var road_line
var camera
var highlight_ring: Polygon2D

var hero_scene = preload("res://scenes/HeroSprite.tscn")
var enemy_scene = preload("res://scenes/EnemySprite.tscn")
var hud_scene = preload("res://scenes/HUD.tscn")
var combat_log_scene = preload("res://scenes/CombatLog.tscn")

func _init():
	print("World: _init() called")

var current_biome: String = ""
var sky_rect: ColorRect
var mountain_polygons: Array = []
var tree_polygons: Array = []

func _ready():
	print("World: _ready() started")
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.is_in_game = true
	# Find groups
	hero_group = get_node_or_null("HeroGroup")
	enemy_group = get_node_or_null("EnemyGroup")
	parallax_bg = get_node_or_null("ParallaxBackground")
	
	# RESET POSITIONS to ensure absolute coordinate spawning works
	if hero_group: hero_group.position = Vector2.ZERO
	if enemy_group: enemy_group.position = Vector2.ZERO
	
	# Create Camera if missing
	camera = Camera2D.new()
	camera.anchor_mode = Camera2D.ANCHOR_MODE_FIXED_TOP_LEFT
	add_child(camera)
	camera.make_current()
	
	if has_node("/root/CameraManager"):
		var cam_m = get_node("/root/CameraManager")
		cam_m.register_camera(camera)
	
	# Add atmospheric lighting controller
	var lighting = CanvasModulate.new()
	lighting.name = "AtmosphericLighting"
	add_child(lighting)
	lighting.color = Color.WHITE
	
	print("World: Initialized with groups reset to ZERO")
	_setup_parallax_visuals()
	_setup_road()
	
	# Safe fetch managers
	var pm = get_node_or_null("/root/PartyManager")
	var wm = get_node_or_null("/root/WorldManager")
	var cm = get_node_or_null("/root/CombatManager")
	
	if pm:
		if pm.heroes.is_empty():
			_create_test_party()
		spawn_party()
	
	# UI setup
	var view_size = get_viewport_rect().size
	
	# Use CanvasLayer for UI to ensure it stays on top and doesn't scroll
	var canvas_layer = CanvasLayer.new()
	add_child(canvas_layer)
	
	var hud = hud_scene.instantiate()
	canvas_layer.add_child(hud)
	
	var combat_log = combat_log_scene.instantiate()
	canvas_layer.add_child(combat_log)
	if combat_log is Control:
		combat_log.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
		combat_log.custom_minimum_size = Vector2(400, 200)
		combat_log.position = Vector2(20, view_size.y - 220)
		combat_log.z_index = 100
	
	# Connect signals
	if wm:
		if not wm.mile_changed.is_connected(_on_mile_changed):
			wm.mile_changed.connect(_on_mile_changed)
		if not wm.combat_triggered.is_connected(_on_combat_triggered):
			wm.combat_triggered.connect(_on_combat_triggered)
		wm.initialize_world()
	
	if cm:
		if not cm.combat_started.is_connected(_on_combat_started):
			cm.combat_started.connect(_on_combat_started)
		if not cm.combat_ended.is_connected(_on_combat_ended):
			cm.combat_ended.connect(_on_combat_ended)
		if not cm.damage_dealt.is_connected(_on_damage_dealt):
			cm.damage_dealt.connect(_on_damage_dealt)
		if not cm.healing_applied.is_connected(_on_healing_applied):
			cm.healing_applied.connect(_on_healing_applied)
	
	if has_node("/root/CombatActions"):
		var ca = get_node("/root/CombatActions")
		ca.unit_acting.connect(_on_unit_acting)
	
	# Create highlight ring
	highlight_ring = Polygon2D.new()
	var points = []
	for i in range(16):
		var angle = (i / 16.0) * TAU
		points.append(Vector2(cos(angle), sin(angle)) * 40.0)
	highlight_ring.polygon = PackedVector2Array(points)
	highlight_ring.color = Color(1, 1, 0, 0.4) # Transparent yellow
	highlight_ring.visible = false
	add_child(highlight_ring)
	highlight_ring.z_index = -1 # Behind units
	
	# Status effects connections
	var sem = get_node_or_null("/root/StatusEffectsManager")
	if sem:
		if not sem.effect_applied.is_connected(_on_status_effect_applied):
			sem.effect_applied.connect(_on_status_effect_applied)
	
	print("World: Setup complete.")

func _on_unit_acting(id):
	var node = _find_unit_node(id)
	if node and highlight_ring:
		highlight_ring.visible = true
		highlight_ring.global_position = node.global_position + Vector2(0, 20) # Slightly below center
		
		# Animate the ring
		var tween = create_tween().set_loops(2)
		highlight_ring.scale = Vector2(0.8, 0.8)
		tween.tween_property(highlight_ring, "scale", Vector2(1.2, 1.2), 0.2)
		tween.tween_property(highlight_ring, "scale", Vector2(1.0, 1.0), 0.2)

func _on_status_effect_applied(combatant_id: String, effect_type: String):
	var target_node = _find_unit_node(combatant_id)
	if target_node:
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			if effect_type == "poison":
				pm.create_poison_effect(target_node.global_position)
			elif effect_type == "stun":
				pm.create_stun_effect(target_node.global_position)
			
			pm.create_floating_text(target_node.global_position + Vector2(0, -20), effect_type.to_upper(), Color.VIOLET)

func _setup_parallax_visuals():
	if not parallax_bg: return
	
	var view_size = get_viewport_rect().size
	var width = view_size.x
	var height = view_size.y
	
	var sky_layer = ParallaxLayer.new()
	sky_layer.motion_scale = Vector2(0.1, 1.0)
	sky_layer.motion_mirroring = Vector2(width, 0)
	parallax_bg.add_child(sky_layer)
	
	sky_rect = ColorRect.new()
	sky_rect.size = Vector2(width, height)
	sky_rect.color = Color(0.05, 0.05, 0.1)
	sky_layer.add_child(sky_rect)
	
	var mountain_layer = ParallaxLayer.new()
	mountain_layer.motion_scale = Vector2(0.3, 1.0)
	mountain_layer.motion_mirroring = Vector2(width, 0)
	parallax_bg.add_child(mountain_layer)
	
	mountain_polygons.clear()
	for i in range(5):
		var mountain = Polygon2D.new()
		var base_x = i * (width / 5.0)
		var m_height = randf_range(height * 0.2, height * 0.4)
		var m_width = randf_range(width * 0.15, width * 0.3)
		var ground_y = height * 0.6
		mountain.polygon = PackedVector2Array([
			Vector2(base_x - m_width/2, ground_y),
			Vector2(base_x, ground_y - m_height),
			Vector2(base_x + m_width/2, ground_y)
		])
		mountain.color = Color(0.1, 0.1, 0.15)
		mountain_layer.add_child(mountain)
		mountain_polygons.append(mountain)
	
	var tree_layer = ParallaxLayer.new()
	tree_layer.motion_scale = Vector2(0.6, 1.0)
	tree_layer.motion_mirroring = Vector2(width, 0)
	parallax_bg.add_child(tree_layer)
	
	tree_polygons.clear()
	for i in range(10):
		var tree = Polygon2D.new()
		var base_x = i * (width / 10.0) + randf_range(-50, 50)
		var t_height = randf_range(height * 0.1, height * 0.25)
		var ground_y = height * 0.6
		tree.polygon = PackedVector2Array([
			Vector2(base_x - 20, ground_y),
			Vector2(base_x, ground_y - t_height),
			Vector2(base_x + 20, ground_y)
		])
		tree.color = Color(0.05, 0.1, 0.05)
		tree_layer.add_child(tree)
		tree_polygons.append(tree)
	
	var ground_layer = ParallaxLayer.new()
	ground_layer.motion_scale = Vector2(1.0, 1.0)
	ground_layer.motion_mirroring = Vector2(width, 0)
	parallax_bg.add_child(ground_layer)
	
	var ground_rect = ColorRect.new()
	ground_rect.position = Vector2(0, height * 0.6)
	ground_rect.size = Vector2(width, height * 0.4)
	ground_rect.color = Color(0.12, 0.12, 0.12)
	ground_layer.add_child(ground_rect)

func _setup_road():
	var rg = get_node_or_null("/root/RoadGenerator")
	if not rg: return
	var view_size = get_viewport_rect().size
	var road_points = rg.generate_road_path("plains", view_size.x, view_size.y)
	road_line = rg.create_road_line(road_points, "plains")
	add_child(road_line)
	road_line.z_index = -5

func _input(event):
	if event is InputEventKey and event.pressed:
		if OS.is_debug_build():
			match event.keycode:
				KEY_F1:
					var pm = get_node_or_null("/root/PartyManager")
					if pm and pm.heroes.size() > 0:
						_on_hero_level_up(pm.heroes[0].level + 1, pm.heroes[0])
				KEY_F2:
					_trigger_boss_transition(10)
				KEY_F3:
					var pm = get_node_or_null("/root/PartyManager")
					if pm and pm.heroes.size() > 0:
						_on_damage_dealt("enemy", pm.heroes[0].id, 999, true)

func _process(delta):
	var wm = get_node_or_null("/root/WorldManager")
	var rm = get_node_or_null("/root/ResourceManager")
	var view_size = get_viewport_rect().size
	
	if rm:
		rm.update_resources(delta)
		
	if wm:
		var distance = wm.distance_traveled
		if not wm.combat_active:
			wm.update_world(delta)
		
		if parallax_bg:
			parallax_bg.scroll_offset = Vector2(-distance, 0)
		
		if road_line:
			road_line.position.x = -fmod(distance, view_size.x)
		
		var offset = fmod(distance, view_size.x)
		
		if hero_group:
			for child in hero_group.get_children():
				var rx = child.position.x + offset
				child.position.y = _get_road_y(rx, view_size)
				
		if enemy_group:
			for child in enemy_group.get_children():
				var rx = child.position.x + offset
				child.position.y = _get_road_y(rx, view_size)
	
	_update_biome_visuals(delta)

func _update_biome_visuals(_delta):
	var wm = get_node_or_null("/root/WorldManager")
	if not wm: return
	
	var biome = wm.determine_segment_type(wm.current_segment)
	if biome != current_biome:
		_apply_biome_theme(biome)
		current_biome = biome

func _apply_biome_theme(biome: String):
	var sky_color = UITheme.COLORS.get("biome_" + biome, Color(0.05, 0.05, 0.1))
	var mountain_color = sky_color.darkened(0.2)
	var tree_color = sky_color.lightened(0.1)
	
	if biome == "plains" or biome == "forest":
		tree_color = Color(0.05, 0.15, 0.05)
	elif biome == "desert":
		tree_color = Color(0.2, 0.15, 0.05)
	
	var tween = create_tween().set_parallel(true)
	if sky_rect:
		tween.tween_property(sky_rect, "color", sky_color, 2.0)
	
	for m in mountain_polygons:
		if m: tween.tween_property(m, "color", mountain_color, 2.0)
		
	for t in tree_polygons:
		if t: tween.tween_property(t, "color", tree_color, 2.0)
	
	var audio_m = get_node_or_null("/root/AudioManager")
	if audio_m:
		audio_m.play_ambient(biome)
	
	_log_info("World", "Transitioning to biome: " + biome)

func _get_road_y(rx: float, view_size: Vector2) -> float:
	var rg = get_node_or_null("/root/RoadGenerator")
	if not rg: return view_size.y * 0.65
	
	var road_center_y = view_size.y * rg.road_center_y_ratio
	return road_center_y + sin(rx * (2.0 * PI / view_size.x)) * rg.road_variation

func _on_combat_triggered(enemy_group_data: Array):
	var cm = get_node_or_null("/root/CombatManager")
	if cm:
		_log_info("World", "Encounter triggered with %d enemies!" % enemy_group_data.size())
		cm.start_party_combat(enemy_group_data)

func _on_damage_dealt(source_id, target_id, amount, is_crit):
	var target_node = _find_unit_node(target_id)
	var source_node = _find_unit_node(source_id)
	
	if source_node and source_node.has_method("play_animation"):
		source_node.play_animation("attack")
		
	if target_node:
		var pos = target_node.global_position + Vector2(0, -40)
		var spec_color = Color.WHITE
		
		var hero = PartyManager.get_hero_by_id(source_id)
		if hero:
			spec_color = UITheme.get_spec_color(hero.class_id)
		
		if target_node.has_method("play_hit_flash"):
			target_node.play_hit_flash()
		
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			if is_crit:
				pm.create_crit_effect(target_node.global_position, spec_color)
			else:
				pm.create_hit_effect(target_node.global_position, spec_color)
		
		var audio_m = get_node_or_null("/root/AudioManager")
		if audio_m:
			if is_crit:
				audio_m.play_crit_sfx()
			else:
				audio_m.play_hit_sfx()
		
		var float_color = Color.YELLOW
		if "hero" in str(target_id).to_lower():
			float_color = Color.RED
			
		var text = str(amount)
		if is_crit:
			text += "!"
			float_color = Color.ORANGE
			
		if pm:
			pm.create_floating_text(pos, text, float_color)
			
		# Check for death
		var cm = get_node_or_null("/root/CombatManager")
		var combatant = cm._get_combatant_by_id(target_id) if cm else {}
		if not combatant.is_empty() and combatant.get("current_health", 0) <= 0:
			if target_node.has_method("play_animation"):
				target_node.play_animation("death")
			
			# Trigger Boss Finisher if it's a boss
			if combatant.get("type") == "boss":
				if pm:
					pm.create_boss_finisher_effect(target_node.global_position)
			
			# Logic to remove the node after animation
			get_tree().create_timer(1.0).timeout.connect(target_node.queue_free)

func _on_healing_applied(healer_id, target_id, amount):
	var target_node = _find_unit_node(target_id)
	var healer_node = _find_unit_node(healer_id)
	
	if healer_node and healer_node.has_method("play_animation"):
		healer_node.play_animation("attack")
		
	if target_node:
		var pos = target_node.global_position + Vector2(0, -40)
		var color = Color.GREEN
		
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			pm.create_heal_effect(target_node.global_position)
			pm.create_floating_text(pos, "+" + str(amount), color)

		var audio_m = get_node_or_null("/root/AudioManager")
		if audio_m:
			audio_m.play_heal_sfx()

func _find_unit_node(id: String):
	if hero_group:
		for child in hero_group.get_children():
			if "hero_data" in child and child.hero_data and child.hero_data.id == id:
				return child
	if enemy_group:
		for child in enemy_group.get_children():
			if "enemy_data" in child and child.enemy_data and child.enemy_data.get("instance_id", child.enemy_data.get("id")) == id:
				return child
	return null

func _create_test_party():
	var pm = get_node_or_null("/root/PartyManager")
	var sc = get_node_or_null("/root/StatCalculator")
	if not pm: return
	
	var roles = ["tank", "healer", "dps", "dps", "dps"]
	var classes = ["paladin", "priest", "mage", "rogue", "warlock"]
	for i in range(5):
		var hero = Hero.new()
		hero.id = "hero_%d" % i
		hero.name = "Hero %d" % (i + 1)
		hero.role = roles[i]
		hero.class_id = classes[i]
		hero.level = 1
		hero.base_stats = {"stamina": 10, "strength": 10, "intellect": 10, "agility": 10, "spirit": 10}
		pm.add_hero(hero)
		if sc:
			sc.recalculate_hero_stats(hero)

func spawn_party():
	var party_m = get_node_or_null("/root/PartyManager")
	var anim_m = get_node_or_null("/root/AnimationManager")
	var world_m = get_node_or_null("/root/WorldManager")
	var move_m = get_node_or_null("/root/MovementManager")
	var view_size = get_viewport_rect().size
	
	if not hero_group or not party_m: return
	
	if move_m:
		move_m.update_party_formation()
	
	var distance = world_m.distance_traveled if world_m else 0.0
	var offset = fmod(distance, view_size.x)
	
	for i in range(party_m.heroes.size()):
		var hero = party_m.heroes[i]
		var instance = hero_scene.instantiate()
		hero_group.add_child(instance)
		if instance.has_method("setup"):
			instance.setup(hero)
		
		var target_pos = Vector2(200 + i * 120, 600)
		if move_m:
			target_pos = move_m.get_target_position(hero.id, true)
			
		var sx = target_pos.x
		var ry = _get_road_y(sx + offset, view_size)
		instance.position = Vector2(sx, ry) 
		
		if not hero.level_up.is_connected(_on_hero_level_up):
			hero.level_up.connect(_on_hero_level_up.bind(hero))
		
		if anim_m:
			anim_m.play_animation(instance, "walk")

func _on_hero_level_up(new_level, hero):
	var hero_node = _find_unit_node(hero.id)
	if hero_node:
		var pos = hero_node.global_position
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			pm.create_floating_text(pos + Vector2(0, -60), "LEVEL UP! (%d)" % new_level, Color.GOLD)
			pm.create_level_up_effect(pos)
		
		var audio_m = get_node_or_null("/root/AudioManager")
		if audio_m:
			audio_m.play_level_up_sfx()
		
		var sc = get_node_or_null("/root/StatCalculator")
		if sc:
			sc.recalculate_hero_stats(hero)
		
		_log_info("World", "Hero %s leveled up to %d!" % [hero.name, new_level])

func _on_mile_changed(mile, _max, _old):
	if mile > 0 and mile % 10 == 0:
		_trigger_boss_transition(mile)

func _trigger_boss_transition(mile: int):
	_log_info("World", "Boss Mile %d Transition Started!" % mile)
	var cam_m = get_node_or_null("/root/CameraManager")
	if cam_m:
		cam_m.shake(20.0, 3.0)
		cam_m.zoom_to_battle(Vector2(960, 540))
	
	var lighting = get_node_or_null("AtmosphericLighting")
	if lighting:
		var tween = create_tween()
		tween.tween_property(lighting, "color", Color(1.5, 0.2, 0.2), 0.3)
		tween.tween_property(lighting, "color", Color(0.5, 0.3, 0.3), 1.0)
	
	var pm = get_node_or_null("/root/ParticleManager")
	if pm:
		pm.create_floating_text(Vector2(960, 400), "!!! BOSS ENCOUNTER !!!", Color.RED)
		pm.create_floating_text(Vector2(960, 450), "MILE %d" % mile, Color.GOLD)
		# Add some screen-wide impact sparks
		for i in range(5):
			var rand_pos = Vector2(randf_range(200, 1700), randf_range(200, 800))
			pm.create_hit_effect(rand_pos, Color.RED)
		
	var audio_m = get_node_or_null("/root/AudioManager")
	if audio_m and audio_m.has_method("play_boss_approach_sfx"):
		audio_m.play_boss_approach_sfx()

func _on_combat_started(enemies: Array):
	_log_info("World", "Spawning %d enemy visuals for combat" % enemies.size())
	if not enemy_group: return
	
	var audio_m = get_node_or_null("/root/AudioManager")
	if audio_m:
		audio_m.play_music("combat")
	
	var cam_m = get_node_or_null("/root/CameraManager")
	if cam_m:
		cam_m.zoom_to_battle(Vector2(960, 540))
	
	var mm = get_node_or_null("/root/MovementManager")
	if mm:
		mm.update_enemy_formation(enemies)
	
	var view_size = get_viewport_rect().size
	var wm = get_node_or_null("/root/WorldManager")
	var distance = wm.distance_traveled if wm else 0.0
	var offset = fmod(distance, view_size.x)
	
	var anim_m = get_node_or_null("/root/AnimationManager")
	if anim_m and hero_group:
		for hero_node in hero_group.get_children():
			anim_m.play_animation(hero_node, "idle")
	
	for child in enemy_group.get_children():
		child.queue_free()
	
	for i in range(enemies.size()):
		var enemy_data = enemies[i]
		var instance = enemy_scene.instantiate()
		enemy_group.add_child(instance)
		if instance.has_method("setup"):
			instance.setup(enemy_data)
		
		if instance.has_method("play_animation"):
			instance.play_animation("idle")
		
		var target_pos = Vector2(1400 + (i * 80), 600)
		if mm:
			target_pos = mm.get_target_position(enemy_data["instance_id"], false)
			
		var sx = target_pos.x
		var ry = _get_road_y(sx + offset, view_size)
		instance.position = Vector2(sx, ry)
		instance.z_index = 50 - i
		
	_log_info("World", "Enemy group visually spawned.")

func _on_combat_ended(victory: bool):
	var audio_m = get_node_or_null("/root/AudioManager")
	var anim_m = get_node_or_null("/root/AnimationManager")
	var pm = get_node_or_null("/root/ParticleManager")
	
	if audio_m:
		audio_m.play_music("travel")
	
	if has_node("/root/CameraManager"):
		CameraManager.reset_zoom()
	
	# Reset boss lighting if active
	var lighting = get_node_or_null("AtmosphericLighting")
	if lighting and lighting.color != Color.WHITE:
		var tween = create_tween()
		tween.tween_property(lighting, "color", Color.WHITE, 1.5)
	
	if victory:
		if enemy_group:
			for enemy in enemy_group.get_children():
				if pm:
					pm.create_death_effect(enemy.global_position)
				enemy.visible = false
		
		if anim_m and hero_group:
			for hero_node in hero_group.get_children():
				anim_m.play_animation(hero_node, "walk")
			
	var timer = get_tree().create_timer(1.5)
	timer.timeout.connect(_on_combat_cleanup)

func _on_combat_cleanup():
	if not enemy_group: return
	for child in enemy_group.get_children():
		child.queue_free()

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

# Show a notification message to the player
func show_notification(text: String, color: Color = Color.WHITE):
	var particle_mgr = get_node_or_null("/root/ParticleManager")
	if particle_mgr and particle_mgr.has_method("create_floating_text"):
		# Position notification at center-top of screen
		var viewport_size = get_viewport().get_visible_rect().size
		var notification_pos = Vector2(viewport_size.x * 0.5, viewport_size.y * 0.2)
		particle_mgr.create_floating_text(notification_pos, text, color)
	else:
		# Fallback to console log if ParticleManager not available
		_log_info("World", text)

var hero_group
var enemy_group
var _spawning_party: bool = false  # Guard to prevent concurrent spawn_party() calls
var loot_group: Node2D
var parallax_bg
var road_line
var camera
var highlight_ring: Polygon2D

var hero_scene = preload("res://scenes/HeroSprite.tscn")
var enemy_scene = preload("res://scenes/EnemySprite.tscn")
var hud_scene = preload("res://scenes/HUD.tscn")
var combat_log_scene = preload("res://scenes/CombatLog.tscn")

# Scene Handlers
var combat_handler: Node = null
var level_up_handler: Node = null
var save_load_handler: Node = null
var interaction_manager: Node = null

var current_biome: String = ""
var sky_rect: ColorRect
var mountain_polygons: Array = []
var tree_polygons: Array = []
var is_final_boss_fight: bool = false

# Combat staging tweaks:
# - Keep units visually glued to the road (Y recomputed from current X)
# - Keep combat spacing readable (no full-screen "slam" rush)
const COMBAT_Y_OFFSETS: Array[float] = [-12.0, 0.0, 12.0, -6.0, 6.0]
const TRAVEL_Y_OFFSETS: Array[float] = [-10.0, 0.0, 10.0, -5.0, 5.0]
# Combat X positions must be resolution-safe. The project is frequently run at ~960px wide,
# so fixed X values can push enemies off-screen ("heroes attacking invisible enemies").
const COMBAT_HERO_MELEE_X_RATIO: float = 0.44
const COMBAT_HERO_RANGED_X_RATIO: float = 0.32
const COMBAT_ENEMY_MELEE_X_RATIO: float = 0.68
const COMBAT_ENEMY_RANGED_X_RATIO: float = 0.80
const COMBAT_SPACING_X: float = 60.0
const COMBAT_MELEE_GAP_PX: float = 120.0 # Visual contact distance between front lines (sword reach)
const COMBAT_RANGED_BACKSTEP_PX: float = 170.0 # How far back ranged/healers stand from the melee line
const COMBAT_ENEMY_RANGED_BACKSTEP_PX: float = 140.0

func _get_combat_x_layout(view_size: Vector2) -> Dictionary:
	# Compute resolution-safe combat "lanes" using a pixel-based melee gap for realism.
	# Ratios are still used as anchors so small resolutions don't push units off-screen.
	var hero_melee_x: float = view_size.x * COMBAT_HERO_MELEE_X_RATIO
	var gap: float = clamp(COMBAT_MELEE_GAP_PX, view_size.x * 0.08, view_size.x * 0.16)
	var ranged_back: float = clamp(COMBAT_RANGED_BACKSTEP_PX, view_size.x * 0.12, view_size.x * 0.22)
	var enemy_ranged_back: float = clamp(COMBAT_ENEMY_RANGED_BACKSTEP_PX, view_size.x * 0.10, view_size.x * 0.18)
	
	var enemy_melee_x: float = hero_melee_x + gap
	# Keep enemies well within screen bounds across common window sizes.
	enemy_melee_x = clamp(enemy_melee_x, view_size.x * 0.52, view_size.x * 0.74)
	
	var hero_ranged_x: float = hero_melee_x - ranged_back
	hero_ranged_x = max(view_size.x * 0.20, hero_ranged_x)
	
	# Calculate enemy ranged position
	var enemy_ranged_x: float = enemy_melee_x + enemy_ranged_back
	enemy_ranged_x = min(view_size.x * 0.90, enemy_ranged_x)
	
	return {
		"hero_melee_x": hero_melee_x,
		"hero_ranged_x": hero_ranged_x,
		"enemy_melee_x": enemy_melee_x,
		"enemy_ranged_x": enemy_ranged_x
	}

func _init():
	# Removed verbose initialization logging to prevent output overflow
	pass

func _ready():
	# Removed verbose initialization logging to prevent output overflow
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.is_in_game = true
	# Find groups
	hero_group = get_node_or_null("HeroGroup")
	enemy_group = get_node_or_null("EnemyGroup")
	parallax_bg = get_node_or_null("ParallaxBackground")
	
	# RESET POSITIONS to ensure absolute coordinate spawning works
	if hero_group: hero_group.position = Vector2.ZERO
	if enemy_group: enemy_group.position = Vector2.ZERO
	
	# Setup Loot Group
	loot_group = Node2D.new()
	loot_group.name = "LootGroup"
	add_child(loot_group)
	var lm = get_node_or_null("/root/LootManager")
	if lm:
		lm.loot_spawned.connect(_on_loot_spawned)
		lm.item_picked_up.connect(_on_item_picked_up)
	
	# Create Camera if missing
	camera = Camera2D.new()
	# Use DRAG_CENTER so camera centers on its position (default behavior)
	# ANCHOR_MODE_FIXED_TOP_LEFT would position top-left corner at the position
	camera.anchor_mode = Camera2D.ANCHOR_MODE_DRAG_CENTER
	# Camera position will be set when heroes are spawned
	# Start at a reasonable default position instead of origin
	# Heroes are typically positioned around Y=600-700, so start camera at a visible Y position
	var camera_view_size = get_viewport_rect().size if get_viewport() else Vector2(1920, 1080)
	camera.position = Vector2(camera_view_size.x * 0.5, camera_view_size.y * 0.65)  # Center X, road-level Y
	add_child(camera)
	camera.make_current()
	
	# #region agent log
	var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
	var debug_file_init = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
	if debug_file_init:
		debug_file_init.seek_end()
		var log_entry_init = JSON.stringify({"id":"log_camera_initialized","timestamp":Time.get_ticks_msec(),"location":"World.gd:144","message":"camera initialized","data":{"camera_pos_x":camera.position.x,"camera_pos_y":camera.position.y,"view_size_x":camera_view_size.x,"view_size_y":camera_view_size.y},"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})
		debug_file_init.store_line(log_entry_init)
		debug_file_init.close()
	# #endregion
	
	if has_node("/root/CameraManager"):
		var cam_m = get_node_or_null("/root/CameraManager")
		if cam_m:
			cam_m.register_camera(camera)

	# If the player returns to World mid-combat (after opening menus), re-spawn enemy visuals.
	call_deferred("_resume_combat_if_active")
	
	# Add atmospheric lighting controller
	var lighting = CanvasModulate.new()
	lighting.name = "AtmosphericLighting"
	add_child(lighting)
	lighting.color = Color.WHITE
	
	# Add WorldEnvironment for Bloom/Post-processing
	var env_node = WorldEnvironment.new()
	env_node.name = "WorldEnvironment"
	add_child(env_node)
	var env = Environment.new()
	env.glow_enabled = true
	env.glow_intensity = 0.8
	env.glow_strength = 1.0
	env.glow_bloom = 0.2
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	env_node.environment = env
	
	# Removed verbose initialization logging to prevent output overflow
	_setup_parallax_visuals()
	_setup_road()
	
	# Safe fetch managers
	var pm = get_node_or_null("/root/PartyManager")
	var wm = get_node_or_null("/root/WorldManager")
	var cm = get_node_or_null("/root/CombatManager")
	
	if pm:
		# Connect to hero_added signal to spawn heroes when they're added
		if not pm.hero_added.is_connected(_on_hero_added):
			pm.hero_added.connect(_on_hero_added)
			# Removed verbose logging to prevent output overflow
		
		# CRITICAL FIX: Always wait for signal-based spawning
		# Main.gd creates heroes via PartyManager.add_hero(), which emits hero_added signal
		# The signal handler will call spawn_party() when party is complete (5 heroes)
		# This prevents race conditions where _ready() might run before or during hero creation
		if not pm.heroes.is_empty():
			# Removed verbose logging to prevent output overflow
			# Only spawn if we have a complete party AND no heroes in scene tree yet
			if pm.heroes.size() >= 5 and (not hero_group or hero_group.get_child_count() == 0):
				# Removed verbose logging to prevent output overflow
				spawn_party()
		# Removed else branch verbose logging
	
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
		if not wm.shop_encountered.is_connected(_on_shop_encountered):
			wm.shop_encountered.connect(_on_shop_encountered)
		if not wm.treasure_encountered.is_connected(_on_treasure_encountered):
			wm.treasure_encountered.connect(_on_treasure_encountered)
		if not wm.quest_encountered.is_connected(_on_quest_encountered):
			wm.quest_encountered.connect(_on_quest_encountered)
		if not wm.mile_100_arrived.is_connected(_on_mile_100_arrived):
			wm.mile_100_arrived.connect(_on_mile_100_arrived)
		wm.initialize_world()
	
	# Combat signals - CombatHandler connects to combat_started/combat_ended directly
	# World.gd only handles visual spawning/cleanup and healing
	if cm:
		# Damage dealt will be handled by CombatHandler (connected in handler initialization)
		if not cm.healing_applied.is_connected(_on_healing_applied):
			cm.healing_applied.connect(_on_healing_applied)
		# Connect combat signals AFTER handlers are initialized so CombatHandler gets them first
		if not cm.combat_started.is_connected(_on_combat_started):
			cm.combat_started.connect(_on_combat_started)
		if not cm.combat_ended.is_connected(_on_combat_ended):
			cm.combat_ended.connect(_on_combat_ended)
	
	if has_node("/root/CombatActions"):
		var ca = get_node_or_null("/root/CombatActions")
		if ca:
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
	
	# Initialize Scene Handlers (after heroes are spawned so handlers can connect to them)
	_initialize_scene_handlers()
	
	# Reconnect LevelUpHandler to heroes after spawning (in case heroes were created before handler)
	if level_up_handler and level_up_handler.has_method("reconnect_hero_signals"):
		level_up_handler.reconnect_hero_signals()
	
	# Removed verbose completion logging to prevent output overflow

# Initialize Scene Handlers
func _initialize_scene_handlers():
	# Load handler scripts
	var combat_handler_script = load("res://scripts/handlers/CombatHandler.gd")
	var level_up_handler_script = load("res://scripts/handlers/LevelUpHandler.gd")
	
	# Create and initialize CombatHandler
	combat_handler = combat_handler_script.new()
	combat_handler.name = "CombatHandler"
	add_child(combat_handler)
	combat_handler.initialize(self)
	
	# Create and initialize LevelUpHandler
	level_up_handler = level_up_handler_script.new()
	level_up_handler.name = "LevelUpHandler"
	add_child(level_up_handler)
	level_up_handler.initialize(self)
	
	# SaveLoadHandler is now an Autoload singleton, accessible via /root/SaveLoadHandler
	save_load_handler = get_node_or_null("/root/SaveLoadHandler")
	# Removed verbose SaveLoadHandler logging to prevent output overflow
	
	# Initialize InteractionManager
	interaction_manager = get_node_or_null("/root/InteractionManager")
	if interaction_manager:
		interaction_manager.initialize(self)
	
	_log_info("World", "Scene handlers initialized")

func trigger_bloom(intensity: float, duration: float):
	"""Trigger a screen-wide bloom/glow effect"""
	var env_node = get_node_or_null("WorldEnvironment")
	if not env_node or not env_node.environment: return
	
	var env = env_node.environment
	var tween = create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(env, "glow_bloom", intensity, duration * 0.2)
	tween.tween_property(env, "glow_bloom", 0.2, duration * 0.8)

func _on_unit_acting(id):
	var node = _find_unit_node(id)
	if node and highlight_ring:
		highlight_ring.visible = true
		highlight_ring.global_position = node.global_position + Vector2(0, 20) # Slightly below center

		# Animate the ring
		var ring_tween = create_tween().set_loops(2)
		highlight_ring.scale = Vector2(0.8, 0.8)
		ring_tween.tween_property(highlight_ring, "scale", Vector2(1.2, 1.2), 0.2)
		ring_tween.tween_property(highlight_ring, "scale", Vector2(1.0, 1.0), 0.2)
	return

func _on_status_effect_applied(combatant_id: String, effect_type: String):
	var target_node = _find_unit_node(combatant_id)
	if target_node:
		var particle_mgr = get_node_or_null("/root/ParticleManager")
		if particle_mgr:
			if effect_type == "poison":
				particle_mgr.create_poison_effect(target_node.global_position)
			elif effect_type == "stun":
				particle_mgr.create_stun_effect(target_node.global_position)

			particle_mgr.create_floating_text(target_node.global_position + Vector2(0, -20), effect_type.to_upper(), Color.VIOLET)
	return

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
			Vector2(base_x - m_width / 2.0, ground_y),
			Vector2(base_x, ground_y - m_height),
			Vector2(base_x + m_width / 2.0, ground_y)
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
					var party_mgr = get_node_or_null("/root/PartyManager")
					if party_mgr and party_mgr.heroes.size() > 0:
						_on_hero_level_up(party_mgr.heroes[0].level + 1, party_mgr.heroes[0])
				KEY_F2:
					_trigger_boss_transition(10)
				KEY_F3:
					# Debug: Deal test damage to first hero
					var party_mgr = get_node_or_null("/root/PartyManager")
					var cm = get_node_or_null("/root/CombatManager")
					if party_mgr and party_mgr.heroes.size() > 0 and cm:
						cm.damage_dealt.emit("debug_enemy", party_mgr.heroes[0].id, 999, true)
				KEY_F4:
					# Debug: Trigger shop encounter
					var wm = get_node_or_null("/root/WorldManager")
					if wm:
						wm._trigger_shop_encounter()

# @CRITICAL: Main game loop - handles world movement, hero positioning, road following
# Used by: Godot engine (called every frame)
# Changing this requires: Maintain 60 FPS target, coordinate with MovementManager and CameraManager
# Performance: Called every frame, must complete in <16ms for 60 FPS
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
			# Ensure heroes stay visible during travel mode
			if hero_group:
				for node in hero_group.get_children():
					if is_instance_valid(node):
						node.visible = true  # Force visible
						var vis_node = node.get_node_or_null("Visuals")
						if vis_node:
							vis_node.visible = true
							vis_node.modulate = Color.WHITE  # Force full alpha
						var body_layer = node.get_node_or_null("Visuals/Body")
						if body_layer:
							body_layer.visible = true
							body_layer.modulate = Color.WHITE
		else:
			# Ensure heroes stay visible during combat
			if hero_group:
				for node in hero_group.get_children():
					if is_instance_valid(node):
						node.visible = true  # Force visible
						var vis_node = node.get_node_or_null("Visuals")
						if vis_node:
							vis_node.visible = true
							vis_node.modulate = Color.WHITE  # Force full alpha
						var body_layer = node.get_node_or_null("Visuals/Body")
						if body_layer:
							body_layer.visible = true
							body_layer.modulate = Color.WHITE
		
		if parallax_bg:
			parallax_bg.scroll_offset = Vector2(-distance, 0)
		
		if road_line:
			road_line.position.x = -fmod(distance, view_size.x)
		
		var offset = fmod(distance, view_size.x)
		
		if hero_group:
			for child in hero_group.get_children():
				var rx = child.position.x + offset
				var y_offset = 0.0
				if wm and wm.combat_active and child.has_meta("combat_y_offset"):
					y_offset = float(child.get_meta("combat_y_offset"))
				elif child.has_meta("formation_y_offset"):
					y_offset = float(child.get_meta("formation_y_offset"))
				var road_y = _get_road_y(rx, view_size)
				# Road Line2D has width 40, so it extends 20 pixels above and below center
				# Position units so their feet touch the road surface
				# Adjust to account for visual appearance - bring closer to road
				var road_surface_y = road_y - 5.0
				child.position.y = road_surface_y + y_offset
				
		if enemy_group:
			for child in enemy_group.get_children():
				var rx = child.position.x + offset
				var y_offset = 0.0
				if wm and wm.combat_active and child.has_meta("combat_y_offset"):
					y_offset = float(child.get_meta("combat_y_offset"))
				elif child.has_meta("formation_y_offset"):
					y_offset = float(child.get_meta("formation_y_offset"))
				var road_y = _get_road_y(rx, view_size)
				# Road Line2D has width 40, so it extends 20 pixels above and below center
				# Position units so their feet touch the road surface
				# Now using same scale as heroes (1.0), so same positioning
				var road_surface_y = road_y - 5.0
				child.position.y = road_surface_y + y_offset
				
		if loot_group:
			var current_dist = wm.distance_traveled
			for child in loot_group.get_children():
				if child.has_meta("world_x"):
					var world_x = child.get_meta("world_x")
					var screen_x = world_x - current_dist
					
					# Wrap loot if needed (optional for infinite road)
					var rx = screen_x + offset
					child.position.x = screen_x
					child.position.y = _get_road_y(rx, view_size)
					
					# Hide loot if it's too far behind
					if screen_x < -100:
						child.visible = false
					else:
						child.visible = true
				
		# Check for loot pickups
		var lm = get_node_or_null("/root/LootManager")
		if lm and hero_group and hero_group.get_child_count() > 0:
			# Use the first hero's position for pickup range
			var collector = hero_group.get_child(0)
			lm.check_loot_pickups(collector.global_position)
	
	_update_biome_visuals(delta)

func _update_biome_visuals(_delta):
	var wm = get_node_or_null("/root/WorldManager")
	if not wm: return
	
	var biome = wm.determine_segment_type(wm.current_segment)
	if biome != current_biome:
		_apply_biome_theme(biome)
		current_biome = biome

func _apply_biome_theme(biome: String):
	var ut = get_node_or_null("/root/UITheme")
	var sky_color: Color
	if ut:
		var biome_key = "biome_" + biome
		if ut.COLORS.has(biome_key):
			sky_color = ut.COLORS[biome_key] as Color
		else:
			sky_color = Color(0.05, 0.05, 0.1)
	else:
		sky_color = Color(0.05, 0.05, 0.1)
	var mountain_color = sky_color.darkened(0.2)
	var tree_color = sky_color.lightened(0.1)
	
	if biome == "plains" or biome == "forest":
		tree_color = Color(0.05, 0.15, 0.05)
	elif biome == "desert":
		tree_color = Color(0.2, 0.15, 0.05)
	
	var color_tween = create_tween().set_parallel(true)
	if sky_rect:
		color_tween.tween_property(sky_rect, "color", sky_color, 2.0)
	
	for m in mountain_polygons:
		if m: color_tween.tween_property(m, "color", mountain_color, 2.0)
		
	for t in tree_polygons:
		if t: color_tween.tween_property(t, "color", tree_color, 2.0)
	
	var audio_m = get_node_or_null("/root/AudioManager")
	if audio_m:
		audio_m.play_ambient(biome)
	
	_log_info("World", "Transitioning to biome: " + biome)

func _calculate_battle_center(view_size: Vector2, offset: float = 0.0) -> Vector2:
	"""Calculate the center position between heroes and enemies for camera positioning"""
	var combat_layout := _get_combat_x_layout(view_size)
	var hero_melee_x: float = float(combat_layout.get("hero_melee_x", view_size.x * COMBAT_HERO_MELEE_X_RATIO))
	var enemy_melee_x: float = float(combat_layout.get("enemy_melee_x", view_size.x * COMBAT_ENEMY_MELEE_X_RATIO))
	
	# Center X is the midpoint between hero melee front line and enemy melee front line
	var center_x = (hero_melee_x + enemy_melee_x) / 2.0
	
	# Get the road Y position at this center X to ensure both heroes and enemies are visible
	var center_road_y = _get_road_y(center_x + offset, view_size)
	
	return Vector2(center_x, center_road_y)

func _get_road_y(rx: float, view_size: Vector2) -> float:
	var rg = get_node_or_null("/root/RoadGenerator")
	if not rg:
		var fallback_y = view_size.y * 0.65
		# #region agent log
		var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
		var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
		if debug_file:
			debug_file.seek_end()
			var log_entry = JSON.stringify({"id":"log_road_y_fallback","timestamp":Time.get_ticks_msec(),"location":"World.gd:613","message":"RoadGenerator not found, using fallback Y","data":{"rx":rx,"view_size_y":view_size.y,"fallback_y":fallback_y},"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})
			debug_file.store_line(log_entry)
			debug_file.close()
		# #endregion
		return fallback_y
	
	var road_center_y = view_size.y * rg.road_center_y_ratio
	var road_y = road_center_y + sin(rx * (2.0 * PI / view_size.x)) * rg.road_variation
	# #region agent log
	if Engine.get_process_frames() % 120 == 0:  # Log every 120 frames to avoid spam
		var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
		var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
		if debug_file:
			debug_file.seek_end()
			var log_entry = JSON.stringify({"id":"log_road_y_calc","timestamp":Time.get_ticks_msec(),"location":"World.gd:616","message":"road_y calculated","data":{"rx":rx,"view_size_x":view_size.x,"view_size_y":view_size.y,"road_center_y":road_center_y,"road_center_y_ratio":rg.road_center_y_ratio,"road_variation":rg.road_variation,"road_y":road_y},"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})
			debug_file.store_line(log_entry)
			debug_file.close()
	# #endregion
	return road_y

func _on_mile_100_arrived():
	_log_info("World", "Mile 100 arrived! Preparing for final boss fight")
	is_final_boss_fight = true
	
	# Enhanced boss transition for final boss
	_trigger_final_boss_transition()

func _trigger_final_boss_transition():
	_log_info("World", "Final Boss Transition Started!")
	var view_size = get_viewport_rect().size
	var wm = get_node_or_null("/root/WorldManager")
	var distance = wm.distance_traveled if wm else 0.0
	var offset = fmod(distance, view_size.x)
	var battle_center = _calculate_battle_center(view_size, offset)
	
	var cam_m = get_node_or_null("/root/CameraManager")
	if cam_m:
		cam_m.shake(30.0, 4.0)
		cam_m.zoom_to_battle(battle_center)
	
	var lighting = get_node_or_null("AtmosphericLighting")
	if lighting:
		var lighting_tween = create_tween()
		lighting_tween.tween_property(lighting, "color", Color(2.0, 0.1, 0.1), 0.5)
		lighting_tween.tween_property(lighting, "color", Color(0.8, 0.2, 0.2), 2.0)
	
	var particle_mgr = get_node_or_null("/root/ParticleManager")
	if particle_mgr:
		particle_mgr.create_floating_text(Vector2(960, 300), "!!! WAR LORD !!!", Color.RED)
		particle_mgr.create_floating_text(Vector2(960, 350), "THE FINAL BATTLE", Color.GOLD)
		particle_mgr.create_floating_text(Vector2(960, 400), "MILE 100", Color.WHITE)
		# Massive screen-wide impact effects
		for i in range(10):
			var rand_pos = Vector2(randf_range(100, 1820), randf_range(100, 980))
			particle_mgr.create_hit_effect(rand_pos, Color.RED)
			# Store position to avoid closure capture issues
			var pos = rand_pos
			get_tree().create_timer(i * 0.1).timeout.connect(func(): 
				var pm_inner = get_node_or_null("/root/ParticleManager")
				if pm_inner:
					pm_inner.create_hit_effect(pos, Color.GOLD)
			)
	
	var audio_m = get_node_or_null("/root/AudioManager")
	if audio_m and audio_m.has_method("play_boss_approach_sfx"):
		audio_m.play_boss_approach_sfx()
	
	# Trigger massive bloom effect
	trigger_bloom(2.0, 3.0)

func _on_combat_triggered(enemy_group_data: Array):
	# Delegate to CombatHandler if available
	if combat_handler and combat_handler.has_method("_on_combat_triggered"):
		combat_handler._on_combat_triggered(enemy_group_data)
		return

	# Check for Boss Rush challenge mode
	var challenge_m = get_node_or_null("/root/ChallengeModeManager")
	if challenge_m and challenge_m.active_challenge == challenge_m.ChallengeType.BOSS_RUSH:
		# Filter to only bosses for Boss Rush
		var boss_group = []
		for enemy in enemy_group_data:
			if enemy.get("type", "") == "boss":
				boss_group.append(enemy)
		if not boss_group.is_empty():
			enemy_group_data = boss_group

	# Fallback to direct handling
	var combat_mgr = get_node_or_null("/root/CombatManager")
	if combat_mgr:
		_log_info("World", "Encounter triggered with %d enemies!" % enemy_group_data.size())
		combat_mgr.start_party_combat(enemy_group_data)
	return

func _on_shop_encountered(shop_data: Dictionary):
	_log_info("World", "Shop encountered: %s" % shop_data.get("name", "Unknown Shop"))
	
	# Don't open shop if already open or in combat
	if get_tree().paused:
		_log_warn("World", "Cannot open shop - game already paused (shop/combat already active)")
		return
	
	# Show notification
	var shop_name = shop_data.get("name", "Merchant")
	show_notification("%s Approached!" % shop_name, Color.GOLD)
	
	# Get shop type and items from shop data
	var shop_type = shop_data.get("type", "general_store")
	var shop_items = shop_data.get("items", [])
	
	# Open shop via ShopManager first (this sets up shop state)
	var shop_mgr = get_node_or_null("/root/ShopManager")
	if not shop_mgr:
		_log_error("World", "ShopManager not found - cannot open shop")
		return
	
	if not shop_mgr.has_method("open_shop"):
		_log_error("World", "ShopManager.open_shop() method not found")
		return
	
	shop_mgr.open_shop(shop_type, shop_items)
	
	# Pause game when shop opens (after ShopManager is ready)
	get_tree().paused = true
	
	# Get or create CanvasLayer for UI overlays
	var canvas_layer = get_node_or_null("CanvasLayer")
	if not canvas_layer:
		canvas_layer = CanvasLayer.new()
		canvas_layer.name = "CanvasLayer"
		add_child(canvas_layer)
	
	# Remove existing shop overlay if present
	var existing_shop = canvas_layer.get_node_or_null("Shop")
	if existing_shop:
		existing_shop.queue_free()
	
	# Instantiate Shop UI as overlay
	var shop_scene = preload("res://scenes/Shop.tscn")
	if shop_scene:
		var shop_ui = shop_scene.instantiate()
		shop_ui.name = "Shop"
		# Add to CanvasLayer so it appears above everything (HUD, combat log, etc.)
		canvas_layer.add_child(shop_ui)
		
		# Set process mode to ALWAYS so Shop UI remains interactive when game is paused
		shop_ui.process_mode = Node.PROCESS_MODE_ALWAYS
		
		# Set high z-index to ensure it's on top
		if shop_ui is Control:
			shop_ui.z_index = 200  # Higher than combat log (100)
		shop_ui.visible = true
		_log_info("World", "Shop UI opened as overlay (process_mode: ALWAYS)")
	else:
		_log_error("World", "Failed to load Shop.tscn scene")

func _on_treasure_encountered(treasure_data: Dictionary):
	_log_info("World", "Treasure encountered!")

	# Auto-collect gold
	var gold_amount = treasure_data.get("gold", 0)
	if gold_amount > 0:
		var sm = get_node_or_null("/root/StatisticsManager")
		if sm and sm.has_method("add_gold"):
			sm.add_gold(gold_amount)

		# Show floating text
		show_notification("Found %d gold!" % gold_amount, Color.GOLD)

	# Auto-collect items
	var items = treasure_data.get("items", [])
	if not items.is_empty():
		var lm = get_node_or_null("/root/LootManager")
		if lm:
			for item in items:
				lm.award_item_to_party(item)

		show_notification("Found treasure!", Color.GOLD)

func _on_quest_encountered(quest_data: Dictionary):
	_log_info("World", "Quest encountered: %s" % quest_data.get("title", "Unknown Quest"))

	# For now, just show a notification
	show_notification("Quest Available: %s" % quest_data.get("title", "Unknown"), Color.CYAN)
	return


func _on_healing_applied(healer_id, target_id, amount):
	var target_node = _find_unit_node(target_id)
	var healer_node = _find_unit_node(healer_id)
	
	if healer_node and healer_node.has_method("play_animation"):
		healer_node.play_animation("attack")
		
	if target_node:
		var pos = target_node.global_position + Vector2(0, -40)
		var color = Color.GREEN
		
		var particle_mgr = get_node_or_null("/root/ParticleManager")
		if particle_mgr:
			particle_mgr.create_heal_effect(target_node.global_position)
			particle_mgr.create_floating_text(pos, "+" + str(amount), color)

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

func _position_heroes_for_combat(view_size: Vector2, offset: float):
	"""Position heroes based on role: tanks/melee front, ranged/healers back"""
	var party_mgr = get_node_or_null("/root/PartyManager")
	if not party_mgr or not hero_group:
		return
	
	# IMPORTANT: hero_group child order is NOT guaranteed to match PartyManager.heroes order.
	# If we position by index, tanks can end up in the middle/back.
	# So we map nodes by hero_id and position by PartyManager's hero list.
	var hero_nodes_by_id: Dictionary = {}
	for node in hero_group.get_children():
		if "hero_data" in node and node.hero_data:
			hero_nodes_by_id[node.hero_data.id] = node
	
	
	# RuneScape-style readability: clear front line + back line.
	# Resolution-safe base X positions (pixel-based melee gap so swings look like they connect).
	var layout := _get_combat_x_layout(view_size)
	var hero_melee_x: float = float(layout.get("hero_melee_x", view_size.x * COMBAT_HERO_MELEE_X_RATIO))
	var hero_ranged_x: float = float(layout.get("hero_ranged_x", view_size.x * COMBAT_HERO_RANGED_X_RATIO))
	var tank_i := 0
	var melee_i := 0
	var ranged_i := 0
	var healer_i := 0
	
	for hero in party_mgr.heroes:
		if not hero_nodes_by_id.has(hero.id):
			continue
		var hero_node = hero_nodes_by_id[hero.id]
		
		var is_tank = hero.role == "tank"
		var is_healer = hero.role == "healer"
		var is_melee = is_tank or hero.class_id in ["warrior", "rogue", "paladin", "death_knight"]
		
		var sx := 0.0
		var y_offset := 0.0
		
		if is_tank:
			sx = hero_melee_x + (tank_i * COMBAT_SPACING_X)
			y_offset = 0.0
			tank_i += 1
		elif is_melee:
			sx = (hero_melee_x - 70.0) + (melee_i * COMBAT_SPACING_X)
			y_offset = COMBAT_Y_OFFSETS[(melee_i + 1) % COMBAT_Y_OFFSETS.size()]
			melee_i += 1
		elif is_healer:
			sx = (hero_ranged_x - 60.0) + (healer_i * COMBAT_SPACING_X)
			y_offset = 10.0
			healer_i += 1
		else:
			sx = hero_ranged_x + (ranged_i * COMBAT_SPACING_X)
			y_offset = COMBAT_Y_OFFSETS[(ranged_i + 2) % COMBAT_Y_OFFSETS.size()]
			ranged_i += 1
		
		var ry = _get_road_y(sx + offset, view_size) + y_offset
		
		# Position directly (no tween to avoid conflicts)
		hero_node.position = Vector2(sx, ry)
		hero_node.set_meta("combat_y_offset", y_offset)
		
		# Store combat position for movement
		hero_node.set_meta("combat_x", sx)
		hero_node.set_meta("is_melee", is_melee)
		hero_node.set_meta("base_combat_x", sx)  # Original position to return to

func _update_combat_movement(delta: float):
	"""Update unit positions during real-time combat - melee advance, ranged stay back"""
	if not hero_group or not enemy_group or not combat_movement_enabled:
		return
	
	
	# NEW: "Real fighting" staging.
	# Units hold their battle lines; attack/cast animations provide the motion (lunges, casts).
	# We only correct drift back to their assigned combat_x positions.
	var move_speed = 350.0  # pixels per second (drift correction only)
	
	# Heroes: return to base_combat_x
	for hero_node in hero_group.get_children():
		if not hero_node.has_meta("base_combat_x"):
			continue
		var desired_x = float(hero_node.get_meta("base_combat_x"))
		hero_node.position.x = move_toward(hero_node.position.x, desired_x, move_speed * delta)
	
	# Enemies: return to enemy_data.combat_x (set on spawn)
	for enemy_node in enemy_group.get_children():
		if not enemy_node.visible or not enemy_node.get("enemy_data"):
			continue
		var enemy_data = enemy_node.enemy_data
		var desired_x = float(enemy_data.get("combat_x", enemy_node.position.x))
		enemy_node.position.x = move_toward(enemy_node.position.x, desired_x, move_speed * delta)

func _is_enemy_melee(enemy_data: Dictionary) -> bool:
	"""Determine if enemy is melee or ranged based on type/class"""
	var enemy_name = enemy_data.get("name", "").to_lower()
	var enemy_type = enemy_data.get("type", "").to_lower()
	
	# Bosses and elites are usually melee unless explicitly ranged
	if enemy_type == "boss" or enemy_type == "elite":
		return not ("archer" in enemy_name or "mage" in enemy_name or "warlock" in enemy_name)
	
	# Check for ranged keywords
	if "archer" in enemy_name or "ranger" in enemy_name or "mage" in enemy_name or "caster" in enemy_name:
		return false
	
	# Default to melee
	return true

func _create_test_party():
	var party_mgr = get_node_or_null("/root/PartyManager")
	var sc = get_node_or_null("/root/StatCalculator")
	var hero_factory = get_node_or_null("/root/HeroFactory")
	if not party_mgr or not hero_factory: return
	
	var roles = ["tank", "healer", "dps", "dps", "dps"]
	var classes = ["paladin", "priest", "mage", "rogue", "warlock"]
	var specs = ["protection", "holy", "frost", "assassination", "affliction"]
	for i in range(5):
		var hero = hero_factory.create_hero(
			classes[i],
			specs[i],
			1,  # level
			"hero_%d" % i,  # hero_id
			"Hero %d" % (i + 1),  # name
			roles[i]  # role
		)
		if hero:
			party_mgr.add_hero(hero)
			if sc:
				sc.recalculate_hero_stats(hero)

func spawn_party():
	# CRITICAL: Prevent concurrent calls
	if _spawning_party:
		return
	_spawning_party = true

	var party_m = get_node_or_null("/root/PartyManager")
	var anim_m = get_node_or_null("/root/AnimationManager")
	var world_m = get_node_or_null("/root/WorldManager")
	var move_m = get_node_or_null("/root/MovementManager")
	var equipment_m = get_node_or_null("/root/EquipmentManager")
	var view_size = get_viewport_rect().size
	
	if not hero_group:
		_log_error("World", "HeroGroup node not found! Cannot spawn heroes.")
		_spawning_party = false
		return
		
	if not party_m:
		_log_error("World", "PartyManager not found! Cannot spawn heroes.")
		_spawning_party = false
		return
	
	# Clear existing hero sprites to prevent duplicates
	var existing_count = hero_group.get_child_count()
	if existing_count > 0:
		for child in hero_group.get_children():
			child.queue_free()
	
	if move_m:
		move_m.update_party_formation()
	
	var distance = world_m.distance_traveled if world_m else 0.0
	var offset = fmod(distance, view_size.x)
	
	for i in range(party_m.heroes.size()):
		var hero = party_m.heroes[i]
		
		# REVIVAL CHECK: Ensure spawned heroes have at least 1 HP
		if hero.current_stats.get("health", 0) <= 0:
			hero.current_stats["health"] = hero.current_stats.get("maxHealth", 100) * 0.1
			_log_info("World", "Hero %s spawned with 0 HP, reviving to 10%%" % hero.name)
		
		var instance = hero_scene.instantiate()
		if not instance:
			_log_error("World", "Failed to instantiate hero_scene for hero %s" % hero.name)
			continue
			
		hero_group.add_child(instance)
		
		if instance.has_method("setup"):
			instance.setup(hero)
		else:
			_log_error("World", "Hero instance does not have setup() method!")
		
		var target_pos = Vector2(200 + i * 120, 600)
		if move_m:
			target_pos = move_m.get_target_position(hero.id, true)
			
		var sx = target_pos.x
		# Travel should stay glued to the road. MovementManager's Y offsets are large (role spacing)
		# and look like "hovering" when applied on top of the road spline, so we use a small offset.
		var formation_y_offset = TRAVEL_Y_OFFSETS[i % TRAVEL_Y_OFFSETS.size()]
		instance.set_meta("formation_y_offset", formation_y_offset)
		var road_y = _get_road_y(sx + offset, view_size)
		# Road Line2D has width 40, so it extends 20 pixels above and below center
		# Position heroes so their feet touch the road surface
		# Adjust to account for visual appearance - bring closer to road
		var road_surface_y = road_y - 5.0
		var ry = road_surface_y + formation_y_offset
		instance.position = Vector2(sx, ry)
		
		# CRITICAL: Defer equipment application to ensure HeroSprite is fully initialized
		# HeroSprite needs _ready() to complete before update_equipment_visuals() can access body_layer
		# Also defer signal connection to avoid duplicate connections
		if equipment_m and instance:
			call_deferred("_apply_hero_equipment", instance, hero.id)
		
		# Level-up signals are handled by LevelUpHandler (connected in _initialize_scene_handlers)
		# No need to connect here to avoid duplicate handling
		
		# CRITICAL: Defer animation call to ensure HeroSprite is fully initialized
		# HeroSprite needs _ready() to complete before play_animation can access body_layer
		if anim_m and instance:
			call_deferred("_play_hero_animation", instance, "walk")
	
	# CRITICAL: Set camera to follow heroes after spawning (deferred to ensure heroes are positioned)
	call_deferred("_position_camera_to_heroes")
	
	# Reset guard flag after spawning completes
	_spawning_party = false

func _apply_hero_equipment(hero_sprite: Node2D, _hero_id: String):
	"""Helper function to apply equipment to hero sprite (called deferred)"""
	# CRITICAL: Validate hero_sprite is valid and in scene tree
	if not is_instance_valid(hero_sprite):
		_log_warn("World", "_apply_hero_equipment called with invalid hero_sprite")
		return
	
	# CRITICAL: Check if hero_sprite is in the scene tree (ready) before calling methods
	if not hero_sprite.is_inside_tree():
		_log_warn("World", "_apply_hero_equipment: hero_sprite not in scene tree yet")
		return
	
	var equipment_m = get_node_or_null("/root/EquipmentManager")
	if not equipment_m:
		_log_warn("World", "_apply_hero_equipment: EquipmentManager not found")
		return
	
	# CRITICAL: Connect equipment change signal (only once)
	# HeroSprite already connects to equipment_changed in _ready(), but connect here as backup
	if hero_sprite.has_method("_on_equipment_changed"):
		if not equipment_m.equipment_changed.is_connected(hero_sprite._on_equipment_changed):
			equipment_m.equipment_changed.connect(hero_sprite._on_equipment_changed)
	
	# CRITICAL: Update equipment visuals if hero has equipment
	# HeroSprite.update_equipment_visuals() will check hero_data and apply equipment
	if hero_sprite.has_method("update_equipment_visuals"):
		hero_sprite.update_equipment_visuals()
	else:
		_log_warn("World", "_apply_hero_equipment: hero_sprite does not have update_equipment_visuals method")

func _play_hero_animation(hero_sprite: Node2D, anim_name: String):
	"""Helper function to play animation on hero sprite (called deferred)"""
	# CRITICAL: Validate hero_sprite is valid and in scene tree
	if not is_instance_valid(hero_sprite):
		_log_warn("World", "_play_hero_animation called with invalid hero_sprite")
		return
	
	# CRITICAL: Check if hero_sprite is in the scene tree (ready) before calling methods
	if not hero_sprite.is_inside_tree():
		_log_warn("World", "_play_hero_animation: hero_sprite not in scene tree yet")
		return
	
	# CRITICAL: Validate that hero_sprite has the required method
	if not hero_sprite.has_method("play_animation"):
		_log_warn("World", "_play_hero_animation: hero_sprite does not have play_animation method")
		return
	
	var anim_m = get_node_or_null("/root/AnimationManager")
	if anim_m:
		anim_m.play_animation(hero_sprite, anim_name)
	else:
		_log_warn("World", "_play_hero_animation: AnimationManager not found")

func _position_camera_to_heroes():
	"""Position camera to follow heroes after they're spawned"""
	if not hero_group or hero_group.get_child_count() == 0:
		_log_warn("World", "No heroes to position camera to")
		return
	
	var cam_m = get_node_or_null("/root/CameraManager")
	
	# Find tank hero sprite to focus camera on
	var party_m = get_node_or_null("/root/PartyManager")
	var tank_hero = null
	if party_m and party_m.has_method("get_tank"):
		tank_hero = party_m.get_tank()
	
	var tank_sprite: Node2D = null
	if tank_hero:
		# Find tank sprite by matching hero ID (hero_data can be Dictionary or Hero resource)
		for child in hero_group.get_children():
			if child.has_method("setup") and child.get("hero_data") != null:
				var hero_data = child.hero_data
				var hero_id = ""
				if hero_data is Dictionary:
					hero_id = hero_data.get("id", "")
				elif "id" in hero_data:
					hero_id = hero_data.id
				
				var tank_id = ""
				if tank_hero is Dictionary:
					tank_id = tank_hero.get("id", "")
				elif "id" in tank_hero:
					tank_id = tank_hero.id
				
				if hero_id != "" and hero_id == tank_id:
					tank_sprite = child as Node2D
					break
	
	# Fallback to first hero if no tank found
	if not tank_sprite or not is_instance_valid(tank_sprite):
		tank_sprite = hero_group.get_child(0) as Node2D
	
	if not tank_sprite or not is_instance_valid(tank_sprite):
		_log_warn("World", "Tank hero sprite is invalid, cannot position camera")
		return
	
	# Set camera target to tank hero for following
	if cam_m:
		# #region agent log
		var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
		var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
		if debug_file:
			debug_file.seek_end()
			var tank_pos = tank_sprite.global_position
			var log_entry = JSON.stringify({"id":"log_camera_target_set","timestamp":Time.get_ticks_msec(),"location":"World.gd:1095","message":"camera target set to tank_hero","data":{"tank_pos_x":tank_pos.x,"tank_pos_y":tank_pos.y,"tank_hero_exists":tank_hero != null,"hero_count":hero_group.get_child_count()},"sessionId":"debug-session","runId":"run1","hypothesisId":"E"})
			debug_file.store_line(log_entry)
			debug_file.close()
		# #endregion
		cam_m.set_target(tank_sprite)
		# Removed verbose logging to prevent output overflow
	
	# Immediately position camera to tank hero position (both X and Y)
	# Tank is positioned on the road, so camera should be positioned to see it
	if camera and tank_sprite is Node2D:
		var hero_pos = tank_sprite.global_position
		# In Godot, Camera2D centers on its position property, not global_position
		# Setting global_position can cause positioning issues
		camera.position = hero_pos
		# #region agent log
		var debug_log_path_pos = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
		var debug_file_pos = FileAccess.open(debug_log_path_pos, FileAccess.WRITE_READ)
		if debug_file_pos:
			debug_file_pos.seek_end()
			var log_entry_pos = JSON.stringify({"id":"log_camera_positioned_to_tank","timestamp":Time.get_ticks_msec(),"location":"World.gd:1131","message":"camera positioned to tank sprite","data":{"tank_pos_x":hero_pos.x,"tank_pos_y":hero_pos.y,"camera_pos_x":camera.global_position.x,"camera_pos_y":camera.global_position.y},"sessionId":"debug-session","runId":"run1","hypothesisId":"E"})
			debug_file_pos.store_line(log_entry_pos)
			debug_file_pos.close()
		# #endregion
	else:
		_log_warn("World", "Camera or tank sprite is null, cannot position camera")
		# #region agent log
		var debug_log_path_pos_fail = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
		var debug_file_pos_fail = FileAccess.open(debug_log_path_pos_fail, FileAccess.WRITE_READ)
		if debug_file_pos_fail:
			debug_file_pos_fail.seek_end()
			var log_entry_pos_fail = JSON.stringify({"id":"log_camera_position_failed","timestamp":Time.get_ticks_msec(),"location":"World.gd:1140","message":"camera position failed - camera or tank sprite null","data":{"camera_exists":camera != null,"tank_sprite_exists":tank_sprite != null,"tank_sprite_is_node2d":tank_sprite is Node2D if tank_sprite != null else false},"sessionId":"debug-session","runId":"run1","hypothesisId":"E"})
			debug_file_pos_fail.store_line(log_entry_pos_fail)
			debug_file_pos_fail.close()
		# #endregion
		# Fallback: Manually position camera if CameraManager not available
		if camera and tank_sprite is Node2D:
			var hero_pos = tank_sprite.global_position
			# Use position instead of global_position for Camera2D
			camera.position = hero_pos
			# Removed verbose logging to prevent output overflow

# Called when a hero is added to PartyManager
func _on_hero_added(_hero):
	# Removed verbose hero added logging to prevent output overflow
	# Spawn all heroes when party is complete (5 heroes)
	# CRITICAL: Only spawn if heroes don't already exist in scene tree
	var party_mgr = get_node_or_null("/root/PartyManager")
	if party_mgr and party_mgr.heroes.size() >= 5:
		# Prevent double-spawn: check if heroes already spawned
		if not hero_group or hero_group.get_child_count() == 0:
			# Removed verbose logging to prevent output overflow
			spawn_party()
		# Removed else branch verbose logging

# Level-up handling is now done by LevelUpHandler
# This method is kept for backward compatibility but should not be called
func _on_hero_level_up(new_level, hero):
	_log_warn("World", "_on_hero_level_up called but should be handled by LevelUpHandler")
	if level_up_handler and level_up_handler.has_method("_on_hero_level_up"):
		level_up_handler._on_hero_level_up(new_level, hero)
		
		var audio_m = get_node_or_null("/root/AudioManager")
		if audio_m:
			audio_m.play_level_up_sfx()
		
		var sc = get_node_or_null("/root/StatCalculator")
		if sc:
			sc.recalculate_hero_stats(hero)
		
		_log_info("World", "Hero %s leveled up to %d!" % [hero.name, new_level])

func _on_mile_changed(mile, _max, _old):
	# Propagate mile change to all heroes for visual evolution
	if hero_group:
		for hero_node in hero_group.get_children():
			if hero_node.has_method("update_body_tier"):
				hero_node.update_body_tier(mile)
				hero_node.update_appearance()
	
	if mile > 0 and mile % 10 == 0:
		_trigger_boss_transition(mile)

func _trigger_boss_transition(mile: int):
	_log_info("World", "Boss Mile %d Transition Started!" % mile)
	var view_size = get_viewport_rect().size
	var wm = get_node_or_null("/root/WorldManager")
	var distance = wm.distance_traveled if wm else 0.0
	var offset = fmod(distance, view_size.x)
	var battle_center = _calculate_battle_center(view_size, offset)
	
	var cam_m = get_node_or_null("/root/CameraManager")
	if cam_m:
		cam_m.shake(20.0, 3.0)
		cam_m.zoom_to_battle(battle_center)
	
	var lighting = get_node_or_null("AtmosphericLighting")
	if lighting:
		var boss_tween = create_tween()
		boss_tween.tween_property(lighting, "color", Color(1.5, 0.2, 0.2), 0.3)
		boss_tween.tween_property(lighting, "color", Color(0.5, 0.3, 0.3), 1.0)
	
	var particle_mgr = get_node_or_null("/root/ParticleManager")
	if particle_mgr:
		particle_mgr.create_floating_text(Vector2(960, 400), "!!! BOSS ENCOUNTER !!!", Color.RED)
		particle_mgr.create_floating_text(Vector2(960, 450), "MILE %d" % mile, Color.GOLD)
		# Add some screen-wide impact sparks
		for i in range(5):
			var rand_pos = Vector2(randf_range(200, 1700), randf_range(200, 800))
			particle_mgr.create_hit_effect(rand_pos, Color.RED)
		
	var audio_m = get_node_or_null("/root/AudioManager")
	if audio_m and audio_m.has_method("play_boss_approach_sfx"):
		audio_m.play_boss_approach_sfx()

var combat_movement_enabled: bool = false

# @CRITICAL: Combat start handler - initializes combat UI, positions heroes/enemies, sets up combat state
# Used by: CombatManager.combat_started signal
# Changing this requires: Update CombatHandler if combat flow changes, maintain hero positioning logic
# Performance: Called once per combat, not performance-critical but affects user experience
func _on_combat_started(enemies: Array):
	# #region agent log
	var debug_log_path_combat = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
	var debug_file_combat = FileAccess.open(debug_log_path_combat, FileAccess.WRITE_READ)
	if debug_file_combat:
		debug_file_combat.seek_end()
		var log_entry_combat = JSON.stringify({"id":"log_combat_started_entry","timestamp":Time.get_ticks_msec(),"location":"World.gd:1265","message":"_on_combat_started called","data":{"enemy_count":enemies.size(),"enemy_group_exists":enemy_group != null,"hero_group_exists":hero_group != null,"hero_count":hero_group.get_child_count() if hero_group else 0},"sessionId":"debug-session","runId":"run1","hypothesisId":"C"})
		debug_file_combat.store_line(log_entry_combat)
		debug_file_combat.close()
	# #endregion
	# CombatHandler handles audio/particles via direct signal connection
	# World handles visual spawning and positioning
	_log_info("World", "Spawning %d enemy visuals for REAL-TIME combat" % enemies.size())
	if not enemy_group: 
		# #region agent log
		var debug_file_no_enemy = FileAccess.open(debug_log_path_combat, FileAccess.WRITE_READ)
		if debug_file_no_enemy:
			debug_file_no_enemy.seek_end()
			var log_entry_no_enemy = JSON.stringify({"id":"log_combat_no_enemy_group","timestamp":Time.get_ticks_msec(),"location":"World.gd:1228","message":"_on_combat_started: enemy_group is null, returning early","data":{},"sessionId":"debug-session","runId":"run1","hypothesisId":"C"})
			debug_file_no_enemy.store_line(log_entry_no_enemy)
			debug_file_no_enemy.close()
		# #endregion
		return
	
	# Audio handled by CombatHandler via signal connection
	var view_size = get_viewport_rect().size
	var wm = get_node_or_null("/root/WorldManager")
	var distance = wm.distance_traveled if wm else 0.0
	var offset = fmod(distance, view_size.x)
	
	# Position heroes for real-time combat (melee front, ranged back)
	_position_heroes_for_combat(view_size, offset)
	
	# Find tank hero sprite to focus camera on
	var party_m = get_node_or_null("/root/PartyManager")
	var tank_hero = null
	if party_m and party_m.has_method("get_tank"):
		tank_hero = party_m.get_tank()
	
	var tank_sprite: Node2D = null
	if tank_hero:
		# Find tank sprite by matching hero ID (hero_data can be Dictionary or Hero resource)
		for child in hero_group.get_children():
			if child.has_method("setup") and child.get("hero_data") != null:
				var hero_data = child.hero_data
				var hero_id = ""
				if hero_data is Dictionary:
					hero_id = hero_data.get("id", "")
				elif "id" in hero_data:
					hero_id = hero_data.id
				
				var tank_id = ""
				if tank_hero is Dictionary:
					tank_id = tank_hero.get("id", "")
				elif "id" in tank_hero:
					tank_id = tank_hero.id
				
				if hero_id != "" and hero_id == tank_id:
					tank_sprite = child as Node2D
					break
	
	# Use tank position for camera, fallback to battle center if no tank
	var camera_target_pos: Vector2
	if tank_sprite and is_instance_valid(tank_sprite):
		camera_target_pos = tank_sprite.global_position
	else:
		# Fallback: Calculate center between heroes and enemies for camera positioning
		camera_target_pos = _calculate_battle_center(view_size, offset)
	
	# #region agent log
	var debug_file = FileAccess.open(debug_log_path_combat, FileAccess.WRITE_READ)
	if debug_file:
		debug_file.seek_end()
		var tank_pos = Vector2.ZERO
		var tank_id = ""
		if tank_hero is Dictionary:
			tank_id = tank_hero.get("id", "")
		elif "id" in tank_hero:
			tank_id = tank_hero.id
		if tank_sprite is Node2D:
			tank_pos = tank_sprite.global_position
		var battle_center = _calculate_battle_center(view_size, offset)
		var road_y_at_tank = 0.0
		if tank_pos != Vector2.ZERO:
			road_y_at_tank = _get_road_y(tank_pos.x, view_size)
		var road_y_at_center = _get_road_y(battle_center.x, view_size)
		var hero_ids = []
		for child in hero_group.get_children():
			if child.get("hero_data") != null:
				var hd = child.hero_data
				var hid = ""
				if hd is Dictionary:
					hid = hd.get("id", "")
				elif "id" in hd:
					hid = hd.id
				hero_ids.append(hid)
		var log_entry = JSON.stringify({"id":"log_combat_started","timestamp":Time.get_ticks_msec(),"location":"World.gd:1320","message":"combat started, finding tank for camera","data":{"camera_target_x":camera_target_pos.x,"camera_target_y":camera_target_pos.y,"tank_hero_exists":tank_hero != null,"tank_id":tank_id,"tank_sprite_exists":tank_sprite != null,"tank_pos_x":tank_pos.x,"tank_pos_y":tank_pos.y,"battle_center_x":battle_center.x,"battle_center_y":battle_center.y,"road_y_at_tank":road_y_at_tank,"road_y_at_center":road_y_at_center,"hero_ids":hero_ids,"hero_count":hero_group.get_child_count(),"view_size_x":view_size.x,"view_size_y":view_size.y,"offset":offset},"sessionId":"debug-session","runId":"run1","hypothesisId":"C"})
		debug_file.store_line(log_entry)
		debug_file.close()
	# #endregion
	
	# Position camera to tank hero (or battle center if no tank)
	var cam_m = get_node_or_null("/root/CameraManager")
	if cam_m:
		# #region agent log
		var debug_file2 = FileAccess.open(debug_log_path_combat, FileAccess.WRITE_READ)
		if debug_file2:
			debug_file2.seek_end()
			var log_entry2 = JSON.stringify({"id":"log_combat_camera_setup","timestamp":Time.get_ticks_msec(),"location":"World.gd:1276","message":"setting up camera for combat","data":{"tank_sprite_valid":tank_sprite != null and is_instance_valid(tank_sprite),"camera_target_x":camera_target_pos.x,"camera_target_y":camera_target_pos.y,"cam_m_exists":cam_m != null},"sessionId":"debug-session","runId":"run1","hypothesisId":"C"})
			debug_file2.store_line(log_entry2)
			debug_file2.close()
		# #endregion
		if tank_sprite is Node2D and is_instance_valid(tank_sprite):
			# Set camera target to tank for following
			cam_m.set_target(tank_sprite)
			# Zoom to tank position
			cam_m.zoom_to_battle(camera_target_pos)
		else:
			# Fallback to battle center
			cam_m.zoom_to_battle(camera_target_pos)
	
	# FORCE HEROES TO RENDER ON TOP
	if hero_group:
		for i in range(hero_group.get_child_count()):
			var hero_node = hero_group.get_child(i)
			hero_node.z_index = 100 + i  # Force high Z-index
	
	# Enable combat movement
	combat_movement_enabled = true
	
	# Clear old enemies
	for child in enemy_group.get_children():
		child.queue_free()
	
	# Spawn enemies with appropriate positioning
	var layout := _get_combat_x_layout(view_size)
	var enemy_melee_x: float = float(layout.get("enemy_melee_x", view_size.x * COMBAT_ENEMY_MELEE_X_RATIO))
	var enemy_ranged_x: float = float(layout.get("enemy_ranged_x", view_size.x * COMBAT_ENEMY_RANGED_X_RATIO))
	var enemy_melee_i := 0
	var enemy_ranged_i := 0
	for i in range(enemies.size()):
		var enemy_data = enemies[i]
		var instance = enemy_scene.instantiate()
		enemy_group.add_child(instance)
		if instance.has_method("setup"):
			instance.setup(enemy_data)
		
		if instance.has_method("play_animation"):
			instance.play_animation("idle")
		
		# Position enemies (melee front, ranged back)
		var is_melee = _is_enemy_melee(enemy_data)
		var base_x: float = enemy_melee_x if is_melee else enemy_ranged_x
		var lane_i: int = enemy_melee_i if is_melee else enemy_ranged_i
		var sx = base_x + (lane_i * COMBAT_SPACING_X)
		if is_melee:
			enemy_melee_i += 1
		else:
			enemy_ranged_i += 1
		var y_offset = COMBAT_Y_OFFSETS[i % COMBAT_Y_OFFSETS.size()]
		var road_y = _get_road_y(sx + offset, view_size)
		# Road Line2D has width 40, so it extends 20 pixels above and below center
		# Position enemies so their feet touch the road surface
		# Now using same scale as heroes (1.0), so same positioning
		var road_surface_y = road_y - 5.0
		var ry = road_surface_y + y_offset
		instance.position = Vector2(sx, ry)
		instance.z_index = 50 - i
		instance.set_meta("combat_y_offset", y_offset)
		
		# Store position in enemy data for combat targeting
		enemy_data["x"] = sx
		enemy_data["y"] = ry
		enemy_data["combat_x"] = sx
		enemy_data["is_melee"] = is_melee
		
	_log_info("World", "Enemy group visually spawned with role-based positioning.")

func _on_combat_ended(victory: bool):
	# CombatHandler handles audio/particles via direct signal connection
	# World handles visual cleanup
	combat_movement_enabled = false
	
	# RESET HERO VISUALS - Fix disappearing sprite issue
	if hero_group:
		for hero_node in hero_group.get_children():
			if is_instance_valid(hero_node) and hero_node.has_method("get_node"):
				var vis_node = hero_node.get_node_or_null("Visuals")
				if vis_node:
					vis_node.modulate = Color.WHITE  # Reset alpha to full visibility
				hero_node.visible = true
			if hero_node.has_meta("combat_y_offset"):
				hero_node.remove_meta("combat_y_offset")
			# Reset death animation flag
			hero_node._death_animation_played = false
	
	var audio_m = get_node_or_null("/root/AudioManager")
	var anim_m = get_node_or_null("/root/AnimationManager")
	var particle_mgr = get_node_or_null("/root/ParticleManager")
	
	if audio_m:
		audio_m.play_music("travel")
	
	if has_node("/root/CameraManager"):
		# Resume travel
		var wm_node = get_node_or_null("/root/WorldManager")
		if wm_node:
			wm_node.combat_active = false
		var cam_m = get_node_or_null("/root/CameraManager")
		if cam_m:
			cam_m.reset_zoom()
	
	# Reset boss lighting if active
	var lighting = get_node_or_null("AtmosphericLighting")
	if lighting and lighting.color != Color.WHITE:
		var reset_tween = create_tween()
		reset_tween.tween_property(lighting, "color", Color.WHITE, 1.5)
	
	if victory:
		# Check if this was the final boss fight (Mile 100)
		if is_final_boss_fight:
			_handle_mile_100_victory()
			is_final_boss_fight = false
			return  # Victory celebration handles cleanup
		
		if enemy_group:
			for enemy in enemy_group.get_children():
				if particle_mgr:
					particle_mgr.create_death_effect(enemy.global_position)
				enemy.visible = false
		
		if anim_m and hero_group:
			for hero_node in hero_group.get_children():
				hero_node.play_animation("victory")
				# Delay returning to walk
				get_tree().create_timer(1.5).timeout.connect(_on_victory_anim_complete.bind(hero_node))
			
	var timer = get_tree().create_timer(1.5)
	timer.timeout.connect(_on_combat_cleanup)

func _handle_mile_100_victory():
	_log_info("World", "Mile 100 Victory! Starting celebration")
	
	# Massive victory celebration
	var particle_mgr = get_node_or_null("/root/ParticleManager")
	if particle_mgr:
		# Screen-wide celebration effects
		for i in range(20):
			var rand_pos = Vector2(randf_range(100, 1820), randf_range(100, 980))
			# Store position to avoid closure capture issues
			var pos = rand_pos
			get_tree().create_timer(i * 0.1).timeout.connect(func(): 
				var pm_local = get_node_or_null("/root/ParticleManager")
				if pm_local:
					pm_local.create_hit_effect(pos, Color.GOLD)
			)
		
		# Victory text
		particle_mgr.create_floating_text(Vector2(960, 200), "VICTORY!", Color.GOLD)
		particle_mgr.create_floating_text(Vector2(960, 250), "MILE 100 CHAMPION", Color.WHITE)
		particle_mgr.create_floating_text(Vector2(960, 300), "YOU'VE COMPLETED", Color.GOLD)
		particle_mgr.create_floating_text(Vector2(960, 350), "THE ROAD TO WAR!", Color.GOLD)
	
	# Victory animations for all heroes
	var anim_m = get_node_or_null("/root/AnimationManager")
	if anim_m and hero_group:
		for hero_node in hero_group.get_children():
			hero_node.play_animation("victory")
	
	# Trigger massive bloom effect
	trigger_bloom(3.0, 5.0)
	
	# Grant victory rewards
	_grant_mile_100_rewards()
	
	# Show post-victory dialog after delay
	get_tree().create_timer(3.0).timeout.connect(_show_post_victory_dialog)
	
	# Clean up enemies
	if enemy_group:
		for enemy in enemy_group.get_children():
			if particle_mgr:
				particle_mgr.create_death_effect(enemy.global_position)
			enemy.visible = false

func _grant_mile_100_rewards():
	_log_info("World", "Granting Mile 100 victory rewards")
	
	# Grant gold
	var gm = get_node_or_null("/root/GoldManager")
	if gm:
		gm.add_gold(20000)
	
	# Grant talent points
	var party_mgr = get_node_or_null("/root/PartyManager")
	if party_mgr:
		for hero in party_mgr.heroes:
			hero.available_talent_points += 5
	
	# Grant prestige points
	var prestige_m = get_node_or_null("/root/PrestigeManager")
	if prestige_m:
		# Base prestige points for reaching Mile 100
		var base_points = 20
		prestige_m.prestige_points += base_points
		_log_info("World", "Granted %d prestige points" % base_points)
	
	# Unlock achievement
	var am = get_node_or_null("/root/AchievementManager")
	if am and am.has_method("unlock_achievement"):
		am.unlock_achievement("mile_100_champion")
	
	var part_m = get_node_or_null("/root/ParticleManager")
	if part_m:
		part_m.create_floating_text(Vector2(960, 500), "Rewards: 20,000 Gold, 5 Talent Points, 20 Prestige Points", Color.GREEN)

func _show_post_victory_dialog():
	_log_info("World", "Showing post-victory dialog")
	# This will be implemented as a UI dialog scene
	# For now, we'll create a simple modal
	_create_victory_dialog()

func _create_victory_dialog():
	# Create victory dialog UI with proper buttons
	var canvas_layer = get_node_or_null("CanvasLayer")
	if not canvas_layer:
		canvas_layer = CanvasLayer.new()
		canvas_layer.name = "CanvasLayer"
		add_child(canvas_layer)
	
	# Remove existing dialog if present
	var existing = canvas_layer.get_node_or_null("VictoryDialog")
	if existing:
		existing.queue_free()
	
	# Use UIBuilder for consistent WoW-style UI
	var ui_builder = get_node_or_null("/root/UIBuilder")
	if not ui_builder:
		_log_warn("World", "UIBuilder not found, falling back to manual UI creation")
		_show_victory_dialog_manual(canvas_layer)
		return
	
	# Create main panel using UIBuilder
	var panel = ui_builder.create_frame(canvas_layer, Vector2(700, 500), Vector2.ZERO, {
		"bg_color": Color(0.1, 0.1, 0.15, 0.95),
		"border_color": Color(0.8, 0.7, 0.2),
		"border_width": 3
	})
	panel.name = "VictoryDialog"
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-350, -250)
	
	# VBox container for content
	var vbox = ui_builder.create_vbox_container(panel, 20)
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	# Title using UIBuilder
	var title = ui_builder.create_title_label(vbox, "⚔️ VICTORY! ⚔️")
	title.add_theme_font_size_override("font_size", 36)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color.GOLD)
	
	# Message using UIBuilder
	var message = ui_builder.create_body_label(vbox, "Congratulations! You've completed the Road to War!\nMile 100 Champion")
	message.add_theme_font_size_override("font_size", 24)
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	
	# Spacer
	var spacer1 = Control.new()
	spacer1.custom_minimum_size = Vector2(0, 20)
	vbox.add_child(spacer1)
	
	# What's Next label
	var next_label = ui_builder.create_heading_label(vbox, "What's Next?")
	next_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	# Button container
	var button_container = ui_builder.create_vbox_container(vbox, 15)
	
	# Buttons using UIBuilder
	var continue_btn = ui_builder.create_button(button_container, "Continue Journey (BRUTAL MODE)", Vector2(0, 50))
	continue_btn.pressed.connect(_on_continue_journey_pressed)
	
	var prestige_btn = ui_builder.create_button(button_container, "Prestige - Reset for Greater Power", Vector2(0, 50))
	prestige_btn.pressed.connect(_on_prestige_from_victory_pressed)
	
	var not_now_btn = ui_builder.create_button(button_container, "Not Now - Continue Playing", Vector2(0, 40))
	not_now_btn.pressed.connect(_on_victory_not_now_pressed)

# Fallback manual UI creation (if UIBuilder not available)
func _show_victory_dialog_manual(_canvas_layer: CanvasLayer):
	_log_warn("World", "Using manual UI creation fallback")
	# Original manual creation code would go here as fallback

func _on_continue_journey_pressed():
	_log_info("World", "Player chose Continue Journey - showing brutal mode selection")
	_remove_victory_dialog()
	_show_brutal_mode_selection()

func _on_prestige_from_victory_pressed():
	_log_info("World", "Player chose Prestige from victory dialog")
	_remove_victory_dialog()
	_show_prestige_confirmation_dialog()

func _on_victory_not_now_pressed():
	_log_info("World", "Player chose Not Now - continuing gameplay")
	_remove_victory_dialog()

func _remove_victory_dialog():
	var canvas_layer = get_node_or_null("CanvasLayer")
	if canvas_layer:
		var dialog = canvas_layer.get_node_or_null("VictoryDialog")
		if dialog:
			dialog.queue_free()

func _show_brutal_mode_selection():
	_log_info("World", "Showing brutal mode selection dialog")
	var bm = get_node_or_null("/root/BrutalModeManager")
	if not bm:
		_log_error("World", "BrutalModeManager not found")
		return
	
	var canvas_layer = get_node_or_null("CanvasLayer")
	if not canvas_layer:
		canvas_layer = CanvasLayer.new()
		canvas_layer.name = "CanvasLayer"
		add_child(canvas_layer)
	
	# Remove existing dialog if present
	var existing = canvas_layer.get_node_or_null("BrutalModeDialog")
	if existing:
		existing.queue_free()
	
	# Use UIBuilder for consistent UI
	var ui_builder = get_node_or_null("/root/UIBuilder")
	if not ui_builder:
		_log_warn("World", "UIBuilder not found, using manual UI creation")
		_show_brutal_mode_selection_manual(canvas_layer, bm)
		return
	
	# Create main panel using UIBuilder
	var panel = ui_builder.create_frame(canvas_layer, Vector2(800, 600), Vector2.ZERO, {
		"bg_color": Color(0.1, 0.05, 0.05, 0.95),
		"border_color": Color(0.8, 0.2, 0.2),
		"border_width": 3
	})
	panel.name = "BrutalModeDialog"
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-400, -300)
	
	# VBox container
	var vbox = ui_builder.create_vbox_container(panel, 15)
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	# Warning title using UIBuilder
	var warning_title = ui_builder.create_title_label(vbox, "⚠️ BRUTAL MODE SELECTION ⚠️")
	warning_title.add_theme_font_size_override("font_size", 32)
	warning_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	warning_title.add_theme_color_override("font_color", Color.RED)
	
	# Warning message using UIBuilder
	var warning_msg = ui_builder.create_body_label(vbox, "WARNING: Miles 101+ are BRUTAL!\nLike going from Normal to Mythic+ dungeons!\n\nSelect your difficulty level:")
	warning_msg.add_theme_font_size_override("font_size", 18)
	warning_msg.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	warning_msg.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	
	# Scroll container for difficulty buttons
	var scroll = ui_builder.create_scroll_container(vbox, Vector2(0, 300))
	
	var difficulty_grid = ui_builder.create_grid_container(scroll, 2, 10)
	
	# Create difficulty buttons using UIBuilder
	var recommended = bm.get_recommended_difficulty()
	for level in range(1, 11):
		var difficulty_name = bm.get_difficulty_name(level)
		var multiplier = 1.0 + (level * 0.5)
		var btn_text = "[%d] %s (%.1fx)" % [level, difficulty_name, multiplier]
		
		if level == recommended:
			btn_text += " ⭐ RECOMMENDED"
		
		var btn = ui_builder.create_button(difficulty_grid, btn_text, Vector2(380, 40))
		
		# Highlight recommended difficulty
		if level == recommended:
			var btn_style = StyleBoxFlat.new()
			btn_style.bg_color = Color(0.2, 0.4, 0.2, 0.8)
			btn.add_theme_stylebox_override("normal", btn_style)
		
		# Connect button
		btn.pressed.connect(func(): _select_brutal_difficulty(level))
	
	# Bottom buttons using UIBuilder
	var bottom_buttons = ui_builder.create_hbox_container(vbox, 10)
	
	var prestige_btn = ui_builder.create_button(bottom_buttons, "Prestige Instead", Vector2(0, 40))
	prestige_btn.pressed.connect(_on_prestige_from_brutal_pressed)
	
	var back_btn = ui_builder.create_cancel_button(bottom_buttons, "Back", Vector2(0, 40))
	back_btn.pressed.connect(_remove_brutal_mode_dialog)

# Fallback manual UI creation
func _show_brutal_mode_selection_manual(_canvas_layer: CanvasLayer, _bm: Node):
	_log_warn("World", "Using manual UI creation fallback for brutal mode dialog")
	# Original manual creation code would go here as fallback

func _on_prestige_from_brutal_pressed():
	_log_info("World", "Player chose Prestige from brutal mode dialog")
	_remove_brutal_mode_dialog()
	_show_prestige_confirmation_dialog()

func _remove_brutal_mode_dialog():
	var canvas_layer = get_node_or_null("CanvasLayer")
	if canvas_layer:
		var dialog = canvas_layer.get_node_or_null("BrutalModeDialog")
		if dialog:
			dialog.queue_free()

func _select_brutal_difficulty(level: int):
	var bm = get_node_or_null("/root/BrutalModeManager")
	if bm and bm.select_brutal_difficulty(level):
		_log_info("World", "Brutal mode selected: %s" % bm.get_difficulty_name(level))
		_remove_brutal_mode_dialog()
		var particle_mgr = get_node_or_null("/root/ParticleManager")
		if particle_mgr:
			particle_mgr.create_floating_text(Vector2(960, 400), "BRUTAL MODE: %s" % bm.get_difficulty_name(level), Color.RED)
	else:
		_log_error("World", "Failed to select brutal difficulty level %d" % level)

func _show_prestige_confirmation_dialog():
	_log_info("World", "Showing prestige confirmation dialog")
	var prestige_mgr = get_node_or_null("/root/PrestigeManager")
	if not prestige_mgr:
		_log_error("World", "PrestigeManager not found")
		return
	
	var prestige_points = prestige_mgr.calculate_prestige_points()
	var prestige_level = prestige_mgr.prestige_level
	
	var canvas_layer = get_node_or_null("CanvasLayer")
	if not canvas_layer:
		canvas_layer = CanvasLayer.new()
		canvas_layer.name = "CanvasLayer"
		add_child(canvas_layer)
	
	# Remove existing dialog if present
	var existing = canvas_layer.get_node_or_null("PrestigeConfirmationDialog")
	if existing:
		existing.queue_free()
	
	# Use UIBuilder for consistent UI
	var ui_builder = get_node_or_null("/root/UIBuilder")
	if not ui_builder:
		_log_warn("World", "UIBuilder not found, using manual UI creation")
		_show_prestige_confirmation_dialog_manual(canvas_layer, prestige_mgr, prestige_points, prestige_level)
		return
	
	# Create main panel using UIBuilder
	var panel = ui_builder.create_frame(canvas_layer, Vector2(750, 550), Vector2.ZERO, {
		"bg_color": Color(0.15, 0.1, 0.15, 0.95),
		"border_color": Color(0.8, 0.7, 0.2),
		"border_width": 3
	})
	panel.name = "PrestigeConfirmationDialog"
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-375, -275)
	
	# VBox container
	var vbox = ui_builder.create_vbox_container(panel, 15)
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	# Title using UIBuilder
	var title = ui_builder.create_title_label(vbox, "PRESTIGE AVAILABLE")
	title.add_theme_font_size_override("font_size", 32)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color.GOLD)
	
	# Message using UIBuilder
	var message = ui_builder.create_body_label(vbox, "You've reached Mile 100!\nReset for greater power.")
	message.add_theme_font_size_override("font_size", 20)
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	
	# Prestige info using UIBuilder
	var info_box = ui_builder.create_vbox_container(vbox, 10)
	
	var points_label = ui_builder.create_body_label(info_box, "Prestige Points: %d" % prestige_points)
	points_label.add_theme_font_size_override("font_size", 18)
	points_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	var level_label = ui_builder.create_body_label(info_box, "Prestige Level: %d → %d" % [prestige_level, prestige_level + 1])
	level_label.add_theme_font_size_override("font_size", 18)
	level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	# Keep vs Gain section using UIBuilder
	var keep_gain_container = ui_builder.create_hbox_container(vbox, 15)
	
	# You Keep column
	var keep_column = ui_builder.create_vbox_container(keep_gain_container, 5)
	
	var keep_title = ui_builder.create_heading_label(keep_column, "YOU KEEP:")
	keep_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	var keep_list = [
		"• Prestige Level",
		"• Upgrades",
		"• Banked Items",
		"• Achievements",
		"• Statistics"
	]
	for item in keep_list:
		var label = ui_builder.create_small_label(keep_column, item)
		label.add_theme_font_size_override("font_size", 14)
	
	# You Gain column
	var gain_column = ui_builder.create_vbox_container(keep_gain_container, 5)
	
	var gain_title = ui_builder.create_heading_label(gain_column, "YOU GAIN:")
	gain_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	var gain_list = [
		"• %d Points" % prestige_points,
		"• Prestige Upgrades",
		"• Challenge Modes",
		"• Faster Progress"
	]
	for item in gain_list:
		var label = ui_builder.create_small_label(gain_column, item)
		label.add_theme_font_size_override("font_size", 14)
	
	# Prestige Bank preview (if unlocked)
	var pb = get_node_or_null("/root/PrestigeBank")
	if pb and pb.is_unlocked():
		var bank_spacer = Control.new()
		bank_spacer.custom_minimum_size = Vector2(0, 10)
		vbox.add_child(bank_spacer)
		
		var bank_info = ui_builder.create_body_label(vbox, "💼 Prestige Bank: %d/%d slots available" % [pb.max_bank_slots - pb.banked_items.size(), pb.max_bank_slots])
		bank_info.add_theme_font_size_override("font_size", 16)
		bank_info.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		bank_info.add_theme_color_override("font_color", Color(0.8, 0.8, 0.2))
		
		if pb.banked_items.size() > 0:
			var banked_list = ui_builder.create_small_label(vbox, "Items preserved: %d" % pb.banked_items.size())
			banked_list.add_theme_font_size_override("font_size", 14)
			banked_list.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	
	# Bottom buttons using UIBuilder
	var bottom_buttons = ui_builder.create_hbox_container(vbox, 10)
	
	var continue_btn = ui_builder.create_button(bottom_buttons, "Continue Journey", Vector2(0, 40))
	continue_btn.pressed.connect(_on_continue_from_prestige_pressed)
	
	var prestige_btn = ui_builder.create_confirm_button(bottom_buttons, "Prestige Now", Vector2(0, 40))
	prestige_btn.pressed.connect(_on_confirm_prestige_pressed)
	
	var cancel_btn = ui_builder.create_cancel_button(bottom_buttons, "Not Now", Vector2(0, 40))
	cancel_btn.pressed.connect(_remove_prestige_dialog)

# Fallback manual UI creation
func _show_prestige_confirmation_dialog_manual(_canvas_layer: CanvasLayer, _pm: Node, _prestige_points: int, _prestige_level: int):
	_log_warn("World", "Using manual UI creation fallback for prestige dialog")
	# Original manual creation code would go here as fallback

func _on_continue_from_prestige_pressed():
	_log_info("World", "Player chose Continue Journey from prestige dialog")
	_remove_prestige_dialog()
	_show_brutal_mode_selection()

func _on_confirm_prestige_pressed():
	_log_info("World", "Player confirmed prestige")
	_remove_prestige_dialog()
	var prestige_mgr = get_node_or_null("/root/PrestigeManager")
	if prestige_mgr:
		prestige_mgr.perform_prestige()

func _remove_prestige_dialog():
	var canvas_layer = get_node_or_null("CanvasLayer")
	if canvas_layer:
		var dialog = canvas_layer.get_node_or_null("PrestigeConfirmationDialog")
		if dialog:
			dialog.queue_free()

func _on_victory_anim_complete(hero_node):
	var anim_m = get_node_or_null("/root/AnimationManager")
	if is_instance_valid(hero_node) and anim_m: 
		anim_m.play_animation(hero_node, "walk")

func _on_combat_cleanup():
	if not enemy_group: return
	for child in enemy_group.get_children():
		child.queue_free()

func _on_loot_spawned(loot_items: Array):
	var wm = get_node_or_null("/root/WorldManager")
	var current_dist = wm.distance_traveled if wm else 0.0
	
	for item in loot_items:
		var sprite = Sprite2D.new()
		sprite.name = "Loot_" + str(item.get("id", "item"))
		
		# Store the absolute world X position
		var world_x = item.get("x", 0) + current_dist
		sprite.set_meta("world_x", world_x)
		sprite.set_meta("orig_y", item.get("y", 0))
		sprite.set_meta("item_id", item.get("id"))
		
		sprite.position = Vector2(item.get("x", 0), item.get("y", 0))
		sprite.scale = Vector2(0.5, 0.5)
		
		# Set texture from item data icon if available
		var item_data = item.get("data", {})
		var icon_path = item_data.get("icon", "res://assets/icons/gems/increased_area.png")
		if ResourceLoader.exists(icon_path):
			sprite.texture = load(icon_path)
		
		# Set meta for later identification
		sprite.set_meta("item_id", item.get("id"))
		loot_group.add_child(sprite)
		
		# Add a small pop animation
		sprite.scale = Vector2.ZERO
		var tween = create_tween()
		tween.tween_property(sprite, "scale", Vector2(0.5, 0.5), 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

func _on_item_picked_up(item: Dictionary):
	var item_id = item.get("id")
	_log_debug("World", "Visualizing pickup for item: %s" % str(item_id))
	
	var found = false
	for child in loot_group.get_children():
		if child.get_meta("item_id") == item_id:
			# Visual pickup animation
			var tween = create_tween()
			tween.tween_property(child, "scale", Vector2.ZERO, 0.15).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
			tween.tween_callback(child.queue_free)
			found = true
			break
	
	if not found:
		_log_warn("World", "Could not find visual for picked up item: %s" % str(item_id))

func _resume_combat_if_active() -> void:
	# If the player returns to World mid-combat (after opening menus), re-spawn enemy visuals.
	# Declare variables at function level to avoid scope warnings
	var combat_mgr = get_node_or_null("/root/CombatManager")
	var wm = get_node_or_null("/root/WorldManager")
	if not combat_mgr or not combat_mgr.in_combat:
		return
	if wm:
		wm.combat_active = true
	var enemies: Array = combat_mgr.current_combat.get("enemies", [])
	if not enemies.is_empty():
		_on_combat_started(enemies)

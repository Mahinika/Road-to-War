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

const BASE_VISUAL_SCALE = Vector2(1, 1)

var hero_data
var name_label
var health_bar
var anim_player: AnimationPlayer
var class_type: String = ""
var base_sprite_name: String = "humanoid_0"
var _current_anim: String = ""
var _texture_cache: Dictionary = {}
var layer_nodes: Dictionary = {}
var current_body_tier: int = 0
var mile_thresholds: Array[int] = [0, 26, 51, 76]

var _placeholder_cache: Dictionary = {}

# Animation safety: Never let AnimationPlayer write to Sprite2D.frame directly.
# If a sprite has hframes*vframes == 1, setting frame > 0 triggers a C++ error spam.
# Animations should write to this proxy property, which clamps via _safe_set_frame().
var _body_frame_proxy_internal: int = 0
var body_frame_proxy: int = 0:
	set(value):
		_body_frame_proxy_internal = value
		_safe_set_frame(body_layer, value)
	get:
		if body_layer:
			return body_layer.frame
		return _body_frame_proxy_internal

# Debug: detect heroes being removed from the scene tree during combat
func _exit_tree():
	# #region agent log
	var log_file_exit = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
	if log_file_exit:
		var h_id = "unknown"
		if hero_data:
			h_id = hero_data.get("id", "unknown") if hero_data is Dictionary else hero_data.id
		log_file_exit.seek_end()
		log_file_exit.store_line(JSON.stringify({
			"location":"HeroSprite.gd:_exit_tree",
			"message":"HeroSprite exiting tree",
			"data":{
				"hero_id": h_id
			},
			"timestamp":Time.get_ticks_msec(),
			"sessionId":"debug-session",
			"hypothesisId":"AA,E"
		}))
		log_file_exit.close()
	# #endregion
var _missing_visual_paths: Dictionary = {}

@onready var visuals = $Visuals
@onready var body_layer = $Visuals/Body
@onready var legs_layer = $Visuals/Legs
@onready var chest_layer = $Visuals/Chest
@onready var shoulder_layer = $Visuals/Shoulder
@onready var neck_layer = $Visuals/Neck
@onready var head_layer = $Visuals/Head
@onready var weapon_layer = $Visuals/Weapon
@onready var offhand_layer = $Visuals/Offhand
@onready var ring_layer = $Visuals/Ring
@onready var trinket_layer = $Visuals/Trinket

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
	
	# Apply transparency shader to each layer uniquely
	var shader_path = "res://scripts/SpriteTransparency.gdshader"
	if ResourceLoader.exists(shader_path):
		var shader = load(shader_path)
		if shader:
			for layer in layer_nodes.values():
				if layer:
					var shader_mat = ShaderMaterial.new()
					shader_mat.shader = shader
					layer.material = shader_mat
	
	# Programmatic AnimationPlayer
	anim_player = AnimationPlayer.new()
	add_child(anim_player)
	anim_player.animation_finished.connect(_on_animation_finished)
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
		"neck": neck_layer,
		"head": head_layer,
		"weapon": weapon_layer,
		"offhand": offhand_layer,
		"ring": ring_layer,
		"trinket": trinket_layer
	}
	
	# Ensure consistent pivot: bottom-center
	for layer in layer_nodes.values():
		if layer:
			layer.centered = true
			# We'll set the offset dynamically in _set_layer_texture
			# based on the actual texture height to ensure bottom-alignment.
			layer.offset = Vector2(0, -32) 

func _setup_animations():
	"""Setup animations using full LPC sheet indices (13x21 grid) - Only Body is tracked, others slave to it"""
	var library = AnimationLibrary.new()
	
	# LPC Row Indices (FACING RIGHT - Optimized for player units on left)
	# Row 3: Spellcast Right (Frames 39-45)
	# Row 7: Thrust Right (Frames 91-98)
	# Row 11: Walk Right (Frames 143-151)
	# Row 15: Slash Right (Frames 195-200)
	# Row 19: Shoot Right (Frames 247-259)
	# Row 20: Hurt (Frames 260-265)
	
	# --- IDLE ---
	var idle_anim = Animation.new()
	idle_anim.length = 2.0
	_add_bob_track(idle_anim)
	_add_frame_track(idle_anim, ".:body_frame_proxy", [0.0], [143]) # Row 11, Col 0
	idle_anim.loop_mode = Animation.LOOP_LINEAR
	library.add_animation("idle", idle_anim)
	
	# --- WALK ---
	var walk_anim = Animation.new()
	walk_anim.length = 0.8
	_add_bob_track(walk_anim, -5.0)
	var walk_frames = []
	var walk_times = []
	for i in range(9): # 9 frames in LPC walk
		walk_times.append(i * (0.8/9.0))
		walk_frames.append(143 + i)
	_add_frame_track(walk_anim, ".:body_frame_proxy", walk_times, walk_frames)
	walk_anim.loop_mode = Animation.LOOP_LINEAR
	library.add_animation("walk", walk_anim)
	
	# --- ATTACK (SLASH) ---
	var attack_anim = Animation.new()
	attack_anim.length = 0.4
	_add_lunge_track(attack_anim, 15.0)
	var attack_frames = []
	var attack_times = []
	for i in range(6): # 6 frames in LPC slash
		attack_times.append(i * (0.4/6.0))
		attack_frames.append(195 + i)
	_add_frame_track(attack_anim, ".:body_frame_proxy", attack_times, attack_frames)
	library.add_animation("attack", attack_anim)
	
	# --- THRUST (SPEAR) ---
	var thrust_anim = Animation.new()
	thrust_anim.length = 0.5
	_add_lunge_track(thrust_anim, 20.0)
	var thrust_frames = []
	var thrust_times = []
	for i in range(8):
		thrust_times.append(i * (0.5/8.0))
		thrust_frames.append(91 + i)
	_add_frame_track(thrust_anim, ".:body_frame_proxy", thrust_times, thrust_frames)
	library.add_animation("thrust", thrust_anim)
	
	# --- SHOOT (BOW) ---
	var shoot_anim = Animation.new()
	shoot_anim.length = 0.8
	var shoot_frames = []
	var shoot_times = []
	for i in range(13):
		shoot_times.append(i * (0.8/13.0))
		shoot_frames.append(247 + i)
	_add_frame_track(shoot_anim, ".:body_frame_proxy", shoot_times, shoot_frames)
	library.add_animation("shoot", shoot_anim)
	
	# --- CAST ---
	var cast_anim = Animation.new()
	cast_anim.length = 0.6
	var cast_frames = []
	var cast_times = []
	for i in range(7):
		cast_times.append(i * (0.6/7.0))
		cast_frames.append(39 + i)
	_add_frame_track(cast_anim, ".:body_frame_proxy", cast_times, cast_frames)
	library.add_animation("cast", cast_anim)
	
	# --- HURT ---
	var hurt_anim = Animation.new()
	hurt_anim.length = 0.3
	var hurt_frames = []
	var hurt_times = []
	for i in range(6):
		hurt_times.append(i * 0.05)
		hurt_frames.append(260 + i)
	_add_frame_track(hurt_anim, ".:body_frame_proxy", hurt_times, hurt_frames)
	
	var hurt_mod_track = hurt_anim.add_track(Animation.TYPE_VALUE)
	hurt_anim.track_set_path(hurt_mod_track, "Visuals:modulate")
	hurt_anim.track_insert_key(hurt_mod_track, 0.0, Color.WHITE)
	hurt_anim.track_insert_key(hurt_mod_track, 0.05, Color.RED)
	hurt_anim.track_insert_key(hurt_mod_track, 0.3, Color.WHITE)
	library.add_animation("hurt", hurt_anim)
	
	# --- DEATH ---
	var death_anim = Animation.new()
	death_anim.length = 1.0
	_add_frame_track(death_anim, ".:body_frame_proxy", [0.0], [265]) # Lying down
	
	var death_modulate_track = death_anim.add_track(Animation.TYPE_VALUE)
	death_anim.track_set_path(death_modulate_track, "Visuals:modulate")
	death_anim.track_insert_key(death_modulate_track, 0.0, Color.WHITE)
	death_anim.track_insert_key(death_modulate_track, 1.0, Color(1.0, 1.0, 1.0, 0.0))
	library.add_animation("death", death_anim)
	
	anim_player.add_animation_library("", library)

func _add_frame_track(anim: Animation, path: String, times: Array, frames: Array):
	var track = anim.add_track(Animation.TYPE_VALUE)
	anim.track_set_path(track, path)
	for i in range(times.size()):
		anim.track_insert_key(track, times[i], frames[i])
	anim.track_set_interpolation_type(track, Animation.INTERPOLATION_NEAREST)

# Helper function to safely set frame with bounds checking
func _safe_set_frame(sprite: Sprite2D, frame_index: int):
	"""Safely set sprite frame, clamping to valid range"""
	if not sprite:
		return
	var max_frames = sprite.hframes * sprite.vframes
	if max_frames <= 0:
		max_frames = 1
	var safe_frame = clampi(frame_index, 0, max_frames - 1)
	if sprite.frame != safe_frame:
		# #region agent log
		var log_file = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
		if log_file:
			log_file.seek_end()
			log_file.store_line(JSON.stringify({
				"location": "HeroSprite.gd:_safe_set_frame",
				"message": "Setting frame with bounds check",
				"data": {
					"sprite_name": sprite.name,
					"requested_frame": frame_index,
					"safe_frame": safe_frame,
					"hframes": sprite.hframes,
					"vframes": sprite.vframes,
					"max_frames": max_frames,
					"was_clamped": frame_index != safe_frame
				},
				"timestamp": Time.get_ticks_msec(),
				"sessionId": "debug-session",
				"hypothesisId": "B"
			}))
			log_file.close()
		# #endregion
		sprite.frame = safe_frame

func _add_bob_track(anim: Animation, depth: float = -3.0):
	var track = anim.add_track(Animation.TYPE_VALUE)
	anim.track_set_path(track, "Visuals:position:y")
	anim.track_insert_key(track, 0.0, 0.0)
	anim.track_insert_key(track, anim.length / 2.0, depth)
	anim.track_insert_key(track, anim.length, 0.0)

func _add_lunge_track(anim: Animation, distance: float = 15.0):
	var track = anim.add_track(Animation.TYPE_VALUE)
	anim.track_set_path(track, "Visuals:position:x")
	anim.track_insert_key(track, 0.0, 0.0)
	anim.track_insert_key(track, anim.length * 0.25, distance)
	anim.track_insert_key(track, anim.length * 0.75, 0.0)

var _death_animation_played: bool = false

func play_animation(anim_name: String):
	"""Play animation using full sheet indices—Zero texture swapping required!"""
	# Smart animation routing based on class (SOP v3.0)
	var final_anim = anim_name
	if anim_name == "attack":
		# Healers should visually "cast" instead of doing melee slashes.
		# This massively improves combat readability (RuneScape-style standing combat).
		if hero_data and hero_data.role == "healer":
			final_anim = "cast"
		else:
			match class_type:
				"hunter": final_anim = "shoot"
				"mage", "warlock": final_anim = "cast"
				"druid", "shaman": final_anim = "thrust"
				_: final_anim = "attack" # Standard slash for warriors, paladins, rogues
			
	# Prevent re-playing same animation every frame
	if final_anim == _current_anim:
		return
		
	# Prevent re-playing death animation
	if final_anim == "death" and _death_animation_played:
		return
	
	_current_anim = final_anim
	
	if anim_player and anim_player.has_animation(final_anim):
		# SAFETY CHECK: Only play if the texture actually supports the frames
		# LPC sheets are 13x21. If hframes is 1, it's a legacy sprite and would crash.
		if body_layer.hframes > 1:
			# Connect to animation_changed to intercept frame changes
			if not anim_player.animation_changed.is_connected(_on_animation_frame_changed):
				anim_player.animation_changed.connect(_on_animation_frame_changed)
			anim_player.play(final_anim)
		else:
			# For legacy sprites, we only play the basic bobbing (idle/walk)
			# and stop the player for frame-intensive attacks
			if final_anim in ["idle", "walk"]:
				anim_player.play(final_anim)
			else:
				anim_player.stop()
		
		# Death animation special handling
		if final_anim == "death":
			_death_animation_played = true
			_trigger_death_particles()

func _on_animation_frame_changed(anim_name: String):
	"""Intercept animation frame changes to ensure body frame stays in bounds"""
	if body_layer and body_layer.hframes > 0 and body_layer.vframes > 0:
		var max_frames = body_layer.hframes * body_layer.vframes
		if body_layer.frame >= max_frames:
			# #region agent log
			var log_file = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
			if log_file:
				log_file.seek_end()
				log_file.store_line(JSON.stringify({
					"location": "HeroSprite.gd:_on_animation_frame_changed",
					"message": "Animation set invalid frame, clamping",
					"data": {
						"anim_name": anim_name,
						"invalid_frame": body_layer.frame,
						"max_frames": max_frames,
						"hframes": body_layer.hframes,
						"vframes": body_layer.vframes
					},
					"timestamp": Time.get_ticks_msec(),
					"sessionId": "debug-session",
					"hypothesisId": "C"
				}))
				log_file.close()
			# #endregion
			_safe_set_frame(body_layer, body_layer.frame)

func _on_animation_finished(anim_name: String):
	"""Called when any animation finishes - handles cleanup and state reset"""
	_current_anim = "" # Reset tracking so animation can be played again
	
	if anim_name == "death":
		# Ensure fully faded out
		if visuals:
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
		health_bar.visible = false # Hero health is shown in Party Frames
		var ut = get_node_or_null("/root/UITheme")
		var sb_bg = StyleBoxFlat.new()
		sb_bg.bg_color = Color(0.1, 0.1, 0.1, 0.8)
		health_bar.add_theme_stylebox_override("background", sb_bg)
		
		var sb_fill = StyleBoxFlat.new()
		sb_fill.bg_color = ut.COLORS["health"] if ut else Color(0.3, 1.0, 0.3, 1.0)
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
	
	# 1. Reset Body state
	_apply_base_body() 
	
	# 2. Clear all equipment layers
	for slot in ["legs", "chest", "shoulder", "neck", "head", "weapon", "offhand", "ring", "trinket"]:
		var layer = layer_nodes.get(slot)
		if layer:
			layer.texture = null
			layer.modulate = Color.WHITE
			layer.visible = false
			layer.scale = Vector2(1.0, 1.0)
			layer.offset = Vector2(0, -32)
	
	# 3. Apply visuals for equipped items
	apply_equipment(equipment)

func apply_equipment(equipment: Dictionary):
	"""Parse JSON and apply textures/modulates with class restrictions (SOP v3.0)"""
	var eq = get_node_or_null("/root/EquipmentManager")
	for slot in equipment:
		var item_id = equipment[slot]
		if not item_id: continue
		
		var item_data = eq.get_item_data(item_id) if eq else {}
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
	# 1. Update Body Tier based on Mile (if WorldManager exists)
	var wm = get_node_or_null("/root/WorldManager")
	if wm:
		update_body_tier(wm.current_mile)
	
	# 2. Apply Base Body (Naked State)
	_apply_base_body()
	
	# 3. Apply Role-based Outlines
	_apply_role_outlines()
	
	# 4. Apply Equipment Overlays
	update_equipment_visuals()

func _apply_role_outlines():
	# Temporary: Disable outlines to debug solid boxes issue
	# TODO: Re-enable role-based outline colors when visual system is ready
	return


func update_body_tier(miles: int):
	"""Calculate and set the body tier based on progression mileage"""
	var new_tier = 0
	for i in range(mile_thresholds.size() - 1, -1, -1):
		if miles >= mile_thresholds[i]:
			new_tier = i
			break
	
	if new_tier != current_body_tier:
		current_body_tier = new_tier
		var hero_name = "Unknown"
		if hero_data:
			hero_name = hero_data.get("name", "Unknown") if hero_data is Dictionary else hero_data.name
		
		_log_info("HeroSprite", "Hero %s evolved to Body Tier %d at Mile %d" % [hero_name, current_body_tier, miles])
		# Trigger a small visual burst for evolution
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			pm.create_hit_effect(global_position, Color.GOLD)

func _apply_base_body():
	# Decide which base texture to use
	var base_tex = "humanoid_0.png" # Default ragged traveler
	base_sprite_name = "humanoid_0"
	
	# Mapping of classes to professional sheets (using full LPC sheet)
	var class_sheets = {
		"paladin": "paladin_sheet.png",
		"warrior": "ancient_warrior_sheet.png",
		"mage": "arcane_scholar.png",
		"rogue": "shadow_assassin.png",
		"druid": "nature_blessed.png",
		"shaman": "humanoid_5.png",
		"warlock": "humanoid_4.png",
		"hunter": "humanoid_1.png"
	}
	
	# If we are beyond the first few miles, use the professional class sprite
	if current_body_tier > 0 and class_sheets.has(class_type):
		base_tex = class_sheets[class_type]
		base_sprite_name = base_tex.replace(".png", "")
		
		# SET UP THE FULL LPC SHEET (13 columns x 21 rows)
		if base_tex.ends_with("_sheet.png"):
			body_layer.texture = load("res://assets/sprites/" + base_tex)
			body_layer.hframes = 13
			body_layer.vframes = 21
			var initial_frame = 130 # Front idle (Row 10, Col 0)
			_safe_set_frame(body_layer, initial_frame)
		else:
			_set_layer_texture(body_layer, base_tex)
	else:
		# Use the progression-based humanoid silhouettes
		base_tex = "humanoid_%d.png" % current_body_tier
		base_sprite_name = "humanoid_%d" % current_body_tier
		_set_layer_texture(body_layer, base_tex)
		
	# Skin tone modulation (only for humanoids)
	if base_tex.begins_with("humanoid"):
		body_layer.modulate = Color(1.0, 0.8, 0.7) # Generic skin tone
	else:
		body_layer.modulate = Color.WHITE

func set_rage_mode(active: bool, intensity: float = 0.5):
	"""Toggle Rage Mode visual effect via shader"""
	for layer in layer_nodes.values():
		if layer and layer.material and layer.material is ShaderMaterial:
			var mat = layer.material as ShaderMaterial
			mat.set_shader_parameter("overlay_intensity", intensity if active else 0.0)
			mat.set_shader_parameter("overlay_color", Color.RED if active else Color.WHITE)

func _apply_item_visual(slot: String, item_data: Dictionary):
	"""Apply item visual using texture/modulate/glow from JSON (SOP v3.0)"""
	# Map slots to layers (handle slot name variations)
	var mapped_slot = slot
	# Handle ring/trinket slot variations
	if slot.begins_with("ring"):
		mapped_slot = "ring"
	elif slot.begins_with("trinket"):
		mapped_slot = "trinket"
	elif slot == "amulet":
		mapped_slot = "neck"
	elif slot == "mainhand" or slot == "weapon":
		mapped_slot = "weapon"
	elif slot == "offhand" or slot == "shield":
		mapped_slot = "offhand"
	
	var layer = layer_nodes.get(mapped_slot)
	if not layer:
		layer = layer_nodes.get(slot)
		if not layer:
			return
	
	var item_type = item_data.get("type", "")
	var rarity = item_data.get("rarity", "common")
	
	# Try to find a visual texture
	var texture_applied = false
	var texture_path = item_data.get("texture", "")
	
	if texture_path != "" and ResourceLoader.exists(texture_path):
		var loaded_texture = load(texture_path)
		if loaded_texture:
			layer.texture = loaded_texture
			texture_applied = true
	elif texture_path != "":
		_log_missing_visual_once(texture_path, item_data.get("id", "unknown"))
	
	# If no specific texture, generate a slot-shaped placeholder overlay so heroes still "wear" gear
	if not texture_applied:
		layer.texture = _get_placeholder_texture(mapped_slot, rarity, item_type)
		texture_applied = layer.texture != null
	
	# Visual application
	if texture_applied:
		layer.visible = true
		
		# Set frames for Paper Doll sync (LPC Sheets are 13x21)
		if layer.texture and layer.texture.get_width() >= 832:
			layer.hframes = 13
			layer.vframes = 21
		else:
			layer.hframes = 1
			layer.vframes = 1
			
		_apply_layer_pose(mapped_slot, layer)
		
		# Prevent true full-body character overlays (but allow equipment named "paladin_*", etc.)
		var tex_name := ""
		if layer.texture and layer.texture.resource_path != "":
			tex_name = layer.texture.resource_path.get_file()
		if tex_name in ["paladin.png", "ancient_warrior.png", "arcane_scholar.png", "shadow_assassin.png", "nature_blessed.png"] or tex_name.begins_with("humanoid_"):
			layer.visible = false
	else:
		layer.visible = false
	
	# Apply modulate
	if item_data.has("modulate"):
		layer.modulate = _parse_hex_color(item_data["modulate"])
	else:
		layer.modulate = _get_rarity_modulate(rarity)
	
	# Apply glow
	if item_data.has("glow_shader_param"):
		var glow_intensity = float(item_data["glow_shader_param"])
		if layer.material and layer.material is ShaderMaterial:
			layer.material.set_shader_parameter("glow_intensity", glow_intensity)

func _apply_layer_pose(layer_name: String, layer: Sprite2D):
	# Equipment layers are children of Visuals (already scaled 2.5x)
	# Both body and equipment are 64x64, so they need the SAME local scale (1.0)
	# to inherit parent's 2.5x evenly. Setting to 2.5 here would multiply: 2.5 * 2.5 = 6.25x!
	layer.offset = Vector2(0, -32)
	layer.scale = Vector2(1.0, 1.0)  # Inherit parent's 2.5x scale
	
	match layer_name:
		"weapon":
			layer.offset = Vector2(18, -26)
			layer.scale = Vector2(1.0, 1.0)
		"offhand":
			layer.offset = Vector2(-18, -26)
			layer.scale = Vector2(1.0, 1.0)
		"neck":
			layer.offset = Vector2(0, -44)
			layer.scale = Vector2(0.8, 0.8)  # Slightly smaller accessory
		"ring":
			layer.offset = Vector2(10, -18)
			layer.scale = Vector2(0.7, 0.7)  # Smaller accessory
		"trinket":
			layer.offset = Vector2(-10, -18)
			layer.scale = Vector2(0.7, 0.7)  # Smaller accessory

func _log_missing_visual_once(path: String, item_id: String):
	if _missing_visual_paths.has(path):
		return
	_missing_visual_paths[path] = true
	_log_warn("HeroSprite", "Missing item visual texture for %s: %s" % [item_id, path])

func _get_placeholder_texture(slot: String, rarity: String, item_type: String) -> Texture2D:
	var key = "%s|%s|%s" % [slot, rarity, item_type]
	if _placeholder_cache.has(key):
		return _placeholder_cache[key]
	
	var img := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	
	var border := _get_rarity_modulate(rarity)
	border.a = 1.0
	var fill := _get_rarity_modulate(rarity)
	fill.a = 0.55
	
	# Small icon-style overlays (like badges/emblems on the hero body)
	match slot:
		"chest":
			# Small chest emblem (center torso)
			_draw_rect(img, Rect2i(26, 30, 12, 10), fill, border)
		"legs":
			# Small leg guards icon
			_draw_rect(img, Rect2i(28, 44, 8, 8), fill, border)
		"head":
			# Small head icon (top)
			_draw_rect(img, Rect2i(28, 12, 8, 6), fill, border)
		"shoulder":
			# Tiny shoulder badges
			_draw_rect(img, Rect2i(20, 24, 6, 6), fill, border)
			_draw_rect(img, Rect2i(38, 24, 6, 6), fill, border)
		"weapon":
			# Slim sword icon (right hand)
			_draw_rect(img, Rect2i(44, 30, 4, 18), fill, border)
		"offhand":
			# Small shield icon (left hand)
			_draw_rect(img, Rect2i(16, 30, 5, 12), fill, border)
		"neck":
			# Tiny amulet icon
			_draw_rect(img, Rect2i(30, 24, 4, 3), fill, border)
		"ring":
			# Tiny ring badge (right hip)
			_draw_rect(img, Rect2i(38, 42, 4, 4), fill, border)
		"trinket":
			# Tiny trinket badge (left hip)
			_draw_rect(img, Rect2i(22, 42, 4, 4), fill, border)
		_:
			# Small generic badge
			_draw_rect(img, Rect2i(28, 28, 8, 8), fill, border)
	
	var tex := ImageTexture.create_from_image(img)
	_placeholder_cache[key] = tex
	return tex

func _draw_rect(img: Image, rect: Rect2i, fill: Color, border: Color):
	for y in range(rect.position.y, rect.position.y + rect.size.y):
		for x in range(rect.position.x, rect.position.x + rect.size.x):
			var is_border := (
				x == rect.position.x or
				y == rect.position.y or
				x == rect.position.x + rect.size.x - 1 or
				y == rect.position.y + rect.size.y - 1
			)
			img.set_pixel(x, y, border if is_border else fill)

func _apply_fallback_texture(layer: Sprite2D, item_data: Dictionary) -> bool:
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
		return _set_layer_texture(layer, tex_name)
	return false

func _parse_hex_color(hex: String) -> Color:
	"""Parse HEX color string (#RRGGBB or #RRGGBBAA) to Color"""
	if hex.is_empty() or hex == "none":
		return Color.WHITE
		
	# Remove # if present
	hex = hex.replace("#", "")
	
	# Ensure we have valid hex string (6 or 8 chars)
	if hex.length() < 6:
		# Check if it's a valid named color
		if Color.html_is_valid(hex):
			return Color(hex)
		return Color.WHITE
	
	# Use Godot's built-in hex string to color conversion
	# Supports RRGGBB and RRGGBBAA
	if Color.html_is_valid(hex):
		return Color(hex)
	return Color.WHITE

func _set_layer_texture(layer: Sprite2D, tex_file: String) -> bool:
	var full_path = "res://assets/sprites/" + tex_file
	if ResourceLoader.exists(full_path):
		var tex = load(full_path)
		if tex:
			# If modifying the body layer, stop animation first to prevent out-of-bounds errors
			if layer == body_layer and anim_player:
				anim_player.stop(true)
				_current_anim = ""
				
			_safe_set_frame(layer, 0) # Reset frame first
			layer.hframes = 1 # Force 1 frame before swapping texture
			
			if tex.get_width() > tex.get_height():
				layer.hframes = int(tex.get_width() / tex.get_height())
			else:
				layer.hframes = 1
				
			layer.texture = tex
			layer.centered = true
			_safe_set_frame(layer, 0)
			
			# ALL layers must use consistent bottom-center alignment.
			# We assume 64px height characters. If taller, they grow upwards.
			# Using a fixed offset ensures parts align even if textures differ.
			layer.offset = Vector2(0, -32)
			
			# Don't reset scale here - let _apply_layer_pose handle it
			# layer.scale = Vector2(1.0, 1.0)
			return true
	return false

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
	# SLAVE SYSTEM: All equipment layers follow the body's frame
	# This ensures perfect sync for the "Paper Doll" effect
	if body_layer:
		# CRITICAL: Always validate body frame first (animations can set invalid frames)
		var max_body_frames = body_layer.hframes * body_layer.vframes
		if max_body_frames <= 0:
			max_body_frames = 1
		
		var current_body_frame = body_layer.frame
		if current_body_frame < 0 or current_body_frame >= max_body_frames:
			# #region agent log
			var log_file_body = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
			if log_file_body:
				log_file_body.seek_end()
				log_file_body.store_line(JSON.stringify({
					"location": "HeroSprite.gd:_process:body_frame_fix",
					"message": "Body frame out of bounds, clamping immediately",
					"data": {
						"invalid_frame": current_body_frame,
						"max_body_frames": max_body_frames,
						"hframes": body_layer.hframes,
						"vframes": body_layer.vframes,
						"layer_name": body_layer.name
					},
					"timestamp": Time.get_ticks_msec(),
					"sessionId": "debug-session",
					"hypothesisId": "C"
				}))
				log_file_body.close()
			# #endregion
			# Clamp immediately to prevent errors
			body_layer.frame = clampi(current_body_frame, 0, max_body_frames - 1)
		
		if body_layer.hframes > 1:
			var body_frame = body_layer.frame
			
			# Ensure body frame is within bounds using safe setter
			_safe_set_frame(body_layer, body_frame)
			
			for layer in layer_nodes.values():
				if layer != body_layer and layer.visible:
					# CRITICAL: Validate layer frame BEFORE syncing
					var max_layer_frames = layer.hframes * layer.vframes
					if max_layer_frames <= 0:
						max_layer_frames = 1
					
					# Check if current layer frame is invalid (prevent errors before syncing)
					if layer.frame < 0 or layer.frame >= max_layer_frames:
						# #region agent log
						var log_file_invalid = FileAccess.open("c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log", FileAccess.WRITE_READ)
						if log_file_invalid:
							log_file_invalid.seek_end()
							log_file_invalid.store_line(JSON.stringify({
								"location": "HeroSprite.gd:_process:layer_frame_fix",
								"message": "Layer frame out of bounds, fixing immediately",
								"data": {
									"layer_name": layer.name,
									"invalid_frame": layer.frame,
									"max_layer_frames": max_layer_frames,
									"hframes": layer.hframes,
									"vframes": layer.vframes
								},
								"timestamp": Time.get_ticks_msec(),
								"sessionId": "debug-session",
								"hypothesisId": "C"
							}))
							log_file_invalid.close()
						# #endregion
						layer.frame = clampi(layer.frame, 0, max_layer_frames - 1)
					
					# Only sync if layer has same frame layout as body
					if layer.hframes == body_layer.hframes and layer.vframes == body_layer.vframes:
						# Both have same layout, safe to sync - use safe setter
						_safe_set_frame(layer, body_frame)
					elif max_layer_frames > 0:
						# For single-frame equipment, always set to frame 0
						_safe_set_frame(layer, 0)

	_update_status_icons()
	_update_casting_bar()
	
	# REVIVAL AUTO-CLEANUP: If hero was "dead" visually but has HP now, reset visuals
	if hero_data:
		var hp = hero_data.get("health", 0) if hero_data is Dictionary else (hero_data.current_stats.get("health", 0) if hero_data.current_stats else 0)
		if hp > 0 and _death_animation_played:
			_death_animation_played = false
			if visuals:
				visuals.modulate = Color.WHITE
				visible = true
			if anim_player:
				anim_player.play("idle")
			_log_info("HeroSprite", "Hero revived visually due to HP > 0")
	
	# Scale is now consistently maintained at BASE_VISUAL_SCALE (1, 1) with no modifications
	# All scale-changing animations have been removed for consistent hero size

var _last_effects: Dictionary = {}

func _update_status_icons():
	if not status_container or not hero_data: return
	
	var sem = get_node_or_null("/root/StatusEffectsManager")
	if not sem: return
	
	var hero_id = hero_data.get("id", "") if hero_data is Dictionary else hero_data.id
	var active = sem.get_active_effects(hero_id)
	
	# Only update if effects changed (Dictionary comparison)
	if active.hash() == _last_effects.hash():
		return
	
	_last_effects = active.duplicate(true)
	
	var is_berserk = active.has("berserk")
	set_rage_mode(is_berserk, 0.6 if is_berserk else 0.0)
	
	for child in status_container.get_children():
		child.queue_free()
		
	for type in active:
		var def = sem.effect_types.get(type, {})
		var icon_rect = ColorRect.new()
		icon_rect.custom_minimum_size = Vector2(10, 10)
		icon_rect.color = Color.from_string(def.get("color", "ffffff"), Color.WHITE)
		status_container.add_child(icon_rect)

func _update_casting_bar():
	if not casting_bar: 
		return
	
	var cm = get_node_or_null("/root/CombatManager")
	if not cm or not cm.in_combat:
		casting_bar.visible = false
		return
		
	# Placeholder for future implementation
	casting_bar.visible = false

func play_hit_flash():
	if not visuals:
		return
		
	var tween = create_tween()
	visuals.modulate = Color(5, 5, 5, 1) # Bright white flash
	tween.tween_property(visuals, "modulate", Color.WHITE, 0.1)
	
	# Hit stop effect (micro-pause)
	if anim_player:
		var original_speed = anim_player.speed_scale
		anim_player.speed_scale = 0.0
		get_tree().create_timer(0.05).timeout.connect(_reset_anim_speed.bind(original_speed))
	
	# play_squash_and_stretch() disabled - maintaining consistent scale of 1

func _reset_anim_speed(speed: float):
	if is_instance_valid(anim_player):
		anim_player.speed_scale = speed

func play_squash_and_stretch(_sx: float, _sy: float, _duration: float):
	# DISABLED: Maintaining consistent scale of 1 throughout combat
	# var tween = create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	# tween.tween_property(visuals, "scale", Vector2(sx * BASE_VISUAL_SCALE.x, sy * BASE_VISUAL_SCALE.y), duration)
	# tween.tween_property(visuals, "scale", BASE_VISUAL_SCALE, duration)
	pass  # Function disabled - heroes maintain consistent scale

func play_jump_tween(target_pos: Vector2, duration: float):
	var tween = create_tween().set_parallel(true)
	
	# Horizontal movement
	tween.tween_property(self, "position:x", target_pos.x, duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	
	# Arc movement (Y)
	var arc_tween = create_tween().set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	arc_tween.tween_property(self, "position:y", position.y - 100, duration/2)
	arc_tween.tween_property(self, "position:y", target_pos.y, duration/2).set_ease(Tween.EASE_IN)
	
	# Squash and stretch during jump - DISABLED for consistent scale of 1
	# play_squash_and_stretch(1.2, 0.8, duration/4)  # Disabled

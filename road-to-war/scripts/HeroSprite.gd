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

# Updated for 256x256 hero sprites (designed and exported at full size)
# Display at native size (256x256 pixels) - no scaling applied
const BASE_VISUAL_SCALE = Vector2(1.0, 1.0)  # No scaling - display at native 256x256 size
const SPRITE_SIZE = 256  # Hero sprite size (256x256 pixels)

var hero_data
var name_label
var health_bar
var anim_player: AnimationPlayer
var class_type: String = ""
var base_sprite_name: String = "humanoid_0"
var _current_anim: String = ""
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

var _missing_visual_paths: Dictionary = {}
var _debug_equipment_overlay_enabled: bool = false

@onready var visuals = get_node_or_null("Visuals")
@onready var body_layer = get_node_or_null("Visuals/Body")
@onready var legs_layer = get_node_or_null("Visuals/Legs")
@onready var chest_layer = get_node_or_null("Visuals/Chest")
@onready var shoulder_layer = get_node_or_null("Visuals/Shoulder")
@onready var neck_layer = get_node_or_null("Visuals/Neck")
@onready var head_layer = get_node_or_null("Visuals/Head")
@onready var weapon_layer = get_node_or_null("Visuals/Weapon")
@onready var offhand_layer = get_node_or_null("Visuals/Offhand")
@onready var ring_layer = get_node_or_null("Visuals/Ring")
@onready var trinket_layer = get_node_or_null("Visuals/Trinket")

@onready var status_container = get_node_or_null("StatusContainer")
@onready var casting_bar = get_node_or_null("CastingBar")

# var transparency_material = preload("res://scripts/SpriteTransparency.gdshader")

func _ready():
	name_label = get_node_or_null("NameLabel")
	health_bar = get_node_or_null("HealthBar")
	
	# CRITICAL: Ensure Visuals node exists - if @onready failed, try to get it again
	if not visuals:
		visuals = get_node_or_null("Visuals")
		if not visuals:
			_log_error("HeroSprite", "Visuals node not found! Cannot initialize sprite.")
			return
	
	# CRITICAL: Ensure all layer nodes exist - if @onready failed, get them now
	if not body_layer:
		body_layer = get_node_or_null("Visuals/Body")
	if not legs_layer:
		legs_layer = get_node_or_null("Visuals/Legs")
	if not chest_layer:
		chest_layer = get_node_or_null("Visuals/Chest")
	if not shoulder_layer:
		shoulder_layer = get_node_or_null("Visuals/Shoulder")
	if not neck_layer:
		neck_layer = get_node_or_null("Visuals/Neck")
	if not head_layer:
		head_layer = get_node_or_null("Visuals/Head")
	if not weapon_layer:
		weapon_layer = get_node_or_null("Visuals/Weapon")
	if not offhand_layer:
		offhand_layer = get_node_or_null("Visuals/Offhand")
	if not ring_layer:
		ring_layer = get_node_or_null("Visuals/Ring")
	if not trinket_layer:
		trinket_layer = get_node_or_null("Visuals/Trinket")
	
	# Apply base visual scale to Visuals node
	if visuals:
		visuals.scale = BASE_VISUAL_SCALE
		visuals.visible = true  # Ensure visuals node is visible
		visuals.modulate = Color.WHITE  # Ensure full alpha
		# FORCE visibility at node level
		visible = true
		modulate = Color.WHITE
	
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
	
	set_process_input(true)

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
	# Offset of -64 works for 128px sprites (upgraded from 64px).
	# With 0.84375x scale on Visuals node, the offset is automatically scaled.
	# For 128px sprites, use -64 (half the sprite height) in local coordinates.
	for layer in layer_nodes.values():
		if layer:
			layer.centered = true
			# Set default offset for 256x256 sprites (bottom-center alignment)
			layer.offset = Vector2(0, -float(SPRITE_SIZE) / 2.0)  # -128 for 256px sprites

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
	# CRITICAL: Ensure Visuals is at origin before starting any animation
	if visuals:
		visuals.position = Vector2(0, 0)

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
		# SAFETY CHECK: Only play if body_layer is initialized and texture supports frames
		# LPC sheets are 13x21. If hframes is 1, it's a legacy sprite and would crash.
		if body_layer and body_layer.hframes > 1:
			# Connect to animation_changed to intercept frame changes
			if not anim_player.animation_changed.is_connected(_on_animation_frame_changed):
				anim_player.animation_changed.connect(_on_animation_frame_changed)
			anim_player.play(final_anim)
		else:
			# For legacy sprites or if body_layer is not ready, only play basic animations
			# and stop the player for frame-intensive attacks
			if body_layer and final_anim in ["idle", "walk"]:
				anim_player.play(final_anim)
			else:
				anim_player.stop()
		
		# Death animation special handling
		if final_anim == "death":
			_death_animation_played = true
			_trigger_death_particles()

func _on_animation_frame_changed(_anim_name: String):
	"""Intercept animation frame changes to ensure body frame stays in bounds"""
	if body_layer and body_layer.hframes > 0 and body_layer.vframes > 0:
		var max_frames = body_layer.hframes * body_layer.vframes
		if body_layer.frame >= max_frames:
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
	# CRITICAL: Ensure node and visuals are visible after setup
	visible = true
	if visuals:
		visuals.visible = true
		visuals.modulate = Color.WHITE
	if body_layer:
		body_layer.visible = true
		body_layer.modulate = Color.WHITE

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
	
	# 1. Reset Body state (this also updates marker positions)
	_apply_base_body() 
	
	# 2. Clear all equipment layers and detach from markers
	for slot in ["legs", "chest", "shoulder", "neck", "head", "weapon", "offhand", "ring", "trinket"]:
		var layer = layer_nodes.get(slot)
		if layer:
			# Detach from marker if attached, move back to Visuals
			if visuals and layer.get_parent() != visuals:
				var parent = layer.get_parent()
				if parent:
					parent.remove_child(layer)
				visuals.add_child(layer)
			
			layer.texture = null
			layer.modulate = Color.WHITE
			layer.visible = false
			layer.scale = Vector2(1.0, 1.0)
			layer.position = Vector2(0, 0)
			# Default offset for 256x256 equipment sprites (will be reset in _apply_layer_pose)
			layer.offset = Vector2(0, -float(SPRITE_SIZE) / 2.0)  # -128 for 256px sprites
			
			if layer.material and layer.material is ShaderMaterial:
				var mat := layer.material as ShaderMaterial
				mat.set_shader_parameter("glow_intensity", 0.0)
	
	# 3. Apply visuals for equipped items (this will re-attach to markers with correct positions)
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
		# Removed verbose evolution logging to prevent output overflow
		# Trigger a small visual burst for evolution
		var pm = get_node_or_null("/root/ParticleManager")
		if pm:
			pm.create_hit_effect(global_position, Color.GOLD)
		# Reload base body sprite when tier changes
		# _apply_base_body() will check class-specific sprite first, then use humanoid sprite with new tier
		# This ensures class-specific sprites are preserved, but humanoid sprites update with tier
		_apply_base_body()

func _apply_base_body():
	# CRITICAL: Check if body_layer is initialized before using it
	if not body_layer:
		# Silently return if not ready - this is expected during initialization
		# setup() will be called again after _ready() completes
		return
	
	# Try to use class-specific sprite first (if available), then fall back to humanoid sprites
	# This ensures we use the generated class-specific 128x128 sprites when possible
	var base_tex = ""
	var texture_loaded = false
	
	# First, try class-specific 128x128 sprite (e.g., paladin_128x128.png, warrior_128x128.png)
	if class_type != "":
		var class_sprite = "%s_128x128.png" % class_type
		if ResourceLoader.exists("res://assets/sprites/" + class_sprite):
			base_tex = class_sprite
			base_sprite_name = class_type + "_128x128"
			texture_loaded = _set_layer_texture(body_layer, base_tex)
	
	# Fallback to progression-based humanoid silhouettes (based on body tier)
	# These are 512x512 and will be auto-scaled to 256x256 visual size in _set_layer_texture
	if not texture_loaded:
		base_tex = "humanoid_%d.png" % current_body_tier
		base_sprite_name = "humanoid_%d" % current_body_tier
		texture_loaded = _set_layer_texture(body_layer, base_tex)
	
	if not texture_loaded:
		# Final fallback: try humanoid_0.png if requested sprite doesn't exist
		if base_tex != "humanoid_0.png":
			base_tex = "humanoid_0.png"
			base_sprite_name = "humanoid_0"
			texture_loaded = _set_layer_texture(body_layer, base_tex)
	
	if texture_loaded:
		body_layer.visible = true
		body_layer.modulate = Color.WHITE  # No skin tone modulation - use sprite colors as-is
		body_layer.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST  # Pixel-perfect rendering
		# The sprites are already drawn with proper skin tones from the generator
		# Removed verbose logging to prevent output overflow
		
		# CRITICAL: Update Marker2D positions based on actual body sprite dimensions
		_update_attachment_markers()
	else:
		# CRITICAL: Even if texture fails, keep hero visible as fallback (will show as placeholder)
		body_layer.visible = true  # Changed from false - keep visible even without texture
		body_layer.modulate = Color.WHITE
		_log_error("HeroSprite", "Failed to load body texture: %s (path: res://assets/sprites/%s) - Hero kept visible as fallback" % [base_tex, base_tex])

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
			_log_error("Equipment", "No layer found for slot: %s (mapped: %s)" % [slot, mapped_slot])
			return

	var item_id = item_data.get("id", "unknown")
	var item_type = item_data.get("type", "")
	var rarity = item_data.get("rarity", "common")

	_log_debug("Equipment", "Applying visual for %s (%s) to %s layer" % [item_id, rarity, mapped_slot])

	# Try to find a visual texture - use same logic as hero sprites
	var texture_applied = false
	var texture_path = item_data.get("texture", "")

	if texture_path != "":
		_log_debug("Equipment", "Checking texture path: %s" % texture_path)
		if ResourceLoader.exists(texture_path):
			# Extract filename relative to sprites directory for _set_layer_texture()
			# Convert "res://assets/sprites/equipment/item.png" to "equipment/item.png"
			var relative_path = texture_path.replace("res://assets/sprites/", "")
			texture_applied = _set_layer_texture(layer, relative_path)
			if texture_applied:
				_log_debug("Equipment", "Successfully loaded and scaled texture: %s" % texture_path)
			else:
				_log_warn("Equipment", "Failed to apply texture with _set_layer_texture(): %s" % texture_path)
		else:
			_log_missing_visual_once(texture_path, item_id)
	else:
		_log_warn("Equipment", "No texture path specified for item: %s" % item_id)

	# If no specific texture, generate a slot-shaped placeholder overlay so heroes still "wear" gear
	if not texture_applied:
		_log_debug("Equipment", "Using placeholder texture for %s" % mapped_slot)
		layer.texture = _get_placeholder_texture(mapped_slot, rarity, item_type)
		texture_applied = layer.texture != null

	# Visual application
	if texture_applied:
		layer.visible = true

		# Equipment sprites are static overlays - always 1x1 frame
		# They don't animate like hero body sprites
		layer.hframes = 1
		layer.vframes = 1

		_apply_layer_pose(mapped_slot, layer)

		# Prevent true full-body character overlays (but allow equipment named "paladin_*", etc.)
		var tex_name := ""
		if layer.texture and layer.texture.resource_path != "":
			tex_name = layer.texture.resource_path.get_file()

		# Only hide if it's exactly a full character sprite (not equipment)
		if tex_name in ["paladin.png", "ancient_warrior.png", "arcane_scholar.png", "shadow_assassin.png", "nature_blessed.png"] or tex_name.begins_with("humanoid_"):
			layer.visible = false
			_log_debug("Equipment", "Hiding %s - detected as full character sprite" % tex_name)
		else:
			_log_debug("Equipment", "Equipment %s visible on %s layer" % [item_id, mapped_slot])
	else:
		layer.visible = false
		_log_warn("Equipment", "Failed to apply any texture for %s" % item_id)

	# Apply modulate
	if item_data.has("modulate"):
		var modulate_color = _parse_hex_color(item_data["modulate"])
		layer.modulate = modulate_color
		_log_debug("Equipment", "Applied custom modulate: %s" % modulate_color)
	else:
		var rarity_color = _get_rarity_modulate(rarity)
		layer.modulate = rarity_color
		_log_debug("Equipment", "Applied rarity modulate: %s (%s)" % [rarity_color, rarity])

	# Apply glow
	if item_data.has("glow_shader_param"):
		var glow_intensity = float(item_data["glow_shader_param"])
		if layer.material and layer.material is ShaderMaterial:
			layer.material.set_shader_parameter("glow_intensity", glow_intensity)
			_log_debug("Equipment", "Applied glow intensity: %f" % glow_intensity)

func _update_attachment_markers():
	"""Update Marker2D positions dynamically based on body sprite dimensions and anatomy"""
	if not body_layer or not body_layer.texture:
		return
	
	# Get the actual visual size of the body sprite after scaling
	var body_texture = body_layer.texture
	var body_height: float = body_texture.get_height() * body_layer.scale.y
	var body_width: float = body_texture.get_width() * body_layer.scale.x
	
	# Body layer uses bottom-center alignment with offset (0, -body_height/2)
	# This means:
	# - Body's pivot (center) is at (0, 0) in Visuals space
	# - Body's visual is offset down by body_height/2 from pivot
	# - Body's bottom edge is at (0, body_height/2) = (0, 128) for 256px sprite in Visuals space
	# - Body's top edge is at (0, body_height/2 - body_height) = (0, -128) for 256px sprite
	# BUT: Body layer position in Visuals is (0, 0), and offset is (0, -128)
	# So: Body center at (0, 0), bottom at (0, +128), top at (0, -128) in Visuals space
	
	# However, markers should be positioned where equipment should attach
	# For equipment overlays, we want markers at anatomical locations relative to body visual
	# Since body is centered at (0, 0) with bottom at y=+body_height/2 and top at y=-body_height/2:
	# - Head should be near top: y = -body_height/2 + (body_height * 0.22) = -body_height * 0.28
	# - Chest should be at center: y = 0
	# - Legs should be near bottom: y = +body_height/2 - (body_height * 0.35) = body_height * 0.15
	
	var center_y: float = -body_height / 2.0
	var head_y: float = center_y - (body_height * 0.28)
	var neck_y: float = center_y - (body_height * 0.30)
	var shoulder_y: float = center_y - (body_height * 0.05)
	var chest_y: float = center_y
	var waist_y: float = center_y + (body_height * 0.25)
	var legs_y: float = center_y + (body_height * 0.15)
	
	# Horizontal offsets for left/right equipment (arms, rings, trinkets)
	var arm_offset_x = body_width * 0.35  # Arms extend ~35% to each side (wider for better visibility)
	var hip_offset_x = body_width * 0.20  # Hips slightly narrower (~20%)
	
	# Update each marker position to align with body anatomy
	var markers = {
		"HeadAttachment": Vector2(0, head_y),
		"NeckAttachment": Vector2(0, neck_y),
		"ShoulderAttachment": Vector2(0, shoulder_y),
		"ChestAttachment": Vector2(0, chest_y),
		"LegsAttachment": Vector2(0, legs_y),
		"WeaponAttachment": Vector2(arm_offset_x, chest_y),  # Right hand at chest level
		"OffhandAttachment": Vector2(-arm_offset_x, chest_y),  # Left hand at chest level
		"RingAttachment": Vector2(hip_offset_x, waist_y),  # Right hip
		"TrinketAttachment": Vector2(-hip_offset_x, waist_y)  # Left hip
	}
	
	for marker_name in markers:
		var marker = get_node_or_null("Visuals/" + marker_name)
		if marker:
			marker.position = markers[marker_name]
			_log_debug("HeroSprite", "Updated %s position to %s (body: %dx%d)" % [marker_name, markers[marker_name], body_width, body_height])

func _apply_layer_pose(layer_name: String, layer: Sprite2D):
	# Equipment sprites attach to Marker2D attachment markers on the hero
	# This ensures equipment follows hero movement and animations automatically
	# Marker positions are dynamically calculated in _update_attachment_markers() based on body anatomy

	# Find the attachment marker for this equipment slot
	var attachment_marker = _find_attachment_marker(layer_name)
	if attachment_marker:
		# Reparent equipment to the attachment marker if not already there
		if layer.get_parent() != attachment_marker:
			# Remove from current parent
			if layer.get_parent():
				layer.get_parent().remove_child(layer)
			# Add to attachment marker
			attachment_marker.add_child(layer)
			_log_debug("Equipment", "Attached %s to %s marker at position %s" % [layer_name, attachment_marker.name, attachment_marker.position])

		# Equipment sprites use centered pivot and are positioned at marker origin
		# Offset is already set in _set_layer_texture() for bottom-center alignment
		# When attached to marker, we need to adjust offset so equipment aligns with body part
		# Since marker is at the correct anatomical position, equipment should be at (0,0) relative to marker
		layer.position = Vector2(0, 0)
		
		# Reset offset when attached to marker (marker position handles alignment)
		# Equipment sprites should be centered on the marker
		layer.offset = Vector2(0, 0)  # Center on marker (marker is already at correct anatomical position)
	else:
		# Fallback: attach to Visuals node with proper offset
		if visuals and layer.get_parent() != visuals:
			if layer.get_parent():
				layer.get_parent().remove_child(layer)
			visuals.add_child(layer)
		
		# When attached to Visuals, use calculated position based on layer name
		layer.position = _get_fallback_layer_position(layer_name)
		# Keep bottom-center offset for proper alignment
		if layer.texture:
			var texture_height = layer.texture.get_height() * layer.scale.y
			layer.offset = Vector2(0, -texture_height / 2.0)
		_log_warn("Equipment", "No attachment marker found for %s, attached to Visuals at %s" % [layer_name, layer.position])

func _get_fallback_layer_position(layer_name: String) -> Vector2:
	"""Calculate fallback position for equipment when marker is not available"""
	if not body_layer or not body_layer.texture:
		return Vector2(0, 0)
	
	var body_height: float = body_layer.texture.get_height() * body_layer.scale.y
	var body_width: float = body_layer.texture.get_width() * body_layer.scale.x
	var center_y: float = -body_height / 2.0
	
	# Use same calculations as _update_attachment_markers() for consistency
	match layer_name:
		"head":
			return Vector2(0, center_y - (body_height * 0.28))
		"neck":
			return Vector2(0, center_y - (body_height * 0.30))
		"shoulder":
			return Vector2(0, center_y - (body_height * 0.05))
		"chest":
			return Vector2(0, center_y)
		"legs":
			return Vector2(0, center_y + (body_height * 0.15))
		"weapon":
			return Vector2(body_width * 0.35, center_y)
		"offhand":
			return Vector2(-body_width * 0.35, center_y)
		"ring":
			return Vector2(body_width * 0.20, center_y + (body_height * 0.25))
		"trinket":
			return Vector2(-body_width * 0.20, center_y + (body_height * 0.25))
		_:
			return Vector2(0, 0)

func _ensure_equipment_follows_hero():
	# CRITICAL: Reset Visuals position after attack animations that move it
	# Attack animations use lunge tracks that move Visuals, but must reset to (0,0)
	if visuals and visuals.position != Vector2(0, 0):
		visuals.position = Vector2(0, 0)
		_log_debug("Equipment", "Reset Visuals position to (0,0) after animation")
	
	# Debug: Track hero and equipment movement
	if visuals:
		var hero_pos = global_position
		var visuals_pos = visuals.global_position
		
		if hero_pos != visuals_pos:
			_log_warn("Equipment", "Hero (%s) and Visuals (%s) positions don't match!" % [hero_pos, visuals_pos])
	
	# Equipment attached to markers will automatically follow hero movement
	# No additional position correction needed since they're properly parented

func _find_attachment_marker(slot_name: String) -> Marker2D:
	# Find the Marker2D attachment marker for the given equipment slot
	match slot_name:
		"weapon":
			return get_node_or_null("Visuals/WeaponAttachment")
		"offhand", "shield":
			return get_node_or_null("Visuals/OffhandAttachment")
		"chest":
			return get_node_or_null("Visuals/ChestAttachment")
		"head", "helmet":
			return get_node_or_null("Visuals/HeadAttachment")
		"legs":
			return get_node_or_null("Visuals/LegsAttachment")
		"shoulder":
			return get_node_or_null("Visuals/ShoulderAttachment")
		"neck", "amulet":
			return get_node_or_null("Visuals/NeckAttachment")
		"ring", "ring1", "ring2":
			return get_node_or_null("Visuals/RingAttachment")
		"trinket", "trinket1", "trinket2":
			return get_node_or_null("Visuals/TrinketAttachment")
		_:
			return null

func _log_missing_visual_once(path: String, item_id: String):
	if _missing_visual_paths.has(path):
		return
	_missing_visual_paths[path] = true
	_log_error("HeroSprite", "Missing item visual texture for %s: %s" % [item_id, path])

func _get_placeholder_texture(slot: String, rarity: String, item_type: String) -> Texture2D:
	var key = "%s|%s|%s" % [slot, rarity, item_type]
	if _placeholder_cache.has(key):
		return _placeholder_cache[key]
	
	var img := Image.create(SPRITE_SIZE, SPRITE_SIZE, false, Image.FORMAT_RGBA8)  # 256x256 sprites
	img.fill(Color(0, 0, 0, 0))

	var border := _get_rarity_modulate(rarity)
	border.a = 1.0
	var fill := _get_rarity_modulate(rarity)
	fill.a = 0.55

	# Icon-style overlays scaled for 128x128 hero sprites
	match slot:
		"chest":
			# Chest emblem (center torso) - scaled for 128px
			_draw_rect(img, Rect2i(52, 60, 24, 20), fill, border)  # Scaled from (26,30,12,10)
		"legs":
			# Leg guards icon - scaled for 128px
			_draw_rect(img, Rect2i(56, 88, 16, 16), fill, border)  # Scaled from (28,44,8,8)
		"head":
			# Head icon (top) - scaled for 128px
			_draw_rect(img, Rect2i(56, 24, 16, 12), fill, border)  # Scaled from (28,12,8,6)
		"shoulder":
			# Shoulder badges - scaled for 128px
			_draw_rect(img, Rect2i(40, 48, 12, 12), fill, border)  # Scaled from (20,24,6,6)
			_draw_rect(img, Rect2i(76, 48, 12, 12), fill, border)  # Scaled from (38,24,6,6)
		"weapon":
			# Sword icon (right hand) - scaled for 128px
			_draw_rect(img, Rect2i(88, 60, 8, 36), fill, border)   # Scaled from (44,30,4,18)
		"offhand":
			# Shield icon (left hand) - scaled for 128px
			_draw_rect(img, Rect2i(32, 60, 10, 24), fill, border)  # Scaled from (16,30,5,12)
		"neck":
			# Amulet icon - scaled for 128px
			_draw_rect(img, Rect2i(60, 48, 8, 6), fill, border)    # Scaled from (30,24,4,3)
		"ring":
			# Ring badge (right hip) - scaled for 128px
			_draw_rect(img, Rect2i(76, 84, 8, 8), fill, border)    # Scaled from (38,42,4,4)
		"trinket":
			# Trinket badge (left hip) - scaled for 128px
			_draw_rect(img, Rect2i(44, 84, 8, 8), fill, border)    # Scaled from (22,42,4,4)
		_:
			# Generic badge - scaled for 128px
			_draw_rect(img, Rect2i(56, 56, 16, 16), fill, border)  # Scaled from (28,28,8,8)
	
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
	# CRITICAL: Null check to prevent errors
	if not layer:
		_log_error("HeroSprite", "_set_layer_texture called with null layer for texture: %s" % tex_file)
		return false
	
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
			layer.vframes = 1 # Force 1 frame before swapping texture
			
			# Detect LPC sprite sheet format (13x21 grid)
			# LPC sheets are typically: 13 columns * sprite_width x 21 rows * sprite_height
			# Common formats: 832x1344 (64px sprites) or 1664x2688 (128px sprites)
			var tex_width = tex.get_width()
			var tex_height = tex.get_height()
			
			# Check if this is an LPC sprite sheet (width >= 832 suggests 13 columns)
			# and height suggests multiple rows
			if tex_width >= 832 and tex_height >= 1000:  # Likely LPC sheet
				# Assume 13x21 LPC format
				layer.hframes = 13
				layer.vframes = 21
				# Removed debug logging to prevent output overflow
			elif tex_width > tex_height:
				# Wide texture - calculate hframes based on aspect ratio
				# Assume square sprites (width/height gives number of columns)
				var sprite_height = tex_height
				layer.hframes = int(tex_width / sprite_height)
				layer.vframes = 1  # Single row
				# Removed debug logging to prevent output overflow
			else:
				# Square or tall texture - single frame
				layer.hframes = 1
				layer.vframes = 1
				# Removed debug logging to prevent output overflow
				
			layer.texture = tex
			layer.centered = true
			# Set nearest-neighbor filtering for pixel-perfect rendering
			layer.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			_safe_set_frame(layer, 0)

			var texture_height = tex.get_height()
			
			# Body layer uses bottom-center alignment (offset moves bottom to y=0)
			if layer == body_layer:
				# Calculate offset based on texture height in LOCAL coordinates (before scaling)
				# This positions the bottom edge at y=0 in local space, which becomes y=0 in world space after transforms
				layer.offset = Vector2(0, -texture_height / 2.0)
			else:
				# Equipment layers: Use center alignment (offset = 0) when attached to markers
				# Markers are positioned at anatomical centers, so equipment should be centered on markers
				# Offset will be adjusted in _apply_layer_pose() if needed
				layer.offset = Vector2(0, 0)
			
			# Scale textures to display at 256x256 pixels for consistency
			# IMPORTANT: Check actual texture dimensions to handle all cases
			if texture_height == 512:
				layer.scale = Vector2(0.5, 0.5)  # Scale down 512 to 256 (1/2)
			elif texture_height == 256:
				layer.scale = Vector2(1.0, 1.0)  # Keep at native 256x256 size
			else:
				# Unknown size - scale to fit 256px height
				var scale_factor = 256.0 / float(texture_height)
				layer.scale = Vector2(scale_factor, scale_factor)
			
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

func _input(event):
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_F9:
			_debug_equipment_overlay_enabled = not _debug_equipment_overlay_enabled
			queue_redraw()

func _draw():
	if not _debug_equipment_overlay_enabled:
		return
	
	draw_line(Vector2(-10, 0), Vector2(10, 0), Color(1, 0, 1, 1), 1.0)
	draw_line(Vector2(0, -10), Vector2(0, 10), Color(1, 0, 1, 1), 1.0)
	draw_circle(Vector2.ZERO, 3.0, Color(1, 0, 1, 1))
	
	var marker_by_slot := {
		"weapon": "Visuals/WeaponAttachment",
		"offhand": "Visuals/OffhandAttachment",
		"chest": "Visuals/ChestAttachment",
		"head": "Visuals/HeadAttachment",
		"legs": "Visuals/LegsAttachment",
		"shoulder": "Visuals/ShoulderAttachment",
		"neck": "Visuals/NeckAttachment",
		"ring": "Visuals/RingAttachment",
		"trinket": "Visuals/TrinketAttachment"
	}
	
	for slot_name in marker_by_slot.keys():
		var marker = get_node_or_null(marker_by_slot[slot_name])
		if not marker:
			continue
		
		var marker_pos := to_local(marker.global_position)
		var layer: Sprite2D = layer_nodes.get(slot_name)
		
		var color := Color(1, 0, 0, 1)
		if layer and layer.visible and layer.texture:
			if layer.texture.resource_path != "":
				color = Color(0, 1, 0, 1)
			else:
				color = Color(1, 1, 0, 1)
		
		draw_circle(marker_pos, 5.0, color)
		draw_line(Vector2.ZERO, marker_pos, Color(color.r, color.g, color.b, 0.25), 1.0)
		
		if layer and layer.visible and layer.texture:
			var size := Vector2(layer.texture.get_width(), layer.texture.get_height()) * layer.scale
			var box_pos := to_local(layer.global_position) - (size / 2.0)
			draw_rect(Rect2(box_pos, size), Color(color.r, color.g, color.b, 0.4), false, 1.0)

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
			# Removed verbose revival logging to prevent output overflow
	
	# Scale is now consistently maintained at BASE_VISUAL_SCALE (2.5, 2.5) with no modifications
	# All scale-changing animations have been removed for consistent hero size

	# Ensure equipment moves with hero by keeping positions relative to Visuals
	_ensure_equipment_follows_hero()
	
	if _debug_equipment_overlay_enabled:
		queue_redraw()

var _last_effects: Dictionary = {}

func _update_status_icons():
	if not status_container or not hero_data: 
		return
	
	var sem = get_node_or_null("/root/StatusEffectsManager")
	if not sem: 
		# Hide container if no StatusEffectsManager
		if status_container:
			status_container.visible = false
		return
	
	var hero_id = hero_data.get("id", "") if hero_data is Dictionary else hero_data.id
	var active = sem.get_active_effects(hero_id)
	
	# Only update if effects changed (Dictionary comparison)
	if active.hash() == _last_effects.hash():
		return
	
	_last_effects = active.duplicate(true)
	
	var is_berserk = active.has("berserk")
	set_rage_mode(is_berserk, 0.6 if is_berserk else 0.0)
	
	# Clear existing icons
	for child in status_container.get_children():
		if is_instance_valid(child):
			child.queue_free()
	
	# Only show container if there are active effects
	if active.is_empty():
		status_container.visible = false
		return
	
	# Show container and create icons for active effects
	status_container.visible = true
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

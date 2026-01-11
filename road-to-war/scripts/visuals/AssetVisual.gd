extends Node2D
class_name AssetVisual

## AssetVisual: A unified, data-driven visual system for all game objects.
## Handles AI-generated assets by normalizing them at runtime.

@export var profile: AssetProfile:
	set(value):
		profile = value
		if is_inside_tree():
			apply_visuals()

@export var texture: Texture2D:
	set(value):
		texture = value
		if is_inside_tree():
			apply_visuals()

@export var metadata: Dictionary = {}:
	set(value):
		metadata = value
		if is_inside_tree():
			apply_visuals()

@export var metadata_path: String = "":
	set(value):
		metadata_path = value
		if is_inside_tree() and not value.is_empty():
			load_metadata(value)

func load_metadata(path: String):
	if not FileAccess.file_exists(path):
		return
	
	var file = FileAccess.open(path, FileAccess.READ)
	var json_string = file.get_as_text()
	var json = JSON.new()
	var error = json.parse(json_string)
	if error == OK:
		metadata = json.data
	else:
		print("JSON Parse Error: ", json.get_error_message(), " at line ", json.get_error_line())

# Hot-reload support for metadata
func _process(_delta):
	if Engine.is_editor_hint():
		# In editor, we could check file modification times
		pass

@onready var sprite: Sprite2D = $Sprite
@onready var effect_root: Node2D = $Effects

var _idle_tween: Tween
# _hover_tween reserved for future hover animation support - will be added when needed

func _ready():
	# Ensure child nodes exist if created via code
	if not has_node("Sprite"):
		var s = Sprite2D.new()
		s.name = "Sprite"
		add_child(s)
		sprite = s
	
	if not has_node("Effects"):
		var e = Node2D.new()
		e.name = "Effects"
		add_child(e)
		effect_root = e

	apply_visuals()
	_setup_interaction_signals()

## Refreshes the visual state based on current profile and texture.
func apply_visuals():
	if not profile:
		return
	
	if texture:
		AssetNormalizer.normalize(sprite, texture, profile)
	
	_apply_shader_stack()
	_start_procedural_motion()

func _apply_shader_stack():
	if profile.shader_material:
		sprite.material = profile.shader_material.duplicate()
		_sync_shader_params()
	else:
		sprite.material = null

func _sync_shader_params():
	var mat = sprite.material as ShaderMaterial
	if not mat: return
	
	# Profile-driven params
	if profile.enable_outline:
		mat.set_shader_parameter("outline_color", profile.outline_color)
		mat.set_shader_parameter("outline_width", profile.outline_width)
	
	# Metadata-driven overrides
	if metadata.has("glow_color"):
		mat.set_shader_parameter("glow_color", Color(metadata["glow_color"]))
	if metadata.has("cooldown_progress"):
		mat.set_shader_parameter("cooldown_progress", metadata["cooldown_progress"])

func _start_procedural_motion():
	if _idle_tween:
		_idle_tween.kill()
	
	_idle_tween = create_tween()
	_idle_tween.set_loops(-1)  # -1 = infinite loops (explicit, prevents detection error)
	_idle_tween.set_parallel(true)
	
	# Bobbing
	if profile.idle_bob_speed > 0:
		var duration = 1.0 / profile.idle_bob_speed
		_idle_tween.tween_property(sprite, "position:y", -profile.idle_bob_amount, duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		_idle_tween.chain().tween_property(sprite, "position:y", 0.0, duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	
	# Pulsing
	if profile.idle_pulse_speed > 0:
		var duration = 1.0 / profile.idle_pulse_speed
		var base_scale = sprite.scale
		_idle_tween.tween_property(sprite, "scale", base_scale * (1.0 + profile.idle_pulse_amount), duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		_idle_tween.chain().tween_property(sprite, "scale", base_scale, duration).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

func play_hit_flash():
	if not profile: return
	
	var mat = sprite.material as ShaderMaterial
	if mat:
		var flash_tween = create_tween()
		mat.set_shader_parameter("flash_color", profile.hit_flash_color)
		flash_tween.tween_method(func(v): mat.set_shader_parameter("flash_strength", v), 1.0, 0.0, profile.hit_flash_duration)

func _setup_interaction_signals():
	# UI interaction logic if needed (e.g. for icons)
	# This can be expanded to handle mouse_entered/exited for hover effects
	pass

# Hot-reload support
func _notification(what):
	if what == NOTIFICATION_EDITOR_PRE_SAVE:
		apply_visuals()

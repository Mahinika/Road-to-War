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

# CameraManager.gd - Handles dynamic camera tracking, effects, and battle zoom

var current_camera: Camera2D
var target_node: Node2D
var smooth_speed: float = 5.0
var default_zoom: Vector2 = Vector2(1, 1)
var battle_zoom: Vector2 = Vector2(1.2, 1.2)

var _shake_intensity: float = 0.0
var _shake_timer: float = 0.0
var _original_offset: Vector2 = Vector2.ZERO

var _is_zooming: bool = false

func _ready():
	_log_info("CameraManager", "Initialized")

func register_camera(camera: Camera2D):
	current_camera = camera
	_original_offset = camera.offset
	_log_debug("CameraManager", "Camera registered")

func set_target(node: Node2D):
	target_node = node

func _process(delta):
	if not current_camera: return
	
	if target_node and not _is_zooming:
		var target_pos = target_node.global_position
		current_camera.global_position = current_camera.global_position.lerp(target_pos, smooth_speed * delta)
	
	if _shake_timer > 0:
		_shake_timer -= delta
		var offset = Vector2(
			randf_range(-_shake_intensity, _shake_intensity),
			randf_range(-_shake_intensity, _shake_intensity)
		)
		current_camera.offset = _original_offset + offset
		
		if _shake_timer <= 0:
			current_camera.offset = _original_offset
			_shake_intensity = 0.0

func shake(intensity: float, duration: float):
	if not current_camera: return
	_shake_intensity = intensity
	_shake_timer = duration

func zoom_to_battle(center_pos: Vector2 = Vector2(960, 540)):
	if not current_camera: return
	_is_zooming = true
	var tween = create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(current_camera, "zoom", battle_zoom, 1.0)
	# Smoothly move camera to battle center
	tween.tween_property(current_camera, "global_position", center_pos - (get_viewport().get_visible_rect().size / (2 * battle_zoom.x)), 1.0)

func reset_zoom():
	if not current_camera: return
	var tween = create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(current_camera, "zoom", default_zoom, 1.0)
	tween.tween_property(current_camera, "global_position", Vector2.ZERO, 1.0)
	tween.chain().tween_callback(func(): _is_zooming = false)

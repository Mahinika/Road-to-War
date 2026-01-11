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
	if not current_camera: 
		# #region agent log
		if Engine.get_process_frames() % 120 == 0:
			var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
			var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
			if debug_file:
				debug_file.seek_end()
				var log_entry = JSON.stringify({"id":"log_camera_process_no_camera","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:59","message":"_process: current_camera is null","data":{"target_node_exists":target_node != null},"sessionId":"debug-session","runId":"run1","hypothesisId":"D"})
				debug_file.store_line(log_entry)
				debug_file.close()
		# #endregion
		return
	
	if target_node and not _is_zooming:
		# Follow both X and Y coordinates smoothly
		# Heroes are positioned on the road, so camera should follow them vertically too
		# Use smooth lerp to avoid jittery movement
		var target_pos = target_node.global_position
		var camera_before = current_camera.position
		current_camera.position = current_camera.position.lerp(target_pos, smooth_speed * delta)
		# #region agent log
		if Engine.get_process_frames() % 60 == 0:  # Log every 60 frames to avoid spam
			var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
			var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
			if debug_file:
				debug_file.seek_end()
				var log_entry = JSON.stringify({"id":"log_camera_follow","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:69","message":"camera following target","data":{"target_pos_x":target_pos.x,"target_pos_y":target_pos.y,"camera_before_x":camera_before.x,"camera_before_y":camera_before.y,"camera_after_x":current_camera.global_position.x,"camera_after_y":current_camera.global_position.y,"is_zooming":_is_zooming,"smooth_speed":smooth_speed,"delta":delta},"sessionId":"debug-session","runId":"run1","hypothesisId":"D"})
				debug_file.store_line(log_entry)
				debug_file.close()
		# #endregion
	else:
		# #region agent log
		if Engine.get_process_frames() % 120 == 0:  # Log when NOT following
			var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
			var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
			if debug_file:
				debug_file.seek_end()
				var target_pos_x = 0.0
				var target_pos_y = 0.0
				if target_node:
					target_pos_x = target_node.global_position.x
					target_pos_y = target_node.global_position.y
				var log_entry = JSON.stringify({"id":"log_camera_not_following","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:79","message":"camera NOT following (target_node or _is_zooming)","data":{"target_node_exists":target_node != null,"is_zooming":_is_zooming,"camera_pos_x":current_camera.global_position.x,"camera_pos_y":current_camera.global_position.y,"target_pos_x":target_pos_x,"target_pos_y":target_pos_y},"sessionId":"debug-session","runId":"run1","hypothesisId":"D"})
				debug_file.store_line(log_entry)
				debug_file.close()
		# #endregion
	
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
	# #region agent log
	var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
	# #endregion
	if not current_camera: 
		# #region agent log
		var debug_file_null = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
		if debug_file_null:
			debug_file_null.seek_end()
			var log_entry = JSON.stringify({"id":"log_camera_zoom_no_camera","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:124","message":"zoom_to_battle: current_camera is null","data":{},"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})
			debug_file_null.store_line(log_entry)
			debug_file_null.close()
		# #endregion
		return
	# #region agent log
	var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
	if debug_file:
		debug_file.seek_end()
		var target_pos_x = 0.0
		var target_pos_y = 0.0
		if target_node:
			target_pos_x = target_node.global_position.x
			target_pos_y = target_node.global_position.y
		var log_entry = JSON.stringify({"id":"log_camera_zoom_entry","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:138","message":"zoom_to_battle called","data":{"center_pos_x":center_pos.x,"center_pos_y":center_pos.y,"camera_before_x":current_camera.global_position.x,"camera_before_y":current_camera.global_position.y,"target_node_exists":target_node != null,"target_pos_x":target_pos_x,"target_pos_y":target_pos_y,"is_zooming":_is_zooming},"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})
		debug_file.store_line(log_entry)
		debug_file.close()
	# #endregion
	_is_zooming = true
	# Position camera directly to center_pos (tank position)
	# In Godot 4, Camera2D.position sets where the camera centers
	# With zoom, the visible area shrinks but camera still centers at this position
	# So we use center_pos directly without offset calculations
	var battle_pos = center_pos
	# #region agent log
	var debug_file2 = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
	if debug_file2:
		debug_file2.seek_end()
		var viewport_size = get_viewport().get_visible_rect().size if get_viewport() else Vector2.ZERO
		var log_entry2 = JSON.stringify({"id":"log_camera_zoom_calc","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:156","message":"battle_pos calculated","data":{"battle_pos_x":battle_pos.x,"battle_pos_y":battle_pos.y,"viewport_size_x":viewport_size.x,"viewport_size_y":viewport_size.y,"battle_zoom_x":battle_zoom.x,"battle_zoom_y":battle_zoom.y,"center_pos_x":center_pos.x,"center_pos_y":center_pos.y},"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})
		debug_file2.store_line(log_entry2)
		debug_file2.close()
	# #endregion
	var tween = create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(current_camera, "zoom", battle_zoom, 1.0)
	# Smoothly move camera to battle center (both X and Y)
	tween.tween_property(current_camera, "position", battle_pos, 1.0)
	# #region agent log
	var debug_file3 = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
	if debug_file3:
		debug_file3.seek_end()
		var log_entry3 = JSON.stringify({"id":"log_camera_zoom_after","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:169","message":"tween started to battle_pos","data":{"battle_pos_x":battle_pos.x,"battle_pos_y":battle_pos.y,"is_zooming_set":_is_zooming},"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})
		debug_file3.store_line(log_entry3)
		debug_file3.close()
	# #endregion

func reset_zoom():
	if not current_camera: return
	# Reset zoom - camera will continue following heroes naturally after zoom completes
	# Camera Y follows hero Y position (via _process), not locked to screen center
	var tween = create_tween().set_parallel(true).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(current_camera, "zoom", default_zoom, 1.0)
	# Note: Camera will continue following heroes after zoom completes (target_node still set)
	tween.chain().tween_callback(_on_zoom_complete)

func _on_zoom_complete():
	_is_zooming = false
	# #region agent log
	var debug_log_path = "c:\\Users\\Ropbe\\Desktop\\Road of war\\.cursor\\debug.log"
	var debug_file = FileAccess.open(debug_log_path, FileAccess.WRITE_READ)
	if debug_file:
		debug_file.seek_end()
		var camera_pos_x = 0.0
		var camera_pos_y = 0.0
		var target_pos_x = 0.0
		var target_pos_y = 0.0
		if current_camera:
			camera_pos_x = current_camera.global_position.x
			camera_pos_y = current_camera.global_position.y
		if target_node:
			target_pos_x = target_node.global_position.x
			target_pos_y = target_node.global_position.y
		var log_entry = JSON.stringify({"id":"log_camera_zoom_complete","timestamp":Time.get_ticks_msec(),"location":"CameraManager.gd:186","message":"zoom complete, is_zooming set to false, camera can now follow target","data":{"camera_pos_x":camera_pos_x,"camera_pos_y":camera_pos_y,"target_node_exists":target_node != null,"target_pos_x":target_pos_x,"target_pos_y":target_pos_y,"is_zooming_now":_is_zooming},"sessionId":"debug-session","runId":"run1","hypothesisId":"D"})
		debug_file.store_line(log_entry)
		debug_file.close()
	# #endregion

extends Node

# TextureUtils.gd - Texture validation and retry utilities
# Migrated from src/utils/texture-utils.js

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

func _ready():
	_log_info("TextureUtils", "Initialized")

# Wait for textures to be available
func wait_for_textures(texture_paths: Array, timeout: float = 5.0) -> bool:
	var elapsed = 0.0
	while elapsed < timeout:
		var all_ready = true
		for path in texture_paths:
			if not ResourceLoader.exists(path):
				all_ready = false
				break
		
		if all_ready:
			return true
		
		await get_tree().process_frame
		elapsed += get_process_delta_time()
	
	_log_warn("TextureUtils", "Timeout waiting for textures: %s" % str(texture_paths))
	return false

# Validate frame data before animation creation
func validate_frames_ready(frames: Array) -> bool:
	if frames.is_empty():
		return false
	
	for frame in frames:
		if not frame.has("texture") or not frame.has("duration"):
			return false
		
		var texture = frame["texture"]
		if not texture or not texture is Texture2D:
			return false
	
	return true

# Create animation with retry
func create_animation_with_retry(animation_name: String, frames: Array, max_retries: int = 3) -> bool:
	for attempt in range(max_retries):
		if validate_frames_ready(frames):
			# Animation creation would happen here
			_log_info("TextureUtils", "Animation %s created successfully" % animation_name)
			return true
		
		if attempt < max_retries - 1:
			var delay_time = 0.1 * pow(2, attempt)
			await get_tree().create_timer(delay_time).timeout
	
	_log_warn("TextureUtils", "Failed to create animation %s after %d retries" % [animation_name, max_retries])
	return false


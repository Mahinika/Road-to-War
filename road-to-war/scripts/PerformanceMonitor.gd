extends Node

# PerformanceMonitor.gd - Real-time performance metrics
# Migrated from src/utils/performance-monitor.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var fps_samples: Array = []
var frame_time_samples: Array = []
var max_samples: int = 100

func _ready():
	_log_info("PerformanceMonitor", "Initialized")

func _process(_delta):
	# Sample FPS
	var fps = Engine.get_frames_per_second()
	fps_samples.append(fps)
	if fps_samples.size() > max_samples:
		fps_samples.pop_front()
	
	# Sample frame time
	var frame_time = get_process_delta_time() * 1000.0  # ms
	frame_time_samples.append(frame_time)
	if frame_time_samples.size() > max_samples:
		frame_time_samples.pop_front()

# Get average FPS
func get_average_fps() -> float:
	if fps_samples.is_empty():
		return 0.0
	
	var sum = 0.0
	for fps in fps_samples:
		sum += float(fps)
	return sum / fps_samples.size()

# Get average frame time
func get_average_frame_time() -> float:
	if frame_time_samples.is_empty():
		return 0.0
	
	var sum = 0.0
	for frame_time in frame_time_samples:
		sum += frame_time
	return sum / frame_time_samples.size()

# Get performance statistics
func get_performance_stats() -> Dictionary:
	return {
		"current_fps": Engine.get_frames_per_second(),
		"average_fps": get_average_fps(),
		"min_fps": fps_samples.min() if fps_samples.size() > 0 else 0,
		"max_fps": fps_samples.max() if fps_samples.size() > 0 else 0,
		"average_frame_time_ms": get_average_frame_time(),
		"min_frame_time_ms": frame_time_samples.min() if frame_time_samples.size() > 0 else 0.0,
		"max_frame_time_ms": frame_time_samples.max() if frame_time_samples.size() > 0 else 0.0
	}


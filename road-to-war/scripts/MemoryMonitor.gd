extends Node

# MemoryMonitor.gd - Memory leak detection
# Migrated from src/utils/memory-monitor.js

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

var memory_samples: Array = []
var sample_interval: float = 5.0
var last_sample_time: float = 0.0

func _ready():
	_log_info("MemoryMonitor", "Initialized")

func _process(delta):
	var current_time = Time.get_ticks_msec() / 1000.0
	if current_time - last_sample_time >= sample_interval:
		_sample_memory()
		last_sample_time = current_time

# Sample current memory usage
func _sample_memory():
	var memory_usage = OS.get_static_memory_usage() / 1024.0 / 1024.0  # MB
	memory_samples.append({
		"time": Time.get_ticks_msec(),
		"memory_mb": memory_usage
	})
	
	# Keep only last 100 samples
	if memory_samples.size() > 100:
		memory_samples.pop_front()
	
	# Check for memory leaks
	_check_memory_leaks()

# Check for memory leaks
func _check_memory_leaks():
	if memory_samples.size() < 10:
		return
	
	var recent_samples = memory_samples.slice(-10)
	var growth_rate = _calculate_growth_rate(recent_samples)
	
	if growth_rate > 1.0:  # More than 1MB per sample interval
		_log_warn("MemoryMonitor", "Potential memory leak detected: Growth rate %.2f MB/sample" % growth_rate)
		_suggest_cleanup()

# Calculate memory growth rate
func _calculate_growth_rate(samples: Array) -> float:
	if samples.size() < 2:
		return 0.0
	
	var first_memory = samples[0]["memory_mb"]
	var last_memory = samples[-1]["memory_mb"]
	var time_diff = (samples[-1]["time"] - samples[0]["time"]) / 1000.0  # seconds
	
	if time_diff <= 0:
		return 0.0
	
	return (last_memory - first_memory) / time_diff

# Suggest cleanup actions
func _suggest_cleanup():
	_log_info("MemoryMonitor", "Suggestions: Check for unremoved nodes, clear caches, release textures")

# Get memory statistics
func get_memory_stats() -> Dictionary:
	if memory_samples.is_empty():
		return {}
	
	var current = memory_samples[-1]["memory_mb"]
	var max_memory = 0.0
	var min_memory = INF
	
	for sample in memory_samples:
		max_memory = max(max_memory, sample["memory_mb"])
		min_memory = min(min_memory, sample["memory_mb"])
	
	return {
		"current_mb": current,
		"max_mb": max_memory,
		"min_mb": min_memory,
		"growth_rate": _calculate_growth_rate(memory_samples.slice(-10))
	}


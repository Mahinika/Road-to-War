extends Node

# PerformanceValidator.gd - Automated performance tests
# Migrated from src/utils/performance-validator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("PerformanceValidator", "Initialized")

# Run baseline FPS test
func run_baseline_test(duration: float = 5.0) -> Dictionary:
	var fps_samples = []
	var start_time = Time.get_ticks_msec()
	var end_time = start_time + (duration * 1000)
	
	while Time.get_ticks_msec() < end_time:
		fps_samples.append(Engine.get_frames_per_second())
		await get_tree().process_frame
	
	var avg_fps = _calculate_average(fps_samples)
	var min_fps = fps_samples.min() if fps_samples.size() > 0 else 0
	var max_fps = fps_samples.max() if fps_samples.size() > 0 else 0
	
	return {
		"average_fps": avg_fps,
		"min_fps": min_fps,
		"max_fps": max_fps,
		"samples": fps_samples.size()
	}

# Run combat performance test
func run_combat_test() -> Dictionary:
	var combat_manager = get_node_or_null("/root/CombatManager")
	if not combat_manager:
		return {}
	
	var fps_samples = []
	var start_time = Time.get_ticks_msec()
	
	# Monitor FPS during combat
	if combat_manager.has("in_combat") and combat_manager.in_combat:
		for i in range(100):  # Sample 100 frames
			fps_samples.append(Engine.get_frames_per_second())
			await get_tree().process_frame
	
	var avg_fps = _calculate_average(fps_samples)
	
	return {
		"average_fps": avg_fps,
		"min_fps": fps_samples.min() if fps_samples.size() > 0 else 0,
		"max_fps": fps_samples.max() if fps_samples.size() > 0 else 0
	}

# Run particle performance test
func run_particle_test() -> Dictionary:
	var particle_manager = get_node_or_null("/root/ParticleManager")
	if not particle_manager:
		return {}
	
	# Create many particles and measure performance
	var fps_samples = []
	
	for i in range(50):
		if particle_manager.has_method("create_floating_text"):
			particle_manager.create_floating_text(Vector2(randf() * 1920, randf() * 1080), "Test", Color.WHITE)
		fps_samples.append(Engine.get_frames_per_second())
		await get_tree().process_frame
	
	var avg_fps = _calculate_average(fps_samples)
	
	return {
		"average_fps": avg_fps,
		"particle_count": 50
	}

# Generate performance report
func generate_report() -> Dictionary:
	var report = {
		"hardware": _detect_hardware(),
		"baseline": await run_baseline_test(3.0),
		"combat": await run_combat_test(),
		"particles": await run_particle_test()
	}
	
	_log_info("PerformanceValidator", "Performance report generated")
	return report

func _detect_hardware() -> Dictionary:
	return {
		"os": OS.get_name(),
		"gpu": RenderingServer.get_video_adapter_name(),
		"memory": OS.get_static_memory_usage() / 1024.0 / 1024.0
	}

func _calculate_average(samples: Array) -> float:
	if samples.is_empty():
		return 0.0
	
	var sum = 0.0
	for sample in samples:
		sum += float(sample)
	
	return sum / samples.size()


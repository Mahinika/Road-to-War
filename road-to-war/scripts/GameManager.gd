extends Node

# GameManager.gd - Central coordinator for game systems

signal game_started
signal game_paused(is_paused)

var is_paused = false

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	_log_info("GameManager", "System started")
	
	# Run tests in debug mode
	# if OS.is_debug_build():
	# 	var test_script = load("res://tests/TestSuite.gd")
	# 	if test_script:
	# 		var test_suite = Node.new()
	# 		test_suite.set_script(test_script)
	# 		add_child(test_suite)
	# 		test_suite.call_deferred("run_all_tests")

func start_new_game():
	_log_info("GameManager", "Starting new game")
	game_started.emit()

func set_paused(p_paused: bool):
	is_paused = p_paused
	get_tree().paused = is_paused
	game_paused.emit(is_paused)
	_log_info("GameManager", "Game " + ("paused" if is_paused else "resumed"))

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
	
	# Initialize Cursor logging if available
	if has_node("/root/CursorLogManager"):
		get_node("/root/CursorLogManager").debug_log("GameManager initialized")
	
	_log_info("GameManager", "System started")

func start_new_game():
	_log_info("GameManager", "Starting new game")
	game_started.emit()

func set_paused(p_paused: bool):
	is_paused = p_paused
	get_tree().paused = is_paused
	game_paused.emit(is_paused)
	_log_info("GameManager", "Game " + ("paused" if is_paused else "resumed"))

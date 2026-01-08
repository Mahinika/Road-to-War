extends Node

# AnimationHotReload.gd - Live animation updates
# Migrated from src/managers/animation-hot-reload.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var config_file_path: String = "res://data/animation-config.json"
var file_watcher: FileAccess = null
var last_modified_time: int = 0

func _ready():
	_log_info("AnimationHotReload", "Initialized")
	_check_file_changes()

func _process(_delta):
	_check_file_changes()

# Check for file changes
func _check_file_changes():
	if not ResourceLoader.exists(config_file_path):
		return
	
	var file = FileAccess.open(config_file_path, FileAccess.READ)
	if not file:
		return
	
	var modified_time = FileAccess.get_modified_time(config_file_path)
	if modified_time > last_modified_time:
		last_modified_time = modified_time
		_reload_animations()
	
	file.close()

# Reload animations from config
func _reload_animations():
	_log_info("AnimationHotReload", "Reloading animations from config")
	
	var animation_manager = get_node_or_null("/root/AnimationManager")
	if animation_manager and animation_manager.has_method("reload_from_config"):
		animation_manager.reload_from_config()
	else:
		_log_info("AnimationHotReload", "AnimationManager not found or missing reload_from_config method")


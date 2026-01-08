extends Node

# GameplayDataHotReload.gd - Live data file watching
# Migrated from src/managers/gameplay-data-hot-reload.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var watched_files: Dictionary = {}  # Dictionary<path, last_modified_time>
var data_manager: Node = null

func _ready():
	data_manager = get_node_or_null("/root/DataManager")
	_setup_watched_files()
	_log_info("GameplayDataHotReload", "Initialized")

func _setup_watched_files():
	# Watch common data files
	var files_to_watch = [
		"res://data/items.json",
		"res://data/talents.json",
		"res://data/enemies.json",
		"res://data/world-config.json"
	]
	
	for file_path in files_to_watch:
		if ResourceLoader.exists(file_path):
			watched_files[file_path] = FileAccess.get_modified_time(file_path)

func _process(_delta):
	_check_file_changes()

# Check for file changes
func _check_file_changes():
	for file_path in watched_files.keys():
		if not ResourceLoader.exists(file_path):
			continue
		
		var modified_time = FileAccess.get_modified_time(file_path)
		if modified_time > watched_files[file_path]:
			watched_files[file_path] = modified_time
			_reload_data_file(file_path)

# Reload a data file
func _reload_data_file(file_path: String):
	_log_info("GameplayDataHotReload", "Reloading data file: %s" % file_path)
	
	if data_manager and data_manager.has_method("reload_data"):
		var file_name = file_path.get_file().get_basename()
		data_manager.reload_data(file_name)
	else:
		_log_info("GameplayDataHotReload", "DataManager not found or missing reload_data method")


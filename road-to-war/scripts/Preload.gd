extends Control

# Preload.gd - Asset and data loading scene
# Loads all JSON data files and essential assets before starting the game

@onready var progress_bar: ProgressBar = $ProgressBar
@onready var percent_text: Label = $PercentText
@onready var loading_text: Label = $LoadingText

var total_files: int = 0
var loaded_files: int = 0

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

func _ready():
	_log_info("Preload", "Starting asset loading...")
	load_all_data()

func load_all_data():
	"""Load all JSON data files and essential assets"""
	
	# List of all data files to load
	var data_files = [
		"abilities", "achievements", "animation-config", "bloodlines",
		"classes", "enemies", "items", "keyframe-configs",
		"prestige-config", "skill-gems", "specializations",
		"stats-config", "talents", "world-config"
	]
	
	# Count total files (data files + assets)
	total_files = data_files.size() + 1  # +1 for menu background image
	loaded_files = 0
	
	# Load all data files
	for file_name in data_files:
		load_data_file(file_name)
	
	# Load essential assets
	load_menu_background()
	
	# Wait a frame to ensure DataManager has loaded
	await get_tree().process_frame
	
	# Validate data was loaded
	validate_data_loaded()
	
	# Transition to main menu
	transition_to_main_menu()

func load_data_file(file_name: String):
	"""Load a single JSON data file"""
	var path = "res://data/" + file_name + ".json"
	
	if not FileAccess.file_exists(path):
		_log_error("Preload", "Data file not found: " + path)
		update_progress()
		return
	
	var file = FileAccess.open(path, FileAccess.READ)
	if not file:
		_log_error("Preload", "Failed to open data file: " + path)
		update_progress()
		return
	
	var content = file.get_as_text()
	file.close()
	
	var json = JSON.new()
	var error = json.parse(content)
	
	if error == OK:
		# DataManager should already have loaded this in _ready(), but we verify
		var dm = get_node_or_null("/root/DataManager")
		var data = dm.get_data(file_name) if dm else null
		if data:
			_log_info("Preload", "Verified data loaded: " + file_name)
		else:
			_log_warn("Preload", "Data not in DataManager cache: " + file_name)
	else:
		_log_error("Preload", "JSON parse error in " + path + ": " + json.get_error_message())
	
	update_progress()

func load_menu_background():
	"""Load menu background image"""
	var path = "res://assets/images/menu-background.jpg"
	
	if ResourceLoader.exists(path):
		# Preload the texture
		var texture = load(path)
		if texture:
			_log_info("Preload", "Loaded menu background")
		else:
			_log_warn("Preload", "Failed to load menu background texture")
	else:
		_log_warn("Preload", "Menu background not found: " + path)
	
	update_progress()

func validate_data_loaded():
	"""Validate that all critical data files were loaded"""
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return
	
	var critical_files = ["classes", "specializations", "talents", "items", "enemies", "world-config"]
	var missing_files = []
	
	for file_name in critical_files:
		var data = dm.get_data(file_name)
		if not data:
			missing_files.append(file_name)
	
	if missing_files.size() > 0:
		_log_error("Preload", "Missing critical data files: " + str(missing_files))
		# Still continue - DataManager may have loaded them
	else:
		_log_info("Preload", "All critical data files validated")

func update_progress():
	"""Update loading progress bar and percentage"""
	loaded_files += 1
	var percent = int((float(loaded_files) / float(total_files)) * 100.0)
	
	progress_bar.value = percent
	percent_text.text = str(percent) + "%"
	
	_log_debug("Preload", "Progress: " + str(loaded_files) + "/" + str(total_files) + " (" + str(percent) + "%)")

func transition_to_main_menu():
	"""Transition to main menu scene"""
	_log_info("Preload", "Loading complete, transitioning to main menu...")
	
	# Small delay to show 100% completion
	await get_tree().create_timer(0.5).timeout
	
	# Change to main menu
	var sm = get_node_or_null("/root/SceneManager")
	if sm:
		sm.change_scene("res://scenes/MainMenu.tscn", 0.3)


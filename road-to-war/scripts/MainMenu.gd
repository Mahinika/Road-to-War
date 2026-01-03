extends Control

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

# MainMenu.gd - Main menu scene
# Entry point after preload, provides navigation to all game features

@onready var start_button: Button = $ButtonContainer/StartButton
@onready var options_button: Button = $ButtonContainer/OptionsButton
@onready var credits_button: Button = $ButtonContainer/CreditsButton
@onready var save_button: Button = $ButtonContainer/SaveButton
@onready var load_button: Button = $ButtonContainer/LoadButton
@onready var statistics_button: Button = $ButtonContainer/StatisticsButton
@onready var achievements_button: Button = $ButtonContainer/AchievementsButton
@onready var prestige_button: Button = $ButtonContainer/PrestigeButton
@onready var quit_button: Button = $ButtonContainer/QuitButton
@onready var background_image: TextureRect = $BackgroundImage

func _ready():
	_log_info("MainMenu", "Main menu initialized")
	SceneManager.is_in_game = false
	
	# Load background image if available
	load_background()
	
	# Connect button signals
	connect_buttons()
	
	# Check prestige availability
	check_prestige_availability()

func load_background():
	"""Load menu background image"""
	var bg_path = "res://assets/images/menu-background.jpg"
	if ResourceLoader.exists(bg_path):
		var texture = load(bg_path)
		if texture:
			background_image.texture = texture
			_log_info("MainMenu", "Background image loaded")
		else:
			_log_warn("MainMenu", "Failed to load background texture")
	else:
		_log_warn("MainMenu", "Background image not found: " + bg_path)

func connect_buttons():
	"""Connect all button signals"""
	start_button.pressed.connect(_on_start_pressed)
	options_button.pressed.connect(_on_options_pressed)
	credits_button.pressed.connect(_on_credits_pressed)
	save_button.pressed.connect(_on_save_pressed)
	load_button.pressed.connect(_on_load_pressed)
	statistics_button.pressed.connect(_on_statistics_pressed)
	achievements_button.pressed.connect(_on_achievements_pressed)
	prestige_button.pressed.connect(_on_prestige_pressed)
	quit_button.pressed.connect(_on_quit_pressed)

func _on_start_pressed():
	"""Start new game - go to character creation"""
	_log_info("MainMenu", "Start game pressed")
	SceneManager.change_scene("res://scenes/CharacterCreation.tscn", 0.3)

func _on_options_pressed():
	"""Open options menu"""
	_log_info("MainMenu", "Options pressed")
	SceneManager.change_scene("res://scenes/Options.tscn")

func _on_credits_pressed():
	"""Open credits"""
	_log_info("MainMenu", "Credits pressed")
	SceneManager.change_scene("res://scenes/Credits.tscn")

func _on_save_pressed():
	"""Open save game menu"""
	_log_info("MainMenu", "Save game pressed")
	SceneManager.scene_data["mode"] = "save"
	SceneManager.change_scene("res://scenes/SaveLoad.tscn")

func _on_load_pressed():
	"""Open load game menu"""
	_log_info("MainMenu", "Load game pressed")
	SceneManager.scene_data["mode"] = "load"
	SceneManager.change_scene("res://scenes/SaveLoad.tscn")

func _on_statistics_pressed():
	"""Open statistics menu"""
	_log_info("MainMenu", "Statistics pressed")
	SceneManager.change_scene("res://scenes/Statistics.tscn")

func _on_achievements_pressed():
	"""Open achievements menu"""
	_log_info("MainMenu", "Achievements pressed")
	SceneManager.change_scene("res://scenes/Achievements.tscn")

func _on_prestige_pressed():
	"""Open prestige menu"""
	_log_info("MainMenu", "Prestige pressed")
	SceneManager.change_scene("res://scenes/Prestige.tscn")

func _on_quit_pressed():
	"""Quit game"""
	_log_info("MainMenu", "Quit pressed")
	get_tree().quit()

func check_prestige_availability():
	"""Check if prestige is available and update button text"""
	prestige_button.text = "Prestige"


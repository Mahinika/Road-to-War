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

# Credits.gd - Credits screen

@onready var credits_label: Label = $VBoxContainer/CreditsLabel
@onready var back_button: Button = $VBoxContainer/BackButton

func _ready():
	_log_info("Credits", "Scene initialized")
	back_button.pressed.connect(_on_back_pressed)
	credits_label.text = "ROAD OF WAR\n\nDeveloped by Road of War Development Team\n\nGodot 4.x\nGDScript\n\nThank you for playing!"

func _on_back_pressed():
	SceneManager.change_scene("res://scenes/MainMenu.tscn")

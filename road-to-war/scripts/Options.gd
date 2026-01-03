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

# Options.gd - Game options/settings menu

@onready var back_button: Button = $VBoxContainer/BackButton

func _ready():
	_log_info("Options", "Scene initialized")
	
	# Try to find or create a Save button
	var save_btn = get_node_or_null("VBoxContainer/SaveButton")
	if not save_btn:
		save_btn = Button.new()
		save_btn.text = "SAVE GAME"
		save_btn.custom_minimum_size = Vector2(200, 50)
		$VBoxContainer.add_child(save_btn)
		$VBoxContainer.move_child(save_btn, 0) # Move to top
	
	save_btn.pressed.connect(_on_save_pressed)
	back_button.pressed.connect(_on_back_pressed)

func _on_save_pressed():
	_log_info("Options", "Saving game via Options menu...")
	SceneManager.scene_data["mode"] = "save"
	SceneManager.change_scene("res://scenes/SaveLoad.tscn")

func _on_back_pressed():
	if SceneManager.is_in_game:
		SceneManager.change_scene("res://scenes/World.tscn")
	else:
		SceneManager.change_scene("res://scenes/MainMenu.tscn")

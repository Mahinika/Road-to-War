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

# Achievements.gd - Achievements display

@onready var achievements_label: RichTextLabel = $VBoxContainer/AchievementsLabel
@onready var back_button: Button = $VBoxContainer/BackButton

func _ready():
	_log_info("Achievements", "Scene initialized")
	back_button.pressed.connect(_on_back_pressed)
	_update_achievements()

func _update_achievements():
	"""Update achievements display"""
	var achievements = AchievementManager.get_all_achievements()
	var text = "[color=gold]ACHIEVEMENTS[/color]\n\n"
	
	var unlocked_count = 0
	for achievement_id in achievements:
		var achievement = achievements[achievement_id]
		if achievement.get("unlocked", false):
			unlocked_count += 1
			text += "[color=green]✓ %s[/color]\n   [i]%s[/i]\n" % [achievement.get("name", achievement_id), achievement.get("description", "")]
		else:
			text += "[color=gray]✗ %s[/color]\n   [i]%s[/i]\n" % [achievement.get("name", achievement_id), achievement.get("description", "")]
	
	text += "\n[color=gold]TOTAL UNLOCKED: %d/%d[/color]" % [unlocked_count, achievements.size()]
	
	achievements_label.bbcode_enabled = true
	achievements_label.text = text

func _on_back_pressed():
	if SceneManager.is_in_game:
		SceneManager.change_scene("res://scenes/World.tscn")
	else:
		SceneManager.change_scene("res://scenes/MainMenu.tscn")

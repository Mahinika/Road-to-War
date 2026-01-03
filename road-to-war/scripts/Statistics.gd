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

# Statistics.gd - Game statistics display

@onready var stats_label: RichTextLabel = $VBoxContainer/StatsLabel
@onready var back_button: Button = $VBoxContainer/BackButton

func _ready():
	_log_info("Statistics", "Scene initialized")
	back_button.pressed.connect(_on_back_pressed)
	_update_stats()

func _update_stats():
	"""Update statistics display"""
	var stats = StatisticsManager.get_all_stats()
	var text = "[color=gold]GAME STATISTICS[/color]\n\n"
	text += "Enemies Defeated: %d\n" % stats.get("enemies_defeated", 0)
	text += "Combats Won/Lost: %d / %d\n" % [stats.get("combats_won", 0), stats.get("combats_lost", 0)]
	text += "Damage Dealt: %d\n" % stats.get("total_damage_dealt", 0)
	text += "Damage Taken: %d\n\n" % stats.get("total_damage_taken", 0)
	
	text += "[color=gold]COLLECTION[/color]\n"
	text += "Gold Earned: %d\n" % stats.get("gold_earned", 0)
	text += "Gold Spent: %d\n" % stats.get("gold_spent", 0)
	text += "Items Found: %d\n\n" % stats.get("items_found", 0)
	
	var play_time = stats.get("play_time", 0)
	var minutes = int(play_time / 60)
	var seconds = int(play_time) % 60
	text += "[color=gold]TIME[/color]\n"
	text += "Play Time: %d:%02d\n" % [minutes, seconds]
	
	stats_label.bbcode_enabled = true
	stats_label.text = text

func _on_back_pressed():
	if SceneManager.is_in_game:
		SceneManager.change_scene("res://scenes/World.tscn")
	else:
		SceneManager.change_scene("res://scenes/MainMenu.tscn")

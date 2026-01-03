extends Node

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

# AnimationManager.gd - Handles sprite animation logic and queuing
# Adapted from Phaser 3 version to Godot 4.x

signal animation_started(hero_id, anim_name)
signal animation_finished(hero_id, anim_name)

# Map<hero_id, current_animation>
var active_animations: Dictionary = {}

func _ready():
	_log_info("AnimationManager", "Initialized")

func play_animation(hero_sprite: Node2D, anim_name: String, _loop: bool = true):
	if not hero_sprite: return
	
	var hero_id = hero_sprite.get("hero_data").id if "hero_data" in hero_sprite else "unknown"
	
	active_animations[hero_id] = anim_name
	animation_started.emit(hero_id, anim_name)
	
	if hero_sprite.has_method("play_animation"):
		hero_sprite.play_animation(anim_name)
	
	_log_debug("AnimationManager", "Playing %s for %s" % [anim_name, hero_id])

func stop_animation(hero_id: String):
	active_animations.erase(hero_id)
	animation_finished.emit(hero_id, "stopped")

func get_active_animation(hero_id: String) -> String:
	return active_animations.get(hero_id, "")

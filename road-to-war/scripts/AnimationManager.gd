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
# Godot 4.x animation management system

signal animation_started(hero_id, anim_name)
signal animation_finished(hero_id, anim_name)

# Map<hero_id, current_animation>
var active_animations: Dictionary = {}

func _ready():
	_log_info("AnimationManager", "Initialized")

func play_animation(hero_sprite: Node2D, anim_name: String, _loop: bool = true):
	# CRITICAL: Null check to prevent errors
	if not hero_sprite:
		_log_warn("AnimationManager", "play_animation called with null hero_sprite")
		return
	
	# CRITICAL: Check if hero_sprite is a valid instance
	if not is_instance_valid(hero_sprite):
		_log_warn("AnimationManager", "hero_sprite is not a valid instance")
		return
	
	# CRITICAL: Check if hero_sprite is in the scene tree (ready) before calling methods
	# Note: World.gd already defers the call, so if we reach here and it's not in tree, just return
	if not hero_sprite.is_inside_tree():
		_log_warn("AnimationManager", "hero_sprite not in scene tree - skipping animation (should be deferred by caller)")
		return
	
	# CRITICAL: Validate that hero_sprite has the required method
	if not hero_sprite.has_method("play_animation"):
		_log_warn("AnimationManager", "hero_sprite does not have play_animation method")
		return
	
	var hero_id = "unknown"
	if "hero_data" in hero_sprite:
		var hero_data = hero_sprite.get("hero_data")
		if hero_data:
			# Handle both Dictionary and Resource (Hero.gd) types
			if hero_data is Dictionary:
				hero_id = hero_data.get("id", "unknown")
			else:
				# Hero is a Resource (Hero.gd)
				hero_id = hero_data.id if "id" in hero_data else "unknown"
	
	active_animations[hero_id] = anim_name
	animation_started.emit(hero_id, anim_name)
	
	# Call play_animation method on hero_sprite
	# Note: HeroSprite.play_animation() should handle null body_layer internally
	hero_sprite.play_animation(anim_name)
	
	_log_debug("AnimationManager", "Playing %s for %s" % [anim_name, hero_id])

func stop_animation(hero_id: String):
	active_animations.erase(hero_id)
	animation_finished.emit(hero_id, "stopped")

func get_active_animation(hero_id: String) -> String:
	return active_animations.get(hero_id, "")

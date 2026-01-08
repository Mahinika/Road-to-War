extends Node

# AnimationValidator.gd - Animation integrity checks
# Migrated from src/utils/animation-validator.js

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

func _ready():
	_log_info("AnimationValidator", "Initialized")

# Validate all animations in an AnimationPlayer
func validate_all_animations(animation_player: AnimationPlayer) -> Dictionary:
	var results = {
		"valid": true,
		"errors": [],
		"warnings": []
	}
	
	if not animation_player:
		results["valid"] = false
		results["errors"].append("AnimationPlayer is null")
		return results
	
	var animation_list = animation_player.get_animation_list()
	for animation_name in animation_list:
		var validation = validate_animation(animation_player, animation_name)
		if not validation["valid"]:
			results["valid"] = false
			results["errors"].append_array(validation["errors"])
		if validation.has("warnings"):
			results["warnings"].append_array(validation["warnings"])
	
	return results

# Validate a single animation
func validate_animation(animation_player: AnimationPlayer, animation_name: String) -> Dictionary:
	var errors = []
	var warnings = []
	
	if not animation_player.has_animation(animation_name):
		errors.append("Animation '%s' does not exist" % animation_name)
		return {"valid": false, "errors": errors, "warnings": warnings}
	
	var animation = animation_player.get_animation(animation_name)
	
	# Check animation length
	if animation.length <= 0:
		errors.append("Animation '%s' has zero or negative length" % animation_name)
	
	# Check track count
	if animation.track_count == 0:
		warnings.append("Animation '%s' has no tracks" % animation_name)
	
	# Check for common issues
	for track_idx in range(animation.track_count):
		var track_path = animation.track_get_path(track_idx)
		var key_count = animation.track_get_key_count(track_idx)
		
		if key_count == 0:
			warnings.append("Track '%s' in animation '%s' has no keys" % [track_path, animation_name])
	
	return {"valid": errors.is_empty(), "errors": errors, "warnings": warnings}

# Health check for animations
func health_check() -> Dictionary:
	var all_results = []
	
	# Find all AnimationPlayers in the scene
	var animation_players = _find_animation_players(get_tree().root)
	
	for ap in animation_players:
		var result = validate_all_animations(ap)
		result["animation_player"] = ap.name
		all_results.append(result)
	
	return {
		"total_checked": animation_players.size(),
		"results": all_results
	}

func _find_animation_players(root: Node) -> Array:
	var results = []
	
	if root is AnimationPlayer:
		results.append(root)
	
	for child in root.get_children():
		results.append_array(_find_animation_players(child))
	
	return results


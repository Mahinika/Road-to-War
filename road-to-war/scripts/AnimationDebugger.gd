extends Node

# AnimationDebugger.gd - Animation state logging
# Migrated from src/utils/animation-debugger.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

var animation_logs: Array = []
var max_logs: int = 100

func _ready():
	_log_info("AnimationDebugger", "Initialized")

# Log animation state change
func log_animation_state(node: Node, animation_name: String, state: String):
	var log_entry = {
		"timestamp": Time.get_ticks_msec(),
		"node": node.name if node else "Unknown",
		"animation": animation_name,
		"state": state
	}
	
	animation_logs.append(log_entry)
	if animation_logs.size() > max_logs:
		animation_logs.pop_front()
	
	_log_debug("AnimationDebugger", "%s: %s -> %s" % [node.name if node else "Unknown", animation_name, state])

# Get animation statistics
func get_animation_stats() -> Dictionary:
	var stats = {}
	
	for log in animation_logs:
		var key = "%s_%s" % [log["animation"], log["state"]]
		if not stats.has(key):
			stats[key] = 0
		stats[key] += 1
	
	return stats

# Validate animation
func validate_animation(animation_player: AnimationPlayer, animation_name: String) -> Dictionary:
	var errors = []
	
	if not animation_player:
		errors.append("AnimationPlayer is null")
		return {"valid": false, "errors": errors}
	
	if not animation_player.has_animation(animation_name):
		errors.append("Animation '%s' does not exist" % animation_name)
		return {"valid": false, "errors": errors}
	
	var animation = animation_player.get_animation(animation_name)
	if animation.length <= 0:
		errors.append("Animation '%s' has zero length" % animation_name)
	
	if animation.track_count == 0:
		errors.append("Animation '%s' has no tracks" % animation_name)
	
	return {"valid": errors.is_empty(), "errors": errors}


# CursorLogManager.gd
# Singleton for logging everything Godot does for Cursor IDE
# Works with Godot 4.5

extends Node

# Path to log file
const LOG_FILE_PATH := "user://cursor_logs.txt"

var file: FileAccess

# Called when node enters scene tree
func _ready():
	# Open log file in append mode
	file = FileAccess.open(LOG_FILE_PATH, FileAccess.WRITE_READ)
	if file:
		file.seek_end()
		debug_log("--- Game Session Started ---")
	else:
		push_error("Failed to open CursorLogManager log file!")

	# Connect global engine error signal
	# Note: In Godot 4.x, Engine doesn't have an "error" signal directly.
	# We use push_error/push_warning which Godot handles, but for capturing
	# we might need to rely on the editor/console output.
	# However, we can still provide the manual debug_log and specific hooks.
	
	# Optional: Log every physics tick for general debug
	set_physics_process(false) # Default to false to avoid spam


# Called every physics frame
func _physics_process(_delta: float) -> void:
	pass


# Central logging function
func debug_log(msg: String) -> void:
	# Include timestamp for readability
	var time_dict = Time.get_datetime_dict_from_system()
	var timestamp = "[%04d-%02d-%02d %02d:%02d:%02d] " % [
		time_dict.year, time_dict.month, time_dict.day,
		time_dict.hour, time_dict.minute, time_dict.second
	]
	var line = timestamp + msg

	# Print to console (only once - Logger no longer double-prints)
	print(line)

	# Write to file (limit buffer to prevent overflow)
	if file:
		file.store_line(line)
		# Only flush every 10 lines to reduce I/O overhead
		if file.get_position() % 1000 < 200:  # Approximate check
			file.flush()  # Periodically save for Cursor to read


# Capture all Godot runtime errors/warnings
# Note: This is a placeholder as Godot 4 doesn't easily expose a global error signal to GDScript.
# Use debug_log for manual tracking of critical sections.
func _on_error(message: String, _p_type: int, file_path: String, line_num: int, func_name: String) -> void:
	var type_str := "ERROR"
	# Mapping logic if signal existed
	debug_log("[%s] %s:%d in %s" % [type_str, file_path, line_num, func_name])
	debug_log(" >> " + message)


# Optional helper to log hero state (or any object)
func log_hero_state(hero_node: Node) -> void:
	if hero_node == null:
		return
	var pos = hero_node.global_position
	var vel = Vector2.ZERO
	if "velocity" in hero_node:
		vel = hero_node.velocity
	debug_log("Hero state: pos=%s, vel=%s" % [pos, vel])


# Structured JSON logging for debug data (replaces hard-coded debug.log paths)
# NOTE: This is very verbose - use sparingly to avoid output overflow
func log_structured(location: String, message: String, data: Dictionary = {}, session_id: String = "default", hypothesis_id: String = "") -> void:
	# Throttle structured logging to prevent output overflow
	# Only log every 5 seconds maximum
	var current_time = Time.get_ticks_msec()
	if not has_meta("last_structured_log_time"):
		set_meta("last_structured_log_time", current_time)
	
	var last_log_time = get_meta("last_structured_log_time", 0)
	if current_time - last_log_time < 5000:  # Only log every 5 seconds
		return  # Skip this log to prevent overflow
	
	set_meta("last_structured_log_time", current_time)
	
	var log_entry = {
		"location": location,
		"message": message,
		"data": data,
		"timestamp": current_time,
		"sessionId": session_id,
		"hypothesisId": hypothesis_id
	}
	var json_str = JSON.stringify(log_entry)
	debug_log("[STRUCTURED] %s" % json_str)

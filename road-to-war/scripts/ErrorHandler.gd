extends Node

# ErrorHandler.gd - Error handling utilities
# Migrated from src/utils/error-handler.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

func _log_warn(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.warn(source, message)
	else:
		print("[%s] [WARN] %s" % [source, message])

var error_count: int = 0
var warning_count: int = 0

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

# Handle an error
func handle_error(source: String, error: String, context: Dictionary = {}):
	error_count += 1
	_log_error(source, "%s | Context: %s" % [error, str(context)])
	
	# Emit error event
	var event_bus = get_node_or_null("/root/EventBus")
	if event_bus:
		event_bus.emit("error_occurred", {"source": source, "error": error, "context": context})

# Handle a warning
func handle_warning(source: String, warning: String, context: Dictionary = {}):
	warning_count += 1
	_log_warn(source, "%s | Context: %s" % [warning, str(context)])

# Get error statistics
func get_error_stats() -> Dictionary:
	return {
		"error_count": error_count,
		"warning_count": warning_count
	}

# Reset error counts
func reset_stats():
	error_count = 0
	warning_count = 0


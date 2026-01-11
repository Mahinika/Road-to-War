extends Node

# BaseManager.gd - Base class for all managers with standardized initialization
# Godot 4.x base manager class

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
		if logger.has_method("debug"):
			logger.debug(source, message)
		else:
			logger.info(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

# Override this in derived classes to get dependencies
func get_dependencies() -> Array:
	return []

# Override this in derived classes for initialization
func initialize():
	_log_info("BaseManager", "Base initialization (override in derived classes)")

# Override this in derived classes for cleanup
func cleanup():
	_log_info("BaseManager", "Base cleanup (override in derived classes)")

# Get a dependency by name
func get_dependency(node_name: String) -> Node:
	return get_node_or_null("/root/%s" % node_name)

# Initialize all dependencies
func initialize_dependencies():
	var deps = get_dependencies()
	for dep_name in deps:
		var dep = get_dependency(dep_name)
		if not dep:
			_log_warn("BaseManager", "Dependency %s not found" % dep_name)
		else:
			_log_debug("BaseManager", "Dependency %s found" % dep_name)

func _ready():
	initialize_dependencies()
	initialize()

func _exit_tree():
	cleanup()


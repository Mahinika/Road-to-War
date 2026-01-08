extends Node

# ManagerRegistry.gd - Manager registration system
# Migrated from src/utils/manager-registry.js
# In Godot, we use Autoload system, but this provides additional registry functionality

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

var registered_managers: Dictionary = {}
var initialization_order: Array = []

func _ready():
	_log_info("ManagerRegistry", "Initialized")

# Register a manager
func register_manager(manager_name: String, manager: Node, dependencies: Array = []):
	registered_managers[manager_name] = {
		"manager": manager,
		"dependencies": dependencies,
		"initialized": false
	}
	
	_log_info("ManagerRegistry", "Registered manager: %s" % manager_name)

# Get a registered manager
func get_manager(manager_name: String) -> Node:
	if registered_managers.has(manager_name):
		return registered_managers[manager_name]["manager"]
	return null

# Initialize all managers in dependency order
func initialize_all_managers():
	# Calculate initialization order based on dependencies
	initialization_order = _calculate_init_order()
	
	# Initialize managers in order
	for manager_name in initialization_order:
		var manager_data = registered_managers[manager_name]
		if manager_data and not manager_data["initialized"]:
			var manager = manager_data["manager"]
			if manager.has_method("initialize"):
				manager.initialize()
			manager_data["initialized"] = true
			_log_info("ManagerRegistry", "Initialized manager: %s" % manager_name)

# Calculate initialization order using topological sort
func _calculate_init_order() -> Array:
	var order = []
	var visited = {}
	var temp_mark = {}
	
	for manager_name in registered_managers.keys():
		if not visited.has(manager_name):
			_visit_manager(manager_name, visited, temp_mark, order)
	
	return order

func _visit_manager(manager_name: String, visited: Dictionary, temp_mark: Dictionary, order: Array):
	if temp_mark.has(manager_name):
		_log_warn("ManagerRegistry", "Circular dependency detected involving: %s" % manager_name)
		return
	
	if visited.has(manager_name):
		return
	
	temp_mark[manager_name] = true
	
	var manager_data = registered_managers.get(manager_name, {})
	var dependencies = manager_data.get("dependencies", [])
	
	for dep in dependencies:
		if registered_managers.has(dep):
			_visit_manager(dep, visited, temp_mark, order)
	
	temp_mark.erase(manager_name)
	visited[manager_name] = true
	order.append(manager_name)


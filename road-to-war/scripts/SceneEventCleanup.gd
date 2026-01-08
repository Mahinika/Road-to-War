extends Node

# SceneEventCleanup.gd - Event cleanup utilities
# Migrated from src/utils/scene-event-cleanup.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("SceneEventCleanup", "Initialized")

# Clean up all signal connections for a node
func cleanup_node_signals(node: Node):
	if not node:
		return
	
	# Disconnect all signals
	var signal_list = node.get_signal_list()
	for signal_info in signal_list:
		var signal_name = signal_info["name"]
		# Get connected callables
		var connections = node.get_signal_connection_list(signal_name)
		for connection in connections:
			if connection.has("callable"):
				node.disconnect(signal_name, connection["callable"])

# Clean up all timers
func cleanup_timers(node: Node):
	if not node:
		return
	
	# Find all Timer nodes
	var timers = _find_nodes_by_type(node, "Timer")
	for timer in timers:
		if timer.is_valid():
			timer.stop()
			timer.queue_free()

# Clean up all tweens
func cleanup_tweens(node: Node):
	if not node:
		return
	
	# Find all Tween nodes
	var tweens = _find_nodes_by_type(node, "Tween")
	for tween in tweens:
		if tween.is_valid():
			tween.kill()
			tween.queue_free()

# Find nodes by type recursively
func _find_nodes_by_type(root: Node, type: String) -> Array:
	var results = []
	_find_nodes_recursive(root, type, results)
	return results

func _find_nodes_recursive(node: Node, type: String, results: Array):
	if node.get_class() == type:
		results.append(node)
	
	for child in node.get_children():
		_find_nodes_recursive(child, type, results)

# Complete cleanup for a scene
func cleanup_scene(scene_root: Node):
	if not scene_root:
		return
	
	cleanup_node_signals(scene_root)
	cleanup_timers(scene_root)
	cleanup_tweens(scene_root)
	
	_log_info("SceneEventCleanup", "Cleaned up scene: %s" % scene_root.name)


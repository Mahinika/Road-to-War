extends Node

# EventBus.gd - Centralized event system
# Migrated from src/utils/event-bus.js
# In Godot, we use signals, but this provides a centralized event bus pattern

signal event_emitted(event_name, data)

var listeners: Dictionary = {}  # Dictionary<eventName, Array<Callable>>

func _ready():
	_log_info("EventBus", "Initialized")

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

# Subscribe to an event
func subscribe(event_name: String, callback: Callable):
	if not listeners.has(event_name):
		listeners[event_name] = []
	listeners[event_name].append(callback)

# Unsubscribe from an event
func unsubscribe(event_name: String, callback: Callable):
	if listeners.has(event_name):
		listeners[event_name].erase(callback)

# Emit an event
func emit(event_name: String, data: Dictionary = {}):
	event_emitted.emit(event_name, data)
	
	if listeners.has(event_name):
		for callback in listeners[event_name]:
			if callback.is_valid():
				callback.call(data)

# Clear all listeners for an event
func clear_listeners(event_name: String):
	if listeners.has(event_name):
		listeners[event_name].clear()

# Clear all listeners
func clear_all_listeners():
	listeners.clear()


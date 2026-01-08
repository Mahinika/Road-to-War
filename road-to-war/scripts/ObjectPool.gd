extends Node

# ObjectPool.gd - Object pooling for performance
# Migrated from src/utils/object-pool.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var pools: Dictionary = {}  # Dictionary<type, Array>
var max_pool_size: int = 50

# Acquire an object from the pool
func acquire(type: String) -> Node:
	if not pools.has(type):
		pools[type] = []
	
	var pool = pools[type]
	if pool.is_empty():
		return _create_object(type)
	
	return pool.pop_back()

# Release an object back to the pool
func release(type: String, obj: Node):
	if not pools.has(type):
		pools[type] = []
	
	var pool = pools[type]
	if pool.size() < max_pool_size:
		_reset_object(obj)
		pool.append(obj)
	else:
		obj.queue_free()

# Create a new object of the specified type
func _create_object(type: String) -> Node:
	match type:
		"floating_text":
			var text_scene = preload("res://scenes/FloatingText.tscn")
			if text_scene:
				return text_scene.instantiate()
			return Node2D.new()
		"particle":
			return CPUParticles2D.new()
		_:
			return Node.new()

# Reset an object to its default state
func _reset_object(obj: Node):
	if obj.has_method("reset"):
		obj.reset()
	else:
		# Generic reset
		obj.visible = false
		if obj.has("position"):
			obj.position = Vector2.ZERO
		if obj.has("modulate"):
			obj.modulate = Color.WHITE
		# Reset elapsed time for FloatingText
		if obj.has("elapsed"):
			obj.elapsed = 0.0

# Clear a specific pool
func clear_pool(type: String):
	if pools.has(type):
		for obj in pools[type]:
			if is_instance_valid(obj):
				obj.queue_free()
		pools[type].clear()

# Clear all pools
func clear_all_pools():
	for type in pools.keys():
		clear_pool(type)
	pools.clear()

func _ready():
	_log_info("ObjectPool", "Initialized")

func _exit_tree():
	clear_all_pools()


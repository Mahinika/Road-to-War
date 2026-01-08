extends Node

# JointTransform.gd - Joint-based sprite transformation
# Migrated from src/generators/joint-transform.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("JointTransform", "Initialized")

# Transform a component based on joint position
static func transform_component(component: Node2D, joint_position: Vector2, rotation: float = 0.0, scale: Vector2 = Vector2.ONE):
	if not component:
		return
	
	component.position = joint_position
	component.rotation_degrees = rotation
	component.scale = scale

# Calculate joint position from parent
static func calculate_joint_position(parent: Node2D, offset: Vector2, parent_rotation: float = 0.0) -> Vector2:
	if not parent:
		return offset
	
	var rotated_offset = offset.rotated(deg_to_rad(parent_rotation))
	return parent.position + rotated_offset

# Interpolate between two joint states
static func interpolate_joints(state1: Dictionary, state2: Dictionary, t: float) -> Dictionary:
	t = clamp(t, 0.0, 1.0)
	
	return {
		"position": state1.get("position", Vector2.ZERO).lerp(state2.get("position", Vector2.ZERO), t),
		"rotation": lerp(state1.get("rotation", 0.0), state2.get("rotation", 0.0), t),
		"scale": state1.get("scale", Vector2.ONE).lerp(state2.get("scale", Vector2.ONE), t)
	}


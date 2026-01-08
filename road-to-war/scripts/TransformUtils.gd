extends Node

# TransformUtils.gd - Transformation utilities
# Migrated from src/generators/utils/transform-utils.js

# Convert world coordinates to screen coordinates
static func world_to_screen(world_pos: Vector2, camera: Camera2D) -> Vector2:
	if not camera:
		return world_pos
	return camera.get_screen_center_position() + (world_pos - camera.position)

# Convert screen coordinates to world coordinates
static func screen_to_world(screen_pos: Vector2, camera: Camera2D) -> Vector2:
	if not camera:
		return screen_pos
	return camera.position + (screen_pos - camera.get_screen_center_position())

# Rotate a point around a center
static func rotate_point(point: Vector2, center: Vector2, angle: float) -> Vector2:
	var offset = point - center
	var cos_a = cos(angle)
	var sin_a = sin(angle)
	return Vector2(
		offset.x * cos_a - offset.y * sin_a,
		offset.x * sin_a + offset.y * cos_a
	) + center

# Scale a point from a center
static func scale_point(point: Vector2, center: Vector2, scale: Vector2) -> Vector2:
	var offset = point - center
	return Vector2(offset.x * scale.x, offset.y * scale.y) + center

# Transform a point with translation, rotation, and scale
static func transform_point(point: Vector2, translation: Vector2, rotation: float, scale: Vector2) -> Vector2:
	var result = point
	result = scale_point(result, Vector2.ZERO, scale)
	result = rotate_point(result, Vector2.ZERO, rotation)
	result += translation
	return result


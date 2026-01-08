extends Node

# ShapeUtils.gd - Shape generation utilities
# Migrated from src/generators/utils/shape-utils.js

# Create a rectangle shape
static func create_rectangle(width: float, height: float) -> PackedVector2Array:
	return PackedVector2Array([
		Vector2(0, 0),
		Vector2(width, 0),
		Vector2(width, height),
		Vector2(0, height)
	])

# Create a circle shape
static func create_circle(radius: float, segments: int = 16) -> PackedVector2Array:
	var points = PackedVector2Array()
	for i in range(segments):
		var angle = (i / float(segments)) * TAU
		points.append(Vector2(cos(angle) * radius, sin(angle) * radius))
	return points

# Create an ellipse shape
static func create_ellipse(width: float, height: float, segments: int = 16) -> PackedVector2Array:
	var points = PackedVector2Array()
	for i in range(segments):
		var angle = (i / float(segments)) * TAU
		points.append(Vector2(cos(angle) * width / 2.0, sin(angle) * height / 2.0))
	return points

# Create a polygon shape
static func create_polygon(sides: int, radius: float) -> PackedVector2Array:
	var points = PackedVector2Array()
	for i in range(sides):
		var angle = (i / float(sides)) * TAU - PI / 2.0
		points.append(Vector2(cos(angle) * radius, sin(angle) * radius))
	return points


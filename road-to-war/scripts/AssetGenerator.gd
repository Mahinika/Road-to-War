extends Node

# AssetGenerator.gd - General asset generation utilities
# Migrated from src/generators/asset-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("AssetGenerator", "Initialized")

# Generate a simple texture asset
func generate_texture_asset(width: int, height: int, color: Color = Color.WHITE) -> ImageTexture:
	var image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

# Generate a sprite asset
func generate_sprite_asset(texture: Texture2D, region: Rect2 = Rect2()) -> Sprite2D:
	var sprite = Sprite2D.new()
	sprite.texture = texture
	if region != Rect2():
		# Apply region if specified
		pass  # Would need AtlasTexture for region support
	return sprite

# Generate a simple mesh asset
func generate_mesh_asset(vertices: PackedVector2Array) -> ArrayMesh:
	var mesh = ArrayMesh.new()
	var arrays = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


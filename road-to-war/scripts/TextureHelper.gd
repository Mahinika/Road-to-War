extends Node

# TextureHelper.gd - Texture management utilities
# Migrated from src/utils/texture-helper.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("TextureHelper", "Initialized")

# Load a texture from path
func load_texture(path: String) -> Texture2D:
	if ResourceLoader.exists(path):
		return load(path) as Texture2D
	return null

# Check if texture exists
func texture_exists(path: String) -> bool:
	return ResourceLoader.exists(path)

# Get texture size
func get_texture_size(texture: Texture2D) -> Vector2:
	if texture:
		return Vector2(texture.get_width(), texture.get_height())
	return Vector2.ZERO

# Create a texture from image data
func create_texture_from_image(image: Image) -> ImageTexture:
	if image:
		var texture = ImageTexture.create_from_image(image)
		return texture
	return null

# Create a texture from color
func create_texture_from_color(color: Color, width: int, height: int) -> ImageTexture:
	var image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

# Validate texture
func validate_texture(texture: Texture2D) -> bool:
	return texture != null and texture.get_width() > 0 and texture.get_height() > 0


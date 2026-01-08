extends Node

# PlaceholderHelper.gd - Placeholder asset utilities
# Migrated from src/utils/placeholder-helper.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("PlaceholderHelper", "Initialized")

# Create a placeholder texture
func create_placeholder_texture(width: int, height: int, color: Color = Color.GRAY) -> ImageTexture:
	var image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	image.fill(color)
	return ImageTexture.create_from_image(image)

# Get placeholder key for an asset type
static func get_placeholder_key(asset_type: String) -> String:
	return "placeholder_%s" % asset_type

# Ensure placeholder texture exists
func ensure_placeholder_texture(asset_type: String, size: Vector2 = Vector2(64, 64)) -> Texture2D:
	var key = get_placeholder_key(asset_type)
	
	# Check if already exists in cache
	var texture_helper = get_node_or_null("/root/TextureHelper")
	if texture_helper and texture_helper.has_method("get_texture"):
		var existing = texture_helper.get_texture(key)
		if existing:
			return existing
	
	# Create new placeholder
	var color = _get_placeholder_color(asset_type)
	var texture = create_placeholder_texture(int(size.x), int(size.y), color)
	
	# Cache it
	if texture_helper and texture_helper.has_method("cache_texture"):
		texture_helper.cache_texture(key, texture)
	
	return texture

# Get placeholder color for asset type
func _get_placeholder_color(asset_type: String) -> Color:
	match asset_type:
		"texture": return Color.GRAY
		"icon": return Color(0.5, 0.5, 0.5)
		"portrait": return Color(0.3, 0.3, 0.3)
		_: return Color.GRAY


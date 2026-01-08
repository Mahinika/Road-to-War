extends Node

# PortraitGenerator.gd - Hero portrait generation
# Migrated from src/utils/portrait-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("PortraitGenerator", "Initialized")

# Generate a portrait for a hero
func generate_portrait(hero: Dictionary, size: Vector2 = Vector2(128, 128)) -> Texture2D:
	if hero.is_empty():
		return null
	
	# Create a SubViewport for high-resolution portrait rendering
	var viewport = SubViewport.new()
	viewport.size = size
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	
	# Create a scene with the hero sprite
	var portrait_scene = Node2D.new()
	viewport.add_child(portrait_scene)
	
	# Add hero sprite to viewport (would need to instantiate HeroSprite)
	# This is a placeholder - actual implementation would render the hero
	
	# Render to texture
	var texture = viewport.get_texture()
	return texture

# Generate portrait with equipment
func generate_portrait_with_equipment(hero: Dictionary, equipment: Dictionary, size: Vector2 = Vector2(128, 128)) -> Texture2D:
	# Similar to generate_portrait but includes equipment visuals
	return generate_portrait(hero, size)

# Cache portrait for reuse
var portrait_cache: Dictionary = {}

func get_cached_portrait(hero_id: String) -> Texture2D:
	return portrait_cache.get(hero_id, null)

func cache_portrait(hero_id: String, portrait: Texture2D):
	portrait_cache[hero_id] = portrait

func clear_portrait_cache():
	portrait_cache.clear()


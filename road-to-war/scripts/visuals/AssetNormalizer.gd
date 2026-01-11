extends Node
class_name AssetNormalizer

## Normalizes a Sprite2D based on a texture and target profile settings.
## Optimized for AI assets with inconsistent borders and scales.
static func normalize(sprite: Sprite2D, texture: Texture2D, profile: AssetProfile):
	if not texture or not sprite:
		return
	
	sprite.texture = texture
	var raw_size = texture.get_size()
	
	# 1. Pivot Alignment
	sprite.centered = true
	# Adjust offset based on pivot_offset from profile
	# Default (0.5, 0.5) means offset is (0,0) with centered=true
	sprite.offset = (profile.pivot_offset - Vector2(0.5, 0.5)) * raw_size
	
	# 2. Scaling
	# We scale to fit within the base_size while maintaining aspect ratio
	var scale_x = profile.base_size.x / raw_size.x
	var scale_y = profile.base_size.y / raw_size.y
	var scale_factor = min(scale_x, scale_y)
	
	sprite.scale = Vector2(scale_factor, scale_factor)
	
	# 3. Pixel Grid Snapping
	if profile.use_pixel_snap:
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	else:
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS

## Helper to auto-crop transparent borders (simulated via Region)
## AI generators often leave large empty spaces.
static func auto_crop(sprite: Sprite2D):
	var texture = sprite.texture
	if not texture: return
	
	var image = texture.get_image()
	if not image: return
	
	var rect = image.get_used_rect()
	if rect.size == Vector2i.ZERO: return
	
	sprite.region_enabled = true
	sprite.region_rect = rect

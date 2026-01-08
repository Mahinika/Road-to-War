extends Node

# AnimationGenerator.gd - Procedural animation generation
# Migrated from src/generators/animation-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("AnimationGenerator", "Initialized")

# Generate animation sequence
func generate_animation(animation_name: String, frames: Array, frame_rate: float = 12.0) -> Animation:
	var animation = Animation.new()
	animation.name = animation_name
	animation.length = frames.size() / frame_rate
	
	# Add tracks for each frame
	for i in range(frames.size()):
		var track_idx = animation.add_track(Animation.TYPE_VALUE)
		animation.track_set_path(track_idx, ":sprite_frame")
		animation.track_insert_key(track_idx, i / frame_rate, frames[i])
	
	return animation

# Generate animation from sprite sheet
func generate_from_sprite_sheet(sprite_sheet: Texture2D, frame_count: int, frame_width: int, frame_height: int) -> Array:
	var frames = []
	
	for i in range(frame_count):
		var atlas_texture = AtlasTexture.new()
		atlas_texture.atlas = sprite_sheet
		atlas_texture.region = Rect2(i * frame_width, 0, frame_width, frame_height)
		frames.append(atlas_texture)
	
	return frames


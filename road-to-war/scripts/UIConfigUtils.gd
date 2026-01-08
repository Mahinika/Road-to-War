extends Node

# UIConfigUtils.gd - UI configuration utilities
# Migrated from src/utils/ui-config-utils.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var ui_config: Dictionary = {}

func _ready():
	_load_ui_config()
	_log_info("UIConfigUtils", "Initialized")

# Load UI config from file
func _load_ui_config():
	var dm = get_node_or_null("/root/DataManager")
	if dm and dm.has_method("get_data"):
		ui_config = dm.get_data("ui-config") if dm.has_method("get_data") else {}
	else:
		# Default config
		ui_config = {
			"base_resolution": Vector2(1920, 1080),
			"scaling": "viewport",
			"font_sizes": {
				"small": 12,
				"medium": 14,
				"large": 18,
				"title": 24
			}
		}

# Get UI config value
func get_config(key: String, default_value = null) -> Variant:
	return ui_config.get(key, default_value)

# Get scaled size based on current resolution
func get_scaled_size(base_size: Vector2) -> Vector2:
	var viewport = get_viewport()
	if not viewport:
		return base_size
	
	var current_size = viewport.get_visible_rect().size
	var base_resolution = ui_config.get("base_resolution", Vector2(1920, 1080))
	
	var scale_x = current_size.x / base_resolution.x
	var scale_y = current_size.y / base_resolution.y
	var scale = min(scale_x, scale_y)  # Maintain aspect ratio
	
	return base_size * scale

# Get scaled font size
func get_scaled_font_size(size_name: String) -> int:
	var base_size = ui_config.get("font_sizes", {}).get(size_name, 14)
	var scaled_size = get_scaled_size(Vector2(base_size, base_size))
	return int(scaled_size.x)


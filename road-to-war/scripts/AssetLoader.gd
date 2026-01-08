extends Node

# AssetLoader.gd - Asset loading utilities
# Migrated from src/utils/asset-loader.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_warn(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.warn(source, message)
	else:
		print("[%s] [WARN] %s" % [source, message])

var asset_cache: Dictionary = {}

func _ready():
	_log_info("AssetLoader", "Initialized")

# Load an asset
func load_asset(path: String, asset_type: String = "texture") -> Variant:
	# Check cache first
	if asset_cache.has(path):
		return asset_cache[path]
	
	# Load based on type
	var asset = null
	match asset_type:
		"texture":
			asset = load_texture(path)
		"json":
			asset = load_json(path)
		"audio":
			asset = load_audio(path)
		_:
			asset = load(path)
	
	# Cache if loaded successfully
	if asset:
		asset_cache[path] = asset
	
	return asset

# Load texture
func load_texture(path: String) -> Texture2D:
	if ResourceLoader.exists(path):
		return load(path) as Texture2D
	return null

# Load JSON
func load_json(path: String) -> Dictionary:
	if ResourceLoader.exists(path):
		var file = FileAccess.open(path, FileAccess.READ)
		if file:
			var json_string = file.get_as_text()
			file.close()
			var json = JSON.new()
			var error = json.parse(json_string)
			if error == OK:
				return json.data
	return {}

# Load audio
func load_audio(path: String) -> AudioStream:
	if ResourceLoader.exists(path):
		return load(path) as AudioStream
	return null

# Get asset from cache
func get_asset(path: String) -> Variant:
	return asset_cache.get(path, null)

# Clear asset cache
func clear_cache():
	asset_cache.clear()

# Preload assets
func preload_assets(paths: Array):
	for path in paths:
		load_asset(path)


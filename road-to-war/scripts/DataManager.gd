extends Node

# DataManager.gd - Handles loading and caching of all JSON data files

var data_cache = {}

func _ready():
	load_all_data()

func load_all_data():
	var data_files = [
		"abilities", "achievements", "animation-config", "bloodlines",
		"classes", "enemies", "items", "keyframe-configs",
		"prestige-config", "quests", "skill-gems", "specializations",
		"stats-config", "talents", "world-config"
	]
	
	for file_name in data_files:
		var path = "res://data/" + file_name + ".json"
		var data = load_json_file(path)
		if data:
			data_cache[file_name] = data
			print("Loaded data: ", file_name)
		else:
			push_error("Failed to load data: " + path)

func load_json_file(path: String):
	if not FileAccess.file_exists(path):
		return null
		
	var file = FileAccess.open(path, FileAccess.READ)
	var content = file.get_as_text()
	file.close()
	
	var json = JSON.new()
	var error = json.parse(content)
	if error == OK:
		return json.data
	else:
		push_error("JSON Parse Error: ", json.get_error_message(), " in ", path, " at line ", json.get_error_line())
		return null

func get_data(key: String):
	return data_cache.get(key)


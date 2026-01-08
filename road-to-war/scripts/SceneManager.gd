extends Node

# SceneManager.gd - Handles scene transitions and scene management
# Autoload singleton for managing scene flow

signal scene_changed(new_scene_name)

var current_scene_name: String = ""
var scene_history: Array[String] = []
var is_in_game: bool = false
var scene_data: Dictionary = {}

const MENU_SCENES_THAT_PAUSE_COMBAT: Array[String] = [
	"CharacterPanel",
	"TalentAllocation",
	"Statistics",
	"Achievements",
	"Options",
	"SaveLoad",
	"Prestige",
	"WorldMap"
]

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

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

func _ready():
	_log_info("SceneManager", "Scene manager initialized")
	if get_tree().current_scene:
		current_scene_name = get_tree().current_scene.scene_file_path.get_file().get_basename()
	else:
		current_scene_name = "Unknown"

func change_scene(scene_path: String, fade_duration: float = 0.3):
	"""
	Change to a new scene with optional fade transition
	scene_path: Path to scene file (e.g., "res://scenes/MainMenu.tscn")
	"""
	var scene_name = scene_path.get_file().get_basename()
	_log_info("SceneManager", "Changing scene to: " + scene_name)
	
	# If we leave the World scene during combat, we must pause CombatManager,
	# otherwise combat continues "in the background" with no visuals.
	var cm = get_node_or_null("/root/CombatManager")
	if cm and current_scene_name == "World" and cm.in_combat:
		if cm.has_method("set_combat_paused"):
			cm.set_combat_paused(true)
	
	# Store current scene in history
	if current_scene_name != "":
		scene_history.append(current_scene_name)
	
	# Change scene
	if fade_duration > 0:
		# Create fade overlay
		var fade_overlay = ColorRect.new()
		fade_overlay.color = Color.BLACK
		fade_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		get_tree().root.add_child(fade_overlay)
		fade_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
		
		# Fade out
		fade_overlay.modulate.a = 0.0
		var fade_out = get_tree().create_tween()
		fade_out.tween_property(fade_overlay, "modulate:a", 1.0, fade_duration)
		await fade_out.finished
		
		# Change scene
		_log_info("SceneManager", "PRE-CALL change_scene_to_file: " + scene_path)
		print("CRITICAL TRACE: About to call change_scene_to_file for " + scene_path)
		var err = get_tree().change_scene_to_file(scene_path)
		print("CRITICAL TRACE: change_scene_to_file returned: " + str(err))
		_log_info("SceneManager", "POST-CALL change_scene_to_file, err: " + str(err))
		if err != OK:
			_log_error("SceneManager", "Failed to change scene! Error code: " + str(err))
		else:
			_log_info("SceneManager", "Scene change call successful")
		current_scene_name = scene_name
		
		# Recreate overlay for fade in
		fade_overlay = ColorRect.new()
		fade_overlay.color = Color.BLACK
		fade_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		get_tree().root.add_child(fade_overlay)
		fade_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
		fade_overlay.modulate.a = 1.0
		
		# Fade in
		var fade_in = get_tree().create_tween()
		fade_in.tween_property(fade_overlay, "modulate:a", 0.0, fade_duration)
		await fade_in.finished
		fade_overlay.queue_free()
	else:
		get_tree().change_scene_to_file(scene_path)
		current_scene_name = scene_name
	
	# If we are entering World, resume combat (if it was paused).
	# If we are entering a menu scene, keep combat paused.
	cm = get_node_or_null("/root/CombatManager")
	if cm and cm.in_combat and cm.has_method("set_combat_paused"):
		if scene_name == "World":
			cm.set_combat_paused(false)
		elif MENU_SCENES_THAT_PAUSE_COMBAT.has(scene_name):
			cm.set_combat_paused(true)
	
	scene_changed.emit(scene_name)

func go_back():
	"""Return to previous scene in history"""
	if scene_history.size() > 0:
		var previous_scene = scene_history.pop_back()
		var scene_path = "res://scenes/" + previous_scene + ".tscn"
		change_scene(scene_path)
	else:
		_log_warn("SceneManager", "No scene history to go back to")

func get_current_scene_name() -> String:
	return current_scene_name

extends Control

# DevStatMonitor.gd - F8 toggle debug panel
# Migrated from src/utils/dev-stat-monitor.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var panel_visible: bool = false
var stats_panel: Panel = null
var stats_label: Label = null
var combat_simulator: Node = null

func _ready():
	_setup_panel()
	_log_info("DevStatMonitor", "Initialized (Press F8 to toggle)")

func _setup_panel():
	stats_panel = Panel.new()
	stats_panel.custom_minimum_size = Vector2(400, 300)
	stats_panel.position = Vector2(10, 10)
	stats_panel.visible = false
	add_child(stats_panel)
	
	stats_label = Label.new()
	stats_label.position = Vector2(10, 10)
	stats_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stats_panel.add_child(stats_label)

func _input(event):
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_F8:
			toggle_panel()

# Toggle debug panel visibility
func toggle_panel():
	panel_visible = not panel_visible
	if stats_panel:
		stats_panel.visible = panel_visible
	
	if panel_visible:
		_update_stats()

# Update stats display
func _update_stats():
	if not panel_visible or not stats_label:
		return
	
	var stats_text = "=== DEV STAT MONITOR ===\n\n"
	
	# Party stats
	var party_manager = get_node_or_null("/root/PartyManager")
	if party_manager and party_manager.has("heroes"):
		stats_text += "PARTY:\n"
		for hero in party_manager.heroes:
			stats_text += "  %s: Level %d, HP %d/%d\n" % [
				hero.get("id", "Unknown"),
				hero.get("level", 1),
				hero.get("current_stats", {}).get("health", 0),
				hero.get("current_stats", {}).get("maxHealth", 100)
			]
		stats_text += "\n"
	
	# Combat stats
	var combat_manager = get_node_or_null("/root/CombatManager")
	if combat_manager:
		stats_text += "COMBAT:\n"
		stats_text += "  In Combat: %s\n" % str(combat_manager.in_combat if combat_manager.has("in_combat") else false)
		stats_text += "  Round: %d\n" % combat_manager.combat_round if combat_manager.has("combat_round") else 0
		stats_text += "\n"
	
	# Performance stats
	stats_text += "PERFORMANCE:\n"
	stats_text += "  FPS: %d\n" % Engine.get_frames_per_second()
	stats_text += "  Memory: %.2f MB\n" % (OS.get_static_memory_usage() / 1024.0 / 1024.0)
	
	stats_label.text = stats_text

func _process(_delta):
	if panel_visible:
		_update_stats()


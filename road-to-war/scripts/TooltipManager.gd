extends Node

# TooltipManager.gd - Tooltip system
# Migrated from src/utils/tooltip-manager.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var current_tooltip: Control = null
var tooltip_scene = null

func _init():
	if ResourceLoader.exists("res://scenes/Tooltip.tscn"):
		tooltip_scene = load("res://scenes/Tooltip.tscn")

func _ready():
	_log_info("TooltipManager", "Initialized")

# Show tooltip for an item
func show_item_tooltip(item_data: Dictionary, position: Vector2):
	hide_tooltip()
	
	if tooltip_scene:
		current_tooltip = tooltip_scene.instantiate()
		get_tree().root.add_child(current_tooltip)
		current_tooltip.position = position
		
		# Set tooltip content
		if current_tooltip.has_method("set_item_data"):
			current_tooltip.set_item_data(item_data)
		else:
			# Fallback: set text directly
			var label = current_tooltip.get_node_or_null("Label")
			if label:
				label.text = item_data.get("name", "Unknown Item")

# Show tooltip for comparison
func show_comparison_tooltip(current_item: Dictionary, new_item: Dictionary, position: Vector2):
	hide_tooltip()
	
	if tooltip_scene:
		current_tooltip = tooltip_scene.instantiate()
		get_tree().root.add_child(current_tooltip)
		current_tooltip.position = position
		
		# Set comparison data
		if current_tooltip.has_method("set_comparison_data"):
			current_tooltip.set_comparison_data(current_item, new_item)

# Hide tooltip
func hide_tooltip():
	if current_tooltip:
		current_tooltip.queue_free()
		current_tooltip = null

# Show set bonus preview
func show_set_bonus_preview(set_name: String, pieces: int, total_pieces: int, position: Vector2):
	hide_tooltip()
	
	if tooltip_scene:
		current_tooltip = tooltip_scene.instantiate()
		get_tree().root.add_child(current_tooltip)
		current_tooltip.position = position
		
		# Set set bonus info
		if current_tooltip.has_method("set_set_bonus"):
			current_tooltip.set_set_bonus(set_name, pieces, total_pieces)


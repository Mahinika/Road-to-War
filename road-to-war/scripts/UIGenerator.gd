extends Node

# UIGenerator.gd - Procedural UI element generation
# Migrated from src/generators/ui-generator.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("UIGenerator", "Initialized")

# Generate a UI panel
func generate_panel(size: Vector2, style: String = "default") -> Panel:
	var panel = Panel.new()
	panel.custom_minimum_size = size
	
	# Apply style
	match style:
		"wow":
			_apply_wow_style(panel)
		_:
			_apply_default_style(panel)
	
	return panel

# Generate a UI button
func generate_button(text: String, size: Vector2, style: String = "default") -> Button:
	var button = Button.new()
	button.text = text
	button.custom_minimum_size = size
	
	# Apply style
	match style:
		"wow":
			_apply_wow_button_style(button)
		_:
			_apply_default_button_style(button)
	
	return button

func _apply_wow_style(panel: Panel):
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0.1, 0.1, 0.15)
	style_box.border_color = Color(0.85, 0.72, 0.0)
	style_box.border_width_left = 2
	style_box.border_width_right = 2
	style_box.border_width_top = 2
	style_box.border_width_bottom = 2
	panel.add_theme_stylebox_override("panel", style_box)

func _apply_default_style(panel: Panel):
	pass

func _apply_wow_button_style(button: Button):
	var style_box = StyleBoxFlat.new()
	style_box.bg_color = Color(0.2, 0.2, 0.25)
	style_box.border_color = Color(0.85, 0.72, 0.0)
	style_box.border_width_left = 1
	style_box.border_width_right = 1
	style_box.border_width_top = 1
	style_box.border_width_bottom = 1
	button.add_theme_stylebox_override("normal", style_box)

func _apply_default_button_style(button: Button):
	pass


extends Node

# UIConfigIntegration.gd - UI config integration system
# Migrated from src/utils/ui-config-integration.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var ui_config_utils: Node = null

func _ready():
	ui_config_utils = get_node_or_null("/root/UIConfigUtils")
	_log_info("UIConfigIntegration", "Initialized")

# Apply UI config to a control
func apply_ui_config(control: Control):
	if not control or not ui_config_utils:
		return
	
	# Apply scaling
	if control.has_method("set_custom_minimum_size"):
		var base_size = control.custom_minimum_size
		var scaled_size = ui_config_utils.get_scaled_size(base_size) if ui_config_utils.has_method("get_scaled_size") else base_size
		control.custom_minimum_size = scaled_size
	
	# Apply font size if it's a label
	if control is Label:
		var label = control as Label
		var font_size = ui_config_utils.get_scaled_font_size("medium") if ui_config_utils.has_method("get_scaled_font_size") else 14
		# Font size would be set via theme or direct property
		# label.add_theme_font_size_override("font_size", font_size)

# Apply UI config to all children recursively
func apply_ui_config_recursive(parent: Node):
	if parent is Control:
		apply_ui_config(parent as Control)
	
	for child in parent.get_children():
		apply_ui_config_recursive(child)


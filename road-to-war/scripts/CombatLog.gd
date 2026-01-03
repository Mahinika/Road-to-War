extends Control

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

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

# CombatLog.gd - Displays combat events

@onready var rich_text: RichTextLabel = $RichTextLabel

func _ready():
	if CombatManager.has_signal("damage_dealt"):
		CombatManager.damage_dealt.connect(_on_damage_dealt)
	
	# Add WoW-style background panel
	var panel = Panel.new()
	panel.name = "Background"
	panel.show_behind_parent = true
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(panel)
	
	# Move RichTextLabel to be a child of a margin container for better padding
	# but for now just style the panel
	panel.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(Color(0, 0, 0, 0.4), UITheme.COLORS["gold_border"], 1))
	
	_log_info("CombatLog", "Initialized")

func _on_damage_dealt(source, target, amount, is_crit):
	var color = "white"
	if source.begins_with("enemy"): color = "red"
	elif target.begins_with("enemy"): color = "yellow"
	
	var display_source = source
	var display_target = target
	
	# Try to find hero names if IDs are passed
	var s_hero = PartyManager.get_hero_by_id(source)
	if s_hero: display_source = s_hero.name
	
	var t_hero = PartyManager.get_hero_by_id(target)
	if t_hero: display_target = t_hero.name
	
	var text = "[color=%s]%s deals %d damage to %s[/color]" % [color, display_source, amount, display_target]
	if is_crit: text += " [b](CRIT!)[/b]"
	
	rich_text.append_text(text + "\n")
	# Scroll to bottom
	var v_scroll = rich_text.get_v_scroll_bar()
	if v_scroll:
		v_scroll.value = v_scroll.max_value


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

	# Style the existing panel from the scene (avoid double-panels)
	var ut = get_node_or_null("/root/UITheme")
	var panel = get_node_or_null("Panel")
	if ut and panel and panel is Panel:
		panel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(Color(0, 0, 0, 0.45), ut.COLORS["gold_border"], 1))
	
	if rich_text:
		rich_text.add_theme_color_override("default_color", Color(0.95, 0.95, 0.95))
		rich_text.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		rich_text.add_theme_constant_override("outline_size", 1)
		rich_text.add_theme_font_size_override("normal_font_size", 12)
	
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


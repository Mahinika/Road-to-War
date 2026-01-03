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

# Prestige.gd - Prestige system menu

@onready var prestige_label: Label = $MainPanel/StatsPanel/PrestigeLabel
@onready var upgrade_grid: GridContainer = $MainPanel/ScrollContainer/UpgradeGrid
@onready var prestige_button: Button = $MainPanel/PrestigeButton
@onready var back_button: Button = $MainPanel/BackButton

func _ready():
	_log_info("Prestige", "Scene initialized")
	
	var ut = get_node_or_null("/root/UITheme")
	if not ut: return
	
	# Apply WoW Style
	$MainPanel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame"], ut.COLORS["gold_border"], 2))
	$MainPanel/StatsPanel.add_theme_stylebox_override("panel", ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold_border"], 1))
	
	prestige_button.add_theme_stylebox_override("normal", ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold"], 2))
	back_button.add_theme_stylebox_override("normal", ut.get_stylebox_panel(ut.COLORS["frame"], ut.COLORS["gold_border"], 1))
	
	prestige_button.pressed.connect(_on_prestige_pressed)
	back_button.pressed.connect(_on_back_pressed)
	
	_populate_upgrades()
	_update_display()

func _populate_upgrades():
	for child in upgrade_grid.get_children():
		child.queue_free()
		
	var dm = get_node_or_null("/root/DataManager")
	var prem = get_node_or_null("/root/PrestigeManager")
	var ut = get_node_or_null("/root/UITheme")
	
	if not dm or not prem or not ut: return
	
	var config = dm.get_data("prestige-config")
	if not config: return
	
	var upgrades = config.get("upgrades", [])
	for up_data in upgrades:
		var btn = Button.new()
		btn.custom_minimum_size = Vector2(250, 100)
		btn.text = "%s\nCost: %d\n%s" % [up_data.get("name"), up_data.get("cost"), up_data.get("description")]
		btn.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		
		# Check if purchased
		var up_id = up_data.get("id")
		var is_purchased = prem.has_upgrade(up_id)
		
		if is_purchased:
			btn.add_theme_stylebox_override("normal", ut.get_stylebox_panel(ut.COLORS["frame"], Color.GREEN, 2))
			btn.disabled = true
		else:
			btn.add_theme_stylebox_override("normal", ut.get_stylebox_panel(ut.COLORS["frame_dark"], ut.COLORS["gold_border"], 1))
			btn.pressed.connect(func(): _on_upgrade_purchased(up_id))
			
		upgrade_grid.add_child(btn)

func _update_display():
	"""Update prestige display"""
	var prem = get_node_or_null("/root/PrestigeManager")
	if not prem: return
	
	var points = prem.get_prestige_points()
	var text = "Available Points: %d\n" % points
	text += "Prestige Level: %d\n" % prem.get_prestige_level()
	text += "Next Prestige: +%d Points" % _calculate_pending_points()
	prestige_label.text = text
	
	# Enable/disable prestige button based on availability
	prestige_button.disabled = !prem.can_prestige()

func _calculate_pending_points() -> int:
	# Simplified logic for now
	var pm = get_node_or_null("/root/PartyManager")
	if not pm: return 0
	var total_levels = 0
	for h in pm.heroes: total_levels += h.level
	return int(total_levels / 10.0)

func _on_upgrade_purchased(upgrade_id: String):
	var prem = get_node_or_null("/root/PrestigeManager")
	var am = get_node_or_null("/root/AudioManager")
	
	if prem and prem.purchase_upgrade(upgrade_id):
		_populate_upgrades()
		_update_display()
		if am: am.play_sfx("buy_item")

func _on_prestige_pressed():
	"""Handle prestige reset"""
	_log_info("Prestige", "Prestige reset requested")
	var prem = get_node_or_null("/root/PrestigeManager")
	var sm = get_node_or_null("/root/SceneManager")
	
	if prem and prem.can_prestige():
		prem.perform_prestige()
		_update_display()
		_populate_upgrades()
		# Return to main menu or restart game loop
		if sm: sm.change_scene("res://scenes/MainMenu.tscn")

func _on_back_pressed():
	var sm = get_node_or_null("/root/SceneManager")
	if sm: sm.change_scene("res://scenes/MainMenu.tscn")

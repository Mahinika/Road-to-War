extends Control

# Shop.gd - Visual representation of merchant encounters

@onready var items_grid: GridContainer = $VBoxContainer/ScrollContainer/ItemsGrid
@onready var gold_label: Label = $VBoxContainer/Header/GoldLabel
@onready var title_label: Label = $VBoxContainer/Header/Title
@onready var back_button: Button = $VBoxContainer/BackButton

func _ready():
	# Apply WoW Style
	$VBoxContainer.add_theme_constant_override("separation", 20)
	
	# Apply WoW styling to buttons
	var ui_theme = get_node_or_null("/root/UITheme")
	if ui_theme and back_button:
		var normal_sb = ui_theme.get_stylebox_panel(ui_theme.COLORS["frame_dark"], ui_theme.COLORS["gold_border"], 1)
		var hover_sb = ui_theme.get_stylebox_panel(Color(0.15, 0.15, 0.18, 0.95), ui_theme.COLORS["gold"], 1)
		var pressed_sb = ui_theme.get_stylebox_panel(Color(0.08, 0.08, 0.10, 0.95), ui_theme.COLORS["gold"], 2)
		
		back_button.add_theme_stylebox_override("normal", normal_sb)
		back_button.add_theme_stylebox_override("hover", hover_sb)
		back_button.add_theme_stylebox_override("pressed", pressed_sb)
		back_button.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		back_button.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		back_button.add_theme_constant_override("outline_size", 1)
	
	# Connect signals
	if back_button:
		back_button.pressed.connect(_on_back_pressed)
	
	var shop_mgr = get_node_or_null("/root/ShopManager")
	if shop_mgr:
		if not shop_mgr.item_purchased.is_connected(_on_item_purchased):
			shop_mgr.item_purchased.connect(_on_item_purchased)
		if not shop_mgr.shop_opened.is_connected(_on_shop_opened):
			shop_mgr.shop_opened.connect(_on_shop_opened)
		if not shop_mgr.shop_closed.is_connected(_on_shop_closed):
			shop_mgr.shop_closed.connect(_on_shop_closed)
	
	# Setup initial state
	refresh_shop()

func refresh_shop():
	# Clear existing
	for child in items_grid.get_children():
		if is_instance_valid(child):
			child.queue_free()
	
	var shop_mgr = get_node_or_null("/root/ShopManager")
	if not shop_mgr:
		return
	
	# Update gold display
	if gold_label:
		gold_label.text = "Your Gold: %d" % shop_mgr.get_player_gold()
	
	# Update shop title based on shop type
	if title_label:
		var shop_type = shop_mgr.current_shop_type
		if shop_type == "general_store":
			title_label.text = "TRAVELING MERCHANT"
		elif shop_type == "armor_smith":
			title_label.text = "ARMORSMITH"
		elif shop_type == "weapon_smith":
			title_label.text = "WEAPONSMITH"
		else:
			title_label.text = shop_type.to_upper().replace("_", " ")
	
	# Populate items from ShopManager
	for item in shop_mgr.shop_inventory:
		_create_shop_item(item)

func _create_shop_item(item: Dictionary):
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(250, 80)
	
	# Apply WoW styling to item panel
	var ui_theme = get_node_or_null("/root/UITheme")
	if ui_theme:
		panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(ui_theme.COLORS["frame"], ui_theme.COLORS["gold_border"], 1))
	else:
		# Fallback styling if UITheme not available
		var sb = StyleBoxFlat.new()
		sb.bg_color = Color(0.1, 0.12, 0.18, 0.95)
		sb.border_color = Color(0.79, 0.67, 0.44)
		sb.border_width_left = 1
		sb.border_width_top = 1
		sb.border_width_right = 1
		sb.border_width_bottom = 1
		panel.add_theme_stylebox_override("panel", sb)
	
	var hbox = HBoxContainer.new()
	hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 10)
	panel.add_child(hbox)
	
	# Item Icon (if available)
	var item_id = item.get("id", "")
	var icon_path = "res://assets/sprites/equipment/%s.png" % item_id
	var icon_tex: Texture2D = null
	if ResourceLoader.exists(icon_path):
		icon_tex = load(icon_path)
	elif item.has("texture") and ResourceLoader.exists(item["texture"]):
		icon_tex = load(item["texture"])
	
	if icon_tex:
		var icon_rect = TextureRect.new()
		icon_rect.texture = icon_tex
		icon_rect.custom_minimum_size = Vector2(48, 48)
		icon_rect.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		hbox.add_child(icon_rect)
	
	# Item Info
	var v_info = VBoxContainer.new()
	v_info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(v_info)
	
	var name_label = Label.new()
	name_label.text = item.get("name", "Unknown Item")
	name_label.add_theme_font_size_override("font_size", 14)
	v_info.add_child(name_label)
	
	var price = item.get("buyPrice", item.get("sellValue", 0) * 2)
	var price_label = Label.new()
	price_label.text = "%d Gold" % price
	price_label.add_theme_color_override("font_color", Color.GOLD)
	v_info.add_child(price_label)
	
	# Buy Button
	var buy_btn = Button.new()
	buy_btn.text = "BUY"
	buy_btn.custom_minimum_size = Vector2(60, 40)
	buy_btn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	buy_btn.pressed.connect(_on_buy_pressed.bind(item.get("id")))
	
	# Apply WoW styling to buy button (reuse ui_theme from line 79)
	if ui_theme:
		var normal_sb = ui_theme.get_stylebox_panel(ui_theme.COLORS["frame_dark"], ui_theme.COLORS["gold_border"], 1)
		var hover_sb = ui_theme.get_stylebox_panel(Color(0.15, 0.15, 0.18, 0.95), ui_theme.COLORS["gold"], 1)
		var pressed_sb = ui_theme.get_stylebox_panel(Color(0.08, 0.08, 0.10, 0.95), ui_theme.COLORS["gold"], 2)
		
		buy_btn.add_theme_stylebox_override("normal", normal_sb)
		buy_btn.add_theme_stylebox_override("hover", hover_sb)
		buy_btn.add_theme_stylebox_override("pressed", pressed_sb)
		buy_btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		buy_btn.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		buy_btn.add_theme_constant_override("outline_size", 1)
	
	hbox.add_child(buy_btn)
	
	items_grid.add_child(panel)

func _on_buy_pressed(item_id: String):
	var shop_mgr = get_node_or_null("/root/ShopManager")
	if shop_mgr and shop_mgr.purchase_item(item_id):
		refresh_shop()

func _on_item_purchased(_item, _cost):
	refresh_shop()

func _on_shop_opened(_shop_type, _items):
	refresh_shop()

func _on_back_pressed():
	# Close shop via ShopManager (this emits shop_closed signal)
	var shop_mgr = get_node_or_null("/root/ShopManager")
	if shop_mgr and shop_mgr.has_method("close_shop"):
		shop_mgr.close_shop()
	else:
		# Fallback if ShopManager not available
		_close_shop_ui()

func _on_shop_closed():
	# Handle shop_closed signal from ShopManager
	_close_shop_ui()

func _close_shop_ui():
	# Unpause game
	get_tree().paused = false
	
	# Remove shop overlay from scene
	queue_free()

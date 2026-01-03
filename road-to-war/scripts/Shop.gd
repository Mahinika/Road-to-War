extends Control

# Shop.gd - Visual representation of merchant encounters

@onready var items_grid: GridContainer = $VBoxContainer/ScrollContainer/ItemsGrid
@onready var gold_label: Label = $VBoxContainer/Header/GoldLabel
@onready var back_button: Button = $VBoxContainer/BackButton

func _ready():
	# Apply WoW Style
	$VBoxContainer.add_theme_constant_override("separation", 20)
	
	# Connect signals
	back_button.pressed.connect(_on_back_pressed)
	ShopManager.item_purchased.connect(_on_item_purchased)
	
	# Setup initial state
	refresh_shop()

func refresh_shop():
	# Clear existing
	for child in items_grid.get_children():
		child.queue_free()
	
	gold_label.text = "Your Gold: %d" % ShopManager.get_player_gold()
	
	# Populate items from ShopManager
	for item in ShopManager.shop_inventory:
		_create_shop_item(item)

func _create_shop_item(item: Dictionary):
	var panel = Panel.new()
	panel.custom_minimum_size = Vector2(250, 80)
	panel.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(UITheme.COLORS["frame"], UITheme.COLORS["gold_border"], 1))
	
	var hbox = HBoxContainer.new()
	hbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	hbox.add_theme_constant_override("separation", 10)
	panel.add_child(hbox)
	
	# Item Info
	var v_info = VBoxContainer.new()
	v_info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(v_info)
	
	var name_label = Label.new()
	name_label.text = item.get("name", "Unknown Item")
	name_label.theme_override_font_sizes/font_size = 14
	v_info.add_child(name_label)
	
	var price = item.get("buyPrice", item.get("sellValue", 0) * 2)
	var price_label = Label.new()
	price_label.text = "%d Gold" % price
	price_label.theme_override_colors/font_color = Color.GOLD
	v_info.add_child(price_label)
	
	# Buy Button
	var buy_btn = Button.new()
	buy_btn.text = "BUY"
	buy_btn.custom_minimum_size = Vector2(60, 40)
	buy_btn.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	buy_btn.pressed.connect(_on_buy_pressed.bind(item.get("id")))
	hbox.add_child(buy_btn)
	
	items_grid.add_child(panel)

func _on_buy_pressed(item_id: String):
	if ShopManager.purchase_item(item_id):
		refresh_shop()

func _on_item_purchased(_item, _cost):
	refresh_shop()

func _on_back_pressed():
	ShopManager.close_shop()
	SceneManager.change_scene("res://scenes/World.tscn")


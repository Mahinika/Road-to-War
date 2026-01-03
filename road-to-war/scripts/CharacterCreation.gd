extends Control

# CharacterCreation.gd - Character/party creation scene
# Allows player to select class and specialization for each of 5 party roles

# Logging helpers
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

# UI Nodes
@onready var tank_panel: VBoxContainer = $RolePanels/TankPanel
@onready var healer_panel: VBoxContainer = $RolePanels/HealerPanel
@onready var dps1_panel: VBoxContainer = $RolePanels/DPS1Panel
@onready var dps2_panel: VBoxContainer = $RolePanels/DPS2Panel
@onready var dps3_panel: VBoxContainer = $RolePanels/DPS3Panel
@onready var back_button: Button = $ButtonContainer/BackButton
@onready var auto_generate_button: Button = $ButtonContainer/AutoGenerateButton
@onready var confirm_button: Button = $ButtonContainer/ConfirmButton

# Data variables
var classes_data: Dictionary = {}
var specializations_data: Dictionary = {}
var selected_classes: Dictionary = {}
var selected_specs: Dictionary = {}
var role_panels: Dictionary = {}
var class_buttons: Dictionary = {}  # role_id -> Array of buttons
var spec_buttons: Dictionary = {}    # role_id -> Array of buttons

# Role to eligible classes mapping
var role_class_map = {
	"tank": ["paladin", "warrior", "druid"],
	"healer": ["priest", "paladin", "shaman", "druid"],
	"dps": ["rogue", "mage", "warlock", "hunter", "warrior", "paladin", "shaman"]
}

func _ready():
	print("[CharacterCreation] _ready() started")
	_log_info("CharacterCreation", "Character creation scene initialized")
	
	# Initialize role panels mapping
	print("[CharacterCreation] Mapping role panels...")
	role_panels = {
		"tank": tank_panel,
		"healer": healer_panel,
		"dps1": dps1_panel,
		"dps2": dps2_panel,
		"dps3": dps3_panel
	}
	
	# Connect buttons
	print("[CharacterCreation] Connecting buttons...")
	if back_button: back_button.pressed.connect(_on_back_pressed)
	if auto_generate_button: auto_generate_button.pressed.connect(_on_auto_generate_pressed)
	if confirm_button: confirm_button.pressed.connect(_on_confirm_pressed)
	
	# Load data and create UI
	print("[CharacterCreation] Loading data and creating UI...")
	load_data_and_create_ui()
	print("[CharacterCreation] _ready() finished")

func load_data_and_create_ui():
	# Load class/spec data and create role selection panels
	print("[CharacterCreation] Fetching classes data...")
	classes_data = DataManager.get_data("classes")
	print("[CharacterCreation] Fetching specs data...")
	specializations_data = DataManager.get_data("specializations")
	
	if not classes_data or not specializations_data:
		_log_error("CharacterCreation", "Failed to load classes or specializations data")
		return
	
	# Create panels for each role
	print("[CharacterCreation] Creating role panels...")
	create_role_panel("tank", "Tank")
	create_role_panel("healer", "Healer")
	create_role_panel("dps1", "DPS #1")
	create_role_panel("dps2", "DPS #2")
	create_role_panel("dps3", "DPS #3")
	print("[CharacterCreation] All role panels created")

func create_role_panel(role_id: String, role_name: String):
	# Create a role selection panel with class and spec buttons
	print("[CharacterCreation] Creating panel for role: ", role_id)
	var panel = role_panels[role_id]
	if not panel:
		_log_error("CharacterCreation", "Panel not found for role: " + role_id)
		return
	
	# Clear existing children
	for child in panel.get_children():
		child.queue_free()
	
	# WoW Style Panel Background
	var container = PanelContainer.new()
	container.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(UITheme.COLORS["frame"], UITheme.COLORS["gold_border"]))
	panel.add_child(container)
	
	var v_box = VBoxContainer.new()
	v_box.add_theme_constant_override("separation", 10)
	container.add_child(v_box)
	
	# Role name label
	var role_label = Label.new()
	role_label.text = role_name.to_upper()
	role_label.add_theme_font_size_override("font_size", 20)
	role_label.add_theme_color_override("font_color", UITheme.COLORS["gold"])
	role_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v_box.add_child(role_label)
	
	# Get eligible classes for this role
	var base_role = role_id.replace("1", "").replace("2", "").replace("3", "")
	var eligible_classes = role_class_map.get(base_role, [])
	
	# Filter to only classes that exist in data
	var valid_classes = []
	for class_id in eligible_classes:
		if classes_data.has(class_id):
			valid_classes.append(class_id)
	
	# Class selection label
	var class_label = Label.new()
	class_label.text = "CLASS"
	class_label.add_theme_font_size_override("font_size", 14)
	class_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v_box.add_child(class_label)
	
	# Create class buttons
	class_buttons[role_id] = []
	for current_class_id in valid_classes:
		var class_data = classes_data[current_class_id]
		var fallback_name = current_class_id.capitalize()
		var final_display_name: String = ""
		if class_data.has("name"):
			final_display_name = class_data["name"]
		else:
			final_display_name = fallback_name
		
		var class_button = Button.new()
		class_button.text = final_display_name
		class_button.custom_minimum_size = Vector2(0, 35)
		
		# WoW Style Buttons
		class_button.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(UITheme.COLORS["frame_dark"], UITheme.COLORS["gold_border"], 1))
		
		class_button.pressed.connect(_on_class_selected.bind(role_id, current_class_id))
		v_box.add_child(class_button)
		class_buttons[role_id].append(class_button)
	
	# Spec selection label (initially hidden until class selected)
	var spec_label = Label.new()
	spec_label.name = "SpecLabel"
	spec_label.text = "SPECIALIZATION"
	spec_label.add_theme_font_size_override("font_size", 14)
	spec_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	spec_label.visible = false
	v_box.add_child(spec_label)
	
	# Spec container (will be populated when class is selected)
	var spec_container = VBoxContainer.new()
	spec_container.name = "SpecContainer"
	spec_container.visible = false
	v_box.add_child(spec_container)
	print("[CharacterCreation] Panel created for: ", role_id)

func _on_class_selected(role_id: String, class_id: String):
	# Handle class selection for a role
	_log_info("CharacterCreation", "Selected class %s for role %s" % [class_id, role_id])
	
	selected_classes[role_id] = class_id
	selected_specs[role_id] = null  # Reset spec selection
	
	# Update class button visuals
	_update_class_buttons(role_id, class_id)
	
	# Show and populate spec selection
	_show_spec_selection(role_id, class_id)

func _update_class_buttons(role_id: String, selected_class_id: String):
	# Update visual state of class buttons
	if not class_buttons.has(role_id):
		return
	
	for button in class_buttons[role_id]:
		var button_text_lower = button.text.to_lower()
		var is_selected = selected_class_id in button_text_lower or button_text_lower == selected_class_id.to_lower()
		
		var border_color = UITheme.COLORS["gold"] if is_selected else UITheme.COLORS["gold_border"]
		var bg_color = Color(0.3, 0.3, 0.1) if is_selected else UITheme.COLORS["frame_dark"]
		var border_width = 3 if is_selected else 1
		
		button.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(bg_color, border_color, border_width))

func _show_spec_selection(role_id: String, class_id: String):
	# Show specialization selection for selected class
	var panel = role_panels[role_id]
	if not panel:
		return
	
	# Find spec label and container (nested in our new PanelContainer)
	var v_box = panel.get_child(0).get_child(0)
	var spec_label = v_box.get_node_or_null("SpecLabel")
	var spec_container = v_box.get_node_or_null("SpecContainer")
	
	if not spec_label or not spec_container:
		return
	
	# Clear existing spec buttons
	for child in spec_container.get_children():
		child.queue_free()
	
	# Show spec selection
	spec_label.visible = true
	spec_container.visible = true
	
	# Get available specs for this class
	var class_data = classes_data[class_id]
	var available_specs = class_data.get("availableSpecs", [])
	
	# Create spec buttons
	spec_buttons[role_id] = []
	for spec_id in available_specs:
		var spec_key = "%s_%s" % [class_id, spec_id]
		var spec_data = specializations_data.get(spec_key, {})
		if spec_data.is_empty():
			continue
		
		var default_spec_name = spec_id.capitalize()
		var spec_name: String = ""
		if spec_data.has("name"):
			spec_name = spec_data["name"]
		else:
			spec_name = default_spec_name
		var spec_button = Button.new()
		spec_button.text = spec_name
		spec_button.custom_minimum_size = Vector2(0, 30)
		
		# WoW Style Buttons
		spec_button.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(UITheme.COLORS["frame_dark"], UITheme.COLORS["gold_border"], 1))
		
		spec_button.pressed.connect(_on_spec_selected.bind(role_id, spec_id))
		spec_container.add_child(spec_button)
		spec_buttons[role_id].append(spec_button)

func _on_spec_selected(role_id: String, spec_id: String):
	# Handle specialization selection for a role
	_log_info("CharacterCreation", "Selected spec %s for role %s" % [spec_id, role_id])
	
	selected_specs[role_id] = spec_id
	
	# Update spec button visuals
	if spec_buttons.has(role_id):
		for button in spec_buttons[role_id]:
			var button_text_lower = button.text.to_lower()
			var is_selected = spec_id in button_text_lower or button_text_lower == spec_id.to_lower()
			
			var border_color = UITheme.COLORS["gold"] if is_selected else UITheme.COLORS["gold_border"]
			var bg_color = Color(0.3, 0.3, 0.1) if is_selected else UITheme.COLORS["frame_dark"]
			var border_width = 3 if is_selected else 1
			
			button.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(bg_color, border_color, border_width))

func _on_auto_generate_pressed():
	# Auto-generate a balanced party composition
	_log_info("CharacterCreation", "Auto-generating party...")
	
	if not classes_data or not specializations_data:
		classes_data = DataManager.get_data("classes")
		specializations_data = DataManager.get_data("specializations")
	
	if not classes_data or not specializations_data:
		_log_error("CharacterCreation", "Cannot auto-generate: missing data")
		return
	
	# Auto-select for each role
	var roles = ["tank", "healer", "dps1", "dps2", "dps3"]
	for role_id in roles:
		var base_role = role_id.replace("1", "").replace("2", "").replace("3", "")
		var eligible_classes = role_class_map.get(base_role, [])
		
		# Pick random class
		if eligible_classes.size() > 0:
			var random_class = eligible_classes[randi() % eligible_classes.size()]
			if classes_data.has(random_class):
				selected_classes[role_id] = random_class
				
				# Pick random spec for this class
				var class_data = classes_data[random_class]
				var available_specs = class_data.get("availableSpecs", [])
				if available_specs.size() > 0:
					var random_spec = available_specs[randi() % available_specs.size()]
					selected_specs[role_id] = random_spec
					
					# Update UI
					_on_class_selected(role_id, random_class)
					_on_spec_selected(role_id, random_spec)
	
	_log_info("CharacterCreation", "Auto-generation complete")

func _on_confirm_pressed():
	# Confirm party composition and start game
	# Validate all selections
	if not _validate_selections():
		_log_warn("CharacterCreation", "Party composition incomplete")
		return
	
	# Create party
	_create_party()
	
	# Ensure statistics and achievements are reset for a new game
	if has_node("/root/StatisticsManager"):
		StatisticsManager.load_save_data({
			"combat": {"combatsWon": 0, "enemiesDefeated": 0, "totalDamageDealt": 0, "totalDamageTaken": 0},
			"collection": {"goldEarned": 0, "goldSpent": 0, "itemsFound": 0},
			"progression": {"currentLevel": 1, "levelsGained": 0}
		})
	
	if has_node("/root/ShopManager"):
		ShopManager.player_gold = 100 # Starting gold
	
	# Transition to game scene
	_log_info("CharacterCreation", "Transitioning to World scene...")
	SceneManager.change_scene("res://scenes/World.tscn")

func _validate_selections() -> bool:
	# Validate that all roles have class and spec selected
	var roles = ["tank", "healer", "dps1", "dps2", "dps3"]
	
	for role_id in roles:
		if not selected_classes.has(role_id) or not selected_specs.has(role_id):
			return false
		var class_val = selected_classes[role_id]
		var spec_val = selected_specs[role_id]
		if not class_val or class_val == "" or not spec_val or spec_val == "":
			return false
	
	return true

func _create_party():
	# Create heroes and add them to PartyManager
	_log_info("CharacterCreation", "Creating party...")
	
	# Clear existing party
	PartyManager.heroes.clear()
	
	# Create heroes for each role
	var roles = ["tank", "healer", "dps1", "dps2", "dps3"]
	var role_names = {
		"tank": "Tank",
		"healer": "Healer",
		"dps1": "DPS #1",
		"dps2": "DPS #2",
		"dps3": "DPS #3"
	}
	
	for i in range(roles.size()):
		var role_id = roles[i]
		var class_id = selected_classes[role_id]
		var spec_id = selected_specs[role_id]
		
		# Create hero
		var hero = Hero.new()
		hero.id = "hero_%d" % i
		hero.name = role_names[role_id]
		hero.role = role_id.replace("1", "").replace("2", "").replace("3", "")
		hero.class_id = class_id
		hero.spec_id = spec_id
		hero.level = 1
		
		# Initialize base stats (will be calculated by StatCalculator)
		hero.base_stats = {
			"stamina": 10,
			"strength": 10,
			"intellect": 10,
			"agility": 10,
			"spirit": 10,
			"maxHealth": 100,
			"attack": 10,
			"defense": 5
		}
		
		# Add to party
		_log_debug("CharacterCreation", "About to add hero %s to PartyManager" % hero.id)
		PartyManager.add_hero(hero)
		
		# Calculate stats
		_log_debug("CharacterCreation", "About to recalculate stats for hero %s" % hero.id)
		StatCalculator.recalculate_hero_stats(hero)
		
		_log_info("CharacterCreation", "Created hero: %s (%s %s)" % [hero.name, class_id, spec_id])
	
	_log_info("CharacterCreation", "Party created with %d heroes" % PartyManager.heroes.size())

func _on_back_pressed():
	# Return to main menu
	_log_info("CharacterCreation", "Back to main menu")
	SceneManager.change_scene("res://scenes/MainMenu.tscn", 0.3)

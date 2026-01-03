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

# TalentAllocation.gd - Talent allocation scene for heroes
# Allows players to allocate talent points per hero

var current_hero: Hero = null
var return_scene: String = "res://scenes/World.tscn"
var talent_trees: Dictionary = {}
var talent_nodes: Dictionary = {}  # talent_id -> Button node

@onready var hero_info_label: Label = $VBoxContainer/HeroInfoLabel
@onready var points_label: Label = $VBoxContainer/PointsLabel
@onready var trees_container: HBoxContainer = $VBoxContainer/TreesContainer
@onready var back_button: Button = $VBoxContainer/BackButton
@onready var hero_select_container: HBoxContainer = $VBoxContainer/HeroSelectContainer

func _ready():
	_log_info("TalentAllocation", "Scene initialized")
	
	# Connect back button
	back_button.pressed.connect(_on_back_pressed)
	
	# Initialize with first hero if none provided
	if not current_hero and PartyManager.heroes.size() > 0:
		current_hero = PartyManager.heroes[0]
	
	# Create hero selection buttons
	_create_hero_selection()
	
	# Load talent trees for current hero
	if current_hero:
		_load_talent_trees()
		_update_display()

func _create_hero_selection():
	"""Create buttons to select which hero to allocate talents for"""
	# Clear existing buttons
	for child in hero_select_container.get_children():
		child.queue_free()
	
	# Create button for each hero
	for i in range(PartyManager.heroes.size()):
		var hero = PartyManager.heroes[i]
		var button = Button.new()
		button.text = hero.name
		button.custom_minimum_size = Vector2(120, 40)
		
		# WoW Style tabs
		var class_color = UITheme.COLORS.get(hero.role, UITheme.COLORS["gold_border"])
		var bg_color = Color(0.2, 0.2, 0.2) if hero == current_hero else Color(0.1, 0.1, 0.1)
		var border_width = 3 if hero == current_hero else 1
		button.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(bg_color, class_color, border_width))
		button.add_theme_stylebox_override("hover", UITheme.get_stylebox_panel(bg_color.lightened(0.1), class_color, border_width))
		button.add_theme_stylebox_override("pressed", UITheme.get_stylebox_panel(bg_color.darkened(0.1), class_color, border_width))
		
		button.pressed.connect(_on_hero_selected.bind(i))
		hero_select_container.add_child(button)

func _on_hero_selected(hero_index: int):
	"""Handle hero selection"""
	if hero_index >= 0 and hero_index < PartyManager.heroes.size():
		current_hero = PartyManager.heroes[hero_index]
		_load_talent_trees()
		_update_display()
		_create_hero_selection()  # Refresh to update highlights

func _load_talent_trees():
	"""Load talent tree data for current hero"""
	if not current_hero:
		return
	
	talent_trees.clear()
	var talents_data = DataManager.get_data("talents")
	if not talents_data:
		_log_error("TalentAllocation", "No talents data found")
		return
	
	var class_id = current_hero.class_id
	if not talents_data.has(class_id):
		_log_error("TalentAllocation", "No talent data for class: %s" % class_id)
		return
	
	var class_trees = talents_data[class_id].get("trees", {})
	talent_trees = class_trees

func _update_display():
	"""Update hero info and points display"""
	if not current_hero:
		return
	
	# Update hero info
	var class_id = current_hero.class_id
	var spec_id = current_hero.spec_id
	hero_info_label.text = "%s - %s (Level %d)" % [class_id.capitalize(), spec_id.capitalize() if spec_id else "", current_hero.level]
	
	# Update available points
	var available = TalentManager.get_available_points(current_hero)
	points_label.text = "Available Points: %d" % available
	
	# Create talent tree panels
	_create_talent_trees()

func _create_talent_trees():
	"""Create UI panels for each talent tree"""
	# Clear existing trees
	for child in trees_container.get_children():
		child.queue_free()
	
	talent_nodes.clear()
	
	if talent_trees.is_empty():
		_log_warn("TalentAllocation", "No talent trees to display")
		return
	
	# Create a panel for each tree (max 3)
	var tree_count = min(talent_trees.size(), 3)
	var tree_ids = talent_trees.keys()
	
	for i in range(tree_count):
		var tree_id = tree_ids[i]
		var tree_data = talent_trees[tree_id]
		_create_talent_tree_panel(tree_id, tree_data)

func _create_talent_tree_panel(tree_id: String, tree_data: Dictionary):
	"""Create a single talent tree panel"""
	var outer_panel = PanelContainer.new()
	outer_panel.custom_minimum_size = Vector2(320, 550)
	outer_panel.add_theme_stylebox_override("panel", UITheme.get_stylebox_panel(UITheme.COLORS["frame"], UITheme.COLORS["gold_border"], 2))
	
	var panel = VBoxContainer.new()
	outer_panel.add_child(panel)
	
	# Tree name with WoW styling
	var tree_label = Label.new()
	tree_label.text = tree_id.replace("_", " ").to_upper()
	tree_label.add_theme_font_size_override("font_size", 22)
	tree_label.add_theme_color_override("font_color", UITheme.COLORS["gold"])
	tree_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	panel.add_child(tree_label)
	
	# Total points in tree label
	var hero_talents = TalentManager.get_hero_talents(current_hero.id)
	var tree_points = 0
	for t_id in hero_talents.get(tree_id, {}):
		tree_points += hero_talents[tree_id][t_id]
	
	var points_in_tree_label = Label.new()
	points_in_tree_label.text = "(%d Points)" % tree_points
	points_in_tree_label.add_theme_font_size_override("font_size", 14)
	points_in_tree_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	panel.add_child(points_in_tree_label)
	
	# Spacer
	var spacer = Control.new()
	spacer.custom_minimum_size = Vector2(0, 10)
	panel.add_child(spacer)
	
	# Center the grid
	var center = CenterContainer.new()
	panel.add_child(center)
	
	# Talent grid container
	var grid = GridContainer.new()
	grid.columns = 3  # Max 3 columns
	grid.add_theme_constant_override("h_separation", 15)
	grid.add_theme_constant_override("v_separation", 15)
	center.add_child(grid)
	
	# Get talents and sort by row/column
	var talents = []
	for talent_id in tree_data.get("talents", {}):
		var talent_info = tree_data["talents"][talent_id]
		talents.append({
			"id": talent_id,
			"row": talent_info.get("row", 1),
			"column": talent_info.get("column", 1),
			"data": talent_info
		})
	
	# Sort by row, then column
	talents.sort_custom(func(a, b): 
		if a.row != b.row:
			return a.row < b.row
		return a.column < b.column
	)
	
	# Create talent buttons
	for talent in talents:
		var talent_button = _create_talent_button(talent.id, talent.data, tree_id)
		grid.add_child(talent_button)
		talent_nodes[talent.id] = talent_button
	
	trees_container.add_child(outer_panel)

func _create_talent_button(talent_id: String, talent_data: Dictionary, tree_id: String) -> Button:
	"""Create a button for a talent node"""
	var button = Button.new()
	button.custom_minimum_size = Vector2(84, 84)
	
	# Get current points
	var hero_talents = TalentManager.get_hero_talents(current_hero.id)
	var current_points = 0
	if hero_talents.has(tree_id) and hero_talents[tree_id].has(talent_id):
		current_points = hero_talents[tree_id][talent_id]
	
	var max_points = talent_data.get("maxPoints", 1)
	var talent_name = talent_data.get("name", talent_id.capitalize())
	
	# Check availability
	var is_available = true
	var prereq = talent_data.get("prerequisite")
	if prereq:
		# Check tree points
		if prereq.has("treePointsRequired"):
			var total_tree_points = 0
			for t_id in hero_talents[tree_id]:
				total_tree_points += hero_talents[tree_id][t_id]
			if total_tree_points < prereq["treePointsRequired"]:
				is_available = false
		
		# Check specific talent
		if is_available and prereq.has("talentId") and prereq.has("pointsRequired"):
			var req_id = prereq["talentId"]
			var req_points = prereq["pointsRequired"]
			if hero_talents[tree_id].get(req_id, 0) < req_points:
				is_available = false
	
	# WoW Style Styling
	var border_color = UITheme.COLORS["gold_border"]
	var bg_color = UITheme.COLORS["frame_dark"]
	
	if current_points >= max_points:
		border_color = UITheme.COLORS["gold"]
		bg_color = Color(0.3, 0.3, 0.1) # Maxed out glow
	elif current_points > 0:
		border_color = Color.GREEN
		bg_color = Color(0.1, 0.2, 0.1)
	elif not is_available:
		border_color = Color(0.3, 0.3, 0.3)
		bg_color = Color(0.05, 0.05, 0.05)
		button.disabled = true
	
	button.add_theme_stylebox_override("normal", UITheme.get_stylebox_panel(bg_color, border_color, 2))
	button.add_theme_stylebox_override("disabled", UITheme.get_stylebox_panel(bg_color, border_color, 1))
	button.add_theme_stylebox_override("hover", UITheme.get_stylebox_panel(bg_color.lightened(0.1), border_color.lightened(0.2), 3))
	
	# Set button text with BBCode-like colors via modulate or themes if needed
	# For simplicity, using text and color overrides
	button.text = "%s\n%d/%d" % [talent_name, current_points, max_points]
	
	if not is_available:
		button.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
	elif current_points >= max_points:
		button.add_theme_color_override("font_color", UITheme.COLORS["gold"])
	
	# Tooltip
	var tooltip = "[color=gold]%s[/color]\nRank %d/%d\n\n" % [talent_name, current_points, max_points]
	var effects = talent_data.get("effects", {})
	if not effects.is_empty():
		tooltip += "Effects:\n"
		for effect in effects:
			tooltip += "- %s: +%s\n" % [effect.capitalize(), str(effects[effect])]
	
	if prereq:
		tooltip += "\n[color=red]Prerequisites:[/color]\n"
		if prereq.has("treePointsRequired"):
			tooltip += "- %d points in this tree\n" % prereq["treePointsRequired"]
		if prereq.has("talentId"):
			tooltip += "- Rank %d in %s\n" % [prereq["pointsRequired"], prereq["talentId"].capitalize()]
			
	button.tooltip_text = tooltip
	
	# Connect click handler
	button.pressed.connect(_on_talent_clicked.bind(talent_id, tree_id))
	
	return button

func _on_talent_clicked(talent_id: String, tree_id: String):
	"""Handle talent button click"""
	if not current_hero:
		return
	
	# Try to allocate point
	var success = TalentManager.allocate_talent_point(current_hero.id, tree_id, talent_id)
	
	if success:
		_log_info("TalentAllocation", "Allocated talent %s for hero %s" % [talent_id, current_hero.id])
		_update_display()  # Refresh display
	else:
		_log_warn("TalentAllocation", "Failed to allocate talent point")

func _on_back_pressed():
	"""Return to previous scene"""
	_log_info("TalentAllocation", "Returning to: %s" % return_scene)
	SceneManager.change_scene(return_scene)

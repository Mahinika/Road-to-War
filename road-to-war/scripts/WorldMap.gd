extends Control

# WorldMap.gd - Visual representation of the 100-mile road progress
# Enhanced with milestone markers, biome visualization, and WoW styling

@onready var road_line: Line2D = $MapPanel/RoadLine
@onready var player_marker: Sprite2D = $MapPanel/PlayerMarker
@onready var mile_label: Label = $MapPanel/MileLabel
@onready var biome_label: Label = $MapPanel/BiomeLabel
@onready var milestone_container: Node2D = $MapPanel/MilestoneContainer
@onready var biome_segments: Node2D = $MapPanel/BiomeSegments
@onready var legend_panel: Panel = $MapPanel/LegendPanel

var ui_theme: Node = null
var milestone_markers: Array = []
var biome_colors: Dictionary = {}

func _ready():
	ui_theme = get_node_or_null("/root/UITheme")
	
	# Define biome colors (WoW-style)
	_setup_biome_colors()
	
	# Apply WoW styling
	_apply_wow_styling()
	
	# Setup map elements
	_setup_milestone_markers()
	_setup_biome_segments()
	_setup_legend()
	
	_update_map()
	
	# Update periodically or on distance changed
	var wm = get_node_or_null("/root/WorldManager")
	if wm:
		if not wm.mile_changed.is_connected(_on_mile_changed_map):
			wm.mile_changed.connect(_on_mile_changed_map)

func _setup_biome_colors():
	"""Setup biome color palette (WoW-style)"""
	biome_colors = {
		"plains": Color(0.7, 0.9, 0.6),      # Light green
		"forest": Color(0.3, 0.7, 0.3),      # Dark green
		"mountains": Color(0.6, 0.6, 0.5),   # Gray-brown
		"desert": Color(0.9, 0.8, 0.5),      # Sandy yellow
		"undead": Color(0.5, 0.3, 0.4),      # Dark purple-red
		"arcane": Color(0.6, 0.4, 0.9)       # Purple
	}

func _apply_wow_styling():
	"""Apply WoW WotLK styling to World Map UI"""
	if not ui_theme: return
	
	var map_panel = get_node_or_null("MapPanel")
	if map_panel:
		map_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
			ui_theme.COLORS["frame_dark"],
			ui_theme.COLORS["gold_border"],
			2
		))
	
	# Style title
	var title = get_node_or_null("MapPanel/Title")
	if title:
		title.add_theme_color_override("font_color", Color.GOLD)
		title.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		title.add_theme_constant_override("outline_size", 2)
	
	# Style labels
	if mile_label:
		mile_label.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		mile_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		mile_label.add_theme_constant_override("outline_size", 1)
		mile_label.add_theme_font_size_override("font_size", 16)
	
	if biome_label:
		biome_label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9))
		biome_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		biome_label.add_theme_constant_override("outline_size", 1)
		biome_label.add_theme_font_size_override("font_size", 14)
	
	# Style close button
	var close_btn = get_node_or_null("MapPanel/CloseButton")
	if close_btn and ui_theme:
		var normal_sb = ui_theme.get_stylebox_panel(
			ui_theme.COLORS["frame_dark"],
			ui_theme.COLORS["gold_border"],
			1
		)
		var hover_sb = ui_theme.get_stylebox_panel(
			Color(0.15, 0.15, 0.18, 0.95),
			ui_theme.COLORS["gold"],
			1
		)
		close_btn.add_theme_stylebox_override("normal", normal_sb)
		close_btn.add_theme_stylebox_override("hover", hover_sb)
		close_btn.add_theme_color_override("font_color", Color(0.95, 0.95, 0.95))
		close_btn.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		close_btn.add_theme_constant_override("outline_size", 1)

func _setup_milestone_markers():
	"""Create milestone markers for every 10 miles (boss locations)"""
	# Clear existing markers
	for marker in milestone_markers:
		if is_instance_valid(marker):
			marker.queue_free()
	milestone_markers.clear()
	
	# Create milestone container if it doesn't exist
	if not milestone_container:
		milestone_container = Node2D.new()
		milestone_container.name = "MilestoneContainer"
		var map_panel = get_node_or_null("MapPanel")
		if map_panel:
			map_panel.add_child(milestone_container)
			milestone_container.position = road_line.position
	
	# Create markers for miles 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
	for mile in range(10, 101, 10):
		_create_milestone_marker(mile)

func _create_milestone_marker(mile: int):
	"""Create a visual marker for a milestone mile (boss location)"""
	var marker = Panel.new()
	marker.custom_minimum_size = Vector2(20, 20)
	marker.position = _get_mile_position(mile) - Vector2(10, 10)
	
	# Style as boss marker (red/gold skull or icon)
	if ui_theme:
		var marker_sb = StyleBoxFlat.new()
		marker_sb.bg_color = Color(0.8, 0.2, 0.2, 0.9)  # Red background
		marker_sb.border_color = Color.GOLD
		marker_sb.border_width_left = 2
		marker_sb.border_width_top = 2
		marker_sb.border_width_right = 2
		marker_sb.border_width_bottom = 2
		marker.add_theme_stylebox_override("panel", marker_sb)
	
	# Add mile label
	var marker_mile_label = Label.new()
	marker_mile_label.text = str(mile)
	marker_mile_label.add_theme_color_override("font_color", Color.WHITE)
	marker_mile_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	marker_mile_label.add_theme_constant_override("outline_size", 1)
	marker_mile_label.add_theme_font_size_override("font_size", 10)
	marker_mile_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	marker_mile_label.set_anchors_preset(Control.PRESET_FULL_RECT)
	marker.add_child(marker_mile_label)
	
	milestone_container.add_child(marker)
	milestone_markers.append(marker)

func _setup_biome_segments():
	"""Create visual segments for each biome along the road"""
	# Clear existing segments
	var map_panel = get_node_or_null("MapPanel")
	if not map_panel: return
	
	# Create biome segments container if it doesn't exist
	if not biome_segments:
		biome_segments = Node2D.new()
		biome_segments.name = "BiomeSegments"
		map_panel.add_child(biome_segments)
		biome_segments.z_index = -1  # Behind road line
		biome_segments.position = road_line.position
	
	# Clear existing biome visuals
	for child in biome_segments.get_children():
		child.queue_free()
	
	# Create biome segments: Plains (0-15), Forest (15-35), Mountains (35-55), 
	# Desert (55-75), Undead (75-90), Arcane (90-100)
	var biome_ranges = [
		{"name": "plains", "start": 0, "end": 15},
		{"name": "forest", "start": 15, "end": 35},
		{"name": "mountains", "start": 35, "end": 55},
		{"name": "desert", "start": 55, "end": 75},
		{"name": "undead", "start": 75, "end": 90},
		{"name": "arcane", "start": 90, "end": 100}
	]
	
	var road_length = 700.0  # Length of road line
	var total_miles = 100.0
	
	for biome_range in biome_ranges:
		var start_ratio = biome_range.start / total_miles
		var end_ratio = biome_range.end / total_miles
		var start_x = start_ratio * road_length
		var end_x = end_ratio * road_length
		var width = end_x - start_x
		
		# Create colored rectangle for biome segment
		var segment = ColorRect.new()
		segment.position = Vector2(start_x, -15)
		segment.size = Vector2(width, 30)
		segment.color = biome_colors.get(biome_range.name, Color.WHITE)
		segment.color.a = 0.4  # Semi-transparent
		biome_segments.add_child(segment)

func _setup_legend():
	"""Create legend showing biome colors and milestone markers"""
	var map_panel = get_node_or_null("MapPanel")
	if not map_panel: return
	
	# Create legend panel if it doesn't exist
	if not legend_panel:
		legend_panel = Panel.new()
		legend_panel.name = "LegendPanel"
		map_panel.add_child(legend_panel)
		legend_panel.position = Vector2(50, 50)
		legend_panel.custom_minimum_size = Vector2(200, 200)
		
		if ui_theme:
			legend_panel.add_theme_stylebox_override("panel", ui_theme.get_stylebox_panel(
				Color(0.05, 0.05, 0.05, 0.9),
				ui_theme.COLORS["gold_border"],
				1
			))
	
	# Clear existing legend content
	for child in legend_panel.get_children():
		child.queue_free()
	
	# Create legend title
	var legend_title = Label.new()
	legend_title.text = "LEGEND"
	legend_title.add_theme_color_override("font_color", Color.GOLD)
	legend_title.add_theme_font_size_override("font_size", 14)
	legend_title.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	legend_title.add_theme_constant_override("outline_size", 1)
	legend_panel.add_child(legend_title)
	
	# Create biome legend entries
	var vbox = VBoxContainer.new()
	vbox.position = Vector2(10, 30)
	vbox.add_theme_constant_override("separation", 5)
	legend_panel.add_child(vbox)
	
	for biome_name in ["plains", "forest", "mountains", "desert", "undead", "arcane"]:
		var hbox = HBoxContainer.new()
		hbox.add_theme_constant_override("separation", 10)
		
		# Color indicator
		var color_indicator = ColorRect.new()
		color_indicator.custom_minimum_size = Vector2(20, 15)
		color_indicator.color = biome_colors.get(biome_name, Color.WHITE)
		hbox.add_child(color_indicator)
		
		# Biome name
		var name_label = Label.new()
		name_label.text = biome_name.capitalize()
		name_label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9))
		name_label.add_theme_font_size_override("font_size", 11)
		hbox.add_child(name_label)
		
		vbox.add_child(hbox)
	
	# Add milestone legend entry
	var milestone_hbox = HBoxContainer.new()
	milestone_hbox.add_theme_constant_override("separation", 10)
	milestone_hbox.position.y = 150
	
	var milestone_indicator = Panel.new()
	milestone_indicator.custom_minimum_size = Vector2(20, 20)
	if ui_theme:
		var milestone_sb = StyleBoxFlat.new()
		milestone_sb.bg_color = Color(0.8, 0.2, 0.2, 0.9)
		milestone_sb.border_color = Color.GOLD
		milestone_sb.border_width_left = 2
		milestone_sb.border_width_top = 2
		milestone_sb.border_width_right = 2
		milestone_sb.border_width_bottom = 2
		milestone_indicator.add_theme_stylebox_override("panel", milestone_sb)
	milestone_hbox.add_child(milestone_indicator)
	
	var milestone_label = Label.new()
	milestone_label.text = "Boss (Every 10 miles)"
	milestone_label.add_theme_color_override("font_color", Color(0.9, 0.9, 0.9))
	milestone_label.add_theme_font_size_override("font_size", 11)
	milestone_hbox.add_child(milestone_label)
	
	vbox.add_child(milestone_hbox)

func _get_mile_position(mile: int) -> Vector2:
	"""Convert mile number to position along the road line"""
	var total_miles = 100.0
	var progress = clamp(mile / total_miles, 0.0, 1.0)
	
	var road_length = 700.0  # Length of road line
	var x = progress * road_length
	
	return Vector2(x, 0)  # Road line is horizontal at y=0

func _on_mile_changed_map(_m, _max, _old):
	_update_map()
	_update_player_position()

func _process(_delta):
	# Real-time marker update
	_update_player_position()

func _update_map():
	var wm = get_node_or_null("/root/WorldManager")
	if not wm: return
	
	var bm = get_node_or_null("/root/BrutalModeManager")
	var is_brutal = bm and bm.is_brutal_mode()
	
	# Update mile label with color coding
	if mile_label:
		var mile_text: String
		var mile_color: Color
		if wm.current_mile <= 100:
			mile_text = "Current Mile: %d / 100" % int(wm.current_mile)
			mile_color = Color.GOLD
		else:
			if is_brutal:
				var difficulty_name = bm.get_difficulty_name(bm.current_difficulty_level) if bm else "Unknown"
				mile_text = "Current Mile: %d+ (%s)" % [int(wm.current_mile), difficulty_name]
				mile_color = Color.RED
			else:
				mile_text = "Current Mile: %d+" % int(wm.current_mile)
				mile_color = Color.GOLD
		
		mile_label.text = mile_text
		mile_label.add_theme_color_override("font_color", mile_color)
	
	# Update biome label with color coding
	if biome_label:
		var biome = wm.determine_segment_type(wm.current_segment)
		var biome_color = biome_colors.get(biome, Color.WHITE)
		var biome_text = "Region: %s" % biome.capitalize()
		if is_brutal:
			biome_text += " [BRUTAL MODE]"
		
		biome_label.text = biome_text
		biome_label.add_theme_color_override("font_color", biome_color)
	
	# Update milestone markers visibility (highlight current/upcoming)
	_update_milestone_visibility()


func _update_milestone_visibility():
	"""Update milestone markers to highlight completed/pending"""
	var wm = get_node_or_null("/root/WorldManager")
	if not wm: return
	
	var current_mile = int(wm.current_mile)
	
	for i in range(milestone_markers.size()):
		var marker = milestone_markers[i]
		if not is_instance_valid(marker):
			continue
		
		var milestone_mile = (i + 1) * 10  # 10, 20, 30, etc.
		
		# Highlight completed milestones (green), upcoming milestones (gold), current (white)
		var marker_sb: StyleBoxFlat = marker.get_theme_stylebox("panel") as StyleBoxFlat
		if marker_sb:
			if current_mile >= milestone_mile:
				# Completed milestone - green
				marker_sb.bg_color = Color(0.2, 0.8, 0.2, 0.9)
				marker_sb.border_color = Color.GREEN
			elif current_mile >= milestone_mile - 2:
				# Upcoming milestone (within 2 miles) - gold
				marker_sb.bg_color = Color(0.9, 0.7, 0.2, 0.9)
				marker_sb.border_color = Color.GOLD
			else:
				# Future milestone - red
				marker_sb.bg_color = Color(0.8, 0.2, 0.2, 0.9)
				marker_sb.border_color = Color.GOLD
			
			marker.add_theme_stylebox_override("panel", marker_sb)

func _update_player_position():
	var wm = get_node_or_null("/root/WorldManager")
	if not wm or not road_line or not player_marker: return
	
	# Get position for current mile (cap at 100 for visual purposes)
	var display_mile = min(wm.current_mile, 100.0)
	var marker_pos = _get_mile_position(display_mile)
	
	# Marker should be relative to the road_line's position
	player_marker.position = road_line.position + marker_pos
	
	# Style player marker with WoW colors
	if player_marker.modulate == Color.WHITE:
		player_marker.modulate = Color(0.3, 0.7, 1.0)  # Light blue for party
	
	# Update marker label styling if not already done
	var marker_label = player_marker.get_node_or_null("MarkerLabel")
	if marker_label:
		marker_label.add_theme_color_override("font_color", Color.WHITE)
		marker_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		marker_label.add_theme_constant_override("outline_size", 1)
		marker_label.add_theme_font_size_override("font_size", 12)

func _on_close_pressed():
	visible = false
	get_tree().paused = false


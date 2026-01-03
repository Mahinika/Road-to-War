extends Control

# WorldMap.gd - Visual representation of the 100-mile road progress

@onready var road_line: Line2D = $MapPanel/RoadLine
@onready var player_marker: Sprite2D = $MapPanel/PlayerMarker
@onready var mile_label: Label = $MapPanel/MileLabel
@onready var biome_label: Label = $MapPanel/BiomeLabel

func _ready():
	_update_map()
	# Update periodically or on distance changed
	var wm = get_node_or_null("/root/WorldManager")
	if wm:
		wm.mile_changed.connect(func(_m, _max, _old): _update_map())

func _process(_delta):
	# Real-time marker update
	_update_player_position()

func _update_map():
	var wm = get_node_or_null("/root/WorldManager")
	if not wm: return
	
	if mile_label:
		mile_label.text = "Current Mile: %d / 100" % int(wm.current_mile)
	
	if biome_label:
		var biome = wm.determine_segment_type(wm.current_segment)
		biome_label.text = "Region: %s" % biome.capitalize()

func _update_player_position():
	var wm = get_node_or_null("/root/WorldManager")
	if not wm or not road_line or not player_marker: return
	
	var total_miles = 100.0
	var progress = clamp(wm.current_mile / total_miles, 0.0, 1.0)
	
	# Calculate position along the Line2D
	var points = road_line.points
	if points.size() < 2: return
	
	# Simple linear interpolation for now, assuming 2 points (start and end)
	# Or follow the line if it's more complex
	var start_pos = points[0]
	var end_pos = points[points.size() - 1]
	player_marker.position = start_pos.lerp(end_pos, progress)

func _on_close_pressed():
	visible = false
	get_tree().paused = false


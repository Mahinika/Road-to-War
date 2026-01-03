extends Node

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

# RoadGenerator.gd - Procedural road path generation

var road_center_y_ratio: float = 0.65
var road_variation: float = 15.0

var road_types = {
	"plains": "dirt",
	"forest": "dirt",
	"mountains": "stone",
	"dark_lands": "corrupted",
	"desert": "dirt",
	"city": "cobblestone"
}

var road_colors = {
	"dirt": Color(0.55, 0.43, 0.39),
	"stone": Color(0.46, 0.46, 0.46),
	"cobblestone": Color(0.46, 0.46, 0.46),
	"corrupted": Color(0.29, 0.16, 0.16)
}

func _ready():
	_log_info("RoadGenerator", "Initialized")


func generate_road_path(_biome_type: String, width: float, height: float) -> Array[Vector2]:
	var points: Array[Vector2] = []
	var road_center_y = height * road_center_y_ratio
	var segment_length = 100.0 # More points for smoother curve
	# Generate road for 2x screen width to allow seamless wrapping
	var total_width = width * 2.0
	var num_segments = ceil(total_width / segment_length)
	
	var variation = road_variation 
	
	for i in range(num_segments + 1):
		var x = i * segment_length
		# Periodic variation that matches the width
		var y = road_center_y + sin(x * (2.0 * PI / width)) * variation
		
		points.append(Vector2(x, y))
		
	return points

func create_road_line(points: Array[Vector2], biome_type: String) -> Line2D:
	var line = Line2D.new()
	line.points = points
	line.width = 40.0 # Thinner road
	line.default_color = road_colors.get(road_types.get(biome_type, "dirt"), Color.BROWN)
	line.texture_mode = Line2D.LINE_TEXTURE_TILE
	line.joint_mode = Line2D.LINE_JOINT_ROUND
	line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	line.end_cap_mode = Line2D.LINE_CAP_ROUND
	line.z_index = -5 # Behind heroes
	return line

extends Control

# HealthBar.gd - Health bar UI component
# Migrated from src/utils/health-bar.js

var max_health: float = 100.0
var current_health: float = 100.0
var health_bar: ProgressBar = null
var health_text: Label = null

func _ready():
	setup_health_bar()

func setup_health_bar():
	# Create progress bar
	health_bar = ProgressBar.new()
	health_bar.max_value = max_health
	health_bar.value = current_health
	health_bar.custom_minimum_size = Vector2(100, 16)
	add_child(health_bar)
	
	# Create health text
	health_text = Label.new()
	health_text.text = "%d/%d" % [int(current_health), int(max_health)]
	health_text.position = Vector2(0, -2)
	add_child(health_text)
	
	# Apply WoW-style theme
	var theme = get_node_or_null("/root/UITheme")
	if theme and theme.has_method("apply_progress_bar_style"):
		theme.apply_progress_bar_style(health_bar)

# Update health bar
func update_health(new_health: float, new_max_health: float = -1.0):
	current_health = clamp(new_health, 0.0, new_max_health if new_max_health > 0 else max_health)
	if new_max_health > 0:
		max_health = new_max_health
	
	if health_bar:
		health_bar.max_value = max_health
		health_bar.value = current_health
		
		# Change color based on health percentage
		var health_percent = current_health / max_health
		if health_percent > 0.6:
			health_bar.modulate = Color.GREEN
		elif health_percent > 0.3:
			health_bar.modulate = Color.ORANGE
		else:
			health_bar.modulate = Color.RED
	
	if health_text:
		health_text.text = "%d/%d" % [int(current_health), int(max_health)]

# Set position (for following combatant)
func set_world_position(world_pos: Vector2, camera: Camera2D):
	if not camera:
		return
	
	var screen_pos = camera.to_screen_position(world_pos)
	position = screen_pos + Vector2(-50, -60)  # Offset above combatant


extends Node2D

# FloatingText.gd - Logic for rising/fading combat text

@onready var label: Label = $Label

var velocity: Vector2 = Vector2(0, -50)
var duration: float = 1.0
var elapsed: float = 0.0

var _pending_text = ""
var _pending_color = Color.WHITE

func setup(pos: Vector2, text: String, color: Color):
	position = pos
	_pending_text = text
	_pending_color = color
	if label:
		label.text = text
		label.modulate = color

func _ready():
	if label:
		label.text = _pending_text
		label.modulate = _pending_color

func _process(delta):
	elapsed += delta
	position += velocity * delta
	
	# Fade out
	label.modulate.a = 1.0 - (elapsed / duration)
	
	if elapsed >= duration:
		queue_free()


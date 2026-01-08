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
	if label:
		label.modulate.a = 1.0 - (elapsed / duration)
	
	if elapsed >= duration:
		_release_to_pool()

# Release to object pool instead of freeing
func _release_to_pool():
	var object_pool = get_node_or_null("/root/ObjectPool")
	if object_pool:
		# Remove from scene tree
		if get_parent():
			get_parent().remove_child(self)
		# Release to pool
		object_pool.release("floating_text", self)
	else:
		# Fallback to queue_free if no pool
		queue_free()

# Reset function for object pooling
func reset():
	elapsed = 0.0
	velocity = Vector2(0, -50)
	duration = 1.0
	_pending_text = ""
	_pending_color = Color.WHITE
	visible = true
	if label:
		label.modulate.a = 1.0


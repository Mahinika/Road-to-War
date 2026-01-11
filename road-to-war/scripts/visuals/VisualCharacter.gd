extends AssetVisual
class_name VisualCharacter

## Specialized AssetVisual for Characters.
## Integrates with existing gameplay systems if necessary.

@export var character_name: String = "Unnamed Hero"
@export var class_id: String = ""

func _ready():
	super._ready()
	# Example: Characters might need a NameLabel or HealthBar child
	_setup_character_ui()

func _setup_character_ui():
	# This demonstrates how AssetVisual can be extended
	# for specific types without breaking the base system.
	pass

func play_move_animation():
	if profile:
		# We can override or augment procedural motion based on state
		pass

func play_attack_animation():
	# Procedural lunge/squash for attack
	var tween = create_tween()
	tween.tween_property(sprite, "position:x", 20.0, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "position:x", 0.0, 0.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

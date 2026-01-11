extends AssetVisual
class_name VisualSpellIcon

## Specialized AssetVisual for Spell Icons.
## Handles cooldowns and availability.

var is_on_cooldown: bool = false
var cooldown_time: float = 0.0
var max_cooldown: float = 0.0

func _process(delta):
	if is_on_cooldown:
		cooldown_time -= delta
		if cooldown_time <= 0:
			is_on_cooldown = false
			_update_cooldown_visual(0.0)
		else:
			_update_cooldown_visual(cooldown_time / max_cooldown)

func start_cooldown(duration: float):
	is_on_cooldown = true
	max_cooldown = duration
	cooldown_time = duration
	_update_cooldown_visual(1.0)

func _update_cooldown_visual(progress: float):
	metadata["cooldown_progress"] = progress
	apply_visuals() # This will sync shader params

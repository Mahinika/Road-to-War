extends AssetVisual
class_name VisualItemIcon

## Specialized AssetVisual for Item Icons.
## Handles rarity colors and stacking labels.

@export var rarity: String = "common":
	set(value):
		rarity = value
		_update_rarity_visual()

func _ready():
	super._ready()
	_update_rarity_visual()

func _update_rarity_visual():
	if not is_inside_tree(): return
	
	var color = Color.WHITE
	match rarity:
		"uncommon": color = Color(0.12, 1.0, 0.0)
		"rare": color = Color(0.0, 0.44, 1.0)
		"epic": color = Color(0.64, 0.21, 0.93)
		"legendary": color = Color(1.0, 0.5, 0.0)
	
	metadata["glow_color"] = color
	# If we have an outline, maybe we want it to match rarity?
	if profile:
		profile.outline_color = color.darkened(0.5)
	
	apply_visuals()

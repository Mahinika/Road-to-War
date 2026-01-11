extends AssetVisual
class_name VisualProjectile

## Specialized AssetVisual for Projectiles.
## Handles orientation and trails.

@export var speed: float = 600.0
var direction: Vector2 = Vector2.RIGHT

func _process(delta):
	position += direction * speed * delta
	# Projectiles usually face their movement direction
	rotation = direction.angle()

func launch(from: Vector2, to: Vector2):
	global_position = from
	direction = (to - from).normalized()
	
	# Add a procedural trail if the profile has a trail VFX
	_spawn_trail()

func _spawn_trail():
	# Procedural trail using CPUParticles2D
	var trail = CPUParticles2D.new()
	add_child(trail)
	trail.amount = 10
	trail.lifetime = 0.3
	trail.texture = texture # Use the same texture for bits of the projectile trailing
	trail.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	trail.emission_sphere_radius = 5.0
	trail.gravity = Vector2.ZERO
	trail.scale_amount_min = 0.1
	trail.scale_amount_max = 0.5
	trail.color_ramp = Gradient.new()
	trail.color_ramp.set_color(0, Color(1,1,1,1))
	trail.color_ramp.set_color(1, Color(1,1,1,0))
	trail.local_coords = false

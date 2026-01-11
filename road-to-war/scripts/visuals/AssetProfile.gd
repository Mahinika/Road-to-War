extends Resource
class_name AssetProfile

@export_group("Layout")
@export var base_size: Vector2 = Vector2(64, 64)
@export var use_pixel_snap: bool = true
@export var pivot_offset: Vector2 = Vector2(0.5, 0.5) # Normalized 0-1

@export_group("Shaders")
@export var shader_material: ShaderMaterial
@export var enable_outline: bool = true
@export var outline_color: Color = Color.BLACK
@export var outline_width: float = 1.0

@export_group("Motion")
@export var idle_bob_speed: float = 0.0 # 0 = disabled
@export var idle_bob_amount: float = 5.0
@export var idle_pulse_speed: float = 0.0 # 0 = disabled
@export var idle_pulse_amount: float = 0.1
@export var hover_scale: float = 1.0 # 1 = disabled

@export_group("VFX Hooks")
@export var impact_vfx: PackedScene
@export var death_vfx: PackedScene
@export var spawn_vfx: PackedScene

@export_group("Feedback")
@export var hit_flash_color: Color = Color.WHITE
@export var hit_flash_duration: float = 0.1

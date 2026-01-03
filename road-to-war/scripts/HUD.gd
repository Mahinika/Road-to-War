extends Control

# HUD.gd - Manages the main game HUD

@onready var party_container: VBoxContainer = $PartyContainer
@onready var mile_label: Label = get_node_or_null("MileLabel")

var unit_frame_scene = preload("res://scenes/UnitFrame.tscn")

func _ready():
	# Ensure HUD is full screen and responsive
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	
	var pm = get_node_or_null("/root/PartyManager")
	var wm = get_node_or_null("/root/WorldManager")
	var sm = get_node_or_null("/root/SceneManager")
	
	# Wait for PartyManager to be ready or heroes to be loaded
	call_deferred("refresh_party_ui")
	if pm:
		pm.hero_added.connect(func(_h): refresh_party_ui())
		pm.hero_removed.connect(func(_id): refresh_party_ui())
	
	if wm:
		if wm.mile_changed.is_connected(_on_mile_changed):
			wm.mile_changed.disconnect(_on_mile_changed)
		wm.mile_changed.connect(_on_mile_changed)
		
		# Initial update
		_update_mile_label(wm.current_mile)
	
	# Ensure BottomMenu is anchored correctly
	var bottom_menu = get_node_or_null("BottomMenu")
	if bottom_menu:
		bottom_menu.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
		# Ensure it's not off-screen
		bottom_menu.position.y = get_viewport_rect().size.y - bottom_menu.size.y
	
	# Connect buttons
	var char_btn = get_node_or_null("BottomMenu/CharacterButton")
	if char_btn and sm: char_btn.pressed.connect(func(): sm.change_scene("res://scenes/CharacterPanel.tscn"))
	
	var inv_btn = get_node_or_null("BottomMenu/InventoryButton")
	if inv_btn and sm: inv_btn.pressed.connect(func(): sm.change_scene("res://scenes/CharacterPanel.tscn"))
	
	var talent_btn = get_node_or_null("BottomMenu/TalentsButton")
	if talent_btn and sm: talent_btn.pressed.connect(func(): sm.change_scene("res://scenes/TalentAllocation.tscn"))
	
	var stats_btn = get_node_or_null("BottomMenu/StatsButton")
	if stats_btn and sm: stats_btn.pressed.connect(func(): sm.change_scene("res://scenes/Statistics.tscn"))
	
	var ach_btn = get_node_or_null("BottomMenu/AchievementsButton")
	if ach_btn and sm: ach_btn.pressed.connect(func(): sm.change_scene("res://scenes/Achievements.tscn"))
	
	var map_btn = get_node_or_null("BottomMenu/MapButton")
	if map_btn: map_btn.pressed.connect(_toggle_map)
	
	var opt_btn = get_node_or_null("BottomMenu/OptionsButton")
	if opt_btn and sm: opt_btn.pressed.connect(func(): sm.change_scene("res://scenes/Options.tscn"))

func _input(event):
	if event is InputEventKey and event.pressed:
		var sm = get_node_or_null("/root/SceneManager")
		if not sm: return
		
		match event.keycode:
			KEY_I, KEY_C:
				sm.change_scene("res://scenes/CharacterPanel.tscn")
			KEY_M:
				_toggle_map()
			KEY_N:
				sm.change_scene("res://scenes/TalentAllocation.tscn")
			KEY_S:
				sm.change_scene("res://scenes/Statistics.tscn")
			KEY_A:
				sm.change_scene("res://scenes/Achievements.tscn")
			KEY_O:
				sm.change_scene("res://scenes/Options.tscn")

func _toggle_map():
	var map = get_node_or_null("WorldMap")
	if not map:
		var map_scene = load("res://scenes/WorldMap.tscn")
		if map_scene:
			map = map_scene.instantiate()
			map.name = "WorldMap"
			add_child(map)
	
	map.visible = !map.visible
	get_tree().paused = map.visible

func _on_mile_changed(mile, _max, _old):
	_update_mile_label(mile)

func _update_mile_label(mile):
	if mile_label:
		mile_label.text = "Mile %d" % mile

func refresh_party_ui():
	# Clear existing frames
	for child in party_container.get_children():
		child.queue_free()
		
	# Create new frames for each party member
	var pm = get_node_or_null("/root/PartyManager")
	if not pm: return
	
	for hero in pm.heroes:
		var frame = unit_frame_scene.instantiate()
		party_container.add_child(frame)
		frame.setup(hero.id)


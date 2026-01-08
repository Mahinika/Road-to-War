extends Node

# LevelUpHandler.gd - Handles hero level-up events and visual feedback
# Extracted from World.gd to improve modularity

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var world_scene: Node = null
var particle_manager: Node = null
var audio_manager: Node = null
var stat_calculator: Node = null

func _ready():
	_log_info("LevelUpHandler", "Initialized")

func initialize(world: Node):
	world_scene = world
	particle_manager = get_node_or_null("/root/ParticleManager")
	audio_manager = get_node_or_null("/root/AudioManager")
	stat_calculator = get_node_or_null("/root/StatCalculator")
	
	# Connect level-up signals to all existing heroes
	reconnect_hero_signals()

# Reconnect level-up signals to all heroes in party
# Call this when heroes are added or swapped
func reconnect_hero_signals():
	var party_manager = get_node_or_null("/root/PartyManager")
	if not party_manager:
		return
	
	for hero in party_manager.heroes:
		if hero and hero.has_signal("level_up"):
			# Disconnect if already connected to avoid duplicates
			if hero.level_up.is_connected(_on_hero_level_up.bind(hero)):
				hero.level_up.disconnect(_on_hero_level_up.bind(hero))
			# Connect with hero bound to callback
			hero.level_up.connect(_on_hero_level_up.bind(hero))

func _on_hero_level_up(new_level: int, hero):
	if not hero:
		return
	
	var hero_node = world_scene._find_unit_node(hero.id) if world_scene and world_scene.has_method("_find_unit_node") else null
	var pos = hero_node.global_position if hero_node else Vector2.ZERO
	
	# Visual effects
	if particle_manager:
		particle_manager.create_floating_text(pos + Vector2(0, -60), "LEVEL UP! (%d)" % new_level, Color.GOLD)
		particle_manager.create_level_up_effect(pos)
	
	# Audio feedback
	if audio_manager:
		audio_manager.play_level_up_sfx()
	
	# Recalculate stats
	if stat_calculator:
		stat_calculator.recalculate_hero_stats(hero)
	
	# Check for talent point milestones
	var talent_manager = get_node_or_null("/root/TalentManager")
	if talent_manager:
		var milestone_levels = [20, 40, 60, 80, 100]
		if new_level in milestone_levels:
			hero.available_talent_points += 1
			_log_info("LevelUpHandler", "Talent point milestone reached at level %d!" % new_level)
	
	_log_info("LevelUpHandler", "Hero %s leveled up to %d!" % [hero.name, new_level])


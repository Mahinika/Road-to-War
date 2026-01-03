extends Node2D

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_warn(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.warn(source, message)
	else:
		print("[%s] [WARN] %s" % [source, message])

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

# Main.gd - Top level controller for the Godot version

func _ready():
	_log_info("Main", "Game Initializing...")
	
	# Wait for Autoloads to settle
	call_deferred("_setup_game")

func _setup_game():
	# 1. Load Data
	# (DataManager does this in _ready)
	
	# 2. Create Dummy Party for Testing
	_create_test_party()
	
	# 3. Start World Movement
	WorldManager.current_segment = 0
	
	# 4. Trigger a test combat after a short delay
	get_tree().create_timer(2.0).timeout.connect(_start_test_combat)

func _create_test_party():
	_log_info("Main", "Creating test party...")
	
	var roles = ["tank", "healer", "dps", "dps", "dps"]
	var classes = ["paladin", "priest", "mage", "rogue", "warlock"]
	
	for i in range(5):
		var hero = Hero.new()
		hero.id = "hero_%d" % i
		hero.name = "Hero %d" % (i + 1)
		hero.role = roles[i]
		hero.class_id = classes[i]
		hero.level = 10 # Start at 10 for talent points
		
		# Initial stats
		hero.base_stats = {
			"stamina": 15,
			"strength": 12,
			"intellect": 10,
			"agility": 10,
			"spirit": 10,
			"maxHealth": 150,
			"attack": 15,
			"defense": 8
		}
		
		PartyManager.add_hero(hero)
		StatCalculator.recalculate_hero_stats(hero)

func _start_test_combat():
	_log_info("Main", "Starting test combat...")
	var test_enemy = {
		"id": "test_boar",
		"name": "Test Boar",
		"current_health": 500,
		"max_health": 500,
		"stats": {
			"attack": 12,
			"defense": 5
		}
	}
	CombatManager.start_party_combat(test_enemy)


extends Node

# BossMechanics.gd - Handles boss-specific combat mechanics
# Migrated from src/managers/combat/boss-mechanics.js

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

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

var damage_calculator: Node = null
var status_effects_manager: Node = null
var combat_ai: Node = null
var particle_manager: Node = null
var party_manager: Node = null
var world_manager: Node = null

func _ready():
	damage_calculator = get_node_or_null("/root/DamageCalculator")
	status_effects_manager = get_node_or_null("/root/StatusEffectsManager")
	combat_ai = get_node_or_null("/root/CombatAI")
	particle_manager = get_node_or_null("/root/ParticleManager")
	party_manager = get_node_or_null("/root/PartyManager")
	world_manager = get_node_or_null("/root/WorldManager")
	_log_info("BossMechanics", "Initialized")

# Execute boss mechanic
func execute_mechanic(enemy: Dictionary, mechanic: String, current_combat: Dictionary):
	if enemy.is_empty() or mechanic.is_empty():
		return
	
	var enemy_id = enemy.get("id", "unknown")
	
	match mechanic:
		"aoe_attack", "aoe_breath":
			execute_boss_aoe(enemy, current_combat)
		"cleave", "massive_cleave":
			execute_cleave(enemy, current_combat)
		"intimidating_shout":
			execute_intimidating_shout(enemy, current_combat)
		"summon_adds", "summon_guards":
			spawn_adds(enemy, 2, current_combat)
		"environmental_hazards":
			_log_debug("BossMechanics", "Boss %s creates environmental hazards" % enemy_id)
			var enemy_x = enemy.get("x", 0)
			var enemy_y = enemy.get("y", 0)
			if particle_manager:
				particle_manager.create_floating_text(Vector2(enemy_x, enemy_y - 80), "HAZARDS!", Color.YELLOW)
		_:
			_log_debug("BossMechanics", "Unknown boss mechanic: %s" % mechanic)

# Execute boss AoE attack
func execute_boss_aoe(enemy: Dictionary, current_combat: Dictionary):
	if not party_manager or not current_combat.has("party"):
		return
	
	var heroes = current_combat["party"].get("heroes", [])
	if heroes.is_empty():
		return
	
	var enemy_attack = current_combat.get("enemy", {}).get("attack", 10)
	var aoe_damage = int(enemy_attack * 0.7)  # Boss AoE damage is usually lower per target
	
	for hero_data in heroes:
		if hero_data.get("current_health", 0) <= 0:
			continue
		
		var hero = party_manager.get_hero_by_id(hero_data.get("id", ""))
		if not hero:
			continue
		
		# Calculate final damage with defense
		var final_damage = aoe_damage
		if damage_calculator:
			var hero_defense = hero_data.get("defense", 0)
			final_damage = damage_calculator.calculate_damage(aoe_damage, hero_defense, enemy, hero)
		
		# Apply AoE damage
		hero_data["current_health"] = max(0, hero_data.get("current_health", 0) - final_damage)
		
		# Show damage number
		var hero_x = hero.get("x", 0) if hero is Dictionary else 0
		var hero_y = hero.get("y", 0) if hero is Dictionary else 0
		if particle_manager:
			particle_manager.create_floating_text(Vector2(hero_x, hero_y - 50), str(final_damage), Color.RED)
	
	var enemy_x = enemy.get("x", 0)
	var enemy_y = enemy.get("y", 0)
	if particle_manager:
		particle_manager.create_floating_text(Vector2(enemy_x, enemy_y - 80), "AoE ATTACK!", Color(1.0, 0.53, 0.0))

# Execute a Cleave attack (hits tank and 2 nearby DPS)
func execute_cleave(enemy: Dictionary, current_combat: Dictionary):
	if not party_manager or not current_combat.has("party"):
		return
	
	var heroes = current_combat["party"].get("heroes", [])
	var tank = party_manager.get_tank() if party_manager.has_method("get_tank") else null
	
	# Target tank and up to 2 random alive non-tank heroes
	var targets = []
	if tank:
		var tank_id = tank.get("id", "") if tank is Dictionary else ""
		for hero_data in heroes:
			if hero_data.get("id", "") == tank_id and hero_data.get("current_health", 0) > 0:
				targets.append(hero_data)
				break
	
	var others = []
	for hero_data in heroes:
		var hero_id = hero_data.get("id", "")
		var tank_id = tank.get("id", "") if tank is Dictionary else ""
		if hero_id != tank_id and hero_data.get("current_health", 0) > 0:
			others.append(hero_data)
	
	others.shuffle()
	targets.append_array(others.slice(0, 2))
	
	var enemy_attack = current_combat.get("enemy", {}).get("attack", 10)
	var cleave_damage = int(enemy_attack * 1.1)  # Cleave is heavy
	
	for hero_data in targets:
		var hero = party_manager.get_hero_by_id(hero_data.get("id", ""))
		if not hero:
			continue
		
		var final_damage = cleave_damage
		if damage_calculator:
			var hero_defense = hero_data.get("defense", 0)
			final_damage = damage_calculator.calculate_damage(cleave_damage, hero_defense, enemy, hero)
		
		hero_data["current_health"] = max(0, hero_data.get("current_health", 0) - final_damage)
		
		var hero_x = hero.get("x", 0) if hero is Dictionary else 0
		var hero_y = hero.get("y", 0) if hero is Dictionary else 0
		if particle_manager:
			particle_manager.create_floating_text(Vector2(hero_x, hero_y - 50), str(final_damage), Color.RED)
	
	var enemy_x = enemy.get("x", 0)
	var enemy_y = enemy.get("y", 0)
	if particle_manager:
		particle_manager.create_floating_text(Vector2(enemy_x, enemy_y - 80), "CLEAVE!", Color(1.0, 0.27, 0.0))

# Execute Intimidating Shout (debuffs all heroes)
func execute_intimidating_shout(enemy: Dictionary, current_combat: Dictionary):
	if not party_manager or not current_combat.has("party"):
		return
	
	var heroes = current_combat["party"].get("heroes", [])
	if heroes.is_empty():
		return
	
	for hero_data in heroes:
		if hero_data.get("current_health", 0) <= 0:
			continue
		var hero = party_manager.get_hero_by_id(hero_data.get("id", ""))
		if hero and status_effects_manager:
			status_effects_manager.apply_effect(hero_data.get("id", ""), "debuff_attack", 4)
	
	var enemy_x = enemy.get("x", 0)
	var enemy_y = enemy.get("y", 0)
	if particle_manager:
		particle_manager.create_floating_text(Vector2(enemy_x, enemy_y - 80), "INTIMIDATING SHOUT!", Color(0.53, 0.53, 0.53))

# Spawn additional enemies for boss
func spawn_adds(enemy: Dictionary, count: int, current_combat: Dictionary):
	if enemy.is_empty() or not world_manager:
		return
	
	var enemy_id = enemy.get("id", "unknown")
	_log_info("BossMechanics", "Boss %s summons %d adds!" % [enemy_id, count])
	
	var enemy_x = enemy.get("x", 0)
	var enemy_y = enemy.get("y", 0)
	if particle_manager:
		particle_manager.create_floating_text(Vector2(enemy_x, enemy_y - 80), "SUMMONS %d ADDS!" % count, Color.MAGENTA)
	
	# Initialize adds array in combat state if it doesn't exist
	if not current_combat.has("adds"):
		current_combat["adds"] = []
	
	for i in range(count):
		# Spawn a basic enemy (like a goblin or slime) as an add
		var add = world_manager.create_enemy(0, 0, false) if world_manager.has_method("create_enemy") else null
		if add:
			add["id"] = "add_%d_%d" % [Time.get_ticks_msec(), i]
			add["is_add"] = true
			
			# Position around the boss
			add["x"] = enemy_x + (randf() - 0.5) * 200
			add["y"] = enemy_y + (randf() - 0.5) * 100
			
			# Create sprite
			if world_manager.has_method("create_enemy_sprite"):
				world_manager.create_enemy_sprite(add)
			
			# Add to combat adds
			current_combat["adds"].append({
				"id": add["id"],
				"instance": add,
				"max_health": add.get("stats", {}).get("health", 100),
				"current_health": add.get("stats", {}).get("health", 100),
				"attack": add.get("stats", {}).get("attack", 10),
				"defense": add.get("stats", {}).get("defense", 5)
			})
			
			# Initialize threat for add
			if combat_ai and combat_ai.has_method("initialize_enemy_threat"):
				combat_ai.initialize_enemy_threat(add)

# Get boss phase based on health percentage
func get_boss_phase(enemy: Dictionary, current_combat: Dictionary) -> String:
	if enemy.is_empty() or not current_combat.has("enemy"):
		return "phase1"
	
	var enemy_data = current_combat["enemy"]
	var health_percent = float(enemy_data.get("current_health", 100)) / float(enemy_data.get("max_health", 100))
	
	if health_percent > 0.75:
		return "phase1"
	elif health_percent > 0.50:
		return "phase2"
	elif health_percent > 0.25:
		return "phase3"
	else:
		return "enrage"

# Adapt enemy strategy based on combat state
func adapt_strategy(enemy: Dictionary, current_combat: Dictionary) -> String:
	if enemy.is_empty():
		return "defensive"
	
	var base_strategy = enemy.get("ai_strategy", "defensive")
	
	# Simple adaptation based on health
	if current_combat.has("enemy"):
		var enemy_data = current_combat["enemy"]
		var health_percent = float(enemy_data.get("current_health", 100)) / float(enemy_data.get("max_health", 100))
		if health_percent < 0.25:
			return "aggressive"  # Desperate
		elif health_percent < 0.5:
			return "tactical"  # Cautious
	
	return base_strategy


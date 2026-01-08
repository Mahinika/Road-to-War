extends Node

# CombatVisuals.gd - Handles combat visual effects and UI elements
# Migrated from src/managers/combat/combat-visuals.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _log_debug(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.debug(source, message)
	else:
		print("[%s] [DEBUG] %s" % [source, message])

var party_manager: Node = null
var health_bars: Dictionary = {}  # Dictionary<type, Dictionary> with bg, health_bar, border, combatant, health_text
var mana_bars: Dictionary = {}
var status_effect_indicators: Dictionary = {}  # Dictionary<key, Array>

func _ready():
	party_manager = get_node_or_null("/root/PartyManager")
	_log_info("CombatVisuals", "Initialized")

# Create visual elements for combat
func create_combat_visuals(enemy: Dictionary, hero: Dictionary, current_combat: Dictionary):
	if enemy.is_empty():
		return
	
	# For party combat, use primary hero (tank) or first hero
	var primary_hero = null
	if party_manager:
		if party_manager.has_method("get_tank"):
			primary_hero = party_manager.get_tank()
		if not primary_hero and party_manager.has_method("get_hero_by_index"):
			primary_hero = party_manager.get_hero_by_index(0)
	
	if not primary_hero and hero.is_empty():
		return
	
	# Get health data
	var hero_data = _get_health_data(primary_hero if primary_hero else hero, current_combat.get("hero", {}))
	var enemy_data = _get_health_data(enemy, current_combat.get("enemy", {}))
	
	if enemy_data.is_empty():
		return
	
	# Create health bars
	if not primary_hero.is_empty() if primary_hero else not hero.is_empty():
		create_health_bar(primary_hero if primary_hero else hero, hero_data, "hero")
	if not enemy.is_empty():
		create_health_bar(enemy, enemy_data, "enemy")
	
	# Create mana bar for primary hero
	if primary_hero or not hero.is_empty():
		create_mana_bar(primary_hero if primary_hero else hero)
	
	# Initialize status effect indicators
	update_status_effect_indicators()
	
	_log_debug("CombatVisuals", "Created combat visuals")

func _get_health_data(entity: Dictionary, combat_data: Dictionary) -> Dictionary:
	if not combat_data.is_empty():
		return combat_data
	
	if not entity.is_empty() and entity.has("data"):
		var data = entity["data"]
		return {
			"current_health": data.get("current_health", data.get("stats", {}).get("health", 100)),
			"max_health": data.get("stats", {}).get("max_health", 100)
		}
	
	return {"current_health": 100, "max_health": 100}

# Create health bar for combatant
func create_health_bar(combatant: Dictionary, data: Dictionary, type: String):
	var width = 100
	var height = 16
	var combatant_x = combatant.get("x", 0)
	var combatant_y = combatant.get("y", 0)
	var y = combatant_y - 60
	
	# Safety check for data
	if data.is_empty() or not data.has("current_health") or not data.has("max_health"):
		_log_debug("CombatVisuals", "Missing health data for %s" % type)
		return
	
	# Note: In Godot, health bars would typically be created as UI elements
	# For now, we'll store the data structure for later UI implementation
	health_bars[type] = {
		"combatant": combatant,
		"data": data,
		"position": Vector2(combatant_x, y),
		"size": Vector2(width, height),
		"type": type
	}

# Create mana bar for hero
func create_mana_bar(hero: Dictionary):
	if hero.is_empty() or not hero.has("data"):
		return
	
	var width = 60
	var height = 6
	var hero_x = hero.get("x", 0)
	var hero_y = hero.get("y", 0)
	var y = hero_y - 50
	
	# Store mana bar data
	mana_bars["hero"] = {
		"hero": hero,
		"position": Vector2(hero_x, y),
		"size": Vector2(width, height)
	}

# Update health bars for all combatants or a specific type
func update_health_bars(type: String = ""):
	if type == "hero" or type == "":
		if health_bars.has("hero"):
			_update_combatant_health_bar(health_bars["hero"], "hero")
	
	if type == "enemy" or type == "":
		if health_bars.has("enemy"):
			_update_combatant_health_bar(health_bars["enemy"], "enemy")

func _update_combatant_health_bar(bar_data: Dictionary, type: String):
	if not bar_data.has("combatant"):
		return
	
	var combatant = bar_data["combatant"]
	var current_health = 0
	var max_health = 100
	
	# Get health data from various possible locations
	if combatant.has("data") and combatant["data"].has("stats"):
		current_health = combatant["data"].get("current_health", combatant["data"].get("stats", {}).get("health", 0))
		max_health = combatant["data"].get("stats", {}).get("max_health", 100)
	elif combatant.has("current_health"):
		current_health = combatant.get("current_health", 0)
		max_health = combatant.get("max_health", 100)
	
	# Update stored data
	bar_data["data"] = {"current_health": current_health, "max_health": max_health}
	
	# Update position if combatant moved
	var combatant_x = combatant.get("x", 0)
	var combatant_y = combatant.get("y", 0)
	bar_data["position"] = Vector2(combatant_x, combatant_y - 60)

# Update mana bars
func update_mana_bars():
	if mana_bars.has("hero"):
		var mana_bar = mana_bars["hero"]
		if mana_bar.has("hero"):
			var hero = mana_bar["hero"]
			var hero_x = hero.get("x", 0)
			var hero_y = hero.get("y", 0)
			mana_bar["position"] = Vector2(hero_x, hero_y - 50)

# Update status effect visual indicators for a combatant
func update_combatant_status_effects(combatant: Dictionary, type: String):
	if combatant.is_empty() or not combatant.has("data"):
		return
	
	var key = "%s_effects" % type
	if not status_effect_indicators.has(key):
		status_effect_indicators[key] = []
	
	# Clear old indicators
	status_effect_indicators[key].clear()
	
	# Get effects from combatant
	var effects = combatant["data"].get("status_effects", {})
	if effects.is_empty():
		return
	
	var combatant_x = combatant.get("x", 0)
	var combatant_y = combatant.get("y", 0)
	var base_y = combatant_y - 60
	var effect_count = effects.size()
	var start_x = combatant_x - (effect_count * 15) / 2
	
	var index = 0
	for effect_type in effects.keys():
		var effect_data = effects[effect_type]
		if effect_data.get("turns_remaining", 0) < 0:
			continue
		
		# Store indicator data (UI would be created elsewhere)
		status_effect_indicators[key].append({
			"effect_type": effect_type,
			"position": Vector2(start_x + (index * 15), base_y),
			"turns_remaining": effect_data.get("turns_remaining", 0)
		})
		index += 1

# Update status effect visual indicators for all combatants
func update_status_effect_indicators():
	if health_bars.has("hero"):
		var hero_bar = health_bars["hero"]
		if hero_bar.has("combatant"):
			update_combatant_status_effects(hero_bar["combatant"], "hero")
	
	if health_bars.has("enemy"):
		var enemy_bar = health_bars["enemy"]
		if enemy_bar.has("combatant"):
			update_combatant_status_effects(enemy_bar["combatant"], "enemy")

# Clear all combat visuals
func clear_combat_visuals():
	health_bars.clear()
	mana_bars.clear()
	status_effect_indicators.clear()

# Update visual positions (called when combatants move)
func update_visual_positions():
	update_health_bars()
	update_mana_bars()

# Setup combat visuals for a combat encounter
func setup_combat_visuals(current_combat: Dictionary):
	if current_combat.is_empty():
		return
	
	# Create visuals for party combat
	if current_combat.has("party") and current_combat["party"].has("heroes"):
		var heroes = current_combat["party"]["heroes"]
		if not heroes.is_empty() and party_manager:
			var primary_hero = null
			if party_manager.has_method("get_tank"):
				primary_hero = party_manager.get_tank()
			if not primary_hero and party_manager.has_method("get_hero_by_index"):
				primary_hero = party_manager.get_hero_by_index(0)
			
			if primary_hero:
				var hero_data = heroes[0] if heroes.size() > 0 else {}
				create_health_bar(primary_hero, hero_data, "hero")
				create_mana_bar(primary_hero)
	elif current_combat.has("hero"):
		var hero = current_combat["hero"]
		create_health_bar(hero, hero, "hero")
		create_mana_bar(hero)
	
	# Create enemy visuals
	if current_combat.has("enemy"):
		var enemy = current_combat["enemy"]
		create_health_bar(enemy, enemy, "enemy")
	
	# Initialize status effect indicators
	update_status_effect_indicators()

# Reposition camera for combat to keep all combatants in view
func reposition_camera_for_combat(current_combat: Dictionary, camera: Camera2D):
	if not camera or current_combat.is_empty():
		return
	
	var combatants = []
	
	# Collect all combatant positions
	if current_combat.has("party") and current_combat["party"].has("heroes"):
		var heroes = current_combat["party"]["heroes"]
		for hero_data in heroes:
			if party_manager:
				var hero = party_manager.get_hero_by_id(hero_data.get("id", ""))
				if hero:
					var x = hero.get("x", 0) if hero is Dictionary else 0
					var y = hero.get("y", 0) if hero is Dictionary else 0
					combatants.append(Vector2(x, y))
	elif current_combat.has("hero"):
		var hero = current_combat["hero"]
		var x = hero.get("x", 0)
		var y = hero.get("y", 0)
		combatants.append(Vector2(x, y))
	
	if current_combat.has("enemy"):
		var enemy = current_combat["enemy"]
		var x = enemy.get("x", 0)
		var y = enemy.get("y", 0)
		combatants.append(Vector2(x, y))
	
	if combatants.is_empty():
		return
	
	# Calculate center point
	var avg_x = 0.0
	var avg_y = 0.0
	for pos in combatants:
		avg_x += pos.x
		avg_y += pos.y
	avg_x /= combatants.size()
	avg_y /= combatants.size()
	
	# Smoothly pan camera to center
	var tween = create_tween()
	tween.tween_property(camera, "position", Vector2(avg_x, avg_y), 0.5)


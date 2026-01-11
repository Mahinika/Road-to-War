extends Node

# InteractionManager.gd - Comprehensive interaction system
# Handles building entry, NPC interactions, doors, and interactive objects

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

var world_manager: Node = null
var shop_manager: Node = null
var quest_manager: Node = null
var scene_manager: Node = null
var world_scene: Node = null

# Interaction zones (building doors, NPCs, etc.)
var interaction_zones: Array = []
var active_interaction: Dictionary = {}

func _ready():
	world_manager = get_node_or_null("/root/WorldManager")
	shop_manager = get_node_or_null("/root/ShopManager")
	quest_manager = get_node_or_null("/root/QuestManager")
	scene_manager = get_node_or_null("/root/SceneManager")
	_log_info("InteractionManager", "Initialized")

func initialize(world: Node):
	world_scene = world
	_setup_interaction_detection()

# ============================================================================
# BUILDING ENTRY SYSTEM
# ============================================================================

# Register a building door/interaction zone
func register_building(building_data: Dictionary):
	var zone = {
		"type": "building",
		"id": building_data.get("id", ""),
		"name": building_data.get("name", "Building"),
		"position": building_data.get("position", Vector2.ZERO),
		"interaction_range": building_data.get("interaction_range", 50.0),
		"interior_scene": building_data.get("interior_scene", ""),
		"building_type": building_data.get("building_type", "generic"),  # shop, inn, blacksmith, etc.
		"locked": building_data.get("locked", false),
		"requires_key": building_data.get("requires_key", "")
	}
	interaction_zones.append(zone)
	_log_info("InteractionManager", "Registered building: %s at %s" % [zone.name, zone.position])

# Check if party is near a building door
func check_building_proximity(party_position: Vector2) -> Dictionary:
	for zone in interaction_zones:
		if zone.type != "building":
			continue
		
		var distance = party_position.distance_to(zone.position)
		if distance <= zone.interaction_range:
			return zone
	
	return {}

# Attempt to enter a building
func enter_building(building_id: String) -> bool:
	var building = _find_interaction_zone("building", building_id)
	if building.is_empty():
		_log_warn("InteractionManager", "Building not found: %s" % building_id)
		return false
	
	# Check if building is locked
	if building.get("locked", false):
		var required_key = building.get("requires_key", "")
		if required_key != "":
			# Check if player has key (would check inventory)
			_log_warn("InteractionManager", "Building %s is locked! Requires: %s" % [building.name, required_key])
			return false
	
	# Store active interaction
	active_interaction = building
	
	# Transition to interior scene
	var interior_scene = building.get("interior_scene", "")
	if interior_scene != "":
		_transition_to_interior(interior_scene, building)
		return true
	else:
		# Handle building type-specific logic
		return _handle_building_type(building)

# Transition to building interior
func _transition_to_interior(scene_path: String, _building_data: Dictionary):
	if not scene_manager:
		_log_error("InteractionManager", "SceneManager not found")
		return
	
	# Fade out
	_fade_transition(true, 0.3, func():
		# Change scene
		scene_manager.change_scene(scene_path, 0.0)
		# Fade in
		_fade_transition(false, 0.3))

# Handle building type-specific interactions (if no interior scene)
func _handle_building_type(building_data: Dictionary) -> bool:
	var building_type = building_data.get("building_type", "generic")
	
	match building_type:
		"shop":
			return _enter_shop(building_data)
		"inn":
			return _enter_inn(building_data)
		"blacksmith":
			return _enter_blacksmith(building_data)
		"quest_giver":
			return _enter_quest_giver(building_data)
		_:
			_log_info("InteractionManager", "Entered %s: %s" % [building_type, building_data.name])
			return true

# Exit building (return to world)
func exit_building():
	if active_interaction.is_empty():
		return
	
	var building_type = active_interaction.get("building_type", "")
	
	# Handle exit logic based on building type
	match building_type:
		"shop":
			_exit_shop()
		"inn":
			_exit_inn()
		_:
			pass
	
	# Clear active interaction
	active_interaction = {}
	
	# Return to world scene
	if scene_manager:
		_fade_transition(true, 0.3, func():
			scene_manager.change_scene("res://scenes/World.tscn", 0.0)
			_fade_transition(false, 0.3))

# ============================================================================
# NPC INTERACTION SYSTEM
# ============================================================================

# Register an NPC
func register_npc(npc_data: Dictionary):
	var zone = {
		"type": "npc",
		"id": npc_data.get("id", ""),
		"name": npc_data.get("name", "NPC"),
		"position": npc_data.get("position", Vector2.ZERO),
		"interaction_range": npc_data.get("interaction_range", 40.0),
		"npc_type": npc_data.get("npc_type", "generic"),  # quest_giver, vendor, guard, etc.
		"dialogue": npc_data.get("dialogue", []),
		"quest_id": npc_data.get("quest_id", ""),
		"shop_id": npc_data.get("shop_id", ""),
		"faction": npc_data.get("faction", "neutral")
	}
	interaction_zones.append(zone)
	_log_info("InteractionManager", "Registered NPC: %s at %s" % [zone.name, zone.position])

# Check if party is near an NPC
func check_npc_proximity(party_position: Vector2) -> Dictionary:
	for zone in interaction_zones:
		if zone.type != "npc":
			continue
		
		var distance = party_position.distance_to(zone.position)
		if distance <= zone.interaction_range:
			return zone
	
	return {}

# Interact with NPC
func interact_with_npc(npc_id: String) -> bool:
	var npc = _find_interaction_zone("npc", npc_id)
	if npc.is_empty():
		_log_warn("InteractionManager", "NPC not found: %s" % npc_id)
		return false
	
	var npc_type = npc.get("npc_type", "generic")
	
	match npc_type:
		"quest_giver":
			return _interact_quest_giver(npc)
		"vendor":
			return _interact_vendor(npc)
		"guard":
			return _interact_guard(npc)
		_:
			return _interact_generic_npc(npc)

# Interact with quest giver NPC
func _interact_quest_giver(npc: Dictionary) -> bool:
	var quest_id = npc.get("quest_id", "")
	if quest_id != "" and quest_manager:
		quest_manager.offer_quest(quest_id)
		return true
	
	# Show dialogue
	_show_dialogue(npc)
	return true

# Interact with vendor NPC
func _interact_vendor(npc: Dictionary) -> bool:
	var shop_id = npc.get("shop_id", "")
	if shop_id != "" and shop_manager:
		shop_manager.open_shop({"shop_id": shop_id})
		return true
	
	_show_dialogue(npc)
	return true

# Interact with guard NPC
func _interact_guard(npc: Dictionary) -> bool:
	_show_dialogue(npc)
	return true

# Interact with generic NPC
func _interact_generic_npc(npc: Dictionary) -> bool:
	_show_dialogue(npc)
	return true

# Show NPC dialogue
func _show_dialogue(npc: Dictionary):
	var dialogue = npc.get("dialogue", [])
	if dialogue.is_empty():
		_log_info("InteractionManager", "%s: Hello, traveler!" % npc.name)
		return
	
	# Show first dialogue line (would integrate with UI system)
	var first_line = dialogue[0] if dialogue.size() > 0 else "Hello!"
	_log_info("InteractionManager", "%s: %s" % [npc.name, first_line])
	
	# TODO: Integrate with dialogue UI system

# ============================================================================
# ENCOUNTER INTERACTION SYSTEM (Existing)
# ============================================================================

# Handle encounter interaction
func handle_encounter_interaction(encounter: Dictionary):
	if encounter.is_empty():
		return
	
	var encounter_type = encounter.get("type", "")
	
	match encounter_type:
		"shop":
			handle_shop_interaction(encounter)
		"quest":
			handle_quest_interaction(encounter)
		"treasure":
			handle_treasure_interaction(encounter)
		"npc":
			handle_npc_interaction(encounter)
		"building":
			handle_building_interaction(encounter)
		_:
			_log_info("InteractionManager", "Unknown encounter type: %s" % encounter_type)

# Handle shop interaction
func handle_shop_interaction(encounter: Dictionary):
	if shop_manager and shop_manager.has_method("open_shop"):
		# Open the shop with the encounter data
		var shop_type = encounter.get("type", "general_store")
		var items = encounter.get("items", [])
		shop_manager.open_shop(shop_type, items)

		# Transition to shop scene
		if scene_manager:
			_fade_transition(true, 0.3, func():
				scene_manager.change_scene("res://scenes/Shop.tscn", 0.0)
				_fade_transition(false, 0.3))

# Handle quest interaction
func handle_quest_interaction(encounter: Dictionary):
	if quest_manager and quest_manager.has_method("offer_quest"):
		quest_manager.offer_quest(encounter.get("quest_data", {}))

# Handle treasure interaction
func handle_treasure_interaction(encounter: Dictionary):
	var loot_manager = get_node_or_null("/root/LootManager")
	if loot_manager:
		var treasure_data = encounter.get("treasure_data", {})
		var loot_items = treasure_data.get("items", [])
		for item in loot_items:
			loot_manager.add_to_inventory(item)

# Handle NPC interaction (encounter-based)
func handle_npc_interaction(encounter: Dictionary):
	var npc_data = encounter.get("npc_data", {})
	var npc_id = npc_data.get("id", "")
	if npc_id != "":
		interact_with_npc(npc_id)
	else:
		# Fallback to dialogue
		var dialogue = npc_data.get("dialogue", "")
		if dialogue != "":
			_log_info("InteractionManager", "NPC says: %s" % dialogue)

# Handle building interaction (encounter-based)
func handle_building_interaction(encounter: Dictionary):
	var building_data = encounter.get("building_data", {})
	var building_id = building_data.get("id", "")
	if building_id != "":
		enter_building(building_id)

# ============================================================================
# BUILDING TYPE HANDLERS
# ============================================================================

func _enter_shop(building_data: Dictionary) -> bool:
	if shop_manager:
		shop_manager.open_shop(building_data.get("shop_data", {}))
		return true
	return false

func _exit_shop():
	if shop_manager and shop_manager.has_method("close_shop"):
		shop_manager.close_shop()

func _enter_inn(building_data: Dictionary) -> bool:
	_log_info("InteractionManager", "Entered Inn: %s" % building_data.name)
	# TODO: Implement inn rest/heal functionality
	return true

func _exit_inn():
	_log_info("InteractionManager", "Exited Inn")

func _enter_blacksmith(building_data: Dictionary) -> bool:
	_log_info("InteractionManager", "Entered Blacksmith: %s" % building_data.name)
	# TODO: Implement blacksmith upgrade/enhancement functionality
	return true

func _enter_quest_giver(building_data: Dictionary) -> bool:
	var quest_id = building_data.get("quest_id", "")
	if quest_id != "" and quest_manager:
		quest_manager.offer_quest(quest_id)
		return true
	return false

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

func _find_interaction_zone(type: String, id: String) -> Dictionary:
	for zone in interaction_zones:
		if zone.type == type and zone.id == id:
			return zone
	return {}

func _setup_interaction_detection():
	# Set up periodic checks for interaction zones
	# This would be called from World scene's _process
	pass

# Fade transition effect
func _fade_transition(fade_out: bool, duration: float, callback: Callable = Callable()):
	if not world_scene:
		if callback.is_valid():
			callback.call()
		return
	
	# Create fade overlay - add to root so it survives scene transitions
	var fade_overlay = ColorRect.new()
	fade_overlay.color = Color.BLACK
	fade_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	fade_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	get_tree().root.add_child(fade_overlay)
	
	var start_alpha = 0.0 if fade_out else 1.0
	var end_alpha = 1.0 if fade_out else 0.0
	
	fade_overlay.modulate.a = start_alpha
	
	# Create tween from root to avoid issues with scene transitions
	var tween = get_tree().root.create_tween()
	tween.tween_property(fade_overlay, "modulate:a", end_alpha, duration)
	if callback.is_valid():
		tween.tween_callback(func():
			# Validate before accessing captured references
			if is_instance_valid(fade_overlay):
				fade_overlay.queue_free()
			if callback.is_valid():
				callback.call()
		)
	else:
		tween.tween_callback(func():
			if is_instance_valid(fade_overlay):
				fade_overlay.queue_free()
		)

# Check all interaction zones for proximity
func check_all_interactions(party_position: Vector2) -> Array:
	var nearby_interactions = []
	
	for zone in interaction_zones:
		var distance = party_position.distance_to(zone.position)
		if distance <= zone.interaction_range:
			nearby_interactions.append(zone)
	
	return nearby_interactions

# Clear all interaction zones (for scene cleanup)
func clear_interaction_zones():
	interaction_zones.clear()
	active_interaction = {}

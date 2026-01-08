extends Node

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

# TalentManager.gd - Handles talent points and tree state per hero

signal talent_point_allocated(hero_id, tree_id, talent_id)
# signal talents_reset(hero_id)  # Reserved for future use

# Map<hero_id, Map<tree_id, Map<talent_id, points>>>
var hero_talents: Dictionary = {}

func _ready():
	_log_info("TalentManager", "Initialized")

func get_hero_talents(hero_id: String) -> Dictionary:
	if not hero_talents.has(hero_id):
		# Build initial tree structure from talents.json
		hero_talents[hero_id] = _build_initial_tree(hero_id)
	return hero_talents[hero_id]

func initialize_hero_talents(hero_id: String, initial_talents = {}):
	if initial_talents is Dictionary and not initial_talents.is_empty():
		hero_talents[hero_id] = initial_talents.duplicate(true)
	else:
		get_hero_talents(hero_id) # Triggers _build_initial_tree if missing
	_log_info("TalentManager", "Initialized talents for hero %s" % hero_id)

func _build_initial_tree(hero_id: String) -> Dictionary:
	var pm = get_node_or_null("/root/PartyManager")
	if not pm: return {}
	var hero = pm.get_hero_by_id(hero_id)
	if not hero: return {}
	
	var class_id = hero.class_id
	var dm = get_node_or_null("/root/DataManager")
	var talents_data = dm.get_data("talents") if dm else null
	if not talents_data or not talents_data.has(class_id): return {}
	
	var tree_state = {}
	var class_trees = talents_data[class_id].get("trees", {})
	for tree_id in class_trees:
		tree_state[tree_id] = {}
		var talents = class_trees[tree_id].get("talents", {})
		for talent_id in talents:
			tree_state[tree_id][talent_id] = 0 # 0 points allocated
			
	return tree_state

func allocate_talent_point(hero_id: String, tree_id: String, talent_id: String) -> bool:
	var pm = get_node_or_null("/root/PartyManager")
	if not pm: return false
	var hero = pm.get_hero_by_id(hero_id)
	if not hero: return false
	
	if get_available_points(hero) <= 0:
		_log_warn("TalentManager", "No talent points available for hero %s" % hero_id)
		return false
		
	var talents = get_hero_talents(hero_id)
	if not talents.has(tree_id) or not talents[tree_id].has(talent_id):
		return false
		
	# Check max points
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return false
	
	var talents_data = dm.get_data("talents")
	if not talents_data: return false
	
	var class_id = hero.class_id
	if not talents_data.has(class_id): return false
	
	var class_trees = talents_data[class_id].get("trees", {})
	if not class_trees.has(tree_id): return false
	
	var tree_talents = class_trees[tree_id].get("talents", {})
	if not tree_talents.has(talent_id): return false
	
	var talent_def = tree_talents[talent_id]
	var max_points = talent_def.get("maxPoints", 1)
	
	if talents[tree_id][talent_id] >= max_points:
		return false
		
	# Check prerequisites
	if not _check_prerequisites(hero_id, tree_id, talent_def):
		return false
		
	talents[tree_id][talent_id] += 1
	
	# Recalculate stats
	var sc = get_node_or_null("/root/StatCalculator")
	if sc: sc.recalculate_hero_stats(hero)
	
	talent_point_allocated.emit(hero_id, tree_id, talent_id)
	return true

func _check_prerequisites(hero_id: String, tree_id: String, talent_def: Dictionary) -> bool:
	var prereq = talent_def.get("prerequisite")
	if not prereq: return true
	
	var talents = get_hero_talents(hero_id)
	
	# Tree points required
	if prereq.has("treePointsRequired"):
		var total_tree_points = 0
		var tree_stats = talents.get(tree_id, {})
		for t_id in tree_stats:
			total_tree_points += tree_stats[t_id]
		if total_tree_points < prereq["treePointsRequired"]:
			return false
			
	# Specific talent required
	if prereq.has("talentId") and prereq.has("pointsRequired"):
		var req_id = prereq["talentId"]
		var req_points = prereq["pointsRequired"]
		var tree_stats = talents.get(tree_id, {})
		if tree_stats.get(req_id, 0) < req_points:
			return false
			
	return true

func get_available_points(hero: Hero) -> int:
	var level = hero.level
	var total_points = max(0, level - 10) # 1 point per level after 10
	
	# Milestone bonuses
	for milestone in [20, 40, 60, 80, 100]:
		if level >= milestone:
			total_points += 1
			
	# Subtract allocated points
	var allocated = 0
	var talents = get_hero_talents(hero.id)
	for tree_id in talents:
		for talent_id in talents[tree_id]:
			allocated += talents[tree_id][talent_id]
			
	return total_points - allocated

func get_talent_bonuses(hero_id: String) -> Dictionary:
	var bonuses = {}
	var pm = get_node_or_null("/root/PartyManager")
	if not pm: return bonuses
	var hero = pm.get_hero_by_id(hero_id)
	if not hero: return bonuses
	
	var talents = get_hero_talents(hero_id)
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return bonuses
	
	var talents_data = dm.get_data("talents")
	if not talents_data: return bonuses
	
	var class_id = hero.class_id
	if not talents_data.has(class_id): return bonuses
	
	var class_trees = talents_data[class_id].get("trees", {})
	
	for tree_id in talents:
		var tree_talents = talents[tree_id]
		if not class_trees.has(tree_id): continue
		
		var tree_def = class_trees[tree_id].get("talents", {})
		
		for talent_id in tree_talents:
			var points = tree_talents[talent_id]
			if points > 0 and tree_def.has(talent_id):
				var talent_def = tree_def[talent_id]
				var effects = talent_def.get("effects", {})
				for effect in effects:
					var val = effects[effect]
					if typeof(val) == TYPE_FLOAT or typeof(val) == TYPE_INT:
						bonuses[effect] = bonuses.get(effect, 0) + (val * points)
					else:
						bonuses[effect] = val
						
	return bonuses

func get_save_data(hero_id: String = "all") -> Dictionary:
	if hero_id == "all":
		return hero_talents.duplicate(true)
	else:
		return {hero_id: get_hero_talents(hero_id)}

func load_save_data(save_data: Dictionary):
	hero_talents = save_data.duplicate(true)
	_log_info("TalentManager", "Loaded talents for %d heroes" % hero_talents.size())

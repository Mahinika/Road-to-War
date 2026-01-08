extends Node

# QuestManager.gd - Handles meta-tasks and rewards

signal quest_progress_updated(quest_id, current, target)
signal quest_completed(quest_id)

# Map<quest_id, {current_count: int, completed: bool}>
var player_quests: Dictionary = {}

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger: logger.info(source, message)
	else: print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("QuestManager", "Initialized")
	_load_quests()
	
	# Connect to relevant signals
	var wm = get_node_or_null("/root/WorldManager")
	if wm: wm.mile_changed.connect(_on_mile_changed)
	
	var cm = get_node_or_null("/root/CombatManager")
	if cm: cm.combat_ended.connect(_on_combat_ended)

func _load_quests():
	# Initial quest loading (could be from save or JSON)
	var dm = get_node_or_null("/root/DataManager")
	var data = dm.get_data("quests") if dm else null
	if not data: return
	
	for q_id in data.get("active_quests", {}):
		if not player_quests.has(q_id):
			player_quests[q_id] = {"current": 0, "completed": false}

func update_progress(quest_id: String, amount: int = 1):
	if not player_quests.has(quest_id) or player_quests[quest_id].completed: return
	
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return
	
	var data = dm.get_data("quests")
	if not data: return
	
	var q_data = data.get("active_quests", {}).get(quest_id, {})
	if q_data.is_empty(): return
	
	player_quests[quest_id].current += amount
	var target = q_data.get("target_count", 1)
	if q_data.get("type") == "reach_mile":
		target = q_data.get("target_mile", 1)
		player_quests[quest_id].current = amount # For mile, we set absolute
		
	quest_progress_updated.emit(quest_id, player_quests[quest_id].current, target)
	
	if player_quests[quest_id].current >= target:
		_complete_quest(quest_id)

func _complete_quest(quest_id: String):
	player_quests[quest_id].completed = true
	quest_completed.emit(quest_id)
	_log_info("QuestManager", "Quest completed: %s" % quest_id)
	
	# Grant rewards
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return
	
	var data = dm.get_data("quests")
	if not data: return
	
	var q_data = data.get("active_quests", {}).get(quest_id, {})
	var rewards = q_data.get("rewards", {})
	
	var shm = get_node_or_null("/root/ShopManager")
	if rewards.has("gold") and shm:
		shm.add_gold(rewards["gold"])
		
	var pm = get_node_or_null("/root/PartyManager")
	if rewards.has("experience") and pm:
		for hero in pm.heroes:
			hero.gain_experience(rewards["experience"])
	if rewards.has("talent_points") and pm:
		for hero in pm.heroes:
			hero.talent_points += rewards["talent_points"]
			
	# Notify visual
	var part_m = get_node_or_null("/root/ParticleManager")
	if part_m:
		part_m.create_floating_text(Vector2(960, 200), "Quest Completed: " + q_data.get("name", "Unknown"), Color.GOLD)

func _on_mile_changed(mile: int, _max: int, _old: int):
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return
	
	var data = dm.get_data("quests")
	if not data: return
	
	for q_id in player_quests:
		var q_data = data.get("active_quests", {}).get(q_id, {})
		if q_data.get("type") == "reach_mile":
			update_progress(q_id, mile)

func _on_combat_ended(victory: bool):
	if not victory: return
	
	# This is a bit simplified, ideally we track which enemies were killed
	# For now, let's assume if victory, we increment generic kill quests
	var cm = get_node_or_null("/root/CombatManager")
	if not cm or not cm.current_combat.has("enemies"): return
	
	var enemies = cm.current_combat.get("enemies", [])
	for enemy in enemies:
		if enemy.get("current_health", 0) <= 0:
			var enemy_id = enemy.get("id", "")
			_process_enemy_kill(enemy_id)

func _process_enemy_kill(enemy_id: String):
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return
	
	var data = dm.get_data("quests")
	if not data: return
	
	for q_id in player_quests:
		var q_data = data.get("active_quests", {}).get(q_id, {})
		if q_data.get("type") == "kill" and q_data.get("target_id") == enemy_id:
			update_progress(q_id, 1)

func get_save_data() -> Dictionary:
	return player_quests

func load_save_data(save_data: Dictionary):
	player_quests = save_data

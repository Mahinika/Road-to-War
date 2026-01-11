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

# SaveManager.gd - Handles game save/load functionality
# Uses Godot's built-in JSON and file system

var save_slots: Array = []
var max_save_slots: int = 3
var current_save_slot: int = 1

func _ready():
	_log_info("SaveManager", "Initialized")
	load_save_slots()

# @CRITICAL: Game save operation - collects data from all managers and persists to disk
# Used by: Options.gd (save button), auto-save system
# Changing this requires: Update collect_save_data() if new managers added, maintain save format compatibility
# Performance: File I/O operation, may take 50-200ms, not called during gameplay
func save_game(slot: int = -1) -> bool:
	if slot == -1:
		slot = current_save_slot
	
	if slot < 1 or slot > max_save_slots:
		_log_error("SaveManager", "Invalid save slot: %d" % slot)
		return false
	
	var save_data = collect_save_data()
	var file_path = "user://save_slot_%d.json" % slot
	
	var file = FileAccess.open(file_path, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(save_data))
		file.close()
		
		_log_info("SaveManager", "Game saved to slot %d" % slot)
		load_save_slots() # Refresh slots
		return true
	else:
		_log_error("SaveManager", "Failed to save game to slot %d" % slot)
		return false

# @CRITICAL: Game load operation - loads save data and applies to all managers via apply_save_data()
# Used by: SaveLoad.gd, MainMenu.gd (continue game)
# Changing this requires: Update apply_save_data() if save format changes, handle migration for old saves
# Performance: File I/O operation, may take 50-200ms, called during scene transitions
func load_game(slot: int = -1) -> Dictionary:
	if slot == -1:
		slot = current_save_slot
	
	if slot < 1 or slot > max_save_slots:
		_log_error("SaveManager", "Invalid save slot: %d" % slot)
		return {}
	
	var file_path = "user://save_slot_%d.json" % slot
	
	if not FileAccess.file_exists(file_path):
		_log_warn("SaveManager", "Save file does not exist: %s" % file_path)
		return {}
	
	var file = FileAccess.open(file_path, FileAccess.READ)
	if file:
		var content = file.get_as_text()
		file.close()
		
		var json = JSON.new()
		var error = json.parse(content)
		
		if error == OK:
			_log_info("SaveManager", "Game loaded from slot %d" % slot)
			return json.data
		else:
			_log_error("SaveManager", "Failed to parse save data from slot %d" % slot)
			return {}
	else:
		_log_error("SaveManager", "Failed to load save file: %s" % file_path)
		return {}

func delete_save(slot: int) -> bool:
	if slot < 1 or slot > max_save_slots:
		_log_error("SaveManager", "Invalid save slot: %d" % slot)
		return false
	
	var file_path = "user://save_slot_%d.json" % slot
	
	if FileAccess.file_exists(file_path):
		var error = DirAccess.remove_absolute(file_path)
		if error == OK:
			_log_info("SaveManager", "Save deleted from slot %d" % slot)
			load_save_slots()
			return true
		else:
			_log_error("SaveManager", "Failed to delete save from slot %d" % slot)
			return false
	else:
		_log_warn("SaveManager", "Save file does not exist: %s" % file_path)
		return false

func collect_save_data() -> Dictionary:
	var save_data = {
		"timestamp": Time.get_unix_time_from_system(),
		"version": "1.0.0",
		"slot": current_save_slot
	}
	
	# Collect data from managers
	var pm = get_node_or_null("/root/PartyManager")
	if pm: save_data["party"] = pm.get_save_data()
	
	var wm = get_node_or_null("/root/WorldManager")
	if wm: save_data["world"] = wm.get_save_data()
	
	var eq = get_node_or_null("/root/EquipmentManager")
	if eq: save_data["equipment"] = eq.get_save_data("all")
	
	var tm = get_node_or_null("/root/TalentManager")
	if tm: save_data["talents"] = tm.get_save_data("all")
	
	var bm = get_node_or_null("/root/BloodlineManager")
	if bm: save_data["bloodlines"] = bm.get_save_data()
	
	var st = get_node_or_null("/root/StatisticsManager")
	if st: save_data["statistics"] = st.get_save_data()
	
	var am = get_node_or_null("/root/AchievementManager")
	if am: save_data["achievements"] = am.get_save_data()
	
	var pr = get_node_or_null("/root/PrestigeManager")
	if pr: save_data["prestige"] = pr.get_save_data()
	
	var pb = get_node_or_null("/root/PrestigeBank")
	if pb: save_data["prestige_bank"] = pb.get_save_data()
	
	var brutal_m = get_node_or_null("/root/BrutalModeManager")
	if brutal_m: save_data["brutal_mode"] = brutal_m.get_save_data()
	
	var cm = get_node_or_null("/root/ChallengeModeManager")
	if cm: save_data["challenge_mode"] = cm.get_save_data()
	
	var rm = get_node_or_null("/root/ResourceManager")
	if rm: save_data["resources"] = rm.get_save_data()
	
	var lm = get_node_or_null("/root/LootManager")
	if lm: save_data["loot"] = lm.get_save_data()
	
	var sm = get_node_or_null("/root/ShopManager")
	if sm: save_data["shop"] = sm.get_save_data()
	
	return save_data

func load_save_slots():
	save_slots.clear()
	
	for slot in range(1, max_save_slots + 1):
		var file_path = "user://save_slot_%d.json" % slot
		var slot_data = {
			"slot": slot,
			"has_data": false,
			"timestamp": 0,
			"version": "",
			"stats": {}
		}
		
		if FileAccess.file_exists(file_path):
			var file = FileAccess.open(file_path, FileAccess.READ)
			if file:
				var content = file.get_as_text()
				file.close()
				
				var json = JSON.new()
				var error = json.parse(content)
				
				if error == OK:
					var data = json.data
					slot_data.has_data = true
					slot_data.timestamp = data.get("timestamp", 0)
					slot_data.version = data.get("version", "")
					
					# Extract stats for UI
					var party = data.get("party", {})
					if party.has("heroes"):
						var heroes = party["heroes"]
						slot_data["party_size"] = heroes.size()
						if heroes.size() > 0:
							slot_data["level"] = heroes[0].get("level", 1)
				else:
					_log_warn("SaveManager", "Failed to parse save slot %d" % slot)
		
		save_slots.append(slot_data)

func get_save_slots() -> Array:
	return save_slots.duplicate()

func set_current_slot(slot: int):
	if slot >= 1 and slot <= max_save_slots:
		current_save_slot = slot
		_log_info("SaveManager", "Current save slot set to: %d" % slot)

func get_current_slot() -> int:
	return current_save_slot

func format_timestamp(timestamp: int) -> String:
	var datetime = Time.get_datetime_dict_from_unix_time(timestamp)
	return "%04d-%02d-%02d %02d:%02d" % [
		datetime.year, datetime.month, datetime.day,
		datetime.hour, datetime.minute
	]

func apply_save_data(save_data: Dictionary):
	"""Apply loaded save data to managers"""
	var pm = get_node_or_null("/root/PartyManager")
	if save_data.has("party") and pm:
		pm.load_save_data(save_data.party)
		
	var wm = get_node_or_null("/root/WorldManager")
	if save_data.has("world") and wm:
		wm.load_save_data(save_data.world)
		
	var tm = get_node_or_null("/root/TalentManager")
	if save_data.has("talents") and tm:
		tm.load_save_data(save_data.talents)
		
	var eq = get_node_or_null("/root/EquipmentManager")
	if save_data.has("equipment") and eq:
		eq.load_save_data(save_data.equipment)
		
	var bm = get_node_or_null("/root/BloodlineManager")
	if save_data.has("bloodlines") and bm:
		bm.load_save_data(save_data.bloodlines)
		
	var st = get_node_or_null("/root/StatisticsManager")
	if save_data.has("statistics") and st:
		st.load_save_data(save_data.statistics)
		
	var am = get_node_or_null("/root/AchievementManager")
	if save_data.has("achievements") and am:
		am.load_save_data(save_data.achievements)
		
	var pr = get_node_or_null("/root/PrestigeManager")
	if save_data.has("prestige") and pr:
		pr.load_save_data(save_data.prestige)
	
	var pb = get_node_or_null("/root/PrestigeBank")
	if save_data.has("prestige_bank") and pb:
		pb.load_save_data(save_data.prestige_bank)
	
	var brutal_m = get_node_or_null("/root/BrutalModeManager")
	if save_data.has("brutal_mode") and brutal_m:
		brutal_m.load_save_data(save_data.brutal_mode)
	
	var cm = get_node_or_null("/root/ChallengeModeManager")
	if save_data.has("challenge_mode") and cm:
		cm.load_save_data(save_data.challenge_mode)
		
	var rm = get_node_or_null("/root/ResourceManager")
	if save_data.has("resources") and rm:
		rm.load_save_data(save_data.resources)
		
	var lm = get_node_or_null("/root/LootManager")
	if save_data.has("loot") and lm:
		lm.load_save_data(save_data.loot)
		
	var sm = get_node_or_null("/root/ShopManager")
	if save_data.has("shop") and sm:
		sm.load_save_data(save_data.shop)
	
	# Recalculate all hero stats after loading equipment and talents
	var sc = get_node_or_null("/root/StatCalculator")
	if pm and sc:
		for hero in pm.heroes:
			sc.recalculate_hero_stats(hero)
	
	_log_info("SaveManager", "All manager data applied and stats recalculated")

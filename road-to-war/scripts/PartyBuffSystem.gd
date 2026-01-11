extends Node

# PartyBuffSystem.gd - Manages persistent party-wide buffs (Arcane Intellect, Power Word: Fortitude, Auras, etc.)
# These are different from combat status effects - they're persistent stat modifiers

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

# Map<buff_id, {caster_id: String, duration: float, stat_modifiers: Dictionary, expires_at: float}>
var active_buffs: Dictionary = {}

# Buff definitions - stat modifiers and duration
var buff_definitions: Dictionary = {
	"arcane_intellect": {
		"name": "Arcane Intellect",
		"duration": 3600.0,  # 1 hour (persistent until combat ends or recast)
		"stat_modifiers": {
			"intellect": 0.10  # 10% intellect bonus
		},
		"icon": "🧠",
		"color": "00aaff"
	},
	"power_word_fortitude": {
		"name": "Power Word: Fortitude",
		"duration": 3600.0,
		"stat_modifiers": {
			"stamina": 0.10  # 10% stamina bonus
		},
		"icon": "💪",
		"color": "ffffff"
	},
	"devotion_aura": {
		"name": "Devotion Aura",
		"duration": -1.0,  # Permanent while active
		"stat_modifiers": {
			"armor": 0.05  # 5% armor bonus
		},
		"icon": "🛡",
		"color": "ffd700"
	},
	"retribution_aura": {
		"name": "Retribution Aura",
		"duration": -1.0,
		"stat_modifiers": {
			"attack": 0.05  # 5% attack power bonus
		},
		"icon": "⚔",
		"color": "ff6600"
	},
	"aspect_of_the_hawk": {
		"name": "Aspect of the Hawk",
		"duration": -1.0,
		"stat_modifiers": {
			"ranged_attack": 0.10  # 10% ranged attack bonus
		},
		"icon": "🦅",
		"color": "8b4513"
	},
	"aspect_of_the_cheetah": {
		"name": "Aspect of the Cheetah",
		"duration": -1.0,
		"stat_modifiers": {
			"movement_speed": 0.30  # 30% movement speed bonus
		},
		"icon": "🐆",
		"color": "ffaa00"
	}
}

func _ready():
	_log_info("PartyBuffSystem", "Initialized")

# Apply a party buff (affects all party members)
func apply_party_buff(buff_id: String, caster_id: String, custom_duration: float = -1.0):
	if not buff_definitions.has(buff_id):
		_log_warn("PartyBuffSystem", "Unknown buff ID: %s" % buff_id)
		return
	
	var buff_def = buff_definitions[buff_id]
	var duration = custom_duration if custom_duration >= 0.0 else buff_def["duration"]
	var expires_at = -1.0 if duration < 0.0 else Time.get_ticks_msec() / 1000.0 + duration
	
	active_buffs[buff_id] = {
		"caster_id": caster_id,
		"duration": duration,
		"stat_modifiers": buff_def["stat_modifiers"].duplicate(),
		"expires_at": expires_at,
		"applied_at": Time.get_ticks_msec() / 1000.0
	}
	
	_log_info("PartyBuffSystem", "%s applied %s to party (duration: %s)" % [caster_id, buff_def["name"], "permanent" if duration < 0.0 else str(duration) + "s"])
	
	# Emit signal for UI updates
	party_buff_applied.emit(buff_id, caster_id)

# Remove a party buff
func remove_party_buff(buff_id: String):
	if active_buffs.has(buff_id):
		var buff_name = buff_definitions.get(buff_id, {}).get("name", buff_id)
		active_buffs.erase(buff_id)
		_log_info("PartyBuffSystem", "Removed %s from party" % buff_name)
		party_buff_removed.emit(buff_id)

# Check if a buff is active
func has_buff(buff_id: String) -> bool:
	if not active_buffs.has(buff_id):
		return false
	
	var buff = active_buffs[buff_id]
	if buff["expires_at"] < 0.0:
		return true  # Permanent buff
	
	return Time.get_ticks_msec() / 1000.0 < buff["expires_at"]

# Get all active buffs
func get_active_buffs() -> Dictionary:
	var current_time = Time.get_ticks_msec() / 1000.0
	var valid_buffs: Dictionary = {}
	
	for buff_id in active_buffs.keys():
		var buff = active_buffs[buff_id]
		if buff["expires_at"] < 0.0 or current_time < buff["expires_at"]:
			valid_buffs[buff_id] = buff
		else:
			# Expired, remove it
			_log_debug("PartyBuffSystem", "Buff %s expired" % buff_id)
			active_buffs.erase(buff_id)
			party_buff_removed.emit(buff_id)
	
	return valid_buffs

# Get stat modifiers from all active buffs
func get_stat_modifiers() -> Dictionary:
	var modifiers: Dictionary = {}
	var active = get_active_buffs()
	
	for buff_id in active.keys():
		var buff = active[buff_id]
		var stat_mods = buff["stat_modifiers"]
		
		for stat_name in stat_mods.keys():
			var bonus = stat_mods[stat_name]
			if modifiers.has(stat_name):
				modifiers[stat_name] += bonus
			else:
				modifiers[stat_name] = bonus
	
	return modifiers

# Clear all buffs (e.g., when combat ends or party resets)
func clear_all_buffs():
	var buff_ids = active_buffs.keys()
	active_buffs.clear()
	for buff_id in buff_ids:
		party_buff_removed.emit(buff_id)
	_log_info("PartyBuffSystem", "Cleared all party buffs")

# Clear buffs from a specific caster (e.g., when hero dies or leaves party)
func clear_buffs_from_caster(caster_id: String):
	var to_remove: Array = []
	for buff_id in active_buffs.keys():
		if active_buffs[buff_id]["caster_id"] == caster_id:
			to_remove.append(buff_id)
	
	for buff_id in to_remove:
		remove_party_buff(buff_id)

signal party_buff_applied(buff_id: String, caster_id: String)
signal party_buff_removed(buff_id: String)

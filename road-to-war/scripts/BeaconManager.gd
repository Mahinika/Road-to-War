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

# BeaconManager.gd - Handles Beacon of Light mechanics
# Only one beacon can be active at a time per caster

signal beacon_applied(caster_id, target_id)
signal beacon_removed(caster_id, target_id)
signal beacon_healing_redirected(original_target, beacon_target, healing_amount)

# Map<caster_id, {target_id: String, redirect_percent: float, expiration_time: float}>
var active_beacons: Dictionary = {}

func _ready():
	_log_info("BeaconManager", "Initialized")

func _process(delta):
	# Check for expired beacons
	var current_time = Time.get_ticks_msec() / 1000.0
	var expired_beacons = []
	
	for caster_id in active_beacons.keys():
		var beacon_data = active_beacons[caster_id]
		if beacon_data.has("expiration_time") and current_time >= beacon_data.expiration_time:
			expired_beacons.append(caster_id)
	
	# Remove expired beacons
	for caster_id in expired_beacons:
		var target_id = active_beacons[caster_id].get("target_id", "")
		_remove_beacon(caster_id, target_id, "expired")

func apply_beacon(caster_id: String, target_id: String, redirect_percent: float = 1.0, duration: float = 300.0) -> bool:
	"""Apply Beacon of Light to a target. Only one beacon per caster."""
	
	# Remove existing beacon if any
	if active_beacons.has(caster_id):
		var old_target = active_beacons[caster_id].get("target_id", "")
		_remove_beacon(caster_id, old_target, "replaced")
	
	# Apply new beacon
	var beacon_data = {
		"target_id": target_id,
		"redirect_percent": redirect_percent,
		"expiration_time": (Time.get_ticks_msec() / 1000.0) + duration
	}
	
	active_beacons[caster_id] = beacon_data
	beacon_applied.emit(caster_id, target_id)
	
	_log_info("BeaconManager", "Beacon applied: %s -> %s (%.0f%% redirect, %.1fs duration)" %
		[caster_id, target_id, redirect_percent * 100, duration])
	
	return true

func remove_beacon(caster_id: String) -> bool:
	"""Remove beacon from caster"""
	if not active_beacons.has(caster_id):
		return false
	
	var target_id = active_beacons[caster_id].get("target_id", "")
	_remove_beacon(caster_id, target_id, "removed")
	return true

func get_beacon_target(caster_id: String) -> String:
	"""Get the target of caster's beacon, empty string if none"""
	if not active_beacons.has(caster_id):
		return ""
	return active_beacons[caster_id].get("target_id", "")

func has_beacon(caster_id: String) -> bool:
	"""Check if caster has an active beacon"""
	return active_beacons.has(caster_id)

func get_beacon_data(caster_id: String) -> Dictionary:
	"""Get full beacon data for caster"""
	if not active_beacons.has(caster_id):
		return {}
	return active_beacons[caster_id].duplicate()

func redirect_healing(original_target_id: String, healing_amount: float) -> Dictionary:
	"""
	Check if any beacon should redirect healing to this target.
	Returns {redirected_amount: float, beacon_caster: String, beacon_target: String}
	"""
	var redirect_data = {
		"redirected_amount": 0.0,
		"beacon_caster": "",
		"beacon_target": ""
	}
	
	# Find if original target has a beacon on them
	for caster_id in active_beacons.keys():
		var beacon_data = active_beacons[caster_id]
		var beacon_target = beacon_data.get("target_id", "")
		
		if beacon_target == original_target_id:
			var redirect_percent = beacon_data.get("redirect_percent", 1.0)
			var redirected_amount = healing_amount * redirect_percent
			
			redirect_data.redirected_amount = redirected_amount
			redirect_data.beacon_caster = caster_id
			redirect_data.beacon_target = beacon_target
			
			beacon_healing_redirected.emit(original_target_id, beacon_target, redirected_amount)
			
			_log_debug("BeaconManager", "Healing redirected: %s healed %s, %s received %.1f healing" %
				[caster_id, original_target_id, beacon_target, redirected_amount])
			
			break  # Only one beacon can redirect to each target
	
	return redirect_data

func _remove_beacon(caster_id: String, target_id: String, reason: String):
	"""Internal method to remove beacon"""
	if active_beacons.has(caster_id):
		active_beacons.erase(caster_id)
		beacon_removed.emit(caster_id, target_id)
		_log_info("BeaconManager", "Beacon removed: %s -> %s (%s)" % [caster_id, target_id, reason])

# Save/Load functionality
func get_save_data() -> Dictionary:
	"""Get save data for beacons"""
	var save_data = {}
	for caster_id in active_beacons.keys():
		var beacon_data = active_beacons[caster_id]
		# Convert expiration time to remaining duration
		var current_time = Time.get_ticks_msec() / 1000.0
		var remaining_time = beacon_data.get("expiration_time", current_time) - current_time
		
		if remaining_time > 0:
			save_data[caster_id] = {
				"target_id": beacon_data.get("target_id", ""),
				"redirect_percent": beacon_data.get("redirect_percent", 1.0),
				"remaining_duration": remaining_time
			}
	
	return save_data

func load_save_data(save_data: Dictionary):
	"""Load beacon data from save"""
	active_beacons.clear()
	
	var current_time = Time.get_ticks_msec() / 1000.0
	for caster_id in save_data.keys():
		var beacon_save = save_data[caster_id]
		var beacon_data = {
			"target_id": beacon_save.get("target_id", ""),
			"redirect_percent": beacon_save.get("redirect_percent", 1.0),
			"expiration_time": current_time + beacon_save.get("remaining_duration", 0.0)
		}
		
		active_beacons[caster_id] = beacon_data
		
		_log_info("BeaconManager", "Loaded beacon: %s -> %s" % [caster_id, beacon_data.target_id])
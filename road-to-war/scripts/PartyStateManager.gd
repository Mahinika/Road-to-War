extends Node

# PartyStateManager.gd - Party state management
# Migrated from src/utils/party-state-manager.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var party_manager: Node = null
var state_snapshots: Dictionary = {}

func _ready():
	party_manager = get_node_or_null("/root/PartyManager")
	_log_info("PartyStateManager", "Initialized")

# Create a snapshot of current party state
func create_snapshot() -> Dictionary:
	if not party_manager:
		return {}
	
	var snapshot = {
		"timestamp": Time.get_ticks_msec(),
		"heroes": []
	}
	
	if party_manager.has("heroes"):
		for hero in party_manager.heroes:
			snapshot["heroes"].append(_snapshot_hero(hero))
	
	return snapshot

# Snapshot a single hero
func _snapshot_hero(hero: Dictionary) -> Dictionary:
	return {
		"id": hero.get("id", ""),
		"level": hero.get("level", 1),
		"current_health": hero.get("current_stats", {}).get("health", 100),
		"max_health": hero.get("current_stats", {}).get("maxHealth", 100),
		"experience": hero.get("experience", 0),
		"equipment": hero.get("equipment", {}),
		"talents": hero.get("talents", {})
	}

# Restore party state from snapshot
func restore_snapshot(snapshot: Dictionary):
	if snapshot.is_empty() or not party_manager:
		return
	
	if snapshot.has("heroes"):
		for hero_snapshot in snapshot["heroes"]:
			var hero = party_manager.get_hero_by_id(hero_snapshot.get("id", "")) if party_manager.has_method("get_hero_by_id") else null
			if hero:
				_restore_hero(hero, hero_snapshot)

# Restore a single hero
func _restore_hero(hero: Dictionary, snapshot: Dictionary):
	if hero.has("current_stats"):
		hero["current_stats"]["health"] = snapshot.get("current_health", 100)
		hero["current_stats"]["maxHealth"] = snapshot.get("max_health", 100)
	
	if hero.has("level"):
		hero["level"] = snapshot.get("level", 1)
	
	if hero.has("experience"):
		hero["experience"] = snapshot.get("experience", 0)
	
	if hero.has("equipment"):
		hero["equipment"] = snapshot.get("equipment", {})
	
	if hero.has("talents"):
		hero["talents"] = snapshot.get("talents", {})

# Synchronize party state across systems
func synchronize_state():
	if not party_manager:
		return
	
	# Trigger updates in dependent systems
	var equipment_manager = get_node_or_null("/root/EquipmentManager")
	if equipment_manager and equipment_manager.has_method("update_all_heroes"):
		equipment_manager.update_all_heroes()
	
	var talent_manager = get_node_or_null("/root/TalentManager")
	if talent_manager and talent_manager.has_method("update_all_heroes"):
		talent_manager.update_all_heroes()


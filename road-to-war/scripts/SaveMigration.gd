extends Node

# SaveMigration.gd - Save file migration utilities
# Migrated from src/utils/save-migration.js

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

const CURRENT_SAVE_VERSION = 2

func _ready():
	_log_info("SaveMigration", "Initialized")

# Migrate save data to current version
func migrate_save_data(save_data: Dictionary) -> Dictionary:
	var version = save_data.get("version", 0)
	
	if version == CURRENT_SAVE_VERSION:
		return save_data  # Already current version
	
	_log_info("SaveMigration", "Migrating save from version %d to %d" % [version, CURRENT_SAVE_VERSION])
	
	# Apply migrations in order
	if version < 1:
		save_data = migrate_to_v1(save_data)
	
	if version < 2:
		save_data = migrate_to_v2(save_data)
	
	save_data["version"] = CURRENT_SAVE_VERSION
	return save_data

# Migrate to version 1
func migrate_to_v1(save_data: Dictionary) -> Dictionary:
	_log_info("SaveMigration", "Applying migration to v1")
	
	# Add version field if missing
	if not save_data.has("version"):
		save_data["version"] = 1
	
	# Migrate party structure if needed
	if save_data.has("party") and save_data["party"] is Array:
		# Convert old array format to new structure
		var new_party = {"heroes": save_data["party"]}
		save_data["party"] = new_party
	
	return save_data

# Migrate to version 2
func migrate_to_v2(save_data: Dictionary) -> Dictionary:
	_log_info("SaveMigration", "Applying migration to v2")
	
	# Add new fields or restructure data
	if save_data.has("party") and save_data["party"].has("heroes"):
		for hero in save_data["party"]["heroes"]:
			# Ensure heroes have required fields
			if not hero.has("talents"):
				hero["talents"] = {}
			if not hero.has("equipment"):
				hero["equipment"] = {}
	
	return save_data

# Check if save needs migration
func needs_migration(save_data: Dictionary) -> bool:
	var version = save_data.get("version", 0)
	return version < CURRENT_SAVE_VERSION


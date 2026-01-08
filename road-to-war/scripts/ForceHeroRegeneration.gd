extends Node

# ForceHeroRegeneration.gd - Force sprite regeneration debug utility
# Migrated from src/utils/force-hero-regeneration.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("ForceHeroRegeneration", "Initialized")

# Force regeneration of a hero sprite
func force_regenerate_hero(hero_id: String):
	var party_manager = get_node_or_null("/root/PartyManager")
	if not party_manager:
		_log_info("ForceHeroRegeneration", "PartyManager not found")
		return
	
	var hero = party_manager.get_hero_by_id(hero_id) if party_manager.has_method("get_hero_by_id") else null
	if not hero:
		_log_info("ForceHeroRegeneration", "Hero %s not found" % hero_id)
		return
	
	# Get hero sprite generator
	var hero_sprite = get_node_or_null("/root/HeroSprite")
	if hero_sprite and hero_sprite.has_method("regenerate_sprite"):
		hero_sprite.regenerate_sprite(hero_id)
		_log_info("ForceHeroRegeneration", "Regenerated sprite for hero %s" % hero_id)
	else:
		_log_info("ForceHeroRegeneration", "HeroSprite not found or missing regenerate_sprite method")

# Force regeneration of all heroes
func force_regenerate_all_heroes():
	var party_manager = get_node_or_null("/root/PartyManager")
	if not party_manager:
		return
	
	if party_manager.has("heroes"):
		for hero in party_manager.heroes:
			if hero.has("id"):
				force_regenerate_hero(hero["id"])


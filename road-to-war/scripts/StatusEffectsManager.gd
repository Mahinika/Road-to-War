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

# StatusEffectsManager.gd - Handles all status effects on combatants

signal effect_applied(combatant_id, effect_type)
signal effect_removed(combatant_id, effect_type)

var effect_types = {
	"stun": { "name": "Stun", "duration": 1, "icon": "⚡", "color": "ffff00", "stackable": false },
	"bleed": { "name": "Bleed", "duration": 3, "damage_per_turn": 5, "icon": "🩸", "color": "ff0000", "stackable": true },
	"poison": { "name": "Poison", "duration": 4, "damage_per_turn": 3, "icon": "☠", "color": "00ff00", "stackable": true },
	"shield": { "name": "Shield", "duration": 3, "absorb_amount": 20, "icon": "🛡", "color": "0088ff", "stackable": false },
	"regeneration": { "name": "Regeneration", "duration": 3, "heal_per_turn": 10, "icon": "✨", "color": "00ff88", "stackable": false },
	"buff_attack": { "name": "Attack Buff", "duration": 3, "stat_modifier": 0.25, "icon": "⚔", "color": "ff8800", "stackable": false },
	"buff_defense": { "name": "Defense Buff", "duration": 3, "stat_modifier": 0.25, "icon": "🛡", "color": "0088ff", "stackable": false }
}

# Map<combatant_id, Map<effect_type, {turns_remaining: int, stacks: int, custom_data: Dictionary}>>
var active_effects: Dictionary = {}

func _ready():
	_log_info("StatusEffectsManager", "Initialized")

func apply_effect(combatant_id: String, effect_type: String, duration: int = -1, custom_data: Dictionary = {}):
	if not effect_types.has(effect_type): return
	
	var def = effect_types[effect_type]
	var eff_duration = duration if duration != -1 else def["duration"]
	
	if not active_effects.has(combatant_id):
		active_effects[combatant_id] = {}
		
	var effects = active_effects[combatant_id]
	
	if not def["stackable"] and effects.has(effect_type):
		effects[effect_type]["turns_remaining"] = max(effects[effect_type]["turns_remaining"], eff_duration)
	elif def["stackable"] and effects.has(effect_type):
		effects[effect_type]["stacks"] += 1
		effects[effect_type]["turns_remaining"] = eff_duration
	else:
		effects[effect_type] = {
			"turns_remaining": eff_duration,
			"stacks": 1,
			"custom_data": custom_data
		}
		
	effect_applied.emit(combatant_id, effect_type)

func process_turn(combatant_id: String) -> Dictionary:
	var results = {"damage": 0.0, "healing": 0.0, "stat_mods": {}, "stunned": false}
	if not active_effects.has(combatant_id): return results
	
	var effects = active_effects[combatant_id]
	var to_remove = []
	
	for type in effects.keys():
		var data = effects[type]
		var def = effect_types[type]
		
		match type:
			"stun": results["stunned"] = true
			"bleed", "poison":
				results["damage"] += def.get("damage_per_turn", 0) * data["stacks"]
			"regeneration":
				results["healing"] += def.get("heal_per_turn", 0)
			"buff_attack", "buff_defense":
				var stat = "attack" if "attack" in type else "defense"
				results["stat_mods"][stat] = results["stat_mods"].get(stat, 0.0) + def.get("stat_modifier", 0.0)
				
		data["turns_remaining"] -= 1
		if data["turns_remaining"] <= 0:
			to_remove.append(type)
			
	for type in to_remove:
		effects.erase(type)
		effect_removed.emit(combatant_id, type)
		
	return results

func has_effect(combatant_id: String, effect_type: String) -> bool:
	if not active_effects.has(combatant_id): return false
	return active_effects[combatant_id].has(effect_type)

func get_active_effects(combatant_id: String) -> Dictionary:
	return active_effects.get(combatant_id, {})

func clear_effects(combatant_id: String):
	if active_effects.has(combatant_id):
		active_effects.erase(combatant_id)

func get_shield_amount(combatant_id: String) -> float:
	if not active_effects.has(combatant_id): return 0.0
	var effects = active_effects[combatant_id]
	if not effects.has("shield"): return 0.0
	
	return effects["shield"]["custom_data"].get("remaining_amount", effect_types["shield"]["absorb_amount"])


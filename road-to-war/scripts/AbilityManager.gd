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

# AbilityManager.gd - Handles hero abilities, cooldowns, and selection

signal ability_cooldown_updated(hero_id, ability_name, cooldown, max_cooldown)

# Map<hero_id, Map<ability_name, current_cooldown>>
var cooldowns: Dictionary = {}
# Map<hero_id, Array<ability_name>> usage history
var ability_history: Dictionary = {}

func _ready():
	_log_info("AbilityManager", "Initialized")

func initialize_hero_cooldowns(hero_id: String):
	if not cooldowns.has(hero_id):
		cooldowns[hero_id] = {}
	if not ability_history.has(hero_id):
		ability_history[hero_id] = []

func update_cooldowns():
	for hero_id in cooldowns:
		var hero_cooldowns = cooldowns[hero_id]
		for ability_name in hero_cooldowns.keys():
			if hero_cooldowns[ability_name] > 0:
				hero_cooldowns[ability_name] -= 1
				var ability_def = get_ability_definition(hero_id, ability_name)
				var max_cd = ability_def.get("cooldown", 0)
				ability_cooldown_updated.emit(hero_id, ability_name, hero_cooldowns[ability_name], max_cd)

func is_on_cooldown(hero_id: String, ability_name: String) -> bool:
	if not cooldowns.has(hero_id): return false
	return cooldowns[hero_id].get(ability_name, 0) > 0

func set_cooldown(hero_id: String, ability_name: String):
	var ability_def = get_ability_definition(hero_id, ability_name)
	if not ability_def or ability_def.get("cooldown", 0) <= 0: return
	
	initialize_hero_cooldowns(hero_id)
	cooldowns[hero_id][ability_name] = ability_def["cooldown"]
	
	# Update history
	var history = ability_history[hero_id]
	history.append(ability_name)
	if history.size() > 10:
		history.remove_at(0)
		
	ability_cooldown_updated.emit(hero_id, ability_name, ability_def["cooldown"], ability_def["cooldown"])

func get_ability_definition(hero_id: String, ability_name: String) -> Dictionary:
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return {}
	
	var abilities_data = dm.get_data("abilities")
	if not abilities_data: return {}
	
	# Check general
	if abilities_data.get("general", {}).has(ability_name):
		return abilities_data["general"][ability_name]
		
	# Check class
	var pm = get_node_or_null("/root/PartyManager")
	var hero = pm.get_hero_by_id(hero_id) if pm else null
	if hero and abilities_data.has(hero.class_id) and abilities_data[hero.class_id].has(ability_name):
		return abilities_data[hero.class_id][ability_name]
		
	return {}

func select_ability(hero, context: Dictionary) -> String:
	var available = get_available_abilities(hero)
	if available.is_empty(): return "auto_attack"
	
	var rm = get_node_or_null("/root/ResourceManager")
	var enemies = context.get("enemies", [])
	var target = context.get("target", {})
	
	# Healer AI uses utility-scoring for ALL decisions (including emergency/interrupt logic).
	# This keeps the behavior tunable and less threshold-brittle while preserving determinism elsewhere.
	if hero.role == "healer":
		return _select_healer_ability(hero, available, context, rm)
	
	# Tank AI uses utility-scoring for ALL decisions (full-scoring policy).
	# This bypasses the shared emergency/interrupt overrides so tank scoring can decide tradeoffs.
	if hero.role == "tank":
		return _select_tank_ability(hero, available, enemies, target, rm)
	
	# 1. Emergency Survival (All Roles)
	var max_hp := float(hero.current_stats.get("maxHealth", 100))
	var hp_pct: float = float(hero.current_stats.get("health", 0)) / max(1.0, max_hp)
	if hp_pct < 0.2:
		if hero.class_id == "paladin":
			if "divine_shield" in available and _can_afford(hero.id, "divine_shield", rm): return "divine_shield"
			if "lay_on_hands" in available: return "lay_on_hands"
		elif hero.class_id == "rogue":
			if "evasion" in available and _can_afford(hero.id, "evasion", rm): return "evasion"
		elif hero.class_id == "mage":
			if "ice_block" in available and _can_afford(hero.id, "ice_block", rm): return "ice_block"
	
	# 2. Interrupts (High Priority)
	if _is_target_casting(target):
		if hero.class_id == "rogue" and "kick" in available and _can_afford(hero.id, "kick", rm): return "kick"
		if hero.class_id == "mage" and "counterspell" in available and _can_afford(hero.id, "counterspell", rm): return "counterspell"
		if hero.class_id == "shaman" and "earth_shock" in available and _can_afford(hero.id, "earth_shock", rm): return "earth_shock"
	
	# 3. Role-Specific Logic
	match hero.role:
		"tank": return _select_tank_ability(hero, available, enemies, target, rm)
		"healer": return _select_healer_ability(hero, available, context, rm)
		"dps": return _select_dps_ability(hero, available, enemies, target, rm)
		
	return available[0]

func _is_target_casting(target: Dictionary) -> bool:
	# Check if target has a cast timer or property indicating it's currently casting
	return target.get("is_casting", false) or target.get("cast_timer", 0.0) > 0.0

func _select_tank_ability(hero, available: Array, enemies: Array, _target: Dictionary, rm) -> String:
	# Utility scoring: evaluate candidate abilities and pick the best match for current fight state.
	var enemy_count: int = enemies.size()
	var aoe_needed := enemy_count >= 3
	var max_hp := float(hero.current_stats.get("maxHealth", 100))
	var self_hp_pct: float = float(hero.current_stats.get("health", 0)) / max(1.0, max_hp)
	var target_casting := _is_target_casting(_target)
	
	var best_ability := "auto_attack"
	var best_score := -999999.0
	var scored: Array = [] # [{name: String, score: float}]
	
	for ability_name in available:
		var def := get_ability_definition(hero.id, ability_name)
		if ability_name != "auto_attack" and def.is_empty():
			continue
		
		var score := _score_tank_candidate(hero, ability_name, def, enemy_count, aoe_needed, self_hp_pct, target_casting, rm)
		scored.append({"name": ability_name, "score": score})
		if score > best_score:
			best_score = score
			best_ability = ability_name
	
	# Small variety: choose randomly among near-tied best options.
	var near_best: Array = []
	var EPS := 1.5
	for entry in scored:
		if float(entry.get("score", -999999.0)) >= best_score - EPS:
			near_best.append(entry.get("name", "auto_attack"))
	
	if near_best.size() > 1:
		best_ability = str(near_best[randi() % near_best.size()])
	
	return best_ability

func _score_tank_candidate(hero, ability_name: String, def: Dictionary, enemy_count: int, aoe_needed: bool, self_hp_pct: float, target_casting: bool, rm) -> float:
	# Tunable weights (kept local to tank AI)
	# “More tanky” tuning: prioritize mitigation earlier and more strongly; slightly de-emphasize AoE threat.
	const W_AOE_THREAT := 135.0
	const W_SINGLE_THREAT := 120.0
	const W_MITIGATION := 255.0
	const W_INTERRUPT := 130.0
	const W_EMERGENCY := 310.0
	const W_COST_PENALTY := 35.0
	const W_LOW_RESOURCE_PENALTY := 55.0
	
	var ability_type := "attack"
	if not def.is_empty():
		ability_type = str(def.get("type", "attack"))
	
	var name_lc := ability_name.to_lower()
	var is_interrupt := (ability_name in ["kick", "counterspell", "earth_shock"]) or ability_type == "interrupt"
	var is_emergency := ability_name in ["divine_shield", "ice_block", "evasion", "lay_on_hands"]
	
	# Heuristics for common tank kit actions
	var is_aoe_threat := ability_name in ["consecration", "thunder_clap"] or ("consecration" in name_lc) or ("thunder" in name_lc and "clap" in name_lc)
	var is_mitigation := ability_name in ["holy_shield", "shield_block"] or ("shield" in name_lc and not is_aoe_threat) or ability_type == "shield"
	var is_single_threat := ability_name in ["shield_slam", "avengers_shield", "judgment", "rend"] or ("shield_slam" in name_lc) or ("judgment" in name_lc) or ("rend" in name_lc)
	
	# Danger scales up earlier so the tank “plays safer” (smooth curve, not a hard threshold).
	# Starts ramping at 60% HP and reaches max at 20% HP.
	var danger: float = clamp((0.60 - self_hp_pct) / 0.40, 0.0, 1.0)
	var emergency := 1.0 if self_hp_pct < 0.20 else 0.0
	
	var score := 0.0
	
	# Emergency defensives (rare but high value when tank is about to die)
	if is_emergency:
		score += W_EMERGENCY * emergency
	
	# Interrupt when target is casting
	if is_interrupt:
		score += W_INTERRUPT if target_casting else 0.0
	
	# AoE threat priority in multi-enemy fights
	if aoe_needed and is_aoe_threat:
		# Slight boost as enemy_count grows beyond 3
		var count_bonus: float = clamp(float(enemy_count - 3) * 0.15, 0.0, 0.6)
		score += W_AOE_THREAT * (1.0 + count_bonus)
	
	# Mitigation priority when in danger
	if is_mitigation:
		# Baseline bias towards mitigation even when not in danger (more “tank-y” feel).
		score += 35.0
		score += W_MITIGATION * danger
	
	# Single-target threat when not AoE-focused
	if not aoe_needed and is_single_threat:
		score += W_SINGLE_THREAT
	
	# If AoE is needed but we don't have AoE threat options, prefer stable single-target threat as fallback.
	if aoe_needed and not is_aoe_threat and is_single_threat:
		score += W_SINGLE_THREAT * 0.55
	
	# Resource discipline
	var resource_type := str(def.get("resourceType", "mana")) if not def.is_empty() else "mana"
	var cost := float(def.get("cost", 0.0)) if not def.is_empty() else 0.0
	var ratio := _get_resource_ratio(hero.id, resource_type, rm)
	var low_resource := 1.0 if ratio < 0.20 else 0.0
	
	var cost_ratio := 0.0
	if rm and rm.hero_resources is Dictionary and rm.hero_resources.has(hero.id):
		var max_value := float(rm.hero_resources[hero.id].get("max_" + resource_type, 0.0))
		if max_value > 0.0:
			cost_ratio = cost / max_value
	
	score -= W_COST_PENALTY * cost_ratio
	if low_resource > 0.0 and not is_emergency and not is_interrupt:
		score -= W_LOW_RESOURCE_PENALTY * low_resource
	
	# Make auto-attack a reasonable fallback when low on resource or no better option exists.
	if ability_name == "auto_attack":
		score += 8.0
		score += 30.0 * low_resource
		if aoe_needed:
			# auto-attack is weak in AoE; don't over-select it
			score -= 20.0
	
	# Tiny noise to avoid perfect ties (kept very small to preserve predictability).
	score += randf() * 0.25
	
	return score

func _select_healer_ability(hero, available: Array, context: Dictionary, rm) -> String:
	# Utility scoring: evaluate candidate abilities and pick the best match for current party state.
	var party_state = _get_party_state_from_context(context)
	var metrics = _get_party_health_metrics(party_state)
	var target = context.get("target", {})
	var target_casting = _is_target_casting(target)
	
	var best_ability := "auto_attack"
	var best_score := -999999.0
	var scored: Array = [] # [{name: String, score: float}]
	
	for ability_name in available:
		var def := get_ability_definition(hero.id, ability_name)
		if ability_name != "auto_attack" and def.is_empty():
			continue
		
		var score := _score_healer_candidate(hero, ability_name, def, metrics, target_casting, rm)
		scored.append({"name": ability_name, "score": score})
		if score > best_score:
			best_score = score
			best_ability = ability_name
	
	# Small variety: choose randomly among near-tied best options.
	var near_best: Array = []
	var EPS := 1.5
	for entry in scored:
		if float(entry.get("score", -999999.0)) >= best_score - EPS:
			near_best.append(entry.get("name", "auto_attack"))
	
	if near_best.size() > 1:
		best_ability = str(near_best[randi() % near_best.size()])
	
	return best_ability

func _get_party_state_from_context(context: Dictionary) -> Array:
	var party_state = context.get("party_state", [])
	if party_state is Array and not party_state.is_empty():
		return party_state
	
	# Fallback to PartyManager if not in context
	var pm = get_node_or_null("/root/PartyManager")
	if not pm:
		return []
	
	var rebuilt: Array = []
	for p_hero in pm.heroes:
		rebuilt.append({
			"id": p_hero.id,
			"current_health": p_hero.current_stats.get("health", 0),
			"max_health": p_hero.current_stats.get("maxHealth", 100)
		})
	return rebuilt

func _get_party_health_metrics(party_state: Array) -> Dictionary:
	# Use typed math helpers to avoid Variant inference (warnings are treated as errors in this project).
	var party_size: int = maxi(1, party_state.size())
	var lowest_hp_pct := 1.0
	var avg_hp_pct := 0.0
	var count_critical := 0
	var count_wounded := 0
	
	for member in party_state:
		var max_hp := float(member.get("max_health", 100))
		var hp := float(member.get("current_health", 0))
		var pct: float = hp / max(1.0, max_hp)
		avg_hp_pct += pct
		lowest_hp_pct = min(lowest_hp_pct, pct)
		# Healer-first tuning: treat the party as "in danger" earlier so the healer reacts sooner.
		if pct < 0.60:
			count_critical += 1
		# Healer-first tuning: treat anyone below 90% as "wounded" so healing starts sooner.
		if pct < 0.90:
			count_wounded += 1
	
	avg_hp_pct /= float(party_size)
	# Healer-first tuning: only DPS when everyone is basically topped off.
	var safe_to_dps := (lowest_hp_pct >= 0.95 and count_wounded == 0)
	
	return {
		"party_size": party_size,
		"lowest_hp_pct": lowest_hp_pct,
		"avg_hp_pct": avg_hp_pct,
		"count_critical": count_critical,
		"count_wounded": count_wounded,
		"safe_to_dps": safe_to_dps
	}

func _get_resource_ratio(hero_id: String, resource_type: String, rm) -> float:
	if not rm:
		return 1.0
	
	var current := float(rm.get_resource(hero_id, resource_type))
	var max_value := 0.0
	if rm.hero_resources is Dictionary and rm.hero_resources.has(hero_id):
		max_value = float(rm.hero_resources[hero_id].get("max_" + resource_type, 0.0))
	if max_value <= 0.0:
		max_value = max(1.0, current)
	
	return current / max_value

func _score_healer_candidate(hero, ability_name: String, def: Dictionary, metrics: Dictionary, target_casting: bool, rm) -> float:
	# Tunable weights (kept local to healer AI)
	const W_EMERGENCY := 260.0
	const W_INTERRUPT := 140.0
	# Healer-first tuning: heal sooner, DPS later.
	const W_SINGLE_HEAL := 210.0
	const W_AOE_HEAL := 180.0
	const W_SHIELD := 150.0
	const W_DAMAGE_SAFE := 35.0
	const W_DAMAGE_UNSAFE_PENALTY := 210.0
	const W_COST_PENALTY := 35.0
	const W_OVERHEAL_PENALTY := 55.0
	const W_LOW_MANA_PENALTY := 60.0
	
	var lowest_hp_pct := float(metrics.get("lowest_hp_pct", 1.0))
	var count_wounded := int(metrics.get("count_wounded", 0))
	var count_critical := int(metrics.get("count_critical", 0))
	var party_size := int(metrics.get("party_size", 1))
	var safe_to_dps := bool(metrics.get("safe_to_dps", false))
	
	var need_single: float = clampf((1.0 - lowest_hp_pct) / 0.7, 0.0, 1.0)
	var need_group: float = clampf(float(count_wounded) / float(maxi(1, party_size)), 0.0, 1.0)
	var danger: float = 1.0 if lowest_hp_pct < 0.25 else 0.0
	# Healer-first tuning: don't treat 80-90% as "overhealing"; allow topping sooner.
	var overheal: float = clampf((lowest_hp_pct - 0.90) / 0.10, 0.0, 1.0)
	
	var ability_type := "attack"
	if not def.is_empty():
		ability_type = str(def.get("type", "attack"))
	
	var name_lc := ability_name.to_lower()
	var is_interrupt := (ability_name in ["kick", "counterspell", "earth_shock"]) or ability_type == "interrupt"
	var is_emergency := ability_name in ["divine_shield", "ice_block", "evasion", "lay_on_hands"]
	var is_shield_like := ("shield" in name_lc) or ability_type == "shield"
	
	var score := 0.0
	
	# Emergency / interrupt are part of scoring (full-scoring policy).
	if is_emergency:
		# Only matters when the healer is personally in danger.
		var self_max_hp := float(hero.current_stats.get("maxHealth", 100))
		var self_hp_pct: float = float(hero.current_stats.get("health", 0)) / max(1.0, self_max_hp)
		var self_danger := 1.0 if self_hp_pct < 0.20 else 0.0
		score += W_EMERGENCY * self_danger
	
	if is_interrupt:
		score += W_INTERRUPT if target_casting else 0.0
	
	# Healing and mitigation.
	if ability_type == "aoe_heal":
		score += 20.0
		score += W_AOE_HEAL * need_group
		if count_critical >= 2:
			score += 45.0
		score -= W_OVERHEAL_PENALTY * overheal
	elif ability_type in ["heal", "heal_attack"]:
		score += 25.0
		score += W_SINGLE_HEAL * need_single
		if lowest_hp_pct < 0.60:
			score += 70.0
		score -= (W_OVERHEAL_PENALTY * 0.75) * overheal
		if ability_type == "heal_attack" and safe_to_dps:
			score += 20.0
	elif is_shield_like:
		score += 15.0
		score += W_SHIELD * need_single
		score += 60.0 * danger
	
	# Damage preference (when safe).
	var is_healing_or_mitigation := (ability_type in ["heal", "aoe_heal", "heal_attack"]) or is_shield_like
	if not is_healing_or_mitigation and not is_interrupt and not is_emergency:
		if safe_to_dps:
			score += W_DAMAGE_SAFE
		else:
			# Healer-first tuning: strongly discourage DPS while anyone is meaningfully hurt.
			score -= W_DAMAGE_UNSAFE_PENALTY * max(need_single, need_group)
	
	# Resource discipline (avoid overspending when low).
	var resource_type := str(def.get("resourceType", "mana")) if not def.is_empty() else "mana"
	var cost := float(def.get("cost", 0.0)) if not def.is_empty() else 0.0
	var ratio := _get_resource_ratio(hero.id, resource_type, rm)
	var low_mana := 1.0 if ratio < 0.20 else 0.0
	var cost_ratio := 0.0
	if rm and rm.hero_resources is Dictionary and rm.hero_resources.has(hero.id):
		var max_value := float(rm.hero_resources[hero.id].get("max_" + resource_type, 0.0))
		if max_value > 0.0:
			cost_ratio = cost / max_value
	
	score -= W_COST_PENALTY * cost_ratio
	if low_mana > 0.0 and not is_emergency and not is_interrupt:
		score -= W_LOW_MANA_PENALTY * low_mana
	
	# Make auto-attack a reasonable fallback when mana is low or nobody needs healing.
	if ability_name == "auto_attack":
		score += 10.0
		score += 40.0 if safe_to_dps else 0.0
		score += 40.0 * low_mana
	
	# Tiny noise to avoid perfect ties (kept very small to preserve predictability).
	score += randf() * 0.25
	
	return score

func _select_dps_ability(hero, available: Array, enemies: Array, _target: Dictionary, rm) -> String:
	# Priority: AOE -> Burst -> Maintenance/DOTs -> Spender -> Builder
	if enemies.size() >= 3:
		if hero.class_id == "mage" and "arcane_explosion" in available and _can_afford(hero.id, "arcane_explosion", rm): return "arcane_explosion"
		if hero.class_id == "warlock" and "seed_of_corruption" in available and _can_afford(hero.id, "seed_of_corruption", rm): return "seed_of_corruption"
		if hero.class_id == "hunter" and "explosive_trap" in available and _can_afford(hero.id, "explosive_trap", rm): return "explosive_trap"
	
	match hero.class_id:
		"mage":
			if "pyroblast" in available and _can_afford(hero.id, "pyroblast", rm): return "pyroblast" # Burst
			if "fireball" in available and _can_afford(hero.id, "fireball", rm): return "fireball" # Standard
			if "frostbolt" in available and _can_afford(hero.id, "frostbolt", rm): return "frostbolt" # Filler
		"rogue":
			if "eviscerate" in available and _can_afford(hero.id, "eviscerate", rm): return "eviscerate" # Finisher
			if "mutilate" in available and _can_afford(hero.id, "mutilate", rm): return "mutilate" # Strong Builder
			if "sinister_strike" in available and _can_afford(hero.id, "sinister_strike", rm): return "sinister_strike" # Builder
		"warlock":
			if "unstable_affliction" in available and _can_afford(hero.id, "unstable_affliction", rm): return "unstable_affliction" # DOT
			if "corruption" in available and _can_afford(hero.id, "corruption", rm): return "corruption" # DOT
			if "shadow_bolt" in available and _can_afford(hero.id, "shadow_bolt", rm): return "shadow_bolt" # Spender
		"hunter":
			if "aimed_shot" in available and _can_afford(hero.id, "aimed_shot", rm): return "aimed_shot" # Burst
			if "steady_shot" in available and _can_afford(hero.id, "steady_shot", rm): return "steady_shot" # Filler
		"warrior":
			if "mortal_strike" in available and _can_afford(hero.id, "mortal_strike", rm): return "mortal_strike" # Spender
			if "bloodthirst" in available and _can_afford(hero.id, "bloodthirst", rm): return "bloodthirst" # Spender
			if "rend" in available and _can_afford(hero.id, "rend", rm): return "rend" # DOT
			
	return available[0]

func _can_afford(hero_id: String, ability_name: String, rm) -> bool:
	if not rm: return true # Fallback if no resource manager
	var def = get_ability_definition(hero_id, ability_name)
	if def.is_empty(): return true
	
	var cost = def.get("cost", 0)
	var type = def.get("resourceType", "mana")
	return rm.get_resource(hero_id, type) >= cost

func get_available_abilities(hero) -> Array:
	var available: Array[String] = []
	var dm = get_node_or_null("/root/DataManager")
	if not dm: return ["auto_attack"]
	
	var class_data = dm.get_data("classes")
	if not class_data or not class_data.has(hero.class_id):
		return ["auto_attack"]
		
	# Always allow auto-attack
	available.append("auto_attack")
	
	# 1) Class ability list (data-driven)
	var core_abilities: Array = class_data[hero.class_id].get("coreAbilities", [])
	for ability_name in core_abilities:
		if typeof(ability_name) == TYPE_STRING and ability_name != "" and not available.has(ability_name):
			available.append(ability_name)
	
	# 2) Spec ability list (data-driven)
	var spec_data = dm.get_data("specializations")
	if spec_data and hero.spec_id != "":
		for spec_key in spec_data.keys():
			var spec = spec_data[spec_key]
			if not (spec is Dictionary):
				continue
			if spec.get("classId", "") != hero.class_id:
				continue
			if spec.get("id", "") != hero.spec_id:
				continue
			
			var spec_abilities: Array = spec.get("specAbilities", [])
			for ability_name in spec_abilities:
				if typeof(ability_name) == TYPE_STRING and ability_name != "" and not available.has(ability_name):
					available.append(ability_name)
			break
	
	# 3) Filter: cooldowns, level gates, affordability
	var rm = get_node_or_null("/root/ResourceManager")
	var filtered: Array[String] = []
	for ability_name in available:
		if is_on_cooldown(hero.id, ability_name):
			continue
		
		var def = get_ability_definition(hero.id, ability_name)
		if def.is_empty():
			# Allow auto_attack even if definition lookup fails
			if ability_name == "auto_attack":
				filtered.append(ability_name)
			continue
		
		var min_level = int(def.get("minLevel", 1))
		if hero.level < min_level:
			continue
		
		# Optional spec gating (future-proof)
		if def.has("requiresSpec"):
			var req = def.get("requiresSpec", [])
			if req is Array and not req.is_empty() and not req.has(hero.spec_id):
				continue
		
		# Resource gating (avoid selecting abilities we can't cast)
		if rm and ability_name != "auto_attack":
			if not _can_afford(hero.id, ability_name, rm):
				continue
		
		filtered.append(ability_name)
	
	return filtered

func get_all_ability_names(hero) -> Array:
	"""
	Return ALL abilities a hero can ever have based on class + spec definitions (including locked ones).
	Used by UI like Spellbook; does NOT apply cooldown/resource filtering.
	"""
	var all: Array[String] = []
	var dm = get_node_or_null("/root/DataManager")
	if not dm:
		return ["auto_attack"]
	
	# Always allow auto-attack
	all.append("auto_attack")
	
	var class_data = dm.get_data("classes")
	if class_data and class_data.has(hero.class_id):
		var core_abilities: Array = class_data[hero.class_id].get("coreAbilities", [])
		for ability_name in core_abilities:
			if typeof(ability_name) == TYPE_STRING and ability_name != "" and not all.has(ability_name):
				all.append(ability_name)
	
	var spec_data = dm.get_data("specializations")
	if spec_data and hero.spec_id != "":
		for spec_key in spec_data.keys():
			var spec = spec_data[spec_key]
			if not (spec is Dictionary):
				continue
			if spec.get("classId", "") != hero.class_id:
				continue
			if spec.get("id", "") != hero.spec_id:
				continue
			var spec_abilities: Array = spec.get("specAbilities", [])
			for ability_name in spec_abilities:
				if typeof(ability_name) == TYPE_STRING and ability_name != "" and not all.has(ability_name):
					all.append(ability_name)
			break
	
	return all

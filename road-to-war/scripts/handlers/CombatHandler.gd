extends Node

# CombatHandler.gd - Handles all combat-related events and visual feedback
# Extracted from World.gd to improve modularity

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

var world_scene: Node = null
var combat_manager: Node = null
var particle_manager: Node = null
var audio_manager: Node = null
var camera_manager: Node = null
var ui_theme: Node = null
var ability_manager: Node = null

# Track spell projectiles so we can delay damage VFX until the projectile hits.
# Keyed by "source_id->target_id".
var _pending_projectiles_by_pair: Dictionary = {}

const SCHOOL_COLORS := {
	"arcane": Color(0.6, 0.4, 1.0),
	"fire": Color(1.0, 0.4, 0.1),
	"frost": Color(0.4, 0.85, 1.0),
	"shadow": Color(0.6, 0.0, 0.9),
	"holy": Color(1.0, 0.9, 0.4),
	"nature": Color(0.2, 1.0, 0.4),
	"physical": Color(0.9, 0.9, 0.9)
}

func _ready():
	_log_info("CombatHandler", "Initialized")

func initialize(world: Node):
	world_scene = world
	combat_manager = get_node_or_null("/root/CombatManager")
	ability_manager = get_node_or_null("/root/AbilityManager")
	particle_manager = get_node_or_null("/root/ParticleManager")
	audio_manager = get_node_or_null("/root/AudioManager")
	camera_manager = get_node_or_null("/root/CameraManager")
	ui_theme = get_node_or_null("/root/UITheme")
	
	# Connect combat signals
	if combat_manager:
		if not combat_manager.combat_started.is_connected(_on_combat_started):
			combat_manager.combat_started.connect(_on_combat_started)
		if not combat_manager.combat_ended.is_connected(_on_combat_ended):
			combat_manager.combat_ended.connect(_on_combat_ended)
		if not combat_manager.damage_dealt.is_connected(_on_damage_dealt):
			combat_manager.damage_dealt.connect(_on_damage_dealt)
		if not combat_manager.healing_applied.is_connected(_on_healing_applied):
			combat_manager.healing_applied.connect(_on_healing_applied)
		if not combat_manager.combat_action_executed.is_connected(_on_combat_action_executed):
			combat_manager.combat_action_executed.connect(_on_combat_action_executed)
	
	var world_manager = get_node_or_null("/root/WorldManager")
	if world_manager:
		if not world_manager.combat_triggered.is_connected(_on_combat_triggered):
			world_manager.combat_triggered.connect(_on_combat_triggered)

func _on_combat_triggered(enemy_group_data: Array):
	if not combat_manager:
		return
	
	_log_info("CombatHandler", "Encounter triggered with %d enemies!" % enemy_group_data.size())
	
	# Check for Boss Rush challenge mode
	var challenge_m = get_node_or_null("/root/ChallengeModeManager")
	if challenge_m and challenge_m.active_challenge == challenge_m.ChallengeType.BOSS_RUSH:
		# Filter to only bosses for Boss Rush
		var boss_group = []
		for enemy in enemy_group_data:
			var enemy_dict: Dictionary = enemy as Dictionary
			var enemy_type = enemy_dict.get("type") if enemy_dict.has("type") else ""
			if enemy_type == "boss":
				boss_group.append(enemy_dict)
		if not boss_group.is_empty():
			enemy_group_data = boss_group
	
	combat_manager.start_party_combat(enemy_group_data)

func _on_combat_started(_enemies: Array):  # _enemies unused - handler just triggers effects
	_log_info("CombatHandler", "Combat started")
	
	# Play combat music
	if audio_manager:
		audio_manager.play_music("combat")
	
	# Visual feedback
	if particle_manager:
		particle_manager.create_combat_start_effect()

func _on_combat_ended(victory: bool):
	_log_info("CombatHandler", "Combat ended")
	
	# Play travel music
	if audio_manager:
		audio_manager.play_music("travel")
	
	# Victory effects
	if victory:
		if particle_manager:
			particle_manager.create_victory_effect()

func _on_damage_dealt(source_id: String, target_id: String, amount: int, is_crit: bool):
	if not world_scene:
		return

	# If a projectile is in-flight for this pair, defer damage VFX until it arrives.
	var pair_key := "%s->%s" % [source_id, target_id]
	if _pending_projectiles_by_pair.has(pair_key):
		var pending: Dictionary = _pending_projectiles_by_pair.get(pair_key, {})
		if pending and str(pending.get("delivery", "")) == "projectile":
			if not bool(pending.get("arrived", false)):
				pending["pending_damage"] = {
					"source_id": source_id,
					"target_id": target_id,
					"amount": amount,
					"is_crit": is_crit
				}
				_pending_projectiles_by_pair[pair_key] = pending
				return
			else:
				# Projectile already arrived but damage came after (edge case). Render as spell hit now.
				_render_damage_event(source_id, target_id, amount, is_crit, str(pending.get("school", "physical")))
				_pending_projectiles_by_pair.erase(pair_key)
				return
	
	var target_node = world_scene._find_unit_node(target_id) if world_scene.has_method("_find_unit_node") else null
	var source_node = world_scene._find_unit_node(source_id) if world_scene.has_method("_find_unit_node") else null
	
	# Attack animation
	if source_node and source_node.has_method("play_animation"):
		# Default "OSRS style" swing/cast animation.
		source_node.play_animation("attack")
		
		# Add melee charge effect for melee attackers
		if source_node.has_meta("is_melee") and bool(source_node.get_meta("is_melee")):
			var tween = world_scene.create_tween()
			var original_x = source_node.position.x
			tween.tween_property(source_node, "position:x", original_x + 30, 0.15).set_ease(Tween.EASE_OUT)
			tween.tween_property(source_node, "position:x", original_x, 0.2).set_ease(Tween.EASE_IN)
	
	if target_node:
		_render_damage_event(source_id, target_id, amount, is_crit, "physical")

func _on_healing_applied(healer_id: String, target_id: String, amount: float):
	if not world_scene:
		return
	var healer_node = world_scene._find_unit_node(healer_id) if world_scene.has_method("_find_unit_node") else null
	var target_node = world_scene._find_unit_node(target_id) if world_scene.has_method("_find_unit_node") else null
	if healer_node and healer_node.has_method("play_animation"):
		healer_node.play_animation("attack") # HeroSprite will route healers to "cast" once role mapping is improved
	if particle_manager and target_node:
		particle_manager.create_heal_effect(target_node.global_position)
		particle_manager.create_floating_text(target_node.global_position + Vector2(0, -40), "+" + str(int(amount)), Color.GREEN)

func _on_combat_action_executed(data: Dictionary):
	# Visual callout so you can SEE abilities being used (RuneScape-like readability)
	if not world_scene or not particle_manager:
		return
	var actor_id = str(data.get("actor")) if data.has("actor") else ""
	var action = str(data.get("action")) if data.has("action") else "attack"
	if actor_id == "":
		return
	var actor_node = world_scene._find_unit_node(actor_id) if world_scene.has_method("_find_unit_node") else null
	if not actor_node:
		return
	var target_id = str(data.get("target")) if data.has("target") else ""
	var target_node = world_scene._find_unit_node(target_id) if (target_id != "" and target_id != "aoe" and world_scene.has_method("_find_unit_node")) else null
	
	# Small callout above attacker
	var callout_pos = actor_node.global_position + Vector2(0, -60)
	var color = Color.CYAN
	if String(action).find("heal") != -1:
		color = Color(0.4, 1.0, 0.4)
	particle_manager.create_floating_text(callout_pos, action.capitalize(), color)

	# Try to drive a better animation based on ability type (still simple A-mode)
	if actor_node.has_method("play_animation"):
		var anim_to_play = "attack"
		var school: String = "physical"
		var delivery: String = "instant" # "instant" | "projectile"
		var projectile_style: String = "bolt" # "bolt" | "orb" (we also accept legacy style strings from data)
		var projectile_speed: float = 1400.0
		var ability_type: String = "attack"
		var ability_range: float = 0.0
		var def: Dictionary = {} # Ability definition (empty fallback for non-hero units)
		if ability_manager and actor_id.begins_with("hero"):
			def = ability_manager.get_ability_definition(actor_id, action)
			ability_type = str(def.get("type")) if def.has("type") else "attack"
			ability_range = float(def.get("range", 0.0))
			if ability_type in ["heal", "buff", "aoe_heal", "hot", "shield"]:
				anim_to_play = "cast"
			school = _infer_school(action, def)
			
			# Optional data-driven visuals
			if def.has("visuals") and def.get("visuals") is Dictionary:
				var visuals: Dictionary = def.get("visuals")
				var d := str(visuals.get("delivery", ""))
				if d != "":
					delivery = d
				var s := str(visuals.get("style", ""))
				if s != "":
					projectile_style = s
				projectile_speed = float(visuals.get("speed", projectile_speed))
			
			# Default: ranged non-physical damage spells become projectiles
			if delivery == "instant" and school != "physical" and ability_range >= 300.0 and ability_type not in ["heal", "buff", "aoe_heal", "hot", "shield"]:
				delivery = "projectile"
		actor_node.play_animation(anim_to_play)
		
		# Cast + impact VFX (spell schools)
		var school_color: Color = SCHOOL_COLORS.get(school, Color.CYAN)
		
		# Cast effect: show for any non-auto action
		if action != "auto_attack" and particle_manager.has_method("create_cast_effect"):
			particle_manager.create_cast_effect(actor_node.global_position, school_color)
		
		# Normalize style strings coming from data (we only support "bolt" and "orb" at runtime).
		# Convention: anything lightning-like becomes a bolt; everything else becomes an orb.
		var style_l := projectile_style.to_lower()
		if style_l.find("lightning") != -1 or style_l == "bolt":
			projectile_style = "bolt"
		else:
			projectile_style = "orb"
		
		# Choose a default projectile style by school unless overridden by data.
		if projectile_style == "bolt" and school != "nature":
			projectile_style = "orb"
		
		# Procedural VFX System: Generate visuals from ability data
		# visuals_data is reserved for future use when procedural VFX generation is implemented
		# var _visuals_data: Dictionary = {}
		# if def.has("visuals") and def.get("visuals") is Dictionary:
		# 	_visuals_data = def.get("visuals")
		
		# Build spell data for procedural generation
		var spell_data := {
			"element": school,
			"delivery": delivery,
			"style": projectile_style,
			"power": float(def.get("damageMultiplier", 1.0)),
			"speed": projectile_speed
		}
		
		# Add duration for channeled/ground AOE spells
		if ability_type in ["dot", "dot_attack", "dot_heal"] or def.has("channeled"):
			spell_data["duration"] = float(def.get("duration", 12.0))
		if ability_type == "aoe" or def.has("aoeRadius"):
			spell_data["aoe_radius"] = float(def.get("aoeRadius", 200.0))
			spell_data["delivery"] = "ground_aoe"
		
		# Projectile: travel from caster -> target, then delay damage VFX until it "hits"
		if target_node and delivery == "projectile" and school != "physical" and particle_manager.has_method("create_spell_projectile"):
			var pair_key := "%s->%s" % [actor_id, target_id]
			_pending_projectiles_by_pair[pair_key] = {
				"delivery": "projectile",
				"arrived": false,
				"school": school,
				"school_color": school_color,
				"pending_damage": null
			}
			particle_manager.create_spell_projectile(
				actor_node.global_position + Vector2(0, -40),
				target_node.global_position + Vector2(0, -40),
				school_color,
				projectile_style,
				projectile_speed,
				func():
					_on_projectile_arrived(actor_id, target_id)
			)
		# Beam: channeled spell (Arcane Missiles, Mind Flay)
		elif target_node and delivery == "beam" and particle_manager.has_method("create_spell_beam"):
			spell_data["duration"] = float(def.get("channelDuration", 3.0))
			particle_manager.create_spell_beam(
				actor_node.global_position + Vector2(0, -40),
				target_node.global_position + Vector2(0, -40),
				school_color,
				projectile_style,
				spell_data["duration"],
				spell_data["power"]
			)
		# Ground AOE: persistent area effect (Blizzard, Rain of Fire)
		elif (ability_type == "aoe" or spell_data.has("aoe_radius")) and particle_manager.has_method("create_ground_aoe_effect"):
			var aoe_radius = spell_data.get("aoe_radius", 200.0)
			var aoe_duration = spell_data.get("duration", 5.0)
			particle_manager.create_ground_aoe_effect(
				target_node.global_position if target_node else actor_node.global_position,
				school_color,
				aoe_radius,
				aoe_duration,
				school
			)
		# Self-buff: visual aura around caster
		elif ability_type in ["buff", "shield"] and target_id == actor_id and particle_manager.has_method("create_self_buff_effect"):
			particle_manager.create_self_buff_effect(
				actor_node.global_position,
				school_color,
				projectile_style,
				spell_data["power"]
			)
		else:
			# Instant Impact effect: target spells (damage). Heals already have their own green effect.
			if target_node and particle_manager.has_method("create_magic_impact_effect"):
				if ability_type not in ["heal", "buff", "aoe_heal", "hot", "shield"] and school != "physical":
					particle_manager.create_magic_impact_effect(target_node.global_position, school_color)
			elif target_id == "aoe":
				# AOE: small impact on each visible enemy (no timing sync for now)
				var enemy_group = world_scene.get_node_or_null("EnemyGroup") if world_scene.has_method("get_node_or_null") else null
				if enemy_group:
					for node in enemy_group.get_children():
						if node and node.visible and particle_manager.has_method("create_magic_impact_effect"):
							particle_manager.create_magic_impact_effect(node.global_position, school_color)

func _on_projectile_arrived(source_id: String, target_id: String) -> void:
	if not world_scene:
		return
	var pair_key := "%s->%s" % [source_id, target_id]
	if not _pending_projectiles_by_pair.has(pair_key):
		return
	var pending: Dictionary = _pending_projectiles_by_pair.get(pair_key, {})
	pending["arrived"] = true
	_pending_projectiles_by_pair[pair_key] = pending
	
	# If we already received damage, render it now.
	var dmg = pending.get("pending_damage")
	if dmg and dmg is Dictionary:
		_render_damage_event(
			str(dmg.get("source_id", source_id)),
			str(dmg.get("target_id", target_id)),
			int(dmg.get("amount", 0)),
			bool(dmg.get("is_crit", false)),
			str(pending.get("school", "physical"))
		)
		_pending_projectiles_by_pair.erase(pair_key)
	else:
		# No damage yet (rare). Still show a small impact, and keep pending until damage arrives.
		var target_node = world_scene._find_unit_node(target_id) if world_scene.has_method("_find_unit_node") else null
		if target_node and particle_manager and particle_manager.has_method("create_magic_impact_effect"):
			var school_color: Color = pending.get("school_color", Color.CYAN)
			particle_manager.create_magic_impact_effect(target_node.global_position, school_color)

func _render_damage_event(source_id: String, target_id: String, amount: int, is_crit: bool, school: String) -> void:
	if not world_scene:
		return
	var target_node = world_scene._find_unit_node(target_id) if world_scene.has_method("_find_unit_node") else null
	if not target_node:
		return
	
	var pos = target_node.global_position + Vector2(0, -40)
	var impact_color: Color = SCHOOL_COLORS.get(school, Color.WHITE)
	
	# If the source is a hero, prefer spec tint for physical hits; spells use school tint.
	var pm_node = get_node_or_null("/root/PartyManager")
	var hero = pm_node.get_hero_by_id(source_id) if pm_node else null
	if hero and ui_theme and school == "physical":
		impact_color = ui_theme.get_spec_color(hero.class_id)
	
	if target_node.has_method("play_hit_flash"):
		target_node.play_hit_flash()
	
	# Screen shake for big hits
	if is_crit or amount > 100:
		if camera_manager:
			camera_manager.shake(5.0 if is_crit else 2.0, 0.2)
	
	# Particle effects
	if particle_manager:
		if school == "physical":
			if is_crit:
				particle_manager.create_crit_effect(target_node.global_position, impact_color)
				particle_manager.create_hit_effect(target_node.global_position + Vector2(20, -20), impact_color)
				particle_manager.create_hit_effect(target_node.global_position + Vector2(-20, -20), impact_color)
			else:
				particle_manager.create_hit_effect(target_node.global_position, impact_color)
		else:
			# Spell hit: school-colored impact + optional crit sparkle
			if is_crit and particle_manager.has_method("create_crit_effect"):
				particle_manager.create_crit_effect(target_node.global_position, impact_color)
			if particle_manager.has_method("create_magic_impact_effect"):
				particle_manager.create_magic_impact_effect(target_node.global_position, impact_color)
	
	# Audio feedback
	if audio_manager:
		if is_crit:
			audio_manager.play_crit_sfx()
		else:
			audio_manager.play_hit_sfx()
	
	# Floating damage text
	var float_color = Color.YELLOW
	if "hero" in target_id.to_lower():
		float_color = Color.RED
	
	var text = str(amount)
	if is_crit:
		text = "CRIT! " + text
		float_color = Color.ORANGE
	
	if particle_manager:
		particle_manager.create_floating_text(pos, text, float_color)
	
	# Check for death
	var combatant: Dictionary = combat_manager._get_combatant_by_id(target_id) if combat_manager else {}
	var current_health = combatant.get("current_health") if combatant.has("current_health") else 0
	if not combatant.is_empty() and current_health <= 0:
		var is_hero_unit = "hero" in target_id.to_lower()
		_handle_unit_death(target_id, target_node, is_hero_unit)

func _infer_school(ability_id: String, def: Dictionary) -> String:
	# Data-driven if present
	if def and def.has("school"):
		return str(def.get("school")).to_lower()
	# Heuristic by ability id (good enough for first pass)
	var a := ability_id.to_lower()
	# Lightning / storm spells (nature)
	if "lightning" in a or "thunder" in a or "storm" in a:
		return "nature"
	# Shadow mind spells
	if "mind" in a:
		return "shadow"
	# Arcane should win before generic "blast" rules
	if "arcane" in a:
		return "arcane"
	if "fire" in a or "flame" in a or "pyro" in a or "lava" in a or "blast" in a:
		return "fire"
	if "frost" in a or "ice" in a:
		return "frost"
	if "shadow" in a or "curse" in a or "corruption" in a or "drain" in a:
		return "shadow"
	if "holy" in a or "divine" in a or "smite" in a or "judg" in a:
		return "holy"
	if "nature" in a or "wrath" in a or "star" in a or "rejuv" in a or "poison" in a:
		return "nature"
	return "physical"

func _handle_unit_death(unit_id: String, unit_node: Node, _is_hero: bool):  # _is_hero unused - kept for future hero death handling
	if not unit_node:
		return
	
	# Check if already queued for deletion
	if is_instance_valid(unit_node) and unit_node.is_queued_for_deletion():
		return
	
	# Play death animation
	var death_animation_played := false
	if unit_node.has_meta("death_animation_played"):
		var meta_value = unit_node.get_meta("death_animation_played")
		death_animation_played = bool(meta_value) if meta_value != null else false
	if unit_node.has_method("play_animation") and not death_animation_played:
		unit_node.set_meta("death_animation_played", true)
		unit_node.play_animation("death")
	
	# Check if it's a boss for special effects
	var combatant: Dictionary = combat_manager._get_combatant_by_id(unit_id) if combat_manager else {}
	var combatant_type = combatant.get("type") if combatant.has("type") else ""
	if combatant_type == "boss":
		if particle_manager:
			particle_manager.create_boss_finisher_effect(unit_node.global_position)
	
	# Death particles
	if particle_manager:
		particle_manager.create_death_effect(unit_node.global_position)
	
	# Remove node after animation (BUT NEVER DELETE HEROES)
	if not _is_hero:
		if world_scene:
			world_scene.get_tree().create_timer(1.0).timeout.connect(unit_node.queue_free)
	else:
		_log_info("CombatHandler", "Hero %s 'died' visually but keeping node active" % unit_id)
	
	_log_info("CombatHandler", "Unit %s died" % unit_id)

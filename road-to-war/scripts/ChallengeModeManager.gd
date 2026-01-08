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

# ChallengeModeManager.gd - Manages challenge modes unlocked at Prestige Level 1+
# Provides alternative progression paths and replayability

signal challenge_started(challenge_type)
signal challenge_completed(challenge_type, success, score)
signal challenge_failed(challenge_type, reason)

enum ChallengeType {
	NONE = -1,
	BOSS_RUSH,
	SPEED_RUN,
	NO_DEATH,
	ELITE_ONLY,
	PRESTIGE_RUSH
}

var active_challenge: ChallengeType = ChallengeType.NONE
var challenge_start_time: int = 0
var challenge_data: Dictionary = {}
var challenge_stats: Dictionary = {}

func _ready():
	_log_info("ChallengeModeManager", "Initialized")

func is_challenge_unlocked(challenge_type: ChallengeType) -> bool:
	var prestige_m = get_node_or_null("/root/PrestigeManager")
	if not prestige_m:
		return false
	
	var prestige_level = prestige_m.get_prestige_level()
	
	match challenge_type:
		ChallengeType.BOSS_RUSH:
			return prestige_level >= 1
		ChallengeType.SPEED_RUN:
			return prestige_level >= 2
		ChallengeType.NO_DEATH:
			return prestige_level >= 3
		ChallengeType.ELITE_ONLY:
			return prestige_level >= 4
		ChallengeType.PRESTIGE_RUSH:
			return prestige_level >= 5
		_:
			return false

func start_challenge(challenge_type: ChallengeType) -> bool:
	if active_challenge != ChallengeType.NONE:
		_log_warn("ChallengeModeManager", "Challenge already active")
		return false
	
	if not is_challenge_unlocked(challenge_type):
		_log_warn("ChallengeModeManager", "Challenge not unlocked")
		return false
	
	active_challenge = challenge_type
	challenge_start_time = Time.get_ticks_msec()
	challenge_data = {}
	challenge_stats = {}
	
	# Initialize challenge-specific data
	match challenge_type:
		ChallengeType.BOSS_RUSH:
			_init_boss_rush()
		ChallengeType.SPEED_RUN:
			_init_speed_run()
		ChallengeType.NO_DEATH:
			_init_no_death()
		ChallengeType.ELITE_ONLY:
			_init_elite_only()
		ChallengeType.PRESTIGE_RUSH:
			_init_prestige_rush()
	
	challenge_started.emit(challenge_type)
	_log_info("ChallengeModeManager", "Started challenge: %s" % _get_challenge_name(challenge_type))
	return true

func end_challenge(success: bool, score: int = 0):
	if active_challenge == ChallengeType.NONE:
		return
	
	var challenge_type = active_challenge
	active_challenge = ChallengeType.NONE
	
	if success:
		_grant_challenge_rewards(challenge_type, score)
		challenge_completed.emit(challenge_type, true, score)
		_log_info("ChallengeModeManager", "Challenge completed: %s (Score: %d)" % [_get_challenge_name(challenge_type), score])
	else:
		challenge_failed.emit(challenge_type, "Failed")
		_log_info("ChallengeModeManager", "Challenge failed: %s" % _get_challenge_name(challenge_type))

func _init_boss_rush():
	challenge_data = {
		"bosses_defeated": 0,
		"total_bosses": 4,  # Miles 25, 50, 75, 100
		"boss_miles": [25, 50, 75, 100]
	}
	_log_info("ChallengeModeManager", "Boss Rush: Fight all milestone bosses back-to-back")

func _init_speed_run():
	challenge_data = {
		"target_mile": 100,
		"start_mile": 0
	}
	var wm = get_node_or_null("/root/WorldManager")
	if wm:
		challenge_data["start_mile"] = wm.current_mile
	_log_info("ChallengeModeManager", "Speed Run: Complete Mile 100 as fast as possible")

func _init_no_death():
	challenge_data = {
		"deaths": 0,
		"target_mile": 100
	}
	_log_info("ChallengeModeManager", "No-Death Challenge: Complete Mile 100 without any hero dying")

func _init_elite_only():
	challenge_data = {
		"elite_count": 0,
		"regular_count": 0
	}
	_log_info("ChallengeModeManager", "Elite Only Mode: Only elite enemies spawn")

func _init_prestige_rush():
	challenge_data = {
		"total_levels": 0,
		"epic_items": 0,
		"legendary_items": 0,
		"achievements": 0
	}
	_log_info("ChallengeModeManager", "Prestige Rush: Optimize for maximum prestige points")

func _grant_challenge_rewards(challenge_type: ChallengeType, score: int):
	var prestige_m = get_node_or_null("/root/PrestigeManager")
	if not prestige_m:
		return
	
	match challenge_type:
		ChallengeType.BOSS_RUSH:
			prestige_m.prestige_points += 10
			prestige_m.add_ethereal_essence(50)
			_unlock_title("Boss Slayer")
		ChallengeType.SPEED_RUN:
			var time_bonus = int(score / 60.0)  # 1 point per minute saved
			prestige_m.prestige_points += max(5, 15 - time_bonus)
			prestige_m.add_ethereal_essence(25)
			if score < 1800:  # Under 30 minutes
				_unlock_title("Speed Demon")
		ChallengeType.NO_DEATH:
			prestige_m.prestige_points += 15
			prestige_m.add_ethereal_essence(75)
			_unlock_title("Perfect Run")
		ChallengeType.ELITE_ONLY:
			prestige_m.prestige_points += 12
			prestige_m.add_ethereal_essence(100)
			_unlock_title("Elite Hunter")
		ChallengeType.PRESTIGE_RUSH:
			var efficiency_score = score
			prestige_m.prestige_points += int(efficiency_score / 10.0)
			prestige_m.add_ethereal_essence(150)
			_unlock_title("Prestige Master")
	
	_log_info("ChallengeModeManager", "Granted rewards for %s" % _get_challenge_name(challenge_type))

func _unlock_title(title: String):
	var am = get_node_or_null("/root/AchievementManager")
	if am and am.has_method("unlock_achievement"):
		# Create achievement ID from title
		var achievement_id = title.to_lower().replace(" ", "_")
		am.unlock_achievement(achievement_id)

func _get_challenge_name(challenge_type: ChallengeType) -> String:
	match challenge_type:
		ChallengeType.BOSS_RUSH:
			return "Boss Rush"
		ChallengeType.SPEED_RUN:
			return "Speed Run"
		ChallengeType.NO_DEATH:
			return "No-Death Challenge"
		ChallengeType.ELITE_ONLY:
			return "Elite Only Mode"
		ChallengeType.PRESTIGE_RUSH:
			return "Prestige Rush"
		_:
			return "Unknown"

func get_challenge_progress() -> Dictionary:
	if active_challenge == ChallengeType.NONE:
		return {}
	
	return challenge_data.duplicate()

func get_challenge_time() -> float:
	if active_challenge == ChallengeType.NONE:
		return 0.0
	return (Time.get_ticks_msec() - challenge_start_time) / 1000.0

func get_save_data() -> Dictionary:
	return {
		"active_challenge": active_challenge,
		"challenge_data": challenge_data,
		"challenge_stats": challenge_stats
	}

func load_save_data(save_data: Dictionary):
	active_challenge = int(save_data.get("active_challenge", ChallengeType.NONE)) as ChallengeType
	challenge_data = save_data.get("challenge_data", {})
	challenge_stats = save_data.get("challenge_stats", {})


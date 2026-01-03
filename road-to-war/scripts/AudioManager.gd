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

# AudioManager.gd - Handles synthetic sound generation and playback
# Ported from the Web Audio API implementation in the original game

var master_volume: float = 0.5
var sfx_volume: float = 0.8
var music_volume: float = 0.4

var sounds: Dictionary = {}

var music_player_a: AudioStreamPlayer
var music_player_b: AudioStreamPlayer
var active_player: AudioStreamPlayer
var ambient_player: AudioStreamPlayer
var current_music_name: String = ""
var current_ambient_name: String = ""

func _ready():
	_log_info("AudioManager", "Initialized")
	
	# Setup music players
	music_player_a = AudioStreamPlayer.new()
	music_player_b = AudioStreamPlayer.new()
	ambient_player = AudioStreamPlayer.new()
	
	music_player_a.bus = "Music"
	music_player_b.bus = "Music"
	ambient_player.bus = "Ambient" if AudioServer.get_bus_index("Ambient") != -1 else "SFX"
	
	add_child(music_player_a)
	add_child(music_player_b)
	add_child(ambient_player)
	active_player = music_player_a
	
	_initialize_sounds()

func _initialize_sounds():
	# In a real Godot project, we'd load .wav/.ogg files.
	# For this port, we'll keep the "synthetic" intent.
	# However, Godot's AudioStreamGenerator is complex for simple beeps.
	# We'll provide a placeholder system that can be expanded.
	pass

func play_sfx(sound_name: String):
	_log_debug("AudioManager", "Playing SFX: %s" % sound_name)
	
	# Logic to play sound via AudioStreamPlayer
	# Even without an actual stream, creating the node ensures the signal chain works
	var player = AudioStreamPlayer.new()
	add_child(player)
	player.bus = "SFX"
	
	# Try to load sound if it exists in a conventional path
	var path = "res://assets/audio/sfx/%s.wav" % sound_name
	if ResourceLoader.exists(path):
		player.stream = load(path)
		player.play()
	else:
		_log_debug("AudioManager", "SFX file not found: %s" % path)
		
	player.finished.connect(player.queue_free)

func play_level_up_sfx():
	play_sfx("level_up")

func play_crit_sfx():
	play_sfx("crit")

func play_hit_sfx():
	play_sfx("hit")

func play_heal_sfx():
	play_sfx("heal")

func play_boss_approach_sfx():
	play_sfx("boss_approach")

func play_ambient(biome_name: String):
	if current_ambient_name == biome_name: return
	
	_log_info("AudioManager", "Playing ambient for biome: %s" % biome_name)
	current_ambient_name = biome_name
	
	var path = "res://assets/audio/ambient/%s.ogg" % biome_name
	if not ResourceLoader.exists(path):
		path = "res://assets/audio/ambient/%s.wav" % biome_name
		
	if ResourceLoader.exists(path):
		var stream = load(path)
		# Smooth transition for ambient
		var tween = create_tween()
		if ambient_player.playing:
			tween.tween_property(ambient_player, "volume_db", -60, 1.0)
			tween.tween_callback(ambient_player.stop)
		
		tween.tween_callback(func(): 
			ambient_player.stream = stream
			ambient_player.volume_db = -60
			ambient_player.play()
		)
		tween.tween_property(ambient_player, "volume_db", linear_to_db(sfx_volume * 0.5), 1.0)
	else:
		_log_debug("AudioManager", "Ambient file not found: %s" % path)

func play_music(music_name: String):
	crossfade_to_music(music_name)

func crossfade_to_music(music_name: String, duration: float = 2.0):
	if current_music_name == music_name:
		return
	
	_log_info("AudioManager", "Crossfading to music: %s" % music_name)
	current_music_name = music_name
	
	var next_player = music_player_b if active_player == music_player_a else music_player_a
	
	# Try .ogg then .wav
	var path = "res://assets/audio/music/%s.ogg" % music_name
	if not ResourceLoader.exists(path):
		path = "res://assets/audio/music/%s.wav" % music_name
		
	if not ResourceLoader.exists(path):
		_log_warn("AudioManager", "Music file not found: %s" % music_name)
		return
	
	next_player.stream = load(path)
	next_player.volume_db = -60 # Start silent
	next_player.play()
	
	var tween = create_tween().set_parallel(true)
	var target_db = linear_to_db(music_volume)
	tween.tween_property(next_player, "volume_db", target_db, duration)
	
	if active_player and active_player.playing:
		tween.tween_property(active_player, "volume_db", -60, duration)
		# Chain the stop after fade out is complete
		var old_player = active_player
		tween.set_parallel(false)
		tween.tween_callback(old_player.stop)
	
	active_player = next_player

func set_volume(bus_name: String, value: float):
	var bus_index = AudioServer.get_bus_index(bus_name)
	if bus_index != -1:
		AudioServer.set_bus_volume_db(bus_index, linear_to_db(value))

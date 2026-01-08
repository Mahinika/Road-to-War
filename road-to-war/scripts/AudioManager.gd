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

# Silent mode: Suppress warnings when audio files are missing
var silent_mode: bool = false

# Procedural audio: Generate sounds programmatically when files are missing
var use_procedural_audio: bool = true

var sounds: Dictionary = {}

var music_player_a: AudioStreamPlayer
var music_player_b: AudioStreamPlayer
var active_player: AudioStreamPlayer
var ambient_player: AudioStreamPlayer
var current_music_name: String = ""
var current_ambient_name: String = ""

func _ready():
	_log_info("AudioManager", "Initialized")
	
	# Check if audio directory exists, enable silent mode if empty
	var audio_dir = DirAccess.open("res://assets/audio/")
	if not audio_dir:
		_log_info("AudioManager", "Audio directory not found, enabling silent mode")
		silent_mode = true
		use_procedural_audio = true
	else:
		# Check if directory is empty
		audio_dir.list_dir_begin()
		var has_files = false
		var file_name = audio_dir.get_next()
		while file_name != "":
			if not audio_dir.current_is_dir():
				has_files = true
				break
			file_name = audio_dir.get_next()
		audio_dir.list_dir_end()
		
		if not has_files:
			_log_info("AudioManager", "Audio directory is empty, enabling silent mode and procedural audio")
			silent_mode = true
			use_procedural_audio = true
	
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
	# Initialize procedural audio generators for common sounds
	# These will be used when audio files are missing
	pass

# Generate a simple tone/beep procedurally using AudioStreamGenerator
# Note: Full procedural audio requires AudioStreamGeneratorPlayback which is complex
# For now, we return null and rely on silent mode when files are missing
func _generate_tone(_frequency: float, _duration: float, _volume: float = 0.3) -> AudioStream:
	# Procedural audio generation is not yet fully implemented
	# This is a placeholder for future enhancement
	# When audio files are missing, silent mode handles it gracefully
	return null

# Generate a simple beep sound
func _generate_beep(pitch: float = 1.0) -> AudioStream:
	return _generate_tone(440.0 * pitch, 0.1, 0.2)

# Generate a success chime
func _generate_chime() -> AudioStream:
	return _generate_tone(523.25, 0.15, 0.3)  # C5 note

func play_sfx(sound_name: String):
	if not silent_mode:
		_log_debug("AudioManager", "Playing SFX: %s" % sound_name)
	
	# Logic to play sound via AudioStreamPlayer
	var player = AudioStreamPlayer.new()
	add_child(player)
	player.bus = "SFX"
	player.volume_db = linear_to_db(sfx_volume)
	
	# Try to load sound if it exists in a conventional path
	var path = "res://assets/audio/sfx/%s.wav" % sound_name
	if ResourceLoader.exists(path):
		player.stream = load(path)
		player.play()
		player.finished.connect(player.queue_free)
		return
	
	# Try .ogg as fallback
	path = "res://assets/audio/sfx/%s.ogg" % sound_name
	if ResourceLoader.exists(path):
		player.stream = load(path)
		player.play()
		player.finished.connect(player.queue_free)
		return
	
	# File not found - use procedural audio or silent mode
	if use_procedural_audio:
		var procedural_stream = _get_procedural_sound(sound_name)
		if procedural_stream:
			player.stream = procedural_stream
			# For procedural audio, we need to handle playback differently
			# Since AudioStreamGenerator requires AudioStreamGeneratorPlayback
			# we'll use a simple workaround: create a minimal WAV-like stream
			# For now, just skip procedural audio and use silent mode
			# This prevents errors while maintaining the architecture for future enhancement
			player.queue_free()
			if not silent_mode:
				_log_debug("AudioManager", "Procedural audio not yet implemented for: %s" % sound_name)
			return
		else:
			# No procedural audio available, just skip silently
			if not silent_mode:
				_log_debug("AudioManager", "SFX file not found and no procedural audio: %s" % sound_name)
			player.queue_free()
			return
	else:
		# Silent mode - just skip without warning
		if not silent_mode:
			_log_debug("AudioManager", "SFX file not found: %s" % sound_name)
		player.queue_free()
		return

# Get procedural sound for a given sound name
# Note: Procedural audio is not yet implemented - returns null
# System gracefully handles missing audio via silent mode
func _get_procedural_sound(sound_name: String) -> AudioStream:
	# Map common sounds to procedural generators (when implemented)
	# For now, return null to use silent mode
	match sound_name:
		"level_up", "success", "crit", "hit", "heal", "boss_approach":
			# Future: return _generate_chime() or _generate_beep()
			return null
		_:
			return null  # No procedural audio for this sound

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
	
	if not silent_mode:
		_log_info("AudioManager", "Playing ambient for biome: %s" % biome_name)
	current_ambient_name = biome_name
	
	var tween: Tween = null
	
	var path = "res://assets/audio/ambient/%s.ogg" % biome_name
	if not ResourceLoader.exists(path):
		path = "res://assets/audio/ambient/%s.wav" % biome_name
		
	if ResourceLoader.exists(path):
		var stream = load(path)
		# Smooth transition for ambient
		tween = create_tween()
		if ambient_player.playing:
			tween.tween_property(ambient_player, "volume_db", -60, 1.0)
			tween.tween_callback(ambient_player.stop)
		
		tween.tween_callback(_start_ambient.bind(stream))
		tween.tween_property(ambient_player, "volume_db", linear_to_db(sfx_volume * 0.5), 1.0)
	else:
		# Ambient file not found - stop current ambient and log only if not silent
		if ambient_player.playing:
			tween = create_tween()
			tween.tween_property(ambient_player, "volume_db", -60, 1.0)
			tween.tween_callback(ambient_player.stop)
		
		if not silent_mode:
			_log_debug("AudioManager", "Ambient file not found: %s" % path)

func _start_ambient(stream: AudioStream):
	if is_instance_valid(ambient_player):
		ambient_player.stream = stream
		ambient_player.volume_db = -60
		ambient_player.play()

func play_music(music_name: String):
	crossfade_to_music(music_name)

func crossfade_to_music(music_name: String, duration: float = 2.0):
	if current_music_name == music_name:
		return
	
	if not silent_mode:
		_log_info("AudioManager", "Crossfading to music: %s" % music_name)
	current_music_name = music_name
	
	var next_player = music_player_b if active_player == music_player_a else music_player_a
	var tween: Tween = null
	
	# Try .ogg then .wav
	var path = "res://assets/audio/music/%s.ogg" % music_name
	if not ResourceLoader.exists(path):
		path = "res://assets/audio/music/%s.wav" % music_name
		
	if not ResourceLoader.exists(path):
		# Music file not found - fade out current music and stop
		if active_player and active_player.playing:
			tween = create_tween()
			tween.tween_property(active_player, "volume_db", -60, duration)
			tween.tween_callback(active_player.stop)
		
		if not silent_mode:
			_log_warn("AudioManager", "Music file not found: %s" % music_name)
		return
	
	next_player.stream = load(path)
	next_player.volume_db = -60 # Start silent
	next_player.play()
	
	tween = create_tween().set_parallel(true)
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

# Enable/disable silent mode (suppresses missing file warnings)
func set_silent_mode(enabled: bool):
	silent_mode = enabled
	_log_info("AudioManager", "Silent mode: %s" % ("enabled" if enabled else "disabled"))

# Enable/disable procedural audio generation
func set_procedural_audio(enabled: bool):
	use_procedural_audio = enabled
	_log_info("AudioManager", "Procedural audio: %s" % ("enabled" if enabled else "disabled"))

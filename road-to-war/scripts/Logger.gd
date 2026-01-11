extends Node

# Logger.gd - Global logging utility

enum Level { INFO, WARN, ERROR, DEBUG }

func info(source: String, message: String):
	var line = "[%s] [INFO] %s" % [source, message]
	# Only print once - CursorLogManager will handle file logging if needed
	# Removed double-printing to prevent output overflow
	if has_node("/root/CursorLogManager"):
		get_node("/root/CursorLogManager").debug_log(line)
	else:
		print(line)  # Fallback if CursorLogManager not available

func warn(source: String, message: String):
	var line = "[%s] [WARN] %s" % [source, message]
	# Only print once - CursorLogManager will handle file logging if needed
	# Removed double-printing to prevent output overflow
	if has_node("/root/CursorLogManager"):
		get_node("/root/CursorLogManager").debug_log(line)
	else:
		print_rich("[color=yellow]%s[/color]" % line)  # Fallback if CursorLogManager not available

func error(source: String, message: String):
	var line = "[%s] [ERROR] %s" % [source, message]
	# Errors are critical - always print and push, but avoid double logging
	push_error(line)
	if has_node("/root/CursorLogManager"):
		get_node("/root/CursorLogManager").debug_log(line)
	else:
		print_rich("[color=red]%s[/color]" % line)  # Fallback if CursorLogManager not available

func debug(source: String, message: String):
	if OS.is_debug_build():
		var line = "[%s] [DEBUG] %s" % [source, message]
		# Only print once - CursorLogManager will handle file logging if needed
		# Removed double-printing to prevent output overflow
		if has_node("/root/CursorLogManager"):
			get_node("/root/CursorLogManager").debug_log(line)
		else:
			print(line)  # Fallback if CursorLogManager not available

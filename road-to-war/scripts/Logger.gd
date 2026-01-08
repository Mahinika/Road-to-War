extends Node

# Logger.gd - Global logging utility

enum Level { INFO, WARN, ERROR, DEBUG }

func info(source: String, message: String):
	var line = "[%s] [INFO] %s" % [source, message]
	print(line)
	if has_node("/root/CursorLogManager"):
		get_node("/root/CursorLogManager").debug_log(line)

func warn(source: String, message: String):
	var line = "[%s] [WARN] %s" % [source, message]
	print_rich("[color=yellow]%s[/color]" % line)
	if has_node("/root/CursorLogManager"):
		get_node("/root/CursorLogManager").debug_log(line)

func error(source: String, message: String):
	var line = "[%s] [ERROR] %s" % [source, message]
	print_rich("[color=red]%s[/color]" % line)
	push_error(line)
	if has_node("/root/CursorLogManager"):
		get_node("/root/CursorLogManager").debug_log(line)

func debug(source: String, message: String):
	if OS.is_debug_build():
		var line = "[%s] [DEBUG] %s" % [source, message]
		print(line)
		if has_node("/root/CursorLogManager"):
			get_node("/root/CursorLogManager").debug_log(line)


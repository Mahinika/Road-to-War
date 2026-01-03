extends Node

# Logger.gd - Global logging utility

enum Level { INFO, WARN, ERROR, DEBUG }

func info(source: String, message: String):
	print("[%s] [INFO] %s" % [source, message])

func warn(source: String, message: String):
	print_rich("[color=yellow][%s] [WARN] %s[/color]" % [source, message])

func error(source: String, message: String):
	print_rich("[color=red][%s] [ERROR] %s[/color]" % [source, message])
	push_error("[%s] %s" % [source, message])

func debug(source: String, message: String):
	if OS.is_debug_build():
		print("[%s] [DEBUG] %s" % [source, message])


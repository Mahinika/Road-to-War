extends Node

# ErrorHandling.gd - Safe execution wrapper
# Migrated from src/utils/error-handling.js

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_error(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.error(source, message)
	else:
		print("[%s] [ERROR] %s" % [source, message])

func _ready():
	_log_info("ErrorHandling", "Initialized")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

# Safe executor - wraps function calls with error handling
static func safe_execute(func_call: Callable, default_return = null, source: String = "Unknown") -> Variant:
	var result = default_return
	var error_handler = Engine.get_main_loop().root.get_node_or_null("/root/ErrorHandler")
	
	if not func_call.is_valid():
		if error_handler:
			error_handler.handle_error(source, "Invalid Callable")
		return default_return
	
	var error = null
	result = func_call.call()
	
	if error:
		if error_handler:
			error_handler.handle_error(source, str(error))
		return default_return
	
	return result

# Safe execute with retry
static func safe_execute_with_retry(func_call: Callable, max_retries: int = 3, default_return = null, source: String = "Unknown") -> Variant:
	for attempt in range(max_retries):
		var result = safe_execute(func_call, default_return, source)
		if result != default_return:
			return result
		
		if attempt < max_retries - 1:
			await Engine.get_main_loop().process_frame
	
	return default_return


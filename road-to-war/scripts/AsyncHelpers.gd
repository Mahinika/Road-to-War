extends Node

# AsyncHelpers.gd - Async operation utilities
# Godot 4.x async operation utilities
# In Godot, we use coroutines instead of Promises

func _get_logger():
	return get_node_or_null("/root/Logger")

func _log_info(source: String, message: String):
	var logger = _get_logger()
	if logger:
		logger.info(source, message)
	else:
		print("[%s] [INFO] %s" % [source, message])

func _ready():
	_log_info("AsyncHelpers", "Initialized")

# Wait for a condition to be true (coroutine-based)
func wait_for_condition(condition: Callable, timeout: float = 5.0) -> bool:
	var elapsed = 0.0
	while not condition.call():
		await get_tree().process_frame
		elapsed += get_process_delta_time()
		if elapsed >= timeout:
			return false
	return true

# Delay execution (coroutine-based)
func delay(seconds: float):
	await get_tree().create_timer(seconds).timeout

# Run multiple coroutines in parallel and wait for all
func wait_for_all(coroutines: Array) -> Array:
	var results = []
	for coroutine in coroutines:
		if coroutine is Callable:
			results.append(await coroutine.call())
		else:
			# In Godot 4, coroutines are handled directly via await
			results.append(await coroutine)
	return results

# Run multiple coroutines and wait for first to complete
func wait_for_first(coroutines: Array):
	var tasks = []
	for coroutine in coroutines:
		if coroutine is Callable:
			tasks.append(coroutine.call())
		else:
			tasks.append(coroutine)
	
	# Wait for first to complete
	while tasks.size() > 0:
		await get_tree().process_frame
		for i in range(tasks.size() - 1, -1, -1):
			# In Godot 4, we can't check completion state easily
			# So we'll just try to await and catch if it's already done
			var task = tasks[i]
			if task is Callable:
				var result = await task.call()
				return result
			else:
				# Assume it's a coroutine, try to await
				var result = await task
				return result
	
	return null

# Retry an operation with exponential backoff
func retry_with_backoff(operation: Callable, max_retries: int = 3, initial_delay: float = 0.1) -> Variant:
	for attempt in range(max_retries):
		var result = operation.call()
		if result != null:
			return result
		
		if attempt < max_retries - 1:
			var delay_time = initial_delay * pow(2, attempt)
			await delay(delay_time)
	
	return null


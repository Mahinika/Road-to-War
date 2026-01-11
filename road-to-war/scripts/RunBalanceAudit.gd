extends Node

func _ready():
	print("\n=== RUNNING BALANCE AUDIT ===\n")
	await get_tree().process_frame
	run_balance_audit()

func run_balance_audit():
	var test_suite = get_node_or_null("/root/TestSuite")
	if not test_suite:
		test_suite = preload("res://tests/TestSuite.gd").new()
		add_child(test_suite)
	test_suite.test_stats_audit()
	await get_tree().create_timer(0.5).timeout
	print("\n=== BALANCE AUDIT COMPLETE ===\n")
	get_tree().quit()

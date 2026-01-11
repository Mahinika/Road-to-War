extends SceneTree

# Standalone script that can be run via: godot --path <project> --script res://scripts/RunBalanceAuditCLI.gd
# This creates its own scene tree and runs the audit directly
# Usage: godot --path road-to-war --script res://scripts/RunBalanceAuditCLI.gd

func _init():
	print("\n=== RUNNING BALANCE AUDIT (CLI MODE) ===\n")
	print("Initializing scene tree...")
	call_deferred("run_audit")

func run_audit():
	# Wait for scene tree to initialize
	await process_frame
	await process_frame  # Wait 2 frames to ensure all autoloads are initialized
	
	print("Running balance audit test...\n")
	
	# Create TestSuite node and run the audit
	var test_suite_node = Node.new()
	test_suite_node.name = "TestSuite"
	test_suite_node.set_script(preload("res://tests/TestSuite.gd"))
	add_child(test_suite_node)
	
	# Wait for audit to complete (TestSuite runs synchronously but needs time to write report)
	await create_timer(5.0).timeout
	
	# Check report location (user://stats_audit_report.json)
	var report_path = "user://stats_audit_report.json"
	var report_file = FileAccess.open(report_path, FileAccess.READ)
	
	if report_file:
		var content = report_file.get_as_text()
		report_file.close()
		
		if content.length() > 0:
			print("\n✅ Balance audit complete!")
			print("   Report: ", OS.get_user_data_dir().path_join("stats_audit_report.json"))
			
			# Also copy to .cursor/ for easy access
			var cursor_dir = OS.get_user_data_dir().get_base_dir().path_join(".cursor")
			if not DirAccess.dir_exists_absolute(cursor_dir):
				DirAccess.make_dir_recursive_absolute(cursor_dir)
			
			var cursor_report = cursor_dir.path_join("stats_audit_report.json")
			var cursor_file = FileAccess.open(cursor_report, FileAccess.WRITE)
			if cursor_file:
				cursor_file.store_string(content)
				cursor_file.close()
				print("   Copied to: ", cursor_report)
		else:
			print("\n⚠️  Audit completed but report is empty")
	else:
		print("\n⚠️  Audit completed but report not found at: ", report_path)
		print("   Expected location: ", OS.get_user_data_dir().path_join("stats_audit_report.json"))
	
	print("\n=== BALANCE AUDIT COMPLETE ===\n")
	quit()

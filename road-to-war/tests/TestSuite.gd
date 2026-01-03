extends Node

# TestSuite.gd - Automated verification of core game systems

func run_all_tests():
	print("\n=== STARTING GODOT TEST SUITE ===\n")
	
	test_data_manager()
	test_party_manager()
	test_stat_calculator()
	test_damage_calculator()
	test_save_load_system()
	test_loot_manager()
	test_level_up_system()
	test_ability_manager()
	test_status_effects_manager()
	test_resource_manager()
	test_shop_manager()
	test_achievement_manager()
	test_statistics_manager()
	test_movement_manager()
	test_procedural_generator()
	test_combat_flow()
	
	print("\n=== TEST SUITE COMPLETED ===\n")

func test_data_manager():
	print("[TEST] DataManager...")
	var enemies = DataManager.get_data("enemies")
	assert(enemies != null, "Enemies data should be loaded")
	assert(enemies.has("slime"), "Enemies data should contain slime")
	print("  - DataManager: PASS")

func test_party_manager():
	print("[TEST] PartyManager...")
	# Reset party
	PartyManager.heroes.clear()
	
	var hero = Hero.new()
	hero.id = "test_hero"
	hero.name = "Tester"
	PartyManager.add_hero(hero)
	
	assert(PartyManager.heroes.size() == 1, "Party should have 1 hero")
	assert(PartyManager.get_hero_by_id("test_hero") != null, "Should find hero by ID")
	print("  - PartyManager: PASS")

func test_stat_calculator():
	print("[TEST] StatCalculator...")
	var hero = PartyManager.get_hero_by_id("test_hero")
	hero.base_stats = {"stamina": 10, "strength": 10}
	
	StatCalculator.recalculate_hero_stats(hero)
	var stats = hero.current_stats
	
	# Default stamina 10 = 100 bonus HP + 100 base = 200 MaxHealth
	assert(stats.get("maxHealth") >= 100, "MaxHealth should be calculated")
	print("  - StatCalculator: PASS")

func test_damage_calculator():
	print("[TEST] DamageCalculator...")
	var attacker_stats = {"attack": 20, "critChance": 0}
	var target_stats = {"defense": 5}
	
	var result = DamageCalculator.calculate_damage(attacker_stats, target_stats)
	assert(result.has("damage"), "Result should have damage")
	assert(result["damage"] > 0 or result.get("miss", false), "Damage should be positive on non-miss")
	print("  - DamageCalculator: PASS")

func test_save_load_system():
	print("[TEST] SaveManager (Enhanced)...")
	# Use slot 3 for testing (valid slot)
	var test_slot = 3
	
	# 1. Prepare State
	PartyManager.heroes.clear()
	var hero = Hero.new()
	hero.id = "save_test_hero"
	hero.name = "Tester"
	hero.level = 10
	PartyManager.add_hero(hero)
	
	WorldManager.current_mile = 5
	WorldManager.max_mile_reached = 10
	WorldManager.distance_traveled = 1234.5
	
	# 2. Save
	SaveManager.save_game(test_slot)
	
	# 3. Modify/Clear state in memory
	hero.name = "Modified"
	WorldManager.current_mile = 0
	
	# 4. Load back from file
	var save_data = SaveManager.load_game(test_slot)
	assert(save_data != null and not save_data.is_empty(), "Save data should exist")
	assert(save_data.has("world"), "Save data should contain world")
	
	# 5. Apply
	SaveManager.apply_save_data(save_data)
	
	# 6. Verify data integrity
	var loaded_hero = PartyManager.get_hero_by_id("save_test_hero")
	assert(loaded_hero != null, "Should find loaded hero")
	assert(loaded_hero.name == "Tester", "Hero name should be restored to 'Tester'")
	assert(loaded_hero.level == 10, "Hero level should be 10")
	
	assert(WorldManager.current_mile == 5, "World mile should be 5")
	assert(WorldManager.max_mile_reached == 10, "Max mile should be 10")
	
	print("  - SaveManager (Enhanced): PASS")

func test_loot_manager():
	print("[TEST] LootManager...")
	
	# Clear state
	LootManager.inventory.clear()
	LootManager.active_loot_items.clear()
	LootManager.loot_filter = "common"
	
	# 1. Test Spawning
	var enemy = {"id": "test_enemy", "x": 100, "y": 100}
	var drops = [{"id": "rusty_sword", "quantity": 1}]
	LootManager.spawn_loot(enemy, drops)
	assert(LootManager.active_loot_items.size() >= 1, "Should spawn at least 1 loot item")
	
	# 2. Test Pickup
	var loot_item = LootManager.active_loot_items[0]
	var success = LootManager.pickup_loot(loot_item)
	assert(success, "Pickup should succeed")
	assert(LootManager.inventory.size() == 1, "Inventory should have 1 item")
	
	# 3. Test Filter
	LootManager.loot_filter = "rare"
	var common_item = {
		"id": "junk",
		"quality": "common",
		"x": 0, "y": 0,
		"data": {"name": "Junk"}
	}
	var filtered = LootManager.pickup_loot(common_item)
	assert(filtered == true, "Filtered item should return true but not be added")
	assert(LootManager.inventory.size() == 1, "Inventory should still have 1 item")
	
	# 4. Test Inventory Full
	LootManager.max_inventory_size = 1
	var rare_item = {
		"id": "epic_sword",
		"quality": "rare",
		"x": 0, "y": 0,
		"data": {"name": "Epic Sword"}
	}
	LootManager.loot_filter = "common"
	var full_success = LootManager.pickup_loot(rare_item)
	assert(full_success == false, "Pickup should fail when inventory is full")
	
	print("  - LootManager: PASS")

func test_level_up_system():
	print("[TEST] Level Up System...")
	# 1. Prepare Hero
	var hero = Hero.new()
	hero.id = "lvl_test_hero"
	hero.level = 1
	hero.experience = 0
	hero.base_stats = {"stamina": 10, "maxHealth": 100}
	StatCalculator.recalculate_hero_stats(hero)
	
	var initial_hp = hero.current_stats.get("maxHealth", 100)
	var initial_points = hero.available_talent_points
	
	# 2. Gain Experience
	var exp_to_level = hero.get_experience_needed()
	hero.gain_experience(exp_to_level + 10)
	
	# 3. Verify Level Up
	assert(hero.level == 2, "Hero should be level 2")
	assert(hero.available_talent_points == initial_points + 1, "Should gain 1 talent point")
	
	# 4. Verify Stat Growth
	StatCalculator.recalculate_hero_stats(hero)
	var new_hp = hero.current_stats.get("maxHealth", 100)
	# World config usually has stat gains per level
	assert(new_hp >= initial_hp, "HP should not decrease on level up")
	
	print("  - Level Up System: PASS")

func test_ability_manager():
	print("[TEST] AbilityManager...")
	var hero_id = "test_hero"
	# Ensure the hero exists in the party for class-specific lookup
	var hero = PartyManager.get_hero_by_id(hero_id)
	if not hero:
		hero = Hero.new()
		hero.id = hero_id
		hero.class_id = "paladin"
		PartyManager.add_hero(hero)
		
	AbilityManager.initialize_hero_cooldowns(hero_id)
	
	# Test definition fetching (general)
	var def_gen = AbilityManager.get_ability_definition(hero_id, "auto_attack")
	assert(def_gen != null and def_gen.has("name"), "Should fetch general ability definition")
	
	# Test definition fetching (class)
	var def_class = AbilityManager.get_ability_definition(hero_id, "judgment")
	assert(def_class != null and def_class.has("name"), "Should fetch class ability definition")
	
	# Test cooldown setting
	AbilityManager.set_cooldown(hero_id, "judgment")
	assert(AbilityManager.is_on_cooldown(hero_id, "judgment"), "Ability should be on cooldown")
	
	# Test cooldown update
	AbilityManager.update_cooldowns()
	print("  - AbilityManager: PASS")

func test_status_effects_manager():
	print("[TEST] StatusEffectsManager...")
	var target_id = "test_target"
	
	# Test applying effect
	StatusEffectsManager.apply_effect(target_id, "stun", 2)
	assert(StatusEffectsManager.has_effect(target_id, "stun"), "Target should have stun")
	
	# Test processing turn
	var result = StatusEffectsManager.process_turn(target_id)
	assert(result.has("stat_mods"), "Result should have stat modifiers")
	
	# Test clearing
	StatusEffectsManager.clear_effects(target_id)
	assert(not StatusEffectsManager.has_effect(target_id, "stun"), "Stun should be cleared")
	print("  - StatusEffectsManager: PASS")

func test_resource_manager():
	print("[TEST] ResourceManager...")
	var hero_id = "res_test_hero"
	ResourceManager.initialize_hero_resources(hero_id)
	
	var type = ResourceManager.get_resource_type(hero_id)
	var initial = ResourceManager.get_resource(hero_id, type)
	
	# Test consumption
	var success = ResourceManager.consume_resource(hero_id, type, 10.0)
	assert(success, "Consumption should succeed")
	assert(ResourceManager.get_resource(hero_id, type) < initial, "Resource should decrease")
	
	# Test regeneration
	ResourceManager.regenerate_resources(hero_id, 1.0)
	assert(ResourceManager.get_resource(hero_id, type) > (initial - 10.0), "Resource should regenerate")
	print("  - ResourceManager: PASS")

func test_shop_manager():
	print("[TEST] ShopManager...")
	ShopManager.player_gold = 500
	
	# Test adding gold
	ShopManager.add_gold(100)
	assert(ShopManager.player_gold == 600, "Gold should increase")
	print("  - ShopManager: PASS")

func test_achievement_manager():
	print("[TEST] AchievementManager...")
	# Ensure achievements are initialized
	AchievementManager._initialize_achievements()
	
	AchievementManager.unlock_achievement("defeat_10_enemies")
	assert(AchievementManager.is_unlocked("defeat_10_enemies"), "Achievement should be unlocked")
	
	var all = AchievementManager.get_all_achievements()
	assert(all is Dictionary and all.size() > 0, "Should return achievement list")
	print("  - AchievementManager: PASS")

func test_statistics_manager():
	print("[TEST] StatisticsManager...")
	StatisticsManager.increment_stat("combat", "enemiesDefeated", 1)
	var stats = StatisticsManager.get_all_stats()
	assert(stats.get("enemies_defeated", 0) >= 1, "Stat should be tracked")
	print("  - StatisticsManager: PASS")

func test_movement_manager():
	print("[TEST] MovementManager...")
	# Ensure some heroes exist for formation
	if PartyManager.heroes.is_empty():
		var hero = Hero.new()
		hero.id = "move_hero"
		hero.role = "tank"
		PartyManager.add_hero(hero)
		
	MovementManager.update_party_formation()
	var pos = MovementManager.get_target_position("move_hero", true)
	assert(pos != Vector2.ZERO, "Should have a formation position")
	
	var charge = MovementManager.get_charge_position(Vector2(0,0), Vector2(100, 100))
	assert(charge.distance_to(Vector2(100, 100)) < 100, "Charge position should be offset")
	print("  - MovementManager: PASS")

func test_procedural_generator():
	print("[TEST] ProceduralItemGenerator...")
	var item = ProceduralItemGenerator.generate_random_item(10, "common")
	assert(item != null and item.has("id"), "Should generate random item")
	assert(item["level"] == 10, "Item level should match")
	
	var weapon = ProceduralItemGenerator.generate_weapon(15, "1h_sword", "rare")
	assert(weapon["rarity"] == "rare", "Weapon rarity should match")
	print("  - ProceduralItemGenerator: PASS")

func test_combat_flow():
	print("[TEST] Combat Flow (Full Lifecycle)...")
	# 1. Setup combat
	var enemy_group = [
		{"id": "slime", "name": "Test Slime", "level": 1, "stats": {"health": 50, "attack": 5}}
	]
	
	# 2. Start Combat
	CombatManager.start_party_combat(enemy_group)
	assert(CombatManager.in_combat == true, "Should be in combat")
	assert(CombatManager.current_combat.has("enemies"), "Should have enemy group")
	
	# 3. Simulate turn processing
	CombatManager._process_turn()
	
	# 4. Force end combat for verification
	CombatManager._end_combat(true)
	assert(CombatManager.in_combat == false, "Combat should have ended")
	print("  - Combat Flow: PASS")

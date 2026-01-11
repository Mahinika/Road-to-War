# Error Patterns Library

This document catalogs common bugs, their root causes, fixes, and prevention strategies. Refer to this when encountering errors to avoid repeating past mistakes.

## Pattern Format
Each pattern includes:
- **Symptom**: What error message or behavior you see
- **Root Cause**: Why the error occurs
- **Fix**: How to resolve it
- **Prevention**: How to avoid it in the future
- **Files Affected**: Where this pattern has appeared
- **Related Decisions**: Links to architectural decisions that address this

---

## Pattern 1: Lambda Capture Errors in Signal Connections

**Severity**: CRITICAL (Causes crashes)

**Symptom**:
```
Lambda capture at index 0 was freed
```
Game crashes when UI nodes are freed during scene transitions, particularly when navigating between scenes.

**Root Cause**:
Anonymous functions (lambdas) used in signal connections create closures that capture references to nodes. When the scene transitions and nodes are freed, Godot's garbage collector attempts to free these captured references, but the signal connection still holds a reference to the freed lambda, causing a crash.

**Fix**:
Always use named methods instead of anonymous functions for signal connections:

❌ **BAD** (Causes crash):
```gdscript
button.connect("pressed", func(): do_something())
signal_emitter.connect("signal_name", func(value): handle_value(value))
```

✅ **GOOD** (Safe):
```gdscript
button.connect("pressed", _on_button_pressed)
signal_emitter.connect("signal_name", _on_signal_emitted)

func _on_button_pressed() -> void:
    do_something()

func _on_signal_emitted(value) -> void:
    handle_value(value)
```

**Prevention**:
- **Code Review Checklist**: Always check signal connections use named methods
- **Linter Rule**: Consider adding lint rule to flag anonymous functions in signal connections
- **Pattern**: Create a helper function `connect_safe()` that enforces named method pattern
- **Documentation**: Document this pattern in onboarding/development guides

**Files Affected** (All fixed in January 2026):
- `road-to-war/scripts/HUD.gd`
- `road-to-war/scripts/Inventory.gd`
- `road-to-war/scripts/WorldMap.gd`
- `road-to-war/scripts/Prestige.gd`
- `road-to-war/scripts/World.gd`
- `road-to-war/scripts/EnemySprite.gd`
- `road-to-war/scripts/ParticleManager.gd`
- `road-to-war/scripts/AudioManager.gd`
- `road-to-war/scripts/CameraManager.gd`
- `road-to-war/scripts/CombatActions.gd`

**Related Decisions**: Decision #7 (Lambda Capture Fix Pattern)

**Additional Notes**:
- This pattern is specific to Godot 4.x signal system
- Named methods are properly tracked by Godot's reference counting system
- If you must use anonymous functions, ensure the connected object outlives the signal emitter (rare case)

---

## Pattern 2: Circular Dependency Issues with Autoload Initialization

**Severity**: CRITICAL (Prevents game startup)

**Symptom**:
- Game fails to start or managers fail to initialize
- Autoload initialization errors
- Managers return null even though they're defined in project.godot
- Runtime errors about undefined references

**Root Cause**:
Strict type hints on Autoload references force Godot to initialize managers in a specific order. If Manager A has `var manager_b: ManagerB` and Manager B has `var manager_a: ManagerA`, Godot cannot resolve the initialization order, causing failures.

**Fix**:
Remove strict typing on Autoload references, allowing Godot flexible loading:

❌ **BAD** (Causes circular dependency):
```gdscript
# In ManagerA.gd
var manager_b: ManagerB  # Strict type forces load order

# In ManagerB.gd
var manager_a: ManagerA  # Circular dependency!
```

✅ **GOOD** (Flexible):
```gdscript
# In ManagerA.gd
var manager_b  # No strict type, Godot can load in any order

# Access with runtime validation if needed
func _ready() -> void:
    manager_b = get_node("/root/ManagerB")
    if not manager_b:
        push_error("ManagerB not found!")
```

**Prevention**:
- **Guideline**: Avoid strict type hints on Autoload references
- **Pattern**: Use `get_node("/root/ManagerName")` in `_ready()` for explicit access
- **Validation**: Add null checks after accessing Autoloads if order is uncertain
- **Design**: Minimize cross-manager dependencies in initialization

**Files Affected**:
- All managers during Godot migration (January 2026)
- Specifically resolved by removing strict typing across all managers

**Related Decisions**: Decision #9 (Removed Strict Typing on Autoload References)

**Additional Notes**:
- Runtime type validation can be added where needed (e.g., `assert(manager_b is ManagerB)`)
- Godot's Autoload system is designed for flexible initialization
- If strict typing is required, carefully design initialization order

---

## Pattern 3: Memory Leaks from Event Listeners / Signal Connections

**Severity**: HIGH (Causes performance degradation over time)

**Symptom**:
- Game performance gradually degrades during long play sessions
- Memory usage increases over time without corresponding gameplay increase
- Event handlers fire multiple times or at wrong times
- UI becomes unresponsive after scene transitions

**Root Cause**:
Signal connections are not disconnected when nodes are freed. Each time a scene is loaded, new connections are made, but old connections remain active if the previous scene's nodes weren't properly cleaned up. This accumulates event listeners and prevents garbage collection.

**Fix**:
Always disconnect signals in `_exit_tree()` or when nodes are about to be freed:

✅ **GOOD** (Proper cleanup):
```gdscript
func _ready() -> void:
    button.connect("pressed", _on_button_pressed)
    manager.signal_name.connect(_on_signal)

func _exit_tree() -> void:
    if button and button.is_connected("pressed", _on_button_pressed):
        button.disconnect("pressed", _on_button_pressed)
    if manager.signal_name.is_connected(_on_signal):
        manager.signal_name.disconnect(_on_signal)
```

**Alternative Pattern** (SceneResourceManager):
For complex scenes with many connections, use a resource manager pattern:

```gdscript
var _signal_connections: Array[Dictionary] = []

func connect_safe(source: Object, signal_name: String, target: Callable) -> void:
    source.connect(signal_name, target)
    _signal_connections.append({
        "source": source,
        "signal": signal_name,
        "target": target
    })

func _exit_tree() -> void:
    for conn in _signal_connections:
        if conn.source and conn.source.is_connected(conn.signal, conn.target):
            conn.source.disconnect(conn.signal, conn.target)
    _signal_connections.clear()
```

**Prevention**:
- **Pattern**: Always pair `connect()` with `disconnect()` in `_exit_tree()`
- **Code Review**: Check all scenes have proper cleanup
- **Linter**: Consider adding check for signal connections without cleanup
- **Memory Monitor**: Use MemoryMonitor.gd (automatically enabled in dev mode) to detect leaks

**Files Affected** (Historical - Phaser to Godot migration, now resolved):
- All scene files during Phaser 3 to Godot migration
- Resolved by implementing proper `_exit_tree()` cleanup in Godot 4.x

**Related Decisions**: Decision #2 (Signal-Based Communication)

**Additional Notes**:
- Godot's signal system is reference-counted, but manual cleanup is still required
- `_exit_tree()` is called before node is freed, making it ideal for cleanup
- SceneResourceManager pattern helps for complex scenes with many connections

---

## Pattern 4: Type Inference Errors in GDScript

**Severity**: MEDIUM (Causes warnings, potential runtime issues)

**Symptom**:
```
Cannot infer type
```
GDScript warnings about unable to determine variable types, particularly in complex expressions or when using generic functions like `max()`, `min()`, `clamp()`.

**Root Cause**:
GDScript's type inference system cannot always determine types in complex expressions, especially when:
- Using generic functions that work with multiple types
- Complex nested expressions
- Mixing typed and untyped variables
- Using Godot's generic math functions

**Fix**:
Use explicit type hints and Godot's type-specific functions:

❌ **BAD** (Causes type inference error):
```gdscript
var result = max(value1, value2)  # Cannot infer type
var clamped = clamp(value, min_val, max_val)  # Ambiguous
```

✅ **GOOD** (Explicit typing):
```gdscript
var result: int = maxi(value1, value2)  # Explicit int max
var clamped: float = clampf(value, min_val, max_val)  # Explicit float clamp

# Or with explicit variable types
var value1: int = 10
var value2: int = 20
var result: int = maxi(value1, value2)
```

**Type-Specific Functions**:
- `maxi(a, b)` - Integer max
- `mini(a, b)` - Integer min
- `maxf(a, b)` - Float max
- `minf(a, b)` - Float min
- `clampi(value, min, max)` - Integer clamp
- `clampf(value, min, max)` - Float clamp

**Prevention**:
- **Guideline**: Always use explicit type hints for variables
- **Pattern**: Use type-specific math functions (maxi, clampf, etc.)
- **Linter**: Enable strict typing in development (`@tool` scripts can help catch these)
- **Code Review**: Check for generic functions that should be type-specific

**Files Affected** (Fixed in January 2026):
- `road-to-war/scripts/AbilityManager.gd`
- `road-to-war/scripts/Spellbook.gd`
- `road-to-war/scripts/World.gd`

**Additional Notes**:
- Strict typing improves performance and catches bugs early
- Type inference errors are warnings, but fixing them improves code quality
- Godot 4.x improved type inference, but explicit typing is still preferred

---

## Pattern 5: Party Combat Integration Bugs

**Severity**: CRITICAL (Breaks core gameplay)

**Symptom**:
- Only single hero attacks during party combat (other 4 heroes do nothing)
- Combat never ends (check_combat_end() doesn't detect party deaths)
- Party combat never triggers (always uses single-hero combat)
- Incorrect damage/healing calculations (treating party as single hero)

**Root Cause**:
Code paths assume single-hero structure (`current_combat.hero`) instead of checking for party structure (`current_combat.party`). When party system was added, these code paths were not updated to handle both cases.

**Fix**:
Always check for party structure before assuming single-hero structure:

❌ **BAD** (Assumes single hero):
```gdscript
func check_combat_end() -> bool:
    if current_combat.hero.health <= 0:
        return true  # Wrong! Doesn't check party
    return false

func execute_attack() -> void:
    execute_hero_ability(current_combat.hero)  # Only one hero attacks!
```

✅ **GOOD** (Handles both):
```gdscript
func check_combat_end() -> bool:
    if current_combat.has("party"):
        # Party combat: check all heroes
        for hero in current_combat.party:
            if hero.health > 0:
                return false
        return true  # All heroes dead
    else:
        # Single hero combat
        return current_combat.hero.health <= 0

func execute_attack() -> void:
    if current_combat.has("party"):
        execute_party_attack(current_combat.party)
    else:
        execute_hero_ability(current_combat.hero)
```

**Prevention**:
- **Pattern**: Always check `has("party")` before accessing party or hero
- **Design**: Use consistent combat structure (always include party field, even if empty)
- **Testing**: Test both single-hero and party combat paths
- **Code Review**: Verify all combat methods handle party structure

**Files Affected** (Fixed December 2025):
- `road-to-war/scripts/CombatManager.gd` - Added party detection in `check_combat_end()` and `scheduleNextCombatAction()`
- `road-to-war/scripts/WorldManager.gd` - Fixed `triggerCombat()` to emit `party_combat_start` when party exists

**Related Decisions**: Decision #12 (5-Man Party System Architecture)

**Additional Notes**:
- This bug pattern emerged during migration from single-hero to party system
- Future combat changes should always consider both single-hero and party cases
- Consider creating a `CombatState` class to encapsulate combat structure

---

## Pattern 6: Missing Signal Disconnections in Scene Transitions

**Severity**: MEDIUM (Causes event handler accumulation)

**Symptom**:
- UI buttons trigger multiple times after scene transitions
- Managers receive duplicate events
- Performance degradation after multiple scene loads
- Unusual behavior when returning to previous scenes

**Root Cause**:
Similar to Pattern #3, but specifically occurs when scenes transition without cleaning up signal connections. The previous scene's connections remain active, so when the new scene loads and makes the same connections, events fire multiple times.

**Fix**:
Ensure scene cleanup in `_exit_tree()` or use SceneManager pattern:

✅ **GOOD** (Scene cleanup):
```gdscript
# In scene script
var _connections: Array = []

func _ready() -> void:
    _connections.append(button.connect("pressed", _on_pressed))
    _connections.append(manager.signal_name.connect(_on_signal))

func _exit_tree() -> void:
    for conn in _connections:
        if conn.get("source") and conn.source.is_connected(conn.signal_name, conn.target):
            conn.source.disconnect(conn.signal_name, conn.target)
    _connections.clear()
```

**Prevention**:
- **Pattern**: Use `_exit_tree()` for all scene cleanup
- **SceneManager**: Use SceneManager.gd's scene transition system which handles cleanup
- **Testing**: Test scene transitions multiple times to catch accumulation issues

**Files Affected**: All scene scripts (ongoing maintenance)

---

## Pattern 7: API Version Mismatches (Godot 4.x Updates)

**Severity**: MEDIUM (Causes runtime errors)

**Symptom**:
- `EMISSION_SHAPE_CIRCLE` not found (should be `EMISSION_SHAPE_SPHERE`)
- Deprecated method warnings
- Nodes fail to initialize with new API

**Root Cause**:
Godot 4.x API changes from previous versions. Code written for Godot 3.x or early 4.x versions uses deprecated or renamed APIs.

**Fix**:
Update to current Godot 4.x API:

❌ **BAD** (Godot 3.x API):
```gdscript
particles.emission_shape = ParticlesMaterial.EMISSION_SHAPE_CIRCLE
```

✅ **GOOD** (Godot 4.x API):
```gdscript
particles.emission_shape = ParticlesMaterial.EMISSION_SHAPE_SPHERE
```

**Prevention**:
- **Documentation**: Check Godot 4.x migration guide for API changes
- **Version**: Pin Godot version in project settings
- **Testing**: Test on target Godot version before committing
- **Linter**: Enable Godot-specific linting to catch deprecated APIs

**Files Affected** (Fixed January 2026):
- `road-to-war/scripts/ParticleManager.gd` - Fixed `EMISSION_SHAPE_CIRCLE` → `EMISSION_SHAPE_SPHERE`

---

## Error Pattern Checklist

When encountering an error, check this list:

- [ ] Is it a lambda capture error? → Use named methods for signals
- [ ] Is it a circular dependency? → Remove strict typing on Autoload references
- [ ] Is it a memory leak? → Check signal disconnections in `_exit_tree()`
- [ ] Is it a type inference error? → Add explicit types and use type-specific functions
- [ ] Is it a party combat bug? → Check for party structure before single-hero logic
- [ ] Is it a signal accumulation? → Ensure scene cleanup on transition
- [ ] Is it an API mismatch? → Check Godot 4.x documentation

## Adding New Patterns

When a new bug is fixed:
1. Document the pattern in this file
2. Include symptom, root cause, fix, and prevention
3. List affected files
4. Link to related architectural decisions
5. Update the checklist if it's a common pattern

---

## Pattern 8: Hero Sprite Visibility Issues (Initialization Race Conditions)

**Severity**: CRITICAL (Game-breaking visual bug)

**Symptom**:
- Hero sprites not visible on screen despite heroes being functional (spells/damage working correctly)
- Heroes exist in scene tree but are invisible
- No errors in console, game plays normally except for missing visuals

**Root Cause**:
Multiple potential causes:
1. **Visibility flags not explicitly set**: Node visibility (`visible`) or modulate alpha (`modulate.a`) may default to hidden/transparent
2. **Texture scaling issues**: Texture scaling logic only handles specific sizes (512x512, 128x128), causing invisible sprites for other dimensions
3. **Double-spawn race condition**: `spawn_party()` called multiple times (from `_ready()` and `_on_hero_added()`), second call clears heroes immediately after creation
4. **Texture load timing**: Textures may not be loaded when visibility is checked

**Fix**:
1. **Explicit visibility enforcement**: Always set `visible = true` and `modulate = Color.WHITE` in `_ready()` and `setup()`:
```gdscript
func _ready():
    if visuals:
        visuals.visible = true
        visuals.modulate = Color.WHITE
    visible = true
    modulate = Color.WHITE

func setup(hero_data):
    # ... setup logic ...
    visible = true
    if visuals:
        visuals.visible = true
        visuals.modulate = Color.WHITE
```

2. **Dynamic texture scaling**: Handle any texture size with calculated scale factors:
```gdscript
var texture_height = tex.get_height()
if texture_height == 512:
    layer.scale = Vector2(0.25, 0.25)
elif texture_height == 128:
    layer.scale = Vector2(1.0, 1.0)
else:
    var scale_factor = 128.0 / float(texture_height)
    layer.scale = Vector2(scale_factor, scale_factor)
```

3. **Concurrent spawn prevention**: Add guard flag to prevent double-spawning:
```gdscript
var _spawning_party: bool = false

func spawn_party():
    if _spawning_party:
        return
    _spawning_party = true
    # ... spawn logic ...
    _spawning_party = false
```

4. **Combat visibility guarantee**: Force heroes visible during combat:
```gdscript
func _process(delta):
    if wm.combat_active and hero_group:
        for node in hero_group.get_children():
            node.visible = true
            var vis_node = node.get_node_or_null("Visuals")
            if vis_node:
                vis_node.modulate = Color.WHITE
```

**Prevention**:
- **Pattern**: Always explicitly set visibility and modulate in sprite initialization
- **Best Practice**: Set visibility at multiple points (_ready, setup, after texture load)
- **Guard Flags**: Use flags to prevent concurrent operations that modify scene tree
- **Defensive Programming**: Force visibility during critical gameplay states (combat)

**Files Affected** (Fixed January 2026):
- `road-to-war/scripts/HeroSprite.gd` - Added explicit visibility enforcement and dynamic texture scaling
- `road-to-war/scripts/World.gd` - Added `_spawning_party` guard flag and double-spawn prevention logic

**Related Decisions**: Decision #13 (Sprite Visibility Guarantee Pattern)

**Additional Notes**:
- This pattern emerged from runtime debugging where heroes spawned correctly but weren't visible
- Visibility issues can be silent (no errors) but completely break the visual experience
- Always verify sprite visibility explicitly rather than assuming default states
- Texture scaling must handle all possible texture dimensions, not just expected sizes

---

## Error Pattern Checklist

When encountering an error, check this list:

- [ ] Is it a lambda capture error? → Use named methods for signals
- [ ] Is it a circular dependency? → Remove strict typing on Autoload references
- [ ] Is it a memory leak? → Check signal disconnections in `_exit_tree()`
- [ ] Is it a type inference error? → Add explicit types and use type-specific functions
- [ ] Is it a party combat bug? → Check for party structure before single-hero logic
- [ ] Is it a signal accumulation? → Ensure scene cleanup on transition
- [ ] Is it an API mismatch? → Check Godot 4.x documentation
- [ ] Are sprites invisible despite being functional? → Check visibility flags, texture scaling, and spawn guards

## Adding New Patterns

When a new bug is fixed:
1. Document the pattern in this file
2. Include symptom, root cause, fix, and prevention
3. List affected files
4. Link to related architectural decisions
5. Update the checklist if it's a common pattern

---

## Pattern 9: Incorrect Camera2D Anchor Mode and Positioning

**Severity**: CRITICAL (Game-breaking visual bug)

**Symptom**:
- Camera appears positioned "way below ground" or in completely wrong location
- Camera not following target node despite correct target assignment
- Hero sprites visible but camera view is offset incorrectly
- Game appears to be underground or off-screen

**Root Cause**:
Camera2D created with wrong anchor mode or positioned incorrectly:
1. **Anchor Mode Issue**: Using `ANCHOR_MODE_FIXED_TOP_LEFT` instead of `ANCHOR_MODE_DRAG_CENTER`
2. **Positioning Method**: Using `global_position` instead of `position` on Camera2D
3. **Result**: Top-left corner of viewport positioned at target instead of center

**Fix**:
1. **Correct Anchor Mode**:
```gdscript
# WRONG - positions top-left corner at location
camera.anchor_mode = Camera2D.ANCHOR_MODE_FIXED_TOP_LEFT

# CORRECT - centers viewport on location
camera.anchor_mode = Camera2D.ANCHOR_MODE_DRAG_CENTER
```

2. **Correct Positioning Method**:
```gdscript
# WRONG - can cause positioning issues with Camera2D
camera.global_position = target_position

# CORRECT - Camera2D centers on its position property
camera.position = target_position
```

**Prevention**:
- **Always use `ANCHOR_MODE_DRAG_CENTER`** for cameras that should center on targets
- **Always use `camera.position`** instead of `camera.global_position` for Camera2D
- **Test camera positioning** immediately after setup to catch offset issues
- **Document**: Camera anchor mode affects positioning behavior significantly

**Files Affected** (Fixed January 2026):
- `road-to-war/scripts/World.gd` - Camera creation and initial positioning
- `road-to-war/scripts/CameraManager.gd` - Camera following and zoom logic

**Related Decisions**: Decision #14 (Camera Anchor Mode and Positioning Fix)

**Additional Notes**:
- Camera2D anchor mode fundamentally changes how positioning works
- `ANCHOR_MODE_FIXED_TOP_LEFT` is rarely correct for game cameras
- This pattern commonly occurs when migrating from other engines or copying camera code
- Always verify camera behavior visually after making positioning changes

---

## Error Pattern Checklist

When encountering an error, check this list:

- [ ] Is it a lambda capture error? → Use named methods for signals
- [ ] Is it a circular dependency? → Remove strict typing on Autoload references
- [ ] Is it a memory leak? → Check signal disconnections in `_exit_tree()`
- [ ] Is it a type inference error? → Add explicit types and use type-specific functions
- [ ] Is it a party combat bug? → Check for party structure before single-hero logic
- [ ] Is it a signal accumulation? → Ensure scene cleanup on transition
- [ ] Is it an API mismatch? → Check Godot 4.x documentation
- [ ] Are sprites invisible despite being functional? → Check visibility flags, texture scaling, and spawn guards
- [ ] Is camera positioned incorrectly (underground/off-screen)? → Check anchor mode and positioning method

## Adding New Patterns

When a new bug is fixed:
1. Document the pattern in this file
2. Include symptom, root cause, fix, and prevention
3. List affected files
4. Link to related architectural decisions
5. Update the checklist if it's a common pattern

---

## Pattern 10: Incorrect Unit Positioning on Road Surface

**Severity**: HIGH (Visual/gameplay immersion breaking)

**Symptom**:
- Heroes and enemies appear to hover/fly above the road surface
- Units positioned unrealistically high above ground level
- Combat and movement feel disconnected from environment
- Road appears as a separate layer from unit positioning

**Root Cause**:
- Incorrect scale adjustment calculations left over from old scaling system
- Road surface positioning not accounting for Line2D width/thickness
- Hard-coded adjustment values that don't match current sprite scaling
- Failure to update positioning logic when visual scale changed

**Fix**:
Calculate proper road surface position based on Line2D properties:

```gdscript
# WRONG - Uses incorrect scale adjustment
var scale_adjustment = 80.0  # Hard-coded from old 2.5x scale
var ry = road_y + y_offset - scale_adjustment

# CORRECT - Position on road surface
var road_surface_y = road_y - (road_width / 2.0)  # For 40px wide road: -20
var ry = road_surface_y + y_offset
```

**Prevention**:
- **Always verify positioning** after scale or visual changes
- **Calculate road surface** based on actual Line2D properties, not hard-coded values
- **Test positioning visually** - units should appear grounded on surfaces
- **Document scale assumptions** - avoid hard-coded adjustments
- **Update positioning logic** when changing sprite scales or offsets

**Files Affected** (Fixed January 2026):
- `road-to-war/scripts/World.gd` - Hero spawning, enemy spawning, movement repositioning

**Related Decisions**: Decision #15 (Unit Grounding and Positioning Fix)

**Additional Notes**:
- Common when migrating from different scaling systems
- Road thickness (Line2D width) affects surface positioning
- Sprite offsets and scales must be considered in positioning calculations
- Visual verification is crucial - positioning bugs are often invisible in code

---

## Error Pattern Checklist

When encountering an error, check this list:

- [ ] Is it a lambda capture error? → Use named methods for signals
- [ ] Is it a circular dependency? → Remove strict typing on Autoload references
- [ ] Is it a memory leak? → Check signal disconnections in `_exit_tree()`
- [ ] Is it a type inference error? → Add explicit types and use type-specific functions
- [ ] Is it a party combat bug? → Check for party structure before single-hero logic
- [ ] Is it a signal accumulation? → Ensure scene cleanup on transition
- [ ] Is it an API mismatch? → Check Godot 4.x documentation
- [ ] Are sprites invisible despite being functional? → Check visibility flags, texture scaling, and spawn guards
- [ ] Is camera positioned incorrectly (underground/off-screen)? → Check anchor mode and positioning method
- [ ] Are units hovering above surfaces? → Check positioning calculations and scale adjustments

## Adding New Patterns

When a new bug is fixed:
1. Document the pattern in this file
2. Include symptom, root cause, fix, and prevention
3. List affected files
4. Link to related architectural decisions
5. Update the checklist if it's a common pattern

---

## Pattern 11: Camera2D Anchor Mode Positioning Bug

**Severity**: CRITICAL (Game-breaking visual bug)

**Symptom**:
- Camera appears positioned "way below ground" or in completely wrong location
- Camera view is offset incorrectly, making game unplayable
- Hero sprites are visible but camera doesn't follow them properly
- Game appears underground or off-screen despite correct hero positioning

**Root Cause**:
Camera2D anchor mode set to `ANCHOR_MODE_FIXED_TOP_LEFT` instead of `ANCHOR_MODE_DRAG_CENTER`:
1. **Anchor Mode Issue**: `FIXED_TOP_LEFT` positions the top-left corner of viewport at camera position
2. **Positioning Method**: Using `global_position` instead of `position` on Camera2D
3. **Result**: Screen corner positioned at hero location instead of screen center

**Fix**:
Always use `ANCHOR_MODE_DRAG_CENTER` for game cameras:

```gdscript
# WRONG - positions screen corner at location
camera = Camera2D.new()
camera.anchor_mode = Camera2D.ANCHOR_MODE_FIXED_TOP_LEFT  # Wrong!
camera.position = hero_pos  # Positions screen corner, not center

# CORRECT - centers screen on location
camera = Camera2D.new()
camera.anchor_mode = Camera2D.ANCHOR_MODE_DRAG_CENTER  # Correct!
camera.position = hero_pos  # Centers screen on position
```

**Prevention**:
- **Always use `ANCHOR_MODE_DRAG_CENTER`** for cameras that should center on targets
- **Always use `camera.position`** instead of `camera.global_position`
- **Test camera positioning immediately** after setup to catch offset issues
- **Default Camera2D behavior** is `ANCHOR_MODE_DRAG_CENTER` - don't change it unless you have a specific reason

**Files Affected** (Fixed January 2026):
- `road-to-war/scripts/World.gd` - Camera initialization
- `road-to-war/scripts/CameraManager.gd` - Camera following and zoom

**Related Decisions**: Decision #14 (Camera2D Anchor Mode and Positioning Method)

**Additional Notes**:
- This is a very common Godot Camera2D mistake
- `ANCHOR_MODE_FIXED_TOP_LEFT` is rarely correct for 2D games
- Camera2D positioning is different from other Node2D positioning
- Always verify camera behavior visually after making changes

---

## Error Pattern Checklist

When encountering an error, check this list:

- [ ] Is it a lambda capture error? → Use named methods for signals
- [ ] Is it a circular dependency? → Remove strict typing on Autoload references
- [ ] Is it a memory leak? → Check signal disconnections in `_exit_tree()`
- [ ] Is it a type inference error? → Add explicit types and use type-specific functions
- [ ] Is it a party combat bug? → Check for party structure before single-hero logic
- [ ] Is it a signal accumulation? → Ensure scene cleanup on transition
- [ ] Is it an API mismatch? → Check Godot 4.x documentation
- [ ] Are sprites invisible despite being functional? → Check visibility flags, texture scaling, and spawn guards
- [ ] Are units hovering above surfaces? → Check positioning calculations and scale adjustments
- [ ] Is camera positioned incorrectly (underground/off-screen)? → Check anchor mode and positioning method

## Adding New Patterns

When a new bug is fixed:
1. Document the pattern in this file
2. Include symptom, root cause, fix, and prevention
3. List affected files
4. Link to related architectural decisions
5. Update the checklist if it's a common pattern

**Last Updated**: January 2026
**Total Patterns Documented**: 11
**Quick Reference**: See Error Pattern Checklist at end of file

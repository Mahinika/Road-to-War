# Hero Visibility Fix - Implementation Plan

## Problem Summary
Heroes disappear during combat due to:
1. Death animation fading heroes to fully transparent (`Color(1.0, 1.0, 1.0, 0.0)`)
2. Visibility being forced every frame in World.gd (workaround, not a fix)
3. No proper state management for hero visibility during combat

## Root Cause Analysis

### HeroSprite.gd Issues
- **Line 231-241**: Death animation fades `modulate.a` from 1.0 to 0.0 over 1.0 seconds
- **Line 313**: `_death_animation_played` flag prevents re-playing death animation
- **Line 318-323**: Animation finished handler sets `modulate.a = 0.0` (fully transparent)

### World.gd Issues
- **Line 331-356**: "Nuclear option" workaround that forces visibility every frame
- **Line 995-1003**: Resets `modulate = Color.WHITE` and `visible = true` after combat
- **Line 617**: Has death animation trigger check but doesn't prevent the fade

## Solution Architecture

### Phase 1: Fix Death Animation State Management
**File**: `HeroSprite.gd`

1. Add `_is_dying` state flag (separate from `_death_animation_played`)
2. Prevent death animation from playing if hero is alive
3. Only allow death animation if `current_health <= 0` AND combat has ended
4. Reset visibility state after combat ends

```gdscript
# Add these variables near line 279
var _is_dying: bool = false
var _was_in_combat: bool = false

# Modify play_animation function around line 281
func play_animation(anim_name: String):
    if anim_name == "death":
        # Only play death if actually dying (health <= 0)
        if not _should_play_death_animation():
            return
        _is_dying = true
    
    # ... rest of function

func _should_play_death_animation() -> bool:
    if not hero_data: return false
    var health = hero_data.get("current_health", 0) if hero_data is Dictionary else hero_data.current_health
    var max_health = hero_data.get("max_health", 100) if hero_data is Dictionary else hero_data.max_health
    return health <= 0 and max_health > 0

# Modify _on_animation_finished around line 318
func _on_animation_finished(anim_name: String):
    if anim_name == "death":
        # Don't fully hide - just fade to 30% alpha
        if visuals:
            visuals.modulate = Color(1.0, 1.0, 1.0, 0.3)
        _is_dying = false
```

### Phase 2: Clean Up World.gd Workarounds
**File**: `World.gd`

1. Remove the "nuclear option" code (lines 331-356)
2. Remove debug logging related to hero visibility
3. Keep proper combat state management

```gdscript
# Remove lines 331-356 - the "NUCLEAR OPTION" code
# Keep simple visibility checks instead:

func _process(delta):
    # ... existing code ...
    
    # Simple visibility check - only force visible if something went wrong
    if hero_group and wm.combat_active:
        for node in hero_group.get_children():
            if not node.visible:
                node.visible = true
                var vis_node = node.get_node_or_null("Visuals")
                if vis_node:
                    vis_node.modulate = Color.WHITE
```

### Phase 3: Add Combat State Integration
**File**: `World.gd`

1. Store pre-combat visibility state
2. Restore visibility after combat ends
3. Don't call death animation on living heroes

```gdscript
# Add these variables near line 928
var _pre_combat_hero_states: Dictionary = {}

# Modify _on_combat_started around line 930
func _on_combat_started(enemies: Array):
    # Store pre-combat states
    if hero_group:
        for hero_node in hero_group.get_children():
            var hero_id = hero_node.hero_data.id if "hero_data" in hero_node else ""
            if hero_id:
                _pre_combat_hero_states[hero_id] = {
                    "visible": hero_node.visible,
                    "modulate": hero_node.get_node_or_null("Visuals").modulate if hero_node.has_node("Visuals") else Color.WHITE
                }
    # ... rest of function

# Modify _on_combat_ended around line 990
func _on_combat_ended(victory: bool):
    combat_movement_enabled = false
    
    # Restore pre-combat states for all heroes
    if hero_group:
        for hero_node in hero_group.get_children():
            var hero_id = hero_node.hero_data.id if "hero_data" in hero_node else ""
            
            if hero_id and _pre_combat_hero_states.has(hero_id):
                var state = _pre_combat_hero_states[hero_id]
                hero_node.visible = state.visible
                var vis_node = hero_node.get_node_or_null("Visuals")
                if vis_node:
                    vis_node.modulate = state.modulate
            else:
                # Fallback to defaults
                hero_node.visible = true
                var vis_node = hero_node.get_node_or_null("Visuals")
                if vis_node:
                    vis_node.modulate = Color.WHITE
            
            # Reset death animation flag
            if "set" in hero_node:
                hero_node.set("_death_animation_played", false)
    
    # Clear stored states
    _pre_combat_hero_states.clear()
    # ... rest of function
```

### Phase 4: Add Health Integration
**File**: `HeroSprite.gd`

1. Check health before playing death animation
2. Add health bar integration for visual feedback

```gdscript
# Modify play_animation around line 281
func play_animation(anim_name: String):
    if anim_name == "death":
        # Double-check health before playing death
        var health = _get_current_health()
        var max_health = _get_max_health()
        
        if health > 0:
            # Hero is alive - play hurt animation instead
            _play_hurt_effect()
            return
        
        if _death_animation_played:
            return
    
    # ... rest of function

func _get_current_health() -> float:
    if not hero_data: return 0
    if hero_data is Dictionary:
        return hero_data.get("current_health", 0)
    return hero_data.current_health if "current_health" in hero_data else 0

func _get_max_health() -> float:
    if not hero_data: return 1
    if hero_data is Dictionary:
        return hero_data.get("max_health", 1)
    return hero_data.max_health if "max_health" in hero_data else 1

func _play_hurt_effect():
    var tween = create_tween()
    if visuals:
        tween.tween_property(visuals, "modulate", Color.RED, 0.05)
        tween.tween_property(visuals, "modulate", Color.WHITE, 0.15)
    
    # Play hurt animation
    if anim_player and anim_player.has_animation("hurt"):
        anim_player.play("hurt")
```

## Implementation Order

1. **Phase 1**: Add state management to HeroSprite.gd (Priority 1)
2. **Phase 2**: Clean up World.gd workarounds (Priority 2)
3. **Phase 3**: Add combat state integration (Priority 3)
4. **Phase 4**: Add health checks (Priority 4 - Optional enhancement)

## Testing Plan

1. Start combat and verify all heroes remain visible
2. Take damage and verify heroes don't fade out
3. Win combat and verify heroes return to normal state
4. Check that death animation only plays when hero actually dies (health <= 0)
5. Verify no "nuclear option" code is needed

## Files Modified

- `road-to-war/scripts/HeroSprite.gd`
- `road-to-war/scripts/World.gd`

## Success Criteria

- ✅ Heroes visible during all combat phases
- ✅ No forced visibility workarounds needed
- ✅ Death animation only plays when hero is dead
- ✅ No transparent heroes after combat ends

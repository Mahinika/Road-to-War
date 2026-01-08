# UI Migration Status: UIBuilder Adoption

**Date**: January 2026  
**Status**: In Progress

## Overview

UIBuilder provides 100+ UI component functions for consistent, WoW-style UI creation. This document tracks the migration of direct UI element creation to UIBuilder usage.

## Migration Progress

### ✅ Completed Migrations

1. **Victory Dialog** (`World.gd::_create_victory_dialog()`) ✅
   - Migrated to use `UIBuilder.create_frame()`, `create_vbox_container()`, `create_title_label()`, `create_body_label()`, `create_button()`
   - Added fallback to manual creation if UIBuilder unavailable
   - **Lines**: ~1100-1190

2. **Brutal Mode Selection Dialog** (`World.gd::_show_brutal_mode_selection()`) ✅
   - Migrated to use `UIBuilder.create_frame()`, `create_vbox_container()`, `create_title_label()`, `create_body_label()`, `create_button()`, `create_scroll_container()`, `create_grid_container()`
   - Added fallback to manual creation
   - **Lines**: ~1190-1298

3. **Prestige Confirmation Dialog** (`World.gd::_show_prestige_confirmation_dialog()`) ✅
   - Migrated to use `UIBuilder.create_frame()`, `create_vbox_container()`, `create_title_label()`, `create_body_label()`, `create_button()`, `create_hbox_container()`
   - Added fallback to manual creation
   - **Lines**: ~1323-1500

4. **SaveLoad.gd** ✅
   - Migrated `_create_slot_button()` to use `UIBuilder.create_button()`
   - Maintains existing functionality with consistent styling
   - **Lines**: ~104-135

5. **HUD.gd** ✅
   - Migrated `EssenceLabel` creation to `UIBuilder.create_label()`
   - Migrated `BrutalLabel` creation to `UIBuilder.create_label()`
   - **Lines**: ~240-278

6. **CharacterPanel.gd** ✅
   - Migrated hero tab buttons to `UIBuilder.create_button()`
   - Migrated equipment slot buttons to `UIBuilder.create_button()`
   - Migrated empty slot labels to `UIBuilder.create_label()`
   - Migrated inventory item buttons to `UIBuilder.create_button()`
   - **Lines**: ~140-381

7. **CharacterCreation.gd** ✅
   - Migrated role_label to `UIBuilder.create_title_label()`
   - Migrated class_label to `UIBuilder.create_heading_label()`
   - Migrated class_button to `UIBuilder.create_button()`
   - Migrated spec_label to `UIBuilder.create_heading_label()`
   - Migrated spec_button to `UIBuilder.create_button()`
   - **Lines**: ~170-334

8. **UnitFrame.gd** ✅
   - Migrated status effect label to `UIBuilder.create_label()`
   - **Lines**: ~153-159

9. **Inventory.gd** ✅
   - Migrated inventory item buttons to `UIBuilder.create_button()`
   - Migrated use popup label to `UIBuilder.create_heading_label()`
   - Migrated use popup buttons to `UIBuilder.create_button()`
   - Migrated cancel buttons to `UIBuilder.create_cancel_button()`
   - Migrated equip popup panel to `UIBuilder.create_frame()`
   - Migrated equip popup labels and buttons to UIBuilder
   - **Lines**: ~28-185

10. **Prestige.gd** ✅
   - Migrated upgrade buttons to `UIBuilder.create_button()`
   - **Lines**: ~75-101

### 📋 Remaining Direct UI Creation

**World.gd** (27 instances found):
- Victory Dialog: ✅ Migrated
- Brutal Mode Dialog: 🔄 In Progress
- Prestige Dialog: 🔄 In Progress
- Other dynamic UI elements: Need audit

**Other Scripts**:
- ✅ SaveLoad.gd - Migrated slot button creation to UIBuilder
- ✅ HUD.gd - Migrated EssenceLabel and BrutalLabel to UIBuilder
- ✅ CharacterPanel.gd - Migrated hero tabs, equipment slots, empty slot labels, and inventory buttons to UIBuilder
- ✅ CharacterCreation.gd - Migrated role_label, class_label, class_button, spec_label, and spec_button to UIBuilder
- ✅ UnitFrame.gd - Migrated status effect label to UIBuilder
- ✅ Inventory.gd - Migrated item buttons, popup labels, popup buttons, and equip popup to UIBuilder
- ✅ Prestige.gd - Migrated upgrade buttons to UIBuilder
- Other scene scripts - Need audit

## Migration Pattern

### Before (Direct Creation):
```gdscript
var panel = Panel.new()
panel.custom_minimum_size = Vector2(700, 500)
var style_box = StyleBoxFlat.new()
style_box.bg_color = Color(0.1, 0.1, 0.15, 0.95)
# ... manual styling ...
panel.add_theme_stylebox_override("panel", style_box)
```

### After (UIBuilder):
```gdscript
var ui_builder = get_node_or_null("/root/UIBuilder")
if not ui_builder:
    _fallback_manual_creation()
    return

var panel = ui_builder.create_frame(parent, Vector2(700, 500), Vector2.ZERO, {
    "bg_color": Color(0.1, 0.1, 0.15, 0.95),
    "border_color": Color(0.8, 0.7, 0.2),
    "border_width": 3
})
```

## Benefits of Migration

1. **Consistency**: All UI uses same WoW-style theme
2. **Maintainability**: Changes to UI style happen in one place (UIBuilder/UITheme)
3. **Code Reduction**: Less boilerplate code
4. **Data-Driven**: UI config can be externalized to JSON if needed

## Next Steps

1. ✅ Complete Victory Dialog migration
2. 🔄 Verify Brutal Mode and Prestige dialogs work correctly
3. 📋 Audit other scripts for direct UI creation
4. 📋 Create UIBuilder helper functions for common dialog patterns
5. 📋 Document UIBuilder usage patterns for future development

## UIBuilder Functions Available

### Frames & Containers
- `create_frame()` - Base WoW-style panel
- `create_panel_container()` - Grouped UI elements
- `create_vbox_container()` - Vertical layout
- `create_hbox_container()` - Horizontal layout
- `create_grid_container()` - Grid layout

### Buttons
- `create_button()` - Standard WoW-style button
- `create_confirm_button()` - Green confirm button
- `create_cancel_button()` - Red cancel button
- `create_action_button()` - Ability/action button

### Labels
- `create_title_label()` - Large title text
- `create_heading_label()` - Section heading
- `create_body_label()` - Body text
- `create_small_label()` - Small text
- `create_rich_text_label()` - BBCode-enabled text

### Progress Bars
- `create_health_bar()` - Health display
- `create_mana_bar()` - Mana display
- `create_xp_bar()` - Experience bar

See `road-to-war/scripts/UIBuilder.gd` for complete list of 100+ functions.


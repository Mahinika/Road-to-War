# Godot MCP Setup Guide

This guide explains how to set up and use the Godot MCP (Model Context Protocol) tools with Cursor for the Road of War project.

## Overview

The Godot MCP allows Cursor to interact directly with your Godot Editor, enabling:
- Scene manipulation
- Node creation and management
- Script editing
- Asset management
- Real-time project interaction

## Prerequisites

1. **Godot 4.x Editor** installed and accessible
2. **GDAI MCP Plugin** installed in your Godot project (if using the plugin)
3. **Cursor** with MCP support enabled

## Setup Steps

### Option 1: Using Built-in Godot MCP (Recommended)

Cursor has built-in Godot MCP support. To use it:

1. **Open Godot Editor** with your project:
   ```bash
   # Navigate to project directory
   cd "C:\Users\Ropbe\Desktop\Road of war\road-to-war"
   
   # Open in Godot (adjust path to your Godot installation)
   "C:\path\to\Godot\Godot_v4.x.exe" --path .
   ```

2. **Verify MCP Tools Available**:
   - The Godot MCP tools should be automatically available in Cursor
   - Tools include: `mcp_godot_get_scene_info`, `mcp_godot_create_object`, `mcp_godot_open_scene`, etc.

3. **Test Connection**:
   - In Cursor, try using a Godot MCP tool
   - Example: Ask to "get current scene info" or "list all scenes"

### Option 2: Using GDAI MCP Plugin

If you have the GDAI MCP Plugin installed:

1. **Install Plugin** (if not already):
   - Download from: https://gdaimcp.com
   - Extract to `road-to-war/addons/gdai-mcp-plugin-godot/`
   - Enable in Godot: Project → Project Settings → Plugins

2. **Get Configuration**:
   - Open Godot Editor
   - Go to "GDAI MCP" tab in bottom panel
   - Copy the JSON configuration shown

3. **Configure Cursor MCP**:
   - Open Cursor Settings → MCP Servers
   - Add new server with the copied JSON configuration
   - Save and restart Cursor

4. **Start MCP Server**:
   - In Godot Editor, click "Start Server" in GDAI MCP tab
   - Verify connection in Cursor

## Available Godot MCP Tools

The following tools are available for Godot project manipulation:

### Scene Management
- `mcp_godot_get_scene_info` - Get information about current scene
- `mcp_godot_open_scene` - Open a scene file
- `mcp_godot_save_scene` - Save current scene
- `mcp_godot_new_scene` - Create new empty scene
- `mcp_godot_get_hierarchy` - Get scene node hierarchy

### Node/Object Management
- `mcp_godot_create_object` - Create new node/object
- `mcp_godot_delete_object` - Delete a node
- `mcp_godot_find_objects_by_name` - Find nodes by name
- `mcp_godot_rename_node` - Rename a node
- `mcp_godot_set_object_transform` - Set position/rotation/scale
- `mcp_godot_get_object_properties` - Get node properties
- `mcp_godot_set_property` - Set node property
- `mcp_godot_set_nested_property` - Set nested property
- `mcp_godot_create_child_object` - Create child node

### Script Management
- `mcp_godot_view_script` - View script file contents
- `mcp_godot_create_script` - Create new script
- `mcp_godot_update_script` - Update script contents
- `mcp_godot_list_scripts` - List all scripts

### Asset Management
- `mcp_godot_get_asset_list` - List project assets
- `mcp_godot_import_asset` - Import external asset
- `mcp_godot_create_prefab` - Create packed scene
- `mcp_godot_instantiate_prefab` - Instantiate prefab
- `mcp_godot_import_3d_model` - Import 3D model

### Material Management
- `mcp_godot_set_material` - Apply/create material
- `mcp_godot_list_materials` - List materials

### Mesh Management
- `mcp_godot_set_mesh` - Set mesh on MeshInstance3D
- `mcp_godot_set_collision_shape` - Set collision shape

### Editor Actions
- `mcp_godot_editor_action` - Execute editor command (PLAY, STOP, SAVE)
- `mcp_godot_play_scene` - Start playing scene
- `mcp_godot_stop_scene` - Stop playing scene
- `mcp_godot_save_all` - Save all open resources
- `mcp_godot_show_message` - Show message in editor

### Mesh Generation (Meshy API)
- `mcp_godot_generate_mesh_from_text` - Generate 3D mesh from text
- `mcp_godot_generate_mesh_from_image` - Generate mesh from image
- `mcp_godot_check_mesh_generation_progress` - Check generation status
- `mcp_godot_refine_generated_mesh` - Refine mesh quality
- `mcp_godot_download_and_import_mesh` - Download and import mesh
- `mcp_godot_list_generated_meshes` - List generated meshes

## Usage Examples

### Example 1: Get Current Scene Info
```
"Get information about the current scene in Godot"
```

### Example 2: Create a New Node
```
"Create a new Sprite2D node named 'Player' at position (100, 200)"
```

### Example 3: Open and Modify Scene
```
"Open the MainMenu scene and add a new button"
```

### Example 4: Create Script
```
"Create a new script called PlayerController.gd extending CharacterBody2D"
```

## Troubleshooting

### MCP Tools Not Available

1. **Check Godot Editor is Running**:
   - Godot Editor must be open with the project loaded
   - Verify project path matches: `road-to-war/`

2. **Check Cursor MCP Configuration**:
   - Open Cursor Settings → MCP Servers
   - Verify Godot MCP server is listed and enabled
   - Check for any error messages

3. **Restart Both Applications**:
   - Close and reopen Godot Editor
   - Restart Cursor
   - Try MCP tools again

### Connection Issues

1. **Verify Project Path**:
   - Ensure Godot project is at: `road-to-war/project.godot`
   - Path should be absolute or relative to workspace root

2. **Check Plugin Status** (if using GDAI):
   - In Godot: Project → Project Settings → Plugins
   - Ensure "GDAI MCP" plugin is enabled
   - Check "GDAI MCP" tab in bottom panel

3. **Test MCP Server**:
   - In Godot GDAI MCP tab, click "Start Server"
   - Check for any error messages
   - Verify server status shows "Running"

## Project-Specific Configuration

For the Road of War project:

- **Project Path**: `road-to-war/`
- **Main Scene**: `res://scenes/Preload.tscn`
- **Scripts Location**: `res://scripts/`
- **Scenes Location**: `res://scenes/`
- **Data Location**: `res://data/`

## Next Steps

Once MCP is configured:

1. Test basic operations (get scene info, list scripts)
2. Use MCP tools to modify scenes and scripts
3. Integrate MCP workflow into development process
4. Use for automated scene generation and modification

## Additional Resources

- [GDAI MCP Plugin Documentation](https://gdaimcp.delanolourenco.xyz)
- [Godot Editor Documentation](https://docs.godotengine.org)
- [Cursor MCP Documentation](https://docs.cursor.com)


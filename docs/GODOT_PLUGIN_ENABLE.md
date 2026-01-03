# Enable Godot MCP Plugin

## ✅ Plugin Installed!

The `godot_mcp` plugin has been successfully copied to:
```
road-to-war/addons/godot_mcp/
```

## Next Steps: Enable in Godot

1. **Open Godot Editor**
   - Launch Godot 4.x
   - Open project: `road-to-war/project.godot`

2. **Enable the Plugin**
   - Go to: **Project → Project Settings → Plugins**
   - Find **"Godot MCP"** in the list
   - Check the **Enable** checkbox
   - Click **Close**

3. **Verify Installation**
   - Look at the bottom panel in Godot Editor
   - You should see a new tab: **"MCP"** or **"Godot MCP"**
   - Click it to see the MCP panel

4. **Start MCP Server** (if needed)
   - In the MCP panel, click **"Start Server"** or similar button
   - The server should start and show connection status

## Troubleshooting

### Plugin Not Showing in List

**Check:**
- Plugin folder exists: `road-to-war/addons/godot_mcp/`
- `plugin.cfg` file exists in the plugin folder
- `plugin.gd` file exists in the plugin folder

**Fix:**
- Restart Godot Editor
- Check Godot's Output panel for errors
- Verify Godot version is 4.x (plugin requires Godot 4.2+)

### Plugin Shows But Can't Enable

**Check:**
- Godot Output panel for error messages
- `plugin.gd` file is valid GDScript
- All required files are present

**Fix:**
- Check for syntax errors in `plugin.gd`
- Verify all dependencies are available
- Try restarting Godot Editor

### MCP Panel Not Appearing

**Check:**
- Plugin is enabled in Project Settings
- No errors in Godot Output panel

**Fix:**
- Restart Godot Editor after enabling plugin
- Check if panel is hidden (look in View menu)
- Verify plugin.gd is loading correctly

## Plugin Structure

```
road-to-war/addons/godot_mcp/
├── plugin.cfg          # Plugin configuration
├── plugin.gd           # Main plugin script
├── command_handler.gd  # MCP command handler
└── ui/
    ├── mcp_panel.gd    # UI panel script
    └── mcp_panel.tscn  # UI panel scene
```

## Using the Plugin

Once enabled:
1. The MCP panel will appear in Godot's bottom panel
2. Start the MCP server from the panel
3. Configure your MCP client (Cursor) to connect
4. Use MCP tools in Cursor to interact with Godot

## Alternative: Built-in MCP

**Note:** Cursor has built-in Godot MCP support that may work without this plugin!

If the built-in MCP tools work (like `mcp_godot_get_scene_info`), you may not need this plugin. The plugin provides additional features and a UI panel.


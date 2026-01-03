# Installing GDAI MCP Plugin for Godot

## Quick Installation Guide

### Step 1: Download the Plugin

1. Visit: https://gdaimcp.com
2. Download the latest version of the GDAI MCP Plugin
3. The download will be a ZIP file

### Step 2: Extract to Project

1. Extract the ZIP file
2. You should see a folder like `gdai-mcp-plugin-godot` or similar
3. Copy the entire folder to: `road-to-war/addons/`

**Final structure should be:**
```
road-to-war/
  addons/
    gdai-mcp-plugin-godot/  (or whatever the folder is named)
      plugin.cfg
      plugin.gd
      (other plugin files)
```

### Step 3: Enable in Godot

1. Open Godot Editor
2. Open your project: `road-to-war/project.godot`
3. Go to: **Project → Project Settings → Plugins**
4. Find "GDAI MCP" in the list
5. Check the **Enable** checkbox
6. Click **Close**

### Step 4: Verify Installation

1. In Godot Editor, look at the bottom panel
2. You should see a new tab: **"GDAI MCP"**
3. Click on it to see the MCP configuration

## Troubleshooting

### Plugin Not Showing in List

**Issue**: Plugin doesn't appear in Project Settings → Plugins

**Solutions**:
1. **Check folder structure**:
   - Plugin must be in `road-to-war/addons/PLUGIN_NAME/`
   - Must have `plugin.cfg` file in the plugin folder
   - Example: `road-to-war/addons/gdai-mcp-plugin-godot/plugin.cfg`

2. **Check plugin.cfg**:
   - Open `addons/PLUGIN_NAME/plugin.cfg`
   - Should contain:
     ```ini
     [plugin]
     name="GDAI MCP"
     description="MCP Bridge for Godot"
     author="..."
     version="..."
     script="plugin.gd"
     ```

3. **Reload project**:
   - Close Godot Editor
   - Reopen the project
   - Check Plugins again

4. **Check Godot version**:
   - Plugin requires Godot 4.x
   - Verify: Help → About → Check version

### Plugin Shows But Can't Enable

**Issue**: Plugin appears but checkbox is disabled

**Solutions**:
1. Check for errors in Godot's Output panel
2. Verify `plugin.gd` file exists and is valid
3. Check that all required files are present
4. Try restarting Godot Editor

### Alternative: Use Built-in MCP (No Plugin Needed)

**Good News**: Cursor has built-in Godot MCP support!

You don't actually need the plugin if:
- ✅ Cursor's built-in Godot MCP tools work
- ✅ You can use MCP tools like `mcp_godot_get_scene_info`
- ✅ Godot Editor is running with project open

**To test built-in MCP**:
1. Open Godot Editor with your project
2. In Cursor, try: "Get current scene info from Godot"
3. If it works, you don't need the plugin!

## Manual Plugin Structure Creation

If you want to create the plugin structure manually (for testing):

1. Create directory: `road-to-war/addons/gdai-mcp-plugin-godot/`

2. Create `plugin.cfg`:
   ```ini
   [plugin]
   name="GDAI MCP"
   description="MCP Bridge for Godot Editor"
   author="GDAI"
   version="1.0.0"
   script="plugin.gd"
   ```

3. Create basic `plugin.gd`:
   ```gdscript
   @tool
   extends EditorPlugin
   
   func _enter_tree():
       print("GDAI MCP Plugin loaded")
   
   func _exit_tree():
       print("GDAI MCP Plugin unloaded")
   ```

4. Reload project in Godot
5. Enable in Project Settings → Plugins

## Verification Checklist

- [ ] `road-to-war/addons/` directory exists
- [ ] Plugin folder exists in `addons/`
- [ ] `plugin.cfg` file exists in plugin folder
- [ ] `plugin.gd` file exists in plugin folder
- [ ] Godot Editor shows plugin in Plugins list
- [ ] Plugin is enabled in Project Settings
- [ ] "GDAI MCP" tab appears in bottom panel

## Next Steps After Installation

1. **Get MCP Configuration**:
   - Open "GDAI MCP" tab in Godot
   - Copy the JSON configuration shown

2. **Configure Cursor** (if needed):
   - Open Cursor Settings → MCP Servers
   - Add new server with copied JSON
   - Save and restart Cursor

3. **Start MCP Server**:
   - In Godot "GDAI MCP" tab, click "Start Server"
   - Verify connection in Cursor

## Need Help?

- Plugin Website: https://gdaimcp.com
- Documentation: https://gdaimcp.delanolourenco.xyz/docs
- GitHub Issues: Check plugin repository for support


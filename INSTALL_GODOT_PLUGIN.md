# Quick Install: GDAI MCP Plugin for Godot

## Automatic Installation (Recommended)

Run this command in PowerShell from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File "scripts\install-godot-plugin.ps1"
```

## Manual Installation (If automatic fails)

### Step 1: Download
1. Visit: **https://gdaimcp.com**
2. Click "Download" or go to the releases page
3. Download the latest ZIP file

### Step 2: Extract
1. Extract the ZIP file you downloaded
2. Look for a folder named `gdai-mcp-plugin-godot` or similar
3. Copy this **entire folder** to:
   ```
   road-to-war/addons/gdai-mcp-plugin-godot/
   ```

### Step 3: Enable in Godot
1. Open **Godot Editor**
2. Open your project: `road-to-war/project.godot`
3. Go to: **Project → Project Settings → Plugins**
4. Find **"GDAI MCP"** in the list
5. Check the **Enable** checkbox
6. Click **Close**

### Step 4: Verify
- Look at the bottom panel in Godot Editor
- You should see a new tab: **"GDAI MCP"**
- Click it to see the MCP configuration

## Troubleshooting

**Plugin not showing in list?**
- Make sure the folder is at: `road-to-war/addons/gdai-mcp-plugin-godot/`
- Check that `plugin.cfg` exists inside the plugin folder
- Restart Godot Editor
- Check Godot's Output panel for errors

**Still not working?**
- You can use Cursor's built-in Godot MCP (no plugin needed!)
- Just open Godot Editor with your project
- MCP tools should work automatically in Cursor


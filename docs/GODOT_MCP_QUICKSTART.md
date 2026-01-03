# Godot MCP Quick Start

## Quick Setup (3 Steps)

### 1. Open Godot Editor
```bash
# Navigate to project
cd "C:\Users\Ropbe\Desktop\Road of war\road-to-war"

# Open Godot (adjust path to your installation)
# Windows: Usually in Program Files or where you installed it
"C:\Program Files\Godot\Godot_v4.x.exe" --path .
```

### 2. Verify MCP Tools Available
- In Cursor, the Godot MCP tools should be automatically available
- Try asking: "Get current scene info from Godot"
- Or: "List all scenes in the Godot project"

### 3. Test Connection
The MCP tools will work when:
- ✅ Godot Editor is running
- ✅ Project is open (road-to-war/project.godot)
- ✅ Cursor can detect the connection

## Common Commands

### Scene Operations
- "Open the MainMenu scene in Godot"
- "Get information about the current scene"
- "Create a new scene called TestScene.tscn"

### Node Operations
- "Create a Button node named 'StartButton' in the current scene"
- "List all nodes in the current scene"
- "Set the position of node 'Player' to (100, 200)"

### Script Operations
- "View the contents of CharacterCreation.gd"
- "Create a new script called TestScript.gd extending Node"
- "Update the MainMenu.gd script"

## Troubleshooting

**"Could not connect to Godot" error:**
1. Make sure Godot Editor is running
2. Make sure the project is open (road-to-war/project.godot)
3. Try restarting both Godot and Cursor

**MCP tools not showing:**
1. Check Cursor Settings → MCP Servers
2. Verify Godot MCP is listed (should be built-in)
3. Restart Cursor

## Verification

Run the verification script:
```bash
npm run verify:godot-mcp
```

This will check:
- ✅ Godot project exists
- ✅ Project structure is valid
- ✅ Required directories present

## Next Steps

Once connected, you can:
- Use MCP tools to modify scenes directly
- Create nodes and scripts via Cursor
- Automate Godot project management
- Integrate into development workflow


# Ollama Setup Guide for Cursor

This guide explains how to configure Cursor to use your local Ollama model (qwen2.5-coder:7b).

## Prerequisites

✅ **Ollama is installed** - You have Ollama running locally  
✅ **Model is downloaded** - `qwen2.5-coder:7b` is installed (verified)

## Configuration Methods

### Method 1: Cursor Settings UI (Recommended)

1. **Open Cursor Settings**:
   - Press `Ctrl+,` (or `Cmd+,` on Mac)
   - Or go to `File > Preferences > Settings`

2. **Search for "Ollama" or "Local Model"**:
   - In the settings search bar, type: `ollama` or `local model`

3. **Configure the following settings**:
   - **Enable Local Models**: Set to `true`
   - **Local Model Provider**: Set to `ollama`
   - **Local Model Name**: Set to `qwen2.5-coder:7b`
   - **Local Model Base URL**: Set to `http://localhost:11434/v1`

4. **Alternative Settings** (if the above don't appear):
   - Look for settings starting with `cursor.chat.*` or `cursor.general.*`
   - Set the model provider to Ollama
   - Set the model name to `qwen2.5-coder:7b`
   - Set the base URL to `http://localhost:11434/v1`

### Method 2: Workspace Settings File

A workspace settings file has been created at `.vscode/settings.json` with the configuration. Cursor should automatically pick this up.

If you need to edit it manually:
- The file is located at: `.vscode/settings.json`
- Make sure Ollama is running on `http://localhost:11434`
- The model name should be exactly: `qwen2.5-coder:7b`

### Method 3: Cursor Settings JSON

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type: `Preferences: Open User Settings (JSON)`
3. Add the following configuration:

```json
{
  "cursor.general.enableLocalModels": true,
  "cursor.general.localModelProvider": "ollama",
  "cursor.general.localModelName": "qwen2.5-coder:7b",
  "cursor.general.localModelBaseUrl": "http://localhost:11434/v1"
}
```

## Verifying the Setup

1. **Ensure Ollama is running**:
   ```bash
   ollama serve
   ```
   (This should already be running if you've used Ollama before)

2. **Test the model**:
   ```bash
   ollama run qwen2.5-coder:7b "Hello, can you help me code?"
   ```

3. **In Cursor**:
   - Open the chat/composer panel
   - Try asking a coding question
   - Check if it's using the local model (you should see the model name in the UI)

## Troubleshooting

### Model not found
- Verify the model is installed: `ollama list`
- If missing, pull it: `ollama pull qwen2.5-coder:7b`

### Connection refused
- Make sure Ollama is running: `ollama serve`
- Check if port 11434 is available
- Try accessing: `http://localhost:11434/api/tags` in your browser

### Cursor not using local model
- Restart Cursor after changing settings
- Check Cursor's model selector in the chat panel
- Verify the settings in `.vscode/settings.json` are correct
- Some Cursor versions may require enabling local models in the main settings menu

### Settings not taking effect
- Close and reopen Cursor
- Check if there are conflicting settings in User Settings vs Workspace Settings
- Workspace settings (`.vscode/settings.json`) override User Settings

## Additional Notes

- The workspace settings file (`.vscode/settings.json`) is already configured
- Cursor may need to be restarted for settings to take effect
- Different Cursor versions may use slightly different setting names
- If you have issues, check Cursor's documentation or support for the latest configuration format



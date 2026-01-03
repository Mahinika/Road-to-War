# Setting Up Ollama with Cursor - Step by Step

## Current Status
- ✅ Ollama is running on `http://localhost:11434`
- ✅ Model `qwen2.5-coder:7b` is installed
- ⚠️ Cursor needs to be configured to use it

## Method 1: Add Custom Model (Recommended)

1. **In Cursor Settings**:
   - Go to `Settings` (Ctrl+,)
   - Navigate to the **"Models"** section
   - Click the **"+ Add Custom Model"** link you see

2. **Configure the Custom Model**:
   - **Model Name**: `qwen2.5-coder:7b`
   - **Provider**: Select "OpenAI" or "Custom"
   - **Base URL**: `http://localhost:11434/v1`
   - **API Key**: `ollama` (Ollama doesn't require a real key, but Cursor may need a placeholder)
   - **Model ID/Name**: `qwen2.5-coder:7b`

3. **Save and Restart Cursor**

## Method 2: Add Your Endpoint (Alternative)

1. **In Cursor Settings > Models**:
   - Look for **"Add API Key"** section
   - Enable **"Add your endpoint"** option
   - **Endpoint URL**: `http://localhost:11434/v1`
   - **API Key**: `ollama`
   - Save

2. **Select the Model**:
   - In the model selector dropdown, the custom model should now appear
   - Select `qwen2.5-coder:7b`

## Method 3: Manual Settings Configuration

If the UI doesn't work, you can try editing settings directly:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: `Preferences: Open User Settings (JSON)`
3. Add:

```json
{
  "cursor.openai.baseURL": "http://localhost:11434/v1",
  "cursor.openai.apiKey": "ollama",
  "cursor.openai.model": "qwen2.5-coder:7b"
}
```

## Verification

After configuration:
1. Open Cursor's chat/composer (`Ctrl+L`)
2. Click the model selector dropdown
3. Look for `qwen2.5-coder:7b` in the list
4. Select it and try asking a question

## Troubleshooting

### Model still not appearing
- Make sure Ollama is running: Check `http://localhost:11434/api/tags` in browser
- Restart Cursor completely
- Try using `127.0.0.1` instead of `localhost`: `http://127.0.0.1:11434/v1`

### Connection errors
- Verify Ollama is accessible: Open `http://localhost:11434/api/tags` in your browser
- Check Windows Firewall isn't blocking port 11434
- Try the ngrok workaround (see below) if localhost doesn't work

### Using ngrok (Workaround if localhost doesn't work)

If Cursor has issues with localhost, you can expose Ollama via ngrok:

1. **Install ngrok**: Download from https://ngrok.com/download
2. **Start tunnel**:
   ```bash
   ngrok http 11434
   ```
3. **Use the ngrok URL** in Cursor settings instead of localhost
   - Example: `https://abcd1234.ngrok-free.app/v1`

## Important Notes

- Cursor's support for local models is limited and may vary by version
- Some features (like Cursor Tab) may not work with local models
- The workspace settings file (`.vscode/settings.json`) has been configured, but Cursor may need UI configuration as well


# Setting Up Ollama with Cursor via ngrok

## The Problem
Cursor uses OpenAI-compatible SDKs that block private IP addresses (localhost, 127.0.0.1) as a security feature (SSRF protection). This prevents direct connections to local Ollama instances.

## The Solution: ngrok Tunnel
Expose your local Ollama server through ngrok, which creates a public HTTPS endpoint that bypasses the SSRF check.

## Step-by-Step Setup

### 1. Install ngrok

**Windows:**
1. Download ngrok from: https://ngrok.com/download
2. Extract the `ngrok.exe` file
3. Add it to your PATH, or place it in a folder you can access from terminal

**Or use Chocolatey:**
```powershell
choco install ngrok
```

### 2. Get Your ngrok Auth Token

1. Sign up for a free account at: https://dashboard.ngrok.com/signup
2. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy your authtoken

### 3. Authenticate ngrok

Open PowerShell and run:
```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### 4. Start the Tunnel

**Option A: Simple tunnel (temporary URL, changes each time)**
```powershell
ngrok http 11434
```

**Option B: Reserved domain (recommended, requires paid plan or free tier)**
```powershell
ngrok http 11434 --domain=your-reserved-domain.ngrok-free.app
```

You'll see output like:
```
Forwarding  https://abcd1234.ngrok-free.app -> http://localhost:11434
```

**IMPORTANT:** Keep this terminal window open! The tunnel only works while ngrok is running.

### 5. Configure Cursor

1. **Open Cursor Settings** (`Ctrl+,`)
2. **Go to Models section**
3. **Find "Override OpenAI Base URL"**
4. **Set the Base URL to:** `https://your-ngrok-url.ngrok-free.app/v1`
   - Example: `https://abcd1234.ngrok-free.app/v1`
5. **Set API Key to:** `ollama` (placeholder)
6. **Enable "OpenAI API Key" toggle** (turn it ON)
7. **Save settings**

### 6. Restart Cursor

Close and reopen Cursor completely.

### 7. Test

1. Open chat/composer (`Ctrl+L`)
2. Select `qwen2.5-coder:7b` from model dropdown
3. Try asking a question

## Keeping ngrok Running

**Problem:** ngrok tunnel closes when you close the terminal.

**Solutions:**

### Option 1: Run ngrok in background (PowerShell)
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http 11434"
```

### Option 2: Create a batch file

Create `start-ollama-tunnel.bat`:
```batch
@echo off
echo Starting ngrok tunnel for Ollama...
ngrok http 11434
pause
```

Double-click to start the tunnel.

### Option 3: Run as Windows Service (Advanced)

Use NSSM (Non-Sucking Service Manager) to run ngrok as a Windows service.

## Troubleshooting

### Tunnel not working
- Make sure Ollama is running: `ollama list`
- Verify ngrok is running: Check the ngrok terminal window
- Test the ngrok URL in browser: `https://your-url.ngrok-free.app/api/tags`

### "ngrok: command not found"
- Add ngrok.exe to your PATH
- Or use full path: `C:\path\to\ngrok.exe http 11434`

### URL changes every time
- Free ngrok gives random URLs each restart
- Consider ngrok's paid plan for reserved domains
- Or use a script to automatically update Cursor settings

### Still getting SSRF errors
- Make sure you're using the HTTPS URL (not HTTP)
- Verify the URL ends with `/v1`
- Check that ngrok is actually running

## Alternative: Use ngrok's Static Domain (Free Tier)

ngrok offers a free static domain option:
1. Go to: https://dashboard.ngrok.com/cloud-edge/domains
2. Reserve a free static domain
3. Use it in your ngrok command:
   ```powershell
   ngrok http 11434 --domain=your-static-domain.ngrok-free.app
   ```

This way, the URL stays the same and you don't need to update Cursor settings each time.

## Security Note

⚠️ **Important:** Exposing Ollama via ngrok makes it accessible from the internet. While ngrok provides some protection, consider:
- Using ngrok's authentication features
- Only running ngrok when you need it
- Not exposing sensitive data through the tunnel

## Next Steps

Once set up, you should be able to use `qwen2.5-coder:7b` in Cursor without SSRF errors!



















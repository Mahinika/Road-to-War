# MiMo-V2-Flash Setup in Cursor IDE via OpenRouter

## Overview

This guide explains how to configure MiMo-V2-Flash (free) model in Cursor IDE using OpenRouter API.

## Prerequisites

- OpenRouter API Key: `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`
- Model ID: `xiaomi/mimo-v2-flash:free`
- OpenRouter API Endpoint: `https://openrouter.ai/api/v1`

## Configuration

The configuration has been applied to your Cursor settings.json file with the following values:

- **Base URL**: `https://openrouter.ai/api/v1`
- **API Key**: `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`
- **Model**: `xiaomi/mimo-v2-flash:free`

## Location

Settings file: `C:\Users\Ropbe\AppData\Roaming\Cursor\User\settings.json`

## Manual Configuration (Alternative Method)

If you prefer to configure through Cursor's UI:

1. Open Cursor IDE
2. Press `Ctrl + ,` to open Settings
3. Navigate to **AI** or **Models** section
4. Click **Add Model** or **Configure Providers**
5. Select **OpenRouter** or **Custom Provider**
6. Enter:
   - **Provider**: OpenRouter
   - **API Endpoint**: `https://openrouter.ai/api/v1`
   - **API Key**: `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`
   - **Model ID**: `xiaomi/mimo-v2-flash:free`

## Verification Steps

1. **Restart Cursor IDE** (required for settings to take effect)
2. Open the AI chat panel
3. Check that MiMo-V2-Flash is selected as the active model
4. Test with a simple prompt: "Write a hello world function in Python"
5. Verify the response is generated correctly

## Model Features

- **Total Parameters**: 309B (15B active)
- **Context Window**: 256K tokens
- **Pricing**: Free (both input and output tokens)
- **Best For**: Coding tasks, reasoning, and agent scenarios
- **Performance**: Top-ranked open-source model on SWE-bench

## Optimization Tips

- **Disable Reasoning Mode**: For coding tasks, turn off reasoning mode for fastest performance
- **Context Window**: Use full 256K context when working with large codebases
- **Temperature**: Recommended 0.7 for coding tasks (balanced creativity/accuracy)

## Troubleshooting

### Model Not Appearing

1. Restart Cursor IDE completely
2. Verify API key is correct in settings.json
3. Check that OpenRouter account is active
4. Ensure internet connection is working

### Slow Responses

1. Verify reasoning mode is disabled
2. Check your internet connection speed
3. OpenRouter may have temporary load issues
4. Try again in a few moments

### API Errors

1. Verify API key is valid and not expired
2. Check OpenRouter dashboard for quota/limits
3. Ensure model ID is exactly: `xiaomi/mimo-v2-flash:free`
4. Verify API endpoint is correct: `https://openrouter.ai/api/v1`

## Previous Configuration

Your previous setup used Ollama with:
- Base URL: `https://unefficacious-raymundo-bijugate.ngrok-free.dev/v1`
- Model: `qwen2.5-coder:7b`

To revert to Ollama, change settings.json back to those values.

## Additional Resources

- [OpenRouter MiMo-V2-Flash Page](https://openrouter.ai/xiaomi/mimo-v2-flash:free)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [MiMo-V2-Flash GitHub](https://github.com/XiaomiMiMo/MiMo-V2-Flash)

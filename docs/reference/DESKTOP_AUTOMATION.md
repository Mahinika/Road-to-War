# Desktop Automation Setup - Circuit MCP

## ✅ **Setup Complete**

Desktop automation is now configured and ready to use! The `circuit-electron` MCP server is installed and configured.

## 🚀 **How to Use Desktop Automation**

### **1. Available MCP Tools**

Once configured, you'll have access to **25+ desktop automation tools**:

#### **App Launch & Control**
- `app_launch()` - Start your Electron/desktop apps
- `get_windows()` - List and manage open windows
- `close_window()` - Close specific windows

#### **User Interaction**
- `click()` - Click elements by selector or coordinates
- `type()` - Type text into input fields
- `keyboard_press()` - Press keys and key combinations
- `drag()` - Drag and drop operations

#### **Observation & Testing**
- `take_screenshot()` - Capture screen/window screenshots
- `browser_console_messages()` - Get console logs from Electron apps
- `browser_network_requests()` - Monitor network activity
- `wait_for_load_state()` - Wait for app loading states

### **2. Testing Your Game**

#### **Basic Game Launch Test**
```javascript
// Launch your Road of War game
const session = await app_launch({
  "app": "C:\\Users\\Ropbe\\Desktop\\Road of war",
  "mode": "development"  // Use development mode for hot reload
});

// Wait for game to load
await wait_for_load_state({
  "sessionId": session.id,
  "state": "networkidle"
});

// Take a screenshot to verify it's working
await take_screenshot({
  "sessionId": session.id,
  "filename": "game-loaded.png"
});
```

#### **Automated Game Testing**
```javascript
// Launch game
const session = await app_launch({
  "app": "C:\\Users\\Ropbe\\Desktop\\Road of war"
});

// Wait for load
await wait_for_load_state({"sessionId": session.id, "state": "networkidle"});

// Test character creation flow
await click({"sessionId": session.id, "selector": "#start-game-button"});
await wait_for_load_state({"sessionId": session.id, "state": "networkidle"});

// Select class/spec
await click({"sessionId": session.id, "selector": "[data-class='warrior']"});
await click({"sessionId": session.id, "selector": "[data-spec='protection']"});

// Check for errors in console
const consoleLogs = await browser_console_messages({"sessionId": session.id});
const errors = consoleLogs.filter(log => log.level === 'error');
if (errors.length > 0) {
  console.log("Found errors:", errors);
}
```

#### **Performance Testing**
```javascript
const session = await app_launch({
  "app": "C:\\Users\\Ropbe\\Desktop\\Road of war"
});

// Monitor network requests during gameplay
const networkRequests = await browser_network_requests({
  "sessionId": session.id
});

// Analyze loading performance
const loadTimes = networkRequests.map(req => req.responseTime);
console.log("Average load time:", loadTimes.reduce((a,b) => a+b, 0) / loadTimes.length);
```

### **3. Configuration Options**

#### **Development Mode (Recommended for Testing)**
```javascript
const session = await app_launch({
  "app": "C:\\Users\\Ropbe\\Desktop\\Road of war",
  "mode": "development",        // Hot reload enabled
  "compressScreenshots": false  // Full quality screenshots
});
```

#### **Production Mode (User Experience Testing)**
```javascript
const session = await app_launch({
  "app": "C:\\path\\to\\built\\RoadOfWar.exe",
  "mode": "production",         // Built application
  "compressScreenshots": true,  // Compressed for speed
  "screenshotQuality": 30       // Maximum compression
});
```

### **4. Troubleshooting**

#### **App Won't Launch**
```javascript
// Check if path is correct
const session = await app_launch({
  "app": "C:\\Users\\Ropbe\\Desktop\\Road of war"
});

// Verify the app started
const windows = await get_windows({"sessionId": session.id});
console.log("Open windows:", windows);
```

#### **Elements Not Found**
```javascript
// Take screenshot to see current state
await take_screenshot({
  "sessionId": session.id,
  "filename": "debug-screenshot.png"
});

// Check console for errors
const logs = await browser_console_messages({"sessionId": session.id});
console.log("Console logs:", logs);
```

#### **Slow Performance**
```javascript
// Use compressed mode for faster testing
const session = await app_launch({
  "app": "C:\\Users\\Ropbe\\Desktop\\Road of war",
  "compressScreenshots": true,
  "screenshotQuality": 30
});
```

### **5. Integration with Your Workflow**

#### **Automated Testing Script**
Create `test-game.js`:
```javascript
// Automated game flow testing
async function testGameFlow() {
  const session = await app_launch({
    "app": "C:\\Users\\Ropbe\\Desktop\\Road of war"
  });

  // Test character creation
  await click({"sessionId": session.id, "selector": "#start-game-button"});
  await wait_for_load_state({"sessionId": session.id, "state": "networkidle"});

  // Test combat
  await click({"sessionId": session.id, "selector": ".enemy"});
  await wait_for_load_state({"sessionId": session.id, "state": "networkidle"});

  // Verify no errors
  const logs = await browser_console_messages({"sessionId": session.id});
  const errors = logs.filter(log => log.level === 'error');

  return errors.length === 0 ? "PASS" : "FAIL";
}

testGameFlow().then(result => console.log("Test result:", result));
```

### **6. Best Practices**

1. **Use Development Mode** for testing with hot reload
2. **Take Screenshots** when debugging element selection issues
3. **Monitor Console Logs** for JavaScript errors
4. **Wait for Load States** before interacting with elements
5. **Use Compressed Screenshots** for performance during long tests

## 🎮 **Ready to Test Your Game!**

The Desktop automation is now configured. You can:

1. **Launch your game** automatically
2. **Test UI interactions** and workflows
3. **Monitor performance** and console logs
4. **Capture screenshots** for visual verification
5. **Automate testing** of game features

The MCP tools are now available in your Cursor environment for comprehensive desktop application testing! 🚀

# Phase 4: New Tool Modules Design

**Date**: December 25, 2025  
**Status**: Complete Design  
**Scope**: 4 new development tools with detailed specifications

---

## Executive Summary

**Goal**: Design 4 critical new tools to enhance development workflow:

1. **Save Manager** - Persist, inspect, repair player save files
2. **Balance Tester** - Validate progression curves and economy
3. **Game Inspector** - Live view of runtime game state
4. **Asset Optimizer** - Profile and optimize sprite generation

**Implementation Order** (by priority):
1. Save Manager (Priority 1) - Unblocks testing progression
2. Balance Tester (Priority 2) - Validates design decisions
3. Game Inspector (Priority 3) - Improves debugging
4. Asset Optimizer (Priority 4) - Performance analysis

---

## Tool 1: Save Manager

### 1.1 Purpose & Scope

**Primary Use Case**: Manage player save files during development and testing

**Subcommands**:
```bash
game-tools inspect-save <file>       # Display save contents
game-tools inspect-save repair       # Fix corrupted save
game-tools inspect-save migrate      # Upgrade save format
game-tools inspect-save create       # Generate test saves
game-tools inspect-save list         # List available saves
game-tools inspect-save delete       # Remove save file
```

### 1.2 Data Model

**Save File Structure**:
```json
{
  "_meta": {
    "version": "1.0.0",
    "createdAt": "2025-12-25T10:30:00Z",
    "updatedAt": "2025-12-25T10:30:00Z",
    "gameDuration": 3600000,
    "slot": 1
  },
  "character": {
    "name": "Hero",
    "class": "Paladin",
    "level": 15,
    "experience": 50000,
    "stats": {
      "health": 100,
      "mana": 50,
      "strength": 10,
      "intelligence": 8,
      "dexterity": 12,
      "constitution": 11,
      "wisdom": 9,
      "charisma": 10
    }
  },
  "progression": {
    "currentLevel": 15,
    "totalExperience": 50000,
    "prestigeLevel": 0,
    "prestigeTimesTotal": 0,
    "lastPrestigeAt": null
  },
  "inventory": [
    {
      "id": "sword_001",
      "name": "Iron Sword",
      "type": "weapon",
      "rarity": "common",
      "stats": { "damage": 5 }
    }
  ],
  "equipment": {
    "mainHand": "sword_001",
    "offHand": null,
    "armor": [],
    "accessories": []
  },
  "world": {
    "currentZone": 1,
    "currentLevel": 5,
    "currentEnemy": null,
    "totalEnemiesDefeated": 127
  },
  "achievements": [
    { "id": "first_kill", "unlockedAt": "2025-12-25T10:00:00Z" }
  ],
  "settings": {
    "volume": 0.8,
    "difficulty": "normal",
    "autoSave": true
  }
}
```

### 1.3 Subcommand Specifications

#### A) Inspect

**File**: `tools/commands/inspect-save.js`

```javascript
export async function execute(args) {
  const options = parseArgs(args);
  
  if (options.command === 'inspect') {
    return inspectSaveFile(options.file, options);
  }
  // ... handle other subcommands
}

async function inspectSaveFile(filepath, options) {
  const logger = new Logger();
  
  // Validate file exists
  if (!fs.existsSync(filepath)) {
    throw new ValidationError(
      `Save file not found: ${filepath}`,
      [`Check file path: ${filepath}`]
    );
  }
  
  // Load and parse JSON
  let save;
  try {
    save = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    throw new ValidationError(
      `Invalid JSON in save file: ${e.message}`,
      [
        `File may be corrupted`,
        `Try: game-tools inspect-save repair ${filepath}`
      ]
    );
  }
  
  // Validate against schema
  const errors = validateSaveSchema(save);
  if (errors.length > 0) {
    logger.warn(`Save file has validation warnings:`);
    errors.forEach(e => logger.warn(`  • ${e}`));
  }
  
  // Display results
  displaySaveInspection(save, options);
  
  return { success: true, save };
}

function displaySaveInspection(save, options) {
  console.log(`\n=== Save File Inspection ===\n`);
  
  const meta = save._meta;
  console.log(`Metadata:`);
  console.log(`  Version:        ${meta.version}`);
  console.log(`  Created:        ${new Date(meta.createdAt).toLocaleString()}`);
  console.log(`  Updated:        ${new Date(meta.updatedAt).toLocaleString()}`);
  console.log(`  Slot:           ${meta.slot}`);
  console.log(`  Play Time:      ${formatDuration(meta.gameDuration)}`);
  
  console.log(`\nCharacter:`);
  const char = save.character;
  console.log(`  Name:           ${char.name}`);
  console.log(`  Class:          ${char.class}`);
  console.log(`  Level:          ${char.level}`);
  console.log(`  Experience:     ${char.experience.toLocaleString()}`);
  
  console.log(`\nProgression:`);
  const prog = save.progression;
  console.log(`  Current Level:  ${prog.currentLevel}`);
  console.log(`  Prestige Level: ${prog.prestigeLevel}`);
  console.log(`  Total Prestiges: ${prog.prestigeTimesTotal}`);
  
  console.log(`\nInventory:`);
  console.log(`  Items:          ${save.inventory.length}`);
  
  console.log(`\nEquipment:`);
  console.log(`  Main Hand:      ${save.equipment.mainHand || 'None'}`);
  console.log(`  Off Hand:       ${save.equipment.offHand || 'None'}`);
  console.log(`  Armor Pieces:   ${save.equipment.armor.length}`);
  console.log(`  Accessories:    ${save.equipment.accessories.length}`);
  
  console.log(`\nWorld:`);
  const world = save.world;
  console.log(`  Current Zone:   ${world.currentZone}`);
  console.log(`  Current Level:  ${world.currentLevel}`);
  console.log(`  Enemies Slain:  ${world.totalEnemiesDefeated}`);
  
  console.log(`\nAchievements:   ${save.achievements.length}`);
  
  if (options.detailed) {
    console.log(`\n=== Detailed Stats ===\n`);
    console.log(`Stats:`);
    Object.entries(char.stats).forEach(([stat, value]) => {
      console.log(`  ${stat.padEnd(15)}: ${value}`);
    });
    
    console.log(`\nInventory Details:`);
    save.inventory.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} (${item.rarity})`);
      console.log(`     Type: ${item.type}, ID: ${item.id}`);
    });
  }
  
  if (options.json) {
    console.log(`\n${JSON.stringify(save, null, 2)}`);
  }
}

function validateSaveSchema(save) {
  const errors = [];
  
  // Check required fields
  if (!save._meta) errors.push('Missing _meta object');
  if (!save.character) errors.push('Missing character object');
  if (!save.progression) errors.push('Missing progression object');
  if (!save.inventory) errors.push('Missing inventory array');
  if (!save.equipment) errors.push('Missing equipment object');
  if (!save.world) errors.push('Missing world object');
  
  // Check data types
  if (typeof save.character?.level !== 'number') {
    errors.push('character.level must be number');
  }
  if (!Array.isArray(save.inventory)) {
    errors.push('inventory must be array');
  }
  
  return errors;
}
```

#### B) Repair

**Functionality**:
- Fix missing required fields (add defaults)
- Validate and correct data types
- Reconstruct corrupted JSON
- Verify inventory/equipment consistency
- Update version if needed

```javascript
async function repairSaveFile(filepath, options) {
  const logger = new Logger();
  
  logger.info(`Attempting to repair: ${filepath}`);
  
  let save;
  
  // Try to load and parse JSON
  try {
    save = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    // Try to recover from partial JSON
    try {
      save = recoverFromBrokenJSON(filepath);
      logger.warn(`Partially recovered from broken JSON`);
    } catch (e2) {
      throw new GenerationError(
        `Cannot repair save file: ${e2.message}`,
        [`File is too corrupted to repair`]
      );
    }
  }
  
  // Apply repairs
  const repairs = [];
  
  // Ensure required fields
  if (!save._meta) {
    save._meta = createDefaultMeta(save);
    repairs.push('Added missing _meta object');
  }
  
  // Fix version if needed
  if (!save._meta.version) {
    save._meta.version = '1.0.0';
    repairs.push('Added missing version');
  }
  
  // Ensure character object
  if (!save.character) {
    save.character = createDefaultCharacter();
    repairs.push('Added missing character object');
  }
  
  // Validate and fix inventory
  if (!Array.isArray(save.inventory)) {
    save.inventory = [];
    repairs.push('Converted inventory to array');
  }
  
  // Remove invalid items
  save.inventory = save.inventory.filter(item => {
    if (!item.id || !item.name) {
      repairs.push(`Removed invalid item: ${JSON.stringify(item)}`);
      return false;
    }
    return true;
  });
  
  // Fix equipment references
  const validItemIds = new Set(save.inventory.map(i => i.id));
  if (save.equipment.mainHand && !validItemIds.has(save.equipment.mainHand)) {
    repairs.push(`Removed invalid mainHand reference`);
    save.equipment.mainHand = null;
  }
  
  // Update meta
  save._meta.updatedAt = new Date().toISOString();
  save._meta.lastRepairAt = new Date().toISOString();
  
  // Save repaired file (with backup)
  const backupPath = `${filepath}.backup`;
  fs.copyFileSync(filepath, backupPath);
  fs.writeFileSync(filepath, JSON.stringify(save, null, 2));
  
  logger.success(`Save file repaired`);
  logger.info(`Backup saved to: ${backupPath}`);
  
  repairs.forEach(r => logger.info(`  • ${r}`));
  
  return { success: true, repairs, save };
}
```

#### C) Migrate

**Functionality**:
- Upgrade save format from old version to new
- Preserve all player data during upgrade
- Add new fields with sensible defaults
- Log migration changes

```javascript
async function migrateSaveFile(filepath, targetVersion, options) {
  const logger = new Logger();
  const save = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const currentVersion = save._meta.version || '1.0.0';
  
  logger.info(`Migrating save from v${currentVersion} to v${targetVersion}`);
  
  const migrations = [];
  
  // v1.0.0 -> v1.1.0 (example)
  if (currentVersion === '1.0.0' && targetVersion >= '1.1.0') {
    logger.info(`Applying migration v1.0.0 → v1.1.0`);
    
    // Add new field with default value
    if (!save.character.talents) {
      save.character.talents = [];
      migrations.push('Added talents array to character');
    }
    
    // Add new progression tracking
    if (!save.progression.talentPoints) {
      save.progression.talentPoints = 0;
      migrations.push('Added talentPoints to progression');
    }
    
    save._meta.version = '1.1.0';
  }
  
  // Save migrated file
  save._meta.migratedAt = new Date().toISOString();
  const backupPath = `${filepath}.backup.v${currentVersion}`;
  fs.copyFileSync(filepath, backupPath);
  fs.writeFileSync(filepath, JSON.stringify(save, null, 2));
  
  logger.success(`Save migrated successfully`);
  logger.info(`Backup saved to: ${backupPath}`);
  
  return { success: true, migrations, save };
}
```

#### D) Create

**Functionality**:
- Generate test save files with various configurations
- Useful for testing different progression states

```javascript
async function createTestSave(options) {
  const save = {
    _meta: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      gameDuration: options.playTime || 3600000,
      slot: options.slot || 1
    },
    character: {
      name: options.name || 'Test Hero',
      class: options.class || 'Paladin',
      level: options.level || 15,
      experience: calculateExperienceForLevel(options.level || 15),
      stats: {
        health: 100 + (options.level || 15) * 5,
        mana: 50 + (options.level || 15) * 3,
        strength: 10,
        intelligence: 8,
        dexterity: 12,
        constitution: 11,
        wisdom: 9,
        charisma: 10
      }
    },
    progression: {
      currentLevel: options.level || 15,
      totalExperience: calculateExperienceForLevel(options.level || 15),
      prestigeLevel: options.prestigeLevel || 0,
      prestigeTimesTotal: options.prestigeLevel || 0,
      lastPrestigeAt: null
    },
    inventory: generateTestInventory(options),
    equipment: generateTestEquipment(),
    world: {
      currentZone: options.zone || 1,
      currentLevel: options.level || 15,
      currentEnemy: null,
      totalEnemiesDefeated: options.enemiesDefeated || 127
    },
    achievements: options.achievements || [],
    settings: {
      volume: 0.8,
      difficulty: options.difficulty || 'normal',
      autoSave: true
    }
  };
  
  // Save to file
  const filename = `test-save-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(save, null, 2));
  
  return { success: true, filename, save };
}
```

### 1.4 Integration Points

**Read/Write Locations**:
- Default: `game-data/saves/` directory
- Configurable via `--save-dir` option

**Validation Against Game Data**:
- Uses schemas from `public/data/classes.json`
- Validates item IDs against `public/data/items.json`
- Validates enemy IDs against `public/data/enemies.json`

**Electron Integration** (Phase 6):
- Save manager can be called from Electron dev window
- Lists available saves in UI
- Allows direct inspection/repair from IDE

---

## Tool 2: Balance Tester

### 2.1 Purpose & Scope

**Primary Use Case**: Validate game progression curves and economy balance

**Subcommands**:
```bash
game-tools test-balance curves      # Progression curve analysis
game-tools test-balance economy     # Loot drops, gold, pricing
game-tools test-balance difficulty # Enemy scaling vs player power
game-tools test-balance report      # Generate HTML/CSV report
```

### 2.2 Test Specifications

#### A) Progression Curves

```javascript
async function testProgressionCurves(options) {
  const logger = new Logger();
  const config = new GameConfig();
  config.loadAll();
  
  logger.info('Analyzing progression curves...');
  
  // Simulate player progression through all levels
  const results = {
    levels: [],
    totalTime: 0,
    anomalies: []
  };
  
  const maxLevel = config.get('stats-config').maxLevel || 100;
  
  for (let level = 1; level <= maxLevel; level++) {
    const expToLevel = calculateExperienceForLevel(level, config);
    const expFromPrevious = level > 1 
      ? expToLevel - calculateExperienceForLevel(level - 1, config)
      : expToLevel;
    
    const estimatedTimeSeconds = expFromPrevious / getAverageExpPerSecond(level, config);
    const estimatedTimeMinutes = estimatedTimeSeconds / 60;
    
    results.levels.push({
      level,
      experienceRequired: expToLevel,
      experienceThisLevel: expFromPrevious,
      estimatedTimeMinutes,
      estimatedTimeTotalMinutes: expToLevel / getAverageExpPerSecond(level, config) / 60
    });
    
    // Detect anomalies (extreme jump in exp requirement)
    if (level > 1) {
      const prevData = results.levels[results.levels.length - 2];
      const expIncrease = (expFromPrevious / prevData.experienceThisLevel - 1) * 100;
      
      if (expIncrease > 50) { // 50% spike is anomalous
        results.anomalies.push({
          level,
          message: `Exp jump ${expIncrease.toFixed(1)}% at level ${level}`,
          severity: expIncrease > 100 ? 'critical' : 'warning'
        });
      }
    }
  }
  
  return results;
}
```

#### B) Economy Balance

```javascript
async function testEconomyBalance(options) {
  const logger = new Logger();
  const config = new GameConfig();
  config.loadAll();
  
  logger.info('Analyzing economy balance...');
  
  const items = config.get('items');
  const enemies = config.get('enemies');
  const drops = analyzeDropRates(enemies, items, config);
  
  const results = {
    dropRates: drops,
    goldFlow: [],
    pricing: {},
    anomalies: []
  };
  
  // Simulate gold flow at different player levels
  for (let level = 1; level <= 20; level++) {
    const goldPerEnemy = calculateGoldDrop(level, config);
    const enemiesPerHour = calculateEnemiesPerHour(level, config);
    const goldPerHour = goldPerEnemy * enemiesPerHour;
    
    const shopItems = items.filter(i => i.levelRequired <= level);
    const averageItemCost = shopItems.length > 0
      ? shopItems.reduce((sum, i) => sum + i.cost, 0) / shopItems.length
      : 0;
    
    const hoursToAffordItem = averageItemCost > 0
      ? averageItemCost / goldPerHour
      : 0;
    
    results.goldFlow.push({
      level,
      goldPerEnemy,
      enemiesPerHour,
      goldPerHour,
      averageItemCost,
      hoursToAffordNextTier: hoursToAffordItem
    });
    
    // Detect anomalies
    if (hoursToAffordItem > 10) {
      results.anomalies.push({
        level,
        message: `Takes ${hoursToAffordItem.toFixed(1)}h to afford items at level ${level}`,
        severity: 'warning'
      });
    }
  }
  
  return results;
}
```

#### C) Difficulty Scaling

```javascript
async function testDifficultyScaling(options) {
  const logger = new Logger();
  const config = new GameConfig();
  config.loadAll();
  
  logger.info('Analyzing difficulty scaling...');
  
  const results = {
    levelComparisons: [],
    anomalies: []
  };
  
  // Compare player power vs enemy power at each level
  for (let level = 1; level <= 20; level++) {
    const playerStats = calculatePlayerStats(level, config);
    const enemyStats = calculateEnemyStats(level, config);
    
    // Simple power calculation: sum of all stats
    const playerPower = Object.values(playerStats).reduce((a, b) => a + b, 0);
    const enemyPower = Object.values(enemyStats).reduce((a, b) => a + b, 0);
    
    const powerRatio = playerPower / enemyPower;
    const expectedRatio = 1.0; // Players should be roughly equal to enemies
    
    results.levelComparisons.push({
      level,
      playerPower,
      enemyPower,
      powerRatio: powerRatio.toFixed(2),
      balanced: Math.abs(powerRatio - expectedRatio) < 0.2
    });
    
    // Detect imbalance
    if (powerRatio < 0.8) {
      results.anomalies.push({
        level,
        message: `Enemies too strong: ${powerRatio.toFixed(2)}x player power`,
        severity: 'critical'
      });
    } else if (powerRatio > 1.5) {
      results.anomalies.push({
        level,
        message: `Player too strong: ${powerRatio.toFixed(2)}x enemy power`,
        severity: 'info'
      });
    }
  }
  
  return results;
}
```

### 2.3 Report Generation

```javascript
async function generateBalanceReport(testResults, options) {
  const logger = new Logger();
  
  let output = '';
  
  if (options.format === 'csv') {
    output = generateCSVReport(testResults);
  } else if (options.format === 'html') {
    output = generateHTMLReport(testResults);
  } else {
    output = generateConsoleReport(testResults);
  }
  
  if (options.output) {
    fs.writeFileSync(options.output, output);
    logger.success(`Report saved to: ${options.output}`);
  } else {
    console.log(output);
  }
  
  return { success: true, output };
}

function generateCSVReport(results) {
  let csv = 'Level,PlayerPower,EnemyPower,PowerRatio,GoldPerHour,ItemAffordTime\n';
  
  results.forEach(result => {
    csv += `${result.level},${result.playerPower},${result.enemyPower},${result.powerRatio},${result.goldPerHour},${result.itemAffordTime}\n`;
  });
  
  return csv;
}

function generateHTMLReport(results) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Balance Report</title>
  <style>
    body { font-family: Arial; margin: 20px; }
    table { border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .critical { color: red; font-weight: bold; }
    .warning { color: orange; }
    .info { color: blue; }
  </style>
</head>
<body>
  <h1>Game Balance Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Progression Curves</h2>
  <table>
    <tr>
      <th>Level</th>
      <th>Exp Required</th>
      <th>Est. Time (minutes)</th>
    </tr>
    ${results.map(r => `
      <tr>
        <td>${r.level}</td>
        <td>${r.experienceRequired}</td>
        <td>${r.estimatedTimeMinutes.toFixed(1)}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>Anomalies</h2>
  ${results.anomalies && results.anomalies.length > 0
    ? `<ul>${results.anomalies.map(a =>
        `<li class="${a.severity}">${a.message}</li>`
      ).join('')}</ul>`
    : '<p>No anomalies detected</p>'
  }
</body>
</html>`;
}
```

### 2.4 Integration Points

**Data Sources**:
- Game config files (`stats-config.json`, `enemies.json`, `items.json`)
- Game managers (read-only access to balance algorithms)

**Output Formats**:
- Console (summary)
- CSV (for Excel/Google Sheets)
- HTML (interactive report)
- JSON (programmatic consumption)

---

## Tool 3: Game Inspector

### 3.1 Purpose & Scope

**Primary Use Case**: Live view of game state during development

**Subcommands**:
```bash
game-tools inspect-game start          # Launch inspector server
game-tools inspect-game query <path>   # Get specific state
game-tools inspect-game watch <path>   # Watch state changes live
game-tools inspect-game stop           # Stop inspector server
```

### 3.2 Architecture

**Two-Process Model**:
1. **Electron Process**: Game runs normally
2. **Inspector Server**: Separate Node.js process listening for IPC

**IPC Communication**:
```javascript
// From Electron renderer → Inspector server
const state = {
  party: {
    heroes: [
      { id: 1, name: 'Hero', level: 15, health: 100 }
    ]
  },
  world: {
    currentZone: 1,
    currentEnemy: { name: 'Goblin', health: 30 }
  },
  timestamp: Date.now()
};

ipcSend('game:state', state);
```

### 3.3 Inspector Server Implementation

```javascript
export async function execute(args) {
  const subcommand = args[0];
  
  if (subcommand === 'start') {
    return startInspectorServer(args.slice(1));
  } else if (subcommand === 'query') {
    return queryGameState(args.slice(1));
  } else if (subcommand === 'watch') {
    return watchGameState(args.slice(1));
  } else if (subcommand === 'stop') {
    return stopInspectorServer(args.slice(1));
  }
}

async function startInspectorServer(args) {
  const logger = new Logger();
  const port = 5555; // Default port
  
  logger.info(`Starting game inspector on port ${port}...`);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ port });
  let lastState = {};
  
  wss.on('connection', (ws) => {
    logger.success(`Inspector connected`);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'state') {
          lastState = message.data;
          lastState.timestamp = Date.now();
          
          // Broadcast to all connected clients
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'state-update',
                data: lastState
              }));
            }
          });
        }
      } catch (e) {
        logger.error(`Invalid message: ${e.message}`);
      }
    });
    
    // Send current state to new client
    ws.send(JSON.stringify({
      type: 'state',
      data: lastState
    }));
  });
  
  logger.success(`Inspector server listening on ws://localhost:${port}`);
  logger.info(`Waiting for Electron to connect...`);
  
  // Keep server running
  await new Promise(() => {});
}

async function queryGameState(args) {
  const path = args[0];
  if (!path) {
    throw new ValidationError(
      'Path is required',
      ['Example: game-tools inspect-game query "party.heroes[0].stats"']
    );
  }
  
  const logger = new Logger();
  
  // Connect to inspector server
  const ws = new WebSocket('ws://localhost:5555');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'query',
      path: path
    }));
  };
  
  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    const value = getValueAtPath(response.data, path);
    
    logger.success(`Query result:`);
    console.log(JSON.stringify(value, null, 2));
    
    ws.close();
    process.exit(0);
  };
  
  ws.onerror = (error) => {
    logger.error(`Cannot connect to inspector server: ${error.message}`);
    logger.info(`Start it with: game-tools inspect-game start`);
    process.exit(1);
  };
}
```

### 3.4 Electron Integration

In `electron/preload.js`:
```javascript
const { ipcRenderer } = require('electron');

// Send game state updates to inspector
window.sendGameState = (state) => {
  ipcRenderer.send('game:state', state);
};
```

In game loop (`src/main.js`):
```javascript
// Periodically send state updates
setInterval(() => {
  const gameState = {
    party: party.getState(),
    world: world.getState(),
    combat: combatManager.getState(),
    timestamp: Date.now()
  };
  
  window.sendGameState(gameState);
}, 100); // 10 Hz updates
```

---

## Tool 4: Asset Optimizer

### 4.1 Purpose & Scope

**Primary Use Case**: Profile asset generation and optimize performance

**Subcommands**:
```bash
game-tools optimize profile         # Measure generation time/memory
game-tools optimize batch           # Pre-generate and cache assets
game-tools optimize report          # Generate performance report
game-tools optimize --analyze       # Identify bottlenecks
```

### 4.2 Profiling Implementation

```javascript
export async function execute(args) {
  const subcommand = args[0];
  
  if (subcommand === 'profile') {
    return profileAssetGeneration(args.slice(1));
  } else if (subcommand === 'batch') {
    return batchGenerateAssets(args.slice(1));
  } else if (subcommand === 'report') {
    return generateOptimizationReport(args.slice(1));
  }
}

async function profileAssetGeneration(options) {
  const logger = new Logger();
  const config = new GameConfig();
  config.loadAll();
  
  logger.info('Profiling asset generation...');
  
  const results = {
    runs: [],
    averageTime: 0,
    memoryPeak: 0,
    memoryAverage: 0,
    bottlenecks: []
  };
  
  const runsToProfile = options.runs || 5;
  
  for (let run = 0; run < runsToProfile; run++) {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    
    // Generate one sprite
    const rng = new SeededRNG(12345 + run);
    const canvas = createCanvas(48, 48);
    const generator = new PaladinGenerator(canvas, rng);
    generator.generate();
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    const timeMs = endTime - startTime;
    const memoryMB = (endMemory - startMemory) / 1024 / 1024;
    
    results.runs.push({
      run: run + 1,
      timeMs,
      memoryMB
    });
    
    logger.debug(`Run ${run + 1}: ${timeMs.toFixed(2)}ms, ${memoryMB.toFixed(2)}MB`);
  }
  
  // Calculate statistics
  const times = results.runs.map(r => r.timeMs);
  results.averageTime = times.reduce((a, b) => a + b) / times.length;
  
  const memories = results.runs.map(r => r.memoryMB);
  results.memoryPeak = Math.max(...memories);
  results.memoryAverage = memories.reduce((a, b) => a + b) / memories.length;
  
  // Identify bottlenecks
  const slowestRun = Math.max(...times);
  if (slowestRun > results.averageTime * 1.5) {
    results.bottlenecks.push({
      type: 'variance',
      message: `High variance in generation time (${slowestRun.toFixed(2)}ms)`
    });
  }
  
  logger.success('Profiling complete');
  logger.summary('Profiling Results', {
    'Average time': `${results.averageTime.toFixed(2)}ms`,
    'Memory peak': `${results.memoryPeak.toFixed(2)}MB`,
    'Runs': runsToProfile
  });
  
  return { success: true, results };
}

async function batchGenerateAssets(options) {
  const logger = new Logger();
  const config = new GameConfig();
  config.loadAll();
  
  logger.info(`Batch generating ${options.count} assets with caching...`);
  
  const cacheDir = options.cache || '.asset-cache';
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  const results = {
    generated: 0,
    cached: 0,
    totalTime: 0
  };
  
  const startTime = performance.now();
  
  for (let i = 0; i < options.count; i++) {
    const cacheKey = `paladin_${i}.png`;
    const cachePath = path.join(cacheDir, cacheKey);
    
    if (fs.existsSync(cachePath)) {
      results.cached++;
      logger.debug(`Using cache: ${cacheKey}`);
    } else {
      // Generate and cache
      const rng = new SeededRNG(12345 + i);
      const canvas = createCanvas(48, 48);
      const generator = new PaladinGenerator(canvas, rng);
      generator.generate();
      
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(cachePath, buffer);
      
      results.generated++;
    }
  }
  
  results.totalTime = performance.now() - startTime;
  
  logger.success(`Batch generation complete`);
  logger.summary('Batch Results', {
    'Assets generated': results.generated,
    'From cache': results.cached,
    'Total time': `${(results.totalTime / 1000).toFixed(2)}s`,
    'Cache directory': cacheDir
  });
  
  return { success: true, results };
}
```

---

## Summary Table

| Tool | Priority | Purpose | Dependencies | Timeline |
|------|----------|---------|--------------|----------|
| Save Manager | 1 | Persist/repair saves | File I/O, validation | Week 3 |
| Balance Tester | 2 | Validate balance | Game config, managers | Week 3 |
| Game Inspector | 3 | Live state viewer | IPC, WebSocket | Week 4 |
| Asset Optimizer | 4 | Performance profiling | Generators, performance API | Week 4 |

---

## Next Steps

1. ✅ Phase 4 new tools designed
2. → **Phase 5**: Implementation roadmap and timeline
3. → **Phase 6**: Integration decisions and architecture review
4. → **Phase 7**: Documentation and release planning

**Ready to proceed to Phase 5 implementation roadmap.**

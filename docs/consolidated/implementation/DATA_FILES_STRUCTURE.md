# Data Files Structure

## Current Structure

Data files exist in two locations:
- `public/data/` - **Primary source** (served by Vite, loaded by Phaser)
- `src/data/` - **Duplicate** (not currently used)

## How Data Files Are Loaded

Data files are loaded via Phaser's `load.json()` in `src/scenes/preload.js`:

```javascript
const dataPath = isElectron ? './data/' : '/data/';
this.load.json('items', dataPath + 'items.json');
this.load.json('enemies', dataPath + 'enemies.json');
// ... etc
```

This loads from `public/data/` directory (or `./data/` relative path in Electron).

## Files in Both Directories

Both directories contain identical JSON files:
- `classes.json`
- `specializations.json`
- `talents.json`
- `stats-config.json`
- `items.json`
- `enemies.json`
- `world-config.json`
- `achievements.json`
- `prestige-config.json`

## Build Process

Vite build process copies files from `public/data/` to `dist/data/`:
- See `vite.config.js` closeBundle() hook
- Only `public/data/` is copied to dist

## Recommendation

**Current Status**: `src/data/` is redundant but kept for now.

**Options**:
1. **Keep both** - Maintain sync manually (current approach)
2. **Remove src/data/** - Use only `public/data/` (recommended)
3. **Use src/data/** - Change loading to import from src (requires code changes)

**Note**: If removing `src/data/`, ensure all files are in `public/data/` and update any documentation references.

## Usage in Code

Data files are accessed via Phaser cache:
```javascript
const itemsData = this.cache.json.get('items');
const classesData = this.cache.json.get('classes');
// etc.
```

No direct imports from `src/data/` are used in the codebase.





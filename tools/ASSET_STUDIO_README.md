# Asset Studio - Interactive Sprite Generator

A web-based tool for experimenting with sprite generation outside of the game. Perfect for creating new enemy types, heroes, and testing different generation parameters.

## Quick Start

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the Asset Studio server**:
   ```bash
   npm run asset-studio
   ```
   Or directly:
   ```bash
   node tools/asset-studio.js
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3001`

## Features

### Sprite Types
- **Paladin (Hero)**: Generate paladin sprites with armor, weapons, and holy effects
- **Humanoid (Generic)**: Generate generic humanoid sprites with customizable palettes
- **Enemy Types**:
  - **Dragon**: Scaly body, wings, fire effects
  - **Undead**: Skeletal appearance, glowing eyes
  - **Beast**: Four-legged animal-like creatures
  - **Demon**: Dark appearance with horns and glowing effects
  - **Elemental**: Energy-based creatures (Fire, Water, Earth, Air)

### Controls

- **Sprite Type**: Select the type of sprite to generate
- **Seed**: Control the random generation (same seed = same sprite)
- **Palette**: Choose color palette for humanoid sprites
- **Enemy Options**: 
  - Color picker for customizable enemy colors
  - Element type selector for elementals
  - Fire effect toggle for dragons

### Workflow

1. Select sprite type
2. Adjust parameters (seed, colors, etc.)
3. Click "Generate Sprite" to preview
4. Experiment with different seeds and options
5. Click "Save Sprite" when you find one you like
6. Saved sprites are stored in `assets/studio/`

### Saved Sprites

- All saved sprites are stored in `assets/studio/`
- Filenames include sprite type, seed, and timestamp
- Click "Refresh Saved List" to see all saved sprites
- Click "Download" on any saved sprite to download it

## Use Cases

### Creating New Enemy Types

1. Select an enemy type (e.g., "Enemy: Dragon")
2. Adjust the color to match your vision
3. Toggle effects (like fire for dragons)
4. Generate multiple variations with different seeds
5. Save the ones you like
6. Use the saved sprites in your game

### Testing Generation Parameters

- Experiment with different seeds to see sprite variations
- Test color combinations
- Preview how different palettes look
- Find the perfect seed for a specific sprite design

### Iterative Design

- Generate → Preview → Adjust → Generate again
- Save multiple variations
- Compare different seeds side-by-side
- Export sprites for use in game development

## Technical Details

- **Server Port**: 3001 (configurable in `asset-studio.js`)
- **Output Format**: PNG images (48×48 pixels)
- **Storage**: `assets/studio/` directory
- **API Endpoints**:
  - `POST /api/generate` - Generate a sprite
  - `POST /api/save` - Save a sprite
  - `GET /api/list` - List saved sprites
  - `GET /api/download?file=<filename>` - Download a sprite

## Tips

- **Seed Management**: Keep track of seeds you like - they'll generate the same sprite every time
- **Color Testing**: Use the color picker to find perfect color combinations
- **Batch Generation**: Generate multiple sprites with different seeds, then save the best ones
- **Integration**: Saved sprites can be directly used in your game assets folder

## Troubleshooting

- **Port already in use**: Change `PORT` in `asset-studio.js` to a different port
- **Canvas errors**: Make sure `canvas` package is installed (`npm install canvas`)
- **Missing sprites**: Check that `assets/studio/` directory exists and is writable


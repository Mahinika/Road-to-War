# Asset Generation Tool Documentation

## Overview

The `generate-all-assets.js` tool is a comprehensive asset generator that creates all visual assets for the Road of War game. It generates procedurally created sprites, icons, and effects using the Canvas 2D API with optimizations for performance and consistency.

## Quick Start

### Running the Tool

```bash
# Generate all assets
node tools/generate-all-assets.js

# Or via npm script
npm run generate-assets  # This runs generate-assets.js first, then generate-all-assets.js
```

### Output Location

All generated assets are placed in:
```
road-to-war/assets/
├── icons/
│   └── spells/          # Spell/ability icons
├── sprites/
│   ├── enemies/         # Enemy sprites
│   ├── equipment/       # Item icons
│   ├── projectiles/     # Projectile sprites
│   └── vfx/             # Visual effect sprites
```

## Generated Asset Types

### 1. Spell/Ability Icons

**Location**: `road-to-war/assets/icons/spells/`

**Source**: `road-to-war/data/abilities.json`

**Generation**: Creates icons for all abilities across all character classes.

**Features**:
- **Color-coded by type**: Attack (red), Heal (green), Buff (blue), Debuff (magenta), AoE (orange), DoT (purple)
- **Motif-based glyphs**: Intelligently selects visual motifs based on ability name/ID:
  - `shield` - For protection/defensive abilities
  - `heal` - For healing abilities (cross symbol)
  - `lightning` - For lightning/storm abilities
  - `fire` - For fire/flame abilities
  - `frost` - For ice/cold abilities
  - `shadow` - For shadow/dark abilities
  - `dagger` - For melee/assassination abilities
  - `arrow` - For ranged/hunter abilities
  - `sword` - For warrior abilities
  - `totem` - For shaman abilities
  - `form` - For shapeshift abilities
  - `tree` - For Tree of Life abilities
  - `moon` - For moonkin/druid abilities
  - `burst` - For AoE abilities
  - `spark` - Default fallback

**Size**: 48x48 pixels

**Metadata**:
```json
{
  "asset_type": "spell_icon",
  "profile": "spell_icon",
  "base_size": [48, 48],
  "glow_color": "#FF4444",
  "cooldown_style": "radial",
  "outline": true
}
```

**Example Abilities**:
- `judgment`, `consecration`, `avenging_wrath` (Paladin)
- `arcane_blast`, `fireball`, `frostbolt` (Mage)
- `backstab`, `eviscerate`, `sinister_strike` (Rogue)
- `aimed_shot`, `explosive_shot`, `steady_shot` (Hunter)
- All abilities from all classes

### 2. Enemy Sprites

**Location**: `road-to-war/assets/sprites/enemies/`

**Source**: `road-to-war/data/enemies.json`

**Generation**: Creates procedural sprites based on enemy appearance data.

**Features**:
- **Body types**:
  - `blob` - Squishy blob-like creatures (e.g., slime)
  - `dragon` - Winged dragon creatures
  - `humanoid` - Humanoid enemies with customizable features
  - `creature` - Default creature type (circle-based)
- **Size variations**: Small (0.6x), Medium (1.0x), Large (1.3x)
- **Visual details**:
  - Eyes for all creature types
  - Custom features based on enemy ID (goblin ears, orc tusks, dark knight helmet)
  - Shadows for depth
  - Highlights for 3D appearance

**Size**: 64x64 pixels

**Metadata**:
```json
{
  "asset_type": "enemy_creature",
  "profile": "character_humanoid",
  "base_size": [64, 64],
  "glow_color": "#888888",
  "outline": true
}
```

**Example Enemies**:
- `slime` - Green blob creature
- `goblin` - Small humanoid with pointy ears
- `orc` - Large humanoid with tusks
- `dragon` - Winged creature
- `dark_knight` - Armored humanoid with helmet and sword

### 3. Item Icons

**Location**: `road-to-war/assets/sprites/equipment/`

**Source**: `road-to-war/data/items.json`

**Generation**: Creates icons for weapons, armor, and accessories.

**Features**:
- **Rarity-based coloring**:
  - Common (silver)
  - Uncommon (green)
  - Rare (blue)
  - Epic (purple)
  - Legendary (orange/gold)
- **Item type visualization**:
  - Weapons: Sword, staff/wand silhouettes
  - Armor: Chest plate silhouette
  - Accessories: Ring/amulet circular designs
- **Texture support**: Can use existing textures from `res://` paths if available
- **Intelligent skipping**: Skips regeneration if existing icon is substantial (>500 bytes)

**Size**: 48x48 pixels

**Metadata**:
```json
{
  "asset_type": "item_icon",
  "profile": "item_icon",
  "base_size": [48, 48],
  "glow_color": "#C0C0C0",
  "rarity": "common",
  "outline": true
}
```

**Example Items**:
- Weapons: `iron_sword`, `magic_staff`, `wooden_bow`
- Armor: `leather_armor`, `plate_chest`, `cloth_robe`
- Accessories: `copper_ring`, `silver_amulet`

### 4. Projectile Sprites

**Location**: `road-to-war/assets/sprites/projectiles/`

**Generation**: Creates predefined projectile types.

**Styles**:
- `orb` - Glowing orb with highlight
- `bolt` - Simple circular bolt
- `missile` - Circular missile
- `shard` - Diamond-shaped shard
- `lightning` - Zigzag lightning bolt
- `cloud` - Multi-circle cloud

**Size**: 32x32 pixels

**Metadata**:
```json
{
  "asset_type": "projectile_magic",
  "profile": "projectile_magic",
  "base_size": [32, 32],
  "glow_color": "#00FFFF",
  "pulse_strength": 0.2,
  "outline": false
}
```

**Predefined Projectiles**:
- `magic_bolt` (cyan) - Default magic projectile
- `fire_ball` (orange-red) - Fire projectile
- `ice_shard` (light blue) - Ice projectile
- `lightning_bolt` (yellow) - Lightning projectile
- `shadow_bolt` (purple) - Shadow projectile
- `holy_light` (yellow-white) - Holy projectile
- `poison_cloud` (magenta) - Poison projectile
- `arcane_missile` (magenta-pink) - Arcane projectile

### 5. VFX Sprites

**Location**: `road-to-war/assets/sprites/vfx/`

**Generation**: Creates visual effect sprites for game events.

**Styles**:
- `burst` - Explosion burst with rays
- `star` - Star shape with center
- `ring` - Concentric rings
- `cloud` - Multi-circle cloud
- `sparks` - Scattered spark particles

**Size**: 64x64 pixels

**Metadata**:
```json
{
  "asset_type": "impact_fx",
  "profile": "projectile_magic",
  "base_size": [64, 64],
  "glow_color": "#FFFFFF",
  "pulse_strength": 0.15,
  "outline": false
}
```

**Predefined VFX**:
- `hit_impact` (white) - Generic hit effect
- `heal_burst` (green) - Healing effect
- `death_poof` (dark gray) - Death effect
- `level_up` (gold) - Level up effect
- `buff_aura` (blue) - Buff aura effect
- `debuff_cloud` (magenta) - Debuff effect
- `critical_hit` (red) - Critical hit effect
- `block_sparks` (silver) - Block/parry sparks

## Configuration

### Global Configuration

Located at the top of `generate-all-assets.js`:

```javascript
const CONFIG = {
    OUTPUT_DIR: path.join(__dirname, '..', 'road-to-war', 'assets'),
    SEED: Date.now(),
    ICON_SIZE: 48,        // Spell/ability icons
    ITEM_ICON_SIZE: 48,   // Equipment icons
    ENEMY_SIZE: 64,       // Enemy sprites (larger for detail)
    PROJECTILE_SIZE: 32,  // Projectiles
    VFX_SIZE: 64          // VFX sprites
};
```

### Color Schemes

**Spell Type Colors**:
```javascript
spellTypes: {
    'attack': { primary: '#FF4444', secondary: '#FF8888', accent: '#FFFFFF' },
    'heal': { primary: '#44FF44', secondary: '#88FF88', accent: '#FFFFFF' },
    'buff': { primary: '#4444FF', secondary: '#8888FF', accent: '#FFFFFF' },
    'debuff': { primary: '#FF44FF', secondary: '#FF88FF', accent: '#FFFFFF' },
    'aoe': { primary: '#FFAA44', secondary: '#FFCC88', accent: '#FFFFFF' },
    'dot': { primary: '#AA44FF', secondary: '#CC88FF', accent: '#FFFFFF' }
}
```

**Rarity Colors**:
```javascript
rarity: {
    'common': { base: '#C0C0C0', accent: '#FFFFFF' },
    'uncommon': { base: '#1EFF00', accent: '#FFFFFF' },
    'rare': { base: '#0070DD', accent: '#88CCFF' },
    'epic': { base: '#A335EE', accent: '#FF88FF' },
    'legendary': { base: '#FF8000', accent: '#FFFF00' }
}
```

## Architecture

### Optimization Features

1. **Canvas 2D API**: Uses direct Canvas API instead of pixel-by-pixel manipulation for better performance
2. **Batched File Operations**: Collects all assets and writes them in batches
3. **Cached Color Calculations**: Pre-calculates color schemes to avoid repeated calculations
4. **Progress Reporting**: Shows real-time progress with file names

### Generation Flow

```
main()
├── generateBaseAssets() [from generate-assets.js]
│   └── Characters & Bloodlines
├── generateEnemySprites()
│   └── Reads enemies.json → Generates sprites
├── generateSpellIcons()
│   └── Reads abilities.json → Generates icons
├── generateItemIcons()
│   └── Reads items.json → Generates icons (skips existing)
├── generateProjectileSprites()
│   └── Hardcoded list → Generates projectiles
└── generateVFXSprites()
    └── Hardcoded list → Generates VFX
```

### Key Functions

#### `generateSpellIcon(size, abilityData, abilityId)`
- Creates spell icon with motif-based glyph
- Uses `pickSpellMotif()` to determine visual motif
- Applies type-based color scheme

#### `generateEnemySprite(size, enemyData, enemyId)`
- Creates enemy sprite based on appearance data
- Supports multiple body types (blob, dragon, humanoid, creature)
- Adds visual details based on enemy ID

#### `generateItemIcon(size, itemData, itemId)`
- Creates item icon with rarity-based coloring
- Supports texture replacement if texture path exists
- Skips regeneration if existing icon is substantial

#### `generateProjectileSprite(size, proj)`
- Creates projectile based on style (orb, bolt, shard, etc.)
- Uses color from projectile definition

#### `generateVFXSprite(size, vfx)`
- Creates VFX based on style (burst, star, ring, etc.)
- Uses color from VFX definition

#### `pickSpellMotif(abilityId, abilityData)`
- Intelligent motif selection based on ability name/ID
- Uses regex patterns to match keywords
- Falls back to type-based selection

#### `drawGlyph(ctx, size, motif, colors)`
- Draws the visual glyph for spell icons
- Supports 15+ different motifs
- Uses shadow/outline for readability

## Usage Examples

### Regenerate All Assets

```bash
# Clean regeneration (will regenerate even if files exist)
node tools/generate-all-assets.js
```

### Regenerate Specific Asset Type

To regenerate only one type, you can temporarily comment out other generation calls in the `main()` function, or create a custom script.

### Customizing Asset Generation

1. **Change Sizes**: Modify `CONFIG` object sizes
2. **Add Colors**: Extend `COLOR_CACHE` with new color schemes
3. **Add Motifs**: Extend `pickSpellMotif()` and `drawGlyph()` functions
4. **Add Projectiles**: Add entries to `projectileTypes` array in `generateProjectileSprites()`
5. **Add VFX**: Add entries to `vfxTypes` array in `generateVFXSprites()`

## Asset Integration

### Godot Integration

Generated assets are automatically compatible with Godot's AssetVisual system:

1. **Import**: Godot auto-imports PNG files when added to project
2. **Metadata**: JSON metadata files provide additional configuration
3. **Profiles**: Use AssetVisual profiles for consistent rendering

### Using Assets in Code

```gdscript
# Load a spell icon
var icon_texture = load("res://assets/icons/spells/judgment.png")
var icon_metadata = load_json_file("res://assets/icons/spells/judgment.json")

# Load an enemy sprite
var enemy_texture = load("res://assets/sprites/enemies/orc.png")
var enemy_metadata = load_json_file("res://assets/sprites/enemies/orc.json")

# Use with AssetVisual
var visual = preload("res://scenes/visuals/AssetVisual.tscn").instantiate()
visual.texture = icon_texture
visual.profile = preload("res://resources/visuals/spell_icon.tres")
```

## Troubleshooting

### Assets Not Generating

1. **Check Data Files**: Ensure `abilities.json`, `enemies.json`, and `items.json` exist
2. **Check Permissions**: Ensure write permissions for output directory
3. **Check Dependencies**: Ensure `canvas` npm package is installed

### Assets Look Wrong

1. **Check Color Schemes**: Verify color values in `COLOR_CACHE`
2. **Check Motif Selection**: Verify `pickSpellMotif()` logic matches ability names
3. **Check Sizes**: Ensure sizes are appropriate for use case

### Performance Issues

1. **Reduce Batch Size**: Write files in smaller batches
2. **Optimize Colors**: Pre-calculate more color combinations
3. **Cache More**: Cache more intermediate calculations

## Extension Points

### Adding New Asset Types

1. Create generation function: `generateXAsset(size, data, id)`
2. Create batch function: `async function generateXAssets()`
3. Add to `main()` function
4. Update this documentation

### Adding New Motifs

1. Add pattern match in `pickSpellMotif()`
2. Add drawing code in `drawGlyph()` switch statement
3. Test with relevant abilities

### Custom Color Schemes

1. Extend `COLOR_CACHE` object
2. Reference in generation functions
3. Update metadata generation

## Related Documentation

- [Asset Generation Summary](ASSET_GENERATION_SUMMARY.md) - Summary of generated assets
- [Asset Integration Complete](ASSET_INTEGRATION_COMPLETE.md) - Integration status
- [Animation System](ANIMATION_SYSTEM.md) - Animation asset generation

## Performance Notes

- **Generation Time**: Typically 5-30 seconds depending on asset count
- **File Count**: ~200+ files generated (PNG + JSON pairs)
- **Memory Usage**: Low (batched operations, no large arrays)
- **Disk Usage**: ~1-5MB total (depending on PNG compression)

## Version History

- **v1.0 (Current)**: Comprehensive asset generation with optimization
- Includes: Spell icons, enemy sprites, item icons, projectiles, VFX
- Features: Motif-based glyphs, rarity coloring, texture support, intelligent skipping

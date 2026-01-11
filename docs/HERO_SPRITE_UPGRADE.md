# Hero Sprite Upgrade - 256x256 Design / 128x128 Export

## Overview

The hero sprite system has been upgraded from 64x64 chibi style to 256x256 design resolution with 128x128 export for realistic proportions and enhanced detail.

## Changes Summary

### Sprite Dimensions
- **Design Resolution**: 256x256 pixels (high detail, realistic proportions)
- **Export Resolution**: 256x256 pixels (full size for maximum detail)
- **Display Size**: 256 pixels tall on screen (full native size)

### Proportions (Realistic, Not Chibi)
- **Head**: 14% of height (36px at 256px design, 18px at 128px export) - Realistic proportion, not chibi
- **Torso**: 28% of height (72px at 256px design)
- **Legs**: 36% of height (92px at 256px design)
- **Arms**: 22% of height (56px at 256px design)

### Visual Enhancements
- **Facial Features**: Eyes (4-6px), eyebrows, nose (2-3px), mouth expressions (neutral, smile, determined)
- **Clothing Textures**: Fabric folds, armor segmentation with plates, subtle gradients
- **Shading**: 5-level cel shading (Light2, Light1, Base, Dark1, Dark2) with top-left light source
- **Style**: Pixel art but polished with smooth edges and cohesive color palette

### Generator Architecture

#### New Files
- `tools/generators/hero-sprite-generator.js` - 256x256 hero sprite generator with realistic proportions
- `tools/generators/base-generator.js` - Shared base class for all generators
- `tools/unified-asset-generator.js` - Unified entry point for all asset generation

#### Shared Utilities
- `tools/utils/canvas-utils.js` - Canvas operations (setupCanvasContext, drawIconPlate, resolveResPathToDisk, isMeaningfulTexture)
- `tools/utils/color-utils.js` - Color operations (hexToRgb, rgbToHex, mixHex, lightenHex, darkenHex, getLuma, ensureVisibleFill)

### Godot Integration Updates

#### HeroSprite.gd Changes
- **BASE_VISUAL_SCALE**: Updated from `Vector2(2.5, 2.5)` to `Vector2(0.84375, 0.84375)` for ~108px display
- **SPRITE_SIZE**: Added constant `128` (new sprite size, upgraded from 64)
- **Offset**: Updated from `-32` to `-SPRITE_SIZE / 2` (-64 for 128px sprites)
- **Texture Filtering**: Added `TEXTURE_FILTER_NEAREST` for pixel-perfect rendering on all sprite layers
- **Placeholder Textures**: Updated from 64x64 to 128x128

#### Code Changes
```gdscript
# Old (64x64 sprites)
const BASE_VISUAL_SCALE = Vector2(2.5, 2.5)
layer.offset = Vector2(0, -32)

# New (256x256 sprites)
const BASE_VISUAL_SCALE = Vector2(1.0, 1.0)  # Native size display
const SPRITE_SIZE = 256
layer.offset = Vector2(0, -SPRITE_SIZE / 2)  # -128 for 256px
layer.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
```

## Animation Frames

All animations are generated at 256x256 design resolution and exported at 256x256:
- **Idle**: 4-6 frames, 2.0s loop, subtle breathing/bob
- **Walk**: 8 frames, 0.8s loop, leg cycle with weight shift
- **Attack**: 6 frames, 0.4s, forward lunge with weapon swing
- **Cast**: 7 frames, 0.5s, spell casting motion
- **Hurt**: 6 frames, 0.3s, quick recoil
- **Death**: 5 frames, 1.0s, fall and fade
- **Victory**: 4 frames, 1.5s, weapon raise and celebration

## Scaling Strategy

1. **Design**: 256x256 pixels (high detail, realistic proportions)
2. **Export**: 256x256 pixels (full size, maximum detail)
3. **Display**: Native size on screen (256x256 pixels)
4. **Filtering**: Nearest-neighbor (TEXTURE_FILTER_NEAREST) for pixel-perfect rendering

## Migration Notes

### Backward Compatibility
- Old 64x64 sprites will still work but may appear smaller
- The system can handle both old and new sprite sizes during transition
- Placeholder textures have been updated to 128x128

### Performance Considerations
- 128x128 sprites are 4x the memory of 64x64 (16KB vs 4KB per sprite)
- Still manageable for desktop games with reasonable hero counts
- Nearest-neighbor filtering is essential for pixel art quality

## Future Extensibility

To add new asset types:
1. Create new generator class extending `BaseGenerator`
2. Add case to `UnifiedAssetGenerator.generate()`
3. No new files or entry points needed - unified interface handles everything

Example:
```javascript
// In unified-asset-generator.js
case 'new_asset_type':
    return this.newAssetGenerator.generate(data, options);
```

## Files Modified

- `road-to-war/scripts/HeroSprite.gd` - Updated for 128x128 sprites
- `tools/generate-all-assets.js` - Utility functions extracted to shared modules
- `tools/utils/canvas-utils.js` - NEW: Shared canvas operations
- `tools/utils/color-utils.js` - NEW: Shared color operations
- `tools/generators/base-generator.js` - NEW: Base generator class
- `tools/generators/hero-sprite-generator.js` - NEW: 256x256 hero generator
- `tools/generators/spell-icon-generator.js` - NEW: Spell icon generator class
- `tools/unified-asset-generator.js` - NEW: Unified entry point
- `tools/utils/pixel-drawer.js` - Updated to use shared color-utils
- `tools/utils/material-classifier.js` - Updated to use shared color-utils
- `tools/utils/glow-renderer.js` - Updated to use shared color-utils
- `tools/utils/color-quantizer.js` - Updated to use shared color-utils

## Testing & Validation

1. Generate test hero sprite at 256x256
2. Export to 128x128
3. Verify in Godot at ~108px display size
4. Test animations (all directions)
5. Verify equipment layering works
6. Performance test with 5 heroes on screen
7. Memory usage validation

## Success Criteria

- ✅ All shared utilities extracted to single files
- ✅ No code duplication (hexToRgb, etc. in one place)
- ✅ Unified entry point for all asset generation
- ✅ Hero sprites at 256x256 design / 256x256 export
- ✅ Realistic proportions (14% head ratio)
- ✅ Enhanced detail (facial features, clothing textures, shading)
- ✅ 256px display size (native resolution)
- ✅ Godot integration updated for 256x256 sprites
- ✅ Texture filtering set to nearest-neighbor

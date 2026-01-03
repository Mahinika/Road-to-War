# Dragumagu-Style Pixel Art Reference

## Overview
This document defines the visual style based on dragumagu's WoW pixel art content. The goal is to match the high-detail, vibrant, equipment-heavy aesthetic of professional WoW pixel art.

## Key Characteristics

### 1. **Bold Outlines**
- **Main Forms**: 2-3px black outlines
- **Internal Details**: 1px outlines
- **Selective Thickness**: Outer edges thicker, internal details thinner
- **Color**: Pure black (0x000000)

### 2. **5-Level Cel-Shading**
All materials use a 5-level shading system:
- `light2`: Brightest highlight (top-left light source)
- `light1`: Secondary highlight
- `base`: Base color
- `dark1`: Primary shadow
- `dark2`: Deepest shadow

### 3. **Material-Based Shading**
Different materials have different shading rules:

| Material | Highlight | Shadow | Contrast | Special |
|----------|-----------|--------|----------|---------|
| **Metal** | 40% lighter | 40% darker | High | Specular reflections |
| **Cloth** | 20% lighter | 30% darker | Medium | Texture patterns |
| **Leather** | 15% lighter | 25% darker | Medium | Grain texture |
| **Skin** | 25% lighter | 20% darker | Low | Smooth gradients |

### 4. **WoW Class Color Palettes**

#### Paladin
- **Armor**: Silver plate (0xE0E0E0 → 0x808080)
- **Cloth**: Royal blue (0x4169E1 → 0x1E3A8A)
- **Gold**: Bright gold accents (0xFFD700)
- **Glow**: Holy yellow (0xFFFF00)

#### Warrior
- **Armor**: Brown plate (0x8B7355 → 0x4A3A2F)
- **Cloth**: Dark red (0x8B0000 → 0x4A0000)
- **Metal**: Steel (0xC0C0C0)

#### Mage
- **Cloth**: Arcane blue (0x4169E1 → 0x00BFFF)
- **Trim**: Gold (0xFFD700)
- **Glow**: Arcane cyan (0x00FFFF)

#### Rogue
- **Leather**: Dark (0x2F2F2F → 0x0F0F0F)
- **Accent**: Gold daggers (0xFFD700)
- **Shadow**: Purple (0x4B0082)

#### Hunter
- **Leather**: Brown (0x8B4513 → 0x4A2413)
- **Cloth**: Forest green (0x228B22)
- **Metal**: Silver (0xC0C0C0)

#### Warlock
- **Cloth**: Dark purple (0x4B0082 → 0x1A0033)
- **Trim**: Red (0xFF0000)
- **Glow**: Fel purple (0xFF00FF)

#### Shaman
- **Mail**: Teal (0x00CED1 → 0x006666)
- **Cloth**: Dark slate (0x2F4F4F)
- **Totem**: Gold (0xFFD700)

#### Priest
- **Cloth**: White/light (0xFFFFFF → 0xC0C0C0)
- **Trim**: Gold (0xFFD700)
- **Glow**: Holy white-gold (0xFFFF00)

#### Death Knight
- **Plate**: Dark (0x2F2F2F → 0x0F0F0F)
- **Runes**: Frost blue (0x00CED1)
- **Glow**: Blood red (0xFF0000)

### 5. **Chibi Proportions**
- **Head**: 33% of total height (very large)
- **Torso**: 25% of total height (compact)
- **Limbs**: 20% of total height (short, stout)
- **Equipment**: 120% scale (slightly oversized for detail)

### 6. **Equipment Detail System**

#### Armor Pieces
- **Plate**: 3 detail layers (base, highlight, shadow)
- **Cloth**: 2 detail layers (base, shadow)
- **Leather**: 2 detail layers (base, texture)
- **Mail**: 3 detail layers (base, ring pattern, shadow)

#### Equipment Features
- **Helmet**: Visor, plume, detail lines
- **Chest**: Segmentation, buckle, shoulder pads
- **Legs**: Knee guards, segmentation
- **Boots**: Toe cap, straps, sole detail
- **Gloves**: Fingers, wrist guard
- **Weapon**: Hilt, blade, glow, detail engravings

### 7. **Animation Principles**
- **Frame Count**: 8 frames per cycle (standard)
- **Frame Rate**: 12fps (pixel art standard)
- **Squash & Stretch**: Exaggerated movement
- **Anticipation**: Wind-up before actions
- **Follow-Through**: Equipment trails movement

### 8. **WoW Aesthetic Elements**

#### Class Glows
Each class has a signature glow color that appears on:
- Weapon effects
- Ability animations
- Equipment highlights
- Particle effects

#### Tier Colors
- **Common**: Gray (0x9D9D9D)
- **Uncommon**: Green (0x1EFF00)
- **Rare**: Blue (0x0070DD)
- **Epic**: Purple (0xA335EE)
- **Legendary**: Orange (0xFF8000)

#### Particle Effects
- **Holy**: Yellow (0xFFFF00), intensity 0.8
- **Arcane**: Cyan (0x00FFFF), intensity 0.6
- **Fel**: Purple (0xFF00FF), intensity 1.0
- **Frost**: Teal (0x00CED1), intensity 0.7
- **Fire**: Orange-red (0xFF4500), intensity 0.9

## Implementation

### Using the Style Guide

```javascript
import { DRAGUMAGU_STYLE, generateDragumaguPalette, getClassPalette, getClassGlow } from '../config/dragumagu-style-guide.js';

// Generate a material palette
const metalPalette = generateDragumaguPalette(0xC0C0C0, 'metal');
// Returns: { light2, light1, base, dark1, dark2, outline }

// Get class-specific colors
const paladinColors = getClassPalette('paladin');
// Returns: { armor, cloth, gold, glow }

// Get class glow
const paladinGlow = getClassGlow('paladin');
// Returns: 0xFFFF00 (holy yellow)
```

### Drawing with Dragumagu Style

1. **Use 5-level shading** for all materials
2. **Apply bold 2-3px outlines** to main forms
3. **Use 1px outlines** for internal details
4. **Follow material-based shading rules**
5. **Apply class-specific color palettes**
6. **Add equipment detail layers**
7. **Include class glow effects** where appropriate

## Visual Examples

### Character Proportions
```
     [Head: 33%]
    [Torso: 25%]
  [Limbs: 20% each]
```

### Shading Direction
```
Light Source (Top-Left)
    ↓
[light2] [light1]
    [base]
[dark1] [dark2]
```

### Outline Hierarchy
```
[===== 3px =====]  Main form
[--- 2px ---]      Major details
[- 1px -]          Minor details
```

## Color Reference

### Skin Tones
- **Light**: 0xE3B590 (base) → 0xFFEDD7 (light2)
- **Medium**: 0xD4A37D (base) → 0xF0D1B2 (light2)
- **Dark**: 0xC6946F (base) → 0xE8B896 (light2)

### Orc Green
- **Base**: 0x4A7023
- **Light**: 0x6B9033
- **Dark**: 0x2A5013

### Goblin Yellow-Green
- **Base**: 0x8DA343
- **Light**: 0xADC363
- **Dark**: 0x6D8323

## Notes

- All colors should be vibrant and saturated (WoW aesthetic)
- Outlines should be crisp and bold (2-3px minimum)
- Equipment should be highly detailed with multiple layers
- Class identity should be clear through color and glow
- Proportions should be chibi (large head, compact body)


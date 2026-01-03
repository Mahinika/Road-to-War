# Pixel Art Sprite Size Research - Comprehensive Guide

## Executive Summary

For a Paladin character sprite in a 2D RPG game, **32×32 pixels** is the optimal size, balancing detail, performance, and visual appeal. However, **48×48** or **64×64** can work for more detailed characters, especially when scaled properly.

## Standard Sprite Sizes

### Common Dimensions (Multiples of 8)

| Size | Use Case | Detail Level | Development Time |
|------|----------|--------------|------------------|
| **8×8** | Icons, minimalistic characters | Very low | Fast |
| **16×16** | Small characters, items, classic 8-bit style | Low | Fast |
| **32×32** | **Main characters, detailed items** | **Medium** | **Moderate** |
| **48×48** | Prominent characters, detailed animations | High | Moderate-Slow |
| **64×64** | Bosses, detailed characters, modern pixel art | Very high | Slow |
| **96×96+** | Very detailed characters, cutscenes | Extremely high | Very slow |

### Industry Recommendations

**Most Recommended for Main Characters:**
- **32×32 pixels** - Best balance of detail and simplicity
- Used in many successful indie games
- Provides enough space for expressive features
- Manageable development time

**Alternative Sizes:**
- **48×48 pixels** - More detail, still manageable
- **64×64 pixels** - High detail, requires more time

## Game Resolution & Scaling

### Base Resolution Standards

Modern pixel art games use base resolutions that scale cleanly to 1080p:

| Base Resolution | Scale Factor to 1080p | Aspect Ratio | Examples |
|----------------|----------------------|--------------|-----------|
| **320×180** | 6× | 16:9 | Classic retro |
| **480×270** | 4× | 16:9 | Hyper Light Drifter |
| **640×360** | 3× | 16:9 | Modern indie |
| **1280×720** | 1.5× | 16:9 | High-res pixel art |

### Scaling Rules

**Critical:** Always use **integer scaling factors** (2×, 3×, 4×, 6×)
- Prevents distortion and blurriness
- Maintains pixel-perfect appearance
- Ensures crisp visuals on modern displays

**Avoid:**
- Fractional scaling (1.5×, 2.5×) - causes blur
- Non-integer multipliers - breaks pixel alignment

## Character Proportions

### Screen Height Guidelines

Decide character size relative to screen height:

- **1/8 of screen height** - Small characters (classic style)
- **1/6 of screen height** - Medium characters (balanced)
- **1/4 of screen height** - Large characters (detailed)

**Example Calculation:**
- Game resolution: 320×180 pixels
- Character at 1/8 of height: 180 ÷ 8 = **22.5 pixels** → **24 pixels** (rounded to multiple of 8)
- Character at 1/6 of height: 180 ÷ 6 = **30 pixels** → **32 pixels**

### Head-to-Body Ratios

- **Realistic:** Head = 1/7 of body height
- **Cartoon/Chibi:** Head = 1/3 of body height (larger head)
- **Standard Game:** Head = 1/4 to 1/5 of body height

## Phaser 3 Specific Considerations

### Current Game Setup
- **Game Resolution:** 1024×768 pixels (configurable)
- **Viewport:** Scales to fit screen
- **Current Sprite Size:** 64×64 pixels

### Recommendations for Phaser 3

**Option 1: 32×32 Base (Recommended)**
- Scale up 2× for display = 64×64 on screen
- Better performance
- Faster asset creation
- Classic pixel art feel

**Option 2: 48×48 Base**
- Scale up 1.33× for display = 64×64 on screen
- More detail than 32×32
- Still manageable

**Option 3: 64×64 Base (Current)**
- No scaling needed
- Maximum detail
- More development time
- Higher memory usage

## Performance & Memory

### Memory Usage Comparison

| Sprite Size | Pixels | Memory (RGBA) | 100 Sprites |
|-------------|--------|---------------|-------------|
| 16×16 | 256 | 1 KB | 100 KB |
| 32×32 | 1,024 | 4 KB | 400 KB |
| 48×48 | 2,304 | 9 KB | 900 KB |
| 64×64 | 4,096 | 16 KB | 1.6 MB |
| 96×96 | 9,216 | 36 KB | 3.6 MB |

### Performance Impact

- **Smaller sprites (16×16, 32×32):** Minimal performance impact
- **Medium sprites (48×48, 64×64):** Moderate impact, usually fine
- **Large sprites (96×96+):** Can impact performance on lower-end devices

### Texture Atlas Considerations

- Power-of-2 dimensions optimize GPU texture usage
- 32×32, 64×64, 128×128 are optimal
- 48×48 requires padding to 64×64 in atlas

## Animation Considerations

### Frame Count vs. Size

| Sprite Size | Recommended Frames | Total Pixels/Animation |
|-------------|-------------------|------------------------|
| 16×16 | 4-8 frames | 1,024-2,048 pixels |
| 32×32 | 4-12 frames | 4,096-12,288 pixels |
| 48×48 | 6-16 frames | 13,824-36,864 pixels |
| 64×64 | 8-24 frames | 32,768-98,304 pixels |

**Rule of Thumb:** More frames = smoother animation, but exponentially more work

## Real-World Examples

### Successful Games & Their Sprite Sizes

| Game | Character Size | Base Resolution | Scale Factor |
|------|----------------|-----------------|--------------|
| **Hyper Light Drifter** | ~32×32 | 480×270 | 4× to 1080p |
| **Celeste** | 16×16 | 320×180 | 6× to 1080p |
| **Stardew Valley** | 16×16 | Various | Variable |
| **Dead Cells** | 48×48+ | 1920×1080 | 1× (native) |
| **The Messenger** | 16×16 | 256×144 | 7.5× to 1080p |

## Recommendations for This Project

### Current Situation
- Game resolution: 1024×768 (configurable)
- Current sprite: 64×64 pixels
- Target: Paladin character with armor, weapons, details

### Recommended Approach

**Primary Recommendation: 48×48 pixels**
- Good balance of detail and performance
- Enough space for armor details, weapons, animations
- Scales well (1.33× to 64×64 if needed)
- Manageable development time

**Alternative: 32×32 pixels**
- Classic pixel art aesthetic
- Faster to create and animate
- Better performance
- Less detail but more stylized

**Keep 64×64 if:**
- Maximum detail is priority
- Development time is not a concern
- Performance is not an issue

### Implementation Strategy

1. **Test different sizes** - Generate sprites at 32×32, 48×48, and 64×64
2. **Compare in-game** - See how they look at actual game resolution
3. **Consider animation** - Larger = more frames needed for smooth animation
4. **Balance detail vs. time** - More detail = more development time

## Best Practices

### 1. Consistency
- Use the same base size for all characters
- Maintain consistent proportions
- Keep style uniform across assets

### 2. Scaling
- Always use integer scaling (2×, 3×, 4×)
- Test at target resolution
- Ensure pixel-perfect rendering

### 3. Proportions
- Decide on head-to-body ratio early
- Maintain consistent character heights
- Consider game world scale

### 4. Performance
- Monitor memory usage
- Use texture atlases efficiently
- Consider sprite batching

### 5. Animation
- Plan frame count based on size
- Larger sprites need more frames for smooth animation
- Balance detail with animation complexity

## Technical Implementation

### Phaser 3 Configuration

```javascript
// For 32×32 sprites scaled 2×
config: {
    width: 1024,
    height: 768,
    pixelArt: true,  // Prevents anti-aliasing
    antialias: false
}

// Sprite scaling
sprite.setScale(2); // 32×32 → 64×64 display
```

### Generator Configuration

Current generator creates 64×64 sprites. To change:

```javascript
// In paladin-generator.js
this.width = 48;  // Change from 64
this.height = 48; // Change from 64
```

## Conclusion

**For a Paladin character in this RPG:**

1. **Best Choice: 48×48 pixels**
   - Optimal balance of detail and development time
   - Enough space for armor, weapons, animations
   - Good performance characteristics

2. **Alternative: 32×32 pixels**
   - Classic pixel art aesthetic
   - Faster development
   - Better for retro style

3. **Current: 64×64 pixels**
   - Maximum detail
   - More development time
   - Higher memory usage

**Recommendation:** Test 48×48 first, as it provides the best balance for a detailed character like a Paladin while maintaining reasonable development time and performance.


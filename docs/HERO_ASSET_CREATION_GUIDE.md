# 🎯 Hero Asset Creation System: "Road of War" — Ultimate SOP v3.0 (Production-Ready Master Edition)

**Date:** January 03, 2026  
**Purpose:** A complete, modular, pipeline-ready standard operating procedure for creating hero assets in *Road of War*. Covers art direction, technical implementation in Godot 4, animation, VFX, QA automation, documentation, and team best practices. Designed for professional game studios aiming for high polish, scalability (1000+ unique heroes), and rapid iteration.

## 0️⃣ Guiding Principles
- **Modularity**: Every hero built from independent, swappable layers (paper doll system) — never bake equipment into bodies.
- **Consistency**: Strict adherence to Dragumagu-inspired pixel-perfect chibi style (bold outlines, cel shading, WoW-class fantasy vibes).
- **Readability**: Heroes and abilities instantly recognizable at 32–64px scale, even in dense battles.
- **Polish ("Juice")**: Exaggerated motion, responsive feedback, particle bursts — everything feels alive.
- **Automation**: Procedural animations, JSON-driven equipment, scripted QA checks to minimize manual work.
- **Performance**: Target 60 FPS with 100+ heroes on screen (mobile/web viable).
- **Scalability**: Support thousands of equipment combinations without new art per hero.

## 1️⃣ Art Style: Dragumagu-Inspired Pixel-Perfect Chibi

### Chibi Proportions
| Body Part   | % of Total Height |
|-------------|-------------------|
| Head        | 33%              |
| Torso       | 25%              |
| Limbs       | 20% each         |
| Equipment   | Up to 120% of body (oversized for emphasis) |

### Shading & Outlines
- **Outlines**: 2–3px pure black (#000000) for main forms; 1px for internal details.
- **Cel Shading**: 5 levels (pre-baked in sprites):
  - Light2: Bright highlight
  - Light1: Mid highlight
  - Base: Core color
  - Dark1: Soft shadow
  - Dark2: Deep shadow
- **Filter**: Nearest neighbor only — no blurring.

### Class Color Identity (HEX Values for Automation)
| Class   | Primary Colors                  | Accent/Glow              | HEX Primary                     | HEX Accent/Glow              |
|---------|---------------------------------|--------------------------|---------------------------------|------------------------------|
| Paladin | Silver + Royal Blue            | Gold / Holy Yellow       | #C0C0C0, #4169E1               | #FFD700, #FFFF99            |
| Warrior | Brown / Steel                  | Dark Red                 | #8B4513, #A9A9A9               | #8B0000                     |
| Mage    | Arcane Blue                    | Cyan Glow                | #00BFFF                        | #00FFFF                     |
| Rogue   | Dark Leather                   | Purple / Gold            | #654321                        | #9370DB, #FFD700            |
| Hunter  | Brown Leather                  | Forest Green / Silver    | #D2B48C                        | #228B22, #C0C0C0            |

### Tips
- Create in **Aseprite** with locked 16–32 color palette per class.
- Always test silhouette in grayscale first.
- Document swatches in `DRAGUMAGU_STYLE_REFERENCE.md`.

## 2️⃣ Modular Paper Doll System

### Layer Hierarchy (Back → Front Z-Order)
1. Body Base
2. Legs
3. Chest
4. Shoulders (scale up to 120%)
5. Head
6. Main Hand Weapon
7. Offhand / Shield

### Rules
- **Pivot**: Exact bottom-center on all layers (align to 64×64 grid).
- **Rarity Modulation**: Apply semi-transparent tint via Godot modulate (e.g., Legendary: #FFD70080).
- **Shader**: Use pixel-perfect transparency shader on all Sprite2D nodes.
- Avoid clipping: Large shoulders must not overlap weapon pivots.

## 3️⃣ Implementation Pipeline (Godot 4)

### Step 1: Base Sprite Creation
- Resolution: 64×64 px (fallback 32×32 for performance).
- Path: `res://assets/sprites/humanoid_[class].png`
- Naming: `humanoid_paladin.png`, etc.

### Step 2: Equipment Integration (JSON-Driven)
**Example `res://data/items.json`**:
```json
{
  "legendary_sword": {
    "slot": "weapon",
    "texture": "res://assets/sprites/equipment/paladin_sword_legendary.png",
    "rarity": "legendary",
    "modulate": "#FFD70080",
    "glow_shader_param": 0.5,
    "class_restriction": ["paladin"]
  }
}
```

### Step 3: Code Implementation
```gdscript
extends CharacterBody2D
class_name HeroSprite

@export var class_type: String = "paladin"
var layer_nodes: Dictionary = {}

func _ready() -> void:
    setup_layers()
    apply_equipment()
    setup_animations()

func setup_layers() -> void:
    # Pre-create Sprite2D nodes for each slot
    var slots = ["body", "legs", "chest", "shoulders", "head", "weapon", "offhand"]
    for slot in slots:
        var sprite = Sprite2D.new()
        sprite.name = slot.capitalize()
        sprite.centered = false
        sprite.offset = Vector2(32, 64)  # Bottom-center pivot
        add_child(sprite)
        layer_nodes[slot] = sprite

func apply_equipment() -> void:
    # Parse JSON and apply textures/modulates
    var items_data = DataManager.get_data("items")
    if not items_data: return
    
    var hero_id = hero_data.id if hero_data else ""
    var equipment = EquipmentManager.get_hero_equipment(hero_id)
    
    for slot in equipment:
        var item_id = equipment[slot]
        if not item_id: continue
        
        # Find item in items.json
        var item_data = {}
        for category in ["weapons", "armor", "accessories"]:
            if items_data.has(category) and items_data[category].has(item_id):
                item_data = items_data[category][item_id]
                break
        
        if item_data.is_empty(): continue
        
        # Check class restriction
        if item_data.has("class_restriction"):
            var restrictions = item_data["class_restriction"]
            if restrictions is Array and not restrictions.has(class_type):
                continue
        
        # Apply visual
        var layer = layer_nodes.get(slot)
        if layer and item_data.has("texture"):
            layer.texture = load(item_data["texture"])
            
            # Apply modulate if specified
            if item_data.has("modulate"):
                var hex_color = item_data["modulate"]
                layer.modulate = Color(hex_color)
            else:
                # Fallback to rarity-based modulate
                layer.modulate = _get_rarity_modulate(item_data.get("rarity", "common"))
            
            # Apply glow shader parameter if specified
            if item_data.has("glow_shader_param") and layer.material:
                layer.material.set_shader_parameter("glow_intensity", item_data["glow_shader_param"])

func setup_animations() -> void:
    var tween = create_tween().set_loops()
    tween.tween_property(self, "position:y", position.y - 5, 1.0).as_relative().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
    # Extend with walk/attack/jump squash & stretch as needed
```

## 4️⃣ Animation Specifications

| Animation | Duration | Frames | Key Motion |
|-----------|----------|--------|------------|
| Idle      | 2.0s loop | 4      | ±5px vertical bob |
| Walk      | 0.8s loop | 8      | ±10px bob + leg cycle |
| Attack    | 0.4s     | 6      | 20px forward dash + squash/stretch |
| Jump      | 0.6s     | 4      | Scale 0.8 → 1.2 |
| Death     | 1.0s     | 5      | Fade out + particle burst |

## 5️⃣ File Naming Conventions

| Type | Naming Convention | Path |
|------|-------------------|------|
| Body | `humanoid_[class].png` | `res://assets/sprites/` |
| Equipment | `[class][slot][rarity].png` | `res://assets/sprites/equipment/` |
| Particles | `effect_[name].tscn` | `res://assets/particles/` |
| Scripts | `PascalCase.gd` | `res://scripts/` |
| Data | `items.json` | `res://data/` |
| Scenes | `HeroScene.tscn` | `res://scenes/` |

## 6️⃣ QA & Automation Checklist

- [ ] Style: Palette deviation <5%
- [ ] Layers: Pivot offset <1px
- [ ] Animations: Seamless loop, no jitter
- [ ] Clipping: Zero overlap errors
- [ ] Performance: 60 FPS with 100 heroes
- [ ] Polish: Hit flash, particles, glow present

**Tip**: Build an EditorTool script to auto-generate combo previews and flag issues.

## 7️⃣ Visual Flow Diagram

```
Base Body → JSON Equipment Load → Layer Stack (Z-Order) → Rarity Tint + Shader
          → Procedural Tween Animations → VFX/Particles → Render (Nearest Filter)
          → Automated QA Validation
```

## 8️⃣ Studio Best Practices

- Never bake equipment — always modular.
- Use Git LFS for PNGs.
- Standardize animation templates across classes.
- Maintain `DRAGUMAGU_STYLE_REFERENCE.md` as single source of truth.
- Preview every new item on all classes before commit.

## 9️⃣ Key Files Reference

- `road-to-war/scripts/HeroSprite.gd`: The core visual controller.
- `road-to-war/scenes/HeroSprite.tscn`: The visual node structure.
- `road-to-war/scripts/Hero.gd`: The data resource driving the sprite.
- `road-to-war/scripts/EquipmentManager.gd`: Handles the logic of what is equipped.
- `road-to-war/scripts/SpriteTransparency.gdshader`: Handles per-pixel transparency.
- `road-to-war/data/items.json`: Equipment definitions with texture/modulate/glow fields.
- `res://assets/sprites/`: Storage for all PNG pixel art assets.
- `docs/DRAGUMAGU_STYLE_REFERENCE.md`: Deep dive into the art style rules.

---

**This v3.0 SOP is now the definitive, copy-paste-ready master document for your "Road of War" hero pipeline. Fully scalable, automated, and visually referenced for instant team onboarding. 🚀**

# AssetVisual System

The AssetVisual system is a generalized, data-driven architecture for handling all visual game assets (Characters, Icons, VFX, etc.). It is specifically optimized for AI-generated assets which often have inconsistent scales and borders.

## Core Components

- **AssetProfile**: A Resource defining how an asset type should look and behave (e.g., `character_humanoid`, `spell_icon`).
- **AssetNormalizer**: A static utility that fixes textures at runtime (auto-scaling, centering).
- **AssetVisual**: The base Node2D scene/script. Assign a `texture` and a `profile` to see it in action.
- **AssetVisual.gdshader**: A unified shader for outlines, hits, and cooldowns.

## How to use

1.  **Instantiate `AssetVisual.tscn`** or a specialized version (like `VisualCharacter`).
2.  **Assign an AssetProfile** (found in `res://resources/visuals/`).
3.  **Assign a Texture** (your raw PNG).
4.  (Optional) **Assign Metadata** via a JSON file or Dictionary.

## Benefits for AI Assets

- **Normalizes scale**: No more giant or tiny sprites.
- **Enforces consistency**: Outlines and shaders are applied via code, not baked into art.
- **Procedural Motion**: Replaces the need for complex sprite-sheet animations with smooth, tween-based effects.
- **Hot-reload**: Update metadata or textures and see changes immediately.

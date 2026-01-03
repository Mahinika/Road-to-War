# Reference Images

Place your reference pixel-art sprite images in this folder for analysis.

## Usage

### Single Image Analysis
```bash
node tools/analyze-reference.js --input ./reference-images/your-sprite.png --output ./style-configs/your-style.json
```

### Multiple Images (Combined)
```bash
node tools/analyze-reference.js --input ./reference-images/ --output ./style-configs/combined-style.json --combine
```

### Analyze and Generate in One Step
```bash
node tools/generate-assets.js --analyze ./reference-images/your-sprite.png
```

## Supported Formats
- PNG (recommended for pixel art)
- JPG/JPEG
- GIF
- BMP

## Tips
- Use 64x64 or similar sized sprites for best results
- Images should have transparent backgrounds (PNG with alpha)
- Place multiple reference images in this folder to combine their styles


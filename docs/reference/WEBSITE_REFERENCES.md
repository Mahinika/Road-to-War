# Website References Database

This file serves as a centralized database for storing and referencing useful websites for the "Road of War" project development.

## Format
Each entry should follow this structure:

```json
{
  "id": "unique_identifier",
  "name": "Website Name",
  "url": "https://example.com",
  "category": "art|tools|documentation|inspiration|assets",
  "description": "Brief description of what this website provides",
  "relevance": "Why this is useful for Road of War development",
  "date_added": "YYYY-MM-DD",
  "tags": ["tag1", "tag2"]
}
```

## Entries

### Art & Pixel Art Resources
- **OpenGameArt**: `https://opengameart.org/` - Free game assets including pixel art sprites
- **Itch.io Asset Packs**: `https://itch.io/game-assets` - Indie game asset marketplace with pixel art
- **Pixel Joint**: `https://pixeljoint.com/` - Pixel art community and resources
- **Dragumagu Portfolio**: `https://dragumagu.itch.io/` - Professional pixel art portfolio (WoW-inspired style reference)

### Game Development Tools
- **Godot Documentation**: `https://docs.godotengine.org/` - Official Godot 4.x documentation
- **Godot Asset Library**: `https://godotengine.org/asset-library/` - Official asset library for Godot
- **Aseprite**: `https://www.aseprite.org/` - Professional pixel art editor (paid software)
- **Free Pixel Art Tools**: `https://www.piskelapp.com/` - Free online pixel art editor

### Inspiration & Research
- **World of Warcraft Classic**: `https://worldofwarcraft.blizzard.com/` - Original WoW reference for UI and systems
- **Game UI Database**: `https://www.gameuidatabase.com/` - Collection of game UI designs
- **Pixel Art Styles**: `https://lospec.com/palette-list` - Pixel art palette collections

### Technical Resources
- **Godot Shaders**: `https://godotshaders.com/` - Community shader library
- **GDQuest**: `https://www.gdquest.com/` - Godot tutorials and learning resources
- **Godot Subreddit**: `https://reddit.com/r/godot` - Community forum

## Usage

### Adding a New Reference
1. Add a new entry to this file following the format above
2. Include relevant tags for easy searching
3. Add a brief description and why it's relevant to the project

### Searching References
Use grep to find relevant websites:
```bash
grep -i "pixel" docs/reference/WEBSITE_REFERENCES.md
grep -i "godot" docs/reference/WEBSITE_REFERENCES.md
```

### Categories
- **art**: Art style references, pixel art tutorials
- **tools**: Development tools, software, editors
- **documentation**: Official docs, tutorials, guides
- **inspiration**: Game design inspiration, UI references
- **assets**: Asset marketplaces, free resources
- **community**: Forums, communities, social platforms

## Maintenance
- Review and update links annually
- Remove broken links
- Add new useful resources as discovered
- Consider converting to JSON format if database grows significantly


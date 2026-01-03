# World of Warcraft: Wrath of the Lich King UI Research

**Research Date**: December 30, 2025  
**Purpose**: Comprehensive reference document for implementing WoW WotLK-style UI in Road of War  
**Status**: Complete Research Document

---

## Table of Contents

1. [Visual Aesthetics](#visual-aesthetics)
2. [Color Palette](#color-palette)
3. [UI Components](#ui-components)
4. [Layout & Positioning](#layout--positioning)
5. [Typography](#typography)
6. [Design Principles](#design-principles)
7. [Technical Specifications](#technical-specifications)
8. [Addon Insights](#addon-insights)
9. [Implementation Guidelines](#implementation-guidelines)
10. [References](#references)

---

## Visual Aesthetics

### Overall Theme
The WotLK UI embraces a **darker, more somber visual theme** that aligns with the expansion's narrative centered around the Lich King and the icy continent of Northrend. The design philosophy balances functionality with immersive fantasy aesthetics.

### Key Visual Characteristics
- **Dark, Icy Tones**: Predominantly dark surfaces with shades of blue, gray, and black
- **Metallic Accents**: Gold and bronze borders evoking ancient grandeur and foreboding
- **Gothic Motifs**: Ornate, metallic borders reminiscent of ancient armor and weaponry
- **Frost Textures**: Incorporation of icy textures reinforcing the cold atmosphere
- **Skeletal Designs**: Death-themed elements in borders and backgrounds

### Texture Style
- **Ornate Borders**: Intricate, metallic borders with detailed patterns
- **Subtle Gradients**: Semi-transparent backgrounds with gradient overlays
- **Textured Surfaces**: UI elements feature depth through texture simulation
- **Consistent Art Style**: Uniform visual language across all components

---

## Color Palette

### Primary Colors

#### Dark Surfaces
- **HUD Background**: `#0a0a0a` (Very dark, almost black)
- **Panel Background**: `#0a0a0a` to `#1a1a2e` (Dark panel variants)
- **Frame Background**: `#1a1f2e` (Unit frame background)
- **Overlay Background**: `#0a0a0a` (Modal overlays)

#### Accent Colors
- **Gold Border**: `#c9aa71` (Primary metallic accent)
- **Bronze Border**: `#8b6914` (Secondary metallic accent)
- **Icy Blue**: Various shades of blue-gray for thematic elements
- **Metallic Silver**: `#c0c0c0` (Metal accents)

### Text Colors
- **Primary Text**: `#ffffff` (White)
- **Secondary Text**: `#cccccc` (Light gray)
- **Muted Text**: `#999999` (Medium gray)
- **Warning Text**: `#ffd700` (Gold)
- **System Messages**: `#ffff00` (Yellow)
- **Combat Text**: `#ffffff` (White)
- **Loot Messages**: `#00ff00` (Green)
- **Error Messages**: `#ff0000` (Red)

### Class-Specific Colors
- **Paladin**: Silver plate (`#E0E0E0`), Royal blue (`#4169E1`), Gold accents (`#FFD700`)
- **Warrior**: Brown plate (`#8B7355`), Dark red (`#8B0000`), Steel (`#C0C0C0`)
- **Mage**: Arcane blue (`#4169E1`), Gold trim (`#FFD700`), Arcane cyan (`#00FFFF`)
- **Rogue**: Dark leather (`#2F2F2F`), Gold daggers (`#FFD700`), Purple shadow (`#4B0082`)
- **Hunter**: Brown leather (`#8B4513`), Forest green (`#228B22`), Silver (`#C0C0C0`)
- **Warlock**: Dark purple (`#4B0082`), Fel green (`#00FF00`)
- **Priest**: White (`#FFFFFF`), Gold (`#FFD700`)
- **Shaman**: Blue (`#0070DE`), Silver (`#C0C0C0`)
- **Druid**: Orange (`#FF7D0A`), Brown (`#8B4513`)

### Particle Effect Colors
- **Holy**: Yellow (`#FFFF00`), intensity 0.8
- **Arcane**: Cyan (`#00FFFF`), intensity 0.6
- **Fel**: Purple (`#FF00FF`), intensity 1.0
- **Frost**: Teal (`#00CED1`), intensity 0.7
- **Fire**: Orange-red (`#FF4500`), intensity 0.9

---

## UI Components

### 1. Unit Frames

#### Player Frame
- **Location**: Bottom-left corner
- **Design**: Rectangular with rounded edges
- **Elements**:
  - Health bar (top)
  - Resource bar (mana/energy/rage) below health
  - Portrait (optional, left side)
  - Buff/debuff indicators
  - Class-colored border
- **Size**: Approximately 200-250px wide, 80-100px tall
- **Border**: Class-colored, 2-3px thick
- **Background**: Dark semi-transparent (`#0a0a0a` with ~80% opacity)

#### Target Frame
- **Location**: Top-center or top-left (above player frame)
- **Design**: Similar to player frame, mirrored layout
- **Elements**:
  - Target name and level
  - Health bar
  - Resource bar (if applicable)
  - Cast bar (when casting)
  - Buff/debuff indicators
- **Border**: Red for enemy, yellow for neutral, green for friendly

#### Party Frames
- **Location**: Left side, vertical stack
- **Design**: Compact, vertical layout
- **Elements per frame**:
  - Health bar
  - Resource bar
  - Class-colored border
  - Role indicator (tank/healer/DPS icon)
  - Buff/debuff indicators (small icons)
- **Size**: Approximately 160px wide, 40-50px tall per frame
- **Spacing**: 2-5px between frames
- **Layout**: Vertical stack, top to bottom

#### Raid Frames (if applicable)
- **Layout**: Grid-based, compact
- **Size**: Smaller than party frames
- **Grouping**: 5 frames per row, multiple rows

### 2. Action Bars

#### Standard Action Bar
- **Location**: Bottom center of screen
- **Layout**: Horizontal row of buttons
- **Button Count**: 12 buttons per bar (standard)
- **Button Size**: Approximately 36-40px × 36-40px
- **Spacing**: 1-2px between buttons
- **Background**: Semi-transparent dark (`#0a0a0a` with ~70% opacity)
- **Border**: Subtle gold/bronze accent

#### Action Bar Buttons
- **Design**: Square with rounded corners
- **Icon**: 32×32px ability/item icon
- **Cooldown Overlay**: Dark overlay with timer text
- **Keybind Indicator**: Small text in corner (bottom-left or bottom-right)
- **Usable State**: Full opacity
- **Unusable State**: 50% opacity, grayed out
- **Hover State**: Slight brightness increase, border highlight

#### Multiple Action Bars
- **Layout**: 2 rows × 6 buttons = 12 slots (common configuration)
- **Positioning**: Stacked vertically or side-by-side
- **Customization**: Players can adjust number, size, and position

### 3. Minimap

#### Design
- **Shape**: Circular
- **Location**: Top-right corner
- **Size**: Approximately 120-150px diameter
- **Border**: Ornate metallic frame
- **Background**: Dark semi-transparent

#### Elements
- **Map View**: Top-down view of surrounding area
- **Player Indicator**: Arrow or dot showing player position
- **Quest Objectives**: Icons for quest markers
- **Points of Interest**: Icons for NPCs, vendors, etc.
- **Zoom Controls**: Buttons for zoom in/out
- **Clock**: Optional time display
- **Coordinates**: Optional coordinate display

### 4. Chat Window

#### Design
- **Location**: Bottom-left corner
- **Size**: Variable width (typically 400-500px), height (200-300px)
- **Background**: Dark semi-transparent (`#0a0a0a` with ~80% opacity)
- **Border**: Subtle border, often matches overall theme

#### Elements
- **Message Area**: Scrollable text area
- **Scrollbar**: Custom-styled scrollbar on right side
- **Channel Tabs**: Tabs for different chat channels (General, Trade, Guild, etc.)
- **Input Box**: Text input at bottom
- **Message Colors**:
  - System: Yellow (`#ffff00`)
  - General: White (`#ffffff`)
  - Trade: Yellow (`#ffff00`)
  - Guild: Light green (`#40ff40`)
  - Party: Light blue (`#aaaaee`)
  - Whisper: Pink (`#ff69b4`)
  - Emote: Orange (`#ff7f00`)

### 5. Health & Resource Bars

#### Health Bar
- **Design**: Horizontal bar with gradient
- **Colors**:
  - Full Health: Green gradient (`#00ff00` to `#00cc00`)
  - Medium Health: Yellow gradient (`#ffff00` to `#ffcc00`)
  - Low Health: Red gradient (`#ff0000` to `#cc0000`)
- **Texture**: Subtle texture overlay for depth
- **Border**: Class-colored or gold accent
- **Text**: Health value overlay (current/max)

#### Resource Bars (Mana/Energy/Rage)
- **Mana**: Blue gradient (`#0066ff` to `#0044cc`)
- **Energy**: Yellow gradient (`#ffff00` to `#ffcc00`)
- **Rage**: Red gradient (`#ff0000` to `#cc0000`)
- **Runic Power**: Purple gradient (Death Knight specific)
- **Design**: Similar to health bar, positioned below health

### 6. Tooltips

#### Design
- **Background**: Dark (`#0a0a0a` to `#1a1a2e`) with high opacity (~95%)
- **Border**: Gold/bronze border (`#c9aa71`, 2px)
- **Padding**: 8-12px internal padding
- **Text**: White primary text, colored accents for stats

#### Item Tooltip Structure
- **Item Name**: Large, colored by quality (white/green/blue/purple/orange)
- **Item Level**: Small text below name
- **Item Type**: Subtitle (e.g., "Sword", "Plate Armor")
- **Stats**: List of stat bonuses
- **Set Bonuses**: Special section if part of a set
- **Description**: Flavor text in italics
- **Durability**: Bottom section (if applicable)

#### Ability Tooltip Structure
- **Ability Name**: Large, class-colored
- **Resource Cost**: Mana/energy cost
- **Cooldown**: Cooldown duration
- **Range**: Cast range (if applicable)
- **Description**: Ability effect description
- **Rank**: Ability rank (if applicable)

### 7. Quest Tracker

#### Design
- **Location**: Right side of screen
- **Layout**: Vertical list of active quests
- **Background**: Semi-transparent dark
- **Size**: Variable width (200-300px), auto-height

#### Quest Entry
- **Quest Name**: Bold, colored by quest type
- **Objectives**: Bullet points with checkmarks
- **Progress**: "X/Y" format for kill/collect quests
- **Distance**: Distance to quest area (optional)

### 8. Inventory/Bags

#### Bag Interface
- **Layout**: Grid of item slots
- **Slot Size**: 36-40px × 36-40px
- **Background**: Dark panel with gold border
- **Item Rarity Colors**:
  - Poor: Gray
  - Common: White
  - Uncommon: Green
  - Rare: Blue
  - Epic: Purple
  - Legendary: Orange

#### Item Slots
- **Empty Slot**: Dark gray background with subtle border
- **Filled Slot**: Item icon with rarity-colored border
- **Hover**: Highlight border, tooltip appears
- **Drag & Drop**: Visual feedback during drag

### 9. Talent Tree Interface

#### Design
- **Layout**: Three-column tree structure
- **Background**: Dark (`#000000` to `#0a0a0a`)
- **Border**: Blue accent (`#0066ff`) for talent panel
- **Node Design**: Square or circular nodes
- **Connections**: Lines connecting prerequisite talents

#### Talent Node
- **Available**: Full opacity, gold border
- **Unavailable**: 50% opacity, grayed out
- **Learned**: Filled with class color
- **Hover**: Tooltip with talent details
- **Size**: 30-40px per node

### 10. Cast Bar

#### Design
- **Location**: Below target frame or center screen
- **Size**: 200-300px wide, 20-30px tall
- **Background**: Dark bar
- **Fill**: Colored fill (spell school color)
- **Text**: Spell name and cast time
- **Border**: Gold accent

#### Spell School Colors
- **Physical**: Red
- **Holy**: Yellow
- **Fire**: Orange-red
- **Frost**: Light blue
- **Nature**: Green
- **Shadow**: Purple
- **Arcane**: Cyan

---

## Layout & Positioning

### Standard Screen Layout (1920×1080 reference)

```
┌─────────────────────────────────────────────────────────┐
│ [Target Frame]                    [Minimap]            │
│                                                          │
│                                                          │
│ [Party Frames]                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                    [Game View]                          │
│                                                          │
│                                                          │
│                                                          │
│ [Chat]              [Action Bars]                      │
│                      [Player Frame]                    │
└─────────────────────────────────────────────────────────┘
```

### Component Positioning

#### Top Section
- **Target Frame**: Top-center or top-left
- **Minimap**: Top-right corner
- **Quest Tracker**: Right side (optional)

#### Left Section
- **Party Frames**: Left side, vertical stack
- **Chat Window**: Bottom-left

#### Center Section
- **Game View**: Main gameplay area
- **Action Bars**: Bottom-center
- **Cast Bar**: Center or below target frame

#### Bottom Section
- **Player Frame**: Bottom-left
- **Action Bars**: Bottom-center
- **Chat Input**: Bottom-left (within chat window)

### Responsive Considerations
- **Minimum Resolution**: 800×600 (legacy support)
- **Standard Resolution**: 1024×768 (common at release)
- **Widescreen**: 1920×1080 (modern standard)
- **Scaling**: UI elements scale proportionally
- **Aspect Ratio**: 4:3 (original), 16:9 (widescreen), 16:10 (alternative)

---

## Typography

### Font Characteristics
- **Style**: Serif fonts with medieval flair
- **Primary Font**: Friz Quadrata (WoW's signature font) or similar serif
- **Fallback**: Arial, sans-serif for system text
- **Weight**: Regular for body, Bold for headings

### Text Hierarchy

#### Headings
- **Title Large**: 72px (main menu titles)
- **Title Medium**: 52px (scene titles)
- **Title Small**: 36px (panel titles)
- **Subtitle**: 28px (section headers)

#### Body Text
- **Body Large**: 24px (important information)
- **Body Medium**: 18px (standard text)
- **Body Small**: 14px (secondary information)
- **Caption**: 12px (labels, hints)

#### Specialized Text
- **Talent Text**: 10-12px (talent tree nodes)
- **Button Text**: 16px (action buttons)
- **Tooltip Text**: 14-16px (tooltip body)

### Text Styling
- **Color**: White primary (`#ffffff`), gray secondary (`#cccccc`)
- **Shadow**: Subtle text shadow for readability on dark backgrounds
- **Outline**: Optional 1px outline for important text
- **Letter Spacing**: Normal to slightly increased for headings

### Text Formatting
- **Bold**: Important values, names, titles
- **Italics**: Flavor text, descriptions
- **Colored Text**: Stat values, quality indicators
- **Number Formatting**: Commas for large numbers (1,000,000)

---

## Design Principles

### 1. Consistency
- **Uniform Visual Language**: All UI elements share common design patterns
- **Color Harmony**: Consistent color usage across components
- **Spacing Standards**: Regular spacing intervals (4px, 8px, 16px)
- **Border Style**: Consistent border thickness and style

### 2. Clarity
- **Readability**: High contrast text on dark backgrounds
- **Information Hierarchy**: Most important information is most prominent
- **Icon Clarity**: Icons are clear and recognizable
- **Tooltip Support**: Hover tooltips for additional context

### 3. Immersion
- **Thematic Alignment**: UI reflects game's setting and lore
- **Visual Cohesion**: UI doesn't break game's visual style
- **Subtle Effects**: Animations and transitions enhance without distracting
- **Contextual Adaptation**: UI adapts to game state (combat, exploration, etc.)

### 4. Functionality
- **Quick Access**: Important information is easily accessible
- **Customization**: Players can adjust size, position, opacity
- **Efficiency**: Minimal clicks to access common functions
- **Feedback**: Clear visual feedback for all interactions

### 5. Accessibility
- **Color Blind Support**: Options for color blind players
- **Scalability**: UI scales for different screen sizes
- **Keybindings**: Customizable keybindings for all actions
- **Tooltip Clarity**: All information available via tooltips

---

## Technical Specifications

### Dimensions (Reference - may vary by resolution)

#### Unit Frames
- **Player Frame**: 200-250px × 80-100px
- **Target Frame**: 200-250px × 80-100px
- **Party Frame**: 160px × 40-50px (per frame)

#### Action Bars
- **Button Size**: 36-40px × 36-40px
- **Button Spacing**: 1-2px
- **Bar Width**: Variable (12 buttons = ~480px)

#### Minimap
- **Diameter**: 120-150px
- **Border Width**: 4-6px

#### Chat Window
- **Width**: 400-500px
- **Height**: 200-300px
- **Font Size**: 14-16px

#### Tooltips
- **Min Width**: 200px
- **Max Width**: 400px
- **Padding**: 8-12px
- **Border**: 2px

### Opacity Values
- **HUD Background**: 80-90% opacity
- **Panels**: 85-95% opacity
- **Action Bars**: 70-80% opacity
- **Chat Window**: 80-90% opacity
- **Tooltips**: 95-100% opacity

### Border Specifications
- **Standard Border**: 2-3px thick
- **Accent Border**: Gold/bronze (`#c9aa71`, `#8b6914`)
- **Class Border**: Class-specific color, 2-3px
- **Rarity Border**: Item quality color, 1-2px

### Spacing Standards
- **Element Spacing**: 4px, 8px, 16px intervals
- **Panel Padding**: 12-20px
- **Button Spacing**: 1-2px
- **Frame Spacing**: 2-5px between party frames

### Animation Timing
- **Fade In/Out**: 200-300ms
- **Hover Transitions**: 150-200ms
- **Cooldown Animations**: Real-time with countdown
- **Combat Text**: 1-2 second fade

---

## Addon Insights

### Popular WotLK UI Addons

#### ElvUI
- **Type**: Full UI replacement
- **Features**: Modern, streamlined design, extensive customization
- **Characteristics**: Clean, minimal, highly configurable
- **Use Case**: Complete UI overhaul

#### LUI v3
- **Type**: Full UI replacement
- **Features**: 200+ textures, 3000+ customization options
- **Characteristics**: Sleek, modern, modular
- **Use Case**: Comprehensive UI replacement with extensive options

#### DarkUI Wrath
- **Type**: Texture replacement
- **Features**: Darker theme, texture replacements
- **Characteristics**: Darker aesthetic, immersive
- **Use Case**: Dark theme enhancement

#### DragonUI
- **Type**: Full UI replacement
- **Features**: Enhanced unit frames, redesigned minimap, micro menu
- **Characteristics**: Modern Dragonflight aesthetics adapted for WotLK
- **Use Case**: Modern UI with WotLK compatibility

#### MelliUI
- **Type**: ElvUI-based
- **Features**: Easy-to-spot elements, clarity-focused
- **Characteristics**: Inspired by Naowh's UI, functional
- **Use Case**: Clarity and visibility enhancement

### Key Addon Features
- **Movable Frames**: All UI elements can be repositioned
- **Scalable Elements**: Size adjustments for all components
- **Opacity Controls**: Transparency adjustments
- **Texture Replacements**: Custom textures and borders
- **Layout Presets**: Pre-configured layouts for different playstyles

---

## Implementation Guidelines

### Color Implementation
```javascript
// Recommended color constants
const WOTLK_COLORS = {
  // Surfaces
  surfaceDark: 0x0a0a0a,
  surfacePanel: 0x1a1a2e,
  surfaceFrame: 0x1a1f2e,
  
  // Accents
  gold: 0xc9aa71,
  bronze: 0x8b6914,
  
  // Text
  textPrimary: 0xffffff,
  textSecondary: 0xcccccc,
  textMuted: 0x999999,
  
  // Status
  healthHigh: 0x00ff00,
  healthMedium: 0xffff00,
  healthLow: 0xff0000,
  mana: 0x0066ff,
  energy: 0xffff00,
  rage: 0xff0000
};
```

### Component Creation Pattern
1. **Background**: Dark surface with appropriate opacity
2. **Border**: Gold/bronze accent border (2-3px)
3. **Content**: White text with appropriate hierarchy
4. **Hover State**: Slight brightness increase, border highlight
5. **Active State**: Class-colored or gold accent

### Spacing System
- Use consistent spacing intervals: 4px, 8px, 16px, 32px
- Panel padding: 12-20px
- Element spacing: 4-8px between related elements
- Section spacing: 16-32px between major sections

### Typography System
- Establish clear text hierarchy
- Use serif fonts for headings, sans-serif for body (or consistent serif throughout)
- Ensure sufficient contrast (WCAG AA minimum)
- Add subtle text shadows for readability

### Animation Guidelines
- **Fade Transitions**: 200-300ms for show/hide
- **Hover Effects**: 150-200ms for smooth transitions
- **Cooldown Animations**: Real-time with visual countdown
- **Combat Feedback**: Immediate, clear, non-intrusive

### Responsive Design
- **Minimum Support**: 800×600 resolution
- **Standard Support**: 1024×768 and above
- **Scaling**: Proportional scaling for all UI elements
- **Layout Adaptation**: Adjust positioning for different aspect ratios

---

## References

### Official Sources
- Blizzard Entertainment - World of Warcraft: Wrath of the Lich King (2008)
- Blizzard Developer Updates - UI Evolution Documentation

### Community Resources
- **ElvUI WotLK**: GitHub repository for ElvUI WotLK version
- **LUI v3**: Addon documentation and screenshots
- **DarkUI Wrath**: CurseForge addon page
- **DragonUI**: Warperia addon documentation
- **MelliUI**: Warperia addon documentation

### Design Inspiration
- Official WoW WotLK screenshots and promotional materials
- Community UI showcases and guides
- Addon documentation and screenshots
- Historical UI evolution articles

### Technical References
- WoW UI API documentation (for addon development insights)
- Phaser 3 documentation (for implementation)
- Web color standards and accessibility guidelines

---

## Notes for Implementation

### Priority Elements
1. **Unit Frames** (Player, Target, Party) - Core gameplay information
2. **Action Bars** - Primary interaction method
3. **Health/Resource Bars** - Critical combat information
4. **Tooltips** - Essential for item/ability information
5. **Chat Window** - Communication and feedback

### Secondary Elements
1. **Minimap** - Navigation aid
2. **Quest Tracker** - Progression tracking
3. **Inventory/Bags** - Item management
4. **Talent Tree** - Character progression
5. **Cast Bar** - Combat feedback

### Enhancement Opportunities
1. **Custom Textures**: Create custom textures matching WotLK aesthetic
2. **Animation Polish**: Smooth transitions and hover effects
3. **Sound Effects**: UI interaction sounds (optional)
4. **Customization Options**: Allow player adjustment of size, position, opacity
5. **Accessibility Features**: Color blind support, scalable text

---

**Document Status**: Complete  
**Last Updated**: December 30, 2025  
**Maintained By**: Lead Designer  
**Next Review**: As needed for implementation reference








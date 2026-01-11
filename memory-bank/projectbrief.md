# Project Brief: Incremental Prestige RPG

## Project Overview
Building an incremental prestige RPG with automatic progression and equipment-based advancement. Currently transitioning from a single-hero system to a 5-man dungeon group system with WoW TBC/WotLK-inspired classes, specializations, talents, and comprehensive stat systems.

## AI Operating Protocol
This project uses the **MASTER PROMPT — IDLE RPG AUTO-ROUTER (MAX / CURSOR / ENHANCED)** (see `.cursorrules` section "Road of War: Role-Based Development Prompts") for ALL AI interactions. This is MANDATORY for every response. Every session must initialize by reading this protocol and adopting the Lead Producer/Auto-Router persona. The FIRST line of every response MUST be: "Active Role(s):"

## Core Requirements
- 2D side-scrolling RPG with automatic party movement
- Procedurally generated world segments ("Road to War" - 100 miles of progression)
- Automatic combat system with role-based AI (tank, healer, 3x DPS)
- Equipment-based progression with comprehensive WoW TBC/WotLK stat system
- Loot drops from enemies
- Shop, quest, and treasure encounters
- 5-man party management (1 tank, 1 healer, 3 DPS)
- Class and specialization system
- Talent tree system (TBC/WotLK style)
- Multi-hero progression and leveling

## Technical Stack
- Engine: Godot 4.x
- Language: GDScript
- Module system: Godot Nodes & Singletons (Autoloads)
- Single-player only

## Platform Strategy
- Primary: PC Desktop (Native Godot executable)
- Secondary: HTML5 export for browser play (optional)
- Desktop-focused architecture optimized for PC gaming experience
- Desktop: Standalone executable generated via Godot Export (no runtime required)
- Browser: HTML5 export available (secondary priority)
- **Technology**: Pure Godot 4.x game with GDScript - no web/Electron dependencies

## Key Constraints
- Asset-agnostic, data-driven design
- Clean separation of concerns
- No hard-coded gameplay values
- Performance-aware for desktop optimization
- Code must be beginner-friendly and well-documented
- **File Creation Policy**: Avoid creating new files unless absolutely necessary - The AI director decides if a new file is necessary. Always prefer editing existing files over creating new ones.

## Development Phases
1. Environment & Foundation ✅
2. Main Menu ✅
3. World & Map ✅
4. Combat (Simple) ✅
5. Loot & Equipment ✅
6. Visual Polish ✅
7. Desktop EXE ✅
8. 5-Man Team System ✅
9. Codebase Cleanup ✅

## Success Criteria
- Clean, scalable architecture ✅
- Beginner-friendly codebase ✅
- Platform-flexible design ✅
- Data-driven systems ✅
- **Codebase Optimization**: CursorPlay/Puppeteer tools removed, documentation cleaned ✅

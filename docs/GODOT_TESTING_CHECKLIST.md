# Godot Testing Checklist

Comprehensive testing checklist for verifying the Godot 4.x migration of Road of War.

## Pre-Testing Setup

- [ ] Open `road-to-war/project.godot` in Godot Editor 4.x
- [ ] Verify Godot Editor version is 4.5 or later
- [ ] Check Output panel is visible (View → Output)
- [ ] Verify no red error messages in Output panel on project load

## Scene Flow Testing

### 1. Preload Scene
- [ ] Press F5 to run the project
- [ ] Verify Preload scene loads (loading screen appears)
- [ ] Verify progress bar updates from 0% to 100%
- [ ] Verify loading text displays correctly
- [ ] Verify scene transitions to MainMenu after loading completes
- [ ] Check Output panel for any errors during loading

### 2. Main Menu Scene
- [ ] Verify MainMenu scene loads after Preload
- [ ] Verify background image displays (if available)
- [ ] Test "Start Game" button → should go to CharacterCreation
- [ ] Test "Options" button → should go to Options scene
- [ ] Test "Credits" button → should go to Credits scene
- [ ] Test "Save Game" button → should open SaveLoad scene in save mode
- [ ] Test "Load Game" button → should open SaveLoad scene in load mode
- [ ] Test "Statistics" button → should go to Statistics scene
- [ ] Test "Achievements" button → should go to Achievements scene
- [ ] Test "Prestige" button → should go to Prestige scene
- [ ] Test "Quit" button → should exit the game
- [ ] Verify all scene transitions have fade effects (0.3s duration)

### 3. Character Creation Scene
- [ ] Navigate to CharacterCreation from MainMenu
- [ ] Verify party creation UI displays correctly
- [ ] Verify role selection works (Tank, Healer, DPS)
- [ ] Verify class selection works for each role
- [ ] Verify specialization selection works
- [ ] Test "Auto-Generate Party" button (if available)
- [ ] Test "Confirm Party" button → should go to World scene
- [ ] Test "Back" button → should return to MainMenu

### 4. World Scene (Main Gameplay)
- [ ] Verify World scene loads after party creation
- [ ] Verify party spawns correctly (5 heroes)
- [ ] Verify HUD displays correctly
- [ ] Verify party movement works
- [ ] Verify camera follows party
- [ ] Verify combat triggers when enemies appear
- [ ] Verify loot drops appear
- [ ] Verify party can pick up items
- [ ] Check Output panel for any errors during gameplay

### 5. Talent Allocation Scene
- [ ] Access Talent Allocation from World scene (if available)
- [ ] Verify talent tree displays correctly
- [ ] Verify talent point allocation works
- [ ] Verify prerequisite checking works
- [ ] Verify talent tooltips display correctly
- [ ] Test "Back" button → should return to previous scene

### 6. Menu Scenes
- [ ] **Options Scene**: Verify all options display, test back button
- [ ] **Credits Scene**: Verify credits display, test back button
- [ ] **Statistics Scene**: Verify statistics display, test back button
- [ ] **Achievements Scene**: Verify achievements display, test back button
- [ ] **Prestige Scene**: Verify prestige options display, test back button
- [ ] **SaveLoad Scene**: 
  - Verify save slots display
  - Test saving a game
  - Test loading a saved game
  - Test deleting a save slot
  - Verify transitions work correctly

## Manager System Testing

### Autoload Verification
Check Output panel for initialization messages from each manager:

- [ ] Logger - Should log initialization message
- [ ] DataManager - Should load all JSON files
- [ ] SceneManager - Should initialize scene management
- [ ] GameManager - Should initialize game state
- [ ] PartyManager - Should initialize party system
- [ ] WorldManager - Should initialize world system
- [ ] StatCalculator - Should initialize stat calculations
- [ ] AbilityManager - Should initialize abilities
- [ ] EquipmentManager - Should initialize equipment system
- [ ] TalentManager - Should initialize talent system
- [ ] CombatManager - Should initialize combat system
- [ ] CombatAI - Should initialize AI system
- [ ] CombatActions - Should initialize combat actions
- [ ] StatusEffectsManager - Should initialize status effects
- [ ] BloodlineManager - Should initialize bloodlines
- [ ] StatisticsManager - Should initialize statistics
- [ ] AchievementManager - Should initialize achievements
- [ ] AnimationManager - Should initialize animations
- [ ] AudioManager - Should initialize audio
- [ ] ParticleManager - Should initialize particles
- [ ] CameraManager - Should initialize camera
- [ ] UITheme - Should initialize UI theme
- [ ] LootManager - Should initialize loot system
- [ ] ShopManager - Should initialize shop system
- [ ] PrestigeManager - Should initialize prestige system
- [ ] ResourceManager - Should initialize resources
- [ ] MovementManager - Should initialize movement
- [ ] SaveManager - Should initialize save system
- [ ] DamageCalculator - Should initialize damage calculations

### Data Loading Verification
- [ ] Verify DataManager loads all JSON files without errors
- [ ] Check Output panel for "Data loaded" messages
- [ ] Verify no "Data file not found" errors
- [ ] Verify no JSON parse errors

### Logger System
- [ ] Verify log messages appear in Output panel
- [ ] Verify log levels work (info, warn, error, debug)
- [ ] Verify log source names appear correctly

### SceneManager
- [ ] Verify scene transitions work smoothly
- [ ] Verify fade effects work (fade out → change scene → fade in)
- [ ] Verify scene history tracking works (if go_back() is used)

## Gameplay Testing

### Party System
- [ ] Verify party creation creates 5 heroes
- [ ] Verify party roles are correct (1 tank, 1 healer, 3 DPS)
- [ ] Verify each hero has correct class and specialization
- [ ] Verify party displays correctly in World scene
- [ ] Verify party movement works as a group

### Combat System
- [ ] Verify combat triggers when enemies appear
- [ ] Verify all 5 party members participate in combat
- [ ] Verify threat/aggro system works
- [ ] Verify damage calculations work correctly
- [ ] Verify abilities can be used
- [ ] Verify status effects apply correctly
- [ ] Verify combat ends when enemies are defeated
- [ ] Verify combat ends when party is defeated

### Equipment System
- [ ] Verify equipment can be equipped on heroes
- [ ] Verify equipment stats apply correctly
- [ ] Verify equipment displays in UI
- [ ] Verify equipment can be unequipped
- [ ] Verify multiple heroes can have different equipment

### Talent System
- [ ] Verify talent points can be allocated
- [ ] Verify prerequisites are enforced
- [ ] Verify talent bonuses apply to stats
- [ ] Verify talent trees display correctly
- [ ] Verify talent tooltips show correct information

### Save/Load System
- [ ] Verify saving creates a save file
- [ ] Verify save file contains all game data
- [ ] Verify loading restores game state correctly
- [ ] Verify party data is saved/loaded
- [ ] Verify equipment data is saved/loaded
- [ ] Verify talent data is saved/loaded
- [ ] Verify world progress is saved/loaded
- [ ] Verify statistics are saved/loaded
- [ ] Verify achievements are saved/loaded

### World System
- [ ] Verify world generates correctly
- [ ] Verify mile progression works
- [ ] Verify enemies spawn at correct intervals
- [ ] Verify encounters appear correctly
- [ ] Verify loot drops work
- [ ] Verify shop encounters work

## Performance Testing

### Frame Rate
- [ ] Verify game runs at stable 60 FPS (or acceptable frame rate)
- [ ] Check for frame drops during combat
- [ ] Check for frame drops with many particles
- [ ] Check for frame drops with full party

### Memory
- [ ] Monitor memory usage in Godot Editor
- [ ] Verify no memory leaks during extended play
- [ ] Verify memory cleanup works correctly

### Loading Times
- [ ] Verify Preload scene loads in reasonable time (< 5 seconds)
- [ ] Verify scene transitions are smooth
- [ ] Verify no long freezes during gameplay

## Error Checking

### Output Panel
- [ ] Check for red error messages
- [ ] Check for yellow warning messages
- [ ] Verify no critical errors during gameplay
- [ ] Note any warnings for later review

### Common Issues to Watch For
- [ ] Missing resource errors (textures, sounds, etc.)
- [ ] Null reference errors
- [ ] Type mismatch errors
- [ ] Scene path errors
- [ ] Autoload initialization errors
- [ ] JSON parse errors
- [ ] File not found errors

## Regression Testing

### Previous Features
- [ ] Verify all features from Phaser version work in Godot
- [ ] Verify no features were lost in migration
- [ ] Verify gameplay feels the same as Phaser version

## Test Results

After completing all tests, document:

- **Date**: ___________
- **Godot Version**: ___________
- **Test Duration**: ___________
- **Issues Found**: ___________
- **Critical Errors**: ___________
- **Warnings**: ___________
- **Overall Status**: [ ] Pass [ ] Fail [ ] Needs Work

## Notes

Use this section to document any issues, observations, or improvements needed:

_________________________________________________
_________________________________________________
_________________________________________________


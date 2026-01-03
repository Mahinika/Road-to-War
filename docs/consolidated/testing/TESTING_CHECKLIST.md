# Testing Checklist - Road of War

## Main Menu Buttons Testing

### ✅ 1. Options (Already Tested)
- [x] Menu loads without errors
- [x] Audio sliders work (Master, SFX, Music)
- [x] Gameplay toggles work (Auto-speed, Damage numbers)
- [x] Video toggles work (Fullscreen, Particle effects)
- [x] Back button returns to main menu

### 🔄 2. Start Game
**Test Steps:**
1. Click "Start Game" button
2. Verify hero appears (green rectangle)
3. Check console for errors
4. Verify world background displays
5. Check if hero moves automatically
6. Test combat encounters
7. Test loot pickup
8. Test equipment UI (press E)
9. Test inventory UI (press I)
10. Test shop (press S or click Shop button)

**Expected:**
- Hero visible at starting position
- No console errors
- World scrolls/hero moves
- Combat triggers on enemy contact
- Loot drops after combat
- UI panels open/close correctly

### ⏳ 3. Credits
**Code Review Status**: ✅ Structure verified, ⚠️ Particle tint needs runtime verification
**Test Steps:**
1. Click "Credits" button
2. Verify scene loads
3. Check for particle effects (verify tint array works correctly)
4. Verify all text displays correctly (Development, Special Thanks, Technologies sections)
5. Test back button
6. Verify animations (title glow, subtitle fade-in)

**Expected:**
- Credits scene displays
- No console errors
- Particles animate correctly (may need to verify tint array implementation)
- All three sections display correctly
- Animations work smoothly
- Back button returns to main menu

### ⏳ 4. Save Game
**Test Steps:**
1. Start a game first (or have game state)
2. Click "Save Game" button
3. Verify save slots display
4. Select a slot
5. Click save
6. Verify save confirmation
7. Check if save data persists (refresh page)

**Expected:**
- Save slots visible
- Can select slot
- Save operation completes
- Data persists after refresh

### ⏳ 5. Load Game
**Test Steps:**
1. Click "Load Game" button
2. Verify save slots display with data
3. Select a slot with saved data
4. Click load
5. Verify game loads correctly
6. Check if hero stats/equipment load

**Expected:**
- Save slots show saved data
- Can load existing saves
- Game state restores correctly

### ⏳ 6. Statistics
**Test Steps:**
1. Click "Statistics" button
2. Verify statistics display
3. Check all categories (Combat, Progression, Collection, Time, World)
4. Verify numbers are accurate
5. Test back button

**Expected:**
- Statistics menu displays
- All categories show data
- No console errors
- Back button works

### ⏳ 7. Achievements
**Test Steps:**
1. Click "Achievements" button
2. Verify achievement list displays
3. Check progress bars for incomplete achievements
4. Verify completed achievements show as complete
5. Test back button

**Expected:**
- Achievement list displays
- Progress tracked correctly
- Completed achievements marked
- No console errors

### ⏳ 8. Prestige
**Test Steps:**
1. Click "Prestige" button
2. Verify prestige menu loads
3. Check prestige level and points display
4. Verify upgrade list displays
5. Test upgrade purchase (if points available)
6. Test reset functionality (if applicable)
7. Test back button

**Expected:**
- Prestige menu displays
- Upgrade list visible
- No console errors
- Back button works

## GameScene Testing

### Core Gameplay
- [ ] Hero spawns correctly
- [ ] Hero moves automatically
- [ ] World segments generate
- [ ] Enemies spawn and are visible
- [ ] Combat triggers on contact
- [ ] Combat resolves correctly
- [ ] Loot drops after combat
- [ ] Can pick up items
- [ ] Equipment system works
- [ ] Shop encounters work
- [ ] Gold system works
- [ ] Level up system works
- [ ] Experience tracking works

### UI Elements
- [ ] Health bar displays
- [ ] Mana bar displays
- [ ] Stats display correctly
- [ ] Equipment panel (E key)
- [ ] Inventory panel (I key)
- [ ] Shop panel (S key)
- [ ] Tooltips appear on hover
- [ ] Keyboard shortcuts work

### Audio
- [ ] Background music plays
- [ ] Sound effects play (combat, loot, etc.)
- [ ] Volume sliders affect audio
- [ ] Music stops when leaving scene

### Save/Load Integration
- [ ] Auto-save works
- [ ] Manual save works from game
- [ ] Load restores game state
- [ ] Statistics persist
- [ ] Achievements persist
- [ ] Prestige data persists

## Console Error Checklist

For each test, check browser console (F12) for:
- [ ] No red errors
- [ ] No yellow warnings (except known ones)
- [ ] All resources load (no 404s)
- [ ] Phaser initializes correctly
- [ ] All managers initialize
- [ ] No undefined method calls
- [ ] No missing data files

## Performance Checklist

- [ ] Game runs at 60 FPS (desktop)
- [ ] No memory leaks (check over time)
- [ ] Smooth scrolling
- [ ] No lag during combat
- [ ] UI responsive
- [ ] No frame drops

## Known Issues to Watch For

1. **Credits Scene**: Particle system may need texture fix (fixed)
2. **GameScene**: Hero creation was missing (fixed)
3. **Audio**: Volume control issues (fixed)
4. **JSON Loading**: File path issues (fixed)
5. **Keyboard Shortcut**: Code uses 'C' for inventory, documentation says 'I' - needs resolution
6. **Credits Particles**: Particle tint uses array - needs runtime verification
7. **Achievements Loading**: forEach error on achievements data (documented in memory bank)

## Test Results Template

```
Test: [Button/Feature Name]
Date: [Date]
Status: ✅ Pass / ❌ Fail / ⚠️ Partial
Errors: [List any console errors]
Notes: [Any observations]
```


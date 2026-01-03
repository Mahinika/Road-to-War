# Phase 5: Implementation Roadmap & Timeline

**Date**: December 25, 2025  
**Status**: Complete Roadmap Design  
**Duration**: 4 weeks | ~160 hours of work

---

## Executive Summary

**Implementation Strategy**: Phased rollout with full backward compatibility

**Milestones**:
- **Week 1 (Foundation)**: CLI infrastructure, existing tools migration
- **Week 2 (Core Tools)**: Save manager, balance tester
- **Week 3 (Advanced Tools)**: Game inspector, asset optimizer
- **Week 4 (Integration & Polish)**: Documentation, testing, release

**Success Criteria**:
- ✅ Unified CLI working with 6 subcommands
- ✅ Save manager operational
- ✅ Balance tester generating reports
- ✅ Game inspector running
- ✅ Asset optimizer profiling
- ✅ 100% backward compatibility
- ✅ All documentation complete

---

## Week 1: Foundation & Migration

### Goal
Establish CLI infrastructure and migrate existing tools without breaking functionality.

### Day 1-2: Core Infrastructure

**Task 1.1: Create CLI Router**
- [ ] Create `tools/cli.js` entry point
- [ ] Implement command registry pattern
- [ ] Add global help text
- [ ] Test with placeholder commands
- **Acceptance**: `node tools/cli.js --help` shows full menu
- **Estimated Time**: 2 hours

**Task 1.2: Shared Infrastructure**
- [ ] Create `tools/config/game-config.js` (load game data)
- [ ] Create `tools/logging/logger.js` (unified logging)
- [ ] Create `tools/errors/cli-errors.js` (error classes)
- [ ] Create `tools/output/formatters.js` (output formatting)
- **Acceptance**: All modules import cleanly; no circular dependencies
- **Estimated Time**: 4 hours

**Task 1.3: Test CLI Infrastructure**
- [ ] Create integration test script
- [ ] Verify no errors on startup
- [ ] Test --help flag
- [ ] Test unknown command error handling
- **Acceptance**: `npm run game-tools -- --help` works
- **Estimated Time**: 2 hours

### Day 3-4: Migrate Analyze Tool

**Task 1.4: Refactor analyze-reference.js**
- [ ] Create `tools/commands/analyze.js`
- [ ] Move argument parsing from entry point to command
- [ ] Integrate new Logger system
- [ ] Add error handling with suggestions
- [ ] Preserve all original functionality
- **Acceptance**: Both work identically
  ```bash
  node tools/analyze-reference.js --input ref.png
  npm run game-tools -- analyze --input ref.png
  ```
- **Estimated Time**: 3 hours

**Task 1.5: Backward Compatibility Wrapper**
- [ ] Keep `tools/analyze-reference.js` as wrapper
- [ ] Wrapper calls `tools/cli.js analyze`
- [ ] Old scripts still work unchanged
- **Acceptance**: Old command still works
- **Estimated Time**: 1 hour

### Day 5: Migrate Generate Tool

**Task 1.6: Refactor generate-assets.js**
- [ ] Create `tools/commands/generate.js`
- [ ] Move argument parsing and validation
- [ ] Integrate Logger system
- [ ] Add progress reporting
- [ ] Preserve generation logic exactly
- **Acceptance**: Generated sprites identical
  ```bash
  npm run generate-assets                          # Old way
  npm run game-tools -- generate                   # New way
  # Both produce same results with same seed
  ```
- **Estimated Time**: 3 hours

**Task 1.7: Extract Palettes to Config**
- [ ] Create `public/data/palettes.json`
- [ ] Extract from `tools/utils/palette-manager.js`
- [ ] Update PaletteManager to load from file
- [ ] Keep hardcoded fallback
- [ ] Verify generation still works
- **Acceptance**: `public/data/palettes.json` exists and is used
- **Estimated Time**: 2 hours

### Day 6: Testing & Polish

**Task 1.8: Integration Tests**
- [ ] Create `tests/cli.test.js`
- [ ] Test all CLI help commands
- [ ] Test old scripts still work
- [ ] Test new subcommands
- [ ] Test error cases
- **Acceptance**: All tests passing
- **Estimated Time**: 3 hours

**Task 1.9: Update package.json**
- [ ] Add new `game-tools` script
- [ ] Update all related scripts
- [ ] Add `bin` entry for global install
- [ ] Update documentation references
- **Acceptance**: All scripts work
- **Estimated Time**: 1 hour

**Task 1.10: Update npm scripts**
- [ ] `npm run game-tools` works
- [ ] `npm run generate-assets` still works
- [ ] `npm run analyze-reference` still works
- [ ] New commands registered and documented
- **Acceptance**: `npm run game-tools -- --help` shows 6 commands
- **Estimated Time**: 1 hour

### Week 1 Deliverables
- ✅ Unified CLI router with command registration
- ✅ Shared infrastructure (config, logging, errors, formatting)
- ✅ Migrated `analyze` and `generate` subcommands
- ✅ 100% backward compatibility
- ✅ Palettes extracted to config file
- ✅ Integration tests passing
- ✅ Updated documentation

### Week 1 Success Criteria
```bash
✓ node tools/cli.js --help                    # Shows all commands
✓ npm run game-tools -- analyze --help        # Shows analyze help
✓ npm run game-tools -- generate --help       # Shows generate help
✓ npm run generate-assets                     # Still works (backward compat)
✓ npm run analyze-reference -- --help         # Still works (backward compat)
✓ npm test                                    # All tests passing
```

---

## Week 2: Core Tools (Save Manager & Balance Tester)

### Goal
Implement first two critical tools for save management and balance testing.

### Day 1-2: Save Manager Foundation

**Task 2.1: Create Save Manager Command**
- [ ] Create `tools/commands/inspect-save.js`
- [ ] Implement save file inspection
- [ ] Add detailed vs. summary output
- [ ] Add JSON output option
- [ ] Comprehensive error handling
- **Acceptance**: Can inspect a valid save file
- **Estimated Time**: 4 hours

**Task 2.2: Save Validation System**
- [ ] Create `tools/validation/save-validator.js`
- [ ] Validate against game data schemas
- [ ] Check required fields
- [ ] Verify data types
- [ ] Cross-reference validation (items exist, etc.)
- **Acceptance**: Detects invalid saves
- **Estimated Time**: 3 hours

**Task 2.3: Save Repair Implementation**
- [ ] Implement save repair logic
- [ ] Handle missing fields (add defaults)
- [ ] Fix broken JSON (recovery)
- [ ] Remove invalid items
- [ ] Verify equipment references
- [ ] Create backups before repair
- **Acceptance**: Can repair corrupted save
- **Estimated Time**: 4 hours

### Day 3-4: Save Manager Features

**Task 2.4: Save Migration System**
- [ ] Design migration framework
- [ ] Implement v1.0.0 → v1.1.0 migration (example)
- [ ] Preserve all player data
- [ ] Add new fields with sensible defaults
- [ ] Version tracking and logging
- **Acceptance**: Can upgrade save format
- **Estimated Time**: 3 hours

**Task 2.5: Test Save Creation**
- [ ] Implement test save generation
- [ ] Support variable configurations (level, class, items)
- [ ] Useful for testing different progression states
- [ ] Fast generation
- **Acceptance**: Can generate test saves
- **Estimated Time**: 2 hours

**Task 2.6: Save Listing & Management**
- [ ] List available saves
- [ ] Delete saves
- [ ] Copy/backup saves
- [ ] Export save data (JSON/CSV)
- **Acceptance**: Can manage saves from CLI
- **Estimated Time**: 2 hours

### Day 5-6: Balance Tester Foundation

**Task 2.7: Progression Curve Analysis**
- [ ] Implement curve testing logic
- [ ] Simulate progression through all levels
- [ ] Calculate experience requirements
- [ ] Estimate time per level
- [ ] Detect anomalies (extreme jumps)
- **Acceptance**: Can analyze progression curves
- **Estimated Time**: 4 hours

**Task 2.8: Economy Balance Testing**
- [ ] Implement drop rate analysis
- [ ] Simulate gold flow at different levels
- [ ] Analyze item affordability
- [ ] Detect pricing anomalies
- [ ] Compare costs vs. earning rate
- **Acceptance**: Can test economy balance
- **Estimated Time**: 4 hours

**Task 2.9: Report Generation**
- [ ] Implement console summary
- [ ] Generate CSV output
- [ ] Generate HTML reports
- [ ] Add charts/visualizations (optional)
- [ ] Anomaly highlighting
- **Acceptance**: Can generate balance reports in multiple formats
- **Estimated Time**: 3 hours

### Week 2 Deliverables
- ✅ Save manager with inspect/repair/migrate/create/list functionality
- ✅ Save validation system
- ✅ Balance tester with progression/economy/difficulty testing
- ✅ Report generation (console, CSV, HTML, JSON)
- ✅ Comprehensive error handling
- ✅ Integration tests for both tools

### Week 2 Success Criteria
```bash
✓ game-tools inspect-save slot1.json          # Shows save details
✓ game-tools inspect-save repair slot1.json   # Fixes corrupted saves
✓ game-tools inspect-save create --level 10   # Creates test save
✓ game-tools test-balance curves              # Analyzes progression
✓ game-tools test-balance economy             # Analyzes economy
✓ game-tools test-balance report --output=report.csv
✓ npm test                                    # All tests passing
```

---

## Week 3: Advanced Tools (Game Inspector & Asset Optimizer)

### Goal
Implement real-time game state viewer and asset performance profiler.

### Day 1-3: Game Inspector Server

**Task 3.1: Inspector Server Core**
- [ ] Create `tools/commands/inspect-game.js`
- [ ] Implement WebSocket server (port 5555)
- [ ] Handle game state messages
- [ ] Broadcast state updates to clients
- [ ] Message type routing
- **Acceptance**: Server starts and listens
- **Estimated Time**: 4 hours

**Task 3.2: State Query System**
- [ ] Implement path-based state queries (e.g., "party.heroes[0].stats")
- [ ] Support nested object/array access
- [ ] Error handling for invalid paths
- [ ] Real-time updates
- **Acceptance**: Can query arbitrary state paths
- **Estimated Time**: 2 hours

**Task 3.3: Electron Integration**
- [ ] Add IPC bridge in `electron/preload.js`
- [ ] Send game state on game loop (10 Hz)
- [ ] Connect WebSocket to inspector
- [ ] Handle connection errors gracefully
- [ ] Minimize performance impact
- **Acceptance**: Game runs normally while inspector connected
- **Estimated Time**: 3 hours

### Day 4-5: Inspector Features & Asset Optimizer

**Task 3.4: Inspector Watch/Subscribe**
- [ ] Implement watch command for path changes
- [ ] Subscribe to state updates
- [ ] Format output for human reading
- [ ] Highlight changes
- [ ] Continuous monitoring
- **Acceptance**: Can watch state changes live
- **Estimated Time**: 2 hours

**Task 3.5: Asset Optimizer Profiling**
- [ ] Create `tools/commands/optimize-assets.js`
- [ ] Implement performance profiling
- [ ] Measure generation time (ms)
- [ ] Track memory usage (MB)
- [ ] Calculate statistics (avg, peak, variance)
- [ ] Identify bottlenecks
- **Acceptance**: Can profile asset generation
- **Estimated Time**: 3 hours

**Task 3.6: Batch Generation & Caching**
- [ ] Implement pre-generation
- [ ] Cache generated assets to disk
- [ ] Load from cache if exists
- [ ] Track cache hit/miss rates
- [ ] Performance comparison (with/without cache)
- **Acceptance**: Can batch generate and cache assets
- **Estimated Time**: 2 hours

### Day 6: Testing & Documentation

**Task 3.7: Integration Tests**
- [ ] Test inspector server start/stop
- [ ] Test state queries
- [ ] Test WebSocket communication
- [ ] Test asset profiling
- [ ] Test caching system
- **Acceptance**: All inspector tests passing
- **Estimated Time**: 3 hours

**Task 3.8: Performance Benchmarks**
- [ ] Establish baseline generation time
- [ ] Baseline memory usage
- [ ] Document optimization opportunities
- [ ] Compare before/after optimization
- **Acceptance**: Baseline metrics documented
- **Estimated Time**: 2 hours

### Week 3 Deliverables
- ✅ Game inspector server with WebSocket communication
- ✅ State query and watch functionality
- ✅ Electron integration (IPC bridge)
- ✅ Asset optimizer with profiling
- ✅ Batch generation and caching
- ✅ Performance benchmarks

### Week 3 Success Criteria
```bash
✓ game-tools inspect-game start                # Server starts
✓ game-tools inspect-game query party.heroes[0].level
✓ game-tools inspect-game watch world.currentEnemy
✓ game-tools optimize profile                  # Measures generation
✓ game-tools optimize batch --count 100        # Generates and caches
✓ game-tools optimize report --output perf.html
✓ npm test                                     # All tests passing
✓ Electron app runs normally with inspector    # No lag
```

---

## Week 4: Integration, Testing & Release

### Goal
Polish, test, document, and release unified CLI toolkit.

### Day 1-2: Final Integration & Testing

**Task 4.1: End-to-End Testing**
- [ ] Test all CLI commands
- [ ] Test command chaining
- [ ] Test error recovery
- [ ] Test with invalid inputs
- [ ] Stress testing (many files, large saves)
- **Acceptance**: All commands working reliably
- **Estimated Time**: 4 hours

**Task 4.2: Backward Compatibility Testing**
- [ ] Verify old scripts still work
- [ ] Test npm scripts
- [ ] Test direct Node.js calls
- [ ] Test with existing saves/configs
- [ ] No breaking changes
- **Acceptance**: 100% backward compatible
- **Estimated Time**: 2 hours

**Task 4.3: Documentation**
- [ ] Create `tools/README.md` (complete reference)
- [ ] Document all subcommands
- [ ] Add usage examples
- [ ] Include troubleshooting guide
- [ ] API documentation for new tools
- **Acceptance**: Users can understand all tools from README
- **Estimated Time**: 3 hours

**Task 4.4: Command-Specific Docs**
- [ ] Create guide for save manager
- [ ] Create guide for balance tester
- [ ] Create guide for game inspector
- [ ] Create guide for asset optimizer
- [ ] Include real examples
- **Acceptance**: Each tool has dedicated documentation
- **Estimated Time**: 3 hours

### Day 3-4: Architecture & Design Docs

**Task 4.5: Architecture Documentation**
- [ ] Create `tools/ARCHITECTURE.md`
- [ ] Document CLI design decisions
- [ ] Include data flow diagrams
- [ ] Explain IPC protocols
- [ ] Design patterns used
- **Acceptance**: Developers understand system architecture
- **Estimated Time**: 3 hours

**Task 4.6: Developer Guide**
- [ ] Create `tools/DEV_GUIDE.md`
- [ ] How to add new subcommands
- [ ] How to add new infrastructure modules
- [ ] Testing conventions
- [ ] Code style guidelines
- **Acceptance**: New developers can extend CLI
- **Estimated Time**: 2 hours

**Task 4.7: Update Main README**
- [ ] Add game-tools section to main `README.md`
- [ ] Quick start guide
- [ ] Link to detailed documentation
- [ ] Installation instructions
- **Acceptance**: Users know about game-tools from main README
- **Estimated Time**: 1 hour

### Day 5-6: Release & Polish

**Task 4.8: Version Bump & Changelog**
- [ ] Update version in `package.json`
- [ ] Create `CHANGELOG.md` entry
- [ ] Document new features
- [ ] Document breaking changes (none expected)
- [ ] Add migration guide for old scripts
- **Acceptance**: Version reflects new tools
- **Estimated Time**: 1 hour

**Task 4.9: Example Outputs**
- [ ] Generate sample balance reports
- [ ] Generate sample save inspection output
- [ ] Record example inspector queries
- [ ] Create example optimization reports
- [ ] Include in documentation
- **Acceptance**: Real examples available for reference
- **Estimated Time**: 2 hours

**Task 4.10: Final Polish & Release**
- [ ] Fix any bugs found during testing
- [ ] Improve error messages
- [ ] Optimize performance
- [ ] Add missing help text
- [ ] Review all code
- [ ] Tag release in git
- **Acceptance**: Ready for production use
- **Estimated Time**: 3 hours

### Week 4 Deliverables
- ✅ All CLI commands fully tested and working
- ✅ 100% backward compatibility verified
- ✅ Comprehensive documentation
- ✅ Architecture and design documentation
- ✅ Developer guide for extending CLI
- ✅ Example outputs for all tools
- ✅ Version bump and changelog
- ✅ Release tag created

### Week 4 Success Criteria
```bash
✓ All npm tests passing
✓ All CLI commands working correctly
✓ Documentation complete and accurate
✓ Old scripts still work (backward compat)
✓ npm run game-tools -- --help shows all 6 commands
✓ tools/README.md comprehensive
✓ tools/ARCHITECTURE.md complete
✓ tools/DEV_GUIDE.md helpful
✓ Version bumped
✓ Changelog created
✓ Release tagged in git
```

---

## Resource Allocation

### Total Effort
- **Week 1**: 30 hours (foundation)
- **Week 2**: 40 hours (save manager + balance tester)
- **Week 3**: 35 hours (inspector + optimizer)
- **Week 4**: 25 hours (testing + documentation)
- **Total**: ~130 hours

### Team Composition (Recommended)
- **1-2 developers**: Full-time for implementation
- **1 technical writer**: Part-time for documentation (Week 2-4)
- **1 QA**: Part-time for testing (Week 3-4)

### Per-Phase Effort
| Phase | Dev Hours | Test Hours | Doc Hours | QA Hours | Total |
|-------|-----------|-----------|-----------|----------|-------|
| Week 1 | 25 | 5 | 0 | 0 | 30 |
| Week 2 | 35 | 5 | 0 | 0 | 40 |
| Week 3 | 30 | 5 | 0 | 0 | 35 |
| Week 4 | 5 | 5 | 10 | 5 | 25 |
| **Total** | **95** | **20** | **10** | **5** | **130** |

---

## Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing scripts | Medium | High | Extensive backward compat testing |
| CLI design doesn't meet needs | Low | Medium | Early feedback from team |
| Performance issues with inspector | Low | Medium | Profile before release |
| Documentation incomplete | Medium | Low | Assign early; review often |
| Schedule slips | Medium | Medium | Buffer time in Week 4 |

---

## Dependencies & Prerequisites

**Must Complete Before Starting**:
- ✅ Phase 1 (audit) complete
- ✅ Phase 2 (consolidation) decisions approved
- ✅ Phase 3 (CLI architecture) finalized
- ✅ Phase 4 (new tools) designed

**External Requirements**:
- Node.js 18+
- canvas npm package
- No breaking changes to game code

---

## Rollback Plan

If critical issues discovered:
1. Keep old scripts working (backward compat)
2. Document workarounds
3. Create hotfix branch
4. Revert only problematic subcommands
5. Maintain CLI router (keep as platform for future)

**Safeguard**: Old `generate-assets.js` and `analyze-reference.js` always available as fallback.

---

## Success Metrics

### Functionality
- ✅ All 6 CLI subcommands working
- ✅ No regressions in existing functionality
- ✅ All error cases handled gracefully
- ✅ Performance baseline met (tool startup < 500ms)

### Quality
- ✅ Test coverage > 80%
- ✅ All npm tests passing
- ✅ Zero console warnings
- ✅ No circular dependencies

### Documentation
- ✅ README complete and current
- ✅ All commands documented
- ✅ Examples for each tool
- ✅ Architecture explained

### User Experience
- ✅ Help text clear and actionable
- ✅ Error messages suggest fixes
- ✅ Consistent command structure
- ✅ Easy to learn and use

---

## Next Steps

1. ✅ Phase 5 implementation roadmap complete
2. → **Phase 6**: Integration points & architecture decisions
3. → **Phase 7**: Final deliverables checklist
4. → **Begin Implementation**: Week 1 tasks

**Ready to proceed to Phase 6 integration decisions.**

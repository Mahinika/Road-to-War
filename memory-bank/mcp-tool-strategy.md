# MCP Tool Stacking Strategy Guide

This document describes how to stack MCP (Model Context Protocol) tools effectively for maximum intelligence and problem-solving capability. The goal is to combine multiple tools strategically to achieve better understanding, faster problem-solving, and more accurate implementations.

## Tool Setup Status

**Ready to Use (No Setup Required):**
- ✅ **Sequential Thinking**: Available and working - use for complex problems, bug investigation, design decisions
- ✅ **Codebase Search**: Built-in tool - no setup needed
- ✅ **Context7**: Fully configured and working - provides external documentation (Godot 4.x API, best practices)
  - **Tools**: `mcp_context7_resolve-library-id` (find library IDs) and `mcp_context7_query-docs` (query documentation)
  - **Use Case**: Get authoritative external documentation when needed (Godot API, frameworks, libraries)
  - **Tested**: Confirmed working with Godot 4.4 documentation

**Requires External Setup:**
- ⚠️ **Godot MCP Tools**: Requires Godot editor running with project open and MCP plugin active (for real-time project state inspection)

## Tool Stacking Philosophy

**Key Principle**: Use multiple MCP tools in sequence, where each tool builds on the previous one's output to create a comprehensive understanding before making changes.

**Why Stack Tools?**
- Single tools have limitations - combining them provides more complete picture
- Sequential thinking structures complex problems into manageable steps
- Codebase search finds existing patterns and solutions
- External documentation (Context7) provides authoritative references
- Godot MCP tools provide real-time project state

**When to Stack**: For complex problems, architecture decisions, performance optimization, and bug investigation.

---

## Pattern 1: Complex Problem Solving

**Use Case**: Understanding a complex system, designing a new feature, or making architectural decisions.

**Tool Stack**:
1. **Sequential Thinking**: Break down problem into logical steps, identify unknowns
2. **Codebase Search**: Find similar patterns, existing implementations, related code
3. **Context7** (if needed): Get external documentation (Godot 4.x API, best practices)
   - **Status**: ✅ Confirmed working - no setup needed
   - **Usage**: Use `mcp_context7_resolve-library-id` to find library IDs, then `mcp_context7_query-docs` to query documentation
4. **Sequential Thinking**: Synthesize findings, evaluate options, make decision
5. **Execute**: Implement with confidence based on comprehensive understanding

**Example Workflow**:
```
Problem: "How should we implement a new status effect system?"

1. Sequential Thinking:
   - Step 1: Understand current status effect implementation
   - Step 2: Identify requirements (duration, stacking, dispelling)
   - Step 3: Design data structure
   - Step 4: Plan integration points

2. Codebase Search:
   - Query: "How are status effects currently implemented?"
   - Find: StatusEffectsManager.gd, combat integration, UI display
   - Discover: Existing patterns for duration tracking, effect application

3. Context7 (optional):
   - Query: "Godot 4.x signal system best practices"
   - Get: Official documentation on signal patterns

4. Sequential Thinking:
   - Synthesize: Combine existing patterns with requirements
   - Evaluate: Existing system can be extended vs. needs rewrite
   - Decision: Extend StatusEffectsManager with new effect types

5. Execute: Implement extension following existing patterns
```

**Benefits**: Comprehensive understanding, avoids reinventing wheels, leverages existing patterns

---

## Pattern 2: Godot-Specific Issues

**Use Case**: Godot engine issues, scene problems, node relationships, API questions.

**Tool Stack**:
1. **Sequential Thinking**: Understand the Godot concept or problem
2. **Godot MCP Tools**: Inspect actual project state (scenes, nodes, scripts, hierarchy)
3. **Codebase Search**: Find existing implementations using similar Godot features
4. **Context7**: Get Godot 4.x API documentation if needed
5. **Sequential Thinking**: Design solution based on project patterns
6. **Execute**: Implement following Godot best practices

**Example Workflow**:
```
Problem: "Scene transition causes nodes to not initialize properly"

1. Sequential Thinking:
   - Identify: Scene lifecycle issue
   - Question: When are nodes ready? Is _ready() being called?

2. Godot MCP Tools:
   - Get scene info: Check current scene structure
   - Inspect node hierarchy: See what nodes exist
   - View script: Check _ready() implementation
   - Find objects: Check for initialization issues

3. Codebase Search:
   - Query: "How are scene transitions handled?"
   - Find: SceneManager.gd, _exit_tree() patterns, signal cleanup

4. Context7:
   - Query: "Godot 4.x scene lifecycle _ready _exit_tree"
   - Get: Official documentation on scene lifecycle

5. Sequential Thinking:
   - Analyze: SceneManager might not be waiting for _ready()
   - Solution: Add scene ready signal, wait before transition
   - Pattern: Follow existing cleanup patterns in other scenes

6. Execute: Implement scene ready check in SceneManager
```

**Benefits**: Understands actual project state, follows project patterns, uses correct Godot APIs

---

## Pattern 3: Performance Optimization

**Use Case**: Identifying bottlenecks, optimizing systems, measuring performance impact.

**Tool Stack**:
1. **Codebase Search**: Find performance-critical paths, existing optimizations
2. **Sequential Thinking**: Identify bottlenecks, understand optimization opportunities
3. **Performance Profile** (techContext.md): Check existing benchmarks and known issues
4. **Context7**: Research optimization patterns and best practices
5. **Sequential Thinking**: Evaluate optimization strategies, measure impact
6. **Execute**: Optimize with measurement and validation

**Example Workflow**:
```
Problem: "Combat feels laggy with many particles"

1. Codebase Search:
   - Query: "How are particles created in combat?"
   - Find: ParticleManager.gd, combat VFX creation, ObjectPool usage

2. Sequential Thinking:
   - Identify: ParticleManager creates many particles per frame
   - Question: Are particles pooled? Are they cleaned up?
   - Bottleneck: Likely allocation overhead or too many active particles

3. Performance Profile (techContext.md):
   - Check: "ParticleManager at 100+ particles (needs batching)"
   - Known issue: ObjectPool exists but may not be used for all particle types

4. Context7:
   - Query: "Godot 4.x particle system performance optimization"
   - Get: Batching strategies, CPUParticles2D vs GPUParticles2D

5. Sequential Thinking:
   - Analyze: ObjectPool is implemented but not used for all particle types
   - Strategy: Extend ObjectPool to handle all particle types
   - Alternative: Implement particle batching or throttling
   - Decision: Use ObjectPool (consistent with existing pattern)

6. Execute: Extend ObjectPool integration, measure FPS improvement
```

**Benefits**: Leverages existing optimizations, understands bottlenecks, follows proven patterns

---

## Pattern 4: Bug Investigation

**Use Case**: Debugging errors, understanding why something broke, fixing regressions.

**Tool Stack**:
1. **Error Pattern Library** (error-patterns.md): Check if known pattern matches
2. **Codebase Search**: Find where bug occurs, similar past fixes
3. **Sequential Thinking**: Trace execution path, identify root cause
4. **System Relationships** (system-relationships.md): Understand dependencies and interactions
5. **Sequential Thinking**: Design fix considering system impact
6. **Execute**: Fix with prevention strategy, document if new pattern

**Example Workflow**:
```
Problem: "Game crashes when transitioning from World scene to Character Panel"

1. Error Pattern Library:
   - Check: Lambda capture errors? Signal leaks? Memory issues?
   - Match: Pattern #1 - Lambda Capture Errors
   - Symptom matches: "Lambda capture at index 0 was freed"

2. Codebase Search:
   - Query: "Character Panel scene transition signal connections"
   - Find: CharacterPanel.gd, SceneManager.gd, World.gd scene transitions
   - Discover: Previous fixes in HUD.gd, Inventory.gd using named methods

3. Sequential Thinking:
   - Trace: CharacterPanel loads → connects signals → World scene freed → crash
   - Root cause: Anonymous function in signal connection captures freed node
   - Fix: Replace anonymous function with named method

4. System Relationships:
   - Check: How do other scenes handle signal cleanup?
   - Pattern: All fixed scenes use named methods + _exit_tree() cleanup
   - Impact: CharacterPanel.gd needs same pattern

5. Sequential Thinking:
   - Design: Replace all anonymous signal connections with named methods
   - Add: _exit_tree() cleanup to disconnect signals
   - Test: Verify no crashes on scene transitions

6. Execute: Apply fix pattern, verify no regressions, document if new variant
```

**Benefits**: Faster debugging, prevents repeated mistakes, follows proven fix patterns

---

## Pattern 5: Adding New Manager

**Use Case**: Creating a new game system manager (e.g., QuestManager, DialogueManager).

**Tool Stack**:
1. **Sequential Thinking**: Design manager interface, responsibilities, dependencies
2. **System Relationships**: Understand where manager fits, what depends on it
3. **Decision Log** (decisions.md): Check Manager Pattern decision, follow architecture
4. **Codebase Search**: Find similar manager implementations as reference
5. **Sequential Thinking**: Refine design based on patterns, ensure consistency
6. **Execute**: Implement following established patterns (Autoload, signals, _ready())

**Example Workflow**:
```
Task: "Create QuestManager for quest tracking"

1. Sequential Thinking:
   - Responsibilities: Track active quests, progress, completion, rewards
   - Dependencies: WorldManager (quest triggers), AchievementManager (quest completion)
   - Interface: get_active_quests(), update_quest_progress(), complete_quest()

2. System Relationships:
   - Check: Where do quests trigger? (WorldManager encounters)
   - Check: What uses quest data? (UI display, achievement tracking)
   - Integration: QuestManager → WorldManager (quest triggers)
   - Integration: QuestManager → AchievementManager (quest completion events)

3. Decision Log:
   - Check: Decision #1 - Manager Pattern as Autoloads
   - Follow: Implement as Autoload singleton in project.godot
   - Follow: Use signals for quest events (quest_started, quest_completed)
   - Follow: Load quest data from JSON via DataManager

4. Codebase Search:
   - Query: "How are managers implemented as Autoloads?"
   - Find: CombatManager.gd, EquipmentManager.gd as reference implementations
   - Pattern: Autoload class, signals defined, _ready() initialization, get_save_data()

5. Sequential Thinking:
   - Refine: QuestManager should follow same pattern as other managers
   - Signals: quest_started, quest_progress_updated, quest_completed
   - Data: Load from quests.json via DataManager
   - Save: Include quest state in get_save_data()

6. Execute: Implement QuestManager following established patterns
```

**Benefits**: Consistent architecture, proper integration, follows project conventions

---

## Workflow Decision Tree

**Quick reference for tool selection**:

```
Problem Type?
├─ Architecture/Design Decision
│  └─> Pattern 1: Complex Problem Solving
│
├─ Godot Engine/Scene Issue
│  └─> Pattern 2: Godot-Specific Issues
│
├─ Performance Problem
│  └─> Pattern 3: Performance Optimization
│
├─ Bug/Error
│  └─> Pattern 4: Bug Investigation
│
└─ New System/Manager
   └─> Pattern 5: Adding New Manager
```

---

## Best Practices

### 1. Always Start with Sequential Thinking (ENHANCED)

**Expanded Usage Strategy:**

**Use Sequential Thinking for:**
1. **Complex Problems** (MANDATORY): Multi-step problems, architecture decisions, system design
2. **Bug Investigation** (STRONGLY RECOMMENDED): When root cause isn't immediately obvious - helps trace execution paths and identify variables
3. **Performance Issues** (STRONGLY RECOMMENDED): Before optimizing, fully understand bottlenecks, measurement points, and impact
4. **Refactoring** (RECOMMENDED): Plan changes before executing to map dependencies and avoid breaking changes
5. **New Feature Design** (RECOMMENDED): Break down requirements into implementation steps, identify integration points
6. **Uncertainty** (USE IT): When not 100% sure of approach - explore options, evaluate tradeoffs
7. **Multi-System Changes** (MANDATORY): Changes affecting multiple managers or systems require careful dependency analysis
8. **Documentation Updates** (USE IT): When updating memory bank, think through what changed, why it changed, and what's affected
9. **Code Reviews** (USE IT): Before making changes, use Sequential Thinking to review what could break or be affected
10. **Research Tasks** (USE IT): When investigating new approaches or unfamiliar patterns

**Smart Usage Patterns:**
- **Start Early**: Use Sequential Thinking at the beginning to structure your approach, not after hitting dead ends
- **Use for Synthesis**: After gathering information (codebase search, reading files), use Sequential Thinking to synthesize findings and make decisions
- **Decision Points**: Use Sequential Thinking when evaluating multiple solution options - it helps compare tradeoffs systematically
- **Before Major Changes**: Always use Sequential Thinking before refactoring or making architectural changes
- **Knowledge Gaps**: Use Sequential Thinking to identify what you don't know and need to research before proceeding
- **Error Recovery**: When encountering errors, use Sequential Thinking to understand what went wrong and how to fix it properly
- **Integration Planning**: Before integrating new features, use Sequential Thinking to map out dependencies and integration points

**When NOT to Use Sequential Thinking:**
- Trivial single-line fixes (typos, simple variable renames)
- Simple file reads or searches
- Formatting-only changes
- Adding comments to existing code
- Running scripts/commands
- Very straightforward tasks with clear, single-step solutions

**Decision Rule**: If you're wondering "should I use Sequential Thinking?", the answer is probably YES. It's better to over-use it for non-trivial tasks than to skip it and make mistakes that require rework.

For complex problems, use Sequential Thinking first to structure your approach. This helps identify what information you need and in what order.

### 2. Search Before Creating
Before implementing something new, search the codebase for existing patterns. You'll often find similar implementations that can be extended or referenced.

### 3. Check Memory Bank First
Before using external tools (Context7), check memory bank files:
- `decisions.md` for architectural patterns
- `error-patterns.md` for known issues
- `system-relationships.md` for dependencies
- `activeContext.md` for current work context

### 4. Document New Patterns
If you discover a new pattern or fix a new type of bug, document it:
- Add to `error-patterns.md` if it's a bug pattern
- Add to `decisions.md` if it's an architectural decision
- Update `system-relationships.md` if dependencies change

### 5. Validate with Real Project State
For Godot-specific work, always use Godot MCP tools to inspect actual project state rather than assuming. Real state may differ from documentation.

### 6. Measure Performance Changes
When optimizing, always measure before and after. Update `techContext.md` performance profile with new benchmarks.

---

## Tool Combination Examples

### Example 1: Understanding Combat System
```
1. Sequential Thinking: "How does combat work end-to-end?"
2. System Relationships: View Combat Flow diagram
3. Codebase Search: Find CombatManager.gd, CombatHandler.gd implementations
4. Sequential Thinking: Synthesize understanding
Result: Complete picture of combat system
```

### Example 2: Fixing Type Inference Warning
```
1. Error Patterns: Check Pattern #4 (Type Inference Errors)
2. Codebase Search: Find similar fixes in AbilityManager.gd
3. Sequential Thinking: Apply fix pattern
4. Execute: Fix with explicit types
Result: Quick fix following established pattern
```

### Example 3: Adding New Ability
```
1. Sequential Thinking: Design ability mechanics
2. Codebase Search: Find similar abilities, ability data structure
3. System Relationships: Check AbilityManager → CombatManager integration
4. Decision Log: Check data-driven design pattern
5. Execute: Add to abilities.json, implement in AbilityManager
Result: Consistent with existing ability system
```

---

## Advanced: Multi-Tool Parallel Usage

For very complex problems, you can use multiple tools in parallel and then synthesize:

```
Parallel Tool Usage:
├─ Sequential Thinking: Break down problem
├─ Codebase Search: Find patterns (parallel)
├─ System Relationships: Check dependencies (parallel)
└─ Error Patterns: Check known issues (parallel)

Then:
└─ Sequential Thinking: Synthesize all findings
```

**When to use**: Large refactoring, major architecture changes, complex bug with multiple symptoms

---

## Tool Limitations & Workarounds

### Sequential Thinking
- **Limit**: Can overthink simple problems
- **Workaround**: Use judgment - skip for truly trivial tasks (single-line fixes, formatting), but use it for any task with uncertainty or multiple steps
- **Enhanced Usage**: User preference is to use Sequential Thinking more often - when in doubt, use it. Better to over-use for non-trivial tasks than to skip and make mistakes.

### Codebase Search
- **Limit**: May miss code in unusual locations
- **Workaround**: Use grep for exact matches, try multiple query phrasings

### Context7
- **Setup Status**: ✅ Fully configured and working - tested and confirmed
- **Limit**: External docs may not match project's Godot version (e.g., project uses 4.x but docs might be 4.4 or 4.5)
- **Workaround**: Verify Godot version in project.godot, use appropriate library version (`/websites/godotengine_en_4_4` for 4.4, etc.), cross-reference with actual project state via codebase search
- **Best Practice**: Use Context7 for API reference, then verify with codebase search to see how it's actually used in the project

### Godot MCP Tools
- **Limit**: Requires Godot editor running
- **Workaround**: Use codebase search and file reading as fallback

---

## Success Metrics

Effective tool stacking should result in:
- ✅ Faster problem understanding (fewer iterations)
- ✅ Better solutions (leveraging existing patterns)
- ✅ Fewer bugs (following proven patterns)
- ✅ More consistent code (following architecture decisions)
- ✅ Better performance (leveraging optimizations)

---

## Quick Reference Card

```
COMPLEX PROBLEM
├─ Sequential Thinking (structure)
├─ Codebase Search (patterns)
├─ Context7 (external docs)
└─ Sequential Thinking (synthesize)

GODOT ISSUE
├─ Sequential Thinking (understand)
├─ Godot MCP (inspect project)
├─ Codebase Search (find patterns)
└─ Execute

PERFORMANCE
├─ Codebase Search (find bottlenecks)
├─ Performance Profile (check benchmarks)
├─ Context7 (optimization patterns)
└─ Measure & Optimize

BUG
├─ Error Patterns (check known)
├─ Codebase Search (find fix)
├─ System Relationships (understand impact)
└─ Fix & Document

NEW SYSTEM
├─ Sequential Thinking (design)
├─ System Relationships (integration)
├─ Decision Log (architecture)
├─ Codebase Search (reference)
└─ Implement
```

**Last Updated**: January 2026
**Total Patterns Documented**: 5 primary patterns + quick reference guide

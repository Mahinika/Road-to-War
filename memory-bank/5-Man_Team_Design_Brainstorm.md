# Game Design Brainstorm Summary: Transition to 5-Man Dungeon Group

This document compiles all decisions, clarifications, and recommendations from our brainstorming session regarding the significant shift in game design from a single-hero experience to a 5-man dungeon group. This serves as a foundational plan for future development.

## 1. Core Game Concept Redesign: From 1 Hero to 5-Man Team

*   **Previous State:** The game currently focuses on managing a single hero.
*   **New Vision:** Transition to a "5-man dungeon group" format, where the player manages a team of five heroes.
*   **Player Interaction:** The core gameplay loop remains automatic combat. The player's primary management responsibilities revolve around strategic decisions regarding:
    *   **Equipment:** Outfitting heroes with appropriate gear.
    *   **Talents:** Customizing hero abilities and playstyles through talent allocation.
    *   **Group Dynamic:** Optimizing the synergy and effectiveness of the team composition.

## 2. Team Composition & Roles

*   **Fixed Group Size:** The player will always manage a group of five heroes.
*   **Role Archetypes:** The team will adhere to a classic "holy trinity" setup with specific roles:
    *   **1 Tank:** Responsible for drawing and maintaining enemy aggro and mitigating damage.
    *   **1 Healer:** Responsible for keeping the team alive through healing spells.
    *   **3 Damage Dealers (DPS):** Responsible for maximizing offensive output to defeat enemies.
*   **Player Choice within Roles:** While the roles are fixed, players will have the flexibility to choose specific classes that can fulfill these roles. This is inspired by World of Warcraft, where multiple classes can spec into tanking or healing (e.g., Paladin can be Tank, Healer, or DPS).

## 3. Classes and Specializations (Specs)

*   **Inspiration:** The class and specialization system in World of Warcraft, particularly how it allows a class to fulfill different roles.
*   **Core Class Identity (Scenario A):**
    *   Each base `Class` (e.g., Paladin, Warrior) will possess a strong, universal set of core abilities. These abilities define the fundamental identity and flavor of the class, regardless of the chosen specialization.
    *   **Example:** A `Paladin` would always have abilities like `Lay on Hands` or `Divine Shield` accessible, regardless of their chosen spec.
*   **Specialization-Specific Skills:**
    *   Each `Class` will have multiple `Specializations` (specs) (e.g., Holy, Protection, Retribution for Paladin).
    *   Choosing a `Specialization` will layer on additional active abilities, passive effects, and enhancements that specifically tailor the hero to that particular role and playstyle.

## 4. Talents System

*   **Inspiration:** The more complex and impactful talent tree system from World of Warcraft: The Burning Crusade (TBC) and Wrath of the Lich King (WotLK) expansions.
*   **Structure:**
    *   Each `Class` will feature three distinct talent trees.
    *   These trees generally correspond to potential specializations or playstyles for that class.
*   **Talent Point Allocation:**
    *   Players will earn talent points (e.g., one point per level after a certain starting level, like level 10).
    *   Players can invest these points deeply into one primary tree to unlock powerful end-tier abilities specific to that tree's focus.
    *   The system allows for structured progression, where certain talents have prerequisites, requiring a specific number of points in earlier talents within the same tree.
*   **Respecialization (Respeccing):**
    *   Players will have the ability to reset their allocated talent points.
    *   This action will incur a gold cost, encouraging thoughtful choices but allowing for experimentation with different builds.
*   **Talent Tree Interaction with Abilities (Option 1):**
    *   Talent trees will primarily focus on enhancing their corresponding specialization's abilities.
    *   Additionally, they may offer some talents that improve the core class abilities that all specs use.
    *   The design emphasizes reinforcing the chosen specialization, with limited and less substantial cross-tree benefits, discouraging significant "hybrid" point distribution across multiple trees.

## 5. Equipment and Stats System

*   **General Equipment System:**
    *   There will be a general equipment system where items are not strictly class-specific.
    *   Instead, different combinations of stats on equipment will be more desirable for certain roles and specializations, guiding player choices.
*   **Comprehensive Stat Inclusion:** All primary and secondary stats from WoW TBC/WotLK are intended to be included, offering a rich environment for player optimization:
    *   **Primary Stats:** Strength, Agility, Stamina, Intellect, Spirit.
    *   **Secondary Stats:** Attack Power, Spell Power, Hit Rating, Critical Strike Rating, Haste Rating, Expertise Rating, Defense Rating, Resilience Rating.
*   **Stat Scaling and Impact:**
    *   Stats will scale and interact in a manner similar to TBC/WotLK, where increases translate directly into combat effectiveness (e.g., Hit Rating reduces misses, Haste increases action speed, Critical Strike increases damage/healing spikes).
    *   This allows players to pursue specific "builds" (e.g., a "haste build") through equipment choices, even with automatic combat.
*   **Stat Caps:**
    *   The critical `Defense Cap` (achieving critical hit immunity for tanks against higher-level enemies) will be implemented as a key gearing goal, mirroring its importance in TBC/WotLK.
    *   No additional soft or hard caps are planned for other stats at this moment, but this remains open for future design iterations.

## 6. Hero Acquisition and Management

*   **New Game Creation:** When starting a new game, the player will be prompted to fill the five team slots by selecting the classes for each hero, establishing the initial team composition.
*   **Flexibility to Swap Heroes:** Players will have the option to swap out an existing hero for a new class later in the game.
*   **"Punishing but Rewarding" Swap Mechanic:**
    *   A newly introduced class will always start at Level 1.
    *   This design choice makes swapping a significant investment, as the player must dedicate time to level up the new hero, creating a sense of weight to team composition decisions.
*   **"Road to War" Progression and Leveling Mechanic:**
    *   The game world is conceptualized as a "Road to War," spanning 100 "miles."
    *   Each "mile" increases the difficulty, roughly equating to one character level. For example, a group of Level 50 characters would generally be progressing around the 50-mile mark.
    *   To level up new, low-level characters, players can choose to revisit any part of this "road" (earlier miles).
    *   While farming lower-mile enemies, the existing higher-level characters in the group will provide a significant advantage, but the challenge should still remain appropriate based on the group's overall gear and the new hero's low level, providing sufficient XP gain for the recruit.

## 7. Automatic Combat AI Recommendations

The automatic combat system will rely on intelligent AI for each hero role, ensuring effective group dynamics without direct player control.

### 7.1. Tank AI

*   **Primary Objective:** Establish and maintain high threat on hostile targets; mitigate incoming damage to protect the group.
*   **Core Behaviors:**
    *   **Threat Generation:** Proactively use threat-generating abilities (e.g., "Taunt" equivalents, area-of-effect threat skills) on enemies currently attacking non-tank party members or designated primary targets.
    *   **Damage Mitigation:** Judiciously utilize defensive cooldowns (e.g., "Shield Wall" equivalents) when personal health drops below critical thresholds or in anticipation of powerful enemy attacks.
    *   **Target Prioritization:** Focus main attacks on the primary target, but be programmed to identify and "pick up" enemies that are attacking healers or DPS.
    *   **Basic Positioning:** Automatically adjust position to confront enemies, ideally facing them away from the group to mitigate cleave/frontal cone attacks.

### 7.2. Healer AI

*   **Primary Objective:** Sustain the health of all party members and prevent fatalities.
*   **Core Behaviors:**
    *   **Target Prioritization:**
        *   **Lowest Health Percentage:** Primary focus on healing the party member with the lowest current health percentage, indicating immediate danger.
        *   **Tank Bias:** A weighted priority towards keeping the tank's health stable, recognizing their crucial role in managing incoming damage.
    *   **Spell Selection:**
        *   **Emergency Healing:** Use fast, single-target healing spells for critical health emergencies.
        *   **Sustained Healing:** Employ more mana-efficient, slower-cast healing spells for sustained damage scenarios.
        *   **Area-of-Effect (AoE) Healing:** Utilize AoE healing spells when multiple party members are taking damage simultaneously.
    *   **Mana Management:** Intelligently use mana-efficient spells and, if applicable, activate mana regeneration abilities or consume consumables when mana reserves are low.
    *   **Dispel (Recommended):** If applicable, automatically identify and dispel harmful debuffs (e.g., stuns, silences, damage-over-time effects) from party members, prioritizing those with high impact.

### 7.3. Damage Dealer (DPS) AI (Melee & Ranged)

*   **Primary Objective:** Maximize damage output on designated targets while avoiding excessive threat generation.
*   **Core Behaviors:**
    *   **Target Prioritization:**
        *   **Tank's Target:** Default behavior is to attack the enemy currently being tanked, ensuring focused damage and efficient enemy elimination.
        *   **High-Priority Adds:** Dynamically switch targets to specific enemy types designated as high-priority (e.g., enemy healers, casters, or dangerous summoned adds) if they pose a greater immediate threat.
    *   **Ability Rotation:** Execute a pre-defined or dynamically optimized sequence of damage-dealing abilities, respecting cooldowns, resource costs (e.g., mana, energy, rage), and spell/attack casting times.
    *   **Offensive Cooldowns:** Utilize powerful offensive cooldowns (e.g., personal damage buffs, group-wide offensive abilities) when available, potentially triggered by boss encounters or specific strong enemies.
    *   **Threat Awareness (Passive):** While not directly controllable, the AI should ideally possess a passive awareness of its generated threat relative to the tank's. In situations where aggro is becoming dangerously high, it might temporarily reduce damage output or delay powerful abilities to avoid pulling aggro from the tank.

### 7.4. General Group AI Considerations

*   **Robust Aggro System:** An underlying, well-tuned aggro system is paramount. Tank abilities must generate significantly more threat than DPS abilities, ensuring that DPS typically cannot "pull aggro" unless there's a substantial discrepancy in gear or the tank is incapacitated.
*   **Line of Sight (LoS) and Range:** Heroes will automatically adjust their movement and positioning to ensure they are within range of their targets for offensive abilities (for Tanks/DPS) or within range of party members for healing/buffing abilities (for Healers/Supports).
*   **Crowd Control Coordination:** If multiple heroes (DPS or Tank) possess similar crowd control abilities (e.g., stuns, interrupts), the AI should implement a basic coordination system to avoid overlapping these effects on the same target, maximizing their utility.

This comprehensive document outlines the core tenets of your game's new 5-man team design, providing a solid blueprint for implementation.










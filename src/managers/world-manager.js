import Phaser from 'phaser';
import { RuntimeEnemyGenerator } from '../generators/runtime-enemy-generator.js';
import { waitForTextureReady } from '../utils/texture-helper.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { Logger } from '../utils/logger.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { GameEvents } from '../utils/event-constants.js';
import { getPlaceholderKey, ensurePlaceholderTexture } from '../utils/placeholder-helper.js';
import { BaseManager } from './base-manager.js';

/**
 * World Manager - Handles all world-related systems
 * Coordinates procedural generation, hero movement, and encounters
 */

export class WorldManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return ['partyManager'];
    }

    /**
     * Create a new WorldManager
     * @param {Phaser.Scene} scene - Phaser scene instance
     * @param {Object} [config] - Optional configuration object for dependency injection
     * @param {Object} [config.worldConfig] - World configuration (defaults to scene cache)
     * @param {RuntimeEnemyGenerator} [config.enemyGenerator] - Enemy generator instance (optional)
     */
    /**
     * Initializes the WorldManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} [config={}] - Optional configuration for dependency injection.
     */
    constructor(scene, config = {}) {
        super(scene, config);
        // Use DataService if available, fallback to direct cache access
        this.dataService = config.dataService || this.scene.dataService || null;
        this.worldConfig = config.worldConfig || this.dataService?.getWorldConfig() || this.scene.cache.json.get('worldConfig');
        this.enemyGenerator = config.enemyGenerator || new RuntimeEnemyGenerator(scene);
        
        // World state
        this.currentSegment = 0;
        this.segments = [];
        this.partyManager = config.partyManager || null; // Changed: this.hero → this.partyManager
        this.hero = null; // Primary hero sprite reference (for movement)
        this.currentMile = 0; // NEW: Track current mile (0-100) for "Road to War"
        this.maxMileReached = 0; // Track highest mile reached for mile selection UI
        this.milestoneRewardsClaimed = new Set(); // Track claimed milestone rewards (Phase 7)
        this.enemies = [];
        this.encounters = [];
        this.combatActive = false;
        this.enemiesInCombat = new Set();
        this.lastCombatTriggerTime = 0; // For debouncing
        
        // Phaser Groups for performance optimization
        // Initialize Groups in create() method after scene is ready
        this.enemySpriteGroup = null;
        this.encounterSpriteGroup = null;
        
        // Performance tracking
        this.segmentPool = [];
        this.enemyPool = [];
        
        // Movement constants
        this.scrollSpeed = this.worldConfig.worldGeneration.scrollSpeed;
        // Use actual viewport dimensions instead of hardcoded config values
        this.updateWorldDimensions();
    }

    /**
     * Initialize the manager
     * @param {Object} partyManager - PartyManager instance (for backward compatibility)
     * @returns {Promise<void>}
     */
    async init(partyManager = null) {
        await super.init();
        if (partyManager) {
            this.partyManager = partyManager;
        }
        if (this.initializeGroups) {
            this.initializeGroups();
        }
        Logger.info('WorldManager', 'Initialized');
    }

    /**
     * Reloads world configuration from the server for hot-reload support.
     * @async
     * @returns {Promise<void>}
     */
    async reloadWorldConfig() {
        try {
            Logger.info('WorldManager', 'Reloading world config...');

            // Reload the JSON data
            await this.scene.cache.json.remove('worldConfig');
            this.scene.load.json('worldConfig', '/data/world-config.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-worldConfig', resolve);
                this.scene.load.start();
            });

            // Update local reference and config values
            this.worldConfig = this.scene.cache.json.get('worldConfig');
            this.scrollSpeed = this.worldConfig.worldGeneration.scrollSpeed;
            this.updateWorldDimensions();

            Logger.info('WorldManager', 'World config reloaded successfully');

        } catch (error) {
            Logger.error('WorldManager', 'Failed to reload world config:', error);
            throw error;
        }
    }

    /**
     * Reloads enemy configuration from the server for hot-reload support.
     * @async
     * @returns {Promise<void>}
     */
    async reloadEnemyData() {
        try {
            Logger.info('WorldManager', 'Reloading enemy data...');

            // Reload the JSON data
            await this.scene.cache.json.remove('enemies');
            this.scene.load.json('enemies', '/data/enemies.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-enemies', resolve);
                this.scene.load.start();
            });

            Logger.info('WorldManager', 'Enemy data reloaded successfully');

        } catch (error) {
            Logger.error('WorldManager', 'Failed to reload enemy data:', error);
            throw error;
        }
    }
    
    /**
     * Updates world segment dimensions based on the current game viewport scale.
     */
    updateWorldDimensions() {
        if (this.scene && this.scene.scale) {
            this.segmentWidth = this.scene.scale.gameSize.width;
            this.segmentHeight = this.scene.scale.gameSize.height;
        } else {
            // Fallback to config values
            this.segmentWidth = this.worldConfig.worldGeneration.segmentWidth;
            this.segmentHeight = this.worldConfig.worldGeneration.segmentHeight;
        }
    }

    /**
     * Converts a segment index into its corresponding mile number.
     * @param {number} segmentIndex - Index of the world segment.
     * @returns {number} The calculated mile number.
     */
    segmentToMile(segmentIndex) {
        const segmentsPerMile = this.worldConfig.roadToWar?.segmentsPerMile || 10;
        return Math.floor(segmentIndex / segmentsPerMile);
    }

    /**
     * Converts a mile number into the starting segment index for that mile.
     * @param {number} mile - Mile number (0-100).
     * @returns {number} Starting segment index.
     */
    mileToSegment(mile) {
        const segmentsPerMile = this.worldConfig.roadToWar?.segmentsPerMile || 10;
        return mile * segmentsPerMile;
    }

    /**
     * Updates the current mile tracking based on segment progression.
     * Emits GameEvents.WORLD.MILE_CHANGED if the mile has incremented.
     */
    updateCurrentMile() {
        const newMile = this.segmentToMile(this.currentSegment);
        const maxMiles = this.worldConfig.roadToWar?.maxMiles || 100;
        
        // Clamp to max miles
        const clampedMile = Math.min(newMile, maxMiles);
        
        if (clampedMile !== this.currentMile) {
            const oldMile = this.currentMile;
            this.currentMile = clampedMile;

            // Update max mile reached
            if (this.currentMile > this.maxMileReached) {
                this.maxMileReached = this.currentMile;
            }
            
            // Check for milestone rewards (Phase 7: Milestone Rewards)
            this.checkMilestoneRewards(oldMile, this.currentMile);
            
            // Fire event for UI updates
            this.scene.events.emit(GameEvents.WORLD.MILE_CHANGED, {
                currentMile: this.currentMile,
                maxMileReached: this.maxMileReached,
                previousMile: oldMile
            });
            
            Logger.debug('WorldManager', `Mile updated: ${oldMile} → ${this.currentMile} (Segment: ${this.currentSegment})`);
        }
    }

    /**
     * Gets the current mile the party is traveling in.
     * @returns {number} Current mile.
     */
    getCurrentMile() {
        return this.currentMile;
    }

    /**
     * Gets the highest mile the party has successfully reached.
     * @returns {number} Maximum mile reached.
     */
    getMaxMileReached() {
        return this.maxMileReached;
    }

    /**
     * Checks if a specific mile can be revisited via the map selection.
     * @param {number} mile - Mile number to check.
     * @returns {boolean} True if revisit is possible.
     */
    canRevisitMile(mile) {
        const maxMiles = this.worldConfig.roadToWar?.maxMiles || 100;
        return mile >= 0 && mile <= this.maxMileReached && mile <= maxMiles;
    }

    /**
     * Initializes Phaser sprite groups for pooling and batching of world objects.
     */
    initializeGroups() {
        if (!this.scene) {
            Logger.warn('WorldManager', 'Cannot initialize Groups: scene not available');
            return;
        }
        
        // Create Groups with pooling support
        this.enemySpriteGroup = this.scene.add.group({
            maxSize: 50,
            createCallback: (sprite) => {
                // Sprite will be created when needed
            },
            removeCallback: (sprite) => {
                // Cleanup when sprite is removed
                if (sprite) {
                    sprite.setActive(false);
                    sprite.setVisible(false);
                }
            }
        });
        
        this.encounterSpriteGroup = this.scene.add.group({
            maxSize: 20,
            createCallback: (sprite) => {
                // Sprite will be created when needed
            },
            removeCallback: (sprite) => {
                if (sprite) {
                    sprite.setActive(false);
                    sprite.setVisible(false);
                }
            }
        });
        
        Logger.info('WorldManager', 'Phaser Groups initialized');
    }

    /**
     * Initializes the world management system with a party manager.
     * @param {Object} partyManager - PartyManager instance to coordinate with.
     */
    init(partyManager) {
        this.partyManager = partyManager;
        // Ensure dimensions are up to date before generating segments
        this.updateWorldDimensions();
        this.generateInitialSegments();
        this.setupEventListeners();
        
        // Initialize Groups if scene is ready
        if (this.scene && this.scene.add) {
            this.initializeGroups();
        }
        
        // Initialize mile from current segment (for backward compatibility)
        this.updateCurrentMile();
        
        Logger.info('WorldManager', 'World initialized with party');
    }

    /**
     * Generates the initial set of world segments for preloading.
     */
    generateInitialSegments() {
        const segmentsToGenerate = this.worldConfig.worldGeneration.segmentsToPreload;
        
        for (let i = 0; i < segmentsToGenerate; i++) {
            this.generateSegment(i);
        }
        
        Logger.info('WorldManager', `Generated ${segmentsToGenerate} initial segments`);
    }

    /**
     * Procedurally generates a single world segment including terrain, enemies, and encounters.
     * @param {number} segmentIndex - Index of the segment to generate.
     * @returns {Object} The generated segment object.
     */
    generateSegment(segmentIndex) {
        const segment = {
            index: segmentIndex,
            x: segmentIndex * this.segmentWidth,
            enemies: [],
            encounters: [],
            type: this.determineSegmentType(segmentIndex),
            generated: false
        };

        // Check for boss segment
        const isBossSegment = this.isBossSegment(segmentIndex);
        
        // Generate enemies for segment
        this.generateSegmentEnemies(segment, segmentIndex, isBossSegment);

        // Generate encounters for segment
        this.generateSegmentEncounters(segment, segmentIndex, isBossSegment);

        this.segments[segmentIndex] = segment;
        return segment;
    }
    
    /**
     * Determines if a segment should contain a boss encounter based on mile progression.
     * @param {number} segmentIndex - Index of the segment.
     * @returns {boolean} True if it is a boss segment.
     */
    isBossSegment(segmentIndex) {
        const bossSpawnIntervalMiles = this.worldConfig.roadToWar?.bossSpawnIntervalMiles || 5;
        const mile = this.currentMile;
        
        // Milestone bosses at miles 25, 50, 75, 100 (Phase 3: Endgame Content)
        const milestoneMiles = [25, 50, 75, 100];
        if (milestoneMiles.includes(mile)) {
            return true;
        }
        
        // Regular boss spawns every N miles (e.g., every 5 miles)
        return mile > 0 && mile % bossSpawnIntervalMiles === 0;
    }
    
    /**
     * Procedurally generates enemies for a specific world segment.
     * @param {Object} segment - Target segment object.
     * @param {number} segmentIndex - Index of the segment.
     * @param {boolean} isBossSegment - Whether this segment is designated for a boss.
     */
    generateSegmentEnemies(segment, segmentIndex, isBossSegment) {
        if (isBossSegment && Math.random() < (this.worldConfig.encounters.bossSpawnChance || 1.0)) {
            // Spawn boss enemy (only one boss per segment)
            const boss = this.createEnemy(segmentIndex, 0, true);
            if (boss) {
                segment.enemies.push(boss);
                this.enemies.push(boss);
                segment.isBossSegment = true;
            }
        } else {
            // Regular enemy spawning - ensure at least some enemies spawn in early segments
            // Increased spawn chance: 100% for first 5 segments, then 80% (was 40%)
            const spawnChance = segmentIndex < 5 ? 1.0 : Math.min(0.8, this.worldConfig.encounters.enemySpawnChance * 2);
            const roll = Math.random();
            if (roll < spawnChance) {
                // Increased enemy count: 3-8 enemies per segment (was 1-3)
                const baseEnemyCount = 3;
                const randomEnemyCount = Math.floor(Math.random() * 6); // 0-5 additional enemies
                const enemyCount = baseEnemyCount + randomEnemyCount; // 3-8 enemies
                for (let i = 0; i < enemyCount; i++) {
                    const enemy = this.createEnemy(segmentIndex, i, false);
                    if (enemy) {
                        // For segment 0, place first enemy in middle of viewport for testing
                        if (segmentIndex === 0 && i === 0) {
                            const viewportWidth = this.segmentWidth;
                            enemy.x = viewportWidth / 2; // Middle of screen
                            Logger.debug('WorldManager', `Enemy placed in middle: ${enemy.id} at x=${enemy.x}`);
                        }
                        segment.enemies.push(enemy);
                        this.enemies.push(enemy);
                        Logger.debug('WorldManager', `Enemy created: ${enemy.id} at x=${enemy.x}, y=${enemy.y}, segment=${segmentIndex}, active=${enemy.active}`);
                        
                        // Immediately create sprite for first enemy in segment 0 for testing
                        if (segmentIndex === 0 && i === 0 && !enemy.sprite && !enemy.spriteCreating) {
                            enemy.spriteCreating = true;
                            this.createEnemySprite(enemy);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Procedurally generates encounters (shops, treasures, elite enemies) for a segment.
     * @param {Object} segment - Target segment object.
     * @param {number} segmentIndex - Index of the segment.
     * @param {boolean} isBossSegment - Whether this segment already contains a boss.
     */
    generateSegmentEncounters(segment, segmentIndex, isBossSegment) {
        // Don't spawn regular encounters on boss segments to avoid clutter
        if (!isBossSegment) {
            const rand = Math.random();

            if (rand < this.worldConfig.encounters.eliteEnemySpawnChance) {
                // Elite enemy encounters (rare, high-reward)
                const encounter = this.createEliteEnemyEncounter(segmentIndex);
                segment.encounters.push(encounter);
                this.encounters.push(encounter);
            } else if (rand < this.worldConfig.encounters.eliteEnemySpawnChance + this.worldConfig.encounters.bossSpawnChance) {
                // Boss encounters (very rare, epic rewards)
                const encounter = this.createBossEncounter(segmentIndex);
                segment.encounters.push(encounter);
                this.encounters.push(encounter);
            } else if (rand < this.worldConfig.encounters.eliteEnemySpawnChance + this.worldConfig.encounters.bossSpawnChance + this.worldConfig.encounters.resourceNodeSpawnChance) {
                // Resource nodes for gathering materials
                const encounter = this.createResourceNodeEncounter(segmentIndex);
                segment.encounters.push(encounter);
                this.encounters.push(encounter);
            } else if (rand < this.worldConfig.encounters.eliteEnemySpawnChance + this.worldConfig.encounters.bossSpawnChance + this.worldConfig.encounters.resourceNodeSpawnChance + this.worldConfig.encounters.explorationEventSpawnChance) {
                // Exploration events (discoveries, random events)
                const encounter = this.createExplorationEventEncounter(segmentIndex);
                segment.encounters.push(encounter);
                this.encounters.push(encounter);
            } else if (rand < this.worldConfig.encounters.eliteEnemySpawnChance + this.worldConfig.encounters.bossSpawnChance + this.worldConfig.encounters.resourceNodeSpawnChance + this.worldConfig.encounters.explorationEventSpawnChance + this.worldConfig.encounters.choiceEncounterSpawnChance) {
                // Choice-based encounters
                const encounter = this.createChoiceEncounter(segmentIndex);
                segment.encounters.push(encounter);
                this.encounters.push(encounter);
            } else if (rand < this.worldConfig.encounters.eliteEnemySpawnChance + this.worldConfig.encounters.bossSpawnChance + this.worldConfig.encounters.resourceNodeSpawnChance + this.worldConfig.encounters.explorationEventSpawnChance + this.worldConfig.encounters.choiceEncounterSpawnChance + this.worldConfig.encounters.shopSpawnChance) {
                // Traditional shop encounters
                const encounter = this.createShopEncounter(segmentIndex);
                segment.encounters.push(encounter);
                this.encounters.push(encounter);
            } else if (rand < this.worldConfig.encounters.eliteEnemySpawnChance + this.worldConfig.encounters.bossSpawnChance + this.worldConfig.encounters.resourceNodeSpawnChance + this.worldConfig.encounters.explorationEventSpawnChance + this.worldConfig.encounters.choiceEncounterSpawnChance + this.worldConfig.encounters.shopSpawnChance + this.worldConfig.encounters.treasureSpawnChance) {
                // Traditional treasure encounters
                const encounter = this.createTreasureEncounter(segmentIndex);
                segment.encounters.push(encounter);
                this.encounters.push(encounter);
            }
        }
    }

    /**
     * Gets the current biome type based on the current mile.
     * @returns {string} Biome type.
     */
    getCurrentBiomeType() {
        return this.determineSegmentType(this.currentSegment);
    }

    /**
     * Selects the terrain biome type for a segment based on mile progression.
     * @param {number} segmentIndex - Index of the segment.
     * @returns {string} The biome type (e.g., 'plains', 'forest', 'mountains').
     */
    determineSegmentType(segmentIndex) {
        // Use current mile for terrain progression
        const mile = this.currentMile;
        
        // Terrain progression based on miles (with town/city biomes)
        if (mile < 3) return 'plains';
        if (mile < 8) return 'forest';
        if (mile >= 8 && mile < 12) {
            // Forest towns appear in mile 8-12 range
            // 30% chance for town, otherwise regular forest
            return Math.random() < 0.3 ? 'forest_town' : 'forest';
        }
        if (mile < 20) return 'mountains';
        if (mile >= 20 && mile < 30) {
            // Cities appear in mile 20-30 range
            // 40% chance for city, otherwise mountains
            return Math.random() < 0.4 ? 'city' : 'mountains';
        }
        return 'dark_lands';
    }

    /**
     * Selects an appropriate enemy type ID based on weighted randomness and mile progression.
     * @param {number} segmentIndex - Index of the segment.
     * @param {boolean} [isBossSegment=false] - Whether to select a boss type.
     * @returns {string} The selected enemy ID.
     */
    selectEnemyType(segmentIndex, isBossSegment = false) {
        const mile = this.currentMile;
        
        // Boss spawning logic based on miles (Phase 3: Endgame Content)
        if (isBossSegment) {
            // Milestone bosses at miles 25, 50, 75, 100
            if (mile >= 100) {
                return 'war_lord'; // Final boss at mile 100
            } else if (mile >= 75) {
                return Math.random() < 0.6 ? 'dragon' : 'dark_knight';
            } else if (mile >= 50) {
                return Math.random() < 0.5 ? 'dark_knight' : 'dragon';
            } else if (mile >= 25) {
                return 'dark_knight';
            } else if (mile >= 10) {
                return 'dark_knight';
            } else {
                // Early bosses
                return 'dark_knight';
            }
        }
        
        // Regular enemy selection with weighted random based on mile progression
        // 1 mile = 1 level
        const baseLevel = mile + 1;
        
        // Endgame enemy types (Phase 3: Endgame Content)
        if (mile >= 90 && mile < 100) {
            // Miles 90-100: Dark Knight (endgame enemy)
            return Math.random() < 0.7 ? 'dark_knight' : 'elite_orc_champion';
        } else if (mile >= 80 && mile < 90) {
            // Miles 80-90: Elite Orc Champion
            return Math.random() < 0.6 ? 'elite_orc_champion' : 'orc';
        }
        
        // Define enemy weights based on segment progression
        // Earlier segments favor weaker enemies, later segments favor stronger ones
        const slimeWeight = Math.max(0.1, 1.0 - (baseLevel * 0.15));
        // Goblin: common in mid-early segments
        const goblinWeight = baseLevel <= 3 ? 0.5 : Math.max(0.2, 0.8 - ((baseLevel - 3) * 0.1));
        // Orc: appears more as progression increases
        const orcWeight = baseLevel >= 2 ? Math.min(0.6, 0.2 + ((baseLevel - 2) * 0.1)) : 0;
        
        // Normalize weights
        const totalWeight = slimeWeight + goblinWeight + orcWeight;
        
        const random = Math.random() * totalWeight;
        let currentWeight = 0;
        
        if (random < (currentWeight += slimeWeight * (1 / totalWeight))) {
            return 'slime';
        } else if (random < (currentWeight += goblinWeight * (1 / totalWeight))) {
            return 'goblin';
        } else {
            return 'orc';
        }
    }

    /**
     * Scales base enemy statistics (HP, ATK, rewards) according to the target mile.
     * @param {Object} enemyData - Base enemy definition.
     * @param {number} mile - Target mile for scaling.
     * @returns {Object} Deep-copied and scaled enemy data.
     */
    scaleEnemyStats(enemyData, mile) {
        const scaling = this.worldConfig.difficultyScaling;
        const baseLevel = enemyData.level || 1;
        
        // Calculate effective level based on mile progression
        // 1 mile = 1 level, but capped at maxEnemyLevel
        const mileLevel = mile + 1; // Mile 0 = Level 1, Mile 50 = Level 51
        const effectiveLevel = Math.min(
            baseLevel + mileLevel - 1,
            scaling.maxEnemyLevel
        );
        
        // Only scale if level increased
        if (effectiveLevel <= baseLevel) {
            return { ...enemyData };
        }
        
        const levelDiff = effectiveLevel - baseLevel;
        const statsPerLevel = scaling.statsPerEnemyLevel;
        
        // Create scaled copy
        const scaledData = JSON.parse(JSON.stringify(enemyData));
        
        // Reduce health scaling for first 5 segments (miles 0-4) to make combat faster
        // Health multiplier: 0.3 for miles 0-4 (70% reduction), 1.0 for miles 5+
        const healthMultiplier = mile < 5 ? 0.3 : 1.0;
        
        // Scale stats
        scaledData.level = effectiveLevel;
        scaledData.stats.maxHealth = Math.floor(enemyData.stats.maxHealth + (levelDiff * statsPerLevel.health * healthMultiplier));
        scaledData.stats.health = scaledData.stats.maxHealth;
        scaledData.stats.attack = Math.floor(enemyData.stats.attack + (levelDiff * statsPerLevel.attack));
        scaledData.stats.defense = Math.floor(enemyData.stats.defense + (levelDiff * statsPerLevel.defense));
        
        
        // Scale rewards
        const expMultiplier = 1 + (levelDiff * 0.1);
        const goldMultiplier = 1 + (levelDiff * 0.1);
        scaledData.rewards.experience = Math.floor(enemyData.rewards.experience * expMultiplier);
        scaledData.rewards.gold = Math.floor(enemyData.rewards.gold * goldMultiplier);
        
        return scaledData;
    }

    /**
     * Creates or reuses an enemy logical object for a segment.
     * @param {number} segmentIndex - Index of the segment.
     * @param {number} enemyIndex - Sequential index of enemy in that segment.
     * @param {boolean} [isBoss=false] - Whether to create a boss enemy.
     * @returns {Object} Initialized enemy state object.
     */
    createEnemy(segmentIndex, enemyIndex, isBoss = false) {
        // Try to reuse from pool (but not for bosses)
        let enemy = isBoss ? null : this.getEnemyFromPool();
        
        // Calculate baseX directly from segmentIndex (segment may not be in segments array yet)
        // Position enemies within the segment, offset from segment start
        // Use dynamic spacing to fit more enemies: distribute evenly across segment width
        const segmentStartX = segmentIndex * this.segmentWidth;
        const spacing = Math.max(80, (this.segmentWidth - 400) / 8); // Min 80px spacing, distribute across segment
        const baseX = segmentStartX + 200 + (enemyIndex * spacing);
        
        // Select enemy type based on progression
        const enemyType = this.selectEnemyType(segmentIndex, isBoss);
        const enemiesData = this.scene.cache.json.get('enemies');
        const baseEnemyData = enemiesData[enemyType];
        
        if (!baseEnemyData) {
            Logger.error('WorldManager', `Enemy type not found: ${enemyType}`);
            return null;
        }
        
        // Scale enemy stats based on segment progression
        // Use current mile for difficulty scaling
        const enemyData = this.scaleEnemyStats(baseEnemyData, this.currentMile);
        
        if (enemy) {
            // Reuse existing enemy
            enemy.id = enemyType;
            enemy.x = baseX;
            // Scale enemy Y position relative to viewport height
            const baseHeight = 768;
            const baseYOffset = 150;
            const scaleY = this.segmentHeight / baseHeight;
            enemy.y = this.segmentHeight - (baseYOffset * scaleY);
            enemy.data = { ...enemyData };
            // Ensure currentHealth is set
            if (!enemy.data.currentHealth) {
                enemy.data.currentHealth = enemy.data.stats?.health || enemy.data.stats?.maxHealth || 100;
            }
            enemy.active = true; // Activate when reusing
            enemy.defeated = false;
            enemy.isBoss = isBoss;
            enemy.spriteCreating = false; // Reset flag when reusing
        } else {
            // Create new enemy
            enemy = {
                id: enemyType,
                x: baseX,
                y: this.segmentHeight - (150 * (this.segmentHeight / 768)),
                data: { ...enemyData },
                active: true, // Activate immediately so they're visible
                defeated: false,
                sprite: null,
                spriteCreating: false, // Initialize flag
                isBoss: isBoss
            };
            // Ensure currentHealth is set
            if (!enemy.data.currentHealth) {
                enemy.data.currentHealth = enemy.data.stats?.health || enemy.data.stats?.maxHealth || 100;
            }
        }

        return enemy;
    }

    /**
     * Retrieves an inactive enemy state object from the pool for reuse.
     * @returns {Object|null} Pooled enemy object or null if pool is empty.
     */
    getEnemyFromPool() {
        if (this.enemyPool.length > 0) {
            return this.enemyPool.pop();
        }
        return null;
    }

    /**
     * Deactivates an enemy and returns its state object to the pool.
     * Also handles sprite cleanup and label destruction.
     * @param {Object} enemy - Enemy object to return.
     */
    returnEnemyToPool(enemy) {
        if (enemy.sprite) {
            // Kill sprite instead of destroying (makes it available for Group pooling)
            if (this.enemySpriteGroup && this.enemySpriteGroup.contains(enemy.sprite)) {
                enemy.sprite.setActive(false);
                enemy.sprite.setVisible(false);
                // Sprite is now "dead" and can be reused via getFirstDead()
            } else {
                // Not in group, destroy it
                enemy.sprite.destroy();
            }
            enemy.sprite = null;
        }
        
        // Remove boss label if exists
        if (enemy.bossLabel) {
            enemy.bossLabel.destroy();
            enemy.bossLabel = null;
        }
        
        // Remove name label if exists
        if (enemy.nameLabel) {
            enemy.nameLabel.destroy();
            enemy.nameLabel = null;
        }
        
        enemy.active = false;
        enemy.defeated = false;
        
        // Don't pool boss enemies (they're special)
        if (enemy.isBoss) {
            return;
        }
        
        // Limit pool size
        if (this.enemyPool.length < 20) {
            this.enemyPool.push(enemy);
        }
    }

    /**
     * Creates a shop encounter definition for a segment.
     * @param {number} segmentIndex - Target segment index.
     * @returns {Object} Shop encounter data object.
     */
    createShopEncounter(segmentIndex) {
        // Calculate x directly from segmentIndex (segment may not be in segments array yet)
        const segmentX = segmentIndex * this.segmentWidth;
        
        return {
            type: 'shop',
            x: segmentX + this.segmentWidth / 2,
            y: this.segmentHeight - (100 * (this.segmentHeight / 768)),
            segmentIndex: segmentIndex,
            active: false,
            sprite: null
        };
    }

    /**
     * Creates a treasure encounter definition for a segment.
     * @param {number} segmentIndex - Target segment index.
     * @returns {Object} Treasure encounter data object.
     */
    createTreasureEncounter(segmentIndex) {
        // Calculate x directly from segmentIndex (segment may not be in segments array yet)
        const segmentX = segmentIndex * this.segmentWidth;

        return {
            type: 'treasure',
            x: segmentX + this.segmentWidth / 2 + Math.random() * 200 - 100,
            y: this.segmentHeight - (100 * (this.segmentHeight / 768)),
            segmentIndex: segmentIndex,
            active: false,
            sprite: null,
            value: Math.floor(Math.random() * 100) + 50 // 50-150 gold
        };
    }

    /**
     * Creates an elite enemy encounter definition for a segment.
     * @param {number} segmentIndex - Target segment index.
     * @returns {Object} Elite enemy encounter data object.
     */
    createEliteEnemyEncounter(segmentIndex) {
        const segmentX = segmentIndex * this.segmentWidth;

        return {
            type: 'elite_enemy',
            x: segmentX + this.segmentWidth / 2 + Math.random() * 150 - 75,
            y: this.segmentHeight - (120 * (this.segmentHeight / 768)),
            segmentIndex: segmentIndex,
            active: false,
            sprite: null,
            levelBonus: 3, // +3 levels above current
            goldMultiplier: 2.5, // 2.5x gold
            lootQuality: 'rare' // Better item drops
        };
    }

    /**
     * Creates a boss encounter definition for a segment.
     * @param {number} segmentIndex - Target segment index.
     * @returns {Object} Boss encounter data object.
     */
    createBossEncounter(segmentIndex) {
        const segmentX = segmentIndex * this.segmentWidth;

        return {
            type: 'boss',
            x: segmentX + this.segmentWidth / 2,
            y: this.segmentHeight - (150 * (this.segmentHeight / 768)),
            segmentIndex: segmentIndex,
            active: false,
            sprite: null,
            levelBonus: 5, // +5 levels above current
            goldMultiplier: 5.0, // 5x gold
            lootQuality: 'epic', // Epic item drops
            mechanics: ['aoe_damage', 'phase_changes'] // Special boss mechanics
        };
    }

    /**
     * Creates a resource node encounter definition for a segment.
     * @param {number} segmentIndex - Target segment index.
     * @returns {Object} Resource node encounter data object.
     */
    createResourceNodeEncounter(segmentIndex) {
        const segmentX = segmentIndex * this.segmentWidth;

        // Random resource type
        const resourceTypes = ['ore', 'herbs', 'leather', 'cloth'];
        const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];

        return {
            type: 'resource_node',
            x: segmentX + this.segmentWidth / 2 + Math.random() * 200 - 100,
            y: this.segmentHeight - (80 * (this.segmentHeight / 768)),
            segmentIndex: segmentIndex,
            active: false,
            sprite: null,
            resourceType: resourceType,
            yield: Math.floor(Math.random() * 5) + 3, // 3-7 resources
            quality: Math.random() < 0.2 ? 'rare' : 'common' // 20% chance for rare
        };
    }

    /**
     * Creates an exploration event encounter definition for a segment.
     * @param {number} segmentIndex - Target segment index.
     * @returns {Object} Exploration event data object.
     */
    createExplorationEventEncounter(segmentIndex) {
        const segmentX = segmentIndex * this.segmentWidth;

        const eventTypes = [
            'ancient_ruins',
            'mysterious_cave',
            'abandoned_camp',
            'magical_spring',
            'forgotten_tomb'
        ];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        return {
            type: 'exploration_event',
            x: segmentX + this.segmentWidth / 2 + Math.random() * 300 - 150,
            y: this.segmentHeight - (100 * (this.segmentHeight / 768)),
            segmentIndex: segmentIndex,
            active: false,
            sprite: null,
            eventType: eventType,
            discovered: false
        };
    }

    /**
     * Creates a choice-based encounter definition for a segment.
     * @param {number} segmentIndex - Target segment index.
     * @returns {Object} Choice encounter data object.
     */
    createChoiceEncounter(segmentIndex) {
        const segmentX = segmentIndex * this.segmentWidth;

        const choiceTypes = [
            'merchant_dilemma',
            'moral_choice',
            'strategic_decision',
            'alliance_offer',
            'mysterious_stranger'
        ];
        const choiceType = choiceTypes[Math.floor(Math.random() * choiceTypes.length)];

        return {
            type: 'choice_encounter',
            x: segmentX + this.segmentWidth / 2 + Math.random() * 250 - 125,
            y: this.segmentHeight - (110 * (this.segmentHeight / 768)),
            segmentIndex: segmentIndex,
            active: false,
            sprite: null,
            choiceType: choiceType,
            resolved: false
        };
    }

    /**
     * Main update loop for the world management system.
     * Orchestrates movement, AI updates, segment generation, and cleanup.
     */
    update() {
        // Update hero position (automatic movement)
        this.updateHeroMovement();
        
        // Update enemies
        this.updateEnemies();
        
        // Update encounters
        this.updateEncounters();
        
        // Check for new segment generation
        this.checkSegmentGeneration();
        
        // Clean up off-screen objects
        this.cleanupOffscreenObjects();
    }

    /**
     * Calculates current animation progress for a sprite.
     * @param {Phaser.GameObjects.Sprite} sprite - Target sprite.
     * @returns {number} Animation progress (0.0 to 1.0).
     */
    getAnimationProgress(sprite) {
        if (!sprite || !sprite.anims || !sprite.anims.currentAnim) {
            return 0;
        }
        const anim = sprite.anims.currentAnim;
        return anim.progress || 0;
    }
    
    /**
     * Retrieves detailed information about a sprite's current animation.
     * @param {Phaser.GameObjects.Sprite} sprite - Target sprite.
     * @returns {Object|null} Animation info (frameRate, duration, frameCount) or null.
     */
    getAnimationInfo(sprite) {
        if (!sprite || !sprite.anims || !sprite.anims.currentAnim) {
            return null;
        }
        const anim = sprite.anims.currentAnim;
        const frameRate = anim.frameRate || 12;
        const frameCount = anim.frames.length || 8;
        const duration = frameCount / frameRate; // seconds
        return { frameRate, duration, frameCount };
    }
    
    /**
     * Calculates step-based velocity to ensure physical distance matches animation speed.
     * @param {Phaser.GameObjects.Sprite} sprite - Hero sprite.
     * @param {number} baseSpeed - Configured base scroll speed.
     * @returns {number} Adjusted velocity value.
     */
    calculateStepBasedVelocity(sprite, baseSpeed) {
        // Check if walk animation is playing
        const currentAnim = sprite.anims?.currentAnim;
        if (!currentAnim || !currentAnim.key.includes('walk')) {
            return baseSpeed; // Not walking, use base speed
        }
        
        // Get animation info
        const animationInfo = this.getAnimationInfo(sprite);
        if (!animationInfo) {
            return baseSpeed; // Can't get animation info, use base speed
        }
        
        // One complete animation cycle moves the hero forward by baseSpeed * duration
        return baseSpeed;
    }
    
    /**
     * Updates the automatic forward movement of the primary hero.
     * Handles Ground-level clamping and combat state pauses.
     */
    updateHeroMovement() {
        if (!this.hero || !this.hero.body) return;
        
        // Don't move if combat is active
        if (this.combatActive) {
            this.hero.body.setVelocityX(0);
            return;
        }
        
        // IMPORTANT: Arcade physics uses different coordinate spaces:
        // - sprite.x is the display object's position (center with origin 0.5)
        // - body.x is the physics body's top-left
        // Setting both to the same value causes oscillation ("bouncing") as Phaser re-syncs them.
        // Keep the tank position stable by operating in sprite-space and using body.reset().
        const currentX = this.hero.x;
        const currentY = this.hero.y;
        if (this._prevTankX === undefined) {
            this._prevTankX = currentX;
        }
        if (currentX < this._prevTankX) {
            // Never allow backward movement of the tank
            this.hero.body.reset(this._prevTankX, currentY);
        }
        
        // SIMPLE SOLUTION: Direct position-based movement instead of velocity
        // This bypasses Phaser's physics step which was causing backward jumps
        const deltaTime = this.scene.game.loop.delta || 16;
        let moveDistance = (this.scrollSpeed * deltaTime) / 1000;
        
        // Try step-based movement if hero has walk animation
        if (this.hero.anims && this.hero.anims.currentAnim) {
            const stepVelocity = this.calculateStepBasedVelocity(this.hero, this.scrollSpeed);
            moveDistance = (stepVelocity * deltaTime) / 1000;
        }
        
        // Calculate new position from previous position (sprite-space)
        const baseX = this._prevTankX !== undefined ? this._prevTankX : this.hero.x;
        const newX = baseX + moveDistance;

        // Keep hero at ground level
        // Scale hero Y position relative to viewport height
        const baseHeight = 768;
        const baseYOffset = 150;
        const scaleY = this.segmentHeight / baseHeight;
        const groundY = this.segmentHeight - (baseYOffset * scaleY);
        
        // Keep Y stable in sprite-space (same rule as X).
        // body.y is top-left while sprite.y is origin-based; forcing them to the same value causes bounce.
        const maxYChangePerFrame = 5;
        const minY = groundY - 100;
        const clampedCurrentY = Math.max(currentY, minY);
        const yDelta = groundY - clampedCurrentY;
        let newY = clampedCurrentY;
        if (Math.abs(yDelta) > 5) {
            newY = clampedCurrentY + Math.sign(yDelta) * Math.min(Math.abs(yDelta), maxYChangePerFrame);
        }

        // Apply movement once per frame via reset() to keep sprite/body alignment correct.
        this.hero.body.reset(newX, newY);
        this.hero.body.setVelocity(0, 0);

        // Update previous position tracker
        this._prevTankX = newX;

        // Emit hero_moved event for loot pickup system
        if (this.scene?.events) {
            this.scene.events.emit('hero_moved', this.hero);
        }
    }

    /**
     * Updates all enemies in the world.
     * Manages sprite creation, proximity AI, and collision detection with the hero.
     */
    updateEnemies() {
        // Cache hero position and combat state for performance
        const heroX = this.hero?.x ?? 100;
        const isCombatActive = this.combatActive;
        const enemyCount = this.enemies.length;
        
        // Use for loop for better performance with large arrays
        for (let i = 0; i < enemyCount; i++) {
            const enemy = this.enemies[i];
            
            // Always create sprites for enemies that don't have one
            // This ensures all enemies are visible
            // Check both sprite existence and creation-in-progress flag to prevent duplicate calls
            if (!enemy.sprite && !enemy.spriteCreating) {
                enemy.spriteCreating = true; // Mark as in progress
                this.createEnemySprite(enemy);
                Logger.debug('WorldManager', `Enemy sprite creation started: ${enemy.id} at x=${enemy.x}, y=${enemy.y}, heroX=${heroX}`);
            }
            
            if (!enemy.sprite || !enemy.active) continue;
            
            // Don't move enemies if combat is active or if this enemy is in combat
            if (isCombatActive || this.enemiesInCombat.has(enemy.id)) {
                if (enemy.sprite.body) {
                    enemy.sprite.body.setVelocityX(0);
                }
                continue;
            }
            
            // Simple AI: move towards hero when in range
            // Use sprite position for consistency
            const enemyX = enemy.sprite.x;
            const distance = Math.abs(enemyX - heroX);
            if (enemy.sprite.body) {
                if (distance < 300) {
                    const direction = enemyX < heroX ? 1 : -1;
                    enemy.sprite.body.setVelocityX(direction * 20);
                } else {
                    enemy.sprite.body.setVelocityX(0);
                }
            }
            
            // Keep enemy data position in sync with sprite position
            enemy.x = enemyX;
            
            // Check collision with hero, only if not already in combat
            if (!isCombatActive && this.checkHeroEnemyCollision(enemy)) {
                this.triggerCombat(enemy);
            }
        }
    }

    /**
     * Determines if an enemy's logical position is within the rendering viewport.
     * @param {Object} enemy - Enemy state object.
     * @returns {boolean} True if the enemy should be rendered.
     */
    isEnemyInView(enemy) {
        if (!this.hero) return false;
        // Get hero x position from sprite if available, otherwise use direct property
        const heroX = this.hero.sprite?.x ?? this.hero.x ?? 100;
        const distance = Math.abs(enemy.x - heroX);
        // Render enemies within 1200 pixels (increased from 800 for better visibility)
        const inView = distance < 1200;
        if (!inView && enemy.x < heroX + 1500) {
            // Also render enemies slightly ahead of hero for better visibility
            return true;
        }
        return inView;
    }

    /**
     * Orchestrates the visual creation of an enemy sprite.
     * Handles procedural texture generation and placeholder fallbacks.
     * @param {Object} enemy - Enemy state object.
     */
    createEnemySprite(enemy) {
        if (!enemy.data) {
            Logger.error('WorldManager', 'Enemy missing data:', enemy);
            return;
        }
        
        const textureKey = `enemy_${enemy.data.id}`;
        const isBoss = enemy.isBoss || enemy.data.type === 'boss';
        const placeholderKey = getPlaceholderKey(this.scene, 'enemy');
        const size = this.enemyGenerator.getSize(enemy.data.appearance?.size || 'medium');
        const colorHex = enemy.data.appearance?.color || '#ff0000';
        const parsedColor = parseInt(String(colorHex).replace('#', ''), 16);
        const color = Number.isFinite(parsedColor) ? parsedColor : 0xff0000;

        // Generate sprite texture if it does not already exist. Use the returned
        // key because the generator may fall back to a placeholder when the
        // texture cache fails to register synchronously.
        let spriteKey = textureKey;
        const textureExists = this.scene.textures.exists(textureKey);
        if (!textureExists) {
            try {
                spriteKey = this.enemyGenerator.generate(enemy.data, enemy.data.id) || placeholderKey;
                Logger.debug('WorldManager', `Generated enemy texture: ${spriteKey}`);
                
                // Check if texture is now in cache after generation
                const textureNowExists = this.scene.textures.exists(spriteKey);
                
                // If texture still doesn't exist, wait one frame and try again
                if (!textureNowExists && spriteKey !== placeholderKey) {
                    this.scene.time.delayedCall(16, () => {
                        const stillMissing = !this.scene.textures.exists(spriteKey);
                        if (stillMissing) {
                            // Texture generation failed - use placeholder
                            const fallbackKey = ensurePlaceholderTexture(this.scene, {
                                key: placeholderKey,
                                width: size,
                                height: size,
                                color: color,
                                borderColor: 0xffffff
                            });
                            this.createSpriteFromTexture(enemy, fallbackKey, size, isBoss, placeholderKey, color);
                            return;
                        }
                        // Texture now exists - create sprite directly
                        this.createSpriteFromTexture(enemy, spriteKey, size, isBoss, placeholderKey, color);
                    });
                    return;
                }
                
                // Texture exists immediately - create sprite directly
                if (textureNowExists) {
                    this.createSpriteFromTexture(enemy, spriteKey, size, isBoss, placeholderKey, color);
                    return;
                }
            } catch (error) {
                Logger.error('WorldManager', `Failed to generate enemy texture for ${enemy.data.id}:`, error);
                // If generation fails, clear the flag and use placeholder fallback
                const fallbackKey = ensurePlaceholderTexture(this.scene, {
                    key: placeholderKey,
                    width: size,
                    height: size,
                    color: color,
                    borderColor: 0xffffff
                });
                this.createSpriteFromTexture(enemy, fallbackKey, size, isBoss, placeholderKey, color);
                return;
            }
        }
        
        // Wait for texture to be ready (will retry if not in cache yet)
        // generateTexture() adds texture to cache, but waitForTextureReady handles retries
        waitForTextureReady(this.scene, spriteKey, () => {
            this.createSpriteFromTexture(enemy, spriteKey, size, isBoss, placeholderKey, color);
        });
    }
    
    /**
     * Finalizes sprite creation and adds it to the physics world and pooling group.
     * @param {Object} enemy - Enemy logical state.
     * @param {string} spriteKey - Validated texture key.
     * @param {number} size - Target display size.
     * @param {boolean} isBoss - Boss status for scaling and effects.
     * @param {string} placeholderKey - Fallback key.
     * @param {number} [color=0xff0000] - Tint color for fallback.
     */
    createSpriteFromTexture(enemy, spriteKey, size, isBoss, placeholderKey, color = 0xff0000) {
        // Double-check sprite wasn't created by another call
        if (enemy.sprite) {
            enemy.spriteCreating = false;
            return;
        }
        
        // Try to get a dead sprite from Group for pooling, or create new one
        let sprite = null;
        let poolHit = false;
        if (this.enemySpriteGroup) {
            sprite = this.enemySpriteGroup.getFirstDead(false);
            if (sprite) {
                poolHit = true;
                // Track pool usage for statistics
                if (this.scene.memoryMonitor) {
                    this.scene.memoryMonitor.trackPoolUsage('enemySprites', true);
                }
            } else {
                if (this.scene.memoryMonitor) {
                    this.scene.memoryMonitor.trackPoolUsage('enemySprites', false);
                }
            }
        }
        
        const textureReady = this.scene.textures.exists(spriteKey);
        if (textureReady) {
                if (!sprite) {
                    // Create new sprite
                    sprite = this.scene.add.sprite(enemy.x, enemy.y, spriteKey);
                } else {
                    // Reuse pooled sprite
                    sprite.setTexture(spriteKey);
                    sprite.setPosition(enemy.x, enemy.y);
                    sprite.setActive(true);
                    sprite.setVisible(true);
                }
                sprite.setOrigin(0.5, 0.5);
                
                // Set display size to ensure sprite is visible
                sprite.setDisplaySize(size, size);
                
                // Boss enemies are larger
                if (isBoss) {
                    sprite.setScale(1.5);
                }
                
                // Set depth using depth layer constant
                sprite.setDepth(200); // DEPTH_LAYERS.ENEMIES
                sprite.setVisible(true);
                sprite.setActive(true);
                sprite.setAlpha(1.0); // Ensure fully opaque
                
                // Add to Group if not already added
                if (this.enemySpriteGroup && !this.enemySpriteGroup.contains(sprite)) {
                    this.enemySpriteGroup.add(sprite);
                }
                
                // Enable physics if needed
                if (!sprite.body) {
                    this.scene.physics.add.existing(sprite);
                }
                if (sprite.body) {
                    sprite.body.setCollideWorldBounds(false);
                }
                
                // Store sprite reference
                enemy.sprite = sprite;
                enemy.active = true;
                
                // Add glow effect for bosses
                if (isBoss && sprite.postFX && typeof sprite.postFX.addGlow === 'function') {
                    sprite.postFX.addGlow(0xff0000, 4, 0, false, 0.1, 32);
                }
                
                enemy.spriteCreating = false;
                Logger.debug('WorldManager', `Enemy sprite created: ${enemy.data.name} at x=${enemy.x}, y=${enemy.y}`);
            } else {
                // Fallback to generated placeholder texture if generation failed after retries
                const fallbackKey = ensurePlaceholderTexture(this.scene, {
                    key: placeholderKey,
                    width: size,
                    height: size,
                    color: color,
                    borderColor: 0xffffff
                });
                
                if (!sprite) {
                    sprite = this.scene.add.sprite(enemy.x, enemy.y, fallbackKey);
                } else {
                    sprite.setTexture(fallbackKey);
                    sprite.setPosition(enemy.x, enemy.y);
                    sprite.setActive(true);
                    sprite.setVisible(true);
                }
                
                sprite.setOrigin(0.5, 0.5);
                sprite.setDisplaySize(size, size);
                sprite.setDepth(200); // DEPTH_LAYERS.ENEMIES
                sprite.setVisible(true);
                sprite.setActive(true);
                
                if (this.enemySpriteGroup && !this.enemySpriteGroup.contains(sprite)) {
                    this.enemySpriteGroup.add(sprite);
                }
                
                if (!sprite.body) {
                    this.scene.physics.add.existing(sprite);
                }
                if (sprite.body) {
                    sprite.body.setCollideWorldBounds(false);
                }
                
                enemy.sprite = sprite;
                enemy.active = true;
                enemy.spriteCreating = false;
                Logger.warn('WorldManager', `Using placeholder texture for ${enemy.data.id} after texture retries failed`);
            }
            
            // Add name label above health bar for identification
            const enemyName = enemy.data.name || enemy.id;
            const nameLabel = this.scene.add.text(enemy.x, enemy.y - (isBoss ? 75 : 70), enemyName, {
                font: '12px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            });
            nameLabel.setOrigin(0.5);
            nameLabel.setDepth(201); // Slightly above enemy sprite
            enemy.nameLabel = nameLabel;
            
            // Add boss label
            if (isBoss && !enemy.bossLabel) {
                const bossLabel = this.scene.add.text(enemy.x, enemy.y - 50, 'BOSS', {
                    font: 'bold 16px Arial',
                    fill: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 3
                });
                bossLabel.setOrigin(0.5);
                bossLabel.setDepth(201);
                
                // Pulse animation for boss label
                this.scene.tweens.add({
                    targets: bossLabel,
                    alpha: { from: 0.5, to: 1.0 },
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                enemy.bossLabel = bossLabel;
            }
    }

    /**
     * Updates all world encounters.
     * Manages proximity triggers and sprite creation for shops and treasures.
     */
    updateEncounters() {
        this.encounters.forEach(encounter => {
            // Create sprite if encounter is in view and doesn't have one
            if (!encounter.sprite && this.isEncounterInView(encounter)) {
                this.createEncounterSprite(encounter);
            }
            
            if (!encounter.sprite || encounter.active) return;
            
            // Shops require clicking - don't auto-trigger
            if (encounter.type === 'shop') {
                return; // Skip auto-trigger for shops
            }
            
            // Check if hero is near encounter (for non-shop encounters)
            const distance = Math.abs(encounter.x - this.hero.x);
            if (distance < 100 && !encounter.active) {
                encounter.active = true;
                this.triggerEncounter(encounter);
            }
        });
    }

    /**
     * Checks if an encounter's logical position is within the rendering viewport.
     * @param {Object} encounter - Encounter state object.
     * @returns {boolean} True if the encounter should be rendered.
     */
    isEncounterInView(encounter) {
        if (!this.hero) return false;
        const distance = Math.abs(encounter.x - this.hero.x);
        return distance < 800; // Render encounters within 800 pixels
    }

    /**
     * Creates the visual sprite or graphical representation for an encounter.
     * @param {Object} encounter - Encounter state object.
     */
    createEncounterSprite(encounter) {
        const textureKey = `encounter-${encounter.type}`;
        
        // Use generated encounter marker if available
        if (this.scene.textures.exists(textureKey)) {
            encounter.sprite = this.scene.add.sprite(encounter.x, encounter.y, textureKey);
            encounter.sprite.setOrigin(0.5, 0.5);
            
            // Add floating animation
            this.scene.tweens.add({
                targets: encounter.sprite,
                y: { from: encounter.y, to: encounter.y - 5 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else {
            // Fallback to colored rectangle
            const colors = {
                shop: 0x4444ff,
                treasure: 0xffff44,
                quest: 0x44ff44,
                elite_enemy: 0xff8800,
                boss: 0x8800ff,
                resource_node: 0x00ff00,
                exploration_event: 0xaa00ff,
                choice_encounter: 0xffaa00
            };
            const color = colors[encounter.type] || 0x888888; // Use gray instead of white for unknown types
            encounter.sprite = this.scene.add.rectangle(encounter.x, encounter.y, 30, 30, color);
            encounter.sprite.setOrigin(0.5, 0.5);
        }
        
        // Make shop encounters clickable
        if (encounter.type === 'shop' && encounter.sprite) {
            encounter.sprite.setInteractive({ useHandCursor: true });
            encounter.sprite.on('pointerdown', () => {
                if (!encounter.active) {
                    encounter.active = true;
                    this.triggerEncounter(encounter);
                }
            });
        }
    }

    /**
     * Monitors camera position to trigger generation of new segments ahead
     * and removal of old segments behind.
     */
    checkSegmentGeneration() {
        if (!this.scene || !this.scene.cameras) return;
        
        const camera = this.scene.cameras.main;
        const cameraX = camera.scrollX;
        
        // Calculate current segment based on camera position
        const cameraSegment = Math.floor(cameraX / this.segmentWidth);
        this.currentSegment = cameraSegment;
        
        // Generate segments ahead of camera (spawn enemies ahead of player)
        const segmentsAhead = 3; // Generate 3 segments ahead
        const maxSegments = this.worldConfig.worldGeneration.maxSegments;
        
        for (let i = 0; i <= segmentsAhead; i++) {
            const segmentIndex = cameraSegment + i;
            if (segmentIndex < maxSegments && !this.segments[segmentIndex]) {
                this.generateSegment(segmentIndex);
            }
        }
        
        // Remove old segments behind camera (save memory)
        const segmentsBehind = 2; // Keep 2 segments behind for cleanup
        const minSegment = cameraSegment - segmentsBehind;
        if (minSegment >= 0 && this.segments[minSegment]) {
            this.removeSegment(minSegment);
        }
        
        // Update mile when segments change
        this.updateCurrentMile();
    }

    /**
     * Permanently removes a world segment and destroys all associated objects.
     * @param {number} segmentIndex - Index of segment to purge.
     */
    removeSegment(segmentIndex) {
        const segment = this.segments[segmentIndex];
        if (!segment) return;
        
        // Remove enemies
        segment.enemies.forEach(enemy => {
            if (enemy.sprite) {
                enemy.sprite.destroy();
            }
        });
        
        // Remove encounters
        segment.encounters.forEach(encounter => {
            if (encounter.sprite) {
                encounter.sprite.destroy();
            }
        });
        
        delete this.segments[segmentIndex];
        Logger.debug('WorldManager', `Removed segment ${segmentIndex}`);
    }

    /**
     * Purges sprites and labels for world objects that have moved well outside the viewport.
     */
    cleanupOffscreenObjects() {
        const screenBuffer = 200;
        const camera = this.scene.cameras.main;
        
        // Clean up enemies
        this.enemies = this.enemies.filter(enemy => {
            const offscreen = enemy.x < camera.scrollX - screenBuffer || 
                           enemy.x > camera.scrollX + camera.width + screenBuffer;
            
            if (offscreen && enemy.sprite) {
                if (enemy.nameLabel) {
                    enemy.nameLabel.destroy();
                    enemy.nameLabel = null;
                }
                enemy.sprite.destroy();
                enemy.sprite = null;
                enemy.active = false;
                return false;
            }
            return true;
        });
        
        // Clean up encounters
        this.encounters = this.encounters.filter(encounter => {
            const offscreen = encounter.x < camera.scrollX - screenBuffer || 
                           encounter.x > camera.scrollX + camera.width + screenBuffer;
            
            if (offscreen && encounter.sprite) {
                encounter.sprite.destroy();
                encounter.sprite = null;
                encounter.active = false;
                return false;
            }
            return true;
        });
    }

    /**
     * Performs a circle-distance collision check between the hero and an enemy sprite.
     * @param {Object} enemy - Enemy logical object with sprite reference.
     * @returns {boolean} True if collision detected.
     */
    checkHeroEnemyCollision(enemy) {
        if (!this.hero || !enemy.sprite) return false;
        
        const distance = Phaser.Math.Distance.Between(
            this.hero.x, this.hero.y,
            enemy.sprite.x, enemy.sprite.y
        );
        
        return distance < 50;
    }

    /**
     * Initiates a combat encounter with a specific enemy.
     * Emits events based on party size (party combat vs solo combat).
     * @param {Object} enemy - Target enemy to combat.
     */
    triggerCombat(enemy) {
        try {
            // Validate enemy
            if (!enemy || !enemy.id) {
                ErrorHandler.handle(new Error('Invalid enemy provided to triggerCombat'), 'WorldManager.triggerCombat', 'error');
                return;
            }
            
            const now = this.scene.time.now;
            const COMBAT_COOLDOWN = 500; // 500ms cooldown

            if (now - this.lastCombatTriggerTime < COMBAT_COOLDOWN) {
                return; // Still in cooldown
            }

            if (this.combatActive || this.enemiesInCombat.has(enemy.id)) {
                return;
            }

            // Check if CombatManager reports active combat
            if (this.scene.combatManager && this.scene.combatManager.isInCombat()) {
                return;
            }

            this.combatActive = true;
            this.enemiesInCombat.add(enemy.id);
            this.lastCombatTriggerTime = now;

            // Check if we have a party manager - use party combat if available
            // Also check scene.partyManager as fallback (it might be set there)
            const partyManager = this.partyManager || this.scene.partyManager;
            if (partyManager && typeof partyManager.getSize === 'function' && partyManager.getSize() > 0) {
                // Emit party combat event
                this.scene.events.emit('party_combat_start', {
                    partyManager: partyManager,
                    enemy: enemy
                });
                Logger.info('WorldManager', `Party combat triggered: ${partyManager.getSize()} heroes vs ${enemy.id}`);
            } else {
                // Fallback to single hero combat (only if no party available)
                // Try to get primary hero from partyManager if available, otherwise use this.hero
                let hero = this.hero;
                if (partyManager && typeof partyManager.getHeroByIndex === 'function') {
                    hero = partyManager.getHeroByIndex(0) || partyManager.getTank() || hero;
                }
                this.scene.events.emit(GameEvents.COMBAT.START, {
                    enemy: enemy,
                    hero: hero
                });
                Logger.info('WorldManager', `Combat triggered with ${enemy.id} (single hero fallback)`);
            }
        } catch (error) {
            ErrorHandler.handle(error, 'WorldManager.triggerCombat', 'error');
        }
    }

    /**
     * Initiates a non-combat encounter trigger.
     * @param {Object} encounter - Encounter state object.
     */
    triggerEncounter(encounter) {
        // Emit encounter event for appropriate handling
        this.scene.events.emit(GameEvents.WORLD.ENCOUNTER_TRIGGER, {
            type: encounter.type,
            encounter: encounter,
            hero: this.hero
        });
        
        Logger.info('WorldManager', `Encounter triggered: ${encounter.type}`);
    }

    /**
     * Sets up listeners for combat and encounter results to update world state.
     */
    setupEventListeners() {
        // Listen for combat events
        this.scene.events.on(GameEvents.COMBAT.END, (data) => {
            this.handleCombatEnd(data);
        });
        
        // Listen for encounter events
        this.scene.events.on('encounter_complete', (data) => {
            this.handleEncounterComplete(data);
        });
    }

    /**
     * Updates world state flags and cleanup after a combat encounter finishes.
     * @param {Object} data - Result object from the CombatManager.
     */
    handleCombatEnd(data) {
        // Clear combat flags
        this.combatActive = false;
        if (data.enemy && data.enemy.id) {
            this.enemiesInCombat.delete(data.enemy.id);
        }
        
        if (data.victory) {
            // Remove defeated enemy and return to pool
            const enemyIndex = this.enemies.findIndex(e => e.id === data.enemy.id);
            if (enemyIndex !== -1) {
                const enemy = this.enemies[enemyIndex];
                
                // Destroy enemy sprite and label if they exist
                if (enemy.sprite) {
                    enemy.sprite.destroy();
                    enemy.sprite = null;
                }
                if (enemy.nameLabel) {
                    enemy.nameLabel.destroy();
                    enemy.nameLabel = null;
                }
                
                // Return to pool instead of destroying
                this.returnEnemyToPool(enemy);
                this.enemies.splice(enemyIndex, 1);
                
                // Spawn a new enemy in the current segment after a short delay
                this.scene.time.delayedCall(2000, () => {
                    this.spawnNewEnemyInSegment(this.currentSegment);
                });
            }
        }
    }

    /**
     * Replenishes enemies in a segment if the population drops below a threshold.
     * @param {number} segmentIndex - Segment to spawn in.
     */
    spawnNewEnemyInSegment(segmentIndex) {
        // Don't spawn if we're too far ahead or behind
        if (segmentIndex < this.currentSegment - 1 || segmentIndex > this.currentSegment + 2) {
            return;
        }
        
        // Get or create the segment
        let segment = this.segments[segmentIndex];
        if (!segment) {
            // Generate the segment if it doesn't exist
            this.generateSegment(segmentIndex);
            segment = this.segments[segmentIndex];
        }
        
        if (!segment) return;
        
        // Count enemies in this segment
        const enemiesInSegment = this.enemies.filter(e => {
            // Check if enemy belongs to this segment by checking if it's in the segment's enemy list
            return segment.enemies.includes(e);
        });
        
        // Only spawn if we have less than 3 enemies in the segment
        if (enemiesInSegment.length < 3) {
            // Calculate spawn position (ahead of hero)
            const heroX = this.hero?.x ?? 100;
            const spawnX = heroX + 400 + Math.random() * 200; // 400-600 pixels ahead
            
            // Create new enemy
            const enemyIndex = enemiesInSegment.length;
            const enemy = this.createEnemy(segmentIndex, enemyIndex, false);
            if (enemy) {
                enemy.x = spawnX;
                segment.enemies.push(enemy);
                this.enemies.push(enemy);
                Logger.debug('WorldManager', `Spawned new enemy: ${enemy.id} at x=${enemy.x}, segment=${segmentIndex}`);
            }
        }
    }

    /**
     * Cleans up encounter visuals after an encounter is resolved.
     * @param {Object} data - Encounter completion data.
     */
    handleEncounterComplete(data) {
        // Remove completed encounter
        const encounterIndex = this.encounters.findIndex(e => e.segmentIndex === data.segmentIndex);
        if (encounterIndex !== -1) {
            const encounter = this.encounters[encounterIndex];
            if (encounter.sprite) {
                encounter.sprite.destroy();
            }
            this.encounters.splice(encounterIndex, 1);
        }
    }

    /**
     * Serializes current world progression and statistics for saving.
     * @returns {Object} World state data object.
     */
    getWorldState() {
        return {
            currentSegment: this.currentSegment,
            currentMile: this.currentMile,
            maxMileReached: this.maxMileReached,
            segmentsGenerated: Object.keys(this.segments).length,
            enemiesDefeated: this.getEnemiesDefeatedCount(),
            distanceTraveled: this.currentSegment * this.segmentWidth
        };
    }

    /**
     * Restores world state from serialized save data.
     * @param {Object} worldState - Saved data to restore.
     */
    loadWorldState(worldState) {
        // Migration: If save has currentSegment but no currentMile, calculate from segment
        if (worldState.currentSegment !== undefined && worldState.currentMile === undefined) {
            worldState.currentMile = this.segmentToMile(worldState.currentSegment);
            worldState.maxMileReached = worldState.currentMile;
        }
        
        this.currentSegment = worldState.currentSegment || 0;
        this.currentMile = worldState.currentMile !== undefined ? worldState.currentMile : this.segmentToMile(this.currentSegment);
        this.maxMileReached = worldState.maxMileReached !== undefined ? worldState.maxMileReached : this.currentMile;
        
        // Regenerate segments up to current position
        this.generateInitialSegments();
        Logger.info('WorldManager', `World state loaded - Segment: ${this.currentSegment}, Mile: ${this.currentMile}, Max Mile: ${this.maxMileReached}`);
    }

    /**
     * Teleports the party to a specific mile, resetting segment generation around it.
     * @param {number} mile - Target mile number.
     * @returns {boolean} True if teleport successful.
     */
    selectMile(mile) {
        if (!this.canRevisitMile(mile)) {
            Logger.warn('WorldManager', `Cannot select mile ${mile}. Max reached: ${this.maxMileReached}`);
            return false;
        }

        const oldMile = this.currentMile;
        const targetSegment = this.mileToSegment(mile);
        
        // Update mile and segment
        this.currentMile = mile;
        this.currentSegment = targetSegment;
        
        // Move hero to target segment start position
        if (this.hero) {
            this.hero.x = targetSegment * this.segmentWidth + 100; // Start position in segment
        }
        
        // Clear existing segments and regenerate from target
        this.segments = [];
        this.enemies = [];
        this.encounters = [];
        
        // Regenerate segments starting from target
        const segmentsToGenerate = this.worldConfig.worldGeneration.segmentsToPreload || 3;
        for (let i = 0; i < segmentsToGenerate; i++) {
            this.generateSegment(targetSegment + i);
        }
        
        // Fire mile changed event
        this.scene.events.emit(GameEvents.WORLD.MILE_CHANGED, {
            currentMile: this.currentMile,
            maxMileReached: this.maxMileReached,
            previousMile: oldMile
        });
        
        Logger.info('WorldManager', `Selected mile ${mile} (Segment ${targetSegment})`);
        return true;
    }

    /**
     * Retrieves the total count of enemies defeated during world travel.
     * @returns {number} Defeated enemy count.
     */
    getEnemiesDefeatedCount() {
        // This would be tracked properly in a real implementation
        return Math.floor(this.currentSegment * 2.5); // Mock data
    }

    /**
     * Evaluates if the party has crossed milestone boundaries and awards rewards.
     * @param {number} oldMile - Mile before update.
     * @param {number} newMile - Mile after update.
     */
    checkMilestoneRewards(oldMile, newMile) {
        const milestoneMiles = [25, 50, 75, 100];
        
        for (const milestoneMile of milestoneMiles) {
            // Check if we've crossed this milestone
            if (oldMile < milestoneMile && newMile >= milestoneMile) {
                // Check if already claimed
                if (!this.milestoneRewardsClaimed.has(milestoneMile)) {
                    this.claimMilestoneReward(milestoneMile);
                    this.milestoneRewardsClaimed.add(milestoneMile);
                }
            }
        }
    }

    /**
     * Grants rewards for reaching a major world milestone.
     * @param {number} mile - Milestone mile number reached.
     */
    claimMilestoneReward(mile) {
        const rewards = {
            25: {
                talentPoints: 0,
                freeRespec: true,
                items: [{ quality: 'epic', count: 1 }]
            },
            50: {
                talentPoints: 1,
                items: [{ quality: 'legendary', count: 1 }]
            },
            75: {
                talentPoints: 2,
                items: [{ quality: 'legendary', count: 1, setItem: true }]
            },
            100: {
                talentPoints: 3,
                items: [{ quality: 'legendary', count: 1, setItem: true }],
                prestigeBonus: true
            }
        };
        
        const reward = rewards[mile];
        if (!reward) {
            return;
        }
        
        // Emit milestone reward event
        this.scene.events.emit('milestone_reward', {
            mile: mile,
            rewards: reward
        });
        
        Logger.info('WorldManager', `Milestone reward claimed at mile ${mile}`);
    }

    /**
     * Manually updates the tracked X position of the primary hero body.
     * @param {number} x - New X coordinate.
     */
    updateTankBodyPosition(x) {
        this._prevTankX = x;
        this._prevTankBodyX = x;
    }

    /**
     * Retrieves the last tracked X position of the primary hero body.
     * @returns {number|undefined} Last tracked X position.
     */
    getTankBodyPosition() {
        return this._prevTankBodyX;
    }

    /**
     * Cleans up all world objects, sprites, labels, and event listeners.
     */
    destroy() {
        // Remove event listeners
        this.scene.events.off(GameEvents.COMBAT.END);
        this.scene.events.off(GameEvents.WORLD.ENCOUNTER_COMPLETE);
        
        // Clean up all sprites
        this.enemies.forEach(enemy => {
            if (enemy.sprite) {
                if (this.enemySpriteGroup && this.enemySpriteGroup.contains(enemy.sprite)) {
                    enemy.sprite.setActive(false);
                    enemy.sprite.setVisible(false);
                } else {
                    enemy.sprite.destroy();
                }
            }
            if (enemy.nameLabel) {
                enemy.nameLabel.destroy();
            }
            if (enemy.bossLabel) {
                enemy.bossLabel.destroy();
            }
        });
        
        this.encounters.forEach(encounter => {
            if (encounter.sprite) {
                if (this.encounterSpriteGroup && this.encounterSpriteGroup.contains(encounter.sprite)) {
                    encounter.sprite.setActive(false);
                    encounter.sprite.setVisible(false);
                } else {
                    encounter.sprite.destroy();
                }
            }
        });
        
        // Clear Groups
        if (this.enemySpriteGroup) {
            this.enemySpriteGroup.clear(true, true);
            this.enemySpriteGroup = null;
        }
        if (this.encounterSpriteGroup) {
            this.encounterSpriteGroup.clear(true, true);
            this.encounterSpriteGroup = null;
        }
        
        // Clear arrays and collections
        this.enemies = [];
        this.encounters = [];
        this.segments = [];
        this.enemiesInCombat.clear();
        
        // Clear references
        this.hero = null;
        this.combatActive = false;
        this.lastCombatTriggerTime = 0;
        
        Logger.debug('WorldManager', 'Destroyed');
    }
}

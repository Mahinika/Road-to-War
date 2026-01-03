import { Logger } from './logger.js';
import { ErrorHandler } from './error-handler.js';

/**
 * Hero Factory - Creates hero objects with class, specialization, and initial stats
 */
export class HeroFactory {
    constructor(scene) {
        this.scene = scene;
        this.classesData = this.scene.cache.json.get('classes');
        this.specializationsData = this.scene.cache.json.get('specializations');
        this.worldConfig = this.scene.cache.json.get('worldConfig');
        this.talentsData = this.scene.cache.json.get('talents');
        this.bloodlinesData = this.scene.cache.json.get('bloodlines');
        
        this.nextHeroId = 0;
        
        // Name generation pools
        this.firstNames = [
            'Aelric', 'Brenna', 'Cedric', 'Dara', 'Erik', 'Fara', 'Gareth', 'Hilda',
            'Ivor', 'Jenna', 'Kael', 'Lara', 'Marcus', 'Nora', 'Owen', 'Petra',
            'Quinn', 'Rhea', 'Soren', 'Tara', 'Ulric', 'Vera', 'Wynn', 'Yara',
            'Zane', 'Aria', 'Bram', 'Cora', 'Dane', 'Elara', 'Finn', 'Gwen',
            'Hale', 'Iris', 'Jace', 'Kira', 'Liam', 'Maya', 'Nox', 'Orin'
        ];
        this.lastNames = [
            'Ironforge', 'Stormwind', 'Shadowbane', 'Brightblade', 'Darkwood',
            'Frostweaver', 'Lightbringer', 'Thunderstrike', 'Bloodmoon', 'Starfall',
            'Dragonheart', 'Wolfbane', 'Firesoul', 'Iceborn', 'Stormcaller',
            'Shadowstep', 'Brightshield', 'Darkblade', 'Frostwind', 'Lightward',
            'Thunderclap', 'Bloodfang', 'Stargazer', 'Dragonwing', 'Wolfsong',
            'Firebrand', 'Iceheart', 'Stormrider', 'Shadowwhisper', 'Brightstar'
        ];
        
        Logger.info('HeroFactory', 'Initialized');
    }
    
    /**
     * Generate a random hero name
     * @returns {string} - Generated hero name
     */
    generateHeroName() {
        const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
        const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        return `${firstName} ${lastName}`;
    }

    /**
     * Create a new hero
     * @param {string} classId - Class ID (e.g., 'paladin', 'warrior')
     * @param {string} specId - Specialization ID (e.g., 'protection', 'holy')
     * @param {number} level - Starting level (default: 1)
     * @param {string} bloodlineId - Optional Bloodline ID
     * @returns {Object} - Hero object
     */
    createHero(classId, specId, level = 1, bloodlineId = null) {
        try {
            if (!this.classesData || !this.classesData[classId]) {
                throw new Error(`Class not found: ${classId}`);
            }

            const classData = this.classesData[classId];
            const specKey = `${classId}_${specId}`;
            
            if (!this.specializationsData || !this.specializationsData[specKey]) {
                throw new Error(`Specialization not found: ${specKey}`);
            }

            const specData = this.specializationsData[specKey];

            // Assign Bloodline (random if not specified)
            const bloodline = this.assignBloodline(bloodlineId);

            // Generate unique hero ID
            const heroId = `hero_${this.nextHeroId++}`;

            // Get starting stats from world config
            const startingStats = this.worldConfig?.player?.startingStats || {
                health: 100,
                maxHealth: 100,
                attack: 10,
                defense: 5,
                speed: 50
            };

            // Initialize base stats
            const baseStats = { ...startingStats };

            // 1. Apply Bloodline stat bonuses first (core lineage)
            if (bloodline && bloodline.statBonuses) {
                Object.entries(bloodline.statBonuses).forEach(([stat, value]) => {
                    if (baseStats[stat] !== undefined) {
                        baseStats[stat] += value;
                    } else {
                        // For stats like 'mana' or 'spellPower' that might not be in startingStats
                        baseStats[stat] = value;
                    }
                });
            }

            // 2. Apply spec passive effects to base stats
            if (specData.passiveEffects) {
                if (specData.passiveEffects.healthBonus) {
                    baseStats.maxHealth = Math.floor(baseStats.maxHealth * (1 + specData.passiveEffects.healthBonus));
                }
                if (specData.passiveEffects.defenseBonus) {
                    baseStats.defense = Math.floor(baseStats.defense * (1 + specData.passiveEffects.defenseBonus));
                }
            }
            
            // Ensure health equals maxHealth (hero starts at full health)
            baseStats.health = baseStats.maxHealth;

            // Initialize equipment slots (18 slots matching current system)
            const equipmentSlots = {
                head: null,
                neck: null,
                shoulder: null,
                cloak: null,
                chest: null,
                shirt: null,
                tabard: null,
                bracer: null,
                hands: null,
                waist: null,
                legs: null,
                boots: null,
                ring1: null,
                ring2: null,
                trinket1: null,
                trinket2: null,
                weapon: null,
                offhand: null
            };

            // Initialize empty talent tree structure
            const talentTree = this.initializeTalentTree(classId);

            // Combine core class abilities and spec-specific abilities
            const abilities = [
                ...(classData.coreAbilities || []),
                ...(specData.specAbilities || [])
            ];

            // Generate hero name
            const heroName = this.generateHeroName();
            
            // Create hero object
            const hero = {
                id: heroId,
                name: heroName,
                classId: classId,
                specId: specId,
                bloodlineId: bloodline?.id,
                bloodlineName: bloodline?.name,
                bloodline: bloodline,
                role: specData.role,
                level: level,
                experience: 0,
                baseStats: baseStats,
                equipmentSlots: equipmentSlots,
                talentTree: talentTree,
                abilities: abilities,
                // Current stats (will be calculated by StatCalculator)
                // Ensure health is properly initialized
                currentStats: {
                    ...baseStats,
                    health: baseStats.health || baseStats.maxHealth,
                    maxHealth: baseStats.maxHealth
                },
                // Resource pool (mana/energy/rage)
                resourceType: classData.resourceType || 'mana',
                currentResource: 0,
                maxResource: 0
            };

            // Initialize Resource Pool based on type and stats
            this.initializeResourcePool(hero, classData);

            Logger.info('HeroFactory', `Created hero ${heroId}: ${heroName} - ${bloodline?.name || 'No Bloodline'} ${classData.name} ${specData.name} (Level ${level})`);
            
            return hero;
        } catch (error) {
            ErrorHandler.handle(error, 'HeroFactory.createHero');
            return null;
        }
    }

    /**
     * Assign a bloodline to a hero
     * @param {string} bloodlineId - Optional specific bloodline ID
     * @returns {Object} - Bloodline data
     */
    assignBloodline(bloodlineId = null) {
        if (!this.bloodlinesData || !this.bloodlinesData.bloodlines) {
            return null;
        }

        const bloodlines = this.bloodlinesData.bloodlines;

        // Use specific bloodline if requested
        if (bloodlineId && bloodlines[bloodlineId]) {
            return bloodlines[bloodlineId];
        }

        // Otherwise pick a random one
        const keys = Object.keys(bloodlines);
        if (keys.length === 0) return null;

        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return bloodlines[randomKey];
    }

    /**
     * Initialize resource pool based on class rules
     * @param {Object} hero - The hero object
     * @param {Object} classData - Data for the hero's class
     */
    initializeResourcePool(hero, classData) {
        const type = hero.resourceType;
        let max = 100; // Default (Energy/Rage)

        if (type === 'mana') {
            // Derived from Intellect: Base Int * 15
            const intellect = hero.baseStats.intellect || 10; // Default to 10 if missing
            max = intellect * 15;
            hero.currentResource = max; // Start at full mana
        } else if (type === 'energy') {
            max = 100;
            hero.currentResource = max; // Start at full energy
        } else if (type === 'rage') {
            max = 100;
            hero.currentResource = 0; // Start at 0 rage
        } else if (type === 'focus') {
            max = 100;
            hero.currentResource = max; // Start at full focus
        }

        hero.maxResource = max;
    }

    /**
     * Initialize empty talent tree structure for a class
     * @param {string} classId - Class ID
     * @returns {Object} - Talent tree structure
     */
    initializeTalentTree(classId) {
        const tree = {};
        
        if (!this.talentsData || !this.talentsData[classId]) {
            return tree;
        }

        const classTalents = this.talentsData[classId];
        
        // Initialize each tree
        Object.keys(classTalents.trees || {}).forEach(treeId => {
            tree[treeId] = {};
            const talents = classTalents.trees[treeId].talents || {};
            
            // Initialize each talent with 0 points
            Object.keys(talents).forEach(talentId => {
                tree[treeId][talentId] = {
                    points: 0,
                    maxPoints: talents[talentId].maxPoints || 0
                };
            });
        });

        return tree;
    }

    /**
     * Get available classes for a role
     * @param {string} role - Role ('tank', 'healer', 'dps')
     * @returns {Array} - Array of class IDs that can fulfill the role
     */
    getClassesForRole(role) {
        const classes = [];
        
        if (!this.classesData || !this.specializationsData) {
            return classes;
        }

        Object.keys(this.classesData).forEach(classId => {
            const classData = this.classesData[classId];
            
            // Check if any spec of this class matches the role
            classData.availableSpecs.forEach(specId => {
                const specKey = `${classId}_${specId}`;
                const specData = this.specializationsData[specKey];
                
                if (specData && specData.role === role) {
                    if (!classes.includes(classId)) {
                        classes.push(classId);
                    }
                }
            });
        });

        return classes;
    }

    /**
     * Get available specializations for a class
     * @param {string} classId - Class ID
     * @returns {Array} - Array of specialization IDs
     */
    getSpecializationsForClass(classId) {
        if (!this.classesData || !this.classesData[classId]) {
            return [];
        }
        
        return this.classesData[classId].availableSpecs || [];
    }

    /**
     * Reload class data for hot-reload support
     */
    async reloadClassData() {
        try {
            this.classesData = this.scene.cache.json.get('classes');
            Logger.info('HeroFactory', 'Reloaded class data for hot-reload');
        } catch (error) {
            Logger.error('HeroFactory', 'Failed to reload class data:', error);
        }
    }

    /**
     * Reload specialization data for hot-reload support
     */
    async reloadSpecData() {
        try {
            this.specializationsData = this.scene.cache.json.get('specializations');
            Logger.info('HeroFactory', 'Reloaded specialization data for hot-reload');
        } catch (error) {
            Logger.error('HeroFactory', 'Failed to reload specialization data:', error);
        }
    }
}


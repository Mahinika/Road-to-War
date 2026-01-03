import { Logger } from './logger.js';

/**
 * Manager Registry - Enhanced with automatic dependency injection
 * Provides centralized manager initialization with automatic dependency resolution
 * and topological sorting for proper initialization order
 */
export class ManagerRegistry {
    constructor(scene) {
        this.scene = scene;
        this.managers = new Map(); // Map<name, manager instance>
        this.managerClasses = new Map(); // Map<name, ManagerClass>
        this.dependencies = new Map(); // Map<name, string[]>
        this.configs = new Map(); // Map<name, config object>
        this.initialized = false;
        this.dependencyGraph = new Map(); // For visualization
    }

    /**
     * Register a manager class with its dependencies
     * @param {string} name - Manager name (e.g., 'combatManager')
     * @param {Function} ManagerClass - Manager class constructor
     * @param {string[]} dependencies - Array of dependency names (e.g., ['partyManager', 'equipmentManager'])
     * @param {Object} config - Optional configuration object to pass to manager constructor
     */
    register(name, ManagerClass, dependencies = [], config = {}) {
        if (this.managers.has(name)) {
            Logger.warn('ManagerRegistry', `Manager ${name} already registered`);
            return;
        }

        // Use static getDependencies() if available and dependencies not provided
        if (dependencies.length === 0 && typeof ManagerClass.getDependencies === 'function') {
            dependencies = ManagerClass.getDependencies();
        }

        this.managerClasses.set(name, ManagerClass);
        this.dependencies.set(name, dependencies);
        this.configs.set(name, config);
        
        // Build dependency graph
        this.dependencyGraph.set(name, {
            name,
            dependencies,
            dependents: []
        });

        Logger.info('ManagerRegistry', `Registered manager: ${name} with dependencies: [${dependencies.join(', ')}]`);
    }

    /**
     * Get a manager by name
     * @param {string} name - Manager name
     * @returns {Object|null} Manager instance or null
     */
    get(name) {
        return this.managers.get(name) || null;
    }

    /**
     * Get all managers as an object for easy access
     * @returns {Object} Object with all managers
     */
    getAll() {
        const result = {};
        for (const [name, manager] of this.managers) {
            result[name] = manager;
        }
        return result;
    }

    /**
     * Detect circular dependencies in the dependency graph
     * @returns {Array} Array of circular dependency chains, or empty array if none found
     */
    detectCircularDependencies() {
        const visited = new Set();
        const recursionStack = new Set();
        const cycles = [];

        const dfs = (node, path = []) => {
            if (recursionStack.has(node)) {
                // Found a cycle
                const cycleStart = path.indexOf(node);
                cycles.push(path.slice(cycleStart).concat(node));
                return;
            }

            if (visited.has(node)) {
                return;
            }

            visited.add(node);
            recursionStack.add(node);

            const deps = this.dependencies.get(node) || [];
            for (const dep of deps) {
                if (this.dependencyGraph.has(dep)) {
                    dfs(dep, path.concat(node));
                }
            }

            recursionStack.delete(node);
        };

        for (const name of this.dependencyGraph.keys()) {
            if (!visited.has(name)) {
                dfs(name);
            }
        }

        if (cycles.length > 0) {
            Logger.error('ManagerRegistry', 'Circular dependencies detected:', cycles);
        }

        return cycles;
    }

    /**
     * Calculate initialization order using topological sort
     * @returns {string[]} Array of manager names in initialization order
     */
    calculateInitializationOrder() {
        // Build reverse dependency graph (dependents)
        for (const [name, deps] of this.dependencies) {
            for (const dep of deps) {
                if (this.dependencyGraph.has(dep)) {
                    this.dependencyGraph.get(dep).dependents.push(name);
                }
            }
        }

        // Topological sort using Kahn's algorithm
        const inDegree = new Map();
        for (const name of this.dependencyGraph.keys()) {
            inDegree.set(name, 0);
        }

        for (const [name, deps] of this.dependencies) {
            for (const dep of deps) {
                if (this.dependencyGraph.has(dep)) {
                    inDegree.set(name, (inDegree.get(name) || 0) + 1);
                }
            }
        }

        const queue = [];
        for (const [name, degree] of inDegree) {
            if (degree === 0) {
                queue.push(name);
            }
        }

        const order = [];
        while (queue.length > 0) {
            const current = queue.shift();
            order.push(current);

            const node = this.dependencyGraph.get(current);
            if (node) {
                for (const dependent of node.dependents) {
                    const newDegree = (inDegree.get(dependent) || 0) - 1;
                    inDegree.set(dependent, newDegree);
                    if (newDegree === 0) {
                        queue.push(dependent);
                    }
                }
            }
        }

        // Check for cycles (if order.length < total managers, there's a cycle)
        if (order.length < this.dependencyGraph.size) {
            const cycles = this.detectCircularDependencies();
            throw new Error(`Circular dependency detected. Cannot initialize managers. Cycles: ${JSON.stringify(cycles)}`);
        }

        return order;
    }

    /**
     * Resolve dependencies for a manager
     * @param {string} name - Manager name
     * @returns {Object} Object with resolved dependencies
     */
    resolveDependencies(name) {
        const deps = this.dependencies.get(name) || [];
        const resolved = {};

        for (const depName of deps) {
            const manager = this.managers.get(depName);
            if (!manager) {
                // For partyManager, it might be registered separately, so don't throw error yet
                if (depName === 'partyManager') {
                    Logger.warn('ManagerRegistry', `partyManager not found in registry for ${name}, will be set later`);
                    continue;
                }
                throw new Error(`Dependency ${depName} not found for manager ${name}`);
            }
            resolved[depName] = manager;
        }

        return resolved;
    }

    /**
     * Initialize all managers in proper dependency order
     * @param {Object} partyManager - PartyManager instance (must be created first, outside registry)
     * @param {Object} primaryHero - Primary hero sprite reference (optional)
     * @param {Array} partyMemberSprites - Party member sprites array (optional)
     * @returns {Promise<void>}
     */
    async initializeAll(partyManager = null, primaryHero = null, partyMemberSprites = []) {
        if (this.initialized) {
            Logger.warn('ManagerRegistry', 'Already initialized');
            return;
        }

        // Check for circular dependencies
        const cycles = this.detectCircularDependencies();
        if (cycles.length > 0) {
            throw new Error(`Cannot initialize managers: circular dependencies detected. ${JSON.stringify(cycles)}`);
        }

        // Register partyManager if provided (it's created outside the registry)
        // MUST be registered BEFORE calculating initialization order so dependencies can resolve
        if (partyManager) {
            this.managers.set('partyManager', partyManager);
            Logger.info('ManagerRegistry', 'partyManager registered in registry');
        } else {
            Logger.warn('ManagerRegistry', 'partyManager not provided - managers requiring it may fail');
        }

        // Calculate initialization order
        const order = this.calculateInitializationOrder();
        Logger.info('ManagerRegistry', `Initialization order: ${order.join(' → ')}`);

        // Initialize managers in order
        for (const name of order) {
            // Skip if already initialized (like partyManager)
            if (this.managers.has(name)) {
                Logger.info('ManagerRegistry', `Skipping ${name} (already initialized)`);
                continue;
            }

            try {
                const ManagerClass = this.managerClasses.get(name);
                if (!ManagerClass) {
                    Logger.warn('ManagerRegistry', `Manager class not found for ${name}`);
                    continue;
                }

                // Resolve dependencies (may return empty object if partyManager not yet available)
                let resolvedDeps = {};
                try {
                    resolvedDeps = this.resolveDependencies(name);
                } catch (error) {
                    // If partyManager dependency fails, log warning but continue
                    if (error.message.includes('partyManager')) {
                        Logger.warn('ManagerRegistry', `partyManager not available for ${name}, will be set later`);
                        resolvedDeps = {};
                    } else {
                        throw error; // Re-throw if it's a different dependency issue
                    }
                }
                
                const config = this.configs.get(name) || {};

                // Merge dependencies into config
                const managerConfig = {
                    ...config,
                    ...resolvedDeps
                };

                // Create manager instance
                Logger.info('ManagerRegistry', `Initializing ${name}...`);
                const manager = new ManagerClass(this.scene, managerConfig);

                // Call init() if it exists (for async initialization)
                // Handle both async init() and old init(parameter) methods
                if (typeof manager.init === 'function') {
                    const initString = manager.init.toString();
                    // Better async detection: check if function string starts with 'async'
                    const isAsync = initString.trim().startsWith('async') || manager.init.constructor.name === 'AsyncFunction';
                    
                    // Check if init() has parameters (with or without defaults)
                    const hasParams = initString.match(/init\s*\([^)]+\)/);
                    // Check if parameters have default values (optional parameters)
                    // Look for = followed by null, undefined, or any value
                    const hasOptionalParams = hasParams && initString.match(/=\s*(null|undefined|['"`\w]+)/);
                    
                    if (isAsync) {
                        // Async init() - call it (even if it has optional parameters)
                        // Optional parameters are handled by default values, so we can call without args
                        await manager.init();
                    } else if (hasParams && !hasOptionalParams) {
                        // Old sync init(parameter) method with required params - skip it
                        Logger.warn('ManagerRegistry', `${name}.init() has required parameters, skipping (may be old method)`);
                    } else if (!hasParams || hasOptionalParams) {
                        // Sync init() without parameters, or with optional parameters - call it
                        manager.init();
                    }
                }
                
                // Call manager-specific initialization methods with parameters if needed
                if (name === 'worldManager' && manager.initializeGroups) {
                    manager.initializeGroups();
                }
                if (name === 'lootManager' && manager.initializeGroups) {
                    manager.initializeGroups();
                }
                if (name === 'particleManager' && manager.init && typeof manager.init === 'function') {
                    // Check if it's the old init() method
                    const initString = manager.init.toString();
                    if (!initString.match(/init\s*\([^)]+\)/)) {
                        manager.init();
                    }
                }
                if (name === 'audioManager' && manager.init && typeof manager.init === 'function') {
                    const initString = manager.init.toString();
                    if (!initString.match(/init\s*\([^)]+\)/)) {
                        manager.init();
                    }
                }
                if (name === 'cameraManager' && manager.init && typeof manager.init === 'function') {
                    const initString = manager.init.toString();
                    if (!initString.match(/init\s*\([^)]+\)/)) {
                        manager.init();
                    }
                }
                if (name === 'achievementManager' && manager.init && typeof manager.init === 'function') {
                    const statisticsManager = this.managers.get('statisticsManager');
                    const initString = manager.init.toString();
                    // Check if it's the old sync init(statisticsManager) method
                    if (initString.match(/init\s*\([^)]+\)/) && manager.init.constructor.name !== 'AsyncFunction') {
                        // Old sync init(statisticsManager) method - call with parameter
                        manager.init(statisticsManager);
                    }
                }

                // Register the initialized manager
                this.managers.set(name, manager);

                // Call manager-specific initialization methods
                if (name === 'worldManager' && manager.initializeGroups) {
                    manager.initializeGroups();
                }
                if (name === 'lootManager' && manager.initializeGroups) {
                    manager.initializeGroups();
                }
                if (name === 'particleManager' && manager.init) {
                    manager.init();
                }
                if (name === 'audioManager' && manager.init) {
                    manager.init();
                }
                if (name === 'cameraManager' && manager.init) {
                    manager.init();
                }
                if (name === 'achievementManager' && manager.init) {
                    const statisticsManager = this.managers.get('statisticsManager');
                    if (statisticsManager) {
                        manager.init(statisticsManager);
                    }
                }

                Logger.info('ManagerRegistry', `✓ ${name} initialized`);
            } catch (error) {
                Logger.error('ManagerRegistry', `Failed to initialize ${name}:`, error);
                throw error;
            }
        }

        // Post-initialization: Set cross-references that need to be set after all managers are created
        this.postInitialize();

        this.initialized = true;
        Logger.info('ManagerRegistry', 'All managers initialized successfully');
    }

    /**
     * Post-initialization: Set cross-references between managers
     * Some managers need references to other managers that are set after initialization
     */
    postInitialize() {
        // Set equipmentManager reference in combatManager
        const combatManager = this.managers.get('combatManager');
        const equipmentManager = this.managers.get('equipmentManager');
        if (combatManager && equipmentManager) {
            combatManager.equipmentManager = equipmentManager;
        }

        // Set resourceManager reference in abilityManager (via combatManager)
        const resourceManager = this.managers.get('resourceManager');
        if (combatManager && resourceManager && combatManager.abilityManager) {
            combatManager.abilityManager.resourceManager = resourceManager;
        }

        // Set hero reference in worldManager and combatManager (if provided)
        // This is handled externally in GameSceneCore
    }

    /**
     * Get dependency graph for visualization
     * @returns {Object} Dependency graph structure
     */
    getDependencyGraph() {
        return {
            nodes: Array.from(this.dependencyGraph.keys()),
            edges: Array.from(this.dependencies.entries()).flatMap(([name, deps]) =>
                deps.map(dep => ({ from: dep, to: name }))
            ),
            graph: Object.fromEntries(this.dependencyGraph)
        };
    }

    /**
     * Update handlers with manager references
     * @param {Object} handlers - Handler objects to update
     */
    updateHandlers(handlers) {
        const managers = this.getAll();
        
        // Update each handler with relevant managers
        if (handlers.heroRenderer) {
            handlers.heroRenderer.partyManager = managers.partyManager;
            handlers.heroRenderer.equipmentManager = managers.equipmentManager;
        }

        if (handlers.combatHandler) {
            handlers.combatHandler.combatManager = managers.combatManager;
            handlers.combatHandler.partyManager = managers.partyManager;
            handlers.combatHandler.worldManager = managers.worldManager;
        }

        if (handlers.uiManager) {
            handlers.uiManager.partyManager = managers.partyManager;
            handlers.uiManager.equipmentManager = managers.equipmentManager;
            handlers.uiManager.shopManager = managers.shopManager;
        }

        if (handlers.eventHandler) {
            handlers.eventHandler.partyManager = managers.partyManager;
            handlers.eventHandler.equipmentManager = managers.equipmentManager;
            handlers.eventHandler.lootManager = managers.lootManager;
            handlers.eventHandler.shopManager = managers.shopManager;
            handlers.eventHandler.statisticsManager = managers.statisticsManager;
            handlers.eventHandler.achievementManager = managers.achievementManager;
            handlers.eventHandler.worldManager = managers.worldManager;
            handlers.eventHandler.audioManager = managers.audioManager;
            handlers.eventHandler.particleManager = managers.particleManager;
            // Additional methods from scene
            if (handlers.scene) {
                handlers.eventHandler.showFloatingText = handlers.scene.showFloatingText?.bind(handlers.scene);
                handlers.eventHandler.showTemporaryMessage = handlers.scene.showTemporaryMessage?.bind(handlers.scene);
                handlers.eventHandler.handlePrestigeMilestones = handlers.scene.handlePrestigeMilestones?.bind(handlers.scene);
            }
        }

        if (handlers.saveLoadHandler) {
            handlers.saveLoadHandler.worldManager = managers.worldManager;
            handlers.saveLoadHandler.equipmentManager = managers.equipmentManager;
            handlers.saveLoadHandler.shopManager = managers.shopManager;
            handlers.saveLoadHandler.lootManager = managers.lootManager;
            handlers.saveLoadHandler.statisticsManager = managers.statisticsManager;
            handlers.saveLoadHandler.achievementManager = managers.achievementManager;
            handlers.saveLoadHandler.prestigeManager = managers.prestigeManager;
            handlers.saveLoadHandler.partyManager = managers.partyManager;
        }

        if (handlers.setupHandler) {
            handlers.setupHandler.worldManager = managers.worldManager;
            handlers.setupHandler.statisticsManager = managers.statisticsManager;
            handlers.setupHandler.lootManager = managers.lootManager;
        }

        if (handlers.levelUpHandler) {
            handlers.levelUpHandler.equipmentManager = managers.equipmentManager;
        }
    }

    /**
     * Cleanup all managers
     */
    destroy() {
        for (const [name, manager] of this.managers) {
            if (manager && typeof manager.destroy === 'function') {
                try {
                    manager.destroy();
                } catch (error) {
                    Logger.error('ManagerRegistry', `Error destroying ${name}:`, error);
                }
            }
        }
        this.managers.clear();
        this.managerClasses.clear();
        this.dependencies.clear();
        this.configs.clear();
        this.dependencyGraph.clear();
        this.initialized = false;
        Logger.info('ManagerRegistry', 'All managers destroyed');
    }
}

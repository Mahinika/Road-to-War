import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { BaseManager } from './base-manager.js';

/**
 * Movement Manager - Handles individual hero movement with role-based positioning
 * Manages 2D movement, collision avoidance, and formation management
 */
export class MovementManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // MovementManager has no dependencies
    }

    constructor(scene, config = {}) {
        super(scene, config);
        // Cache for failed animation attempts to prevent spam
        this.failedAnimationCache = new Map(); // Map<animKey, lastFailureTime>
        this.animationFailureCooldown = 5000; // Don't retry failed animations for 5 seconds

        // Safely get classes data - may not be loaded yet during initialization
        try {
            this.classesData = this.scene.cache.json.get('classes');
        } catch (error) {
            Logger.warn('MovementManager', 'Classes data not yet loaded, will retry when needed');
            this.classesData = null;
        }

        // Configuration - Using UI_CONFIG for responsive spacing
        let minSpacing = 40;
        let separationStrength = 0.3;
        
        try {
            const uiConfig = this.scene.cache.json.get('uiConfig') || {};
            if (uiConfig.FORMATION) {
                minSpacing = uiConfig.FORMATION.MIN_SPACING || 40;
                separationStrength = uiConfig.FORMATION.SEPARATION_STRENGTH || 0.3;
            }
        } catch (e) {
            // Use defaults
        }
        
        this.minSpacing = config.minSpacing || minSpacing;
        this.separationStrength = config.separationStrength || separationStrength;
        this.maxSeparationIterations = config.maxSeparationIterations || 2; // Reduced iterations (was 3)

        // Movement state
        this.mode = 'travel'; // 'travel' or 'combat'
        this.enemyTarget = null; // Current enemy target for combat mode
        this.lastModeChangeLog = 0; // Throttle mode change logging

        // Target tracking per hero
        this.heroTargets = new Map(); // Map<heroId, enemyId> - tracks which enemy each hero is targeting
        this.availableEnemies = []; // List of available enemies for target finding

        // Attack position tracking (for move closer to attack behavior)
        this.heroAttackPositions = new Map(); // Map<heroId, {x, y, timestamp}> - temporary attack positions
        this.heroFormationPositions = new Map(); // Map<heroId, {x, y}> - remember formation positions
        this.heroAttackCooldowns = new Map(); // Map<heroId, timestamp> - prevent constant position switching

        // Tactical Formations - Using UI_CONFIG for responsive spacing
        this.currentFormation = 'line'; // 'line', 'wedge', 'wall', 'spread'
        
        // Get UI_CONFIG if available, otherwise use defaults
        let formationConfig = {
            LINE: { spacingX: 80, spacingY: 30 },
            WEDGE: { spacingX: 70, spacingY: 50 },
            WALL: { spacingX: 40, spacingY: 0 },
            SPREAD: { spacingX: 120, spacingY: 100 }
        };
        
        try {
            const uiConfig = this.scene.cache.json.get('uiConfig') || {};
            if (uiConfig.FORMATION?.FORMATIONS) {
                formationConfig = uiConfig.FORMATION.FORMATIONS;
            } else {
                // Try dynamic import
                import('../config/ui-config.js').then(({ UI_CONFIG }) => {
                    formationConfig = UI_CONFIG.FORMATION?.FORMATIONS || formationConfig;
                }).catch(() => {
                    // Use defaults
                });
            }
        } catch (e) {
            // Use defaults
        }
        
        this.formations = {
            line: { name: 'Line', spacingX: formationConfig.LINE?.spacingX || 80, spacingY: formationConfig.LINE?.spacingY || 30 },
            wedge: { name: 'Wedge', spacingX: formationConfig.WEDGE?.spacingX || 70, spacingY: formationConfig.WEDGE?.spacingY || 50 },
            wall: { name: 'Shield Wall', spacingX: formationConfig.WALL?.spacingX || 40, spacingY: formationConfig.WALL?.spacingY || 0 },
            spread: { name: 'Spread Out', spacingX: formationConfig.SPREAD?.spacingX || 120, spacingY: formationConfig.SPREAD?.spacingY || 100 }
        };

        // Movement smoothing
        this.smoothMovement = true;
        this.movementLerp = 0.15; // Lerp factor for smooth movement

        // Speed multipliers
        this.speedMultipliers = {
            combat: 1.0,
            travel: 1.2,
            formation: 0.9
        };

        // Step-based movement configuration
        this.stepBasedMovement = config.stepBasedMovement !== false; // Enabled by default
        this.stepDistanceMultiplier = config.stepDistanceMultiplier || 1.0; // Tune step distance

        // Track animation listeners to avoid duplicates
        this.animationListenersSetup = new Set(); // Set of hero IDs with listeners

        Logger.info('MovementManager', 'Initialized');
    }

    /**
     * Get class data for a hero
     * @param {Object} hero - Hero object
     * @returns {Object} Class data with attackRange, movementSpeed, preferredRange
     */
    getClassData(hero) {
        if (!hero || !hero.classId) {
            return { attackRange: 2, movementSpeed: 150, preferredRange: 2 };
        }

        // Try to get classes data if not already loaded
        if (!this.classesData) {
            try {
                this.classesData = this.scene.cache.json.get('classes');
            } catch (error) {
                // Classes data still not available, use defaults
                Logger.warn('MovementManager', 'Classes data not available, using defaults');
                return { attackRange: 2, movementSpeed: 150, preferredRange: 2 };
            }
        }

        const classData = this.classesData?.[hero.classId];
        if (!classData) {
            Logger.warn('MovementManager', `Class data not found for ${hero.classId}, using defaults`);
            return { attackRange: 2, movementSpeed: 150, preferredRange: 2 };
        }

        return {
            attackRange: classData.attackRange || 2,
            movementSpeed: classData.movementSpeed || 150,
            preferredRange: classData.preferredRange || 2
        };
    }

    /**
     * Calculate 2D distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    calculateDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if hero is within attack range of target
     * @param {Object} hero - Hero object
     * @param {Object} target - Target object with x, y properties
     * @param {number} rangeMultiplier - Multiplier for range (default 1.0, allows extended range while moving)
     * @returns {boolean} True if in range
     */
    isInRange(hero, target, rangeMultiplier = 1.0) {
        if (!hero || !target || !hero.sprite) return false;

        const heroX = hero.sprite.x || hero.x || 0;
        const heroY = hero.sprite.y || hero.y || 0;
        const targetX = target.x || target.sprite?.x || 0;
        const targetY = target.y || target.sprite?.y || 0;

        const distance = this.calculateDistance(heroX, heroY, targetX, targetY);
        const classData = this.getClassData(hero);

        // Convert attackRange to pixels with increased ranges
        const isMelee = classData.attackRange <= 5;
        const baseRange = isMelee ? 100 : (classData.attackRange * 15); // Increased from 60 and *10
        const tolerance = 20; // Allow attacks within 20px of range
        const rangeInPixels = (baseRange + tolerance) * rangeMultiplier;

        return distance <= rangeInPixels;
    }

    /**
     * Check if hero is actively moving toward target
     * @param {Object} hero - Hero object
     * @param {Object} target - Target object with x, y properties
     * @returns {boolean} True if hero is moving toward target
     */
    isMovingToTarget(hero, target) {
        if (!hero || !hero.sprite || !target) return false;

        const heroX = hero.sprite.x || hero.x || 0;
        const heroY = hero.sprite.y || hero.y || 0;
        const targetX = target.x || target.sprite?.x || 0;
        const targetY = target.y || target.sprite?.y || 0;

        // Check if hero has velocity toward target (if physics body exists)
        if (hero.sprite.body && hero.sprite.body.velocity) {
            const dx = targetX - heroX;
            const dy = targetY - heroY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;

                // Check if velocity is in direction of target (dot product > 0.5)
                const velocityX = hero.sprite.body.velocity.x || 0;
                const velocityY = hero.sprite.body.velocity.y || 0;
                const velocityMag = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

                if (velocityMag > 10) { // Moving at least 10 pixels/second
                    const dotProduct = (normalizedDx * velocityX + normalizedDy * velocityY) / velocityMag;
                    return dotProduct > 0.5; // Moving in direction of target
                }
            }
        }

        // Fallback: Check if hero is closer to target than last frame
        // This is a simple heuristic - if we're tracking positions, we could compare
        // For now, assume moving if not at target
        const distance = this.calculateDistance(heroX, heroY, targetX, targetY);
        const classData = this.getClassData(hero);
        const isMelee = classData.attackRange <= 5;
        const baseRange = isMelee ? 100 : (classData.attackRange * 15);
        return distance > baseRange * 0.8; // If within 80% of range, consider moving
    }

    /**
     * Determine if hero should temporarily move closer to enemy to attack
     * @param {Object} hero - Hero object
     * @param {Object} enemy - Enemy target
     * @returns {boolean} True if hero should move closer
     */
    shouldMoveToAttack(hero, enemy) {
        if (!hero || !enemy) return false;

        // Check cooldown to prevent constant position switching
        const cooldown = this.heroAttackCooldowns.get(hero.id);
        const now = Date.now();
        if (cooldown && (now - cooldown) < 500) { // 500ms cooldown
            return false;
        }

        // Check if hero is out of range
        if (this.isInRange(hero, enemy)) {
            return false; // Already in range, no need to move closer
        }

        // Check if hero has an active attack position
        const attackPos = this.heroAttackPositions.get(hero.id);
        if (attackPos && (now - attackPos.timestamp) < 2000) { // Attack position valid for 2 seconds
            return true; // Already moving to attack position
        }

        return true; // Should move closer
    }

    /**
     * Calculate temporary attack position closer to enemy
     * @param {Object} hero - Hero object
     * @param {Object} enemy - Enemy target
     * @param {Object} preferredPosition - Preferred formation position {x, y}
     * @returns {Object} Attack position {x, y}
     */
    getAttackPosition(hero, enemy, preferredPosition) {
        if (!hero || !enemy || !preferredPosition) {
            return preferredPosition || { x: 0, y: 0 };
        }

        const heroX = hero.sprite?.x || hero.x || 0;
        const heroY = hero.sprite?.y || hero.y || 0;
        const enemyX = enemy.x || enemy.sprite?.x || 0;
        const enemyY = enemy.y || enemy.sprite?.y || 0;

        const classData = this.getClassData(hero);
        const isMelee = classData.attackRange <= 5;
        const baseRange = isMelee ? 100 : (classData.attackRange * 15);
        const attackRange = baseRange + 20; // Add tolerance

        // Calculate distance from enemy
        const distanceToEnemy = this.calculateDistance(heroX, heroY, enemyX, enemyY);

        // If already in range, return preferred position
        if (distanceToEnemy <= attackRange) {
            return preferredPosition;
        }

        // Calculate direction from enemy to hero
        const dx = heroX - enemyX;
        const dy = heroY - enemyY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return preferredPosition;

        // Normalize direction
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;

        // Calculate attack position: enemy position + direction * (attackRange - 10)
        // Position slightly inside range to ensure attack works
        const attackDistance = attackRange - 10;
        const attackX = enemyX + normalizedDx * attackDistance;
        const attackY = enemyY + normalizedDy * attackDistance;

        // Blend with preferred position (70% attack position, 30% preferred)
        // This keeps hero closer to formation while still getting in range
        const blendedX = attackX * 0.7 + preferredPosition.x * 0.3;
        const blendedY = attackY * 0.7 + preferredPosition.y * 0.3;

        return { x: blendedX, y: blendedY };
    }

    /**
     * Calculate optimal position for hero during travel (formation mode)
     * @param {Object} hero - Hero object
     * @param {Array} party - Array of all heroes
     * @param {Object} leaderPosition - Leader position {x, y}
     * @returns {Object} Target position {x, y}
     */
    getFormationPosition(hero, party, leaderPosition) {
        if (!hero || !party || !leaderPosition) {
            return { x: 0, y: 0 };
        }

        // Find hero role and index for slotting
        const role = hero.role || 'dps';
        const dpsHeroes = party.filter(h => h.role === 'dps');
        const dpsIndex = dpsHeroes.findIndex(h => h.id === hero.id);

        const formationConfig = this.formations[this.currentFormation] || this.formations.line;

        let xOffset = 0;
        let yOffset = 0;

        // Positioning logic: Leader (Tank) is at the front (xOffset = 0)
        // Everyone else is behind (xOffset < 0)
        switch (this.currentFormation) {
            case 'wedge':
                // Arrowhead: Tank at front, DPS/Healer fan out behind
                if (role === 'tank') {
                    xOffset = 0;
                    yOffset = 0;
                } else if (role === 'healer') {
                    xOffset = -formationConfig.spacingX * 2;
                    yOffset = 0;
                } else {
                    // Spread DPS to the sides and slightly back
                    const side = dpsIndex % 2 === 0 ? 1 : -1;
                    const depth = Math.floor(dpsIndex / 2) + 1;
                    xOffset = -depth * formationConfig.spacingX;
                    yOffset = side * depth * formationConfig.spacingY;
                }
                break;
            case 'wall':
                // Tight vertical line (Shield Wall)
                if (role === 'tank') {
                    xOffset = 0;
                    yOffset = 0;
                } else {
                    const partyIndex = party.findIndex(h => h.id === hero.id);
                    xOffset = -formationConfig.spacingX;
                    yOffset = (partyIndex - (party.length / 2)) * 30;
                }
                break;
            case 'spread':
                // Wide spread to avoid AOE
                if (role === 'tank') {
                    xOffset = 0;
                    yOffset = 0;
                } else {
                    xOffset = -((dpsIndex + 1) * formationConfig.spacingX);
                    yOffset = (dpsIndex % 2 === 0 ? 1 : -1) * formationConfig.spacingY;
                }
                break;
            case 'line':
            default:
                // Standard follow-the-leader line
                if (role === 'tank') {
                    xOffset = 0;
                    yOffset = 0;
                } else {
                    // Numerical index behind tank
                    const partyIndex = party.findIndex(h => h.id === hero.id);
                    xOffset = -partyIndex * formationConfig.spacingX;
                    yOffset = (partyIndex % 2 === 0 ? 1 : -1) * formationConfig.spacingY;
                }
                break;
        }

        // Calculate target positions
        let targetX = leaderPosition.x + xOffset;
        const heroCurrentY = hero.sprite?.y || hero.y || leaderPosition.y;
        const baseTargetY = leaderPosition.y + yOffset;

        // Maintain vertical stability: slow Y adjustment to formation
        const maxTargetYChange = 3;
        const targetYDelta = baseTargetY - heroCurrentY;
        const clampedTargetYDelta = Math.sign(targetYDelta) * Math.min(Math.abs(targetYDelta), maxTargetYChange);
        let targetY = heroCurrentY + clampedTargetYDelta;

        return {
            x: targetX,
            y: targetY
        };
    }

    /**
     * Set active tactical formation
     * @param {string} formationKey - 'line', 'wedge', 'wall', 'spread'
     */
    setFormation(formationKey) {
        if (this.formations[formationKey]) {
            this.currentFormation = formationKey;
            Logger.info('MovementManager', `Formation set to: ${this.formations[formationKey].name}`);
        }
    }

    /**
     * Calculate idle formation positions for all heroes (when not moving or in combat)
     * Creates a clean, organized formation around the leader
     * @param {Array} party - Array of all heroes
     * @param {Object} leaderPosition - Leader position {x, y}
     * @returns {Map} Map of heroId -> position {x, y}
     */
    getIdleFormation(party, leaderPosition) {
        const formation = new Map();

        if (!party || party.length === 0 || !leaderPosition) {
            return formation;
        }

        // Find leader (tank or first hero)
        const leader = party.find(h => h.role === 'tank') || party[0];
        if (!leader) return formation;

        // Create a more organized idle formation
        // Tank in center front, healer slightly back and center, DPS spread out
        for (let i = 0; i < party.length; i++) {
            const hero = party[i];
            if (!hero || !hero.id) continue;

            const role = hero.role || 'dps';

            if (role === 'tank') {
                // Tank: Center front position
                formation.set(hero.id, {
                    x: leaderPosition.x,
                    y: leaderPosition.y
                });
            } else if (role === 'healer') {
                // Healer: Center back position
                formation.set(hero.id, {
                    x: leaderPosition.x,
                    y: leaderPosition.y - 40
                });
            } else if (role === 'dps') {
                // DPS: Spread out in a semi-circle behind tank
                const dpsIndex = party.filter(h => (h.role || 'dps') === 'dps').indexOf(hero);
                const angle = (dpsIndex * Math.PI / 2) - Math.PI / 4; // Spread from -45° to +45°
                const distance = 60;
                const x = leaderPosition.x + Math.cos(angle) * distance;
                const y = leaderPosition.y - 20 + Math.sin(angle) * distance;

                formation.set(hero.id, { x, y });
            }
        }

        return formation;
    }

    /**
     * Calculate travel formation positions for all heroes
     * Accounts for leader's velocity and direction to maintain formation during movement
     * @param {Array} party - Array of all heroes
     * @param {Object} leaderPosition - Leader position {x, y}
     * @returns {Map} Map of heroId -> position {x, y}
     */
    getTravelFormation(party, leaderPosition) {
        const formation = new Map();

        if (!party || party.length === 0 || !leaderPosition) {
            return formation;
        }

        // Find leader (tank or first hero)
        const leader = party.find(h => h.role === 'tank') || party[0];
        if (!leader) return formation;

        // Get leader's velocity for formation adjustment
        let leaderVelocityX = 0;
        let leaderVelocityY = 0;
        if (leader.sprite && leader.sprite.body) {
            leaderVelocityX = leader.sprite.body.velocity?.x || 0;
            leaderVelocityY = leader.sprite.body.velocity?.y || 0;
        }

        // Calculate movement angle
        const movementSpeed = Math.sqrt(leaderVelocityX * leaderVelocityX + leaderVelocityY * leaderVelocityY);
        const movementAngle = movementSpeed > 0.1 ? Math.atan2(leaderVelocityY, leaderVelocityX) : 0;

        // Calculate formation for each hero
        for (let i = 0; i < party.length; i++) {
            const hero = party[i];
            if (!hero || !hero.id) continue;

            const heroIndex = i;
            const centerIndex = Math.floor((party.length - 1) / 2);
            const xOffset = (heroIndex - centerIndex) * 80; // Increased from 60 to 80 for better spacing
            const yOffset = (heroIndex % 2) * 30; // Increased from 20 to 30 for better vertical separation

            // Base position
            let targetX = leaderPosition.x + xOffset;
            let targetY = leaderPosition.y - yOffset;

            // Adjust for movement direction if leader is moving
            if (movementSpeed > 0.1) {
                // Rotate formation relative to movement direction
                const cosAngle = Math.cos(movementAngle);
                const sinAngle = Math.sin(movementAngle);

                // Apply rotation to offset
                const rotatedX = xOffset * cosAngle - yOffset * sinAngle;
                const rotatedY = xOffset * sinAngle + yOffset * cosAngle;

                // Blend between normal and rotated formation (30% rotation)
                targetX = leaderPosition.x + (xOffset * 0.7 + rotatedX * 0.3);
                targetY = leaderPosition.y - (yOffset * 0.7 + rotatedY * 0.3);
            }

            // Apply road-following behavior (70% road preference, 30% formation)
            const preferredY = this.getPreferredYPosition(leaderPosition.x);
            const formationYBeforeRoad = targetY;
            if (preferredY !== null) {
                // Blend formation Y with road Y
                targetY = preferredY * 0.7 + targetY * 0.3;
            }

            formation.set(hero.id, { x: targetX, y: targetY });
        }

        return formation;
    }

    /**
     * Get preferred Y position based on road (for path guidance)
     * @param {number} x - X coordinate
     * @returns {number|null} Preferred Y position, or null if no road
     */
    getPreferredYPosition(x) {
        if (!this.scene || !this.scene.environmentBackground) {
            return null;
        }

        const roadY = this.scene.environmentBackground.getRoadYAtX(x);
        return roadY;
    }

    /**
     * Calculate optimal position for hero during combat
     * @param {Object} hero - Hero object
     * @param {Object} enemy - Enemy object with x, y properties (optional, will use currentTarget if not provided)
     * @param {Array} party - Array of all heroes
     * @returns {Object} Target position {x, y}
     */
    getCombatPosition(hero, enemy, party) {
        if (!hero || !party) {
            const heroX = hero?.sprite?.x || hero?.x || 0;
            const heroY = hero?.sprite?.y || hero?.y || 0;
            return { x: heroX, y: heroY };
        }

        // Use current target if enemy not provided or invalid
        let targetEnemy = enemy;
        if (!targetEnemy || !this.isValidTarget(targetEnemy)) {
            targetEnemy = this.getCurrentTarget(hero);
        }

        // If still no valid target, return current position
        if (!targetEnemy || !this.isValidTarget(targetEnemy)) {
            const heroX = hero.sprite?.x || hero.x || 0;
            const heroY = hero.sprite?.y || hero.y || 0;
            return { x: heroX, y: heroY };
        }

        const heroX = hero.sprite?.x || hero.x || 0;
        const heroY = hero.sprite?.y || hero.y || 0;
        const enemyX = targetEnemy.x || targetEnemy.sprite?.x || 0;
        const enemyY = targetEnemy.y || targetEnemy.sprite?.y || 0;

        // Determine which side enemy is on relative to party
        // Use tank position as the primary anchor for "party front"
        const tank = party.find(h => h.role === 'tank');
        const tankX = tank?.sprite?.x || tank?.x || heroX;
        
        // Use party average ONLY as fallback if tank is missing
        const partyAvgX = (party.reduce((sum, h) => sum + (h.sprite?.x || h.x || 0), 0) / party.length) || heroX;
        
        // Stabilize party center: prefer tank position but don't let it drift too far from average
        const partyCenterX = tank ? tankX : partyAvgX;

        // If enemy is to the right of party center, heroes should be to the left of enemy (enemyX - range)
        // If enemy is to the left of party center, heroes should be to the right of enemy (enemyX + range)
        // side-scroller stabilization: default to enemyOnRight = true if we're close to the start
        const enemyOnRight = enemyX > partyCenterX;

        // DEBUG: Log positioning logic (throttled)
        if (Math.random() < 0.01) { // 1% chance to log
        }

        const classData = this.getClassData(hero);
        const role = hero.role || 'dps';

        // Calculate base position based on role
        let targetX = enemyX;
        let targetY = enemyY;

        if (role === 'tank') {
            // Tank: Front line, 50 pixels from enemy (melee range)
            // Position tank BETWEEN party and enemy (closer to enemy)
            const meleeRange = 50; // Standard melee range in pixels (reduced from 60)

            // CRITICAL FIX: Always position tank between party and enemy, closer to enemy
            // If enemy is to the right of party, tank should be to the left of enemy but to the right of party
            // If enemy is to the left of party, tank should be to the right of enemy but to the left of party
            if (enemyOnRight) {
                // Enemy to the right: tank should be between party and enemy, closer to enemy
                // Position tank to the left of enemy (enemyX - range), but not further left than party
                targetX = Math.max(partyCenterX + 10, enemyX - meleeRange);
            } else {
                // Enemy to the left: tank should be between party and enemy, closer to enemy
                // CRITICAL FIX: When enemy is to the LEFT, heroes should move RIGHT (towards enemy)
                // But tank should position itself BETWEEN party and enemy, closer to enemy
                // Since enemy is to the left, tank should be to the RIGHT of enemy but to the LEFT of party
                // Position tank to the right of enemy (enemyX + range)
                const idealTankX = enemyX + meleeRange; // To the right of enemy
                // Tank should be between enemy and party, closer to enemy
                // If ideal position is between enemy and party, use it
                // Otherwise, ensure tank is at least to the right of enemy
                if (idealTankX < partyCenterX) {
                    // Ideal position is between enemy and party - use it (tank moves right towards enemy)
                    targetX = idealTankX;
                } else {
                    // Ideal position would be to the right of party - this shouldn't happen
                    // But if it does, position tank just to the right of enemy
                    targetX = enemyX + meleeRange;
                }
            }

            targetY = enemyY; // Same Y as enemy
        } else if (role === 'healer') {
            // Healer: Middle-back, 150 pixels from enemy (X distance), centered laterally
            const healerRange = 150; // Healer stays back from front line (reduced from 180)
            // Position healer BEHIND tank (further from enemy)
            targetX = enemyOnRight ? enemyX - healerRange : enemyX + healerRange;
            targetY = enemyY - 60; // Y offset -60px (behind party)

            // Center laterally based on party spread
            const partyXPositions = party
                .filter(h => h.role === 'dps' && h.sprite)
                .map(h => h.sprite.x || h.x || 0);

            if (partyXPositions.length > 0) {
                const avgX = partyXPositions.reduce((sum, x) => sum + x, 0) / partyXPositions.length;
                targetX = avgX; // Center on DPS average
            }
        } else if (role === 'dps') {
            // DPS: Position based on attack range
            const isMelee = classData.attackRange <= 5;

            if (isMelee) {
                // Melee DPS: Behind tank, positioned at 70-80px from enemy
                const tank = party.find(h => h.role === 'tank');
                // Calculate tank position based on enemy position
                const tankMeleeRange = 50;
                const tankX = tank?.sprite?.x || tank?.x || (enemyOnRight ? enemyX - tankMeleeRange : enemyX + tankMeleeRange);
                const tankY = tank?.sprite?.y || tank?.y || enemyY;

                // Find all melee DPS (including this hero) to space out
                const meleeDPS = party.filter(h =>
                    h.role === 'dps' &&
                    this.getClassData(h).attackRange <= 5
                );
                const meleeIndex = meleeDPS.findIndex(h => h.id === hero.id);

                // Position melee DPS at 70-80px from enemy (behind tank but closer)
                const meleeDPSRange = 75; // 75px from enemy (between tank at 50px and ranged at 180px)
                const spacing = 40; // 40px lateral spacing between melee DPS
                targetX = enemyOnRight ? enemyX - meleeDPSRange : enemyX + meleeDPSRange;
                targetX += (meleeIndex - meleeDPS.length / 2) * spacing; // Spread out laterally
                targetY = tankY - 30; // Y offset -30px (slightly behind tank)
            } else {
                // Ranged DPS: Back line, 180 pixels from enemy (X distance)
                const rangedRange = 180; // Standard ranged position (reduced from 220)
                // Position ranged DPS BEHIND tank (further from enemy)
                targetX = enemyOnRight ? enemyX - rangedRange : enemyX + rangedRange;
                targetY = enemyY - 80; // Y offset -80px (back line)

                // Spread laterally
                const rangedDPS = party.filter(h =>
                    h.role === 'dps' &&
                    this.getClassData(h).attackRange > 5
                );
                const rangedIndex = rangedDPS.findIndex(h => h.id === hero.id);
                targetX += (rangedIndex - rangedDPS.length / 2) * 60; // Spread out
            }
        }

        return { x: targetX, y: targetY };
    }

    /**
     * Check for collisions with other heroes and calculate separation force
     * @param {Object} hero - Hero object
     * @param {Array} party - Array of all heroes
     * @returns {Object} Separation vector {x, y}
     */
    checkCollisions(hero, party) {
        if (!hero || !hero.sprite || !party) {
            return { x: 0, y: 0 };
        }

        const heroX = hero.sprite.x || hero.x || 0;
        const heroY = hero.sprite.y || hero.y || 0;
        let separationX = 0;
        let separationY = 0;
        let totalWeight = 0;

        // Check distance to all other heroes with weighted separation
        for (const otherHero of party) {
            if (!otherHero || !otherHero.sprite || otherHero.id === hero.id) {
                continue;
            }

            const otherX = otherHero.sprite.x || otherHero.x || 0;
            const otherY = otherHero.sprite.y || otherHero.y || 0;

            const distance = this.calculateDistance(heroX, heroY, otherX, otherY);

            // Use weighted separation based on distance (closer = stronger)
            if (distance < this.minSpacing * 2 && distance > 0) {
                const separation = this.calculateSeparationForce(heroX, heroY, otherX, otherY, this.minSpacing);

                // Weight by inverse distance (closer heroes have more influence)
                const weight = 1 / (distance + 1); // +1 to avoid division by zero
                totalWeight += weight;

                separationX += separation.x * weight;
                separationY += separation.y * weight;
            }
        }

        // Normalize by total weight to prevent excessive separation
        if (totalWeight > 0) {
            separationX /= totalWeight;
            separationY /= totalWeight;
        }

        return { x: separationX, y: separationY };
    }

    /**
     * Calculate separation force between two heroes
     * @param {number} heroX - Hero X position
     * @param {number} heroY - Hero Y position
     * @param {number} otherX - Other hero X position
     * @param {number} otherY - Other hero Y position
     * @param {number} minDistance - Minimum distance to maintain
     * @returns {Object} Separation force {x, y}
     */
    calculateSeparationForce(heroX, heroY, otherX, otherY, minDistance) {
        const dx = heroX - otherX;
        const dy = heroY - otherY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance && distance > 0) {
            // Normalize direction
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;

            // Calculate separation force (stronger when closer)
            // Use inverse square for smoother falloff
            const overlap = minDistance - distance;
            const separationForce = (overlap / minDistance) * this.separationStrength * minDistance;

            // Limit maximum separation force to prevent jittery movement
            const maxForce = minDistance * 0.5;
            const clampedForce = Math.min(separationForce, maxForce);

            return {
                x: normalizedX * clampedForce,
                y: normalizedY * clampedForce
            };
        }

        return { x: 0, y: 0 };
    }

    /**
     * Resolve collision by pushing heroes apart
     * @param {Object} hero - Hero object
     * @param {Object} otherHero - Other hero object
     * @returns {Object} Separation adjustment {x, y}
     */
    resolveCollision(hero, otherHero) {
        if (!hero || !hero.sprite || !otherHero || !otherHero.sprite) {
            return { x: 0, y: 0 };
        }

        const heroX = hero.sprite.x || hero.x || 0;
        const heroY = hero.sprite.y || hero.y || 0;
        const otherX = otherHero.sprite.x || otherHero.x || 0;
        const otherY = otherHero.sprite.y || otherHero.y || 0;

        return this.calculateSeparationForce(heroX, heroY, otherX, otherY, this.minSpacing);
    }

    /**
     * Maintain minimum spacing between heroes
     * @param {Object} hero - Hero object
     * @param {Array} party - Array of all heroes
     * @param {number} minDistance - Minimum distance to maintain (optional, uses this.minSpacing if not provided)
     * @returns {Object} Position adjustment {x, y}
     */
    maintainSpacing(hero, party, minDistance = null) {
        // Use provided minDistance or default
        const spacing = minDistance || this.minSpacing;

        if (!hero || !hero.sprite || !party) {
            return { x: 0, y: 0 };
        }

        const heroX = hero.sprite.x || hero.x || 0;
        const heroY = hero.sprite.y || hero.y || 0;
        let separationX = 0;
        let separationY = 0;

        // Check all heroes for spacing violations
        for (const otherHero of party) {
            if (!otherHero || !otherHero.sprite || otherHero.id === hero.id) {
                continue;
            }

            const otherX = otherHero.sprite.x || otherHero.x || 0;
            const otherY = otherHero.sprite.y || otherHero.y || 0;

            const separation = this.calculateSeparationForce(heroX, heroY, otherX, otherY, spacing);
            separationX += separation.x;
            separationY += separation.y;
        }

        return { x: separationX, y: separationY };
    }

    /**
     * Calculate movement vector towards target
     * @param {number} heroX - Hero X position
     * @param {number} heroY - Hero Y position
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {number} speed - Movement speed (pixels per second)
     * @param {number} deltaTime - Time delta in milliseconds
     * @returns {Object} Movement vector {x, y, distance}
     */
    calculateMovementVector(heroX, heroY, targetX, targetY, speed, deltaTime) {
        const dx = targetX - heroX;
        const dy = targetY - heroY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If already at target (within 1px), return zero vector
        if (distance < 1) {
            return { x: 0, y: 0, distance: 0 };
        }

        // Normalize direction vector
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Calculate movement distance (pixels per frame)
        const moveDistance = (speed * deltaTime) / 1000;

        // Limit movement to not overshoot target
        const actualMoveDistance = Math.min(moveDistance, distance);

        return {
            x: dirX * actualMoveDistance,
            y: dirY * actualMoveDistance,
            distance: distance
        };
    }

    /**
     * Set up animation event listeners for step-based movement
     * @param {Object} hero - Hero object
     */
    setupAnimationListeners(hero) {
        if (!hero || !hero.sprite || !hero.id) {
            return;
        }

        // Avoid duplicate listeners
        if (this.animationListenersSetup.has(hero.id)) {
            return;
        }

        // Listen for animation update events to track progress
        hero.sprite.on('animationupdate', (animation, frame) => {
            if (animation && animation.key && animation.key.includes('walk')) {
                // Update progress tracking when walk animation frame changes
                if (hero._lastWalkProgress === undefined) {
                    hero._lastWalkProgress = animation.progress || 0;
                }
            }
        });

        // Listen for animation repeat to handle looping
        hero.sprite.on('animationrepeat', (animation) => {
            if (animation && animation.key && animation.key.includes('walk')) {
                // Reset progress tracking on animation loop
                hero._lastWalkProgress = 0;
            }
        });

        this.animationListenersSetup.add(hero.id);
    }

    /**
     * Get animation progress for a sprite (0-1)
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite with animation
     * @returns {number} Animation progress (0-1), or 0 if no animation
     */
    getAnimationProgress(sprite) {
        if (!sprite || !sprite.anims || !sprite.anims.currentAnim) {
            return 0;
        }
        const anim = sprite.anims.currentAnim;
        return anim.progress || 0;
    }

    /**
     * Get animation frame rate and duration
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite with animation
     * @returns {Object} {frameRate, duration, frameCount} or null
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
     * Calculate step distance per animation cycle
     * @param {number} movementSpeed - Movement speed in pixels per second
     * @param {Object} animationInfo - Animation info {duration, frameRate, frameCount}
     * @returns {number} Step distance in pixels per animation cycle
     */
    calculateStepDistance(movementSpeed, animationInfo) {
        if (!animationInfo) {
            // Fallback: assume 8 frames at 12fps
            const defaultDuration = 8 / 12; // 0.667 seconds
            return (movementSpeed * defaultDuration) * this.stepDistanceMultiplier;
        }
        // Step distance = speed * duration * multiplier
        return (movementSpeed * animationInfo.duration) * this.stepDistanceMultiplier;
    }

    /**
     * Calculate step-based movement based on animation progress
     * @param {Object} hero - Hero object
     * @param {Object} target - Target position {x, y}
     * @param {number} deltaTime - Time delta in milliseconds
     * @returns {Object} Movement vector {x, y, distance}
     */
    calculateStepBasedMovement(hero, target, deltaTime) {
        if (!hero || !hero.sprite || !this.stepBasedMovement) {
            return null;
        }

        const heroX = hero.sprite.x || hero.x || 0;
        const heroY = hero.sprite.y || hero.y || 0;

        // Check if walk animation is playing
        const currentAnim = hero.sprite.anims?.currentAnim;
        if (!currentAnim || !currentAnim.key.includes('walk')) {
            return null; // Not walking, use normal movement
        }

        // Get animation progress
        const animationProgress = this.getAnimationProgress(hero.sprite);
        const animationInfo = this.getAnimationInfo(hero.sprite);

        if (!animationInfo) {
            return null; // Can't get animation info, fallback to normal
        }

        // Get movement speed
        const classData = this.getClassData(hero);
        const baseSpeed = classData.movementSpeed || 150;
        let speedMultiplier = this.speedMultipliers.combat;
        if (this.mode === 'travel') {
            speedMultiplier = this.speedMultipliers.travel;
        }
        const formationMultiplier = (this.mode === 'travel') ? this.speedMultipliers.formation : 1.0;
        const finalSpeed = baseSpeed * speedMultiplier * formationMultiplier;

        // Calculate step distance per animation cycle
        const stepDistance = this.calculateStepDistance(finalSpeed, animationInfo);

        // Track previous progress to calculate delta
        const lastProgress = hero._lastWalkProgress !== undefined ? hero._lastWalkProgress : animationProgress;
        hero._lastWalkProgress = animationProgress;

        // Calculate progress delta (handles animation looping)
        let progressDelta = animationProgress - lastProgress;
        if (progressDelta < 0) {
            // Animation looped, add 1.0 to get full cycle
            progressDelta = (1.0 - lastProgress) + animationProgress;
        }

        // Calculate forward movement based on progress delta
        const forwardMovement = stepDistance * progressDelta;

        // Calculate direction to target
        const dx = target.x - heroX;
        const dy = target.y - heroY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) {
            return { x: 0, y: 0, distance: 0 };
        }

        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Limit movement to not overshoot target
        const actualMoveDistance = Math.min(forwardMovement, distance);

        return {
            x: dirX * actualMoveDistance,
            y: dirY * actualMoveDistance,
            distance: distance
        };
    }

    /**
     * Calculate next position for hero with movement and collision avoidance
     * @param {Object} hero - Hero object
     * @param {Object} target - Target position {x, y}
     * @param {Array} party - Array of all heroes
     * @param {number} deltaTime - Time delta in milliseconds
     * @returns {Object} New position {x, y}
     */
    updateHeroPosition(hero, target, party, deltaTime) {
        if (!hero || !hero.sprite || !target || !party) {
            return null;
        }

        const heroX = hero.sprite.x || hero.x || 0;
        const heroY = hero.sprite.y || hero.y || 0;

        const classData = this.getClassData(hero);

        // Get base movement speed from class data
        const baseSpeed = classData.movementSpeed || 150;

        // Apply speed multiplier based on mode
        let speedMultiplier = this.speedMultipliers.combat;
        if (this.mode === 'travel') {
            speedMultiplier = this.speedMultipliers.travel;
        }

        // Apply formation adjustment multiplier (slightly slower to maintain formation)
        // Only apply in travel mode when maintaining formation
        const formationMultiplier = (this.mode === 'travel') ? this.speedMultipliers.formation : 1.0;
        const finalSpeed = baseSpeed * speedMultiplier * formationMultiplier;

        // Try step-based movement first (if enabled and walk animation is playing)
        let movement = this.calculateStepBasedMovement(hero, target, deltaTime);

        // Fallback to normal movement if step-based not applicable
        if (!movement) {
            movement = this.calculateMovementVector(heroX, heroY, target.x, target.y, finalSpeed, deltaTime);
        }

        // Update animations based on movement state
        // Animations are now generated from the runtime sprite, so they're compatible
        if (hero && hero.sprite && this.scene.animationManager) {
            const isMoving = movement.distance > 1;
            const characterType = hero.classId || 'paladin';
            const characterId = hero.id;

            // Throttle animation switching to prevent excessive calls
            const now = Date.now();
            const lastAnimChange = hero._lastAnimChange || 0;
            const animChangeCooldown = 100; // Only change animation every 100ms

            if (isMoving) {
                // Play walk animation
                const walkAnimKey = this.scene.animationManager.getAnimationKey(characterType, characterId, 'walk');

                // Check if this animation recently failed - if so, skip attempt to prevent spam
                const lastFailureTime = this.failedAnimationCache.get(walkAnimKey);
                const isOnCooldown = lastFailureTime && (now - lastFailureTime) < this.animationFailureCooldown;

                // Pre-check: If animation exists, verify it has valid frames before attempting to play
                const animExists = this.scene.animationManager.scene.anims.exists(walkAnimKey);
                let hasValidFrames = false;
                if (animExists) {
                    const anim = this.scene.animationManager.scene.anims.get(walkAnimKey);
                    hasValidFrames = anim && anim.frames && anim.frames.length > 0;
                    // If animation exists but has no frames, treat as failed and cache it
                    if (!hasValidFrames && !isOnCooldown) {
                        // Cache the failure immediately to prevent spam
                        this.failedAnimationCache.set(walkAnimKey, now);
                    }
                }

                // Only attempt to play if animation exists with valid frames, OR if animation doesn't exist (will initialize)
                // But skip if animation exists but has no frames (it's broken - already cached)
                const shouldAttempt = !animExists || hasValidFrames;
                if (hero.sprite.anims && hero.sprite.anims.currentAnim?.key !== walkAnimKey && now - lastAnimChange > animChangeCooldown && !isOnCooldown && shouldAttempt) {
                    const playResult = this.scene.animationManager.playAnimation(hero.sprite, characterType, characterId, 'walk');
                    if (!playResult) {
                        // Cache failed attempt
                        this.failedAnimationCache.set(walkAnimKey, now);
                    } else {
                        // Success - remove from failed cache
                        this.failedAnimationCache.delete(walkAnimKey);
                    }
                    hero._lastAnimChange = now;

                    // Initialize animation progress tracking for step-based movement
                    if (this.stepBasedMovement) {
                        hero._lastWalkProgress = 0;
                        // Set up animation event listeners for step-based movement
                        this.setupAnimationListeners(hero);
                    }
                }
            } else {
                // Play idle animation (only if not in combat animation)
                const currentAnim = hero.sprite.anims?.currentAnim?.key || '';
                const isCombatAnim = currentAnim.includes('attack') || currentAnim.includes('defend') || currentAnim.includes('heal');

                if (!isCombatAnim) {
                    const idleAnimKey = this.scene.animationManager.getAnimationKey(characterType, characterId, 'idle');

                    // Check if this animation recently failed - if so, skip attempt to prevent spam
                    const lastFailureTime = this.failedAnimationCache.get(idleAnimKey);
                    const isOnCooldown = lastFailureTime && (now - lastFailureTime) < this.animationFailureCooldown;

                    // Pre-check: If animation exists, verify it has valid frames before attempting to play
                    const animExists = this.scene.animationManager.scene.anims.exists(idleAnimKey);
                    let hasValidFrames = false;
                    if (animExists) {
                        const anim = this.scene.animationManager.scene.anims.get(idleAnimKey);
                        hasValidFrames = anim && anim.frames && anim.frames.length > 0;
                        // If animation exists but has no frames, treat as failed and cache it
                        if (!hasValidFrames && !isOnCooldown) {
                            // Cache the failure immediately to prevent spam
                            this.failedAnimationCache.set(idleAnimKey, now);
                        }
                    }

                    // Only attempt to play if animation exists with valid frames, OR if animation doesn't exist (will initialize)
                    // But skip if animation exists but has no frames (it's broken - already cached)
                    const shouldAttemptIdle = !animExists || hasValidFrames;
                    if (hero.sprite.anims && hero.sprite.anims.currentAnim?.key !== idleAnimKey && now - lastAnimChange > animChangeCooldown && !isOnCooldown && shouldAttemptIdle) {
                        const playResult = this.scene.animationManager.playAnimation(hero.sprite, characterType, characterId, 'idle');
                        if (!playResult) {
                            // Cache failed attempt
                            this.failedAnimationCache.set(idleAnimKey, now);
                        } else {
                            // Success - remove from failed cache
                            this.failedAnimationCache.delete(idleAnimKey);
                        }
                        hero._lastAnimChange = now;
                    }
                }
            }
        }

        // If already at target, return current position
        if (movement.distance < 1) {
            return { x: heroX, y: heroY };
        }

        // Calculate new position
        // CRITICAL FIX: Clamp movement Y to prevent large vertical jumps
        const maxMovementYPerFrame = 3; // Reduced from 5
        const clampedMovementY = Math.sign(movement.y) * Math.min(Math.abs(movement.y), maxMovementYPerFrame);

        let newX = heroX + movement.x;
        let newY = heroY + clampedMovementY;

        // Apply smooth movement interpolation if enabled
        if (this.smoothMovement && movement.distance > 5) {
            // Use lerp for smoother movement (only when far from target)
            // Normalize lerp factor to frame rate (60fps = 16ms delta)
            const normalizedDelta = deltaTime / 16;
            const lerpFactor = Math.min(this.movementLerp * normalizedDelta, 1);

            // Blend between direct movement and lerped movement
            // Direct movement ensures we move towards target, lerp smooths it
            const directX = heroX + movement.x;
            const directY = heroY + clampedMovementY; // Use clamped movement Y

            // CRITICAL FIX: Clamp lerped Y movement to prevent jumps
            const rawLerpedY = heroY + (target.y - heroY) * lerpFactor;
            const lerpedYDelta = rawLerpedY - heroY;
            const clampedLerpedYDelta = Math.sign(lerpedYDelta) * Math.min(Math.abs(lerpedYDelta), maxMovementYPerFrame);
            const lerpedY = heroY + clampedLerpedYDelta;

            const lerpedX = heroX + (target.x - heroX) * lerpFactor;

            // Blend: 70% direct movement, 30% lerped (for smoothness)
            newX = directX * 0.7 + lerpedX * 0.3;
            newY = directY * 0.7 + lerpedY * 0.3;
        }

        const yBeforeCollision = newY;
        // Apply collision avoidance (multiple iterations for stability)
        // CRITICAL FIX: Clamp Y separation to prevent jumping
        // Vertical separation should be gentler than horizontal to prevent visible jumps
        const maxYDeltaPerFrame = 3; // Maximum Y change per frame (pixels)
        let totalYSeparation = 0;
        let rawYSeparationSum = 0; // Track raw separation for debugging

        for (let i = 0; i < this.maxSeparationIterations; i++) {
            const separation = this.checkCollisions(hero, party);
            newX += separation.x;

            // Track raw separation before reduction
            rawYSeparationSum += separation.y;

            // Apply Y separation with reduced strength and clamping
            // Vertical corrections should be gentler (0.4x strength) to prevent jumping
            const ySeparation = separation.y * 0.4;
            totalYSeparation += ySeparation;

            // Clamp total Y separation to prevent large jumps
            if (Math.abs(totalYSeparation) > maxYDeltaPerFrame) {
                totalYSeparation = Math.sign(totalYSeparation) * maxYDeltaPerFrame;
            }
        }

        // Apply clamped Y separation
        newY += totalYSeparation;


        return { x: newX, y: newY };
    }

    /**
     * Set movement mode (travel or combat)
     * @param {string} mode - 'travel' or 'combat'
     * @param {Object} enemyTarget - Enemy target for combat mode (optional)
     */
    setMode(mode, enemyTarget = null) {
        if (this.mode !== mode) {
            this.mode = mode;
            this.enemyTarget = enemyTarget;

            // Throttle mode change logging (only log once per second)
            const now = Date.now();
            if (!this.lastModeChangeLog || now - this.lastModeChangeLog > 1000) {
                this.lastModeChangeLog = now;
                Logger.info('MovementManager', `Mode set to: ${mode}`);
            }
        } else if (enemyTarget !== this.enemyTarget) {
            // Update enemy target even if mode hasn't changed
            this.enemyTarget = enemyTarget;
        }
    }

    /**
     * Update all heroes' positions based on current mode
     * @param {Array} party - Array of all heroes
     * @param {Object} leaderPosition - Leader position for travel mode {x, y}
     * @param {Object} enemy - Enemy for combat mode {x, y} (optional, will use hero targets)
     * @param {number} deltaTime - Time delta in milliseconds
     * @returns {Array} Array of new positions for each hero [{heroId, x, y}, ...]
     */
    updatePartyPositions(party, leaderPosition, enemy, deltaTime) {
        if (!party || party.length === 0) {
            return [];
        }

        // Debug: allow freezing hero movement via registry flag for investigation
        try {
            const freeze = this.scene?.registry?.get('freeze_heroes');
            if (freeze) {
                // Return no position updates to effectively pause hero movement
                return [];
            }
        } catch (err) {
            // ignore registry access errors
        }

        const newPositions = [];

        for (const hero of party) {
            if (!hero || !hero.sprite) {
                continue;
            }

            // In travel mode, skip the tank - WorldManager handles its movement via velocity
            // This prevents MovementManager from overriding the tank's physics velocity
            if (this.mode === 'travel' && hero.role === 'tank') {
                continue;
            }

            const prevX = hero.sprite.x ?? hero.x ?? 0;
            const prevY = hero.sprite.y ?? hero.y ?? 0;

            let targetPosition;

            if (this.mode === 'combat') {
                // In combat mode, use hero's current target or find new one
                let targetEnemy = this.getCurrentTarget(hero);

                // Validate current target
                if (!targetEnemy || !this.isValidTarget(targetEnemy)) {
                    // Find new target
                    targetEnemy = this.findNearestEnemy(hero);
                    if (targetEnemy) {
                        this.updateTarget(hero, targetEnemy);
                    } else {
                        // Fallback to provided enemy if no target found
                        targetEnemy = enemy;
                    }
                }

                if (targetEnemy && this.isValidTarget(targetEnemy)) {
                    // Get preferred formation position
                    const preferredPosition = this.getCombatPosition(hero, targetEnemy, party);

                    // Store formation position for later return
                    this.heroFormationPositions.set(hero.id, preferredPosition);

                    // Check if hero should move closer to attack
                    if (this.shouldMoveToAttack(hero, targetEnemy)) {
                        // Calculate attack position (closer to enemy)
                        const attackPos = this.getAttackPosition(hero, targetEnemy, preferredPosition);
                        targetPosition = attackPos;

                        // Store attack position with timestamp
                        this.heroAttackPositions.set(hero.id, {
                            x: attackPos.x,
                            y: attackPos.y,
                            timestamp: Date.now()
                        });
                    } else {
                        // Check if hero is in range - if so, return to formation
                        if (this.isInRange(hero, targetEnemy)) {
                            // Clear attack position
                            this.heroAttackPositions.delete(hero.id);
                            targetPosition = preferredPosition;
                        } else {
                            // Still out of range but cooldown active - use stored attack position or preferred
                            const storedAttackPos = this.heroAttackPositions.get(hero.id);
                            if (storedAttackPos && (Date.now() - storedAttackPos.timestamp) < 2000) {
                                targetPosition = { x: storedAttackPos.x, y: storedAttackPos.y };
                            } else {
                                targetPosition = preferredPosition;
                            }
                        }
                    }
                } else {
                    // No valid target, return current position
                    const heroX = hero.sprite.x || hero.x || 0;
                    const heroY = hero.sprite.y || hero.y || 0;
                    targetPosition = { x: heroX, y: heroY };
                }
            } else if (this.mode === 'travel' && leaderPosition) {
                targetPosition = this.getFormationPosition(hero, party, leaderPosition);
            } else if (this.mode === 'idle' && leaderPosition) {
                // Use idle formation for organized positioning when not moving
                const idleFormation = this.getIdleFormation(party, leaderPosition);
                targetPosition = idleFormation.get(hero.id) || this.getFormationPosition(hero, party, leaderPosition);
            } else {
                // No movement if no valid target
                continue;
            }

            const newPos = this.updateHeroPosition(hero, targetPosition, party, deltaTime);

            if (newPos) {
                // Log unexpectedly large jumps to help diagnose runaway movement
                try {
                    const dx = Math.abs(newPos.x - prevX);
                    const dy = Math.abs(newPos.y - prevY);
                    if (dx > 500 || dy > 500) {
                        Logger.warn('MovementManager', `Large position jump for ${hero.id}: (${prevX.toFixed(1)},${prevY.toFixed(1)}) → (${newPos.x.toFixed(1)},${newPos.y.toFixed(1)})`);
                        // Create a temporary debug marker in the scene if possible
                        try {
                            if (this.scene && this.scene.add) {
                                const mark = this.scene.add.rectangle(newPos.x, newPos.y, 24, 24, 0xff0000, 0.6);
                                mark.setOrigin(0.5, 0.5);
                                mark.setDepth(10000);
                                mark.setScrollFactor(1);
                                // Remove marker after a short time
                                this.scene.time.delayedCall?.(3000, () => { if (mark && mark.destroy) mark.destroy(); });
                            }
                        } catch (err) { }
                    }
                } catch (err) { }

                newPositions.push({
                    heroId: hero.id,
                    x: newPos.x,
                    y: newPos.y
                });
            }
        }

        return newPositions;
    }

    /**
     * Calculate optimal position for hero (wrapper method)
     * @param {Object} hero - Hero object
     * @param {Object} enemy - Enemy object (for combat mode)
     * @param {Array} party - Array of all heroes
     * @returns {Object} Optimal position {x, y}
     */
    calculateOptimalPosition(hero, enemy, party) {
        if (this.mode === 'combat' && enemy) {
            return this.getCombatPosition(hero, enemy, party);
        }

        // Default to current position if no valid mode
        const heroX = hero?.sprite?.x || hero?.x || 0;
        const heroY = hero?.sprite?.y || hero?.y || 0;
        return { x: heroX, y: heroY };
    }

    /**
     * Set available enemies list for target finding
     * @param {Array} enemies - Array of enemy objects
     */
    setAvailableEnemies(enemies) {
        // Filter out dead/destroyed enemies
        this.availableEnemies = (enemies || []).filter(enemy => {
            if (!enemy) return false;
            // Check if enemy is dead
            if (enemy.data?.currentHealth !== undefined && enemy.data.currentHealth <= 0) return false;
            if (enemy.defeated) return false;
            // Check if sprite is destroyed
            if (enemy.sprite && enemy.sprite.destroyed) return false;
            return true;
        });
    }

    /**
     * Find nearest enemy for a hero
     * @param {Object} hero - Hero object
     * @param {Array} enemies - Array of available enemies (optional, uses this.availableEnemies if not provided)
     * @returns {Object|null} Nearest enemy or null
     */
    findNearestEnemy(hero, enemies = null) {
        if (!hero) return null;

        const enemyList = enemies || this.availableEnemies;
        if (!enemyList || enemyList.length === 0) return null;

        const heroX = hero.sprite?.x || hero.x || 0;
        const heroY = hero.sprite?.y || hero.y || 0;
        const role = hero.role || 'dps';
        const classData = this.getClassData(hero);

        let nearestEnemy = null;
        let nearestDistance = Infinity;
        let maxRange = Infinity;

        // Role-based targeting preferences
        if (role === 'tank') {
            // Tank prioritizes closest enemy
            maxRange = 1000; // Large range for tank
        } else if (role === 'dps') {
            // DPS can target further based on attack range
            const isMelee = classData.attackRange <= 5;
            maxRange = isMelee ? 500 : 800; // Melee closer, ranged further
        } else if (role === 'healer') {
            // Healer targets enemies near party members
            maxRange = 600;
        }

        for (const enemy of enemyList) {
            // Skip invalid enemies
            if (!enemy || enemy.defeated) continue;
            if (enemy.data?.currentHealth !== undefined && enemy.data.currentHealth <= 0) continue;
            if (enemy.sprite && enemy.sprite.destroyed) continue;

            const enemyX = enemy.sprite?.x || enemy.x || 0;
            const enemyY = enemy.sprite?.y || enemy.y || 0;

            const distance = this.calculateDistance(heroX, heroY, enemyX, enemyY);

            // Check if within max range and closer than current nearest
            if (distance < maxRange && distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }

        return nearestEnemy;
    }

    /**
     * Get current target for a hero
     * @param {Object} hero - Hero object
     * @returns {Object|null} Current target enemy or null
     */
    getCurrentTarget(hero) {
        if (!hero || !hero.id) return null;

        const targetEnemyId = this.heroTargets.get(hero.id);
        if (!targetEnemyId) return null;

        // Find enemy in available enemies list
        return this.availableEnemies.find(e => {
            const enemyId = e.id || e.data?.id;
            return enemyId === targetEnemyId;
        }) || null;
    }

    /**
     * Update target for a hero
     * @param {Object} hero - Hero object
     * @param {Object} enemy - Enemy to target (null to clear target)
     */
    updateTarget(hero, enemy) {
        if (!hero || !hero.id) return;

        if (!enemy) {
            // Clear target
            this.heroTargets.delete(hero.id);
            return;
        }

        const enemyId = enemy.id || enemy.data?.id;
        if (!enemyId) {
            Logger.warn('MovementManager', `Cannot set target: enemy has no ID`);
            return;
        }

        const oldTargetId = this.heroTargets.get(hero.id);
        if (oldTargetId !== enemyId) {
            this.heroTargets.set(hero.id, enemyId);
            Logger.debug('MovementManager', `${hero.id} target updated: ${oldTargetId || 'none'} -> ${enemyId}`);
        }
    }

    /**
     * Validate if a target is still valid
     * @param {Object} enemy - Enemy to validate
     * @returns {boolean} True if target is valid
     */
    isValidTarget(enemy) {
        if (!enemy) return false;
        if (enemy.defeated) return false;
        if (enemy.data?.currentHealth !== undefined && enemy.data.currentHealth <= 0) return false;
        if (enemy.sprite && enemy.sprite.destroyed) return false;
        return true;
    }
}


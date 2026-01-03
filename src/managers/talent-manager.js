import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { GameEvents } from '../utils/event-constants.js';
import { createModernPanel, createModernButton, createModernText, getClassColor, UI_THEME } from '../utils/ui-system.js';
import { ManagerValidationMixin, ValidationBuilder } from '../utils/input-validation.js';
import { BaseManager } from './base-manager.js';

/**
 * Talent Manager - Manages talent point allocation per hero
 * Handles talent trees, prerequisites, point allocation, and bonus calculation
 */
export class TalentManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // TalentManager has no dependencies
    }

    /**
     * Initializes the TalentManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        // Apply validation mixin
        Object.assign(this, ManagerValidationMixin);
        this.talentsData = this.scene.cache.json.get('talents');
        this.heroTalents = new Map(); // heroId -> talentTree state
        
        // UI panel state
        this.talentPanel = null;
        this.currentHero = null;
        this.panelElements = {
            container: null,
            title: null,
            heroInfo: null,
            pointsDisplay: null,
            closeButton: null,
            treeContainers: [],
            connectionLines: []
        };
        
        if (!this.talentsData) {
            Logger.warn('TalentManager', 'talents.json not found');
        }
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        Logger.info('TalentManager', 'Initialized');
    }

    /**
     * Reloads talent configuration data from the server for hot-reload support.
     * @async
     * @returns {Promise<void>}
     */
    async reloadTalentData() {
        try {
            Logger.info('TalentManager', 'Reloading talent data...');

            // Reload the JSON data
            await this.scene.cache.json.remove('talents');
            this.scene.load.json('talents', '/data/talents.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-talents', resolve);
                this.scene.load.start();
            });

            // Update local reference
            this.talentsData = this.scene.cache.json.get('talents');

            // Validate the reloaded data
            if (!this.talentsData) {
                throw new Error('Failed to reload talents.json');
            }

            Logger.info('TalentManager', 'Talent data reloaded successfully');

            // Emit event for UI to refresh if talent panel is open
            if (this.talentPanel && this.talentPanel.visible) {
                this.scene.events.emit(GameEvents.TALENT.DATA_RELOADED);
            }

        } catch (error) {
            Logger.error('TalentManager', 'Failed to reload talent data:', error);
            throw error;
        }
    }

    /**
     * Initialize talent tree for a hero
     * @param {string} heroId - Hero ID
     * @param {Object} talentTree - Initial talent tree state (from hero object)
     */
    initializeHeroTalents(heroId, talentTree) {
        if (!this.heroTalents.has(heroId)) {
            this.heroTalents.set(heroId, talentTree || {});
        }
    }

    /**
     * Allocates a single talent point to a specific talent for a hero.
     * Validates availability and prerequisites.
     * @param {string} heroId - Hero ID.
     * @param {string} treeId - Talent tree ID.
     * @param {string} talentId - Talent ID within the tree.
     * @returns {boolean} True if point was successfully allocated.
     */
    allocateTalentPoint(heroId, treeId, talentId) {
        try {
            // Use ValidationBuilder for clean, data-driven validation
            if (!this.quickValidate(builder => builder
                .validateHeroId(heroId, this.scene.partyManager)
                .custom(() => {
                    if (!treeId || typeof treeId !== 'string') {
                        throw new Error('treeId must be a non-empty string');
                    }
                    if (!talentId || typeof talentId !== 'string') {
                        throw new Error('talentId must be a non-empty string');
                    }
                })
                .execute(), 'TalentManager.allocateTalentPoint', Logger)) {
                return false;
            }

            if (!this.canAllocateTalent(heroId, treeId, talentId)) {
                return false;
            }

            const talentTree = this.heroTalents.get(heroId);
            if (!talentTree || !talentTree[treeId] || !talentTree[treeId][talentId]) {
                Logger.error('TalentManager', `Talent not found: ${treeId}.${talentId} for hero ${heroId}`);
                return false;
            }

            const talent = talentTree[treeId][talentId];
            if (talent.points >= talent.maxPoints) {
                Logger.warn('TalentManager', `Talent ${talentId} already at max points`);
                return false;
            }

            talent.points++;

            this.scene?.events.emit(GameEvents.TALENT.POINT_ALLOCATED, { heroId, treeId, talentId });
            Logger.info('TalentManager', `Allocated point to ${treeId}.${talentId} for hero ${heroId}`);
            
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'TalentManager.allocateTalentPoint');
            return false;
        }
    }

    /**
     * Determines if a hero can allocate a point to a specific talent.
     * Checks available points, maximum points, and prerequisites.
     * @param {string} heroId - Hero ID.
     * @param {string} treeId - Talent tree ID.
     * @param {string} talentId - Talent ID.
     * @returns {boolean} True if allocation is possible.
     */
    canAllocateTalent(heroId, treeId, talentId) {
        try {
            if (this.getAvailableTalentPoints(heroId) <= 0) {
                return false;
            }

            // Get hero's class from scene/party manager
            const hero = this.scene.partyManager?.getHeroById(heroId) || this.scene.hero;
            const classId = hero?.classId || 'paladin'; // Default to paladin
            
            // Get talent definition from talents.json
            const talentDef = this.talentsData?.[classId]?.trees?.[treeId]?.talents?.[talentId];
            if (!talentDef) {
                Logger.warn('TalentManager', `Talent definition not found: ${classId}.${treeId}.${talentId}`);
                return false;
            }

            // Get hero's talent tree state
            const talentTree = this.heroTalents.get(heroId);
            if (!talentTree || !talentTree[treeId] || !talentTree[treeId][talentId]) {
                return false;
            }

            const talent = talentTree[treeId][talentId];
            
            // Check if already at max points
            if (talent.points >= talent.maxPoints) {
                return false;
            }

            // Check prerequisites (Phase 2.2: Endgame Talent Trees)
            if (talentDef.prerequisite) {
                const prereq = talentDef.prerequisite;
                
                // Check tree points required (for endgame talents)
                if (prereq.treePointsRequired) {
                    const totalTreePoints = this.getTotalTreePoints(heroId, treeId);
                    if (totalTreePoints < prereq.treePointsRequired) {
                        return false;
                    }
                }
                
                // Check prerequisite talent points
                if (prereq.talentId && prereq.pointsRequired) {
                    const prereqTalent = talentTree[treeId]?.[prereq.talentId];
                    if (!prereqTalent || prereqTalent.points < prereq.pointsRequired) {
                        return false;
                    }
                }
            }

            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'TalentManager.canAllocateTalent');
            return false;
        }
    }

    /**
     * Get total points invested in a talent tree (Phase 2.2: Endgame Talent Trees)
     * @param {string} heroId - Hero ID
     * @param {string} treeId - Talent tree ID
     * @returns {number} Total points invested in the tree
     */
    getTotalTreePoints(heroId, treeId) {
        const talentTree = this.heroTalents.get(heroId);
        if (!talentTree || !talentTree[treeId]) {
            return 0;
        }
        
        let totalPoints = 0;
        Object.values(talentTree[treeId]).forEach(talent => {
            totalPoints += talent.points || 0;
        });
        
        return totalPoints;
    }

    /**
     * Calculates and returns all active talent bonuses for a hero.
     * Handles synergistic multipliers and boolean effects.
     * @param {string} heroId - Hero ID.
     * @param {string} classId - Hero's class ID.
     * @returns {Object} Bonuses object where keys are stat/effect names.
     */
    getTalentBonuses(heroId, classId) {
        try {
            const bonuses = {};
            const talentTree = this.heroTalents.get(heroId);

            if (!talentTree || !this.talentsData || !this.talentsData[classId]) {
                return bonuses;
            }

            const classTalents = this.talentsData[classId];

            // First pass: collect all allocated talents and their synergies
            const allocatedTalents = new Map();
            const synergyMultipliers = new Map();

            Object.keys(talentTree).forEach(treeId => {
                const treeState = talentTree[treeId];
                const treeDef = classTalents.trees?.[treeId];

                if (!treeDef) return;

                Object.keys(treeState).forEach(talentId => {
                    const talentState = treeState[talentId];
                    const talentDef = treeDef.talents?.[talentId];

                    if (!talentDef || talentState.points <= 0) return;

                    allocatedTalents.set(talentId, {
                        state: talentState,
                        def: talentDef,
                        treeId: treeId
                    });

                    // Check for synergies that enhance other talents
                    if (talentDef.synergies && talentDef.synergies.enhances) {
                        talentDef.synergies.enhances.forEach(enhancedTalentId => {
                            const currentMultiplier = synergyMultipliers.get(enhancedTalentId) || 1;
                            const enhancement = talentDef.synergies.bonus_multiplier || 1.1;
                            synergyMultipliers.set(enhancedTalentId, currentMultiplier * enhancement);
                        });
                    }
                });
            });

            // Second pass: apply bonuses with synergies
            allocatedTalents.forEach((talentInfo, talentId) => {
                const { state, def } = talentInfo;
                const points = state.points;
                const effects = def.effects || {};

                // Get synergy multiplier for this talent
                const synergyMultiplier = synergyMultipliers.get(talentId) || 1;

                Object.keys(effects).forEach(effectKey => {
                    const effectValue = effects[effectKey];

                    // If it's a per-point bonus, multiply by points and synergy
                    if (typeof effectValue === 'number') {
                        const baseBonus = effectValue * points;
                        const enhancedBonus = baseBonus * synergyMultiplier;
                        bonuses[effectKey] = (bonuses[effectKey] || 0) + enhancedBonus;

                        // Track synergy bonuses for UI display
                        if (synergyMultiplier > 1) {
                            const synergyBonus = enhancedBonus - baseBonus;
                            bonuses[`${effectKey}_synergy`] = (bonuses[`${effectKey}_synergy`] || 0) + synergyBonus;
                        }
                    } else {
                        // Boolean or special effects
                        bonuses[effectKey] = effectValue;
                    }
                });
            });

            return bonuses;
        } catch (error) {
            ErrorHandler.handle(error, 'TalentManager.getTalentBonuses');
            return {};
        }
    }

    /**
     * Resets all talent points for a specific hero.
     * Optionally deducts a gold cost via event emission.
     * @param {string} heroId - Hero ID.
     * @param {number} [cost=0] - Gold cost for the respec.
     * @returns {boolean} True if successful.
     */
    respecTalents(heroId, cost = 0) {
        try {
            const talentTree = this.heroTalents.get(heroId);
            if (!talentTree) {
                Logger.warn('TalentManager', `No talent tree found for hero ${heroId}`);
                return false;
            }

            // Reset all points to 0
            Object.keys(talentTree).forEach(treeId => {
                Object.keys(talentTree[treeId]).forEach(talentId => {
                    talentTree[treeId][talentId].points = 0;
                });
            });

            this.scene?.events.emit(GameEvents.TALENT.RESPEC, { heroId, cost });
            Logger.info('TalentManager', `Respecced talents for hero ${heroId} (cost: ${cost})`);
            
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'TalentManager.respecTalents');
            return false;
        }
    }

    /**
     * Calculates the number of available talent points for a hero.
     * Incorporates level progression, milestones, and prestige bonuses.
     * @param {string} heroId - Hero ID.
     * @param {Object} [hero=null] - Hero object to get current level.
     * @returns {number} Count of available talent points.
     */
    getAvailableTalentPoints(heroId, hero = null) {
        try {
            // Talent points earned: 1 per level after level 10
            // Total points = max(0, level - 10)
            const level = hero?.level || 1;
            let totalPoints = Math.max(0, level - 10);
            
            // Add milestone bonuses (Phase 2: Talent Point Progression Scaling)
            // Level 20, 40, 60, 80, 100 each grant +1 bonus talent point
            const milestoneLevels = [20, 40, 60, 80, 100];
            milestoneLevels.forEach(milestoneLevel => {
                if (level >= milestoneLevel) {
                    totalPoints += 1;
                }
            });
            
            // Add prestige talent points (Phase 6: Prestige Talent Integration)
            if (this.scene.prestigeManager) {
                totalPoints += this.scene.prestigeManager.getPrestigeTalentPoints();
            }
            
            // Cap at 95 total points (90 from levels + 5 milestone bonuses) + prestige points
            const maxTalentPoints = 95;
            // Note: Prestige points can exceed the cap
            const baseMaxPoints = Math.min(totalPoints - (this.scene.prestigeManager?.getPrestigeTalentPoints() || 0), maxTalentPoints);
            totalPoints = baseMaxPoints + (this.scene.prestigeManager?.getPrestigeTalentPoints() || 0);
            
            // Count allocated points
            const talentTree = this.heroTalents.get(heroId);
            let allocatedPoints = 0;
            
            if (talentTree) {
                Object.keys(talentTree).forEach(treeId => {
                    Object.keys(talentTree[treeId]).forEach(talentId => {
                        allocatedPoints += talentTree[treeId][talentId].points || 0;
                    });
                });
            }

            return Math.max(0, totalPoints - allocatedPoints);
        } catch (error) {
            ErrorHandler.handle(error, 'TalentManager.getAvailableTalentPoints');
            return 0;
        }
    }

    /**
     * Get talent tree state for a hero
     * @param {string} heroId - Hero ID
     * @returns {Object} - Talent tree state
     */
    getTalentTree(heroId) {
        return this.heroTalents.get(heroId) || {};
    }

    /**
     * Toggle talent panel visibility
     * @param {Object} hero - Hero to show talents for
     */
    togglePanel(hero) {
        if (!hero) {
            Logger.warn('TalentManager', 'No hero provided for talent panel');
            return;
        }

        if (this.talentPanel && this.talentPanel.visible) {
            this.hidePanel();
        } else {
            this.showPanel(hero);
        }
    }

    /**
     * Show talent panel for a hero
     * @param {Object} hero - Hero to show talents for
     */
    showPanel(hero) {
        if (!hero) return;

        this.currentHero = hero;

        // Initialize hero talents if needed
        if (!this.heroTalents.has(hero.id)) {
            this.initializeHeroTalents(hero.id, this.buildInitialTalentTree(hero));
        }

        // Create panel if it doesn't exist
        if (!this.talentPanel) {
            this.createTalentPanel();
        }

        // Show panel and all its elements
        this.setAllVisible(true);

        // Update panel content for current hero (this will create trees which are visible by default)
        this.updatePanelContent(hero);

        Logger.info('TalentManager', `Showing talent panel for hero ${hero.id}`);
    }

    /**
     * Hide talent panel
     */
    hidePanel() {
        this.setAllVisible(false);
        this.currentHero = null;
    }

    /**
     * Set visibility for all panel elements
     * @param {boolean} visible - Visibility state
     */
    setAllVisible(visible) {
        if (this.talentPanel) {
            this.talentPanel.setVisible(visible);
        }
        
        if (this.panelElements.title) {
            this.panelElements.title.setVisible(visible);
        }
        
        if (this.panelElements.heroInfo) {
            this.panelElements.heroInfo.setVisible(visible);
        }
        
        if (this.panelElements.pointsDisplay) {
            this.panelElements.pointsDisplay.setVisible(visible);
        }
        
        if (this.panelElements.closeButton) {
            if (this.panelElements.closeButton.bg) this.panelElements.closeButton.bg.setVisible(visible);
            if (this.panelElements.closeButton.text) this.panelElements.closeButton.text.setVisible(visible);
        }
        
        if (this.panelElements.resetButton) {
            this.panelElements.resetButton.setVisible(visible);
        }
        
        // Handle dynamic elements
        this.panelElements.treeContainers.forEach(container => {
            if (container && !container.destroyed && container.setVisible) {
                container.setVisible(visible);
            }
        });
        
        this.panelElements.connectionLines.forEach(line => {
            if (line && !line.destroyed && line.setVisible) {
                line.setVisible(visible);
            }
        });
        
        // Hide tooltips when closing panel
        if (!visible && this.scene.tooltipManager) {
            this.scene.tooltipManager.hideTooltip();
        }
    }

    /**
     * Build initial talent tree structure from talent definitions
     * @param {Object} hero - Hero object
     * @returns {Object} Initial talent tree state
     */
    buildInitialTalentTree(hero) {
        const classId = hero.classId || 'paladin';
        const classTalents = this.talentsData?.[classId];
        if (!classTalents || !classTalents.trees) {
            return {};
        }

        const talentTree = {};
        Object.keys(classTalents.trees).forEach(treeId => {
            talentTree[treeId] = {};
            const treeDef = classTalents.trees[treeId];
            if (treeDef.talents) {
                Object.keys(treeDef.talents).forEach(talentId => {
                    talentTree[treeId][talentId] = {
                        points: 0,
                        maxPoints: treeDef.talents[talentId].maxPoints || 1
                    };
                });
            }
        });

        return talentTree;
    }

    /**
     * Create the talent panel UI
     */
    createTalentPanel() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        // Main panel container
        const panelWidth = Math.min(width - 40, 1000);
        const panelHeight = Math.min(height - 100, 700);
        const panelX = width / 2;
        const panelY = height / 2;

        this.talentPanel = createModernPanel(this.scene, panelX, panelY, panelWidth, panelHeight, {
            backgroundColor: 0x0a0b10,
            backgroundAlpha: 0.98,
            borderColor: 0xc9aa71,
            borderWidth: 3,
            innerBorderColor: 0xffd700,
            innerBorderWidth: 1,
            shadow: true
        });
        this.talentPanel.setScrollFactor(0);
        this.talentPanel.setDepth(1700);
        this.talentPanel.setVisible(false);

        this.panelElements.container = this.talentPanel;

        // Title
        const title = createModernText(this.scene, panelX, panelY - panelHeight / 2 + 30, 'Talent Allocation', {
            fontSize: 24,
            color: '#ffd700',
            strokeColor: '#000000',
            strokeThickness: 2,
            shadow: true
        });
        title.setOrigin(0.5, 0);
        title.setScrollFactor(0);
        title.setDepth(1701);
        this.panelElements.title = title;

        // Hero info (will be updated)
        const heroInfo = createModernText(this.scene, panelX, panelY - panelHeight / 2 + 60, '', {
            fontSize: 16,
            color: '#ffffff',
            strokeColor: '#000000',
            strokeThickness: 1
        });
        heroInfo.setOrigin(0.5, 0);
        heroInfo.setScrollFactor(0);
        heroInfo.setDepth(1701);
        this.panelElements.heroInfo = heroInfo;

        // Points display (will be updated)
        const pointsDisplay = createModernText(this.scene, panelX, panelY - panelHeight / 2 + 90, '', {
            fontSize: 18,
            color: '#ffff00',
            strokeColor: '#000000',
            strokeThickness: 2
        });
        pointsDisplay.setOrigin(0.5, 0);
        pointsDisplay.setScrollFactor(0);
        pointsDisplay.setDepth(1701);
        this.panelElements.pointsDisplay = pointsDisplay;

        // Close button
        const closeButtonSize = 30;
        const closeButtonX = panelX + panelWidth / 2 - closeButtonSize / 2 - 10;
        const closeButtonY = panelY - panelHeight / 2 + closeButtonSize / 2 + 10;
        const closeButton = this.scene.add.rectangle(closeButtonX, closeButtonY, closeButtonSize, closeButtonSize, 0xcc0000, 0.8);
        closeButton.setStrokeStyle(2, 0xff0000);
        closeButton.setScrollFactor(0);
        closeButton.setDepth(1702);
        closeButton.setInteractive({ useHandCursor: true });

        const closeButtonText = this.scene.add.text(closeButtonX, closeButtonY, '×', {
            font: `bold ${closeButtonSize}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        closeButtonText.setOrigin(0.5, 0.5);
        closeButtonText.setScrollFactor(0);
        closeButtonText.setDepth(1703);

        closeButton.on('pointerover', () => closeButton.setFillStyle(0xff0000, 0.9));
        closeButton.on('pointerout', () => closeButton.setFillStyle(0xcc0000, 0.8));
        closeButton.on('pointerdown', () => this.hidePanel());

        this.panelElements.closeButton = { bg: closeButton, text: closeButtonText };

        // Reset button
        const resetBtnWidth = 100;
        const resetBtnHeight = 30;
        const resetBtnX = panelX - panelWidth / 2 + resetBtnWidth / 2 + 20;
        const resetBtnY = panelY + panelHeight / 2 - resetBtnHeight / 2 - 15;
        
        const resetBtn = createModernButton(this.scene, resetBtnX, resetBtnY, resetBtnWidth, resetBtnHeight, 'Reset All', {
            backgroundColor: 0x444444,
            hoverColor: 0x666666,
            borderColor: 0x888888,
            borderWidth: 1,
            fontSize: 14,
            onClick: () => {
                if (this.currentHero && confirm('Reset all talent points for this hero?')) {
                    this.respecTalents(this.currentHero.id);
                    this.updatePanelContent(this.currentHero);
                }
            }
        });
        resetBtn.setDepth(1702);
        this.panelElements.resetButton = resetBtn;
    }

    /**
     * Update panel content for a specific hero
     * @param {Object} hero - Hero to display talents for
     */
    updatePanelContent(hero) {
        if (!hero || !this.talentPanel) return;

        const classId = hero.classId || hero.class || 'Unknown';
        const spec = hero.spec || hero.specId || 'Unknown';
        const level = hero.level || 1;

        // Update hero info
        if (this.panelElements.heroInfo) {
            this.panelElements.heroInfo.setText(`${classId} - ${spec} (Level ${level})`);
        }

        // Update points display
        const availablePoints = this.getAvailableTalentPoints(hero.id, hero);
        if (this.panelElements.pointsDisplay) {
            this.panelElements.pointsDisplay.setText(`Available Points: ${availablePoints}`);
        }

        // Clear existing trees
        this.panelElements.treeContainers.forEach(container => {
            if (container && !container.destroyed) {
                container.destroy();
            }
        });
        this.panelElements.treeContainers = [];

        // Clear connection lines
        this.panelElements.connectionLines.forEach(line => {
            if (line && !line.destroyed) {
                line.destroy();
            }
        });
        this.panelElements.connectionLines = [];

        // Create talent trees
        this.createTalentTrees(hero);
    }

    /**
     * Create talent tree displays for a hero
     * @param {Object} hero - Hero to create trees for
     */
    createTalentTrees(hero) {
        if (!hero) return;

        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        const panelWidth = Math.min(width - 40, 1000);
        const panelHeight = Math.min(height - 100, 700);
        const panelX = width / 2;
        const panelY = height / 2;

        const classId = hero.classId || hero.class;
        if (!classId || !this.talentsData || !this.talentsData[classId]) {
            Logger.warn('TalentManager', `No talent data for class: ${classId}`);
            return;
        }

        const classTreeData = this.talentsData[classId];
        const trees = Object.keys(classTreeData.trees || {});
        if (trees.length === 0) return;

        // Display each talent tree (max 3 columns)
        const treeWidth = (panelWidth - 60) / Math.min(trees.length, 3);
        const startX = panelX - panelWidth / 2 + 30;
        const startY = panelY - panelHeight / 2 + 140;

        trees.forEach((treeId, index) => {
            if (index >= 3) return;

            const treeData = classTreeData.trees[treeId];
            const treeX = startX + index * (treeWidth + 20);

            this.createTalentTree(hero, treeId, treeData, treeX, startY, treeWidth);
        });
    }

    /**
     * Create a single talent tree panel
     * @param {Object} hero - Hero object
     * @param {string} treeId - Tree ID
     * @param {Object} treeData - Tree data
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Panel width
     */
    createTalentTree(hero, treeId, treeData, x, y, width) {
        const height = this.scene.cameras.main.height;
        const panelHeight = Math.min(500, height - 200);
        const fontSize = Math.max(10, Math.min(14, height / 60));

        // Background panel (WoW Style)
        const classId = hero.classId || hero.class;
        const classColor = getClassColor(classId);

        const bgContainer = createModernPanel(this.scene, x + width / 2, y + panelHeight / 2, width - 10, panelHeight, {
            backgroundColor: 0x0a0a0a, // Dark surface
            backgroundAlpha: 0.95,
            borderColor: 0x2a2a2a, // Subtle border
            borderWidth: 1,
            innerBorderColor: 0x1a1a1a,
            innerBorderWidth: 1,
            shadow: true
        });
        bgContainer.setScrollFactor(0);
        bgContainer.setDepth(1701);
        this.panelElements.treeContainers.push(bgContainer);

        // Header for the tree
        const headerBg = this.scene.add.rectangle(x + width / 2, y + 15, width - 10, 30, classColor, 0.2);
        headerBg.setScrollFactor(0);
        headerBg.setDepth(1702);
        this.panelElements.treeContainers.push(headerBg);

        // Tree name
        const treeName = createModernText(this.scene, x + width / 2, y + 15, treeId.toUpperCase(), {
            fontSize: fontSize + 2,
            color: '#ffffff',
            strokeColor: '#000000',
            strokeThickness: 1
        });
        treeName.setOrigin(0.5, 0.5);
        treeName.setScrollFactor(0);
        treeName.setDepth(1703);
        this.panelElements.treeContainers.push(treeName);

        // Create talent grid layout
        const talentSize = 40;
        const talentSpacing = 55;
        const maxColumns = 4;
        const startX = x + (width - (maxColumns * talentSpacing)) / 2;
        const startY = y + 55;

        // Track talent positions for connecting lines
        const talentPositions = new Map();

        // Get talent data and sort by row/column
        const talents = Object.entries(treeData.talents || {}).map(([talentId, talentInfo]) => {
            const talentState = this.heroTalents.get(hero.id)?.[treeId]?.[talentId] || { points: 0, maxPoints: talentInfo.maxPoints || 1 };
            return {
                id: talentId,
                ...talentInfo,
                points: talentState.points,
                maxPoints: talentState.maxPoints
            };
        }).sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.column - b.column;
        });

        // Create talent nodes
        talents.forEach(talent => {
            const gridX = startX + (talent.column - 1) * talentSpacing;
            const gridY = startY + (talent.row - 1) * talentSpacing;

            talentPositions.set(talent.id, { x: gridX, y: gridY });

            this.createTalentNode(hero, talent, treeId, gridX, gridY, talentSize, fontSize);
        });

        // Draw connecting lines
        this.drawTalentConnections(treeData, talentPositions);
    }

    /**
     * Create a talent node
     * @param {Object} hero - Hero object
     * @param {Object} talent - Talent data
     * @param {string} treeId - Tree ID
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Node size
     * @param {number} fontSize - Font size
     */
    createTalentNode(hero, talent, treeId, x, y, size, fontSize) {
        const currentPoints = talent.points || 0;
        const maxPoints = talent.maxPoints || 1;
        const isMaxed = currentPoints >= maxPoints;
        const hasPoints = currentPoints > 0;
        const classId = hero.classId || hero.class;
        const classColor = getClassColor(classId);

        // Node background color based on state
        let bgColor = 0x111111;
        let borderColor = 0x444444;

        if (isMaxed) {
            borderColor = 0xffd700; // Gold border for maxed
        } else if (hasPoints) {
            borderColor = classColor; // Class color border if invested
        }

        // Talent node rectangle (square)
        const nodeBg = this.scene.add.rectangle(x, y, size, size, bgColor);
        nodeBg.setStrokeStyle(2, borderColor);
        nodeBg.setInteractive({ useHandCursor: true });
        nodeBg.setScrollFactor(0);
        nodeBg.setDepth(1705);
        this.panelElements.treeContainers.push(nodeBg);

        // Talent icon or symbol
        const iconText = talent.icon || '★';
        const icon = this.scene.add.text(x, y, iconText, {
            font: `bold ${size * 0.5}px Arial`,
            fill: hasPoints ? '#ffffff' : '#666666'
        });
        icon.setOrigin(0.5, 0.5);
        icon.setScrollFactor(0);
        icon.setDepth(1706);
        this.panelElements.treeContainers.push(icon);

        // Points indicator (bottom-right)
        const pointsText = `${currentPoints}/${maxPoints}`;
        const pointsDisplay = this.scene.add.text(x + size / 2, y + size / 2, pointsText, {
            font: `bold ${fontSize - 2}px Arial`,
            fill: isMaxed ? '#ffd700' : hasPoints ? '#ffffff' : '#888888',
            backgroundColor: '#000000',
            padding: { x: 2, y: 1 }
        });
        pointsDisplay.setOrigin(1, 1);
        pointsDisplay.setScrollFactor(0);
        pointsDisplay.setDepth(1707);
        this.panelElements.treeContainers.push(pointsDisplay);

        // Hover effects
        nodeBg.on('pointerover', () => {
            nodeBg.setFillStyle(0x222222);
            nodeBg.setStrokeStyle(3, 0xffffff);
            
            // Show tooltip
            if (this.scene.tooltipManager) {
                const lines = [
                    { text: talent.name || talent.id, style: { font: 'bold 16px Arial', fill: isMaxed ? '#ffd700' : '#ffffff' } },
                    { text: `Rank ${currentPoints}/${maxPoints}`, style: { font: '12px Arial', fill: '#aaaaaa' } },
                    { text: '---', style: { font: '12px Arial', fill: '#666666' } },
                    { text: talent.description || 'No description', style: { font: '13px Arial', fill: '#ffffff' } }
                ];
                
                if (talent.prerequisite) {
                    lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
                    lines.push({ text: `Requires: ${talent.prerequisite.points} points in ${talent.prerequisite.talentId}`, style: { font: '12px Arial', fill: '#ff4444' } });
                }

                if (talent.synergies && talent.synergies.enhances) {
                    lines.push({ text: '---', style: { font: '12px Arial', fill: '#666666' } });
                    lines.push({ text: `Enhances: ${talent.synergies.enhances.join(', ')}`, style: { font: '12px Arial', fill: '#00ff88' } });
                }
                
                this.scene.tooltipManager.createTooltip(lines, x + size / 2 + 10, y);
            }
        });

        nodeBg.on('pointerout', () => {
            nodeBg.setFillStyle(bgColor);
            nodeBg.setStrokeStyle(2, borderColor);
            if (this.scene.tooltipManager) {
                this.scene.tooltipManager.hideTooltip();
            }
        });

        // Click handling for point allocation
        nodeBg.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                // Right click could be for something else, but let's keep it simple
            } else {
                this.tryAllocateTalentPoint(hero, talent.id, treeId);
            }
        });
    }

    /**
     * Draw connecting lines between talents
     * @param {Object} treeData - Talent tree data
     * @param {Map} talentPositions - Map of talent positions
     */
    drawTalentConnections(treeData, talentPositions) {
        Object.entries(treeData.talents || {}).forEach(([talentId, talentInfo]) => {
            const talentPos = talentPositions.get(talentId);
            if (!talentPos) return;

            // Draw prerequisite connections (Gold)
            if (talentInfo.prerequisite && talentInfo.prerequisite.talentId) {
                const prereqPos = talentPositions.get(talentInfo.prerequisite.talentId);
                if (prereqPos) {
                    const line = this.scene.add.line(0, 0, prereqPos.x, prereqPos.y, talentPos.x, talentPos.y, 0xc9aa71, 0.8);
                    line.setOrigin(0, 0);
                    line.setLineWidth(3);
                    line.setScrollFactor(0);
                    line.setDepth(1702);
                    this.panelElements.connectionLines.push(line);
                }
            }

            // Draw synergy connections (Green/Teal)
            if (talentInfo.synergies && talentInfo.synergies.enhances) {
                talentInfo.synergies.enhances.forEach(enhancedTalentId => {
                    const enhancedPos = talentPositions.get(enhancedTalentId);
                    if (enhancedPos) {
                        const line = this.scene.add.line(0, 0, talentPos.x, talentPos.y, enhancedPos.x, enhancedPos.y, 0x00ff88, 0.4);
                        line.setOrigin(0, 0);
                        line.setLineWidth(1);
                        line.setScrollFactor(0);
                        line.setDepth(1702);
                        this.panelElements.connectionLines.push(line);
                    }
                });
            }
        });
    }

    /**
     * Try to allocate a talent point
     * @param {Object} hero - Hero object
     * @param {string} talentId - Talent ID
     * @param {string} treeId - Tree ID
     */
    tryAllocateTalentPoint(hero, talentId, treeId) {
        if (!hero) return;

        const success = this.allocateTalentPoint(hero.id, treeId, talentId);
        if (success) {
            // Refresh panel display
            this.updatePanelContent(hero);
            Logger.info('TalentManager', `Allocated ${talentId} for hero ${hero.id}`);
        } else {
            // Show error notification
            this.showNotification('Cannot allocate talent point!', '#ff0000');
        }
    }

    /**
     * Show a notification message
     * @param {string} message - Message to show
     * @param {string} color - Text color
     */
    showNotification(message, color = '#ffffff') {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;

        const notification = this.scene.add.text(width / 2, height - 100, message, {
            font: '16px Arial',
            fill: color,
            stroke: '#000000',
            strokeThickness: 2
        });
        notification.setOrigin(0.5, 0.5);
        notification.setScrollFactor(0);
        notification.setDepth(2000);

        // Fade out after 3 seconds
        this.scene.tweens.add({
            targets: notification,
            alpha: 0,
            duration: 3000,
            onComplete: () => notification.destroy()
        });
    }

    /**
     * Clean up talent panel
     */
    destroy() {
        this.hidePanel();
        
        if (this.talentPanel && !this.talentPanel.destroyed) {
            this.talentPanel.destroy();
        }
        
        this.panelElements.treeContainers.forEach(container => {
            if (container && !container.destroyed) {
                container.destroy();
            }
        });
        
        this.panelElements.connectionLines.forEach(line => {
            if (line && !line.destroyed) {
                line.destroy();
            }
        });
        
        this.panelElements = {
            container: null,
            title: null,
            heroInfo: null,
            pointsDisplay: null,
            closeButton: null,
            treeContainers: [],
            connectionLines: []
        };
    }
}


import Phaser from 'phaser';
import { Logger } from '../utils/logger.js';
import { TalentManager } from '../managers/talent-manager.js';

// New imports for fixing issues
import { SceneResourceManager } from '../utils/scene-event-cleanup.js';
import { SCENE_CONFIG } from '../config/scene-config.js';
import { UI_CONFIG, getScaledValue } from '../config/ui-config.js';
import { getUIBuilder } from '../utils/ui-builder.js';
import { globalErrorHandler, SafeExecutor } from '../utils/error-handling.js';
import { validateSceneTransition, SceneParameterValidator } from '../utils/input-validation.js';
import { getPartyStateManager } from '../utils/party-state-manager.js';

/**
 * Talent Allocation Scene - Allows players to allocate talent points per hero
 */
export class TalentAllocationScene extends Phaser.Scene {
    constructor() {
        super('TalentAllocationScene');

        // Initialize resource management (fixes memory leaks)
        this.resourceManager = new SceneResourceManager(this);
        // Defer UIBuilder initialization until create() to ensure scene is ready
        this.uiBuilder = null;
    }

    init(data) {
        // Validate scene transition parameters (added input validation)
        const validation = validateSceneTransition('TalentAllocationScene', data, this);
        if (!validation.isValid) {
            globalErrorHandler.handle(
                new Error(`Invalid scene parameters: ${validation.errors.join(', ')}`),
                'TalentAllocationScene.init',
                { data }
            );
            return;
        }

        // FIXED: Use standardized party state management
        const partyStateManager = getPartyStateManager(this);
        partyStateManager.initialize();
        this.partyManager = partyStateManager.getPartyManager();
        this.hero = data?.hero || this.partyManager?.getHeroByIndex(0) || null;
        this.returnScene = data?.returnScene || 'GameScene';

        // Validate hero data if provided (added validation)
        if (this.hero) {
            try {
                SceneParameterValidator.validateHero(this.hero, this);
            } catch (error) {
                globalErrorHandler.handle(error, 'TalentAllocationScene.init.heroValidation', { heroId: this.hero.id });
                this.hero = null;
            }
        }

        Logger.info('TalentAllocationScene', 'Initialized', this.hero?.id);
    }

    create() {
        // Initialize UIBuilder now that scene is ready (fixes object pool initialization errors)
        if (!this.uiBuilder) {
            this.uiBuilder = getUIBuilder(this);
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Set background
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Title
        const fontSize = Math.max(20, Math.min(24, height / 32));
        const title = this.add.text(width / 2, 30, 'Talent Allocation', {
            font: `bold ${fontSize}px Arial`,
            fill: '#00ff00'
        });
        title.setOrigin(0.5, 0);

        // Hero info
        if (this.hero) {
            const classId = this.hero.classId || this.hero.class || 'Unknown';
            const spec = this.hero.spec || this.hero.specId || 'Unknown';
            const heroInfo = this.add.text(
                width / 2,
                80,
                `${classId} - ${spec} (Level ${this.hero.level || 1})`,
                {
                    font: `${fontSize - 4}px Arial`,
                    fill: '#ffffff'
                }
            );
            heroInfo.setOrigin(0.5, 0);

            // Get talent points available
            const talentPointsAvailable = this.calculateAvailablePoints();
            const pointsDisplay = this.add.text(
                width / 2,
                120,
                `Available Points: ${talentPointsAvailable}`,
                {
                    font: `bold ${fontSize - 2}px Arial`,
                    fill: '#ffff00'
                }
            );
            pointsDisplay.setOrigin(0.5, 0);
            this.pointsDisplay = pointsDisplay;
        }

        // Create talent trees display
        this.createTalentTrees();

        // Back button
        const backButtonWidth = 120;
        const backButtonHeight = 40;
        const backButtonX = width - 150;
        const backButtonY = height - 60;

        // FIXED: Replace setStrokeStyle with proper bordered rectangle
        const backButtonContainer = this.uiBuilder.createBorderedRectangle(
            backButtonX, backButtonY,
            backButtonWidth, backButtonHeight,
            {
                fillColor: 0x336633,
                borderColor: 0x00ff00,
                borderWidth: 2
            }
        );
        // Make the container interactive instead of the rectangle
        backButtonContainer.setSize(backButtonWidth, backButtonHeight);
        backButtonContainer.setInteractive();

        const backText = this.add.text(backButtonX, backButtonY, 'Back', {
            font: `bold ${fontSize - 4}px Arial`,
            fill: '#00ff00'
        });
        backText.setOrigin(0.5, 0.5);

        backButtonContainer.on('pointerover', () => {
            const rect = backButtonContainer.list[0];
            if (rect) rect.setFillStyle(0x44aa44);
        });
        backButtonContainer.on('pointerout', () => {
            const rect = backButtonContainer.list[0];
            if (rect) rect.setFillStyle(0x336633);
        });
        backButtonContainer.on('pointerdown', () => {
            // FIXED: Add input validation for scene transitions
            validateSceneTransition(this.returnScene, {
                partyManager: this.partyManager
            }, this);
            this.scene.start(this.returnScene, {
                partyManager: this.partyManager
            });
        });

        Logger.info('TalentAllocationScene', 'Created talent allocation UI');
    }

    /**
     * Create talent trees display
     */
    /**
     * Create talent tree panels for the hero's class
     */
    createTalentTrees() {
        if (!this.hero) {
            Logger.warn('TalentAllocationScene', 'No hero provided');
            return;
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Get talent data from hero
        const talentData = this.cache.json.get('talents');
        const classId = this.hero.classId || this.hero.class;
        
        if (!classId) {
            Logger.warn('TalentAllocationScene', 'Hero missing classId property:', this.hero);
            return;
        }
        
        if (!talentData || !talentData[classId]) {
            Logger.warn('TalentAllocationScene', 'No talent data for class:', classId);
            return;
        }

        const classTreeData = talentData[classId];
        const trees = Object.keys(classTreeData);

        // Display each talent tree
        const treeWidth = (width - 40) / Math.min(trees.length, 3);
        const startX = 20;
        const startY = 180;

        trees.forEach((treeId, index) => {
            if (index >= 3) return; // Max 3 columns

            const treeData = classTreeData[treeId];
            const panelX = startX + index * treeWidth;

            this.createTalentTree(treeId, treeData, panelX, startY, treeWidth);
        });
    }

    /**
     * Create a single talent tree panel
     * @param {string} treeId - Tree ID (e.g., 'holy')
     * @param {Object} treeData - Tree data
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Panel width
     */
    createTalentTree(treeId, treeData, x, y, width) {
        const height = this.cameras.main.height;
        const fontSize = Math.max(SCENE_CONFIG.FONT_SIZES.TALENT_MIN, Math.min(SCENE_CONFIG.FONT_SIZES.TALENT_MAX, height / SCENE_CONFIG.SPACING.FONT_SIZE_DIVISOR));

        // Background panel (FIXED: proper bordered rectangle)
        const panelHeight = Math.min(SCENE_CONFIG.PANELS.TALENT_PANEL_MAX_HEIGHT, height - SCENE_CONFIG.SPACING.PANEL_HEIGHT_REDUCTION);
        const bgContainer = this.uiBuilder.createBorderedRectangle(
            x + width / 2, y + panelHeight / 2,
            width - 10, panelHeight,
            {
                fillColor: SCENE_CONFIG.COLORS.PANEL_TALENT_BG,
                borderColor: SCENE_CONFIG.COLORS.PANEL_TALENT_BORDER,
                borderWidth: 2,
                alpha: SCENE_CONFIG.ALPHA.PANEL_BACKGROUND
            }
        );
        const bg = bgContainer; // Use container as background

        // Tree name - Using UI_CONFIG
        const treePanelConfig = UI_CONFIG.TALENT_ALLOCATION.TREE_PANEL;
        const treeNameY = y + getScaledValue(treePanelConfig.TITLE_Y_OFFSET, width, 'height');
        const treeNameFontSize = fontSize + getScaledValue(treePanelConfig.TITLE_FONT_OFFSET, width, 'font');
        const treeName = this.add.text(x + width / 2, treeNameY, treeId.toUpperCase(), {
            font: `bold ${treeNameFontSize}px Arial`,
            fill: treePanelConfig.TITLE_COLOR
        });
        treeName.setOrigin(0.5, 0);

        // Create talent grid layout - Using UI_CONFIG
        const talentConfig = UI_CONFIG.TALENT_ALLOCATION.TALENT_GRID;
        const talentSize = getScaledValue(talentConfig.SIZE, width);
        const talentSpacing = getScaledValue(talentConfig.SPACING, width);
        const maxColumns = talentConfig.MAX_COLUMNS;
        const startX = x + (width - (maxColumns * talentSpacing)) / 2;
        const startY = y + getScaledValue(talentConfig.START_Y_OFFSET, width, 'height');

        // Track talent positions for connecting lines
        const talentPositions = new Map();

        // Get talent data and sort by row/column
        const talents = Object.entries(treeData).map(([talentId, talentInfo]) => ({
            id: talentId,
            ...talentInfo
        })).sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.column - b.column;
        });

        // Create talent nodes
        talents.forEach(talent => {
            const gridX = startX + (talent.column - 1) * talentSpacing;
            const gridY = startY + (talent.row - 1) * talentSpacing;

            talentPositions.set(talent.id, { x: gridX, y: gridY });

            this.createTalentNode(talent, treeId, gridX, gridY, talentSize, fontSize);
        });

        // Draw connecting lines for synergies and prerequisites
        this.drawTalentConnections(treeData, talentPositions, startX, startY, talentSpacing);
    }

    /**
     * Create a talent node with enhanced visuals
     * @param {Object} talent - Talent data
     * @param {string} treeId - Tree ID
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Node size
     * @param {number} fontSize - Font size
     */
    createTalentNode(talent, treeId, x, y, size, fontSize) {
        const currentPoints = talent.points || 0;
        const maxPoints = talent.maxPoints || 1;
        const isMaxed = currentPoints >= maxPoints;
        const hasPoints = currentPoints > 0;

        // Node background color based on state
        let bgColor = 0x333333; // Locked/available
        let borderColor = 0x666666;

        if (isMaxed) {
            bgColor = 0x00aa00; // Maxed
            borderColor = 0x00ff00;
        } else if (hasPoints) {
            bgColor = 0x0066aa; // Partially learned
            borderColor = 0x0099ff;
        }

        // Talent node circle
        const nodeBg = this.add.circle(x, y, size / 2, bgColor);
        nodeBg.setStrokeStyle(2, borderColor);
        nodeBg.setInteractive();

        // Talent icon or symbol
        const iconText = talent.icon || '★';
        const icon = this.add.text(x, y - 5, iconText, {
            font: `bold ${size * 0.4}px Arial`,
            fill: '#ffffff'
        });
        icon.setOrigin(0.5, 0.5);

        // Points indicator
        const pointsText = `${currentPoints}/${maxPoints}`;
        const pointsDisplay = this.add.text(x, y + 8, pointsText, {
            font: `${fontSize - 2}px Arial`,
            fill: isMaxed ? '#ffff00' : '#cccccc'
        });
        pointsDisplay.setOrigin(0.5, 0.5);

        // Hover effects and tooltips
        nodeBg.on('pointerover', () => {
            nodeBg.setFillStyle(hasPoints ? 0x0088cc : 0x555555);

            // Enhanced tooltip with synergy info
            let tooltip = talent.name || talent.id;
            tooltip += `\n${talent.description || 'No description'}`;

            if (talent.synergies && talent.synergies.enhances) {
                tooltip += `\n\n🔗 Enhances: ${talent.synergies.enhances.join(', ')}`;
                tooltip += `\nBonus: +${Math.round((talent.synergies.bonus_multiplier - 1) * 100)}%`;
            }

            // Show tooltip (simplified - in real implementation, use proper tooltip system)
        });

        nodeBg.on('pointerout', () => {
            nodeBg.setFillStyle(bgColor);
        });

        // Click handling for point allocation
        nodeBg.on('pointerdown', () => {
            this.tryAllocateTalentPoint(talent.id, treeId);
        });
    }

    /**
     * Draw connecting lines between talents for synergies and prerequisites
     * @param {Object} treeData - Talent tree data
     * @param {Map} talentPositions - Map of talent positions
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {number} spacing - Spacing between talents
     */
    drawTalentConnections(treeData, talentPositions, startX, startY, spacing) {
        Object.entries(treeData).forEach(([talentId, talentInfo]) => {
            const talentPos = talentPositions.get(talentId);
            if (!talentPos) return;

            // Draw prerequisite connections
            if (talentInfo.prerequisite && talentInfo.prerequisite.talentId) {
                const prereqPos = talentPositions.get(talentInfo.prerequisite.talentId);
                if (prereqPos) {
                    this.drawConnectionLine(prereqPos, talentPos, 0xffaa00, 2); // Gold for prerequisites
                }
            }

            // Draw synergy connections
            if (talentInfo.synergies && talentInfo.synergies.enhances) {
                talentInfo.synergies.enhances.forEach(enhancedTalentId => {
                    const enhancedPos = talentPositions.get(enhancedTalentId);
                    if (enhancedPos) {
                        this.drawConnectionLine(talentPos, enhancedPos, 0x00ff88, 1); // Green for synergies
                    }
                });
            }
        });
    }

    /**
     * Draw a connection line between two talent positions
     * @param {Object} fromPos - Starting position {x, y}
     * @param {Object} toPos - Ending position {x, y}
     * @param {number} color - Line color
     * @param {number} thickness - Line thickness
     */
    drawConnectionLine(fromPos, toPos, color, thickness) {
        const line = this.add.line(0, 0, fromPos.x, fromPos.y, toPos.x, toPos.y, color, 1);
        line.setOrigin(0, 0);
        line.setLineWidth(thickness);
        line.setDepth(50); // Behind talent nodes
    }

    /**
     * Try to allocate a talent point
     * @param {string} talentId - Talent ID
     * @param {string} treeId - Tree ID
     */
    tryAllocateTalentPoint(talentId, treeId) {
        if (!this.hero) return;

        // Get or create talent manager
        if (!this.talentManager) {
            this.talentManager = new TalentManager(this);
        }

        // Try to allocate point
        if (this.allocateTalent(treeId, talentId)) {
            // Refresh display
            this.updatePointsDisplay();
            this.scene.restart(); // Refresh to show updated talents
        } else {
            // Show error message
            this.showNotification('Cannot allocate talent point!', '#ff0000');
        }
    }

    /**
     * Allocate a talent point
     * @param {string} treeId - Tree ID
     * @param {string} talentId - Talent ID
     * @returns {boolean} True if allocated
     */
    allocateTalent(treeId, talentId) {
        if (!this.hero) return false;

        // Get or create talent manager
        if (!this.talentManager) {
            this.talentManager = new TalentManager(this);
        }

        // Check if hero has available points
        const available = this.calculateAvailablePoints();
        if (available <= 0) {
            Logger.warn('TalentAllocationScene', 'No talent points available');
            return false;
        }

        // Allocate the talent
        const success = this.talentManager.allocateTalentPoint(this.hero.id, treeId, talentId);
        if (success) {
            Logger.info('TalentAllocationScene', `Allocated ${talentId} for hero ${this.hero.id}`);
        }

        return success;
    }

    /**
     * Calculate available talent points for hero
     * @returns {number} Available talent points
     */
    calculateAvailablePoints() {
        if (!this.hero) return 0;

        // Talent points = level (simplified - can be customized)
        const totalPoints = Math.max(0, (this.hero.level - 1) * 3); // 3 points per level after 1
        
        // Get allocated points
        let allocatedPoints = 0;
        const talentData = this.cache.json.get('talents');
        const classId = this.hero.classId || this.hero.class;
        if (talentData && classId && talentData[classId]) {
            const classTrees = talentData[classId];
            Object.values(classTrees).forEach(tree => {
                Object.values(tree).forEach(talent => {
                    allocatedPoints += talent.points || 0;
                });
            });
        }

        return Math.max(0, totalPoints - allocatedPoints);
    }

    /**
     * Update points display
     */
    updatePointsDisplay() {
        if (this.pointsDisplay) {
            const available = this.calculateAvailablePoints();
            this.pointsDisplay.setText(`Available Points: ${available}`);
        }
    }

    /**
     * Show a notification message
     * @param {string} message - Message to show
     * @param {string} color - Text color (hex)
     */
    showNotification(message, color = '#ffffff') {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const notificationY = height - getScaledValue(UI_CONFIG.NOTIFICATIONS?.DEFAULT_Y || 100, height, 'height');
        const fontSize = getScaledValue(UI_CONFIG.NOTIFICATIONS?.FONT_SIZE || 16, height, 'height');
        const notification = this.add.text(width / 2, notificationY, message, {
            font: `${fontSize}px Arial`,
            fill: color,
            stroke: '#000000',
            strokeThickness: getScaledValue(UI_CONFIG.NOTIFICATIONS?.STROKE_WIDTH || 2, height, 'height')
        });
        notification.setOrigin(0.5, 0.5);
        notification.setDepth(SCENE_CONFIG.DEPTH?.UI_PANEL || 1000);

        // Fade out after configured duration
        this.tweens.add({
            targets: notification,
            alpha: 0,
            duration: UI_CONFIG.NOTIFICATIONS?.DISPLAY_DURATION || 3000,
            onComplete: () => notification.destroy()
        });
    }

    /**
     * Shutdown event - clean up all resources (fixed missing shutdown and added proper cleanup)
     */
    shutdown() {
        Logger.info('TalentAllocationScene', 'Shutting down');

        // Use resource manager to clean up all tracked resources and event listeners (fixes memory leaks)
        SafeExecutor.execute(() => {
            if (this.resourceManager) {
                this.resourceManager.cleanup();
            }
        }, null, 'TalentAllocationScene.shutdown.resourceManager');

        // Clean up UI elements safely (removed fragile patterns)
        SafeExecutor.execute(() => {
            // Clean up any remaining UI elements that might not be tracked by resource manager
            if (this.pointsDisplay && !this.pointsDisplay.destroyed) {
                try {
                    this.pointsDisplay.destroy();
                } catch (error) {
                    globalErrorHandler.handle(error, 'TalentAllocationScene.shutdown.pointsDisplay');
                }
            }
        }, null, 'TalentAllocationScene.shutdown.uiElements');

        // Clean up UI builder resources
        SafeExecutor.execute(() => {
            if (this.uiBuilder) {
                // UI builder cleanup is handled by SceneUIFactory when scene is destroyed
            }
        }, null, 'TalentAllocationScene.shutdown.uiBuilder');

        // Save party state before clearing references (FIXED: inconsistent state management)
        SafeExecutor.execute(() => {
            const partyStateManager = getPartyStateManager(this);
            partyStateManager.savePartyState();
        }, null, 'TalentAllocationScene.shutdown.savePartyState');

        // Clear references
        SafeExecutor.execute(() => {
            this.hero = null;
            this.partyManager = null;
            this.returnScene = null;
            this.pointsDisplay = null;
        }, null, 'TalentAllocationScene.shutdown.references');
    }
}

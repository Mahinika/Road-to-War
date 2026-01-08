/**
 * Proportion Manager
 * Enforces strict chibi proportions: 33% head, 25% torso, 20% limbs
 * Based on Dragumagu-style pixel art specifications
 */

export class ProportionManager {
    constructor(totalHeight = 48) {
        this.totalHeight = totalHeight;
        
        // Chibi proportions: 33% head, 25% torso, 20% limbs
        this.proportions = {
            head: Math.floor(totalHeight * 0.33),      // 33%
            torso: Math.floor(totalHeight * 0.25),     // 25%
            limbs: Math.floor(totalHeight * 0.20),     // 20% each
            equipmentScale: 1.2                        // 120% scale for oversized equipment
        };
        
        // Calculate positions (top of sprite is 0)
        this.positions = {
            headTop: 0,
            headBottom: this.proportions.head,
            torsoTop: this.proportions.head,
            torsoBottom: this.proportions.head + this.proportions.torso,
            limbsTop: this.proportions.head + this.proportions.torso,
            limbsBottom: totalHeight
        };
    }

    /**
     * Get head bounds
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate (of entire sprite)
     * @returns {Object} { x, y, width, height, centerX, centerY }
     */
    getHeadBounds(centerX, centerY) {
        const headHeight = this.proportions.head;
        const headWidth = Math.floor(headHeight * 0.9); // Head is slightly wider than tall for chibi style
        const headCenterY = this.positions.headTop + headHeight / 2;
        
        return {
            x: centerX - headWidth / 2,
            y: this.positions.headTop,
            width: headWidth,
            height: headHeight,
            centerX: centerX,
            centerY: headCenterY
        };
    }

    /**
     * Get torso bounds
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate (of entire sprite)
     * @returns {Object} { x, y, width, height, centerX, centerY }
     */
    getTorsoBounds(centerX, centerY) {
        const torsoHeight = this.proportions.torso;
        const torsoWidth = Math.floor(torsoHeight * 0.8); // Torso is slightly narrower than tall
        const torsoTop = this.positions.torsoTop - 2; // Move torso up slightly to overlap with head
        const torsoCenterY = torsoTop + torsoHeight / 2;
        
        return {
            x: centerX - torsoWidth / 2,
            y: torsoTop,
            width: torsoWidth,
            height: torsoHeight,
            centerX: centerX,
            centerY: torsoCenterY
        };
    }

    /**
     * Get arm bounds
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate (of entire sprite)
     * @param {string} side - 'left' or 'right'
     * @returns {Object} { x, y, width, height, centerX, centerY }
     */
    getArmBounds(centerX, centerY, side = 'left') {
        const armLength = this.proportions.limbs;
        const armWidth = Math.floor(armLength * 0.45); // Arms are a bit thicker
        const torsoBounds = this.getTorsoBounds(centerX, centerY);
        const armTop = torsoBounds.y + 2; // Start just below top of torso
        
        // Arms overlap with torso sides
        const armX = side === 'left' 
            ? torsoBounds.x - armWidth + 2
            : torsoBounds.x + torsoBounds.width - 2;
        
        return {
            x: armX,
            y: armTop,
            width: armWidth,
            height: armLength,
            centerX: armX + armWidth / 2,
            centerY: armTop + armLength / 2
        };
    }

    /**
     * Get leg bounds
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate (of entire sprite)
     * @param {string} side - 'left' or 'right'
     * @returns {Object} { x, y, width, height, centerX, centerY }
     */
    getLegBounds(centerX, centerY, side = 'left') {
        const legLength = this.proportions.limbs;
        const legWidth = Math.floor(legLength * 0.55); // Legs are thicker
        const torsoBounds = this.getTorsoBounds(centerX, centerY);
        const legTop = torsoBounds.y + torsoBounds.height - 3; // Overlap with torso bottom
        
        const legX = side === 'left'
            ? centerX - legWidth + 1
            : centerX - 1;
            
        return {
            x: legX,
            y: legTop,
            width: legWidth,
            height: legLength,
            centerX: legX + legWidth / 2,
            centerY: legTop + legLength / 2
        };
    }

    /**
     * Get equipment bounds (scaled 120% for oversized items)
     * @param {number} baseX - Base X coordinate
     * @param {number} baseY - Base Y coordinate
     * @param {number} baseWidth - Base width
     * @param {number} baseHeight - Base height
     * @returns {Object} { x, y, width, height }
     */
    getEquipmentBounds(baseX, baseY, baseWidth, baseHeight) {
        const scale = this.proportions.equipmentScale;
        const scaledWidth = Math.floor(baseWidth * scale);
        const scaledHeight = Math.floor(baseHeight * scale);
        
        return {
            x: baseX - (scaledWidth - baseWidth) / 2,
            y: baseY - (scaledHeight - baseHeight) / 2,
            width: scaledWidth,
            height: scaledHeight
        };
    }

    /**
     * Validate proportions against style guide
     * @returns {Object} { valid: boolean, errors: Array<string> }
     */
    validateProportions() {
        const errors = [];
        
        // Check head proportion (should be ~33%)
        const headPercent = (this.proportions.head / this.totalHeight) * 100;
        if (headPercent < 30 || headPercent > 36) {
            errors.push(`Head proportion ${headPercent.toFixed(1)}% is outside acceptable range (30-36%)`);
        }
        
        // Check torso proportion (should be ~25%)
        const torsoPercent = (this.proportions.torso / this.totalHeight) * 100;
        if (torsoPercent < 22 || torsoPercent > 28) {
            errors.push(`Torso proportion ${torsoPercent.toFixed(1)}% is outside acceptable range (22-28%)`);
        }
        
        // Check limbs proportion (should be ~20%)
        const limbsPercent = (this.proportions.limbs / this.totalHeight) * 100;
        if (limbsPercent < 18 || limbsPercent > 22) {
            errors.push(`Limbs proportion ${limbsPercent.toFixed(1)}% is outside acceptable range (18-22%)`);
        }
        
        // Check total (should add up to ~98% due to rounding)
        const totalPercent = headPercent + torsoPercent + limbsPercent;
        if (totalPercent < 95 || totalPercent > 100) {
            errors.push(`Total proportion ${totalPercent.toFixed(1)}% is outside acceptable range (95-100%)`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            proportions: {
                head: headPercent,
                torso: torsoPercent,
                limbs: limbsPercent,
                total: totalPercent
            }
        };
    }

    /**
     * Get all proportion data
     * @returns {Object} Complete proportion data
     */
    getProportions() {
        return {
            ...this.proportions,
            positions: { ...this.positions },
            totalHeight: this.totalHeight
        };
    }

    /**
     * Set total height and recalculate proportions
     * @param {number} totalHeight - New total height
     */
    setTotalHeight(totalHeight) {
        this.totalHeight = totalHeight;
        
        // Recalculate proportions
        this.proportions = {
            head: Math.floor(totalHeight * 0.33),
            torso: Math.floor(totalHeight * 0.25),
            limbs: Math.floor(totalHeight * 0.20),
            equipmentScale: 1.2
        };
        
        // Recalculate positions
        this.positions = {
            headTop: 0,
            headBottom: this.proportions.head,
            torsoTop: this.proportions.head,
            torsoBottom: this.proportions.head + this.proportions.torso,
            limbsTop: this.proportions.head + this.proportions.torso,
            limbsBottom: totalHeight
        };
    }
}


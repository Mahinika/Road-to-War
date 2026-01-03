/**
 * Character Components - Modular body parts system
 * Defines components with anchor points for animation-ready character generation
 */

import { ColorUtils } from '../utils/color-utils.js';
import { ShapeUtils } from '../utils/shape-utils.js';

export class CharacterComponents {
    /**
     * Component definitions with anchor points (normalized 0-1 coordinates)
     */
    static COMPONENT_DEFINITIONS = {
        HEAD: {
            anchor: { x: 0.5, y: 0.2 },
            pivot: { x: 0.5, y: 0.5 },
            layers: ['base', 'hair', 'helmet'],
            size: { width: 0.4, height: 0.25 }
        },
        TORSO: {
            anchor: { x: 0.5, y: 0.5 },
            pivot: { x: 0.5, y: 0.5 },
            layers: ['base', 'armor', 'cloth'],
            size: { width: 0.5, height: 0.35 }
        },
        ARM_LEFT: {
            anchor: { x: 0.2, y: 0.4 },
            pivot: { x: 0.5, y: 0.1 }, // Pivot at shoulder
            layers: ['base', 'armor'],
            size: { width: 0.15, height: 0.3 }
        },
        ARM_RIGHT: {
            anchor: { x: 0.8, y: 0.4 },
            pivot: { x: 0.5, y: 0.1 }, // Pivot at shoulder
            layers: ['base', 'armor'],
            size: { width: 0.15, height: 0.3 }
        },
        LEG_LEFT: {
            anchor: { x: 0.4, y: 0.7 },
            pivot: { x: 0.5, y: 0.1 }, // Pivot at hip
            layers: ['base', 'armor', 'cloth'],
            size: { width: 0.15, height: 0.25 }
        },
        LEG_RIGHT: {
            anchor: { x: 0.6, y: 0.7 },
            pivot: { x: 0.5, y: 0.1 }, // Pivot at hip
            layers: ['base', 'armor', 'cloth'],
            size: { width: 0.15, height: 0.25 }
        },
        WEAPON: {
            anchor: { x: 0.75, y: 0.3 },
            pivot: { x: 0.5, y: 0.9 }, // Pivot at grip
            layers: ['blade', 'hilt', 'guard'],
            size: { width: 0.1, height: 0.5 }
        },
        SHIELD: {
            anchor: { x: 0.25, y: 0.4 },
            pivot: { x: 0.5, y: 0.5 },
            layers: ['base', 'decoration'],
            size: { width: 0.2, height: 0.35 }
        }
    };

    /**
     * Generate head component
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} centerX - Center X of character
     * @param {number} centerY - Center Y of character
     * @param {number} charWidth - Character width
     * @param {number} charHeight - Character height
     * @param {string} type - Head type (default, helmet, hood)
     * @param {number} skinColor - Skin color
     * @param {Object} options - Additional options
     * @returns {Object} Component metadata
     */
    static generateHead(graphics, centerX, centerY, charWidth, charHeight, type = 'default', skinColor = 0xffdbac, options = {}) {
        const def = this.COMPONENT_DEFINITIONS.HEAD;
        const x = centerX + (def.anchor.x - 0.5) * charWidth;
        const y = centerY + (def.anchor.y - 0.5) * charHeight;
        const size = Math.min(charWidth * def.size.width, charHeight * def.size.height);

        // Base head (skin)
        ShapeUtils.drawCharacterHead(graphics, x, y, size, skinColor);

        // Add helmet if type is 'helmet'
        if (type === 'helmet') {
            const helmetColor = options.helmetColor || 0xc0c0c0; // Silver
            const helmetSize = size * 1.1;
            
            // Helmet base
            graphics.fillStyle(helmetColor);
            graphics.fillRoundedRect(x - helmetSize / 2, y - helmetSize / 2, helmetSize, helmetSize * 0.8, 8);
            
            // Helmet visor
            if (options.visorColor) {
                graphics.fillStyle(options.visorColor, 0.6);
                graphics.fillRoundedRect(x - helmetSize * 0.4, y - helmetSize * 0.2, helmetSize * 0.8, helmetSize * 0.3, 4);
            }
            
            // Helmet highlight
            const highlightColor = ColorUtils.lighten(helmetColor, 0.4);
            graphics.fillStyle(highlightColor, 0.5);
            graphics.fillRoundedRect(x - helmetSize * 0.35, y - helmetSize * 0.35, helmetSize * 0.4, helmetSize * 0.25, 4);
        }

        // Eyes (if not fully covered)
        if (type !== 'helmet' || options.showEyes) {
            const eyeColor = options.eyeColor || 0xffff00; // Yellow for paladin holy light
            graphics.fillStyle(eyeColor, 0.8);
            graphics.fillCircle(x - size * 0.2, y - size * 0.1, size * 0.08);
            graphics.fillCircle(x + size * 0.2, y - size * 0.1, size * 0.08);
        }

        return {
            type: 'HEAD',
            anchor: { x, y },
            pivot: {
                x: x + (def.pivot.x - 0.5) * size,
                y: y + (def.pivot.y - 0.5) * size
            },
            size: size
        };
    }

    /**
     * Generate torso component
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} centerX - Center X of character
     * @param {number} centerY - Center Y of character
     * @param {number} charWidth - Character width
     * @param {number} charHeight - Character height
     * @param {string} armorType - Armor type (none, light, heavy, plate)
     * @param {number} baseColor - Base color
     * @param {Object} options - Additional options
     * @returns {Object} Component metadata
     */
    static generateTorso(graphics, centerX, centerY, charWidth, charHeight, armorType = 'plate', baseColor = 0x2c3e50, options = {}) {
        const def = this.COMPONENT_DEFINITIONS.TORSO;
        const x = centerX + (def.anchor.x - 0.5) * charWidth;
        const y = centerY + (def.anchor.y - 0.5) * charHeight;
        const width = charWidth * def.size.width;
        const height = charHeight * def.size.height;

        // Base torso (cloth/underlayer)
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 3);

        // Add armor
        if (armorType !== 'none') {
            const armorColor = options.armorColor || 0xc0c0c0; // Silver
            const armorWidth = width * 0.9;
            const armorHeight = height * 0.85;
            
            // Chest plate
            graphics.fillStyle(armorColor);
            graphics.fillRoundedRect(x - armorWidth / 2, y - armorHeight / 2, armorWidth, armorHeight, 4);
            
            // Armor highlight (top-left light)
            const highlightColor = ColorUtils.lighten(armorColor, 0.4);
            graphics.fillStyle(highlightColor, 0.6);
            graphics.fillRoundedRect(x - armorWidth * 0.4, y - armorHeight * 0.3, armorWidth * 0.5, armorHeight * 0.4, 3);
            
            // Armor shadow (bottom-right)
            const shadowColor = ColorUtils.darken(armorColor, 0.3);
            graphics.fillStyle(shadowColor, 0.5);
            graphics.fillRoundedRect(x + armorWidth * 0.1, y + armorHeight * 0.2, armorWidth * 0.5, armorHeight * 0.4, 3);
            
            // Engravings/decoration
            if (options.decoration) {
                graphics.lineStyle(1, options.decorationColor || 0x4169e1, 0.5);
                graphics.strokeRoundedRect(x - armorWidth * 0.35, y - armorHeight * 0.2, armorWidth * 0.7, armorHeight * 0.4, 4);
            }
        }

        // Shoulder pads
        if (armorType === 'plate' || armorType === 'heavy') {
            const shoulderColor = options.shoulderColor || options.armorColor || 0xc0c0c0;
            const shoulderWidth = width * 0.3;
            const shoulderHeight = height * 0.2;
            
            // Left shoulder
            graphics.fillStyle(shoulderColor);
            graphics.fillRoundedRect(x - width / 2 - shoulderWidth * 0.3, y - height / 2, shoulderWidth, shoulderHeight, 5);
            
            // Right shoulder
            graphics.fillRoundedRect(x + width / 2 - shoulderWidth * 0.7, y - height / 2, shoulderWidth, shoulderHeight, 5);
            
            // Shoulder highlights
            const shoulderHighlight = ColorUtils.lighten(shoulderColor, 0.4);
            graphics.fillStyle(shoulderHighlight, 0.7);
            graphics.fillCircle(x - width * 0.35, y - height * 0.1, shoulderWidth * 0.2);
            graphics.fillCircle(x + width * 0.35, y - height * 0.1, shoulderWidth * 0.2);
        }

        return {
            type: 'TORSO',
            anchor: { x, y },
            pivot: {
                x: x + (def.pivot.x - 0.5) * width,
                y: y + (def.pivot.y - 0.5) * height
            },
            size: { width, height }
        };
    }

    /**
     * Generate arm component
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} centerX - Center X of character
     * @param {number} centerY - Center Y of character
     * @param {number} charWidth - Character width
     * @param {number} charHeight - Character height
     * @param {string} side - 'left' or 'right'
     * @param {string} armorType - Armor type
     * @param {number} baseColor - Base color
     * @param {Object} options - Additional options
     * @returns {Object} Component metadata
     */
    static generateArm(graphics, centerX, centerY, charWidth, charHeight, side = 'left', armorType = 'none', baseColor = 0x2c3e50, options = {}) {
        const def = side === 'left' ? this.COMPONENT_DEFINITIONS.ARM_LEFT : this.COMPONENT_DEFINITIONS.ARM_RIGHT;
        const x = centerX + (def.anchor.x - 0.5) * charWidth;
        const y = centerY + (def.anchor.y - 0.5) * charHeight;
        const width = charWidth * def.size.width;
        const height = charHeight * def.size.height;

        // Base arm
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 2);

        // Add armor
        if (armorType !== 'none') {
            const armorColor = options.armorColor || 0xc0c0c0;
            const armorWidth = width * 0.9;
            const armorHeight = height * 0.8;
            
            graphics.fillStyle(armorColor);
            graphics.fillRoundedRect(x - armorWidth / 2, y - armorHeight / 2, armorWidth, armorHeight, 3);
            
            // Highlight
            const highlightColor = ColorUtils.lighten(armorColor, 0.3);
            graphics.fillStyle(highlightColor, 0.5);
            graphics.fillRoundedRect(x - armorWidth * 0.4, y - armorHeight * 0.4, armorWidth * 0.5, armorHeight * 0.3, 2);
        }

        return {
            type: `ARM_${side.toUpperCase()}`,
            anchor: { x, y },
            pivot: {
                x: x + (def.pivot.x - 0.5) * width,
                y: y + (def.pivot.y - 0.5) * height
            },
            size: { width, height }
        };
    }

    /**
     * Generate leg component
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} centerX - Center X of character
     * @param {number} centerY - Center Y of character
     * @param {number} charWidth - Character width
     * @param {number} charHeight - Character height
     * @param {string} side - 'left' or 'right'
     * @param {string} armorType - Armor type
     * @param {number} baseColor - Base color
     * @param {Object} options - Additional options
     * @returns {Object} Component metadata
     */
    static generateLeg(graphics, centerX, centerY, charWidth, charHeight, side = 'left', armorType = 'none', baseColor = 0x2c3e50, options = {}) {
        const def = side === 'left' ? this.COMPONENT_DEFINITIONS.LEG_LEFT : this.COMPONENT_DEFINITIONS.LEG_RIGHT;
        const x = centerX + (def.anchor.x - 0.5) * charWidth;
        const y = centerY + (def.anchor.y - 0.5) * charHeight;
        const width = charWidth * def.size.width;
        const height = charHeight * def.size.height;

        // Base leg
        graphics.fillStyle(baseColor);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 2);

        // Add armor
        if (armorType !== 'none') {
            const armorColor = options.armorColor || 0xc0c0c0;
            const armorWidth = width * 0.9;
            const armorHeight = height * 0.85;
            
            graphics.fillStyle(armorColor);
            graphics.fillRoundedRect(x - armorWidth / 2, y - armorHeight / 2, armorWidth, armorHeight, 3);
        }

        return {
            type: `LEG_${side.toUpperCase()}`,
            anchor: { x, y },
            pivot: {
                x: x + (def.pivot.x - 0.5) * width,
                y: y + (def.pivot.y - 0.5) * height
            },
            size: { width, height }
        };
    }

    /**
     * Generate weapon component
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} centerX - Center X of character
     * @param {number} centerY - Center Y of character
     * @param {number} charWidth - Character width
     * @param {number} charHeight - Character height
     * @param {string} weaponType - Weapon type (sword, axe, staff)
     * @param {number} color - Weapon color
     * @param {Object} options - Additional options
     * @returns {Object} Component metadata
     */
    static generateWeapon(graphics, centerX, centerY, charWidth, charHeight, weaponType = 'sword', color = 0xe0e0e0, options = {}) {
        const def = this.COMPONENT_DEFINITIONS.WEAPON;
        const x = centerX + (def.anchor.x - 0.5) * charWidth;
        const y = centerY + (def.anchor.y - 0.5) * charHeight;
        const width = charWidth * def.size.width;
        const height = charHeight * def.size.height;

        switch (weaponType) {
            case 'sword':
                ShapeUtils.drawSword(graphics, x, y, width, height, color);
                // Add metallic shine
                const shineColor = ColorUtils.lighten(color, 0.5);
                graphics.fillStyle(shineColor, 0.8);
                graphics.fillRect(x - width * 0.05, y - height * 0.4, width * 0.03, height * 0.7);
                break;
            case 'axe':
                ShapeUtils.drawAxe(graphics, x, y, width, height, color);
                break;
            case 'staff':
                ShapeUtils.drawStaff(graphics, x, y, width, height, color);
                break;
        }

        return {
            type: 'WEAPON',
            anchor: { x, y },
            pivot: {
                x: x + (def.pivot.x - 0.5) * width,
                y: y + (def.pivot.y - 0.5) * height
            },
            size: { width, height }
        };
    }

    /**
     * Generate shield component
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} centerX - Center X of character
     * @param {number} centerY - Center Y of character
     * @param {number} charWidth - Character width
     * @param {number} charHeight - Character height
     * @param {string} shieldType - Shield type (round, kite, tower)
     * @param {number} color - Shield color
     * @param {Object} options - Additional options
     * @returns {Object} Component metadata
     */
    static generateShield(graphics, centerX, centerY, charWidth, charHeight, shieldType = 'round', color = 0xc0c0c0, options = {}) {
        const def = this.COMPONENT_DEFINITIONS.SHIELD;
        const x = centerX + (def.anchor.x - 0.5) * charWidth;
        const y = centerY + (def.anchor.y - 0.5) * charHeight;
        const width = charWidth * def.size.width;
        const height = charHeight * def.size.height;

        // Shield base
        graphics.fillStyle(color);
        if (shieldType === 'round') {
            graphics.fillCircle(x, y, Math.min(width, height) / 2);
        } else {
            graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 5);
        }

        // Shield highlight
        const highlightColor = ColorUtils.lighten(color, 0.4);
        graphics.fillStyle(highlightColor, 0.6);
        if (shieldType === 'round') {
            graphics.fillCircle(x - width * 0.2, y - height * 0.2, Math.min(width, height) * 0.3);
        } else {
            graphics.fillRoundedRect(x - width * 0.35, y - height * 0.35, width * 0.5, height * 0.4, 3);
        }

        // Decoration/emblem
        if (options.emblem) {
            graphics.fillStyle(options.emblemColor || 0x4169e1, 0.8);
            graphics.fillCircle(x, y, Math.min(width, height) * 0.2);
        }

        return {
            type: 'SHIELD',
            anchor: { x, y },
            pivot: {
                x: x + (def.pivot.x - 0.5) * width,
                y: y + (def.pivot.y - 0.5) * height
            },
            size: { width, height }
        };
    }
}


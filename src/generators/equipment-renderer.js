/**
 * Equipment Renderer - Dragumagu-Style Equipment Detail System
 * Renders detailed equipment layers on character sprites
 * Supports: helmet, chest, legs, boots, gloves, weapons
 */

import { DRAGUMAGU_STYLE, generateDragumaguPalette, getClassPalette, getClassGlow } from '../config/dragumagu-style-guide.js';
import { ColorUtils } from './utils/color-utils.js';

export class EquipmentRenderer {
    constructor(scene) {
        this.scene = scene;
        this.style = DRAGUMAGU_STYLE;
    }

    /**
     * Render all equipment on a character
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Object} props - Character properties
     * @param {Object} equipment - Equipment data {head, chest, legs, boots, hands, mainHand, offHand}
     * @param {Object} itemsData - Items data from JSON
     * @param {string} className - Character class name
     */
    renderEquipment(graphics, props, equipment = {}, itemsData = {}, className = 'paladin') {
        if (!equipment || Object.keys(equipment).length === 0) {
            return; // No equipment to render
        }

        const classPalette = getClassPalette(className);
        const classGlow = getClassGlow(className);

        // Render in layer order (back to front)
        if (equipment.cloak) {
            this.renderCloak(graphics, props, equipment.cloak, itemsData, classPalette);
        }
        
        if (equipment.legs) {
            this.renderLegArmor(graphics, props, equipment.legs, itemsData, classPalette);
        }
        
        if (equipment.boots) {
            this.renderBoots(graphics, props, equipment.boots, itemsData, classPalette);
        }
        
        if (equipment.chest) {
            this.renderChestArmor(graphics, props, equipment.chest, itemsData, classPalette, classGlow);
        }
        
        if (equipment.hands) {
            this.renderGloves(graphics, props, equipment.hands, itemsData, classPalette);
        }
        
        if (equipment.shoulder) {
            this.renderShoulderPads(graphics, props, equipment.shoulder, itemsData, classPalette);
        }
        
        if (equipment.head) {
            this.renderHelmet(graphics, props, equipment.head, itemsData, classPalette, classGlow);
        }
        
        if (equipment.mainHand || equipment.offHand) {
            this.renderWeapon(graphics, props, equipment.mainHand || equipment.offHand, itemsData, classPalette, classGlow, className);
        }
    }

    /**
     * Render helmet with visor, plume, detail lines
     */
    renderHelmet(graphics, props, itemId, itemsData, classPalette, classGlow) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { centerX, headY, headSize } = props;
        const helmetPalette = generateDragumaguPalette(classPalette.armor[0] || 0xC0C0C0, 'metal');
        const helmetHeight = headSize * 0.8;
        const helmetWidth = headSize * 1.1;

        // Base helmet (rounded top)
        graphics.fillStyle(helmetPalette.base);
        graphics.fillRoundedRect(
            centerX - helmetWidth / 2,
            headY - headSize / 2 - 5,
            helmetWidth,
            helmetHeight,
            3
        );

        // Top highlight (metal shine)
        graphics.fillStyle(helmetPalette.light2, 0.7);
        graphics.fillRoundedRect(
            centerX - helmetWidth / 2 + 2,
            headY - headSize / 2 - 3,
            helmetWidth * 0.6,
            helmetHeight * 0.3,
            2
        );

        // Visor (T-shaped, glowing eyes)
        const visorY = headY - headSize / 2 + helmetHeight * 0.4;
        graphics.fillStyle(0x1A1A1A, 0.9); // Dark visor
        graphics.fillRect(
            centerX - helmetWidth * 0.3,
            visorY,
            helmetWidth * 0.6,
            helmetHeight * 0.2
        );
        
        // Vertical visor line
        graphics.fillStyle(0x0A0A0A);
        graphics.fillRect(
            centerX - 2,
            visorY,
            4,
            helmetHeight * 0.2
        );

        // Glowing eyes (class-specific)
        graphics.fillStyle(classGlow, 0.8);
        graphics.fillCircle(centerX - 6, visorY + 3, 3);
        graphics.fillCircle(centerX + 6, visorY + 3, 3);
        graphics.fillStyle(0xFFFFFF, 0.5); // Eye highlight
        graphics.fillCircle(centerX - 7, visorY + 2, 1);
        graphics.fillCircle(centerX + 5, visorY + 2, 1);

        // Detail lines (segmentation)
        graphics.lineStyle(1, helmetPalette.dark1, 0.6);
        graphics.beginPath();
        graphics.moveTo(centerX - helmetWidth / 2 + 5, visorY - 10);
        graphics.lineTo(centerX + helmetWidth / 2 - 5, visorY - 10);
        graphics.strokePath();

        // Plume/crest (if epic/legendary)
        if (itemData.quality === 'epic' || itemData.quality === 'legendary') {
            const plumeColor = DRAGUMAGU_STYLE.wowAesthetic.tierColors[itemData.quality] || classPalette.gold[0];
            graphics.fillStyle(plumeColor);
            graphics.fillTriangle(
                centerX, headY - headSize / 2 - 8,
                centerX - 8, headY - headSize / 2 - 20,
                centerX + 8, headY - headSize / 2 - 20
            );
            graphics.fillStyle(ColorUtils.lighten(plumeColor, 0.3));
            graphics.fillTriangle(
                centerX, headY - headSize / 2 - 8,
                centerX - 6, headY - headSize / 2 - 18,
                centerX + 6, headY - headSize / 2 - 18
            );
        }

        // Helmet outline (bold)
        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRoundedRect(
            centerX - helmetWidth / 2,
            headY - headSize / 2 - 5,
            helmetWidth,
            helmetHeight,
            3
        );
    }

    /**
     * Render chest armor with segmentation, buckle, shoulder pads
     */
    renderChestArmor(graphics, props, itemId, itemsData, classPalette, classGlow) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { centerX, torsoY, torsoWidth, torsoHeight } = props;
        const armorPalette = generateDragumaguPalette(classPalette.armor[0] || 0xC0C0C0, 'metal');
        const chestWidth = torsoWidth * 1.1;
        const chestHeight = torsoHeight * 1.05;

        // Base chest plate
        graphics.fillStyle(armorPalette.base);
        graphics.fillRect(
            centerX - chestWidth / 2,
            torsoY - chestHeight / 2,
            chestWidth,
            chestHeight
        );

        // Top-left highlight (metal shine)
        graphics.fillStyle(armorPalette.light2, 0.8);
        graphics.fillRect(
            centerX - chestWidth / 2 + 2,
            torsoY - chestHeight / 2 + 2,
            chestWidth * 0.4,
            chestHeight * 0.3
        );

        // Vertical segmentation lines (plate armor detail)
        graphics.lineStyle(1, armorPalette.dark1, 0.7);
        for (let i = 1; i < 3; i++) {
            const segX = centerX - chestWidth / 2 + (chestWidth / 4) * i;
            graphics.beginPath();
            graphics.moveTo(segX, torsoY - chestHeight / 2 + 5);
            graphics.lineTo(segX, torsoY + chestHeight / 2 - 5);
            graphics.strokePath();
        }

        // Gold belt buckle (center)
        const buckleY = torsoY + chestHeight / 2 - 8;
        graphics.fillStyle(classPalette.gold[0]);
        graphics.fillRect(
            centerX - 8,
            buckleY,
            16,
            6
        );
        graphics.fillStyle(classPalette.gold[1]); // Darker gold for depth
        graphics.fillRect(
            centerX - 6,
            buckleY + 2,
            12,
            2
        );
        graphics.fillStyle(classPalette.gold[2]); // Highlight
        graphics.fillRect(
            centerX - 7,
            buckleY + 1,
            14,
            1
        );

        // Side shadows
        graphics.fillStyle(armorPalette.dark2, 0.6);
        graphics.fillRect(
            centerX + chestWidth / 2 - 3,
            torsoY - chestHeight / 2 + 5,
            3,
            chestHeight - 10
        );

        // Chest outline
        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(
            centerX - chestWidth / 2,
            torsoY - chestHeight / 2,
            chestWidth,
            chestHeight
        );
    }

    /**
     * Render shoulder pads (large, rounded, layered)
     */
    renderShoulderPads(graphics, props, itemId, itemsData, classPalette) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { leftShoulderX, rightShoulderX, shoulderY } = props;
        const armorPalette = generateDragumaguPalette(classPalette.armor[0] || 0xC0C0C0, 'metal');
        const padSize = 24;

        // Left shoulder pad
        graphics.fillStyle(armorPalette.base);
        graphics.fillCircle(leftShoulderX, shoulderY, padSize);
        graphics.fillStyle(armorPalette.light1, 0.6);
        graphics.fillCircle(leftShoulderX - 4, shoulderY - 4, padSize * 0.6);
        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeCircle(leftShoulderX, shoulderY, padSize);

        // Right shoulder pad
        graphics.fillStyle(armorPalette.base);
        graphics.fillCircle(rightShoulderX, shoulderY, padSize);
        graphics.fillStyle(armorPalette.light1, 0.6);
        graphics.fillCircle(rightShoulderX + 4, shoulderY - 4, padSize * 0.6);
        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeCircle(rightShoulderX, shoulderY, padSize);

        // Class emblem (if epic/legendary)
        if (itemData.quality === 'epic' || itemData.quality === 'legendary') {
            const emblemColor = DRAGUMAGU_STYLE.wowAesthetic.tierColors[itemData.quality] || classPalette.gold[0];
            graphics.fillStyle(emblemColor, 0.8);
            graphics.fillCircle(leftShoulderX, shoulderY, padSize * 0.4);
            graphics.fillCircle(rightShoulderX, shoulderY, padSize * 0.4);
        }
    }

    /**
     * Render leg armor with knee guards, segmentation
     */
    renderLegArmor(graphics, props, itemId, itemsData, classPalette) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { leftLegX, rightLegX, leftLegTop, rightLegTop, leftLegLen, rightLegLen, leftLegWidth, rightLegWidth } = props;
        const legTop = leftLegTop || rightLegTop || props.torsoY + props.torsoHeight / 2 + 10;
        const legLen = leftLegLen || rightLegLen || 40;
        const legWidth = leftLegWidth || rightLegWidth || 24;
        const armorPalette = generateDragumaguPalette(classPalette.armor[0] || 0xC0C0C0, 'metal');
        const armorWidth = legWidth * 1.1;

        // Left leg armor
        graphics.fillStyle(armorPalette.base);
        graphics.fillRect(
            leftLegX - armorWidth / 2,
            legTop,
            armorWidth,
            legLen
        );

        // Knee guard (left)
        const kneeY = legTop + legLen * 0.4;
        graphics.fillStyle(armorPalette.light1, 0.7);
        graphics.fillRect(
            leftLegX - armorWidth / 2 + 2,
            kneeY - 4,
            armorWidth - 4,
            8
        );

        // Segmentation line
        graphics.lineStyle(1, armorPalette.dark1, 0.6);
        graphics.beginPath();
        graphics.moveTo(leftLegX, legTop + 5);
        graphics.lineTo(leftLegX, legTop + legLen - 5);
        graphics.strokePath();

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(
            leftLegX - armorWidth / 2,
            legTop,
            armorWidth,
            legLen
        );

        // Right leg armor
        graphics.fillStyle(armorPalette.base);
        graphics.fillRect(
            rightLegX - armorWidth / 2,
            legTop,
            armorWidth,
            legLen
        );

        // Knee guard (right)
        graphics.fillStyle(armorPalette.light1, 0.7);
        graphics.fillRect(
            rightLegX - armorWidth / 2 + 2,
            kneeY - 4,
            armorWidth - 4,
            8
        );

        // Segmentation line
        graphics.lineStyle(1, armorPalette.dark1, 0.6);
        graphics.beginPath();
        graphics.moveTo(rightLegX, legTop + 5);
        graphics.lineTo(rightLegX, legTop + legLen - 5);
        graphics.strokePath();

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(
            rightLegX - armorWidth / 2,
            legTop,
            armorWidth,
            legLen
        );
    }

    /**
     * Render boots with toe cap, straps, sole detail
     */
    renderBoots(graphics, props, itemId, itemsData, classPalette) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { leftLegX, rightLegX, leftLegTop, rightLegTop, leftLegLen, rightLegLen, leftLegWidth, rightLegWidth } = props;
        const legTop = leftLegTop || rightLegTop || props.torsoY + props.torsoHeight / 2 + 10;
        const legLen = leftLegLen || rightLegLen || 40;
        const legWidth = leftLegWidth || rightLegWidth || 24;
        const bootPalette = generateDragumaguPalette(classPalette.armor[0] || 0x4A4A4A, 'leather');
        const bootHeight = 12;
        const bootY = legTop + legLen;
        const bootWidth = legWidth * 1.2;

        // Left boot
        graphics.fillStyle(bootPalette.base);
        graphics.fillRect(
            leftLegX - bootWidth / 2,
            bootY,
            bootWidth,
            bootHeight
        );

        // Toe cap (metal reinforcement)
        graphics.fillStyle(bootPalette.light1, 0.8);
        graphics.fillRect(
            leftLegX - bootWidth / 2 + 2,
            bootY + 2,
            bootWidth * 0.4,
            bootHeight - 4
        );

        // Straps
        graphics.lineStyle(1, bootPalette.dark2, 0.8);
        graphics.beginPath();
        graphics.moveTo(leftLegX - bootWidth / 2 + 3, bootY + 4);
        graphics.lineTo(leftLegX + bootWidth / 2 - 3, bootY + 4);
        graphics.strokePath();

        // Sole (thick bottom)
        graphics.fillStyle(bootPalette.dark2);
        graphics.fillRect(
            leftLegX - bootWidth / 2 - 1,
            bootY + bootHeight - 2,
            bootWidth + 2,
            3
        );

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(
            leftLegX - bootWidth / 2,
            bootY,
            bootWidth,
            bootHeight
        );

        // Right boot (same pattern)
        graphics.fillStyle(bootPalette.base);
        graphics.fillRect(
            rightLegX - bootWidth / 2,
            bootY,
            bootWidth,
            bootHeight
        );

        graphics.fillStyle(bootPalette.light1, 0.8);
        graphics.fillRect(
            rightLegX - bootWidth / 2 + 2,
            bootY + 2,
            bootWidth * 0.4,
            bootHeight - 4
        );

        graphics.lineStyle(1, bootPalette.dark2, 0.8);
        graphics.beginPath();
        graphics.moveTo(rightLegX - bootWidth / 2 + 3, bootY + 4);
        graphics.lineTo(rightLegX + bootWidth / 2 - 3, bootY + 4);
        graphics.strokePath();

        graphics.fillStyle(bootPalette.dark2);
        graphics.fillRect(
            rightLegX - bootWidth / 2 - 1,
            bootY + bootHeight - 2,
            bootWidth + 2,
            3
        );

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(
            rightLegX - bootWidth / 2,
            bootY,
            bootWidth,
            bootHeight
        );
    }

    /**
     * Render gloves with fingers, wrist guard
     */
    renderGloves(graphics, props, itemId, itemsData, classPalette) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { leftArmForeX, leftArmForeY, rightArmForeX, rightArmForeY, leftArmForeLen, rightArmForeLen, leftArmForeW, rightArmForeW } = props;
        // Use forearm positions for gloves
        const leftArmX = leftArmForeX || props.leftArmUpperX || props.centerX - 20;
        const rightArmX = rightArmForeX || props.rightArmUpperX || props.centerX + 20;
        const armY = leftArmForeY || rightArmForeY || props.shoulderY || props.torsoY;
        const armLen = leftArmForeLen || rightArmForeLen || 20;
        const armWidth = leftArmForeW || rightArmForeW || 18;
        const glovePalette = generateDragumaguPalette(classPalette.armor[0] || 0x4A4A4A, 'leather');
        const gloveWidth = armWidth * 1.1;

        // Left glove
        graphics.fillStyle(glovePalette.base);
        graphics.fillRect(
            leftArmX - gloveWidth / 2,
            armY + armLen - 8,
            gloveWidth,
            8
        );

        // Finger separations
        graphics.lineStyle(1, glovePalette.dark1, 0.6);
        for (let i = 1; i < 4; i++) {
            const fingerX = leftArmX - gloveWidth / 2 + (gloveWidth / 4) * i;
            graphics.beginPath();
            graphics.moveTo(fingerX, armY + armLen - 8);
            graphics.lineTo(fingerX, armY + armLen);
            graphics.strokePath();
        }

        // Wrist guard
        graphics.fillStyle(glovePalette.light1, 0.6);
        graphics.fillRect(
            leftArmX - gloveWidth / 2,
            armY + armLen - 10,
            gloveWidth,
            2
        );

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(
            leftArmX - gloveWidth / 2,
            armY + armLen - 8,
            gloveWidth,
            8
        );

        // Right glove
        graphics.fillStyle(glovePalette.base);
        graphics.fillRect(
            rightArmX - gloveWidth / 2,
            armY + armLen - 8,
            gloveWidth,
            8
        );

        graphics.lineStyle(1, glovePalette.dark1, 0.6);
        for (let i = 1; i < 4; i++) {
            const fingerX = rightArmX - gloveWidth / 2 + (gloveWidth / 4) * i;
            graphics.beginPath();
            graphics.moveTo(fingerX, armY + armLen - 8);
            graphics.lineTo(fingerX, armY + armLen);
            graphics.strokePath();
        }

        graphics.fillStyle(glovePalette.light1, 0.6);
        graphics.fillRect(
            rightArmX - gloveWidth / 2,
            armY + armLen - 10,
            gloveWidth,
            2
        );

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(
            rightArmX - gloveWidth / 2,
            armY + armLen - 8,
            gloveWidth,
            8
        );
    }

    /**
     * Render cloak (flowing, behind character)
     */
    renderCloak(graphics, props, itemId, itemsData, classPalette) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { centerX, shoulderY, torsoY, torsoHeight } = props;
        const cloakPalette = generateDragumaguPalette(classPalette.cloth[0] || 0x4169E1, 'cloth');
        const cloakWidth = 40;
        const cloakHeight = torsoHeight * 1.5;

        // Flowing cloak shape
        graphics.fillStyle(cloakPalette.base);
        graphics.beginPath();
        graphics.moveTo(centerX - cloakWidth / 2, shoulderY);
        graphics.quadraticCurveTo(centerX, torsoY + torsoHeight, centerX - cloakWidth / 4, torsoY + cloakHeight);
        graphics.quadraticCurveTo(centerX, torsoY + cloakHeight * 0.8, centerX + cloakWidth / 4, torsoY + cloakHeight);
        graphics.quadraticCurveTo(centerX, torsoY + torsoHeight, centerX + cloakWidth / 2, shoulderY);
        graphics.closePath();
        graphics.fillPath();

        // Cloak folds (shadow lines)
        graphics.lineStyle(1, cloakPalette.dark1, 0.5);
        for (let i = 1; i < 3; i++) {
            const foldX = centerX - cloakWidth / 2 + (cloakWidth / 3) * i;
            graphics.beginPath();
            graphics.moveTo(foldX, shoulderY);
            graphics.quadraticCurveTo(foldX + (Math.random() - 0.5) * 5, torsoY + torsoHeight, foldX, torsoY + cloakHeight);
            graphics.strokePath();
        }

        // Cloak outline
        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.beginPath();
        graphics.moveTo(centerX - cloakWidth / 2, shoulderY);
        graphics.quadraticCurveTo(centerX, torsoY + torsoHeight, centerX - cloakWidth / 4, torsoY + cloakHeight);
        graphics.quadraticCurveTo(centerX, torsoY + cloakHeight * 0.8, centerX + cloakWidth / 4, torsoY + cloakHeight);
        graphics.quadraticCurveTo(centerX, torsoY + torsoHeight, centerX + cloakWidth / 2, shoulderY);
        graphics.strokePath();
    }

    /**
     * Render weapon with hilt, blade, glow, detail engravings
     */
    renderWeapon(graphics, props, itemId, itemsData, classPalette, classGlow, className) {
        const itemData = itemsData[itemId];
        if (!itemData) return;

        const { rightArmForeX, rightArmForeY, rightArmUpperX, rightArmUpperY, centerX, torsoY } = props;
        const weaponType = itemData.type || 'sword';
        const weaponLength = 60;
        // Position weapon at end of right arm (forearm position)
        const weaponX = rightArmForeX || (rightArmUpperX || centerX) + 20;
        const weaponY = (rightArmForeY || rightArmUpperY || torsoY) - 5;

        if (weaponType === 'sword' || weaponType === 'one_handed_sword') {
            this.renderSword(graphics, weaponX, weaponY, weaponLength, classPalette, classGlow, itemData);
        } else if (weaponType === 'axe' || weaponType === 'one_handed_axe') {
            this.renderAxe(graphics, weaponX, weaponY, weaponLength, classPalette, classGlow, itemData);
        } else if (weaponType === 'mace' || weaponType === 'one_handed_mace') {
            this.renderMace(graphics, weaponX, weaponY, weaponLength, classPalette, classGlow, itemData);
        }
    }

    renderSword(graphics, x, y, length, classPalette, classGlow, itemData) {
        const hiltLength = length * 0.25;
        const bladeLength = length * 0.75;
        const bladeWidth = 4;

        // Hilt (gold with detail)
        graphics.fillStyle(classPalette.gold[0]);
        graphics.fillRect(x, y, hiltLength, 6);
        graphics.fillStyle(classPalette.gold[1]);
        graphics.fillRect(x + 2, y + 1, hiltLength - 4, 4);
        graphics.fillStyle(classPalette.gold[2]); // Highlight
        graphics.fillRect(x, y, hiltLength, 1);

        // Crossguard
        graphics.fillStyle(classPalette.gold[0]);
        graphics.fillRect(x + hiltLength - 2, y - 3, 4, 12);
        graphics.fillStyle(0x2A2A2A); // Dark center
        graphics.fillRect(x + hiltLength - 1, y - 2, 2, 10);

        // Blade (metal with glow)
        const bladePalette = generateDragumaguPalette(0xE0E0E0, 'metal');
        graphics.fillStyle(bladePalette.base);
        graphics.fillRect(x + hiltLength, y + 1, bladeLength, bladeWidth);
        
        // Blade highlight (edge)
        graphics.fillStyle(bladePalette.light2, 0.9);
        graphics.fillRect(x + hiltLength, y + 1, bladeLength, 1);
        
        // Class glow (if epic/legendary)
        if (itemData.quality === 'epic' || itemData.quality === 'legendary') {
            graphics.fillStyle(classGlow, 0.4);
            graphics.fillRect(x + hiltLength, y + 1, bladeLength, bladeWidth);
        }

        // Blade outline
        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeRect(x + hiltLength, y + 1, bladeLength, bladeWidth);
    }

    renderAxe(graphics, x, y, length, classPalette, classGlow, itemData) {
        const handleLength = length * 0.6;
        const axeHeadSize = 20;

        // Handle (wood/brown)
        graphics.fillStyle(0x8B4513);
        graphics.fillRect(x, y, handleLength, 4);
        graphics.fillStyle(0x654321); // Darker wood
        graphics.fillRect(x + 2, y + 1, handleLength - 4, 2);

        // Axe head (metal)
        const axePalette = generateDragumaguPalette(0xC0C0C0, 'metal');
        graphics.fillStyle(axePalette.base);
        graphics.fillTriangle(
            x + handleLength, y,
            x + handleLength + axeHeadSize, y - 8,
            x + handleLength + axeHeadSize, y + 8
        );
        graphics.fillStyle(axePalette.light1, 0.7);
        graphics.fillTriangle(
            x + handleLength + 2, y,
            x + handleLength + axeHeadSize - 2, y - 6,
            x + handleLength + axeHeadSize - 2, y + 6
        );

        // Edge highlight
        graphics.fillStyle(axePalette.light2, 0.9);
        graphics.fillRect(x + handleLength + axeHeadSize - 2, y - 8, 2, 16);

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.beginPath();
        graphics.moveTo(x + handleLength, y);
        graphics.lineTo(x + handleLength + axeHeadSize, y - 8);
        graphics.lineTo(x + handleLength + axeHeadSize, y + 8);
        graphics.closePath();
        graphics.strokePath();
    }

    renderMace(graphics, x, y, length, classPalette, classGlow, itemData) {
        const handleLength = length * 0.5;
        const headSize = 16;

        // Handle
        graphics.fillStyle(0x8B4513);
        graphics.fillRect(x, y, handleLength, 4);

        // Mace head (spiked ball)
        graphics.fillStyle(classPalette.armor[0] || 0xC0C0C0);
        graphics.fillCircle(x + handleLength + headSize / 2, y + 2, headSize / 2);
        
        // Spikes
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const spikeX = x + handleLength + headSize / 2 + Math.cos(angle) * (headSize / 2 + 2);
            const spikeY = y + 2 + Math.sin(angle) * (headSize / 2 + 2);
            graphics.fillStyle(0xE0E0E0);
            graphics.fillCircle(spikeX, spikeY, 2);
        }

        graphics.lineStyle(this.style.outline.thickness, this.style.outline.color);
        graphics.strokeCircle(x + handleLength + headSize / 2, y + 2, headSize / 2);
    }

    /**
     * Pixel-perfect coordinate snapping
     */
    pixelPerfect(x, y) {
        return { x: Math.floor(x + 0.5), y: Math.floor(y + 0.5) };
    }
}


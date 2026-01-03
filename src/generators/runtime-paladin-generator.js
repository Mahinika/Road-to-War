/**
 * Runtime Hero Sprite Generator - Detailed Mage Style
 * Realistic human proportions with detailed features matching mage art style:
 * - Realistic proportions (smaller head, taller body, longer limbs)
 * - Detailed head with multi-level shading and depth
 * - Long flowing hair (male version)
 * - Detailed face with blue eyes, pupils, highlights, subtle nose/mouth
 * - Enhanced body shading with chest definition
 * - Better arm/leg detail with muscle definition
 * - 3px bold outlines throughout
 * Base sprite ONLY (underwear, no equipment).
 */

import { getPlaceholderKey, ensurePlaceholderTexture } from '../utils/placeholder-helper.js';
import { JointTransform } from './joint-transform.js';
import { generateKeyframes } from '../config/keyframe-generator.js';
import { DRAGUMAGU_STYLE, generateDragumaguPalette, getClassPalette, getClassGlow } from '../config/dragumagu-style-guide.js';
import { EquipmentRenderer } from './equipment-renderer.js';

export class RuntimePaladinGenerator {
    /**
     * Create a new RuntimePaladinGenerator.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     */
    constructor(scene) {
        this.scene = scene;
        this.width = 192;
        this.height = 192;
        this.style = DRAGUMAGU_STYLE;
        this.equipmentRenderer = new EquipmentRenderer(scene);
        
        // Dragumagu-style palette with WoW Paladin colors
        const paladinPalette = getClassPalette('paladin');
        this.palette = {
            skin: generateDragumaguPalette(0xE3B590, 'skin'),
            hair: { 
                base: 0x9C5F3A, dark1: 0x7D4C2E, dark2: 0x5F3A20, 
                light1: 0xB8855A, light2: 0xD4A574
            },
            eyes: { base: 0x0A0A0A, highlight: 0xFFFFFF },
            eyebrows: { base: 0x3A2F24, dark: 0x261C14 },
            mouth: { base: 0x3A2F24 },
            underwear: generateDragumaguPalette(0xFEFEFE, 'cloth'),
            boot: generateDragumaguPalette(0xFAFAFA, 'leather'),
            fur: { base: 0x5A5A5A, dark: 0x404040, light: 0x707070 },
            capelet: generateDragumaguPalette(paladinPalette.cloth[0], 'cloth'),
            armor: generateDragumaguPalette(paladinPalette.armor[0], 'metal'),
            gold: paladinPalette.gold,
            glow: getClassGlow('paladin'),
            outline: { main: DRAGUMAGU_STYLE.outline.color, thickness: DRAGUMAGU_STYLE.outline.thickness },
            shadows: { ground: 0x000000, alpha: 0.25 }
        };
    }

    /**
     * Gets the base character proportions and layout properties.
     * @returns {Object} Character properties.
     */
    getCharacterProps() {
        // Realistic human proportions (like detailed mage art) - more realistic than chibi
        const torsoY = 105; // Lower torso for more realistic proportions
        const torsoHeight = 45; // Taller torso
        const torsoBottom = torsoY + torsoHeight / 2; // 127.5
        const bootHeight = 18; 
        const leftLegLen = 50 + bootHeight; // Longer legs
        const rightLegLen = 50 + bootHeight; 
        const legWidth = 26; // Slightly wider
        const footLength = 10; 
        const leftThighLen = Math.floor((leftLegLen - footLength) * 0.55); 
        const leftShinLen = (leftLegLen - footLength) - leftThighLen; 
        const rightThighLen = Math.floor((rightLegLen - footLength) * 0.55); 
        const rightShinLen = (rightLegLen - footLength) - rightThighLen; 
        
        const neckHeight = 8; // Taller neck
        const neckWidth = 18; // Wider neck
        
        const centerX = 96;
        const torsoWidth = 48; // Slightly narrower for more realistic look
        const torsoLeft = centerX - torsoWidth / 2; // 70
        const torsoRight = centerX + torsoWidth / 2; // 122
        const leftLegWidth = legWidth;
        const rightLegWidth = legWidth;
        const edgeSpacing = 1; 
        const leftLegX = torsoLeft + edgeSpacing + leftLegWidth / 2; // 83
        const rightLegX = torsoRight - edgeSpacing - rightLegWidth / 2; // 109
        
        return {
                centerX: centerX,
                headSize: 64, // Smaller head for more realistic proportions (was 76)
                headY: 32, // Higher up for realistic proportions
                headTiltX: 0, 
                torsoWidth: torsoWidth,
                torsoHeight: torsoHeight,
                torsoY: torsoY,
                shoulderY: 76, // Moved up from 80
                leftShoulderX: 72, 
                rightShoulderX: 120, 
                leftLegX: leftLegX, 
                leftLegTop: torsoBottom + 10, 
                leftLegLen: leftLegLen, 
                leftLegWidth: leftLegWidth,
                leftThighLen: leftThighLen,
                leftShinLen: leftShinLen,
                leftFootLen: footLength, 
                leftHipX: leftLegX, 
                leftHipY: torsoBottom + 10, 
                leftLegY: torsoBottom + 10 + leftLegLen, 
                rightLegX: rightLegX, 
                rightLegTop: torsoBottom + 10, 
                rightLegLen: rightLegLen, 
                rightLegWidth: rightLegWidth,
                rightThighLen: rightThighLen,
                rightShinLen: rightShinLen,
                rightFootLen: footLength, 
                rightHipX: rightLegX, 
                rightHipY: torsoBottom + 10, 
                rightLegY: torsoBottom + 10 + rightLegLen, 
                neckHeight: neckHeight,
                neckWidth: neckWidth,
                neckY: torsoY - torsoHeight / 2 - neckHeight / 2, 
                bootHeight: bootHeight, 
                furHeight: 6,
                leftArmUpperX: 70, leftArmUpperY: 80, leftArmUpperLen: 28, leftArmUpperW: 20, 
                leftArmForeX: 70, leftArmForeY: 80 + 28, leftArmForeLen: 24, leftArmForeW: 16, 
                rightArmUpperX: 122, rightArmUpperY: 80, rightArmUpperLen: 28, rightArmUpperW: 20, 
                rightArmForeX: 122, rightArmForeY: 80 + 28, rightArmForeLen: 24, rightArmForeW: 16 
            };
    }

    /**
     * Generates the base hero texture with equipment.
     * @param {Object} [equipment={}] - Equipment data {head, chest, legs, boots, hands, mainHand, offHand, cloak, shoulder}.
     * @param {Object} [itemsData={}] - Item data from JSON.
     * @param {number} [classColor=0xFFFFFF] - Class-specific color tint.
     * @param {string} [className='paladin'] - Character class name.
     * @param {string} [textureKey='hero_base'] - Key for the generated texture.
     * @returns {string} The final texture key.
     */
    generate(equipment = {}, itemsData = {}, classColor = 0xFFFFFF, className = 'paladin', textureKey = 'hero_base') {
        const placeholderKey = getPlaceholderKey(this.scene, 'hero');
        try {
            // Remove existing texture to force regeneration
            if (this.scene.textures.exists(textureKey)) {
                try {
                    this.scene.textures.remove(textureKey);
                } catch {
                    // Ignore errors - texture might be in use
                }
            }
            
            const graphics = this.scene.add.graphics();
            graphics.clear();
            graphics.setVisible(false);
            graphics.x = 0;
            graphics.y = 0;

            const props = this.getCharacterProps();

            // Draw base character (body, skin, underwear)
            this.drawCharacterWithTransforms(graphics, props, {});

            // Render equipment layers (Dragumagu-style detail)
            if (equipment && Object.keys(equipment).length > 0 && itemsData) {
                this.equipmentRenderer.renderEquipment(graphics, props, equipment, itemsData, className);
            }

            // Generate & cleanup
            graphics.generateTexture(textureKey, this.width, this.height);
            graphics.destroy();

            if (!this.scene.textures.exists(textureKey)) {
                ensurePlaceholderTexture(this.scene, {
                    key: placeholderKey,
                    width: 48, height: 48, color: 0x1f4b99,
                    borderColor: 0xffffff, crossColor: 0xb4d0ff
                });
                return placeholderKey;
            }
            return textureKey;
        } catch (error) {
            console.error('RuntimePaladinGenerator.generate error:', error);
            ensurePlaceholderTexture(this.scene, {
                key: placeholderKey,
                width: 48, height: 48, color: 0x1f4b99,
                borderColor: 0xffffff, crossColor: 0xb4d0ff
            });
            return placeholderKey;
        }
    }

    /**
     * Snaps coordinates to the nearest pixel for pixel-perfect rendering.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @returns {Object} Snapped {x, y} coordinates.
     */
    pixelPerfect(x, y) {
        return { x: Math.floor(x + 0.5), y: Math.floor(y + 0.5) }; // Anti-alias snap
    }

    /**
     * Generate animation frames from the base runtime sprite
     * Creates variations of the base sprite for animations (idle, walk, etc.)
     * @param {string} animationName - Animation name (idle, walk, attack, etc.)
     * @param {number} frameCount - Number of frames to generate
     * @param {string} baseTextureKey - Base texture key (default: 'paladin_dynamic_party')
     * @returns {Array} Array of texture keys for animation frames
     */
    async generateAnimationFrames(animationName, frameCount = 16, baseTextureKey = 'paladin_dynamic_party') {
        
        if (!this.scene.textures.exists(baseTextureKey)) {
            console.warn(`[RuntimePaladinGenerator] Base texture ${baseTextureKey} not found, cannot generate animation frames`);
            return [];
        }

        const frames = [];
        const textureKeyPrefix = `${baseTextureKey}_${animationName}`;
        const baseTexture = this.scene.textures.get(baseTextureKey);
        const baseWidth = baseTexture.width || this.width;
        const baseHeight = baseTexture.height || this.height;

        // Get animation keyframes based on animation type
        // Ensure keyframe configs are loaded
        const { loadKeyframeConfigs } = await import('../config/keyframe-generator.js');
        await loadKeyframeConfigs(this.scene);
        const keyframes = this.getAnimationKeyframes(animationName, frameCount);

        for (let i = 0; i < frameCount; i++) {
            const textureKey = `${textureKeyPrefix}_${i}`;
            
            // Remove existing frame to force regeneration with new body parts (feet, neck)
            if (this.scene.textures.exists(textureKey)) {
                try {
                    this.scene.textures.remove(textureKey);
                } catch {
                    // Ignore errors - texture might be in use
                }
            }

            const keyframe = keyframes[i];
            
            // Calculate center point
            const centerX = baseWidth / 2;
            const centerY = baseHeight / 2;
            
            // Check if this keyframe has per-limb transformations (e.g., knee bending)
            const hasComponentTransforms = keyframe.components && Object.keys(keyframe.components).length > 0;
            
            let frameRenderTexture;
            
            if (hasComponentTransforms) {
                // For per-limb transformations, redraw the character with component transforms
                frameRenderTexture = this.scene.add.renderTexture(0, 0, baseWidth, baseHeight);
                frameRenderTexture.setVisible(false);
                frameRenderTexture.clear();
                
                // Create graphics object for drawing
                const frameGraphics = this.scene.add.graphics();
                frameGraphics.setVisible(false);
                
                // Get props (reuse the same props structure)
                const props = this.getCharacterProps();
                
                // Convert component rotations from keyframe to transforms object
                const transforms = {};
                if (keyframe.components.leftThigh) {
                    transforms.leftThigh = { rotation: keyframe.components.leftThigh.rotation || 0 };
                }
                if (keyframe.components.leftShin) {
                    transforms.leftShin = { rotation: keyframe.components.leftShin.rotation || 0 };
                }
                if (keyframe.components.rightThigh) {
                    transforms.rightThigh = { rotation: keyframe.components.rightThigh.rotation || 0 };
                }
                if (keyframe.components.rightShin) {
                    transforms.rightShin = { rotation: keyframe.components.rightShin.rotation || 0 };
                }
                
                // Draw character with transforms
                this.drawCharacterWithTransforms(frameGraphics, props, transforms);
                
                // Generate texture from graphics
                frameGraphics.generateTexture(textureKey, baseWidth, baseHeight);
                
                // Apply global transforms (x, y, rotation, scale) to the generated texture
                const transformedSprite = this.scene.add.sprite(0, 0, textureKey);
                transformedSprite.setVisible(false);
                transformedSprite.setOrigin(0.5, 0.5);
                transformedSprite.setPosition(centerX + keyframe.x, centerY + keyframe.y);
                transformedSprite.setRotation(keyframe.rotation);
                transformedSprite.setScale(keyframe.scale.x, keyframe.scale.y);
                
                // Draw transformed sprite to render texture
                frameRenderTexture.clear();
                frameRenderTexture.draw(transformedSprite, centerX, centerY);
                
                // Cleanup
                transformedSprite.destroy();
                frameGraphics.destroy();
                this.scene.textures.remove(textureKey); // Remove intermediate texture
            } else {
                // Standard transformation: just transform the whole sprite
                const frameSprite = this.scene.add.sprite(0, 0, baseTextureKey);
                frameSprite.setVisible(false);
                frameSprite.setOrigin(0.5, 0.5);
                frameSprite.setPosition(centerX + keyframe.x, centerY + keyframe.y);
                frameSprite.setRotation(keyframe.rotation);
                frameSprite.setScale(keyframe.scale.x, keyframe.scale.y);
                
                // Render transformed sprite to texture
                frameRenderTexture = this.scene.add.renderTexture(0, 0, baseWidth, baseHeight);
                frameRenderTexture.setVisible(false);
                frameRenderTexture.clear();
                frameRenderTexture.draw(frameSprite, centerX, centerY);
                
                frameSprite.destroy();
            }
            
            // Save RenderTexture as a regular texture
            frameRenderTexture.saveTexture(textureKey);
            
            // Wait for texture to be fully registered before adding to frames array
            const { waitForTexture } = await import('../utils/texture-utils.js');
            const textureReady = await waitForTexture(this.scene, textureKey);
            
            if (textureReady) {
                frames.push(textureKey);
            } else {
                console.error(`[RuntimePaladinGenerator] Texture ${textureKey} failed to register. Frame will be skipped.`);
            }
            
            // Destroy RenderTexture after a delay to ensure texture is saved and processed
            // Delay reduced since we now wait for texture registration
            this.scene.time.delayedCall(1000, () => {
                if (frameRenderTexture && !frameRenderTexture.destroyed) {
                    frameRenderTexture.destroy();
                }
            });
        }

        return frames;
    }

    /**
     * Get animation keyframes for a specific animation type
     * @param {string} animationName - Animation name
     * @param {number} frameCount - Number of frames
     * @returns {Array} Array of keyframe states
     */
    getAnimationKeyframes(animationName, frameCount) {
        // Use keyframe generator from config
        return generateKeyframes(animationName, frameCount, this.scene);
    }

    /**
     * Draws a rectangular outline (Dragumagu-style: 2-3px bold outlines)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object.
     * @param {number} x - X coordinate.
     * @param {number} y - Y coordinate.
     * @param {number} w - Width.
     * @param {number} h - Height.
     * @param {number} [thick=null] - Outline thickness (defaults to style guide).
     */
    drawOutline(graphics, x, y, w, h, thick = null) {
        const {x: px, y: py} = this.pixelPerfect(x, y);
        const pw = Math.floor(w), ph = Math.floor(h);
        const outlineThick = thick !== null ? thick : this.style.outline.thickness;
        graphics.fillStyle(this.palette.outline.main);
        // Top & bottom (thicker for bold look)
        graphics.fillRect(px, py, pw, outlineThick);
        graphics.fillRect(px, py + ph - outlineThick, pw, outlineThick);
        // Sides
        graphics.fillRect(px, py + outlineThick, outlineThick, ph - 2 * outlineThick);
        graphics.fillRect(px + pw - outlineThick, py + outlineThick, outlineThick, ph - 2 * outlineThick);
    }

    /**
     * Draws a circular outline (Dragumagu-style: bold 2-3px)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object.
     * @param {number} cx - Center X coordinate.
     * @param {number} cy - Center Y coordinate.
     * @param {number} r - Radius.
     * @param {number} [thick=null] - Outline thickness (defaults to style guide).
     */
    drawCircleOutline(graphics, cx, cy, r, thick = null) {
        const {x: px, y: py} = this.pixelPerfect(cx, cy);
        const pr = Math.floor(r);
        const outlineThick = thick !== null ? thick : this.style.outline.thickness;
        graphics.lineStyle(outlineThick, this.palette.outline.main);
        graphics.strokeCircle(px, py, pr);
        graphics.lineStyle(1, 0x000000); // Reset
    }

    /**
     * Draws the ground shadow beneath the character.
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object.
     * @param {Object} props - Character properties.
     */
    drawShadow(graphics, props) {
        // Shadow should be at the bottom of the character's feet
        // Leg top (torsoBottom + 10) + Leg length (60) + Foot length (8) = 117 + 10 + 60 + 8 = 195
        const {x: shadowX, y: shadowY} = this.pixelPerfect(props.centerX, 188);
        graphics.fillStyle(this.palette.shadows.ground, this.palette.shadows.alpha);
        graphics.fillEllipse(shadowX, shadowY, 56, 12);
        // Inner fade
        graphics.fillStyle(this.palette.shadows.ground, this.palette.shadows.alpha * 0.5);
        graphics.fillEllipse(shadowX, shadowY, 40, 8);
    }

    /**
     * Main drawing method that coordinates drawing all body parts with transforms.
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object.
     * @param {Object} props - Character properties.
     * @param {Object} [transforms={}] - Joint transformations for animations.
     */
    drawCharacterWithTransforms(graphics, props, transforms = {}) {
        // Layer order for correct overlaps
        this.drawShadow(graphics, props);
        this.drawCapelet(graphics, props);
        this.drawLegsSkin(graphics, props, transforms);
        this.drawFeet(graphics, props, transforms); // Draw feet at ankle position
        this.drawBody(graphics, props);
        this.drawUnderwear(graphics, props);
        this.drawArms(graphics, props, transforms); // Arms on top of torso, underwear, legs
        this.drawNeck(graphics, props); // Draw neck before head
        this.drawHead(graphics, props);
        this.drawEars(graphics, props);
        this.drawHair(graphics, props); // Long flowing hair for detailed mage style
        this.drawFace(graphics, props);
        // this.drawClasp(graphics, props); // Removed - part of cape that was removed
    }

    /**
     * Draws the hero's flowing capelet.
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object.
     * @param {Object} props - Character properties.
     */
    drawCapelet(graphics, props) {
        const {x: sx, y: sy} = this.pixelPerfect(props.leftShoulderX, props.shoulderY);
        const cBase = this.palette.capelet.base;
        const cShadow = this.palette.capelet.shadow;
        const cHigh = this.palette.capelet.highlight;

        // Main capelet flow (multiple triangles for shape) - all coordinates pixel-perfect
        graphics.fillStyle(cBase);
        const {x: t1x1, y: t1y1} = this.pixelPerfect(sx - 2, sy - 2);
        const {x: t1x2, y: t1y2} = this.pixelPerfect(sx - 16, sy + 24);
        const {x: t1x3, y: t1y3} = this.pixelPerfect(sx + 10, sy + 28);
        graphics.fillTriangle(t1x1, t1y1, t1x2, t1y2, t1x3, t1y3);
        const {x: t2x1, y: t2y1} = this.pixelPerfect(sx + 10, sy + 28);
        const {x: t2x2, y: t2y2} = this.pixelPerfect(sx + 18, sy + 12);
        const {x: t2x3, y: t2y3} = this.pixelPerfect(sx + 4, sy + 16);
        graphics.fillTriangle(t2x1, t2y1, t2x2, t2y2, t2x3, t2y3);

        // Flowing edge shadow
        graphics.fillStyle(cShadow);
        const {x: tsx1, y: tsy1} = this.pixelPerfect(sx - 4, sy + 4);
        const {x: tsx2, y: tsy2} = this.pixelPerfect(sx - 14, sy + 28);
        const {x: tsx3, y: tsy3} = this.pixelPerfect(sx + 6, sy + 32);
        graphics.fillTriangle(tsx1, tsy1, tsx2, tsy2, tsx3, tsy3);

        // Top highlight
        graphics.fillStyle(cHigh);
        const {x: thx1, y: thy1} = this.pixelPerfect(sx, sy - 2);
        const {x: thx2, y: thy2} = this.pixelPerfect(sx - 6, sy + 4);
        const {x: thx3, y: thy3} = this.pixelPerfect(sx + 4, sy);
        graphics.fillTriangle(thx1, thy1, thx2, thy2, thx3, thy3);
    }

    drawLegsSkin(graphics, props, transforms = {}) {
        // Left leg with joint transforms
        const leftThighRotation = transforms.leftThigh?.rotation || 0;
        const leftShinRotation = transforms.leftShin?.rotation || 0;
        this.drawThigh(graphics, props.leftHipX, props.leftHipY, props.leftThighLen, props.leftLegWidth, true, leftThighRotation);
        
        // Calculate knee position from hip and thigh rotation
        const leftKneePos = JointTransform.calculateKneePosition(
            props.leftHipX, props.leftHipY, props.leftThighLen, leftThighRotation
        );
        this.drawShin(graphics, leftKneePos.x, leftKneePos.y, props.leftShinLen, props.leftLegWidth, true, leftShinRotation, leftThighRotation);
        
        // Calculate ankle position for foot connection
        const leftAnklePos = JointTransform.calculateAnklePosition(
            leftKneePos.x, leftKneePos.y, props.leftShinLen, leftShinRotation, leftThighRotation
        );
        // Store ankle position in props for foot connection
        if (!props.leftAnklePos) props.leftAnklePos = leftAnklePos;
        
        // Right leg with joint transforms
        const rightThighRotation = transforms.rightThigh?.rotation || 0;
        const rightShinRotation = transforms.rightShin?.rotation || 0;
        this.drawThigh(graphics, props.rightHipX, props.rightHipY, props.rightThighLen, props.rightLegWidth, false, rightThighRotation);
        
        // Calculate knee position from hip and thigh rotation
        const rightKneePos = JointTransform.calculateKneePosition(
            props.rightHipX, props.rightHipY, props.rightThighLen, rightThighRotation
        );
        this.drawShin(graphics, rightKneePos.x, rightKneePos.y, props.rightShinLen, props.rightLegWidth, false, rightShinRotation, rightThighRotation);
        
        // Calculate ankle position for foot connection
        const rightAnklePos = JointTransform.calculateAnklePosition(
            rightKneePos.x, rightKneePos.y, props.rightShinLen, rightShinRotation, rightThighRotation
        );
        // Store ankle position in props for foot connection
        if (!props.rightAnklePos) props.rightAnklePos = rightAnklePos;
    }

    drawThigh(graphics, hipX, hipY, thighLen, thighWidth, isLeft, rotation = 0) {
        const {x: cx, y: cy} = this.pixelPerfect(hipX, hipY);
        const skin = this.palette.skin;

        // Apply rotation transform
        JointTransform.applyRotation(graphics, cx, cy, rotation);

        // Draw thigh rectangle
        const {x: px, y: py} = this.pixelPerfect(cx - thighWidth / 2, cy);
        const pw = Math.floor(thighWidth);
        const ph = Math.floor(thighLen);

        // Detailed thigh with proper shading
        graphics.fillStyle(skin.base);
        graphics.fillRect(px, py, pw, ph);

        // Top-left highlight (detailed shading)
        graphics.fillStyle(skin.light2, 0.4);
        graphics.fillRect(px + 1, py + 1, pw * 0.45, ph * 0.3);
        graphics.fillStyle(skin.light1, 0.3);
        graphics.fillRect(px + 2, py + 2, pw * 0.35, ph * 0.25);

        // Muscle definition (subtle)
        graphics.fillStyle(skin.dark1, 0.3);
        const {x: bulgeX, y: bulgeY} = this.pixelPerfect(cx + (isLeft ? 1 : -1), py + ph * 0.4);
        graphics.fillEllipse(bulgeX, bulgeY, 10, 7);

        // Side shadows for depth
        graphics.fillStyle(skin.dark2, 0.5);
        const shadowX = isLeft ? px + pw - 3 : px;
        graphics.fillRect(shadowX, py + 3, 3, ph - 6);
        graphics.fillStyle(skin.dark1, 0.4);
        graphics.fillRect(shadowX, py + ph * 0.3, 2, ph * 0.4);

        // Bold outline (3px)
        this.drawOutline(graphics, px, py, pw, ph);

        // Restore transform
        JointTransform.restoreTransform(graphics);
    }

    drawShin(graphics, kneeX, kneeY, shinLen, shinWidth, isLeft, shinRotation = 0, thighRotation = 0) {
        const {x: cx, y: cy} = this.pixelPerfect(kneeX, kneeY);
        const skin = this.palette.skin;

        // Shin rotation is relative to thigh direction
        const absoluteRotation = thighRotation + shinRotation;
        
        // Apply rotation transform
        JointTransform.applyRotation(graphics, cx, cy, absoluteRotation);

        // Draw shin rectangle
        const {x: px, y: py} = this.pixelPerfect(cx - shinWidth / 2, cy);
        const pw = Math.floor(shinWidth);
        const ph = Math.floor(shinLen);

        // Detailed shin with proper shading
        graphics.fillStyle(skin.base);
        graphics.fillRect(px, py, pw, ph);

        // Top-left highlight (detailed shading)
        graphics.fillStyle(skin.light2, 0.4);
        graphics.fillRect(px + 1, py + 1, pw * 0.45, ph * 0.3);
        graphics.fillStyle(skin.light1, 0.3);
        graphics.fillRect(px + 2, py + 2, pw * 0.35, ph * 0.25);

        // Calf definition (subtle)
        graphics.fillStyle(skin.dark1, 0.3);
        const {x: bulgeX, y: bulgeY} = this.pixelPerfect(cx + (isLeft ? 2 : -2), py + ph / 2 - 2);
        graphics.fillEllipse(bulgeX, bulgeY, 10, 7);

        // Side shadows for depth
        graphics.fillStyle(skin.dark2, 0.5);
        const legShadowX = isLeft ? px + pw - 3 : px;
        graphics.fillRect(legShadowX, py + 3, 3, ph - 6);
        graphics.fillStyle(skin.dark1, 0.4);
        graphics.fillRect(legShadowX, py + ph * 0.3, 2, ph * 0.4);

        // Bold outline (3px)
        this.drawOutline(graphics, px, py, pw, ph);

        // Restore transform
        JointTransform.restoreTransform(graphics);
    }

    drawFeet(graphics, props, transforms = {}) {
        // Left foot
        if (props.leftAnklePos) {
            const ankleRotation = (transforms.leftShin?.rotation || 0) + (transforms.leftThigh?.rotation || 0);
            this.drawFoot(graphics, props.leftAnklePos.x, props.leftAnklePos.y, props.leftFootLen || 8, props.leftLegWidth, true, ankleRotation);
        }

        // Right foot
        if (props.rightAnklePos) {
            const ankleRotation = (transforms.rightShin?.rotation || 0) + (transforms.rightThigh?.rotation || 0);
            this.drawFoot(graphics, props.rightAnklePos.x, props.rightAnklePos.y, props.rightFootLen || 8, props.rightLegWidth, false, ankleRotation);
        }
    }

    drawFoot(graphics, ankleX, ankleY, footLen, footWidth, isLeft, ankleRotation = 0) {
        const {x: cx, y: cy} = this.pixelPerfect(ankleX, ankleY);
        const skin = this.palette.skin.base;
        const d1 = this.palette.skin.dark1;
        const d2 = this.palette.skin.dark2;
        const l1 = this.palette.skin.light1;

        // Apply rotation transform at ankle
        JointTransform.applyRotation(graphics, cx, cy, ankleRotation);

        // Draw foot (chibi style - simple rounded rectangle)
        const {x: px, y: py} = this.pixelPerfect(cx - footWidth / 2, cy);
        const pw = Math.floor(footWidth);
        const ph = Math.floor(footLen);

        // Base foot shape
        graphics.fillStyle(skin);
        graphics.fillRect(px, py, pw, ph);

        // Toe area highlight
        graphics.fillStyle(l1);
        graphics.fillRect(px + 2, py + ph - 4, pw - 4, 2);

        // Sole shadow
        graphics.fillStyle(d2);
        graphics.fillRect(px + 2, py + ph - 2, pw - 4, 2);

        // Side shadow
        graphics.fillStyle(d1);
        const shadowX = isLeft ? px + pw - 4 : px;
        graphics.fillRect(shadowX, py + 2, 4, ph - 4);

        // Outline
        this.drawOutline(graphics, px, py, pw, ph);

        // Restore transform
        JointTransform.restoreTransform(graphics);
    }

    drawNeck(graphics, props) {
        const {x: cx, y: cy} = this.pixelPerfect(props.centerX, props.neckY);
        const skin = this.palette.skin.base;
        const d1 = this.palette.skin.dark1;
        const l1 = this.palette.skin.light1;

        // Neck width and height
        const neckW = props.neckWidth;
        const neckH = props.neckHeight;

        // Draw neck (simple rounded rectangle)
        const {x: px, y: py} = this.pixelPerfect(cx - neckW / 2, cy - neckH / 2);
        const pw = Math.floor(neckW);
        const ph = Math.floor(neckH);

        // Base
        graphics.fillStyle(skin);
        graphics.fillRoundedRect(px, py, pw, ph, 1);

        // Front highlight
        graphics.fillStyle(l1);
        graphics.fillRect(px + 2, py + 1, pw - 4, ph / 2);

        // Side shadow
        graphics.fillStyle(d1);
        graphics.fillRect(px + pw - 3, py + 1, 3, ph - 2);

        // Outline
        graphics.lineStyle(1, this.palette.outline.main);
        graphics.strokeRoundedRect(px, py, pw, ph, 1);
        graphics.lineStyle(1, 0x000000); // Reset
    }

    drawBoots(graphics, props) {
        // Boot should connect to ankle (end of shin)
        // If ankle position is calculated (with rotations), use it; otherwise use static calculation
        let leftBootBottom, rightBootBottom;
        
        if (props.leftAnklePos) {
            // Use calculated ankle position (accounts for rotations)
            leftBootBottom = props.leftAnklePos.y;
        } else {
            // Fallback: static calculation (no rotations)
            // Boot bottom = leg top + leg length
            leftBootBottom = props.leftLegTop + props.leftLegLen;
        }
        
        if (props.rightAnklePos) {
            // Use calculated ankle position (accounts for rotations)
            rightBootBottom = props.rightAnklePos.y;
        } else {
            // Fallback: static calculation (no rotations)
            rightBootBottom = props.rightLegTop + props.rightLegLen;
        }
        
        // Use ankle X position if available, otherwise use leg X
        const leftBootX = props.leftAnklePos?.x || props.leftLegX;
        const rightBootX = props.rightAnklePos?.x || props.rightLegX;
        
        this.drawBoot(graphics, leftBootX, leftBootBottom, props.leftLegWidth, props.furHeight, props.bootHeight, true);
        this.drawBoot(graphics, rightBootX, rightBootBottom, props.rightLegWidth, props.furHeight, props.bootHeight, false);
    }

    drawBoot(graphics, bx, by, bwidth, furH, bootH, isLeft) {
        const {x: bpx, y: bpy} = this.pixelPerfect(bx, by);
        const {y: bootTopY} = this.pixelPerfect(bpx, bpy - bootH);
        const furBase = this.palette.fur.base;
        const furDark = this.palette.fur.dark;
        const bootBase = this.palette.boot.base;
        const bootShadow = this.palette.boot.shadow;
        const bootHigh = this.palette.boot.highlight;

        // Fur cuff (top) - pixel-perfect coordinates
        graphics.fillStyle(furBase);
        const {x: furCx, y: furCy} = this.pixelPerfect(bpx, bootTopY);
        graphics.fillEllipse(furCx, furCy, Math.floor(bwidth + 4), Math.floor(furH * 1.5));
        graphics.fillStyle(furDark);
        const {x: furX, y: furY} = this.pixelPerfect(bpx + (isLeft ? 2 : -2), bootTopY + 2);
        graphics.fillEllipse(furX, furY, Math.floor(bwidth), Math.floor(furH));

        // Boot body - pixel-perfect positioning
        graphics.fillStyle(bootBase);
        const bootW = Math.floor(bwidth - 2);
        const {x: bootX, y: bootTopYPx} = this.pixelPerfect(bpx - bootW / 2, bootTopY);
        graphics.fillRect(bootX, bootTopYPx, bootW, bootH);

        // Boot shadows (right side for left boot, left side for right boot) - pixel-perfect
        graphics.fillStyle(bootShadow);
        const {x: bootShadowX, y: bootShadowY} = this.pixelPerfect(
            isLeft ? bootX + bootW / 2 : bootX, 
            bootTopYPx + 4
        );
        graphics.fillRect(bootShadowX, bootShadowY, Math.floor(bootW / 2), bootH - 6);

        // Top boot highlight - pixel-perfect
        graphics.fillStyle(bootHigh);
        graphics.fillRect(bootX, bootTopYPx, Math.floor(bootW / 2), 4);

        // Foot sole hint - pixel-perfect
        graphics.fillStyle(bootShadow);
        const {x: soleX, y: soleY} = this.pixelPerfect(bootX - 2, bpy + 2);
        graphics.fillRect(soleX, soleY, bootW + 4, 3);

        // Outline - pixel-perfect
        this.drawOutline(graphics, bootX - 1, bootTopYPx, bootW + 2, bootH + 3);
    }

    drawBody(graphics, props) {
        const {centerX: cx, torsoY: ty, torsoWidth: tw, torsoHeight: th} = props;
        const {x: px, y: py} = this.pixelPerfect(cx - tw / 2, ty - th / 2);
        const pw = Math.floor(tw);
        const ph = Math.floor(th);
        const skin = this.palette.skin;

        // Detailed torso with proper shading (like mage art)
        graphics.fillStyle(skin.base);
        graphics.fillRect(px, py, pw, ph);

        // Top-left highlight (detailed shading)
        graphics.fillStyle(skin.light2, 0.5);
        graphics.fillRect(px + 2, py + 2, pw * 0.4, ph * 0.35);
        graphics.fillStyle(skin.light1, 0.3);
        graphics.fillRect(px + 4, py + 4, pw * 0.3, ph * 0.3);

        // Chest definition (subtle)
        graphics.fillStyle(skin.dark1, 0.3);
        graphics.fillEllipse(cx, ty - 4, 16, 12);

        // Side shadows for depth
        graphics.fillStyle(skin.dark2, 0.5);
        graphics.fillRect(px + pw - 4, py + 6, 4, ph - 12);
        graphics.fillStyle(skin.dark1, 0.4);
        graphics.fillRect(px, py + ph / 2, 3, ph / 2);

        // Bold outline (3px)
        this.drawOutline(graphics, px, py, pw, ph);
    }

    drawArms(graphics, props, _transforms = {}) {
        
        // Left arm (forward flexed)
        this.drawArmPart(graphics, props.leftArmUpperX, props.leftArmUpperY, props.leftArmUpperLen, props.leftArmUpperW, true, true);
        this.drawArmPart(graphics, props.leftArmForeX, props.leftArmForeY, props.leftArmForeLen, props.leftArmForeW, false, true);
        this.drawHand(graphics, props.leftArmForeX, props.leftArmForeY + props.leftArmForeLen, props.leftArmForeW, true, props.centerX);

        // Right arm (back flexed)
        this.drawArmPart(graphics, props.rightArmUpperX, props.rightArmUpperY, props.rightArmUpperLen, props.rightArmUpperW, true, false);
        this.drawArmPart(graphics, props.rightArmForeX, props.rightArmForeY, props.rightArmForeLen, props.rightArmForeW, false, false);
        this.drawHand(graphics, props.rightArmForeX, props.rightArmForeY + props.rightArmForeLen, props.rightArmForeW, false, props.centerX);
    }

    drawArmPart(graphics, ax, ay, alen, awidth, isUpper, isLeft) {
        const {x: px, y: py} = this.pixelPerfect(ax - awidth / 2, ay);
        const pw = Math.floor(awidth);
        const ph = Math.floor(alen);
        const skin = this.palette.skin;

        // Detailed arm segment with proper shading
        graphics.fillStyle(skin.base);
        graphics.fillRect(px, py, pw, ph);

        // Top-left highlight (detailed shading)
        graphics.fillStyle(skin.light2, 0.4);
        graphics.fillRect(px + 1, py + 1, pw * 0.45, ph * 0.3);
        graphics.fillStyle(skin.light1, 0.3);
        graphics.fillRect(px + 2, py + 2, pw * 0.35, ph * 0.25);

        // Muscle definition (subtle)
        if (isUpper) {
            graphics.fillStyle(skin.dark1, 0.3);
            const {x: bulgeX, y: bulgeY} = this.pixelPerfect(ax + (isLeft ? 2 : -2), ay + ph * 0.4);
            graphics.fillEllipse(bulgeX, bulgeY, 8, 6);
        }

        // Side shadows for depth
        graphics.fillStyle(skin.dark2, 0.5);
        const shadowX = isLeft ? px + pw - 3 : px;
        graphics.fillRect(shadowX, py + 3, 3, ph - 6);
        graphics.fillStyle(skin.dark1, 0.4);
        graphics.fillRect(shadowX, py + ph * 0.3, 2, ph * 0.4);

        // Bold outline (3px)
        this.drawOutline(graphics, px, py, pw, ph);
    }

    drawHand(graphics, handX, handY, handWidth, isLeft, _torsoCenterX) {
        const skin = this.palette.skin.base;
        
        // Simple rectangular hand - just a block, no detailed fingers (like the image)
        const {x: px, y: py} = this.pixelPerfect(handX - handWidth / 2, handY);
        const pw = Math.floor(handWidth);
        const ph = 6; // Simple hand height
        
        graphics.fillStyle(skin);
        graphics.fillRect(px, py, pw, ph);
        
        // Simple highlight
        graphics.fillStyle(skin.light1, 0.2);
        graphics.fillRect(px + 1, py + 1, pw * 0.3, 2);
        
        // Bold outline (3px)
        this.drawOutline(graphics, px, py, pw, ph);
    }

    drawHead(graphics, props) {
        const {x: cx, y: cy} = this.pixelPerfect(props.centerX + props.headTiltX, props.headY);
        const r = Math.floor(props.headSize / 2);
        const skin = this.palette.skin;

        // Detailed head with proper shading (like mage art)
        graphics.fillStyle(skin.base);
        graphics.fillCircle(cx, cy, r);

        // Top-left highlight (detailed shading)
        graphics.fillStyle(skin.light2, 0.6);
        graphics.fillEllipse(cx - 8, cy - r + 12, 20, 18);
        graphics.fillStyle(skin.light1, 0.4);
        graphics.fillEllipse(cx - 6, cy - r + 14, 16, 14);

        // Cheek highlights
        graphics.fillStyle(skin.light1, 0.3);
        graphics.fillEllipse(cx - 10, cy + 4, 8, 6);
        graphics.fillEllipse(cx + 10, cy + 4, 8, 6);

        // Side shadows for depth
        graphics.fillStyle(skin.dark1, 0.5);
        graphics.fillEllipse(cx + 12, cy + 2, 10, 12);
        graphics.fillStyle(skin.dark2, 0.3);
        graphics.fillEllipse(cx + 14, cy + 4, 6, 8);

        // Jaw shadow
        graphics.fillStyle(skin.dark1, 0.4);
        graphics.fillEllipse(cx + 6, cy + r - 10, 12, 10);

        // Bold outline (3px) - can be gold for certain classes
        this.drawCircleOutline(graphics, cx, cy, r);
    }

    drawEars(graphics, props) {
        const {x: cx, y: cy} = this.pixelPerfect(props.centerX + props.headTiltX, props.headY);
        const r = Math.floor(props.headSize / 2);
        const skin = this.palette.skin.base;
        const d1 = this.palette.skin.dark1;

        // Simple ears (visible with hair)
        graphics.fillStyle(skin);
        const {x: leftEarX, y: leftEarY} = this.pixelPerfect(cx - r + 3, cy - 2);
        graphics.fillEllipse(leftEarX, leftEarY, 6, 10);
        graphics.fillStyle(d1, 0.4);
        graphics.fillEllipse(leftEarX + 2, leftEarY + 2, 3, 5);

        graphics.fillStyle(skin);
        const {x: rightEarX, y: rightEarY} = this.pixelPerfect(cx + r - 3, cy - 2);
        graphics.fillEllipse(rightEarX, rightEarY, 6, 10);
        graphics.fillStyle(d1, 0.4);
        graphics.fillEllipse(rightEarX - 2, rightEarY + 2, 3, 5);
    }

    drawHair(graphics, props) {
        const {x: cx, y: cy} = this.pixelPerfect(props.centerX + props.headTiltX, props.headY);
        const r = Math.floor(props.headSize / 2);
        const hBase = this.palette.hair.base;
        const hD1 = this.palette.hair.dark1, hD2 = this.palette.hair.dark2;
        const hL = this.palette.hair.light;

        // Long flowing hair (like mage art) - male version
        // Hair base volume on top of head
        graphics.fillStyle(hBase);
        const {x: hairBaseX, y: hairBaseY} = this.pixelPerfect(cx, cy - r + 4);
        const hairBaseWidth = r + 8;
        const hairBaseHeight = r + 4;
        graphics.fillEllipse(hairBaseX, hairBaseY, hairBaseWidth, hairBaseHeight);

        // Hair flowing down sides (like mage's long hair)
        graphics.fillStyle(hBase);
        // Left side flowing down
        graphics.fillEllipse(cx - r - 4, cy + 8, 12, 24);
        graphics.fillEllipse(cx - r - 2, cy + 24, 10, 20);
        graphics.fillEllipse(cx - r, cy + 38, 8, 16);
        // Right side flowing down
        graphics.fillEllipse(cx + r + 4, cy + 8, 12, 24);
        graphics.fillEllipse(cx + r + 2, cy + 24, 10, 20);
        graphics.fillEllipse(cx + r, cy + 38, 8, 16);

        // Hair highlights (top-left light source)
        graphics.fillStyle(hL, 0.6);
        graphics.fillEllipse(cx - 6, cy - r + 6, 18, 14);
        graphics.fillEllipse(cx - r - 2, cy + 10, 8, 16);
        graphics.fillEllipse(cx + r + 2, cy + 10, 8, 16);

        // Hair shadows for depth
        graphics.fillStyle(hD1, 0.5);
        graphics.fillEllipse(cx + 8, cy - r + 8, 14, 12);
        graphics.fillEllipse(cx + r, cy + 14, 8, 14);
        graphics.fillStyle(hD2, 0.3);
        graphics.fillEllipse(cx + 10, cy - r + 10, 10, 8);
    }

    drawFace(graphics, props) {
        const {x: cx, y: cy} = this.pixelPerfect(props.centerX + props.headTiltX, props.headY);
        const eyeY = cy + 8; // Position eyes lower for more realistic look

        // Detailed eyes (like mage art) - blue for mage, varies by class
        const eyeColor = this.palette.eyes.base === 0x0A0A0A ? 0x4169E1 : this.palette.eyes.base; // Blue for mage
        
        // Left eye - detailed with white and pupil
        graphics.fillStyle(0xFFFFFF, 0.9); // Eye white
        graphics.fillEllipse(cx - 10, eyeY, 8, 6);
        graphics.fillStyle(eyeColor); // Eye color (blue for mage)
        graphics.fillEllipse(cx - 10, eyeY, 6, 5);
        graphics.fillStyle(0x000000); // Pupil
        graphics.fillCircle(cx - 10, eyeY, 3);
        graphics.fillStyle(0xFFFFFF); // Eye highlight
        graphics.fillCircle(cx - 11, eyeY - 1, 1.5);

        // Right eye
        graphics.fillStyle(0xFFFFFF, 0.9);
        graphics.fillEllipse(cx + 10, eyeY, 8, 6);
        graphics.fillStyle(eyeColor);
        graphics.fillEllipse(cx + 10, eyeY, 6, 5);
        graphics.fillStyle(0x000000);
        graphics.fillCircle(cx + 10, eyeY, 3);
        graphics.fillStyle(0xFFFFFF);
        graphics.fillCircle(cx + 9, eyeY - 1, 1.5);

        // Nose - subtle
        graphics.fillStyle(this.palette.skin.dark1, 0.3);
        graphics.fillEllipse(cx, eyeY + 6, 4, 3);

        // Mouth - subtle expression
        graphics.fillStyle(this.palette.mouth.base, 0.6);
        graphics.fillEllipse(cx, eyeY + 12, 6, 2);
    }

    drawUnderwear(graphics, props) {
        const {torsoY: ty, torsoHeight: th, leftLegX, leftLegWidth, rightLegX, rightLegWidth} = props;
        // Position underwear to connect torso to legs: start at torso bottom, extend to leg top
        const torsoBottom = ty + th / 2; // 121
        // Underwear width spans from left leg outer edge to right leg outer edge
        const leftLegOuterEdge = leftLegX - leftLegWidth / 2; // Left leg left edge
        const rightLegOuterEdge = rightLegX + rightLegWidth / 2; // Right leg right edge
        const uw = Math.floor(rightLegOuterEdge - leftLegOuterEdge); // Width from leg outer edges
        const underwearCenterX = leftLegOuterEdge + uw / 2; // Center between leg outer edges
        const {x: ux, y: uy} = this.pixelPerfect(underwearCenterX - uw / 2, torsoBottom);
        const uBase = this.palette.underwear.base;
        const uS1 = this.palette.underwear.shadow1;
        const uS2 = this.palette.underwear.shadow2;


        graphics.fillStyle(uBase);
        graphics.fillRect(ux, uy, uw, 20);

        // Cloth folds/shadows
        graphics.fillStyle(uS1);
        graphics.fillRect(ux + 2, uy + 6, uw - 4, 12);
        graphics.fillStyle(uS2);
        graphics.fillRect(ux + uw / 2 - 8, uy + 10, 16, 6);

        // Waistband highlight
        graphics.fillStyle(uBase);
        graphics.fillRect(ux - 2, uy, uw + 4, 4);

        this.drawOutline(graphics, ux - 2, uy, uw + 4, 20);
    }

    drawClasp(graphics, props) {
        const {x: sx, y: sy} = this.pixelPerfect(props.leftShoulderX, props.shoulderY);
        const cBase = this.palette.clasp.base;
        const cShadow = this.palette.clasp.shadow;
        const cHigh = this.palette.clasp.highlight;
        const cCenter = this.palette.clasp.center;

        // Main clasp
        graphics.fillStyle(cBase);
        graphics.fillCircle(sx, sy, 7);

        // Highlight (top-left)
        graphics.fillStyle(cHigh);
        graphics.fillRect(sx - 4, sy - 4, 6, 4);

        // Shadow (bottom-right)
        graphics.fillStyle(cShadow);
        graphics.fillRect(sx + 1, sy + 1, 5, 4);

        // Center gem/boss
        graphics.fillStyle(cCenter);
        graphics.fillCircle(sx + 1, sy + 1, 3);

        this.drawCircleOutline(graphics, sx, sy, 7, 1);
    }
}
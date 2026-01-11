/**
 * Humanoid Generator (ENHANCED - Based on Pixel Art Best Practices)
 * Generates high-quality humanoid sprites with proper cel shading, anatomy, and detail
 * 
 * TEXTURE IMPROVEMENTS:
 * - Fabric Weave Pattern: Uses TextureGenerator for realistic cloth weave (vertical/horizontal lines)
 * - Fabric Folds: Draping effect with proper shadows and highlights (vertical folds with gradient shading)
 * - Seams & Hems: Defined seams at edges, double-hem at bottom for realism
 * - Wrinkles: Horizontal wrinkle patterns from fabric draping and movement
 * - Material Differentiation: 
 *   - Cloth: Weave pattern, folds, seams, wrinkles
 *   - Leather: Grain texture with noise pattern
 *   - Metal: Specular highlights, reflective streaks, rivets/armor plates
 * - Enhanced Shading: Thicker lines at 512x512 resolution, better detail density
 * - Selective Outlining (Selout): Darker shades instead of pure black for natural integration
 * 
 * VISUAL IMPROVEMENTS:
 * - Proper 5-level cel shading using MaterialShader
 * - Organic shapes (ellipses, rounded forms) instead of flat rectangles
 * - Better anatomy (joints, muscles, form definition)
 * - Enhanced facial features (eyes, nose, mouth, eyebrows, cheeks)
 * - Better proportions and posture (scaled for 512x512)
 * - Proper palette usage with material-specific colors
 */

import { PixelDrawer } from '../utils/pixel-drawer.js';
import { PaletteManager } from '../utils/palette-manager.js';
import { MaterialShader } from '../utils/material-shader.js';
import { ProportionManager } from '../utils/proportion-manager.js';
import { TextureGenerator } from '../utils/texture-generator.js';
import { lightenHex, darkenHex, hexToRgb, rgbToHex, mixHex, hexToRgbArray } from '../utils/color-utils.js';

export class HumanoidGenerator {
    constructor(canvas, rng, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.rng = rng;
        this.paletteManager = new PaletteManager();
        
        // Options: paletteName, bloodline, classId
        this.paletteName = options.paletteName || 'warm';
        this.bloodline = options.bloodline || null;
        
        // If bloodline is provided, use its palette
        if (this.bloodline) {
            this.paletteName = this.bloodline;
        }
        
        this.palette = this.paletteManager.getPalette(this.paletteName) || this.paletteManager.getPalette('warm');
        
        // Initialize MaterialShader for 5-level cel-shading
        this.materialShader = new MaterialShader();
        
        // Initialize TextureGenerator for material-specific textures
        const seed = rng ? (rng.seed || Math.floor(Math.random() * 1000000)) : Math.floor(Math.random() * 1000000);
        this.textureGenerator = new TextureGenerator(seed);
        
        // Use canvas dimensions (512×512 pixels for high detail)
        this.width = canvas.width || 512;
        this.height = canvas.height || 512;
        
        // Initialize ProportionManager for chibi proportions (scaled for 512x512)
        this.proportionManager = new ProportionManager(this.height);
        
        this.drawer = new PixelDrawer(this.ctx, this.width, this.height);
        
        // Light source for consistent shading
        this.lightSource = { x: 0.3, y: -0.3 }; // Top-left light
        
        // Material types for different body parts (all skin for naked body)
        this.materialTypes = {
            torso: 'skin',       // Naked torso - skin only
            arms: 'skin',        // Skin
            legs: 'skin',        // Naked legs - skin only
            armor: 'metal'       // For bloodline armor (only if bloodline specified)
        };
    }

    /**
     * Generate a humanoid sprite with enhanced detail
     * @returns {Object} Generated sprite data
     */
    generate() {
        this.drawer.clear(0x00000000); // Clear with transparency

        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        // Get colors from palette or use defaults (skin and hair only - no clothing)
        const skinColors = this.palette.skin || [0xFFDBAC, 0xF4C2A1, 0xE8B896];
        const hairColors = this.palette.hair || [0x8B4513, 0x654321, 0x4A2C1A];
        
        this._skinColor = this.rng ? this.rng.randomChoice(skinColors) : skinColors[0];
        this._hairColor = this.rng ? this.rng.randomChoice(hairColors) : hairColors[0];

        // Generate cel-shade palettes (skin only for naked body)
        this._skinPalette = this.materialShader.generatePalette(this._skinColor, 'skin');

        // Draw basic body - Order matters for layering
        // Draw from bottom to top for proper layering with seamless connections
        // NOTE: Head is drawn fully symmetric, so it doesn't need mirroring
        // Other parts are drawn left-side only, then mirrored
        // IMPORTANT: Draw in order to ensure proper overlapping at joints
        
        // 1. Draw torso first (base for connections)
        this.drawTorsoEnhanced(centerX, centerY);
        
        // 2. Draw legs (connect to torso at hips - overlap)
        this.drawLegsEnhanced(centerX, centerY);
        
        // 3. Draw arms (connect to torso at shoulders - overlap)
        this.drawArmsEnhanced(centerX, centerY);
        
        // Apply symmetry BEFORE drawing head (so head doesn't get split)
        this.drawer.mirrorHorizontal(centerX);

        // Draw head AFTER mirroring, so it's fully symmetric and doesn't get split
        this.drawHeadEnhanced(centerX, centerY);

        // Draw Bloodline Enhancements (some may need to be after mirror)
        if (this.bloodline) {
            this.drawBloodlineDetails(centerX, centerY);
        }

        // Apply selective outlining (selout) instead of pure black
        this.applySelectiveOutline(centerX, centerY);

        // Final application to canvas
        this.drawer.apply();

        return {
            width: this.width,
            height: this.height,
            centerX,
            centerY,
            palette: this.paletteName,
            bloodline: this.bloodline,
            canvas: this.canvas
        };
    }

    /**
     * Draw enhanced head with better facial features and shading
     * @private
     */
    drawHeadEnhanced(centerX, centerY) {
        const headBounds = this.proportionManager.getHeadBounds(centerX, centerY);
        const headX = Math.floor(headBounds.x);
        const headY = Math.floor(headBounds.y);
        const headW = Math.floor(headBounds.width);
        const headH = Math.floor(headBounds.height);
        
        // Draw head using cel-shaded circle for more organic shape
        const headRadius = Math.floor(Math.max(headW, headH) / 2);
        this.materialShader.applyCelShadeCircle(
            this.drawer,
            Math.floor(headBounds.centerX),
            Math.floor(headBounds.centerY),
            headRadius,
            this._skinPalette,
            'top-left'
        );
        
        // Clip to oval shape if not circular (stretch/compress)
        if (Math.abs(headW - headH) > 2) {
            for (let y = headBounds.y; y < headBounds.y + headH; y++) {
                for (let x = headBounds.x; x < headBounds.x + headW; x++) {
                    const normalizedX = (x - headBounds.centerX) / (headW / 2);
                    const normalizedY = (y - headBounds.centerY) / (headH / 2);
                    if (normalizedX * normalizedX + normalizedY * normalizedY > 1) {
                        // Outside oval - clear
                        this.drawer.setPixel(x, y, 0x00000000);
                    }
                }
            }
        }
        
        // Add cheek highlights for form (subtle)
        const cheekSize = Math.floor(headW * 0.12);
        const cheekY = headBounds.centerY + Math.floor(headH * 0.2);
        const cheekColor = this._skinPalette.light1;
        // Draw cheek highlights as small circles
        this.drawer.drawCircle(
            headBounds.centerX - Math.floor(headW * 0.25), 
            cheekY, 
            cheekSize, 
            cheekColor
        );
        this.drawer.drawCircle(
            headBounds.centerX + Math.floor(headW * 0.25), 
            cheekY, 
            cheekSize, 
            cheekColor
        );
        
        // Hair (if applicable)
        if (!this.bloodline || this.bloodline !== 'shadow_assassin') {
            const hairPalette = this.materialShader.generatePalette(this._hairColor, 'cloth');
            const hairRadius = Math.floor(headW * 0.4);
            const hairY = headBounds.y + Math.floor(headH * 0.25);
            this.materialShader.applyCelShadeCircle(
                this.drawer,
                Math.floor(headBounds.centerX),
                hairY,
                hairRadius,
                hairPalette,
                'top-left'
            );
            
            // Hair texture with dithering
            this.addHairTexture(headBounds.centerX, hairY, hairRadius, hairPalette);
        }
        
        // Enhanced facial features
        this.drawFacialFeaturesEnhanced(headBounds, centerX);
    }

    /**
     * Draw enhanced facial features
     * @private
     */
    drawFacialFeaturesEnhanced(headBounds, centerX) {
        const eyeY = headBounds.centerY - Math.floor(headBounds.height * 0.1);
        const eyeSpacing = Math.floor(headBounds.width * 0.25);
        const eyeSize = Math.max(3, Math.floor(headBounds.width * 0.08));
        
        // Eyebrows (subtle) - use lines
        const browY = eyeY - Math.floor(headBounds.height * 0.08);
        const browColor = darkenHex(`#${this._hairColor.toString(16).padStart(6, '0')}`, 0.3);
        const browColorNum = parseInt(browColor.replace('#', ''), 16);
        this.drawer.drawLine(
            Math.floor(centerX - eyeSpacing - eyeSize),
            browY,
            Math.floor(centerX - eyeSpacing + eyeSize),
            browY,
            browColorNum
        );
        this.drawer.drawLine(
            Math.floor(centerX + eyeSpacing - eyeSize),
            browY,
            Math.floor(centerX + eyeSpacing + eyeSize),
            browY,
            browColorNum
        );
        
        // Eyes - use circles for round eyes
        // Eye whites (larger for expressiveness)
        const eyeWhiteRadius = eyeSize + 1;
        this.drawer.drawCircle(Math.floor(centerX - eyeSpacing), eyeY, eyeWhiteRadius, 0xFFFFFF);
        this.drawer.drawCircle(Math.floor(centerX + eyeSpacing), eyeY, eyeWhiteRadius, 0xFFFFFF);
        
        // Eye pupils
        const pupilSize = Math.max(2, eyeSize - 1);
        const eyeColor = this.rng ? (this.rng.random() > 0.7 ? 0x4169E2 : 0x4A90E2) : 0x4A90E2;
        this.drawer.drawCircle(Math.floor(centerX - eyeSpacing), eyeY, pupilSize, eyeColor);
        this.drawer.drawCircle(Math.floor(centerX + eyeSpacing), eyeY, pupilSize, eyeColor);
        
        // Eye highlights (small white dots)
        const highlightSize = Math.max(1, Math.floor(eyeSize * 0.4));
        this.drawer.setPixel(centerX - eyeSpacing - 1, eyeY - 1, 0xFFFFFF);
        this.drawer.setPixel(centerX + eyeSpacing - 1, eyeY - 1, 0xFFFFFF);
        
        // Nose (subtle, defined with shading)
        const noseY = headBounds.centerY + Math.floor(headBounds.height * 0.1);
        const noseColor = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.2);
        // Nose bridge (vertical line)
        for (let i = 0; i < 3; i++) {
            this.drawer.setPixel(centerX, noseY - 1 + i, parseInt(noseColor.replace('#', ''), 16));
        }
        // Nose highlight (small highlight on bridge)
        const noseHighlight = lightenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.15);
        this.drawer.setPixel(centerX, noseY - 1, parseInt(noseHighlight.replace('#', ''), 16));
        
        // Mouth (subtle line or expression)
        const mouthY = headBounds.centerY + Math.floor(headBounds.height * 0.25);
        const mouthColor = 0x8B0000;
        // Simple mouth (3-4 pixels wide)
        for (let i = -2; i <= 2; i++) {
            this.drawer.setPixel(centerX + i, mouthY, mouthColor);
        }
        
        // Chin shadow (adds definition)
        const chinY = headBounds.y + headBounds.height - Math.floor(headBounds.height * 0.1);
        const chinShadowColor = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.25);
        for (let i = -Math.floor(headBounds.width * 0.2); i <= Math.floor(headBounds.width * 0.2); i++) {
            this.drawer.setPixel(centerX + i, chinY, parseInt(chinShadowColor.replace('#', ''), 16));
        }
    }

    /**
     * Draw enhanced torso with better form and shading (naked - skin only)
     * @private
     */
    drawTorsoEnhanced(centerX, centerY) {
        const torsoBounds = this.proportionManager.getTorsoBounds(centerX, centerY);
        
        // Draw torso using cel-shaded rectangle with skin shading (no clothing)
        this.materialShader.applyCelShade(
            this.drawer,
            Math.floor(torsoBounds.x),
            Math.floor(torsoBounds.y),
            Math.floor(torsoBounds.width),
            Math.floor(torsoBounds.height),
            this._skinPalette,
            'top-left'
        );
        
        // Round top corners for more organic shape (chest/shoulders)
        const cornerRadius = Math.min(Math.floor(torsoBounds.width * 0.15), Math.floor(torsoBounds.height * 0.2));
        this.roundCorners(
            Math.floor(torsoBounds.x),
            Math.floor(torsoBounds.y),
            Math.floor(torsoBounds.width),
            Math.floor(torsoBounds.height),
            cornerRadius,
            ['top-left', 'top-right']
        );
        
        // Add chest definition (pectoral lines) - subtle anatomical detail
        const chestY = torsoBounds.y + Math.floor(torsoBounds.height * 0.3);
        const chestLineColor = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.12);
        const chestLineColorNum = parseInt(chestLineColor.replace('#', ''), 16);
        // Subtle pectoral definition lines
        const chestLineWidth = Math.max(1, Math.floor(torsoBounds.width / 128));
        for (let w = 0; w < chestLineWidth; w++) {
            this.drawer.drawLine(
                Math.floor(centerX - torsoBounds.width * 0.35) + w,
                chestY + w,
                Math.floor(centerX - torsoBounds.width * 0.15) + w,
                chestY + Math.floor(torsoBounds.height * 0.2) + w,
                chestLineColorNum
            );
            this.drawer.drawLine(
                Math.floor(centerX + torsoBounds.width * 0.35) - w,
                chestY + w,
                Math.floor(centerX + torsoBounds.width * 0.15) - w,
                chestY + Math.floor(torsoBounds.height * 0.2) + w,
                chestLineColorNum
            );
        }
        
        // Add subtle navel (belly button) for anatomical detail
        const navelY = torsoBounds.y + Math.floor(torsoBounds.height * 0.65);
        const navelColor = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.15);
        this.drawer.setPixel(centerX, navelY, parseInt(navelColor.replace('#', ''), 16));
        // Small highlight above navel
        const navelHighlight = lightenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.08);
        this.drawer.setPixel(centerX, navelY - 1, parseInt(navelHighlight.replace('#', ''), 16));
    }

    /**
     * Draw enhanced arms with joints and muscles
     * @private
     */
    drawArmsEnhanced(centerX, centerY) {
        const leftArmBounds = this.proportionManager.getArmBounds(centerX, centerY, 'left');
        
        // Upper arm (thicker, more rounded) - use circle for rounded shape
        // IMPORTANT: Connect seamlessly to torso by extending into shoulder area
        const upperArmY = leftArmBounds.y - 2; // Extend up slightly to connect with torso
        const upperArmH = Math.floor(leftArmBounds.height * 0.6) + 2; // Add height for connection
        const upperArmRadius = Math.floor(leftArmBounds.width * 0.55);
        const upperArmCenterY = upperArmY + Math.floor(upperArmH / 2);
        this.materialShader.applyCelShadeCircle(
            this.drawer,
            Math.floor(leftArmBounds.centerX),
            upperArmCenterY,
            upperArmRadius,
            this._skinPalette,
            'top-left'
        );
        
        // Clip to oval for proper arm shape
        for (let y = upperArmY; y < upperArmY + upperArmH; y++) {
            for (let x = leftArmBounds.centerX - upperArmRadius; x < leftArmBounds.centerX + upperArmRadius; x++) {
                const normalizedX = (x - leftArmBounds.centerX) / upperArmRadius;
                const normalizedY = (y - upperArmCenterY) / (upperArmH / 2);
                if (normalizedX * normalizedX + normalizedY * normalizedY > 1) {
                    this.drawer.setPixel(x, y, 0x00000000);
                }
            }
        }
        
        // Elbow joint (smoother connection) - blend with forearm
        const elbowY = upperArmY + upperArmH - 1; // Overlap slightly
        const elbowColor = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.15);
        // Wider, softer elbow definition
        for (let i = -Math.floor(leftArmBounds.width * 0.35); i <= Math.floor(leftArmBounds.width * 0.35); i++) {
            const pixel = this.drawer.getPixel(leftArmBounds.centerX + i, elbowY);
            if (pixel && pixel[3] > 0) {
                this.drawer.setPixel(leftArmBounds.centerX + i, elbowY, parseInt(elbowColor.replace('#', ''), 16));
            }
        }
        // Elbow highlight (outer side of elbow)
        const elbowHighlight = lightenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.1);
        this.drawer.setPixel(leftArmBounds.centerX + Math.floor(leftArmBounds.width * 0.25), elbowY - 1, parseInt(elbowHighlight.replace('#', ''), 16));
        
        // Forearm (slightly thinner, tapering) - use rectangle with rounded ends
        // IMPORTANT: Connect seamlessly to upper arm (overlap at elbow)
        const forearmY = elbowY - 1; // Overlap with upper arm for seamless connection
        const forearmH = leftArmBounds.height - upperArmH + 2; // Adjust for overlap
        const forearmW = Math.floor(leftArmBounds.width * 0.85);
        this.materialShader.applyCelShade(
            this.drawer,
            Math.floor(leftArmBounds.centerX - forearmW / 2),
            forearmY,
            forearmW,
            forearmH,
            this._skinPalette,
            'top-left'
        );
        
        // Round forearm ends (smoother transition)
        this.roundCorners(
            Math.floor(leftArmBounds.centerX - forearmW / 2),
            forearmY,
            forearmW,
            forearmH,
            Math.floor(forearmW * 0.4),
            ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        );
        
        // Hand (simplified, but more defined) - use circle
        const handY = forearmY + forearmH;
        const handRadius = Math.floor(leftArmBounds.width * 0.55);
        this.materialShader.applyCelShadeCircle(
            this.drawer,
            Math.floor(leftArmBounds.centerX),
            handY,
            handRadius,
            this._skinPalette,
            'top-left'
        );
        
        // Hand shading (bottom shadow)
        const handShadowColor = this._skinPalette.dark1;
        for (let i = -Math.floor(handRadius * 0.8); i <= Math.floor(handRadius * 0.8); i++) {
            this.drawer.setPixel(
                Math.floor(leftArmBounds.centerX + i), 
                handY + Math.floor(handRadius * 0.7), 
                handShadowColor
            );
        }
    }

    /**
     * Draw enhanced legs with joints and muscles
     * @private
     */
    drawLegsEnhanced(centerX, centerY) {
        const leftLegBounds = this.proportionManager.getLegBounds(centerX, centerY, 'left');
        
        // Upper leg (thigh) - rounded, organic shape
        // IMPORTANT: Connect seamlessly to torso by extending into hip area
        const thighY = leftLegBounds.y - 3; // Extend up to connect with torso (no gap)
        const thighH = Math.floor(leftLegBounds.height * 0.55) + 3; // Add height for connection
        const thighRadius = Math.floor(leftLegBounds.width * 0.5);
        const thighCenterY = thighY + Math.floor(thighH / 2);
        this.materialShader.applyCelShadeCircle(
            this.drawer,
            Math.floor(leftLegBounds.centerX),
            thighCenterY,
            thighRadius,
            this._skinPalette,
            'top-left'
        );
        
        // Clip to oval for proper thigh shape
        for (let y = thighY; y < thighY + thighH; y++) {
            for (let x = leftLegBounds.centerX - thighRadius; x < leftLegBounds.centerX + thighRadius; x++) {
                const normalizedX = (x - leftLegBounds.centerX) / thighRadius;
                const normalizedY = (y - thighCenterY) / (thighH / 2);
                if (normalizedX * normalizedX + normalizedY * normalizedY > 1) {
                    this.drawer.setPixel(x, y, 0x00000000);
                }
            }
        }
        
        // Knee joint (smoother connection) - blend with shin
        const kneeY = thighY + thighH - 1; // Overlap slightly with shin
        const kneeRadius = Math.floor(leftLegBounds.width * 0.25);
        const kneeColor = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.2);
        const kneeColorNum = parseInt(kneeColor.replace('#', ''), 16);
        // Smoother knee definition - use existing palette with darker base
        const kneeDark1Hex = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.3);
        const kneeDark2Hex = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.4);
        const kneePalette = {
            light2: this._skinPalette.light1,
            light1: this._skinPalette.base,
            base: kneeColorNum,
            dark1: parseInt(kneeDark1Hex.replace('#', ''), 16),
            dark2: parseInt(kneeDark2Hex.replace('#', ''), 16)
        };
        this.materialShader.applyCelShadeCircle(
            this.drawer,
            Math.floor(leftLegBounds.centerX), 
            kneeY, 
            kneeRadius, 
            kneePalette,
            'top-left'
        );
        
        // Lower leg (shin) - naked skin only, seamless connection to thigh
        const shinY = kneeY - 1; // Overlap with knee for seamless connection
        const shinH = leftLegBounds.height - thighH + 1; // Adjust for overlap
        const shinW = Math.floor(leftLegBounds.width * 0.82);
        const shinX = Math.floor(leftLegBounds.centerX - shinW / 2);
        
        // Use skin palette for naked legs
        this.materialShader.applyCelShade(
            this.drawer,
            shinX,
            shinY,
            shinW,
            shinH,
            this._skinPalette,
            'top-left'
        );
        
        // Round shin ends (smoother transition)
        this.roundCorners(
            shinX,
            shinY,
            shinW,
            shinH,
            Math.floor(shinW * 0.3),
            ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        );
        
        // Foot (simple but defined) - use rectangle with cel shading
        const footY = shinY + shinH;
        const footW = Math.floor(leftLegBounds.width * 1.2);
        const footH = Math.floor(leftLegBounds.height * 0.15);
        this.materialShader.applyCelShade(
            this.drawer,
            Math.floor(leftLegBounds.centerX - footW / 2),
            footY,
            footW,
            footH,
            this._skinPalette,
            'top-left'
        );
        
        // Round foot front
        this.roundCorners(
            Math.floor(leftLegBounds.centerX - footW / 2),
            footY,
            footW,
            footH,
            Math.floor(footW * 0.2),
            ['top-right', 'bottom-right']
        );
        
        // Ankle (subtle indentation)
        const ankleColor = darkenHex(`#${this._skinColor.toString(16).padStart(6, '0')}`, 0.2);
        this.drawer.setPixel(Math.floor(leftLegBounds.centerX), footY, parseInt(ankleColor.replace('#', ''), 16));
    }

    /**
     * Round corners of a rectangle (helper function)
     * @private
     */
    roundCorners(x, y, width, height, radius, corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
        const r2 = radius * radius;
        const xFloor = Math.floor(x);
        const yFloor = Math.floor(y);
        const wFloor = Math.floor(width);
        const hFloor = Math.floor(height);
        
        for (let py = yFloor; py < yFloor + hFloor; py++) {
            for (let px = xFloor; px < xFloor + wFloor; px++) {
                const relX = px - xFloor;
                const relY = py - yFloor;
                let shouldClear = false;
                
                // Check each corner
                if (corners.includes('top-left') && relX < radius && relY < radius) {
                    const cornerX = radius - relX;
                    const cornerY = radius - relY;
                    if (cornerX * cornerX + cornerY * cornerY > r2) {
                        shouldClear = true;
                    }
                } else if (corners.includes('top-right') && relX >= wFloor - radius && relY < radius) {
                    const cornerX = relX - (wFloor - radius);
                    const cornerY = radius - relY;
                    if (cornerX * cornerX + cornerY * cornerY > r2) {
                        shouldClear = true;
                    }
                } else if (corners.includes('bottom-left') && relX < radius && relY >= hFloor - radius) {
                    const cornerX = radius - relX;
                    const cornerY = relY - (hFloor - radius);
                    if (cornerX * cornerX + cornerY * cornerY > r2) {
                        shouldClear = true;
                    }
                } else if (corners.includes('bottom-right') && relX >= wFloor - radius && relY >= hFloor - radius) {
                    const cornerX = relX - (wFloor - radius);
                    const cornerY = relY - (hFloor - radius);
                    if (cornerX * cornerX + cornerY * cornerY > r2) {
                        shouldClear = true;
                    }
                }
                
                if (shouldClear) {
                    this.drawer.setPixel(px, py, 0x00000000);
                }
            }
        }
    }

    /**
     * Select shade color from palette based on light factor
     * @private
     */
    selectShadeColor(palette, lightFactor) {
        if (lightFactor > 0.75) return palette.light2;
        if (lightFactor > 0.55) return palette.light1;
        if (lightFactor > 0.35) return palette.base;
        if (lightFactor > 0.18) return palette.dark1;
        return palette.dark2;
    }


    /**
     * Add hair texture with dithering
     * @private
     */
    addHairTexture(centerX, centerY, radius, palette) {
        // Add subtle texture to hair using dithering
        const radiusInner = Math.floor(radius * 0.5);
        const radiusOuter = radius;
        
        for (let y = centerY - radiusOuter; y <= centerY + radiusOuter; y++) {
            for (let x = centerX - radiusOuter; x <= centerX + radiusOuter; x++) {
                const pixel = this.drawer.getPixel(x, y);
                if (pixel && pixel[3] > 0) {
                    // Check if we're in hair area (ring between inner and outer radius)
                    const dist = Math.sqrt((x - centerX) ** 2 + ((y - centerY) * 1.3) ** 2);
                    if (dist < radiusOuter && dist > radiusInner) {
                        // Apply dithering for texture every 3rd pixel
                        if ((x + y) % 3 === 0) {
                            const ditheredColor = this.drawer.dither(x, y, palette.light1, palette.base);
                            this.drawer.setPixel(x, y, ditheredColor);
                        }
                    }
                }
            }
        }
    }

    /**
     * Add enhanced cloth texture with weave pattern, folds, and details
     * @private
     */
    addClothTexture(bounds, palette) {
        // Apply fabric weave texture using TextureGenerator
        this.textureGenerator.applyClothTexture(
            this.drawer,
            Math.floor(bounds.x),
            Math.floor(bounds.y),
            Math.floor(bounds.width),
            Math.floor(bounds.height),
            palette.base
        );
        
        // Add fabric folds (draping effect)
        this.addFabricFolds(bounds, palette);
        
        // Add seams and hems
        this.addSeams(bounds, palette);
        
        // Add wrinkle patterns (from fabric draping)
        this.addWrinkles(bounds, palette);
    }
    
    /**
     * Add fabric folds (draping effect with shadows and highlights)
     * @private
     */
    addFabricFolds(bounds, palette) {
        const foldCount = Math.max(3, Math.floor(bounds.width / 32)); // More folds at higher resolution
        const foldSpacing = bounds.width / (foldCount + 1);
        const foldWidth = Math.max(2, Math.floor(bounds.width / 64)); // Thicker folds at 512x512
        
        for (let i = 1; i <= foldCount; i++) {
            const foldX = Math.floor(bounds.x + foldSpacing * i);
            
            // Vertical fold with shading
            for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
                // Fold shadow (left side of fold)
                for (let offset = 0; offset < foldWidth; offset++) {
                    const px = foldX - offset;
                    if (px >= bounds.x && px < bounds.x + bounds.width) {
                        const pixel = this.drawer.getPixel(px, y);
                        if (pixel && pixel[3] > 0) {
                            // Darken for shadow - convert RGBA array to color number
                            const currentColor = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
                            const shadowIntensity = 1 - (offset / foldWidth) * 0.4;
                            const shadowColor = this.darkenColor(currentColor, shadowIntensity * 0.3);
                            this.drawer.setPixel(px, y, shadowColor);
                        }
                    }
                }
                
                // Fold highlight (right side of fold)
                for (let offset = 1; offset <= foldWidth; offset++) {
                    const px = foldX + offset;
                    if (px >= bounds.x && px < bounds.x + bounds.width) {
                        const pixel = this.drawer.getPixel(px, y);
                        if (pixel && pixel[3] > 0) {
                            // Lighten for highlight - convert RGBA array to color number
                            const currentColor = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
                            const highlightIntensity = (offset / foldWidth) * 0.25;
                            const highlightColor = this.lightenColor(currentColor, highlightIntensity);
                            this.drawer.setPixel(px, y, highlightColor);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Add seams and hems (details)
     * @private
     */
    addSeams(bounds, palette) {
        const seamColor = palette.dark2; // Darker for seam definition
        
        // Top hem
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
            const pixel = this.drawer.getPixel(x, bounds.y);
            if (pixel && pixel[3] > 0) {
                this.drawer.setPixel(x, bounds.y, seamColor);
            }
        }
        
        // Bottom hem (stronger)
        for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
            const pixel = this.drawer.getPixel(x, bounds.y + bounds.height - 1);
            if (pixel && pixel[3] > 0) {
                this.drawer.setPixel(x, bounds.y + bounds.height - 1, seamColor);
                // Double hem line for bottom
                if (bounds.y + bounds.height - 2 >= bounds.y) {
                    const pixel2 = this.drawer.getPixel(x, bounds.y + bounds.height - 2);
                    if (pixel2 && pixel2[3] > 0) {
                        this.drawer.setPixel(x, bounds.y + bounds.height - 2, 
                                           this.darkenColor(seamColor, 0.2));
                    }
                }
            }
        }
        
        // Side seams (vertical)
        for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
            const pixel = this.drawer.getPixel(bounds.x, y);
            if (pixel && pixel[3] > 0) {
                this.drawer.setPixel(bounds.x, y, seamColor);
            }
            const pixel2 = this.drawer.getPixel(bounds.x + bounds.width - 1, y);
            if (pixel2 && pixel2[3] > 0) {
                this.drawer.setPixel(bounds.x + bounds.width - 1, y, seamColor);
            }
        }
    }
    
    /**
     * Add wrinkle patterns (from fabric draping and movement)
     * @private
     */
    addWrinkles(bounds, palette) {
        // Horizontal wrinkles (from fabric bunching)
        const wrinkleCount = Math.max(2, Math.floor(bounds.height / 40));
        const wrinkleSpacing = bounds.height / (wrinkleCount + 1);
        
        for (let i = 1; i <= wrinkleCount; i++) {
            const wrinkleY = Math.floor(bounds.y + wrinkleSpacing * i);
            const wrinkleWidth = Math.floor(bounds.width * 0.7); // Wrinkles are narrower
            const wrinkleX = Math.floor(bounds.x + bounds.width * 0.15);
            
            // Wrinkle line with subtle shading
            for (let x = wrinkleX; x < wrinkleX + wrinkleWidth; x++) {
                if (x >= bounds.x && x < bounds.x + bounds.width) {
                    const pixel = this.drawer.getPixel(x, wrinkleY);
                    if (pixel && pixel[3] > 0) {
                        // Subtle darkening for wrinkle
                        const wrinkleColor = this.darkenColor(pixel, 0.15);
                        this.drawer.setPixel(x, wrinkleY, wrinkleColor);
                    }
                }
            }
            
            // Wrinkle highlight (above the line)
            if (wrinkleY - 1 >= bounds.y) {
                for (let x = wrinkleX; x < wrinkleX + wrinkleWidth; x++) {
                    if (x >= bounds.x && x < bounds.x + bounds.width) {
                        const pixel = this.drawer.getPixel(x, wrinkleY - 1);
                        if (pixel && pixel[3] > 0) {
                            const highlightColor = this.lightenColor(pixel, 0.1);
                            this.drawer.setPixel(x, wrinkleY - 1, highlightColor);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Darken a color (helper)
     * @private
     */
    darkenColor(color, factor) {
        if (typeof color === 'number') {
            const r = (color >> 16) & 0xFF;
            const g = (color >> 8) & 0xFF;
            const b = color & 0xFF;
            
            return (Math.max(0, Math.floor(r * (1 - factor))) << 16) |
                   (Math.max(0, Math.floor(g * (1 - factor))) << 8) |
                   Math.max(0, Math.floor(b * (1 - factor)));
        } else {
            // If it's a hex string, use darkenHex
            return parseInt(darkenHex(`#${color.toString(16).padStart(6, '0')}`, factor).replace('#', ''), 16);
        }
    }
    
    /**
     * Lighten a color (helper)
     * @private
     */
    lightenColor(color, factor) {
        if (typeof color === 'number') {
            const r = (color >> 16) & 0xFF;
            const g = (color >> 8) & 0xFF;
            const b = color & 0xFF;
            
            return (Math.min(255, Math.floor(r + (255 - r) * factor)) << 16) |
                   (Math.min(255, Math.floor(g + (255 - g) * factor)) << 8) |
                   Math.min(255, Math.floor(b + (255 - b) * factor));
        } else {
            // If it's a hex string, use lightenHex
            return parseInt(lightenHex(`#${color.toString(16).padStart(6, '0')}`, factor).replace('#', ''), 16);
        }
    }

    /**
     * Add leather-specific details (grain, texture)
     * @private
     */
    addLeatherDetails(bounds, palette) {
        this.textureGenerator.applyLeatherTexture(
            this.drawer,
            Math.floor(bounds.x),
            Math.floor(bounds.y),
            Math.floor(bounds.width),
            Math.floor(bounds.height),
            palette.base
        );
    }
    
    /**
     * Add metal-specific details (highlights, specular reflections)
     * @private
     */
    addMetalDetails(bounds, palette) {
        this.textureGenerator.applyMetalTexture(
            this.drawer,
            Math.floor(bounds.x),
            Math.floor(bounds.y),
            Math.floor(bounds.width),
            Math.floor(bounds.height),
            palette.base
        );
        
        // Add rivets or armor plates
        this.addArmorPlates(bounds, palette);
    }
    
    /**
     * Add armor plates and rivets for metal armor
     * @private
     */
    addArmorPlates(bounds, palette) {
        const plateSize = Math.max(4, Math.floor(bounds.width / 32));
        const plateSpacing = bounds.width / 3;
        
        // Add rivets at plate corners
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                const rivetX = Math.floor(bounds.x + (i + 1) * plateSpacing);
                const rivetY = Math.floor(bounds.y + bounds.height * (0.3 + j * 0.4));
                const rivetColor = palette.dark2; // Dark rivets
                
                // Draw small rivet
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (Math.abs(dx) + Math.abs(dy) <= 1) {
                            this.drawer.setPixel(rivetX + dx, rivetY + dy, rivetColor);
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Apply selective outlining (selout) - darker shades instead of pure black
     * @private
     */
    applySelectiveOutline(centerX, centerY) {
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);
        
        // For each pixel, check if it's on an edge and apply selout
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                const idx = (y * this.width + x) * 4;
                const alpha = data[idx + 3];
                
                if (alpha > 0) {
                    // Check neighbors for transparency or significant color difference
                    const checkNeighbor = (nx, ny) => {
                        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) return true;
                        const nIdx = (ny * this.width + nx) * 4;
                        const nAlpha = data[nIdx + 3];
                        if (nAlpha === 0) return true; // Transparent neighbor
                        
                        // Check for significant color difference (outline needed)
                        const dr = Math.abs(data[idx] - data[nIdx]);
                        const dg = Math.abs(data[idx + 1] - data[nIdx + 1]);
                        const db = Math.abs(data[idx + 2] - data[nIdx + 2]);
                        return (dr > 60 || dg > 60 || db > 60);
                    };
                    
                    // Apply selout to neighbors that need outline
                    const neighbors = [
                        { x: x - 1, y: y },
                        { x: x + 1, y: y },
                        { x: x, y: y - 1 },
                        { x: x, y: y + 1 }
                    ];
                    
                    for (const neighbor of neighbors) {
                        if (checkNeighbor(neighbor.x, neighbor.y)) {
                            const nIdx = (neighbor.y * this.width + neighbor.x) * 4;
                            const nAlpha = data[nIdx + 3];
                            
                            // Use darker version of current color for outline (selout)
                            if (nAlpha === 0) {
                                // Transparent neighbor - use darker shade of current color
                                const r = Math.max(0, Math.floor(data[idx] * 0.4));
                                const g = Math.max(0, Math.floor(data[idx + 1] * 0.4));
                                const b = Math.max(0, Math.floor(data[idx + 2] * 0.4));
                                
                                newData[nIdx] = r;
                                newData[nIdx + 1] = g;
                                newData[nIdx + 2] = b;
                                newData[nIdx + 3] = 220; // Semi-transparent outline
                            } else {
                                // Different color neighbor - use darker shade for separation
                                const avgColor = (data[idx] + data[nIdx]) / 2;
                                const outlineR = Math.max(0, Math.floor(avgColor * 0.5));
                                const outlineG = Math.max(0, Math.floor((data[idx + 1] + data[nIdx + 1]) / 2 * 0.5));
                                const outlineB = Math.max(0, Math.floor((data[idx + 2] + data[nIdx + 2]) / 2 * 0.5));
                                
                                newData[nIdx] = outlineR;
                                newData[nIdx + 1] = outlineG;
                                newData[nIdx + 2] = outlineB;
                                newData[nIdx + 3] = 255;
                            }
                        }
                    }
                }
            }
        }
        
        // Apply the modified data
        const newImageData = this.ctx.createImageData(this.width, this.height);
        newImageData.data.set(newData);
        this.ctx.putImageData(newImageData, 0, 0);
        
        // Update drawer's image data
        this.drawer.imageData = newImageData;
    }


    /**
     * Draw bloodline-specific visual details (enhanced)
     * @private
     */
    drawBloodlineDetails(centerX, centerY) {
        const glowColor = this.paletteManager.getColor(this.paletteName, 'glow', this.rng) || 0xFFFF00;
        const armorColor = this.paletteManager.getColor(this.paletteName, 'armor', this.rng) || 0xC0C0C0;
        const accentColor = this.paletteManager.getColor(this.paletteName, 'accent', this.rng) || 0x4169E1;
        const headBounds = this.proportionManager.getHeadBounds(centerX, centerY);
        const torsoBounds = this.proportionManager.getTorsoBounds(centerX, centerY);

        switch (this.bloodline) {
            case 'ancient_warrior':
                // Enhanced golden pauldrons with better form
                const pauldronSize = Math.floor(torsoBounds.width * 0.25);
                const pauldronPalette = this.materialShader.generatePalette(armorColor, 'metal');
                this.materialShader.applyCelShadeCircle(
                    this.drawer,
                    Math.floor(centerX - torsoBounds.width * 0.4),
                    Math.floor(torsoBounds.y - torsoBounds.height * 0.1),
                    pauldronSize,
                    pauldronPalette,
                    'top-left'
                );
                this.materialShader.applyCelShadeCircle(
                    this.drawer,
                    Math.floor(centerX + torsoBounds.width * 0.4),
                    Math.floor(torsoBounds.y - torsoBounds.height * 0.1),
                    pauldronSize,
                    pauldronPalette,
                    'top-left'
                );
                // Gold crown/halo
                this.drawer.drawCircle(centerX, headBounds.y - 5, 4, glowColor);
                break;

            case 'arcane_scholar':
                // Floating magical orbs with glow
                const orbSize = 3;
                this.drawer.drawCircle(
                    Math.floor(centerX - torsoBounds.width * 0.45), 
                    headBounds.y - 8, 
                    orbSize, 
                    glowColor
                );
                this.drawer.drawCircle(
                    Math.floor(centerX + torsoBounds.width * 0.45), 
                    headBounds.y - 8, 
                    orbSize, 
                    glowColor
                );
                // Magical aura/rune on chest
                const runePalette = this.materialShader.generatePalette(glowColor, 'metal');
                this.materialShader.applyCelShadeCircle(
                    this.drawer,
                    centerX,
                    Math.floor(torsoBounds.centerY),
                    4,
                    runePalette,
                    'center'
                );
                break;

            case 'shadow_assassin':
                // Mask and void eyes (enhanced)
                const voidColor = 0xAA00FF;
                const maskY = headBounds.y + Math.floor(headBounds.height * 0.2);
                // Mask (dark covering)
                this.drawer.drawRect(
                    Math.floor(headBounds.x),
                    maskY,
                    Math.floor(headBounds.width),
                    Math.floor(headBounds.height * 0.4),
                    0x2C2C2C
                );
                // Void eyes (glowing)
                this.drawer.drawCircle(
                    Math.floor(centerX - headBounds.width * 0.2), 
                    Math.floor(headBounds.centerY), 
                    3, 
                    voidColor
                );
                this.drawer.drawCircle(
                    Math.floor(centerX + headBounds.width * 0.2), 
                    Math.floor(headBounds.centerY), 
                    3, 
                    voidColor
                );
                // Cloak trim
                const cloakPalette = this.materialShader.generatePalette(accentColor, 'cloth');
                this.materialShader.applyCelShade(
                    this.drawer,
                    Math.floor(centerX - torsoBounds.width * 0.45),
                    Math.floor(torsoBounds.y),
                    Math.floor(torsoBounds.width * 0.15),
                    Math.floor(torsoBounds.height + torsoBounds.height * 0.5),
                    cloakPalette,
                    'left'
                );
                break;

            case 'dragon_born':
                // Scaly armor patterns
                const scalePalette = this.materialShader.generatePalette(accentColor, 'metal');
                for (let i = 0; i < 3; i++) {
                    const scaleY = Math.floor(torsoBounds.y + i * torsoBounds.height / 3);
                    this.materialShader.applyCelShadeCircle(
                        this.drawer,
                        Math.floor(centerX - torsoBounds.width * 0.3),
                        scaleY,
                        3,
                        scalePalette,
                        'top-left'
                    );
                    this.materialShader.applyCelShadeCircle(
                        this.drawer,
                        Math.floor(centerX + torsoBounds.width * 0.3),
                        scaleY,
                        3,
                        scalePalette,
                        'top-left'
                    );
                }
                // Fiery eyes
                this.drawer.drawCircle(
                    Math.floor(centerX - headBounds.width * 0.2), 
                    Math.floor(headBounds.centerY), 
                    3, 
                    0xFF3D00
                );
                this.drawer.drawCircle(
                    Math.floor(centerX + headBounds.width * 0.2), 
                    Math.floor(headBounds.centerY), 
                    3, 
                    0xFF3D00
                );
                break;

            case 'nature_blessed':
                // Leafy cloak and vine wraps (enhanced)
                const leafPalette = this.materialShader.generatePalette(armorColor, 'cloth');
                this.materialShader.applyCelShade(
                    this.drawer,
                    Math.floor(centerX - torsoBounds.width * 0.42),
                    Math.floor(torsoBounds.y),
                    Math.floor(torsoBounds.width * 0.18),
                    Math.floor(torsoBounds.height + torsoBounds.height * 0.4),
                    leafPalette,
                    'left'
                );
                // Round cloak edges
                this.roundCorners(
                    Math.floor(centerX - torsoBounds.width * 0.42),
                    Math.floor(torsoBounds.y),
                    Math.floor(torsoBounds.width * 0.18),
                    Math.floor(torsoBounds.height + torsoBounds.height * 0.4),
                    3,
                    ['top-left', 'bottom-left']
                );
                // Vine details
                for (let i = 0; i < 3; i++) {
                    const vineY = Math.floor(torsoBounds.y + i * torsoBounds.height / 3);
                    this.drawer.drawLine(
                        Math.floor(centerX - torsoBounds.width * 0.3),
                        vineY,
                        Math.floor(centerX + torsoBounds.width * 0.3),
                        vineY + 2,
                        accentColor
                    );
                }
                break;
        }
    }
}

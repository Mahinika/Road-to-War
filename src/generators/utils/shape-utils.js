/**
 * Shape Utilities - Reusable shape drawing functions
 * Provides functions to draw various game shapes (weapons, armor, characters, etc.)
 */

import { ColorUtils } from './color-utils.js';

export class ShapeUtils {
    /**
     * Draw a sword shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of the sword
     * @param {number} height - Height of the sword
     * @param {number} color - Color value
     */
    static drawSword(graphics, x, y, width, height, color) {
        const bladeWidth = width * 0.15;
        const bladeHeight = height * 0.7;
        const hiltWidth = width * 0.3;
        const hiltHeight = height * 0.2;
        const guardWidth = width * 0.6;
        const guardHeight = height * 0.1;

        // Blade (vertical rectangle)
        graphics.fillStyle(color);
        graphics.fillRect(x - bladeWidth / 2, y - height / 2, bladeWidth, bladeHeight);

        // Guard (horizontal rectangle)
        graphics.fillRect(x - guardWidth / 2, y - bladeHeight / 2, guardWidth, guardHeight);

        // Hilt (vertical rectangle)
        const hiltColor = 0x654321; // Brown
        graphics.fillStyle(hiltColor);
        graphics.fillRect(x - hiltWidth / 2, y + bladeHeight / 2, hiltWidth, hiltHeight);
    }

    /**
     * Draw an axe shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of the axe
     * @param {number} height - Height of the axe
     * @param {number} color - Color value
     */
    static drawAxe(graphics, x, y, width, height, color) {
        const handleWidth = width * 0.1;
        const handleHeight = height * 0.8;
        const bladeWidth = width * 0.4;
        const bladeHeight = height * 0.3;

        // Handle (vertical rectangle)
        const handleColor = 0x654321; // Brown
        graphics.fillStyle(handleColor);
        graphics.fillRect(x - handleWidth / 2, y - height / 2, handleWidth, handleHeight);

        // Blade (triangle/rectangle combo)
        graphics.fillStyle(color);
        // Main blade body
        graphics.fillRect(x + handleWidth / 2, y - height / 2, bladeWidth, bladeHeight);
        // Blade tip (triangle)
        graphics.fillTriangle(
            x + handleWidth / 2 + bladeWidth, y - height / 2,
            x + handleWidth / 2 + bladeWidth, y - height / 2 + bladeHeight,
            x + handleWidth / 2 + bladeWidth + bladeWidth * 0.3, y - height / 2 + bladeHeight / 2
        );
    }

    /**
     * Draw a staff shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of the staff
     * @param {number} height - Height of the staff
     * @param {number} color - Color value
     */
    static drawStaff(graphics, x, y, width, height, color) {
        const staffWidth = width * 0.15;
        const staffHeight = height * 0.9;
        const orbSize = width * 0.4;

        // Staff shaft (vertical rectangle)
        const staffColor = 0x654321; // Brown
        graphics.fillStyle(staffColor);
        graphics.fillRect(x - staffWidth / 2, y - height / 2, staffWidth, staffHeight);

        // Orb at top
        graphics.fillStyle(color);
        graphics.fillCircle(x, y - height / 2, orbSize / 2);
    }

    /**
     * Draw a chest armor shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of the armor
     * @param {number} height - Height of the armor
     * @param {number} color - Color value
     */
    static drawChestArmor(graphics, x, y, width, height, color) {
        // Main body (rounded rectangle)
        graphics.fillStyle(color);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 5);

        // Shoulder pads
        const shoulderWidth = width * 0.3;
        const shoulderHeight = height * 0.2;
        graphics.fillRoundedRect(x - width / 2 - shoulderWidth * 0.3, y - height / 2, shoulderWidth, shoulderHeight, 3);
        graphics.fillRoundedRect(x + width / 2 - shoulderWidth * 0.7, y - height / 2, shoulderWidth, shoulderHeight, 3);
    }

    /**
     * Draw a ring shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} size - Size of the ring
     * @param {number} color - Color value
     */
    static drawRing(graphics, x, y, size, color) {
        const outerRadius = size / 2;
        const innerRadius = size / 3;

        // Outer circle
        graphics.fillStyle(color);
        graphics.fillCircle(x, y, outerRadius);

        // Inner circle (hole)
        graphics.fillStyle(0x1a1a2e); // Background color
        graphics.fillCircle(x, y, innerRadius);
    }

    /**
     * Draw an amulet shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of the amulet
     * @param {number} height - Height of the amulet
     * @param {number} color - Color value
     */
    static drawAmulet(graphics, x, y, width, height, color) {
        // Pendant (diamond/teardrop shape)
        graphics.fillStyle(color);
        graphics.fillTriangle(
            x, y - height / 2,
            x - width / 2, y + height / 4,
            x + width / 2, y + height / 4
        );
        graphics.fillTriangle(
            x - width / 2, y + height / 4,
            x + width / 2, y + height / 4,
            x, y + height / 2
        );

        // Chain/loop at top
        const chainColor = 0x888888; // Gray
        graphics.fillStyle(chainColor);
        graphics.fillCircle(x, y - height / 2 - 5, 3);
    }

    /**
     * Draw a simple character head
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} size - Size of the head
     * @param {number} color - Color value
     */
    static drawCharacterHead(graphics, x, y, size, color) {
        graphics.fillStyle(color);
        graphics.fillCircle(x, y, size / 2);
    }

    /**
     * Draw a simple character body
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of the body
     * @param {number} height - Height of the body
     * @param {number} color - Color value
     */
    static drawCharacterBody(graphics, x, y, width, height, color) {
        graphics.fillStyle(color);
        graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 3);
    }

    /**
     * Draw a simple enemy shape (varied by type)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object to draw on
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of the enemy
     * @param {number} height - Height of the enemy
     * @param {number} color - Color value
     * @param {string} type - Enemy type (affects shape)
     */
    static drawEnemyShape(graphics, x, y, width, height, color, type = 'default') {
        switch (type) {
            case 'goblin':
                // Small, round enemy
                graphics.fillStyle(color);
                graphics.fillCircle(x, y, Math.min(width, height) / 2);
                break;
            case 'orc':
                // Large, rectangular enemy
                graphics.fillStyle(color);
                graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 5);
                break;
            case 'skeleton':
                // Angular, bony enemy
                graphics.fillStyle(color);
                graphics.fillTriangle(
                    x, y - height / 2,
                    x - width / 2, y + height / 2,
                    x + width / 2, y + height / 2
                );
                break;
            default:
                // Default: simple rectangle
                graphics.fillStyle(color);
                graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 3);
        }
    }

    /**
     * Draw a drop shadow for a shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} shapeDrawer - Function that draws the shape (should accept x, y offsets)
     * @param {number} offsetX - Shadow offset X
     * @param {number} offsetY - Shadow offset Y
     * @param {number} blur - Blur amount (approximated with alpha)
     * @param {number} alpha - Shadow alpha (0-1)
     */
    static drawShadow(graphics, shapeDrawer, offsetX, offsetY, blur = 2, alpha = 0.3) {
        // Shadow should be drawn with offset applied in shapeDrawer
        graphics.fillStyle(0x000000, alpha);
        shapeDrawer(offsetX, offsetY);
    }

    /**
     * Draw a highlight on a shape (simulating light source)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} width - Width of highlight area
     * @param {number} height - Height of highlight area
     * @param {number} lightX - Light source X position
     * @param {number} lightY - Light source Y position
     * @param {number} intensity - Highlight intensity (0-1)
     * @param {number} baseColor - Base color to highlight
     */
    static drawHighlight(graphics, x, y, width, height, lightX, lightY, intensity = 0.5, baseColor) {
        // Calculate distance from light source
        const dx = x - lightX;
        const dy = y - lightY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(width * width + height * height);
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        
        // Calculate highlight position (closer to light source)
        const highlightX = x - dx * 0.3;
        const highlightY = y - dy * 0.3;
        const highlightSize = Math.max(width, height) * 0.4;
        
        // Calculate highlight color (lighter version of base)
        const highlightColor = baseColor ? ColorUtils.lighten(baseColor, intensity * (1 - normalizedDistance)) : 0xffffff;
        const highlightAlpha = intensity * (1 - normalizedDistance * 0.5);
        
        graphics.fillStyle(highlightColor, highlightAlpha);
        graphics.fillCircle(highlightX, highlightY, highlightSize);
    }

    /**
     * Draw rim lighting effect (edge highlight)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {number} shapeWidth - Width of shape
     * @param {number} shapeHeight - Height of shape
     * @param {number} color - Rim light color
     * @param {number} rimWidth - Rim width in pixels
     */
    static drawRimLight(graphics, x, y, shapeWidth, shapeHeight, color, rimWidth = 2) {
        graphics.lineStyle(rimWidth, color, 0.8);
        graphics.strokeRoundedRect(x - shapeWidth / 2, y - shapeHeight / 2, shapeWidth, shapeHeight, 3);
    }

    /**
     * Add texture pattern to a shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width of pattern area
     * @param {number} height - Height of pattern area
     * @param {string} patternType - Pattern type (noise, dither, crosshatch, dots)
     * @param {number} color - Pattern color
     * @param {number} intensity - Pattern intensity (0-1)
     */
    static addTexturePattern(graphics, x, y, width, height, patternType = 'noise', color = 0x000000, intensity = 0.1) {
        switch (patternType) {
            case 'noise':
                ColorUtils.addNoise(graphics, x, y, width, height, intensity, color);
                break;
            case 'dither':
                // Dithering pattern
                const ditherSize = 2;
                for (let py = y; py < y + height; py += ditherSize) {
                    for (let px = x; px < x + width; px += ditherSize) {
                        if (Math.random() < intensity) {
                            graphics.fillStyle(color, 0.5);
                            graphics.fillRect(px, py, ditherSize, ditherSize);
                        }
                    }
                }
                break;
            case 'crosshatch':
                // Crosshatch pattern
                graphics.lineStyle(1, color, intensity);
                const spacing = 4;
                for (let i = x; i < x + width; i += spacing) {
                    graphics.lineBetween(i, y, i, y + height);
                }
                for (let i = y; i < y + height; i += spacing) {
                    graphics.lineBetween(x, i, x + width, i);
                }
                break;
            case 'dots':
                // Dot pattern
                const dotSpacing = 4;
                for (let py = y; py < y + height; py += dotSpacing) {
                    for (let px = x; px < x + width; px += dotSpacing) {
                        if (Math.random() < intensity) {
                            graphics.fillStyle(color, 0.6);
                            graphics.fillCircle(px, py, 1);
                        }
                    }
                }
                break;
        }
    }

    /**
     * Draw a shape with gradient fill (simulated with multiple fills)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} shapeDrawer - Function that draws the shape
     * @param {Array} gradientStops - Array of {color, position} objects
     * @param {string} direction - Gradient direction ('vertical' or 'horizontal')
     */
    static drawGradientFill(graphics, shapeDrawer, gradientStops, direction = 'vertical') {
        if (gradientStops.length < 2) {
            // Fallback to solid color
            graphics.fillStyle(gradientStops[0]?.color || 0xffffff);
            shapeDrawer();
            return;
        }

        // Sort stops by position
        const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
        
        // Draw gradient by layering semi-transparent fills
        // This is an approximation since Phaser Graphics doesn't support native gradients
        const steps = 20;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            
            // Find which stops this position is between
            let stopIndex = 0;
            for (let j = 0; j < sortedStops.length - 1; j++) {
                if (t >= sortedStops[j].position && t <= sortedStops[j + 1].position) {
                    stopIndex = j;
                    break;
                }
            }
            
            const stop1 = sortedStops[stopIndex];
            const stop2 = sortedStops[Math.min(stopIndex + 1, sortedStops.length - 1)];
            
            // Interpolate between stops
            const localT = (t - stop1.position) / (stop2.position - stop1.position || 1);
            const color1 = ColorUtils.toRGB(stop1.color);
            const color2 = ColorUtils.toRGB(stop2.color);
            
            const r = Math.floor(color1.r + (color2.r - color1.r) * localT);
            const g = Math.floor(color1.g + (color2.g - color1.g) * localT);
            const b = Math.floor(color1.b + (color2.b - color1.b) * localT);
            
            graphics.fillStyle(ColorUtils.fromRGB(r, g, b), 1.0 / steps);
            shapeDrawer();
        }
    }

    /**
     * Draw ambient occlusion (soft shadow in crevices)
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width of shape
     * @param {number} height - Height of shape
     * @param {number} intensity - AO intensity (0-1)
     */
    static drawAmbientOcclusion(graphics, x, y, width, height, intensity = 0.2) {
        // Draw soft shadows at edges and corners
        const aoColor = 0x000000;
        const aoSize = Math.min(width, height) * 0.15;
        
        // Top-left corner
        graphics.fillStyle(aoColor, intensity);
        graphics.fillCircle(x - width / 2, y - height / 2, aoSize);
        
        // Top-right corner
        graphics.fillCircle(x + width / 2, y - height / 2, aoSize);
        
        // Bottom-left corner
        graphics.fillCircle(x - width / 2, y + height / 2, aoSize);
        
        // Bottom-right corner
        graphics.fillCircle(x + width / 2, y + height / 2, aoSize);
        
        // Edge shadows
        graphics.fillRect(x - width / 2, y - height / 2, width, aoSize * 0.5); // Top
        graphics.fillRect(x - width / 2, y + height / 2 - aoSize * 0.5, width, aoSize * 0.5); // Bottom
        graphics.fillRect(x - width / 2, y - height / 2, aoSize * 0.5, height); // Left
        graphics.fillRect(x + width / 2 - aoSize * 0.5, y - height / 2, aoSize * 0.5, height); // Right
    }

    /**
     * Draw an outline/stroke around a shape
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} shapeDrawer - Function that draws the shape outline
     * @param {number} color - Outline color
     * @param {number} width - Outline width
     * @param {number} alpha - Outline alpha (0-1)
     */
    static drawOutline(graphics, shapeDrawer, color, width = 2, alpha = 1.0) {
        graphics.lineStyle(width, color, alpha);
        shapeDrawer();
    }
}


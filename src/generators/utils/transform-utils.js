/**
 * Transform Utilities - Component transformations for animation
 * Handles rotation, translation, scaling, and interpolation of character components
 */

export class TransformUtils {
    /**
     * Rotate a component around a pivot point
     * Note: Phaser Graphics doesn't support transformations directly
     * This is a placeholder for future implementation with canvas context
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} componentDrawer - Function that draws the component
     * @param {number} angle - Rotation angle in degrees
     * @param {number} pivotX - Pivot X position
     * @param {number} pivotY - Pivot Y position
     */
    static rotateComponent(graphics, componentDrawer, angle, pivotX, pivotY) {
        // For now, just draw without rotation
        // Future: Use canvas context directly for transformations
        componentDrawer();
    }

    /**
     * Translate a component
     * Note: Offset should be applied in componentDrawer function
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} componentDrawer - Function that draws the component (should accept x, y offsets)
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     */
    static translateComponent(graphics, componentDrawer, offsetX, offsetY) {
        // Offset should be applied within componentDrawer
        componentDrawer(offsetX, offsetY);
    }

    /**
     * Scale a component
     * Note: Scale should be applied in componentDrawer function
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} componentDrawer - Function that draws the component (should accept scale)
     * @param {number} scaleX - X scale factor
     * @param {number} scaleY - Y scale factor
     * @param {number} pivotX - Pivot X position
     * @param {number} pivotY - Pivot Y position
     */
    static scaleComponent(graphics, componentDrawer, scaleX, scaleY, pivotX, pivotY) {
        // Scale should be applied within componentDrawer
        componentDrawer(scaleX, scaleY);
    }

    /**
     * Apply multiple transformations to a component
     * Note: Transformations should be applied within componentDrawer
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {Function} componentDrawer - Function that draws the component
     * @param {Object} transforms - Transform object with {rotation, translation, scale}
     */
    static transformComponent(graphics, componentDrawer, transforms) {
        // Transformations should be applied within componentDrawer
        // This is a placeholder for future canvas context implementation
        componentDrawer(transforms);
    }

    /**
     * Interpolate between two component states
     * @param {Object} state1 - First state {x, y, rotation, scale}
     * @param {Object} state2 - Second state {x, y, rotation, scale}
     * @param {number} t - Interpolation factor (0-1)
     * @returns {Object} Interpolated state
     */
    static interpolateComponents(state1, state2, t) {
        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        t = clamp(t, 0, 1);
        
        const lerp = (a, b, t) => a + (b - a) * t;
        const lerpAngle = (a, b, t) => {
            // Handle angle wrapping
            let diff = b - a;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            return a + diff * t;
        };
        
        return {
            x: lerp(state1.x || 0, state2.x || 0, t),
            y: lerp(state1.y || 0, state2.y || 0, t),
            rotation: lerpAngle(state1.rotation || 0, state2.rotation || 0, t),
            scale: {
                x: lerp(state1.scale?.x || state1.scale || 1, state2.scale?.x || state2.scale || 1, t),
                y: lerp(state1.scale?.y || state1.scale || 1, state2.scale?.y || state2.scale || 1, t)
            }
        };
    }

    /**
     * Calculate animation keyframe positions
     * @param {Object} startState - Starting state
     * @param {Object} endState - Ending state
     * @param {number} frameCount - Number of frames
     * @returns {Array} Array of interpolated states
     */
    static calculateKeyframes(startState, endState, frameCount) {
        const keyframes = [];
        for (let i = 0; i < frameCount; i++) {
            const t = i / (frameCount - 1);
            keyframes.push(this.interpolateComponents(startState, endState, t));
        }
        return keyframes;
    }
}


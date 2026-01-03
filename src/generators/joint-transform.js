/**
 * Joint Transform System
 * Handles per-limb rotations and joint position calculations
 */
export class JointTransform {
    /**
     * Calculate joint position after rotation
     * @param {number} pivotX - X position of joint pivot
     * @param {number} pivotY - Y position of joint pivot
     * @param {number} length - Length of limb segment
     * @param {number} rotation - Rotation in radians (0 is down/vertical)
     * @returns {{x: number, y: number}} End position of rotated limb
     */
    static calculateRotatedEnd(pivotX, pivotY, length, rotation) {
        // Standard graphics: 0 is right, PI/2 is down.
        // Our character system: 0 is DOWN (vertical).
        // To convert our 0-is-down to standard 0-is-right, we add PI/2.
        const angle = Math.PI / 2 + rotation;
        return {
            x: pivotX + Math.cos(angle) * length,
            y: pivotY + Math.sin(angle) * length
        };
    }

    /**
     * Apply rotation transform to graphics context
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     * @param {number} pivotX - X position of pivot
     * @param {number} pivotY - Y position of pivot
     * @param {number} rotation - Rotation in radians
     */
    static applyRotation(graphics, pivotX, pivotY, rotation) {
        graphics.save();
        graphics.translateCanvas(pivotX, pivotY);
        graphics.rotateCanvas(rotation);
        graphics.translateCanvas(-pivotX, -pivotY);
    }

    /**
     * Restore graphics transform
     * @param {Phaser.GameObjects.Graphics} graphics - Graphics object
     */
    static restoreTransform(graphics) {
        graphics.restore();
    }

    /**
     * Calculate knee position from hip and thigh rotation
     * @param {number} hipX - Hip X position
     * @param {number} hipY - Hip Y position
     * @param {number} thighLength - Length of thigh
     * @param {number} thighRotation - Thigh rotation in radians
     * @returns {{x: number, y: number}} Knee position
     */
    static calculateKneePosition(hipX, hipY, thighLength, thighRotation) {
        return this.calculateRotatedEnd(hipX, hipY, thighLength, thighRotation);
    }

    /**
     * Calculate ankle position from knee and shin rotation
     * @param {number} kneeX - Knee X position
     * @param {number} kneeY - Knee Y position
     * @param {number} shinLength - Length of shin
     * @param {number} shinRotation - Shin rotation in radians (relative to thigh)
     * @param {number} thighRotation - Thigh rotation in radians (for relative calculation)
     * @returns {{x: number, y: number}} Ankle position
     */
    static calculateAnklePosition(kneeX, kneeY, shinLength, shinRotation, thighRotation) {
        // Shin rotation is relative to thigh direction
        const absoluteRotation = thighRotation + shinRotation;
        return this.calculateRotatedEnd(kneeX, kneeY, shinLength, absoluteRotation);
    }

    /**
     * Calculate elbow position from shoulder and upper arm rotation
     * @param {number} shoulderX - Shoulder X position
     * @param {number} shoulderY - Shoulder Y position
     * @param {number} upperArmLength - Length of upper arm
     * @param {number} upperArmRotation - Upper arm rotation in radians
     * @returns {{x: number, y: number}} Elbow position
     */
    static calculateElbowPosition(shoulderX, shoulderY, upperArmLength, upperArmRotation) {
        return this.calculateRotatedEnd(shoulderX, shoulderY, upperArmLength, upperArmRotation);
    }

    /**
     * Calculate wrist position from elbow and forearm rotation
     * @param {number} elbowX - Elbow X position
     * @param {number} elbowY - Elbow Y position
     * @param {number} forearmLength - Length of forearm
     * @param {number} forearmRotation - Forearm rotation in radians (relative to upper arm)
     * @param {number} upperArmRotation - Upper arm rotation in radians
     * @returns {{x: number, y: number}} Wrist position
     */
    static calculateWristPosition(elbowX, elbowY, forearmLength, forearmRotation, upperArmRotation) {
        const absoluteRotation = upperArmRotation + forearmRotation;
        return this.calculateRotatedEnd(elbowX, elbowY, forearmLength, absoluteRotation);
    }
}


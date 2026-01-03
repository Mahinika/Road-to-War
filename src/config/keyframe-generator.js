/**
 * Keyframe Generator
 * Generates keyframes from configuration files
 */

let keyframeConfigs = null;

/**
 * Load keyframe configurations
 * @param {Phaser.Scene} scene - Phaser scene
 * @returns {Promise<Object>} Keyframe configs
 */
export async function loadKeyframeConfigs(scene) {
    if (keyframeConfigs) {
        return keyframeConfigs;
    }

    try {
        if (scene && scene.cache && scene.cache.json.exists('keyframe-configs')) {
            keyframeConfigs = scene.cache.json.get('keyframe-configs');
        } else {
            // Fallback to default configs
            keyframeConfigs = getDefaultKeyframeConfigs();
        }
    } catch (error) {
        console.warn('[KeyframeGenerator] Failed to load keyframe configs, using defaults:', error);
        keyframeConfigs = getDefaultKeyframeConfigs();
    }

    return keyframeConfigs;
}

/**
 * Get default keyframe configurations (fallback)
 * @returns {Object} Default keyframe configs
 */
function getDefaultKeyframeConfigs() {
    return {
        idle: {
            type: 'breathing',
            parameters: { yOffsetAmplitude: 1 }
        },
        walk: {
            type: 'walkCycle',
            parameters: {
                yOffsetAmplitude: 2,
                xOffsetAmplitude: 1,
                pelvisRotationAmplitude: 0.1,
                torsoRotationFactor: 0.3,
                kneeBendAmplitude: 0.5,
                hipFlexionAmplitude: 0.2,
                ankleLiftAmplitude: 0.3,
                armSwingAmplitude: 0.3,
                elbowBendFactor: 0.4
            }
        },
        attack: {
            type: 'phased',
            parameters: {
                forwardLean: 3,
                rotationAmplitude: 0.1
            }
        },
        defend: {
            type: 'defensive',
            parameters: {
                backwardLean: 2
            }
        },
        death: {
            type: 'fall',
            parameters: {
                fallDistance: 10,
                rotationAmount: 90,
                scaleReduction: 0.3
            }
        }
    };
}

/**
 * Generate keyframes for an animation
 * @param {string} animationName - Animation name
 * @param {number} frameCount - Number of frames
 * @param {Phaser.Scene} scene - Phaser scene
 * @returns {Array} Array of keyframe objects
 */
export function generateKeyframes(animationName, frameCount, scene = null) {
    const configs = keyframeConfigs || getDefaultKeyframeConfigs();
    const config = configs[animationName];

    if (!config) {
        // Default: no transformation
        return generateDefaultKeyframes(frameCount);
    }

    switch (config.type) {
        case 'breathing':
            return generateBreathingKeyframes(frameCount, config.parameters);
        case 'walkCycle':
            return generateWalkCycleKeyframes(frameCount, config.parameters);
        case 'phased':
            return generatePhasedKeyframes(frameCount, config.parameters, animationName);
        case 'defensive':
            return generateDefensiveKeyframes(frameCount, config.parameters);
        case 'fall':
            return generateFallKeyframes(frameCount, config.parameters);
        default:
            return generateDefaultKeyframes(frameCount);
    }
}

/**
 * Generate breathing animation keyframes
 */
function generateBreathingKeyframes(frameCount, params) {
    const keyframes = [];
    const amplitude = params.yOffsetAmplitude || 1;

    for (let i = 0; i < frameCount; i++) {
        const t = i / frameCount;
        const yOffset = Math.sin(t * Math.PI * 2) * amplitude;
        keyframes.push({
            x: 0,
            y: yOffset,
            rotation: 0,
            scale: { x: 1, y: 1 }
        });
    }

    return keyframes;
}

/**
 * Generate walk cycle keyframes
 */
function generateWalkCycleKeyframes(frameCount, params) {
    const keyframes = [];
    const {
        yOffsetAmplitude = 2,
        xOffsetAmplitude = 1,
        pelvisRotationAmplitude = 0.1,
        torsoRotationFactor = 0.3,
        kneeBendAmplitude = 0.5,
        hipFlexionAmplitude = 0.2,
        ankleLiftAmplitude = 0.3,
        armSwingAmplitude = 0.3,
        elbowBendFactor = 0.4
    } = params;

    for (let i = 0; i < frameCount; i++) {
        const t = i / frameCount;
        const yOffset = Math.sin(t * Math.PI * 2) * yOffsetAmplitude;
        const xOffset = Math.sin(t * Math.PI * 2) * xOffsetAmplitude;
        
        const pelvisRotation = Math.sin(t * Math.PI * 2) * pelvisRotationAmplitude;
        const torsoRotation = -pelvisRotation * torsoRotationFactor;
        
        const leftKneeBend = t < 0.5 ? Math.sin(t * Math.PI * 4) * kneeBendAmplitude : 0;
        const rightKneeBend = t >= 0.5 ? Math.sin((t - 0.5) * Math.PI * 4) * kneeBendAmplitude : 0;
        
        const leftHipFlexion = t < 0.5 ? Math.sin(t * Math.PI * 4) * hipFlexionAmplitude : 0;
        const rightHipFlexion = t >= 0.5 ? Math.sin((t - 0.5) * Math.PI * 4) * hipFlexionAmplitude : 0;
        
        const leftAnkleLift = t < 0.5 ? Math.sin(t * Math.PI * 4) * ankleLiftAmplitude : 0;
        const rightAnkleLift = t >= 0.5 ? Math.sin((t - 0.5) * Math.PI * 4) * ankleLiftAmplitude : 0;
        
        const leftArmSwing = t < 0.5 ? -Math.sin(t * Math.PI * 4) * armSwingAmplitude : Math.sin((t - 0.5) * Math.PI * 4) * armSwingAmplitude;
        const rightArmSwing = t < 0.5 ? Math.sin(t * Math.PI * 4) * armSwingAmplitude : -Math.sin((t - 0.5) * Math.PI * 4) * armSwingAmplitude;
        
        const leftElbowBend = Math.abs(leftArmSwing) * elbowBendFactor;
        const rightElbowBend = Math.abs(rightArmSwing) * elbowBendFactor;
        
        keyframes.push({
            x: xOffset,
            y: yOffset,
            rotation: torsoRotation,
            scale: { x: 1, y: 1 },
            components: {
                pelvis: { rotation: pelvisRotation },
                leftThigh: { rotation: leftHipFlexion + leftKneeBend * 0.6 },
                leftShin: { rotation: leftKneeBend, offsetY: leftAnkleLift * 8 },
                rightThigh: { rotation: rightHipFlexion + rightKneeBend * 0.6 },
                rightShin: { rotation: rightKneeBend, offsetY: rightAnkleLift * 8 },
                leftShoulder: { rotation: leftArmSwing },
                leftElbow: { rotation: leftElbowBend },
                rightShoulder: { rotation: rightArmSwing },
                rightElbow: { rotation: rightElbowBend }
            }
        });
    }

    return keyframes;
}

/**
 * Generate phased animation keyframes (e.g., attack)
 */
function generatePhasedKeyframes(frameCount, params, _animationName) {
    const keyframes = [];
    const { 
        forwardLean = 3, 
        rotationAmplitude = 0.1,
        armSwingAmplitude = 0.8,
        kneeBendAmplitude = 0.2
    } = params;

    for (let i = 0; i < frameCount; i++) {
        const t = i / frameCount;
        // Phase-based progress: 0-0.3 wind-up, 0.3-0.7 strike, 0.7-1.0 recovery
        const forward = t < 0.3 ? t / 0.3 : (t < 0.7 ? 1 : (1 - (t - 0.7) / 0.3));
        const strike = t >= 0.3 && t < 0.5 ? (t - 0.3) / 0.2 : (t >= 0.5 && t < 0.7 ? 1 - (t - 0.5) / 0.2 : 0);
        
        const xOffset = forward * forwardLean;
        const rotation = forward * rotationAmplitude;
        
        // Dynamic limb movement for "High Quality" feel
        const leftArmRotation = forward * armSwingAmplitude - strike * 0.5;
        const rightArmRotation = -forward * armSwingAmplitude + strike * 1.5; // Stronger strike with right arm
        const kneeBend = strike * kneeBendAmplitude;
        
        keyframes.push({
            x: xOffset,
            y: strike * 2, // Slight dip during strike
            rotation: rotation,
            scale: { x: 1, y: 1 },
            components: {
                leftShoulder: { rotation: leftArmRotation },
                rightShoulder: { rotation: rightArmRotation },
                leftThigh: { rotation: kneeBend },
                rightThigh: { rotation: -kneeBend },
                torso: { rotation: forward * 0.05 }
            }
        });
    }

    return keyframes;
}

/**
 * Generate defensive animation keyframes
 */
function generateDefensiveKeyframes(frameCount, params) {
    const keyframes = [];
    const { 
        backwardLean = 2,
        shieldRaiseAmplitude = 0.6,
        crouchAmplitude = 3
    } = params;

    for (let i = 0; i < frameCount; i++) {
        const t = i / frameCount;
        const defend = Math.sin(t * Math.PI); // Pulse from 0 to 1 back to 0
        const xOffset = -defend * backwardLean;
        
        keyframes.push({
            x: xOffset,
            y: defend * crouchAmplitude, // Crouch down
            rotation: 0,
            scale: { x: 1, y: 1 },
            components: {
                leftShoulder: { rotation: -defend * shieldRaiseAmplitude },
                rightShoulder: { rotation: defend * 0.2 },
                leftThigh: { rotation: defend * 0.4 },
                rightThigh: { rotation: defend * 0.4 },
                pelvis: { rotation: defend * 0.1 }
            }
        });
    }

    return keyframes;
}

/**
 * Generate fall animation keyframes
 */
function generateFallKeyframes(frameCount, params) {
    const keyframes = [];
    const { fallDistance = 10, rotationAmount = 90, scaleReduction = 0.3 } = params;

    for (let i = 0; i < frameCount; i++) {
        const t = i / (frameCount - 1);
        const fallY = t * fallDistance;
        const rotation = t * rotationAmount;
        const scale = 1 - t * scaleReduction;
        
        keyframes.push({
            x: 0,
            y: fallY,
            rotation: rotation,
            scale: { x: scale, y: scale }
        });
    }

    return keyframes;
}

/**
 * Generate default keyframes (no transformation)
 */
function generateDefaultKeyframes(frameCount) {
    const keyframes = [];
    for (let i = 0; i < frameCount; i++) {
        keyframes.push({
            x: 0,
            y: 0,
            rotation: 0,
            scale: { x: 1, y: 1 }
        });
    }
    return keyframes;
}

/**
 * Reset keyframe configs (for hot-reload)
 */
export function resetKeyframeConfigs() {
    keyframeConfigs = null;
}


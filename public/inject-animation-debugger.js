/**
 * Injectable Animation Debugger
 * Paste this into the browser console while the game is running
 */

(function() {
    if (!window.gameScene || !window.gameScene.animationManager) {
        console.error('Animation Debugger: GameScene or AnimationManager not found. Make sure the game is running.');
        return;
    }

    const scene = window.gameScene;
    const animMgr = scene.animationManager;
    const debugger = animMgr.debugger;
    const validator = animMgr.validator;

    // Create debugger interface
    window.animDebug = {
        // Quick access
        scene: scene,
        animMgr: animMgr,
        debugger: debugger,
        validator: validator,

        // Inspect animation
        inspect: function(animKey) {
            if (!animKey) {
                console.log('Available animations:', Object.keys(scene.anims.anims.entries));
                return;
            }
            const inspection = debugger.inspectAnimation(animKey);
            console.log('Animation Inspection:', inspection);
            debugger.logAnimationInfo(animKey);
            return inspection;
        },

        // Validate animation
        validate: function(animKey) {
            if (!animKey) {
                const summary = validator.validateAllAnimations();
                console.log('All Animations Validation:', summary);
                return summary;
            }
            const result = validator.validateAnimation(animKey);
            console.log('Validation Result:', result);
            return result;
        },

        // Get statistics
        stats: function() {
            const stats = debugger.getStatistics();
            console.table(stats);
            return stats;
        },

        // Get character animations
        list: function(characterType) {
            if (!characterType) {
                const all = Object.keys(scene.anims.anims.entries);
                console.log('All animations:', all);
                return all;
            }
            const anims = debugger.getCharacterAnimations(characterType);
            console.log(`${characterType} animations:`, anims);
            return anims;
        },

        // Compare animations
        compare: function(animKey1, animKey2) {
            const comparison = debugger.compareAnimations(animKey1, animKey2);
            console.log('Comparison:', comparison);
            return comparison;
        },

        // Export animation data
        export: function(animKey) {
            const data = debugger.exportAnimationData(animKey);
            console.log('Export Data:', data);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `animation-${animKey}-${Date.now()}.json`;
            a.click();
            return data;
        },

        // Test all animations
        testAll: function() {
            const summary = validator.validateAllAnimations();
            console.log('Test Results:', summary);
            return summary;
        },

        // Help
        help: function() {
            console.log(`
Animation Debugger Commands:
  animDebug.inspect(animKey)     - Inspect an animation (or list all if no key)
  animDebug.validate(animKey)    - Validate an animation (or all if no key)
  animDebug.stats()               - Get animation statistics
  animDebug.list(type)            - List animations for character type (or all)
  animDebug.compare(key1, key2)   - Compare two animations
  animDebug.export(animKey)       - Export animation data as JSON
  animDebug.testAll()             - Test all animations
  animDebug.help()                - Show this help

Examples:
  animDebug.list('paladin')
  animDebug.inspect('paladin-shared-walk')
  animDebug.validate('paladin-shared-walk')
  animDebug.stats()
            `);
        }
    };

    console.log('%cAnimation Debugger Loaded!', 'color: #4CAF50; font-weight: bold; font-size: 16px');
    console.log('Type animDebug.help() for commands');
    animDebug.help();
})();


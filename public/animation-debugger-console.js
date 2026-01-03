/**
 * Console-based Animation Debugger
 * Run this in the browser console while the game is running at localhost:3000
 */

(function() {
    'use strict';
    
    // Helper to get GameScene - returns null if not ready (no errors)
    function getGameScene() {
        if (!window.gameScene || !window.gameScene.animationManager) {
            return null;
        }
        return window.gameScene;
    }

    // Create global debugger interface (lazy-initialized)
    window.animDebug = {
        get scene() {
            return getGameScene();
        },
        get animMgr() {
            const scene = getGameScene();
            return scene ? scene.animationManager : null;
        },
        get debugger() {
            const scene = getGameScene();
            return scene?.animationManager?.debugger || null;
        },
        get validator() {
            const scene = getGameScene();
            return scene?.animationManager?.validator || null;
        },

        // Inspect animation
        inspect: function(animKey) {
            const scene = getGameScene();
            const animDebugger = this.debugger;
            if (!scene || !animDebugger) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            if (!animKey) {
                const all = Object.keys(scene.anims.anims.entries);
                console.log('📋 Available animations:', all);
                return all;
            }
            const inspection = animDebugger.inspectAnimation(animKey);
            console.group(`🔍 Inspection: ${animKey}`);
            console.log('Frame Count:', inspection.frameCount);
            console.log('Frame Rate:', inspection.frameRate, 'fps');
            console.log('Loop:', inspection.loop);
            if (inspection.errors.length > 0) {
                console.error('Errors:', inspection.errors);
            }
            if (inspection.warnings.length > 0) {
                console.warn('Warnings:', inspection.warnings);
            }
            console.log('Frames:', inspection.frames);
            console.groupEnd();
            return inspection;
        },

        // Validate animation
        validate: function(animKey) {
            const validator = this.validator;
            if (!validator) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            if (!animKey) {
                const summary = validator.validateAllAnimations();
                console.group('✅ All Animations Validation');
                console.log('Total:', summary.total);
                console.log('Valid:', summary.valid);
                console.log('Invalid:', summary.invalid);
                console.log('Errors:', summary.errors);
                console.log('Warnings:', summary.warnings);
                console.table(summary.byCharacterType);
                console.groupEnd();
                return summary;
            }
            const result = validator.validateAnimation(animKey);
            console.group(`✅ Validation: ${animKey}`);
            console.log('Valid:', result.valid);
            if (result.errors.length > 0) {
                console.error('Errors:', result.errors);
            }
            if (result.warnings.length > 0) {
                console.warn('Warnings:', result.warnings);
            }
            console.log('Info:', result.info);
            console.groupEnd();
            return result;
        },

        // Get statistics
        stats: function() {
            const animDebugger = this.debugger;
            if (!animDebugger) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            const stats = animDebugger.getStatistics();
            console.group('📊 Animation Statistics');
            console.log('Total Animations:', stats.totalAnimations);
            console.log('Total Frames:', stats.totalFrames);
            console.log('Memory Estimate:', stats.memoryEstimateMB, 'MB');
            console.table(stats.animationsByType);
            console.groupEnd();
            return stats;
        },

        // List animations
        list: function(characterType) {
            const scene = getGameScene();
            const animDebugger = this.debugger;
            if (!scene || !animDebugger) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            if (!characterType) {
                const all = Object.keys(scene.anims.anims.entries);
                console.log('📋 All animations:', all);
                return all;
            }
            const anims = animDebugger.getCharacterAnimations(characterType);
            console.log(`📋 ${characterType} animations:`, anims);
            return anims;
        },

        // Compare animations
        compare: function(animKey1, animKey2) {
            const animDebugger = this.debugger;
            if (!animDebugger) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            const comparison = animDebugger.compareAnimations(animKey1, animKey2);
            console.group('⚖️ Animation Comparison');
            console.log('Animation 1:', comparison.anim1);
            console.log('Animation 2:', comparison.anim2);
            console.log('Differences:', comparison.differences);
            console.groupEnd();
            return comparison;
        },

        // Export animation data
        export: function(animKey) {
            const animDebugger = this.debugger;
            if (!animDebugger) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            if (!animKey) {
                console.error('Please provide an animation key: animDebug.export("paladin-shared-walk")');
                return;
            }
            const data = animDebugger.exportAnimationData(animKey);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `animation-${animKey}-${Date.now()}.json`;
            a.click();
            console.log('💾 Exported:', animKey);
            return data;
        },

        // Test all
        testAll: function() {
            const validator = this.validator;
            if (!validator) {
                console.warn('⚠️ GameScene not ready. Wait a few seconds and try again.');
                return null;
            }
            const summary = validator.validateAllAnimations();
            console.group('🧪 Test All Animations');
            console.log(`Total: ${summary.total}, Valid: ${summary.valid}, Invalid: ${summary.invalid}`);
            console.log(`Errors: ${summary.errors}, Warnings: ${summary.warnings}`);
            console.table(summary.results);
            console.groupEnd();
            return summary;
        },

        // Help
        help: function() {
            console.log(`
%c🎬 Animation Debugger Commands%c

%cInspect: %c
  animDebug.inspect()                    - List all animations
  animDebug.inspect('paladin-shared-walk') - Inspect specific animation

%cValidate: %c
  animDebug.validate()                   - Validate all animations
  animDebug.validate('paladin-shared-walk') - Validate specific animation

%cStatistics: %c
  animDebug.stats()                      - Get animation statistics

%cList: %c
  animDebug.list()                       - List all animations
  animDebug.list('paladin')              - List paladin animations

%cCompare: %c
  animDebug.compare('key1', 'key2')      - Compare two animations

%cExport: %c
  animDebug.export('paladin-shared-walk') - Export animation data

%cTest: %c
  animDebug.testAll()                    - Test all animations

%cExamples: %c
  animDebug.list('paladin')
  animDebug.inspect('paladin-shared-walk')
  animDebug.validate('paladin-shared-walk')
  animDebug.stats()
            `, 
            'color: #4CAF50; font-weight: bold; font-size: 16px',
            '',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0',
            'color: #4CAF50; font-weight: bold',
            'color: #e0e0e0'
            );
        }
    };

    // Only show loaded message if GameScene is ready, otherwise wait silently
    if (getGameScene()) {
        console.log('%c✅ Animation Debugger Loaded!', 'color: #4CAF50; font-weight: bold; font-size: 16px');
        console.log('%cType animDebug.help() for commands', 'color: #bbb; font-size: 12px');
        animDebug.help();
    } else {
        // Silently loaded - will work once GameScene is ready
        console.log('%c✅ Animation Debugger Ready (waiting for GameScene)', 'color: #888; font-size: 12px');
    }
})();


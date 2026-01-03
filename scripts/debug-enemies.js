// Enemy Spawning Debug Script
// Run this in browser console when game is loaded

(function() {
    console.log('🎮 Enemy Spawning Debug - Starting diagnostics...');

    if (!window.gameScene) {
        console.error('❌ Game scene not found! Make sure game is loaded.');
        return;
    }

    const scene = window.gameScene;
    const worldManager = scene.worldManager;
    const camera = scene.cameras.main;

    // Check 1: Camera Position
    console.log('📷 Camera Status:', {
        scrollX: camera?.scrollX,
        scrollY: camera?.scrollY,
        width: camera?.width,
        height: camera?.height,
        zoom: camera?.zoom
    });

    // Check 2: WorldManager Status
    console.log('🌍 WorldManager Status:', {
        initialized: worldManager?.initialized,
        currentMile: worldManager?.currentMile,
        currentSegment: worldManager?.currentSegment,
        segmentWidth: worldManager?.segmentWidth,
        segmentsCount: worldManager?.segments?.length,
        enemiesCount: worldManager?.enemies?.length
    });

    // Check 3: Hero Position
    console.log('🦸 Hero Status:', {
        heroExists: !!scene.hero,
        heroX: scene.hero?.x,
        heroY: scene.hero?.y,
        heroActive: scene.hero?.active,
        heroVisible: scene.hero?.visible
    });

    // Check 4: Segments Generated
    if (worldManager?.segments) {
        console.log('📊 Segments Generated:');
        Object.entries(worldManager.segments).forEach(([index, segment]) => {
            console.log(`  Segment ${index}:`, {
                enemies: segment.enemies?.length || 0,
                encounters: segment.encounters?.length || 0,
                type: segment.type,
                generated: segment.generated
            });
        });
    }

    // Check 5: Enemies List
    if (worldManager?.enemies) {
        console.log('👹 Enemies List:');
        worldManager.enemies.forEach((enemy, i) => {
            console.log(`  Enemy ${i} (${enemy.id}):`, {
                x: enemy.x,
                y: enemy.y,
                active: enemy.active,
                defeated: enemy.defeated,
                hasSprite: !!enemy.sprite,
                spriteVisible: enemy.sprite?.visible,
                spriteActive: enemy.sprite?.active,
                isBoss: enemy.isBoss,
                spriteCreating: enemy.spriteCreating
            });
        });
    }

    // Check 6: World Config
    console.log('⚙️ World Config:', {
        enemySpawnChance: worldManager?.worldConfig?.encounters?.enemySpawnChance,
        bossSpawnChance: worldManager?.worldConfig?.encounters?.bossSpawnChance,
        maxSegments: worldManager?.worldConfig?.worldGeneration?.maxSegments
    });

    // Check 7: Manual Segment Generation Test
    console.log('🧪 Testing manual segment generation...');
    try {
        if (worldManager && typeof worldManager.checkSegmentGeneration === 'function') {
            worldManager.checkSegmentGeneration();
            console.log('✅ checkSegmentGeneration() called successfully');
        } else {
            console.log('❌ checkSegmentGeneration method not found');
        }
    } catch (error) {
        console.error('❌ Error calling checkSegmentGeneration:', error);
    }

    // Check 8: Manual Enemy Creation Test
    console.log('🧪 Testing manual enemy creation...');
    try {
        if (worldManager && typeof worldManager.createEnemy === 'function') {
            const testEnemy = worldManager.createEnemy(0, 999, false);
            if (testEnemy) {
                console.log('✅ Manual enemy created:', testEnemy);
                worldManager.enemies.push(testEnemy);
            } else {
                console.log('❌ Manual enemy creation failed');
            }
        }
    } catch (error) {
        console.error('❌ Error creating test enemy:', error);
    }

    console.log('🎮 Enemy Spawning Debug - Diagnostics complete!');
    console.log('💡 If no enemies visible, try moving the camera further right (scrollX > 500)');
})();





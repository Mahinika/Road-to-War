/**
 * Hero Visibility Debugger - Bookmarklet Version
 * 
 * To use:
 * 1. Copy the code below (starting with javascript:)
 * 2. Create a new bookmark in your browser
 * 3. Paste the code as the bookmark URL
 * 4. When the game is running, click the bookmark to open the debugger
 */

javascript:(function(){
    if (!window.gameScene) {
        alert('Game scene not found! Make sure the game is loaded and GameScene is active.');
        return;
    }
    
    const scene = window.gameScene;
    const results = [];
    
    // Check 1: Hero Sprites
    if (scene.partyMemberSprites && scene.partyMemberSprites.length === 5) {
        results.push('✅ Hero Count: 5 heroes found');
    } else {
        results.push(`❌ Hero Count: Found ${scene.partyMemberSprites?.length || 0} heroes (expected 5)`);
    }
    
    // Check 2: Visibility
    let visibleCount = 0;
    scene.partyMemberSprites?.forEach((pm, i) => {
        if (pm.sprite && pm.sprite.visible && pm.sprite.active) {
            visibleCount++;
        }
    });
    results.push(`${visibleCount === 5 ? '✅' : '❌'} Visibility: ${visibleCount}/5 heroes visible and active`);
    
    // Check 3: Camera
    const camera = scene.cameras?.main;
    if (camera) {
        results.push(`✅ Camera: At (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`);
    } else {
        results.push('❌ Camera: Not found');
    }
    
    // Check 4: Positions
    const positions = scene.partyMemberSprites?.map(pm => ({
        x: pm.sprite?.x || 0,
        y: pm.sprite?.y || 0,
        id: pm.hero?.id || 'unknown'
    })) || [];
    
    console.log('=== Hero Visibility Diagnostic ===');
    results.forEach(r => console.log(r));
    
    console.log('\n=== Hero Details ===');
    scene.partyMemberSprites?.forEach((pm, i) => {
        const sprite = pm.sprite;
        if (!sprite) {
            console.log(`Hero ${i}: NO SPRITE`);
            return;
        }
        const tint = sprite.tintTopLeft || sprite.tint || 0;
        const tintHex = '0x' + tint.toString(16).padStart(6, '0').toUpperCase();
        const isWhite = tint === 0xFFFFFF || tint === 16777215;
        
        console.log(`Hero ${i} (${pm.hero?.id || 'unknown'}):`, {
            position: { x: sprite.x, y: sprite.y },
            visible: sprite.visible,
            active: sprite.active,
            alpha: sprite.alpha,
            tint: tintHex + (isWhite ? ' ⚠️ WHITE!' : ''),
            depth: sprite.depth,
            texture: sprite.texture?.key || 'N/A'
        });
    });
    
    // Camera bounds check
    if (camera) {
        const viewport = {
            left: camera.scrollX,
            right: camera.scrollX + camera.width,
            top: camera.scrollY,
            bottom: camera.scrollY + camera.height
        };
        
        console.log('\n=== Camera Viewport ===');
        console.log('Viewport:', viewport);
        
        scene.partyMemberSprites?.forEach((pm, i) => {
            const sprite = pm.sprite;
            if (!sprite) return;
            
            const inView = sprite.x >= viewport.left && 
                         sprite.x <= viewport.right &&
                         sprite.y >= viewport.top && 
                         sprite.y <= viewport.bottom;
            
            console.log(`Hero ${i} (${pm.hero?.id || 'unknown'}): ${inView ? '✓ IN VIEW' : '✗ OFF-SCREEN'}`);
        });
    }
    
    alert('Diagnostic complete! Check browser console (F12) for detailed results.');
})();


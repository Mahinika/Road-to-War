// Enhanced Hero & Camera Debugger
// Usage: const script = document.createElement('script'); script.src = '/inject-now.js'; document.body.appendChild(script);

(function() {
    if (!window.gameScene) {
        console.error('Game scene not found! Make sure the game is loaded.');
        return;
    }
    
    const existing = document.getElementById('hero-debugger-panel');
    if (existing) {
        existing.remove();
    }
    
    const scene = window.gameScene;
    let autoRefreshInterval = null;
    let visualOverlays = null;
    let isVisualMode = false;
    
    // Create debug panel
    const panel = document.createElement('div');
    panel.id = 'hero-debugger-panel';
    panel.style.cssText = 'position:fixed;top:10px;right:10px;background:#1e293b;color:white;padding:20px;border:2px solid #3b82f6;border-radius:8px;z-index:10000;max-width:600px;max-height:90vh;overflow-y:auto;font-family:system-ui;box-shadow:0 4px 6px rgba(0,0,0,0.3);';
    
    const header = document.createElement('h3');
    header.textContent = '🎮 Hero & Camera Debugger';
    header.style.marginTop = '0';
    panel.appendChild(header);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:#ef4444;padding:5px 10px;border:none;color:white;border-radius:3px;cursor:pointer;';
    closeBtn.onclick = () => {
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        if (visualOverlays) destroyVisualOverlays();
        panel.remove();
    };
    panel.appendChild(closeBtn);
    
    const results = document.createElement('div');
    results.id = 'debug-results';
    results.style.cssText = 'margin:10px 0;padding:10px;background:#0f172a;border-radius:5px;min-height:100px;max-height:400px;overflow-y:auto;font-size:12px;';
    panel.appendChild(results);
    
    function updateResults(html) {
        results.innerHTML = html;
        results.scrollTop = results.scrollHeight;
    }
    
    // Visual overlays on game canvas
    function createVisualOverlays() {
        if (visualOverlays) return;
        
        visualOverlays = {
            graphics: scene.add.graphics(),
            cameraRect: null,
            deadzoneRect: null,
            heroMarkers: [],
            followTargetMarker: null,
            partyBoundsRect: null
        };
        
        visualOverlays.graphics.setDepth(10000);
        visualOverlays.graphics.setScrollFactor(1); // Follow camera
        isVisualMode = true;
        updateVisualOverlays();
    }
    
    function updateVisualOverlays() {
        if (!visualOverlays || !isVisualMode) return;
        
        const g = visualOverlays.graphics;
        g.clear();
        
        const camera = scene.cameras?.main;
        if (!camera) return;
        
        // Draw in world coordinates (camera will transform automatically)
        const camWorldX = camera.scrollX;
        const camWorldY = camera.scrollY;
        const camWorldW = camera.width;
        const camWorldH = camera.height;
        
        // Draw camera viewport border (blue) - in world space
        g.lineStyle(3, 0x3b82f6, 0.8);
        g.strokeRect(camWorldX, camWorldY, camWorldW, camWorldH);
        g.fillStyle(0x3b82f6, 0.05);
        g.fillRect(camWorldX, camWorldY, camWorldW, camWorldH);
        
        // Draw deadzone (red) - centered in viewport
        if (cameraManager) {
            const deadzoneW = camWorldW * cameraManager.deadzoneWidth;
            const deadzoneH = camWorldH;
            const deadzoneX = camWorldX + (camWorldW - deadzoneW) / 2;
            const deadzoneY = camWorldY;
            g.lineStyle(2, 0xef4444, 0.6);
            g.strokeRect(deadzoneX, deadzoneY, deadzoneW, deadzoneH);
        }
        
        // Draw follow target marker (yellow circle)
        if (camera.followTarget) {
            const target = camera.followTarget;
            g.lineStyle(3, 0xfbbf24, 1);
            g.strokeCircle(target.x, target.y, 30);
            g.fillStyle(0xfbbf24, 0.3);
            g.fillCircle(target.x, target.y, 30);
        }
        
        // Draw hero positions (green/red circles)
        if (scene.partyMemberSprites) {
            scene.partyMemberSprites.forEach((pm, i) => {
                const sprite = pm.sprite;
                if (!sprite) return;
                
                const color = sprite.visible ? 0x10b981 : 0xef4444;
                g.lineStyle(2, color, 0.8);
                g.strokeCircle(sprite.x, sprite.y, 25);
                g.fillStyle(color, 0.2);
                g.fillCircle(sprite.x, sprite.y, 25);
            });
        }
        
        // Draw party bounds (cyan rectangle)
        if (cameraManager) {
            const bounds = cameraManager.calculatePartyBounds();
            if (bounds) {
                g.lineStyle(2, 0x06b6d4, 0.6);
                g.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
                
                // Center point
                g.fillStyle(0x06b6d4, 0.8);
                g.fillCircle(bounds.centerX, bounds.centerY, 5);
            }
        }
    }
    
    function destroyVisualOverlays() {
        if (visualOverlays) {
            if (visualOverlays.graphics) {
                visualOverlays.graphics.destroy();
            }
            visualOverlays = null;
            isVisualMode = false;
        }
    }
    
    const cameraManager = scene.cameraManager;
    
    function runDiagnostic() {
        if (!scene) {
            updateResults('<p style="color:#ef4444;">Game scene not found!</p>');
            return;
        }
        
        const checks = [];
        const heroCount = scene.partyMemberSprites?.length || 0;
        checks.push({name: 'Hero Count', status: heroCount === 5 ? 'pass' : 'fail', message: `Found ${heroCount} heroes (expected 5)`});
        
        let visibleCount = 0;
        scene.partyMemberSprites?.forEach((pm) => {
            if (pm.sprite && pm.sprite.visible && pm.sprite.active) visibleCount++;
        });
        checks.push({name: 'Visibility', status: visibleCount === 5 ? 'pass' : 'fail', message: `${visibleCount}/5 heroes visible and active`});
        
        const camera = scene.cameras?.main;
        if (camera) {
            checks.push({name: 'Camera', status: 'pass', message: `At (${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)})`});
        } else {
            checks.push({name: 'Camera', status: 'fail', message: 'Camera not found'});
        }
        
        const textureExists = scene.textures?.exists('hero-sprite');
        checks.push({name: 'Texture', status: textureExists ? 'pass' : 'fail', message: textureExists ? 'Hero texture exists' : 'Hero texture missing!'});
        
        // Camera Manager checks
        if (cameraManager) {
            checks.push({name: 'CameraManager', status: 'pass', message: 'CameraManager found'});
            if (cameraManager.initialized) {
                checks.push({name: 'Camera Init', status: 'pass', message: 'Camera initialized'});
            } else {
                checks.push({name: 'Camera Init', status: 'fail', message: 'Camera NOT initialized!'});
            }
        } else {
            checks.push({name: 'CameraManager', status: 'fail', message: 'CameraManager not found!'});
        }
        
        // Camera follow status
        if (camera) {
            if (camera.followTarget) {
                const target = camera.followTarget;
                checks.push({name: 'Follow Target', status: 'pass', message: `Following: ${target.texture?.key || 'unknown'} at (${target.x.toFixed(0)}, ${target.y.toFixed(0)})`});
            } else {
                checks.push({name: 'Follow Target', status: 'fail', message: 'No follow target set!'});
            }
        }
        
        let html = '<h4 style="margin-top:0;">Diagnostic Results:</h4>';
        checks.forEach(check => {
            const color = check.status === 'pass' ? '#10b981' : '#ef4444';
            const icon = check.status === 'pass' ? '✅' : '❌';
            html += `<p style="color:${color};margin:2px 0;">${icon} <strong>${check.name}:</strong> ${check.message}</p>`;
        });
        
        // Camera details
        if (camera && cameraManager) {
            html += '<h4>Camera Details:</h4>';
            html += `<p style="font-size:11px;margin:2px 0;">Scroll: (${camera.scrollX.toFixed(1)}, ${camera.scrollY.toFixed(1)})</p>`;
            html += `<p style="font-size:11px;margin:2px 0;">Viewport: ${camera.width} × ${camera.height}</p>`;
            html += `<p style="font-size:11px;margin:2px 0;">Follow Offset: (${camera.followOffsetX?.toFixed(1) || 0}, ${camera.followOffsetY?.toFixed(1) || 0})</p>`;
            html += `<p style="font-size:11px;margin:2px 0;">Deadzone: ${(cameraManager.deadzoneWidth * 100).toFixed(0)}% width</p>`;
            html += `<p style="font-size:11px;margin:2px 0;">Smooth Lerp: ${cameraManager.smoothLerp}</p>`;
            html += `<p style="font-size:11px;margin:2px 0;">Party Padding: ${cameraManager.partyPadding}px</p>`;
        }
        
        // Hero details
        html += '<h4>Hero Details:</h4><pre style="font-size:10px;max-height:150px;overflow-y:auto;margin:5px 0;">';
        scene.partyMemberSprites?.forEach((pm, i) => {
            const sprite = pm.sprite;
            if (!sprite) {
                html += `Hero ${i}: NO SPRITE\n`;
                return;
            }
            const tint = sprite.tintTopLeft || sprite.tint || 0;
            const tintHex = '0x' + tint.toString(16).padStart(6, '0').toUpperCase();
            const camera = scene.cameras?.main;
            const inView = camera ? (sprite.x >= camera.scrollX && sprite.x <= camera.scrollX + camera.width && sprite.y >= camera.scrollY && sprite.y <= camera.scrollY + camera.height) : false;
            html += `Hero ${i} (${pm.hero?.id || 'unknown'}):\n`;
            html += `  Position: (${sprite.x.toFixed(0)}, ${sprite.y.toFixed(0)}) ${inView ? '✓' : '✗'}\n`;
            html += `  Visible: ${sprite.visible}, Active: ${sprite.active}, Alpha: ${sprite.alpha.toFixed(2)}\n`;
            html += `  Tint: ${tintHex}, Depth: ${sprite.depth}\n`;
            if (sprite.body) {
                html += `  Velocity: (${sprite.body.velocity?.x?.toFixed(1) || 0}, ${sprite.body.velocity?.y?.toFixed(1) || 0})\n`;
            }
            html += `\n`;
        });
        html += '</pre>';
        
        // Party bounds
        if (cameraManager) {
            const bounds = cameraManager.calculatePartyBounds();
            if (bounds) {
                html += '<h4>Party Bounds:</h4>';
                html += `<p style="font-size:11px;margin:2px 0;">Min: (${bounds.minX.toFixed(0)}, ${bounds.minY.toFixed(0)})</p>`;
                html += `<p style="font-size:11px;margin:2px 0;">Max: (${bounds.maxX.toFixed(0)}, ${bounds.maxY.toFixed(0)})</p>`;
                html += `<p style="font-size:11px;margin:2px 0;">Center: (${bounds.centerX.toFixed(0)}, ${bounds.centerY.toFixed(0)})</p>`;
                html += `<p style="font-size:11px;margin:2px 0;">Size: ${bounds.width.toFixed(0)} × ${bounds.height.toFixed(0)}</p>`;
            }
        }
        
        updateResults(html);
        
        if (isVisualMode) {
            updateVisualOverlays();
        }
        
        console.log('=== Hero Visibility Diagnostic ===');
        checks.forEach(c => console.log(`${c.status === 'pass' ? '✅' : '❌'} ${c.name}: ${c.message}`));
    }
    
    const diagnosticBtn = document.createElement('button');
    diagnosticBtn.textContent = '🔍 Run Diagnostic';
    diagnosticBtn.style.cssText = 'background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;display:block;width:100%;';
    diagnosticBtn.onclick = runDiagnostic;
    panel.appendChild(diagnosticBtn);
    
    // Auto-refresh toggle
    const autoRefreshBtn = document.createElement('button');
    autoRefreshBtn.textContent = '🔄 Auto-Refresh OFF';
    autoRefreshBtn.style.cssText = 'background:#6b7280;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;display:block;width:100%;';
    let autoRefreshActive = false;
    autoRefreshBtn.onclick = () => {
        autoRefreshActive = !autoRefreshActive;
        if (autoRefreshActive) {
            autoRefreshBtn.textContent = '🔄 Auto-Refresh ON (1s)';
            autoRefreshBtn.style.background = '#10b981';
            autoRefreshInterval = setInterval(runDiagnostic, 1000);
        } else {
            autoRefreshBtn.textContent = '🔄 Auto-Refresh OFF';
            autoRefreshBtn.style.background = '#6b7280';
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }
    };
    panel.appendChild(autoRefreshBtn);
    
    // Visual overlays toggle
    const visualBtn = document.createElement('button');
    visualBtn.textContent = '👁️ Visual Overlays OFF';
    visualBtn.style.cssText = 'background:#6b7280;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;display:block;width:100%;';
    visualBtn.onclick = () => {
        isVisualMode = !isVisualMode;
        if (isVisualMode) {
            visualBtn.textContent = '👁️ Visual Overlays ON';
            visualBtn.style.background = '#10b981';
            createVisualOverlays();
            // Update overlays every frame
            scene.events.on('update', updateVisualOverlays);
        } else {
            visualBtn.textContent = '👁️ Visual Overlays OFF';
            visualBtn.style.background = '#6b7280';
            scene.events.off('update', updateVisualOverlays);
            destroyVisualOverlays();
        }
    };
    panel.appendChild(visualBtn);
    
    const forceBtn = document.createElement('button');
    forceBtn.textContent = '👁️ Force All Visible';
    forceBtn.style.cssText = 'background:#10b981;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;display:block;width:100%;';
    forceBtn.onclick = () => {
        if (!scene) return;
        let count = 0;
        scene.partyMemberSprites?.forEach((pm) => {
            if (pm.sprite) {
                pm.sprite.setVisible(true);
                pm.sprite.setActive(true);
                pm.sprite.setAlpha(1.0);
                count++;
            }
        });
        updateResults(`<p style="color:#10b981;">✅ Forced ${count} heroes visible!</p>`);
        console.log(`Forced ${count} heroes visible`);
        if (autoRefreshActive) runDiagnostic();
    };
    panel.appendChild(forceBtn);
    
    // Camera controls
    const cameraControlsDiv = document.createElement('div');
    cameraControlsDiv.style.cssText = 'margin:10px 0;padding:10px;background:#0f172a;border-radius:5px;';
    cameraControlsDiv.innerHTML = '<h4 style="margin-top:0;">Camera Controls:</h4>';
    
    // Reset camera follow
    const resetFollowBtn = document.createElement('button');
    resetFollowBtn.textContent = '📷 Reset Camera Follow';
    resetFollowBtn.style.cssText = 'background:#f59e0b;color:white;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;margin:3px;width:48%;';
    resetFollowBtn.onclick = () => {
        if (cameraManager && scene.hero) {
            cameraManager.setFollowTarget(scene.hero);
            updateResults('<p style="color:#10b981;">✅ Camera follow reset!</p>');
            console.log('Camera follow reset');
            if (autoRefreshActive) runDiagnostic();
        }
    };
    cameraControlsDiv.appendChild(resetFollowBtn);
    
    // Stop camera follow
    const stopFollowBtn = document.createElement('button');
    stopFollowBtn.textContent = '⏹️ Stop Follow';
    stopFollowBtn.style.cssText = 'background:#ef4444;color:white;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;margin:3px;width:48%;';
    stopFollowBtn.onclick = () => {
        const camera = scene.cameras?.main;
        if (camera) {
            camera.stopFollow();
            updateResults('<p style="color:#f59e0b;">⏸️ Camera follow stopped!</p>');
            console.log('Camera follow stopped');
            if (autoRefreshActive) runDiagnostic();
        }
    };
    cameraControlsDiv.appendChild(stopFollowBtn);
    
    panel.appendChild(cameraControlsDiv);
    
    const logBtn = document.createElement('button');
    logBtn.textContent = '📋 Log Full State';
    logBtn.style.cssText = 'background:#8b5cf6;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;display:block;width:100%;';
    logBtn.onclick = () => {
        if (!scene) return;
        console.log('=== Full Game State ===');
        console.log('Scene:', scene);
        console.log('Camera:', scene.cameras?.main);
        console.log('CameraManager:', cameraManager);
        console.log('Hero:', scene.hero);
        console.log('Party Sprites:', scene.partyMemberSprites);
        
        const camera = scene.cameras?.main;
        if (camera) {
            console.log('Camera Properties:', {
                scrollX: camera.scrollX,
                scrollY: camera.scrollY,
                width: camera.width,
                height: camera.height,
                followTarget: camera.followTarget,
                followOffsetX: camera.followOffsetX,
                followOffsetY: camera.followOffsetY,
                deadzone: camera.deadzone
            });
        }
        
        if (cameraManager) {
            console.log('CameraManager Properties:', {
                initialized: cameraManager.initialized,
                primaryHero: cameraManager.primaryHero,
                smoothLerp: cameraManager.smoothLerp,
                deadzoneWidth: cameraManager.deadzoneWidth,
                partyPadding: cameraManager.partyPadding
            });
        }
        
        scene.partyMemberSprites?.forEach((pm, i) => {
            const sprite = pm.sprite;
            if (!sprite) {
                console.log(`Hero ${i}: NO SPRITE`);
                return;
            }
            const tint = sprite.tintTopLeft || sprite.tint || 0;
            const tintHex = '0x' + tint.toString(16).padStart(6, '0').toUpperCase();
            console.log(`Hero ${i} (${pm.hero?.id || 'unknown'}):`, {
                position: { x: sprite.x, y: sprite.y },
                visible: sprite.visible,
                active: sprite.active,
                alpha: sprite.alpha,
                tint: tintHex,
                depth: sprite.depth,
                texture: sprite.texture?.key || 'N/A',
                body: sprite.body ? {
                    velocity: { x: sprite.body.velocity?.x || 0, y: sprite.body.velocity?.y || 0 },
                    position: { x: sprite.body.x, y: sprite.body.y }
                } : null
            });
        });
        
        updateResults('<p style="color:#3b82f6;">Full state logged to console (F12)</p>');
    };
    panel.appendChild(logBtn);
    
    const clearTintBtn = document.createElement('button');
    clearTintBtn.textContent = '🎨 Clear All Tints';
    clearTintBtn.style.cssText = 'background:#ec4899;color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;margin:5px;display:block;width:100%;';
    clearTintBtn.onclick = () => {
        if (!scene) return;
        let count = 0;
        scene.partyMemberSprites?.forEach((pm) => {
            if (pm.sprite) {
                pm.sprite.clearTint();
                count++;
            }
        });
        updateResults(`<p style="color:#10b981;">✅ Cleared tints from ${count} heroes!</p>`);
    };
    panel.appendChild(clearTintBtn);
    
    document.body.appendChild(panel);
    
    // Initial diagnostic
    setTimeout(() => {
        runDiagnostic();
    }, 500);
    
    console.log('Enhanced Hero & Camera Debugger injected!');
})();

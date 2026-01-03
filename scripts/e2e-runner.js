import cp from 'child_process';
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';

const VITE_URL = process.env.VITE_URL || 'http://localhost:5173';

function waitForServer(url, timeout = 20000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        (function ping() {
            http.get(url, res => {
                resolve();
            }).on('error', () => {
                if (Date.now() - start > timeout) return reject(new Error('Server did not start in time'));
                setTimeout(ping, 250);
            });
        })();
    });
}

function waitForUrlFromStdout(childProc, timeout = 20000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const onData = (chunk) => {
            // Strip ANSI color codes that Vite may include in stdout
            let text = String(chunk).replace(/\x1B\[[0-9;]*m/g, '');
            // Trim surrounding control characters and whitespace
            text = text.trim();
            // Match any http(s) URL in the stdout chunk
            const m = text.match(/(https?:\/\/[^\s]+)/);
            if (m && m[1]) {
                cleanup();
                // Ensure returned URL has no stray ANSI or control chars
                const url = m[1].replace(/\x1B\[[0-9;]*m/g, '').trim();
                resolve(url);
            }
        };

        const onError = () => {
            if (Date.now() - start > timeout) {
                cleanup();
                reject(new Error('Timeout waiting for server URL in stdout'));
            }
        };

        function cleanup() {
            childProc.stdout.off('data', onData);
            clearInterval(interval);
        }

        childProc.stdout.on('data', onData);
        const interval = setInterval(onError, 500);
    });
}

async function run() {
    console.log('[e2e-runner] Starting Vite dev server...');
    const dev = cp.spawn('npm', ['run', 'dev'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });

    dev.stdout.on('data', d => process.stdout.write(`[vite] ${d}`));
    dev.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));

    try {
        // Try to parse the server URL from Vite stdout (handles dynamic ports)
        let serverUrl;
        try {
            serverUrl = await waitForUrlFromStdout(dev, 15000);
            console.log('[e2e-runner] Detected dev server URL from stdout:', serverUrl);
        } catch (err) {
            console.log('[e2e-runner] Could not detect URL from stdout, falling back to default:', VITE_URL);
            serverUrl = VITE_URL;
        }

        await waitForServer(serverUrl, 15000);
        console.log('[e2e-runner] Vite server reachable, launching browser...');

        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

        await page.goto(serverUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for a canvas (Phaser) to be present
        try {
            await page.waitForFunction(() => !!document.querySelector('canvas'), { timeout: 30000 });
        } catch (e) {}

        // If the game shows a main menu, try to click the "Start Game" button by invoking its pointer handler.
        // This finds the `MainScene` and emits a 'pointerdown' on the Text object labeled 'Start Game'.
        try {
            // Wait for the MainScene Text labeled 'Start' to appear (up to 10s)
            await page.waitForFunction(() => {
                try {
                    const g = window.game;
                    if (!g || !g.scene || !g.scene.getScene) return false;
                    const main = g.scene.getScene('MainScene');
                    if (!main || !main.children || !main.children.list) return false;
                    return main.children.list.some(c => c && c.type === 'Text' && typeof c.text === 'string' && c.text.includes('Start'));
                } catch (e) { return false; }
            }, { timeout: 10000 });

            const startResult = await page.evaluate(() => {
                try {
                    const game = window.game;
                    const main = game.scene.getScene('MainScene');
                    const start = main.children.list.find(c => c && c.type === 'Text' && typeof c.text === 'string' && c.text.includes('Start'));
                    if (start) {
                        try { start.emit('pointerdown'); } catch (e) { try { start.emit('pointerdown', {}); } catch (e2) {} }
                        return { ok: true };
                    }
                    return { ok: false, reason: 'no-start-after-wait' };
                } catch (err) {
                    return { ok: false, error: String(err) };
                }
            });

            console.log('[e2e-runner] Start button click result:', startResult);
            await page.waitForTimeout(500);
        } catch (err) {
            console.log('[e2e-runner] Failed to find/trigger Start button within timeout:', String(err));
        }

        // After starting, auto-complete character creation by calling autoGenerateParty + confirmParty
        try {
            await page.waitForFunction(() => {
                try {
                    const g = window.game;
                    return !!(g && g.scene && g.scene.getScene && g.scene.getScene('CharacterCreationScene'));
                } catch (e) { return false; }
            }, { timeout: 10000 });

            const created = await page.evaluate(() => {
                try {
                    const scene = window.game.scene.getScene('CharacterCreationScene');
                    if (!scene) return { ok: false, reason: 'no-character-scene' };

                    const classesData = scene.cache.json.get('classes');
                    const specializationsData = scene.cache.json.get('specializations');
                    const roles = [
                        { id: 'tank', name: 'Tank' },
                        { id: 'healer', name: 'Healer' },
                        { id: 'dps1', name: 'DPS #1' },
                        { id: 'dps2', name: 'DPS #2' },
                        { id: 'dps3', name: 'DPS #3' }
                    ];

                    try {
                        if (typeof scene.autoGenerateParty === 'function') {
                            scene.autoGenerateParty(classesData, specializationsData, roles);
                        }
                    } catch (e) {}

                    // Wait a tick then confirm
                    try { scene.time.delayedCall(200, () => { try { scene.confirmParty(); } catch (e) {} }); } catch (e) { try { scene.confirmParty(); } catch (e2) {} }

                    return { ok: true };
                } catch (err) {
                    return { ok: false, error: String(err) };
                }
            });

            console.log('[e2e-runner] Auto-generate+confirm result:', created);
        } catch (err) {
            console.log('[e2e-runner] Failed to auto-complete character creation:', String(err));
        }

        // Diagnostic: inspect GameScene registry directly after starting
        try {
            const postStartDiag = await page.evaluate(() => {
                try {
                    const g = window.game;
                    const gameScene = g && g.scene && g.scene.getScene ? g.scene.getScene('GameScene') : null;
                    const registryKeys = [];
                    let hasParty = false;
                    if (gameScene && gameScene.registry) {
                        try {
                            const keys = gameScene.registry.getKeys ? gameScene.registry.getKeys() : Object.keys(gameScene.registry.values || {});
                            keys.forEach(k => registryKeys.push(k));
                            try { hasParty = !!gameScene.registry.get('partyManager'); } catch (e) { hasParty = false; }
                        } catch (e) {}
                    }
                    return { hasGameScene: !!gameScene, registryKeys, hasParty };
                } catch (err) { return { error: String(err) }; }
            });
            console.log('[e2e-runner] Post-start GameScene diag:', JSON.stringify(postStartDiag));
        } catch (e) {
            console.log('[e2e-runner] Post-start diag failed:', String(e));
        }

        // Force-inject a minimal party if none present to ensure GameScene initializes party
        try {
            const injected = await page.evaluate(() => {
                try {
                    const game = window.game;
                    if (!game || !game.registry) return { ok: false, reason: 'no-game' };

                    const makeHero = (id, role, cls) => ({ id, name: id, class: cls || 'paladin', specialization: 'default', role, level: 1, experience: 0, stats: { health: 100 }, baseStats: { maxHealth: 100 } });
                    const heroes = [
                        makeHero('hero_tank', 'tank', 'paladin'),
                        makeHero('hero_healer', 'healer', 'priest'),
                        makeHero('hero_dps1', 'dps', 'mage'),
                        makeHero('hero_dps2', 'dps', 'rogue'),
                        makeHero('hero_dps3', 'dps', 'hunter')
                    ];

                    game.registry.set('partyData', { heroes });
                    try { game.scene.start('GameScene'); } catch (e) {}
                    return { ok: true };
                } catch (err) { return { ok: false, error: String(err) }; }
            });
            console.log('[e2e-runner] Forced party injection result:', injected);
        } catch (e) {
            console.log('[e2e-runner] Party injection failed:', String(e));
        }

        // Wait for gameScene to be exposed (the actual game world scene)
        await page.waitForFunction(() => !!window.gameScene && !!window.gameScene.partyHelper, { timeout: 60000 });
        console.log('[e2e-runner] gameScene found');

        // Optionally enable debug markers and freeze heroes for deterministic capture
        await page.evaluate(() => {
            try { window.gameScene.registry.set('debug_show_heroes', true); } catch (e) {}
            try { window.gameScene.registry.set('freeze_heroes', true); } catch (e) {}
            try { window.gameScene.registry.set('camera_static', true); } catch (e) {}
        });

        // Give a moment for changes to apply
        await page.waitForTimeout(500);

        // Collect detailed scene internals: registry, partyManager, children
        const stats = await page.evaluate(() => {
            try {
                const scene = window.gameScene;
                const helper = scene.partyHelper;
                const cam = scene.cameras.main;
                const party = scene.partyMemberSprites || [];
                const spriteList = party.map(pm => ({ id: pm.hero?.id, x: pm.sprite?.x, y: pm.sprite?.y, visible: !!pm.sprite?.visible, depth: pm.sprite?.depth }));

                // Registry keys snapshot
                const registry = {};
                try {
                    const keys = scene.registry.getKeys ? scene.registry.getKeys() : Object.keys(scene.registry.values || {});
                    keys.forEach(k => { try { registry[k] = scene.registry.get(k); } catch (e) { registry[k] = String(e); } });
                } catch (e) {}

                // partyManager heroes summary if available
                let partyManagerSummary = null;
                try {
                    const pm = scene.partyManager;
                    if (pm) {
                        const heroes = (pm.getHeroes ? pm.getHeroes() : []).map(h => ({ id: h.id, classId: h.classId, role: h.role, x: h.x, y: h.y }));
                        partyManagerSummary = { size: pm.getSize ? pm.getSize() : (heroes.length || 0), heroes };
                    }
                } catch (e) {}

                // Scene children overview
                const children = scene.children && scene.children.list ? scene.children.list.map(c => ({ type: c.type, x: c.x, y: c.y, visible: !!c.visible, depth: c.depth })) : [];

                return {
                    stats: helper ? helper.getPartySpriteStats() : { total: 0, visible: 0, active: 0, inScene: 0 },
                    camera: { scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height },
                    sprites: spriteList,
                    registry,
                    partyManager: partyManagerSummary,
                    childrenCount: children.length,
                    childrenSample: children.slice(0, 50)
                };
            } catch (err) {
                return { error: String(err) };
            }
        });

        console.log('[e2e-runner] Results:', JSON.stringify(stats, null, 2));
        fs.writeFileSync('e2e-results.json', JSON.stringify(stats, null, 2));

        // Take a screenshot
        const screenshotPath = 'e2e-screenshot.png';
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log('[e2e-runner] Screenshot saved to', screenshotPath);

        await browser.close();
    } catch (err) {
        console.error('[e2e-runner] Error:', err);
    } finally {
        // Kill dev server
        try { process.kill(-dev.pid); } catch (e) { try { dev.kill(); } catch (e) {} }
        console.log('[e2e-runner] Dev server stopped');
    }
}

run();

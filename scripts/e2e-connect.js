import { chromium } from 'playwright';
import fs from 'fs';

const VITE_URL = process.env.VITE_URL || 'http://localhost:3003';

async function run() {
    console.log('[e2e-connect] Target URL:', VITE_URL);
    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

        await page.goto(VITE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('[e2e-connect] Page loaded');

        // Wait for gameScene to be exposed
        await page.waitForFunction(() => !!window.gameScene && !!window.gameScene.partyHelper, { timeout: 60000 });
        console.log('[e2e-connect] gameScene found');

        // Enable debug markers and static camera to get deterministic capture
        await page.evaluate(() => {
            try { window.gameScene.registry.set('debug_show_heroes', true); } catch (e) {}
            try { window.gameScene.registry.set('freeze_heroes', true); } catch (e) {}
            try { window.gameScene.registry.set('camera_static', true); } catch (e) {}
        });

        await page.waitForTimeout(500);

        const stats = await page.evaluate(() => {
            const helper = window.gameScene.partyHelper;
            const cam = window.gameScene.cameras.main;
            const party = window.gameScene.partyMemberSprites || [];
            const spriteList = party.map(pm => ({ id: pm.hero?.id, x: pm.sprite?.x, y: pm.sprite?.y, visible: !!pm.sprite?.visible, depth: pm.sprite?.depth }));
            return {
                stats: helper.getPartySpriteStats(),
                camera: { scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height },
                sprites: spriteList
            };
        });

        console.log('[e2e-connect] Results:', JSON.stringify(stats, null, 2));
        fs.writeFileSync('e2e-connect-results.json', JSON.stringify(stats, null, 2));

        const screenshotPath = 'e2e-connect-screenshot.png';
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log('[e2e-connect] Screenshot saved to', screenshotPath);

        await browser.close();
    } catch (err) {
        console.error('[e2e-connect] Error:', err);
        process.exitCode = 2;
    }
}

run();

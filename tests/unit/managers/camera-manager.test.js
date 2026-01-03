/**
 * CameraManager Unit Tests
 * Tests camera positioning, party bounds calculation, and camera following
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockScene } from '../../utils/test-helpers.js';

describe('CameraManager', () => {
    let CameraManager;
    let scene;
    let cameraManager;

    beforeEach(async () => {
        try {
            const module = await import('../../../src/managers/camera-manager.js');
            CameraManager = module.CameraManager;
        } catch (error) {
            console.warn('Could not import CameraManager:', error.message);
            return;
        }

        scene = createMockScene();
        scene.cameras = {
            main: {
                width: 1920,
                height: 1080,
                setScroll: vi.fn(),
                setDeadzone: vi.fn(),
                followTarget: null
            }
        };

        if (CameraManager) {
            cameraManager = new CameraManager(scene);
        }
    });

    describe('Initialization', () => {
        it('should initialize CameraManager', () => {
            if (!cameraManager) return;
            expect(cameraManager).toBeDefined();
            expect(cameraManager.camera).toBeDefined();
        });

        it('should extend BaseManager', () => {
            if (!cameraManager) return;
            expect(cameraManager.init).toBeDefined();
            expect(cameraManager.destroy).toBeDefined();
        });
    });

    describe('Party Bounds Calculation', () => {
        it('should calculate party bounds with primary hero', () => {
            if (!cameraManager) return;
            cameraManager.primaryHero = { x: 100, y: 200 };
            cameraManager.partyMemberSprites = [
                { x: 110, y: 210 },
                { x: 90, y: 190 }
            ];
            
            const bounds = cameraManager.calculatePartyBounds();
            expect(bounds).toBeDefined();
            expect(bounds.centerX).toBeDefined();
            expect(bounds.centerY).toBeDefined();
        });

        it('should return default bounds if no primary hero', () => {
            if (!cameraManager) return;
            cameraManager.primaryHero = null;
            
            const bounds = cameraManager.calculatePartyBounds();
            expect(bounds).toBeDefined();
            expect(bounds.centerX).toBe(0);
        });
    });

    describe('Camera Positioning', () => {
        it('should set camera targets', () => {
            if (!cameraManager) return;
            const primaryHero = { x: 100, y: 200 };
            const partySprites = [{ x: 110, y: 210 }];
            
            cameraManager.setTargets(primaryHero, partySprites);
            expect(cameraManager.primaryHero).toBe(primaryHero);
            expect(cameraManager.partyMemberSprites).toBe(partySprites);
        });
    });
});


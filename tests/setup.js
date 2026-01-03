/**
 * Vitest setup file for Phaser 3 testing
 * Provides mocks and utilities for testing game components
 */

import { vi } from 'vitest';

// Mock Phaser FIRST - before ANY Phaser imports happen
vi.mock('phaser', () => {
  const MockScene = class {
    constructor(config) {
      this.key = config?.key || 'TestScene';
      this.scene = this;
      this.cache = {
        json: {
          get: vi.fn((key) => ({})),
          add: vi.fn(),
          exists: vi.fn(() => true)
        }
      };
      this.events = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        once: vi.fn()
      };
      this.input = {
        keyboard: {
          on: vi.fn(),
          off: vi.fn(),
          createCursorKeys: vi.fn(() => ({
            left: { isDown: false },
            right: { isDown: false },
            up: { isDown: false },
            down: { isDown: false }
          }))
        },
        mouse: {
          on: vi.fn(),
          off: vi.fn()
        }
      };
      this.time = {
        addEvent: vi.fn(),
        delayedCall: vi.fn(),
        delta: 16,
        deltaMS: 16,
        timeScale: 1.0,
        now: Date.now()
      };
      this.add = {
        graphics: vi.fn(() => ({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          clear: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        text: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setText: vi.fn().mockReturnThis(),
          setStyle: vi.fn().mockReturnThis(),
          setFill: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        rectangle: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setStrokeStyle: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        container: vi.fn(() => ({
          add: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setScrollFactor: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        }))
      };
      this.scale = {
        width: 1280,
        height: 720,
        gameSize: { width: 1280, height: 720 }
      };
      this.cameras = {
        main: {
          width: 1280,
          height: 720,
          shake: vi.fn(),
          setBounds: vi.fn(),
          startFollow: vi.fn(),
          setScroll: vi.fn(),
          scrollX: 0,
          scrollY: 0
        }
      };
      this.anims = {
        exists: vi.fn(() => true),
        play: vi.fn(),
        get: vi.fn(() => ({
          frames: [{}]
        }))
      };
      this.registry = {
        get: vi.fn(),
        set: vi.fn()
      };
    }
  };

  return {
    default: MockScene,
    Scene: MockScene,
    GameObjects: {
      GameObject: class {},
      Sprite: class {},
      Container: class {},
      Text: class {}
    }
  };
});

// Provide browser globals for any code that checks them
if (typeof window === 'undefined') {
  global.window = {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    navigator: {
      userAgent: 'test-agent',
      platform: 'test-platform'
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
    cancelAnimationFrame: vi.fn(),
    performance: {
      now: () => Date.now()
    },
    // Mock localStorage
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    },
    // Mock Electron API
    electronAPI: {
      sendLog: vi.fn(),
      onLogResponse: vi.fn()
    }
  };
}

if (typeof document === 'undefined') {
  global.document = {
    createElement: vi.fn(() => ({
      getContext: vi.fn(() => ({
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn()
      })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
}

// Mock localStorage globally
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock Phaser globally for non-ESM usage
global.Phaser = {
  Scene: class MockScene {
    constructor(config) {
      this.key = config?.key || 'TestScene';
      this.scene = this;
      this.cache = {
        json: {
          get: vi.fn(() => ({})),
          add: vi.fn(),
          exists: vi.fn(() => true)
        }
      };
      this.events = {
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        once: vi.fn()
      };
      this.input = {
        keyboard: {
          on: vi.fn(),
          off: vi.fn(),
          createCursorKeys: vi.fn(() => ({
            left: { isDown: false },
            right: { isDown: false },
            up: { isDown: false },
            down: { isDown: false }
          }))
        },
        mouse: {
          on: vi.fn(),
          off: vi.fn()
        }
      };
      this.time = {
        addEvent: vi.fn(),
        delayedCall: vi.fn(),
        delta: 16,
        deltaMS: 16,
        timeScale: 1.0,
        now: Date.now()
      };
      this.add = {
        graphics: vi.fn(() => ({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          strokeRect: vi.fn().mockReturnThis(),
          clear: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        text: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setText: vi.fn().mockReturnThis(),
          setStyle: vi.fn().mockReturnThis(),
          setFill: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        rectangle: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setStrokeStyle: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        container: vi.fn(() => ({
          add: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setScrollFactor: vi.fn().mockReturnThis(),
          setVisible: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        }))
      };
      this.scale = {
        width: 1280,
        height: 720,
        gameSize: { width: 1280, height: 720 }
      };
      this.cameras = {
        main: {
          width: 1280,
          height: 720,
          shake: vi.fn(),
          setBounds: vi.fn(),
          startFollow: vi.fn(),
          setScroll: vi.fn(),
          scrollX: 0,
          scrollY: 0
        }
      };
      this.anims = {
        exists: vi.fn(() => true),
        play: vi.fn(),
        get: vi.fn(() => ({
          frames: [{}]
        }))
      };
      this.registry = {
        get: vi.fn(),
        set: vi.fn()
      };
    }
  },
  GameObjects: {
    GameObject: class {},
    Sprite: class {},
    Container: class {},
    Text: class {}
  }
};

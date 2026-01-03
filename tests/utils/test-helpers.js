import { vi } from 'vitest';

/**
 * Test utilities and helpers for game testing
 */

/**
 * Create a mock Phaser scene for testing
 * @returns {Object} Mock scene object
 */
export function createMockScene() {
  return {
    key: 'TestScene',
    scene: this,
    cache: {
      json: {
        get: (key) => {
          const mockData = {
            classes: {},
            specializations: {},
            talents: {},
            items: {},
            enemies: {},
            worldConfig: {
              experienceScaling: { maxLevel: 100 },
              player: { startingStats: {} },
              combat: { baseCombatSpeed: 1.0 }
            },
            statsConfig: {},
            bloodlines: {},
            'skill-gems': {},
            abilities: {}
          };
          return mockData[key] || {};
        },
        add: () => {},
        exists: () => true
      }
    },
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn()
    },
    input: {
      keyboard: {
        on: vi.fn(),
        off: vi.fn(),
        createCursorKeys: () => ({
          left: { isDown: false },
          right: { isDown: false },
          up: { isDown: false },
          down: { isDown: false }
        })
      }
    },
    time: {
      addEvent: vi.fn(),
      delayedCall: vi.fn(),
      removeAllEvents: vi.fn(),
      delta: 16,
      deltaMS: 16,
      timeScale: 1.0
    },
    add: {
      group: vi.fn().mockReturnValue({
        add: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        getMatching: vi.fn().mockReturnValue([]),
        getChildren: vi.fn().mockReturnValue([])
      }),
      sprite: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setScrollFactor: vi.fn().mockReturnThis(),
        play: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      image: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      circle: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      arc: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      graphics: vi.fn().mockReturnValue({
        fillStyle: vi.fn().mockReturnThis(),
        lineStyle: vi.fn().mockReturnThis(),
        clear: vi.fn().mockReturnThis(),
        beginPath: vi.fn().mockReturnThis(),
        rect: vi.fn().mockReturnThis(),
        fillPath: vi.fn().mockReturnThis(),
        strokePath: vi.fn().mockReturnThis(),
        generateTexture: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setStyle: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        setText: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      rectangle: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setStrokeStyle: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      container: vi.fn().mockReturnValue({
        add: vi.fn().mockReturnThis(),
        remove: vi.fn().mockReturnThis(),
        removeAll: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setScrollFactor: vi.fn().mockReturnThis(),
        setVisible: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      })
    },
    scale: {
      width: 1280,
      height: 720,
      gameSize: { width: 1280, height: 720 }
    },
    cameras: {
      main: {
        width: 1280,
        height: 720,
        shake: () => {},
        setBounds: () => {},
        startFollow: () => {}
      }
    },
    registry: {
      get: () => null,
      set: () => {}
    }
  };
}

/**
 * Create a mock party manager
 * @returns {Object} Mock party manager
 */
export function createMockPartyManager() {
  return {
    heroes: [
      { id: 'hero1', classId: 'paladin', specId: 'protection', level: 1, role: 'tank' },
      { id: 'hero2', classId: 'priest', specId: 'holy', level: 1, role: 'healer' },
      { id: 'hero3', classId: 'warrior', specId: 'arms', level: 1, role: 'dps' },
      { id: 'hero4', classId: 'mage', specId: 'arcane', level: 1, role: 'dps' },
      { id: 'hero5', classId: 'rogue', specId: 'combat', level: 1, role: 'dps' }
    ],
    getHeroes: function() { return this.heroes; },
    getTank: function() { return this.heroes.find(h => h.role === 'tank'); },
    getHealer: function() { return this.heroes.find(h => h.role === 'healer'); },
    getHeroByIndex: function(index) { return this.heroes[index]; },
    getSaveData: function() { return { heroes: this.heroes }; }
  };
}

/**
 * Create a mock hero object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock hero
 */
export function createMockHero(overrides = {}) {
  return {
    id: 'hero1',
    classId: 'paladin',
    specId: 'protection',
    level: 1,
    role: 'tank',
    baseStats: {
      strength: 20,
      agility: 15,
      stamina: 25,
      intellect: 10,
      spirit: 12,
      maxHealth: 100,
      health: 100
    },
    currentStats: {
      strength: 20,
      agility: 15,
      stamina: 25,
      intellect: 10,
      spirit: 12,
      maxHealth: 100,
      health: 100
    },
    equipment: {},
    talents: {},
    bloodlineId: null,
    ...overrides
  };
}

/**
 * Wait for async operations
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


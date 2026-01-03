import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { BaseManager } from './base-manager.js';

/**
 * Audio Manager - Handles all game audio and sound effects
 * Provides centralized audio control with volume settings and memory management
 */

export class AudioManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // AudioManager has no dependencies
    }

    constructor(scene, config = {}) {
        super(scene, config);
        
        // Audio state
        this.sounds = new Map();
        this.musicTracks = new Map();
        this.masterVolume = 0; // Disabled - no audio files available
        this.sfxVolume = 0; // Disabled - no audio files available
        this.musicVolume = 0; // Disabled - no audio files available
        
        // Audio context
        this.audioContext = null;
        this.currentMusic = null;
    }

    /**
     * Initialize the audio system
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        // Create audio context if available
        if (this.scene.sound && this.scene.sound.context) {
            this.audioContext = this.scene.sound.context;
            this.setupAudioListeners();
        }
        
        // Preload essential sounds
        this.createSoundEffects();
        
        // Create background music tracks
        this.createMusicTracks();
        
        // Load saved audio settings
        this.loadAudioSettings();
        
        Logger.info('AudioManager', 'Audio system initialized');
    }

    /**
     * Create sound effects for game events
     */
    createSoundEffects() {
        // Combat sounds
        this.createSound('combat_hit', () => this.createCombatHitSound());
        this.createSound('critical_hit', () => this.createCriticalHitSound());
        this.createSound('victory', () => this.createVictorySound());
        this.createSound('defeat', () => this.createDefeatSound());
        
        // Loot sounds
        this.createSound('loot_pickup', () => this.createLootPickupSound());
        this.createSound('gold_collect', () => this.createGoldCollectSound());
        
        // UI sounds
        this.createSound('button_click', () => this.createButtonClickSound());
        this.createSound('equip_item', () => this.createEquipSound());
        this.createSound('purchase', () => this.createPurchaseSound());
        this.createSound('error', () => this.createErrorSound());
        
        // Ambient sounds
        this.createSound('footstep', () => this.createFootstepSound());
        this.createSound('encounter', () => this.createEncounterSound());
        
        Logger.info('AudioManager', 'Sound effects created');
    }

    /**
     * Create a single sound effect
     * @param {string} key - Sound key
     * @param {Function} generator - Function to generate sound
     */
    createSound(key, generator) {
        if (!this.scene.sound) return;
        
        try {
            const sourceNode = generator.call(this);
            if (!sourceNode || !sourceNode.buffer) {
                Logger.warn('AudioManager', `Sound generator for ${key} returned invalid source`);
                return null;
            }
            
            const audioContext = this.audioContext;
            const initialVolume = this.sfxVolume * this.masterVolume;
            
            // Wrap the AudioBufferSourceNode with volume control
            const sound = {
                source: sourceNode,
                buffer: sourceNode.buffer,
                audioContext: audioContext,
                gainNode: null,
                volume: initialVolume,
                setVolume: function(vol) {
                    this.volume = vol;
                    if (this.gainNode) {
                        this.gainNode.gain.value = vol;
                    }
                },
                play: function(options = {}) {
                    if (!this.buffer || !this.audioContext) return;
                    
                    // Create new source for each playback (AudioBufferSourceNode can only be played once)
                    const newSource = this.audioContext.createBufferSource();
                    newSource.buffer = this.buffer;
                    
                    // Create gain node for volume control
                    const gainNode = this.audioContext.createGain();
                    gainNode.gain.value = this.volume;
                    
                    newSource.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    newSource.start(0);
                }
            };
            
            this.sounds.set(key, sound);
            
            return sound;
        } catch (error) {
            Logger.error('AudioManager', `Failed to create sound ${key}:`, error);
            return null;
        }
    }

    /**
     * Generate combat hit sound programmatically
     */
    createCombatHitSound() {
        // Create synthetic hit sound using Web Audio API
        if (!this.audioContext) return this.createBeepSound(200, 0.1);
        
        const duration = 0.15;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate hit sound with multiple harmonics
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            
            // Main hit frequency with decay
            const freq1 = 150 * Math.exp(-t * 5);
            const freq2 = 200 * Math.exp(-t * 8);
            const freq3 = 120 * Math.exp(-t * 12);
            
            // Combine harmonics with envelope
            const envelope = Math.exp(-t * 3);
            const noise = (Math.random() - 0.5) * 0.1 * envelope;
            
            data[i] = (freq1 * 0.5 + freq2 * 0.3 + freq3 * 0.2) * envelope + noise;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Generate critical hit sound
     */
    createCriticalHitSound() {
        if (!this.audioContext) return this.createBeepSound(400, 0.2);
        
        const duration = 0.3;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate sharp critical sound
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            
            // High frequency burst for critical
            const freq = 800 + Math.sin(t * Math.PI * 20) * 200;
            const envelope = Math.exp(-t * 2);
            const noise = (Math.random() - 0.5) * 0.2;
            
            data[i] = freq * envelope + noise;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Generate victory sound
     */
    createVictorySound() {
        if (!this.audioContext) return this.createBeepSound(523, 0.15);
        
        // Create ascending victory fanfare
        const duration = 0.8;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            
            // Triad chord for victory
            const freq1 = 523.25; // C5
            const freq2 = 659.25; // E5
            const freq3 = 783.99; // G5
            
            const envelope = Math.exp(-t * 4);
            const harmony = Math.sin(t * Math.PI * 4) * 0.3;
            
            data[i] = (freq1 + freq2 + freq3) / 3 * envelope + harmony;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Generate defeat sound
     */
    createDefeatSound() {
        if (!this.audioContext) return this.createBeepSound(100, 0.2);
        
        // Create descending defeat sound
        const duration = 0.6;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            
            // Descending frequency
            const freq = 300 * Math.exp(t * 3);
            const envelope = Math.exp(-t * 2);
            const noise = (Math.random() - 0.5) * 0.3;
            
            data[i] = freq * envelope + noise;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Generate loot pickup sound
     */
    createLootPickupSound() {
        if (!this.audioContext) return this.createBeepSound(880, 0.1);
        
        const duration = 0.2;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            
            // Sparkly pickup sound
            const freq = 880 + Math.sin(t * Math.PI * 10) * 440;
            const envelope = Math.exp(-t * 8);
            const noise = (Math.random() - 0.5) * 0.1;
            
            data[i] = freq * envelope + noise;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Generate gold collect sound
     */
    createGoldCollectSound() {
        if (!this.audioContext) return this.createBeepSound(1200, 0.15);
        
        const duration = 0.3;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            
            // Shimmering gold sound
            const freq = 1200 + Math.sin(t * Math.PI * 20) * 200;
            const envelope = Math.exp(-t * 6);
            const noise = (Math.random() - 0.5) * 0.05;
            
            data[i] = freq * envelope + noise;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Generate button click sound
     */
    createButtonClickSound() {
        return this.createBeepSound(1000, 0.05);
    }

    /**
     * Generate equipment equip sound
     */
    createEquipSound() {
        return this.createBeepSound(440, 0.08);
    }

    /**
     * Generate purchase sound
     */
    createPurchaseSound() {
        if (!this.audioContext) return this.createBeepSound(660, 0.1);
        
        // Create satisfying cha-ching sound
        const duration = 0.4;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            
            // Cash register sound effect
            const freq = 660 + Math.sin(t * Math.PI * 8) * 1320;
            const envelope = Math.exp(-t * 4);
            
            data[i] = freq * envelope * 0.3;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Generate error sound
     */
    createErrorSound() {
        return this.createBeepSound(200, 0.15);
    }

    /**
     * Generate footstep sound
     */
    createFootstepSound() {
        return this.createBeepSound(150, 0.05);
    }

    /**
     * Generate encounter sound
     */
    createEncounterSound() {
        return this.createBeepSound(300, 0.1);
    }

    /**
     * Create simple beep sound
     * @param {number} frequency - Frequency in Hz
     * @param {number} duration - Duration in seconds
     */
    createBeepSound(frequency, duration) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            const sample = Math.sin(2 * Math.PI * frequency * t);
            
            // Apply envelope
            const envelope = Math.exp(-t * 3);
            data[i] = sample * envelope * 0.3;
        }
        
        const sound = this.audioContext.createBufferSource();
        sound.buffer = buffer;
        sound.connect(this.audioContext.destination);
        
        return sound;
    }

    /**
     * Play a sound effect
     * @param {string} key - Sound key to play
     * @param {Object} options - Play options
     */
    playSound(key, options = {}) {
        const sound = this.sounds.get(key);
        if (!sound) {
            Logger.warn('AudioManager', `Sound not found: ${key}`);
            return;
        }
        
        // Apply volume settings
        const volume = options.volume !== undefined ? options.volume : this.sfxVolume;
        if (sound.setVolume) {
            sound.volume = volume * this.masterVolume;
            sound.setVolume(volume * this.masterVolume);
        }
        
        // Play the sound
        if (sound.play) {
            sound.play(options);
        } else if (sound.source && sound.source.start) {
            // Fallback for raw AudioBufferSourceNode
            sound.source.start(0);
        }
        
        Logger.debug('AudioManager', `Playing sound: ${key}`);
    }

    /**
     * Stop a sound
     * @param {string} key - Sound key to stop
     */
    stopSound(key) {
        const sound = this.sounds.get(key);
        if (sound) {
            sound.stop();
        }
    }

    /**
     * Create background music tracks
     */
    createMusicTracks() {
        // Create ambient background music for gameplay
        this.createMusic('gameplay', () => this.createGameplayMusic());
        this.createMusic('menu', () => this.createMenuMusic());
        this.createMusic('combat', () => this.createCombatMusic());
        
        Logger.info('AudioManager', 'Music tracks created');
    }

    /**
     * Create a music track
     * @param {string} key - Track key
     * @param {Function} generator - Function to generate music
     */
    createMusic(key, generator) {
        if (!this.audioContext) return;
        
        try {
            const track = generator.call(this);
            if (track) {
                this.musicTracks.set(key, track);
                
                // Set initial volume
                if (track.setVolume) {
                    track.setVolume(this.musicVolume * this.masterVolume);
                }
            }
            
            return track;
        } catch (error) {
            Logger.error('AudioManager', `Failed to create music track ${key}:`, error);
            return null;
        }
    }

    /**
     * Generate ambient gameplay music
     * Uses programmatic generation as placeholder until actual music files are added
     */
    createGameplayMusic() {
        if (!this.audioContext) return null;
        
        // Create a simple ambient loop
        const duration = 10; // 10 second loop
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate ambient background music
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            
            // Create a slow, ambient melody
            const baseFreq = 220; // A3
            const melody = Math.sin(2 * Math.PI * baseFreq * t) * 0.3 +
                          Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.2 +
                          Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.1;
            
            // Add subtle variation
            const variation = Math.sin(2 * Math.PI * 0.1 * t) * 0.05;
            
            data[i] = (melody + variation) * 0.15;
        }
        
        // Store buffer for looping
        const musicSource = {
            buffer: buffer,
            source: null,
            gainNode: null,
            isPlaying: false,
            setVolume: function(vol) {
                if (this.gainNode) {
                    this.gainNode.gain.value = vol;
                }
            },
            play: function() {
                if (this.isPlaying) return;
                this.isPlaying = true;
                this.startLoop();
            },
            stop: function() {
                if (this.source) {
                    this.source.stop();
                    this.source = null;
                }
                this.isPlaying = false;
            },
            startLoop: function() {
                if (!this.isPlaying) return;
                
                this.source = this.audioContext.createBufferSource();
                this.source.buffer = this.buffer;
                this.source.loop = true;
                
                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.value = this.musicVolume * this.masterVolume;
                
                this.source.connect(this.gainNode);
                this.gainNode.connect(this.audioContext.destination);
                
                this.source.start(0);
                
                // Restart loop when it ends (for browsers that don't support loop property)
                this.source.onended = () => {
                    if (this.isPlaying) {
                        this.startLoop();
                    }
                };
            }
        };
        
        musicSource.audioContext = this.audioContext;
        musicSource.musicVolume = this.musicVolume;
        musicSource.masterVolume = this.masterVolume;
        
        return musicSource;
    }

    /**
     * Generate menu music
     */
    createMenuMusic() {
        if (!this.audioContext) return null;
        
        const duration = 8;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            
            const baseFreq = 330; // E4
            const melody = Math.sin(2 * Math.PI * baseFreq * t) * 0.25 +
                          Math.sin(2 * Math.PI * baseFreq * 1.25 * t) * 0.15;
            
            data[i] = melody * 0.12;
        }
        
        const musicSource = {
            buffer: buffer,
            source: null,
            gainNode: null,
            isPlaying: false,
            setVolume: function(vol) {
                if (this.gainNode) {
                    this.gainNode.gain.value = vol;
                }
            },
            play: function() {
                if (this.isPlaying) return;
                this.isPlaying = true;
                this.startLoop();
            },
            stop: function() {
                if (this.source) {
                    this.source.stop();
                    this.source = null;
                }
                this.isPlaying = false;
            },
            startLoop: function() {
                if (!this.isPlaying) return;
                
                this.source = this.audioContext.createBufferSource();
                this.source.buffer = this.buffer;
                this.source.loop = true;
                
                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.value = this.musicVolume * this.masterVolume;
                
                this.source.connect(this.gainNode);
                this.gainNode.connect(this.audioContext.destination);
                
                this.source.start(0);
                
                this.source.onended = () => {
                    if (this.isPlaying) {
                        this.startLoop();
                    }
                };
            }
        };
        
        musicSource.audioContext = this.audioContext;
        musicSource.musicVolume = this.musicVolume;
        musicSource.masterVolume = this.masterVolume;
        
        return musicSource;
    }

    /**
     * Generate combat music
     */
    createCombatMusic() {
        if (!this.audioContext) return null;
        
        const duration = 6;
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            
            const baseFreq = 440; // A4
            const melody = Math.sin(2 * Math.PI * baseFreq * t) * 0.4 +
                          Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.3 +
                          Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.2;
            
            data[i] = melody * 0.2;
        }
        
        const musicSource = {
            buffer: buffer,
            source: null,
            gainNode: null,
            isPlaying: false,
            setVolume: function(vol) {
                if (this.gainNode) {
                    this.gainNode.gain.value = vol;
                }
            },
            play: function() {
                if (this.isPlaying) return;
                this.isPlaying = true;
                this.startLoop();
            },
            stop: function() {
                if (this.source) {
                    this.source.stop();
                    this.source = null;
                }
                this.isPlaying = false;
            },
            startLoop: function() {
                if (!this.isPlaying) return;
                
                this.source = this.audioContext.createBufferSource();
                this.source.buffer = this.buffer;
                this.source.loop = true;
                
                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.value = this.musicVolume * this.masterVolume;
                
                this.source.connect(this.gainNode);
                this.gainNode.connect(this.audioContext.destination);
                
                this.source.start(0);
                
                this.source.onended = () => {
                    if (this.isPlaying) {
                        this.startLoop();
                    }
                };
            }
        };
        
        musicSource.audioContext = this.audioContext;
        musicSource.musicVolume = this.musicVolume;
        musicSource.masterVolume = this.masterVolume;
        
        return musicSource;
    }

    /**
     * Play music track
     * @param {string} trackKey - Music track identifier
     * @param {Object} options - Play options
     */
    playMusic(trackKey, options = {}) {
        // Stop current music if any
        this.stopMusic();
        
        const track = this.musicTracks.get(trackKey);
        if (!track) {
            Logger.warn('AudioManager', `Music track not found: ${trackKey}`);
            return;
        }
        
        // Apply music volume
        if (track.setVolume) {
            track.setVolume(this.musicVolume * this.masterVolume);
        }
        
        // Set loop if specified
        if (options.loop !== false && track.setLoop) {
            track.setLoop(true);
        }
        
        // Play the track
        if (track.play) {
            track.play(options);
        }
        
        this.currentMusic = trackKey;
        
        Logger.debug('AudioManager', `Playing music: ${trackKey}`);
    }

    /**
     * Stop all music
     */
    stopMusic() {
        this.musicTracks.forEach(track => {
            if (track && track.stop) {
                track.stop();
            }
        });
        this.currentMusic = null;
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Set SFX volume
     * @param {number} volume - Volume level (0-1)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Set music volume
     * @param {number} volume - Volume level (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }

    /**
     * Update all sound volumes
     */
    updateAllVolumes() {
        // Update SFX volumes
        this.sounds.forEach(sound => {
            if (sound.setVolume) {
                sound.setVolume(this.sfxVolume * this.masterVolume);
            }
        });
        
        // Update music volumes
        this.musicTracks.forEach(track => {
            if (track && track.setVolume) {
                track.musicVolume = this.musicVolume;
                track.masterVolume = this.masterVolume;
                track.setVolume(this.musicVolume * this.masterVolume);
            }
        });
    }

    /**
     * Set up audio event listeners
     */
    setupAudioListeners() {
        // Listen for audio permission changes
        if (this.scene.events) {
            this.scene.events.on('audio_permission_change', (data) => {
                if (data.enabled) {
                    this.resumeAudio();
                } else {
                    this.pauseAudio();
                }
            });
        }
    }

    /**
     * Resume audio context
     */
    resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Pause audio context
     */
    pauseAudio() {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }

    /**
     * Get current audio settings
     * @returns {Object} - Current audio settings
     */
    getAudioSettings() {
        return {
            masterVolume: this.masterVolume,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume,
            enabled: this.audioContext ? this.audioContext.state !== 'suspended' : false
        };
    }

    /**
     * Load audio settings from save data
     */
    loadAudioSettings() {
        try {
            const saveData = localStorage.getItem('roadOfWarSave_recent');
            if (saveData) {
                const recent = JSON.parse(saveData);
                const slotData = localStorage.getItem(`roadOfWarSave_slot${recent.slot}`);
                if (slotData) {
                    const parsed = JSON.parse(slotData);
                    if (parsed.settings) {
                        this.masterVolume = parsed.settings.masterVolume ?? this.masterVolume;
                        this.sfxVolume = parsed.settings.sfxVolume ?? this.sfxVolume;
                        this.musicVolume = parsed.settings.musicVolume ?? this.musicVolume;
                        this.updateAllVolumes();
                    }
                }
            }
        } catch (error) {
            Logger.warn('AudioManager', 'Failed to load audio settings:', error);
        }
    }

    /**
     * Save audio settings to localStorage
     */
    saveAudioSettings() {
        try {
            const saveData = localStorage.getItem('roadOfWarSave_recent');
            if (saveData) {
                const recent = JSON.parse(saveData);
                const slotData = localStorage.getItem(`roadOfWarSave_slot${recent.slot}`);
                if (slotData) {
                    const parsed = JSON.parse(slotData);
                    if (!parsed.settings) {
                        parsed.settings = {};
                    }
                    parsed.settings.masterVolume = this.masterVolume;
                    parsed.settings.sfxVolume = this.sfxVolume;
                    parsed.settings.musicVolume = this.musicVolume;
                    localStorage.setItem(`roadOfWarSave_slot${recent.slot}`, JSON.stringify(parsed));
                }
            }
        } catch (error) {
            Logger.warn('AudioManager', 'Failed to save audio settings:', error);
        }
    }

    /**
     * Clean up audio manager
     */
    destroy() {
        // Stop all sounds
        this.sounds.forEach(sound => {
            if (sound.stop) {
                sound.stop();
            }
            if (sound.destroy) {
                sound.destroy();
            }
        });
        
        // Stop all music
        this.stopMusic();
        
        // Clean up references
        this.sounds.clear();
        this.musicTracks.clear();
        this.audioContext = null;
        
        Logger.debug('AudioManager', 'Destroyed');
    }
}

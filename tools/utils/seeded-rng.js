/**
 * Seeded Random Number Generator
 * Provides deterministic random number generation for reproducible asset generation
 */

export class SeededRNG {
    constructor(seed = 12345) {
        this.seed = seed;
        this.state = seed;
    }

    /**
     * Generate a random float between 0 and 1
     * @returns {number} Random float [0, 1)
     */
    random() {
        // Linear congruential generator (LCG)
        // Using constants from Numerical Recipes
        this.state = (this.state * 1664525 + 1013904223) % Math.pow(2, 32);
        return this.state / Math.pow(2, 32);
    }

    /**
     * Generate a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer [min, max]
     */
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    /**
     * Randomly select an element from an array
     * @param {Array} array - Array to select from
     * @returns {*} Random element from array
     */
    randomChoice(array) {
        if (array.length === 0) return null;
        return array[this.randomInt(0, array.length - 1)];
    }

    /**
     * Generate a random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float [min, max)
     */
    randomFloat(min, max) {
        return min + this.random() * (max - min);
    }

    /**
     * Reset the RNG to its initial seed
     */
    reset() {
        this.state = this.seed;
    }

    /**
     * Set a new seed and reset state
     * @param {number} seed - New seed value
     */
    setSeed(seed) {
        this.seed = seed;
        this.state = seed;
    }
}


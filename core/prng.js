/**
 * Seeded PRNG Implementation - Mulberry32 Algorithm
 * Provides deterministic random number generation for reproducible results
 */

/**
 * Mulberry32 PRNG
 * Fast, high-quality, seedable random number generator
 * @param {number} seed - Integer seed value
 * @returns {function} - Function that returns random float [0, 1)
 */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Create seeded random utilities
 * @param {number} seed - Integer seed value
 * @returns {Object} - Object with random utility functions
 */
function createSeededRandom(seed) {
  const rng = mulberry32(seed);

  return {
    // Get next random number [0, 1)
    next: () => rng(),

    // Get random number in range [min, max)
    range: (min, max) => min + rng() * (max - min),

    // Get random integer in range [min, max]
    integer: (min, max) => Math.floor(min + rng() * (max - min + 1))
  };
}

/**
 * Simple string hash function
 * @param {string} str - String to hash
 * @returns {number} - Hash value
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculate document-specific seed
 * @param {Object} doc - Photoshop document
 * @param {Object} config - Configuration object
 * @returns {number} - Document-specific seed
 */
function calculateDocumentSeed(doc, config) {
  const baseSeed = config.copyGeneration.randomSeed;

  if (config.copyGeneration.seedStrategy === "fixed") {
    return baseSeed;
  }

  // Strategy: documentHash
  // Combine base seed with hash of document name
  const docHash = hashString(doc.name);
  return baseSeed + docHash;
}

module.exports = {
  mulberry32,
  createSeededRandom,
  calculateDocumentSeed,
  hashString
};

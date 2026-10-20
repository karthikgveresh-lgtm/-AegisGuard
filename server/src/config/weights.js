/**
 * Configurable weights, factor ceilings, and decision thresholds
 * for the multi-stage risk evaluation pipeline.
 */
module.exports = {
  // Decision boundaries (strict, non-overlapping)
  THRESHOLDS: {
    ALLOW_MAX: 29,       // 0 - 29 -> ALLOW
    CHALLENGE_MAX: 74,   // 30 - 74 -> CHALLENGE
    BLOCK_MIN: 75        // 75 - 100 -> BLOCK
  },

  // Pre-filter rules
  PREFILTERS: {
    HARD_VELOCITY_LIMIT_60S: 5,     // >5 attempts in 60s per IP or device -> immediate BLOCK
    SEVERE_GEO_JUMP_KM: 5000,       // >5000 km in <1h -> immediate high weight / flag
    SEVERE_GEO_JUMP_HOURS: 1,
    BLACKLIST_IP_WEIGHT: 50
  },

  // Scoring Weights and Penalties
  WEIGHTS: {
    // Geo & Travel
    IMPOSSIBLE_TRAVEL_SPEED_KMH: 900,  // Faster than typical commercial jet cruise
    IMPOSSIBLE_TRAVEL_WEIGHT: 40,
    HIGH_SPEED_TRAVEL_WEIGHT: 25,       // 500 - 900 km/h (borderline or multi-hop)
    UNKNOWN_GEO_WEIGHT: 10,

    // Device
    NEW_DEVICE_WEIGHT: 20,              // Unrecognized fingerprint
    KNOWN_DEVICE_REDUCTION: -5,         // Trusted device bonus

    // Velocity Windows
    VELOCITY_60S_HIGH_WEIGHT: 25,       // 4-5 attempts in 60s
    VELOCITY_60S_MED_WEIGHT: 12,        // 2-3 attempts in 60s
    VELOCITY_10M_HIGH_WEIGHT: 15,       // >8 attempts in 10m
    VELOCITY_10M_MED_WEIGHT: 8,         // 4-8 attempts in 10m

    // Behavioural Signals
    BEHAVIOUR_PASTE_CARD: 25,           // Paste detected on card number or CVV
    BEHAVIOUR_RAPID_SUBMIT: 25,         // Form fill dwell < 1.5 seconds
    BEHAVIOUR_ROBOTIC_KEYSTROKE: 25,    // Std-dev of keystroke interval < 18ms
    BEHAVIOUR_ZERO_MOUSE_JITTER: 20,    // Perfectly straight/zero mouse movement
    BEHAVIOUR_CADENCE_DEVIATION: 10,    // > 2x deviation from user typing baseline

    // Transaction & Amount Anomaly
    AMOUNT_Z_SCORE_EXTREME: 30,         // Z-score >= 3.0 (way above normal)
    AMOUNT_Z_SCORE_HIGH: 20,            // Z-score >= 2.0
    AMOUNT_Z_SCORE_MED: 10,             // Z-score >= 1.5
    HIGH_RISK_MERCHANT_WEIGHT: 15       // Crypto, gift cards, luxury goods
  },

  // Merchant Categories
  HIGH_RISK_MERCHANTS: [
    'cryptocurrency',
    'gift_cards',
    'gambling',
    'luxury_jewelry',
    'peer_to_peer_transfer'
  ],

  // TOTP demo secret
  DEMO_TOTP_SECRET: 'JBSWY3DPEHPK3PXP'
};

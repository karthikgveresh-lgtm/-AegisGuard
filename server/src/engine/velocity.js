const { WEIGHTS, PREFILTERS } = require('../config/weights');

/**
 * Evaluates velocity signals across multiple sliding windows:
 * - 60 seconds (short-burst automation / brute-force)
 * - 10 minutes (sustained distributed attack)
 */
function evaluateVelocity(windowCounts) {
  const { count60s, count10m } = windowCounts;
  const signals = [];
  let isHardVelocityExceeded = false;

  const max60s = Math.max(count60s.byIp, count60s.byDevice, count60s.byUser);
  const max10m = Math.max(count10m.byIp, count10m.byDevice, count10m.byUser);

  // Hard limit: >5 attempts in 60s -> Immediate BLOCK trigger
  if (count60s.byIp > PREFILTERS.HARD_VELOCITY_LIMIT_60S || count60s.byDevice > PREFILTERS.HARD_VELOCITY_LIMIT_60S) {
    isHardVelocityExceeded = true;
    signals.push({
      factor: 'hard_velocity_breach',
      weight: 60,
      detail: `Critical rate limit breach: ${max60s} attempts detected within 60s window (threshold: ${PREFILTERS.HARD_VELOCITY_LIMIT_60S})`,
      raw: { count60s, count10m }
    });
    return { signals, isHardVelocityExceeded };
  }

  // 60-second window scoring
  if (max60s >= 4) {
    signals.push({
      factor: 'velocity_spike_60s',
      weight: WEIGHTS.VELOCITY_60S_HIGH_WEIGHT, // 25
      detail: `High velocity burst: ${max60s} checkout attempts in 60s`,
      raw: { max60s, window: '60s' }
    });
  } else if (max60s >= 2) {
    signals.push({
      factor: 'velocity_spike_60s',
      weight: WEIGHTS.VELOCITY_60S_MED_WEIGHT, // 12
      detail: `Repeated activity: ${max60s} checkout attempts in 60s`,
      raw: { max60s, window: '60s' }
    });
  }

  // 10-minute window scoring
  if (max10m >= 8) {
    signals.push({
      factor: 'velocity_10m_surge',
      weight: WEIGHTS.VELOCITY_10M_HIGH_WEIGHT, // 15
      detail: `Persistent velocity surge: ${max10m} attempts in past 10 minutes`,
      raw: { max10m, window: '10m' }
    });
  } else if (max10m >= 4 && max60s < 2) {
    signals.push({
      factor: 'velocity_10m_moderate',
      weight: WEIGHTS.VELOCITY_10M_MED_WEIGHT, // 8
      detail: `Elevated frequency: ${max10m} attempts in past 10 minutes`,
      raw: { max10m, window: '10m' }
    });
  }

  return { signals, isHardVelocityExceeded };
}

module.exports = {
  evaluateVelocity
};

const { isIpBlacklisted } = require('../config/blacklists');
const { PREFILTERS } = require('../config/weights');

/**
 * Stage 1 Fast-Path Rule-based Pre-filters
 * Evaluates high-confidence indicators before heavy scoring pipeline.
 */
function evaluatePrefilters({ ipAddress, windowCounts, geoResult }) {
  const signals = [];
  let isHardBlock = false;

  // 1. IP / CIDR Blacklist evaluation
  if (isIpBlacklisted(ipAddress)) {
    isHardBlock = true;
    signals.push({
      factor: 'blacklisted_ip_or_subnet',
      weight: PREFILTERS.BLACKLIST_IP_WEIGHT, // 50
      detail: `IP address ${ipAddress} matches known fraud / bulletproof proxy threat intelligence list`,
      raw: { ipAddress, status: 'blacklisted' }
    });
  }

  // 2. Severe impossible travel jump (>7500 km in <1h)
  if (geoResult && geoResult.isSevereJump) {
    isHardBlock = true;
  }

  // 3. Hard Velocity breach (>5 attempts in 60s)
  if (windowCounts && (windowCounts.byIp > PREFILTERS.HARD_VELOCITY_LIMIT_60S || windowCounts.byDevice > PREFILTERS.HARD_VELOCITY_LIMIT_60S)) {
    isHardBlock = true;
    signals.push({
      factor: 'hard_rate_limit_violation',
      weight: 60,
      detail: `Exceeded hard limit of ${PREFILTERS.HARD_VELOCITY_LIMIT_60S} attempts in 60s (automated burst)`,
      raw: windowCounts
    });
  }

  return {
    signals,
    isHardBlock
  };
}

module.exports = {
  evaluatePrefilters
};

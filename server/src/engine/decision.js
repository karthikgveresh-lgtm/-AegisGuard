const { THRESHOLDS } = require('../config/weights');

/**
 * Determines decision based on final risk score and prefilter triggers.
 * Thresholds:
 *   0 - 29   => ALLOW
 *   30 - 74  => CHALLENGE
 *   75 - 100 => BLOCK
 * Note: Any hard-block pre-filter forces BLOCK regardless of score.
 */
function determineDecision(riskScore, isHardBlock = false) {
  if (isHardBlock) {
    return 'BLOCK';
  }

  if (riskScore <= THRESHOLDS.ALLOW_MAX) {
    return 'ALLOW';
  }

  if (riskScore <= THRESHOLDS.CHALLENGE_MAX) {
    return 'CHALLENGE';
  }

  return 'BLOCK';
}

module.exports = {
  determineDecision
};

const { WEIGHTS, HIGH_RISK_MERCHANTS } = require('../config/weights');

/**
 * Evaluates transaction parameters:
 * - Amount anomaly (z-score relative to user profile)
 * - Merchant category risk
 */
function evaluateTransactionParameters(tx, user) {
  const signals = [];
  const amount = Number(tx.amount) || 0;

  // 1. Amount Anomaly via Z-Score
  if (user && user.avg_amount && user.std_amount) {
    const avg = Number(user.avg_amount);
    const std = Number(user.std_amount) || (avg * 0.3); // fallback std dev
    const zScore = (amount - avg) / std;

    if (zScore >= 3.0) {
      signals.push({
        factor: 'severe_amount_anomaly',
        weight: WEIGHTS.AMOUNT_Z_SCORE_EXTREME, // 30
        detail: `Transaction amount $${amount.toFixed(2)} is ${zScore.toFixed(1)}σ above customer historical average ($${avg.toFixed(2)})`,
        raw: { amount, avg, std, zScore: Number(zScore.toFixed(2)) }
      });
    } else if (zScore >= 2.0) {
      signals.push({
        factor: 'high_amount_anomaly',
        weight: WEIGHTS.AMOUNT_Z_SCORE_HIGH, // 20
        detail: `Transaction amount $${amount.toFixed(2)} is ${zScore.toFixed(1)}σ above customer average ($${avg.toFixed(2)})`,
        raw: { amount, avg, std, zScore: Number(zScore.toFixed(2)) }
      });
    } else if (zScore >= 1.5) {
      signals.push({
        factor: 'moderate_amount_anomaly',
        weight: WEIGHTS.AMOUNT_Z_SCORE_MED, // 10
        detail: `Transaction amount $${amount.toFixed(2)} exceeds typical spending pattern`,
        raw: { amount, avg, std, zScore: Number(zScore.toFixed(2)) }
      });
    }
  } else if (amount > 1000) {
    // Default baseline for unprofiled users
    signals.push({
      factor: 'high_value_transaction',
      weight: 15,
      detail: `Transaction amount $${amount.toFixed(2)} exceeds default single-transaction threshold`,
      raw: { amount }
    });
  }

  // 2. High-Risk Merchant Category
  const category = (tx.merchant_category || '').toLowerCase();
  if (HIGH_RISK_MERCHANTS.includes(category)) {
    signals.push({
      factor: 'high_risk_merchant_category',
      weight: WEIGHTS.HIGH_RISK_MERCHANT_WEIGHT, // 15
      detail: `Merchant classification "${tx.merchant_category}" carries elevated chargeback/fraud risk`,
      raw: { category }
    });
  }

  return { signals };
}

/**
 * Combines signals from all modules, sorts by descending weight,
 * applies diminishing returns: score = round(100 * (1 - exp(-raw / 60))).
 * Clamps result to [0, 100].
 */
function calculateRiskScore(allSignals, isHardBlock = false) {
  // Sort signals descending by weight
  const sortedSignals = [...allSignals].sort((a, b) => b.weight - a.weight);

  // Calculate raw sum of signal weights
  const rawScore = sortedSignals.reduce((acc, s) => acc + (s.weight || 0), 0);

  // Diminishing-returns curve: score = round(100 * (1 - exp(-raw / 60)))
  let normalizedScore = 0;
  if (rawScore > 0) {
    normalizedScore = Math.round(100 * (1 - Math.exp(-rawScore / 60)));
  }
  const riskScore = Math.max(0, Math.min(100, normalizedScore));

  return {
    risk_score: riskScore,
    raw_score: rawScore,
    signals: sortedSignals
  };
}

module.exports = {
  evaluateTransactionParameters,
  calculateRiskScore
};

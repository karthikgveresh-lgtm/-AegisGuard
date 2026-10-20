/**
 * Human-readable explainability engine.
 * Synthesizes top contributing signals into a natural language sentence.
 */
function generateSummary(decision, signals = []) {
  if (decision === 'ALLOW') {
    if (signals.some(s => s.factor === 'trusted_device')) {
      return 'Approved: Verified customer identity on a recognized device with standard behavioral cadence.';
    }
    return 'Approved: Transaction signals fall comfortably within normal historical risk tolerance.';
  }

  // Filter out negative discount signals for the explanation
  const contributingSignals = signals.filter(s => s.weight > 0);

  if (contributingSignals.length === 0) {
    return `${decision === 'BLOCK' ? 'Blocked' : 'Challenged'} due to standard baseline rules.`;
  }

  const topFactors = contributingSignals.slice(0, 2).map(s => {
    switch (s.factor) {
      case 'impossible_travel':
      case 'severe_impossible_travel':
      case 'severe_impossible_travel_jump':
        return 'impossible travel speed';
      case 'unrecognized_device':
        return 'unrecognized browser fingerprint';
      case 'clipboard_paste_sensitive_field':
        return 'clipboard paste on sensitive credentials';
      case 'superhuman_form_fill_speed':
        return 'superhuman form submission speed';
      case 'robotic_keystroke_cadence':
        return 'robotic keystroke cadence';
      case 'zero_mouse_entropy':
        return 'unnatural absence of mouse movement';
      case 'blacklisted_ip_or_subnet':
        return 'blacklisted IP threat intelligence';
      case 'hard_rate_limit_violation':
      case 'hard_velocity_breach':
      case 'velocity_spike_60s':
        return 'rapid checkout velocity spike';
      case 'severe_amount_anomaly':
      case 'high_amount_anomaly':
        return 'abnormal order value';
      case 'high_risk_merchant_category':
        return 'high-risk merchant category';
      case 'automated_browser_environment':
        return 'automated browser indicators';
      default:
        return s.factor.replace(/_/g, ' ');
    }
  });

  const factorsText = topFactors.length === 1 
    ? topFactors[0] 
    : `${topFactors[0]} and ${topFactors[1]}`;

  if (decision === 'BLOCK') {
    return `Blocked mainly due to ${factorsText}.`;
  } else {
    return `Challenged mainly due to ${factorsText}.`;
  }
}

module.exports = {
  generateSummary
};

const { WEIGHTS } = require('../config/weights');

/**
 * Evaluates behavioral telemetry against bot heuristics and user profile baselines.
 * @param {Object} behaviour - Collected telemetry
 *   - pasteDetected: boolean
 *   - formDwellMs: number (time from form load to submit)
 *   - keystrokeCadence: { meanMs: number, stdDevMs: number }
 *   - mouseJitter: number (0.0 to 1.0 entropy/jitter score)
 * @param {Object} user - User profile with baseline habits
 */
function evaluateBehaviouralSignals(behaviour = {}, user = null) {
  const signals = [];

  const {
    pasteDetected = false,
    formDwellMs = 0,
    keystrokeCadence = null,
    mouseJitter = 0.5
  } = behaviour;

  // 1. Paste event on sensitive credit card / CVV fields
  if (pasteDetected) {
    signals.push({
      factor: 'clipboard_paste_sensitive_field',
      weight: WEIGHTS.BEHAVIOUR_PASTE_CARD, // 25
      detail: 'Direct clipboard paste detected on sensitive card number or CVV input',
      raw: { pasteDetected: true }
    });
  }

  // 2. Ultra-rapid form submission (<1500 ms)
  if (formDwellMs > 0 && formDwellMs < 1500) {
    signals.push({
      factor: 'superhuman_form_fill_speed',
      weight: WEIGHTS.BEHAVIOUR_RAPID_SUBMIT, // 25
      detail: `Checkout completed in ${formDwellMs} ms (superhuman speed indicative of programmatic injection)`,
      raw: { formDwellMs }
    });
  }

  // 3. Robotic Keystroke Cadence (std-dev near 0 or unnaturally uniform delay)
  if (keystrokeCadence) {
    const { meanMs = 0, stdDevMs = 0 } = keystrokeCadence;

    if (meanMs > 0 && stdDevMs < 15) {
      signals.push({
        factor: 'robotic_keystroke_cadence',
        weight: WEIGHTS.BEHAVIOUR_ROBOTIC_KEYSTROKE, // 25
        detail: `Robotic keystroke cadence detected (inter-key jitter std-dev ${stdDevMs.toFixed(1)} ms, typical human > 30 ms)`,
        raw: { meanMs, stdDevMs }
      });
    }

    // Baseline deviation if user profile exists
    if (user && user.typical_keystroke_mean) {
      const baselineMean = user.typical_keystroke_mean;
      const deviation = Math.abs(meanMs - baselineMean);
      if (deviation > 120 && meanMs > 0) {
        signals.push({
          factor: 'typing_cadence_anomaly',
          weight: WEIGHTS.BEHAVIOUR_CADENCE_DEVIATION, // 10
          detail: `Typing cadence deviated by ${Math.round(deviation)} ms from user account baseline (${Math.round(baselineMean)} ms)`,
          raw: { meanMs, baselineMean, deviation }
        });
      }
    }
  }

  // 4. Mouse movement jitter / entropy
  // A bot script either sends 0 mouse moves or a straight mathematical line (jitter <= 0.05)
  if (mouseJitter !== undefined && mouseJitter !== null) {
    if (mouseJitter <= 0.05) {
      signals.push({
        factor: 'zero_mouse_entropy',
        weight: WEIGHTS.BEHAVIOUR_ZERO_MOUSE_JITTER, // 20
        detail: `Absence of natural micro-tremor / mouse curvature (entropy score: ${mouseJitter.toFixed(2)})`,
        raw: { mouseJitter }
      });
    }
  }

  return { signals };
}

module.exports = {
  evaluateBehaviouralSignals
};

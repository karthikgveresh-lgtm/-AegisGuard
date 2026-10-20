const express = require('express');
const router = express.Router();
const { evaluateTransaction } = require('../engine/index');
const transactionRepository = require('../repositories/transactionRepository');
const auditRepository = require('../repositories/auditRepository');
const { streamManager } = require('./stream');

// Attack profiles with diverse users, attack vectors, and scoring weights
const ATTACK_BLUEPRINTS = [
  // 1. Extreme bot: Blacklist + paste + rapid submit -> Score 100
  {
    userId: 'usr_sarah',
    ip: '45.154.255.89',
    category: 'cryptocurrency',
    amount: 1250,
    paste: true,
    dwell: 220,
    jitter: 0.0,
    meanMs: 8,
    stdMs: 2,
    headless: true,
    last4: '9010'
  },
  // 2. Tor exit node: Tor IP + new device + normal Marcus spending -> Score ~75
  {
    userId: 'usr_marcus',
    ip: '203.0.113.66',
    category: 'electronics',
    amount: 215,
    paste: false,
    dwell: 2800,
    jitter: 0.45,
    meanMs: 155,
    stdMs: 32,
    headless: false,
    last4: '4111'
  },
  // 3. Darknet proxy: Darknet IP + paste on CVV -> Score ~95
  {
    userId: 'usr_elena',
    ip: '185.220.101.5',
    category: 'electronics',
    amount: 68,
    paste: true,
    dwell: 2200,
    jitter: 0.35,
    meanMs: 130,
    stdMs: 28,
    headless: false,
    last4: '5500'
  },
  // 4. Automated credential test: Botnet IP + rapid dwell + low jitter -> Score ~90-95
  {
    userId: 'usr_david',
    ip: '45.154.255.91',
    category: 'electronics',
    amount: 110,
    paste: false,
    dwell: 620,
    jitter: 0.02,
    meanMs: 14,
    stdMs: 3,
    headless: false,
    last4: '3782'
  },
  // 5. Bulletproof proxy + new device + normal Alex spending -> Score ~75-80
  {
    userId: 'usr_alex',
    ip: '198.51.100.99',
    category: 'electronics',
    amount: 88,
    paste: false,
    dwell: 3200,
    jitter: 0.55,
    meanMs: 140,
    stdMs: 35,
    headless: false,
    last4: '4242'
  },
  // 6. Fast cluster bot: Botnet IP + paste + robotic cadence -> Score 100
  {
    userId: 'usr_sarah',
    ip: '45.154.255.90',
    category: 'cryptocurrency',
    amount: 1450,
    paste: true,
    dwell: 310,
    jitter: 0.0,
    meanMs: 9,
    stdMs: 2,
    headless: true,
    last4: '9010'
  }
];

/**
 * POST /api/simulate/attack
 * Triggers a burst of varied bot transactions with different users and score variance
 */
router.post('/attack', (req, res) => {
  const count = Math.min(10, Math.max(3, parseInt(req.body.count || '6', 10)));

  // Respond immediately so UI receives confirmation
  res.status(202).json({
    success: true,
    message: `Triggered distributed bot attack simulation (${count} requests across varied user accounts)`,
    burstCount: count
  });

  // Execute burst in the background with staggered intervals
  let fired = 0;
  const interval = setInterval(async () => {
    if (fired >= count) {
      clearInterval(interval);
      return;
    }

    const blueprint = ATTACK_BLUEPRINTS[fired % ATTACK_BLUEPRINTS.length];
    fired++;

    const botTxn = {
      user_id: blueprint.userId,
      amount: blueprint.amount + Math.floor(Math.random() * 20),
      currency: 'USD',
      merchant_category: blueprint.category,
      ip_address: blueprint.ip,
      card_number: `400012345678${blueprint.last4}`,
      device: {
        device_id: `dev_attack_${blueprint.userId}_${fired}`,
        user_agent: blueprint.headless
          ? 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/121.0.0.0'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        screen_resolution: blueprint.headless ? '800x600' : '1920x1080',
        color_depth: 24,
        timezone_offset: 0,
        language: 'en-US'
      },
      behaviour: {
        paste_detected: blueprint.paste,
        form_dwell_ms: blueprint.dwell,
        mouse_jitter: blueprint.jitter,
        keystroke_cadence: {
          mean_ms: blueprint.meanMs,
          std_dev_ms: blueprint.stdMs
        }
      }
    };

    try {
      const evaluation = await evaluateTransaction(botTxn);
      const txId = `txn_attack_${Date.now()}_${fired}`;

      const txRecord = transactionRepository.createTransaction({
        id: txId,
        user_id: botTxn.user_id,
        amount: botTxn.amount,
        currency: 'USD',
        merchant_category: botTxn.merchant_category,
        card_last4: blueprint.last4,
        card_fingerprint: `tok_sim_${blueprint.last4}`,
        ip_address: blueprint.ip,
        city: evaluation.geo.city,
        country: evaluation.geo.country,
        lat: evaluation.geo.lat,
        lng: evaluation.geo.lng,
        device_id: evaluation.device_id,
        risk_score: evaluation.risk_score,
        decision: evaluation.decision,
        status: evaluation.decision === 'BLOCK' ? 'BLOCKED' : 'CHALLENGE_PENDING',
        challenge_attempts: 0,
        summary: evaluation.summary,
        latency_ms: evaluation.latency_ms,
        created_at: new Date().toISOString()
      });

      auditRepository.logEvent({
        transaction_id: txId,
        event_type: 'EVALUATION',
        signals: evaluation.signals,
        raw_telemetry: {
          device: botTxn.device,
          behaviour: botTxn.behaviour,
          geo: evaluation.geo
        },
        risk_score: evaluation.risk_score,
        decision: evaluation.decision
      });

      streamManager.broadcast('TRANSACTION_CREATED', {
        transaction: txRecord,
        signals: evaluation.signals,
        summary: evaluation.summary
      });

      const metrics = transactionRepository.getMetrics();
      streamManager.broadcast('METRICS_UPDATED', metrics);
    } catch (e) {
      console.error('Error firing simulated attack transaction:', e);
    }
  }, 350);
});

module.exports = router;

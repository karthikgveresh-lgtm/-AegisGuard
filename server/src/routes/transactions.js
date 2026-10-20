const express = require('express');
const router = express.Router();
const { z } = require('zod');
const crypto = require('crypto');
const { authenticator } = require('otplib');

const { evaluateTransaction } = require('../engine/index');
const transactionRepository = require('../repositories/transactionRepository');
const auditRepository = require('../repositories/auditRepository');
const userRepository = require('../repositories/userRepository');
const { streamManager } = require('./stream');
const { DEMO_TOTP_SECRET } = require('../config/weights');

// Zod schema for transaction evaluation
const evaluateSchema = z.object({
  user_id: z.string().min(1, 'user_id is required'),
  amount: z.number().positive('amount must be positive'),
  currency: z.string().default('USD'),
  merchant_category: z.string().default('retail'),
  ip_address: z.string().default('198.51.100.10'),
  card_number: z.string().optional(),
  card_last4: z.string().optional(),
  device: z.object({
    device_id: z.string().optional(),
    user_agent: z.string().optional(),
    screen_resolution: z.string().optional(),
    color_depth: z.number().optional(),
    timezone_offset: z.number().optional(),
    language: z.string().optional()
  }).optional(),
  behaviour: z.object({
    paste_detected: z.boolean().optional(),
    form_dwell_ms: z.number().optional(),
    mouse_jitter: z.number().optional(),
    keystroke_cadence: z.object({
      mean_ms: z.number().optional(),
      std_dev_ms: z.number().optional()
    }).optional()
  }).optional(),
  baseline: z.object({
    last_location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      city: z.string().optional(),
      country: z.string().optional()
    }).optional(),
    last_timestamp: z.string().optional(),
    trusted_device_ids: z.array(z.string()).optional(),
    velocity_counts: z.any().optional()
  }).optional()
}).passthrough();

function hashCard(pan) {
  if (!pan) return 'tok_simulated_hash';
  return crypto.createHash('sha256').update(pan).digest('hex');
}

/**
 * POST /api/transactions/evaluate
 */
router.post('/evaluate', async (req, res) => {
  try {
    const parseResult = evaluateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
    }

    const payload = parseResult.data;

    // Security hygiene: Extract last 4 digits only and compute one-way SHA-256 hash.
    // Full card number / CVV is NEVER persisted or returned.
    const pan = payload.card_number || '';
    const last4 = payload.card_last4 || (pan.length >= 4 ? pan.slice(-4) : '4242');
    const cardFingerprint = hashCard(pan || `${payload.user_id}_default`);

    // Run real-time scoring engine
    const evaluation = await evaluateTransaction(payload);

    // Generate unique transaction identifier
    const txId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const status = evaluation.decision === 'ALLOW' 
      ? 'COMPLETED' 
      : (evaluation.decision === 'CHALLENGE' ? 'CHALLENGE_PENDING' : 'BLOCKED');

    // Persist to repository
    const txRecord = transactionRepository.createTransaction({
      id: txId,
      user_id: payload.user_id,
      amount: payload.amount,
      currency: payload.currency,
      merchant_category: payload.merchant_category,
      card_last4: last4,
      card_fingerprint: cardFingerprint,
      ip_address: payload.ip_address,
      city: evaluation.geo.city,
      country: evaluation.geo.country,
      lat: evaluation.geo.lat,
      lng: evaluation.geo.lng,
      device_id: evaluation.device_id,
      risk_score: evaluation.risk_score,
      raw_score: evaluation.raw_score,
      is_hard_block: evaluation.is_hard_block ? 1 : 0,
      decision: evaluation.decision,
      status,
      challenge_attempts: 0,
      summary: evaluation.summary,
      latency_ms: evaluation.latency_ms,
      created_at: evaluation.timestamp
    });

    // Append to immutable audit log
    auditRepository.logEvent({
      transaction_id: txId,
      event_type: 'EVALUATION',
      signals: evaluation.signals,
      raw_telemetry: {
        device: payload.device || {},
        behaviour: payload.behaviour || {},
        geo: evaluation.geo,
        is_hard_block: evaluation.is_hard_block
      },
      risk_score: evaluation.risk_score,
      decision: evaluation.decision
    });

    // Real-time broadcast to connected Ops Consoles via SSE
    streamManager.broadcast('TRANSACTION_CREATED', {
      transaction: txRecord,
      signals: evaluation.signals,
      summary: evaluation.summary,
      is_hard_block: evaluation.is_hard_block
    });

    // Also push updated system metrics
    const metrics = transactionRepository.getMetrics();
    streamManager.broadcast('METRICS_UPDATED', metrics);

    // Return exact explainable response
    return res.status(200).json({
      transaction_id: txId,
      decision: evaluation.decision,
      risk_score: evaluation.risk_score,
      raw_score: evaluation.raw_score,
      is_hard_block: Boolean(evaluation.is_hard_block),
      timestamp: evaluation.timestamp,
      signals: evaluation.signals,
      summary: evaluation.summary,
      latency_ms: evaluation.latency_ms,
      status,
      geo: evaluation.geo
    });
  } catch (err) {
    console.error('Error in evaluate endpoint:', err);
    return res.status(500).json({
      error: 'Internal evaluation error',
      message: err.message
    });
  }
});

/**
 * POST /api/transactions/:id/challenge/verify
 * Step-up authentication using real TOTP or demo bypass
 */
router.post('/:id/challenge/verify', (req, res) => {
  try {
    const { id } = req.params;
    const { code, trust_device = true } = req.body;

    const tx = transactionRepository.getTransactionById(id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (tx.status === 'BLOCKED') {
      return res.status(400).json({ error: 'Transaction has already been blocked and cannot be verified' });
    }

    if (tx.status === 'CHALLENGE_PASSED' || tx.status === 'COMPLETED') {
      return res.status(200).json({
        success: true,
        status: tx.status,
        message: 'Transaction has already been verified'
      });
    }

    // Verify TOTP code (otplib or demo bypass code '123456')
    const isValidTotp = authenticator.check(code, DEMO_TOTP_SECRET);
    const isBypass = code === '123456';
    const isSuccessful = isValidTotp || isBypass;

    if (isSuccessful) {
      const updatedTx = transactionRepository.updateTransactionStatus(id, {
        status: 'CHALLENGE_PASSED',
        challenge_attempts: tx.challenge_attempts + 1
      });

      // Optionally register device as trusted for the user
      if (trust_device && tx.device_id) {
        userRepository.addTrustedDevice(tx.user_id, tx.device_id, 'Verified via Step-up OTP');
      }

      auditRepository.logEvent({
        transaction_id: id,
        event_type: 'CHALLENGE_VERIFIED',
        signals: [{ factor: 'step_up_otp_verified', weight: 0, detail: 'Customer verified second-factor TOTP challenge' }],
        raw_telemetry: { codeProvided: '******', trustDevice: trust_device },
        risk_score: tx.risk_score,
        decision: tx.decision
      });

      streamManager.broadcast('TRANSACTION_UPDATED', {
        transaction: updatedTx,
        status: 'CHALLENGE_PASSED'
      });

      const metrics = transactionRepository.getMetrics();
      streamManager.broadcast('METRICS_UPDATED', metrics);

      return res.status(200).json({
        success: true,
        status: 'CHALLENGE_PASSED',
        message: 'Step-up challenge passed successfully. Transaction authorized.'
      });
    } else {
      const attempts = (tx.challenge_attempts || 0) + 1;
      let newStatus = 'CHALLENGE_PENDING';
      let newDecision = tx.decision;

      if (attempts >= 3) {
        // Escalate 3 failed attempts to BLOCK
        newStatus = 'BLOCKED';
        newDecision = 'BLOCK';
      }

      const updatedTx = transactionRepository.updateTransactionStatus(id, {
        status: newStatus,
        challenge_attempts: attempts,
        decision: newDecision
      });

      auditRepository.logEvent({
        transaction_id: id,
        event_type: attempts >= 3 ? 'CHALLENGE_ESCALATED_BLOCK' : 'CHALLENGE_ATTEMPT_FAILED',
        signals: [{ factor: 'step_up_failure', weight: 0, detail: `Failed OTP attempt (${attempts}/3)` }],
        raw_telemetry: { attempts },
        risk_score: tx.risk_score,
        decision: newDecision
      });

      streamManager.broadcast('TRANSACTION_UPDATED', {
        transaction: updatedTx,
        status: newStatus
      });

      const metrics = transactionRepository.getMetrics();
      streamManager.broadcast('METRICS_UPDATED', metrics);

      return res.status(401).json({
        success: false,
        attempts,
        attemptsRemaining: Math.max(0, 3 - attempts),
        status: newStatus,
        decision: newDecision,
        message: attempts >= 3 
          ? 'Maximum verification attempts exceeded. Transaction has been escalated to BLOCKED.' 
          : `Invalid verification code. ${3 - attempts} attempt(s) remaining.`
      });
    }
  } catch (err) {
    console.error('Error verifying challenge:', err);
    return res.status(500).json({ error: 'Failed to verify challenge' });
  }
});

/**
 * GET /api/transactions
 */
router.get('/', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));
    const decision = req.query.decision || null;
    const search = req.query.search || null;

    const items = transactionRepository.getRecentTransactions({ limit, offset, decision, search });
    return res.status(200).json({
      items,
      count: items.length,
      limit,
      offset
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/transactions/:id
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const transaction = transactionRepository.getTransactionById(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const auditTrail = auditRepository.getLogsForTransaction(id);
    return res.status(200).json({
      transaction,
      auditTrail
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

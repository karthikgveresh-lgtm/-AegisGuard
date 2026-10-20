const express = require('express');
const router = express.Router();
const { authenticator } = require('otplib');

const transactionRepository = require('../repositories/transactionRepository');
const auditRepository = require('../repositories/auditRepository');
const userRepository = require('../repositories/userRepository');
const { PERSONAS } = require('../seed/personas');
const { DEMO_TOTP_SECRET } = require('../config/weights');

/**
 * GET /api/metrics
 */
router.get('/', (req, res) => {
  try {
    const metrics = transactionRepository.getMetrics();
    const topSignals = auditRepository.getTopSignals(6);

    return res.status(200).json({
      ...metrics,
      topSignals
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users
 */
router.get('/users', (req, res) => {
  try {
    const users = userRepository.getAllUsers();
    return res.status(200).json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/personas
 */
router.get('/personas', (req, res) => {
  return res.status(200).json({
    personas: PERSONAS
  });
});

/**
 * GET /api/demo/totp
 * Returns current valid TOTP token for judge demo hint
 */
router.get('/demo/totp', (req, res) => {
  try {
    const currentToken = authenticator.generate(DEMO_TOTP_SECRET);
    const timeRemaining = authenticator.timeRemaining();
    return res.status(200).json({
      token: currentToken,
      timeRemaining,
      bypassCode: '123456'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

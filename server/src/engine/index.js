const userRepository = require('../repositories/userRepository');
const transactionRepository = require('../repositories/transactionRepository');
const { resolveIpToLocation } = require('../config/cities');
const { evaluatePrefilters } = require('./prefilters');
const { evaluateGeoConsistency } = require('./geo');
const { evaluateVelocity } = require('./velocity');
const { evaluateDeviceConsistency } = require('./device');
const { evaluateBehaviouralSignals } = require('./behaviour');
const { evaluateTransactionParameters, calculateRiskScore } = require('./scorer');
const { determineDecision } = require('./decision');
const { generateSummary } = require('../explain/generator');

/**
 * Main Risk Evaluation Pipeline Orchestrator
 */
async function evaluateTransaction(payload) {
  const startTime = process.hrtime.bigint();

  // Normalize inputs
  const userId = payload.user_id || payload.userId || 'usr_anonymous';
  const ipAddress = payload.ip_address || payload.ip || '198.51.100.10';
  const device = payload.device || {};
  const deviceId = device.device_id || device.deviceId || payload.device_id || 'dev_unknown';
  const amount = Number(payload.amount) || 0;
  const currency = payload.currency || 'USD';
  const merchantCategory = payload.merchant_category || payload.merchantCategory || 'retail';

  // Normalize behavior fields
  const rawBehaviour = payload.behaviour || payload.behavior || {};
  const behaviour = {
    pasteDetected: Boolean(rawBehaviour.paste_detected ?? rawBehaviour.pasteDetected),
    formDwellMs: Number(rawBehaviour.form_dwell_ms ?? rawBehaviour.formDwellMs ?? 0),
    mouseJitter: Number(rawBehaviour.mouse_jitter ?? rawBehaviour.mouseJitter ?? 0.5),
    keystrokeCadence: rawBehaviour.keystroke_cadence ?? rawBehaviour.keystrokeCadence ?? {
      meanMs: Number(rawBehaviour.keystroke_mean_ms ?? 150),
      stdDevMs: Number(rawBehaviour.keystroke_std_dev_ms ?? 35)
    }
  };

  // 1. Resolve Location & Geo
  const resolvedCity = resolveIpToLocation(ipAddress);
  const currentGeo = {
    city: resolvedCity.name,
    country: resolvedCity.country,
    lat: resolvedCity.lat,
    lng: resolvedCity.lng,
    timestamp: payload.timestamp || new Date().toISOString()
  };

  // 2. Query Repository for User Baseline & Prior State
  const user = userRepository.getUserById(userId);

  // Check if caller persona sent its own deterministic baseline
  const baseline = payload.baseline || {};
  const trustedDeviceIds = baseline.trusted_device_ids || payload.trusted_device_ids;
  const isTrustedDevice = Array.isArray(trustedDeviceIds)
    ? trustedDeviceIds.includes(deviceId)
    : userRepository.isDeviceTrusted(userId, deviceId);

  // Prior location for Geo displacement check
  const baselineLastLocation = baseline.last_location || payload.last_location;
  const baselineLastTimestamp = baseline.last_timestamp || payload.last_timestamp;

  let priorLocation = null;
  if (baselineLastLocation && baselineLastLocation.lat !== undefined && baselineLastLocation.lng !== undefined) {
    priorLocation = {
      lat: baselineLastLocation.lat,
      lng: baselineLastLocation.lng,
      city: baselineLastLocation.city || 'Prior City',
      country: baselineLastLocation.country || 'US',
      created_at: baselineLastTimestamp || new Date(Date.now() - 10 * 60 * 1000).toISOString()
    };
  } else {
    const lastTxn = transactionRepository.getLastTransactionForUser(userId);
    if (lastTxn) {
      priorLocation = {
        lat: lastTxn.lat,
        lng: lastTxn.lng,
        city: lastTxn.city,
        country: lastTxn.country,
        created_at: lastTxn.created_at
      };
    }
  }

  // 3. Sliding Window Velocity Checks
  let count60s = transactionRepository.countAttemptsInWindow({
    userId,
    ip: ipAddress,
    deviceId,
    windowSeconds: 60
  });

  let count10m = transactionRepository.countAttemptsInWindow({
    userId,
    ip: ipAddress,
    deviceId,
    windowSeconds: 600
  });

  // If baseline specifies mock velocity counts, use them to ensure deterministic testing
  if (baseline.velocity_counts) {
    if (baseline.velocity_counts.count60s) count60s = baseline.velocity_counts.count60s;
    if (baseline.velocity_counts.count10m) count10m = baseline.velocity_counts.count10m;
  }

  // Stage 1: Geo consistency calculation (needed for prefilters too)
  const geoResult = evaluateGeoConsistency(
    currentGeo,
    priorLocation
  );

  // Stage 1: Rule-based Pre-filters
  const prefilterResult = evaluatePrefilters({
    ipAddress,
    windowCounts: count60s,
    geoResult
  });

  // Stage 2: Weighted Modules
  const velocityResult = evaluateVelocity({ count60s, count10m });
  const deviceResult = evaluateDeviceConsistency(deviceId, isTrustedDevice, device);
  const behaviourResult = evaluateBehaviouralSignals(behaviour, user);
  const txParamResult = evaluateTransactionParameters({
    amount,
    currency,
    merchant_category: merchantCategory
  }, user);

  // Aggregate signals
  const allSignals = [
    ...prefilterResult.signals,
    ...geoResult.signals,
    ...velocityResult.signals,
    ...deviceResult.signals,
    ...behaviourResult.signals,
    ...txParamResult.signals
  ];

  // Hard block override flag
  const isHardBlock = prefilterResult.isHardBlock || velocityResult.isHardVelocityExceeded;

  // Calculate final score
  const scoring = calculateRiskScore(allSignals, isHardBlock);
  const decision = determineDecision(scoring.risk_score, isHardBlock);

  // Calculate execution latency in milliseconds
  const endTime = process.hrtime.bigint();
  const latencyMs = Number(endTime - startTime) / 1e6;

  // Generate explanation summary
  const summary = generateSummary(decision, scoring.signals);

  return {
    decision,
    risk_score: scoring.risk_score,
    raw_score: scoring.raw_score,
    signals: scoring.signals,
    summary,
    latency_ms: Number(latencyMs.toFixed(2)),
    timestamp: new Date().toISOString(),
    geo: currentGeo,
    is_hard_block: isHardBlock,
    user,
    device_id: deviceId
  };
}

module.exports = {
  evaluateTransaction
};

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { calculateHaversineDistance, evaluateGeoConsistency } = require('../engine/geo');
const { evaluateVelocity } = require('../engine/velocity');
const { determineDecision } = require('../engine/decision');
const { calculateRiskScore, evaluateTransactionParameters } = require('../engine/scorer');
const { evaluatePrefilters } = require('../engine/prefilters');

describe('Risk Engine Unit Tests', () => {

  describe('Geo & Haversine Distance', () => {
    it('calculates 0 km for identical coordinates', () => {
      const dist = calculateHaversineDistance(40.7128, -74.0060, 40.7128, -74.0060);
      assert.strictEqual(dist, 0);
    });

    it('calculates accurate distance between NYC and London (~5,570 km)', () => {
      // NYC: 40.7128, -74.0060; London: 51.5074, -0.1278
      const dist = calculateHaversineDistance(40.7128, -74.0060, 51.5074, -0.1278);
      assert.ok(dist >= 5500 && dist <= 5650, `Distance was ${dist} km, expected ~5,570 km`);
    });

    it('flags impossible travel when implied speed exceeds 900 km/h', () => {
      const prev = {
        lat: 40.7128,
        lng: -74.0060,
        city: 'New York',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
      };
      const curr = {
        lat: 52.5200,
        lng: 13.4050,
        city: 'Berlin',
        timestamp: new Date().toISOString()
      };

      const result = evaluateGeoConsistency(curr, prev);
      assert.ok(result.signals.length > 0);
      const signal = result.signals.find(s => s.factor === 'impossible_travel' || s.factor === 'severe_impossible_travel');
      assert.ok(signal, 'Should flag impossible travel signal');
      assert.ok(signal.weight >= 40);
    });
  });

  describe('Velocity Window Evaluation', () => {
    it('returns no signals for low velocity', () => {
      const counts = {
        count60s: { byIp: 1, byDevice: 1, byUser: 1 },
        count10m: { byIp: 1, byDevice: 1, byUser: 1 }
      };
      const result = evaluateVelocity(counts);
      assert.strictEqual(result.signals.length, 0);
      assert.strictEqual(result.isHardVelocityExceeded, false);
    });

    it('triggers high velocity signal when 4 attempts in 60s', () => {
      const counts = {
        count60s: { byIp: 4, byDevice: 1, byUser: 1 },
        count10m: { byIp: 4, byDevice: 1, byUser: 1 }
      };
      const result = evaluateVelocity(counts);
      assert.ok(result.signals.some(s => s.factor === 'velocity_spike_60s'));
    });

    it('triggers immediate hard block when attempts > 5 in 60s', () => {
      const counts = {
        count60s: { byIp: 6, byDevice: 6, byUser: 1 },
        count10m: { byIp: 6, byDevice: 6, byUser: 1 }
      };
      const result = evaluateVelocity(counts);
      assert.strictEqual(result.isHardVelocityExceeded, true);
      assert.ok(result.signals.some(s => s.factor === 'hard_velocity_breach'));
    });
  });

  describe('Decision Threshold Boundaries (29, 30, 74, 75)', () => {
    it('boundary: score 29 -> ALLOW', () => {
      assert.strictEqual(determineDecision(29, false), 'ALLOW');
    });

    it('boundary: score 30 -> CHALLENGE', () => {
      assert.strictEqual(determineDecision(30, false), 'CHALLENGE');
    });

    it('boundary: score 74 -> CHALLENGE', () => {
      assert.strictEqual(determineDecision(74, false), 'CHALLENGE');
    });

    it('boundary: score 75 -> BLOCK', () => {
      assert.strictEqual(determineDecision(75, false), 'BLOCK');
    });

    it('hard-block prefilter overrides score 10 to BLOCK', () => {
      assert.strictEqual(determineDecision(10, true), 'BLOCK');
    });

    it('hard-block prefilter overrides boundary score 29 to BLOCK', () => {
      assert.strictEqual(determineDecision(29, true), 'BLOCK');
    });
  });

  describe('Scorer and Diminishing Returns: score = round(100 * (1 - exp(-raw / 60)))', () => {
    it('correctly calculates amount anomaly via z-score', () => {
      const user = { avg_amount: 100, std_amount: 20 };
      // $200 is 5 standard deviations above mean
      const result = evaluateTransactionParameters({ amount: 200 }, user);
      assert.ok(result.signals.some(s => s.factor === 'severe_amount_anomaly'));
    });

    it('maps boundary raw 20 to score 28 (ALLOW) and raw 21 to score 30 (CHALLENGE)', () => {
      const scoring20 = calculateRiskScore([{ factor: 'sig', weight: 20 }]);
      assert.strictEqual(scoring20.risk_score, 28);
      assert.strictEqual(determineDecision(scoring20.risk_score, false), 'ALLOW');

      const scoring21 = calculateRiskScore([{ factor: 'sig', weight: 21 }]);
      assert.strictEqual(scoring21.risk_score, 30);
      assert.strictEqual(determineDecision(scoring21.risk_score, false), 'CHALLENGE');
    });

    it('maps boundary raw 81 to score 74 (CHALLENGE) and raw 82 to score 75 (BLOCK)', () => {
      const scoring81 = calculateRiskScore([{ factor: 'sig', weight: 81 }]);
      assert.strictEqual(scoring81.risk_score, 74);
      assert.strictEqual(determineDecision(scoring81.risk_score, false), 'CHALLENGE');

      const scoring82 = calculateRiskScore([{ factor: 'sig', weight: 82 }]);
      assert.strictEqual(scoring82.risk_score, 75);
      assert.strictEqual(determineDecision(scoring82.risk_score, false), 'BLOCK');
    });

    it('applies diminishing returns curve without hard clamp (raw 150 -> 92)', () => {
      const massiveSignals = [
        { factor: 'sig1', weight: 60 },
        { factor: 'sig2', weight: 50 },
        { factor: 'sig3', weight: 40 }
      ];
      const scoring = calculateRiskScore(massiveSignals);
      // round(100 * (1 - exp(-150 / 60))) = round(100 * (1 - exp(-2.5))) = 92
      assert.strictEqual(scoring.risk_score, 92);
      assert.strictEqual(scoring.raw_score, 150);
    });

    it('caps extremely high raw scores cleanly at 100 and negative raw scores at 0', () => {
      const hugeSignals = [{ factor: 'huge', weight: 500 }];
      const hugeScoring = calculateRiskScore(hugeSignals);
      assert.strictEqual(hugeScoring.risk_score, 100);

      const negativeSignals = [{ factor: 'trusted', weight: -5 }];
      const negScoring = calculateRiskScore(negativeSignals);
      assert.strictEqual(negScoring.risk_score, 0);
      assert.strictEqual(negScoring.raw_score, -5);
    });

    it('sorts signals in descending order of weight', () => {
      const signals = [
        { factor: 'small', weight: 10 },
        { factor: 'huge', weight: 50 },
        { factor: 'medium', weight: 25 }
      ];
      const scoring = calculateRiskScore(signals);
      assert.strictEqual(scoring.signals[0].factor, 'huge');
      assert.strictEqual(scoring.signals[1].factor, 'medium');
      assert.strictEqual(scoring.signals[2].factor, 'small');
    });
  });

  describe('Stage 1 Pre-filters and Hard-Block Enforcements', () => {
    it('flags blacklisted IP with +50 weight and enforces isHardBlock = true', () => {
      const result = evaluatePrefilters({
        ipAddress: '45.154.255.89',
        windowCounts: { byIp: 1, byDevice: 1 },
        geoResult: { isSevereJump: false }
      });
      assert.ok(result.signals.some(s => s.factor === 'blacklisted_ip_or_subnet'));
      assert.strictEqual(result.signals[0].weight, 50);
      assert.strictEqual(result.isHardBlock, true);
    });

    it('enforces isHardBlock on severe geo jump (>7500 km in <1h)', () => {
      const result = evaluatePrefilters({
        ipAddress: '198.51.100.10',
        windowCounts: { byIp: 1, byDevice: 1 },
        geoResult: { isSevereJump: true }
      });
      assert.strictEqual(result.isHardBlock, true);
    });
  });
});

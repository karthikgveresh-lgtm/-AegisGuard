const { describe, it, before } = require('node:test');
const assert = require('node:assert');

const { runSeed } = require('../seed/seed');
const { PERSONAS } = require('../seed/personas');
const { evaluateTransaction } = require('../engine/index');
const userRepository = require('../repositories/userRepository');

describe('End-to-End Persona Validation Tests', () => {
  before(() => {
    // Seed fresh database before testing personas
    runSeed();
  });

  it('Persona A (Returning Customer) must return ALLOW', async () => {
    const result = await evaluateTransaction(PERSONAS.PERSONA_A);

    console.log('[Test Persona A] Decision:', result.decision, 'Risk Score:', result.risk_score);
    console.log('[Test Persona A] Signals:', result.signals.map(s => `${s.factor}: ${s.weight}`));

    assert.strictEqual(result.decision, 'ALLOW', `Persona A decision should be ALLOW, got ${result.decision}`);
    assert.ok(result.risk_score <= 29, `Persona A score should be <= 29, got ${result.risk_score}`);
    assert.ok(result.signals.some(s => s.factor === 'trusted_device'), 'Should identify trusted device');
  });

  it('Persona B (Suspicious VPN Hop) must return CHALLENGE', async () => {
    const result = await evaluateTransaction(PERSONAS.PERSONA_B);

    console.log('[Test Persona B] Decision:', result.decision, 'Risk Score:', result.risk_score);
    console.log('[Test Persona B] Signals:', result.signals.map(s => `${s.factor}: ${s.weight}`));

    assert.strictEqual(result.decision, 'CHALLENGE', `Persona B decision should be CHALLENGE, got ${result.decision}`);
    assert.ok(result.risk_score >= 30 && result.risk_score <= 74, `Persona B score should be 30-74, got ${result.risk_score}`);
    assert.ok(
      result.signals.some(s => s.factor === 'impossible_travel' || s.factor === 'severe_impossible_travel'),
      'Should flag impossible travel'
    );
    assert.ok(result.signals.some(s => s.factor === 'unrecognized_device'), 'Should flag unrecognized device');
  });

  it('Persona B run again (even after step-up OTP) must STILL return CHALLENGE due to deterministic baseline', async () => {
    // Simulate user passing OTP and adding the device to database
    userRepository.addTrustedDevice(PERSONAS.PERSONA_B.user_id, PERSONAS.PERSONA_B.device.device_id, 'Verified via Step-up OTP');

    // Run Persona B again
    const result = await evaluateTransaction(PERSONAS.PERSONA_B);

    console.log('[Test Persona B Again] Decision:', result.decision, 'Risk Score:', result.risk_score);
    console.log('[Test Persona B Again] Signals:', result.signals.map(s => `${s.factor}: ${s.weight}`));

    assert.strictEqual(result.decision, 'CHALLENGE', `Persona B second run should still be CHALLENGE, got ${result.decision}`);
    assert.ok(result.risk_score >= 30 && result.risk_score <= 74, `Persona B score should be 30-74, got ${result.risk_score}`);
    assert.ok(
      result.signals.some(s => s.factor === 'impossible_travel' || s.factor === 'severe_impossible_travel'),
      'Should still flag impossible travel'
    );
  });

  it('Persona C (Credential-Stuffing Bot) must return BLOCK', async () => {
    const result = await evaluateTransaction(PERSONAS.PERSONA_C);

    console.log('[Test Persona C] Decision:', result.decision, 'Risk Score:', result.risk_score);
    console.log('[Test Persona C] Signals:', result.signals.map(s => `${s.factor}: ${s.weight}`));

    assert.strictEqual(result.decision, 'BLOCK', `Persona C decision should be BLOCK, got ${result.decision}`);
    assert.ok(result.risk_score >= 75, `Persona C score should be >= 75, got ${result.risk_score}`);
    assert.ok(
      result.signals.some(s => s.factor === 'blacklisted_ip_or_subnet'),
      'Should flag blacklisted IP'
    );
    assert.ok(
      result.signals.some(s => s.factor === 'clipboard_paste_sensitive_field'),
      'Should flag paste on card fields'
    );
  });
});

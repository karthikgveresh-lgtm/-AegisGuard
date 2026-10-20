const { WEIGHTS } = require('../config/weights');

/**
 * Evaluates device consistency against user baseline and known devices.
 * @param {string} deviceId - Combined Canvas + WebGL device fingerprint hash
 * @param {boolean} isTrusted - Whether device is already on user's trusted list
 * @param {Object} rawDevice - Telemetry details (screen, user-agent, etc.)
 */
function evaluateDeviceConsistency(deviceId, isTrusted, rawDevice = {}) {
  const signals = [];

  if (!deviceId) {
    signals.push({
      factor: 'missing_device_fingerprint',
      weight: 20,
      detail: 'Client suppressed hardware and canvas telemetry',
      raw: { deviceId }
    });
    return { signals };
  }

  if (isTrusted) {
    signals.push({
      factor: 'trusted_device',
      weight: WEIGHTS.KNOWN_DEVICE_REDUCTION, // -5 (risk discount)
      detail: 'Hardware fingerprint matches customer-verified trusted device',
      raw: { deviceId, status: 'trusted' }
    });
  } else {
    signals.push({
      factor: 'unrecognized_device',
      weight: WEIGHTS.NEW_DEVICE_WEIGHT, // +20
      detail: 'New browser fingerprint detected (not previously bound to this account)',
      raw: { deviceId, status: 'untrusted' }
    });
  }

  // Check headless / automated browser flags in user agent
  const ua = (rawDevice.userAgent || '').toLowerCase();
  if (ua.includes('headlesschrome') || ua.includes('phantomjs') || ua.includes('selenium') || ua.includes('puppeteer')) {
    signals.push({
      factor: 'automated_browser_environment',
      weight: 35,
      detail: 'User agent indicates automated testing/scraping runtime environment',
      raw: { userAgent: rawDevice.userAgent }
    });
  }

  return { signals };
}

module.exports = {
  evaluateDeviceConsistency
};

/**
 * Preset Personas for Deterministic Judge Demos
 * Each persona specifies its baseline (last location, last timestamp, trusted devices)
 * so results are 100% deterministic on every execution.
 */
const PERSONAS = {
  PERSONA_A: {
    id: 'persona_a',
    name: 'Persona A: Returning Customer',
    tag: 'Expected: ALLOW',
    description: 'Trusted device, home city (New York), normal typing cadence, normal dwell time, typical $74.50 electronics checkout.',
    expectedDecision: 'ALLOW',
    user_id: 'usr_alex',
    amount: 74.50,
    currency: 'USD',
    merchant_category: 'electronics',
    ip_address: '198.51.100.15', // New York IP
    device: {
      device_id: 'dev_alex_macbook',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      screen_resolution: '1728x1117',
      color_depth: 24,
      timezone_offset: 240,
      language: 'en-US'
    },
    baseline: {
      last_location: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'US' },
      last_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      trusted_device_ids: ['dev_alex_macbook', 'dev_alex_iphone']
    },
    behaviour: {
      paste_detected: false,
      form_dwell_ms: 14200, // ~14s normal human form fill
      mouse_jitter: 0.72,   // Natural human micro-tremor
      keystroke_cadence: {
        mean_ms: 142,
        std_dev_ms: 36
      }
    }
  },

  PERSONA_B: {
    id: 'persona_b',
    name: 'Persona B: Suspicious VPN Hop',
    tag: 'Expected: CHALLENGE',
    description: 'New unverified device, IP routed through Miami (~1,750 km from user previous New York checkout 10 minutes ago, implied >10,000 km/h), moderate anomalies.',
    expectedDecision: 'CHALLENGE',
    user_id: 'usr_alex',
    amount: 98.50,
    currency: 'USD',
    merchant_category: 'electronics',
    ip_address: '198.51.116.42', // Miami IP (~1,750 km from NYC)
    device: {
      device_id: 'dev_unrecognized_chrome_win',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      screen_resolution: '1920x1080',
      color_depth: 24,
      timezone_offset: 300,
      language: 'en-US'
    },
    baseline: {
      last_location: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'US' },
      last_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      trusted_device_ids: ['dev_alex_macbook', 'dev_alex_iphone']
    },
    behaviour: {
      paste_detected: false,
      form_dwell_ms: 5800,
      mouse_jitter: 0.45,
      keystroke_cadence: {
        mean_ms: 175,
        std_dev_ms: 28
      }
    }
  },

  PERSONA_C: {
    id: 'persona_c',
    name: 'Persona C: Credential-Stuffing Bot',
    tag: 'Expected: BLOCK',
    description: 'Blacklisted botnet IP, zero mouse jitter, instant clipboard paste on card/CVV, submitted in 420ms, rapid repeat attempts.',
    expectedDecision: 'BLOCK',
    user_id: 'usr_sarah',
    amount: 1250.00,
    currency: 'USD',
    merchant_category: 'cryptocurrency',
    ip_address: '45.154.255.89', // Blacklisted botnet CIDR IP
    device: {
      device_id: 'dev_bot_headless_99',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
      screen_resolution: '800x600',
      color_depth: 24,
      timezone_offset: 0,
      language: 'en'
    },
    baseline: {
      last_location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'GB' },
      last_timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      trusted_device_ids: ['dev_sarah_iphone', 'dev_sarah_work_mac']
    },
    behaviour: {
      paste_detected: true,
      form_dwell_ms: 420,  // Superhuman fill speed <1s
      mouse_jitter: 0.0,   // Zero mouse movement entropy
      keystroke_cadence: {
        mean_ms: 8,
        std_dev_ms: 2      // Robotic
      }
    }
  }
};

module.exports = {
  PERSONAS
};

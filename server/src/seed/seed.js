const db = require('../repositories/db');
const userRepository = require('../repositories/userRepository');
const transactionRepository = require('../repositories/transactionRepository');
const auditRepository = require('../repositories/auditRepository');
const { CITIES } = require('../config/cities');
const crypto = require('crypto');

function hashCard(pan) {
  return crypto.createHash('sha256').update(pan).digest('hex');
}

function runSeed() {
  console.log('[Seed] Resetting and seeding database...');

  // Clear existing tables
  db.exec(`
    DELETE FROM audit_log;
    DELETE FROM transactions;
    DELETE FROM user_trusted_devices;
    DELETE FROM users;
  `);

  // 1. Seed 5 Users
  const users = [
    {
      id: 'usr_alex',
      name: 'Alex Chen',
      email: 'alex.chen@example.com',
      home_city: 'New York',
      home_lat: 40.7128,
      home_lng: -74.0060,
      avg_amount: 85.0,
      std_amount: 25.0,
      typical_keystroke_mean: 140.0,
      typical_keystroke_std: 35.0,
      created_at: new Date(Date.now() - 90 * 86400000).toISOString()
    },
    {
      id: 'usr_sarah',
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      home_city: 'London',
      home_lat: 51.5074,
      home_lng: -0.1278,
      avg_amount: 140.0,
      std_amount: 40.0,
      typical_keystroke_mean: 165.0,
      typical_keystroke_std: 42.0,
      created_at: new Date(Date.now() - 120 * 86400000).toISOString()
    },
    {
      id: 'usr_elena',
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      home_city: 'Berlin',
      home_lat: 52.5200,
      home_lng: 13.4050,
      avg_amount: 65.0,
      std_amount: 20.0,
      typical_keystroke_mean: 130.0,
      typical_keystroke_std: 30.0,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 'usr_marcus',
      name: 'Marcus Vance',
      email: 'mvance@example.com',
      home_city: 'San Francisco',
      home_lat: 37.7749,
      home_lng: -122.4194,
      avg_amount: 210.0,
      std_amount: 60.0,
      typical_keystroke_mean: 155.0,
      typical_keystroke_std: 38.0,
      created_at: new Date(Date.now() - 150 * 86400000).toISOString()
    },
    {
      id: 'usr_david',
      name: 'David Kim',
      email: 'david.kim@example.com',
      home_city: 'Singapore',
      home_lat: 1.3521,
      home_lng: 103.8198,
      avg_amount: 110.0,
      std_amount: 35.0,
      typical_keystroke_mean: 145.0,
      typical_keystroke_std: 32.0,
      created_at: new Date(Date.now() - 45 * 86400000).toISOString()
    }
  ];

  users.forEach(u => userRepository.createUser(u));
  console.log(`[Seed] Seeded ${users.length} user profiles.`);

  // 2. Seed Trusted Devices
  const trustedDevices = [
    { userId: 'usr_alex', deviceId: 'dev_alex_macbook', label: 'MacBook Pro 16" (Chrome 122)' },
    { userId: 'usr_alex', deviceId: 'dev_alex_iphone', label: 'iPhone 15 Pro (Safari Mobile)' },
    { userId: 'usr_sarah', deviceId: 'dev_sarah_iphone', label: 'iPhone 14 (Mobile App)' },
    { userId: 'usr_sarah', deviceId: 'dev_sarah_work_mac', label: 'Work iMac (Edge 121)' },
    { userId: 'usr_elena', deviceId: 'dev_elena_thinkpad', label: 'ThinkPad X1 Carbon (Firefox)' },
    { userId: 'usr_marcus', deviceId: 'dev_marcus_pixel', label: 'Pixel 8 Pro (Chrome Android)' },
    { userId: 'usr_david', deviceId: 'dev_david_ipad', label: 'iPad Air 5 (Safari)' }
  ];

  trustedDevices.forEach(d => userRepository.addTrustedDevice(d.userId, d.deviceId, d.label));
  console.log(`[Seed] Seeded ${trustedDevices.length} trusted user devices.`);

  // 3. Seed ~200 Historical Transactions over last 14 days
  const now = Date.now();
  const categories = ['groceries', 'retail', 'entertainment', 'travel', 'dining', 'electronics', 'utilities'];
  const totalHistorical = 200;

  for (let i = totalHistorical; i >= 1; i--) {
    // Distribute timestamps over past 14 days
    const minutesAgo = Math.round((i / totalHistorical) * 14 * 24 * 60) + Math.floor(Math.random() * 20);
    const txTime = new Date(now - minutesAgo * 60 * 1000).toISOString();

    const user = users[i % users.length];
    const rand = Math.random();

    let decision = 'ALLOW';
    let status = 'COMPLETED';
    let score = Math.floor(Math.random() * 25); // 0-24
    let amount = Number((user.avg_amount + (Math.random() * 2 - 1) * user.std_amount).toFixed(2));
    if (amount <= 5) amount = 24.99;

    let city = CITIES.find(c => c.name === user.home_city) || CITIES[0];
    let ip = `${city.ipPrefix}.${Math.floor(Math.random() * 200 + 10)}`;
    let deviceId = (trustedDevices.find(td => td.userId === user.id) || {}).deviceId || 'dev_trusted_generic';
    let signals = [];

    if (rand > 0.88) {
      // BLOCK
      decision = 'BLOCK';
      status = 'BLOCKED';
      score = Math.floor(Math.random() * 25) + 75; // 75-100
      amount = Number((user.avg_amount * 3.5 + Math.random() * 500).toFixed(2));
      signals = [
        { factor: 'hard_rate_limit_violation', weight: 60, detail: 'Velocity spike: >5 attempts within 60s' },
        { factor: 'clipboard_paste_sensitive_field', weight: 25, detail: 'Direct paste on card number / CVV' }
      ];
    } else if (rand > 0.72) {
      // CHALLENGE
      decision = 'CHALLENGE';
      score = Math.floor(Math.random() * 40) + 32; // 32-72
      // 70% of challenged passed
      const passed = Math.random() < 0.7;
      status = passed ? 'CHALLENGE_PASSED' : 'CHALLENGE_PENDING';
      const foreignCity = CITIES[(i + 3) % CITIES.length];
      city = foreignCity;
      ip = `${foreignCity.ipPrefix}.${Math.floor(Math.random() * 200 + 10)}`;
      deviceId = `dev_unknown_${i}`;
      signals = [
        { factor: 'impossible_travel', weight: 40, detail: `Displacement to ${foreignCity.name} with rapid velocity` },
        { factor: 'unrecognized_device', weight: 20, detail: 'New hardware fingerprint detected' }
      ];
    } else {
      // Normal ALLOW
      signals = [
        { factor: 'trusted_device', weight: -5, detail: 'Hardware fingerprint matches customer-verified trusted device' }
      ];
    }

    const txId = `txn_hist_${100000 + i}`;
    const category = categories[i % categories.length];
    const latency = Number((Math.random() * 15 + 8).toFixed(1));

    const txRecord = {
      id: txId,
      user_id: user.id,
      amount,
      currency: 'USD',
      merchant_category: category,
      card_last4: '4242',
      card_fingerprint: hashCard('4242424242424242'),
      ip_address: ip,
      city: city.name,
      country: city.country,
      lat: city.lat,
      lng: city.lng,
      device_id: deviceId,
      risk_score: score,
      decision,
      status,
      challenge_attempts: decision === 'CHALLENGE' ? 1 : 0,
      summary: decision === 'ALLOW' 
        ? 'Approved: Verified customer identity on a recognized device.' 
        : (decision === 'BLOCK' ? 'Blocked: Velocity breach and automated bot signals.' : 'Challenged: Geographic displacement and new device.'),
      latency_ms: latency,
      created_at: txTime
    };

    transactionRepository.createTransaction(txRecord);

    auditRepository.logEvent({
      transaction_id: txId,
      event_type: 'EVALUATION',
      signals,
      raw_telemetry: {
        device: { deviceId, userAgent: 'Mozilla/5.0' },
        behaviour: { formDwellMs: 12000, mouseJitter: 0.65 },
        geo: { city: city.name, country: city.country, lat: city.lat, lng: city.lng }
      },
      risk_score: score,
      decision
    });
  }

  // 4. Anchor a specific baseline transaction for Alex Chen exactly 10 minutes ago in New York!
  // This guarantees Persona B "Suspicious VPN Hop" (which submits from Berlin 10 minutes later)
  // will calculate an implied speed of >6,000 km/h and deterministically trigger impossible travel!
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const anchorTxn = {
    id: 'txn_anchor_alex_nyc',
    user_id: 'usr_alex',
    amount: 52.80,
    currency: 'USD',
    merchant_category: 'groceries',
    card_last4: '4242',
    card_fingerprint: hashCard('4242424242424242'),
    ip_address: '198.51.100.12', // New York IP
    city: 'New York',
    country: 'US',
    lat: 40.7128,
    lng: -74.0060,
    device_id: 'dev_alex_macbook',
    risk_score: 12,
    decision: 'ALLOW',
    status: 'COMPLETED',
    challenge_attempts: 0,
    summary: 'Approved: Verified customer identity on home trusted device.',
    latency_ms: 11.4,
    created_at: tenMinutesAgo
  };

  transactionRepository.createTransaction(anchorTxn);
  auditRepository.logEvent({
    transaction_id: anchorTxn.id,
    event_type: 'EVALUATION',
    signals: [{ factor: 'trusted_device', weight: -5, detail: 'Verified device' }],
    raw_telemetry: {
      geo: { city: 'New York', country: 'US', lat: 40.7128, lng: -74.0060 }
    },
    risk_score: 12,
    decision: 'ALLOW'
  });

  console.log(`[Seed] Seeded ${totalHistorical + 1} transactions with audit log records.`);
  console.log('[Seed] Database ready for live demo!');
}

if (require.main === module) {
  runSeed();
  process.exit(0);
}

module.exports = { runSeed };

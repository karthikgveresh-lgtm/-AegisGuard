const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'risk_engine.db');
const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys for high concurrency & integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    home_city TEXT NOT NULL,
    home_lat REAL NOT NULL,
    home_lng REAL NOT NULL,
    avg_amount REAL NOT NULL DEFAULT 100.0,
    std_amount REAL NOT NULL DEFAULT 40.0,
    typical_keystroke_mean REAL NOT NULL DEFAULT 150.0,
    typical_keystroke_std REAL NOT NULL DEFAULT 40.0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_trusted_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    label TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    merchant_category TEXT NOT NULL,
    card_last4 TEXT NOT NULL,
    card_fingerprint TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    device_id TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    raw_score INTEGER NOT NULL DEFAULT 0,
    is_hard_block INTEGER NOT NULL DEFAULT 0,
    decision TEXT NOT NULL,
    status TEXT NOT NULL,
    challenge_attempts INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    latency_ms REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_ip ON transactions(ip_address, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_device ON transactions(device_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    signals_json TEXT NOT NULL,
    raw_telemetry_json TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    decision TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_log_txn ON audit_log(transaction_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
`);

// Safe migrations for existing SQLite database files
try {
  db.exec('ALTER TABLE transactions ADD COLUMN raw_score INTEGER NOT NULL DEFAULT 0');
} catch (e) {
  // column already exists
}
try {
  db.exec('ALTER TABLE transactions ADD COLUMN is_hard_block INTEGER NOT NULL DEFAULT 0');
} catch (e) {
  // column already exists
}

module.exports = db;

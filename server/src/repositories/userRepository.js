const db = require('./db');

class UserRepository {
  getUserById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) || null;
  }

  getAllUsers() {
    const stmt = db.prepare('SELECT * FROM users ORDER BY name ASC');
    return stmt.all();
  }

  getTrustedDevices(userId) {
    const stmt = db.prepare('SELECT * FROM user_trusted_devices WHERE user_id = ?');
    return stmt.all(userId);
  }

  isDeviceTrusted(userId, deviceId) {
    if (!userId || !deviceId) return false;
    const stmt = db.prepare('SELECT 1 FROM user_trusted_devices WHERE user_id = ? AND device_id = ?');
    const result = stmt.get(userId, deviceId);
    return Boolean(result);
  }

  addTrustedDevice(userId, deviceId, label = 'Verified Device') {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO user_trusted_devices (user_id, device_id, label, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, device_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
    `);
    return stmt.run(userId, deviceId, label, now, now);
  }

  createUser(user) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (
        id, name, email, home_city, home_lat, home_lng,
        avg_amount, std_amount, typical_keystroke_mean, typical_keystroke_std, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      user.id,
      user.name,
      user.email,
      user.home_city,
      user.home_lat,
      user.home_lng,
      user.avg_amount ?? 100.0,
      user.std_amount ?? 40.0,
      user.typical_keystroke_mean ?? 150.0,
      user.typical_keystroke_std ?? 40.0,
      user.created_at || new Date().toISOString()
    );
  }
}

module.exports = new UserRepository();

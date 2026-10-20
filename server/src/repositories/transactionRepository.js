const db = require('./db');

class TransactionRepository {
  createTransaction(tx) {
    const stmt = db.prepare(`
      INSERT INTO transactions (
        id, user_id, amount, currency, merchant_category,
        card_last4, card_fingerprint, ip_address, city, country,
        lat, lng, device_id, risk_score, raw_score, is_hard_block, decision, status,
        challenge_attempts, summary, latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      tx.id,
      tx.user_id,
      tx.amount,
      tx.currency || 'USD',
      tx.merchant_category,
      tx.card_last4,
      tx.card_fingerprint,
      tx.ip_address,
      tx.city,
      tx.country,
      tx.lat,
      tx.lng,
      tx.device_id,
      tx.risk_score,
      tx.raw_score || 0,
      tx.is_hard_block ? 1 : 0,
      tx.decision,
      tx.status,
      tx.challenge_attempts || 0,
      tx.summary || '',
      tx.latency_ms || 0,
      tx.created_at || new Date().toISOString()
    );

    return this.getTransactionById(tx.id);
  }

  getTransactionById(id) {
    const stmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    return stmt.get(id) || null;
  }

  getLastTransactionForUser(userId, excludeId = null) {
    if (!userId) return null;
    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';
    const stmt = db.prepare(query);
    return stmt.get(...params) || null;
  }

  countAttemptsInWindow({ userId, ip, deviceId, windowSeconds = 60, excludeId = null }) {
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const byIp = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE ip_address = ? AND created_at >= ? ${excludeId ? 'AND id != ?' : ''}
    `).get(...(excludeId ? [ip, windowStart, excludeId] : [ip, windowStart])).count;

    const byDevice = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE device_id = ? AND created_at >= ? ${excludeId ? 'AND id != ?' : ''}
    `).get(...(excludeId ? [deviceId, windowStart, excludeId] : [deviceId, windowStart])).count;

    let byUser = 0;
    if (userId) {
      byUser = db.prepare(`
        SELECT COUNT(*) as count FROM transactions 
        WHERE user_id = ? AND created_at >= ? ${excludeId ? 'AND id != ?' : ''}
      `).get(...(excludeId ? [userId, windowStart, excludeId] : [userId, windowStart])).count;
    }

    return {
      byIp,
      byDevice,
      byUser,
      max: Math.max(byIp, byDevice, byUser)
    };
  }

  getRecentTransactions({ limit = 50, offset = 0, decision = null, search = null } = {}) {
    let sql = 'SELECT * FROM transactions';
    const conditions = [];
    const params = [];

    if (decision && decision !== 'ALL') {
      conditions.push('decision = ?');
      params.push(decision);
    }

    if (search) {
      conditions.push('(id LIKE ? OR user_id LIKE ? OR city LIKE ? OR ip_address LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  updateTransactionStatus(id, { status, challenge_attempts, decision = null }) {
    let query = 'UPDATE transactions SET status = ?, challenge_attempts = ?';
    const params = [status, challenge_attempts];

    if (decision) {
      query += ', decision = ?';
      params.push(decision);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const stmt = db.prepare(query);
    stmt.run(...params);
    return this.getTransactionById(id);
  }

  getMetrics() {
    const totalRow = db.prepare('SELECT COUNT(*) as total FROM transactions').get();
    const total = totalRow.total || 0;

    const decisionBreakdown = db.prepare(`
      SELECT decision, COUNT(*) as count 
      FROM transactions 
      GROUP BY decision
    `).all();

    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM transactions 
      GROUP BY status
    `).all();

    const latencyRow = db.prepare('SELECT AVG(latency_ms) as avg_latency FROM transactions').get();

    let allowed = 0;
    let challenged = 0;
    let blocked = 0;
    let challengePassed = 0;

    decisionBreakdown.forEach(row => {
      if (row.decision === 'ALLOW') allowed = row.count;
      if (row.decision === 'CHALLENGE') challenged = row.count;
      if (row.decision === 'BLOCK') blocked = row.count;
    });

    statusBreakdown.forEach(row => {
      if (row.status === 'CHALLENGE_PASSED') challengePassed = row.count;
    });

    const approvalRate = total > 0 ? Number(((allowed + challengePassed) / total * 100).toFixed(1)) : 0;
    const challengePassRate = challenged > 0 ? Number((challengePassed / challenged * 100).toFixed(1)) : 0;
    const blockRate = total > 0 ? Number((blocked / total * 100).toFixed(1)) : 0;
    const avgLatency = latencyRow.avg_latency ? Number(latencyRow.avg_latency.toFixed(1)) : 0;

    // Risk score histogram (10 buckets of 10)
    const buckets = [
      { range: '0-9', count: 0 },
      { range: '10-19', count: 0 },
      { range: '20-29', count: 0 },
      { range: '30-39', count: 0 },
      { range: '40-49', count: 0 },
      { range: '50-59', count: 0 },
      { range: '60-69', count: 0 },
      { range: '70-79', count: 0 },
      { range: '80-89', count: 0 },
      { range: '90-100', count: 0 },
    ];

    const allScores = db.prepare('SELECT risk_score FROM transactions').all();
    allScores.forEach(row => {
      const score = Math.min(100, Math.max(0, row.risk_score));
      const idx = Math.min(9, Math.floor(score / 10));
      buckets[idx].count++;
    });

    return {
      totalTransactions: total,
      allowed,
      challenged,
      blocked,
      challengePassed,
      approvalRate,
      challengePassRate,
      blockRate,
      avgLatencyMs: avgLatency,
      scoreDistribution: buckets
    };
  }
}

module.exports = new TransactionRepository();

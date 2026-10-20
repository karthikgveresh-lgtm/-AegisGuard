const db = require('./db');

class AuditRepository {
  logEvent({
    transaction_id,
    event_type = 'EVALUATION',
    signals = [],
    raw_telemetry = {},
    risk_score = 0,
    decision = 'ALLOW'
  }) {
    const stmt = db.prepare(`
      INSERT INTO audit_log (
        transaction_id, event_type, signals_json, raw_telemetry_json, risk_score, decision, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    return stmt.run(
      transaction_id,
      event_type,
      JSON.stringify(signals),
      JSON.stringify(raw_telemetry),
      risk_score,
      decision,
      now
    );
  }

  getLogsForTransaction(transactionId) {
    const stmt = db.prepare(`
      SELECT * FROM audit_log WHERE transaction_id = ? ORDER BY created_at ASC
    `);
    const rows = stmt.all(transactionId);
    return rows.map(r => ({
      ...r,
      signals: JSON.parse(r.signals_json || '[]'),
      raw_telemetry: JSON.parse(r.raw_telemetry_json || '{}')
    }));
  }

  getTopSignals(limit = 6) {
    const rows = db.prepare(`
      SELECT signals_json FROM audit_log WHERE event_type = 'EVALUATION' ORDER BY id DESC LIMIT 500
    `).all();

    const counts = {};
    rows.forEach(r => {
      try {
        const signals = JSON.parse(r.signals_json || '[]');
        signals.forEach(s => {
          if (s.factor) {
            counts[s.factor] = (counts[s.factor] || 0) + 1;
          }
        });
      } catch (e) {
        // ignore parse error
      }
    });

    const sorted = Object.entries(counts)
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sorted;
  }
}

module.exports = new AuditRepository();

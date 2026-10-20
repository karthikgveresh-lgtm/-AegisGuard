import React, { useState } from 'react';
import { Search, Filter, Shield, ExternalLink, ArrowUpDown } from 'lucide-react';

export default function LiveTransactionTable({
  transactions = [],
  onSelectTransaction,
  selectedId
}) {
  const [filterDecision, setFilterDecision] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    if (filterDecision !== 'ALL' && tx.decision !== filterDecision) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (tx.id || '').toLowerCase().includes(q);
      const matchUser = (tx.user_id || '').toLowerCase().includes(q);
      const matchCity = (tx.city || '').toLowerCase().includes(q);
      const matchIp = (tx.ip_address || '').toLowerCase().includes(q);
      return matchId || matchUser || matchCity || matchIp;
    }
    return true;
  });

  const getBadge = (decision, status) => {
    if (status === 'CHALLENGE_PASSED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
          PASSED
        </span>
      );
    }
    if (decision === 'ALLOW') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
          ALLOW
        </span>
      );
    }
    if (decision === 'CHALLENGE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
          CHALLENGE
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800">
        BLOCK
      </span>
    );
  };

  const getScoreColor = (score) => {
    if (score < 30) return 'text-emerald-400';
    if (score < 75) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden text-slate-200">
      {/* Controls Bar: Search & Filter Pills */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, User, City, IP..."
              className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 sm:w-64"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            Showing {filtered.length} of {transactions.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5">
          {['ALL', 'ALLOW', 'CHALLENGE', 'BLOCK'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterDecision(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                filterDecision === f
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="bg-[#0b0f19] text-slate-400 sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Decision</th>
              <th className="py-2.5 px-4 font-semibold">Transaction ID</th>
              <th className="py-2.5 px-4 font-semibold">Customer</th>
              <th className="py-2.5 px-4 font-semibold">Amount</th>
              <th className="py-2.5 px-4 font-semibold">Location / IP</th>
              <th className="py-2.5 px-4 font-semibold">Risk Score</th>
              <th className="py-2.5 px-4 font-semibold">Latency</th>
              <th className="py-2.5 px-4 font-semibold text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                  No matching transactions in stream.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isSelected = selectedId === tx.id;
                return (
                  <tr
                    key={tx.id}
                    onClick={() => onSelectTransaction(tx.id)}
                    className={`cursor-pointer transition-colors animate-fade-in ${
                      isSelected
                        ? 'bg-cyan-950/40 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono">
                      {getBadge(tx.decision, tx.status)}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-200">
                      <span className="flex items-center space-x-1.5">
                        <span className="hover:text-cyan-400">{tx.id}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 opacity-60" />
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {tx.user_id}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ${Number(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div className="text-xs">
                        {tx.city}, {tx.country}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {tx.ip_address}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${getScoreColor(tx.risk_score)}`}>
                          {tx.risk_score}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              tx.risk_score < 30
                                ? 'bg-emerald-500'
                                : tx.risk_score < 75
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, tx.risk_score)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {tx.latency_ms ? `${tx.latency_ms} ms` : '12 ms'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-right text-[11px]">
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#090d16] flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>
          Showing {filtered.length} of {transactions.length}
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
          <span>Click any row to inspect telemetry & factor audit trail</span>
        </div>
      </div>
    </div>
  );
}

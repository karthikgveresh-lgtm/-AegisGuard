import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, Shield, Info } from 'lucide-react';

export default function SignalBreakdown({ evaluation, defaultExpanded = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!evaluation) return null;

  const { signals = [], risk_score = 0, raw_score = 0, summary, decision } = evaluation;

  // Calculate sum of weights
  const totalWeight = signals.reduce((acc, s) => acc + (s.weight || 0), 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden text-xs">
      {/* Header bar with toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">
            Explainable Risk Signals Breakdown
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            {signals.length} {signals.length === 1 ? 'signal' : 'signals'} evaluated
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[11px] text-cyan-400">
            Weights Sum: <strong className="text-white">{totalWeight}</strong>
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Signal Details */}
      {isExpanded && (
        <div className="p-4 pt-1 border-t border-slate-800 space-y-3">
          {/* Natural language summary */}
          {summary && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-medium text-xs flex items-start space-x-2">
              <span className="text-cyan-400 text-sm leading-none mt-0.5">💡</span>
              <p>{summary}</p>
            </div>
          )}

          {/* List of signals sorted descending */}
          <div className="space-y-2">
            {signals.length === 0 ? (
              <p className="text-slate-400 italic py-2 text-center">
                No adverse signals triggered. Standard risk profile.
              </p>
            ) : (
              signals.map((sig, idx) => {
                const isDiscount = sig.weight < 0;
                const isHigh = sig.weight >= 30;
                const isMed = sig.weight >= 15 && sig.weight < 30;

                let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                if (isDiscount) {
                  badgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50';
                } else if (isHigh) {
                  badgeColor = 'bg-rose-950/60 text-rose-300 border-rose-800/50';
                } else if (isMed) {
                  badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-800/50';
                }

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start justify-between space-x-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-slate-200">
                          {sig.factor}
                        </span>
                        {isDiscount && (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            (Trust Bonus)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {sig.detail}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded border ${badgeColor}`}
                      >
                        {sig.weight > 0 ? `+${sig.weight}` : sig.weight}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Transparent Weight Sum Footer */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col space-y-1.5 text-[11px] font-mono">
            <div className="flex flex-wrap items-center justify-between text-slate-300">
              <div>
                Raw total <strong className="text-white font-bold">{totalWeight.toLocaleString('en-US')} pts</strong> → normalized <strong className="text-cyan-400 font-bold">{risk_score}/100</strong>
                {totalWeight > 100 && (
                  <span className="ml-2 text-[10px] font-sans font-medium text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                    capped/curved via diminishing returns
                  </span>
                )}
              </div>
              <div>
                <span
                  className={`font-bold ${
                    decision === 'ALLOW'
                      ? 'text-emerald-400'
                      : decision === 'CHALLENGE'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  Decision: {decision}
                </span>
              </div>
            </div>
            {evaluation.is_hard_block && (
              <div className="text-rose-400 text-[10px] font-semibold flex items-center">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1 text-rose-400" />
                Hard-block rule triggered (pre-filter override)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

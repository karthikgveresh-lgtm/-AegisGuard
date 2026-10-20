import React, { useState, useEffect } from 'react';
import { X, Shield, Cpu, MousePointer, Globe, History, CheckCircle2, AlertTriangle, XOctagon, Info } from 'lucide-react';
import { getTransactionDetails } from '../../services/api';

export default function TransactionInspectorDrawer({ transactionId, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('signals'); // 'signals', 'telemetry', 'audit'

  useEffect(() => {
    if (transactionId) {
      setLoading(true);
      getTransactionDetails(transactionId)
        .then(data => {
          setDetails(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading transaction details:', err);
          setLoading(false);
        });
    }
  }, [transactionId]);

  if (!transactionId) return null;

  const tx = details?.transaction;
  const auditTrail = details?.auditTrail || [];
  const latestEvaluation = auditTrail.find(a => a.event_type === 'EVALUATION') || {};
  const signals = latestEvaluation.signals || [];
  const rawTelemetry = latestEvaluation.raw_telemetry || {};

  // Check if hard-block pre-filter was triggered
  const isHardBlock = Boolean(
    tx?.is_hard_block || 
    tx?.isHardBlock || 
    latestEvaluation?.raw_telemetry?.is_hard_block ||
    signals.some(s => 
      s.factor === 'blacklisted_ip_or_subnet' || 
      s.factor === 'hard_rate_limit_violation' || 
      s.factor === 'severe_impossible_travel' || 
      s.factor === 'hard_velocity_breach'
    )
  );

  // Raw score sum
  const rawScore = Number(tx?.raw_score ?? signals.reduce((acc, s) => acc + (s.weight || 0), 0));
  const targetScore = Number(tx?.risk_score || 0);

  // Proportional scaling for signals so positive signal contributions add up exactly to displayed targetScore
  const positiveSignals = signals.filter(s => (s.weight || 0) > 0);
  const positiveRawSum = positiveSignals.reduce((acc, s) => acc + s.weight, 0);

  let factorToScaled = new Map();
  if (targetScore > 0 && positiveRawSum > 0) {
    // Largest remainder method for exact integer sum matching targetScore
    const unrounded = positiveSignals.map(s => ({
      factor: s.factor,
      exact: (s.weight / positiveRawSum) * targetScore,
      floor: Math.floor((s.weight / positiveRawSum) * targetScore)
    }));
    const currentSum = unrounded.reduce((sum, item) => sum + item.floor, 0);
    const diff = targetScore - currentSum;
    const remainders = unrounded
      .map((item, index) => ({ index, remainder: item.exact - item.floor }))
      .sort((a, b) => b.remainder - a.remainder);
    const allocated = unrounded.map(item => item.floor);
    for (let i = 0; i < diff && i < remainders.length; i++) {
      allocated[remainders[i].index]++;
    }
    positiveSignals.forEach((s, idx) => {
      factorToScaled.set(s.factor, allocated[idx]);
    });
  }

  const scaledSignals = signals.map(s => {
    const rawWeight = s.weight || 0;
    const scaledWeight = rawWeight <= 0 ? rawWeight : (factorToScaled.get(s.factor) ?? 0);
    return {
      ...s,
      rawWeight,
      scaledWeight
    };
  });

  const getDecisionBadge = (decision, status) => {
    if (status === 'CHALLENGE_PASSED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
          CHALLENGE PASSED
        </span>
      );
    }
    if (decision === 'ALLOW') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
          ALLOW
        </span>
      );
    }
    if (decision === 'CHALLENGE') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-950 text-amber-400 border border-amber-800">
          CHALLENGE
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-rose-950 text-rose-400 border border-rose-800">
        BLOCK
      </span>
    );
  };

  const getScoreColor = (score) => {
    if (score < 30) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (score < 75) return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl h-full bg-[#0a0e17] border-l border-slate-800 flex flex-col shadow-2xl animate-slide-in-right">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/50 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-sm font-bold text-white font-mono">{transactionId}</h3>
                {tx && getDecisionBadge(tx.decision, tx.status)}
                {isHardBlock && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1 shadow-sm">
                    <AlertTriangle className="w-3 h-3 inline mr-1 text-rose-400" />
                    Hard-block rule triggered
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated: {tx ? new Date(tx.created_at).toLocaleString('en-US') : '...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 pt-3 bg-slate-900/30 space-x-2">
          <button
            onClick={() => setActiveTab('signals')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'signals'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Risk Factors ({signals.length})
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'telemetry'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Telemetry
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'audit'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Trail ({auditTrail.length})
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Loading transaction audit dossier...
            </div>
          ) : !tx ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Transaction not found.
            </div>
          ) : (
            <>
              {/* Top Score & Summary Banner */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block">
                      Normalized Risk Score
                    </span>
                    <div className="flex items-baseline space-x-2 mt-0.5">
                      <span className={`text-3xl font-extrabold font-mono ${tx.risk_score < 30 ? 'text-emerald-400' : (tx.risk_score < 75 ? 'text-amber-400' : 'text-rose-400')}`}>
                        {tx.risk_score}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">/ 100</span>
                    </div>
                  </div>

                  <div className="text-right text-xs space-y-1">
                    <div>
                      <span className="text-slate-400">Customer: </span>
                      <strong className="text-white font-mono">{tx.user_id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Amount: </span>
                      <strong className="text-cyan-400 font-mono">
                        ${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Card: </span>
                      <span className="text-slate-300 font-mono">•••• {tx.card_last4}</span>
                    </div>
                  </div>
                </div>

                {/* Scoring Maths Under Score */}
                <div className="pt-2.5 border-t border-slate-800 flex flex-col space-y-1">
                  <div className="text-xs font-mono text-slate-300">
                    Raw total <strong className="text-white font-bold">{rawScore.toLocaleString('en-US')} pts</strong> → normalized <strong className="text-cyan-400 font-bold">{tx.risk_score}/100</strong>
                    {rawScore > 100 && (
                      <span className="ml-2 text-[11px] font-sans font-medium text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                        capped/curved via diminishing returns
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Latency: <strong className="text-white font-mono">{Number(tx.latency_ms || 0).toLocaleString('en-US')} ms</strong></span>
                    {isHardBlock && (
                      <span className="text-[11px] font-mono text-rose-400 font-semibold flex items-center">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-rose-400" />
                        Hard-block rule triggered
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Explainability One-Liner */}
              {tx.summary && (
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-start space-x-2">
                  <span className="text-base leading-none">💡</span>
                  <p className="leading-relaxed">{tx.summary}</p>
                </div>
              )}

              {/* TAB 1: Contributing Risk Signals */}
              {activeTab === 'signals' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Ordered Contributing Signals
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Signal contributions scale proportionally to score ({tx.risk_score} pts total)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-mono text-cyan-400">
                        Sum of raw weights: <strong className="text-white font-bold">{rawScore.toLocaleString('en-US')} pts</strong>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {scaledSignals.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        No adverse signals triggered.
                      </p>
                    ) : (
                      scaledSignals.map((sig, idx) => {
                        const isNegative = sig.rawWeight < 0;
                        const isHigh = sig.rawWeight >= 30;

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold text-xs text-white">
                                {sig.factor}
                              </span>
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                    isNegative
                                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                      : isHigh
                                      ? 'bg-rose-950 text-rose-400 border-rose-800'
                                      : 'bg-amber-950 text-amber-400 border-amber-800'
                                  }`}
                                >
                                  {sig.scaledWeight > 0 ? `+${sig.scaledWeight} pts` : `${sig.scaledWeight} pts`}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                                  raw: {sig.rawWeight > 0 ? `+${sig.rawWeight}` : sig.rawWeight}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              {sig.detail}
                            </p>
                            {sig.raw && (
                              <div className="pt-1 text-[10px] font-mono text-slate-500 truncate">
                                Raw: {JSON.stringify(sig.raw)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Raw Telemetry */}
              {activeTab === 'telemetry' && (
                <div className="space-y-4 text-xs font-mono">
                  {/* Hardware / Device */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center space-x-2 text-cyan-400 font-sans font-semibold text-xs">
                      <Cpu className="w-4 h-4" />
                      <span>Device & Hardware Fingerprint</span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[11px]">
                      <div><span className="text-slate-400">Device ID:</span> {tx.device_id}</div>
                      <div><span className="text-slate-400">User Agent:</span> {rawTelemetry.device?.userAgent || rawTelemetry.device?.user_agent || 'Mozilla/5.0'}</div>
                      <div><span className="text-slate-400">Screen Res:</span> {rawTelemetry.device?.screenResolution || rawTelemetry.device?.screen_resolution || '1920x1080'}</div>
                      <div><span className="text-slate-400">Color Depth:</span> {Number(rawTelemetry.device?.colorDepth || rawTelemetry.device?.color_depth || 24).toLocaleString('en-US')} bit</div>
                      <div>
                        <span className="text-slate-400">Timezone Offset:</span> {
                          (() => {
                            const tz = Number(rawTelemetry.device?.timezoneOffset ?? rawTelemetry.device?.timezone_offset ?? 0);
                            return Math.abs(tz) === 1 ? `${tz} minute` : `${tz.toLocaleString('en-US')} minutes`;
                          })()
                        }
                      </div>
                    </div>
                  </div>

                  {/* Behavioral Telemetry */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center space-x-2 text-cyan-400 font-sans font-semibold text-xs">
                      <MousePointer className="w-4 h-4" />
                      <span>Behavioral Dynamics</span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[11px]">
                      <div>
                        <span className="text-slate-400">Form Dwell Time:</span> {
                          (() => {
                            const dwell = Number(rawTelemetry.behaviour?.formDwellMs ?? rawTelemetry.behaviour?.form_dwell_ms ?? 0);
                            return `${dwell.toLocaleString('en-US')} ms`;
                          })()
                        }
                      </div>
                      <div><span className="text-slate-400">Mouse Jitter Score:</span> {rawTelemetry.behaviour?.mouseJitter ?? rawTelemetry.behaviour?.mouse_jitter ?? 0.5} (bot &le; 0.05)</div>
                      <div><span className="text-slate-400">Paste Detected:</span> {String(rawTelemetry.behaviour?.pasteDetected ?? rawTelemetry.behaviour?.paste_detected ?? false)}</div>
                      <div><span className="text-slate-400">Keystroke Cadence:</span> {JSON.stringify(rawTelemetry.behaviour?.keystrokeCadence || rawTelemetry.behaviour?.keystroke_cadence || {})}</div>
                    </div>
                  </div>

                  {/* Geolocation Telemetry */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center space-x-2 text-cyan-400 font-sans font-semibold text-xs">
                      <Globe className="w-4 h-4" />
                      <span>Network & Geolocation</span>
                    </div>
                    <div className="space-y-1 text-slate-300 text-[11px]">
                      <div><span className="text-slate-400">Simulated IP:</span> {tx.ip_address}</div>
                      <div><span className="text-slate-400">City / Country:</span> {tx.city}, {tx.country}</div>
                      <div><span className="text-slate-400">Coordinates:</span> {Number(tx.lat).toLocaleString('en-US')}, {Number(tx.lng).toLocaleString('en-US')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Audit Trail */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Immutable Audit Trail
                  </h4>

                  <div className="space-y-2.5">
                    {auditTrail.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-cyan-400">
                            #{log.id} • {log.event_type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Decision: <strong className="text-slate-200">{log.decision}</strong> | Score: <strong className="text-slate-200">{log.risk_score}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          Telemetry: {JSON.stringify(log.raw_telemetry)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

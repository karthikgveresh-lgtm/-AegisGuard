import React from 'react';
import { Activity, CheckCircle2, ShieldAlert, XOctagon, Clock, TrendingUp } from 'lucide-react';

export default function MetricsBar({ metrics }) {
  if (!metrics) return null;

  const {
    totalTransactions = 0,
    approvalRate = 0,
    challengePassRate = 0,
    blockRate = 0,
    avgLatencyMs = 0,
    allowed = 0,
    challenged = 0,
    blocked = 0
  } = metrics;

  const cards = [
    {
      title: 'Total Evaluated',
      value: totalTransactions.toLocaleString(),
      subtext: `${allowed} allow • ${challenged} chal • ${blocked} blk`,
      icon: Activity,
      color: 'cyan',
      textColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30'
    },
    {
      title: 'Approval Rate',
      value: `${approvalRate}%`,
      subtext: 'Allowed + passed step-up',
      icon: CheckCircle2,
      color: 'emerald',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30'
    },
    {
      title: 'Challenge Pass Rate',
      value: `${challengePassRate}%`,
      subtext: 'Step-up OTP completions',
      icon: ShieldAlert,
      color: 'amber',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30'
    },
    {
      title: 'Block Rate',
      value: `${blockRate}%`,
      subtext: 'Automated fraud mitigated',
      icon: XOctagon,
      color: 'rose',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/30'
    },
    {
      title: 'Avg Decision Latency',
      value: `${avgLatencyMs} ms`,
      subtext: 'Low-latency pipeline',
      icon: Clock,
      color: 'blue',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`glass-panel rounded-xl p-4 border ${card.borderColor} bg-slate-900/60 relative overflow-hidden`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 truncate">
                {card.title}
              </span>
              <Icon className={`w-4 h-4 ${card.textColor}`} />
            </div>

            <div className="mt-2 flex items-baseline space-x-2">
              <span className={`text-2xl font-bold font-mono ${card.textColor}`}>
                {card.value}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}

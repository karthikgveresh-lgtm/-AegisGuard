import React from 'react';
import { UserCheck, ShieldAlert, Bot, Sliders, CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react';

export default function PersonaSelector({ selectedPersona, onSelectPersona, personas }) {
  const personaCards = [
    {
      id: 'persona_a',
      title: 'Persona A',
      subtitle: 'Returning Customer',
      outcome: 'ALLOW',
      color: 'emerald',
      icon: UserCheck,
      badgeText: 'Expected: ALLOW (0–29)',
      summary: 'Alex Chen • Trusted device • Home IP (NYC) • Normal human typing & dwell time'
    },
    {
      id: 'persona_b',
      title: 'Persona B',
      subtitle: 'Suspicious VPN Hop',
      outcome: 'CHALLENGE',
      color: 'amber',
      icon: ShieldAlert,
      badgeText: 'Expected: CHALLENGE (30–74)',
      summary: 'New device • IP routed to Miami (~1,750 km in 10m = >10,000 km/h) • Triggers OTP'
    },
    {
      id: 'persona_c',
      title: 'Persona C',
      subtitle: 'Credential-Stuffing Bot',
      outcome: 'BLOCK',
      color: 'rose',
      icon: Bot,
      badgeText: 'Expected: BLOCK (75–100)',
      summary: 'Blacklisted IP subnet • Zero mouse jitter • Direct paste on card • <1s submit'
    },
    {
      id: 'custom',
      title: 'Custom Mode',
      subtitle: 'Interactive Signal Playground',
      outcome: 'CUSTOM',
      color: 'cyan',
      icon: Sliders,
      badgeText: 'Judge Sandbox',
      summary: 'Freely adjust dwell time, mouse entropy, paste, typing cadence & IP locations'
    }
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Demo Persona Presets
        </h3>
        <span className="text-[11px] text-slate-400">
          One-click deterministic profiles for judges
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {personaCards.map((card) => {
          const isSelected = selectedPersona === card.id;
          const Icon = card.icon;

          let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-900/60';
          let badgeClass = 'bg-slate-800 text-slate-400';
          let iconBg = 'bg-slate-800 text-slate-300';

          if (card.outcome === 'ALLOW') {
            if (isSelected) {
              borderClass = 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/50 glow-emerald';
              badgeClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
              iconBg = 'bg-emerald-500 text-slate-950';
            }
          } else if (card.outcome === 'CHALLENGE') {
            if (isSelected) {
              borderClass = 'border-amber-500/80 bg-amber-950/20 ring-1 ring-amber-500/50 glow-amber';
              badgeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
              iconBg = 'bg-amber-500 text-slate-950';
            }
          } else if (card.outcome === 'BLOCK') {
            if (isSelected) {
              borderClass = 'border-rose-500/80 bg-rose-950/20 ring-1 ring-rose-500/50 glow-rose';
              badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
              iconBg = 'bg-rose-500 text-white';
            }
          } else {
            // Custom
            if (isSelected) {
              borderClass = 'border-cyan-500/80 bg-cyan-950/20 ring-1 ring-cyan-500/50 glow-cyan';
              badgeClass = 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
              iconBg = 'bg-cyan-500 text-slate-950';
            }
          }

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectPersona(card.id)}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${borderClass}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg transition-transform group-hover:scale-105 ${iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                  {card.badgeText}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  {card.title}: {card.subtitle}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  {card.summary}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

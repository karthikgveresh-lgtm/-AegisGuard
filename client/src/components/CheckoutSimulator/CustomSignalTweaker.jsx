import React from 'react';
import { Sliders, MousePointer, Clock, Type, Shield, Globe, DollarSign } from 'lucide-react';

export default function CustomSignalTweaker({ config, onChangeConfig, users, cities }) {
  const update = (key, val) => {
    onChangeConfig({ ...config, [key]: val });
  };

  const updateBehaviour = (key, val) => {
    onChangeConfig({
      ...config,
      behaviour: { ...config.behaviour, [key]: val }
    });
  };

  const updateCadence = (key, val) => {
    onChangeConfig({
      ...config,
      behaviour: {
        ...config.behaviour,
        keystroke_cadence: {
          ...config.behaviour.keystroke_cadence,
          [key]: val
        }
      }
    });
  };

  return (
    <div className="glass-panel-elevated rounded-2xl p-5 border border-cyan-800/40 text-slate-200 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-700/50 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-wide uppercase">
              Interactive Risk Signal Playground
            </h4>
            <p className="text-[11px] text-slate-400">
              Adjust telemetry parameters to test engine threshold reactions
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
          Sandbox Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Column 1: Transaction & User */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Transaction Context</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Customer Account</label>
            <select
              value={config.user_id}
              onChange={(e) => update('user_id', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="usr_alex">Alex Chen (Home: New York, avg $85)</option>
              <option value="usr_sarah">Sarah Jenkins (Home: London, avg $140)</option>
              <option value="usr_elena">Elena Rostova (Home: Berlin, avg $65)</option>
              <option value="usr_marcus">Marcus Vance (Home: San Francisco, avg $210)</option>
              <option value="usr_david">David Kim (Home: Singapore, avg $110)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Order Amount</label>
              <span className="font-mono text-cyan-300 font-bold">${config.amount}</span>
            </div>
            <input
              type="range"
              min="10"
              max="1500"
              step="10"
              value={config.amount}
              onChange={(e) => update('amount', Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Merchant Category</label>
            <select
              value={config.merchant_category}
              onChange={(e) => update('merchant_category', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="electronics">Electronics (Standard)</option>
              <option value="groceries">Groceries (Low Risk)</option>
              <option value="cryptocurrency">Cryptocurrency (High Risk +15)</option>
              <option value="gift_cards">Gift Cards (High Risk +15)</option>
              <option value="luxury_jewelry">Luxury Jewelry (High Risk +15)</option>
            </select>
          </div>
        </div>

        {/* Column 2: Geo & Network Location */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            <span>Simulated IP & Geo</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Network Route</label>
            <select
              value={config.ip_address}
              onChange={(e) => update('ip_address', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            >
              <optgroup label="Standard Cities">
                <option value="198.51.100.15">New York, US (198.51.100.15)</option>
                <option value="198.51.116.42">Miami, US (~1,750 km from NYC)</option>
                <option value="198.51.102.20">London, GB (198.51.102.20)</option>
                <option value="198.51.103.35">Berlin, DE (198.51.103.35)</option>
                <option value="198.51.101.55">San Francisco, US (198.51.101.55)</option>
                <option value="198.51.106.88">Singapore, SG (198.51.106.88)</option>
                <option value="198.51.105.12">Tokyo, JP (198.51.105.12)</option>
              </optgroup>
              <optgroup label="⚠️ Threat Intelligence Blacklists">
                <option value="45.154.255.89">45.154.255.89 (Botnet Cluster)</option>
                <option value="185.220.101.5">185.220.101.5 (Darknet Exit)</option>
                <option value="198.51.100.99">198.51.100.99 (Bulletproof Proxy)</option>
              </optgroup>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.is_new_device}
                onChange={(e) => update('is_new_device', e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-[11px]">Unrecognized / New Device (+20)</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.behaviour.paste_detected}
                onChange={(e) => updateBehaviour('paste_detected', e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="text-[11px] text-rose-300 font-medium">Card Field Clipboard Paste (+25)</span>
            </label>
          </div>
        </div>

        {/* Column 3: Behavioral Telemetry */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
            <MousePointer className="w-3.5 h-3.5" />
            <span>Behavioral Dynamics</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Form Dwell Time</label>
              <span className="font-mono text-cyan-300 font-bold">
                {(config.behaviour.form_dwell_ms / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="20000"
              step="200"
              value={config.behaviour.form_dwell_ms}
              onChange={(e) => updateBehaviour('form_dwell_ms', Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500">&lt;1.5s triggers superhuman flag (+25)</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Mouse Jitter / Entropy</label>
              <span className="font-mono text-cyan-300 font-bold">
                {config.behaviour.mouse_jitter.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={config.behaviour.mouse_jitter}
              onChange={(e) => updateBehaviour('mouse_jitter', Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500">&le;0.05 triggers zero-entropy bot flag (+20)</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Keystroke Jitter (Std-Dev)</label>
              <span className="font-mono text-cyan-300 font-bold">
                {config.behaviour.keystroke_cadence.std_dev_ms}ms
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={config.behaviour.keystroke_cadence.std_dev_ms}
              onChange={(e) => updateCadence('std_dev_ms', Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <span className="text-[10px] text-slate-500">&lt;15ms triggers robotic cadence (+25)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

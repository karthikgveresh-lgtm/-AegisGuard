import React from 'react';
import { Shield, Activity, ShoppingCart, Cpu, Zap, Wifi, RotateCcw } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, sseStatus, onTriggerAttack, isAttacking, onResetDemo, isResetting }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">AegisGuard</span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                Microservice
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Real-Time Adaptive Fraud Scoring & Step-Up Authentication
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
          <button
            id="tab-btn-checkout"
            onClick={() => {
              setActiveTab('checkout');
              window.location.hash = '#checkout';
            }}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'checkout'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Checkout Simulator</span>
          </button>

          <button
            id="tab-btn-ops"
            onClick={() => {
              setActiveTab('ops');
              window.location.hash = '#ops';
            }}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'ops'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Risk Ops Console</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {/* Status Indicators, Reset Demo State, & Attack Trigger */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Reset Demo State Button */}
          <button
            id="btn-reset-demo"
            onClick={onResetDemo}
            disabled={isResetting}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              isResetting
                ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80 shadow-sm'
            }`}
            title="Re-seed database, user baselines, and historical transactions (POST /api/demo/reset)"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-cyan-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isResetting ? 'Resetting...' : 'Reset Demo State'}</span>
          </button>

          {/* Attack Simulation Button (visible in Ops Console) */}
          {activeTab === 'ops' && (
            <button
              onClick={onTriggerAttack}
              disabled={isAttacking}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                isAttacking
                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/50 cursor-not-allowed animate-pulse'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/50 shadow-md shadow-rose-600/25'
              }`}
              title="Burst 6 bot transactions across blacklisted IPs to demonstrate live streaming"
            >
              <Zap className={`w-3.5 h-3.5 ${isAttacking ? 'animate-spin' : ''}`} />
              <span>{isAttacking ? 'Simulating Attack...' : 'Run Attack Simulation'}</span>
            </button>
          )}

          {/* SSE Status */}
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  sseStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  sseStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-slate-300 font-mono text-[11px] hidden md:inline">
              {sseStatus === 'connected' ? 'SSE Live' : 'Connecting...'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import Navbar from './components/Shared/Navbar';
import CheckoutForm from './components/CheckoutSimulator/CheckoutForm';
import MetricsBar from './components/OpsConsole/MetricsBar';
import AnalyticsCharts from './components/OpsConsole/AnalyticsCharts';
import LiveTransactionTable from './components/OpsConsole/LiveTransactionTable';
import TransactionInspectorDrawer from './components/OpsConsole/TransactionInspectorDrawer';
import { getTransactions, getMetrics, subscribeToStream, triggerAttackSimulation, resetDemoState } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('checkout'); // 'checkout' or 'ops'
  const [sseStatus, setSseStatus] = useState('connecting');
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    // Sync initial tab with URL hash if present
    const checkHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#ops' || hash === '#console') {
        setActiveTab('ops');
      } else if (hash === '#checkout') {
        setActiveTab('checkout');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);

    // Fetch initial historical transactions
    getTransactions({ limit: 60 })
      .then(data => setTransactions(data.items || []))
      .catch(err => console.error('Error fetching transactions:', err));

    // Fetch initial metrics
    getMetrics()
      .then(data => setMetrics(data))
      .catch(err => console.error('Error fetching metrics:', err));

    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Server-Sent Events (SSE) Live Subscription
  useEffect(() => {
    const unsubscribe = subscribeToStream((message) => {
      if (message.type === 'TRANSACTION_CREATED') {
        const newTx = message.data?.transaction;
        if (newTx) {
          setTransactions(prev => [newTx, ...prev.slice(0, 99)]);
        }
      } else if (message.type === 'TRANSACTION_UPDATED') {
        const updatedTx = message.data?.transaction;
        if (updatedTx) {
          setTransactions(prev =>
            prev.map(t => (t.id === updatedTx.id ? { ...t, ...updatedTx } : t))
          );
        }
      } else if (message.type === 'METRICS_UPDATED') {
        if (message.data) {
          setMetrics(message.data);
        }
      }
    }, (status) => {
      setSseStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Attack simulation handler
  const handleTriggerAttack = async () => {
    setIsAttacking(true);
    try {
      await triggerAttackSimulation(6);
      setTimeout(() => {
        setIsAttacking(false);
      }, 3500);
    } catch (err) {
      alert(`Simulation failed: ${err.message}`);
      setIsAttacking(false);
    }
  };

  // Reset demo state handler
  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await resetDemoState();
      const [txData, metricsData] = await Promise.all([
        getTransactions({ limit: 60 }),
        getMetrics()
      ]);
      setTransactions(txData.items || []);
      setMetrics(metricsData);
    } catch (err) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Callback when a transaction is evaluated in Checkout Simulator
  const handleTransactionEvaluated = (evalResult) => {
    // If user is currently in checkout, the modal displays the outcome.
    // We also ensure latest metrics are refreshed.
    getMetrics().then(m => setMetrics(m)).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      {/* Sticky Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sseStatus={sseStatus}
        onTriggerAttack={handleTriggerAttack}
        isAttacking={isAttacking}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* TAB 1: Merchant Checkout Simulator */}
        {activeTab === 'checkout' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Merchant Checkout Simulator</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Simulate live customer checkouts, harvest silent client telemetry, and test deterministic fraud decisions.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  id="btn-reset-demo-simulator"
                  onClick={handleResetDemo}
                  disabled={isResetting}
                  className="text-xs text-slate-400 hover:text-white font-mono flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800"
                  title="Reset database and user baselines"
                >
                  <span>{isResetting ? 'Resetting...' : '↺ Reset Demo State'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('ops')}
                  className="self-start sm:self-auto text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
                >
                  <span>Switch to Live Ops Console</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            <CheckoutForm
              onTransactionEvaluated={handleTransactionEvaluated}
            />
          </div>
        )}

        {/* TAB 2: Risk Operations Console */}
        {activeTab === 'ops' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Risk Operations Console</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time telemetry stream, risk score distribution, factor contribution analytics, and audit dossier.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  id="btn-reset-demo-ops"
                  onClick={handleResetDemo}
                  disabled={isResetting}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
                  title="Re-seed database, user baselines, and historical transactions"
                >
                  <span>{isResetting ? 'Resetting Demo...' : '↺ Reset Demo State'}</span>
                </button>

                <button
                  onClick={handleTriggerAttack}
                  disabled={isAttacking}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    isAttacking
                      ? 'bg-rose-950/60 text-rose-300 border-rose-800/50 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/50 shadow-md shadow-rose-600/25'
                  }`}
                >
                  {isAttacking ? 'Simulating Attack Burst...' : '⚡ Run Attack Simulation'}
                </button>
              </div>
            </div>

            {/* Key KPI Metrics Bar */}
            <MetricsBar metrics={metrics} />

            {/* Real-time Analytics Visualizations */}
            <AnalyticsCharts metrics={metrics} />

            {/* Live SSE Transaction Stream Table */}
            <LiveTransactionTable
              transactions={transactions}
              onSelectTransaction={(id) => setSelectedTransactionId(id)}
              selectedId={selectedTransactionId}
            />
          </div>
        )}

      </main>

      {/* Transaction Detail Inspector Drawer (Slide-out) */}
      {selectedTransactionId && (
        <TransactionInspectorDrawer
          transactionId={selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
        />
      )}

      {/* Global Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070a0f] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-300">AegisGuard</span>
            <span>•</span>
            <span>Sub-millisecond Real-Time Fraud & Authentication Engine</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span>React + Vite</span>
            <span>•</span>
            <span>Express + SQLite (WAL)</span>
            <span>•</span>
            <span>SSE Stream</span>
            <span>•</span>
            <span className="text-emerald-400">Deterministic Geo/IP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

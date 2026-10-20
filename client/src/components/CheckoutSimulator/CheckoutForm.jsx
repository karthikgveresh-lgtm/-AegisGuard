import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Lock, Shield, Eye, EyeOff, Activity, Cpu, MousePointer, Clock, CheckCircle } from 'lucide-react';
import { TelemetryTracker, generateDeviceFingerprint } from '../../telemetry/collector';
import { evaluateTransaction } from '../../services/api';
import DecisionModal from './DecisionModal';
import CartSummary from './CartSummary';
import PersonaSelector from './PersonaSelector';
import CustomSignalTweaker from './CustomSignalTweaker';

export default function CheckoutForm({ onTransactionEvaluated }) {
  const [selectedPersona, setSelectedPersona] = useState('persona_a');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Form Fields
  const [cardName, setCardName] = useState('Alex Chen');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [rawCardNumber, setRawCardNumber] = useState('4242424242424242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('888');
  const [showCvv, setShowCvv] = useState(false);

  // Custom Mode State
  const [customConfig, setCustomConfig] = useState({
    user_id: 'usr_alex',
    amount: 74.50,
    currency: 'USD',
    merchant_category: 'electronics',
    ip_address: '198.51.100.15',
    is_new_device: false,
    behaviour: {
      paste_detected: false,
      form_dwell_ms: 12000,
      mouse_jitter: 0.65,
      keystroke_cadence: {
        mean_ms: 140,
        std_dev_ms: 35
      }
    }
  });

  // Telemetry Tracker instance
  const trackerRef = useRef(null);
  const [liveTelemetry, setLiveTelemetry] = useState({
    deviceId: 'generating...',
    dwellSeconds: 0,
    mouseJitter: 0.65,
    pasteDetected: false
  });

  // Initialize Telemetry Tracker
  useEffect(() => {
    const tracker = new TelemetryTracker();
    tracker.start();
    trackerRef.current = tracker;

    const deviceFp = generateDeviceFingerprint();
    setLiveTelemetry(prev => ({ ...prev, deviceId: deviceFp.deviceId }));

    // Timer interval to show live dwell & mouse jitter
    const interval = setInterval(() => {
      const snap = tracker.getSnapshot();
      setLiveTelemetry(prev => ({
        ...prev,
        dwellSeconds: Math.floor(snap.form_dwell_ms / 1000),
        mouseJitter: snap.mouse_jitter,
        pasteDetected: snap.paste_detected
      }));
    }, 500);

    return () => {
      tracker.stop();
      clearInterval(interval);
    };
  }, []);

  // Update form inputs when persona changes
  const handleSelectPersona = (personaId) => {
    setSelectedPersona(personaId);

    if (personaId === 'persona_a') {
      setCardName('Alex Chen');
      setCardNumber('4242 •••• •••• 4242');
      setRawCardNumber('4242424242424242');
      setExpiry('08/29');
      setCvv('888');
    } else if (personaId === 'persona_b') {
      setCardName('Alex Chen');
      setCardNumber('4242 •••• •••• 4242');
      setRawCardNumber('4242424242424242');
      setExpiry('08/29');
      setCvv('888');
    } else if (personaId === 'persona_c') {
      setCardName('Sarah Jenkins');
      setCardNumber('4000 •••• •••• 9010');
      setRawCardNumber('4000123456789010');
      setExpiry('03/27');
      setCvv('123');
    }
  };

  // Keystroke listeners for live behavioral capture
  const handleCardNumberKeyDown = () => {
    if (trackerRef.current) trackerRef.current.recordKeydown();
  };

  const handleCardNumberPaste = () => {
    if (trackerRef.current) trackerRef.current.recordPaste();
    setLiveTelemetry(prev => ({ ...prev, pasteDetected: true }));
  };

  const handleCvvKeyDown = () => {
    if (trackerRef.current) trackerRef.current.recordKeydown();
  };

  const handleCvvPaste = () => {
    if (trackerRef.current) trackerRef.current.recordPaste();
    setLiveTelemetry(prev => ({ ...prev, pasteDetected: true }));
  };

  // Form submission & evaluation trigger
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let payload;
      const deviceFp = generateDeviceFingerprint();

      if (selectedPersona === 'persona_a') {
        payload = {
          user_id: 'usr_alex',
          amount: 74.50,
          currency: 'USD',
          merchant_category: 'electronics',
          ip_address: '198.51.100.15', // NYC
          card_number: rawCardNumber,
          device: {
            device_id: 'dev_alex_macbook', // Trusted device
            ...deviceFp
          },
          baseline: {
            last_location: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'US' },
            last_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            trusted_device_ids: ['dev_alex_macbook', 'dev_alex_iphone']
          },
          behaviour: {
            paste_detected: false,
            form_dwell_ms: 14200,
            mouse_jitter: 0.72,
            keystroke_cadence: { mean_ms: 142, std_dev_ms: 36 }
          }
        };
      } else if (selectedPersona === 'persona_b') {
        payload = {
          user_id: 'usr_alex',
          amount: 98.50,
          currency: 'USD',
          merchant_category: 'electronics',
          ip_address: '198.51.116.42', // Miami (~1,750 km away from NYC in 10 min)
          card_number: rawCardNumber,
          device: {
            device_id: 'dev_unrecognized_chrome_win', // New unrecognized device
            ...deviceFp
          },
          baseline: {
            last_location: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'US' },
            last_timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            trusted_device_ids: ['dev_alex_macbook', 'dev_alex_iphone']
          },
          behaviour: {
            paste_detected: false,
            form_dwell_ms: 5800,
            mouse_jitter: 0.45,
            keystroke_cadence: { mean_ms: 175, std_dev_ms: 28 }
          }
        };
      } else if (selectedPersona === 'persona_c') {
        payload = {
          user_id: 'usr_sarah',
          amount: 1250.00,
          currency: 'USD',
          merchant_category: 'cryptocurrency',
          ip_address: '45.154.255.89', // Blacklisted botnet CIDR
          card_number: rawCardNumber,
          device: {
            device_id: 'dev_bot_headless_99',
            userAgent: 'HeadlessChrome/120.0.0.0',
            screenResolution: '800x600',
            colorDepth: 24
          },
          baseline: {
            last_location: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'GB' },
            last_timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
            trusted_device_ids: ['dev_sarah_iphone', 'dev_sarah_work_mac']
          },
          behaviour: {
            paste_detected: true,
            form_dwell_ms: 420, // <1s submit
            mouse_jitter: 0.0,  // Zero mouse movement
            keystroke_cadence: { mean_ms: 8, std_dev_ms: 2 }
          }
        };
      } else {
        // Custom Mode
        payload = {
          user_id: customConfig.user_id,
          amount: customConfig.amount,
          currency: customConfig.currency,
          merchant_category: customConfig.merchant_category,
          ip_address: customConfig.ip_address,
          card_number: rawCardNumber,
          device: {
            device_id: customConfig.is_new_device ? `dev_custom_${Date.now()}` : 'dev_alex_macbook',
            ...deviceFp
          },
          behaviour: customConfig.behaviour
        };
      }

      const evalResult = await evaluateTransaction(payload);
      setResult(evalResult);

      if (onTransactionEvaluated) {
        onTransactionEvaluated(evalResult);
      }
    } catch (err) {
      alert(`Evaluation error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    if (trackerRef.current) {
      trackerRef.current.start();
    }
  };

  // Determine active amount for Cart display
  const currentAmount = selectedPersona === 'persona_a' ? 74.50 : (selectedPersona === 'persona_b' ? 98.50 : (selectedPersona === 'persona_c' ? 1250.00 : customConfig.amount));
  const currentCategory = selectedPersona === 'persona_a' ? 'electronics' : (selectedPersona === 'persona_b' ? 'electronics' : (selectedPersona === 'persona_c' ? 'cryptocurrency' : customConfig.merchant_category));

  return (
    <div className="space-y-6">
      {/* Persona Presets Bar */}
      <PersonaSelector
        selectedPersona={selectedPersona}
        onSelectPersona={handleSelectPersona}
      />

      {/* Custom Mode Configurator (Visible when Custom is selected) */}
      {selectedPersona === 'custom' && (
        <CustomSignalTweaker
          config={customConfig}
          onChangeConfig={setCustomConfig}
        />
      )}

      {/* Main Grid: Checkout Form + Cart Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Payment Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Payment Method</h3>
                  <p className="text-xs text-slate-400">Encrypted card authorization</p>
                </div>
              </div>
              <span className="flex items-center space-x-1 text-xs text-emerald-400 font-mono">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero PAN Retention</span>
              </span>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Cardholder Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
                  placeholder="Full Name"
                />
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex justify-between">
                  <span>Card Number</span>
                  <span className="text-[11px] text-slate-500">Auto-tokenized</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onKeyDown={handleCardNumberKeyDown}
                    onPaste={handleCardNumberPaste}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
                    placeholder="4242 •••• •••• 4242"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-cyan-400 font-mono">
                    VISA
                  </span>
                </div>
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
                    placeholder="MM/YY"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 flex justify-between">
                    <span>CVV / CVC</span>
                    <span className="text-[10px] text-slate-500">Security code</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCvv ? 'text' : 'password'}
                      required
                      maxLength={4}
                      value={cvv}
                      onKeyDown={handleCvvKeyDown}
                      onPaste={handleCvvPaste}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white font-mono text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
                      placeholder="•••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Telemetry Diagnostics Bar */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>Silent Telemetry Sensor Stream</span>
                  </span>
                  <span className="text-emerald-400 font-semibold">ONLINE</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/60 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">DEVICE ID</span>
                    <span className="truncate block font-semibold text-cyan-300">
                      {liveTelemetry.deviceId.slice(0, 12)}...
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DWELL TIME</span>
                    <span className="block font-semibold">
                      {liveTelemetry.dwellSeconds}s
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">MOUSE JITTER</span>
                    <span className={`block font-semibold ${liveTelemetry.mouseJitter <= 0.05 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {liveTelemetry.mouseJitter}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PASTE DETECTED</span>
                    <span className={`block font-semibold ${liveTelemetry.pasteDetected ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {liveTelemetry.pasteDetected ? 'TRUE' : 'FALSE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Pay Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-xl shadow-cyan-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Submitting & Evaluating Risk...'
                    : `Authorize & Pay $${Number(currentAmount).toFixed(2)}`}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Cart Summary (5 Cols) */}
        <div className="lg:col-span-5">
          <CartSummary
            amount={currentAmount}
            currency="USD"
            merchantCategory={currentCategory}
          />
        </div>

      </div>

      {/* Decision Result Modal */}
      {result && (
        <DecisionModal
          result={result}
          onClose={() => setResult(null)}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

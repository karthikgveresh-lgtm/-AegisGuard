import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XOctagon, Shield, ArrowRight, RefreshCw, KeyRound, Clock, Lock } from 'lucide-react';
import SignalBreakdown from './SignalBreakdown';
import { verifyChallenge, getDemoTotp } from '../../services/api';

export default function DecisionModal({ result, onClose, onReset, onTransactionUpdated }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [trustDevice, setTrustDevice] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [challengeState, setChallengeState] = useState(result.decision); // 'CHALLENGE', 'ALLOW', or 'BLOCK'
  const [demoTotp, setDemoTotp] = useState(null);

  const inputRefs = useRef([]);

  // Fetch demo TOTP token for judge hint
  useEffect(() => {
    if (result.decision === 'CHALLENGE') {
      getDemoTotp()
        .then(data => setDemoTotp(data))
        .catch(err => console.warn('Could not fetch demo TOTP hint:', err));

      const interval = setInterval(() => {
        getDemoTotp().then(data => setDemoTotp(data)).catch(() => {});
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [result.decision]);

  // Handle OTP digit entry
  const handleDigitChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste of whole 6-digit code
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(5, digits.length);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
      return;
    }

    const cleanChar = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanChar;
    setOtp(newOtp);

    // Auto advance
    if (cleanChar && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Submit OTP Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setVerifyError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await verifyChallenge(result.transaction_id, {
        code,
        trust_device: trustDevice
      });

      if (res.success) {
        setChallengeState('ALLOW');
        if (onTransactionUpdated) {
          onTransactionUpdated(result.transaction_id, 'CHALLENGE_PASSED');
        }
      }
    } catch (err) {
      const remaining = err.attemptsRemaining !== undefined ? err.attemptsRemaining : attemptsRemaining - 1;
      setAttemptsRemaining(remaining);
      setVerifyError(err.message || 'Invalid code.');

      if (err.status === 'BLOCKED' || remaining <= 0) {
        setChallengeState('BLOCK');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const autofillCode = (codeToFill) => {
    const chars = codeToFill.slice(0, 6).split('');
    setOtp(chars);
    if (inputRefs.current[5]) inputRefs.current[5].focus();
  };

  return (
    <div className="glass-panel-elevated rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 animate-fade-in shadow-2xl relative overflow-hidden">
      
      {/* Return to Form Button */}
      <button
        id="btn-close-decision-modal"
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors z-10 flex items-center space-x-1.5 border border-slate-700/60"
        title="Return to checkout form"
      >
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        <span>Back to Form</span>
      </button>

        {/* 1. ALLOW Screen */}
        {challengeState === 'ALLOW' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 glow-emerald">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800/60">
                Decision: ALLOW (Approved)
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                Transaction Successfully Authorized
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Zero friction checkout authorized in <strong className="text-cyan-400">{result.latency_ms} ms</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-left text-xs font-mono">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">TRANSACTION ID</span>
                <span className="text-slate-200 truncate block">{result.transaction_id}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">RISK SCORE</span>
                <span className="text-emerald-400 font-bold block">{result.risk_score} / 100</span>
              </div>
            </div>

            <SignalBreakdown evaluation={result} defaultExpanded={false} />

            <div className="pt-2">
              <button
                type="button"
                onClick={onReset}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Simulate Another Checkout</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. CHALLENGE (Step-up TOTP) Screen */}
        {challengeState === 'CHALLENGE' && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 glow-amber">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-800/60">
                  Decision: CHALLENGE (Step-Up Auth)
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  Identity Verification Required
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  {result.summary || 'Unusual location or new device detected. Please verify with second-factor OTP.'}
                </p>
              </div>
            </div>

            {/* Demo Hint Banner for Judges */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start space-x-2.5">
              <KeyRound className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300">Hackathon Judge Demo Hint</span>
                  {demoTotp && (
                    <span className="text-[10px] font-mono text-amber-400/80">
                      TOTP changes in {demoTotp.timeRemaining}s
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  Live TOTP token:{' '}
                  <button
                    type="button"
                    onClick={() => autofillCode(demoTotp?.token || '123456')}
                    className="font-mono font-bold text-amber-300 underline hover:text-white px-1"
                  >
                    {demoTotp?.token || '123456'}
                  </button>{' '}
                  (click to autofill) or use universal bypass code{' '}
                  <button
                    type="button"
                    onClick={() => autofillCode('123456')}
                    className="font-mono font-bold text-amber-300 underline hover:text-white px-1"
                  >
                    123456
                  </button>
                </p>
              </div>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs text-center text-slate-400 mb-2 font-medium">
                  Enter 6-digit authentication code
                </label>
                <div className="flex justify-center space-x-2 sm:space-x-3">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Error Alert */}
              {verifyError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs text-center">
                  {verifyError}
                </div>
              )}

              {/* Trust this device checkbox */}
              <div className="flex items-center justify-center space-x-2">
                <input
                  id="trust_device"
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                />
                <label htmlFor="trust_device" className="text-xs text-slate-300 cursor-pointer">
                  Trust this device fingerprint for future checkouts
                </label>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium text-sm transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isVerifying ? 'Verifying OTP...' : 'Verify & Complete Payment'}</span>
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  {attemptsRemaining} of 3 attempts remaining before automated block
                </p>
              </div>
            </form>

            <SignalBreakdown evaluation={result} defaultExpanded={false} />
          </div>
        )}

        {/* 3. BLOCK Screen */}
        {challengeState === 'BLOCK' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 glow-rose">
              <XOctagon className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-rose-400 font-semibold px-2.5 py-1 rounded-full bg-rose-950 border border-rose-800/60">
                Decision: BLOCK (Declined)
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                Transaction Blocked by Risk Policy
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {result.summary || 'Critical velocity breach or blacklisted threat indicators identified.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-left text-xs font-mono">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">TRANSACTION ID</span>
                <span className="text-slate-200 truncate block">{result.transaction_id}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block">RISK SCORE</span>
                <span className="text-rose-400 font-bold block">{result.risk_score} / 100</span>
              </div>
            </div>

            <SignalBreakdown evaluation={result} defaultExpanded={true} />

            <div className="pt-2">
              <button
                type="button"
                onClick={onReset}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-all border border-slate-700 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Simulator</span>
              </button>
            </div>
          </div>
        )}

      </div>
  );
}

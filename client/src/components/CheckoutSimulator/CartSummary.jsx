import React from 'react';
import { ShoppingBag, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

const PERSONA_PRODUCTS = {
  persona_a: {
    name: 'AuraPro Wireless Studio ANC Headphones',
    subtitle: 'Midnight Black Edition • Qty: 1',
    icon: '🎧',
    merchant: 'CyberRetail Direct'
  },
  persona_b: {
    name: 'SanDisk Extreme 1TB Portable NVMe SSD',
    subtitle: 'Space Gray • 1050MB/s USB 3.2 • Qty: 1',
    icon: '💾',
    merchant: 'CyberRetail Direct'
  },
  persona_c: {
    name: 'Ethereum Digital Asset Voucher (1.0 ETH)',
    subtitle: 'Instant Web3 Blockchain Transfer • Non-Refundable • Qty: 1',
    icon: '🪙',
    merchant: 'ApexCrypto Global Exchange'
  },
  custom: {
    name: 'Sandbox Digital Asset Order',
    subtitle: 'Configurable Telemetry Order • Qty: 1',
    icon: '🛍️',
    merchant: 'Sandbox Marketplace'
  }
};

export default function CartSummary({ 
  amount, 
  currency = 'USD', 
  merchantCategory = 'electronics', 
  selectedPersona = 'persona_a' 
}) {
  const formattedTotal = Number(amount || 0).toFixed(2);
  const tax = Number((amount * 0.08).toFixed(2));
  const subtotal = Number((amount - tax).toFixed(2));
  const product = PERSONA_PRODUCTS[selectedPersona] || PERSONA_PRODUCTS.persona_a;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Order Summary</h3>
            <p className="text-xs text-slate-400">Merchant: {product.merchant}</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
          {merchantCategory.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Cart Item Detail */}
      <div className="py-4 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center overflow-hidden flex-shrink-0 text-slate-500">
            <span className="text-2xl">{product.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">
              {product.name}
            </h4>
            <p className="text-xs text-slate-400">{product.subtitle}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-white">${formattedTotal}</span>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="text-slate-200 font-mono">${subtotal}</span>
        </div>
        <div className="flex justify-between">
          <span>Estimated Sales Tax (8%)</span>
          <span className="text-slate-200 font-mono">${tax}</span>
        </div>
        <div className="flex justify-between">
          <span>Express Tracked Shipping</span>
          <span className="text-emerald-400 font-medium">FREE</span>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
          <span className="text-sm font-medium text-white">Total Amount</span>
          <div className="text-right">
            <span className="text-xl font-bold font-mono text-cyan-400">
              ${formattedTotal}
            </span>
            <span className="text-[10px] text-slate-400 ml-1">{currency}</span>
          </div>
        </div>
      </div>

      {/* Guarantee Badges */}
      <div className="mt-5 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>256-bit TLS Protected</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Truck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Instant Digital Invoice</span>
        </div>
      </div>
    </div>
  );
}

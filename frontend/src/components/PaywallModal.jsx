import React, { useState } from 'react';
import { billingService } from '../services/billingService';

export default function PaywallModal({ isOpen, onClose, user, onUpgradeSuccess, activeTheme }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSimulateGooglePlay = async () => {
    if (!user?.id) {
      setError('User context not available.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await billingService.purchasePro(user.id, 'monthly');
      
      if (result.success) {
        if (onUpgradeSuccess) await onUpgradeSuccess();
        onClose();
      } else {
        setError('Failed to process purchase. Please try again.');
      }
    } catch (err) {
      console.error('Purchase simulation error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
        <div className="text-center">
          <span className="text-3xl">👑</span>
          <h2 className="text-xl font-extrabold tracking-tight mt-2 text-emerald-400">Unlock Cuenuvo Pro</h2>
          <p className={`text-xs ${subTextClass} mt-1`}>
            Get unlimited cloud sync, hands-free voice AI parsing, and priority WhatsApp features.
          </p>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}

        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 flex justify-between items-center ${inputBgClass}`}>
            <div>
              <p className="text-xs font-bold">Monthly Plan</p>
              <p className={`text-[10px] ${subTextClass}`}>Google Play Billing Sandbox Ready</p>
            </div>
            <span className="text-sm font-extrabold text-emerald-400">₹149 / mo</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleSimulateGooglePlay}
            disabled={loading}
            className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'Processing Google Play...' : '🚀 Simulate Google Play Purchase'}
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 text-xs ${subTextClass} hover:opacity-80 font-semibold transition-all`}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
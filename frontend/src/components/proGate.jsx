// src/components/ProGate.jsx
import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

export default function ProGate({ user, children, activeTheme, fallback = null }) {
  const { subscription, toggleMockPro } = useSubscription(user?.id);
  const [showPaywall, setShowPaywall] = useState(false);

  if (subscription.loading) {
    return <div className="text-xs text-gray-500 py-2">Loading subscription...</div>;
  }

  if (subscription.isPro) {
    return <>{children}</>;
  }

  return (
    <>
      {fallback || (
        <div 
          onClick={() => setShowPaywall(true)}
          className={`p-4 border border-dashed rounded-2xl text-center cursor-pointer transition-all hover:border-emerald-400/50 ${activeTheme?.inputBg || 'bg-zinc-950'}`}
        >
          <p className="text-xs font-bold text-emerald-400 mb-0.5">🔒 Pro Feature Locked</p>
          <p className="text-[11px] text-gray-400">Tap to upgrade or test Google Play stub</p>
        </div>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSimulateUpgrade={toggleMockPro}
        activeTheme={activeTheme}
      />
    </>
  );
}
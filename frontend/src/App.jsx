import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ObligationListView from './components/ObligationListView';
import ObligationsPage from './pages/ObligationsPage';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import ObligationFormModal from './components/ObligationFormModal';
import OnboardingWizard from './components/OnboardingWizard';
import PaywallModal from './components/PaywallModal';
import PaymentModal from './components/PaymentModal';
import EventModal from './components/EventModal';
import TapToSpeakPillBar from './components/TapToSpeakPillBar';
import { GEN_Z_THEMES } from './constants/categories';
import { useObligationCycles } from './hooks/useObligationCycles';
import { obligationsService } from './services/obligationsService';
import { useOnboarding } from './hooks/useOnboarding';
import { useNotifications } from './hooks/useNotifications';
import { useSubscription } from './hooks/useSubscription';
import { supabase } from './lib/supabase';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import CompletedOrNextMonthPage from './pages/CompletedOrNextMonthPage';

function InlineLoginPage() {
  const [loading, setLoading] = useState(false);
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const isNative = Capacitor.isNativePlatform();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: isNative ? 'com.cuenuvo.app://' : window.location.origin,
          skipBrowserRedirect: isNative,
        },
      });
      if (error) throw error;
      if (data?.url && isNative) {
        await Browser.open({ url: data.url });
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Login error:', err.message);
      alert('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full space-y-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-emerald-400">Cuenuvo</h1>
          <p className="text-gray-400 text-sm mt-2">Track your reminders with ease.</p>
        </div>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 text-zinc-900 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 border border-gray-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-gray-400">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function FloatingActionCapsule() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMasterList = location.pathname === '/obligations';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <nav className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl flex items-center gap-1">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            !isMasterList
              ? 'bg-[#6556e8] text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>🏠</span>
          <span>Home</span>
        </button>

        <button
          onClick={() => navigate('/obligations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            isMasterList
              ? 'bg-[#6556e8] text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>📌</span>
          <span>Master List</span>
        </button>
      </nav>
    </div>
  );
}

function HomeContent({ themeKey, setThemeKey, currencySymbol, setCurrencySymbol }) {
  const { user, signOut } = useAuth();
  useNotifications(user);
  const { subscription, toggleMockPro } = useSubscription(user?.id);

  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [saving, setSaving] = useState(false);
  // Victory card modal
  const [showVictoryModal, setShowVictoryModal] = useState(false);

  // Profile Drawer State
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const reminderId = searchParams.get('reminderId');
  const [selectedCycleForModal, setSelectedCycleForModal] = useState(null);

  const { needsOnboarding, loading: onboardingLoading, completeOnboarding } = useOnboarding(user?.id);
  const [systemPrefersDark, setSystemPrefersDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const getEffectiveThemeKey = (key) => key === 'system' ? (systemPrefersDark ? 'cyberLime' : 'light') : (key || 'light');
  const activeTheme = GEN_Z_THEMES[getEffectiveThemeKey(themeKey)] || GEN_Z_THEMES.light;

  const { cycles, loading, markCyclePaid, refreshCycles, monthlyStats } = useObligationCycles(user?.id);

  useEffect(() => {
    if (reminderId && cycles?.length) {
      const match = cycles.find((c) => c.id === reminderId || c.obligation_id === reminderId);
      if (match) setSelectedCycleForModal(match);
    }
  }, [reminderId, cycles]);

  const closeModal = () => {
    setSelectedCycleForModal(null);
    setSearchParams({}, { replace: true });
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      await obligationsService.saveObligation(user.id, formData);
      setShowForm(false);
      await refreshCycles();
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Failed to save your reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishOnboarding = async () => {
    completeOnboarding();
    await refreshCycles();
  };

  const handleVoiceClick = (e) => {
    if (e) e.stopPropagation();
    if (!subscription.isPro) {
      setShowPaywall(true);
    } else {
      setShowForm(true);
    }
  };

  if (onboardingLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-gray-400 text-sm">Setting up your workspace...</div>;
  }

  if (needsOnboarding) {
    return (
      <div className={`min-h-screen ${activeTheme.bg} ${activeTheme.text} flex items-center justify-center p-4`}>
        <OnboardingWizard
          user={user}
          currentThemeKey={themeKey}
          onSelectTheme={setThemeKey}
          currentCurrency={currencySymbol}
          onSelectCurrency={setCurrencySymbol}
          onNext={handleFinishOnboarding}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-28 transition-colors duration-300 ${activeTheme.bg} ${activeTheme.text} font-sans relative`}>
      
      {/* Top Header Bar (Hidden when Form is active) */}
      {!showForm && (
        <header className={`px-4 py-3 flex justify-between items-center border-b ${activeTheme.card} backdrop-blur-md sticky top-0 z-30`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6556e8] flex items-center justify-center shadow-xs">
              <span className="text-white font-extrabold text-base tracking-tight">C</span>
            </div>
            <h1 className="text-lg font-extrabold tracking-tight">Cuenuvo</h1>
          </div>

          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-9 h-9 rounded-full bg-[#6556e8]/15 border border-[#6556e8]/30 flex items-center justify-center text-[#6556e8] font-bold text-xs hover:scale-105 transition-transform"
            aria-label="User Profile & Menu"
          >
            {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
          </button>
        </header>
      )}

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        
        {/* If Form is Open, hide everything else and display full screen modal card */}
        {showForm ? (
          <div className="pt-2">
            <ObligationFormModal
              editingItem={null}
              activeTheme={activeTheme}
              currencySymbol={currencySymbol}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
              saving={saving}
              user={user}
            />
          </div>
        ) : (
          <>
            {/* Achievement Banner */}
            <div 
              onClick={() => setShowVictoryModal(true)}
              className={`w-full mt-1 ${activeTheme.card} rounded-2xl px-5 py-3.5 shadow-sm border border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-[#6556e8]/5 to-emerald-500/5 cursor-pointer hover:border-emerald-400/60 transition-all group`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base shrink-0 group-hover:scale-110 transition-transform">✨</span>
                  <span className="text-xs font-bold tracking-tight text-emerald-400 leading-normal">
                    This month: {monthlyStats.completedCount} of {monthlyStats.completedCount + monthlyStats.remainingCount} done &nbsp;•&nbsp; {currencySymbol}{monthlyStats.spentAmount.toLocaleString('en-IN')} spent of {currencySymbol}{monthlyStats.plannedAmount.toLocaleString('en-IN')} planned
                  </span>
                </div>
                <span className="text-xs font-bold text-[#6556e8] shrink-0"> › </span>
              </div>
            </div>

            {/* TapToSpeakPillBar */}
            <TapToSpeakPillBar
              onVoiceClick={handleVoiceClick}
              onOpenForm={() => setShowForm(true)}
              isPro={subscription.isPro}
              activeTheme={activeTheme}
            />

            {loading ? (
              <div className={`flex items-center justify-center min-h-[40vh] ${activeTheme.subText} text-sm`}>Loading upcoming items...</div>
            ) : (
              <ObligationListView
                cycles={cycles}
                onMarkPaid={markCyclePaid}
                currencySymbol={currencySymbol}
                activeTheme={activeTheme}
                user={user}
                onDefer={async (cycleId, action) => {
                  await obligationsService.deferCycle(cycleId, action, user.id);
                  await refreshCycles();
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Floating Action Capsule Navigation (Hidden when Form is active) */}
      {!showForm && <FloatingActionCapsule />}

      {/* Zen Victory Card Modal */}
      {showVictoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-xs ${activeTheme.card} border rounded-3xl p-6 shadow-2xl text-center space-y-4 relative`}>
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
              💎
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-extrabold tracking-tight">In Control 💎</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                You are aligned and moving forward effortlessly.
              </p>
            </div>

            <div className="py-2.5 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {monthlyStats.remainingCount} items left to complete this month
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setShowVictoryModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#6556e8] hover:bg-[#5344d6] text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Keep Rolling ✨
              </button>
              
              <Link
                to="/completed?tab=completed"
                onClick={() => setShowVictoryModal(false)}
                className="block w-full py-2 text-[11px] font-bold text-emerald-400 hover:underline"
              >
                View completed history & undo items ➔
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Profile Drawer */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className={`w-72 h-full ${activeTheme.card} border-l p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200`}>
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6556e8] text-white flex items-center justify-center font-bold text-sm">
                    {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-xs truncate">{user?.user_metadata?.full_name || 'User'}</p>
                    <p className={`text-[11px] truncate ${activeTheme.subText}`}>{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="text-lg opacity-60 hover:opacity-100 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <Link
                  to="/completed?tab=completed"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#6556e8]/10 text-xs font-semibold transition-colors"
                >
                  <span>✅</span> Completed This Month
                </Link>
                <button
                  onClick={() => { setIsProfileOpen(false); setShowSettings(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#6556e8]/10 text-xs font-semibold transition-colors text-left"
                >
                  <span>⚙️</span> Settings & Currency
                </button>
                <button
                  onClick={() => { setIsProfileOpen(false); setShowHelp(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#6556e8]/10 text-xs font-semibold transition-colors text-left"
                >
                  <span>❓</span> Help & Guide
                </button>
              </div>
            </div>

            <button
              onClick={() => { setIsProfileOpen(false); signOut(); }}
              className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
            >
              Sign Out 🚪
            </button>
          </div>
        </div>
      )}

      {selectedCycleForModal && (
        selectedCycleForModal.type === 'event' ? (
          <EventModal
            isOpen={true}
            onClose={closeModal}
            eventItem={selectedCycleForModal}
            activeTheme={activeTheme}
            user={user}
            onConfirm={async (status) => {
              await markCyclePaid(selectedCycleForModal.id, status, 'Updated via modal');
              await refreshCycles();
              closeModal();
            }}
            onDefer={async (cycleId, action) => {
              await obligationsService.deferCycle(cycleId, action, user.id);
              await refreshCycles();
              closeModal();
            }}
          />
        ) : (
          <PaymentModal
            isOpen={true}
            onClose={closeModal}
            cycle={selectedCycleForModal}
            currencySymbol={currencySymbol}
            activeTheme={activeTheme}
            user={user}
            onConfirmPayment={async (cycleId, amount, notes) => {
              await markCyclePaid(cycleId, amount, notes);
              await refreshCycles();
              closeModal();
            }}
            onDefer={async (cycleId, action) => {
              await obligationsService.deferCycle(cycleId, action, user.id);
              await refreshCycles();
              closeModal();
            }}
          />
        )
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentThemeKey={themeKey}
        onSelectTheme={setThemeKey}
        currencySymbol={currencySymbol}
        onSelectCurrency={setCurrencySymbol}
        onSignOut={signOut}
        user={user}
        activeTheme={activeTheme}
      />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} user={user} onUpgradeSuccess={toggleMockPro} activeTheme={activeTheme} />
    </div>
  );
}

export default function App() {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('Cuenuvo_theme') || 'system');
  const [currencySymbol, setCurrencySymbol] = useState(() => localStorage.getItem('currencySymbol') || '₹');

  useEffect(() => {
    const handleUrlOpen = async (event) => {
      const url = event.url;
      if (url && url.includes('com.cuenuvo.app')) {
        try { await Browser.close(); } catch (e) {}
        try {
          if (url.includes('access_token=') || url.includes('refresh_token=')) {
            const hashPart = url.split('#')[1];
            if (hashPart) {
              const params = new URLSearchParams(hashPart);
              const access_token = params.get('access_token');
              const refresh_token = params.get('refresh_token');
              if (access_token && refresh_token) {
                const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                if (error) throw error;
                window.location.replace('/');
              }
            }
          }
        } catch (err) {
          console.error('[App] Error handling OAuth redirect token:', err);
        }
      }
    };
    const listenerPromise = CapApp.addListener('appUrlOpen', handleUrlOpen);
    return () => { listenerPromise.then((listener) => listener.remove()); };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<InlineLoginPage />} />
          <Route path="/obligations" element={<ProtectedRoute><ObligationsPage themeKey={themeKey} currencySymbol={currencySymbol} /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><HomeContent themeKey={themeKey} setThemeKey={(key) => { localStorage.setItem('Cuenuvo_theme', key); setThemeKey(key); }} currencySymbol={currencySymbol} setCurrencySymbol={(symbol) => { localStorage.setItem('currencySymbol', symbol); setCurrencySymbol(symbol); }} /></ProtectedRoute>} />
          <Route path="/completed" element={<ProtectedRoute><CompletedOrNextMonthPage currencySymbol={currencySymbol} themeKey={themeKey} /></ProtectedRoute>} />
          <Route path="/archive" element={<ProtectedRoute><CompletedOrNextMonthPage currencySymbol={currencySymbol} themeKey={themeKey} /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
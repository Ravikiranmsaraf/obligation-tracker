import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cyclesService } from '../services/cyclesService';
import { GEN_Z_THEMES } from '../constants/categories';
import PaymentModal from '../components/PaymentModal';
import EventModal from '../components/EventModal';
import ReopenCycleModal from '../components/ReopenCycleModal';

export default function CompletedOrNextMonthPage({ currencySymbol = '₹', themeKey }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') === 'next_month' ? 'next_month' : 'completed';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [completedItems, setCompletedItems] = useState([]);
  const [nextMonthItems, setNextMonthItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected item state for Modals
  const [selectedCycle, setSelectedCycle] = useState(null);

  // Accordion state
  const [isThisMonthOpen, setIsThisMonthOpen] = useState(true);
  const [isLastMonthOpen, setIsLastMonthOpen] = useState(false);

  const activeTheme = GEN_Z_THEMES[themeKey] || GEN_Z_THEMES.light;

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const completedData = await cyclesService.fetchCompletedCyclesWithHistory(user.id);
      setCompletedItems(completedData || []);

      const nextMonthData = await cyclesService.fetchNextMonthCycles(user.id);
      setNextMonthItems(nextMonthData || []);
    } catch (err) {
      console.error('Error fetching archive or forward planning data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const formatDate = (timestamp, timeZone = 'UTC') => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch (e) {
      return '';
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthCompleted = completedItems.filter((item) => {
    if (!item.due_timestamp) return false;
    const d = new Date(item.due_timestamp);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const lastMonthCompleted = completedItems.filter((item) => {
    if (!item.due_timestamp) return false;
    const d = new Date(item.due_timestamp);
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
  });

  const isMonetary = selectedCycle && Number(selectedCycle.expected_amount) > 0;

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${activeTheme.bg} ${activeTheme.text} font-sans`}>
      {/* Header */}
      <div className={`px-4 py-4 flex items-center justify-between border-b ${activeTheme.card} backdrop-blur-md sticky top-0 z-20`}>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xs font-bold text-emerald-400 hover:underline">← Home</Link>
          <h1 className="text-base font-extrabold tracking-tight">Completed & Forward Planning</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Segmented Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-black/10 dark:bg-black/50 p-1 rounded-2xl border border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => handleTabChange('completed')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'completed'
                ? 'bg-[#6556e8] text-white shadow-md'
                : `${activeTheme.subText} hover:opacity-80`
            }`}
          >
            ✅ Completed ({completedItems.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('next_month')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'next_month'
                ? 'bg-[#6556e8] text-white shadow-md'
                : `${activeTheme.subText} hover:opacity-80`
            }`}
          >
            🗓️ Next Month ({nextMonthItems.length})
          </button>
        </div>

        {loading ? (
          <div className={`text-center py-12 ${activeTheme.subText} text-xs`}>Loading obligations...</div>
        ) : activeTab === 'completed' ? (
          /* 1. COMPLETED VIEW */
          <div className="space-y-4">
            {/* This Month Accordion */}
            <div className={`rounded-2xl border ${activeTheme.card} p-4 space-y-3`}>
              <button
                onClick={() => setIsThisMonthOpen(!isThisMonthOpen)}
                className={`w-full flex items-center justify-between text-left font-bold text-xs tracking-wider uppercase ${activeTheme.subText}`}
              >
                <span>📅 This Month ({thisMonthCompleted.length})</span>
                <span className="text-[11px]">{isThisMonthOpen ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {isThisMonthOpen && (
                <div className="pt-2 space-y-2 border-t border-white/5">
                  {thisMonthCompleted.length === 0 ? (
                    <p className={`text-center py-4 ${activeTheme.subText} text-xs`}>
                      No completed items for this month yet.
                    </p>
                  ) : (
                    thisMonthCompleted.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedCycle(item)}
                        className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-emerald-400/40 transition-all gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-semibold opacity-70 shrink-0">
                              {formatDate(item.paid_at || item.due_timestamp)}
                            </span>
                            <h3 className="font-bold truncate">{item.name}</h3>
                          </div>
                          <p className={`text-[10px] ${activeTheme.subText} mt-0.5 capitalize truncate`}>
                            {item.category || 'General'} • <span className="text-emerald-400 font-semibold">{item.status}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="font-extrabold text-emerald-400">
                            {Number(item.expected_amount || 0) > 0 ? `${currencySymbol}${Number(item.expected_amount).toLocaleString('en-IN')}` : 'Event ✓'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedCycle(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#6556e8]/10 hover:bg-[#6556e8]/20 border border-[#6556e8]/30 text-[#6556e8] text-[10px] font-bold transition-all active:scale-95"
                            title="Undo / Reopen item"
                          >
                            ↩️ Undo
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Last Month Accordion */}
            <div className={`rounded-2xl border ${activeTheme.card} p-4 space-y-3`}>
              <button
                onClick={() => setIsLastMonthOpen(!isLastMonthOpen)}
                className={`w-full flex items-center justify-between text-left font-bold text-xs tracking-wider uppercase ${activeTheme.subText}`}
              >
                <span>📅 Last Month ({lastMonthCompleted.length})</span>
                <span className="text-[11px]">{isLastMonthOpen ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {isLastMonthOpen && (
                <div className="pt-2 space-y-2 border-t border-white/5">
                  {lastMonthCompleted.length === 0 ? (
                    <p className={`text-center py-4 ${activeTheme.subText} text-xs`}>
                      No completed records found for last month.
                    </p>
                  ) : (
                    lastMonthCompleted.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedCycle(item)}
                        className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/5 flex items-center justify-between text-xs opacity-90 cursor-pointer hover:border-emerald-400/40 transition-all gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-semibold opacity-70 shrink-0">
                              {formatDate(item.paid_at || item.due_timestamp)}
                            </span>
                            <h3 className="font-bold truncate">{item.name}</h3>
                          </div>
                          <p className={`text-[10px] ${activeTheme.subText} mt-0.5 capitalize truncate`}>
                            {item.category || 'General'} • <span className="text-emerald-400 font-semibold">{item.status}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="font-extrabold text-emerald-400">
                            {Number(item.expected_amount || 0) > 0 ? `${currencySymbol}${Number(item.expected_amount).toLocaleString('en-IN')}` : 'Event ✓'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedCycle(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#6556e8]/10 hover:bg-[#6556e8]/20 border border-[#6556e8]/30 text-[#6556e8] text-[10px] font-bold transition-all active:scale-95"
                            title="Undo / Reopen item"
                          >
                            ↩️ Undo
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 2. NEXT MONTH FORWARD PLANNING VIEW */
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#6556e8] px-1">
              Next Calendar Month Obligations
            </h2>
            {nextMonthItems.length === 0 ? (
              <div className={`text-center py-12 ${activeTheme.subText} text-xs`}>
                No obligations scheduled for next month yet. All clear! 🌿
              </div>
            ) : (
              <div className="space-y-2">
                {nextMonthItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCycle(item)}
                    className={`${activeTheme.card} p-4 rounded-2xl border flex items-center justify-between shadow-xs gap-3 cursor-pointer hover:border-[#6556e8]/50 transition-all`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-emerald-400 shrink-0">
                          {formatDate(item.due_timestamp)}
                        </span>
                        <h3 className="font-bold text-xs truncate">{item.name}</h3>
                      </div>
                      <p className={`text-[10px] ${activeTheme.subText} mt-0.5 truncate`}>
                        Scheduled for next month • {item.frequency || 'Monthly'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCycle(item);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-400 hover:text-black transition-all shrink-0"
                    >
                      Clear Early ✓
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Modals: Reopen Modal for Completed Tab vs Payment/Event Modals for Next Month Tab */}
      {selectedCycle && (
        activeTab === 'completed' ? (
          <ReopenCycleModal
            isOpen={Boolean(selectedCycle)}
            onClose={() => setSelectedCycle(null)}
            cycle={selectedCycle}
            activeTheme={activeTheme}
            currencySymbol={currencySymbol}
            onReopen={async (cycleId, newTimestamp) => {
              await cyclesService.updateCycleStatus(cycleId, 'pending', 'Reopened accidentally closed item');
              setSelectedCycle(null);
              await loadData();
            }}
          />
        ) : (
          isMonetary ? (
            <PaymentModal
              isOpen={Boolean(selectedCycle)}
              cycle={selectedCycle}
              activeTheme={activeTheme}
              currencySymbol={currencySymbol}
              user={user}
              onClose={() => setSelectedCycle(null)}
              onConfirmPayment={async (cycleId, paymentData) => {
                await cyclesService.updateCycleStatus(
                  cycleId,
                  paymentData.amount_paid,
                  paymentData.notes
                );
                setSelectedCycle(null);
                await loadData();
              }}
            />
          ) : (
            <EventModal
              isOpen={Boolean(selectedCycle)}
              eventItem={selectedCycle}
              activeTheme={activeTheme}
              user={user}
              onClose={() => setSelectedCycle(null)}
              onConfirm={async (status = 'completed') => {
                await cyclesService.updateCycleStatus(selectedCycle.id, status, 'Updated status');
                setSelectedCycle(null);
                await loadData();
              }}
            />
          )
        )
      )}
    </div>
  );
}
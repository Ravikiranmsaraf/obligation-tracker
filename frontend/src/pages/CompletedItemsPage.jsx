import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cyclesService } from '../services/cyclesService';
import { GEN_Z_THEMES } from '../constants/categories';

export default function CompletedItemsPage({ currencySymbol = '₹', themeKey }) {
  const { user } = useAuth();
  const [completedCycles, setCompletedCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  const activeTheme = GEN_Z_THEMES[themeKey] || GEN_Z_THEMES.light;

  useEffect(() => {
    async function loadCompleted() {
      if (!user?.id) return;
      try {
        const data = await cyclesService.fetchCompletedCyclesThisMonth(user.id);
        setCompletedCycles(data || []);
      } catch (err) {
        console.error('Error fetching completed items:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompleted();
  }, [user]);

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${activeTheme.bg} ${activeTheme.text} font-sans`}>
      <div className={`px-4 py-4 flex items-center justify-between border-b ${activeTheme.card} backdrop-blur-md sticky top-0 z-20`}>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm font-bold text-emerald-400 hover:underline">← Back</Link>
          <h1 className="text-lg font-extrabold tracking-tight">Completed This Month</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {loading ? (
          <div className={`text-center py-12 ${activeTheme.subText} text-xs`}>Loading completed items...</div>
        ) : completedCycles.length === 0 ? (
          <div className={`text-center py-12 ${activeTheme.subText} text-xs`}>
            No completed items found for this month yet. Keep going! 🌱
          </div>
        ) : (
          <div className="space-y-2">
            {completedCycles.map((item) => (
              <div key={item.id} className={`${activeTheme.card} p-4 rounded-2xl border flex items-center justify-between shadow-xs`}>
                <div>
                  <h3 className="font-bold text-xs">{item.name || item.obligation_name}</h3>
                  <p className={`text-[10px] ${activeTheme.subText} mt-0.5 capitalize`}>
                    {item.category || 'General'} • Status: <span className="text-emerald-400 font-semibold">{item.status}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold">
                    {Number(item.expected_amount || 0) > 0 ? `${currencySymbol}${Number(item.expected_amount).toLocaleString('en-IN')}` : 'Event'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SettingsModal({
  isOpen,
  onClose,
  currentThemeKey,
  onSelectTheme,
  onSignOut,
  user,
  activeTheme,
}) {
  const [profileData, setProfileData] = useState({
    phoneNumber: '',
    timezone: 'UTC',
    subscriptionStatus: 'free',
    loading: true
  });

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    async function fetchProfileDetails() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone_number, timezone, subscription_status')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfileData({
            phoneNumber: data.phone_number || 'Not linked',
            timezone: data.timezone || 'UTC',
            subscriptionStatus: data.subscription_status || 'free',
            loading: false
          });
        }
      } catch (err) {
        console.error('Error fetching profile settings:', err);
        setProfileData(prev => ({ ...prev, loading: false }));
      }
    }

    fetchProfileDetails();
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const themeOptions = [
    { key: 'light', label: 'Clean Light ☀️' },
    { key: 'cyberLime', label: 'Cyber Dark 🌙' },
    { key: 'system', label: 'System Auto 💻' },
  ];

  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

  const handleThemeChange = async (newThemeKey) => {
    onSelectTheme(newThemeKey);
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ theme_preference: newThemeKey, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${cardClass} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all space-y-5 max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Profile & Settings</h3>
          <button onClick={onClose} className={`${subTextClass} hover:opacity-80 text-lg`}>
            ✕
          </button>
        </div>

        {/* User Profile Info Card */}
        {user && (
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-400 text-black font-extrabold flex items-center justify-center text-sm shadow-sm">
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-xs truncate">{user?.user_metadata?.full_name || 'User'}</p>
                <p className={`text-[11px] truncate ${subTextClass}`}>{user?.email}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-black/10 dark:border-white/10 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className={subTextClass}>WhatsApp:</span>
                <p className="font-semibold truncate">+{profileData.phoneNumber}</p>
              </div>
              <div>
                <span className={subTextClass}>Timezone:</span>
                <p className="font-semibold truncate">{profileData.timezone}</p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Status Badge */}
        <div className="p-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-emerald-400">Subscription Tier</p>
            <p className="text-[10px] text-gray-400">
              {profileData.subscriptionStatus === 'active' ? 'Settld Pro (Unlocked)' : 'Free Tier'}
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-400 text-black text-[10px] font-extrabold rounded-lg uppercase">
            {profileData.subscriptionStatus === 'active' ? 'PRO 👑' : 'FREE'}
          </span>
        </div>

        {/* Minimalist Theme Chips Chooser */}
        <div>
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${subTextClass}`}>
            Appearance & Theme
          </label>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ key, label }) => {
              const isSelected = currentThemeKey === key;
              const chipClass = isSelected
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400 font-extrabold'
                : `border-black/10 dark:border-zinc-800 ${inputBgClass} ${subTextClass} hover:opacity-80 font-semibold`;

              return (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  className={`py-2.5 px-2 rounded-xl text-center text-[11px] border transition-all truncate ${chipClass}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 border-t border-black/10 dark:border-white/10">
          <button
            onClick={onSignOut}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs transition-all border border-red-500/20 shadow-sm"
          >
            Sign Out 🚪
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95"
        >
          Save & Done
        </button>
      </div>
    </div>
  );
}
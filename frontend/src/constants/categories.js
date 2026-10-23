export const STANDARD_CATEGORIES = [
  'Bills',
  'Subscriptions',
  'Personal',
  'Health',
  'Documents',
  'Other',
];

export const CATEGORY_ICONS = {
  Bills: '💳',
  Subscriptions: '🎧',
  Personal: '🎂',
  Health: '🩺',
  Documents: '📑',
  Other: '📌',
};

export const CATEGORY_COLORS = {
  Bills: {
    bg: 'bg-blue-950/40',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    accent: 'text-blue-400',
  },
  Subscriptions: {
    bg: 'bg-purple-950/40',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    accent: 'text-purple-400',
  },
  Personal: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    accent: 'text-emerald-400',
  },
  Health: {
    bg: 'bg-rose-950/40',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    accent: 'text-rose-400',
  },
  Documents: {
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    accent: 'text-amber-400',
  },
  Other: {
    bg: 'bg-zinc-900/50',
    border: 'border-zinc-700/40',
    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    accent: 'text-zinc-400',
  },
};

export const CATEGORY_GUIDE = [
  { name: 'Bills', icon: '💳', desc: 'Rent, Utilities, Loan EMIs, Credit Cards' },
  { name: 'Subscriptions', icon: '🎧', desc: 'Streaming, Software, Memberships' },
  { name: 'Personal', icon: '🎂', desc: 'Birthdays, Anniversaries, Social Events' },
  { name: 'Health', icon: '🩺', desc: 'Doctor Checkups, Appointments, Meds' },
  { name: 'Documents', icon: '📑', desc: 'Insurance, Vehicle Renewals, Passports' },
  { name: 'Other', icon: '📌', desc: 'General Reminders & Miscellaneous' },
];

export const GEN_Z_THEMES = {
  light: {
    name: 'Clean Light',
    bg: 'bg-slate-50',
    text: 'text-slate-900',
    subText: 'text-slate-500',
    card: 'bg-white border-slate-200 shadow-sm hover:border-slate-300 text-slate-900',
    inputBg: 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-slate-300',
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    accentText: 'text-emerald-600',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    chipActive: 'bg-slate-900 text-white border-slate-900 shadow-sm',
    chipInactive: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100',
    chipCountActive: 'bg-white/20 text-white',
    chipCountInactive: 'bg-slate-100 text-slate-500',
  },
  cyberLime: {
    name: 'Cyber Dark',
    bg: 'bg-black',
    text: 'text-gray-100',
    subText: 'text-gray-400',
    card: 'bg-zinc-900 border-zinc-800 hover:border-lime-400/40 text-gray-100',
    inputBg: 'bg-zinc-900 border-zinc-800 text-white hover:border-lime-400/40',
    primary: 'bg-lime-400 text-black hover:bg-lime-300',
    accentText: 'text-lime-400',
    badge: 'bg-lime-400/10 text-lime-400 border-lime-400/30',
    chipActive: 'bg-lime-400 text-black border-lime-400 shadow-md',
    chipInactive: 'bg-zinc-900 text-gray-300 border-zinc-800 hover:bg-zinc-800',
    chipCountActive: 'bg-black/20 text-black',
    chipCountInactive: 'bg-zinc-800 text-gray-400',
  },
};
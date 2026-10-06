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
  cyberLime: {
    name: 'Cyber Lime',
    bg: 'bg-black',
    card: 'bg-zinc-900 border-lime-400/30',
    primary: 'bg-lime-400 text-black hover:bg-lime-300',
    accentText: 'text-lime-400',
    badge: 'bg-lime-400/10 text-lime-400 border-lime-400/30',
  },
  digitalLavender: {
    name: 'Digital Lavender',
    bg: 'bg-purple-950',
    card: 'bg-purple-900/40 border-purple-400/30',
    primary: 'bg-purple-400 text-purple-950 hover:bg-purple-300',
    accentText: 'text-purple-300',
    badge: 'bg-purple-400/10 text-purple-300 border-purple-300/30',
  },
  roseGold: {
    name: 'Rose Gold',
    bg: 'bg-rose-950',
    card: 'bg-rose-900/40 border-rose-400/30',
    primary: 'bg-rose-300 text-rose-950 hover:bg-rose-200',
    accentText: 'text-rose-300',
    badge: 'bg-rose-400/10 text-rose-300 border-rose-300/30',
  },
  executiveNavy: {
    name: 'Executive Slate',
    bg: 'bg-slate-950',
    card: 'bg-slate-900/50 border-slate-700/40',
    primary: 'bg-sky-400 text-slate-950 hover:bg-sky-300',
    accentText: 'text-sky-300',
    badge: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  },
  matchaTeal: {
    name: 'Matcha Teal',
    bg: 'bg-emerald-950',
    card: 'bg-emerald-900/40 border-emerald-400/30',
    primary: 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300',
    accentText: 'text-emerald-300',
    badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  },
};
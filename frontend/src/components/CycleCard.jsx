import { CATEGORY_ICONS } from '../constants/categories';
import { CATEGORY_CONFIG } from '../constants/categoryConfig';
import ActionSlider from './ActionSlider';

export default function CycleCard({
  item,
  isActive,
  onClick,
  currencySymbol,
  onOpenPaymentModal,
}) {
  const categoryName = item.category || 'Other';
  const categoryIcon = CATEGORY_ICONS[categoryName] || CATEGORY_ICONS.Other || '📌';
  const bgImage = (CATEGORY_CONFIG[categoryName] || CATEGORY_CONFIG.Other)?.bgImage || '';
  
  const cardTitle = item.name || item.obligation_name || 'Untitled Reminder';

  const isOverdue = item.due_date && new Date(item.due_date) < new Date();
  const hasAmount = item.expected_amount && Number(item.expected_amount) > 0;

  const formatDueTime = (timeStr) => {
    if (!timeStr || timeStr === 'No Time') return 'No Time';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    if (isNaN(h)) return timeStr;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 === 0 ? 12 : h % 12;
    return `${String(formattedHour).padStart(2, '0')}:${minutes} ${suffix}`;
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const rawTime = item.reminder_time || item.due_time;
  const formattedTime = formatDueTime(rawTime);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.60), rgba(15,23,42,0.92)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className={`w-[80%] shrink-0 mx-[2.5%] rounded-3xl border p-6 transition-all duration-300 cursor-pointer shadow-2xl relative overflow-hidden backdrop-blur-xl ${
        isActive
          ? 'scale-100 opacity-100 border-white/30 ring-4 ring-white/10 shadow-emerald-500/5'
          : 'scale-90 opacity-40 border-white/10 blur-[0.5px]'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border bg-zinc-900/90 text-white border-white/20 shadow-sm">
          <span>{categoryIcon}</span>
          <span>{categoryName}</span>
        </span>
        {item.frequency && (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-gray-200 border border-white/15 uppercase tracking-wider">
            {item.frequency}
          </span>
        )}
      </div>

      <h2 className="text-2xl font-black mb-1.5 text-white tracking-tight drop-shadow-md">
        {cardTitle}
      </h2>
      <p
        className={`text-xs mb-6 font-semibold tracking-wide drop-shadow ${
          isOverdue ? 'text-red-400 font-bold' : 'text-gray-300'
        }`}
      >
        {isOverdue
          ? `⚠️ Overdue (${formatDueDate(item.due_date)})`
          : `Due ${formatDueDate(item.due_date)} at ${formattedTime}`}
      </p>

      <div className="min-h-[48px] mb-6 flex items-center">
        {hasAmount && (
          <p className="text-4xl font-black text-white tracking-tight drop-shadow-lg">
            {currencySymbol}
            {Number(item.expected_amount).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {isActive && <ActionSlider onComplete={onOpenPaymentModal} />}
    </div>
  );
}
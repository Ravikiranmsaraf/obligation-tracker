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
  const bgImage = (CATEGORY_CONFIG[categoryName] || CATEGORY_CONFIG.Other).bgImage;
  const isOverdue = new Date(item.due_date) < new Date();
  const hasAmount = item.expected_amount && Number(item.expected_amount) > 0;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.50), rgba(0,0,0,0.85)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className={`w-[75%] shrink-0 mx-[2.5%] rounded-3xl border border-white/20 p-5 transition-all duration-300 cursor-pointer shadow-xl relative overflow-hidden backdrop-blur-md ${
        isActive
          ? 'scale-100 opacity-100 ring-2 ring-white/50 shadow-2xl'
          : 'scale-90 opacity-40 blur-[0.5px]'
      }`}
    >
      {/* Category Badge */}
      <div className="flex justify-between items-center mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md bg-zinc-900/80 text-white border-white/15 shadow-md">
          <span>{categoryIcon}</span>
          <span>{categoryName}</span>
        </span>
      </div>

      {/* Title & Due Date */}
      <h2 className="text-xl font-extrabold mb-1 text-white truncate drop-shadow-md">
        {item.obligation_name}
      </h2>
      <p
        className={`text-xs mb-5 font-bold drop-shadow ${
          isOverdue ? 'text-red-300' : 'text-gray-300'
        }`}
      >
        {isOverdue
          ? `⚠️ ${Math.ceil(
              (new Date().getTime() - new Date(item.due_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )} days late`
          : `Due ${new Date(item.due_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}`}
      </p>

      {/* Amount Display (Bubbles/Text removed for Events) */}
      <div className="min-h-[44px] mb-5 flex items-center">
        {hasAmount && (
          <p className="text-3xl font-black text-white drop-shadow-lg">
            {currencySymbol}
            {Number(item.expected_amount).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {/* Action Slider */}
      {isActive && <ActionSlider onComplete={onOpenPaymentModal} />}
    </div>
  );
}
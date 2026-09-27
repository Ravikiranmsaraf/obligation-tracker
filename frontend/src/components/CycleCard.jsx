import { CATEGORY_CONFIG } from '../constants/categoryConfig';
import ActionSlider from './ActionSlider';

export default function CycleCard({
  item,
  isActive,
  onClick,
  currencySymbol,
  onOpenPaymentModal,
}) {
  const categoryKey =
    CATEGORY_CONFIG[item.category]
      ? item.category
      : item.obligation_name?.toLowerCase().includes('rent')
      ? 'Rent'
      : item.obligation_name?.toLowerCase().includes('birthday') ||
        item.obligation_name?.toLowerCase().includes('anniversary')
      ? 'Personal'
      : 'Default';

  const config = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.Default;
  const isOverdue = new Date(item.due_date) < new Date();

  return (
    <div
      onClick={onClick}
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.60), rgba(0,0,0,0.88)), url(${config.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className={`w-[75%] shrink-0 mx-[2.5%] rounded-3xl border border-white/20 p-5 transition-all duration-300 cursor-pointer shadow-xl relative overflow-hidden backdrop-blur-sm ${
        isActive
          ? 'scale-100 opacity-100 ring-2 ring-white/50 shadow-2xl'
          : 'scale-90 opacity-40 blur-[0.5px]'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${config.badge}`}
        >
          <span>{config.icon}</span>
          <span>{item.category || categoryKey}</span>
        </span>
      </div>

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

      <div className="min-h-[44px] mb-5 flex items-center">
        {item.expected_amount && Number(item.expected_amount) > 0 ? (
          <p className="text-3xl font-black text-white drop-shadow-lg">
            {currencySymbol}
            {Number(item.expected_amount).toLocaleString('en-IN')}
          </p>
        ) : (
          <span className="text-xs font-semibold text-gray-200 italic bg-black/60 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md">
            Event / Appointment
          </span>
        )}
      </div>

      {isActive && <ActionSlider onComplete={onOpenPaymentModal} />}
    </div>
  );
}
export default function CelebrationCard({ currentMonthName }) {
  return (
    <div
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.40), rgba(0,0,0,0.85)), url('https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className="w-[85%] max-w-sm mx-auto rounded-3xl border border-amber-400/30 p-6 text-center shadow-2xl relative overflow-hidden backdrop-blur-md my-4"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-amber-400/40 bg-amber-400/10 text-amber-300 mb-4 shadow-sm">
        ✨ Monthly Goal Achieved
      </div>

      <h2 className="text-2xl font-black text-white mb-2 drop-shadow-md">
        {currentMonthName} Settld! 🥂
      </h2>

      <p className="text-xs text-gray-200 font-medium mb-6 leading-relaxed">
        You’re completely caught up. Zero pending bills or events for this month.
      </p>

      <div className="py-2.5 px-4 bg-black/60 border border-white/10 rounded-2xl backdrop-blur-md inline-block">
        <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
          <span>🌿</span> Take a breather, living your best life!
        </span>
      </div>
    </div>
  );
}
import { CATEGORY_GUIDE } from '../constants/categories';

export default function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl relative">
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>❓</span> Category Guide
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white font-bold text-sm bg-zinc-800 w-7 h-7 rounded-full flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {CATEGORY_GUIDE.map((item) => (
            <div
              key={item.name}
              className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5"
            >
              <span className="text-2xl p-1 bg-zinc-800/80 rounded-xl">{item.icon}</span>
              <div>
                <p className="text-sm font-bold text-white">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
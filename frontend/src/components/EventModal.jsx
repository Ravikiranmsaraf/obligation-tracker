export default function EventModal({ cycle, onClose, onConfirm }) {
  if (!cycle) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl relative text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl mx-auto mb-3">
          🎉
        </div>

        <h3 className="text-lg font-bold text-white mb-1">{cycle.title || 'Event Reminder'}</h3>
        <p className="text-xs text-gray-400 mb-6">
          Did you attend, wish, or complete this event?
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => onConfirm('completed')}
            className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold py-3 rounded-2xl text-xs transition-colors shadow-md"
          >
            Yes, Completed! 🎉
          </button>

          <button
            onClick={() => onConfirm('skipped')}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-semibold py-3 rounded-2xl text-xs transition-colors"
          >
            Skipped ⏭️
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
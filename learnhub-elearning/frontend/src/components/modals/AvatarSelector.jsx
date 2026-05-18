import { useState } from 'react';
import { X, Check } from 'lucide-react';

const DICEBEAR_AVATARS = Array.from({ length: 20 }, (_, i) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 15}`);

const ALL_AVATARS = DICEBEAR_AVATARS;

const AvatarSelector = ({ isOpen, onClose, onSelect, currentAvatar }) => {
  const [selected, setSelected] = useState(currentAvatar);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-surface-card border-2 border-bdr rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-bdr flex items-center justify-between bg-surface-card/50">
          <div>
            <h2 className="text-xl font-black text-txt">Choose Your Character</h2>
            <p className="text-txt-muted text-sm">Select an avatar that represents you</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-txt-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Grid */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
            {ALL_AVATARS.map((url, index) => (
              <button
                key={index}
                onClick={() => setSelected(url)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${
                  selected === url
                    ? 'border-yellow-400 ring-4 ring-yellow-400/20 scale-95'
                    : 'border-bdr hover:border-yellow-400/50 hover:scale-105'
                }`}
              >
                <img
                  src={url}
                  alt={`Avatar ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {selected === url && (
                  <div className="absolute inset-0 bg-yellow-400/10 flex items-center justify-center">
                    <div className="bg-yellow-400 text-black p-1.5 rounded-full shadow-lg">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-bdr bg-surface-card/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-2xl border-2 border-bdr font-bold text-txt hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSelect(selected);
              onClose();
            }}
            disabled={!selected}
            className="flex-[2] btn-primary py-3 rounded-2xl shadow-xl shadow-yellow-400/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Character
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelector;

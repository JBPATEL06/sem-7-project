import React from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';

interface DocumentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  docName: string;
  onChangeDocName: (name: string) => void;
  pageBackground: string;
  onChangePageBackground: (color: string) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
}

export const DocumentSettingsModal: React.FC<DocumentSettingsModalProps> = ({
  isOpen,
  onClose,
  docName,
  onChangeDocName,
  pageBackground,
  onChangePageBackground,
  showGrid,
  onToggleGrid
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#242424] border border-[#444444] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 text-slate-200">
        <div className="flex items-center justify-between border-b border-[#333333] pb-3">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-4 h-4 text-[#0d99ff]" />
            <h3 className="text-sm font-bold text-white">Document Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#333333] rounded text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-medium">Document Title</label>
            <input
              type="text"
              value={docName}
              onChange={e => onChangeDocName(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#0d99ff] rounded px-3 py-1.5 text-xs text-white outline-none"
              placeholder="Untitled Document"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1.5 font-medium">Canvas Background Surface</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Light', color: '#F5F5F5' },
                { label: 'Dark', color: '#1E1E1E' },
                { label: 'Navy', color: '#0E131F' },
                { label: 'White', color: '#FFFFFF' }
              ].map(preset => (
                <button
                  key={preset.color}
                  onClick={() => onChangePageBackground(preset.color)}
                  className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                    pageBackground.toLowerCase() === preset.color.toLowerCase()
                      ? 'border-[#0d99ff] bg-[#0d99ff]/10 text-white'
                      : 'border-[#383838] bg-[#1e1e1e] text-slate-400 hover:text-white hover:border-[#555555]'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md mb-1 border border-black/20" style={{ backgroundColor: preset.color }} />
                  <span className="text-[10px]">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-[#333333]">
            <div>
              <div className="font-medium text-white text-xs">Canvas Dot Grid</div>
              <div className="text-[10px] text-slate-400">Show background alignment grid dots</div>
            </div>
            <button
              onClick={onToggleGrid}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                showGrid ? 'bg-[#0d99ff]' : 'bg-[#383838]'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                showGrid ? 'left-5' : 'left-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-[#333333]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0d99ff] hover:bg-[#007be5] text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

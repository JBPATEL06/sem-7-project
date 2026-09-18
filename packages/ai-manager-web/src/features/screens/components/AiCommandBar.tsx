import React, { useState } from 'react';
import { Sparkles, X, Send, Wand2, Layers, Palette } from 'lucide-react';

interface AiCommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  prompt: string;
  setPrompt: (prompt: string) => void;
  isGenerating: boolean;
  onGenerate: (theme?: string, category?: string) => void;
}

export const AiCommandBar: React.FC<AiCommandBarProps> = ({
  isOpen,
  onClose,
  selectedCount,
  prompt,
  setPrompt,
  isGenerating,
  onGenerate
}) => {
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [selectedCategory, setSelectedCategory] = useState('dashboard');

  if (!isOpen) return null;

  const quickPrompts = [
    { label: '📊 SaaS Analytics Dashboard', text: 'Modern SaaS analytics dashboard with revenue charts, user conversion stats, and recent activities', cat: 'dashboard' },
    { label: '💳 Crypto Wallet App', text: 'Mobile crypto wallet screen with asset balances, send/receive action pills, and transaction list', cat: 'mobile' },
    { label: '🔐 Clean Auth Portal', text: 'Clean glassmorphic login screen with email, password, OAuth buttons, and remember me checkbox', cat: 'auth' },
    { label: '🛍️ Luxury Product Detail', text: 'Minimalist luxury sneaker product page with image showcase, size selector, price, and Add to Cart', cat: 'ecommerce' }
  ];

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-[#1c1c1f]/95 border border-indigo-500/40 backdrop-blur-2xl rounded-2xl shadow-2xl p-4 space-y-3.5 ring-4 ring-indigo-500/10 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
              <Wand2 className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Stitch AI Screen Synthesizer</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono border border-indigo-500/30">
                  Groq 120B & 20B Engine
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {selectedCount > 0 ? `Targeting ${selectedCount} element(s) for smart mutation` : 'Synthesizes full layout AST & native binary .fig design file'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prompt Input Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            onGenerate(selectedTheme, selectedCategory);
          }}
          className="space-y-3"
        >
          <div className="flex items-center space-x-2 bg-[#121214] border border-zinc-700/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl px-3.5 py-2.5 transition">
            <Sparkles className={`w-4 h-4 shrink-0 ${isGenerating ? 'text-indigo-400 animate-spin' : 'text-zinc-400'}`} />
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe UI layout, cards, navigation, forms, buttons..."
              className="flex-1 bg-transparent text-xs text-white outline-none placeholder-zinc-500 font-sans"
              autoFocus
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-indigo-500/25 cursor-pointer disabled:opacity-40 transition-all flex items-center space-x-1.5 shrink-0"
            >
              {isGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Synthesize Screen</span>
                </>
              )}
            </button>
          </div>

          {/* Configuration Pills (Theme & Category) */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
            <div className="flex items-center space-x-2">
              <span className="flex items-center gap-1 text-zinc-400 font-medium">
                <Palette className="w-3 h-3 text-indigo-400" /> Theme:
              </span>
              <div className="flex items-center bg-[#121214] border border-zinc-800 rounded-lg p-0.5">
                {(['dark', 'light', 'glassmorphic'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTheme(t)}
                    className={`px-2 py-0.5 rounded capitalize transition cursor-pointer ${
                      selectedTheme === t ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="flex items-center gap-1 text-zinc-400 font-medium">
                <Layers className="w-3 h-3 text-indigo-400" /> Category:
              </span>
              <div className="flex items-center bg-[#121214] border border-zinc-800 rounded-lg p-0.5">
                {(['dashboard', 'mobile', 'ecommerce', 'auth'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2 py-0.5 rounded capitalize transition cursor-pointer ${
                      selectedCategory === c ? 'bg-violet-600 text-white font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Preset Prompts */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Quick Prompt Presets</span>
            <div className="grid grid-cols-2 gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(p.text);
                    setSelectedCategory(p.cat);
                  }}
                  className="text-left p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-indigo-500/40 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  <p className="font-semibold text-[11px] text-indigo-300">{p.label}</p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{p.text}</p>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

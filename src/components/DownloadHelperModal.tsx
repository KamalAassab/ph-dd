'use client';

import React, { useEffect, useCallback } from 'react';
import { X, HelpCircle, Monitor, Smartphone, Check, Copy } from 'lucide-react';

interface DownloadHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  directUrl?: string;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function DownloadHelperModal({ isOpen, onClose, directUrl, onShowToast }: DownloadHelperModalProps) {
  const [copied, setCopied] = React.useState(false);

  // Keyboard Escape listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (directUrl) {
      navigator.clipboard.writeText(directUrl);
      setCopied(true);
      if (onShowToast) onShowToast('Direct CDN link copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="w-full max-w-lg glass-panel rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 border border-white/[0.08] shadow-2xl relative animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-zinc-700/60 mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff9000]/10 border border-[#ff9000]/20 text-[#ff9000]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="font-bold text-white text-base">Direct Download Guide</h3>
              <p className="text-xs text-zinc-400">Tips for saving directly to your local device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-3.5 text-sm text-zinc-300">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-3 items-start">
            <Monitor className="w-5 h-5 text-[#ff9000] shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white text-xs sm:text-sm">Desktop (Chrome, Edge, Firefox, Safari)</div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                If the download opens in a new tab instead of saving directly, simply <strong className="text-white">right-click the video</strong> and select <strong className="text-white">&quot;Save Video As...&quot;</strong> (or press <code className="bg-black/60 border border-white/10 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">Ctrl + S</code> / <code className="bg-black/60 border border-white/10 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">⌘ + S</code>).
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-3 items-start">
            <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-white text-xs sm:text-sm">Mobile (iPhone, iPad, Android)</div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                On iOS Safari, tap the Share icon and select <strong className="text-white">&quot;Save to Files&quot;</strong>. On Android Chrome, tap the 3 dots on the video player and choose <strong className="text-white">&quot;Download&quot;</strong>.
              </p>
            </div>
          </div>

          {/* Copy Direct Link */}
          {directUrl && (
            <div className="mt-4 pt-3.5 border-t border-white/[0.08]">
              <label className="text-xs font-semibold text-zinc-400 block mb-2">Direct CDN Media Stream Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={directUrl}
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-white transition-all active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#ff9000] to-[#ffa31a] text-black hover:brightness-110 transition-all active:scale-95"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}


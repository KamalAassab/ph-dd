'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clipboard, X, ArrowRight, AlertCircle, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

interface UrlInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SAMPLE_URL = 'https://www.pornhub.com/view_video.php?viewkey=68e2bb7570170';

export default function UrlInputForm({ onSubmit, isLoading, onShowToast }: UrlInputFormProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateUrl = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed) {
      setValidationError(null);
      return false;
    }

    const hasPhDomain = /pornhub\.com|hubporno\.com/i.test(trimmed);
    const hasViewkey = /(?:viewkey=|embed\/|video\/|^)(ph[a-f0-9]+|[a-f0-9]{8,})/i.test(trimmed);

    if (!hasPhDomain && !hasViewkey) {
      setValidationError('Please enter a valid video URL or viewkey (e.g. pornhub.com/view_video.php?viewkey=...).');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text);
          setValidationError(null);
          if (onShowToast) onShowToast('Pasted URL from clipboard', 'success');
          inputRef.current?.focus();
        } else {
          if (onShowToast) onShowToast('Clipboard is empty', 'info');
        }
      } else {
        if (onShowToast) onShowToast('Please press Ctrl+V or long-tap to paste', 'info');
      }
    } catch {
      if (onShowToast) onShowToast('Clipboard permission denied by browser', 'info');
    }
  };

  const handleClear = () => {
    setUrl('');
    setValidationError(null);
    inputRef.current?.focus();
  };

  const handleSampleClick = () => {
    setUrl(SAMPLE_URL);
    setValidationError(null);
    if (onShowToast) onShowToast('Sample test URL loaded', 'info');
    onSubmit(SAMPLE_URL);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isLoading) return;

    if (validateUrl(trimmed)) {
      onSubmit(trimmed);
    } else {
      if (onShowToast) onShowToast('Please enter a complete video URL containing a viewkey', 'error');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="glass-panel p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-white/[0.12] shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative z-10 transition-all duration-300 focus-within:border-[#ff9000]/60 focus-within:ring-4 focus-within:ring-[#ff9000]/10">
          
          {/* Input Field Container */}
          <div className="relative flex-1 flex items-center min-h-[50px] px-3.5 sm:px-4">
            <Search className="w-5 h-5 text-zinc-400 group-focus-within:text-[#ff9000] transition-colors shrink-0 mr-3" />
            
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={handleInputChange}
              placeholder="Paste video URL (e.g. pornhub.com/view_video.php?viewkey=...)"
              aria-label="Video URL input"
              className="w-full bg-transparent text-white text-sm sm:text-base font-medium placeholder-zinc-500 focus:outline-none pr-14"
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />

            {/* Clear or Paste Quick Buttons */}
            <div className="absolute right-2 sm:right-3 flex items-center gap-1">
              {url ? (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Clear input text"
                  aria-label="Clear input text"
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                  aria-label="Paste URL from clipboard"
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.08] transition-all active:scale-95"
                >
                  <Clipboard className="w-3.5 h-3.5 text-[#ff9000]" />
                  <span className="text-xs">Paste</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Button (Responsive: Full-width on mobile / Inline on sm+) */}
          <div className="p-2 sm:p-2 sm:pl-0">
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-bold text-sm bg-gradient-to-r from-[#ff9000] via-[#ffa31a] to-[#ffb84d] text-black hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-[#ff9000]/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-black animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <span>Extract HD</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-rose-300 bg-rose-950/40 border border-rose-800/40 px-3.5 py-2.5 rounded-xl animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}
      </form>

      {/* Quick Helper Subtext & Sample Link */}
      <div className="mt-3.5 sm:mt-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 text-xs text-zinc-400 px-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff9000]"></span>
          <span>Direct browser downloads up to 720p HD</span>
        </div>
        <button
          type="button"
          onClick={handleSampleClick}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-[#ff9000] transition-colors underline underline-offset-4 focus:outline-none"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#ff9000]" />
          <span>Try a sample test URL</span>
        </button>
      </div>
    </div>
  );
}


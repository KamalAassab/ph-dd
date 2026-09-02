'use client';

import React, { useState, useRef } from 'react';
import { Search, Clipboard, X, ArrowRight, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

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
      setValidationError('Please enter a valid video URL or viewkey.');
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
        }
      }
    } catch {
      // ignore
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
      if (onShowToast) onShowToast('Please enter a valid video URL with viewkey', 'error');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-[#111114] p-2 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          
          {/* Input Field Container */}
          <div className="relative flex-1 flex items-center min-h-[46px] px-3">
            <Search className="w-4 h-4 text-zinc-500 shrink-0 mr-3" />
            
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={handleInputChange}
              placeholder="Paste video link here..."
              aria-label="Video URL input"
              className="w-full bg-transparent text-white text-sm placeholder-zinc-500 focus:outline-none pr-12"
              disabled={isLoading}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />

            {/* Clear or Paste Quick Buttons */}
            <div className="absolute right-2 flex items-center gap-1">
              {url ? (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Clear input text"
                  className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                  className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5 inline mr-1 text-[#ff9000]" />
                  Paste
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full sm:w-auto h-10 px-5 rounded-lg text-xs font-semibold bg-[#ff9000] hover:bg-[#ffa31a] text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <span>Extract</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 px-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </form>

      {/* Helper text */}
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>Max quality 720p HD</span>
        <button
          type="button"
          onClick={handleSampleClick}
          disabled={isLoading}
          className="text-zinc-400 hover:text-[#ff9000] transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-[#ff9000]" />
          <span>Try sample</span>
        </button>
      </div>
    </div>
  );
}

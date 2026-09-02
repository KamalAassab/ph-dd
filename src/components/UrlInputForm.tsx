'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
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
    if (onShowToast) onShowToast('Sample test video loaded', 'info');
    onSubmit(SAMPLE_URL);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isLoading) return;

    if (validateUrl(trimmed)) {
      onSubmit(trimmed);
    } else {
      if (onShowToast) onShowToast('Please enter a valid video link', 'error');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <motion.div 
          whileFocus={{ scale: 1.005 }}
          className="bg-[#121216]/95 p-2 sm:p-2.5 rounded-2xl border border-zinc-800/90 shadow-2xl shadow-black/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-all focus-within:border-[#ff9000]/60 focus-within:ring-4 focus-within:ring-[#ff9000]/10 backdrop-blur-md"
        >
          {/* Input Field Container */}
          <div className="relative flex-1 flex items-center min-h-[48px] px-3">
            <Search className="w-4 h-4 text-zinc-500 shrink-0 mr-3" />
            
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={handleInputChange}
              placeholder="Paste Pornhub video link here..."
              aria-label="Video URL input"
              className="w-full bg-transparent text-white text-sm sm:text-base placeholder-zinc-500 focus:outline-none pr-14"
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
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                  className="text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 transition-colors flex items-center gap-1"
                >
                  <Clipboard className="w-3.5 h-3.5 text-[#ff9000]" />
                  <span>Paste</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading || !url.trim()}
              className="w-full sm:w-auto h-11 px-6 rounded-xl text-xs sm:text-sm font-bold bg-[#ff9000] hover:bg-[#ffa31a] text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#ff9000]/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <span>Download</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Validation Error Message */}
        {validationError && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 px-3"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </motion.div>
        )}
      </form>

      {/* Helper info bar */}
      <div className="mt-3.5 flex items-center justify-between text-xs text-zinc-500 px-2">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff9000]"></span>
          Supports 1080p, 720p, 420p & 360p
        </span>
        <button
          type="button"
          onClick={handleSampleClick}
          disabled={isLoading}
          className="text-zinc-400 hover:text-[#ff9000] transition-colors flex items-center gap-1.5 group"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#ff9000] group-hover:rotate-12 transition-transform" />
          <span>Try sample video</span>
        </button>
      </div>
    </div>
  );
}

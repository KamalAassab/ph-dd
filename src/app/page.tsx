'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import UrlInputForm from '@/components/UrlInputForm';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import VideoResultCard from '@/components/VideoResultCard';
import FeaturesAndFaq from '@/components/FeaturesAndFaq';
import Toast, { ToastMessage } from '@/components/Toast';
import { VideoMetadata, ExtractionStatus, ExtractApiResponse } from '@/lib/types';
import { AlertTriangle, RefreshCw, Sparkles, Zap } from 'lucide-react';

const DownloadHelperModal = dynamic(() => import('@/components/DownloadHelperModal'), {
  ssr: false,
});

export default function HomePage() {
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [videoData, setVideoData] = useState<VideoMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedUrl, setLastSubmittedUrl] = useState<string>('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleExtract = useCallback(async (url: string) => {
    setStatus('loading');
    setErrorMessage(null);
    setVideoData(null);
    setLastSubmittedUrl(url);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result: ExtractApiResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to extract video. Please check the URL and try again.');
      }

      setVideoData(result.data);
      setStatus('success');
      addToast('Video extracted successfully', 'success');
    } catch (err: any) {
      console.error('Extraction error:', err);
      const msg = err.message || 'An error occurred while extracting the video.';
      setErrorMessage(msg);
      setStatus('error');
      addToast(msg, 'error');
    }
  }, [addToast]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setVideoData(null);
    setErrorMessage(null);
  }, []);

  const handleRetry = useCallback(() => {
    if (lastSubmittedUrl) {
      handleExtract(lastSubmittedUrl);
    }
  }, [lastSubmittedUrl, handleExtract]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#09090b] text-zinc-100 selection:bg-[#ff9000] selection:text-black">
      {/* Navigation Header */}
      <Navbar onOpenGuide={() => setIsGuideOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-semibold text-zinc-400 mb-4">
            <Zap className="w-3.5 h-3.5 text-[#ff9000]" />
            <span>Multi-Threaded HD Streaming Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Download HD Videos Directly
          </h1>

          <p className="mt-3 text-xs sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Extract and download full 1080p, 720p, 420p & 360p MP4 videos with authentic file sizes and zero bloat.
          </p>
        </motion.div>

        {/* Input Form Section */}
        <UrlInputForm 
          onSubmit={handleExtract} 
          isLoading={status === 'loading'} 
          onShowToast={addToast} 
        />

        {/* State 1: Loading Skeleton */}
        <AnimatePresence>
          {status === 'loading' && <LoadingSkeleton />}
        </AnimatePresence>

        {/* State 2: Error Notification Card */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-3xl mx-auto mt-6"
            >
              <div className="rounded-2xl p-5 border border-rose-900/50 bg-rose-950/20 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Extraction Failed</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRetry}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-[#ff9000] text-black hover:bg-[#ffa31a] transition-all flex items-center gap-1.5 shadow-md shadow-[#ff9000]/15"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </motion.button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-9 px-3.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* State 3: Success Video Result Card */}
        <AnimatePresence>
          {status === 'success' && videoData && (
            <VideoResultCard 
              data={videoData} 
              onReset={handleReset} 
              onShowToast={addToast} 
            />
          )}
        </AnimatePresence>

        {/* Features & FAQ Section */}
        <FeaturesAndFaq />
      </main>

      {/* Guide Modal */}
      <DownloadHelperModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onShowToast={addToast}
      />

      {/* Floating Toast Notification */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

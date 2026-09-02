'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import UrlInputForm from '@/components/UrlInputForm';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import VideoResultCard from '@/components/VideoResultCard';
import FeaturesAndFaq from '@/components/FeaturesAndFaq';
import Toast, { ToastMessage } from '@/components/Toast';
import { VideoMetadata, ExtractionStatus, ExtractApiResponse } from '@/lib/types';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

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
      addToast('Video streams extracted successfully!', 'success');
    } catch (err: any) {
      console.error('Extraction error:', err);
      const msg = err.message || 'An unexpected error occurred while communicating with the server.';
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
    <div className="min-h-[100dvh] flex flex-col bg-[#09090b] relative overflow-x-hidden selection:bg-[#ff9000] selection:text-black">
      {/* Radiant Glowing Background Elements */}
      <div className="glow-spot-amber -top-44 -left-44" />
      <div className="glow-spot-gold top-1/4 -right-40" />
      <div className="glow-spot-amber bottom-20 left-1/3 opacity-30" />

      {/* Navigation Header */}
      <Navbar onOpenGuide={() => setIsGuideOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 pt-8 sm:pt-14 pb-16 sm:pb-24 relative z-10">
        
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff9000]/10 border border-[#ff9000]/25 text-[#ffb84d] text-xs font-semibold mb-4 sm:mb-6 shadow-sm shadow-[#ff9000]/10">
            <Sparkles className="w-3.5 h-3.5 text-[#ff9000]" />
            <span>High-Speed yt-dlp Engine • 720p HD Stream Extractor</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.12]">
            Download HD Videos <br className="hidden sm:inline" />
            <span className="shimmer-text">Directly to Your Device</span>
          </h1>

          <p className="mt-3.5 sm:mt-4 text-xs sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Extract high-speed 720p HD, 480p, and 360p direct MP4 download links in seconds. Zero bugs, zero database, streaming directly to your device.
          </p>
        </div>

        {/* Input Form Section */}
        <UrlInputForm 
          onSubmit={handleExtract} 
          isLoading={status === 'loading'} 
          onShowToast={addToast} 
        />

        {/* State 1: Loading Skeleton */}
        {status === 'loading' && <LoadingSkeleton />}

        {/* State 2: Error Notification Card */}
        {status === 'error' && (
          <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="glass-panel rounded-3xl p-5 sm:p-7 border border-rose-500/30 bg-rose-950/25 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Extraction Failed</h3>
                    <p className="text-xs sm:text-sm text-rose-200/90 mt-1 max-w-lg leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#ff9000] text-black hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#ff9000]/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/10 active:scale-95 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Success Video Result Card */}
        {status === 'success' && videoData && (
          <VideoResultCard 
            data={videoData} 
            onReset={handleReset} 
            onShowToast={addToast} 
          />
        )}

        {/* Features, How-to-use & FAQ Section */}
        <FeaturesAndFaq />
      </main>

      {/* Standalone Guide Modal */}
      <DownloadHelperModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onShowToast={addToast}
      />

      {/* Floating Toast Notification System */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}


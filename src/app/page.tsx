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
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
    <div className="min-h-[100dvh] flex flex-col bg-[#09090b] text-zinc-100">
      {/* Navigation Header */}
      <Navbar onOpenGuide={() => setIsGuideOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
            Download HD Videos Directly
          </h1>

          <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Fast, clean direct MP4 downloads up to 720p HD.
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
          <div className="w-full max-w-3xl mx-auto mt-6">
            <div className="rounded-xl p-4 sm:p-5 border border-rose-900/50 bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Extraction Failed</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {errorMessage}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="h-8 px-3 rounded-lg text-xs font-medium bg-[#ff9000] text-black hover:bg-[#ffa31a] transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
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

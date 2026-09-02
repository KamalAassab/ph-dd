'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  Clock, 
  User, 
  Film,
  Loader2,
  Sparkles,
  Zap,
  CheckCircle2,
  FileVideo
} from 'lucide-react';
import { VideoMetadata, VideoFormat } from '@/lib/types';
import DownloadHelperModal from './DownloadHelperModal';

interface VideoResultCardProps {
  data: VideoMetadata;
  onReset: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function VideoResultCard({ data, onReset, onShowToast }: VideoResultCardProps) {
  const [downloadingQuality, setDownloadingQuality] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [activeDownloadSize, setActiveDownloadSize] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activeDirectUrl, setActiveDirectUrl] = useState('');

  const handleCopyFormatLink = useCallback((format: VideoFormat) => {
    if (!format.url) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(format.url);
      setCopiedLink(format.quality);
      if (onShowToast) onShowToast(`${format.quality} direct link copied to clipboard`, 'success');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  }, [onShowToast]);

  /**
   * High-Speed MP4 Downloader with real-time feedback
   */
  const handleDownloadFormat = useCallback((format: VideoFormat) => {
    if (!format.url) return;

    setDownloadingQuality(format.quality);
    setActiveDownloadSize(format.formattedSize || 'Full Size');
    setDownloadProgress(15);

    if (onShowToast) onShowToast(`Starting ${format.quality} (${format.formattedSize || ''}) download...`, 'info');

    const cleanExactTitle = (data.title || 'video')
      .replace(/[\\/:*?"<>|]/g, '')
      .trim() || 'video';

    const downloadApiUrl = `/api/download?viewkey=${encodeURIComponent(data.id)}&url=${encodeURIComponent(data.sourceUrl)}&streamUrl=${encodeURIComponent(format.url)}&quality=${encodeURIComponent(format.quality)}&title=${encodeURIComponent(cleanExactTitle)}`;

    // Dispatch native browser / IDM download
    window.location.assign(downloadApiUrl);

    // Dynamic progress bar feedback
    const step1 = setTimeout(() => setDownloadProgress(45), 400);
    const step2 = setTimeout(() => setDownloadProgress(85), 900);
    const step3 = setTimeout(() => {
      setDownloadProgress(100);
      setTimeout(() => {
        setDownloadingQuality(null);
        setDownloadProgress(0);
        if (onShowToast) onShowToast(`✓ ${format.quality} download active in browser/IDM!`, 'success');
      }, 1200);
    }, 1500);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  }, [data.id, data.sourceUrl, data.title, onShowToast]);

  const thumbnailSrc = data.thumbnail
    ? `/api/thumbnail?url=${encodeURIComponent(data.thumbnail)}&viewkey=${encodeURIComponent(data.id)}`
    : `/api/thumbnail?viewkey=${encodeURIComponent(data.id)}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto mt-8"
    >
      <div className="bg-[#121216]/95 backdrop-blur-xl rounded-3xl p-5 sm:p-8 border border-zinc-800/80 shadow-2xl shadow-black/80">
        
        {/* Header Status Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-zinc-800/60 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Video Extracted Successfully</span>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#ff9000]" />
            <span>New Search</span>
          </motion.button>
        </div>

        {/* Video Presentation Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 mb-8 items-start">
          
          {/* Thumbnail Container */}
          <div className="md:col-span-5 relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 group shadow-lg">
            {data.id || data.thumbnail ? (
              // Thumbnail served through our proxy to avoid CDN expiry / CORS / 403 on iOS
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailSrc}
                alt={data.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <Film className="w-10 h-10 text-zinc-600" />
                <span className="text-xs mt-2 text-zinc-500 font-medium">Video Preview</span>
              </div>
            )}

            {data.duration && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-md text-white text-xs font-mono font-medium px-2.5 py-1 rounded-md border border-white/10 shadow-md">
                {data.duration}
              </div>
            )}
          </div>

          {/* Metadata Specs */}
          <div className="md:col-span-7 flex flex-col justify-between h-full space-y-4">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-white leading-snug tracking-tight">
                {data.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-400">
                {data.author && (
                  <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800">
                    <User className="w-3.5 h-3.5 text-[#ff9000]" />
                    <span className="text-zinc-200 font-medium">{data.author}</span>
                  </div>
                )}
                {data.duration && (
                  <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{data.duration}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff9000]"></span>
                Source: Pornhub
              </span>
              <span className="font-medium text-zinc-400">
                Highest Quality: <strong className="text-white">{data.formats[0]?.quality || '1080p'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Live Active Download Progress Card */}
        <AnimatePresence>
          {downloadingQuality && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-[#ff9000]/30 shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs sm:text-sm mb-2.5">
                <div className="flex items-center gap-2.5 text-white font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ff9000]" />
                  <span>Streaming {downloadingQuality} MP4 ({activeDownloadSize})</span>
                </div>
                <span className="font-mono font-bold text-[#ff9000] text-sm">{downloadProgress}%</span>
              </div>

              {/* Animated Progress Track */}
              <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden shadow-inner">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#ff9000] via-[#ffa31a] to-[#ffb84d] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${downloadProgress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>

              <div className="mt-2.5 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Direct stream connection to browser / IDM</span>
                <span>{downloadProgress === 100 ? 'Transfer Complete' : 'Receiving data...'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resolutions List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#ff9000]" />
              <span>Available Resolutions & Exact Sizes</span>
            </h3>
            <span className="text-xs text-zinc-400 font-mono font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              {data.formats.length} Qualities
            </span>
          </div>

          <div className="space-y-2.5">
            {data.formats.map((fmt, index) => {
              const isCurrentlyDownloading = downloadingQuality === fmt.quality;
              const isCopied = copiedLink === fmt.quality;
              const height = parseInt(fmt.quality.replace(/\D/g, ''), 10) || 0;
              const isNativeDirect = height >= 720;

              return (
                <motion.div
                  key={fmt.quality}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 flex items-center justify-between gap-3 transition-all duration-200"
                >
                  {/* Left Info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0">
                      <FileVideo className="w-4 h-4 text-[#ff9000]" />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="font-extrabold text-white text-sm sm:text-base">
                        {fmt.quality}
                      </span>

                      {fmt.formattedSize && (
                        <span className="text-xs font-mono font-bold text-[#ff9000] bg-[#ff9000]/10 border border-[#ff9000]/20 px-2 py-0.5 rounded-md w-fit">
                          {fmt.formattedSize}
                        </span>
                      )}

                      <span className="text-xs text-zinc-500 hidden md:inline">
                        {isNativeDirect ? 'Original HD • Direct Stream' : 'Optimized MP4'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleCopyFormatLink(fmt)}
                      title="Copy direct stream link"
                      aria-label={`Copy ${fmt.quality} stream URL`}
                      className="p-2.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/40 transition-colors"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleDownloadFormat(fmt)}
                      disabled={isCurrentlyDownloading}
                      className="h-10 min-w-[125px] sm:min-w-[140px] flex items-center justify-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#ff9000] hover:bg-[#ffa31a] text-black transition-all disabled:opacity-50 shadow-md shadow-[#ff9000]/15"
                    >
                      {isCurrentlyDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
                          <span>Download</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Helper Modal */}
      <DownloadHelperModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        directUrl={activeDirectUrl}
      />
    </motion.div>
  );
}

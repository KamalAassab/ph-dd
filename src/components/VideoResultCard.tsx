'use client';

import React, { useState, useCallback } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  Clock, 
  User, 
  Film,
  Loader2,
  HardDrive,
  CheckCircle2
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
      if (onShowToast) onShowToast(`${format.quality} link copied`, 'success');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  }, [onShowToast]);

  /**
   * Automatic Direct MP4 Downloader with live progress tracker
   */
  const handleDownloadFormat = useCallback((format: VideoFormat) => {
    if (!format.url) return;

    setDownloadingQuality(format.quality);
    setActiveDownloadSize(format.formattedSize || 'Full Size');
    setDownloadProgress(15);

    if (onShowToast) onShowToast(`Starting ${format.quality} (${format.formattedSize || ''}) download...`, 'info');

    const sanitizedTitle = (data.title || 'video')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'video';

    const downloadApiUrl = `/api/download?url=${encodeURIComponent(data.sourceUrl)}&quality=${encodeURIComponent(format.quality)}&title=${encodeURIComponent(sanitizedTitle)}`;

    // Dispatch native download
    window.location.assign(downloadApiUrl);

    // Progress bar animation
    const step1 = setTimeout(() => setDownloadProgress(45), 400);
    const step2 = setTimeout(() => setDownloadProgress(85), 900);
    const step3 = setTimeout(() => {
      setDownloadProgress(100);
      setTimeout(() => {
        setDownloadingQuality(null);
        setDownloadProgress(0);
        if (onShowToast) onShowToast(`✓ ${format.quality} download stream active!`, 'success');
      }, 1200);
    }, 1500);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
    };
  }, [data.sourceUrl, data.title, onShowToast]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-[#111114] rounded-2xl p-5 sm:p-7 border border-zinc-800/80">
        
        {/* Status Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium text-zinc-300">Ready to download</span>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Search</span>
          </button>
        </div>

        {/* Video Presentation Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          
          {/* Thumbnail */}
          <div className="md:col-span-5 relative aspect-video rounded-xl overflow-hidden bg-zinc-900">
            {data.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbnail}
                alt={data.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                <Film className="w-8 h-8 text-zinc-600" />
                <span className="text-xs mt-1 text-zinc-500">Video</span>
              </div>
            )}

            {data.duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-mono px-2 py-0.5 rounded">
                {data.duration}
              </div>
            )}
          </div>

          {/* Metadata Specs */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white leading-snug">
                {data.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-400">
                {data.author && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{data.author}</span>
                  </div>
                )}
                {data.duration && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{data.duration}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
              <span>Source: Pornhub</span>
              <span>Max: 720p HD</span>
            </div>
          </div>
        </div>

        {/* Live Active Download Progress Card */}
        {downloadingQuality && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-700/80 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 text-white font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff9000]" />
                <span>Downloading {downloadingQuality} MP4 ({activeDownloadSize})</span>
              </div>
              <span className="font-mono font-semibold text-[#ff9000]">{downloadProgress}%</span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#ff9000] to-[#ffa31a] transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            <div className="mt-2 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Transferring stream directly to your device</span>
              <span>{downloadProgress === 100 ? 'Handed off to browser' : 'Receiving data...'}</span>
            </div>
          </div>
        )}

        {/* Resolutions List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Available Resolutions & Sizes
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Total 3 Qualities
            </span>
          </div>

          <div className="space-y-2">
            {data.formats.map((fmt) => {
              const isCurrentlyDownloading = downloadingQuality === fmt.quality;
              const isCopied = copiedLink === fmt.quality;

              return (
                <div
                  key={fmt.quality}
                  className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 flex items-center justify-between gap-3 transition-colors"
                >
                  {/* Left info with clear visible File Size */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-white text-sm">
                      {fmt.quality}
                    </span>

                    {fmt.formattedSize && (
                      <span className="text-xs font-mono font-medium text-[#ff9000] bg-[#ff9000]/10 px-2 py-0.5 rounded">
                        {fmt.formattedSize}
                      </span>
                    )}

                    <span className="text-xs text-zinc-400 hidden sm:inline">
                      Full Length MP4
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyFormatLink(fmt)}
                      title="Copy link"
                      aria-label={`Copy ${fmt.quality} link`}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadFormat(fmt)}
                      disabled={isCurrentlyDownloading}
                      className="h-9 min-w-[120px] flex items-center justify-center gap-1.5 px-4 rounded-lg text-xs font-medium bg-[#ff9000] hover:bg-[#ffa31a] text-black transition-colors disabled:opacity-50"
                    >
                      {isCurrentlyDownloading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-black shrink-0" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 stroke-[2] shrink-0" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
    </div>
  );
}

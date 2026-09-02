'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  Film, 
  User, 
  Clock, 
  HelpCircle, 
  Sparkles,
  Zap,
  FileVideo,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { VideoMetadata, VideoFormat } from '@/lib/types';

const DownloadHelperModal = dynamic(() => import('./DownloadHelperModal'), { ssr: false });

interface VideoResultCardProps {
  data: VideoMetadata;
  onReset: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function VideoResultCard({ data, onReset, onShowToast }: VideoResultCardProps) {
  const [downloadingQuality, setDownloadingQuality] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activeDirectUrl, setActiveDirectUrl] = useState<string>('');

  const handleCopyTitle = useCallback(() => {
    if (data.title) {
      navigator.clipboard.writeText(data.title);
      setCopiedTitle(true);
      if (onShowToast) onShowToast('Video title copied to clipboard', 'success');
      setTimeout(() => setCopiedTitle(false), 2000);
    }
  }, [data.title, onShowToast]);

  const handleCopyFormatLink = useCallback((format: VideoFormat) => {
    if (format.url) {
      navigator.clipboard.writeText(format.url);
      setCopiedLink(format.quality);
      if (onShowToast) onShowToast(`${format.quality} direct MP4 link copied`, 'success');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  }, [onShowToast]);

  /**
   * Automatic Direct MP4 Downloader
   * Triggers native browser file download via attachment stream.
   * Because the server sends Content-Disposition: attachment,
   * the browser saves the file directly to disk without leaving the page.
   */
  const handleDownloadFormat = useCallback((format: VideoFormat) => {
    if (!format.url) return;

    setDownloadingQuality(format.quality);
    if (onShowToast) onShowToast(`Starting ${format.quality} MP4 download...`, 'info');

    const sanitizedTitle = (data.title || 'video')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'video';

    const downloadApiUrl = `/api/download?url=${encodeURIComponent(data.sourceUrl)}&quality=${encodeURIComponent(format.quality)}&title=${encodeURIComponent(sanitizedTitle)}`;

    // Standard native download trigger
    window.location.assign(downloadApiUrl);

    setTimeout(() => {
      setDownloadingQuality(null);
      if (onShowToast) onShowToast(`✓ Full ${format.quality} MP4 video downloading to your device!`, 'success');
    }, 2000);
  }, [data.sourceUrl, data.title, onShowToast]);

  const getQualityBadge = (quality: string) => {
    const q = parseInt(quality.replace(/\D/g, ''), 10) || 0;
    if (q >= 720) {
      return {
        label: 'HD 720p',
        badge: 'Best Quality (HD)',
        border: 'border-[#ff9000]/50 hover:border-[#ff9000]',
        bg: 'bg-gradient-to-b from-[#ff9000]/15 to-[#ff9000]/5',
        badgeBg: 'bg-[#ff9000]/20 text-[#ffb84d] border border-[#ff9000]/30',
        btnBg: 'bg-gradient-to-r from-[#ff9000] via-[#ffa31a] to-[#ffb84d] text-black shadow-lg shadow-[#ff9000]/25 hover:brightness-110',
      };
    }
    if (q >= 480) {
      return {
        label: 'SD 480p',
        badge: 'Standard Quality',
        border: 'border-amber-500/30 hover:border-amber-400',
        bg: 'bg-amber-500/10',
        badgeBg: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
        btnBg: 'bg-[#ff9000] text-black hover:brightness-110 shadow-md shadow-[#ff9000]/15',
      };
    }
    if (q >= 360) {
      return {
        label: 'SD 360p',
        badge: 'Medium Quality',
        border: 'border-white/10 hover:border-white/20',
        bg: 'bg-white/[0.03]',
        badgeBg: 'bg-white/[0.06] text-zinc-300 border border-white/10',
        btnBg: 'bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10',
      };
    }
    return {
      label: `${quality} MP4`,
      badge: 'Mobile Compact',
      border: 'border-white/5 hover:border-white/15',
      bg: 'bg-white/[0.02]',
      badgeBg: 'bg-white/[0.04] text-zinc-400 border border-white/5',
      btnBg: 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/10',
    };
  };

  const topQuality = data.formats[0]?.quality || '720p';


  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="glass-panel rounded-3xl p-4 sm:p-7 md:p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden">
        
        {/* Status Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/[0.08] mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400">
              Video Extracted • Ready to Download
            </span>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] px-3 sm:px-3.5 py-1.5 rounded-xl border border-white/[0.08] transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Search</span>
          </button>
        </div>

        {/* Video Presentation Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 mb-7 sm:mb-8">
          
          {/* HD Thumbnail Card */}
          <div className="md:col-span-5 relative aspect-video rounded-2xl overflow-hidden bg-black/70 border border-white/[0.08] shadow-lg group">
            {data.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbnail}
                alt={data.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                <Film className="w-10 h-10 text-zinc-600" />
                <span className="text-xs mt-1 text-zinc-400">HD Stream Ready</span>
              </div>
            )}

            {/* Duration Badge */}
            {data.duration && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 shadow-md">
                <Clock className="w-3.5 h-3.5 text-[#ff9000]" />
                <span className="font-mono">{data.duration}</span>
              </div>
            )}

            {/* Max Resolution Pill */}
            <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-md text-[#ffb84d] text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-[#ff9000]/30 flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-[#ff9000]" />
              <span>Max: {topQuality}</span>
            </div>
          </div>

          {/* Title, Metadata & Action Details */}
          <div className="md:col-span-7 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white line-clamp-2 leading-snug">
                  {data.title}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyTitle}
                  title="Copy video title"
                  aria-label="Copy video title"
                  className="shrink-0 p-2.5 rounded-xl text-zinc-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-all active:scale-95"
                >
                  {copiedTitle ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-300 font-medium">{data.author || 'Verified Creator'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified MP4 Streams</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#ff9000]" />
                <span>Tap any quality below for instant direct download:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveDirectUrl(data.formats[0]?.url || '');
                  setIsHelpModalOpen(true);
                }}
                className="text-[#ff9000] hover:text-[#ffb84d] font-semibold flex items-center gap-1 transition-colors underline underline-offset-4"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Download tips</span>
              </button>
            </div>
          </div>
        </div>

        {/* Available Resolutions List */}
        <div>
          <div className="flex items-center justify-between mb-3.5 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-[#ff9000]" />
              <span>Available MP4 Resolutions</span>
            </h3>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">100% Direct CDN</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {data.formats.map((fmt, idx) => {
              const meta = getQualityBadge(fmt.quality);
              const isCurrentlyDownloading = downloadingQuality === fmt.quality;
              const isCopied = copiedLink === fmt.quality;

              return (
                <div
                  key={fmt.quality}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${meta.border} ${meta.bg}`}
                >
                  {/* Left Specs */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-inner font-mono">
                      {fmt.quality}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm truncate">{meta.label}</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black/60 text-[#ff9000] border border-[#ff9000]/30 font-mono">
                          .MP4
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {meta.badge} • Full Length Video
                      </div>
                    </div>
                  </div>

                  {/* Actions: Direct Download + Copy Link */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyFormatLink(fmt)}
                      title="Copy direct MP4 stream URL"
                      aria-label={`Copy ${fmt.quality} link`}
                      className="p-2.5 rounded-xl bg-black/40 hover:bg-black/70 text-zinc-400 hover:text-white border border-white/[0.08] transition-all active:scale-95"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadFormat(fmt)}
                      disabled={isCurrentlyDownloading}
                      className={`min-h-[44px] min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${meta.btnBg} ${isCurrentlyDownloading ? 'opacity-90 cursor-wait' : ''}`}
                    >
                      {isCurrentlyDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
                          <span>Preparing...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
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


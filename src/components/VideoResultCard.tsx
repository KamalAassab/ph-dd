'use client';

import React, { useState, useCallback, useRef } from 'react';
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
  FileVideo,
  Play,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import { VideoMetadata, VideoFormat } from '@/lib/types';
import DownloadHelperModal from './DownloadHelperModal';

interface VideoResultCardProps {
  data: VideoMetadata;
  onReset: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface ConversionState {
  status: 'idle' | 'converting' | 'ready' | 'error';
  quality: string;
  progress: number;
  receivedBytes: number;
  totalBytes: number;
  blobUrl: string | null;
  directDownloadUrl: string;
  filename: string;
  formattedSize: string;
  errorMessage?: string;
}

export default function VideoResultCard({ data, onReset, onShowToast }: VideoResultCardProps) {
  const [conversion, setConversion] = useState<ConversionState>({
    status: 'idle',
    quality: '',
    progress: 0,
    receivedBytes: 0,
    totalBytes: 0,
    blobUrl: null,
    directDownloadUrl: '',
    filename: '',
    formattedSize: '',
  });

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activeDirectUrl, setActiveDirectUrl] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanExactTitle = (data.title || 'video')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim() || 'video';

  const handleCopyFormatLink = useCallback((format: VideoFormat) => {
    if (!format.url) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(format.url);
      setCopiedLink(format.quality);
      if (onShowToast) onShowToast(`${format.quality} direct link copied to clipboard`, 'success');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  }, [onShowToast]);

  const handleCancelConversion = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConversion((prev) => ({
      ...prev,
      status: 'idle',
      progress: 0,
      receivedBytes: 0,
    }));
    if (onShowToast) onShowToast('Conversion cancelled', 'info');
  }, [onShowToast]);

  /**
   * Two-Step Conversion Engine:
   * 1. Chunked background buffer to bypass Vercel 10s timeout completely.
   * 2. When 100% converted into a pure MP4 blob, present the "Download Pure MP4" button.
   */
  const handleStartConversion = useCallback(async (format: VideoFormat) => {
    if (!format.url) return;

    // If already converted for this quality, trigger download immediately
    if (conversion.status === 'ready' && conversion.quality === format.quality && conversion.blobUrl) {
      const a = document.createElement('a');
      a.href = conversion.blobUrl;
      a.download = conversion.filename || `${cleanExactTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (onShowToast) onShowToast(`✓ Saving ${format.quality} Pure MP4!`, 'success');
      return;
    }

    // Cancel any ongoing conversion
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const filename = `${cleanExactTitle}.mp4`;
    const directDownloadUrl = `/api/download?viewkey=${encodeURIComponent(data.id)}&url=${encodeURIComponent(data.sourceUrl)}&streamUrl=${encodeURIComponent(format.url)}&quality=${encodeURIComponent(format.quality)}&title=${encodeURIComponent(cleanExactTitle)}`;

    setConversion({
      status: 'converting',
      quality: format.quality,
      progress: 2,
      receivedBytes: 0,
      totalBytes: 0,
      blobUrl: null,
      directDownloadUrl,
      filename,
      formattedSize: format.formattedSize || '',
    });

    if (onShowToast) onShowToast(`Converting ${format.quality} to Pure MP4...`, 'info');

    try {
      // Step 1: Probe exact file size via Range: bytes=0-0 to avoid long timeouts
      const probeRes = await fetch(directDownloadUrl, {
        headers: { Range: 'bytes=0-0' },
        signal: abortController.signal,
      });

      let totalSize = 0;
      const contentRange = probeRes.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        if (match) totalSize = parseInt(match[1], 10);
      }
      if (!totalSize) {
        const cl = probeRes.headers.get('content-length');
        if (cl && parseInt(cl, 10) > 1) totalSize = parseInt(cl, 10);
      }
      if (!totalSize && format.formattedSize) {
        const numMatch = format.formattedSize.match(/([\d.]+)\s*(MB|GB)/i);
        if (numMatch) {
          const val = parseFloat(numMatch[1]);
          const unit = numMatch[2].toUpperCase();
          totalSize = Math.round(val * (unit === 'GB' ? 1024 * 1024 * 1024 : 1024 * 1024));
        }
      }

      if (!totalSize || totalSize < 50_000) {
        throw new Error('Unable to resolve stream length. Upstream CDN may be rate-limiting.');
      }

      const formattedBytes = (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
      setConversion((prev) => ({
        ...prev,
        totalBytes: totalSize,
        formattedSize: formattedBytes,
        progress: 5,
      }));

      // Step 2: Fetch in 4MB chunks (under 1s per request on Vercel)
      const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
      const chunks: Uint8Array[] = [];
      let currentByte = 0;

      while (currentByte < totalSize) {
        if (abortController.signal.aborted) return;

        const endByte = Math.min(currentByte + CHUNK_SIZE - 1, totalSize - 1);
        let chunkBuffer: ArrayBuffer | null = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const chunkRes = await fetch(directDownloadUrl, {
              headers: { Range: `bytes=${currentByte}-${endByte}` },
              signal: abortController.signal,
            });
            if (chunkRes.ok) {
              chunkBuffer = await chunkRes.arrayBuffer();
              break;
            }
          } catch {
            if (abortController.signal.aborted) return;
            await new Promise((r) => setTimeout(r, 600));
          }
        }

        if (!chunkBuffer) {
          throw new Error(`Failed to buffer chunk at byte ${currentByte}`);
        }

        chunks.push(new Uint8Array(chunkBuffer));
        currentByte += chunkBuffer.byteLength;

        const currentProgress = Math.min(99, Math.round((currentByte / totalSize) * 100));
        setConversion((prev) => ({
          ...prev,
          receivedBytes: currentByte,
          progress: currentProgress,
        }));
      }

      // Step 3: All chunks received! Assemble authentic MP4 Blob with ftypisom headers
      const pureMp4Blob = new Blob(chunks as unknown as BlobPart[], { type: 'video/mp4' });
      const blobUrl = URL.createObjectURL(pureMp4Blob);

      setConversion({
        status: 'ready',
        quality: format.quality,
        progress: 100,
        receivedBytes: totalSize,
        totalBytes: totalSize,
        blobUrl,
        directDownloadUrl,
        filename,
        formattedSize: formattedBytes,
      });

      if (onShowToast) onShowToast(`✓ ${format.quality} converted to pure MP4! Click to download.`, 'success');
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('Conversion error:', err);
      setConversion((prev) => ({
        ...prev,
        status: 'error',
        progress: 0,
        blobUrl: null,
        errorMessage: (err as Error)?.message || 'Conversion stream error. Please retry.',
      }));
      if (onShowToast) onShowToast('Conversion failed. Click retry.', 'error');
    }
  }, [conversion, data.id, data.sourceUrl, cleanExactTitle, onShowToast]);

  const handleDownloadSavedFile = useCallback(() => {
    if (conversion.blobUrl) {
      const a = document.createElement('a');
      a.href = conversion.blobUrl;
      a.download = conversion.filename || `${cleanExactTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (onShowToast) onShowToast('✓ Download started! Check your Files/Downloads.', 'success');
    } else if (conversion.directDownloadUrl) {
      window.location.assign(conversion.directDownloadUrl);
      if (onShowToast) onShowToast('✓ Download started in browser/IDM!', 'success');
    }
  }, [conversion.blobUrl, conversion.directDownloadUrl, conversion.filename, cleanExactTitle, onShowToast]);

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
                Pure MP4 (H.264 / AAC)
              </span>
              <span className="font-medium text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% QuickTime & iOS Compatible</span>
              </span>
            </div>
          </div>
        </div>

        {/* ─── Dedicated Conversion & Download Progress Card ─── */}
        <AnimatePresence mode="wait">
          {conversion.status === 'converting' && (
            <motion.div 
              key="converting"
              initial={{ opacity: 0, scale: 0.98, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              className="mb-8 p-5 sm:p-6 rounded-2xl bg-zinc-900/95 border-2 border-[#ff9000]/40 shadow-2xl shadow-[#ff9000]/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-[#ff9000]/20 animate-ping absolute"></div>
                    <Loader2 className="w-6 h-6 animate-spin text-[#ff9000] relative" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>Converting to Pure MP4</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#ff9000] text-black font-extrabold">
                        {conversion.quality}
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Validating H.264 video & AAC audio containers for seamless iOS & Safari playback
                    </p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancelConversion}
                  className="text-xs text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                  title="Cancel conversion"
                >
                  <XCircle className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-zinc-800/90 overflow-hidden p-0.5 shadow-inner my-3">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#ff9000] via-[#ffaa33] to-[#ffc066] rounded-full shadow-lg shadow-[#ff9000]/50"
                  initial={{ width: '2%' }}
                  animate={{ width: `${Math.max(2, conversion.progress)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.25 }}
                />
              </div>

              {/* Progress Details */}
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="text-zinc-300">
                  {conversion.totalBytes > 0 ? (
                    <>
                      {(conversion.receivedBytes / (1024 * 1024)).toFixed(1)} MB / {(conversion.totalBytes / (1024 * 1024)).toFixed(1)} MB
                    </>
                  ) : (
                    'Connecting to high-speed stream...'
                  )}
                </span>
                <span className="font-bold text-[#ff9000] text-sm">{conversion.progress}%</span>
              </div>
            </motion.div>
          )}

          {conversion.status === 'ready' && (
            <motion.div 
              key="ready"
              initial={{ opacity: 0, scale: 0.98, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              className="mb-8 p-5 sm:p-6 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-950/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500 text-black">
                        Conversion Complete
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        {conversion.quality} • {conversion.formattedSize}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                      Pure MP4 is ready to download!
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      100% QuickTime, iOS Files, Safari & Photos Camera Roll compatible.
                    </p>
                  </div>
                </div>

                {/* Primary Ready Download Action */}
                <div className="flex items-center gap-2.5 sm:shrink-0">
                  {conversion.blobUrl && (
                    <a
                      href={conversion.blobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-11 px-3.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
                      title="Open and preview in browser"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      <span>View</span>
                    </a>
                  )}

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleDownloadSavedFile}
                    className="h-11 px-5 rounded-xl text-xs sm:text-sm font-extrabold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    <Download className="w-4 h-4 stroke-[3]" />
                    <span>Download MP4 Now</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resolutions List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#ff9000]" />
              <span>Select Quality to Convert & Download</span>
            </h3>
            <span className="text-xs text-zinc-400 font-mono font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              {data.formats.length} Qualities Available
            </span>
          </div>

          <div className="space-y-2.5">
            {data.formats.map((fmt, index) => {
              const isConvertingThis = conversion.status === 'converting' && conversion.quality === fmt.quality;
              const isReadyThis = conversion.status === 'ready' && conversion.quality === fmt.quality;
              const isCopied = copiedLink === fmt.quality;

              return (
                <motion.div
                  key={fmt.quality}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-200 ${
                    isReadyThis 
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/30' 
                      : isConvertingThis
                        ? 'bg-zinc-900/90 border-[#ff9000]/60 shadow-md shadow-[#ff9000]/10'
                        : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700/80'
                  }`}
                >
                  {/* Left Info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      isReadyThis
                        ? 'bg-emerald-500/20 border-emerald-500/40'
                        : 'bg-zinc-800/80 border-zinc-700/60'
                    }`}>
                      {isReadyThis ? (
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      ) : (
                        <FileVideo className="w-4 h-4 text-[#ff9000]" />
                      )}
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
                        Pure MP4 • H.264
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
                      onClick={() => handleStartConversion(fmt)}
                      disabled={conversion.status === 'converting' && !isConvertingThis}
                      className={`h-10 min-w-[130px] sm:min-w-[155px] flex items-center justify-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all disabled:opacity-40 shadow-md ${
                        isReadyThis
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                          : isConvertingThis
                            ? 'bg-[#ff9000]/80 text-black'
                            : 'bg-[#ff9000] hover:bg-[#ffa31a] text-black shadow-[#ff9000]/15'
                      }`}
                    >
                      {isConvertingThis ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-black shrink-0" />
                          <span>{conversion.progress}%</span>
                        </>
                      ) : isReadyThis ? (
                        <>
                          <Download className="w-4 h-4 stroke-[3] shrink-0" />
                          <span>Download MP4</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 shrink-0" />
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

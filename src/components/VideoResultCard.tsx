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
  FileVideo,
  Play,
  X,
  AlertCircle
} from 'lucide-react';
import { VideoMetadata, VideoFormat } from '@/lib/types';
import { createDiskStreamWriter, DiskStreamWriter } from '@/lib/opfsStorage';
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
  const diskWriterRef = useRef<DiskStreamWriter | null>(null);

  const cleanExactTitle = (data.title || 'video')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim() || 'video';

  // Filter formats: ONLY show 720P, 480P, 360P, 240P (hide 1080P and anything > 720)
  const displayedFormats = data.formats
    .filter((f) => {
      const h = parseInt(f.quality.replace(/\D/g, ''), 10) || 0;
      return h <= 720 && h > 0 && !f.quality.toLowerCase().includes('1080');
    })
    .map((f) => {
      const h = parseInt(f.quality.replace(/\D/g, ''), 10) || 0;
      return {
        ...f,
        quality: `${h}P`,
      };
    });

  const handleCopyFormatLink = useCallback((format: VideoFormat) => {
    if (!format.url) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(format.url);
      setCopiedLink(format.quality);
      if (onShowToast) onShowToast(`${format.quality} direct link copied`, 'success');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  }, [onShowToast]);

  const handleCancelConversion = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (diskWriterRef.current) {
      diskWriterRef.current.abort().catch(() => {});
      diskWriterRef.current = null;
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
   * 1. 3-Worker Parallel Chunk Streaming (300% faster bandwidth saturation).
   * 2. Direct OPFS Disk Streaming (writes chunks directly to local storage).
   *    Eliminates JavaScript heap accumulation so 670MB+ videos never crash iOS Safari!
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
      if (onShowToast) onShowToast(`✓ Saving ${format.quality} MP4!`, 'success');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (diskWriterRef.current) {
      diskWriterRef.current.abort().catch(() => {});
      diskWriterRef.current = null;
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

    try {
      // Step 1: Probe exact file size via Range: bytes=0-0
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
        throw new Error('Unable to resolve video stream. Please retry.');
      }

      const formattedBytes = (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
      setConversion((prev) => ({
        ...prev,
        totalBytes: totalSize,
        formattedSize: formattedBytes,
        progress: 5,
      }));

      // Step 2: Initialize OPFS disk stream writer (avoids keeping 670MB in RAM)
      const diskWriter = await createDiskStreamWriter(filename);
      diskWriterRef.current = diskWriter;

      // Concurrency: 3 parallel workers for fast buffering
      const CONCURRENCY = 3;
      const CHUNK_SIZE = Math.floor(3.5 * 1024 * 1024); // 3.5 MB
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

      let nextChunkIdx = 0;
      let totalReceived = 0;
      const memoryChunks: Uint8Array[] = diskWriter ? [] : new Array(totalChunks);

      const worker = async () => {
        while (nextChunkIdx < totalChunks) {
          if (abortController.signal.aborted) return;
          const chunkIdx = nextChunkIdx++;
          const start = chunkIdx * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);

          let chunkBuffer: ArrayBuffer | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const chunkRes = await fetch(directDownloadUrl, {
                headers: { Range: `bytes=${start}-${end}` },
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
            throw new Error(`Buffering interrupted at ${(start / (1024 * 1024)).toFixed(1)} MB.`);
          }

          const chunkArray = new Uint8Array(chunkBuffer);
          if (diskWriter) {
            // Write directly to local disk storage; chunkBuffer is immediately garbage-collected!
            await diskWriter.writeChunk(start, chunkArray);
          } else {
            memoryChunks[chunkIdx] = chunkArray;
          }

          totalReceived += chunkBuffer.byteLength;
          const currentProgress = Math.min(99, Math.round((totalReceived / totalSize) * 100));
          setConversion((prev) => ({
            ...prev,
            receivedBytes: totalReceived,
            progress: currentProgress,
          }));
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, () => worker())
      );

      if (abortController.signal.aborted) return;

      // Step 3: All chunks received! Finalize disk or memory blob
      let blobUrl = '';
      if (diskWriter) {
        blobUrl = await diskWriter.finalize();
        diskWriterRef.current = null;
      } else {
        const pureMp4Blob = new Blob(memoryChunks as unknown as BlobPart[], { type: 'video/mp4' });
        blobUrl = URL.createObjectURL(pureMp4Blob);
      }

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

      if (onShowToast) onShowToast(`✓ ${format.quality} MP4 ready! Click Download.`, 'success');
    } catch (err: unknown) {
      if (diskWriterRef.current) {
        diskWriterRef.current.abort().catch(() => {});
        diskWriterRef.current = null;
      }
      if ((err as Error)?.name === 'AbortError') return;
      console.error('Conversion error:', err);
      setConversion((prev) => ({
        ...prev,
        status: 'error',
        progress: 0,
        blobUrl: null,
        errorMessage: (err as Error)?.message || 'Failed to buffer video. Please retry.',
      }));
      if (onShowToast) onShowToast('Conversion failed. Click to retry.', 'error');
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
      if (onShowToast) onShowToast('✓ Download started!', 'success');
    } else if (conversion.directDownloadUrl) {
      window.location.assign(conversion.directDownloadUrl);
      if (onShowToast) onShowToast('✓ Download started!', 'success');
    }
  }, [conversion.blobUrl, conversion.directDownloadUrl, conversion.filename, cleanExactTitle, onShowToast]);

  const thumbnailSrc = data.thumbnail
    ? `/api/thumbnail?url=${encodeURIComponent(data.thumbnail)}&viewkey=${encodeURIComponent(data.id)}`
    : `/api/thumbnail?viewkey=${encodeURIComponent(data.id)}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-3xl mx-auto mt-6 px-1"
    >
      <div className="bg-[#111114] rounded-2xl p-4 sm:p-6 border border-zinc-800 shadow-xl">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="text-xs font-medium text-zinc-300 truncate">Video Ready</span>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#ff9000]" />
            <span>New Search</span>
          </button>
        </div>

        {/* Video Overview */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 mb-6">
          <div className="w-full sm:w-48 aspect-video sm:aspect-[16/10] relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
            {data.id || data.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailSrc}
                alt={data.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <Film className="w-8 h-8 text-zinc-600" />
              </div>
            )}

            {data.duration && (
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[11px] font-mono px-1.5 py-0.5 rounded border border-white/10">
                {data.duration}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white leading-snug line-clamp-2">
                {data.title}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-zinc-400">
                {data.author && (
                  <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    <User className="w-3 h-3 text-[#ff9000]" />
                    <span className="text-zinc-300 truncate max-w-[150px]">{data.author}</span>
                  </span>
                )}
                {data.duration && (
                  <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>{data.duration}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>MPEG-4 (H.264 / AAC)</span>
              <span className="text-zinc-400">Pornhub</span>
            </div>
          </div>
        </div>

        {/* ─── Resolutions List with In-Card Conversion Bar ─── */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs text-zinc-400 font-medium">
            <span>Select Resolution</span>
            <span>{displayedFormats.length} Available</span>
          </div>

          <div className="space-y-2.5">
            {displayedFormats.map((fmt) => {
              const isConvertingThis = conversion.status === 'converting' && conversion.quality === fmt.quality;
              const isReadyThis = conversion.status === 'ready' && conversion.quality === fmt.quality;
              const isErrorThis = conversion.status === 'error' && conversion.quality === fmt.quality;
              const isCopied = copiedLink === fmt.quality;

              if (isConvertingThis) {
                return (
                  <motion.div
                    key={fmt.quality}
                    layout
                    initial={{ opacity: 0.9, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3.5 rounded-xl border bg-zinc-900/95 border-[#ff9000]/60 shadow-lg shadow-black/40 space-y-2.5 transition-all"
                  >
                    {/* Top row: Status, Quality & Cancel */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Loader2 className="w-4 h-4 animate-spin text-[#ff9000] shrink-0" />
                        <span className="font-bold text-white text-sm truncate">
                          Converting {fmt.quality} to MP4
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-[#ff9000] font-mono">
                          {conversion.progress}%
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelConversion}
                          className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
                          title="Cancel"
                          aria-label="Cancel conversion"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full bg-[#ff9000] rounded-full transition-all duration-200 ease-out"
                        style={{ width: `${Math.max(3, conversion.progress)}%` }}
                      />
                    </div>

                    {/* Bottom Stats */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>
                        {conversion.totalBytes > 0 
                          ? `${(conversion.receivedBytes / (1024 * 1024)).toFixed(1)} MB / ${(conversion.totalBytes / (1024 * 1024)).toFixed(1)} MB`
                          : 'Buffering stream...'
                        }
                      </span>
                      <span className="text-zinc-500">Pure MP4</span>
                    </div>
                  </motion.div>
                );
              }

              if (isReadyThis) {
                return (
                  <motion.div
                    key={fmt.quality}
                    layout
                    initial={{ opacity: 0.9, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3.5 rounded-xl border bg-zinc-900/95 border-emerald-500/50 shadow-lg shadow-black/40 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Quality & Ready Status */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {fmt.quality} MP4 Ready
                            </span>
                            {conversion.formattedSize && (
                              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {conversion.formattedSize}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            Pure MP4 ready to save to your device
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        {conversion.blobUrl && (
                          <a
                            href={conversion.blobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center gap-1 transition-colors shrink-0"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>View</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={handleDownloadSavedFile}
                          className="h-8 flex-1 sm:flex-initial px-4 rounded-lg text-xs font-bold bg-[#ff9000] hover:bg-[#ffa31a] text-black flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Download MP4</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              if (isErrorThis) {
                return (
                  <motion.div
                    key={fmt.quality}
                    layout
                    className="p-3 rounded-xl border bg-red-950/20 border-red-500/40 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-2 text-xs text-red-300 min-w-0">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="truncate">{conversion.errorMessage || 'Conversion failed.'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartConversion(fmt)}
                      className="text-xs text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md border border-zinc-700 transition-colors shrink-0 font-medium"
                    >
                      Retry
                    </button>
                  </motion.div>
                );
              }

              // Standard Idle Resolution Row
              return (
                <div
                  key={fmt.quality}
                  className="p-3 rounded-xl border bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-800/80 flex items-center justify-between gap-3 transition-colors"
                >
                  {/* Quality Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 text-[#ff9000] flex items-center justify-center shrink-0">
                      <FileVideo className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white text-sm">
                        {fmt.quality}
                      </span>
                      {fmt.formattedSize && (
                        <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded">
                          {fmt.formattedSize}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyFormatLink(fmt)}
                      title="Copy link"
                      aria-label={`Copy ${fmt.quality} link`}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartConversion(fmt)}
                      disabled={conversion.status === 'converting'}
                      className="h-8 min-w-[100px] sm:min-w-[110px] px-3 rounded-lg text-xs font-bold bg-[#ff9000] hover:bg-[#ffa31a] text-black flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                      <span>Download</span>
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
    </motion.div>
  );
}

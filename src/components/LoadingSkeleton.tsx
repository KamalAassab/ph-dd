'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Sparkles, Shield, Server, FileVideo, Zap } from 'lucide-react';

const STEPS = [
  { text: 'Validating URL & SSRF security firewall...', icon: Shield },
  { text: 'Resolving player configuration & stream tokens...', icon: Server },
  { text: 'Extracting 1080p, 720p, 480p MP4 media streams...', icon: FileVideo },
  { text: 'Generating direct browser download endpoints...', icon: Zap },
];

export default function LoadingSkeleton() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in duration-300">
      <div className="glass-panel rounded-3xl p-4 sm:p-7 md:p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden">
        
        {/* Shimmer Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />

        {/* Top Header Placeholder */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/[0.08] mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-[#ff9000] animate-spin shrink-0" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#ffb84d]">
              Extracting Video Streams...
            </span>
          </div>
          <div className="h-6 w-20 bg-white/[0.05] rounded-xl animate-pulse" />
        </div>

        {/* Skeleton Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 mb-7 sm:mb-8">
          {/* Thumbnail Skeleton */}
          <div className="md:col-span-5 aspect-video rounded-2xl bg-zinc-900/80 border border-white/[0.06] animate-pulse relative overflow-hidden flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#ff9000] animate-spin opacity-70" />
            <span className="text-xs text-zinc-500 mt-2 font-mono font-medium">Resolving HD Media</span>
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-[10px] text-zinc-500 font-mono">
              --:--
            </div>
          </div>

          {/* Details Skeleton */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-5 sm:h-6 bg-zinc-800/80 rounded-xl w-4/5 animate-pulse" />
              <div className="h-4 bg-zinc-800/50 rounded-lg w-1/2 animate-pulse" />
              <div className="flex gap-2 pt-1">
                <div className="h-6 w-24 bg-white/[0.04] rounded-lg animate-pulse" />
                <div className="h-6 w-32 bg-white/[0.04] rounded-lg animate-pulse" />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <div className="h-3 bg-zinc-800/60 rounded w-2/3 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Dynamic Progress Steps Tracker */}
        <div className="pt-5 border-t border-white/[0.08]">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#ff9000]" />
            <span>Extraction Pipeline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {STEPS.map((step, idx) => {
              const isDone = idx < activeStep;
              const isCurrent = idx === activeStep;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 text-xs px-3.5 py-2.5 rounded-xl transition-all duration-300 ${
                    isCurrent
                      ? 'bg-[#ff9000]/10 border border-[#ff9000]/30 text-white font-medium shadow-sm shadow-[#ff9000]/10'
                      : isDone
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : 'bg-white/[0.03] border border-white/[0.04] text-zinc-500'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-[#ff9000] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-700 flex items-center justify-center text-[9px] text-zinc-500 shrink-0 font-mono">
                      {idx + 1}
                    </div>
                  )}
                  <span className="truncate">{step.text}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}


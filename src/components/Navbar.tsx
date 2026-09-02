'use client';

import React from 'react';
import { Download, Zap, Shield, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenGuide?: () => void;
}

export default function Navbar({ onOpenGuide }: NavbarProps) {
  return (
    <header className="w-full border-b border-white/[0.08] bg-[#09090b]/85 backdrop-blur-2xl sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#ff9000] via-[#ffa31a] to-[#ffb84d] flex items-center justify-center shadow-lg shadow-[#ff9000]/25 transition-transform hover:scale-105 active:scale-95">
            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-black text-lg sm:text-xl tracking-tight leading-none">
              <span className="text-white">STREAM</span>
              <span className="bg-[#ff9000] text-black px-1.5 py-0.5 rounded font-black text-xs sm:text-sm tracking-wide">
                EXTRACT
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold font-mono">
              Serverless 720p HD Engine
            </span>
          </div>
        </div>

        {/* Status Badges & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 sm:px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="hidden xs:inline">Zero-DB Edge</span>
            <span className="xs:hidden">Live</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5 text-[#ff9000]" />
            <span>Direct CDN</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>SSRF Protected</span>
          </div>

          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] px-2.5 sm:px-3 py-1.5 rounded-xl transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff9000]" />
              <span>Guide</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}


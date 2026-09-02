'use client';

import React from 'react';
import { Download, HelpCircle } from 'lucide-react';

interface NavbarProps {
  onOpenGuide?: () => void;
}

export default function Navbar({ onOpenGuide }: NavbarProps) {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-[#09090b] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ff9000] flex items-center justify-center">
            <Download className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1 font-bold text-sm tracking-tight">
            <span className="text-white">STREAM</span>
            <span className="bg-[#ff9000] text-black px-1 rounded text-xs font-bold">
              EXTRACT
            </span>
          </div>
        </div>

        {/* Quick Action */}
        <div className="flex items-center gap-3">
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How to use</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

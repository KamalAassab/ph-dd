'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Sparkles, ShieldCheck } from 'lucide-react';
import SikoSikoLogo from './SikoSikoLogo';

interface NavbarProps {
  onOpenGuide?: () => void;
}

export default function Navbar({ onOpenGuide }: NavbarProps) {
  return (
    <header className="w-full border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-40 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo: SikoSiko Hub */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="cursor-pointer"
          onClick={() => window.location.assign('/')}
        >
          <SikoSikoLogo size="md" />
        </motion.div>

        {/* Right Nav Status & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Fast Engine v2.0</span>
          </div>

          {onOpenGuide && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 transition-all shadow-sm"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#ff9000]" />
              <span>How to use</span>
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}

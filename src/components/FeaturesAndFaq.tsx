'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  ChevronDown, 
  HardDrive, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';
import PornSaverLogo from './PornSaverLogo';

const FEATURES = [
  {
    icon: Zap,
    title: 'High-Speed Parallel Engine',
    desc: 'Powered by multi-threaded fragment streams (-N 16) delivering full HD videos in seconds.',
  },
  {
    icon: Layers,
    title: 'Authentic HD & Converted Tiers',
    desc: 'Choose from 1080p Full HD, 720p Original, 480p SD, 420p Standard, and 360p Mobile.',
  },
  {
    icon: HardDrive,
    title: 'Real File Size & Progress',
    desc: 'Serves exact Content-Length headers for live 0% to 100% progress in browsers and IDM.',
  },
  {
    icon: ShieldCheck,
    title: 'Stateless & 100% Private',
    desc: 'No logs, no tracking cookies, and zero media data saved on servers.',
  },
];

const FAQS = [
  {
    q: 'How does the high-speed download process work?',
    a: 'When you submit a video URL, SikoSiko Hub resolves the authentic multi-bitrate streams and streams the stitched full-length MP4 directly to your device with exact Content-Length and Accept-Ranges byte headers.',
  },
  {
    q: 'Why do IDM and browsers show the exact progress bar and file size?',
    a: 'We provide full multi-part HTTP range streaming (HTTP 206 Partial Content), enabling download managers like IDM to use 8-16 parallel connection chunks with live accurate progress and pause/resume support.',
  },
  {
    q: 'What video resolutions can I download?',
    a: 'We support all authentic resolutions up to 1080p Full HD and 720p HD, as well as optimized 480p, 420p, and 360p options.',
  },
  {
    q: 'Are downloaded videos saved with their real title?',
    a: 'Yes. All downloads are automatically packaged with the exact sanitized video title followed by .mp4.',
  },
  {
    q: 'Is my download activity logged or tracked?',
    a: 'No. The entire system is strictly stateless. No history, user records, or downloaded files are saved.',
  },
];

export default function FeaturesAndFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto mt-16 sm:mt-24 space-y-16">
      
      {/* Feature Cards Grid (Bento Style) */}
      <section aria-labelledby="features-heading">
        <div className="text-center mb-8">
          <h2 id="features-heading" className="text-xs font-bold text-[#ff9000] uppercase tracking-widest mb-2">
            Engine Capabilities
          </h2>
          <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Engineered for Maximum Speed & Clarity
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div 
                key={idx}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="p-5 sm:p-6 rounded-2xl bg-[#121216]/90 border border-zinc-800/80 hover:border-zinc-700/80 shadow-lg shadow-black/40 backdrop-blur-md"
              >
                <div className="flex items-center gap-3.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#ff9000]/10 border border-[#ff9000]/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#ff9000]" />
                  </div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    {feat.title}
                  </h3>
                </div>
                
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pl-[46px]">
                  {feat.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section aria-labelledby="faq-heading" className="pt-8 border-t border-zinc-800/60">
        <div className="text-center mb-8">
          <h2 id="faq-heading" className="text-xs font-bold text-[#ff9000] uppercase tracking-widest mb-2">
            Knowledge Base
          </h2>
          <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-2xl bg-[#121216]/90 border border-zinc-800/80 overflow-hidden shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#ff9000]' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/50 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer with PornSaverLogo */}
      <footer className="pt-12 pb-8 border-t border-zinc-800/60 flex flex-col items-center justify-center gap-3 text-center">
        <PornSaverLogo size="sm" />
        <p className="text-xs text-zinc-500">
          PornSaver • Ultra-Fast HD Video Downloader
        </p>
        <p className="text-[11px] text-zinc-600">
          Stateless, secure, and multi-threaded video streaming engine.
        </p>
      </footer>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { 
  Database, 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  Sparkles
} from 'lucide-react';

const FEATURES = [
  {
    icon: Database,
    title: 'Zero-Database Architecture',
    desc: 'Completely stateless. No logs or media records are stored on servers.',
  },
  {
    icon: Zap,
    title: 'Direct CDN Streaming',
    desc: 'Downloads video data directly from the host CDN straight to your device.',
  },
  {
    icon: Sparkles,
    title: 'Max 720p HD Quality',
    desc: 'Full-length video stream extraction in 720p HD, 480p, and 240p formats.',
  },
  {
    icon: ShieldCheck,
    title: 'Security Firewall',
    desc: 'Built-in security sanitizes URL inputs and blocks unauthorized requests.',
  },
];

const FAQS = [
  {
    q: 'How does the download process work?',
    a: 'When you submit a video URL, the server resolves the authentic stream playlist and streams the full stitched video directly to your browser or download manager with exact Content-Length headers.',
  },
  {
    q: 'Why does IDM show the exact file size and progress bar?',
    a: 'We serve all MP4 files with accurate Content-Length and Accept-Ranges byte headers, giving download managers full progress percentage and pause/resume support.',
  },
  {
    q: 'What video resolutions are supported?',
    a: 'We support all standard resolutions provided by the source up to 720p HD, including 480p SD and 240p Mobile formats.',
  },
  {
    q: 'Are any personal details or download history saved?',
    a: 'No. The entire system is 100% stateless and stores zero cookies, session logs, or database records.',
  },
];

export default function FeaturesAndFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="w-full max-w-4xl mx-auto mt-14 sm:mt-18 space-y-12">
      
      {/* Feature Cards Grid */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center mb-6">
          Core Features
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className="p-4 sm:p-5 rounded-xl bg-[#111114] border border-zinc-800/80"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-4 h-4 text-[#ff9000] shrink-0" />
                  <h3 className="font-medium text-white text-sm">
                    {feat.title}
                  </h3>
                </div>
                
                <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section aria-labelledby="faq-heading" className="pt-6 border-t border-zinc-800/60">
        <h2 id="faq-heading" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center mb-6">
          Frequently Asked Questions
        </h2>

        <div className="space-y-2 max-w-3xl mx-auto">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl bg-[#111114] border border-zinc-800/80 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#ff9000]' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-6 text-center text-xs text-zinc-600">
        <p>StreamExtract • Stateless Video Stream Extractor</p>
      </footer>
    </div>
  );
}

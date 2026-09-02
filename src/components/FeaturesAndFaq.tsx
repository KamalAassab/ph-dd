'use client';

import React, { useState } from 'react';
import { 
  Database, 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  Sparkles,
  Lock,
  DownloadCloud,
  CheckCircle2,
  Server
} from 'lucide-react';

const FEATURES = [
  {
    icon: Database,
    title: 'Zero-Database Architecture',
    desc: 'Completely stateless. No user logs, media records, or personal data are stored in databases or server disks.',
    badge: '100% Privacy',
    badgeColor: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: Zap,
    title: 'Bypasses Vercel Payload Caps',
    desc: 'Browser-direct streaming downloads video data directly from the host CDN straight to your device with maximum bandwidth.',
    badge: 'Ultra Fast',
    badgeColor: 'text-[#ffb84d] bg-[#ff9000]/10 border-[#ff9000]/20',
  },
  {
    icon: Sparkles,
    title: 'Up to 1080p Full HD',
    desc: 'Extracts every available video resolution including 1080p Full HD, 720p HD, 480p SD, and mobile 360p/240p streams.',
    badge: '1080p HD',
    badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  },
  {
    icon: ShieldCheck,
    title: 'Strict SSRF & Security Firewall',
    desc: 'Built-in security sanitizes all URL inputs, blocking internal network probes, loopback IPs, and malicious payloads.',
    badge: 'Secure',
    badgeColor: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  },
];

const FAQS = [
  {
    q: 'How does the zero-database architecture work?',
    a: 'When you submit a video URL, our serverless function executes in memory for just a few milliseconds to extract metadata and direct CDN stream URLs. Once the JSON response is sent to your browser, all data resides purely in your client React state. No database or disk storage is touched.',
  },
  {
    q: 'Why do downloads happen directly in the browser?',
    a: 'Vercel serverless functions have a 4.5MB response payload cap and short execution timeouts. By delivering the direct media URL directly to your browser, your device downloads the video straight from the media CDN without any intermediary bottlenecks.',
  },
  {
    q: 'What video resolutions are supported?',
    a: 'We extract all video resolutions provided by the source video, including 1080p (Full HD), 720p (HD), 480p (Standard), 360p (Low), and 240p.',
  },
  {
    q: 'What should I do if the video plays in a new tab instead of saving?',
    a: 'Depending on your browser settings, clicking direct media URLs might open the native video player. Simply right-click anywhere on the video and select "Save Video As..." (or press Ctrl+S / ⌘+S). On mobile Safari/Chrome, tap the Share icon > "Save to Files".',
  },
  {
    q: 'Are any native binaries like ffmpeg required?',
    a: 'No. The entire extraction layer is built with pure Node.js and TypeScript, making it 100% compliant with serverless edge environments like Vercel, Netlify, and Cloudflare Pages.',
  },
];

export default function FeaturesAndFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="w-full max-w-5xl mx-auto mt-14 sm:mt-20 space-y-14 sm:space-y-20">
      
      {/* Feature Cards Grid */}
      <section aria-labelledby="features-heading">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-zinc-400 mb-3">
            <Server className="w-3.5 h-3.5 text-[#ff9000]" />
            <span>Architecture & Performance</span>
          </div>
          <h2 id="features-heading" className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Engineered for <span className="shimmer-text">Speed & Serverless</span>
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            A state-of-the-art video extraction platform designed specifically for zero-infrastructure deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="glass-panel glass-panel-interactive rounded-3xl p-5 sm:p-6 border border-white/[0.08] relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#ff9000]/10 border border-[#ff9000]/20 flex items-center justify-center text-[#ff9000] group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${feat.badgeColor}`}>
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/[0.08]">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#ff9000]">Simple 3-Step Process</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff9000]/20 to-[#ffa31a]/10 border border-[#ff9000]/30 flex items-center justify-center font-black text-lg text-[#ff9000] shadow-inner font-mono">
              1
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Paste Target URL</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Copy any supported video link and paste it into the search input.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ffa31a]/20 to-[#ffb84d]/10 border border-[#ffa31a]/30 flex items-center justify-center font-black text-lg text-[#ffa31a] shadow-inner font-mono">
              2
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Instant Serverless Parse</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Lightweight API resolves video metadata and stream tokens in under 2 seconds.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-lg text-emerald-400 shadow-inner font-mono">
              3
            </div>
            <h3 className="font-bold text-white text-sm sm:text-base">Direct CDN Download</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Select your preferred resolution (up to 1080p) and download straight to your device.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section aria-labelledby="faq-heading">
        <div className="text-center mb-6 sm:mb-8">
          <h2 id="faq-heading" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Everything you need to know about the serverless downloader
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-white hover:text-[#ff9000] transition-colors focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#ff9000]' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 pb-16 border-t border-white/[0.08] text-center text-xs text-zinc-500 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-zinc-400 font-medium">
          <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-emerald-400" /> Zero Logs</span>
          <span>•</span>
          <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-400" /> Zero Database</span>
          <span>•</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#ff9000]" /> 100% Client-Side Direct</span>
        </div>
        <p className="text-zinc-500 text-[11px]">
          Designed with pure TypeScript for Vercel Serverless deployments.
        </p>
      </footer>
    </div>
  );
}


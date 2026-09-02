'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap } from 'lucide-react';

export default function LoadingSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-4xl mx-auto mt-8"
    >
      <div className="bg-[#121216]/95 backdrop-blur-xl rounded-3xl p-5 sm:p-8 border border-zinc-800/80 shadow-2xl shadow-black/80">
        
        {/* Top Header Placeholder */}
        <div className="flex items-center justify-between pb-5 border-b border-zinc-800/60 mb-6">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-[#ff9000] animate-spin shrink-0" />
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Resolving High-Speed Video Streams...
            </span>
          </div>
          <div className="h-4 w-20 bg-zinc-800/60 rounded-md animate-pulse" />
        </div>

        {/* Video Body Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 mb-8 items-start">
          {/* Thumbnail Skeleton */}
          <div className="md:col-span-5 aspect-video rounded-2xl bg-zinc-900/80 border border-zinc-800 animate-pulse flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
          </div>

          {/* Details Skeleton */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-6 bg-zinc-800/80 rounded-lg w-11/12 animate-pulse" />
              <div className="h-4 bg-zinc-800/50 rounded-lg w-2/3 animate-pulse" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-24 bg-zinc-800/60 rounded-md animate-pulse" />
                <div className="h-6 w-16 bg-zinc-800/60 rounded-md animate-pulse" />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/60 flex justify-between">
              <div className="h-4 bg-zinc-800/40 rounded w-1/4 animate-pulse" />
              <div className="h-4 bg-zinc-800/40 rounded w-1/4 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Resolutions Skeleton */}
        <div className="space-y-2.5">
          <div className="h-4 w-40 bg-zinc-800/60 rounded animate-pulse mb-3" />
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-800/60 animate-pulse" />
                <div className="h-5 w-28 bg-zinc-800/60 rounded-md animate-pulse" />
              </div>
              <div className="h-9 w-28 bg-zinc-800/80 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}

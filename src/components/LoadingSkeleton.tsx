'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <div className="bg-[#111114] rounded-2xl p-5 sm:p-7 border border-zinc-800/80">
        
        {/* Top Header Placeholder */}
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/60 mb-6">
          <Loader2 className="w-4 h-4 text-[#ff9000] animate-spin shrink-0" />
          <span className="text-xs font-medium text-zinc-300">
            Extracting video streams...
          </span>
        </div>

        {/* Skeleton Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Thumbnail Skeleton */}
          <div className="md:col-span-5 aspect-video rounded-xl bg-zinc-900 animate-pulse flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-zinc-700 animate-spin" />
          </div>

          {/* Details Skeleton */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="h-5 bg-zinc-800/60 rounded w-4/5 animate-pulse" />
              <div className="h-4 bg-zinc-800/40 rounded w-1/2 animate-pulse" />
            </div>

            <div className="pt-4 border-t border-zinc-800/60">
              <div className="h-3 bg-zinc-800/40 rounded w-1/3 animate-pulse" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

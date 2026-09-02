'use client';

import React from 'react';

interface PornSaverLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PornSaverLogo({ className = '', size = 'md' }: PornSaverLogoProps) {
  const textSizeClass = 
    size === 'sm' 
      ? 'text-lg' 
      : size === 'lg' 
      ? 'text-3xl' 
      : 'text-2xl';

  const badgePaddingClass = 
    size === 'sm' 
      ? 'px-1.5 py-0.5 text-xs rounded-md' 
      : size === 'lg' 
      ? 'px-3 py-1 text-xl rounded-xl' 
      : 'px-2 py-0.5 text-sm sm:text-base rounded-lg';

  return (
    <div className={`flex items-center gap-1.5 font-black uppercase select-none tracking-tight ${textSizeClass} ${className}`}>
      {/* "PORN": uppercase, pure white text, no border, no background */}
      <span className="text-white font-black uppercase tracking-tight">
        PORN
      </span>

      {/* "SAVER": uppercase, black text inside orange card */}
      <span className={`bg-[#ff9000] text-black font-black uppercase tracking-tight flex items-center justify-center shadow-md shadow-[#ff9000]/20 ${badgePaddingClass}`}>
        SAVER
      </span>
    </div>
  );
}

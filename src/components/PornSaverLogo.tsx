'use client';

import React from 'react';

interface PornSaverLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PornSaverLogo({ className = '', size = 'md' }: PornSaverLogoProps) {
  const textSizeClass = 
    size === 'sm' 
      ? 'text-lg tracking-tight' 
      : size === 'lg' 
      ? 'text-3xl tracking-tight' 
      : 'text-2xl tracking-tight';

  const badgePaddingClass = 
    size === 'sm' 
      ? 'px-1.5 py-0.5 text-xs rounded-md' 
      : size === 'lg' 
      ? 'px-3 py-1 text-xl rounded-xl' 
      : 'px-2 py-0.5 text-sm sm:text-base rounded-lg';

  return (
    <div className={`flex items-center gap-1 font-black select-none ${textSizeClass} ${className}`}>
      {/* "Porn": white text, no border, no background */}
      <span className="text-white font-black tracking-tight">
        Porn
      </span>

      {/* "Saver": black text inside orange card */}
      <span className={`bg-[#ff9000] text-black font-black uppercase tracking-wide flex items-center justify-center shadow-md shadow-[#ff9000]/20 ${badgePaddingClass}`}>
        Saver
      </span>
    </div>
  );
}

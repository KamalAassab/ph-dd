'use client';

import React from 'react';
import Image from 'next/image';

interface SikoSikoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function SikoSikoLogo({ className = '', size = 'md' }: SikoSikoLogoProps) {
  const heightClass = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-14' : 'h-10';

  return (
    <div className={`relative flex items-center select-none ${className}`}>
      {/* High-res Image rendered with mix-blend-mode: screen to eliminate black background completely */}
      <div className={`relative ${heightClass} aspect-[240/75] overflow-hidden flex items-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/myimage.jpg"
          alt="SikoSiko Hub"
          className="w-full h-full object-contain mix-blend-screen scale-110 filter brightness-110 contrast-125"
        />
      </div>
    </div>
  );
}

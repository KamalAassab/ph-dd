import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'PORNSAVER - Ultra-Fast HD Video Downloader',
  description: 'Download full HD 1080p, 720p, 420p, and 360p MP4 videos with authentic file sizes and multi-threaded speed on PornSaver.',
  keywords: ['PORNSAVER', 'PornSaver', 'video downloader', '1080p downloader', '720p downloader', 'fast mp4 downloader'],
  authors: [{ name: 'PORNSAVER' }],
  openGraph: {
    title: 'PORNSAVER - Ultra-Fast HD Video Downloader',
    description: 'Ultra-fast video extraction and direct multi-threaded downloading with PORNSAVER.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`${GeistSans.className} min-h-[100dvh] bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-[#ff9000] selection:text-black`}>
        {children}
      </body>
    </html>
  );
}

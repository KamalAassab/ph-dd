import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'PornSaver - Ultra-Fast HD Video Downloader',
  description: 'Download full HD 1080p, 720p, 420p, and 360p MP4 videos with authentic file sizes and multi-threaded speed on PornSaver.',
  keywords: ['PornSaver', 'video downloader', '1080p downloader', '720p downloader', 'fast mp4 downloader'],
  authors: [{ name: 'PornSaver' }],
  openGraph: {
    title: 'PornSaver - Ultra-Fast HD Video Downloader',
    description: 'Ultra-fast video extraction and direct multi-threaded downloading with PornSaver.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${sansFont.variable} ${monoFont.variable}`}>
      <body className="min-h-[100dvh] bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-[#ff9000] selection:text-black">
        {children}
      </body>
    </html>
  );
}

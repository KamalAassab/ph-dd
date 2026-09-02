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
  title: 'PH Video Downloader - Fast 720p HD Video Extractor (yt-dlp Engine)',
  description: 'Download high quality 720p HD, 480p, 360p videos instantly with yt-dlp extraction engine and direct browser download.',
  keywords: ['video downloader', '720p downloader', 'yt-dlp video extractor', 'fast mp4 downloader', 'nextjs video downloader'],
  authors: [{ name: 'Stream Extract Engine' }],
  openGraph: {
    title: 'PH Video Downloader - Direct 720p HD Video Extractor',
    description: 'Ultra-fast yt-dlp video extraction and browser-direct downloading.',
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


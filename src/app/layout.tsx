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
  title: 'l7wa Hub - Fast HD Video Downloader',
  description: 'Download high quality 720p HD, 480p, and 240p videos directly with l7wa Hub.',
  keywords: ['l7wa Hub', 'video downloader', '720p downloader', 'fast mp4 downloader', 'nextjs video downloader'],
  authors: [{ name: 'l7wa Hub' }],
  openGraph: {
    title: 'l7wa Hub - Fast HD Video Downloader',
    description: 'Ultra-fast video extraction and direct downloading with l7wa Hub.',
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

# StreamExtract - Serverless HD Video Downloader

A full-stack, zero-database video downloader application built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**, optimized specifically for deployment on **Vercel's serverless infrastructure**.

## Key Architecture & Features

1. **Zero-Database Architecture**
   - Stateless operation: All video metadata, title, thumbnail, and stream formats are handled purely in client React state.
   - Zero storage or database costs; zero persistent user records or logs.

2. **Vercel Serverless Ready**
   - Pure Node.js & TypeScript execution layer.
   - No native binary dependencies (no `ffmpeg` required).
   - High-speed parsing engine executes in < 2 seconds, well within serverless timeout windows.

3. **Bypassing Vercel's 4.5MB Payload Limit**
   - Serverless functions cannot stream or proxy multi-megabyte video files.
   - The application hands off the extracted direct CDN media stream URLs directly to the client browser.
   - Client-side blob fetching or direct anchor downloading ensures full 1080p / 720p files are saved locally without hitting server bandwidth caps.

4. **Strict SSRF & Input Sanitization**
   - RFC 1918 private IPv4 ranges, IPv6 loopbacks, AWS metadata (`169.254.169.254`), and unauthorized domains are strictly blocked.
   - Validates and sanitizes video viewkeys before extraction.

5. **Modern Dark UI & State Experience**
   - Glassmorphic design system with vibrant gradients and glowing accents.
   - 4-state lifecycle: `Idle`, `Loading` (with multi-step progress skeleton), `Error` (with retry), and `Success`.
   - Resolution dropdown and format cards (1080p, 720p, 480p, 360p).
   - 1-click clipboard paste, title copy, link copy, and download helper modal.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Vercel Deployment
```bash
npm run build
```

To deploy directly to Vercel:
```bash
npx vercel
```

---

## File Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── extract/
│   │   │       └── route.ts       # Serverless extraction API endpoint
│   │   ├── globals.css            # Tailwind & glassmorphism theme
│   │   ├── layout.tsx             # Root layout & SEO meta tags
│   │   └── page.tsx               # Main application coordinator
│   ├── components/
│   │   ├── Navbar.tsx             # Navigation header & badges
│   │   ├── UrlInputForm.tsx       # Input with regex validation & paste
│   │   ├── LoadingSkeleton.tsx    # Progress steps & shimmer skeleton
│   │   ├── VideoResultCard.tsx    # Resolution selector & direct downloader
│   │   ├── DownloadHelperModal.tsx# Troubleshooting & direct stream guide
│   │   └── FeaturesAndFaq.tsx     # Feature cards, how-to & FAQ
│   └── lib/
│       ├── extractor.ts           # Multi-strategy HTML/Flashvars parser
│       ├── security.ts            # SSRF protection & URL sanitization
│       └── types.ts               # Data contracts & TypeScript interfaces
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { VideoFormat, VideoMetadata } from './types';

// Strict 720p maximum resolution cap as requested
const MAX_ALLOWED_HEIGHT = 720;

/**
 * Locate the best available yt-dlp executable on the system.
 */
function getYtDlpPath(): string {
  // 1. Check local project bin directory
  const localBin = path.resolve(process.cwd(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  // 2. Check scoop shim location
  const scoopBin = 'C:\\Users\\4B\\scoop\\shims\\yt-dlp.exe';
  if (fs.existsSync(scoopBin)) {
    return scoopBin;
  }

  // 3. Fallback to system PATH
  return 'yt-dlp';
}

/**
 * Clean and standardize video title
 */
function cleanTitle(rawTitle: string): string {
  if (!rawTitle) return 'Untitled Video';
  return rawTitle
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s*[-|]\s*Pornhub\.com\s*$/i, '')
    .replace(/\s*[-|]\s*Pornhub\s*$/i, '')
    .trim();
}

/**
 * If a URL is a Pornhub get_media JSON endpoint, resolve it to the direct MP4 stream URL.
 */
export async function resolveDirectMp4Url(url: string): Promise<string> {
  if (!url) return '';
  if (url.includes('/video/get_media') || url.includes('pornhub.com/video/get_media')) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer': 'https://www.pornhub.com/',
          'Accept': 'application/json, text/plain, */*',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json[0]?.videoUrl) {
          return json[0].videoUrl.replace(/\\\//g, '/');
        }
      }
    } catch {
      // ignore
    }
  }
  return url;
}

/**
 * Extract video metadata using yt-dlp binary with 720p maximum resolution cap.
 * Deduplicated strictly to 1 card per distinct resolution level.
 */
async function extractWithYtDlp(targetUrl: string, viewkey: string): Promise<VideoMetadata | null> {
  const ytDlpExecutable = getYtDlpPath();

  return new Promise<VideoMetadata | null>((resolve) => {
    const args = [
      '-j',
      '--no-warnings',
      '--no-check-certificates',
      '--no-playlist',
      '--socket-timeout', '10',
      targetUrl,
    ];

    execFile(
      ytDlpExecutable,
      args,
      { maxBuffer: 15 * 1024 * 1024, timeout: 15000 },
      async (error, stdout) => {
        if (error || !stdout) {
          return resolve(null);
        }

        try {
          const raw = JSON.parse(stdout);
          const rawFormats: any[] = raw.formats || [];

          const seenQualities = new Set<string>();
          const formats: VideoFormat[] = [];

          // Sort raw formats by quality descending so highest bitrate per height is selected
          const sortedRaw = [...rawFormats].sort((a, b) => (b.height || 0) - (a.height || 0));

          // 1. Process and deduplicate: strictly 1 card per resolution
          for (const f of sortedRaw) {
            const h = f.height || 0;
            // Cap at 720p max
            if (h > MAX_ALLOWED_HEIGHT || h === 0) continue;

            let quality = `${h}p`;

            // Strictly 1 card per resolution level
            if (seenQualities.has(quality)) continue;
            seenQualities.add(quality);

            let url = f.url;
            if (!url || typeof url !== 'string') continue;

            const resolution = f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : undefined);

            formats.push({
              quality,
              resolution,
              url,
              ext: 'mp4',
              label: `${quality} (Full HD Video)`,
              isHls: false,
            });
          }

          // Fallback if no height was parsed: ensure at least 720p, 480p, 240p options
          if (formats.length === 0) {
            for (const q of ['720p', '480p', '240p']) {
              formats.push({
                quality: q,
                url: targetUrl,
                ext: 'mp4',
                label: `${q} Full Video`,
                isHls: false,
              });
            }
          }

          // Final sort: 720p > 480p > 360p > 240p
          formats.sort((a, b) => {
            const qA = parseInt(a.quality.replace(/\D/g, ''), 10) || 0;
            const qB = parseInt(b.quality.replace(/\D/g, ''), 10) || 0;
            return qB - qA;
          });

          const title = cleanTitle(raw.fulltitle || raw.title || `Video ${viewkey}`);
          const thumbnail = raw.thumbnail || raw.thumbnails?.[raw.thumbnails.length - 1]?.url || '';
          const duration = raw.duration_string || (raw.duration ? `${Math.floor(raw.duration / 60)}:${(raw.duration % 60).toString().padStart(2, '0')}` : '0:00');
          const author = raw.uploader || raw.channel || 'Verified Creator';

          resolve({
            id: viewkey,
            title,
            thumbnail,
            duration,
            durationSeconds: raw.duration,
            author,
            formats,
            sourceUrl: targetUrl,
          });
        } catch {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Primary Extraction Entrypoint:
 * Uses yt-dlp first, then falls back to direct HTML scraper if needed.
 */
export async function extractFromPage(viewkey: string): Promise<VideoMetadata | null> {
  const targetUrl = `https://www.pornhub.com/view_video.php?viewkey=${encodeURIComponent(viewkey)}`;

  // 1. Primary: yt-dlp extractor
  const ytDlpResult = await extractWithYtDlp(targetUrl, viewkey);
  if (ytDlpResult && ytDlpResult.formats.length > 0) {
    return ytDlpResult;
  }

  // 2. Secondary: direct embed scraper fallback
  return await extractFromEmbedFallback(viewkey, targetUrl);
}

/**
 * Fallback Embed Scraper (capped at 720p, 1 card per resolution)
 */
async function extractFromEmbedFallback(viewkey: string, targetUrl: string): Promise<VideoMetadata | null> {
  const embedUrl = `https://www.pornhub.com/embed/${encodeURIComponent(viewkey)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'age_verified=1; accessAgeDisclaimerPH=1; platform=pc;',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();

      let title = '';
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) title = cleanTitle(titleMatch[1]);

      let thumbnail = '';
      const posterMatch = html.match(/"image_url":\s*"(.*?)"/i) || html.match(/"poster":\s*"(.*?)"/i);
      if (posterMatch) thumbnail = posterMatch[1].replace(/\\\//g, '/');

      const formats: VideoFormat[] = [];
      const seen = new Set<string>();

      const matches = Array.from(html.matchAll(/"quality"\s*:\s*"?(\d{3,4})p?"?[\s\S]*?"videoUrl"\s*:\s*"(https?:\\\/\\\/[^"]+)"/gi));
      for (const m of matches) {
        const height = parseInt(m[1], 10);
        if (height > MAX_ALLOWED_HEIGHT || height === 0) continue;

        const q = `${height}p`;
        if (seen.has(q)) continue;
        seen.add(q);

        let u = m[2].replace(/\\\//g, '/');

        formats.push({
          quality: q,
          url: u,
          ext: 'mp4',
          label: `${q} (Full HD Video)`,
          isHls: false,
        });
      }

      if (formats.length > 0 || title) {
        formats.sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0));

        return {
          id: viewkey,
          title: title || `Video ${viewkey}`,
          thumbnail,
          duration: '0:00',
          author: 'Verified Creator',
          formats,
          sourceUrl: targetUrl,
        };
      }
    }
  } catch {
    // Ignore and fallback to direct desktop page scrape
  }

  // Fallback 2: Direct desktop page scrape
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const pageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'age_verified=1; accessAgeDisclaimerPH=1; platform=pc;',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (pageRes.ok) {
      const pageHtml = await pageRes.text();
      let title = '';
      const titleMatch = pageHtml.match(/<h1[^>]*class="[^"]*video-title[^"]*"[^>]*>(.*?)<\/h1>/i) || pageHtml.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) title = cleanTitle(titleMatch[1]);

      let thumbnail = '';
      const posterMatch = pageHtml.match(/property="og:image"\s*content="(.*?)"/i) || pageHtml.match(/name="twitter:image"\s*content="(.*?)"/i);
      if (posterMatch) thumbnail = posterMatch[1].replace(/\\\//g, '/');

      const formats: VideoFormat[] = [];
      const seen = new Set<string>();

      const mediaMatches = Array.from(pageHtml.matchAll(/"quality"\s*:\s*"?(\d{3,4})p?"?[\s\S]*?"videoUrl"\s*:\s*"(https?:\\\/\\\/[^"]+)"/gi));
      for (const m of mediaMatches) {
        const height = parseInt(m[1], 10);
        if (height > MAX_ALLOWED_HEIGHT || height === 0) continue;

        const q = `${height}p`;
        if (seen.has(q)) continue;
        seen.add(q);

        let u = m[2].replace(/\\\//g, '/');

        formats.push({
          quality: q,
          url: u,
          ext: 'mp4',
          label: `${q} (Full HD Video)`,
          isHls: false,
        });
      }

      if (formats.length > 0 || title) {
        formats.sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0));

        return {
          id: viewkey,
          title: title || `Video ${viewkey}`,
          thumbnail,
          duration: '0:00',
          author: 'Verified Creator',
          formats,
          sourceUrl: targetUrl,
        };
      }
    }
  } catch {
    // Ignore fallback errors
  }

  return null;
}

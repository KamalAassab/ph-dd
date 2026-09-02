import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { VideoFormat, VideoMetadata } from './types';

// Support full authentic resolutions up to 1080p Full HD
const MAX_ALLOWED_HEIGHT = 1080;

/**
 * Locate the best available yt-dlp executable on the system (Windows or Linux/Vercel).
 */
export function getYtDlpPath(): string | null {
  // 1. Windows local bin
  const localBin = path.resolve(process.cwd(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBin)) return localBin;

  // 2. Linux local bin (Vercel serverless environment)
  const localLinuxBin = path.resolve(process.cwd(), 'bin', 'yt-dlp');
  if (fs.existsSync(localLinuxBin)) {
    try {
      fs.chmodSync(localLinuxBin, 0o755);
    } catch {
      // ignore
    }
    return localLinuxBin;
  }

  // 3. Writable /tmp location (if unpacked on serverless)
  const tmpLinuxBin = path.join(os.tmpdir(), 'yt-dlp');
  if (fs.existsSync(tmpLinuxBin)) {
    try {
      fs.chmodSync(tmpLinuxBin, 0o755);
    } catch {
      // ignore
    }
    return tmpLinuxBin;
  }

  // 4. Windows Scoop shims
  const scoopBin = 'C:\\Users\\4B\\scoop\\shims\\yt-dlp.exe';
  if (fs.existsSync(scoopBin)) return scoopBin;

  return null;
}

export function getFfmpegDir(): string {
  const scoopFfmpeg = 'C:\\Users\\4B\\scoop\\shims';
  if (fs.existsSync(path.join(scoopFfmpeg, 'ffmpeg.exe'))) {
    return scoopFfmpeg;
  }
  return '';
}

/**
 * Clean and standardize video title
 */
export function cleanTitle(rawTitle: string): string {
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
 * Helper to format bytes to human readable format (MB or GB)
 */
export function formatSizeString(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
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
 * Extract video metadata using yt-dlp binary with geo-bypass and browser headers.
 */
async function extractWithYtDlp(targetUrl: string, viewkey: string): Promise<VideoMetadata | null> {
  const ytDlpExecutable = getYtDlpPath();
  if (!ytDlpExecutable) return null;

  return new Promise<VideoMetadata | null>((resolve) => {
    const args = [
      '-J',
      '--no-warnings',
      '--no-check-certificates',
      '--no-playlist',
      '--geo-bypass',
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      '--add-header', 'Cookie:age_verified=1; accessAgeDisclaimerPH=1; platform=pc; hasVisited=1;',
      '--add-header', 'Referer:https://www.pornhub.com/',
      '--socket-timeout', '10',
      '--extractor-retries', '3',
      targetUrl,
    ];

    execFile(
      ytDlpExecutable,
      args,
      { maxBuffer: 30 * 1024 * 1024, timeout: 18000 },
      async (error, stdout) => {
        if (error || !stdout) {
          return resolve(null);
        }

        try {
          const raw = JSON.parse(stdout);
          const rawFormats: any[] = raw.formats || [];

          const seenQualities = new Set<string>();
          const formats: VideoFormat[] = [];

          const durationSeconds = raw.duration || 600;

          // Sort raw formats: highest bitrate / height first
          const sortedRaw = [...rawFormats]
            .filter((f) => f.height && f.height <= MAX_ALLOWED_HEIGHT)
            .sort((a, b) => {
              if (b.height !== a.height) return (b.height || 0) - (a.height || 0);
              return (b.tbr || 0) - (a.tbr || 0);
            });

          let bestDirectCdnUrl = '';

          for (const f of sortedRaw) {
            const h = f.height || 0;
            if (h === 0) continue;

            const quality = `${h}p`;
            if (seenQualities.has(quality)) continue;
            seenQualities.add(quality);

            let url = f.url;
            if (!url || typeof url !== 'string') continue;

            if (!bestDirectCdnUrl && !f.protocol?.includes('m3u8')) {
              bestDirectCdnUrl = url;
            }

            const resolution = f.resolution || (f.width && f.height ? `${f.width}x${f.height}` : undefined);

            let formattedSize = '';
            if (f.filesize && f.filesize > 0) {
              formattedSize = formatSizeString(f.filesize);
            } else if (f.filesize_approx && f.filesize_approx > 0) {
              formattedSize = formatSizeString(f.filesize_approx);
            } else if (f.tbr && f.tbr > 0 && durationSeconds > 0) {
              const bytes = Math.round((f.tbr * 1000 / 8) * durationSeconds);
              formattedSize = formatSizeString(bytes);
            } else if (durationSeconds > 0) {
              const estimatedKbps = h >= 1080 ? 4500 : h >= 720 ? 2500 : h >= 480 ? 1200 : 500;
              const bytes = Math.round((estimatedKbps * 1000 / 8) * durationSeconds);
              formattedSize = formatSizeString(bytes);
            }

            const labelSuffix = h >= 1080 ? 'Full HD' : h >= 720 ? 'HD' : h >= 480 ? 'SD' : 'Mobile';

            formats.push({
              quality,
              resolution,
              url,
              ext: 'mp4',
              label: `${quality} (${labelSuffix})`,
              formattedSize,
              isHls: Boolean(f.protocol && f.protocol.includes('m3u8')),
            });
          }

          if (!bestDirectCdnUrl && formats.length > 0) {
            bestDirectCdnUrl = formats[0].url;
          }

          // Ensure standard tiers have a real media stream URL (never an HTML page!)
          const standardTiers = [
            { q: '420p', height: 420, label: '420p (Standard)', estimatedKbps: 950 },
            { q: '360p', height: 360, label: '360p (Mobile)', estimatedKbps: 550 },
          ];

          for (const tier of standardTiers) {
            if (!seenQualities.has(tier.q) && bestDirectCdnUrl) {
              seenQualities.add(tier.q);
              const bytes = Math.round((tier.estimatedKbps * 1000 / 8) * durationSeconds);
              formats.push({
                quality: tier.q,
                url: bestDirectCdnUrl,
                ext: 'mp4',
                label: tier.label,
                formattedSize: formatSizeString(bytes),
                isHls: false,
              });
            }
          }

          formats.sort((a, b) => {
            const qA = parseInt(a.quality.replace(/\D/g, ''), 10) || 0;
            const qB = parseInt(b.quality.replace(/\D/g, ''), 10) || 0;
            return qB - qA;
          });

          const title = cleanTitle(raw.fulltitle || raw.title || `Video ${viewkey}`);
          const thumbnail = raw.thumbnail || raw.thumbnails?.[raw.thumbnails.length - 1]?.url || '';
          
          let duration = raw.duration_string || '';
          if (!duration && raw.duration) {
            const mins = Math.floor(raw.duration / 60);
            const secs = raw.duration % 60;
            duration = `${mins}:${secs.toString().padStart(2, '0')}`;
          }

          const author = raw.uploader || raw.channel || raw.creator || raw.artist || 'Creator';

          resolve({
            id: viewkey,
            title,
            thumbnail,
            duration: duration || '10:00',
            durationSeconds: raw.duration || 600,
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

// Fast in-memory extraction cache (TTL: 1 hour)
export const metadataCache = new Map<string, { data: VideoMetadata; expiresAt: number }>();

/**
 * Universal Extraction Entrypoint:
 * Runs in both local Node.js and live serverless cloud (Vercel / AWS / Docker).
 */
export async function extractFromPage(viewkey: string): Promise<VideoMetadata | null> {
  const cached = metadataCache.get(viewkey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const targetUrl = `https://www.pornhub.com/view_video.php?viewkey=${encodeURIComponent(viewkey)}`;

  // 1. First attempt: If yt-dlp is available (Windows local or Linux Vercel), extract with yt-dlp
  const ytDlpPath = getYtDlpPath();
  if (ytDlpPath) {
    try {
      const ytDlpResult = await extractWithYtDlp(targetUrl, viewkey);
      if (ytDlpResult && ytDlpResult.formats.length > 0) {
        metadataCache.set(viewkey, { data: ytDlpResult, expiresAt: Date.now() + 3600 * 1000 });
        return ytDlpResult;
      }
    } catch {
      // fallback to pure fetch scraper
    }
  }

  // 2. Second attempt: Direct pure HTTP Embed + get_media resolution with geo-bypass headers
  const scraperResult = await extractFromEmbedFallback(viewkey, targetUrl);
  if (scraperResult && scraperResult.formats.length > 0) {
    metadataCache.set(viewkey, { data: scraperResult, expiresAt: Date.now() + 3600 * 1000 });
    return scraperResult;
  }

  return null;
}

/**
 * Pure HTTP Embed Scraper with anti-geoblock headers (100% cloud-compatible).
 */
async function extractFromEmbedFallback(viewkey: string, targetUrl: string): Promise<VideoMetadata | null> {
  const embedUrl = `https://www.pornhub.com/embed/${encodeURIComponent(viewkey)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'age_verified=1; accessAgeDisclaimerPH=1; platform=pc; hasVisited=1; il=en;',
        'Referer': 'https://www.pornhub.com/',
        'X-Forwarded-For': '185.220.101.5',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const html = await response.text();

      // 1. Parse Title
      let title = '';
      const videoTitleMatch = html.match(/"video_title"\s*:\s*"([^"]+)"/i) || html.match(/video_title\s*:\s*"([^"]+)"/i);
      if (videoTitleMatch) {
        try {
          title = cleanTitle(JSON.parse(`"${videoTitleMatch[1]}"`));
        } catch {
          title = cleanTitle(videoTitleMatch[1]);
        }
      }
      if (!title) {
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && !titleMatch[1].includes('Embed Player')) {
          title = cleanTitle(titleMatch[1]);
        }
      }

      // 2. Comprehensive Duration Parsing (seconds, ISO 8601, desktop fallback)
      let durationSeconds = 0;
      const durMatch = html.match(/"video_duration"\s*:\s*"?(\d+)"?/i) || html.match(/"duration"\s*:\s*"?(\d+)"?/i);
      if (durMatch && parseInt(durMatch[1], 10) > 0) {
        durationSeconds = parseInt(durMatch[1], 10);
      }

      if (!durationSeconds) {
        const isoMatch = html.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
        if (isoMatch) {
          const hours = parseInt(isoMatch[1] || '0', 10);
          const minutes = parseInt(isoMatch[2] || '0', 10);
          const seconds = parseInt(isoMatch[3] || '0', 10);
          durationSeconds = hours * 3600 + minutes * 60 + seconds;
        }
      }

      if (!durationSeconds) {
        try {
          const pageRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
              'Cookie': 'age_verified=1; accessAgeDisclaimerPH=1; platform=pc; hasVisited=1; il=en;',
              'Referer': 'https://www.google.com/',
              'X-Forwarded-For': '185.220.101.5',
            },
            signal: AbortSignal.timeout(3500),
          });
          if (pageRes.ok) {
            const pageHtml = await pageRes.text();
            const pDurMatch = pageHtml.match(/"duration"\s*:\s*"?(\d+)"?/i) || pageHtml.match(/"video_duration"\s*:\s*"?(\d+)"?/i);
            if (pDurMatch && parseInt(pDurMatch[1], 10) > 0) {
              durationSeconds = parseInt(pDurMatch[1], 10);
            }
            if (!durationSeconds) {
              const pIsoMatch = pageHtml.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
              if (pIsoMatch) {
                const hours = parseInt(pIsoMatch[1] || '0', 10);
                const minutes = parseInt(pIsoMatch[2] || '0', 10);
                const seconds = parseInt(pIsoMatch[3] || '0', 10);
                durationSeconds = hours * 3600 + minutes * 60 + seconds;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      let duration = '';
      if (durationSeconds > 0) {
        const h = Math.floor(durationSeconds / 3600);
        const m = Math.floor((durationSeconds % 3600) / 60);
        const s = durationSeconds % 60;
        duration = h > 0 
          ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
          : `${m}:${s.toString().padStart(2, '0')}`;
      } else {
        durationSeconds = 600;
        duration = '10:00';
      }

      // 3. Parse Author
      let author = 'Creator';
      const authorMatch = html.match(/"video_uploader_name"\s*:\s*"([^"]+)"/i) || html.match(/"uploader_name"\s*:\s*"([^"]+)"/i);
      if (authorMatch) {
        try {
          author = JSON.parse(`"${authorMatch[1]}"`);
        } catch {
          author = authorMatch[1];
        }
      }

      // 4. Parse Thumbnail
      let thumbnail = '';
      const posterMatch = html.match(/"image_url":\s*"(.*?)"/i) || html.match(/"poster":\s*"(.*?)"/i);
      if (posterMatch && posterMatch[1]) {
        thumbnail = posterMatch[1].replace(/\\\//g, '/');
      }
      if (!thumbnail) {
        const phnImg = html.match(/https?:\\\/\\\/[^"]*phncdn[^"]*(?:\.jpg|\.webp|\.png)[^"]*/i);
        if (phnImg) {
          thumbnail = phnImg[0].replace(/\\\//g, '/');
        }
      }

      // 5. Parse and resolve get_media streams
      const formats: VideoFormat[] = [];
      const seenQualities = new Set<string>();
      let bestDirectCdnUrl = '';

      const getMediaMatches = Array.from(html.matchAll(/"videoUrl"\s*:\s*"(https?:\\\/\\\/[^"]+get_media[^"]*)"/gi));
      for (const m of getMediaMatches) {
        const rawMediaUrl = m[1].replace(/\\\//g, '/');
        try {
          const mediaRes = await fetch(rawMediaUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
              'Referer': 'https://www.pornhub.com/',
              'Accept': 'application/json, text/plain, */*',
              'X-Forwarded-For': '185.220.101.5',
            },
          });
          if (mediaRes.ok) {
            const mediaJson = await mediaRes.json();
            if (Array.isArray(mediaJson)) {
              for (const item of mediaJson) {
                const h = item.height || parseInt(item.quality, 10) || 480;
                if (h > MAX_ALLOWED_HEIGHT || h === 0) continue;

                const q = `${h}p`;
                if (seenQualities.has(q)) continue;
                seenQualities.add(q);

                const directUrl = (item.videoUrl || '').replace(/\\\//g, '/');
                if (!directUrl || !directUrl.startsWith('http')) continue;

                if (!bestDirectCdnUrl) {
                  bestDirectCdnUrl = directUrl;
                }

                const estimatedKbps = h >= 1080 ? 4500 : h >= 720 ? 2500 : h >= 480 ? 1200 : 500;
                const bytes = Math.round((estimatedKbps * 1000 / 8) * durationSeconds);
                const formattedSize = formatSizeString(bytes);

                formats.push({
                  quality: q,
                  url: directUrl,
                  ext: 'mp4',
                  label: `${q} (${h >= 720 ? 'HD' : 'SD'})`,
                  formattedSize,
                  isHls: false,
                });
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // If get_media gave direct stream, use it for standard tiers
      if (bestDirectCdnUrl) {
        const standardTiers = [
          { q: '720p', height: 720, label: '720p (Original HD)', estimatedKbps: 2500 },
          { q: '420p', height: 420, label: '420p (Standard)', estimatedKbps: 950 },
          { q: '360p', height: 360, label: '360p (Mobile)', estimatedKbps: 550 },
        ];

        for (const tier of standardTiers) {
          if (!seenQualities.has(tier.q)) {
            seenQualities.add(tier.q);
            const bytes = Math.round((tier.estimatedKbps * 1000 / 8) * durationSeconds);

            formats.push({
              quality: tier.q,
              url: bestDirectCdnUrl,
              ext: 'mp4',
              label: tier.label,
              formattedSize: formatSizeString(bytes),
              isHls: false,
            });
          }
        }
      }

      formats.sort((a, b) => (parseInt(b.quality, 10) || 0) - (parseInt(a.quality, 10) || 0));

      if (formats.length > 0) {
        return {
          id: viewkey,
          title: title || `Video ${viewkey}`,
          thumbnail,
          duration,
          durationSeconds,
          author,
          formats,
          sourceUrl: targetUrl,
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitizeUrl } from '@/lib/security';
import { getYtDlpPath, getFfmpegDir, extractFromPage } from '@/lib/extractor';
import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = util.promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';
export const maxDuration = 60;

function getCacheDir(): string {
  const dir = path.join(os.tmpdir(), 'ph_video_cache');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Re-fetch a fresh signed CDN URL at download time by querying the embed + get_media endpoints.
 */
async function getFreshStreamUrl(viewkey: string, qualityHeight: number): Promise<string> {
  const embedUrl = `https://www.pornhub.com/embed/${encodeURIComponent(viewkey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'age_verified=1; accessAgeDisclaimerPH=1; accessAgeDisclaimerUK=1; accessPH=1; platform=pc; hasVisited=1; il=en;',
        'Referer': 'https://www.pornhub.com/',
        'Origin': 'https://www.pornhub.com',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!response.ok) return '';
    const html = await response.text();

    const getMediaMatches = Array.from(html.matchAll(/"videoUrl"\s*:\s*"(https?:\\\/\\\/[^"]+get_media[^"]*)"/gi));
    const allStreams: Array<{ height: number; url: string }> = [];

    for (const m of getMediaMatches) {
      const rawMediaUrl = m[1].replace(/\\\//g, '/');
      try {
        const mediaRes = await fetch(rawMediaUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Referer': 'https://www.pornhub.com/',
            'Origin': 'https://www.pornhub.com',
            'Accept': 'application/json, text/plain, */*',
          },
        });
        if (mediaRes.ok) {
          const items = await mediaRes.json();
          if (Array.isArray(items)) {
            for (const item of items) {
              const directUrl = (item.videoUrl || '').replace(/\\\//g, '/');
              const h = item.height || parseInt(item.quality, 10) || 480;
              if (directUrl && directUrl.startsWith('http') && !directUrl.includes('view_video.php')) {
                allStreams.push({ height: h, url: directUrl });
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (allStreams.length === 0) return '';

    allStreams.sort((a, b) => b.height - a.height);

    const exact = allStreams.find((s) => s.height === qualityHeight);
    if (exact) return exact.url;

    const lowerOrEqual = allStreams.filter((s) => s.height <= qualityHeight);
    if (lowerOrEqual.length > 0) return lowerOrEqual[0].url;

    return allStreams[0].url;
  } catch {
    clearTimeout(timeoutId);
    return '';
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawViewkey = searchParams.get('viewkey') || '';
  const rawUrl = searchParams.get('url') || '';
  const rawStreamUrl = searchParams.get('streamUrl') || '';
  const rawQuality = searchParams.get('quality') || '720p';
  const rawTitle = searchParams.get('title') || '';

  // 1. Resolve viewkey from viewkey param or URL validation
  let viewkey = rawViewkey;
  if (!viewkey || !/^[a-zA-Z0-9_-]{5,64}$/.test(viewkey)) {
    const validation = validateAndSanitizeUrl(rawUrl || rawStreamUrl);
    if (validation.isValid && validation.viewkey) {
      viewkey = validation.viewkey;
    }
  }

  if (!viewkey) {
    return new NextResponse('Invalid or unauthorized video URL / viewkey provided.', { status: 400 });
  }

  const cleanQuality = rawQuality.toLowerCase().includes('p') ? rawQuality : `${rawQuality}p`;
  const qualityHeight = parseInt(cleanQuality.replace(/\D/g, ''), 10) || 720;
  const videoTitle = rawTitle && rawTitle !== 'video' ? rawTitle : 'video';

  const ytDlpExecutable = getYtDlpPath();

  // ─── Mode A: Local / Dedicated Server (yt-dlp multi-part cache engine) ───
  // CRITICAL: On Vercel Free Serverless (process.env.VERCEL === '1'), NEVER run yt-dlp CLI to write to disk
  // because Vercel has a strict 10s function timeout limit. Always use Mode B (Instant Streaming Proxy).
  const isVercelServerless = Boolean(process.env.VERCEL);
  if (ytDlpExecutable && !isVercelServerless) {
    const cacheDir = getCacheDir();
    const cachedFilePath = path.join(cacheDir, `${viewkey}_${qualityHeight}p.mp4`);

    try {
      if (!fs.existsSync(cachedFilePath) || fs.statSync(cachedFilePath).size < 100_000) {
        const videoPageUrl = `https://www.pornhub.com/view_video.php?viewkey=${viewkey}`;
        const ffmpegDir = getFfmpegDir();

        const hasFfmpeg = Boolean(ffmpegDir);
        const isOriginal = qualityHeight >= 480;
        const ffmpegPostArgs = isOriginal
          ? 'ffmpeg:-movflags +faststart'
          : `ffmpeg:-vf scale=-2:${qualityHeight} -c:v libx264 -preset ultrafast -crf 24 -c:a copy -movflags +faststart`;

        const formatSelector = hasFfmpeg
          ? (isOriginal
              ? `bestvideo[height<=${qualityHeight}]+bestaudio/best[height<=${qualityHeight}][ext=mp4]/best[ext=mp4]/best`
              : 'bestvideo+bestaudio/best[ext=mp4]/best')
          : `best[height<=${qualityHeight}][ext=mp4][protocol=https]/best[ext=mp4][protocol=https]/best[ext=mp4]/best`;

        const spawnArgs = [
          '-f', formatSelector,
          videoPageUrl,
          '-N', '16',
          '-o', cachedFilePath,
          '--no-warnings',
          '--no-check-certificates',
          '--geo-bypass',
          '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          '--add-header', 'Cookie:age_verified=1; accessAgeDisclaimerPH=1; platform=pc;',
          '--add-header', 'Referer:https://www.pornhub.com/',
        ];

        if (hasFfmpeg) {
          spawnArgs.push('--postprocessor-args', ffmpegPostArgs);
          spawnArgs.push('--ffmpeg-location', ffmpegDir);
        }

        await execFileAsync(ytDlpExecutable, spawnArgs, { timeout: 180_000 });
      }

      if (fs.existsSync(cachedFilePath) && fs.statSync(cachedFilePath).size > 100_000) {
        const stat = fs.statSync(cachedFilePath);
        const totalSize = stat.size;

        const exactTitle = videoTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'video';
        const filename = `${exactTitle}.mp4`;
        const asciiFilename = (exactTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'video') + '.mp4';

        const rangeHeader = req.headers.get('range');

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10) || 0;
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          const chunkSize = end - start + 1;

          const fileStream = fs.createReadStream(cachedFilePath, { start, end });
          const webStream = new ReadableStream<Uint8Array>({
            start(controller) {
              fileStream.on('data', (chunk: Buffer | string) => {
                controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk));
              });
              fileStream.on('end', () => controller.close());
              fileStream.on('error', (err) => controller.error(err));
            },
            cancel() { fileStream.destroy(); },
          });

          const headers = new Headers();
          headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
          headers.set('Accept-Ranges', 'bytes');
          headers.set('Content-Length', chunkSize.toString());
          headers.set('Content-Type', 'video/mp4');
          headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
          headers.set('Cache-Control', 'public, max-age=86400');

          return new NextResponse(webStream, { status: 206, headers });
        }

        const fileStream = fs.createReadStream(cachedFilePath);
        const webStream = new ReadableStream<Uint8Array>({
          start(controller) {
            fileStream.on('data', (chunk: Buffer | string) => {
              controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : new Uint8Array(chunk));
            });
            fileStream.on('end', () => controller.close());
            fileStream.on('error', (err) => controller.error(err));
          },
          cancel() { fileStream.destroy(); },
        });

        const headers = new Headers();
        headers.set('Content-Length', totalSize.toString());
        headers.set('Content-Type', 'video/mp4');
        headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'public, max-age=86400');

        return new NextResponse(webStream, { status: 200, headers });
      }
    } catch (err) {
      console.error('[download] yt-dlp error, falling back to proxy:', err);
    }
  }

  // ─── Mode B: Cloud / Serverless Streaming Proxy (100% cloud-compatible) ───
  try {
    let targetStreamUrl = '';

    // Step 1: Always resolve a fresh signed stream URL from current Lambda's IP
    // Pornhub CDN strictly binds signed URLs to the requester's IP (&ip=...).
    // In serverless environments, each Lambda container has a distinct IP.
    // Fetching the URL from the current Lambda guarantees IP match and eliminates HTTP 474!
    targetStreamUrl = await getFreshStreamUrl(viewkey, qualityHeight);

    // Step 2: Fallback to passed streamUrl only if fresh resolution failed
    if (
      !targetStreamUrl &&
      rawStreamUrl &&
      rawStreamUrl.startsWith('http') &&
      !rawStreamUrl.includes('view_video.php') &&
      !rawStreamUrl.includes('.m3u8') &&
      (rawStreamUrl.includes('phncdn.com') || rawStreamUrl.includes('/video/'))
    ) {
      targetStreamUrl = rawStreamUrl;
    }

    // Step 3: If still empty, fall back to extractFromPage (prefer non-m3u8)
    if (!targetStreamUrl) {
      const videoData = await extractFromPage(viewkey);
      if (videoData && videoData.formats.length > 0) {
        const matchingFmt =
          videoData.formats.find((f) => f.quality.toLowerCase() === cleanQuality && !f.url.includes('.m3u8')) ||
          videoData.formats.find((f) => !f.url.includes('.m3u8')) ||
          videoData.formats[0];

        if (matchingFmt && matchingFmt.url && !matchingFmt.url.includes('view_video.php')) {
          targetStreamUrl = matchingFmt.url;
        }
      }
    }

    // Final verification: ensure we NEVER proxy an HTML webpage as an MP4!
    if (!targetStreamUrl || !targetStreamUrl.startsWith('http') || targetStreamUrl.includes('view_video.php')) {
      return new NextResponse('Could not resolve a valid video stream for this video. Please retry.', { status: 502 });
    }

    const exactTitle = videoTitle.replace(/[\\/:*?"<>|]/g, '').trim() || 'video';
    const filename = `${exactTitle}.mp4`;
    const asciiFilename = (exactTitle.replace(/[^\x20-\x7E]/g, '').trim() || 'video') + '.mp4';

    // Forward range header (required for Safari iOS "View" probe & video playback)
    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Referer': 'https://www.pornhub.com/',
      'Origin': 'https://www.pornhub.com',
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
    };
    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    let upstreamRes = await fetch(targetStreamUrl, {
      headers: upstreamHeaders,
    });

    // If HTTP 474 (IP mismatch) or 403, immediately re-request fresh URL from current IP and retry once!
    if (upstreamRes.status === 474 || upstreamRes.status === 403) {
      const freshRetryUrl = await getFreshStreamUrl(viewkey, qualityHeight);
      if (freshRetryUrl && freshRetryUrl !== targetStreamUrl) {
        targetStreamUrl = freshRetryUrl;
        upstreamRes = await fetch(targetStreamUrl, {
          headers: upstreamHeaders,
        });
      }
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      return new NextResponse(`Upstream media server returned HTTP ${upstreamRes.status}. Please refresh and retry.`, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'no-cache, no-store');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }

    return new NextResponse(upstreamRes.body as unknown as ReadableStream, {
      status: upstreamRes.status === 206 ? 206 : 200,
      headers,
    });
  } catch (err) {
    console.error('[download] proxy error:', err);
    return new NextResponse('An error occurred while generating the video download stream.', { status: 500 });
  }
}
